/**
 * AutomationDigestWidget — Phase Final F4.
 *
 * Caller-scope daily automation digest. Pulls from GET /full-auto/digest/today
 * (non-admin = own projects only; admin = all). Read-only; triggers no
 * mutations. Mirrors counters already persisted on ContentProject so it is
 * safe even when scheduler is disabled.
 *
 * Rendering: lightweight row of metric cards + a short "upcoming runs" list
 * built from the `projects` payload. Design tokens follow existing dashboard
 * patterns (bg-surface-card + border-border-subtle + neutral text scale),
 * no new CSS.
 */

import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { fullAutoApi, type AutomationDigest } from "../../api/fullAutoApi";
import { cn } from "../../lib/cn";

const REFRESH_MS = 60_000; // widget her dakikada bir ozet yeniler

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("tr-TR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

interface MetricCardProps {
  label: string;
  value: string | number;
  accent?: "default" | "warning" | "success";
  testId?: string;
}

function MetricCard({ label, value, accent = "default", testId }: MetricCardProps) {
  const valueTone =
    accent === "warning"
      ? "text-warning-base"
      : accent === "success"
        ? "text-success-base"
        : "text-neutral-800";
  return (
    <div
      data-testid={testId}
      className="bg-surface-card border border-border-subtle rounded-lg px-4 py-3"
    >
      <p className="m-0 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
        {label}
      </p>
      <p className={cn("m-0 mt-1 text-2xl font-semibold", valueTone)}>{value}</p>
    </div>
  );
}

export function AutomationDigestWidget() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery<AutomationDigest>({
    queryKey: ["full-auto", "digest-today"],
    queryFn: () => fullAutoApi.digestToday(),
    refetchInterval: REFRESH_MS,
  });

  if (isLoading) {
    return (
      <div
        data-testid="automation-digest-widget-loading"
        className="bg-surface-card border border-border-subtle rounded-xl p-4"
      >
        <p className="m-0 text-sm text-neutral-400">Otomasyon özeti yükleniyor…</p>
      </div>
    );
  }

  if (isError || !data) {
    // Sessiz fallback — kullaniciya panik yaratmadan gizlenir. Tests still
    // assert by-id absence when unauthenticated.
    return null;
  }

  // Enabled projesi hic yoksa widget'i kucuk bir bilgi rozetine indir.
  if (data.total_projects === 0 || data.automation_enabled_count === 0) {
    return (
      <div
        data-testid="automation-digest-widget-empty"
        className="bg-surface-card border border-border-subtle rounded-xl p-4 flex items-start gap-3"
      >
        <div>
          <p className="m-0 text-sm font-semibold text-neutral-700">
            Otomasyon henüz aktif değil
          </p>
          <p className="m-0 mt-1 text-xs text-neutral-500">
            Bir içerik projesi için Full-Auto modunu açtığınızda günlük özet
            burada görünür.
          </p>
        </div>
      </div>
    );
  }

  const upcoming = data.projects
    .filter((p) => p.automation_schedule_enabled && p.next_run_at)
    .slice(0, 3);

  return (
    <div data-testid="automation-digest-widget" className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          label="Aktif Proje"
          value={data.automation_enabled_count}
          testId="digest-metric-enabled"
        />
        <MetricCard
          label="Zamanlanmış"
          value={data.schedule_enabled_count}
          testId="digest-metric-scheduled"
        />
        <MetricCard
          label="Bugünkü Koşu"
          value={
            data.runs_today_limit_total > 0
              ? `${data.runs_today_total}/${data.runs_today_limit_total}`
              : data.runs_today_total
          }
          accent={data.at_limit_count > 0 ? "warning" : "default"}
          testId="digest-metric-runs"
        />
        <MetricCard
          label="Limite Ulaşan"
          value={data.at_limit_count}
          accent={data.at_limit_count > 0 ? "warning" : "default"}
          testId="digest-metric-at-limit"
        />
      </div>

      {upcoming.length > 0 && (
        <div className="bg-surface-card border border-border-subtle rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="m-0 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Yaklaşan Koşular
            </p>
            <span className="text-xs text-neutral-400">
              {data.today_date}
              {data.next_upcoming_run_at ? (
                <> · sıradaki {formatDate(data.next_upcoming_run_at)}</>
              ) : null}
            </span>
          </div>
          <ul className="m-0 p-0 list-none space-y-2">
            {upcoming.map((p) => (
              <li
                key={p.project_id}
                className={cn(
                  "flex items-center justify-between gap-3 py-1",
                  "hover:bg-surface-subtle rounded-md cursor-pointer transition-colors duration-fast",
                )}
                onClick={() => navigate(`/user/projects/${p.project_id}/automation`)}
                data-testid={`digest-upcoming-${p.project_id}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="m-0 text-sm font-medium text-neutral-800 truncate">
                    {p.project_title ?? p.project_id}
                  </p>
                  <p className="m-0 text-xs text-neutral-500 truncate">
                    {p.automation_cron_expression ?? "—"}
                    {p.automation_max_runs_per_day
                      ? ` · ${p.runs_today}/${p.automation_max_runs_per_day} bugün`
                      : ""}
                  </p>
                </div>
                <span className="text-xs text-neutral-600 shrink-0">
                  {formatDate(p.next_run_at)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
