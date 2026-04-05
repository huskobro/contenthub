import { colors, radius, typography } from "../design-system/tokens";
import { useSettingDetail } from "../../hooks/useSettingDetail";

const DASH = "—";
const MUTED: React.CSSProperties = { color: colors.neutral[500] };

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
      <span style={{ width: "180px", flexShrink: 0, color: colors.neutral[600], fontSize: typography.size.base }}>
        {label}
      </span>
      <span style={{ fontSize: typography.size.md, wordBreak: "break-word" }}>{children}</span>
    </div>
  );
}

export function SettingDetailPanel({ selectedId }: SettingDetailPanelProps) {
  const { data, isLoading, isError, error } = useSettingDetail(selectedId);

  if (!selectedId) {
    return (
      <div style={{ color: colors.neutral[500], padding: "1rem" }}>
        Detay görmek için bir ayar seçin.
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

  if (!data) {
    return null;
  }

  return (
    <div style={{ padding: "1rem" }}>
      <h3 style={{ margin: "0 0 0.25rem", fontSize: typography.size.lg }} data-testid="setting-detail-heading">Ayar Detayı</h3>
      <p style={{ margin: "0 0 0.75rem", fontSize: typography.size.xs, color: colors.neutral[500] }} data-testid="setting-detail-note">
        Ayar bilgileri, degerleri ve governance durumu asagida gorunur.
      </p>

      <div style={{ marginBottom: "0.5rem", fontSize: typography.size.xs, fontWeight: 600, color: colors.neutral[600], textTransform: "uppercase", letterSpacing: "0.05em" }} data-testid="setting-section-identity">
        Kimlik ve Deger
      </div>
      <Row label="Anahtar">
        <code>{data.key ?? DASH}</code>
      </Row>
      <Row label="Grup">{data.group_name ?? DASH}</Row>
      <Row label="Tur">{data.type ?? DASH}</Row>
      <Row label="Varsayilan Deger">
        <code style={{ wordBreak: "break-all", overflowWrap: "anywhere" }}>{data.default_value_json ?? DASH}</code>
      </Row>
      <Row label="Admin Degeri">
        <code style={{ wordBreak: "break-all", overflowWrap: "anywhere" }}>{data.admin_value_json ?? DASH}</code>
      </Row>

      <div style={{ marginTop: "0.75rem", marginBottom: "0.5rem", fontSize: typography.size.xs, fontWeight: 600, color: colors.neutral[600], textTransform: "uppercase", letterSpacing: "0.05em" }} data-testid="setting-section-governance">
        Governance
      </div>
      <Row label="Kullanici Gorunur">
        <BoolBadge value={data.visible_to_user} />
      </Row>
      <Row label="Override Izni">
        <BoolBadge value={data.user_override_allowed} />
      </Row>
      <Row label="Wizard Gorunur">
        <BoolBadge value={data.visible_in_wizard} />
      </Row>
      <Row label="Salt Okunur">
        <BoolBadge value={data.read_only_for_user} />
      </Row>

      <div style={{ marginTop: "0.75rem", marginBottom: "0.5rem", fontSize: typography.size.xs, fontWeight: 600, color: colors.neutral[600], textTransform: "uppercase", letterSpacing: "0.05em" }} data-testid="setting-section-scope">
        Kapsam ve Durum
      </div>
      <Row label="Modul Kapsami">{data.module_scope ?? <em style={MUTED}>—</em>}</Row>
      <Row label="Aciklama">{data.help_text ?? <em style={MUTED}>—</em>}</Row>
      <Row label="Durum">{data.status ?? DASH}</Row>
      <Row label="Versiyon">{data.version ?? DASH}</Row>
    </div>
  );
}
