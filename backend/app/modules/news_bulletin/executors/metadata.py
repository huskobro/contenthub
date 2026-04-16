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

from ._helpers import (
    _strip_markdown_json,
    _write_artifact,
    _read_artifact,
    _write_preview_artifact,
)
from ._persistence import persist_metadata_row
from ..description_formatter import build_publish_description, build_publish_tags

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

        # M31: dominant_category ve tone snapshot'tan al (SEO polish)
        from app.modules.news_bulletin.service import get_dominant_category
        selected_items = raw_input.get("selected_items", [])
        dominant_category = get_dominant_category(selected_items)
        tone = raw_input.get("tone", "formal")

        messages = build_bulletin_metadata_prompt(
            script_data=script_data,
            language=language,
            metadata_title_rules=metadata_title_rules,
            dominant_category=dominant_category,
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
            metadata_data: dict = json.loads(cleaned)
        except json.JSONDecodeError as err:
            raise StepExecutionError(
                self.step_key(),
                f"LLM yanıtı geçerli JSON değil: {err}. "
                f"Ham yanıt (ilk 300 karakter): {raw_content[:300]}",
            )

        metadata_data["language"] = language.value

        # Publish adapter pack — description/tags post-processing:
        #   1. Enrich description with chapters + source citations so the
        #      YouTube publish payload reflects the multi-item structure.
        #   2. Keep the LLM-generated title intact; only the description
        #      and tag list are rewritten deterministically.
        #   3. Preserve the original LLM description for audit under
        #      "llm_description" — if the operator wants the raw copy.
        bulletin_id = raw_input.get("bulletin_id")
        news_items_map = await _load_news_items_map(bulletin_id) if bulletin_id else {}
        formatted = build_publish_description(
            script_data=script_data,
            metadata=metadata_data,
            news_items_map=news_items_map,
            dominant_category=dominant_category,
            language=language.value,
        )
        metadata_data["llm_description"] = metadata_data.get("description")
        metadata_data["description"] = formatted["description"]
        metadata_data["publish_description_meta"] = {
            "chapter_count": formatted["chapter_count"],
            "chapters_valid_for_youtube": formatted["chapters_valid_for_youtube"],
            "source_count": formatted["source_count"],
            "truncated": formatted["truncated"],
            "dropped_sections": formatted["dropped_sections"],
        }
        metadata_data["tags"] = build_publish_tags(
            metadata=metadata_data,
            dominant_category=dominant_category,
        )
        if dominant_category and not metadata_data.get("category"):
            metadata_data["category"] = dominant_category

        artifact_path = _write_artifact(
            workspace_root=workspace_root,
            job_id=job.id,
            filename="metadata.json",
            data=metadata_data,
        )

        # PHASE AB: preview_metadata.json — final metadata başarıyla yazıldıktan
        # SONRA minimal bir snapshot. Nihai değil; metadata.json FINAL scope'ta
        # kalır. Classifier bu dosyayı PREVIEW scope olarak tanır.
        try:
            _desc = metadata_data.get("description") or ""
            _write_preview_artifact(
                workspace_root=workspace_root,
                job_id=job.id,
                filename="preview_metadata.json",
                data={
                    "step": "metadata",
                    "bulletin_id": bulletin_id,
                    "language": metadata_data.get("language", language.value),
                    "title": metadata_data.get("title", ""),
                    "description_preview": _desc[:500],
                    "description_truncated": len(_desc) > 500,
                    "tags": list(metadata_data.get("tags", []) or [])[:20],
                    "category": metadata_data.get("category")
                    or dominant_category,
                    "tone": tone,
                    "publish_description_meta": metadata_data.get(
                        "publish_description_meta"
                    ),
                },
            )
        except Exception as _preview_exc:  # pragma: no cover — best-effort
            logger.warning(
                "BulletinMetadataExecutor: preview_metadata.json yazılamadı "
                "job=%s err=%s", job.id, _preview_exc,
            )

        # Persist to news_bulletin_metadata so has_metadata enrichment works
        # and the Publish Center can read the canonical record from the DB.
        persisted_metadata = False
        if bulletin_id:
            persisted_metadata = await persist_metadata_row(
                bulletin_id=bulletin_id,
                title=metadata_data.get("title"),
                description=metadata_data.get("description"),
                tags=metadata_data.get("tags"),
                category=metadata_data.get("category") or dominant_category,
                language=metadata_data.get("language"),
                notes=f"Generated by job {job.id}",
            )
            if not persisted_metadata:
                logger.warning(
                    "BulletinMetadataExecutor: NewsBulletinMetadata persistence "
                    "skipped for bulletin=%s job=%s", bulletin_id, job.id,
                )

        logger.info(
            "BulletinMetadataExecutor: job=%s dil=%s artifact=%s "
            "chapter_count=%s source_count=%s truncated=%s persisted=%s",
            job.id,
            language.value,
            artifact_path,
            formatted["chapter_count"],
            formatted["source_count"],
            formatted["truncated"],
            persisted_metadata,
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
            "publish_description_meta": metadata_data.get(
                "publish_description_meta"
            ),
        }


async def _load_news_items_map(bulletin_id: str) -> dict:
    """
    Load ``{news_item_id: {title, url, source_name}}`` for every news item
    currently selected on this bulletin.  Used by the description
    formatter to render accurate source citations regardless of what
    the script artifact carried forward (M41 already copies these
    fields into the script items but older scripts may be missing
    them).
    """
    from sqlalchemy import select
    from app.db.models import NewsBulletinSelectedItem, NewsItem, NewsSource
    from app.db.session import AsyncSessionLocal

    result: dict = {}
    if not bulletin_id:
        return result
    try:
        async with AsyncSessionLocal() as session:
            rows = (
                await session.execute(
                    select(
                        NewsItem.id,
                        NewsItem.title,
                        NewsItem.url,
                        NewsSource.name,
                    )
                    .join(
                        NewsBulletinSelectedItem,
                        NewsBulletinSelectedItem.news_item_id == NewsItem.id,
                    )
                    .outerjoin(NewsSource, NewsSource.id == NewsItem.source_id)
                    .where(
                        NewsBulletinSelectedItem.news_bulletin_id == bulletin_id
                    )
                    .order_by(NewsBulletinSelectedItem.sort_order)
                )
            ).all()
            for news_id, title, url, source_name in rows:
                result[news_id] = {
                    "title": title,
                    "url": url,
                    "source_name": source_name,
                }
    except Exception as exc:  # pragma: no cover — best-effort enrichment
        logger.warning(
            "BulletinMetadataExecutor: news_items_map load failed for "
            "bulletin=%s: %s", bulletin_id, exc,
        )
    return result
