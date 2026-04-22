"""
Channel Profile service — Faz 2 + PHASE X.

PHASE X ekleri:
  - URL-only create flow: create_channel_profile_from_url
  - Duplicate normalized_url check (ayni user icin)
  - Metadata fetch entegrasyonu (auth'siz)
  - Ownership-aware list filter (caller UserContext ile filtrelemeyi yapar;
    bu service layer'i ham query sunar)
"""

from __future__ import annotations

import json
import logging
import re
import unicodedata
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.channels.metadata_fetch import ChannelMetadata, fetch_channel_metadata
from app.channels.preview_token import (
    PREVIEW_TOKEN_TTL_SECONDS,
    PreviewTokenError,
    issue_preview_token,
    verify_preview_token,
)
from app.channels.schemas import (
    ChannelImportConfirmRequest,
    ChannelImportPreview,
    ChannelImportPreviewRequest,
    ChannelProfileCreate,
    ChannelProfileCreateFromURL,
    ChannelProfileUpdate,
)
from app.channels.url_utils import (
    ChannelURLError,
    ChannelURLInfo,
    parse_channel_url,
)
from app.db.models import ChannelProfile

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Listing
# ---------------------------------------------------------------------------


async def list_channel_profiles(
    db: AsyncSession,
    user_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
) -> list[ChannelProfile]:
    """Ham sorgu. Ownership enforcement caller tarafindadir (route katmani)."""
    q = select(ChannelProfile).order_by(ChannelProfile.created_at.desc())
    if user_id:
        q = q.where(ChannelProfile.user_id == user_id)
    q = q.offset(skip).limit(limit)
    result = await db.execute(q)
    return list(result.scalars().all())


async def get_channel_profile(
    db: AsyncSession, profile_id: str
) -> Optional[ChannelProfile]:
    return await db.get(ChannelProfile, profile_id)


# ---------------------------------------------------------------------------
# Legacy full-form create (admin / dahili)
# ---------------------------------------------------------------------------


async def create_channel_profile(
    db: AsyncSession, payload: ChannelProfileCreate
) -> ChannelProfile:
    profile = ChannelProfile(
        user_id=payload.user_id,
        profile_name=payload.profile_name,
        channel_slug=payload.channel_slug,
        profile_type=payload.profile_type,
        default_language=payload.default_language,
        default_content_mode=payload.default_content_mode,
        brand_profile_id=payload.brand_profile_id,
        automation_policy_id=payload.automation_policy_id,
        notes=payload.notes,
        import_status="manual",
    )
    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    logger.info(
        "ChannelProfile created (legacy): id=%s slug=%s", profile.id, profile.channel_slug
    )
    return profile


# ---------------------------------------------------------------------------
# PHASE X — URL-only create
# ---------------------------------------------------------------------------


_SLUG_RE = re.compile(r"[^a-z0-9]+")


def _slugify(value: str, fallback: str) -> str:
    v = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    v = v.lower()
    v = _SLUG_RE.sub("-", v).strip("-")
    if not v:
        v = fallback
    return v[:100]


def _derive_profile_name(
    info: ChannelURLInfo, meta: ChannelMetadata
) -> str:
    if meta.title:
        return meta.title[:255]
    if info.handle:
        return info.handle[:255]
    if info.external_channel_id:
        return info.external_channel_id[:255]
    return "Kanal (basliksiz)"


def _derive_channel_slug(
    info: ChannelURLInfo, meta: ChannelMetadata
) -> str:
    if info.handle:
        return _slugify(info.handle.lstrip("@"), fallback="channel")
    if meta.title:
        return _slugify(meta.title, fallback="channel")
    if info.external_channel_id:
        return _slugify(info.external_channel_id, fallback="channel")
    # Normalized URL hashinden kisa slug
    return _slugify(info.normalized_url, fallback="channel")[:40] or "channel"


async def _ensure_no_duplicate(
    db: AsyncSession, *, user_id: str, normalized_url: str
) -> None:
    q = select(ChannelProfile).where(
        ChannelProfile.user_id == user_id,
        ChannelProfile.normalized_url == normalized_url,
    )
    existing = (await db.execute(q)).scalar_one_or_none()
    if existing is not None:
        raise ValueError(
            "Bu kanal URL'i zaten eklenmis"
        )


async def _ensure_unique_slug(
    db: AsyncSession, *, user_id: str, slug: str
) -> str:
    """Ayni user icin slug benzersiz olmali. Cakisma varsa -2, -3 ekler."""
    base = slug
    suffix = 1
    current = base
    while True:
        q = select(ChannelProfile).where(
            ChannelProfile.user_id == user_id,
            ChannelProfile.channel_slug == current,
        )
        if (await db.execute(q)).scalar_one_or_none() is None:
            return current
        suffix += 1
        current = f"{base}-{suffix}"[:100]
        if suffix > 99:
            # fail-fast: mantikli limitten sonra pes et
            raise ValueError("Slug cakismasi cozulemedi")


async def create_channel_profile_from_url(
    db: AsyncSession,
    *,
    user_id: str,
    payload: ChannelProfileCreateFromURL,
) -> ChannelProfile:
    """URL-only create. Akis:
       1) parse_channel_url -> ChannelURLInfo (validate + normalize + platform detect)
       2) Duplicate kontrol (user + normalized_url)
       3) Metadata fetch (best-effort; basarisiz olabilir — partial state)
       4) ChannelProfile kaydi (import_status: success | partial)
    """
    # 1) parse
    try:
        info = parse_channel_url(payload.source_url)
    except ChannelURLError as exc:
        raise ValueError(str(exc))

    # 2) duplicate check (ayni user)
    await _ensure_no_duplicate(
        db, user_id=user_id, normalized_url=info.normalized_url
    )

    # 3) metadata fetch — best-effort
    meta = await fetch_channel_metadata(info)

    profile_name = _derive_profile_name(info, meta)
    slug_base = _derive_channel_slug(info, meta)
    slug = await _ensure_unique_slug(db, user_id=user_id, slug=slug_base)

    # 4) create
    now = datetime.now(timezone.utc)
    profile = ChannelProfile(
        user_id=user_id,
        profile_name=profile_name,
        channel_slug=slug,
        profile_type=None,
        default_language=payload.default_language,
        notes=payload.notes,
        # URL-only fields
        platform=info.platform,
        source_url=info.source_url,
        normalized_url=info.normalized_url,
        external_channel_id=meta.external_channel_id or info.external_channel_id,
        handle=meta.handle or info.handle,
        title=meta.title,
        avatar_url=meta.avatar_url,
        metadata_json=(
            json.dumps(
                {
                    "description": meta.description,
                    "fetch_error": meta.fetch_error,
                    "url_kind": info.kind,
                },
                ensure_ascii=False,
            )
            if (meta.description or meta.fetch_error or info.kind)
            else None
        ),
        import_status="partial" if meta.is_partial else "success",
        import_error=meta.fetch_error,
        last_import_at=now,
        status="active",
    )
    try:
        db.add(profile)
        await db.commit()
        await db.refresh(profile)
    except IntegrityError as exc:
        await db.rollback()
        # uq_user_normalized_url cakismasi race condition halinde
        raise ValueError("Bu kanal URL'i zaten eklenmis") from exc
    logger.info(
        "ChannelProfile URL-import: id=%s platform=%s status=%s normalized=%s",
        profile.id,
        profile.platform,
        profile.import_status,
        profile.normalized_url,
    )
    return profile


# ---------------------------------------------------------------------------
# PHASE AD — Reimport (stuck-at-partial recovery)
# ---------------------------------------------------------------------------


async def reimport_channel_profile(
    db: AsyncSession, profile_id: str
) -> Optional[ChannelProfile]:
    """
    Re-run metadata fetch for an existing ChannelProfile.

    Used when the original import landed in `partial` state (fetch failed or
    returned insufficient data). Re-parses the stored source_url, re-fetches
    metadata, and updates the profile's title / avatar / external ids /
    import_status in place. Leaves user-edited fields (profile_name,
    default_language, notes) untouched.

    Returns the updated profile, or None if the profile does not exist.
    """
    profile = await db.get(ChannelProfile, profile_id)
    if profile is None:
        return None

    if not profile.source_url:
        raise ValueError(
            "Bu kanal profili URL ile olusturulmadi (source_url yok); reimport yok."
        )

    try:
        info = parse_channel_url(profile.source_url)
    except ChannelURLError as exc:
        raise ValueError(str(exc))

    meta = await fetch_channel_metadata(info)

    profile.platform = info.platform
    profile.normalized_url = info.normalized_url
    if meta.external_channel_id or info.external_channel_id:
        profile.external_channel_id = meta.external_channel_id or info.external_channel_id
    if meta.handle or info.handle:
        profile.handle = meta.handle or info.handle
    # Only overwrite title/avatar when the reimport returned new values — keeps
    # user customizations (e.g. manual title edits) intact if meta has nothing.
    if meta.title:
        profile.title = meta.title
    if meta.avatar_url:
        profile.avatar_url = meta.avatar_url

    profile.metadata_json = (
        json.dumps(
            {
                "description": meta.description,
                "fetch_error": meta.fetch_error,
                "url_kind": info.kind,
            },
            ensure_ascii=False,
        )
        if (meta.description or meta.fetch_error or info.kind)
        else profile.metadata_json
    )
    profile.import_status = "partial" if meta.is_partial else "success"
    profile.import_error = meta.fetch_error
    profile.last_import_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(profile)
    logger.info(
        "ChannelProfile reimport: id=%s platform=%s status=%s",
        profile.id,
        profile.platform,
        profile.import_status,
    )
    return profile


# ---------------------------------------------------------------------------
# Update / Delete — unchanged behavior (route handler ownership enforces)
# ---------------------------------------------------------------------------


async def update_channel_profile(
    db: AsyncSession, profile_id: str, payload: ChannelProfileUpdate
) -> Optional[ChannelProfile]:
    profile = await db.get(ChannelProfile, profile_id)
    if not profile:
        return None
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    await db.commit()
    await db.refresh(profile)
    return profile


async def delete_channel_profile(
    db: AsyncSession, profile_id: str
) -> Optional[ChannelProfile]:
    profile = await db.get(ChannelProfile, profile_id)
    if not profile:
        return None
    profile.status = "archived"
    await db.commit()
    await db.refresh(profile)
    return profile


# ---------------------------------------------------------------------------
# Branding Center onboarding — preview + confirm (no-DB-row preview flow)
# ---------------------------------------------------------------------------


async def preview_channel_import(
    db: AsyncSession,
    *,
    user_id: str,
    payload: ChannelImportPreviewRequest,
) -> ChannelImportPreview:
    """Parse + fetch metadata WITHOUT inserting a DB row.

    Duplicate check still runs (early fail) so the user cannot spend a
    confirmation step only to be rejected on insert.
    """
    try:
        info = parse_channel_url(payload.source_url)
    except ChannelURLError as exc:
        raise ValueError(str(exc))

    await _ensure_no_duplicate(
        db, user_id=user_id, normalized_url=info.normalized_url
    )

    meta = await fetch_channel_metadata(info)

    token = issue_preview_token(
        user_id=user_id,
        normalized_url=info.normalized_url,
        platform=info.platform,
    )
    return ChannelImportPreview(
        preview_token=token,
        platform=info.platform,
        source_url=info.source_url,
        normalized_url=info.normalized_url,
        url_kind=info.kind,
        external_channel_id=meta.external_channel_id or info.external_channel_id,
        handle=meta.handle or info.handle,
        title=meta.title,
        avatar_url=meta.avatar_url,
        description=meta.description,
        is_partial=meta.is_partial,
        fetch_error=meta.fetch_error,
        expires_in_seconds=PREVIEW_TOKEN_TTL_SECONDS,
    )


async def confirm_channel_import(
    db: AsyncSession,
    *,
    user_id: str,
    payload: ChannelImportConfirmRequest,
) -> ChannelProfile:
    """Confirm the preview: verify the signed token, re-fetch metadata
    (source of truth at write time), then create the profile.

    Why re-fetch instead of trusting preview data:
      - Preview data is minutes old; a re-fetch is cheap.
      - We never trust client-supplied metadata — signed token only
        authorizes the create, not what gets stored.
    """
    # 1) Parse the URL the client is confirming with.
    try:
        info = parse_channel_url(payload.source_url)
    except ChannelURLError as exc:
        raise ValueError(str(exc))

    # 2) Verify the signed token and cross-check the URL.
    try:
        claims = verify_preview_token(
            payload.preview_token, expected_user_id=user_id
        )
    except PreviewTokenError as exc:
        raise ValueError(str(exc))

    if claims.get("nurl") != info.normalized_url:
        raise ValueError(
            "Onizleme kodu farkli bir URL icin verildi — lutfen yeniden onizleyin"
        )

    # 3) Duplicate guard — prevents race between preview and confirm.
    await _ensure_no_duplicate(
        db, user_id=user_id, normalized_url=info.normalized_url
    )

    # 4) Re-fetch metadata (source of truth at insert time).
    meta = await fetch_channel_metadata(info)

    profile_name = payload.profile_name or _derive_profile_name(info, meta)
    slug_base = _derive_channel_slug(info, meta)
    slug = await _ensure_unique_slug(db, user_id=user_id, slug=slug_base)

    now = datetime.now(timezone.utc)
    profile = ChannelProfile(
        user_id=user_id,
        profile_name=profile_name,
        channel_slug=slug,
        profile_type=None,
        default_language=payload.default_language,
        notes=payload.notes,
        platform=info.platform,
        source_url=info.source_url,
        normalized_url=info.normalized_url,
        external_channel_id=meta.external_channel_id or info.external_channel_id,
        handle=meta.handle or info.handle,
        title=meta.title,
        avatar_url=meta.avatar_url,
        metadata_json=(
            json.dumps(
                {
                    "description": meta.description,
                    "fetch_error": meta.fetch_error,
                    "url_kind": info.kind,
                    "import_flow": "preview_confirm",
                },
                ensure_ascii=False,
            )
            if (meta.description or meta.fetch_error or info.kind)
            else None
        ),
        import_status="partial" if meta.is_partial else "success",
        import_error=meta.fetch_error,
        last_import_at=now,
        status="active",
    )
    try:
        db.add(profile)
        await db.commit()
        await db.refresh(profile)
    except IntegrityError as exc:
        await db.rollback()
        raise ValueError("Bu kanal URL'i zaten eklenmis") from exc
    logger.info(
        "ChannelProfile preview-confirm: id=%s platform=%s status=%s",
        profile.id,
        profile.platform,
        profile.import_status,
    )
    return profile
