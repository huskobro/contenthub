import { Outlet } from "react-router-dom";
import { AppHeader } from "../../components/layout/AppHeader";
import { AppSidebar } from "../../components/layout/AppSidebar";

const ADMIN_NAV = [
  { label: "Overview", to: "/admin" },
  { label: "Settings" },
  { label: "Jobs" },
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
