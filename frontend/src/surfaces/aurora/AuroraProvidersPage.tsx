/**
 * AuroraProvidersPage — Aurora Dusk Cockpit / Provider Yönetimi (admin).
 *
 * Hedef:
 *   - Page-head (başlık + alt başlık + breadcrumb: Settings → Providers)
 *   - Provider type sekmeleri (LLM / TTS / Görseller / Whisper / Publish)
 *   - Aktif sekmede provider kartları: name, model/credential, status,
 *     "Test Et" butonu, "Varsayılan yap" butonu
 *   - Sağ inspector: provider sayım, aktif/pasif, son test sonucu
 *
 * Veri kaynağı: `useQuery(["providers"])` + `fetchProviders()` — AYNI hook
 *   ve API. Save/test/setDefault path'leri legacy ProviderManagementPage ile
 *   bire bir aynı endpoint'lere gider (tek doğruluk noktası).
 *
 * Trampoline: `ProviderManagementPage` (legacy) `useSurfacePageOverride`
 *   ile bu sayfayı çözümler. Override register.tsx'te
 *   AURORA_PAGE_OVERRIDES'a `admin.providers` anahtarı altında
 *   eklenmedikçe legacy fallback çalışır (CLAUDE.md: "fail fast where
 *   correctness matters" — registration ayrı bir adımda yapılır,
 *   bu sayfa hazır bekler).
 */
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchProviders,
  testProviderConnection,
  setProviderDefault,
  type ProviderEntry,
} from "../../api/providersApi";
import { useToast } from "../../hooks/useToast";
import {
  AuroraButton,
  AuroraInspector,
  AuroraInspectorSection,
  AuroraInspectorRow,
  AuroraStatusChip,
  AuroraCard,
  AuroraPageShell,
} from "./primitives";
import { Icon } from "./icons";

// ---------------------------------------------------------------------------
// Sabitler
// ---------------------------------------------------------------------------

const CAPABILITY_LABELS: Record<string, string> = {
  llm: "LLM",
  tts: "TTS",
  visuals: "Görseller",
  whisper: "Whisper",
  publish: "Yayın",
};

const CAPABILITY_DESCRIPTIONS: Record<string, string> = {
  llm: "Dil modeli sağlayıcıları (script, metadata, başlık üretimi)",
  tts: "Metinden konuşma (seslendirme) sağlayıcıları",
  visuals: "Görsel üretim / asset sağlayıcıları",
  whisper: "Konuşma tanıma (subtitle/transkripsiyon) sağlayıcıları",
  publish: "Yayın hedef sağlayıcıları (YouTube vb.)",
};

// ---------------------------------------------------------------------------
// Test status durumu (per-provider)
// ---------------------------------------------------------------------------

type TestPhase = "idle" | "loading" | "ok" | "error";
type TestStatusMap = Record<
  string,
  { phase: TestPhase; message?: string; at?: number }
>;

// ---------------------------------------------------------------------------
// Yardımcılar
// ---------------------------------------------------------------------------

function credentialTone(entry: ProviderEntry): {
  tone: "success" | "warning" | "danger" | "neutral";
  label: string;
} {
  if (entry.credential_source === "not_required") {
    return { tone: "neutral", label: "kimlik gerekmez" };
  }
  if (entry.credential_status === "ok") {
    const src = entry.credential_source === "db" ? "DB" : "env";
    return { tone: "success", label: `yapılandırıldı (${src})` };
  }
  return { tone: "danger", label: "kimlik eksik" };
}

function errorRate(entry: ProviderEntry): number {
  if (entry.invoke_count <= 0) return 0;
  return Math.round((entry.error_count / entry.invoke_count) * 100);
}

function formatTimeAgo(at: number | undefined): string {
  if (!at) return "—";
  const sec = Math.max(1, Math.floor((Date.now() - at) / 1000));
  if (sec < 60) return `${sec}sn önce`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}dk önce`;
  const hr = Math.floor(min / 60);
  return `${hr}sa önce`;
}

// ---------------------------------------------------------------------------
// Provider kartı
// ---------------------------------------------------------------------------

interface ProviderCardProps {
  entry: ProviderEntry;
  isDefault: boolean;
  testStatus: TestPhase;
  onTest: () => void;
  onSetDefault: () => void;
}

function ProviderCard({
  entry,
  isDefault,
  testStatus,
  onTest,
  onSetDefault,
}: ProviderCardProps) {
  const cred = credentialTone(entry);
  const errPct = errorRate(entry);

  return (
    <AuroraCard
      pad="default"
      data-testid={`aurora-provider-card-${entry.provider_id}`}
      style={{ display: "flex", flexDirection: "column", gap: 12 }}
    >
      {/* Başlık + chip'ler + test butonu */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 6,
            minWidth: 0,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-default)",
            }}
          >
            {entry.provider_id}
          </span>
          {isDefault && (
            <AuroraStatusChip tone="info">varsayılan</AuroraStatusChip>
          )}
          {entry.is_primary && (
            <AuroraStatusChip tone="neutral">primary</AuroraStatusChip>
          )}
          {!entry.enabled && (
            <AuroraStatusChip tone="danger">devre dışı</AuroraStatusChip>
          )}
        </div>
        <AuroraButton
          variant="secondary"
          size="sm"
          onClick={onTest}
          disabled={testStatus === "loading"}
          iconLeft={<Icon name="zap" size={11} />}
          data-testid={`aurora-test-btn-${entry.provider_id}`}
        >
          {testStatus === "loading" ? "Test ediliyor…" : "Test Et"}
        </AuroraButton>
      </div>

      {/* Credential durumu */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <AuroraStatusChip tone={cred.tone}>{cred.label}</AuroraStatusChip>
        {entry.credential_key && (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--text-muted)",
            }}
            title={entry.credential_key}
          >
            {entry.credential_key}
          </span>
        )}
      </div>

      {/* Health metrikleri */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 8,
          fontSize: 11,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span className="overline">Çağrı</span>
          <span
            className="mono"
            style={{ fontSize: 13, color: "var(--text-default)" }}
          >
            {entry.invoke_count}
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span className="overline">Hata</span>
          <span
            className="mono"
            style={{
              fontSize: 13,
              color:
                entry.error_count > 0
                  ? "var(--state-danger-fg)"
                  : "var(--text-default)",
            }}
          >
            {entry.error_count}
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span className="overline">Hata %</span>
          <span
            className="mono"
            style={{
              fontSize: 13,
              color:
                errPct > 0 ? "var(--state-danger-fg)" : "var(--text-default)",
            }}
          >
            {errPct}%
          </span>
        </div>
      </div>

      {/* Son gecikme */}
      {entry.last_latency_ms !== null && (
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--text-muted)",
          }}
        >
          Son gecikme:{" "}
          <span style={{ color: "var(--text-default)" }}>
            {entry.last_latency_ms} ms
          </span>
        </div>
      )}

      {/* Son hata */}
      {entry.last_error && (
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--state-danger-fg)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={entry.last_error}
        >
          Son hata: {entry.last_error}
        </div>
      )}

      {/* Aksiyonlar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        {!isDefault && entry.enabled ? (
          <AuroraButton
            variant="ghost"
            size="sm"
            onClick={onSetDefault}
            iconLeft={<Icon name="check" size={11} />}
          >
            Varsayılan yap
          </AuroraButton>
        ) : (
          <span />
        )}

        {testStatus === "ok" && (
          <span
            style={{
              fontSize: 11,
              color: "var(--state-success-fg)",
              fontFamily: "var(--font-mono)",
            }}
          >
            ✓ bağlantı başarılı
          </span>
        )}
        {testStatus === "error" && (
          <span
            style={{
              fontSize: 11,
              color: "var(--state-danger-fg)",
              fontFamily: "var(--font-mono)",
            }}
          >
            ✗ bağlantı başarısız
          </span>
        )}
      </div>
    </AuroraCard>
  );
}

// ---------------------------------------------------------------------------
// Ana sayfa
// ---------------------------------------------------------------------------

export function AuroraProvidersPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [testStatuses, setTestStatuses] = useState<TestStatusMap>({});
  const [activeCapability, setActiveCapability] = useState<string>("");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["providers"],
    queryFn: fetchProviders,
  });

  const setDefaultMutation = useMutation({
    mutationFn: ({
      capability,
      providerId,
    }: {
      capability: string;
      providerId: string;
    }) => setProviderDefault(capability, providerId),
    onSuccess: (_, { providerId }) => {
      toast.success(`'${providerId}' varsayılan provider olarak ayarlandı`);
      queryClient.invalidateQueries({ queryKey: ["providers"] });
    },
    onError: () => {
      toast.error("Varsayılan provider ayarlanamadı");
    },
  });

  // Capability listesi (sekmeler)
  const capabilities = useMemo(() => {
    if (!data) return [] as string[];
    return Object.keys(data.capabilities);
  }, [data]);

  // Aktif sekmeyi belirle (ilk geçerli olanı seç)
  const currentCapability = useMemo(() => {
    if (!capabilities.length) return "";
    if (activeCapability && capabilities.includes(activeCapability)) {
      return activeCapability;
    }
    return capabilities[0];
  }, [capabilities, activeCapability]);

  // Aktif sekmedeki provider'lar
  const currentEntries = useMemo<ProviderEntry[]>(() => {
    if (!data || !currentCapability) return [];
    return data.capabilities[currentCapability] ?? [];
  }, [data, currentCapability]);

  const currentDefaultId = useMemo<string | null>(() => {
    if (!data || !currentCapability) return null;
    return data.defaults[currentCapability] ?? null;
  }, [data, currentCapability]);

  // Inspector toplamları
  const totals = useMemo(() => {
    if (!data) {
      return {
        providers: 0,
        enabled: 0,
        disabled: 0,
        configured: 0,
        missing: 0,
      };
    }
    let providers = 0;
    let enabled = 0;
    let disabled = 0;
    let configured = 0;
    let missing = 0;
    for (const cap of Object.keys(data.capabilities)) {
      const list = data.capabilities[cap] ?? [];
      for (const e of list) {
        providers += 1;
        if (e.enabled) enabled += 1;
        else disabled += 1;
        if (
          e.credential_status === "ok" ||
          e.credential_source === "not_required"
        ) {
          configured += 1;
        } else {
          missing += 1;
        }
      }
    }
    return { providers, enabled, disabled, configured, missing };
  }, [data]);

  // Son test sonucu (en son timestamp'li olan)
  const lastTest = useMemo(() => {
    let latest: { providerId: string; phase: TestPhase; at: number } | null =
      null;
    for (const [providerId, entry] of Object.entries(testStatuses)) {
      if (
        (entry.phase === "ok" || entry.phase === "error") &&
        entry.at &&
        (latest === null || entry.at > latest.at)
      ) {
        latest = { providerId, phase: entry.phase, at: entry.at };
      }
    }
    return latest;
  }, [testStatuses]);

  function handleTest(providerId: string) {
    setTestStatuses((prev) => ({
      ...prev,
      [providerId]: { phase: "loading" },
    }));
    testProviderConnection(providerId)
      .then((result) => {
        const phase: TestPhase = result.status === "ok" ? "ok" : "error";
        setTestStatuses((prev) => ({
          ...prev,
          [providerId]: { phase, message: result.message, at: Date.now() },
        }));
        if (phase === "ok") {
          toast.success(result.message);
        } else {
          toast.error(result.message);
        }
        // Health metrikleri test sonrası güncellenmiş olabilir
        queryClient.invalidateQueries({ queryKey: ["providers"] });
      })
      .catch(() => {
        setTestStatuses((prev) => ({
          ...prev,
          [providerId]: {
            phase: "error",
            message: "İstek başarısız",
            at: Date.now(),
          },
        }));
        toast.error(`'${providerId}' bağlantı testi başarısız`);
      });
  }

  function handleSetDefault(capability: string, providerId: string) {
    setDefaultMutation.mutate({ capability, providerId });
  }

  // Inspector
  const inspector = (
    <AuroraInspector title="Provider durumu">
      <AuroraInspectorSection title="Genel">
        <AuroraInspectorRow label="toplam" value={String(totals.providers)} />
        <AuroraInspectorRow label="aktif" value={String(totals.enabled)} />
        <AuroraInspectorRow label="pasif" value={String(totals.disabled)} />
      </AuroraInspectorSection>
      <AuroraInspectorSection title="Kimlik bilgisi">
        <AuroraInspectorRow
          label="yapılandırıldı"
          value={String(totals.configured)}
        />
        <AuroraInspectorRow label="eksik" value={String(totals.missing)} />
      </AuroraInspectorSection>
      {currentCapability && (
        <AuroraInspectorSection
          title={`Aktif: ${CAPABILITY_LABELS[currentCapability] ?? currentCapability}`}
        >
          <AuroraInspectorRow
            label="provider"
            value={String(currentEntries.length)}
          />
          <AuroraInspectorRow
            label="varsayılan"
            value={currentDefaultId ?? "—"}
          />
        </AuroraInspectorSection>
      )}
      <AuroraInspectorSection title="Son test">
        {lastTest ? (
          <>
            <AuroraInspectorRow label="provider" value={lastTest.providerId} />
            <AuroraInspectorRow
              label="sonuç"
              value={lastTest.phase === "ok" ? "başarılı" : "başarısız"}
            />
            <AuroraInspectorRow
              label="zaman"
              value={formatTimeAgo(lastTest.at)}
            />
          </>
        ) : (
          <AuroraInspectorRow label="durum" value="henüz test yok" />
        )}
      </AuroraInspectorSection>
    </AuroraInspector>
  );

  return (
    <div className="aurora-dashboard">
      <AuroraPageShell
        title="Provider Yönetimi"
        breadcrumbs={[
          { label: "Settings", href: "/admin/settings" },
          { label: "Providers" },
        ]}
        description="Kayıtlı AI ve servis sağlayıcılarının durumu, kimlik bilgisi ve sağlık metrikleri."
        data-testid="aurora-providers-page"
      >
        {isLoading && (
          <AuroraCard pad="default">
            <span className="caption">Provider listesi yükleniyor…</span>
          </AuroraCard>
        )}

        {isError && (
          <AuroraCard pad="default">
            <span
              className="mono"
              style={{ color: "var(--state-danger-fg)", fontSize: 12 }}
            >
              Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
            </span>
          </AuroraCard>
        )}

        {!isLoading && !isError && capabilities.length === 0 && (
          <AuroraCard pad="default">
            <span className="caption">Kayıtlı provider bulunamadı.</span>
          </AuroraCard>
        )}

        {!isLoading && !isError && capabilities.length > 0 && (
          <>
            {/* Capability sekmeleri */}
            <div
              role="tablist"
              aria-label="Provider tipleri"
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                borderBottom: "1px solid var(--border-default)",
                paddingBottom: 8,
                marginBottom: 4,
              }}
            >
              {capabilities.map((cap) => {
                const list = data!.capabilities[cap] ?? [];
                const active = cap === currentCapability;
                return (
                  <button
                    key={cap}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActiveCapability(cap)}
                    data-testid={`aurora-providers-tab-${cap}`}
                    style={{
                      background: active
                        ? "var(--bg-inset)"
                        : "transparent",
                      border: "1px solid",
                      borderColor: active
                        ? "var(--accent-primary)"
                        : "var(--border-subtle)",
                      borderRadius: 6,
                      padding: "6px 12px",
                      fontSize: 12,
                      color: active
                        ? "var(--text-default)"
                        : "var(--text-muted)",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontFamily: "inherit",
                    }}
                  >
                    <span>{CAPABILITY_LABELS[cap] ?? cap}</span>
                    <span
                      className="mono"
                      style={{
                        fontSize: 10,
                        opacity: 0.75,
                        background: "var(--bg-default)",
                        padding: "1px 6px",
                        borderRadius: 4,
                      }}
                    >
                      {list.length}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Aktif sekme açıklaması */}
            {currentCapability && (
              <div
                className="caption"
                style={{ marginBottom: 8, color: "var(--text-muted)" }}
              >
                {CAPABILITY_DESCRIPTIONS[currentCapability] ??
                  `${currentCapability} sağlayıcıları`}
              </div>
            )}

            {/* Provider kartları */}
            {currentEntries.length === 0 ? (
              <AuroraCard pad="default">
                <span className="caption">
                  Bu kategoride kayıtlı provider yok.
                </span>
              </AuroraCard>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: 12,
                }}
              >
                {currentEntries.map((entry) => (
                  <ProviderCard
                    key={entry.provider_id}
                    entry={entry}
                    isDefault={entry.provider_id === currentDefaultId}
                    testStatus={
                      testStatuses[entry.provider_id]?.phase ?? "idle"
                    }
                    onTest={() => handleTest(entry.provider_id)}
                    onSetDefault={() =>
                      handleSetDefault(currentCapability, entry.provider_id)
                    }
                  />
                ))}
              </div>
            )}
          </>
        )}
      </AuroraPageShell>
      <aside className="aurora-inspector-slot">{inspector}</aside>
    </div>
  );
}
