"""ORM Model ตารางพนักงาน (employees)"""

from __future__ import annotations


from sqlalchemy import Boolean, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin, UUIDMixin, SoftDeleteMixin


class Employee(UUIDMixin, TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "employees"

    # รหัสพนักงาน -> unique, index เพื่อค้นหาเร็ว
    employee_code: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, index=True
    )
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    department: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    position: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # flag บอกว่าลงทะเบียนใบหน้าแล้วรึยัง
    face_registered: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )

    # Relationships
    face_embedding: Mapped["FaceEmbedding"] = relationship(  # noqa: F821
        "FaceEmbedding",
        back_populates="employee",
        uselist=False,
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    attendance_records: Mapped[list["AttendanceRecord"]] = relationship(  # noqa: F821
        "AttendanceRecord", back_populates="employee", cascade="all, delete-orphan"
    )

    @property
    def face_image_url(self) -> str | None:
        if self.face_embedding and self.face_embedding.deleted_at is None:
            return self.face_embedding.image_url
        return None
