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
      { path: "settings", element: <SettingsRegistryPage /> },
      { path: "visibility", element: <VisibilityRegistryPage /> },
      { path: "jobs", element: <JobsRegistryPage /> },
      { path: "jobs/:jobId", element: <JobDetailPage /> },
      { path: "standard-videos", element: <StandardVideoRegistryPage /> },
      { path: "standard-videos/new", element: <StandardVideoCreatePage /> },
      { path: "standard-videos/:itemId", element: <StandardVideoDetailPage /> },
      { path: "templates/new", element: <TemplateCreatePage /> },
      { path: "templates", element: <TemplatesRegistryPage /> },
      { path: "style-blueprints/new", element: <StyleBlueprintCreatePage /> },
      { path: "style-blueprints", element: <StyleBlueprintsRegistryPage /> },
      { path: "sources/new", element: <SourceCreatePage /> },
      { path: "sources", element: <SourcesRegistryPage /> },
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
      { path: "analytics", element: <AnalyticsOverviewPage /> },
      { path: "analytics/content", element: <AnalyticsContentPage /> },
      { path: "analytics/operations", element: <AnalyticsOperationsPage /> },
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
