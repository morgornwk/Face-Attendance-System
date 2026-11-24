"""WebSocket Route สำหรับส่งข้อมูลการลงเวลาเข้า-ออกงานแบบ Real-time ไปยัง Dashboard"""

from __future__ import annotations

import structlog
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.websocket.manager import attendance_manager

logger = structlog.get_logger(__name__)

router = APIRouter()


@router.websocket("/ws/attendance")
async def attendance_feed(websocket: WebSocket) -> None:
    """
    WebSocket endpoint สำหรับ real-time attendance event stream

    Flow:
    1. Client connect -> server accept + เก็บใน connection manager
    2. Server broadcast attendance events ไปทุก client
    3. Client ส่ง "ping" -> server ตอบ "pong" (keep-alive)
    4. Client disconnect -> ลบออกจาก connection manager
    """
    await attendance_manager.connect(websocket)
    try:
        # รอรับ message จาก client (keep connection alive)
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        pass
    except Exception:
        logger.exception("ws_unexpected_error")
    finally:
        await attendance_manager.disconnect(websocket)
