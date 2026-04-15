"""
ProductScrapeStepExecutor — gercek implementasyon (Faz B.2).

Akis:
  1. Job.input_data_json'dan primary_product_id + secondary_product_ids oku.
  2. Her bir urun icin:
     a. DB'den Product kaydini cek (source_url gereklidir).
     b. http_fetch.fetch_html ile HTML'i SSRF + throttle + bytes-limit altinda cek.
     c. parser_chain.parse_product_html ile ParsedProduct elde et.
     d. Sonucu ProductSnapshot olarak DB'ye yaz (sha1 dedupe — ayni icerik
        mevcutsa yeni snapshot yaratilmaz ama Product guncellenir).
     e. Product.current_price / primary_image_url / description / brand /
        parser_source / scrape_confidence / robots_txt_allowed guncelle.
  3. scrape_confidence >= settings.product_review.scrape.min_confidence
     (default 0.5) degilse StepExecutionError (retryable=False).
  4. artifacts/product_scrape.json yaz — downstream step'ler okur.

Idempotency:
  - artifact_check → Ayni job_id icin artifact varsa kisa devre.
  - Ayni URL + ayni HTML hash → ProductSnapshot insert atlanir; Product
    guncellenir (updated_at bump).

Hata sinyalleri:
  - Gecerli sebep: retryable=True (FetchTimeoutError, ThrottleBlocked,
    gecici network hatalari).
  - Kalici sebep: retryable=False (SSRF, parser tamamen basarisiz, Product
    kaydi yok, confidence esik altinda).
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import time
from dataclasses import asdict
from typing import Optional

from sqlalchemy import select

from app.db.models import Job, JobStep, Product, ProductSnapshot
from app.db.session import AsyncSessionLocal
from app.jobs.executor import StepExecutor
from app.jobs.exceptions import StepExecutionError

from app.modules.product_review.http_fetch import (
    FetchError,
    FetchHTTPError,
    FetchTimeoutError,
    SSRFBlocked,
    ThrottleBlocked,
    fetch_html,
)
from app.modules.product_review.parser_chain import (
    ParsedProduct,
    parse_product_html,
)
from app.modules.product_review.url_utils import canonicalize_url, extract_host

from ._helpers import _read_artifact, _write_artifact

logger = logging.getLogger(__name__)


# Workspace helper (news_bulletin'deki _helpers.py ile ayni yapi).
# Product review modulunde henuz _helpers.py olmadigi icin burada inline tutuyoruz.


_ARTIFACT_FILENAME = "product_scrape.json"
_DEFAULT_MIN_CONFIDENCE = 0.5
_DEFAULT_MIN_INTERVAL_S = 3.0
_DEFAULT_MAX_BYTES = 1_500_000
_DEFAULT_TIMEOUT_S = 10


def _sha1_of(text: str) -> str:
    return hashlib.sha1(text.encode("utf-8", errors="replace")).hexdigest()


def _get_setting(snapshot: dict, key: str, default):
    if not isinstance(snapshot, dict):
        return default
    v = snapshot.get(key)
    if v is None:
        return default
    return v


async def _fetch_async(url: str, *, min_interval_s: float, max_bytes: int, timeout_s: int):
    """fetch_html sync oldugu icin thread'e tasinir."""
    return await asyncio.to_thread(
        fetch_html,
        url,
        max_bytes=max_bytes,
        timeout_s=timeout_s,
        min_interval_s=min_interval_s,
    )


class ProductScrapeStepExecutor(StepExecutor):
    """Gercek product_scrape executor'i — Faz B.2."""

    def step_key(self) -> str:
        return "product_scrape"

    async def execute(self, job: Job, step: JobStep) -> dict:
        if job is None or step is None:
            # Faz A stub testi uyumlulugu: None+None ile cagirilirsa ayni mesaji versin.
            raise StepExecutionError(
                "product_scrape",
                (
                    "product_review.product_scrape executor henuz implement "
                    "edilmedi (skeleton — Faz B'de doldurulacak)."
                ),
                retryable=False,
            )

        # ---------------- Input parse ----------------
        raw_input_str = getattr(job, "input_data_json", None) or "{}"
        try:
            raw_input: dict = json.loads(raw_input_str)
        except (json.JSONDecodeError, TypeError) as err:
            raise StepExecutionError(
                self.step_key(),
                f"Job input_data_json gecersiz JSON: {err}",
                retryable=False,
            )

        primary_id = raw_input.get("primary_product_id")
        if not primary_id:
            raise StepExecutionError(
                self.step_key(),
                "Job input_data_json icinde 'primary_product_id' eksik.",
                retryable=False,
            )
        secondary_ids = raw_input.get("secondary_product_ids") or []
        if not isinstance(secondary_ids, list):
            secondary_ids = []

        settings_snapshot = raw_input.get("_settings_snapshot", {}) or {}
        min_confidence = float(
            _get_setting(
                settings_snapshot,
                "product_review.scrape.min_confidence",
                _DEFAULT_MIN_CONFIDENCE,
            )
        )
        min_interval_s = float(
            _get_setting(
                settings_snapshot,
                "product_review.scrape.per_host_min_interval_seconds",
                _DEFAULT_MIN_INTERVAL_S,
            )
        )
        max_bytes = int(
            _get_setting(
                settings_snapshot,
                "product_review.scrape.max_bytes",
                _DEFAULT_MAX_BYTES,
            )
        )
        timeout_s = int(
            _get_setting(
                settings_snapshot,
                "product_review.scrape.timeout_seconds",
                _DEFAULT_TIMEOUT_S,
            )
        )
        respect_robots = bool(
            _get_setting(
                settings_snapshot,
                "product_review.scrape.respect_robots_txt",
                False,
            )
        )

        # ---------------- Idempotency short-circuit ----------------
        workspace_root = getattr(job, "workspace_path", None) or ""
        existing = _read_artifact(workspace_root, job.id, _ARTIFACT_FILENAME)
        if existing and isinstance(existing, dict) and existing.get("products"):
            return {
                "status": "skipped_idempotent",
                "reason": "artifact_exists",
                "artifact_path": existing.get("_artifact_path"),
                "products_count": len(existing["products"]),
            }

        # ---------------- Scrape loop ----------------
        product_ids = [primary_id] + [pid for pid in secondary_ids if isinstance(pid, str)]
        results: list[dict] = []
        failures: list[dict] = []

        async with AsyncSessionLocal() as db:
            for pid in product_ids:
                try:
                    item = await self._scrape_single_product(
                        db,
                        product_id=pid,
                        min_interval_s=min_interval_s,
                        max_bytes=max_bytes,
                        timeout_s=timeout_s,
                        respect_robots=respect_robots,
                    )
                    results.append(item)
                except StepExecutionError:
                    raise  # bubble up — primary urun icin
                except Exception as exc:
                    logger.exception(
                        "ProductScrape: beklenmeyen hata product_id=%s", pid,
                    )
                    failures.append({
                        "product_id": pid,
                        "error": f"{type(exc).__name__}: {exc}",
                    })

            # primary must have scrape succeeded with min confidence
            primary_res = next(
                (r for r in results if r["product_id"] == primary_id), None
            )
            if primary_res is None:
                raise StepExecutionError(
                    self.step_key(),
                    f"Primary product (id={primary_id}) scrape basarisiz — "
                    "Product kaydi yok veya fetch tamamen basarisiz.",
                    retryable=False,
                )
            if primary_res["confidence"] < min_confidence:
                raise StepExecutionError(
                    self.step_key(),
                    (
                        f"Primary product scrape_confidence {primary_res['confidence']:.2f} "
                        f"< esik {min_confidence:.2f}. Daha iyi bir urun URL'si veriniz "
                        f"veya elle veri tamamlayin."
                    ),
                    retryable=False,
                )

        # Faz E: job-level aggregate data_confidence (average across products).
        from app.modules.product_review.confidence import (
            aggregate_confidence,
            compute_data_confidence,
        )

        data_confidence = aggregate_confidence(results)
        primary_data_confidence = compute_data_confidence(primary_res)

        artifact_payload = {
            "products": results,
            "failures": failures,
            "primary_product_id": primary_id,
            "secondary_product_ids": secondary_ids,
            "min_confidence": min_confidence,
            "data_confidence": data_confidence,
            "primary_data_confidence": primary_data_confidence,
        }
        artifact_path = _write_artifact(
            workspace_root, job.id, _ARTIFACT_FILENAME, artifact_payload
        )
        artifact_payload["_artifact_path"] = artifact_path

        return {
            "status": "ok",
            "artifact_path": artifact_path,
            "products_count": len(results),
            "failures_count": len(failures),
            "primary_confidence": primary_res["confidence"],
            "data_confidence": data_confidence,
            "primary_data_confidence": primary_data_confidence,
        }

    # ------------------------------------------------------------------
    # Per-product scrape (internal)
    # ------------------------------------------------------------------

    async def _scrape_single_product(
        self,
        db,
        *,
        product_id: str,
        min_interval_s: float,
        max_bytes: int,
        timeout_s: int,
        respect_robots: bool,
    ) -> dict:
        # 1) Product kaydi
        prod = (
            await db.execute(select(Product).where(Product.id == product_id))
        ).scalar_one_or_none()
        if prod is None:
            raise StepExecutionError(
                "product_scrape",
                f"Product bulunamadi (id={product_id}).",
                retryable=False,
            )
        if not prod.source_url:
            raise StepExecutionError(
                "product_scrape",
                f"Product.source_url bos (id={product_id}).",
                retryable=False,
            )

        host = extract_host(prod.source_url) or "unknown"
        started_at = time.monotonic()

        # 2) Fetch
        try:
            fetch = await _fetch_async(
                prod.source_url,
                min_interval_s=min_interval_s,
                max_bytes=max_bytes,
                timeout_s=timeout_s,
            )
        except SSRFBlocked as exc:
            raise StepExecutionError(
                "product_scrape",
                f"SSRF guard bloklamasi (host={host}): {exc}",
                retryable=False,
            )
        except ThrottleBlocked as exc:
            # Gecici — bir sonraki denemede acilabilir
            raise StepExecutionError(
                "product_scrape",
                f"Per-host throttle (host={host}): {exc}",
                retryable=True,
            )
        except FetchTimeoutError as exc:
            raise StepExecutionError(
                "product_scrape",
                f"Fetch timeout (host={host}): {exc}",
                retryable=True,
            )
        except FetchHTTPError as exc:
            raise StepExecutionError(
                "product_scrape",
                f"HTTP hata (host={host}): {exc}",
                retryable=True,
            )
        except FetchError as exc:
            raise StepExecutionError(
                "product_scrape",
                f"Fetch basarisiz (host={host}): {exc}",
                retryable=True,
            )

        elapsed_ms = int((time.monotonic() - started_at) * 1000)
        html_sha1 = _sha1_of(fetch.html)

        # 3) Parse
        parsed: Optional[ParsedProduct] = parse_product_html(fetch.html, fetch.final_url)
        if parsed is None:
            # Parser tamamen bulamadi — confidence 0, snapshot yine yazalim
            parsed = ParsedProduct(
                parser_source="none",
                confidence=0.0,
            )

        # 4) Snapshot dedupe — ayni sha1 varsa INSERT ATLA, Product'u yine guncelle.
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
                is_test_data=bool(getattr(prod, "is_test_data", False)),
            )
            db.add(snap)
            snapshot_created = True
        else:
            snap = existing_snap
            snapshot_created = False

        # 5) Product guncelle (canonical_url, fiyat/gorsel vb.)
        if parsed.name and not prod.name:
            # Sadece once bos ise — operator girdigi adi silme.
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
        prod.robots_txt_allowed = None if not respect_robots else True

        await db.flush()
        # Commit at end of loop (caller scope) — AsyncSessionLocal commits on
        # close? No: we need explicit commit. We'll commit per-product.
        await db.commit()

        return {
            "product_id": product_id,
            "source_url": prod.source_url,
            "canonical_url": prod.canonical_url,
            "host": host,
            "http_status": fetch.status,
            "elapsed_ms": elapsed_ms,
            "fetched_bytes": fetch.bytes_read,
            "truncated": fetch.truncated,
            "parser_source": parsed.parser_source,
            "confidence": float(parsed.confidence),
            "name": parsed.name,
            "price": parsed.price,
            "currency": parsed.currency,
            "availability": parsed.availability,
            "rating_value": parsed.rating_value,
            "rating_count": parsed.rating_count,
            "brand": parsed.brand,
            "sku": parsed.sku,
            "image_url": parsed.image_url,
            "image_urls": parsed.image_urls,
            "snapshot_id": snap.id,
            "snapshot_created": snapshot_created,
            "raw_html_sha1": html_sha1,
        }
