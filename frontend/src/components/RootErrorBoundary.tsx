import { useRouteError, isRouteErrorResponse, useNavigate } from "react-router-dom";

/**
 * Root error boundary for the application.
 * Catches unhandled errors in the route tree and shows a user-friendly page.
 */
export function RootErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();

  let title = "Beklenmeyen Hata";
  let message = "Bir sorun olustu. Lutfen tekrar deneyin.";

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      title = "Sayfa Bulunamadi";
      message = "Aradiginiz sayfa mevcut degil veya tasinmis olabilir.";
    } else {
      title = `Hata ${error.status}`;
      message = error.statusText || "Bilinmeyen bir hata olustu.";
    }
  } else if (error instanceof Error) {
    title = "Uygulama Hatasi";
    message = error.message;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-surface-page">
      <div className="text-center max-w-md px-6">
        <h1 className="text-5xl font-bold text-neutral-300 mb-2">
          {isRouteErrorResponse(error) ? error.status : "!"}
        </h1>
        <h2 className="text-xl font-semibold text-neutral-700 mb-2">
          {title}
        </h2>
        <p className="text-sm text-neutral-500 mb-6">{message}</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => navigate("/admin")}
            className="px-4 py-2 text-sm font-medium text-white bg-brand-600 border-none rounded-lg cursor-pointer hover:bg-brand-700 transition-colors"
          >
            Yonetim Paneli
          </button>
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 border border-neutral-200 rounded-lg cursor-pointer hover:bg-brand-50 transition-colors"
          >
            Anasayfa
          </button>
        </div>
      </div>
    </div>
  );
}
