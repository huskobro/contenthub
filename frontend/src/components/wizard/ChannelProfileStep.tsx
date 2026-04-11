/**
 * ChannelProfileStep — Faz 5C: Step 0 for all content creation wizards.
 *
 * Requires the user to select (or create) a ChannelProfile before the wizard starts.
 * This ensures every ContentProject is always scoped to a channel.
 */

import { useState } from "react";
import { useMyChannelProfiles } from "../../hooks/useMyChannelProfiles";
import { useCreateChannelProfile } from "../../hooks/useChannelProfiles";
import { useAuthStore } from "../../stores/authStore";
import { cn } from "../../lib/cn";
import type { ChannelProfileResponse } from "../../api/channelProfilesApi";

interface ChannelProfileStepProps {
  selectedId: string | null;
  onSelect: (profileId: string) => void;
  testId?: string;
}

const inputCls =
  "block w-full px-2 py-1.5 text-sm border border-border rounded-sm box-border focus:outline-none focus:ring-2 focus:ring-focus";

export function ChannelProfileStep({
  selectedId,
  onSelect,
  testId = "channel-step",
}: ChannelProfileStepProps) {
  const userId = useAuthStore((s) => s.user?.id);
  const { data: profiles, isLoading, isError } = useMyChannelProfiles();
  const createMut = useCreateChannelProfile();

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");

  const activeProfiles = (profiles ?? []).filter((p) => p.status === "active");

  async function handleCreate() {
    if (!userId || !newName.trim() || !newSlug.trim()) return;
    try {
      const created = await createMut.mutateAsync({
        user_id: userId,
        profile_name: newName.trim(),
        channel_slug: newSlug.trim().toLowerCase().replace(/\s+/g, "-"),
      });
      onSelect(created.id);
      setShowCreate(false);
      setNewName("");
      setNewSlug("");
    } catch {
      /* mutation error handled by UI */
    }
  }

  if (isLoading) {
    return (
      <div className="py-6 text-sm text-neutral-500" data-testid={testId}>
        Kanallar yukleniyor...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-6 text-sm text-error-dark" data-testid={testId}>
        Kanallar yuklenemedi. Lutfen tekrar deneyin.
      </div>
    );
  }

  return (
    <div data-testid={testId}>
      <h3 className="m-0 mb-1 text-md font-semibold text-neutral-800">
        Kanal Secimi
      </h3>
      <p className="m-0 mb-3 text-sm text-neutral-500">
        Bu icerik hangi kanal icin uretilecek?
      </p>

      {activeProfiles.length === 0 && !showCreate ? (
        <div className="bg-warning-light border border-warning rounded-md px-4 py-3 text-sm text-warning-dark mb-3">
          Henuz bir kanal profiliniz yok. Devam etmek icin bir kanal olusturun.
        </div>
      ) : null}

      {/* Profile cards */}
      {activeProfiles.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
          {activeProfiles.map((p) => (
            <ChannelCard
              key={p.id}
              profile={p}
              selected={selectedId === p.id}
              onSelect={() => onSelect(p.id)}
            />
          ))}
        </div>
      )}

      {/* Inline create */}
      {showCreate ? (
        <div
          className="bg-neutral-50 border border-border-subtle rounded-md p-3 space-y-2"
          data-testid={`${testId}-create-form`}
        >
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Kanal Adi <span className="text-error-dark">*</span>
            </label>
            <input
              className={inputCls}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ornegin: Teknoloji Kanali"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Kanal Slug <span className="text-error-dark">*</span>
            </label>
            <input
              className={inputCls}
              value={newSlug}
              onChange={(e) => setNewSlug(e.target.value)}
              placeholder="ornegin: teknoloji-kanali"
            />
            <p className="m-0 mt-0.5 text-xs text-neutral-400">
              Kucuk harf, bosluk yerine tire.
            </p>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleCreate}
              disabled={createMut.isPending || !newName.trim() || !newSlug.trim()}
              className={cn(
                "px-4 py-1.5 text-sm font-medium text-white border-none rounded-sm",
                createMut.isPending || !newName.trim() || !newSlug.trim()
                  ? "bg-neutral-300 cursor-not-allowed"
                  : "bg-brand-500 cursor-pointer hover:bg-brand-600",
              )}
            >
              {createMut.isPending ? "Olusturuluyor..." : "Olustur"}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-4 py-1.5 text-sm text-neutral-500 bg-transparent border-none cursor-pointer hover:text-neutral-700"
            >
              Iptal
            </button>
          </div>

          {createMut.isError && (
            <p className="m-0 text-sm text-error-dark">
              {createMut.error instanceof Error
                ? createMut.error.message
                : "Kanal olusturulamadi."}
            </p>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="text-sm text-brand-600 bg-transparent border-none cursor-pointer p-0 hover:text-brand-700 font-medium"
          data-testid={`${testId}-add-btn`}
        >
          + Yeni Kanal Olustur
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ChannelCard — selection card
// ---------------------------------------------------------------------------

function ChannelCard({
  profile,
  selected,
  onSelect,
}: {
  profile: ChannelProfileResponse;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex flex-col items-start gap-1 px-3 py-3 border rounded-md cursor-pointer transition-colors text-left w-full",
        selected
          ? "bg-brand-50 text-brand-700 border-brand-400 ring-1 ring-brand-200"
          : "bg-white text-neutral-700 border-border hover:bg-neutral-50",
      )}
      data-testid={`channel-card-${profile.id}`}
    >
      <span className="text-sm font-medium">{profile.profile_name}</span>
      <span className="text-xs text-neutral-400">@{profile.channel_slug}</span>
      {profile.default_language && (
        <span lang="en" className="text-[11px] text-neutral-400 uppercase">
          {profile.default_language}
        </span>
      )}
    </button>
  );
}
