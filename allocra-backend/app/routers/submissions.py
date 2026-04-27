"""
Task Submission & Review Router — hardened (no lazy loads).

All relationship data is fetched explicitly via scalar queries.
No ORM relationship attributes are accessed after insert/update.
"""
from __future__ import annotations

import logging
import traceback
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from uuid import UUID

from app.database import get_db
from app.auth import get_current_user
from app.models import (
    User, Task, TaskStatus, TaskSubmission, TaskReview,
    ReviewDecision, ProjectMember, Project, Workspace, WorkspaceMember
)
from app.schemas import TaskSubmitRequest, TaskReviewRequest
from app.routers._helpers import log_activity, create_notification

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/tasks", tags=["submissions"])


# ═════════════════════════════════════════════════════════════════════════════
# RESPONSE BUILDER — no ORM relationships touched, all data fetched explicitly
# ═════════════════════════════════════════════════════════════════════════════

async def _build_submission_dict(submission: TaskSubmission, db: AsyncSession) -> dict:
    """
    Build submission response as a plain dict using only scalar queries.
    Never accesses .submitter, .review, or any ORM relationship attribute.
    """
    # Fetch submitter name
    submitter_name = "Unknown"
    try:
        submitter = await db.scalar(
            select(User).where(User.id == submission.submitted_by)
        )
        if submitter:
            submitter_name = submitter.name or submitter.email or "Unknown"
    except Exception as exc:
        logger.error("Failed to fetch submitter for submission %s: %s", submission.id, exc)

    # Fetch review (if any)
    review_dict = None
    try:
        review = await db.scalar(
            select(TaskReview).where(TaskReview.submission_id == submission.id)
        )
        if review:
            reviewer_name = None
            if review.reviewed_by:
                reviewer = await db.scalar(
                    select(User).where(User.id == review.reviewed_by)
                )
                if reviewer:
                    reviewer_name = reviewer.name or reviewer.email
            review_dict = {
                "id": str(review.id),
                "submission_id": str(review.submission_id),
                "reviewed_by": str(review.reviewed_by) if review.reviewed_by else None,
                "reviewer_name": reviewer_name,
                "decision": review.decision.value,
                "rating": review.rating,
                "feedback": review.feedback,
                "created_at": review.created_at.isoformat(),
            }
    except Exception as exc:
        logger.error("Failed to fetch review for submission %s: %s", submission.id, exc)

    return {
        "id": str(submission.id),
        "task_id": str(submission.task_id),
        "submitted_by": str(submission.submitted_by),
        "submitter_name": submitter_name,
        "description": submission.description,
        "links": submission.links or [],
        "files": submission.files or [],
        "created_at": submission.created_at.isoformat(),
        "review": review_dict,
    }


# ═════════════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ═════════════════════════════════════════════════════════════════════════════

@router.post("/{task_id}/submit", status_code=201)
async def submit_task(
    task_id: UUID,
    body: TaskSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        task = await _get_task(task_id, db)

        if task.assigned_to != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="Only the assigned member can submit work for this task."
            )

        allowed_statuses = (
            TaskStatus.ASSIGNED,
            TaskStatus.IN_PROGRESS,
            TaskStatus.REJECTED,
        )
        if task.status not in allowed_statuses:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot submit a task with status '{task.status.value}'. "
                       f"Task must be ASSIGNED, IN_PROGRESS, or REJECTED."
            )

        submission = TaskSubmission(
            task_id=task.id,
            submitted_by=current_user.id,
            description=body.description,
            links=body.links or [],
            files=body.files or [],
        )
        db.add(submission)
        task.status = TaskStatus.SUBMITTED
        await db.flush()

        # Fire notifications — failures must not crash the endpoint
        try:
            await _notify_owner_of_submission(db, task, current_user)
        except Exception as exc:
            logger.error("Submission notification failed: %s", exc)

        try:
            await log_activity(
                db, task.project_id, "TASK_SUBMITTED", current_user.id,
                f"'{task.title}' submitted for review"
            )
        except Exception as exc:
            logger.error("Activity log failed: %s", exc)

        result = await _build_submission_dict(submission, db)
        return JSONResponse(content=result, status_code=201)

    except HTTPException:
        raise
    except Exception:
        logger.error("submit_task 500:\n%s", traceback.format_exc())
        raise HTTPException(status_code=500, detail="Failed to submit task. Check server logs.")


@router.get("/{task_id}/submissions")
async def get_submissions(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        task = await _get_task(task_id, db)
        await _assert_project_member(task.project_id, current_user.id, db)

        result = await db.execute(
            select(TaskSubmission)
            .where(TaskSubmission.task_id == task_id)
            .order_by(TaskSubmission.created_at.desc())
        )
        submissions = result.scalars().all()

        out = []
        for s in submissions:
            out.append(await _build_submission_dict(s, db))

        return JSONResponse(content=out)

    except HTTPException:
        raise
    except Exception:
        logger.error("get_submissions 500:\n%s", traceback.format_exc())
        raise HTTPException(status_code=500, detail="Failed to fetch submissions.")


@router.post("/{task_id}/review")
async def review_task(
    task_id: UUID,
    body: TaskReviewRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        task = await _get_task(task_id, db)
        await _assert_review_permission(task.project_id, current_user.id, db)

        if task.status != TaskStatus.SUBMITTED:
            raise HTTPException(
                status_code=400,
                detail=f"Task is not in SUBMITTED state — current: '{task.status.value}'."
            )

        # Get latest submission
        latest = await db.scalar(
            select(TaskSubmission)
            .where(TaskSubmission.task_id == task_id)
            .order_by(TaskSubmission.created_at.desc())
            .limit(1)
        )
        if not latest:
            raise HTTPException(status_code=404, detail="No submission found for this task.")

        # Prevent double-review
        existing = await db.scalar(
            select(TaskReview).where(TaskReview.submission_id == latest.id)
        )
        if existing:
            raise HTTPException(status_code=409, detail="This submission has already been reviewed.")

        review = TaskReview(
            submission_id=latest.id,
            reviewed_by=current_user.id,
            decision=body.decision,
            rating=body.rating,
            feedback=body.feedback,
        )
        db.add(review)

        if body.decision == ReviewDecision.APPROVED:
            task.status = TaskStatus.COMPLETED
            notif_title = "Task Approved ✅"
            notif_body = f"Your submission for '{task.title}' was approved."
            event = "TASK_APPROVED"
        else:
            task.status = TaskStatus.IN_PROGRESS
            notif_title = "Submission Needs Changes 🔄"
            notif_body = (
                f"Your submission for '{task.title}' needs revision. "
                f"Feedback: {body.feedback or 'See task details.'}"
            )
            event = "TASK_REJECTED"

        await db.flush()

        # Notify assigned member
        if task.assigned_to:
            try:
                await create_notification(
                    db=db,
                    user_id=task.assigned_to,
                    notif_type="TASK_ASSIGNED",
                    title=notif_title,
                    body=notif_body,
                    action_url=f"/projects/{task.project_id}/tasks",
                )
            except Exception as exc:
                logger.error("Review notification failed: %s", exc)

        try:
            await log_activity(
                db, task.project_id, event, current_user.id,
                f"'{task.title}' — {body.decision.value}"
            )
        except Exception as exc:
            logger.error("Activity log failed: %s", exc)

        result = await _build_submission_dict(latest, db)
        return JSONResponse(content=result)

    except HTTPException:
        raise
    except Exception:
        logger.error("review_task 500:\n%s", traceback.format_exc())
        raise HTTPException(status_code=500, detail="Failed to process review.")


# ═════════════════════════════════════════════════════════════════════════════
# HELPERS
# ═════════════════════════════════════════════════════════════════════════════

async def _get_task(task_id: UUID, db: AsyncSession) -> Task:
    task = await db.scalar(select(Task).where(Task.id == task_id))
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")
    return task


async def _assert_project_member(project_id: UUID, user_id: UUID, db: AsyncSession):
    pm = await db.scalar(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id,
        )
    )
    if not pm:
        raise HTTPException(status_code=403, detail="Not a member of this project.")


async def _assert_review_permission(project_id: UUID, user_id: UUID, db: AsyncSession):
    """Only workspace admins or workspace creator can review submissions."""
    project = await db.scalar(select(Project).where(Project.id == project_id))
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    # Workspace admin?
    ws_member = await db.scalar(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == project.workspace_id,
            WorkspaceMember.user_id == user_id,
            WorkspaceMember.is_admin == True,
        )
    )
    if ws_member:
        return

    # Workspace creator?
    workspace = await db.scalar(
        select(Workspace).where(Workspace.id == project.workspace_id)
    )
    if workspace and workspace.creator_id == user_id:
        return

    raise HTTPException(
        status_code=403,
        detail="Only workspace admins or the workspace creator can review submissions."
    )


async def _notify_owner_of_submission(db: AsyncSession, task: Task, submitter: User):
    """Notify all workspace admins when a task is submitted."""
    project = await db.scalar(select(Project).where(Project.id == task.project_id))
    if not project:
        return

    result = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == project.workspace_id,
            WorkspaceMember.is_admin == True,
        )
    )
    admins = result.scalars().all()
    for admin in admins:
        if admin.user_id != submitter.id:
            try:
                await create_notification(
                    db=db,
                    user_id=admin.user_id,
                    notif_type="TASK_ASSIGNED",
                    title="Submission Ready for Review 📋",
                    body=f"{submitter.name} submitted work for '{task.title}'.",
                    action_url=f"/projects/{task.project_id}/tasks",
                )
            except Exception as exc:
                logger.error("Admin notification failed for %s: %s", admin.user_id, exc)

                