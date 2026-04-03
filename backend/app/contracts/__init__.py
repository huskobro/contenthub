"""
Execution Contract Package — Phase 1.1

This package defines the stable, authoritative contracts for ContentHub's
execution engine. All downstream subsystems (executor, pipeline runner,
SSE hub, workspace manager, analytics, publish, review gate) must import
from here rather than re-defining their own enums or schemas.

Sub-modules:
    enums          — All status/kind enumerations (single source of truth)
    state_machine  — JobStateMachine + StepStateMachine transition rules
    artifacts      — ArtifactRecord schema
    provider_trace — ProviderTrace schema
    retry_history  — RetryHistory schema
    review_state   — ReviewState schema
    sse_events     — SSE event type contracts and payload schemas
    workspace      — WorkspaceLayout folder convention
"""
