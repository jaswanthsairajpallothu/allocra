import os
import uvicorn
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings, log_config
from app.routers import auth, workspaces, projects, tasks, allocate, notifications, chat, billing, analytics, submissions

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Allocra API",
    description="Decision Intelligence System for Teams",
    version="3.0.0",
    docs_url="/docs" if settings.ENVIRONMENT == "development" else None,
    redoc_url=None,
)

@app.on_event("startup")
async def on_startup():
    log_config()  # prints + validates all env vars at boot

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Global exception handler ─────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception on %s: %s", request.url.path, exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Something went wrong on our end. We've been notified."},
    )

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(workspaces.router)
app.include_router(projects.router)
app.include_router(tasks.router)
app.include_router(submissions.router)
app.include_router(allocate.router)
app.include_router(notifications.router)
app.include_router(chat.router)
app.include_router(billing.router)
app.include_router(analytics.router)

# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/health", tags=["health"])
async def health_check():
    from app.database import engine
    try:
        async with engine.connect() as conn:
            await conn.execute(__import__("sqlalchemy").text("SELECT 1"))
        db_status = "ok"
    except Exception as e:
        db_status = f"error: {str(e)}"

    return {
        "status": "ok" if db_status == "ok" else "degraded",
        "version": "3.0.0",
        "database": db_status,
        "environment": settings.ENVIRONMENT,
    }

# ── Cloud Run Entry Point ─────────────────────────────────────────────────────
if __name__ == "__main__":
    # Get the port from the environment variable 'PORT' (GCP sets this to 8080)
    # If not found, it defaults to 8080 for local testing
    port = int(os.environ.get("PORT", 8080))
    
    # Run the app on 0.0.0.0 so Google's proxy can reach it
    uvicorn.run(app, host="0.0.0.0", port=port)