/**
 * AuroraVisibilityRegistryPage — Aurora Dusk Cockpit / Görünürlük Kuralları (admin).
 *
 * Direct port of `docs/aurora-design-source/project/contenthub/pages/admin/visibility-registry.html`.
 * Pilot pattern: AuroraSourcesRegistryPage (page-head + reg-tbl + Inspector).
 *
 * Tasarım hedefi:
 *   - Page-head (başlık + alt başlık + "Kural ekle" aksiyonu)
 *   - reg-tbl: checkbox / ID (mono) / target_key (mono) / scope chip /
 *              action chip / öncelik / durum dot / güncelleme (relative)
 *   - Inspector KPI: toplam kural · scope dağılımı · action dağılımı ·
 *                    en çok hedeflenen anahtar
 *
 * Veri kaynağı: useVisibilityRulesList() — gerçek VisibilityRuleResponse[].
 * Hiçbir legacy code değiştirilmez; surface override sistemi tarafından
 * `admin.visibility.registry` slot'una kayıtlandığında otomatik devreye girer.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useVisibilityRulesList } from "../../hooks/useVisibilityRulesList";
import type { VisibilityRuleResponse } from "../../api/visibilityApi";
import {
  AuroraButton,
  AuroraInspector,
  AuroraInspectorSection,
  AuroraInspectorRow,
} from "./primitives";
import { Icon } from "./icons";

type ScopeKind = "admin" | "user" | "public";
type ActionKind = "read" | "write" | "hidden";

const SCOPE_TONE: Record<ScopeKind, { label: string; color: string }> = {
  admin: { label: "admin", color: "var(--state-info-fg)" },
  user: { label: "user", color: "var(--accent-primary-hover)" },
  public: { label: "public", color: "var(--text-muted)" },
};

const ACTION_TONE: Record<ActionKind, { label: string; color: string }> = {
  read: { label: "read", color: "var(--state-success-fg)" },
  write: { label: "write", color: "var(--state-warning-fg)" },
  hidden: { label: "hidden", color: "var(--state-danger-fg)" },
};

/**
 * Test fixture'ları (target_key `test:` ile başlayan) varsayılan olarak
 * tablo dışında tutuluyor. Aynı politika legacy sayfa ile birebir.
 */
function isTestFixtureRule(targetKey: string | null | undefined): boolean {
  if (!targetKey) return false;
  return targetKey.startsWith("test:");
}

function deriveScope(rule: VisibilityRuleResponse): ScopeKind {
  const role = (rule.role_scope ?? "").toLowerCase();
  if (role === "admin") return "admin";
  if (role === "user") return "user";
  return "public";
}

function deriveAction(rule: VisibilityRuleResponse): ActionKind {
  if (!rule.visible) return "hidden";
  if (rule.read_only) return "read";
  return "write";
}

function shortId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

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

export function AuroraVisibilityRegistryPage() {
  const navigate = useNavigate();
  const { data: rules, isLoading, isError, error } = useVisibilityRulesList();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showFixtures, setShowFixtures] = useState(false);

  const all = rules ?? [];
  const fixtureCount = useMemo(
    () => all.filter((r) => isTestFixtureRule(r.target_key)).length,
    [all],
  );
  const list = useMemo(
    () => (showFixtures ? all : all.filter((r) => !isTestFixtureRule(r.target_key))),
    [all, showFixtures],
  );

  const stats = useMemo(() => {
    const scopes = { admin: 0, user: 0, public: 0 };
    const actions = { read: 0, write: 0, hidden: 0 };
    const targetCount = new Map<string, number>();
    for (const r of list) {
      scopes[deriveScope(r)] += 1;
      actions[deriveAction(r)] += 1;
      const k = r.target_key || "—";
      targetCount.set(k, (targetCount.get(k) ?? 0) + 1);
    }
    let topKey: string | null = null;
    let topVal = 0;
    for (const [k, v] of targetCount) {
      if (v > topVal) {
        topVal = v;
        topKey = k;
      }
    }
    return { scopes, actions, topKey, topVal };
  }, [list]);

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected((prev) => {
      if (prev.size === list.length) return new Set();
      return new Set(list.map((r) => r.id));
    });
  }

  const inspector = (
    <AuroraInspector title="Visibility Engine">
      <AuroraInspectorSection title="Özet">
        <AuroraInspectorRow label="toplam kural" value={String(list.length)} />
        <AuroraInspectorRow
          label="aktif"
          value={String(list.filter((r) => r.status === "active").length)}
        />
        {fixtureCount > 0 && (
          <AuroraInspectorRow label="test fixture" value={String(fixtureCount)} />
        )}
      </AuroraInspectorSection>
      <AuroraInspectorSection title="Scope">
        <AuroraInspectorRow label="admin" value={String(stats.scopes.admin)} />
        <AuroraInspectorRow label="user" value={String(stats.scopes.user)} />
        <AuroraInspectorRow label="public" value={String(stats.scopes.public)} />
      </AuroraInspectorSection>
      <AuroraInspectorSection title="Action">
        <AuroraInspectorRow label="read" value={String(stats.actions.read)} />
        <AuroraInspectorRow label="write" value={String(stats.actions.write)} />
        <AuroraInspectorRow label="hidden" value={String(stats.actions.hidden)} />
      </AuroraInspectorSection>
      {stats.topKey && (
        <AuroraInspectorSection title="En çok hedeflenen">
          <AuroraInspectorRow label="anahtar" value={stats.topKey} />
          <AuroraInspectorRow label="kural" value={String(stats.topVal)} />
        </AuroraInspectorSection>
      )}
      {selected.size > 0 && (
        <AuroraInspectorSection title="Seçim">
          <AuroraInspectorRow label="seçili" value={String(selected.size)} />
        </AuroraInspectorSection>
      )}
    </AuroraInspector>
  );

  return (
    <div className="aurora-dashboard">
      <div className="page">
        <div className="page-head">
          <div>
            <h1>Görünürlük kuralları</h1>
            <div className="sub">
              {list.length} kural · UI visibility engine
            </div>
          </div>
          <div className="hstack" style={{ gap: 8 }}>
            {fixtureCount > 0 && (
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 11,
                  color: "var(--text-muted)",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={showFixtures}
                  onChange={(e) => setShowFixtures(e.target.checked)}
                />
                Test fixture göster ({fixtureCount})
              </label>
            )}
            <AuroraButton
              variant="primary"
              size="sm"
              onClick={() => navigate("/admin/visibility")}
              iconLeft={<Icon name="plus" size={11} />}
            >
              Kural ekle
            </AuroraButton>
          </div>
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
            }}
          >
            Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
          </div>
        )}

        {!isLoading && !isError && list.length === 0 && (
          <div
            className="card card-pad"
            style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}
          >
            {fixtureCount > 0 && !showFixtures
              ? "Henüz ürün kuralı yok (test fixture'lar gizli)."
              : "Henüz görünürlük kuralı yok."}
          </div>
        )}

        {!isLoading && !isError && list.length > 0 && (
          <div className="card" style={{ overflow: "auto" }}>
            <table className="reg-tbl">
              <thead>
                <tr>
                  <th style={{ width: 30 }}>
                    <input
                      type="checkbox"
                      checked={selected.size === list.length && list.length > 0}
                      onChange={toggleAll}
                      aria-label="Tümünü seç"
                    />
                  </th>
                  <th>ID</th>
                  <th>Hedef</th>
                  <th>Scope</th>
                  <th>Action</th>
                  <th style={{ textAlign: "right" }}>Öncelik</th>
                  <th>Durum</th>
                  <th>Güncelleme</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r) => {
                  const scope = deriveScope(r);
                  const action = deriveAction(r);
                  const scopeTone = SCOPE_TONE[scope];
                  const actionTone = ACTION_TONE[action];
                  const isSel = selected.has(r.id);
                  const isActive = r.status === "active";
                  return (
                    <tr
                      key={r.id}
                      onClick={() => toggleRow(r.id)}
                      onDoubleClick={() => navigate(`/admin/visibility`)}
                      style={isSel ? { background: "var(--bg-inset)" } : undefined}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSel}
                          onChange={() => toggleRow(r.id)}
                          aria-label={`${r.target_key} seç`}
                        />
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--accent-primary-hover)",
                        }}
                      >
                        {shortId(r.id)}
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                        }}
                      >
                        {r.target_key}
                      </td>
                      <td>
                        <span
                          className="chip"
                          style={{ fontSize: 10, color: scopeTone.color }}
                        >
                          {scopeTone.label}
                        </span>
                      </td>
                      <td>
                        <span
                          className="chip"
                          style={{ fontSize: 10, color: actionTone.color }}
                        >
                          {actionTone.label}
                        </span>
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          textAlign: "right",
                          color: "var(--text-muted)",
                        }}
                      >
                        {r.priority}
                      </td>
                      <td>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            fontFamily: "var(--font-mono)",
                            fontSize: 11,
                            color: isActive
                              ? "var(--state-success-fg)"
                              : "var(--text-muted)",
                          }}
                        >
                          <span
                            style={{
                              width: 7,
                              height: 7,
                              borderRadius: "50%",
                              background: isActive
                                ? "var(--state-success-fg)"
                                : "var(--text-muted)",
                              boxShadow: isActive
                                ? "0 0 6px var(--state-success-fg)"
                                : "none",
                            }}
                          />
                          {isActive ? "aktif" : r.status || "pasif"}
                        </span>
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--text-muted)",
                        }}
                      >
                        {timeAgo(r.updated_at)} önce
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
