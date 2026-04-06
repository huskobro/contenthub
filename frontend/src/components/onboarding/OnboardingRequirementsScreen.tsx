import { useSetupRequirements } from "../../hooks/useSetupRequirements";
import { useNavigate } from "react-router-dom";
import type { SetupRequirementItem } from "../../api/onboardingApi";
import { cn } from "../../lib/cn";

function RequirementRow({
  item,
  onAction,
  actionLabel,
}: {
  item: SetupRequirementItem;
  onAction?: () => void;
  actionLabel?: string;
}) {
  const isCompleted = item.status === "completed";
  return (
    <div
      className={cn(
        "flex items-center gap-3 py-3.5 px-4 rounded-lg border",
        isCompleted
          ? "bg-success-light border-success-light"
          : "bg-warning-light border-warning-light"
      )}
    >
      <div
        className={cn(
          "shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-base font-bold",
          isCompleted
            ? "bg-success-light text-success-text"
            : "bg-warning-light text-warning-text"
        )}
      >
        {isCompleted ? "\u2713" : "!"}
      </div>
      <div className="flex-1">
        <p className="m-0 text-md font-semibold text-neutral-900">{item.title}</p>
        <p className="mt-0.5 mb-0 text-base text-neutral-600 leading-snug">{item.description}</p>
        {isCompleted && item.detail && <p className="mt-1 mb-0 text-sm text-success-dark font-medium">{item.detail}</p>}
      </div>
      {!isCompleted && onAction && (
        <button
          className="py-1 px-2.5 text-sm font-semibold text-brand-700 bg-info-light border border-info-light rounded-sm cursor-pointer whitespace-nowrap shrink-0"
          onClick={onAction}
        >
          {actionLabel ?? "Ekle"}
        </button>
      )}
    </div>
  );
}

interface Props {
  onBack?: () => void;
  onSourceSetup?: () => void;
  onTemplateSetup?: () => void;
  onSettingsSetup?: () => void;
  onComplete?: () => void;
}

export function OnboardingRequirementsScreen({ onBack, onSourceSetup, onTemplateSetup, onSettingsSetup, onComplete }: Props) {
  const { data, isLoading, isError } = useSetupRequirements();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-neutral-50 to-border-subtle p-8">
        <div className="text-neutral-600 text-lg">Kontrol ediliyor...</div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-neutral-50 to-border-subtle p-8">
        <div className="max-w-[560px] w-full bg-neutral-0 rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-10">
          <h2 className="mb-1.5 text-2xl font-bold text-neutral-900 text-center">Bir Sorun Olustu</h2>
          <p className="mb-7 text-lg text-neutral-700 leading-relaxed text-center">Kurulum gereksinimleri kontrol edilemedi. Lutfen tekrar deneyin.</p>
          <button
            className="block w-full py-3 text-lg font-semibold text-neutral-0 bg-brand-600 border-none rounded-lg cursor-pointer text-center"
            onClick={() => navigate("/user")}
          >
            Uygulamaya Gec
          </button>
        </div>
      </div>
    );
  }

  const completedCount = data.requirements.filter((r) => r.status === "completed").length;
  const totalCount = data.requirements.length;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-neutral-50 to-border-subtle p-8">
      <div className="max-w-[560px] w-full bg-neutral-0 rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-10">
        <h2 className="mb-1.5 text-2xl font-bold text-neutral-900 text-center">Kurulum Durumu</h2>
        <p className="mb-7 text-lg text-neutral-700 leading-relaxed text-center">
          Sisteminizin hazir olabilmesi icin asagidaki gereksinimleri kontrol edin.
          {completedCount === totalCount
            ? " Tum gereksinimler karsilandi!"
            : ` ${completedCount}/${totalCount} tamamlandi.`}
        </p>

        <div className="flex flex-col gap-2.5 mb-7">
          {data.requirements.map((req) => {
            let onAction: (() => void) | undefined;
            let actionLabel: string | undefined;
            if (req.key === "sources") {
              onAction = onSourceSetup;
              actionLabel = "Kaynak Ekle";
            } else if (req.key === "templates") {
              onAction = onTemplateSetup;
              actionLabel = "Sablon Ekle";
            } else if (req.key === "settings") {
              onAction = onSettingsSetup;
              actionLabel = "Ayar Ekle";
            }
            return (
              <RequirementRow
                key={req.key}
                item={req}
                onAction={onAction}
                actionLabel={actionLabel}
              />
            );
          })}
        </div>

        {data.all_completed ? (
          <button
            className="block w-full py-3 text-lg font-semibold text-neutral-0 bg-brand-600 border-none rounded-lg cursor-pointer text-center"
            onClick={onComplete ?? (() => navigate("/user"))}
          >
            Kurulumu Tamamla
          </button>
        ) : (
          <button
            className="block w-full py-3 text-lg font-semibold text-neutral-0 bg-neutral-600 border-none rounded-lg cursor-pointer text-center"
            onClick={() => navigate("/user")}
          >
            Sonra Tamamla
          </button>
        )}

        {onBack && (
          <button
            className="block w-full py-2 text-base font-medium text-neutral-600 bg-transparent border border-border-subtle rounded-md cursor-pointer mt-2 text-center"
            onClick={onBack}
          >
            Geri Don
          </button>
        )}
      </div>
    </div>
  );
}
