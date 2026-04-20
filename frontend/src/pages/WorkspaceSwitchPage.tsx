import { Link } from "react-router-dom";
import { useSurfacePageOverride } from "../surfaces/SurfaceContext";

/**
 * Public entry point. Aurora `auth.workspace-switch` override'ı varsa onu
 * kullanır; aksi halde minimal "workspace yok" mesajı render eder. MVP
 * tek-workspace olduğu için Aurora versiyonu tek workspace listeleyip
 * doğrudan yönlendirir.
 */
export function WorkspaceSwitchPage() {
  const Override = useSurfacePageOverride("auth.workspace-switch");
  if (Override) return <Override />;
  return <LegacyWorkspaceSwitchPage />;
}

function LegacyWorkspaceSwitchPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-page px-4">
      <div className="w-full max-w-[400px] text-center">
        <h1 className="text-2xl font-bold text-neutral-900 font-heading mb-3">
          Çalışma Alanı Seçimi
        </h1>
        <p className="text-sm text-neutral-500 mb-6">
          MVP tek-workspace çalışır. Bu ekran ileride çoklu workspace için ayrılmıştır.
        </p>
        <Link to="/" className="text-brand-600 hover:text-brand-700 text-sm font-medium">
          Ana sayfaya dön
        </Link>
      </div>
    </div>
  );
}
