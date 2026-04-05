import { useState } from "react";
import { useAssetList } from "../../hooks/useAssetList";

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
  const [typeFilter, setTypeFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [offset, setOffset] = useState(0);

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
        Uretim altyapisini destekleyen media ve tasarim varliklari. Workspace
        dizinlerindeki artifact ve preview dosyalari otomatik olarak taranir ve
        listelenir. Veri kaynagi: disk taramasi (salt-okunur).
      </p>

      {/* Filter area */}
      <div style={SECTION} data-testid="asset-filter-area">
        <h3 style={{ margin: "0 0 0.5rem", fontSize: "1rem" }} data-testid="asset-filter-heading">
          Filtre ve Arama
        </h3>
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
              style={{
                padding: "0.4rem 0.75rem",
                border: "1px solid #e2e8f0",
                borderRadius: "4px",
                fontSize: "0.8125rem",
                background: "#fff",
                cursor: "pointer",
                color: "#64748b",
              }}
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
                      padding: "0.25rem 0.5rem",
                      border: "1px solid #e2e8f0",
                      borderRadius: "4px",
                      background: "#fff",
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
                      padding: "0.25rem 0.5rem",
                      border: "1px solid #e2e8f0",
                      borderRadius: "4px",
                      background: "#fff",
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
