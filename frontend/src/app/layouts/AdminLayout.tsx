import { Outlet } from "react-router-dom";
import { AppHeader } from "../../components/layout/AppHeader";
import { AppSidebar } from "../../components/layout/AppSidebar";

const ADMIN_NAV = [
  { label: "Genel Bakis", to: "/admin" },
  { label: "Sistem", section: true },
  { label: "Ayarlar", to: "/admin/settings" },
  { label: "Gorunurluk", to: "/admin/visibility" },
  { label: "Isler", to: "/admin/jobs" },
  { label: "Icerik Uretimi", section: true },
  { label: "Standart Video", to: "/admin/standard-videos" },
  { label: "Sablonlar", to: "/admin/templates" },
  { label: "Stil Sablonlari", to: "/admin/style-blueprints" },
  { label: "Sablon-Stil Baglantilari", to: "/admin/template-style-links" },
  { label: "Haber", section: true },
  { label: "Kaynaklar", to: "/admin/sources" },
  { label: "Kaynak Taramalari", to: "/admin/source-scans" },
  { label: "Haber Bultenleri", to: "/admin/news-bulletins" },
  { label: "Haber Ogeler", to: "/admin/news-items" },
  { label: "Kullanilan Haberler", to: "/admin/used-news" },
];

export function AdminLayout() {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <AppHeader area="Admin" />
      <div style={{ display: "flex", flex: 1 }}>
        <AppSidebar items={ADMIN_NAV} />
        <main style={{ flex: 1, padding: "1.5rem" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
