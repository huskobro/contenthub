/**
 * AuroraSourceScanCreatePage — Aurora Dusk Cockpit / Manuel tarama başlat (admin).
 *
 * Direct port of `docs/aurora-design-source/project/contenthub/pages/admin/source-scan-create.html`.
 * Tasarım hedefi:
 *   - Page-head ("Manuel tarama başlat" + alt başlık + İptal aksiyonu)
 *   - Form kartı: Kaynak (dropdown — useSourcesList), Tarama modu (manual/auto/curated),
 *     Maksimum öğe (sayı), Notlar (textarea)
 *   - Inspector: seçili kaynağın özeti (son tarama + sağlık özeti)
 *   - Submit: useCreateSourceScan() → success toast → /admin/source-scans
 *
 * Legacy `SourceScanCreatePage` henüz `useSurfacePageOverride` trampoline'ine
 * sahip değil; bu sayfa register.tsx üzerinden bağlanacak — register.tsx
 * bu commit'te değiştirilmiyor (kullanıcı kuralı).
 */
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useSourcesList } from "../../hooks/useSourcesList";
import { useCreateSourceScan } from "../../hooks/useCreateSourceScan";
import type { SourceResponse } from "../../api/sourcesApi";
import type { SourceScanCreatePayload } from "../../api/sourceScansApi";
import { useToast } from "../../hooks/useToast";
import {
  AuroraButton,
  AuroraInspector,
  AuroraInspectorSection,
  AuroraInspectorRow,
  AuroraSegmented,
} from "./primitives";
import { Icon } from "./icons";

// ---------------------------------------------------------------------------
// Form types
// ---------------------------------------------------------------------------

type ScanMode = "manual" | "auto" | "curated";

interface FormState {
  source_id: string;
  scan_mode: ScanMode;
  max_items: string; // input is text-bound; parsed at submit
  notes: string;
}

const INITIAL: FormState = {
  source_id: "",
  scan_mode: "manual",
  max_items: "",
  notes: "",
};

// ---------------------------------------------------------------------------
// Health derivation (parite: AuroraSourcesRegistryPage)
// ---------------------------------------------------------------------------

type HealthLevel = "healthy" | "degraded" | "down" | "unknown";

const HEALTH_TONE: Record<HealthLevel, { color: string; label: string }> = {
  healthy: { color: "var(--state-success-fg)", label: "sağlıklı" },
  degraded: { color: "var(--state-warning-fg)", label: "bozuk" },
  down: { color: "var(--state-danger-fg)", label: "çevrimdışı" },
  unknown: { color: "var(--text-muted)", label: "—" },
};

function deriveHealth(s: SourceResponse): HealthLevel {
  if (s.status && s.status.toLowerCase() === "disabled") return "down";
  const fails = s.consecutive_failure_count ?? 0;
  const lastStatus = (s.last_scan_status ?? "").toLowerCase();
  if (fails >= 3 || lastStatus === "failed" || lastStatus === "error") return "down";
  if (fails > 0 || lastStatus === "partial" || lastStatus === "stale") return "degraded";
  if (lastStatus === "success" || lastStatus === "completed") return "healthy";
  if (s.scan_count && s.scan_count > 0) return "healthy";
  return "unknown";
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

function shortHost(s: SourceResponse): string {
  const url = s.feed_url ?? s.base_url ?? s.api_endpoint ?? "";
  if (!url) return "—";
  try {
    const u = new URL(url);
    return u.host + (u.pathname && u.pathname !== "/" ? u.pathname : "");
  } catch {
    return url.replace(/^https?:\/\//, "");
  }
}

// ---------------------------------------------------------------------------
// Shared field styles (mockup parite — Aurora form tokens)
// ---------------------------------------------------------------------------

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--text-muted)",
  display: "block",
  marginBottom: 5,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 34,
  padding: "0 12px",
  background: "var(--bg-surface)",
  border: "1px solid var(--border-default)",
  borderRadius: 8,
  color: "var(--text-primary)",
  fontSize: 13,
  fontFamily: "inherit",
  outline: "none",
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  background: "var(--bg-surface)",
  border: "1px solid var(--border-default)",
  borderRadius: 8,
  color: "var(--text-primary)",
  fontSize: 13,
  fontFamily: "inherit",
  outline: "none",
  resize: "vertical",
  minHeight: 80,
  lineHeight: 1.6,
};

const hintStyle: React.CSSProperties = {
  fontSize: 11,
  color: "var(--text-muted)",
  marginTop: 4,
  lineHeight: 1.5,
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function AuroraSourceScanCreatePage() {
  const navigate = useNavigate();
  const toast = useToast();

  const { data: sources, isLoading: loadingSources, isError: sourcesError } =
    useSourcesList();
  const list = sources ?? [];

  const { mutate: createScan, isPending, error } = useCreateSourceScan();

  const [form, setForm] = useState<FormState>(INITIAL);

  const selectedSource = useMemo<SourceResponse | null>(() => {
    if (!form.source_id) return null;
    return list.find((s) => s.id === form.source_id) ?? null;
  }, [form.source_id, list]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.source_id) {
      toast.error("Lütfen bir kaynak seçin");
      return;
    }
    const maxItems = form.max_items.trim();
    let resultCount: number | null = null;
    if (maxItems !== "") {
      const parsed = Number(maxItems);
      if (!Number.isFinite(parsed) || parsed < 0) {
        toast.error("Maksimum öğe geçerli bir sayı olmalı");
        return;
      }
      resultCount = Math.floor(parsed);
    }

    const payload: SourceScanCreatePayload = {
      source_id: form.source_id,
      scan_mode: form.scan_mode,
      result_count: resultCount,
      notes: form.notes.trim() ? form.notes.trim() : null,
    };

    createScan(payload, {
      onSuccess: (created) => {
        toast.success("Kaynak taraması oluşturuldu");
        navigate("/admin/source-scans", { state: { selectedId: created.id } });
      },
    });
  }

  // -------------------------------------------------------------------------
  // Inspector content
  // -------------------------------------------------------------------------

  let inspectorBody: React.ReactNode;
  if (!selectedSource) {
    inspectorBody = (
      <AuroraInspectorSection title="İpucu">
        <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.6 }}>
          Bir kaynak seçin; özet bilgileri burada görüntülenecek. Tüm zorunlu
          alanları doldurduktan sonra taramayı başlatabilirsiniz.
        </div>
      </AuroraInspectorSection>
    );
  } else {
    const health = deriveHealth(selectedSource);
    const tone = HEALTH_TONE[health];
    inspectorBody = (
      <>
        <AuroraInspectorSection title="Kaynak">
          <AuroraInspectorRow label="ad" value={selectedSource.name} />
          <AuroraInspectorRow
            label="tip"
            value={(selectedSource.source_type || "—").toUpperCase()}
          />
          <AuroraInspectorRow label="url" value={shortHost(selectedSource)} />
        </AuroraInspectorSection>
        <AuroraInspectorSection title="Sağlık">
          <AuroraInspectorRow
            label="durum"
            value={
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
                    background: tone.color,
                    boxShadow: `0 0 6px ${tone.color}`,
                  }}
                />
                {tone.label}
              </span>
            }
          />
          <AuroraInspectorRow
            label="son tarama"
            value={timeAgo(selectedSource.last_scan_finished_at)}
          />
          <AuroraInspectorRow
            label="toplam tarama"
            value={String(selectedSource.scan_count ?? 0)}
          />
          <AuroraInspectorRow
            label="ardışık hata"
            value={String(selectedSource.consecutive_failure_count ?? 0)}
          />
        </AuroraInspectorSection>
      </>
    );
  }

  const inspector = <AuroraInspector title="Yeni tarama">{inspectorBody}</AuroraInspector>;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const submitError =
    error instanceof Error ? error.message : error ? String(error) : null;

  return (
    <div className="aurora-dashboard">
      <div className="page" style={{ maxWidth: 640 }}>
        <div className="page-head">
          <div>
            <h1>Manuel tarama başlat</h1>
            <div className="sub">Yeni kayıt oluştur</div>
          </div>
          <div className="hstack" style={{ gap: 8 }}>
            <AuroraButton
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin/source-scans")}
            >
              İptal
            </AuroraButton>
          </div>
        </div>

        <div className="card card-pad">
          <form onSubmit={handleSubmit}>
            {/* Kaynak */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle} htmlFor="source-select">
                Kaynak
                <span style={{ color: "var(--state-danger-fg)", marginLeft: 4 }}>*</span>
              </label>
              <select
                id="source-select"
                style={inputStyle}
                value={form.source_id}
                onChange={(e) => update("source_id", e.target.value)}
                disabled={loadingSources || sourcesError}
                required
              >
                <option value="">
                  {loadingSources
                    ? "Kaynaklar yükleniyor…"
                    : sourcesError
                    ? "Kaynaklar yüklenemedi"
                    : list.length === 0
                    ? "Tanımlı kaynak yok"
                    : "Seçiniz…"}
                </option>
                {list.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {(s.source_type || "—").toUpperCase()}
                  </option>
                ))}
              </select>
              {sourcesError && (
                <div style={{ ...hintStyle, color: "var(--state-danger-fg)" }}>
                  Kaynaklar yüklenirken hata oluştu.
                </div>
              )}
            </div>

            {/* Tarama modu + Maksimum öğe (2 kolon) */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
              }}
            >
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle} htmlFor="scan-mode">
                  Tarama modu
                  <span style={{ color: "var(--state-danger-fg)", marginLeft: 4 }}>*</span>
                </label>
                <AuroraSegmented
                  options={[
                    { value: "manual", label: "manual", hint: "Anlık tek tarama" },
                    { value: "auto", label: "auto", hint: "Zamanlanabilir" },
                    { value: "curated", label: "curated", hint: "Editör eli" },
                  ]}
                  value={form.scan_mode}
                  onChange={(v) => update("scan_mode", v as ScanMode)}
                  data-testid="aurora-source-scan-mode"
                />
                <div style={hintStyle}>
                  Manuel: anlık tek tarama. Auto: zamanlanabilir. Curated: editör eli.
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle} htmlFor="max-items">
                  Maksimum öğe
                </label>
                <input
                  id="max-items"
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  placeholder="örn. 25"
                  style={inputStyle}
                  value={form.max_items}
                  onChange={(e) => update("max_items", e.target.value)}
                />
                <div style={hintStyle}>
                  Boş bırakırsanız kaynak limiti uygulanır.
                </div>
              </div>
            </div>

            {/* Notlar */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle} htmlFor="scan-notes">
                Notlar
              </label>
              <textarea
                id="scan-notes"
                placeholder="İsteğe bağlı operasyonel not (örn. acil eşik testi)"
                style={textareaStyle}
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
              />
            </div>

            {submitError && (
              <div
                style={{
                  marginTop: 12,
                  padding: 10,
                  background: "var(--state-danger-bg)",
                  border: "1px solid var(--state-danger-border)",
                  borderRadius: 8,
                  color: "var(--state-danger-fg)",
                  fontSize: 12,
                  fontFamily: "var(--font-mono)",
                }}
              >
                Hata: {submitError}
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                marginTop: 20,
                paddingTop: 16,
                borderTop: "1px solid var(--border-subtle)",
              }}
            >
              <AuroraButton
                variant="ghost"
                size="sm"
                onClick={() => navigate("/admin/source-scans")}
                disabled={isPending}
              >
                İptal
              </AuroraButton>
              <AuroraButton
                variant="primary"
                size="sm"
                type="submit"
                disabled={isPending || !form.source_id}
                iconLeft={<Icon name={isPending ? "refresh" : "plus"} size={11} />}
              >
                {isPending ? "Kaydediliyor…" : "Kaydet"}
              </AuroraButton>
            </div>
          </form>
        </div>
      </div>
      <aside className="aurora-inspector-slot">{inspector}</aside>
    </div>
  );
}
