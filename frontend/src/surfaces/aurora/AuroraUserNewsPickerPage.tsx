/**
 * Aurora User News Picker — user.news.picker override.
 *
 * Tasarım: ContentHub_Design _System/contenthub/pages/user/news-picker.html
 * Veri: fetchNewsItems (gerçek backend haber kayıtları). Hardcoded item yok.
 * "İlgililik" alanı backend'de yok; bunun yerine usage_count + last_usage_type
 * gerçek alanları gösterilir. Seçim local state'tir; "onayla" butonu seçili id
 * listesini onConfirm callback'ine teslim eder (router üzerinden bültene aktarım).
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchNewsItems, type NewsItemResponse } from "../../api/newsItemsApi";
import { useAuthStore } from "../../stores/authStore";
import {
  AuroraButton,
  AuroraInspector,
  AuroraInspectorSection,
  AuroraInspectorRow,
} from "./primitives";

function fmtTimeAgo(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "şimdi";
  if (min < 60) return `${min}d`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}s`;
  const day = Math.floor(hr / 24);
  return `${day}g`;
}

function usageBadge(item: NewsItemResponse): { label: string; tone: string } {
  const used = (item.usage_count ?? 0) > 0 || item.has_published_used_news_link;
  if (used) {
    return { label: `${item.usage_count ?? 1}× kullanıldı`, tone: "var(--state-warning-fg)" };
  }
  return { label: "yeni", tone: "var(--state-success-fg)" };
}

export function AuroraUserNewsPickerPage() {
  const navigate = useNavigate();
  // Admin shell (admin.news.picker) de user shell (user.news.picker) de bu sayfaya
  // ulaşıyor. Onay sonrası shell-correct wizard entry'sine gidebilmek için
  // role-aware baseRoute türetiyoruz. Önceden window.location.assign ile
  // `/user/wizard/news_bulletin` 404 rotasına atılıyordu (real bug).
  const role = useAuthStore((s) => s.user?.role);
  const baseRoute = role === "admin" ? "/admin" : "/user";
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const itemsQ = useQuery({
    queryKey: ["news", "items", "picker", search],
    queryFn: () => fetchNewsItems({ status: "new", search: search || undefined, limit: 100 }),
    staleTime: 30_000,
  });

  const items = itemsQ.data ?? [];
  const selCount = selected.size;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const stats = useMemo(() => {
    let used = 0;
    let fresh = 0;
    for (const it of items) {
      if ((it.usage_count ?? 0) > 0 || it.has_published_used_news_link) used += 1;
      else fresh += 1;
    }
    return { used, fresh };
  }, [items]);

  const inspector = (
    <AuroraInspector title="Seçim">
      <AuroraInspectorSection title="Seçilen">
        <AuroraInspectorRow label="seçili" value={`${selCount}/${items.length}`} />
        <AuroraInspectorRow label="dedupe" value="soft aktif" />
      </AuroraInspectorSection>
      <AuroraInspectorSection title="Liste">
        <AuroraInspectorRow label="yeni" value={String(stats.fresh)} />
        <AuroraInspectorRow label="kullanılmış" value={String(stats.used)} />
      </AuroraInspectorSection>
    </AuroraInspector>
  );

  return (
    <div className="aurora-dashboard">
      <div className="page" style={{ maxWidth: 720 }}>
        <div className="page-head">
          <div>
            <h1>Haber seçici</h1>
            <div className="sub">
              {selCount} seçili · bültene eklenecek haberler
            </div>
          </div>
          <AuroraButton
            variant="primary"
            size="sm"
            disabled={selCount === 0}
            onClick={() => {
              const ids = Array.from(selected);
              const params = new URLSearchParams();
              params.set("news_ids", ids.join(","));
              // Shell-correct: admin → /admin/news-bulletins/wizard,
              //               user  → /user/create/bulletin
              // Eski davranış `/user/wizard/news_bulletin` 404'tü + full page
              // reload veriyordu (window.location.assign). SPA navigate ile
              // query string preserve edilir; wizard news_ids parametresini
              // okuyarak hydrate eder.
              const target =
                role === "admin"
                  ? `${baseRoute}/news-bulletins/wizard`
                  : `${baseRoute}/create/bulletin`;
              navigate(`${target}?${params.toString()}`);
            }}
          >
            Seçimleri onayla ({selCount})
          </AuroraButton>
        </div>

        <div style={{ marginBottom: 12 }}>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Haberlerde ara…"
            style={{
              width: "100%",
              padding: "8px 10px",
              border: "1px solid var(--border-default)",
              borderRadius: 7,
              background: "var(--bg-surface)",
              color: "var(--text-primary)",
              fontFamily: "inherit",
              fontSize: 12,
            }}
          />
        </div>

        {itemsQ.isLoading ? (
          <div className="card card-pad" style={{ textAlign: "center", color: "var(--text-muted)" }}>
            Yükleniyor…
          </div>
        ) : items.length === 0 ? (
          <div
            className="card card-pad"
            style={{ textAlign: "center", padding: 32, color: "var(--text-muted)", fontSize: 13 }}
          >
            Yeni haber bulunamadı. Kaynaklarınızı tarayın veya filtreyi değiştirin.
          </div>
        ) : (
          <div className="card">
            {items.map((item, i) => {
              const isSel = selected.has(item.id);
              const badge = usageBadge(item);
              return (
                <div
                  key={item.id}
                  onClick={() => toggle(item.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 16px",
                    borderBottom: i < items.length - 1 ? "1px solid var(--border-subtle)" : "none",
                    cursor: "pointer",
                    background: isSel ? "rgba(59,200,184,0.08)" : "transparent",
                    transition: "background .08s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-inset)")}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = isSel ? "rgba(59,200,184,0.08)" : "transparent")
                  }
                >
                  <input
                    type="checkbox"
                    checked={isSel}
                    onChange={() => toggle(item.id)}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      width: 15,
                      height: 15,
                      accentColor: "var(--accent-primary)",
                      cursor: "pointer",
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        marginBottom: 2,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.title}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        color: "var(--text-muted)",
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <span>{item.source_name ?? "kaynak yok"}</span>
                      <span>· {fmtTimeAgo(item.published_at)} önce</span>
                      {item.category && <span>· {item.category}</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        color: "var(--text-muted)",
                        marginBottom: 2,
                      }}
                    >
                      Durum
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        fontWeight: 600,
                        color: badge.tone,
                      }}
                    >
                      {badge.label}
                    </div>
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
