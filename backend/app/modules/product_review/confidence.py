"""
Product Review — data confidence scoring (Faz E).

Scrape edilen verinin full-auto akisi icin "yeterli" olup olmadigina karar
verilmesi icin kullanilir. Preview executor'lari ve gate karar yardimcilari
bu skor uzerinden semi_auto/full_auto branch'larini secer.

Formul (deterministik, 0.0 - 1.0):

  data_confidence = 0.45 * scrape_confidence
                  + 0.20 * has_name
                  + 0.15 * has_image
                  + 0.10 * has_price
                  + 0.05 * has_brand
                  + 0.05 * has_rating

Esikler (settings, snapshot-locked):

  product_review.full_auto.min_confidence              (default 0.75)
  product_review.full_auto.allow_publish_without_review (default False)
  product_review.gate.preview_l1_required              (default True)
  product_review.gate.preview_l2_required              (default True)

Kurallar:
  - run_mode='full_auto' + min_confidence altinda → StepExecutionError
    (preview executor'u calistirilmaz; operator'un elle mudahalesi gerekir).
  - publish her iki modda da operator_confirm (pipeline skip'ler).
    allow_publish_without_review=True future iceride Faz F publish
    executor'unda degerlendirilir (audit trail ile).

Helper'lar pure deterministik + async degil. Testlerde dogrudan cagirilabilir.
"""

from __future__ import annotations

from typing import Any, Iterable, Optional


DEFAULTS: dict[str, Any] = {
    "product_review.full_auto.min_confidence": 0.75,
    "product_review.full_auto.allow_publish_without_review": False,
    "product_review.gate.preview_l1_required": True,
    "product_review.gate.preview_l2_required": True,
}


def _as_float(v: Any, default: float) -> float:
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


def _as_bool(v: Any, default: bool) -> bool:
    if isinstance(v, bool):
        return v
    if isinstance(v, str):
        return v.strip().lower() in ("1", "true", "yes", "on")
    if isinstance(v, (int, float)):
        return bool(v)
    return default


def resolve_setting(snapshot: dict | None, key: str) -> Any:
    default = DEFAULTS.get(key)
    if not snapshot or not isinstance(snapshot, dict):
        return default
    v = snapshot.get(key)
    if v is None:
        return default
    return v


def compute_data_confidence(product: dict) -> float:
    """
    Tek bir product dict (scrape artifact items[i]) icin 0.0-1.0 skoru.
    """
    if not isinstance(product, dict):
        return 0.0
    scrape_confidence = _as_float(product.get("confidence"), 0.0)
    # Bileşen varligi
    has_name = 1.0 if (product.get("name") or "").strip() else 0.0
    has_image = 1.0 if (product.get("image_url") or "").strip() else 0.0
    has_price = 1.0 if product.get("price") is not None else 0.0
    has_brand = 1.0 if (product.get("brand") or "").strip() else 0.0
    has_rating = 1.0 if (
        product.get("rating_value") is not None
        and product.get("rating_count") is not None
    ) else 0.0

    score = (
        0.45 * max(0.0, min(1.0, scrape_confidence))
        + 0.20 * has_name
        + 0.15 * has_image
        + 0.10 * has_price
        + 0.05 * has_brand
        + 0.05 * has_rating
    )
    # Garanti [0,1]
    return max(0.0, min(1.0, round(score, 4)))


def aggregate_confidence(products: Iterable[dict]) -> float:
    """
    Scrape'ten gelen tum urunlerin ORTALAMASI — tek bir job-level skor.
    Bos liste -> 0.0.
    """
    lst = [p for p in products if isinstance(p, dict)]
    if not lst:
        return 0.0
    scores = [compute_data_confidence(p) for p in lst]
    return round(sum(scores) / len(scores), 4)


def gate_decision(
    *,
    run_mode: str,
    data_confidence: float,
    settings_snapshot: dict | None,
) -> dict:
    """
    Preview/full-auto gate karari.

    Return:
      {
        "run_mode": "semi_auto" | "full_auto",
        "data_confidence": float,
        "min_confidence": float,
        "confidence_met": bool,
        "full_auto_allowed": bool,     # confidence_met AND run_mode=full_auto
        "should_block": bool,          # full_auto + confidence_met=False
        "preview_l1_required": bool,
        "preview_l2_required": bool,
        "allow_publish_without_review": bool,
        "reason": str,
      }
    """
    mode = (run_mode or "semi_auto").strip().lower()
    if mode not in ("semi_auto", "full_auto"):
        mode = "semi_auto"

    min_c = _as_float(
        resolve_setting(settings_snapshot, "product_review.full_auto.min_confidence"),
        0.75,
    )
    allow_pub = _as_bool(
        resolve_setting(
            settings_snapshot,
            "product_review.full_auto.allow_publish_without_review",
        ),
        False,
    )
    l1_req = _as_bool(
        resolve_setting(settings_snapshot, "product_review.gate.preview_l1_required"),
        True,
    )
    l2_req = _as_bool(
        resolve_setting(settings_snapshot, "product_review.gate.preview_l2_required"),
        True,
    )

    confidence_met = data_confidence >= min_c
    full_auto_allowed = (mode == "full_auto") and confidence_met
    should_block = (mode == "full_auto") and (not confidence_met)

    if should_block:
        reason = (
            f"full_auto bloklandi: data_confidence={data_confidence:.2f} "
            f"< esik {min_c:.2f}. Operator mudahalesi gerekli."
        )
    elif mode == "full_auto":
        reason = (
            f"full_auto gecerli: data_confidence={data_confidence:.2f} "
            f">= {min_c:.2f}. Preview gate'ler bypass edildi (audit'te kayit)."
        )
    else:
        reason = (
            f"semi_auto: preview L1={l1_req} / L2={l2_req} zorunlu. "
            f"Operator onayi beklenir."
        )

    return {
        "run_mode": mode,
        "data_confidence": round(data_confidence, 4),
        "min_confidence": min_c,
        "confidence_met": confidence_met,
        "full_auto_allowed": full_auto_allowed,
        "should_block": should_block,
        "preview_l1_required": l1_req,
        "preview_l2_required": l2_req,
        "allow_publish_without_review": allow_pub,
        "reason": reason,
    }
