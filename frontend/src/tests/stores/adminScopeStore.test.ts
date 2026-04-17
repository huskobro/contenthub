/**
 * adminScopeStore unit tests — Faz R5 / P0.2 (Redesign REV-2).
 *
 * Verifies:
 * 1. Initial state defaults (mode="all", userId=null, hasHydrated=true).
 * 2. setAll / focusUser / clear transitions.
 * 3. focusUser("") no-op guard.
 * 4. localStorage persistence on every mutation.
 * 5. Rehydration from versioned shape on construction / loadFromStorage.
 * 6. Invalid storage shape rejection (bad version, bad mode, missing userId).
 * 7. __resetAdminScopeStoreForTests helper resets cleanly.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  useAdminScopeStore,
  __resetAdminScopeStoreForTests,
} from "../../stores/adminScopeStore";

const STORAGE_KEY = "contenthub:admin-scope";

describe("adminScopeStore", () => {
  beforeEach(() => {
    __resetAdminScopeStoreForTests();
  });

  it("starts with default state (mode=all, userId=null)", () => {
    const { mode, userId, hasHydrated } = useAdminScopeStore.getState();
    expect(mode).toBe("all");
    expect(userId).toBeNull();
    expect(hasHydrated).toBe(true);
  });

  it("focusUser switches to mode=user and persists to localStorage", () => {
    useAdminScopeStore.getState().focusUser("u-42");
    const { mode, userId } = useAdminScopeStore.getState();
    expect(mode).toBe("user");
    expect(userId).toBe("u-42");

    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed).toEqual({ v: 1, mode: "user", userId: "u-42" });
  });

  it("focusUser('') is a no-op guard", () => {
    useAdminScopeStore.getState().focusUser("");
    const { mode, userId } = useAdminScopeStore.getState();
    expect(mode).toBe("all");
    expect(userId).toBeNull();
  });

  it("setAll returns to mode=all and nulls userId", () => {
    useAdminScopeStore.getState().focusUser("u-42");
    useAdminScopeStore.getState().setAll();
    const { mode, userId } = useAdminScopeStore.getState();
    expect(mode).toBe("all");
    expect(userId).toBeNull();

    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(raw!);
    expect(parsed).toEqual({ v: 1, mode: "all", userId: null });
  });

  it("clear is an alias for setAll", () => {
    useAdminScopeStore.getState().focusUser("u-9");
    useAdminScopeStore.getState().clear();
    const { mode, userId } = useAdminScopeStore.getState();
    expect(mode).toBe("all");
    expect(userId).toBeNull();
  });

  it("loadFromStorage rehydrates a valid persisted user-scope shape", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ v: 1, mode: "user", userId: "u-rehydrated" }),
    );
    useAdminScopeStore.getState().loadFromStorage();
    const { mode, userId } = useAdminScopeStore.getState();
    expect(mode).toBe("user");
    expect(userId).toBe("u-rehydrated");
  });

  it("loadFromStorage rehydrates a valid all-scope shape", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ v: 1, mode: "all", userId: null }),
    );
    useAdminScopeStore.getState().loadFromStorage();
    const { mode, userId } = useAdminScopeStore.getState();
    expect(mode).toBe("all");
    expect(userId).toBeNull();
  });

  it("loadFromStorage rejects wrong version", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ v: 999, mode: "user", userId: "u-x" }),
    );
    useAdminScopeStore.getState().loadFromStorage();
    const { mode, userId } = useAdminScopeStore.getState();
    expect(mode).toBe("all");
    expect(userId).toBeNull();
  });

  it("loadFromStorage rejects invalid mode value", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ v: 1, mode: "organization", userId: "u-x" }),
    );
    useAdminScopeStore.getState().loadFromStorage();
    const { mode, userId } = useAdminScopeStore.getState();
    expect(mode).toBe("all");
    expect(userId).toBeNull();
  });

  it("loadFromStorage rejects mode=user without valid userId string", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ v: 1, mode: "user", userId: null }),
    );
    useAdminScopeStore.getState().loadFromStorage();
    const { mode, userId } = useAdminScopeStore.getState();
    expect(mode).toBe("all");
    expect(userId).toBeNull();
  });

  it("loadFromStorage tolerates corrupt JSON", () => {
    localStorage.setItem(STORAGE_KEY, "}{not-json");
    useAdminScopeStore.getState().loadFromStorage();
    const { mode, userId } = useAdminScopeStore.getState();
    expect(mode).toBe("all");
    expect(userId).toBeNull();
  });

  it("loadFromStorage tolerates empty storage (no key)", () => {
    localStorage.removeItem(STORAGE_KEY);
    useAdminScopeStore.getState().loadFromStorage();
    const { mode, userId } = useAdminScopeStore.getState();
    expect(mode).toBe("all");
    expect(userId).toBeNull();
  });

  it("setAll overwrites a prior persisted user-scope in storage", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ v: 1, mode: "user", userId: "u-old" }),
    );
    useAdminScopeStore.getState().setAll();
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(raw!);
    expect(parsed).toEqual({ v: 1, mode: "all", userId: null });
  });

  it("__resetAdminScopeStoreForTests clears both state and storage", () => {
    useAdminScopeStore.getState().focusUser("u-temp");
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();

    __resetAdminScopeStoreForTests();

    const { mode, userId } = useAdminScopeStore.getState();
    expect(mode).toBe("all");
    expect(userId).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
