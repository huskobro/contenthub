/**
 * AuroraAssetLibraryPage — Aurora Dusk Cockpit / Varlık Kütüphanesi (admin).
 *
 * Aurora-native port of `src/pages/admin/AssetLibraryPage.tsx`.
 *
 * Tasarım hedefi:
 *   - Page-head: başlık + alt başlık + "Yenile" / "Yükle" aksiyonları
 *   - Filter chips: asset type filtresi (tüm türler / audio / video / image / data ...)
 *   - Lokal arama kutusu (dosya adı üzerinde)
 *   - reg-tbl: ID / Ad / Tür / Kaynak / Boyut / Modül / Tarih kolonları
 *   - Inspector: toplam asset, type dağılımı, son yüklenenler
 *
 * Veri kaynağı:
 *   - useAssetList() — gerçek AssetItem[]
 *
 * Mutations:
 *   - refreshAssets / deleteAsset / revealAsset / uploadAsset
 *
 * Surface override sistemi tarafından `admin.assets.library` slot'una
 * kayıtlıdır (register.tsx wiring sonradan eklenecek). Legacy AssetLibraryPage
 * trampolini bu bileşeni override geldiğinde render eder.
 *
 * Top-level admin sayfası olduğundan breadcrumb taşımaz.
 */
import { useCallback, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAssetList } from "../../hooks/useAssetList";
import {
  refreshAssets,
  deleteAsset,
  revealAsset,
  uploadAsset,
  type AssetItem,
  type AssetRevealResponse,
} from "../../api/assetApi";
import { useToast } from "../../hooks/useToast";
import {
  AuroraButton,
  AuroraInspector,
  AuroraInspectorSection,
  AuroraInspectorRow,
  AuroraConfirmDialog,
} from "./primitives";
import { Icon } from "./icons";

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const PAGE_SIZE = 50;

interface TypeFilterOption {
  value: string;
  label: string;
}

const TYPE_FILTERS: TypeFilterOption[] = [
  { value: "", label: "Tümü" },
  { value: "audio", label: "Ses" },
  { value: "video", label: "Video" },
  { value: "image", label: "Görsel" },
  { value: "data", label: "Veri" },
  { value: "text", label: "Metin" },
  { value: "subtitle", label: "Altyazı" },
  { value: "document", label: "Doküman" },
  { value: "other", label: "Diğer" },
];

type TypeKey =
  | "audio"
  | "video"
  | "image"
  | "data"
  | "text"
  | "subtitle"
  | "document"
  | "other";

const TYPE_TONE: Record<TypeKey, { color: string; label: string }> = {
  audio: { color: "var(--state-info-fg)", label: "audio" },
  video: { color: "var(--accent-primary-hover)", label: "video" },
  image: { color: "var(--state-success-fg)", label: "image" },
  data: { color: "var(--state-warning-fg)", label: "data" },
  text: { color: "var(--text-muted)", label: "text" },
  subtitle: { color: "var(--state-info-fg)", label: "subtitle" },
  document: { color: "var(--text-muted)", label: "document" },
  other: { color: "var(--text-muted)", label: "other" },
};

function normalizeType(t: string): TypeKey {
  const v = (t ?? "").toLowerCase();
  if (
    v === "audio" ||
    v === "video" ||
    v === "image" ||
    v === "data" ||
    v === "text" ||
    v === "subtitle" ||
    v === "document"
  ) {
    return v as TypeKey;
  }
  return "other";
}

function shortId(id: string): string {
  if (!id) return "—";
  return id.slice(0, 8).toUpperCase();
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "—";
  const sec = Math.max(1, Math.floor((Date.now() - t) / 1000));
  if (sec < 60) return `${sec}sn`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}dk`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}s`;
  const d = Math.floor(hr / 24);
  return `${d}g`;
}

function sourceLabel(kind: string): string {
  if (kind === "job_artifact") return "Artifact";
  if (kind === "preview") return "Preview";
  if (kind === "upload") return "Upload";
  return kind || "—";
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function AuroraAssetLibraryPage() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);

  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [revealData, setRevealData] = useState<AssetRevealResponse | null>(null);
  // Destructive-intent confirm (replaces window.confirm).
  const [pendingDelete, setPendingDelete] = useState<AssetItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, isError, error, refetch } = useAssetList({
    asset_type: typeFilter || undefined,
    search: search || undefined,
    limit: PAGE_SIZE,
    offset,
  });

  const total = data?.total ?? 0;
  const items = useMemo(() => data?.items ?? [], [data]);

  // ── Stats (current page; backend total ayrı) ────────────────────────────
  const typeCounts = useMemo(() => {
    const c: Record<TypeKey, number> = {
      audio: 0,
      video: 0,
      image: 0,
      data: 0,
      text: 0,
      subtitle: 0,
      document: 0,
      other: 0,
    };
    for (const it of items) c[normalizeType(it.asset_type)] += 1;
    return c;
  }, [items]);

  const recentlyAdded = useMemo(() => {
    return [...items]
      .sort((a, b) => {
        const at = a.discovered_at ? new Date(a.discovered_at).getTime() : 0;
        const bt = b.discovered_at ? new Date(b.discovered_at).getTime() : 0;
        return bt - at;
      })
      .slice(0, 5);
  }, [items]);

  // ── Mutations / actions ────────────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const result = await refreshAssets();
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      toast.success(result.message);
    } catch {
      toast.error("Yenileme başarısız oldu.");
    } finally {
      setRefreshing(false);
    }
  }, [queryClient, toast]);

  const handleUpload = useCallback(async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast.error("Lütfen önce bir dosya seçin.");
      return;
    }
    setUploading(true);
    try {
      const result = await uploadAsset(file);
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      toast.success(result.message || `"${result.name}" başarıyla yüklendi.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Dosya yükleme başarısız oldu.";
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  }, [queryClient, toast]);

  const handleDelete = useCallback((item: AssetItem) => {
    setPendingDelete(item);
  }, []);

  const confirmDelete = useCallback(async () => {
    const item = pendingDelete;
    if (!item) return;
    setDeletingId(item.id);
    try {
      const result = await deleteAsset(item.id);
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      toast.success(result.message);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Silme başarısız oldu.";
      toast.error(msg);
    } finally {
      setDeletingId(null);
      setPendingDelete(null);
    }
  }, [pendingDelete, queryClient, toast]);

  const handleReveal = useCallback(
    async (item: AssetItem) => {
      try {
        const result = await revealAsset(item.id);
        setRevealData(result);
      } catch {
        toast.error("Konum bilgisi alınamadı.");
      }
    },
    [toast],
  );

  const handleFilterClick = useCallback((value: string) => {
    setTypeFilter(value);
    setOffset(0);
  }, []);

  // ── Inspector ──────────────────────────────────────────────────────────
  const inspector = (
    <AuroraInspector title="Varlıklar">
      <AuroraInspectorSection title="Özet">
        <AuroraInspectorRow label="toplam (backend)" value={String(total)} />
        <AuroraInspectorRow label="bu sayfa" value={String(items.length)} />
        <AuroraInspectorRow
          label="filtre"
          value={typeFilter ? typeFilter : "—"}
        />
      </AuroraInspectorSection>

      <AuroraInspectorSection title="Tür dağılımı (sayfa)">
        <AuroraInspectorRow label="audio" value={String(typeCounts.audio)} />
        <AuroraInspectorRow label="video" value={String(typeCounts.video)} />
        <AuroraInspectorRow label="image" value={String(typeCounts.image)} />
        <AuroraInspectorRow label="data" value={String(typeCounts.data)} />
        <AuroraInspectorRow label="text" value={String(typeCounts.text)} />
        <AuroraInspectorRow label="subtitle" value={String(typeCounts.subtitle)} />
        <AuroraInspectorRow label="document" value={String(typeCounts.document)} />
        <AuroraInspectorRow label="diğer" value={String(typeCounts.other)} />
      </AuroraInspectorSection>

      {recentlyAdded.length > 0 && (
        <AuroraInspectorSection title="Son yüklenenler">
          {recentlyAdded.map((it) => (
            <AuroraInspectorRow
              key={it.id}
              label={it.name.length > 22 ? `${it.name.slice(0, 22)}…` : it.name}
              value={timeAgo(it.discovered_at) + " önce"}
            />
          ))}
        </AuroraInspectorSection>
      )}

      {revealData && (
        <AuroraInspectorSection title="Konum bilgisi">
          <AuroraInspectorRow
            label="dizin"
            value={
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  wordBreak: "break-all",
                }}
              >
                {revealData.directory}
              </span>
            }
          />
          <AuroraInspectorRow
            label="durum"
            value={revealData.exists ? "mevcut" : "bulunamadı"}
          />
          <div style={{ marginTop: 8 }}>
            <AuroraButton
              variant="ghost"
              size="sm"
              onClick={() => setRevealData(null)}
            >
              Kapat
            </AuroraButton>
          </div>
        </AuroraInspectorSection>
      )}
    </AuroraInspector>
  );

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="aurora-dashboard">
      <div className="page">
        <div className="page-head">
          <div>
            <h1>
              <Icon name="folder" size={14} /> Varlık Kütüphanesi
            </h1>
            <div className="sub">
              {total} varlık · workspace artifact ve preview dosyaları
            </div>
          </div>
          <div className="hstack" style={{ gap: 8 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 8px",
                background: "var(--bg-inset)",
                border: "1px solid var(--border-subtle)",
                borderRadius: 6,
              }}
            >
              <Icon name="search" size={11} />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setOffset(0);
                }}
                placeholder="Dosya adı ara…"
                aria-label="Varlık ara"
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "var(--text-primary)",
                  fontSize: 12,
                  fontFamily: "var(--font-mono)",
                  width: 160,
                }}
              />
            </div>
            <input
              type="file"
              ref={fileInputRef}
              disabled={uploading}
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono)",
              }}
            />
            <AuroraButton
              variant="secondary"
              size="sm"
              onClick={handleUpload}
              disabled={uploading}
              iconLeft={<Icon name="plus" size={11} />}
            >
              {uploading ? "Yükleniyor…" : "Yükle"}
            </AuroraButton>
            <AuroraButton
              variant="primary"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              iconLeft={<Icon name="refresh" size={11} />}
            >
              {refreshing ? "Taranıyor…" : "Yenile"}
            </AuroraButton>
          </div>
        </div>

        {/* Filter chips */}
        <div
          className="hstack"
          style={{ gap: 6, flexWrap: "wrap", marginBottom: 12 }}
        >
          {TYPE_FILTERS.map((opt) => {
            const active = typeFilter === opt.value;
            return (
              <button
                key={opt.value || "all"}
                type="button"
                className="chip"
                onClick={() => handleFilterClick(opt.value)}
                style={{
                  cursor: "pointer",
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                  background: active
                    ? "var(--accent-primary-muted)"
                    : "var(--bg-inset)",
                  color: active
                    ? "var(--accent-primary-hover)"
                    : "var(--text-muted)",
                  borderColor: active
                    ? "rgba(var(--accent-primary-rgb), 0.3)"
                    : "var(--border-subtle)",
                }}
              >
                {opt.label}
              </button>
            );
          })}
          {(search || typeFilter) && (
            <button
              type="button"
              className="chip"
              onClick={() => {
                setSearch("");
                setTypeFilter("");
                setOffset(0);
              }}
              style={{
                cursor: "pointer",
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                color: "var(--text-muted)",
              }}
            >
              <Icon name="x" size={10} /> Temizle
            </button>
          )}
        </div>

        {isLoading && (
          <div
            className="card card-pad"
            style={{ textAlign: "center", color: "var(--text-muted)" }}
          >
            Varlık kütüphanesi yükleniyor…
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
              Varlıklar yüklenemedi:{" "}
              {error instanceof Error ? error.message : "Bilinmeyen hata"}
            </span>
            <AuroraButton size="sm" onClick={() => refetch()}>
              Tekrar dene
            </AuroraButton>
          </div>
        )}

        {!isLoading && !isError && items.length === 0 && (
          <div
            className="card card-pad"
            style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}
          >
            {total === 0 && !search && !typeFilter
              ? "Workspace dizinlerinde henüz artifact veya preview dosyası bulunmuyor."
              : "Filtrelere uygun varlık bulunamadı."}
          </div>
        )}

        {!isLoading && !isError && items.length > 0 && (
          <div className="card" style={{ overflow: "auto" }}>
            <table className="reg-tbl">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Ad</th>
                  <th>Tür</th>
                  <th>Kaynak</th>
                  <th style={{ textAlign: "right" }}>Boyut</th>
                  <th>Modül</th>
                  <th>Eklendi</th>
                  <th style={{ textAlign: "right" }} aria-label="aksiyon" />
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const typeKey = normalizeType(it.asset_type);
                  const tone = TYPE_TONE[typeKey];
                  return (
                    <tr key={it.id}>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--accent-primary-hover)",
                        }}
                      >
                        {shortId(it.id)}
                      </td>
                      <td style={{ fontWeight: 500 }}>
                        <span>{it.name}</span>
                        {it.mime_ext && (
                          <span
                            style={{
                              marginLeft: 6,
                              fontFamily: "var(--font-mono)",
                              fontSize: 10,
                              color: "var(--text-muted)",
                            }}
                          >
                            .{it.mime_ext}
                          </span>
                        )}
                      </td>
                      <td>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            fontFamily: "var(--font-mono)",
                            fontSize: 11,
                            color: tone.color,
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: tone.color,
                              boxShadow: `0 0 5px ${tone.color}`,
                            }}
                          />
                          {tone.label}
                        </span>
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--text-muted)",
                        }}
                      >
                        {sourceLabel(it.source_kind)}
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          textAlign: "right",
                        }}
                      >
                        {formatBytes(it.size_bytes)}
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--text-muted)",
                        }}
                      >
                        {it.module_type || "—"}
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--text-muted)",
                        }}
                      >
                        {timeAgo(it.discovered_at)} önce
                      </td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <AuroraButton
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReveal(it)}
                          aria-label="Konumu göster"
                        >
                          <Icon name="folder" size={11} />
                        </AuroraButton>
                        <AuroraButton
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(it)}
                          disabled={deletingId === it.id}
                          aria-label="Sil"
                        >
                          <Icon name="trash" size={11} />
                        </AuroraButton>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!isLoading && !isError && total > PAGE_SIZE && (
          <div
            className="hstack"
            style={{
              gap: 8,
              marginTop: 12,
              justifyContent: "flex-end",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--text-muted)",
            }}
          >
            <span>
              {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} / {total}
            </span>
            <AuroraButton
              variant="ghost"
              size="sm"
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              disabled={offset === 0}
              iconLeft={<Icon name="chevron-left" size={11} />}
            >
              Önceki
            </AuroraButton>
            <AuroraButton
              variant="ghost"
              size="sm"
              onClick={() => setOffset(offset + PAGE_SIZE)}
              disabled={offset + PAGE_SIZE >= total}
              iconRight={<Icon name="chevron-right" size={11} />}
            >
              Sonraki
            </AuroraButton>
          </div>
        )}
      </div>
      <aside className="aurora-inspector-slot">{inspector}</aside>

      <AuroraConfirmDialog
        open={pendingDelete !== null}
        title="Varlık silinsin mi?"
        description={
          pendingDelete
            ? `"${pendingDelete.name}" varlığı kalıcı olarak silinecek. Dosya disk üzerinden de kaldırılır.`
            : "Bu işlem geri alınamaz."
        }
        tone="danger"
        confirmLabel="Sil"
        cancelLabel="Vazgeç"
        busy={deletingId !== null}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          void confirmDelete();
        }}
        data-testid="aurora-asset-library-confirm-delete"
      />
    </div>
  );
}
