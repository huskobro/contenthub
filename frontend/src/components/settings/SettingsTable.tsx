import type { SettingResponse } from "../../api/settingsApi";

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
          <th style={{ padding: "0.5rem" }}>key</th>
          <th style={{ padding: "0.5rem" }}>group_name</th>
          <th style={{ padding: "0.5rem" }}>type</th>
          <th style={{ padding: "0.5rem" }}>status</th>
          <th style={{ padding: "0.5rem" }}>version</th>
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
            <td style={{ padding: "0.5rem", fontFamily: "monospace" }}>{s.key}</td>
            <td style={{ padding: "0.5rem" }}>{s.group_name}</td>
            <td style={{ padding: "0.5rem" }}>{s.type}</td>
            <td style={{ padding: "0.5rem" }}>{s.status}</td>
            <td style={{ padding: "0.5rem" }}>{s.version}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
