interface Props {
  count: number;
}

export function NewsBulletinSelectedNewsCountBadge({ count }: Props) {
  return (
    <span
      className={`inline-block px-1.5 py-[0.1rem] text-xs rounded-sm whitespace-nowrap min-w-[1.5rem] text-center border ${
        count > 0
          ? "bg-info-light text-info-dark border-info-light"
          : "bg-neutral-100 text-neutral-500 border-border"
      }`}
    >
      {count}
    </span>
  );
}
