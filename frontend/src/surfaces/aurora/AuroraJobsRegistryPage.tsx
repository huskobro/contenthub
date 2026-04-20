/**
 * AuroraJobsRegistryPage — Aurora Dusk Cockpit / İş Kayıtları.
 *
 * Direct port of `ContentHub_Design _System/contenthub/pages/admin/jobs.html`:
 *   - Page-head (title + count + dışa aktar / yeni içerik aksiyonları)
 *   - Filter bar (search + status chips + sütun selector)
 *   - Bulk action bar (seçim varken görünür)
 *   - Table with sortable columns, sticky header, status badges, inline pbar,
 *     ETA chip, row hover actions, double-click drawer.
 *   - Pagination (8/page)
 *   - Context menu (right-click)
 *   - Detail drawer (Detay / Adımlar / Log tabs)
 *   - Inspector slot: Durum dağılımı + Bu hafta + Sütun görünürlüğü
 *
 * Veri kaynağı: useJobsList(true) — include_test_data:true ile aurora seed
 * + gerçek jobs. Backend mutations: markJobsAsTestData (silme/arşivleme),
 * cloneJob (klonlama). Saf görsel; routing /admin/jobs/:jobId üzerinden.
 *
 * Surface override sistemi tarafından `admin.jobs.registry` slot'u için
 * kayıtlı. Hiçbir legacy code değiştirilmez.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useJobsList } from "../../hooks/useJobsList";
import { markJobsAsTestData, cloneJob } from "../../api/jobsApi";
import type { JobResponse } from "../../api/jobsApi";
import { useToast } from "../../hooks/useToast";
import { exportRowsAsCsv, csvTimestamp } from "../../lib/csvExport";
import { Icon, type IconName } from "./icons";
import {
  AuroraInspector,
  AuroraInspectorSection,
  AuroraInspectorRow,
} from "./primitives";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtMonthDay(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

function fmtDurationMMSS(seconds: number | null | undefined): string {
  if (seconds == null || seconds <= 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function jobLabel(job: JobResponse): string {
  if (job.source_context_json) {
    try {
      const data = JSON.parse(job.source_context_json);
      if (data.display_title) return String(data.display_title);
    } catch {
      /* noop */
    }
  }
  return job.id.slice(0, 12);
}

function jobShortId(job: JobResponse): string {
  if (job.source_context_json) {
    try {
      const data = JSON.parse(job.source_context_json);
      if (data.id_label) return String(data.id_label);
    } catch {
      /* noop */
    }
  }
  return job.id.slice(0, 14).toUpperCase();
}

function jobProgressPct(job: JobResponse): number {
  if (job.status === "completed") return 100;
  if (job.status === "failed" || job.status === "queued") return 0;
  if (!job.steps || job.steps.length === 0) return 0;
  const total = job.steps.length;
  const done = job.steps.filter((s) => s.status === "completed").length;
  return Math.round((done / total) * 100);
}

function moduleThumbClass(module: string): string {
  switch (module) {
    case "news_bulletin":
      return "t-news";
    case "product_review":
      return "t-review";
    case "standard_video":
      return "t-doc";
    case "educational_video":
      return "t-edu";
    case "howto_video":
      return "t-howto";
    default:
      return "";
  }
}

function statusToClass(status: string): string {
  if (status === "running") return "running";
  if (status === "completed") return "completed";
  if (status === "failed") return "failed";
  if (status === "queued") return "queued";
  if (status === "pending") return "pending";
  return "draft";
}

const STATUS_LABELS: Record<string, string> = {
  running: "Çalışıyor",
  completed: "Tamamlandı",
  failed: "Başarısız",
  queued: "Kuyrukta",
  pending: "Bekliyor",
  draft: "Taslak",
};

const ALL_COLS = [
  { id: "thumb", label: "Önizleme", default: true },
  { id: "id", label: "İş ID", default: true },
  { id: "title", label: "Başlık", default: true },
  { id: "status", label: "Durum", default: true },
  { id: "progress", label: "İlerleme", default: true },
  { id: "module", label: "Modül", default: true },
  { id: "owner", label: "Sahip", default: false },
  { id: "created", label: "Oluşturulma", default: true },
  { id: "duration", label: "Süre", default: true },
  { id: "eta", label: "ETA", default: true },
  { id: "actions", label: "İşlemler", default: true },
] as const;

type ColId = (typeof ALL_COLS)[number]["id"];
type SortCol = "id" | "title" | "created";

const LS_COLS_KEY = "aurora_jobs_cols";

function loadColPrefs(): ColId[] {
  try {
    const saved = localStorage.getItem(LS_COLS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed as ColId[];
    }
  } catch {
    /* noop */
  }
  return ALL_COLS.filter((c) => c.default).map((c) => c.id);
}

const PER_PAGE = 8;

// ---------------------------------------------------------------------------
// StatusBadge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const cls = statusToClass(status);
  return (
    <span className={`status-dot ${cls}`}>
      <span className="d" />
      <span>{STATUS_LABELS[status] ?? status}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Checkbox (with indeterminate)
// ---------------------------------------------------------------------------

function Checkbox({
  checked,
  indeterminate,
  onChange,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange?: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate;
  }, [indeterminate]);
  return (
    <input
      type="checkbox"
      ref={ref}
      checked={checked}
      onChange={() => onChange?.()}
      style={{
        width: 14,
        height: 14,
        cursor: "pointer",
        accentColor: "var(--accent-primary)",
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Context menu
// ---------------------------------------------------------------------------

interface CtxMenuProps {
  x: number;
  y: number;
  job: JobResponse;
  onClose: () => void;
  onOpenDrawer: (job: JobResponse) => void;
  onClone: (job: JobResponse) => void;
  onDelete: (jobId: string) => void;
  onOpenDetail: (jobId: string) => void;
}

function ContextMenu({
  x,
  y,
  job,
  onClose,
  onOpenDrawer,
  onClone,
  onDelete,
  onOpenDetail,
}: CtxMenuProps) {
  useEffect(() => {
    const handleClick = () => onClose();
    const handleKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("click", handleClick);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("click", handleClick);
      window.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  return (
    <div
      className="ctx-menu"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="ctx-item"
        onClick={() => {
          onOpenDrawer(job);
          onClose();
        }}
      >
        <Icon name="eye" size={13} /> Detay görüntüle
      </div>
      <div
        className="ctx-item"
        onClick={() => {
          onOpenDetail(job.id);
          onClose();
        }}
      >
        <Icon name="external-link" size={13} /> Tam görünümde aç
      </div>
      <div
        className="ctx-item"
        onClick={() => {
          onClone(job);
          onClose();
        }}
      >
        <Icon name="refresh" size={13} /> Klonla
      </div>
      <div className="ctx-divider" />
      <div
        className="ctx-item"
        onClick={() => {
          navigator.clipboard?.writeText(job.id).catch(() => {});
          onClose();
        }}
      >
        <Icon name="link" size={13} /> ID kopyala
      </div>
      <div className="ctx-divider" />
      <div
        className="ctx-item danger"
        onClick={() => {
          if (window.confirm(`"${job.id.slice(0, 8)}…" işini arşivlemek istediğinden emin misin?`)) {
            onDelete(job.id);
          }
          onClose();
        }}
      >
        <Icon name="trash" size={13} /> Arşivle
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Job detail drawer
// ---------------------------------------------------------------------------

function JobDrawer({
  job,
  onClose,
  onOpenDetail,
}: {
  job: JobResponse;
  onClose: () => void;
  onOpenDetail: (jobId: string) => void;
}) {
  const [tab, setTab] = useState<"detail" | "steps" | "log">("detail");
  const pct = jobProgressPct(job);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const stepState = (idx: number): "done" | "active" | "pending" => {
    const step = job.steps[idx];
    if (!step) return "pending";
    if (step.status === "completed") return "done";
    if (step.status === "running") return "active";
    return "pending";
  };

  return (
    <>
      <div className="drawer-veil" onClick={onClose} />
      <aside className="drawer-detail" role="dialog" aria-modal="true">
        <div className="drawer-head">
          <div className="titles">
            <div className="crumb">İŞ KAYDI</div>
            <div className="title">{jobLabel(job)}</div>
          </div>
          <div className="actions">
            <button title="Kapat (esc)" onClick={onClose}>
              <Icon name="x" size={14} />
            </button>
          </div>
        </div>
        <div className="drawer-tabs">
          {[
            { id: "detail", label: "Detay" },
            { id: "steps", label: "Adımlar" },
            { id: "log", label: "Log" },
          ].map((t) => (
            <button
              key={t.id}
              className={"tab" + (tab === t.id ? " active" : "")}
              onClick={() => setTab(t.id as typeof tab)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="drawer-body">
          {tab === "detail" && (
            <>
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <div
                  className={`tbl-thumb ${moduleThumbClass(job.module_type)}`}
                  style={{ width: 120, height: 68, borderRadius: 8 }}
                />
                <div>
                  <StatusBadge status={job.status} />
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                      color: "var(--text-muted)",
                      marginTop: 4,
                    }}
                  >
                    {jobShortId(job)}
                  </div>
                  {pct > 0 && pct < 100 && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginTop: 6,
                      }}
                    >
                      <div className="tbl-pbar" style={{ width: 120 }}>
                        <div className="fill" style={{ width: `${pct}%` }} />
                      </div>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 10,
                          color: "var(--text-muted)",
                        }}
                      >
                        {pct}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="drawer-field">
                <div className="k">Modül</div>
                <div className="v">{job.module_type}</div>
              </div>
              <div className="drawer-field">
                <div className="k">Sahip</div>
                <div className="v">{job.owner_id ?? "—"}</div>
              </div>
              <div className="drawer-field">
                <div className="k">Oluşturulma</div>
                <div className="v">{fmtMonthDay(job.created_at)}</div>
              </div>
              {job.elapsed_total_seconds != null && (
                <div className="drawer-field">
                  <div className="k">Geçen süre</div>
                  <div className="v">
                    {fmtDurationMMSS(job.elapsed_total_seconds)}
                  </div>
                </div>
              )}
              {job.estimated_remaining_seconds != null && (
                <div className="drawer-field">
                  <div className="k">Tahmini bitiş</div>
                  <div className="v">
                    {fmtDurationMMSS(job.estimated_remaining_seconds)}
                  </div>
                </div>
              )}
              {job.last_error && (
                <div className="drawer-field">
                  <div className="k">Son hata</div>
                  <div
                    className="v"
                    style={{ color: "var(--state-danger-fg)" }}
                  >
                    {job.last_error}
                  </div>
                </div>
              )}
            </>
          )}
          {tab === "steps" && (
            <div className="step-line">
              {job.steps.length === 0 ? (
                <div
                  style={{
                    color: "var(--text-muted)",
                    fontSize: 12,
                    padding: "20px 0",
                    textAlign: "center",
                  }}
                >
                  Adım bilgisi yok
                </div>
              ) : (
                job.steps.map((s, i) => (
                  <div key={s.id} className="step-item">
                    <div className={`step-dot ${stepState(i)}`}>
                      {stepState(i) === "done" ? "✓" : i + 1}
                    </div>
                    <div className="step-body">
                      <div className="step-name">{s.step_key}</div>
                      <div className="step-meta">
                        {stepState(i) === "done"
                          ? `tamamlandı · ${fmtDurationMMSS(s.elapsed_seconds)}`
                          : stepState(i) === "active"
                          ? `işleniyor… ${
                              s.elapsed_seconds_live != null
                                ? fmtDurationMMSS(s.elapsed_seconds_live)
                                : ""
                            }`
                          : "bekliyor"}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
          {tab === "log" && (
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--text-secondary)",
                lineHeight: 1.7,
              }}
            >
              <div style={{ color: "var(--state-success-fg)" }}>
                [{fmtMonthDay(job.created_at)}] job:{jobShortId(job)} init OK
              </div>
              {job.steps.map((s) => (
                <div key={s.id}>
                  [{fmtMonthDay(s.created_at)}] step:{s.step_key} ·{" "}
                  {s.status}
                  {s.elapsed_seconds != null
                    ? ` · ${fmtDurationMMSS(s.elapsed_seconds)}`
                    : ""}
                </div>
              ))}
              {job.last_error && (
                <div style={{ color: "var(--state-danger-fg)" }}>
                  ERR · {job.last_error}
                </div>
              )}
              {job.status === "completed" && (
                <div style={{ color: "var(--state-success-fg)" }}>
                  [{fmtMonthDay(job.finished_at)}] published
                </div>
              )}
            </div>
          )}
        </div>
        <div className="drawer-foot">
          <button className="btn ghost sm" onClick={onClose}>
            Kapat
          </button>
          <div className="grow" style={{ flex: 1 }} />
          <button
            className="btn primary sm"
            onClick={() => {
              onOpenDetail(job.id);
              onClose();
            }}
          >
            <Icon name="external-link" size={11} /> Tam görünüm
          </button>
        </div>
      </aside>
    </>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function AuroraJobsRegistryPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: jobsData, isLoading, isError } = useJobsList(true);
  const jobs = useMemo(() => jobsData ?? [], [jobsData]);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  // URL ile bidirectional sync — Cockpit Statusbar drill-down (?status=running)
  // ve refresh sonrası state korunur. Geçerli değerler dışındakileri yok say.
  const VALID_STATUSES = ["running", "queued", "completed", "failed", "pending"];
  const initialStatus = (() => {
    const s = searchParams.get("status");
    return s && VALID_STATUSES.includes(s) ? s : null;
  })();
  const [filterStatus, setFilterStatus] = useState<string | null>(initialStatus);

  // URL değişimi (örn: cockpit drill-down) → state senkronu
  useEffect(() => {
    const s = searchParams.get("status");
    const next = s && VALID_STATUSES.includes(s) ? s : null;
    if (next !== filterStatus) setFilterStatus(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // State değişimi (chip tıklama) → URL senkronu
  useEffect(() => {
    const current = searchParams.get("status");
    if (filterStatus && current !== filterStatus) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("status", filterStatus);
        return next;
      }, { replace: true });
    } else if (!filterStatus && current) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("status");
        return next;
      }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState<SortCol>("created");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [colVis, setColVis] = useState<ColId[]>(loadColPrefs);
  const [colDropOpen, setColDropOpen] = useState(false);
  const [ctx, setCtx] = useState<{ x: number; y: number; job: JobResponse } | null>(null);
  const [drawer, setDrawer] = useState<JobResponse | null>(null);
  const [page, setPage] = useState(1);

  // Persist col visibility
  useEffect(() => {
    try {
      localStorage.setItem(LS_COLS_KEY, JSON.stringify(colVis));
    } catch {
      /* noop */
    }
  }, [colVis]);

  // Status counts (over full job list, ignoring search/filter)
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      running: 0,
      queued: 0,
      completed: 0,
      failed: 0,
      pending: 0,
    };
    jobs.forEach((j) => {
      counts[j.status] = (counts[j.status] ?? 0) + 1;
    });
    return counts;
  }, [jobs]);

  // Filter + sort
  const filtered = useMemo(() => {
    const result = jobs.filter((j) => {
      if (filterStatus && j.status !== filterStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        const title = jobLabel(j).toLowerCase();
        const sid = jobShortId(j).toLowerCase();
        return (
          j.id.toLowerCase().includes(q) ||
          title.includes(q) ||
          sid.includes(q) ||
          j.module_type.toLowerCase().includes(q)
        );
      }
      return true;
    });
    const mul = sortDir === "asc" ? 1 : -1;
    result.sort((a, b) => {
      let av: string | number = "";
      let bv: string | number = "";
      if (sortCol === "id") {
        av = a.id;
        bv = b.id;
      } else if (sortCol === "title") {
        av = jobLabel(a);
        bv = jobLabel(b);
      } else {
        av = new Date(a.created_at).getTime();
        bv = new Date(b.created_at).getTime();
      }
      if (av < bv) return -mul;
      if (av > bv) return mul;
      return 0;
    });
    return result;
  }, [jobs, filterStatus, search, sortCol, sortDir]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageJobs = useMemo(
    () => filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE),
    [filtered, page],
  );

  // Selection
  const allPageSelected =
    pageJobs.length > 0 && pageJobs.every((j) => selected.has(j.id));
  const someSelected =
    pageJobs.some((j) => selected.has(j.id)) && !allPageSelected;

  const toggleAll = () => {
    const next = new Set(selected);
    if (allPageSelected) pageJobs.forEach((j) => next.delete(j.id));
    else pageJobs.forEach((j) => next.add(j.id));
    setSelected(next);
  };

  const toggleRow = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const sort = (col: SortCol) => {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ col }: { col: SortCol }) => (
    <span className="sort-icon">
      {sortCol === col ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
    </span>
  );

  const handleCtx = (e: React.MouseEvent, job: JobResponse) => {
    e.preventDefault();
    setCtx({ x: e.clientX, y: e.clientY, job });
  };

  const archiveMutation = useMutation({
    mutationFn: (jobIds: string[]) => markJobsAsTestData(jobIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("İş(ler) arşivlendi");
      setSelected(new Set());
    },
    onError: () => toast.error("Arşivleme başarısız"),
  });

  const cloneMutation = useMutation({
    mutationFn: (jobId: string) => cloneJob(jobId),
    onSuccess: (newJob) => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("İş klonlandı");
      navigate(`/admin/jobs/${newJob.id}`);
    },
    onError: () => toast.error("Klonlama başarısız"),
  });

  const colVisible = (id: ColId) => colVis.includes(id);

  const handleExportCsv = () => {
    if (filtered.length === 0) {
      toast.error("Dışa aktarılacak kayıt yok");
      return;
    }
    exportRowsAsCsv(`jobs-${csvTimestamp()}.csv`, filtered, [
      { header: "ID", value: (j) => j.id },
      { header: "Modül", value: (j) => j.module_type ?? "" },
      { header: "Durum", value: (j) => j.status ?? "" },
      { header: "Aşama", value: (j) => j.current_step_key ?? "" },
      { header: "Geçen (sn)", value: (j) => j.elapsed_total_seconds ?? "" },
      { header: "ETA (sn)", value: (j) => j.eta_seconds ?? "" },
      { header: "Retry", value: (j) => j.retry_count ?? 0 },
      { header: "Sahip", value: (j) => j.owner_id ?? "" },
      { header: "Şablon", value: (j) => j.template_id ?? "" },
      { header: "Oluşturulma", value: (j) => j.created_at ?? "" },
      { header: "Başlama", value: (j) => j.started_at ?? "" },
      { header: "Bitiş", value: (j) => j.finished_at ?? "" },
      { header: "Güncellenme", value: (j) => j.updated_at ?? "" },
      { header: "Son hata", value: (j) => j.last_error ?? "" },
    ]);
    toast.success(`${filtered.length} kayıt dışa aktarıldı`);
  };

  // Inspector
  const inspector = (
    <AuroraInspector title="Filtreler & istatistik">
      <AuroraInspectorSection title="Durum dağılımı">
        {(["running", "queued", "completed", "failed", "pending"] as const).map(
          (s) => (
            <div key={s} className="inspector-row">
              <span className="k">
                <StatusBadge status={s} />
              </span>
              <span
                className="v"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {statusCounts[s] ?? 0}
              </span>
            </div>
          ),
        )}
      </AuroraInspectorSection>

      <AuroraInspectorSection title="Bu hafta">
        <AuroraInspectorRow label="toplam job" value={String(jobs.length)} />
        <AuroraInspectorRow
          label="başarı oranı"
          value={
            jobs.length === 0
              ? "—"
              : `${Math.round(
                  ((statusCounts.completed ?? 0) / jobs.length) * 100,
                )}%`
          }
        />
        <AuroraInspectorRow
          label="aktif render"
          value={String(statusCounts.running ?? 0)}
        />
        <AuroraInspectorRow
          label="bekleyen"
          value={String(statusCounts.queued ?? 0)}
        />
      </AuroraInspectorSection>

      <AuroraInspectorSection title="Sütun görünürlüğü">
        <div
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            marginBottom: 6,
          }}
        >
          {colVis.length}/{ALL_COLS.length} sütun aktif
        </div>
        <button
          type="button"
          className="btn secondary sm"
          style={{ width: "100%" }}
          onClick={() => setColDropOpen((o) => !o)}
        >
          <Icon name="sliders" size={11} /> Sütunları düzenle
        </button>
      </AuroraInspectorSection>
    </AuroraInspector>
  );

  // ---------------- Render ----------------
  return (
    <div className="aurora-jobs">
      <div className="page">
        {/* Page head */}
        <div className="page-head">
          <div>
            <h1>İş kayıtları</h1>
            <div className="sub">
              {isLoading
                ? "Yükleniyor…"
                : `${jobs.length} kayıt · ${
                    statusCounts.running ?? 0
                  } aktif render · gerçek zamanlı`}
            </div>
          </div>
          <div className="hstack">
            <button
              className="btn secondary sm"
              type="button"
              onClick={handleExportCsv}
              data-testid="aurora-jobs-export"
            >
              <Icon name="arrow-up-right" size={12} /> Dışa aktar
            </button>
            <button
              className="btn primary sm"
              type="button"
              onClick={() => navigate("/admin/standard-videos/new")}
            >
              <Icon name="plus" size={12} /> Yeni içerik
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="filter-bar">
          <div className="search-wrap">
            <span className="icon">
              <Icon name="search" size={13} />
            </span>
            <input
              placeholder="ID, başlık veya modül ara…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <button
            type="button"
            className={"filter-chip" + (!filterStatus ? " active" : "")}
            onClick={() => {
              setFilterStatus(null);
              setPage(1);
            }}
          >
            Tümü <span className="badge">{jobs.length}</span>
          </button>
          {(
            [
              { key: "completed", label: "Tamamlandı", cls: "ok" },
              { key: "running", label: "Çalışıyor", cls: "info" },
              { key: "queued", label: "Kuyrukta", cls: "warn" },
              { key: "failed", label: "Başarısız", cls: "danger" },
            ] as const
          ).map((f) => (
            <button
              key={f.key}
              type="button"
              className={
                `filter-chip ${f.cls}` +
                (filterStatus === f.key ? " active" : "")
              }
              onClick={() => {
                setFilterStatus(filterStatus === f.key ? null : f.key);
                setPage(1);
              }}
            >
              {f.label}{" "}
              <span className="badge">{statusCounts[f.key] ?? 0}</span>
            </button>
          ))}
          <div className="spacer" />
          <div className="col-selector">
            <button
              type="button"
              className="btn secondary sm"
              onClick={(e) => {
                e.stopPropagation();
                setColDropOpen((o) => !o);
              }}
            >
              <Icon name="sliders" size={11} /> Sütunlar
            </button>
            {colDropOpen && (
              <div
                className="col-dropdown"
                onClick={(e) => e.stopPropagation()}
              >
                {ALL_COLS.map((c) => (
                  <div
                    key={c.id}
                    className="col-row"
                    onClick={() =>
                      setColVis((v) =>
                        v.includes(c.id)
                          ? v.filter((x) => x !== c.id)
                          : [...v, c.id],
                      )
                    }
                  >
                    <Checkbox checked={colVis.includes(c.id)} />
                    <span>{c.label}</span>
                  </div>
                ))}
                <div
                  style={{
                    padding: "8px 10px 4px",
                    borderTop: "1px solid var(--border-subtle)",
                    marginTop: 4,
                    display: "flex",
                    gap: 6,
                  }}
                >
                  <button
                    type="button"
                    className="btn ghost sm"
                    style={{ flex: 1 }}
                    onClick={() => setColVis(ALL_COLS.map((c) => c.id))}
                  >
                    Tümü
                  </button>
                  <button
                    type="button"
                    className="btn ghost sm"
                    style={{ flex: 1 }}
                    onClick={() =>
                      setColVis(
                        ALL_COLS.filter((c) => c.default).map((c) => c.id),
                      )
                    }
                  >
                    Varsayılan
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="bulk-bar">
            <span className="count">{selected.size} seçili</span>
            <div className="divider" />
            <button
              type="button"
              className="btn secondary sm"
              disabled={cloneMutation.isPending}
              onClick={() => {
                const first = jobs.find((j) => selected.has(j.id));
                if (first) cloneMutation.mutate(first.id);
              }}
            >
              <Icon name="refresh" size={11} /> Klonla
            </button>
            <button
              type="button"
              className="btn danger sm"
              disabled={archiveMutation.isPending}
              onClick={() => {
                if (
                  window.confirm(
                    `${selected.size} iş arşivlenecek. Bu işlem listeden gizleyecek (geri alınabilir). Devam edilsin mi?`,
                  )
                ) {
                  archiveMutation.mutate(Array.from(selected));
                }
              }}
            >
              <Icon name="trash" size={11} /> Arşivle
            </button>
            <div className="spacer" />
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => setSelected(new Set())}
            >
              <Icon name="x" size={11} /> Seçimi temizle
            </button>
          </div>
        )}

        {/* Table */}
        <div
          className="tbl-wrap"
          onClick={() => {
            setColDropOpen(false);
            setCtx(null);
          }}
        >
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 36, paddingLeft: 16 }}>
                  <Checkbox
                    checked={allPageSelected}
                    indeterminate={someSelected}
                    onChange={toggleAll}
                  />
                </th>
                {colVisible("thumb") && (
                  <th style={{ width: 80 }}>Önizleme</th>
                )}
                {colVisible("id") && (
                  <th
                    className={
                      "sortable" + (sortCol === "id" ? " sorted" : "")
                    }
                    onClick={() => sort("id")}
                  >
                    ID <SortIcon col="id" />
                  </th>
                )}
                {colVisible("title") && (
                  <th
                    className={
                      "sortable" + (sortCol === "title" ? " sorted" : "")
                    }
                    onClick={() => sort("title")}
                  >
                    Başlık <SortIcon col="title" />
                  </th>
                )}
                {colVisible("status") && <th>Durum</th>}
                {colVisible("progress") && (
                  <th style={{ width: 120 }}>İlerleme</th>
                )}
                {colVisible("module") && <th>Modül</th>}
                {colVisible("owner") && <th>Sahip</th>}
                {colVisible("created") && (
                  <th
                    className={
                      "sortable" + (sortCol === "created" ? " sorted" : "")
                    }
                    onClick={() => sort("created")}
                  >
                    Oluşturulma <SortIcon col="created" />
                  </th>
                )}
                {colVisible("duration") && <th>Süre</th>}
                {colVisible("eta") && <th>ETA</th>}
                {colVisible("actions") && <th style={{ width: 80 }} />}
              </tr>
            </thead>
            <tbody>
              {pageJobs.map((job) => {
                const pct = jobProgressPct(job);
                const eta = job.estimated_remaining_seconds;
                const dur = job.elapsed_total_seconds;
                return (
                  <tr
                    key={job.id}
                    className={selected.has(job.id) ? "selected" : ""}
                    onContextMenu={(e) => handleCtx(e, job)}
                    onDoubleClick={() => setDrawer(job)}
                  >
                    <td
                      style={{ paddingLeft: 16 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={selected.has(job.id)}
                        onChange={() => toggleRow(job.id)}
                      />
                    </td>
                    {colVisible("thumb") && (
                      <td>
                        <div
                          className={`tbl-thumb ${moduleThumbClass(
                            job.module_type,
                          )}`}
                        >
                          {dur != null && dur > 0 && (
                            <span className="dur">
                              {fmtDurationMMSS(dur)}
                            </span>
                          )}
                        </div>
                      </td>
                    )}
                    {colVisible("id") && (
                      <td>
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 11,
                            color: "var(--accent-primary-hover)",
                          }}
                        >
                          {jobShortId(job)}
                        </span>
                      </td>
                    )}
                    {colVisible("title") && (
                      <td style={{ maxWidth: 240 }}>
                        <div
                          className="job-title"
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {jobLabel(job)}
                        </div>
                      </td>
                    )}
                    {colVisible("status") && (
                      <td>
                        <StatusBadge status={job.status} />
                      </td>
                    )}
                    {colVisible("progress") && (
                      <td>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <div
                            className={"tbl-pbar" + (pct === 100 ? " done" : "")}
                          >
                            <div
                              className="fill"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: 10,
                              color: "var(--text-muted)",
                              minWidth: 26,
                            }}
                          >
                            {pct}%
                          </span>
                        </div>
                      </td>
                    )}
                    {colVisible("module") && (
                      <td>
                        <span className="chip" style={{ fontSize: 10 }}>
                          {job.module_type}
                        </span>
                      </td>
                    )}
                    {colVisible("owner") && (
                      <td>
                        <span
                          style={{
                            fontSize: 12,
                            color: "var(--text-secondary)",
                          }}
                        >
                          {job.owner_id ?? "—"}
                        </span>
                      </td>
                    )}
                    {colVisible("created") && (
                      <td>
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 11,
                            color: "var(--text-muted)",
                          }}
                        >
                          {fmtMonthDay(job.created_at)}
                        </span>
                      </td>
                    )}
                    {colVisible("duration") && (
                      <td>
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 11,
                            color: "var(--text-muted)",
                          }}
                        >
                          {fmtDurationMMSS(dur)}
                        </span>
                      </td>
                    )}
                    {colVisible("eta") && (
                      <td>
                        {eta != null && eta > 0 ? (
                          <span
                            className={
                              "eta" +
                              (job.status === "failed" ? " overdue" : "")
                            }
                          >
                            eta{" "}
                            <span className="v">{fmtDurationMMSS(eta)}</span>
                          </span>
                        ) : (
                          <span
                            style={{
                              color: "var(--text-muted)",
                              fontSize: 11,
                            }}
                          >
                            —
                          </span>
                        )}
                      </td>
                    )}
                    {colVisible("actions") && (
                      <td>
                        <div className="row-actions">
                          <button
                            type="button"
                            className="btn ghost sm icon"
                            title="Detay"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDrawer(job);
                            }}
                          >
                            <Icon name="eye" size={12} />
                          </button>
                          <button
                            type="button"
                            className="btn ghost sm icon"
                            title="Seçenekler"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCtx(e, job);
                            }}
                          >
                            <Icon name="more-horizontal" size={12} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
              {pageJobs.length === 0 && !isLoading && (
                <tr>
                  <td
                    colSpan={colVis.length + 1}
                    style={{
                      textAlign: "center",
                      padding: "40px 20px",
                      color: "var(--text-muted)",
                    }}
                  >
                    <Icon name={"list" as IconName} size={22} />
                    <div style={{ marginTop: 8, fontSize: 13 }}>
                      {isError ? "Yükleme hatası" : "Sonuç bulunamadı"}
                    </div>
                    <div style={{ fontSize: 11, marginTop: 4 }}>
                      {isError
                        ? "Bağlantıyı kontrol edin"
                        : "Filtreleri veya arama terimini değiştirin"}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="pagination">
          <span>
            {filtered.length} kayıt · sayfa {page}/{pageCount}
          </span>
          <div className="spacer" style={{ flex: 1 }} />
          <div className="pager">
            <button
              type="button"
              className="pg"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <Icon name="chevron-left" size={12} />
            </button>
            {Array.from({ length: pageCount }, (_, i) => (
              <button
                key={i + 1}
                type="button"
                className={"pg" + (page === i + 1 ? " active" : "")}
                onClick={() => setPage(i + 1)}
              >
                {i + 1}
              </button>
            ))}
            <button
              type="button"
              className="pg"
              onClick={() =>
                setPage((p) => Math.min(pageCount, p + 1))
              }
              disabled={page === pageCount}
            >
              <Icon name="chevron-right" size={12} />
            </button>
          </div>
        </div>
      </div>

      <div className="aurora-inspector-slot">{inspector}</div>

      {ctx && (
        <ContextMenu
          x={ctx.x}
          y={ctx.y}
          job={ctx.job}
          onClose={() => setCtx(null)}
          onOpenDrawer={setDrawer}
          onClone={(j) => cloneMutation.mutate(j.id)}
          onDelete={(jobId) => archiveMutation.mutate([jobId])}
          onOpenDetail={(jobId) => navigate(`/admin/jobs/${jobId}`)}
        />
      )}

      {drawer && (
        <JobDrawer
          job={drawer}
          onClose={() => setDrawer(null)}
          onOpenDetail={(jobId) => navigate(`/admin/jobs/${jobId}`)}
        />
      )}
    </div>
  );
}
