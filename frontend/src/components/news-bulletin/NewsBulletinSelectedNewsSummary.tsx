import { NewsBulletinSelectedNewsCountBadge } from "./NewsBulletinSelectedNewsCountBadge";

interface Props {
  selectedNewsCount?: number;
}

export function NewsBulletinSelectedNewsSummary({ selectedNewsCount }: Props) {
  const count = selectedNewsCount ?? 0;
  return (
    <div className="flex items-center gap-[0.3rem] text-base text-neutral-600">
      <NewsBulletinSelectedNewsCountBadge count={count} />
      <span>{count === 0 ? "Haber yok" : "haber"}</span>
    </div>
  );
}
