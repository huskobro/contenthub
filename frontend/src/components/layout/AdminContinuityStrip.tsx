import { useNavigate } from "react-router-dom";

export function AdminContinuityStrip() {
  const navigate = useNavigate();

  return (
    <div
      className="flex items-center justify-between px-6 py-1 bg-brand-50 border-b border-brand-100 text-sm font-body text-brand-700 leading-normal shrink-0"
      data-testid="admin-continuity-strip"
    >
      <span>Üretim ve yönetim işlemleri için yönetim panelindesiniz.</span>
      {/* F48 fix: panel switch copy standardizasyonu. */}
      <button
        className="text-sm font-semibold font-body text-brand-700 bg-transparent border-none cursor-pointer p-0 underline transition-colors duration-fast hover:text-brand-900"
        onClick={() => navigate("/user")}
        title="Kullanıcı Paneli"
        aria-label="Kullanıcı Paneli"
        data-testid="continuity-back-to-user"
      >
        Kullanıcı Paneli
      </button>
    </div>
  );
}
