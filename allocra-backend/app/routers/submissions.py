"""
Task Submission & Review Router — fully hardened.

Rule: extract ALL needed string/scalar values from ORM objects BEFORE
any db.flush() or db.add(). After a flush, ORM object state can be
expired by SQLAlchemy, making ANY attribute access trigger a lazy load
which crashes in async context (MissingGreenlet).

Pattern used everywhere:
  1. Load ORM object
  2. Extract needed values to plain Python variables (str, int, UUID)
  3. Do DB writes (flush)
  4. Use only the plain variables for notifications/logs
  5. Build response from plain dict — never touch ORM attributes again
"""
from __future__ import annotations

import logging
import traceback
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
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
# RESPONSE BUILDER — only plain scalars, no ORM attribute access
# ═════════════════════════════════════════════════════════════════════════════

async def _build_submission_dict(submission_id: UUID, db: AsyncSession) -> dict:
    """
    Build submission response using only scalar queries.
    Takes submission_id (UUID) not the ORM object — avoids any post-flush
    attribute access on an expired object.
    """
    submission = await db.scalar(
        select(TaskSubmission).where(TaskSubmission.id == submission_id)
    )
    if not submission:
        return {}

    # Fetch submitter name via explicit query
    submitter_name = "Unknown"
    try:
        submitter = await db.scalar(
            select(User).where(User.id == submission.submitted_by)
        )
        if submitter:
            submitter_name = str(submitter.name or submitter.email or "Unknown")
    except Exception as exc:
        logger.error("Failed to fetch submitter %s: %s", submission.submitted_by, exc)

    # Fetch review via explicit query
    review_dict = None
    try:
        review = await db.scalar(
            select(TaskReview).where(TaskReview.submission_id == submission_id)
        )
        if review:
            reviewer_name = None
            if review.reviewed_by:
                reviewer = await db.scalar(
                    select(User).where(User.id == review.reviewed_by)
                )
                if reviewer:
                    reviewer_name = str(reviewer.name or reviewer.email or "")

            review_dict = {
                "id": str(review.id),
                "submission_id": str(review.submission_id),
                "reviewed_by": str(review.reviewed_by) if review.reviewed_by else None,
                "reviewer_name": reviewer_name,
                "decision": review.decision.value if review.decision else "",
                "rating": review.rating,
                "feedback": review.feedback,
                "created_at": review.created_at.isoformat() if review.created_at else None,
            }
    except Exception as exc:
        logger.error("Failed to fetch review for submission %s: %s", submission_id, exc)

    return {
        "id": str(submission.id),
        "task_id": str(submission.task_id),
        "submitted_by": str(submission.submitted_by),
        "submitter_name": submitter_name,
        "description": submission.description,
        "links": submission.links or [],
        "files": submission.files or [],
        "created_at": submission.created_at.isoformat() if submission.created_at else None,
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
        # ── 1. Load task ─────────────────────────────────────────────────
        task = await db.scalar(select(Task).where(Task.id == task_id))
        if not task:
            raise HTTPException(status_code=404, detail="Task not found.")

        # ── 2. Extract ALL needed values BEFORE any flush ────────────────
        task_id_str = str(task.id)
        task_title = str(task.title or "")
        task_project_id = task.project_id          # UUID — safe scalar
        task_assigned_to = task.assigned_to        # UUID or None — safe scalar

        # ── 3. Validate permissions ──────────────────────────────────────
        if task_assigned_to != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="Only the assigned member can submit work for this task."
            )

        allowed_statuses = (TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS, TaskStatus.REJECTED)
        if task.status not in allowed_statuses:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot submit a task with status '{task.status.value}'. "
                       f"Must be ASSIGNED, IN_PROGRESS, or REJECTED."
            )

        # ── 4. Extract current user values before flush ──────────────────
        submitter_name = str(current_user.name or current_user.email or "Unknown")
        submitter_id = current_user.id

        # ── 5. DB writes ─────────────────────────────────────────────────
        submission = TaskSubmission(
            task_id=task_id,
            submitted_by=submitter_id,
            description=body.description,
            links=body.links or [],
            files=body.files or [],
        )
        db.add(submission)
        task.status = TaskStatus.SUBMITTED
        await db.flush()

        # submission.id is now available (flush generated it)
        new_submission_id = submission.id

        # ── 6. Notifications — use only plain string values ──────────────
        try:
            await _notify_admins_of_submission(
                db=db,
                workspace_id=task_project_id,  # will be resolved inside
                project_id=task_project_id,
                task_title=task_title,
                submitter_id=submitter_id,
                submitter_name=submitter_name,
            )
        except Exception as exc:
            logger.error("Submission notification failed: %s", exc)

        try:
            await log_activity(
                db, task_project_id, "TASK_SUBMITTED", submitter_id,
                f"'{task_title}' submitted for review"
            )
        except Exception as exc:
            logger.error("Activity log failed: %s", exc)

        # ── 7. Build response using only the submission_id ───────────────
        result = await _build_submission_dict(new_submission_id, db)
        return JSONResponse(content=result, status_code=201)

    except HTTPException:
        raise
    except Exception:
        logger.error("submit_task 500:\n%s", traceback.format_exc())
        raise HTTPException(status_code=500, detail="Failed to submit task.")


@router.get("/{task_id}/submissions")
async def get_submissions(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        task = await db.scalar(select(Task).where(Task.id == task_id))
        if not task:
            raise HTTPException(status_code=404, detail="Task not found.")

        task_project_id = task.project_id  # extract before any other ops

        await _assert_project_member(task_project_id, current_user.id, db)

        result = await db.execute(
            select(TaskSubmission)
            .where(TaskSubmission.task_id == task_id)
            .order_by(TaskSubmission.created_at.desc())
        )
        submission_ids = [s.id for s in result.scalars().all()]

        out = []
        for sid in submission_ids:
            try:
                out.append(await _build_submission_dict(sid, db))
            except Exception as exc:
                logger.error("Failed to build submission dict for %s: %s", sid, exc)

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
        # ── 1. Load task ─────────────────────────────────────────────────
        task = await db.scalar(select(Task).where(Task.id == task_id))
        if not task:
            raise HTTPException(status_code=404, detail="Task not found.")

        # ── 2. Extract scalars BEFORE any flush ──────────────────────────
        task_title = str(task.title or "")
        task_project_id = task.project_id
        task_assigned_to = task.assigned_to   # UUID or None

        # ── 3. Validate ──────────────────────────────────────────────────
        await _assert_review_permission(task_project_id, current_user.id, db)

        if task.status != TaskStatus.SUBMITTED:
            raise HTTPException(
                status_code=400,
                detail=f"Task is not in SUBMITTED state — current: '{task.status.value}'."
            )

        # ── 4. Get latest submission ─────────────────────────────────────
        latest = await db.scalar(
            select(TaskSubmission)
            .where(TaskSubmission.task_id == task_id)
            .order_by(TaskSubmission.created_at.desc())
            .limit(1)
        )
        if not latest:
            raise HTTPException(status_code=404, detail="No submission found for this task.")

        latest_submission_id = latest.id  # extract UUID before flush

        existing_review = await db.scalar(
            select(TaskReview).where(TaskReview.submission_id == latest_submission_id)
        )
        if existing_review:
            raise HTTPException(status_code=409, detail="This submission has already been reviewed.")

        # ── 5. Determine outcome ─────────────────────────────────────────
        reviewer_id = current_user.id
        decision_value = body.decision.value

        if body.decision == ReviewDecision.APPROVED:
            new_task_status = TaskStatus.COMPLETED
            notif_title = "Task Approved ✅"
            notif_body = f"Your submission for '{task_title}' was approved."
            event = "TASK_APPROVED"
        else:
            new_task_status = TaskStatus.IN_PROGRESS
            notif_title = "Submission Needs Changes 🔄"
            notif_body = (
                f"Your submission for '{task_title}' needs revision. "
                f"Feedback: {body.feedback or 'See task details.'}"
            )
            event = "TASK_REJECTED"

        # ── 6. DB writes ─────────────────────────────────────────────────
        review = TaskReview(
            submission_id=latest_submission_id,
            reviewed_by=reviewer_id,
            decision=body.decision,
            rating=body.rating,
            feedback=body.feedback,
        )
        db.add(review)
        task.status = new_task_status
        await db.flush()

        # ── 7. Notifications — plain values only ─────────────────────────
        if task_assigned_to:
            try:
                await create_notification(
                    db=db,
                    user_id=task_assigned_to,
                    notif_type="TASK_ASSIGNED",
                    title=notif_title,
                    body=notif_body,
                    action_url=f"/projects/{task_project_id}/tasks",
                )
            except Exception as exc:
                logger.error("Review notification failed: %s", exc)

        try:
            await log_activity(
                db, task_project_id, event, reviewer_id,
                f"'{task_title}' — {decision_value}"
            )
        except Exception as exc:
            logger.error("Activity log failed: %s", exc)

        # ── 8. Response ───────────────────────────────────────────────────
        result = await _build_submission_dict(latest_submission_id, db)
        return JSONResponse(content=result)

    except HTTPException:
        raise
    except Exception:
        logger.error("review_task 500:\n%s", traceback.format_exc())
        raise HTTPException(status_code=500, detail="Failed to process review.")


# ═════════════════════════════════════════════════════════════════════════════
# HELPERS — accept only UUIDs and plain strings, never ORM objects
# ═════════════════════════════════════════════════════════════════════════════

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
    """Workspace admin or workspace creator only."""
    project = await db.scalar(select(Project).where(Project.id == project_id))
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    workspace_id = project.workspace_id  # extract scalar

    ws_member = await db.scalar(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user_id,
            WorkspaceMember.is_admin == True,
        )
    )
    if ws_member:
        return

    workspace = await db.scalar(
        select(Workspace).where(Workspace.id == workspace_id)
    )
    workspace_creator_id = workspace.creator_id if workspace else None

    if workspace_creator_id and workspace_creator_id == user_id:
        return

    raise HTTPException(
        status_code=403,
        detail="Only workspace admins or the workspace creator can review submissions."
    )


async def _notify_admins_of_submission(
    db: AsyncSession,
    workspace_id: UUID,   # NOTE: this is actually project_id — resolved below
    project_id: UUID,
    task_title: str,      # plain string — NOT an ORM object
    submitter_id: UUID,
    submitter_name: str,  # plain string — NOT an ORM object
):
    """
    Notify workspace admins of a new submission.
    Accepts only UUIDs and plain strings — never ORM objects.
    """
    try:
        project = await db.scalar(select(Project).where(Project.id == project_id))
        if not project:
            return

        actual_workspace_id = project.workspace_id  # extract scalar

        result = await db.execute(
            select(WorkspaceMember).where(
                WorkspaceMember.workspace_id == actual_workspace_id,
                WorkspaceMember.is_admin == True,
            )
        )
        admin_ids = [wm.user_id for wm in result.scalars().all()]

        for admin_id in admin_ids:
            if admin_id == submitter_id:
                continue
            try:
                await create_notification(
                    db=db,
                    user_id=admin_id,
                    notif_type="TASK_ASSIGNED",
                    title="Submission Ready for Review 📋",
                    body=f"{submitter_name} submitted work for '{task_title}'.",
                    action_url=f"/projects/{project_id}/tasks",
                )
            except Exception as exc:
                logger.error("Admin notification failed for %s: %s", admin_id, exc)

    except Exception as exc:
        logger.error("_notify_admins_of_submission failed: %s", exc)