from fastapi import APIRouter
from app.api.v1.routes import user_routes, task_routes, allocation_routes

router = APIRouter(prefix="/api/v1")
router.include_router(user_routes.router)
router.include_router(task_routes.router)
router.include_router(allocation_routes.router)