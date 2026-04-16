/**
 * MyProjectsPage — Faz 4.
 *
 * User-facing content projects list with filters.
 *
 * Faz 3 (Canvas): trampoline — delegates to the Canvas workspace grid when
 * Canvas registers an override for `user.projects.list`, falls through to
 * the legacy data table otherwise.
 *
 * PHASE AG: ContentProject artik modul-ustu konteyner.
 *   - "Yeni Proje" akisi modul secmiyor; backend default olarak "mixed" yazar.
 *   - Modul kolonu karma projeler icin "Karma", eski kayitlar icin "X (legacy)" gosterir.
 *   - Modul filtresi "Karma" secenegi ile zenginlestirildi.
 */

import { useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import {
  useContentProjects,
  useCreateContentProject,
} from "../../hooks/useContentProjects";
import { useChannelProfiles } from "../../hooks/useChannelProfiles";
import {
  PageShell,
  SectionShell,
  ActionButton,
  StatusBadge,
  FilterBar,
  FilterSelect,
  DataTable,
} from "../../components/design-system/primitives";
import type { ContentProjectResponse } from "../../api/contentProjectsApi";
import { useSurfacePageOverride } from "../../surfaces";

const MODULE_TYPES = [
  { value: "", label: "Tüm Modüller" },
  { value: "mixed", label: "Karma (modül-üstü)" },
  { value: "standard_video", label: "Standart Video (legacy)" },
  { value: "news_bulletin", label: "Haber Bülteni (legacy)" },
  { value: "product_review", label: "Ürün İncelemesi (legacy)" },
];

const CONTENT_STATUSES = [
  { value: "", label: "Tüm Durumlar" },
  { value: "draft", label: "Taslak" },
  { value: "in_progress", label: "Devam Ediyor" },
  { value: "completed", label: "Tamamlandı" },
  { value: "archived", label: "Arşivlendi" },
];

const LEGACY_MODULE_LABELS: Record<string, string> = {
  standard_video: "Standart Video",
  news_bulletin: "Haber Bülteni",
  product_review: "Ürün İncelemesi",
  educational_video: "Eğitim Videosu",
  howto_video: "Nasıl Yapılır",
};

function formatModuleCell(moduleType: string | null | undefined): string {
  if (!moduleType || moduleType === "mixed") return "Karma";
  const label = LEGACY_MODULE_LABELS[moduleType] ?? moduleType;
  return `${label} (legacy)`;
}

export function MyProjectsPage() {
  const Override = useSurfacePageOverride("user.projects.list");
  if (Override) return <Override />;
  return <LegacyMyProjectsPage />;
}

function LegacyMyProjectsPage() {
  const navigate = useNavigate();
  const authUser = useAuthStore((s) => s.user);
  const userId = authUser?.id;

  const [moduleFilter, setModuleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [channelFilter, setChannelFilter] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: channels } = useChannelProfiles(userId);

  const { data: projects, isLoading, isError } = useContentProjects({
    user_id: userId,
    module_type: moduleFilter || undefined,
    content_status: statusFilter || undefined,
    channel_profile_id: channelFilter || undefined,
  });

  const columns = [
    {
      key: "title",
      header: "Başlık",
      render: (p: ContentProjectResponse) => (
        <span className="font-medium text-neutral-800">{p.title}</span>
      ),
    },
    {
      key: "module_type",
      header: "Modül",
      render: (p: ContentProjectResponse) => (
        <span className="text-sm text-neutral-600">
          {formatModuleCell(p.module_type)}
        </span>
      ),
    },
    {
      key: "content_status",
      header: "Durum",
      render: (p: ContentProjectResponse) => (
        <StatusBadge status={p.content_status} size="sm" />
      ),
    },
    {
      key: "publish_status",
      header: "Yayın",
      render: (p: ContentProjectResponse) => (
        <StatusBadge status={p.publish_status} size="sm" />
      ),
    },
    {
      key: "created_at",
      header: "Oluşturma",
      render: (p: ContentProjectResponse) => (
        <span className="text-sm text-neutral-500 tabular-nums">
          {new Date(p.created_at).toLocaleDateString("tr-TR")}
        </span>
      ),
    },
  ];

  return (
    <PageShell
      title="Projelerim"
      subtitle="İçerik projelerinizi görüntüleyip yönetebilirsiniz"
      actions={
        <ActionButton
          variant="primary"
          onClick={() => setShowCreateModal(true)}
          data-testid="projects-create-button"
        >
          Yeni Proje
        </ActionButton>
      }
      testId="my-projects"
    >
      <FilterBar testId="projects-filters">
        <FilterSelect
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value)}
        >
          <option value="">Tüm Kanallar</option>
          {(channels ?? []).map((ch) => (
            <option key={ch.id} value={ch.id}>
              {ch.profile_name}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
        >
          {MODULE_TYPES.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {CONTENT_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </FilterSelect>
      </FilterBar>

      <SectionShell flush testId="projects-table">
        <DataTable
          columns={columns}
          data={projects ?? []}
          keyFn={(p) => p.id}
          onRowClick={(p) => navigate(`/user/projects/${p.id}`)}
          loading={isLoading}
          error={isError}
          emptyMessage="Henüz projeniz yok"
          testId="projects-data-table"
        />
      </SectionShell>

      {showCreateModal && userId && (
        <CreateProjectModal
          userId={userId}
          channels={channels ?? []}
          defaultChannelId={channelFilter || ""}
          onClose={() => setShowCreateModal(false)}
          onCreated={(id) => {
            setShowCreateModal(false);
            navigate(`/user/projects/${id}`);
          }}
        />
      )}
    </PageShell>
  );
}

// ---------------------------------------------------------------------------
// Create Project Modal — PHASE AG
//
// Modul secimi yok. Backend default olarak "mixed" atar. Olusturulduktan
// sonra kullanici proje detay sayfasindan istedigi modulun wizard'ini baslatir.
// ---------------------------------------------------------------------------

interface CreateProjectModalProps {
  userId: string;
  channels: Array<{ id: string; profile_name: string }>;
  defaultChannelId?: string;
  onClose: () => void;
  onCreated: (projectId: string) => void;
}

function CreateProjectModal({
  userId,
  channels,
  defaultChannelId,
  onClose,
  onCreated,
}: CreateProjectModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [channelId, setChannelId] = useState(defaultChannelId || "");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const createMutation = useCreateContentProject();

  const canSubmit = useMemo(
    () => title.trim().length > 0 && channelId.length > 0,
    [title, channelId],
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitError(null);
    try {
      const created = await createMutation.mutateAsync({
        user_id: userId,
        channel_profile_id: channelId,
        title: title.trim(),
        description: description.trim() || undefined,
        // PHASE AG: module_type gonderilmiyor — backend "mixed" atar.
      });
      onCreated(created.id);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Proje oluşturulamadı",
      );
    }
  }

  return (
    <div
      data-testid="create-project-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-neutral-800">
          Yeni Proje Oluştur
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Proje modül-üstü bir konteynerdır. Modül seçimini ilgili wizard
          başlatırken yaparsınız.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="project-title"
              className="block text-sm font-medium text-neutral-700"
            >
              Başlık <span className="text-red-600">*</span>
            </label>
            <input
              id="project-title"
              data-testid="create-project-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={300}
              required
              className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="project-channel"
              className="block text-sm font-medium text-neutral-700"
            >
              Kanal <span className="text-red-600">*</span>
            </label>
            <select
              id="project-channel"
              data-testid="create-project-channel"
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">-- Kanal seçin --</option>
              {channels.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.profile_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="project-description"
              className="block text-sm font-medium text-neutral-700"
            >
              Açıklama (opsiyonel)
            </label>
            <textarea
              id="project-description"
              data-testid="create-project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {submitError && (
            <div
              data-testid="create-project-error"
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {submitError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <ActionButton variant="ghost" onClick={onClose} type="button">
              Vazgeç
            </ActionButton>
            <ActionButton
              variant="primary"
              type="submit"
              disabled={!canSubmit || createMutation.isPending}
              data-testid="create-project-submit"
            >
              {createMutation.isPending ? "Oluşturuluyor..." : "Oluştur"}
            </ActionButton>
          </div>
        </form>
      </div>
    </div>
  );
}
