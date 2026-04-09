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
    review_pending_count: int = 0
    review_rejected_count: int = 0
    publish_backlog_count: int = 0


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


class TraceDataQuality(BaseModel):
    """M23-B: Analytics trace veri kalitesi metrikleri."""
    total_traces: int = 0
    empty_traces: int = 0
    parse_errors: int = 0
    invalid_structure: int = 0
    unknown_provider_count: int = 0
    valid_traces: int = 0


class OperationsMetrics(BaseModel):
    window: str
    avg_render_duration_seconds: Optional[float]
    step_stats: list[StepStat]
    provider_error_rate: Optional[float] = None
    provider_stats: list[ProviderStat] = []
    trace_data_quality: Optional[TraceDataQuality] = None
    total_assembly_runs: int = 0
    dry_run_count: int = 0


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
    avg_production_duration_seconds: Optional[float] = None
    avg_render_duration_seconds: Optional[float] = None
    retry_rate: Optional[float] = None


# ---------------------------------------------------------------------------
# Template Impact (Faz G)
# ---------------------------------------------------------------------------

class TemplateImpact(BaseModel):
    template_id: Optional[str] = None
    template_name: Optional[str] = None
    total_jobs: int
    completed_jobs: int
    failed_jobs: int
    success_rate: Optional[float] = None
    avg_production_duration_seconds: Optional[float] = None


class BlueprintImpact(BaseModel):
    blueprint_id: Optional[str] = None
    blueprint_name: Optional[str] = None
    total_jobs: int
    completed_jobs: int
    success_rate: Optional[float] = None


class TemplateImpactMetrics(BaseModel):
    window: str
    template_stats: list[TemplateImpact] = []
    blueprint_stats: list[BlueprintImpact] = []


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


# ---------------------------------------------------------------------------
# Prompt Assembly Metrics (M37)
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# Daily Trend (shared by Dashboard & Publish)
# ---------------------------------------------------------------------------

class DailyTrendItem(BaseModel):
    date: str
    job_count: int = 0
    completed_count: int = 0
    failed_count: int = 0
    publish_count: int = 0
    publish_success_count: int = 0


# ---------------------------------------------------------------------------
# Dashboard Summary (Admin Dashboard V2)
# ---------------------------------------------------------------------------

class DashboardSummary(BaseModel):
    """Admin Dashboard V2 aggregated summary."""
    window: str
    # KPIs
    total_projects: int = 0
    total_jobs: int = 0
    active_jobs: int = 0
    total_publish: int = 0
    publish_success_rate: Optional[float] = None
    avg_production_duration_seconds: Optional[float] = None
    retry_rate: Optional[float] = None
    failed_job_count: int = 0
    # Operational
    queue_size: int = 0
    recent_errors: list[dict] = []
    # Trends
    daily_trend: list[DailyTrendItem] = []
    module_distribution: list[ModuleDistribution] = []
    platform_distribution: list[dict] = []
    # Filters applied
    filters_applied: dict = {}


# ---------------------------------------------------------------------------
# Publish Analytics
# ---------------------------------------------------------------------------

class PublishAnalytics(BaseModel):
    """Publish-specific analytics."""
    window: str
    total_publish_count: int = 0
    published_count: int = 0
    failed_count: int = 0
    draft_count: int = 0
    in_review_count: int = 0
    scheduled_count: int = 0
    publish_success_rate: Optional[float] = None
    avg_time_to_publish_seconds: Optional[float] = None
    platform_breakdown: list[dict] = []
    daily_publish_trend: list[DailyTrendItem] = []
    filters_applied: dict = {}


# ---------------------------------------------------------------------------
# Prompt Assembly Metrics (M37)
# ---------------------------------------------------------------------------

class AssemblyModuleStat(BaseModel):
    module_scope: str
    run_count: int
    avg_included_blocks: float
    avg_skipped_blocks: float


class AssemblyProviderStat(BaseModel):
    provider_name: str
    run_count: int
    response_received_count: int
    error_count: int


class PromptAssemblyMetrics(BaseModel):
    window: str
    total_assembly_runs: int = 0
    dry_run_count: int = 0
    production_run_count: int = 0
    avg_included_blocks: float = 0.0
    avg_skipped_blocks: float = 0.0
    module_stats: list[AssemblyModuleStat] = []
    provider_stats: list[AssemblyProviderStat] = []


# ---------------------------------------------------------------------------
# Channel Performance Analytics (Faz 10)
# ---------------------------------------------------------------------------

class ModuleCount(BaseModel):
    module_type: str
    count: int


class EngagementTypeCount(BaseModel):
    type: str
    count: int


class ChannelRanking(BaseModel):
    channel_id: str
    profile_name: str
    channel_slug: str
    status: str
    job_count: int
    completed_count: int
    failed_count: int
    success_rate: Optional[float] = None


class ChannelDailyTrend(BaseModel):
    date: str
    job_count: int = 0
    completed_count: int = 0
    failed_count: int = 0


class RecentError(BaseModel):
    job_id: str
    module_type: Optional[str] = None
    error: str
    created_at: Optional[str] = None


class ChannelPerformance(BaseModel):
    """Kanal bazli performans analytics."""
    window: str
    filters_applied: dict = {}
    # Production
    total_content: int = 0
    total_jobs: int = 0
    completed_jobs: int = 0
    failed_jobs: int = 0
    job_success_rate: Optional[float] = None
    avg_production_duration_seconds: Optional[float] = None
    retry_rate: Optional[float] = None
    module_distribution: list[ModuleCount] = []
    # Publish
    total_publish: int = 0
    published_count: int = 0
    failed_publish: int = 0
    publish_success_rate: Optional[float] = None
    # Engagement
    total_comments: int = 0
    replied_comments: int = 0
    pending_comments: int = 0
    reply_rate: Optional[float] = None
    total_engagement_tasks: int = 0
    executed_tasks: int = 0
    failed_tasks: int = 0
    engagement_type_distribution: list[EngagementTypeCount] = []
    total_posts: int = 0
    draft_posts: int = 0
    queued_posts: int = 0
    posted_posts: int = 0
    total_playlists: int = 0
    total_playlist_items: int = 0
    # Channel health
    total_connections: int = 0
    connected_connections: int = 0
    # Trends & rankings
    daily_trend: list[ChannelDailyTrend] = []
    channel_rankings: list[ChannelRanking] = []
    recent_errors: list[RecentError] = []
