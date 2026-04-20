/**
 * AuroraCommentMonitoringPage — Aurora Dusk Cockpit / Yorum İzleme (admin).
 *
 * Slot: `admin.comments.monitoring` (rota: /admin/comments)
 *
 * Tasarım:
 *   - Sol/üst: filter chip'leri (status, platform) + lokal arama + yorum
 *     listesi (yazar, içerik, kanal, status, beğeni, tarih).
 *   - Sağ: AuroraInspector — toplam yorum, bekleyen, onaylanmış, son 24 saat
 *     aktif kanal sayısı; durum dağılımı (replied/unreplied/pending/failed).
 *
 * Veri:
 *   - useComments({ limit: 200, ... }) — gerçek SyncedComment[].
 *   - Filtreler client-side uygulanır (status filtresi server-side, free
 *     text + platform client-side) — registry pattern'ı (NewsItemsRegistry)
 *     ile uyumlu.
 *
 * Hardcoded yorum yok; tüm değerler backend yorum senkronundan gelir.
 * Toplu moderasyon / bulk actions bu Aurora sürümünde dahil edilmedi —
 * mevcut legacy sayfa Sprint-3'te eklemiş; CLAUDE.md "Do not add out-of-scope
 * features" gereği görsel sadeleştirme önceliklendi. Toplu eylemler için
 * legacy sayfaya/ileride eklenecek inspector bölümüne bırakılmıştır.
 */
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useComments } from "../../hooks/useComments";
import type { SyncedComment, CommentListParams } from "../../api/commentsApi";
import {
  AuroraButton,
  AuroraInspector,
  AuroraInspectorSection,
  AuroraInspectorRow,
  AuroraStatusChip,
  type AuroraStatusTone,
} from "./primitives";
import { Icon } from "./icons";

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

type StatusFilter = "" | "none" | "pending" | "replied" | "failed";
type PlatformFilter = "" | "youtube";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "", label: "Tümü" },
  { value: "none", label: "Cevaplanmamış" },
  { value: "pending", label: "Bekliyor" },
  { value: "replied", label: "Cevaplanmış" },
  { value: "failed", label: "Başarısız" },
];

const PLATFORM_OPTIONS: { value: PlatformFilter; label: string }[] = [
  { value: "", label: "Tüm platformlar" },
  { value: "youtube", label: "YouTube" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "—";
  const sec = Math.max(1, Math.floor((Date.now() - t) / 1000));
  if (sec < 60) return `${sec}sn`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}dk`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}s`;
  const d = Math.floor(hr / 24);
  return `${d}g`;
}

function within24h(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return false;
  return Date.now() - t < 24 * 60 * 60 * 1000;
}

const STATUS_TONE: Record<
  SyncedComment["reply_status"],
  { tone: AuroraStatusTone; label: string; color: string }
> = {
  replied: { tone: "success", label: "cevaplanmış", color: "var(--state-success-fg)" },
  pending: { tone: "warning", label: "bekliyor", color: "var(--state-warning-fg)" },
  failed: { tone: "danger", label: "başarısız", color: "var(--state-danger-fg)" },
  none: { tone: "neutral", label: "cevaplanmamış", color: "var(--text-muted)" },
};

function avatarChar(c: SyncedComment): string {
  return (c.author_name?.trim()[0] ?? "?").toUpperCase();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AuroraCommentMonitoringPage() {
  const qc = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("");
  const [query, setQuery] = useState("");

  // Server-side reply_status filter (matched legacy davranışı). Platform ve
  // free-text filtre client-side; backend `platform` parametresini destekliyor
  // ama mevcut tek platform "youtube" olduğundan ek query çağrısı yapmadan
  // memory'de filtreliyoruz.
  const listParams: CommentListParams = useMemo(() => {
    const p: CommentListParams = { limit: 200 };
    if (statusFilter) p.reply_status = statusFilter;
    return p;
  }, [statusFilter]);

  const {
    data: comments,
    isLoading,
    isError,
    error,
    isFetching,
  } = useComments(listParams);

  const list: SyncedComment[] = comments ?? [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list.filter((c) => {
      if (platformFilter && c.platform !== platformFilter) return false;
      if (!q) return true;
      const author = (c.author_name ?? "").toLowerCase();
      const text = (c.text ?? "").toLowerCase();
      const video = (c.external_video_id ?? "").toLowerCase();
      return author.includes(q) || text.includes(q) || video.includes(q);
    });
  }, [list, platformFilter, query]);

  const counts = useMemo(() => {
    const c = {
      total: list.length,
      replied: 0,
      unreplied: 0,
      pending: 0,
      failed: 0,
      last24h: 0,
      activeChannels: 0,
    };
    const channels24h = new Set<string>();
    for (const it of list) {
      if (it.reply_status === "replied") c.replied += 1;
      else if (it.reply_status === "pending") c.pending += 1;
      else if (it.reply_status === "failed") c.failed += 1;
      else c.unreplied += 1;
      if (within24h(it.published_at)) {
        c.last24h += 1;
        if (it.channel_profile_id) channels24h.add(it.channel_profile_id);
      }
    }
    c.activeChannels = channels24h.size;
    return c;
  }, [list]);

  function refresh() {
    qc.invalidateQueries({ queryKey: ["comments"] });
  }

  const inspector = (
    <AuroraInspector title="Yorum izleme">
      <AuroraInspectorSection title="Özet">
        <AuroraInspectorRow label="toplam yorum" value={String(counts.total)} />
        <AuroraInspectorRow label="bekleyen" value={String(counts.pending)} />
        <AuroraInspectorRow label="onaylanmış" value={String(counts.replied)} />
        <AuroraInspectorRow
          label="son 24s aktif kanal"
          value={String(counts.activeChannels)}
        />
      </AuroraInspectorSection>
      <AuroraInspectorSection title="Durum dağılımı">
        <AuroraInspectorRow
          label={
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: STATUS_TONE.replied.color,
                  boxShadow: `0 0 6px ${STATUS_TONE.replied.color}`,
                }}
              />
              cevaplanmış
            </span>
          }
          value={String(counts.replied)}
        />
        <AuroraInspectorRow
          label={
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: STATUS_TONE.pending.color,
                  boxShadow: `0 0 6px ${STATUS_TONE.pending.color}`,
                }}
              />
              bekliyor
            </span>
          }
          value={String(counts.pending)}
        />
        <AuroraInspectorRow
          label={
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: STATUS_TONE.failed.color,
                  boxShadow: `0 0 6px ${STATUS_TONE.failed.color}`,
                }}
              />
              başarısız
            </span>
          }
          value={String(counts.failed)}
        />
        <AuroraInspectorRow
          label={
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: STATUS_TONE.none.color,
                  boxShadow: `0 0 6px ${STATUS_TONE.none.color}`,
                }}
              />
              cevaplanmamış
            </span>
          }
          value={String(counts.unreplied)}
        />
      </AuroraInspectorSection>
      <AuroraInspectorSection title="Filtre">
        <AuroraInspectorRow
          label="görünen"
          value={`${filtered.length}/${list.length}`}
        />
        {statusFilter && (
          <AuroraInspectorRow
            label="durum"
            value={STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label ?? statusFilter}
          />
        )}
        {platformFilter && (
          <AuroraInspectorRow label="platform" value={platformFilter} />
        )}
      </AuroraInspectorSection>
    </AuroraInspector>
  );

  return (
    <div className="aurora-dashboard" data-testid="aurora-comment-monitoring">
      <div className="page">
        <div className="page-head">
          <div>
            <h1>Yorum izleme</h1>
            <div className="sub">
              {list.length} yorum · tüm kullanıcı ve kanal yorumları
            </div>
          </div>
          <div className="hstack" style={{ gap: 8 }}>
            <AuroraButton
              variant="secondary"
              size="sm"
              onClick={refresh}
              disabled={isFetching}
              iconLeft={<Icon name="refresh" size={11} />}
            >
              {isFetching ? "Yenileniyor…" : "Yenile"}
            </AuroraButton>
          </div>
        </div>

        {/* Status chip filter row */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            marginBottom: 10,
          }}
          data-testid="aurora-comment-status-chips"
        >
          {STATUS_OPTIONS.map((opt) => {
            const active = statusFilter === opt.value;
            return (
              <button
                key={opt.value || "all"}
                type="button"
                onClick={() => setStatusFilter(opt.value)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  height: 26,
                  padding: "0 11px",
                  borderRadius: 7,
                  fontSize: 11,
                  fontWeight: 500,
                  border: "1px solid",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all .12s",
                  borderColor: active
                    ? "var(--accent-primary)"
                    : "var(--border-default)",
                  background: active
                    ? "var(--accent-primary-muted)"
                    : "var(--bg-surface)",
                  color: active
                    ? "var(--accent-primary-hover)"
                    : "var(--text-secondary)",
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Search + platform select row */}
        <div
          className="card card-pad"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            marginBottom: 10,
          }}
        >
          <Icon name="search" size={13} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Yazar, yorum metni veya video id ara…"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--text-primary)",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
            }}
            aria-label="Yorum ara"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                fontSize: 11,
                fontFamily: "var(--font-mono)",
              }}
            >
              temizle
            </button>
          )}
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value as PlatformFilter)}
            aria-label="Platform filtresi"
            style={{
              height: 26,
              padding: "0 8px",
              borderRadius: 6,
              border: "1px solid var(--border-default)",
              background: "var(--bg-surface)",
              color: "var(--text-secondary)",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            {PLATFORM_OPTIONS.map((o) => (
              <option key={o.value || "all"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--text-muted)",
            }}
          >
            <Icon name="list-checks" size={11} /> {filtered.length}/{list.length}
          </span>
        </div>

        {isLoading && (
          <div
            className="card card-pad"
            style={{ textAlign: "center", color: "var(--text-muted)" }}
          >
            Yükleniyor…
          </div>
        )}

        {isError && (
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
        )}

        {!isLoading && !isError && list.length === 0 && (
          <div
            className="card card-pad"
            style={{
              textAlign: "center",
              padding: 32,
              color: "var(--text-muted)",
            }}
          >
            Henüz yorum kaydı yok.
          </div>
        )}

        {!isLoading && !isError && list.length > 0 && filtered.length === 0 && (
          <div
            className="card card-pad"
            style={{
              textAlign: "center",
              padding: 24,
              color: "var(--text-muted)",
            }}
          >
            Aramayla eşleşen yorum yok.
          </div>
        )}

        {!isLoading && !isError && filtered.length > 0 && (
          <div className="card" style={{ overflow: "auto" }}>
            <table className="reg-tbl">
              <thead>
                <tr>
                  <th style={{ width: 32 }} aria-label="avatar" />
                  <th>Yazar</th>
                  <th>İçerik</th>
                  <th>Kanal / Video</th>
                  <th>Platform</th>
                  <th>Durum</th>
                  <th style={{ textAlign: "right" }}>♥</th>
                  <th>Tarih</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const tone = STATUS_TONE[c.reply_status];
                  return (
                    <tr key={c.id} data-testid={`aurora-comment-row-${c.id}`}>
                      <td>
                        {c.author_avatar_url ? (
                          <img
                            src={c.author_avatar_url}
                            alt=""
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: "50%",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: "50%",
                              background: "var(--gradient-brand)",
                              display: "grid",
                              placeItems: "center",
                              fontSize: 11,
                              fontWeight: 600,
                              color: "var(--text-on-accent)",
                            }}
                          >
                            {avatarChar(c)}
                          </div>
                        )}
                      </td>
                      <td
                        style={{
                          fontWeight: 500,
                          maxWidth: 160,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={c.author_name ?? "Bilinmeyen"}
                      >
                        {c.author_name ?? "Bilinmeyen"}
                      </td>
                      <td
                        style={{
                          maxWidth: 360,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          color: "var(--text-secondary)",
                        }}
                        title={c.text}
                      >
                        {c.text}
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--text-muted)",
                          maxWidth: 160,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={c.external_video_id}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                          }}
                        >
                          <Icon name="film" size={11} />
                          {c.external_video_id || "—"}
                        </span>
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--text-muted)",
                        }}
                      >
                        {c.platform}
                      </td>
                      <td>
                        <AuroraStatusChip tone={tone.tone}>
                          <span
                            style={{
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
                                background: tone.color,
                                boxShadow: `0 0 5px ${tone.color}`,
                              }}
                            />
                            {tone.label}
                          </span>
                        </AuroraStatusChip>
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--text-muted)",
                          textAlign: "right",
                        }}
                      >
                        {c.like_count}
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--text-muted)",
                        }}
                      >
                        {timeAgo(c.published_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <aside className="aurora-inspector-slot">{inspector}</aside>
    </div>
  );
}
