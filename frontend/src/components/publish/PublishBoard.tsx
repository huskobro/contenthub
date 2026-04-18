/**
 * PublishBoard — Redesign REV-2 / P2.5.
 *
 * Yayin Merkezi board gorunumu. Kayitlari review-gate durumlarina gore
 * sutunlara ayirir: Taslak / Review Bekliyor / Onaylandi / Zamanlandi /
 * Yayinda / Basarisiz. Legacy tablo ile ayni veri kaynagini (usePublishRecords
 * cagrisinin dondugu liste) paylasir — filtreler tablo ile ortak (durum
 * filtresi zaten tek sutuna indirger; bu yuzden toggle "board" iken durum
 * filtresi "tum" kalirsa panorama acik olur).
 *
 * Drag & drop YOK (MVP): durumu degistirmek icin kart tiklanir -> detay
 * sayfasina gider. Board yalniz gorsel yayma + hizli panorama sunar.
 *
 * Secim checkbox'lari yok (MVP): bulk actions legacy tablo gorunumunde kalir.
 * Kullanici bulk aksiyonu lazimsa Tablo'ya gecer.
 */

import { useMemo } from "react";
import type { PublishRecordSummary } from "../../api/publishApi";
import { PublishBoardColumn } from "./PublishBoardColumn";

/**
 * Sutun sirasi: review-gate akisini ("sol-sag") takip eder.
 * 'approved' status'u review_state=approved halinde acilan araci durum;
 * scheduler henuz publish'i almamis olabilir. 'publishing' + 'cancelled' +
 * 'review_rejected' MVP'de "Basarisiz" sutununa katilmaz — kullanici bunlari
 * gormek isterse tabloya gecer (sade akis: 6 sutun yeterli).
 */
const BOARD_COLUMNS: Array<{ status: string; label: string }> = [
  { status: "draft", label: "Taslak" },
  { status: "pending_review", label: "Review Bekliyor" },
  { status: "approved", label: "Onaylandi" },
  { status: "scheduled", label: "Zamanlandi" },
  { status: "published", label: "Yayinda" },
  { status: "failed", label: "Basarisiz" },
];

interface PublishBoardProps {
  records: PublishRecordSummary[];
  onOpen: (record: PublishRecordSummary) => void;
  selectedIds?: Set<string>;
}

export function PublishBoard({ records, onOpen, selectedIds }: PublishBoardProps) {
  const grouped = useMemo(() => {
    const map: Record<string, PublishRecordSummary[]> = {};
    for (const col of BOARD_COLUMNS) {
      map[col.status] = [];
    }
    for (const r of records) {
      if (map[r.status]) {
        map[r.status].push(r);
      }
    }
    return map;
  }, [records]);

  return (
    <div
      className="flex gap-3 overflow-x-auto pb-2"
      data-testid="publish-board"
    >
      {BOARD_COLUMNS.map((col) => (
        <PublishBoardColumn
          key={col.status}
          status={col.status}
          label={col.label}
          records={grouped[col.status] ?? []}
          onOpen={onOpen}
          selectedIds={selectedIds}
        />
      ))}
    </div>
  );
}
