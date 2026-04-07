"""Prompt Assembly Engine API endpoints."""

import json
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.prompt_assembly import service, trace_service
from app.prompt_assembly.schemas import (
    AssemblyPreviewRequest,
    AssemblyPreviewResponse,
    AssemblyRunDetailResponse,
    AssemblyRunResponse,
    BlockTraceResponse,
    PromptBlockCreate,
    PromptBlockResponse,
    PromptBlockUpdate,
)
from app.prompt_assembly.assembly_service import PromptAssemblyService
from app.settings.settings_resolver import resolve_group

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/prompt-assembly",
    tags=["prompt-assembly"],
)

_assembly_service = PromptAssemblyService()


# -- PromptBlock CRUD --


@router.get("/blocks", response_model=List[PromptBlockResponse])
async def list_blocks(
    module_scope: Optional[str] = Query(None),
    provider_scope: Optional[str] = Query(None),
    status_filter: str = Query("active"),
    db: AsyncSession = Depends(get_db),
):
    blocks = await service.list_blocks(db, module_scope, provider_scope, status_filter)
    result = []
    for b in blocks:
        d = PromptBlockResponse.model_validate(b)
        d.effective_template = b.effective_template()
        result.append(d)
    return result


@router.get("/blocks/{block_id}", response_model=PromptBlockResponse)
async def get_block(
    block_id: str,
    db: AsyncSession = Depends(get_db),
):
    b = await service.get_block(db, block_id)
    resp = PromptBlockResponse.model_validate(b)
    resp.effective_template = b.effective_template()
    return resp


@router.post("/blocks", response_model=PromptBlockResponse, status_code=status.HTTP_201_CREATED)
async def create_block(
    payload: PromptBlockCreate,
    db: AsyncSession = Depends(get_db),
):
    b = await service.create_block(db, payload)
    resp = PromptBlockResponse.model_validate(b)
    resp.effective_template = b.effective_template()
    return resp


@router.patch("/blocks/{block_id}", response_model=PromptBlockResponse)
async def update_block(
    block_id: str,
    payload: PromptBlockUpdate,
    db: AsyncSession = Depends(get_db),
):
    b = await service.update_block(db, block_id, payload)
    resp = PromptBlockResponse.model_validate(b)
    resp.effective_template = b.effective_template()
    return resp


# -- Assembly Preview (Dry Run) --


@router.post("/preview", response_model=AssemblyPreviewResponse)
async def preview_assembly(
    payload: AssemblyPreviewRequest,
    db: AsyncSession = Depends(get_db),
):
    """Dry-run assembly: builds final prompt without calling provider."""

    # Get effective blocks from DB
    blocks = await service.get_effective_blocks(db, payload.module_scope)
    block_snapshot = [b.to_snapshot_dict() for b in blocks]

    # Get effective settings -- resolve_group(group, db) signature
    try:
        settings_snapshot = await resolve_group(payload.module_scope, db)
    except Exception:
        logger.debug("resolve_group failed for %s, using empty dict", payload.module_scope)
        settings_snapshot = {}

    if payload.settings_overrides:
        settings_snapshot.update(payload.settings_overrides)

    # Data snapshot
    data_snapshot = payload.data_overrides or {}
    data_source = "sample_input" if payload.data_overrides else "job_context"

    # Determine provider
    provider_name = payload.provider_name or "kie_ai_gemini_flash"

    result = await _assembly_service.assemble(
        db,
        module_scope=payload.module_scope,
        step_key=payload.step_key,
        provider_name=provider_name,
        settings_snapshot=settings_snapshot,
        block_snapshot=block_snapshot,
        data_snapshot=data_snapshot,
        user_content=payload.user_content or "",
        is_dry_run=True,
        data_source=data_source,
    )

    return AssemblyPreviewResponse(
        assembly_run_id=result.assembly_run_id or "",
        is_dry_run=True,
        data_source=data_source,
        final_prompt_text=result.final_prompt_text,
        final_payload=result.final_payload,
        included_blocks=[
            BlockTraceResponse(
                block_key=b.block_key,
                block_title=b.block_title,
                block_kind=b.block_kind,
                order_index=b.order_index,
                included=True,
                reason_code=b.reason_code,
                reason_text=b.reason_text,
                evaluated_condition_type=b.evaluated_condition_type,
                evaluated_condition_key=b.evaluated_condition_key,
                evaluated_condition_value=b.evaluated_condition_value,
                rendered_text=b.rendered_text,
                used_variables_json=json.dumps(b.used_variables) if b.used_variables else None,
                missing_variables_json=json.dumps(b.missing_variables) if b.missing_variables else None,
            )
            for b in result.included_blocks
        ],
        skipped_blocks=[
            BlockTraceResponse(
                block_key=b.block_key,
                block_title=b.block_title,
                block_kind=b.block_kind,
                order_index=b.order_index,
                included=False,
                reason_code=b.reason_code,
                reason_text=b.reason_text,
                evaluated_condition_type=b.evaluated_condition_type,
                evaluated_condition_key=b.evaluated_condition_key,
                evaluated_condition_value=b.evaluated_condition_value,
                rendered_text=None,
                used_variables_json=None,
                missing_variables_json=json.dumps(b.missing_variables) if b.missing_variables else None,
            )
            for b in result.skipped_blocks
        ],
        settings_snapshot_summary=settings_snapshot,
        data_snapshot_summary=data_snapshot,
    )


# -- Assembly Run Traces (for Job Detail) --


@router.get("/traces/job/{job_id}", response_model=List[AssemblyRunResponse])
async def list_traces_for_job(
    job_id: str,
    db: AsyncSession = Depends(get_db),
):
    runs = await trace_service.get_assembly_runs_for_job(db, job_id)
    return [AssemblyRunResponse.model_validate(r) for r in runs]


@router.get("/traces/{run_id}", response_model=AssemblyRunDetailResponse)
async def get_trace_detail(
    run_id: str,
    db: AsyncSession = Depends(get_db),
):
    run = await trace_service.get_assembly_run_detail(db, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Assembly run not found.")

    return AssemblyRunDetailResponse(
        **{c.name: getattr(run, c.name) for c in run.__table__.columns},
        block_traces=[BlockTraceResponse.model_validate(bt) for bt in run.block_traces],
    )
