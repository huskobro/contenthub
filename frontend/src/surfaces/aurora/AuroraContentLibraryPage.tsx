/**
 * AuroraContentLibraryPage — Aurora Dusk Cockpit / İçerik Kütüphanesi (admin).
 *
 * `admin.library` slot'u için Aurora yüzeyi. Tüm modül turlerini birleşik
 * gösterir (standard_video + news_bulletin) ve klonlama/detay aksiyonları
 * sunar.
 *
 * Backend bağlantıları (legacy ile birebir):
 *   - useContentLibrary({ content_type, status, search, limit, offset })
 *   - cloneStandardVideo / cloneNewsBulletin → invalidate ["content-library"]
 *
 * Sağ inspector: toplam, modül dağılımı, son üretim tarihi, eylemler.
 */

import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useContentLibrary } from "../../hooks/useContentLibrary";
import {
  cloneNewsBulletin,
  cloneStandardVideo,
  type ContentLibraryItem,
} from "../../api/contentLibraryApi";
import { useToast } from "../../hooks/useToast";
import {
  AuroraButton,
  AuroraInspector,
  AuroraInspectorRow,
  AuroraInspectorSection,
  AuroraStatusChip,
  AuroraTable,
  type AuroraColumn,
  type AuroraStatusTone,
} from "./primitives";
import { Icon } from "./icons";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PAGE_SIZE = 50;

const STATUS_TONE: Record<string, AuroraStatusTone> = {
  ready: "success",
  draft: "neutral",
  failed: "danger",
  processing: "info",
};

function fmtDate(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function typeLabel(ct: string): string {
  return ct === "standard_video" ? "Standart Video" : "Haber Bülteni";
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function AuroraContentLibraryPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<
    "" | "standard_video" | "news_bulletin"
  >("");
  const [statusFilter, setStatusFilter] = useState("");
  const [offset, setOffset] = useState(0);
  const [cloningId, setCloningId] = useState<string | null>(null);

  const { data, isLoading, isError } = useContentLibrary({
    content_type: typeFilter || undefined,
    status: statusFilter || undefined,
    search: search || undefined,
    limit: PAGE_SIZE,
    offset,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const detailLink = useCallback(
    (item: ContentLibraryItem): { path: string; state?: unknown } => {
      if (item.content_type === "standard_video") {
        return { path: `/admin/standard-videos/${item.id}` };
      }
      return {
        path: "/admin/news-bulletins",
        state: { selectedId: item.id },
      };
    },
    [],
  );

  const handleClone = useCallback(
    async (item: ContentLibraryItem) => {
      setCloningId(item.id);
      try {
        let cloneResult: { id: string };
        if (item.content_type === "standard_video") {
          cloneResult = (await cloneStandardVideo(item.id)) as { id: string };
        } else {
          cloneResult = (await cloneNewsBulletin(item.id)) as { id: string };
        }
        queryClient.invalidateQueries({ queryKey: ["content-library"] });
        toast.success(`"${item.title || item.topic}" başarıyla klonlandı.`);
        setTimeout(() => {
          if (item.content_type === "standard_video") {
            navigate(`/admin/standard-videos/${cloneResult.id}`);
          } else {
            navigate("/admin/news-bulletins", {
              state: { selectedId: cloneResult.id },
            });
          }
        }, 700);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Klonlama başarısız.";
        toast.error(msg);
      } finally {
        setCloningId(null);
      }
    },
    [queryClient, toast, navigate],
  );

  // Inspector istatistikleri
  const moduleCounts = useMemo(() => {
    const acc = { standard_video: 0, news_bulletin: 0 };
    items.forEach((it) => {
      if (it.content_type === "standard_video") acc.standard_video += 1;
      else if (it.content_type === "news_bulletin") acc.news_bulletin += 1;
    });
    return acc;
  }, [items]);

  const lastCreatedAt = useMemo(() => {
    let max = 0;
    items.forEach((it) => {
      const t = new Date(it.created_at).getTime();
      if (Number.isFinite(t) && t > max) max = t;
    });
    return max ? new Date(max).toISOString() : null;
  }, [items]);

  const hasActiveFilters = !!(search || typeFilter || statusFilter);

  const handleClearFilters = () => {
    setSearch("");
    setTypeFilter("");
    setStatusFilter("");
    setOffset(0);
  };

  // Tablo kolonları
  const columns: AuroraColumn<ContentLibraryItem>[] = [
    {
      key: "title",
      header: "Başlık",
      render: (item) => (
        <span style={{ fontWeight: 600 }}>{item.title || item.topic}</span>
      ),
    },
    {
      key: "type",
      header: "Tür",
      render: (item) => (
        <AuroraStatusChip
          tone={item.content_type === "standard_video" ? "info" : "warning"}
        >
          {typeLabel(item.content_type)}
        </AuroraStatusChip>
      ),
    },
    {
      key: "status",
      header: "Durum",
      render: (item) => (
        <AuroraStatusChip tone={STATUS_TONE[item.status] ?? "neutral"}>
          {item.status}
        </AuroraStatusChip>
      ),
    },
    {
      key: "content",
      header: "İçerik",
      render: (item) => (
        <div style={{ display: "flex", gap: 4 }}>
          {item.has_script && (
            <AuroraStatusChip tone="info">Script</AuroraStatusChip>
          )}
          {item.has_metadata && (
            <AuroraStatusChip tone="success">Meta</AuroraStatusChip>
          )}
          {!item.has_script && !item.has_metadata && (
            <span style={{ color: "var(--text-muted)", fontSize: 11 }}>—</span>
          )}
        </div>
      ),
    },
    {
      key: "created_at",
      header: "Oluşturulma",
      mono: true,
      render: (item) => (
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
          {fmtDate(item.created_at)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "İşlemler",
      align: "right",
      render: (item) => {
        const link = detailLink(item);
        return (
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
            <AuroraButton
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                navigate(link.path, link.state ? { state: link.state } : undefined);
              }}
            >
              Detay
            </AuroraButton>
            <AuroraButton
              variant="secondary"
              size="sm"
              disabled={cloningId === item.id}
              onClick={(e) => {
                e.stopPropagation();
                handleClone(item);
              }}
            >
              {cloningId === item.id ? "Klonlanıyor…" : "Klonla"}
            </AuroraButton>
          </div>
        );
      },
    },
  ];

  const inspector = (
    <AuroraInspector title="İçerik kütüphanesi">
      <AuroraInspectorSection title="Toplam">
        <AuroraInspectorRow label="kayıt" value={String(total)} />
        <AuroraInspectorRow label="görüntülenen" value={String(items.length)} />
      </AuroraInspectorSection>
      <AuroraInspectorSection title="Modül dağılımı">
        <AuroraInspectorRow
          label="standart video"
          value={String(moduleCounts.standard_video)}
        />
        <AuroraInspectorRow
          label="haber bülteni"
          value={String(moduleCounts.news_bulletin)}
        />
      </AuroraInspectorSection>
      <AuroraInspectorSection title="Son üretim">
        <AuroraInspectorRow
          label="tarih"
          value={lastCreatedAt ? fmtDate(lastCreatedAt) : "—"}
        />
      </AuroraInspectorSection>
      {hasActiveFilters && (
        <AuroraInspectorSection title="Filtreler">
          <AuroraButton
            variant="secondary"
            size="sm"
            onClick={handleClearFilters}
            style={{ width: "100%" }}
          >
            Temizle
          </AuroraButton>
        </AuroraInspectorSection>
      )}
    </AuroraInspector>
  );

  return (
    <div className="aurora-dashboard" data-testid="aurora-content-library">
      <div className="page">
        <div className="page-head">
          <div>
            <h1>İçerik Kütüphanesi</h1>
            <div className="sub">
              {isLoading ? "Yükleniyor…" : `${total} kayıt · birleşik liste`}
            </div>
          </div>
          <div className="hstack" style={{ gap: 8 }}>
            <AuroraButton
              variant="primary"
              size="sm"
              onClick={() => navigate("/admin/standard-videos/new")}
              iconLeft={<Icon name="plus" size={11} />}
            >
              Yeni içerik
            </AuroraButton>
          </div>
        </div>

        {/* Filtre çubuğu */}
        <div className="filter-bar" style={{ flexWrap: "wrap", gap: 8 }}>
          <div className="search-wrap" style={{ flex: 1, minWidth: 220 }}>
            <span className="icon">
              <Icon name="search" size={13} />
            </span>
            <input
              type="text"
              placeholder="Başlık veya konu ara…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setOffset(0);
              }}
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as typeof typeFilter);
              setOffset(0);
            }}
            style={{
              background: "var(--bg-inset)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 6,
              color: "var(--text-secondary)",
              fontSize: 12,
              padding: "6px 10px",
            }}
          >
            <option value="">Tüm Türler</option>
            <option value="standard_video">Standart Video</option>
            <option value="news_bulletin">Haber Bülteni</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setOffset(0);
            }}
            style={{
              background: "var(--bg-inset)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 6,
              color: "var(--text-secondary)",
              fontSize: 12,
              padding: "6px 10px",
            }}
          >
            <option value="">Tüm Durumlar</option>
            <option value="draft">draft</option>
            <option value="ready">ready</option>
            <option value="failed">failed</option>
            <option value="processing">processing</option>
          </select>
        </div>

        {isError ? (
          <div
            className="card card-pad"
            style={{
              textAlign: "center",
              color: "var(--state-danger-fg)",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
            }}
          >
            İçerik kayıtları yüklenirken hata oluştu.
          </div>
        ) : (
          <AuroraTable<ContentLibraryItem>
            columns={columns}
            rows={items}
            rowKey={(item) => `${item.content_type}-${item.id}`}
            loading={isLoading}
            empty={
              <span
                style={{ color: "var(--text-muted)", fontSize: 12 }}
              >
                {hasActiveFilters
                  ? "Filtrelere uygun içerik bulunamadı."
                  : "Henüz içerik kaydı yok."}
              </span>
            }
            onRowClick={(item) => {
              const link = detailLink(item);
              navigate(link.path, link.state ? { state: link.state } : undefined);
            }}
          />
        )}

        {/* Pagination */}
        {total > PAGE_SIZE && (
          <div className="pagination" style={{ marginTop: 12 }}>
            <span style={{ color: "var(--text-muted)", fontSize: 11 }}>
              {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} / {total}
            </span>
            <div className="spacer" style={{ flex: 1 }} />
            <div className="pager">
              <button
                type="button"
                className="pg"
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                disabled={offset === 0}
              >
                <Icon name="chevron-left" size={12} />
              </button>
              <button
                type="button"
                className="pg"
                onClick={() => setOffset(offset + PAGE_SIZE)}
                disabled={offset + PAGE_SIZE >= total}
              >
                <Icon name="chevron-right" size={12} />
              </button>
            </div>
          </div>
        )}
      </div>
      <aside className="aurora-inspector-slot">{inspector}</aside>
    </div>
  );
}
