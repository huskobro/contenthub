import { describe, it, expect, beforeEach, vi } from "vitest";
import { useCommandPaletteStore, filterCommands, type Command } from "../../stores/commandPaletteStore";

const mockAction = vi.fn();

function makeCmd(overrides: Partial<Command> = {}): Command {
  return {
    id: "test-cmd",
    label: "Test Command",
    category: "navigation",
    action: mockAction,
    ...overrides,
  };
}

describe("commandPaletteStore", () => {
  beforeEach(() => {
    mockAction.mockReset();
    useCommandPaletteStore.setState({
      isOpen: false,
      query: "",
      selectedIndex: 0,
      commands: [],
    });
  });

  it("starts closed", () => {
    expect(useCommandPaletteStore.getState().isOpen).toBe(false);
  });

  it("opens and resets query", () => {
    useCommandPaletteStore.getState().open();
    expect(useCommandPaletteStore.getState().isOpen).toBe(true);
    expect(useCommandPaletteStore.getState().query).toBe("");
    expect(useCommandPaletteStore.getState().selectedIndex).toBe(0);
  });

  it("closes and resets state", () => {
    useCommandPaletteStore.getState().open();
    useCommandPaletteStore.getState().setQuery("test");
    useCommandPaletteStore.getState().setSelectedIndex(3);
    useCommandPaletteStore.getState().close();
    expect(useCommandPaletteStore.getState().isOpen).toBe(false);
    expect(useCommandPaletteStore.getState().query).toBe("");
    expect(useCommandPaletteStore.getState().selectedIndex).toBe(0);
  });

  it("toggles open/close", () => {
    useCommandPaletteStore.getState().toggle();
    expect(useCommandPaletteStore.getState().isOpen).toBe(true);
    useCommandPaletteStore.getState().toggle();
    expect(useCommandPaletteStore.getState().isOpen).toBe(false);
  });

  it("registers commands", () => {
    const cmds = [makeCmd({ id: "a" }), makeCmd({ id: "b" })];
    useCommandPaletteStore.getState().registerCommands(cmds);
    expect(useCommandPaletteStore.getState().commands).toHaveLength(2);
  });

  it("does not duplicate on re-register (updates in place)", () => {
    useCommandPaletteStore.getState().registerCommands([makeCmd({ id: "a", label: "Old" })]);
    useCommandPaletteStore.getState().registerCommands([makeCmd({ id: "a", label: "New" })]);
    const cmds = useCommandPaletteStore.getState().commands;
    expect(cmds).toHaveLength(1);
    expect(cmds[0].label).toBe("New");
  });

  it("unregisters commands by id", () => {
    useCommandPaletteStore.getState().registerCommands([makeCmd({ id: "a" }), makeCmd({ id: "b" })]);
    useCommandPaletteStore.getState().unregisterCommands(["a"]);
    expect(useCommandPaletteStore.getState().commands).toHaveLength(1);
    expect(useCommandPaletteStore.getState().commands[0].id).toBe("b");
  });

  it("executes command by id", () => {
    useCommandPaletteStore.getState().registerCommands([makeCmd({ id: "x" })]);
    useCommandPaletteStore.getState().open();
    useCommandPaletteStore.getState().executeCommand("x");
    expect(mockAction).toHaveBeenCalledOnce();
    expect(useCommandPaletteStore.getState().isOpen).toBe(false);
  });

  it("executeSelected runs the selected command", () => {
    const action1 = vi.fn();
    const action2 = vi.fn();
    useCommandPaletteStore.getState().registerCommands([
      makeCmd({ id: "first", action: action1 }),
      makeCmd({ id: "second", action: action2 }),
    ]);
    useCommandPaletteStore.getState().open();
    useCommandPaletteStore.getState().setSelectedIndex(1);
    useCommandPaletteStore.getState().executeSelected();
    expect(action1).not.toHaveBeenCalled();
    expect(action2).toHaveBeenCalledOnce();
  });

  it("setQuery resets selectedIndex to 0", () => {
    useCommandPaletteStore.getState().setSelectedIndex(5);
    useCommandPaletteStore.getState().setQuery("something");
    expect(useCommandPaletteStore.getState().selectedIndex).toBe(0);
  });
});

describe("filterCommands", () => {
  const commands: Command[] = [
    makeCmd({ id: "nav-settings", label: "Ayarlar", keywords: ["settings", "config"] }),
    makeCmd({ id: "nav-jobs", label: "Isler", keywords: ["jobs", "queue"] }),
    makeCmd({ id: "nav-themes", label: "Tema Yonetimi", keywords: ["theme", "gorunum"] }),
    makeCmd({ id: "action-video", label: "Yeni Standart Video", category: "action", keywords: ["video", "create"] }),
  ];

  it("returns all commands when query is empty", () => {
    expect(filterCommands(commands, "")).toEqual(commands);
    expect(filterCommands(commands, "  ")).toEqual(commands);
  });

  it("filters by label match", () => {
    const result = filterCommands(commands, "ayar");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("nav-settings");
  });

  it("filters by keyword match", () => {
    const result = filterCommands(commands, "config");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("nav-settings");
  });

  it("supports multi-term search", () => {
    const result = filterCommands(commands, "yeni video");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("action-video");
  });

  it("is case insensitive", () => {
    const result = filterCommands(commands, "TEMA");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("nav-themes");
  });

  it("handles Turkish character normalization", () => {
    // "İşler" should match "isler" query
    const cmds = [makeCmd({ id: "t1", label: "İşler" })];
    const result = filterCommands(cmds, "isler");
    expect(result).toHaveLength(1);
  });

  it("returns empty array when nothing matches", () => {
    const result = filterCommands(commands, "nonexistent xyz");
    expect(result).toHaveLength(0);
  });
});
