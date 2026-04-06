import { useSetupRequirements } from "../../hooks/useSetupRequirements";
import { useSettingsList } from "../../hooks/useSettingsList";

interface Props {
  onBack: () => void;
  onComplete: () => void;
}

export function OnboardingReviewSummaryScreen({ onBack, onComplete }: Props) {
  const { data: requirements, isLoading: reqLoading } = useSetupRequirements();
  const { data: settings, isLoading: setLoading } = useSettingsList();

  const isLoading = reqLoading || setLoading;

  function getRequirementDetail(key: string): { status: string; detail: string } {
    if (!requirements?.requirements) return { status: "unknown", detail: "Bilinmiyor" };
    const req = requirements.requirements.find((r: { key: string }) => r.key === key);
    if (!req) return { status: "unknown", detail: "Bilinmiyor" };
    if (req.status === "completed" && req.detail) return { status: "ok", detail: req.detail };
    if (req.status === "completed") return { status: "ok", detail: "Tamamlandi" };
    return { status: "missing", detail: "Henüz yapilandirilmadi" };
  }

  function getProviderSummary(): { status: string; detail: string } {
    if (!settings) return { status: "unknown", detail: "Bilinmiyor" };
    const providerKeys = settings.filter(
      (s) => s.group_name === "providers" && s.status === "active" && s.admin_value_json !== "null"
    );
    if (providerKeys.length === 0) return { status: "missing", detail: "Henüz yapilandirilmadi" };
    const names = providerKeys.map((s) => s.key.replace(/_api_key$/, "").toUpperCase());
    return { status: "ok", detail: `${providerKeys.length} provider (${names.join(", ")})` };
  }

  function getWorkspaceSummary(): { status: string; detail: string } {
    if (!settings) return { status: "unknown", detail: "Bilinmiyor" };
    const wsSettings = settings.filter(
      (s) => s.group_name === "workspace" && s.status === "active" && s.admin_value_json !== "null"
    );
    if (wsSettings.length === 0) return { status: "missing", detail: "Henüz yapilandirilmadi" };
    const paths = wsSettings.map((s) => {
      try {
        return JSON.parse(s.admin_value_json);
      } catch {
        return s.admin_value_json;
      }
    });
    return { status: "ok", detail: paths.join(", ") };
  }

  const sources = getRequirementDetail("sources");
  const templates = getRequirementDetail("templates");
  const sysSettings = getRequirementDetail("settings");
  const providers = getProviderSummary();
  const workspace = getWorkspaceSummary();

  const summaryRows = [
    { label: "Haber Kaynaklari", ...sources },
    { label: "Sablonlar", ...templates },
    { label: "Sistem Ayarlari", ...sysSettings },
    { label: "Provider / API", ...providers },
    { label: "Calisma Alani", ...workspace },
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-neutral-50 to-border-subtle p-8">
        <div className="max-w-[560px] w-full bg-neutral-0 rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-10">
          <p className="text-center text-neutral-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-neutral-50 to-border-subtle p-8">
      <div className="max-w-[560px] w-full bg-neutral-0 rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-10">
        <h2 className="m-0 mb-1.5 text-2xl font-bold text-neutral-900 text-center">
          Kurulum Ozeti
        </h2>
        <p className="m-0 mb-7 text-lg text-neutral-700 leading-relaxed text-center">
          Onboarding sirasinda yaptiginiz yapilandirmalarin ozetini asagida
          gorebilirsiniz. Her sey hazirsa kurulumu tamamlayabilirsiniz.
        </p>

        <div className="mb-5">
          {summaryRows.map((row) => (
            <div key={row.label} className="flex justify-between items-center py-2.5 border-b border-neutral-100">
              <span className="text-md font-semibold text-neutral-800">{row.label}</span>
              <span
                className={`text-base text-right ${
                  row.status === "ok"
                    ? "text-success font-semibold"
                    : "text-neutral-500 font-medium"
                }`}
              >
                {row.detail}
              </span>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={onComplete}
            className="py-1.5 px-4 bg-brand-700 text-neutral-0 border-none rounded-sm cursor-pointer text-md"
          >
            Kurulumu Tamamla
          </button>
          <button
            type="button"
            onClick={onBack}
            className="py-1.5 px-4 bg-transparent text-neutral-600 border border-border rounded-sm cursor-pointer text-md"
          >
            Geri Don
          </button>
        </div>
      </div>
    </div>
  );
}
