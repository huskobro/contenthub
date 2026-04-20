import { Link } from "react-router-dom";
import { useSurfacePageOverride } from "../surfaces/SurfaceContext";

/**
 * Public entry point. Aurora surface override (`auth.forgot-password`)
 * geçerliyse onu kullanır; aksi halde MVP minimal legacy mesajı render
 * eder. Backend reset endpoint'i MVP'de bağlı değil — Aurora sayfasında
 * "yakında" ifadesi açıkça gösterilir.
 */
export function ForgotPasswordPage() {
  const Override = useSurfacePageOverride("auth.forgot-password");
  if (Override) return <Override />;
  return <LegacyForgotPasswordPage />;
}

function LegacyForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-page px-4">
      <div className="w-full max-w-[400px] text-center">
        <h1 className="text-2xl font-bold text-neutral-900 font-heading mb-3">
          Şifre Sıfırlama
        </h1>
        <p className="text-sm text-neutral-500 mb-6">
          Şifre sıfırlama özelliği MVP'de henüz aktif değil. Lütfen admin ile iletişime geçin.
        </p>
        <Link to="/login" className="text-brand-600 hover:text-brand-700 text-sm font-medium">
          ← Giriş ekranına dön
        </Link>
      </div>
    </div>
  );
}
