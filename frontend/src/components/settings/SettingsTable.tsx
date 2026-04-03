import type { SettingResponse } from "../../api/settingsApi";

const DASH = "—";
const TH_STYLE: React.CSSProperties = { padding: "0.5rem" };
const TD_STYLE: React.CSSProperties = { padding: "0.5rem" };

interface SettingsTableProps {
  settings: SettingResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function SettingsTable({ settings, selectedId, onSelect }: SettingsTableProps) {
  if (settings.length === 0) {
    return <p style={{ color: "#64748b" }}>Henüz kayıtlı ayar yok.</p>;
  }

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
      <thead>
        <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left" }}>
          <th style={TD_STYLE}>key</th>
          <th style={TD_STYLE}>group_name</th>
          <th style={TD_STYLE}>type</th>
          <th style={TD_STYLE}>status</th>
          <th style={TD_STYLE}>version</th>
        </tr>
      </thead>
      <tbody>
        {settings.map((s) => (
          <tr
            key={s.id}
            onClick={() => onSelect(s.id)}
            style={{
              borderBottom: "1px solid #f1f5f9",
              cursor: "pointer",
              background: selectedId === s.id ? "#eff6ff" : "transparent",
            }}
          >
            <td style={{ padding: "0.5rem", fontFamily: "monospace", wordBreak: "break-all", overflowWrap: "anywhere" }}>{s.key ?? DASH}</td>
            <td style={{ padding: "0.5rem", wordBreak: "break-word", overflowWrap: "anywhere" }}>{s.group_name ?? DASH}</td>
            <td style={TD_STYLE}>{s.type ?? DASH}</td>
            <td style={TD_STYLE}>{s.status ?? DASH}</td>
            <td style={TD_STYLE}>{s.version ?? DASH}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
