/**
 * YouTubeCallbackBody smoke tests — Redesign REV-2 / P3.1.
 *
 * İki page (YouTubeCallbackPage / UserYouTubeCallbackPage) tek `YouTubeCallbackBody`
 * motoruna indirildi. Bu testler mode-specific sözleşmeyi doğrular:
 *   - admin: state yoksayılır, error fallback label "Ayarlara Don", testid
 *     `youtube-callback-admin`
 *   - user: state `{profile}:{nonce}` parse edilir, error fallback label
 *     "Kanallara Don", testid `youtube-callback-user`
 *   - processing initial state (⏳ emoji + "isleniyor")
 *   - ?error=access_denied → error kart + "Google yetkilendirme hatasi:
 *     access_denied"
 *   - code/error yoksa error fallback metni mode'a göre ayrışır
 */
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { YouTubeCallbackBody } from "../components/oauth/YouTubeCallbackBody";

// Prevent real network calls; tests focus on UI branching before/around the fetch.
vi.mock("../api/client", async () => {
  return {
    api: {
      post: vi.fn(() => new Promise(() => {})), // never resolves → stays in processing for code paths
    },
    ApiError: class ApiError extends Error {
      detail?: string;
      constructor(msg: string) { super(msg); }
    },
  };
});

function renderAt(path: string, mode: "admin" | "user") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="*" element={<YouTubeCallbackBody mode={mode} />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("YouTubeCallbackBody — P3.1 ortak motor", () => {
  it("admin: renders processing state initially", () => {
    renderAt("/admin/settings/youtube-callback?code=xyz", "admin");
    expect(screen.getByTestId("youtube-callback-admin")).toBeDefined();
    // Processing icon + heading
    expect(screen.getByText("YouTube Yetkilendirmesi")).toBeDefined();
    expect(screen.getByTestId("youtube-callback-icon").textContent).toBe("⏳");
  });

  it("user: renders processing state initially", () => {
    renderAt("/user/settings/youtube-callback?code=xyz&state=profile-123:nonce", "user");
    expect(screen.getByTestId("youtube-callback-user")).toBeDefined();
    expect(screen.getByText("YouTube Yetkilendirmesi")).toBeDefined();
  });

  it("admin: shows Google auth error with error param", () => {
    renderAt("/admin/settings/youtube-callback?error=access_denied", "admin");
    expect(screen.getByText(/Google yetkilendirme hatasi: access_denied/)).toBeDefined();
    expect(screen.getByText("Baglanti Hatasi")).toBeDefined();
    // Error back button mode-specific
    expect(screen.getByText("Ayarlara Don")).toBeDefined();
  });

  it("user: shows Google auth error with error param and 'Kanallara Don' label", () => {
    renderAt("/user/settings/youtube-callback?error=access_denied", "user");
    expect(screen.getByText(/Google yetkilendirme hatasi: access_denied/)).toBeDefined();
    expect(screen.getByText("Kanallara Don")).toBeDefined();
  });

  it("admin: shows long 'Authorization code bulunamadi' fallback when both code+error missing", () => {
    renderAt("/admin/settings/youtube-callback", "admin");
    expect(
      screen.getByText(/Authorization code bulunamadi.*gecerli bir yonlendirme/),
    ).toBeDefined();
  });

  it("user: shows short 'Authorization code bulunamadi' when both missing", () => {
    renderAt("/user/settings/youtube-callback", "user");
    const matches = screen.getAllByText(/Authorization code bulunamadi/);
    // User variant is SHORT — no "gecerli bir yonlendirme" tail.
    expect(matches[0].textContent).not.toMatch(/gecerli bir yonlendirme/);
  });

  it("admin error state exposes admin testid", () => {
    renderAt("/admin/settings/youtube-callback?error=denied", "admin");
    expect(screen.getByTestId("youtube-callback-admin")).toBeDefined();
    expect(screen.queryByTestId("youtube-callback-user")).toBeNull();
  });

  it("user error state exposes user testid", () => {
    renderAt("/user/settings/youtube-callback?error=denied", "user");
    expect(screen.getByTestId("youtube-callback-user")).toBeDefined();
    expect(screen.queryByTestId("youtube-callback-admin")).toBeNull();
  });
});
