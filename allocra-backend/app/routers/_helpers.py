"""Shared helpers used across multiple routers."""
from uuid import UUID
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Notification, ActivityLog, NotificationType


async def create_notification(
    db: AsyncSession,
    user_id: UUID,
    notif_type: str,
    title: str,
    body: str,
    action_url: Optional[str] = None,
):
    notif = Notification(
        user_id=user_id,
        type=NotificationType(notif_type),
        title=title,
        body=body,
        action_url=action_url,
    )
    db.add(notif)
    await db.flush()
    return notif


async def log_activity(
    db: AsyncSession,
    project_id: UUID,
    event: str,
    actor_id: Optional[UUID] = None,
    detail: Optional[str] = None,
):
    log = ActivityLog(
        project_id=project_id,
        actor_id=actor_id,
        event=event,
        detail=detail,
    )
    db.add(log)
    await db.flush()
    return log
