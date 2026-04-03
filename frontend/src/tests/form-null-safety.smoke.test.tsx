import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TemplateForm } from "../components/templates/TemplateForm";
import { StyleBlueprintForm } from "../components/style-blueprints/StyleBlueprintForm";
import { NewsItemForm } from "../components/news-items/NewsItemForm";
import { SourceForm } from "../components/sources/SourceForm";

beforeEach(() => {
  vi.restoreAllMocks();
});

const noop = () => {};

describe("Form null safety smoke tests", () => {
  it("TemplateForm renders without crash when initial has null version", () => {
    const initial = {
      id: "t1",
      name: "Test",
      template_type: "style",
      owner_scope: "admin",
      module_scope: null,
      description: null,
      status: "draft",
      version: null as unknown as number,
      style_profile_json: null,
      content_rules_json: null,
      publish_profile_json: null,
      style_link_count: 0,
      created_at: null,
      updated_at: null,
    };

    render(
      <TemplateForm
        mode="edit"
        initial={initial as any}
        isSubmitting={false}
        submitError={null}
        onSubmit={noop}
        onCancel={noop}
      />
    );

    // Should not display "null" as version value
    const html = document.body.innerHTML;
    expect(html).not.toContain('"null"');
    expect(html).not.toContain("undefined");
  });

  it("StyleBlueprintForm renders without crash when initial has null version and null JSON fields", () => {
    const initial = {
      id: "b1",
      name: "Blueprint",
      module_scope: null,
      status: "draft",
      version: null as unknown as number,
      visual_rules_json: null,
      motion_rules_json: null,
      layout_rules_json: null,
      subtitle_rules_json: null,
      thumbnail_rules_json: null,
      preview_strategy_json: null,
      notes: null,
      created_at: null,
      updated_at: null,
    };

    render(
      <StyleBlueprintForm
        mode="edit"
        initial={initial as any}
        isSubmitting={false}
        submitError={null}
        onSubmit={noop}
        onCancel={noop}
      />
    );

    const html = document.body.innerHTML;
    expect(html).not.toContain('"null"');
    expect(html).not.toContain("undefined");
  });

  it("NewsItemForm renders without crash when initial has null published_at", () => {
    const initial = {
      id: "n1",
      title: "Test News",
      url: "https://example.com",
      status: "new",
      source_id: null,
      source_scan_id: null,
      summary: null,
      language: null,
      category: null,
      published_at: null,
      dedupe_key: null,
      created_at: null,
      updated_at: null,
    };

    render(
      <NewsItemForm
        mode="edit"
        initial={initial as any}
        isSubmitting={false}
        submitError={null}
        onSubmit={noop}
        onCancel={noop}
      />
    );

    expect(screen.getByDisplayValue("Test News")).toBeDefined();
    const html = document.body.innerHTML;
    expect(html).not.toContain("undefined");
    expect(html).not.toContain("Invalid Date");
  });

  it("SourceForm renders without crash when initial has all null optional fields", () => {
    const initial = {
      id: "s1",
      name: "Test Source",
      source_type: "rss",
      status: "active",
      base_url: null,
      feed_url: null,
      api_endpoint: null,
      trust_level: null,
      scan_mode: null,
      language: null,
      category: null,
      notes: null,
    };

    render(
      <SourceForm
        initial={initial as any}
        onSubmit={noop}
        onCancel={noop}
        isPending={false}
        submitError={null}
      />
    );

    const html = document.body.innerHTML;
    expect(html).not.toContain("undefined");
    expect(html).not.toContain("null");
  });
});
