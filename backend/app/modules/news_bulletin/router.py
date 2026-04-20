import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.visibility.dependencies import require_visible, get_active_user_id
from app.auth.ownership import (
    UserContext,
    ensure_owner_or_admin,
    get_current_user_context,
)
from .schemas import (
    NewsBulletinCreate, NewsBulletinUpdate, NewsBulletinResponse,
    NewsBulletinScriptCreate, NewsBulletinScriptUpdate, NewsBulletinScriptResponse,
    NewsBulletinMetadataCreate, NewsBulletinMetadataUpdate, NewsBulletinMetadataResponse,
    NewsBulletinSelectedItemCreate, NewsBulletinSelectedItemUpdate, NewsBulletinSelectedItemResponse,
    NewsBulletinSelectedItemWithEnforcementResponse,
    StartProductionResponse,
)
from . import service
from .editorial_gate import (
    confirm_selection,
    consume_news,
    get_selectable_news_items,
    ConfirmSelectionResult,
    ConsumeNewsResult,
)


class ConfirmSelectionResponse(BaseModel):
    """
    POST /{id}/confirm-selection yanıt şeması.

    confirmed_count: onaylanan seçili item sayısı
    warning_items  : UsedNewsRegistry'de zaten kayıtlı item ID listesi
                     Uyarı — bloklamaz. Editorial editör bilgilendirme amaçlı.
    """
    success: bool
    bulletin_id: str
    confirmed_count: int
    warning_items: list[str] = []
    error: Optional[str] = None


class ConsumeNewsResponse(BaseModel):
    """
    POST /{id}/consume-news yanıt şeması.

    consumed_count: UsedNewsRegistry'ye yazılan, NewsItem.status='used' atanan sayı
    already_used  : zaten 'used' olan, atlanılan item ID listesi
    """
    success: bool
    bulletin_id: str
    consumed_count: int
    already_used: list[str] = []
    error: Optional[str] = None


class SelectableNewsItemResponse(BaseModel):
    """Seçime uygun haber item'ı."""
    id: str
    title: str
    url: str
    summary: Optional[str]
    source_id: Optional[str]
    source_name: Optional[str] = None
    category: Optional[str] = None
    published_at: Optional[str]
    created_at: Optional[str] = None
    language: Optional[str]

router = APIRouter(prefix="/modules/news-bulletin", tags=["news-bulletin"], dependencies=[Depends(require_visible("panel:news-bulletin"))])


@router.get("", response_model=List[NewsBulletinResponse])
async def list_news_bulletins(
    status: Optional[str] = Query(None, description="Durum filtresi"),
    search: Optional[str] = Query(None, description="Baslik/konu arama (case-insensitive)"),
    limit: int = Query(100, ge=1, le=500, description="Sayfalama limiti"),
    offset: int = Query(0, ge=0, description="Sayfalama offset'i"),
    include_test_data: bool = Query(False, description="Test/demo kayıtlarını dahil et (varsayılan: False)"),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_news_bulletins_with_artifacts(
        db, status=status, search=search, limit=limit, offset=offset, include_test_data=include_test_data,
    )


@router.get("/{item_id}", response_model=NewsBulletinResponse)
async def get_news_bulletin(item_id: str, db: AsyncSession = Depends(get_db)):
    # Bug #4 fix: single-bulletin GET de list endpoint ile aynı enriched
    # alanları (selected_news_count, has_script, warning_count, quality
    # breakdown vb.) döndürmeli ki UI tarafında veri tutarlı olsun.
    item = await service.get_news_bulletin_enriched(db, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="News bulletin not found")
    return item


@router.post("", response_model=NewsBulletinResponse, status_code=201)
async def create_news_bulletin(
    payload: NewsBulletinCreate, db: AsyncSession = Depends(get_db)
):
    return await service.create_news_bulletin(db, payload)


@router.post("/{item_id}/clone", response_model=NewsBulletinResponse, status_code=201)
async def clone_news_bulletin(
    item_id: str, db: AsyncSession = Depends(get_db)
):
    """Mevcut bir News Bulletin kaydini klonlar. Yeni bagimsiz draft kayit olusturur."""
    clone = await service.clone_news_bulletin(db, item_id)
    if clone is None:
        raise HTTPException(status_code=404, detail="Source news bulletin not found")
    return clone


@router.patch("/{item_id}", response_model=NewsBulletinResponse)
async def update_news_bulletin(
    item_id: str, payload: NewsBulletinUpdate, db: AsyncSession = Depends(get_db)
):
    item = await service.update_news_bulletin(db, item_id, payload)
    if item is None:
        raise HTTPException(status_code=404, detail="News bulletin not found")
    return item


@router.get("/{item_id}/script", response_model=NewsBulletinScriptResponse)
async def get_bulletin_script(item_id: str, db: AsyncSession = Depends(get_db)):
    script = await service.get_bulletin_script(db, item_id)
    if script is None:
        raise HTTPException(status_code=404, detail="Script not found")
    return script


@router.post("/{item_id}/script", response_model=NewsBulletinScriptResponse, status_code=201)
async def create_bulletin_script(
    item_id: str, payload: NewsBulletinScriptCreate, db: AsyncSession = Depends(get_db)
):
    script = await service.create_bulletin_script(db, item_id, payload)
    if script is None:
        raise HTTPException(status_code=404, detail="News bulletin not found")
    return script


@router.patch("/{item_id}/script", response_model=NewsBulletinScriptResponse)
async def update_bulletin_script(
    item_id: str, payload: NewsBulletinScriptUpdate, db: AsyncSession = Depends(get_db)
):
    script = await service.update_bulletin_script(db, item_id, payload)
    if script is None:
        raise HTTPException(status_code=404, detail="Script not found")
    return script


@router.get("/{item_id}/metadata", response_model=NewsBulletinMetadataResponse)
async def get_bulletin_metadata(item_id: str, db: AsyncSession = Depends(get_db)):
    meta = await service.get_bulletin_metadata(db, item_id)
    if meta is None:
        raise HTTPException(status_code=404, detail="Metadata not found")
    return meta


@router.post("/{item_id}/metadata", response_model=NewsBulletinMetadataResponse, status_code=201)
async def create_bulletin_metadata(
    item_id: str, payload: NewsBulletinMetadataCreate, db: AsyncSession = Depends(get_db)
):
    meta = await service.create_bulletin_metadata(db, item_id, payload)
    if meta is None:
        raise HTTPException(status_code=404, detail="News bulletin not found")
    return meta


@router.patch("/{item_id}/metadata", response_model=NewsBulletinMetadataResponse)
async def update_bulletin_metadata(
    item_id: str, payload: NewsBulletinMetadataUpdate, db: AsyncSession = Depends(get_db)
):
    meta = await service.update_bulletin_metadata(db, item_id, payload)
    if meta is None:
        raise HTTPException(status_code=404, detail="Metadata not found")
    return meta

@router.get("/{item_id}/selected-news", response_model=List[NewsBulletinSelectedItemWithEnforcementResponse])
async def list_bulletin_selected_items(item_id: str, db: AsyncSession = Depends(get_db)):
    bulletin = await service.get_news_bulletin(db, item_id)
    if bulletin is None:
        raise HTTPException(status_code=404, detail="News bulletin not found")
    return await service.list_bulletin_selected_items_with_enforcement(db, item_id)


@router.post("/{item_id}/selected-news", response_model=NewsBulletinSelectedItemWithEnforcementResponse, status_code=201)
async def create_bulletin_selected_item(
    item_id: str, payload: NewsBulletinSelectedItemCreate, db: AsyncSession = Depends(get_db)
):
    try:
        result = await service.create_bulletin_selected_item_with_enforcement(db, item_id, payload)
    except IntegrityError:
        raise HTTPException(status_code=409, detail="News item already selected for this bulletin")
    if result is None:
        raise HTTPException(status_code=404, detail="News bulletin or news item not found")
    return result


@router.patch("/{item_id}/selected-news/{selection_id}", response_model=NewsBulletinSelectedItemResponse)
async def update_bulletin_selected_item(
    item_id: str, selection_id: str, payload: NewsBulletinSelectedItemUpdate, db: AsyncSession = Depends(get_db)
):
    bulletin = await service.get_news_bulletin(db, item_id)
    if bulletin is None:
        raise HTTPException(status_code=404, detail="News bulletin not found")
    result = await service.update_bulletin_selected_item(db, selection_id, payload)
    if result is None:
        raise HTTPException(status_code=404, detail="Selected item not found")
    return result


@router.delete("/{item_id}/selected-news/{selection_id}", status_code=204)
async def delete_bulletin_selected_item(
    item_id: str, selection_id: str, db: AsyncSession = Depends(get_db)
):
    """Seçili haber öğesini kaldırır. Yalnızca 'draft' durumundaki bulletinlerde çalışır."""
    bulletin = await service.get_news_bulletin(db, item_id)
    if bulletin is None:
        raise HTTPException(status_code=404, detail="News bulletin not found")
    if bulletin.status != "draft":
        raise HTTPException(status_code=409, detail="Seçili haber yalnızca 'draft' bulletinlerden kaldırılabilir.")
    deleted = await service.delete_bulletin_selected_item(db, selection_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Selected item not found")
    return None


@router.post("/{item_id}/confirm-selection", response_model=ConfirmSelectionResponse)
async def confirm_bulletin_selection(
    item_id: str, db: AsyncSession = Depends(get_db)
):
    """
    Editorial seçim onay kapısı.

    Bulletin 'draft' durumunda olmalı ve en az bir seçili haber içermeli.
    Başarı: Bulletin.status = 'selection_confirmed'.
    NewsItem.status DEĞİŞMEZ — seçim state'e çevrilmez.
    warning_items: daha önce kullanılmış haberler (uyarı, bloklamaz).
    """
    result: ConfirmSelectionResult = await confirm_selection(db, item_id)
    if not result.success:
        status_code = 404 if "bulunamadı" in (result.error or "") else 409
        raise HTTPException(status_code=status_code, detail=result.error)
    return ConfirmSelectionResponse(
        success=result.success,
        bulletin_id=result.bulletin_id,
        confirmed_count=result.confirmed_count,
        warning_items=result.warning_items,
    )


@router.post("/{item_id}/consume-news", response_model=ConsumeNewsResponse)
async def consume_bulletin_news(
    item_id: str, db: AsyncSession = Depends(get_db)
):
    """
    Haber tüketim işlemi — 'used' state tam burada kazanılır.

    Yalnızca 'selection_confirmed' bulletinlerde çalışır.
    Her seçili haber için:
      - UsedNewsRegistry kaydı yazılır.
      - NewsItem.status = 'used' atanır.
    Bulletin.status = 'in_progress' geçişi yapılır.
    already_used: zaten 'used' olan haberler (atlandı).
    """
    result: ConsumeNewsResult = await consume_news(db, item_id)
    if not result.success:
        status_code = 404 if "bulunamadı" in (result.error or "") else 409
        raise HTTPException(status_code=status_code, detail=result.error)
    return ConsumeNewsResponse(
        success=result.success,
        bulletin_id=result.bulletin_id,
        consumed_count=result.consumed_count,
        already_used=result.already_used,
    )


@router.get("/{item_id}/selectable-news", response_model=List[SelectableNewsItemResponse])
async def list_selectable_news(
    item_id: str,
    source_id: Optional[str] = Query(None),
    language: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    """
    Seçime uygun haberler — status='new' olan NewsItem kayıtları.

    deduped item bu listede yoktur (scan sırasında DB'ye yazılmamıştır).
    follow-up accepted item'lar bu listede görünür (status='new' ile yazılmıştır).
    """
    bulletin = await service.get_news_bulletin(db, item_id)
    if bulletin is None:
        raise HTTPException(status_code=404, detail="News bulletin not found")
    items = await get_selectable_news_items(db, source_id=source_id, language=language, category=category, limit=limit)
    return [
        SelectableNewsItemResponse(
            id=i["id"],
            title=i["title"],
            url=i["url"],
            summary=i["summary"],
            source_id=i["source_id"],
            source_name=i.get("source_name"),
            category=i.get("category"),
            published_at=str(i["published_at"]) if i["published_at"] else None,
            created_at=str(i["created_at"]) if i.get("created_at") else None,
            language=i["language"],
        )
        for i in items
    ]


@router.post("/{item_id}/start-production", response_model=StartProductionResponse)
async def start_production_endpoint(
    item_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user_id: Optional[str] = Depends(get_active_user_id),
    ctx: UserContext = Depends(get_current_user_context),
):
    """
    Bülten üretim pipeline'ını başlatır (M28).

    Preconditions:
      - Bulletin.status == "in_progress" (consume_news geçilmiş olmalı)
      - En az 1 selected item olmalı

    Ownership (PHASE AE tamamlama):
      NewsBulletin kaydinda dogrudan owner alani yok; kayit bir
      content_project'e bagli ise projenin sahipligi zorla kontrol edilir.
      Projesi yok (orphan) ise admin disinda kimse uretim baslatamaz.

    Job oluşturur, dispatcher'a gönderir, bulletin.status = "rendering" yapar.
    """
    # PHASE AE tamamlama: content_project uzerinden ownership gate.
    from app.publish.ownership import ensure_content_project_ownership
    bulletin_row = await service.get_news_bulletin(db, item_id)
    if bulletin_row is None:
        raise HTTPException(status_code=404, detail="Bulten bulunamadi")
    if bulletin_row.content_project_id:
        await ensure_content_project_ownership(db, bulletin_row.content_project_id, ctx)
    elif not ctx.is_admin:
        raise HTTPException(
            status_code=403,
            detail="Bu bulten orphan (proje yok); yalnizca admin uretim baslatabilir",
        )

    dispatcher = getattr(request.app.state, "job_dispatcher", None)
    if dispatcher is None:
        raise HTTPException(status_code=503, detail="JobDispatcher hazır değil.")

    session_factory = getattr(request.app.state, "session_factory", None)
    if session_factory is None:
        # Fallback: get_db session factory'den kullan
        from app.db.session import AsyncSessionLocal
        session_factory = AsyncSessionLocal

    try:
        result = await service.start_production(
            db=db,
            bulletin_id=item_id,
            dispatcher=dispatcher,
            session_factory=session_factory,
            owner_id=user_id,
        )
    except ValueError as err:
        error_msg = str(err)
        if "Güvenilirlik engeli" in error_msg:
            raise HTTPException(status_code=422, detail=error_msg)
        raise HTTPException(status_code=400, detail=error_msg)

    return StartProductionResponse(**result)


@router.post(
    "/{item_id}/update-and-start-production",
    response_model=StartProductionResponse,
)
async def update_and_start_production_endpoint(
    item_id: str,
    payload: NewsBulletinUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user_id: Optional[str] = Depends(get_active_user_id),
    ctx: UserContext = Depends(get_current_user_context),
):
    """
    Atomik 'başlat' endpoint'i: wizard son adımında bülten alanlarını (stil,
    şablon, render formatı vb.) günceller VE üretim pipeline'ını başlatır.

    Neden ayrı endpoint:
      Önceki akış iki aşamalıydı — PATCH /modules/news-bulletin/{id} ardından
      POST /modules/news-bulletin/{id}/start-production. İkinci çağrı
      başarısız olursa kayıt güncellenmiş ama iş başlamamış olarak kalıyor,
      UI'da 'başlatıldı' yanılgısı yaratıyor ve kullanıcı tekrar denerken
      başka hatalarla karşılaşıyor.

      Bu endpoint iki adımı tek transaction mantığı ile yürütür: dispatch
      başarısız olursa güncellenen alanlar eski haline geri döner.
    """
    # Ownership gate — start_production ile aynı kural.
    from app.publish.ownership import ensure_content_project_ownership
    bulletin_row = await service.get_news_bulletin(db, item_id)
    if bulletin_row is None:
        raise HTTPException(status_code=404, detail="Bulten bulunamadi")
    if bulletin_row.content_project_id:
        await ensure_content_project_ownership(db, bulletin_row.content_project_id, ctx)
    elif not ctx.is_admin:
        raise HTTPException(
            status_code=403,
            detail="Bu bulten orphan (proje yok); yalnizca admin uretim baslatabilir",
        )

    dispatcher = getattr(request.app.state, "job_dispatcher", None)
    if dispatcher is None:
        raise HTTPException(status_code=503, detail="JobDispatcher hazır değil.")

    session_factory = getattr(request.app.state, "session_factory", None)
    if session_factory is None:
        from app.db.session import AsyncSessionLocal
        session_factory = AsyncSessionLocal

    try:
        result = await service.update_and_start_production(
            db=db,
            bulletin_id=item_id,
            payload=payload,
            dispatcher=dispatcher,
            session_factory=session_factory,
            owner_id=user_id,
        )
    except ValueError as err:
        error_msg = str(err)
        if "Güvenilirlik engeli" in error_msg:
            raise HTTPException(status_code=422, detail=error_msg)
        raise HTTPException(status_code=400, detail=error_msg)

    return StartProductionResponse(**result)


# ---------------------------------------------------------------------------
# Publish adapter — create/lookup PublishRecord for a bulletin
# (Generic publish core untouched; this is a thin shim that attaches the
# bulletin context before delegating to publish.service.)
# ---------------------------------------------------------------------------

class PublishRecordShim(BaseModel):
    """Subset of PublishRecord we expose through the bulletin shim."""
    id: str
    job_id: Optional[str] = None
    content_ref_type: str
    content_ref_id: Optional[str] = None
    content_project_id: Optional[str] = None
    platform: str
    status: str
    review_state: Optional[str] = None
    payload_json: Optional[str] = None
    publish_intent_json: Optional[str] = None
    notes: Optional[str] = None


class CreateBulletinPublishRecordRequest(BaseModel):
    platform: str = "youtube"
    platform_connection_id: Optional[str] = None


@router.post(
    "/{item_id}/publish-record",
    response_model=PublishRecordShim,
    status_code=201,
)
async def create_bulletin_publish_record(
    item_id: str,
    payload: Optional[CreateBulletinPublishRecordRequest] = None,
    db: AsyncSession = Depends(get_db),
    ctx: UserContext = Depends(get_current_user_context),
):
    """
    Create a PublishRecord for a completed news bulletin.

    Preconditions:
      * Bulletin exists and has a ``job_id`` (pipeline ran).
      * No live PublishRecord for this bulletin/platform combination.

    PHASE AD: enforces ownership via the linked ContentProject.
    Non-admin users may only publish bulletins that belong to a project
    they own; orphan bulletins (no project) are admin-only.

    The underlying payload (title/description/tags) is assembled by
    ``publish.service.create_publish_record_from_job`` from the
    ``metadata.json`` artifact that the metadata step wrote — which is
    already formatted with chapters + source citations.

    Returns 409 when a draft/pending record already exists for this
    bulletin on the same platform — duplicates are rejected here, not
    fixed up silently.
    """
    from app.publish import service as publish_service
    from app.db.models import ContentProject

    bulletin = await service.get_news_bulletin(db, item_id)
    if bulletin is None:
        raise HTTPException(status_code=404, detail="News bulletin not found")
    if not bulletin.job_id:
        raise HTTPException(
            status_code=422,
            detail="Bülten henüz üretilmedi (job_id yok). Önce start-production.",
        )

    # PHASE AD: Ownership gate — non-admin must own the linked project.
    if not ctx.is_admin:
        if bulletin.content_project_id is None:
            raise HTTPException(
                status_code=403,
                detail="Bu bülten bir projeye bağlı değil; yalnızca admin yayınlayabilir.",
            )
        project = await db.get(ContentProject, bulletin.content_project_id)
        ensure_owner_or_admin(
            ctx,
            getattr(project, "user_id", None) if project else None,
            not_found_on_missing=True,
            resource_label="proje",
        )

    user_id = ctx.user_id

    request_body = payload or CreateBulletinPublishRecordRequest()
    platform = (request_body.platform or "youtube").strip().lower()

    # Duplicate guard — per bulletin + platform.
    existing = await publish_service.list_publish_records(
        db,
        job_id=bulletin.job_id,
        platform=platform,
        content_ref_type="news_bulletin",
        limit=50,
        offset=0,
    )
    # Consider anything that is not terminally failed/cancelled as "live".
    live_statuses = {
        "draft", "pending_review", "approved", "scheduled",
        "publishing", "published",
    }
    for record in existing:
        if (record.content_ref_id == item_id
                and record.status in live_statuses):
            raise HTTPException(
                status_code=409,
                detail={
                    "error": "publish_record_exists",
                    "message": (
                        "Bu bülten için aynı platformda aktif bir publish "
                        "kaydı var."
                    ),
                    "publish_record_id": record.id,
                    "status": record.status,
                },
            )

    record = await publish_service.create_publish_record_from_job(
        session=db,
        job_id=bulletin.job_id,
        platform=platform,
        content_ref_type="news_bulletin",
        content_ref_id=item_id,
        actor_id=user_id,
        content_project_id=bulletin.content_project_id,
        platform_connection_id=request_body.platform_connection_id,
    )

    # Publish Core Hardening Pack — Gate 2:
    # The generic publish core now reads `{workspace}/artifacts/metadata.json`
    # first, which matches where the news_bulletin pipeline writes.
    # Keep a best-effort DB-row fallback in case the artifact was unreadable
    # but the metadata row was persisted — fills only missing keys.
    try:
        bulletin_metadata = await service.get_bulletin_metadata(db, item_id)
    except Exception:  # pragma: no cover — defensive
        bulletin_metadata = None

    if bulletin_metadata is not None:
        try:
            current_payload = (
                json.loads(record.payload_json) if record.payload_json else {}
            )
        except (TypeError, ValueError):
            current_payload = {}

        mutated = False
        if bulletin_metadata.title and not current_payload.get("title"):
            current_payload["title"] = bulletin_metadata.title
            mutated = True
        if bulletin_metadata.description and not current_payload.get("description"):
            current_payload["description"] = bulletin_metadata.description
            mutated = True
        if not current_payload.get("tags") and bulletin_metadata.tags_json:
            try:
                tags_payload = json.loads(bulletin_metadata.tags_json)
            except ValueError:
                tags_payload = None
            if tags_payload:
                current_payload["tags"] = tags_payload
                mutated = True
        if bulletin_metadata.category and not current_payload.get("category"):
            current_payload["category"] = bulletin_metadata.category
            mutated = True
        if bulletin_metadata.language and not current_payload.get("language"):
            current_payload["language"] = bulletin_metadata.language
            mutated = True

        if mutated:
            record.payload_json = json.dumps(current_payload, ensure_ascii=False)
            publish_intent = {
                k: current_payload[k]
                for k in ("title", "description", "tags")
                if k in current_payload
            }
            record.publish_intent_json = json.dumps(
                publish_intent, ensure_ascii=False
            )
            await db.commit()
            await db.refresh(record)

    return PublishRecordShim(
        id=record.id,
        job_id=record.job_id,
        content_ref_type=record.content_ref_type,
        content_ref_id=record.content_ref_id,
        content_project_id=getattr(record, "content_project_id", None),
        platform=record.platform,
        status=record.status,
        review_state=getattr(record, "review_state", None),
        payload_json=record.payload_json,
        publish_intent_json=getattr(record, "publish_intent_json", None),
        notes=record.notes,
    )


# ---------------------------------------------------------------------------
# Trust enforcement check (M30)
# ---------------------------------------------------------------------------

class TrustCheckResponse(BaseModel):
    """Kaynak güvenilirlik kontrol sonucu.

    Gate Sources Closure — medium_trust_items ve trust_breakdown eklendi.
    trust_level low/medium/high ayırt ediliyor; medium warn altında uyarılıyor,
    block altında sadece low bloklar.
    """
    pass_check: bool
    enforcement_level: str
    low_trust_items: list[dict] = []
    medium_trust_items: list[dict] = []
    trust_breakdown: dict = {}
    total_checked: int = 0
    message: str = ""


@router.get("/{item_id}/trust-check", response_model=TrustCheckResponse)
async def check_trust(
    item_id: str, db: AsyncSession = Depends(get_db)
):
    """
    Seçili haberlerin kaynak güvenilirlik kontrolü (M30 + Gate Sources Closure).

    bulletin.trust_enforcement_level ayarına göre:
      - none: kontrol yapılmaz (breakdown yine döner)
      - warn: düşük VE orta güvenilirlikli kaynaklar uyarı olarak raporlanır
      - block: düşük güvenilirlikli kaynak varsa blok; orta geçer ama surface'lenir
    """
    bulletin = await service.get_news_bulletin(db, item_id)
    if bulletin is None:
        raise HTTPException(status_code=404, detail="News bulletin not found")
    result = await service.check_trust_enforcement(db, item_id)
    return TrustCheckResponse(
        pass_check=result["pass"],
        enforcement_level=result["enforcement_level"],
        low_trust_items=result["low_trust_items"],
        medium_trust_items=result.get("medium_trust_items", []),
        trust_breakdown=result.get("trust_breakdown", {}),
        total_checked=result["total_checked"],
        message=result["message"],
    )


# ---------------------------------------------------------------------------
# Category → Style suggestion (M30)
# ---------------------------------------------------------------------------

class CategoryStyleSuggestionResponse(BaseModel):
    """Kategori bazlı stil önerisi."""
    suggested_subtitle_style: str
    suggested_lower_third_style: str
    suggested_composition_direction: str
    category_matched: bool
    category_used: str
    dominant_category: Optional[str] = None


@router.get("/{item_id}/category-style-suggestion", response_model=CategoryStyleSuggestionResponse)
async def get_category_style_suggestion_endpoint(
    item_id: str, db: AsyncSession = Depends(get_db)
):
    """
    Seçili haberlerin baskın kategorisine göre stil önerisi (M30).

    Baskın kategori yoksa 'general' varsayılanı kullanılır.
    Sonuç bir öneri — zorunlu değil.
    """
    bulletin = await service.get_news_bulletin(db, item_id)
    if bulletin is None:
        raise HTTPException(status_code=404, detail="News bulletin not found")

    # Seçili item'ların kategorilerini topla
    selected_items = await service.list_bulletin_selected_items(db, item_id)
    items_data = []
    for sel in selected_items:
        from sqlalchemy import select as sa_select
        from app.db.models import NewsItem
        ni_row = await db.execute(sa_select(NewsItem).where(NewsItem.id == sel.news_item_id))
        ni = ni_row.scalar_one_or_none()
        if ni:
            items_data.append({"category": ni.category})

    dominant = service.get_dominant_category(items_data)
    suggestion = service.get_category_style_suggestion(dominant)

    return CategoryStyleSuggestionResponse(
        suggested_subtitle_style=suggestion["suggested_subtitle_style"],
        suggested_lower_third_style=suggestion["suggested_lower_third_style"],
        suggested_composition_direction=suggestion["suggested_composition_direction"],
        category_matched=suggestion["category_matched"],
        category_used=suggestion["category_used"],
        dominant_category=dominant,
    )
