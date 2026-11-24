"""API Router สำหรับดึงประวัติการลงเวลาเข้า-ออกงานและการคำนวณสถิติประจำเดือน"""

from __future__ import annotations

import calendar
from datetime import date, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db_session
from app.core.timezone import get_local_now, get_local_today
from app.models.attendance import AttendanceRecord
from app.models.employee import Employee
from app.repositories.attendance import AttendanceRepository
from app.repositories.employee import EmployeeRepository
from app.schemas.attendance import (
    AttendanceCheckInRequest,
    AttendanceDistributionItem,
    AttendanceDistributionResponse,
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
    "/distribution",
    response_model=AttendanceDistributionResponse,
    summary="สถิติการเข้างานรายวันย้อนหลังสำหรับแสดงกราฟจริง",
)
async def get_attendance_distribution(
    days: int = Query(7, ge=1, le=30, description="จำนวนวันที่ต้องการดูสถิติย้อนหลัง"),
    session: AsyncSession = Depends(get_db_session),
) -> AttendanceDistributionResponse:
    """
    คำนวณสถิติการเข้างานจริงจากฐานข้อมูลรายวันย้อนหลัง (เช่น 7 วัน, 14 วัน หรือ 30 วัน):
    - นับจำนวนพนักงานที่เข้างานจริงในแต่ละวัน
    - คำนวณอัตรา On-time rate จากสถานะ present จริง
    - คำนวณความสูงแท่งกราฟแบบไดนามิกอิงตามข้อมูลจริง
    """
    today = get_local_today()
    start_date = today - timedelta(days=days - 1)

    total_emp = await session.scalar(
        select(func.count(Employee.id)).where(
            Employee.deleted_at.is_(None),
            Employee.is_active == True,
        )
    ) or 1

    query = (
        select(
            AttendanceRecord.work_date,
            func.count(AttendanceRecord.id).label("total_count"),
            func.count(AttendanceRecord.id)
            .filter(AttendanceRecord.status == "present")
            .label("on_time_count"),
        )
        .where(
            AttendanceRecord.work_date >= start_date,
            AttendanceRecord.work_date <= today,
            AttendanceRecord.deleted_at.is_(None),
        )
        .group_by(AttendanceRecord.work_date)
    )

    rows = (await session.execute(query)).all()
    date_map = {row.work_date: row for row in rows}

    total_presents = sum(r.total_count for r in rows)
    total_on_time = sum(r.on_time_count for r in rows)
    on_time_rate = (
        round((total_on_time / total_presents * 100), 1)
        if total_presents > 0
        else 100.0
    )

    max_daily_count = max([r.total_count for r in rows] + [1])

    daily_data: list[AttendanceDistributionItem] = []
    for i in range(days):
        cur_date = start_date + timedelta(days=i)
        row = date_map.get(cur_date)
        count = row.total_count if row else 0

        # คำนวณความสูงขั้นต่ำ 8% สำหรับวันที่ไม่มีคนมา เพื่อคงรูปทรงแท่งกราฟ Pill Bar
        height_pct = round((count / max(max_daily_count, 1)) * 100, 1) if count > 0 else 8.0

        daily_data.append(
            AttendanceDistributionItem(
                date=cur_date,
                day=cur_date.strftime("%a"),
                count=count,
                height=f"{max(height_pct, 8.0):.1f}%",
                is_today=cur_date == today,
            )
        )

    return AttendanceDistributionResponse(
        days=days,
        total_active_employees=total_emp,
        on_time_rate=on_time_rate,
        daily_data=daily_data,
    )


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
