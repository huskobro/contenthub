/**
 * PublishBoard smoke tests — Redesign REV-2 / P2.5.
 *
 * Board gorunumunun durum-gruplama sozlesmesini ve kart
 * render davranisini dogrular:
 *   - 6 sutun (draft / pending_review / approved / scheduled / published /
 *     failed) her zaman render (bos olanlar "kayit yok" fallback ile)
 *   - kayitlar status alanina gore dogru sutuna dusuyor
 *   - sutun sayaclari grup boyutunu yansitiyor
 *   - bilinmeyen durumlar hicbir sutunda gorunmez (legacy tabloda kalir)
 *   - kart onClick -> onOpen callback'i geciyor
 *   - PublishCard baslik + platform + durum label + deneme sayisi render
 */
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PublishBoard } from "../components/publish/PublishBoard";
import type { PublishRecordSummary } from "../api/publishApi";

function makeRecord(over: Partial<PublishRecordSummary> = {}): PublishRecordSummary {
  const base: PublishRecordSummary = {
    id: "rec-1",
    job_id: "job-1",
    content_ref_type: "standard_video",
    content_ref_id: "content-ab12cd34",
    platform: "youtube",
    status: "draft",
    review_state: "not_required",
    publish_attempt_count: 0,
    scheduled_at: null,
    published_at: null,
    platform_url: null,
    content_project_id: null,
    platform_connection_id: null,
    last_error_category: null,
    created_at: "2026-04-18T10:00:00Z",
    updated_at: "2026-04-18T10:00:00Z",
  };
  return { ...base, ...over };
}

describe("PublishBoard — P2.5 board gorunumu", () => {
  it("renders all 6 columns even when empty", () => {
    render(<PublishBoard records={[]} onOpen={() => {}} />);
    expect(screen.getByTestId("publish-board-column-draft")).toBeDefined();
    expect(screen.getByTestId("publish-board-column-pending_review")).toBeDefined();
    expect(screen.getByTestId("publish-board-column-approved")).toBeDefined();
    expect(screen.getByTestId("publish-board-column-scheduled")).toBeDefined();
    expect(screen.getByTestId("publish-board-column-published")).toBeDefined();
    expect(screen.getByTestId("publish-board-column-failed")).toBeDefined();
    // her sutunun bos fallback'ini gorelim
    expect(screen.getAllByText("Bu sutunda kayit yok.")).toHaveLength(6);
  });

  it("groups records into the correct column by status", () => {
    const records = [
      makeRecord({ id: "a", status: "draft" }),
      makeRecord({ id: "b", status: "draft" }),
      makeRecord({ id: "c", status: "pending_review" }),
      makeRecord({ id: "d", status: "scheduled" }),
      makeRecord({ id: "e", status: "published" }),
      makeRecord({ id: "f", status: "failed", last_error_category: "quota_exceeded" }),
    ];
    render(<PublishBoard records={records} onOpen={() => {}} />);
    // "draft" sutununda 2 kart
    expect(screen.getByTestId("publish-board-count-draft").textContent).toBe("2");
    expect(screen.getByTestId("publish-board-count-pending_review").textContent).toBe("1");
    expect(screen.getByTestId("publish-board-count-approved").textContent).toBe("0");
    expect(screen.getByTestId("publish-board-count-scheduled").textContent).toBe("1");
    expect(screen.getByTestId("publish-board-count-published").textContent).toBe("1");
    expect(screen.getByTestId("publish-board-count-failed").textContent).toBe("1");
    // kart testid'leri
    expect(screen.getByTestId("publish-card-a")).toBeDefined();
    expect(screen.getByTestId("publish-card-f")).toBeDefined();
  });

  it("ignores records with unknown/unsupported status (stays in table mode only)", () => {
    const records = [
      makeRecord({ id: "x", status: "publishing" }), // MVP sutun listesinde yok
      makeRecord({ id: "y", status: "cancelled" }),
      makeRecord({ id: "z", status: "draft" }),
    ];
    render(<PublishBoard records={records} onOpen={() => {}} />);
    expect(screen.getByTestId("publish-board-count-draft").textContent).toBe("1");
    // bilinmeyen durumda kart render olmamali
    expect(screen.queryByTestId("publish-card-x")).toBeNull();
    expect(screen.queryByTestId("publish-card-y")).toBeNull();
    expect(screen.getByTestId("publish-card-z")).toBeDefined();
  });

  it("calls onOpen when a card is clicked", () => {
    const onOpen = vi.fn();
    render(
      <PublishBoard
        records={[makeRecord({ id: "clickme", status: "pending_review" })]}
        onOpen={onOpen}
      />,
    );
    fireEvent.click(screen.getByTestId("publish-card-clickme"));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen.mock.calls[0][0].id).toBe("clickme");
  });

  it("card shows status label, platform and attempts when >0", () => {
    render(
      <PublishBoard
        records={[
          makeRecord({
            id: "rich",
            status: "scheduled",
            platform: "youtube",
            publish_attempt_count: 3,
            scheduled_at: "2026-04-20T14:00:00Z",
          }),
        ]}
        onOpen={() => {}}
      />,
    );
    const card = screen.getByTestId("publish-card-rich");
    expect(card.textContent).toContain("Zamanlandi");
    expect(card.textContent?.toLowerCase()).toContain("youtube");
    expect(screen.getByTestId("publish-card-attempts-rich").textContent).toContain("3 deneme");
  });

  it("card does not render attempts chip when attempts=0", () => {
    render(
      <PublishBoard
        records={[makeRecord({ id: "fresh", publish_attempt_count: 0 })]}
        onOpen={() => {}}
      />,
    );
    expect(screen.queryByTestId("publish-card-attempts-fresh")).toBeNull();
  });

  it("applies selected styling when id is in selectedIds set", () => {
    render(
      <PublishBoard
        records={[makeRecord({ id: "sel", status: "draft" })]}
        onOpen={() => {}}
        selectedIds={new Set(["sel"])}
      />,
    );
    const card = screen.getByTestId("publish-card-sel");
    expect(card.className).toContain("border-brand-400");
  });
});
