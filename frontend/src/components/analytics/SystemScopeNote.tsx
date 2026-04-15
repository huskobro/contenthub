/**
 * SystemScopeNote — Gate 5 A1/A2 Hybrid B.
 *
 * Used on analytics sections whose metrics are deliberately system-scope
 * (e.g. Source Impact, Prompt Assembly). The backend accepts user_id /
 * channel_id / platform filters for contract parity, but today these
 * reports aggregate across the entire system rather than filtering by
 * caller. Surfaces this fact to operators so they don't misinterpret
 * values after changing filter bar inputs.
 *
 * Render it directly inside the <SectionShell> at the top, above any
 * MetricGrid/DataTable children.
 */

import { cn } from "../../lib/cn";

interface SystemScopeNoteProps {
  /**
   * Optional short clarifier — prepended to the default sentence.
   * e.g. "Bu rapor" or "Bu bölüm". Defaults to "Bu rapor".
   */
  subject?: string;
  className?: string;
}

export function SystemScopeNote({ subject = "Bu rapor", className }: SystemScopeNoteProps) {
  return (
    <div
      role="note"
      data-testid="system-scope-note"
      className={cn(
        "mb-3 flex items-start gap-2 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900",
        className,
      )}
    >
      <svg
        className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
          clipRule="evenodd"
        />
      </svg>
      <span className="leading-relaxed">
        <strong className="font-semibold">{subject} sistem düzeyinde hesaplanır.</strong>{" "}
        Üst filtre çubuğundaki kullanıcı, kanal ve platform seçimleri bu bölüme uygulanmaz;
        değerler tüm sistem için toplanır.
      </span>
    </div>
  );
}
