import { useState } from "react";
import { useSettingsList } from "../../hooks/useSettingsList";
import { SettingsTable } from "../../components/settings/SettingsTable";
import { SettingDetailPanel } from "../../components/settings/SettingDetailPanel";
import { CredentialsPanel } from "../../components/settings/CredentialsPanel";
import { EffectiveSettingsPanel } from "../../components/settings/EffectiveSettingsPanel";
import { ReadOnlyGuard } from "../../components/visibility/ReadOnlyGuard";
import { colors, typography, spacing } from "../../components/design-system/tokens";
import { PageShell, SectionShell, TabBar } from "../../components/design-system/primitives";

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

const TABS = TAB_ITEMS.map(({ key, label }) => ({ key, label }));

export function SettingsRegistryPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("credentials");
  const { data: settings, isLoading, isError, error } = useSettingsList();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const currentTab = TAB_ITEMS.find((t) => t.key === activeTab)!;

  return (
    <ReadOnlyGuard targetKey="panel:settings">
      <PageShell title="Ayarlar" testId="settings-registry">
        {/* Tabs */}
        <TabBar<TabKey>
          tabs={TABS}
          active={activeTab}
          onChange={setActiveTab}
          testId="settings-tab"
        />

        {/* Tab description */}
        <p
          style={{
            margin: `0 0 ${spacing[4]}`,
            fontSize: typography.size.sm,
            color: colors.neutral[500],
            lineHeight: typography.lineHeight.normal,
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
            {isLoading && (
              <p style={{ color: colors.neutral[500], fontSize: typography.size.base }}>
                Yukleniyor...
              </p>
            )}
            {isError && (
              <p style={{ color: colors.error.base, fontSize: typography.size.base }}>
                Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
              </p>
            )}
            {settings && (
              <div style={{ display: "flex", gap: spacing[5], alignItems: "flex-start" }}>
                <div style={{ flex: 2, minWidth: 0 }}>
                  <SectionShell flush testId="settings-registry-table-section">
                    <SettingsTable
                      settings={settings}
                      selectedId={selectedId}
                      onSelect={setSelectedId}
                    />
                  </SectionShell>
                </div>
                <div style={{ flex: 1, minWidth: "280px" }}>
                  <SectionShell testId="settings-registry-detail-section">
                    <SettingDetailPanel selectedId={selectedId} />
                  </SectionShell>
                </div>
              </div>
            )}
          </>
        )}
      </PageShell>
    </ReadOnlyGuard>
  );
}
