/**
 * AdminWizardShell smoke tests — REV-2 / P3.3.
 *
 * Kapsam:
 *   - Admin chip + snapshot-lock banner + preview toggle contract
 *   - Icerik (children + WizardShell) degismeden render edilir
 *   - Preview toggle state degisimi + callback
 *   - Snapshot-lock banner opt-out (showSnapshotLockBanner=false)
 *   - onPreviewModeChange verilmediginde toggle render edilmez
 *   - testId namespace'i (admin-wizard-* + admin-wizard-shell-*)
 *
 * NOT: Asil wizard motoru (WizardShell) icin ayri smoke bekliyoruz — bu
 * dosya yalnizca admin-wrapper ekleri + children passthrough sozlesmesini
 * dogrular.
 */
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AdminWizardShell } from "../components/wizard/AdminWizardShell";
import type { WizardStep } from "../components/wizard/WizardShell";

const STEPS: WizardStep[] = [
  { id: "a", label: "Adim A" },
  { id: "b", label: "Adim B" },
];

describe("AdminWizardShell — P3.3 UI sozlesmesi", () => {
  it("admin chip + snapshot-lock banner default acik render edilir", () => {
    render(
      <AdminWizardShell title="Test" steps={STEPS} currentStep={0}>
        <div data-testid="content">X</div>
      </AdminWizardShell>,
    );
    expect(screen.getByTestId("admin-wizard")).toBeDefined();
    expect(screen.getByTestId("admin-wizard-toolbar")).toBeDefined();
    expect(screen.getByTestId("admin-wizard-admin-chip")).toBeDefined();
    expect(screen.getByTestId("admin-wizard-snapshot-lock-banner")).toBeDefined();
  });

  it("children passthrough — WizardShell icindeki content render edilir", () => {
    render(
      <AdminWizardShell title="Test" steps={STEPS} currentStep={0}>
        <div data-testid="my-child">Cocuk icerik</div>
      </AdminWizardShell>,
    );
    expect(screen.getByTestId("my-child")).toBeDefined();
    expect(screen.getByTestId("my-child").textContent).toBe("Cocuk icerik");
  });

  it("icteki WizardShell testid prefix'i admin-wizard-shell-* olur", () => {
    render(
      <AdminWizardShell title="Test" steps={STEPS} currentStep={0}>
        <div>X</div>
      </AdminWizardShell>,
    );
    // Wrapper + inner shell iki ayri DOM node — inner shell'in testid'i
    // "admin-wizard-shell" olmali (WizardShell'in testId prop'u
    // `${testId}-shell` ile bindirilmistir).
    expect(screen.getByTestId("admin-wizard-shell")).toBeDefined();
    expect(screen.getByTestId("admin-wizard-shell-title")).toBeDefined();
    expect(screen.getByTestId("admin-wizard-shell-content")).toBeDefined();
  });

  it("showSnapshotLockBanner=false iken banner render edilmez", () => {
    render(
      <AdminWizardShell
        title="Test"
        steps={STEPS}
        currentStep={0}
        showSnapshotLockBanner={false}
      >
        <div>X</div>
      </AdminWizardShell>,
    );
    expect(screen.queryByTestId("admin-wizard-snapshot-lock-banner")).toBeNull();
  });

  it("onPreviewModeChange verilmediginde preview toggle render edilmez", () => {
    render(
      <AdminWizardShell title="Test" steps={STEPS} currentStep={0}>
        <div>X</div>
      </AdminWizardShell>,
    );
    expect(screen.queryByTestId("admin-wizard-preview-toggle")).toBeNull();
  });

  it("onPreviewModeChange verildiginde preview toggle render edilir", () => {
    render(
      <AdminWizardShell
        title="Test"
        steps={STEPS}
        currentStep={0}
        onPreviewModeChange={vi.fn()}
      >
        <div>X</div>
      </AdminWizardShell>,
    );
    expect(screen.getByTestId("admin-wizard-preview-toggle")).toBeDefined();
  });

  it("preview toggle: click admin→user→admin, callback her click'te", () => {
    const onPreviewModeChange = vi.fn();
    render(
      <AdminWizardShell
        title="Test"
        steps={STEPS}
        currentStep={0}
        onPreviewModeChange={onPreviewModeChange}
      >
        <div>X</div>
      </AdminWizardShell>,
    );
    const toggle = screen.getByTestId(
      "admin-wizard-preview-toggle",
    ) as HTMLButtonElement;
    // Initial: admin mode, aria-pressed=false
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    expect(toggle.textContent).toContain("Admin Gorunumu");

    // Click 1 → user mode
    fireEvent.click(toggle);
    expect(onPreviewModeChange).toHaveBeenNthCalledWith(1, "user");
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    expect(toggle.textContent).toContain("Kullanici Gozuyle");

    // Click 2 → admin mode
    fireEvent.click(toggle);
    expect(onPreviewModeChange).toHaveBeenNthCalledWith(2, "admin");
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
  });

  it("nav prop'lari (onBack/onNext/onCancel) WizardShell'e gecer", () => {
    const onBack = vi.fn();
    const onNext = vi.fn();
    render(
      <AdminWizardShell
        title="Test"
        steps={STEPS}
        currentStep={1}
        onBack={onBack}
        onNext={onNext}
      >
        <div>X</div>
      </AdminWizardShell>,
    );
    fireEvent.click(screen.getByTestId("admin-wizard-shell-back"));
    fireEvent.click(screen.getByTestId("admin-wizard-shell-next"));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("custom testId prefix'i tum iskelete yayilir", () => {
    render(
      <AdminWizardShell
        title="X"
        steps={STEPS}
        currentStep={0}
        testId="my-wz"
      >
        <div>X</div>
      </AdminWizardShell>,
    );
    expect(screen.getByTestId("my-wz")).toBeDefined();
    expect(screen.getByTestId("my-wz-toolbar")).toBeDefined();
    expect(screen.getByTestId("my-wz-admin-chip")).toBeDefined();
    expect(screen.getByTestId("my-wz-snapshot-lock-banner")).toBeDefined();
    expect(screen.getByTestId("my-wz-shell")).toBeDefined();
  });
});
