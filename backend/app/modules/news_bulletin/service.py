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


async def list_news_bulletins(db: AsyncSession) -> List[NewsBulletin]:
    result = await db.execute(
        select(NewsBulletin).order_by(NewsBulletin.created_at.desc())
    )
    return list(result.scalars().all())


async def list_news_bulletins_with_artifacts(
    db: AsyncSession,
) -> List[NewsBulletinResponse]:
    """Return bulletin list enriched with has_script, has_metadata, selected_news_count, and warning aggregate."""
    from sqlalchemy import func as sqlfunc
    bulletins = await list_news_bulletins(db)
    result = []
    for b in bulletins:
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

        # Count selected items whose news_item_id appears in UsedNewsRegistry
        items_row = await db.execute(
            select(NewsBulletinSelectedItem.news_item_id)
            .where(NewsBulletinSelectedItem.news_bulletin_id == b.id)
        )
        news_item_ids = [row[0] for row in items_row.fetchall()]

        warning_count = 0
        selected_news_source_count = 0
        has_selected_news_missing_source = False
        if news_item_ids:
            warn_row = await db.execute(
                select(sqlfunc.count(sqlfunc.distinct(UsedNewsRegistry.news_item_id)))
                .where(UsedNewsRegistry.news_item_id.in_(news_item_ids))
            )
            warning_count = warn_row.scalar() or 0

            # Count distinct non-null source_ids among selected news items
            news_items_row = await db.execute(
                select(NewsItem.source_id)
                .where(NewsItem.id.in_(news_item_ids))
            )
            source_ids = [row[0] for row in news_items_row.fetchall()]
            distinct_sources = set(s for s in source_ids if s)
            selected_news_source_count = len(distinct_sources)
            has_selected_news_missing_source = any(s is None for s in source_ids)

        result.append(
            NewsBulletinResponse(
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
                created_at=b.created_at,
                updated_at=b.updated_at,
                has_script=script_row.scalar_one_or_none() is not None,
                has_metadata=meta_row.scalar_one_or_none() is not None,
                selected_news_count=selected_news_count,
                has_selected_news_warning=warning_count > 0,
                selected_news_warning_count=warning_count,
                selected_news_source_count=selected_news_source_count,
                has_selected_news_missing_source=has_selected_news_missing_source,
            )
        )
    return result


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


async def list_bulletin_selected_items_with_enforcement(
    db: AsyncSession, bulletin_id: str
) -> List[NewsBulletinSelectedItemWithEnforcementResponse]:
    items = await list_bulletin_selected_items(db, bulletin_id)
    result = []
    for item in items:
        enforcement = await get_used_news_enforcement(db, item.news_item_id)
        result.append(
            NewsBulletinSelectedItemWithEnforcementResponse(
                id=item.id,
                news_bulletin_id=item.news_bulletin_id,
                news_item_id=item.news_item_id,
                sort_order=item.sort_order,
                selection_reason=item.selection_reason,
                created_at=item.created_at,
                updated_at=item.updated_at,
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
    return NewsBulletinSelectedItemWithEnforcementResponse(
        id=item.id,
        news_bulletin_id=item.news_bulletin_id,
        news_item_id=item.news_item_id,
        sort_order=item.sort_order,
        selection_reason=item.selection_reason,
        created_at=item.created_at,
        updated_at=item.updated_at,
        **enforcement,
    )
