import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useContentLibrary } from "../../hooks/useContentLibrary";
import {
  cloneStandardVideo,
  cloneNewsBulletin,
  ContentLibraryItem,
} from "../../api/contentLibraryApi";

const SUBTITLE: React.CSSProperties = {
  margin: "0 0 0.5rem",
  fontSize: "0.8125rem",
  color: "#94a3b8",
  lineHeight: 1.5,
  maxWidth: "640px",
};

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

const FILTER_INPUT: React.CSSProperties = {
  padding: "0.4rem 0.5rem",
  border: "1px solid #e2e8f0",
  borderRadius: "4px",
  fontSize: "0.8125rem",
  background: "#fff",
};

const FILTER_SELECT: React.CSSProperties = {
  padding: "0.4rem 0.5rem",
  border: "1px solid #e2e8f0",
  borderRadius: "4px",
  fontSize: "0.8125rem",
  background: "#fff",
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

const STATUS_BADGE: React.CSSProperties = {
  display: "inline-block",
  padding: "0.125rem 0.5rem",
  borderRadius: "9999px",
  fontSize: "0.6875rem",
  fontWeight: 600,
};

function statusColor(status: string) {
  switch (status) {
    case "ready":
      return { background: "#dcfce7", color: "#166534" };
    case "draft":
      return { background: "#f1f5f9", color: "#475569" };
    case "failed":
      return { background: "#fef2f2", color: "#991b1b" };
    default:
      return { background: "#fef9c3", color: "#854d0e" };
  }
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "\u2014";
  }
}

const PAGE_SIZE = 50;

export function ContentLibraryPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | "standard_video" | "news_bulletin">("");
  const [statusFilter, setStatusFilter] = useState("");
  const [offset, setOffset] = useState(0);

  // Clone state
  const [cloningId, setCloningId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showFeedback = useCallback((type: "success" | "error", message: string) => {
    setActionFeedback({ type, message });
    setTimeout(() => setActionFeedback(null), 4000);
  }, []);

  // Unified backend endpoint
  const { data, isLoading, isError } = useContentLibrary({
    content_type: typeFilter || undefined,
    status: statusFilter || undefined,
    search: searchQuery || undefined,
    limit: PAGE_SIZE,
    offset,
  });

  const total = data?.total ?? 0;
  const items = data?.items ?? [];
  const hasNext = offset + PAGE_SIZE < total;
  const hasPrev = offset > 0;

  const hasActiveFilters = !!(searchQuery || typeFilter || statusFilter);

  const handleClearFilters = () => {
    setSearchQuery("");
    setTypeFilter("");
    setStatusFilter("");
    setOffset(0);
  };

  const handleClone = useCallback(async (item: ContentLibraryItem) => {
    if (!window.confirm(`"${item.title || item.topic}" kaydini klonlamak istiyor musunuz? Yeni bir draft kopya olusturulacak.`)) {
      return;
    }
    setCloningId(item.id);
    try {
      let cloneResult: { id: string };
      if (item.content_type === "standard_video") {
        cloneResult = await cloneStandardVideo(item.id) as { id: string };
      } else {
        cloneResult = await cloneNewsBulletin(item.id) as { id: string };
      }
      queryClient.invalidateQueries({ queryKey: ["content-library"] });
      showFeedback("success", `"${item.title || item.topic}" basariyla klonlandi. Yeni kayda yonlendiriliyorsunuz...`);
      // M22-E: Clone sonrası navigasyon
      setTimeout(() => {
        if (item.content_type === "standard_video") {
          navigate(`/admin/standard-videos/${cloneResult.id}`);
        } else {
          navigate("/admin/news-bulletins", { state: { selectedId: cloneResult.id } });
        }
      }, 800);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Klonlama basarisiz oldu.";
      showFeedback("error", msg);
    } finally {
      setCloningId(null);
    }
  }, [queryClient, showFeedback, navigate]);

  function detailLink(item: ContentLibraryItem): { path: string; state?: unknown } {
    if (item.content_type === "standard_video") {
      return { path: `/admin/standard-videos/${item.id}` };
    }
    return { path: `/admin/news-bulletins`, state: { selectedId: item.id } };
  }

  function typeLabel(ct: string): string {
    return ct === "standard_video" ? "Standart Video" : "Haber Bulteni";
  }

  return (
    <div>
      <h2
        style={{ margin: "0 0 0.25rem", fontSize: "1.125rem", fontWeight: 600 }}
        data-testid="library-heading"
      >
        Icerik Kutuphanesi
      </h2>
      <p style={SUBTITLE} data-testid="library-subtitle">
        Tum icerik kayitlarinizi tek bir yuzeyden gorebilir ve yonetebilirsiniz.
        Standart videolar ve haber bultenleri birlesik olarak listelenir.
      </p>
      <p
        style={{
          margin: "0 0 1.5rem",
          fontSize: "0.8125rem",
          color: "#94a3b8",
          lineHeight: 1.5,
          maxWidth: "640px",
        }}
        data-testid="library-workflow-note"
      >
        Icerik yonetim zinciri: Olusturma → Uretim → Detay Yonetimi → Yayin.
        Listeden bir icerigi secerek detayina gidebilir, durumunu gorebilir
        ve yonetim aksiyonlarini baslatabilirsiniz.
      </p>

      {/* Action feedback */}
      {actionFeedback && (
        <div
          data-testid="library-action-feedback"
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

      {/* Filter/Sort/Search */}
      <div style={SECTION} data-testid="library-filter-area">
        <h3 style={{ margin: "0 0 0.25rem", fontSize: "1rem" }} data-testid="library-filter-heading">
          Filtre ve Arama
        </h3>
        <p
          style={{ margin: "0 0 0.75rem", fontSize: "0.75rem", color: "#94a3b8" }}
          data-testid="library-filter-note"
        >
          Icerik kayitlarini tur, durum veya metin aramasiyla filtreleyebilirsiniz.
          Filtreler backend tarafinda uygulanir.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: hasActiveFilters ? "0.5rem" : 0 }} data-testid="library-filters-active">
          <input
            type="text"
            placeholder="Baslik/konu ara..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setOffset(0);
            }}
            style={{ ...FILTER_INPUT, minWidth: "180px" }}
            data-testid="library-search-input"
          />
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as typeof typeFilter);
              setOffset(0);
            }}
            style={FILTER_SELECT}
            data-testid="library-type-filter"
          >
            <option value="">Tum Turler</option>
            <option value="standard_video">Standart Video</option>
            <option value="news_bulletin">Haber Bulteni</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setOffset(0);
            }}
            style={FILTER_SELECT}
            data-testid="library-status-filter"
          >
            <option value="">Tum Durumlar</option>
            <option value="draft">draft</option>
            <option value="ready">ready</option>
            <option value="failed">failed</option>
            <option value="processing">processing</option>
          </select>
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              style={{
                padding: "0.4rem 0.75rem",
                border: "1px solid #e2e8f0",
                borderRadius: "4px",
                fontSize: "0.8125rem",
                background: "#fff",
                cursor: "pointer",
                color: "#64748b",
              }}
              data-testid="library-filter-clear"
            >
              Temizle
            </button>
          )}
        </div>
        {hasActiveFilters && (
          <p style={{ fontSize: "0.6875rem", color: "#94a3b8", margin: "0" }} data-testid="library-filter-summary">
            {total} kayit bulundu
          </p>
        )}
      </div>

      {/* Content List */}
      <div style={SECTION} data-testid="library-content-list">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
          <h3 style={{ margin: 0, fontSize: "1rem" }} data-testid="library-list-heading">
            Icerik Kayitlari
          </h3>
          <span style={{ fontSize: "0.75rem", color: "#64748b" }} data-testid="library-total-count">
            Toplam: {total}
          </span>
        </div>
        <p
          style={{ margin: "0 0 0.75rem", fontSize: "0.75rem", color: "#94a3b8" }}
          data-testid="library-list-note"
        >
          Tum icerik turlerini birlesik olarak goruntuler. Bir kayda tiklayarak
          detay sayfasina gidebilir veya klonlayabilirsiniz.
        </p>

        {isLoading && <p style={{ color: "#64748b" }} data-testid="library-loading">Yukleniyor...</p>}

        {isError && (
          <p style={{ color: "#dc2626", fontSize: "0.8125rem" }} data-testid="library-error">
            Icerik kayitlari yuklenirken hata olustu.
          </p>
        )}

        {!isLoading && !isError && items.length === 0 && (
          <p style={{ color: "#94a3b8", fontSize: "0.8125rem" }} data-testid="library-empty-state">
            {hasActiveFilters
              ? "Filtrelere uygun icerik kaydi bulunamadi."
              : "Henuz icerik kaydi bulunmuyor. Icerik olusturma ekranindan yeni bir icerik baslatabilirsiniz."}
          </p>
        )}

        {!isLoading && !isError && items.length > 0 && (
          <>
            <table style={TABLE} data-testid="library-table">
              <thead>
                <tr>
                  <th style={TH}>Baslik</th>
                  <th style={TH}>Tur</th>
                  <th style={TH}>Durum</th>
                  <th style={TH}>Icerik</th>
                  <th style={TH}>Olusturulma</th>
                  <th style={TH}>Aksiyonlar</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const link = detailLink(item);
                  return (
                    <tr key={`${item.content_type}-${item.id}`}>
                      <td style={TD}>{item.title || item.topic}</td>
                      <td style={TD}>{typeLabel(item.content_type)}</td>
                      <td style={TD}>
                        <span style={{ ...STATUS_BADGE, ...statusColor(item.status) }}>
                          {item.status}
                        </span>
                      </td>
                      <td style={TD}>
                        <div style={{ display: "flex", gap: "0.25rem" }}>
                          {item.has_script && (
                            <span style={{ fontSize: "0.625rem", padding: "0.0625rem 0.375rem", borderRadius: "9999px", background: "#dbeafe", color: "#1e40af", fontWeight: 600 }} data-testid={`library-has-script-${item.id}`}>
                              Script
                            </span>
                          )}
                          {item.has_metadata && (
                            <span style={{ fontSize: "0.625rem", padding: "0.0625rem 0.375rem", borderRadius: "9999px", background: "#dcfce7", color: "#166534", fontWeight: 600 }} data-testid={`library-has-metadata-${item.id}`}>
                              Meta
                            </span>
                          )}
                          {!item.has_script && !item.has_metadata && (
                            <span style={{ fontSize: "0.625rem", color: "#cbd5e1" }}>\u2014</span>
                          )}
                        </div>
                      </td>
                      <td style={TD}>{formatDate(item.created_at)}</td>
                      <td style={TD}>
                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                          <button
                            onClick={() => navigate(link.path, link.state ? { state: link.state } : undefined)}
                            style={{
                              color: "#3b82f6",
                              fontSize: "0.8125rem",
                              background: "none",
                              border: "none",
                              padding: 0,
                              cursor: "pointer",
                              textDecoration: "none",
                            }}
                            data-testid={`library-detail-${item.id}`}
                          >
                            Detay
                          </button>
                          <button
                            onClick={() => handleClone(item)}
                            disabled={cloningId === item.id}
                            style={{
                              ...BTN,
                              color: cloningId === item.id ? "#94a3b8" : "#7c3aed",
                              borderColor: cloningId === item.id ? "#e2e8f0" : "#ddd6fe",
                              cursor: cloningId === item.id ? "wait" : "pointer",
                            }}
                            data-testid={`library-clone-${item.id}`}
                          >
                            {cloningId === item.id ? "..." : "Klonla"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
              data-testid="library-pagination"
            >
              <span>
                {offset + 1}\u2013{Math.min(offset + PAGE_SIZE, total)} / {total}
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
                  data-testid="library-prev-page"
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
                  data-testid="library-next-page"
                >
                  Sonraki
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Reuse/Clone/Manage Actions Note */}
      <div style={SECTION} data-testid="library-actions-area">
        <h3 style={{ margin: "0 0 0.25rem", fontSize: "1rem" }} data-testid="library-actions-heading">
          Icerik Yonetim Aksiyonlari
        </h3>
        <p
          style={{ margin: "0 0 0.75rem", fontSize: "0.75rem", color: "#94a3b8" }}
          data-testid="library-actions-note"
        >
          Icerik kayitlari uzerinde duzenleme, yeniden kullanma ve klonlama
          aksiyonlari bu sayfadan veya detay sayfalarindan baslatilabilir.
        </p>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <div
            style={{
              padding: "0.5rem 0.75rem",
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "6px",
              fontSize: "0.75rem",
              color: "#475569",
            }}
            data-testid="action-edit"
          >
            <strong>Duzenleme:</strong> Detay sayfasinda kayit bilgilerini guncelleyin.
          </div>
          <div
            style={{
              padding: "0.5rem 0.75rem",
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "6px",
              fontSize: "0.75rem",
              color: "#475569",
            }}
            data-testid="action-reuse"
          >
            <strong>Yeniden Kullanma:</strong> Mevcut bir kaydin bilgilerini temel alarak yeni icerik olusturun.
          </div>
          <div
            style={{
              padding: "0.5rem 0.75rem",
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "6px",
              fontSize: "0.75rem",
              color: "#475569",
            }}
            data-testid="action-clone"
          >
            <strong>Klonlama:</strong> Listeden veya detaydan "Klonla" butonuyla bagimsiz bir draft kopya olusturun.
          </div>
        </div>
      </div>
    </div>
  );
}
