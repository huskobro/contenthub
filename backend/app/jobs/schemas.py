"""Pydantic schemas for the Job Engine."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class JobStepResponse(BaseModel):
    id: str
    job_id: str
    step_key: str
    step_order: int
    status: str
    artifact_refs_json: Optional[str] = None
    log_text: Optional[str] = None
    elapsed_seconds: Optional[float] = None
    last_error: Optional[str] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    updated_at: datetime

    model_config = {"from_attributes": True}


class JobCreate(BaseModel):
    module_type: str
    owner_id: Optional[str] = None
    template_id: Optional[str] = None
    source_context_json: Optional[str] = None
    workspace_path: Optional[str] = None


class JobResponse(BaseModel):
    id: str
    module_type: str
    status: str
    owner_id: Optional[str] = None
    template_id: Optional[str] = None
    source_context_json: Optional[str] = None
    current_step_key: Optional[str] = None
    retry_count: int
    elapsed_total_seconds: Optional[float] = None
    estimated_remaining_seconds: Optional[float] = None
    workspace_path: Optional[str] = None
    last_error: Optional[str] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    updated_at: datetime
    steps: list[JobStepResponse] = []

    model_config = {"from_attributes": True}
