"""
Bülten senaryo adımı executor'ı (BulletinScriptExecutor) — M28.

Seçilmiş haber öğelerinden spiker tarzında narration metinleri üretir.
Settings snapshot'tan admin-managed prompt'ları okur.

Akış:
  1. bulletin_id → DB'den selected items + narration metinleri çekilir
  2. Settings snapshot'tan prompt key'ler okunur
  3. build_bulletin_script_prompt ile LLM mesajları hazırlanır
  4. resolve_and_invoke(LLM) çağrılır
  5. bulletin_script.json artifact yazılır

Edited narration desteği:
  - selected_item.edited_narration varsa → LLM'e "koru" talimatı verilir
  - edited_narration yoksa → LLM özetten üretir
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

from ._helpers import _strip_markdown_json, _write_artifact

logger = logging.getLogger(__name__)


class BulletinScriptExecutor(StepExecutor):
    """
    Bülten senaryo adımı executor'ı — M28.

    Seçilmiş haber öğelerini spiker tarzında narration metinlerine dönüştürür.
    Admin-managed prompt'ları settings snapshot'tan okur.
    """

    def __init__(self, registry: ProviderRegistry) -> None:
        self._registry = registry

    def step_key(self) -> str:
        return "script"

    async def execute(self, job: Job, step: JobStep) -> dict:
        """
        Script adımını çalıştırır.

        Args:
            job : Job ORM nesnesi.
            step: JobStep ORM nesnesi.

        Returns:
            dict: artifact_path, language, item_count, provider trace.

        Raises:
            StepExecutionError: Herhangi bir adımda hata oluştuğunda.
        """
        from app.modules.prompt_builder import build_bulletin_script_prompt
        from app.modules.language import resolve_language

        raw_input_str = getattr(job, "input_data_json", None) or "{}"
        try:
            raw_input: dict = json.loads(raw_input_str)
        except (json.JSONDecodeError, TypeError) as err:
            raise StepExecutionError(
                self.step_key(),
                f"Job input_data_json geçersiz JSON: {err}",
            )

        bulletin_id = raw_input.get("bulletin_id")
        if not bulletin_id:
            raise StepExecutionError(
                self.step_key(),
                "Job input_data_json içinde 'bulletin_id' eksik.",
            )

        # Settings snapshot'tan prompt'ları oku
        settings_snapshot = raw_input.get("_settings_snapshot", {})
        narration_system = settings_snapshot.get(
            "news_bulletin.prompt.narration_system", ""
        )
        narration_style = settings_snapshot.get(
            "news_bulletin.prompt.narration_style_rules", ""
        )
        anti_clickbait = settings_snapshot.get(
            "news_bulletin.prompt.anti_clickbait_rules", ""
        )
        word_limit = settings_snapshot.get(
            "news_bulletin.config.narration_word_limit_per_item", 80
        )
        default_tone = settings_snapshot.get(
            "news_bulletin.config.default_tone", "formal"
        )
        default_language = settings_snapshot.get(
            "news_bulletin.config.default_language", "tr"
        )
        target_duration = settings_snapshot.get(
            "news_bulletin.config.default_duration_seconds", 120
        )

        # Bulletin'den override edilen değerler (raw_input'tan)
        language_code = raw_input.get("language", default_language)
        tone = raw_input.get("tone", default_tone)
        duration = raw_input.get("target_duration_seconds", target_duration)

        try:
            language = resolve_language(language_code)
        except Exception as err:
            raise StepExecutionError(
                self.step_key(),
                f"Dil çözümlenemedi: {err}",
            )

        # Selected items — snapshot'tan al (start_production sırasında kaydedilmiş)
        selected_items_data = raw_input.get("selected_items", [])
        if not selected_items_data:
            raise StepExecutionError(
                self.step_key(),
                "Seçilmiş haber öğesi bulunamadı (selected_items boş).",
            )

        # LLM için item listesi hazırla
        items_for_prompt = []
        for i, item in enumerate(selected_items_data):
            items_for_prompt.append({
                "item_number": i + 1,
                "headline": item.get("headline", item.get("title", "")),
                "summary": item.get("summary", ""),
                "edited_narration": item.get("edited_narration"),
            })

        if not narration_system:
            raise StepExecutionError(
                self.step_key(),
                "news_bulletin.prompt.narration_system ayarı boş. "
                "Admin panelden prompt ayarını yapılandırın.",
            )

        messages = build_bulletin_script_prompt(
            items=items_for_prompt,
            language=language,
            narration_system_prompt=narration_system,
            narration_style_rules=narration_style,
            anti_clickbait_rules=anti_clickbait,
            word_limit_per_item=int(word_limit) if word_limit else 80,
            target_duration_seconds=int(duration) if duration else 120,
            tone=tone,
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
            script_data: dict = json.loads(cleaned)
        except json.JSONDecodeError as err:
            raise StepExecutionError(
                self.step_key(),
                f"LLM yanıtı geçerli JSON değil: {err}. "
                f"Ham yanıt (ilk 300 karakter): {raw_content[:300]}",
            )

        script_data["language"] = language.value
        script_data["bulletin_id"] = bulletin_id

        workspace_root = raw_input.get("workspace_root", "")
        if not workspace_root and hasattr(job, "workspace_path") and job.workspace_path:
            workspace_root = str(job.workspace_path)

        artifact_path = _write_artifact(
            workspace_root=workspace_root,
            job_id=job.id,
            filename="bulletin_script.json",
            data=script_data,
        )

        item_count = len(script_data.get("items", []))
        logger.info(
            "BulletinScriptExecutor: job=%s dil=%s haber=%d artifact=%s",
            job.id,
            language.value,
            item_count,
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
            "item_count": item_count,
            "bulletin_id": bulletin_id,
            "provider": output.trace,
            "provider_trace": trace_info,
            "step": self.step_key(),
        }
