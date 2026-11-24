"""RTSP Stream Reader ดึงเฟรมจากกล้อง RTSP/Webcam พร้อมระบบ Frame Skipping และ Reconnect อัตโนมัติ"""

from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass
from typing import AsyncGenerator

import cv2
import numpy as np
import structlog

logger = structlog.get_logger(__name__)

PROCESS_INTERVAL_SEC = 1.0  # ประมวลผล 1 frame ต่อวินาที ต่อกล้อง
RECONNECT_DELAY_BASE = 2.0  # วินาทีก่อน reconnect ครั้งแรก
RECONNECT_DELAY_MAX = 30.0  # ขีดสูงสุดของ reconnect backoff
FRAME_READ_TIMEOUT = 5.0  # วินาทีก่อนประกาศ stream dead


@dataclass
class CameraConfig:
    camera_id: str
    rtsp_url: str
    fps_target: int = 25
    resolution: tuple[int, int] = (640, 480)


async def stream_frames(
    config: CameraConfig,
    stop_event: asyncio.Event,
) -> AsyncGenerator[tuple[str, np.ndarray], None]:
    """
    Async generator ที่ yield tuple (camera_id, frame)
    จัดการ reconnection ภายในผู้เรียกไม่เคยเห็น disconnect
    """
    reconnect_delay = RECONNECT_DELAY_BASE

    while not stop_event.is_set():
        cap = await asyncio.to_thread(_open_capture, config.rtsp_url, config.resolution)

        if cap is None or not cap.isOpened():
            logger.warning(
                "camera_connect_failed",
                camera_id=config.camera_id,
                retry_in=reconnect_delay,
            )
            await asyncio.sleep(reconnect_delay)
            reconnect_delay = min(reconnect_delay * 2, RECONNECT_DELAY_MAX)
            continue

        reconnect_delay = RECONNECT_DELAY_BASE
        logger.info("camera_connected", camera_id=config.camera_id)

        last_process_time = 0.0

        try:
            while not stop_event.is_set():
                ret, frame = await asyncio.wait_for(
                    asyncio.to_thread(cap.read),
                    timeout=FRAME_READ_TIMEOUT,
                )

                if not ret:
                    logger.warning(
                        "camera_frame_read_failed", camera_id=config.camera_id
                    )
                    break

                now = time.monotonic()
                if now - last_process_time >= PROCESS_INTERVAL_SEC:
                    last_process_time = now
                    yield config.camera_id, frame

        except asyncio.TimeoutError:
            logger.warning("camera_read_timeout", camera_id=config.camera_id)
        except Exception as exc:
            logger.exception(
                "camera_stream_error", camera_id=config.camera_id, error=str(exc)
            )
        finally:
            await asyncio.to_thread(cap.release)
            logger.info("camera_disconnected", camera_id=config.camera_id)


def _open_capture(
    rtsp_url: str, resolution: tuple[int, int]
) -> cv2.VideoCapture | None:
    """เรียกใน thread pool OpenCV blocking operation ปลอดภัยที่นี่"""
    # ถ้าค่าเป็นตัวเลข (เช่น "0") ให้ใช้ Webcam บนเครื่องแทน RTSP
    if rtsp_url.isdigit():
        cap = cv2.VideoCapture(int(rtsp_url))
    else:
        cap = cv2.VideoCapture(rtsp_url, cv2.CAP_FFMPEG)

    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # ดึง frame ล่าสุดเสมอ
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, resolution[0])
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, resolution[1])
    return cap
