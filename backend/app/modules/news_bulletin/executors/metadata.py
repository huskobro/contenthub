"""
Bülten metadata adımı executor'ı (BulletinMetadataExecutor) — M28.

Bülten script artifact'ından başlık, açıklama, etiketler üretir.
Settings snapshot'tan admin-managed prompt'ları okur.

Akış:
  1. bulletin_script.json artifact okunur
  2. Settings snapshot'tan metadata_title_rules okunur
  3. build_bulletin_metadata_prompt ile LLM mesajları hazırlanır
  4. resolve_and_invoke(LLM) çağrılır
  5. metadata.json artifact yazılır
"""

from __future__ import annotations

import json
import logging

from app.db.models import Job, JobStep
from app.jobs.executor import StepExecutor
from app.jobs.exceptions import StepExecutionError
from app.providers.capability import ProviderCapability
from app.providers.registry import ProviderRegistry
from app.providers.resolution import resolve_and_invoke
from app.providers.trace_helper import build_provider_trace

from ._helpers import _strip_markdown_json, _write_artifact, _read_artifact

logger = logging.getLogger(__name__)


class BulletinMetadataExecutor(StepExecutor):
    """
    Bülten metadata adımı executor'ı — M28.

    bulletin_script.json'dan platform için optimize edilmiş metadata üretir.
    Admin-managed prompt'ları settings snapshot'tan okur.
    """

    def __init__(self, registry: ProviderRegistry) -> None:
        self._registry = registry

    def step_key(self) -> str:
        return "metadata"

    async def execute(self, job: Job, step: JobStep) -> dict:
        """
        Metadata adımını çalıştırır.

        Args:
            job : Job ORM nesnesi.
            step: JobStep ORM nesnesi.

        Returns:
            dict: artifact_path, language, provider trace.

        Raises:
            StepExecutionError: Herhangi bir adımda hata oluştuğunda.
        """
        from app.modules.prompt_builder import build_bulletin_metadata_prompt
        from app.modules.language import resolve_language

        raw_input_str = getattr(job, "input_data_json", None) or "{}"
        try:
            raw_input: dict = json.loads(raw_input_str)
        except (json.JSONDecodeError, TypeError) as err:
            raise StepExecutionError(
                self.step_key(),
                f"Job input_data_json geçersiz JSON: {err}",
            )

        # Settings snapshot'tan prompt oku
        settings_snapshot = raw_input.get("_settings_snapshot", {})
        metadata_title_rules = settings_snapshot.get(
            "news_bulletin.prompt.metadata_title_rules", ""
        )
        default_language = settings_snapshot.get(
            "news_bulletin.config.default_language", "tr"
        )

        language_code = raw_input.get("language", default_language)
        try:
            language = resolve_language(language_code)
        except Exception as err:
            raise StepExecutionError(
                self.step_key(),
                f"Dil çözümlenemedi: {err}",
            )

        workspace_root = raw_input.get("workspace_root", "")
        if not workspace_root and hasattr(job, "workspace_path") and job.workspace_path:
            workspace_root = str(job.workspace_path)

        # bulletin_script.json oku
        script_data = _read_artifact(workspace_root, job.id, "bulletin_script.json")
        if script_data is None:
            raise StepExecutionError(
                self.step_key(),
                f"bulletin_script.json bulunamadı: job={job.id}. "
                "Script adımı önce tamamlanmış olmalı.",
            )

        if not metadata_title_rules:
            raise StepExecutionError(
                self.step_key(),
                "news_bulletin.prompt.metadata_title_rules ayarı boş. "
                "Admin panelden prompt ayarını yapılandırın.",
            )

        messages = build_bulletin_metadata_prompt(
            script_data=script_data,
            language=language,
            metadata_title_rules=metadata_title_rules,
        )

        try:
            output = await resolve_and_invoke(
                self._registry,
                ProviderCapability.LLM,
                {"messages": messages},
            )
        except Exception as err:
            raise StepExecutionError(self.step_key(), f"LLM çağrısı başarısız: {err}")

        raw_content: str = output.result.get("content", "")

        cleaned = _strip_markdown_json(raw_content)
        try:
            metadata_data: dict = json.loads(cleaned)
        except json.JSONDecodeError as err:
            raise StepExecutionError(
                self.step_key(),
                f"LLM yanıtı geçerli JSON değil: {err}. "
                f"Ham yanıt (ilk 300 karakter): {raw_content[:300]}",
            )

        metadata_data["language"] = language.value

        artifact_path = _write_artifact(
            workspace_root=workspace_root,
            job_id=job.id,
            filename="metadata.json",
            data=metadata_data,
        )

        logger.info(
            "BulletinMetadataExecutor: job=%s dil=%s artifact=%s",
            job.id,
            language.value,
            artifact_path,
        )

        trace_info = build_provider_trace(
            provider_name=output.trace.get("provider_id", "unknown"),
            provider_kind="llm",
            step_key=self.step_key(),
            success=True,
            latency_ms=output.trace.get("latency_ms", 0),
            model=output.trace.get("model"),
            input_tokens=output.trace.get("input_tokens"),
            output_tokens=output.trace.get("output_tokens"),
            extra={"resolution_role": output.trace.get("resolution_role")},
        )

        return {
            "artifact_path": artifact_path,
            "language": language.value,
            "provider": output.trace,
            "provider_trace": trace_info,
            "step": self.step_key(),
        }
