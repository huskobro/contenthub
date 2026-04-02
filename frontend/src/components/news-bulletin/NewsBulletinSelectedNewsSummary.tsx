import { NewsBulletinSelectedNewsCountBadge } from "./NewsBulletinSelectedNewsCountBadge";

interface Props {
  selectedNewsCount?: number;
}

export function NewsBulletinSelectedNewsSummary({ selectedNewsCount }: Props) {
  const count = selectedNewsCount ?? 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.8rem", color: "#64748b" }}>
      <NewsBulletinSelectedNewsCountBadge count={count} />
      <span>{count === 0 ? "Haber yok" : "haber"}</span>
    </div>
  );
}
