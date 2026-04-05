import { Outlet } from "react-router-dom";
import { AppHeader } from "../../components/layout/AppHeader";
import { AppSidebar } from "../../components/layout/AppSidebar";
import { AdminContinuityStrip } from "../../components/layout/AdminContinuityStrip";
import { useVisibility } from "../../hooks/useVisibility";

interface AdminNavItem {
  label: string;
  to?: string;
  section?: boolean;
  visibilityKey?: string;
}

const ADMIN_NAV: AdminNavItem[] = [
  { label: "Genel Bakis", to: "/admin" },
  { label: "Sistem", section: true },
  { label: "Ayarlar", to: "/admin/settings", visibilityKey: "panel:settings" },
  { label: "Gorunurluk", to: "/admin/visibility", visibilityKey: "panel:visibility" },
  { label: "Isler", to: "/admin/jobs" },
  { label: "Icerik Uretimi", section: true },
  { label: "Icerik Kutuphanesi", to: "/admin/library" },
  { label: "Varlik Kutuphanesi", to: "/admin/assets" },
  { label: "Standart Video", to: "/admin/standard-videos" },
  { label: "Sablonlar", to: "/admin/templates", visibilityKey: "panel:templates" },
  { label: "Stil Sablonlari", to: "/admin/style-blueprints" },
  { label: "Sablon-Stil Baglantilari", to: "/admin/template-style-links" },
  { label: "Analytics", section: true },
  { label: "Analytics", to: "/admin/analytics", visibilityKey: "panel:analytics" },
  { label: "YouTube Analytics", to: "/admin/analytics/youtube" },
  { label: "Haber", section: true },
  { label: "Kaynaklar", to: "/admin/sources", visibilityKey: "panel:sources" },
  { label: "Kaynak Taramalari", to: "/admin/source-scans" },
  { label: "Haber Bultenleri", to: "/admin/news-bulletins" },
  { label: "Haber Ogeler", to: "/admin/news-items" },
  { label: "Kullanilan Haberler", to: "/admin/used-news" },
];

// Individual guard hooks — one per guarded panel.
// Called unconditionally at the top of AdminLayout (rules-of-hooks safe).
function useAdminNavFiltered(): AdminNavItem[] {
  const settings = useVisibility("panel:settings");
  const visibility = useVisibility("panel:visibility");
  const templates = useVisibility("panel:templates");
  const analytics = useVisibility("panel:analytics");
  const sources = useVisibility("panel:sources");

  const guardMap: Record<string, boolean> = {
    "panel:settings": settings.visible,
    "panel:visibility": visibility.visible,
    "panel:templates": templates.visible,
    "panel:analytics": analytics.visible,
    "panel:sources": sources.visible,
  };

  return ADMIN_NAV.filter((item) => {
    if (!item.visibilityKey) return true;
    return guardMap[item.visibilityKey] !== false;
  });
}

export function AdminLayout() {
  const filteredNav = useAdminNavFiltered();

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <AppHeader area="Admin" />
      <AdminContinuityStrip />
      <div style={{ display: "flex", flex: 1 }}>
        <AppSidebar items={filteredNav} />
        <main style={{ flex: 1, padding: "1.5rem" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
