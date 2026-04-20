import { Link } from "react-router-dom";
import { useSurfacePageOverride } from "../surfaces/SurfaceContext";

/**
 * Public entry point. Aurora `auth.session-expired` override'ı varsa onu kullanır;
 * Aksi halde minimal "session expired" mesajı render eder.
 */
export function SessionExpiredPage() {
  const Override = useSurfacePageOverride("auth.session-expired");
  if (Override) return <Override />;
  return <LegacySessionExpiredPage />;
}

function LegacySessionExpiredPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-page px-4">
      <div className="w-full max-w-[400px] text-center">
        <h1 className="text-2xl font-bold text-neutral-900 font-heading mb-3">
          Oturum Süresi Doldu
        </h1>
        <p className="text-sm text-neutral-500 mb-6">
          Güvenlik nedeniyle oturumunuz sonlandırıldı. Lütfen tekrar giriş yapın.
        </p>
        <Link to="/login" className="text-brand-600 hover:text-brand-700 text-sm font-medium">
          Giriş ekranına git
        </Link>
      </div>
    </div>
  );
}
