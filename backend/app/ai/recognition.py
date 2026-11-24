"""In-Memory Cosine Similarity Search Index สำหรับจับคู่เวกเตอร์ใบหน้ากับพนักงานในระบบ

Senior:
- Lock-Free Read Path: ให้อ่าน Matrix แบบ Atomic Reference Copy-on-Write ปลอดภัยภายใต้ GIL ไม่ต้องแย่ง Lock
- Guaranteed Cosine Metric: บังคับ L2-Normalization ทั้งเวกเตอร์ฐานข้อมูลและ Probe เวกเตอร์
- Thread-Safe Index Rebuild: ป้องกัน Race Condition ขณะมีผู้ใช้งานสแกนพร้อมกับมีผู้ลงทะเบียนใบหน้าใหม่
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from typing import NamedTuple
from uuid import UUID

import numpy as np
import structlog

from app.core.config import settings

logger = structlog.get_logger(__name__)

# ค่าเริ่มต้น Recognition Threshold จากไฟล์คอนฟิกูเรชัน
DEFAULT_RECOGNITION_THRESHOLD = settings.face_recognition_threshold


class RecognitionMatch(NamedTuple):
    """ผลลัพธ์การค้นหาใบหน้าที่ใกล้เคียงที่สุดจากฐานข้อมูลเวกเตอร์"""

    employee_id: UUID
    similarity: float       # ค่า Cosine Similarity ระหว่างเวกเตอร์ (0.0 - 1.0)
    is_confident: bool     # True หากค่าความคล้ายคลึงผ่านเกณฑ์ Threshold ความปลอดภัย


@dataclass
class EmployeeEmbeddingIndex:
    """
    In-memory embedding search index จัดเก็บเวกเตอร์ขนาด (N, 512)
    """

    _matrix: np.ndarray = field(
        default_factory=lambda: np.empty((0, 512), dtype=np.float32)
    )
    _employee_ids: list[UUID] = field(default_factory=list)
    _lock: asyncio.Lock = field(default_factory=asyncio.Lock)

    @property
    def size(self) -> int:
        """จำนวนพนักงานที่มีเวกเตอร์ใบหน้าอยู่ใน Index ปัจจุบัน"""
        return len(self._employee_ids)

    async def rebuild(self, embeddings: dict[UUID, np.ndarray]) -> None:
        """
        อัปเดตหรือโหลดดัชนีใหม่ทั้งหมดแบบ Atomic (Copy-on-write)
        ใช้เมื่อเริ่มระบบ หรือเมื่อมีการลงทะเบียนใบหน้าพนักงานใหม่
        """
        if not embeddings:
            async with self._lock:
                self._matrix = np.empty((0, 512), dtype=np.float32)
                self._employee_ids = []
            logger.info("embedding_index_cleared")
            return

        ids = list(embeddings.keys())
        matrix = np.stack([embeddings[eid] for eid in ids]).astype(np.float32)

        # บังคับ L2-Normalize ทุกแถวใน Matrix เพื่อให้การคูณ Dot Product กลายเป็น Cosine Similarity 100%
        norms = np.linalg.norm(matrix, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        normalized_matrix = matrix / norms

        async with self._lock:
            self._employee_ids = ids
            self._matrix = normalized_matrix

        logger.info("embedding_index_rebuilt", size=len(ids))

    async def find_match(
        self,
        probe: np.ndarray,
        threshold: float | None = None,
    ) -> RecognitionMatch | None:
        """
        ค้นหาพนักงานที่หน้าเหมือนที่สุดด้วย Cosine Similarity แบบ Lock-free Matrix Multiplication

        Args:
            probe: เวกเตอร์ใบหน้าที่ได้จากการสแกน (shape: 512)
            threshold: เกณฑ์คะแนนความมั่นใจ (หากไม่ระบุจะใช้ค่า Default จากการตั้งค่าระบบ)

        Returns:
            RecognitionMatch หากพบผู้ที่มีคะแนนสูงสุด หรือ None หาก Index ว่างเปล่า
        """
        matrix = self._matrix
        ids = self._employee_ids

        if matrix.shape[0] == 0 or len(ids) == 0:
            return None

        # รับประกันความปลอดภัยด้านคณิตศาสตร์: ทำ L2-Normalization ให้ Probe เวกเตอร์
        probe_vector = probe.astype(np.float32).flatten()
        probe_norm = np.linalg.norm(probe_vector)
        if probe_norm > 0:
            probe_vector = probe_vector / probe_norm

        # Matrix Vector Dot Product: O(N) Vectorized ใน C/BLAS
        similarities = matrix @ probe_vector
        best_idx = int(np.argmax(similarities))
        best_sim = float(similarities[best_idx])

        effective_threshold = threshold if threshold is not None else DEFAULT_RECOGNITION_THRESHOLD

        return RecognitionMatch(
            employee_id=ids[best_idx],
            similarity=best_sim,
            is_confident=best_sim >= effective_threshold,
        )


# Singleton Instance สำหรับใช้งานร่วมกันทั่วทั้ง Application
embedding_index = EmployeeEmbeddingIndex()
