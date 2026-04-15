"""
product_review service layer.

CRUD + business logic. Router sadece HTTP katmani — is kurallari burada.

Unique'lik:
  - products.canonical_url UNIQUE (partial — sadece NULL disi). Service
    canonical_url hesaplanabildiginde mevcut kaydi dondurur (idempotent POST).
  - Ayni canonical + farkli source_url → 200 OK (idempotent return).
  - Ayni source_url + kismi URL varyasyonu → canonical_url ayni → ayni kayit.
"""

from __future__ import annotations

import json
import logging
import time
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Product, ProductReview, ProductSnapshot
from app.modules.product_review import schemas
from app.modules.product_review.url_utils import canonicalize_url

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Products
# ---------------------------------------------------------------------------


async def create_product(
    db: AsyncSession,
    payload: schemas.ProductCreate,
) -> tuple[Product, bool]:
    """
    Urun yaratir. Ayni canonical_url'e sahip urun varsa MEVCUT donulur
    (idempotent). (product, created_bool) donulur.

    Hata:
      ValueError: canonical_url hesaplanamadi + name yok.
    """
    try:
        canonical = canonicalize_url(payload.source_url)
    except ValueError as exc:
        logger.info("create_product: canonical_url hesaplanamadi — %s", exc)
        canonical = None

    if canonical:
        existing = (
            await db.execute(
                select(Product).where(Product.canonical_url == canonical).limit(1)
            )
        ).scalar_one_or_none()
        if existing is not None:
            return existing, False

    # name zorunlu — yoksa URL'den placeholder uret
    name = (payload.name or "").strip()
    if not name:
        # Temp placeholder — scrape ile gercek ad gelecek.
        name = payload.source_url[:500]

    prod = Product(
        name=name,
        brand=(payload.brand or None),
        category=(payload.category or None),
        vendor=(payload.vendor or None),
        source_url=payload.source_url,
        canonical_url=canonical,
        affiliate_url=(payload.affiliate_url or None),
        is_test_data=bool(payload.is_test_data),
    )
    db.add(prod)
    await db.flush()
    await db.commit()
    await db.refresh(prod)
    return prod, True


async def get_product(db: AsyncSession, product_id: str) -> Optional[Product]:
    return (
        await db.execute(select(Product).where(Product.id == product_id))
    ).scalar_one_or_none()


async def list_products(
    db: AsyncSession,
    *,
    search: Optional[str] = None,
    include_test_data: bool = False,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[Product], int]:
    stmt = select(Product)
    count_stmt = select(func.count()).select_from(Product)
    filters = []
    if not include_test_data:
        filters.append(Product.is_test_data.is_(False))
    if search:
        like = f"%{search.strip()}%"
        filters.append(or_(Product.name.ilike(like), Product.brand.ilike(like)))
    if filters:
        for f in filters:
            stmt = stmt.where(f)
            count_stmt = count_stmt.where(f)
    stmt = stmt.order_by(Product.created_at.desc()).offset(offset).limit(limit)
    items = (await db.execute(stmt)).scalars().all()
    total = int((await db.execute(count_stmt)).scalar() or 0)
    return list(items), total


async def delete_product(db: AsyncSession, product_id: str) -> bool:
    prod = await get_product(db, product_id)
    if prod is None:
        return False
    # Baglantili ProductReview varsa silme — 409 donulsun.
    linked = (
        await db.execute(
            select(func.count())
            .select_from(ProductReview)
            .where(
                or_(
                    ProductReview.primary_product_id == product_id,
                    ProductReview.secondary_product_ids_json.like(f'%"{product_id}"%'),
                )
            )
        )
    ).scalar() or 0
    if int(linked) > 0:
        raise ValueError(
            f"Urun {product_id} — {linked} adet product_review kaydiyla bagli, silinemez."
        )
    await db.delete(prod)
    await db.commit()
    return True


# ---------------------------------------------------------------------------
# Product scrape trigger (admin/user "scrape now")
# ---------------------------------------------------------------------------


async def trigger_scrape(
    db: AsyncSession,
    product_id: str,
    *,
    min_interval_s: float = 3.0,
    max_bytes: int = 1_500_000,
    timeout_s: int = 10,
) -> schemas.ProductScrapeTriggerResponse:
    """
    Tek urun icin scrape tetikler. Job yaratmadan dogrudan executor mantigini
    sync calisan sarici ile cagirir — `POST /products/{id}/scrape` endpoint'i
    icin. Sonuc snapshot write'i ile birlikte donulur.
    """
    from app.modules.product_review.http_fetch import (
        FetchError,
        SSRFBlocked,
        ThrottleBlocked,
        FetchTimeoutError,
        FetchHTTPError,
        fetch_html,
    )
    from app.modules.product_review.parser_chain import parse_product_html, ParsedProduct
    import asyncio
    import hashlib
    from dataclasses import asdict

    prod = await get_product(db, product_id)
    if prod is None:
        return schemas.ProductScrapeTriggerResponse(
            status="failed", product_id=product_id, error="product_not_found"
        )
    if not prod.source_url:
        return schemas.ProductScrapeTriggerResponse(
            status="failed", product_id=product_id, error="source_url_missing"
        )

    def _do_fetch():
        return fetch_html(
            prod.source_url,
            min_interval_s=min_interval_s,
            max_bytes=max_bytes,
            timeout_s=timeout_s,
        )

    try:
        fetch = await asyncio.to_thread(_do_fetch)
    except SSRFBlocked as exc:
        return schemas.ProductScrapeTriggerResponse(
            status="failed", product_id=product_id, error=f"ssrf_blocked: {exc}"
        )
    except ThrottleBlocked as exc:
        return schemas.ProductScrapeTriggerResponse(
            status="failed", product_id=product_id, error=f"throttled: {exc}"
        )
    except FetchTimeoutError as exc:
        return schemas.ProductScrapeTriggerResponse(
            status="failed", product_id=product_id, error=f"timeout: {exc}"
        )
    except FetchHTTPError as exc:
        return schemas.ProductScrapeTriggerResponse(
            status="failed", product_id=product_id, error=f"http_error: {exc}"
        )
    except FetchError as exc:
        return schemas.ProductScrapeTriggerResponse(
            status="failed", product_id=product_id, error=f"fetch_error: {exc}"
        )

    html_sha1 = hashlib.sha1(fetch.html.encode("utf-8", errors="replace")).hexdigest()
    parsed: Optional[ParsedProduct] = parse_product_html(fetch.html, fetch.final_url)
    if parsed is None:
        parsed = ParsedProduct(parser_source="none", confidence=0.0)

    # Snapshot dedupe
    existing_snap = (
        await db.execute(
            select(ProductSnapshot)
            .where(
                ProductSnapshot.product_id == product_id,
                ProductSnapshot.raw_html_sha1 == html_sha1,
            )
            .limit(1)
        )
    ).scalar_one_or_none()

    if existing_snap is None:
        snap = ProductSnapshot(
            product_id=product_id,
            http_status=fetch.status,
            price=parsed.price,
            currency=parsed.currency,
            availability=parsed.availability,
            rating_value=parsed.rating_value,
            rating_count=parsed.rating_count,
            raw_html_sha1=html_sha1,
            parsed_json=json.dumps(asdict(parsed), ensure_ascii=False),
            parser_source=parsed.parser_source,
            confidence=parsed.confidence,
            error_message=None,
            is_test_data=bool(prod.is_test_data),
        )
        db.add(snap)
        snapshot_created = True
    else:
        snap = existing_snap
        snapshot_created = False

    # Product guncelle — name override etmiyoruz kullanici verdiyse.
    if parsed.name and prod.name == prod.source_url:
        prod.name = parsed.name[:500]
    if parsed.description and not prod.description:
        prod.description = parsed.description[:4000]
    if parsed.brand and not prod.brand:
        prod.brand = parsed.brand[:255]
    if parsed.image_url:
        prod.primary_image_url = parsed.image_url
    if parsed.price is not None:
        prod.current_price = parsed.price
    if parsed.currency:
        prod.currency = parsed.currency[:10]
    if not prod.canonical_url:
        try:
            prod.canonical_url = canonicalize_url(prod.source_url)
        except ValueError:
            pass
    prod.parser_source = parsed.parser_source
    prod.scrape_confidence = float(parsed.confidence)

    await db.flush()
    await db.commit()
    await db.refresh(prod)
    await db.refresh(snap)

    return schemas.ProductScrapeTriggerResponse(
        status="ok",
        product_id=product_id,
        parser_source=parsed.parser_source,
        confidence=float(parsed.confidence),
        price=parsed.price,
        currency=parsed.currency,
        primary_image_url=parsed.image_url,
        name=parsed.name,
        snapshot_id=snap.id,
        snapshot_created=snapshot_created,
    )


# ---------------------------------------------------------------------------
# ProductReviews
# ---------------------------------------------------------------------------


async def create_product_review(
    db: AsyncSession,
    payload: schemas.ProductReviewCreate,
) -> ProductReview:
    """
    ProductReview kaydi olusturur. Primary product var olmalidir.
    secondary_product_ids da DB'de olmali (bulunmayanlar silinip uyarilmaz —
    strict kontrol edilir; caller 400 donmelidir).

    Per-template kurallar (Faz D):
      - single:       secondary yok (varsa ignore edilir, temizlenir)
      - comparison:   primary + en az 1 secondary (toplam >= 2 urun)
                      primary_id secondary icinde bulunamaz (duplicate guard)
      - alternatives: primary + en az 2 secondary (toplam >= 3 urun)
                      primary_id secondary icinde bulunamaz
    """
    primary = await get_product(db, payload.primary_product_id)
    if primary is None:
        raise ValueError(
            f"primary_product_id bulunamadi: {payload.primary_product_id}"
        )

    # --- Per-template kurallar ---
    sec_ids = list(dict.fromkeys(payload.secondary_product_ids))  # de-dupe, preserve order
    if payload.primary_product_id in sec_ids:
        raise ValueError(
            "primary_product_id, secondary_product_ids icinde bulunamaz "
            "(ayni urun iki kez sayilmaz)."
        )

    if payload.template_type == "single":
        # single template'de secondary yok say.
        sec_ids = []
    elif payload.template_type == "comparison":
        if len(sec_ids) < 1:
            raise ValueError(
                "comparison template en az 2 urun gerektirir "
                "(primary + en az 1 secondary)."
            )
    elif payload.template_type == "alternatives":
        if len(sec_ids) < 2:
            raise ValueError(
                "alternatives template en az 3 urun gerektirir "
                "(primary + en az 2 secondary)."
            )

    # Secondary product existence check (sec_ids ile)
    if sec_ids:
        rows = (
            await db.execute(
                select(Product.id).where(Product.id.in_(sec_ids))
            )
        ).scalars().all()
        missing = set(sec_ids) - set(rows)
        if missing:
            raise ValueError(
                f"secondary_product_ids icinde bulunmayan id'ler: {sorted(missing)}"
            )

    # Affiliate enabled + disclosure zorunlu kurali
    if payload.affiliate_enabled:
        text = (payload.disclosure_text or "").strip()
        if not text:
            # Default disclosure settings'te var — caller doldurmazsa bos olmamali.
            # Burada sadece sinyal veriyoruz; router settings resolver ile doldurabilir.
            logger.debug(
                "create_product_review: affiliate_enabled=True + disclosure_text bos"
            )

    review = ProductReview(
        topic=payload.topic.strip(),
        template_type=payload.template_type,
        primary_product_id=payload.primary_product_id,
        secondary_product_ids_json=json.dumps(sec_ids),
        language=payload.language,
        orientation=payload.orientation,
        duration_seconds=payload.duration_seconds,
        run_mode=payload.run_mode,
        affiliate_enabled=bool(payload.affiliate_enabled),
        disclosure_text=(payload.disclosure_text or None),
        owner_user_id=(payload.owner_user_id or None),
        is_test_data=bool(payload.is_test_data),
    )
    db.add(review)
    await db.flush()
    await db.commit()
    await db.refresh(review)
    return review


async def get_product_review(db: AsyncSession, review_id: str) -> Optional[ProductReview]:
    return (
        await db.execute(select(ProductReview).where(ProductReview.id == review_id))
    ).scalar_one_or_none()


async def list_product_reviews(
    db: AsyncSession,
    *,
    template_type: Optional[str] = None,
    include_test_data: bool = False,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[ProductReview], int]:
    stmt = select(ProductReview)
    count_stmt = select(func.count()).select_from(ProductReview)
    filters = []
    if not include_test_data:
        filters.append(ProductReview.is_test_data.is_(False))
    if template_type:
        filters.append(ProductReview.template_type == template_type)
    for f in filters:
        stmt = stmt.where(f)
        count_stmt = count_stmt.where(f)
    stmt = stmt.order_by(ProductReview.created_at.desc()).offset(offset).limit(limit)
    items = (await db.execute(stmt)).scalars().all()
    total = int((await db.execute(count_stmt)).scalar() or 0)
    return list(items), total


async def delete_product_review(db: AsyncSession, review_id: str) -> bool:
    row = await get_product_review(db, review_id)
    if row is None:
        return False
    if row.job_id:
        raise ValueError(
            f"ProductReview {review_id} bir job'a baglanmis (job_id={row.job_id}); silinemez."
        )
    await db.delete(row)
    await db.commit()
    return True


async def list_product_snapshots(
    db: AsyncSession,
    product_id: str,
    *,
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[ProductSnapshot], int]:
    stmt = (
        select(ProductSnapshot)
        .where(ProductSnapshot.product_id == product_id)
        .order_by(ProductSnapshot.fetched_at.desc())
        .offset(offset)
        .limit(limit)
    )
    items = (await db.execute(stmt)).scalars().all()
    total_stmt = select(func.count()).select_from(ProductSnapshot).where(
        ProductSnapshot.product_id == product_id
    )
    total = int((await db.execute(total_stmt)).scalar() or 0)
    return list(items), total
