from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.api import api_router
from app.core.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Allocra backend starting — env={settings.APP_ENV}")
    yield
    logger.info("Allocra backend shutting down")

app = FastAPI(title="Allocra API", description="Decision Intelligence System for Teams", version="2.0.0",
              docs_url="/docs" if settings.APP_DEBUG else None, redoc_url="/redoc" if settings.APP_DEBUG else None, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://main.dyw6v0jkjzelv.amplifyapp.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_router)

@app.get("/", include_in_schema=False)
def root():
    return {"service": "Allocra API", "version": "2.0.0", "status": "running"}
