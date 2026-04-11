from fastapi import APIRouter, Depends
from app.api import health
from app.auth.dependencies import require_user, require_admin
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
from app.analytics.youtube_analytics_router import router as youtube_analytics_router
from app.audit.router import router as audit_logs_router
from app.assets.router import router as assets_router
from app.content_library.router import router as content_library_router
from app.discovery.router import router as discovery_router
from app.wizard_configs.router import router as wizard_configs_router
from app.modules.router import router as modules_router
from app.prompt_assembly.router import router as prompt_assembly_router
from app.fs.router import router as fs_router
from app.users.router import router as users_router
from app.channels.router import router as channels_router
from app.platform_connections.router import router as platform_connections_router
from app.content_projects.router import router as content_projects_router
from app.engagement.router import router as engagement_router
from app.comments.router import router as comments_router
from app.playlists.router import router as playlists_router
from app.posts.router import router as posts_router
from app.brand_profiles.router import router as brand_profiles_router
from app.automation.router import router as automation_router
from app.automation.router import inbox_router as operations_inbox_router
from app.calendar.router import router as calendar_router
from app.auth.router import router as auth_router
from app.notifications.router import router as notifications_router

api_router = APIRouter()

# --- Public / no-auth routers ---
api_router.include_router(health.router, tags=["health"])

# --- Auth-protected routers (Sprint 1 hardening) ---
# Admin-only: user management, filesystem
api_router.include_router(users_router, dependencies=[Depends(require_admin)])
api_router.include_router(fs_router, dependencies=[Depends(require_admin)])
api_router.include_router(prompt_assembly_router, dependencies=[Depends(require_admin)])

# User-level auth required
api_router.include_router(channels_router, dependencies=[Depends(require_user)])
api_router.include_router(platform_connections_router, dependencies=[Depends(require_user)])
api_router.include_router(content_projects_router, dependencies=[Depends(require_user)])
api_router.include_router(engagement_router, dependencies=[Depends(require_user)])
api_router.include_router(comments_router, dependencies=[Depends(require_user)])
api_router.include_router(playlists_router, dependencies=[Depends(require_user)])
api_router.include_router(posts_router, dependencies=[Depends(require_user)])
api_router.include_router(brand_profiles_router, dependencies=[Depends(require_user)])
api_router.include_router(automation_router, dependencies=[Depends(require_user)])
api_router.include_router(operations_inbox_router, dependencies=[Depends(require_user)])
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
api_router.include_router(youtube_analytics_router)
api_router.include_router(audit_logs_router)
api_router.include_router(assets_router)
api_router.include_router(content_library_router)
api_router.include_router(discovery_router)
api_router.include_router(wizard_configs_router, dependencies=[Depends(require_user)])
api_router.include_router(modules_router)
api_router.include_router(calendar_router, dependencies=[Depends(require_user)])
api_router.include_router(notifications_router, dependencies=[Depends(require_user)])
api_router.include_router(auth_router)
