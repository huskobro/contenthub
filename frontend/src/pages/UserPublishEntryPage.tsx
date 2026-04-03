import { useNavigate } from "react-router-dom";

const SUBTITLE: React.CSSProperties = {
  margin: "0 0 1.5rem",
  fontSize: "0.9375rem",
  color: "#475569",
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

const CROSSLINK: React.CSSProperties = {
  marginTop: "1rem",
  fontSize: "0.8125rem",
  color: "#64748b",
  maxWidth: "720px",
};

const CROSSLINK_BTN: React.CSSProperties = {
  cursor: "pointer",
  color: "#2563eb",
  fontWeight: 600,
  background: "none",
  border: "none",
  padding: 0,
  fontSize: "inherit",
};

const PUBLISH_ENTRIES = [
  {
    icon: "I",
    iconBg: "#059669",
    title: "Isler",
    desc: "Uretim islerini ve yayin hazirligini takip edin. Tamamlanan isler yayin adimina hazirlanan iceriklerdir. Yayin durumu ve sonuclari buradan gorulur.",
    cta: "Isleri Goruntule",
    to: "/admin/jobs",
    testId: "publish-entry-jobs",
  },
  {
    icon: "V",
    iconBg: "#2563eb",
    title: "Standart Videolar",
    desc: "Olusturulan videolarin yayin hazirligini inceleyin. Metadata, script ve uretim tamamlandiginda YouTube yayini tetiklenebilir.",
    cta: "Videolari Goruntule",
    to: "/admin/standard-videos",
    testId: "publish-entry-standard-videos",
  },
  {
    icon: "H",
    iconBg: "#7c3aed",
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
          margin: "-1rem 0 1.5rem",
          fontSize: "0.8125rem",
          color: "#94a3b8",
          lineHeight: 1.5,
          maxWidth: "720px",
        }}
        data-testid="publish-workflow-chain"
      >
        Yayin zinciri: Icerik Uretimi → Readiness Kontrolu → Metadata Finalizasyonu → YouTube Yayini → Sonuc Takibi.
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
        Henuz yayin sureci baslamadiysa, once Icerik ekranindan bir icerik
        olusturun. Tamamlanan icerikler buradaki yayin alanlarina duser.
        Yayin islemleri su an yonetim panelinde yurutulmektedir ve sectiginiz
        alan sizi ilgili yonetim ekranina yonlendirecektir.
      </div>

      <div style={CROSSLINK} data-testid="publish-crosslink-area">
        Henuz icerik uretmediseniz once{" "}
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
