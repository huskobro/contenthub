/**
 * SnapshotLockDisclaimer — Gate 5 D1.
 *
 * Informational banner for analytics dashboards reminding operators
 * that aggregated metrics reflect the snapshot-locked settings/templates
 * each job ran with — not the current admin configuration. Used on the
 * admin YouTube analytics dashboard and anywhere metrics span historical
 * jobs that may have used older prompt/template versions.
 *
 * Visual: neutral slate-blue callout (distinct from amber SystemScopeNote
 * and green success banners) so operators recognize it as context, not
 * warning.
 */

import { cn } from "../../lib/cn";

interface SnapshotLockDisclaimerProps {
  className?: string;
  /** Override the default message if this banner is used on a non-jobs page. */
  message?: string;
}

const DEFAULT_MESSAGE =
  "Aşağıdaki metrikler, her işin çalıştığı andaki snapshot-lock değerleri (ayarlar, şablonlar, prompt sürümleri) üzerinden hesaplanır. Admin panelindeki güncel yapılandırma ile birebir uyuşmayabilir.";

export function SnapshotLockDisclaimer({
  className,
  message = DEFAULT_MESSAGE,
}: SnapshotLockDisclaimerProps) {
  return (
    <div
      role="note"
      data-testid="snapshot-lock-disclaimer"
      className={cn(
        "mb-3 flex items-start gap-2 rounded border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-700",
        className,
      )}
    >
      <svg
        className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-500"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
          clipRule="evenodd"
        />
      </svg>
      <span className="leading-relaxed">{message}</span>
    </div>
  );
}
