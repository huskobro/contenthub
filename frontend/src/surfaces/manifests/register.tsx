/**
 * Surface manifest bootstrap — attaches layout bindings to metadata-only
 * manifests and registers the resulting surfaces.
 *
 * Faz 1 — Infrastructure only.
 *
 * CIRCULAR IMPORT DEFENSE:
 *   The legacy/horizon layouts (AdminLayout, UserLayout, HorizonAdminLayout,
 *   HorizonUserLayout) mount <ThemeProvider>. ThemeProvider imports
 *   SurfaceContext, which imports useSurfaceResolution. If this module is
 *   pulled into that chain during initial module evaluation, AdminLayout
 *   may still be `undefined` when registerSurface validates it — causing a
 *   bootstrap crash.
 *
 *   To break the cycle, layouts are NOT dereferenced at module-eval time.
 *   Instead, each layout binding is a thin functional wrapper that reads
 *   the real layout via a `* as` namespace import at render time. Namespace
 *   imports are "live bindings" in ES modules: by the time the wrapper's
 *   body executes (at React render), the full layout module graph has been
 *   evaluated and the component reference is defined.
 */

import { registerSurface } from "../registry";
import type { Surface, SurfaceLayoutProps, SurfacePageOverrideMap } from "../contract";
import { LEGACY_MANIFEST } from "./legacy";
import { HORIZON_MANIFEST } from "./horizon";
import { AURORA_MANIFEST } from "./aurora";

// Namespace imports (live bindings). At module-eval time the namespace
// objects exist but their members may still be uninitialized if we are
// inside a circular dep — that is fine because the wrapper functions below
// only touch them at render time.
import * as AdminLayoutModule from "../../app/layouts/AdminLayout";
import * as UserLayoutModule from "../../app/layouts/UserLayout";
import * as HorizonAdminLayoutModule from "../../app/layouts/HorizonAdminLayout";
import * as HorizonUserLayoutModule from "../../app/layouts/HorizonUserLayout";
// Aurora Faz 6 — "Aurora Dusk Cockpit" both-scope surface. Admin + user
// layouts kullanan 4-katmanlı kokpit kabuğu. Aurora Faz 6 ilk sürümde
// sayfa override'ı kendi rotalarına sahip (aurora-only) — legacy rotaları
// override etmiyor, çünkü layout swap yeterince dönüşüm getiriyor.
import * as AuroraAdminLayoutModule from "../aurora/AuroraAdminLayout";
import * as AuroraUserLayoutModule from "../aurora/AuroraUserLayout";
import * as AuroraAdminDashboardModule from "../aurora/AuroraAdminDashboardPage";
import * as AuroraJobsRegistryModule from "../aurora/AuroraJobsRegistryPage";
import * as AuroraPublishCenterModule from "../aurora/AuroraPublishCenterPage";
import * as AuroraAnalyticsModule from "../aurora/AuroraAnalyticsPage";
import * as AuroraThemesModule from "../aurora/AuroraThemesPage";
import * as AuroraSettingsModule from "../aurora/AuroraSettingsPage";
import * as AuroraPromptsModule from "../aurora/AuroraPromptsPage";
import * as AuroraAuditModule from "../aurora/AuroraAuditPage";
import * as AuroraWizardModule from "../aurora/AuroraWizardPage";
// Aurora user-scope overrides (Faz 6 user wave). Tüm user.* sayfaları
// için Aurora-stilli karşılıkları. Aynı namespace + forwarder paterniyle.
import * as AuroraUserDashboardModule from "../aurora/AuroraUserDashboardPage";
import * as AuroraMyProjectsModule from "../aurora/AuroraMyProjectsPage";
import * as AuroraProjectDetailModule from "../aurora/AuroraProjectDetailPage";
import * as AuroraUserPublishModule from "../aurora/AuroraUserPublishPage";
import * as AuroraMyChannelsModule from "../aurora/AuroraMyChannelsPage";
import * as AuroraChannelDetailModule from "../aurora/AuroraChannelDetailPage";
import * as AuroraUserConnectionsModule from "../aurora/AuroraUserConnectionsPage";
import * as AuroraUserAnalyticsModule from "../aurora/AuroraUserAnalyticsPage";
import * as AuroraUserChannelAnalyticsModule from "../aurora/AuroraUserChannelAnalyticsPage";
import * as AuroraUserYouTubeAnalyticsModule from "../aurora/AuroraUserYouTubeAnalyticsPage";
import * as AuroraUserCalendarModule from "../aurora/AuroraUserCalendarPage";
import * as AuroraUserCommentsModule from "../aurora/AuroraUserCommentsPage";
import * as AuroraUserInboxModule from "../aurora/AuroraUserInboxPage";
import * as AuroraUserAutomationModule from "../aurora/AuroraUserAutomationPage";
import * as AuroraUserNewsPickerModule from "../aurora/AuroraUserNewsPickerPage";
import * as AuroraUserPlaylistsModule from "../aurora/AuroraUserPlaylistsPage";
import * as AuroraUserPostsModule from "../aurora/AuroraUserPostsPage";
import * as AuroraUserJobDetailModule from "../aurora/AuroraUserJobDetailPage";
import * as AuroraUserSettingsModule from "../aurora/AuroraUserSettingsPage";
import * as AuroraUserContentEntryModule from "../aurora/AuroraUserContentEntryPage";
// Aurora admin Faz 6 P1 — operasyon yüzeyleri (registry yelpazesi).
import * as AuroraSourcesRegistryModule from "../aurora/AuroraSourcesRegistryPage";
import * as AuroraNewsItemsRegistryModule from "../aurora/AuroraNewsItemsRegistryPage";
import * as AuroraSourceScansRegistryModule from "../aurora/AuroraSourceScansRegistryPage";
import * as AuroraStandardVideoRegistryModule from "../aurora/AuroraStandardVideoRegistryPage";
import * as AuroraTemplatesRegistryModule from "../aurora/AuroraTemplatesRegistryPage";
import * as AuroraStyleBlueprintsRegistryModule from "../aurora/AuroraStyleBlueprintsRegistryPage";
import * as AuroraVisibilityRegistryModule from "../aurora/AuroraVisibilityRegistryPage";
import * as AuroraUsedNewsRegistryModule from "../aurora/AuroraUsedNewsRegistryPage";
import * as AuroraUsersRegistryModule from "../aurora/AuroraUsersRegistryPage";
import * as AuroraNewsBulletinRegistryModule from "../aurora/AuroraNewsBulletinRegistryPage";
import * as AuroraSourceDetailModule from "../aurora/AuroraSourceDetailPage";
import * as AuroraTemplateStyleLinksRegistryModule from "../aurora/AuroraTemplateStyleLinksRegistryPage";
// Aurora admin Faz 6 P2 — detail yüzeyleri (Wave 3).
import * as AuroraNewsItemDetailModule from "../aurora/AuroraNewsItemDetailPage";
import * as AuroraNewsBulletinDetailModule from "../aurora/AuroraNewsBulletinDetailPage";
import * as AuroraStandardVideoDetailModule from "../aurora/AuroraStandardVideoDetailPage";
import * as AuroraPublishDetailModule from "../aurora/AuroraPublishDetailPage";
// Aurora admin Faz 6 P3 — create/form yüzeyleri (Wave 4).
import * as AuroraSourceCreateModule from "../aurora/AuroraSourceCreatePage";
import * as AuroraSourceScanCreateModule from "../aurora/AuroraSourceScanCreatePage";
import * as AuroraNewsItemCreateModule from "../aurora/AuroraNewsItemCreatePage";
import * as AuroraTemplateCreateModule from "../aurora/AuroraTemplateCreatePage";
import * as AuroraUsedNewsCreateModule from "../aurora/AuroraUsedNewsCreatePage";
import * as AuroraStyleBlueprintCreateModule from "../aurora/AuroraStyleBlueprintCreatePage";
import * as AuroraNewsBulletinCreateModule from "../aurora/AuroraNewsBulletinCreatePage";
import * as AuroraStandardVideoCreateModule from "../aurora/AuroraStandardVideoCreatePage";
// Aurora admin Faz 6 P4 — wizard yüzeyleri (Wave 5).
import * as AuroraNewsBulletinWizardModule from "../aurora/AuroraNewsBulletinWizardPage";
import * as AuroraStandardVideoWizardModule from "../aurora/AuroraStandardVideoWizardPage";
import * as AuroraWizardSettingsModule from "../aurora/AuroraWizardSettingsPage";
// Aurora user wizard yüzeyleri (Faz 7 — kullanıcı tarafı).
import * as AuroraCreateVideoWizardModule from "../aurora/AuroraCreateVideoWizardPage";
import * as AuroraCreateBulletinWizardModule from "../aurora/AuroraCreateBulletinWizardPage";
import * as AuroraCreateProductReviewWizardModule from "../aurora/AuroraCreateProductReviewWizardPage";
// Aurora admin form yüzeyleri (Faz 7 — eksik admin sayfaları).
import * as AuroraTemplateStyleLinkCreateModule from "../aurora/AuroraTemplateStyleLinkCreatePage";
// Aurora admin Faz 6 P5 — system yüzeyleri (Wave 6).
import * as AuroraAssetLibraryModule from "../aurora/AuroraAssetLibraryPage";
import * as AuroraAutomationPoliciesModule from "../aurora/AuroraAutomationPoliciesPage";
import * as AuroraCommentMonitoringModule from "../aurora/AuroraCommentMonitoringPage";
import * as AuroraPostMonitoringModule from "../aurora/AuroraPostMonitoringPage";
import * as AuroraPlaylistMonitoringModule from "../aurora/AuroraPlaylistMonitoringPage";
import * as AuroraProvidersModule from "../aurora/AuroraProvidersPage";
import * as AuroraAdminConnectionsModule from "../aurora/AuroraAdminConnectionsPage";
import * as AuroraAdminInboxModule from "../aurora/AuroraAdminInboxPage";
import * as AuroraAdminNotificationsModule from "../aurora/AuroraAdminNotificationsPage";
import * as AuroraContentLibraryModule from "../aurora/AuroraContentLibraryPage";
import * as AuroraModulesModule from "../aurora/AuroraModulesPage";
import * as AuroraAdminCalendarModule from "../aurora/AuroraAdminCalendarPage";
import * as AuroraUserSettingsDetailModule from "../aurora/AuroraUserSettingsDetailPage";
// Aurora admin Faz 6 P6 — publish + analytics yüzeyleri (Wave 7).
import * as AuroraPublishAnalyticsModule from "../aurora/AuroraPublishAnalyticsPage";
import * as AuroraPublishReviewQueueModule from "../aurora/AuroraPublishReviewQueuePage";
import * as AuroraChannelPerformanceModule from "../aurora/AuroraChannelPerformancePage";
import * as AuroraAnalyticsContentModule from "../aurora/AuroraAnalyticsContentPage";
import * as AuroraAnalyticsOperationsModule from "../aurora/AuroraAnalyticsOperationsPage";
import * as AuroraAdminYouTubeAnalyticsModule from "../aurora/AuroraAdminYouTubeAnalyticsPage";
// Aurora auth + state yüzeyleri.
import * as AuroraLoginModule from "../aurora/AuroraLoginPage";
import * as AuroraOnboardingModule from "../aurora/AuroraOnboardingPage";
import * as AuroraNotFoundModule from "../aurora/AuroraNotFoundPage";
import * as AuroraInternalErrorModule from "../aurora/AuroraInternalErrorPage";
import * as AuroraSessionExpiredModule from "../aurora/AuroraSessionExpiredPage";
import * as AuroraWorkspaceSwitchModule from "../aurora/AuroraWorkspaceSwitchPage";
import * as AuroraForgotPasswordModule from "../aurora/AuroraForgotPasswordPage";

// --- Lazy forwarders -------------------------------------------------------
// Each wrapper reads the real component from the module namespace at render
// time. React sees a function component and is satisfied; the registry sees
// a non-undefined adminLayout/userLayout and the validator accepts it.

function LegacyAdminForwarder(_props: SurfaceLayoutProps) {
  const Impl = AdminLayoutModule.AdminLayout;
  return <Impl />;
}
function LegacyUserForwarder(_props: SurfaceLayoutProps) {
  const Impl = UserLayoutModule.UserLayout;
  return <Impl />;
}
function HorizonAdminForwarder(_props: SurfaceLayoutProps) {
  const Impl = HorizonAdminLayoutModule.HorizonAdminLayout;
  return <Impl />;
}
function HorizonUserForwarder(_props: SurfaceLayoutProps) {
  const Impl = HorizonUserLayoutModule.HorizonUserLayout;
  return <Impl />;
}

// --- Aurora forwarders (Faz 6) ---------------------------------------------
// Both-scope surface: admin + user. İlk sürümde sayfa override yok —
// sadece kabuk swap'ı. Legacy rotalar değişmeden çalışmaya devam eder;
// Aurora layout'u sadece chrome'u (ctxbar, rail, inspector, statusbar)
// değiştirir.

function AuroraAdminForwarder(_props: SurfaceLayoutProps) {
  const Impl = AuroraAdminLayoutModule.AuroraAdminLayout;
  return <Impl />;
}
function AuroraUserForwarder(_props: SurfaceLayoutProps) {
  const Impl = AuroraUserLayoutModule.AuroraUserLayout;
  return <Impl />;
}
function AuroraAdminDashboardForwarder() {
  const Impl = AuroraAdminDashboardModule.AuroraAdminDashboardPage;
  return <Impl />;
}
function AuroraJobsRegistryForwarder() {
  const Impl = AuroraJobsRegistryModule.AuroraJobsRegistryPage;
  return <Impl />;
}
function AuroraPublishCenterForwarder() {
  const Impl = AuroraPublishCenterModule.AuroraPublishCenterPage;
  return <Impl />;
}
function AuroraAnalyticsForwarder() {
  const Impl = AuroraAnalyticsModule.AuroraAnalyticsPage;
  return <Impl />;
}
function AuroraThemesForwarder() {
  const Impl = AuroraThemesModule.AuroraThemesPage;
  return <Impl />;
}
function AuroraSettingsForwarder() {
  const Impl = AuroraSettingsModule.AuroraSettingsPage;
  return <Impl />;
}
function AuroraPromptsForwarder() {
  const Impl = AuroraPromptsModule.AuroraPromptsPage;
  return <Impl />;
}
function AuroraAuditForwarder() {
  const Impl = AuroraAuditModule.AuroraAuditPage;
  return <Impl />;
}
function AuroraWizardForwarder() {
  const Impl = AuroraWizardModule.AuroraWizardPage;
  return <Impl />;
}

// --- Aurora user forwarders (Faz 6 user wave) -----------------------------
function AuroraUserDashboardForwarder() {
  const Impl = AuroraUserDashboardModule.AuroraUserDashboardPage;
  return <Impl />;
}
function AuroraMyProjectsForwarder() {
  const Impl = AuroraMyProjectsModule.AuroraMyProjectsPage;
  return <Impl />;
}
function AuroraProjectDetailForwarder() {
  const Impl = AuroraProjectDetailModule.AuroraProjectDetailPage;
  return <Impl />;
}
function AuroraUserPublishForwarder() {
  const Impl = AuroraUserPublishModule.AuroraUserPublishPage;
  return <Impl />;
}
function AuroraMyChannelsForwarder() {
  const Impl = AuroraMyChannelsModule.AuroraMyChannelsPage;
  return <Impl />;
}
function AuroraChannelDetailForwarder() {
  const Impl = AuroraChannelDetailModule.AuroraChannelDetailPage;
  return <Impl />;
}
function AuroraUserConnectionsForwarder() {
  const Impl = AuroraUserConnectionsModule.AuroraUserConnectionsPage;
  return <Impl />;
}
function AuroraUserAnalyticsForwarder() {
  const Impl = AuroraUserAnalyticsModule.AuroraUserAnalyticsPage;
  return <Impl />;
}
function AuroraUserChannelAnalyticsForwarder() {
  const Impl = AuroraUserChannelAnalyticsModule.AuroraUserChannelAnalyticsPage;
  return <Impl />;
}
function AuroraUserYouTubeAnalyticsForwarder() {
  const Impl = AuroraUserYouTubeAnalyticsModule.AuroraUserYouTubeAnalyticsPage;
  return <Impl />;
}
function AuroraUserCalendarForwarder() {
  const Impl = AuroraUserCalendarModule.AuroraUserCalendarPage;
  return <Impl />;
}
function AuroraUserCommentsForwarder() {
  const Impl = AuroraUserCommentsModule.AuroraUserCommentsPage;
  return <Impl />;
}
function AuroraUserInboxForwarder() {
  const Impl = AuroraUserInboxModule.AuroraUserInboxPage;
  return <Impl />;
}
function AuroraUserAutomationForwarder() {
  const Impl = AuroraUserAutomationModule.AuroraUserAutomationPage;
  return <Impl />;
}
function AuroraUserNewsPickerForwarder() {
  const Impl = AuroraUserNewsPickerModule.AuroraUserNewsPickerPage;
  return <Impl />;
}
function AuroraUserPlaylistsForwarder() {
  const Impl = AuroraUserPlaylistsModule.AuroraUserPlaylistsPage;
  return <Impl />;
}
function AuroraUserPostsForwarder() {
  const Impl = AuroraUserPostsModule.AuroraUserPostsPage;
  return <Impl />;
}
function AuroraUserJobDetailForwarder() {
  const Impl = AuroraUserJobDetailModule.AuroraUserJobDetailPage;
  return <Impl />;
}
function AuroraUserSettingsForwarder() {
  const Impl = AuroraUserSettingsModule.AuroraUserSettingsPage;
  return <Impl />;
}
function AuroraUserContentEntryForwarder() {
  const Impl = AuroraUserContentEntryModule.AuroraUserContentEntryPage;
  return <Impl />;
}

// --- Aurora admin P1 forwarders -------------------------------------------
function AuroraSourcesRegistryForwarder() {
  const Impl = AuroraSourcesRegistryModule.AuroraSourcesRegistryPage;
  return <Impl />;
}
function AuroraNewsItemsRegistryForwarder() {
  const Impl = AuroraNewsItemsRegistryModule.AuroraNewsItemsRegistryPage;
  return <Impl />;
}
function AuroraSourceScansRegistryForwarder() {
  const Impl = AuroraSourceScansRegistryModule.AuroraSourceScansRegistryPage;
  return <Impl />;
}
function AuroraStandardVideoRegistryForwarder() {
  const Impl = AuroraStandardVideoRegistryModule.AuroraStandardVideoRegistryPage;
  return <Impl />;
}
function AuroraTemplatesRegistryForwarder() {
  const Impl = AuroraTemplatesRegistryModule.AuroraTemplatesRegistryPage;
  return <Impl />;
}
function AuroraStyleBlueprintsRegistryForwarder() {
  const Impl = AuroraStyleBlueprintsRegistryModule.AuroraStyleBlueprintsRegistryPage;
  return <Impl />;
}
function AuroraVisibilityRegistryForwarder() {
  const Impl = AuroraVisibilityRegistryModule.AuroraVisibilityRegistryPage;
  return <Impl />;
}
function AuroraUsedNewsRegistryForwarder() {
  const Impl = AuroraUsedNewsRegistryModule.AuroraUsedNewsRegistryPage;
  return <Impl />;
}
function AuroraUsersRegistryForwarder() {
  const Impl = AuroraUsersRegistryModule.AuroraUsersRegistryPage;
  return <Impl />;
}
function AuroraNewsBulletinRegistryForwarder() {
  const Impl = AuroraNewsBulletinRegistryModule.AuroraNewsBulletinRegistryPage;
  return <Impl />;
}
function AuroraSourceDetailForwarder() {
  const Impl = AuroraSourceDetailModule.AuroraSourceDetailPage;
  return <Impl />;
}
function AuroraTemplateStyleLinksRegistryForwarder() {
  const Impl = AuroraTemplateStyleLinksRegistryModule.AuroraTemplateStyleLinksRegistryPage;
  return <Impl />;
}

// --- Aurora admin P2 detail forwarders (Wave 3) --------------------------
function AuroraNewsItemDetailForwarder() {
  const Impl = AuroraNewsItemDetailModule.AuroraNewsItemDetailPage;
  return <Impl />;
}
function AuroraNewsBulletinDetailForwarder() {
  const Impl = AuroraNewsBulletinDetailModule.AuroraNewsBulletinDetailPage;
  return <Impl />;
}
function AuroraStandardVideoDetailForwarder() {
  const Impl = AuroraStandardVideoDetailModule.AuroraStandardVideoDetailPage;
  return <Impl />;
}
function AuroraPublishDetailForwarder() {
  const Impl = AuroraPublishDetailModule.AuroraPublishDetailPage;
  return <Impl />;
}

// --- Aurora admin P3 create/form forwarders (Wave 4) ---------------------
function AuroraSourceCreateForwarder() {
  const Impl = AuroraSourceCreateModule.AuroraSourceCreatePage;
  return <Impl />;
}
function AuroraSourceScanCreateForwarder() {
  const Impl = AuroraSourceScanCreateModule.AuroraSourceScanCreatePage;
  return <Impl />;
}
function AuroraNewsItemCreateForwarder() {
  const Impl = AuroraNewsItemCreateModule.AuroraNewsItemCreatePage;
  return <Impl />;
}
function AuroraTemplateCreateForwarder() {
  const Impl = AuroraTemplateCreateModule.AuroraTemplateCreatePage;
  return <Impl />;
}
function AuroraUsedNewsCreateForwarder() {
  const Impl = AuroraUsedNewsCreateModule.AuroraUsedNewsCreatePage;
  return <Impl />;
}
function AuroraStyleBlueprintCreateForwarder() {
  const Impl = AuroraStyleBlueprintCreateModule.AuroraStyleBlueprintCreatePage;
  return <Impl />;
}
function AuroraNewsBulletinCreateForwarder() {
  const Impl = AuroraNewsBulletinCreateModule.AuroraNewsBulletinCreatePage;
  return <Impl />;
}
function AuroraStandardVideoCreateForwarder() {
  const Impl = AuroraStandardVideoCreateModule.AuroraStandardVideoCreatePage;
  return <Impl />;
}

// --- Aurora admin P4 wizard forwarders (Wave 5) --------------------------
function AuroraNewsBulletinWizardForwarder() {
  const Impl = AuroraNewsBulletinWizardModule.AuroraNewsBulletinWizardPage;
  return <Impl />;
}
function AuroraStandardVideoWizardForwarder() {
  const Impl = AuroraStandardVideoWizardModule.AuroraStandardVideoWizardPage;
  return <Impl />;
}
function AuroraWizardSettingsForwarder() {
  const Impl = AuroraWizardSettingsModule.AuroraWizardSettingsPage;
  return <Impl />;
}

// --- Aurora user wizard forwarders (Faz 7 — kullanıcı tarafı) ------------
function AuroraCreateVideoWizardForwarder() {
  const Impl = AuroraCreateVideoWizardModule.AuroraCreateVideoWizardPage;
  return <Impl />;
}
function AuroraCreateBulletinWizardForwarder() {
  const Impl = AuroraCreateBulletinWizardModule.AuroraCreateBulletinWizardPage;
  return <Impl />;
}
function AuroraCreateProductReviewWizardForwarder() {
  const Impl = AuroraCreateProductReviewWizardModule.AuroraCreateProductReviewWizardPage;
  return <Impl />;
}
function AuroraTemplateStyleLinkCreateForwarder() {
  const Impl = AuroraTemplateStyleLinkCreateModule.AuroraTemplateStyleLinkCreatePage;
  return <Impl />;
}

// --- Aurora admin P5 system forwarders (Wave 6) --------------------------
function AuroraAssetLibraryForwarder() {
  const Impl = AuroraAssetLibraryModule.AuroraAssetLibraryPage;
  return <Impl />;
}
function AuroraAutomationPoliciesForwarder() {
  const Impl = AuroraAutomationPoliciesModule.AuroraAutomationPoliciesPage;
  return <Impl />;
}
function AuroraCommentMonitoringForwarder() {
  const Impl = AuroraCommentMonitoringModule.AuroraCommentMonitoringPage;
  return <Impl />;
}
function AuroraPostMonitoringForwarder() {
  const Impl = AuroraPostMonitoringModule.AuroraPostMonitoringPage;
  return <Impl />;
}
function AuroraPlaylistMonitoringForwarder() {
  const Impl = AuroraPlaylistMonitoringModule.AuroraPlaylistMonitoringPage;
  return <Impl />;
}
function AuroraProvidersForwarder() {
  const Impl = AuroraProvidersModule.AuroraProvidersPage;
  return <Impl />;
}
function AuroraAdminConnectionsForwarder() {
  const Impl = AuroraAdminConnectionsModule.AuroraAdminConnectionsPage;
  return <Impl />;
}
function AuroraAdminInboxForwarder() {
  const Impl = AuroraAdminInboxModule.AuroraAdminInboxPage;
  return <Impl />;
}
function AuroraAdminNotificationsForwarder() {
  const Impl = AuroraAdminNotificationsModule.AuroraAdminNotificationsPage;
  return <Impl />;
}
function AuroraContentLibraryForwarder() {
  const Impl = AuroraContentLibraryModule.AuroraContentLibraryPage;
  return <Impl />;
}
function AuroraModulesForwarder() {
  const Impl = AuroraModulesModule.AuroraModulesPage;
  return <Impl />;
}
function AuroraAdminCalendarForwarder() {
  const Impl = AuroraAdminCalendarModule.AuroraAdminCalendarPage;
  return <Impl />;
}
function AuroraUserSettingsDetailForwarder() {
  const Impl = AuroraUserSettingsDetailModule.AuroraUserSettingsDetailPage;
  return <Impl />;
}

// --- Aurora admin P6 publish + analytics forwarders (Wave 7) -------------
function AuroraPublishAnalyticsForwarder() {
  const Impl = AuroraPublishAnalyticsModule.AuroraPublishAnalyticsPage;
  return <Impl />;
}
function AuroraPublishReviewQueueForwarder() {
  const Impl = AuroraPublishReviewQueueModule.AuroraPublishReviewQueuePage;
  return <Impl />;
}
function AuroraChannelPerformanceForwarder() {
  const Impl = AuroraChannelPerformanceModule.AuroraChannelPerformancePage;
  return <Impl />;
}
function AuroraAnalyticsContentForwarder() {
  const Impl = AuroraAnalyticsContentModule.AuroraAnalyticsContentPage;
  return <Impl />;
}
function AuroraAnalyticsOperationsForwarder() {
  const Impl = AuroraAnalyticsOperationsModule.AuroraAnalyticsOperationsPage;
  return <Impl />;
}
function AuroraAdminYouTubeAnalyticsForwarder() {
  const Impl = AuroraAdminYouTubeAnalyticsModule.AuroraAdminYouTubeAnalyticsPage;
  return <Impl />;
}

// --- Aurora auth + state forwarders --------------------------------------
function AuroraLoginForwarder() {
  const Impl = AuroraLoginModule.AuroraLoginPage;
  return <Impl />;
}
function AuroraOnboardingForwarder() {
  const Impl = AuroraOnboardingModule.AuroraOnboardingPage;
  return <Impl />;
}
function AuroraNotFoundForwarder() {
  const Impl = AuroraNotFoundModule.AuroraNotFoundPage;
  return <Impl />;
}
function AuroraInternalErrorForwarder() {
  const Impl = AuroraInternalErrorModule.AuroraInternalErrorPage;
  return <Impl />;
}
function AuroraSessionExpiredForwarder() {
  const Impl = AuroraSessionExpiredModule.AuroraSessionExpiredPage;
  return <Impl />;
}
function AuroraWorkspaceSwitchForwarder() {
  const Impl = AuroraWorkspaceSwitchModule.AuroraWorkspaceSwitchPage;
  return <Impl />;
}
function AuroraForgotPasswordForwarder() {
  const Impl = AuroraForgotPasswordModule.AuroraForgotPasswordPage;
  return <Impl />;
}

const AURORA_PAGE_OVERRIDES: SurfacePageOverrideMap = {
  // Faz 6 P0-1 — Ops rail kokpit dashboard.
  "admin.dashboard": AuroraAdminDashboardForwarder,
  // Faz 6 P0-2 — Jobs registry (full port: filter chips, sortable table,
  // column selector, bulk actions, context menu, detail drawer).
  "admin.jobs.registry": AuroraJobsRegistryForwarder,
  // Faz 6 P0-3 — Publish center (queue/approved/channels tabs + inspector).
  "admin.publish.center": AuroraPublishCenterForwarder,
  // Faz 6 P0-4 — Analytics overview (KPI strip + bar/line charts + top content).
  "admin.analytics.overview": AuroraAnalyticsForwarder,
  // Faz 6 P0-5 — Theme gallery (mini-cockpit cards + click-to-activate).
  "admin.themes": AuroraThemesForwarder,
  // Faz 6 P0-6 — Settings registry browser (read-only inspect; full editor
  // legacy SettingsRegistryPage'de kalır).
  "admin.settings": AuroraSettingsForwarder,
  // Faz 6 P0-7 — Prompt editor (kart grid + textarea editör + admin_value PUT).
  "admin.prompts": AuroraPromptsForwarder,
  // Faz 6 P0-8 — Denetim kaydı (filter + 6 sütunlu tablo + inspector).
  "admin.audit": AuroraAuditForwarder,
  // Faz 6 P0-9 — Generic wizard (3-step modül seçici → form → review;
  // launch sonrası modül-spesifik resmi wizard'a yönlendirir).
  "admin.wizard": AuroraWizardForwarder,
  // --- Faz 6 user wave: tüm user.* sayfaları Aurora-stilli karşılıklarına
  // bağlanır. Her override gerçek backend hook'larını (React Query +
  // Zustand) kullanır; HTML mockup'lardaki hardcoded data canlı veriye
  // bağlandı. Hiçbiri stub değil — buton/handler/save path uçtan uca
  // backend'e gider.
  "user.dashboard": AuroraUserDashboardForwarder,
  "user.projects.list": AuroraMyProjectsForwarder,
  "user.projects.detail": AuroraProjectDetailForwarder,
  "user.publish": AuroraUserPublishForwarder,
  "user.channels.list": AuroraMyChannelsForwarder,
  "user.channels.detail": AuroraChannelDetailForwarder,
  "user.connections.list": AuroraUserConnectionsForwarder,
  "user.analytics.overview": AuroraUserAnalyticsForwarder,
  "user.analytics.channels": AuroraUserChannelAnalyticsForwarder,
  "user.analytics.youtube": AuroraUserYouTubeAnalyticsForwarder,
  "user.calendar": AuroraUserCalendarForwarder,
  "user.comments": AuroraUserCommentsForwarder,
  "user.inbox": AuroraUserInboxForwarder,
  "user.automation": AuroraUserAutomationForwarder,
  "user.news.picker": AuroraUserNewsPickerForwarder,
  "user.playlists": AuroraUserPlaylistsForwarder,
  "user.posts": AuroraUserPostsForwarder,
  "user.jobs.detail": AuroraUserJobDetailForwarder,
  "user.settings": AuroraUserSettingsForwarder,
  "user.content": AuroraUserContentEntryForwarder,
  // Admin job detail — aynı bileşen basePath'i useLocation ile algılar.
  "admin.jobs.detail": AuroraUserJobDetailForwarder,
  // --- Faz 6 P1 admin operasyon registry yüzeyleri --------------------------
  // Faz 6 P1-1 — Sources registry (RSS/API/Scrape kaynak listesi, sağlık
  // dotları, toplu tarama + toplu silme, inspector KPI'leri). Live data via
  // useSourcesList; mutations: triggerSourceScan, bulkDeleteSources.
  "admin.sources.registry": AuroraSourcesRegistryForwarder,
  // Faz 6 P1-2 — News items registry (canlı liste + trust chip + son 24s
  // metriği + inspector trust dağılımı). useNewsItemsList + useSourcesList.
  "admin.news-items.registry": AuroraNewsItemsRegistryForwarder,
  // Faz 6 P1-3 — Source scans registry (tarama geçmişi, durum dot, süre,
  // bulunan/yeni öğe sayıları, retry). useSourceScansList + retryScan.
  "admin.source-scans.registry": AuroraSourceScansRegistryForwarder,
  // Faz 6 P1-4 — Standard video registry (job ilerlemesi, template+blueprint
  // chip'leri, status dağılımı). useStandardVideosList + useJobsList join.
  "admin.standard-video.registry": AuroraStandardVideoRegistryForwarder,
  // Faz 6 P1-5 — Templates registry (owner chip, version, family, impact KPI).
  // useTemplatesList + useTemplateImpact("last_7d").
  "admin.templates.registry": AuroraTemplatesRegistryForwarder,
  // Faz 6 P1-6 — Style blueprints registry (motion+layout chip stack, version,
  // job kullanımı). useStyleBlueprintsList + useJobsList aggregation.
  "admin.style-blueprints.registry": AuroraStyleBlueprintsRegistryForwarder,
  // Faz 6 P1-7 — Visibility registry (target_key + scope/action chip + öncelik
  // + status dot + inspector dağılımları). useVisibilityRulesList.
  "admin.visibility.registry": AuroraVisibilityRegistryForwarder,
  // Faz 6 P1-8 — Used news registry (kullanılmış haberler). useUsedNewsList +
  // useNewsItemsList join.
  "admin.used-news.registry": AuroraUsedNewsRegistryForwarder,
  // Faz 6 P1-9 — Users registry (admin-only). useUsers; rol/durum chip +
  // bulk pasifleştirme.
  "admin.users.registry": AuroraUsersRegistryForwarder,
  // Faz 6 P1-10 — News bulletin registry. useNewsBulletinsList +
  // useTemplatesList ile şablon adı.
  "admin.news-bulletins.registry": AuroraNewsBulletinRegistryForwarder,
  // Faz 6 P1-11 — Template ↔ Style blueprint linkleri. useTemplateStyleLinksList
  // + bulk delete useDeleteTemplateStyleLink.
  "admin.template-style-links.registry": AuroraTemplateStyleLinksRegistryForwarder,
  // --- Faz 6 P2 admin detail yüzeyleri --------------------------------------
  // Faz 6 P2-1 — Source detail (KPI inspector + scan/edit/delete aksiyonları).
  "admin.sources.detail": AuroraSourceDetailForwarder,
  // Faz 6 P2-2 — News item detail (haber öğesi tam görünüm + kaynak bilgisi).
  "admin.news-items.detail": AuroraNewsItemDetailForwarder,
  // Faz 6 P2-3 — News bulletin detail (script/metadata + iş zincir trace).
  "admin.news-bulletins.detail": AuroraNewsBulletinDetailForwarder,
  // Faz 6 P2-4 — Standard video detail (overview + script + metadata panel).
  "admin.standard-video.detail": AuroraStandardVideoDetailForwarder,
  // Faz 6 P2-5 — Publish detail (yayın kaydı + retry/log + analytics linkleri).
  "admin.publish.detail": AuroraPublishDetailForwarder,
  // --- Faz 6 P3 admin create/form yüzeyleri ---------------------------------
  // Faz 6 P3-1 — Source create (RSS/API/Scrape yeni kaynak ekleme formu).
  "admin.sources.create": AuroraSourceCreateForwarder,
  // Faz 6 P3-2 — Source scan create (manuel tarama tetikleme formu).
  "admin.source-scans.create": AuroraSourceScanCreateForwarder,
  // Faz 6 P3-3 — News item create (manuel haber öğesi ekleme formu).
  "admin.news-items.create": AuroraNewsItemCreateForwarder,
  // Faz 6 P3-4 — Template create (yeni şablon kayıt formu).
  "admin.templates.create": AuroraTemplateCreateForwarder,
  // Faz 6 P3-5 — Used news create (manuel kullanılmış haber işaretleme formu).
  "admin.used-news.create": AuroraUsedNewsCreateForwarder,
  // Faz 6 P3-6 — Style blueprint create (yeni style blueprint formu).
  "admin.style-blueprints.create": AuroraStyleBlueprintCreateForwarder,
  // Faz 6 P3-7 — News bulletin create (yeni bülten kayıt formu).
  "admin.news-bulletins.create": AuroraNewsBulletinCreateForwarder,
  // Faz 6 P3-8 — Standard video create (manuel video iş kayıt formu).
  "admin.standard-video.create": AuroraStandardVideoCreateForwarder,
  // --- Faz 6 P4 admin wizard yüzeyleri (Wave 5) ----------------------------
  // News bulletin wizard — modüle özel rehberli akış.
  "admin.news-bulletins.wizard": AuroraNewsBulletinWizardForwarder,
  // Standard video wizard — modüle özel rehberli akış.
  "admin.standard-video.wizard": AuroraStandardVideoWizardForwarder,
  // Wizard governance — admin tarafından wizard adımları ve görünürlüğün yönetimi.
  "admin.wizard.settings": AuroraWizardSettingsForwarder,
  // --- Faz 6 P5 admin sistem yüzeyleri (Wave 6) ----------------------------
  // Asset library — yüklenen medya dosyalarının yönetimi.
  "admin.assets.library": AuroraAssetLibraryForwarder,
  // Automation policies — otomatik yayın/onay kuralları.
  "admin.automation.policies": AuroraAutomationPoliciesForwarder,
  // Comment monitoring — admin görünümü.
  "admin.comments.monitoring": AuroraCommentMonitoringForwarder,
  // Post monitoring — admin görünümü.
  "admin.posts.monitoring": AuroraPostMonitoringForwarder,
  // Playlist monitoring — admin görünümü.
  "admin.playlists.monitoring": AuroraPlaylistMonitoringForwarder,
  // Providers — AI/medya provider'ları yönetimi.
  "admin.providers": AuroraProvidersForwarder,
  // Admin connections — kanal ve hesap bağlantı yönetimi.
  "admin.connections": AuroraAdminConnectionsForwarder,
  // Admin inbox — mesaj/etkileşim merkezi.
  "admin.inbox": AuroraAdminInboxForwarder,
  // Admin notifications — bildirim merkezi.
  "admin.notifications": AuroraAdminNotificationsForwarder,
  // Content library — admin tarafı tüm içerik kütüphanesi.
  "admin.library": AuroraContentLibraryForwarder,
  // Modules — modül etkinleştirme/devre dışı bırakma.
  "admin.modules": AuroraModulesForwarder,
  // Admin calendar — yayın planlama takvimi.
  "admin.calendar": AuroraAdminCalendarForwarder,
  // User detail — admin tarafından kullanıcı detay ekranı.
  "admin.users.detail": AuroraUserSettingsDetailForwarder,
  // --- Faz 6 P6 admin publish + analytics yüzeyleri (Wave 7) ---------------
  // Publish analytics — yayın sonrası performans dashboard.
  "admin.publish.analytics": AuroraPublishAnalyticsForwarder,
  // Publish review queue — yayın öncesi onay kuyruğu.
  "admin.publish.review-queue": AuroraPublishReviewQueueForwarder,
  // Channel performance — kanal bazında analitik.
  "admin.analytics.channels": AuroraChannelPerformanceForwarder,
  // Content analytics — içerik bazında analitik.
  "admin.analytics.content": AuroraAnalyticsContentForwarder,
  // Operations analytics — operasyon (job/render) analizi.
  "admin.analytics.operations": AuroraAnalyticsOperationsForwarder,
  // YouTube admin analytics — admin görünümü kanal performansı.
  "admin.analytics.youtube": AuroraAdminYouTubeAnalyticsForwarder,
  // --- Aurora user wizard yüzeyleri (Faz 7) --------------------------------
  // Standart video wizard — 6 adımlı (kanal → proje → temel → stil → şablon →
  // önizleme). POST /api/v1/modules/standard-video ile job başlatır.
  "user.create.video": AuroraCreateVideoWizardForwarder,
  // Haber bülteni wizard — 4 adımlı (kanal → proje → stil → devam).
  // /user/news-picker'a query param ile yönlendirir.
  "user.create.bulletin": AuroraCreateBulletinWizardForwarder,
  // Ürün incelemesi wizard — 5 adımlı (kanal → proje → ürün scrape → ayarlar →
  // önizleme). createProductReview + startProductReviewProduction.
  "user.create.product-review": AuroraCreateProductReviewWizardForwarder,
  // Template ↔ Style Blueprint bağlantı oluşturma. Canlı template/blueprint
  // dropdown'ları + chip rol/durum + inspector özet.
  "admin.template-style-links.create": AuroraTemplateStyleLinkCreateForwarder,
  // --- Aurora auth + state yüzeyleri ---------------------------------------
  "auth.login": AuroraLoginForwarder,
  "auth.onboarding": AuroraOnboardingForwarder,
  "auth.404": AuroraNotFoundForwarder,
  "auth.500": AuroraInternalErrorForwarder,
  "auth.session-expired": AuroraSessionExpiredForwarder,
  "auth.workspace-switch": AuroraWorkspaceSwitchForwarder,
  "auth.forgot-password": AuroraForgotPasswordForwarder,
};

const LEGACY_SURFACE: Surface = {
  manifest: LEGACY_MANIFEST,
  adminLayout: LegacyAdminForwarder,
  userLayout: LegacyUserForwarder,
};

const HORIZON_SURFACE: Surface = {
  manifest: HORIZON_MANIFEST,
  adminLayout: HorizonAdminForwarder,
  userLayout: HorizonUserForwarder,
};

// Aurora-only runtime: only legacy, horizon (safety-net) and aurora
// (production) surfaces are registered. Atrium/Bridge/Canvas were removed
// in the Aurora-only cleanup wave; their snapshot fields, settings keys,
// and tests were dropped alongside the source modules.
const AURORA_SURFACE: Surface = {
  manifest: AURORA_MANIFEST,
  adminLayout: AuroraAdminForwarder,
  userLayout: AuroraUserForwarder,
  pageOverrides: AURORA_PAGE_OVERRIDES,
};

registerSurface(LEGACY_SURFACE);
registerSurface(HORIZON_SURFACE);
registerSurface(AURORA_SURFACE);

/** Re-register all built-ins (used by tests after __resetSurfaceRegistry). */
export function registerBuiltinSurfaces(): void {
  registerSurface(LEGACY_SURFACE);
  registerSurface(HORIZON_SURFACE);
  registerSurface(AURORA_SURFACE);
}
