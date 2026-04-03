import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useNewsBulletinsList } from "../../hooks/useNewsBulletinsList";
import { NewsBulletinsTable } from "../../components/news-bulletin/NewsBulletinsTable";
import { NewsBulletinDetailPanel } from "../../components/news-bulletin/NewsBulletinDetailPanel";

export function NewsBulletinRegistryPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const initialSelected = (location.state as { selectedId?: string } | null)?.selectedId ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(initialSelected);
  const { data, isLoading, isError } = useNewsBulletinsList();

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2
          style={{ margin: 0, fontSize: "1.125rem", fontWeight: 600 }}
          data-testid="nb-registry-heading"
        >
          Haber Bulteni Kayitlari
        </h2>
        <button onClick={() => navigate("/admin/news-bulletins/new")}>
          + Yeni Bulten Olustur
        </button>
      </div>
      <p
        style={{
          margin: "0.5rem 0 1.25rem",
          fontSize: "0.8125rem",
          color: "#94a3b8",
          lineHeight: 1.5,
          maxWidth: "640px",
        }}
        data-testid="nb-registry-workflow-note"
      >
        Haber bulteni kayitlarinizi buradan yonetebilirsiniz. Bir bulten
        sectiginizde detay panelinde secili haberler, script ve metadata
        adimlarini gorebilir ve duzenleyebilirsiniz.
      </p>

      <div style={{ display: "flex", gap: "24px", alignItems: "flex-start" }}>
        <div style={{ flex: 2 }}>
          {isLoading && <p>Yükleniyor...</p>}
          {isError && <p style={{ color: "red" }}>Hata: liste yüklenemedi.</p>}
          {data && (
            <NewsBulletinsTable
              bulletins={data}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          )}
        </div>
        <div style={{ flex: 1 }}>
          <NewsBulletinDetailPanel selectedId={selectedId} />
        </div>
      </div>
    </div>
  );
}
