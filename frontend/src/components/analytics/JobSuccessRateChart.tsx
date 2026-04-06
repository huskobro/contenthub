interface Props {
  rate: number | null | undefined;
  label?: string;
}

export function JobSuccessRateChart({ rate, label = "Is Basari Orani" }: Props) {
  if (rate == null) return null;

  const pct = Math.round(rate * 100);
  const barColor = pct >= 80 ? "bg-success-base" : pct >= 50 ? "bg-warning-base" : "bg-error-base";

  return (
    <div
      className="p-4 bg-surface-card border border-border-subtle rounded-lg"
      data-testid="job-success-rate-chart"
    >
      <div className="text-xs text-neutral-600 mb-1">{label}</div>
      <div className="text-2xl font-bold text-neutral-900 mb-2">{pct}%</div>
      <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
