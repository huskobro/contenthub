/**
 * Calendar default-view persistence contract — Redesign REV-2 / P2.4.
 *
 * UserCalendarPage'in `view` state'i localStorage anahtarı
 * `calendar.default_view` üstünde `{ v: 1, view }` payload'i ile persist eder.
 * Bu test UserCalendarPage içindeki helper'ların module-local kalmasını
 * koruyarak sözleşmeyi dokümante eder — backend tarafındaki Settings Registry
 * key'i `user.calendar.default_view` ile aynı default'u paylaşır.
 *
 * Kontrol edilen kontrat:
 *   - localStorage'da geçerli `{ v:1, view:"week" }` → yüklenen default "week"
 *   - versiyon uyumsuzluğunda default "month" (builtin)
 *   - bozuk JSON'da default "month" (builtin)
 *   - bilinmeyen view değerinde default "month" (builtin)
 */
import { describe, it, expect, beforeEach } from "vitest";

// Storage sözleşmesi — UserCalendarPage.tsx ile aynı (duplicate kabul edilebilir:
// intentional contract doc; helper'lar module-local kalır).
const KEY = "calendar.default_view";
const VERSION = 1;
type ViewMode = "list" | "week" | "month";

function loadDefaultView(): ViewMode {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return "month";
    const parsed = JSON.parse(raw) as { v: number; view: ViewMode };
    if (parsed?.v !== VERSION) return "month";
    if (parsed.view === "list" || parsed.view === "week" || parsed.view === "month") {
      return parsed.view;
    }
  } catch {
    // fallthrough
  }
  return "month";
}

describe("Calendar default-view persistence — P2.4 storage sözleşmesi", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("empty storage → builtin default 'month'", () => {
    expect(loadDefaultView()).toBe("month");
  });

  it("valid stored view is loaded back", () => {
    window.localStorage.setItem(KEY, JSON.stringify({ v: 1, view: "week" }));
    expect(loadDefaultView()).toBe("week");
    window.localStorage.setItem(KEY, JSON.stringify({ v: 1, view: "list" }));
    expect(loadDefaultView()).toBe("list");
  });

  it("version mismatch falls back to builtin default", () => {
    window.localStorage.setItem(KEY, JSON.stringify({ v: 99, view: "week" }));
    expect(loadDefaultView()).toBe("month");
  });

  it("corrupt JSON falls back to builtin default", () => {
    window.localStorage.setItem(KEY, "{not valid");
    expect(loadDefaultView()).toBe("month");
  });

  it("unknown view value falls back to builtin default", () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ v: 1, view: "year" as unknown as ViewMode }),
    );
    expect(loadDefaultView()).toBe("month");
  });
});
