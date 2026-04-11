import { useCallback, useEffect, useRef, useState } from "react";
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
  /**
   * Enable comprehensive keyboard shortcuts (YouTube-style).
   * When true, the player wraps focusable container that listens to:
   *   Space / K  — play/pause
   *   J / ←     — seek -5s
   *   L / →     — seek +5s
   *   ↑ / ↓     — volume +/- 0.1
   *   M         — mute toggle
   *   F         — fullscreen toggle
   *   0-9       — seek %0-%90
   *   , / .     — frame step (paused only, approximate 1/30s)
   * Default: true.
   */
  keyboardControls?: boolean;
  /** Autoplay on mount. Default: false (browser policies may still block). */
  autoPlay?: boolean;
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
 * download button, compact mode, and full keyboard shortcuts.
 *
 * Keyboard shortcuts are scoped to the player wrapper — they only fire
 * when the player (or any element inside) has focus, so they never
 * interfere with form inputs or other page-level keybinds.
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
  keyboardControls = true,
  autoPlay = false,
}: VideoPlayerProps) {
  const [state, setState] = useState<PlayerState>("loading");
  const [shortcutHint, setShortcutHint] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const hintTimerRef = useRef<number | null>(null);

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

  const flashHint = useCallback((text: string) => {
    setShortcutHint(text);
    if (hintTimerRef.current !== null) {
      window.clearTimeout(hintTimerRef.current);
    }
    hintTimerRef.current = window.setTimeout(() => {
      setShortcutHint(null);
      hintTimerRef.current = null;
    }, 900);
  }, []);

  // Keyboard shortcut handler — scoped to player wrapper focus.
  useEffect(() => {
    if (!keyboardControls) return undefined;
    const wrapper = wrapperRef.current;
    if (!wrapper) return undefined;

    function handleKey(e: KeyboardEvent) {
      const video = videoRef.current;
      if (!video) return;
      // Only handle if event originates inside the wrapper.
      const target = e.target as HTMLElement | null;
      if (target && target.tagName === "INPUT") return;
      if (target && target.tagName === "TEXTAREA") return;

      // Ignore modifier combos (Cmd/Ctrl/Alt) so they don't shadow browser shortcuts.
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key;
      const code = e.code;

      // Play/pause: Space or K
      if (code === "Space" || key === " " || key.toLowerCase() === "k") {
        e.preventDefault();
        if (video.paused) {
          void video.play();
          flashHint("▶");
        } else {
          video.pause();
          flashHint("⏸");
        }
        return;
      }

      // Seek -5s: J or ArrowLeft
      if (key.toLowerCase() === "j" || key === "ArrowLeft") {
        e.preventDefault();
        video.currentTime = Math.max(0, video.currentTime - 5);
        flashHint("-5s");
        return;
      }

      // Seek +5s: L or ArrowRight
      if (key.toLowerCase() === "l" || key === "ArrowRight") {
        e.preventDefault();
        video.currentTime = Math.min(video.duration || Infinity, video.currentTime + 5);
        flashHint("+5s");
        return;
      }

      // Volume up: ArrowUp
      if (key === "ArrowUp") {
        e.preventDefault();
        video.volume = Math.min(1, video.volume + 0.1);
        video.muted = false;
        flashHint(`${Math.round(video.volume * 100)}%`);
        return;
      }

      // Volume down: ArrowDown
      if (key === "ArrowDown") {
        e.preventDefault();
        video.volume = Math.max(0, video.volume - 0.1);
        flashHint(`${Math.round(video.volume * 100)}%`);
        return;
      }

      // Mute toggle: M
      if (key.toLowerCase() === "m") {
        e.preventDefault();
        video.muted = !video.muted;
        flashHint(video.muted ? "🔇" : "🔊");
        return;
      }

      // Fullscreen: F
      if (key.toLowerCase() === "f") {
        e.preventDefault();
        if (document.fullscreenElement) {
          void document.exitFullscreen();
        } else {
          void video.requestFullscreen?.();
        }
        flashHint("⛶");
        return;
      }

      // Seek 0-9 → percent
      if (key.length === 1 && key >= "0" && key <= "9") {
        e.preventDefault();
        const pct = Number.parseInt(key, 10) * 10;
        if (!Number.isNaN(video.duration)) {
          video.currentTime = (video.duration * pct) / 100;
          flashHint(`${pct}%`);
        }
        return;
      }

      // Frame step: , (back) and . (forward) when paused
      if ((key === "," || key === ".") && video.paused) {
        e.preventDefault();
        const delta = key === "," ? -1 / 30 : 1 / 30;
        video.currentTime = Math.max(0, video.currentTime + delta);
        flashHint(key === "," ? "◀|" : "|▶");
        return;
      }

      // Home / End
      if (key === "Home") {
        e.preventDefault();
        video.currentTime = 0;
        flashHint("0%");
        return;
      }
      if (key === "End") {
        e.preventDefault();
        if (!Number.isNaN(video.duration)) {
          video.currentTime = video.duration;
          flashHint("100%");
        }
        return;
      }
    }

    wrapper.addEventListener("keydown", handleKey);
    return () => {
      wrapper.removeEventListener("keydown", handleKey);
      if (hintTimerRef.current !== null) {
        window.clearTimeout(hintTimerRef.current);
        hintTimerRef.current = null;
      }
    };
  }, [keyboardControls, flashHint]);

  const filename = extractFilename(src);

  return (
    <div
      className={cn("flex flex-col gap-2", className)}
      style={{ width }}
      data-testid={testId}
      ref={wrapperRef}
      tabIndex={keyboardControls ? 0 : -1}
      aria-label={title ?? filename}
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
          "relative rounded-lg overflow-hidden bg-neutral-900 group",
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

        {/* Keyboard shortcut hint overlay */}
        {shortcutHint && (
          <div
            className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
            data-testid={testId ? `${testId}-shortcut-hint` : undefined}
          >
            <span className="px-4 py-2 text-sm font-semibold text-white bg-black/60 rounded-lg backdrop-blur-sm">
              {shortcutHint}
            </span>
          </div>
        )}

        {/* Video element */}
        <video
          ref={videoRef}
          controls
          autoPlay={autoPlay}
          poster={poster}
          onLoadedData={handleLoadedData}
          onError={handleError}
          onClick={(e) => {
            // Keep focus on wrapper so keyboard shortcuts keep working.
            e.stopPropagation();
          }}
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

      {/* Info row: filename + download + shortcut hint */}
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

        <div className="flex items-center gap-2 shrink-0">
          {keyboardControls && !compact && (
            <span
              className="hidden md:inline text-[10px] text-neutral-400 font-mono"
              title="Space: oynat/durdur · J/L veya ←/→: 5sn · ↑/↓: ses · M: sessiz · F: tam ekran · 0-9: yüzde · ,/.: kare"
            >
              ⌨ kısayollar
            </span>
          )}
          {showDownload && (
            <a
              href={src}
              download={filename}
              className={cn(
                "inline-flex items-center font-medium rounded-md transition-colors",
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
    </div>
  );
}
