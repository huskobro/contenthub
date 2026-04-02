/**
 * Phase 52: News Bulletin Artifact Summary Frontend smoke tests.
 *
 * Covers:
 *   A) Script present → correct badge text
 *   B) Script absent → correct badge text
 *   C) Metadata present → correct badge text
 *   D) Metadata absent → correct badge text
 *   E) Both present → both badges visible
 *   F) Both absent → both show Eksik
 *   G) ArtifactSummary renders with undefined (safe fallback)
 *   H) Registry table renders artifact summary column
 *   I) Registry table renders "Var" for bulletin with has_script=true
 *   J) Registry table renders "Eksik" for bulletin with has_script=false
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { NewsBulletinArtifactStatusBadge } from "../components/news-bulletin/NewsBulletinArtifactStatusBadge";
import { NewsBulletinArtifactSummary } from "../components/news-bulletin/NewsBulletinArtifactSummary";
import { NewsBulletinsTable } from "../components/news-bulletin/NewsBulletinsTable";

// ── Badge unit tests ──────────────────────────────────────────────────────────
describe("NewsBulletinArtifactStatusBadge", () => {
  it("A) script present shows Var", () => {
    render(<NewsBulletinArtifactStatusBadge present={true} label="Script" />);
    expect(screen.getByText("Script: Var")).toBeTruthy();
  });

  it("B) script absent shows Eksik", () => {
    render(<NewsBulletinArtifactStatusBadge present={false} label="Script" />);
    expect(screen.getByText("Script: Eksik")).toBeTruthy();
  });

  it("C) metadata present shows Var", () => {
    render(<NewsBulletinArtifactStatusBadge present={true} label="Metadata" />);
    expect(screen.getByText("Metadata: Var")).toBeTruthy();
  });

  it("D) metadata absent shows Eksik", () => {
    render(<NewsBulletinArtifactStatusBadge present={false} label="Metadata" />);
    expect(screen.getByText("Metadata: Eksik")).toBeTruthy();
  });
});

// ── Summary unit tests ────────────────────────────────────────────────────────
describe("NewsBulletinArtifactSummary", () => {
  it("E) both present shows Var for both", () => {
    render(<NewsBulletinArtifactSummary hasScript={true} hasMetadata={true} />);
    expect(screen.getByText("Script: Var")).toBeTruthy();
    expect(screen.getByText("Metadata: Var")).toBeTruthy();
  });

  it("F) both absent shows Eksik for both", () => {
    render(<NewsBulletinArtifactSummary hasScript={false} hasMetadata={false} />);
    expect(screen.getByText("Script: Eksik")).toBeTruthy();
    expect(screen.getByText("Metadata: Eksik")).toBeTruthy();
  });

  it("G) undefined fields fall back to Eksik", () => {
    render(<NewsBulletinArtifactSummary />);
    expect(screen.getAllByText(/Eksik/)).toHaveLength(2);
  });
});

// ── Table integration ─────────────────────────────────────────────────────────
describe("NewsBulletinsTable artifact column", () => {
  const mockBulletins = [
    {
      id: "bul-1",
      title: "Test Bulletin",
      topic: "Spor",
      brief: null,
      target_duration_seconds: null,
      language: "tr",
      tone: null,
      bulletin_style: null,
      source_mode: null,
      selected_news_ids_json: null,
      status: "draft",
      job_id: null,
      created_at: "2026-04-02T10:00:00Z",
      updated_at: "2026-04-02T10:00:00Z",
      has_script: true,
      has_metadata: false,
    },
  ];

  it("H) renders Artifacts column header", () => {
    render(<NewsBulletinsTable bulletins={mockBulletins} selectedId={null} onSelect={() => {}} />);
    expect(screen.getByText("Artifacts")).toBeTruthy();
  });

  it("I) renders Var for has_script=true", () => {
    render(<NewsBulletinsTable bulletins={mockBulletins} selectedId={null} onSelect={() => {}} />);
    expect(screen.getByText("Script: Var")).toBeTruthy();
  });

  it("J) renders Eksik for has_metadata=false", () => {
    render(<NewsBulletinsTable bulletins={mockBulletins} selectedId={null} onSelect={() => {}} />);
    expect(screen.getByText("Metadata: Eksik")).toBeTruthy();
  });
});
