"""
Automation Center — aggregate schemas.

Single screen, three flows (Manual Studio / Semi-Auto / Full-Auto) — they
are not separate pages, they are the same canvas with different node
configurations. The Automation Center sits on top of:
  - ContentProject.automation_* fields (run mode, schedule, policy)
  - AutomationPolicy (checkpoint modes per channel)
  - A node graph stored on ContentProject (one JSON column added in a
    follow-up migration). For this phase the graph is computed from the
    policy + project config so we do not require schema changes here;
    it is *derived* server-side and patched piece-by-piece via the
    PATCH /flow and PATCH /nodes/{id} endpoints.

Node contract (n8n-feel, NOT a free DAG builder):
  Each node has BOTH a status and an operation_mode as separate badges.
  The frontend never collapses them — they answer different questions:
    - status         : runtime readiness (ready | warning | blocked |
                       disabled | complete)
    - operation_mode : how the node decides (manual | ai_assist |
                       automatic)

The node graph is fixed-shape per content_module (the inspector adds
configuration per node, not new node types). This keeps the surface
deterministic and auditable.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

# ---------------------------------------------------------------------------
# Enums (frozen — added to KNOWN_SETTINGS for visibility)
# ---------------------------------------------------------------------------

NodeStatus = Literal["ready", "warning", "blocked", "disabled", "complete"]
NodeOperationMode = Literal["manual", "ai_assist", "automatic"]
RunMode = Literal["manual", "assisted", "full_auto"]
PublishPolicy = Literal["draft", "review", "scheduled", "publish"]
FallbackPolicy = Literal["pause", "retry", "skip"]


# ---------------------------------------------------------------------------
# Node + edge primitives
# ---------------------------------------------------------------------------


class NodeBadge(BaseModel):
    """A status or operation-mode badge — kept separate per product spec."""

    label: str
    tone: str  # ok | warn | bad | neutral | accent — UI maps to Aurora token
    detail: Optional[str] = None


class AutomationNode(BaseModel):
    """A single node on the canvas. Read+write shape.

    `config` is a free-form dict, but its keys are validated server-side
    against the node's known schema in service.py. The UI inspector also
    knows the schema and shows typed inputs.
    """

    id: str
    title: str
    description: Optional[str] = None
    scope: str  # source | brief | script | media | render | publish | report
    operation_mode: NodeOperationMode = "manual"
    status: NodeStatus = "ready"
    badges: List[NodeBadge] = Field(default_factory=list)
    config: Dict[str, Any] = Field(default_factory=dict)
    last_run_at: Optional[datetime] = None
    last_run_outcome: Optional[str] = None  # success | warning | failure | pending


class AutomationEdge(BaseModel):
    """A directed edge between two node ids. Frontend uses this for layout
    + sequencing only — execution order is determined by the canonical
    node order returned by the server."""

    source: str
    target: str
    kind: str = "default"  # default | optional | failure_branch


# ---------------------------------------------------------------------------
# Flow header (project-level config)
# ---------------------------------------------------------------------------


class AutomationFlowConfig(BaseModel):
    run_mode: RunMode = "manual"
    schedule_enabled: bool = False
    cron_expression: Optional[str] = Field(None, max_length=100)
    timezone: str = "UTC"
    require_review_gate: bool = True
    publish_policy: PublishPolicy = "draft"
    fallback_on_error: FallbackPolicy = "pause"
    max_runs_per_day: Optional[int] = Field(None, ge=1, le=144)
    default_template_id: Optional[str] = Field(None, max_length=36)
    default_blueprint_id: Optional[str] = Field(None, max_length=36)


class AutomationFlowPatch(BaseModel):
    """All fields optional — section save model."""

    run_mode: Optional[RunMode] = None
    schedule_enabled: Optional[bool] = None
    cron_expression: Optional[str] = Field(None, max_length=100)
    timezone: Optional[str] = None
    require_review_gate: Optional[bool] = None
    publish_policy: Optional[PublishPolicy] = None
    fallback_on_error: Optional[FallbackPolicy] = None
    max_runs_per_day: Optional[int] = Field(None, ge=1, le=144)
    default_template_id: Optional[str] = Field(None, max_length=36)
    default_blueprint_id: Optional[str] = Field(None, max_length=36)


class AutomationNodePatch(BaseModel):
    """A single-node edit — both status hints and mode/config are
    optional. Status itself is server-derived (we never trust a client
    'status' write); the patch can only set operation_mode + config."""

    operation_mode: Optional[NodeOperationMode] = None
    config: Optional[Dict[str, Any]] = None


# ---------------------------------------------------------------------------
# Aggregate response — the WHOLE canvas in one payload
# ---------------------------------------------------------------------------


class ProjectSummary(BaseModel):
    id: str
    title: str
    module_type: Optional[str] = None
    user_id: str
    channel_profile_id: str
    primary_platform: Optional[str] = None
    content_status: str
    publish_status: str


class AutomationCenterResponse(BaseModel):
    project: ProjectSummary
    flow: AutomationFlowConfig
    nodes: List[AutomationNode]
    edges: List[AutomationEdge]
    health: Dict[str, Any]  # blockers, warnings, hints — UI inspector uses this
    last_evaluated_at: datetime
    snapshot_locked: bool = False  # True if a run is mid-flight

    model_config = ConfigDict(from_attributes=False)


# ---------------------------------------------------------------------------
# Evaluate / Run / Test
# ---------------------------------------------------------------------------


class EvaluateResponse(BaseModel):
    """Pre-flight check: can this flow run? What blockers? No side effects."""

    ok: bool
    blockers: List[str]
    warnings: List[str]
    next_run_estimate: Optional[datetime] = None


class RunNowRequest(BaseModel):
    """Trigger an immediate run. Honest about what we'll do — `dry_run`
    short-circuits before job submission."""

    dry_run: bool = False
    force: bool = False  # bypass max_runs_per_day (admin only — enforced)


class RunNowResponse(BaseModel):
    ok: bool
    job_id: Optional[str] = None
    detail: Optional[str] = None
    blockers: List[str] = Field(default_factory=list)


class NodeTestRequest(BaseModel):
    """Test a single node with stub inputs. Always dry-run; never persists."""

    sample_payload: Optional[Dict[str, Any]] = None


class NodeTestResponse(BaseModel):
    ok: bool
    node_id: str
    output: Dict[str, Any] = Field(default_factory=dict)
    issues: List[str] = Field(default_factory=list)
