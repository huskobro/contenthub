/**
 * CanvasUserCalendarPage — Faz 3B.
 *
 * Canvas override for `user.calendar`. Re-frames the legacy calendar as a
 * workspace planning surface: the calendar grid is still the backbone, but
 * it sits inside the Canvas chrome with a hero ribbon, an event type split,
 * deadline counters, and an inline detail panel that speaks the workspace
 * language ("Proje", "Yayin", "Post", "Gecikme").
 *
 * Information architecture
 * ------------------------
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │ Hero: "Calisma Takvimi" + toplam/gecikme/inbox sayilari      │
 *   ├──────────────────────────────────────────────────────────────┤
 *   │ Type ribbon: Proje | Yayin | Post  (aktif filtre + tumu)     │
 *   ├────────────────────┬─────────────────────────────────────────┤
 *   │ Sol:               │ Sag:                                    │
 *   │  - takvim izgarasi │  - secili etkinligin detay karti        │
 *   │  - week/month      │  - ilgili proje/kanal/yayin linkleri    │
 *   │  - navigation      │                                         │
 *   └────────────────────┴─────────────────────────────────────────┘
 *
 * Data contract preservation
 * --------------------------
 * Same hooks/APIs the legacy `UserCalendarPage` uses:
 *   - fetchCalendarEvents({ start_date, end_date, owner_user_id, ... })
 *   - fetchChannelCalendarContext(channelId) (when channel selected)
 *   - fetchChannelProfiles(userId) for the channel filter
 * No new backend endpoints. No fake events. No fake KPIs.
 *
 * Fallback
 * --------
 * Mounted only when Canvas is the active user surface. Legacy
 * `UserCalendarPage` falls through via `useSurfacePageOverride` trampoline
 * when Canvas is off.
 */

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import {
  fetchCalendarEvents,
  fetchChannelCalendarContext,
  type CalendarEvent,
} from "../../api/calendarApi";
import {
  fetchChannelProfiles,
  type ChannelProfileResponse,
} from "../../api/channelProfilesApi";
import { cn } from "../../lib/cn";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type ViewMode = "week" | "month";
type EventTypeFilter = "" | "content_project" | "publish_record" | "platform_post";

const DAY_NAMES = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

const EVENT_TYPE_LABELS: Record<string, string> = {
  content_project: "Proje",
  publish_record: "Yayın",
  platform_post: "Post",
};

const EVENT_TYPE_TILE: Record<string, string> = {
  content_project: "bg-brand-50 text-brand-700 border-brand-200",
  publish_record: "bg-info-light text-info-dark border-info/30",
  platform_post: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const EVENT_TYPE_DOT: Record<string, string> = {
  content_project: "bg-brand-500",
  publish_record: "bg-info",
  platform_post: "bg-emerald-500",
};

// ---------------------------------------------------------------------------
// Date helpers (kept local — same semantics as legacy but isolated to Canvas)
// ---------------------------------------------------------------------------

function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff);
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function formatDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
function formatDateTR(iso: string): string {
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
function getRange(view: ViewMode, base: Date): { start: Date; end: Date } {
  if (view === "week") {
    const start = startOfWeek(base);
    return { start, end: addDays(start, 7) };
  }
  const start = new Date(base.getFullYear(), base.getMonth(), 1);
  const end = new Date(base.getFullYear(), base.getMonth() + 1, 1);
  return { start, end };
}
function getMonthWeeks(base: Date): Date[][] {
  const firstDay = new Date(base.getFullYear(), base.getMonth(), 1);
  const start = startOfWeek(firstDay);
  const weeks: Date[][] = [];
  let current = new Date(start);
  for (let w = 0; w < 6; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(current));
      current = addDays(current, 1);
    }
    weeks.push(week);
    if (current.getMonth() > base.getMonth() && current.getDate() > 1) break;
  }
  return weeks;
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function CanvasUserCalendarPage() {
  const userId = useAuthStore((s) => s.user?.id);
  const [view, setView] = useState<ViewMode>("month");
  const [baseDate, setBaseDate] = useState(() => new Date());
  const [channelFilter, setChannelFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<EventTypeFilter>("");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const { start, end } = useMemo(() => getRange(view, baseDate), [view, baseDate]);

  // Channels (same hook the legacy calendar uses)
  const { data: channels = [] } = useQuery({
    queryKey: ["channel-profiles", userId],
    queryFn: () => fetchChannelProfiles(userId),
    enabled: !!userId,
  });

  const channelNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const ch of channels) map[ch.id] = ch.profile_name;
    return map;
  }, [channels]);

  // Events
  const { data: events = [], isLoading } = useQuery({
    queryKey: [
      "calendar-events",
      start.toISOString(),
      end.toISOString(),
      userId,
      channelFilter || undefined,
      typeFilter || undefined,
    ],
    queryFn: () =>
      fetchCalendarEvents({
        start_date: start.toISOString(),
        end_date: end.toISOString(),
        owner_user_id: userId,
        channel_profile_id: channelFilter || undefined,
        event_type: typeFilter || undefined,
      }),
    enabled: !!userId,
  });

  // Channel policy context when a channel is selected
  const { data: channelContext } = useQuery({
    queryKey: ["channel-calendar-context", channelFilter],
    queryFn: () => fetchChannelCalendarContext(channelFilter),
    enabled: !!channelFilter,
  });

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const ev of events) {
      const key = ev.start_at.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    }
    return map;
  }, [events]);

  const counts = useMemo(() => {
    const total = events.length;
    const byType = {
      content_project: 0,
      publish_record: 0,
      platform_post: 0,
    } as Record<string, number>;
    let overdue = 0;
    let inbox = 0;
    for (const e of events) {
      byType[e.event_type] = (byType[e.event_type] ?? 0) + 1;
      if (e.is_overdue) overdue += 1;
      if (e.inbox_item_id) inbox += 1;
    }
    return { total, byType, overdue, inbox };
  }, [events]);

  const goNext = () => {
    if (view === "week") setBaseDate(addDays(baseDate, 7));
    else setBaseDate(new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 1));
  };
  const goPrev = () => {
    if (view === "week") setBaseDate(addDays(baseDate, -7));
    else setBaseDate(new Date(baseDate.getFullYear(), baseDate.getMonth() - 1, 1));
  };
  const goToday = () => setBaseDate(new Date());

  const title =
    view === "week"
      ? `${formatDateKey(start)} — ${formatDateKey(addDays(end, -1))}`
      : baseDate.toLocaleDateString("tr-TR", { month: "long", year: "numeric" });

  return (
    <div className="space-y-6" data-testid="canvas-user-calendar">
      {/* Hero ---------------------------------------------------------------- */}
      <section
        className="rounded-xl border border-border-subtle bg-surface-card shadow-sm px-6 py-5"
        data-testid="canvas-calendar-hero"
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-brand-600">
              Çalışma takvimi
            </div>
            <h1 className="m-0 mt-1 text-xl font-semibold text-neutral-900">
              Projeler, yayınlar ve postlar tek akışta
            </h1>
            <p className="m-0 mt-1 text-sm text-neutral-500 max-w-xl">
              Workspace içinde planladığın her şeyi aynı yerde gör. Canvas takvimi
              farklı sayfalar arasında zıplamadan proje deadline'larını, yayın
              kayıtlarını ve platform postlarını yan yana gösterir.
            </p>
          </div>
        </div>

        {/* Counter ribbon */}
        <div
          className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-3"
          data-testid="canvas-calendar-stats"
        >
          <StatTile label="Toplam etkinlik" value={counts.total} tone="brand" testId="canvas-calendar-stat-total" />
          <StatTile label="Proje" value={counts.byType.content_project ?? 0} tone="brand" testId="canvas-calendar-stat-project" />
          <StatTile label="Yayın" value={counts.byType.publish_record ?? 0} tone="info" testId="canvas-calendar-stat-publish" />
          <StatTile label="Gecikme" value={counts.overdue} tone="error" testId="canvas-calendar-stat-overdue" />
          <StatTile label="Inbox bağlı" value={counts.inbox} tone="warning" testId="canvas-calendar-stat-inbox" />
        </div>
      </section>

      {/* Filters + navigation ------------------------------------------------ */}
      <section
        className="rounded-xl border border-border-subtle bg-surface-card shadow-sm px-5 py-3"
        data-testid="canvas-calendar-controls"
      >
        <div className="flex items-center gap-3 flex-wrap">
          {/* View toggle */}
          <div className="inline-flex border border-border-subtle rounded-md overflow-hidden">
            <button
              type="button"
              onClick={() => setView("week")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium transition-colors",
                view === "week"
                  ? "bg-brand-600 text-white"
                  : "bg-surface-card text-neutral-600 hover:bg-neutral-50",
              )}
              data-testid="canvas-calendar-view-week"
            >
              Hafta
            </button>
            <button
              type="button"
              onClick={() => setView("month")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium transition-colors",
                view === "month"
                  ? "bg-brand-600 text-white"
                  : "bg-surface-card text-neutral-600 hover:bg-neutral-50",
              )}
              data-testid="canvas-calendar-view-month"
            >
              Ay
            </button>
          </div>

          <button
            type="button"
            onClick={goPrev}
            className="px-2 py-1 text-xs border border-border-subtle rounded bg-surface-card hover:bg-neutral-50"
            data-testid="canvas-calendar-prev"
          >
            &larr;
          </button>
          <button
            type="button"
            onClick={goToday}
            className="px-2 py-1 text-xs border border-border-subtle rounded bg-surface-card hover:bg-neutral-50"
            data-testid="canvas-calendar-today"
          >
            Bugün
          </button>
          <button
            type="button"
            onClick={goNext}
            className="px-2 py-1 text-xs border border-border-subtle rounded bg-surface-card hover:bg-neutral-50"
            data-testid="canvas-calendar-next"
          >
            &rarr;
          </button>

          <span
            className="text-sm font-semibold text-neutral-700 ml-1"
            data-testid="canvas-calendar-range-label"
          >
            {title}
          </span>

          <div className="flex-1" />

          {/* Type filter ribbon */}
          <div className="inline-flex gap-1">
            <TypePill
              label="Tümü"
              active={typeFilter === ""}
              onClick={() => setTypeFilter("")}
              testId="canvas-calendar-type-all"
            />
            <TypePill
              label="Proje"
              active={typeFilter === "content_project"}
              onClick={() => setTypeFilter("content_project")}
              testId="canvas-calendar-type-project"
            />
            <TypePill
              label="Yayın"
              active={typeFilter === "publish_record"}
              onClick={() => setTypeFilter("publish_record")}
              testId="canvas-calendar-type-publish"
            />
            <TypePill
              label="Post"
              active={typeFilter === "platform_post"}
              onClick={() => setTypeFilter("platform_post")}
              testId="canvas-calendar-type-post"
            />
          </div>

          {/* Channel filter */}
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="px-2 py-1.5 text-xs border border-border-subtle rounded bg-surface-card text-neutral-700"
            data-testid="canvas-calendar-channel-filter"
          >
            <option value="">Tüm kanallar</option>
            {channels.map((ch: ChannelProfileResponse) => (
              <option key={ch.id} value={ch.id}>
                {ch.profile_name}
              </option>
            ))}
          </select>
        </div>

        {isLoading && (
          <p
            className="m-0 mt-2 text-xs text-neutral-400"
            data-testid="canvas-calendar-loading"
          >
            Yükleniyor...
          </p>
        )}
      </section>

      {/* Grid + detail ------------------------------------------------------- */}
      <section
        className="flex gap-4"
        data-testid="canvas-calendar-board"
      >
        <div className="flex-1 min-w-0">
          {view === "month" ? (
            <MonthGrid
              baseDate={baseDate}
              eventsByDate={eventsByDate}
              onSelect={setSelectedEvent}
              selectedId={selectedEvent?.id}
            />
          ) : (
            <WeekList
              start={start}
              eventsByDate={eventsByDate}
              onSelect={setSelectedEvent}
              selectedId={selectedEvent?.id}
            />
          )}
        </div>

        {selectedEvent && (
          <EventDetailCard
            event={selectedEvent}
            channelName={
              selectedEvent.channel_profile_id
                ? channelNameMap[selectedEvent.channel_profile_id]
                : undefined
            }
            channelContextNote={
              channelContext && channelContext.channel_profile_id === selectedEvent.channel_profile_id
                ? channelContext.policy_id
                  ? "Kanal politikası aktif"
                  : "Kanal politikası tanımlı değil"
                : undefined
            }
            onClose={() => setSelectedEvent(null)}
          />
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small presentational primitives
// ---------------------------------------------------------------------------

function StatTile({
  label,
  value,
  tone,
  testId,
}: {
  label: string;
  value: number;
  tone: "brand" | "info" | "error" | "warning";
  testId: string;
}) {
  const toneClasses = {
    brand: "bg-brand-50 border-brand-200 text-brand-700",
    info: "bg-info-light border-info/30 text-info-dark",
    error: "bg-error-light border-error/30 text-error-dark",
    warning: "bg-warning-light border-warning/30 text-warning-dark",
  }[tone];

  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-2.5 flex flex-col",
        toneClasses,
      )}
      data-testid={testId}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
        {label}
      </div>
      <div className="mt-0.5 text-xl font-bold leading-none">{value}</div>
    </div>
  );
}

function TypePill({
  label,
  active,
  onClick,
  testId,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  testId: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-1 text-xs rounded-full border transition-colors",
        active
          ? "bg-brand-600 text-white border-brand-600"
          : "bg-surface-card text-neutral-600 border-border-subtle hover:bg-neutral-50",
      )}
      data-testid={testId}
    >
      {label}
    </button>
  );
}

function MonthGrid({
  baseDate,
  eventsByDate,
  onSelect,
  selectedId,
}: {
  baseDate: Date;
  eventsByDate: Record<string, CalendarEvent[]>;
  onSelect: (e: CalendarEvent) => void;
  selectedId?: string;
}) {
  const weeks = useMemo(() => getMonthWeeks(baseDate), [baseDate]);
  const today = formatDateKey(new Date());
  const currentMonth = baseDate.getMonth();

  return (
    <div
      className="rounded-xl border border-border-subtle bg-surface-card shadow-sm overflow-hidden"
      data-testid="canvas-calendar-month-grid"
    >
      <div className="grid grid-cols-7 bg-neutral-50 border-b border-border-subtle">
        {DAY_NAMES.map((d) => (
          <div
            key={d}
            className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-400 text-center"
          >
            {d}
          </div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 border-b border-neutral-100 last:border-b-0">
          {week.map((day) => {
            const key = formatDateKey(day);
            const dayEvents = eventsByDate[key] || [];
            const isToday = key === today;
            const isOtherMonth = day.getMonth() !== currentMonth;

            return (
              <div
                key={key}
                className={cn(
                  "min-h-[88px] p-1.5 border-r border-neutral-100 last:border-r-0 transition-colors",
                  isOtherMonth && "bg-neutral-50/50",
                  isToday && "bg-brand-50/40",
                )}
              >
                <div
                  className={cn(
                    "text-[11px] font-semibold mb-0.5",
                    isToday
                      ? "text-brand-700"
                      : isOtherMonth
                      ? "text-neutral-300"
                      : "text-neutral-500",
                  )}
                >
                  {day.getDate()}
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map((ev) => (
                    <button
                      type="button"
                      key={ev.id}
                      onClick={() => onSelect(ev)}
                      className={cn(
                        "w-full text-left px-1.5 py-0.5 rounded text-[10px] leading-tight truncate border transition-all",
                        EVENT_TYPE_TILE[ev.event_type] ?? "bg-neutral-50 text-neutral-600 border-neutral-200",
                        ev.is_overdue && "!border-error/60 !bg-error-light",
                        ev.inbox_item_id && !ev.is_overdue && "!border-warning/50",
                        selectedId === ev.id && "ring-1 ring-brand-400",
                      )}
                      title={ev.title}
                    >
                      {ev.title}
                    </button>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-[9px] text-neutral-400 px-1">
                      +{dayEvents.length - 3} daha
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function WeekList({
  start,
  eventsByDate,
  onSelect,
  selectedId,
}: {
  start: Date;
  eventsByDate: Record<string, CalendarEvent[]>;
  onSelect: (e: CalendarEvent) => void;
  selectedId?: string;
}) {
  const today = formatDateKey(new Date());

  return (
    <div
      className="space-y-2"
      data-testid="canvas-calendar-week-list"
    >
      {Array.from({ length: 7 }, (_, i) => {
        const day = addDays(start, i);
        const key = formatDateKey(day);
        const dayEvents = eventsByDate[key] || [];
        const isToday = key === today;
        return (
          <div
            key={key}
            className={cn(
              "rounded-xl border border-border-subtle bg-surface-card overflow-hidden",
              isToday && "ring-1 ring-brand-300",
            )}
          >
            <div
              className={cn(
                "px-4 py-2 text-xs font-semibold border-b border-neutral-100",
                isToday ? "bg-brand-50 text-brand-700" : "bg-neutral-50 text-neutral-600",
              )}
            >
              {DAY_NAMES[i]} &middot;{" "}
              {day.toLocaleDateString("tr-TR", {
                day: "numeric",
                month: "short",
              })}
              {dayEvents.length > 0 && (
                <span className="ml-2 text-neutral-400 font-normal">
                  ({dayEvents.length})
                </span>
              )}
            </div>
            {dayEvents.length === 0 ? (
              <div className="px-4 py-3 text-[11px] text-neutral-300">
                Etkinlik yok
              </div>
            ) : (
              <div className="divide-y divide-neutral-50">
                {dayEvents.map((ev) => (
                  <button
                    type="button"
                    key={ev.id}
                    onClick={() => onSelect(ev)}
                    className={cn(
                      "w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-neutral-50 transition-colors",
                      selectedId === ev.id && "bg-brand-50/50",
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
                    <span className="flex-1 min-w-0 text-xs text-neutral-800 truncate">
                      {ev.title}
                    </span>
                    <span className="text-[10px] text-neutral-400 shrink-0">
                      {formatTime(ev.start_at)}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded shrink-0",
                        EVENT_TYPE_TILE[ev.event_type] ?? "bg-neutral-100 text-neutral-500",
                      )}
                    >
                      {EVENT_TYPE_LABELS[ev.event_type] ?? ev.event_type}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function EventDetailCard({
  event,
  channelName,
  channelContextNote,
  onClose,
}: {
  event: CalendarEvent;
  channelName?: string;
  channelContextNote?: string;
  onClose: () => void;
}) {
  return (
    <aside
      className="w-80 shrink-0 rounded-xl border border-border-subtle bg-surface-card shadow-sm p-5 space-y-3"
      data-testid="canvas-calendar-event-detail"
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            "px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide border",
            EVENT_TYPE_TILE[event.event_type] ?? "bg-neutral-100 text-neutral-600 border-neutral-200",
          )}
        >
          {EVENT_TYPE_LABELS[event.event_type] ?? event.event_type}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-neutral-400 hover:text-neutral-600 text-base leading-none"
          data-testid="canvas-calendar-event-close"
          aria-label="Kapat"
        >
          &times;
        </button>
      </div>

      <h3 className="m-0 text-sm font-semibold text-neutral-800">
        {event.title}
      </h3>

      {event.is_overdue && (
        <div
          className="px-2 py-1.5 bg-error-light text-error-dark rounded text-xs font-medium border border-error/30"
          data-testid="canvas-calendar-event-overdue"
        >
          Gecikme — planlanan tarih geçti ve işlem tamamlanmadı.
        </div>
      )}

      <div className="space-y-1.5 text-xs text-neutral-600">
        {(channelName || event.channel_profile_id) && (
          <DetailRow label="Kanal">
            {channelName || event.channel_profile_id?.slice(0, 8)}
          </DetailRow>
        )}
        <DetailRow label="Başlangıç">
          {formatDateTR(event.start_at)} · {formatTime(event.start_at)}
        </DetailRow>
        {event.end_at && (
          <DetailRow label="Bitiş">
            {formatDateTR(event.end_at)} · {formatTime(event.end_at)}
          </DetailRow>
        )}
        <DetailRow label="Durum">{event.status}</DetailRow>
        {(event.platform || event.primary_platform) && (
          <DetailRow label="Platform">
            {event.platform || event.primary_platform || "—"}
          </DetailRow>
        )}
        {event.module_type && <DetailRow label="Modül">{event.module_type}</DetailRow>}
        {event.meta_summary && (
          <div className="pt-1 border-t border-neutral-100">
            <div className="text-neutral-400 mb-0.5">Özet</div>
            <div className="text-neutral-600">{event.meta_summary}</div>
          </div>
        )}
        {channelContextNote && (
          <div
            className="pt-1 border-t border-neutral-100 text-neutral-500 italic"
            data-testid="canvas-calendar-event-policy-note"
          >
            {channelContextNote}
          </div>
        )}
      </div>

      {/* Workspace cross-links — stay in the same workspace */}
      <div className="pt-2 border-t border-neutral-100 space-y-1.5">
        {event.related_project_id && (
          <Link
            to={`/user/projects/${event.related_project_id}`}
            className="block text-xs text-brand-600 hover:text-brand-800 font-medium"
            data-testid="canvas-calendar-event-project-link"
          >
            Projeye git &rarr;
          </Link>
        )}
        {event.channel_profile_id && (
          <Link
            to={`/user/channels/${event.channel_profile_id}`}
            className="block text-xs text-neutral-500 hover:text-neutral-700"
            data-testid="canvas-calendar-event-channel-link"
          >
            Kanal stüdyosuna git &rarr;
          </Link>
        )}
        {event.related_publish_record_id && (
          <Link
            to="/user/publish"
            className="block text-xs text-neutral-500 hover:text-neutral-700"
            data-testid="canvas-calendar-event-publish-link"
          >
            Yayın atölyesine git &rarr;
          </Link>
        )}
      </div>
    </aside>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-neutral-400 shrink-0">{label}</span>
      <span className="text-right font-medium text-neutral-700 min-w-0 truncate">
        {children}
      </span>
    </div>
  );
}
