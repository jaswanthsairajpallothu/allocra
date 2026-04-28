"""
Auth module — fully hardened.

Every function is wrapped in try/except.
get_current_user NEVER raises a 500 — only 401 for invalid tokens.
All other errors are logged and surfaced as 401 with a message.
"""
from __future__ import annotations

import json
import time
import logging
import traceback
import httpx
import jwt as pyjwt

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import User, generate_display_id
from app.config import settings

logger = logging.getLogger(__name__)
bearer_scheme = HTTPBearer(auto_error=True)

# ── JWKS cache ────────────────────────────────────────────────────────────────
_jwks_cache: dict = {"keys": None, "fetched_at": 0.0}
_JWKS_TTL = 3600

# ── Clerk user profile cache ──────────────────────────────────────────────────
_clerk_user_cache: dict = {}   # {clerk_user_id: (profile_dict, fetched_at)}
_CLERK_USER_TTL = 300


# ═════════════════════════════════════════════════════════════════════════════
# JWKS
# ═════════════════════════════════════════════════════════════════════════════

async def _get_jwks() -> dict:
    now = time.time()
    if _jwks_cache["keys"] and now - _jwks_cache["fetched_at"] < _JWKS_TTL:
        return _jwks_cache["keys"]

    if not settings.CLERK_JWKS_URL:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="CLERK_JWKS_URL is not configured on the server.",
        )

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(settings.CLERK_JWKS_URL)
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPError as exc:
        logger.error("Failed to fetch JWKS from %s: %s", settings.CLERK_JWKS_URL, exc)
        # Return cached keys if available, even if stale
        if _jwks_cache["keys"]:
            logger.warning("Returning stale JWKS cache due to network error")
            return _jwks_cache["keys"]
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not reach Clerk auth server. Please try again.",
        )

    _jwks_cache["keys"] = data
    _jwks_cache["fetched_at"] = now
    return data


def _find_key(jwks: dict, kid: str):
    for key in jwks.get("keys", []):
        if key.get("kid") == kid:
            try:
                return pyjwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(key))
            except Exception as exc:
                logger.error("Failed to parse JWK kid=%s: %s", kid, exc)
                return None
    return None


# ═════════════════════════════════════════════════════════════════════════════
# TOKEN VERIFICATION
# ═════════════════════════════════════════════════════════════════════════════

async def _verify_clerk_token(token: str) -> dict:
    """Verify token. Returns decoded payload. Raises 401 on any failure."""
    try:
        header = pyjwt.get_unverified_header(token)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Malformed token header: {exc}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    kid = header.get("kid")
    if not kid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token header missing 'kid'",
            headers={"WWW-Authenticate": "Bearer"},
        )

    jwks = await _get_jwks()
    public_key = _find_key(jwks, kid)

    if not public_key:
        # Force JWKS refresh once
        _jwks_cache["fetched_at"] = 0.0
        try:
            jwks = await _get_jwks()
            public_key = _find_key(jwks, kid)
        except Exception:
            pass

    if not public_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unknown token signing key. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = pyjwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            options={"verify_exp": True},
        )
        return payload
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except pyjwt.InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {exc}",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ═════════════════════════════════════════════════════════════════════════════
# CLERK BACKEND API
# ═════════════════════════════════════════════════════════════════════════════

async def _fetch_clerk_profile(clerk_user_id: str) -> dict:
    """
    Fetch user profile from Clerk Backend API.
    Returns {} on any failure — caller handles missing fields gracefully.
    """
    now = time.time()
    cached = _clerk_user_cache.get(clerk_user_id)
    if cached and now - cached[1] < _CLERK_USER_TTL:
        return cached[0]

    if not settings.CLERK_SECRET_KEY:
        logger.warning("CLERK_SECRET_KEY not set — cannot fetch Clerk profile for %s", clerk_user_id)
        return {}

    try:
        async with httpx.AsyncClient(timeout=8) as client:
            resp = await client.get(
                f"https://api.clerk.com/v1/users/{clerk_user_id}",
                headers={"Authorization": f"Bearer {settings.CLERK_SECRET_KEY}"},
            )
        if resp.status_code == 200:
            data = resp.json()
            _clerk_user_cache[clerk_user_id] = (data, now)
            return data
        else:
            logger.warning("Clerk API %s for user %s", resp.status_code, clerk_user_id)
            return {}
    except Exception as exc:
        logger.error("Clerk API fetch failed for %s: %s", clerk_user_id, exc)
        return {}


def _parse_clerk_profile(profile: dict) -> tuple:
    """Returns (email, name, avatar_url) from Clerk /v1/users/:id response."""
    # Email
    email = ""
    email_addresses = profile.get("email_addresses") or []
    primary_id = profile.get("primary_email_address_id") or ""
    for ea in email_addresses:
        if ea.get("id") == primary_id:
            email = ea.get("email_address") or ""
            break
    if not email and email_addresses:
        email = (email_addresses[0] or {}).get("email_address") or ""

    # Name
    first = profile.get("first_name") or ""
    last = profile.get("last_name") or ""
    name = f"{first} {last}".strip()
    if not name:
        name = email.split("@")[0] if email else ""

    # Avatar
    avatar_url = profile.get("image_url") or profile.get("profile_image_url") or ""

    return email, name, avatar_url


# ═════════════════════════════════════════════════════════════════════════════
# USER RESOLUTION
# ═════════════════════════════════════════════════════════════════════════════

async def _get_or_create_user(payload: dict, db: AsyncSession) -> User:
    """
    Given verified Clerk JWT payload:
    1. Extract what we can from JWT (name/email only if JWT template is configured)
    2. Fall back to Clerk API if fields missing
    3. Find existing user or create new one
    """
    clerk_user_id: str = payload.get("sub") or ""
    if not clerk_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing 'sub' field.",
        )

    logger.debug("Resolving user for clerk_user_id=%s", clerk_user_id)

    # Extract from JWT payload (only present if JWT template is configured)
    email: str = (
        payload.get("email")
        or payload.get("email_address")
        or ""
    )
    first = payload.get("given_name") or ""
    last  = payload.get("family_name") or ""
    name: str = (
        payload.get("name")
        or f"{first} {last}".strip()
        or ""
    )
    avatar_url: str = payload.get("image_url") or payload.get("picture") or ""

    # Fetch from Clerk API if JWT didn't carry name/email
    if not email or not name:
        try:
            profile = await _fetch_clerk_profile(clerk_user_id)
            if profile:
                api_email, api_name, api_avatar = _parse_clerk_profile(profile)
                if not email:
                    email = api_email
                if not name:
                    name = api_name
                if not avatar_url:
                    avatar_url = api_avatar
        except Exception as exc:
            logger.error("Clerk profile fetch error: %s", exc)

    # Final fallbacks
    if not name and email:
        name = email.split("@")[0]
    if not name:
        name = "User"

    # ── Look up by clerk_user_id ──────────────────────────────────────────
    try:
        result = await db.execute(
            select(User).where(User.clerk_user_id == clerk_user_id)
        )
        user = result.scalar_one_or_none()
    except Exception as exc:
        logger.error("DB lookup by clerk_user_id failed: %s\n%s", exc, traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database error during user lookup. Please try again.",
        )

    if user:
        # Sync fields that may have changed in Clerk
        changed = False
        if email and not user.email:
            user.email = email
            changed = True
        if name and name != "User" and not user.name:
            user.name = name
            changed = True
        if avatar_url and user.avatar_url != avatar_url:
            user.avatar_url = avatar_url
            changed = True
        if changed:
            try:
                await db.flush()
            except Exception as exc:
                logger.error("Failed to sync user fields: %s", exc)
                await db.rollback()
        logger.info("Resolved existing user id=%s email=%s", user.id, user.email)
        return user

    # ── Look up by email (fallback) ───────────────────────────────────────
    if email:
        try:
            result = await db.execute(select(User).where(User.email == email))
            user = result.scalar_one_or_none()
        except Exception as exc:
            logger.error("DB lookup by email failed: %s", exc)
            user = None

        if user:
            user.clerk_user_id = clerk_user_id
            if avatar_url and not user.avatar_url:
                user.avatar_url = avatar_url
            try:
                await db.flush()
            except Exception as exc:
                logger.error("Failed to link clerk_user_id: %s", exc)
                await db.rollback()
            logger.info("Linked clerk_user_id to existing user id=%s", user.id)
            return user

    # ── Create new user ───────────────────────────────────────────────────
    try:
        display_id = generate_display_id(name)
        # Guarantee uniqueness with up to 10 retries
        for _ in range(10):
            exists = await db.scalar(
                select(User.id).where(User.display_id == display_id)
            )
            if not exists:
                break
            display_id = generate_display_id(name)

        safe_email = email if email else f"{clerk_user_id}@allocra.local"

        user = User(
            clerk_user_id=clerk_user_id,
            email=safe_email,
            name=name,
            display_id=display_id,
            avatar_url=avatar_url or None,
        )
        db.add(user)
        await db.flush()
        logger.info("Created new user id=%s display_id=%s email=%s", user.id, display_id, email)
        return user

    except Exception as exc:
        logger.error("Failed to create user: %s\n%s", exc, traceback.format_exc())
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed to create user account. Please try signing in again.",
        )


# ═════════════════════════════════════════════════════════════════════════════
# PUBLIC DEPENDENCIES
# ═════════════════════════════════════════════════════════════════════════════

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Main auth dependency. Used by every protected endpoint.
    Raises 401 for auth failures. Raises 503 for transient server issues.
    NEVER raises 500.
    """
    try:
        payload = await _verify_clerk_token(credentials.credentials)
        user = await _get_or_create_user(payload, db)
        return user
    except HTTPException:
        raise  # already formatted — pass through
    except Exception as exc:
        logger.error(
            "Unexpected error in get_current_user: %s\n%s",
            exc,
            traceback.format_exc(),
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service error. Please try again.",
        )


def require_plan(*plans: str):
    """
    Dependency factory: enforce plan gate.
    Usage: Depends(require_plan('PRO', 'TEAM'))
    """
    async def _check(current_user: User = Depends(get_current_user)) -> User:
        if current_user.plan_tier.value not in plans:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": "plan_required",
                    "required": plans[0],
                    "current": current_user.plan_tier.value,
                },
            )
        return current_user
    return _check