from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from uuid import UUID

from app.database import get_db
from app.auth import get_current_user, require_plan
from app.models import User, ChatMessage, ProjectMember, PlanTier
from app.schemas import ChatMessageCreate, ReactionAdd, ChatMessageOut
from app.routers._helpers import create_notification

router = APIRouter(prefix="/chat", tags=["chat"])

PRO_REQUIRED = ["PRO", "TEAM"]


def _msg_out(msg: ChatMessage, user: User) -> ChatMessageOut:
    return ChatMessageOut(
        id=msg.id,
        project_id=msg.project_id,
        user_id=msg.user_id,
        user_name=user.name,
        user_avatar=user.avatar_url,
        content=msg.content,
        reactions=msg.reactions or [],
        is_pinned=msg.is_pinned,
        parent_id=msg.parent_id,
        created_at=msg.created_at,
        updated_at=msg.updated_at,
    )


@router.get("/messages", response_model=List[ChatMessageOut])
async def get_messages(
    project_id: UUID,
    parent_id: Optional[UUID] = Query(default=None),
    limit: int = Query(default=50, le=100),
    current_user: User = Depends(require_plan(*PRO_REQUIRED)),
    db: AsyncSession = Depends(get_db),
):
    await _assert_project_member(project_id, current_user.id, db)

    q = (
        select(ChatMessage, User)
        .join(User, User.id == ChatMessage.user_id)
        .where(ChatMessage.project_id == project_id)
    )
    if parent_id:
        q = q.where(ChatMessage.parent_id == parent_id)
    else:
        q = q.where(ChatMessage.parent_id == None)

    q = q.order_by(ChatMessage.created_at.desc()).limit(limit)
    result = await db.execute(q)
    return [_msg_out(msg, u) for msg, u in result.all()]


@router.post("/messages", response_model=ChatMessageOut, status_code=201)
async def send_message(
    body: ChatMessageCreate,
    current_user: User = Depends(require_plan(*PRO_REQUIRED)),
    db: AsyncSession = Depends(get_db),
):
    await _assert_project_member(body.project_id, current_user.id, db)

    msg = ChatMessage(
        project_id=body.project_id,
        user_id=current_user.id,
        content=body.content,
        parent_id=body.parent_id,
    )
    db.add(msg)
    await db.flush()

    # Handle @mentions: find @Name patterns and notify mentioned users
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
                if mention.lower() in u.name.lower() and u.id != current_user.id:
                    await create_notification(
                        db, u.id, "TASK_ASSIGNED",
                        "You were mentioned",
                        f"{current_user.name} mentioned you: \"{body.content[:80]}\"",
                        action_url=f"/projects/{body.project_id}/chat",
                    )
                    break

    return _msg_out(msg, current_user)


@router.post("/messages/{message_id}/reactions", response_model=ChatMessageOut)
async def add_reaction(
    message_id: UUID,
    body: ReactionAdd,
    current_user: User = Depends(require_plan(*PRO_REQUIRED)),
    db: AsyncSession = Depends(get_db),
):
    msg = await db.scalar(select(ChatMessage).where(ChatMessage.id == message_id))
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found.")
    await _assert_project_member(msg.project_id, current_user.id, db)

    reactions = list(msg.reactions or [])
    existing = next((r for r in reactions if r["emoji"] == body.emoji), None)

    if existing:
        uid_str = str(current_user.id)
        if uid_str in existing["user_ids"]:
            existing["user_ids"].remove(uid_str)
            if not existing["user_ids"]:
                reactions = [r for r in reactions if r["emoji"] != body.emoji]
        else:
            existing["user_ids"].append(uid_str)
    else:
        reactions.append({"emoji": body.emoji, "user_ids": [str(current_user.id)]})

    msg.reactions = reactions
    await db.flush()

    u = await db.scalar(select(User).where(User.id == msg.user_id))
    return _msg_out(msg, u)


@router.post("/messages/{message_id}/pin", response_model=ChatMessageOut)
async def toggle_pin(
    message_id: UUID,
    current_user: User = Depends(require_plan(*PRO_REQUIRED)),
    db: AsyncSession = Depends(get_db),
):
    msg = await db.scalar(select(ChatMessage).where(ChatMessage.id == message_id))
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found.")
    await _assert_project_member(msg.project_id, current_user.id, db)

    msg.is_pinned = not msg.is_pinned
    await db.flush()
    u = await db.scalar(select(User).where(User.id == msg.user_id))
    return _msg_out(msg, u)


async def _assert_project_member(project_id: UUID, user_id: UUID, db: AsyncSession):
    pm = await db.scalar(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id,
        )
    )
    if not pm:
        raise HTTPException(status_code=403, detail="Not a member of this project.")
