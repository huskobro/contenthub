/**
 * UserCalendarPage — Faz 14: Content Calendar for users.
 *
 * Shows unified calendar events from ContentProject, PublishRecord, PlatformPost.
 * Supports day/week/month toggle, channel filter, event type filter,
 * list + calendar grid views, and detail side panel.
 */

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../stores/authStore";
import { fetchCalendarEvents, type CalendarEvent } from "../../api/calendarApi";
import {
  fetchChannelProfiles,
  type ChannelProfileResponse,
} from "../../api/channelProfilesApi";
import { cn } from "../../lib/cn";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type ViewMode = "week" | "month";
type EventTypeFilter = "" | "content_project" | "publish_record" | "platform_post";

const EVENT_TYPE_LABELS: Record<string, string> = {
  content_project: "Proje",
  publish_record: "Yayin",
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

function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function formatDate(d: Date): string {
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

function getDateRange(view: ViewMode, base: Date): { start: Date; end: Date } {
  if (view === "week") {
    const start = startOfWeek(base);
    return { start, end: addDays(start, 7) };
  }
  // month
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
    // Stop if we've passed the month
    if (current.getMonth() > base.getMonth() && current.getDate() > 1) break;
  }
  return weeks;
}

const DAY_NAMES = ["Pzt", "Sal", "Car", "Per", "Cum", "Cmt", "Paz"];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface CalendarPageProps {
  isAdmin?: boolean;
}

export function UserCalendarPage({ isAdmin }: CalendarPageProps) {
  const userId = useAuthStore((s) => s.user?.id);
  const [view, setView] = useState<ViewMode>("month");
  const [baseDate, setBaseDate] = useState(() => new Date());
  const [channelFilter, setChannelFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<EventTypeFilter>("");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const { start, end } = useMemo(() => getDateRange(view, baseDate), [view, baseDate]);

  // Channels for filter
  const { data: channels = [] } = useQuery({
    queryKey: ["channel-profiles", isAdmin ? undefined : userId],
    queryFn: () => fetchChannelProfiles(isAdmin ? undefined : userId),
    enabled: !!userId || !!isAdmin,
  });

  // Calendar events
  const { data: events = [], isLoading } = useQuery({
    queryKey: [
      "calendar-events",
      start.toISOString(),
      end.toISOString(),
      isAdmin ? undefined : userId,
      channelFilter || undefined,
      typeFilter || undefined,
    ],
    queryFn: () =>
      fetchCalendarEvents({
        start_date: start.toISOString(),
        end_date: end.toISOString(),
        owner_user_id: isAdmin ? undefined : userId,
        channel_profile_id: channelFilter || undefined,
        event_type: typeFilter || undefined,
      }),
    enabled: !!userId || !!isAdmin,
  });

  // Navigation
  const goNext = () => {
    if (view === "week") setBaseDate(addDays(baseDate, 7));
    else setBaseDate(new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 1));
  };
  const goPrev = () => {
    if (view === "week") setBaseDate(addDays(baseDate, -7));
    else setBaseDate(new Date(baseDate.getFullYear(), baseDate.getMonth() - 1, 1));
  };
  const goToday = () => setBaseDate(new Date());

  // Group events by date key
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const ev of events) {
      const key = ev.start_at.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    }
    return map;
  }, [events]);

  // Title
  const title = view === "week"
    ? `${formatDate(start)} — ${formatDate(addDays(end, -1))}`
    : baseDate.toLocaleDateString("tr-TR", { month: "long", year: "numeric" });

  return (
    <div className="space-y-4" data-testid="calendar-page">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="m-0 text-lg font-semibold text-neutral-800">
            {isAdmin ? "Takvim (Admin)" : "Icerik Takvimi"}
          </h2>
          <p className="m-0 text-sm text-neutral-500">
            Projeler, yayinlar ve postlar tek gorunumde
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-brand-50 text-brand-700 rounded-full text-sm font-medium">
            {events.length} etkinlik
          </span>
        </div>
      </div>

      {/* Filters + Navigation */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* View toggle */}
        <div className="flex border border-neutral-200 rounded-md overflow-hidden text-xs">
          <button
            type="button"
            onClick={() => setView("week")}
            className={cn(
              "px-3 py-1.5 transition-colors",
              view === "week" ? "bg-brand-600 text-white" : "bg-white text-neutral-600 hover:bg-neutral-50",
            )}
          >
            Hafta
          </button>
          <button
            type="button"
            onClick={() => setView("month")}
            className={cn(
              "px-3 py-1.5 transition-colors",
              view === "month" ? "bg-brand-600 text-white" : "bg-white text-neutral-600 hover:bg-neutral-50",
            )}
          >
            Ay
          </button>
        </div>

        {/* Navigation */}
        <button type="button" onClick={goPrev} className="px-2 py-1 bg-white border border-neutral-200 rounded text-xs hover:bg-neutral-50">&larr;</button>
        <button type="button" onClick={goToday} className="px-2 py-1 bg-white border border-neutral-200 rounded text-xs hover:bg-neutral-50">Bugun</button>
        <button type="button" onClick={goNext} className="px-2 py-1 bg-white border border-neutral-200 rounded text-xs hover:bg-neutral-50">&rarr;</button>

        <span className="text-sm font-medium text-neutral-700 ml-1">{title}</span>

        <div className="flex-1" />

        {/* Channel filter */}
        <select
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value)}
          className="px-2 py-1 border border-neutral-200 rounded text-xs bg-white text-neutral-600"
        >
          <option value="">Tum Kanallar</option>
          {channels.map((ch: ChannelProfileResponse) => (
            <option key={ch.id} value={ch.id}>{ch.profile_name}</option>
          ))}
        </select>

        {/* Type filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as EventTypeFilter)}
          className="px-2 py-1 border border-neutral-200 rounded text-xs bg-white text-neutral-600"
        >
          <option value="">Tum Tipler</option>
          <option value="content_project">Projeler</option>
          <option value="publish_record">Yayinlar</option>
          <option value="platform_post">Postlar</option>
        </select>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[11px] text-neutral-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-brand-500 inline-block" /> Proje Deadline</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-info inline-block" /> Yayin</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Post</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-error inline-block" /> Gecikme</span>
      </div>

      {isLoading && <p className="text-sm text-neutral-400">Yukleniyor...</p>}

      {/* Main content: calendar + detail */}
      <div className="flex gap-4">
        {/* Calendar grid */}
        <div className="flex-1 min-w-0">
          {view === "month" ? (
            <MonthGrid
              baseDate={baseDate}
              eventsByDate={eventsByDate}
              onSelectEvent={setSelectedEvent}
              selectedEventId={selectedEvent?.id}
            />
          ) : (
            <WeekList
              start={start}
              eventsByDate={eventsByDate}
              onSelectEvent={setSelectedEvent}
              selectedEventId={selectedEvent?.id}
            />
          )}
        </div>

        {/* Detail panel */}
        {selectedEvent && (
          <EventDetailPanel
            event={selectedEvent}
            onClose={() => setSelectedEvent(null)}
          />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Month Grid
// ---------------------------------------------------------------------------

function MonthGrid({
  baseDate,
  eventsByDate,
  onSelectEvent,
  selectedEventId,
}: {
  baseDate: Date;
  eventsByDate: Record<string, CalendarEvent[]>;
  onSelectEvent: (e: CalendarEvent) => void;
  selectedEventId?: string;
}) {
  const weeks = useMemo(() => getMonthWeeks(baseDate), [baseDate]);
  const today = formatDate(new Date());
  const currentMonth = baseDate.getMonth();

  return (
    <div className="border border-neutral-200 rounded-md overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-7 bg-neutral-50 border-b border-neutral-200">
        {DAY_NAMES.map((d) => (
          <div key={d} className="px-1 py-1.5 text-[10px] font-medium text-neutral-500 text-center">
            {d}
          </div>
        ))}
      </div>
      {/* Weeks */}
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 border-b border-neutral-100 last:border-b-0">
          {week.map((day) => {
            const key = formatDate(day);
            const dayEvents = eventsByDate[key] || [];
            const isToday = key === today;
            const isOtherMonth = day.getMonth() !== currentMonth;

            return (
              <div
                key={key}
                className={cn(
                  "min-h-[72px] p-1 border-r border-neutral-100 last:border-r-0 transition-colors",
                  isOtherMonth && "bg-neutral-50/50",
                  isToday && "bg-brand-50/30",
                )}
              >
                <div className={cn(
                  "text-[10px] font-medium mb-0.5",
                  isToday ? "text-brand-700 font-bold" : isOtherMonth ? "text-neutral-300" : "text-neutral-500",
                )}>
                  {day.getDate()}
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map((ev) => (
                    <button
                      type="button"
                      key={ev.id}
                      onClick={() => onSelectEvent(ev)}
                      className={cn(
                        "w-full text-left px-1 py-0.5 rounded text-[9px] leading-tight truncate border transition-all",
                        EVENT_TYPE_COLORS[ev.event_type] ?? "bg-neutral-50 text-neutral-600 border-neutral-200",
                        ev.is_overdue && "!border-error/50 !bg-error-light",
                        selectedEventId === ev.id && "ring-1 ring-brand-400",
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

// ---------------------------------------------------------------------------
// Week List
// ---------------------------------------------------------------------------

function WeekList({
  start,
  eventsByDate,
  onSelectEvent,
  selectedEventId,
}: {
  start: Date;
  eventsByDate: Record<string, CalendarEvent[]>;
  onSelectEvent: (e: CalendarEvent) => void;
  selectedEventId?: string;
}) {
  const today = formatDate(new Date());

  return (
    <div className="space-y-1">
      {Array.from({ length: 7 }, (_, i) => {
        const day = addDays(start, i);
        const key = formatDate(day);
        const dayEvents = eventsByDate[key] || [];
        const isToday = key === today;

        return (
          <div
            key={key}
            className={cn(
              "border border-neutral-200 rounded-md overflow-hidden",
              isToday && "ring-1 ring-brand-300",
            )}
          >
            <div className={cn(
              "px-3 py-1.5 text-xs font-medium border-b border-neutral-100",
              isToday ? "bg-brand-50 text-brand-700" : "bg-neutral-50 text-neutral-600",
            )}>
              {DAY_NAMES[i]} &middot; {day.toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
              {dayEvents.length > 0 && (
                <span className="ml-2 text-neutral-400">({dayEvents.length})</span>
              )}
            </div>
            {dayEvents.length === 0 ? (
              <div className="px-3 py-2 text-[10px] text-neutral-300">Etkinlik yok</div>
            ) : (
              <div className="divide-y divide-neutral-50">
                {dayEvents.map((ev) => (
                  <button
                    type="button"
                    key={ev.id}
                    onClick={() => onSelectEvent(ev)}
                    className={cn(
                      "w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-neutral-50 transition-colors",
                      selectedEventId === ev.id && "bg-brand-50/50",
                    )}
                  >
                    <span className={cn("w-2 h-2 rounded-full shrink-0", EVENT_TYPE_DOT[ev.event_type] ?? "bg-neutral-400", ev.is_overdue && "!bg-error")} />
                    <span className="flex-1 min-w-0 text-xs text-neutral-700 truncate">{ev.title}</span>
                    <span className="text-[10px] text-neutral-400 shrink-0">{formatTime(ev.start_at)}</span>
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded shrink-0",
                      EVENT_TYPE_COLORS[ev.event_type] ?? "bg-neutral-100 text-neutral-500",
                    )}>
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

// ---------------------------------------------------------------------------
// Event Detail Panel
// ---------------------------------------------------------------------------

function EventDetailPanel({
  event,
  onClose,
}: {
  event: CalendarEvent;
  onClose: () => void;
}) {
  return (
    <div className="w-72 shrink-0 border border-neutral-200 rounded-md bg-white p-4 space-y-3" data-testid="event-detail-panel">
      <div className="flex items-start justify-between">
        <span className={cn(
          "px-2 py-0.5 rounded text-xs font-medium",
          EVENT_TYPE_COLORS[event.event_type] ?? "bg-neutral-100 text-neutral-600",
        )}>
          {EVENT_TYPE_LABELS[event.event_type] ?? event.event_type}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-neutral-400 hover:text-neutral-600 text-sm leading-none"
        >
          &times;
        </button>
      </div>

      <h3 className="m-0 text-sm font-semibold text-neutral-800">{event.title}</h3>

      {event.is_overdue && (
        <div className="px-2 py-1 bg-error-light text-error-dark rounded text-xs font-medium">
          Gecikme!
        </div>
      )}

      <div className="space-y-1.5 text-xs text-neutral-600">
        <div className="flex justify-between">
          <span className="text-neutral-400">Baslangic</span>
          <span>{formatDateTR(event.start_at)} {formatTime(event.start_at)}</span>
        </div>
        {event.end_at && (
          <div className="flex justify-between">
            <span className="text-neutral-400">Bitis</span>
            <span>{formatDateTR(event.end_at)} {formatTime(event.end_at)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-neutral-400">Durum</span>
          <span className="font-medium">{event.status}</span>
        </div>
        {event.platform && (
          <div className="flex justify-between">
            <span className="text-neutral-400">Platform</span>
            <span>{event.platform}</span>
          </div>
        )}
        {event.module_type && (
          <div className="flex justify-between">
            <span className="text-neutral-400">Modul</span>
            <span>{event.module_type}</span>
          </div>
        )}
        {event.meta_summary && (
          <div className="pt-1 border-t border-neutral-100">
            <span className="text-neutral-400 block mb-0.5">Ozet</span>
            <span className="text-neutral-600">{event.meta_summary}</span>
          </div>
        )}
      </div>

      {/* Navigation links */}
      <div className="pt-2 border-t border-neutral-100 space-y-1.5">
        {event.action_url && (
          <a
            href={event.action_url}
            className="block text-xs text-brand-600 hover:text-brand-800 font-medium"
          >
            Detaya Git &rarr;
          </a>
        )}
        {event.related_project_id && (
          <a
            href={`/user/projects/${event.related_project_id}`}
            className="block text-xs text-neutral-500 hover:text-neutral-700"
          >
            Proje: {event.related_project_id.slice(0, 8)}...
          </a>
        )}
        {event.related_publish_record_id && (
          <a
            href={`/admin/publish/${event.related_publish_record_id}`}
            className="block text-xs text-neutral-500 hover:text-neutral-700"
          >
            Yayin Kaydi: {event.related_publish_record_id.slice(0, 8)}...
          </a>
        )}
        {event.related_post_id && (
          <a
            href="/user/posts"
            className="block text-xs text-neutral-500 hover:text-neutral-700"
          >
            Post: {event.related_post_id.slice(0, 8)}...
          </a>
        )}
      </div>
    </div>
  );
}
