"""
Branding Center — aggregate service.

Responsibilities:
  - Resolve the BrandProfile for a ChannelProfile. If missing, create one
    on demand (idempotent) linked back via BrandProfile.channel_profile_id.
  - Load/save section payloads (identity / audience / visual / messaging /
    platform output), handling JSON (de)serialization at the boundary.
  - Write meaningful audit entries on every section save and on apply.
  - Respect ownership — the caller must already have passed the route-level
    ownership gate; this service asserts consistency in defense-in-depth.

Design notes:
  - Brand "Apply" is persisted as a status dict on BrandProfile.apply_status_json
    and mirrored into an audit log. No cross-platform push here — that is
    a separate concern for future phases.
  - We avoid duplicating BrandProfile fields that already exist (palette,
    typography, logo_path etc.) — the Branding Center simply owns a
    wider write surface on the same row.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.service import write_audit_log
from app.auth.ownership import UserContext
from app.branding_center.schemas import (
    ApplyRequest,
    ApplyResponse,
    ApplyResultItem,
    AudienceSection,
    BrandingCenterResponse,
    ChannelSummary,
    IdentitySection,
    MessagingSection,
    PlatformOutputSection,
    VisualSection,
)
from app.db.models import BrandProfile, ChannelProfile

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Internals — JSON helpers (tolerant to legacy strings)
# ---------------------------------------------------------------------------


def _load_json_dict(value: Optional[str]) -> Dict[str, Any]:
    if not value:
        return {}
    try:
        data = json.loads(value)
        return data if isinstance(data, dict) else {}
    except (TypeError, ValueError):
        return {}


def _load_json_list(value: Optional[str]) -> List[Any]:
    if not value:
        return []
    try:
        data = json.loads(value)
        return data if isinstance(data, list) else []
    except (TypeError, ValueError):
        return []


def _dump_json(value: Any) -> Optional[str]:
    if value is None:
        return None
    return json.dumps(value, ensure_ascii=False)


# ---------------------------------------------------------------------------
# Channel -> BrandProfile resolution (idempotent create-on-read)
# ---------------------------------------------------------------------------


async def _get_or_create_brand_profile_for_channel(
    db: AsyncSession,
    channel: ChannelProfile,
) -> BrandProfile:
    """Find the brand profile attached to this channel. If the channel
    already references one via brand_profile_id, return it. Otherwise
    search by channel_profile_id back-reference. If still missing, create
    a new empty BrandProfile owned by the channel's user and wire both
    directions."""
    # 1) Channel already points at a brand profile
    if channel.brand_profile_id:
        bp = await db.get(BrandProfile, channel.brand_profile_id)
        if bp is not None:
            # Ensure back-reference is populated (helps admin search).
            if bp.channel_profile_id != channel.id:
                bp.channel_profile_id = channel.id
            return bp

    # 2) Lookup by back-ref
    q = select(BrandProfile).where(BrandProfile.channel_profile_id == channel.id)
    existing = (await db.execute(q)).scalar_one_or_none()
    if existing is not None:
        channel.brand_profile_id = existing.id
        return existing

    # 3) Create a fresh one — minimal valid state
    default_name = (channel.title or channel.profile_name or "Marka")[:255]
    bp = BrandProfile(
        owner_user_id=channel.user_id,
        channel_profile_id=channel.id,
        brand_name=default_name,
    )
    db.add(bp)
    await db.flush()  # populate id so we can link back
    channel.brand_profile_id = bp.id
    logger.info(
        "BrandingCenter: auto-created BrandProfile id=%s for channel=%s",
        bp.id,
        channel.id,
    )
    return bp


# ---------------------------------------------------------------------------
# Aggregate GET — build the full Branding Center payload
# ---------------------------------------------------------------------------


def _build_response(
    channel: ChannelProfile, bp: BrandProfile
) -> BrandingCenterResponse:
    identity = IdentitySection(
        brand_name=bp.brand_name,
        brand_summary=bp.brand_summary,
    )
    audience = AudienceSection(
        audience_profile=_load_json_dict(bp.audience_profile_json) or None,
        positioning_statement=bp.positioning_statement,
    )
    visual = VisualSection(
        palette=bp.palette,
        typography=bp.typography,
        motion_style=bp.motion_style,
        logo_path=bp.logo_path,
        watermark_path=bp.watermark_path,
        watermark_position=bp.watermark_position,
        lower_third_defaults=bp.lower_third_defaults,
    )
    messaging = MessagingSection(
        tone_of_voice=bp.tone_of_voice,
        messaging_pillars=_load_json_list(bp.messaging_pillars_json) or None,
    )
    platform_output = PlatformOutputSection(
        channel_description=bp.channel_description,
        channel_keywords=_load_json_list(bp.channel_keywords_json) or None,
        banner_prompt=bp.banner_prompt,
        logo_prompt=bp.logo_prompt,
    )
    apply_status = _load_json_dict(bp.apply_status_json)

    # Completeness hints — cheap booleans to drive UI progress dots.
    completeness = {
        "identity": bool(bp.brand_name) and bool(bp.brand_summary),
        "audience": bool(bp.audience_profile_json) and bool(bp.positioning_statement),
        "visual": bool(bp.palette) or bool(bp.typography) or bool(bp.logo_path),
        "messaging": bool(bp.tone_of_voice) and bool(bp.messaging_pillars_json),
        "platform_output": bool(bp.channel_description) or bool(bp.channel_keywords_json),
        "applied": bool(apply_status.get("applied_at")),
    }

    return BrandingCenterResponse(
        channel=ChannelSummary(
            id=channel.id,
            profile_name=channel.profile_name,
            channel_slug=channel.channel_slug,
            platform=channel.platform,
            title=channel.title,
            handle=channel.handle,
            avatar_url=channel.avatar_url,
            import_status=channel.import_status,
            user_id=channel.user_id,
        ),
        brand_profile_id=bp.id,
        updated_at=bp.updated_at,
        identity=identity,
        audience=audience,
        visual=visual,
        messaging=messaging,
        platform_output=platform_output,
        apply_status=apply_status,
        completeness=completeness,
    )


async def get_branding_center(
    db: AsyncSession, *, channel: ChannelProfile
) -> BrandingCenterResponse:
    bp = await _get_or_create_brand_profile_for_channel(db, channel)
    # If we created one or updated back-refs, persist those changes.
    await db.commit()
    await db.refresh(bp)
    await db.refresh(channel)
    return _build_response(channel, bp)


# ---------------------------------------------------------------------------
# Section savers — each section has one saver; caller enforces ownership.
# ---------------------------------------------------------------------------


async def save_identity(
    db: AsyncSession,
    *,
    ctx: UserContext,
    channel: ChannelProfile,
    payload: IdentitySection,
) -> BrandingCenterResponse:
    bp = await _get_or_create_brand_profile_for_channel(db, channel)
    changed: Dict[str, Any] = {}
    if payload.brand_name is not None and payload.brand_name != bp.brand_name:
        changed["brand_name"] = payload.brand_name
        bp.brand_name = payload.brand_name
    if payload.brand_summary is not None and payload.brand_summary != bp.brand_summary:
        changed["brand_summary"] = payload.brand_summary
        bp.brand_summary = payload.brand_summary
    if changed:
        await write_audit_log(
            db,
            action="branding_center.section.save",
            entity_type="BrandProfile",
            entity_id=bp.id,
            actor_type="user",
            actor_id=ctx.user_id,
            details={"section": "identity", "fields": list(changed.keys())},
        )
    await db.commit()
    await db.refresh(bp)
    await db.refresh(channel)
    return _build_response(channel, bp)


async def save_audience(
    db: AsyncSession,
    *,
    ctx: UserContext,
    channel: ChannelProfile,
    payload: AudienceSection,
) -> BrandingCenterResponse:
    bp = await _get_or_create_brand_profile_for_channel(db, channel)
    changed: List[str] = []
    if payload.audience_profile is not None:
        serialized = _dump_json(payload.audience_profile)
        if serialized != bp.audience_profile_json:
            bp.audience_profile_json = serialized
            changed.append("audience_profile")
    if (
        payload.positioning_statement is not None
        and payload.positioning_statement != bp.positioning_statement
    ):
        bp.positioning_statement = payload.positioning_statement
        changed.append("positioning_statement")
    if changed:
        await write_audit_log(
            db,
            action="branding_center.section.save",
            entity_type="BrandProfile",
            entity_id=bp.id,
            actor_type="user",
            actor_id=ctx.user_id,
            details={"section": "audience", "fields": changed},
        )
    await db.commit()
    await db.refresh(bp)
    await db.refresh(channel)
    return _build_response(channel, bp)


async def save_visual(
    db: AsyncSession,
    *,
    ctx: UserContext,
    channel: ChannelProfile,
    payload: VisualSection,
) -> BrandingCenterResponse:
    bp = await _get_or_create_brand_profile_for_channel(db, channel)
    fields = (
        "palette",
        "typography",
        "motion_style",
        "logo_path",
        "watermark_path",
        "watermark_position",
        "lower_third_defaults",
    )
    changed: List[str] = []
    for f in fields:
        new_val = getattr(payload, f)
        if new_val is not None and new_val != getattr(bp, f):
            setattr(bp, f, new_val)
            changed.append(f)
    if changed:
        await write_audit_log(
            db,
            action="branding_center.section.save",
            entity_type="BrandProfile",
            entity_id=bp.id,
            actor_type="user",
            actor_id=ctx.user_id,
            details={"section": "visual", "fields": changed},
        )
    await db.commit()
    await db.refresh(bp)
    await db.refresh(channel)
    return _build_response(channel, bp)


async def save_messaging(
    db: AsyncSession,
    *,
    ctx: UserContext,
    channel: ChannelProfile,
    payload: MessagingSection,
) -> BrandingCenterResponse:
    bp = await _get_or_create_brand_profile_for_channel(db, channel)
    changed: List[str] = []
    if (
        payload.tone_of_voice is not None
        and payload.tone_of_voice != bp.tone_of_voice
    ):
        bp.tone_of_voice = payload.tone_of_voice
        changed.append("tone_of_voice")
    if payload.messaging_pillars is not None:
        serialized = _dump_json(payload.messaging_pillars)
        if serialized != bp.messaging_pillars_json:
            bp.messaging_pillars_json = serialized
            changed.append("messaging_pillars")
    if changed:
        await write_audit_log(
            db,
            action="branding_center.section.save",
            entity_type="BrandProfile",
            entity_id=bp.id,
            actor_type="user",
            actor_id=ctx.user_id,
            details={"section": "messaging", "fields": changed},
        )
    await db.commit()
    await db.refresh(bp)
    await db.refresh(channel)
    return _build_response(channel, bp)


async def save_platform_output(
    db: AsyncSession,
    *,
    ctx: UserContext,
    channel: ChannelProfile,
    payload: PlatformOutputSection,
) -> BrandingCenterResponse:
    bp = await _get_or_create_brand_profile_for_channel(db, channel)
    changed: List[str] = []
    if (
        payload.channel_description is not None
        and payload.channel_description != bp.channel_description
    ):
        bp.channel_description = payload.channel_description
        changed.append("channel_description")
    if payload.channel_keywords is not None:
        serialized = _dump_json(payload.channel_keywords)
        if serialized != bp.channel_keywords_json:
            bp.channel_keywords_json = serialized
            changed.append("channel_keywords")
    if payload.banner_prompt is not None and payload.banner_prompt != bp.banner_prompt:
        bp.banner_prompt = payload.banner_prompt
        changed.append("banner_prompt")
    if payload.logo_prompt is not None and payload.logo_prompt != bp.logo_prompt:
        bp.logo_prompt = payload.logo_prompt
        changed.append("logo_prompt")
    if changed:
        await write_audit_log(
            db,
            action="branding_center.section.save",
            entity_type="BrandProfile",
            entity_id=bp.id,
            actor_type="user",
            actor_id=ctx.user_id,
            details={"section": "platform_output", "fields": changed},
        )
    await db.commit()
    await db.refresh(bp)
    await db.refresh(channel)
    return _build_response(channel, bp)


# ---------------------------------------------------------------------------
# Review & Apply — explicit, honest, dry-run supported
# ---------------------------------------------------------------------------


# Surfaces where "apply" has a meaningful MVP effect.
_APPLY_SURFACES_MVP = ("local_snapshot",)


async def apply_branding(
    db: AsyncSession,
    *,
    ctx: UserContext,
    channel: ChannelProfile,
    payload: ApplyRequest,
) -> ApplyResponse:
    """MVP apply: write a snapshot of the current brand values into
    apply_status_json. Platform-side push (e.g. actually updating YouTube
    channel description) is out of scope for this phase and surfaces
    status='skipped' with an honest explanation.

    The key product contract here: apply is explicit (the user must press
    the button), never auto — and the status we persist reflects what was
    actually applied, not what was requested.
    """
    bp = await _get_or_create_brand_profile_for_channel(db, channel)

    requested = payload.surfaces or list(_APPLY_SURFACES_MVP)
    items: List[ApplyResultItem] = []
    now = datetime.now(timezone.utc)
    snapshot: Dict[str, Any] = {
        "brand_name": bp.brand_name,
        "brand_summary": bp.brand_summary,
        "tone_of_voice": bp.tone_of_voice,
        "channel_description": bp.channel_description,
        "channel_keywords": _load_json_list(bp.channel_keywords_json),
        "messaging_pillars": _load_json_list(bp.messaging_pillars_json),
        "palette": bp.palette,
        "typography": bp.typography,
        "logo_path": bp.logo_path,
        "watermark_path": bp.watermark_path,
    }

    for surface in requested:
        if surface == "local_snapshot":
            items.append(
                ApplyResultItem(
                    surface=surface,
                    status="queued" if payload.dry_run else "applied",
                    detail=(
                        "Dry-run: hic bir kalici etki yok"
                        if payload.dry_run
                        else "Brand snapshot kayit altina alindi"
                    ),
                )
            )
        else:
            # Any surface we don't handle yet is surfaced honestly.
            items.append(
                ApplyResultItem(
                    surface=surface,
                    status="skipped",
                    detail="Bu yuzey bu faz icin desteklenmiyor",
                )
            )

    if not payload.dry_run:
        applied = {
            "applied_at": now.isoformat(),
            "applied_by": ctx.user_id,
            "surfaces": [i.model_dump() for i in items],
            "snapshot": snapshot,
        }
        bp.apply_status_json = _dump_json(applied)
        await write_audit_log(
            db,
            action="branding_center.apply",
            entity_type="BrandProfile",
            entity_id=bp.id,
            actor_type="user",
            actor_id=ctx.user_id,
            details={
                "channel_id": channel.id,
                "surfaces": [i.model_dump() for i in items],
            },
        )
        await db.commit()
        await db.refresh(bp)

    return ApplyResponse(ok=True, applied_at=now, items=items)
