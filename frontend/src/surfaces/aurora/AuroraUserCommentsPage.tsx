/**
 * Aurora User Comments — user.comments override.
 *
 * Tasarım: ContentHub_Design _System/contenthub/pages/user/comments.html
 * Veri: useComments + useReplyToComment (gerçek backend yorum kayıtları).
 * Hardcoded yorum yok; satırlar gerçek YouTube comment senkronundan gelir.
 */
import { useMemo, useState } from "react";
import { useComments, useReplyToComment } from "../../hooks/useComments";
import { useAuthStore } from "../../stores/authStore";
import {
  AuroraButton,
  AuroraInspector,
  AuroraInspectorSection,
  AuroraInspectorRow,
} from "./primitives";
import { Icon } from "./icons";
import type { SyncedComment } from "../../api/commentsApi";

type Filter = "all" | "unreplied" | "replied";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Tümü" },
  { value: "unreplied", label: "Yanıtsız" },
  { value: "replied", label: "Yanıtlandı" },
];

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 60) return `${min}d`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}s`;
  const day = Math.floor(hr / 24);
  return `${day}g`;
}

function avatarChar(c: SyncedComment): string {
  return (c.author_name?.trim()[0] ?? "?").toUpperCase();
}

export function AuroraUserCommentsPage() {
  const user = useAuthStore((s) => s.user);
  const [filter, setFilter] = useState<Filter>("all");
  const [replyOpenFor, setReplyOpenFor] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const replyStatus = filter === "unreplied" ? "none" : filter === "replied" ? "replied" : undefined;
  const commentsQ = useComments({ reply_status: replyStatus, limit: 100 });
  const replyM = useReplyToComment();

  const items = commentsQ.data ?? [];
  const counts = useMemo(() => {
    let unreplied = 0;
    let likes = 0;
    for (const c of items) {
      if (c.reply_status !== "replied") unreplied += 1;
      likes += c.like_count;
    }
    return { unreplied, likes };
  }, [items]);

  const inspector = (
    <AuroraInspector title="Yorumlar">
      <AuroraInspectorSection title="Toplam">
        <AuroraInspectorRow label="kayıt" value={String(items.length)} />
        <AuroraInspectorRow label="yanıtsız" value={String(counts.unreplied)} />
        <AuroraInspectorRow label="beğeni" value={String(counts.likes)} />
      </AuroraInspectorSection>
    </AuroraInspector>
  );

  return (
    <div className="aurora-dashboard">
      <div className="page">
        <div className="page-head">
          <div>
            <h1>Yorumlar</h1>
            <div className="sub">
              {counts.unreplied} yanıtsız · {items.length} toplam
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: 28,
                padding: "0 12px",
                borderRadius: 7,
                fontSize: 11,
                fontWeight: 500,
                border: "1px solid",
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all .12s",
                borderColor: filter === f.value ? "var(--accent-primary)" : "var(--border-default)",
                background: filter === f.value ? "var(--accent-primary-muted)" : "var(--bg-surface)",
                color: filter === f.value ? "var(--accent-primary-hover)" : "var(--text-secondary)",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {commentsQ.isLoading ? (
          <div className="card card-pad" style={{ textAlign: "center", color: "var(--text-muted)" }}>
            Yükleniyor…
          </div>
        ) : items.length === 0 ? (
          <div
            className="card card-pad"
            style={{ textAlign: "center", padding: 32, color: "var(--text-muted)", fontSize: 13 }}
          >
            Yorum bulunamadı.
          </div>
        ) : (
          <div className="card">
            {items.map((c, i) => {
              const replied = c.reply_status === "replied";
              const isReplyOpen = replyOpenFor === c.id;
              return (
                <div
                  key={c.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "36px 1fr auto",
                    gap: 12,
                    alignItems: "flex-start",
                    padding: "14px 18px",
                    borderBottom: i < items.length - 1 ? "1px solid var(--border-subtle)" : "none",
                    transition: "background .08s",
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: "var(--gradient-brand)",
                      display: "grid",
                      placeItems: "center",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--text-on-accent)",
                      flexShrink: 0,
                    }}
                  >
                    {avatarChar(c)}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>
                      {c.author_name ?? "anonim"}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        color: "var(--accent-primary-hover)",
                        marginBottom: 4,
                      }}
                    >
                      {c.external_video_id}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>{c.text}</div>
                    {replied && c.our_reply_text && (
                      <div
                        style={{
                          marginTop: 8,
                          padding: "8px 10px",
                          borderRadius: 6,
                          background: "var(--bg-inset)",
                          fontSize: 11,
                          color: "var(--text-secondary)",
                          borderLeft: "2px solid var(--accent-primary)",
                        }}
                      >
                        <div
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 9,
                            color: "var(--text-muted)",
                            marginBottom: 2,
                          }}
                        >
                          yanıtınız {fmtTime(c.our_reply_at)} önce
                        </div>
                        {c.our_reply_text}
                      </div>
                    )}
                    {isReplyOpen && (
                      <div style={{ marginTop: 8, display: "flex", gap: 6, alignItems: "flex-start" }}>
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Yanıt yazın…"
                          rows={2}
                          style={{
                            flex: 1,
                            padding: "6px 8px",
                            border: "1px solid var(--border-default)",
                            borderRadius: 6,
                            background: "var(--bg-surface)",
                            color: "var(--text-primary)",
                            fontFamily: "inherit",
                            fontSize: 12,
                            resize: "vertical",
                          }}
                        />
                        <AuroraButton
                          variant="primary"
                          size="sm"
                          disabled={!replyText.trim() || replyM.isPending}
                          onClick={() => {
                            if (!user) return;
                            replyM.mutate(
                              { commentId: c.id, replyText: replyText.trim(), userId: user.id },
                              {
                                onSuccess: () => {
                                  setReplyOpenFor(null);
                                  setReplyText("");
                                },
                              },
                            );
                          }}
                        >
                          {replyM.isPending ? "Gönderiliyor…" : "Gönder"}
                        </AuroraButton>
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                      {!replied && (
                        <AuroraButton
                          variant="secondary"
                          size="sm"
                          iconLeft={<Icon name="message-square" size={10} />}
                          onClick={() => {
                            setReplyOpenFor(isReplyOpen ? null : c.id);
                            setReplyText("");
                          }}
                        >
                          {isReplyOpen ? "İptal" : "Yanıtla"}
                        </AuroraButton>
                      )}
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          marginLeft: 8,
                          fontFamily: "var(--font-mono)",
                          fontSize: 10,
                          color: "var(--text-muted)",
                        }}
                      >
                        ♥ {c.like_count}
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        color: "var(--text-muted)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {fmtTime(c.published_at)}
                    </div>
                    {replied && (
                      <span
                        className="chip"
                        style={{
                          height: 18,
                          fontSize: 9,
                          marginTop: 4,
                          color: "var(--state-success-fg)",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        ● yanıtlandı
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <aside className="aurora-inspector-slot">{inspector}</aside>
    </div>
  );
}
