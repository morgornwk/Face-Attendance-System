"""Realtime Attendance Engine จัดการตรวจจับ จำแนกใบหน้า และบันทึกเวลาเข้า-ออกงานแบบ Real-time"""

from __future__ import annotations

import asyncio
import uuid
from datetime import datetime
from uuid import UUID

from app.core.timezone import get_local_now
from app.services.minio_service import minio_service

import structlog

from app.ai.engine import face_engine, crop_and_encode_face
from app.ai.recognition import embedding_index
from app.camera.face_tracker import FaceTracker
from app.camera.stream_reader import CameraConfig, stream_frames
from app.models.attendance import AttendanceRecord
from app.repositories.attendance import AttendanceRepository
from app.repositories.employee import EmployeeRepository
from app.websocket.manager import attendance_manager, AttendanceEvent

logger = structlog.get_logger(__name__)

CHECKIN_DEDUP_TTL = 4 * 3600  # 4 ชั่วโมง check-in ครั้งเดียวต่อวัน
CHECKOUT_DEDUP_TTL = 5 * 60  # 5 นาที update check-out ได้ทุก 5 นาที

# Quality gates สำหรับ real-time stream
MIN_DET_SCORE = 0.6  # กรอง detection ที่ไม่ชัดออก (หน้าเบลอ, ไกลเกิน)
MIN_QUALITY_SCORE = 0.3  # กรองภาพที่มืด/เบลอมากเกินไป


class AttendanceEngine:
    """
    ประสาน: อ่าน stream -> ตรวจจับใบหน้า -> จำแนก -> เขียน DB -> broadcast WS
    1 instance ต่อ 1 กล้อง รัน concurrent ทุกกล้องด้วย asyncio.gather
    """

    def __init__(
        self,
        config: CameraConfig,
        session_factory,
        redis_client,
        stop_event: asyncio.Event,
    ) -> None:
        self._config = config
        self._session_factory = session_factory
        self._redis = redis_client
        self._stop = stop_event
        self._tracker = FaceTracker()  # แต่ละกล้องมี tracker ของตัวเอง

    async def run(self) -> None:
        logger.info("attendance_engine_start", camera_id=self._config.camera_id)
        async for camera_id, frame in stream_frames(self._config, self._stop):
            try:
                await self._process_frame(frame)
            except Exception:
                # log แต่ไม่ crash กล้องต้องทำงานต่อเสมอ
                logger.exception("frame_processing_error", camera_id=camera_id)
        logger.info("attendance_engine_stop", camera_id=self._config.camera_id)

    async def _process_frame(self, frame) -> None:
        """ประมวลผล 1 frame: ตรวจจับ -> กรองคุณภาพ -> track -> จำแนกเฉพาะใบหน้าใหม่"""
        faces = await face_engine.analyze_frame(frame)
        if not faces:
            return

        # Quality gate: กรองใบหน้าที่ detection score ต่ำหรือภาพเบลอออก
        # ช่วยลด false positive จากภาพสะท้อน, โปสเตอร์, หรือหน้าจอมือถือ
        good_faces = [
            f
            for f in faces
            if f.det_score >= MIN_DET_SCORE and f.quality_score >= MIN_QUALITY_SCORE
        ]
        if not good_faces:
            return

        bboxes = [f.bbox for f in good_faces]
        track_indices = self._tracker.update(bboxes)

        recognition_tasks = []
        for i, (face, track_idx) in enumerate(zip(good_faces, track_indices)):
            if self._tracker.is_recognized(track_idx):
                continue  # จำแนกแล้วในการเข้างานนี้ ไม่ต้องจำแนกซ้ำ
            recognition_tasks.append(self._recognize_and_record(face, track_idx, frame))

        # รันทุก recognition พร้อมกันไม่รอทีละคน
        if recognition_tasks:
            await asyncio.gather(*recognition_tasks, return_exceptions=True)

    async def _recognize_and_record(self, face, track_idx: int, frame) -> None:
        """จำแนกใบหน้า 1 ใบ และบันทึกการเข้างานถ้าจำแนกได้"""
        match = await embedding_index.find_match(face.embedding)
        if match is None or not match.is_confident:
            return  # ไม่แน่ใจพอ ไม่บันทึก

        employee_id = match.employee_id
        self._tracker.mark_recognized(track_idx, employee_id)

        checkin_key = self._dedup_key("checkin", employee_id)
        checkout_key = self._dedup_key("checkout", employee_id)

        async with self._session_factory() as session:
            repo = AttendanceRepository(session)
            now_time = get_local_now()
            work_date = now_time.date()

            record = await repo.get_today_record(employee_id)
            action = "check_out" if record else "check_in"
            dedup_key = checkout_key if record else checkin_key
            dedup_ttl = CHECKOUT_DEDUP_TTL if record else CHECKIN_DEDUP_TTL

            # ถ้าเพิ่งบันทึกไป ไม่ต้องทำอะไรซ้ำ
            if await self._redis.exists(dedup_key):
                return

            emp = await EmployeeRepository(session).get_by_id(employee_id)
            if not emp:
                return

            image_url = await self._crop_and_upload_face(face, frame)

            if record is None:
                record = AttendanceRecord(
                    employee_id=employee_id,
                    work_date=work_date,
                    check_in_time=now_time,
                    camera_id=self._config.camera_id,
                    confidence_score=match.similarity,
                    image_url=image_url,
                )
                await repo.create(record)
            else:
                record.check_out_time = now_time
                record.camera_id = self._config.camera_id
                record.image_url = image_url

            await session.commit()
            await self._redis.setex(dedup_key, dedup_ttl, "1")

            logger.info(
                f"attendance_{action}",
                employee_id=str(employee_id),
                camera_id=self._config.camera_id,
                confidence=round(match.similarity, 3),
            )

            await self._broadcast_event(
                action,
                employee_id,
                emp.employee_code,
                emp.full_name,
                match.similarity,
                now_time,
            )

    async def _broadcast_event(
        self,
        event_type: str,
        employee_id: UUID,
        employee_code: str | None,
        full_name: str | None,
        confidence: float,
        timestamp: datetime,
    ) -> None:
        """
        Broadcast attendance event ไป WebSocket clients ทั้งหมด

        Fire-and-forget: ถ้า broadcast ล้มเหลว ไม่ affect main pipeline
        เพราะ attendance record ถูก commit ลง DB แล้ว
        """
        try:
            event = AttendanceEvent(
                event_type=event_type,
                employee_id=str(employee_id),
                employee_code=employee_code,
                full_name=full_name,
                camera_id=self._config.camera_id,
                confidence=round(confidence, 3),
                timestamp=timestamp.isoformat(),
            )
            await attendance_manager.broadcast(event)
        except Exception:
            # WebSocket broadcast ล้มเหลวไม่ควร crash camera worker
            logger.warning("ws_broadcast_failed", employee_id=str(employee_id))

    def _dedup_key(self, action: str, employee_id: UUID) -> str:
        """สร้าง Redis key ที่ unique ต่อ action, ต่อพนักงาน, ต่อวัน"""
        today = get_local_now().strftime("%Y-%m-%d")
        return f"attendance:{action}:{employee_id}:{today}"

    async def _crop_and_upload_face(self, face, frame) -> str:
        """Helper ในการ crop ใบหน้าและ upload ขึ้น MinIO"""
        crop_bytes = crop_and_encode_face(frame, face.bbox)
        image_filename = f"{uuid.uuid4()}.jpg"
        return await minio_service.upload_image_async(crop_bytes, image_filename)
