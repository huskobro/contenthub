"""
product_review HTTP router.

Endpoints:

  Products
    POST   /products                       — Urun yarat (idempotent by canonical_url)
    GET    /products                       — Liste (arama + pagination)
    GET    /products/{id}                  — Tek urun
    DELETE /products/{id}                  — Urun sil (baglantili review varsa 409)
    POST   /products/{id}/scrape           — Tek seferlik scrape tetikle (inline)
    GET    /products/{id}/snapshots        — Son snapshot'lar

  ProductReviews
    POST   /product-reviews                — Review kaydi yarat
    GET    /product-reviews                — Liste
    GET    /product-reviews/{id}           — Tek review
    DELETE /product-reviews/{id}           — Sil (job_id varsa 409)

Notlar:
  - Router sadece HTTP — kurallar service'te.
  - Visibility key: `panel:product_review` (Faz F'te visibility registry'e ekli).
  - Auth: api/router.py icinde `require_user` ile sarilacak.
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.ownership import (
    UserContext,
    ensure_owner_or_admin,
    get_current_user_context,
)
from app.db.models import ContentProject
from app.db.session import get_db
from app.modules.product_review import schemas, service

router = APIRouter(
    prefix="/product-review",
    tags=["product_review"],
)


class StartProductionResponse(BaseModel):
    job_id: str
    review_id: str
    message: str


class StartProductionRequest(BaseModel):
    content_project_id: Optional[str] = None
    channel_profile_id: Optional[str] = None


class PublishRecordShim(BaseModel):
    id: str
    job_id: str
    content_ref_type: str
    content_ref_id: str
    content_project_id: Optional[str] = None
    platform: str
    status: str
    review_state: Optional[str] = None
    payload_json: Optional[str] = None
    publish_intent_json: Optional[str] = None
    notes: Optional[str] = None


class CreateReviewPublishRecordRequest(BaseModel):
    platform: str = "youtube"
    platform_connection_id: Optional[str] = None


# ---------------------------------------------------------------------------
# Products
# ---------------------------------------------------------------------------


@router.post(
    "/products",
    response_model=schemas.ProductResponse,
    status_code=201,
)
async def create_product(
    payload: schemas.ProductCreate,
    db: AsyncSession = Depends(get_db),
):
    prod, created = await service.create_product(db, payload)
    # Idempotent: ayni canonical_url varsa 200 donulsun — ama FastAPI
    # status_code=201 sabit. Header ile sinyal veriyoruz.
    return schemas.ProductResponse.model_validate(prod)


@router.get("/products", response_model=schemas.ProductListResponse)
async def list_products(
    search: Optional[str] = Query(None),
    include_test_data: bool = Query(False),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    items, total = await service.list_products(
        db,
        search=search,
        include_test_data=include_test_data,
        limit=limit,
        offset=offset,
    )
    return schemas.ProductListResponse(
        items=[schemas.ProductResponse.model_validate(i) for i in items],
        total=total,
        offset=offset,
        limit=limit,
    )


@router.get("/products/{product_id}", response_model=schemas.ProductResponse)
async def get_product(product_id: str, db: AsyncSession = Depends(get_db)):
    prod = await service.get_product(db, product_id)
    if prod is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return schemas.ProductResponse.model_validate(prod)


@router.delete("/products/{product_id}", status_code=204)
async def delete_product(product_id: str, db: AsyncSession = Depends(get_db)):
    try:
        deleted = await service.delete_product(db, product_id)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    if not deleted:
        raise HTTPException(status_code=404, detail="Product not found")


@router.post(
    "/products/{product_id}/scrape",
    response_model=schemas.ProductScrapeTriggerResponse,
)
async def trigger_product_scrape(
    product_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Tek seferlik scrape tetikle. Network fetch inline calisir — job acmaz."""
    result = await service.trigger_scrape(db, product_id)
    if result.status == "failed" and result.error == "product_not_found":
        raise HTTPException(status_code=404, detail="Product not found")
    return result


@router.get(
    "/products/{product_id}/snapshots",
    response_model=list[schemas.ProductSnapshotResponse],
)
async def list_product_snapshots(
    product_id: str,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    prod = await service.get_product(db, product_id)
    if prod is None:
        raise HTTPException(status_code=404, detail="Product not found")
    items, _ = await service.list_product_snapshots(
        db, product_id, limit=limit, offset=offset
    )
    return [schemas.ProductSnapshotResponse.model_validate(s) for s in items]


# ---------------------------------------------------------------------------
# ProductReviews
# ---------------------------------------------------------------------------


@router.post(
    "/product-reviews",
    response_model=schemas.ProductReviewResponse,
    status_code=201,
)
async def create_product_review(
    payload: schemas.ProductReviewCreate,
    db: AsyncSession = Depends(get_db),
):
    try:
        row = await service.create_product_review(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return schemas.ProductReviewResponse.model_validate(row)


@router.get(
    "/product-reviews",
    response_model=list[schemas.ProductReviewResponse],
)
async def list_product_reviews(
    template_type: Optional[str] = Query(None),
    include_test_data: bool = Query(False),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    items, _ = await service.list_product_reviews(
        db,
        template_type=template_type,
        include_test_data=include_test_data,
        limit=limit,
        offset=offset,
    )
    return [schemas.ProductReviewResponse.model_validate(r) for r in items]


@router.get(
    "/product-reviews/{review_id}",
    response_model=schemas.ProductReviewResponse,
)
async def get_product_review(review_id: str, db: AsyncSession = Depends(get_db)):
    row = await service.get_product_review(db, review_id)
    if row is None:
        raise HTTPException(status_code=404, detail="ProductReview not found")
    return schemas.ProductReviewResponse.model_validate(row)


@router.delete("/product-reviews/{review_id}", status_code=204)
async def delete_product_review(review_id: str, db: AsyncSession = Depends(get_db)):
    try:
        deleted = await service.delete_product_review(db, review_id)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    if not deleted:
        raise HTTPException(status_code=404, detail="ProductReview not found")


# ---------------------------------------------------------------------------
# PHASE AD — Production + Publish shim
# ---------------------------------------------------------------------------


@router.post(
    "/product-reviews/{review_id}/start-production",
    response_model=StartProductionResponse,
)
async def start_review_production(
    review_id: str,
    request: Request,
    payload: Optional[StartProductionRequest] = None,
    db: AsyncSession = Depends(get_db),
    ctx: UserContext = Depends(get_current_user_context),
):
    """
    Product Review uretim pipeline'ini baslatir (PHASE AD).

    Preconditions:
      * ProductReview kaydi mevcut olmali
      * Review.job_id daha once set edilmemis olmali (her review tek job)

    Ownership: non-admin kullanicilar yalnizca sahip olduklari kayitlari
    baslatabilir (owner_user_id == ctx.user_id). Eger `content_project_id`
    verilirse o proje de ayni kullaniciya ait olmali.
    """
    # Ownership gate must run BEFORE dispatcher readiness so cross-user
    # forbidden attempts return 403 even when infra is down.
    review = await service.get_product_review(db, review_id)
    if review is None:
        raise HTTPException(status_code=404, detail="ProductReview not found")

    if not ctx.is_admin:
        ensure_owner_or_admin(
            ctx,
            getattr(review, "owner_user_id", None),
            resource_label="incelemenin",
        )

    body = payload or StartProductionRequest()
    if body.content_project_id and not ctx.is_admin:
        project = await db.get(ContentProject, body.content_project_id)
        ensure_owner_or_admin(
            ctx,
            getattr(project, "user_id", None) if project else None,
            not_found_on_missing=True,
            resource_label="proje",
        )

    dispatcher = getattr(request.app.state, "job_dispatcher", None)
    if dispatcher is None:
        raise HTTPException(status_code=503, detail="JobDispatcher hazir degil.")

    session_factory = getattr(request.app.state, "session_factory", None)
    if session_factory is None:
        from app.db.session import AsyncSessionLocal

        session_factory = AsyncSessionLocal

    try:
        result = await service.start_production(
            db,
            review_id=review_id,
            dispatcher=dispatcher,
            session_factory=session_factory,
            owner_id=ctx.user_id,
            content_project_id=body.content_project_id,
            channel_profile_id=body.channel_profile_id,
        )
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))

    return StartProductionResponse(**result)


@router.post(
    "/product-reviews/{review_id}/publish-record",
    response_model=PublishRecordShim,
    status_code=201,
)
async def create_review_publish_record(
    review_id: str,
    payload: Optional[CreateReviewPublishRecordRequest] = None,
    db: AsyncSession = Depends(get_db),
    ctx: UserContext = Depends(get_current_user_context),
):
    """
    Create a PublishRecord for a completed product review (PHASE AD).

    Preconditions:
      * Review exists and has a ``job_id`` (pipeline ran).
      * No live PublishRecord for this review + platform combination.

    Ownership: non-admin users may only publish reviews they own.
    """
    from app.publish import service as publish_service

    review = await service.get_product_review(db, review_id)
    if review is None:
        raise HTTPException(status_code=404, detail="ProductReview not found")
    if not review.job_id:
        raise HTTPException(
            status_code=422,
            detail="Review henuz uretilmedi (job_id yok). Once start-production.",
        )

    if not ctx.is_admin:
        ensure_owner_or_admin(
            ctx,
            getattr(review, "owner_user_id", None),
            resource_label="incelemenin",
        )

    body = payload or CreateReviewPublishRecordRequest()
    platform = (body.platform or "youtube").strip().lower()

    # Duplicate guard — per review + platform.
    existing = await publish_service.list_publish_records(
        db,
        job_id=review.job_id,
        platform=platform,
        content_ref_type="product_review",
        limit=50,
        offset=0,
    )
    live_statuses = {
        "draft", "pending_review", "approved", "scheduled",
        "publishing", "published",
    }
    for record in existing:
        if record.content_ref_id == review_id and record.status in live_statuses:
            raise HTTPException(
                status_code=409,
                detail={
                    "error": "publish_record_exists",
                    "message": (
                        "Bu inceleme icin ayni platformda aktif bir publish "
                        "kaydi zaten var."
                    ),
                    "publish_record_id": record.id,
                    "status": record.status,
                },
            )

    # Content project id — follow job's project if any
    from app.jobs.service import get_job

    job = await get_job(db, review.job_id)
    content_project_id = getattr(job, "content_project_id", None) if job else None

    record = await publish_service.create_publish_record_from_job(
        session=db,
        job_id=review.job_id,
        platform=platform,
        content_ref_type="product_review",
        content_ref_id=review_id,
        actor_id=ctx.user_id,
        content_project_id=content_project_id,
        platform_connection_id=body.platform_connection_id,
    )

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
