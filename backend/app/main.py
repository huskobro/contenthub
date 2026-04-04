"""
ContentHub FastAPI application entry point.

Lifespan handler (Phase M1-C4 / M2-C2):
  1. Create DB tables (dev/test convenience).
  2. Run startup recovery scanner — marks any stale running jobs as failed
     BEFORE the server begins accepting requests (P-008 / C-07).
  3. Register content modules in module_registry (M2-C1).
  4. Register provider instances in _providers dict (M2-C2).
     NOT: M3'te ModuleRegistry'ye entegre edilecek.
  5. Yield — server is now live.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.config import settings
from app.core.logging import setup_logging
from app.api.router import api_router
from app.db.session import AsyncSessionLocal, create_tables
from app.jobs.recovery import run_startup_recovery
from app.modules.registry import module_registry
from app.modules.standard_video.definition import STANDARD_VIDEO_MODULE
from app.providers.base import BaseProvider
from app.providers.llm.kie_ai_provider import KieAiProvider
from app.providers.tts.edge_tts_provider import EdgeTTSProvider
from app.providers.visuals.pexels_provider import PexelsProvider
from app.providers.visuals.pixabay_provider import PixabayProvider

logger = logging.getLogger(__name__)

# Geçici provider erişimi — M3'te ModuleRegistry'ye entegre edilecek
_providers: dict[str, BaseProvider] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI lifespan context manager.

    Startup:
      - Ensure tables exist (development / test convenience path).
      - Run startup recovery before accepting any requests (P-008).
      - Register content modules in module_registry (M2-C1).
      - Provider örneklerini _providers dict'ine kaydet (M2-C2).

    Shutdown:
      - Nothing required at this phase.
    """
    # Ensure tables exist (no-op in production where Alembic is used)
    await create_tables()

    # Startup recovery — must complete before server accepts work
    async with AsyncSessionLocal() as db:
        summary = await run_startup_recovery(db)
        if summary.recovered_jobs > 0:
            logger.warning(
                "Startup recovery: marked %d stale job(s) as failed. IDs: %s",
                summary.recovered_jobs,
                summary.job_ids,
            )
        else:
            logger.info("Startup recovery: no stale jobs detected.")

    # İçerik modüllerini kayıt defterine ekle (M2-C1)
    module_registry.register(STANDARD_VIDEO_MODULE)
    logger.info("Modül kaydedildi: %s", STANDARD_VIDEO_MODULE.module_id)

    # Provider örneklerini kaydet (M2-C2)
    # NOT: M3'te gerçek ModuleRegistry/ProviderRegistry'ye taşınacak
    _providers["llm"] = KieAiProvider(api_key=settings.kie_ai_api_key)
    _providers["tts"] = EdgeTTSProvider()
    _providers["visuals_primary"] = PexelsProvider(api_key=settings.pexels_api_key)
    _providers["visuals_fallback"] = PixabayProvider(api_key=settings.pixabay_api_key)
    logger.info(
        "Provider'lar kaydedildi: %s",
        list(_providers.keys()),
    )

    yield
    # Shutdown — nothing to do at this phase


def create_app() -> FastAPI:
    setup_logging(debug=settings.debug)

    app = FastAPI(
        title=settings.app_name,
        openapi_url=f"{settings.api_prefix}/openapi.json",
        docs_url=f"{settings.api_prefix}/docs",
        lifespan=lifespan,
    )

    app.include_router(api_router, prefix=settings.api_prefix)

    return app


app = create_app()
