"""In-Memory Cosine Similarity Search Index สำหรับจับคู่เวกเตอร์ใบหน้ากับพนักงานในระบบ"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from typing import NamedTuple
from uuid import UUID

import numpy as np
import structlog

from app.core.config import settings

logger = structlog.get_logger(__name__)

# ค่า threshold cosine similarity อ่านจาก config เพื่อปรับได้ผ่าน .env
RECOGNITION_THRESHOLD = settings.face_recognition_threshold


class RecognitionMatch(NamedTuple):
    employee_id: UUID
    similarity: float  # ค่า cosine similarity (0.0 - 1.0)
    is_confident: bool  # True ถ้า similarity >= threshold


@dataclass
class EmployeeEmbeddingIndex:
    """
    In-memory embedding index ที่ปลอดภัยสำหรับ thread

    _matrix shape: (N, 512) stacked normalized embeddings
    _employee_ids: list UUID ในลำดับเดียวกับ row ของ matrix

    การ update เป็นแบบ full reload (copy-on-write) ไม่ใช่ in-place mutation
    เพื่อหลีกเลี่ยง race condition ระหว่างการจำแนกใบหน้า
    """

    _matrix: np.ndarray = field(
        default_factory=lambda: np.empty((0, 512), dtype=np.float32)
    )
    _employee_ids: list[UUID] = field(default_factory=list)
    _lock: asyncio.Lock = field(default_factory=asyncio.Lock)  # ใช้เฉพาะ rebuild

    @property
    def size(self) -> int:
        return len(self._employee_ids)

    async def rebuild(self, embeddings: dict[UUID, np.ndarray]) -> None:
        """แทนที่ index ทั้งหมดแบบ atomic เรียกหลัง registration ใหม่"""
        if not embeddings:
            async with self._lock:
                self._matrix = np.empty((0, 512), dtype=np.float32)
                self._employee_ids = []
            return

        ids = list(embeddings.keys())
        matrix = np.stack([embeddings[eid] for eid in ids]).astype(np.float32)
        # ตรวจสอบและบังคับ L2 normalize แถวเวกเตอร์ เพื่อให้ cosine similarity ถูกต้อง 100%
        norms = np.linalg.norm(matrix, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        matrix = matrix / norms

        async with self._lock:
            self._employee_ids = ids
            self._matrix = matrix

        logger.info("embedding_index_rebuilt", size=len(ids))

    async def find_match(self, probe: np.ndarray) -> RecognitionMatch | None:
        """
        ค้นหาด้วย cosine similarity — read-only path ไม่ต้อง lock
        (atomic reference read ปลอดภัยใน CPython / GIL)
        """
        matrix = self._matrix
        ids = self._employee_ids
        if matrix.shape[0] == 0:
            return None

        similarities = matrix @ probe
        best_idx = int(np.argmax(similarities))
        best_sim = float(similarities[best_idx])

        return RecognitionMatch(
            employee_id=ids[best_idx],
            similarity=best_sim,
            is_confident=best_sim >= RECOGNITION_THRESHOLD,
        )


# Singleton ระดับ application
embedding_index = EmployeeEmbeddingIndex()
