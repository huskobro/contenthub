"""
ContentHub FastAPI application entry point.

Lifespan handler (Phase M1-C4 / M2-C6 / M3-C1 / M3-C2 / M9-A / M10-B / M11 / Faz-D / Faz-I):
  1. Create DB tables (dev/test convenience).
  2. Run startup recovery scanner — marks any stale running jobs as failed
     BEFORE the server begins accepting requests (P-008 / C-07).
  3. Register content modules in module_registry (M2-C1).
  4. Seed KNOWN_SETTINGS into DB if not already present (M10-C).
  5. Resolve credentials + provider settings from DB → .env → builtin (M9-A / M10-B).
  6. Provider örneklerini provider_registry'ye kaydet (M3-C1 / M3-C2).
  7. JobDispatcher oluştur ve app.state'e bağla (M2-C6).
  8. Start publish scheduler background task (M11).
  9. Start auto-scan scheduler background task (Faz-D).
  10. Start job auto-retry scheduler if enabled (Faz-I).
  11. Yield — server is now live.
"""

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.logging import setup_logging
from app.api.router import api_router
from app.db.session import AsyncSessionLocal, AsyncSessionLocal as _session_factory, create_tables
from app.jobs.recovery import run_startup_recovery
from app.jobs.dispatcher import JobDispatcher
from app.modules.registry import module_registry
from app.modules.standard_video.definition import STANDARD_VIDEO_MODULE
from app.modules.news_bulletin.definition import NEWS_BULLETIN_MODULE
from app.providers.capability import ProviderCapability
from app.providers.llm.kie_ai_provider import KieAiProvider
from app.providers.llm.openai_compat_provider import OpenAICompatProvider
from app.providers.tts.edge_tts_provider import EdgeTTSProvider
from app.providers.tts.system_tts_provider import SystemTTSProvider
from app.providers.visuals.pexels_provider import PexelsProvider
from app.providers.visuals.pixabay_provider import PixabayProvider
from app.providers.registry import provider_registry
from app.publish.registry import publish_adapter_registry
from app.publish.youtube.adapter import YouTubeAdapter
from app.settings.credential_resolver import resolve_credential
from app.settings.settings_resolver import resolve, KNOWN_SETTINGS
from app.settings.settings_seed import seed_known_settings
from app.prompt_assembly.block_seed import seed_prompt_blocks
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

    # --- Startup validation (M38) ---
    import sys
    py_ver = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
    venv_active = sys.prefix != sys.base_prefix
    if not venv_active:
        logger.warning(
            "STARTUP WARNING: Running without virtual environment. "
            "Python: %s at %s. Expected venv at backend/.venv/",
            py_ver, sys.executable,
        )
    else:
        logger.info("Python %s (venv: %s)", py_ver, sys.prefix)

    # WAL checkpoint on startup — consolidate WAL file
    from app.db.session import wal_checkpoint
    try:
        ckpt = await wal_checkpoint()
        if ckpt["log"] > 0:
            logger.info(
                "WAL checkpoint: %d pages consolidated (busy=%d).",
                ckpt["checkpointed"], ckpt["busy"],
            )
        else:
            logger.info("WAL checkpoint: clean (no pending pages).")
    except Exception as exc:
        logger.warning("WAL checkpoint failed: %s", exc)

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

    module_registry.register(NEWS_BULLETIN_MODULE)
    logger.info("Modül kaydedildi: %s", NEWS_BULLETIN_MODULE.module_id)

    # KNOWN_SETTINGS'i DB'ye seed et (M10-C) — eksik key'ler icin DB satiri olusturur
    async with AsyncSessionLocal() as seed_db:
        seed_count = await seed_known_settings(seed_db)
        if seed_count > 0:
            logger.info("Settings seed: %d yeni ayar DB'ye eklendi.", seed_count)

    # M40b: workspace_root + output_dir global state'ini settings'ten yukle
    from pathlib import Path as _Path
    from app.jobs.workspace import set_workspace_root as _set_workspace_root
    async with AsyncSessionLocal() as ws_db:
        _ws_root_val = await resolve("system.workspace_root", ws_db)
        if _ws_root_val and str(_ws_root_val).strip():
            _ws_path = _Path(str(_ws_root_val).strip()).expanduser()
            _set_workspace_root(_ws_path)
            logger.info("M40b: workspace_root settings'ten yuklendi: %s", _ws_path)
        else:
            logger.info("M40b: workspace_root settings bos, varsayilan kullaniliyor.")

    # Prompt Assembly Engine — seed builtin prompt blocks
    async with AsyncSessionLocal() as seed_db:
        block_seed_count = await seed_prompt_blocks(seed_db)
        if block_seed_count > 0:
            logger.info("PromptBlock seed: %d yeni blok DB'ye eklendi.", block_seed_count)

    # Auth — seed initial admin user if none exists (Faz 3)
    from app.auth.seed import seed_admin_user
    async with AsyncSessionLocal() as auth_db:
        await seed_admin_user(auth_db)

    # Sprint 1: Wizard config seed — ensure default wizard configs exist on fresh DB
    from app.wizard_configs.seed import seed_wizard_configs
    async with AsyncSessionLocal() as wiz_db:
        wiz_count = await seed_wizard_configs(wiz_db)
        if wiz_count > 0:
            logger.info("WizardConfig seed: %d yeni wizard config eklendi.", wiz_count)

    # Credential + ayar cozumleme — DB -> .env -> builtin (M9-A / M10-B)
    async with AsyncSessionLocal() as cred_db:
        kie_ai_key = await resolve_credential("credential.kie_ai_api_key", cred_db) or settings.kie_ai_api_key
        openai_key = await resolve_credential("credential.openai_api_key", cred_db) or settings.openai_api_key
        pexels_key = await resolve_credential("credential.pexels_api_key", cred_db) or settings.pexels_api_key
        pixabay_key = await resolve_credential("credential.pixabay_api_key", cred_db) or settings.pixabay_api_key
        # Provider ayarlarini resolver'dan oku (M10-B)
        openai_model = await resolve("provider.llm.openai_model", cred_db) or "gpt-4o-mini"
        # Provider settings from resolver (M11)
        kie_model = await resolve("provider.llm.kie_model", cred_db)
        kie_temperature = await resolve("provider.llm.kie_temperature", cred_db)
        openai_temperature = await resolve("provider.llm.openai_temperature", cred_db)
        llm_timeout = await resolve("provider.llm.timeout_seconds", cred_db)
        edge_voice = await resolve("provider.tts.edge_default_voice", cred_db)
        pexels_count = await resolve("provider.visuals.pexels_default_count", cred_db)
        pixabay_count = await resolve("provider.visuals.pixabay_default_count", cred_db)
        search_timeout = await resolve("provider.visuals.search_timeout_seconds", cred_db)
        yt_upload_timeout = await resolve("publish.youtube.upload_timeout_seconds", cred_db)
        yt_default_category = await resolve("publish.youtube.default_category_id", cred_db)
        yt_default_desc = await resolve("publish.youtube.default_description", cred_db)
        yt_default_tags = await resolve("publish.youtube.default_tags", cred_db)
        whisper_model_size = await resolve("provider.whisper.model_size", cred_db)
    logger.info("Credential + ayar cozumleme tamamlandi (M9-A / M10-B / M11).")

    # Provider örneklerini provider_registry'ye kaydet (M3-C1 / M3-C2 / M9-A / M10-B)

    # LLM — primary: kie.ai Gemini 2.5 Flash
    provider_registry.register(
        KieAiProvider(api_key=kie_ai_key, model=kie_model, temperature=kie_temperature, timeout=llm_timeout),
        ProviderCapability.LLM,
        is_primary=True,
        priority=0,
    )
    # LLM — fallback: OpenAI uyumlu generic (M3-C2 / M10-B)
    # Boş veya placeholder key ise kaydedilmez; fallback zincirine girmiyor
    _OPENAI_PLACEHOLDERS = {"abc", "sk-test-key-123", "placeholder", ""}
    openai_key_clean = (openai_key or "").strip()
    if openai_key_clean and openai_key_clean not in _OPENAI_PLACEHOLDERS:
        provider_registry.register(
            OpenAICompatProvider(api_key=openai_key_clean, model=openai_model, temperature=openai_temperature, timeout=llm_timeout),
            ProviderCapability.LLM,
            is_primary=False,
            priority=1,
        )
        logger.info("LLM fallback kaydedildi: openai_compat_%s", openai_model)
    else:
        logger.info("OpenAI API key bos veya placeholder — LLM fallback kaydedilmedi.")

    # TTS — primary: Microsoft Edge TTS
    provider_registry.register(
        EdgeTTSProvider(default_voice=edge_voice),
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
        PexelsProvider(api_key=pexels_key, default_count=pexels_count, search_timeout=search_timeout),
        ProviderCapability.VISUALS,
        is_primary=True,
        priority=0,
    )
    provider_registry.register(
        PixabayProvider(api_key=pixabay_key, default_count=pixabay_count, search_timeout=search_timeout),
        ProviderCapability.VISUALS,
        is_primary=False,
        priority=1,
    )
    # WHISPER — local whisper provider (M4-C1)
    from app.providers.whisper.local_whisper_provider import LocalWhisperProvider
    provider_registry.register(
        LocalWhisperProvider(model_size=whisper_model_size or "base"),
        ProviderCapability.WHISPER,
        is_primary=True,
        priority=0,
    )

    logger.info(
        "Provider'lar provider_registry'ye kaydedildi: capabilities=%s",
        [cap.value for cap in provider_registry.list_all().keys()],
    )

    # YouTube publish adaptörünü kaydet (M7-C2 / M23-A metadata defaults)
    yt_settings_defaults = {
        "category_id": yt_default_category or "22",
        "description": yt_default_desc or "",
        "tags": yt_default_tags or "",
    }
    publish_adapter_registry.register(
        YouTubeAdapter(
            upload_timeout=yt_upload_timeout,
            settings_defaults=yt_settings_defaults,
        )
    )
    logger.info(
        "YouTubeAdapter publish_adapter_registry'ye kaydedildi "
        "(upload_timeout=%.1f, default_category=%s).",
        yt_upload_timeout or 60.0, yt_settings_defaults["category_id"],
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

    # Session factory'yi app.state'e ekle (M28 — _watch_bulletin_job için)
    app.state.session_factory = _session_factory

    # Publish scheduler — background task (M11) + Gate 4 health snapshot.
    # The scheduler updates this dict in place every tick. The
    # /publish/scheduler/status endpoint reads it and reports
    # {unknown, healthy, stale}.
    from app.publish.scheduler import poll_scheduled_publishes
    app.state.publish_scheduler_status = {}
    scheduler_task = asyncio.create_task(
        poll_scheduled_publishes(
            AsyncSessionLocal,
            interval=60,
            status_holder=app.state.publish_scheduler_status,
        )
    )
    app.state.scheduler_task = scheduler_task
    logger.info("Publish scheduler task created.")

    # Auto-scan scheduler — background task (Faz D)
    from app.source_scans.scheduler import poll_auto_scans
    auto_scan_task = asyncio.create_task(
        poll_auto_scans(AsyncSessionLocal, interval=300)
    )
    app.state.auto_scan_task = auto_scan_task
    logger.info("Auto-scan scheduler task created.")

    # Job auto-retry scheduler — background task (Faz I)
    # Only starts if jobs.auto_retry_enabled setting is True (default: False)
    async with AsyncSessionLocal() as retry_settings_db:
        auto_retry_enabled = await resolve("jobs.auto_retry_enabled", retry_settings_db)
        retry_interval = 120  # default poll interval
        retry_max = await resolve("jobs.max_auto_retries", retry_settings_db) or 3
        retry_delay = await resolve("jobs.retry_base_delay_seconds", retry_settings_db) or 60

    if auto_retry_enabled:
        from app.jobs.retry_scheduler import poll_retryable_jobs
        retry_task = asyncio.create_task(
            poll_retryable_jobs(
                AsyncSessionLocal,
                app.state,
                interval=retry_interval,
                max_retries=int(retry_max),
                base_delay=int(retry_delay),
            )
        )
        app.state.retry_scheduler_task = retry_task
        logger.info(
            "Job retry scheduler task created (max_retries=%d, base_delay=%ds).",
            retry_max, retry_delay,
        )
    else:
        logger.info("Job auto-retry scheduler disabled (jobs.auto_retry_enabled=False).")

    # Overdue notification scheduler — background task (Faz 16a)
    from app.notifications.overdue_scheduler import poll_overdue_notifications
    overdue_task = asyncio.create_task(
        poll_overdue_notifications(AsyncSessionLocal, interval=300)
    )
    app.state.overdue_scheduler_task = overdue_task
    logger.info("Overdue notification scheduler task created.")

    # YouTube Analytics daily sync — background task (Sprint 1 / Faz YT-A1)
    from app.publish.scheduler import poll_youtube_analytics_daily
    yt_analytics_task = asyncio.create_task(
        poll_youtube_analytics_daily(AsyncSessionLocal, interval=3600)
    )
    app.state.youtube_analytics_task = yt_analytics_task
    logger.info("YouTube Analytics daily sync task created.")

    # Full-Auto project scheduler — background task (Full-Auto v1).
    # The loop itself gates on automation.scheduler.enabled at each tick, so
    # we can start it unconditionally: when the kill switch is off it is a
    # no-op per tick.
    from app.full_auto.scheduler import poll_full_auto_projects
    async with AsyncSessionLocal() as _fa_db:
        fa_interval = await resolve("automation.scheduler.poll_interval_seconds", _fa_db)
    full_auto_task = asyncio.create_task(
        poll_full_auto_projects(
            AsyncSessionLocal,
            app.state.job_dispatcher,
            interval=float(fa_interval or 60),
        )
    )
    app.state.full_auto_scheduler_task = full_auto_task
    logger.info("Full-Auto scheduler task created (interval=%ss).", fa_interval or 60)

    yield

    # Shutdown: cancel publish scheduler
    if hasattr(app.state, "scheduler_task"):
        app.state.scheduler_task.cancel()
        try:
            await app.state.scheduler_task
        except asyncio.CancelledError:
            pass
        logger.info("Publish scheduler cancelled.")

    # Shutdown: cancel auto-scan scheduler
    if hasattr(app.state, "auto_scan_task"):
        app.state.auto_scan_task.cancel()
        try:
            await app.state.auto_scan_task
        except asyncio.CancelledError:
            pass
        logger.info("Auto-scan scheduler cancelled.")

    # Shutdown: cancel retry scheduler
    if hasattr(app.state, "retry_scheduler_task"):
        app.state.retry_scheduler_task.cancel()
        try:
            await app.state.retry_scheduler_task
        except asyncio.CancelledError:
            pass
        logger.info("Job retry scheduler cancelled.")

    # Shutdown: cancel overdue notification scheduler
    if hasattr(app.state, "overdue_scheduler_task"):
        app.state.overdue_scheduler_task.cancel()
        try:
            await app.state.overdue_scheduler_task
        except asyncio.CancelledError:
            pass
        logger.info("Overdue notification scheduler cancelled.")

    # Shutdown: cancel YouTube Analytics sync task
    if hasattr(app.state, "youtube_analytics_task"):
        app.state.youtube_analytics_task.cancel()
        try:
            await app.state.youtube_analytics_task
        except asyncio.CancelledError:
            pass
        logger.info("YouTube Analytics sync task cancelled.")

    # Shutdown: cancel Full-Auto project scheduler
    if hasattr(app.state, "full_auto_scheduler_task"):
        app.state.full_auto_scheduler_task.cancel()
        try:
            await app.state.full_auto_scheduler_task
        except asyncio.CancelledError:
            pass
        logger.info("Full-Auto scheduler cancelled.")


def _register_exception_handlers(app: FastAPI) -> None:
    """
    Map domain exceptions to proper HTTP status codes.

    Job Engine:
        JobNotFoundError / StepNotFoundError  → 404
        InvalidTransitionError                → 409
        StepExecutionError                    → 500 (internal)

    Publish:
        PublishRecordNotFoundError            → 404
        InvalidPublishTransitionError         → 409
        PublishGateViolationError             → 409
        ReviewGateViolationError              → 409
        PublishAlreadyTerminalError           → 409

    Modules:
        ModuleNotFoundError                   → 404
        InputValidationError (modules)        → 422

    Providers:
        ProviderNotFoundError                 → 503
        NonRetryableProviderError             → 502
        ProviderInvokeError                   → 502
        ProviderError (base)                  → 502
    """
    from app.jobs.exceptions import (
        JobNotFoundError,
        StepNotFoundError,
        InvalidTransitionError,
        StepExecutionError,
    )
    from app.publish.exceptions import (
        PublishRecordNotFoundError,
        InvalidPublishTransitionError,
        PublishGateViolationError,
        ReviewGateViolationError,
        PublishAlreadyTerminalError,
    )
    from app.modules.exceptions import (
        ModuleNotFoundError as ModuleNotFound,
        InputValidationError as ModuleInputValidationError,
    )
    from app.providers.exceptions import (
        ProviderError,
        ProviderInvokeError,
        NonRetryableProviderError,
        ProviderNotFoundError,
    )
    from app.settings.validation import SettingValidationError

    # --- Settings Validation 422 ---
    @app.exception_handler(SettingValidationError)
    async def _setting_validation_error(request: Request, exc: SettingValidationError) -> JSONResponse:
        return JSONResponse(status_code=422, content={"detail": exc.message})

    # --- Job Engine 404s ---
    @app.exception_handler(JobNotFoundError)
    async def _job_not_found(request: Request, exc: JobNotFoundError) -> JSONResponse:
        return JSONResponse(status_code=404, content={"detail": str(exc)})

    @app.exception_handler(StepNotFoundError)
    async def _step_not_found(request: Request, exc: StepNotFoundError) -> JSONResponse:
        return JSONResponse(status_code=404, content={"detail": str(exc)})

    # --- Job Engine 409 ---
    @app.exception_handler(InvalidTransitionError)
    async def _invalid_transition(request: Request, exc: InvalidTransitionError) -> JSONResponse:
        return JSONResponse(status_code=409, content={"detail": str(exc)})

    # --- Job Engine 500 ---
    @app.exception_handler(StepExecutionError)
    async def _step_execution(request: Request, exc: StepExecutionError) -> JSONResponse:
        return JSONResponse(status_code=500, content={"detail": str(exc)})

    # --- Publish 404 ---
    @app.exception_handler(PublishRecordNotFoundError)
    async def _publish_not_found(request: Request, exc: PublishRecordNotFoundError) -> JSONResponse:
        return JSONResponse(status_code=404, content={"detail": str(exc)})

    # --- Publish 409s ---
    @app.exception_handler(InvalidPublishTransitionError)
    async def _invalid_publish_transition(request: Request, exc: InvalidPublishTransitionError) -> JSONResponse:
        return JSONResponse(status_code=409, content={"detail": str(exc)})

    @app.exception_handler(PublishGateViolationError)
    async def _publish_gate(request: Request, exc: PublishGateViolationError) -> JSONResponse:
        return JSONResponse(status_code=409, content={"detail": str(exc)})

    @app.exception_handler(ReviewGateViolationError)
    async def _review_gate(request: Request, exc: ReviewGateViolationError) -> JSONResponse:
        return JSONResponse(status_code=409, content={"detail": str(exc)})

    @app.exception_handler(PublishAlreadyTerminalError)
    async def _publish_terminal(request: Request, exc: PublishAlreadyTerminalError) -> JSONResponse:
        return JSONResponse(status_code=409, content={"detail": str(exc)})

    # --- Module 404 ---
    @app.exception_handler(ModuleNotFound)
    async def _module_not_found(request: Request, exc: ModuleNotFound) -> JSONResponse:
        return JSONResponse(status_code=404, content={"detail": str(exc)})

    # --- Module 422 ---
    @app.exception_handler(ModuleInputValidationError)
    async def _module_input_validation(request: Request, exc: ModuleInputValidationError) -> JSONResponse:
        return JSONResponse(status_code=422, content={"detail": str(exc)})

    # --- Provider 503 ---
    @app.exception_handler(ProviderNotFoundError)
    async def _provider_not_found(request: Request, exc: ProviderNotFoundError) -> JSONResponse:
        return JSONResponse(status_code=503, content={"detail": str(exc)})

    # --- Provider 502 (specific before general) ---
    @app.exception_handler(NonRetryableProviderError)
    async def _non_retryable_provider(request: Request, exc: NonRetryableProviderError) -> JSONResponse:
        return JSONResponse(status_code=502, content={"detail": str(exc)})

    @app.exception_handler(ProviderInvokeError)
    async def _provider_invoke(request: Request, exc: ProviderInvokeError) -> JSONResponse:
        return JSONResponse(status_code=502, content={"detail": str(exc)})

    @app.exception_handler(ProviderError)
    async def _provider_base(request: Request, exc: ProviderError) -> JSONResponse:
        return JSONResponse(status_code=502, content={"detail": str(exc)})


def create_app() -> FastAPI:
    setup_logging(debug=settings.debug)

    app = FastAPI(
        title=settings.app_name,
        openapi_url=f"{settings.api_prefix}/openapi.json",
        docs_url=f"{settings.api_prefix}/docs",
        lifespan=lifespan,
    )

    _register_exception_handlers(app)

    app.include_router(api_router, prefix=settings.api_prefix)

    return app


app = create_app()
