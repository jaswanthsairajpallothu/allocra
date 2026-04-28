"""
Tasks router — hardened. No ORM lazy loads.
assignee_name is fetched via explicit JOIN, not relationship attribute.
All responses built as plain dicts via JSONResponse.
"""
from __future__ import annotations

import logging
import traceback
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from uuid import UUID

from app.database import get_db
from app.auth import get_current_user
from app.models import User, Task, ProjectMember, TaskStatus, TaskPriority
from app.schemas import TaskCreate, TaskUpdate
from app.routers._helpers import log_activity

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/tasks", tags=["tasks"])


def _task_dict(task: Task, assignee_name: Optional[str] = None) -> dict:
    """Build task response as plain dict — no ORM relationship access."""
    return {
        "id": str(task.id),
        "project_id": str(task.project_id),
        "title": task.title,
        "description": task.description,
        "required_skill": task.required_skill,
        "required_level": task.required_level,
        "estimated_hours": task.estimated_hours,
        "priority": task.priority.value if task.priority else "MEDIUM",
        "status": task.status.value if task.status else "PENDING",
        "assigned_to": str(task.assigned_to) if task.assigned_to else None,
        "assignee_name": assignee_name,
        "created_at": task.created_at.isoformat() if task.created_at else None,
        "updated_at": task.updated_at.isoformat() if task.updated_at else None,
    }


async def _fetch_assignee_name(task: Task, db: AsyncSession) -> Optional[str]:
    """Fetch assignee name with a separate scalar query. Safe in async context."""
    if not task.assigned_to:
        return None
    try:
        user = await db.scalar(select(User).where(User.id == task.assigned_to))
        return user.name if user else None
    except Exception as exc:
        logger.error("Failed to fetch assignee name for task %s: %s", task.id, exc)
        return None


@router.post("", status_code=201)
async def create_task(
    body: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
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

        try:
            await log_activity(
                db, body.project_id, "TASK_CREATED", current_user.id,
                f"Task '{task.title}' created"
            )
        except Exception as exc:
            logger.error("Activity log failed: %s", exc)

        return JSONResponse(content=_task_dict(task), status_code=201)

    except HTTPException:
        raise
    except Exception:
        logger.error("create_task 500:\n%s", traceback.format_exc())
        raise HTTPException(status_code=500, detail="Failed to create task.")


@router.get("")
async def list_tasks(
    project_id: UUID,
    status: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        await _assert_project_member(project_id, current_user.id, db)

        q = select(Task).where(Task.project_id == project_id)
        if status:
            try:
                q = q.where(Task.status == TaskStatus(status))
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid status: {status}")

        q = q.order_by(Task.created_at.desc())
        result = await db.execute(q)
        tasks = result.scalars().all()

        # Batch-fetch all assignee names in one query to avoid N+1
        assigned_user_ids = list({t.assigned_to for t in tasks if t.assigned_to})
        assignee_map: dict = {}
        if assigned_user_ids:
            users_result = await db.execute(
                select(User).where(User.id.in_(assigned_user_ids))
            )
            for u in users_result.scalars().all():
                assignee_map[u.id] = u.name

        out = [
            _task_dict(t, assignee_map.get(t.assigned_to) if t.assigned_to else None)
            for t in tasks
        ]
        return JSONResponse(content=out)

    except HTTPException:
        raise
    except Exception:
        logger.error("list_tasks 500:\n%s", traceback.format_exc())
        raise HTTPException(status_code=500, detail="Failed to fetch tasks.")


@router.patch("/{task_id}")
async def update_task(
    task_id: UUID,
    body: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
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
        assignee_name = await _fetch_assignee_name(task, db)
        return JSONResponse(content=_task_dict(task, assignee_name))

    except HTTPException:
        raise
    except Exception:
        logger.error("update_task 500:\n%s", traceback.format_exc())
        raise HTTPException(status_code=500, detail="Failed to update task.")


@router.delete("/{task_id}", status_code=204)
async def delete_task(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        task = await _get_task_with_access(task_id, current_user.id, db)
        await db.delete(task)
        await db.flush()
    except HTTPException:
        raise
    except Exception:
        logger.error("delete_task 500:\n%s", traceback.format_exc())
        raise HTTPException(status_code=500, detail="Failed to delete task.")


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