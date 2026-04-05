import { describe, it, expect } from "vitest";

/**
 * useDiscoverySearch is a React Query hook with debounce.
 * Testing the full hook requires renderHook + MSW or similar.
 * Here we test the module-level logic and type exports.
 */

describe("useDiscoverySearch module", () => {
  it("exports useDiscoverySearch function", async () => {
    const mod = await import("../../hooks/useDiscoverySearch");
    expect(typeof mod.useDiscoverySearch).toBe("function");
  });

  it("exports DiscoveryResult type (module has expected structure)", async () => {
    const mod = await import("../../hooks/useDiscoverySearch");
    // Verify the module exports the hook
    expect(mod).toHaveProperty("useDiscoverySearch");
  });
});

describe("useContextualActions module", () => {
  it("exports dispatchAction function", async () => {
    const mod = await import("../../hooks/useContextualActions");
    expect(typeof mod.dispatchAction).toBe("function");
  });

  it("exports useContextualActionListener function", async () => {
    const mod = await import("../../hooks/useContextualActions");
    expect(typeof mod.useContextualActionListener).toBe("function");
  });

  it("dispatchAction does not throw with unknown action", async () => {
    const { dispatchAction } = await import("../../hooks/useContextualActions");
    expect(() => dispatchAction("test:unknown-action")).not.toThrow();
  });
});
