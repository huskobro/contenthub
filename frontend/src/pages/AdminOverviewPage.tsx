import { useNavigate } from "react-router-dom";

const SECTION: React.CSSProperties = {
  marginBottom: "1.5rem",
};

const SUBTITLE: React.CSSProperties = {
  margin: "0 0 1.5rem",
  fontSize: "0.9375rem",
  color: "#475569",
  lineHeight: 1.6,
  maxWidth: "720px",
};

const GRID: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
  gap: "0.75rem",
};

const CARD: React.CSSProperties = {
  padding: "1rem 1.25rem",
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: "10px",
  cursor: "pointer",
  transition: "border-color 0.15s",
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
  lineHeight: 1.5,
};

const QUICK_LINKS = [
  {
    title: "Yeni Video Olustur",
    desc: "Ana uretim akisi: standart video icerigi olusturmaya basla",
    to: "/admin/standard-videos/new",
    testId: "quick-link-new-video",
  },
  {
    title: "Kaynaklar",
    desc: "Haber kaynaklarini yonet ve tara",
    to: "/admin/sources",
    testId: "quick-link-sources",
  },
  {
    title: "Sablonlar",
    desc: "Icerik ve stil sablonlarini duzenle",
    to: "/admin/templates",
    testId: "quick-link-templates",
  },
  {
    title: "Isler",
    desc: "Uretim islerini takip et",
    to: "/admin/jobs",
    testId: "quick-link-jobs",
  },
  {
    title: "Ayarlar",
    desc: "Sistem yapilandirmasini yonet",
    to: "/admin/settings",
    testId: "quick-link-settings",
  },
  {
    title: "Haber Bultenleri",
    desc: "Bulten icerigi olustur ve yonet",
    to: "/admin/news-bulletins",
    testId: "quick-link-news-bulletins",
  },
];

export function AdminOverviewPage() {
  const navigate = useNavigate();

  return (
    <div>
      <h2>Genel Bakis</h2>
      <div style={SECTION}>
        <p style={SUBTITLE} data-testid="admin-overview-subtitle">
          Uretim ve yonetim merkezi. Buradan icerik olusturabilir, kaynaklari
          yonetebilir, sablonlari duzenleyebilir, uretim islerini takip
          edebilir ve sistem ayarlarini yapilandirabilirsiniz. Baslangic
          ve takip islemleri icin kullanici panelini kullanabilirsiniz.
        </p>
      </div>

      <div style={SECTION}>
        <h3
          style={{ margin: "0 0 0.75rem", fontSize: "1rem", fontWeight: 600, color: "#1e293b" }}
          data-testid="admin-quick-access-heading"
        >
          Hizli Erisim
        </h3>
        <div style={GRID}>
          {QUICK_LINKS.map((link) => (
            <div
              key={link.to}
              style={CARD}
              onClick={() => navigate(link.to)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && navigate(link.to)}
              data-testid={link.testId}
            >
              <p style={CARD_TITLE}>{link.title}</p>
              <p style={CARD_DESC}>{link.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
