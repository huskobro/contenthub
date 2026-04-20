/**
 * AuroraNewsItemDetailPage — Aurora Dusk Cockpit / Haber Öğesi Detayı (admin).
 *
 * Pilot reference: AuroraSourcesRegistryPage + AuroraNewsItemsRegistryPage.
 *
 * Tasarım hedefi:
 *   - Page-head: başlık (büyük) + kaynak chip + aksiyonlar (kullanılmış işaretle,
 *     kaynak URL'i aç, geri dön)
 *   - Ana içerik: title, summary, body (raw_payload_json içinden çıkarılır),
 *     metadata grid (kaynak, yayın tarihi, dil, kategori, dedupe key)
 *   - Inspector: ID (mono), source_id link, durum / trust chip, kullanım kayıtları
 *     listesi, kullanım sayısı KPI
 *
 * Veri kaynakları:
 *   - useNewsItemDetail(id) — ana NewsItemResponse
 *   - useSourcesList() — trust_level + kaynak adı join
 *   - useUsedNewsList() — bu öğeye bağlı UsedNews kayıtları (filter)
 *
 * Aksiyonlar:
 *   - "Kullanılmış işaretle" → updateNewsItem({ status: "used" })
 *   - "Arşivle (ignore)" → ignoreNewsItem(id) — status=ignored + audit log
 *     (dedupe kaydı ve kullanım geçmişi korunur, sadece görünürlük arşive düşer).
 *
 * Loading / error / not-found durumları net ayrı kart olarak render edilir.
 *
 * Surface override sistemi tarafından `admin.news-items.detail` slot'una
 * (mevcut değilse de) hazır biçimde export edilir; register.tsx'e bu
 * commit'te dokunulmaz (kullanıcı talimatı).
 */
import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNewsItemDetail } from "../../hooks/useNewsItemDetail";
import { useSourcesList } from "../../hooks/useSourcesList";
import { useUsedNewsList } from "../../hooks/useUsedNewsList";
import { updateNewsItem, ignoreNewsItem } from "../../api/newsItemsApi";
import type { NewsItemResponse } from "../../api/newsItemsApi";
import type { SourceResponse } from "../../api/sourcesApi";
import type { UsedNewsResponse } from "../../api/usedNewsApi";
import { useToast } from "../../hooks/useToast";
import { formatDateTime } from "../../lib/formatDate";
import {
  AuroraButton,
  AuroraInspector,
  AuroraInspectorSection,
  AuroraInspectorRow,
  AuroraStatusChip,
} from "./primitives";
import { Icon } from "./icons";

type TrustLevel = "low" | "medium" | "high" | "unknown";

const TRUST_TONE: Record<TrustLevel, { color: string; label: string }> = {
  high: { color: "var(--state-success-fg)", label: "high" },
  medium: { color: "var(--state-warning-fg)", label: "medium" },
  low: { color: "var(--state-danger-fg)", label: "low" },
  unknown: { color: "var(--text-muted)", label: "—" },
};

function normalizeTrust(raw: string | null | undefined): TrustLevel {
  const v = (raw ?? "").toLowerCase();
  if (v === "high" || v === "medium" || v === "low") return v;
  return "unknown";
}

function shortId(id: string | null | undefined): string {
  if (!id) return "—";
  return id.slice(0, 8).toUpperCase();
}

function isUsedStatus(item: NewsItemResponse): boolean {
  const status = (item.status ?? "").toLowerCase();
  return (
    status === "used" ||
    (item.usage_count ?? 0) > 0 ||
    !!item.has_published_used_news_link
  );
}

/**
 * raw_payload_json içinden olası gövde alanlarını dener; bulamazsa null döner.
 * Backend kontratı henüz tek bir "content" alanı garanti etmediği için
 * defansif çıkarım yapılır. Ham JSON da fallback olarak gösterilir.
 */
function extractBody(raw: string | null | undefined): {
  body: string | null;
  rawPretty: string | null;
} {
  if (!raw) return { body: null, rawPretty: null };
  try {
    const parsed = JSON.parse(raw);
    const candidate =
      (typeof parsed?.content === "string" && parsed.content) ||
      (typeof parsed?.body === "string" && parsed.body) ||
      (typeof parsed?.description === "string" && parsed.description) ||
      (typeof parsed?.content_html === "string" && parsed.content_html) ||
      null;
    return {
      body: candidate ? String(candidate) : null,
      rawPretty: JSON.stringify(parsed, null, 2),
    };
  } catch {
    return { body: null, rawPretty: raw };
  }
}

export function AuroraNewsItemDetailPage() {
  const { itemId, id: idAlt } = useParams<{ itemId?: string; id?: string }>();
  const id = itemId ?? idAlt ?? null;

  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const {
    data: item,
    isLoading,
    isError,
    error,
  } = useNewsItemDetail(id);
  const { data: sources } = useSourcesList();
  const { data: usedNews } = useUsedNewsList();

  const source: SourceResponse | undefined = useMemo(() => {
    if (!item?.source_id || !sources) return undefined;
    return sources.find((s) => s.id === item.source_id);
  }, [item, sources]);

  const usageRecords: UsedNewsResponse[] = useMemo(() => {
    if (!item || !usedNews) return [];
    return usedNews.filter((u) => u.news_item_id === item.id);
  }, [item, usedNews]);

  const trust: TrustLevel = normalizeTrust(source?.trust_level);
  const trustTone = TRUST_TONE[trust];

  const markUsed = useMutation({
    mutationFn: () => updateNewsItem(id ?? "", { status: "used" }),
    onSuccess: () => {
      toast.success("Haber kullanılmış olarak işaretlendi");
      queryClient.invalidateQueries({ queryKey: ["news-items"] });
      queryClient.invalidateQueries({ queryKey: ["news-items", id] });
    },
    onError: () => toast.error("İşaretleme başarısız"),
  });

  const markIgnored = useMutation({
    mutationFn: () => ignoreNewsItem(id ?? ""),
    onSuccess: () => {
      toast.success("Haber arşivlendi");
      queryClient.invalidateQueries({ queryKey: ["news-items"] });
      queryClient.invalidateQueries({ queryKey: ["news-items", id] });
    },
    onError: () => toast.error("Arşivleme başarısız"),
  });

  // ---------- LOADING ----------
  if (!id) {
    return (
      <div className="aurora-dashboard">
        <div className="page">
          <div
            className="card card-pad"
            style={{ textAlign: "center", color: "var(--text-muted)" }}
          >
            Haber ID belirtilmedi.
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="aurora-dashboard">
        <div className="page">
          <div className="page-head">
            <div>
              <h1>Haber öğesi</h1>
              <div className="sub">Yükleniyor…</div>
            </div>
          </div>
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

  if (isError) {
    return (
      <div className="aurora-dashboard">
        <div className="page">
          <div className="page-head">
            <div>
              <h1>Haber öğesi</h1>
              <div className="sub">Hata</div>
            </div>
            <div className="hstack" style={{ gap: 8 }}>
              <AuroraButton
                variant="secondary"
                size="sm"
                onClick={() => navigate("/admin/news-items")}
                iconLeft={<Icon name="arrow-left" size={11} />}
              >
                Listeye dön
              </AuroraButton>
            </div>
          </div>
          <div
            className="card card-pad"
            style={{
              textAlign: "center",
              color: "var(--state-danger-fg)",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              justifyContent: "center",
            }}
          >
            <Icon name="alert-circle" size={12} />
            Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
          </div>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="aurora-dashboard">
        <div className="page">
          <div className="page-head">
            <div>
              <h1>Haber öğesi</h1>
              <div className="sub">Bulunamadı</div>
            </div>
            <div className="hstack" style={{ gap: 8 }}>
              <AuroraButton
                variant="secondary"
                size="sm"
                onClick={() => navigate("/admin/news-items")}
                iconLeft={<Icon name="arrow-left" size={11} />}
              >
                Listeye dön
              </AuroraButton>
            </div>
          </div>
          <div
            className="card card-pad"
            style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}
          >
            Bu ID ile haber öğesi bulunamadı.
          </div>
        </div>
      </div>
    );
  }

  const used = isUsedStatus(item);
  const { body, rawPretty } = extractBody(item.raw_payload_json);

  const inspector = (
    <AuroraInspector title="Haber öğesi">
      <AuroraInspectorSection title="Kimlik">
        <AuroraInspectorRow
          label="id"
          value={
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--accent-primary-hover)",
              }}
              title={item.id}
            >
              {shortId(item.id)}
            </span>
          }
        />
        <AuroraInspectorRow
          label="kaynak"
          value={
            item.source_id ? (
              <button
                type="button"
                onClick={() => navigate(`/admin/sources/${item.source_id}`)}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--accent-primary-hover)",
                  cursor: "pointer",
                  textAlign: "right",
                }}
                title={item.source_id}
              >
                {item.source_name ?? shortId(item.source_id)}
              </button>
            ) : (
              <span style={{ color: "var(--text-muted)" }}>—</span>
            )
          }
        />
        {item.source_scan_id && (
          <AuroraInspectorRow
            label="scan"
            value={
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--text-muted)",
                }}
                title={item.source_scan_id}
              >
                {shortId(item.source_scan_id)}
              </span>
            }
          />
        )}
      </AuroraInspectorSection>

      <AuroraInspectorSection title="Durum">
        <AuroraInspectorRow
          label="kullanım"
          value={
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontFamily: "var(--font-mono)",
                fontSize: 11,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: used
                    ? "var(--state-info-fg)"
                    : "var(--state-success-fg)",
                  boxShadow: `0 0 6px ${
                    used
                      ? "var(--state-info-fg)"
                      : "var(--state-success-fg)"
                  }`,
                }}
              />
              {used ? "kullanıldı" : "kullanılabilir"}
            </span>
          }
        />
        <AuroraInspectorRow
          label="trust"
          value={
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontFamily: "var(--font-mono)",
                fontSize: 11,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: trustTone.color,
                  boxShadow: `0 0 6px ${trustTone.color}`,
                }}
              />
              {trustTone.label}
            </span>
          }
        />
        <AuroraInspectorRow
          label="kullanım sayısı"
          value={String(item.usage_count ?? 0)}
        />
        {item.last_usage_type && (
          <AuroraInspectorRow
            label="son kullanım"
            value={item.last_usage_type}
          />
        )}
        {item.last_target_module && (
          <AuroraInspectorRow
            label="hedef modül"
            value={item.last_target_module}
          />
        )}
      </AuroraInspectorSection>

      <AuroraInspectorSection title="Zaman çizgisi">
        {item.published_at && (
          <AuroraInspectorRow
            label="yayın"
            value={formatDateTime(item.published_at)}
          />
        )}
        <AuroraInspectorRow label="oluşturma" value={formatDateTime(item.created_at)} />
        <AuroraInspectorRow label="güncelleme" value={formatDateTime(item.updated_at)} />
      </AuroraInspectorSection>

      {usageRecords.length > 0 && (
        <AuroraInspectorSection
          title={`Kullanım kayıtları (${usageRecords.length})`}
        >
          {usageRecords.slice(0, 6).map((u) => (
            <AuroraInspectorRow
              key={u.id}
              label={
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--text-muted)",
                  }}
                  title={u.id}
                >
                  {shortId(u.id)}
                </span>
              }
              value={
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                  }}
                  title={`${u.usage_type} → ${u.target_module}`}
                >
                  {u.target_module}
                </span>
              }
            />
          ))}
          {usageRecords.length > 6 && (
            <div
              style={{
                marginTop: 4,
                fontSize: 11,
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono)",
              }}
            >
              +{usageRecords.length - 6} daha
            </div>
          )}
        </AuroraInspectorSection>
      )}

      {item.dedupe_key && (
        <AuroraInspectorSection title="Dedupe">
          <AuroraInspectorRow
            label="key"
            value={
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--text-muted)",
                  wordBreak: "break-all",
                  textAlign: "right",
                }}
                title={item.dedupe_key}
              >
                {item.dedupe_key.length > 18
                  ? `${item.dedupe_key.slice(0, 18)}…`
                  : item.dedupe_key}
              </span>
            }
          />
        </AuroraInspectorSection>
      )}

      <AuroraInspectorSection title="Aksiyonlar">
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <AuroraButton
            variant="primary"
            size="sm"
            disabled={used || markUsed.isPending}
            onClick={() => markUsed.mutate()}
            iconLeft={<Icon name="check" size={11} />}
          >
            {used
              ? "Zaten kullanıldı"
              : markUsed.isPending
                ? "İşaretleniyor…"
                : "Kullanılmış işaretle"}
          </AuroraButton>
          <AuroraButton
            variant="ghost"
            size="sm"
            disabled={
              (item?.status === "ignored") || markIgnored.isPending
            }
            onClick={() => {
              if (
                window.confirm(
                  "Haber arşive alınsın mı? Kullanım/audit kaydı silinmez; listelerde ignored olarak işaretlenir.",
                )
              ) {
                markIgnored.mutate();
              }
            }}
            iconLeft={<Icon name="trash" size={11} />}
          >
            {item?.status === "ignored"
              ? "Arşivde"
              : markIgnored.isPending
                ? "Arşivleniyor…"
                : "Arşivle"}
          </AuroraButton>
        </div>
      </AuroraInspectorSection>
    </AuroraInspector>
  );

  return (
    <div className="aurora-dashboard">
      <div className="page">
        <div className="page-head">
          <div>
            <nav
              className="breadcrumbs caption"
              aria-label="Konum"
              style={{ marginBottom: 6 }}
            >
              <button
                type="button"
                onClick={() => navigate("/admin/news-items")}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  font: "inherit",
                }}
              >
                Haber öğeleri
              </button>
              <span className="sep"> / </span>
              <span style={{ color: "var(--text-muted)" }}>{shortId(item.id)}</span>
            </nav>
            <h1 style={{ margin: 0, lineHeight: 1.2 }}>
              {item.title || "(başlıksız)"}
            </h1>
            <div
              className="sub"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginTop: 6,
                flexWrap: "wrap",
              }}
            >
              {item.source_name && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <Icon name="globe" size={11} /> {item.source_name}
                </span>
              )}
              {item.published_at && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <Icon name="calendar" size={11} />{" "}
                  {formatDateTime(item.published_at)}
                </span>
              )}
              {item.language && (
                <AuroraStatusChip tone="neutral">{item.language}</AuroraStatusChip>
              )}
              {item.category && (
                <AuroraStatusChip tone="neutral">{item.category}</AuroraStatusChip>
              )}
              <span
                className="chip"
                style={{
                  fontSize: 10,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: trustTone.color,
                    boxShadow: `0 0 5px ${trustTone.color}`,
                  }}
                />
                trust: {trustTone.label}
              </span>
            </div>
          </div>
          <div className="hstack" style={{ gap: 8 }}>
            <AuroraButton
              variant="secondary"
              size="sm"
              onClick={() => navigate("/admin/news-items")}
              iconLeft={<Icon name="arrow-left" size={11} />}
            >
              Listeye dön
            </AuroraButton>
            {item.url && (
              <AuroraButton
                variant="secondary"
                size="sm"
                onClick={() => window.open(item.url, "_blank", "noopener,noreferrer")}
                iconLeft={<Icon name="external-link" size={11} />}
              >
                Kaynağı aç
              </AuroraButton>
            )}
            <AuroraButton
              variant="primary"
              size="sm"
              disabled={used || markUsed.isPending}
              onClick={() => markUsed.mutate()}
              iconLeft={<Icon name="check" size={11} />}
            >
              {used ? "Kullanıldı" : "Kullanılmış işaretle"}
            </AuroraButton>
          </div>
        </div>

        {item.summary && (
          <div className="card card-pad" style={{ marginBottom: 10 }}>
            <div
              className="overline"
              style={{
                marginBottom: 6,
                color: "var(--text-muted)",
                fontSize: 11,
              }}
            >
              Özet
            </div>
            <p
              style={{
                margin: 0,
                lineHeight: 1.55,
                color: "var(--text-primary)",
              }}
            >
              {item.summary}
            </p>
          </div>
        )}

        {body && (
          <div className="card card-pad" style={{ marginBottom: 10 }}>
            <div
              className="overline"
              style={{
                marginBottom: 6,
                color: "var(--text-muted)",
                fontSize: 11,
              }}
            >
              İçerik
            </div>
            <div
              style={{
                whiteSpace: "pre-wrap",
                lineHeight: 1.55,
                color: "var(--text-primary)",
                fontSize: 14,
              }}
            >
              {body}
            </div>
          </div>
        )}

        <div className="card card-pad" style={{ marginBottom: 10 }}>
          <div
            className="overline"
            style={{
              marginBottom: 8,
              color: "var(--text-muted)",
              fontSize: 11,
            }}
          >
            Kaynak bağlantısı
          </div>
          {item.url ? (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--accent-primary-hover)",
                wordBreak: "break-all",
              }}
            >
              {item.url}
            </a>
          ) : (
            <span style={{ color: "var(--text-muted)" }}>URL yok</span>
          )}
        </div>

        {rawPretty && !body && (
          <div className="card card-pad" style={{ marginBottom: 10 }}>
            <div
              className="overline"
              style={{
                marginBottom: 6,
                color: "var(--text-muted)",
                fontSize: 11,
              }}
            >
              Ham içerik (raw payload)
            </div>
            <pre
              style={{
                margin: 0,
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--text-muted)",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                maxHeight: 320,
                overflow: "auto",
              }}
            >
              {rawPretty}
            </pre>
          </div>
        )}
      </div>
      <aside className="aurora-inspector-slot">{inspector}</aside>
    </div>
  );
}
