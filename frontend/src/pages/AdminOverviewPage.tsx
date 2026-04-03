import { useNavigate } from "react-router-dom";

const SECTION: React.CSSProperties = {
  marginBottom: "1.5rem",
};

const SUBTITLE: React.CSSProperties = {
  margin: "0 0 1.25rem",
  fontSize: "0.9375rem",
  color: "#475569",
  lineHeight: 1.6,
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
  borderRadius: "8px",
  cursor: "pointer",
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
    desc: "Standart video icerigi uretmeye basla",
    to: "/admin/standard-videos/new",
  },
  {
    title: "Kaynaklar",
    desc: "Haber kaynaklarini yonet ve tara",
    to: "/admin/sources",
  },
  {
    title: "Sablonlar",
    desc: "Icerik ve stil sablonlarini duzenle",
    to: "/admin/templates",
  },
  {
    title: "Isler",
    desc: "Uretim islerini takip et",
    to: "/admin/jobs",
  },
  {
    title: "Ayarlar",
    desc: "Sistem yapilandirmasini yonet",
    to: "/admin/settings",
  },
  {
    title: "Haber Bultenleri",
    desc: "Bulten icerigi olustur ve yonet",
    to: "/admin/news-bulletins",
  },
];

export function AdminOverviewPage() {
  const navigate = useNavigate();

  return (
    <div>
      <h2>Genel Bakis</h2>
      <div style={SECTION}>
        <p style={SUBTITLE} data-testid="admin-overview-subtitle">
          Uretim ve yonetim merkezi. Icerik olusturma, kaynak yonetimi,
          sablonlar, isler ve sistem ayarlarini buradan yonetin. Baslangic
          ve takip islemleri icin kullanici panelini kullanabilirsiniz.
        </p>
      </div>

      <div style={SECTION}>
        <h3 style={{ margin: "0 0 0.75rem", fontSize: "1rem", fontWeight: 600, color: "#1e293b" }}>
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
