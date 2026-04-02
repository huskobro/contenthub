import { Outlet } from "react-router-dom";
import { AppHeader } from "../../components/layout/AppHeader";
import { AppSidebar } from "../../components/layout/AppSidebar";

const ADMIN_NAV = [
  { label: "Overview", to: "/admin" },
  { label: "Settings", to: "/admin/settings" },
  { label: "Visibility", to: "/admin/visibility" },
  { label: "Jobs", to: "/admin/jobs" },
  { label: "Standard Video", to: "/admin/standard-videos" },
  { label: "Templates", to: "/admin/templates" },
  { label: "Style Blueprints", to: "/admin/style-blueprints" },
  { label: "Sources", to: "/admin/sources" },
  { label: "Source Scans", to: "/admin/source-scans" },
  { label: "News Bulletin", to: "/admin/news-bulletins" },
  { label: "Used News", to: "/admin/used-news" },
  { label: "News Items", to: "/admin/news-items" },
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
