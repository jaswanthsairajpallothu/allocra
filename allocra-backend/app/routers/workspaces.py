from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List
from uuid import UUID

from app.database import get_db
from app.auth import get_current_user
from app.models import User, Workspace, WorkspaceMember, Project, generate_join_code
from app.schemas import (
    WorkspaceCreate, WorkspaceUpdate, WorkspaceOut,
    JoinWorkspace, WorkspaceMemberOut
)
from app.routers._helpers import log_activity, create_notification

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


def _plan_workspace_limit(plan: str) -> int:
    return {"FREE": 1, "PRO": 3, "TEAM": 10}.get(plan, 1)


async def _workspace_out(ws: Workspace, db: AsyncSession) -> WorkspaceOut:
    member_count = await db.scalar(
        select(func.count()).where(WorkspaceMember.workspace_id == ws.id)
    )
    project_count = await db.scalar(
        select(func.count()).where(Project.workspace_id == ws.id)
    )
    return WorkspaceOut(
        id=ws.id,
        name=ws.name,
        join_code=ws.join_code,
        creator_id=ws.creator_id,
        member_count=member_count or 0,
        project_count=project_count or 0,
        created_at=ws.created_at,
    )


@router.post("", response_model=WorkspaceOut, status_code=201)
async def create_workspace(
    body: WorkspaceCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Enforce plan workspace limit
    limit = _plan_workspace_limit(current_user.plan_tier.value)
    existing_count = await db.scalar(
        select(func.count())
        .select_from(WorkspaceMember)
        .join(Workspace, Workspace.id == WorkspaceMember.workspace_id)
        .where(WorkspaceMember.user_id == current_user.id, Workspace.creator_id == current_user.id)
    )
    if (existing_count or 0) >= limit:
        raise HTTPException(
            status_code=403,
            detail={
                "error": "plan_required",
                "message": f"Your plan allows {limit} workspace(s). Upgrade to create more.",
                "current": current_user.plan_tier.value,
            },
        )

    ws = Workspace(name=body.name, creator_id=current_user.id)
    db.add(ws)
    await db.flush()

    # Creator is automatically an admin member
    member = WorkspaceMember(workspace_id=ws.id, user_id=current_user.id, is_admin=True)
    db.add(member)
    await db.flush()

    return await _workspace_out(ws, db)


@router.get("", response_model=List[WorkspaceOut])
async def list_workspaces(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Workspace)
        .join(WorkspaceMember, WorkspaceMember.workspace_id == Workspace.id)
        .where(WorkspaceMember.user_id == current_user.id)
        .order_by(Workspace.created_at.desc())
    )
    workspaces = result.scalars().all()
    return [await _workspace_out(ws, db) for ws in workspaces]


@router.patch("/{workspace_id}", response_model=WorkspaceOut)
async def update_workspace(
    workspace_id: UUID,
    body: WorkspaceUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ws = await _get_workspace_admin(workspace_id, current_user.id, db)
    if body.name:
        ws.name = body.name.strip()
    await db.flush()
    return await _workspace_out(ws, db)


@router.post("/{workspace_id}/regenerate-code", response_model=WorkspaceOut)
async def regenerate_join_code(
    workspace_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ws = await _get_workspace_admin(workspace_id, current_user.id, db)
    # Ensure new code is unique
    while True:
        new_code = generate_join_code()
        existing = await db.scalar(select(Workspace).where(Workspace.join_code == new_code))
        if not existing:
            break
    ws.join_code = new_code
    await db.flush()
    return await _workspace_out(ws, db)


@router.post("/join", response_model=WorkspaceOut, status_code=200)
async def join_workspace(
    body: JoinWorkspace,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ws = await db.scalar(select(Workspace).where(Workspace.join_code == body.join_code))
    if not ws:
        raise HTTPException(status_code=404, detail="Invalid join code. Check the code and try again.")

    # Already a member?
    existing = await db.scalar(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == ws.id,
            WorkspaceMember.user_id == current_user.id,
        )
    )
    if existing:
        raise HTTPException(status_code=409, detail="You are already a member of this workspace.")

    member = WorkspaceMember(workspace_id=ws.id, user_id=current_user.id, is_admin=False)
    db.add(member)
    await db.flush()

    # Notify workspace creator
    if ws.creator_id and ws.creator_id != current_user.id:
        await create_notification(
            db=db,
            user_id=ws.creator_id,
            notif_type="MEMBER_JOINED",
            title="New member joined",
            body=f"{current_user.name} joined workspace '{ws.name}'.",
            action_url=f"/workspaces",
        )

    return await _workspace_out(ws, db)


@router.get("/{workspace_id}/members", response_model=List[WorkspaceMemberOut])
async def list_workspace_members(
    workspace_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _assert_workspace_member(workspace_id, current_user.id, db)
    result = await db.execute(
        select(WorkspaceMember, User)
        .join(User, User.id == WorkspaceMember.user_id)
        .where(WorkspaceMember.workspace_id == workspace_id)
        .order_by(WorkspaceMember.joined_at)
    )
    rows = result.all()
    return [
        WorkspaceMemberOut(
            id=wm.id,
            user_id=wm.user_id,
            name=u.name,
            email=u.email,
            display_id=u.display_id,
            avatar_url=u.avatar_url,
            is_admin=wm.is_admin,
            joined_at=wm.joined_at,
            last_active_at=wm.last_active_at,
        )
        for wm, u in rows
    ]


@router.delete("/{workspace_id}/members/{member_id}", status_code=204)
async def remove_workspace_member(
    workspace_id: UUID,
    member_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_workspace_admin(workspace_id, current_user.id, db)
    wm = await db.scalar(
        select(WorkspaceMember).where(
            WorkspaceMember.id == member_id,
            WorkspaceMember.workspace_id == workspace_id,
        )
    )
    if not wm:
        raise HTTPException(status_code=404, detail="Member not found")
    await db.delete(wm)
    await db.flush()


@router.delete("/{workspace_id}", status_code=204)
async def delete_workspace(
    workspace_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ws = await _get_workspace_admin(workspace_id, current_user.id, db)
    if ws.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the workspace creator can delete it.")
    await db.delete(ws)
    await db.flush()


# ─── Helpers ───────────────────────────────────────────────────────────────

async def _assert_workspace_member(workspace_id: UUID, user_id: UUID, db: AsyncSession):
    wm = await db.scalar(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user_id,
        )
    )
    if not wm:
        raise HTTPException(status_code=403, detail="Not a member of this workspace.")
    return wm


async def _get_workspace_admin(workspace_id: UUID, user_id: UUID, db: AsyncSession) -> Workspace:
    ws = await db.scalar(select(Workspace).where(Workspace.id == workspace_id))
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found.")
    wm = await db.scalar(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user_id,
        )
    )
    if not wm or not wm.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required.")
    return ws
