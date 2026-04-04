"""
Publish Step Executor — M7-C3 (hardening: M7-C3.1).

PublishAdapter zincirini (upload + activate) servis katmanına bağlar.
Job pipeline'ının "publish" step'i bu executor tarafından çalıştırılır.

Tasarım kuralları (M7):
  - Adaptör servis state'ine doğrudan dokunmaz.
    Tüm durum geçişleri service.mark_published / service.mark_failed üzerinden geçer.
  - Her platform event (upload başarısı, activate başarısı, hata) PublishLog'a
    publish_service.append_platform_event() üzerinden yazılır.
    Executor doğrudan ORM (PublishLog()) yaratmaz; audit trail tamamen
    servis katmanından geçer.
  - Partial failure semantiği korunur:
    upload başarılı → platform_video_id kaydedilir (_save_upload_result)
    activate başarısız → platform_video_id korunur; yalnızca activate retry edilebilir.
  - OPERATOR_CONFIRM idempotency:
    PublishRecord zaten 'published' durumundaysa step tekrar çalıştırılmaz.
    Bu kontrol executor içinde yapılır; pipeline'ın re-entry'sini güvenli kılar.
  - Executor, PublishRecord'u step.artifact_refs_json veya job.input_data_json üzerinden
    bulur: "publish_record_id" key'i.

Video dosyası çözümü (öncelik sırası):
  1. step.artifact_refs_json → "video_path"
  2. job.input_data_json    → "video_path"
  3. job.input_data_json    → "render_output_path"
  4. DB'den "render" step'inin provider_trace_json → "output_path"
     (DB erişimi async; session üzerinden çekilir)

platform_url kaynağı:
  mark_published() çağrısında platform_url, adapter.activate() sonucundan
  gelen result.platform_url kullanılır. Sabit string üretilmez.

Hata yönetimi:
  retryable=True  → StepExecutionError(retryable=True) — pipeline retry edebilir
  retryable=False → StepExecutionError(retryable=False) — operatör müdahalesi gerekir
  Her hata _log_platform_event() ile denetim izine yazılır.
"""

import json
import logging
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Job, JobStep, PublishRecord
from app.jobs.executor import StepExecutor
from app.jobs.exceptions import StepExecutionError
from app.publish import service as publish_service
from app.publish.adapter import PublishAdapterError, PublishAdapterResult
from app.publish.enums import PublishStatus
from app.publish.registry import publish_adapter_registry, PublishAdapterNotRegisteredError

logger = logging.getLogger(__name__)


class PublishStepExecutor(StepExecutor):
    """
    Publish adımı executor'ı.

    Pipeline step_key: "publish"

    step.artifact_refs_json veya job.input_data_json'dan alınan publish_record_id
    ile ilgili PublishRecord'u bulur; adaptör üzerinden upload + activate
    zincirini çalıştırır; sonucu servis katmanı üzerinden kaydeder.

    Inject:
        db : AsyncSession — servis fonksiyonları için gerekli.
              PipelineRunner bu session'ı sağlar.
    """

    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    def step_key(self) -> str:
        return "publish"

    async def execute(self, job: Job, step: JobStep) -> dict:
        """
        Publish zincirini çalıştırır.

        Returns:
            dict — provider_trace_json olarak kaydedilir:
            {
                "publish_record_id": str,
                "platform_video_id": str,
                "platform_url": str,
                "upload_completed": bool,
                "activate_completed": bool,
            }

        Raises:
            StepExecutionError — tüm hatalar bu türe sarılır.
        """
        # 1. publish_record_id bul
        publish_record_id = self._resolve_publish_record_id(job, step)
        if not publish_record_id:
            raise StepExecutionError(
                "publish",
                "publish_record_id bulunamadı. "
                "step.artifact_refs_json veya job.input_data_json içinde 'publish_record_id' gerekli.",
                retryable=False,
            )

        # 2. PublishRecord'u oku
        try:
            record = await publish_service.get_publish_record(
                session=self._db, record_id=publish_record_id
            )
        except Exception as exc:
            raise StepExecutionError(
                "publish",
                f"PublishRecord okunamadı (id={publish_record_id}): {exc}",
                retryable=False,
            ) from exc

        # 3. OPERATOR_CONFIRM idempotency:
        #    Kayıt zaten 'published' ise bu step daha önce başarıyla tamamlanmış demektir.
        #    Tekrar upload/activate yapılmaz.
        if record.status == PublishStatus.PUBLISHED.value:
            logger.info(
                "PublishStepExecutor: idempotency guard — publish_record_id=%s zaten 'published', "
                "step atlanıyor. job=%s",
                publish_record_id, job.id,
            )
            return {
                "publish_record_id": publish_record_id,
                "platform_video_id": record.platform_video_id,
                "platform_url": record.platform_url,
                "upload_completed": True,
                "activate_completed": True,
                "idempotent_skip": True,
            }

        # 4. Platform adaptörünü bul
        platform = record.platform
        try:
            adapter = publish_adapter_registry.get(platform)
        except PublishAdapterNotRegisteredError as exc:
            raise StepExecutionError(
                "publish",
                f"Platform adaptörü kayıtlı değil: '{platform}'. "
                f"Publish yapılamaz. Kayıtlı: {publish_adapter_registry.list_registered()}",
                retryable=False,
            ) from exc

        # 5. Video dosyasını bul (DB erişimi içerebilir — await gerekli)
        video_path = await self._resolve_video_path(job, step)
        if not video_path:
            raise StepExecutionError(
                "publish",
                "Video dosyası yolu bulunamadı. "
                "step.artifact_refs_json['video_path'], job.input_data_json['video_path'/'render_output_path'] "
                "veya render step provider_trace_json['output_path'] gerekli.",
                retryable=False,
            )

        # 6. Payload hazırlığı (title, description, tags, vb.)
        payload = self._resolve_payload(record)

        # 7. Upload zinciri
        # Upload kısmını yalnızca platform_video_id henüz yoksa çalıştır.
        # Bu, partial failure durumunda upload tekrarını engeller.
        platform_video_id: Optional[str] = record.platform_video_id  # önceki upload varsa koru

        if not platform_video_id:
            platform_video_id = await self._do_upload(
                publish_record_id=publish_record_id,
                adapter=adapter,
                video_path=video_path,
                payload=payload,
                job_id=job.id,
            )
            upload_completed = True
        else:
            logger.info(
                "PublishStepExecutor: upload atlanıyor — platform_video_id zaten mevcut: %s "
                "(publish_record_id=%s, job=%s)",
                platform_video_id, publish_record_id, job.id,
            )
            upload_completed = True  # önceki run'da tamamlandı

        # 8. Activate zinciri — gerçek platform_url döner
        scheduled_at: Optional[datetime] = record.scheduled_at
        activate_result = await self._do_activate(
            publish_record_id=publish_record_id,
            platform_video_id=platform_video_id,
            adapter=adapter,
            scheduled_at=scheduled_at,
            job_id=job.id,
        )

        # 9. mark_published — platform_url adapter.activate() sonucundan gelir (sabit string değil)
        platform_url = activate_result.platform_url
        try:
            updated = await publish_service.mark_published(
                session=self._db,
                record_id=publish_record_id,
                platform_video_id=platform_video_id,
                platform_url=platform_url,
                result_json=json.dumps({
                    "platform_video_id": platform_video_id,
                    "platform_url": platform_url,
                }),
                actor_id="system",
                note="PublishStepExecutor: yayınlama tamamlandı.",
            )
        except Exception as exc:
            raise StepExecutionError(
                "publish",
                f"mark_published başarısız (publish_record_id={publish_record_id}): {exc}",
                retryable=True,
            ) from exc

        logger.info(
            "PublishStepExecutor tamamlandı: publish_record_id=%s video_id=%s url=%s job=%s",
            publish_record_id, platform_video_id, updated.platform_url, job.id,
        )
        return {
            "publish_record_id": publish_record_id,
            "platform_video_id": platform_video_id,
            "platform_url": updated.platform_url,
            "upload_completed": upload_completed,
            "activate_completed": True,
        }

    # ---------------------------------------------------------------------------
    # Upload yardımcısı
    # ---------------------------------------------------------------------------

    async def _do_upload(
        self,
        publish_record_id: str,
        adapter,
        video_path: str,
        payload: dict,
        job_id: str,
    ) -> str:
        """
        Adaptör upload() çağrısını yapar.

        Başarılı olunca platform_video_id döner.
        Başarısız olunca denetim izine platform_event yazar ve StepExecutionError fırlatır.
        """
        try:
            result = await adapter.upload(
                publish_record_id=publish_record_id,
                video_path=video_path,
                payload=payload,
            )
        except PublishAdapterError as exc:
            await self._log_platform_event(
                publish_record_id=publish_record_id,
                event="upload_failed",
                detail={
                    "error": str(exc),
                    "error_code": exc.error_code,
                    "retryable": exc.retryable,
                },
            )
            await self._mark_failed_safe(
                publish_record_id=publish_record_id,
                error_message=str(exc),
                error_code=exc.error_code,
            )
            raise StepExecutionError(
                "publish",
                f"YouTube upload başarısız (publish_record_id={publish_record_id}): {exc}",
                retryable=exc.retryable,
            ) from exc

        platform_video_id = result.platform_video_id
        await self._log_platform_event(
            publish_record_id=publish_record_id,
            event="upload_completed",
            detail={"platform_video_id": platform_video_id},
        )

        # platform_video_id'yi PublishRecord'a yaz
        # (activate henüz yapılmadı — partial failure için ara kayıt)
        await self._save_upload_result(
            publish_record_id=publish_record_id,
            platform_video_id=platform_video_id,
        )

        logger.info(
            "PublishStepExecutor upload tamamlandı: video_id=%s publish_record_id=%s job=%s",
            platform_video_id, publish_record_id, job_id,
        )
        return platform_video_id

    # ---------------------------------------------------------------------------
    # Activate yardımcısı
    # ---------------------------------------------------------------------------

    async def _do_activate(
        self,
        publish_record_id: str,
        platform_video_id: str,
        adapter,
        scheduled_at: Optional[datetime],
        job_id: str,
    ) -> PublishAdapterResult:
        """
        Adaptör activate() çağrısını yapar.

        Returns:
            PublishAdapterResult — platform_url dahil gerçek adapter sonucu.
            Çağıran bu sonucu mark_published()'a geçirmelidir.

        Başarısız olunca denetim izine yazar, mark_failed çağırır,
        StepExecutionError fırlatır.
        """
        try:
            result = await adapter.activate(
                publish_record_id=publish_record_id,
                platform_video_id=platform_video_id,
                scheduled_at=scheduled_at,
            )
        except PublishAdapterError as exc:
            await self._log_platform_event(
                publish_record_id=publish_record_id,
                event="activate_failed",
                detail={
                    "platform_video_id": platform_video_id,
                    "error": str(exc),
                    "error_code": exc.error_code,
                    "retryable": exc.retryable,
                },
            )
            await self._mark_failed_safe(
                publish_record_id=publish_record_id,
                error_message=str(exc),
                error_code=exc.error_code,
            )
            raise StepExecutionError(
                "publish",
                f"YouTube activate başarısız (publish_record_id={publish_record_id}, "
                f"video_id={platform_video_id}): {exc}",
                retryable=exc.retryable,
            ) from exc

        await self._log_platform_event(
            publish_record_id=publish_record_id,
            event="activate_completed",
            detail={
                "platform_video_id": platform_video_id,
                "platform_url": result.platform_url,
            },
        )
        logger.info(
            "PublishStepExecutor activate tamamlandı: video_id=%s url=%s publish_record_id=%s job=%s",
            platform_video_id, result.platform_url, publish_record_id, job_id,
        )
        return result

    # ---------------------------------------------------------------------------
    # Yardımcı: platform event log — servis katmanı üzerinden
    # ---------------------------------------------------------------------------

    async def _log_platform_event(
        self,
        publish_record_id: str,
        event: str,
        detail: Optional[dict] = None,
    ) -> None:
        """
        Platform event'i PublishLog'a publish_service.append_platform_event() üzerinden yazar.

        Executor doğrudan PublishLog ORM nesnesi yaratmaz.
        Audit trail tamamen servis katmanından geçer.
        """
        await publish_service.append_platform_event(
            session=self._db,
            publish_record_id=publish_record_id,
            event=event,
            detail=detail,
        )

    # ---------------------------------------------------------------------------
    # Yardımcı: upload sonrası ara kayıt (partial failure için)
    # ---------------------------------------------------------------------------

    async def _save_upload_result(
        self, publish_record_id: str, platform_video_id: str
    ) -> None:
        """
        Upload tamamlanınca platform_video_id'yi PublishRecord'a yazar.

        activate henüz yapılmamıştır. Bu ara kayıt sayesinde activate
        başarısız olursa upload yeniden yapılmaz — partial failure semantiği.
        """
        try:
            result = await self._db.execute(
                select(PublishRecord).where(PublishRecord.id == publish_record_id)
            )
            record = result.scalar_one_or_none()
            if record is not None:
                record.platform_video_id = platform_video_id
                await self._db.flush()
        except Exception as exc:
            logger.warning(
                "PublishStepExecutor: platform_video_id ara kaydı başarısız "
                "(publish_record_id=%s): %s",
                publish_record_id, exc,
            )

    # ---------------------------------------------------------------------------
    # Yardımcı: mark_failed güvenli sarıcı
    # ---------------------------------------------------------------------------

    async def _mark_failed_safe(
        self,
        publish_record_id: str,
        error_message: str,
        error_code: Optional[str] = None,
    ) -> None:
        """
        publishing → failed geçişi için mark_failed çağırır.

        Kayıt henüz 'publishing' durumunda değilse uyarı loglar, exception fırlatmaz.
        """
        try:
            await publish_service.mark_failed(
                session=self._db,
                record_id=publish_record_id,
                error_message=error_message,
                error_code=error_code,
                actor_id="system",
            )
        except Exception as exc:
            logger.warning(
                "PublishStepExecutor: mark_failed çağrısı başarısız "
                "(publish_record_id=%s): %s",
                publish_record_id, exc,
            )

    # ---------------------------------------------------------------------------
    # Çözümleme yardımcıları
    # ---------------------------------------------------------------------------

    def _resolve_publish_record_id(self, job: Job, step: JobStep) -> Optional[str]:
        """
        publish_record_id'yi şu kaynaklardan sırayla arar:
          1. step.artifact_refs_json
          2. job.input_data_json
        """
        for source in (step.artifact_refs_json, job.input_data_json):
            if not source:
                continue
            try:
                data = json.loads(source)
                if isinstance(data, dict) and "publish_record_id" in data:
                    return data["publish_record_id"]
            except (json.JSONDecodeError, TypeError):
                continue
        return None

    async def _resolve_video_path(self, job: Job, step: JobStep) -> Optional[str]:
        """
        Video dosyası yolunu şu kaynaklardan sırayla arar:

          1. step.artifact_refs_json → "video_path"
          2. job.input_data_json    → "video_path"
          3. job.input_data_json    → "render_output_path"
          4. DB'den "render" step'inin provider_trace_json → "output_path"
             (PipelineRunner render step'ini tamamlamış; trace'de output_path vardır)

        4. adım gerçek DB erişimi yapar; bu yüzden method async'tir.
        """
        # 1–3: JSON kaynaklarından ara
        for source in (step.artifact_refs_json, job.input_data_json):
            if not source:
                continue
            try:
                data = json.loads(source)
                if isinstance(data, dict):
                    if "video_path" in data:
                        return data["video_path"]
                    if "render_output_path" in data:
                        return data["render_output_path"]
            except (json.JSONDecodeError, TypeError):
                continue

        # 4: DB'den render step'ini çek
        try:
            result = await self._db.execute(
                select(JobStep).where(
                    JobStep.job_id == job.id,
                    JobStep.step_key == "render",
                )
            )
            render_step = result.scalar_one_or_none()
            if render_step and render_step.provider_trace_json:
                trace = json.loads(render_step.provider_trace_json)
                if isinstance(trace, dict) and "output_path" in trace:
                    return trace["output_path"]
        except Exception as exc:
            logger.warning(
                "PublishStepExecutor: render step trace okunamadı (job=%s): %s",
                job.id, exc,
            )

        return None

    def _resolve_payload(self, record) -> dict:
        """
        Publish payload'ını PublishRecord.payload_json'dan okur.
        Boşsa minimal defaults döner.
        """
        if record.payload_json:
            try:
                return json.loads(record.payload_json)
            except (json.JSONDecodeError, TypeError):
                pass
        return {"title": "ContentHub Video", "description": "", "tags": []}
