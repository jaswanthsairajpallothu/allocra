"""Notifications router — hardened. Returns plain dicts, no ORM lazy loads."""
from __future__ import annotations

import logging
import traceback
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func
from app.database import get_db
from app.auth import get_current_user
from app.models import User, Notification

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/notifications", tags=["notifications"])


def _notif_dict(n: Notification) -> dict:
    return {
        "id": str(n.id),
        "type": n.type.value if n.type else "",
        "title": n.title or "",
        "body": n.body or "",
        "action_url": n.action_url,
        "is_read": bool(n.is_read),
        "created_at": n.created_at.isoformat() if n.created_at else None,
    }


@router.get("")
async def get_notifications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await db.execute(
            select(Notification)
            .where(Notification.user_id == current_user.id)
            .order_by(Notification.is_read.asc(), Notification.created_at.desc())
            .limit(50)
        )
        notifications = result.scalars().all()
        return JSONResponse(content=[_notif_dict(n) for n in notifications])
    except Exception:
        logger.error("get_notifications 500:\n%s", traceback.format_exc())
        return JSONResponse(content=[])  # never crash — return empty list


@router.patch("/read")
async def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        await db.execute(
            update(Notification)
            .where(
                Notification.user_id == current_user.id,
                Notification.is_read == False,
            )
            .values(is_read=True)
        )
        await db.flush()
        return JSONResponse(content={"message": "All notifications marked as read"})
    except Exception:
        logger.error("mark_all_read 500:\n%s", traceback.format_exc())
        raise HTTPException(status_code=500, detail="Failed to mark notifications as read.")


@router.get("/unread-count")
async def unread_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        count = await db.scalar(
            select(func.count()).where(
                Notification.user_id == current_user.id,
                Notification.is_read == False,
            )
        )
        return JSONResponse(content={"count": int(count or 0)})
    except Exception:
        logger.error("unread_count 500:\n%s", traceback.format_exc())
        return JSONResponse(content={"count": 0})  # never crash