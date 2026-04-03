import { useNavigate } from "react-router-dom";

const SUBTITLE: React.CSSProperties = {
  margin: "0 0 1.5rem",
  fontSize: "0.9375rem",
  color: "#475569",
  lineHeight: 1.6,
};

const GRID: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
  gap: "1rem",
  maxWidth: "720px",
};

const CARD: React.CSSProperties = {
  padding: "1.25rem 1.5rem",
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: "10px",
  cursor: "pointer",
  transition: "border-color 0.15s",
};

const CARD_ICON: React.CSSProperties = {
  width: "36px",
  height: "36px",
  borderRadius: "8px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "1rem",
  fontWeight: 700,
  color: "#fff",
  marginBottom: "0.75rem",
};

const CARD_TITLE: React.CSSProperties = {
  margin: "0 0 0.25rem",
  fontSize: "0.9375rem",
  fontWeight: 600,
  color: "#0f172a",
};

const CARD_DESC: React.CSSProperties = {
  margin: 0,
  fontSize: "0.8125rem",
  color: "#64748b",
  lineHeight: 1.5,
};

const CARD_CTA: React.CSSProperties = {
  display: "inline-block",
  marginTop: "0.75rem",
  fontSize: "0.8125rem",
  fontWeight: 600,
  color: "#2563eb",
};

const NOTE: React.CSSProperties = {
  marginTop: "1.5rem",
  padding: "0.75rem 1rem",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "6px",
  fontSize: "0.8125rem",
  color: "#64748b",
  lineHeight: 1.5,
  maxWidth: "720px",
};

const CONTENT_TYPES = [
  {
    icon: "V",
    iconBg: "#2563eb",
    title: "Standart Video",
    desc: "Konu, baslik ve icerik bilgilerini girerek yeni bir video icerigi olusturun. Uretim hattinda otomatik olarak islenir.",
    cta: "Yeni Video Olustur",
    to: "/admin/standard-videos/new",
    testId: "content-entry-standard-video",
  },
  {
    icon: "H",
    iconBg: "#7c3aed",
    title: "Haber Bulteni",
    desc: "Haber kaynaklarinizdan sectiginiz ogelerle bir bulten olusturun. Tarama, derleme ve uretim adimlari otomatik yurutulur.",
    cta: "Yeni Bulten Olustur",
    to: "/admin/news-bulletins/new",
    testId: "content-entry-news-bulletin",
  },
];

export function UserContentEntryPage() {
  const navigate = useNavigate();

  return (
    <div>
      <h2>Icerik</h2>
      <p style={SUBTITLE} data-testid="content-section-subtitle">
        Icerik uretim merkezi. Bir tur secerek yeni icerik olusturma
        akisina baslayabilirsiniz. Tamamlanan icerikler Yayin ekraninda
        takip edilebilir.
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
        Henuz icerik olusturmadiyseniz, yukaridaki turlerden birini secerek
        ilk iceriginizi baslatabilirsiniz. Icerik olusturma akislari yonetim
        panelinde calismaktadir ve sectiginiz tur sizi ilgili olusturma
        ekranina yonlendirecektir.
      </div>
    </div>
  );
}
