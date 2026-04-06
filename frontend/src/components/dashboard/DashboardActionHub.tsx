import { useNavigate } from "react-router-dom";
import { cn } from "../../lib/cn";

const HUB_ENTRIES = [
  {
    icon: "I",
    iconBg: "bg-brand-600",
    title: "Icerik",
    desc: "Ilk adim: yeni icerik olusturun veya mevcut icerikleri inceleyin.",
    cta: "Icerige Git",
    to: "/user/content",
    testId: "hub-action-content",
  },
  {
    icon: "Y",
    iconBg: "bg-brand-700",
    title: "Yayin",
    desc: "Sonraki adim: olusturulan iceriklerin yayin durumunu takip edin.",
    cta: "Yayina Git",
    to: "/user/publish",
    testId: "hub-action-publish",
  },
  {
    icon: "P",
    iconBg: "bg-success-dark",
    title: "Yonetim Paneli",
    desc: "Uretim ve yonetim merkezi: ayarlar, sablonlar, kaynaklar ve islemleri yonetin.",
    cta: "Yonetim Paneline Git",
    to: "/admin",
    testId: "hub-action-admin",
  },
];

export function DashboardActionHub() {
  const navigate = useNavigate();

  return (
    <div className="mt-6 max-w-[720px]" data-testid="dashboard-action-hub">
      <h3 className="m-0 mb-1 text-lg font-semibold text-neutral-900">Hizli Erisim</h3>
      <p className="m-0 mb-4 text-base text-neutral-600 leading-normal" data-testid="hub-flow-desc">
        Once icerik olusturun, ardindan yayin surecini takip edin.
        Detayli islemler icin yonetim panelini kullanin.
      </p>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
        {HUB_ENTRIES.map((entry) => (
          <div
            key={entry.to}
            className="p-4 px-5 bg-neutral-0 border border-border-subtle rounded-[10px] cursor-pointer hover:border-brand-400 transition-colors duration-fast"
            onClick={() => navigate(entry.to)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && navigate(entry.to)}
            data-testid={entry.testId}
          >
            <div className={cn("w-8 h-8 rounded-[7px] flex items-center justify-center text-md font-bold text-neutral-0 mb-2", entry.iconBg)}>
              {entry.icon}
            </div>
            <p className="m-0 mb-1 text-md font-semibold text-neutral-900">{entry.title}</p>
            <p className="m-0 text-sm text-neutral-600 leading-snug">{entry.desc}</p>
            <span className="inline-block mt-2 text-sm font-semibold text-brand-600">{entry.cta} &rarr;</span>
          </div>
        ))}
      </div>
    </div>
  );
}
