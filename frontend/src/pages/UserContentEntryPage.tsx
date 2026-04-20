import { useNavigate } from "react-router-dom";
import { useWizardStore } from "../stores/wizardStore";
import { useEnabledModules } from "../hooks/useEnabledModules";
import { useEffectiveSetting } from "../hooks/useEffectiveSettings";
import { useSurfacePageOverride } from "../surfaces/SurfaceContext";

// Varsayılan rotalar — PHASE AD: user yüzeyi kendi wizard'larını kullanır,
// admin wizard'a sızıntı yok. Her iki mod (guided/advanced) aynı user wizard'ına
// iner; wizard içinde mode'a göre davranış değişir.
const DEFAULT_ROUTES = {
  standard_video: { wizard: "/user/create/video",    form: "/user/create/video" },
  news_bulletin:  { wizard: "/user/create/bulletin", form: "/user/create/bulletin" },
  product_review: { wizard: "/user/create/product-review", form: "/user/create/product-review" },
};

const CONTENT_TYPES = [
  {
    moduleId: "standard_video",
    icon: "▶",
    iconBgClass: "bg-brand-600",
    title: "Standart Video",
    desc: "Konu ve stil bilgilerini girerek standart video üretimini başlatın.",
    cta: "Yeni Video Oluştur",
    settingKey: "wizard.standard_video.entry_mode",
    testId: "content-entry-standard-video",
  },
  {
    moduleId: "news_bulletin",
    icon: "📰",
    iconBgClass: "bg-brand-700",
    title: "Haber Bülteni",
    desc: "Haber kaynaklarınızdan seçtiğiniz haberlerle bülten oluşturun.",
    cta: "Yeni Bülten Oluştur",
    settingKey: "wizard.news_bulletin.entry_mode",
    testId: "content-entry-news-bulletin",
  },
  {
    moduleId: "product_review",
    icon: "★",
    iconBgClass: "bg-brand-500",
    title: "Ürün İncelemesi",
    desc: "Ürün URL'sini ekleyerek inceleme videosu oluşturun.",
    cta: "Yeni İnceleme Oluştur",
    settingKey: "wizard.product_review.entry_mode",
    testId: "content-entry-product-review",
  },
];

export function UserContentEntryPage() {
  const Override = useSurfacePageOverride("user.content");
  const navigate = useNavigate();
  const userMode = useWizardStore((s) => s.userMode);
  const toggleMode = useWizardStore((s) => s.toggleUserMode);
  const { enabledMap } = useEnabledModules();
  if (Override) return <Override />;

  const { data: svEntryMode } = useEffectiveSetting("wizard.standard_video.entry_mode");
  const { data: nbEntryMode } = useEffectiveSetting("wizard.news_bulletin.entry_mode");
  const { data: prEntryMode } = useEffectiveSetting("wizard.product_review.entry_mode");

  const entryModeMap: Record<string, string> = {
    standard_video: (svEntryMode?.effective_value ?? "wizard") as string,
    news_bulletin:  (nbEntryMode?.effective_value ?? "wizard") as string,
    product_review: (prEntryMode?.effective_value ?? "wizard") as string,
  };

  const visibleTypes = CONTENT_TYPES.filter(
    (ct) => enabledMap[ct.moduleId] !== false
  );

  function getTarget(ct: typeof CONTENT_TYPES[0]): string {
    const routes = DEFAULT_ROUTES[ct.moduleId as keyof typeof DEFAULT_ROUTES];
    const adminMode = entryModeMap[ct.moduleId];
    // guided mod → admin ayarına uy; advanced mod → her zaman form
    if (userMode === "advanced") return routes.form;
    return adminMode === "form" ? routes.form : routes.wizard;
  }

  return (
    <div>
      <div className="flex items-center justify-between max-w-[720px]">
        <h2 data-testid="content-heading" className="m-0">İçerik</h2>
        <button
          onClick={toggleMode}
          className="px-3 py-1 text-xs font-medium rounded-full border border-border-subtle bg-neutral-50 text-neutral-600 cursor-pointer hover:bg-neutral-100 transition-colors"
          data-testid="content-mode-toggle"
        >
          {userMode === "guided" ? "Gelişmiş Mod" : "Rehberli Mod"}
        </button>
      </div>
      <p className="m-0 mb-3 text-sm text-neutral-500" data-testid="content-section-subtitle">
        {userMode === "guided"
          ? "Adım adım rehberlik ile yeni içerik oluşturun."
          : "Tüm alanları tek ekranda doldurun."}
      </p>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4 max-w-[720px]">
        {visibleTypes.map((ct) => {
          const to = getTarget(ct);
          const isWizard = to.includes("/wizard");
          return (
            <div
              key={ct.moduleId}
              className="py-3 px-4 bg-neutral-0 border border-border-subtle rounded-lg cursor-pointer transition-colors duration-fast hover:border-brand-300"
              onClick={() => navigate(to)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && navigate(to)}
              data-testid={ct.testId}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg font-bold text-neutral-0 mb-3 ${ct.iconBgClass}`}>
                {ct.icon}
              </div>
              <p className="m-0 mb-1 text-lg font-semibold text-neutral-900">{ct.title}</p>
              <p className="m-0 text-base text-neutral-600 leading-normal">{ct.desc}</p>
              <span className="inline-flex items-center gap-1 mt-3 text-base font-semibold text-brand-600">
                {ct.cta} →
                {isWizard && (
                  <span className="text-[10px] bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded font-medium">Wizard</span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 py-2 px-3 bg-neutral-50 border border-border-subtle rounded-md text-xs text-neutral-500 max-w-[720px]" data-testid="content-first-use-note">
        İlk kez mi kullanıyorsunuz? Yukarıdaki türlerden birini seçerek başlayabilirsiniz.
      </div>

      <div className="mt-4 text-base text-neutral-600 max-w-[720px]" data-testid="content-crosslink-area">
        İçeriklerin yayın durumunu takip etmek için{" "}
        <button
          className="cursor-pointer text-brand-600 font-semibold bg-transparent border-none p-0 text-[inherit]"
          onClick={() => navigate("/user/publish")}
          data-testid="content-to-publish-crosslink"
        >
          Yayın ekranına geçebilirsiniz
        </button>
        .
      </div>
    </div>
  );
}
