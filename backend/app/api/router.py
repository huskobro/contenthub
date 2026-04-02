from fastapi import APIRouter
from app.api import health
from app.settings.router import router as settings_router
from app.visibility.router import router as visibility_router
from app.jobs.router import router as jobs_router
from app.modules.standard_video.router import router as standard_video_router
from app.modules.templates.router import router as templates_router
from app.modules.style_blueprints.router import router as style_blueprints_router
from app.sources.router import router as sources_router
from app.source_scans.router import router as source_scans_router
from app.news_items.router import router as news_items_router

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(settings_router)
api_router.include_router(visibility_router)
api_router.include_router(jobs_router)
api_router.include_router(standard_video_router)
api_router.include_router(templates_router)
api_router.include_router(style_blueprints_router)
api_router.include_router(sources_router)
api_router.include_router(source_scans_router)
api_router.include_router(news_items_router)
