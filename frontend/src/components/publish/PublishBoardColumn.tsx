/**
 * PublishBoardColumn — Redesign REV-2 / P2.5.
 *
 * Board gorunumundeki tek bir sutun (review-gate durumu). Sutun basligi +
 * sayac + ardindan o duruma duden kartlar dikey olarak siralanir. Bos
 * durumlarda kisa bir fallback metin gosterilir.
 *
 * Drag & drop YOK (MVP): kartlar arasinda surukleme ile durum degistirme
 * backend state machine'ine (PublishStateMachine) ek onay/validasyon
 * gerektirir. Kullanici bir karti tikladiginda detay sayfasina gider ve
 * oradan mevcut aksiyonlarla durumu degistirir.
 */

import type { PublishRecordSummary } from "../../api/publishApi";
import { PublishCard } from "./PublishCard";

interface PublishBoardColumnProps {
  status: string;
  label: string;
  records: PublishRecordSummary[];
  onOpen: (record: PublishRecordSummary) => void;
  selectedIds?: Set<string>;
}

export function PublishBoardColumn({
  status,
  label,
  records,
  onOpen,
  selectedIds,
}: PublishBoardColumnProps) {
  return (
    <div
      className="flex flex-col min-w-[240px] max-w-[260px] bg-neutral-50 border border-neutral-200 rounded-md"
      data-testid={`publish-board-column-${status}`}
    >
      <div className="px-3 py-2 border-b border-neutral-200 bg-white rounded-t-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-neutral-700">{label}</span>
          <span
            className="text-[10px] text-neutral-500"
            data-testid={`publish-board-count-${status}`}
          >
            {records.length}
          </span>
        </div>
      </div>
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[70vh]">
        {records.length === 0 ? (
          <div
            className="text-[10px] text-neutral-400 text-center py-4"
            data-testid={`publish-board-empty-${status}`}
          >
            Bu sutunda kayit yok.
          </div>
        ) : (
          records.map((r) => (
            <PublishCard
              key={r.id}
              record={r}
              onOpen={onOpen}
              isSelected={selectedIds?.has(r.id) ?? false}
            />
          ))
        )}
      </div>
    </div>
  );
}
