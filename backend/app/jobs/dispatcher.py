"""
Job Dispatcher (M2-C6 / M3-C1 / M3-C2)

Job yaratıldıktan sonra pipeline'ı arka planda başlatır.
Tüm orchestration mantığı burada toplanır — service.py'ye veya pipeline.py'ye sızmaz.

Sorumluluğu:
  - Job ve modül tanımını alır
  - ProviderRegistry üzerinden her adım için ilgili provider'ı çözümler
  - Her adım için ilgili executor instance'ını oluşturur
  - PipelineRunner'ı kurar
  - asyncio.create_task ile pipeline'ı arka planda çalıştırır

Bu dosyada YOKTUR:
  - DB CRUD işlemleri (service.py)
  - Adım döngüsü / state machine (pipeline.py)
  - HTTP request/response (router.py)
  - Provider kayıt mantığı (providers/registry.py)

M3-C1: _build_executor geçici köprüsü kaldırıldı.
       JobDispatcher artık providers dict değil ProviderRegistry alıyor.
M3-C2: LLM/TTS executor'ları registry zincirini alıyor (get_primary → get_chain).
       resolve_and_invoke executor içinden çağrılır — fallback zinciri tam aktif.
M4-C1: SubtitleStepExecutor registry alıyor.
       WHISPER provider kayıtlıysa kelime-düzeyi timing; yoksa cursor-tabanlı timing.
"""

import asyncio
import logging
from typing import Optional, TYPE_CHECKING

from app.jobs import service
from app.jobs.executor import StepExecutor
from app.jobs.pipeline import PipelineRunner
from app.modules.registry import ModuleRegistry
from app.modules.templates.resolver import resolve_template_context
from app.modules.standard_video.executors import (
    ScriptStepExecutor,
    MetadataStepExecutor,
    TTSStepExecutor,
    VisualsStepExecutor,
    SubtitleStepExecutor,
    CompositionStepExecutor,
)
from app.providers.capability import ProviderCapability
from app.providers.registry import ProviderRegistry
from app.publish.executor import PublishStepExecutor

if TYPE_CHECKING:
    from app.sse.bus import EventBus

logger = logging.getLogger(__name__)


def _build_executor_from_registry(
    executor_class: type,
    registry: ProviderRegistry,
    pipeline_db=None,
) -> StepExecutor:
    """
    Executor sınıfına göre registry'den provider çözümler ve instance döner.

    LLM gerektiren executor'lar: ScriptStepExecutor, MetadataStepExecutor
      → registry zincirini alır; resolve_and_invoke executor içinden çağrılır.
    TTS gerektiren executor'lar: TTSStepExecutor
      → registry zincirini alır; resolve_and_invoke executor içinden çağrılır.
    VISUALS gerektiren executor'lar: VisualsStepExecutor
      → registry zincirini alır; executor sahne başına kendi fallback döngüsünü çalıştırır.
    WHISPER gerektiren executor'lar: SubtitleStepExecutor
      → registry alır; Whisper provider kayıtlıysa kelime-düzeyi timing kullanır,
        yoksa cursor-tabanlı timing'e otomatik düşer (M4-C1).
    Publish gerektiren executor'lar: PublishStepExecutor
      → pipeline_db session alır; publish_adapter_registry üzerinden adaptöre erişir.
    Provider gerektirmeyen executor'lar: CompositionStepExecutor

    Args:
        executor_class: Executor'ın sınıf nesnesi.
        registry      : Kayıtlı provider'ları içeren registry.
        pipeline_db   : AsyncSession — PublishStepExecutor için zorunlu.

    Returns:
        Executor instance'ı.
    """
    if executor_class is ScriptStepExecutor:
        return ScriptStepExecutor(
            registry=registry,
        )
    if executor_class is MetadataStepExecutor:
        return MetadataStepExecutor(
            registry=registry,
        )
    if executor_class is TTSStepExecutor:
        return TTSStepExecutor(
            registry=registry,
        )
    if executor_class is VisualsStepExecutor:
        visuals_chain = registry.get_chain(ProviderCapability.VISUALS)
        return VisualsStepExecutor(providers=visuals_chain)

    if executor_class is SubtitleStepExecutor:
        # Whisper provider kayıtlıysa kelime-düzeyi timing aktif olur; yoksa cursor-tabanlı.
        return SubtitleStepExecutor(registry=registry)

    if executor_class is PublishStepExecutor:
        if pipeline_db is None:
            raise ValueError(
                "PublishStepExecutor için pipeline_db (AsyncSession) gereklidir."
            )
        return PublishStepExecutor(db=pipeline_db)

    # Provider gerektirmeyen executor'lar (CompositionStepExecutor)
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
        registry: ProviderRegistry,
    ) -> None:
        """
        Args:
            db_session_factory: Yeni async DB session üretmek için factory.
            module_registry   : Modül tanımlarını içeren registry.
            event_bus         : SSE event bus (None ise event yayınlanmaz).
            registry          : Provider kayıt defteri.
        """
        self._session_factory = db_session_factory
        self._module_registry = module_registry
        self._event_bus = event_bus
        self._provider_registry = registry
        # Arka plan görevlerini tutan set — GC'den koruması için referans tutulur.
        # Görev tamamlanınca kendini setten çıkarır.
        self._background_tasks: set[asyncio.Task] = set()

    async def dispatch(self, job_id: str) -> None:
        """
        Job için executor'ları kurar ve pipeline'ı arka planda başlatır.

        Adımlar:
          1. Job'u alır ve module_id'yi öğrenir.
          2. module_registry'den adım tanımlarını alır.
          3. Her adım için provider_registry üzerinden executor instance'ı oluşturur.
          4. PipelineRunner kurar.
          5. asyncio.create_task ile pipeline'ı arka planda çalıştırır.

        Args:
            job_id: Çalıştırılacak job'un kimliği.
        """
        # Kısa süreli okuma için oturum aç; context manager yerine manuel close kullan.
        db = self._session_factory()
        try:
            job = await service.get_job(db, job_id)
        finally:
            await db.close()

        if job is None:
            logger.error("JobDispatcher: job bulunamadı, dispatch iptal. job_id=%s", job_id)
            return

        module_id = job.module_type

        step_definitions = self._module_registry.get_steps(module_id)
        if not step_definitions:
            logger.warning(
                "JobDispatcher: modül için adım tanımı bulunamadı, dispatch iptal. "
                "job_id=%s, module_id=%s",
                job_id,
                module_id,
            )
            return

        # Template context resolution (M11)
        template_context: Optional[dict] = None
        if getattr(job, "template_id", None):
            try:
                resolve_db = self._session_factory()
                try:
                    template_context = await resolve_template_context(
                        resolve_db, job.template_id
                    )
                finally:
                    await resolve_db.close()
                if template_context:
                    logger.info(
                        "JobDispatcher: template context resolved. job_id=%s, template=%s",
                        job_id, template_context.get("template_name"),
                    )
            except Exception as exc:
                logger.warning(
                    "JobDispatcher: template resolution failed, continuing without template. "
                    "job_id=%s, error=%s", job_id, exc,
                )

        # Pipeline için yeni bir DB oturumu aç; runner ve PublishStepExecutor bu oturumu kullanır.
        pipeline_db = self._session_factory()

        # Her adım için provider_registry üzerinden executor oluştur
        executors: dict[str, StepExecutor] = {}
        for step_def in step_definitions:
            executor = _build_executor_from_registry(
                step_def.executor_class,
                self._provider_registry,
                pipeline_db=pipeline_db,
            )
            executors[step_def.step_key] = executor

        logger.info(
            "JobDispatcher: executor'lar kuruldu. job_id=%s, adımlar=%s",
            job_id,
            list(executors.keys()),
        )
        runner = PipelineRunner(
            db=pipeline_db,
            executors=executors,
            event_bus=self._event_bus,
            template_context=template_context,
        )

        async def _run_pipeline() -> None:
            try:
                await runner.run(job_id)
            finally:
                await pipeline_db.close()

        # Task referansı set'te tutulur — GC'den korunmak için.
        task = asyncio.create_task(_run_pipeline())
        self._background_tasks.add(task)
        task.add_done_callback(self._background_tasks.discard)

        logger.info("JobDispatcher: pipeline arka plan görevi başlatıldı. job_id=%s", job_id)
