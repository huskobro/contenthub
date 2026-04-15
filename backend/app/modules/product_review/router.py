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

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.modules.product_review import schemas, service

router = APIRouter(
    prefix="/product-review",
    tags=["product_review"],
)


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
