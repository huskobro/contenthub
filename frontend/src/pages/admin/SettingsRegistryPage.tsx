import { useState } from "react";
import { useSettingsList } from "../../hooks/useSettingsList";
import { SettingsTable } from "../../components/settings/SettingsTable";
import { SettingDetailPanel } from "../../components/settings/SettingDetailPanel";
import { CredentialsPanel } from "../../components/settings/CredentialsPanel";
import { EffectiveSettingsPanel } from "../../components/settings/EffectiveSettingsPanel";
import { WorkspaceRootPicker } from "../../components/settings/WorkspaceRootPicker";
import { ReadOnlyGuard } from "../../components/visibility/ReadOnlyGuard";
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
        <TabBar<TabKey>
          tabs={TABS}
          active={activeTab}
          onChange={setActiveTab}
          testId="settings-tab"
        />

        <div
          className="mb-5 py-3 px-4 bg-surface-inset rounded-md border-l-[3px] border-brand-400 max-w-[720px]"
          data-testid="settings-registry-subtitle"
        >
          <p className="m-0 text-md text-neutral-700 leading-normal">
            {currentTab.description}
          </p>
        </div>

        {activeTab === "credentials" && <CredentialsPanel />}

        {activeTab === "effective" && (
          <>
            <WorkspaceRootPicker />
            <EffectiveSettingsPanel />
          </>
        )}

        {activeTab === "registry" && (
          <>
            {isLoading && <p className="text-neutral-500 text-base p-4">Yükleniyor...</p>}
            {isError && (
              <p className="text-error text-base p-4">
                Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
              </p>
            )}
            {!isLoading && !isError && settings && settings.length === 0 && (
              <div className="text-center py-8 px-4 text-neutral-500">
                <p className="m-0 text-md">Henüz kayıtlı ayar yok.</p>
              </div>
            )}
            {settings && settings.length > 0 && (
              <div className="flex gap-5 items-start">
                <div className="flex-[2] min-w-0">
                  <SectionShell flush testId="settings-registry-table-section">
                    <SettingsTable
                      settings={settings}
                      selectedId={selectedId}
                      onSelect={setSelectedId}
                    />
                  </SectionShell>
                </div>
                <div className="flex-1 min-w-[280px]">
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
