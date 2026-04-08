import { useNavigate } from "react-router-dom";

/**
 * 404 Not Found page — shown when no route matches the current URL.
 */
export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-screen bg-surface-page">
      <div className="text-center max-w-md px-6">
        <h1 className="text-6xl font-bold text-neutral-300 mb-2">404</h1>
        <h2 className="text-xl font-semibold text-neutral-700 mb-2">
          Sayfa Bulunamadi
        </h2>
        <p className="text-sm text-neutral-500 mb-6">
          Aradiginiz sayfa mevcut degil veya tasinmis olabilir.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => navigate("/admin")}
            className="px-4 py-2 text-sm font-medium text-white bg-brand-600 border-none rounded-lg cursor-pointer hover:bg-brand-700 transition-colors"
          >
            Yonetim Paneli
          </button>
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 border border-neutral-200 rounded-lg cursor-pointer hover:bg-neutral-200 transition-colors"
          >
            Anasayfa
          </button>
        </div>
      </div>
    </div>
  );
}
