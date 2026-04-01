import { useState } from "react";
import { AdminOverviewPage } from "../pages/AdminOverviewPage";
import { UserDashboardPage } from "../pages/UserDashboardPage";

type View = "user" | "admin";

export default function App() {
  const [view, setView] = useState<View>("user");

  return (
    <div>
      <header>
        <strong>ContentHub</strong>
        <span style={{ marginLeft: "1rem" }}>
          <button
            onClick={() => setView("user")}
            disabled={view === "user"}
          >
            User
          </button>
          <button
            onClick={() => setView("admin")}
            disabled={view === "admin"}
            style={{ marginLeft: "0.5rem" }}
          >
            Admin
          </button>
        </span>
      </header>
      <main>
        {view === "admin" ? <AdminOverviewPage /> : <UserDashboardPage />}
      </main>
    </div>
  );
}
