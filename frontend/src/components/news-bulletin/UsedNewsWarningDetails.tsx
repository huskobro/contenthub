interface Props {
  usedNewsCount: number;
  lastUsageType?: string | null;
  lastTargetModule?: string | null;
}

export function UsedNewsWarningDetails({ usedNewsCount, lastUsageType, lastTargetModule }: Props) {
  return (
    <div
      style={{
        fontSize: "0.75rem",
        color: "#78350f",
        background: "#fffbeb",
        border: "1px solid #fde68a",
        borderRadius: "3px",
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
