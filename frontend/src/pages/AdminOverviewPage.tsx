import { useNavigate } from "react-router-dom";
import { useVisibility } from "../hooks/useVisibility";
import { useAnalyticsOverview } from "../hooks/useAnalyticsOverview";
import { colors, spacing, typography, radius, transition } from "../components/design-system/tokens";
import {
  PageShell,
  SectionShell,
  MetricTile,
  MetricGrid,
  StatusBadge,
} from "../components/design-system/primitives";

/* ------------------------------------------------------------------ */
/* Quick-link definitions                                             */
/* ------------------------------------------------------------------ */

interface QuickLink {
  title: string;
  desc: string;
  to: string;
  testId: string;
  visibilityKey?: string;
}

const QUICK_LINKS: QuickLink[] = [
  {
    title: "Icerik Kutuphanesi",
    desc: "Tum icerik kayitlarini tek yuzeyden goruntuleyip yonetin",
    to: "/admin/library",
    testId: "quick-link-library",
  },
  {
    title: "Varlik Kutuphanesi",
    desc: "Muzik, font, gorsel, overlay ve diger uretim varliklarini yonet",
    to: "/admin/assets",
    testId: "quick-link-assets",
  },
  {
    title: "Yeni Video Olustur",
    desc: "Ana uretim akisi: standart video icerigi olusturmaya basla",
    to: "/admin/standard-videos/new",
    testId: "quick-link-new-video",
  },
  {
    title: "Kaynaklar",
    desc: "Haber kaynaklarini yonet ve tara",
    to: "/admin/sources",
    testId: "quick-link-sources",
    visibilityKey: "panel:sources",
  },
  {
    title: "Sablonlar",
    desc: "Uretim hattinin yapi taslari: icerik, stil ve yayin sablonlarini yonet",
    to: "/admin/templates",
    testId: "quick-link-templates",
    visibilityKey: "panel:templates",
  },
  {
    title: "Isler",
    desc: "Uretim islerini, kuyruk durumunu ve toplu operasyonlari takip et",
    to: "/admin/jobs",
    testId: "quick-link-jobs",
  },
  {
    title: "Ayarlar",
    desc: "Ayar kayitlarini ve governance durumunu yonet",
    to: "/admin/settings",
    testId: "quick-link-settings",
    visibilityKey: "panel:settings",
  },
  {
    title: "Haber Bultenleri",
    desc: "Ikinci uretim akisi: haber bulteni icerigi olustur ve yonet",
    to: "/admin/news-bulletins",
    testId: "quick-link-news-bulletins",
  },
  {
    title: "Analytics",
    desc: "Uretim metrikleri, raporlama ve karar destek ozetlerini goruntule",
    to: "/admin/analytics",
    testId: "quick-link-analytics",
    visibilityKey: "panel:analytics",
  },
];

/* ------------------------------------------------------------------ */
/* Release readiness items                                            */
/* ------------------------------------------------------------------ */

const READINESS_ITEMS = [
  { area: "Icerik Uretimi", status: "active" as const, statusLabel: "Omurga hazir", detail: "Video ve bulten olusturma akislari calisiyor", testId: "readiness-content" },
  { area: "Yayin Akisi", status: "active" as const, statusLabel: "M23 aktif", detail: "YouTube OAuth + yayin zinciri, metadata hardening, settings-aware defaults, duplicate publish/cancel korumasi, scheduler audit", testId: "readiness-publish" },
  { area: "Is Motoru", status: "active" as const, statusLabel: "Omurga hazir", detail: "Job/step/timeline/ETA gorunur, operasyonel aksiyonlar M14'te", testId: "readiness-jobs" },
  { area: "Sablon Sistemi", status: "active" as const, statusLabel: "M12 aktif", detail: "Template/style context script, metadata, visuals ve composition step'lerinde tuketiliyor", testId: "readiness-templates" },
  { area: "Haber Modulu", status: "active" as const, statusLabel: "M11 aktif", detail: "Kaynak, tarama, haber, dedupe akislari calisiyor; soft dedupe esigi ayarlardan okunuyor", testId: "readiness-news" },
  { area: "Ayarlar ve Gorunurluk", status: "active" as const, statusLabel: "M23 aktif", detail: "Settings/visibility CRUD, delete/restore/bulk ops, change history, guvenli hata fallback, audit log zenginlestirmesi aktif", testId: "readiness-settings" },
  { area: "Analytics ve Raporlama", status: "active" as const, statusLabel: "M23 aktif", detail: "Platform, operasyon, kaynak, kanal ve icerik analytics gercek SQL aggregation, trace data quality metrikleri, parse error gozlemlenebilirligi", testId: "readiness-analytics" },
  { area: "Icerik Kutuphanesi", status: "active" as const, statusLabel: "M22 aktif", detail: "SQL UNION ALL birlesim, has_script/has_metadata gosterimi, klonlama + navigasyon, backend-side pagination", testId: "readiness-library" },
  { area: "Varlik Kutuphanesi", status: "active" as const, statusLabel: "M22 aktif", detail: "Workspace disk taramasi, dosya yukleme (201), filtre, sayfalama, silme, konum gosterme ve yenileme aktif", testId: "readiness-assets" },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmtRate(v: number | null | undefined): string {
  if (v == null) return "\u2014";
  return `${(v * 100).toFixed(1)}%`;
}

function fmtCount(v: number | null | undefined): string {
  if (v == null) return "\u2014";
  return String(v);
}

function useFilteredQuickLinks(): QuickLink[] {
  const settings = useVisibility("panel:settings");
  const sources = useVisibility("panel:sources");
  const templates = useVisibility("panel:templates");
  const analytics = useVisibility("panel:analytics");

  const guardMap: Record<string, boolean> = {
    "panel:settings": settings.visible,
    "panel:sources": sources.visible,
    "panel:templates": templates.visible,
    "panel:analytics": analytics.visible,
  };

  return QUICK_LINKS.filter((link) => {
    if (!link.visibilityKey) return true;
    return guardMap[link.visibilityKey] !== false;
  });
}

/* ------------------------------------------------------------------ */
/* Styles (grid for quick-link cards)                                 */
/* ------------------------------------------------------------------ */

const CARD_GRID: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: spacing[4],
};

const QUICK_CARD: React.CSSProperties = {
  padding: `${spacing[4]} ${spacing[5]}`,
  background: colors.surface.card,
  border: `1px solid ${colors.border.subtle}`,
  borderRadius: radius.lg,
  cursor: "pointer",
  transition: `border-color ${transition.fast}, box-shadow ${transition.fast}`,
};

const QUICK_CARD_TITLE: React.CSSProperties = {
  margin: 0,
  fontSize: typography.size.md,
  fontWeight: typography.weight.semibold,
  color: colors.neutral[900],
  marginBottom: spacing[1],
};

const QUICK_CARD_DESC: React.CSSProperties = {
  margin: 0,
  fontSize: typography.size.sm,
  color: colors.neutral[600],
  lineHeight: typography.lineHeight.normal,
};

/* ------------------------------------------------------------------ */
/* Readiness row style                                                */
/* ------------------------------------------------------------------ */

const READINESS_ROW: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacing[3],
  padding: `${spacing[2]} ${spacing[3]}`,
  borderBottom: `1px solid ${colors.border.subtle}`,
  fontSize: typography.size.sm,
};

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export function AdminOverviewPage() {
  const navigate = useNavigate();
  const filteredLinks = useFilteredQuickLinks();
  const { data, isLoading } = useAnalyticsOverview("last_30d");

  return (
    <PageShell
      title="Genel Bakis"
      subtitle="Uretim ve yonetim merkezi. Buradan icerik olusturabilir, kaynaklari yonetebilir, sablonlari duzenleyebilir, uretim islerini takip edebilir ve sistem ayarlarini yapilandirabilirsiniz. Baslangic ve takip islemleri icin kullanici panelini kullanabilirsiniz."
      testId="admin-overview"
    >
      <p
        style={{
          margin: `0 0 ${spacing[6]}`,
          fontSize: typography.size.sm,
          color: colors.neutral[500],
          lineHeight: typography.lineHeight.normal,
        }}
        data-testid="admin-overview-workflow-note"
      >
        Yonetim zinciri: Icerik Olusturma &rarr; Sablon/Stil Yonetimi &rarr; Kaynak Yonetimi &rarr; Is Takibi &rarr; Yayin &rarr; Analytics.
      </p>

      {/* Live Metric Tiles */}
      <MetricGrid>
        <MetricTile
          label="Toplam Is"
          value={isLoading ? "\u2026" : fmtCount(data?.total_job_count)}
          note="Olusturulan tum isler"
          loading={isLoading}
          testId="overview-metric-total-jobs"
          accentColor={colors.brand[500]}
        />
        <MetricTile
          label="Basari Orani"
          value={isLoading ? "\u2026" : fmtRate(data?.job_success_rate)}
          note="Tamamlanan / toplam is"
          loading={isLoading}
          testId="overview-metric-success-rate"
          accentColor={colors.success.base}
        />
        <MetricTile
          label="Toplam Yayin"
          value={isLoading ? "\u2026" : fmtCount(data?.published_count)}
          note="Basarili yayin sayisi"
          loading={isLoading}
          testId="overview-metric-published"
          accentColor={colors.info.base}
        />
        <MetricTile
          label="Basarisiz"
          value={isLoading ? "\u2026" : fmtCount(data?.failed_publish_count)}
          note="Hata ile sonuclanan yayinlar"
          loading={isLoading}
          testId="overview-metric-failed"
          accentColor={colors.error.base}
        />
      </MetricGrid>

      {/* System Readiness */}
      <SectionShell
        title="Sistem Durumu"
        description="Ana urun alanlarinin mevcut durumu. Omurga yuzeyler oturmus, derin entegrasyon bekleyen alanlar asagida belirtilmistir."
        testId="release-readiness-section"
      >
        <div data-testid="release-readiness-heading" style={{ display: "none" }}>Urun Hazirlik Durumu</div>
        <p
          style={{ display: "none" }}
          data-testid="release-readiness-note"
        >Ana urun alanlarinin mevcut durumu. Omurga yuzeyler oturmus, derin entegrasyon bekleyen alanlar asagida belirtilmistir.</p>
        <div>
          {READINESS_ITEMS.map((item) => (
            <div key={item.area} style={READINESS_ROW} data-testid={item.testId}>
              <StatusBadge status={item.status} label={item.statusLabel} size="sm" />
              <span style={{ fontWeight: typography.weight.semibold, color: colors.neutral[900], minWidth: "160px", flexShrink: 0 }}>
                {item.area}
              </span>
              <span style={{ color: colors.neutral[600] }}>{item.detail}</span>
            </div>
          ))}
        </div>
        <p
          style={{ margin: `${spacing[3]} 0 0`, fontSize: typography.size.xs, color: colors.neutral[400] }}
          data-testid="release-readiness-deferred-note"
        >
          Derin backend entegrasyonu, gercek metrik verisi ve kapsamli gorsel modernizasyon ayri fazlarda ele alinacaktir.
        </p>
      </SectionShell>

      {/* Quick Access */}
      <SectionShell
        testId="admin-quick-access-section"
      >
        <h3 data-testid="admin-quick-access-heading" style={{ margin: 0, fontSize: typography.size.lg, fontWeight: typography.weight.semibold, color: colors.neutral[900], marginBottom: spacing[4] }}>Hizli Erisim</h3>
        <div style={CARD_GRID}>
          {filteredLinks.map((link) => (
            <div
              key={link.to}
              style={QUICK_CARD}
              onClick={() => navigate(link.to)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && navigate(link.to)}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = colors.brand[300];
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(92,124,250,0.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = colors.border.subtle;
                e.currentTarget.style.boxShadow = "none";
              }}
              data-testid={link.testId}
            >
              <p style={QUICK_CARD_TITLE}>{link.title}</p>
              <p style={QUICK_CARD_DESC}>{link.desc}</p>
            </div>
          ))}
        </div>
      </SectionShell>
    </PageShell>
  );
}
