import { NewsBulletinSourceCoverageBadge, NewsBulletinSourceCoverageLevel } from "./NewsBulletinSourceCoverageBadge";
import { safeNumber } from "../../lib/safeNumber";
import { colors } from "../design-system/tokens";

interface Props {
  selectedNewsCount?: number;
  selectedNewsSourceCount?: number;
  hasMissingSource?: boolean;
}

export function computeNewsBulletinSourceCoverage(
  selectedNewsCount: number | undefined,
  selectedNewsSourceCount: number | undefined,
  hasMissingSource: boolean | undefined,
): NewsBulletinSourceCoverageLevel {
  const count = selectedNewsCount ?? 0;
  const sourceCount = selectedNewsSourceCount ?? 0;

  if (count <= 0) return "Kaynak yok";
  if (sourceCount <= 0) return "Kaynak bilgisi eksik";
  if (sourceCount === 1) return "Tek kaynak";
  return "Çoklu kaynak";
}

export function NewsBulletinSourceCoverageSummary({
  selectedNewsCount,
  selectedNewsSourceCount,
  hasMissingSource,
}: Props) {
  const level = computeNewsBulletinSourceCoverage(selectedNewsCount, selectedNewsSourceCount, hasMissingSource);

  const safeSourceCount = safeNumber(selectedNewsSourceCount, 0);
  const detail =
    safeSourceCount > 0
      ? `${safeSourceCount} kaynak${hasMissingSource ? " • eksik var" : ""}`
      : selectedNewsCount && selectedNewsCount > 0
      ? "kaynak bilgisi yok"
      : "seçili haber yok";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
      <NewsBulletinSourceCoverageBadge level={level} />
      <span style={{ fontSize: "0.68rem", color: colors.neutral[500] }}>{detail}</span>
    </div>
  );
}
