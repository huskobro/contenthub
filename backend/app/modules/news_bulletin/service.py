import asyncio
import json
import logging
from pathlib import Path
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import NewsBulletin, NewsBulletinScript, NewsBulletinMetadata, NewsBulletinSelectedItem, NewsItem, UsedNewsRegistry
from .schemas import (
    NewsBulletinCreate, NewsBulletinUpdate, NewsBulletinResponse,
    NewsBulletinScriptCreate, NewsBulletinScriptUpdate,
    NewsBulletinMetadataCreate, NewsBulletinMetadataUpdate,
    NewsBulletinSelectedItemCreate, NewsBulletinSelectedItemUpdate,
    NewsBulletinSelectedItemWithEnforcementResponse,
)

logger = logging.getLogger(__name__)


async def get_used_news_enforcement(
    db: AsyncSession, news_item_id: str
) -> dict:
    """Return enforcement summary for a given news_item_id."""
    result = await db.execute(
        select(UsedNewsRegistry)
        .where(UsedNewsRegistry.news_item_id == news_item_id)
        .order_by(UsedNewsRegistry.created_at.desc())
    )
    records = list(result.scalars().all())
    count = len(records)
    if count == 0:
        return {
            "used_news_count": 0,
            "used_news_warning": False,
            "last_usage_type": None,
            "last_target_module": None,
        }
    latest = records[0]
    return {
        "used_news_count": count,
        "used_news_warning": True,
        "last_usage_type": latest.usage_type,
        "last_target_module": latest.target_module,
    }


async def list_news_bulletins(
    db: AsyncSession,
    status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    include_test_data: bool = False,
) -> List[NewsBulletin]:
    stmt = select(NewsBulletin).order_by(NewsBulletin.created_at.desc())
    if not include_test_data:
        stmt = stmt.where(NewsBulletin.is_test_data == False)  # noqa: E712
    if status:
        stmt = stmt.where(NewsBulletin.status == status)
    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(
            NewsBulletin.title.ilike(pattern) | NewsBulletin.topic.ilike(pattern)
        )
    stmt = stmt.limit(limit).offset(offset)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def _enrich_bulletin(
    db: AsyncSession, b: NewsBulletin
) -> NewsBulletinResponse:
    """
    Bug #4 fix: enrichment helper shared by list and single-GET endpoints.

    Computes has_script, has_metadata, selected_news_count, warning counts,
    source coverage, and quality breakdown for a single bulletin ORM object.
    Previously this logic lived only inside list_news_bulletins_with_artifacts
    so single-bulletin GET returned selected_news_count=0.
    """
    from sqlalchemy import func as sqlfunc

    script_row = await db.execute(
        select(NewsBulletinScript).where(NewsBulletinScript.news_bulletin_id == b.id).limit(1)
    )
    meta_row = await db.execute(
        select(NewsBulletinMetadata).where(NewsBulletinMetadata.news_bulletin_id == b.id).limit(1)
    )
    count_row = await db.execute(
        select(sqlfunc.count()).select_from(NewsBulletinSelectedItem)
        .where(NewsBulletinSelectedItem.news_bulletin_id == b.id)
    )
    selected_news_count = count_row.scalar() or 0

    items_row = await db.execute(
        select(NewsBulletinSelectedItem.news_item_id)
        .where(NewsBulletinSelectedItem.news_bulletin_id == b.id)
    )
    news_item_ids = [row[0] for row in items_row.fetchall()]

    warning_count = 0
    selected_news_source_count = 0
    has_selected_news_missing_source = False
    quality_complete_count = 0
    quality_partial_count = 0
    quality_weak_count = 0
    if news_item_ids:
        warn_row = await db.execute(
            select(sqlfunc.count(sqlfunc.distinct(UsedNewsRegistry.news_item_id)))
            .where(UsedNewsRegistry.news_item_id.in_(news_item_ids))
        )
        warning_count = warn_row.scalar() or 0

        news_items_row = await db.execute(
            select(NewsItem.source_id, NewsItem.title, NewsItem.url, NewsItem.summary)
            .where(NewsItem.id.in_(news_item_ids))
        )
        news_rows = news_items_row.fetchall()
        source_ids = [row[0] for row in news_rows]
        distinct_sources = set(s for s in source_ids if s)
        selected_news_source_count = len(distinct_sources)
        has_selected_news_missing_source = any(s is None for s in source_ids)

        for row in news_rows:
            _source_id, title, url, summary = row
            has_title = bool(title and title.strip())
            has_url = bool(url and url.strip())
            has_summary = bool(summary and summary.strip())
            if not has_title or not has_url:
                quality_weak_count += 1
            elif not has_summary:
                quality_partial_count += 1
            else:
                quality_complete_count += 1

    return NewsBulletinResponse(
        id=b.id,
        title=b.title,
        topic=b.topic,
        brief=b.brief,
        target_duration_seconds=b.target_duration_seconds,
        language=b.language,
        tone=b.tone,
        bulletin_style=b.bulletin_style,
        source_mode=b.source_mode,
        selected_news_ids_json=b.selected_news_ids_json,
        status=b.status,
        job_id=b.job_id,
        composition_direction=b.composition_direction,
        thumbnail_direction=b.thumbnail_direction,
        template_id=b.template_id,
        style_blueprint_id=b.style_blueprint_id,
        render_mode=b.render_mode,
        subtitle_style=b.subtitle_style,
        lower_third_style=b.lower_third_style,
        trust_enforcement_level=b.trust_enforcement_level,
        content_project_id=b.content_project_id,
        channel_profile_id=b.channel_profile_id,
        created_at=b.created_at,
        updated_at=b.updated_at,
        has_script=script_row.scalar_one_or_none() is not None,
        has_metadata=meta_row.scalar_one_or_none() is not None,
        selected_news_count=selected_news_count,
        has_selected_news_warning=warning_count > 0,
        selected_news_warning_count=warning_count,
        selected_news_source_count=selected_news_source_count,
        has_selected_news_missing_source=has_selected_news_missing_source,
        selected_news_quality_complete_count=quality_complete_count,
        selected_news_quality_partial_count=quality_partial_count,
        selected_news_quality_weak_count=quality_weak_count,
    )


async def get_news_bulletin_enriched(
    db: AsyncSession, item_id: str
) -> Optional[NewsBulletinResponse]:
    """Bug #4 fix: single-bulletin GET with same enrichment as the list view."""
    bulletin = await get_news_bulletin(db, item_id)
    if bulletin is None:
        return None
    return await _enrich_bulletin(db, bulletin)


async def list_news_bulletins_with_artifacts(
    db: AsyncSession,
    status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    include_test_data: bool = False,
) -> List[NewsBulletinResponse]:
    """Return bulletin list enriched with has_script, has_metadata, selected_news_count, and warning aggregate."""
    bulletins = await list_news_bulletins(db, status=status, search=search, limit=limit, offset=offset, include_test_data=include_test_data)
    result = []
    for b in bulletins:
        result.append(await _enrich_bulletin(db, b))
    return result


async def clone_news_bulletin(
    db: AsyncSession, item_id: str
) -> Optional[NewsBulletin]:
    """
    Mevcut bir News Bulletin kaydini klonlar.

    Kopyalanan alanlar: topic, title, brief, target_duration_seconds,
                        language, tone, bulletin_style, source_mode
    Kopyalanmayan alanlar: id (yeni UUID), status (draft), job_id (None),
                           selected_news_ids_json (None), created_at/updated_at (yeni)
    Selected items, script, metadata kopyalanmaz — klonlanan kayit temiz draft olarak baslar.
    """
    source = await get_news_bulletin(db, item_id)
    if source is None:
        return None

    clone = NewsBulletin(
        topic=source.topic,
        title=f"{source.title or source.topic} (kopya)" if source.title else f"{source.topic} (kopya)",
        brief=source.brief,
        target_duration_seconds=source.target_duration_seconds,
        language=source.language,
        tone=source.tone,
        bulletin_style=source.bulletin_style,
        source_mode=source.source_mode,
        selected_news_ids_json=None,
        status="draft",
        job_id=None,
        composition_direction=source.composition_direction,
        thumbnail_direction=source.thumbnail_direction,
        template_id=source.template_id,
        style_blueprint_id=source.style_blueprint_id,
        render_mode=source.render_mode,
        subtitle_style=source.subtitle_style,
        lower_third_style=source.lower_third_style,
        trust_enforcement_level=source.trust_enforcement_level,
    )
    db.add(clone)
    await db.commit()
    await db.refresh(clone)
    return clone


async def get_news_bulletin(db: AsyncSession, item_id: str) -> Optional[NewsBulletin]:
    result = await db.execute(
        select(NewsBulletin).where(NewsBulletin.id == item_id)
    )
    return result.scalar_one_or_none()


async def create_news_bulletin(
    db: AsyncSession, payload: NewsBulletinCreate
) -> NewsBulletin:
    item = NewsBulletin(
        title=payload.title,
        topic=payload.topic,
        brief=payload.brief,
        target_duration_seconds=payload.target_duration_seconds,
        language=payload.language,
        tone=payload.tone,
        bulletin_style=payload.bulletin_style,
        source_mode=payload.source_mode,
        selected_news_ids_json=payload.selected_news_ids_json,
        status=payload.status or "draft",
        job_id=payload.job_id,
        composition_direction=payload.composition_direction,
        thumbnail_direction=payload.thumbnail_direction,
        template_id=payload.template_id,
        style_blueprint_id=payload.style_blueprint_id,
        render_mode=payload.render_mode or "combined",
        subtitle_style=payload.subtitle_style,
        lower_third_style=payload.lower_third_style,
        trust_enforcement_level=payload.trust_enforcement_level or "warn",
        content_project_id=payload.content_project_id,
        channel_profile_id=payload.channel_profile_id,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


async def update_news_bulletin(
    db: AsyncSession, item_id: str, payload: NewsBulletinUpdate
) -> Optional[NewsBulletin]:
    item = await get_news_bulletin(db, item_id)
    if item is None:
        return None
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(item, field, value)
    await db.commit()
    await db.refresh(item)
    return item


async def get_bulletin_script(
    db: AsyncSession, bulletin_id: str
) -> Optional[NewsBulletinScript]:
    result = await db.execute(
        select(NewsBulletinScript)
        .where(NewsBulletinScript.news_bulletin_id == bulletin_id)
        .order_by(NewsBulletinScript.version.desc())
    )
    return result.scalars().first()


async def create_bulletin_script(
    db: AsyncSession, bulletin_id: str, payload: NewsBulletinScriptCreate
) -> Optional[NewsBulletinScript]:
    bulletin = await get_news_bulletin(db, bulletin_id)
    if bulletin is None:
        return None
    script = NewsBulletinScript(
        news_bulletin_id=bulletin_id,
        content=payload.content,
        version=payload.version,
        source_type=payload.source_type,
        generation_status=payload.generation_status or "draft",
        notes=payload.notes,
    )
    db.add(script)
    await db.commit()
    await db.refresh(script)
    return script


async def update_bulletin_script(
    db: AsyncSession, bulletin_id: str, payload: NewsBulletinScriptUpdate
) -> Optional[NewsBulletinScript]:
    script = await get_bulletin_script(db, bulletin_id)
    if script is None:
        return None
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(script, field, value)
    await db.commit()
    await db.refresh(script)
    return script


async def get_bulletin_metadata(
    db: AsyncSession, bulletin_id: str
) -> Optional[NewsBulletinMetadata]:
    result = await db.execute(
        select(NewsBulletinMetadata)
        .where(NewsBulletinMetadata.news_bulletin_id == bulletin_id)
        .order_by(NewsBulletinMetadata.version.desc())
    )
    return result.scalars().first()


async def create_bulletin_metadata(
    db: AsyncSession, bulletin_id: str, payload: NewsBulletinMetadataCreate
) -> Optional[NewsBulletinMetadata]:
    bulletin = await get_news_bulletin(db, bulletin_id)
    if bulletin is None:
        return None
    meta = NewsBulletinMetadata(
        news_bulletin_id=bulletin_id,
        title=payload.title,
        description=payload.description,
        tags_json=payload.tags_json,
        category=payload.category,
        language=payload.language,
        version=payload.version,
        source_type=payload.source_type,
        generation_status=payload.generation_status or "draft",
        notes=payload.notes,
    )
    db.add(meta)
    await db.commit()
    await db.refresh(meta)
    return meta


async def update_bulletin_metadata(
    db: AsyncSession, bulletin_id: str, payload: NewsBulletinMetadataUpdate
) -> Optional[NewsBulletinMetadata]:
    meta = await get_bulletin_metadata(db, bulletin_id)
    if meta is None:
        return None
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(meta, field, value)
    await db.commit()
    await db.refresh(meta)
    return meta


async def list_bulletin_selected_items(
    db: AsyncSession, bulletin_id: str
) -> List[NewsBulletinSelectedItem]:
    result = await db.execute(
        select(NewsBulletinSelectedItem)
        .where(NewsBulletinSelectedItem.news_bulletin_id == bulletin_id)
        .order_by(NewsBulletinSelectedItem.sort_order.asc())
    )
    return list(result.scalars().all())


async def get_bulletin_selected_item(
    db: AsyncSession, selection_id: str
) -> Optional[NewsBulletinSelectedItem]:
    result = await db.execute(
        select(NewsBulletinSelectedItem).where(NewsBulletinSelectedItem.id == selection_id)
    )
    return result.scalar_one_or_none()


async def create_bulletin_selected_item(
    db: AsyncSession, bulletin_id: str, payload: NewsBulletinSelectedItemCreate
) -> Optional[NewsBulletinSelectedItem]:
    """Returns None if bulletin or news_item not found."""
    bulletin = await get_news_bulletin(db, bulletin_id)
    if bulletin is None:
        return None
    news_item = await db.execute(select(NewsItem).where(NewsItem.id == payload.news_item_id))
    if news_item.scalar_one_or_none() is None:
        return None
    item = NewsBulletinSelectedItem(
        news_bulletin_id=bulletin_id,
        news_item_id=payload.news_item_id,
        sort_order=payload.sort_order,
        selection_reason=payload.selection_reason,
    )
    db.add(item)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise
    await db.refresh(item)
    return item


async def update_bulletin_selected_item(
    db: AsyncSession, selection_id: str, payload: NewsBulletinSelectedItemUpdate
) -> Optional[NewsBulletinSelectedItem]:
    item = await get_bulletin_selected_item(db, selection_id)
    if item is None:
        return None
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(item, field, value)
    await db.commit()
    await db.refresh(item)
    return item


async def delete_bulletin_selected_item(
    db: AsyncSession, selection_id: str
) -> bool:
    """Delete a selected item by ID. Returns True if deleted, False if not found."""
    item = await get_bulletin_selected_item(db, selection_id)
    if item is None:
        return False
    await db.delete(item)
    await db.commit()
    return True


async def _fetch_news_item_info(db: AsyncSession, news_item_id: str) -> dict:
    """NewsItem'dan title ve category bilgisini çeker."""
    result = await db.execute(
        select(NewsItem.title, NewsItem.category).where(NewsItem.id == news_item_id)
    )
    row = result.first()
    if row:
        return {"news_title": row.title, "news_category": row.category}
    return {"news_title": None, "news_category": None}


async def list_bulletin_selected_items_with_enforcement(
    db: AsyncSession, bulletin_id: str
) -> List[NewsBulletinSelectedItemWithEnforcementResponse]:
    items = await list_bulletin_selected_items(db, bulletin_id)
    result = []
    for item in items:
        enforcement = await get_used_news_enforcement(db, item.news_item_id)
        news_info = await _fetch_news_item_info(db, item.news_item_id)
        result.append(
            NewsBulletinSelectedItemWithEnforcementResponse(
                id=item.id,
                news_bulletin_id=item.news_bulletin_id,
                news_item_id=item.news_item_id,
                sort_order=item.sort_order,
                selection_reason=item.selection_reason,
                edited_narration=item.edited_narration,
                created_at=item.created_at,
                updated_at=item.updated_at,
                **news_info,
                **enforcement,
            )
        )
    return result


async def create_bulletin_selected_item_with_enforcement(
    db: AsyncSession, bulletin_id: str, payload: NewsBulletinSelectedItemCreate
) -> Optional[NewsBulletinSelectedItemWithEnforcementResponse]:
    item = await create_bulletin_selected_item(db, bulletin_id, payload)
    if item is None:
        return None
    enforcement = await get_used_news_enforcement(db, item.news_item_id)
    news_info = await _fetch_news_item_info(db, item.news_item_id)
    return NewsBulletinSelectedItemWithEnforcementResponse(
        id=item.id,
        news_bulletin_id=item.news_bulletin_id,
        news_item_id=item.news_item_id,
        sort_order=item.sort_order,
        selection_reason=item.selection_reason,
        edited_narration=item.edited_narration,
        created_at=item.created_at,
        updated_at=item.updated_at,
        **news_info,
        **enforcement,
    )


# ---------------------------------------------------------------------------
# Start Production (M28)
# ---------------------------------------------------------------------------

async def start_production(
    db: AsyncSession,
    bulletin_id: str,
    dispatcher,
    session_factory,
    owner_id: Optional[str] = None,
) -> dict:
    """
    Bülten üretim pipeline'ını başlatır.

    Preconditions:
      - Bulletin.status == "in_progress" (consume_news geçilmiş olmalı)
      - En az 1 selected item olmalı

    Akış:
      1. Effective settings + prompt snapshot al
      2. Selected items snapshot al (headline, summary, edited_narration)
      3. Job oluştur (module_type="news_bulletin")
      4. Bulletin.job_id = job.id, Bulletin.status = "rendering"
      5. Dispatcher.dispatch(job_id) çağır
      6. Audit log yaz
      7. _watch_bulletin_job async task başlat

    Returns:
        dict: job_id, bulletin_id, bulletin_status, message

    Raises:
        ValueError: Precondition ihlali
    """
    from sqlalchemy import select as sa_select, update as sa_update
    from app.jobs.schemas import JobCreate
    from app.jobs.service import create_job
    from app.jobs.step_initializer import initialize_job_steps
    from app.modules.registry import module_registry
    from app.settings.settings_resolver import resolve, KNOWN_SETTINGS
    from app.audit.service import write_audit_log
    from app.db.models import User, Job

    bulletin = await get_news_bulletin(db, bulletin_id)
    if bulletin is None:
        raise ValueError(f"Bülten bulunamadı: {bulletin_id}")

    if bulletin.status != "in_progress":
        raise ValueError(
            f"Bülten status 'in_progress' olmalı, mevcut: '{bulletin.status}'. "
            f"Önce consume_news çağrılmalı."
        )

    # Selected items kontrolü
    selected_items = await list_bulletin_selected_items(db, bulletin_id)
    if not selected_items:
        raise ValueError("Seçilmiş haber öğesi yok. En az 1 haber seçilmiş olmalı.")

    # M31: Trust enforcement check
    trust_result = await check_trust_enforcement(db, bulletin_id)
    if not trust_result["pass"]:
        raise ValueError(
            f"Güvenilirlik engeli: {trust_result['message']} "
            f"trust_enforcement_level={trust_result['enforcement_level']}"
        )

    # Settings + prompt snapshot al
    snapshot_keys = [
        k for k in KNOWN_SETTINGS
        if k.startswith("news_bulletin.")
    ]
    settings_snapshot = {}
    for key in snapshot_keys:
        value = await resolve(key, db)
        if value is not None:
            settings_snapshot[key] = value
        else:
            # Builtin default kullan
            meta = KNOWN_SETTINGS.get(key, {})
            if meta.get("builtin_default") is not None:
                settings_snapshot[key] = meta["builtin_default"]

    # M40b: system.workspace_root ve system.output_dir snapshot'a ekle
    for sys_key in ("system.workspace_root", "system.output_dir"):
        sys_val = await resolve(sys_key, db, user_id=owner_id)
        if sys_val is not None:
            settings_snapshot[sys_key] = sys_val

    # Selected items snapshot (DB'den gelecek veriler pipeline boyunca değişmeyecek)
    from app.db.models import NewsSource
    items_snapshot = []
    for item in selected_items:
        # NewsItem'dan headline ve summary çek
        news_item_result = await db.execute(
            select(NewsItem).where(NewsItem.id == item.news_item_id)
        )
        news_item = news_item_result.scalar_one_or_none()

        # M41a: Çoklu görsel URL'leri (JSON array)
        image_urls_raw: list = []
        if news_item:
            urls_json = getattr(news_item, "image_urls_json", None)
            if urls_json:
                try:
                    parsed = json.loads(urls_json)
                    if isinstance(parsed, list):
                        image_urls_raw = parsed[:5]
                except (json.JSONDecodeError, TypeError):
                    pass
            # Fallback: tek image_url varsa onu kullan
            if not image_urls_raw:
                single_url = getattr(news_item, "image_url", None)
                if single_url:
                    image_urls_raw = [single_url]

        # M41a: Source name resolution (DB name → domain fallback)
        from app.modules.news_bulletin.executors.composition import resolve_source_domain_name
        source_name = None
        source_id = news_item.source_id if news_item else None
        if source_id:
            src_result = await db.execute(
                select(NewsSource).where(NewsSource.id == source_id)
            )
            source = src_result.scalar_one_or_none()
            if source:
                # Öncelik: DB'deki insan-okunur ad
                source_name = source.name or None
                # Fallback: domain'den türet
                if not source_name:
                    domain_url = source.base_url or source.feed_url or ""
                    if domain_url:
                        source_name = resolve_source_domain_name(domain_url) or None

        items_snapshot.append({
            "news_item_id": item.news_item_id,
            "sort_order": item.sort_order,
            "headline": news_item.title if news_item else "",
            "summary": news_item.summary if news_item else "",
            "title": news_item.title if news_item else "",
            "edited_narration": item.edited_narration,
            "category": news_item.category if news_item else None,
            # M41: haber görseli + yayın tarihi + kaynak bilgisi
            "image_url": getattr(news_item, "image_url", None) if news_item else None,
            # M41a: çoklu görsel
            "image_urls": image_urls_raw,
            "published_at": news_item.published_at.isoformat() if news_item and news_item.published_at else None,
            "source_id": source_id,
            # M41a: kaynak adı
            "source_name": source_name,
        })

    # Job input data
    input_data = {
        "bulletin_id": bulletin_id,
        "topic": bulletin.topic or "Haber Bülteni",
        "language": bulletin.language or settings_snapshot.get("news_bulletin.config.default_language", "tr"),
        "tone": bulletin.tone or settings_snapshot.get("news_bulletin.config.default_tone", "formal"),
        "target_duration_seconds": bulletin.target_duration_seconds or settings_snapshot.get("news_bulletin.config.default_duration_seconds", 120),
        "selected_items": items_snapshot,
        "composition_direction": bulletin.composition_direction,
        "thumbnail_direction": bulletin.thumbnail_direction,
        "template_id": bulletin.template_id,
        "style_blueprint_id": bulletin.style_blueprint_id,
        "render_mode": bulletin.render_mode or "combined",
        "subtitle_style": bulletin.subtitle_style,
        "lower_third_style": bulletin.lower_third_style,
        "trust_enforcement_level": bulletin.trust_enforcement_level or "warn",
        # M33: YTRobot visual style — bulletin_style from record, fallback to settings default
        "bulletin_style": bulletin.bulletin_style or settings_snapshot.get("news_bulletin.config.default_bulletin_style", "breaking"),
        "network_name": settings_snapshot.get("news_bulletin.config.network_name", "ContentHub Haber"),
        "show_ticker": settings_snapshot.get("news_bulletin.config.show_ticker", True),
        "ticker_items": None,  # auto-generated from headlines in composition
        "_settings_snapshot": settings_snapshot,
    }

    # M41a: Wizard-level render_format ve karaoke_enabled override
    # Bulletin modelinde açık seçim varsa settings snapshot'ı override et
    if getattr(bulletin, "render_format", None):
        input_data["_settings_snapshot"]["news_bulletin.config.render_format"] = bulletin.render_format
    if getattr(bulletin, "karaoke_enabled", None) is not None:
        input_data["_settings_snapshot"]["news_bulletin.config.karaoke_enabled"] = bulletin.karaoke_enabled

    # M42: user slug çözümle — workspace user-scoped olacak
    user_slug: Optional[str] = None
    if owner_id:
        user_row = (await db.execute(sa_select(User).where(User.id == owner_id))).scalar_one_or_none()
        user_slug = user_row.slug if user_row else None

    # Job oluştur — M40a: owner_id from active user, Faz 5a: project/channel linkage
    job_payload = JobCreate(
        module_type="news_bulletin",
        owner_id=owner_id,
        input_data_json=json.dumps(input_data, ensure_ascii=False),
        channel_profile_id=getattr(bulletin, "channel_profile_id", None),
        content_project_id=getattr(bulletin, "content_project_id", None),
    )
    job = await create_job(db, job_payload)

    # Bulletin güncelle
    bulletin.job_id = job.id
    bulletin.status = "rendering"

    # Faz 5a: ContentProject active_job_id güncelle
    _project_id = getattr(bulletin, "content_project_id", None)
    if _project_id:
        from app.db.models import ContentProject
        _proj = (await db.execute(sa_select(ContentProject).where(ContentProject.id == _project_id))).scalar_one_or_none()
        if _proj:
            _proj.active_job_id = job.id
            _proj.current_stage = "rendering"

    await db.commit()
    await db.refresh(bulletin)

    # Audit log
    await write_audit_log(
        db,
        action="bulletin.production.started",
        entity_type="news_bulletin",
        entity_id=bulletin_id,
        details={
            "job_id": job.id,
            "selected_items_count": len(items_snapshot),
            "language": input_data["language"],
            "tone": input_data["tone"],
            "trust_enforcement_level": bulletin.trust_enforcement_level or "warn",
            "trust_low_trust_item_count": len(trust_result.get("low_trust_items", [])),
        },
    )
    await db.commit()

    # Adımları ve workspace'i başlat — M42: user-scoped workspace
    ws_path = await initialize_job_steps(db, job.id, "news_bulletin", module_registry, user_slug=user_slug)

    # workspace_root ve user_slug'ı input_data'ya enjekte et — executor'lar bu path'i kullanır
    if ws_path:
        input_data["workspace_root"] = ws_path
        if user_slug:
            input_data["user_slug"] = user_slug
        await db.execute(
            sa_update(Job).where(Job.id == job.id).values(
                input_data_json=json.dumps(input_data, ensure_ascii=False),
            )
        )
        await db.commit()

    # Dispatch (arka planda pipeline başlat)
    await dispatcher.dispatch(job.id)

    # Watcher task — job tamamlandığında bulletin status'u güncelle
    asyncio.create_task(
        _watch_bulletin_job(
            session_factory=session_factory,
            bulletin_id=bulletin_id,
            job_id=job.id,
        )
    )

    logger.info(
        "start_production: bulletin=%s job=%s items=%d dispatched",
        bulletin_id, job.id, len(items_snapshot),
    )

    return {
        "job_id": job.id,
        "bulletin_id": bulletin_id,
        "bulletin_status": "rendering",
        "message": f"Üretim başlatıldı. {len(items_snapshot)} haber, job_id={job.id}",
    }


async def _watch_bulletin_job(
    session_factory,
    bulletin_id: str,
    job_id: str,
    poll_interval: float = 3.0,
    timeout: float = 1800.0,
) -> None:
    """
    Job tamamlanmasını izler ve bulletin status'unu günceller.

    Bu async task start_production tarafından oluşturulur.
    Job completed → bulletin.status = "done"
    Job failed → bulletin.status = "failed"
    """
    from app.audit.service import write_audit_log

    elapsed = 0.0
    while elapsed < timeout:
        await asyncio.sleep(poll_interval)
        elapsed += poll_interval

        async with session_factory() as db:
            from app.jobs.service import get_job
            job = await get_job(db, job_id)
            if job is None:
                logger.error(
                    "_watch_bulletin_job: job bulunamadı. job_id=%s bulletin_id=%s",
                    job_id, bulletin_id,
                )
                return

            if job.status == "completed":
                bulletin = await get_news_bulletin(db, bulletin_id)
                if bulletin and bulletin.status == "rendering":
                    bulletin.status = "done"
                    await write_audit_log(
                        db,
                        action="bulletin.production.completed",
                        entity_type="news_bulletin",
                        entity_id=bulletin_id,
                        details={"job_id": job_id},
                    )
                    await db.commit()
                    logger.info(
                        "_watch_bulletin_job: bulletin done. bulletin=%s job=%s",
                        bulletin_id, job_id,
                    )
                return

            if job.status == "failed":
                bulletin = await get_news_bulletin(db, bulletin_id)
                if bulletin and bulletin.status == "rendering":
                    bulletin.status = "failed"
                    await write_audit_log(
                        db,
                        action="bulletin.production.failed",
                        entity_type="news_bulletin",
                        entity_id=bulletin_id,
                        details={"job_id": job_id},
                    )
                    await db.commit()
                    logger.warning(
                        "_watch_bulletin_job: bulletin failed. bulletin=%s job=%s",
                        bulletin_id, job_id,
                    )
                return

    # Timeout
    logger.error(
        "_watch_bulletin_job: timeout (%.0fs). bulletin=%s job=%s — bulletin may be stuck in 'rendering'.",
        timeout, bulletin_id, job_id,
    )


# ---------------------------------------------------------------------------
# Trust Level Enforcement (M30)
# ---------------------------------------------------------------------------

async def check_trust_enforcement(
    db: AsyncSession,
    bulletin_id: str,
) -> dict:
    """
    Seçili haberlerin kaynak güvenilirlik düzeyini kontrol eder.

    Gate Sources Closure — trust_level artık tüm değerlerde anlamlı davranış
    üretir (low/medium/high). Önceki davranış: sadece 'low' flaglenirdi,
    'medium' ve 'high' ayırt edilmezdi. Yeni davranış:

      - ``low``    → always flagged as untrusted (blocks under level=block,
                     warns under level=warn)
      - ``medium`` → her zaman attention_items listesine eklenir; ``enforcement_level``
                     'warn' ya da 'block' altında block ETMEZ, ama mesajda
                     ayrı sayı ile raporlanır
      - ``high``   → clean — hiçbir listede görünmez
      - ``None``/unknown → ``low`` kabul edilir (conservative default)

    bulletin.trust_enforcement_level ayarı:
      - "none"  : kontrol yapılmaz, her zaman pass (breakdown yine döner)
      - "warn"  : düşük/orta güvenilirlikli kaynaklar rapor edilir, block yok
      - "block" : ``low`` varsa block; ``medium`` hala attention'da ama geçer

    Returns:
        dict: {
            "pass": bool,
            "enforcement_level": str,
            "low_trust_items": [...],          # trust_level='low' (geri uyumlu)
            "medium_trust_items": [...],       # trust_level='medium' (yeni)
            "trust_breakdown": {"low": N, "medium": N, "high": N, "unknown": N},
            "total_checked": int,
            "message": str,
        }
    """
    from app.db.models import NewsSource

    bulletin = await get_news_bulletin(db, bulletin_id)
    if bulletin is None:
        return {
            "pass": False,
            "enforcement_level": "unknown",
            "low_trust_items": [],
            "medium_trust_items": [],
            "trust_breakdown": {"low": 0, "medium": 0, "high": 0, "unknown": 0},
            "total_checked": 0,
            "message": "Bulletin bulunamadı.",
        }

    level = bulletin.trust_enforcement_level or "warn"

    # Seçili item'ları yükle
    selected_items = await list_bulletin_selected_items(db, bulletin_id)
    if not selected_items:
        return {
            "pass": True,
            "enforcement_level": level,
            "low_trust_items": [],
            "medium_trust_items": [],
            "trust_breakdown": {"low": 0, "medium": 0, "high": 0, "unknown": 0},
            "total_checked": 0,
            "message": "Seçili haber yok.",
        }

    low_trust_items: list[dict] = []
    medium_trust_items: list[dict] = []
    breakdown = {"low": 0, "medium": 0, "high": 0, "unknown": 0}

    for sel in selected_items:
        news_item = await db.execute(
            select(NewsItem).where(NewsItem.id == sel.news_item_id)
        )
        ni = news_item.scalar_one_or_none()
        if ni is None or ni.source_id is None:
            breakdown["unknown"] += 1
            continue

        source_result = await db.execute(
            select(NewsSource).where(NewsSource.id == ni.source_id)
        )
        source = source_result.scalar_one_or_none()
        if source is None:
            breakdown["unknown"] += 1
            continue

        tl = (source.trust_level or "low").lower()
        entry = {
            "news_item_id": sel.news_item_id,
            "source_id": source.id,
            "source_name": source.name,
            "trust_level": tl,
        }

        if tl == "low":
            breakdown["low"] += 1
            low_trust_items.append(entry)
        elif tl == "medium":
            breakdown["medium"] += 1
            medium_trust_items.append(entry)
        elif tl == "high":
            breakdown["high"] += 1
        else:
            # Bilinmeyen değer — konservatif davran: low olarak say ve flagle.
            breakdown["unknown"] += 1
            low_trust_items.append({**entry, "trust_level": tl or "unknown"})

    total_checked = len(selected_items)
    has_low_trust = len(low_trust_items) > 0
    has_medium_trust = len(medium_trust_items) > 0

    # enforcement_level=none → sadece breakdown dön, gate uygulama
    if level == "none":
        return {
            "pass": True,
            "enforcement_level": "none",
            "low_trust_items": low_trust_items,
            "medium_trust_items": medium_trust_items,
            "trust_breakdown": breakdown,
            "total_checked": total_checked,
            "message": (
                f"Güvenilirlik kontrolü devre dışı. "
                f"Dağılım: {breakdown['high']} yüksek, "
                f"{breakdown['medium']} orta, {breakdown['low']} düşük."
            ),
        }

    if level == "block" and has_low_trust:
        return {
            "pass": False,
            "enforcement_level": "block",
            "low_trust_items": low_trust_items,
            "medium_trust_items": medium_trust_items,
            "trust_breakdown": breakdown,
            "total_checked": total_checked,
            "message": (
                f"{len(low_trust_items)} düşük güvenilirlikli kaynak tespit edildi. "
                f"Üretim engellendi. Ayrıca {len(medium_trust_items)} orta güvenilirlikli "
                f"kaynak dikkat gerektiriyor."
            ),
        }

    if level == "warn" and (has_low_trust or has_medium_trust):
        parts = []
        if has_low_trust:
            parts.append(f"{len(low_trust_items)} düşük güvenilirlikli")
        if has_medium_trust:
            parts.append(f"{len(medium_trust_items)} orta güvenilirlikli")
        return {
            "pass": True,
            "enforcement_level": "warn",
            "low_trust_items": low_trust_items,
            "medium_trust_items": medium_trust_items,
            "trust_breakdown": breakdown,
            "total_checked": total_checked,
            "message": f"Uyarı: {' ve '.join(parts)} kaynak mevcut.",
        }

    return {
        "pass": True,
        "enforcement_level": level,
        "low_trust_items": [],
        "medium_trust_items": medium_trust_items,
        "trust_breakdown": breakdown,
        "total_checked": total_checked,
        "message": (
            f"Tüm kaynaklar güvenilir. "
            f"Dağılım: {breakdown['high']} yüksek, {breakdown['medium']} orta."
        ),
    }


# ---------------------------------------------------------------------------
# Category → Style Auto Mapping (M30)
# ---------------------------------------------------------------------------

# Controlled mapping — category string → suggested style_blueprint hints
# These are suggestions, not enforced. Admin can override via Settings Registry.
CATEGORY_STYLE_HINTS: dict[str, dict] = {
    "general": {
        "suggested_subtitle_style": "clean_white",
        "suggested_lower_third_style": "broadcast",
        "suggested_composition_direction": "classic",
    },
    "tech": {
        "suggested_subtitle_style": "gradient_glow",
        "suggested_lower_third_style": "modern",
        "suggested_composition_direction": "dynamic",
    },
    "finance": {
        "suggested_subtitle_style": "minimal_dark",
        "suggested_lower_third_style": "broadcast",
        "suggested_composition_direction": "side_by_side",
    },
    "crypto": {
        "suggested_subtitle_style": "gradient_glow",
        "suggested_lower_third_style": "modern",
        "suggested_composition_direction": "dynamic",
    },
    "sports": {
        "suggested_subtitle_style": "bold_yellow",
        "suggested_lower_third_style": "modern",
        "suggested_composition_direction": "fullscreen",
    },
    "entertainment": {
        "suggested_subtitle_style": "bold_yellow",
        "suggested_lower_third_style": "minimal",
        "suggested_composition_direction": "dynamic",
    },
}


def get_category_style_suggestion(category: Optional[str]) -> dict:
    """
    Kategori bazlı stil önerisi döner.

    Bilinmeyen veya None kategori → 'general' varsayılanı kullanılır.
    Bu bir öneri, zorunlu eşleme değil — wizard'da kullanıcıya gösterilir.

    Returns:
        dict: suggested_subtitle_style, suggested_lower_third_style,
              suggested_composition_direction, category_matched
    """
    if category and category in CATEGORY_STYLE_HINTS:
        result = dict(CATEGORY_STYLE_HINTS[category])
        result["category_matched"] = True
        result["category_used"] = category
        return result

    fallback = dict(CATEGORY_STYLE_HINTS["general"])
    fallback["category_matched"] = False
    fallback["category_used"] = "general"
    return fallback


def get_dominant_category(items_snapshot: list[dict]) -> Optional[str]:
    """
    Seçili haberlerin en sık kategorisini döner.

    items_snapshot: start_production tarafından hazırlanan item listesi
    Her item'da 'category' alanı olabilir.
    Eşit sayıda birden fazla kategori varsa ilk karşılaşılanı döner.
    """
    from collections import Counter
    categories = [
        item.get("category")
        for item in items_snapshot
        if item.get("category")
    ]
    if not categories:
        return None
    counter = Counter(categories)
    return counter.most_common(1)[0][0]
