import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useNewsBulletinsList } from "../../hooks/useNewsBulletinsList";
import { NewsBulletinsTable } from "../../components/news-bulletin/NewsBulletinsTable";
import { NewsBulletinDetailPanel } from "../../components/news-bulletin/NewsBulletinDetailPanel";
import { PageShell, SectionShell, ActionButton } from "../../components/design-system/primitives";
import { useSurfacePageOverride } from "../../surfaces/SurfaceContext";

export function NewsBulletinRegistryPage() {
  const Override = useSurfacePageOverride("admin.news-bulletins.registry");
  if (Override) return <Override />;
  return <LegacyNewsBulletinRegistryPage />;
}

function LegacyNewsBulletinRegistryPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const initialSelected = (location.state as { selectedId?: string } | null)?.selectedId ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(initialSelected);
  const { data, isLoading, isError } = useNewsBulletinsList();

  return (
    <PageShell
      title="Haber Bulteni Kayitlari"
      testId="nb-registry"
      actions={
        <div className="flex gap-2">
          <ActionButton variant="primary" size="sm" onClick={() => navigate("/admin/news-bulletins/wizard")}>
            Wizard ile Olustur
          </ActionButton>
          <ActionButton variant="secondary" size="sm" onClick={() => navigate("/admin/news-bulletins/new")}>
            + Hizli Olustur
          </ActionButton>
        </div>
      }
    >
      <p className="mt-0 mb-3 text-xs text-neutral-400" data-testid="nb-registry-workflow-note">
        Bulten secerek detay panelinde haberler, script ve metadata adimlarini gorun.
      </p>

      <div className="flex gap-6 items-start">
        <div className="flex-[2]">
          <SectionShell testId="nb-table-section">
            {isLoading && <p className="text-neutral-500 text-base p-4">Yükleniyor...</p>}
            {isError && <p className="text-error text-base p-4">Hata: liste yüklenemedi.</p>}
            {!isLoading && !isError && data && data.length === 0 && (
              <div className="text-center py-8 px-4 text-neutral-500">
                <p className="m-0 text-md">Henüz news bulletin kaydı yok.</p>
              </div>
            )}
            {data && data.length > 0 && (
              <NewsBulletinsTable
                bulletins={data}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            )}
          </SectionShell>
        </div>
        <div className="flex-1">
          <NewsBulletinDetailPanel selectedId={selectedId} />
        </div>
      </div>
    </PageShell>
  );
}
