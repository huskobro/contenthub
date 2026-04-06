interface Props {
  warning: boolean;
}

export function UsedNewsWarningBadge({ warning }: Props) {
  if (!warning) return null;

  return (
    <span className="inline-block px-1.5 py-[0.1rem] text-xs bg-warning-light text-warning-text border border-warning-light rounded-sm ml-1.5 whitespace-nowrap">
      Kullanım kaydı var
    </span>
  );
}
