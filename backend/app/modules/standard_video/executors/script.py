"""
Senaryo adımı executor'ı (ScriptStepExecutor).

Konu → StepExecutionContext → LLM prompt → resolve_and_invoke(LLM) → script.json artifact.

M3-C2: llm_provider → registry alıyor.
       resolve_and_invoke üzerinden fallback zinciri tam aktif.
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

from ._helpers import _strip_markdown_json, _write_artifact

logger = logging.getLogger(__name__)


class ScriptStepExecutor(StepExecutor):
    """
    Senaryo adımı executor'ı.

    Konu → StepExecutionContext → LLM prompt → resolve_and_invoke(LLM) → script.json artifact.

    resolve_and_invoke üzerinden primary LLM çağrılır; başarısızsa fallback zinciri denenir.
    """

    def __init__(self, registry: ProviderRegistry) -> None:
        """
        Args:
            registry: Provider kayıt defteri — resolve_and_invoke bu registry ile çağrılır.
        """
        self._registry = registry

    def step_key(self) -> str:
        """Bu executor'ın sorumlu olduğu adım anahtarı."""
        return "script"

    async def execute(self, job: Job, step: JobStep) -> dict:
        """
        Script adımını çalıştırır.

        Adımlar:
          1. Job input_data_json'dan ham input okunur.
          2. StepExecutionContext oluşturulur — dil resolve edilir.
          3. build_script_prompt ile LLM mesajları hazırlanır.
          4. KieAiProvider.invoke() çağrılır.
          5. Yanıt JSON parse edilir.
          6. workspace/artifacts/script.json dosyasına yazılır.
          7. Provider trace ile birlikte sonuç döner.

        Args:
            job : Job ORM nesnesi.
            step: JobStep ORM nesnesi.

        Returns:
            dict: artifact_path, language, scene_count, provider trace.

        Raises:
            StepExecutionError: Herhangi bir adımda hata oluştuğunda.
        """
        from app.modules.step_context import StepExecutionContext
        from app.modules.prompt_builder import build_script_prompt

        raw_input_str = getattr(job, "input_data_json", None) or "{}"
        try:
            raw_input: dict = json.loads(raw_input_str)
        except (json.JSONDecodeError, TypeError) as err:
            raise StepExecutionError(
                self.step_key(),
                f"Job input_data_json geçersiz JSON: {err}",
            )

        if not raw_input.get("topic"):
            raise StepExecutionError(
                self.step_key(),
                "Job input_data_json içinde 'topic' alanı eksik veya boş.",
            )

        try:
            ctx = StepExecutionContext.from_job_input(
                job_id=job.id,
                module_id="standard_video",
                raw_input=raw_input,
            )
        except Exception as err:
            raise StepExecutionError(
                self.step_key(),
                f"StepExecutionContext oluşturulamadı: {err}",
            )

        # Template/Style Blueprint context (M11)
        template_ctx = getattr(job, '_template_context', None)
        template_info = None
        template_tone = None
        template_language_rules = None
        if isinstance(template_ctx, dict):
            template_info = {
                "template_id": template_ctx.get("template_id"),
                "template_name": template_ctx.get("template_name"),
                "template_version": template_ctx.get("template_version"),
                "link_role": template_ctx.get("link_role"),
            }
            content_rules = template_ctx.get("content_rules")
            if isinstance(content_rules, dict):
                template_tone = content_rules.get("tone")
                template_language_rules = content_rules.get("language_rules")

        messages = build_script_prompt(
            topic=ctx.topic,
            duration_seconds=ctx.duration_seconds,
            language=ctx.language,
            template_tone=template_tone,
            template_language_rules=template_language_rules,
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

        script_data["language"] = ctx.language.value

        workspace_root = ctx.workspace_root or (
            str(job.workspace_path) if job.workspace_path else ""
        )
        artifact_path = _write_artifact(
            workspace_root=workspace_root,
            job_id=job.id,
            filename="script.json",
            data=script_data,
        )

        scene_count = len(script_data.get("scenes", []))
        logger.info(
            "ScriptStepExecutor: job=%s dil=%s sahne=%d artifact=%s",
            job.id,
            ctx.language.value,
            scene_count,
            artifact_path,
        )

        result = {
            "artifact_path": artifact_path,
            "language": ctx.language.value,
            "scene_count": scene_count,
            "provider": output.trace,
            "step": self.step_key(),
        }
        if template_info is not None:
            result["template_info"] = template_info
        return result
