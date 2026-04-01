import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { StandardVideoScriptPanel } from "../components/standard-video/StandardVideoScriptPanel";
import type { StandardVideoScriptResponse } from "../api/standardVideoApi";

const MOCK_SCRIPT: StandardVideoScriptResponse = {
  id: "script-1",
  standard_video_id: "sv-1",
  content: "Bu bir test script içeriğidir.",
  version: 1,
  source_type: "manual",
  generation_status: "draft",
  notes: null,
  created_at: "2026-04-01T10:00:00Z",
  updated_at: "2026-04-01T10:00:00Z",
};

const LONG_SCRIPT_CONTENT = "A".repeat(500);

const MOCK_LONG_SCRIPT: StandardVideoScriptResponse = {
  ...MOCK_SCRIPT,
  id: "script-long",
  content: LONG_SCRIPT_CONTENT,
};

function makeProps(overrides: Partial<Parameters<typeof StandardVideoScriptPanel>[0]> = {}) {
  return {
    videoId: "sv-1",
    isLoading: false,
    isError: false,
    script: null,
    onCreate: vi.fn(),
    onUpdate: vi.fn(),
    isCreating: false,
    isUpdating: false,
    createError: null,
    updateError: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("StandardVideoScriptPanel smoke tests", () => {
  it("shows empty state when no script", () => {
    render(<StandardVideoScriptPanel {...makeProps()} />);
    expect(screen.getByText("Henüz script yok.")).toBeDefined();
  });

  it("shows '+ Script Ekle' button when no script", () => {
    render(<StandardVideoScriptPanel {...makeProps()} />);
    expect(screen.getByRole("button", { name: "+ Script Ekle" })).toBeDefined();
  });

  it("opens create form when '+ Script Ekle' is clicked", async () => {
    const user = userEvent.setup();
    render(<StandardVideoScriptPanel {...makeProps()} />);
    await user.click(screen.getByRole("button", { name: "+ Script Ekle" }));
    expect(screen.getByText("Script Oluştur")).toBeDefined();
    expect(screen.getByRole("button", { name: "Oluştur" })).toBeDefined();
  });

  it("shows content validation error when submitting empty form", async () => {
    const user = userEvent.setup();
    render(<StandardVideoScriptPanel {...makeProps()} />);
    await user.click(screen.getByRole("button", { name: "+ Script Ekle" }));
    await user.click(screen.getByRole("button", { name: "Oluştur" }));
    await waitFor(() => {
      expect(screen.getByText("İçerik zorunludur.")).toBeDefined();
    });
  });

  it("calls onCreate when form is submitted with content", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    render(<StandardVideoScriptPanel {...makeProps({ onCreate })} />);
    await user.click(screen.getByRole("button", { name: "+ Script Ekle" }));
    await user.type(screen.getByPlaceholderText("Script içeriği..."), "Test script content");
    await user.click(screen.getByRole("button", { name: "Oluştur" }));
    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({ content: "Test script content" })
    );
  });

  it("cancel returns to view mode from create form", async () => {
    const user = userEvent.setup();
    render(<StandardVideoScriptPanel {...makeProps()} />);
    await user.click(screen.getByRole("button", { name: "+ Script Ekle" }));
    expect(screen.getByText("Script Oluştur")).toBeDefined();
    await user.click(screen.getByRole("button", { name: "İptal" }));
    expect(screen.getByText("Henüz script yok.")).toBeDefined();
  });

  it("shows script read mode when script exists", () => {
    render(<StandardVideoScriptPanel {...makeProps({ script: MOCK_SCRIPT })} />);
    expect(screen.getByText("Bu bir test script içeriğidir.")).toBeDefined();
    expect(screen.getByRole("button", { name: "Düzenle" })).toBeDefined();
  });

  it("shows script metadata in read mode", () => {
    render(<StandardVideoScriptPanel {...makeProps({ script: MOCK_SCRIPT })} />);
    expect(screen.getByText("1")).toBeDefined(); // version
    expect(screen.getByText("manual")).toBeDefined(); // source_type
    expect(screen.getByText("draft")).toBeDefined(); // generation_status
  });

  it("opens edit form pre-filled when Düzenle is clicked", async () => {
    const user = userEvent.setup();
    render(<StandardVideoScriptPanel {...makeProps({ script: MOCK_SCRIPT })} />);
    await user.click(screen.getByRole("button", { name: "Düzenle" }));
    expect(screen.getByText("Script Düzenle")).toBeDefined();
    const textarea = screen.getByPlaceholderText("Script içeriği...") as HTMLTextAreaElement;
    expect(textarea.value).toBe("Bu bir test script içeriğidir.");
  });

  it("calls onUpdate when edit form is submitted", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    render(<StandardVideoScriptPanel {...makeProps({ script: MOCK_SCRIPT, onUpdate })} />);
    await user.click(screen.getByRole("button", { name: "Düzenle" }));
    await user.click(screen.getByRole("button", { name: "Güncelle" }));
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ content: "Bu bir test script içeriğidir." })
    );
  });

  it("shows 'Tamamını göster' toggle for long scripts", () => {
    render(<StandardVideoScriptPanel {...makeProps({ script: MOCK_LONG_SCRIPT })} />);
    expect(screen.getByRole("button", { name: "Tamamını göster" })).toBeDefined();
  });

  it("shows loading state", () => {
    render(<StandardVideoScriptPanel {...makeProps({ isLoading: true })} />);
    expect(screen.getByText("Script yükleniyor...")).toBeDefined();
  });

  it("shows error state", () => {
    render(<StandardVideoScriptPanel {...makeProps({ isError: true })} />);
    expect(screen.getByText("Script yüklenirken hata oluştu.")).toBeDefined();
  });
});
