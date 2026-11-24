"""API Router สำหรับดึงประวัติการลงเวลาเข้า-ออกงานและการคำนวณสถิติประจำเดือน"""

from __future__ import annotations

import calendar
from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db_session
from app.core.timezone import get_local_now, get_local_today
from app.models.attendance import AttendanceRecord
from app.repositories.attendance import AttendanceRepository
from app.repositories.employee import EmployeeRepository
from app.schemas.attendance import (
    AttendanceCheckInRequest,
    AttendanceMonthlySummaryResponse,
    AttendanceRecordResponse,
)
from app.websocket.manager import AttendanceEvent, attendance_manager

router = APIRouter(prefix="/attendance", tags=["การเข้างาน"])


@router.post(
    "/check-in",
    response_model=AttendanceRecordResponse,
    status_code=status.HTTP_200_OK,
    summary="บันทึกเวลาเข้า-ออกงาน (Check-in/Check-out)",
)
async def record_attendance_checkin(
    payload: AttendanceCheckInRequest,
    session: AsyncSession = Depends(get_db_session),
) -> AttendanceRecordResponse:
    """
    บันทึกการเข้างานของพนักงาน:
    - ถ้ายังไม่มี record วันนี้ -> บันทึกเป็น check_in
    - ถ้ามี record วันนี้แล้ว -> อัปเดตเวลา check_out_time
    - ส่ง Broadcast แจ้งเตือน WebSocket Dashboard ทันที
    """
    repo = AttendanceRepository(session)
    emp_repo = EmployeeRepository(session)

    employee = await emp_repo.get_by_id(payload.employee_id)
    if not employee:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Employee not found")

    now_time = get_local_now()
    work_date = now_time.date()

    record = await repo.get_today_record(payload.employee_id)
    event_type = "check_out" if record else "check_in"

    if record is None:
        record = AttendanceRecord(
            employee_id=payload.employee_id,
            work_date=work_date,
            check_in_time=now_time,
            camera_id=payload.camera_id,
            confidence_score=payload.confidence_score,
            status=payload.status,
        )
        record = await repo.create(record)
    else:
        record.check_out_time = now_time
        record.camera_id = payload.camera_id
        if payload.status != "present":
            record.status = payload.status

    await session.commit()
    await session.refresh(record)

    # Broadcast ไปยัง WebSocket clients
    event = AttendanceEvent(
        event_type=event_type,
        employee_id=str(employee.id),
        employee_code=employee.employee_code,
        full_name=employee.full_name,
        camera_id=payload.camera_id,
        confidence=payload.confidence_score,
        timestamp=now_time.isoformat(),
    )
    await attendance_manager.broadcast(event)

    return AttendanceRecordResponse.model_validate(record)


@router.get(
    "/today-summary",
    response_model=list[AttendanceRecordResponse],
    summary="ดูการเข้างานวันนี้ของพนักงานทุกคน",
)
async def get_all_today_attendance(
    session: AsyncSession = Depends(get_db_session),
) -> list[AttendanceRecordResponse]:
    from sqlalchemy import select
    today = get_local_today()
    result = await session.execute(
        select(AttendanceRecord).where(
            AttendanceRecord.work_date == today,
            AttendanceRecord.deleted_at.is_(None),
        )
    )
    records = result.scalars().all()
    return [AttendanceRecordResponse.model_validate(r) for r in records]


@router.get(
    "/today/{employee_id}",
    response_model=AttendanceRecordResponse | None,
    summary="ดูการเข้างานวันนี้ของพนักงาน",
)
async def get_today_attendance(
    employee_id: UUID,
    session: AsyncSession = Depends(get_db_session),
) -> AttendanceRecordResponse | None:
    repo = AttendanceRepository(session)
    record = await repo.get_today_record(employee_id)
    if not record:
        return None
    return AttendanceRecordResponse.model_validate(record)


@router.get(
    "/history/{employee_id}",
    response_model=list[AttendanceRecordResponse],
    summary="ดูประวัติการเข้างานตามช่วงวันที่",
)
async def get_attendance_history(
    employee_id: UUID,
    start_date: date = Query(..., description="วันที่เริ่มต้น (YYYY-MM-DD)"),
    end_date: date = Query(..., description="วันที่สิ้นสุด (YYYY-MM-DD)"),
    session: AsyncSession = Depends(get_db_session),
) -> list[AttendanceRecordResponse]:
    repo = AttendanceRepository(session)
    records = await repo.get_by_date_range(employee_id, start_date, end_date)
    return [AttendanceRecordResponse.model_validate(r) for r in records]


@router.get(
    "/monthly-summary/{employee_id}",
    response_model=AttendanceMonthlySummaryResponse,
    summary="คำนวณสถิติการเข้างานและวันขาดงานประจำเดือน",
)
async def get_monthly_attendance_summary(
    employee_id: UUID,
    year: int = Query(..., description="ปี ค.ศ. (เช่น 2026)"),
    month: int = Query(..., ge=1, le=12, description="เดือน (1-12)"),
    session: AsyncSession = Depends(get_db_session),
) -> AttendanceMonthlySummaryResponse:
    """
    คำนวณสถิติประจำเดือน:
    - วันทำงานทั้งหมด (ไม่นับเสาร์-อาทิตย์)
    - วันที่เข้างานจริง (present_days)
    - วันที่มาสาย (late_days)
    - วันที่ขาดงาน (absent_days)
    - อัตราการเข้างาน (% attendance_rate)
    """
    repo = AttendanceRepository(session)
    _, total_days = calendar.monthrange(year, month)
    start_date = date(year, month, 1)
    end_date = date(year, month, total_days)

    records = await repo.get_by_date_range(employee_id, start_date, end_date)

    # คำนวณวันทำงาน (จันทร์-ศุกร์)
    today = get_local_today()
    working_days = 0
    elapsed_working_days = 0
    for day in range(1, total_days + 1):
        cur_date = date(year, month, day)
        if cur_date.weekday() < 5:  # 0=Monday .. 4=Friday
            working_days += 1
            if cur_date <= today:
                elapsed_working_days += 1

    present_dates = {r.work_date for r in records}
    present_days = len(present_dates)
    late_days = sum(1 for r in records if r.status == "late")

    # ขาดงาน = วันทำงานที่ผ่านมาแล้วแต่ไม่มีบันทึกเข้างาน
    absent_days = max(0, elapsed_working_days - present_days)
    attendance_rate = (
        round((present_days / elapsed_working_days) * 100, 1)
        if elapsed_working_days > 0
        else 100.0
    )

    return AttendanceMonthlySummaryResponse(
        employee_id=employee_id,
        year=year,
        month=month,
        total_days=total_days,
        working_days=working_days,
        present_days=present_days,
        late_days=late_days,
        absent_days=absent_days,
        attendance_rate=min(100.0, attendance_rate),
        records=[AttendanceRecordResponse.model_validate(r) for r in records],
    )
