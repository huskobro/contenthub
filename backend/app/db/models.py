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

Remaining domain models (templates, sources, publish, analytics)
will be added in later phases as their subsystems are built.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Text, DateTime, Boolean, Integer, Float, ForeignKey
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
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False, default="user")
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="active")
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
    The resolver (built in a later phase) queries these rows and merges them
    with the requesting context. Higher priority value = evaluated first.

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
    template_id           : nullable; will reference a template in a later phase
    source_context_json   : arbitrary JSON for source/news linkage
    current_step_key      : key of the currently active step
    retry_count           : number of retries attempted
    elapsed_total_seconds : running total; updated by the queue worker (later)
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
    current_step_key: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    retry_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    elapsed_total_seconds: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    estimated_remaining_seconds: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    workspace_path: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    last_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
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
    Does not drive job automation at this stage; job_id is a loose reference
    that will be wired once the pipeline runner is introduced.

    title             : human-friendly label; nullable
    topic             : main subject of the video; required
    brief             : additional direction or context; nullable
    target_duration_seconds : desired output length in seconds; nullable, not negative
    tone              : e.g. 'formal', 'casual', 'dramatic'
    language          : e.g. 'tr', 'en'
    visual_direction  : e.g. 'clean', 'cinematic', 'minimal'
    subtitle_style    : e.g. 'standard', 'bold', 'news'
    status            : lifecycle state; starts as 'draft'
    job_id            : loose reference to a Job; no hard FK constraint yet
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
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="draft", index=True)
    job_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
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
