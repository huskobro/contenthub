"""
Analytics Şemaları — M8-C1, M16, M17.

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


# ---------------------------------------------------------------------------
# Source Impact (M17-A)
# ---------------------------------------------------------------------------

class SourceStat(BaseModel):
    source_id: str
    source_name: str
    source_type: str
    status: str
    scan_count: int
    news_count: int
    used_news_count: int


class SourceImpactMetrics(BaseModel):
    window: str
    total_sources: int
    active_sources: int
    total_scans: int
    successful_scans: int
    total_news_items: int
    used_news_count: int
    bulletin_count: int
    source_stats: list[SourceStat] = []


# ---------------------------------------------------------------------------
# Channel Overview (M17-C)
# ---------------------------------------------------------------------------

class YouTubeChannelMetrics(BaseModel):
    total_publish_attempts: int
    published_count: int
    failed_count: int
    draft_count: int
    in_progress_count: int
    publish_success_rate: Optional[float] = None
    last_published_at: Optional[str] = None
    has_publish_history: bool


class ChannelOverviewMetrics(BaseModel):
    window: str
    youtube: YouTubeChannelMetrics


# ---------------------------------------------------------------------------
# Content Analytics (M18-A)
# ---------------------------------------------------------------------------

class ModuleDistribution(BaseModel):
    module_type: str
    total_jobs: int
    completed_jobs: int
    failed_jobs: int
    success_rate: Optional[float] = None


class ContentTypeBreakdown(BaseModel):
    type: str
    count: int


class ContentMetrics(BaseModel):
    window: str
    module_distribution: list[ModuleDistribution] = []
    content_output_count: int
    published_content_count: int
    avg_time_to_publish_seconds: Optional[float] = None
    content_type_breakdown: list[ContentTypeBreakdown] = []
    active_template_count: int
    active_blueprint_count: int
