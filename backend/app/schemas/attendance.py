"""Pydantic Schemas สำหรับ Query และ Response ข้อมูลประวัติการลงเวลาเข้างาน"""

from __future__ import annotations

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, model_validator


class AttendanceRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    employee_id: UUID
    work_date: date
    check_in_time: datetime
    check_out_time: datetime | None
    camera_id: str
    confidence_score: float
    status: str
    created_at: datetime


class AttendanceCheckInRequest(BaseModel):
    employee_id: UUID
    camera_id: str = "web-kiosk"
    confidence_score: float = 0.985
    status: str = "present"  # "present" | "late"


class AttendanceMonthlySummaryResponse(BaseModel):
    employee_id: UUID
    year: int
    month: int
    total_days: int
    working_days: int
    present_days: int
    late_days: int
    absent_days: int
    attendance_rate: float
    records: list[AttendanceRecordResponse]


class AttendanceDistributionItem(BaseModel):
    date: date
    day: str
    count: int
    height: str
    is_today: bool


class AttendanceDistributionResponse(BaseModel):
    days: int
    total_active_employees: int
    on_time_rate: float
    daily_data: list[AttendanceDistributionItem]

