import { useNavigate } from "react-router-dom";
import { useVisibility } from "../hooks/useVisibility";

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

interface QuickLink {
  title: string;
  desc: string;
  to: string;
  testId: string;
  visibilityKey?: string;
}

const QUICK_LINKS: QuickLink[] = [
  {
    title: "Icerik Kutuphanesi",
    desc: "Tum icerik kayitlarini tek yuzeyden goruntuleyip yonetin",
    to: "/admin/library",
    testId: "quick-link-library",
  },
  {
    title: "Varlik Kutuphanesi",
    desc: "Muzik, font, gorsel, overlay ve diger uretim varliklarini yonet",
    to: "/admin/assets",
    testId: "quick-link-assets",
  },
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
    visibilityKey: "panel:sources",
  },
  {
    title: "Sablonlar",
    desc: "Uretim hattinin yapi taslari: icerik, stil ve yayin sablonlarini yonet",
    to: "/admin/templates",
    testId: "quick-link-templates",
    visibilityKey: "panel:templates",
  },
  {
    title: "Isler",
    desc: "Uretim islerini, kuyruk durumunu ve toplu operasyonlari takip et",
    to: "/admin/jobs",
    testId: "quick-link-jobs",
  },
  {
    title: "Ayarlar",
    desc: "Ayar kayitlarini ve governance durumunu yonet",
    to: "/admin/settings",
    testId: "quick-link-settings",
    visibilityKey: "panel:settings",
  },
  {
    title: "Haber Bultenleri",
    desc: "Ikinci uretim akisi: haber bulteni icerigi olustur ve yonet",
    to: "/admin/news-bulletins",
    testId: "quick-link-news-bulletins",
  },
  {
    title: "Analytics",
    desc: "Uretim metrikleri, raporlama ve karar destek ozetlerini goruntule",
    to: "/admin/analytics",
    testId: "quick-link-analytics",
    visibilityKey: "panel:analytics",
  },
];

function useFilteredQuickLinks(): QuickLink[] {
  const settings = useVisibility("panel:settings");
  const sources = useVisibility("panel:sources");
  const templates = useVisibility("panel:templates");
  const analytics = useVisibility("panel:analytics");

  const guardMap: Record<string, boolean> = {
    "panel:settings": settings.visible,
    "panel:sources": sources.visible,
    "panel:templates": templates.visible,
    "panel:analytics": analytics.visible,
  };

  return QUICK_LINKS.filter((link) => {
    if (!link.visibilityKey) return true;
    return guardMap[link.visibilityKey] !== false;
  });
}

export function AdminOverviewPage() {
  const navigate = useNavigate();
  const filteredLinks = useFilteredQuickLinks();

  return (
    <div>
      <h2 data-testid="admin-overview-heading">Genel Bakis</h2>
      <div style={SECTION}>
        <p style={SUBTITLE} data-testid="admin-overview-subtitle">
          Uretim ve yonetim merkezi. Buradan icerik olusturabilir, kaynaklari
          yonetebilir, sablonlari duzenleyebilir, uretim islerini takip
          edebilir ve sistem ayarlarini yapilandirabilirsiniz. Baslangic
          ve takip islemleri icin kullanici panelini kullanabilirsiniz.
        </p>
        <p
          style={{ margin: "-0.5rem 0 0", fontSize: "0.75rem", color: "#94a3b8", lineHeight: 1.4 }}
          data-testid="admin-overview-workflow-note"
        >
          Yonetim zinciri: Icerik Olusturma → Sablon/Stil Yonetimi → Kaynak Yonetimi → Is Takibi → Yayin → Analytics.
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
          {filteredLinks.map((link) => (
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

      {/* Phase 320 — Release Readiness Checklist */}
      <div style={SECTION} data-testid="release-readiness-section">
        <h3
          style={{ margin: "0 0 0.25rem", fontSize: "1rem", fontWeight: 600, color: "#1e293b" }}
          data-testid="release-readiness-heading"
        >
          Urun Hazirlik Durumu
        </h3>
        <p
          style={{ margin: "0 0 0.75rem", fontSize: "0.75rem", color: "#94a3b8", lineHeight: 1.4 }}
          data-testid="release-readiness-note"
        >
          Ana urun alanlarinin mevcut durumu. Omurga yuzeyler oturmus, derin
          entegrasyon bekleyen alanlar asagida belirtilmistir.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {[
            { area: "Icerik Uretimi", status: "Omurga hazir", detail: "Video ve bulten olusturma akislari calisiyor", testId: "readiness-content" },
            { area: "Yayin Akisi", status: "M11 aktif", detail: "YouTube OAuth + yayin zinciri calisiyor, zamanlanmis yayin scheduler aktif, audit log calisiyor", testId: "readiness-publish" },
            { area: "Is Motoru", status: "Omurga hazir", detail: "Job/step/timeline/ETA gorunur, operasyonel aksiyonlar M14'te", testId: "readiness-jobs" },
            { area: "Sablon Sistemi", status: "M12 aktif", detail: "Template/style context script, metadata, visuals ve composition step'lerinde tuketiliyor", testId: "readiness-templates" },
            { area: "Haber Modulu", status: "M11 aktif", detail: "Kaynak, tarama, haber, dedupe akislari calisiyor; soft dedupe esigi ayarlardan okunuyor", testId: "readiness-news" },
            { area: "Ayarlar ve Gorunurluk", status: "M12 aktif", detail: "Settings resolver (19/19 wired), visibility guard 9 admin router'da aktif, audit log calisiyor", testId: "readiness-settings" },
            { area: "Analytics ve Raporlama", status: "M18 aktif", detail: "Platform, operasyon, kaynak, kanal ve icerik analytics gercek SQL aggregation ile calisiyor", testId: "readiness-analytics" },
            { area: "Icerik Kutuphanesi", status: "M18 aktif", detail: "Birlesik icerik listesi, tur/durum/arama filtreleri aktif", testId: "readiness-library" },
            { area: "Varlik Kutuphanesi", status: "Desteklenmiyor", detail: "Backend asset altyapisi mevcut degil, bu alan henuz desteklenmiyor", testId: "readiness-assets" },
          ].map((item) => (
            <div
              key={item.area}
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: "0.75rem",
                padding: "0.5rem 0.75rem",
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: "6px",
                fontSize: "0.75rem",
              }}
              data-testid={item.testId}
            >
              <span style={{ color: "#166534", fontWeight: 600, flexShrink: 0 }}>{item.status}</span>
              <span style={{ color: "#0f172a", fontWeight: 600, flexShrink: 0, minWidth: "140px" }}>{item.area}</span>
              <span style={{ color: "#64748b" }}>{item.detail}</span>
            </div>
          ))}
        </div>
        <p
          style={{ margin: "0.75rem 0 0", fontSize: "0.6875rem", color: "#cbd5e1" }}
          data-testid="release-readiness-deferred-note"
        >
          Derin backend entegrasyonu, gercek metrik verisi ve kapsamli gorsel
          modernizasyon ayri fazlarda ele alinacaktir.
        </p>
      </div>
    </div>
  );
}
