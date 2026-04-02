import type { NewsBulletinResponse } from "../../api/newsBulletinApi";
import { NewsBulletinArtifactSummary } from "./NewsBulletinArtifactSummary";

interface Props {
  bulletins: NewsBulletinResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function NewsBulletinsTable({ bulletins, selectedId, onSelect }: Props) {
  if (bulletins.length === 0) {
    return <p>Henüz news bulletin kaydı yok.</p>;
  }

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          <th style={{ textAlign: "left", padding: "6px 8px" }}>Title</th>
          <th style={{ textAlign: "left", padding: "6px 8px" }}>Topic</th>
          <th style={{ textAlign: "left", padding: "6px 8px" }}>Source Mode</th>
          <th style={{ textAlign: "left", padding: "6px 8px" }}>Style</th>
          <th style={{ textAlign: "left", padding: "6px 8px" }}>Status</th>
          <th style={{ textAlign: "left", padding: "6px 8px" }}>Language</th>
          <th style={{ textAlign: "left", padding: "6px 8px" }}>Artifacts</th>
          <th style={{ textAlign: "left", padding: "6px 8px" }}>Created</th>
        </tr>
      </thead>
      <tbody>
        {bulletins.map((b) => (
          <tr
            key={b.id}
            onClick={() => onSelect(b.id)}
            style={{
              cursor: "pointer",
              background: selectedId === b.id ? "#e8f0fe" : undefined,
            }}
          >
            <td style={{ padding: "6px 8px" }}>{b.title ?? "—"}</td>
            <td style={{ padding: "6px 8px" }}>{b.topic}</td>
            <td style={{ padding: "6px 8px" }}>{b.source_mode ?? "—"}</td>
            <td style={{ padding: "6px 8px" }}>{b.bulletin_style ?? "—"}</td>
            <td style={{ padding: "6px 8px" }}>{b.status}</td>
            <td style={{ padding: "6px 8px" }}>{b.language ?? "—"}</td>
            <td style={{ padding: "6px 8px" }}>
              <NewsBulletinArtifactSummary hasScript={b.has_script} hasMetadata={b.has_metadata} />
            </td>
            <td style={{ padding: "6px 8px" }}>
              {new Date(b.created_at).toLocaleDateString()}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
