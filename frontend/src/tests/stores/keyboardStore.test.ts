/**
 * keyboardStore tests — Wave 1
 */
import { describe, it, expect, beforeEach } from "vitest";
import { useKeyboardStore } from "../../stores/keyboardStore";

describe("keyboardStore", () => {
  beforeEach(() => {
    useKeyboardStore.setState({ scopeStack: [] });
  });

  it("starts with empty scope stack", () => {
    expect(useKeyboardStore.getState().scopeStack).toHaveLength(0);
  });

  it("pushScope adds a scope", () => {
    useKeyboardStore.getState().pushScope({ id: "table", label: "Table" });
    expect(useKeyboardStore.getState().scopeStack).toHaveLength(1);
  });

  it("pushScope deduplicates by id (moves to top)", () => {
    const { pushScope } = useKeyboardStore.getState();
    pushScope({ id: "a" });
    pushScope({ id: "b" });
    pushScope({ id: "a" }); // re-push
    const stack = useKeyboardStore.getState().scopeStack;
    expect(stack).toHaveLength(2);
    expect(stack[stack.length - 1].id).toBe("a");
  });

  it("popScope removes by id", () => {
    const { pushScope, popScope } = useKeyboardStore.getState();
    pushScope({ id: "a" });
    pushScope({ id: "b" });
    popScope("a");
    expect(useKeyboardStore.getState().scopeStack).toHaveLength(1);
    expect(useKeyboardStore.getState().scopeStack[0].id).toBe("b");
  });

  it("isActiveScope returns true for topmost", () => {
    const { pushScope, isActiveScope } = useKeyboardStore.getState();
    pushScope({ id: "a" });
    pushScope({ id: "b" });
    expect(isActiveScope("b")).toBe(true);
    expect(isActiveScope("a")).toBe(false);
  });

  it("activeScope returns topmost or null", () => {
    expect(useKeyboardStore.getState().activeScope()).toBeNull();
    useKeyboardStore.getState().pushScope({ id: "x" });
    expect(useKeyboardStore.getState().activeScope()?.id).toBe("x");
  });
});
