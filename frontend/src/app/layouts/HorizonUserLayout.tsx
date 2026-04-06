/**
 * HorizonUserLayout — Radical new user layout for Horizon design mode
 *
 * Same Horizon design language as admin but with simplified nav.
 */

import { Outlet, useNavigate } from "react-router-dom";
import { HorizonSidebar, type HorizonNavGroup } from "../../components/layout/HorizonSidebar";
import { ToastContainer } from "../../components/design-system/Toast";
import { ThemeProvider } from "../../components/design-system/ThemeProvider";

const HORIZON_USER_GROUPS: HorizonNavGroup[] = [
  {
    id: "home",
    label: "Anasayfa",
    icon: "\u25C9",
    items: [
      { label: "Anasayfa", to: "/user" },
    ],
  },
  {
    id: "content",
    label: "Icerik",
    icon: "\u270E",
    items: [
      { label: "Icerik", to: "/user/content" },
    ],
  },
  {
    id: "publish",
    label: "Yayin",
    icon: "\u25B6",
    items: [
      { label: "Yayin", to: "/user/publish" },
    ],
  },
];

export function HorizonUserLayout() {
  const navigate = useNavigate();

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-surface-page" data-testid="horizon-user-layout">
        <ToastContainer />

        <HorizonSidebar groups={HORIZON_USER_GROUPS} brandLabel="ContentHub" />

        <main
          className="ml-[48px] min-h-screen p-6 bg-surface-page overflow-y-auto transition-[margin] duration-normal"
          style={{ paddingTop: "1.5rem" }}
        >
          <div className="flex items-center justify-between mb-4 max-w-page">
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <span className="font-medium text-neutral-700">Kullanici</span>
            </div>
            <button
              onClick={() => navigate("/admin")}
              className="px-3 py-1 text-xs font-medium text-neutral-600 bg-surface-inset border border-border-subtle rounded-lg cursor-pointer transition-all duration-fast hover:bg-neutral-100 hover:border-brand-400"
              data-testid="horizon-panel-switch"
            >
              Yonetim Paneli
            </button>
          </div>

          <Outlet />
        </main>
      </div>
    </ThemeProvider>
  );
}
