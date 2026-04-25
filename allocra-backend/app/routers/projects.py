from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List
from uuid import UUID

from app.database import get_db
from app.auth import get_current_user
from app.models import (
    User, Workspace, WorkspaceMember, Project,
    ProjectMember, Task, LoadStatus
)
from app.schemas import (
    ProjectCreate, ProjectUpdate, ProjectOut,
    AddProjectMember, ProjectMemberOut, MembershipSkillsUpdate,
    MembershipAvailabilityUpdate, TeamLoadOut
)
from app.routers._helpers import log_activity, create_notification

router = APIRouter(prefix="/projects", tags=["projects"])


def _plan_project_limit(plan: str) -> int:
    return {"FREE": 3, "PRO": 6, "TEAM": 12}.get(plan, 3)


async def _project_out(p: Project, db: AsyncSession) -> ProjectOut:
    mc = await db.scalar(select(func.count()).where(ProjectMember.project_id == p.id))
    tc = await db.scalar(select(func.count()).where(Task.project_id == p.id))
    return ProjectOut(
        id=p.id,
        workspace_id=p.workspace_id,
        name=p.name,
        description=p.description,
        is_archived=p.is_archived,
        member_count=mc or 0,
        task_count=tc or 0,
        created_at=p.created_at,
    )


@router.post("", response_model=ProjectOut, status_code=201)
async def create_project(
    body: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Must be workspace member
    wm = await db.scalar(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == body.workspace_id,
            WorkspaceMember.user_id == current_user.id,
        )
    )
    if not wm:
        raise HTTPException(status_code=403, detail="Not a member of this workspace.")

    # Plan project limit
    limit = _plan_project_limit(current_user.plan_tier.value)
    existing = await db.scalar(
        select(func.count()).where(
            Project.workspace_id == body.workspace_id,
            Project.is_archived == False,
        )
    )
    if (existing or 0) >= limit:
        raise HTTPException(
            status_code=403,
            detail={"error": "plan_required", "message": f"Plan limit: {limit} active projects."},
        )

    project = Project(
        workspace_id=body.workspace_id,
        name=body.name,
        description=body.description,
    )
    db.add(project)
    await db.flush()

    # Creator auto-joins as project member
    pm = ProjectMember(project_id=project.id, user_id=current_user.id)
    db.add(pm)
    await db.flush()

    await log_activity(db, project.id, "PROJECT_CREATED", current_user.id, f"Project '{project.name}' created")
    return await _project_out(project, db)


@router.get("", response_model=List[ProjectOut])
async def list_projects(
    workspace_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Must be workspace member
    wm = await db.scalar(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == current_user.id,
        )
    )
    if not wm:
        raise HTTPException(status_code=403, detail="Not a member of this workspace.")

    result = await db.execute(
        select(Project)
        .where(Project.workspace_id == workspace_id, Project.is_archived == False)
        .order_by(Project.created_at.desc())
    )
    projects = result.scalars().all()
    return [await _project_out(p, db) for p in projects]


@router.patch("/{project_id}", response_model=ProjectOut)
async def update_project(
    project_id: UUID,
    body: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await _get_project_member(project_id, current_user.id, db)
    if body.name is not None:
        project.name = body.name.strip()
    if body.description is not None:
        project.description = body.description
    await db.flush()
    return await _project_out(project, db)


@router.post("/{project_id}/archive", response_model=ProjectOut)
async def archive_project(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await _get_project_member(project_id, current_user.id, db)
    project.is_archived = True
    await db.flush()
    return await _project_out(project, db)


@router.delete("/{project_id}", status_code=204)
async def delete_project(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await _get_project_member(project_id, current_user.id, db)
    await db.delete(project)
    await db.flush()


# ─── PROJECT MEMBERSHIP ─────────────────────────────────────────────────────

@router.post("/{project_id}/members", response_model=ProjectMemberOut, status_code=201)
async def add_project_member(
    project_id: UUID,
    body: AddProjectMember,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await _get_project_member(project_id, current_user.id, db)

    # Plan member limit
    member_limit = {"FREE": 10, "PRO": 20, "TEAM": 20}.get(current_user.plan_tier.value, 10)
    current_count = await db.scalar(
        select(func.count()).where(ProjectMember.project_id == project_id)
    )
    if (current_count or 0) >= member_limit:
        raise HTTPException(status_code=403, detail={"error": "plan_required", "message": f"Plan limit: {member_limit} members."})

    # Find user by display_id
    target_user = await db.scalar(select(User).where(User.display_id == body.display_id))
    if not target_user:
        raise HTTPException(status_code=404, detail=f"No user found with Display ID '{body.display_id}'.")

    # Must be in same workspace
    ws_member = await db.scalar(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == project.workspace_id,
            WorkspaceMember.user_id == target_user.id,
        )
    )
    if not ws_member:
        raise HTTPException(
            status_code=400,
            detail=f"User '{target_user.name}' is not a member of this workspace. They must join the workspace first.",
        )

    # Already in project?
    existing = await db.scalar(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == target_user.id,
        )
    )
    if existing:
        raise HTTPException(status_code=409, detail="User is already a member of this project.")

    pm = ProjectMember(project_id=project_id, user_id=target_user.id)
    db.add(pm)
    await db.flush()

    await log_activity(db, project_id, "MEMBER_JOINED", target_user.id, f"{target_user.name} added to project")
    await create_notification(
        db, target_user.id, "MEMBER_JOINED",
        "Added to project",
        f"You were added to project '{project.name}'.",
        action_url=f"/projects/{project_id}",
    )

    return _pm_out(pm, target_user)


@router.delete("/{project_id}/members/{membership_id}", status_code=204)
async def remove_project_member(
    project_id: UUID,
    membership_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_project_member(project_id, current_user.id, db)
    pm = await db.scalar(
        select(ProjectMember).where(
            ProjectMember.id == membership_id,
            ProjectMember.project_id == project_id,
        )
    )
    if not pm:
        raise HTTPException(status_code=404, detail="Membership not found.")
    await db.delete(pm)
    await db.flush()


@router.get("/{project_id}/members", response_model=List[ProjectMemberOut])
async def list_project_members(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_project_member(project_id, current_user.id, db)
    result = await db.execute(
        select(ProjectMember, User)
        .join(User, User.id == ProjectMember.user_id)
        .where(ProjectMember.project_id == project_id)
        .order_by(ProjectMember.joined_at)
    )
    rows = result.all()
    return [_pm_out(pm, u) for pm, u in rows]


@router.patch("/{project_id}/members/me/skills", response_model=ProjectMemberOut)
async def update_my_skills(
    project_id: UUID,
    body: MembershipSkillsUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    pm = await _get_my_membership(project_id, current_user.id, db)
    pm.skills = [s.model_dump() for s in body.skills]
    await db.flush()
    return _pm_out(pm, current_user)


@router.patch("/{project_id}/members/me/availability", response_model=ProjectMemberOut)
async def update_my_availability(
    project_id: UUID,
    body: MembershipAvailabilityUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    pm = await _get_my_membership(project_id, current_user.id, db)
    pm.available_hours = body.available_hours
    await db.flush()
    return _pm_out(pm, current_user)


@router.get("/{project_id}/team-load", response_model=TeamLoadOut)
async def get_team_load(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_project_member(project_id, current_user.id, db)
    result = await db.execute(
        select(ProjectMember, User)
        .join(User, User.id == ProjectMember.user_id)
        .where(ProjectMember.project_id == project_id)
    )
    rows = result.all()
    return TeamLoadOut(members=[_pm_out(pm, u) for pm, u in rows])


@router.get("/{project_id}/activity", response_model=List[dict])
async def get_project_activity(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.models import ActivityLog
    await _get_project_member(project_id, current_user.id, db)
    result = await db.execute(
        select(ActivityLog, User)
        .outerjoin(User, User.id == ActivityLog.actor_id)
        .where(ActivityLog.project_id == project_id)
        .order_by(ActivityLog.created_at.desc())
        .limit(100)
    )
    return [
        {
            "id": str(log.id),
            "event": log.event,
            "detail": log.detail,
            "actor_name": u.name if u else None,
            "created_at": log.created_at.isoformat(),
        }
        for log, u in result.all()
    ]


# ─── Private Helpers ────────────────────────────────────────────────────────

async def _get_project_member(project_id: UUID, user_id: UUID, db: AsyncSession) -> Project:
    project = await db.scalar(select(Project).where(Project.id == project_id))
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    pm = await db.scalar(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id,
        )
    )
    if not pm:
        raise HTTPException(status_code=403, detail="Not a member of this project.")
    return project


async def _get_my_membership(project_id: UUID, user_id: UUID, db: AsyncSession) -> ProjectMember:
    pm = await db.scalar(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id,
        )
    )
    if not pm:
        raise HTTPException(status_code=404, detail="You are not a member of this project.")
    return pm


def _pm_out(pm: ProjectMember, user: User) -> ProjectMemberOut:
    from app.schemas import SkillEntry
    return ProjectMemberOut(
        id=pm.id,
        user_id=pm.user_id,
        name=user.name,
        email=user.email,
        display_id=user.display_id,
        avatar_url=user.avatar_url,
        skills=[SkillEntry(**s) for s in (pm.skills or [])],
        available_hours=pm.available_hours,
        assigned_hours=pm.assigned_hours,
        load_percent=pm.load_percent,
        load_status=pm.load_status,
        joined_at=pm.joined_at,
    )
