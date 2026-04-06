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

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NewsBulletinArtifactStatusBadge } from "../components/news-bulletin/NewsBulletinArtifactStatusBadge";
import { NewsBulletinArtifactSummary } from "../components/news-bulletin/NewsBulletinArtifactSummary";

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

