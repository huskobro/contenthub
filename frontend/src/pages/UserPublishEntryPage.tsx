import { useNavigate } from "react-router-dom";
import { colors, typography, spacing, radius, transition } from "../components/design-system/tokens";

const SUBTITLE: React.CSSProperties = {
  margin: `0 0 ${spacing[6]}`,
  fontSize: typography.size.lg,
  color: colors.neutral[700],
  lineHeight: 1.6,
  maxWidth: "720px",
};

const GRID: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
  gap: spacing[4],
  maxWidth: "720px",
};

const CARD: React.CSSProperties = {
  padding: "1.25rem 1.5rem",
  background: colors.surface.card,
  border: `1px solid ${colors.border.default}`,
  borderRadius: "10px",
  cursor: "pointer",
  transition: `border-color ${transition.fast}`,
};

const CARD_ICON: React.CSSProperties = {
  width: "36px",
  height: "36px",
  borderRadius: radius.lg,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: typography.size.lg,
  fontWeight: typography.weight.bold,
  color: colors.neutral[0],
  marginBottom: spacing[3],
};

const CARD_TITLE: React.CSSProperties = {
  margin: `0 0 ${spacing[1]}`,
  fontSize: typography.size.lg,
  fontWeight: typography.weight.semibold,
  color: colors.neutral[950],
};

const CARD_DESC: React.CSSProperties = {
  margin: 0,
  fontSize: typography.size.base,
  color: colors.neutral[600],
  lineHeight: 1.5,
};

const CARD_CTA: React.CSSProperties = {
  display: "inline-block",
  marginTop: spacing[3],
  fontSize: typography.size.base,
  fontWeight: typography.weight.semibold,
  color: colors.brand[600],
};

const NOTE: React.CSSProperties = {
  marginTop: spacing[6],
  padding: `${spacing[3]} ${spacing[4]}`,
  background: colors.neutral[50],
  border: `1px solid ${colors.border.default}`,
  borderRadius: radius.md,
  fontSize: typography.size.base,
  color: colors.neutral[600],
  lineHeight: 1.5,
  maxWidth: "720px",
};

const CROSSLINK: React.CSSProperties = {
  marginTop: spacing[4],
  fontSize: typography.size.base,
  color: colors.neutral[600],
  maxWidth: "720px",
};

const CROSSLINK_BTN: React.CSSProperties = {
  cursor: "pointer",
  color: colors.brand[600],
  fontWeight: typography.weight.semibold,
  background: "none",
  border: "none",
  padding: 0,
  fontSize: "inherit",
};

const PUBLISH_ENTRIES = [
  {
    icon: "I",
    iconBg: colors.success.dark,
    title: "Isler",
    desc: "Uretim islerini ve yayin hazirligini takip edin. Tamamlanan isler yayin adimina hazirlanan iceriklerdir. Yayin durumu ve sonuclari buradan gorulur.",
    cta: "Isleri Goruntule",
    to: "/admin/jobs",
    testId: "publish-entry-jobs",
  },
  {
    icon: "V",
    iconBg: colors.brand[600],
    title: "Standart Videolar",
    desc: "Olusturulan videolarin yayin hazirligini inceleyin. Metadata, script ve uretim tamamlandiginda YouTube yayini tetiklenebilir.",
    cta: "Videolari Goruntule",
    to: "/admin/standard-videos",
    testId: "publish-entry-standard-videos",
  },
  {
    icon: "H",
    iconBg: colors.brand[700],
    title: "Haber Bultenleri",
    desc: "Derlenen haber bultenlerinin yayin hazirligini inceleyin. Script ve metadata tamamlandiginda yayin sureci baslatilabilir.",
    cta: "Bultenleri Goruntule",
    to: "/admin/news-bulletins",
    testId: "publish-entry-news-bulletins",
  },
];

export function UserPublishEntryPage() {
  const navigate = useNavigate();

  return (
    <div>
      <h2 data-testid="publish-heading">Yayin</h2>
      <p style={SUBTITLE} data-testid="publish-section-subtitle">
        Yayin ve dagitim merkezi. Gorev zincirinizin ucuncu adimi: Icerik
        ekraninda olusturulan iceriklerinizin yayin durumunu buradan takip
        edebilirsiniz. Tamamlanan uretim isleri yonetim panelinden yayinlanabilir.
      </p>
      <p
        style={{
          margin: `-${spacing[4]} 0 ${spacing[6]}`,
          fontSize: typography.size.base,
          color: colors.neutral[500],
          lineHeight: 1.5,
          maxWidth: "720px",
        }}
        data-testid="publish-workflow-chain"
      >
        Yayin zinciri: Icerik Uretimi &rarr; Readiness Kontrolu &rarr; Metadata Finalizasyonu &rarr; YouTube Yayini &rarr; Sonuc Takibi.
      </p>

      <div style={GRID}>
        {PUBLISH_ENTRIES.map((entry) => (
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

      <div style={NOTE} data-testid="publish-first-use-note">
        Henüz yayin sureci baslamadiysa, once Icerik ekranindan bir icerik
        olusturun. Tamamlanan icerikler buradaki yayin alanlarina duser.
        Yayin islemleri su an yonetim panelinde yurutulmektedir ve sectiginiz
        alan sizi ilgili yonetim ekranina yonlendirecektir.
      </div>

      <div style={CROSSLINK} data-testid="publish-crosslink-area">
        Henüz icerik uretmediseniz once{" "}
        <button
          style={CROSSLINK_BTN}
          onClick={() => navigate("/user/content")}
          data-testid="publish-to-content-crosslink"
        >
          Icerik ekraninden baslayabilirsiniz
        </button>
        .
      </div>
    </div>
  );
}
