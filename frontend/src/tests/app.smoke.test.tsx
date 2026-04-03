import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminLayout } from "../app/layouts/AdminLayout";
import { UserLayout } from "../app/layouts/UserLayout";
import { AdminOverviewPage } from "../pages/AdminOverviewPage";
import { UserDashboardPage } from "../pages/UserDashboardPage";

function mockFetch(data: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data),
  }) as unknown as typeof window.fetch;
}

function renderAt(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const testRouter = createMemoryRouter(
    [
      {
        path: "/admin",
        element: <AdminLayout />,
        children: [{ index: true, element: <AdminOverviewPage /> }],
      },
      {
        path: "/user",
        element: <UserLayout />,
        children: [{ index: true, element: <UserDashboardPage /> }],
      },
    ],
    { initialEntries: [path] }
  );
  return render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={testRouter} />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  // Default: onboarding not yet completed (generic welcome)
  window.fetch = mockFetch({ onboarding_required: true, completed_at: null });
});

describe("Panel shell smoke tests", () => {
  it("renders user dashboard at /user", () => {
    renderAt("/user");
    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeDefined();
    expect(screen.getByText("ContentHub")).toBeDefined();
  });

  it("renders admin overview at /admin", () => {
    renderAt("/admin");
    expect(screen.getByRole("heading", { name: "Admin Overview" })).toBeDefined();
    expect(screen.getByText("ContentHub")).toBeDefined();
  });

  it("user shell shows header with User label", () => {
    renderAt("/user");
    expect(screen.getByText("User")).toBeDefined();
  });

  it("admin shell shows header with Admin label", () => {
    renderAt("/admin");
    expect(screen.getByText("Admin")).toBeDefined();
  });
});
