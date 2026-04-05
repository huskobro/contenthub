/**
 * ConfirmAction component tests — Wave 1
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ConfirmAction } from "../../components/design-system/ConfirmAction";
import React from "react";

describe("ConfirmAction", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("shows initial label", () => {
    render(<ConfirmAction label="Sil" onConfirm={() => {}} testId="del" />);
    expect(screen.getByTestId("del").textContent).toBe("Sil");
  });

  it("shows confirm label after first click", () => {
    render(<ConfirmAction label="Sil" confirmLabel="Evet, Sil" onConfirm={() => {}} testId="del" />);
    fireEvent.click(screen.getByTestId("del"));
    expect(screen.getByTestId("del").textContent).toBe("Evet, Sil");
  });

  it("calls onConfirm on second click", () => {
    const onConfirm = vi.fn();
    render(<ConfirmAction label="Sil" confirmLabel="Evet, Sil" onConfirm={onConfirm} testId="del" />);
    fireEvent.click(screen.getByTestId("del"));
    fireEvent.click(screen.getByTestId("del"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("does NOT call onConfirm on first click", () => {
    const onConfirm = vi.fn();
    render(<ConfirmAction label="Sil" onConfirm={onConfirm} testId="del" />);
    fireEvent.click(screen.getByTestId("del"));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("resets to initial state after timeout", () => {
    render(<ConfirmAction label="Sil" confirmLabel="Evet" onConfirm={() => {}} resetTimeout={1000} testId="del" />);
    fireEvent.click(screen.getByTestId("del"));
    expect(screen.getByTestId("del").textContent).toBe("Evet");
    act(() => { vi.advanceTimersByTime(1100); });
    expect(screen.getByTestId("del").textContent).toBe("Sil");
  });

  it("disabled button does not trigger", () => {
    const onConfirm = vi.fn();
    render(<ConfirmAction label="Sil" onConfirm={onConfirm} disabled testId="del" />);
    fireEvent.click(screen.getByTestId("del"));
    fireEvent.click(screen.getByTestId("del"));
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
