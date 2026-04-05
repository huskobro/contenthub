/**
 * Sheet component tests — Wave 1
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Sheet } from "../../components/design-system/Sheet";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("Sheet", () => {
  it("renders nothing when closed", () => {
    render(
      <Wrapper>
        <Sheet open={false} onClose={() => {}}>Content</Sheet>
      </Wrapper>
    );
    expect(screen.queryByTestId("sheet-panel")).toBeNull();
  });

  it("renders panel when open", () => {
    render(
      <Wrapper>
        <Sheet open={true} onClose={() => {}} title="Test Sheet">
          <p>Hello</p>
        </Sheet>
      </Wrapper>
    );
    expect(screen.getByTestId("sheet-panel")).toBeTruthy();
    expect(screen.getByText("Test Sheet")).toBeTruthy();
    expect(screen.getByText("Hello")).toBeTruthy();
  });

  it("calls onClose when backdrop is clicked", () => {
    const onClose = vi.fn();
    render(
      <Wrapper>
        <Sheet open={true} onClose={onClose} title="T">Content</Sheet>
      </Wrapper>
    );
    fireEvent.click(screen.getByTestId("sheet-backdrop"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(
      <Wrapper>
        <Sheet open={true} onClose={onClose} title="T">Content</Sheet>
      </Wrapper>
    );
    fireEvent.click(screen.getByTestId("sheet-close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("uses custom testId", () => {
    render(
      <Wrapper>
        <Sheet open={true} onClose={() => {}} title="T" testId="my-sheet">Content</Sheet>
      </Wrapper>
    );
    expect(screen.getByTestId("my-sheet")).toBeTruthy();
    expect(screen.getByTestId("my-sheet-close")).toBeTruthy();
    expect(screen.getByTestId("my-sheet-backdrop")).toBeTruthy();
  });

  it("has dialog role and aria-modal", () => {
    render(
      <Wrapper>
        <Sheet open={true} onClose={() => {}} title="T">Content</Sheet>
      </Wrapper>
    );
    const panel = screen.getByTestId("sheet-panel");
    expect(panel.getAttribute("role")).toBe("dialog");
    expect(panel.getAttribute("aria-modal")).toBe("true");
  });
});
