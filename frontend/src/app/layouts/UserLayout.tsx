import { Outlet } from "react-router-dom";
import { AppHeader } from "../../components/layout/AppHeader";
import { AppSidebar } from "../../components/layout/AppSidebar";

const USER_NAV = [
  { label: "Dashboard", to: "/user" },
  { label: "Content" },
  { label: "Publish" },
];

export function UserLayout() {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <AppHeader area="User" />
      <div style={{ display: "flex", flex: 1 }}>
        <AppSidebar items={USER_NAV} />
        <main style={{ flex: 1, padding: "1.5rem" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
