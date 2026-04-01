import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { StandardVideoMetadataPanel } from "../components/standard-video/StandardVideoMetadataPanel";
import type { StandardVideoMetadataResponse } from "../api/standardVideoApi";

const MOCK_METADATA: StandardVideoMetadataResponse = {
  id: "meta-1",
  standard_video_id: "sv-1",
  title: "Test Başlık",
  description: "Test açıklaması",
  tags_json: '["ai", "technology"]',
  category: "education",
  language: "tr",
  version: 1,
  source_type: "manual",
  generation_status: "draft",
  notes: null,
  created_at: "2026-04-01T10:00:00Z",
  updated_at: "2026-04-01T10:00:00Z",
};

function makeProps(overrides: Partial<Parameters<typeof StandardVideoMetadataPanel>[0]> = {}) {
  return {
    videoId: "sv-1",
    isLoading: false,
    isError: false,
    metadata: null,
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

describe("StandardVideoMetadataPanel smoke tests", () => {
  it("shows empty state when no metadata", () => {
    render(<StandardVideoMetadataPanel {...makeProps()} />);
    expect(screen.getByText("Henüz metadata yok.")).toBeDefined();
  });

  it("shows '+ Metadata Ekle' button when no metadata", () => {
    render(<StandardVideoMetadataPanel {...makeProps()} />);
    expect(screen.getByRole("button", { name: "+ Metadata Ekle" })).toBeDefined();
  });

  it("opens create form when '+ Metadata Ekle' is clicked", async () => {
    const user = userEvent.setup();
    render(<StandardVideoMetadataPanel {...makeProps()} />);
    await user.click(screen.getByRole("button", { name: "+ Metadata Ekle" }));
    expect(screen.getByText("Metadata Oluştur")).toBeDefined();
    expect(screen.getByRole("button", { name: "Oluştur" })).toBeDefined();
  });

  it("shows title validation error when submitting empty form", async () => {
    const user = userEvent.setup();
    render(<StandardVideoMetadataPanel {...makeProps()} />);
    await user.click(screen.getByRole("button", { name: "+ Metadata Ekle" }));
    await user.click(screen.getByRole("button", { name: "Oluştur" }));
    await waitFor(() => {
      expect(screen.getByText("Başlık zorunludur.")).toBeDefined();
    });
  });

  it("calls onCreate when form is submitted with title", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    render(<StandardVideoMetadataPanel {...makeProps({ onCreate })} />);
    await user.click(screen.getByRole("button", { name: "+ Metadata Ekle" }));
    await user.type(screen.getByPlaceholderText("Video başlığı"), "Test Video Title");
    await user.click(screen.getByRole("button", { name: "Oluştur" }));
    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Test Video Title" })
    );
  });

  it("cancel returns to view mode from create form", async () => {
    const user = userEvent.setup();
    render(<StandardVideoMetadataPanel {...makeProps()} />);
    await user.click(screen.getByRole("button", { name: "+ Metadata Ekle" }));
    expect(screen.getByText("Metadata Oluştur")).toBeDefined();
    await user.click(screen.getByRole("button", { name: "İptal" }));
    expect(screen.getByText("Henüz metadata yok.")).toBeDefined();
  });

  it("shows metadata read mode when metadata exists", () => {
    render(<StandardVideoMetadataPanel {...makeProps({ metadata: MOCK_METADATA })} />);
    expect(screen.getByText("Test Başlık")).toBeDefined();
    expect(screen.getByRole("button", { name: "Düzenle" })).toBeDefined();
  });

  it("shows tags in read mode", () => {
    render(<StandardVideoMetadataPanel {...makeProps({ metadata: MOCK_METADATA })} />);
    expect(screen.getByText("ai")).toBeDefined();
    expect(screen.getByText("technology")).toBeDefined();
  });

  it("opens edit form pre-filled when Düzenle is clicked", async () => {
    const user = userEvent.setup();
    render(<StandardVideoMetadataPanel {...makeProps({ metadata: MOCK_METADATA })} />);
    await user.click(screen.getByRole("button", { name: "Düzenle" }));
    expect(screen.getByText("Metadata Düzenle")).toBeDefined();
    const titleInput = screen.getByPlaceholderText("Video başlığı") as HTMLInputElement;
    expect(titleInput.value).toBe("Test Başlık");
  });

  it("calls onUpdate when edit form is submitted", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    render(<StandardVideoMetadataPanel {...makeProps({ metadata: MOCK_METADATA, onUpdate })} />);
    await user.click(screen.getByRole("button", { name: "Düzenle" }));
    await user.click(screen.getByRole("button", { name: "Güncelle" }));
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Test Başlık" })
    );
  });

  it("shows loading state", () => {
    render(<StandardVideoMetadataPanel {...makeProps({ isLoading: true })} />);
    expect(screen.getByText("Metadata yükleniyor...")).toBeDefined();
  });

  it("shows error state", () => {
    render(<StandardVideoMetadataPanel {...makeProps({ isError: true })} />);
    expect(screen.getByText("Metadata yüklenirken hata oluştu.")).toBeDefined();
  });
});
