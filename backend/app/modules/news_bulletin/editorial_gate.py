"""
Editorial Gate — M5-C3

Bulletin oluşturma akışındaki insan odaklı seçim kapısını ve
haber tüketim (consume) geçişini yönetir.

Semantik zincir (değişmez):
  new               : scan engine tarafından atanır.
                      "Henüz dokunulmamış, seçilmemiş haber."
  selected          : NewsBulletinSelectedItem kaydı var demek.
                      NewsItem.status DEĞİŞMEZ — seçim DB state'e çevrilmez.
  selection_confirmed: confirm_selection() çağrıldı.
                      Editorial insan onay kapısı geçildi.
                      NewsItem.status DEĞİŞMEZ.
                      Bulletin.status = "selection_confirmed" olur.
  used / consumed   : consume_news() çağrıldı.
                      UsedNewsRegistry kayıtları yazıldı.
                      NewsItem.status = "used" atandı.
                      Bu, "used state ne zaman kazanılıyor" sorusunun kesin yanıtıdır.

Editorial gate nerede başlıyor, nerede bitiyor:
  Başlangıç: bulletin "draft" durumundayken editörün selected-news listesini
             oluşturması (NewsBulletinSelectedItem kayıtları).
  Kapı geçişi: confirm_selection() — editörün seçimi onaylaması.
               Koşul: en az bir seçili item olmalı; bulletin "draft" durumunda olmalı.
  Bitiş: consume_news() — "used" state tam burada kazanılır.
         Bulletin "selection_confirmed" → "in_progress" geçişi de burada.

deduped item vs selectable item sınırı:
  Dedupe kararları yalnızca scan yanıtında yaşar; NewsItem tablosuna yansımaz.
  Dolayısıyla deduped item kavramı editorial gate'e hiç ulaşmaz.
  Selectable item = NewsItem.status == "new" olan kayıtlar.
  Bu modül NewsItem.status != "new" olan item'ları seçime kabul etmez (uyarı verir).

follow-up accepted item'lar nasıl işaretleniyor:
  follow-up accepted item'lar NewsBulletinSelectedItem.selection_reason alanında
  izlenir — editorial editörün bilgi notu olarak eklenir.
  Bu modül otomatik işaretleme yapmaz; işaretleme editörün sorumluluğundadır.
  Otomatik işaretleme, false-positive risk ile karıştırılır.

UsedNewsRegistry ile "selected" arasındaki fark:
  Selected: editorial seçim kararı — geçici ve geri alınabilir.
  UsedNewsRegistry: tüketim kaydı — kalıcı, denetlenebilir.
  Bu iki kavram bu modülde açıkça ayrılmıştır.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import (
    NewsBulletin,
    NewsBulletinSelectedItem,
    NewsItem,
    UsedNewsRegistry,
)

# ---------------------------------------------------------------------------
# Bulletin durum sabitleri
# ---------------------------------------------------------------------------

BULLETIN_STATUS_DRAFT = "draft"
BULLETIN_STATUS_SELECTION_CONFIRMED = "selection_confirmed"
BULLETIN_STATUS_IN_PROGRESS = "in_progress"
BULLETIN_STATUS_DONE = "done"

# Editorial gate'in geçilebilmesi için gerekli durum
GATE_ENTRY_STATUS = BULLETIN_STATUS_DRAFT

# ---------------------------------------------------------------------------
# Yanıt nesneleri
# ---------------------------------------------------------------------------

@dataclass
class ConfirmSelectionResult:
    """
    confirm_selection() sonucu.

    success       : True → bulletin selection_confirmed durumuna geçti.
    bulletin_id   : işlenen bulletin ID
    confirmed_count: onaylanan seçili item sayısı
    warning_items : UsedNewsRegistry'de zaten kayıtlı item ID listesi (uyarı)
    error         : başarısız ise hata açıklaması, başarılı ise None
    """
    success: bool
    bulletin_id: str
    confirmed_count: int = 0
    warning_items: list[str] = field(default_factory=list)
    error: Optional[str] = None


@dataclass
class ConsumeNewsResult:
    """
    consume_news() sonucu.

    success         : True → tüm işlemler tamamlandı.
    bulletin_id     : işlenen bulletin ID
    consumed_count  : UsedNewsRegistry'ye yazılan kayıt sayısı
    already_used    : zaten "used" durumundaki item ID listesi (atlandı)
    error           : başarısız ise hata açıklaması, başarılı ise None

    Semantik garanti:
      consumed_count > 0 olan item'ların NewsItem.status = "used" atandı.
      already_used listesindeki item'ların status değiştirilmedi.
    """
    success: bool
    bulletin_id: str
    consumed_count: int = 0
    already_used: list[str] = field(default_factory=list)
    error: Optional[str] = None


# ---------------------------------------------------------------------------
# Editorial Gate: confirm_selection
# ---------------------------------------------------------------------------

async def confirm_selection(
    db: AsyncSession,
    bulletin_id: str,
) -> ConfirmSelectionResult:
    """
    Editorial seçim onay kapısı.

    Koşullar:
      1. Bulletin mevcut olmalı.
      2. Bulletin.status = "draft" olmalı.
      3. En az bir NewsBulletinSelectedItem kaydı olmalı.

    Başarı durumunda:
      - Bulletin.status = "selection_confirmed" olur.
      - Seçili item'ların UsedNewsRegistry'de zaten olup olmadığı kontrol edilir
        ve uyarı olarak raporlanır — BLOKLAMAZ.
      - NewsItem.status DEĞİŞMEZ.

    Bu fonksiyon "used" kararı vermez.
    """
    bulletin = await db.get(NewsBulletin, bulletin_id)
    if bulletin is None:
        return ConfirmSelectionResult(
            success=False,
            bulletin_id=bulletin_id,
            error="Bulletin bulunamadı.",
        )

    if bulletin.status != GATE_ENTRY_STATUS:
        return ConfirmSelectionResult(
            success=False,
            bulletin_id=bulletin_id,
            error=f"Onay kapısı yalnızca 'draft' bulletinlerde geçilebilir. Mevcut durum: '{bulletin.status}'.",
        )

    # -- Seçili item'ları yükle --
    rows = await db.execute(
        select(NewsBulletinSelectedItem)
        .where(NewsBulletinSelectedItem.news_bulletin_id == bulletin_id)
        .order_by(NewsBulletinSelectedItem.sort_order)
    )
    selected_items = list(rows.scalars().all())

    if not selected_items:
        return ConfirmSelectionResult(
            success=False,
            bulletin_id=bulletin_id,
            error="Seçili haber yok — en az bir haber seçilmeli.",
        )

    # -- UsedNewsRegistry uyarı kontrolü (bloklamaz) --
    item_ids = [si.news_item_id for si in selected_items]
    used_rows = await db.execute(
        select(UsedNewsRegistry.news_item_id)
        .where(UsedNewsRegistry.news_item_id.in_(item_ids))
        .distinct()
    )
    warning_items = list(used_rows.scalars().all())

    # -- Bulletin durumunu güncelle --
    bulletin.status = BULLETIN_STATUS_SELECTION_CONFIRMED
    await db.commit()

    return ConfirmSelectionResult(
        success=True,
        bulletin_id=bulletin_id,
        confirmed_count=len(selected_items),
        warning_items=warning_items,
    )


# ---------------------------------------------------------------------------
# Editorial Gate: consume_news
# ---------------------------------------------------------------------------

async def consume_news(
    db: AsyncSession,
    bulletin_id: str,
) -> ConsumeNewsResult:
    """
    Haber tüketim işlemi — "used state ne zaman kazanılıyor" sorusunun yanıtı.

    Bu fonksiyon SADECE "selection_confirmed" bulletinlerde çalışır.

    Her seçili haber için:
      1. Eğer NewsItem.status zaten "used" → atla, already_used listesine ekle.
      2. UsedNewsRegistry kaydı yaz.
      3. NewsItem.status = "used" ata.

    Sonra:
      - Bulletin.status = "in_progress" geçişi yapılır.

    Semantik garanti:
      NewsItem.status = "used" YALNIZCA bu fonksiyon tarafından atanır.
      scan_engine, confirm_selection, veya başka bir yol bu geçişi yapmaz.
    """
    bulletin = await db.get(NewsBulletin, bulletin_id)
    if bulletin is None:
        return ConsumeNewsResult(
            success=False,
            bulletin_id=bulletin_id,
            error="Bulletin bulunamadı.",
        )

    if bulletin.status != BULLETIN_STATUS_SELECTION_CONFIRMED:
        return ConsumeNewsResult(
            success=False,
            bulletin_id=bulletin_id,
            error=f"Haber tüketimi yalnızca 'selection_confirmed' bulletinlerde yapılabilir. Mevcut durum: '{bulletin.status}'.",
        )

    # -- Seçili item'ları yükle --
    rows = await db.execute(
        select(NewsBulletinSelectedItem)
        .where(NewsBulletinSelectedItem.news_bulletin_id == bulletin_id)
        .order_by(NewsBulletinSelectedItem.sort_order)
    )
    selected_items = list(rows.scalars().all())

    if not selected_items:
        return ConsumeNewsResult(
            success=False,
            bulletin_id=bulletin_id,
            error="Seçili haber yok.",
        )

    # -- Her item için tüketim kaydı --
    consumed_count = 0
    already_used: list[str] = []

    for sel in selected_items:
        news_item = await db.get(NewsItem, sel.news_item_id)
        if news_item is None:
            continue

        if news_item.status == "used":
            already_used.append(sel.news_item_id)
            continue

        # UsedNewsRegistry kaydı
        registry_entry = UsedNewsRegistry(
            news_item_id=sel.news_item_id,
            usage_type="published",
            usage_context=f"bulletin:{bulletin_id}",
            target_module="news_bulletin",
            target_entity_id=bulletin_id,
            notes=sel.selection_reason,
        )
        db.add(registry_entry)

        # NewsItem.status = "used" — tek ve net geçiş noktası
        news_item.status = "used"
        consumed_count += 1

    if consumed_count == 0 and not already_used:
        await db.rollback()
        return ConsumeNewsResult(
            success=False,
            bulletin_id=bulletin_id,
            error="İşlenebilir haber bulunamadı.",
        )

    # -- Bulletin durumunu güncelle --
    bulletin.status = BULLETIN_STATUS_IN_PROGRESS

    try:
        await db.commit()
    except Exception as exc:
        await db.rollback()
        return ConsumeNewsResult(
            success=False,
            bulletin_id=bulletin_id,
            error=f"Veritabanı yazma hatası: {exc}",
        )

    return ConsumeNewsResult(
        success=True,
        bulletin_id=bulletin_id,
        consumed_count=consumed_count,
        already_used=already_used,
    )


# ---------------------------------------------------------------------------
# Selectable item yardımcısı
# ---------------------------------------------------------------------------

async def get_selectable_news_items(
    db: AsyncSession,
    source_id: Optional[str] = None,
    language: Optional[str] = None,
    limit: int = 100,
) -> list[dict]:
    """
    Seçime uygun item listesi — status='new' olan kayıtlar.

    Dedupe kararları bu listeyi etkilemez — dedupe yalnızca scan yanıtında yaşar.
    "deduped" bir item, scan sonrası DB'ye yazılmamışsa zaten bu listede yoktur.
    Scan sonrası DB'ye yazılmış bir item (örn. follow-up accepted) status='new' olarak burada görünür.

    Döner: [{"id", "title", "url", "summary", "source_id", "published_at", "language"}]
    """
    q = (
        select(
            NewsItem.id,
            NewsItem.title,
            NewsItem.url,
            NewsItem.summary,
            NewsItem.source_id,
            NewsItem.published_at,
            NewsItem.language,
        )
        .where(NewsItem.status == "new")
        .order_by(NewsItem.published_at.desc().nullslast())
        .limit(limit)
    )
    if source_id is not None:
        q = q.where(NewsItem.source_id == source_id)
    if language is not None:
        q = q.where(NewsItem.language == language)

    rows = await db.execute(q)
    return [
        {
            "id": r[0],
            "title": r[1],
            "url": r[2],
            "summary": r[3],
            "source_id": r[4],
            "published_at": r[5],
            "language": r[6],
        }
        for r in rows.all()
    ]
