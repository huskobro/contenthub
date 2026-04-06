interface Props {
  usageCount?: number;
}

export function NewsItemUsageBadge({ usageCount }: Props) {
  const count = usageCount ?? 0;
  if (count === 0) {
    return <span className="text-xs text-neutral-500">Kullanılmamış</span>;
  }
  return (
    <span className="inline-block px-1.5 py-[0.1rem] text-xs rounded-sm bg-warning-light text-warning-text border border-warning-light whitespace-nowrap">
      {count}x kullanıldı
    </span>
  );
}
