interface Props {
  present: boolean;
  label: string;
}

export function NewsBulletinArtifactStatusBadge({ present, label }: Props) {
  return (
    <span
      className={`inline-block px-1.5 py-[0.1rem] text-xs rounded-sm whitespace-nowrap border ${
        present
          ? "bg-success-light text-success-text border-success-light"
          : "bg-neutral-100 text-neutral-500 border-border"
      }`}
    >
      {label}: {present ? "Var" : "Eksik"}
    </span>
  );
}
