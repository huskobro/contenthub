import { createBrowserRouter, Navigate } from "react-router-dom";
import { AdminLayout } from "./layouts/AdminLayout";
import { UserLayout } from "./layouts/UserLayout";
import { AdminOverviewPage } from "../pages/AdminOverviewPage";
import { UserDashboardPage } from "../pages/UserDashboardPage";
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
import { SourcesRegistryPage } from "../pages/admin/SourcesRegistryPage";
import { SourceCreatePage } from "../pages/admin/SourceCreatePage";
import { SourceScansRegistryPage } from "../pages/admin/SourceScansRegistryPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/user" replace />,
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
      { path: "style-blueprints", element: <StyleBlueprintsRegistryPage /> },
      { path: "sources/new", element: <SourceCreatePage /> },
      { path: "sources", element: <SourcesRegistryPage /> },
      { path: "source-scans", element: <SourceScansRegistryPage /> },
    ],
  },
  {
    path: "/user",
    element: <UserLayout />,
    children: [
      { index: true, element: <UserDashboardPage /> },
    ],
  },
]);
