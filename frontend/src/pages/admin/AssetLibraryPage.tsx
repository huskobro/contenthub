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
  Mono,
} from "../../components/design-system/primitives";

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

function typeColor(assetType: string): string {
  switch (assetType) {
    case "audio": return "info";
    case "video": return "processing";
    case "image": return "ready";
    case "data": return "warning";
    case "text": return "draft";
    case "subtitle": return "review";
    default: return "draft";
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

  const columns = [
    {
      key: "name",
      header: "Dosya Adi",
      render: (item: AssetItem) => (
        <span>
          <span style={{ fontWeight: typography.weight.medium }}>{item.name}</span>
          <span style={{ fontSize: typography.size.xs, color: colors.neutral[500], marginLeft: spacing[2] }}>
            .{item.mime_ext}
          </span>
        </span>
      ),
    },
    {
      key: "type",
      header: "Tur",
      render: (item: AssetItem) => (
        <StatusBadge status={typeColor(item.asset_type)} label={item.asset_type} />
      ),
    },
    {
      key: "source",
      header: "Kaynak",
      render: (item: AssetItem) => (
        <span style={{ fontSize: typography.size.sm, color: colors.neutral[600] }}>
          {item.source_kind === "job_artifact" ? "Artifact" : "Preview"}
        </span>
      ),
    },
    {
      key: "size",
      header: "Boyut",
      align: "right" as const,
      render: (item: AssetItem) => (
        <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatBytes(item.size_bytes)}</span>
      ),
    },
    {
      key: "module",
      header: "Modul",
      render: (item: AssetItem) => (
        <span style={{ fontSize: typography.size.sm, color: colors.neutral[600] }}>
          {item.module_type || "\u2014"}
        </span>
      ),
    },
    {
      key: "date",
      header: "Tarih",
      render: (item: AssetItem) => (
        <span style={{ fontSize: typography.size.sm, color: colors.neutral[600] }}>
          {formatDate(item.discovered_at)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Aksiyonlar",
      render: (item: AssetItem) => (
        <div style={{ display: "flex", gap: spacing[1] }} data-testid={`asset-actions-${item.id}`}>
          <ActionButton
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleReveal(item);
            }}
            title="Konum bilgisi"
            data-testid={`asset-reveal-${item.id}`}
          >
            Konum
          </ActionButton>
          <ActionButton
            variant="danger"
            size="sm"
            loading={deletingId === item.id}
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(item);
            }}
            title="Sil"
            data-testid={`asset-delete-${item.id}`}
          >
            Sil
          </ActionButton>
        </div>
      ),
    },
  ];

  return (
    <PageShell
      title="Varlik Kutuphanesi"
      subtitle="Workspace dizinlerindeki artifact ve preview dosyalari otomatik disk taramasi ile listelenir. Dosyalari goruntuleyebilir, konum bilgisini alabilir veya silebilirsiniz."
      testId="asset-library"
      actions={
        <ActionButton
          variant="secondary"
          size="sm"
          loading={refreshing}
          onClick={handleRefresh}
          data-testid="asset-refresh-btn"
        >
          {refreshing ? "Taraniyor..." : "Yenile"}
        </ActionButton>
      }
    >
      {/* Action feedback */}
      {actionFeedback && (
        <FeedbackBanner
          type={actionFeedback.type}
          message={actionFeedback.message}
          testId="asset-action-feedback"
        />
      )}

      {/* Reveal panel */}
      {revealData && (
        <SectionShell
          title="Konum Bilgisi"
          testId="asset-reveal-panel"
          actions={
            <ActionButton
              variant="secondary"
              size="sm"
              onClick={() => setRevealData(null)}
              data-testid="asset-reveal-close"
            >
              Kapat
            </ActionButton>
          }
        >
          <div style={{ fontSize: typography.size.sm, color: colors.neutral[800] }}>
            <p style={{ margin: `${spacing[1]} 0` }}>
              <strong>Dosya:</strong>{" "}
              <Mono>{revealData.absolute_path}</Mono>
            </p>
            <p style={{ margin: `${spacing[1]} 0` }}>
              <strong>Dizin:</strong>{" "}
              <Mono>{revealData.directory}</Mono>
            </p>
            <p style={{ margin: `${spacing[1]} 0` }}>
              <strong>Durum:</strong> {revealData.exists ? "Mevcut" : "Bulunamadi"}
            </p>
          </div>
        </SectionShell>
      )}

      {/* Upload area */}
      <SectionShell title="Dosya Yukle" description="Workspace'e yeni bir dosya yukleyin. Maks. 100 MB. Calistirilabilir dosyalar engellenir." testId="asset-upload-area">
        <div data-testid="asset-upload-heading" style={{ display: "none" }}>Dosya Yukle</div>
        <div style={{ display: "flex", gap: spacing[2], alignItems: "center" }}>
          <input
            type="file"
            ref={fileInputRef}
            style={{ fontSize: typography.size.base }}
            data-testid="asset-upload-input"
            disabled={uploading}
          />
          <ActionButton
            variant="primary"
            size="sm"
            loading={uploading}
            onClick={handleUpload}
            data-testid="asset-upload-btn"
          >
            {uploading ? "Yukleniyor..." : "Yukle"}
          </ActionButton>
        </div>
      </SectionShell>

      {/* Filter area */}
      <SectionShell title="Filtre ve Arama" testId="asset-filter-area">
        <FilterBar testId="asset-filters-active">
          <FilterInput
            type="text"
            placeholder="Dosya adi ara..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setOffset(0);
            }}
            data-testid="asset-search-input"
          />
          <FilterSelect
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setOffset(0);
            }}
            data-testid="asset-type-filter"
          >
            {ASSET_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </FilterSelect>
          {(searchQuery || typeFilter) && (
            <ActionButton
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setTypeFilter("");
                setOffset(0);
              }}
              data-testid="asset-filter-clear"
            >
              Temizle
            </ActionButton>
          )}
        </FilterBar>
      </SectionShell>

      {/* Data table */}
      <SectionShell
        flush
        title="Varlik Listesi"
        description={`Toplam: ${total}`}
        testId="asset-list-section"
      >
        <span data-testid="asset-total-count" style={{ display: "none" }}>Toplam: {total}</span>
        {!isLoading && !isError && items.length === 0 ? (
          <div
            style={{ textAlign: "center", padding: `${spacing[8]} ${spacing[4]}`, color: colors.neutral[500] }}
            data-testid="asset-library-empty-state"
          >
            <p style={{ margin: 0, fontSize: typography.size.md }}>
              {total === 0 && !searchQuery && !typeFilter
                ? "Workspace dizinlerinde henuz artifact veya preview dosyasi bulunmuyor."
                : "Filtrelere uygun varlik bulunamadi."}
            </p>
          </div>
        ) : (
          <DataTable<AssetItem>
            columns={columns}
            data={items}
            keyFn={(item) => item.id}
            loading={isLoading}
            error={isError}
            errorMessage="Varliklar yuklenirken hata olustu."
            emptyMessage={
              total === 0 && !searchQuery && !typeFilter
                ? "Workspace dizinlerinde henuz artifact veya preview dosyasi bulunmuyor."
                : "Filtrelere uygun varlik bulunamadi."
            }
            testId="asset-table"
          />
        )}
        <div data-testid="asset-pagination">
          <Pagination
            offset={offset}
            limit={PAGE_SIZE}
            total={total}
            onPrev={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            onNext={() => setOffset(offset + PAGE_SIZE)}
          />
        </div>
      </SectionShell>
    </PageShell>
  );
}
