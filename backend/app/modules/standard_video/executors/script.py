"""
Senaryo adımı executor'ı (ScriptStepExecutor).

Konu → StepExecutionContext → LLM prompt → resolve_and_invoke(LLM) → script.json artifact.

Akış (assembly engine — primary):
  1. Job input_data_json okunur, StepExecutionContext oluşturulur
  2. PromptAssemblyService ile blok tabanlı prompt derlenir
  3. Assembly sonucu messages LLM'e gönderilir
  4. Assembly trace kaydedilir
  5. script.json artifact yazılır

Akış (fallback — legacy):
  1-2. Aynı
  3. build_script_prompt ile LLM mesajları hazırlanır
  4. resolve_and_invoke(LLM) çağrılır
  5. script.json artifact yazılır
"""

from __future__ import annotations

import json
import logging
from typing import Optional

from app.db.models import Job, JobStep
from app.jobs.executor import StepExecutor
from app.jobs.exceptions import StepExecutionError
from app.providers.capability import ProviderCapability
from app.providers.registry import ProviderRegistry
from app.providers.resolution import resolve_and_invoke

from app.providers.trace_helper import build_provider_trace
from app.modules.shared_helpers import validate_script_data
from ._helpers import _strip_markdown_json, _write_artifact

logger = logging.getLogger(__name__)


class ScriptStepExecutor(StepExecutor):
    """
    Senaryo adımı executor'ı.

    Konu → StepExecutionContext → LLM prompt → resolve_and_invoke(LLM) → script.json artifact.

    PRIMARY: PromptAssemblyService ile blok tabanlı prompt derlenir.
    FALLBACK: build_script_prompt ile eski yol kullanılır.
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

        PRIMARY: PromptAssemblyService ile blok tabanlı prompt derlenir.
        FALLBACK: build_script_prompt ile eski yol kullanılır.

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
        template_tone: Optional[str] = None
        template_language_rules: Optional[str] = None
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

        settings_snapshot = raw_input.get("_settings_snapshot", {})

        # --- PRIMARY PATH: Prompt Assembly Engine ---
        messages = None
        assembly_run_id: Optional[str] = None
        used_assembly = False

        try:
            messages, assembly_run_id = await self._assemble_prompt(
                job_id=str(job.id),
                settings_snapshot=settings_snapshot,
                ctx=ctx,
                raw_input=raw_input,
                template_tone=template_tone,
                template_language_rules=template_language_rules,
            )
            used_assembly = True
            logger.info(
                "ScriptStepExecutor: assembly engine used, run_id=%s",
                assembly_run_id,
            )
        except Exception as exc:
            logger.warning(
                "ScriptStepExecutor: assembly engine failed, falling back "
                "to legacy prompt builder. Error: %s",
                exc,
            )

        # --- FALLBACK PATH: Legacy prompt builder ---
        if messages is None:
            admin_script_prompt = settings_snapshot.get(
                "standard_video.prompt.script_system"
            )
            messages = build_script_prompt(
                topic=ctx.topic,
                duration_seconds=ctx.duration_seconds,
                language=ctx.language,
                template_tone=template_tone,
                template_language_rules=template_language_rules,
                admin_system_prompt=admin_script_prompt,
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

        # Record provider result in assembly trace (if assembly was used)
        if used_assembly and assembly_run_id:
            try:
                from app.db.session import AsyncSessionLocal
                from app.prompt_assembly import trace_service

                async with AsyncSessionLocal() as db_session:
                    await trace_service.record_provider_result(
                        db_session,
                        assembly_run_id,
                        response_json={
                            "content": raw_content[:2000],
                            "provider_id": output.trace.get("provider_id"),
                            "model": output.trace.get("model"),
                            "input_tokens": output.trace.get("input_tokens"),
                            "output_tokens": output.trace.get("output_tokens"),
                            "latency_ms": output.trace.get("latency_ms"),
                        },
                    )
                    await db_session.commit()
            except Exception as exc:
                logger.warning(
                    "ScriptStepExecutor: failed to record assembly provider "
                    "result: %s", exc,
                )

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

        # Script doğrulaması — uyarılar loglanır, job durdurulmaz
        script_warnings = validate_script_data(
            script_data, "standard_video", job.id,
            target_duration_seconds=ctx.duration_seconds,
        )
        if script_warnings:
            logger.warning(
                "ScriptStepExecutor: script doğrulama uyarıları — job=%s warnings=%s",
                job.id, script_warnings,
            )

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
            "ScriptStepExecutor: job=%s dil=%s sahne=%d artifact=%s assembly=%s",
            job.id,
            ctx.language.value,
            scene_count,
            artifact_path,
            used_assembly,
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
            extra={
                "resolution_role": output.trace.get("resolution_role"),
                "used_assembly_engine": used_assembly,
                "assembly_run_id": assembly_run_id,
            },
        )

        result = {
            "artifact_path": artifact_path,
            "language": ctx.language.value,
            "scene_count": scene_count,
            "script_warnings": script_warnings,
            "provider": output.trace,
            "provider_trace": trace_info,
            "step": self.step_key(),
        }
        if template_info is not None:
            result["template_info"] = template_info
        return result

    async def _assemble_prompt(
        self,
        *,
        job_id: str,
        settings_snapshot: dict,
        ctx,
        raw_input: dict,
        template_tone: Optional[str],
        template_language_rules: Optional[str],
    ) -> tuple:
        """
        Use PromptAssemblyService to build messages for standard_video script step.

        Returns:
            (messages, assembly_run_id) tuple.

        Raises:
            Exception on any assembly failure (caller catches for fallback).
        """
        from app.db.session import AsyncSessionLocal
        from app.prompt_assembly.assembly_service import PromptAssemblyService
        from app.prompt_assembly import service as block_service
        from app.settings.settings_resolver import resolve_group

        # Build data_snapshot with all context the blocks may reference
        data_snapshot = {
            "topic": ctx.topic,
            "duration_seconds": ctx.duration_seconds,
            "language": ctx.language.value,
            "category": raw_input.get("category", ""),
            "tone": raw_input.get("tone", ""),
            "audience": raw_input.get("audience", ""),
        }
        if template_tone:
            data_snapshot["template_tone"] = template_tone
        if template_language_rules:
            data_snapshot["template_language_rules"] = template_language_rules

        user_content = (
            f"Konu: {ctx.topic}\n"
            f"Hedef sure: {ctx.duration_seconds} saniye\n"
            f"Dil: {ctx.language.value}\n\n"
            f"Bu konu icin video senaryosu uret. "
            f"Sahneler toplamda yaklasik {ctx.duration_seconds} saniye olmali. "
            f"language alanina '{ctx.language.value}' yaz."
        )

        async with AsyncSessionLocal() as db_session:
            # Load block snapshot
            blocks = await block_service.get_effective_blocks(
                db_session, "standard_video"
            )
            block_snapshot = [b.to_snapshot_dict() for b in blocks]

            if not block_snapshot:
                raise RuntimeError(
                    "No active prompt blocks found for module 'standard_video'."
                )

            # Build settings snapshot from resolver (fresh from DB)
            assembly_settings = await resolve_group("standard_video", db_session)
            # Merge with job-level settings snapshot (job snapshot takes precedence)
            merged_settings = {**assembly_settings, **settings_snapshot}

            assembly_service = PromptAssemblyService()
            result = await assembly_service.assemble(
                db_session,
                module_scope="standard_video",
                step_key="script",
                provider_name="llm",
                provider_type="llm",
                settings_snapshot=merged_settings,
                block_snapshot=block_snapshot,
                data_snapshot=data_snapshot,
                user_content=user_content,
                job_id=job_id,
                is_dry_run=False,
                data_source="job_context",
            )

            await db_session.commit()

        messages = result.final_payload.get("messages")
        if not messages:
            raise RuntimeError("Assembly produced empty messages payload.")

        return messages, result.assembly_run_id
