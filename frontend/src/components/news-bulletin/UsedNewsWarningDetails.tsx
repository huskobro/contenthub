import { colors, radius, typography } from "../design-system/tokens";
interface Props {
  usedNewsCount: number;
  lastUsageType?: string | null;
  lastTargetModule?: string | null;
}

export function UsedNewsWarningDetails({ usedNewsCount, lastUsageType, lastTargetModule }: Props) {
  return (
    <div
      style={{
        fontSize: typography.size.sm,
        color: colors.warning.text,
        background: colors.warning.light,
        border: `1px solid ${colors.warning.light}`,
        borderRadius: radius.sm,
        padding: "0.25rem 0.5rem",
        marginTop: "0.2rem",
      }}
    >
      <span>Kullanım: {usedNewsCount}x</span>
      {lastUsageType && <span style={{ marginLeft: "0.5rem" }}>Tür: {lastUsageType}</span>}
      {lastTargetModule && <span style={{ marginLeft: "0.5rem" }}>Modül: {lastTargetModule}</span>}
    </div>
  );
}
