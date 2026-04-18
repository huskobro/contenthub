/**
 * UserAutomationPage — Faz 13: User-facing automation policy management.
 *
 * Users can view/edit automation policies for their own channel profiles.
 * Checkpoint matrix displayed as readable sections, not a single form blob.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../stores/authStore";
import { useToast } from "../../hooks/useToast";
import {
  fetchAutomationPolicies,
  fetchPolicyForChannel,
  createAutomationPolicy,
  updateAutomationPolicy,
  type AutomationPolicyResponse,
  type CheckpointMode,
} from "../../api/automationApi";
import { api } from "../../api/client";
import { cn } from "../../lib/cn";
import { AutomationFlowSvg } from "../../components/automation/AutomationFlowSvg";

// ---------------------------------------------------------------------------
// Channel profile fetcher (reuse existing)
// ---------------------------------------------------------------------------

async function fetchMyChannels(userId: string) {
  return api.get<{ id: string; profile_name: string }[]>("/api/v1/channels", { user_id: userId });
}

// ---------------------------------------------------------------------------
// Checkpoint mode labels + colors
// ---------------------------------------------------------------------------

const MODE_LABELS: Record<CheckpointMode, string> = {
  disabled: "Devre Disi",
  manual_review: "Manuel Onay",
  automatic: "Otomatik",
};

const MODE_COLORS: Record<CheckpointMode, string> = {
  disabled: "bg-neutral-100 text-neutral-500 border-neutral-200",
  manual_review: "bg-warning-light text-warning-dark border-warning",
  automatic: "bg-success-light text-success-dark border-success",
};

const CHECKPOINT_META = [
  { key: "source_scan_mode" as const, label: "Kaynak Tarama", desc: "RSS/kaynak otomatik tarama tetiklemesi" },
  { key: "draft_generation_mode" as const, label: "Taslak Olusturma", desc: "Icerik taslagi otomatik uretimi" },
  { key: "render_mode" as const, label: "Render", desc: "Video/bulten render tetiklemesi" },
  { key: "publish_mode" as const, label: "Yayin", desc: "Platform'a yayin tetiklemesi" },
  { key: "post_publish_mode" as const, label: "Yayin Sonrasi", desc: "Yayin sonrasi islemler (comment, playlist, post)" },
];

type CheckpointField = typeof CHECKPOINT_META[number]["key"];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UserAutomationPage() {
  const userId = useAuthStore((s) => s.user?.id);
  const qc = useQueryClient();
  const toast = useToast();

  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);

  // Fetch user's channels
  const { data: channels = [], isError: channelsError } = useQuery({
    queryKey: ["channels", { user_id: userId }],
    queryFn: () => fetchMyChannels(userId!),
    enabled: !!userId,
  });

  // Fetch policies for the user
  const { data: policies = [], isLoading, isError: policiesError } = useQuery({
    queryKey: ["automation-policies", { owner_user_id: userId }],
    queryFn: () => fetchAutomationPolicies({ owner_user_id: userId! }),
    enabled: !!userId,
  });

  const isError = channelsError || policiesError;

  // Find policy for selected channel
  const selectedPolicy = policies.find(
    (p: AutomationPolicyResponse) => p.channel_profile_id === selectedChannelId,
  );

  // Create policy mutation
  const createMut = useMutation({
    mutationFn: (channelId: string) =>
      createAutomationPolicy({
        channel_profile_id: channelId,
        owner_user_id: userId!,
        name: "Varsayilan Politika",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["automation-policies"] });
      toast.success("Otomasyon politikasi olusturuldu");
    },
  });

  // Update policy mutation
  const updateMut = useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & Record<string, unknown>) =>
      updateAutomationPolicy(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["automation-policies"] });
      toast.success("Politika guncellendi");
    },
  });

  function handleModeChange(field: CheckpointField, mode: CheckpointMode) {
    if (!selectedPolicy) return;
    updateMut.mutate({ id: selectedPolicy.id, [field]: mode });
  }

  function handleToggleEnabled() {
    if (!selectedPolicy) return;
    updateMut.mutate({ id: selectedPolicy.id, is_enabled: !selectedPolicy.is_enabled });
  }

  if (isError) {
    return (
      <div className="space-y-6" data-testid="user-automation-page">
        <h2 className="m-0 text-lg font-semibold text-neutral-800">Otomasyon Politikalari</h2>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-error-light flex items-center justify-center mb-3">
            <span className="text-error-base text-xl">!</span>
          </div>
          <h3 className="text-lg font-semibold text-neutral-800 mb-1">Yüklenemedi</h3>
          <p className="text-sm text-neutral-500">Veriler yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="user-automation-page">
      <h2 className="m-0 text-lg font-semibold text-neutral-800">Otomasyon Politikalari</h2>
      <p className="m-0 text-sm text-neutral-500">
        Kanal bazli otomasyon politikalarinizi yonetin. Her checkpoint icin modu secin.
      </p>

      <div className="px-3 py-2 bg-warning-light rounded text-xs text-warning-dark" data-testid="automation-executor-notice">
        Otomasyon politikalari tanimlanabilir ancak otomatik calistirma henuz aktif degildir. Politikalar su an sadece bilgi amaclidir.
      </div>

      {/* Channel selector */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">Kanal Profili</label>
        <div className="flex flex-wrap gap-2">
          {channels.map((ch: { id: string; profile_name: string }) => (
            <button
              key={ch.id}
              type="button"
              onClick={() => setSelectedChannelId(ch.id)}
              className={cn(
                "px-3 py-1.5 rounded-md border text-sm cursor-pointer transition-colors",
                selectedChannelId === ch.id
                  ? "bg-brand-50 border-brand-400 text-brand-700"
                  : "bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50",
              )}
            >
              {ch.profile_name}
            </button>
          ))}
          {channels.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mb-3">
                <span className="text-neutral-400 text-xl">&empty;</span>
              </div>
              <h3 className="text-lg font-semibold text-neutral-800 mb-1">Henüz kayıt yok</h3>
              <p className="text-sm text-neutral-500 max-w-xs">Henüz otomasyon politikası tanımlanmamış.</p>
            </div>
          )}
        </div>
      </div>

      {/* Policy content */}
      {selectedChannelId && !selectedPolicy && (
        <div className="bg-neutral-50 border border-neutral-200 rounded-md p-4 text-center">
          <p className="m-0 text-sm text-neutral-500 mb-3">
            Bu kanal icin henuz otomasyon politikasi yok.
          </p>
          <button
            type="button"
            onClick={() => createMut.mutate(selectedChannelId)}
            disabled={createMut.isPending}
            className="px-4 py-2 bg-brand-500 text-white rounded-md text-sm hover:bg-brand-600 disabled:opacity-50"
          >
            {createMut.isPending ? "Olusturuluyor..." : "Politika Olustur"}
          </button>
        </div>
      )}

      {selectedPolicy && (
        <div className="space-y-4">
          {/* Policy header */}
          <div className="flex items-center justify-between bg-white border border-neutral-200 rounded-md p-4">
            <div>
              <h3 className="m-0 text-md font-semibold text-neutral-800">{selectedPolicy.name}</h3>
              <p className="m-0 text-xs text-neutral-400 mt-0.5">
                v1 &middot; {new Date(selectedPolicy.updated_at).toLocaleDateString("tr-TR")}
              </p>
            </div>
            <button
              type="button"
              onClick={handleToggleEnabled}
              className={cn(
                "px-4 py-1.5 rounded-md text-sm font-medium border transition-colors",
                selectedPolicy.is_enabled
                  ? "bg-success-light text-success-dark border-success"
                  : "bg-neutral-100 text-neutral-500 border-neutral-200",
              )}
            >
              {selectedPolicy.is_enabled ? "Aktif" : "Devre Disi"}
            </button>
          </div>

          {/* Flow visual preview (P2.6) — pasif SVG onizleme, matris form her zaman korunur */}
          <AutomationFlowSvg policy={selectedPolicy} />

          {/* Checkpoint matrix */}
          <div className="space-y-3">
            <h3 className="m-0 text-md font-semibold text-neutral-800">Checkpoint Matrisi</h3>
            {CHECKPOINT_META.map((cp) => {
              const currentMode = selectedPolicy[cp.key] as CheckpointMode;
              return (
                <div
                  key={cp.key}
                  className="bg-white border border-neutral-200 rounded-md p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-sm font-medium text-neutral-800">{cp.label}</span>
                      <p className="m-0 text-xs text-neutral-400">{cp.desc}</p>
                    </div>
                    <span className={cn("px-2 py-0.5 rounded text-xs font-medium border", MODE_COLORS[currentMode])}>
                      {MODE_LABELS[currentMode]}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {(["disabled", "manual_review", "automatic"] as CheckpointMode[]).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => handleModeChange(cp.key, mode)}
                        disabled={updateMut.isPending}
                        className={cn(
                          "flex-1 px-2 py-1.5 rounded border text-xs cursor-pointer transition-colors",
                          currentMode === mode
                            ? MODE_COLORS[mode] + " font-semibold"
                            : "bg-white text-neutral-500 border-neutral-200 hover:bg-neutral-50",
                        )}
                      >
                        {MODE_LABELS[mode]}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Operational limits */}
          <div className="bg-white border border-neutral-200 rounded-md p-4 space-y-3">
            <h3 className="m-0 text-md font-semibold text-neutral-800">Operasyonel Limitler</h3>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">
                Gunluk Maks. Yayin
              </label>
              <input
                type="number"
                min={0}
                value={selectedPolicy.max_daily_posts ?? 10}
                onChange={(e) =>
                  updateMut.mutate({
                    id: selectedPolicy.id,
                    max_daily_posts: parseInt(e.target.value) || 0,
                  })
                }
                className="w-24 px-2 py-1 text-sm border border-neutral-200 rounded"
              />
            </div>
          </div>

          {/* Disclaimer */}
          <p className="m-0 text-[10px] text-neutral-400 italic text-center">
            Politika karari otomasyonu tetikler — gercek calistirma ayri islem olarak yurutur.
          </p>
        </div>
      )}
    </div>
  );
}
