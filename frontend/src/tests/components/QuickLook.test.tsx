/**
 * QuickLook component tests — Wave 1
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QuickLook } from "../../components/design-system/QuickLook";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("QuickLook", () => {
  it("renders nothing when closed", () => {
    render(
      <Wrapper>
        <QuickLook open={false} onClose={() => {}}>Preview</QuickLook>
      </Wrapper>
    );
    expect(screen.queryByTestId("quicklook-modal")).toBeNull();
  });

  it("renders modal when open", () => {
    render(
      <Wrapper>
        <QuickLook open={true} onClose={() => {}} title="Ön İzleme">
          <p>Preview content</p>
        </QuickLook>
      </Wrapper>
    );
    expect(screen.getByTestId("quicklook-modal")).toBeTruthy();
    expect(screen.getByText("Ön İzleme")).toBeTruthy();
    expect(screen.getByText("Preview content")).toBeTruthy();
  });

  it("calls onClose when backdrop clicked", () => {
    const onClose = vi.fn();
    render(
      <Wrapper>
        <QuickLook open={true} onClose={onClose} title="T">Content</QuickLook>
      </Wrapper>
    );
    fireEvent.click(screen.getByTestId("quicklook-backdrop"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("has dialog role and aria-modal", () => {
    render(
      <Wrapper>
        <QuickLook open={true} onClose={() => {}} title="T">Content</QuickLook>
      </Wrapper>
    );
    const modal = screen.getByTestId("quicklook-modal");
    expect(modal.getAttribute("role")).toBe("dialog");
    expect(modal.getAttribute("aria-modal")).toBe("true");
  });

  it("shows 'Space ile kapat' hint", () => {
    render(
      <Wrapper>
        <QuickLook open={true} onClose={() => {}} title="T">Content</QuickLook>
      </Wrapper>
    );
    expect(screen.getByText("Space ile kapat")).toBeTruthy();
  });
});
