"""
Tests — M1-C1 Contracts Extension

Covers:
  - StepIdempotencyType enum: all values present and correct strings
  - StepIdempotencyType: is a str subclass (consistent with other enums)
  - StepIdempotencyType: importable in isolation
  - ORM column presence: Job.heartbeat_at, JobStep.idempotency_type, JobStep.provider_trace_json
  - Existing contract modules still importable (regression guard)
"""

import pytest


# ---------------------------------------------------------------------------
# StepIdempotencyType enum
# ---------------------------------------------------------------------------

class TestStepIdempotencyType:
    def test_importable(self):
        from app.contracts.enums import StepIdempotencyType
        assert StepIdempotencyType is not None

    def test_all_required_values_present(self):
        from app.contracts.enums import StepIdempotencyType
        values = {s.value for s in StepIdempotencyType}
        required = {"re_executable", "artifact_check", "operator_confirm"}
        assert required == values, (
            f"Missing: {required - values}, Extra: {values - required}"
        )

    def test_re_executable_value(self):
        from app.contracts.enums import StepIdempotencyType
        assert StepIdempotencyType.RE_EXECUTABLE == "re_executable"

    def test_artifact_check_value(self):
        from app.contracts.enums import StepIdempotencyType
        assert StepIdempotencyType.ARTIFACT_CHECK == "artifact_check"

    def test_operator_confirm_value(self):
        from app.contracts.enums import StepIdempotencyType
        assert StepIdempotencyType.OPERATOR_CONFIRM == "operator_confirm"

    def test_is_str_subclass(self):
        from app.contracts.enums import StepIdempotencyType
        assert isinstance(StepIdempotencyType.RE_EXECUTABLE, str)

    def test_exactly_three_members(self):
        from app.contracts.enums import StepIdempotencyType
        assert len(list(StepIdempotencyType)) == 3


# ---------------------------------------------------------------------------
# ORM column presence — Job model
# ---------------------------------------------------------------------------

class TestJobModelColumns:
    def test_heartbeat_at_column_exists(self):
        """Job.heartbeat_at must be declared as a mapped column."""
        from app.db.models import Job
        from sqlalchemy import inspect as sa_inspect
        mapper = sa_inspect(Job)
        col_names = {c.key for c in mapper.mapper.columns}
        assert "heartbeat_at" in col_names, (
            "Job.heartbeat_at column not found in ORM mapper"
        )

    def test_heartbeat_at_is_nullable(self):
        from app.db.models import Job
        from sqlalchemy import inspect as sa_inspect
        mapper = sa_inspect(Job)
        col = mapper.mapper.columns["heartbeat_at"]
        assert col.nullable is True, "Job.heartbeat_at should be nullable"


# ---------------------------------------------------------------------------
# ORM column presence — JobStep model
# ---------------------------------------------------------------------------

class TestJobStepModelColumns:
    def test_idempotency_type_column_exists(self):
        """JobStep.idempotency_type must be declared as a mapped column."""
        from app.db.models import JobStep
        from sqlalchemy import inspect as sa_inspect
        mapper = sa_inspect(JobStep)
        col_names = {c.key for c in mapper.mapper.columns}
        assert "idempotency_type" in col_names, (
            "JobStep.idempotency_type column not found in ORM mapper"
        )

    def test_idempotency_type_not_nullable(self):
        from app.db.models import JobStep
        from sqlalchemy import inspect as sa_inspect
        mapper = sa_inspect(JobStep)
        col = mapper.mapper.columns["idempotency_type"]
        assert col.nullable is False, "JobStep.idempotency_type should not be nullable"

    def test_idempotency_type_default_is_re_executable(self):
        from app.db.models import JobStep
        from sqlalchemy import inspect as sa_inspect
        mapper = sa_inspect(JobStep)
        col = mapper.mapper.columns["idempotency_type"]
        assert col.default.arg == "re_executable", (
            "JobStep.idempotency_type default should be 're_executable'"
        )

    def test_provider_trace_json_column_exists(self):
        """JobStep.provider_trace_json must be declared as a mapped column."""
        from app.db.models import JobStep
        from sqlalchemy import inspect as sa_inspect
        mapper = sa_inspect(JobStep)
        col_names = {c.key for c in mapper.mapper.columns}
        assert "provider_trace_json" in col_names, (
            "JobStep.provider_trace_json column not found in ORM mapper"
        )

    def test_provider_trace_json_is_nullable(self):
        from app.db.models import JobStep
        from sqlalchemy import inspect as sa_inspect
        mapper = sa_inspect(JobStep)
        col = mapper.mapper.columns["provider_trace_json"]
        assert col.nullable is True, "JobStep.provider_trace_json should be nullable"


# ---------------------------------------------------------------------------
# Regression guard — existing Phase 1.1/1.2 contracts still importable
# ---------------------------------------------------------------------------

def test_existing_enums_still_importable():
    from app.contracts.enums import (
        JobStatus,
        JobStepStatus,
        ArtifactKind,
        ArtifactScope,
        ArtifactDurability,
        ProviderKind,
        ProviderTraceStatus,
        RetryDisposition,
        ReviewStateStatus,
        SSEEventType,
    )
    assert JobStatus.QUEUED == "queued"
    assert JobStepStatus.PENDING == "pending"


def test_state_machine_still_importable():
    from app.contracts.state_machine import JobStateMachine, StepStateMachine
    assert JobStateMachine.transition("queued", "running") == "running"
    assert StepStateMachine.transition("pending", "running") == "running"


def test_sse_events_contract_importable():
    from app.contracts.sse_events import SSEEnvelope, SSE_PAYLOAD_MAP
    from app.contracts.enums import SSEEventType
    assert len(SSE_PAYLOAD_MAP) == len(list(SSEEventType))


def test_workspace_contract_importable():
    from app.contracts.workspace import WorkspaceLayout
    layout = WorkspaceLayout.for_job(job_id="test-001", workspace_root="/tmp")
    assert str(layout.final_dir) == "/tmp/test-001/final"


def test_artifacts_contract_importable():
    from app.contracts.artifacts import ArtifactRecord
    from app.contracts.enums import ArtifactKind, ArtifactScope, ArtifactDurability
    from datetime import datetime, timezone
    record = ArtifactRecord(
        id="a-001",
        job_id="j-001",
        step_key="script",
        kind=ArtifactKind.SCRIPT,
        scope=ArtifactScope.FINAL,
        durability=ArtifactDurability.DURABLE,
        local_path="/workspace/j-001/final/script.json",
        display_name="Script",
        created_at=datetime.now(timezone.utc),
    )
    assert record.kind == ArtifactKind.SCRIPT
