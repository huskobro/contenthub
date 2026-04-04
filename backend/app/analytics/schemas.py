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


class OperationsMetrics(BaseModel):
    window: str
    avg_render_duration_seconds: Optional[float]
    step_stats: list[StepStat]
    provider_error_rate: None  # M8-C1: desteklenmiyor
