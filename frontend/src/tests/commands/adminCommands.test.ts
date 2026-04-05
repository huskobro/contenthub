import { describe, it, expect, vi } from "vitest";
import { buildAdminNavigationCommands, buildAdminActionCommands } from "../../commands/adminCommands";

describe("buildAdminNavigationCommands", () => {
  const navigate = vi.fn();
  const commands = buildAdminNavigationCommands(navigate);

  it("returns commands for all admin pages", () => {
    expect(commands.length).toBeGreaterThanOrEqual(20);
  });

  it("all commands have unique ids", () => {
    const ids = commands.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all commands are navigation category", () => {
    expect(commands.every((c) => c.category === "navigation")).toBe(true);
  });

  it("all commands have label, icon, and action", () => {
    for (const cmd of commands) {
      expect(cmd.label).toBeTruthy();
      expect(cmd.icon).toBeTruthy();
      expect(typeof cmd.action).toBe("function");
    }
  });

  it("executing a command calls navigate with correct path", () => {
    const settingsCmd = commands.find((c) => c.id === "nav:admin-settings");
    expect(settingsCmd).toBeDefined();
    settingsCmd!.action();
    expect(navigate).toHaveBeenCalledWith("/admin/settings");
  });

  it("visibility-gated commands have visibilityKey", () => {
    const settingsCmd = commands.find((c) => c.id === "nav:admin-settings");
    expect(settingsCmd?.visibilityKey).toBe("panel:settings");

    const jobsCmd = commands.find((c) => c.id === "nav:admin-jobs");
    expect(jobsCmd?.visibilityKey).toBeUndefined();
  });
});

describe("buildAdminActionCommands", () => {
  const navigate = vi.fn();
  const commands = buildAdminActionCommands(navigate);

  it("returns action commands", () => {
    expect(commands.length).toBeGreaterThanOrEqual(5);
  });

  it("all commands are action category", () => {
    expect(commands.every((c) => c.category === "action")).toBe(true);
  });

  it("all commands have unique ids", () => {
    const ids = commands.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("executing create-standard-video navigates to /new", () => {
    const cmd = commands.find((c) => c.id === "action:create-standard-video");
    expect(cmd).toBeDefined();
    cmd!.action();
    expect(navigate).toHaveBeenCalledWith("/admin/standard-videos/new");
  });

  it("no id collision with navigation commands", () => {
    const navCmds = buildAdminNavigationCommands(navigate);
    const navIds = new Set(navCmds.map((c) => c.id));
    for (const cmd of commands) {
      expect(navIds.has(cmd.id)).toBe(false);
    }
  });
});
