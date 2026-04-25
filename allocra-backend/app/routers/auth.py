"""
Auth router.

Clerk handles the actual sign-in (Google OAuth, OTP). Our backend only needs:
  GET  /auth/me              → returns current user (creates if first login)
  PATCH /auth/me             → update profile name / avatar
  PATCH /auth/onboarding     → update onboarding step/complete
  PATCH /auth/notifications  → toggle email / in-app notifications
  DELETE /auth/me            → delete account (requires confirmation)
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.auth import get_current_user
from app.models import User
from app.schemas import UserOut, OnboardingUpdate, ProfileUpdate, NotificationPreferencesUpdate

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    """Returns the authenticated user. Creates the user row on first call."""
    return current_user


@router.patch("/me", response_model=UserOut)
async def update_profile(
    body: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.name is not None:
        current_user.name = body.name.strip()
    if body.avatar_url is not None:
        current_user.avatar_url = body.avatar_url
    await db.flush()
    return current_user


@router.patch("/onboarding", response_model=UserOut)
async def update_onboarding(
    body: OnboardingUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.step > current_user.onboarding_step:
        current_user.onboarding_step = body.step
    if body.complete is not None:
        current_user.onboarding_complete = body.complete
    await db.flush()
    return current_user


@router.patch("/notifications", response_model=UserOut)
async def update_notification_prefs(
    body: NotificationPreferencesUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.email_notifications is not None:
        current_user.email_notifications = body.email_notifications
    if body.in_app_notifications is not None:
        current_user.in_app_notifications = body.in_app_notifications
    await db.flush()
    return current_user


@router.delete("/me", status_code=204)
async def delete_account(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await db.delete(current_user)
    await db.flush()
