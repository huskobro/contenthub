export function AssetLibraryPage() {
  return (
    <div>
      <h2
        data-testid="asset-library-heading"
        style={{ margin: "0 0 0.25rem", fontSize: "1.125rem", fontWeight: 600 }}
      >
        Varlik Kutuphanesi
      </h2>
      <p
        style={{
          margin: "0.25rem 0 1rem",
          fontSize: "0.8125rem",
          color: "#94a3b8",
          lineHeight: 1.5,
          maxWidth: "640px",
        }}
        data-testid="asset-library-subtitle"
      >
        Uretim altyapisini destekleyen media ve tasarim varliklarinin yonetim yuzeyi.
        Muzik, font, gorsel, video klip, overlay, altyazi stili ve thumbnail referanslari
        bu alanda kataloglanacaktir.
      </p>

      <div
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          padding: "2rem 1.5rem",
          background: "#fafbfc",
          textAlign: "center",
          maxWidth: "600px",
        }}
        data-testid="asset-library-empty-state"
      >
        <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>&#x1F4C2;</div>
        <p style={{ fontSize: "0.875rem", color: "#475569", margin: "0 0 0.5rem" }}>
          Varlik Kutuphanesi henuz aktif degil.
        </p>
        <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: 0, lineHeight: 1.5 }}>
          Bu modul, media dosyalarinin (muzik, font, gorsel, overlay vb.) backend
          tarafindan yonetilmesini gerektirir. Backend asset ingestion ve dosya
          yukleme altyapisi mevcut degil — bu alan desteklenmiyor (unsupported).
        </p>
        <div
          style={{
            marginTop: "1rem",
            padding: "0.5rem 0.75rem",
            background: "#fef2f2",
            borderRadius: "4px",
            display: "inline-block",
            fontSize: "0.6875rem",
            color: "#991b1b",
          }}
          data-testid="asset-library-unsupported-badge"
        >
          Desteklenmiyor — Backend asset altyapisi mevcut degil
        </div>
      </div>
    </div>
  );
}
