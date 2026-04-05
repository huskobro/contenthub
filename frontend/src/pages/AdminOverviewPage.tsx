import React from "react";
import { useNavigate } from "react-router-dom";
import { useVisibility } from "../hooks/useVisibility";
import { useAnalyticsOverview } from "../hooks/useAnalyticsOverview";
import { colors, spacing, typography, radius, shadow, transition } from "../components/design-system/tokens";
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
  /** SVG icon path(s) rendered inside a 20x20 viewBox */
  iconPath: string;
  /** Background tint for the icon circle */
  iconBg: string;
  /** Icon stroke/fill color */
  iconColor: string;
}

const QUICK_LINKS: QuickLink[] = [
  {
    title: "Icerik Kutuphanesi",
    desc: "Tum icerik kayitlarini tek yuzeyden goruntuleyip yonetin",
    to: "/admin/library",
    testId: "quick-link-library",
    iconPath: "M3 5h14M3 10h14M3 15h9",
    iconBg: colors.brand[100],
    iconColor: colors.brand[600],
  },
  {
    title: "Varlik Kutuphanesi",
    desc: "Muzik, font, gorsel, overlay ve diger uretim varliklarini yonet",
    to: "/admin/assets",
    testId: "quick-link-assets",
    iconPath: "M4 4h5v5H4zM11 4h5v5h-5zM4 11h5v5H4zM11 11h5v5h-5z",
    iconBg: colors.info.light,
    iconColor: colors.info.dark,
  },
  {
    title: "Yeni Video Olustur",
    desc: "Ana uretim akisi: standart video icerigi olusturmaya basla",
    to: "/admin/standard-videos/new",
    testId: "quick-link-new-video",
    iconPath: "M15.91 11.672a.375.375 0 010 .656l-7.5 4.5A.375.375 0 018 16.5v-9a.375.375 0 01.41-.328l7.5 4.5z",
    iconBg: colors.success.light,
    iconColor: colors.success.dark,
  },
  {
    title: "Kaynaklar",
    desc: "Haber kaynaklarini yonet ve tara",
    to: "/admin/sources",
    testId: "quick-link-sources",
    visibilityKey: "panel:sources",
    iconPath: "M12 21a9 9 0 100-18 9 9 0 000 18zM12 3v18M3 12h18",
    iconBg: colors.warning.light,
    iconColor: colors.warning.dark,
  },
  {
    title: "Sablonlar",
    desc: "Uretim hattinin yapi taslari: icerik, stil ve yayin sablonlarini yonet",
    to: "/admin/templates",
    testId: "quick-link-templates",
    visibilityKey: "panel:templates",
    iconPath: "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z",
    iconBg: colors.brand[100],
    iconColor: colors.brand[700],
  },
  {
    title: "Isler",
    desc: "Uretim islerini, kuyruk durumunu ve toplu operasyonlari takip et",
    to: "/admin/jobs",
    testId: "quick-link-jobs",
    iconPath: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.573-1.066zM15 12a3 3 0 11-6 0 3 3 0 016 0z",
    iconBg: colors.neutral[100],
    iconColor: colors.neutral[700],
  },
  {
    title: "Ayarlar",
    desc: "Ayar kayitlarini ve governance durumunu yonet",
    to: "/admin/settings",
    testId: "quick-link-settings",
    visibilityKey: "panel:settings",
    iconPath: "M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4",
    iconBg: colors.neutral[100],
    iconColor: colors.neutral[600],
  },
  {
    title: "Haber Bultenleri",
    desc: "Ikinci uretim akisi: haber bulteni icerigi olustur ve yonet",
    to: "/admin/news-bulletins",
    testId: "quick-link-news-bulletins",
    iconPath: "M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2",
    iconBg: colors.info.light,
    iconColor: colors.info.text,
  },
  {
    title: "Analytics",
    desc: "Uretim metrikleri, raporlama ve karar destek ozetlerini goruntule",
    to: "/admin/analytics",
    testId: "quick-link-analytics",
    visibilityKey: "panel:analytics",
    iconPath: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
    iconBg: colors.success.light,
    iconColor: colors.success.text,
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
/* Icon helper — renders an SVG icon in a colored circle              */
/* ------------------------------------------------------------------ */

function IconCircle({ path, bg, color }: { path: string; bg: string; color: string }) {
  return (
    <div
      style={{
        width: "36px",
        height: "36px",
        borderRadius: radius.full,
        background: bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d={path} />
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                             */
/* ------------------------------------------------------------------ */

const CARD_GRID: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: spacing[4],
};

/* ------------------------------------------------------------------ */
/* QuickCard — interactive quick access card with premium feel        */
/* ------------------------------------------------------------------ */

function QuickCard({ link, onClick }: { link: QuickLink; onClick: () => void }) {
  const [hovered, setHovered] = React.useState(false);

  return (
    <div
      style={{
        padding: `${spacing[4]} ${spacing[5]}`,
        background: colors.surface.card,
        border: `1px solid ${hovered ? colors.brand[300] : colors.border.subtle}`,
        borderLeft: `3px solid ${hovered ? colors.brand[400] : link.iconColor}`,
        borderRadius: radius.lg,
        cursor: "pointer",
        transition: `border-color ${transition.normal}, box-shadow ${transition.normal}, transform ${transition.normal}`,
        boxShadow: hovered ? shadow.md : shadow.sm,
        display: "flex",
        gap: spacing[3],
        alignItems: "flex-start",
      }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      data-testid={link.testId}
    >
      <IconCircle path={link.iconPath} bg={link.iconBg} color={link.iconColor} />
      <div style={{ minWidth: 0 }}>
        <p style={{
          margin: 0,
          fontSize: typography.size.md,
          fontWeight: typography.weight.semibold,
          color: colors.neutral[900],
          marginBottom: spacing[1],
        }}>
          {link.title}
        </p>
        <p style={{
          margin: 0,
          fontSize: typography.size.sm,
          color: colors.neutral[600],
          lineHeight: typography.lineHeight.normal,
        }}>
          {link.desc}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ReadinessCard — individual system health card                      */
/* ------------------------------------------------------------------ */

function ReadinessCard({ item, index }: { item: typeof READINESS_ITEMS[0]; index: number }) {
  const [hovered, setHovered] = React.useState(false);
  const isEven = index % 2 === 0;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: spacing[3],
        padding: `${spacing[3]} ${spacing[4]}`,
        background: hovered ? colors.brand[50] : (isEven ? colors.surface.card : colors.surface.inset),
        borderRadius: radius.md,
        border: `1px solid ${hovered ? colors.brand[200] : colors.border.subtle}`,
        transition: `background ${transition.fast}, border-color ${transition.fast}`,
        marginBottom: spacing[2],
      }}
      data-testid={item.testId}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <StatusBadge status={item.status} label={item.statusLabel} size="md" />
      <span style={{
        fontWeight: typography.weight.semibold,
        color: colors.neutral[900],
        minWidth: "160px",
        flexShrink: 0,
        fontSize: typography.size.sm,
      }}>
        {item.area}
      </span>
      <span style={{ color: colors.neutral[600], fontSize: typography.size.sm, lineHeight: typography.lineHeight.normal }}>
        {item.detail}
      </span>
    </div>
  );
}

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
      {/* Workflow chain note */}
      <p
        style={{
          margin: `0 0 ${spacing[5]}`,
          fontSize: typography.size.sm,
          color: colors.neutral[500],
          lineHeight: typography.lineHeight.normal,
        }}
        data-testid="admin-overview-workflow-note"
      >
        Yonetim zinciri: Icerik Olusturma &rarr; Sablon/Stil Yonetimi &rarr; Kaynak Yonetimi &rarr; Is Takibi &rarr; Yayin &rarr; Analytics.
      </p>

      {/* ---- Hero / Summary Area ---- */}
      <div
        style={{
          background: `linear-gradient(135deg, ${colors.brand[50]}, ${colors.brand[100]} 40%, ${colors.surface.page} 100%)`,
          borderRadius: radius.xl,
          padding: `${spacing[6]} ${spacing[6]} ${spacing[5]}`,
          marginBottom: spacing[6],
          border: `1px solid ${colors.brand[200]}`,
        }}
      >
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: spacing[4],
        }}>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: typography.size.lg,
              fontWeight: typography.weight.bold,
              color: colors.brand[800],
              letterSpacing: "-0.01em",
            }}>
              Platform Metrikleri
            </h2>
            <p style={{
              margin: `${spacing[1]} 0 0`,
              fontSize: typography.size.sm,
              color: colors.brand[600],
            }}>
              Son 30 gun
            </p>
          </div>
          <div style={{
            width: "8px",
            height: "8px",
            borderRadius: radius.full,
            background: isLoading ? colors.warning.base : colors.success.base,
            boxShadow: isLoading
              ? `0 0 0 3px ${colors.warning.light}`
              : `0 0 0 3px ${colors.success.light}`,
          }} />
        </div>

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
      </div>

      {/* ---- System Readiness — health dashboard ---- */}
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
        <div style={{ display: "flex", flexDirection: "column" }}>
          {READINESS_ITEMS.map((item, index) => (
            <ReadinessCard key={item.area} item={item} index={index} />
          ))}
        </div>
        <p
          style={{ margin: `${spacing[3]} 0 0`, fontSize: typography.size.xs, color: colors.neutral[400] }}
          data-testid="release-readiness-deferred-note"
        >
          Derin backend entegrasyonu, gercek metrik verisi ve kapsamli gorsel modernizasyon ayri fazlarda ele alinacaktir.
        </p>
      </SectionShell>

      {/* ---- Quick Access ---- */}
      <SectionShell
        testId="admin-quick-access-section"
      >
        <h3 data-testid="admin-quick-access-heading" style={{
          margin: 0,
          fontSize: typography.size.lg,
          fontWeight: typography.weight.semibold,
          color: colors.neutral[900],
          marginBottom: spacing[4],
        }}>
          Hizli Erisim
        </h3>
        <div style={CARD_GRID}>
          {filteredLinks.map((link) => (
            <QuickCard
              key={link.to}
              link={link}
              onClick={() => navigate(link.to)}
            />
          ))}
        </div>
      </SectionShell>
    </PageShell>
  );
}
