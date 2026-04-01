import { useVisibilityRuleDetail } from "../../hooks/useVisibilityRuleDetail";

interface VisibilityRuleDetailPanelProps {
  selectedId: string | null;
}

function BoolBadge({ value }: { value: boolean }) {
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
      <span style={{ width: "160px", flexShrink: 0, color: "#64748b", fontSize: "0.8125rem" }}>
        {label}
      </span>
      <span style={{ fontSize: "0.875rem", wordBreak: "break-word" }}>{children}</span>
    </div>
  );
}

export function VisibilityRuleDetailPanel({ selectedId }: VisibilityRuleDetailPanelProps) {
  const { data, isLoading, isError, error } = useVisibilityRuleDetail(selectedId);

  if (!selectedId) {
    return (
      <div style={{ color: "#94a3b8", padding: "1rem" }}>
        Detay görmek için bir visibility rule seçin.
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

  if (!data) return null;

  return (
    <div style={{ padding: "1rem" }}>
      <h3 style={{ margin: "0 0 0.75rem", fontSize: "1rem" }}>Rule Detayı</h3>
      <Row label="rule_type">{data.rule_type}</Row>
      <Row label="target_key"><code>{data.target_key}</code></Row>
      <Row label="module_scope">{data.module_scope ?? <em style={{ color: "#94a3b8" }}>—</em>}</Row>
      <Row label="role_scope">{data.role_scope ?? <em style={{ color: "#94a3b8" }}>—</em>}</Row>
      <Row label="mode_scope">{data.mode_scope ?? <em style={{ color: "#94a3b8" }}>—</em>}</Row>
      <Row label="visible"><BoolBadge value={data.visible} /></Row>
      <Row label="read_only"><BoolBadge value={data.read_only} /></Row>
      <Row label="wizard_visible"><BoolBadge value={data.wizard_visible} /></Row>
      <Row label="status">{data.status}</Row>
      <Row label="priority">{data.priority}</Row>
      <Row label="notes">{data.notes ?? <em style={{ color: "#94a3b8" }}>—</em>}</Row>
    </div>
  );
}
