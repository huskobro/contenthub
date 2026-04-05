"""
ContentHub FastAPI application entry point.

Lifespan handler (Phase M1-C4 / M2-C6 / M3-C1 / M3-C2 / M9-A / M10-B):
  1. Create DB tables (dev/test convenience).
  2. Run startup recovery scanner — marks any stale running jobs as failed
     BEFORE the server begins accepting requests (P-008 / C-07).
  3. Register content modules in module_registry (M2-C1).
  4. Seed KNOWN_SETTINGS into DB if not already present (M10-C).
  5. Resolve credentials + provider settings from DB → .env → builtin (M9-A / M10-B).
  6. Provider örneklerini provider_registry'ye kaydet (M3-C1 / M3-C2).
  7. JobDispatcher oluştur ve app.state'e bağla (M2-C6).
  8. Yield — server is now live.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.config import settings
from app.core.logging import setup_logging
from app.api.router import api_router
from app.db.session import AsyncSessionLocal, AsyncSessionLocal as _session_factory, create_tables
from app.jobs.recovery import run_startup_recovery
from app.jobs.dispatcher import JobDispatcher
from app.modules.registry import module_registry
from app.modules.standard_video.definition import STANDARD_VIDEO_MODULE
from app.providers.capability import ProviderCapability
from app.providers.llm.kie_ai_provider import KieAiProvider
from app.providers.llm.openai_compat_provider import OpenAICompatProvider
from app.providers.tts.edge_tts_provider import EdgeTTSProvider
from app.providers.tts.system_tts_provider import SystemTTSProvider
from app.providers.visuals.pexels_provider import PexelsProvider
from app.providers.visuals.pixabay_provider import PixabayProvider
from app.providers.registry import provider_registry
from app.settings.credential_resolver import resolve_credential
from app.settings.settings_resolver import resolve, KNOWN_SETTINGS
from app.settings.settings_seed import seed_known_settings
from app.sse.bus import event_bus

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI lifespan context manager.

    Startup:
      - Ensure tables exist (development / test convenience path).
      - Run startup recovery before accepting any requests (P-008).
      - Register content modules in module_registry (M2-C1).
      - Provider örneklerini provider_registry'e kaydet (M3-C1).
      - JobDispatcher oluştur ve app.state'e bağla (M2-C6).

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

    # KNOWN_SETTINGS'i DB'ye seed et (M10-C) — eksik key'ler icin DB satiri olusturur
    async with AsyncSessionLocal() as seed_db:
        seed_count = await seed_known_settings(seed_db)
        if seed_count > 0:
            logger.info("Settings seed: %d yeni ayar DB'ye eklendi.", seed_count)

    # Credential + ayar cozumleme — DB -> .env -> builtin (M9-A / M10-B)
    async with AsyncSessionLocal() as cred_db:
        kie_ai_key = await resolve_credential("credential.kie_ai_api_key", cred_db) or settings.kie_ai_api_key
        openai_key = await resolve_credential("credential.openai_api_key", cred_db) or settings.openai_api_key
        pexels_key = await resolve_credential("credential.pexels_api_key", cred_db) or settings.pexels_api_key
        pixabay_key = await resolve_credential("credential.pixabay_api_key", cred_db) or settings.pixabay_api_key
        # Provider ayarlarini resolver'dan oku (M10-B)
        openai_model = await resolve("provider.llm.openai_model", cred_db) or "gpt-4o-mini"
    logger.info("Credential + ayar cozumleme tamamlandi (M9-A / M10-B).")

    # Provider örneklerini provider_registry'ye kaydet (M3-C1 / M3-C2 / M9-A / M10-B)

    # LLM — primary: kie.ai Gemini 2.5 Flash
    provider_registry.register(
        KieAiProvider(api_key=kie_ai_key),
        ProviderCapability.LLM,
        is_primary=True,
        priority=0,
    )
    # LLM — fallback: OpenAI uyumlu generic (M3-C2 / M10-B)
    # API key yoksa kaydedilmez; fallback zincirine girmiyor
    if openai_key:
        provider_registry.register(
            OpenAICompatProvider(api_key=openai_key, model=openai_model),
            ProviderCapability.LLM,
            is_primary=False,
            priority=1,
        )
        logger.info("LLM fallback kaydedildi: openai_compat_%s", openai_model)
    else:
        logger.info("OpenAI API key bos — LLM fallback kaydedilmedi.")

    # TTS — primary: Microsoft Edge TTS
    provider_registry.register(
        EdgeTTSProvider(),
        ProviderCapability.TTS,
        is_primary=True,
        priority=0,
    )
    # TTS — fallback: noop stub (M3-C2)
    # Her zaman kayıt yapılır — üretim için değil, fallback zinciri testleri için
    provider_registry.register(
        SystemTTSProvider(),
        ProviderCapability.TTS,
        is_primary=False,
        priority=1,
    )

    # VISUALS — primary: Pexels, fallback: Pixabay
    provider_registry.register(
        PexelsProvider(api_key=pexels_key),
        ProviderCapability.VISUALS,
        is_primary=True,
        priority=0,
    )
    provider_registry.register(
        PixabayProvider(api_key=pixabay_key),
        ProviderCapability.VISUALS,
        is_primary=False,
        priority=1,
    )
    logger.info(
        "Provider'lar provider_registry'ye kaydedildi: capabilities=%s",
        [cap.value for cap in provider_registry.list_all().keys()],
    )

    # JobDispatcher oluştur ve app.state'e bağla (M2-C6 / M3-C1)
    # Router'lar app.state.job_dispatcher üzerinden erişir
    app.state.job_dispatcher = JobDispatcher(
        db_session_factory=_session_factory,
        module_registry=module_registry,
        event_bus=event_bus,
        registry=provider_registry,
    )
    logger.info("JobDispatcher app.state'e bağlandı.")

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
