import { createBrowserRouter, Navigate } from "react-router-dom";
import { AdminLayout } from "./layouts/AdminLayout";
import { UserLayout } from "./layouts/UserLayout";
import { AdminOverviewPage } from "../pages/AdminOverviewPage";
import { UserDashboardPage } from "../pages/UserDashboardPage";
import { SettingsRegistryPage } from "../pages/admin/SettingsRegistryPage";
import { VisibilityRegistryPage } from "../pages/admin/VisibilityRegistryPage";
import { JobsRegistryPage } from "../pages/admin/JobsRegistryPage";
import { JobDetailPage } from "../pages/admin/JobDetailPage";

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
