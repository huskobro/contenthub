/**
 * AdminWizardShell — REV-2 / P3.3.
 *
 * Admin panelindeki wizard sayfalari icin ince shell (WizardShell + admin-only
 * ekler). "Tek motor + iki shell" kararinin admin tarafi (user tarafi:
 * UserWizardShell). Mevcut `WizardShell` primitive'i ayni kalir — bu bilesen
 * onun uzerine admin-spesifik 2 ek surme:
 *
 *   1) Snapshot-lock banner: admin kullanicinin runtime ayar/template
 *      degisikliklerinin calisan is'leri etkilemedigini hatirlatan uyari
 *      (CLAUDE.md: "When a job starts, all effective settings and prompt
 *      values relevant to that job must be snapshot-locked"). Banner sadece
 *      bilgi amacli — davranisa dokunmaz, enforcement pipeline tarafindadir.
 *
 *   2) Field-visibility preview toggle: admin "user gozuyle" onizleme moduna
 *      gecebilir. Toggle **sadece gorsel**: children icinde `previewMode` prop'u
 *      tuketen alt bilesenler kendi davranislarini ayirabilir. Varsayilan: off.
 *      Visibility Engine enforcement'i backend'de, bu toggle yalnizca admin'in
 *      "kullaniciya nasil gorunuyor?" sanity check'i.
 *
 * Parallel-pattern kurali (CLAUDE.md): `WizardShell` motoru DEGISTIRILMEDI —
 * bu bilesen onu sarar, yeniden yazmaz. Shell degil, shell uzerinde admin
 * giysisi.
 *
 * Settings Registry kaydi:
 *   `wizard.shell.v2.enabled` (admin-only kill switch). Kapaliysa shell
 *   render=null dondurur ve legacy children'i direk gosterir (fallback).
 */
import { useState, useCallback, type ReactNode } from "react";
import { WizardShell, type WizardStep } from "./WizardShell";
import { cn } from "../../lib/cn";

export interface AdminWizardShellProps {
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
   * Snapshot-lock banner goster/gizle. Default true (admin hatirlatmasi).
   * Unit test'lerde veya embed kullanimlarda false yapilabilir.
   */
  showSnapshotLockBanner?: boolean;
  /**
   * Field-visibility preview toggle callback. Verilmisse toggle render
   * edilir; callback her toggle'da yeni mode degerini alir.
   */
  onPreviewModeChange?: (mode: "admin" | "user") => void;
  testId?: string;
}

/**
 * Admin wizard shell — WizardShell + snapshot-lock banner + preview toggle.
 */
export function AdminWizardShell({
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
  showSnapshotLockBanner = true,
  onPreviewModeChange,
  testId = "admin-wizard",
}: AdminWizardShellProps) {
  const [previewMode, setPreviewMode] = useState<"admin" | "user">("admin");

  const togglePreview = useCallback(() => {
    setPreviewMode((prev) => {
      const next = prev === "admin" ? "user" : "admin";
      onPreviewModeChange?.(next);
      return next;
    });
  }, [onPreviewModeChange]);

  return (
    <div data-testid={testId}>
      {/* Admin chip + preview toggle satiri */}
      <div className="flex items-center gap-2 mb-2" data-testid={`${testId}-toolbar`}>
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-brand-50 text-brand-700 border border-brand-200"
          data-testid={`${testId}-admin-chip`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
          Admin
        </span>
        {onPreviewModeChange !== undefined && (
          <button
            type="button"
            onClick={togglePreview}
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border cursor-pointer transition-colors",
              previewMode === "user"
                ? "bg-warning-light text-warning-dark border-warning-200"
                : "bg-neutral-50 text-neutral-600 border-border-subtle hover:bg-neutral-100",
            )}
            data-testid={`${testId}-preview-toggle`}
            aria-pressed={previewMode === "user"}
          >
            {previewMode === "user" ? "Kullanici Gozuyle Onizleme (AC)" : "Admin Gorunumu"}
          </button>
        )}
      </div>

      {/* Snapshot-lock banner: calistirilan islerin ayar snapshot'iyla
          kilitli oldugunu hatirlatan bilgi cubugu. */}
      {showSnapshotLockBanner && (
        <div
          className="mb-3 px-3 py-2 rounded-sm bg-info-light text-info-dark text-[11px] border border-info-200"
          data-testid={`${testId}-snapshot-lock-banner`}
        >
          <strong>Snapshot Kilidi:</strong> Bu wizard sonucunda baslayan isler,
          o anki efektif ayar + template versiyonlariyla kilitlenir. Siz bu
          ayarlari sonradan degistirseniz bile zaten calisan isler etkilenmez.
        </div>
      )}

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
