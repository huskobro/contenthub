import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import { DynamicAdminLayout } from "./layouts/DynamicAdminLayout";
import { DynamicUserLayout } from "./layouts/DynamicUserLayout";
import { AppEntryGate } from "./AppEntryGate";
import { AuthGuard } from "./guards/AuthGuard";
import { OnboardingPage } from "../pages/OnboardingPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { RootErrorBoundary } from "../components/RootErrorBoundary";
import { AdminOverviewPage } from "../pages/AdminOverviewPage";
import { UserDashboardPage } from "../pages/UserDashboardPage";
import { UserContentEntryPage } from "../pages/UserContentEntryPage";

// Lazy-loaded user publish page (Faz 11)
const UserPublishPage = lazy(() => import("../pages/user/UserPublishPage").then(m => ({ default: m.UserPublishPage })));
import { LoginPage } from "../pages/LoginPage";
import { ForgotPasswordPage } from "../pages/ForgotPasswordPage";
// 2FA route removed in final product pass — backend 2FA is not implemented
// and the sayfa did not perform real verification. When 2FA lands, re-add the
// /2fa route together with the backend endpoint and enable flag on User.
import { SessionExpiredPage } from "../pages/SessionExpiredPage";
import { WorkspaceSwitchPage } from "../pages/WorkspaceSwitchPage";
import { InternalErrorPage } from "../pages/InternalErrorPage";
import { SettingsRegistryPage } from "../pages/admin/SettingsRegistryPage";
import { VisibilityRegistryPage } from "../pages/admin/VisibilityRegistryPage";
import { JobsRegistryPage } from "../pages/admin/JobsRegistryPage";
import { StandardVideoRegistryPage } from "../pages/admin/StandardVideoRegistryPage";
import { StandardVideoCreatePage } from "../pages/admin/StandardVideoCreatePage";
import { TemplatesRegistryPage } from "../pages/admin/TemplatesRegistryPage";
import { TemplateCreatePage } from "../pages/admin/TemplateCreatePage";
import { StyleBlueprintsRegistryPage } from "../pages/admin/StyleBlueprintsRegistryPage";
import { StyleBlueprintCreatePage } from "../pages/admin/StyleBlueprintCreatePage";
import { SourcesRegistryPage } from "../pages/admin/SourcesRegistryPage";
import { SourceDetailPage } from "../pages/admin/SourceDetailPage";
import { SourceCreatePage } from "../pages/admin/SourceCreatePage";
import { SourceScansRegistryPage } from "../pages/admin/SourceScansRegistryPage";
import { SourceScanCreatePage } from "../pages/admin/SourceScanCreatePage";
import { NewsBulletinRegistryPage } from "../pages/admin/NewsBulletinRegistryPage";
import { NewsBulletinCreatePage } from "../pages/admin/NewsBulletinCreatePage";
import { UsedNewsRegistryPage } from "../pages/admin/UsedNewsRegistryPage";
import { UsedNewsCreatePage } from "../pages/admin/UsedNewsCreatePage";
import { NewsItemsRegistryPage } from "../pages/admin/NewsItemsRegistryPage";
import { NewsItemCreatePage } from "../pages/admin/NewsItemCreatePage";
import { NewsItemDetailPage } from "../pages/admin/NewsItemDetailPage";
import { TemplateStyleLinksRegistryPage } from "../pages/admin/TemplateStyleLinksRegistryPage";
import { TemplateStyleLinkCreatePage } from "../pages/admin/TemplateStyleLinkCreatePage";
import { UserYouTubeCallbackPage } from "../pages/user/UserYouTubeCallbackPage";
import { VisibilityGuard } from "../components/visibility/VisibilityGuard";
import { ModuleManagementPage } from "../pages/admin/ModuleManagementPage";
import { ProviderManagementPage } from "../pages/admin/ProviderManagementPage";
import { PromptEditorPage } from "../pages/admin/PromptEditorPage";
import { WizardLauncherPage } from "../pages/admin/WizardLauncherPage";
import { UsersRegistryPage } from "../pages/admin/UsersRegistryPage";
import { UserSettingsDetailPage } from "../pages/admin/UserSettingsDetailPage";
import { UserSettingsPage } from "../pages/UserSettingsPage";

// ---------------------------------------------------------------------------
// Lazy-loaded pages (heavy admin pages > 150 lines, code-split for perf)
// ---------------------------------------------------------------------------
const ThemeRegistryPage = lazy(() => import("../pages/admin/ThemeRegistryPage").then(m => ({ default: m.ThemeRegistryPage })));
const ContentLibraryPage = lazy(() => import("../pages/admin/ContentLibraryPage").then(m => ({ default: m.ContentLibraryPage })));
const AssetLibraryPage = lazy(() => import("../pages/admin/AssetLibraryPage").then(m => ({ default: m.AssetLibraryPage })));
const PublishCenterPage = lazy(() => import("../pages/admin/PublishCenterPage").then(m => ({ default: m.PublishCenterPage })));
const PublishReviewQueuePage = lazy(() => import("../pages/admin/PublishReviewQueuePage").then(m => ({ default: m.PublishReviewQueuePage })));
const PublishDetailPage = lazy(() => import("../pages/admin/PublishDetailPage").then(m => ({ default: m.PublishDetailPage })));
const AnalyticsOverviewPage = lazy(() => import("../pages/admin/AnalyticsOverviewPage").then(m => ({ default: m.AnalyticsOverviewPage })));
const AnalyticsContentPage = lazy(() => import("../pages/admin/AnalyticsContentPage").then(m => ({ default: m.AnalyticsContentPage })));
const AnalyticsOperationsPage = lazy(() => import("../pages/admin/AnalyticsOperationsPage").then(m => ({ default: m.AnalyticsOperationsPage })));
const AdminYouTubeAnalyticsPage = lazy(() => import("../pages/admin/AdminYouTubeAnalyticsPage").then(m => ({ default: m.AdminYouTubeAnalyticsPage })));
const PublishAnalyticsPage = lazy(() => import("../pages/admin/PublishAnalyticsPage").then(m => ({ default: m.PublishAnalyticsPage })));
const JobDetailPage = lazy(() => import("../pages/admin/JobDetailPage").then(m => ({ default: m.JobDetailPage })));
const StandardVideoDetailPage = lazy(() => import("../pages/admin/StandardVideoDetailPage").then(m => ({ default: m.StandardVideoDetailPage })));
const StandardVideoWizardPage = lazy(() => import("../pages/admin/StandardVideoWizardPage").then(m => ({ default: m.StandardVideoWizardPage })));
const AuditLogPage = lazy(() => import("../pages/admin/AuditLogPage").then(m => ({ default: m.AuditLogPage })));
const WizardSettingsPage = lazy(() => import("../pages/admin/WizardSettingsPage").then(m => ({ default: m.WizardSettingsPage })));
const NewsBulletinWizardPage = lazy(() => import("../pages/admin/NewsBulletinWizardPage").then(m => ({ default: m.NewsBulletinWizardPage })));
const NewsBulletinDetailPage = lazy(() => import("../pages/admin/NewsBulletinDetailPage").then(m => ({ default: m.NewsBulletinDetailPage })));

// Lazy-loaded user pages (Faz 4)
const MyProjectsPage = lazy(() => import("../pages/user/MyProjectsPage").then(m => ({ default: m.MyProjectsPage })));
const MyChannelsPage = lazy(() => import("../pages/user/MyChannelsPage").then(m => ({ default: m.MyChannelsPage })));
const ChannelDetailPage = lazy(() => import("../pages/user/ChannelDetailPage").then(m => ({ default: m.ChannelDetailPage })));

// Lazy-loaded user wizard pages (Faz 5)
const CreateVideoWizardPage = lazy(() => import("../pages/user/CreateVideoWizardPage").then(m => ({ default: m.CreateVideoWizardPage })));
const CreateBulletinWizardPage = lazy(() => import("../pages/user/CreateBulletinWizardPage").then(m => ({ default: m.CreateBulletinWizardPage })));
const CreateProductReviewWizardPage = lazy(() => import("../pages/user/CreateProductReviewWizardPage").then(m => ({ default: m.CreateProductReviewWizardPage })));
const ProjectDetailPage = lazy(() => import("../pages/user/ProjectDetailPage").then(m => ({ default: m.ProjectDetailPage })));
const UserJobDetailPage = lazy(() => import("../pages/user/UserJobDetailPage").then(m => ({ default: m.UserJobDetailPage })));
const UserAnalyticsPage = lazy(() => import("../pages/user/UserAnalyticsPage").then(m => ({ default: m.UserAnalyticsPage })));
const UserCommentsPage = lazy(() => import("../pages/user/UserCommentsPage").then(m => ({ default: m.UserCommentsPage })));
const UserPlaylistsPage = lazy(() => import("../pages/user/UserPlaylistsPage").then(m => ({ default: m.UserPlaylistsPage })));
const AdminCommentMonitoringPage = lazy(() => import("../pages/admin/AdminCommentMonitoringPage").then(m => ({ default: m.AdminCommentMonitoringPage })));
const AdminPlaylistMonitoringPage = lazy(() => import("../pages/admin/AdminPlaylistMonitoringPage").then(m => ({ default: m.AdminPlaylistMonitoringPage })));
const UserPostsPage = lazy(() => import("../pages/user/UserPostsPage").then(m => ({ default: m.UserPostsPage })));
const AdminPostMonitoringPage = lazy(() => import("../pages/admin/AdminPostMonitoringPage").then(m => ({ default: m.AdminPostMonitoringPage })));
const AdminChannelPerformancePage = lazy(() => import("../pages/admin/AdminChannelPerformancePage").then(m => ({ default: m.AdminChannelPerformancePage })));
const UserChannelAnalyticsPage = lazy(() => import("../pages/user/UserChannelAnalyticsPage").then(m => ({ default: m.UserChannelAnalyticsPage })));
const UserYouTubeAnalyticsPage = lazy(() => import("../pages/user/UserYouTubeAnalyticsPage").then(m => ({ default: m.UserYouTubeAnalyticsPage })));

// Lazy-loaded Faz 13 pages
const UserAutomationPage = lazy(() => import("../pages/user/UserAutomationPage").then(m => ({ default: m.UserAutomationPage })));
const UserInboxPage = lazy(() => import("../pages/user/UserInboxPage").then(m => ({ default: m.UserInboxPage })));
const AdminAutomationPoliciesPage = lazy(() => import("../pages/admin/AdminAutomationPoliciesPage").then(m => ({ default: m.AdminAutomationPoliciesPage })));
const AdminInboxPage = lazy(() => import("../pages/admin/AdminInboxPage").then(m => ({ default: m.AdminInboxPage })));

// Lazy-loaded Faz 14 pages
const UserCalendarPage = lazy(() => import("../pages/user/UserCalendarPage").then(m => ({ default: m.UserCalendarPage })));
const AdminCalendarPage = lazy(() => import("../pages/admin/AdminCalendarPage").then(m => ({ default: m.AdminCalendarPage })));

// Lazy-loaded Faz 16 pages
const AdminNotificationsPage = lazy(() => import("../pages/admin/AdminNotificationsPage"));

// Lazy-loaded Faz 17 pages
const UserConnectionsPage = lazy(() => import("../pages/user/UserConnectionsPage").then(m => ({ default: m.UserConnectionsPage })));
const UserNewsPickerPage = lazy(() => import("../pages/user/UserNewsPickerPage").then(m => ({ default: m.UserNewsPickerPage })));
const AdminConnectionsPage = lazy(() => import("../pages/admin/AdminConnectionsPage").then(m => ({ default: m.AdminConnectionsPage })));

// Branding Center / Automation Center / Channel URL onboarding (Aurora-final)
const AuroraBrandingCenterPage = lazy(() =>
  import("../surfaces/aurora/AuroraBrandingCenterPage").then((m) => ({
    default: m.AuroraBrandingCenterPage,
  })),
);
const AuroraAutomationCenterPage = lazy(() =>
  import("../surfaces/aurora/AuroraAutomationCenterPage").then((m) => ({
    default: m.AuroraAutomationCenterPage,
  })),
);
const AuroraChannelOnboardingPage = lazy(() =>
  import("../surfaces/aurora/AuroraChannelOnboardingPage").then((m) => ({
    default: m.AuroraChannelOnboardingPage,
  })),
);

function LazyFallback() {
  return <div className="p-8 text-sm text-neutral-400">Yukleniyor...</div>;
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppEntryGate />,
    errorElement: <RootErrorBoundary />,
  },
  {
    path: "/login",
    element: <LoginPage />,
    errorElement: <RootErrorBoundary />,
  },
  {
    path: "/onboarding",
    element: <OnboardingPage />,
    errorElement: <RootErrorBoundary />,
  },
  {
    path: "/forgot-password",
    element: <ForgotPasswordPage />,
    errorElement: <RootErrorBoundary />,
  },
  {
    path: "/session-expired",
    element: <SessionExpiredPage />,
    errorElement: <RootErrorBoundary />,
  },
  {
    path: "/workspace-switch",
    element: <WorkspaceSwitchPage />,
    errorElement: <RootErrorBoundary />,
  },
  {
    path: "/error",
    element: <InternalErrorPage />,
    errorElement: <RootErrorBoundary />,
  },
  {
    path: "/admin",
    element: <AuthGuard requiredRole="admin" />,
    errorElement: <RootErrorBoundary />,
    children: [{
      element: <DynamicAdminLayout />,
      children: [
      { index: true, element: <AdminOverviewPage /> },
      { path: "settings", element: <VisibilityGuard targetKey="panel:settings"><SettingsRegistryPage /></VisibilityGuard> },
      { path: "settings/:group", element: <VisibilityGuard targetKey="panel:settings"><SettingsRegistryPage /></VisibilityGuard> },
      { path: "visibility", element: <VisibilityGuard targetKey="panel:visibility"><VisibilityRegistryPage /></VisibilityGuard> },
      { path: "wizard-settings", element: <Suspense fallback={<LazyFallback />}><WizardSettingsPage /></Suspense> },
      { path: "jobs", element: <JobsRegistryPage /> },
      { path: "jobs/:jobId", element: <Suspense fallback={<LazyFallback />}><JobDetailPage /></Suspense> },
      { path: "standard-videos", element: <StandardVideoRegistryPage /> },
      { path: "standard-videos/new", element: <StandardVideoCreatePage /> },
      { path: "standard-videos/wizard", element: <Suspense fallback={<LazyFallback />}><StandardVideoWizardPage /></Suspense> },
      { path: "standard-videos/:itemId", element: <Suspense fallback={<LazyFallback />}><StandardVideoDetailPage /></Suspense> },
      { path: "templates/new", element: <VisibilityGuard targetKey="panel:templates"><TemplateCreatePage /></VisibilityGuard> },
      { path: "templates", element: <VisibilityGuard targetKey="panel:templates"><TemplatesRegistryPage /></VisibilityGuard> },
      { path: "style-blueprints/new", element: <StyleBlueprintCreatePage /> },
      { path: "style-blueprints", element: <StyleBlueprintsRegistryPage /> },
      { path: "sources/new", element: <VisibilityGuard targetKey="panel:sources"><SourceCreatePage /></VisibilityGuard> },
      { path: "sources", element: <VisibilityGuard targetKey="panel:sources"><SourcesRegistryPage /></VisibilityGuard> },
      { path: "sources/:id", element: <VisibilityGuard targetKey="panel:sources"><SourceDetailPage /></VisibilityGuard> },
      { path: "source-scans/new", element: <SourceScanCreatePage /> },
      { path: "source-scans", element: <SourceScansRegistryPage /> },
      { path: "news-bulletins/new", element: <NewsBulletinCreatePage /> },
      { path: "news-bulletins/wizard", element: <Suspense fallback={<LazyFallback />}><NewsBulletinWizardPage /></Suspense> },
      { path: "news-bulletins/:itemId", element: <Suspense fallback={<LazyFallback />}><NewsBulletinDetailPage /></Suspense> },
      { path: "news-bulletins", element: <NewsBulletinRegistryPage /> },
      { path: "used-news/new", element: <UsedNewsCreatePage /> },
      { path: "used-news", element: <UsedNewsRegistryPage /> },
      { path: "news-items/new", element: <NewsItemCreatePage /> },
      { path: "news-items/:id", element: <VisibilityGuard targetKey="panel:news-items"><NewsItemDetailPage /></VisibilityGuard> },
      { path: "news-items", element: <NewsItemsRegistryPage /> },
      { path: "template-style-links/new", element: <TemplateStyleLinkCreatePage /> },
      { path: "template-style-links", element: <TemplateStyleLinksRegistryPage /> },
      { path: "library", element: <Suspense fallback={<LazyFallback />}><ContentLibraryPage /></Suspense> },
      { path: "assets", element: <Suspense fallback={<LazyFallback />}><AssetLibraryPage /></Suspense> },
      { path: "analytics", element: <VisibilityGuard targetKey="panel:analytics"><Suspense fallback={<LazyFallback />}><AnalyticsOverviewPage /></Suspense></VisibilityGuard> },
      { path: "analytics/content", element: <VisibilityGuard targetKey="panel:analytics"><Suspense fallback={<LazyFallback />}><AnalyticsContentPage /></Suspense></VisibilityGuard> },
      { path: "analytics/operations", element: <VisibilityGuard targetKey="panel:analytics"><Suspense fallback={<LazyFallback />}><AnalyticsOperationsPage /></Suspense></VisibilityGuard> },
      { path: "analytics/youtube", element: <VisibilityGuard targetKey="panel:analytics"><Suspense fallback={<LazyFallback />}><AdminYouTubeAnalyticsPage /></Suspense></VisibilityGuard> },
      { path: "analytics/publish", element: <VisibilityGuard targetKey="panel:analytics"><Suspense fallback={<LazyFallback />}><PublishAnalyticsPage /></Suspense></VisibilityGuard> },
      { path: "analytics/channel-performance", element: <VisibilityGuard targetKey="panel:analytics"><Suspense fallback={<LazyFallback />}><AdminChannelPerformancePage /></Suspense></VisibilityGuard> },
      { path: "comments", element: <Suspense fallback={<LazyFallback />}><AdminCommentMonitoringPage /></Suspense> },
      { path: "playlists", element: <Suspense fallback={<LazyFallback />}><AdminPlaylistMonitoringPage /></Suspense> },
      { path: "posts", element: <Suspense fallback={<LazyFallback />}><AdminPostMonitoringPage /></Suspense> },
      { path: "automation", element: <Suspense fallback={<LazyFallback />}><AdminAutomationPoliciesPage /></Suspense> },
      { path: "inbox", element: <Suspense fallback={<LazyFallback />}><AdminInboxPage /></Suspense> },
      { path: "calendar", element: <Suspense fallback={<LazyFallback />}><AdminCalendarPage /></Suspense> },
      { path: "notifications", element: <Suspense fallback={<LazyFallback />}><AdminNotificationsPage /></Suspense> },
      { path: "connections", element: <Suspense fallback={<LazyFallback />}><AdminConnectionsPage /></Suspense> },
      { path: "publish", element: <VisibilityGuard targetKey="panel:publish"><Suspense fallback={<LazyFallback />}><PublishCenterPage /></Suspense></VisibilityGuard> },
      { path: "publish/review", element: <VisibilityGuard targetKey="panel:publish"><Suspense fallback={<LazyFallback />}><PublishReviewQueuePage /></Suspense></VisibilityGuard> },
      { path: "publish/:recordId", element: <VisibilityGuard targetKey="panel:publish"><Suspense fallback={<LazyFallback />}><PublishDetailPage /></Suspense></VisibilityGuard> },
      { path: "audit-logs", element: <VisibilityGuard targetKey="panel:audit-logs"><Suspense fallback={<LazyFallback />}><AuditLogPage /></Suspense></VisibilityGuard> },
      { path: "themes", element: <Suspense fallback={<LazyFallback />}><ThemeRegistryPage /></Suspense> },
      { path: "modules", element: <VisibilityGuard targetKey="panel:settings"><ModuleManagementPage /></VisibilityGuard> },
      { path: "providers", element: <VisibilityGuard targetKey="panel:settings"><ProviderManagementPage /></VisibilityGuard> },
      { path: "prompts", element: <VisibilityGuard targetKey="panel:settings"><PromptEditorPage /></VisibilityGuard> },
      { path: "wizard", element: <WizardLauncherPage /> },
      { path: "users", element: <UsersRegistryPage /> },
      { path: "users/:userId/settings", element: <UserSettingsDetailPage /> },
      // Branding Center / Automation Center / Channel onboarding — admin sees these too
      { path: "channels/new", element: <Suspense fallback={<LazyFallback />}><AuroraChannelOnboardingPage /></Suspense> },
      { path: "channels/:channelId/branding-center", element: <Suspense fallback={<LazyFallback />}><AuroraBrandingCenterPage /></Suspense> },
      { path: "projects/:projectId/automation-center", element: <Suspense fallback={<LazyFallback />}><AuroraAutomationCenterPage /></Suspense> },
      // Faz 4.1 — shell-consistent 404: admin NotFound stays inside DynamicAdminLayout
      { path: "*", element: <NotFoundPage /> },
    ]}],
  },
  {
    path: "/user",
    element: <AuthGuard />,
    errorElement: <RootErrorBoundary />,
    children: [{
      element: <DynamicUserLayout />,
      children: [
      { index: true, element: <UserDashboardPage /> },
      { path: "content", element: <UserContentEntryPage /> },
      { path: "publish", element: <Suspense fallback={<LazyFallback />}><UserPublishPage /></Suspense> },
      { path: "settings", element: <UserSettingsPage /> },
      { path: "projects", element: <Suspense fallback={<LazyFallback />}><MyProjectsPage /></Suspense> },
      { path: "projects/:projectId", element: <Suspense fallback={<LazyFallback />}><ProjectDetailPage /></Suspense> },
      { path: "jobs/:jobId", element: <Suspense fallback={<LazyFallback />}><UserJobDetailPage /></Suspense> },
      { path: "publish/:recordId", element: <VisibilityGuard targetKey="panel:publish"><Suspense fallback={<LazyFallback />}><PublishDetailPage /></Suspense></VisibilityGuard> },
      { path: "channels", element: <Suspense fallback={<LazyFallback />}><MyChannelsPage /></Suspense> },
      { path: "channels/new", element: <Suspense fallback={<LazyFallback />}><AuroraChannelOnboardingPage /></Suspense> },
      { path: "channels/:channelId", element: <Suspense fallback={<LazyFallback />}><ChannelDetailPage /></Suspense> },
      { path: "channels/:channelId/branding-center", element: <Suspense fallback={<LazyFallback />}><AuroraBrandingCenterPage /></Suspense> },
      { path: "projects/:projectId/automation-center", element: <Suspense fallback={<LazyFallback />}><AuroraAutomationCenterPage /></Suspense> },
      { path: "analytics", element: <Suspense fallback={<LazyFallback />}><UserAnalyticsPage /></Suspense> },
      { path: "analytics/channels", element: <Suspense fallback={<LazyFallback />}><UserChannelAnalyticsPage /></Suspense> },
      { path: "analytics/youtube", element: <Suspense fallback={<LazyFallback />}><UserYouTubeAnalyticsPage /></Suspense> },
      { path: "comments", element: <Suspense fallback={<LazyFallback />}><UserCommentsPage /></Suspense> },
      { path: "playlists", element: <Suspense fallback={<LazyFallback />}><UserPlaylistsPage /></Suspense> },
      { path: "posts", element: <Suspense fallback={<LazyFallback />}><UserPostsPage /></Suspense> },
      { path: "automation", element: <Suspense fallback={<LazyFallback />}><UserAutomationPage /></Suspense> },
      { path: "inbox", element: <Suspense fallback={<LazyFallback />}><UserInboxPage /></Suspense> },
      { path: "calendar", element: <Suspense fallback={<LazyFallback />}><UserCalendarPage /></Suspense> },
      { path: "connections", element: <Suspense fallback={<LazyFallback />}><UserConnectionsPage /></Suspense> },
      { path: "create/video", element: <Suspense fallback={<LazyFallback />}><CreateVideoWizardPage /></Suspense> },
      { path: "create/bulletin", element: <Suspense fallback={<LazyFallback />}><CreateBulletinWizardPage /></Suspense> },
      { path: "create/product-review", element: <Suspense fallback={<LazyFallback />}><CreateProductReviewWizardPage /></Suspense> },
      { path: "news-picker", element: <Suspense fallback={<LazyFallback />}><UserNewsPickerPage /></Suspense> },
      { path: "settings/youtube-callback", element: <UserYouTubeCallbackPage /> },
      // Faz 4.1 — shell-consistent 404: user NotFound stays inside DynamicUserLayout
      { path: "*", element: <NotFoundPage /> },
    ]}],
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);
