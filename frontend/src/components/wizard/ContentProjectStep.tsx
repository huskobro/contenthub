/**
 * ContentProjectStep — Faz 5D: Creates a ContentProject before wizard proceeds.
 *
 * After ChannelProfile is selected (Step 0), this step creates or resumes
 * a ContentProject. The project becomes the anchor for the entire wizard flow.
 */

import { useState, useEffect } from "react";
import { useCreateContentProject } from "../../hooks/useContentProjects";
import { useAuthStore } from "../../stores/authStore";
import { cn } from "../../lib/cn";

interface ContentProjectStepProps {
  channelProfileId: string;
  moduleType: string;
  /** If set, we're resuming an existing project — skip create. */
  existingProjectId?: string | null;
  onProjectReady: (projectId: string) => void;
  testId?: string;
}

const inputCls =
  "block w-full px-2 py-1.5 text-sm border border-border rounded-sm box-border focus:outline-none focus:ring-2 focus:ring-focus";

const MODULE_LABELS: Record<string, string> = {
  standard_video: "Standart Video",
  news_bulletin: "Haber Bulteni",
  product_review: "Urun Degerlendirme",
  educational_video: "Egitim Videosu",
  howto_video: "Nasil Yapilir Videosu",
};

export function ContentProjectStep({
  channelProfileId,
  moduleType,
  existingProjectId,
  onProjectReady,
  testId = "project-step",
}: ContentProjectStepProps) {
  const userId = useAuthStore((s) => s.user?.id);
  const createMut = useCreateContentProject();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // If resuming an existing project, signal ready immediately.
  useEffect(() => {
    if (existingProjectId) {
      onProjectReady(existingProjectId);
    }
  }, [existingProjectId, onProjectReady]);

  if (existingProjectId) {
    return (
      <div className="py-4 text-sm text-neutral-600" data-testid={testId}>
        Proje devam ettiriliyor...
      </div>
    );
  }

  async function handleCreate() {
    if (!userId || !title.trim()) return;
    try {
      const project = await createMut.mutateAsync({
        user_id: userId,
        channel_profile_id: channelProfileId,
        module_type: moduleType,
        title: title.trim(),
        description: description.trim() || undefined,
        content_status: "draft",
      });
      onProjectReady(project.id);
    } catch {
      /* error shown in UI */
    }
  }

  return (
    <div data-testid={testId}>
      <h3 className="m-0 mb-1 text-md font-semibold text-neutral-800">
        Proje Olustur
      </h3>
      <p className="m-0 mb-3 text-sm text-neutral-500">
        {MODULE_LABELS[moduleType] ?? moduleType} icin yeni bir proje baslatiliyor.
      </p>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Proje Basligi <span className="text-error-dark">*</span>
          </label>
          <input
            className={inputCls}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ornegin: Haftalik Teknoloji Ozeti #42"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Aciklama
          </label>
          <textarea
            className={cn(inputCls, "min-h-[48px] resize-y")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Kisa not (opsiyonel)"
          />
        </div>

        <button
          type="button"
          onClick={handleCreate}
          disabled={createMut.isPending || !title.trim()}
          className={cn(
            "px-5 py-1.5 text-sm font-medium text-white border-none rounded-sm",
            createMut.isPending || !title.trim()
              ? "bg-neutral-300 cursor-not-allowed"
              : "bg-brand-500 cursor-pointer hover:bg-brand-600 transition-colors",
          )}
          data-testid={`${testId}-create-btn`}
        >
          {createMut.isPending ? "Olusturuluyor..." : "Projeyi Baslat"}
        </button>

        {createMut.isError && (
          <p className="m-0 text-sm text-error-dark">
            {createMut.error instanceof Error
              ? createMut.error.message
              : "Proje olusturulamadi."}
          </p>
        )}
      </div>
    </div>
  );
}
