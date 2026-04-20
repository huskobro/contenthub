"""
Foundation models — Phase 2, 3, 4, 7, 11.

Bootstrap tables (Phase 2):
  - app_state: key/value application state store
  - audit_logs: append-only audit trail
  - users: local role model baseline (no auth yet)

Domain models (Phase 3+):
  - settings: settings registry — product objects with metadata, not ad-hoc config
  - visibility_rules: visibility engine — first-class visibility rules per target/role/mode

Domain models (Phase 7+):
  - jobs: job engine — first-class job objects with state, ownership, timing
  - job_steps: per-step tracking within a job

Domain models (Phase 11+):
  - standard_videos: standard video module input records

Domain models (Phase 12+):
  - standard_video_scripts: script artifact per standard video

Domain models (Phase 13+):
  - standard_video_metadata: publish metadata artifact per standard video

Domain models (Phase M7+):
  - publish_records: Publish Center — birincil publish kayıt objesi
  - publish_logs: Publish Center — denetim izi; her olay ayrı satır

Analytics domain models live alongside the analytics service module
(`app.analytics`); only cross-cutting tables are declared here.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Text, DateTime, Boolean, Integer, Float, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _uuid() -> str:
    return str(uuid.uuid4())


class AppState(Base):
    __tablename__ = "app_state"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    key: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    value_json: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now, onupdate=_now
    )


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    actor_type: Mapped[str] = mapped_column(String(50), nullable=False)
    actor_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    action: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    entity_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    entity_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    details_json: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )


class User(Base):
    """Multi-user foundation — M40.

    slug: filesystem-safe identifier derived from display_name.
          Used for workspace paths: workspace/users/{slug}/jobs/
    """

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(50), nullable=False, default="user")
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="active")
    password_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now, onupdate=_now
    )


class UserSettingOverride(Base):
    """Per-user setting override — M40.

    Only honored when the parent Setting has user_override_allowed=True.
    Resolution chain: user_override → admin_value → default_value → env → builtin.
    """

    __tablename__ = "user_setting_overrides"
    __table_args__ = (
        UniqueConstraint("user_id", "setting_key", name="uq_user_setting_key"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    setting_key: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    value_json: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now, onupdate=_now
    )


class Setting(Base):
    """Settings registry — product objects with metadata, not ad-hoc config.

    Each setting carries full visibility, editability, and wizard metadata so
    that the Visibility Engine and Wizard flows can query it directly.
    json fields store arbitrary JSON text; no structural enforcement at the DB
    layer (validation lives in the service layer).
    """

    __tablename__ = "settings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    key: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    group_name: Mapped[str] = mapped_column(String(100), nullable=False, default="general", index=True)
    type: Mapped[str] = mapped_column(String(50), nullable=False, default="string")
    default_value_json: Mapped[str] = mapped_column(Text, nullable=False, default="null")
    admin_value_json: Mapped[str] = mapped_column(Text, nullable=False, default="null")
    user_override_allowed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    visible_to_user: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    visible_in_wizard: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    read_only_for_user: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    module_scope: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    help_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    validation_rules_json: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="active")
    version: Mapped[int] = mapped_column(nullable=False, default=1)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now, onupdate=_now
    )


class VisibilityRule(Base):
    """Visibility Engine — first-class visibility rules.

    Each rule declares whether a target (page, widget, field, wizard_step)
    is visible, read-only, or wizard-visible for a given role and/or mode.
    The visibility resolver (`app.visibility.service`) queries these rows and
    merges them with the requesting context. Higher priority value = evaluated
    first.

    rule_type  : the category of the target (page, widget, field, wizard_step)
    target_key : stable unique identifier of the controlled element
    module_scope : which content module this applies to; null = platform-wide
    role_scope   : 'admin', 'user', or null = applies to all roles
    mode_scope   : 'guided', 'advanced', or null = applies to all modes
    visible       : is the target visible at all
    read_only     : if visible, is it read-only
    wizard_visible: is it shown inside wizard flows
    status        : 'active' / 'inactive' — inactive rules are ignored by resolver
    priority      : higher value = higher precedence when multiple rules match
    notes         : optional short human-readable explanation
    """

    __tablename__ = "visibility_rules"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    rule_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    target_key: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    module_scope: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    role_scope: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    mode_scope: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    visible: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    read_only: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    wizard_visible: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="active")
    priority: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now, onupdate=_now
    )


class Job(Base):
    """Job Engine — first-class job objects.

    Each job represents a content production run. Status is stored as a plain
    string so new states can be introduced without a migration. The initial
    status on creation is 'queued'. Steps are tracked separately in JobStep.

    module_type           : e.g. 'standard_video', 'news_bulletin'
    status                : 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
    owner_id              : nullable until auth is introduced
    template_id           : nullable string FK to Template.id (no DB-level FK
                            because templates can be cloned/archived independently;
                            snapshot in template_snapshot_json owns runtime truth)
    source_context_json   : arbitrary JSON for source/news linkage
    current_step_key      : key of the currently active step
    retry_count           : number of retries attempted
    elapsed_total_seconds : running total; updated by the queue worker on
                            every step boundary (see `app.jobs.pipeline`)
    estimated_remaining_seconds : ETA; null until the worker calculates it
    workspace_path        : local directory for job artifacts
    last_error            : short summary of the most recent failure
    """

    __tablename__ = "jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    module_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="queued", index=True)
    owner_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    template_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    source_context_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    input_data_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    current_step_key: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    retry_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    elapsed_total_seconds: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    estimated_remaining_seconds: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    workspace_path: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    last_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # Faz 2: channel/project/trigger linkage (no FK constraint yet)
    channel_profile_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    content_project_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    trigger_source: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    # Full-Auto Mode v1 — per-job run mode (manual | assisted | full_auto)
    run_mode: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    auto_advanced: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    scheduled_run_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    is_test_data: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    heartbeat_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )
    started_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    finished_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now, onupdate=_now
    )


class JobStep(Base):
    """Per-step tracking within a job.

    step_key          : logical step name, e.g. 'script', 'metadata', 'tts'
    step_order        : integer for display ordering within the job
    status            : same domain as Job.status
    artifact_refs_json: JSON array of artifact paths/references; nullable for now
    log_text          : free-text log captured during step execution
    elapsed_seconds   : how long this step ran
    last_error        : step-level error summary
    """

    __tablename__ = "job_steps"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    job_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    step_key: Mapped[str] = mapped_column(String(100), nullable=False)
    step_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="pending")
    artifact_refs_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    log_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    elapsed_seconds: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    last_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    idempotency_type: Mapped[str] = mapped_column(
        String(50), nullable=False, default="re_executable"
    )
    provider_trace_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )
    started_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    finished_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now, onupdate=_now
    )


class StandardVideo(Base):
    """Standard Video module — input record.

    Stores the user-defined parameters for a standard video production job.
    job_id is populated once the production pipeline is started (see
    standard_video.service.start_production).

    Core fields:
      title             : human-friendly label; nullable
      topic             : main subject of the video; required
      brief             : additional direction or context; nullable
      target_duration_seconds : desired output length in seconds; nullable, not negative
      tone              : e.g. 'formal', 'casual', 'dramatic'
      language          : e.g. 'tr', 'en'
      visual_direction  : e.g. 'clean', 'cinematic', 'minimal'

    Style/layout fields (parity with NewsBulletin):
      composition_direction : e.g. 'classic', 'dynamic', 'fullscreen'
      thumbnail_direction   : e.g. 'text_heavy', 'image_heavy', 'minimal'
      subtitle_style        : subtitle preset id e.g. 'clean_white'
      lower_third_style     : lower-third style id e.g. 'broadcast'
      motion_level          : 'minimal' | 'moderate' | 'dynamic'
      render_format         : 'landscape' | 'portrait'
      karaoke_enabled       : nullable boolean — wizard override
      template_id           : nullable reference to templates.id
      style_blueprint_id    : nullable reference to style_blueprints.id

    Linkage:
      job_id             : loose reference to jobs.id (no hard FK)
      content_project_id : reference to content_projects.id (Faz 5a)
      channel_profile_id : reference to channel_profiles.id (Faz 5a)

    Lifecycle:
      status : 'draft' | 'script_ready' | 'metadata_ready' | 'rendering' | 'completed' | 'failed'
    """

    __tablename__ = "standard_videos"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    topic: Mapped[str] = mapped_column(Text, nullable=False)
    brief: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    target_duration_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    tone: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    language: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    visual_direction: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    subtitle_style: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    # Style/layout fields — production pipeline parity with NewsBulletin
    composition_direction: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    thumbnail_direction: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    lower_third_style: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    motion_level: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    render_format: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    karaoke_enabled: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    template_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    style_blueprint_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="draft", index=True)
    job_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    # Faz 5a: project/channel linkage
    content_project_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    channel_profile_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    is_test_data: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now, onupdate=_now
    )


class StandardVideoScript(Base):
    """Script artifact for a Standard Video record.

    Stores the script content produced (manually or generated) for a standard
    video. The relationship to StandardVideo is a real FK with cascade delete.
    One active script per video is the v1 assumption; version field allows
    future expansion without a migration.

    standard_video_id : FK to standard_videos.id (CASCADE)
    content           : full script text; required, not blank
    version           : integer version counter; starts at 1
    source_type       : 'manual' | 'generated' — how the script was produced
    generation_status : e.g. 'draft', 'ready'
    notes             : optional short annotation
    """

    __tablename__ = "standard_video_scripts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    standard_video_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("standard_videos.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    source_type: Mapped[str] = mapped_column(String(50), nullable=False, default="manual")
    generation_status: Mapped[str] = mapped_column(String(50), nullable=False, default="draft")
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now, onupdate=_now
    )


class StandardVideoMetadata(Base):
    """Publish-ready metadata artifact for a Standard Video record.

    Stores title, description, tags, and related fields that will eventually
    feed into a publish payload. One active record per video in v1; version
    field allows future expansion.

    standard_video_id : FK to standard_videos.id (CASCADE)
    title             : publish title; required, not blank
    description       : publish description; nullable
    tags_json         : JSON text list of tags; nullable
    category          : e.g. 'education', 'news', 'general'
    language          : e.g. 'tr', 'en'
    version           : integer version counter; starts at 1
    source_type       : 'manual' | 'generated'
    generation_status : e.g. 'draft', 'ready'
    notes             : optional short annotation
    """

    __tablename__ = "standard_video_metadata"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    standard_video_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("standard_videos.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tags_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    language: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    source_type: Mapped[str] = mapped_column(String(50), nullable=False, default="manual")
    generation_status: Mapped[str] = mapped_column(String(50), nullable=False, default="draft")
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now, onupdate=_now
    )


class Template(Base):
    """
    Template Engine — Phase 18.

    template_type  : 'style' | 'content' | 'publish'
    owner_scope    : 'system' | 'admin' | 'user'
    module_scope   : e.g. 'standard_video', 'news_bulletin', or null (global)
    style_profile_json   : style template data payload
    content_rules_json   : content template data payload
    publish_profile_json : publish template data payload
    status         : e.g. 'draft', 'active', 'archived'
    version        : integer version counter
    """

    __tablename__ = "templates"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    template_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    owner_scope: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    module_scope: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    style_profile_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    content_rules_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    publish_profile_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="draft", index=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    is_test_data: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now, onupdate=_now
    )


class StyleBlueprint(Base):
    """
    Style Blueprint — Phase 21.

    First-class admin-managed style definition object.
    Defines visual identity, motion, layout, subtitle, thumbnail, and preview rules.
    Separate from Template — Templates and StyleBlueprints are independent
    first-class objects; selection happens at job creation time via the wizard
    (no implicit linkage table).

    name           : blueprint name
    module_scope   : e.g. 'standard_video', 'news_bulletin', or null (global)
    status         : e.g. 'draft', 'active', 'archived'
    version        : integer version counter
    visual_rules_json    : general visual identity rules
    motion_rules_json    : motion/effect approach
    layout_rules_json    : composition/layout approach
    subtitle_rules_json  : subtitle style rules
    thumbnail_rules_json : thumbnail direction rules
    preview_strategy_json: future preview-first system hook
    notes          : short description/notes
    """

    __tablename__ = "style_blueprints"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    module_scope: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="draft", index=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    visual_rules_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    motion_rules_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    layout_rules_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    subtitle_rules_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    thumbnail_rules_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    preview_strategy_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_test_data: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now, onupdate=_now
    )


class NewsSource(Base):
    """
    News Source Registry — Phase 23.

    First-class admin-managed news source record.
    Supports RSS, manual URL, and API source types.
    Foundation for source scan engine, used-news registry, and News Bulletin module.

    name         : user-friendly source name
    source_type  : e.g. 'rss', 'manual_url', 'api'
    base_url     : main site/source URL (nullable)
    feed_url     : RSS/Atom feed address (nullable)
    api_endpoint : API-based source endpoint (nullable)
    trust_level  : e.g. 'low', 'medium', 'high'
    scan_mode    : e.g. 'manual', 'auto', 'curated'
    language     : e.g. 'tr', 'en'
    category     : e.g. 'general', 'crypto', 'finance', 'tech'
    status       : e.g. 'active', 'paused', 'archived'
    notes        : short description/notes
    """

    __tablename__ = "news_sources"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    source_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    base_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    feed_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    api_endpoint: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    trust_level: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)
    scan_mode: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)
    language: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="active", index=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_test_data: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now, onupdate=_now
    )


class SourceScan(Base):
    """
    Source scan records — Phase 26.

    Tracks scan attempts (manual, auto, curated) against a NewsSource.
    Does not perform real fetches; stores scan state and results summary.

    source_id        : FK to news_sources.id
    scan_mode        : 'manual', 'auto', 'curated'
    status           : 'queued', 'completed', 'failed'
    requested_by     : optional initiator identifier
    started_at       : when scan started (nullable)
    finished_at      : when scan finished (nullable)
    result_count     : number of items found (nullable)
    error_summary    : short error description on failure (nullable)
    raw_result_preview_json : small preview of raw results (nullable)
    notes            : short description/notes
    """

    __tablename__ = "source_scans"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    source_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    scan_mode: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="queued", index=True)
    requested_by: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    result_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    error_summary: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    raw_result_preview_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now, onupdate=_now
    )


class NewsItem(Base):
    """
    News items — Phase 28.

    Normalized news records. Source of truth for news content
    before it enters the Used News Registry or News Bulletin.

    source_id       : optional FK reference to news_sources.id
    source_scan_id  : optional FK reference to source_scans.id
    title           : headline (required, not blank)
    url             : item URL (required, not blank)
    summary         : short summary (nullable)
    published_at    : original publish datetime (nullable)
    language        : e.g. 'tr', 'en'
    category        : e.g. 'general', 'tech'
    status          : 'new', 'used', 'ignored' (Gate Sources Closure — 'reviewed' KALKTI; migration bu kayitlari 'new'e tasir)
    dedupe_key      : placeholder for future dedupe (nullable)
    raw_payload_json: small trace of raw source data (nullable)
    """

    __tablename__ = "news_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    source_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    source_scan_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    url: Mapped[str] = mapped_column(String(1000), nullable=False, index=True)
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    language: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="new", index=True)
    dedupe_key: Mapped[Optional[str]] = mapped_column(String(500), nullable=True, index=True)
    raw_payload_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # M41: Haber görseli URL'si (RSS media:content, enclosure, og:image)
    image_url: Mapped[Optional[str]] = mapped_column(String(2000), nullable=True)
    # M41a: Çoklu görsel URL'leri (JSON array, max 5)
    image_urls_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_test_data: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now, onupdate=_now
    )


class UsedNewsRegistry(Base):
    """
    Used News Registry — Phase 29.

    Tracks which news items have been consumed and in what context.
    Provides the data surface for future duplicate-prevention logic.

    news_item_id   : reference to news_items.id (required)
    usage_type     : e.g. 'draft', 'published', 'scheduled', 'reserved'
    usage_context  : short human-readable context string (nullable)
    target_module  : e.g. 'news_bulletin', 'standard_video', 'publish_center'
    target_entity_id: nullable reference to related job/content/publish entity
    notes          : optional free-text note
    """

    __tablename__ = "used_news_registry"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    news_item_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    usage_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    usage_context: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    target_module: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    target_entity_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now, onupdate=_now
    )


class NewsBulletin(Base):
    """
    News Bulletin — Phase 30.

    Input record for a news bulletin production run.
    Stores configuration and selected news references.

    title                 : user-friendly record name (nullable)
    topic                 : main subject / headline (required, not blank)
    brief                 : short direction text (nullable)
    target_duration_seconds: target output duration in seconds (nullable, non-negative)
    language              : e.g. 'tr', 'en'
    tone                  : e.g. 'formal', 'casual', 'urgent'
    bulletin_style        : e.g. 'studio', 'futuristic', 'traditional'
    source_mode           : e.g. 'manual', 'curated', 'auto'
    selected_news_ids_json: JSON text list of manually selected news item ids
    status                : e.g. 'draft', 'in_progress', 'done'
    job_id                : nullable reference to jobs.id
    composition_direction : e.g. 'classic', 'side_by_side', 'fullscreen', 'dynamic' (M29)
    thumbnail_direction   : e.g. 'text_heavy', 'image_heavy', 'split', 'minimal' (M29)
    template_id           : nullable reference to templates.id (M29)
    style_blueprint_id    : nullable reference to style_blueprints.id (M29)
    render_mode           : 'combined', 'per_category', 'per_item' (M30, default 'combined')
    subtitle_style        : subtitle preset_id e.g. 'clean_white', 'bold_yellow' (M30)
    lower_third_style     : lower-third style e.g. 'broadcast', 'minimal', 'modern' (M30)
    trust_enforcement_level: 'none', 'warn', 'block' — source trust gate (M30)
    """

    __tablename__ = "news_bulletins"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    title: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    topic: Mapped[str] = mapped_column(Text, nullable=False)
    brief: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    target_duration_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    language: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    tone: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    bulletin_style: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    source_mode: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    selected_news_ids_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="draft", index=True)
    job_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    composition_direction: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    thumbnail_direction: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    template_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    style_blueprint_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    render_mode: Mapped[Optional[str]] = mapped_column(String(30), nullable=True, default="combined")
    subtitle_style: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    lower_third_style: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    trust_enforcement_level: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, default="warn")
    # M41a: Wizard'dan gelen format ve karaoke seçimi
    render_format: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    karaoke_enabled: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    # M42: Karaoke animasyon preset — 'hype' | 'explosive' | 'vibrant' | 'minimal'
    karaoke_anim_preset: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    # Faz 5a: project/channel linkage
    content_project_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    channel_profile_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    is_test_data: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now, onupdate=_now
    )


class NewsBulletinScript(Base):
    """
    News Bulletin Script — Phase 33.

    Stores the script artifact for a news bulletin production run.

    news_bulletin_id  : FK to news_bulletins.id (required)
    content           : script text (required, not blank)
    version           : integer version counter, starts at 1
    source_type       : 'manual' or 'generated'
    generation_status : 'draft', 'ready'
    notes             : optional free-text note
    """

    __tablename__ = "news_bulletin_scripts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    news_bulletin_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("news_bulletins.id"),
        nullable=False,
        index=True,
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    source_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    generation_status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="draft"
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now, onupdate=_now
    )


class NewsBulletinSelectedItem(Base):
    """
    News Bulletin Selected Items — Phase 37.

    Explicit linkage table between a news bulletin and the news items
    chosen for it.  Provides ordering and selection context without
    overwriting the legacy selected_news_ids_json field.

    news_bulletin_id  : FK to news_bulletins.id (required, indexed)
    news_item_id      : FK to news_items.id (required, indexed)
    sort_order        : display/processing order (non-negative)
    selection_reason  : optional note about why this item was chosen
    edited_narration  : operator-edited narration text (M28); if set, pipeline uses
                        this instead of LLM-generated narration for this item
    """

    __tablename__ = "news_bulletin_selected_items"
    __table_args__ = (
        UniqueConstraint("news_bulletin_id", "news_item_id", name="uq_bulletin_news_item"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    news_bulletin_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("news_bulletins.id"),
        nullable=False,
        index=True,
    )
    news_item_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("news_items.id"),
        nullable=False,
        index=True,
    )
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    selection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    edited_narration: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now, onupdate=_now
    )


class NewsBulletinMetadata(Base):
    """
    News Bulletin Metadata — Phase 34.

    Stores publish-ready metadata artifact for a news bulletin.

    news_bulletin_id  : FK to news_bulletins.id (required)
    title             : metadata title (nullable)
    description       : description text (nullable)
    tags_json         : JSON text list of tags (nullable)
    category          : e.g. 'news', 'crypto', 'finance', 'general'
    language          : e.g. 'tr', 'en'
    version           : integer version counter, starts at 1
    source_type       : 'manual' or 'generated'
    generation_status : 'draft', 'ready'
    notes             : optional free-text note
    """

    __tablename__ = "news_bulletin_metadata"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    news_bulletin_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("news_bulletins.id"),
        nullable=False,
        index=True,
    )
    title: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tags_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    language: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    source_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    generation_status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="draft"
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now, onupdate=_now
    )


class TemplateStyleLink(Base):
    """
    Template <-> Style Blueprint Link -- Phase 43.

    First-class association between a Template and a Style Blueprint.
    Makes the relationship visible, queryable, and manageable via admin.

    template_id         : FK to templates.id (required, indexed)
    style_blueprint_id  : FK to style_blueprints.id (required, indexed)
    link_role           : e.g. 'primary', 'fallback', 'experimental'
    status              : e.g. 'active', 'inactive', 'archived'
    notes               : optional note
    """

    __tablename__ = "template_style_links"
    __table_args__ = (
        UniqueConstraint("template_id", "style_blueprint_id", name="uq_template_style_blueprint"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    template_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("templates.id"),
        nullable=False,
        index=True,
    )
    style_blueprint_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("style_blueprints.id"),
        nullable=False,
        index=True,
    )
    link_role: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="active")
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now, onupdate=_now
    )


class PublishRecord(Base):
    """
    Publish Center — Birincil publish kayıt objesi (Phase M7).

    Her publish girişimi ayrı bir kayıt olarak tutulur.
    Durum makinesi publish/publish/state_machine.py içinde tanımlıdır.
    Tüm durum geçişleri PublishStateMachine üzerinden geçmek zorundadır.

    İzolasyon notu (M7 kuralı):
      Bu kayıt content/editorial state'i temsil etmez.
      StandardVideo veya NewsBulletin objesinin durumunu DEĞİŞTİRMEZ.
      Publish sonucu yalnızca bu tabloya ve PublishLog'a yazılır.

    Publish gate kuralı (M7):
      Yayınlama yalnızca approved veya scheduled durumundan başlayabilir.
      pending_review veya draft durumundan doğrudan yayınlama yasaktır.
      Bu kural PublishStateMachine.can_publish() ile zorlanır.

    Kısmi başarısızlık semantiği:
      publishing → failed: platform zinciri kırıldı, retry mümkün.
      Her retry, aynı PublishRecord üzerinde yeni bir publish_attempt_count
      artışıyla tekrar publishing durumuna geçer. Her deneme PublishLog'a kaydedilir.

    Alanlar:
      job_id             : üretim işinin ID'si (jobs tablosu, zorunlu)
      content_ref_type   : içerik türü (e.g. 'standard_video', 'news_bulletin')
      content_ref_id     : içerik kaydının ID'si (FK değil; tip bağımsız)
      platform           : hedef platform (e.g. 'youtube')
      status             : mevcut publish durumu (PublishStatus değerleri)
      review_state       : review kararı (e.g. 'pending', 'approved', 'rejected')
      reviewer_id        : review kararı veren kullanıcı ID'si (nullable)
      reviewed_at        : review kararı zamanı (nullable)
      scheduled_at       : zamanlanan yayın zamanı (nullable)
      published_at       : başarılı publish zamanı (nullable)
      platform_video_id  : platform'un atadığı video ID'si (nullable; upload sonrası)
      platform_url       : yayınlanan videonun platform URL'i (nullable)
      publish_attempt_count : toplam publish deneme sayısı
      last_error         : son başarısızlık özeti (nullable)
      payload_json       : publish payload snapshot'ı (title, description, tags, vb.)
      result_json        : platform'dan gelen son yanıt özeti (nullable)
      notes              : operatör notu (nullable)
    """

    __tablename__ = "publish_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    job_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    content_ref_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    content_ref_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    platform: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="draft", index=True
    )
    review_state: Mapped[str] = mapped_column(
        String(50), nullable=False, default="pending"
    )
    reviewer_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    scheduled_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    published_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    platform_video_id: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    platform_url: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    publish_attempt_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # Gate 4 (Publish Closure): mapped error category for triage UX.
    # Allowed values: app.publish.enums.PublishErrorCategory.
    # Default 'unknown' for legacy rows; categorize_publish_error() fills it.
    last_error_category: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True, default=None
    )
    payload_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    result_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # Faz 2: project/platform-connection linkage (no FK constraint yet)
    content_project_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    platform_connection_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    publish_intent_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    publish_result_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_test_data: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now, onupdate=_now
    )


class VideoStatsSnapshot(Base):
    """
    YouTube video istatistik snapshot'i — periyodik kayit.

    Her snapshot cekildiginde video basina bir satir olusturulur.
    Zaman serisi analizi icin kullanilir.
    M14-C: youtube.upload scope ile Data API v3'ten alinan veriler.
    """

    __tablename__ = "video_stats_snapshots"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    platform_video_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    view_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    like_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    comment_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    snapshot_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now, index=True
    )
    # Faz 2: platform connection linkage (no FK constraint yet)
    platform_connection_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)


# ============================================================================
# Sprint 1 — YouTube Analytics API v2 (yt-analytics.readonly)
# ============================================================================
#
# Alttaki tablolar YouTube Analytics API v2'den cekilen gercek metrikleri
# tutar. Mevcut VideoStatsSnapshot (Data API v3) ile ayri yasar: birisi
# publish pipeline'i icin temel counter'lari, digerleri analitik dashboard
# icin detayli metrikleri tutar. Snapshot_date kolonu PK'nin parcasi
# olarak upsert semantigi saglar.
#
# Scope gereksinimi: https://www.googleapis.com/auth/yt-analytics.readonly
# Daily sync job bu tablolari per-connection doldurur; mevcut publish
# flow'unu hic etkilemez.


class YouTubeChannelAnalyticsDaily(Base):
    """
    Kanal seviyesi gunluk YouTube Analytics snapshot'i.

    Bir (platform_connection_id, date) cifti icin tek satir.
    channel==MINE icin gunluk metrikler (views, watch time, subscribers).

    Metrics (from YouTubeAnalyticsClient.CHANNEL_CORE_METRICS):
      - views, estimatedMinutesWatched, averageViewDuration
      - averageViewPercentage, subscribersGained/Lost, likes, shares, comments
    """

    __tablename__ = "youtube_channel_analytics_daily"
    __table_args__ = (
        UniqueConstraint(
            "platform_connection_id", "snapshot_date",
            name="uq_yt_channel_analytics_conn_date",
        ),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    platform_connection_id: Mapped[str] = mapped_column(
        String(36), nullable=False, index=True
    )
    snapshot_date: Mapped[str] = mapped_column(
        String(10), nullable=False, index=True
    )  # YYYY-MM-DD
    views: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    estimated_minutes_watched: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    average_view_duration_seconds: Mapped[float] = mapped_column(
        Float, nullable=False, default=0.0
    )
    average_view_percentage: Mapped[float] = mapped_column(
        Float, nullable=False, default=0.0
    )  # 0..1 (scaled from API 0..100)
    subscribers_gained: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    subscribers_lost: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    likes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    shares: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    comments: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    fetched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )


class YouTubeVideoAnalyticsDaily(Base):
    """
    Video seviyesi gunluk YouTube Analytics snapshot'i.

    Bir (platform_connection_id, platform_video_id, snapshot_date)
    uclusu icin tek satir.

    Metrics (from YouTubeAnalyticsClient.VIDEO_DETAIL_METRICS):
      views, estimatedMinutesWatched, averageViewDuration,
      averageViewPercentage, likes, shares, comments, subscribersGained,
      cardImpressions/Clicks/ClickRate
    """

    __tablename__ = "youtube_video_analytics_daily"
    __table_args__ = (
        UniqueConstraint(
            "platform_connection_id", "platform_video_id", "snapshot_date",
            name="uq_yt_video_analytics_conn_vid_date",
        ),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    platform_connection_id: Mapped[str] = mapped_column(
        String(36), nullable=False, index=True
    )
    platform_video_id: Mapped[str] = mapped_column(
        String(128), nullable=False, index=True
    )
    snapshot_date: Mapped[str] = mapped_column(
        String(10), nullable=False, index=True
    )
    views: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    estimated_minutes_watched: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    average_view_duration_seconds: Mapped[float] = mapped_column(
        Float, nullable=False, default=0.0
    )
    average_view_percentage: Mapped[float] = mapped_column(
        Float, nullable=False, default=0.0
    )
    likes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    shares: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    comments: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    subscribers_gained: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    card_impressions: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    card_clicks: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    card_click_rate: Mapped[float] = mapped_column(
        Float, nullable=False, default=0.0
    )
    fetched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )


class YouTubeAudienceRetention(Base):
    """
    Video audience retention curve (elapsedVideoTimeRatio dimension).

    Her satir: (connection, video, ratio bucket) — ratio 0.0 ile 1.0 arasinda,
    YouTube 100 bucket donuyor (0.00, 0.01, ..., 1.00).

    audienceWatchRatio 0..1 (scaled). Yeni sorgu oncesi eski satirlar
    silinir (last-writer-wins) — retention curve snapshot bazli degil,
    window bazli cekilir.
    """

    __tablename__ = "youtube_audience_retention"
    __table_args__ = (
        UniqueConstraint(
            "platform_connection_id", "platform_video_id", "elapsed_ratio",
            "window_start", "window_end",
            name="uq_yt_retention_conn_vid_ratio_window",
        ),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    platform_connection_id: Mapped[str] = mapped_column(
        String(36), nullable=False, index=True
    )
    platform_video_id: Mapped[str] = mapped_column(
        String(128), nullable=False, index=True
    )
    elapsed_ratio: Mapped[float] = mapped_column(Float, nullable=False)
    audience_watch_ratio: Mapped[float] = mapped_column(
        Float, nullable=False, default=0.0
    )
    relative_retention_performance: Mapped[float] = mapped_column(
        Float, nullable=False, default=0.0
    )
    window_start: Mapped[str] = mapped_column(String(10), nullable=False)
    window_end: Mapped[str] = mapped_column(String(10), nullable=False)
    fetched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )


class YouTubeDemographicsSnapshot(Base):
    """
    YouTube demographics breakdown — ageGroup + gender.

    Her satir: (connection, video_id|'', age_group, gender, window).
    video_id bos string ise kanal-geneli.
    viewer_percentage 0..1 (scaled from API 0..100).
    """

    __tablename__ = "youtube_demographics_snapshot"
    __table_args__ = (
        UniqueConstraint(
            "platform_connection_id", "platform_video_id",
            "age_group", "gender", "window_start", "window_end",
            name="uq_yt_demographics_keys",
        ),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    platform_connection_id: Mapped[str] = mapped_column(
        String(36), nullable=False, index=True
    )
    platform_video_id: Mapped[str] = mapped_column(
        String(128), nullable=False, default="", index=True
    )
    age_group: Mapped[str] = mapped_column(String(20), nullable=False)
    gender: Mapped[str] = mapped_column(String(20), nullable=False)
    viewer_percentage: Mapped[float] = mapped_column(
        Float, nullable=False, default=0.0
    )
    window_start: Mapped[str] = mapped_column(String(10), nullable=False)
    window_end: Mapped[str] = mapped_column(String(10), nullable=False)
    fetched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )


class YouTubeTrafficSourceSnapshot(Base):
    """
    YouTube traffic source breakdown (insightTrafficSourceType).

    Source types: YT_SEARCH, EXT_URL, SUGGESTED_VIDEO, BROWSE, PLAYLIST,
    NO_LINK_OTHER, SUBSCRIBER, NOTIFICATION, END_SCREEN, ADVERTISING vb.
    video_id bos string ise kanal-geneli.
    """

    __tablename__ = "youtube_traffic_source_snapshot"
    __table_args__ = (
        UniqueConstraint(
            "platform_connection_id", "platform_video_id",
            "traffic_source_type", "window_start", "window_end",
            name="uq_yt_traffic_keys",
        ),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    platform_connection_id: Mapped[str] = mapped_column(
        String(36), nullable=False, index=True
    )
    platform_video_id: Mapped[str] = mapped_column(
        String(128), nullable=False, default="", index=True
    )
    traffic_source_type: Mapped[str] = mapped_column(String(50), nullable=False)
    views: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    estimated_minutes_watched: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    window_start: Mapped[str] = mapped_column(String(10), nullable=False)
    window_end: Mapped[str] = mapped_column(String(10), nullable=False)
    fetched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )


class YouTubeDeviceSnapshot(Base):
    """
    YouTube device + OS breakdown (deviceType dimension).

    Device types: MOBILE, DESKTOP, TV, TABLET, GAME_CONSOLE, UNKNOWN_PLATFORM.
    video_id bos string ise kanal-geneli.
    """

    __tablename__ = "youtube_device_snapshot"
    __table_args__ = (
        UniqueConstraint(
            "platform_connection_id", "platform_video_id",
            "device_type", "window_start", "window_end",
            name="uq_yt_device_keys",
        ),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    platform_connection_id: Mapped[str] = mapped_column(
        String(36), nullable=False, index=True
    )
    platform_video_id: Mapped[str] = mapped_column(
        String(128), nullable=False, default="", index=True
    )
    device_type: Mapped[str] = mapped_column(String(30), nullable=False)
    views: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    estimated_minutes_watched: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    window_start: Mapped[str] = mapped_column(String(10), nullable=False)
    window_end: Mapped[str] = mapped_column(String(10), nullable=False)
    fetched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )


class YouTubeAnalyticsSyncLog(Base):
    """
    Per-run sync log (audit trail).

    Her scheduler run'i icin bir satir: baslangic, bitis, basarili video
    sayisi, hata mesaji. Dashboard'da 'son sync' kartinda goster.
    """

    __tablename__ = "youtube_analytics_sync_log"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    platform_connection_id: Mapped[str] = mapped_column(
        String(36), nullable=False, index=True
    )
    run_kind: Mapped[str] = mapped_column(
        String(30), nullable=False, default="daily"
    )  # daily / manual / backfill
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="running"
    )  # running / ok / partial / failed
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )
    finished_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    videos_synced: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    rows_written: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    trigger_source: Mapped[str] = mapped_column(
        String(30), nullable=False, default="scheduler"
    )


class PublishLog(Base):
    """
    Publish Center — Denetim izi (Phase M7).

    Her anlamlı publish olayı için append-only log satırı.
    Hiçbir satır silinemez veya güncellenemez — salt denetim kaydıdır.
    created_at + event_type + actor kombinasyonu tam denetlenebilirlik sağlar.

    Kural:
      Her durum geçişi, her review kararı, her platform olayı ve her
      retry girişimi ayrı bir PublishLog satırı oluşturur.
      "Denetim izi" boşluğu olmamalıdır.

    Alanlar:
      publish_record_id : FK to publish_records.id (CASCADE)
      event_type        : olay türü (PublishLogEvent değerleri)
      actor_type        : 'user', 'admin', 'system'
      actor_id          : olay sahibi ID (nullable)
      from_status       : geçiş öncesi durum (nullable; state_transition olayları için)
      to_status         : geçiş sonrası durum (nullable; state_transition olayları için)
      detail_json       : olaya özel ek veriler (platform yanıtı, hata detayı, vb.)
      note              : kısa açıklama (nullable)
      created_at        : olay zamanı (UTC)
    """

    __tablename__ = "publish_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    publish_record_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("publish_records.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    event_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    actor_type: Mapped[str] = mapped_column(String(50), nullable=False)
    actor_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    from_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    to_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    detail_json: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )


class WizardConfig(Base):
    """
    Wizard Configuration — M32.

    Her wizard tipi (news_bulletin, standard_video) icin admin-managed
    adim ve alan yapilandirmasi tutar.

    steps_config_json:
      JSON dizisi — siralanmis adim tanimlari ve her adimin alanlari.

    field_defaults_json:
      JSON dict — alan bazinda varsayilan degerler.

    wizard_type: unique key — "news_bulletin", "standard_video" vb.
    enabled: wizard tamamen kapatilabilir
    version: admin degisikliklerini izler
    """

    __tablename__ = "wizard_configs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    wizard_type: Mapped[str] = mapped_column(
        String(100), nullable=False, unique=True, index=True
    )
    display_name: Mapped[str] = mapped_column(String(200), nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    steps_config_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    field_defaults_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    module_scope: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="active")
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now, onupdate=_now
    )


class ChannelProfile(Base):
    """Kanal profili — kullanicinin kavramsal yayin profili. Faz 2.

    PHASE X (ownership pack):
      - owner_id = alias semantic for user_id; id hala primary.
      - source_url / normalized_url / platform / external_channel_id / handle /
        title / avatar_url / metadata_json alanlari URL-only create flow'u icin
        eklendi.
      - uq_user_normalized_url — ayni user ayni normalized_url'i iki kez ekleyemez.
    """

    __tablename__ = "channel_profiles"
    __table_args__ = (
        UniqueConstraint("user_id", "channel_slug", name="uq_user_channel_slug"),
        UniqueConstraint(
            "user_id", "normalized_url", name="uq_user_normalized_url"
        ),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    profile_name: Mapped[str] = mapped_column(String(255), nullable=False)
    profile_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    channel_slug: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    default_language: Mapped[str] = mapped_column(String(10), nullable=False, default="tr")
    default_content_mode: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    brand_profile_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    automation_policy_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    # --- PHASE X: URL-only create + auto-import metadata ---------------------
    platform: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)
    source_url: Mapped[Optional[str]] = mapped_column(String(2000), nullable=True)
    normalized_url: Mapped[Optional[str]] = mapped_column(
        String(2000), nullable=True, index=True
    )
    external_channel_id: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    handle: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    title: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(2000), nullable=True)
    metadata_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    import_status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="pending"
    )
    import_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    last_import_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    # --- mevcut ---------------------------------------------------------------
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="active")
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now, onupdate=_now
    )

    @property
    def owner_id(self) -> str:  # ownership semantic alias (read-only)
        return self.user_id


class PlatformConnection(Base):
    """Platform baglantisi — gercek platform hesabi. Faz 2."""

    __tablename__ = "platform_connections"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    channel_profile_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("channel_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    platform: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    external_account_id: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    external_account_name: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    external_avatar_url: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    auth_state: Mapped[str] = mapped_column(String(50), nullable=False, default="pending")
    token_state: Mapped[str] = mapped_column(String(50), nullable=False, default="invalid")
    scopes_granted: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    scopes_required: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    scope_status: Mapped[str] = mapped_column(String(50), nullable=False, default="insufficient")
    features_available: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    connection_status: Mapped[str] = mapped_column(String(50), nullable=False, default="disconnected")
    requires_reauth: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    sync_status: Mapped[str] = mapped_column(String(50), nullable=False, default="never")
    last_sync_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_success_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_primary: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    subscriber_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now, onupdate=_now
    )


class PlatformCredential(Base):
    """Platform kimlik bilgileri — sifrelenmis tokenlar. Faz 2."""

    __tablename__ = "platform_credentials"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    platform_connection_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("platform_connections.id", ondelete="CASCADE"),
        nullable=False, unique=True
    )
    access_token: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    refresh_token: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    token_expiry: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    client_id: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    client_secret: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    scopes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    raw_token_response: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now, onupdate=_now
    )


class ContentProject(Base):
    """Icerik projesi — kullanicinin gordugu birincil entity. Faz 2."""

    __tablename__ = "content_projects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    channel_profile_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("channel_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # PHASE AG: artik modul-ustu konteyner. NULL / "mixed" yeni davranis;
    # legacy somut degerler ("standard_video" vb.) geriye uyum icin korunur.
    module_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    current_stage: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    content_status: Mapped[str] = mapped_column(String(50), nullable=False, default="draft")
    review_status: Mapped[str] = mapped_column(String(50), nullable=False, default="not_required")
    publish_status: Mapped[str] = mapped_column(String(50), nullable=False, default="unpublished")
    primary_platform: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    origin_type: Mapped[str] = mapped_column(String(50), nullable=False, default="original")
    priority: Mapped[str] = mapped_column(String(50), nullable=False, default="normal")
    deadline_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    active_job_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    latest_output_ref: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # --- Full-Auto Mode v1 — per-project automation config -----------------
    automation_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    automation_run_mode: Mapped[str] = mapped_column(String(50), nullable=False, default="manual")
    automation_schedule_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    automation_cron_expression: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    automation_timezone: Mapped[str] = mapped_column(String(50), nullable=False, default="UTC")
    automation_default_template_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    automation_default_blueprint_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    automation_require_review_gate: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    automation_publish_policy: Mapped[str] = mapped_column(String(50), nullable=False, default="draft")
    automation_fallback_on_error: Mapped[str] = mapped_column(String(50), nullable=False, default="pause")
    automation_max_runs_per_day: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    automation_last_run_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    automation_next_run_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    automation_runs_today: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    automation_runs_today_date: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now, onupdate=_now
    )


class EngagementTask(Base):
    """Platform etkisim gorevi — yorum, playlist, gonderi vb. Faz 2."""

    __tablename__ = "engagement_tasks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    channel_profile_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("channel_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    content_project_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    platform_connection_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("platform_connections.id", ondelete="CASCADE"), nullable=False, index=True
    )
    type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    target_object_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    target_object_id: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    payload: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ai_suggestion: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    final_user_input: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="pending")
    scheduled_for: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    executed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now, onupdate=_now
    )


class SyncedComment(Base):
    """
    YouTube (veya diger platform) yorumlarinin yerel kopyasi.
    Sync islemiyle cekilir, guncellenir.
    """
    __tablename__ = "synced_comments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    platform: Mapped[str] = mapped_column(String(50), index=True, default="youtube")
    platform_connection_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("platform_connections.id", ondelete="SET NULL"),
        nullable=True, index=True,
    )
    channel_profile_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("channel_profiles.id", ondelete="SET NULL"),
        nullable=True, index=True,
    )
    content_project_id: Mapped[Optional[str]] = mapped_column(
        String(36), nullable=True, index=True,
    )

    # YouTube IDs
    external_comment_id: Mapped[str] = mapped_column(String(500), unique=True, index=True)
    external_video_id: Mapped[str] = mapped_column(String(500), index=True)
    external_parent_id: Mapped[Optional[str]] = mapped_column(String(500), nullable=True, index=True)

    # Comment data
    author_name: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    author_channel_id: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    author_avatar_url: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    text: Mapped[str] = mapped_column(Text, default="")
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    like_count: Mapped[int] = mapped_column(Integer, default=0)
    reply_count: Mapped[int] = mapped_column(Integer, default=0)

    # Status
    is_reply: Mapped[bool] = mapped_column(Boolean, default=False)
    reply_status: Mapped[str] = mapped_column(String(50), default="none")  # none, pending, replied, failed
    our_reply_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    our_reply_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Sync
    sync_status: Mapped[str] = mapped_column(String(50), default="synced")  # synced, stale, error
    last_synced_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now, onupdate=_now,
    )


class SyncedPlaylist(Base):
    """
    YouTube (veya diger platform) playlist'lerinin yerel kopyasi.
    Sync islemiyle cekilir, olusturulur, guncellenir. Faz 8.
    """
    __tablename__ = "synced_playlists"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    platform: Mapped[str] = mapped_column(String(50), index=True, default="youtube")
    platform_connection_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("platform_connections.id", ondelete="SET NULL"),
        nullable=True, index=True,
    )
    channel_profile_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("channel_profiles.id", ondelete="SET NULL"),
        nullable=True, index=True,
    )
    external_playlist_id: Mapped[str] = mapped_column(String(500), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(500), default="")
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    privacy_status: Mapped[str] = mapped_column(String(50), default="private")  # public, unlisted, private
    item_count: Mapped[int] = mapped_column(Integer, default=0)
    thumbnail_url: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)

    sync_status: Mapped[str] = mapped_column(String(50), default="synced")  # synced, stale, error
    last_synced_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now, onupdate=_now,
    )


class SyncedPlaylistItem(Base):
    """
    Playlist icerisindeki video kayitlari. Faz 8.
    """
    __tablename__ = "synced_playlist_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    playlist_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("synced_playlists.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    external_video_id: Mapped[str] = mapped_column(String(500), index=True)
    external_playlist_item_id: Mapped[Optional[str]] = mapped_column(String(500), nullable=True, unique=True)
    content_project_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    publish_record_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    title: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    thumbnail_url: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    position: Mapped[int] = mapped_column(Integer, default=0)

    synced_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now, onupdate=_now,
    )


class PlatformPost(Base):
    """
    Platform gonderisi — community post, share post, announcement vb.
    YouTube community post API ucuncu taraflara acik olmadigi icin
    draft/orchestration modeli olarak calisir. Gercek delivery
    platform adapter'i hazirlanginda eklenecek. Faz 9.
    """
    __tablename__ = "platform_posts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    platform: Mapped[str] = mapped_column(String(50), index=True, default="youtube")
    platform_connection_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("platform_connections.id", ondelete="SET NULL"),
        nullable=True, index=True,
    )
    channel_profile_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("channel_profiles.id", ondelete="SET NULL"),
        nullable=True, index=True,
    )
    content_project_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    publish_record_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)

    external_post_id: Mapped[Optional[str]] = mapped_column(String(500), nullable=True, unique=True, index=True)
    post_type: Mapped[str] = mapped_column(String(100), index=True, default="community_post")
    # community_post, share_post, announcement — future-safe

    title: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    body: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(50), default="draft", index=True)
    # draft, queued, posted, failed

    scheduled_for: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    posted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    delivery_status: Mapped[str] = mapped_column(String(50), default="pending")
    # pending, delivered, failed, not_available (platform API not supported)
    delivery_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now, onupdate=_now,
    )


class BrandProfile(Base):
    """Marka kimlik profili — basit v1. Faz 2."""

    __tablename__ = "brand_profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    owner_user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    brand_name: Mapped[str] = mapped_column(String(255), nullable=False)
    palette: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    typography: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    motion_style: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    logo_path: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    watermark_path: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    watermark_position: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    intro_template_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    outro_template_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    lower_third_defaults: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now, onupdate=_now
    )


class AutomationPolicy(Base):
    """
    Otomasyon politikasi — checkpoint bazli karar modeli. Faz 13.

    Her checkpoint icin 3 mod:
      disabled       — bu adim otomasyon disinda, elle tetiklenir
      manual_review  — otomasyon oneriri, operator onaylar
      automatic      — otomasyon tam yetkili

    policy_decision ≠ execution_result: policy sadece karar verir, calistirma ayri.
    """

    __tablename__ = "automation_policies"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    owner_user_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    # Phase AL / P3.2: approver assignment (NULL => owner is approver).
    # Declarative kolon; publish-gate enforcement sonraki fazda.
    approver_user_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey(
            "users.id",
            name="fk_automation_policies_approver_user_id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )
    channel_profile_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("channel_profiles.id", ondelete="CASCADE"),
        nullable=False, unique=True, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, default="Varsayilan Politika")
    is_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Checkpoint modes — enum: disabled | manual_review | automatic
    source_scan_mode: Mapped[str] = mapped_column(String(50), nullable=False, default="disabled")
    draft_generation_mode: Mapped[str] = mapped_column(String(50), nullable=False, default="manual_review")
    render_mode: Mapped[str] = mapped_column(String(50), nullable=False, default="disabled")
    publish_mode: Mapped[str] = mapped_column(String(50), nullable=False, default="manual_review")
    post_publish_mode: Mapped[str] = mapped_column(String(50), nullable=False, default="disabled")

    # Operational limits
    max_daily_posts: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, default=10)
    publish_windows_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    platform_rules_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now, onupdate=_now
    )


class OperationsInboxItem(Base):
    """
    Operations Inbox ogesi — islem bekleyen veya dikkat gerektiren kayit. Faz 13.

    Tek bir genel inbox dili ile tum islem ogelerini toplar.
    """

    __tablename__ = "operations_inbox_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    item_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    # e.g. publish_review, comment_reply, playlist_action, post_action,
    #      render_failure, publish_failure, source_scan_error
    channel_profile_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("channel_profiles.id", ondelete="SET NULL"),
        nullable=True, index=True
    )
    owner_user_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True, index=True
    )
    related_project_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    related_entity_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    related_entity_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="open", index=True)
    # open, acknowledged, resolved, dismissed
    priority: Mapped[str] = mapped_column(String(50), nullable=False, default="normal")
    # low, normal, high, urgent
    action_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    metadata_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now, onupdate=_now
    )


class NotificationItem(Base):
    """
    Notification Center ogesi — kullanici/admin bildirim katmani. Faz 16.

    Inbox'tan farkli:
      - Inbox = action queue (islem bekleyen)
      - Notification = dikkat cekme / haber verme (okunur/dismiss edilir)

    Her inbox item'in notification'a donusmesi zorunlu degil.
    Sadece operator acisindan anlamli olaylar notification uretir.
    """

    __tablename__ = "notification_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    owner_user_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True, index=True
    )
    scope_type: Mapped[str] = mapped_column(
        String(50), nullable=False, default="user", index=True
    )
    # user, admin, system
    notification_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    # publish_review, publish_failure, render_failure, source_scan_error,
    # overdue_publish, policy_review_required, job_completed, etc.
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    body: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    severity: Mapped[str] = mapped_column(String(50), nullable=False, default="info")
    # info, warning, error, success
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="unread", index=True)
    # unread, read, dismissed
    related_entity_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    related_entity_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    related_inbox_item_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("operations_inbox_items.id", ondelete="SET NULL"),
        nullable=True, index=True
    )
    related_channel_profile_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("channel_profiles.id", ondelete="SET NULL"),
        nullable=True, index=True
    )
    action_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )
    read_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    dismissed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )


# ---------------------------------------------------------------------------
# Product Review Module (Faz A — product_review_001 migration)
# ---------------------------------------------------------------------------


class Product(Base):
    """
    product_review modulu icin urun ana kaydi.

    source_url: operatorun girdigi orijinal link (tracking param'li olabilir)
    canonical_url: normalize edilmis, affiliate/tracking temizlenmis url
                   — partial UNIQUE index (NULL'lara izin verilir)
    parser_source: hangi ingestion adimi cozdu ('jsonld', 'og',
                   'site_specific', 'manual')
    scrape_confidence: 0.0-1.0 — full-auto kapisi bunu kullanir.
    robots_txt_allowed: site robots.txt kontrolune gore (varsayilan kapali,
                       setting ile acilabilir — docs/warning zorunlu).

    Snapshot politikasi v1: her scrape sonrasi bir product_snapshot satiri
    yaratilir; price history tablosu YOK (kullanici karari).
    """

    __tablename__ = "products"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(500), nullable=False)
    brand: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    category: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    vendor: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    source_url: Mapped[str] = mapped_column(Text, nullable=False)
    canonical_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    affiliate_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    current_price: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    currency: Mapped[Optional[str]] = mapped_column(String(10), nullable=True, default="TRY")
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    primary_image_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    parser_source: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    scrape_confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    robots_txt_allowed: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    is_test_data: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now, onupdate=_now
    )


class ProductSnapshot(Base):
    """
    Her scrape icin yazilan anlik fotograf. Migration'da product_id FK
    CASCADE: urun silindiginde snapshot'lar da siler.

    Alanlar:
      - http_status: Content fetch HTTP durumu.
      - price / availability / rating_*: parse sonuclari.
      - raw_html_sha1: deduplikasyon (ayni icerik tekrar tekrar yazilmasin).
      - parsed_json: debug icin tum parse ciktisini tutar.
      - confidence: scrape_engine'in bu snapshot'a verdigi guven skoru.
    """

    __tablename__ = "product_snapshots"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    product_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    fetched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )
    http_status: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    price: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    currency: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    availability: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    rating_value: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    rating_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    raw_html_sha1: Mapped[Optional[str]] = mapped_column(String(40), nullable=True, index=True)
    parsed_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    parser_source: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_test_data: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )


class ProductReview(Base):
    """
    product_review modulunun job engine icin girdi kaydi
    (news_bulletins'e paralel).

    template_type: 'single' | 'comparison' | 'alternatives'
    primary_product_id: ana urun (zorunlu).
    secondary_product_ids_json: JSON array of product ids (comparison/alternatives icin).

    run_mode: 'semi_auto' (operator onay bekler) | 'full_auto' (scrape_confidence
              gate'ine + min veri kriterine baglidir — publish review KAPISI
              her iki modda KORUNUR; tek istisna settings-gated + audit).
    """

    __tablename__ = "product_reviews"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    topic: Mapped[str] = mapped_column(String(500), nullable=False)
    template_type: Mapped[str] = mapped_column(String(50), nullable=False)
    primary_product_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("products.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    secondary_product_ids_json: Mapped[str] = mapped_column(
        Text, nullable=False, default="[]"
    )
    language: Mapped[str] = mapped_column(String(10), nullable=False, default="tr")
    orientation: Mapped[str] = mapped_column(String(20), nullable=False, default="vertical")
    duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=60)
    run_mode: Mapped[str] = mapped_column(String(20), nullable=False, default="semi_auto")
    affiliate_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    disclosure_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    job_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("jobs.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    owner_user_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    is_test_data: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now, onupdate=_now
    )


# Prompt Assembly Engine models (Alembic discovery)
import app.prompt_assembly.models  # noqa: E402, F401