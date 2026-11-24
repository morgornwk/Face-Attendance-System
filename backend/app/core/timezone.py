"""Timezone Helper กำหนดและคืนค่า Datetime/Date ปัจจุบันในโซน Asia/Bangkok"""

from datetime import date, datetime
from zoneinfo import ZoneInfo

BANGKOK_TZ = ZoneInfo("Asia/Bangkok")


def get_local_now() -> datetime:
    """ดึงเวลาปัจจุบันพร้อม timezone Asia/Bangkok"""
    return datetime.now(BANGKOK_TZ)


def get_local_today() -> date:
    """ดึงวันที่ปฏิทินปัจจุบันใน timezone Asia/Bangkok"""
    return get_local_now().date()
