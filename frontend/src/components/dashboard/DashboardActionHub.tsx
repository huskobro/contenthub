import { colors, typography } from "../design-system/tokens";
import { useNavigate } from "react-router-dom";

const SECTION: React.CSSProperties = {
  marginTop: "1.5rem",
  maxWidth: "720px",
};

const SECTION_HEADING: React.CSSProperties = {
  margin: "0 0 0.25rem",
  fontSize: typography.size.lg,
  fontWeight: 600,
  color: colors.neutral[900],
};

const SECTION_DESC: React.CSSProperties = {
  margin: "0 0 1rem",
  fontSize: typography.size.base,
  color: colors.neutral[600],
  lineHeight: 1.5,
};

const GRID: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
  gap: "0.75rem",
};

const CARD: React.CSSProperties = {
  padding: "1rem 1.25rem",
  background: colors.neutral[0],
  border: `1px solid ${colors.border.subtle}`,
  borderRadius: "10px",
  cursor: "pointer",
};

const CARD_ICON: React.CSSProperties = {
  width: "32px",
  height: "32px",
  borderRadius: "7px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: typography.size.md,
  fontWeight: 700,
  color: colors.neutral[0],
  marginBottom: "0.5rem",
};

const CARD_TITLE: React.CSSProperties = {
  margin: "0 0 0.25rem",
  fontSize: typography.size.md,
  fontWeight: 600,
  color: colors.neutral[900],
};

const CARD_DESC: React.CSSProperties = {
  margin: 0,
  fontSize: typography.size.sm,
  color: colors.neutral[600],
  lineHeight: 1.4,
};

const CARD_CTA: React.CSSProperties = {
  display: "inline-block",
  marginTop: "0.5rem",
  fontSize: typography.size.sm,
  fontWeight: 600,
  color: colors.brand[600],
};

const HUB_ENTRIES = [
  {
    icon: "I",
    iconBg: colors.brand[600],
    title: "Icerik",
    desc: "Ilk adim: yeni icerik olusturun veya mevcut icerikleri inceleyin.",
    cta: "Icerige Git",
    to: "/user/content",
    testId: "hub-action-content",
  },
  {
    icon: "Y",
    iconBg: colors.brand[700],
    title: "Yayin",
    desc: "Sonraki adim: olusturulan iceriklerin yayin durumunu takip edin.",
    cta: "Yayina Git",
    to: "/user/publish",
    testId: "hub-action-publish",
  },
  {
    icon: "P",
    iconBg: colors.success.dark,
    title: "Yonetim Paneli",
    desc: "Uretim ve yonetim merkezi: ayarlar, sablonlar, kaynaklar ve islemleri yonetin.",
    cta: "Yonetim Paneline Git",
    to: "/admin",
    testId: "hub-action-admin",
  },
];

export function DashboardActionHub() {
  const navigate = useNavigate();

  return (
    <div style={SECTION} data-testid="dashboard-action-hub">
      <h3 style={SECTION_HEADING}>Hizli Erisim</h3>
      <p style={SECTION_DESC} data-testid="hub-flow-desc">
        Once icerik olusturun, ardindan yayin surecini takip edin.
        Detayli islemler icin yonetim panelini kullanin.
      </p>

      <div style={GRID}>
        {HUB_ENTRIES.map((entry) => (
          <div
            key={entry.to}
            style={CARD}
            onClick={() => navigate(entry.to)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && navigate(entry.to)}
            data-testid={entry.testId}
          >
            <div style={{ ...CARD_ICON, background: entry.iconBg }}>{entry.icon}</div>
            <p style={CARD_TITLE}>{entry.title}</p>
            <p style={CARD_DESC}>{entry.desc}</p>
            <span style={CARD_CTA}>{entry.cta} &rarr;</span>
          </div>
        ))}
      </div>
    </div>
  );
}
