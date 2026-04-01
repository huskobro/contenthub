"""
Foundation models — Phase 2 + Phase 3.

Bootstrap tables (Phase 2):
  - app_state: key/value application state store
  - audit_logs: append-only audit trail
  - users: local role model baseline (no auth yet)

Domain models (Phase 3+):
  - settings: settings registry — product objects with metadata, not ad-hoc config

Remaining domain models (jobs, templates, sources, publish, analytics)
will be added in later phases as their subsystems are built.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Text, DateTime, Boolean
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
