import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useStandardVideosList } from "../../hooks/useStandardVideosList";
import { useNewsBulletinsList } from "../../hooks/useNewsBulletinsList";

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

const FILTER_ROW: React.CSSProperties = {
  display: "flex",
  gap: "0.75rem",
  flexWrap: "wrap",
  marginBottom: "1rem",
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

interface ContentRow {
  id: string;
  type: "standard_video" | "news_bulletin";
  typeLabel: string;
  title: string;
  status: string;
  createdAt: string;
  detailLink: string;
  detailState?: unknown;
}

export function ContentLibraryPage() {
  const navigate = useNavigate();

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | "standard_video" | "news_bulletin">("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data: videos, isLoading: vLoading } = useStandardVideosList();
  const { data: bulletins, isLoading: bLoading } = useNewsBulletinsList();

  const isLoading = vLoading || bLoading;

  const allRows: ContentRow[] = useMemo(() => {
    const rows: ContentRow[] = [];

    if (videos) {
      for (const v of videos) {
        rows.push({
          id: v.id,
          type: "standard_video",
          typeLabel: "Standart Video",
          title: v.title || v.topic || v.id,
          status: v.status ?? "draft",
          createdAt: v.created_at,
          detailLink: `/admin/standard-videos/${v.id}`,
        });
      }
    }

    if (bulletins) {
      for (const b of bulletins) {
        rows.push({
          id: b.id,
          type: "news_bulletin",
          typeLabel: "Haber Bulteni",
          title: b.title || b.topic || b.id,
          status: b.status ?? "draft",
          createdAt: b.created_at,
          detailLink: `/admin/news-bulletins`,
          detailState: { selectedId: b.id },
        });
      }
    }

    rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return rows;
  }, [videos, bulletins]);

  // Apply client-side filters
  const filteredRows = useMemo(() => {
    let result = allRows;

    if (typeFilter) {
      result = result.filter((r) => r.type === typeFilter);
    }

    if (statusFilter) {
      result = result.filter((r) => r.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((r) => r.title.toLowerCase().includes(q));
    }

    return result;
  }, [allRows, typeFilter, statusFilter, searchQuery]);

  // Collect unique statuses for filter dropdown
  const availableStatuses = useMemo(() => {
    const set = new Set(allRows.map((r) => r.status));
    return Array.from(set).sort();
  }, [allRows]);

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

      {/* Filter/Sort/Search — M18-C aktif */}
      <div style={SECTION} data-testid="library-filter-area">
        <h3 style={{ margin: "0 0 0.25rem", fontSize: "1rem" }} data-testid="library-filter-heading">
          Filtre ve Arama
        </h3>
        <p
          style={{ margin: "0 0 0.75rem", fontSize: "0.75rem", color: "#94a3b8" }}
          data-testid="library-filter-note"
        >
          Icerik kayitlarini tur, durum veya metin aramasiyla filtreleyebilirsiniz.
          Filtreler asagidaki listeyi etkiler.
        </p>
        <div style={FILTER_ROW} data-testid="library-filters-active">
          <input
            type="text"
            placeholder="Baslik ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ ...FILTER_INPUT, minWidth: "180px" }}
            data-testid="library-search-input"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
            style={FILTER_SELECT}
            data-testid="library-type-filter"
          >
            <option value="">Tum Turler</option>
            <option value="standard_video">Standart Video</option>
            <option value="news_bulletin">Haber Bulteni</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={FILTER_SELECT}
            data-testid="library-status-filter"
          >
            <option value="">Tum Durumlar</option>
            {availableStatuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {(searchQuery || typeFilter || statusFilter) && (
            <button
              onClick={() => {
                setSearchQuery("");
                setTypeFilter("");
                setStatusFilter("");
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
              data-testid="library-filter-clear"
            >
              Temizle
            </button>
          )}
        </div>
        {(searchQuery || typeFilter || statusFilter) && (
          <p style={{ fontSize: "0.6875rem", color: "#94a3b8", margin: "0" }} data-testid="library-filter-summary">
            {filteredRows.length} / {allRows.length} kayit gosteriliyor
          </p>
        )}
      </div>

      {/* Content List */}
      <div style={SECTION} data-testid="library-content-list">
        <h3 style={{ margin: "0 0 0.25rem", fontSize: "1rem" }} data-testid="library-list-heading">
          Icerik Kayitlari
        </h3>
        <p
          style={{ margin: "0 0 0.75rem", fontSize: "0.75rem", color: "#94a3b8" }}
          data-testid="library-list-note"
        >
          Tum icerik turlerini birlesik olarak goruntuler. Bir kayda tiklayarak
          detay sayfasina gidebilirsiniz.
        </p>

        {isLoading && <p style={{ color: "#64748b" }}>Yukleniyor...</p>}

        {!isLoading && filteredRows.length === 0 && (
          <p style={{ color: "#94a3b8", fontSize: "0.8125rem" }} data-testid="library-empty-state">
            {allRows.length === 0
              ? "Henuz icerik kaydi bulunmuyor. Icerik olusturma ekranindan yeni bir icerik baslatabilirsiniz."
              : "Filtrelere uygun icerik kaydi bulunamadi."}
          </p>
        )}

        {!isLoading && filteredRows.length > 0 && (
          <table style={TABLE} data-testid="library-table">
            <thead>
              <tr>
                <th style={TH}>Baslik</th>
                <th style={TH}>Tur</th>
                <th style={TH}>Durum</th>
                <th style={TH}>Olusturulma</th>
                <th style={TH}>Aksiyon</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={`${row.type}-${row.id}`}>
                  <td style={TD}>{row.title}</td>
                  <td style={TD}>{row.typeLabel}</td>
                  <td style={TD}>
                    <span style={{ ...STATUS_BADGE, ...statusColor(row.status) }}>
                      {row.status}
                    </span>
                  </td>
                  <td style={TD}>{formatDate(row.createdAt)}</td>
                  <td style={TD}>
                    <button
                      onClick={() => navigate(row.detailLink, row.detailState ? { state: row.detailState } : undefined)}
                      style={{
                        color: "#3b82f6",
                        fontSize: "0.8125rem",
                        background: "none",
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                        textDecoration: "none",
                      }}
                    >
                      Detay Goruntule →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
          aksiyonlari detay sayfalarindan baslatilabilir. Bir kaydin detayina
          giderek mevcut yonetim aksiyonlarini kullanabilirsiniz.
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
            <strong>Klonlama:</strong> Ilerideki fazlarda klonlama aksiyonu eklenecektir.
          </div>
        </div>
      </div>
    </div>
  );
}
