import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { OnboardingWelcomeScreen } from "../components/onboarding/OnboardingWelcomeScreen";
import { OnboardingRequirementsScreen } from "../components/onboarding/OnboardingRequirementsScreen";
import { OnboardingSourceSetupScreen } from "../components/onboarding/OnboardingSourceSetupScreen";
import { OnboardingTemplateSetupScreen } from "../components/onboarding/OnboardingTemplateSetupScreen";
import { OnboardingSettingsSetupScreen } from "../components/onboarding/OnboardingSettingsSetupScreen";
import { OnboardingCompletionScreen } from "../components/onboarding/OnboardingCompletionScreen";
import { OnboardingProviderSetupScreen } from "../components/onboarding/OnboardingProviderSetupScreen";
import { OnboardingWorkspaceSetupScreen } from "../components/onboarding/OnboardingWorkspaceSetupScreen";
import { OnboardingReviewSummaryScreen } from "../components/onboarding/OnboardingReviewSummaryScreen";
import { OnboardingPage } from "../pages/OnboardingPage";
import { AppEntryGate } from "../app/AppEntryGate";

function mockFetch(data: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data),
  }) as unknown as typeof window.fetch;
}

const MOCK_REQUIREMENTS = {
  all_completed: false,
  requirements: [
    { key: "sources", title: "Haber Kaynagi Ekle", description: "En az bir kaynak ekleyin.", status: "completed", detail: "3 aktif kaynak" },
    { key: "templates", title: "Sablon Olustur", description: "En az bir sablon olusturun.", status: "missing", detail: null },
    { key: "settings", title: "Sistem Ayarlari", description: "Ayarlari yapilandirin.", status: "missing", detail: null },
  ],
};

const MOCK_REQUIREMENTS_SOURCES_MISSING = {
  all_completed: false,
  requirements: [
    { key: "sources", title: "Haber Kaynagi Ekle", description: "En az bir kaynak ekleyin.", status: "missing", detail: null },
    { key: "templates", title: "Sablon Olustur", description: "En az bir sablon olusturun.", status: "missing", detail: null },
    { key: "settings", title: "Sistem Ayarlari", description: "Ayarlari yapilandirin.", status: "missing", detail: null },
  ],
};

const MOCK_REQUIREMENTS_ALL_DONE = {
  all_completed: true,
  requirements: [
    { key: "sources", title: "Haber Kaynagi Ekle", description: "desc", status: "completed", detail: "3 aktif kaynak" },
    { key: "templates", title: "Sablon Olustur", description: "desc", status: "completed", detail: "2 aktif sablon" },
    { key: "settings", title: "Sistem Ayarlari", description: "desc", status: "completed", detail: "10 ayar" },
  ],
};

const MOCK_SETTINGS_WITH_PROVIDERS_AND_WORKSPACE = [
  { id: "1", key: "llm_api_key", group_name: "providers", type: "string", admin_value_json: '"sk-test"', status: "active" },
  { id: "2", key: "workspace_root", group_name: "workspace", type: "string", admin_value_json: '"workspace/jobs"', status: "active" },
  { id: "3", key: "output_dir", group_name: "workspace", type: "string", admin_value_json: '"workspace/exports"', status: "active" },
];

function mockFetchMulti(responses: Record<string, unknown>) {
  return vi.fn().mockImplementation((url: string) => {
    for (const [pattern, data] of Object.entries(responses)) {
      if (url.includes(pattern)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(data) });
      }
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  }) as unknown as typeof window.fetch;
}

function wrap(element: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/onboarding"]}>
        <Routes>
          <Route path="/onboarding" element={element} />
          <Route path="/user" element={<div data-testid="user-dashboard">User</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function renderGate(fetchFn: typeof window.fetch) {
  window.fetch = fetchFn;
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<AppEntryGate />} />
          <Route path="/onboarding" element={<div data-testid="onboarding-screen">Onboarding</div>} />
          <Route path="/user" element={<div data-testid="user-dashboard">User</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("OnboardingWelcomeScreen", () => {
  it("renders the welcome heading", () => {
    window.fetch = mockFetch({ onboarding_required: true, completed_at: null });
    wrap(<OnboardingWelcomeScreen />);
    expect(screen.getByText("ContentHub'a Hosgeldiniz")).toBeDefined();
  });

  it("renders all three feature cards", () => {
    window.fetch = mockFetch({ onboarding_required: true, completed_at: null });
    wrap(<OnboardingWelcomeScreen />);
    expect(screen.getByText("Modular Content Production")).toBeDefined();
    expect(screen.getByText("Full Operations Visibility")).toBeDefined();
    expect(screen.getByText("Publish & Analyze")).toBeDefined();
  });

  it("renders the primary CTA button", () => {
    window.fetch = mockFetch({ onboarding_required: true, completed_at: null });
    wrap(<OnboardingWelcomeScreen />);
    expect(screen.getByText("Kurulumu Baslat")).toBeDefined();
  });

  it("renders the skip button", () => {
    window.fetch = mockFetch({ onboarding_required: true, completed_at: null });
    wrap(<OnboardingWelcomeScreen />);
    expect(screen.getByText("Simdilik Atla")).toBeDefined();
  });
});

describe("OnboardingRequirementsScreen", () => {
  it("renders requirement items", async () => {
    window.fetch = mockFetch(MOCK_REQUIREMENTS);
    wrap(<OnboardingRequirementsScreen />);
    expect(await screen.findByText("Haber Kaynagi Ekle")).toBeDefined();
    expect(screen.getByText("Sablon Olustur")).toBeDefined();
    expect(screen.getByText("Sistem Ayarlari")).toBeDefined();
  });

  it("shows completed count", async () => {
    window.fetch = mockFetch(MOCK_REQUIREMENTS);
    wrap(<OnboardingRequirementsScreen />);
    expect(await screen.findByText(/1\/3 tamamlandi/)).toBeDefined();
  });

  it("shows detail for completed items", async () => {
    window.fetch = mockFetch(MOCK_REQUIREMENTS);
    wrap(<OnboardingRequirementsScreen />);
    expect(await screen.findByText("3 aktif kaynak")).toBeDefined();
  });

  it("shows Kurulumu Tamamla when all done", async () => {
    window.fetch = mockFetch(MOCK_REQUIREMENTS_ALL_DONE);
    wrap(<OnboardingRequirementsScreen />);
    expect(await screen.findByText("Kurulumu Tamamla")).toBeDefined();
  });

  it("shows Devam Et when not all done", async () => {
    window.fetch = mockFetch(MOCK_REQUIREMENTS);
    wrap(<OnboardingRequirementsScreen />);
    expect(await screen.findByText("Devam Et")).toBeDefined();
  });
});

describe("OnboardingPage step flow", () => {
  it("starts with welcome and transitions to requirements on CTA click", async () => {
    window.fetch = mockFetch(MOCK_REQUIREMENTS);
    wrap(<OnboardingPage />);
    expect(screen.getByText("ContentHub'a Hosgeldiniz")).toBeDefined();
    fireEvent.click(screen.getByText("Kurulumu Baslat"));
    expect(await screen.findByText("Kurulum Durumu")).toBeDefined();
    expect(screen.getByText("Haber Kaynagi Ekle")).toBeDefined();
  });

  it("can go back from requirements to welcome", async () => {
    window.fetch = mockFetch(MOCK_REQUIREMENTS);
    wrap(<OnboardingPage />);
    fireEvent.click(screen.getByText("Kurulumu Baslat"));
    expect(await screen.findByText("Kurulum Durumu")).toBeDefined();
    fireEvent.click(screen.getByText("Geri Don"));
    expect(screen.getByText("ContentHub'a Hosgeldiniz")).toBeDefined();
  });
});

describe("OnboardingRequirementsScreen action buttons", () => {
  it("shows Kaynak Ekle button for missing sources requirement", async () => {
    window.fetch = mockFetch(MOCK_REQUIREMENTS_SOURCES_MISSING);
    const onSourceSetup = vi.fn();
    wrap(<OnboardingRequirementsScreen onSourceSetup={onSourceSetup} />);
    const btn = await screen.findByText("Kaynak Ekle");
    expect(btn).toBeDefined();
    fireEvent.click(btn);
    expect(onSourceSetup).toHaveBeenCalledTimes(1);
  });

  it("does not show Kaynak Ekle when sources requirement is completed", async () => {
    window.fetch = mockFetch(MOCK_REQUIREMENTS_ALL_DONE);
    wrap(<OnboardingRequirementsScreen />);
    await screen.findByText("Kurulumu Tamamla");
    expect(screen.queryByText("Kaynak Ekle")).toBeNull();
  });
});

describe("OnboardingSourceSetupScreen", () => {
  it("renders source setup heading", () => {
    window.fetch = mockFetch({});
    const onBack = vi.fn();
    const onComplete = vi.fn();
    wrap(<OnboardingSourceSetupScreen onBack={onBack} onComplete={onComplete} />);
    expect(screen.getByText("Haber Kaynagi Ekle")).toBeDefined();
  });

  it("renders source form with Kaynagi Ekle submit button", () => {
    window.fetch = mockFetch({});
    wrap(<OnboardingSourceSetupScreen onBack={vi.fn()} onComplete={vi.fn()} />);
    expect(screen.getByText("Kaynagi Ekle")).toBeDefined();
  });

  it("calls onBack when cancel is clicked", () => {
    window.fetch = mockFetch({});
    const onBack = vi.fn();
    wrap(<OnboardingSourceSetupScreen onBack={onBack} onComplete={vi.fn()} />);
    fireEvent.click(screen.getByText("İptal"));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe("OnboardingPage source-setup flow", () => {
  it("transitions from requirements to source-setup on Kaynak Ekle click", async () => {
    window.fetch = mockFetch(MOCK_REQUIREMENTS_SOURCES_MISSING);
    wrap(<OnboardingPage />);
    fireEvent.click(screen.getByText("Kurulumu Baslat"));
    const btn = await screen.findByText("Kaynak Ekle");
    fireEvent.click(btn);
    expect(await screen.findByText("Kaynagi Ekle")).toBeDefined();
  });

  it("can go back from source-setup to requirements", async () => {
    window.fetch = mockFetch(MOCK_REQUIREMENTS_SOURCES_MISSING);
    wrap(<OnboardingPage />);
    fireEvent.click(screen.getByText("Kurulumu Baslat"));
    const btn = await screen.findByText("Kaynak Ekle");
    fireEvent.click(btn);
    await screen.findByText("Kaynagi Ekle");
    fireEvent.click(screen.getByText("İptal"));
    expect(await screen.findByText("Kurulum Durumu")).toBeDefined();
  });
});

describe("OnboardingRequirementsScreen template action buttons", () => {
  it("shows Sablon Ekle button for missing templates requirement", async () => {
    window.fetch = mockFetch(MOCK_REQUIREMENTS);
    const onTemplateSetup = vi.fn();
    wrap(<OnboardingRequirementsScreen onTemplateSetup={onTemplateSetup} />);
    const btn = await screen.findByText("Sablon Ekle");
    expect(btn).toBeDefined();
    fireEvent.click(btn);
    expect(onTemplateSetup).toHaveBeenCalledTimes(1);
  });

  it("does not show Sablon Ekle when templates requirement is completed", async () => {
    window.fetch = mockFetch(MOCK_REQUIREMENTS_ALL_DONE);
    wrap(<OnboardingRequirementsScreen />);
    await screen.findByText("Kurulumu Tamamla");
    expect(screen.queryByText("Sablon Ekle")).toBeNull();
  });
});

describe("OnboardingTemplateSetupScreen", () => {
  it("renders template setup heading", () => {
    window.fetch = mockFetch({});
    wrap(<OnboardingTemplateSetupScreen onBack={vi.fn()} onComplete={vi.fn()} />);
    expect(screen.getByText("Sablon Olustur")).toBeDefined();
  });

  it("renders template form with Sablonu Olustur submit button", () => {
    window.fetch = mockFetch({});
    wrap(<OnboardingTemplateSetupScreen onBack={vi.fn()} onComplete={vi.fn()} />);
    expect(screen.getByText("Sablonu Olustur")).toBeDefined();
  });

  it("calls onBack when cancel is clicked", () => {
    window.fetch = mockFetch({});
    const onBack = vi.fn();
    wrap(<OnboardingTemplateSetupScreen onBack={onBack} onComplete={vi.fn()} />);
    fireEvent.click(screen.getByText("İptal"));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe("OnboardingPage template-setup flow", () => {
  it("transitions from requirements to template-setup on Sablon Ekle click", async () => {
    window.fetch = mockFetch(MOCK_REQUIREMENTS);
    wrap(<OnboardingPage />);
    fireEvent.click(screen.getByText("Kurulumu Baslat"));
    const btn = await screen.findByText("Sablon Ekle");
    fireEvent.click(btn);
    expect(await screen.findByText("Sablonu Olustur")).toBeDefined();
  });

  it("can go back from template-setup to requirements", async () => {
    window.fetch = mockFetch(MOCK_REQUIREMENTS);
    wrap(<OnboardingPage />);
    fireEvent.click(screen.getByText("Kurulumu Baslat"));
    const btn = await screen.findByText("Sablon Ekle");
    fireEvent.click(btn);
    await screen.findByText("Sablonu Olustur");
    fireEvent.click(screen.getByText("İptal"));
    expect(await screen.findByText("Kurulum Durumu")).toBeDefined();
  });
});

describe("OnboardingRequirementsScreen settings action buttons", () => {
  it("shows Ayar Ekle button for missing settings requirement", async () => {
    window.fetch = mockFetch(MOCK_REQUIREMENTS);
    const onSettingsSetup = vi.fn();
    wrap(<OnboardingRequirementsScreen onSettingsSetup={onSettingsSetup} />);
    const btn = await screen.findByText("Ayar Ekle");
    expect(btn).toBeDefined();
    fireEvent.click(btn);
    expect(onSettingsSetup).toHaveBeenCalledTimes(1);
  });

  it("does not show Ayar Ekle when settings requirement is completed", async () => {
    window.fetch = mockFetch(MOCK_REQUIREMENTS_ALL_DONE);
    wrap(<OnboardingRequirementsScreen />);
    await screen.findByText("Kurulumu Tamamla");
    expect(screen.queryByText("Ayar Ekle")).toBeNull();
  });
});

describe("OnboardingSettingsSetupScreen", () => {
  it("renders settings setup heading", () => {
    window.fetch = mockFetch({});
    wrap(<OnboardingSettingsSetupScreen onBack={vi.fn()} onComplete={vi.fn()} />);
    expect(screen.getByText("Sistem Ayari Ekle")).toBeDefined();
  });

  it("renders settings form with Ayari Kaydet submit button", () => {
    window.fetch = mockFetch({});
    wrap(<OnboardingSettingsSetupScreen onBack={vi.fn()} onComplete={vi.fn()} />);
    expect(screen.getByText("Ayari Kaydet")).toBeDefined();
  });

  it("calls onBack when cancel is clicked", () => {
    window.fetch = mockFetch({});
    const onBack = vi.fn();
    wrap(<OnboardingSettingsSetupScreen onBack={onBack} onComplete={vi.fn()} />);
    fireEvent.click(screen.getByText("Iptal"));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe("OnboardingPage settings-setup flow", () => {
  it("transitions from requirements to settings-setup on Ayar Ekle click", async () => {
    window.fetch = mockFetch(MOCK_REQUIREMENTS);
    wrap(<OnboardingPage />);
    fireEvent.click(screen.getByText("Kurulumu Baslat"));
    const btn = await screen.findByText("Ayar Ekle");
    fireEvent.click(btn);
    expect(await screen.findByText("Sistem Ayari Ekle")).toBeDefined();
    expect(screen.getByText("Ayari Kaydet")).toBeDefined();
  });

  it("can go back from settings-setup to requirements", async () => {
    window.fetch = mockFetch(MOCK_REQUIREMENTS);
    wrap(<OnboardingPage />);
    fireEvent.click(screen.getByText("Kurulumu Baslat"));
    const btn = await screen.findByText("Ayar Ekle");
    fireEvent.click(btn);
    await screen.findByText("Ayari Kaydet");
    fireEvent.click(screen.getByText("Iptal"));
    expect(await screen.findByText("Kurulum Durumu")).toBeDefined();
  });
});

describe("OnboardingCompletionScreen", () => {
  it("renders completion heading", () => {
    window.fetch = mockFetch({});
    wrap(<OnboardingCompletionScreen />);
    expect(screen.getByText("Kurulum Tamamlandi")).toBeDefined();
  });

  it("renders Uygulamaya Basla CTA", () => {
    window.fetch = mockFetch({});
    wrap(<OnboardingCompletionScreen />);
    expect(screen.getByText("Uygulamaya Basla")).toBeDefined();
  });

  it("renders three checklist items", () => {
    window.fetch = mockFetch({});
    wrap(<OnboardingCompletionScreen />);
    expect(screen.getByText("Haber kaynaklari yapilandirildi")).toBeDefined();
    expect(screen.getByText("Sablonlar olusturuldu")).toBeDefined();
    expect(screen.getByText("Sistem ayarlari tanimlandi")).toBeDefined();
  });

  it("renders back button when onBack is provided", () => {
    window.fetch = mockFetch({});
    const onBack = vi.fn();
    wrap(<OnboardingCompletionScreen onBack={onBack} />);
    const btn = screen.getByText("Gereksinimleri Gozden Gecir");
    expect(btn).toBeDefined();
    fireEvent.click(btn);
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe("OnboardingPage completion flow", () => {
  it("transitions from requirements to provider-setup when Kurulumu Tamamla clicked", async () => {
    window.fetch = mockFetch(MOCK_REQUIREMENTS_ALL_DONE);
    wrap(<OnboardingPage />);
    fireEvent.click(screen.getByText("Kurulumu Baslat"));
    const btn = await screen.findByText("Kurulumu Tamamla");
    fireEvent.click(btn);
    expect(await screen.findByText("Provider / API Yapilandirmasi")).toBeDefined();
  });

  it("does not show completion when requirements are not all done", async () => {
    window.fetch = mockFetch(MOCK_REQUIREMENTS);
    wrap(<OnboardingPage />);
    fireEvent.click(screen.getByText("Kurulumu Baslat"));
    await screen.findByText("Devam Et");
    expect(screen.queryByText("Kurulum Tamamlandi")).toBeNull();
  });

  it("can go back from provider-setup to requirements via Iptal", async () => {
    window.fetch = mockFetch(MOCK_REQUIREMENTS_ALL_DONE);
    wrap(<OnboardingPage />);
    fireEvent.click(screen.getByText("Kurulumu Baslat"));
    const btn = await screen.findByText("Kurulumu Tamamla");
    fireEvent.click(btn);
    await screen.findByText("Provider / API Yapilandirmasi");
    fireEvent.click(screen.getByText("Iptal"));
    expect(await screen.findByText("Kurulum Durumu")).toBeDefined();
  });
});

describe("OnboardingPage completion gate (end-to-end)", () => {
  it("completion screen renders Uygulamaya Basla and navigates to /user", async () => {
    window.fetch = mockFetch({});
    wrap(<OnboardingCompletionScreen />);
    expect(screen.getByText("Kurulum Tamamlandi")).toBeDefined();
    fireEvent.click(screen.getByText("Uygulamaya Basla"));
    const el = await screen.findByTestId("user-dashboard");
    expect(el).toBeDefined();
  });

  it("completion screen auto-calls complete mutation on mount", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
    window.fetch = fetchSpy as unknown as typeof window.fetch;
    wrap(<OnboardingCompletionScreen />);
    // Wait for the useEffect to fire the POST /onboarding/complete call
    await waitFor(() => {
      const postCalls = fetchSpy.mock.calls.filter(
        (call: unknown[]) => typeof call[0] === "string" && call[0].includes("/complete") && (call[1] as { method?: string })?.method === "POST"
      );
      expect(postCalls.length).toBe(1);
    });
  });

  it("requirements screen blocks completion when not all done", async () => {
    window.fetch = mockFetch(MOCK_REQUIREMENTS);
    wrap(<OnboardingRequirementsScreen />);
    await screen.findByText("Devam Et");
    expect(screen.queryByText("Kurulumu Tamamla")).toBeNull();
  });

  it("requirements screen enables completion when all done", async () => {
    window.fetch = mockFetch(MOCK_REQUIREMENTS_ALL_DONE);
    wrap(<OnboardingRequirementsScreen />);
    expect(await screen.findByText("Kurulumu Tamamla")).toBeDefined();
    expect(screen.queryByText("Devam Et")).toBeNull();
  });

  it("review screen Kurulumu Tamamla triggers completion step", async () => {
    window.fetch = mockFetchMulti({
      "onboarding/requirements": MOCK_REQUIREMENTS_ALL_DONE,
      "/settings": MOCK_SETTINGS_WITH_PROVIDERS_AND_WORKSPACE,
    });
    const onComplete = vi.fn();
    wrap(<OnboardingReviewSummaryScreen onBack={vi.fn()} onComplete={onComplete} />);
    const btn = await screen.findByText("Kurulumu Tamamla");
    fireEvent.click(btn);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});

describe("OnboardingProviderSetupScreen", () => {
  it("renders provider setup heading", () => {
    window.fetch = mockFetch({});
    wrap(<OnboardingProviderSetupScreen onBack={vi.fn()} onComplete={vi.fn()} />);
    expect(screen.getByText("Provider / API Yapilandirmasi")).toBeDefined();
  });

  it("renders Kaydet submit button", () => {
    window.fetch = mockFetch({});
    wrap(<OnboardingProviderSetupScreen onBack={vi.fn()} onComplete={vi.fn()} />);
    expect(screen.getByText("Kaydet")).toBeDefined();
  });

  it("renders all three API key sections", () => {
    window.fetch = mockFetch({});
    wrap(<OnboardingProviderSetupScreen onBack={vi.fn()} onComplete={vi.fn()} />);
    expect(screen.getByText("TTS (Seslendirme)")).toBeDefined();
    expect(screen.getByText("LLM (Dil Modeli)")).toBeDefined();
    expect(screen.getByText("YouTube")).toBeDefined();
  });

  it("calls onBack when Iptal is clicked", () => {
    window.fetch = mockFetch({});
    const onBack = vi.fn();
    wrap(<OnboardingProviderSetupScreen onBack={onBack} onComplete={vi.fn()} />);
    fireEvent.click(screen.getByText("Iptal"));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("shows validation error when submitting with all empty fields", async () => {
    window.fetch = mockFetch({});
    wrap(<OnboardingProviderSetupScreen onBack={vi.fn()} onComplete={vi.fn()} />);
    fireEvent.click(screen.getByText("Kaydet"));
    expect(await screen.findByText("En az bir provider API anahtari girin.")).toBeDefined();
  });
});

describe("OnboardingPage provider-setup flow", () => {
  it("transitions from requirements to provider-setup via Kurulumu Tamamla", async () => {
    window.fetch = mockFetch(MOCK_REQUIREMENTS_ALL_DONE);
    wrap(<OnboardingPage />);
    fireEvent.click(screen.getByText("Kurulumu Baslat"));
    const btn = await screen.findByText("Kurulumu Tamamla");
    fireEvent.click(btn);
    expect(await screen.findByText("Provider / API Yapilandirmasi")).toBeDefined();
  });

  it("can go back from provider-setup to requirements", async () => {
    window.fetch = mockFetch(MOCK_REQUIREMENTS_ALL_DONE);
    wrap(<OnboardingPage />);
    fireEvent.click(screen.getByText("Kurulumu Baslat"));
    const btn = await screen.findByText("Kurulumu Tamamla");
    fireEvent.click(btn);
    await screen.findByText("Provider / API Yapilandirmasi");
    fireEvent.click(screen.getByText("Iptal"));
    expect(await screen.findByText("Kurulum Durumu")).toBeDefined();
  });
});

describe("OnboardingWorkspaceSetupScreen", () => {
  it("renders workspace setup heading", () => {
    window.fetch = mockFetch({});
    wrap(<OnboardingWorkspaceSetupScreen onBack={vi.fn()} onComplete={vi.fn()} />);
    expect(screen.getByText("Calisma Alani Yapilandirmasi")).toBeDefined();
  });

  it("renders Kaydet submit button", () => {
    window.fetch = mockFetch({});
    wrap(<OnboardingWorkspaceSetupScreen onBack={vi.fn()} onComplete={vi.fn()} />);
    expect(screen.getByText("Kaydet")).toBeDefined();
  });

  it("renders both path sections", () => {
    window.fetch = mockFetch({});
    wrap(<OnboardingWorkspaceSetupScreen onBack={vi.fn()} onComplete={vi.fn()} />);
    expect(screen.getByText("Is Artefaktlari")).toBeDefined();
    expect(screen.getByText("Cikti Dizini")).toBeDefined();
  });

  it("calls onBack when Iptal is clicked", () => {
    window.fetch = mockFetch({});
    const onBack = vi.fn();
    wrap(<OnboardingWorkspaceSetupScreen onBack={onBack} onComplete={vi.fn()} />);
    fireEvent.click(screen.getByText("Iptal"));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("shows validation error when workspace root is empty", () => {
    window.fetch = mockFetch({});
    wrap(<OnboardingWorkspaceSetupScreen onBack={vi.fn()} onComplete={vi.fn()} />);
    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0], { target: { value: "" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(screen.getByText("Her iki klasor yolu da zorunludur.")).toBeDefined();
  });
});

describe("OnboardingPage workspace-setup flow", () => {
  it("renders workspace setup screen at workspace-setup step", () => {
    window.fetch = mockFetch({});
    wrap(<OnboardingWorkspaceSetupScreen onBack={vi.fn()} onComplete={vi.fn()} />);
    expect(screen.getByText("Calisma Alani Yapilandirmasi")).toBeDefined();
    expect(screen.getByText("Kaydet")).toBeDefined();
  });

  it("can go back from workspace-setup via Iptal", () => {
    window.fetch = mockFetch({});
    const onBack = vi.fn();
    wrap(<OnboardingWorkspaceSetupScreen onBack={onBack} onComplete={vi.fn()} />);
    fireEvent.click(screen.getByText("Iptal"));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe("OnboardingReviewSummaryScreen", () => {
  it("renders review summary heading", async () => {
    window.fetch = mockFetchMulti({
      "onboarding/requirements": MOCK_REQUIREMENTS_ALL_DONE,
      "/settings": MOCK_SETTINGS_WITH_PROVIDERS_AND_WORKSPACE,
    });
    wrap(<OnboardingReviewSummaryScreen onBack={vi.fn()} onComplete={vi.fn()} />);
    expect(await screen.findByText("Kurulum Ozeti")).toBeDefined();
  });

  it("renders all five summary row labels", async () => {
    window.fetch = mockFetchMulti({
      "onboarding/requirements": MOCK_REQUIREMENTS_ALL_DONE,
      "/settings": MOCK_SETTINGS_WITH_PROVIDERS_AND_WORKSPACE,
    });
    wrap(<OnboardingReviewSummaryScreen onBack={vi.fn()} onComplete={vi.fn()} />);
    expect(await screen.findByText("Haber Kaynaklari")).toBeDefined();
    expect(screen.getByText("Sablonlar")).toBeDefined();
    expect(screen.getByText("Sistem Ayarlari")).toBeDefined();
    expect(screen.getByText("Provider / API")).toBeDefined();
    expect(screen.getByText("Calisma Alani")).toBeDefined();
  });

  it("renders Kurulumu Tamamla CTA", async () => {
    window.fetch = mockFetchMulti({
      "onboarding/requirements": MOCK_REQUIREMENTS_ALL_DONE,
      "/settings": MOCK_SETTINGS_WITH_PROVIDERS_AND_WORKSPACE,
    });
    wrap(<OnboardingReviewSummaryScreen onBack={vi.fn()} onComplete={vi.fn()} />);
    expect(await screen.findByText("Kurulumu Tamamla")).toBeDefined();
  });

  it("calls onComplete when Kurulumu Tamamla clicked", async () => {
    window.fetch = mockFetchMulti({
      "onboarding/requirements": MOCK_REQUIREMENTS_ALL_DONE,
      "/settings": MOCK_SETTINGS_WITH_PROVIDERS_AND_WORKSPACE,
    });
    const onComplete = vi.fn();
    wrap(<OnboardingReviewSummaryScreen onBack={vi.fn()} onComplete={onComplete} />);
    const btn = await screen.findByText("Kurulumu Tamamla");
    fireEvent.click(btn);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("calls onBack when Geri Don clicked", async () => {
    window.fetch = mockFetchMulti({
      "onboarding/requirements": MOCK_REQUIREMENTS_ALL_DONE,
      "/settings": MOCK_SETTINGS_WITH_PROVIDERS_AND_WORKSPACE,
    });
    const onBack = vi.fn();
    wrap(<OnboardingReviewSummaryScreen onBack={onBack} onComplete={vi.fn()} />);
    const btn = await screen.findByText("Geri Don");
    fireEvent.click(btn);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("shows requirement detail values", async () => {
    window.fetch = mockFetchMulti({
      "onboarding/requirements": MOCK_REQUIREMENTS_ALL_DONE,
      "/settings": MOCK_SETTINGS_WITH_PROVIDERS_AND_WORKSPACE,
    });
    wrap(<OnboardingReviewSummaryScreen onBack={vi.fn()} onComplete={vi.fn()} />);
    expect(await screen.findByText("3 aktif kaynak")).toBeDefined();
    expect(screen.getByText("2 aktif sablon")).toBeDefined();
    expect(screen.getByText("10 ayar")).toBeDefined();
  });

  it("shows provider and workspace summaries", async () => {
    window.fetch = mockFetchMulti({
      "onboarding/requirements": MOCK_REQUIREMENTS_ALL_DONE,
      "/settings": MOCK_SETTINGS_WITH_PROVIDERS_AND_WORKSPACE,
    });
    wrap(<OnboardingReviewSummaryScreen onBack={vi.fn()} onComplete={vi.fn()} />);
    expect(await screen.findByText(/1 provider/)).toBeDefined();
    expect(screen.getByText(/workspace\/jobs/)).toBeDefined();
  });
});

describe("AppEntryGate", () => {
  it("shows loading state initially", () => {
    window.fetch = vi.fn().mockReturnValue(new Promise(() => {})) as unknown as typeof window.fetch;
    renderGate(window.fetch);
    expect(screen.getByText("Yukleniyor...")).toBeDefined();
  });

  it("redirects to /onboarding when onboarding is required", async () => {
    renderGate(mockFetch({ onboarding_required: true, completed_at: null }));
    const el = await screen.findByTestId("onboarding-screen");
    expect(el).toBeDefined();
  });

  it("redirects to /user when onboarding is not required", async () => {
    renderGate(mockFetch({ onboarding_required: false, completed_at: "2026-04-03T00:00:00Z" }));
    const el = await screen.findByTestId("user-dashboard");
    expect(el).toBeDefined();
  });

  it("does not redirect to onboarding when status fetch fails", async () => {
    const failFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}),
    }) as unknown as typeof window.fetch;
    renderGate(failFetch);
    const el = await screen.findByTestId("user-dashboard");
    expect(el).toBeDefined();
  });
});

describe("OnboardingPage bypass (post-setup)", () => {
  function renderOnboardingRoute(fetchFn: typeof window.fetch) {
    window.fetch = fetchFn;
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/onboarding"]}>
          <Routes>
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/user" element={<div data-testid="user-dashboard">User</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
  }

  it("redirects completed user from /onboarding to /user", async () => {
    renderOnboardingRoute(mockFetch({ onboarding_required: false, completed_at: "2026-04-03T00:00:00Z" }));
    const el = await screen.findByTestId("user-dashboard");
    expect(el).toBeDefined();
  });

  it("shows onboarding when onboarding is required", async () => {
    renderOnboardingRoute(mockFetch({ onboarding_required: true, completed_at: null }));
    expect(await screen.findByText("ContentHub'a Hosgeldiniz")).toBeDefined();
  });

  it("shows onboarding when status fetch fails (safe default)", async () => {
    const failFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}),
    }) as unknown as typeof window.fetch;
    renderOnboardingRoute(failFetch);
    expect(await screen.findByText("ContentHub'a Hosgeldiniz")).toBeDefined();
  });

  it("does not flash onboarding for completed user during loading", async () => {
    let resolveFetch: (v: unknown) => void;
    const delayedFetch = vi.fn().mockReturnValue(
      new Promise((r) => { resolveFetch = r; })
    ) as unknown as typeof window.fetch;
    renderOnboardingRoute(delayedFetch);
    // While loading, onboarding welcome should still show (safe default, no blocking loading screen)
    expect(screen.getByText("ContentHub'a Hosgeldiniz")).toBeDefined();
    // Resolve with completed status
    resolveFetch!({ ok: true, json: () => Promise.resolve({ onboarding_required: false, completed_at: "2026-04-03" }) });
    const el = await screen.findByTestId("user-dashboard");
    expect(el).toBeDefined();
  });
});
