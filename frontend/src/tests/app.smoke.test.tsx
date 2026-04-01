import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import App from "../app/App";

describe("App smoke tests", () => {
  it("renders without crashing", () => {
    render(<App />);
    expect(screen.getByText("ContentHub")).toBeDefined();
  });

  it("shows user dashboard by default", () => {
    render(<App />);
    expect(screen.getByText("Dashboard")).toBeDefined();
  });

  it("switches to admin view", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Admin" }));
    expect(screen.getByText("Admin Overview")).toBeDefined();
  });
});
