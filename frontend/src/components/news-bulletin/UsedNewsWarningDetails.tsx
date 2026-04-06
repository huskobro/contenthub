interface Props {
  usedNewsCount: number;
  lastUsageType?: string | null;
  lastTargetModule?: string | null;
}

export function UsedNewsWarningDetails({ usedNewsCount, lastUsageType, lastTargetModule }: Props) {
  return (
    <div className="text-sm text-warning-text bg-warning-light border border-warning-light rounded-sm px-2 py-1 mt-0.5">
      <span>Kullanım: {usedNewsCount}x</span>
      {lastUsageType && <span className="ml-2">Tür: {lastUsageType}</span>}
      {lastTargetModule && <span className="ml-2">Modül: {lastTargetModule}</span>}
    </div>
  );
}
