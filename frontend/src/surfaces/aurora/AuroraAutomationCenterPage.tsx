/**
 * Aurora Automation Center — single page, both /user and /admin routes.
 *
 * Routes:
 *   /user/projects/:projectId/automation-center
 *   /admin/projects/:projectId/automation-center
 *
 * Layout:
 *   ┌──────────────────────────────────────────────────────────────────┐
 *   │ ctxbar (project breadcrumb + run-mode + actions)                  │
 *   ├──────────────────────────┬───────────────────────────────────────┤
 *   │ workbench                │ AuroraInspector                        │
 *   │   AutomationCanvas        │   selected node OR flow header         │
 *   │   (vertical pipeline)     │   per-node config + Test               │
 *   │                          │   flow config + Save                   │
 *   ├──────────────────────────┴───────────────────────────────────────┤
 *   │ statusbar (last evaluated, blockers/warnings count)               │
 *   └──────────────────────────────────────────────────────────────────┘
 *
 * Contracts honored:
 *   - Server-derived `status` is read-only — UI only patches `operation_mode`
 *     and `config`. Status badge + mode badge are TWO separate chips per
 *     product spec.
 *   - Snapshot lock (active job in flight) disables flow + node patches.
 *     We surface a banner and disable the Save buttons; backend returns
 *     409 if anyone tries to bypass.
 *   - Run-Now `force` is only offered when `ctx.is_admin === true`.
 *   - Test endpoint is dry-run; we never persist its output.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchAutomationCenter,
  patchAutomationFlow,
  patchAutomationNode,
  evaluateAutomation,
  runAutomationNow,
  testAutomationNode,
  type AutomationCenterResponse,
  type AutomationFlowPatch,
  type AutomationNode,
  type AutomationNodePatch,
  type EvaluateResponse,
  type NodeOperationMode,
  type RunMode,
  type PublishPolicy,
  type FallbackPolicy,
} from "../../api/automationCenterApi";
import { AutomationCanvas } from "./AutomationCanvas";
import {
  AuroraButton,
  AuroraCard,
  AuroraInspector,
  AuroraInspectorSection,
  AuroraInspectorRow,
  AuroraStatusChip,
} from "./primitives";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useToast } from "../../hooks/useToast";

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

const RUN_MODE_OPTIONS: Array<{ value: RunMode; label: string }> = [
  { value: "manual", label: "Manuel Stüdyo" },
  { value: "assisted", label: "Yarı Otomatik" },
  { value: "full_auto", label: "Tam Otomatik" },
];

const PUBLISH_POLICY_OPTIONS: Array<{ value: PublishPolicy; label: string }> = [
  { value: "draft", label: "Taslak" },
  { value: "review", label: "İncelemeye gönder" },
  { value: "scheduled", label: "Planla" },
  { value: "publish", label: "Doğrudan yayınla" },
];

const FALLBACK_OPTIONS: Array<{ value: FallbackPolicy; label: string }> = [
  { value: "pause", label: "Duraklat" },
  { value: "retry", label: "Tekrar dene" },
  { value: "skip", label: "Atla" },
];

const MODE_OPTIONS: Array<{ value: NodeOperationMode; label: string }> = [
  { value: "manual", label: "Manuel" },
  { value: "ai_assist", label: "AI Destekli" },
  { value: "automatic", label: "Otomatik" },
];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function configToText(config: Record<string, unknown>): string {
  if (Object.keys(config).length === 0) return "{}";
  try {
    return JSON.stringify(config, null, 2);
  } catch {
    return "{}";
  }
}

function parseConfigText(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  if (trimmed === "") return {};
  try {
    const parsed = JSON.parse(trimmed);
    if (!isObject(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function AuroraAutomationCenterPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const { user } = useCurrentUser();
  const isAdmin = user?.role === "admin";
  const baseRoute = isAdmin ? "/admin" : "/user";

  const dataQ = useQuery({
    queryKey: ["automation-center", projectId],
    queryFn: () => fetchAutomationCenter(projectId!),
    enabled: !!projectId,
  });

  const data = dataQ.data;
  const snapshotLocked = data?.snapshot_locked ?? false;

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [evalResult, setEvalResult] = useState<EvaluateResponse | null>(null);

  // When data loads or refetches, default-select the first non-complete node.
  useEffect(() => {
    if (!data) return;
    if (selectedNodeId && data.nodes.some((n) => n.id === selectedNodeId)) return;
    const firstNonComplete = data.nodes.find((n) => n.status !== "complete");
    setSelectedNodeId((firstNonComplete ?? data.nodes[0])?.id ?? null);
  }, [data, selectedNodeId]);

  const selectedNode: AutomationNode | undefined = useMemo(() => {
    if (!data || !selectedNodeId) return undefined;
    return data.nodes.find((n) => n.id === selectedNodeId);
  }, [data, selectedNodeId]);

  // ------------------------------------------------------------------- mutations
  const flowM = useMutation({
    mutationFn: (payload: AutomationFlowPatch) =>
      patchAutomationFlow(projectId!, payload),
    onSuccess: (resp) => {
      qc.setQueryData(["automation-center", projectId], resp);
      toast.success("Akış kaydedildi.");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Akış kaydedilemedi.";
      toast.error(msg);
    },
  });

  const nodeM = useMutation({
    mutationFn: ({
      nodeId,
      payload,
    }: {
      nodeId: string;
      payload: AutomationNodePatch;
    }) => patchAutomationNode(projectId!, nodeId, payload),
    onSuccess: (resp) => {
      qc.setQueryData(["automation-center", projectId], resp);
      toast.success("Node kaydedildi.");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Node kaydedilemedi.";
      toast.error(msg);
    },
  });

  const evaluateM = useMutation({
    mutationFn: () => evaluateAutomation(projectId!),
    onSuccess: (resp) => {
      setEvalResult(resp);
      if (resp.ok) toast.info("Akış hazır görünüyor.");
      else toast.warning(`Engel sayısı: ${resp.blockers.length}`);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Değerlendirme başarısız.";
      toast.error(msg);
    },
  });

  const runM = useMutation({
    mutationFn: (force: boolean) =>
      runAutomationNow(projectId!, { dry_run: false, force }),
    onSuccess: (resp) => {
      if (resp.ok && resp.job_id) {
        toast.success("İş kuyruğa alındı.");
        navigate(`${baseRoute}/jobs/${resp.job_id}`);
      } else {
        const detail = resp.detail ?? resp.blockers.join(", ") ?? "Çalıştırılamadı.";
        toast.warning(detail);
      }
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Çalıştırma başarısız.";
      toast.error(msg);
    },
  });

  const testM = useMutation({
    mutationFn: (nodeId: string) =>
      testAutomationNode(projectId!, nodeId, { sample_payload: null }),
    onSuccess: (resp) => {
      if (resp.ok) toast.success(`Node testi başarılı: ${resp.node_id}`);
      else toast.warning(`Test sorunları: ${resp.issues.join(", ")}`);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Node test başarısız.";
      toast.error(msg);
    },
  });

  // ----------------------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------------------

  if (!projectId) {
    return (
      <div className="aurora-dashboard">
        <div className="page">
          <div style={{ padding: 32, color: "var(--text-muted)" }}>
            Proje kimliği eksik.
          </div>
        </div>
      </div>
    );
  }

  if (dataQ.isLoading) {
    return (
      <div className="aurora-dashboard">
        <div className="page">
          <div style={{ padding: 32, color: "var(--text-muted)" }}>
            Otomasyon yükleniyor…
          </div>
        </div>
      </div>
    );
  }

  if (dataQ.isError || !data) {
    const detail =
      dataQ.error instanceof Error
        ? dataQ.error.message
        : "Otomasyon merkezi açılamadı.";
    return (
      <div className="aurora-dashboard">
        <div className="page">
          <div
            style={{
              padding: 32,
              color: "var(--text-muted)",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <span>{detail}</span>
            <AuroraButton onClick={() => dataQ.refetch()}>Tekrar dene</AuroraButton>
          </div>
        </div>
      </div>
    );
  }

  const inspector = selectedNode ? (
    <NodeInspector
      key={selectedNode.id}
      node={selectedNode}
      disabled={snapshotLocked || nodeM.isPending}
      onSave={(payload) =>
        nodeM.mutate({ nodeId: selectedNode.id, payload })
      }
      onTest={() => testM.mutate(selectedNode.id)}
      saving={nodeM.isPending}
      testing={testM.isPending}
    />
  ) : (
    <AuroraInspector title="Akış">
      <AuroraInspectorSection title="Durum">
        <AuroraInspectorRow label="Mod" value={data.flow.run_mode} />
        <AuroraInspectorRow
          label="Onay"
          value={data.flow.require_review_gate ? "evet" : "hayır"}
        />
      </AuroraInspectorSection>
    </AuroraInspector>
  );

  return (
    <div className="aurora-dashboard">
      <div className="page" data-testid="aurora-automation-center">
        <header className="page-head">
          <div>
            <nav className="breadcrumbs caption" aria-label="Konum">
              <Link to={`${baseRoute}/projects`}>Projeler</Link>
              <span className="sep"> / </span>
              <Link
                to={`${baseRoute}/projects/${data.project.id}`}
              >
                {data.project.title}
              </Link>
              <span className="sep"> / </span>
              <span>Automation Center</span>
            </nav>
            <h1>Automation Center</h1>
            <div className="sub">
              {data.project.title} · {data.project.module_type ?? "—"}
            </div>
          </div>
          <div className="hstack">
            <AuroraButton
              onClick={() => evaluateM.mutate()}
              disabled={evaluateM.isPending}
              data-testid="ac-evaluate"
            >
              {evaluateM.isPending ? "Değerlendiriliyor…" : "Değerlendir"}
            </AuroraButton>
            <AuroraButton
              variant="primary"
              onClick={() => runM.mutate(false)}
              disabled={runM.isPending || snapshotLocked}
              data-testid="ac-run-now"
            >
              {runM.isPending ? "Tetikleniyor…" : "Şimdi çalıştır"}
            </AuroraButton>
            {isAdmin && (
              <AuroraButton
                variant="danger"
                onClick={() => {
                  if (
                    window.confirm(
                      "Günlük çalıştırma sınırını yok sayarak işi başlat. Devam edilsin mi?",
                    )
                  ) {
                    runM.mutate(true);
                  }
                }}
                disabled={runM.isPending || snapshotLocked}
              >
                Zorla çalıştır
              </AuroraButton>
            )}
          </div>
        </header>

        {snapshotLocked && (
          <AuroraCard className="ac-lock-banner" pad="tight">
            <strong>Aktif çalışma sürüyor.</strong> Akış ve node düzenlemeleri
            işlem bitene kadar kilitli. Sayfayı yenilediğinizde durum güncellenir.
          </AuroraCard>
        )}

        {evalResult && (
          <AuroraCard className="ac-eval-banner" pad="tight">
            <div className="hstack" style={{ gap: 8, flexWrap: "wrap" }}>
              <AuroraStatusChip tone={evalResult.ok ? "success" : "warning"}>
                {evalResult.ok ? "Hazır" : "Hazır değil"}
              </AuroraStatusChip>
              {evalResult.blockers.length > 0 && (
                <span className="caption">
                  Engeller: {evalResult.blockers.join(", ")}
                </span>
              )}
              {evalResult.warnings.length > 0 && (
                <span className="caption">
                  Uyarılar: {evalResult.warnings.join(", ")}
                </span>
              )}
              {evalResult.next_run_estimate && (
                <span className="caption">
                  Sonraki tahmini çalıştırma:{" "}
                  {new Date(evalResult.next_run_estimate).toLocaleString("tr-TR")}
                </span>
              )}
            </div>
          </AuroraCard>
        )}

        <div
          className="ac-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 360px",
            gap: 16,
            alignItems: "start",
            marginTop: 16,
          }}
        >
          <div>
            <FlowHeaderCard
              flow={data.flow}
              disabled={snapshotLocked || flowM.isPending}
              saving={flowM.isPending}
              onSave={(payload) => flowM.mutate(payload)}
            />
            <AutomationCanvas
              nodes={data.nodes}
              edges={data.edges}
              selectedNodeId={selectedNodeId}
              onSelectNode={setSelectedNodeId}
              snapshotLocked={snapshotLocked}
              data-testid="ac-canvas"
            />
          </div>
          {inspector}
        </div>

        <footer
          className="caption"
          style={{
            marginTop: 16,
            color: "var(--text-muted)",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>
            Son değerlendirme:{" "}
            {new Date(data.last_evaluated_at).toLocaleString("tr-TR")}
          </span>
          <span>
            Engeller: {Array.isArray(data.health?.blockers) ? (data.health.blockers as unknown[]).length : 0} ·
            Uyarılar: {Array.isArray(data.health?.warnings) ? (data.health.warnings as unknown[]).length : 0}
          </span>
        </footer>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FlowHeaderCard — flow config sub-form (top of workbench)
// ---------------------------------------------------------------------------

interface FlowHeaderCardProps {
  flow: AutomationCenterResponse["flow"];
  disabled: boolean;
  saving: boolean;
  onSave: (payload: AutomationFlowPatch) => void;
}

function FlowHeaderCard({ flow, disabled, saving, onSave }: FlowHeaderCardProps) {
  const [draft, setDraft] = useState(flow);

  // Reset when upstream changes (after save).
  useEffect(() => {
    setDraft(flow);
  }, [flow]);

  const dirty = useMemo(() => {
    return JSON.stringify(draft) !== JSON.stringify(flow);
  }, [draft, flow]);

  const handleSave = () => {
    const payload: AutomationFlowPatch = {
      run_mode: draft.run_mode,
      schedule_enabled: draft.schedule_enabled,
      cron_expression: draft.cron_expression,
      timezone: draft.timezone,
      require_review_gate: draft.require_review_gate,
      publish_policy: draft.publish_policy,
      fallback_on_error: draft.fallback_on_error,
      max_runs_per_day: draft.max_runs_per_day,
      default_template_id: draft.default_template_id,
      default_blueprint_id: draft.default_blueprint_id,
    };
    onSave(payload);
  };

  return (
    <AuroraCard pad="default" style={{ marginBottom: 16 }}>
      <div
        className="hstack"
        style={{ justifyContent: "space-between", alignItems: "baseline" }}
      >
        <h3 style={{ margin: 0 }}>Akış Yapılandırması</h3>
        <span className="caption">
          {dirty ? "Değişiklikler kaydedilmedi" : "Senkron"}
        </span>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginTop: 12,
        }}
      >
        <label className="form-label">
          <span className="overline">Mod</span>
          <select
            className="form-input"
            value={draft.run_mode}
            disabled={disabled}
            onChange={(e) =>
              setDraft((d) => ({ ...d, run_mode: e.target.value as RunMode }))
            }
          >
            {RUN_MODE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="form-label">
          <span className="overline">Yayın politikası</span>
          <select
            className="form-input"
            value={draft.publish_policy}
            disabled={disabled}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                publish_policy: e.target.value as PublishPolicy,
              }))
            }
          >
            {PUBLISH_POLICY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="form-label">
          <span className="overline">Hata politikası</span>
          <select
            className="form-input"
            value={draft.fallback_on_error}
            disabled={disabled}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                fallback_on_error: e.target.value as FallbackPolicy,
              }))
            }
          >
            {FALLBACK_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="form-label">
          <span className="overline">Onay kapısı</span>
          <select
            className="form-input"
            value={draft.require_review_gate ? "yes" : "no"}
            disabled={disabled}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                require_review_gate: e.target.value === "yes",
              }))
            }
          >
            <option value="yes">Açık</option>
            <option value="no">Kapalı</option>
          </select>
        </label>
        <label className="form-label">
          <span className="overline">Zamanlama</span>
          <select
            className="form-input"
            value={draft.schedule_enabled ? "yes" : "no"}
            disabled={disabled}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                schedule_enabled: e.target.value === "yes",
              }))
            }
          >
            <option value="no">Kapalı</option>
            <option value="yes">Açık</option>
          </select>
        </label>
        <label className="form-label">
          <span className="overline">Cron</span>
          <input
            className="form-input mono"
            type="text"
            value={draft.cron_expression ?? ""}
            placeholder="0 */6 * * *"
            disabled={disabled || !draft.schedule_enabled}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                cron_expression: e.target.value || null,
              }))
            }
          />
        </label>
        <label className="form-label">
          <span className="overline">Saat dilimi</span>
          <input
            className="form-input"
            type="text"
            value={draft.timezone}
            disabled={disabled}
            onChange={(e) => setDraft((d) => ({ ...d, timezone: e.target.value }))}
          />
        </label>
        <label className="form-label">
          <span className="overline">Günlük üst sınır</span>
          <input
            className="form-input mono"
            type="number"
            min={1}
            max={144}
            value={draft.max_runs_per_day ?? ""}
            disabled={disabled}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                max_runs_per_day: e.target.value
                  ? Number(e.target.value)
                  : null,
              }))
            }
          />
        </label>
      </div>
      <div className="hstack" style={{ marginTop: 12, gap: 8 }}>
        <AuroraButton
          variant="primary"
          onClick={handleSave}
          disabled={disabled || !dirty || saving}
          data-testid="ac-save-flow"
        >
          {saving ? "Kaydediliyor…" : "Akışı kaydet"}
        </AuroraButton>
        {dirty && (
          <AuroraButton
            variant="ghost"
            onClick={() => setDraft(flow)}
            disabled={saving}
          >
            Sıfırla
          </AuroraButton>
        )}
      </div>
    </AuroraCard>
  );
}

// ---------------------------------------------------------------------------
// NodeInspector — sidebar editor for the selected node
// ---------------------------------------------------------------------------

interface NodeInspectorProps {
  node: AutomationNode;
  disabled: boolean;
  saving: boolean;
  testing: boolean;
  onSave: (payload: AutomationNodePatch) => void;
  onTest: () => void;
}

function NodeInspector({
  node,
  disabled,
  saving,
  testing,
  onSave,
  onTest,
}: NodeInspectorProps) {
  const [mode, setMode] = useState<NodeOperationMode>(node.operation_mode);
  const [configText, setConfigText] = useState(() => configToText(node.config));
  const [configErr, setConfigErr] = useState<string | null>(null);

  useEffect(() => {
    setMode(node.operation_mode);
    setConfigText(configToText(node.config));
    setConfigErr(null);
  }, [node]);

  const dirty =
    mode !== node.operation_mode ||
    configText.trim() !== configToText(node.config).trim();

  const handleSave = () => {
    const parsed = parseConfigText(configText);
    if (parsed === null) {
      setConfigErr("Config geçerli bir JSON nesnesi olmalı.");
      return;
    }
    setConfigErr(null);
    onSave({ operation_mode: mode, config: parsed });
  };

  return (
    <AuroraInspector title={node.title}>
      <AuroraInspectorSection title="Durum">
        <AuroraInspectorRow label="kapsam" value={node.scope} />
        <AuroraInspectorRow label="durum" value={node.status} />
        <AuroraInspectorRow label="mod" value={node.operation_mode} />
        {node.last_run_at && (
          <AuroraInspectorRow
            label="son çalıştırma"
            value={new Date(node.last_run_at).toLocaleString("tr-TR")}
          />
        )}
      </AuroraInspectorSection>

      <AuroraInspectorSection title="Mod seçimi">
        <select
          className="form-input"
          value={mode}
          disabled={disabled}
          onChange={(e) => setMode(e.target.value as NodeOperationMode)}
          data-testid="ac-node-mode-select"
        >
          {MODE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </AuroraInspectorSection>

      <AuroraInspectorSection title="Yapılandırma">
        <textarea
          className="form-input mono"
          rows={8}
          value={configText}
          spellCheck={false}
          disabled={disabled}
          onChange={(e) => setConfigText(e.target.value)}
          data-testid="ac-node-config-textarea"
        />
        {configErr && (
          <div className="caption" style={{ color: "var(--accent-tertiary)" }}>
            {configErr}
          </div>
        )}
      </AuroraInspectorSection>

      <AuroraInspectorSection title="Eylemler">
        <AuroraButton
          variant="primary"
          size="sm"
          onClick={handleSave}
          disabled={disabled || !dirty || saving}
          style={{ width: "100%", marginBottom: 6 }}
          data-testid="ac-save-node"
        >
          {saving ? "Kaydediliyor…" : "Node’u kaydet"}
        </AuroraButton>
        <AuroraButton
          variant="secondary"
          size="sm"
          onClick={onTest}
          disabled={testing}
          style={{ width: "100%" }}
          data-testid="ac-test-node"
        >
          {testing ? "Test ediliyor…" : "Bu node’u test et"}
        </AuroraButton>
      </AuroraInspectorSection>

      {node.badges && node.badges.length > 0 && (
        <AuroraInspectorSection title="Notlar">
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {node.badges.map((b, i) => (
              <li key={`${b.label}-${i}`} style={{ marginBottom: 4 }}>
                <strong>{b.label}</strong>
                {b.detail ? (
                  <>
                    {" — "}
                    <span className="caption">{b.detail}</span>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        </AuroraInspectorSection>
      )}
    </AuroraInspector>
  );
}
