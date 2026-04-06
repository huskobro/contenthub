import { cn } from "../../lib/cn";
import type { SettingResponse } from "../../api/settingsApi";

const DASH = "—";

interface SettingsTableProps {
  settings: SettingResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function SettingsTable({ settings, selectedId, onSelect }: SettingsTableProps) {
  if (settings.length === 0) {
    return <p className="text-neutral-600">Henüz kayıtlı ayar yok.</p>;
  }

  return (
    <table className="w-full border-collapse text-md">
      <thead>
        <tr className="border-b-2 border-border-subtle text-left">
          <th className="p-2">key</th>
          <th className="p-2">group_name</th>
          <th className="p-2">type</th>
          <th className="p-2">status</th>
          <th className="p-2">version</th>
        </tr>
      </thead>
      <tbody>
        {settings.map((s) => (
          <tr
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={cn(
              "border-b border-neutral-100 cursor-pointer",
              selectedId === s.id ? "bg-info-light" : "bg-transparent",
            )}
          >
            <td className="p-2 font-mono break-all [overflow-wrap:anywhere]">{s.key ?? DASH}</td>
            <td className="p-2 break-words [overflow-wrap:anywhere]">{s.group_name ?? DASH}</td>
            <td className="p-2">{s.type ?? DASH}</td>
            <td className="p-2">{s.status ?? DASH}</td>
            <td className="p-2">{s.version ?? DASH}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
