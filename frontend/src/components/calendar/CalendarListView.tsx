/**
 * CalendarListView — Redesign REV-2 / P2.4.
 *
 * Takvim "Liste" görünümü — hafta/ay grid'lerinin alternatifi. Etkinlikler
 * tarihe (gün) ve saat içinde gruplanmış, kronolojik olarak akan düz bir liste
 * olarak sunulur. Grid varyantlarıyla aynı `CalendarEvent` sözleşmesi ve
 * `onSelectEvent` callback'i kullanılır — dolayısıyla aynı detay paneli
 * reuse edilir.
 *
 * Kural: Bu bileşen yalnızca render; veri yüklemesi, owner scope ve filtreleme
 * UserCalendarPage'de kalır. Admin/user farkı yok — admin `UserCalendarPage`'i
 * `isAdmin` flag'i ile sarmalıyor, list view flag'den bağımsız.
 */

import { cn } from "../../lib/cn";
import type { CalendarEvent } from "../../api/calendarApi";

const EVENT_TYPE_LABELS: Record<string, string> = {
  content_project: "Proje",
  publish_record: "Yayın",
  platform_post: "Post",
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  content_project: "bg-brand-50 text-brand-700 border-brand-200",
  publish_record: "bg-info-light text-info-dark border-info/30",
  platform_post: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const EVENT_TYPE_DOT: Record<string, string> = {
  content_project: "bg-brand-500",
  publish_record: "bg-info",
  platform_post: "bg-emerald-500",
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateHeading(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

interface CalendarListViewProps {
  /**
   * Tarih anahtarına (YYYY-MM-DD) göre gruplanmış etkinlikler. UserCalendarPage
   * `eventsByDate` memosundan doğrudan geçirebilir.
   */
  eventsByDate: Record<string, CalendarEvent[]>;
  onSelectEvent: (ev: CalendarEvent) => void;
  selectedEventId?: string;
}

export function CalendarListView({
  eventsByDate,
  onSelectEvent,
  selectedEventId,
}: CalendarListViewProps) {
  // Tarih anahtarlarını sırala (kronolojik). Boş olanlar listeden düşer.
  const sortedDateKeys = Object.keys(eventsByDate)
    .filter((k) => (eventsByDate[k] ?? []).length > 0)
    .sort();

  const totalCount = sortedDateKeys.reduce(
    (sum, k) => sum + (eventsByDate[k]?.length ?? 0),
    0,
  );

  if (totalCount === 0) {
    return (
      <div
        className="border border-neutral-200 rounded-md bg-white px-4 py-10 text-center text-sm text-neutral-400"
        data-testid="calendar-list-empty"
      >
        Bu aralıkta etkinlik yok.
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="calendar-list-view">
      {sortedDateKeys.map((dateKey) => {
        const dayEvents = [...(eventsByDate[dateKey] ?? [])].sort((a, b) =>
          a.start_at.localeCompare(b.start_at),
        );
        return (
          <div
            key={dateKey}
            className="border border-neutral-200 rounded-md bg-white overflow-hidden"
            data-testid={`calendar-list-day-${dateKey}`}
          >
            <div className="px-3 py-2 border-b border-neutral-100 text-xs font-medium text-neutral-600 bg-neutral-50">
              {formatDateHeading(dayEvents[0].start_at)}
              <span className="ml-2 text-neutral-400">({dayEvents.length})</span>
            </div>
            <div className="divide-y divide-neutral-50">
              {dayEvents.map((ev) => (
                <button
                  type="button"
                  key={ev.id}
                  onClick={() => onSelectEvent(ev)}
                  data-testid={`calendar-list-event-${ev.id}`}
                  className={cn(
                    "w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-neutral-50 transition-colors",
                    selectedEventId === ev.id && "bg-brand-50/50",
                  )}
                >
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full shrink-0",
                      EVENT_TYPE_DOT[ev.event_type] ?? "bg-neutral-400",
                      ev.is_overdue && "!bg-error",
                      ev.inbox_item_id && !ev.is_overdue && "!bg-warning",
                    )}
                  />
                  <span className="flex-1 min-w-0 text-xs text-neutral-700 truncate">
                    {ev.title}
                  </span>
                  <span className="text-[10px] text-neutral-400 shrink-0">
                    {formatTime(ev.start_at)}
                  </span>
                  {ev.inbox_item_id && (
                    <span className="text-[9px] px-1 py-0.5 bg-warning-light text-warning-dark rounded shrink-0">
                      inbox
                    </span>
                  )}
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded shrink-0 border",
                      EVENT_TYPE_COLORS[ev.event_type] ?? "bg-neutral-100 text-neutral-500",
                    )}
                  >
                    {EVENT_TYPE_LABELS[ev.event_type] ?? ev.event_type}
                  </span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
