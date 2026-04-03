import { useSettingDetail } from "../../hooks/useSettingDetail";

const DASH = "—";
const MUTED: React.CSSProperties = { color: "#94a3b8" };

interface SettingDetailPanelProps {
  selectedId: string | null;
}

function BoolBadge({ value }: { value: boolean | null | undefined }) {
  if (value == null) {
    return (
      <span
        style={{
          display: "inline-block",
          padding: "0.125rem 0.5rem",
          borderRadius: "4px",
          fontSize: "0.75rem",
          fontWeight: 600,
          background: "#f8fafc",
          color: "#475569",
          border: "1px solid #e2e8f0",
        }}
      >
        —
      </span>
    );
  }
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.125rem 0.5rem",
        borderRadius: "4px",
        fontSize: "0.75rem",
        fontWeight: 600,
        background: value ? "#dcfce7" : "#fef2f2",
        color: value ? "#166534" : "#991b1b",
      }}
    >
      {value ? "evet" : "hayır"}
    </span>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", padding: "0.375rem 0", borderBottom: "1px solid #f1f5f9" }}>
      <span style={{ width: "180px", flexShrink: 0, color: "#64748b", fontSize: "0.8125rem" }}>
        {label}
      </span>
      <span style={{ fontSize: "0.875rem", wordBreak: "break-word" }}>{children}</span>
    </div>
  );
}

export function SettingDetailPanel({ selectedId }: SettingDetailPanelProps) {
  const { data, isLoading, isError, error } = useSettingDetail(selectedId);

  if (!selectedId) {
    return (
      <div style={{ color: "#94a3b8", padding: "1rem" }}>
        Detay görmek için bir ayar seçin.
      </div>
    );
  }

  if (isLoading) {
    return <div style={{ padding: "1rem", color: "#64748b" }}>Yükleniyor...</div>;
  }

  if (isError) {
    return (
      <div style={{ padding: "1rem", color: "#dc2626" }}>
        Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div style={{ padding: "1rem" }}>
      <h3 style={{ margin: "0 0 0.75rem", fontSize: "1rem" }}>Ayar Detayı</h3>
      <Row label="key">
        <code>{data.key ?? DASH}</code>
      </Row>
      <Row label="group_name">{data.group_name ?? DASH}</Row>
      <Row label="type">{data.type ?? DASH}</Row>
      <Row label="default_value_json">
        <code style={{ wordBreak: "break-all", overflowWrap: "anywhere" }}>{data.default_value_json ?? DASH}</code>
      </Row>
      <Row label="admin_value_json">
        <code style={{ wordBreak: "break-all", overflowWrap: "anywhere" }}>{data.admin_value_json ?? DASH}</code>
      </Row>
      <Row label="user_override_allowed">
        <BoolBadge value={data.user_override_allowed} />
      </Row>
      <Row label="visible_to_user">
        <BoolBadge value={data.visible_to_user} />
      </Row>
      <Row label="visible_in_wizard">
        <BoolBadge value={data.visible_in_wizard} />
      </Row>
      <Row label="read_only_for_user">
        <BoolBadge value={data.read_only_for_user} />
      </Row>
      <Row label="module_scope">{data.module_scope ?? <em style={MUTED}>—</em>}</Row>
      <Row label="help_text">{data.help_text ?? <em style={MUTED}>—</em>}</Row>
      <Row label="status">{data.status ?? DASH}</Row>
      <Row label="version">{data.version ?? DASH}</Row>
    </div>
  );
}
