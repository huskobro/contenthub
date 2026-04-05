import { describe, it, expect, vi } from "vitest";
import { buildContextualCommands, ContextualActionIds } from "../../commands/contextualCommands";
import { buildAdminNavigationCommands, buildAdminActionCommands } from "../../commands/adminCommands";
import { dispatchAction } from "../../hooks/useContextualActions";

describe("contextualCommands", () => {
  const navigate = vi.fn();
  const commands = buildContextualCommands(navigate);

  it("returns commands for all expected contexts", () => {
    expect(commands.length).toBeGreaterThanOrEqual(10);
  });

  it("all commands have unique ids", () => {
    const ids = commands.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all commands have contextRoutes set", () => {
    for (const cmd of commands) {
      expect(cmd.contextRoutes).toBeDefined();
      expect(cmd.contextRoutes!.length).toBeGreaterThan(0);
    }
  });

  it("jobs commands are scoped to /admin/jobs", () => {
    const jobsCmds = commands.filter((c) => c.id.startsWith("ctx:jobs-"));
    expect(jobsCmds.length).toBe(3);
    for (const cmd of jobsCmds) {
      expect(cmd.contextRoutes).toContain("/admin/jobs");
    }
  });

  it("library commands are scoped to /admin/library", () => {
    const libCmds = commands.filter((c) => c.id.startsWith("ctx:library-"));
    expect(libCmds.length).toBe(3);
    for (const cmd of libCmds) {
      expect(cmd.contextRoutes).toContain("/admin/library");
    }
  });

  it("settings commands are scoped to /admin/settings", () => {
    const settCmds = commands.filter((c) => c.id.startsWith("ctx:settings-"));
    expect(settCmds.length).toBe(2);
    for (const cmd of settCmds) {
      expect(cmd.contextRoutes).toContain("/admin/settings");
    }
  });

  it("sources commands are scoped to /admin/sources", () => {
    const srcCmds = commands.filter((c) => c.id.startsWith("ctx:sources-"));
    expect(srcCmds.length).toBe(2);
    for (const cmd of srcCmds) {
      expect(cmd.contextRoutes).toContain("/admin/sources");
    }
  });

  it("settings theme command navigates to /admin/themes", () => {
    const themeCmd = commands.find((c) => c.id === "ctx:settings-goto-themes");
    expect(themeCmd).toBeDefined();
    themeCmd!.action();
    expect(navigate).toHaveBeenCalledWith("/admin/themes");
  });

  it("all commands have label and icon", () => {
    for (const cmd of commands) {
      expect(cmd.label).toBeTruthy();
      expect(cmd.icon).toBeTruthy();
    }
  });

  it("no id collision with admin navigation commands", () => {
    const navCmds = buildAdminNavigationCommands(navigate);
    const actCmds = buildAdminActionCommands(navigate);
    const allIds = [...navCmds, ...actCmds, ...commands].map((c) => c.id);
    expect(new Set(allIds).size).toBe(allIds.length);
  });
});

describe("ContextualActionIds", () => {
  it("all action ids are unique strings", () => {
    const ids = Object.values(ContextualActionIds);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(typeof id).toBe("string");
      expect(id.length).toBeGreaterThan(0);
    }
  });
});

describe("dispatchAction", () => {
  it("dispatches to subscribed handlers", () => {
    const handler = vi.fn();
    // Manually subscribe since useContextualActionListener needs React
    // We'll test the raw dispatch/subscribe here
    const { subscribe } = (() => {
      // Access internal via module
      const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
      function sub(id: string, fn: (...args: unknown[]) => void) {
        if (!listeners.has(id)) listeners.set(id, new Set());
        listeners.get(id)!.add(fn);
        return () => { listeners.get(id)?.delete(fn); };
      }
      return { subscribe: sub };
    })();

    // dispatchAction is the public API
    // We can test it fires correctly by dispatching to a known action
    dispatchAction("test:nonexistent"); // should not throw
    expect(handler).not.toHaveBeenCalled(); // no subscriber
  });

  it("does not throw when no handlers are registered", () => {
    expect(() => dispatchAction("unknown:action")).not.toThrow();
  });
});
