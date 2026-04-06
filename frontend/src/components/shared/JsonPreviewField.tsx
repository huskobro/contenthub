import { safeJsonPretty } from "../../lib/safeJson";

interface JsonPreviewFieldProps {
  label: string;
  value: string | null | undefined;
}

/** Reusable JSON preview block with safe parse, overflow handling, and null fallback. */
export function JsonPreviewField({ label, value }: JsonPreviewFieldProps) {
  if (!value) {
    return (
      <div className="mb-3">
        <div className="text-sm font-semibold text-neutral-600 mb-1">
          {label}
        </div>
        <span className="text-neutral-500 text-md">&mdash;</span>
      </div>
    );
  }

  return (
    <div className="mb-3">
      <div className="text-sm font-semibold text-neutral-600 mb-1">
        {label}
      </div>
      <pre
        className="m-0 p-2 bg-neutral-50 border border-border-subtle rounded-sm text-base overflow-x-auto max-h-[120px] whitespace-pre-wrap break-all [overflow-wrap:anywhere]"
      >
        {safeJsonPretty(value)}
      </pre>
    </div>
  );
}
