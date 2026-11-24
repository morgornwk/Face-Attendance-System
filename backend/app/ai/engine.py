"""YuNet Detector + EdgeFace Recognizer Engine สำหรับตรวจจับ, จัดองศา, และสกัดเวกเตอร์ใบหน้า (512-dim)

Senior:
- Thread-Safe Detection Pipeline: ป้องกัน Race Condition บน OpenCV FaceDetectorYN ด้วย Lock
- Idempotent Model Loading: ตรวจสอบสถานะก่อนโหลดซ้ำ ป้องกัน Memory Leak
- Strict Validation: ป้องกัน Image Buffer ผิดรูปหรือค่าพิกัด Bounding Box ล้นขอบ
- Optimized Preprocessing: ใช้ C++ Vectorized Blob Transformation (cv2.dnn.blobFromImage)
"""

from __future__ import annotations

import asyncio
import threading
from pathlib import Path
from typing import NamedTuple

import cv2
import numpy as np
import onnxruntime as ort
import structlog

from app.core.config import settings

logger = structlog.get_logger(__name__)

# โฟลเดอร์เก็บโมเดล ONNX
_MODELS_DIR = Path(__file__).resolve().parent / "models"

# ArcFace alignment template 5 จุดอ้างอิงมาตรฐานบนภาพ 112×112 (ตามลำดับ YuNet output)
_ARCFACE_REF = np.array([
    [38.2946, 51.6963],   # ตาซ้ายของภาพ (ตาขวาของบุคคล)
    [73.5318, 51.5014],   # ตาขวาของภาพ (ตาซ้ายของบุคคล)
    [56.0252, 71.7366],   # ปลายจมูก
    [41.5493, 92.3655],   # มุมปากซ้ายของภาพ (มุมปากขวาของบุคคล)
    [70.7299, 92.2041],   # มุมปากขวาของภาพ (มุมปากซ้ายของบุคคล)
], dtype=np.float32)


class DetectedFace(NamedTuple):
    """ข้อมูลใบหน้าที่ผ่านการตรวจจับและสกัดเวกเตอร์เรียบร้อยแล้ว"""

    embedding: np.ndarray               # Normalized float32 vector shape (512,)
    bbox: tuple[int, int, int, int]     # พิกัดกล่องตรวจจับ (x1, y1, x2, y2)
    det_score: float                    # ค่าความมั่นใจในการตรวจจับใบหน้า (0.0 - 1.0)
    quality_score: float                # ค่าความคมชัดของภาพใบหน้าจาก Laplacian Variance (0.0 - 1.0)


class FaceEngine:
    """AI Engine หลักสำหรับ Detection (YuNet) และ Embedding Extraction (EdgeFace)"""

    def __init__(
        self,
        det_size: tuple[int, int] = (320, 320),
        det_thresh: float = 0.5,
    ) -> None:
        self._det_size = det_size
        self._det_thresh = det_thresh
        self._detector: cv2.FaceDetectorYN | None = None
        self._recognizer: ort.InferenceSession | None = None
        self._rec_input_name: str = ""
        self._lock = threading.Lock()  # ปกป้อง OpenCV C++ state เมื่อรัน concurrent thread pool

    @property
    def is_ready(self) -> bool:
        """ตรวจสอบว่าทั้งโมเดล Detector และ Recognizer โหลดเข้าสู่หน่วยความจำแล้วหรือไม่"""
        return self._detector is not None and self._recognizer is not None

    def load(self) -> None:
        """โหลดโมเดล YuNet และ EdgeFace ONNX เข้าสู่ Memory (Idempotent: โหลดครั้งเดียว)"""
        if self.is_ready:
            logger.info("face_engine_already_ready", det_size=self._det_size)
            return

        det_path = _MODELS_DIR / "yunet.onnx"
        rec_path = _MODELS_DIR / "edgeface_xs.onnx"

        if not det_path.exists():
            raise FileNotFoundError(f"YuNet detector model not found at: {det_path}")
        if not rec_path.exists():
            raise FileNotFoundError(f"EdgeFace recognizer model not found at: {rec_path}")

        # 1. กำหนดค่าและโหลด YuNet Detector
        logger.info("loading_yunet_detector", path=str(det_path))
        self._detector = cv2.FaceDetectorYN.create(
            model=str(det_path),
            config="",
            input_size=self._det_size,
            score_threshold=self._det_thresh,
            nms_threshold=0.3,
            top_k=10,
        )

        # 2. กำหนดค่าและโหลด EdgeFace Recognizer (ONNX Runtime)
        logger.info("loading_edgeface_recognizer", path=str(rec_path))
        opts = ort.SessionOptions()
        opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        opts.inter_op_num_threads = 2
        opts.intra_op_num_threads = 2

        available_providers = ort.get_available_providers()
        preferred_providers = [
            "CUDAExecutionProvider",
            "CoreMLExecutionProvider",
            "CPUExecutionProvider",
        ]
        providers = [p for p in preferred_providers if p in available_providers]
        if not providers:
            providers = ["CPUExecutionProvider"]

        self._recognizer = ort.InferenceSession(str(rec_path), opts, providers=providers)
        self._rec_input_name = self._recognizer.get_inputs()[0].name

        out_shape = self._recognizer.get_outputs()[0].shape
        logger.info("face_engine_ready", det_size=self._det_size, rec_output=out_shape, providers=providers)

    async def analyze_frame(self, frame: np.ndarray) -> list[DetectedFace]:
        """วิเคราะห์ภาพในลักษณะ Non-blocking Coroutine (ส่งไปคำนวณใน Thread Pool)"""
        if not self.is_ready:
            raise RuntimeError("FaceEngine is not loaded yet. Call load() before analyze_frame().")

        if frame is None or not isinstance(frame, np.ndarray) or frame.size == 0 or frame.ndim != 3:
            return []

        return await asyncio.to_thread(self._analyze_sync, frame)

    def _analyze_sync(self, frame: np.ndarray) -> list[DetectedFace]:
        """Blocking pipeline: ตรวจจับใบหน้า -> จัดองศาตรง -> สกัด Embedding -> ประเมินความคมชัด"""
        if self._detector is None or self._recognizer is None:
            return []

        h, w = frame.shape[:2]

        with self._lock:
            # กำหนด dynamic input resolution ตามขนาดของเฟรมจริงแบบ Thread-safe
            self._detector.setInputSize((w, h))
            _, detections = self._detector.detect(frame)

        if detections is None:
            return []

        results: list[DetectedFace] = []
        for det in detections:
            score = float(det[14])
            if score < self._det_thresh:
                continue

            # แปลง Bounding Box (x, y, w, h) -> (x1, y1, x2, y2) พร้อม Clamp ขอบภาพ
            bx, by, bw, bh = det[0:4].astype(int)
            x1 = max(0, int(bx))
            y1 = max(0, int(by))
            x2 = min(w, int(bx + bw))
            y2 = min(h, int(by + bh))

            if x2 <= x1 or y2 <= y1:
                continue

            # สกัดจุด 5 Facial Landmarks: (right_eye, left_eye, nose, right_mouth, left_mouth)
            landmarks = det[4:14].reshape(5, 2).astype(np.float32)

            # จัดองศาใบหน้าให้ตั้งตรง (Similarity Transform) ขนาด 112×112
            aligned = self._align_face(frame, landmarks)
            if aligned is None:
                continue

            # สกัด 512-dim Normalized Embedding ด้วย EdgeFace
            embedding = self._extract_embedding(aligned)

            # ประเมินคะแนนความคมชัดของภาพ (Laplacian Variance)
            quality = self._estimate_quality(frame, (x1, y1, x2, y2))

            results.append(
                DetectedFace(
                    embedding=embedding,
                    bbox=(x1, y1, x2, y2),
                    det_score=score,
                    quality_score=quality,
                )
            )

        return results

    def _align_face(self, frame: np.ndarray, landmarks: np.ndarray) -> np.ndarray | None:
        """จัดองศาใบหน้าตรง (Affine Alignment) ตามพิกัดอ้างอิง ArcFace 112×112"""
        # คำนวณ Transformation Matrix ด้วย RANSAC
        matrix, _ = cv2.estimateAffinePartial2D(landmarks, _ARCFACE_REF, method=cv2.RANSAC)
        if matrix is None:
            return None

        return cv2.warpAffine(frame, matrix, (112, 112), borderValue=(0, 0, 0))

    def _extract_embedding(self, aligned_face: np.ndarray) -> np.ndarray:
        """แปลงภาพที่ Aligned แล้วผ่านโมเดล EdgeFace ONNX เป็น 512-dim Unit Vector"""
        if self._recognizer is None:
            raise RuntimeError("Recognizer session is not initialized")

        # C++ Vectorized Normalization [-1, 1] และแปลงมิติ HWC -> NCHW
        blob = cv2.dnn.blobFromImage(
            aligned_face,
            scalefactor=1.0 / 128.0,
            size=(112, 112),
            mean=(127.5, 127.5, 127.5),
            swapRB=True,
        )

        output = self._recognizer.run(None, {self._rec_input_name: blob})[0]
        embedding = output[0].astype(np.float32)

        # บังคับ L2-Normalize เพื่อให้ผลลัพธ์พร้อมสำหรับ Cosine Similarity ทันที
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = embedding / norm

        return embedding

    @staticmethod
    def _estimate_quality(frame: np.ndarray, bbox: tuple[int, int, int, int]) -> float:
        """วัดความคมชัดของใบหน้าด้วย Laplacian Variance (normalized 0.0 - 1.0)"""
        x1, y1, x2, y2 = bbox
        crop = frame[y1:y2, x1:x2]
        if crop.size == 0:
            return 0.0

        gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
        var = float(cv2.Laplacian(gray, cv2.CV_32F).var())
        return min(var / 200.0, 1.0)


def crop_and_encode_face(
    frame: np.ndarray,
    bbox: tuple[int, int, int, int],
    quality: int = 95,
) -> bytes:
    """ตัดกรอบใบหน้าจากภาพเต็มและบันทึกเป็น JPEG bytes สำหรับส่งจัดเก็บใน Object Storage"""
    if frame is None or frame.size == 0:
        raise ValueError("Invalid frame: empty or None")

    h, w = frame.shape[:2]
    x1, y1, x2, y2 = bbox
    x1, y1 = max(0, int(x1)), max(0, int(y1))
    x2, y2 = min(w, int(x2)), min(h, int(y2))

    crop = frame[y1:y2, x1:x2]
    if crop.size == 0:
        raise ValueError("Invalid bbox: empty face crop")

    _, buf = cv2.imencode(".jpg", crop, [int(cv2.IMWRITE_JPEG_QUALITY), quality])
    return buf.tobytes()


# Global Singleton Instance สำหรับใช้งานร่วมกันทั่วทั้ง Application
face_engine = FaceEngine(
    det_size=(settings.face_det_size, settings.face_det_size),
    det_thresh=settings.face_det_threshold,
)
