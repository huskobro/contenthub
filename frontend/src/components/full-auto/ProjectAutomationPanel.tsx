/**
 * ProjectAutomationPanel — project-level full-auto configuration.
 *
 * Shared component imported by legacy ProjectDetailPage and surface
 * overrides (Canvas, Atrium). Receives only a ``projectId``; all data
 * fetching happens through the ``useFullAuto`` hooks.
 *
 * Every field change triggers an immediate PATCH (no "Save" button),
 * matching the established pattern in UserAutomationPage.
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import {
  useProjectAutomationConfig,
  useUpdateProjectAutomationConfig,
  useFullAutoEvaluate,
  useFullAutoTrigger,
} from "../../hooks/useFullAuto";
import type {
  FullAutoRunMode,
  FullAutoPublishPolicy,
  FullAutoFallback,
} from "../../api/fullAutoApi";
import { CronPreviewDisplay } from "./CronPreviewDisplay";
import { cn } from "../../lib/cn";

// ---------------------------------------------------------------------------
// Label maps
// ---------------------------------------------------------------------------

const RUN_MODE_LABELS: Record<FullAutoRunMode, string> = {
  manual: "Manuel",
  assisted: "Asistanli",
  full_auto: "Tam Otomasyon",
};

const RUN_MODE_COLORS: Record<FullAutoRunMode, string> = {
  manual: "bg-neutral-100 text-neutral-600 border-neutral-200",
  assisted: "bg-warning-light text-warning-dark border-warning",
  full_auto: "bg-success-light text-success-dark border-success",
};

const PUBLISH_LABELS: Record<FullAutoPublishPolicy, string> = {
  draft: "Taslak",
  schedule: "Zamanla",
  publish_now: "Hemen Yayinla",
};

const FALLBACK_LABELS: Record<FullAutoFallback, string> = {
  pause: "Duraklat",
  retry_once: "Bir Kez Tekrarla",
  stop: "Durdur",
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ProjectAutomationPanelProps {
  projectId: string;
  className?: string;
  testId?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProjectAutomationPanel({
  projectId,
  className,
  testId = "project-automation-panel",
}: ProjectAutomationPanelProps) {
  const { data: config, isLoading, isError } = useProjectAutomationConfig(projectId);
  const updateMut = useUpdateProjectAutomationConfig(projectId);
  const evaluateMut = useFullAutoEvaluate(projectId);
  const triggerMut = useFullAutoTrigger(projectId);

  // Local cron input for debounced preview
  const [cronDraft, setCronDraft] = useState("");
  const [triggerTopic, setTriggerTopic] = useState("");

  // Sync cron draft from server config
  useEffect(() => {
    if (config?.automation_cron_expression) {
      setCronDraft(config.automation_cron_expression);
    }
  }, [config?.automation_cron_expression]);

  // Debounced cron save
  const [cronSaveTimer, setCronSaveTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const handleCronChange = useCallback(
    (value: string) => {
      setCronDraft(value);
      if (cronSaveTimer) clearTimeout(cronSaveTimer);
      const timer = setTimeout(() => {
        updateMut.mutate({ automation_cron_expression: value || null });
      }, 1000);
      setCronSaveTimer(timer);
    },
    [updateMut, cronSaveTimer],
  );

  const handleTrigger = useCallback(() => {
    triggerMut.mutate(
      triggerTopic.trim() ? { topic: triggerTopic.trim() } : undefined,
    );
    setTriggerTopic("");
  }, [triggerMut, triggerTopic]);

  const isBusy = updateMut.isPending;

  // Readable last-run / next-run
  const lastRunLabel = useMemo(() => {
    if (!config?.automation_last_run_at) return "-";
    try {
      return new Date(config.automation_last_run_at).toLocaleString("tr-TR");
    } catch {
      return config.automation_last_run_at;
    }
  }, [config?.automation_last_run_at]);

  const nextRunLabel = useMemo(() => {
    if (!config?.automation_next_run_at) return "-";
    try {
      return new Date(config.automation_next_run_at).toLocaleString("tr-TR");
    } catch {
      return config.automation_next_run_at;
    }
  }, [config?.automation_next_run_at]);

  // Loading / error states
  if (isLoading) {
    return (
      <div
        className={cn("p-6 text-center text-sm text-neutral-500 animate-pulse", className)}
        data-testid={testId}
      >
        Otomasyon ayarlari yukleniyor...
      </div>
    );
  }

  if (isError || !config) {
    return (
      <div
        className={cn("p-6 text-center text-sm text-error-dark", className)}
        data-testid={testId}
      >
        Otomasyon ayarlari yuklenemedi. Sayfa yenilenebilir.
      </div>
    );
  }

  return (
    <div
      className={cn("flex flex-col gap-4", className)}
      data-testid={testId}
    >
      {/* ── Enable toggle ────────────────────────────────────── */}
      <section
        className="rounded-xl border border-border-subtle bg-surface-card shadow-sm px-5 py-4"
        data-testid={`${testId}-enable`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="m-0 text-sm font-semibold text-neutral-900">
              Proje Otomasyonu
            </p>
            <p className="m-0 mt-0.5 text-xs text-neutral-500">
              Etkinlestirildiginde zamanlama ve tetikleme kullanilabilir.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              updateMut.mutate({
                automation_enabled: !config.automation_enabled,
              })
            }
            disabled={isBusy}
            className={cn(
              "relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer",
              config.automation_enabled
                ? "bg-brand-600"
                : "bg-neutral-300",
              isBusy && "opacity-60 cursor-not-allowed",
            )}
            data-testid={`${testId}-enable-toggle`}
            aria-label={config.automation_enabled ? "Otomasyonu kapat" : "Otomasyonu ac"}
          >
            <span
              className={cn(
                "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200",
                config.automation_enabled && "translate-x-5",
              )}
            />
          </button>
        </div>
      </section>

      {!config.automation_enabled ? (
        <div className="px-5 py-4 text-xs text-neutral-500 text-center">
          Otomasyonu etkinlestirmek icin yukardaki toggle'i ac.
        </div>
      ) : (
        <>
          {/* ── Run mode ───────────────────────────────────────── */}
          <section
            className="rounded-xl border border-border-subtle bg-surface-card shadow-sm px-5 py-4"
            data-testid={`${testId}-run-mode`}
          >
            <p className="m-0 mb-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
              Calistirma Modu
            </p>
            <div className="flex gap-2">
              {(["manual", "assisted", "full_auto"] as FullAutoRunMode[]).map(
                (mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() =>
                      updateMut.mutate({ automation_run_mode: mode })
                    }
                    disabled={isBusy}
                    className={cn(
                      "flex-1 px-3 py-2 rounded-md border text-xs cursor-pointer transition-colors",
                      config.automation_run_mode === mode
                        ? RUN_MODE_COLORS[mode] + " font-semibold"
                        : "bg-white text-neutral-500 border-neutral-200 hover:bg-neutral-50",
                      isBusy && "cursor-not-allowed opacity-60",
                    )}
                    data-testid={`${testId}-run-mode-${mode}`}
                  >
                    {RUN_MODE_LABELS[mode]}
                  </button>
                ),
              )}
            </div>
          </section>

          {/* ── Schedule ───────────────────────────────────────── */}
          <section
            className="rounded-xl border border-border-subtle bg-surface-card shadow-sm px-5 py-4"
            data-testid={`${testId}-schedule`}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="m-0 text-sm font-semibold text-neutral-900">
                  Zamanlama
                </p>
                <p className="m-0 mt-0.5 text-xs text-neutral-500">
                  Cron ifadesi ile otomatik calistirma zamanlari.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  updateMut.mutate({
                    automation_schedule_enabled:
                      !config.automation_schedule_enabled,
                  })
                }
                disabled={isBusy}
                className={cn(
                  "relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer",
                  config.automation_schedule_enabled
                    ? "bg-brand-600"
                    : "bg-neutral-300",
                  isBusy && "opacity-60 cursor-not-allowed",
                )}
                data-testid={`${testId}-schedule-toggle`}
                aria-label={
                  config.automation_schedule_enabled
                    ? "Zamanlamayi kapat"
                    : "Zamanlamayi ac"
                }
              >
                <span
                  className={cn(
                    "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200",
                    config.automation_schedule_enabled && "translate-x-5",
                  )}
                />
              </button>
            </div>

            {config.automation_schedule_enabled && (
              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-1">
                    Cron Ifadesi
                  </label>
                  <input
                    type="text"
                    value={cronDraft}
                    onChange={(e) => handleCronChange(e.target.value)}
                    placeholder="0 9 * * 1-5"
                    className={cn(
                      "w-full px-3 py-2 text-sm font-mono rounded-md",
                      "border border-border-subtle bg-surface-card",
                      "focus:outline-none focus:border-brand-400",
                    )}
                    data-testid={`${testId}-cron-input`}
                  />
                  <p className="m-0 mt-1 text-[10px] text-neutral-400">
                    dakika saat gun ay haftanin-gunu (ornek: 0 9 * * 1-5 =
                    hafta ici her gun 09:00)
                  </p>
                </div>

                <CronPreviewDisplay
                  expression={cronDraft}
                  testId={`${testId}-cron-preview`}
                />

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-1">
                    Saat Dilimi
                  </label>
                  <select
                    value={config.automation_timezone}
                    onChange={(e) =>
                      updateMut.mutate({ automation_timezone: e.target.value })
                    }
                    disabled={isBusy}
                    className={cn(
                      "w-full px-3 py-2 text-sm rounded-md",
                      "border border-border-subtle bg-surface-card",
                      "focus:outline-none focus:border-brand-400",
                    )}
                    data-testid={`${testId}-timezone`}
                  >
                    <option value="UTC">UTC</option>
                    <option value="Europe/Istanbul">Europe/Istanbul</option>
                    <option value="Europe/London">Europe/London</option>
                    <option value="America/New_York">America/New_York</option>
                    <option value="America/Los_Angeles">America/Los_Angeles</option>
                    <option value="Asia/Tokyo">Asia/Tokyo</option>
                  </select>
                </div>
              </div>
            )}
          </section>

          {/* ── Guard rails ────────────────────────────────────── */}
          <section
            className="rounded-xl border border-border-subtle bg-surface-card shadow-sm px-5 py-4"
            data-testid={`${testId}-guards`}
          >
            <p className="m-0 mb-3 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
              Koruma Ayarlari
            </p>
            <div className="flex flex-col gap-3">
              {/* Review gate */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="m-0 text-xs font-semibold text-neutral-800">
                    Yayin Oncesi Onay
                  </p>
                  <p className="m-0 text-[10px] text-neutral-500">
                    Uretim bittikten sonra yayin icin operator onayi bekle.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    updateMut.mutate({
                      automation_require_review_gate:
                        !config.automation_require_review_gate,
                    })
                  }
                  disabled={isBusy}
                  className={cn(
                    "relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer",
                    config.automation_require_review_gate
                      ? "bg-brand-600"
                      : "bg-neutral-300",
                    isBusy && "opacity-60 cursor-not-allowed",
                  )}
                  data-testid={`${testId}-review-gate-toggle`}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200",
                      config.automation_require_review_gate && "translate-x-5",
                    )}
                  />
                </button>
              </div>

              {/* Publish policy */}
              <div>
                <p className="m-0 mb-1 text-xs font-semibold text-neutral-800">
                  Yayin Politikasi
                </p>
                <div className="flex gap-2">
                  {(
                    ["draft", "schedule", "publish_now"] as FullAutoPublishPolicy[]
                  ).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() =>
                        updateMut.mutate({ automation_publish_policy: p })
                      }
                      disabled={isBusy}
                      className={cn(
                        "flex-1 px-2 py-1.5 rounded border text-xs cursor-pointer transition-colors",
                        config.automation_publish_policy === p
                          ? "bg-brand-50 border-brand-400 text-brand-700 font-semibold"
                          : "bg-white text-neutral-500 border-neutral-200 hover:bg-neutral-50",
                        isBusy && "cursor-not-allowed opacity-60",
                      )}
                      data-testid={`${testId}-publish-${p}`}
                    >
                      {PUBLISH_LABELS[p]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fallback on error */}
              <div>
                <p className="m-0 mb-1 text-xs font-semibold text-neutral-800">
                  Hata Durumunda
                </p>
                <div className="flex gap-2">
                  {(
                    ["pause", "retry_once", "stop"] as FullAutoFallback[]
                  ).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() =>
                        updateMut.mutate({ automation_fallback_on_error: f })
                      }
                      disabled={isBusy}
                      className={cn(
                        "flex-1 px-2 py-1.5 rounded border text-xs cursor-pointer transition-colors",
                        config.automation_fallback_on_error === f
                          ? "bg-brand-50 border-brand-400 text-brand-700 font-semibold"
                          : "bg-white text-neutral-500 border-neutral-200 hover:bg-neutral-50",
                        isBusy && "cursor-not-allowed opacity-60",
                      )}
                      data-testid={`${testId}-fallback-${f}`}
                    >
                      {FALLBACK_LABELS[f]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Max daily runs */}
              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1">
                  Gunluk Maksimum Calistirma
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={config.automation_max_runs_per_day ?? ""}
                  onChange={(e) =>
                    updateMut.mutate({
                      automation_max_runs_per_day: e.target.value
                        ? Number(e.target.value)
                        : null,
                    })
                  }
                  disabled={isBusy}
                  placeholder="Limit yok"
                  className={cn(
                    "w-32 px-3 py-1.5 text-sm rounded-md",
                    "border border-border-subtle bg-surface-card",
                    "focus:outline-none focus:border-brand-400",
                  )}
                  data-testid={`${testId}-max-daily`}
                />
              </div>
            </div>
          </section>

          {/* ── Status (read-only) ─────────────────────────────── */}
          <section
            className="rounded-xl border border-border-subtle bg-surface-card shadow-sm px-5 py-4"
            data-testid={`${testId}-status`}
          >
            <p className="m-0 mb-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
              Durum
            </p>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <p className="m-0 text-neutral-500">Son Calistirma</p>
                <p className="m-0 font-mono text-neutral-700">{lastRunLabel}</p>
              </div>
              <div>
                <p className="m-0 text-neutral-500">Sonraki Calistirma</p>
                <p className="m-0 font-mono text-neutral-700">{nextRunLabel}</p>
              </div>
              <div>
                <p className="m-0 text-neutral-500">Bugunki Calistirmalar</p>
                <p className="m-0 font-mono text-neutral-700">
                  {config.automation_runs_today}
                  {config.automation_max_runs_per_day != null &&
                    ` / ${config.automation_max_runs_per_day}`}
                </p>
              </div>
            </div>
          </section>

          {/* ── Actions ────────────────────────────────────────── */}
          <section
            className="rounded-xl border border-border-subtle bg-surface-card shadow-sm px-5 py-4"
            data-testid={`${testId}-actions`}
          >
            <p className="m-0 mb-3 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
              Eylemler
            </p>

            {/* Evaluate result */}
            {evaluateMut.data && (
              <div
                className={cn(
                  "mb-3 rounded-md border px-3 py-2 text-xs",
                  evaluateMut.data.allowed
                    ? "border-success-base/30 bg-success-light/30 text-success-dark"
                    : "border-error-base/30 bg-error-light/30 text-error-dark",
                )}
                data-testid={`${testId}-eval-result`}
              >
                {evaluateMut.data.allowed ? (
                  <span>Tum kontroller gecti. Tetiklemeye hazir.</span>
                ) : (
                  <div>
                    <p className="m-0 font-semibold">Ihlaller:</p>
                    <ul className="m-0 pl-4">
                      {evaluateMut.data.violations.map((v, i) => (
                        <li key={i}>{v}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {evaluateMut.data.warnings.length > 0 && (
                  <div className="mt-1 text-warning-dark">
                    <p className="m-0 font-semibold">Uyarilar:</p>
                    <ul className="m-0 pl-4">
                      {evaluateMut.data.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Trigger result */}
            {triggerMut.data && (
              <div
                className={cn(
                  "mb-3 rounded-md border px-3 py-2 text-xs",
                  triggerMut.data.accepted
                    ? "border-success-base/30 bg-success-light/30 text-success-dark"
                    : "border-error-base/30 bg-error-light/30 text-error-dark",
                )}
                data-testid={`${testId}-trigger-result`}
              >
                {triggerMut.data.accepted
                  ? `Job olusturuldu: ${triggerMut.data.job_id ?? "-"}`
                  : `Reddedildi: ${triggerMut.data.reason ?? "bilinmeyen neden"}`}
              </div>
            )}

            <div className="flex flex-col gap-2">
              {/* Topic input for trigger */}
              <input
                type="text"
                value={triggerTopic}
                onChange={(e) => setTriggerTopic(e.target.value)}
                placeholder="Konu / baslik (opsiyonel)"
                className={cn(
                  "w-full px-3 py-2 text-sm rounded-md",
                  "border border-border-subtle bg-surface-card",
                  "focus:outline-none focus:border-brand-400",
                )}
                data-testid={`${testId}-trigger-topic`}
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => evaluateMut.mutate()}
                  disabled={evaluateMut.isPending}
                  className={cn(
                    "px-4 py-2 rounded-md text-sm font-semibold",
                    "border border-brand-300 text-brand-700 bg-brand-50",
                    "hover:bg-brand-100 transition-colors",
                    evaluateMut.isPending && "opacity-60 cursor-not-allowed",
                  )}
                  data-testid={`${testId}-evaluate-btn`}
                >
                  {evaluateMut.isPending ? "Denetleniyor..." : "Denetle"}
                </button>

                <button
                  type="button"
                  onClick={handleTrigger}
                  disabled={
                    triggerMut.isPending ||
                    (evaluateMut.data != null && !evaluateMut.data.allowed)
                  }
                  className={cn(
                    "px-4 py-2 rounded-md text-sm font-semibold text-white",
                    "bg-brand-600 hover:bg-brand-700 transition-colors",
                    (triggerMut.isPending ||
                      (evaluateMut.data != null && !evaluateMut.data.allowed)) &&
                      "opacity-60 cursor-not-allowed",
                  )}
                  data-testid={`${testId}-trigger-btn`}
                >
                  {triggerMut.isPending ? "Tetikleniyor..." : "Simdi Tetikle"}
                </button>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
