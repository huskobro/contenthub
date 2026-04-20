/**
 * AuroraModulesPage — Aurora Dusk Cockpit / Modül Yönetimi (admin).
 *
 * Aurora karşılığı `src/pages/admin/ModuleManagementPage.tsx`. Aynı API
 * kontratını kullanır:
 *   - Liste: `useEnabledModules` (GET /api/v1/modules)
 *   - Toggle: `setModuleEnabled(moduleId, enabled)` →
 *       PUT /api/v1/settings/effective/value/module.{id}.enabled
 *     (Settings Registry tek otorite — kuralları CLAUDE.md ile uyumlu.)
 *
 * Tasarım hedefi:
 *   - Page-shell breadcrumb ("Settings / Modules") + page-head
 *   - Sol/üst: modül kartları (id, açıklama/adım sayısı, status chip,
 *     toggle butonu "Etkinleştir / Devre dışı")
 *   - Sağ Inspector: toplam modül, aktif/pasif sayısı, son değişiklik
 *     zamanı (modül listesi yenilendiğinde dataUpdatedAt)
 *
 * Hiçbir legacy code değiştirilmez; trampoline (ModuleManagementPage)
 * `useSurfacePageOverride("admin.modules")` ile bu sayfaya devreder.
 * register.tsx — bu PR'da DOKUNULMAZ.
 */
import { useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEnabledModules } from "../../hooks/useEnabledModules";
import { setModuleEnabled, type ModuleInfo } from "../../api/modulesApi";
import { useToast } from "../../hooks/useToast";
import {
  AuroraButton,
  AuroraCard,
  AuroraInspector,
  AuroraInspectorRow,
  AuroraInspectorSection,
  AuroraPageShell,
  AuroraStatusChip,
} from "./primitives";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimestamp(ts: number | undefined): string {
  if (!ts) return "—";
  try {
    const d = new Date(ts);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    const yyyy = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mo}-${dd} ${hh}:${mm}:${ss}`;
  } catch {
    return "—";
  }
}

function moduleDescription(mod: ModuleInfo): string {
  const stepCount = mod.steps.length;
  const compat = mod.template_compat?.length
    ? ` · ${mod.template_compat.length} şablon`
    : "";
  return `${stepCount} pipeline adımı${compat}`;
}

// ---------------------------------------------------------------------------
// Module card
// ---------------------------------------------------------------------------

interface ModuleCardProps {
  mod: ModuleInfo;
  onToggle: (moduleId: string, next: boolean) => void;
  isToggling: boolean;
}

function ModuleCard({ mod, onToggle, isToggling }: ModuleCardProps) {
  const next = !mod.enabled;
  return (
    <AuroraCard
      pad="default"
      data-testid={`aurora-module-card-${mod.module_id}`}
      style={{ display: "flex", flexDirection: "column", gap: 14 }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text-primary)",
              lineHeight: 1.3,
            }}
          >
            {mod.display_name}
          </div>
          <div
            style={{
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              color: "var(--text-muted)",
              marginTop: 2,
            }}
          >
            {mod.module_id}
          </div>
        </div>
        <AuroraStatusChip
          tone={mod.enabled ? "success" : "neutral"}
          data-testid={`aurora-module-chip-${mod.module_id}`}
        >
          {mod.enabled ? "Etkin" : "Devre dışı"}
        </AuroraStatusChip>
      </div>

      {/* Description */}
      <div
        style={{
          fontSize: 12,
          color: "var(--text-secondary)",
          lineHeight: 1.6,
        }}
      >
        {moduleDescription(mod)}
      </div>

      {/* Action row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          paddingTop: 4,
          borderTop: "1px solid var(--border-subtle)",
          marginTop: 2,
        }}
      >
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
          {mod.enabled
            ? "Menüde, komut paletinde ve wizard'da görünür"
            : "Menüde gizli, yeni iş başlatılamaz"}
        </div>
        <AuroraButton
          variant={next ? "primary" : "secondary"}
          size="sm"
          onClick={() => onToggle(mod.module_id, next)}
          disabled={isToggling}
          data-testid={`aurora-module-toggle-${mod.module_id}`}
        >
          {next ? "Etkinleştir" : "Devre dışı bırak"}
        </AuroraButton>
      </div>
    </AuroraCard>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function AuroraModulesPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const query = useEnabledModules();
  const { data: modules, isLoading, isError, error, dataUpdatedAt } = query;

  const toggleMutation = useMutation({
    mutationFn: ({
      moduleId,
      enabled,
    }: {
      moduleId: string;
      enabled: boolean;
    }) => setModuleEnabled(moduleId, enabled),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["modules"] });
      toast.success(
        variables.enabled
          ? `Modül etkinleştirildi: ${variables.moduleId}`
          : `Modül devre dışı bırakıldı: ${variables.moduleId}`,
      );
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Bilinmeyen hata";
      toast.error(`Modül durumu güncellenemedi: ${message}`);
    },
  });

  const handleToggle = (moduleId: string, enabled: boolean) => {
    toggleMutation.mutate({ moduleId, enabled });
  };

  const stats = useMemo(() => {
    const list = modules ?? [];
    const enabled = list.filter((m) => m.enabled).length;
    const disabled = list.length - enabled;
    return { total: list.length, enabled, disabled };
  }, [modules]);

  const inspector = (
    <AuroraInspector title="Modül durumu">
      <AuroraInspectorSection title="Sayım">
        <AuroraInspectorRow label="toplam" value={String(stats.total)} />
        <AuroraInspectorRow label="aktif" value={String(stats.enabled)} />
        <AuroraInspectorRow label="pasif" value={String(stats.disabled)} />
      </AuroraInspectorSection>
      <AuroraInspectorSection title="Son güncelleme">
        <AuroraInspectorRow
          label="liste"
          value={formatTimestamp(dataUpdatedAt)}
        />
        <AuroraInspectorRow
          label="durum"
          value={
            isLoading
              ? "yükleniyor…"
              : isError
                ? "hata"
                : toggleMutation.isPending
                  ? "kaydediliyor…"
                  : "hazır"
          }
        />
      </AuroraInspectorSection>
      <AuroraInspectorSection title="Not">
        <div
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            lineHeight: 1.6,
          }}
        >
          Devre dışı modüller yan menüden gizlenir, komut paletinden filtrelenir
          ve yeni iş başlatılamaz. Mevcut işler etkilenmez.
        </div>
      </AuroraInspectorSection>
    </AuroraInspector>
  );

  return (
    <div className="aurora-dashboard" data-testid="aurora-modules-page">
      <AuroraPageShell
        title="Modül yönetimi"
        description="Kayıtlı içerik modüllerini etkinleştirin veya devre dışı bırakın."
        breadcrumbs={[
          { label: "Settings", href: "/admin/settings" },
          { label: "Modules" },
        ]}
      >
        {isLoading && (
          <AuroraCard pad="default" data-testid="aurora-module-loading">
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Yükleniyor…
            </div>
          </AuroraCard>
        )}

        {isError && (
          <AuroraCard pad="default" data-testid="aurora-module-error">
            <div style={{ fontSize: 12, color: "var(--state-danger-fg)" }}>
              Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
            </div>
          </AuroraCard>
        )}

        {!isLoading && !isError && modules && modules.length === 0 && (
          <AuroraCard pad="default" data-testid="aurora-module-empty">
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Kayıtlı modül bulunamadı.
            </div>
          </AuroraCard>
        )}

        {modules && modules.length > 0 && (
          <div
            data-testid="aurora-module-list"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 12,
            }}
          >
            {modules.map((mod) => (
              <ModuleCard
                key={mod.module_id}
                mod={mod}
                onToggle={handleToggle}
                isToggling={toggleMutation.isPending}
              />
            ))}
          </div>
        )}
      </AuroraPageShell>
      <aside className="aurora-inspector-slot">{inspector}</aside>
    </div>
  );
}
