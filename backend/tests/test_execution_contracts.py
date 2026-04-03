"""
Tests — Execution Contract Layer (Phase 1.1)

Covers:
  - JobStatus enum completeness and string values
  - JobStepStatus enum completeness and string values
  - ArtifactKind, ArtifactScope, ArtifactDurability enum values
  - ProviderKind, ProviderTraceStatus enum values
  - RetryDisposition enum values
  - ReviewStateStatus enum values
  - SSEEventType enum completeness and string format
  - JobStateMachine: all valid transitions succeed
  - JobStateMachine: all invalid transitions raise ValueError
  - JobStateMachine: terminal state detection
  - StepStateMachine: all valid transitions succeed
  - StepStateMachine: all invalid transitions raise ValueError
  - StepStateMachine: terminal state detection
  - ArtifactRecord schema: valid instantiation
  - ArtifactRecord schema: preview vs final vs temp distinction preserved
  - ProviderTrace schema: valid instantiation, no secrets in required fields
  - RetryHistory schema: valid instantiation, level/triggered_by values
  - ReviewState schema: valid instantiation, default status
  - SSEEnvelope schema: valid instantiation
  - SSE payload schemas: all mandatory fields present
  - SSE_PAYLOAD_MAP: all SSEEventType values covered
  - WorkspaceLayout: path derivation correctness
  - WorkspaceLayout: artifact_path subdir validation
  - WorkspaceLayout: invalid subdir raises ValueError
  - Import isolation: all contract modules importable independently
"""

import pytest
from datetime import datetime, timezone

# ---------------------------------------------------------------------------
# Import isolation tests — these run first to catch circular import issues
# ---------------------------------------------------------------------------

def test_enums_importable():
    from app.contracts import enums
    assert enums is not None


def test_state_machine_importable():
    from app.contracts import state_machine
    assert state_machine is not None


def test_artifacts_importable():
    from app.contracts import artifacts
    assert artifacts is not None


def test_provider_trace_importable():
    from app.contracts import provider_trace
    assert provider_trace is not None


def test_retry_history_importable():
    from app.contracts import retry_history
    assert retry_history is not None


def test_review_state_importable():
    from app.contracts import review_state
    assert review_state is not None


def test_sse_events_importable():
    from app.contracts import sse_events
    assert sse_events is not None


def test_workspace_importable():
    from app.contracts import workspace
    assert workspace is not None


# ---------------------------------------------------------------------------
# JobStatus enum
# ---------------------------------------------------------------------------

class TestJobStatus:
    def test_all_required_values_present(self):
        from app.contracts.enums import JobStatus
        values = {s.value for s in JobStatus}
        required = {"queued", "running", "waiting", "retrying", "completed", "failed", "cancelled"}
        assert required == values, f"Missing: {required - values}, Extra: {values - required}"

    def test_string_enum_values(self):
        from app.contracts.enums import JobStatus
        assert JobStatus.QUEUED == "queued"
        assert JobStatus.RUNNING == "running"
        assert JobStatus.WAITING == "waiting"
        assert JobStatus.RETRYING == "retrying"
        assert JobStatus.COMPLETED == "completed"
        assert JobStatus.FAILED == "failed"
        assert JobStatus.CANCELLED == "cancelled"

    def test_is_str_subclass(self):
        from app.contracts.enums import JobStatus
        assert isinstance(JobStatus.RUNNING, str)


# ---------------------------------------------------------------------------
# JobStepStatus enum
# ---------------------------------------------------------------------------

class TestJobStepStatus:
    def test_all_required_values_present(self):
        from app.contracts.enums import JobStepStatus
        values = {s.value for s in JobStepStatus}
        required = {"pending", "running", "completed", "failed", "skipped", "retrying"}
        assert required == values, f"Missing: {required - values}, Extra: {values - required}"

    def test_string_enum_values(self):
        from app.contracts.enums import JobStepStatus
        assert JobStepStatus.PENDING == "pending"
        assert JobStepStatus.RUNNING == "running"
        assert JobStepStatus.COMPLETED == "completed"
        assert JobStepStatus.FAILED == "failed"
        assert JobStepStatus.SKIPPED == "skipped"
        assert JobStepStatus.RETRYING == "retrying"


# ---------------------------------------------------------------------------
# Artifact enums
# ---------------------------------------------------------------------------

class TestArtifactEnums:
    def test_artifact_kind_values(self):
        from app.contracts.enums import ArtifactKind
        kinds = {k.value for k in ArtifactKind}
        required = {
            "script", "metadata", "audio", "subtitle", "visual_asset",
            "composition_props", "video_render", "thumbnail",
            "publish_payload", "log", "generic"
        }
        assert required.issubset(kinds)

    def test_artifact_scope_values(self):
        from app.contracts.enums import ArtifactScope
        assert ArtifactScope.FINAL == "final"
        assert ArtifactScope.PREVIEW == "preview"
        assert len(list(ArtifactScope)) == 2

    def test_artifact_durability_values(self):
        from app.contracts.enums import ArtifactDurability
        assert ArtifactDurability.DURABLE == "durable"
        assert ArtifactDurability.TEMP == "temp"
        assert len(list(ArtifactDurability)) == 2


# ---------------------------------------------------------------------------
# Provider enums
# ---------------------------------------------------------------------------

class TestProviderEnums:
    def test_provider_kind_values(self):
        from app.contracts.enums import ProviderKind
        values = {k.value for k in ProviderKind}
        required = {"llm", "tts", "visuals", "whisper", "render", "publish", "internal"}
        assert required == values

    def test_provider_trace_status_values(self):
        from app.contracts.enums import ProviderTraceStatus
        values = {s.value for s in ProviderTraceStatus}
        required = {"success", "failure", "timeout", "fallback_used", "skipped"}
        assert required == values


# ---------------------------------------------------------------------------
# SSEEventType enum
# ---------------------------------------------------------------------------

class TestSSEEventType:
    def test_all_job_events_present(self):
        from app.contracts.enums import SSEEventType
        values = {e.value for e in SSEEventType}
        job_events = {
            "job:status_changed", "job:step_changed", "job:progress",
            "job:log", "job:artifact", "job:error", "job:retry",
            "job:review_state_changed",
        }
        assert job_events.issubset(values)

    def test_manifest_events_present(self):
        from app.contracts.enums import SSEEventType
        values = {e.value for e in SSEEventType}
        assert "manifest:settings_changed" in values
        assert "manifest:visibility_changed" in values

    def test_event_string_format(self):
        """All event type strings use the namespace:event format."""
        from app.contracts.enums import SSEEventType
        for event in SSEEventType:
            assert ":" in event.value, f"Event '{event.value}' missing namespace prefix"


# ---------------------------------------------------------------------------
# JobStateMachine
# ---------------------------------------------------------------------------

class TestJobStateMachine:
    def test_queued_to_running(self):
        from app.contracts.state_machine import JobStateMachine
        result = JobStateMachine.transition("queued", "running")
        assert result == "running"

    def test_queued_to_cancelled(self):
        from app.contracts.state_machine import JobStateMachine
        assert JobStateMachine.transition("queued", "cancelled") == "cancelled"

    def test_running_to_completed(self):
        from app.contracts.state_machine import JobStateMachine
        assert JobStateMachine.transition("running", "completed") == "completed"

    def test_running_to_failed(self):
        from app.contracts.state_machine import JobStateMachine
        assert JobStateMachine.transition("running", "failed") == "failed"

    def test_running_to_waiting(self):
        from app.contracts.state_machine import JobStateMachine
        assert JobStateMachine.transition("running", "waiting") == "waiting"

    def test_running_to_retrying(self):
        from app.contracts.state_machine import JobStateMachine
        assert JobStateMachine.transition("running", "retrying") == "retrying"

    def test_running_to_cancelled(self):
        from app.contracts.state_machine import JobStateMachine
        assert JobStateMachine.transition("running", "cancelled") == "cancelled"

    def test_waiting_to_running(self):
        from app.contracts.state_machine import JobStateMachine
        assert JobStateMachine.transition("waiting", "running") == "running"

    def test_waiting_to_failed(self):
        from app.contracts.state_machine import JobStateMachine
        assert JobStateMachine.transition("waiting", "failed") == "failed"

    def test_retrying_to_running(self):
        from app.contracts.state_machine import JobStateMachine
        assert JobStateMachine.transition("retrying", "running") == "running"

    def test_retrying_to_failed(self):
        from app.contracts.state_machine import JobStateMachine
        assert JobStateMachine.transition("retrying", "failed") == "failed"

    # Invalid transitions
    def test_queued_to_completed_raises(self):
        from app.contracts.state_machine import JobStateMachine
        with pytest.raises(ValueError, match="not allowed"):
            JobStateMachine.transition("queued", "completed")

    def test_queued_to_failed_raises(self):
        from app.contracts.state_machine import JobStateMachine
        with pytest.raises(ValueError, match="not allowed"):
            JobStateMachine.transition("queued", "failed")

    def test_completed_to_running_raises(self):
        from app.contracts.state_machine import JobStateMachine
        with pytest.raises(ValueError, match="not allowed"):
            JobStateMachine.transition("completed", "running")

    def test_completed_to_queued_raises(self):
        from app.contracts.state_machine import JobStateMachine
        with pytest.raises(ValueError, match="not allowed"):
            JobStateMachine.transition("completed", "queued")

    def test_failed_to_running_raises(self):
        from app.contracts.state_machine import JobStateMachine
        with pytest.raises(ValueError, match="not allowed"):
            JobStateMachine.transition("failed", "running")

    def test_cancelled_to_running_raises(self):
        from app.contracts.state_machine import JobStateMachine
        with pytest.raises(ValueError, match="not allowed"):
            JobStateMachine.transition("cancelled", "running")

    def test_unknown_current_raises(self):
        from app.contracts.state_machine import JobStateMachine
        with pytest.raises(ValueError, match="unknown current status"):
            JobStateMachine.transition("banana", "running")

    def test_unknown_next_raises(self):
        from app.contracts.state_machine import JobStateMachine
        with pytest.raises(ValueError, match="unknown next status"):
            JobStateMachine.transition("queued", "exploding")

    # Terminal detection
    def test_completed_is_terminal(self):
        from app.contracts.state_machine import JobStateMachine
        assert JobStateMachine.is_terminal("completed") is True

    def test_failed_is_terminal(self):
        from app.contracts.state_machine import JobStateMachine
        assert JobStateMachine.is_terminal("failed") is True

    def test_cancelled_is_terminal(self):
        from app.contracts.state_machine import JobStateMachine
        assert JobStateMachine.is_terminal("cancelled") is True

    def test_queued_is_not_terminal(self):
        from app.contracts.state_machine import JobStateMachine
        assert JobStateMachine.is_terminal("queued") is False

    def test_running_is_not_terminal(self):
        from app.contracts.state_machine import JobStateMachine
        assert JobStateMachine.is_terminal("running") is False

    def test_allowed_next_queued(self):
        from app.contracts.state_machine import JobStateMachine
        allowed = JobStateMachine.allowed_next("queued")
        assert "running" in allowed
        assert "cancelled" in allowed
        assert "completed" not in allowed

    def test_allowed_next_completed_empty(self):
        from app.contracts.state_machine import JobStateMachine
        assert JobStateMachine.allowed_next("completed") == []


# ---------------------------------------------------------------------------
# StepStateMachine
# ---------------------------------------------------------------------------

class TestStepStateMachine:
    def test_pending_to_running(self):
        from app.contracts.state_machine import StepStateMachine
        assert StepStateMachine.transition("pending", "running") == "running"

    def test_pending_to_skipped(self):
        from app.contracts.state_machine import StepStateMachine
        assert StepStateMachine.transition("pending", "skipped") == "skipped"

    def test_running_to_completed(self):
        from app.contracts.state_machine import StepStateMachine
        assert StepStateMachine.transition("running", "completed") == "completed"

    def test_running_to_failed(self):
        from app.contracts.state_machine import StepStateMachine
        assert StepStateMachine.transition("running", "failed") == "failed"

    def test_running_to_retrying(self):
        from app.contracts.state_machine import StepStateMachine
        assert StepStateMachine.transition("running", "retrying") == "retrying"

    def test_retrying_to_running(self):
        from app.contracts.state_machine import StepStateMachine
        assert StepStateMachine.transition("retrying", "running") == "running"

    def test_retrying_to_failed(self):
        from app.contracts.state_machine import StepStateMachine
        assert StepStateMachine.transition("retrying", "failed") == "failed"

    # Invalid transitions
    def test_pending_to_completed_raises(self):
        from app.contracts.state_machine import StepStateMachine
        with pytest.raises(ValueError, match="not allowed"):
            StepStateMachine.transition("pending", "completed")

    def test_completed_to_running_raises(self):
        from app.contracts.state_machine import StepStateMachine
        with pytest.raises(ValueError, match="not allowed"):
            StepStateMachine.transition("completed", "running")

    def test_failed_to_running_raises(self):
        from app.contracts.state_machine import StepStateMachine
        with pytest.raises(ValueError, match="not allowed"):
            StepStateMachine.transition("failed", "running")

    def test_skipped_to_running_raises(self):
        from app.contracts.state_machine import StepStateMachine
        with pytest.raises(ValueError, match="not allowed"):
            StepStateMachine.transition("skipped", "running")

    def test_unknown_status_raises(self):
        from app.contracts.state_machine import StepStateMachine
        with pytest.raises(ValueError, match="unknown current status"):
            StepStateMachine.transition("purple", "running")

    # Terminal detection
    def test_completed_is_terminal(self):
        from app.contracts.state_machine import StepStateMachine
        assert StepStateMachine.is_terminal("completed") is True

    def test_failed_is_terminal(self):
        from app.contracts.state_machine import StepStateMachine
        assert StepStateMachine.is_terminal("failed") is True

    def test_skipped_is_terminal(self):
        from app.contracts.state_machine import StepStateMachine
        assert StepStateMachine.is_terminal("skipped") is True

    def test_pending_is_not_terminal(self):
        from app.contracts.state_machine import StepStateMachine
        assert StepStateMachine.is_terminal("pending") is False

    def test_running_is_not_terminal(self):
        from app.contracts.state_machine import StepStateMachine
        assert StepStateMachine.is_terminal("running") is False


# ---------------------------------------------------------------------------
# ArtifactRecord schema
# ---------------------------------------------------------------------------

_NOW = datetime.now(timezone.utc)


def _make_artifact(**overrides):
    from app.contracts.artifacts import ArtifactRecord
    from app.contracts.enums import ArtifactKind, ArtifactScope, ArtifactDurability
    defaults = dict(
        id="art-001",
        job_id="job-001",
        step_key="script",
        kind=ArtifactKind.SCRIPT,
        scope=ArtifactScope.FINAL,
        durability=ArtifactDurability.DURABLE,
        local_path="/workspace/job-001/final/script.json",
        display_name="Script Output",
        created_at=_NOW,
    )
    defaults.update(overrides)
    return ArtifactRecord(**defaults)


class TestArtifactRecord:
    def test_valid_instantiation(self):
        artifact = _make_artifact()
        assert artifact.job_id == "job-001"
        assert artifact.step_key == "script"

    def test_preview_scope_preserved(self):
        from app.contracts.enums import ArtifactScope, ArtifactDurability
        artifact = _make_artifact(scope=ArtifactScope.PREVIEW, durability=ArtifactDurability.DURABLE)
        assert artifact.scope == ArtifactScope.PREVIEW
        assert artifact.durability == ArtifactDurability.DURABLE

    def test_temp_durability_preserved(self):
        from app.contracts.enums import ArtifactScope, ArtifactDurability
        artifact = _make_artifact(scope=ArtifactScope.FINAL, durability=ArtifactDurability.TEMP)
        assert artifact.durability == ArtifactDurability.TEMP

    def test_source_of_truth_default_false(self):
        artifact = _make_artifact()
        assert artifact.source_of_truth is False

    def test_optional_fields_nullable(self):
        artifact = _make_artifact()
        assert artifact.mime_type is None
        assert artifact.size_bytes is None
        assert artifact.checksum_sha256 is None
        assert artifact.metadata_json is None

    def test_serialization_round_trip(self):
        artifact = _make_artifact()
        data = artifact.model_dump()
        from app.contracts.artifacts import ArtifactRecord
        restored = ArtifactRecord(**data)
        assert restored.id == artifact.id


# ---------------------------------------------------------------------------
# ProviderTrace schema
# ---------------------------------------------------------------------------

class TestProviderTrace:
    def test_valid_instantiation(self):
        from app.contracts.provider_trace import ProviderTrace
        from app.contracts.enums import ProviderKind, ProviderTraceStatus
        trace = ProviderTrace(
            id="trace-001",
            job_id="job-001",
            step_key="script",
            provider_kind=ProviderKind.LLM,
            provider_name="openai-gpt4o",
            status=ProviderTraceStatus.SUCCESS,
            created_at=_NOW,
        )
        assert trace.provider_kind == ProviderKind.LLM
        assert trace.status == ProviderTraceStatus.SUCCESS

    def test_optional_cost_fields_nullable(self):
        from app.contracts.provider_trace import ProviderTrace
        from app.contracts.enums import ProviderKind, ProviderTraceStatus
        trace = ProviderTrace(
            id="trace-002",
            job_id="job-001",
            step_key="tts",
            provider_kind=ProviderKind.TTS,
            provider_name="elevenlabs",
            status=ProviderTraceStatus.FAILURE,
            created_at=_NOW,
        )
        assert trace.cost_usd_estimate is None
        assert trace.fallback_from is None
        assert trace.fallback_to is None
        assert trace.error_summary is None

    def test_fallback_chain_fields(self):
        from app.contracts.provider_trace import ProviderTrace
        from app.contracts.enums import ProviderKind, ProviderTraceStatus
        trace = ProviderTrace(
            id="trace-003",
            job_id="job-001",
            step_key="tts",
            provider_kind=ProviderKind.TTS,
            provider_name="backup-tts",
            status=ProviderTraceStatus.FALLBACK_USED,
            fallback_from="elevenlabs",
            created_at=_NOW,
        )
        assert trace.fallback_from == "elevenlabs"
        assert trace.status == ProviderTraceStatus.FALLBACK_USED


# ---------------------------------------------------------------------------
# RetryHistory schema
# ---------------------------------------------------------------------------

class TestRetryHistory:
    def test_valid_instantiation(self):
        from app.contracts.retry_history import RetryHistory
        retry = RetryHistory(
            id="retry-001",
            job_id="job-001",
            level="step",
            attempt_number=1,
            triggered_by="system",
            from_status="running",
            to_status="retrying",
            affected_step_key="tts",
            created_at=_NOW,
        )
        assert retry.level == "step"
        assert retry.attempt_number == 1
        assert retry.triggered_by == "system"

    def test_job_level_retry(self):
        from app.contracts.retry_history import RetryHistory
        retry = RetryHistory(
            id="retry-002",
            job_id="job-001",
            level="job",
            attempt_number=2,
            triggered_by="user",
            from_status="failed",
            to_status="retrying",
            created_at=_NOW,
        )
        assert retry.level == "job"
        assert retry.affected_step_key is None
        assert retry.disposition is None


# ---------------------------------------------------------------------------
# ReviewState schema
# ---------------------------------------------------------------------------

class TestReviewState:
    def test_valid_instantiation_default_status(self):
        from app.contracts.review_state import ReviewState
        from app.contracts.enums import ReviewStateStatus
        review = ReviewState(
            id="review-001",
            job_id="job-001",
            created_at=_NOW,
            updated_at=_NOW,
        )
        assert review.status == ReviewStateStatus.NOT_REQUIRED

    def test_pending_review_status(self):
        from app.contracts.review_state import ReviewState
        from app.contracts.enums import ReviewStateStatus
        review = ReviewState(
            id="review-002",
            job_id="job-001",
            status=ReviewStateStatus.PENDING_REVIEW,
            created_at=_NOW,
            updated_at=_NOW,
        )
        assert review.status == ReviewStateStatus.PENDING_REVIEW
        assert review.reviewer_id is None

    def test_all_statuses_valid(self):
        from app.contracts.review_state import ReviewState
        from app.contracts.enums import ReviewStateStatus
        for status in ReviewStateStatus:
            review = ReviewState(
                id="review-x",
                job_id="job-001",
                status=status,
                created_at=_NOW,
                updated_at=_NOW,
            )
            assert review.status == status


# ---------------------------------------------------------------------------
# SSE Envelope + payload schemas
# ---------------------------------------------------------------------------

class TestSSEEnvelope:
    def test_valid_instantiation(self):
        from app.contracts.sse_events import SSEEnvelope
        from app.contracts.enums import SSEEventType
        envelope = SSEEnvelope(
            event=SSEEventType.JOB_STATUS_CHANGED,
            stream_scope="job-001",
            emitted_at=_NOW,
        )
        assert envelope.event == SSEEventType.JOB_STATUS_CHANGED
        assert envelope.stream_scope == "job-001"

    def test_global_scope(self):
        from app.contracts.sse_events import SSEEnvelope
        from app.contracts.enums import SSEEventType
        envelope = SSEEnvelope(
            event=SSEEventType.MANIFEST_SETTINGS_CHANGED,
            stream_scope="global",
            emitted_at=_NOW,
        )
        assert envelope.stream_scope == "global"


class TestSSEPayloads:
    def test_job_status_changed_payload(self):
        from app.contracts.sse_events import JobStatusChangedPayload
        from app.contracts.enums import JobStatus
        payload = JobStatusChangedPayload(
            job_id="job-001",
            previous_status=JobStatus.QUEUED,
            new_status=JobStatus.RUNNING,
            current_step_key=None,
            elapsed_total_seconds=None,
            estimated_remaining_seconds=None,
            last_error=None,
        )
        assert payload.new_status == JobStatus.RUNNING
        assert "jobs" in payload.invalidate_keys

    def test_job_step_changed_payload(self):
        from app.contracts.sse_events import JobStepChangedPayload
        from app.contracts.enums import JobStepStatus
        payload = JobStepChangedPayload(
            job_id="job-001",
            step_key="script",
            step_order=1,
            previous_status=JobStepStatus.PENDING,
            new_status=JobStepStatus.RUNNING,
            elapsed_seconds=None,
            last_error=None,
        )
        assert payload.new_status == JobStepStatus.RUNNING

    def test_manifest_settings_changed_payload(self):
        from app.contracts.sse_events import ManifestSettingsChangedPayload
        payload = ManifestSettingsChangedPayload(changed_keys=["execution.workspace_root"])
        assert "settings_manifest" in payload.invalidate_keys

    def test_manifest_visibility_changed_payload(self):
        from app.contracts.sse_events import ManifestVisibilityChangedPayload
        payload = ManifestVisibilityChangedPayload(affected_targets=[])
        assert "visibility_manifest" in payload.invalidate_keys

    def test_sse_payload_map_covers_all_event_types(self):
        from app.contracts.sse_events import SSE_PAYLOAD_MAP
        from app.contracts.enums import SSEEventType
        covered = set(SSE_PAYLOAD_MAP.keys())
        all_events = set(SSEEventType)
        missing = all_events - covered
        assert not missing, f"SSE_PAYLOAD_MAP missing entries for: {missing}"


# ---------------------------------------------------------------------------
# WorkspaceLayout
# ---------------------------------------------------------------------------

class TestWorkspaceLayout:
    def test_path_derivation(self):
        from app.contracts.workspace import WorkspaceLayout
        layout = WorkspaceLayout.for_job(job_id="job-abc", workspace_root="/ws")
        assert str(layout.job_dir) == "/ws/job-abc"
        assert str(layout.final_dir) == "/ws/job-abc/final"
        assert str(layout.preview_dir) == "/ws/job-abc/preview"
        assert str(layout.tmp_dir) == "/ws/job-abc/tmp"
        assert str(layout.logs_dir) == "/ws/job-abc/logs"
        assert str(layout.execution_dir) == "/ws/job-abc/execution"

    def test_final_not_same_as_preview(self):
        from app.contracts.workspace import WorkspaceLayout
        layout = WorkspaceLayout.for_job(job_id="job-abc", workspace_root="/ws")
        assert layout.final_dir != layout.preview_dir

    def test_tmp_not_same_as_final(self):
        from app.contracts.workspace import WorkspaceLayout
        layout = WorkspaceLayout.for_job(job_id="job-abc", workspace_root="/ws")
        assert layout.tmp_dir != layout.final_dir

    def test_artifact_path_final(self):
        from app.contracts.workspace import WorkspaceLayout
        layout = WorkspaceLayout.for_job(job_id="job-abc", workspace_root="/ws")
        path = layout.artifact_path("final", "audio/narration.mp3")
        assert str(path) == "/ws/job-abc/final/audio/narration.mp3"

    def test_artifact_path_tmp(self):
        from app.contracts.workspace import WorkspaceLayout
        layout = WorkspaceLayout.for_job(job_id="job-abc", workspace_root="/ws")
        path = layout.artifact_path("tmp", "raw_clip.mp4")
        assert str(path) == "/ws/job-abc/tmp/raw_clip.mp4"

    def test_artifact_path_invalid_subdir_raises(self):
        from app.contracts.workspace import WorkspaceLayout
        layout = WorkspaceLayout.for_job(job_id="job-abc", workspace_root="/ws")
        with pytest.raises(ValueError, match="unknown subdir"):
            layout.artifact_path("secrets", "key.pem")

    def test_all_dirs_count(self):
        from app.contracts.workspace import WorkspaceLayout
        layout = WorkspaceLayout.for_job(job_id="job-abc", workspace_root="/ws")
        assert len(layout.all_dirs()) == 5

    def test_ensure_dirs_creates_directories(self, tmp_path):
        from app.contracts.workspace import WorkspaceLayout
        layout = WorkspaceLayout.for_job(job_id="test-job", workspace_root=str(tmp_path))
        layout.ensure_dirs()
        assert layout.final_dir.exists()
        assert layout.preview_dir.exists()
        assert layout.tmp_dir.exists()
        assert layout.logs_dir.exists()
        assert layout.execution_dir.exists()

    def test_ensure_dirs_idempotent(self, tmp_path):
        from app.contracts.workspace import WorkspaceLayout
        layout = WorkspaceLayout.for_job(job_id="test-job", workspace_root=str(tmp_path))
        layout.ensure_dirs()
        layout.ensure_dirs()  # Should not raise
        assert layout.final_dir.exists()
