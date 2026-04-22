import { useNavigate } from "react-router-dom";
import { useSurfacePageOverride } from "../surfaces/SurfaceContext";
import { useAuthStore } from "../stores/authStore";

/**
 * 404 Not Found page — shown when no route matches the current URL.
 *
 * Public entry point. Delegates to a surface override when the active
 * surface declares one for `auth.404` (Aurora). Otherwise falls back to
 * the legacy implementation below.
 */
export function NotFoundPage() {
  const Override = useSurfacePageOverride("auth.404");
  if (Override) return <Override />;
  return <LegacyNotFoundPage />;
}

function LegacyNotFoundPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "admin";
  const homeRoute = isAdmin ? "/admin" : user ? "/user" : "/";

  return (
    <div className="flex items-center justify-center min-h-screen bg-surface-page">
      <div className="text-center max-w-md px-6">
        <h1 className="text-6xl font-bold text-neutral-300 mb-2">404</h1>
        <h2 className="text-xl font-semibold text-neutral-700 mb-2">
          Sayfa Bulunamadı
        </h2>
        <p className="text-sm text-neutral-500 mb-6">
          Aradığınız sayfa mevcut değil veya taşınmış olabilir.
        </p>
        <div className="flex gap-3 justify-center">
          {isAdmin && (
            <button
              onClick={() => navigate("/admin")}
              className="px-4 py-2 text-sm font-medium text-white bg-brand-600 border-none rounded-lg cursor-pointer hover:bg-brand-700 transition-colors"
            >
              Yönetim Paneli
            </button>
          )}
          <button
            onClick={() => navigate(homeRoute)}
            className="px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 border border-neutral-200 rounded-lg cursor-pointer hover:bg-neutral-200 transition-colors"
          >
            Anasayfa
          </button>
        </div>
      </div>
    </div>
  );
}
