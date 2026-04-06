import { useNavigate } from "react-router-dom";
import { useWizardStore } from "../stores/wizardStore";
import { useEnabledModules } from "../hooks/useEnabledModules";

const CONTENT_TYPES = [
  {
    moduleId: "standard_video",
    icon: "V",
    iconBgClass: "bg-brand-600",
    title: "Standart Video",
    desc: "Konu ve stil bilgilerini girerek standart video uretimini baslatin.",
    cta: "Yeni Video Olustur",
    guidedTo: "/admin/standard-videos/wizard",
    advancedTo: "/admin/standard-videos/new",
    testId: "content-entry-standard-video",
  },
  {
    moduleId: "news_bulletin",
    icon: "H",
    iconBgClass: "bg-brand-700",
    title: "Haber Bulteni",
    desc: "Haber kaynaklarinizdan sectiginiz haberlerle bulten olusturun.",
    cta: "Yeni Bulten Olustur",
    guidedTo: "/admin/news-bulletins/new",
    advancedTo: "/admin/news-bulletins/new",
    testId: "content-entry-news-bulletin",
  },
];

export function UserContentEntryPage() {
  const navigate = useNavigate();
  const userMode = useWizardStore((s) => s.userMode);
  const toggleMode = useWizardStore((s) => s.toggleUserMode);
  const { enabledMap } = useEnabledModules();

  const visibleTypes = CONTENT_TYPES.filter(
    (ct) => enabledMap[ct.moduleId] !== false
  );

  return (
    <div>
      <div className="flex items-center justify-between max-w-[720px]">
        <h2 data-testid="content-heading" className="m-0">Icerik</h2>
        <button
          onClick={toggleMode}
          className="px-3 py-1 text-xs font-medium rounded-full border border-border-subtle bg-neutral-50 text-neutral-600 cursor-pointer hover:bg-neutral-100 transition-colors"
          data-testid="content-mode-toggle"
        >
          {userMode === "guided" ? "Gelismis Mod" : "Rehberli Mod"}
        </button>
      </div>
      <p className="m-0 mb-3 text-sm text-neutral-500" data-testid="content-section-subtitle">
        {userMode === "guided"
          ? "Adim adim rehberlik ile yeni icerik olusturun."
          : "Tum alanlari tek ekranda doldurun."}
      </p>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4 max-w-[720px]">
        {visibleTypes.map((ct) => {
          const to = userMode === "guided" ? ct.guidedTo : ct.advancedTo;
          return (
            <div
              key={to}
              className="py-3 px-4 bg-neutral-0 border border-border-subtle rounded-lg cursor-pointer transition-colors duration-fast hover:border-brand-300"
              onClick={() => navigate(to)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && navigate(to)}
              data-testid={ct.testId}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg font-bold text-neutral-0 mb-3 ${ct.iconBgClass}`}>{ct.icon}</div>
              <p className="m-0 mb-1 text-lg font-semibold text-neutral-900">{ct.title}</p>
              <p className="m-0 text-base text-neutral-600 leading-normal">{ct.desc}</p>
              <span className="inline-block mt-3 text-base font-semibold text-brand-600">{ct.cta} &rarr;</span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 py-2 px-3 bg-neutral-50 border border-border-subtle rounded-md text-xs text-neutral-500 max-w-[720px]" data-testid="content-first-use-note">
        Ilk kez mi kullaniyorsunuz? Yukaridaki turlerden birini secerek baslayabilirsiniz.
      </div>

      <div className="mt-4 text-base text-neutral-600 max-w-[720px]" data-testid="content-crosslink-area">
        Iceriklerin yayin durumunu takip etmek icin{" "}
        <button
          className="cursor-pointer text-brand-600 font-semibold bg-transparent border-none p-0 text-[inherit]"
          onClick={() => navigate("/user/publish")}
          data-testid="content-to-publish-crosslink"
        >
          Yayin ekranina gecebilirsiniz
        </button>
        . Mevcut iceriklerinizi goruntulemek icin{" "}
        <button
          className="cursor-pointer text-brand-600 font-semibold bg-transparent border-none p-0 text-[inherit]"
          onClick={() => navigate("/admin/library")}
          data-testid="content-to-library-crosslink"
        >
          Icerik Kutuphanesine gidin
        </button>
        .
      </div>
    </div>
  );
}
