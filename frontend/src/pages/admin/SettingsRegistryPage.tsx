import { useState } from "react";
import { useSettingsList } from "../../hooks/useSettingsList";
import { SettingsTable } from "../../components/settings/SettingsTable";
import { SettingDetailPanel } from "../../components/settings/SettingDetailPanel";
import { CredentialsPanel } from "../../components/settings/CredentialsPanel";
import { EffectiveSettingsPanel } from "../../components/settings/EffectiveSettingsPanel";

type TabKey = "credentials" | "effective" | "registry";

const TAB_ITEMS: { key: TabKey; label: string; description: string }[] = [
  {
    key: "credentials",
    label: "Kimlik Bilgileri ve Entegrasyonlar",
    description:
      "API anahtarlari, OAuth baglantilari ve provider entegrasyonlarini yonetin.",
  },
  {
    key: "effective",
    label: "Effective Ayarlar",
    description:
      "Tum bilinen ayarlarin grup bazli effective degerleri, kaynaklari ve runtime wiring durumu. Ayarlari buradan yonetebilirsiniz.",
  },
  {
    key: "registry",
    label: "Ayar Kayitlari",
    description:
      "Sistemde tanimli tum ayarlarin DB tablosu gorunumu. Dusuk seviye veri inceleme ve yonetim.",
  },
];

const TAB_BAR: React.CSSProperties = {
  display: "flex",
  gap: "0",
  borderBottom: "2px solid #e2e8f0",
  marginBottom: "1rem",
};

function tabStyle(active: boolean): React.CSSProperties {
  return {
    padding: "0.5rem 1rem",
    fontSize: "0.8125rem",
    fontWeight: active ? 600 : 400,
    color: active ? "#1e40af" : "#64748b",
    background: "transparent",
    border: "none",
    borderBottom: active ? "2px solid #1e40af" : "2px solid transparent",
    marginBottom: "-2px",
    cursor: "pointer",
    transition: "color 0.15s, border-color 0.15s",
  };
}

export function SettingsRegistryPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("credentials");
  const { data: settings, isLoading, isError, error } = useSettingsList();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const currentTab = TAB_ITEMS.find((t) => t.key === activeTab)!;

  return (
    <div>
      <h2
        style={{ margin: "0 0 0.25rem", fontSize: "1.125rem", fontWeight: 600 }}
        data-testid="settings-registry-heading"
      >
        Ayarlar
      </h2>

      {/* Tabs */}
      <div style={TAB_BAR}>
        {TAB_ITEMS.map((tab) => (
          <button
            key={tab.key}
            style={tabStyle(activeTab === tab.key)}
            onClick={() => setActiveTab(tab.key)}
            data-testid={`settings-tab-${tab.key}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab description */}
      <p
        style={{
          margin: "0 0 1rem",
          fontSize: "0.8125rem",
          color: "#94a3b8",
          lineHeight: 1.5,
          maxWidth: "640px",
        }}
        data-testid="settings-registry-subtitle"
      >
        {currentTab.description}
      </p>

      {/* Tab content */}
      {activeTab === "credentials" && <CredentialsPanel />}

      {activeTab === "effective" && <EffectiveSettingsPanel />}

      {activeTab === "registry" && (
        <>
          {isLoading && <p style={{ color: "#64748b" }}>Yukleniyor...</p>}
          {isError && (
            <p style={{ color: "#dc2626" }}>
              Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
            </p>
          )}
          {settings && (
            <div style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start" }}>
              <div style={{ flex: 2, minWidth: 0 }}>
                <SettingsTable
                  settings={settings}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                />
              </div>
              <div
                style={{
                  flex: 1,
                  minWidth: "280px",
                  border: "1px solid #e2e8f0",
                  borderRadius: "6px",
                  background: "#fafbfc",
                }}
              >
                <SettingDetailPanel selectedId={selectedId} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
