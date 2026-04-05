import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useNewsBulletinsList } from "../../hooks/useNewsBulletinsList";
import { NewsBulletinsTable } from "../../components/news-bulletin/NewsBulletinsTable";
import { NewsBulletinDetailPanel } from "../../components/news-bulletin/NewsBulletinDetailPanel";
import { PageShell, SectionShell, ActionButton } from "../../components/design-system/primitives";
import { colors, typography, spacing } from "../../components/design-system/tokens";

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
      <p
        style={{
          margin: `${spacing[2]} 0 ${spacing[5]}`,
          fontSize: typography.size.base,
          color: colors.neutral[500],
          lineHeight: 1.5,
          maxWidth: "640px",
        }}
        data-testid="nb-registry-workflow-note"
      >
        Haber bulteni kayitlarinizi buradan yonetebilirsiniz. Bir bulten
        sectiginizde detay panelinde secili haberler, script ve metadata
        adimlarini gorebilir ve duzenleyebilirsiniz.
      </p>

      <div style={{ display: "flex", gap: spacing[6], alignItems: "flex-start" }}>
        <div style={{ flex: 2 }}>
          <SectionShell testId="nb-table-section">
            {isLoading && <p style={{ color: colors.neutral[500], fontSize: typography.size.base, padding: spacing[4] }}>Yükleniyor...</p>}
            {isError && <p style={{ color: colors.error.base, fontSize: typography.size.base, padding: spacing[4] }}>Hata: liste yüklenemedi.</p>}
            {!isLoading && !isError && data && data.length === 0 && (
              <div style={{ textAlign: "center", padding: `${spacing[8]} ${spacing[4]}`, color: colors.neutral[500] }}>
                <p style={{ margin: 0, fontSize: typography.size.md }}>Henüz news bulletin kaydı yok.</p>
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
        <div style={{ flex: 1 }}>
          <NewsBulletinDetailPanel selectedId={selectedId} />
        </div>
      </div>
    </PageShell>
  );
}
