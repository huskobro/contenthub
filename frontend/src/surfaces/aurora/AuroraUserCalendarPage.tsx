/**
 * Aurora User Calendar — user.calendar override.
 *
 * Tasarım: ContentHub_Design _System/contenthub/pages/user/calendar.html
 * Veri: fetchCalendarEvents (gerçek backend takvim olayları). Hardcoded olay
 * yok; ay sınırları gerçek tarihlere göre hesaplanır, olaylar API'den çekilir.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchCalendarEvents, type CalendarEvent } from "../../api/calendarApi";
import { useAuthStore } from "../../stores/authStore";
import {
  AuroraButton,
  AuroraInspector,
  AuroraInspectorSection,
  AuroraInspectorRow,
} from "./primitives";
import { Icon } from "./icons";

const WEEK_LABELS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const MONTH_LABELS_TR = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

function eventTone(ev: CalendarEvent): { cls: string; color: string; bg: string } {
  if (ev.event_type === "publish_record") {
    if (ev.status === "published" || ev.status === "publishing") {
      return { cls: "publish", color: "var(--state-success-fg)", bg: "rgba(59,200,184,0.15)" };
    }
  }
  if (ev.event_type === "platform_post") {
    return { cls: "publish", color: "var(--state-success-fg)", bg: "rgba(59,200,184,0.15)" };
  }
  if (ev.status === "failed" || ev.status === "review_rejected") {
    return { cls: "render", color: "var(--state-danger-fg)", bg: "rgba(231,76,60,0.15)" };
  }
  if (ev.status === "scheduled" || ev.status === "pending_review" || ev.status === "approved") {
    return { cls: "pending", color: "var(--accent-primary-hover)", bg: "rgba(var(--accent-primary-rgb), 0.15)" };
  }
  return { cls: "render", color: "var(--state-warning-fg)", bg: "rgba(250,179,135,0.15)" };
}

function isoDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function AuroraUserCalendarPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "admin";
  // "Zamanla" CTA routes to /admin/wizard for admins, /user/content for regular users.
  const newContentRoute = isAdmin ? "/admin/wizard" : "/user/content";
  const [cursor, setCursor] = useState(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), 1);
  });

  const monthLabel = `${MONTH_LABELS_TR[cursor.getMonth()]} ${cursor.getFullYear()}`;
  const start = useMemo(() => new Date(cursor.getFullYear(), cursor.getMonth(), 1), [cursor]);
  const end = useMemo(() => new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0), [cursor]);

  const eventsQ = useQuery({
    queryKey: ["calendar", "events", isoDay(start), isoDay(end), user?.id],
    queryFn: () =>
      fetchCalendarEvents({
        start_date: isoDay(start),
        end_date: isoDay(end),
        owner_user_id: user?.id,
      }),
    enabled: !!user,
    staleTime: 30_000,
  });

  const eventsByDay = useMemo(() => {
    const m = new Map<number, CalendarEvent[]>();
    for (const ev of eventsQ.data ?? []) {
      const d = new Date(ev.start_at);
      if (d.getMonth() !== cursor.getMonth() || d.getFullYear() !== cursor.getFullYear()) continue;
      const key = d.getDate();
      const list = m.get(key) ?? [];
      list.push(ev);
      m.set(key, list);
    }
    return m;
  }, [eventsQ.data, cursor]);

  const today = new Date();
  const isCurrentMonth = today.getMonth() === cursor.getMonth() && today.getFullYear() === cursor.getFullYear();
  const todayDay = isCurrentMonth ? today.getDate() : -1;

  const firstDow = (start.getDay() + 6) % 7;
  const days = end.getDate();
  const cells: { day: number | null; other: boolean }[] = [];
  for (let i = 0; i < firstDow; i++) cells.push({ day: null, other: true });
  for (let d = 1; d <= days; d++) cells.push({ day: d, other: false });
  while (cells.length % 7 !== 0) cells.push({ day: null, other: true });

  const stats = useMemo(() => {
    let scheduled = 0,
      published = 0,
      failed = 0,
      pending = 0;
    for (const ev of eventsQ.data ?? []) {
      if (ev.status === "scheduled") scheduled += 1;
      else if (ev.status === "published" || ev.status === "publishing") published += 1;
      else if (ev.status === "failed" || ev.status === "review_rejected") failed += 1;
      else if (ev.status === "pending_review" || ev.status === "approved") pending += 1;
    }
    return { scheduled, published, failed, pending };
  }, [eventsQ.data]);

  const upcoming = useMemo(() => {
    const now = Date.now();
    return (eventsQ.data ?? [])
      .filter((e) => new Date(e.start_at).getTime() >= now)
      .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
      .slice(0, 4);
  }, [eventsQ.data]);

  const inspector = (
    <AuroraInspector title="Takvim">
      <AuroraInspectorSection title="Bu ay">
        <AuroraInspectorRow label="planlanan" value={String(stats.scheduled)} />
        <AuroraInspectorRow label="yayınlanan" value={String(stats.published)} />
        <AuroraInspectorRow label="bekleyen" value={String(stats.pending)} />
        <AuroraInspectorRow label="hatalı" value={String(stats.failed)} />
      </AuroraInspectorSection>
      <AuroraInspectorSection title="Yaklaşan">
        {upcoming.length === 0 && (
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Yaklaşan etkinlik yok.</div>
        )}
        {upcoming.map((ev) => (
          <div
            key={ev.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "5px 0",
              borderBottom: "1px solid var(--border-subtle)",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--accent-primary-hover)",
                minWidth: 24,
              }}
            >
              {new Date(ev.start_at).getDate()}
            </span>
            <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{ev.title}</span>
          </div>
        ))}
      </AuroraInspectorSection>
    </AuroraInspector>
  );

  return (
    <div className="aurora-dashboard">
      <div className="page">
        <div className="page-head">
          <div>
            <h1>Takvim</h1>
            <div className="sub">
              {monthLabel} · {(eventsQ.data ?? []).length} etkinlik
            </div>
          </div>
          <div className="hstack">
            <AuroraButton
              variant="ghost"
              size="sm"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            >
              <Icon name="chevron-left" size={13} />
            </AuroraButton>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 500,
                fontSize: 14,
                minWidth: 130,
                textAlign: "center",
              }}
            >
              {monthLabel}
            </span>
            <AuroraButton
              variant="ghost"
              size="sm"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            >
              <Icon name="chevron-right" size={13} />
            </AuroraButton>
            <AuroraButton
              variant="primary"
              size="sm"
              iconLeft={<Icon name="plus" size={12} />}
              onClick={() => navigate(newContentRoute)}
              data-testid="calendar-schedule-new"
            >
              Zamanla
            </AuroraButton>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 0, marginBottom: 4 }}>
          {WEEK_LABELS.map((d) => (
            <div
              key={d}
              style={{
                textAlign: "center",
                padding: "8px 0",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
              }}
            >
              {d}
            </div>
          ))}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7,1fr)",
            gap: 1,
            background: "var(--border-subtle)",
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          {cells.map((c, i) => {
            const isToday = c.day === todayDay && isCurrentMonth;
            const events = c.day != null ? eventsByDay.get(c.day) ?? [] : [];
            return (
              <div
                key={i}
                style={{
                  background: isToday ? "rgba(var(--accent-primary-rgb), 0.08)" : "var(--bg-surface)",
                  padding: "8px 6px",
                  minHeight: 84,
                  opacity: c.other ? 0.4 : 1,
                  transition: "background .1s",
                }}
              >
                {c.day != null && (
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      color: isToday ? "var(--accent-primary-hover)" : "var(--text-muted)",
                      fontWeight: isToday ? 700 : 400,
                      marginBottom: 4,
                    }}
                  >
                    {c.day}
                  </div>
                )}
                {events.slice(0, 3).map((ev) => {
                  const tone = eventTone(ev);
                  return (
                    <div
                      key={ev.id}
                      onClick={() => {
                        if (ev.action_url) navigate(ev.action_url);
                      }}
                      style={{
                        fontSize: 9,
                        padding: "2px 5px",
                        borderRadius: 3,
                        marginBottom: 2,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        background: tone.bg,
                        color: tone.color,
                        cursor: ev.action_url ? "pointer" : "default",
                      }}
                      title={ev.title}
                    >
                      {ev.title}
                    </div>
                  );
                })}
                {events.length > 3 && (
                  <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 2 }}>
                    +{events.length - 3} daha
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <aside className="aurora-inspector-slot">{inspector}</aside>
    </div>
  );
}
