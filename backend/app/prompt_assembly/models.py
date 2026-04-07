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
    """A single building block of an assembled prompt."""

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

    @property
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
