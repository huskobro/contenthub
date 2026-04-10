/**
 * CanvasMyChannelsPage — Faz 3A.
 *
 * Canvas override for `user.channels.list`. Replaces the legacy "card grid
 * on top of a form" layout with a workspace-style channel studio:
 *
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │ Hero: "Kanal Studyom" + create CTA                           │
 *   ├──────────────────────────────────────────────────────────────┤
 *   │ Stats ribbon (toplam / aktif / dil cesitliligi)              │
 *   ├──────────────────────────────────────────────────────────────┤
 *   │ Channel grid (workspace cards)                               │
 *   └──────────────────────────────────────────────────────────────┘
 *
 * The create form is moved into a slide-in panel at the top of the grid so
 * the main workspace stays project-centric: creating a channel feels like
 * opening a sub-drawer, not landing in a different page.
 *
 * Data contract
 * -------------
 *   - useChannelProfiles(userId) + useCreateChannelProfile — identical to
 *     legacy. No new endpoints.
 *   - Hooks into `useContentProjects` only to display "this channel has N
 *     projects" footnotes — no filtering happens server side.
 *
 * Canvas never pretends to know channel analytics; the ribbon only shows
 * what the existing endpoints already return.
 */

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import {
  useChannelProfiles,
  useCreateChannelProfile,
} from "../../hooks/useChannelProfiles";
import { useContentProjects } from "../../hooks/useContentProjects";
import { StatusBadge } from "../../components/design-system/primitives";
import { cn } from "../../lib/cn";

export function CanvasMyChannelsPage() {
  const navigate = useNavigate();
  const authUser = useAuthStore((s) => s.user);
  const userId = authUser?.id;

  const { data: channels, isLoading } = useChannelProfiles(userId);
  const { data: projects } = useContentProjects(
    userId ? { user_id: userId, limit: 200 } : undefined,
  );
  const createMutation = useCreateChannelProfile();

  const [showCreate, setShowCreate] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [channelSlug, setChannelSlug] = useState("");
  const [defaultLanguage, setDefaultLanguage] = useState("tr");
  const [createError, setCreateError] = useState<string | null>(null);

  const rows = useMemo(() => channels ?? [], [channels]);

  const projectCountByChannel = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of projects ?? []) {
      const cid = p.channel_profile_id;
      if (!cid) continue;
      map.set(cid, (map.get(cid) ?? 0) + 1);
    }
    return map;
  }, [projects]);

  const stats = useMemo(() => {
    const langs = new Set(rows.map((r) => r.default_language).filter(Boolean));
    const active = rows.filter((r) => r.status === "active").length;
    return {
      total: rows.length,
      active,
      languages: langs.size,
    };
  }, [rows]);

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
      setProfileName("");
      setChannelSlug("");
      setDefaultLanguage("tr");
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Olusturulamadi");
    }
  }

  return (
    <div
      className="flex flex-col gap-5 max-w-[1280px]"
      data-testid="canvas-my-channels"
    >
      {/* Hero ------------------------------------------------------------- */}
      <section
        className={cn(
          "rounded-xl border border-border-subtle bg-surface-card shadow-sm",
          "px-6 py-5 flex items-start gap-5",
        )}
        data-testid="canvas-channels-hero"
      >
        <div className="flex-1 min-w-0">
          <p className="m-0 text-[10px] font-semibold uppercase tracking-wider text-brand-600">
            Canvas Workspace &middot; Dagitim
          </p>
          <h1 className="m-0 mt-1 text-xl font-semibold text-neutral-900">
            Kanal Studyom
          </h1>
          <p className="m-0 mt-1 text-sm text-neutral-500">
            Her kanal projelerinin yayinlandigi bir dagitim agzi. Kanal
            olustur, detay sayfasindan platform baglantilarini yonet.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((s) => !s)}
          className={cn(
            "shrink-0 px-4 py-2 rounded-md text-sm font-semibold",
            "bg-brand-600 text-white hover:bg-brand-700 transition-colors",
          )}
          data-testid="canvas-channels-create-toggle"
        >
          {showCreate ? "Iptal" : "+ Kanal Olustur"}
        </button>
      </section>

      {/* Stats ribbon ----------------------------------------------------- */}
      <div
        className="grid grid-cols-2 sm:grid-cols-3 gap-2"
        data-testid="canvas-channels-stats"
      >
        <ChannelStatTile label="Toplam Kanal" value={stats.total} />
        <ChannelStatTile label="Aktif" value={stats.active} />
        <ChannelStatTile label="Farkli Dil" value={stats.languages} />
      </div>

      {/* Inline create drawer -------------------------------------------- */}
      {showCreate ? (
        <section
          className="rounded-xl border border-border-subtle bg-surface-card shadow-sm overflow-hidden"
          data-testid="canvas-channels-create-panel"
        >
          <header className="px-5 py-3 border-b border-border-subtle bg-neutral-50/50">
            <p className="m-0 text-sm font-semibold text-neutral-800">
              Yeni Kanal
            </p>
            <p className="m-0 mt-0.5 text-xs text-neutral-500">
              Kanal, projelerin platform baglantilarina gruplanir.
            </p>
          </header>
          <form onSubmit={handleCreate} className="px-5 py-4 flex flex-col gap-3">
            {createError ? (
              <div
                className="rounded-md border border-error-base/30 bg-error-light/30 px-3 py-2 text-xs text-error-dark"
                data-testid="canvas-channels-create-error"
              >
                {createError}
              </div>
            ) : null}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-1">
                  Kanal Adi
                </label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  required
                  placeholder="Ornek: Ana YouTube Kanali"
                  className={cn(
                    "w-full px-3 py-2 text-sm rounded-md",
                    "border border-border-subtle bg-surface-card",
                    "focus:outline-none focus:border-brand-400",
                  )}
                  data-testid="canvas-channels-name-input"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-1">
                  Kanal Slug
                </label>
                <input
                  type="text"
                  value={channelSlug}
                  onChange={(e) => setChannelSlug(e.target.value)}
                  required
                  placeholder="ornek-kanal"
                  className={cn(
                    "w-full px-3 py-2 text-sm rounded-md",
                    "border border-border-subtle bg-surface-card",
                    "focus:outline-none focus:border-brand-400",
                  )}
                  data-testid="canvas-channels-slug-input"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-1">
                  Varsayilan Dil
                </label>
                <input
                  type="text"
                  value={defaultLanguage}
                  onChange={(e) => setDefaultLanguage(e.target.value)}
                  placeholder="tr"
                  className={cn(
                    "w-full px-3 py-2 text-sm rounded-md",
                    "border border-border-subtle bg-surface-card",
                    "focus:outline-none focus:border-brand-400",
                  )}
                  data-testid="canvas-channels-lang-input"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-semibold",
                  createMutation.isPending
                    ? "bg-neutral-200 text-neutral-500 cursor-not-allowed"
                    : "bg-brand-600 text-white hover:bg-brand-700",
                )}
                data-testid="canvas-channels-create-submit"
              >
                {createMutation.isPending ? "Olusturuluyor..." : "Olustur"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreate(false);
                  setCreateError(null);
                }}
                className="px-3 py-2 text-xs text-neutral-500 hover:text-neutral-800"
              >
                Vazgec
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {/* Channel grid ----------------------------------------------------- */}
      {isLoading ? (
        <div
          className="rounded-xl border border-border-subtle bg-surface-card p-8 text-center text-sm text-neutral-500"
          data-testid="canvas-channels-loading"
        >
          Kanallar yukleniyor...
        </div>
      ) : rows.length === 0 ? (
        <div
          className="rounded-xl border border-dashed border-border-subtle bg-neutral-50/40 p-10 text-center"
          data-testid="canvas-channels-empty"
        >
          <p className="m-0 text-sm font-semibold text-neutral-700">
            Henuz kanalin yok
          </p>
          <p className="m-0 mt-1 text-xs text-neutral-500">
            Yukaridaki butondan ilk kanal profilini olusturabilirsin.
          </p>
        </div>
      ) : (
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
          data-testid="canvas-channels-grid"
        >
          {rows.map((ch) => (
            <button
              key={ch.id}
              type="button"
              onClick={() => navigate(`/user/channels/${ch.id}`)}
              className={cn(
                "group text-left rounded-xl border border-border-subtle bg-surface-card",
                "hover:border-brand-400 hover:shadow-md transition-all duration-fast",
                "overflow-hidden cursor-pointer",
              )}
              data-testid={`canvas-channel-card-${ch.id}`}
            >
              <div
                className={cn(
                  "h-[72px] flex items-center justify-between px-4",
                  "bg-gradient-to-br from-brand-50 via-neutral-50 to-neutral-100",
                  "border-b border-border-subtle",
                )}
              >
                <div className="min-w-0">
                  <p className="m-0 text-sm font-semibold text-neutral-900 truncate">
                    {ch.profile_name}
                  </p>
                  <p className="m-0 text-[10px] font-mono uppercase text-neutral-500">
                    {ch.channel_slug}
                  </p>
                </div>
                <StatusBadge status={ch.status} size="sm" />
              </div>
              <div className="p-4 text-xs text-neutral-500 space-y-1">
                <p className="m-0">
                  <span className="text-neutral-700 font-semibold">Dil:</span>{" "}
                  {ch.default_language}
                </p>
                {ch.profile_type ? (
                  <p className="m-0">
                    <span className="text-neutral-700 font-semibold">Tip:</span>{" "}
                    {ch.profile_type}
                  </p>
                ) : null}
                <p className="m-0">
                  <span className="text-neutral-700 font-semibold">
                    Projeler:
                  </span>{" "}
                  {projectCountByChannel.get(ch.id) ?? 0}
                </p>
                <p className="m-0 text-[10px] text-neutral-400 mt-2">
                  Olusturulma:{" "}
                  {new Date(ch.created_at).toLocaleDateString("tr-TR")}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ChannelStatTile({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div
      className="rounded-lg border border-border-subtle bg-surface-card px-3 py-2"
      data-testid={`canvas-channel-stat-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
        {label}
      </div>
      <div className="mt-0.5 text-lg font-semibold text-neutral-900 tabular-nums">
        {value}
      </div>
    </div>
  );
}
