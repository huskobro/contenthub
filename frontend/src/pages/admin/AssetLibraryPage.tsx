import { useState, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAssetList } from "../../hooks/useAssetList";
import {
  refreshAssets,
  deleteAsset,
  revealAsset,
  uploadAsset,
  AssetItem,
  AssetRevealResponse,
} from "../../api/assetApi";

const SECTION: React.CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: "6px",
  background: "#fafbfc",
  padding: "1rem",
  marginBottom: "1.5rem",
};

const TABLE: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "0.8125rem",
};

const TH: React.CSSProperties = {
  textAlign: "left",
  padding: "0.5rem 0.75rem",
  borderBottom: "2px solid #e2e8f0",
  color: "#64748b",
  fontWeight: 600,
  fontSize: "0.75rem",
};

const TD: React.CSSProperties = {
  padding: "0.5rem 0.75rem",
  borderBottom: "1px solid #f1f5f9",
  color: "#334155",
};

const FILTER_SELECT: React.CSSProperties = {
  padding: "0.4rem 0.5rem",
  border: "1px solid #e2e8f0",
  borderRadius: "4px",
  fontSize: "0.8125rem",
  background: "#fff",
};

const FILTER_INPUT: React.CSSProperties = {
  padding: "0.4rem 0.5rem",
  border: "1px solid #e2e8f0",
  borderRadius: "4px",
  fontSize: "0.8125rem",
  background: "#fff",
};

const TYPE_BADGE: React.CSSProperties = {
  display: "inline-block",
  padding: "0.125rem 0.5rem",
  borderRadius: "9999px",
  fontSize: "0.6875rem",
  fontWeight: 600,
};

const BTN: React.CSSProperties = {
  padding: "0.25rem 0.5rem",
  border: "1px solid #e2e8f0",
  borderRadius: "4px",
  background: "#fff",
  cursor: "pointer",
  fontSize: "0.6875rem",
  color: "#475569",
};

const BTN_DANGER: React.CSSProperties = {
  ...BTN,
  color: "#dc2626",
  borderColor: "#fecaca",
};

const ASSET_TYPE_OPTIONS = [
  { value: "", label: "Tum Turler" },
  { value: "audio", label: "Ses" },
  { value: "video", label: "Video" },
  { value: "image", label: "Gorsel" },
  { value: "data", label: "Veri" },
  { value: "text", label: "Metin" },
  { value: "subtitle", label: "Altyazi" },
  { value: "document", label: "Dokuman" },
  { value: "other", label: "Diger" },
];

function typeColor(assetType: string): { background: string; color: string } {
  switch (assetType) {
    case "audio":
      return { background: "#dbeafe", color: "#1e40af" };
    case "video":
      return { background: "#ede9fe", color: "#5b21b6" };
    case "image":
      return { background: "#dcfce7", color: "#166534" };
    case "data":
      return { background: "#fef9c3", color: "#854d0e" };
    case "text":
      return { background: "#f1f5f9", color: "#475569" };
    case "subtitle":
      return { background: "#fce7f3", color: "#9d174d" };
    default:
      return { background: "#f1f5f9", color: "#475569" };
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "\u2014";
  try {
    return new Date(iso).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "\u2014";
  }
}

const PAGE_SIZE = 50;

export function AssetLibraryPage() {
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [offset, setOffset] = useState(0);

  // Operation states
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [revealData, setRevealData] = useState<AssetRevealResponse | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, isError } = useAssetList({
    asset_type: typeFilter || undefined,
    search: searchQuery || undefined,
    limit: PAGE_SIZE,
    offset,
  });

  const total = data?.total ?? 0;
  const items = data?.items ?? [];
  const hasNext = offset + PAGE_SIZE < total;
  const hasPrev = offset > 0;

  const showFeedback = useCallback((type: "success" | "error", message: string) => {
    setActionFeedback({ type, message });
    setTimeout(() => setActionFeedback(null), 4000);
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const result = await refreshAssets();
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      showFeedback("success", result.message);
    } catch (err) {
      showFeedback("error", "Yenileme basarisiz oldu.");
    } finally {
      setRefreshing(false);
    }
  }, [queryClient, showFeedback]);

  const handleDelete = useCallback(async (item: AssetItem) => {
    if (!window.confirm(`"${item.name}" dosyasini silmek istediginize emin misiniz? Bu islem geri alinamaz.`)) {
      return;
    }
    setDeletingId(item.id);
    try {
      const result = await deleteAsset(item.id);
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      showFeedback("success", result.message);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Silme basarisiz oldu.";
      showFeedback("error", msg);
    } finally {
      setDeletingId(null);
    }
  }, [queryClient, showFeedback]);

  const handleReveal = useCallback(async (item: AssetItem) => {
    try {
      const result = await revealAsset(item.id);
      setRevealData(result);
    } catch {
      showFeedback("error", "Konum bilgisi alinamadi.");
    }
  }, [showFeedback]);

  const handleUpload = useCallback(async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadAsset(file);
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      showFeedback("success", result.message || `"${result.name}" basariyla yuklendi.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Dosya yukleme basarisiz oldu.";
      showFeedback("error", msg);
    } finally {
      setUploading(false);
    }
  }, [queryClient, showFeedback]);

  return (
    <div>
      <h2
        data-testid="asset-library-heading"
        style={{ margin: "0 0 0.25rem", fontSize: "1.125rem", fontWeight: 600 }}
      >
        Varlik Kutuphanesi
      </h2>
      <p
        style={{
          margin: "0.25rem 0 1rem",
          fontSize: "0.8125rem",
          color: "#94a3b8",
          lineHeight: 1.5,
          maxWidth: "640px",
        }}
        data-testid="asset-library-subtitle"
      >
        Workspace dizinlerindeki artifact ve preview dosyalari otomatik olarak
        taranir ve listelenir. Veri kaynagi: disk taramasi. Dosyalari
        goruntuleyebilir, konum bilgisini alabilir veya silebilirsiniz.
      </p>

      {/* Action feedback */}
      {actionFeedback && (
        <div
          data-testid="asset-action-feedback"
          style={{
            padding: "0.5rem 0.75rem",
            marginBottom: "1rem",
            borderRadius: "6px",
            fontSize: "0.8125rem",
            background: actionFeedback.type === "success" ? "#dcfce7" : "#fef2f2",
            color: actionFeedback.type === "success" ? "#166534" : "#991b1b",
            border: `1px solid ${actionFeedback.type === "success" ? "#bbf7d0" : "#fecaca"}`,
          }}
        >
          {actionFeedback.message}
        </div>
      )}

      {/* Reveal modal */}
      {revealData && (
        <div
          data-testid="asset-reveal-panel"
          style={{
            ...SECTION,
            background: "#eff6ff",
            borderColor: "#bfdbfe",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <h3 style={{ margin: 0, fontSize: "0.875rem", fontWeight: 600 }}>Konum Bilgisi</h3>
            <button
              onClick={() => setRevealData(null)}
              style={BTN}
              data-testid="asset-reveal-close"
            >
              Kapat
            </button>
          </div>
          <div style={{ fontSize: "0.75rem", color: "#334155" }}>
            <p style={{ margin: "0.25rem 0" }}>
              <strong>Dosya:</strong>{" "}
              <code style={{ background: "#e0f2fe", padding: "0.125rem 0.25rem", borderRadius: "3px" }}>
                {revealData.absolute_path}
              </code>
            </p>
            <p style={{ margin: "0.25rem 0" }}>
              <strong>Dizin:</strong>{" "}
              <code style={{ background: "#e0f2fe", padding: "0.125rem 0.25rem", borderRadius: "3px" }}>
                {revealData.directory}
              </code>
            </p>
            <p style={{ margin: "0.25rem 0" }}>
              <strong>Durum:</strong> {revealData.exists ? "Mevcut" : "Bulunamadi"}
            </p>
          </div>
        </div>
      )}

      {/* Upload area */}
      <div style={SECTION} data-testid="asset-upload-area">
        <h3 style={{ margin: "0 0 0.5rem", fontSize: "1rem" }} data-testid="asset-upload-heading">
          Dosya Yukle
        </h3>
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.75rem", color: "#94a3b8" }}>
          Workspace&apos;e yeni bir dosya yukleyin. Maks. 100 MB. Calistirilabilir dosyalar engellenir.
        </p>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <input
            type="file"
            ref={fileInputRef}
            style={{ fontSize: "0.8125rem" }}
            data-testid="asset-upload-input"
            disabled={uploading}
          />
          <button
            onClick={handleUpload}
            disabled={uploading}
            style={{
              ...BTN,
              fontWeight: 600,
              color: uploading ? "#94a3b8" : "#2563eb",
              borderColor: uploading ? "#e2e8f0" : "#bfdbfe",
              cursor: uploading ? "wait" : "pointer",
            }}
            data-testid="asset-upload-btn"
          >
            {uploading ? "Yukleniyor..." : "Yukle"}
          </button>
        </div>
      </div>

      {/* Filter area */}
      <div style={SECTION} data-testid="asset-filter-area">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
          <h3 style={{ margin: 0, fontSize: "1rem" }} data-testid="asset-filter-heading">
            Filtre ve Arama
          </h3>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              ...BTN,
              fontWeight: 600,
              color: refreshing ? "#94a3b8" : "#2563eb",
              borderColor: refreshing ? "#e2e8f0" : "#bfdbfe",
              cursor: refreshing ? "wait" : "pointer",
            }}
            data-testid="asset-refresh-btn"
          >
            {refreshing ? "Taraniyor..." : "Yenile"}
          </button>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }} data-testid="asset-filters-active">
          <input
            type="text"
            placeholder="Dosya adi ara..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setOffset(0);
            }}
            style={{ ...FILTER_INPUT, minWidth: "180px" }}
            data-testid="asset-search-input"
          />
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setOffset(0);
            }}
            style={FILTER_SELECT}
            data-testid="asset-type-filter"
          >
            {ASSET_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {(searchQuery || typeFilter) && (
            <button
              onClick={() => {
                setSearchQuery("");
                setTypeFilter("");
                setOffset(0);
              }}
              style={BTN}
              data-testid="asset-filter-clear"
            >
              Temizle
            </button>
          )}
        </div>
      </div>

      {/* Loading / Error / Empty / Data */}
      {isLoading && (
        <p style={{ color: "#64748b", fontSize: "0.8125rem" }} data-testid="asset-loading">
          Yukleniyor...
        </p>
      )}

      {isError && (
        <p style={{ color: "#dc2626", fontSize: "0.8125rem" }} data-testid="asset-error">
          Varliklar yuklenirken hata olustu.
        </p>
      )}

      {!isLoading && !isError && (
        <div style={SECTION} data-testid="asset-list-section">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <h3 style={{ margin: 0, fontSize: "1rem" }} data-testid="asset-list-heading">
              Varlik Listesi
            </h3>
            <span style={{ fontSize: "0.75rem", color: "#64748b" }} data-testid="asset-total-count">
              Toplam: {total}
            </span>
          </div>

          {items.length === 0 ? (
            <div data-testid="asset-library-empty-state" style={{ textAlign: "center", padding: "2rem 1rem" }}>
              <p style={{ fontSize: "0.875rem", color: "#475569", margin: "0 0 0.5rem" }}>
                {total === 0 && !searchQuery && !typeFilter
                  ? "Workspace dizinlerinde henuz artifact veya preview dosyasi bulunmuyor."
                  : "Filtrelere uygun varlik bulunamadi."}
              </p>
            </div>
          ) : (
            <>
              <table style={TABLE} data-testid="asset-table">
                <thead>
                  <tr>
                    <th style={TH}>Dosya Adi</th>
                    <th style={TH}>Tur</th>
                    <th style={TH}>Kaynak</th>
                    <th style={TH}>Boyut</th>
                    <th style={TH}>Modul</th>
                    <th style={TH}>Tarih</th>
                    <th style={TH}>Aksiyonlar</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td style={TD}>
                        <span style={{ fontWeight: 500 }}>{item.name}</span>
                        <span style={{ fontSize: "0.6875rem", color: "#94a3b8", marginLeft: "0.5rem" }}>
                          .{item.mime_ext}
                        </span>
                      </td>
                      <td style={TD}>
                        <span style={{ ...TYPE_BADGE, ...typeColor(item.asset_type) }}>
                          {item.asset_type}
                        </span>
                      </td>
                      <td style={TD}>
                        <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                          {item.source_kind === "job_artifact" ? "Artifact" : "Preview"}
                        </span>
                      </td>
                      <td style={TD}>{formatBytes(item.size_bytes)}</td>
                      <td style={TD}>
                        <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                          {item.module_type || "\u2014"}
                        </span>
                      </td>
                      <td style={TD}>{formatDate(item.discovered_at)}</td>
                      <td style={TD}>
                        <div style={{ display: "flex", gap: "0.25rem" }} data-testid={`asset-actions-${item.id}`}>
                          <button
                            onClick={() => handleReveal(item)}
                            style={BTN}
                            title="Konum bilgisi"
                            data-testid={`asset-reveal-${item.id}`}
                          >
                            Konum
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            disabled={deletingId === item.id}
                            style={{
                              ...BTN_DANGER,
                              opacity: deletingId === item.id ? 0.5 : 1,
                              cursor: deletingId === item.id ? "wait" : "pointer",
                            }}
                            title="Sil"
                            data-testid={`asset-delete-${item.id}`}
                          >
                            {deletingId === item.id ? "..." : "Sil"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "0.75rem",
                  fontSize: "0.75rem",
                  color: "#64748b",
                }}
                data-testid="asset-pagination"
              >
                <span>
                  {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} / {total}
                </span>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    disabled={!hasPrev}
                    onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                    style={{
                      ...BTN,
                      cursor: hasPrev ? "pointer" : "not-allowed",
                      opacity: hasPrev ? 1 : 0.4,
                    }}
                    data-testid="asset-prev-page"
                  >
                    Onceki
                  </button>
                  <button
                    disabled={!hasNext}
                    onClick={() => setOffset(offset + PAGE_SIZE)}
                    style={{
                      ...BTN,
                      cursor: hasNext ? "pointer" : "not-allowed",
                      opacity: hasNext ? 1 : 0.4,
                    }}
                    data-testid="asset-next-page"
                  >
                    Sonraki
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
