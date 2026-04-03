"""
Execution Contract — Artifact Schema (Phase 1.1)

An artifact is any durable or temp output produced by a job step.
It is NOT just a file path — it carries kind, scope, durability, and
enough metadata for the Job Detail artifacts panel, analytics, and
future publish/review linkage.

Visibility notes:
  - ArtifactRecord is [admin-visible] by default.
  - User-facing visibility is controlled by VisibilityRule targeting
    target_key="field:artifact:*" or "panel:job_detail:artifacts".
  - TEMP artifacts SHOULD NOT be shown to users in normal operation.

Settings integration notes (future Settings Registry keys):
  - execution.artifact_retention_days : how long DURABLE artifacts are kept
  - execution.temp_cleanup_on_complete : whether tmp/ is purged on job success
  - execution.preview_enabled         : whether PREVIEW scope artifacts are generated
"""

from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, ConfigDict, Field

from app.contracts.enums import ArtifactKind, ArtifactScope, ArtifactDurability


class ArtifactRecord(BaseModel):
    """
    Authoritative schema for a single artifact produced by a job step.

    Preview vs final rule:
        scope=PREVIEW artifacts must be clearly distinguished in the UI.
        They are NEVER the publish source. A FINAL artifact may coexist
        with a PREVIEW of the same kind on the same step.

    Temp vs durable rule:
        durability=TEMP files live under workspace/{job_id}/tmp/.
        They are safe to delete and must not be the source of truth for
        any downstream step. If a temp file is needed downstream, it must
        be promoted to DURABLE by copying it to final/ or preview/ and
        registering a new ArtifactRecord.

    source_of_truth flag:
        At most one FINAL+DURABLE artifact per (job_id, step_key, kind)
        should have source_of_truth=True. This is the artifact that
        publish adapters and review gates read from.
    """

    model_config = ConfigDict(from_attributes=True)

    # Identity
    id: str = Field(
        ...,
        description="Stable UUID for this artifact record."
    )
    job_id: str = Field(
        ...,
        description="Parent job ID."
    )
    step_key: str = Field(
        ...,
        description="Step that produced this artifact (e.g. 'script', 'tts', 'render')."
    )

    # Classification
    kind: ArtifactKind = Field(
        ...,
        description="Content type of the artifact."
    )
    scope: ArtifactScope = Field(
        ...,
        description="FINAL (publish/review source) or PREVIEW (selection UI only)."
    )
    durability: ArtifactDurability = Field(
        ...,
        description="DURABLE (keep) or TEMP (safe to delete/regenerate)."
    )

    # Storage
    local_path: str = Field(
        ...,
        description=(
            "Absolute local filesystem path. "
            "Durable artifacts live under workspace/{job_id}/final/ or preview/. "
            "Temp artifacts live under workspace/{job_id}/tmp/."
        )
    )
    display_name: str = Field(
        ...,
        description="Human-readable label shown in the Job Detail artifacts panel."
    )

    # File metadata
    mime_type: Optional[str] = Field(
        default=None,
        description="MIME type string (e.g. 'audio/mpeg', 'video/mp4', 'application/json')."
    )
    file_extension: Optional[str] = Field(
        default=None,
        description="File extension without leading dot (e.g. 'mp4', 'json', 'srt')."
    )
    size_bytes: Optional[int] = Field(
        default=None,
        description="File size in bytes. Null if unknown or not yet written."
    )
    checksum_sha256: Optional[str] = Field(
        default=None,
        description=(
            "SHA-256 hex digest of file contents. "
            "Null until the artifact is finalized. "
            "[admin-visible]"
        )
    )

    # Semantics
    source_of_truth: bool = Field(
        default=False,
        description=(
            "True if this is the canonical output for its (job, step, kind). "
            "At most one FINAL+DURABLE artifact per (job_id, step_key, kind) "
            "should have this set to True."
        )
    )

    # Extensibility
    metadata_json: Optional[Dict[str, Any]] = Field(
        default=None,
        description=(
            "Arbitrary step-specific metadata (e.g. script word count, "
            "audio duration_seconds, render resolution). "
            "Stored as JSON. Do not put secrets here."
        )
    )

    # Visibility annotation (not enforced here — enforced by Visibility Engine)
    admin_only: bool = Field(
        default=False,
        description=(
            "Hint: True if this artifact should only be visible to admins. "
            "Actual enforcement is via VisibilityRule, not this field."
        )
    )

    # Timestamps
    created_at: datetime = Field(
        ...,
        description="When the artifact record was registered."
    )
