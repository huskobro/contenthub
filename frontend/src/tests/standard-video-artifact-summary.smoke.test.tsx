/**
 * Phase 68: Standard Video Artifact Summary Frontend smoke tests.
 *
 * Covers:
 *   A) StandardVideoArtifactStatusBadge renders Var
 *   B) StandardVideoArtifactStatusBadge renders Eksik
 *   C) StandardVideoArtifactStatusBadge renders Bilinmiyor
 *   D) StandardVideoArtifactSummary shows Var for script when has_script=true
 *   E) StandardVideoArtifactSummary shows Eksik for script when has_script=false
 *   F) StandardVideoArtifactSummary shows Var for metadata when has_metadata=true
 *   G) StandardVideoArtifactSummary shows Eksik for metadata when has_metadata=false
 *   H) StandardVideoArtifactSummary shows Bilinmiyor when fields are undefined
 *   I) StandardVideosTable renders Artifact column header
 *   J) StandardVideosTable renders artifact summary for a record
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StandardVideoArtifactStatusBadge } from "../components/standard-video/StandardVideoArtifactStatusBadge";
import { StandardVideoArtifactSummary } from "../components/standard-video/StandardVideoArtifactSummary";
import { StandardVideosTable } from "../components/standard-video/StandardVideosTable";

// ── StandardVideoArtifactStatusBadge ─────────────────────────────────────────
describe("StandardVideoArtifactStatusBadge", () => {
  it("A) renders Var", () => {
    render(<StandardVideoArtifactStatusBadge status="Var" />);
    expect(screen.getByText("Var")).toBeTruthy();
  });

  it("B) renders Eksik", () => {
    render(<StandardVideoArtifactStatusBadge status="Eksik" />);
    expect(screen.getByText("Eksik")).toBeTruthy();
  });

  it("C) renders Bilinmiyor", () => {
    render(<StandardVideoArtifactStatusBadge status="Bilinmiyor" />);
    expect(screen.getByText("Bilinmiyor")).toBeTruthy();
  });
});

// ── StandardVideoArtifactSummary ──────────────────────────────────────────────
describe("StandardVideoArtifactSummary", () => {
  it("D) shows Var for script when has_script=true", () => {
    const { getAllByText } = render(
      <StandardVideoArtifactSummary hasScript={true} hasMetadata={false} />
    );
    const varItems = getAllByText("Var");
    expect(varItems.length).toBeGreaterThan(0);
  });

  it("E) shows Eksik for script when has_script=false", () => {
    const { getAllByText } = render(
      <StandardVideoArtifactSummary hasScript={false} hasMetadata={true} />
    );
    const eksikItems = getAllByText("Eksik");
    expect(eksikItems.length).toBeGreaterThan(0);
  });

  it("F) shows Var for metadata when has_metadata=true", () => {
    const { getAllByText } = render(
      <StandardVideoArtifactSummary hasScript={false} hasMetadata={true} />
    );
    const varItems = getAllByText("Var");
    expect(varItems.length).toBeGreaterThan(0);
  });

  it("G) shows Eksik for metadata when has_metadata=false", () => {
    const { getAllByText } = render(
      <StandardVideoArtifactSummary hasScript={true} hasMetadata={false} />
    );
    const eksikItems = getAllByText("Eksik");
    expect(eksikItems.length).toBeGreaterThan(0);
  });

  it("H) shows Bilinmiyor when fields are undefined", () => {
    const { getAllByText } = render(
      <StandardVideoArtifactSummary />
    );
    const bilinmiyor = getAllByText("Bilinmiyor");
    expect(bilinmiyor.length).toBe(2);
  });
});

// ── StandardVideosTable ───────────────────────────────────────────────────────
const mockVideo = (overrides: object = {}) => ({
  id: "sv-1",
  title: "Test Video",
  topic: "Test konu",
  brief: null,
  target_duration_seconds: 120,
  tone: null,
  language: "tr",
  visual_direction: null,
  subtitle_style: null,
  status: "draft",
  job_id: null,
  created_at: "2026-04-02T10:00:00Z",
  updated_at: "2026-04-02T10:00:00Z",
  has_script: true,
  has_metadata: false,
  ...overrides,
});

describe("StandardVideosTable artifact summary", () => {
  it("I) renders Artifact column header", () => {
    render(<StandardVideosTable videos={[mockVideo()]} selectedId={null} onSelect={() => {}} />);
    expect(screen.getByText("Artifact")).toBeTruthy();
  });

  it("J) renders artifact summary for a record", () => {
    render(<StandardVideosTable videos={[mockVideo()]} selectedId={null} onSelect={() => {}} />);
    expect(screen.getByText("Script:")).toBeTruthy();
  });
});
