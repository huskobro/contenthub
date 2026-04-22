/**
 * AuroraSourceScansRegistryPage — Aurora Dusk Cockpit / Kaynak taramaları (admin).
 *
 * Direct port of `docs/aurora-design-source/project/contenthub/pages/admin/source-scans-registry.html`.
 * Tasarım hedefi:
 *   - Page-head ("Kaynak taramaları" + alt başlık + "Yenile" / "Yeni tarama")
 *   - reg-tbl: ID / Kaynak / Durum / Başlangıç / Süre / Bulunan / Hata özeti
 *   - Status: chip + dot (success/failed/running/pending)
 *   - Inspector: toplam, success/failed/running, son 24 saat, ortalama süre
 *
 * Veri kaynağı: useSourceScansList() — gerçek SourceScanResponse[].
 * Mutations: yok (sourceScansApi'de bulkDelete yok; checkbox seçimi pasif kalır,
 * silme aksiyonu eklenmez — tasarım kuralı: "endpoint yoksa eklem").
 *
 * Hiçbir legacy code değiştirilmez; surface override sistemi tarafından
 * `admin.source-scans.registry` slot'una bağlanır (register.tsx'te).
 */
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useSourceScansList } from "../../hooks/useSourceScansList";
import type { SourceScanResponse } from "../../api/sourceScansApi";
import {
  AuroraButton,
  AuroraInspector,
  AuroraInspectorSection,
  AuroraInspectorRow,
  AuroraDetailDrawer,
  type AuroraDrawerItem,
} from "./primitives";
import { Icon } from "./icons";

// ---------------------------------------------------------------------------
// Status chip mapping
// ---------------------------------------------------------------------------

type StatusTone = "ok" | "err" | "warn" | "muted";

const STATUS_TONE: Record<string, { tone: StatusTone; label: string; color: string }> = {
  completed: { tone: "ok", label: "completed", color: "var(--state-success-fg)" },
  success: { tone: "ok", label: "success", color: "var(--state-success-fg)" },
  failed: { tone: "err", label: "failed", color: "var(--state-danger-fg)" },
  error: { tone: "err", label: "error", color: "var(--state-danger-fg)" },
  running: { tone: "warn", label: "running", color: "var(--state-warning-fg)" },
  in_progress: { tone: "warn", label: "in_progress", color: "var(--state-warning-fg)" },
  pending: { tone: "muted", label: "pending", color: "var(--text-muted)" },
  queued: { tone: "muted", label: "queued", color: "var(--text-muted)" },
};

function statusInfo(status: string): { tone: StatusTone; label: string; color: string } {
  const key = (status || "").toLowerCase();
  return (
    STATUS_TONE[key] ?? { tone: "muted", label: status || "—", color: "var(--text-muted)" }
  );
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

function shortId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "—";
  const sec = Math.max(1, Math.floor((Date.now() - t) / 1000));
  if (sec < 60) return `${sec}sn önce`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}dk önce`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}s önce`;
  const d = Math.floor(hr / 24);
  return `${d}g önce`;
}

function durationSec(start: string | null | undefined, end: string | null | undefined): number | null {
  if (!start || !end) return null;
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  const diff = Math.max(0, Math.floor((b - a) / 1000));
  return diff;
}

function fmtDuration(sec: number | null): string {
  if (sec === null) return "—";
  if (sec < 60) return `${sec}sn`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function sourceLabel(s: SourceScanResponse): string {
  if (s.source_name && s.source_name.trim().length > 0) return s.source_name;
  return shortId(s.source_id);
}

function shortError(msg: string | null | undefined, max = 48): string {
  if (!msg) return "—";
  const t = msg.trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1) + "…";
}

function articlesOf(s: SourceScanResponse): number {
  if (typeof s.result_count === "number") return s.result_count;
  if (typeof s.linked_news_count_from_scan === "number") return s.linked_news_count_from_scan;
  return 0;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function AuroraSourceScansRegistryPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: scans, isLoading, isError, error, isFetching, refetch } = useSourceScansList();
  const list = scans ?? [];

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawerIdx, setDrawerIdx] = useState<number | null>(null);

  const counts = useMemo(() => {
    const c = { ok: 0, err: 0, warn: 0, muted: 0 };
    for (const s of list) {
      c[statusInfo(s.status).tone] += 1;
    }
    return c;
  }, [list]);

  const last24h = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return list.filter((s) => {
      const ref = s.started_at ?? s.created_at;
      if (!ref) return false;
      const t = new Date(ref).getTime();
      return Number.isFinite(t) && t >= cutoff;
    }).length;
  }, [list]);

  const avgDurationSec = useMemo(() => {
    const durations = list
      .map((s) => durationSec(s.started_at, s.finished_at))
      .filter((d): d is number => d !== null && d >= 0);
    if (durations.length === 0) return null;
    const sum = durations.reduce((acc, n) => acc + n, 0);
    return Math.round(sum / durations.length);
  }, [list]);

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected((prev) => {
      if (prev.size === list.length) return new Set();
      return new Set(list.map((s) => s.id));
    });
  }

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["source-scans"] });
  }

  function KvRow({
    label,
    children,
  }: {
    label: string;
    children: ReactNode;
  }) {
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "120px 1fr",
          gap: 12,
          padding: "8px 0",
          borderBottom: "1px solid var(--border-subtle)",
          fontSize: 12,
        }}
      >
        <div
          style={{
            color: "var(--text-muted)",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
          }}
        >
          {label}
        </div>
        <div style={{ color: "var(--text-primary)" }}>{children}</div>
      </div>
    );
  }

  function buildDrawer(idx: number): AuroraDrawerItem {
    const s = list[idx];
    const info = statusInfo(s.status);
    const dur = durationSec(s.started_at, s.finished_at);
    let preview: string | null = null;
    if (s.raw_result_preview_json) {
      try {
        preview = JSON.stringify(
          JSON.parse(s.raw_result_preview_json),
          null,
          2,
        );
      } catch {
        preview = s.raw_result_preview_json;
      }
    }
    return {
      breadcrumb: ["Admin", "Kaynak taramaları", shortId(s.id)],
      title: sourceLabel(s),
      actions: [
        {
          label: "Kopyala ID",
          variant: "ghost",
          onClick: () => {
            void navigator.clipboard?.writeText(s.id);
          },
        },
      ],
      children: (
        <div>
          <KvRow label="ID">
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--accent-primary-hover)",
              }}
            >
              {s.id}
            </span>
          </KvRow>
          <KvRow label="Kaynak">
            <span style={{ fontWeight: 500 }}>{sourceLabel(s)}</span>
          </KvRow>
          <KvRow label="Source ID">
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
              {s.source_id}
            </span>
          </KvRow>
          <KvRow label="Mode">
            <span
              className="chip"
              style={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
            >
              {s.scan_mode}
            </span>
          </KvRow>
          <KvRow label="Durum">
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontFamily: "var(--font-mono)",
                fontSize: 11,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: info.color,
                  boxShadow: `0 0 6px ${info.color}`,
                }}
              />
              {info.label}
            </span>
          </KvRow>
          <KvRow label="Başlangıç">
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--text-muted)",
              }}
            >
              {s.started_at ?? "—"}
            </span>
          </KvRow>
          <KvRow label="Bitiş">
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--text-muted)",
              }}
            >
              {s.finished_at ?? "—"}
            </span>
          </KvRow>
          <KvRow label="Süre">
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
              {fmtDuration(dur)}
            </span>
          </KvRow>
          <KvRow label="Bulunan">
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
              {articlesOf(s)}
            </span>
          </KvRow>
          <KvRow label="Linked / Used">
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--text-muted)",
              }}
            >
              {s.linked_news_count_from_scan ?? 0} ·{" "}
              {s.used_news_count_from_scan ?? 0}
            </span>
          </KvRow>
          <KvRow label="İsteyen">
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
              {s.requested_by ?? "—"}
            </span>
          </KvRow>
          {s.error_summary && (
            <KvRow label="Hata">
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--state-danger-fg)",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {s.error_summary}
              </span>
            </KvRow>
          )}
          {s.notes && (
            <KvRow label="Not">
              <span style={{ whiteSpace: "pre-wrap" }}>{s.notes}</span>
            </KvRow>
          )}
          <KvRow label="Eklenme">
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--text-muted)",
              }}
            >
              {timeAgo(s.created_at)}
            </span>
          </KvRow>
          <KvRow label="Güncellenme">
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--text-muted)",
              }}
            >
              {timeAgo(s.updated_at)}
            </span>
          </KvRow>
          {preview && (
            <details style={{ marginTop: 12 }}>
              <summary
                style={{
                  cursor: "pointer",
                  fontSize: 11,
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                raw_result_preview_json
              </summary>
              <pre
                style={{
                  marginTop: 6,
                  background: "var(--bg-inset)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 4,
                  padding: 8,
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                  color: "var(--text-secondary)",
                  maxHeight: 320,
                  overflow: "auto",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {preview}
              </pre>
            </details>
          )}
        </div>
      ),
    };
  }

  const inspector = (
    <AuroraInspector title="Taramalar">
      <AuroraInspectorSection title="Özet">
        <AuroraInspectorRow label="toplam" value={String(list.length)} />
        <AuroraInspectorRow label="başarılı" value={String(counts.ok)} />
        <AuroraInspectorRow label="başarısız" value={String(counts.err)} />
        <AuroraInspectorRow label="çalışan" value={String(counts.warn)} />
      </AuroraInspectorSection>
      <AuroraInspectorSection title="Aktivite">
        <AuroraInspectorRow label="son 24s" value={String(last24h)} />
        <AuroraInspectorRow
          label="ort. süre"
          value={avgDurationSec === null ? "—" : fmtDuration(avgDurationSec)}
        />
      </AuroraInspectorSection>
      {selected.size > 0 && (
        <AuroraInspectorSection title="Seçim">
          <AuroraInspectorRow label="seçili" value={String(selected.size)} />
        </AuroraInspectorSection>
      )}
    </AuroraInspector>
  );

  return (
    <div className="aurora-dashboard">
      <div className="page">
        <div className="page-head">
          <div>
            <h1>Kaynak taramaları</h1>
            <div className="sub">
              {list.length} tarama · son tarama sonuçları
            </div>
          </div>
          <div className="hstack" style={{ gap: 8 }}>
            <AuroraButton
              variant="secondary"
              size="sm"
              onClick={refresh}
              disabled={isFetching}
              iconLeft={<Icon name="refresh" size={11} />}
            >
              {isFetching ? "Yenileniyor…" : "Yenile"}
            </AuroraButton>
            <AuroraButton
              variant="primary"
              size="sm"
              onClick={() => navigate("/admin/source-scans/new")}
              iconLeft={<Icon name="plus" size={11} />}
            >
              Yeni tarama
            </AuroraButton>
          </div>
        </div>

        {isLoading && (
          <div
            className="card card-pad"
            style={{ textAlign: "center", color: "var(--text-muted)" }}
          >
            Tarama kayıtları yükleniyor…
          </div>
        )}

        {isError && (
          <div
            className="card card-pad"
            style={{
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span
              style={{
                color: "var(--state-danger-fg)",
                fontFamily: "var(--font-mono)",
                fontSize: 12,
              }}
            >
              Tarama geçmişi yüklenemedi:{" "}
              {error instanceof Error ? error.message : "Bilinmeyen hata"}
            </span>
            <AuroraButton size="sm" onClick={() => refetch()}>
              Tekrar dene
            </AuroraButton>
          </div>
        )}

        {!isLoading && !isError && list.length === 0 && (
          <div
            className="card card-pad"
            style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}
          >
            Henüz tarama kaydı yok.{" "}
            <AuroraButton
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin/source-scans/new")}
            >
              İlk taramayı başlat →
            </AuroraButton>
          </div>
        )}

        {!isLoading && !isError && list.length > 0 && (
          <div className="card" style={{ overflow: "auto" }}>
            <table className="reg-tbl">
              <thead>
                <tr>
                  <th style={{ width: 30 }}>
                    <input
                      type="checkbox"
                      checked={selected.size === list.length && list.length > 0}
                      onChange={toggleAll}
                      aria-label="Tümünü seç"
                    />
                  </th>
                  <th>ID</th>
                  <th>Kaynak</th>
                  <th>Durum</th>
                  <th>Başlangıç</th>
                  <th>Süre</th>
                  <th style={{ textAlign: "right" }}>Bulunan</th>
                  <th>Hata özeti</th>
                </tr>
              </thead>
              <tbody>
                {list.map((s, idx) => {
                  const info = statusInfo(s.status);
                  const isSel = selected.has(s.id);
                  const dur = durationSec(s.started_at, s.finished_at);
                  return (
                    <tr
                      key={s.id}
                      onDoubleClick={() => setDrawerIdx(idx)}
                      style={isSel ? { background: "var(--bg-inset)" } : undefined}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSel}
                          onChange={() => toggleRow(s.id)}
                          aria-label={`${shortId(s.id)} seç`}
                        />
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--accent-primary-hover)",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setDrawerIdx(idx)}
                          style={{
                            background: "none",
                            border: "none",
                            padding: 0,
                            color: "inherit",
                            font: "inherit",
                            cursor: "pointer",
                          }}
                        >
                          {shortId(s.id)}
                        </button>
                      </td>
                      <td style={{ fontWeight: 500 }}>{sourceLabel(s)}</td>
                      <td>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            fontFamily: "var(--font-mono)",
                            fontSize: 11,
                          }}
                        >
                          <span
                            style={{
                              width: 7,
                              height: 7,
                              borderRadius: "50%",
                              background: info.color,
                              boxShadow: `0 0 6px ${info.color}`,
                            }}
                          />
                          {info.label}
                        </span>
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--text-muted)",
                        }}
                      >
                        {timeAgo(s.started_at ?? s.created_at)}
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--text-muted)",
                        }}
                      >
                        {fmtDuration(dur)}
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          textAlign: "right",
                        }}
                      >
                        {articlesOf(s)}
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: s.error_summary
                            ? "var(--state-danger-fg)"
                            : "var(--text-muted)",
                          maxWidth: 280,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={s.error_summary ?? ""}
                      >
                        {shortError(s.error_summary)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <aside className="aurora-inspector-slot">{inspector}</aside>
      <AuroraDetailDrawer
        item={drawerIdx !== null ? buildDrawer(drawerIdx) : null}
        onClose={() => setDrawerIdx(null)}
      />
    </div>
  );
}
