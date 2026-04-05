import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useSearchFocus } from "../../hooks/useSearchFocus";

describe("useSearchFocus", () => {
  let inputRef: { current: HTMLInputElement | null };

  beforeEach(() => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    inputRef = { current: input };
  });

  it("focuses input on / key", () => {
    renderHook(() => useSearchFocus(inputRef));
    const focusSpy = vi.spyOn(inputRef.current!, "focus");
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "/" }));
    expect(focusSpy).toHaveBeenCalled();
  });

  it("does not focus when disabled", () => {
    renderHook(() => useSearchFocus(inputRef, { enabled: false }));
    const focusSpy = vi.spyOn(inputRef.current!, "focus");
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "/" }));
    expect(focusSpy).not.toHaveBeenCalled();
  });

  it("does not focus when already in an input", () => {
    const otherInput = document.createElement("input");
    document.body.appendChild(otherInput);
    otherInput.focus();

    renderHook(() => useSearchFocus(inputRef));
    const focusSpy = vi.spyOn(inputRef.current!, "focus");
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "/" }));
    expect(focusSpy).not.toHaveBeenCalled();

    document.body.removeChild(otherInput);
  });

  it("does not focus on other keys", () => {
    renderHook(() => useSearchFocus(inputRef));
    const focusSpy = vi.spyOn(inputRef.current!, "focus");
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
    expect(focusSpy).not.toHaveBeenCalled();
  });
});
