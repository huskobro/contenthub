/**
 * CalendarListView smoke tests — Redesign REV-2 / P2.4.
 *
 * Takvim "Liste" görünümünün kronolojik render sözleşmesini doğrular:
 *   - boş event map'te `calendar-list-empty` fallback render
 *   - çoklu günde tarih anahtarı sıralamasına göre gruplar render edilir
 *   - bir gün içinde etkinlikler başlangıç saatine göre sıralanır
 *   - onSelectEvent callback'i tıklamada tetiklenir
 *   - seçili id arka plan class'ı taşır
 *   - inbox / overdue dot / tip badge'leri doğru class'lar
 */
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { CalendarListView } from "../components/calendar/CalendarListView";
import type { CalendarEvent } from "../api/calendarApi";

function makeEvent(over: Partial<CalendarEvent> = {}): CalendarEvent {
  const base: CalendarEvent = {
    id: "ev-1",
    event_type: "content_project",
    title: "Örnek Etkinlik",
    channel_profile_id: null,
    owner_user_id: "u1",
    related_project_id: null,
    related_publish_record_id: null,
    related_post_id: null,
    start_at: "2026-04-18T09:00:00Z",
    end_at: null,
    status: "planned",
    platform: null,
    module_type: null,
    action_url: null,
    meta_summary: null,
    is_overdue: false,
    primary_platform: null,
    inbox_item_id: null,
    inbox_item_status: null,
  };
  return { ...base, ...over };
}

describe("CalendarListView — P2.4 liste görünümü", () => {
  it("empty state shows fallback message", () => {
    render(<CalendarListView eventsByDate={{}} onSelectEvent={() => {}} />);
    expect(screen.getByTestId("calendar-list-empty")).toBeDefined();
    expect(screen.getByText(/etkinlik yok/i)).toBeDefined();
  });

  it("renders day groups sorted chronologically", () => {
    const byDate: Record<string, CalendarEvent[]> = {
      "2026-04-20": [
        makeEvent({ id: "a", title: "Ikinci Gun", start_at: "2026-04-20T10:00:00Z" }),
      ],
      "2026-04-18": [
        makeEvent({ id: "b", title: "Birinci Gun", start_at: "2026-04-18T09:00:00Z" }),
      ],
    };
    render(<CalendarListView eventsByDate={byDate} onSelectEvent={() => {}} />);
    const days = screen.getAllByTestId(/^calendar-list-day-/);
    expect(days).toHaveLength(2);
    // DOM sırası: 2026-04-18 önce, 2026-04-20 sonra (kronolojik)
    expect(days[0].getAttribute("data-testid")).toBe("calendar-list-day-2026-04-18");
    expect(days[1].getAttribute("data-testid")).toBe("calendar-list-day-2026-04-20");
  });

  it("sorts events within a day by start_at", () => {
    const byDate: Record<string, CalendarEvent[]> = {
      "2026-04-18": [
        makeEvent({ id: "late", title: "Akşam", start_at: "2026-04-18T18:00:00Z" }),
        makeEvent({ id: "early", title: "Sabah", start_at: "2026-04-18T08:00:00Z" }),
      ],
    };
    render(<CalendarListView eventsByDate={byDate} onSelectEvent={() => {}} />);
    const evButtons = screen.getAllByTestId(/^calendar-list-event-/);
    expect(evButtons).toHaveLength(2);
    expect(evButtons[0].getAttribute("data-testid")).toBe("calendar-list-event-early");
    expect(evButtons[1].getAttribute("data-testid")).toBe("calendar-list-event-late");
  });

  it("calls onSelectEvent when an event button is clicked", () => {
    const onSelect = vi.fn();
    const byDate: Record<string, CalendarEvent[]> = {
      "2026-04-18": [makeEvent({ id: "x", title: "Clickable" })],
    };
    render(<CalendarListView eventsByDate={byDate} onSelectEvent={onSelect} />);
    fireEvent.click(screen.getByTestId("calendar-list-event-x"));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0].id).toBe("x");
  });

  it("applies selected background when selectedEventId matches", () => {
    const byDate: Record<string, CalendarEvent[]> = {
      "2026-04-18": [makeEvent({ id: "sel", title: "Secili" })],
    };
    render(
      <CalendarListView
        eventsByDate={byDate}
        onSelectEvent={() => {}}
        selectedEventId="sel"
      />,
    );
    const btn = screen.getByTestId("calendar-list-event-sel");
    expect(btn.className).toContain("bg-brand-50/50");
  });

  it("renders inbox badge for events with inbox_item_id", () => {
    const byDate: Record<string, CalendarEvent[]> = {
      "2026-04-18": [
        makeEvent({ id: "i", title: "Inbox Olan", inbox_item_id: "in-1" }),
      ],
    };
    render(<CalendarListView eventsByDate={byDate} onSelectEvent={() => {}} />);
    expect(screen.getByText("inbox")).toBeDefined();
  });

  it("renders type label matching event_type", () => {
    const byDate: Record<string, CalendarEvent[]> = {
      "2026-04-18": [
        makeEvent({ id: "t1", event_type: "publish_record", title: "Yayın Ornegi" }),
      ],
    };
    render(<CalendarListView eventsByDate={byDate} onSelectEvent={() => {}} />);
    expect(screen.getByText("Yayın")).toBeDefined();
  });
});
