import { Link } from "react-router-dom";

const SUBTITLE: React.CSSProperties = {
  margin: "0 0 0.5rem",
  fontSize: "0.8125rem",
  color: "#94a3b8",
  lineHeight: 1.5,
  maxWidth: "640px",
};

const SECTION: React.CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: "6px",
  background: "#fafbfc",
  padding: "1rem",
  marginBottom: "1.5rem",
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
  color: "#334155",
};

export function AnalyticsContentPage() {
  return (
    <div>
      <div style={{ marginBottom: "1rem" }}>
        <Link
          to="/admin/analytics"
          style={{ fontSize: "0.875rem", color: "#3b82f6", textDecoration: "none" }}
        >
          ← Analytics'e don
        </Link>
      </div>

      <h2
        style={{ margin: "0 0 0.25rem", fontSize: "1.125rem", fontWeight: 600 }}
        data-testid="analytics-content-heading"
      >
        Icerik Performansi
      </h2>
      <p style={SUBTITLE} data-testid="analytics-content-subtitle">
        Video bazinda uretim ve yayin performansini buradan takip edebilirsiniz.
        Her icerik ogesinin uretim sureci, yayin durumu ve sonuclari gorunur.
        Bu sayfa kullanim ve performans ozetinin temelini olusturur.
      </p>
      <p
        style={{
          margin: "0 0 1.5rem",
          fontSize: "0.8125rem",
          color: "#94a3b8",
          lineHeight: 1.5,
          maxWidth: "640px",
        }}
        data-testid="analytics-content-workflow-note"
      >
        Kullanim/performans rapor zinciri: Modul Dagilimi → Icerik Uretim
        Orani → Yayin Basarisi → Sablon/Kaynak Etkisi → Verimlilik Ozeti.
        Detayli video performansi icin ilgili standard video detay sayfasina
        basvurabilirsiniz.
      </p>

      {/* Video-level performance — Phase 295 */}
      <div style={SECTION} data-testid="analytics-video-performance">
        <h3 style={{ margin: "0 0 0.25rem", fontSize: "1rem" }} data-testid="video-performance-heading">
          Video Performans Tablosu
        </h3>
        <p
          style={{ margin: "0 0 0.75rem", fontSize: "0.75rem", color: "#94a3b8" }}
          data-testid="video-performance-note"
        >
          Her videonun uretim ve yayin durumunu gosteren ozet tablo. Backend
          analytics modulu aktif olunca gercek verilerle dolacaktir.
        </p>
        <table style={TABLE}>
          <thead>
            <tr>
              <th style={TH}>Icerik</th>
              <th style={TH}>Modul</th>
              <th style={TH}>Uretim Durumu</th>
              <th style={TH}>Yayin Durumu</th>
              <th style={TH}>Sure</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={TD} colSpan={5}>
                <em style={{ color: "#94a3b8" }} data-testid="video-performance-empty">
                  Henuz icerik performans verisi bulunmuyor. Uretim ve yayin tamamlandiginda
                  veriler burada gorunecektir.
                </em>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Module distribution */}
      <div style={SECTION} data-testid="analytics-module-distribution">
        <h3 style={{ margin: "0 0 0.25rem", fontSize: "1rem" }} data-testid="module-distribution-heading">
          Modul Dagilimi
        </h3>
        <p
          style={{ margin: "0 0 0.75rem", fontSize: "0.75rem", color: "#94a3b8" }}
          data-testid="module-distribution-note"
        >
          Icerik uretiminin modullere gore dagilimi. Hangi modul daha yogun
          kullaniliyor, hangi modulde daha fazla hata olusuyor gorunur.
          Modul bazli verimlilik karari icin bu dagilimi kullanabilirsiniz.
        </p>
        <p style={{ fontSize: "0.8125rem", color: "#94a3b8" }}>
          <em>Modul dagilim verileri analytics backend aktif olunca gorunecektir.</em>
        </p>
      </div>
    </div>
  );
}
