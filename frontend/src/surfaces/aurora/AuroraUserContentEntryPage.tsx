/**
 * Aurora User Content Entry — user.content override.
 *
 * `/user/content` sayfası için Aurora kokpit karşılığı. Mode toggle (Rehberli /
 * Gelişmiş) + modül kartları (standard_video / news_bulletin / product_review)
 * artık Aurora primitives (AuroraButton, AuroraInspector) ile gelir.
 * Hardcoded yok: aktif modüller `useEnabledModules` ve giriş modu (form/wizard)
 * `useEffectiveSetting("wizard.<module>.entry_mode")` üzerinden gelir.
 */
import { useNavigate } from "react-router-dom";
import { useWizardStore } from "../../stores/wizardStore";
import { useEnabledModules } from "../../hooks/useEnabledModules";
import { useEffectiveSetting } from "../../hooks/useEffectiveSettings";
import {
  AuroraButton,
  AuroraInspector,
  AuroraInspectorSection,
  AuroraInspectorRow,
} from "./primitives";
import { Icon, type IconName } from "./icons";

const DEFAULT_ROUTES = {
  standard_video: { wizard: "/user/create/video", form: "/user/create/video" },
  news_bulletin: { wizard: "/user/create/bulletin", form: "/user/create/bulletin" },
  product_review: { wizard: "/user/create/product-review", form: "/user/create/product-review" },
} as const;

const CONTENT_TYPES: Array<{
  moduleId: "standard_video" | "news_bulletin" | "product_review";
  icon: IconName;
  title: string;
  desc: string;
  cta: string;
}> = [
  {
    moduleId: "standard_video",
    icon: "play",
    title: "Standart Video",
    desc: "Konu ve stil bilgilerini girerek standart video üretimini başlatın.",
    cta: "Yeni Video",
  },
  {
    moduleId: "news_bulletin",
    icon: "rss",
    title: "Haber Bülteni",
    desc: "Haber kaynaklarınızdan seçtiğiniz haberlerle bülten oluşturun.",
    cta: "Yeni Bülten",
  },
  {
    moduleId: "product_review",
    icon: "star",
    title: "Ürün İncelemesi",
    desc: "Ürün URL'sini ekleyerek inceleme videosu oluşturun.",
    cta: "Yeni İnceleme",
  },
];

export function AuroraUserContentEntryPage() {
  const navigate = useNavigate();
  const userMode = useWizardStore((s) => s.userMode);
  const toggleMode = useWizardStore((s) => s.toggleUserMode);
  const { enabledMap } = useEnabledModules();

  const { data: svEntryMode } = useEffectiveSetting("wizard.standard_video.entry_mode");
  const { data: nbEntryMode } = useEffectiveSetting("wizard.news_bulletin.entry_mode");
  const { data: prEntryMode } = useEffectiveSetting("wizard.product_review.entry_mode");

  const entryModeMap: Record<string, string> = {
    standard_video: (svEntryMode?.effective_value ?? "wizard") as string,
    news_bulletin: (nbEntryMode?.effective_value ?? "wizard") as string,
    product_review: (prEntryMode?.effective_value ?? "wizard") as string,
  };

  const visibleTypes = CONTENT_TYPES.filter((ct) => enabledMap[ct.moduleId] !== false);

  function getTarget(moduleId: keyof typeof DEFAULT_ROUTES): string {
    const routes = DEFAULT_ROUTES[moduleId];
    if (userMode === "advanced") return routes.form;
    return entryModeMap[moduleId] === "form" ? routes.form : routes.wizard;
  }

  const inspector = (
    <AuroraInspector title="İçerik girişi">
      <AuroraInspectorSection title="Mod">
        <AuroraInspectorRow
          label="aktif"
          value={userMode === "guided" ? "rehberli" : "gelişmiş"}
        />
        <AuroraInspectorRow label="modül sayısı" value={String(visibleTypes.length)} />
      </AuroraInspectorSection>
      <AuroraInspectorSection title="Eylemler">
        <AuroraButton
          variant="secondary"
          size="sm"
          onClick={toggleMode}
          style={{ width: "100%", marginBottom: 6 }}
        >
          {userMode === "guided" ? "Gelişmiş moda geç" : "Rehberli moda geç"}
        </AuroraButton>
        <AuroraButton
          variant="primary"
          size="sm"
          onClick={() => navigate("/user/publish")}
          style={{ width: "100%" }}
          iconLeft={<Icon name="rocket" size={11} />}
        >
          Yayın ekranı
        </AuroraButton>
      </AuroraInspectorSection>
    </AuroraInspector>
  );

  return (
    <div className="aurora-dashboard">
      <div className="page" style={{ maxWidth: 880 }}>
        <div className="page-head">
          <div>
            <h1>İçerik</h1>
            <div className="sub">
              {userMode === "guided"
                ? "Adım adım rehberlik ile yeni içerik oluşturun."
                : "Tüm alanları tek ekranda doldurun."}
            </div>
          </div>
        </div>

        {visibleTypes.length === 0 ? (
          <div
            className="card card-pad"
            style={{ textAlign: "center", padding: 32, color: "var(--text-muted)", fontSize: 13 }}
          >
            Hiçbir içerik modülü etkin değil.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 14,
              marginBottom: 16,
            }}
          >
            {visibleTypes.map((ct) => {
              const to = getTarget(ct.moduleId);
              const isWizard = entryModeMap[ct.moduleId] !== "form" && userMode !== "advanced";
              return (
                <div
                  key={ct.moduleId}
                  data-testid={`content-entry-${ct.moduleId}`}
                  onClick={() => navigate(to)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && navigate(to)}
                  style={{
                    position: "relative",
                    padding: 18,
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-default)",
                    borderRadius: 12,
                    cursor: "pointer",
                    overflow: "hidden",
                    transition: "border-color 120ms",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent-primary)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-default)")}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "var(--gradient-brand)",
                      opacity: 0.04,
                      pointerEvents: "none",
                    }}
                  />
                  <div
                    style={{
                      position: "relative",
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      display: "grid",
                      placeItems: "center",
                      background: "var(--gradient-brand)",
                      color: "var(--text-on-accent)",
                      marginBottom: 12,
                      boxShadow: "var(--glow-accent)",
                    }}
                  >
                    <Icon name={ct.icon} size={18} />
                  </div>
                  <div style={{ position: "relative" }}>
                    <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{ct.title}</div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text-muted)",
                        lineHeight: 1.5,
                        marginBottom: 12,
                      }}
                    >
                      {ct.desc}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--accent-primary-hover)",
                      }}
                    >
                      {ct.cta} →
                      {isWizard && (
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 9,
                            padding: "2px 6px",
                            borderRadius: 4,
                            background: "var(--bg-inset)",
                            color: "var(--text-muted)",
                            letterSpacing: "0.05em",
                          }}
                        >
                          WIZARD
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div
          className="card card-pad"
          style={{
            fontSize: 12,
            color: "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Icon name="info" size={14} />
          <span>
            İçeriklerin yayın durumunu takip etmek için{" "}
            <button
              onClick={() => navigate("/user/publish")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--accent-primary-hover)",
                fontWeight: 600,
                padding: 0,
              }}
            >
              Yayın ekranını
            </button>{" "}
            açabilirsiniz.
          </span>
        </div>
      </div>
      <aside className="aurora-inspector-slot">{inspector}</aside>
    </div>
  );
}
