import { colors, typography } from "../design-system/tokens";
import { NewsBulletinSelectedNewsCountBadge } from "./NewsBulletinSelectedNewsCountBadge";

interface Props {
  selectedNewsCount?: number;
}

export function NewsBulletinSelectedNewsSummary({ selectedNewsCount }: Props) {
  const count = selectedNewsCount ?? 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: typography.size.base, color: colors.neutral[600] }}>
      <NewsBulletinSelectedNewsCountBadge count={count} />
      <span>{count === 0 ? "Haber yok" : "haber"}</span>
    </div>
  );
}
