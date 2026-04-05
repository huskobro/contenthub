import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useContentLibrary } from "../../hooks/useContentLibrary";
import {
  cloneStandardVideo,
  cloneNewsBulletin,
  ContentLibraryItem,
} from "../../api/contentLibraryApi";
import { colors, typography, spacing } from "../../components/design-system/tokens";
import {
  PageShell,
  SectionShell,
  DataTable,
  FilterBar,
  FilterInput,
  FilterSelect,
  ActionButton,
  StatusBadge,
  Pagination,
  FeedbackBanner,
} from "../../components/design-system/primitives";

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
      // M22-E: Clone sonrasi navigasyon
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

  const columns = [
    {
      key: "title",
      header: "Baslik",
      render: (item: ContentLibraryItem) => (
        <span style={{ fontWeight: typography.weight.medium, color: colors.neutral[900] }}>
          {item.title || item.topic}
        </span>
      ),
    },
    {
      key: "type",
      header: "Tur",
      render: (item: ContentLibraryItem) => typeLabel(item.content_type),
    },
    {
      key: "status",
      header: "Durum",
      render: (item: ContentLibraryItem) => <StatusBadge status={item.status} />,
    },
    {
      key: "content",
      header: "Icerik",
      render: (item: ContentLibraryItem) => (
        <div style={{ display: "flex", gap: spacing[1] }}>
          {item.has_script && (
            <span data-testid={`library-has-script-${item.id}`}>
              <StatusBadge status="info" label="Script" size="sm" />
            </span>
          )}
          {item.has_metadata && (
            <span data-testid={`library-has-metadata-${item.id}`}>
              <StatusBadge status="ready" label="Meta" size="sm" />
            </span>
          )}
          {!item.has_script && !item.has_metadata && (
            <span style={{ fontSize: typography.size.xs, color: colors.neutral[400] }}>{"\u2014"}</span>
          )}
        </div>
      ),
    },
    {
      key: "created_at",
      header: "Olusturulma",
      render: (item: ContentLibraryItem) => (
        <span style={{ fontSize: typography.size.sm, color: colors.neutral[600] }}>
          {formatDate(item.created_at)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Aksiyonlar",
      render: (item: ContentLibraryItem) => {
        const link = detailLink(item);
        return (
          <div style={{ display: "flex", gap: spacing[2], alignItems: "center" }}>
            <ActionButton
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                navigate(link.path, link.state ? { state: link.state } : undefined);
              }}
              data-testid={`library-detail-${item.id}`}
              style={{ color: colors.brand[600] }}
            >
              Detay
            </ActionButton>
            <ActionButton
              variant="secondary"
              size="sm"
              loading={cloningId === item.id}
              onClick={(e) => {
                e.stopPropagation();
                handleClone(item);
              }}
              data-testid={`library-clone-${item.id}`}
              style={{ color: cloningId === item.id ? undefined : colors.brand[700] }}
            >
              Klonla
            </ActionButton>
          </div>
        );
      },
    },
  ];

  return (
    <PageShell
      title="Icerik Kutuphanesi"
      subtitle="Tum icerik kayitlarinizi tek bir yuzeyden gorebilir ve yonetebilirsiniz."
      testId="library"
    >
      <p
        style={{
          margin: `0 0 ${spacing[5]}`,
          fontSize: typography.size.base,
          color: colors.neutral[500],
          lineHeight: typography.lineHeight.normal,
          maxWidth: "640px",
        }}
        data-testid="library-workflow-note"
      >
        Icerik yonetim zinciri: Olusturma &rarr; Uretim &rarr; Detay Yonetimi &rarr; Yayin.
        Backend tarafinda birlesik sorgu ile tum icerik turleri tek tabloda sunulur.
      </p>

      {/* Action feedback */}
      {actionFeedback && (
        <FeedbackBanner
          type={actionFeedback.type}
          message={actionFeedback.message}
          testId="library-action-feedback"
        />
      )}

      {/* Filter/Sort/Search */}
      <SectionShell title="Filtre ve Arama" description="Icerik kayitlarini tur, durum veya metin aramasiyla filtreleyebilirsiniz. Filtreleme backend tarafinda yapilir." testId="library-filter-area">
        <div data-testid="library-filter-heading" style={{ display: "none" }}>Filtre ve Arama</div>
        <div data-testid="library-filter-note" style={{ display: "none" }}>Icerik kayitlarini tur, durum veya metin aramasiyla filtreleyebilirsiniz. Filtreleme backend tarafinda yapilir.</div>
        <FilterBar testId="library-filters-active">
          <FilterInput
            type="text"
            placeholder="Baslik/konu ara..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setOffset(0);
            }}
            data-testid="library-search-input"
          />
          <FilterSelect
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as typeof typeFilter);
              setOffset(0);
            }}
            data-testid="library-type-filter"
          >
            <option value="">Tum Turler</option>
            <option value="standard_video">Standart Video</option>
            <option value="news_bulletin">Haber Bulteni</option>
          </FilterSelect>
          <FilterSelect
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setOffset(0);
            }}
            data-testid="library-status-filter"
          >
            <option value="">Tum Durumlar</option>
            <option value="draft">draft</option>
            <option value="ready">ready</option>
            <option value="failed">failed</option>
            <option value="processing">processing</option>
          </FilterSelect>
          {hasActiveFilters && (
            <ActionButton
              variant="secondary"
              size="sm"
              onClick={handleClearFilters}
              data-testid="library-filter-clear"
            >
              Temizle
            </ActionButton>
          )}
        </FilterBar>
        {hasActiveFilters && (
          <p style={{ fontSize: typography.size.xs, color: colors.neutral[500], margin: 0 }} data-testid="library-filter-summary">
            {total} kayit bulundu
          </p>
        )}
      </SectionShell>

      {/* Content List */}
      <SectionShell
        flush
        title="Icerik Kayitlari"
        description={`Tum modul turlerini birlesik olarak goruntuleyebilirsiniz. Toplam: ${total}`}
        testId="library-content-list"
      >
        <div data-testid="library-list-heading" style={{ display: "none" }}>Icerik Kayitlari</div>
        <div data-testid="library-list-note" style={{ display: "none" }}>Tum modul turlerini birlesik olarak goruntuleyebilirsiniz.</div>
        <span data-testid="library-total-count" style={{ display: "none" }}>Toplam: {total}</span>
        {!isLoading && !isError && items.length === 0 ? (
          <div
            style={{ textAlign: "center", padding: `${spacing[8]} ${spacing[4]}`, color: colors.neutral[500] }}
            data-testid="library-empty-state"
          >
            <p style={{ margin: 0, fontSize: typography.size.md }}>
              {hasActiveFilters
                ? "Filtrelere uygun icerik kaydi bulunamadi."
                : "Henuz icerik kaydi bulunmuyor. Icerik olusturma ekranindan yeni bir icerik baslatabilirsiniz."}
            </p>
          </div>
        ) : (
          <DataTable<ContentLibraryItem>
            columns={columns}
            data={items}
            keyFn={(item) => `${item.content_type}-${item.id}`}
            loading={isLoading}
            error={isError}
            errorMessage="Icerik kayitlari yuklenirken hata olustu."
            emptyMessage={
              hasActiveFilters
                ? "Filtrelere uygun icerik kaydi bulunamadi."
                : "Henuz icerik kaydi bulunmuyor. Icerik olusturma ekranindan yeni bir icerik baslatabilirsiniz."
            }
            testId="library-table"
          />
        )}
        <Pagination
          offset={offset}
          limit={PAGE_SIZE}
          total={total}
          onPrev={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
          onNext={() => setOffset(offset + PAGE_SIZE)}
          testId="library-pagination"
        />
      </SectionShell>
      {/* Actions Area */}
      <SectionShell
        title="Icerik Yonetim Aksiyonlari"
        description="Mevcut icerikler uzerinde duzenleme, yeniden kullanim ve klonlama islemleri. Detay sayfasindan da erisebilirsiniz."
        testId="library-actions-area"
      >
        <div data-testid="library-actions-heading" style={{ display: "none" }}>Icerik Yonetim Aksiyonlari</div>
        <div data-testid="library-actions-note" style={{ display: "none" }}>Mevcut icerikler uzerinde duzenleme, yeniden kullanim ve klonlama islemleri.</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: spacing[4] }}>
          <div
            style={{
              padding: `${spacing[4]} ${spacing[5]}`,
              background: colors.surface.card,
              border: `1px solid ${colors.border.subtle}`,
              borderRadius: "8px",
            }}
            data-testid="action-edit"
          >
            <p style={{ margin: 0, fontWeight: typography.weight.semibold, color: colors.neutral[900], marginBottom: spacing[1] }}>
              Duzenleme
            </p>
            <p style={{ margin: 0, fontSize: typography.size.sm, color: colors.neutral[600] }}>
              Icerik detay sayfasindan baslik, konu ve diger alanlari duzenleyin.
            </p>
          </div>
          <div
            style={{
              padding: `${spacing[4]} ${spacing[5]}`,
              background: colors.surface.card,
              border: `1px solid ${colors.border.subtle}`,
              borderRadius: "8px",
            }}
            data-testid="action-reuse"
          >
            <p style={{ margin: 0, fontWeight: typography.weight.semibold, color: colors.neutral[900], marginBottom: spacing[1] }}>
              Yeniden Kullanim
            </p>
            <p style={{ margin: 0, fontSize: typography.size.sm, color: colors.neutral[600] }}>
              Mevcut icerigi sablon olarak kullanarak yeni icerik olusturun.
            </p>
          </div>
          <div
            style={{
              padding: `${spacing[4]} ${spacing[5]}`,
              background: colors.surface.card,
              border: `1px solid ${colors.border.subtle}`,
              borderRadius: "8px",
            }}
            data-testid="action-clone"
          >
            <p style={{ margin: 0, fontWeight: typography.weight.semibold, color: colors.neutral[900], marginBottom: spacing[1] }}>
              Klonlama
            </p>
            <p style={{ margin: 0, fontSize: typography.size.sm, color: colors.neutral[600] }}>
              Mevcut icerigin birebir kopyasini olusturun. Klonlanan icerik draft olarak baslar.
            </p>
          </div>
        </div>
      </SectionShell>
    </PageShell>
  );
}
