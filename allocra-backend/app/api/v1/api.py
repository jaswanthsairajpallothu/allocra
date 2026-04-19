from fastapi import APIRouter
from app.api.v1.routes import allocation_routes, auth_routes, health_routes, membership_routes, project_routes, task_routes, workspace_routes

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(health_routes.router)
api_router.include_router(auth_routes.router)
api_router.include_router(workspace_routes.router)
api_router.include_router(project_routes.router)
api_router.include_router(membership_routes.router)
api_router.include_router(task_routes.router)
api_router.include_router(allocation_routes.router)
