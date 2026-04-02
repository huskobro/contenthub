import { useState } from "react";
import { useNewsBulletinsList } from "../../hooks/useNewsBulletinsList";
import { NewsBulletinsTable } from "../../components/news-bulletin/NewsBulletinsTable";
import { NewsBulletinDetailPanel } from "../../components/news-bulletin/NewsBulletinDetailPanel";

export function NewsBulletinRegistryPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data, isLoading, isError } = useNewsBulletinsList();

  return (
    <div>
      <h1>News Bulletin Registry</h1>
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
