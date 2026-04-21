"""
Branding Center — aggregate schemas.

Branding Center is a single-screen, 6-section product surface that sits on
top of the raw BrandProfile CRUD. It serves both user and admin routes:
  - /user/channels/{channel_id}/branding-center
  - /admin/channels/{channel_id}/branding-center

Sections (frontend tabs):
  1. Channel Identity
  2. Audience & Positioning
  3. Visual Branding
  4. Messaging
  5. Platform Branding Output
  6. Review & Apply

Why aggregate schemas: the UI needs a single GET that returns the channel,
its brand profile (creating one on demand), and the aggregated section
payloads. And a single PATCH per section so we keep the UI idempotent,
transactional, and diff-able in the audit log.

All free-form payloads use typed helpers (lists, key-value dicts) at the
API boundary but persist as JSON text on the model. The service layer
handles (de)serialization so the model stays thin.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Section payloads — write paths use these; GET returns them inside the
# aggregate response. Each section is independently PATCHable.
# ---------------------------------------------------------------------------


class IdentitySection(BaseModel):
    brand_name: Optional[str] = Field(None, max_length=255)
    brand_summary: Optional[str] = Field(None, max_length=2000)


class AudienceSection(BaseModel):
    audience_profile: Optional[Dict[str, Any]] = None
    positioning_statement: Optional[str] = Field(None, max_length=2000)


class VisualSection(BaseModel):
    palette: Optional[str] = None
    typography: Optional[str] = None
    motion_style: Optional[str] = Field(None, max_length=100)
    logo_path: Optional[str] = None
    watermark_path: Optional[str] = None
    watermark_position: Optional[str] = Field(None, max_length=50)
    lower_third_defaults: Optional[str] = None


class MessagingSection(BaseModel):
    tone_of_voice: Optional[str] = Field(None, max_length=255)
    messaging_pillars: Optional[List[str]] = None


class PlatformOutputSection(BaseModel):
    channel_description: Optional[str] = Field(None, max_length=5000)
    channel_keywords: Optional[List[str]] = None
    banner_prompt: Optional[str] = Field(None, max_length=4000)
    logo_prompt: Optional[str] = Field(None, max_length=4000)


class ApplyRequest(BaseModel):
    """Section 6: explicit apply action. The user must press 'Apply' — we
    never auto-sync. `surfaces` lists which surfaces to push to; empty
    means all available ones. MVP supports only local snapshot storage;
    platform-push lands in a later phase."""

    surfaces: List[str] = Field(default_factory=list)
    dry_run: bool = False


class ApplyResultItem(BaseModel):
    surface: str
    status: str  # queued | applied | skipped | failed
    detail: Optional[str] = None


class ApplyResponse(BaseModel):
    ok: bool
    applied_at: datetime
    items: List[ApplyResultItem]


# ---------------------------------------------------------------------------
# Aggregate GET response — one payload for the whole Branding Center screen
# ---------------------------------------------------------------------------


class ChannelSummary(BaseModel):
    id: str
    profile_name: str
    channel_slug: str
    platform: Optional[str] = None
    title: Optional[str] = None
    handle: Optional[str] = None
    avatar_url: Optional[str] = None
    import_status: Optional[str] = None
    user_id: str


class BrandingCenterResponse(BaseModel):
    channel: ChannelSummary
    brand_profile_id: str
    updated_at: datetime

    identity: IdentitySection
    audience: AudienceSection
    visual: VisualSection
    messaging: MessagingSection
    platform_output: PlatformOutputSection

    apply_status: Dict[str, Any] = Field(default_factory=dict)
    # Read-only hints for the UI (does not affect behavior).
    completeness: Dict[str, bool] = Field(default_factory=dict)

    model_config = ConfigDict(from_attributes=False)
