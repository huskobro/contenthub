import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SourceDetailPanel } from "../components/sources/SourceDetailPanel";
import { TemplateDetailPanel } from "../components/templates/TemplateDetailPanel";

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("Detail panel null safety smoke tests", () => {
  it("SourceDetailPanel renders without crash when dates are null", async () => {
    window.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          id: "src1",
          name: "Test Source",
          source_type: "rss",
          status: "active",
          base_url: null,
          feed_url: null,
          api_endpoint: null,
          language: null,
          trust_level: null,
          scan_count: 0,
          last_scan_status: null,
          last_scan_finished_at: null,
          news_count_from_source: 0,
          used_news_count_from_source: 0,
          created_at: null,
          updated_at: null,
        }),
    });

    wrap(<SourceDetailPanel sourceId={"src1"} />);

    await waitFor(() => {
      expect(screen.getByText("Test Source")).toBeDefined();
    });

    // Should not render "Invalid Date"
    const html = document.body.innerHTML;
    expect(html).not.toContain("Invalid Date");
    expect(html).not.toContain("undefined");
  });

  it("TemplateDetailPanel renders without crash when all optional fields are null", async () => {
    window.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          id: "t1",
          name: "Test Template",
          module_type: "standard_video",
          template_type: "content",
          ownership: "system",
          status: "active",
          version: "1.0",
          content_json: null,
          publish_profile_json: null,
          style_link_count: 0,
          created_at: null,
          updated_at: null,
        }),
    });

    wrap(<TemplateDetailPanel templateId="t1" />);

    await waitFor(() => {
      expect(screen.getByText("Test Template")).toBeDefined();
    });

    const html = document.body.innerHTML;
    expect(html).not.toContain("Invalid Date");
    expect(html).not.toContain("undefined");
  });
});
