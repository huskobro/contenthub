"""
Dedupe Servisi — M5-C2

İki katmanlı dedupe:
  1. Hard dedupe  : URL tam eşleşmesi (strip+lowercase).
                   scan_engine.py'de zaten uygulanıyor.
                   Bu modül hard dedupe kararlarını belgelemek için
                   `DedupeDecision` nesnesi üretir ama asıl kontrolü
                   scan_engine'den almaz — tamamlayıcıdır.

  2. Soft dedupe  : Başlık benzerliği — normalize edilmiş başlıkları karşılaştırır.
                   Sinyal: ortak token oranı (Jaccard benzeri, büyük harf yok, noktalama yok).
                   Eşik: SOFT_DEDUPE_THRESHOLD (varsayılan 0.65).
                   False positive riski: MEDIUM — bu yüzden eşiği yüksek tuttuk.
                   Soft dedupe kararları "bastırma" değil "uyarı" semantiğindedir:
                   allow_followup=True ile atlanabilir.

Semantik sınırlar (zorunlu, değiştirilmemelidir):
  - "deduped" durumu yalnızca ScanExecuteResponse.dedupe_details içinde yaşar.
  - NewsItem.status hiçbir zaman "deduped" olmaz.
  - UsedNewsRegistry bu modül tarafından asla okunmaz veya yazılmaz.
  - "used" kararı bu modülün dışındadır.

Follow-up exception:
  Bir önceki taramada görülmüş, başlıkça benzer bir haber yine geldiğinde,
  düzensel takip (follow-up) olabilir — dedupe yanlış bastırabilir.
  `allow_followup=True` → soft dedupe atlanır; hard dedupe korunur.
  Bu, false-positive riskini azaltmak için açık ve dar tanımlanmış bir kaçış noktasıdır.

Dedupe kararı açıklanabilirliği:
  Her `DedupeDecision` nesnesi şunları içerir:
  - `reason`: "hard_url_match" | "soft_title_match" | "accepted"
  - `matched_item_id`: eşleşen NewsItem.id (varsa)
  - `similarity_score`: 0.0–1.0 arası (soft için)
  - `is_suppressed`: True → bu entry yazılmaz
  - `followup_override`: True → soft bastırma atlandı
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Optional

# ---------------------------------------------------------------------------
# Sabitler
# ---------------------------------------------------------------------------

SOFT_DEDUPE_THRESHOLD: float = 0.65
"""
Soft dedupe eşiği. 0.65 = token setinin %65'i örtüşüyor.
Daha düşük değer → daha agresif bastırma → false positive riski artar.
Daha yüksek değer → daha gevşek → false negative riski artar.
Bu değer bilinçli olarak yüksek tutulmuştur: haber görünürlüğü kaybı,
dedupe kaçırmasından daha az tehlikelidir.
"""

# ---------------------------------------------------------------------------
# Veri nesneleri
# ---------------------------------------------------------------------------

@dataclass
class DedupeDecision:
    """
    Tek bir entry için dedupe kararı.

    reason            : "hard_url_match" | "soft_title_match" | "accepted"
    is_suppressed     : True → bu entry veritabanına yazılmaz
    matched_item_id   : eşleşen NewsItem.id (yalnızca suppressed için)
    similarity_score  : 0.0–1.0 arası (soft için); hard için 1.0; accepted için 0.0
    followup_override : True → soft dedupe allow_followup=True ile atlandı
    entry_url         : incelenen URL (izlenebilirlik için)
    entry_title       : incelenen başlık (izlenebilirlik için)
    """
    reason: str
    is_suppressed: bool
    entry_url: str
    entry_title: str
    matched_item_id: Optional[str] = None
    similarity_score: float = 0.0
    followup_override: bool = False


@dataclass
class DedupeContext:
    """
    Dedupe motoru için bağlam.

    existing_url_map  : {normalized_url → news_item_id} — hard dedupe için
    existing_title_map: {normalized_title → (news_item_id, raw_title)} — soft dedupe için
    allow_followup    : True → soft dedupe atlanır
    """
    existing_url_map: dict[str, str] = field(default_factory=dict)
    existing_title_map: dict[str, tuple[str, str]] = field(default_factory=dict)
    allow_followup: bool = False


# ---------------------------------------------------------------------------
# Başlık normalizasyonu
# ---------------------------------------------------------------------------

_PUNCT_RE = re.compile(r"[^\w\s]", re.UNICODE)


def normalize_title(title: str) -> str:
    """
    Başlığı dedupe için normalize eder.

    Adımlar:
      1. Küçük harfe çevir
      2. Noktalama işaretlerini kaldır
      3. Fazla boşlukları sıkıştır
      4. Trimle

    Bu fonksiyon deterministik ve yan etkisizdir.
    """
    lower = title.lower()
    no_punct = _PUNCT_RE.sub(" ", lower)
    return " ".join(no_punct.split())


def title_similarity(title_a: str, title_b: str) -> float:
    """
    İki normalize edilmiş başlık arasındaki Jaccard benzerliği.

    Sinyal: token set örtüşmesi.
    Dönüş değeri: 0.0 (hiç örtüşme yok) – 1.0 (tam eşleşme).

    Neden Jaccard?
      - Basit ve açıklanabilir: "X tokenden Y'si ortak"
      - Sıralamaya bağımlı değil
      - Karmaşık NLP modeli gerektirmiyor (M5-C2 kapsamında doğru seviye)

    Sınır: Kelime sırasını veya semantik anlamı değerlendirmiyor.
    Anlamsal benzerlik M6+ kapsamındadır.
    """
    tokens_a = set(title_a.split())
    tokens_b = set(title_b.split())
    if not tokens_a and not tokens_b:
        return 1.0
    if not tokens_a or not tokens_b:
        return 0.0
    intersection = tokens_a & tokens_b
    union = tokens_a | tokens_b
    return len(intersection) / len(union)


# ---------------------------------------------------------------------------
# Ana dedupe motoru
# ---------------------------------------------------------------------------

def evaluate_entry(
    url: str,
    title: str,
    context: DedupeContext,
) -> DedupeDecision:
    """
    Tek bir entry için dedupe kararı verir.

    Sıra:
      1. Hard dedupe: URL tam eşleşmesi → her zaman bastırır.
      2. Soft dedupe: Başlık benzerliği ≥ eşik → allow_followup=False ise bastırır.
      3. Accepted: Eşleşme yok.

    Bu fonksiyon sadece karar üretir — DB'ye yazmaz, NewsItem.status değiştirmez.
    """
    norm_url = url.strip().lower()
    norm_title = normalize_title(title)

    # -- 1. Hard dedupe --
    matched_id = context.existing_url_map.get(norm_url)
    if matched_id is not None:
        return DedupeDecision(
            reason="hard_url_match",
            is_suppressed=True,
            entry_url=url,
            entry_title=title,
            matched_item_id=matched_id,
            similarity_score=1.0,
            followup_override=False,
        )

    # -- 2. Soft dedupe (allow_followup atlaması) --
    if not context.allow_followup:
        best_score = 0.0
        best_match_id: Optional[str] = None
        for norm_existing, (item_id, _raw_title) in context.existing_title_map.items():
            score = title_similarity(norm_title, norm_existing)
            if score > best_score:
                best_score = score
                best_match_id = item_id

        if best_score >= SOFT_DEDUPE_THRESHOLD and best_match_id is not None:
            return DedupeDecision(
                reason="soft_title_match",
                is_suppressed=True,
                entry_url=url,
                entry_title=title,
                matched_item_id=best_match_id,
                similarity_score=best_score,
                followup_override=False,
            )
    else:
        # allow_followup=True: soft dedupe atlandı, karar kayıt altına alınıyor
        best_score = 0.0
        best_match_id = None
        for norm_existing, (item_id, _raw_title) in context.existing_title_map.items():
            score = title_similarity(norm_title, norm_existing)
            if score > best_score:
                best_score = score
                best_match_id = item_id

        if best_score >= SOFT_DEDUPE_THRESHOLD and best_match_id is not None:
            # Soft eşleşme var ama atlandı (follow-up exception)
            return DedupeDecision(
                reason="soft_title_match",
                is_suppressed=False,  # atlandı
                entry_url=url,
                entry_title=title,
                matched_item_id=best_match_id,
                similarity_score=best_score,
                followup_override=True,
            )

    # -- 3. Accepted --
    return DedupeDecision(
        reason="accepted",
        is_suppressed=False,
        entry_url=url,
        entry_title=title,
        similarity_score=0.0,
    )


def build_dedupe_context(
    existing_items: list[dict],
    allow_followup: bool = False,
) -> DedupeContext:
    """
    Mevcut NewsItem listesinden DedupeContext oluşturur.

    existing_items: [{"id": str, "url": str, "title": str}, ...]
    Bu liste scan_engine tarafından DB'den yüklenir.
    """
    url_map: dict[str, str] = {}
    title_map: dict[str, tuple[str, str]] = {}

    for item in existing_items:
        item_id = item["id"]
        url = item.get("url", "")
        title = item.get("title", "")

        if url:
            url_map[url.strip().lower()] = item_id

        if title:
            norm = normalize_title(title)
            if norm:
                title_map[norm] = (item_id, title)

    return DedupeContext(
        existing_url_map=url_map,
        existing_title_map=title_map,
        allow_followup=allow_followup,
    )
