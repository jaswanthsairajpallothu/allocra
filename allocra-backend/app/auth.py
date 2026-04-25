"""
Auth module — Clerk-based.

Clerk issues JWTs signed with RS256. We fetch the JWKS from Clerk's endpoint,
cache it, and verify every incoming Bearer token. No passwords stored.

Flow:
  Frontend (Clerk SDK) → user signs in via Google or OTP → Clerk issues session token
  Frontend sends: Authorization: Bearer <clerk_session_jwt>
  Backend verifies JWT, extracts clerk_user_id, looks up or creates User row.
"""

import json
import time
import httpx
import jwt as pyjwt
from functools import lru_cache
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import User, generate_display_id
from app.config import settings

bearer_scheme = HTTPBearer(auto_error=True)

# Simple in-memory JWKS cache (TTL = 1 hour)
_jwks_cache: dict = {"keys": None, "fetched_at": 0}
_JWKS_TTL = 3600


async def _get_jwks() -> dict:
    now = time.time()
    if _jwks_cache["keys"] and now - _jwks_cache["fetched_at"] < _JWKS_TTL:
        return _jwks_cache["keys"]

    async with httpx.AsyncClient() as client:
        resp = await client.get(settings.CLERK_JWKS_URL, timeout=10)
        resp.raise_for_status()
        data = resp.json()

    _jwks_cache["keys"] = data
    _jwks_cache["fetched_at"] = now
    return data


def _find_key(jwks: dict, kid: str):
    for key in jwks.get("keys", []):
        if key.get("kid") == kid:
            return pyjwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(key))
    return None


async def verify_clerk_token(token: str) -> dict:
    """Verify a Clerk-issued JWT. Returns the decoded payload."""
    try:
        header = pyjwt.get_unverified_header(token)
        kid = header.get("kid")
        if not kid:
            raise HTTPException(status_code=401, detail="Invalid token header")

        jwks = await _get_jwks()
        public_key = _find_key(jwks, kid)
        if not public_key:
            # Force refresh and retry once
            _jwks_cache["fetched_at"] = 0
            jwks = await _get_jwks()
            public_key = _find_key(jwks, kid)
            if not public_key:
                raise HTTPException(status_code=401, detail="Unknown signing key")

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
            detail="Token expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except pyjwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def _get_or_create_user(payload: dict, db: AsyncSession) -> User:
    """
    Given a verified Clerk JWT payload, find the matching User row.
    If first login, create the User automatically.
    Clerk payload keys: sub (clerk_user_id), email, name (or given_name+family_name).
    """
    clerk_user_id: str = payload.get("sub", "")
    email: str = (
        payload.get("email")
        or payload.get("email_address")
        or ""
    )
    name: str = (
        payload.get("name")
        or f"{payload.get('given_name', '')} {payload.get('family_name', '')}".strip()
        or email.split("@")[0]
    )
    avatar_url: str = payload.get("image_url") or payload.get("picture") or ""

    if not clerk_user_id:
        raise HTTPException(status_code=401, detail="Invalid token: missing sub")

    # Look up by clerk_user_id first
    result = await db.execute(select(User).where(User.clerk_user_id == clerk_user_id))
    user = result.scalar_one_or_none()

    if user:
        # Sync any updated fields from Clerk
        updated = False
        if avatar_url and user.avatar_url != avatar_url:
            user.avatar_url = avatar_url
            updated = True
        if name and user.name != name:
            user.name = name
            updated = True
        if updated:
            await db.flush()
        return user

    # New user — try email fallback (e.g. same Google account used before)
    if email:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if user:
            user.clerk_user_id = clerk_user_id
            await db.flush()
            return user

    # Brand new signup — create row
    display_id = generate_display_id(name)
    # Ensure display_id uniqueness
    while True:
        exists = await db.execute(select(User).where(User.display_id == display_id))
        if not exists.scalar_one_or_none():
            break
        display_id = generate_display_id(name)

    user = User(
        clerk_user_id=clerk_user_id,
        email=email,
        name=name,
        display_id=display_id,
        avatar_url=avatar_url or None,
    )
    db.add(user)
    await db.flush()
    return user


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    payload = await verify_clerk_token(credentials.credentials)
    user = await _get_or_create_user(payload, db)
    return user


def require_plan(*plans):
    """Dependency factory: enforce plan gate. Usage: Depends(require_plan('PRO', 'TEAM'))"""
    from app.models import PlanTier

    async def _check(current_user: User = Depends(get_current_user)):
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
