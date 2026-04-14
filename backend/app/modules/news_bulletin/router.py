from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.visibility.dependencies import require_visible, get_active_user_id
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
):
    """
    Bülten üretim pipeline'ını başlatır (M28).

    Preconditions:
      - Bulletin.status == "in_progress" (consume_news geçilmiş olmalı)
      - En az 1 selected item olmalı

    Job oluşturur, dispatcher'a gönderir, bulletin.status = "rendering" yapar.
    """
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


# ---------------------------------------------------------------------------
# Trust enforcement check (M30)
# ---------------------------------------------------------------------------

class TrustCheckResponse(BaseModel):
    """Kaynak güvenilirlik kontrol sonucu."""
    pass_check: bool
    enforcement_level: str
    low_trust_items: list[dict] = []
    total_checked: int = 0
    message: str = ""


@router.get("/{item_id}/trust-check", response_model=TrustCheckResponse)
async def check_trust(
    item_id: str, db: AsyncSession = Depends(get_db)
):
    """
    Seçili haberlerin kaynak güvenilirlik kontrolü (M30).

    bulletin.trust_enforcement_level ayarına göre:
      - none: kontrol yapılmaz
      - warn: düşük güvenilirlikli kaynaklar uyarı olarak raporlanır
      - block: düşük güvenilirlikli kaynak varsa blok
    """
    bulletin = await service.get_news_bulletin(db, item_id)
    if bulletin is None:
        raise HTTPException(status_code=404, detail="News bulletin not found")
    result = await service.check_trust_enforcement(db, item_id)
    return TrustCheckResponse(
        pass_check=result["pass"],
        enforcement_level=result["enforcement_level"],
        low_trust_items=result["low_trust_items"],
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
