/**
 * MyProjectsPage — Faz 4.
 *
 * User-facing content projects list with filters.
 *
 * Faz 3 (Canvas): trampoline — delegates to the Canvas workspace grid when
 * Canvas registers an override for `user.projects.list`, falls through to
 * the legacy data table otherwise.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import { useContentProjects } from "../../hooks/useContentProjects";
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
  { value: "standard_video", label: "Standart Video" },
  { value: "news_bulletin", label: "Haber Bülteni" },
  { value: "product_review", label: "Ürün İncelemesi" },
];

const CONTENT_STATUSES = [
  { value: "", label: "Tüm Durumlar" },
  { value: "draft", label: "Taslak" },
  { value: "in_progress", label: "Devam Ediyor" },
  { value: "completed", label: "Tamamlandı" },
  { value: "archived", label: "Arşivlendi" },
];

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
        <span className="text-sm text-neutral-600">{p.module_type}</span>
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
          onClick={() => navigate("/user/content")}
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
    </PageShell>
  );
}
