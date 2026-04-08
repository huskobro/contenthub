import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import { DynamicAdminLayout } from "./layouts/DynamicAdminLayout";
import { DynamicUserLayout } from "./layouts/DynamicUserLayout";
import { AppEntryGate } from "./AppEntryGate";
import { OnboardingPage } from "../pages/OnboardingPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { RootErrorBoundary } from "../components/RootErrorBoundary";
import { AdminOverviewPage } from "../pages/AdminOverviewPage";
import { UserDashboardPage } from "../pages/UserDashboardPage";
import { UserContentEntryPage } from "../pages/UserContentEntryPage";
import { UserPublishEntryPage } from "../pages/UserPublishEntryPage";
import { LoginPage } from "../pages/LoginPage";
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
import { SourceCreatePage } from "../pages/admin/SourceCreatePage";
import { SourceScansRegistryPage } from "../pages/admin/SourceScansRegistryPage";
import { SourceScanCreatePage } from "../pages/admin/SourceScanCreatePage";
import { NewsBulletinRegistryPage } from "../pages/admin/NewsBulletinRegistryPage";
import { NewsBulletinCreatePage } from "../pages/admin/NewsBulletinCreatePage";
import { UsedNewsRegistryPage } from "../pages/admin/UsedNewsRegistryPage";
import { UsedNewsCreatePage } from "../pages/admin/UsedNewsCreatePage";
import { NewsItemsRegistryPage } from "../pages/admin/NewsItemsRegistryPage";
import { NewsItemCreatePage } from "../pages/admin/NewsItemCreatePage";
import { TemplateStyleLinksRegistryPage } from "../pages/admin/TemplateStyleLinksRegistryPage";
import { TemplateStyleLinkCreatePage } from "../pages/admin/TemplateStyleLinkCreatePage";
import { YouTubeCallbackPage } from "../pages/admin/YouTubeCallbackPage";
import { VisibilityGuard } from "../components/visibility/VisibilityGuard";
import { ModuleManagementPage } from "../pages/admin/ModuleManagementPage";
import { ProviderManagementPage } from "../pages/admin/ProviderManagementPage";
import { PromptEditorPage } from "../pages/admin/PromptEditorPage";
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
const PublishDetailPage = lazy(() => import("../pages/admin/PublishDetailPage").then(m => ({ default: m.PublishDetailPage })));
const AnalyticsOverviewPage = lazy(() => import("../pages/admin/AnalyticsOverviewPage").then(m => ({ default: m.AnalyticsOverviewPage })));
const AnalyticsContentPage = lazy(() => import("../pages/admin/AnalyticsContentPage").then(m => ({ default: m.AnalyticsContentPage })));
const AnalyticsOperationsPage = lazy(() => import("../pages/admin/AnalyticsOperationsPage").then(m => ({ default: m.AnalyticsOperationsPage })));
const YouTubeAnalyticsPage = lazy(() => import("../pages/admin/YouTubeAnalyticsPage").then(m => ({ default: m.YouTubeAnalyticsPage })));
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
    path: "/admin",
    element: <DynamicAdminLayout />,
    errorElement: <RootErrorBoundary />,
    children: [
      { index: true, element: <AdminOverviewPage /> },
      { path: "settings", element: <VisibilityGuard targetKey="panel:settings"><SettingsRegistryPage /></VisibilityGuard> },
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
      { path: "source-scans/new", element: <SourceScanCreatePage /> },
      { path: "source-scans", element: <SourceScansRegistryPage /> },
      { path: "news-bulletins/new", element: <NewsBulletinCreatePage /> },
      { path: "news-bulletins/wizard", element: <Suspense fallback={<LazyFallback />}><NewsBulletinWizardPage /></Suspense> },
      { path: "news-bulletins/:itemId", element: <Suspense fallback={<LazyFallback />}><NewsBulletinDetailPage /></Suspense> },
      { path: "news-bulletins", element: <NewsBulletinRegistryPage /> },
      { path: "used-news/new", element: <UsedNewsCreatePage /> },
      { path: "used-news", element: <UsedNewsRegistryPage /> },
      { path: "news-items/new", element: <NewsItemCreatePage /> },
      { path: "news-items", element: <NewsItemsRegistryPage /> },
      { path: "template-style-links/new", element: <TemplateStyleLinkCreatePage /> },
      { path: "template-style-links", element: <TemplateStyleLinksRegistryPage /> },
      { path: "library", element: <Suspense fallback={<LazyFallback />}><ContentLibraryPage /></Suspense> },
      { path: "assets", element: <Suspense fallback={<LazyFallback />}><AssetLibraryPage /></Suspense> },
      { path: "analytics", element: <VisibilityGuard targetKey="panel:analytics"><Suspense fallback={<LazyFallback />}><AnalyticsOverviewPage /></Suspense></VisibilityGuard> },
      { path: "analytics/content", element: <VisibilityGuard targetKey="panel:analytics"><Suspense fallback={<LazyFallback />}><AnalyticsContentPage /></Suspense></VisibilityGuard> },
      { path: "analytics/operations", element: <VisibilityGuard targetKey="panel:analytics"><Suspense fallback={<LazyFallback />}><AnalyticsOperationsPage /></Suspense></VisibilityGuard> },
      { path: "analytics/youtube", element: <VisibilityGuard targetKey="panel:analytics"><Suspense fallback={<LazyFallback />}><YouTubeAnalyticsPage /></Suspense></VisibilityGuard> },
      { path: "publish", element: <VisibilityGuard targetKey="panel:publish"><Suspense fallback={<LazyFallback />}><PublishCenterPage /></Suspense></VisibilityGuard> },
      { path: "publish/:recordId", element: <VisibilityGuard targetKey="panel:publish"><Suspense fallback={<LazyFallback />}><PublishDetailPage /></Suspense></VisibilityGuard> },
      { path: "audit-logs", element: <VisibilityGuard targetKey="panel:audit-logs"><Suspense fallback={<LazyFallback />}><AuditLogPage /></Suspense></VisibilityGuard> },
      { path: "themes", element: <Suspense fallback={<LazyFallback />}><ThemeRegistryPage /></Suspense> },
      { path: "modules", element: <VisibilityGuard targetKey="panel:settings"><ModuleManagementPage /></VisibilityGuard> },
      { path: "providers", element: <VisibilityGuard targetKey="panel:settings"><ProviderManagementPage /></VisibilityGuard> },
      { path: "prompts", element: <VisibilityGuard targetKey="panel:settings"><PromptEditorPage /></VisibilityGuard> },
      { path: "users", element: <UsersRegistryPage /> },
      { path: "users/:userId/settings", element: <UserSettingsDetailPage /> },
      { path: "settings/youtube-callback", element: <YouTubeCallbackPage /> },
    ],
  },
  {
    path: "/user",
    element: <DynamicUserLayout />,
    errorElement: <RootErrorBoundary />,
    children: [
      { index: true, element: <UserDashboardPage /> },
      { path: "content", element: <UserContentEntryPage /> },
      { path: "publish", element: <UserPublishEntryPage /> },
      { path: "settings", element: <UserSettingsPage /> },
      { path: "projects", element: <Suspense fallback={<LazyFallback />}><MyProjectsPage /></Suspense> },
      { path: "projects/:projectId", element: <Suspense fallback={<LazyFallback />}><div className="p-8 text-neutral-500">Proje detayi yakinda eklenecek.</div></Suspense> },
      { path: "channels", element: <Suspense fallback={<LazyFallback />}><MyChannelsPage /></Suspense> },
      { path: "channels/:channelId", element: <Suspense fallback={<LazyFallback />}><div className="p-8 text-neutral-500">Kanal detayi yakinda eklenecek.</div></Suspense> },
    ],
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);
