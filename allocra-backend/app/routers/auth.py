"""
Auth router — hardened.

/auth/me MUST NEVER return 500 under any condition.
We build the response manually from scalar fields only —
no ORM relationships are accessed, so no lazy-load 500s.
"""
import logging
import traceback
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.auth import get_current_user
from app.models import User
from app.schemas import OnboardingUpdate, ProfileUpdate, NotificationPreferencesUpdate

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])


def _safe_user_dict(user: User) -> dict:
    """
    Build response from scalar columns ONLY.
    Never access relationship attributes — lazy loading in async SQLAlchemy
    raises MissingGreenlet which causes 500.
    """
    try:
        plan = user.plan_tier.value if user.plan_tier else "FREE"
    except Exception:
        plan = "FREE"

    return {
        "id": str(user.id),
        "email": user.email or "",
        "name": user.name or "",
        "display_id": user.display_id or "",
        "avatar_url": user.avatar_url,
        "plan_tier": plan,
        "email_notifications": bool(user.email_notifications),
        "in_app_notifications": bool(user.in_app_notifications),
        "onboarding_step": int(user.onboarding_step or 0),
        "onboarding_complete": bool(user.onboarding_complete),
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


@router.get("/me")
async def get_me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Hardened: catches all exceptions, returns partial user on any failure.
    Frontend will never see a 500 from this endpoint.
    """
    try:
        logger.info(
            "GET /auth/me user_id=%s email=%s plan=%s onboarding=%s",
            current_user.id,
            current_user.email,
            current_user.plan_tier,
            current_user.onboarding_complete,
        )
        return JSONResponse(content=_safe_user_dict(current_user))

    except Exception:
        logger.error("GET /auth/me failed:\n%s", traceback.format_exc())
        try:
            return JSONResponse(content={
                "id": str(current_user.id),
                "email": getattr(current_user, "email", "") or "",
                "name": getattr(current_user, "name", "") or "",
                "display_id": getattr(current_user, "display_id", "") or "",
                "avatar_url": None,
                "plan_tier": "FREE",
                "email_notifications": True,
                "in_app_notifications": True,
                "onboarding_step": 0,
                "onboarding_complete": False,
                "created_at": None,
            })
        except Exception:
            return JSONResponse(
                status_code=503,
                content={"detail": "User service temporarily unavailable. Please retry."}
            )


@router.patch("/me")
async def update_profile(
    body: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        if body.name is not None:
            current_user.name = body.name.strip()
        if body.avatar_url is not None:
            current_user.avatar_url = body.avatar_url
        await db.flush()
        return JSONResponse(content=_safe_user_dict(current_user))
    except Exception:
        logger.error("PATCH /auth/me failed:\n%s", traceback.format_exc())
        raise HTTPException(status_code=500, detail="Failed to update profile.")


@router.patch("/onboarding")
async def update_onboarding(
    body: OnboardingUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        if body.step > (current_user.onboarding_step or 0):
            current_user.onboarding_step = body.step
        if body.complete is not None:
            current_user.onboarding_complete = body.complete
        await db.flush()
        return JSONResponse(content=_safe_user_dict(current_user))
    except Exception:
        logger.error("PATCH /auth/onboarding failed:\n%s", traceback.format_exc())
        raise HTTPException(status_code=500, detail="Failed to update onboarding.")


@router.patch("/notifications")
async def update_notification_prefs(
    body: NotificationPreferencesUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        if body.email_notifications is not None:
            current_user.email_notifications = body.email_notifications
        if body.in_app_notifications is not None:
            current_user.in_app_notifications = body.in_app_notifications
        await db.flush()
        return JSONResponse(content=_safe_user_dict(current_user))
    except Exception:
        logger.error("PATCH /auth/notifications failed:\n%s", traceback.format_exc())
        raise HTTPException(status_code=500, detail="Failed to update notification preferences.")


@router.delete("/me", status_code=204)
async def delete_account(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        await db.delete(current_user)
        await db.flush()
    except Exception:
        logger.error("DELETE /auth/me failed:\n%s", traceback.format_exc())
        raise HTTPException(status_code=500, detail="Failed to delete account.")