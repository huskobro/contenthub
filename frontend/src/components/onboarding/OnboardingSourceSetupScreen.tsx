import { SourceForm } from "../sources/SourceForm";
import { useCreateSource } from "../../hooks/useCreateSource";
import { useQueryClient } from "@tanstack/react-query";
import type { SourceCreatePayload } from "../../api/sourcesApi";

interface Props {
  onBack: () => void;
  onComplete: () => void;
}

export function OnboardingSourceSetupScreen({ onBack, onComplete }: Props) {
  const createMutation = useCreateSource();
  const queryClient = useQueryClient();

  function handleSubmit(payload: SourceCreatePayload) {
    createMutation.mutate(payload, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["setup-requirements"] });
        onComplete();
      },
    });
  }

  const submitError = createMutation.isError
    ? (createMutation.error as Error).message
    : null;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-neutral-50 to-border-subtle p-8">
      <div className="max-w-[560px] w-full bg-neutral-0 rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-10">
        <h2 className="mb-1.5 text-2xl font-bold text-neutral-900 text-center">Haber Kaynagi Ekle</h2>
        <p className="mb-7 text-lg text-neutral-700 leading-relaxed text-center">
          Sisteminize en az bir haber kaynagi ekleyin. RSS, manuel URL veya API
          kaynaklarini kullanabilirsiniz.
        </p>
        <SourceForm
          onSubmit={handleSubmit}
          onCancel={onBack}
          isPending={createMutation.isPending}
          submitError={submitError}
          submitLabel="Kaynagi Ekle"
          cancelLabel="Geri Don"
        />
      </div>
    </div>
  );
}
