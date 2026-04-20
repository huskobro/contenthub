import { Link } from "react-router-dom";
import { useSurfacePageOverride } from "../surfaces/SurfaceContext";

/**
 * Public entry point. Aurora `auth.500` override'ı varsa onu kullanır;
 * aksi halde minimal "Internal Error" mesajı render eder. RootErrorBoundary
 * yakalanamayan hatalarda bu sayfaya yönlendirebilir.
 */
export function InternalErrorPage() {
  const Override = useSurfacePageOverride("auth.500");
  if (Override) return <Override />;
  return <LegacyInternalErrorPage />;
}

function LegacyInternalErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-page px-4">
      <div className="w-full max-w-[400px] text-center">
        <h1 className="text-2xl font-bold text-neutral-900 font-heading mb-3">
          Beklenmeyen Bir Hata Oluştu
        </h1>
        <p className="text-sm text-neutral-500 mb-6">
          Sayfa yüklenirken hata aldık. Aşağıdan ana sayfaya dönebilirsiniz.
        </p>
        <Link to="/" className="text-brand-600 hover:text-brand-700 text-sm font-medium">
          Ana sayfaya dön
        </Link>
      </div>
    </div>
  );
}
