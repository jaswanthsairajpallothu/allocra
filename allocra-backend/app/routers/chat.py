"""Chat router — hardened. Plain dicts only, no ORM lazy loads."""
from __future__ import annotations

import logging
import traceback
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from uuid import UUID

from app.database import get_db
from app.auth import get_current_user, require_plan
from app.models import User, ChatMessage, ProjectMember
from app.schemas import ChatMessageCreate, ReactionAdd
from app.routers._helpers import create_notification

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])

PRO_PLANS = ("PRO", "TEAM")


def _msg_dict(msg: ChatMessage, user_name: str, user_avatar: Optional[str]) -> dict:
    return {
        "id": str(msg.id),
        "project_id": str(msg.project_id),
        "user_id": str(msg.user_id),
        "user_name": user_name,
        "user_avatar": user_avatar,
        "content": msg.content,
        "reactions": msg.reactions or [],
        "is_pinned": bool(msg.is_pinned),
        "parent_id": str(msg.parent_id) if msg.parent_id else None,
        "created_at": msg.created_at.isoformat() if msg.created_at else None,
        "updated_at": msg.updated_at.isoformat() if msg.updated_at else None,
    }


async def _get_user_map(user_ids: list, db: AsyncSession) -> dict:
    """Batch-fetch users. Returns {user_id: User}."""
    if not user_ids:
        return {}
    result = await db.execute(select(User).where(User.id.in_(user_ids)))
    return {u.id: u for u in result.scalars().all()}


@router.get("/messages")
async def get_messages(
    project_id: UUID,
    parent_id: Optional[UUID] = Query(default=None),
    limit: int = Query(default=50, le=100),
    current_user: User = Depends(require_plan(*PRO_PLANS)),
    db: AsyncSession = Depends(get_db),
):
    try:
        await _assert_project_member(project_id, current_user.id, db)

        q = (
            select(ChatMessage)
            .where(ChatMessage.project_id == project_id)
        )
        if parent_id:
            q = q.where(ChatMessage.parent_id == parent_id)
        else:
            q = q.where(ChatMessage.parent_id == None)

        q = q.order_by(ChatMessage.created_at.desc()).limit(limit)
        result = await db.execute(q)
        messages = result.scalars().all()

        # Batch-fetch all senders
        user_ids = list({m.user_id for m in messages})
        user_map = await _get_user_map(user_ids, db)

        out = []
        for msg in messages:
            u = user_map.get(msg.user_id)
            out.append(_msg_dict(
                msg,
                user_name=u.name if u else "Unknown",
                user_avatar=u.avatar_url if u else None,
            ))

        return JSONResponse(content=out)

    except HTTPException:
        raise
    except Exception:
        logger.error("get_messages 500:\n%s", traceback.format_exc())
        raise HTTPException(status_code=500, detail="Failed to fetch messages.")


@router.post("/messages", status_code=201)
async def send_message(
    body: ChatMessageCreate,
    current_user: User = Depends(require_plan(*PRO_PLANS)),
    db: AsyncSession = Depends(get_db),
):
    try:
        await _assert_project_member(body.project_id, current_user.id, db)

        msg = ChatMessage(
            project_id=body.project_id,
            user_id=current_user.id,
            content=body.content,
            parent_id=body.parent_id,
        )
        db.add(msg)
        await db.flush()

        # Handle @mentions
        try:
            import re
            mentions = re.findall(r"@(\w+(?:\s\w+)?)", body.content)
            if mentions:
                members_result = await db.execute(
                    select(ProjectMember, User)
                    .join(User, User.id == ProjectMember.user_id)
                    .where(ProjectMember.project_id == body.project_id)
                )
                for pm, u in members_result.all():
                    for mention in mentions:
                        if mention.lower() in (u.name or "").lower() and u.id != current_user.id:
                            await create_notification(
                                db, u.id, "TASK_ASSIGNED",
                                "You were mentioned",
                                f"{current_user.name} mentioned you: \"{body.content[:80]}\"",
                                action_url=f"/projects/{body.project_id}/chat",
                            )
                            break
        except Exception as exc:
            logger.error("Mention notification failed: %s", exc)

        return JSONResponse(
            content=_msg_dict(msg, current_user.name, current_user.avatar_url),
            status_code=201
        )

    except HTTPException:
        raise
    except Exception:
        logger.error("send_message 500:\n%s", traceback.format_exc())
        raise HTTPException(status_code=500, detail="Failed to send message.")


@router.post("/messages/{message_id}/reactions")
async def add_reaction(
    message_id: UUID,
    body: ReactionAdd,
    current_user: User = Depends(require_plan(*PRO_PLANS)),
    db: AsyncSession = Depends(get_db),
):
    try:
        msg = await db.scalar(select(ChatMessage).where(ChatMessage.id == message_id))
        if not msg:
            raise HTTPException(status_code=404, detail="Message not found.")
        await _assert_project_member(msg.project_id, current_user.id, db)

        reactions = list(msg.reactions or [])
        uid_str = str(current_user.id)
        existing = next((r for r in reactions if r["emoji"] == body.emoji), None)

        if existing:
            if uid_str in existing["user_ids"]:
                existing["user_ids"].remove(uid_str)
                if not existing["user_ids"]:
                    reactions = [r for r in reactions if r["emoji"] != body.emoji]
            else:
                existing["user_ids"].append(uid_str)
        else:
            reactions.append({"emoji": body.emoji, "user_ids": [uid_str]})

        msg.reactions = reactions
        await db.flush()

        # Fetch sender name without touching relationship
        sender = await db.scalar(select(User).where(User.id == msg.user_id))
        return JSONResponse(content=_msg_dict(
            msg,
            user_name=sender.name if sender else "Unknown",
            user_avatar=sender.avatar_url if sender else None,
        ))

    except HTTPException:
        raise
    except Exception:
        logger.error("add_reaction 500:\n%s", traceback.format_exc())
        raise HTTPException(status_code=500, detail="Failed to add reaction.")


@router.post("/messages/{message_id}/pin")
async def toggle_pin(
    message_id: UUID,
    current_user: User = Depends(require_plan(*PRO_PLANS)),
    db: AsyncSession = Depends(get_db),
):
    try:
        msg = await db.scalar(select(ChatMessage).where(ChatMessage.id == message_id))
        if not msg:
            raise HTTPException(status_code=404, detail="Message not found.")
        await _assert_project_member(msg.project_id, current_user.id, db)

        msg.is_pinned = not msg.is_pinned
        await db.flush()

        sender = await db.scalar(select(User).where(User.id == msg.user_id))
        return JSONResponse(content=_msg_dict(
            msg,
            user_name=sender.name if sender else "Unknown",
            user_avatar=sender.avatar_url if sender else None,
        ))

    except HTTPException:
        raise
    except Exception:
        logger.error("toggle_pin 500:\n%s", traceback.format_exc())
        raise HTTPException(status_code=500, detail="Failed to toggle pin.")


async def _assert_project_member(project_id: UUID, user_id: UUID, db: AsyncSession):
    pm = await db.scalar(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id,
        )
    )
    if not pm:
        raise HTTPException(status_code=403, detail="Not a member of this project.")