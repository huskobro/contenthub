"""Prompt Assembly Service -- the orchestrator.

Deterministic: same snapshots -> same final prompt.
No side effects beyond trace persistence.
"""

import json
import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.prompt_assembly.condition_evaluator import ConditionEvaluator, ConditionResult
from app.prompt_assembly.template_renderer import TemplateRenderer, RenderResult
from app.prompt_assembly.payload_builder import ProviderPayloadBuilder
from app.prompt_assembly import trace_service

logger = logging.getLogger(__name__)

BLOCK_SEPARATOR = "\n\n"


@dataclass
class BlockTraceEntry:
    block_key: str
    block_title: str
    block_kind: str
    order_index: int
    included: bool
    reason_code: str
    reason_text: str
    evaluated_condition_type: str
    evaluated_condition_key: Optional[str] = None
    evaluated_condition_value: Optional[str] = None
    rendered_text: Optional[str] = None
    used_variables: Optional[List[str]] = None
    missing_variables: Optional[List[str]] = None
    data_dependencies: Optional[List[str]] = None

    def to_dict(self) -> dict:
        return {
            "block_key": self.block_key,
            "block_title": self.block_title,
            "block_kind": self.block_kind,
            "order_index": self.order_index,
            "included": self.included,
            "reason_code": self.reason_code,
            "reason_text": self.reason_text,
            "evaluated_condition_type": self.evaluated_condition_type,
            "evaluated_condition_key": self.evaluated_condition_key,
            "evaluated_condition_value": self.evaluated_condition_value,
            "rendered_text": self.rendered_text,
            "used_variables": self.used_variables,
            "missing_variables": self.missing_variables,
            "data_dependencies": self.data_dependencies,
        }


@dataclass
class AssemblyResult:
    final_prompt_text: str
    final_payload: dict
    included_blocks: List[BlockTraceEntry]
    skipped_blocks: List[BlockTraceEntry]
    assembly_run_id: Optional[str] = None


class PromptAssemblyService:
    """Orchestrates block-based prompt assembly.

    1. Filters blocks by module/provider scope
    2. Evaluates conditions for each block
    3. Renders templates for included blocks
    4. Assembles final prompt text
    5. Builds provider payload
    6. Persists trace
    """

    def __init__(self) -> None:
        self._evaluator = ConditionEvaluator()
        self._renderer = TemplateRenderer()
        self._payload_builder = ProviderPayloadBuilder()

    async def assemble(
        self,
        db: AsyncSession,
        *,
        module_scope: str,
        step_key: str,
        provider_name: str,
        provider_type: str = "llm",
        settings_snapshot: Dict[str, Any],
        block_snapshot: List[dict],
        data_snapshot: Dict[str, Any],
        user_content: str = "",
        model: str = "",
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        job_id: Optional[str] = None,
        is_dry_run: bool = False,
        data_source: str = "job_context",
    ) -> AssemblyResult:
        # 1. FILTER by scope + status
        filtered = self._filter_blocks(block_snapshot, module_scope, provider_name, step_key)

        # 2. EVALUATE conditions + 3. RENDER templates
        included_blocks: List[BlockTraceEntry] = []
        skipped_blocks: List[BlockTraceEntry] = []

        for block in filtered:
            entry = self._process_block(
                block, settings_snapshot, data_snapshot, module_scope, provider_name
            )
            if entry.included:
                included_blocks.append(entry)
            else:
                skipped_blocks.append(entry)

        # 4. ASSEMBLE final prompt
        rendered_parts = [b.rendered_text for b in included_blocks if b.rendered_text]
        final_prompt_text = BLOCK_SEPARATOR.join(rendered_parts)

        # 5. BUILD payload
        final_payload = self._payload_builder.build(
            provider_name=provider_name,
            system_prompt=final_prompt_text,
            user_content=user_content,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
        )

        # 6. PERSIST trace
        included_keys = [b.block_key for b in included_blocks]
        skipped_keys = [b.block_key for b in skipped_blocks]
        all_traces = [b.to_dict() for b in included_blocks + skipped_blocks]

        run = await trace_service.create_assembly_run(
            db,
            job_id=job_id,
            step_key=step_key,
            module_scope=module_scope,
            provider_name=provider_name,
            provider_type=provider_type,
            final_prompt_text=final_prompt_text,
            final_payload=final_payload,
            settings_snapshot=settings_snapshot,
            prompt_snapshot=block_snapshot,
            data_snapshot=data_snapshot,
            included_block_keys=included_keys,
            skipped_block_keys=skipped_keys,
            is_dry_run=is_dry_run,
            data_source=data_source,
            block_traces=all_traces,
        )

        return AssemblyResult(
            final_prompt_text=final_prompt_text,
            final_payload=final_payload,
            included_blocks=included_blocks,
            skipped_blocks=skipped_blocks,
            assembly_run_id=run.id,
        )

    def _filter_blocks(
        self, blocks: List[dict], module_scope: str, provider_name: str, step_key: Optional[str] = None
    ) -> List[dict]:
        """Filter blocks by module/step/provider scope and status, sort by order_index."""
        filtered = []
        for b in blocks:
            if b.get("status") not in ("active", None):
                continue
            b_module = b.get("module_scope")
            if b_module is not None and b_module != module_scope:
                continue
            b_step = b.get("step_scope")
            if b_step is not None and step_key is not None and b_step != step_key:
                continue
            b_provider = b.get("provider_scope")
            if b_provider is not None and not provider_name.startswith(b_provider):
                continue
            filtered.append(b)

        filtered.sort(key=lambda b: (b.get("order_index", 0), b.get("key", "")))
        return filtered

    def _process_block(
        self,
        block: dict,
        settings_snapshot: dict,
        data_snapshot: dict,
        module_scope: str,
        provider_name: str,
    ) -> BlockTraceEntry:
        """Evaluate condition and render template for a single block."""
        template = block.get("admin_override_template") or block.get("content_template", "")
        data_deps = self._renderer.extract_data_dependencies(template)

        cond_result = self._evaluator.evaluate(
            block=block,
            settings_snapshot=settings_snapshot,
            data_snapshot=data_snapshot,
            module_scope=module_scope,
            provider_name=provider_name,
        )

        if not cond_result.included:
            return BlockTraceEntry(
                block_key=block["key"],
                block_title=block.get("title", ""),
                block_kind=block.get("kind", ""),
                order_index=block.get("order_index", 0),
                included=False,
                reason_code=cond_result.reason_code,
                reason_text=cond_result.reason_text,
                evaluated_condition_type=cond_result.evaluated_condition_type,
                evaluated_condition_key=cond_result.evaluated_condition_key,
                evaluated_condition_value=cond_result.evaluated_condition_value,
                data_dependencies=data_deps,
            )

        render_result = self._renderer.render(
            template=template,
            data=data_snapshot,
            critical_keys=data_deps if block.get("kind") == "context_block" else None,
        )

        if render_result.has_critical_missing:
            return BlockTraceEntry(
                block_key=block["key"],
                block_title=block.get("title", ""),
                block_kind=block.get("kind", ""),
                order_index=block.get("order_index", 0),
                included=False,
                reason_code="skipped_critical_data_missing",
                reason_text=f"Kritik veri eksik: {render_result.missing_variables}",
                evaluated_condition_type=cond_result.evaluated_condition_type,
                evaluated_condition_key=cond_result.evaluated_condition_key,
                evaluated_condition_value=cond_result.evaluated_condition_value,
                missing_variables=render_result.missing_variables,
                data_dependencies=data_deps,
            )

        if render_result.is_empty:
            return BlockTraceEntry(
                block_key=block["key"],
                block_title=block.get("title", ""),
                block_kind=block.get("kind", ""),
                order_index=block.get("order_index", 0),
                included=False,
                reason_code="skipped_empty_render",
                reason_text="Render sonucu bos, blok atlandi",
                evaluated_condition_type=cond_result.evaluated_condition_type,
                evaluated_condition_key=cond_result.evaluated_condition_key,
                evaluated_condition_value=cond_result.evaluated_condition_value,
                data_dependencies=data_deps,
            )

        return BlockTraceEntry(
            block_key=block["key"],
            block_title=block.get("title", ""),
            block_kind=block.get("kind", ""),
            order_index=block.get("order_index", 0),
            included=True,
            reason_code=cond_result.reason_code,
            reason_text=cond_result.reason_text,
            evaluated_condition_type=cond_result.evaluated_condition_type,
            evaluated_condition_key=cond_result.evaluated_condition_key,
            evaluated_condition_value=cond_result.evaluated_condition_value,
            rendered_text=render_result.rendered_text,
            used_variables=render_result.used_variables,
            missing_variables=render_result.missing_variables,
            data_dependencies=data_deps,
        )
