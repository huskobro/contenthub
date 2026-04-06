/**
 * ProviderManagementPage — Provider yönetim sayfası (Faz B)
 *
 * Özellikler:
 * - Capability bazlı gruplama (LLM, TTS, Görseller, Konuşma Tanıma, Yayın)
 * - Her provider için credential durumu, health istatistikleri
 * - Test Et butonu ile bağlantı testi
 * - Varsayılan provider seçimi
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchProviders,
  testProviderConnection,
  setProviderDefault,
  type ProviderEntry,
} from "../../api/providersApi";
import { PageShell, SectionShell } from "../../components/design-system/primitives";
import { useToast } from "../../hooks/useToast";

// ---------------------------------------------------------------------------
// Sabitler
// ---------------------------------------------------------------------------

const CAPABILITY_LABELS: Record<string, string> = {
  llm: "LLM (Dil Modeli)",
  tts: "TTS (Seslendirme)",
  visuals: "Görseller",
  whisper: "Konuşma Tanıma",
  publish: "Yayın",
};

// ---------------------------------------------------------------------------
// Yardımcı: Credential durumu rozeti
// ---------------------------------------------------------------------------

function CredentialBadge({ entry }: { entry: ProviderEntry }) {
  if (entry.credential_source === "not_required") {
    return (
      <span className="text-xs text-neutral-500">Kimlik bilgisi gerekmez</span>
    );
  }
  if (entry.credential_status === "ok") {
    return (
      <span className="text-xs text-success-text">
        {entry.credential_env_var} ✓
      </span>
    );
  }
  return (
    <span className="text-xs text-error font-medium">
      {entry.credential_env_var} — eksik
    </span>
  );
}

// ---------------------------------------------------------------------------
// Provider Kartı
// ---------------------------------------------------------------------------

interface ProviderCardProps {
  entry: ProviderEntry;
  isDefault: boolean;
  capability: string;
  testStatus: "idle" | "loading" | "ok" | "error";
  onTest: () => void;
  onSetDefault: () => void;
}

function ProviderCard({
  entry,
  isDefault,
  capability: _capability,
  testStatus,
  onTest,
  onSetDefault,
}: ProviderCardProps) {
  const errorRate =
    entry.invoke_count > 0
      ? Math.round((entry.error_count / entry.invoke_count) * 100)
      : 0;

  return (
    <div
      className="bg-surface-inset border border-border-subtle rounded-lg p-4 flex flex-col gap-3"
      data-testid={`provider-card-${entry.provider_id}`}
    >
      {/* Başlık satırı */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm text-neutral-800">
            {entry.provider_id}
          </span>
          {isDefault && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 font-medium">
              Varsayılan
            </span>
          )}
          {entry.is_primary && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
              Primary
            </span>
          )}
          {!entry.enabled && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-error-light text-error-text">
              Devre Dışı
            </span>
          )}
        </div>
        {/* Test butonu */}
        <button
          onClick={onTest}
          disabled={testStatus === "loading"}
          className="shrink-0 text-xs px-3 py-1 rounded border bg-surface-card border-border-subtle hover:border-brand-400 text-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          data-testid={`test-btn-${entry.provider_id}`}
        >
          {testStatus === "loading" ? "Test ediliyor…" : "Test Et"}
        </button>
      </div>

      {/* Credential durumu */}
      <CredentialBadge entry={entry} />

      {/* Health istatistikleri */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="flex flex-col">
          <span className="text-neutral-500">Çağrı</span>
          <span className="font-medium text-neutral-800">{entry.invoke_count}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-neutral-500">Hata</span>
          <span className={entry.error_count > 0 ? "font-medium text-error" : "font-medium text-neutral-800"}>
            {entry.error_count}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-neutral-500">Hata %</span>
          <span className={errorRate > 0 ? "font-medium text-error" : "font-medium text-neutral-800"}>
            {errorRate}%
          </span>
        </div>
      </div>

      {/* Son gecikme */}
      {entry.last_latency_ms !== null && (
        <div className="text-xs text-neutral-500">
          Son gecikme: <span className="text-neutral-700">{entry.last_latency_ms} ms</span>
        </div>
      )}

      {/* Son hata */}
      {entry.last_error && (
        <div className="text-xs text-error truncate" title={entry.last_error}>
          Son hata: {entry.last_error}
        </div>
      )}

      {/* Varsayılan yap butonu */}
      {!isDefault && entry.enabled && (
        <button
          onClick={onSetDefault}
          className="text-xs text-brand-600 hover:text-brand-700 text-left w-fit"
        >
          Varsayılan yap
        </button>
      )}

      {/* Test sonucu göstergesi */}
      {testStatus === "ok" && (
        <div className="text-xs text-success-text">Bağlantı başarılı</div>
      )}
      {testStatus === "error" && (
        <div className="text-xs text-error">Bağlantı başarısız</div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ana sayfa
// ---------------------------------------------------------------------------

type TestStatusMap = Record<string, "idle" | "loading" | "ok" | "error">;

export function ProviderManagementPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [testStatuses, setTestStatuses] = useState<TestStatusMap>({});

  const { data, isLoading, isError } = useQuery({
    queryKey: ["providers"],
    queryFn: fetchProviders,
  });

  const setDefaultMutation = useMutation({
    mutationFn: ({ capability, providerId }: { capability: string; providerId: string }) =>
      setProviderDefault(capability, providerId),
    onSuccess: (_, { providerId }) => {
      toast.success(`'${providerId}' varsayılan provider olarak ayarlandı`);
      queryClient.invalidateQueries({ queryKey: ["providers"] });
    },
    onError: () => {
      toast.error("Varsayılan provider ayarlanamadı");
    },
  });

  function handleTest(providerId: string) {
    setTestStatuses((prev) => ({ ...prev, [providerId]: "loading" }));
    testProviderConnection(providerId)
      .then((result) => {
        const status = result.status === "ok" ? "ok" : "error";
        setTestStatuses((prev) => ({ ...prev, [providerId]: status }));
        if (status === "ok") {
          toast.success(result.message);
        } else {
          toast.error(result.message);
        }
      })
      .catch(() => {
        setTestStatuses((prev) => ({ ...prev, [providerId]: "error" }));
        toast.error(`'${providerId}' bağlantı testi başarısız`);
      });
  }

  function handleSetDefault(capability: string, providerId: string) {
    setDefaultMutation.mutate({ capability, providerId });
  }

  if (isLoading) {
    return (
      <PageShell title="Provider Yönetimi" subtitle="Kayıtlı provider'ların durumu ve yönetimi">
        <div className="text-sm text-neutral-500">Yükleniyor…</div>
      </PageShell>
    );
  }

  if (isError || !data) {
    return (
      <PageShell title="Provider Yönetimi" subtitle="Kayıtlı provider'ların durumu ve yönetimi">
        <div className="text-sm text-error">Provider verileri yüklenemedi.</div>
      </PageShell>
    );
  }

  const capabilities = Object.keys(data.capabilities);

  return (
    <PageShell
      title="Provider Yönetimi"
      subtitle="Kayıtlı AI ve servis provider'larının durumu, credential bilgileri ve sağlık metrikleri."
      testId="provider-management-page"
    >
      {capabilities.length === 0 && (
        <div className="text-sm text-neutral-500">Kayıtlı provider bulunamadı.</div>
      )}

      {capabilities.map((cap) => {
        const entries = data.capabilities[cap] ?? [];
        const label = CAPABILITY_LABELS[cap] ?? cap;
        const defaultId = data.defaults[cap] ?? null;

        return (
          <SectionShell key={cap} title={label} testId={`section-${cap}`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {entries.map((entry) => (
                <ProviderCard
                  key={entry.provider_id}
                  entry={entry}
                  isDefault={entry.provider_id === defaultId}
                  capability={cap}
                  testStatus={testStatuses[entry.provider_id] ?? "idle"}
                  onTest={() => handleTest(entry.provider_id)}
                  onSetDefault={() => handleSetDefault(cap, entry.provider_id)}
                />
              ))}
            </div>
          </SectionShell>
        );
      })}
    </PageShell>
  );
}
