/**
 * AuroraSourceDetailPage — Aurora Dusk Cockpit / Kaynak Detayı (admin).
 *
 * Sol kolonda meta + URL'ler + notes; sağ Inspector'da scan istatistikleri,
 * bağlı/kullanılan haber sayıları ve oluşturma/güncelleme tarihleri.
 *
 * Veri kaynağı: useSourceDetail(id) — gerçek SourceResponse.
 * Mutations:
 *   - triggerSourceScan: üst-sağ "Şimdi tara" butonu
 *   - bulkDeleteSources([id]): "Sil" butonu (window.confirm ile)
 *   - updateSource: "Düzenle" butonu (inline edit modu — ayrı route YOK)
 *
 * Düzenleme akışı: kullanıcı zaten /admin/sources/:id'de olduğu için ayrı bir
 * /edit sayfasına navigate etmek (a) gereksiz route şişmesi yaratır, (b) eski
 * pass-3'te navigate-404'e neden olmuştu. Bunun yerine MetaRow'lar local
 * `editMode` true iken input'a dönüşür; "Kaydet" updateSource() çağırır,
 * "Vazgeç" buffer'ı sıfırlar. Server cache invalidation otomatik.
 *
 * Hiçbir legacy code degistirilmez; surface override sistemi tarafindan
 * `admin.sources.detail` slot'una baglanir (register.tsx — bu PR'da DOKUNULMAZ).
 */
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSourceDetail } from "../../hooks/useSourceDetail";
import {
  bulkDeleteSources,
  triggerSourceScan,
  updateSource,
  type SourceResponse,
  type SourceUpdatePayload,
} from "../../api/sourcesApi";
import { useToast } from "../../hooks/useToast";
import { formatDateTime } from "../../lib/formatDate";
import {
  AuroraButton,
  AuroraInspector,
  AuroraInspectorRow,
  AuroraInspectorSection,
  AuroraSection,
  AuroraConfirmDialog,
} from "./primitives";
import { Icon } from "./icons";

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

function typeChip(t: string | null | undefined): string {
  const lower = (t || "").toLowerCase();
  if (lower === "rss") return "RSS";
  if (lower === "api") return "API";
  if (lower === "scrape") return "Scrape";
  if (lower === "manual") return "Manuel";
  return t || "—";
}

function MetaRow({
  label,
  value,
  mono = false,
  editing = false,
  inputValue,
  onChange,
  type = "text",
  options,
  placeholder,
  multiline = false,
  readOnlyInEdit = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  editing?: boolean;
  inputValue?: string;
  onChange?: (v: string) => void;
  type?: "text" | "select";
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  multiline?: boolean;
  /** Edit modunda görünür ama disabled (örn. ID, tip) */
  readOnlyInEdit?: boolean;
}) {
  const showInput = editing && onChange && !readOnlyInEdit;
  const baseInputStyle: React.CSSProperties = {
    width: "100%",
    background: "var(--bg-inset)",
    border: "1px solid var(--border-default)",
    borderRadius: 4,
    color: "var(--text-default)",
    fontSize: 13,
    fontFamily: mono ? "var(--font-mono)" : "inherit",
    padding: "6px 8px",
    outline: "none",
  };
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "160px 1fr",
        gap: 12,
        padding: "8px 0",
        borderBottom: "1px dashed var(--border-subtle, var(--border-default))",
        alignItems: multiline ? "flex-start" : "center",
      }}
    >
      <span
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "var(--text-muted)",
          paddingTop: showInput ? 6 : 0,
        }}
      >
        {label}
      </span>
      {showInput ? (
        type === "select" && options ? (
          <select
            value={inputValue ?? ""}
            onChange={(e) => onChange?.(e.target.value)}
            style={baseInputStyle}
          >
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ) : multiline ? (
          <textarea
            value={inputValue ?? ""}
            onChange={(e) => onChange?.(e.target.value)}
            placeholder={placeholder}
            rows={4}
            style={{ ...baseInputStyle, resize: "vertical", minHeight: 80 }}
          />
        ) : (
          <input
            type="text"
            value={inputValue ?? ""}
            onChange={(e) => onChange?.(e.target.value)}
            placeholder={placeholder}
            style={baseInputStyle}
          />
        )
      ) : (
        <span
          style={{
            fontSize: 13,
            color: "var(--text-default)",
            fontFamily: mono ? "var(--font-mono)" : undefined,
            wordBreak: "break-all",
            whiteSpace: multiline ? "pre-wrap" : undefined,
            opacity: editing && readOnlyInEdit ? 0.6 : 1,
          }}
        >
          {value ?? "—"}
        </span>
      )}
    </div>
  );
}

export function AuroraSourceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: source, isLoading, isError, error } = useSourceDetail(id ?? null);

  const { mutate: scanNow, isPending: scanning } = useMutation({
    mutationFn: () => {
      if (!id) throw new Error("Kaynak ID bulunamadı");
      return triggerSourceScan(id);
    },
    // Pass-6: trigger-scan cevabini agrega et — toast'ta dürüst sayilar.
    onSuccess: (res) => {
      if (res.error_summary) {
        toast.error(
          `Tarama hata ile bitti: ${res.error_summary.slice(0, 80)}`,
        );
      } else {
        toast.success(
          `Tarama bitti: ${res.new_count} yeni · ${res.fetched_count} fetch · ${res.skipped_dedupe} dedupe`,
        );
      }
      queryClient.invalidateQueries({ queryKey: ["sources", id] });
      queryClient.invalidateQueries({ queryKey: ["sources"] });
      queryClient.invalidateQueries({ queryKey: ["source-scans"] });
      queryClient.invalidateQueries({ queryKey: ["news-items"] });
    },
    onError: (err: unknown) => {
      const detail = err instanceof Error ? err.message : "Tarama başlatılamadı";
      toast.error(`Tarama hatası: ${detail}`);
    },
  });

  const { mutate: deleteSelf, isPending: deleting } = useMutation({
    mutationFn: () => {
      if (!id) throw new Error("Kaynak ID bulunamadı");
      return bulkDeleteSources([id]);
    },
    onSuccess: () => {
      toast.success("Kaynak silindi");
      queryClient.invalidateQueries({ queryKey: ["sources"] });
      queryClient.invalidateQueries({ queryKey: ["news-items"] });
      queryClient.invalidateQueries({ queryKey: ["source-scans"] });
      navigate("/admin/sources");
    },
    onError: () => toast.error("Silme işlemi başarısız"),
  });

  // Inline edit state. Buffer source alanları string olarak; "Kaydet" sırasında
  // payload'a yalnızca değişen ve geçerli olanlar konur (PATCH semantics).
  const [editMode, setEditMode] = useState(false);
  // Destructive-intent confirm (replaces window.confirm).
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftStatus, setDraftStatus] = useState("");
  const [draftBaseUrl, setDraftBaseUrl] = useState("");
  const [draftFeedUrl, setDraftFeedUrl] = useState("");
  const [draftApiEndpoint, setDraftApiEndpoint] = useState("");
  const [draftTrustLevel, setDraftTrustLevel] = useState("");
  const [draftScanMode, setDraftScanMode] = useState("");
  const [draftLanguage, setDraftLanguage] = useState("");
  const [draftCategory, setDraftCategory] = useState("");
  const [draftNotes, setDraftNotes] = useState("");

  // Source yüklendiğinde veya edit modu kapatıldığında buffer'ı reset et.
  useEffect(() => {
    if (!source) return;
    setDraftName(source.name ?? "");
    setDraftStatus(source.status ?? "");
    setDraftBaseUrl(source.base_url ?? "");
    setDraftFeedUrl(source.feed_url ?? "");
    setDraftApiEndpoint(source.api_endpoint ?? "");
    setDraftTrustLevel(source.trust_level ?? "");
    setDraftScanMode(source.scan_mode ?? "");
    setDraftLanguage(source.language ?? "");
    setDraftCategory(source.category ?? "");
    setDraftNotes(source.notes ?? "");
  }, [source]);

  const { mutate: saveEdit, isPending: saving } = useMutation({
    mutationFn: () => {
      if (!id) throw new Error("Kaynak ID bulunamadı");
      if (!source) throw new Error("Kaynak yüklenmedi");
      // Sadece değişen alanları gönder (PATCH).
      const payload: SourceUpdatePayload = {};
      const trimOrNull = (v: string) => {
        const t = v.trim();
        return t.length === 0 ? undefined : t;
      };
      if (draftName.trim() && draftName !== source.name) payload.name = draftName.trim();
      if (draftStatus !== (source.status ?? "")) payload.status = draftStatus || undefined;
      if (draftBaseUrl !== (source.base_url ?? "")) payload.base_url = trimOrNull(draftBaseUrl);
      if (draftFeedUrl !== (source.feed_url ?? "")) payload.feed_url = trimOrNull(draftFeedUrl);
      if (draftApiEndpoint !== (source.api_endpoint ?? ""))
        payload.api_endpoint = trimOrNull(draftApiEndpoint);
      if (draftTrustLevel !== (source.trust_level ?? ""))
        payload.trust_level = trimOrNull(draftTrustLevel);
      if (draftScanMode !== (source.scan_mode ?? ""))
        payload.scan_mode = trimOrNull(draftScanMode);
      if (draftLanguage !== (source.language ?? ""))
        payload.language = trimOrNull(draftLanguage);
      if (draftCategory !== (source.category ?? ""))
        payload.category = trimOrNull(draftCategory);
      if (draftNotes !== (source.notes ?? "")) payload.notes = trimOrNull(draftNotes);
      if (Object.keys(payload).length === 0) {
        // Hiçbir şey değişmediyse server'a gitme — fail-fast yerine sessizce kapat.
        return Promise.resolve(source);
      }
      return updateSource(id, payload);
    },
    onSuccess: () => {
      toast.success("Kaynak güncellendi");
      queryClient.invalidateQueries({ queryKey: ["sources", id] });
      queryClient.invalidateQueries({ queryKey: ["sources"] });
      setEditMode(false);
    },
    onError: (err: unknown) => {
      const detail = err instanceof Error ? err.message : "Güncelleme başarısız";
      toast.error(`Güncelleme hatası: ${detail}`);
    },
  });

  function cancelEdit() {
    if (!source) return setEditMode(false);
    setDraftName(source.name ?? "");
    setDraftStatus(source.status ?? "");
    setDraftBaseUrl(source.base_url ?? "");
    setDraftFeedUrl(source.feed_url ?? "");
    setDraftApiEndpoint(source.api_endpoint ?? "");
    setDraftTrustLevel(source.trust_level ?? "");
    setDraftScanMode(source.scan_mode ?? "");
    setDraftLanguage(source.language ?? "");
    setDraftCategory(source.category ?? "");
    setDraftNotes(source.notes ?? "");
    setEditMode(false);
  }

  function handleDelete() {
    if (!source) return;
    setConfirmDelete(true);
  }

  if (isLoading) {
    return (
      <div className="aurora-dashboard">
        <div className="page">
          <div
            className="card card-pad"
            style={{ textAlign: "center", color: "var(--text-muted)" }}
          >
            Yükleniyor…
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="aurora-dashboard">
        <div className="page">
          <div
            className="card card-pad"
            style={{
              textAlign: "center",
              color: "var(--state-danger-fg)",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
            }}
          >
            Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
          </div>
        </div>
      </div>
    );
  }

  if (!source) {
    return (
      <div className="aurora-dashboard">
        <div className="page">
          <div
            className="card card-pad"
            style={{ textAlign: "center", color: "var(--text-muted)" }}
          >
            Kaynak bulunamadı.{" "}
            <AuroraButton
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin/sources")}
            >
              Listeye dön →
            </AuroraButton>
          </div>
        </div>
      </div>
    );
  }

  const health = deriveHealth(source);
  const tone = HEALTH_TONE[health];
  const canScan = (source.source_type || "").toLowerCase() === "rss";

  const inspector = (
    <AuroraInspector title={source.name}>
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
          label="ardışık hata"
          value={String(source.consecutive_failure_count ?? 0)}
        />
        <AuroraInspectorRow
          label="son tarama"
          value={source.last_scan_status ?? "—"}
        />
        <AuroraInspectorRow
          label="son tarama bitiş"
          value={formatDateTime(source.last_scan_finished_at)}
        />
      </AuroraInspectorSection>

      <AuroraInspectorSection title="İstatistikler">
        <AuroraInspectorRow
          label="toplam tarama"
          value={String(source.scan_count ?? 0)}
        />
        <AuroraInspectorRow
          label="bağlı haber"
          value={String(source.linked_news_count ?? 0)}
        />
        <AuroraInspectorRow
          label="kullanılan haber"
          value={String(source.used_news_count_from_source ?? 0)}
        />
      </AuroraInspectorSection>

      <AuroraInspectorSection title="Zaman damgaları">
        <AuroraInspectorRow
          label="oluşturulma"
          value={formatDateTime(source.created_at)}
        />
        <AuroraInspectorRow
          label="güncelleme"
          value={formatDateTime(source.updated_at)}
        />
      </AuroraInspectorSection>

      {source.last_scan_error && (
        <AuroraInspectorSection title="Son hata">
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--state-danger-fg)",
              wordBreak: "break-word",
            }}
          >
            {source.last_scan_error}
          </div>
        </AuroraInspectorSection>
      )}
    </AuroraInspector>
  );

  return (
    <div className="aurora-dashboard">
      <div className="page">
        <div className="page-head">
          <div>
            <nav
              className="breadcrumbs caption"
              aria-label="Konum"
              style={{ marginBottom: 4 }}
            >
              <button
                type="button"
                onClick={() => navigate("/admin/sources")}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  font: "inherit",
                }}
              >
                Kaynaklar
              </button>
              <span className="sep"> / </span>
              <span>{source.name}</span>
            </nav>
            <h1>{source.name}</h1>
            <div className="sub">
              {typeChip(source.source_type)} · {source.status} ·{" "}
              <span style={{ color: tone.color }}>{tone.label}</span>
            </div>
          </div>
          <div className="hstack" style={{ gap: 8 }}>
            {!editMode && (
              <AuroraButton
                variant="secondary"
                size="sm"
                onClick={() => scanNow()}
                disabled={scanning || !canScan}
                title={
                  !canScan
                    ? "Şu an yalnızca RSS kaynaklar taranabilir"
                    : undefined
                }
                iconLeft={<Icon name="refresh" size={11} />}
              >
                {scanning ? "Taranıyor…" : "Şimdi tara"}
              </AuroraButton>
            )}
            {editMode ? (
              <>
                <AuroraButton
                  variant="primary"
                  size="sm"
                  onClick={() => saveEdit()}
                  disabled={saving}
                  iconLeft={<Icon name="check" size={11} />}
                >
                  {saving ? "Kaydediliyor…" : "Kaydet"}
                </AuroraButton>
                <AuroraButton
                  variant="ghost"
                  size="sm"
                  onClick={cancelEdit}
                  disabled={saving}
                  iconLeft={<Icon name="x" size={11} />}
                >
                  Vazgeç
                </AuroraButton>
              </>
            ) : (
              <AuroraButton
                variant="secondary"
                size="sm"
                onClick={() => setEditMode(true)}
                iconLeft={<Icon name="edit" size={11} />}
              >
                Düzenle
              </AuroraButton>
            )}
            {!editMode && (
              <AuroraButton
                variant="danger"
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
                iconLeft={<Icon name="trash" size={11} />}
              >
                {deleting ? "Siliniyor…" : "Sil"}
              </AuroraButton>
            )}
          </div>
        </div>

        <AuroraSection title="Tanım">
          <div className="card card-pad">
            <MetaRow label="ID" value={source.id} mono editing={editMode} readOnlyInEdit />
            <MetaRow
              label="Ad"
              value={source.name}
              editing={editMode}
              inputValue={draftName}
              onChange={setDraftName}
              placeholder="Kaynak adı"
            />
            <MetaRow
              label="Tip"
              value={typeChip(source.source_type)}
              editing={editMode}
              readOnlyInEdit
            />
            <MetaRow
              label="Durum"
              value={source.status}
              editing={editMode}
              inputValue={draftStatus}
              onChange={setDraftStatus}
              type="select"
              options={[
                { value: "active", label: "active" },
                { value: "paused", label: "paused" },
                { value: "disabled", label: "disabled" },
              ]}
            />
            <MetaRow
              label="Güven seviyesi"
              value={source.trust_level ?? "—"}
              editing={editMode}
              inputValue={draftTrustLevel}
              onChange={setDraftTrustLevel}
              type="select"
              options={[
                { value: "", label: "—" },
                { value: "low", label: "low" },
                { value: "medium", label: "medium" },
                { value: "high", label: "high" },
              ]}
            />
            <MetaRow
              label="Tarama modu"
              value={source.scan_mode ?? "—"}
              editing={editMode}
              inputValue={draftScanMode}
              onChange={setDraftScanMode}
              type="select"
              options={[
                { value: "", label: "—" },
                { value: "manual", label: "manual" },
                { value: "auto", label: "auto" },
              ]}
            />
            <MetaRow
              label="Dil"
              value={source.language ?? "—"}
              editing={editMode}
              inputValue={draftLanguage}
              onChange={setDraftLanguage}
              placeholder="tr / en …"
            />
            <MetaRow
              label="Kategori"
              value={source.category ?? "—"}
              editing={editMode}
              inputValue={draftCategory}
              onChange={setDraftCategory}
              placeholder="news / blog …"
            />
          </div>
        </AuroraSection>

        <AuroraSection title="URL'ler">
          <div className="card card-pad">
            <MetaRow
              label="Base URL"
              value={source.base_url ?? "—"}
              mono
              editing={editMode}
              inputValue={draftBaseUrl}
              onChange={setDraftBaseUrl}
              placeholder="https://example.com"
            />
            <MetaRow
              label="Feed URL"
              value={source.feed_url ?? "—"}
              mono
              editing={editMode}
              inputValue={draftFeedUrl}
              onChange={setDraftFeedUrl}
              placeholder="https://example.com/rss.xml"
            />
            <MetaRow
              label="API endpoint"
              value={source.api_endpoint ?? "—"}
              mono
              editing={editMode}
              inputValue={draftApiEndpoint}
              onChange={setDraftApiEndpoint}
            />
          </div>
        </AuroraSection>

        {(source.notes || editMode) && (
          <AuroraSection title="Notlar">
            {editMode ? (
              <div className="card card-pad">
                <MetaRow
                  label="Notlar"
                  value={source.notes ?? "—"}
                  editing={editMode}
                  inputValue={draftNotes}
                  onChange={setDraftNotes}
                  multiline
                  placeholder="Operatör notları, lisans, abonelik bilgisi …"
                />
              </div>
            ) : (
              <div
                className="card card-pad"
                style={{
                  whiteSpace: "pre-wrap",
                  fontSize: 13,
                  color: "var(--text-default)",
                  lineHeight: 1.5,
                }}
              >
                {source.notes}
              </div>
            )}
          </AuroraSection>
        )}
      </div>
      <aside className="aurora-inspector-slot">{inspector}</aside>

      <AuroraConfirmDialog
        open={confirmDelete}
        title="Kaynak silinsin mi?"
        description={
          source
            ? `"${source.name}" kaynağı silinecek. Bu işlem geri alınamaz. Bağlı geçmiş haber kayıtları kalır ancak yeni tarama tetiklenemez.`
            : "Bu işlem geri alınamaz."
        }
        tone="danger"
        confirmLabel="Sil"
        cancelLabel="Vazgeç"
        busy={deleting}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          deleteSelf();
          setConfirmDelete(false);
        }}
        data-testid="aurora-source-detail-confirm-delete"
      />
    </div>
  );
}
