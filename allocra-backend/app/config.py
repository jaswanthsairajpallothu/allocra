from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)

# Absolute path to .env — always works regardless of where uvicorn is invoked from
_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",          # ignore unknown keys in .env
    )

    # ── Database ──────────────────────────────────────────────────────────
    DATABASE_URL: str

    # ── Clerk ─────────────────────────────────────────────────────────────
    CLERK_PUBLISHABLE_KEY: str = ""
    CLERK_SECRET_KEY: str = ""
    CLERK_JWKS_URL: str = ""

    # ── Email (Resend) ────────────────────────────────────────────────────
    RESEND_API_KEY: str = ""
    FROM_EMAIL: str = "noreply@allocra.app"

    # ── Razorpay ──────────────────────────────────────────────────────────
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    RAZORPAY_WEBHOOK_SECRET: str = ""

    # ── App ───────────────────────────────────────────────────────────────
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"
    ENVIRONMENT: str = "development"

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]


settings = Settings()

# ── Startup diagnostics — printed once at boot ───────────────────────────────
def log_config() -> None:
    env_exists = _ENV_FILE.exists()
    logger.info("=" * 60)
    logger.info("Allocra config loaded")
    logger.info("  .env path     : %s", _ENV_FILE)
    logger.info("  .env exists   : %s", env_exists)
    logger.info("  ENVIRONMENT   : %s", settings.ENVIRONMENT)
    logger.info("  DATABASE_URL  : %s", "SET" if settings.DATABASE_URL else "MISSING ⚠")
    logger.info("  CLERK_JWKS_URL: %s",
                settings.CLERK_JWKS_URL if settings.CLERK_JWKS_URL else "MISSING ⚠")
    logger.info("  CLERK_SECRET  : %s", "SET" if settings.CLERK_SECRET_KEY else "MISSING ⚠")
    logger.info("  CORS_ORIGINS  : %s", settings.CORS_ORIGINS)
    logger.info("=" * 60)

    # Hard-fail on missing critical values so the bug is obvious immediately
    missing = []
    if not settings.DATABASE_URL:
        missing.append("DATABASE_URL")
    if not settings.CLERK_JWKS_URL:
        missing.append("CLERK_JWKS_URL")
    if missing:
        raise RuntimeError(
            f"CRITICAL: Missing required environment variables: {', '.join(missing)}\n"
            f".env file path: {_ENV_FILE}\n"
            f".env file exists: {env_exists}\n"
            f"Fix your .env file and restart."
        )