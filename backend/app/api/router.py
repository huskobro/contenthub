from fastapi import APIRouter
from app.api import health
from app.providers.router import router as providers_router
from app.settings.router import router as settings_router
from app.visibility.router import router as visibility_router
from app.jobs.router import router as jobs_router
from app.modules.standard_video.router import router as standard_video_router
from app.modules.templates.router import router as templates_router
from app.modules.style_blueprints.router import router as style_blueprints_router
from app.sources.router import router as sources_router
from app.source_scans.router import router as source_scans_router
from app.news_items.router import router as news_items_router
from app.used_news.router import router as used_news_router
from app.modules.news_bulletin.router import router as news_bulletin_router
from app.modules.template_style_links.router import router as template_style_links_router
from app.onboarding.router import router as onboarding_router
from app.sse.router import router as sse_router
from app.publish.router import router as publish_router
from app.publish.youtube.router import router as youtube_oauth_router
from app.analytics.router import router as analytics_router

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(providers_router)
api_router.include_router(settings_router)
api_router.include_router(visibility_router)
api_router.include_router(jobs_router)
api_router.include_router(standard_video_router)
api_router.include_router(templates_router)
api_router.include_router(style_blueprints_router)
api_router.include_router(sources_router)
api_router.include_router(source_scans_router)
api_router.include_router(news_items_router)
api_router.include_router(used_news_router)
api_router.include_router(news_bulletin_router)
api_router.include_router(template_style_links_router)
api_router.include_router(onboarding_router)
api_router.include_router(sse_router)
api_router.include_router(publish_router)
api_router.include_router(youtube_oauth_router)
api_router.include_router(analytics_router)
