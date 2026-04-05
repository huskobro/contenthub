import { colors, radius, typography } from "../components/design-system/tokens";
import { useNavigate } from "react-router-dom";

const SUBTITLE: React.CSSProperties = {
  margin: "0 0 1.5rem",
  fontSize: typography.size.lg,
  color: colors.neutral[700],
  lineHeight: 1.6,
  maxWidth: "720px",
};

const GRID: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
  gap: "1rem",
  maxWidth: "720px",
};

const CARD: React.CSSProperties = {
  padding: "1.25rem 1.5rem",
  background: colors.neutral[0],
  border: `1px solid ${colors.border.subtle}`,
  borderRadius: "10px",
  cursor: "pointer",
  transition: "border-color 0.15s",
};

const CARD_ICON: React.CSSProperties = {
  width: "36px",
  height: "36px",
  borderRadius: radius.lg,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: typography.size.lg,
  fontWeight: 700,
  color: colors.neutral[0],
  marginBottom: "0.75rem",
};

const CARD_TITLE: React.CSSProperties = {
  margin: "0 0 0.25rem",
  fontSize: typography.size.lg,
  fontWeight: 600,
  color: colors.neutral[900],
};

const CARD_DESC: React.CSSProperties = {
  margin: 0,
  fontSize: typography.size.base,
  color: colors.neutral[600],
  lineHeight: 1.5,
};

const CARD_CTA: React.CSSProperties = {
  display: "inline-block",
  marginTop: "0.75rem",
  fontSize: typography.size.base,
  fontWeight: 600,
  color: colors.brand[600],
};

const NOTE: React.CSSProperties = {
  marginTop: "1.5rem",
  padding: "0.75rem 1rem",
  background: colors.neutral[50],
  border: `1px solid ${colors.border.subtle}`,
  borderRadius: radius.md,
  fontSize: typography.size.base,
  color: colors.neutral[600],
  lineHeight: 1.5,
  maxWidth: "720px",
};

const CROSSLINK: React.CSSProperties = {
  marginTop: "1rem",
  fontSize: typography.size.base,
  color: colors.neutral[600],
  maxWidth: "720px",
};

const CROSSLINK_BTN: React.CSSProperties = {
  cursor: "pointer",
  color: colors.brand[600],
  fontWeight: 600,
  background: "none",
  border: "none",
  padding: 0,
  fontSize: "inherit",
};

const CONTENT_TYPES = [
  {
    icon: "V",
    iconBg: colors.brand[600],
    title: "Standart Video",
    desc: "Ana uretim akisi: konu, baslik ve icerik bilgilerini girerek standart video uretimini baslatin. Uretim hattinda otomatik olarak islenir.",
    cta: "Yeni Video Olustur",
    to: "/admin/standard-videos/new",
    testId: "content-entry-standard-video",
  },
  {
    icon: "H",
    iconBg: colors.brand[700],
    title: "Haber Bulteni",
    desc: "Ikinci uretim akisi: haber kaynaklarinizdan sectiginiz haberlerle bulten olusturun. Kaynak tarama, haber secimi, script ve metadata adimlari ilerleyecektir.",
    cta: "Yeni Bulten Olustur",
    to: "/admin/news-bulletins/new",
    testId: "content-entry-news-bulletin",
  },
];

export function UserContentEntryPage() {
  const navigate = useNavigate();

  return (
    <div>
      <h2 data-testid="content-heading">Icerik</h2>
      <p style={SUBTITLE} data-testid="content-section-subtitle">
        Icerik uretim merkezi. Gorev zincirinizin ikinci adimi: bir tur
        secerek yeni icerik olusturma akisina baslayabilirsiniz. Tamamlanan
        icerikler Yayin ekraninda takip edilebilir.
      </p>

      <div style={GRID}>
        {CONTENT_TYPES.map((ct) => (
          <div
            key={ct.to}
            style={CARD}
            onClick={() => navigate(ct.to)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && navigate(ct.to)}
            data-testid={ct.testId}
          >
            <div style={{ ...CARD_ICON, background: ct.iconBg }}>{ct.icon}</div>
            <p style={CARD_TITLE}>{ct.title}</p>
            <p style={CARD_DESC}>{ct.desc}</p>
            <span style={CARD_CTA}>{ct.cta} &rarr;</span>
          </div>
        ))}
      </div>

      <div style={NOTE} data-testid="content-first-use-note">
        Henüz icerik olusturmadiyseniz, yukaridaki turlerden birini secerek
        ilk iceriginizi baslatabilirsiniz. Icerik olusturma akislari yonetim
        panelinde calismaktadir ve sectiginiz tur sizi ilgili olusturma
        ekranina yonlendirecektir.
      </div>

      <div style={CROSSLINK} data-testid="content-crosslink-area">
        Iceriklerin yayin durumunu takip etmek icin{" "}
        <button
          style={CROSSLINK_BTN}
          onClick={() => navigate("/user/publish")}
          data-testid="content-to-publish-crosslink"
        >
          Yayin ekranina gecebilirsiniz
        </button>
        . Mevcut iceriklerinizi goruntulemek icin{" "}
        <button
          style={CROSSLINK_BTN}
          onClick={() => navigate("/admin/library")}
          data-testid="content-to-library-crosslink"
        >
          Icerik Kutuphanesine gidin
        </button>
        .
      </div>
    </div>
  );
}
