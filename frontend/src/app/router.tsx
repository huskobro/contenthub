import { createBrowserRouter } from "react-router-dom";
import { AdminLayout } from "./layouts/AdminLayout";
import { UserLayout } from "./layouts/UserLayout";
import { AppEntryGate } from "./AppEntryGate";
import { OnboardingPage } from "../pages/OnboardingPage";
import { AdminOverviewPage } from "../pages/AdminOverviewPage";
import { UserDashboardPage } from "../pages/UserDashboardPage";
import { UserContentEntryPage } from "../pages/UserContentEntryPage";
import { UserPublishEntryPage } from "../pages/UserPublishEntryPage";
import { SettingsRegistryPage } from "../pages/admin/SettingsRegistryPage";
import { VisibilityRegistryPage } from "../pages/admin/VisibilityRegistryPage";
import { JobsRegistryPage } from "../pages/admin/JobsRegistryPage";
import { JobDetailPage } from "../pages/admin/JobDetailPage";
import { StandardVideoRegistryPage } from "../pages/admin/StandardVideoRegistryPage";
import { StandardVideoDetailPage } from "../pages/admin/StandardVideoDetailPage";
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
import { ContentLibraryPage } from "../pages/admin/ContentLibraryPage";
import { AssetLibraryPage } from "../pages/admin/AssetLibraryPage";
import { AnalyticsOverviewPage } from "../pages/admin/AnalyticsOverviewPage";
import { AnalyticsContentPage } from "../pages/admin/AnalyticsContentPage";
import { AnalyticsOperationsPage } from "../pages/admin/AnalyticsOperationsPage";
import { YouTubeAnalyticsPage } from "../pages/admin/YouTubeAnalyticsPage";
import { YouTubeCallbackPage } from "../pages/admin/YouTubeCallbackPage";
import { AuditLogPage } from "../pages/admin/AuditLogPage";
import { VisibilityGuard } from "../components/visibility/VisibilityGuard";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppEntryGate />,
  },
  {
    path: "/onboarding",
    element: <OnboardingPage />,
  },
  {
    path: "/admin",
    element: <AdminLayout />,
    children: [
      { index: true, element: <AdminOverviewPage /> },
      { path: "settings", element: <VisibilityGuard targetKey="panel:settings"><SettingsRegistryPage /></VisibilityGuard> },
      { path: "visibility", element: <VisibilityGuard targetKey="panel:visibility"><VisibilityRegistryPage /></VisibilityGuard> },
      { path: "jobs", element: <JobsRegistryPage /> },
      { path: "jobs/:jobId", element: <JobDetailPage /> },
      { path: "standard-videos", element: <StandardVideoRegistryPage /> },
      { path: "standard-videos/new", element: <StandardVideoCreatePage /> },
      { path: "standard-videos/:itemId", element: <StandardVideoDetailPage /> },
      { path: "templates/new", element: <VisibilityGuard targetKey="panel:templates"><TemplateCreatePage /></VisibilityGuard> },
      { path: "templates", element: <VisibilityGuard targetKey="panel:templates"><TemplatesRegistryPage /></VisibilityGuard> },
      { path: "style-blueprints/new", element: <StyleBlueprintCreatePage /> },
      { path: "style-blueprints", element: <StyleBlueprintsRegistryPage /> },
      { path: "sources/new", element: <VisibilityGuard targetKey="panel:sources"><SourceCreatePage /></VisibilityGuard> },
      { path: "sources", element: <VisibilityGuard targetKey="panel:sources"><SourcesRegistryPage /></VisibilityGuard> },
      { path: "source-scans/new", element: <SourceScanCreatePage /> },
      { path: "source-scans", element: <SourceScansRegistryPage /> },
      { path: "news-bulletins/new", element: <NewsBulletinCreatePage /> },
      { path: "news-bulletins", element: <NewsBulletinRegistryPage /> },
      { path: "used-news/new", element: <UsedNewsCreatePage /> },
      { path: "used-news", element: <UsedNewsRegistryPage /> },
      { path: "news-items/new", element: <NewsItemCreatePage /> },
      { path: "news-items", element: <NewsItemsRegistryPage /> },
      { path: "template-style-links/new", element: <TemplateStyleLinkCreatePage /> },
      { path: "template-style-links", element: <TemplateStyleLinksRegistryPage /> },
      { path: "library", element: <ContentLibraryPage /> },
      { path: "assets", element: <AssetLibraryPage /> },
      { path: "analytics", element: <VisibilityGuard targetKey="panel:analytics"><AnalyticsOverviewPage /></VisibilityGuard> },
      { path: "analytics/content", element: <VisibilityGuard targetKey="panel:analytics"><AnalyticsContentPage /></VisibilityGuard> },
      { path: "analytics/operations", element: <VisibilityGuard targetKey="panel:analytics"><AnalyticsOperationsPage /></VisibilityGuard> },
      { path: "analytics/youtube", element: <VisibilityGuard targetKey="panel:analytics"><YouTubeAnalyticsPage /></VisibilityGuard> },
      { path: "audit-logs", element: <VisibilityGuard targetKey="panel:audit-logs"><AuditLogPage /></VisibilityGuard> },
      { path: "settings/youtube-callback", element: <YouTubeCallbackPage /> },
    ],
  },
  {
    path: "/user",
    element: <UserLayout />,
    children: [
      { index: true, element: <UserDashboardPage /> },
      { path: "content", element: <UserContentEntryPage /> },
      { path: "publish", element: <UserPublishEntryPage /> },
    ],
  },
]);
