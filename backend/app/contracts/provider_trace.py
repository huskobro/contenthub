"""
Execution Contract — ProviderTrace Schema (Phase 1.1)

A ProviderTrace records a single invocation of an external (or internal)
provider by a job step. It is append-only — each call attempt gets its own
trace record, including fallback calls.

Visibility notes:
  - ProviderTrace is [admin-visible]. Users see a simplified view unless
    VisibilityRule grants broader access.
  - target_key candidates for VisibilityRule:
      "panel:job_detail:provider_trace"
      "field:provider_trace:cost_metadata"
      "field:provider_trace:request_summary"

Security rules:
  - Secrets (API keys, bearer tokens, passwords) MUST NOT be stored in
    request_summary, response_summary, or extra_metadata_json.
  - The executor/step runner is responsible for redacting secrets before
    writing trace records.

Settings integration notes (future Settings Registry keys):
  - execution.provider_trace_enabled        : master switch for trace recording
  - execution.provider_trace_retention_days : cleanup policy [admin-visible]
"""

from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, ConfigDict, Field

from app.contracts.enums import ProviderKind, ProviderTraceStatus


class ProviderTrace(BaseModel):
    """
    Authoritative schema for a single provider invocation trace.

    Fallback chain:
        If the primary provider fails and a secondary is used,
        the primary gets status=FAILURE and fallback_to set.
        The secondary gets status=FALLBACK_USED and fallback_from set.
        This allows analytics to measure fallback frequency per provider.
    """

    model_config = ConfigDict(from_attributes=True)

    # Identity
    id: str = Field(..., description="Stable UUID for this trace record.")
    job_id: str = Field(..., description="Parent job ID.")
    step_key: str = Field(..., description="Step that triggered this provider call.")

    # Provider identity
    provider_kind: ProviderKind = Field(
        ...,
        description="Category of provider (LLM, TTS, VISUALS, etc.)."
    )
    provider_name: str = Field(
        ...,
        description=(
            "Specific provider instance name, e.g. 'openai-gpt4o', 'elevenlabs', "
            "'pexels'. Matches the key used in the future Provider Registry."
        )
    )
    capability: Optional[str] = Field(
        default=None,
        description=(
            "Specific capability invoked, e.g. 'chat_completion', "
            "'voice_synthesis', 'image_search'."
        )
    )

    # Invocation
    request_summary: Optional[str] = Field(
        default=None,
        description=(
            "Short human-readable summary of the request parameters. "
            "MUST NOT include secrets, API keys, or PII. [admin-visible]"
        )
    )
    response_summary: Optional[str] = Field(
        default=None,
        description=(
            "Short summary of the provider response or error. "
            "MUST NOT include sensitive data. [admin-visible]"
        )
    )

    # Performance
    latency_ms: Optional[int] = Field(
        default=None,
        description="Round-trip latency in milliseconds. [admin-visible]"
    )

    # Cost (future analytics)
    cost_input_units: Optional[float] = Field(
        default=None,
        description=(
            "Provider-specific input units (e.g. tokens for LLM, characters for TTS). "
            "[admin-visible]"
        )
    )
    cost_output_units: Optional[float] = Field(
        default=None,
        description="Provider-specific output units. [admin-visible]"
    )
    cost_usd_estimate: Optional[float] = Field(
        default=None,
        description=(
            "Estimated USD cost for this call. Null if provider does not expose cost. "
            "[admin-visible]"
        )
    )

    # Fallback chain
    fallback_from: Optional[str] = Field(
        default=None,
        description=(
            "provider_name of the primary that failed, if this trace is a fallback call."
        )
    )
    fallback_to: Optional[str] = Field(
        default=None,
        description=(
            "provider_name of the secondary that was attempted, if this trace is the "
            "primary failure record."
        )
    )

    # Outcome
    status: ProviderTraceStatus = Field(
        ...,
        description="Outcome of this provider invocation."
    )
    error_summary: Optional[str] = Field(
        default=None,
        description=(
            "Short error description if status is FAILURE or TIMEOUT. "
            "MUST NOT include secrets. [admin-visible]"
        )
    )

    # Extensibility
    extra_metadata_json: Optional[Dict[str, Any]] = Field(
        default=None,
        description=(
            "Provider-specific extra fields (e.g. model version, voice_id, "
            "resolution). No secrets. [admin-visible]"
        )
    )

    # Timestamp
    created_at: datetime = Field(
        ...,
        description="When this trace record was created (end of provider call)."
    )
