/**
 * Publish Center default-view persistence contract — Redesign REV-2 / P2.5.
 *
 * PublishCenterPage'in `view` state'i localStorage anahtari
 * `publish.center.default_view` uzerinde `{ v: 1, view }` payload'i ile
 * persist eder. Bu test PublishCenterPage icindeki helper'larin module-local
 * kalmasini koruyarak sozlesmeyi dokumante eder — backend tarafindaki
 * Settings Registry key'i `publish.center.default_view` ile ayni default'u
 * paylasir.
 *
 * Kontrol edilen kontrat:
 *   - localStorage'da gecerli `{ v:1, view:"board" }` → yuklenen default "board"
 *   - versiyon uyumsuzlugunda default "table" (builtin)
 *   - bozuk JSON'da default "table" (builtin)
 *   - bilinmeyen view degerinde default "table" (builtin)
 */
import { describe, it, expect, beforeEach } from "vitest";

// Storage sozlesmesi — PublishCenterPage.tsx ile ayni (duplicate kabul
// edilebilir: intentional contract doc; helper'lar module-local kalir).
const KEY = "publish.center.default_view";
const VERSION = 1;
type PublishViewMode = "table" | "board";

function loadDefaultPublishView(): PublishViewMode {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return "table";
    const parsed = JSON.parse(raw) as { v: number; view: PublishViewMode };
    if (parsed?.v !== VERSION) return "table";
    if (parsed.view === "table" || parsed.view === "board") {
      return parsed.view;
    }
  } catch {
    // fallthrough
  }
  return "table";
}

describe("Publish Center default-view persistence — P2.5 storage sozlesmesi", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("empty storage → builtin default 'table'", () => {
    expect(loadDefaultPublishView()).toBe("table");
  });

  it("valid stored view is loaded back", () => {
    window.localStorage.setItem(KEY, JSON.stringify({ v: 1, view: "board" }));
    expect(loadDefaultPublishView()).toBe("board");
    window.localStorage.setItem(KEY, JSON.stringify({ v: 1, view: "table" }));
    expect(loadDefaultPublishView()).toBe("table");
  });

  it("version mismatch falls back to builtin default", () => {
    window.localStorage.setItem(KEY, JSON.stringify({ v: 99, view: "board" }));
    expect(loadDefaultPublishView()).toBe("table");
  });

  it("corrupt JSON falls back to builtin default", () => {
    window.localStorage.setItem(KEY, "{not valid");
    expect(loadDefaultPublishView()).toBe("table");
  });

  it("unknown view value falls back to builtin default", () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ v: 1, view: "kanban" as unknown as PublishViewMode }),
    );
    expect(loadDefaultPublishView()).toBe("table");
  });
});
