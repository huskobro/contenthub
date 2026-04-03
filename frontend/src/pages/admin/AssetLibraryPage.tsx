import { useState } from "react";

const SECTION: React.CSSProperties = {
  marginBottom: "1.5rem",
};

const SUBTITLE: React.CSSProperties = {
  margin: "0 0 0.25rem",
  fontSize: "0.8125rem",
  color: "#94a3b8",
  lineHeight: 1.5,
  maxWidth: "640px",
};

const WORKFLOW_NOTE: React.CSSProperties = {
  margin: "0 0 1.25rem",
  fontSize: "0.75rem",
  color: "#94a3b8",
  lineHeight: 1.4,
  maxWidth: "640px",
};

const FILTER_ROW: React.CSSProperties = {
  display: "flex",
  gap: "0.75rem",
  flexWrap: "wrap",
  alignItems: "center",
  padding: "0.75rem 1rem",
  background: "#fafbfc",
  border: "1px solid #e2e8f0",
  borderRadius: "6px",
  marginBottom: "0.5rem",
};

const FILTER_INPUT: React.CSSProperties = {
  padding: "0.375rem 0.5rem",
  border: "1px solid #e2e8f0",
  borderRadius: "4px",
  fontSize: "0.8125rem",
  background: "#fff",
  minWidth: "160px",
};

const FILTER_SELECT: React.CSSProperties = {
  padding: "0.375rem 0.5rem",
  border: "1px solid #e2e8f0",
  borderRadius: "4px",
  fontSize: "0.8125rem",
  background: "#fff",
};

const TABLE: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "0.8125rem",
};

const TH: React.CSSProperties = {
  textAlign: "left",
  padding: "0.5rem 0.75rem",
  borderBottom: "2px solid #e2e8f0",
  color: "#64748b",
  fontWeight: 600,
  fontSize: "0.75rem",
};

const TD: React.CSSProperties = {
  padding: "0.5rem 0.75rem",
  borderBottom: "1px solid #f1f5f9",
  verticalAlign: "top",
};

const TYPE_BADGE: React.CSSProperties = {
  display: "inline-block",
  padding: "0.125rem 0.5rem",
  borderRadius: "9999px",
  fontSize: "0.6875rem",
  fontWeight: 600,
};

const DETAIL_PANEL: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  padding: "1rem 1.25rem",
};

const DETAIL_HEADING: React.CSSProperties = {
  margin: "0 0 0.75rem",
  fontSize: "0.9375rem",
  fontWeight: 600,
  color: "#0f172a",
};

const DETAIL_ROW: React.CSSProperties = {
  display: "flex",
  gap: "0.5rem",
  marginBottom: "0.5rem",
  fontSize: "0.8125rem",
};

const DETAIL_LABEL: React.CSSProperties = {
  color: "#94a3b8",
  minWidth: "120px",
  flexShrink: 0,
};

const DETAIL_VALUE: React.CSSProperties = {
  color: "#0f172a",
  wordBreak: "break-word",
};

type AssetType =
  | "muzik"
  | "font"
  | "gorsel"
  | "video_klip"
  | "overlay"
  | "alt_yazi_stili"
  | "thumbnail_referans"
  | "marka_varligi";

interface AssetRow {
  id: string;
  name: string;
  type: AssetType;
  source: string;
  status: "hazir" | "taslak" | "arsiv";
  preview: boolean;
  notes: string;
}

const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  muzik: "Muzik / Ses",
  font: "Font / Tipografi",
  gorsel: "Gorsel / Fotograf",
  video_klip: "Video Klibi",
  overlay: "Overlay / Lower-Third",
  alt_yazi_stili: "Altyazi Stili",
  thumbnail_referans: "Thumbnail Referans",
  marka_varligi: "Marka Varligi",
};

const ASSET_TYPE_COLORS: Record<AssetType, { background: string; color: string }> = {
  muzik: { background: "#fef3c7", color: "#92400e" },
  font: { background: "#ede9fe", color: "#5b21b6" },
  gorsel: { background: "#dcfce7", color: "#166534" },
  video_klip: { background: "#dbeafe", color: "#1e40af" },
  overlay: { background: "#fce7f3", color: "#9d174d" },
  alt_yazi_stili: { background: "#f1f5f9", color: "#334155" },
  thumbnail_referans: { background: "#ffedd5", color: "#9a3412" },
  marka_varligi: { background: "#f0fdf4", color: "#14532d" },
};

const TYPE_GROUPS: { label: string; types: AssetType[] }[] = [
  { label: "Ses ve Muzik", types: ["muzik"] },
  { label: "Gorsel Varliklar", types: ["gorsel", "thumbnail_referans"] },
  { label: "Video ve Hareket", types: ["video_klip", "overlay"] },
  { label: "Tipografi ve Altyazi", types: ["font", "alt_yazi_stili"] },
  { label: "Marka Varliklari", types: ["marka_varligi"] },
];

const PLACEHOLDER_ASSETS: AssetRow[] = [
  {
    id: "asset-001",
    name: "Intro Muzigi v1",
    type: "muzik",
    source: "workspace/assets/audio/intro-v1.mp3",
    status: "hazir",
    preview: false,
    notes: "Standart video intro icin kullanilan ses varligi.",
  },
  {
    id: "asset-002",
    name: "Kanal Fontu — Baslik",
    type: "font",
    source: "workspace/assets/fonts/channel-heading.ttf",
    status: "hazir",
    preview: false,
    notes: "Kanal baslik tipografisi. Style blueprint ile iliskilendirilmis.",
  },
  {
    id: "asset-003",
    name: "Kanal Logo Gorseli",
    type: "gorsel",
    source: "workspace/assets/images/channel-logo.png",
    status: "hazir",
    preview: false,
    notes: "Thumbnail ve overlay'lerde kullanilan kanal logosu.",
  },
  {
    id: "asset-004",
    name: "Lower Third — Standart",
    type: "overlay",
    source: "workspace/assets/overlays/lower-third-std.svg",
    status: "taslak",
    preview: true,
    notes: "Alt ucuncu overlaydir. Onizleme olarak isaretlenmistir, final render ciktisi degildir.",
  },
  {
    id: "asset-005",
    name: "Altyazi Stili — Temel",
    type: "alt_yazi_stili",
    source: "workspace/assets/subtitle-styles/basic.json",
    status: "hazir",
    preview: true,
    notes: "Temel altyazi stili ornek/referansi. Bu bir onizleme referansidir.",
  },
  {
    id: "asset-006",
    name: "Thumbnail Arka Plan — Koyu",
    type: "thumbnail_referans",
    source: "workspace/assets/thumbnails/bg-dark.jpg",
    status: "hazir",
    preview: true,
    notes: "Thumbnail tasarim referansi. Onizleme amaclidir; garantili final cikti degildir.",
  },
];

function statusColor(status: AssetRow["status"]): React.CSSProperties {
  switch (status) {
    case "hazir":
      return { background: "#dcfce7", color: "#166534" };
    case "taslak":
      return { background: "#f1f5f9", color: "#475569" };
    case "arsiv":
      return { background: "#fef2f2", color: "#991b1b" };
  }
}

function statusLabel(status: AssetRow["status"]): string {
  switch (status) {
    case "hazir":
      return "Hazir";
    case "taslak":
      return "Taslak";
    case "arsiv":
      return "Arsiv";
  }
}

export function AssetLibraryPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("tumu");
  const [search, setSearch] = useState<string>("");

  const filtered = PLACEHOLDER_ASSETS.filter((a) => {
    const matchType = typeFilter === "tumu" || a.type === typeFilter;
    const matchSearch =
      search.trim() === "" ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.source.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const selected = PLACEHOLDER_ASSETS.find((a) => a.id === selectedId) ?? null;

  return (
    <div>
      {/* Heading */}
      <h2 data-testid="asset-library-heading" style={{ margin: "0 0 0.25rem" }}>
        Varlik Kutuphanesi
      </h2>
      <p style={SUBTITLE} data-testid="asset-library-subtitle">
        Uretim altyapisini destekleyen media ve tasarim varliklarinin yonetim yüzeyi.
        Muzik, font, gorsel, video klip, overlay, altyazi stili ve thumbnail referanslari
        bu alanda kataloglanir.
      </p>
      <p style={WORKFLOW_NOTE} data-testid="asset-library-workflow-note">
        Varlik akis zinciri: Varlik Kaydı → Tur Gruplama → Hazirlik Kontrolu → Uretim Akisina
        Baglama (Sablon / Blueprint / Thumbnail / Altyazi) → Tekrar Kullanim.
      </p>

      {/* Deferred backend note */}
      <p
        style={{ margin: "-0.75rem 0 1.25rem", fontSize: "0.6875rem", color: "#cbd5e1" }}
        data-testid="asset-library-deferred-note"
      >
        Gercek media ingestion, dosya yukleme ve binary onizleme motoru backend entegrasyonu
        ile etkinlestirilecektir. Mevcut kayitlar omurga duzeyinde placeholder/referans
        olarak gosterilmektedir.
      </p>

      {/* Asset Type Grouping Overview */}
      <div style={SECTION} data-testid="asset-type-groups">
        <h3
          style={{ margin: "0 0 0.5rem", fontSize: "1rem", fontWeight: 600, color: "#1e293b" }}
          data-testid="asset-type-groups-heading"
        >
          Varlik Turleri
        </h3>
        <p
          style={{ margin: "0 0 0.75rem", fontSize: "0.75rem", color: "#94a3b8" }}
          data-testid="asset-type-groups-note"
        >
          Varliklar amaclarina gore gruplara ayrilmistir. Her tur, uretim akisinin farkli
          bir yuzeyinde kullanilir.
        </p>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.5rem",
          }}
          data-testid="asset-type-group-list"
        >
          {TYPE_GROUPS.map((group) => (
            <div
              key={group.label}
              style={{
                padding: "0.5rem 0.75rem",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "6px",
                fontSize: "0.75rem",
              }}
              data-testid={`asset-type-group-${group.label.replace(/\s+/g, "-").toLowerCase()}`}
            >
              <span style={{ fontWeight: 600, color: "#334155" }}>{group.label}</span>
              <span style={{ color: "#94a3b8", marginLeft: "0.5rem" }}>
                ({group.types.map((t) => ASSET_TYPE_LABELS[t]).join(", ")})
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Filter / Sort / Search */}
      <div style={SECTION} data-testid="asset-filter-area">
        <h3
          style={{ margin: "0 0 0.5rem", fontSize: "1rem", fontWeight: 600, color: "#1e293b" }}
          data-testid="asset-filter-heading"
        >
          Filtre ve Arama
        </h3>
        <div style={FILTER_ROW}>
          <div>
            <label
              style={{ fontSize: "0.75rem", color: "#64748b", display: "block", marginBottom: "0.25rem" }}
              htmlFor="asset-search-input"
            >
              Ara
            </label>
            <input
              id="asset-search-input"
              style={FILTER_INPUT}
              placeholder="Varlik adi veya yolu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="asset-search-input"
            />
          </div>
          <div>
            <label
              style={{ fontSize: "0.75rem", color: "#64748b", display: "block", marginBottom: "0.25rem" }}
              htmlFor="asset-type-filter"
            >
              Tur
            </label>
            <select
              id="asset-type-filter"
              style={FILTER_SELECT}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              data-testid="asset-type-filter"
            >
              <option value="tumu">Tumu</option>
              {(Object.keys(ASSET_TYPE_LABELS) as AssetType[]).map((t) => (
                <option key={t} value={t}>
                  {ASSET_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              style={{ fontSize: "0.75rem", color: "#64748b", display: "block", marginBottom: "0.25rem" }}
              htmlFor="asset-sort-select"
            >
              Sirala
            </label>
            <select
              id="asset-sort-select"
              style={FILTER_SELECT}
              disabled
              data-testid="asset-sort-select"
            >
              <option>En yeni</option>
              <option>A-Z</option>
            </select>
          </div>
        </div>
        <p
          style={{ margin: 0, fontSize: "0.6875rem", color: "#cbd5e1" }}
          data-testid="asset-filter-note"
        >
          Tur ve arama filtreleri aktif. Siralama backend entegrasyonu ile etkinlestirilecektir.
        </p>
      </div>

      {/* Asset Registry / List */}
      <div style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start" }}>
        {/* Table */}
        <div style={{ flex: 2, minWidth: 0 }} data-testid="asset-registry-list">
          <h3
            style={{ margin: "0 0 0.25rem", fontSize: "1rem", fontWeight: 600, color: "#1e293b" }}
            data-testid="asset-registry-heading"
          >
            Varlik Kayitlari
          </h3>
          <p
            style={{ margin: "0 0 0.75rem", fontSize: "0.75rem", color: "#94a3b8" }}
            data-testid="asset-registry-note"
          >
            Kataloglanmis varliklar. Bir varliga tiklayarak detay ve kullanim bilgilerini
            gorebilirsiniz.
          </p>

          {filtered.length === 0 ? (
            <p
              style={{ color: "#94a3b8", fontSize: "0.8125rem" }}
              data-testid="asset-empty-state"
            >
              Secili kriterlere uyan varlik bulunamadi. Filtreyi degistirmeyi deneyin.
            </p>
          ) : (
            <table style={TABLE} data-testid="asset-table">
              <thead>
                <tr>
                  <th style={TH}>Ad</th>
                  <th style={TH}>Tur</th>
                  <th style={TH}>Durum</th>
                  <th style={TH}>Onizleme</th>
                  <th style={TH}>Kaynak</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((asset) => (
                  <tr
                    key={asset.id}
                    style={{
                      cursor: "pointer",
                      background: selectedId === asset.id ? "#f0f9ff" : "transparent",
                    }}
                    onClick={() => setSelectedId(asset.id === selectedId ? null : asset.id)}
                    data-testid={`asset-row-${asset.id}`}
                  >
                    <td style={TD}>
                      <span style={{ fontWeight: selectedId === asset.id ? 600 : 400 }}>
                        {asset.name}
                      </span>
                    </td>
                    <td style={TD}>
                      <span
                        style={{ ...TYPE_BADGE, ...ASSET_TYPE_COLORS[asset.type] }}
                        data-testid={`asset-type-badge-${asset.id}`}
                      >
                        {ASSET_TYPE_LABELS[asset.type]}
                      </span>
                    </td>
                    <td style={TD}>
                      <span style={{ ...TYPE_BADGE, ...statusColor(asset.status) }}>
                        {statusLabel(asset.status)}
                      </span>
                    </td>
                    <td style={TD}>
                      {asset.preview ? (
                        <span
                          style={{ fontSize: "0.6875rem", color: "#f59e0b", fontWeight: 600 }}
                          data-testid={`asset-preview-badge-${asset.id}`}
                        >
                          Onizleme
                        </span>
                      ) : (
                        <span style={{ fontSize: "0.6875rem", color: "#94a3b8" }}>—</span>
                      )}
                    </td>
                    <td style={{ ...TD, maxWidth: "200px" }}>
                      <span
                        style={{ fontSize: "0.6875rem", color: "#64748b", wordBreak: "break-all" }}
                      >
                        {asset.source}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Detail Panel */}
        <div style={{ flex: 1, minWidth: "260px" }}>
          {selected ? (
            <div style={DETAIL_PANEL} data-testid="asset-detail-panel">
              <h3 style={DETAIL_HEADING} data-testid="asset-detail-heading">
                Varlik Detayi
              </h3>

              <div style={DETAIL_ROW}>
                <span style={DETAIL_LABEL}>Ad</span>
                <span style={DETAIL_VALUE} data-testid="asset-detail-name">{selected.name}</span>
              </div>
              <div style={DETAIL_ROW}>
                <span style={DETAIL_LABEL}>Tur</span>
                <span style={DETAIL_VALUE} data-testid="asset-detail-type">
                  <span style={{ ...TYPE_BADGE, ...ASSET_TYPE_COLORS[selected.type] }}>
                    {ASSET_TYPE_LABELS[selected.type]}
                  </span>
                </span>
              </div>
              <div style={DETAIL_ROW}>
                <span style={DETAIL_LABEL}>Durum</span>
                <span style={DETAIL_VALUE} data-testid="asset-detail-status">
                  <span style={{ ...TYPE_BADGE, ...statusColor(selected.status) }}>
                    {statusLabel(selected.status)}
                  </span>
                </span>
              </div>
              <div style={DETAIL_ROW}>
                <span style={DETAIL_LABEL}>Kaynak / Yol</span>
                <span
                  style={{ ...DETAIL_VALUE, fontSize: "0.75rem", color: "#64748b" }}
                  data-testid="asset-detail-source"
                >
                  {selected.source}
                </span>
              </div>

              {/* Preview Safety */}
              {selected.preview && (
                <div
                  style={{
                    margin: "0.75rem 0",
                    padding: "0.5rem 0.75rem",
                    background: "#fffbeb",
                    border: "1px solid #fcd34d",
                    borderRadius: "4px",
                    fontSize: "0.75rem",
                    color: "#92400e",
                  }}
                  data-testid="asset-preview-safety-note"
                >
                  Bu varlik bir onizleme veya referans olarak isaretlenmistir. Final
                  render ciktisi veya garantili uretim varligi degildir. Onizleme ile
                  final ciktiyi karistirmayin.
                </div>
              )}

              <div style={DETAIL_ROW}>
                <span style={DETAIL_LABEL}>Notlar</span>
                <span style={DETAIL_VALUE} data-testid="asset-detail-notes">{selected.notes}</span>
              </div>

              {/* Reuse / Pick / Attach context */}
              <div
                style={{
                  marginTop: "1rem",
                  padding: "0.75rem",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "6px",
                }}
                data-testid="asset-reuse-context"
              >
                <p
                  style={{ margin: "0 0 0.25rem", fontSize: "0.75rem", fontWeight: 600, color: "#334155" }}
                  data-testid="asset-reuse-heading"
                >
                  Kullanim Baglami
                </p>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "#64748b" }} data-testid="asset-reuse-note">
                  Bu varlik; sablon, style blueprint, thumbnail tasarimi, altyazi stili
                  veya video uretim akisinda kullanilabilir. Ilgili yuzeylerde bu
                  varligi secerek uretim hattina baglayabilirsiniz.
                </p>
                <p
                  style={{ margin: "0.5rem 0 0", fontSize: "0.6875rem", color: "#cbd5e1" }}
                  data-testid="asset-attach-deferred-note"
                >
                  Dogrudan ekleme / atama akisi backend entegrasyonu ile etkinlestirilecektir.
                </p>
              </div>
            </div>
          ) : (
            <div
              style={{
                ...DETAIL_PANEL,
                color: "#94a3b8",
                fontSize: "0.8125rem",
              }}
              data-testid="asset-detail-panel-empty"
            >
              <p style={{ margin: 0 }} data-testid="asset-detail-panel-empty-note">
                Detay ve kullanim bilgilerini gormek icin listeden bir varlik secin.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Preview / Reference Safety global note */}
      <div
        style={{
          marginTop: "1.5rem",
          padding: "0.75rem 1rem",
          background: "#fffbeb",
          border: "1px solid #fcd34d",
          borderRadius: "6px",
          fontSize: "0.75rem",
          color: "#92400e",
          maxWidth: "720px",
        }}
        data-testid="asset-preview-reference-safety"
      >
        <strong>Onizleme / Referans Guvenlik Notu:</strong> "Onizleme" olarak isaretlenen
        varliklar yalnizca tasarim referansi veya hafif kompozisyon onizlemesi icin
        kullanilir. Bu varliklar garantili final render cikti degildir ve final uretim
        sonuclarindan ayri tutulacaktir.
      </div>
    </div>
  );
}
