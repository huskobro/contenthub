from fastapi import APIRouter
from app.api import health
from app.settings.router import router as settings_router
from app.visibility.router import router as visibility_router
from app.jobs.router import router as jobs_router
from app.modules.standard_video.router import router as standard_video_router

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(settings_router)
api_router.include_router(visibility_router)
api_router.include_router(jobs_router)
api_router.include_router(standard_video_router)
