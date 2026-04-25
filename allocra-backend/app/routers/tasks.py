from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from uuid import UUID

from app.database import get_db
from app.auth import get_current_user
from app.models import User, Task, ProjectMember, TaskStatus, Project
from app.schemas import TaskCreate, TaskUpdate, TaskOut
from app.routers._helpers import log_activity

router = APIRouter(prefix="/tasks", tags=["tasks"])


def _task_out(task: Task) -> TaskOut:
    return TaskOut(
        id=task.id,
        project_id=task.project_id,
        title=task.title,
        description=task.description,
        required_skill=task.required_skill,
        required_level=task.required_level,
        estimated_hours=task.estimated_hours,
        priority=task.priority,
        status=task.status,
        assigned_to=task.assigned_to,
        assignee_name=task.assignee.name if task.assignee else None,
        created_at=task.created_at,
        updated_at=task.updated_at,
    )


@router.post("", response_model=TaskOut, status_code=201)
async def create_task(
    body: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _assert_project_member(body.project_id, current_user.id, db)

    task = Task(
        project_id=body.project_id,
        title=body.title,
        description=body.description,
        required_skill=body.required_skill,
        required_level=body.required_level,
        estimated_hours=body.estimated_hours,
        priority=body.priority,
    )
    db.add(task)
    await db.flush()
    await db.refresh(task, ["assignee"])
    await log_activity(db, body.project_id, "TASK_CREATED", current_user.id, f"Task '{task.title}' created")
    return _task_out(task)


@router.get("", response_model=List[TaskOut])
async def list_tasks(
    project_id: UUID,
    status: Optional[TaskStatus] = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _assert_project_member(project_id, current_user.id, db)

    q = select(Task).where(Task.project_id == project_id)
    if status:
        q = q.where(Task.status == status)
    q = q.order_by(Task.created_at.desc())

    result = await db.execute(q)
    tasks = result.scalars().all()
    # Eagerly load assignees
    for task in tasks:
        if task.assigned_to:
            await db.refresh(task, ["assignee"])
    return [_task_out(t) for t in tasks]


@router.patch("/{task_id}", response_model=TaskOut)
async def update_task(
    task_id: UUID,
    body: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    task = await _get_task_with_access(task_id, current_user.id, db)

    if body.title is not None:
        task.title = body.title
    if body.description is not None:
        task.description = body.description
    if body.required_skill is not None:
        task.required_skill = body.required_skill
    if body.required_level is not None:
        task.required_level = body.required_level
    if body.estimated_hours is not None:
        task.estimated_hours = body.estimated_hours
    if body.priority is not None:
        task.priority = body.priority
    if body.status is not None:
        task.status = body.status

    await db.flush()
    await db.refresh(task, ["assignee"])
    return _task_out(task)


@router.delete("/{task_id}", status_code=204)
async def delete_task(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    task = await _get_task_with_access(task_id, current_user.id, db)
    await db.delete(task)
    await db.flush()


# ─── Helpers ────────────────────────────────────────────────────────────────

async def _assert_project_member(project_id: UUID, user_id: UUID, db: AsyncSession):
    pm = await db.scalar(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id,
        )
    )
    if not pm:
        raise HTTPException(status_code=403, detail="Not a member of this project.")


async def _get_task_with_access(task_id: UUID, user_id: UUID, db: AsyncSession) -> Task:
    task = await db.scalar(select(Task).where(Task.id == task_id))
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")
    await _assert_project_member(task.project_id, user_id, db)
    return task
