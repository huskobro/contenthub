/**
 * useSSEFallbackRefetch smoke — banner artık yalan söylemiyor.
 *
 * Aurora Final Polish: CockpitShell statusbar'ında SSE offline'ken "polling ile
 * çalışılıyor" göründüğünde gerçekten polling yapıldığını garanti altına alır.
 *
 * Davranış:
 *   - Status "offline" olunca tick hemen çalışmalı (ilk invalidate).
 *   - Interval ile tekrar invalidate etmeli (15 sn default, test'te kısa).
 *   - Status "live"e dönünce interval temizlenmeli.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

import { useSSEFallbackRefetch } from "../hooks/useSSEFallbackRefetch";
import { useSSEStatusStore } from "../stores/sseStatusStore";

function makeWrapper(client: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe("useSSEFallbackRefetch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useSSEStatusStore.setState({ status: "live", lastChangeAt: 0 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("status offline olduğunda invalidateQueries hemen bir kez çağrılır", () => {
    const client = new QueryClient();
    const spy = vi.spyOn(client, "invalidateQueries");
    const wrapper = makeWrapper(client);

    // Hook aktif, status live → invalidate çağrılmamalı
    renderHook(
      () =>
        useSSEFallbackRefetch({
          intervalMs: 1_000,
          invalidateKeys: [["jobs"]],
        }),
      { wrapper },
    );
    expect(spy).not.toHaveBeenCalled();

    // Offline'a çek → immediate tick
    act(() => {
      useSSEStatusStore.setState({ status: "offline", lastChangeAt: Date.now() });
    });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith({ queryKey: ["jobs"] });
  });

  it("offline iken interval geçtiğinde tekrar invalidate eder", () => {
    const client = new QueryClient();
    const spy = vi.spyOn(client, "invalidateQueries");
    const wrapper = makeWrapper(client);

    useSSEStatusStore.setState({ status: "offline", lastChangeAt: 0 });

    renderHook(
      () =>
        useSSEFallbackRefetch({
          intervalMs: 100,
          invalidateKeys: [["jobs"], ["notifications"]],
        }),
      { wrapper },
    );
    // İlk tick hemen
    expect(spy).toHaveBeenCalledTimes(2); // 2 key → 2 çağrı

    // 100ms ilerle → bir tick daha
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(spy).toHaveBeenCalledTimes(4);

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(spy).toHaveBeenCalledTimes(6);
  });

  it("status live'a dönünce interval durur", () => {
    const client = new QueryClient();
    const spy = vi.spyOn(client, "invalidateQueries");
    const wrapper = makeWrapper(client);

    useSSEStatusStore.setState({ status: "offline", lastChangeAt: 0 });

    renderHook(
      () =>
        useSSEFallbackRefetch({
          intervalMs: 100,
          invalidateKeys: [["jobs"]],
        }),
      { wrapper },
    );
    // İlk tick
    const baseline = spy.mock.calls.length;

    // Live'a dön
    act(() => {
      useSSEStatusStore.setState({ status: "live", lastChangeAt: Date.now() });
    });
    // İntervaller artık çalışmamalı
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(spy.mock.calls.length).toBe(baseline);
  });

  it("enabled=false verildiğinde offline bile olsa hiç invalidate etmez", () => {
    const client = new QueryClient();
    const spy = vi.spyOn(client, "invalidateQueries");
    const wrapper = makeWrapper(client);

    useSSEStatusStore.setState({ status: "offline", lastChangeAt: 0 });

    renderHook(
      () =>
        useSSEFallbackRefetch({
          enabled: false,
          intervalMs: 100,
          invalidateKeys: [["jobs"]],
        }),
      { wrapper },
    );
    expect(spy).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(spy).not.toHaveBeenCalled();
  });
});
