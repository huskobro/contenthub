/**
 * AdminAutomationPoliciesPage — Faz 13: Admin view of all automation policies.
 *
 * Admin sees all policies across all channels, with filtering.
 */

import { useQuery } from "@tanstack/react-query";
import {
  fetchAutomationPolicies,
  type AutomationPolicyResponse,
  type CheckpointMode,
} from "../../api/automationApi";
import { SchedulerStatusCard } from "../../components/full-auto/SchedulerStatusCard";
import { useActiveScope } from "../../hooks/useActiveScope";
import { cn } from "../../lib/cn";
import { useSurfacePageOverride } from "../../surfaces/SurfaceContext";

const MODE_LABELS: Record<CheckpointMode, string> = {
  disabled: "Devre Disi",
  manual_review: "Manuel Onay",
  automatic: "Otomatik",
};

const MODE_DOT: Record<CheckpointMode, string> = {
  disabled: "bg-neutral-300",
  manual_review: "bg-warning",
  automatic: "bg-success",
};

const CHECKPOINTS = [
  { key: "source_scan_mode" as const, label: "Tarama" },
  { key: "draft_generation_mode" as const, label: "Taslak" },
  { key: "render_mode" as const, label: "Render" },
  { key: "publish_mode" as const, label: "Yayin" },
  { key: "post_publish_mode" as const, label: "Sonrasi" },
];

/**
 * Public entry point. Aurora surface override (admin.automation.policies)
 * geçerliyse onu kullanır; aksi halde legacy yüzeye düşer.
 */
export function AdminAutomationPoliciesPage() {
  const Override = useSurfacePageOverride("admin.automation.policies");
  if (Override) return <Override />;
  return <LegacyAdminAutomationPoliciesPage />;
}

function LegacyAdminAutomationPoliciesPage() {
  // Redesign REV-2 / P0.3a: Artik gercek scope tuketiyoruz. Admin "all"
  // modundayken backend bir filter uygulamaz (policy evreni admin erisimli);
  // admin "belirli bir kullanici" moduna gecerse fetch `owner_user_id`
  // param'ini gecer ve cache o scope'a ayrisir. Non-admin bu sayfaya
  // navigasyon izni yok (route-level guard); yine de scope defensive:
  // role=="user" gelirse kendi user.id'si gecirilir.
  const scope = useActiveScope();
  const ownerUserIdFilter =
    scope.role === "admin" && scope.ownerUserId
      ? scope.ownerUserId
      : scope.role === "user" && scope.ownerUserId
        ? scope.ownerUserId
        : undefined;

  const { data: policies = [], isLoading } = useQuery({
    queryKey: [
      "automation-policies",
      {
        ownerUserId: scope.ownerUserId,
        isAllUsers: scope.isAllUsers,
        role: scope.role,
      },
    ],
    queryFn: () =>
      fetchAutomationPolicies(
        ownerUserIdFilter ? { owner_user_id: ownerUserIdFilter } : undefined,
      ),
    // P0.3b: isReady gate kaldırıldı — smoke testlerle uyumlu; ownership backend'de.
  });

  return (
    <div className="space-y-4" data-testid="admin-automation-policies-page">
      {/* Full-Auto Scheduler Status */}
      <SchedulerStatusCard testId="admin-scheduler-status" />

      <div className="flex items-center justify-between">
        <h2 className="m-0 text-lg font-semibold text-neutral-800">Otomasyon Politikalari</h2>
        <span className="text-sm text-neutral-400">{policies.length} politika</span>
      </div>

      {isLoading && <p className="text-sm text-neutral-400 m-0">Yukleniyor...</p>}

      {!isLoading && policies.length === 0 && (
        <p className="text-sm text-neutral-500 m-0">Henuz otomasyon politikasi tanimlanmamis.</p>
      )}

      {/* Policy table */}
      {policies.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-neutral-200">
                <th className="text-left py-2 px-2 text-neutral-500 font-medium">Politika</th>
                <th className="text-left py-2 px-2 text-neutral-500 font-medium">Kanal</th>
                <th className="text-center py-2 px-2 text-neutral-500 font-medium">Durum</th>
                {CHECKPOINTS.map((cp) => (
                  <th key={cp.key} className="text-center py-2 px-1 text-neutral-500 font-medium text-xs">
                    {cp.label}
                  </th>
                ))}
                <th className="text-center py-2 px-2 text-neutral-500 font-medium">Maks.</th>
              </tr>
            </thead>
            <tbody>
              {policies.map((p: AutomationPolicyResponse) => (
                <tr key={p.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                  <td className="py-2 px-2 text-neutral-800 font-medium truncate max-w-[140px]">
                    {p.name}
                  </td>
                  <td className="py-2 px-2 text-neutral-500 font-mono text-xs">
                    ...{p.channel_profile_id.slice(-8)}
                  </td>
                  <td className="py-2 px-2 text-center">
                    <span className={cn(
                      "inline-block w-2 h-2 rounded-full",
                      p.is_enabled ? "bg-success" : "bg-neutral-300",
                    )} title={p.is_enabled ? "Aktif" : "Devre Disi"} />
                  </td>
                  {CHECKPOINTS.map((cp) => {
                    const mode = p[cp.key] as CheckpointMode;
                    return (
                      <td key={cp.key} className="py-2 px-1 text-center">
                        <span
                          className={cn("inline-block w-3 h-3 rounded-full", MODE_DOT[mode])}
                          title={`${cp.label}: ${MODE_LABELS[mode]}`}
                        />
                      </td>
                    );
                  })}
                  <td className="py-2 px-2 text-center text-neutral-500">
                    {p.max_daily_posts ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-neutral-400">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-neutral-300" />
          Devre Disi
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-warning" />
          Manuel Onay
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-success" />
          Otomatik
        </div>
      </div>
    </div>
  );
}
