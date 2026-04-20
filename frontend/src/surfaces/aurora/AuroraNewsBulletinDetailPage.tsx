/**
 * AuroraNewsBulletinDetailPage — Aurora Dusk Cockpit / Haber Bülteni Detayı (admin).
 *
 * Direct port of `docs/aurora-design-source/project/contenthub/pages/admin/news-bulletin-detail.html`.
 * Tasarım hedefi:
 *   - Page-head (başlık + alt başlık (BLT id · news_bulletin) + status chip + aksiyonlar)
 *   - Tab bar (Genel / Haberler / Senaryo / Metadata)
 *   - Inspector: status, scheduled_at, total selected items, script word count,
 *     kullanılmış kaynak listesi
 *
 * Veri kaynakları:
 *   - useNewsBulletinDetail(id) — NewsBulletinResponse
 *   - useNewsBulletinScript(id) — NewsBulletinScriptResponse | null
 *   - useNewsBulletinSelectedItems(id) — NewsBulletinSelectedItemResponse[]
 *   - useQuery(metadata) — NewsBulletinMetadataResponse | null
 *
 * Aksiyonlar:
 *   - Wizard ile düzenle (status: draft / selection_confirmed)
 *   - Üretimi başlat (job)
 *   - Klonla
 *   - Listeye dön
 *
 * Hiçbir legacy code değiştirilmez; surface override sistemi tarafından
 * `admin.news-bulletins.detail` slot'una kayıtlı.
 */
import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNewsBulletinDetail } from "../../hooks/useNewsBulletinDetail";
import { useNewsBulletinScript } from "../../hooks/useNewsBulletinScript";
import { useNewsBulletinSelectedItems } from "../../hooks/useNewsBulletinSelectedItems";
import {
  fetchNewsBulletinMetadata,
  startBulletinProduction,
  cloneNewsBulletin,
  type NewsBulletinResponse,
} from "../../api/newsBulletinApi";
import { useToast } from "../../hooks/useToast";
import {
  AuroraButton,
  AuroraInspector,
  AuroraInspectorSection,
  AuroraInspectorRow,
} from "./primitives";
import { Icon } from "./icons";

type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";

const STATUS_LABEL: Record<string, string> = {
  draft: "taslak",
  selection_confirmed: "seçim onaylı",
  in_progress: "üretiliyor",
  rendering: "render",
  done: "tamamlandı",
  failed: "başarısız",
};

const STATUS_TONE: Record<string, StatusTone> = {
  draft: "neutral",
  selection_confirmed: "warning",
  in_progress: "info",
  rendering: "info",
  done: "success",
  failed: "danger",
};

const TONE_FG: Record<StatusTone, string> = {
  neutral: "var(--text-muted)",
  info: "var(--state-info-fg)",
  success: "var(--state-success-fg)",
  warning: "var(--state-warning-fg)",
  danger: "var(--state-danger-fg)",
};

function statusLabel(s: string | null | undefined): string {
  if (!s) return "—";
  return STATUS_LABEL[s] ?? s;
}

function statusTone(s: string | null | undefined): StatusTone {
  if (!s) return "neutral";
  return STATUS_TONE[s] ?? "neutral";
}

function fmtFull(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("tr-TR");
  } catch {
    return "—";
  }
}

function shortId(id: string | null | undefined): string {
  if (!id) return "—";
  return id.slice(0, 8).toUpperCase();
}

function wordCount(text: string | null | undefined): number {
  if (!text) return 0;
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function renderModeLabel(mode: string | null | undefined): string {
  switch (mode) {
    case "per_item":
      return "Haber Başına";
    case "per_category":
      return "Kategori Başına";
    case "combined":
      return "Tek Video";
    default:
      return "—";
  }
}

type TabId = "overview" | "news" | "script" | "metadata";

export function AuroraNewsBulletinDetailPage() {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const id = itemId ?? null;

  const detailQ = useNewsBulletinDetail(id);
  const scriptQ = useNewsBulletinScript(id);
  const itemsQ = useNewsBulletinSelectedItems(id ?? "");
  const metaQ = useQuery({
    queryKey: ["news-bulletin-metadata", id],
    queryFn: () => fetchNewsBulletinMetadata(id!),
    enabled: !!id,
  });

  const [tab, setTab] = useState<TabId>("overview");

  const bulletin: NewsBulletinResponse | undefined = detailQ.data;
  const script = scriptQ.data ?? null;
  const items = itemsQ.data ?? [];
  const metadata = metaQ.data ?? null;

  const usedSources = useMemo(() => {
    const map = new Map<string, number>();
    for (const it of items) {
      const k = it.news_category || "—";
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [items]);

  const startProd = useMutation({
    mutationFn: () => startBulletinProduction(id!),
    onSuccess: (resp) => {
      toast.success("Üretim başlatıldı");
      queryClient.invalidateQueries({ queryKey: ["news-bulletins", id] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      if (resp.job_id) navigate(`/admin/jobs/${resp.job_id}`);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Üretim başlatılamadı";
      toast.error(msg);
    },
  });

  const cloneMut = useMutation({
    mutationFn: () => cloneNewsBulletin(id!),
    onSuccess: () => {
      toast.success("Bülten klonlandı");
      queryClient.invalidateQueries({ queryKey: ["news-bulletins"] });
      queryClient.invalidateQueries({ queryKey: ["content-library"] });
    },
    onError: () => toast.error("Klonlama başarısız"),
  });

  // ─────────────────────── Loading / error states ───────────────────────
  if (!id) {
    return (
      <div className="aurora-dashboard">
        <div className="page">
          <div
            className="card card-pad"
            style={{ textAlign: "center", color: "var(--state-danger-fg)" }}
          >
            Geçersiz bülten kimliği.
          </div>
        </div>
      </div>
    );
  }

  if (detailQ.isLoading) {
    return (
      <div className="aurora-dashboard">
        <div className="page">
          <div
            className="card card-pad"
            style={{ textAlign: "center", color: "var(--text-muted)" }}
          >
            Yükleniyor…
          </div>
        </div>
      </div>
    );
  }

  if (detailQ.isError || !bulletin) {
    return (
      <div className="aurora-dashboard">
        <div className="page">
          <div
            className="card card-pad"
            style={{
              textAlign: "center",
              color: "var(--state-danger-fg)",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
            }}
          >
            {detailQ.isError
              ? `Hata: ${detailQ.error instanceof Error ? detailQ.error.message : "Bilinmeyen hata"}`
              : "Bülten bulunamadı."}
          </div>
        </div>
      </div>
    );
  }

  const tone = statusTone(bulletin.status);
  const toneFg = TONE_FG[tone];

  const canEdit =
    bulletin.status === "draft" || bulletin.status === "selection_confirmed";
  const canStartProd =
    bulletin.status === "selection_confirmed" || bulletin.status === "draft";

  // ─────────────────────── Inspector ───────────────────────
  const inspector = (
    <AuroraInspector title={shortId(bulletin.id)}>
      <AuroraInspectorSection title="Meta">
        <AuroraInspectorRow label="modül" value="news_bulletin" />
        <AuroraInspectorRow
          label="durum"
          value={
            <span style={{ color: toneFg }}>{statusLabel(bulletin.status)}</span>
          }
        />
        <AuroraInspectorRow
          label="dil"
          value={bulletin.language ?? "—"}
        />
        <AuroraInspectorRow label="ton" value={bulletin.tone ?? "—"} />
        <AuroraInspectorRow
          label="render"
          value={renderModeLabel(bulletin.render_mode)}
        />
      </AuroraInspectorSection>

      <AuroraInspectorSection title="Seçim">
        <AuroraInspectorRow
          label="seçili haber"
          value={String(items.length)}
        />
        <AuroraInspectorRow
          label="kaynak sayısı"
          value={String(bulletin.selected_news_source_count ?? usedSources.length)}
        />
        {bulletin.has_selected_news_warning && (
          <AuroraInspectorRow
            label="uyarı"
            value={
              <span style={{ color: "var(--state-warning-fg)" }}>
                {bulletin.selected_news_warning_count ?? 0}
              </span>
            }
          />
        )}
      </AuroraInspectorSection>

      <AuroraInspectorSection title="Senaryo">
        <AuroraInspectorRow
          label="kelime"
          value={String(wordCount(script?.content))}
        />
        <AuroraInspectorRow
          label="versiyon"
          value={script ? `v${script.version}` : "—"}
        />
      </AuroraInspectorSection>

      {usedSources.length > 0 && (
        <AuroraInspectorSection title="Kategoriler">
          {usedSources.slice(0, 6).map(([cat, count]) => (
            <AuroraInspectorRow key={cat} label={cat} value={String(count)} />
          ))}
        </AuroraInspectorSection>
      )}

      <AuroraInspectorSection title="Tarih">
        <AuroraInspectorRow
          label="oluşturuldu"
          value={fmtFull(bulletin.created_at)}
        />
        <AuroraInspectorRow
          label="güncellendi"
          value={fmtFull(bulletin.updated_at)}
        />
      </AuroraInspectorSection>

      <AuroraInspectorSection title="Eylemler">
        {canEdit && (
          <AuroraButton
            variant="primary"
            size="sm"
            onClick={() =>
              navigate(`/admin/news-bulletins/wizard?bulletinId=${bulletin.id}`)
            }
            style={{ width: "100%", marginBottom: 6 }}
            iconLeft={<Icon name="sliders" size={11} />}
          >
            Wizard ile düzenle
          </AuroraButton>
        )}
        {canStartProd && (
          <AuroraButton
            variant="secondary"
            size="sm"
            onClick={() => startProd.mutate()}
            disabled={startProd.isPending}
            style={{ width: "100%", marginBottom: 6 }}
            iconLeft={<Icon name="play" size={11} />}
          >
            {startProd.isPending ? "Başlatılıyor…" : "Üretimi başlat"}
          </AuroraButton>
        )}
        {bulletin.job_id && (
          <AuroraButton
            variant="secondary"
            size="sm"
            onClick={() => navigate(`/admin/jobs/${bulletin.job_id}`)}
            style={{ width: "100%", marginBottom: 6 }}
            iconLeft={<Icon name="film" size={11} />}
          >
            İş detayı
          </AuroraButton>
        )}
        <AuroraButton
          variant="ghost"
          size="sm"
          onClick={() => cloneMut.mutate()}
          disabled={cloneMut.isPending}
          style={{ width: "100%", marginBottom: 6 }}
          iconLeft={<Icon name="plus" size={11} />}
        >
          {cloneMut.isPending ? "Klonlanıyor…" : "Klonla"}
        </AuroraButton>
        <AuroraButton
          variant="ghost"
          size="sm"
          onClick={() => navigate("/admin/news-bulletins")}
          style={{ width: "100%" }}
          iconLeft={<Icon name="arrow-left" size={11} />}
        >
          Listeye dön
        </AuroraButton>
      </AuroraInspectorSection>
    </AuroraInspector>
  );

  // ─────────────────────── Page body ───────────────────────
  const headTitle = bulletin.title || bulletin.topic || "İsimsiz Bülten";
  const subId = `BLT-${bulletin.id.slice(0, 8).toUpperCase()}`;

  return (
    <div className="aurora-dashboard">
      <div className="page">
        <div className="page-head">
          <div>
            <h1>{headTitle}</h1>
            <div
              className="sub"
              style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}
            >
              {subId} · news_bulletin
              {" · "}
              <span style={{ color: toneFg }}>{statusLabel(bulletin.status)}</span>
            </div>
          </div>
          <div className="hstack" style={{ gap: 8 }}>
            {canEdit && (
              <AuroraButton
                variant="secondary"
                size="sm"
                onClick={() =>
                  navigate(`/admin/news-bulletins/wizard?bulletinId=${bulletin.id}`)
                }
                iconLeft={<Icon name="sliders" size={11} />}
              >
                Düzenle
              </AuroraButton>
            )}
            {canStartProd && (
              <AuroraButton
                variant="primary"
                size="sm"
                onClick={() => startProd.mutate()}
                disabled={startProd.isPending}
                iconLeft={<Icon name="play" size={11} />}
              >
                {startProd.isPending ? "Başlatılıyor…" : "Üretimi başlat"}
              </AuroraButton>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: 2,
            borderBottom: "1px solid var(--border-subtle)",
            marginBottom: 16,
          }}
        >
          {(
            [
              ["overview", "Genel"],
              ["news", `Haberler (${items.length})`],
              ["script", "Senaryo"],
              ["metadata", "Metadata"],
            ] as Array<[TabId, string]>
          ).map(([tabId, label]) => (
            <button
              key={tabId}
              type="button"
              onClick={() => setTab(tabId)}
              style={{
                padding: "10px 14px",
                fontSize: 12,
                fontWeight: 500,
                background: "none",
                border: "none",
                borderBottom:
                  "2px solid " +
                  (tab === tabId ? "var(--accent-primary)" : "transparent"),
                color:
                  tab === tabId
                    ? "var(--accent-primary-hover)"
                    : "var(--text-muted)",
                cursor: "pointer",
                fontFamily: "inherit",
                marginBottom: -1,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="grid g-2" style={{ gap: 14 }}>
            <div className="card card-pad">
              <div className="overline" style={{ marginBottom: 10 }}>
                Bilgiler
              </div>
              {(
                [
                  ["durum", statusLabel(bulletin.status)],
                  ["konu", bulletin.topic ?? "—"],
                  ["dil", bulletin.language ?? "—"],
                  ["ton", bulletin.tone ?? "—"],
                  ["bülten stili", bulletin.bulletin_style ?? "—"],
                  ["render modu", renderModeLabel(bulletin.render_mode)],
                  [
                    "hedef süre",
                    bulletin.target_duration_seconds != null
                      ? `${bulletin.target_duration_seconds}s`
                      : "—",
                  ],
                  ["seçili haber", String(items.length)],
                  ["kaynak", String(bulletin.selected_news_source_count ?? usedSources.length)],
                ] as Array<[string, string]>
              ).map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    display: "flex",
                    gap: 10,
                    padding: "6px 0",
                    borderBottom: "1px solid var(--border-subtle)",
                    fontSize: 11,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: "var(--text-muted)",
                      flex: 1,
                    }}
                  >
                    {k}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: "var(--text-primary)",
                    }}
                  >
                    {v}
                  </span>
                </div>
              ))}
            </div>

            <div className="card card-pad">
              <div className="overline" style={{ marginBottom: 10 }}>
                Stil & İş
              </div>
              {(
                [
                  ["altyazı", bulletin.subtitle_style ?? "—"],
                  ["lower-third", bulletin.lower_third_style ?? "—"],
                  ["kompozisyon", bulletin.composition_direction ?? "—"],
                  ["thumbnail", bulletin.thumbnail_direction ?? "—"],
                  [
                    "blueprint",
                    bulletin.style_blueprint_id
                      ? shortId(bulletin.style_blueprint_id)
                      : "—",
                  ],
                  [
                    "şablon",
                    bulletin.template_id ? shortId(bulletin.template_id) : "—",
                  ],
                  [
                    "trust",
                    bulletin.trust_enforcement_level ?? "warn",
                  ],
                  ["job", bulletin.job_id ? shortId(bulletin.job_id) : "—"],
                ] as Array<[string, string]>
              ).map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    display: "flex",
                    gap: 10,
                    padding: "6px 0",
                    borderBottom: "1px solid var(--border-subtle)",
                    fontSize: 11,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: "var(--text-muted)",
                      flex: 1,
                    }}
                  >
                    {k}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: "var(--text-primary)",
                    }}
                  >
                    {v}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "news" && (
          <div className="card">
            {itemsQ.isLoading && (
              <div
                style={{
                  padding: 16,
                  fontSize: 12,
                  color: "var(--text-muted)",
                }}
              >
                Yükleniyor…
              </div>
            )}
            {!itemsQ.isLoading && items.length === 0 && (
              <div
                style={{
                  padding: 24,
                  fontSize: 12,
                  color: "var(--text-muted)",
                  textAlign: "center",
                }}
              >
                Henüz haber seçilmemiş.
              </div>
            )}
            {items.map((item, i) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "11px 16px",
                  borderBottom:
                    i < items.length - 1
                      ? "1px solid var(--border-subtle)"
                      : "none",
                  fontSize: 12,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    color: "var(--text-muted)",
                    minWidth: 20,
                  }}
                >
                  {i + 1}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 500,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.news_title || shortId(item.news_item_id)}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      color: "var(--text-muted)",
                    }}
                  >
                    {shortId(item.news_item_id)}
                    {item.news_category ? ` · ${item.news_category}` : ""}
                  </div>
                </div>
                {item.used_news_warning ? (
                  <span
                    className="chip"
                    style={{
                      fontSize: 10,
                      height: 18,
                      color: "var(--state-warning-fg)",
                    }}
                  >
                    kullanılmış
                  </span>
                ) : (
                  <span className="chip" style={{ fontSize: 10, height: 18 }}>
                    dahil
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === "script" && (
          <div
            className="card card-pad"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--text-secondary)",
              lineHeight: 1.8,
              background: "var(--bg-inset)",
              whiteSpace: "pre-wrap",
              maxHeight: 480,
              overflow: "auto",
            }}
          >
            {scriptQ.isLoading
              ? "Yükleniyor…"
              : script
                ? script.content
                : "Henüz senaryo oluşturulmamış."}
          </div>
        )}

        {tab === "metadata" && (
          <div className="card card-pad">
            {metaQ.isLoading && (
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Yükleniyor…
              </div>
            )}
            {!metaQ.isLoading && !metadata && (
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Henüz metadata oluşturulmamış.
              </div>
            )}
            {metadata &&
              (
                [
                  ["başlık", metadata.title ?? "—"],
                  ["açıklama", metadata.description ?? "—"],
                  ["kategori", metadata.category ?? "—"],
                  ["dil", metadata.language ?? "—"],
                  ["versiyon", `v${metadata.version}`],
                  ["kaynak", metadata.source_type ?? "—"],
                  ["durum", metadata.generation_status],
                ] as Array<[string, string]>
              ).map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    display: "flex",
                    gap: 10,
                    padding: "9px 0",
                    borderBottom: "1px solid var(--border-subtle)",
                    fontSize: 12,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      color: "var(--text-muted)",
                      minWidth: 120,
                    }}
                  >
                    {k}
                  </span>
                  <span
                    style={{
                      color: "var(--text-primary)",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {v}
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>
      <aside className="aurora-inspector-slot">{inspector}</aside>
    </div>
  );
}
