/**
 * AutomationFlowSvg smoke tests — Redesign REV-2 / P2.6.
 *
 * Otomasyon politikasinin mevcut checkpoint mode'larina gore saf SVG
 * akis gorselinin dogru cizildigini dogrular:
 *   - 5 node ve 4 ok render
 *   - mode -> renk (fill/stroke) eslemesi
 *   - mode -> rozet metni (AUTO / ONAY / KAPALI)
 *   - container + svg + legend testid'leri
 *   - dependency-free: saf SVG (MEMORY §5.1 heavy-dep yasagi korunur)
 */
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { AutomationFlowSvg } from "../components/automation/AutomationFlowSvg";
import type { AutomationPolicyResponse, CheckpointMode } from "../api/automationApi";

function makePolicy(overrides: Partial<AutomationPolicyResponse> = {}): AutomationPolicyResponse {
  const base: AutomationPolicyResponse = {
    id: "pol-1",
    channel_profile_id: "ch-1",
    owner_user_id: "user-1",
    name: "Test Politikasi",
    is_enabled: true,
    source_scan_mode: "automatic",
    draft_generation_mode: "manual_review",
    render_mode: "automatic",
    publish_mode: "manual_review",
    post_publish_mode: "disabled",
    max_daily_posts: 10,
    created_at: "2026-04-18T10:00:00Z",
    updated_at: "2026-04-18T10:00:00Z",
  } as AutomationPolicyResponse;
  return { ...base, ...overrides };
}

describe("AutomationFlowSvg — P2.6 akis gorsel onizlemesi", () => {
  it("renders container + svg + all 5 flow nodes", () => {
    render(<AutomationFlowSvg policy={makePolicy()} />);
    expect(screen.getByTestId("automation-flow-svg-container")).toBeDefined();
    expect(screen.getByTestId("automation-flow-svg")).toBeDefined();
    expect(screen.getByTestId("automation-flow-node-source_scan_mode")).toBeDefined();
    expect(screen.getByTestId("automation-flow-node-draft_generation_mode")).toBeDefined();
    expect(screen.getByTestId("automation-flow-node-render_mode")).toBeDefined();
    expect(screen.getByTestId("automation-flow-node-publish_mode")).toBeDefined();
    expect(screen.getByTestId("automation-flow-node-post_publish_mode")).toBeDefined();
  });

  it("renders exactly 4 arrows between 5 nodes", () => {
    render(<AutomationFlowSvg policy={makePolicy()} />);
    expect(screen.getByTestId("automation-flow-arrow-0")).toBeDefined();
    expect(screen.getByTestId("automation-flow-arrow-1")).toBeDefined();
    expect(screen.getByTestId("automation-flow-arrow-2")).toBeDefined();
    expect(screen.getByTestId("automation-flow-arrow-3")).toBeDefined();
    // 5 node icin tam 4 ok; 5. ok olmamali
    expect(screen.queryByTestId("automation-flow-arrow-4")).toBeNull();
  });

  it("maps each checkpoint mode to its badge label", () => {
    render(<AutomationFlowSvg policy={makePolicy()} />);
    // source_scan_mode = automatic -> AUTO
    expect(
      screen.getByTestId("automation-flow-badge-source_scan_mode").textContent,
    ).toBe("AUTO");
    // draft_generation_mode = manual_review -> ONAY
    expect(
      screen.getByTestId("automation-flow-badge-draft_generation_mode").textContent,
    ).toBe("ONAY");
    // render_mode = automatic -> AUTO
    expect(screen.getByTestId("automation-flow-badge-render_mode").textContent).toBe(
      "AUTO",
    );
    // publish_mode = manual_review -> ONAY
    expect(screen.getByTestId("automation-flow-badge-publish_mode").textContent).toBe(
      "ONAY",
    );
    // post_publish_mode = disabled -> KAPALI
    expect(
      screen.getByTestId("automation-flow-badge-post_publish_mode").textContent,
    ).toBe("KAPALI");
  });

  it("applies mode-based fill colors on rect elements", () => {
    render(
      <AutomationFlowSvg
        policy={makePolicy({
          source_scan_mode: "automatic" as CheckpointMode,
          draft_generation_mode: "manual_review" as CheckpointMode,
          render_mode: "disabled" as CheckpointMode,
          publish_mode: "automatic" as CheckpointMode,
          post_publish_mode: "disabled" as CheckpointMode,
        })}
      />,
    );
    const autoNode = screen
      .getByTestId("automation-flow-node-source_scan_mode")
      .querySelector("rect");
    const reviewNode = screen
      .getByTestId("automation-flow-node-draft_generation_mode")
      .querySelector("rect");
    const disabledNode = screen
      .getByTestId("automation-flow-node-render_mode")
      .querySelector("rect");
    // automatic -> success-light var / #dcfce7
    expect(autoNode?.getAttribute("fill") ?? "").toContain("success-light");
    // manual_review -> warning-light var / #fef3c7
    expect(reviewNode?.getAttribute("fill") ?? "").toContain("warning-light");
    // disabled -> neutral-100 var / #f3f4f6
    expect(disabledNode?.getAttribute("fill") ?? "").toContain("neutral-100");
  });

  it("renders node label text for each checkpoint", () => {
    render(<AutomationFlowSvg policy={makePolicy()} />);
    // SVG text nodlari — innerHTML uzerinden icerik kontrolu
    const svg = screen.getByTestId("automation-flow-svg");
    expect(svg.textContent).toContain("Kaynak Tarama");
    expect(svg.textContent).toContain("Taslak");
    expect(svg.textContent).toContain("Render");
    expect(svg.textContent).toContain("Yayin");
    expect(svg.textContent).toContain("Yayin Sonrasi");
  });

  it("renders legend with AUTO / ONAY / KAPALI keys", () => {
    render(<AutomationFlowSvg policy={makePolicy()} />);
    const container = screen.getByTestId("automation-flow-svg-container");
    expect(container.textContent).toContain("AUTO");
    expect(container.textContent).toContain("ONAY");
    expect(container.textContent).toContain("KAPALI");
  });

  it("handles all-disabled policy without crashing (kill-switch sim)", () => {
    render(
      <AutomationFlowSvg
        policy={makePolicy({
          source_scan_mode: "disabled" as CheckpointMode,
          draft_generation_mode: "disabled" as CheckpointMode,
          render_mode: "disabled" as CheckpointMode,
          publish_mode: "disabled" as CheckpointMode,
          post_publish_mode: "disabled" as CheckpointMode,
        })}
      />,
    );
    // 5 disabled node, 5 rozet KAPALI olmali
    const badges = [
      "automation-flow-badge-source_scan_mode",
      "automation-flow-badge-draft_generation_mode",
      "automation-flow-badge-render_mode",
      "automation-flow-badge-publish_mode",
      "automation-flow-badge-post_publish_mode",
    ];
    for (const id of badges) {
      expect(screen.getByTestId(id).textContent).toBe("KAPALI");
    }
  });
});
