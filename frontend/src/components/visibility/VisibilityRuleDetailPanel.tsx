import { useVisibilityRuleDetail } from "../../hooks/useVisibilityRuleDetail";

const DASH = "—";
const MUTED: React.CSSProperties = { color: "#94a3b8" };

interface VisibilityRuleDetailPanelProps {
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
      <span style={{ width: "160px", flexShrink: 0, color: "#64748b", fontSize: "0.8125rem" }}>
        {label}
      </span>
      <span style={{ fontSize: "0.875rem", wordBreak: "break-word", overflowWrap: "anywhere" }}>{children}</span>
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
      <h3 style={{ margin: "0 0 0.25rem", fontSize: "1rem" }} data-testid="visibility-detail-heading">Kural Detayi</h3>
      <p style={{ margin: "0 0 0.75rem", fontSize: "0.6875rem", color: "#94a3b8" }} data-testid="visibility-detail-note">
        Kural bilgileri, kapsam ayarlari ve governance durumu asagida gorunur.
      </p>

      <div style={{ marginBottom: "0.5rem", fontSize: "0.6875rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }} data-testid="visibility-section-identity">
        Kimlik ve Hedef
      </div>
      <Row label="Kural Turu">{data.rule_type ?? DASH}</Row>
      <Row label="Hedef Anahtar"><code>{data.target_key ?? DASH}</code></Row>

      <div style={{ marginTop: "0.75rem", marginBottom: "0.5rem", fontSize: "0.6875rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }} data-testid="visibility-section-scope">
        Kapsam
      </div>
      <Row label="Modul Kapsami">{data.module_scope ?? <em style={MUTED}>—</em>}</Row>
      <Row label="Rol Kapsami">{data.role_scope ?? <em style={MUTED}>—</em>}</Row>
      <Row label="Mod Kapsami">{data.mode_scope ?? <em style={MUTED}>—</em>}</Row>

      <div style={{ marginTop: "0.75rem", marginBottom: "0.5rem", fontSize: "0.6875rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }} data-testid="visibility-section-governance">
        Governance
      </div>
      <Row label="Gorunur"><BoolBadge value={data.visible} /></Row>
      <Row label="Salt Okunur"><BoolBadge value={data.read_only} /></Row>
      <Row label="Wizard Gorunur"><BoolBadge value={data.wizard_visible} /></Row>

      <div style={{ marginTop: "0.75rem", marginBottom: "0.5rem", fontSize: "0.6875rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }} data-testid="visibility-section-status">
        Durum ve Notlar
      </div>
      <Row label="Durum">{data.status ?? DASH}</Row>
      <Row label="Oncelik">{data.priority ?? DASH}</Row>
      <Row label="Notlar">{data.notes ?? <em style={MUTED}>—</em>}</Row>
    </div>
  );
}
