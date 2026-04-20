/**
 * Aurora Admin Calendar — admin.calendar override.
 *
 * Aurora Dusk Cockpit tasarım sistemine uygun admin global takvim görünümü.
 * Legacy AdminCalendarPage'i (UserCalendarPage isAdmin sarmalayıcısı) Aurora
 * primitives ile yeniden inşa eder.
 *
 * Veri kaynağı: fetchCalendarEvents — admin kapsamı (useActiveScope) ile
 * filtrelenir. "all users" modunda owner_user_id verilmez (tüm kullanıcılar
 * görünür); admin bir kullanıcıya odaklanmışsa sadece o kullanıcının
 * etkinlikleri çekilir. Legacy ile aynı backend kontratı.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  fetchCalendarEvents,
  type CalendarEvent,
} from "../../api/calendarApi";
import { useActiveScope } from "../../hooks/useActiveScope";
import {
  AuroraButton,
  AuroraInspector,
  AuroraInspectorRow,
  AuroraInspectorSection,
  AuroraStatusChip,
} from "./primitives";
import { Icon } from "./icons";

const WEEK_LABELS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const MONTH_LABELS_TR = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

function eventTone(ev: CalendarEvent): { color: string; bg: string } {
  if (ev.event_type === "publish_record") {
    if (ev.status === "published" || ev.status === "publishing") {
      return { color: "var(--state-success-fg)", bg: "rgba(59,200,184,0.15)" };
    }
  }
  if (ev.event_type === "platform_post") {
    return { color: "var(--state-success-fg)", bg: "rgba(59,200,184,0.15)" };
  }
  if (ev.status === "failed" || ev.status === "review_rejected") {
    return { color: "var(--state-danger-fg)", bg: "rgba(231,76,60,0.15)" };
  }
  if (
    ev.status === "scheduled" ||
    ev.status === "pending_review" ||
    ev.status === "approved"
  ) {
    return { color: "var(--accent-primary-hover)", bg: "rgba(79,104,247,0.15)" };
  }
  return { color: "var(--state-warning-fg)", bg: "rgba(250,179,135,0.15)" };
}

function isoDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function AuroraAdminCalendarPage() {
  const navigate = useNavigate();
  const scope = useActiveScope();

  // Admin kapsam: "all users" modunda owner_user_id verme; odakta uid kullan.
  const ownerForQuery: string | undefined =
    scope.role === "admin" && scope.ownerUserId ? scope.ownerUserId : undefined;
  const scopeReady = scope.isReady && scope.role === "admin";

  const [cursor, setCursor] = useState(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), 1);
  });

  const monthLabel = `${MONTH_LABELS_TR[cursor.getMonth()]} ${cursor.getFullYear()}`;
  const start = useMemo(
    () => new Date(cursor.getFullYear(), cursor.getMonth(), 1),
    [cursor],
  );
  const end = useMemo(
    () => new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0),
    [cursor],
  );

  const eventsQ = useQuery({
    queryKey: [
      "calendar",
      "events",
      "admin",
      isoDay(start),
      isoDay(end),
      { ownerUserId: scope.ownerUserId, isAllUsers: scope.isAllUsers },
    ],
    queryFn: () =>
      fetchCalendarEvents({
        start_date: isoDay(start),
        end_date: isoDay(end),
        owner_user_id: ownerForQuery,
      }),
    enabled: scopeReady,
    staleTime: 30_000,
  });

  const events = eventsQ.data ?? [];

  // Etkinlikleri ayın günlerine göre grupla.
  const eventsByDay = useMemo(() => {
    const m = new Map<number, CalendarEvent[]>();
    for (const ev of events) {
      const d = new Date(ev.start_at);
      if (
        d.getMonth() !== cursor.getMonth() ||
        d.getFullYear() !== cursor.getFullYear()
      ) {
        continue;
      }
      const key = d.getDate();
      const list = m.get(key) ?? [];
      list.push(ev);
      m.set(key, list);
    }
    return m;
  }, [events, cursor]);

  const today = new Date();
  const isCurrentMonth =
    today.getMonth() === cursor.getMonth() &&
    today.getFullYear() === cursor.getFullYear();
  const todayDay = isCurrentMonth ? today.getDate() : -1;

  // Takvim hücreleri (Pzt-başlangıçlı 7 kolon)
  const firstDow = (start.getDay() + 6) % 7;
  const daysInMonth = end.getDate();
  const cells: { day: number | null; other: boolean }[] = [];
  for (let i = 0; i < firstDow; i++) cells.push({ day: null, other: true });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, other: false });
  while (cells.length % 7 !== 0) cells.push({ day: null, other: true });

  // Inspector: bugün, bu hafta toplam, en yoğun gün, durum dağılımı.
  const stats = useMemo(() => {
    let scheduled = 0;
    let published = 0;
    let failed = 0;
    let pending = 0;
    for (const ev of events) {
      if (ev.status === "scheduled") scheduled += 1;
      else if (ev.status === "published" || ev.status === "publishing") published += 1;
      else if (ev.status === "failed" || ev.status === "review_rejected") failed += 1;
      else if (ev.status === "pending_review" || ev.status === "approved") pending += 1;
    }
    return { scheduled, published, failed, pending };
  }, [events]);

  // Bugün planlanan
  const todayCount = useMemo(() => {
    const todayKey = isoDay(today);
    return events.filter((ev) => ev.start_at.slice(0, 10) === todayKey).length;
  }, [events]);

  // Bu hafta toplam (Pzt-Paz)
  const weekStart = useMemo(() => {
    const t = new Date();
    const day = t.getDay();
    const diff = t.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(t.getFullYear(), t.getMonth(), diff);
  }, []);
  const weekEnd = useMemo(() => {
    const e = new Date(weekStart);
    e.setDate(e.getDate() + 7);
    return e;
  }, [weekStart]);
  const weekCount = useMemo(() => {
    return events.filter((ev) => {
      const d = new Date(ev.start_at).getTime();
      return d >= weekStart.getTime() && d < weekEnd.getTime();
    }).length;
  }, [events, weekStart, weekEnd]);

  // En yoğun gün
  const busiestDay = useMemo(() => {
    let bestDay = 0;
    let bestCount = 0;
    for (const [day, list] of eventsByDay.entries()) {
      if (list.length > bestCount) {
        bestCount = list.length;
        bestDay = day;
      }
    }
    return { day: bestDay, count: bestCount };
  }, [eventsByDay]);

  const upcoming = useMemo(() => {
    const now = Date.now();
    return events
      .filter((e) => new Date(e.start_at).getTime() >= now)
      .sort(
        (a, b) =>
          new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
      )
      .slice(0, 5);
  }, [events]);

  const inspector = (
    <AuroraInspector title="Admin Takvim">
      <AuroraInspectorSection title="Bugün ve hafta">
        <AuroraInspectorRow label="bugün planlanan" value={String(todayCount)} />
        <AuroraInspectorRow label="bu hafta toplam" value={String(weekCount)} />
        <AuroraInspectorRow
          label="en yoğun gün"
          value={
            busiestDay.count > 0
              ? `${busiestDay.day} (${busiestDay.count})`
              : "—"
          }
        />
      </AuroraInspectorSection>
      <AuroraInspectorSection title="Bu ay durum">
        <AuroraInspectorRow label="planlanan" value={String(stats.scheduled)} />
        <AuroraInspectorRow label="yayınlanan" value={String(stats.published)} />
        <AuroraInspectorRow label="bekleyen" value={String(stats.pending)} />
        <AuroraInspectorRow label="hatalı" value={String(stats.failed)} />
      </AuroraInspectorSection>
      <AuroraInspectorSection title="Yaklaşan">
        {upcoming.length === 0 && (
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            Yaklaşan etkinlik yok.
          </div>
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
            <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
              {ev.title}
            </span>
          </div>
        ))}
      </AuroraInspectorSection>
    </AuroraInspector>
  );

  const scopeChip =
    scope.isAllUsers ? (
      <AuroraStatusChip tone="info">tüm kullanıcılar</AuroraStatusChip>
    ) : scope.ownerUserId ? (
      <AuroraStatusChip tone="neutral">odak: kullanıcı</AuroraStatusChip>
    ) : null;

  return (
    <div className="aurora-dashboard" data-testid="aurora-admin-calendar">
      <div className="page">
        <div className="page-head">
          <div>
            <h1>Admin Takvim</h1>
            <div className="sub">
              {monthLabel} · {events.length} etkinlik
              {eventsQ.isLoading ? " · yükleniyor" : ""}
            </div>
          </div>
          <div className="hstack">
            {scopeChip}
            <AuroraButton
              variant="ghost"
              size="sm"
              onClick={() =>
                setCursor(
                  new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1),
                )
              }
              aria-label="Önceki ay"
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
              onClick={() =>
                setCursor(
                  new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1),
                )
              }
              aria-label="Sonraki ay"
            >
              <Icon name="chevron-right" size={13} />
            </AuroraButton>
            <AuroraButton
              variant="secondary"
              size="sm"
              onClick={() => {
                const t = new Date();
                setCursor(new Date(t.getFullYear(), t.getMonth(), 1));
              }}
            >
              Bugün
            </AuroraButton>
            <AuroraButton
              variant="primary"
              size="sm"
              iconLeft={<Icon name="plus" size={12} />}
              onClick={() => navigate("/admin/wizard")}
            >
              Zamanla
            </AuroraButton>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7,1fr)",
            gap: 0,
            marginBottom: 4,
          }}
        >
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
            const dayEvents = c.day != null ? eventsByDay.get(c.day) ?? [] : [];
            return (
              <div
                key={i}
                style={{
                  background: isToday
                    ? "rgba(79,104,247,0.06)"
                    : "var(--bg-surface)",
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
                      color: isToday
                        ? "var(--accent-primary-hover)"
                        : "var(--text-muted)",
                      fontWeight: isToday ? 700 : 400,
                      marginBottom: 4,
                    }}
                  >
                    {c.day}
                  </div>
                )}
                {dayEvents.slice(0, 3).map((ev) => {
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
                {dayEvents.length > 3 && (
                  <div
                    style={{
                      fontSize: 9,
                      color: "var(--text-muted)",
                      marginTop: 2,
                    }}
                  >
                    +{dayEvents.length - 3} daha
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
