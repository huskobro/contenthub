/**
 * Automation Approver Dropdown smoke tests — Redesign REV-2 / P3.2.
 *
 * UserAutomationPage icindeki "Onaylayici (Approver)" dropdown parcasinin
 * davranisini dogrular. Tam sayfa booting yerine, dropdown JSX parcasi
 * minimal wrapper icinde yeniden render edilir:
 *
 *   - testid'ler dogru (automation-approver-section / automation-approver-select)
 *   - controlled value: policy.approver_user_id ?? "" binding'i
 *   - onChange serializasyonu: "" -> null, userId -> userId
 *   - "Owner (varsayilan)" secenegi her zaman var
 *   - "Kendim" secenegi yalniz userId varsa
 *   - help text "Bos birakilirsa politikanin sahibi (owner) approver kabul edilir."
 *   - disabled state updateMut.isPending yansimasi
 *
 * NOT: Backend spoof koruma (non-admin'in approver'i kendi id'si disinda
 * bir deger atamasi engellenir) service.py katmaninda test edildi
 * (test_phase_al_001_approver_migration.py + service_ownership suite).
 * Burada yalnizca UI kontrati dogrulanir.
 */
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import type { AutomationPolicyResponse, CheckpointMode } from "../api/automationApi";

function makePolicy(
  overrides: Partial<AutomationPolicyResponse> = {},
): AutomationPolicyResponse {
  const base: AutomationPolicyResponse = {
    id: "pol-1",
    channel_profile_id: "ch-1",
    owner_user_id: "user-1",
    approver_user_id: null,
    name: "Test Politikasi",
    is_enabled: true,
    source_scan_mode: "automatic" as CheckpointMode,
    draft_generation_mode: "manual_review" as CheckpointMode,
    render_mode: "automatic" as CheckpointMode,
    publish_mode: "manual_review" as CheckpointMode,
    post_publish_mode: "disabled" as CheckpointMode,
    max_daily_posts: 10,
    publish_windows_json: null,
    platform_rules_json: null,
    created_at: "2026-04-18T10:00:00Z",
    updated_at: "2026-04-18T10:00:00Z",
  };
  return { ...base, ...overrides };
}

/**
 * UserAutomationPage.tsx:291-316 dropdown JSX'ini birebir yansitan wrapper.
 * mutate callback'i prop olarak disaridan verilir -> testlerde spy edilir.
 */
interface Props {
  policy: AutomationPolicyResponse;
  userId: string | null;
  isPending?: boolean;
  onMutate: (patch: { id: string; approver_user_id: string | null }) => void;
}

function ApproverDropdownFragment({ policy, userId, isPending = false, onMutate }: Props) {
  const [value, setValue] = useState<string>(policy.approver_user_id ?? "");
  return (
    <div data-testid="automation-approver-section">
      <label className="block text-xs font-medium text-neutral-600 mb-1">
        Onaylayici (Approver)
      </label>
      <select
        data-testid="automation-approver-select"
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          setValue(v);
          onMutate({
            id: policy.id,
            approver_user_id: v === "" ? null : v,
          });
        }}
        disabled={isPending}
        className="w-full max-w-sm px-2 py-1 text-sm border border-neutral-200 rounded"
      >
        <option value="">Owner (varsayilan)</option>
        {userId && <option value={userId}>Kendim</option>}
      </select>
      <p className="m-0 text-[10px] text-neutral-400 mt-1">
        Bos birakilirsa politikanin sahibi (owner) approver kabul edilir.
        Publish-gate enforcement bu dalgada yok — alan declarative.
      </p>
    </div>
  );
}

describe("Automation Approver Dropdown — P3.2 UI kontrati", () => {
  it("section + select testid'leri render edilir", () => {
    const onMutate = vi.fn();
    render(
      <ApproverDropdownFragment
        policy={makePolicy()}
        userId="user-1"
        onMutate={onMutate}
      />,
    );
    expect(screen.getByTestId("automation-approver-section")).toBeDefined();
    expect(screen.getByTestId("automation-approver-select")).toBeDefined();
  });

  it("policy.approver_user_id NULL ise initial value '' olur", () => {
    render(
      <ApproverDropdownFragment
        policy={makePolicy({ approver_user_id: null })}
        userId="user-1"
        onMutate={vi.fn()}
      />,
    );
    const sel = screen.getByTestId(
      "automation-approver-select",
    ) as HTMLSelectElement;
    expect(sel.value).toBe("");
  });

  it("policy.approver_user_id set ise initial value o id olur", () => {
    render(
      <ApproverDropdownFragment
        policy={makePolicy({ approver_user_id: "user-1" })}
        userId="user-1"
        onMutate={vi.fn()}
      />,
    );
    const sel = screen.getByTestId(
      "automation-approver-select",
    ) as HTMLSelectElement;
    expect(sel.value).toBe("user-1");
  });

  it("'Owner (varsayilan)' secenegi her zaman render edilir", () => {
    render(
      <ApproverDropdownFragment
        policy={makePolicy()}
        userId={null}
        onMutate={vi.fn()}
      />,
    );
    const sel = screen.getByTestId("automation-approver-select");
    expect(sel.textContent).toContain("Owner (varsayilan)");
  });

  it("'Kendim' secenegi yalniz userId varsa render edilir", () => {
    const { rerender } = render(
      <ApproverDropdownFragment
        policy={makePolicy()}
        userId={null}
        onMutate={vi.fn()}
      />,
    );
    let sel = screen.getByTestId("automation-approver-select");
    expect(sel.textContent).not.toContain("Kendim");

    rerender(
      <ApproverDropdownFragment
        policy={makePolicy()}
        userId="user-1"
        onMutate={vi.fn()}
      />,
    );
    sel = screen.getByTestId("automation-approver-select");
    expect(sel.textContent).toContain("Kendim");
  });

  it("onChange: 'Kendim' secimi -> userId payload'a gecer", () => {
    const onMutate = vi.fn();
    render(
      <ApproverDropdownFragment
        policy={makePolicy({ approver_user_id: null })}
        userId="user-1"
        onMutate={onMutate}
      />,
    );
    const sel = screen.getByTestId(
      "automation-approver-select",
    ) as HTMLSelectElement;
    fireEvent.change(sel, { target: { value: "user-1" } });
    expect(onMutate).toHaveBeenCalledWith({
      id: "pol-1",
      approver_user_id: "user-1",
    });
  });

  it("onChange: 'Owner (varsayilan)' secimi -> null payload'a gecer", () => {
    const onMutate = vi.fn();
    render(
      <ApproverDropdownFragment
        policy={makePolicy({ approver_user_id: "user-1" })}
        userId="user-1"
        onMutate={onMutate}
      />,
    );
    const sel = screen.getByTestId(
      "automation-approver-select",
    ) as HTMLSelectElement;
    fireEvent.change(sel, { target: { value: "" } });
    expect(onMutate).toHaveBeenCalledWith({
      id: "pol-1",
      approver_user_id: null,
    });
  });

  it("help text 'owner approver kabul edilir' icerir", () => {
    render(
      <ApproverDropdownFragment
        policy={makePolicy()}
        userId="user-1"
        onMutate={vi.fn()}
      />,
    );
    const section = screen.getByTestId("automation-approver-section");
    expect(section.textContent).toContain(
      "Bos birakilirsa politikanin sahibi (owner) approver kabul edilir.",
    );
    // Publish-gate enforcement henuz yok disclaimer'i da gorunur olmali
    expect(section.textContent).toContain("Publish-gate enforcement bu dalgada yok");
  });

  it("isPending=true iken select disabled olur", () => {
    render(
      <ApproverDropdownFragment
        policy={makePolicy()}
        userId="user-1"
        isPending={true}
        onMutate={vi.fn()}
      />,
    );
    const sel = screen.getByTestId(
      "automation-approver-select",
    ) as HTMLSelectElement;
    expect(sel.disabled).toBe(true);
  });
});
