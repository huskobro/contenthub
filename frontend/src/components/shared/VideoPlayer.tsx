import { useCallback, useRef, useState } from "react";
import { cn } from "../../lib/cn";

interface VideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  width?: string;
  height?: string;
  className?: string;
  showDownload?: boolean;
  compact?: boolean;
  testId?: string;
}

type PlayerState = "loading" | "loaded" | "error";

/** Extract filename from a URL or path string. */
function extractFilename(src: string): string {
  try {
    const url = new URL(src, window.location.origin);
    const segments = url.pathname.split("/").filter(Boolean);
    return segments[segments.length - 1] ?? src;
  } catch {
    const segments = src.split("/").filter(Boolean);
    return segments[segments.length - 1] ?? src;
  }
}

/**
 * HTML5-based video player for displaying job output videos.
 * Supports loading skeleton, error state with retry, poster frame,
 * download button, and compact mode for side panels.
 */
export function VideoPlayer({
  src,
  poster,
  title,
  width = "100%",
  height = "auto",
  className,
  showDownload = true,
  compact = false,
  testId,
}: VideoPlayerProps) {
  const [state, setState] = useState<PlayerState>("loading");
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleLoadedData = useCallback(() => {
    setState("loaded");
  }, []);

  const handleError = useCallback(() => {
    setState("error");
  }, []);

  const handleRetry = useCallback(() => {
    setState("loading");
    const video = videoRef.current;
    if (video) {
      video.load();
    }
  }, []);

  const filename = extractFilename(src);

  return (
    <div
      className={cn("flex flex-col gap-2", className)}
      style={{ width }}
      data-testid={testId}
    >
      {/* Title */}
      {title && !compact && (
        <h3
          className="text-sm font-semibold text-neutral-600 m-0"
          data-testid={testId ? `${testId}-title` : undefined}
        >
          {title}
        </h3>
      )}

      {/* Video area */}
      <div
        className={cn(
          "relative rounded-lg overflow-hidden bg-neutral-900",
          compact ? "p-0" : "p-0"
        )}
      >
        {/* Loading skeleton */}
        {state === "loading" && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center bg-neutral-900 rounded-lg"
            data-testid={testId ? `${testId}-skeleton` : undefined}
          >
            <div className="w-full h-full min-h-[180px] animate-pulse bg-neutral-800 rounded-lg" />
          </div>
        )}

        {/* Error state */}
        {state === "error" && (
          <div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-neutral-900 rounded-lg min-h-[180px]"
            data-testid={testId ? `${testId}-error` : undefined}
          >
            <p className="text-neutral-400 text-sm m-0">
              Video yuklenemedi
            </p>
            <button
              type="button"
              onClick={handleRetry}
              className="px-3 py-1.5 text-xs font-medium rounded-md bg-neutral-700 text-neutral-200 hover:bg-neutral-600 transition-colors"
            >
              Tekrar Dene
            </button>
          </div>
        )}

        {/* Video element */}
        <video
          ref={videoRef}
          controls
          poster={poster}
          onLoadedData={handleLoadedData}
          onError={handleError}
          className={cn(
            "block w-full rounded-lg",
            "object-contain",
            state === "error" && "invisible"
          )}
          style={{ maxWidth: "100%", height }}
          data-testid={testId ? `${testId}-video` : undefined}
        >
          <source src={src} />
        </video>
      </div>

      {/* Info row: filename + download */}
      <div
        className={cn(
          "flex items-center justify-between",
          compact ? "gap-2" : "gap-3"
        )}
      >
        <span
          className={cn(
            "text-neutral-500 truncate",
            compact ? "text-xs" : "text-xs"
          )}
          title={filename}
        >
          {filename}
        </span>

        {showDownload && (
          <a
            href={src}
            download={filename}
            className={cn(
              "shrink-0 inline-flex items-center font-medium rounded-md transition-colors",
              "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 border border-border-subtle",
              compact
                ? "px-2 py-0.5 text-xs"
                : "px-3 py-1 text-xs"
            )}
            data-testid={testId ? `${testId}-download` : undefined}
          >
            Indir
          </a>
        )}
      </div>
    </div>
  );
}
