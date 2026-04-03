import { useNavigate } from "react-router-dom";

const SECTION: React.CSSProperties = {
  marginTop: "1.5rem",
  maxWidth: "720px",
};

const SECTION_HEADING: React.CSSProperties = {
  margin: "0 0 0.25rem",
  fontSize: "1rem",
  fontWeight: 600,
  color: "#0f172a",
};

const SECTION_DESC: React.CSSProperties = {
  margin: "0 0 1rem",
  fontSize: "0.8125rem",
  color: "#64748b",
  lineHeight: 1.5,
};

const GRID: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
  gap: "0.75rem",
};

const CARD: React.CSSProperties = {
  padding: "1rem 1.25rem",
  background: "#fff",
  border: "1px solid #e2e8f0",
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
  fontSize: "0.875rem",
  fontWeight: 700,
  color: "#fff",
  marginBottom: "0.5rem",
};

const CARD_TITLE: React.CSSProperties = {
  margin: "0 0 0.25rem",
  fontSize: "0.875rem",
  fontWeight: 600,
  color: "#0f172a",
};

const CARD_DESC: React.CSSProperties = {
  margin: 0,
  fontSize: "0.75rem",
  color: "#64748b",
  lineHeight: 1.4,
};

const CARD_CTA: React.CSSProperties = {
  display: "inline-block",
  marginTop: "0.5rem",
  fontSize: "0.75rem",
  fontWeight: 600,
  color: "#2563eb",
};

const HUB_ENTRIES = [
  {
    icon: "I",
    iconBg: "#2563eb",
    title: "Icerik",
    desc: "Ilk adim: yeni icerik olusturun veya mevcut icerikleri inceleyin.",
    cta: "Icerige Git",
    to: "/user/content",
    testId: "hub-action-content",
  },
  {
    icon: "Y",
    iconBg: "#7c3aed",
    title: "Yayin",
    desc: "Sonraki adim: olusturulan iceriklerin yayin durumunu takip edin.",
    cta: "Yayina Git",
    to: "/user/publish",
    testId: "hub-action-publish",
  },
  {
    icon: "P",
    iconBg: "#059669",
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
