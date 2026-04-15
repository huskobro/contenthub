"""
ProductReviewScriptStepExecutor — Faz D (3 template deterministic v1).

Faz B'de SINGLE template icin deterministik iskelet vardi. Faz D'de 3 template
(single / comparison / alternatives) icin dolu narration + scene_key'ler
Remotion renderer'inin 10-sahne paketi (scenes.tsx) ile TAM ESLESIR:

  - intro_hook       — giris
  - hero_card        — urun karti
  - price_reveal     — fiyat panel
  - feature_callout  — tek ozellik vurgu
  - spec_grid        — teknik ozellikler
  - comparison_row   — yan yana karsilastirma
  - social_proof     — yildiz/yorum sayisi
  - pros_cons        — arti/eksi
  - verdict_card     — karar
  - cta_outro        — kapanis

Artifact schema (degismedi — Faz C props ile %100 uyumlu):
  {
    "template_type": "single" | "comparison" | "alternatives",
    "language": "tr" | "en",
    "duration_seconds": int,
    "orientation": "vertical" | "horizontal",
    "scenes": [
       {
         "scene_id": "...",
         "scene_key": "<scenes.tsx key>",
         "duration_ms": 4000,
         "narration": "...",
         "visual_hint": "...",
         "product_refs": ["<product_id>"]
       },
       ...
    ],
    "generation": {
       "source": "deterministic_v1",
       "generated_at": "...",
       "template": "...",
       "product_count": int
    }
  }

LLM entegrasyonu Faz D'de eklenmiyor — deterministik metin. Ancak schema ve
scene_key'ler final Remotion donanimiyla uyumludur; LLM gelince sadece
narration uretimi degisir.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Optional

from app.db.models import Job, JobStep
from app.jobs.executor import StepExecutor
from app.jobs.exceptions import StepExecutionError

from ._helpers import _read_artifact, _write_artifact

logger = logging.getLogger(__name__)

_ARTIFACT_FILENAME = "product_review_script.json"
_SCRAPE_ARTIFACT = "product_scrape.json"


# ---------------------------------------------------------------------------
# Scene key plan tables — her template icin (scene_key, weight) listesi.
#   weight: toplam duration icindeki oran (sum = 1.0)
# ---------------------------------------------------------------------------

_SCENE_PLANS: dict[str, list[tuple[str, float]]] = {
    "single": [
        ("intro_hook", 0.10),
        ("hero_card", 0.18),
        ("price_reveal", 0.12),
        ("feature_callout", 0.15),
        ("spec_grid", 0.15),
        ("social_proof", 0.10),
        ("pros_cons", 0.10),
        ("cta_outro", 0.10),
    ],
    "comparison": [
        ("intro_hook", 0.10),
        ("hero_card", 0.14),  # Product A hero
        ("comparison_row", 0.25),
        ("pros_cons", 0.15),
        ("price_reveal", 0.10),
        ("verdict_card", 0.16),
        ("cta_outro", 0.10),
    ],
    "alternatives": [
        ("intro_hook", 0.10),
        ("hero_card", 0.16),  # ana urun
        ("feature_callout", 0.14),
        ("comparison_row", 0.18),  # alternatif 1
        ("comparison_row", 0.16),  # alternatif 2 (ayni key, farkli product_refs)
        ("verdict_card", 0.14),
        ("cta_outro", 0.12),
    ],
}


# ---------------------------------------------------------------------------
# Yardimci metin uretimi
# ---------------------------------------------------------------------------


def _fmt_price(price: Optional[float], currency: Optional[str]) -> str:
    if price is None:
        return ""
    cur = currency or ""
    if isinstance(price, (int, float)):
        if price >= 1000:
            whole = int(price)
            frac = int(round((price - whole) * 100))
            formatted = f"{whole:,}".replace(",", ".")
            if frac:
                formatted = f"{formatted},{frac:02d}"
        else:
            formatted = f"{price:.2f}".replace(".", ",")
    else:
        formatted = str(price)
    return f"{formatted} {cur}".strip()


def _t(lang: str, tr: str, en: str) -> str:
    return tr if (lang or "tr").lower().startswith("tr") else en


def _split_durations(total_seconds: int, plan: list[tuple[str, float]]) -> list[int]:
    total_ms = int(total_seconds) * 1000
    durations: list[int] = []
    remaining = total_ms
    for i, (_, w) in enumerate(plan):
        if i == len(plan) - 1:
            durations.append(remaining)
        else:
            ms = int(total_ms * w)
            durations.append(ms)
            remaining -= ms
    return durations


# ---------------------------------------------------------------------------
# Template builder'lari
# ---------------------------------------------------------------------------


def _single_narration(
    scene_key: str,
    primary: dict,
    language: str,
) -> str:
    name = (primary.get("name") or "Urun").strip()
    brand = (primary.get("brand") or "").strip()
    price_str = _fmt_price(primary.get("price"), primary.get("currency"))

    if scene_key == "intro_hook":
        return _t(
            language,
            f"Bu videoda {name} urununu detayli bir sekilde inceliyoruz.",
            f"In this video, we take a closer look at {name}.",
        )
    if scene_key == "hero_card":
        base = f"{brand} imzali {name}." if brand else f"{name}."
        return _t(
            language,
            base,
            (f"{name} by {brand}." if brand else f"{name}."),
        )
    if scene_key == "price_reveal":
        if price_str:
            return _t(
                language,
                f"Fiyati: {price_str}. Fiyatlar zaman icinde degisebilir.",
                f"Priced at {price_str}. Prices may change over time.",
            )
        return _t(
            language,
            "Guncel fiyat icin urun sayfasini kontrol ediniz.",
            "Check the product page for the current price.",
        )
    if scene_key == "feature_callout":
        return _t(
            language,
            f"{name}'in on plana cikan ozelligine bakalim.",
            f"Let's look at a key feature of {name}.",
        )
    if scene_key == "spec_grid":
        return _t(
            language,
            "Teknik ozellikler ve temel parametreler asagida ozetleniyor.",
            "Technical specifications and key parameters are summarized below.",
        )
    if scene_key == "social_proof":
        rv = primary.get("rating_value")
        rc = primary.get("rating_count")
        if rv and rc:
            return _t(
                language,
                f"Kullanicilar {rv} yildiz verdi ({rc} yorum).",
                f"Users rate it {rv} stars ({rc} reviews).",
            )
        return _t(
            language,
            "Kullanici degerlendirmeleri genel olarak olumlu.",
            "User feedback is generally positive.",
        )
    if scene_key == "pros_cons":
        return _t(
            language,
            "Ana arti ve eksi taraflari karsilastiralim.",
            "Let's weigh the key pros and cons.",
        )
    if scene_key == "cta_outro":
        return _t(
            language,
            "Daha fazla detay icin aciklamadaki baglantiya goz atabilirsiniz.",
            "Check the link in the description for more details.",
        )
    return ""


def _build_single(
    products: list[dict],
    language: str,
    total_seconds: int,
) -> list[dict]:
    primary = products[0] if products else {}
    pid = primary.get("product_id")
    plan = _SCENE_PLANS["single"]
    durations = _split_durations(total_seconds, plan)
    scenes: list[dict] = []
    for i, ((scene_key, _w), dur_ms) in enumerate(zip(plan, durations)):
        scenes.append(
            {
                "scene_id": f"s{i:02d}_{scene_key}",
                "scene_key": scene_key,
                "duration_ms": dur_ms,
                "narration": _single_narration(scene_key, primary, language),
                "visual_hint": scene_key,
                "product_refs": [pid] if pid else [],
            }
        )
    return scenes


def _comparison_narration(
    scene_key: str,
    primary: dict,
    secondary: list[dict],
    language: str,
) -> str:
    a_name = (primary.get("name") or "Urun A").strip()
    b_name = (secondary[0].get("name") if secondary else "Urun B").strip() if secondary else "Urun B"
    a_price = _fmt_price(primary.get("price"), primary.get("currency"))
    b_price = _fmt_price(
        secondary[0].get("price") if secondary else None,
        secondary[0].get("currency") if secondary else None,
    )

    if scene_key == "intro_hook":
        return _t(
            language,
            f"Bu videoda {a_name} ile {b_name} urunlerini karsilastiriyoruz.",
            f"In this video, we compare {a_name} and {b_name}.",
        )
    if scene_key == "hero_card":
        return _t(
            language,
            f"Ilk aday: {a_name}.",
            f"First up: {a_name}.",
        )
    if scene_key == "comparison_row":
        return _t(
            language,
            f"{a_name} ve {b_name} ayni kategoride farkli yaklasimlarla geliyor.",
            f"{a_name} and {b_name} take different approaches in the same category.",
        )
    if scene_key == "pros_cons":
        return _t(
            language,
            "Her iki urunun arti ve eksi yonlerini gozden gecirelim.",
            "Let's review the pros and cons of both products.",
        )
    if scene_key == "price_reveal":
        if a_price and b_price:
            return _t(
                language,
                f"{a_name}: {a_price}. {b_name}: {b_price}.",
                f"{a_name}: {a_price}. {b_name}: {b_price}.",
            )
        return _t(
            language,
            "Fiyatlar urun sayfasinda guncel haliyle gorulebilir.",
            "Current prices can be seen on the product pages.",
        )
    if scene_key == "verdict_card":
        return _t(
            language,
            f"Genel olarak, {a_name} one cikarken {b_name} belirli alanlarda avantajli.",
            f"Overall, {a_name} stands out while {b_name} has advantages in specific areas.",
        )
    if scene_key == "cta_outro":
        return _t(
            language,
            "Hangisini tercih ederdiniz? Yorumlarda belirtin.",
            "Which one would you pick? Let us know in the comments.",
        )
    return ""


def _build_comparison(
    products: list[dict],
    language: str,
    total_seconds: int,
) -> list[dict]:
    if len(products) < 2:
        # Defansif: service validation bunu engellemeli ama executor da fail-fast
        raise StepExecutionError(
            "script",
            "comparison template en az 2 urun gerektirir.",
            retryable=False,
        )
    primary = products[0]
    secondary = products[1:]
    primary_id = primary.get("product_id")
    sec_id = secondary[0].get("product_id") if secondary else None

    plan = _SCENE_PLANS["comparison"]
    durations = _split_durations(total_seconds, plan)
    scenes: list[dict] = []
    for i, ((scene_key, _w), dur_ms) in enumerate(zip(plan, durations)):
        if scene_key in ("hero_card",):
            refs = [primary_id] if primary_id else []
        elif scene_key in ("comparison_row", "pros_cons", "verdict_card", "price_reveal"):
            refs = [x for x in (primary_id, sec_id) if x]
        else:
            refs = [primary_id] if primary_id else []
        scenes.append(
            {
                "scene_id": f"c{i:02d}_{scene_key}",
                "scene_key": scene_key,
                "duration_ms": dur_ms,
                "narration": _comparison_narration(
                    scene_key, primary, secondary, language
                ),
                "visual_hint": scene_key,
                "product_refs": refs,
            }
        )
    return scenes


def _alternatives_narration(
    scene_key: str,
    primary: dict,
    alternatives: list[dict],
    slot: int,
    language: str,
) -> str:
    main_name = (primary.get("name") or "Ana urun").strip()
    alt1_name = (
        (alternatives[0].get("name") if len(alternatives) >= 1 else None) or "Alternatif 1"
    ).strip()
    alt2_name = (
        (alternatives[1].get("name") if len(alternatives) >= 2 else None) or "Alternatif 2"
    ).strip()

    if scene_key == "intro_hook":
        return _t(
            language,
            f"{main_name} icin alternatiflere bakiyoruz.",
            f"Looking at alternatives to {main_name}.",
        )
    if scene_key == "hero_card":
        return _t(
            language,
            f"Referans urunumuz: {main_name}.",
            f"Our reference product: {main_name}.",
        )
    if scene_key == "feature_callout":
        return _t(
            language,
            f"{main_name}'in temel ozelliklerini not edelim.",
            f"Let's note {main_name}'s core features.",
        )
    if scene_key == "comparison_row":
        alt_name = alt1_name if slot == 0 else alt2_name
        return _t(
            language,
            f"Alternatif {slot + 1}: {alt_name}.",
            f"Alternative {slot + 1}: {alt_name}.",
        )
    if scene_key == "verdict_card":
        return _t(
            language,
            f"{alt1_name} ve {alt2_name} kendi kategorilerinde gorulmeye deger.",
            f"{alt1_name} and {alt2_name} are each worth considering.",
        )
    if scene_key == "cta_outro":
        return _t(
            language,
            "Hangi alternatif size daha uygun? Yorumlarda paylasin.",
            "Which alternative suits you best? Tell us in the comments.",
        )
    return ""


def _build_alternatives(
    products: list[dict],
    language: str,
    total_seconds: int,
) -> list[dict]:
    if len(products) < 3:
        raise StepExecutionError(
            "script",
            "alternatives template en az 3 urun gerektirir "
            "(primary + 2 alternatif).",
            retryable=False,
        )
    primary = products[0]
    alternatives = products[1:3]  # ilk iki alternatif
    primary_id = primary.get("product_id")
    alt_ids = [p.get("product_id") for p in alternatives]

    plan = _SCENE_PLANS["alternatives"]
    durations = _split_durations(total_seconds, plan)

    # comparison_row sahnelerini slot'a mapple: 0 -> alt1, 1 -> alt2
    comparison_slot = 0
    scenes: list[dict] = []
    for i, ((scene_key, _w), dur_ms) in enumerate(zip(plan, durations)):
        if scene_key == "comparison_row":
            alt_idx = comparison_slot
            refs = [x for x in (primary_id, alt_ids[alt_idx] if alt_idx < len(alt_ids) else None) if x]
            narration = _alternatives_narration(
                scene_key, primary, alternatives, alt_idx, language
            )
            comparison_slot += 1
        elif scene_key in ("hero_card", "feature_callout", "intro_hook", "cta_outro"):
            refs = [primary_id] if primary_id else []
            narration = _alternatives_narration(
                scene_key, primary, alternatives, 0, language
            )
        elif scene_key == "verdict_card":
            refs = [x for x in ([primary_id] + alt_ids) if x]
            narration = _alternatives_narration(
                scene_key, primary, alternatives, 0, language
            )
        else:
            refs = [primary_id] if primary_id else []
            narration = _alternatives_narration(
                scene_key, primary, alternatives, 0, language
            )
        scenes.append(
            {
                "scene_id": f"a{i:02d}_{scene_key}",
                "scene_key": scene_key,
                "duration_ms": dur_ms,
                "narration": narration,
                "visual_hint": scene_key,
                "product_refs": refs,
            }
        )
    return scenes


# ---------------------------------------------------------------------------
# Executor
# ---------------------------------------------------------------------------


class ProductReviewScriptStepExecutor(StepExecutor):
    """Faz D — 3 template deterministik senaryo uretir. LLM v2'de gelir."""

    def step_key(self) -> str:
        return "script"

    async def execute(self, job: Job, step: JobStep) -> dict:
        if job is None or step is None:
            raise StepExecutionError(
                "script",
                "product_review.script executor cagrildi ama job/step None.",
                retryable=False,
            )

        raw_input_str = getattr(job, "input_data_json", None) or "{}"
        try:
            raw_input: dict = json.loads(raw_input_str)
        except (json.JSONDecodeError, TypeError) as err:
            raise StepExecutionError(
                self.step_key(),
                f"Job input_data_json gecersiz JSON: {err}",
                retryable=False,
            )

        template_type = raw_input.get("template_type", "single")
        if template_type not in ("single", "comparison", "alternatives"):
            raise StepExecutionError(
                self.step_key(),
                f"Bilinmeyen template_type: {template_type}",
                retryable=False,
            )
        language = raw_input.get("language", "tr")
        orientation = raw_input.get("orientation", "vertical")
        duration_seconds = int(raw_input.get("duration_seconds", 60))

        workspace_root = getattr(job, "workspace_path", None) or ""
        scrape = _read_artifact(workspace_root, job.id, _SCRAPE_ARTIFACT)
        if not scrape or not scrape.get("products"):
            raise StepExecutionError(
                self.step_key(),
                "product_scrape artifact yok — once scrape adimini calistirin.",
                retryable=False,
            )
        products = [p for p in scrape["products"] if isinstance(p, dict)]

        if template_type == "single":
            scenes = _build_single(products, language, duration_seconds)
        elif template_type == "comparison":
            scenes = _build_comparison(products, language, duration_seconds)
        else:
            scenes = _build_alternatives(products, language, duration_seconds)

        script_data = {
            "template_type": template_type,
            "language": language,
            "orientation": orientation,
            "duration_seconds": duration_seconds,
            "scenes": scenes,
            "generation": {
                "source": "deterministic_v1",
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "template": template_type,
                "product_count": len(products),
                "note": (
                    "Faz D deterministik v1 — scene_key'ler scenes.tsx 10-sahne "
                    "paketi ile tam eslesir. LLM entegrasyonu v2'de gelecek; "
                    "schema sabit kalacak."
                ),
            },
        }

        artifact_path = _write_artifact(
            workspace_root, job.id, _ARTIFACT_FILENAME, script_data
        )
        return {
            "status": "ok",
            "artifact_path": artifact_path,
            "template_type": template_type,
            "scenes_count": len(scenes),
            "source": "deterministic_v1",
        }
