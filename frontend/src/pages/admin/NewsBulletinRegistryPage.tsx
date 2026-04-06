import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useNewsBulletinsList } from "../../hooks/useNewsBulletinsList";
import { NewsBulletinsTable } from "../../components/news-bulletin/NewsBulletinsTable";
import { NewsBulletinDetailPanel } from "../../components/news-bulletin/NewsBulletinDetailPanel";
import { PageShell, SectionShell, ActionButton } from "../../components/design-system/primitives";

export function NewsBulletinRegistryPage() {
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
        <ActionButton variant="primary" size="sm" onClick={() => navigate("/admin/news-bulletins/new")}>
          + Yeni Bulten Olustur
        </ActionButton>
      }
    >
      <p className="mt-2 mb-5 text-base text-neutral-500 leading-normal max-w-[640px]" data-testid="nb-registry-workflow-note">
        Haber bulteni kayitlarinizi buradan yonetebilirsiniz. Bir bulten
        sectiginizde detay panelinde secili haberler, script ve metadata
        adimlarini gorebilir ve duzenleyebilirsiniz.
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
