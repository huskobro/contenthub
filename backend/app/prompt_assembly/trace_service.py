"""Prompt trace persistence -- records assembly runs and block traces."""

import json
import logging
from typing import List, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.prompt_assembly.models import PromptAssemblyRun, PromptAssemblyBlockTrace
from app.prompt_assembly.payload_builder import ProviderPayloadBuilder

logger = logging.getLogger(__name__)


async def create_assembly_run(
    db: AsyncSession,
    *,
    job_id: Optional[str],
    step_key: Optional[str],
    module_scope: str,
    provider_name: str,
    provider_type: str,
    final_prompt_text: str,
    final_payload: dict,
    settings_snapshot: dict,
    prompt_snapshot: list,
    data_snapshot: dict,
    included_block_keys: list,
    skipped_block_keys: list,
    is_dry_run: bool,
    data_source: str,
    block_traces: list,
) -> PromptAssemblyRun:
    """Persist a complete assembly run with all block traces."""

    sanitizer = ProviderPayloadBuilder.sanitize_for_storage

    run = PromptAssemblyRun(
        job_id=job_id,
        step_key=step_key,
        module_scope=module_scope,
        provider_name=provider_name,
        provider_type=provider_type,
        final_prompt_text=final_prompt_text,
        final_payload_json=sanitizer(final_payload) or "{}",
        settings_snapshot_json=json.dumps(settings_snapshot, ensure_ascii=False),
        prompt_snapshot_json=json.dumps(prompt_snapshot, ensure_ascii=False),
        data_snapshot_json=json.dumps(data_snapshot, ensure_ascii=False),
        included_block_keys_json=json.dumps(included_block_keys),
        skipped_block_keys_json=json.dumps(skipped_block_keys),
        block_count_included=len(included_block_keys),
        block_count_skipped=len(skipped_block_keys),
        is_dry_run=is_dry_run,
        data_source=data_source,
    )
    db.add(run)
    await db.flush()  # get run.id for block traces

    for bt in block_traces:
        trace = PromptAssemblyBlockTrace(
            assembly_run_id=run.id,
            block_key=bt["block_key"],
            block_title=bt["block_title"],
            block_kind=bt["block_kind"],
            order_index=bt["order_index"],
            included=bt["included"],
            reason_code=bt["reason_code"],
            reason_text=bt["reason_text"],
            evaluated_condition_type=bt["evaluated_condition_type"],
            evaluated_condition_key=bt.get("evaluated_condition_key"),
            evaluated_condition_value=bt.get("evaluated_condition_value"),
            rendered_text=bt.get("rendered_text"),
            used_variables_json=json.dumps(bt.get("used_variables")) if bt.get("used_variables") else None,
            missing_variables_json=json.dumps(bt.get("missing_variables")) if bt.get("missing_variables") else None,
            data_dependencies_json=json.dumps(bt.get("data_dependencies")) if bt.get("data_dependencies") else None,
        )
        db.add(trace)

    await db.commit()
    await db.refresh(run)
    return run


async def record_provider_result(
    db: AsyncSession,
    assembly_run_id: str,
    response_json: Optional[dict] = None,
    error_json: Optional[dict] = None,
) -> None:
    """Update an assembly run with the provider response/error after invocation."""
    result = await db.execute(
        select(PromptAssemblyRun).where(PromptAssemblyRun.id == assembly_run_id)
    )
    run = result.scalar_one_or_none()
    if run is None:
        logger.warning("Assembly run %s not found for provider result", assembly_run_id)
        return

    sanitizer = ProviderPayloadBuilder.sanitize_for_storage

    if response_json is not None:
        run.provider_response_json = sanitizer(response_json)
    if error_json is not None:
        run.provider_error_json = sanitizer(error_json)

    await db.commit()


async def get_assembly_runs_for_job(
    db: AsyncSession, job_id: str
) -> List[PromptAssemblyRun]:
    """Get all assembly runs (with block traces) for a job."""
    stmt = (
        select(PromptAssemblyRun)
        .where(PromptAssemblyRun.job_id == job_id)
        .order_by(PromptAssemblyRun.created_at)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_assembly_run_detail(
    db: AsyncSession, run_id: str
) -> Optional[PromptAssemblyRun]:
    """Get a single assembly run with block traces eager-loaded."""
    result = await db.execute(
        select(PromptAssemblyRun).where(PromptAssemblyRun.id == run_id)
    )
    run = result.scalar_one_or_none()
    if run is not None:
        # Trigger lazy load of block_traces
        _ = run.block_traces
    return run
