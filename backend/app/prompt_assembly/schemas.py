"""Pydantic schemas for Prompt Assembly Engine."""

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


# ── PromptBlock ──


class PromptBlockCreate(BaseModel):
    key: str = Field(..., min_length=1, max_length=255)
    title: str = Field(..., min_length=1, max_length=255)
    module_scope: Optional[str] = Field(None, max_length=100)
    step_scope: Optional[str] = Field(None, max_length=100)
    provider_scope: Optional[str] = Field(None, max_length=100)
    group_name: str = Field("core", max_length=100)
    kind: str = Field(..., max_length=50)
    order_index: int = Field(0)
    enabled_by_default: bool = True
    condition_type: str = Field("always", max_length=50)
    condition_config_json: Optional[str] = None
    content_template: str = Field(..., min_length=1)
    help_text: Optional[str] = None
    visible_in_admin: bool = True
    status: str = Field("active", max_length=50)


class PromptBlockUpdate(BaseModel):
    """All fields optional — PATCH semantics.

    NOTE: `kind` is intentionally excluded — kind is immutable after creation
    to prevent protection bypasses (core_system/output_contract cannot be
    disabled, and changing kind would allow circumventing that guard).
    """

    title: Optional[str] = Field(None, max_length=255)
    module_scope: Optional[str] = Field(None, max_length=100)
    step_scope: Optional[str] = Field(None, max_length=100)
    provider_scope: Optional[str] = Field(None, max_length=100)
    group_name: Optional[str] = Field(None, max_length=100)
    order_index: Optional[int] = None
    enabled_by_default: Optional[bool] = None
    condition_type: Optional[str] = Field(None, max_length=50)
    condition_config_json: Optional[str] = None
    admin_override_template: Optional[str] = None
    help_text: Optional[str] = None
    visible_in_admin: Optional[bool] = None
    status: Optional[str] = Field(None, max_length=50)


class PromptBlockResponse(BaseModel):
    id: str
    key: str
    title: str
    module_scope: Optional[str]
    step_scope: Optional[str]
    provider_scope: Optional[str]
    group_name: str
    kind: str
    order_index: int
    enabled_by_default: bool
    condition_type: str
    condition_config_json: Optional[str]
    content_template: str
    admin_override_template: Optional[str]
    effective_template: str
    help_text: Optional[str]
    visible_in_admin: bool
    status: str
    version: int
    source_kind: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Assembly Preview / Dry Run ──


class AssemblyPreviewRequest(BaseModel):
    module_scope: str = Field(..., max_length=100)
    step_key: str = Field("script", max_length=100)
    provider_name: Optional[str] = Field(None, max_length=100)
    data_overrides: Optional[dict[str, Any]] = None
    settings_overrides: Optional[dict[str, Any]] = None
    user_content: Optional[str] = None


class BlockTraceResponse(BaseModel):
    block_key: str
    block_title: str
    block_kind: str
    order_index: int
    included: bool
    reason_code: str
    reason_text: str
    evaluated_condition_type: str
    evaluated_condition_key: Optional[str]
    evaluated_condition_value: Optional[str]
    rendered_text: Optional[str]
    used_variables_json: Optional[str]
    missing_variables_json: Optional[str]

    model_config = {"from_attributes": True}


class AssemblyPreviewResponse(BaseModel):
    assembly_run_id: str
    is_dry_run: bool
    data_source: str
    final_prompt_text: str
    final_payload: dict
    included_blocks: list[BlockTraceResponse]
    skipped_blocks: list[BlockTraceResponse]
    settings_snapshot_summary: dict
    data_snapshot_summary: dict


# ── Assembly Run (for Job Detail) ──


class AssemblyRunResponse(BaseModel):
    id: str
    job_id: Optional[str]
    step_key: Optional[str]
    module_scope: str
    provider_name: str
    provider_type: str
    final_prompt_text: str
    final_payload_json: str
    provider_response_json: Optional[str]
    provider_error_json: Optional[str]
    included_block_keys_json: str
    skipped_block_keys_json: str
    block_count_included: int
    block_count_skipped: int
    is_dry_run: bool
    data_source: str
    created_at: datetime

    model_config = {"from_attributes": True}


class AssemblyRunDetailResponse(AssemblyRunResponse):
    """Full detail including block traces and snapshots."""

    settings_snapshot_json: str
    prompt_snapshot_json: str
    data_snapshot_json: str
    block_traces: list[BlockTraceResponse]
