import { colors, radius, typography } from "../design-system/tokens";
import { useVisibilityRuleDetail } from "../../hooks/useVisibilityRuleDetail";

const DASH = "—";
const MUTED: React.CSSProperties = { color: colors.neutral[500] };

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
          borderRadius: radius.sm,
          fontSize: typography.size.sm,
          fontWeight: 600,
          background: colors.neutral[50],
          color: colors.neutral[700],
          border: `1px solid ${colors.border.subtle}`,
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
        borderRadius: radius.sm,
        fontSize: typography.size.sm,
        fontWeight: 600,
        background: value ? colors.success.light : colors.error.light,
        color: value ? colors.success.text : colors.error.text,
      }}
    >
      {value ? "evet" : "hayır"}
    </span>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", padding: "0.375rem 0", borderBottom: `1px solid ${colors.neutral[100]}` }}>
      <span style={{ width: "160px", flexShrink: 0, color: colors.neutral[600], fontSize: typography.size.base }}>
        {label}
      </span>
      <span style={{ fontSize: typography.size.md, wordBreak: "break-word", overflowWrap: "anywhere" }}>{children}</span>
    </div>
  );
}

export function VisibilityRuleDetailPanel({ selectedId }: VisibilityRuleDetailPanelProps) {
  const { data, isLoading, isError, error } = useVisibilityRuleDetail(selectedId);

  if (!selectedId) {
    return (
      <div style={{ color: colors.neutral[500], padding: "1rem" }}>
        Detay görmek için bir visibility rule seçin.
      </div>
    );
  }

  if (isLoading) {
    return <div style={{ padding: "1rem", color: colors.neutral[600] }}>Yükleniyor...</div>;
  }

  if (isError) {
    return (
      <div style={{ padding: "1rem", color: colors.error.base }}>
        Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div style={{ padding: "1rem" }}>
      <h3 style={{ margin: "0 0 0.25rem", fontSize: typography.size.lg }} data-testid="visibility-detail-heading">Kural Detayı</h3>
      <p style={{ margin: "0 0 0.75rem", fontSize: typography.size.xs, color: colors.neutral[500] }} data-testid="visibility-detail-note">
        Kural bilgileri, kapsam ayarlari ve governance durumu asagida gorunur.
      </p>

      <div style={{ marginBottom: "0.5rem", fontSize: typography.size.xs, fontWeight: 600, color: colors.neutral[600], textTransform: "uppercase", letterSpacing: "0.05em" }} data-testid="visibility-section-identity">
        Kimlik ve Hedef
      </div>
      <Row label="Kural Turu">{data.rule_type ?? DASH}</Row>
      <Row label="Hedef Anahtar"><code>{data.target_key ?? DASH}</code></Row>

      <div style={{ marginTop: "0.75rem", marginBottom: "0.5rem", fontSize: typography.size.xs, fontWeight: 600, color: colors.neutral[600], textTransform: "uppercase", letterSpacing: "0.05em" }} data-testid="visibility-section-scope">
        Kapsam
      </div>
      <Row label="Modul Kapsami">{data.module_scope ?? <em style={MUTED}>—</em>}</Row>
      <Row label="Rol Kapsami">{data.role_scope ?? <em style={MUTED}>—</em>}</Row>
      <Row label="Mod Kapsami">{data.mode_scope ?? <em style={MUTED}>—</em>}</Row>

      <div style={{ marginTop: "0.75rem", marginBottom: "0.5rem", fontSize: typography.size.xs, fontWeight: 600, color: colors.neutral[600], textTransform: "uppercase", letterSpacing: "0.05em" }} data-testid="visibility-section-governance">
        Governance
      </div>
      <Row label="Gorunur"><BoolBadge value={data.visible} /></Row>
      <Row label="Salt Okunur"><BoolBadge value={data.read_only} /></Row>
      <Row label="Wizard Gorunur"><BoolBadge value={data.wizard_visible} /></Row>

      <div style={{ marginTop: "0.75rem", marginBottom: "0.5rem", fontSize: typography.size.xs, fontWeight: 600, color: colors.neutral[600], textTransform: "uppercase", letterSpacing: "0.05em" }} data-testid="visibility-section-status">
        Durum ve Notlar
      </div>
      <Row label="Durum">{data.status ?? DASH}</Row>
      <Row label="Oncelik">{data.priority ?? DASH}</Row>
      <Row label="Notlar">{data.notes ?? <em style={MUTED}>—</em>}</Row>
    </div>
  );
}
