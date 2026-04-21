/**
 * CockpitShell — Aurora Dusk 4-katmanlı kabuk.
 *
 * Geometri (Aurora design system, cockpit.css):
 *   +------------------------------------------------------+
 *   | ctxbar (48px) — brand + workspace + breadcrumbs +    |
 *   |                  komut arama + bildirim + kullanıcı  |
 *   +--+---------------------------+-----------------------+
 *   | r|                           |                       |
 *   | a|        workbench          |   inspector (340px)   |
 *   | i|                           |   (koşullu)           |
 *   | l|                           |                       |
 *   +--+---------------------------+-----------------------+
 *   | statusbar (28px) — render kuyruğu + sistem telemetri |
 *   +------------------------------------------------------+
 *
 * Bu bileşen sadece kabuk iskeleti. İçerik workbench `children` olarak gelir.
 * Rail/ctxbar/statusbar/inspector görsel öğeleri sabit tasarım tokenları ile.
 *
 * Tüm stiller `[data-surface="aurora"]` altında scope'lu (cockpit.css). Dışarı
 * sızmaz. Kabuğu render eden kök `<div>` üzerinde `data-surface="aurora"`
 * attribute'u şarttır.
 */

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import { useNavigate, useLocation, NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useCommandPaletteStore } from "../../stores/commandPaletteStore";
import { useNotificationStore } from "../../stores/notificationStore";
import { useAuthStore } from "../../stores/authStore";
import { useSSEStatusStore } from "../../stores/sseStatusStore";
import { fetchJobs, type JobResponse } from "../../api/jobsApi";
import type { HorizonNavGroup } from "../../components/layout/HorizonSidebar";
import { Icon, type IconName } from "./icons";
import { useSystemHealth } from "../../hooks/useSystemHealth";
import { useFavorites } from "../../hooks/useFavorites";
import { useRecentPages, recordRecentPage } from "../../hooks/useRecentPages";

// ---------------------------------------------------------------------------
// Rail slot modeli — 6 ana alan
// ---------------------------------------------------------------------------

export interface AuroraRailSlot {
  /** Stabil id (test + telemetri) */
  id: string;
  /** Ekran okuyucu + tooltip etiketi */
  label: string;
  /** Lucide-style icon adı (icons.tsx) */
  icon: IconName;
  /**
   * Aktiflik hesaplaması için prefix listesi. En uzun eşleşen kazanır;
   * birden fazla slot aynı uzunlukta eşlerse rail'deki sıra kazanır.
   * En az bir prefix gerekir.
   */
  matchPrefixes: string[];
  /** Rail tıklamasında gidilecek tek-doğru route — eşitsiz groupIds yüzünden
      yanlış sayfaya yönlenmeyi engeller. */
  homeRoute: string;
  /** Context bar'da gösterilecek horizon nav grup id'leri */
  groupIds: string[];
}

/**
 * Pathname için doğru rail slot'unu bulur.
 *
 * Algoritma — longest-prefix-wins:
 *   - Her slot'un `matchPrefixes` listesindeki tüm prefix'ler denenir.
 *   - "/" sonu farkı normalleştirilir: prefix `/admin/foo` ise hem
 *     `/admin/foo` hem `/admin/foo/...` eşleşir; ama `/admin/foobar`
 *     YANLIŞ eşleşmez (segment sınırı korunur).
 *   - En uzun eşleşen prefix sahibi slot kazanır.
 *   - Hiçbiri eşleşmezse rail'in ilk slot'u (genelde "Bugün") fallback.
 */
export function pickActiveAuroraSlot(
  pathname: string,
  rail: AuroraRailSlot[],
): AuroraRailSlot {
  let best: AuroraRailSlot | null = null;
  let bestLen = -1;
  for (const slot of rail) {
    for (const prefix of slot.matchPrefixes) {
      if (matchesPrefix(pathname, prefix) && prefix.length > bestLen) {
        best = slot;
        bestLen = prefix.length;
      }
    }
  }
  return best ?? rail[0];
}

function matchesPrefix(pathname: string, prefix: string): boolean {
  if (pathname === prefix) return true;
  // Segment sınırı korunmalı: `/admin/foo` prefix'i `/admin/foobar`'a denk
  // gelmemeli, sadece `/admin/foo/...`'a denk gelmeli.
  return pathname.startsWith(prefix + "/");
}

// ---------------------------------------------------------------------------
// Ctxbar — üst context bar
// ---------------------------------------------------------------------------

interface CtxbarProps {
  workspace: string;
  crumbs: Array<{ label: string; to?: string; last?: boolean }>;
  onOpenPalette: () => void;
  unreadCount: number;
  onOpenNotifications: () => void;
  userInitials: string;
  userName: string;
  scopeLabel: string;
  scopeHref: string;
  onSwitchScope: () => void;
  /** Aktif sayfa (favori star toggle için) */
  currentRoute: string;
  currentRouteLabel: string;
  /** Faz 4.1 — operasyonel sağlık sinyali: başarısız iş sayısı + SSE durumu */
  operationalFailedJobs: number;
  operationalSseStatus: "live" | "reconnecting" | "offline";
}

function Ctxbar({
  workspace,
  crumbs,
  onOpenPalette,
  unreadCount,
  onOpenNotifications,
  userInitials,
  userName,
  scopeLabel,
  scopeHref: _scopeHref,
  onSwitchScope,
  currentRoute,
  currentRouteLabel,
  operationalFailedJobs,
  operationalSseStatus,
}: CtxbarProps) {
  const navigate = useNavigate();
  const healthQ = useSystemHealth();
  const favorites = useFavorites();
  const recents = useRecentPages();
  const [recentOpen, setRecentOpen] = useState(false);
  const [favOpen, setFavOpen] = useState(false);
  const recentRef = useRef<HTMLDivElement | null>(null);
  const favRef = useRef<HTMLDivElement | null>(null);

  // Outside click → kapat
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (recentRef.current && !recentRef.current.contains(e.target as Node)) {
        setRecentOpen(false);
      }
      if (favRef.current && !favRef.current.contains(e.target as Node)) {
        setFavOpen(false);
      }
    };
    if (recentOpen || favOpen) {
      document.addEventListener("mousedown", onDoc);
      return () => document.removeEventListener("mousedown", onDoc);
    }
  }, [recentOpen, favOpen]);

  const health = healthQ.data;
  // Faz 4.1 — operasyonel sinyaller (failed jobs + SSE offline) artık
  // "Sistem sağlıklı" rozetini aşağı çeker. Daha önce backend /health yalnız
  // DB + venv bakardı; footer "Hata 9" görünürken header "Sistem sağlıklı"
  // derdi — bu çelişki kullanıcı güvenini kırıyordu. Artık tek kaynaktan akış.
  const backendOk = !!health && health.status === "ok";
  const backendDegraded = !!health && health.status === "degraded";
  const backendError = !!health && health.status !== "ok" && health.status !== "degraded";
  const hasFailedJobs = operationalFailedJobs > 0;
  const sseOffline = operationalSseStatus === "offline";
  const sseReconnecting = operationalSseStatus === "reconnecting";

  let healthTone: "ok" | "warn" | "err";
  let healthLabel: string;
  if (!health) {
    healthTone = "warn";
    healthLabel = "Sağlık kontrol ediliyor";
  } else if (backendError || (hasFailedJobs && operationalFailedJobs >= 5)) {
    healthTone = "err";
    healthLabel = hasFailedJobs && operationalFailedJobs >= 5
      ? `${operationalFailedJobs} hatalı iş`
      : "Sistem hatası";
  } else if (backendDegraded || hasFailedJobs || sseOffline) {
    healthTone = "warn";
    if (hasFailedJobs && sseOffline) {
      healthLabel = `${operationalFailedJobs} hata · SSE kapalı`;
    } else if (hasFailedJobs) {
      healthLabel = `${operationalFailedJobs} hatalı iş`;
    } else if (sseOffline) {
      healthLabel = "Canlı akış kapalı";
    } else if (backendDegraded) {
      healthLabel = "Sistemde kısıtlama";
    } else {
      healthLabel = "Dikkat gereken durumlar";
    }
  } else if (sseReconnecting) {
    healthTone = "warn";
    healthLabel = "Yeniden bağlanıyor";
  } else {
    healthTone = backendOk ? "ok" : "warn";
    healthLabel = "Sistem sağlıklı";
  }

  const healthDetail = health
    ? [
        `App: ${health.app}`,
        `Python: ${health.python_version}`,
        `Venv: ${health.venv_active ? "aktif" : "yok"}`,
        `DB: ${health.db_connected ? "bağlı" : "kopuk"}`,
        `WAL: ${health.db_wal_mode ? "açık" : "kapalı"}`,
        health.db_error ? `DB hata: ${health.db_error}` : null,
        hasFailedJobs ? `Başarısız iş: ${operationalFailedJobs}` : null,
        sseOffline
          ? "SSE: çevrimdışı (fallback polling devrede)"
          : sseReconnecting
            ? "SSE: yeniden bağlanıyor"
            : "SSE: canlı",
      ]
        .filter(Boolean)
        .join(" · ")
    : "Backend /api/v1/health çağrısı bekleniyor";

  const isFav = favorites.isFavorite(currentRoute);

  return (
    <div className="ctxbar" data-testid="aurora-ctxbar">
      <div className="ctxbar-brand" aria-label="ContentHub">
        <span className="brand-mark" aria-hidden="true">CH</span>
      </div>
      <button
        className="workspace-pill"
        data-testid="aurora-workspace-pill"
        title={workspace}
        onClick={() => onOpenPalette()}
      >
        <span className="dot" aria-hidden="true" />
        <span>{workspace}</span>
      </button>
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        {crumbs.map((c, i) => (
          <span key={`${c.label}-${i}`} className={c.last ? "crumb last" : "crumb"}>
            {i > 0 ? <span className="sep" aria-hidden="true">/</span> : null}
            <span>{c.label}</span>
          </span>
        ))}
        <button
          className={isFav ? "ctxbar-fav-star pinned" : "ctxbar-fav-star"}
          data-testid="aurora-fav-toggle"
          onClick={() =>
            favorites.toggle({ to: currentRoute, label: currentRouteLabel })
          }
          aria-label={isFav ? "Favorilerden çıkar" : "Favorilere ekle"}
          title={isFav ? "Favorilerden çıkar" : "Favorilere ekle"}
        >
          <Icon name="star" size={14} />
        </button>
      </nav>
      <button
        className="ctxbar-search"
        onClick={onOpenPalette}
        data-testid="aurora-command-trigger"
        title="Komut Paleti (⌘K)"
      >
        <span>Komut veya içerik ara…</span>
        <span className="k">⌘K</span>
      </button>
      <button
        className={`ctxbar-health ${healthTone}`}
        data-testid="aurora-health-chip"
        onClick={() => healthQ.refetch()}
        title={healthDetail}
        aria-label={healthLabel}
      >
        <span className="dot" aria-hidden="true" />
        <span>{healthLabel}</span>
      </button>
      <div className="ctxbar-recent" ref={recentRef}>
        <button
          className="ctxbar-recent-trigger"
          data-testid="aurora-recent-trigger"
          onClick={() => {
            setRecentOpen((v) => !v);
            setFavOpen(false);
          }}
          aria-label="Son ziyaret edilen sayfalar"
          title="Son ziyaretler"
          aria-expanded={recentOpen}
        >
          <Icon name="clock" size={16} />
        </button>
        {recentOpen ? (
          <div
            className="hud-popover"
            style={{ right: 0 }}
            data-testid="aurora-recent-popover"
          >
            <div className="hud-popover-head">
              <span>Son ziyaretler</span>
              {recents.list.length > 0 ? (
                <button
                  className="hud-popover-clear"
                  onClick={() => recents.clear()}
                  title="Geçmişi temizle"
                >
                  Temizle
                </button>
              ) : null}
            </div>
            {recents.list.length === 0 ? (
              <div className="hud-popover-empty">
                Henüz ziyaret edilmiş sayfa yok.
              </div>
            ) : (
              recents.list.map((r) => (
                <button
                  key={r.to}
                  className="hud-popover-row"
                  onClick={() => {
                    navigate(r.to);
                    setRecentOpen(false);
                  }}
                  title={r.to}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.label}
                  </span>
                  <span className="meta">
                    {fmtRelativeShort(r.visitedAt)}
                  </span>
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>
      <div className="ctxbar-recent" ref={favRef}>
        <button
          className="ctxbar-recent-trigger"
          data-testid="aurora-fav-trigger"
          onClick={() => {
            setFavOpen((v) => !v);
            setRecentOpen(false);
          }}
          aria-label="Favori sayfalar"
          title={`Favoriler (${favorites.list.length})`}
          aria-expanded={favOpen}
        >
          <Icon name="star" size={16} />
        </button>
        {favOpen ? (
          <div
            className="hud-popover"
            style={{ right: 0 }}
            data-testid="aurora-fav-popover"
          >
            <div className="hud-popover-head">
              <span>Favoriler</span>
            </div>
            {favorites.list.length === 0 ? (
              <div className="hud-popover-empty">
                Henüz yıldızlanmış sayfa yok. Üst şeritteki yıldıza basarak ekleyebilirsiniz.
              </div>
            ) : (
              favorites.list.map((f) => (
                <button
                  key={f.to}
                  className="hud-popover-row"
                  onClick={() => {
                    navigate(f.to);
                    setFavOpen(false);
                  }}
                  title={f.to}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {f.label}
                  </span>
                  <span
                    className="meta"
                    onClick={(e) => {
                      e.stopPropagation();
                      favorites.remove(f.to);
                    }}
                    style={{ cursor: "pointer" }}
                    title="Favoriden çıkar"
                  >
                    ✕
                  </span>
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>
      <button
        className="ctxbar-action"
        onClick={onOpenNotifications}
        data-testid="aurora-notifications-trigger"
        aria-label="Bildirimler"
        title="Bildirimler"
      >
        <Icon name="bell" size={16} />
        {unreadCount > 0 ? <span className="pip" aria-hidden="true" /> : null}
      </button>
      <button
        className="ctxbar-user"
        onClick={onSwitchScope}
        data-testid="aurora-scope-switch"
        data-panel-switch="aurora"
        title={`${scopeLabel}'ne geç`}
        aria-label={`${scopeLabel}'ne geç`}
      >
        <span className="avatar">{userInitials}</span>
        <span>{userName}</span>
      </button>
    </div>
  );
}

function fmtRelativeShort(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const sec = Math.max(1, Math.floor(diffMs / 1000));
  if (sec < 60) return `${sec}sn`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}dk`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}sa`;
  const day = Math.floor(hr / 24);
  return `${day}g`;
}

// ---------------------------------------------------------------------------
// Rail — 56px icon-only sol şerit
// ---------------------------------------------------------------------------

interface RailProps {
  slots: AuroraRailSlot[];
  activeSlotId: string;
  onSelect: (slot: AuroraRailSlot) => void;
}

function Rail({ slots, activeSlotId, onSelect }: RailProps) {
  const railRef = useRef<HTMLElement | null>(null);
  const activeIdx = slots.findIndex((s) => s.id === activeSlotId);
  const [focusedIdx, setFocusedIdx] = useState<number>(
    activeIdx >= 0 ? activeIdx : 0,
  );

  useEffect(() => {
    if (activeIdx >= 0) setFocusedIdx(activeIdx);
  }, [activeIdx]);

  const focusBtn = useCallback(
    (i: number) => {
      const el = railRef.current?.querySelector<HTMLButtonElement>(
        `[data-testid="aurora-rail-${slots[i]?.id}"]`,
      );
      el?.focus();
    },
    [slots],
  );

  const onKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLElement>) => {
      const n = slots.length;
      if (n === 0) return;
      let next = focusedIdx;
      switch (e.key) {
        case "ArrowDown":
        case "ArrowRight":
          next = (focusedIdx + 1) % n;
          break;
        case "ArrowUp":
        case "ArrowLeft":
          next = (focusedIdx - 1 + n) % n;
          break;
        case "Home":
          next = 0;
          break;
        case "End":
          next = n - 1;
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          onSelect(slots[focusedIdx]);
          return;
        default:
          return;
      }
      e.preventDefault();
      setFocusedIdx(next);
      requestAnimationFrame(() => focusBtn(next));
    },
    [focusedIdx, slots, onSelect, focusBtn],
  );

  // Dijit hotkey (1..6) — editable element dışında
  useEffect(() => {
    const isEditable = (el: EventTarget | null): boolean => {
      if (!(el instanceof HTMLElement)) return false;
      const t = el.tagName;
      if (t === "INPUT" || t === "TEXTAREA" || t === "SELECT") return true;
      if (el.isContentEditable) return true;
      return false;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isEditable(e.target)) return;
      const d = parseInt(e.key, 10);
      if (!Number.isNaN(d) && d >= 1 && d <= slots.length) {
        const slot = slots[d - 1];
        if (slot) {
          e.preventDefault();
          setFocusedIdx(d - 1);
          onSelect(slot);
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [slots, onSelect]);

  return (
    <aside
      ref={(el) => {
        railRef.current = el;
      }}
      className="rail"
      data-testid="aurora-rail"
      role="navigation"
      aria-label="Aurora birincil raya"
      onKeyDown={onKeyDown}
    >
      {slots.map((slot, i) => {
        const active = slot.id === activeSlotId;
        const focused = i === focusedIdx;
        return (
          <button
            key={slot.id}
            className={active ? "rail-item active" : "rail-item"}
            data-testid={`aurora-rail-${slot.id}`}
            data-active={active ? "true" : undefined}
            aria-label={slot.label}
            aria-current={active ? "page" : undefined}
            tabIndex={focused ? 0 : -1}
            onClick={() => {
              setFocusedIdx(i);
              onSelect(slot);
            }}
            onFocus={() => setFocusedIdx(i)}
            title={`${slot.label} (${i + 1})`}
          >
            <Icon name={slot.icon} size={20} />
            <span className="rail-label" aria-hidden="true">{slot.label}</span>
            <span className="tt" role="tooltip">{slot.label}</span>
          </button>
        );
      })}
      <div className="rail-spacer" />
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Inspector — sağ drawer
// ---------------------------------------------------------------------------

export interface InspectorProps {
  title: string;
  open: boolean;
  onClose: () => void;
  children?: ReactNode;
}

function Inspector({ title, open, onClose, children }: InspectorProps) {
  if (!open) return null;
  return (
    <aside className="inspector" data-testid="aurora-inspector" aria-label={title}>
      <div className="inspector-head">
        <span className="title">{title}</span>
        <button
          className="close"
          onClick={onClose}
          aria-label="Inspector'ü kapat"
          title="Kapat"
          data-testid="aurora-inspector-close"
        >
          ✕
        </button>
      </div>
      {children}
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Statusbar — canlı operasyon telemetri
// ---------------------------------------------------------------------------

interface StatusbarProps {
  renderQueueCount: number;
  renderActiveCount: number;
  jobs: { queued: number; running: number; failed: number };
  sse: "live" | "reconnecting" | "offline";
  /** Job drill-down route prefix (admin → /admin/jobs, user → /user/jobs) */
  jobsBase: string;
}

function Statusbar({
  renderQueueCount,
  renderActiveCount,
  jobs,
  sse,
  jobsBase,
}: StatusbarProps) {
  const navigate = useNavigate();
  const sseTone = sse === "live" ? "ok" : sse === "reconnecting" ? "warn" : "err";
  const sseLabel =
    sse === "live"
      ? "Canlı"
      : sse === "reconnecting"
        ? "Yeniden bağlanıyor"
        : "Çevrimdışı";
  const goJobs = (status: string) => navigate(`${jobsBase}?status=${status}`);
  return (
    <div className="statusbar" data-testid="aurora-statusbar">
      <div className={`cell ${sseTone}`} title={`SSE bağlantı durumu: ${sseLabel}`}>
        <span className="dot" aria-hidden="true" />
        <span>SSE</span>
        <span className="v">{sseLabel}</span>
      </div>
      <button
        type="button"
        className="cell info clickable"
        data-testid="aurora-status-queued"
        onClick={() => goJobs("queued")}
        title="Kuyruktaki işleri gör"
      >
        <span className="dot" aria-hidden="true" />
        <span>Kuyruk</span>
        <span className="v">{jobs.queued}</span>
      </button>
      <button
        type="button"
        className="cell info clickable"
        data-testid="aurora-status-running"
        onClick={() => goJobs("running")}
        title="Çalışan işleri gör"
      >
        <span className="dot" aria-hidden="true" />
        <span>Çalışan</span>
        <span className="v">{jobs.running}</span>
      </button>
      <button
        type="button"
        className={`cell clickable ${jobs.failed > 0 ? "err" : "ok"}`}
        data-testid="aurora-status-failed"
        onClick={() => goJobs("failed")}
        title="Başarısız işleri gör"
      >
        <span className="dot" aria-hidden="true" />
        <span>Hata</span>
        <span className="v">{jobs.failed}</span>
      </button>
      <div className="spacer" />
      {renderActiveCount > 0 || renderQueueCount > 0 ? (
        <button
          type="button"
          className="render-chip"
          data-testid="aurora-render-chip"
          title="Render kuyruğu — çalışan işlere git"
          onClick={() => goJobs("running")}
        >
          <span className="pulse" aria-hidden="true" />
          <span>
            Render {renderActiveCount} / {renderQueueCount}
          </span>
        </button>
      ) : (
        <div className="cell ok" title="Render kuyruğu boş">
          <span className="dot" aria-hidden="true" />
          <span>Render</span>
          <span className="v">Boş</span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CockpitShell — tüm parçaları birleştirir
// ---------------------------------------------------------------------------

export interface CockpitShellProps {
  /** Rail slotları + horizon-style context gruplarıyla eşleme */
  rail: AuroraRailSlot[];
  /** Context panel için horizon-style nav grupları (görünürlük filtresinden geçmiş) */
  groups: HorizonNavGroup[];
  /** Workspace etiketi (ctxbar pill) */
  workspace: string;
  /** Scope label — karşı panel adı (ör. "Yönetim Paneli" veya "Kullanıcı Paneli") */
  scopeLabel: string;
  /** Karşı panele geçiş route'u */
  scopeHref: string;
  /** Kullanıcı bilgisi */
  userName: string;
  userInitials: string;
  /** Inspector içeriği ve başlığı — isteğe bağlı */
  inspector?: {
    title: string;
    open: boolean;
    onClose: () => void;
    content?: ReactNode;
  };
  /** Workbench içeriği */
  children: ReactNode;
  /** Breadcrumb için ek crumb'lar (ctxbar) */
  extraCrumbs?: Array<{ label: string; to?: string }>;
}

export function CockpitShell({
  rail,
  groups,
  workspace,
  scopeLabel,
  scopeHref,
  userName,
  userInitials,
  inspector,
  children,
  extraCrumbs,
}: CockpitShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const activeSlot = pickActiveAuroraSlot(location.pathname, rail);

  const contextSections = useMemo(
    () => groups.filter((g) => activeSlot.groupIds.includes(g.id)),
    [groups, activeSlot],
  );

  const onSelectSlot = useCallback(
    (slot: AuroraRailSlot) => {
      // Sabit homeRoute: groupIds sıralamasına bağımlı değil — kullanıcı
      // her seferinde aynı yere düşer, "bazen başka sayfa" sorunu engellenir.
      navigate(slot.homeRoute);
    },
    [navigate],
  );

  const onOpenPalette = useCallback(() => {
    useCommandPaletteStore.getState().open();
  }, []);
  const onOpenNotifications = useCallback(() => {
    useNotificationStore.getState().openPanel();
  }, []);
  const onSwitchScope = useCallback(() => {
    navigate(scopeHref);
  }, [navigate, scopeHref]);

  const unreadCount = useNotificationStore((s) =>
    s.notifications.filter((n) => !n.read).length,
  );

  // Canlı job telemetrisi — React Query ile backend'den çeker. 15s'lik
  // refetch interval cockpit'i hafifçe güncel tutar; daha sık güncelleme
  // için job engine SSE event'leri invalidateQueries çağırır.
  const authUser = useAuthStore((s) => s.user);
  const jobsQ = useQuery<JobResponse[]>({
    queryKey: ["jobs", "cockpit-telemetry"],
    queryFn: () => fetchJobs({}),
    refetchInterval: 15_000,
    enabled: !!authUser,
    staleTime: 5_000,
  });
  const jobList = jobsQ.data ?? [];
  const jobs = useMemo(() => {
    let queued = 0;
    let running = 0;
    let failed = 0;
    for (const j of jobList) {
      const s = j.status;
      if (s === "queued" || s === "pending" || s === "waiting_review") queued += 1;
      else if (s === "running" || s === "scheduled" || s === "waiting") running += 1;
      else if (s === "failed" || s === "error") failed += 1;
    }
    return { queued, running, failed };
  }, [jobList]);

  // Render kuyruğu = render step'i aktif olan iş; aktif render = running
  // durumundaki işlerden "render" isimli step'i çalışan olanlar. Step yoksa
  // genel running sayısına düşer.
  const renderCounts = useMemo(() => {
    let rQueue = 0;
    let rActive = 0;
    for (const j of jobList) {
      const steps = j.steps ?? [];
      const renderStep = steps.find((s) => /render/i.test(s.step_key ?? ""));
      if (renderStep) {
        if (renderStep.status === "running") rActive += 1;
        else if (
          renderStep.status === "queued" ||
          renderStep.status === "pending"
        )
          rQueue += 1;
      } else if (j.status === "running") {
        rActive += 1;
      } else if (j.status === "queued") {
        rQueue += 1;
      }
    }
    return { queue: rQueue, active: rActive };
  }, [jobList]);
  const renderQueueCount = renderCounts.queue;
  const renderActiveCount = renderCounts.active;

  const crumbs = useMemo(() => {
    const base = [
      { label: activeSlot.label },
      ...(extraCrumbs ?? []),
    ];
    if (base.length > 0) base[base.length - 1] = { ...base[base.length - 1], last: true } as {
      label: string;
      last: boolean;
    };
    return base;
  }, [activeSlot, extraCrumbs]);

  const inspectorOpen = !!inspector?.open;

  // SSE durumu — useGlobalSSE layout seviyesinde çalışır ve sseStatusStore'a
  // gerçek connection state'ini yazar. Cockpit Statusbar burada okur.
  const sseStatus = useSSEStatusStore((s) => s.status);

  // Job drill-down route prefix: admin → /admin/jobs, user → /user/jobs.
  // location.pathname'in ilk segmentinden türetilir; "/admin/..." veya
  // "/user/..." dışındaki route'larda admin'e fallback olur.
  const jobsBase = useMemo(() => {
    if (location.pathname.startsWith("/user")) return "/user/jobs";
    return "/admin/jobs";
  }, [location.pathname]);

  // Aktif route etiketi — son crumb favori/recent için "okunabilir başlık"
  // olarak kullanılır; yoksa rail slot adı + son path segmenti birleştirilir.
  const currentRouteLabel = useMemo(() => {
    const lastCrumb = crumbs[crumbs.length - 1]?.label;
    if (lastCrumb) return lastCrumb;
    return activeSlot.label;
  }, [crumbs, activeSlot]);

  // Route değiştikçe Recent Pages listesini güncelle.
  // Login/oauth callback gibi geçici route'ları kaydetmemek için filtre.
  useEffect(() => {
    const path = location.pathname;
    if (
      path === "/" ||
      path.startsWith("/login") ||
      path.startsWith("/auth/") ||
      path.startsWith("/oauth")
    ) {
      return;
    }
    recordRecentPage({ to: path + location.search, label: currentRouteLabel });
  }, [location.pathname, location.search, currentRouteLabel]);

  return (
    <div className="cockpit" data-surface="aurora" data-testid="aurora-cockpit">
      <Ctxbar
        workspace={workspace}
        crumbs={crumbs}
        onOpenPalette={onOpenPalette}
        unreadCount={unreadCount}
        onOpenNotifications={onOpenNotifications}
        userInitials={userInitials}
        userName={userName}
        scopeLabel={scopeLabel}
        scopeHref={scopeHref}
        onSwitchScope={onSwitchScope}
        currentRoute={location.pathname + location.search}
        currentRouteLabel={currentRouteLabel}
        operationalFailedJobs={jobs.failed}
        operationalSseStatus={sseStatus}
      />
      <Rail slots={rail} activeSlotId={activeSlot.id} onSelect={onSelectSlot} />
      <div className={inspectorOpen ? "body" : "body no-inspector"}>
        <main className="workbench" data-testid="aurora-workbench">
          {/* Context panel inline at top of workbench — dense cockpit layout
              doesn't carve out a separate column, instead offering the nav as
              a floating chip row + deeper nav in command palette. */}
          {contextSections.length > 0 ? (
            <nav
              className="hstack"
              aria-label="Alan içi gezinme"
              style={{ padding: "12px 28px 0", gap: 8, flexWrap: "wrap" }}
              data-testid="aurora-context-nav"
            >
              {contextSections.flatMap((sec) =>
                sec.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/admin" || item.to === "/user"}
                    className={({ isActive }) => (isActive ? "chip brand" : "chip")}
                    data-testid={`aurora-context-link-${item.to}`}
                  >
                    <span>{item.label}</span>
                  </NavLink>
                )),
              )}
            </nav>
          ) : null}
          {/* Faz 4.1 — SSE honesty banner.
              SSE düşerse React Query `refetchInterval` ile polling yapmaya
              devam ediyor; kullanıcıya "canlı akış yok, polling ile
              çalışılıyor" gerçeğini açıkça söyle. */}
          {sseStatus === "offline" ? (
            <div
              role="status"
              aria-live="polite"
              data-testid="aurora-sse-fallback-banner"
              style={{
                margin: "12px 28px 0",
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid var(--state-warning-fg)",
                background: "var(--state-warning-bg, rgba(245,158,11,0.08))",
                color: "var(--state-warning-fg)",
                fontSize: 12,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10 }}>●</span>
              <span>
                Canlı akış çevrimdışı — veriler periyodik yenileme (polling) ile
                güncelleniyor. Gecikme beklenebilir.
              </span>
            </div>
          ) : null}
          {children}
        </main>
        {inspector ? (
          <Inspector
            title={inspector.title}
            open={inspector.open}
            onClose={inspector.onClose}
          >
            {inspector.content}
          </Inspector>
        ) : null}
      </div>
      <Statusbar
        renderQueueCount={renderQueueCount}
        renderActiveCount={renderActiveCount}
        jobs={jobs}
        sse={sseStatus}
        jobsBase={jobsBase}
      />
    </div>
  );
}
