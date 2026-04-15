"""
ProductReviewPublishStepExecutor — Faz F.

product_review modulu publish adimi iki katmandan olusur:
  1. Product-specific guards: affiliate disclosure + price disclaimer
     metadata'da ZORUNLU. Metadata'dan eksikse publish basarisiz olur.
  2. Publish review gate: `allow_publish_without_review=True` ayarlanmadikca
     PublishRecord bulunmali ve review yapilmis olmali. Gate geciliyorsa
     audit trail'e kaydedilir (publish_review_audit.json).

Bu executor core `app.publish.executor.PublishStepExecutor`'i delegate EDER —
ama delege etmeden ONCE metadata ve gate kontrolleri yapilir.

operator_confirm idempotency:
  - Pipeline bu step'i ilk `operator_confirm` donene kadar durur.
  - PublishRecord olusturulup review tamamlandiginda pipeline devam eder.
  - Bu executor sadece PublishRecord hazirsa calisir; yoksa explicit hata.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Job, JobStep
from app.jobs.executor import StepExecutor
from app.jobs.exceptions import StepExecutionError
from app.modules.product_review.confidence import resolve_setting
from app.publish.executor import PublishStepExecutor as _CorePublishStepExecutor

from ._helpers import _artifact_dir, _read_artifact, _write_artifact

logger = logging.getLogger(__name__)

_METADATA_ARTIFACT = "product_review_metadata.json"
_AUDIT_ARTIFACT = "publish_review_audit.json"


def _assert_affiliate_and_disclaimer(metadata: dict) -> None:
    """
    affiliate + fiyat disclaimer + TOS (disclaimer_applied) metadata
    uzerinde zorunlu alanlari dogrular. Eksikse StepExecutionError
    firlatir (retryable=False; operator metadata'yi duzeltmeli).

    Kural:
      - legal.disclosure_applied: True  -> affiliate disclosure eklenmis
      - legal.disclaimer_applied: True  -> price disclaimer eklenmis
      - affiliate_enabled=True ise affiliate_url_included=True olmali.
    """
    legal = (metadata or {}).get("legal") or {}
    disclosure_applied = bool(legal.get("disclosure_applied"))
    disclaimer_applied = bool(legal.get("disclaimer_applied"))
    affiliate_enabled = bool(legal.get("affiliate_enabled"))
    affiliate_url_included = bool(legal.get("affiliate_url_included"))

    missing: list[str] = []
    if not disclosure_applied:
        missing.append("affiliate_disclosure (legal.disclosure_applied=False)")
    if not disclaimer_applied:
        missing.append("price_disclaimer (legal.disclaimer_applied=False)")
    if affiliate_enabled and not affiliate_url_included:
        missing.append(
            "affiliate_url_included=False (affiliate_enabled=True ise URL zorunlu)"
        )

    if missing:
        raise StepExecutionError(
            "publish",
            (
                "product_review publish: yayin sart listesi karsilanmadi — "
                + "; ".join(missing)
                + ". Metadata adimini yeniden calistirin veya ayarlari duzeltin."
            ),
            retryable=False,
        )


def _write_publish_audit(
    workspace_root: str,
    job_id: str,
    *,
    run_mode: str,
    allow_publish_without_review: bool,
    settings_snapshot: dict,
    publish_record_id: Optional[str],
) -> None:
    """
    allow_publish_without_review=True durumunda audit trail yazar.
    Her durumda audit dosyasi tutulur (kim, ne zaman, hangi settings ile).
    """
    payload = {
        "job_id": job_id,
        "run_mode": run_mode,
        "allow_publish_without_review": allow_publish_without_review,
        "publish_record_id": publish_record_id,
        "recorded_at": datetime.now(timezone.utc).isoformat(),
        "min_confidence": resolve_setting(
            settings_snapshot,
            "product_review.full_auto.min_confidence",
        ),
        "preview_l1_required": resolve_setting(
            settings_snapshot,
            "product_review.gate.preview_l1_required",
        ),
        "preview_l2_required": resolve_setting(
            settings_snapshot,
            "product_review.gate.preview_l2_required",
        ),
    }
    _write_artifact(workspace_root, job_id, _AUDIT_ARTIFACT, payload)


class ProductReviewPublishStepExecutor(StepExecutor):
    """
    step_key = "publish"

    Kurallar:
      - product_review_metadata.json'da affiliate + price disclaimer ZORUNLU.
      - publish_record_id yoksa retryable=False hata (operator review yapmadi).
      - allow_publish_without_review=True ise audit dosyasi yazilir ve
        core PublishStepExecutor delete edilir.
      - Idempotency core executor'da "already published" guard ile saglanir.
    """

    def __init__(self, db: AsyncSession) -> None:
        self._delegate = _CorePublishStepExecutor(db=db)

    def step_key(self) -> str:
        return "publish"

    async def execute(self, job: Job, step: JobStep) -> dict:
        raw_input_str = getattr(job, "input_data_json", None) or "{}"
        try:
            raw_input: dict = json.loads(raw_input_str)
        except (json.JSONDecodeError, TypeError) as err:
            raise StepExecutionError(
                self.step_key(),
                f"Job input_data_json gecersiz JSON: {err}",
                retryable=False,
            )

        workspace_root = getattr(job, "workspace_path", None) or ""
        settings_snapshot = raw_input.get("_settings_snapshot", {}) or {}
        run_mode = (raw_input.get("run_mode") or "semi_auto").strip().lower()
        allow_pub = bool(
            resolve_setting(
                settings_snapshot,
                "product_review.full_auto.allow_publish_without_review",
            )
        )

        # 1) Metadata guard — affiliate + disclaimer
        metadata = _read_artifact(workspace_root, job.id, _METADATA_ARTIFACT)
        if not metadata:
            raise StepExecutionError(
                self.step_key(),
                "product_review publish: metadata artifact bulunamadi. "
                "metadata adimi tamamlanmadan publish calismaz.",
                retryable=False,
            )
        _assert_affiliate_and_disclaimer(metadata)

        # 2) Publish review guard
        publish_record_id = self._extract_publish_record_id(job, step, raw_input)
        if not publish_record_id and not allow_pub:
            raise StepExecutionError(
                self.step_key(),
                (
                    "product_review publish: publish_record_id eksik. "
                    "Operator publish review'unu tamamlamadan yayin yapilamaz. "
                    "Full-auto bypass icin "
                    "product_review.full_auto.allow_publish_without_review=True "
                    "ayarlanmali (audit edilir)."
                ),
                retryable=False,
            )

        # 3) Audit yazimi (her durumda)
        _write_publish_audit(
            workspace_root,
            job.id,
            run_mode=run_mode,
            allow_publish_without_review=allow_pub,
            settings_snapshot=settings_snapshot,
            publish_record_id=publish_record_id,
        )

        # 4) allow_publish_without_review=True + publish_record_id yoksa
        #    yayin yapmaz, sadece audit kaydi kalir (operator manuel yapar).
        if not publish_record_id:
            logger.warning(
                "ProductReviewPublishStepExecutor: allow_publish_without_review=True "
                "ama publish_record_id yok — audit yazildi, yayin atlanacak. job=%s",
                job.id,
            )
            return {
                "status": "audited_only",
                "reason": "no_publish_record_id_but_audit_allowed",
                "module": "product_review",
                "run_mode": run_mode,
                "allow_publish_without_review": allow_pub,
            }

        # 5) Core publish'e delege
        result = await self._delegate.execute(job, step)
        if isinstance(result, dict):
            result.setdefault("module", "product_review")
            result["product_review_gate"] = {
                "run_mode": run_mode,
                "allow_publish_without_review": allow_pub,
                "publish_record_id": publish_record_id,
                "affiliate_disclosure": True,
                "price_disclaimer": True,
            }
        return result

    @staticmethod
    def _extract_publish_record_id(
        job: Job, step: JobStep, raw_input: dict
    ) -> Optional[str]:
        """
        PublishRecord id'yi step.artifact_refs_json > job.input_data_json
        oncelik sirasiyla arar.
        """
        # step.artifact_refs_json
        refs_str = getattr(step, "artifact_refs_json", None)
        if refs_str:
            try:
                refs = json.loads(refs_str)
                if isinstance(refs, dict) and refs.get("publish_record_id"):
                    return str(refs["publish_record_id"])
            except (json.JSONDecodeError, TypeError):
                pass
        # raw_input
        if raw_input.get("publish_record_id"):
            return str(raw_input["publish_record_id"])
        return None
