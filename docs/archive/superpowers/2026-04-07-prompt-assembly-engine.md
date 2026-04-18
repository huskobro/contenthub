# Prompt Assembly Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a block-based, traceable prompt assembly engine that makes every prompt decision visible — from block inclusion/exclusion through to exact KIE.ai payloads.

**Architecture:** Hybrid persistence — PromptBlock in its own table, behavior flags in Settings Registry, linked via condition_key references. Assembly engine reads frozen snapshots, evaluates conditions deterministically, renders templates, persists full trace. Frontend extends PromptEditorPage with block management, adds Prompt Trace tab to Job Detail.

**Tech Stack:** FastAPI + SQLAlchemy 2.0 (async) + Alembic | React + TypeScript + React Query + Tailwind (ContentHub design system)

**Spec:** `docs/superpowers/specs/2026-04-07-prompt-assembly-engine-design.md`

---

## File Structure

### Backend — New Files
```
backend/app/prompt_assembly/
├── __init__.py                  # Package init
├── models.py                    # PromptBlock, PromptAssemblyRun, PromptAssemblyBlockTrace
├── schemas.py                   # Pydantic request/response schemas
├── service.py                   # PromptBlock CRUD + query helpers
├── condition_evaluator.py       # ConditionEvaluator (6 condition types)
├── template_renderer.py         # TemplateRenderer ({{variable}} substitution)
├── assembly_service.py          # PromptAssemblyService (orchestrator)
├── trace_service.py             # PromptTraceService (persist + sanitize)
├── payload_builder.py           # ProviderPayloadBuilder (KIE.ai format)
├── block_seed.py                # Builtin block definitions + seed function
└── router.py                    # API endpoints (blocks CRUD, preview, traces)

backend/alembic/versions/
└── f1a2b3c4d5e6_add_prompt_assembly_tables.py

backend/tests/
├── test_prompt_assembly_models.py
├── test_condition_evaluator.py
├── test_template_renderer.py
├── test_assembly_service.py
└── test_prompt_assembly_api.py
```

### Backend — Modified Files
```
backend/app/db/models.py                          # Import new models for Alembic discovery
backend/app/main.py                               # Register prompt_assembly router
backend/app/modules/news_bulletin/executors/script.py   # Wire to assembly engine
backend/app/modules/news_bulletin/executors/metadata.py # Wire to assembly engine
```

### Frontend — New Files
```
frontend/src/api/promptAssemblyApi.ts
frontend/src/hooks/usePromptBlocks.ts
frontend/src/hooks/usePromptAssemblyPreview.ts
frontend/src/hooks/usePromptTrace.ts
frontend/src/components/prompt-assembly/PromptBlockList.tsx
frontend/src/components/prompt-assembly/PromptBlockCard.tsx
frontend/src/components/prompt-assembly/PromptBlockDetailPanel.tsx
frontend/src/components/prompt-assembly/RelatedRulesSection.tsx
frontend/src/components/prompt-assembly/PromptPreviewSection.tsx
frontend/src/components/prompt-assembly/BlockBreakdownView.tsx
frontend/src/components/jobs/JobPromptTracePanel.tsx
```

### Frontend — Modified Files
```
frontend/src/pages/admin/PromptEditorPage.tsx     # Extend with block management UI
frontend/src/components/jobs/JobSystemPanels.tsx   # Add Prompt Trace tab
```

---

## Task 1: Database Models

**Files:**
- Create: `backend/app/prompt_assembly/__init__.py`
- Create: `backend/app/prompt_assembly/models.py`
- Modify: `backend/app/db/models.py` (add import at end)

- [ ] **Step 1: Create package init**

Create `backend/app/prompt_assembly/__init__.py`:
```python
"""Prompt Assembly Engine — block-based traceable prompt construction."""
```

- [ ] **Step 2: Write PromptBlock model**

Create `backend/app/prompt_assembly/models.py`:
```python
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import String, Text, DateTime, Boolean, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _uuid() -> str:
    return str(uuid.uuid4())


class PromptBlock(Base):
    """A single building block of an assembled prompt.

    Blocks are selected, ordered, condition-evaluated, and template-rendered
    by the PromptAssemblyService to produce a deterministic final prompt.
    """

    __tablename__ = "prompt_blocks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    key: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    module_scope: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    provider_scope: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    group_name: Mapped[str] = mapped_column(String(100), nullable=False, default="core")
    kind: Mapped[str] = mapped_column(String(50), nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    enabled_by_default: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    condition_type: Mapped[str] = mapped_column(String(50), nullable=False, default="always")
    condition_config_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    content_template: Mapped[str] = mapped_column(Text, nullable=False)
    admin_override_template: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    help_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    visible_in_admin: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="active", index=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    source_kind: Mapped[str] = mapped_column(String(50), nullable=False, default="builtin_default")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now, onupdate=_now
    )

    def effective_template(self) -> str:
        """Return admin override if set, otherwise builtin content_template."""
        if self.admin_override_template is not None:
            return self.admin_override_template
        return self.content_template

    def to_snapshot_dict(self) -> dict:
        """Serialize for job snapshot (frozen at job creation)."""
        return {
            "key": self.key,
            "title": self.title,
            "module_scope": self.module_scope,
            "provider_scope": self.provider_scope,
            "group_name": self.group_name,
            "kind": self.kind,
            "order_index": self.order_index,
            "enabled_by_default": self.enabled_by_default,
            "condition_type": self.condition_type,
            "condition_config_json": self.condition_config_json,
            "content_template": self.content_template,
            "admin_override_template": self.admin_override_template,
            "status": self.status,
            "version": self.version,
            "source_kind": self.source_kind,
        }


class PromptAssemblyRun(Base):
    """Record of a single prompt assembly execution (real job or dry run)."""

    __tablename__ = "prompt_assembly_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    job_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True, index=True
    )
    step_key: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    module_scope: Mapped[str] = mapped_column(String(100), nullable=False)
    provider_name: Mapped[str] = mapped_column(String(100), nullable=False)
    provider_type: Mapped[str] = mapped_column(String(50), nullable=False, default="llm")
    final_prompt_text: Mapped[str] = mapped_column(Text, nullable=False)
    final_payload_json: Mapped[str] = mapped_column(Text, nullable=False)
    provider_response_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    provider_error_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    settings_snapshot_json: Mapped[str] = mapped_column(Text, nullable=False)
    prompt_snapshot_json: Mapped[str] = mapped_column(Text, nullable=False)
    data_snapshot_json: Mapped[str] = mapped_column(Text, nullable=False)
    included_block_keys_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    skipped_block_keys_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    block_count_included: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    block_count_skipped: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_dry_run: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    data_source: Mapped[str] = mapped_column(String(50), nullable=False, default="job_context")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )

    block_traces: Mapped[list["PromptAssemblyBlockTrace"]] = relationship(
        "PromptAssemblyBlockTrace",
        back_populates="assembly_run",
        cascade="all, delete-orphan",
        order_by="PromptAssemblyBlockTrace.order_index",
    )


class PromptAssemblyBlockTrace(Base):
    """Per-block trace within an assembly run."""

    __tablename__ = "prompt_assembly_block_traces"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    assembly_run_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("prompt_assembly_runs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    block_key: Mapped[str] = mapped_column(String(255), nullable=False)
    block_title: Mapped[str] = mapped_column(String(255), nullable=False)
    block_kind: Mapped[str] = mapped_column(String(50), nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    included: Mapped[bool] = mapped_column(Boolean, nullable=False)
    reason_code: Mapped[str] = mapped_column(String(100), nullable=False)
    reason_text: Mapped[str] = mapped_column(Text, nullable=False)
    evaluated_condition_type: Mapped[str] = mapped_column(String(50), nullable=False)
    evaluated_condition_key: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    evaluated_condition_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    rendered_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    used_variables_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    missing_variables_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    data_dependencies_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )

    assembly_run: Mapped["PromptAssemblyRun"] = relationship(
        "PromptAssemblyRun", back_populates="block_traces"
    )
```

- [ ] **Step 3: Register models for Alembic discovery**

Add to the END of `backend/app/db/models.py`:
```python
# Prompt Assembly Engine models (Alembic discovery)
import app.prompt_assembly.models  # noqa: E402, F401
```

- [ ] **Step 4: Run type check**

Run: `cd /Users/huseyincoskun/Downloads/AntigravityProje/ContentHub/backend && python -c "from app.prompt_assembly.models import PromptBlock, PromptAssemblyRun, PromptAssemblyBlockTrace; print('OK:', PromptBlock.__tablename__, PromptAssemblyRun.__tablename__, PromptAssemblyBlockTrace.__tablename__)"`

Expected: `OK: prompt_blocks prompt_assembly_runs prompt_assembly_block_traces`

- [ ] **Step 5: Commit**

```bash
git add backend/app/prompt_assembly/__init__.py backend/app/prompt_assembly/models.py backend/app/db/models.py
git commit -m "feat(prompt-assembly): add PromptBlock, PromptAssemblyRun, PromptAssemblyBlockTrace models"
```

---

## Task 2: Alembic Migration

**Files:**
- Create: `backend/alembic/versions/f1a2b3c4d5e6_add_prompt_assembly_tables.py`

- [ ] **Step 1: Write migration**

Create `backend/alembic/versions/f1a2b3c4d5e6_add_prompt_assembly_tables.py`:
```python
"""Add prompt assembly tables: prompt_blocks, prompt_assembly_runs, prompt_assembly_block_traces.

Revision ID: f1a2b3c4d5e6
Revises: e5f6a7b8c9d0
Create Date: 2026-04-07
"""

from alembic import op
import sqlalchemy as sa

revision = "f1a2b3c4d5e6"
down_revision = "e5f6a7b8c9d0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── prompt_blocks ──
    op.create_table(
        "prompt_blocks",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("key", sa.String(255), unique=True, nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("module_scope", sa.String(100), nullable=True),
        sa.Column("provider_scope", sa.String(100), nullable=True),
        sa.Column("group_name", sa.String(100), nullable=False, server_default="core"),
        sa.Column("kind", sa.String(50), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("enabled_by_default", sa.Boolean(), nullable=False, server_default="1"),
        sa.Column("condition_type", sa.String(50), nullable=False, server_default="always"),
        sa.Column("condition_config_json", sa.Text(), nullable=True),
        sa.Column("content_template", sa.Text(), nullable=False),
        sa.Column("admin_override_template", sa.Text(), nullable=True),
        sa.Column("help_text", sa.Text(), nullable=True),
        sa.Column("visible_in_admin", sa.Boolean(), nullable=False, server_default="1"),
        sa.Column("status", sa.String(50), nullable=False, server_default="active"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("source_kind", sa.String(50), nullable=False, server_default="builtin_default"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_prompt_blocks_key", "prompt_blocks", ["key"])
    op.create_index("ix_prompt_blocks_module_scope", "prompt_blocks", ["module_scope"])
    op.create_index("ix_prompt_blocks_status", "prompt_blocks", ["status"])

    # ── prompt_assembly_runs ──
    op.create_table(
        "prompt_assembly_runs",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("job_id", sa.String(36), sa.ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True),
        sa.Column("step_key", sa.String(100), nullable=True),
        sa.Column("module_scope", sa.String(100), nullable=False),
        sa.Column("provider_name", sa.String(100), nullable=False),
        sa.Column("provider_type", sa.String(50), nullable=False, server_default="llm"),
        sa.Column("final_prompt_text", sa.Text(), nullable=False),
        sa.Column("final_payload_json", sa.Text(), nullable=False),
        sa.Column("provider_response_json", sa.Text(), nullable=True),
        sa.Column("provider_error_json", sa.Text(), nullable=True),
        sa.Column("settings_snapshot_json", sa.Text(), nullable=False),
        sa.Column("prompt_snapshot_json", sa.Text(), nullable=False),
        sa.Column("data_snapshot_json", sa.Text(), nullable=False),
        sa.Column("included_block_keys_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("skipped_block_keys_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("block_count_included", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("block_count_skipped", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_dry_run", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("data_source", sa.String(50), nullable=False, server_default="job_context"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_prompt_assembly_runs_job_id", "prompt_assembly_runs", ["job_id"])

    # ── prompt_assembly_block_traces ──
    op.create_table(
        "prompt_assembly_block_traces",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "assembly_run_id",
            sa.String(36),
            sa.ForeignKey("prompt_assembly_runs.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("block_key", sa.String(255), nullable=False),
        sa.Column("block_title", sa.String(255), nullable=False),
        sa.Column("block_kind", sa.String(50), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.Column("included", sa.Boolean(), nullable=False),
        sa.Column("reason_code", sa.String(100), nullable=False),
        sa.Column("reason_text", sa.Text(), nullable=False),
        sa.Column("evaluated_condition_type", sa.String(50), nullable=False),
        sa.Column("evaluated_condition_key", sa.String(255), nullable=True),
        sa.Column("evaluated_condition_value", sa.Text(), nullable=True),
        sa.Column("rendered_text", sa.Text(), nullable=True),
        sa.Column("used_variables_json", sa.Text(), nullable=True),
        sa.Column("missing_variables_json", sa.Text(), nullable=True),
        sa.Column("data_dependencies_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        "ix_prompt_assembly_block_traces_run_id",
        "prompt_assembly_block_traces",
        ["assembly_run_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_prompt_assembly_block_traces_run_id", table_name="prompt_assembly_block_traces")
    op.drop_table("prompt_assembly_block_traces")
    op.drop_index("ix_prompt_assembly_runs_job_id", table_name="prompt_assembly_runs")
    op.drop_table("prompt_assembly_runs")
    op.drop_index("ix_prompt_blocks_status", table_name="prompt_blocks")
    op.drop_index("ix_prompt_blocks_module_scope", table_name="prompt_blocks")
    op.drop_index("ix_prompt_blocks_key", table_name="prompt_blocks")
    op.drop_table("prompt_blocks")
```

- [ ] **Step 2: Run migration**

Run: `cd /Users/huseyincoskun/Downloads/AntigravityProje/ContentHub/backend && python -m alembic upgrade head`

Expected: tables created successfully

- [ ] **Step 3: Verify tables exist**

Run: `cd /Users/huseyincoskun/Downloads/AntigravityProje/ContentHub/backend && python -c "import sqlite3; conn = sqlite3.connect('data/contenthub.db'); cur = conn.execute(\"SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'prompt%'\"); print([r[0] for r in cur.fetchall()]); conn.close()"`

Expected: `['prompt_blocks', 'prompt_assembly_runs', 'prompt_assembly_block_traces']`

- [ ] **Step 4: Commit**

```bash
git add backend/alembic/versions/f1a2b3c4d5e6_add_prompt_assembly_tables.py
git commit -m "feat(prompt-assembly): add Alembic migration for 3 prompt assembly tables"
```

---

## Task 3: Pydantic Schemas

**Files:**
- Create: `backend/app/prompt_assembly/schemas.py`

- [ ] **Step 1: Write schemas**

Create `backend/app/prompt_assembly/schemas.py`:
```python
"""Pydantic schemas for Prompt Assembly Engine."""

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


# ── PromptBlock ──


class PromptBlockCreate(BaseModel):
    key: str = Field(..., min_length=1, max_length=255)
    title: str = Field(..., min_length=1, max_length=255)
    module_scope: Optional[str] = Field(None, max_length=100)
    provider_scope: Optional[str] = Field(None, max_length=100)
    group_name: str = Field("core", max_length=100)
    kind: str = Field(..., max_length=50)
    order_index: int = Field(0)
    enabled_by_default: bool = True
    condition_type: str = Field("always", max_length=50)
    condition_config_json: Optional[str] = None
    content_template: str = Field(..., min_length=1)
    help_text: Optional[str] = None
    visible_in_admin: bool = True
    status: str = Field("active", max_length=50)


class PromptBlockUpdate(BaseModel):
    """All fields optional — PATCH semantics."""

    title: Optional[str] = Field(None, max_length=255)
    module_scope: Optional[str] = Field(None, max_length=100)
    provider_scope: Optional[str] = Field(None, max_length=100)
    group_name: Optional[str] = Field(None, max_length=100)
    kind: Optional[str] = Field(None, max_length=50)
    order_index: Optional[int] = None
    enabled_by_default: Optional[bool] = None
    condition_type: Optional[str] = Field(None, max_length=50)
    condition_config_json: Optional[str] = None
    admin_override_template: Optional[str] = None
    help_text: Optional[str] = None
    visible_in_admin: Optional[bool] = None
    status: Optional[str] = Field(None, max_length=50)


class PromptBlockResponse(BaseModel):
    id: str
    key: str
    title: str
    module_scope: Optional[str]
    provider_scope: Optional[str]
    group_name: str
    kind: str
    order_index: int
    enabled_by_default: bool
    condition_type: str
    condition_config_json: Optional[str]
    content_template: str
    admin_override_template: Optional[str]
    effective_template: str
    help_text: Optional[str]
    visible_in_admin: bool
    status: str
    version: int
    source_kind: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Assembly Preview / Dry Run ──


class AssemblyPreviewRequest(BaseModel):
    module_scope: str = Field(..., max_length=100)
    step_key: str = Field("script", max_length=100)
    provider_name: Optional[str] = Field(None, max_length=100)
    data_overrides: Optional[dict[str, Any]] = None
    settings_overrides: Optional[dict[str, Any]] = None
    user_content: Optional[str] = None


class BlockTraceResponse(BaseModel):
    block_key: str
    block_title: str
    block_kind: str
    order_index: int
    included: bool
    reason_code: str
    reason_text: str
    evaluated_condition_type: str
    evaluated_condition_key: Optional[str]
    evaluated_condition_value: Optional[str]
    rendered_text: Optional[str]
    used_variables_json: Optional[str]
    missing_variables_json: Optional[str]

    model_config = {"from_attributes": True}


class AssemblyPreviewResponse(BaseModel):
    assembly_run_id: str
    is_dry_run: bool
    data_source: str
    final_prompt_text: str
    final_payload: dict
    included_blocks: list[BlockTraceResponse]
    skipped_blocks: list[BlockTraceResponse]
    settings_snapshot_summary: dict
    data_snapshot_summary: dict


# ── Assembly Run (for Job Detail) ──


class AssemblyRunResponse(BaseModel):
    id: str
    job_id: Optional[str]
    step_key: Optional[str]
    module_scope: str
    provider_name: str
    provider_type: str
    final_prompt_text: str
    final_payload_json: str
    provider_response_json: Optional[str]
    provider_error_json: Optional[str]
    included_block_keys_json: str
    skipped_block_keys_json: str
    block_count_included: int
    block_count_skipped: int
    is_dry_run: bool
    data_source: str
    created_at: datetime

    model_config = {"from_attributes": True}


class AssemblyRunDetailResponse(AssemblyRunResponse):
    """Full detail including block traces and snapshots."""

    settings_snapshot_json: str
    prompt_snapshot_json: str
    data_snapshot_json: str
    block_traces: list[BlockTraceResponse]
```

- [ ] **Step 2: Verify import**

Run: `cd /Users/huseyincoskun/Downloads/AntigravityProje/ContentHub/backend && python -c "from app.prompt_assembly.schemas import PromptBlockCreate, AssemblyPreviewRequest, AssemblyRunDetailResponse; print('OK')"`

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add backend/app/prompt_assembly/schemas.py
git commit -m "feat(prompt-assembly): add Pydantic schemas for blocks, preview, and trace responses"
```

---

## Task 4: Condition Evaluator

**Files:**
- Create: `backend/app/prompt_assembly/condition_evaluator.py`
- Create: `backend/tests/test_condition_evaluator.py`

- [ ] **Step 1: Write failing tests**

Create `backend/tests/test_condition_evaluator.py`:
```python
"""Tests for ConditionEvaluator — 6 condition types."""

import json
import pytest

from app.prompt_assembly.condition_evaluator import ConditionEvaluator, ConditionResult


def _block(
    condition_type: str = "always",
    condition_config: dict | None = None,
    enabled_by_default: bool = True,
    status: str = "active",
) -> dict:
    """Minimal block snapshot dict for testing."""
    return {
        "key": "test.block",
        "title": "Test Block",
        "kind": "behavior_block",
        "enabled_by_default": enabled_by_default,
        "condition_type": condition_type,
        "condition_config_json": json.dumps(condition_config) if condition_config else None,
        "status": status,
    }


@pytest.fixture
def evaluator() -> ConditionEvaluator:
    return ConditionEvaluator()


# ── always ──

def test_always_included(evaluator):
    result = evaluator.evaluate(
        block=_block("always"),
        settings_snapshot={},
        data_snapshot={},
        module_scope="news_bulletin",
        provider_name="kie_ai",
    )
    assert result.included is True
    assert result.reason_code == "included_always"


def test_always_disabled_by_default(evaluator):
    result = evaluator.evaluate(
        block=_block("always", enabled_by_default=False),
        settings_snapshot={},
        data_snapshot={},
        module_scope="news_bulletin",
        provider_name="kie_ai",
    )
    assert result.included is False
    assert result.reason_code == "skipped_disabled_block"


# ── settings_boolean ──

def test_settings_boolean_true(evaluator):
    result = evaluator.evaluate(
        block=_block("settings_boolean", {"settings_key": "normalize_enabled"}),
        settings_snapshot={"normalize_enabled": True},
        data_snapshot={},
        module_scope="news_bulletin",
        provider_name="kie_ai",
    )
    assert result.included is True
    assert result.reason_code == "included_by_setting"
    assert result.evaluated_condition_key == "normalize_enabled"


def test_settings_boolean_false(evaluator):
    result = evaluator.evaluate(
        block=_block("settings_boolean", {"settings_key": "normalize_enabled"}),
        settings_snapshot={"normalize_enabled": False},
        data_snapshot={},
        module_scope="news_bulletin",
        provider_name="kie_ai",
    )
    assert result.included is False
    assert result.reason_code == "skipped_by_setting"


def test_settings_boolean_missing_key(evaluator):
    result = evaluator.evaluate(
        block=_block("settings_boolean", {"settings_key": "normalize_enabled"}),
        settings_snapshot={},
        data_snapshot={},
        module_scope="news_bulletin",
        provider_name="kie_ai",
    )
    assert result.included is False
    assert result.reason_code == "skipped_by_setting"


# ── data_presence ──

def test_data_presence_exists(evaluator):
    result = evaluator.evaluate(
        block=_block("data_presence", {"data_key": "summary"}),
        settings_snapshot={},
        data_snapshot={"summary": "Some text"},
        module_scope="news_bulletin",
        provider_name="kie_ai",
    )
    assert result.included is True
    assert result.reason_code == "included_by_data_presence"


def test_data_presence_missing(evaluator):
    result = evaluator.evaluate(
        block=_block("data_presence", {"data_key": "summary"}),
        settings_snapshot={},
        data_snapshot={},
        module_scope="news_bulletin",
        provider_name="kie_ai",
    )
    assert result.included is False
    assert result.reason_code == "skipped_missing_data"


def test_data_presence_empty_string(evaluator):
    result = evaluator.evaluate(
        block=_block("data_presence", {"data_key": "summary"}),
        settings_snapshot={},
        data_snapshot={"summary": ""},
        module_scope="news_bulletin",
        provider_name="kie_ai",
    )
    assert result.included is False
    assert result.reason_code == "skipped_missing_data"


# ── settings_value_equals ──

def test_value_equals_match(evaluator):
    result = evaluator.evaluate(
        block=_block("settings_value_equals", {"settings_key": "mode", "expected_value": "broadcast"}),
        settings_snapshot={"mode": "broadcast"},
        data_snapshot={},
        module_scope="news_bulletin",
        provider_name="kie_ai",
    )
    assert result.included is True
    assert result.reason_code == "included_by_value_match"


def test_value_equals_mismatch(evaluator):
    result = evaluator.evaluate(
        block=_block("settings_value_equals", {"settings_key": "mode", "expected_value": "broadcast"}),
        settings_snapshot={"mode": "conversational"},
        data_snapshot={},
        module_scope="news_bulletin",
        provider_name="kie_ai",
    )
    assert result.included is False
    assert result.reason_code == "skipped_value_mismatch"


# ── module_match ──

def test_module_match_correct(evaluator):
    result = evaluator.evaluate(
        block=_block("module_match", {"module": "news_bulletin"}),
        settings_snapshot={},
        data_snapshot={},
        module_scope="news_bulletin",
        provider_name="kie_ai",
    )
    assert result.included is True
    assert result.reason_code == "included_by_module_match"


def test_module_match_wrong(evaluator):
    result = evaluator.evaluate(
        block=_block("module_match", {"module": "standard_video"}),
        settings_snapshot={},
        data_snapshot={},
        module_scope="news_bulletin",
        provider_name="kie_ai",
    )
    assert result.included is False
    assert result.reason_code == "skipped_module_mismatch"


# ── provider_match ──

def test_provider_match_correct(evaluator):
    result = evaluator.evaluate(
        block=_block("provider_match", {"provider": "kie_ai"}),
        settings_snapshot={},
        data_snapshot={},
        module_scope="news_bulletin",
        provider_name="kie_ai_gemini_flash",
    )
    assert result.included is True
    assert result.reason_code == "included_by_provider_match"


def test_provider_match_wrong(evaluator):
    result = evaluator.evaluate(
        block=_block("provider_match", {"provider": "openai"}),
        settings_snapshot={},
        data_snapshot={},
        module_scope="news_bulletin",
        provider_name="kie_ai_gemini_flash",
    )
    assert result.included is False
    assert result.reason_code == "skipped_provider_mismatch"


# ── disabled block status ──

def test_disabled_status_block(evaluator):
    result = evaluator.evaluate(
        block=_block("always", status="disabled"),
        settings_snapshot={},
        data_snapshot={},
        module_scope="news_bulletin",
        provider_name="kie_ai",
    )
    assert result.included is False
    assert result.reason_code == "skipped_disabled_block"
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/huseyincoskun/Downloads/AntigravityProje/ContentHub/backend && python -m pytest tests/test_condition_evaluator.py -v --tb=short 2>&1 | tail -5`

Expected: FAIL — `ModuleNotFoundError: No module named 'app.prompt_assembly.condition_evaluator'`

- [ ] **Step 3: Implement ConditionEvaluator**

Create `backend/app/prompt_assembly/condition_evaluator.py`:
```python
"""Condition evaluator for prompt blocks.

Supports 6 condition types with no DSL — simple, deterministic, traceable.
"""

import json
import logging
from dataclasses import dataclass
from typing import Any, Optional

logger = logging.getLogger(__name__)


@dataclass
class ConditionResult:
    """Result of evaluating a block's inclusion condition."""

    included: bool
    reason_code: str
    reason_text: str
    evaluated_condition_type: str
    evaluated_condition_key: Optional[str] = None
    evaluated_condition_value: Optional[str] = None


class ConditionEvaluator:
    """Evaluates whether a prompt block should be included in the assembly.

    Pure function — no side effects, no DB access, no external calls.
    All inputs come from frozen snapshots.
    """

    def evaluate(
        self,
        block: dict,
        settings_snapshot: dict[str, Any],
        data_snapshot: dict[str, Any],
        module_scope: str,
        provider_name: str,
    ) -> ConditionResult:
        """Evaluate a single block's condition.

        Args:
            block: Block snapshot dict (from PromptBlock.to_snapshot_dict or seed)
            settings_snapshot: Frozen effective settings
            data_snapshot: Frozen data inputs
            module_scope: Target module (e.g. "news_bulletin")
            provider_name: Target provider (e.g. "kie_ai_gemini_flash")

        Returns:
            ConditionResult with included/skipped decision and trace metadata
        """
        condition_type = block.get("condition_type", "always")
        status = block.get("status", "active")
        enabled_by_default = block.get("enabled_by_default", True)

        # Pre-check: disabled status always skips
        if status == "disabled":
            return ConditionResult(
                included=False,
                reason_code="skipped_disabled_block",
                reason_text=f"Blok status='{status}', devre disi",
                evaluated_condition_type=condition_type,
            )

        # Pre-check: enabled_by_default=False + always = disabled
        if not enabled_by_default and condition_type == "always":
            return ConditionResult(
                included=False,
                reason_code="skipped_disabled_block",
                reason_text="enabled_by_default=false ve condition=always, blok varsayilan kapali",
                evaluated_condition_type="always",
            )

        config = self._parse_config(block.get("condition_config_json"))

        handler = {
            "always": self._eval_always,
            "settings_boolean": self._eval_settings_boolean,
            "data_presence": self._eval_data_presence,
            "settings_value_equals": self._eval_settings_value_equals,
            "module_match": self._eval_module_match,
            "provider_match": self._eval_provider_match,
        }.get(condition_type)

        if handler is None:
            return ConditionResult(
                included=False,
                reason_code="skipped_disabled_block",
                reason_text=f"Bilinmeyen condition_type: '{condition_type}'",
                evaluated_condition_type=condition_type,
            )

        return handler(
            config=config,
            settings_snapshot=settings_snapshot,
            data_snapshot=data_snapshot,
            module_scope=module_scope,
            provider_name=provider_name,
            enabled_by_default=enabled_by_default,
        )

    # ── Condition handlers ──

    def _eval_always(self, **kwargs) -> ConditionResult:
        return ConditionResult(
            included=True,
            reason_code="included_always",
            reason_text="Blok her zaman dahil edilir",
            evaluated_condition_type="always",
        )

    def _eval_settings_boolean(
        self,
        config: dict,
        settings_snapshot: dict,
        enabled_by_default: bool,
        **kwargs,
    ) -> ConditionResult:
        key = config.get("settings_key", "")
        value = settings_snapshot.get(key)
        is_true = bool(value) if value is not None else False

        if is_true:
            return ConditionResult(
                included=True,
                reason_code="included_by_setting",
                reason_text=f"{key}=true oldugu icin eklendi",
                evaluated_condition_type="settings_boolean",
                evaluated_condition_key=key,
                evaluated_condition_value=str(value),
            )
        else:
            return ConditionResult(
                included=False,
                reason_code="skipped_by_setting",
                reason_text=f"{key}={'false' if value is not None else 'yok'} oldugu icin atlandi",
                evaluated_condition_type="settings_boolean",
                evaluated_condition_key=key,
                evaluated_condition_value=str(value) if value is not None else None,
            )

    def _eval_data_presence(
        self, config: dict, data_snapshot: dict, **kwargs
    ) -> ConditionResult:
        key = config.get("data_key", "")
        value = data_snapshot.get(key)
        is_present = bool(value)

        if is_present:
            return ConditionResult(
                included=True,
                reason_code="included_by_data_presence",
                reason_text=f"{key} verisi mevcut, blok eklendi",
                evaluated_condition_type="data_presence",
                evaluated_condition_key=key,
                evaluated_condition_value="present",
            )
        else:
            return ConditionResult(
                included=False,
                reason_code="skipped_missing_data",
                reason_text=f"{key} verisi bos/yok, blok atlandi",
                evaluated_condition_type="data_presence",
                evaluated_condition_key=key,
                evaluated_condition_value="absent",
            )

    def _eval_settings_value_equals(
        self, config: dict, settings_snapshot: dict, **kwargs
    ) -> ConditionResult:
        key = config.get("settings_key", "")
        expected = config.get("expected_value")
        actual = settings_snapshot.get(key)

        if str(actual) == str(expected):
            return ConditionResult(
                included=True,
                reason_code="included_by_value_match",
                reason_text=f"{key}='{actual}' eslesir (beklenen: '{expected}')",
                evaluated_condition_type="settings_value_equals",
                evaluated_condition_key=key,
                evaluated_condition_value=str(actual),
            )
        else:
            return ConditionResult(
                included=False,
                reason_code="skipped_value_mismatch",
                reason_text=f"{key}='{actual}' eslesmiyor (beklenen: '{expected}')",
                evaluated_condition_type="settings_value_equals",
                evaluated_condition_key=key,
                evaluated_condition_value=str(actual) if actual is not None else None,
            )

    def _eval_module_match(
        self, config: dict, module_scope: str, **kwargs
    ) -> ConditionResult:
        expected = config.get("module", "")

        if module_scope == expected:
            return ConditionResult(
                included=True,
                reason_code="included_by_module_match",
                reason_text=f"Modul '{module_scope}' eslesiyor",
                evaluated_condition_type="module_match",
                evaluated_condition_key=expected,
                evaluated_condition_value=module_scope,
            )
        else:
            return ConditionResult(
                included=False,
                reason_code="skipped_module_mismatch",
                reason_text=f"Modul '{module_scope}' eslesmiyor (beklenen: '{expected}')",
                evaluated_condition_type="module_match",
                evaluated_condition_key=expected,
                evaluated_condition_value=module_scope,
            )

    def _eval_provider_match(
        self, config: dict, provider_name: str, **kwargs
    ) -> ConditionResult:
        expected = config.get("provider", "")

        if provider_name.startswith(expected):
            return ConditionResult(
                included=True,
                reason_code="included_by_provider_match",
                reason_text=f"Provider '{provider_name}' eslesiyor (prefix: '{expected}')",
                evaluated_condition_type="provider_match",
                evaluated_condition_key=expected,
                evaluated_condition_value=provider_name,
            )
        else:
            return ConditionResult(
                included=False,
                reason_code="skipped_provider_mismatch",
                reason_text=f"Provider '{provider_name}' eslesmiyor (beklenen prefix: '{expected}')",
                evaluated_condition_type="provider_match",
                evaluated_condition_key=expected,
                evaluated_condition_value=provider_name,
            )

    # ── Helpers ──

    @staticmethod
    def _parse_config(config_json: str | None) -> dict:
        if not config_json:
            return {}
        try:
            return json.loads(config_json)
        except (json.JSONDecodeError, TypeError):
            return {}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/huseyincoskun/Downloads/AntigravityProje/ContentHub/backend && python -m pytest tests/test_condition_evaluator.py -v --tb=short`

Expected: All 16 tests PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/prompt_assembly/condition_evaluator.py backend/tests/test_condition_evaluator.py
git commit -m "feat(prompt-assembly): implement ConditionEvaluator with 6 condition types + 16 tests"
```

---

## Task 5: Template Renderer

**Files:**
- Create: `backend/app/prompt_assembly/template_renderer.py`
- Create: `backend/tests/test_template_renderer.py`

- [ ] **Step 1: Write failing tests**

Create `backend/tests/test_template_renderer.py`:
```python
"""Tests for TemplateRenderer — {{variable}} substitution."""

import pytest
from app.prompt_assembly.template_renderer import TemplateRenderer, RenderResult


@pytest.fixture
def renderer() -> TemplateRenderer:
    return TemplateRenderer()


def test_simple_substitution(renderer):
    result = renderer.render(
        template="Kategori: {{category_name}}",
        data={"category_name": "gundem"},
    )
    assert result.rendered_text == "Kategori: gundem"
    assert result.used_variables == ["category_name"]
    assert result.missing_variables == []
    assert result.is_empty is False


def test_multiple_variables(renderer):
    result = renderer.render(
        template="{{title}} - {{summary}}",
        data={"title": "Test", "summary": "Ozet"},
    )
    assert result.rendered_text == "Test - Ozet"
    assert set(result.used_variables) == {"title", "summary"}


def test_missing_non_critical_variable(renderer):
    result = renderer.render(
        template="Ton: {{tone}}, Stil: {{style}}",
        data={"tone": "formal"},
    )
    assert result.rendered_text == "Ton: formal, Stil: "
    assert "style" in result.missing_variables
    assert result.has_critical_missing is False


def test_missing_critical_variable(renderer):
    result = renderer.render(
        template="Haberler: {{news_summary}}",
        data={},
        critical_keys=["news_summary"],
    )
    assert result.has_critical_missing is True
    assert "news_summary" in result.missing_variables


def test_no_variables(renderer):
    result = renderer.render(
        template="Sabit metin bloku",
        data={},
    )
    assert result.rendered_text == "Sabit metin bloku"
    assert result.used_variables == []
    assert result.missing_variables == []


def test_empty_render(renderer):
    result = renderer.render(
        template="{{maybe_empty}}",
        data={"maybe_empty": ""},
    )
    assert result.rendered_text == ""
    assert result.is_empty is True


def test_unicode_content(renderer):
    result = renderer.render(
        template="Baslik: {{title}}",
        data={"title": "Turkiye'de deprem: Afet bolgesinden son haberler"},
    )
    assert "Turkiye" in result.rendered_text


def test_multiline_template(renderer):
    result = renderer.render(
        template="Baslik: {{title}}\nOzet:\n{{summary}}",
        data={"title": "Test", "summary": "Paragraf 1\nParagraf 2"},
    )
    assert "Test" in result.rendered_text
    assert "Paragraf 2" in result.rendered_text


def test_repeated_variable(renderer):
    result = renderer.render(
        template="{{name}} diyor ki: {{name}}",
        data={"name": "Ali"},
    )
    assert result.rendered_text == "Ali diyor ki: Ali"
    assert result.used_variables == ["name"]


def test_extract_data_dependencies(renderer):
    deps = renderer.extract_data_dependencies("{{a}} ve {{b}} ile {{c}}")
    assert set(deps) == {"a", "b", "c"}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/huseyincoskun/Downloads/AntigravityProje/ContentHub/backend && python -m pytest tests/test_template_renderer.py -v --tb=short 2>&1 | tail -5`

Expected: FAIL — import error

- [ ] **Step 3: Implement TemplateRenderer**

Create `backend/app/prompt_assembly/template_renderer.py`:
```python
"""Template renderer for prompt blocks.

Simple {{variable}} substitution — no Jinja2, no block-level conditions.
All conditional logic stays at the block selection level.
"""

import re
import logging
from dataclasses import dataclass, field
from typing import Any, Optional

logger = logging.getLogger(__name__)

_VAR_PATTERN = re.compile(r"\{\{(\w+)\}\}")


@dataclass
class RenderResult:
    """Result of rendering a template with data."""

    rendered_text: str
    used_variables: list[str] = field(default_factory=list)
    missing_variables: list[str] = field(default_factory=list)
    is_empty: bool = False
    has_critical_missing: bool = False


class TemplateRenderer:
    """Renders prompt block templates with {{variable}} substitution.

    Pure function — no side effects. Deterministic: same template + same data
    always produces the same output.
    """

    def render(
        self,
        template: str,
        data: dict[str, Any],
        critical_keys: list[str] | None = None,
    ) -> RenderResult:
        """Render a template with data substitution.

        Args:
            template: Template string with {{variable}} placeholders
            data: Data dict to substitute from
            critical_keys: Variables that MUST be present; if missing,
                           has_critical_missing=True (block should be skipped)

        Returns:
            RenderResult with rendered text and variable tracking
        """
        critical_keys = critical_keys or []

        # Find all variable references in template
        all_vars = list(dict.fromkeys(_VAR_PATTERN.findall(template)))

        used: list[str] = []
        missing: list[str] = []
        has_critical = False

        def _replace(match: re.Match) -> str:
            var_name = match.group(1)
            value = data.get(var_name)

            if value is not None and str(value) != "":
                if var_name not in used:
                    used.append(var_name)
                return str(value)
            else:
                if var_name not in missing:
                    missing.append(var_name)
                return ""

        rendered = _VAR_PATTERN.sub(_replace, template)

        # Check critical keys
        for key in critical_keys:
            if key in missing:
                has_critical = True

        is_empty = rendered.strip() == ""

        return RenderResult(
            rendered_text=rendered,
            used_variables=used,
            missing_variables=missing,
            is_empty=is_empty,
            has_critical_missing=has_critical,
        )

    @staticmethod
    def extract_data_dependencies(template: str) -> list[str]:
        """Extract all variable names from a template (for trace metadata)."""
        return list(dict.fromkeys(_VAR_PATTERN.findall(template)))
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/huseyincoskun/Downloads/AntigravityProje/ContentHub/backend && python -m pytest tests/test_template_renderer.py -v --tb=short`

Expected: All 11 tests PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/prompt_assembly/template_renderer.py backend/tests/test_template_renderer.py
git commit -m "feat(prompt-assembly): implement TemplateRenderer with {{variable}} substitution + 11 tests"
```

---

## Task 6: Block CRUD Service

**Files:**
- Create: `backend/app/prompt_assembly/service.py`

- [ ] **Step 1: Implement service**

Create `backend/app/prompt_assembly/service.py`:
```python
"""PromptBlock CRUD service and query helpers."""

import logging
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.prompt_assembly.models import PromptBlock
from app.prompt_assembly.schemas import PromptBlockCreate, PromptBlockUpdate
from app.audit.service import write_audit_log

logger = logging.getLogger(__name__)

# Kinds that cannot be disabled or deleted
PROTECTED_KINDS = {"core_system", "output_contract"}


async def list_blocks(
    db: AsyncSession,
    module_scope: Optional[str] = None,
    provider_scope: Optional[str] = None,
    status_filter: str = "active",
) -> List[PromptBlock]:
    """List prompt blocks with optional filters, ordered by order_index."""
    stmt = select(PromptBlock).order_by(PromptBlock.order_index, PromptBlock.key)

    if module_scope is not None:
        stmt = stmt.where(
            (PromptBlock.module_scope == module_scope) | (PromptBlock.module_scope.is_(None))
        )
    if provider_scope is not None:
        stmt = stmt.where(
            (PromptBlock.provider_scope == provider_scope) | (PromptBlock.provider_scope.is_(None))
        )
    if status_filter:
        stmt = stmt.where(PromptBlock.status == status_filter)

    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_block(db: AsyncSession, block_id: str) -> PromptBlock:
    """Fetch a single block by ID. Raises 404 if not found."""
    result = await db.execute(select(PromptBlock).where(PromptBlock.id == block_id))
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"PromptBlock '{block_id}' not found.",
        )
    return row


async def get_block_by_key(db: AsyncSession, key: str) -> Optional[PromptBlock]:
    """Fetch a single block by key. Returns None if not found."""
    result = await db.execute(select(PromptBlock).where(PromptBlock.key == key))
    return result.scalar_one_or_none()


async def create_block(db: AsyncSession, payload: PromptBlockCreate) -> PromptBlock:
    """Create a new prompt block."""
    row = PromptBlock(**payload.model_dump())
    db.add(row)
    await db.commit()
    await db.refresh(row)

    await write_audit_log(
        db,
        action="prompt_block.create",
        entity_type="prompt_block",
        entity_id=row.id,
        details={"key": row.key, "kind": row.kind, "module_scope": row.module_scope},
    )
    return row


async def update_block(
    db: AsyncSession, block_id: str, payload: PromptBlockUpdate
) -> PromptBlock:
    """Update a prompt block (PATCH semantics)."""
    row = await get_block(db, block_id)
    changes = payload.model_dump(exclude_unset=True)

    if not changes:
        return row

    # Enforce protection rules
    _enforce_protection(row, changes)

    for field_name, value in changes.items():
        setattr(row, field_name, value)

    # Track admin override
    if "admin_override_template" in changes and changes["admin_override_template"] is not None:
        row.source_kind = "admin_override"
    elif "admin_override_template" in changes and changes["admin_override_template"] is None:
        row.source_kind = "builtin_default"

    row.version = row.version + 1

    await db.commit()
    await db.refresh(row)

    await write_audit_log(
        db,
        action="prompt_block.update",
        entity_type="prompt_block",
        entity_id=row.id,
        details={"key": row.key, "changed_fields": list(changes.keys())},
    )
    return row


async def get_effective_blocks(
    db: AsyncSession, module_scope: str
) -> List[PromptBlock]:
    """Get all active blocks applicable to a module (for snapshot)."""
    stmt = (
        select(PromptBlock)
        .where(PromptBlock.status == "active")
        .where(
            (PromptBlock.module_scope == module_scope) | (PromptBlock.module_scope.is_(None))
        )
        .order_by(PromptBlock.order_index, PromptBlock.key)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


def _enforce_protection(block: PromptBlock, changes: dict) -> None:
    """Prevent disabling/deleting core_system and output_contract blocks."""
    if block.kind not in PROTECTED_KINDS:
        return

    new_status = changes.get("status")
    if new_status and new_status in ("disabled", "deleted"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"'{block.kind}' turundeki bloklar devre disi birakilamaz veya silinemez.",
        )
```

- [ ] **Step 2: Verify import**

Run: `cd /Users/huseyincoskun/Downloads/AntigravityProje/ContentHub/backend && python -c "from app.prompt_assembly.service import list_blocks, get_block, create_block, update_block, get_effective_blocks; print('OK')"`

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add backend/app/prompt_assembly/service.py
git commit -m "feat(prompt-assembly): implement PromptBlock CRUD service with protection rules"
```

---

## Task 7: Assembly Service + Trace Service + Payload Builder

**Files:**
- Create: `backend/app/prompt_assembly/assembly_service.py`
- Create: `backend/app/prompt_assembly/trace_service.py`
- Create: `backend/app/prompt_assembly/payload_builder.py`
- Create: `backend/tests/test_assembly_service.py`

- [ ] **Step 1: Write Payload Builder**

Create `backend/app/prompt_assembly/payload_builder.py`:
```python
"""Provider-specific payload construction.

Converts assembled prompt into provider-ready format.
Provider-specific logic stays here — never leaks into assembly layer.
"""

import json
import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)

# Fields that must NEVER appear in stored payloads
_SECRET_PATTERNS = {"authorization", "api_key", "api-key", "x-api-key", "token", "bearer", "secret"}


class ProviderPayloadBuilder:
    """Build provider-specific request payloads from assembled prompts."""

    def build(
        self,
        provider_name: str,
        system_prompt: str,
        user_content: str,
        model: str = "",
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
    ) -> dict:
        """Build a provider-ready payload.

        Args:
            provider_name: Provider identifier (e.g. "kie_ai_gemini_flash")
            system_prompt: The assembled prompt (from assembly engine)
            user_content: User message (module-specific input data)
            model: Model name
            temperature: Sampling temperature
            max_tokens: Max output tokens

        Returns:
            Provider-ready payload dict (body only, no auth headers)
        """
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ]

        payload: dict[str, Any] = {"messages": messages}

        if model:
            payload["model"] = model
        payload["temperature"] = temperature
        if max_tokens is not None:
            payload["max_tokens"] = max_tokens

        return payload

    @staticmethod
    def sanitize_for_storage(data: dict | str | None) -> str | None:
        """Sanitize payload/response before persisting to trace.

        Removes any fields matching secret patterns.
        Returns JSON string ready for storage.
        """
        if data is None:
            return None

        if isinstance(data, str):
            try:
                data = json.loads(data)
            except (json.JSONDecodeError, TypeError):
                return data

        sanitized = _redact_secrets(data)
        return json.dumps(sanitized, ensure_ascii=False)


def _redact_secrets(obj: Any) -> Any:
    """Recursively redact secret-bearing fields."""
    if isinstance(obj, dict):
        return {
            k: "[REDACTED]" if any(p in k.lower() for p in _SECRET_PATTERNS) else _redact_secrets(v)
            for k, v in obj.items()
        }
    if isinstance(obj, list):
        return [_redact_secrets(item) for item in obj]
    return obj
```

- [ ] **Step 2: Write Trace Service**

Create `backend/app/prompt_assembly/trace_service.py`:
```python
"""Prompt trace persistence — records assembly runs and block traces."""

import json
import logging
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.prompt_assembly.models import PromptAssemblyRun, PromptAssemblyBlockTrace
from app.prompt_assembly.payload_builder import ProviderPayloadBuilder

logger = logging.getLogger(__name__)


async def create_assembly_run(
    db: AsyncSession,
    *,
    job_id: Optional[str],
    step_key: Optional[str],
    module_scope: str,
    provider_name: str,
    provider_type: str,
    final_prompt_text: str,
    final_payload: dict,
    settings_snapshot: dict,
    prompt_snapshot: list[dict],
    data_snapshot: dict,
    included_block_keys: list[str],
    skipped_block_keys: list[str],
    is_dry_run: bool,
    data_source: str,
    block_traces: list[dict],
) -> PromptAssemblyRun:
    """Persist a complete assembly run with all block traces."""

    sanitizer = ProviderPayloadBuilder.sanitize_for_storage

    run = PromptAssemblyRun(
        job_id=job_id,
        step_key=step_key,
        module_scope=module_scope,
        provider_name=provider_name,
        provider_type=provider_type,
        final_prompt_text=final_prompt_text,
        final_payload_json=sanitizer(final_payload) or "{}",
        settings_snapshot_json=json.dumps(settings_snapshot, ensure_ascii=False),
        prompt_snapshot_json=json.dumps(prompt_snapshot, ensure_ascii=False),
        data_snapshot_json=json.dumps(data_snapshot, ensure_ascii=False),
        included_block_keys_json=json.dumps(included_block_keys),
        skipped_block_keys_json=json.dumps(skipped_block_keys),
        block_count_included=len(included_block_keys),
        block_count_skipped=len(skipped_block_keys),
        is_dry_run=is_dry_run,
        data_source=data_source,
    )
    db.add(run)
    await db.flush()  # get run.id for block traces

    for bt in block_traces:
        trace = PromptAssemblyBlockTrace(
            assembly_run_id=run.id,
            block_key=bt["block_key"],
            block_title=bt["block_title"],
            block_kind=bt["block_kind"],
            order_index=bt["order_index"],
            included=bt["included"],
            reason_code=bt["reason_code"],
            reason_text=bt["reason_text"],
            evaluated_condition_type=bt["evaluated_condition_type"],
            evaluated_condition_key=bt.get("evaluated_condition_key"),
            evaluated_condition_value=bt.get("evaluated_condition_value"),
            rendered_text=bt.get("rendered_text"),
            used_variables_json=json.dumps(bt.get("used_variables")) if bt.get("used_variables") else None,
            missing_variables_json=json.dumps(bt.get("missing_variables")) if bt.get("missing_variables") else None,
            data_dependencies_json=json.dumps(bt.get("data_dependencies")) if bt.get("data_dependencies") else None,
        )
        db.add(trace)

    await db.commit()
    await db.refresh(run)
    return run


async def record_provider_result(
    db: AsyncSession,
    assembly_run_id: str,
    response_json: Optional[dict] = None,
    error_json: Optional[dict] = None,
) -> None:
    """Update an assembly run with the provider response/error after invocation."""
    result = await db.execute(
        select(PromptAssemblyRun).where(PromptAssemblyRun.id == assembly_run_id)
    )
    run = result.scalar_one_or_none()
    if run is None:
        logger.warning("Assembly run %s not found for provider result", assembly_run_id)
        return

    sanitizer = ProviderPayloadBuilder.sanitize_for_storage

    if response_json is not None:
        run.provider_response_json = sanitizer(response_json)
    if error_json is not None:
        run.provider_error_json = sanitizer(error_json)

    await db.commit()


async def get_assembly_runs_for_job(
    db: AsyncSession, job_id: str
) -> list[PromptAssemblyRun]:
    """Get all assembly runs (with block traces) for a job."""
    stmt = (
        select(PromptAssemblyRun)
        .where(PromptAssemblyRun.job_id == job_id)
        .order_by(PromptAssemblyRun.created_at)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_assembly_run_detail(
    db: AsyncSession, run_id: str
) -> Optional[PromptAssemblyRun]:
    """Get a single assembly run with block traces eager-loaded."""
    result = await db.execute(
        select(PromptAssemblyRun).where(PromptAssemblyRun.id == run_id)
    )
    run = result.scalar_one_or_none()
    if run is not None:
        # Trigger lazy load of block_traces
        _ = run.block_traces
    return run
```

- [ ] **Step 3: Write Assembly Service**

Create `backend/app/prompt_assembly/assembly_service.py`:
```python
"""Prompt Assembly Service — the orchestrator.

Deterministic: same snapshots → same final prompt.
No side effects beyond trace persistence.
"""

import json
import logging
from dataclasses import dataclass, field
from typing import Any, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.prompt_assembly.condition_evaluator import ConditionEvaluator, ConditionResult
from app.prompt_assembly.template_renderer import TemplateRenderer, RenderResult
from app.prompt_assembly.payload_builder import ProviderPayloadBuilder
from app.prompt_assembly import trace_service

logger = logging.getLogger(__name__)

BLOCK_SEPARATOR = "\n\n"


@dataclass
class BlockTraceEntry:
    block_key: str
    block_title: str
    block_kind: str
    order_index: int
    included: bool
    reason_code: str
    reason_text: str
    evaluated_condition_type: str
    evaluated_condition_key: Optional[str] = None
    evaluated_condition_value: Optional[str] = None
    rendered_text: Optional[str] = None
    used_variables: Optional[list[str]] = None
    missing_variables: Optional[list[str]] = None
    data_dependencies: Optional[list[str]] = None

    def to_dict(self) -> dict:
        return {
            "block_key": self.block_key,
            "block_title": self.block_title,
            "block_kind": self.block_kind,
            "order_index": self.order_index,
            "included": self.included,
            "reason_code": self.reason_code,
            "reason_text": self.reason_text,
            "evaluated_condition_type": self.evaluated_condition_type,
            "evaluated_condition_key": self.evaluated_condition_key,
            "evaluated_condition_value": self.evaluated_condition_value,
            "rendered_text": self.rendered_text,
            "used_variables": self.used_variables,
            "missing_variables": self.missing_variables,
            "data_dependencies": self.data_dependencies,
        }


@dataclass
class AssemblyResult:
    final_prompt_text: str
    final_payload: dict
    included_blocks: list[BlockTraceEntry]
    skipped_blocks: list[BlockTraceEntry]
    assembly_run_id: Optional[str] = None


class PromptAssemblyService:
    """Orchestrates block-based prompt assembly.

    1. Filters blocks by module/provider scope
    2. Evaluates conditions for each block
    3. Renders templates for included blocks
    4. Assembles final prompt text
    5. Builds provider payload
    6. Persists trace
    """

    def __init__(self) -> None:
        self._evaluator = ConditionEvaluator()
        self._renderer = TemplateRenderer()
        self._payload_builder = ProviderPayloadBuilder()

    async def assemble(
        self,
        db: AsyncSession,
        *,
        module_scope: str,
        step_key: str,
        provider_name: str,
        provider_type: str = "llm",
        settings_snapshot: dict[str, Any],
        block_snapshot: list[dict],
        data_snapshot: dict[str, Any],
        user_content: str = "",
        model: str = "",
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        job_id: Optional[str] = None,
        is_dry_run: bool = False,
        data_source: str = "job_context",
    ) -> AssemblyResult:
        """Execute a full prompt assembly.

        Args:
            db: Database session (for trace persistence)
            module_scope: Target module (e.g. "news_bulletin")
            step_key: Pipeline step (e.g. "script", "metadata")
            provider_name: Target provider (e.g. "kie_ai_gemini_flash")
            provider_type: Provider capability type (e.g. "llm")
            settings_snapshot: Frozen effective settings
            block_snapshot: Frozen block definitions (list of dicts)
            data_snapshot: Frozen data inputs
            user_content: User message (module-specific input)
            model: Model name for payload
            temperature: Sampling temperature
            max_tokens: Max output tokens
            job_id: Job ID (null for dry run)
            is_dry_run: True if this is a preview-only run
            data_source: "job_context" or "sample_input"

        Returns:
            AssemblyResult with final prompt, payload, and trace entries
        """

        # 1. FILTER by scope + status
        filtered = self._filter_blocks(block_snapshot, module_scope, provider_name)

        # 2. EVALUATE conditions + 3. RENDER templates
        included_blocks: list[BlockTraceEntry] = []
        skipped_blocks: list[BlockTraceEntry] = []

        for block in filtered:
            entry = self._process_block(block, settings_snapshot, data_snapshot, module_scope, provider_name)
            if entry.included:
                included_blocks.append(entry)
            else:
                skipped_blocks.append(entry)

        # 4. ASSEMBLE final prompt
        rendered_parts = [b.rendered_text for b in included_blocks if b.rendered_text]
        final_prompt_text = BLOCK_SEPARATOR.join(rendered_parts)

        # 5. BUILD payload
        final_payload = self._payload_builder.build(
            provider_name=provider_name,
            system_prompt=final_prompt_text,
            user_content=user_content,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
        )

        # 6. PERSIST trace
        included_keys = [b.block_key for b in included_blocks]
        skipped_keys = [b.block_key for b in skipped_blocks]
        all_traces = [b.to_dict() for b in included_blocks + skipped_blocks]

        run = await trace_service.create_assembly_run(
            db,
            job_id=job_id,
            step_key=step_key,
            module_scope=module_scope,
            provider_name=provider_name,
            provider_type=provider_type,
            final_prompt_text=final_prompt_text,
            final_payload=final_payload,
            settings_snapshot=settings_snapshot,
            prompt_snapshot=block_snapshot,
            data_snapshot=data_snapshot,
            included_block_keys=included_keys,
            skipped_block_keys=skipped_keys,
            is_dry_run=is_dry_run,
            data_source=data_source,
            block_traces=all_traces,
        )

        return AssemblyResult(
            final_prompt_text=final_prompt_text,
            final_payload=final_payload,
            included_blocks=included_blocks,
            skipped_blocks=skipped_blocks,
            assembly_run_id=run.id,
        )

    def _filter_blocks(
        self,
        blocks: list[dict],
        module_scope: str,
        provider_name: str,
    ) -> list[dict]:
        """Filter blocks by module/provider scope and status, sort by order_index."""
        filtered = []
        for b in blocks:
            # Status filter
            if b.get("status") not in ("active", None):
                continue
            # Module scope filter
            b_module = b.get("module_scope")
            if b_module is not None and b_module != module_scope:
                continue
            # Provider scope filter
            b_provider = b.get("provider_scope")
            if b_provider is not None and not provider_name.startswith(b_provider):
                continue
            filtered.append(b)

        filtered.sort(key=lambda b: (b.get("order_index", 0), b.get("key", "")))
        return filtered

    def _process_block(
        self,
        block: dict,
        settings_snapshot: dict,
        data_snapshot: dict,
        module_scope: str,
        provider_name: str,
    ) -> BlockTraceEntry:
        """Evaluate condition and render template for a single block."""
        template = block.get("admin_override_template") or block.get("content_template", "")
        data_deps = self._renderer.extract_data_dependencies(template)

        # Condition evaluation
        cond_result = self._evaluator.evaluate(
            block=block,
            settings_snapshot=settings_snapshot,
            data_snapshot=data_snapshot,
            module_scope=module_scope,
            provider_name=provider_name,
        )

        if not cond_result.included:
            return BlockTraceEntry(
                block_key=block["key"],
                block_title=block.get("title", ""),
                block_kind=block.get("kind", ""),
                order_index=block.get("order_index", 0),
                included=False,
                reason_code=cond_result.reason_code,
                reason_text=cond_result.reason_text,
                evaluated_condition_type=cond_result.evaluated_condition_type,
                evaluated_condition_key=cond_result.evaluated_condition_key,
                evaluated_condition_value=cond_result.evaluated_condition_value,
                data_dependencies=data_deps,
            )

        # Template rendering
        render_result = self._renderer.render(
            template=template,
            data=data_snapshot,
            critical_keys=data_deps if block.get("kind") == "context_block" else None,
        )

        # Handle critical missing data
        if render_result.has_critical_missing:
            return BlockTraceEntry(
                block_key=block["key"],
                block_title=block.get("title", ""),
                block_kind=block.get("kind", ""),
                order_index=block.get("order_index", 0),
                included=False,
                reason_code="skipped_critical_data_missing",
                reason_text=f"Kritik veri eksik: {render_result.missing_variables}",
                evaluated_condition_type=cond_result.evaluated_condition_type,
                evaluated_condition_key=cond_result.evaluated_condition_key,
                evaluated_condition_value=cond_result.evaluated_condition_value,
                missing_variables=render_result.missing_variables,
                data_dependencies=data_deps,
            )

        # Handle empty render
        if render_result.is_empty:
            return BlockTraceEntry(
                block_key=block["key"],
                block_title=block.get("title", ""),
                block_kind=block.get("kind", ""),
                order_index=block.get("order_index", 0),
                included=False,
                reason_code="skipped_empty_render",
                reason_text="Render sonucu bos, blok atlandi",
                evaluated_condition_type=cond_result.evaluated_condition_type,
                evaluated_condition_key=cond_result.evaluated_condition_key,
                evaluated_condition_value=cond_result.evaluated_condition_value,
                data_dependencies=data_deps,
            )

        return BlockTraceEntry(
            block_key=block["key"],
            block_title=block.get("title", ""),
            block_kind=block.get("kind", ""),
            order_index=block.get("order_index", 0),
            included=True,
            reason_code=cond_result.reason_code,
            reason_text=cond_result.reason_text,
            evaluated_condition_type=cond_result.evaluated_condition_type,
            evaluated_condition_key=cond_result.evaluated_condition_key,
            evaluated_condition_value=cond_result.evaluated_condition_value,
            rendered_text=render_result.rendered_text,
            used_variables=render_result.used_variables,
            missing_variables=render_result.missing_variables,
            data_dependencies=data_deps,
        )
```

- [ ] **Step 4: Write assembly determinism test**

Create `backend/tests/test_assembly_service.py`:
```python
"""Tests for PromptAssemblyService — determinism and block processing."""

import json
import pytest
from unittest.mock import AsyncMock, patch

from app.prompt_assembly.assembly_service import PromptAssemblyService, AssemblyResult


def _block(key, kind="behavior_block", order=0, condition_type="always",
           condition_config=None, content="Static text", enabled=True, status="active",
           module_scope=None, provider_scope=None, admin_override=None):
    return {
        "key": key,
        "title": key.replace(".", " ").title(),
        "kind": kind,
        "order_index": order,
        "enabled_by_default": enabled,
        "condition_type": condition_type,
        "condition_config_json": json.dumps(condition_config) if condition_config else None,
        "content_template": content,
        "admin_override_template": admin_override,
        "status": status,
        "module_scope": module_scope,
        "provider_scope": provider_scope,
        "version": 1,
        "source_kind": "builtin_default",
    }


# Mock trace_service to avoid DB dependency in unit tests
@pytest.fixture(autouse=True)
def mock_trace_service():
    """Prevent DB writes during unit tests."""
    mock_run = AsyncMock()
    mock_run.return_value = type("FakeRun", (), {"id": "test-run-id"})()
    with patch("app.prompt_assembly.assembly_service.trace_service.create_assembly_run", mock_run):
        yield mock_run


@pytest.fixture
def service():
    return PromptAssemblyService()


@pytest.mark.asyncio
async def test_basic_assembly(service):
    blocks = [
        _block("system", kind="core_system", order=0, content="You are a helper."),
        _block("contract", kind="output_contract", order=100, content="Output JSON."),
    ]
    result = await service.assemble(
        db=AsyncMock(),
        module_scope="news_bulletin",
        step_key="script",
        provider_name="kie_ai",
        settings_snapshot={},
        block_snapshot=blocks,
        data_snapshot={},
        user_content="Test input",
    )
    assert isinstance(result, AssemblyResult)
    assert "You are a helper." in result.final_prompt_text
    assert "Output JSON." in result.final_prompt_text
    assert len(result.included_blocks) == 2
    assert len(result.skipped_blocks) == 0


@pytest.mark.asyncio
async def test_condition_skips_block(service):
    blocks = [
        _block("system", kind="core_system", order=0, content="System."),
        _block("normalize", order=10, condition_type="settings_boolean",
               condition_config={"settings_key": "normalize_enabled"}, content="Normalize rules."),
    ]
    result = await service.assemble(
        db=AsyncMock(),
        module_scope="news_bulletin",
        step_key="script",
        provider_name="kie_ai",
        settings_snapshot={"normalize_enabled": False},
        block_snapshot=blocks,
        data_snapshot={},
    )
    assert len(result.included_blocks) == 1
    assert len(result.skipped_blocks) == 1
    assert result.skipped_blocks[0].block_key == "normalize"
    assert result.skipped_blocks[0].reason_code == "skipped_by_setting"


@pytest.mark.asyncio
async def test_template_rendering_with_data(service):
    blocks = [
        _block("context", kind="context_block", order=0,
               condition_type="data_presence",
               condition_config={"data_key": "category"},
               content="Kategori: {{category}}"),
    ]
    result = await service.assemble(
        db=AsyncMock(),
        module_scope="news_bulletin",
        step_key="script",
        provider_name="kie_ai",
        settings_snapshot={},
        block_snapshot=blocks,
        data_snapshot={"category": "gundem"},
    )
    assert len(result.included_blocks) == 1
    assert result.included_blocks[0].rendered_text == "Kategori: gundem"


@pytest.mark.asyncio
async def test_determinism(service):
    """Same snapshots must produce same final prompt — 3 times."""
    blocks = [
        _block("a", order=0, content="First."),
        _block("b", order=10, content="Second."),
        _block("c", order=20, condition_type="settings_boolean",
               condition_config={"settings_key": "c_enabled"}, content="Third."),
    ]
    settings = {"c_enabled": True}
    data = {}

    results = []
    for _ in range(3):
        r = await service.assemble(
            db=AsyncMock(),
            module_scope="test",
            step_key="script",
            provider_name="kie_ai",
            settings_snapshot=settings,
            block_snapshot=blocks,
            data_snapshot=data,
        )
        results.append(r.final_prompt_text)

    assert results[0] == results[1] == results[2]


@pytest.mark.asyncio
async def test_order_stability(service):
    blocks = [
        _block("c", order=20, content="C."),
        _block("a", order=0, content="A."),
        _block("b", order=10, content="B."),
    ]
    result = await service.assemble(
        db=AsyncMock(),
        module_scope="test",
        step_key="script",
        provider_name="kie_ai",
        settings_snapshot={},
        block_snapshot=blocks,
        data_snapshot={},
    )
    assert result.final_prompt_text == "A.\n\nB.\n\nC."


@pytest.mark.asyncio
async def test_module_scope_filtering(service):
    blocks = [
        _block("global", order=0, content="Global.", module_scope=None),
        _block("nb_only", order=10, content="NB.", module_scope="news_bulletin"),
        _block("sv_only", order=20, content="SV.", module_scope="standard_video"),
    ]
    result = await service.assemble(
        db=AsyncMock(),
        module_scope="news_bulletin",
        step_key="script",
        provider_name="kie_ai",
        settings_snapshot={},
        block_snapshot=blocks,
        data_snapshot={},
    )
    keys = [b.block_key for b in result.included_blocks]
    assert "global" in keys
    assert "nb_only" in keys
    assert "sv_only" not in keys


@pytest.mark.asyncio
async def test_payload_has_messages(service):
    blocks = [_block("sys", order=0, content="System prompt.")]
    result = await service.assemble(
        db=AsyncMock(),
        module_scope="test",
        step_key="script",
        provider_name="kie_ai",
        settings_snapshot={},
        block_snapshot=blocks,
        data_snapshot={},
        user_content="User input here",
        model="gemini-2.5-flash",
    )
    payload = result.final_payload
    assert payload["messages"][0]["role"] == "system"
    assert "System prompt." in payload["messages"][0]["content"]
    assert payload["messages"][1]["role"] == "user"
    assert payload["messages"][1]["content"] == "User input here"
    assert payload["model"] == "gemini-2.5-flash"
```

- [ ] **Step 5: Run tests**

Run: `cd /Users/huseyincoskun/Downloads/AntigravityProje/ContentHub/backend && python -m pytest tests/test_assembly_service.py -v --tb=short`

Expected: All 7 tests PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/prompt_assembly/assembly_service.py backend/app/prompt_assembly/trace_service.py backend/app/prompt_assembly/payload_builder.py backend/tests/test_assembly_service.py
git commit -m "feat(prompt-assembly): implement AssemblyService, TraceService, PayloadBuilder + 7 assembly tests"
```

---

## Task 8: Block Seed Data (news_bulletin pilot)

**Files:**
- Create: `backend/app/prompt_assembly/block_seed.py`

- [ ] **Step 1: Write seed with builtin block definitions**

Create `backend/app/prompt_assembly/block_seed.py`:
```python
"""Builtin prompt block definitions and seed function.

Seeds blocks idempotently — existing blocks are not overwritten.
Admin overrides are preserved.
"""

import json
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.prompt_assembly.models import PromptBlock

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════
# NEWS BULLETIN — SCRIPT STEP
# ═══════════════════════════════════════════

BUILTIN_BLOCKS: list[dict] = [
    {
        "key": "nb.narration_system",
        "title": "Narration System Prompt",
        "module_scope": "news_bulletin",
        "group_name": "core",
        "kind": "core_system",
        "order_index": 0,
        "enabled_by_default": True,
        "condition_type": "always",
        "content_template": (
            "Sen profesyonel bir TV haber spikerisin. Sana verilen haber ozetlerini kisa, net, resmi ve "
            "konusulabilir bir dilde yeniden yaz. Her haber 40-80 kelime arasinda olmali. Turkce formal "
            "broadcast dilini kullan. Cevrilmis metin hissi verme."
        ),
        "help_text": "Ana sistem talimati — her zaman dahil edilir, devre disi birakilamaz.",
    },
    {
        "key": "nb.narration_style",
        "title": "Narration Stil Kurallari",
        "module_scope": "news_bulletin",
        "group_name": "core",
        "kind": "module_instruction",
        "order_index": 10,
        "enabled_by_default": True,
        "condition_type": "always",
        "content_template": (
            "Kurallar:\n"
            "- Kisa cumleler kullan, max 15 kelime per cumle\n"
            "- Aktif cumle yapisi tercih et\n"
            "- Teknik jargon kullanma\n"
            "- Resmi ama soguk olmayan ton\n"
            "- Her haberi bagimsiz anlat, onceki habere referans verme\n"
            "- Kapanisi temiz bitir, 'devam edecek' gibi ifadeler kullanma"
        ),
        "help_text": "Narration stil ve dil kurallari.",
    },
    {
        "key": "nb.anti_clickbait",
        "title": "Anti-Clickbait Kurallari",
        "module_scope": "news_bulletin",
        "group_name": "behavior",
        "kind": "behavior_block",
        "order_index": 20,
        "enabled_by_default": True,
        "condition_type": "settings_boolean",
        "condition_config_json": json.dumps({"settings_key": "news_bulletin.config.anti_clickbait_enabled"}),
        "content_template": (
            "Yasaklar:\n"
            "- Clickbait basliklar kullanma\n"
            "- 'Inanilmaz', 'sok edici', 'merak edilen' gibi abartili ifadeler yasak\n"
            "- Kaynak adini, muhabir adini, byline bilgisini tekrarlama\n"
            "- 'According to' kaliplarini kullanma\n"
            "- Soru formunda baslik kullanma"
        ),
        "help_text": "Clickbait engelleme kurallari. anti_clickbait_enabled ayariyla kontrol edilir.",
    },
    {
        "key": "nb.normalize",
        "title": "Normalizasyon Blogu",
        "module_scope": "news_bulletin",
        "group_name": "behavior",
        "kind": "behavior_block",
        "order_index": 30,
        "enabled_by_default": True,
        "condition_type": "settings_boolean",
        "condition_config_json": json.dumps({"settings_key": "news_bulletin.config.normalize_enabled"}),
        "content_template": (
            "Haber basliklarini ve iceriklerini normalize et:\n"
            "- Tamamen buyuk harf yazilmis basiklari normal hale getir\n"
            "- Gereksiz noktalama isaretlerini temizle\n"
            "- Abartili vurgu kaliplarini duzenle"
        ),
        "help_text": "Baslik/icerik normalizasyon kurallari. normalize_enabled ayariyla kontrol edilir.",
    },
    {
        "key": "nb.humanizer",
        "title": "Humanizer Blogu",
        "module_scope": "news_bulletin",
        "group_name": "behavior",
        "kind": "behavior_block",
        "order_index": 40,
        "enabled_by_default": False,
        "condition_type": "settings_boolean",
        "condition_config_json": json.dumps({"settings_key": "news_bulletin.config.humanize_enabled"}),
        "content_template": (
            "Metni daha insansi ve dogal hale getir:\n"
            "- Mekanik cumle yapilarindan kacin\n"
            "- Dogal gecisler kullan\n"
            "- Dinleyiciye hitap eden ton ekle"
        ),
        "help_text": "Insansi dil zenginlestirme. humanize_enabled ayariyla kontrol edilir. Varsayilan kapali.",
    },
    {
        "key": "nb.tts_enhance",
        "title": "TTS Uyumluluk Blogu",
        "module_scope": "news_bulletin",
        "group_name": "behavior",
        "kind": "behavior_block",
        "order_index": 50,
        "enabled_by_default": True,
        "condition_type": "settings_boolean",
        "condition_config_json": json.dumps({"settings_key": "news_bulletin.config.tts_enhance_enabled"}),
        "content_template": (
            "TTS (text-to-speech) uyumluluk kurallari:\n"
            "- Kisaltma kullanma, tam yaz\n"
            "- Rakamlar varsa yazi ile yaz (orn: '3 kisi' yerine 'uc kisi')\n"
            "- Parantez icinde aciklama yapma\n"
            "- Okunabilir, dogal konusma ritmine uygun cumleler kur"
        ),
        "help_text": "TTS uyumluluk talimatlari. tts_enhance_enabled ayariyla kontrol edilir.",
    },
    {
        "key": "nb.category_guidance",
        "title": "Kategori Yonlendirme",
        "module_scope": "news_bulletin",
        "group_name": "context",
        "kind": "context_block",
        "order_index": 60,
        "enabled_by_default": True,
        "condition_type": "data_presence",
        "condition_config_json": json.dumps({"data_key": "dominant_category"}),
        "content_template": "Bu bultendeki baskin kategori: {{dominant_category}}. Ton ve terminolojiyi buna gore ayarla.",
        "help_text": "Baskin haber kategorisine gore ton ayarlama. Kategori verisi varsa otomatik eklenir.",
    },
    {
        "key": "nb.selected_news_summary",
        "title": "Secilen Haberler",
        "module_scope": "news_bulletin",
        "group_name": "context",
        "kind": "context_block",
        "order_index": 70,
        "enabled_by_default": True,
        "condition_type": "data_presence",
        "condition_config_json": json.dumps({"data_key": "selected_news_items"}),
        "content_template": "{{selected_news_items}}",
        "help_text": "Secilen haber listesi. Haberler secilmisse otomatik eklenir.",
    },
    {
        "key": "nb.output_contract",
        "title": "Cikti Format Sozlesmesi",
        "module_scope": "news_bulletin",
        "group_name": "output",
        "kind": "output_contract",
        "order_index": 100,
        "enabled_by_default": True,
        "condition_type": "always",
        "content_template": (
            "CIKTI FORMATI (JSON):\n"
            '{"items": [{"item_number": 1, "headline": "...", "narration": "...", "duration_seconds": N}], '
            '"transitions": ["..."], "total_duration_seconds": N}\n\n'
            "YALNIZCA gecerli JSON don. Baska aciklama ekleme."
        ),
        "help_text": "JSON cikti format sozlesmesi — her zaman dahil edilir, devre disi birakilamaz.",
    },
    # ═══════════════════════════════════════════
    # NEWS BULLETIN — METADATA STEP
    # ═══════════════════════════════════════════
    {
        "key": "nb.metadata_system",
        "title": "Metadata System Prompt",
        "module_scope": "news_bulletin",
        "group_name": "core",
        "kind": "core_system",
        "order_index": 0,
        "enabled_by_default": True,
        "condition_type": "always",
        "content_template": (
            "Sen bir YouTube icerik uzmanisin. Verilen haber bulteni icin YouTube metadata uret."
        ),
        "help_text": "Metadata uretimi icin ana sistem talimati.",
    },
    {
        "key": "nb.metadata_title_rules",
        "title": "Metadata Baslik Kurallari",
        "module_scope": "news_bulletin",
        "group_name": "core",
        "kind": "module_instruction",
        "order_index": 10,
        "enabled_by_default": True,
        "condition_type": "always",
        "content_template": (
            "Bulten icin YouTube metadata uret:\n"
            "- Baslik: max 60 karakter, bilgilendirici, clickbait degil\n"
            "- Aciklama: 2-3 cumle, bultendeki haberlerin ozeti\n"
            "- Etiketler: 5-10 adet, Turkce, hem genel hem habere ozel\n"
            "- Hashtag: 3-5 adet, #haber #gundem formatinda"
        ),
        "help_text": "YouTube metadata uretim kurallari.",
    },
    {
        "key": "nb.metadata_output_contract",
        "title": "Metadata Cikti Sozlesmesi",
        "module_scope": "news_bulletin",
        "group_name": "output",
        "kind": "output_contract",
        "order_index": 100,
        "enabled_by_default": True,
        "condition_type": "always",
        "content_template": (
            "CIKTI FORMATI (JSON):\n"
            '{"title": "...", "description": "...", "tags": ["..."], "hashtags": ["..."], "language": "tr"}\n\n'
            "YALNIZCA gecerli JSON don."
        ),
        "help_text": "Metadata JSON cikti format sozlesmesi.",
    },
]


async def seed_prompt_blocks(db: AsyncSession) -> int:
    """Seed all builtin prompt blocks. Idempotent — skips existing keys.

    Returns:
        Count of newly created blocks.
    """
    created = 0

    for block_def in BUILTIN_BLOCKS:
        key = block_def["key"]
        result = await db.execute(select(PromptBlock).where(PromptBlock.key == key))
        existing = result.scalar_one_or_none()

        if existing is not None:
            continue

        row = PromptBlock(
            key=key,
            title=block_def["title"],
            module_scope=block_def.get("module_scope"),
            provider_scope=block_def.get("provider_scope"),
            group_name=block_def.get("group_name", "core"),
            kind=block_def["kind"],
            order_index=block_def.get("order_index", 0),
            enabled_by_default=block_def.get("enabled_by_default", True),
            condition_type=block_def.get("condition_type", "always"),
            condition_config_json=block_def.get("condition_config_json"),
            content_template=block_def["content_template"],
            help_text=block_def.get("help_text"),
            visible_in_admin=True,
            status="active",
            source_kind="seeded_system",
        )
        db.add(row)
        created += 1
        logger.debug("PromptBlock seed: new block — %s", key)

    if created > 0:
        await db.commit()

    logger.info("PromptBlock seed: %d new blocks created", created)
    return created
```

- [ ] **Step 2: Verify import**

Run: `cd /Users/huseyincoskun/Downloads/AntigravityProje/ContentHub/backend && python -c "from app.prompt_assembly.block_seed import BUILTIN_BLOCKS, seed_prompt_blocks; print(f'OK: {len(BUILTIN_BLOCKS)} blocks defined')"`

Expected: `OK: 12 blocks defined`

- [ ] **Step 3: Commit**

```bash
git add backend/app/prompt_assembly/block_seed.py
git commit -m "feat(prompt-assembly): add builtin block seed data for news_bulletin (12 blocks)"
```

---

## Task 9: API Router

**Files:**
- Create: `backend/app/prompt_assembly/router.py`
- Modify: `backend/app/main.py` (register router)

- [ ] **Step 1: Write router**

Create `backend/app/prompt_assembly/router.py`:
```python
"""Prompt Assembly Engine API endpoints."""

import json
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.prompt_assembly import service, trace_service
from app.prompt_assembly.schemas import (
    AssemblyPreviewRequest,
    AssemblyPreviewResponse,
    AssemblyRunDetailResponse,
    AssemblyRunResponse,
    BlockTraceResponse,
    PromptBlockCreate,
    PromptBlockResponse,
    PromptBlockUpdate,
)
from app.prompt_assembly.assembly_service import PromptAssemblyService
from app.settings.settings_resolver import resolve_group

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/prompt-assembly",
    tags=["prompt-assembly"],
)

_assembly_service = PromptAssemblyService()


# ── PromptBlock CRUD ──


@router.get("/blocks", response_model=List[PromptBlockResponse])
async def list_blocks(
    module_scope: Optional[str] = Query(None),
    provider_scope: Optional[str] = Query(None),
    status_filter: str = Query("active"),
    db: AsyncSession = Depends(get_db),
):
    blocks = await service.list_blocks(db, module_scope, provider_scope, status_filter)
    result = []
    for b in blocks:
        d = PromptBlockResponse.model_validate(b)
        d.effective_template = b.effective_template()
        result.append(d)
    return result


@router.get("/blocks/{block_id}", response_model=PromptBlockResponse)
async def get_block(
    block_id: str,
    db: AsyncSession = Depends(get_db),
):
    b = await service.get_block(db, block_id)
    resp = PromptBlockResponse.model_validate(b)
    resp.effective_template = b.effective_template()
    return resp


@router.post("/blocks", response_model=PromptBlockResponse, status_code=status.HTTP_201_CREATED)
async def create_block(
    payload: PromptBlockCreate,
    db: AsyncSession = Depends(get_db),
):
    b = await service.create_block(db, payload)
    resp = PromptBlockResponse.model_validate(b)
    resp.effective_template = b.effective_template()
    return resp


@router.patch("/blocks/{block_id}", response_model=PromptBlockResponse)
async def update_block(
    block_id: str,
    payload: PromptBlockUpdate,
    db: AsyncSession = Depends(get_db),
):
    b = await service.update_block(db, block_id, payload)
    resp = PromptBlockResponse.model_validate(b)
    resp.effective_template = b.effective_template()
    return resp


# ── Assembly Preview (Dry Run) ──


@router.post("/preview", response_model=AssemblyPreviewResponse)
async def preview_assembly(
    payload: AssemblyPreviewRequest,
    db: AsyncSession = Depends(get_db),
):
    """Dry-run assembly: builds final prompt without calling provider."""

    # Get effective blocks from DB
    blocks = await service.get_effective_blocks(db, payload.module_scope)
    block_snapshot = [b.to_snapshot_dict() for b in blocks]

    # Get effective settings
    settings_snapshot = await resolve_group(db, payload.module_scope)
    if payload.settings_overrides:
        settings_snapshot.update(payload.settings_overrides)

    # Data snapshot
    data_snapshot = payload.data_overrides or {}
    data_source = "sample_input" if payload.data_overrides else "job_context"

    # Determine provider
    provider_name = payload.provider_name or "kie_ai_gemini_flash"

    result = await _assembly_service.assemble(
        db,
        module_scope=payload.module_scope,
        step_key=payload.step_key,
        provider_name=provider_name,
        settings_snapshot=settings_snapshot,
        block_snapshot=block_snapshot,
        data_snapshot=data_snapshot,
        user_content=payload.user_content or "",
        is_dry_run=True,
        data_source=data_source,
    )

    return AssemblyPreviewResponse(
        assembly_run_id=result.assembly_run_id or "",
        is_dry_run=True,
        data_source=data_source,
        final_prompt_text=result.final_prompt_text,
        final_payload=result.final_payload,
        included_blocks=[
            BlockTraceResponse(
                block_key=b.block_key,
                block_title=b.block_title,
                block_kind=b.block_kind,
                order_index=b.order_index,
                included=True,
                reason_code=b.reason_code,
                reason_text=b.reason_text,
                evaluated_condition_type=b.evaluated_condition_type,
                evaluated_condition_key=b.evaluated_condition_key,
                evaluated_condition_value=b.evaluated_condition_value,
                rendered_text=b.rendered_text,
                used_variables_json=json.dumps(b.used_variables) if b.used_variables else None,
                missing_variables_json=json.dumps(b.missing_variables) if b.missing_variables else None,
            )
            for b in result.included_blocks
        ],
        skipped_blocks=[
            BlockTraceResponse(
                block_key=b.block_key,
                block_title=b.block_title,
                block_kind=b.block_kind,
                order_index=b.order_index,
                included=False,
                reason_code=b.reason_code,
                reason_text=b.reason_text,
                evaluated_condition_type=b.evaluated_condition_type,
                evaluated_condition_key=b.evaluated_condition_key,
                evaluated_condition_value=b.evaluated_condition_value,
                rendered_text=None,
                used_variables_json=None,
                missing_variables_json=json.dumps(b.missing_variables) if b.missing_variables else None,
            )
            for b in result.skipped_blocks
        ],
        settings_snapshot_summary=settings_snapshot,
        data_snapshot_summary=data_snapshot,
    )


# ── Assembly Run Traces (for Job Detail) ──


@router.get("/traces/job/{job_id}", response_model=List[AssemblyRunResponse])
async def list_traces_for_job(
    job_id: str,
    db: AsyncSession = Depends(get_db),
):
    runs = await trace_service.get_assembly_runs_for_job(db, job_id)
    return [AssemblyRunResponse.model_validate(r) for r in runs]


@router.get("/traces/{run_id}", response_model=AssemblyRunDetailResponse)
async def get_trace_detail(
    run_id: str,
    db: AsyncSession = Depends(get_db),
):
    run = await trace_service.get_assembly_run_detail(db, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Assembly run not found.")

    return AssemblyRunDetailResponse(
        **{c.name: getattr(run, c.name) for c in run.__table__.columns},
        block_traces=[BlockTraceResponse.model_validate(bt) for bt in run.block_traces],
    )
```

- [ ] **Step 2: Register router in main.py**

Find the router registration section in `backend/app/main.py` and add:
```python
from app.prompt_assembly.router import router as prompt_assembly_router
app.include_router(prompt_assembly_router, prefix="/api/v1")
```

- [ ] **Step 3: Wire seed into startup**

In `backend/app/main.py`, find the startup/lifespan function and add after existing seeds:
```python
from app.prompt_assembly.block_seed import seed_prompt_blocks
# Inside startup:
await seed_prompt_blocks(db)
```

- [ ] **Step 4: Verify endpoints register**

Run: `cd /Users/huseyincoskun/Downloads/AntigravityProje/ContentHub/backend && python -c "from app.main import app; routes = [r.path for r in app.routes if hasattr(r, 'path')]; print([r for r in routes if 'prompt' in r])"`

Expected: List containing `/api/v1/prompt-assembly/blocks`, `/api/v1/prompt-assembly/preview`, etc.

- [ ] **Step 5: Commit**

```bash
git add backend/app/prompt_assembly/router.py backend/app/main.py
git commit -m "feat(prompt-assembly): add API router (blocks CRUD, preview, traces) + register in app"
```

---

## Task 10: API Integration Tests

**Files:**
- Create: `backend/tests/test_prompt_assembly_api.py`

- [ ] **Step 1: Write integration tests**

Create `backend/tests/test_prompt_assembly_api.py`:
```python
"""Integration tests for Prompt Assembly API endpoints."""

import json
import pytest
from httpx import AsyncClient

BASE = "/api/v1/prompt-assembly"


@pytest.mark.asyncio
async def test_list_blocks_empty(client: AsyncClient):
    """Before seed, may return seeded blocks."""
    resp = await client.get(f"{BASE}/blocks")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_create_block(client: AsyncClient):
    payload = {
        "key": "test.block.api",
        "title": "API Test Block",
        "kind": "behavior_block",
        "content_template": "Test content with {{variable}}",
        "module_scope": "news_bulletin",
        "order_index": 50,
    }
    resp = await client.post(f"{BASE}/blocks", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["key"] == "test.block.api"
    assert data["kind"] == "behavior_block"
    assert data["effective_template"] == "Test content with {{variable}}"
    assert data["source_kind"] == "builtin_default"


@pytest.mark.asyncio
async def test_update_block_admin_override(client: AsyncClient):
    # Create first
    create_resp = await client.post(f"{BASE}/blocks", json={
        "key": "test.block.override",
        "title": "Override Test",
        "kind": "behavior_block",
        "content_template": "Original content",
    })
    block_id = create_resp.json()["id"]

    # Update with admin override
    update_resp = await client.patch(f"{BASE}/blocks/{block_id}", json={
        "admin_override_template": "Admin modified content",
    })
    assert update_resp.status_code == 200
    data = update_resp.json()
    assert data["admin_override_template"] == "Admin modified content"
    assert data["effective_template"] == "Admin modified content"
    assert data["source_kind"] == "admin_override"
    assert data["version"] == 2


@pytest.mark.asyncio
async def test_protected_block_cannot_disable(client: AsyncClient):
    create_resp = await client.post(f"{BASE}/blocks", json={
        "key": "test.core.protected",
        "title": "Protected Core",
        "kind": "core_system",
        "content_template": "System instruction",
    })
    block_id = create_resp.json()["id"]

    update_resp = await client.patch(f"{BASE}/blocks/{block_id}", json={
        "status": "disabled",
    })
    assert update_resp.status_code == 422


@pytest.mark.asyncio
async def test_preview_dry_run(client: AsyncClient):
    # Create a block first
    await client.post(f"{BASE}/blocks", json={
        "key": "test.preview.system",
        "title": "Preview System",
        "kind": "core_system",
        "content_template": "You are a helper for {{topic}}.",
        "module_scope": "news_bulletin",
        "order_index": 0,
    })

    resp = await client.post(f"{BASE}/preview", json={
        "module_scope": "news_bulletin",
        "step_key": "script",
        "data_overrides": {"topic": "technology"},
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_dry_run"] is True
    assert data["data_source"] == "sample_input"
    assert "technology" in data["final_prompt_text"]
    assert len(data["included_blocks"]) >= 1
```

- [ ] **Step 2: Run tests**

Run: `cd /Users/huseyincoskun/Downloads/AntigravityProje/ContentHub/backend && python -m pytest tests/test_prompt_assembly_api.py -v --tb=short`

Expected: All 5 tests PASS

- [ ] **Step 3: Commit**

```bash
git add backend/tests/test_prompt_assembly_api.py
git commit -m "test(prompt-assembly): add 5 API integration tests (CRUD, protection, preview)"
```

---

## Task 11: Frontend API Client + Hooks

**Files:**
- Create: `frontend/src/api/promptAssemblyApi.ts`
- Create: `frontend/src/hooks/usePromptBlocks.ts`
- Create: `frontend/src/hooks/usePromptAssemblyPreview.ts`
- Create: `frontend/src/hooks/usePromptTrace.ts`

- [ ] **Step 1: Write API client**

Create `frontend/src/api/promptAssemblyApi.ts`:
```typescript
import { api } from "./client";

const BASE = "/api/v1/prompt-assembly";

// ── Types ──

export interface PromptBlockResponse {
  id: string;
  key: string;
  title: string;
  module_scope: string | null;
  provider_scope: string | null;
  group_name: string;
  kind: string;
  order_index: number;
  enabled_by_default: boolean;
  condition_type: string;
  condition_config_json: string | null;
  content_template: string;
  admin_override_template: string | null;
  effective_template: string;
  help_text: string | null;
  visible_in_admin: boolean;
  status: string;
  version: number;
  source_kind: string;
  created_at: string;
  updated_at: string;
}

export interface PromptBlockUpdatePayload {
  title?: string;
  admin_override_template?: string | null;
  status?: string;
  order_index?: number;
  enabled_by_default?: boolean;
  help_text?: string;
}

export interface BlockTraceResponse {
  block_key: string;
  block_title: string;
  block_kind: string;
  order_index: number;
  included: boolean;
  reason_code: string;
  reason_text: string;
  evaluated_condition_type: string;
  evaluated_condition_key: string | null;
  evaluated_condition_value: string | null;
  rendered_text: string | null;
  used_variables_json: string | null;
  missing_variables_json: string | null;
}

export interface AssemblyPreviewRequest {
  module_scope: string;
  step_key?: string;
  provider_name?: string;
  data_overrides?: Record<string, unknown>;
  settings_overrides?: Record<string, unknown>;
  user_content?: string;
}

export interface AssemblyPreviewResponse {
  assembly_run_id: string;
  is_dry_run: boolean;
  data_source: string;
  final_prompt_text: string;
  final_payload: Record<string, unknown>;
  included_blocks: BlockTraceResponse[];
  skipped_blocks: BlockTraceResponse[];
  settings_snapshot_summary: Record<string, unknown>;
  data_snapshot_summary: Record<string, unknown>;
}

export interface AssemblyRunResponse {
  id: string;
  job_id: string | null;
  step_key: string | null;
  module_scope: string;
  provider_name: string;
  provider_type: string;
  final_prompt_text: string;
  final_payload_json: string;
  provider_response_json: string | null;
  provider_error_json: string | null;
  included_block_keys_json: string;
  skipped_block_keys_json: string;
  block_count_included: number;
  block_count_skipped: number;
  is_dry_run: boolean;
  data_source: string;
  created_at: string;
}

export interface AssemblyRunDetailResponse extends AssemblyRunResponse {
  settings_snapshot_json: string;
  prompt_snapshot_json: string;
  data_snapshot_json: string;
  block_traces: BlockTraceResponse[];
}

// ── API calls ──

export function fetchPromptBlocks(
  moduleScope?: string
): Promise<PromptBlockResponse[]> {
  const params = moduleScope ? `?module_scope=${moduleScope}` : "";
  return api.get<PromptBlockResponse[]>(`${BASE}/blocks${params}`);
}

export function fetchPromptBlock(id: string): Promise<PromptBlockResponse> {
  return api.get<PromptBlockResponse>(`${BASE}/blocks/${id}`);
}

export function updatePromptBlock(
  id: string,
  payload: PromptBlockUpdatePayload
): Promise<PromptBlockResponse> {
  return api.patch<PromptBlockResponse>(`${BASE}/blocks/${id}`, payload);
}

export function previewAssembly(
  payload: AssemblyPreviewRequest
): Promise<AssemblyPreviewResponse> {
  return api.post<AssemblyPreviewResponse>(`${BASE}/preview`, payload);
}

export function fetchAssemblyTracesForJob(
  jobId: string
): Promise<AssemblyRunResponse[]> {
  return api.get<AssemblyRunResponse[]>(`${BASE}/traces/job/${jobId}`);
}

export function fetchAssemblyRunDetail(
  runId: string
): Promise<AssemblyRunDetailResponse> {
  return api.get<AssemblyRunDetailResponse>(`${BASE}/traces/${runId}`);
}
```

- [ ] **Step 2: Write hooks**

Create `frontend/src/hooks/usePromptBlocks.ts`:
```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchPromptBlocks,
  updatePromptBlock,
  type PromptBlockUpdatePayload,
} from "../api/promptAssemblyApi";

export function usePromptBlocksList(moduleScope?: string) {
  return useQuery({
    queryKey: ["prompt-blocks", moduleScope],
    queryFn: () => fetchPromptBlocks(moduleScope),
  });
}

export function useUpdatePromptBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: PromptBlockUpdatePayload }) =>
      updatePromptBlock(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompt-blocks"] });
    },
  });
}
```

Create `frontend/src/hooks/usePromptAssemblyPreview.ts`:
```typescript
import { useMutation } from "@tanstack/react-query";
import { previewAssembly, type AssemblyPreviewRequest } from "../api/promptAssemblyApi";

export function usePromptAssemblyPreview() {
  return useMutation({
    mutationFn: (payload: AssemblyPreviewRequest) => previewAssembly(payload),
  });
}
```

Create `frontend/src/hooks/usePromptTrace.ts`:
```typescript
import { useQuery } from "@tanstack/react-query";
import {
  fetchAssemblyTracesForJob,
  fetchAssemblyRunDetail,
} from "../api/promptAssemblyApi";

export function usePromptTracesForJob(jobId: string | null) {
  return useQuery({
    queryKey: ["prompt-traces", "job", jobId],
    queryFn: () => fetchAssemblyTracesForJob(jobId!),
    enabled: !!jobId,
  });
}

export function usePromptTraceDetail(runId: string | null) {
  return useQuery({
    queryKey: ["prompt-traces", "detail", runId],
    queryFn: () => fetchAssemblyRunDetail(runId!),
    enabled: !!runId,
  });
}
```

- [ ] **Step 3: Type check**

Run: `cd /Users/huseyincoskun/Downloads/AntigravityProje/ContentHub/frontend && npx tsc --noEmit 2>&1 | tail -5`

Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/api/promptAssemblyApi.ts frontend/src/hooks/usePromptBlocks.ts frontend/src/hooks/usePromptAssemblyPreview.ts frontend/src/hooks/usePromptTrace.ts
git commit -m "feat(prompt-assembly): add frontend API client and React Query hooks"
```

---

## Task 12: Frontend — Prompt Block Management Components

**Files:**
- Create: `frontend/src/components/prompt-assembly/PromptBlockCard.tsx`
- Create: `frontend/src/components/prompt-assembly/PromptBlockList.tsx`
- Create: `frontend/src/components/prompt-assembly/PromptBlockDetailPanel.tsx`
- Create: `frontend/src/components/prompt-assembly/RelatedRulesSection.tsx`

This task creates the 4 core UI components for the Prompt Editor page extension. Each component follows ContentHub's design system (semantic tokens, SectionShell, Sheet patterns).

**Implementation guidance for the agentic worker:**

- Read `frontend/src/pages/admin/PromptEditorPage.tsx` to understand the existing prompt editor structure
- Read `frontend/src/components/design-system/primitives.tsx` for `SectionShell`, `ActionButton`, `StatusBadge` patterns
- Read `frontend/src/components/design-system/Sheet.tsx` for side-panel patterns
- Use only semantic token classes (`bg-surface-card`, `text-neutral-900`, `border-border-subtle`, etc.)
- Follow the existing card/list pattern from `frontend/src/components/settings/SettingRow.tsx`

- [ ] **Step 1: Create PromptBlockCard**

Create `frontend/src/components/prompt-assembly/PromptBlockCard.tsx` — a single block summary card showing: key, title, kind badge, order_index, condition summary, status badge, effective text preview (first 2 lines), source_kind badge, [Edit] action. Use `bg-surface-card`, `border-border-subtle`, `rounded-lg`. Kind badge uses `StatusBadge` pattern. Clicking opens detail panel.

- [ ] **Step 2: Create PromptBlockList**

Create `frontend/src/components/prompt-assembly/PromptBlockList.tsx` — renders a sorted list of `PromptBlockCard` components. Accepts `moduleScope` filter prop. Uses `usePromptBlocksList(moduleScope)`. Groups by `group_name` with section headers ("Core", "Behavior", "Context", "Output"). Shows loading skeleton while fetching.

- [ ] **Step 3: Create PromptBlockDetailPanel**

Create `frontend/src/components/prompt-assembly/PromptBlockDetailPanel.tsx` — Sheet-based side panel for editing a single block. Shows: full content_template (read-only), admin_override_template (editable textarea), condition detail, help_text, version, status. Actions: Save override, Reset to default, Disable (disabled for protected kinds). Uses `useUpdatePromptBlock` mutation.

- [ ] **Step 4: Create RelatedRulesSection**

Create `frontend/src/components/prompt-assembly/RelatedRulesSection.tsx` — `SectionShell` showing assembly-affecting settings from the current module. Fetches effective settings via `useEffectiveSettings()`, filters to config keys matching the selected module scope (e.g., `news_bulletin.config.*`). Each row: setting key, current value with checkmark/cross icon, tooltip showing which blocks are affected, link to Settings Registry.

- [ ] **Step 5: Type check**

Run: `cd /Users/huseyincoskun/Downloads/AntigravityProje/ContentHub/frontend && npx tsc --noEmit 2>&1 | tail -5`

Expected: 0 errors

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/prompt-assembly/
git commit -m "feat(prompt-assembly): add block management UI components (card, list, detail panel, related rules)"
```

---

## Task 13: Frontend — Preview Section + Block Breakdown

**Files:**
- Create: `frontend/src/components/prompt-assembly/PromptPreviewSection.tsx`
- Create: `frontend/src/components/prompt-assembly/BlockBreakdownView.tsx`

- [ ] **Step 1: Create BlockBreakdownView**

Create `frontend/src/components/prompt-assembly/BlockBreakdownView.tsx` — renders the block-by-block assembly breakdown. Two sections: included blocks (green check icon) and skipped blocks (red X icon). Each block row shows: order badge, block_key, kind badge, reason_text, and for included blocks a collapsible rendered_text preview. Uses semantic tokens only.

- [ ] **Step 2: Create PromptPreviewSection**

Create `frontend/src/components/prompt-assembly/PromptPreviewSection.tsx` — inline preview section with: module select, step_key select ("script" | "metadata"), optional data overrides textarea (JSON), optional settings overrides textarea (JSON), "Preview Olustur" button. Results show: Assembled Prompt (collapsible, with copy button), BlockBreakdownView, Provider Payload (collapsible JSON, with copy button), Data Inputs summary, Settings Inputs summary. Clear "Assembly Preview" label. Uses `usePromptAssemblyPreview` mutation.

- [ ] **Step 3: Type check**

Run: `cd /Users/huseyincoskun/Downloads/AntigravityProje/ContentHub/frontend && npx tsc --noEmit 2>&1 | tail -5`

Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/prompt-assembly/PromptPreviewSection.tsx frontend/src/components/prompt-assembly/BlockBreakdownView.tsx
git commit -m "feat(prompt-assembly): add preview section and block breakdown view components"
```

---

## Task 14: Frontend — Extend PromptEditorPage

**Files:**
- Modify: `frontend/src/pages/admin/PromptEditorPage.tsx`

- [ ] **Step 1: Read current PromptEditorPage**

Read `frontend/src/pages/admin/PromptEditorPage.tsx` to understand the full current structure before modifying.

- [ ] **Step 2: Extend with block management**

Modify `PromptEditorPage.tsx` to add three new sections below the existing prompt text editors:

1. **Module filter tabs** at the top — filter by news_bulletin / standard_video / all
2. **Prompt Blocks section** — `PromptBlockList` component with module filter
3. **Related Rules section** — `RelatedRulesSection` component
4. **Preview section** — `PromptPreviewSection` component

The existing prompt textarea editors should remain as a legacy section (labeled "Eski Prompt Editoru") until full migration is complete.

- [ ] **Step 3: Type check**

Run: `cd /Users/huseyincoskun/Downloads/AntigravityProje/ContentHub/frontend && npx tsc --noEmit 2>&1 | tail -5`

Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/admin/PromptEditorPage.tsx
git commit -m "feat(prompt-assembly): extend PromptEditorPage with block management, related rules, and preview"
```

---

## Task 15: Frontend — Job Detail Prompt Trace Panel

**Files:**
- Create: `frontend/src/components/jobs/JobPromptTracePanel.tsx`
- Modify: `frontend/src/components/jobs/JobSystemPanels.tsx` (or equivalent)

- [ ] **Step 1: Read existing Job Detail structure**

Read `frontend/src/pages/admin/JobDetailPage.tsx` and `frontend/src/components/jobs/JobSystemPanels.tsx` to understand the current tab/panel structure.

- [ ] **Step 2: Create JobPromptTracePanel**

Create `frontend/src/components/jobs/JobPromptTracePanel.tsx`:

Content:
- Summary card: Assembly Run ID, Module, Provider, block counts, prompt length, timestamp
- Final Assembled Prompt (collapsible, copy button)
- Block Breakdown using `BlockBreakdownView`
- Snapshot Details (collapsible JSON drawers for settings, data, blocks)
- Provider Request (collapsible JSON, copy button)
- Provider Response (collapsible JSON)
- Error section (if provider_error_json present)

Uses `usePromptTracesForJob(jobId)` to list runs, `usePromptTraceDetail(selectedRunId)` for detail.

If job has multiple assembly runs (script + metadata steps), show a run selector.

- [ ] **Step 3: Add Prompt Trace tab to Job Detail**

Modify `JobSystemPanels.tsx` (or `JobDetailPage.tsx`) to add "Prompt Trace" as a new panel/section. Also add a small reference card in the existing Provider Trace section: assembly_run_id, block counts, "Prompt Trace'e Git" link.

- [ ] **Step 4: Type check**

Run: `cd /Users/huseyincoskun/Downloads/AntigravityProje/ContentHub/frontend && npx tsc --noEmit 2>&1 | tail -5`

Expected: 0 errors

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/jobs/JobPromptTracePanel.tsx frontend/src/components/jobs/JobSystemPanels.tsx
git commit -m "feat(prompt-assembly): add Prompt Trace panel to Job Detail with block breakdown and payload view"
```

---

## Task 16: Wire news_bulletin Executor to Assembly Engine

**Files:**
- Modify: `backend/app/modules/news_bulletin/executors/script.py`

- [ ] **Step 1: Read current script executor**

Read `backend/app/modules/news_bulletin/executors/script.py` to understand the current prompt building flow.

- [ ] **Step 2: Wire assembly engine**

Modify the executor to use PromptAssemblyService instead of `build_bulletin_script_prompt()`:

1. Import `PromptAssemblyService` and `trace_service`
2. In `execute()`, after extracting settings_snapshot and data:
   - Build `data_snapshot` dict with: `selected_news_items`, `dominant_category`, `tone`, `language`, `word_limit`, `target_duration`
   - Build `block_snapshot` from `_prompt_block_snapshot` in job input (or load from DB if not present for backward compat)
   - Call `assembly_service.assemble()` with all snapshots
   - Use `result.final_payload` for the provider call
   - After provider response, call `trace_service.record_provider_result()`
   - Add `assembly_run_id` to step's provider_trace_json

3. Keep `build_bulletin_script_prompt()` as fallback for jobs created before migration (no `_prompt_block_snapshot` in input).

- [ ] **Step 3: Run existing tests**

Run: `cd /Users/huseyincoskun/Downloads/AntigravityProje/ContentHub/backend && python -m pytest tests/ -k "bulletin" -v --tb=short`

Expected: Existing bulletin tests still PASS

- [ ] **Step 4: Commit**

```bash
git add backend/app/modules/news_bulletin/executors/script.py
git commit -m "feat(prompt-assembly): wire news_bulletin script executor to assembly engine with fallback"
```

---

## Task 17: Add Behavior Settings to Settings Registry

**Files:**
- Modify: `backend/app/settings/settings_resolver.py`

- [ ] **Step 1: Read existing KNOWN_SETTINGS for news_bulletin config**

Check which `news_bulletin.config.*` keys already exist in KNOWN_SETTINGS.

- [ ] **Step 2: Add missing behavior flag settings**

Add these to KNOWN_SETTINGS if not present:
```python
"news_bulletin.config.normalize_enabled": {
    "group": "news_bulletin",
    "type": "boolean",
    "label": "Normalizasyon Aktif",
    "help_text": "Haber baslik/icerik normalizasyonunu etkinlestirir.",
    "module_scope": "news_bulletin",
    "env_var": "",
    "builtin_default": True,
    "wired": True,
    "wired_to": "PromptAssemblyService — nb.normalize block condition",
},
"news_bulletin.config.humanize_enabled": {
    "group": "news_bulletin",
    "type": "boolean",
    "label": "Humanizer Aktif",
    "help_text": "Insansi dil zenginlestirmeyi etkinlestirir.",
    "module_scope": "news_bulletin",
    "env_var": "",
    "builtin_default": False,
    "wired": True,
    "wired_to": "PromptAssemblyService — nb.humanizer block condition",
},
"news_bulletin.config.tts_enhance_enabled": {
    "group": "news_bulletin",
    "type": "boolean",
    "label": "TTS Uyumluluk Aktif",
    "help_text": "TTS uyumluluk talimatlarini etkinlestirir.",
    "module_scope": "news_bulletin",
    "env_var": "",
    "builtin_default": True,
    "wired": True,
    "wired_to": "PromptAssemblyService — nb.tts_enhance block condition",
},
"news_bulletin.config.anti_clickbait_enabled": {
    "group": "news_bulletin",
    "type": "boolean",
    "label": "Anti-Clickbait Aktif",
    "help_text": "Clickbait engelleme kurallarini etkinlestirir.",
    "module_scope": "news_bulletin",
    "env_var": "",
    "builtin_default": True,
    "wired": True,
    "wired_to": "PromptAssemblyService — nb.anti_clickbait block condition",
},
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/settings/settings_resolver.py
git commit -m "feat(prompt-assembly): add behavior flag settings for news_bulletin assembly conditions"
```

---

## Task 18: Master Plan + Delivery Report + Final Verification

**Files:**
- Create: `docs_drafts/prompt_assembly_engine_master_plan_tr.md`
- Create: `docs_drafts/prompt_assembly_engine_delivery_report_tr.md`

- [ ] **Step 1: Run full test suite**

Run: `cd /Users/huseyincoskun/Downloads/AntigravityProje/ContentHub/backend && python -m pytest tests/test_condition_evaluator.py tests/test_template_renderer.py tests/test_assembly_service.py tests/test_prompt_assembly_api.py -v --tb=short`

Expected: All tests PASS

- [ ] **Step 2: Run TypeScript check**

Run: `cd /Users/huseyincoskun/Downloads/AntigravityProje/ContentHub/frontend && npx tsc --noEmit`

Expected: 0 errors

- [ ] **Step 3: Write master plan doc**

Create `docs_drafts/prompt_assembly_engine_master_plan_tr.md` following the spec's section 15 requirements. Cover all 16 sections listed in the spec.

- [ ] **Step 4: Write delivery report**

Create `docs_drafts/prompt_assembly_engine_delivery_report_tr.md` following the spec's section 15 requirements. Cover all 12 sections listed in the spec.

- [ ] **Step 5: Final commit**

```bash
git add docs_drafts/prompt_assembly_engine_master_plan_tr.md docs_drafts/prompt_assembly_engine_delivery_report_tr.md
git commit -m "docs(prompt-assembly): add master plan and delivery report"
```
