"""
Analytics Şemaları — M8-C1.

Router yanıt tipleri için Pydantic modelleri.
"""

from typing import Optional
from pydantic import BaseModel


class StepStat(BaseModel):
    step_key: str
    count: int
    avg_elapsed_seconds: Optional[float]
    failed_count: int


class OverviewMetrics(BaseModel):
    window: str
    total_job_count: int
    completed_job_count: int
    failed_job_count: int
    job_success_rate: Optional[float]
    total_publish_count: int
    published_count: int
    failed_publish_count: int
    publish_success_rate: Optional[float]
    avg_production_duration_seconds: Optional[float]
    retry_rate: Optional[float]


class ProviderStat(BaseModel):
    provider_name: str
    provider_kind: str
    total_calls: int
    failed_calls: int
    error_rate: Optional[float] = None
    avg_latency_ms: Optional[float] = None
    total_estimated_cost_usd: Optional[float] = None
    total_input_tokens: Optional[int] = None
    total_output_tokens: Optional[int] = None


class OperationsMetrics(BaseModel):
    window: str
    avg_render_duration_seconds: Optional[float]
    step_stats: list[StepStat]
    provider_error_rate: Optional[float] = None
    provider_stats: list[ProviderStat] = []
