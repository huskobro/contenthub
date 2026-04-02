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
        <h1>News Bulletin Registry</h1>
        <button onClick={() => navigate("/admin/news-bulletins/new")}>
          + Yeni News Bulletin
        </button>
      </div>
      <p>Admin news bulletin kayıtları.</p>

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
