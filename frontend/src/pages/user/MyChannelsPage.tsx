/**
 * MyChannelsPage — Faz 4.
 *
 * User-facing channel profiles list with create form.
 *
 * Faz 3A (Canvas): trampoline — delegates to the Canvas channel studio
 * when Canvas registers an override for `user.channels.list`, falls
 * through to the legacy grid + form otherwise.
 */

import { useState } from "react";
import { useSurfacePageOverride } from "../../surfaces";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import {
  useChannelProfiles,
  useCreateChannelProfile,
  useCreateChannelProfileFromURL,
  useDeleteChannelProfile,
} from "../../hooks/useChannelProfiles";
import {
  PageShell,
  SectionShell,
  ActionButton,
  StatusBadge,
  FilterInput,
} from "../../components/design-system/primitives";
import { EmptyState } from "../../components/design-system/EmptyState";
import { SkeletonTable } from "../../components/design-system/Skeleton";
import { cn } from "../../lib/cn";

// PHASE AE: honest partial state labels for URL-only onboarding.
// `partial` = channel row exists but metadata fetch incomplete; user should
// know so they can reimport or edit manually instead of assuming success.
const IMPORT_STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending: {
    label: "Meta veri bekleniyor",
    className: "bg-neutral-50 text-neutral-600 border-neutral-200",
  },
  success: {
    label: "Otomatik yuklendi",
    className: "bg-success-50 text-success-700 border-success-200",
  },
  partial: {
    label: "Kismi yuklendi — duzenleyin",
    className: "bg-warning-50 text-warning-800 border-warning-200",
  },
  failed: {
    label: "Yukleme basarisiz — yeniden deneyin",
    className: "bg-error-50 text-error-700 border-error-200",
  },
};

export function MyChannelsPage() {
  const Override = useSurfacePageOverride("user.channels.list");
  if (Override) return <Override />;
  return <LegacyMyChannelsPage />;
}

function LegacyMyChannelsPage() {
  const navigate = useNavigate();
  const authUser = useAuthStore((s) => s.user);
  const userId = authUser?.id;

  const { data: channels, isLoading } = useChannelProfiles(userId);
  const createMutation = useCreateChannelProfile();
  const createFromURLMutation = useCreateChannelProfileFromURL();
  const deleteMutation = useDeleteChannelProfile();

  function handleDelete(e: React.MouseEvent, channelId: string, name: string) {
    e.stopPropagation();
    if (
      !window.confirm(
        `"${name}" kanalini silmek istediginize emin misiniz? Kanal arsivlenecek (soft delete); gecmis isler ve publish kayitlari korunur.`,
      )
    ) {
      return;
    }
    deleteMutation.mutate(channelId);
  }

  const [showCreate, setShowCreate] = useState(false);
  // PHASE AE: URL-only mode is the default; advanced mode is hidden behind a
  // disclosure link to keep the primary flow one-decision simple.
  const [createMode, setCreateMode] = useState<"url" | "advanced">("url");
  const [showAdvancedToggle, setShowAdvancedToggle] = useState(false);

  // URL-only form state
  const [sourceUrl, setSourceUrl] = useState("");
  const [urlLanguage, setUrlLanguage] = useState("tr");

  // Advanced (legacy) form state
  const [profileName, setProfileName] = useState("");
  const [channelSlug, setChannelSlug] = useState("");
  const [defaultLanguage, setDefaultLanguage] = useState("tr");

  const [createError, setCreateError] = useState<string | null>(null);

  function resetForm() {
    setSourceUrl("");
    setUrlLanguage("tr");
    setProfileName("");
    setChannelSlug("");
    setDefaultLanguage("tr");
    setCreateError(null);
  }

  async function handleCreateFromURL(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setCreateError(null);
    try {
      await createFromURLMutation.mutateAsync({
        source_url: sourceUrl.trim(),
        default_language: urlLanguage || undefined,
      });
      setShowCreate(false);
      resetForm();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Kanal olusturulamadi");
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setCreateError(null);

    try {
      await createMutation.mutateAsync({
        user_id: userId,
        profile_name: profileName,
        channel_slug: channelSlug,
        default_language: defaultLanguage,
      });
      setShowCreate(false);
      resetForm();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Olusturulamadi");
    }
  }

  return (
    <PageShell
      title="Kanallarim"
      subtitle="Kanal profillerinizi yonetin"
      actions={
        <ActionButton variant="primary" onClick={() => setShowCreate(true)}>
          Kanal Olustur
        </ActionButton>
      }
      testId="my-channels"
    >
      {/* Create modal/form — PHASE AE: URL-only is the primary flow, advanced
          is a disclosure link to keep the common path clean. */}
      {showCreate && (
        <SectionShell title="Yeni Kanal" testId="create-channel-form">
          <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
            <p className="m-0 text-xs text-neutral-500">
              Kanal URL'sini yapistirin — sistem platform, baslik ve avatar'i otomatik ceker.
            </p>
            {showAdvancedToggle || createMode === "advanced" ? (
              <div className="flex gap-2">
                <ActionButton
                  type="button"
                  variant={createMode === "url" ? "primary" : "ghost"}
                  onClick={() => {
                    setCreateMode("url");
                    setCreateError(null);
                  }}
                  data-testid="create-mode-url"
                >
                  URL ile
                </ActionButton>
                <ActionButton
                  type="button"
                  variant={createMode === "advanced" ? "primary" : "ghost"}
                  onClick={() => {
                    setCreateMode("advanced");
                    setCreateError(null);
                  }}
                  data-testid="create-mode-advanced"
                >
                  Gelismis
                </ActionButton>
              </div>
            ) : (
              <button
                type="button"
                className="text-xs text-neutral-500 hover:text-brand-600 underline bg-transparent border-none p-0 cursor-pointer"
                onClick={() => setShowAdvancedToggle(true)}
                data-testid="create-mode-show-advanced"
              >
                URL yok, elle girmek istiyorum
              </button>
            )}
          </div>

          {createMode === "url" ? (
            <form
              onSubmit={handleCreateFromURL}
              className="space-y-3 max-w-[560px]"
              data-testid="create-channel-form-url"
            >
              {createError && (
                <div className="py-2 px-3 rounded-lg text-sm bg-error-light text-error-text border border-error/20">
                  {createError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Kanal URL
                </label>
                <FilterInput
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://www.youtube.com/@kanalim"
                  required
                  className="w-full"
                  data-testid="create-channel-source-url"
                />
                <p className="mt-1 text-xs text-neutral-500">
                  Platform (YouTube, Instagram vb.), kullanici adi, avatar ve
                  kanal adi URL'den otomatik cekilir. Cekilemezse kayit "baslik
                  alinamadi" durumunda acilir; sonradan duzenleyebilirsiniz.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Varsayilan Dil
                </label>
                <FilterInput
                  value={urlLanguage}
                  onChange={(e) => setUrlLanguage(e.target.value)}
                  placeholder="tr"
                  className="w-full"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <ActionButton
                  type="submit"
                  variant="primary"
                  loading={createFromURLMutation.isPending}
                  data-testid="create-channel-submit-url"
                >
                  Kanali Ekle
                </ActionButton>
                <ActionButton
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowCreate(false);
                    resetForm();
                  }}
                >
                  Iptal
                </ActionButton>
              </div>
            </form>
          ) : (
            <form
              onSubmit={handleCreate}
              className="space-y-3 max-w-[480px]"
              data-testid="create-channel-form-advanced"
            >
              {createError && (
                <div className="py-2 px-3 rounded-lg text-sm bg-error-light text-error-text border border-error/20">
                  {createError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Kanal Adi
                </label>
                <FilterInput
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="Ornek: Ana YouTube Kanali"
                  required
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Kanal Slug
                </label>
                <FilterInput
                  value={channelSlug}
                  onChange={(e) => setChannelSlug(e.target.value)}
                  placeholder="ornek: ana-youtube"
                  required
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Varsayilan Dil
                </label>
                <FilterInput
                  value={defaultLanguage}
                  onChange={(e) => setDefaultLanguage(e.target.value)}
                  placeholder="tr"
                  className="w-full"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <ActionButton
                  type="submit"
                  variant="primary"
                  loading={createMutation.isPending}
                >
                  Olustur
                </ActionButton>
                <ActionButton
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowCreate(false);
                    resetForm();
                  }}
                >
                  Iptal
                </ActionButton>
              </div>
            </form>
          )}
        </SectionShell>
      )}

      {/* Channel cards */}
      <SectionShell flush testId="channels-list">
        {isLoading ? (
          <SkeletonTable columns={3} rows={3} />
        ) : (channels ?? []).length === 0 ? (
          <EmptyState
            illustration="no-sources"
            title="Henuz kanaliniz yok"
            description="Bir kanal ekleyerek icerik yayinlamaya baslayabilirsiniz."
            action={{
              label: "Kanal Olustur",
              onClick: () => setShowCreate(true),
              variant: "primary",
            }}
          />
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4 p-4">
            {(channels ?? []).map((ch) => {
              const importStatus = ch.import_status ?? null;
              const importBadge = importStatus
                ? IMPORT_STATUS_BADGE[importStatus] ?? null
                : null;
              return (
                <div
                  key={ch.id}
                  className={cn(
                    "border border-border-subtle rounded-lg p-5 bg-surface-card",
                    "hover:border-brand-400 hover:shadow-md cursor-pointer transition-all duration-fast",
                  )}
                  onClick={() => navigate(`/user/channels/${ch.id}`)}
                  data-testid={`channel-card-${ch.id}`}
                >
                  <div className="flex items-center justify-between mb-3 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {ch.avatar_url ? (
                        <img
                          src={ch.avatar_url}
                          alt=""
                          className="w-8 h-8 rounded-full border border-border-subtle shrink-0 object-cover"
                        />
                      ) : null}
                      <h3 className="m-0 text-base font-semibold text-neutral-800 truncate">
                        {ch.title || ch.profile_name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={ch.status} size="sm" />
                      {ch.status !== "archived" && (
                        <button
                          type="button"
                          onClick={(e) => handleDelete(e, ch.id, ch.profile_name)}
                          disabled={deleteMutation.isPending}
                          className={cn(
                            "px-2 py-1 text-xs rounded-sm border",
                            deleteMutation.isPending
                              ? "bg-neutral-100 text-neutral-400 border-neutral-200 cursor-not-allowed"
                              : "bg-white text-error border-error/40 hover:bg-error-light cursor-pointer",
                          )}
                          data-testid="channel-card-delete"
                          aria-label={`${ch.profile_name} kanalini sil`}
                        >
                          Sil
                        </button>
                      )}
                    </div>
                  </div>

                  {/* PHASE AE: honest import state — user sees that auto-fetch
                      was partial and can click through to reimport. */}
                  {importBadge && (
                    <p
                      className={cn(
                        "m-0 mb-2 inline-block text-[11px] px-1.5 py-0.5 rounded border",
                        importBadge.className,
                      )}
                      data-testid={`channel-card-import-status-${ch.id}`}
                      title={ch.import_error ?? undefined}
                    >
                      {importBadge.label}
                    </p>
                  )}

                  <div className="space-y-1 text-sm text-neutral-500">
                    {ch.platform && (
                      <p className="m-0">
                        <span className="text-neutral-600 font-medium">Platform:</span>{" "}
                        {ch.platform}
                      </p>
                    )}
                    {ch.handle && (
                      <p className="m-0">
                        <span className="text-neutral-600 font-medium">Kullanici:</span>{" "}
                        {ch.handle}
                      </p>
                    )}
                    <p className="m-0">
                      <span className="text-neutral-600 font-medium">Slug:</span>{" "}
                      {ch.channel_slug}
                    </p>
                    <p className="m-0">
                      <span className="text-neutral-600 font-medium">Dil:</span>{" "}
                      {ch.default_language}
                    </p>
                  </div>
                  <p className="m-0 mt-3 text-xs text-neutral-400">
                    Olusturulma: {new Date(ch.created_at).toLocaleDateString("tr-TR")}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </SectionShell>
    </PageShell>
  );
}
