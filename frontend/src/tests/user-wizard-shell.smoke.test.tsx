/**
 * UserWizardShell smoke tests — REV-2 / P3.3.
 *
 * Kapsam:
 *   - Scope chip + mode toggle + icerik passthrough contract
 *   - useWizardStore guided/advanced toggle davranisi
 *   - showModeToggle=false iken toggle gizlenir
 *   - showScopeReminder=false iken chip gizlenir
 *   - testId namespace (user-wizard-* + user-wizard-shell-*)
 *
 * NOT: useWizardStore gercek Zustand store'u — her testin basinda
 * "guided" resetine donmek icin `useWizardStore.setState({userMode: 'guided'})`
 * cagirilir.
 */
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserWizardShell } from "../components/wizard/UserWizardShell";
import type { WizardStep } from "../components/wizard/WizardShell";
import { useWizardStore } from "../stores/wizardStore";

const STEPS: WizardStep[] = [
  { id: "a", label: "Adim A" },
  { id: "b", label: "Adim B" },
];

describe("UserWizardShell — P3.3 UI sozlesmesi", () => {
  beforeEach(() => {
    // Her test guided mode'dan baslasin
    useWizardStore.setState({ userMode: "guided" });
  });

  it("scope chip + mode toggle default render edilir", () => {
    render(
      <UserWizardShell title="Test" steps={STEPS} currentStep={0}>
        <div>X</div>
      </UserWizardShell>,
    );
    expect(screen.getByTestId("user-wizard")).toBeDefined();
    expect(screen.getByTestId("user-wizard-toolbar")).toBeDefined();
    expect(screen.getByTestId("user-wizard-scope-chip")).toBeDefined();
    expect(screen.getByTestId("user-wizard-mode-toggle")).toBeDefined();
  });

  it("children passthrough — ic icerik render edilir", () => {
    render(
      <UserWizardShell title="Test" steps={STEPS} currentStep={0}>
        <div data-testid="my-child">Cocuk</div>
      </UserWizardShell>,
    );
    expect(screen.getByTestId("my-child")).toBeDefined();
    expect(screen.getByTestId("my-child").textContent).toBe("Cocuk");
  });

  it("mode toggle initial state guided, click → advanced", () => {
    render(
      <UserWizardShell title="Test" steps={STEPS} currentStep={0}>
        <div>X</div>
      </UserWizardShell>,
    );
    const toggle = screen.getByTestId(
      "user-wizard-mode-toggle",
    ) as HTMLButtonElement;
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    expect(toggle.textContent).toContain("Rehberli");

    fireEvent.click(toggle);

    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    expect(toggle.textContent).toContain("Gelismis");
    expect(useWizardStore.getState().userMode).toBe("advanced");

    fireEvent.click(toggle);
    expect(useWizardStore.getState().userMode).toBe("guided");
  });

  it("mode toggle store'un mevcut degerini yansitir", () => {
    useWizardStore.setState({ userMode: "advanced" });
    render(
      <UserWizardShell title="Test" steps={STEPS} currentStep={0}>
        <div>X</div>
      </UserWizardShell>,
    );
    const toggle = screen.getByTestId(
      "user-wizard-mode-toggle",
    ) as HTMLButtonElement;
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    expect(toggle.textContent).toContain("Gelismis");
  });

  it("showModeToggle=false iken toggle render edilmez", () => {
    render(
      <UserWizardShell
        title="Test"
        steps={STEPS}
        currentStep={0}
        showModeToggle={false}
      >
        <div>X</div>
      </UserWizardShell>,
    );
    expect(screen.queryByTestId("user-wizard-mode-toggle")).toBeNull();
    expect(screen.getByTestId("user-wizard-scope-chip")).toBeDefined();
  });

  it("showScopeReminder=false iken chip render edilmez", () => {
    render(
      <UserWizardShell
        title="Test"
        steps={STEPS}
        currentStep={0}
        showScopeReminder={false}
      >
        <div>X</div>
      </UserWizardShell>,
    );
    expect(screen.queryByTestId("user-wizard-scope-chip")).toBeNull();
    expect(screen.getByTestId("user-wizard-mode-toggle")).toBeDefined();
  });

  it("icteki WizardShell testid prefix'i user-wizard-shell-* olur", () => {
    render(
      <UserWizardShell title="Test" steps={STEPS} currentStep={0}>
        <div>X</div>
      </UserWizardShell>,
    );
    expect(screen.getByTestId("user-wizard-shell")).toBeDefined();
    expect(screen.getByTestId("user-wizard-shell-title")).toBeDefined();
    expect(screen.getByTestId("user-wizard-shell-content")).toBeDefined();
  });

  it("nav prop'lari (onBack/onNext) WizardShell'e gecer", () => {
    const onBack = vi.fn();
    const onNext = vi.fn();
    render(
      <UserWizardShell
        title="Test"
        steps={STEPS}
        currentStep={1}
        onBack={onBack}
        onNext={onNext}
      >
        <div>X</div>
      </UserWizardShell>,
    );
    fireEvent.click(screen.getByTestId("user-wizard-shell-back"));
    fireEvent.click(screen.getByTestId("user-wizard-shell-next"));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("custom testId prefix'i tum iskelete yayilir", () => {
    render(
      <UserWizardShell
        title="X"
        steps={STEPS}
        currentStep={0}
        testId="my-uwz"
      >
        <div>X</div>
      </UserWizardShell>,
    );
    expect(screen.getByTestId("my-uwz")).toBeDefined();
    expect(screen.getByTestId("my-uwz-toolbar")).toBeDefined();
    expect(screen.getByTestId("my-uwz-scope-chip")).toBeDefined();
    expect(screen.getByTestId("my-uwz-mode-toggle")).toBeDefined();
    expect(screen.getByTestId("my-uwz-shell")).toBeDefined();
  });
});
