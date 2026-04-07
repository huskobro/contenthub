import { useNavigate } from "react-router-dom";
import { cn } from "../../lib/cn";

const HUB_ENTRIES = [
  {
    icon: "✦",
    iconBg: "bg-brand-600",
    title: "İçerik Oluştur",
    desc: "Yeni video veya haber bülteni başlatın.",
    cta: "İçeriğe Git",
    to: "/user/content",
    testId: "hub-action-content",
  },
  {
    icon: "↗",
    iconBg: "bg-brand-700",
    title: "Yayın Takibi",
    desc: "Onay bekleyen ve yayınlanan içerikler.",
    cta: "Yayına Git",
    to: "/user/publish",
    testId: "hub-action-publish",
  },
  {
    icon: "⚙",
    iconBg: "bg-neutral-700",
    title: "Yönetim Paneli",
    desc: "Ayarlar, şablonlar, kaynaklar.",
    cta: "Yönetim Paneli",
    to: "/admin",
    testId: "hub-action-admin",
  },
];

export function DashboardActionHub() {
  const navigate = useNavigate();

  return (
    <div data-testid="dashboard-action-hub">
      <p className="m-0 mb-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
        Hızlı Erişim
      </p>
      <div className="grid grid-cols-3 gap-3">
        {HUB_ENTRIES.map((entry) => (
          <button
            key={entry.to}
            className={cn(
              "flex items-center gap-3 px-4 py-3 bg-surface-card border border-border-subtle rounded-xl",
              "cursor-pointer hover:border-brand-300 hover:bg-brand-50/30 transition-colors text-left w-full",
            )}
            onClick={() => navigate(entry.to)}
            data-testid={entry.testId}
          >
            <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-sm text-white shrink-0", entry.iconBg)}>
              {entry.icon}
            </div>
            <div className="min-w-0">
              <p className="m-0 text-sm font-semibold text-neutral-900 truncate">{entry.title}</p>
              <p className="m-0 text-xs text-neutral-500 truncate">{entry.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
