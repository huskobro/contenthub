/**
 * selectableSurfaces helper — Faz 4A unit tests.
 *
 * Verifies the "picker metadata" helper used by both
 * `ThemeRegistryPage` (admin scope) and `UserSettingsPage` (user scope).
 *
 * The helper must produce the SAME eligibility decisions as the resolver:
 *
 *   1. bootstrap surfaces (legacy, horizon) are always selectable regardless
 *      of the admin `enabledSurfaceIds` gate
 *   2. admin `enabledSurfaceIds` gate blocks non-bootstrap surfaces
 *   3. `status === "disabled"` blocks the entry regardless of gate
 *   4. `hidden === true` entries exist but `buildVisibleSurfacePickerEntries`
 *      drops them; they also carry `ineligibleReason === "hidden"`
 *   5. scope mismatch flips ineligible reason to "scope-mismatch"
 *   6. priority order of reasons is: hidden > status-disabled > scope-mismatch > admin-gate-off
 *   7. deterministic sort: legacy first, horizon second, rest alphabetical
 *   8. `isActive` flips when activeSurfaceId matches
 *   9. `findActivePickerEntry` returns the active entry or null
 *  10. `describeIneligibleReason` returns a non-empty Turkish string for each reason
 */

import { describe, it, expect } from "vitest";
import type { Surface, SurfaceManifest, SurfaceScope, SurfaceStatus } from "../surfaces/contract";
import {
  buildSurfacePickerEntry,
  buildSurfacePickerEntries,
  buildVisibleSurfacePickerEntries,
  buildScopedSurfacePickerEntries,
  findActivePickerEntry,
  describeIneligibleReason,
  type PickerIneligibleReason,
} from "../surfaces/selectableSurfaces";

// ---------------------------------------------------------------------------
// Fixture builders
// ---------------------------------------------------------------------------

function makeManifest(
  id: string,
  opts: {
    scope?: SurfaceScope;
    status?: SurfaceStatus;
    hidden?: boolean;
    name?: string;
  } = {},
): SurfaceManifest {
  return {
    id,
    name: opts.name ?? `Surface ${id}`,
    tagline: `tagline for ${id}`,
    description: `description for ${id}`,
    author: "tests",
    version: "1.0.0",
    scope: opts.scope ?? "both",
    status: opts.status ?? "stable",
    coverage: "full",
    hidden: opts.hidden,
  };
}

function makeSurface(
  id: string,
  opts: {
    scope?: SurfaceScope;
    status?: SurfaceStatus;
    hidden?: boolean;
  } = {},
): Surface {
  return {
    manifest: makeManifest(id, opts),
  };
}

function allEnabled(): ReadonlySet<string> {
  return new Set<string>([
    "legacy",
    "horizon",
    "aurora",
    "alt-user-a",
    "alt-admin",
    "alt-user-b",
  ]);
}

// ---------------------------------------------------------------------------
// buildSurfacePickerEntry — single-surface eligibility
// ---------------------------------------------------------------------------

describe("buildSurfacePickerEntry — single-surface eligibility", () => {
  it("marks a stable user-scope surface in a user panel as selectable", () => {
    const entry = buildSurfacePickerEntry(
      makeSurface("alt-user-a", { scope: "user", status: "beta" }),
      {
        scope: "user",
        enabledSurfaceIds: allEnabled(),
        activeSurfaceId: null,
      },
    );
    expect(entry.selectable).toBe(true);
    expect(entry.ineligibleReason).toBeNull();
    expect(entry.isActive).toBe(false);
    expect(entry.alwaysOn).toBe(false);
    expect(entry.hidden).toBe(false);
  });

  it("bootstrap legacy is selectable even when it is NOT in enabledSurfaceIds", () => {
    const entry = buildSurfacePickerEntry(makeSurface("legacy"), {
      scope: "user",
      enabledSurfaceIds: new Set<string>(), // empty — gate is OFF for everyone
      activeSurfaceId: null,
    });
    expect(entry.selectable).toBe(true);
    expect(entry.alwaysOn).toBe(true);
    expect(entry.ineligibleReason).toBeNull();
  });

  it("bootstrap horizon is selectable regardless of gate", () => {
    const entry = buildSurfacePickerEntry(makeSurface("horizon"), {
      scope: "admin",
      enabledSurfaceIds: new Set<string>(),
      activeSurfaceId: null,
    });
    expect(entry.selectable).toBe(true);
    expect(entry.alwaysOn).toBe(true);
  });

  it("non-bootstrap surface NOT in enabledSurfaceIds → admin-gate-off", () => {
    const entry = buildSurfacePickerEntry(
      makeSurface("alt-user-a", { scope: "user", status: "beta" }),
      {
        scope: "user",
        enabledSurfaceIds: new Set<string>(["legacy", "horizon"]),
        activeSurfaceId: null,
      },
    );
    expect(entry.selectable).toBe(false);
    expect(entry.ineligibleReason).toBe("admin-gate-off");
  });

  it("disabled status beats gate-off → status-disabled", () => {
    const entry = buildSurfacePickerEntry(
      makeSurface("alt-user-a", { scope: "user", status: "disabled" }),
      {
        scope: "user",
        enabledSurfaceIds: new Set<string>(["legacy", "horizon"]),
        activeSurfaceId: null,
      },
    );
    expect(entry.selectable).toBe(false);
    expect(entry.ineligibleReason).toBe("status-disabled");
  });

  it("scope mismatch (admin panel, user-only surface) → scope-mismatch", () => {
    const entry = buildSurfacePickerEntry(
      makeSurface("alt-user-a", { scope: "user", status: "beta" }),
      {
        scope: "admin",
        enabledSurfaceIds: allEnabled(),
        activeSurfaceId: null,
      },
    );
    expect(entry.selectable).toBe(false);
    expect(entry.ineligibleReason).toBe("scope-mismatch");
  });

  it("scope mismatch (user panel, admin-only surface) → scope-mismatch", () => {
    const entry = buildSurfacePickerEntry(
      makeSurface("alt-admin", { scope: "admin", status: "beta" }),
      {
        scope: "user",
        enabledSurfaceIds: allEnabled(),
        activeSurfaceId: null,
      },
    );
    expect(entry.selectable).toBe(false);
    expect(entry.ineligibleReason).toBe("scope-mismatch");
  });

  it('"both" scope surface is allowed in either panel', () => {
    for (const panel of ["admin", "user"] as const) {
      const entry = buildSurfacePickerEntry(
        makeSurface("horizon", { scope: "both", status: "stable" }),
        {
          scope: panel,
          enabledSurfaceIds: allEnabled(),
          activeSurfaceId: null,
        },
      );
      expect(entry.selectable).toBe(true);
    }
  });

  it("hidden surface returns entry with reason=hidden (priority #1)", () => {
    const entry = buildSurfacePickerEntry(
      makeSurface("internal", { scope: "both", status: "stable", hidden: true }),
      {
        scope: "user",
        enabledSurfaceIds: allEnabled(),
        activeSurfaceId: null,
      },
    );
    expect(entry.hidden).toBe(true);
    expect(entry.selectable).toBe(false);
    expect(entry.ineligibleReason).toBe("hidden");
  });

  it("priority order: hidden > status-disabled > scope-mismatch > admin-gate-off", () => {
    // hidden + disabled + scope mismatch + gate off → "hidden"
    const both = buildSurfacePickerEntry(
      makeSurface("weird", {
        scope: "admin", // panel will be user → mismatch
        status: "disabled",
        hidden: true,
      }),
      {
        scope: "user",
        enabledSurfaceIds: new Set<string>(), // gate off
        activeSurfaceId: null,
      },
    );
    expect(both.ineligibleReason).toBe("hidden");

    // disabled + scope mismatch + gate off → "status-disabled"
    const nodable = buildSurfacePickerEntry(
      makeSurface("weird", { scope: "admin", status: "disabled" }),
      {
        scope: "user",
        enabledSurfaceIds: new Set<string>(),
        activeSurfaceId: null,
      },
    );
    expect(nodable.ineligibleReason).toBe("status-disabled");

    // scope mismatch + gate off → "scope-mismatch"
    const mism = buildSurfacePickerEntry(
      makeSurface("weird", { scope: "admin", status: "beta" }),
      {
        scope: "user",
        enabledSurfaceIds: new Set<string>(),
        activeSurfaceId: null,
      },
    );
    expect(mism.ineligibleReason).toBe("scope-mismatch");

    // gate off only → "admin-gate-off"
    const gateOff = buildSurfacePickerEntry(
      makeSurface("weird", { scope: "user", status: "beta" }),
      {
        scope: "user",
        enabledSurfaceIds: new Set<string>(),
        activeSurfaceId: null,
      },
    );
    expect(gateOff.ineligibleReason).toBe("admin-gate-off");
  });

  it("isActive flips when activeSurfaceId matches", () => {
    const entry = buildSurfacePickerEntry(
      makeSurface("alt-user-a", { scope: "user", status: "beta" }),
      {
        scope: "user",
        enabledSurfaceIds: allEnabled(),
        activeSurfaceId: "alt-user-a",
      },
    );
    expect(entry.isActive).toBe(true);
  });

  it("isActive stays false when activeSurfaceId is null", () => {
    const entry = buildSurfacePickerEntry(
      makeSurface("alt-user-a", { scope: "user", status: "beta" }),
      {
        scope: "user",
        enabledSurfaceIds: allEnabled(),
        activeSurfaceId: null,
      },
    );
    expect(entry.isActive).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// buildSurfacePickerEntries — full list + deterministic sort
// ---------------------------------------------------------------------------

describe("buildSurfacePickerEntries — list + sort", () => {
  const provider = () => [
    makeSurface("alt-user-b", { scope: "user", status: "beta" }),
    makeSurface("alt-user-a", { scope: "user", status: "beta" }),
    makeSurface("alt-admin", { scope: "admin", status: "beta" }),
    makeSurface("horizon", { scope: "both", status: "stable" }),
    makeSurface("legacy", { scope: "both", status: "stable" }),
  ];

  it("sorts legacy first, horizon second, rest alphabetical", () => {
    const entries = buildSurfacePickerEntries({
      scope: "user",
      enabledSurfaceIds: allEnabled(),
      activeSurfaceId: null,
      surfaceProvider: provider,
    });
    expect(entries.map((e) => e.id)).toEqual([
      "legacy",
      "horizon",
      "alt-admin",
      "alt-user-a",
      "alt-user-b",
    ]);
  });

  it("returns one entry per provided surface (no silent filtering)", () => {
    const entries = buildSurfacePickerEntries({
      scope: "user",
      enabledSurfaceIds: allEnabled(),
      activeSurfaceId: null,
      surfaceProvider: provider,
    });
    expect(entries.length).toBe(5);
  });

  it("user panel → admin-scope surface is present but ineligible (scope-mismatch)", () => {
    const entries = buildSurfacePickerEntries({
      scope: "user",
      enabledSurfaceIds: allEnabled(),
      activeSurfaceId: null,
      surfaceProvider: provider,
    });
    const adminOnly = entries.find((e) => e.id === "alt-admin");
    expect(adminOnly).toBeDefined();
    expect(adminOnly!.selectable).toBe(false);
    expect(adminOnly!.ineligibleReason).toBe("scope-mismatch");
  });

  it("admin panel → user-scope surfaces present but ineligible (scope-mismatch)", () => {
    const entries = buildSurfacePickerEntries({
      scope: "admin",
      enabledSurfaceIds: allEnabled(),
      activeSurfaceId: null,
      surfaceProvider: provider,
    });
    const userA = entries.find((e) => e.id === "alt-user-a")!;
    const userB = entries.find((e) => e.id === "alt-user-b")!;
    expect(userA.ineligibleReason).toBe("scope-mismatch");
    expect(userB.ineligibleReason).toBe("scope-mismatch");
  });
});

// ---------------------------------------------------------------------------
// buildVisibleSurfacePickerEntries — hides hidden entries
// ---------------------------------------------------------------------------

describe("buildVisibleSurfacePickerEntries — hidden filter", () => {
  it("drops hidden entries but keeps ineligible non-hidden ones", () => {
    const provider = () => [
      makeSurface("legacy", { scope: "both" }),
      makeSurface("horizon", { scope: "both" }),
      makeSurface("internal", { scope: "both", hidden: true }),
      makeSurface("alt-admin", { scope: "admin", status: "beta" }),
    ];
    const entries = buildVisibleSurfacePickerEntries({
      scope: "user",
      enabledSurfaceIds: allEnabled(),
      activeSurfaceId: null,
      surfaceProvider: provider,
    });
    const ids = entries.map((e) => e.id);
    expect(ids).not.toContain("internal");
    // alt-admin is ineligible (scope-mismatch) but still visible — picker
    // will show it with a "neden secilemez" etiketi.
    expect(ids).toContain("alt-admin");
    expect(ids).toContain("legacy");
    expect(ids).toContain("horizon");
  });
});

// ---------------------------------------------------------------------------
// findActivePickerEntry
// ---------------------------------------------------------------------------

describe("findActivePickerEntry", () => {
  const provider = () => [
    makeSurface("legacy", { scope: "both" }),
    makeSurface("horizon", { scope: "both" }),
    makeSurface("alt-user-a", { scope: "user", status: "beta" }),
  ];

  it("returns the matching entry when an activeSurfaceId is set", () => {
    const entries = buildVisibleSurfacePickerEntries({
      scope: "user",
      enabledSurfaceIds: allEnabled(),
      activeSurfaceId: "alt-user-a",
      surfaceProvider: provider,
    });
    const active = findActivePickerEntry(entries);
    expect(active).not.toBeNull();
    expect(active!.id).toBe("alt-user-a");
  });

  it("returns null when no activeSurfaceId is set", () => {
    const entries = buildVisibleSurfacePickerEntries({
      scope: "user",
      enabledSurfaceIds: allEnabled(),
      activeSurfaceId: null,
      surfaceProvider: provider,
    });
    const active = findActivePickerEntry(entries);
    expect(active).toBeNull();
  });

  it("returns null when activeSurfaceId does not match any entry", () => {
    const entries = buildVisibleSurfacePickerEntries({
      scope: "user",
      enabledSurfaceIds: allEnabled(),
      activeSurfaceId: "nonexistent",
      surfaceProvider: provider,
    });
    const active = findActivePickerEntry(entries);
    expect(active).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// describeIneligibleReason — Turkish user-facing copy
// ---------------------------------------------------------------------------

describe("describeIneligibleReason", () => {
  const reasons: PickerIneligibleReason[] = [
    "scope-mismatch",
    "admin-gate-off",
    "status-disabled",
    "hidden",
  ];

  it("returns a non-empty string for every known reason code", () => {
    for (const reason of reasons) {
      const text = describeIneligibleReason(reason);
      expect(typeof text).toBe("string");
      expect(text.length).toBeGreaterThan(5);
    }
  });

  it("returns distinct strings for distinct reasons", () => {
    const strings = new Set(reasons.map((r) => describeIneligibleReason(r)));
    expect(strings.size).toBe(reasons.length);
  });
});

// ---------------------------------------------------------------------------
// buildScopedSurfacePickerEntries — Faz 4E scope hard-filter
// ---------------------------------------------------------------------------
//
// Option (a) semantics: user panel shows only user + both; admin panel shows
// only admin + both; scope-mismatch surfaces are dropped entirely from the
// list (not even rendered as an "unavailable" card). Hidden surfaces remain
// dropped as before.

describe("buildScopedSurfacePickerEntries — Faz 4E", () => {
  function fullRegistry() {
    return [
      makeSurface("legacy", { scope: "both" }),
      makeSurface("horizon", { scope: "both" }),
      makeSurface("alt-user-a", { scope: "user" }),
      makeSurface("alt-user-b", { scope: "user" }),
      makeSurface("alt-admin", { scope: "admin" }),
      makeSurface("internal", { scope: "both", hidden: true }),
    ];
  }

  it("user panel: hides admin-scope surfaces entirely", () => {
    const entries = buildScopedSurfacePickerEntries({
      scope: "user",
      enabledSurfaceIds: allEnabled(),
      activeSurfaceId: null,
      surfaceProvider: fullRegistry,
    });
    const ids = entries.map((e) => e.id);
    expect(ids).not.toContain("alt-admin");
    expect(ids).not.toContain("internal");
    expect(ids).toContain("legacy");
    expect(ids).toContain("horizon");
    expect(ids).toContain("alt-user-a");
    expect(ids).toContain("alt-user-b");
  });

  it("admin panel: hides user-scope surfaces entirely", () => {
    const entries = buildScopedSurfacePickerEntries({
      scope: "admin",
      enabledSurfaceIds: allEnabled(),
      activeSurfaceId: null,
      surfaceProvider: fullRegistry,
    });
    const ids = entries.map((e) => e.id);
    expect(ids).not.toContain("alt-user-a");
    expect(ids).not.toContain("alt-user-b");
    expect(ids).not.toContain("internal");
    expect(ids).toContain("legacy");
    expect(ids).toContain("horizon");
    expect(ids).toContain("alt-admin");
  });

  it("keeps ineligible-but-scope-ok entries (e.g. admin-gate-off)", () => {
    // alt-user-a is user-scope, so it passes scope filter for user panel. But
    // it's NOT in enabledSurfaceIds → should remain in the list as a
    // non-selectable entry with admin-gate-off reason.
    const gated: ReadonlySet<string> = new Set(["legacy", "horizon"]);
    const entries = buildScopedSurfacePickerEntries({
      scope: "user",
      enabledSurfaceIds: gated,
      activeSurfaceId: null,
      surfaceProvider: fullRegistry,
    });
    const gatedEntry = entries.find((e) => e.id === "alt-user-a");
    expect(gatedEntry).toBeTruthy();
    expect(gatedEntry!.selectable).toBe(false);
    expect(gatedEntry!.ineligibleReason).toBe("admin-gate-off");
  });

  it("keeps status-disabled scope-ok entries", () => {
    const provider = () => [
      makeSurface("legacy", { scope: "both" }),
      makeSurface("horizon", { scope: "both" }),
      makeSurface("alt-user-a", { scope: "user", status: "disabled" }),
    ];
    const entries = buildScopedSurfacePickerEntries({
      scope: "user",
      enabledSurfaceIds: allEnabled(),
      activeSurfaceId: null,
      surfaceProvider: provider,
    });
    const disabledEntry = entries.find((e) => e.id === "alt-user-a");
    expect(disabledEntry).toBeTruthy();
    expect(disabledEntry!.selectable).toBe(false);
    expect(disabledEntry!.ineligibleReason).toBe("status-disabled");
  });

  it("never exposes scope-mismatch as a visible reason", () => {
    const entries = buildScopedSurfacePickerEntries({
      scope: "user",
      enabledSurfaceIds: allEnabled(),
      activeSurfaceId: null,
      surfaceProvider: fullRegistry,
    });
    for (const e of entries) {
      expect(e.ineligibleReason).not.toBe("scope-mismatch");
    }
  });

  it("hides hidden entries in both scopes", () => {
    const userEntries = buildScopedSurfacePickerEntries({
      scope: "user",
      enabledSurfaceIds: allEnabled(),
      activeSurfaceId: null,
      surfaceProvider: fullRegistry,
    });
    const adminEntries = buildScopedSurfacePickerEntries({
      scope: "admin",
      enabledSurfaceIds: allEnabled(),
      activeSurfaceId: null,
      surfaceProvider: fullRegistry,
    });
    expect(userEntries.map((e) => e.id)).not.toContain("internal");
    expect(adminEntries.map((e) => e.id)).not.toContain("internal");
  });
});
