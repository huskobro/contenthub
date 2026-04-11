/**
 * ChannelVideoPickerModal -- Visual video picker for adding channel videos to a playlist.
 *
 * Shows channel videos as a grid with thumbnails, checkboxes, search filter,
 * and multi-select capability. Already-in-playlist videos are dimmed.
 */

import { useState, useMemo } from "react";
import { useChannelVideos } from "../../hooks/useCredentials";
import type { ChannelVideoItem } from "../../api/credentialsApi";

interface ChannelVideoPickerProps {
  channelProfileId: string | undefined;
  existingVideoIds: Set<string>;
  onAdd: (videoIds: string[]) => void;
  onClose: () => void;
  isAdding: boolean;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "--";
  try {
    return new Date(dateStr).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "--";
  }
}

function formatViewCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

export function ChannelVideoPickerModal({
  channelProfileId,
  existingVideoIds,
  onAdd,
  onClose,
  isAdding,
}: ChannelVideoPickerProps) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data, isLoading, isError } = useChannelVideos(true, channelProfileId);

  const videos = data?.videos ?? [];

  const filtered = useMemo(() => {
    if (!search.trim()) return videos;
    const term = search.toLowerCase();
    return videos.filter(
      (v) =>
        v.title.toLowerCase().includes(term) ||
        v.video_id.toLowerCase().includes(term),
    );
  }, [videos, search]);

  const toggleSelect = (videoId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(videoId)) {
        next.delete(videoId);
      } else {
        next.add(videoId);
      }
      return next;
    });
  };

  const selectableFiltered = filtered.filter(
    (v) => !existingVideoIds.has(v.video_id),
  );

  const handleSelectAll = () => {
    if (selectableFiltered.every((v) => selected.has(v.video_id))) {
      // Deselect all visible selectable
      setSelected((prev) => {
        const next = new Set(prev);
        for (const v of selectableFiltered) next.delete(v.video_id);
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const v of selectableFiltered) next.add(v.video_id);
        return next;
      });
    }
  };

  const handleAdd = () => {
    const ids = Array.from(selected);
    if (ids.length > 0) onAdd(ids);
  };

  const allSelectableSelected =
    selectableFiltered.length > 0 &&
    selectableFiltered.every((v) => selected.has(v.video_id));

  return (
    <div
      className="p-3 bg-surface-page rounded-md border border-border-subtle mb-3"
      data-testid="channel-video-picker"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-neutral-800 m-0">
          Kanal Videolarindan Sec
        </p>
        <button
          type="button"
          className="text-xs text-neutral-500 hover:text-neutral-700"
          onClick={onClose}
        >
          Kapat
        </button>
      </div>

      {/* Search + select all */}
      <div className="flex items-center gap-2 mb-3">
        <input
          type="text"
          className="flex-1 px-3 py-1.5 text-sm border border-border-default rounded-md bg-white"
          placeholder="Video ara (baslik veya ID)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          data-testid="video-picker-search"
        />
        {selectableFiltered.length > 0 && (
          <button
            type="button"
            className="px-2 py-1.5 text-xs rounded-md border border-border-default text-neutral-600 hover:bg-neutral-50 whitespace-nowrap"
            onClick={handleSelectAll}
          >
            {allSelectableSelected ? "Secimi Kaldir" : "Tumunu Sec"}
          </button>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-border-subtle bg-surface-card p-2 animate-pulse"
            >
              <div className="w-full aspect-video bg-neutral-200 rounded mb-2" />
              <div className="h-3 bg-neutral-200 rounded w-3/4 mb-1" />
              <div className="h-2 bg-neutral-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <p className="text-sm text-error-base py-4 text-center">
          Kanal videolari yuklenemedi. Lutfen tekrar deneyin.
        </p>
      )}

      {/* Empty */}
      {!isLoading && !isError && videos.length === 0 && (
        <p className="text-sm text-neutral-500 py-4 text-center">
          Bu kanal icin video bulunamadi.
        </p>
      )}

      {/* No results for search */}
      {!isLoading && !isError && videos.length > 0 && filtered.length === 0 && (
        <p className="text-sm text-neutral-500 py-4 text-center">
          "{search}" icin sonuc bulunamadi.
        </p>
      )}

      {/* Video grid */}
      {!isLoading && !isError && filtered.length > 0 && (
        <div className="max-h-[400px] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {filtered.map((video) => {
              const isExisting = existingVideoIds.has(video.video_id);
              const isSelected = selected.has(video.video_id);

              return (
                <button
                  key={video.video_id}
                  type="button"
                  className={`
                    text-left rounded-lg border p-2 transition-colors
                    ${isExisting
                      ? "border-border-subtle bg-neutral-50 opacity-60 cursor-default"
                      : isSelected
                        ? "border-brand-400 bg-brand-50 ring-1 ring-brand-200"
                        : "border-border-subtle bg-surface-card hover:border-brand-200 hover:bg-brand-50/30 cursor-pointer"
                    }
                  `}
                  onClick={() => {
                    if (!isExisting) toggleSelect(video.video_id);
                  }}
                  disabled={isExisting}
                  data-testid={`video-pick-${video.video_id}`}
                >
                  {/* Thumbnail */}
                  <div className="relative w-full aspect-video rounded overflow-hidden mb-2 bg-neutral-200">
                    {video.thumbnail_url ? (
                      <img
                        src={video.thumbnail_url}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-neutral-400">
                        VID
                      </div>
                    )}

                    {/* Checkbox overlay */}
                    <div className="absolute top-1 right-1">
                      {isExisting ? (
                        <span className="inline-block px-1.5 py-0.5 text-[10px] font-medium bg-neutral-700/70 text-white rounded">
                          Zaten ekli
                        </span>
                      ) : (
                        <span
                          className={`
                            inline-flex items-center justify-center w-5 h-5 rounded border-2
                            ${isSelected
                              ? "bg-brand-600 border-brand-600 text-white"
                              : "bg-white/80 border-neutral-300"
                            }
                          `}
                        >
                          {isSelected && (
                            <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                              <path
                                d="M2.5 6L5 8.5L9.5 3.5"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </span>
                      )}
                    </div>

                    {/* Duration badge */}
                    {video.duration && (
                      <span className="absolute bottom-1 right-1 px-1 py-0.5 text-[10px] font-medium bg-black/70 text-white rounded">
                        {video.duration}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <p className="text-xs font-medium text-neutral-800 m-0 line-clamp-2 leading-tight mb-1">
                    {video.title}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-neutral-500">
                    <span>{formatViewCount(video.view_count)} goruntulenme</span>
                    <span>{formatDate(video.published_at)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer actions */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-subtle">
        <p className="text-xs text-neutral-500 m-0">
          {videos.length} video{" "}
          {existingVideoIds.size > 0 && (
            <span>({existingVideoIds.size} zaten ekli)</span>
          )}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-3 py-1.5 text-xs rounded-md border border-border-default text-neutral-600 hover:bg-neutral-50"
            onClick={onClose}
          >
            Iptal
          </button>
          <button
            type="button"
            className="px-4 py-1.5 text-xs font-medium rounded-md bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
            onClick={handleAdd}
            disabled={selected.size === 0 || isAdding}
            data-testid="video-picker-add-btn"
          >
            {isAdding
              ? "Ekleniyor..."
              : `Secilenleri Ekle${selected.size > 0 ? ` (${selected.size})` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
