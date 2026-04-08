import { useEffect, useState } from "react";
import { cn } from "../../lib/cn";
import { VideoPlayer } from "./VideoPlayer";

interface MediaPreviewProps {
  src: string;
  mediaType?: string;
  poster?: string;
  title?: string;
  compact?: boolean;
  className?: string;
  testId?: string;
}

type MediaCategory = "video" | "image" | "json" | "text" | "audio" | "unsupported";

const EXTENSION_MAP: Record<string, MediaCategory> = {
  ".mp4": "video",
  ".webm": "video",
  ".mov": "video",
  ".png": "image",
  ".jpg": "image",
  ".jpeg": "image",
  ".gif": "image",
  ".webp": "image",
  ".json": "json",
  ".srt": "text",
  ".txt": "text",
  ".log": "text",
  ".mp3": "audio",
  ".wav": "audio",
  ".ogg": "audio",
};

const MIME_PREFIX_MAP: Record<string, MediaCategory> = {
  "video/": "video",
  "image/": "image",
  "audio/": "audio",
  "application/json": "json",
  "text/": "text",
};

/** Infer media category from src extension or explicit mime type. */
function inferCategory(src: string, mediaType?: string): MediaCategory {
  // Prefer explicit mime type if provided
  if (mediaType) {
    for (const [prefix, category] of Object.entries(MIME_PREFIX_MAP)) {
      if (mediaType.startsWith(prefix)) return category;
    }
  }

  // Fall back to extension
  const extMatch = src.match(/(\.[a-zA-Z0-9]+)(?:\?.*)?$/);
  if (extMatch) {
    const ext = extMatch[1].toLowerCase();
    if (ext in EXTENSION_MAP) return EXTENSION_MAP[ext];
  }

  return "unsupported";
}

/**
 * Wrapper component that selects the right viewer based on media type or
 * file extension. Delegates to VideoPlayer for video, and renders native
 * elements for image, audio, JSON, and text content.
 */
export function MediaPreview({
  src,
  mediaType,
  poster,
  title,
  compact = false,
  className,
  testId,
}: MediaPreviewProps) {
  const category = inferCategory(src, mediaType);

  return (
    <div className={cn("flex flex-col gap-2", className)} data-testid={testId}>
      {title && !compact && (
        <h3 className="text-sm font-semibold text-neutral-600 m-0">
          {title}
        </h3>
      )}

      {category === "video" && (
        <VideoPlayer
          src={src}
          poster={poster}
          compact={compact}
          showDownload
          testId={testId ? `${testId}-video-player` : undefined}
        />
      )}

      {category === "image" && (
        <ImageViewer src={src} compact={compact} testId={testId} />
      )}

      {category === "json" && (
        <JsonViewer src={src} compact={compact} testId={testId} />
      )}

      {category === "text" && (
        <TextViewer src={src} compact={compact} testId={testId} />
      )}

      {category === "audio" && (
        <AudioViewer src={src} testId={testId} />
      )}

      {category === "unsupported" && (
        <div
          className="flex items-center justify-center rounded-lg bg-neutral-50 border border-border-subtle p-6"
          data-testid={testId ? `${testId}-unsupported` : undefined}
        >
          <p className="text-neutral-500 text-sm m-0">
            Onizleme desteklenmiyor
          </p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-viewers                                                        */
/* ------------------------------------------------------------------ */

function ImageViewer({
  src,
  compact,
  testId,
}: {
  src: string;
  compact: boolean;
  testId?: string;
}) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className="flex items-center justify-center rounded-lg bg-neutral-50 border border-border-subtle p-6">
        <p className="text-neutral-500 text-sm m-0">Gorsel yuklenemedi</p>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      onError={() => setError(true)}
      className={cn(
        "rounded-lg object-contain bg-neutral-100 border border-border-subtle",
        compact ? "max-h-48" : "max-h-96",
        "w-full"
      )}
      data-testid={testId ? `${testId}-image` : undefined}
    />
  );
}

function JsonViewer({
  src,
  compact,
  testId,
}: {
  src: string;
  compact: boolean;
  testId?: string;
}) {
  const { content, error, loading } = useFetchText(src);

  if (loading) {
    return <div className="h-32 animate-pulse bg-neutral-100 rounded-lg" />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center rounded-lg bg-neutral-50 border border-border-subtle p-4">
        <p className="text-neutral-500 text-sm m-0">JSON yuklenemedi</p>
      </div>
    );
  }

  let formatted = content;
  try {
    formatted = JSON.stringify(JSON.parse(content), null, 2);
  } catch {
    // show raw content if not valid JSON
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-neutral-500">JSON icerik</span>
      <pre
        className={cn(
          "m-0 p-3 rounded-lg text-xs font-mono overflow-auto whitespace-pre-wrap break-all [overflow-wrap:anywhere]",
          "bg-neutral-900 text-neutral-300 border border-border-subtle",
          compact ? "max-h-40" : "max-h-64"
        )}
        data-testid={testId ? `${testId}-json` : undefined}
      >
        {formatted}
      </pre>
    </div>
  );
}

function TextViewer({
  src,
  compact,
  testId,
}: {
  src: string;
  compact: boolean;
  testId?: string;
}) {
  const { content, error, loading } = useFetchText(src);

  if (loading) {
    return <div className="h-32 animate-pulse bg-neutral-100 rounded-lg" />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center rounded-lg bg-neutral-50 border border-border-subtle p-4">
        <p className="text-neutral-500 text-sm m-0">Dosya yuklenemedi</p>
      </div>
    );
  }

  return (
    <pre
      className={cn(
        "m-0 p-3 rounded-lg text-xs font-mono overflow-auto whitespace-pre-wrap break-all [overflow-wrap:anywhere]",
        "bg-neutral-50 text-neutral-700 border border-border-subtle",
        compact ? "max-h-40" : "max-h-64"
      )}
      data-testid={testId ? `${testId}-text` : undefined}
    >
      {content}
    </pre>
  );
}

function AudioViewer({
  src,
  testId,
}: {
  src: string;
  testId?: string;
}) {
  return (
    <audio
      controls
      className="w-full"
      data-testid={testId ? `${testId}-audio` : undefined}
    >
      <source src={src} />
    </audio>
  );
}

/* ------------------------------------------------------------------ */
/*  Hook: fetch text content for JSON / text viewers                   */
/* ------------------------------------------------------------------ */

function useFetchText(src: string) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    fetch(src)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((text) => {
        if (!cancelled) {
          setContent(text);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [src]);

  return { content, loading, error };
}
