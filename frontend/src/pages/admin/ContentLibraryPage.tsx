import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useContentLibrary } from "../../hooks/useContentLibrary";
import {
  cloneStandardVideo,
  cloneNewsBulletin,
  ContentLibraryItem,
} from "../../api/contentLibraryApi";
import { cn } from "../../lib/cn";
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
} from "../../components/design-system/primitives";
import { QuickLook, useQuickLookTrigger } from "../../components/design-system/QuickLook";
import { ContentQuickLookContent } from "../../components/quicklook/ContentQuickLookContent";
import { useScopedKeyboardNavigation } from "../../hooks/useScopedKeyboardNavigation";
import { useSearchFocus } from "../../hooks/useSearchFocus";
import { useToast } from "../../hooks/useToast";

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
  const toast = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | "standard_video" | "news_bulletin">("");
  const [statusFilter, setStatusFilter] = useState("");
  const [offset, setOffset] = useState(0);

  // Clone state
  const [cloningId, setCloningId] = useState<string | null>(null);

  // QuickLook state
  const [quickLookOpen, setQuickLookOpen] = useState(false);

  // Search focus ref
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  // Keyboard navigation
  const { activeIndex, handleKeyDown } = useScopedKeyboardNavigation({
    scopeId: "content-library-table",
    scopeLabel: "Content Library",
    itemCount: items.length,
    onSelect: (i) => {
      if (items[i]) {
        setQuickLookOpen(true);
      }
    },
    enabled: !quickLookOpen,
  });

  // QuickLook trigger (Space)
  useQuickLookTrigger({
    enabled: items.length > 0 && !quickLookOpen,
    onToggle: () => setQuickLookOpen(true),
    scopeId: "content-library-table",
  });

  // "/" search focus
  useSearchFocus(searchInputRef, { enabled: !quickLookOpen });

  const activeItem = items[activeIndex] ?? null;

  const handleClone = useCallback(async (item: ContentLibraryItem) => {
    setCloningId(item.id);
    try {
      let cloneResult: { id: string };
      if (item.content_type === "standard_video") {
        cloneResult = await cloneStandardVideo(item.id) as { id: string };
      } else {
        cloneResult = await cloneNewsBulletin(item.id) as { id: string };
      }
      queryClient.invalidateQueries({ queryKey: ["content-library"] });
      toast.success(`"${item.title || item.topic}" basariyla klonlandi.`);
      setTimeout(() => {
        if (item.content_type === "standard_video") {
          navigate(`/admin/standard-videos/${cloneResult.id}`);
        } else {
          navigate("/admin/news-bulletins", { state: { selectedId: cloneResult.id } });
        }
      }, 800);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Klonlama basarisiz oldu.";
      toast.error(msg);
    } finally {
      setCloningId(null);
    }
  }, [queryClient, toast, navigate]);

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
        <span className="font-medium text-neutral-900">
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
        <div className="flex gap-1">
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
            <span className="text-xs text-neutral-400">{"\u2014"}</span>
          )}
        </div>
      ),
    },
    {
      key: "created_at",
      header: "Olusturulma",
      render: (item: ContentLibraryItem) => (
        <span className="text-sm text-neutral-600">
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
          <div className="flex gap-2 items-center">
            <ActionButton
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                navigate(link.path, link.state ? { state: link.state } : undefined);
              }}
              data-testid={`library-detail-${item.id}`}
              className="text-brand-600"
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
              className={cn(cloningId !== item.id && "text-brand-700")}
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
      subtitle="Tum icerik kayitlari tek yuzeyden."
      testId="library"
    >
      <p className="m-0 mb-3 text-xs text-neutral-400" data-testid="library-workflow-note">
        Olusturma &rarr; Uretim &rarr; Detay &rarr; Yayin &middot; ↑↓ gezin, Space on izleme, Enter detay
      </p>

      {/* Filter/Sort/Search */}
      <div data-testid="library-filter-area" className="mb-4">
        <div data-testid="library-filter-heading" className="hidden">Filtre ve Arama</div>
        <div data-testid="library-filter-note" className="hidden">Icerik kayitlarini tur, durum veya metin aramasiyla filtreleyebilirsiniz.</div>
        <FilterBar testId="library-filters-active">
          <FilterInput
            ref={searchInputRef}
            type="text"
            placeholder="Baslik/konu ara... ( / )"
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
          <p className="text-xs text-neutral-500 m-0" data-testid="library-filter-summary">
            {total} kayıt bulundu
          </p>
        )}
      </div>

      {/* Content List */}
      <div onKeyDown={handleKeyDown} tabIndex={0} className="outline-none">
        <SectionShell
          flush
          title={`Icerik Kayitlari (${total})`}
          testId="library-content-list"
        >
          <div data-testid="library-list-heading" className="hidden">Icerik Kayitlari</div>
          <div data-testid="library-list-note" className="hidden">Tum modul turlerini birlesik olarak goruntuleyebilirsiniz.</div>
          <span data-testid="library-total-count" className="hidden">Toplam: {total}</span>
          {!isLoading && !isError && items.length === 0 ? (
            <div
              className="text-center py-8 px-4 text-neutral-500"
              data-testid="library-empty-state"
            >
              <p className="m-0 text-md">
                {hasActiveFilters
                  ? "Filtrelere uygun icerik kaydi bulunamadi."
                  : "Henüz icerik kaydi bulunmuyor. Icerik olusturma ekranindan yeni bir icerik baslatabilirsiniz."}
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
                  : "Henüz icerik kaydi bulunmuyor. Icerik olusturma ekranindan yeni bir icerik baslatabilirsiniz."
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
      </div>

      {/* Actions Area */}
      <SectionShell
        title="Icerik Yonetim Aksiyonlari"
        description="Mevcut icerikler uzerinde duzenleme, yeniden kullanim ve klonlama islemleri. Detay sayfasindan da erisebilirsiniz."
        testId="library-actions-area"
      >
        <div data-testid="library-actions-heading" className="hidden">Icerik Yonetim Aksiyonlari</div>
        <div data-testid="library-actions-note" className="hidden">Mevcut icerikler uzerinde duzenleme, yeniden kullanim ve klonlama islemleri.</div>
        <div className="grid grid-cols-3 gap-4">
          <div
            className="py-4 px-5 bg-surface-card border border-border-subtle rounded-lg"
            data-testid="action-edit"
          >
            <p className="m-0 font-semibold text-neutral-900 mb-1">
              Düzenleme
            </p>
            <p className="m-0 text-sm text-neutral-600">
              Icerik detay sayfasindan baslik, konu ve diger alanlari duzenleyin.
            </p>
          </div>
          <div
            className="py-4 px-5 bg-surface-card border border-border-subtle rounded-lg"
            data-testid="action-reuse"
          >
            <p className="m-0 font-semibold text-neutral-900 mb-1">
              Yeniden Kullanim
            </p>
            <p className="m-0 text-sm text-neutral-600">
              Mevcut icerigi sablon olarak kullanarak yeni icerik olusturun.
            </p>
          </div>
          <div
            className="py-4 px-5 bg-surface-card border border-border-subtle rounded-lg"
            data-testid="action-clone"
          >
            <p className="m-0 font-semibold text-neutral-900 mb-1">
              Klonlama
            </p>
            <p className="m-0 text-sm text-neutral-600">
              Mevcut icerigin birebir kopyasini olusturun. Klonlanan icerik draft olarak baslar.
            </p>
          </div>
        </div>
      </SectionShell>

      {/* QuickLook */}
      <QuickLook
        open={quickLookOpen}
        onClose={() => setQuickLookOpen(false)}
        title="Icerik On Izleme"
        testId="content-quicklook"
      >
        {activeItem && (
          <ContentQuickLookContent
            item={activeItem}
            onNavigate={() => {
              setQuickLookOpen(false);
              const link = detailLink(activeItem);
              navigate(link.path, link.state ? { state: link.state } : undefined);
            }}
            onClone={() => {
              setQuickLookOpen(false);
              handleClone(activeItem);
            }}
          />
        )}
      </QuickLook>
    </PageShell>
  );
}
