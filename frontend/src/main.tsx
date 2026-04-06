import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./app/App";

// Bootstrap UI settings from backend into localStorage
(async () => {
  try {
    const res = await fetch("/api/v1/settings/effective?group=ui");
    if (res.ok) {
      const items = await res.json() as Array<{ key: string; effective_value: unknown }>;
      for (const item of items) {
        if ((item.key === "ui.timezone" || item.key === "ui.date_format") && item.effective_value != null) {
          localStorage.setItem(item.key, String(item.effective_value));
        }
      }
    }
  } catch {
    // Ignore — formatDate will use its builtin default
  }
})();

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
