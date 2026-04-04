"""
Job Dispatcher (M2-C6)

Job yaratıldıktan sonra pipeline'ı arka planda başlatır.
Tüm orchestration mantığı burada toplanır — service.py'ye veya pipeline.py'ye sızmaz.

Sorumluluğu:
  - Job ve modül tanımını alır
  - Her adım için ilgili executor instance'ını oluşturur (provider inject)
  - PipelineRunner'ı kurar
  - asyncio.create_task ile pipeline'ı arka planda çalıştırır

Bu dosyada YOKTUR:
  - DB CRUD işlemleri (service.py)
  - Adım döngüsü / state machine (pipeline.py)
  - HTTP request/response (router.py)

SONRAKİ CHUNK NOTU:
  M3 kapsamında executor oluşturma mantığı ModuleRegistry + ProviderRegistry
  entegrasyonuyla daha deklaratif hale getirilecek. Şu an executor_class'a
  bakarak provider inject ediliyor; bu geçici bir köprüdür.
"""

import asyncio
import logging
from typing import TYPE_CHECKING

from sqlalchemy.ext.asyncio import AsyncSession

from app.jobs import service
from app.jobs.executor import StepExecutor
from app.jobs.pipeline import PipelineRunner
from app.modules.registry import ModuleRegistry
from app.modules.standard_video.executors import (
    ScriptStepExecutor,
    MetadataStepExecutor,
    TTSStepExecutor,
    VisualsStepExecutor,
    SubtitleStepExecutor,
    CompositionStepExecutor,
)

if TYPE_CHECKING:
    from app.sse.bus import EventBus

logger = logging.getLogger(__name__)


def _build_executor(executor_class: type, providers: dict) -> StepExecutor:
    """
    Executor sınıfına bakarak doğru provider'ları inject eder ve instance döner.

    Bilinmeyen executor sınıfları için no-arg çağrı denenir.
    Bu, SubtitleStepExecutor ve CompositionStepExecutor gibi provider'sız
    executor'lar için geçerlidir.

    Args:
        executor_class: Executor'ın sınıf nesnesi.
        providers     : Provider kimliği → instance mapping.

    Returns:
        Executor instance'ı.
    """
    if executor_class is ScriptStepExecutor:
        return ScriptStepExecutor(llm_provider=providers["llm"])
    if executor_class is MetadataStepExecutor:
        return MetadataStepExecutor(llm_provider=providers["llm"])
    if executor_class is TTSStepExecutor:
        return TTSStepExecutor(tts_provider=providers["tts"])
    if executor_class is VisualsStepExecutor:
        return VisualsStepExecutor(
            pexels_provider=providers["visuals_primary"],
            pixabay_provider=providers["visuals_fallback"],
        )
    # Provider gerektirmeyen executor'lar (SubtitleStepExecutor, CompositionStepExecutor)
    return executor_class()


class JobDispatcher:
    """
    Pipeline orchestrator.

    Job yaratıldıktan sonra dispatch() çağrılır; modül tanımından executor'lar
    kurulur ve PipelineRunner asyncio arka plan görevi olarak başlatılır.
    """

    def __init__(
        self,
        db_session_factory,
        module_registry: ModuleRegistry,
        event_bus: "EventBus | None",
        providers: dict,
    ) -> None:
        """
        Args:
            db_session_factory: Yeni async DB session üretmek için factory.
            module_registry   : Modül tanımlarını içeren registry.
            event_bus         : SSE event bus (None ise event yayınlanmaz).
            providers         : Provider kimliği → instance mapping.
        """
        self._session_factory = db_session_factory
        self._registry = module_registry
        self._event_bus = event_bus
        self._providers = providers

    async def dispatch(self, job_id: str) -> None:
        """
        Job için executor'ları kurar ve pipeline'ı arka planda başlatır.

        Adımlar:
          1. Job'u alır ve module_id'yi öğrenir.
          2. module_registry'den adım tanımlarını alır.
          3. Her adım için executor instance'ı oluşturur.
          4. PipelineRunner kurar.
          5. asyncio.create_task ile pipeline'ı arka planda çalıştırır.

        Args:
            job_id: Çalıştırılacak job'un kimliği.
        """
        # Kısa süreli okuma için oturum aç; context manager yerine manuel close kullan.
        # SQLAlchemy 2.0.x + Python 3.13 uyumluluk notu: async with session pattern,
        # asyncio.shield + create_task kombinasyonunda hata verebilir; manuel yönetim daha güvenli.
        db = self._session_factory()
        try:
            job = await service.get_job(db, job_id)
        finally:
            await db.close()

        if job is None:
            logger.error("JobDispatcher: job bulunamadı, dispatch iptal. job_id=%s", job_id)
            return

        module_id = job.module_type

        step_definitions = self._registry.get_steps(module_id)
        if not step_definitions:
            logger.warning(
                "JobDispatcher: modül için adım tanımı bulunamadı, dispatch iptal. "
                "job_id=%s, module_id=%s",
                job_id,
                module_id,
            )
            return

        # Her adım için executor oluştur
        executors: dict[str, StepExecutor] = {}
        for step_def in step_definitions:
            executor = _build_executor(step_def.executor_class, self._providers)
            executors[step_def.step_key] = executor

        logger.info(
            "JobDispatcher: executor'lar kuruldu. job_id=%s, adımlar=%s",
            job_id,
            list(executors.keys()),
        )

        # Pipeline için yeni bir DB oturumu aç; runner bu oturumu pipeline boyunca kullanır.
        # Oturum, pipeline tamamlandığında ya da hata aldığında kapatılır.
        pipeline_db = self._session_factory()
        runner = PipelineRunner(
            db=pipeline_db,
            executors=executors,
            event_bus=self._event_bus,
        )

        async def _run_pipeline() -> None:
            try:
                await runner.run(job_id)
            finally:
                await pipeline_db.close()

        # Pipeline arka planda çalışır; create_task dönüşü awaited değil
        asyncio.create_task(_run_pipeline())

        logger.info("JobDispatcher: pipeline arka plan görevi başlatıldı. job_id=%s", job_id)
