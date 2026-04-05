import { colors } from "../design-system/tokens";
import {
  NewsBulletinEnforcementStatusBadge,
  NewsBulletinEnforcementStatus,
} from "./NewsBulletinEnforcementStatusBadge";

interface Props {
  selectedNewsCount?: number | null;
  hasSelectedNewsWarning?: boolean | null;
  selectedNewsWarningCount?: number | null;
}

export function computeNewsBulletinEnforcement(
  selectedNewsCount: number | null | undefined,
  hasSelectedNewsWarning: boolean | null | undefined,
  selectedNewsWarningCount: number | null | undefined,
): NewsBulletinEnforcementStatus {
  if (selectedNewsCount == null) return "Bilinmiyor";
  if (selectedNewsCount <= 0) return "Temiz";
  if (hasSelectedNewsWarning || (selectedNewsWarningCount != null && selectedNewsWarningCount > 0)) {
    return "Uyarı var";
  }
  return "Temiz";
}

export function NewsBulletinEnforcementSummary({
  selectedNewsCount,
  hasSelectedNewsWarning,
  selectedNewsWarningCount,
}: Props) {
  const status = computeNewsBulletinEnforcement(
    selectedNewsCount,
    hasSelectedNewsWarning,
    selectedNewsWarningCount,
  );

  let detail = "";
  if (selectedNewsWarningCount != null && selectedNewsWarningCount > 0) {
    detail = `${selectedNewsWarningCount} uyarı`;
  } else if (selectedNewsCount != null && selectedNewsCount > 0) {
    detail = `${selectedNewsCount} haber`;
  } else {
    detail = "haber seçilmedi";
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
      <NewsBulletinEnforcementStatusBadge status={status} />
      <span style={{ fontSize: "0.68rem", color: colors.neutral[500] }}>{detail}</span>
    </div>
  );
}
