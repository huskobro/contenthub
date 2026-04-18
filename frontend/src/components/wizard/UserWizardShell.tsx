/**
 * UserWizardShell — REV-2 / P3.3.
 *
 * Kullanici panelindeki wizard sayfalari icin ince shell (WizardShell +
 * user-only ekler). "Tek motor + iki shell" kararinin user tarafi (admin tarafi:
 * AdminWizardShell). Mevcut `WizardShell` motoru ayni kalir — bu bilesen onun
 * uzerine user-spesifik 2 ek surme:
 *
 *   1) Guided / Advanced toggle: mevcut `wizardStore.userMode` ile bagli.
 *      Toggle Zustand store'undan okur+yazar (Zustand: UI state / React Query:
 *      server state kurali CLAUDE.md'den). Children icinde `userMode` prop'u
 *      tuketen alt bilesenler advanced alanlari gosterip gizleyebilir.
 *
 *   2) Scope reminder: "Kendi alaninda" ipucu. user_id her zaman backend
 *      tarafindan enforce edilir — bu satir kullaniciya gorsel hatirlatma.
 *      "Kullanici scope'unu degistirememe" backend sozlesmesidir, UI'daki
 *      bu yazi onun dubbel-gosterimi degil; sadece "sen kimsin" hissi.
 *
 * Parallel-pattern kurali (CLAUDE.md): `WizardShell` motoru DEGISTIRILMEDI —
 * bu bilesen onu sarar, yeniden yazmaz.
 */
import { type ReactNode } from "react";
import { WizardShell, type WizardStep } from "./WizardShell";
import { useWizardStore } from "../../stores/wizardStore";
import { cn } from "../../lib/cn";

export interface UserWizardShellProps {
  title: string;
  steps: WizardStep[];
  currentStep: number;
  children: ReactNode;
  onBack?: () => void;
  onNext?: () => void;
  onCancel?: () => void;
  nextLabel?: string;
  backLabel?: string;
  nextDisabled?: boolean;
  isLastStep?: boolean;
  /**
   * Guided/Advanced toggle goster/gizle. Bazi wizard'lar tek mod ile
   * yayinlanabilir — varsayilan true.
   */
  showModeToggle?: boolean;
  /**
   * Scope reminder satirini goster/gizle. Default true.
   */
  showScopeReminder?: boolean;
  testId?: string;
}

/**
 * User wizard shell — WizardShell + guided/advanced toggle + scope reminder.
 *
 * Note: guided/advanced durumu `useWizardStore()` icinde persist edilir (session
 * boyunca). Wizard icindeki alt bilesenler `useWizardStore((s) => s.userMode)`
 * ile okuyabilir — shell children'a prop olarak **gecirmez** (parallel pattern
 * uretmemek icin: store tek gercek kaynak).
 */
export function UserWizardShell({
  title,
  steps,
  currentStep,
  children,
  onBack,
  onNext,
  onCancel,
  nextLabel,
  backLabel,
  nextDisabled,
  isLastStep,
  showModeToggle = true,
  showScopeReminder = true,
  testId = "user-wizard",
}: UserWizardShellProps) {
  const userMode = useWizardStore((s) => s.userMode);
  const toggleUserMode = useWizardStore((s) => s.toggleUserMode);

  return (
    <div data-testid={testId}>
      {/* Scope chip + mode toggle satiri */}
      <div className="flex items-center justify-between mb-2" data-testid={`${testId}-toolbar`}>
        {showScopeReminder && (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"
            data-testid={`${testId}-scope-chip`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Kendi alaninda
          </span>
        )}
        {showModeToggle && (
          <button
            type="button"
            onClick={toggleUserMode}
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border cursor-pointer transition-colors",
              userMode === "advanced"
                ? "bg-brand-50 text-brand-700 border-brand-200"
                : "bg-neutral-50 text-neutral-600 border-border-subtle hover:bg-neutral-100",
            )}
            data-testid={`${testId}-mode-toggle`}
            aria-pressed={userMode === "advanced"}
            aria-label={
              userMode === "advanced"
                ? "Rehberli moda gec"
                : "Gelismis moda gec"
            }
          >
            {userMode === "advanced" ? "Gelismis" : "Rehberli"}
          </button>
        )}
      </div>

      {/* Asil wizard motoru — WizardShell degismeden korundu. */}
      <WizardShell
        title={title}
        steps={steps}
        currentStep={currentStep}
        onBack={onBack}
        onNext={onNext}
        onCancel={onCancel}
        nextLabel={nextLabel}
        backLabel={backLabel}
        nextDisabled={nextDisabled}
        isLastStep={isLastStep}
        testId={`${testId}-shell`}
      >
        {children}
      </WizardShell>
    </div>
  );
}
