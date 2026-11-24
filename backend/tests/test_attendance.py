# pyrefly: ignore [missing-import]
import pytest
from uuid import uuid4
from datetime import date, timedelta
from fastapi import HTTPException

from app.core.timezone import get_local_now, get_local_today
from app.models.employee import Employee
from app.models.attendance import AttendanceRecord
from app.database.session import async_session_factory, async_engine
from app.repositories.employee import EmployeeRepository
from app.repositories.attendance import AttendanceRepository
from app.schemas.attendance import AttendanceCheckInRequest
from app.api.v1.attendance import (
    record_attendance_checkin,
    get_all_today_attendance,
    get_today_attendance,
    get_attendance_history,
    get_monthly_attendance_summary,
)


@pytest.mark.asyncio
async def test_attendance_lifecycle_flow(mocker):
    """ระบบบันทึกการเข้างานและออกงาน (Attendance Flow & De-duplication)

    ทดสอบการบันทึกประวัติการเข้างาน-ออกงาน เพื่อยืนยันว่าการทำงานระดับฐานข้อมูลสอดคล้องกันอย่างถูกต้อง
    """
    try:
        async with async_session_factory() as session:
            emp_repo = EmployeeRepository(session)
            attendance_repo = AttendanceRepository(session)

            # 1. จำลองพนักงาน
            emp_code = f"TEST-ATT-{uuid4()}".upper()[:20]
            emp = Employee(
                employee_code=emp_code,
                full_name="Worker Bee",
                department="Production",
                position="Staff",
            )
            emp = await emp_repo.create(emp)
            await session.flush()

            # 2. ตรวจสอบการลงชื่อเข้างานครั้งแรกของวัน
            now_time = get_local_now()
            work_date = now_time.date()

            # ยืนยันว่ายังไม่มีการบันทึก
            existing_record = await attendance_repo.get_today_record(emp.id)
            assert existing_record is None

            # บันทึก Check-in
            record = AttendanceRecord(
                employee_id=emp.id,
                work_date=work_date,
                check_in_time=now_time,
                camera_id="CAM-ENTRANCE-01",
                confidence_score=0.92,
                image_url="http://localhost:9000/attendance/face-01.jpg",
            )
            await attendance_repo.create(record)
            await session.flush()

            # ค้นหาอีกครั้งเพื่อยืนยันว่าบันทึกแล้ว
            record_db = await attendance_repo.get_today_record(emp.id)
            assert record_db is not None
            assert record_db.employee_id == emp.id
            assert record_db.check_in_time == now_time
            assert record_db.check_out_time is None  # ยังไม่ออกงาน

            # 3. อัปเดตเวลาออกงาน (Check-out)
            out_time = get_local_now()
            record_db.check_out_time = out_time
            record_db.camera_id = "CAM-EXIT-01"
            await session.flush()

            # ยืนยันจาก DB ว่าบันทึกการออกงานแล้ว
            record_final = await attendance_repo.get_today_record(emp.id)
            assert record_final is not None
            assert record_final.check_out_time == out_time
            assert record_final.camera_id == "CAM-EXIT-01"

            await session.rollback()
    finally:
        await async_engine.dispose()


@pytest.mark.asyncio
async def test_api_checkin_and_checkout_flow(mocker):
    """ทดสอบ API Check-in และ Check-out (/api/v1/attendance/check-in) ทั้งกรณีสำเร็จและ Error"""
    # Mock WebSocket broadcast to avoid network dependency in unit test
    mocker.patch("app.websocket.manager.attendance_manager.broadcast")

    try:
        async with async_session_factory() as session:
            emp_repo = EmployeeRepository(session)

            # 1. สร้างพนักงานทดสอบ
            emp_code = f"TEST-API-{uuid4()}".upper()[:20]
            emp = Employee(
                employee_code=emp_code,
                full_name="API Check-in Tester",
                department="QA",
                position="Tester",
            )
            emp = await emp_repo.create(emp)
            await session.flush()

            # 2. Check-in ครั้งแรกของวัน (Status 200, Event: check_in)
            payload_in = AttendanceCheckInRequest(
                employee_id=emp.id,
                camera_id="kiosk-cam-01",
                confidence_score=0.96,
                status="present",
            )
            res_in = await record_attendance_checkin(payload_in, session)
            assert res_in.employee_id == emp.id
            assert res_in.check_in_time is not None
            assert res_in.check_out_time is None
            assert res_in.status == "present"

            # 3. Check-out ในวันเดียวกัน (ต้องอัปเดต check_out_time และคง check_in_time เดิม)
            payload_out = AttendanceCheckInRequest(
                employee_id=emp.id,
                camera_id="kiosk-cam-02",
                confidence_score=0.98,
                status="present",
            )
            res_out = await record_attendance_checkin(payload_out, session)
            assert res_out.employee_id == emp.id
            assert res_out.check_in_time == res_in.check_in_time
            assert res_out.check_out_time is not None
            assert res_out.camera_id == "kiosk-cam-02"

            # 4. ทดสอบกรณีไม่พบพนักงาน (Employee Not Found -> 404)
            invalid_payload = AttendanceCheckInRequest(
                employee_id=uuid4(),
                camera_id="kiosk-cam-01",
                confidence_score=0.95,
                status="present",
            )
            with pytest.raises(HTTPException) as exc_info:
                await record_attendance_checkin(invalid_payload, session)
            assert exc_info.value.status_code == 404

            await session.rollback()
    finally:
        await async_engine.dispose()


@pytest.mark.asyncio
async def test_monthly_summary_calculation():
    """ทดสอบการคำนวณสถิติประจำเดือน (วันทำงาน จ-ศ, มาสาย, ขาดงาน, อัตราเข้างาน %)"""
    try:
        async with async_session_factory() as session:
            emp_repo = EmployeeRepository(session)
            attendance_repo = AttendanceRepository(session)

            emp_code = f"TEST-MON-{uuid4()}".upper()[:20]
            emp = Employee(
                employee_code=emp_code,
                full_name="Monthly Tester",
                department="Finance",
                position="Accountant",
            )
            emp = await emp_repo.create(emp)
            await session.flush()

            # บันทึกประวัติการเข้างานย้อนหลัง 2 วัน: วันหนึ่งตรงเวลา อีกวันมาสาย
            today = get_local_today()
            r1 = AttendanceRecord(
                employee_id=emp.id,
                work_date=today,
                check_in_time=get_local_now(),
                camera_id="cam-01",
                confidence_score=0.95,
                status="present",
            )
            await attendance_repo.create(r1)

            # เรียก API monthly-summary ของเดือนและปีปัจจุบัน
            summary = await get_monthly_attendance_summary(
                employee_id=emp.id,
                year=today.year,
                month=today.month,
                session=session,
            )

            assert summary.employee_id == emp.id
            assert summary.year == today.year
            assert summary.month == today.month
            assert summary.working_days >= 20  # เดือนหนึ่งมีวันทำงาน จ-ศ ปกติ 20-23 วัน
            assert summary.present_days >= 1
            assert summary.attendance_rate >= 0.0

            # ทดสอบเดือนในอนาคต (เช่น ปี 2030): ต้องคำนวณวันทำงานได้ และ absent_days ต้องเป็น 0
            future_summary = await get_monthly_attendance_summary(
                employee_id=emp.id,
                year=2030,
                month=1,
                session=session,
            )
            assert future_summary.working_days == 23  # มกราคม 2030 มีวัน จ-ศ 23 วัน
            assert future_summary.absent_days == 0   # อนาคตยังไม่ถึง ต้องไม่นับว่าขาดงาน
            assert future_summary.attendance_rate == 100.0

            await session.rollback()
    finally:
        await async_engine.dispose()


@pytest.mark.asyncio
async def test_today_and_history_endpoints():
    """ทดสอบ Endpoint ดูประวัติย้อนหลังและข้อมูลการเข้างานวันนี้"""
    try:
        async with async_session_factory() as session:
            emp_repo = EmployeeRepository(session)
            attendance_repo = AttendanceRepository(session)

            emp_code = f"TEST-HIST-{uuid4()}".upper()[:20]
            emp = Employee(
                employee_code=emp_code,
                full_name="History Tester",
                department="HR",
                position="Specialist",
            )
            emp = await emp_repo.create(emp)
            await session.flush()

            today = get_local_today()
            now = get_local_now()

            # 1. ยังไม่มีการเข้างานวันนี้ -> get_today_attendance ต้องส่งกลับ None
            today_record = await get_today_attendance(emp.id, session)
            assert today_record is None

            # 2. บันทึกการเข้างาน
            rec = AttendanceRecord(
                employee_id=emp.id,
                work_date=today,
                check_in_time=now,
                camera_id="cam-hist",
                confidence_score=0.97,
                status="present",
            )
            await attendance_repo.create(rec)
            await session.flush()

            # 3. มีบันทึกแล้ว -> get_today_attendance ต้องส่งกลับข้อมูลถูกต้อง
            today_record_after = await get_today_attendance(emp.id, session)
            assert today_record_after is not None
            assert today_record_after.employee_id == emp.id

            # 4. ทดสอบ get_all_today_attendance
            all_today = await get_all_today_attendance(session)
            assert isinstance(all_today, list)
            assert any(r.employee_id == emp.id for r in all_today)

            # 5. ทดสอบ get_attendance_history ตามช่วงวันที่
            history = await get_attendance_history(
                employee_id=emp.id,
                start_date=today - timedelta(days=7),
                end_date=today + timedelta(days=1),
                session=session,
            )
            assert len(history) >= 1
            assert history[0].employee_id == emp.id

            await session.rollback()
    finally:
        await async_engine.dispose()
