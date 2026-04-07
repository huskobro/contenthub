"""
Bülten senaryo adımı executor'ı (BulletinScriptExecutor) — M28.

Seçilmiş haber öğelerinden spiker tarzında narration metinleri üretir.
Settings snapshot'tan admin-managed prompt'ları okur.

Akış (assembly engine — primary):
  1. bulletin_id → DB'den selected items + narration metinleri çekilir
  2. PromptAssemblyService ile blok tabanlı prompt derlenir
  3. Assembly sonucu messages LLM'e gönderilir
  4. Assembly trace kaydedilir
  5. bulletin_script.json artifact yazılır

Akış (fallback — legacy):
  1-2. Aynı
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

        PRIMARY: PromptAssemblyService ile blok tabanlı prompt derlenir.
        FALLBACK: build_bulletin_script_prompt ile eski yol kullanılır.

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

        # --- PRIMARY PATH: Prompt Assembly Engine ---
        messages = None
        assembly_run_id = None
        used_assembly = False

        try:
            messages, assembly_run_id = await self._assemble_prompt(
                job_id=str(job.id),
                settings_snapshot=settings_snapshot,
                items_for_prompt=items_for_prompt,
                language_code=language.value,
                tone=tone,
                word_limit=int(word_limit) if word_limit else 80,
                target_duration=int(duration) if duration else 120,
            )
            used_assembly = True
            logger.info(
                "BulletinScriptExecutor: assembly engine used, run_id=%s",
                assembly_run_id,
            )
        except Exception as exc:
            logger.warning(
                "BulletinScriptExecutor: assembly engine failed, falling back "
                "to legacy prompt builder. Error: %s",
                exc,
            )

        # --- FALLBACK PATH: Legacy prompt builder ---
        if messages is None:
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
                    "BulletinScriptExecutor: failed to record assembly provider "
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

        script_data["language"] = language.value
        script_data["bulletin_id"] = bulletin_id

        # M41: image_url, published_at, source_id selected_items snapshot'tan script items'a ekle
        script_items_list = script_data.get("items", [])
        for idx, s_item in enumerate(script_items_list):
            if idx < len(selected_items_data):
                src = selected_items_data[idx]
                s_item["image_url"] = src.get("image_url")
                s_item["published_at"] = src.get("published_at")
                s_item["source_id"] = src.get("source_id")

        workspace_root = raw_input.get("workspace_root", "")
        if not workspace_root and hasattr(job, "workspace_path") and job.workspace_path:
            workspace_root = str(job.workspace_path)

        artifact_path = _write_artifact(
            workspace_root=workspace_root,
            job_id=job.id,
            filename="bulletin_script.json",
            data=script_data,
        )

        # TTS executor script.json (scenes format) bekliyor — uyumluluk için yaz
        scenes_compat = {
            "language": script_data.get("language", "tr"),
            "scenes": [
                {
                    "scene_number": item.get("item_number", i + 1),
                    "narration": item.get("narration", ""),
                    "duration_seconds": item.get("duration_seconds"),
                    "headline": item.get("headline", ""),
                }
                for i, item in enumerate(script_data.get("items", []))
            ],
        }
        _write_artifact(
            workspace_root=workspace_root,
            job_id=job.id,
            filename="script.json",
            data=scenes_compat,
        )

        item_count = len(script_data.get("items", []))
        logger.info(
            "BulletinScriptExecutor: job=%s dil=%s haber=%d artifact=%s assembly=%s",
            job.id,
            language.value,
            item_count,
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

        return {
            "artifact_path": artifact_path,
            "language": language.value,
            "item_count": item_count,
            "bulletin_id": bulletin_id,
            "provider": output.trace,
            "provider_trace": trace_info,
            "step": self.step_key(),
        }

    async def _assemble_prompt(
        self,
        *,
        job_id: str,
        settings_snapshot: dict,
        items_for_prompt: list,
        language_code: str,
        tone: str,
        word_limit: int,
        target_duration: int,
    ) -> tuple:
        """
        Use PromptAssemblyService to build messages.

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
            "selected_news_items": items_for_prompt,
            "item_count": len(items_for_prompt),
            "language": language_code,
            "tone": tone,
            "word_limit_per_item": word_limit,
            "target_duration_seconds": target_duration,
        }

        # Build user_content — the actual news items as structured text
        user_lines = []
        for item in items_for_prompt:
            edited = item.get("edited_narration")
            if edited:
                user_lines.append(
                    f"[Haber {item['item_number']}] (EDITED — koru)\n"
                    f"Başlık: {item['headline']}\n"
                    f"Narration: {edited}"
                )
            else:
                user_lines.append(
                    f"[Haber {item['item_number']}]\n"
                    f"Başlık: {item['headline']}\n"
                    f"Özet: {item['summary']}"
                )
        user_content = "\n\n".join(user_lines)

        async with AsyncSessionLocal() as db_session:
            # Load block snapshot
            blocks = await block_service.get_effective_blocks(
                db_session, "news_bulletin"
            )
            block_snapshot = [b.to_snapshot_dict() for b in blocks]

            if not block_snapshot:
                raise RuntimeError(
                    "No active prompt blocks found for module 'news_bulletin'."
                )

            # Build settings snapshot from resolver (fresh from DB)
            assembly_settings = await resolve_group("news_bulletin", db_session)
            # Merge with job-level settings snapshot (job snapshot takes precedence)
            merged_settings = {**assembly_settings, **settings_snapshot}

            assembly_service = PromptAssemblyService()
            result = await assembly_service.assemble(
                db_session,
                module_scope="news_bulletin",
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
