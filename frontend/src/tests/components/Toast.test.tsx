/**
 * Toast component tests — Wave 1
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ToastContainer } from "../../components/design-system/Toast";
import { useUIStore } from "../../stores/uiStore";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("ToastContainer", () => {
  beforeEach(() => {
    useUIStore.setState({ toasts: [] });
    vi.useFakeTimers();
  });

  it("renders nothing when no toasts", () => {
    render(<Wrapper><ToastContainer /></Wrapper>);
    expect(screen.queryByTestId("toast-container")).toBeNull();
  });

  it("renders success toast", () => {
    act(() => { useUIStore.getState().addToast("success", "Kaydedildi"); });
    render(<Wrapper><ToastContainer /></Wrapper>);
    expect(screen.getByTestId("toast-container")).toBeTruthy();
    expect(screen.getByTestId("toast-success")).toBeTruthy();
    expect(screen.getByText("Kaydedildi")).toBeTruthy();
  });

  it("renders error toast", () => {
    act(() => { useUIStore.getState().addToast("error", "Hata olustu"); });
    render(<Wrapper><ToastContainer /></Wrapper>);
    expect(screen.getByTestId("toast-error")).toBeTruthy();
  });

  it("renders multiple toasts", () => {
    act(() => {
      useUIStore.getState().addToast("success", "A");
      useUIStore.getState().addToast("error", "B");
      useUIStore.getState().addToast("info", "C");
    });
    render(<Wrapper><ToastContainer /></Wrapper>);
    expect(screen.getByText("A")).toBeTruthy();
    expect(screen.getByText("B")).toBeTruthy();
    expect(screen.getByText("C")).toBeTruthy();
  });

  it("has aria-live for accessibility", () => {
    act(() => { useUIStore.getState().addToast("info", "X"); });
    render(<Wrapper><ToastContainer /></Wrapper>);
    expect(screen.getByTestId("toast-container").getAttribute("aria-live")).toBe("polite");
  });
});
