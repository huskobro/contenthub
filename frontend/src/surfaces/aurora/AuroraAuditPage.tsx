/**
 * Aurora Audit — port of design/contenthub/pages/admin/audit.html.
 * Live audit log feed: filters (search + type chips) + 6 sütunlu tablo +
 * inspector (bu hafta sayaçları, aktif kullanıcılar).
 *
 * Veri kaynağı: useAuditLogs() (M15 backend). action stringi öneklerine göre
 * "type" türetilir (publish/create/update/delete/login/system).
 */
import { useMemo, useState } from "react";
import { useAuditLogs } from "../../hooks/useAuditLogs";
import type { AuditLogEntry } from "../../api/auditLogApi";
import {
  AuroraInspector,
  AuroraInspectorSection,
  AuroraInspectorRow,
  AuroraButton,
} from "./primitives";
import { Icon } from "./icons";
import type { IconName } from "./icons";
import { exportRowsAsCsv, csvTimestamp } from "../../lib/csvExport";
import { useToast } from "../../hooks/useToast";

// --- helpers ---------------------------------------------------------------

type AuditType =
  | "create"
  | "update"
  | "delete"
  | "publish"
  | "login"
  | "system";

const TYPE_OPTIONS: Array<{ value: AuditType | "all"; label: string }> = [
  { value: "all", label: "Tümü" },
  { value: "create", label: "Oluşturma" },
  { value: "update", label: "Güncelleme" },
  { value: "delete", label: "Silme" },
  { value: "publish", label: "Yayın" },
  { value: "login", label: "Oturum" },
];

const ICON_MAP: Record<AuditType, IconName> = {
  create: "plus",
  update: "edit",
  delete: "trash",
  publish: "send",
  login: "user",
  system: "settings",
};

function classifyAction(action: string): AuditType {
  const a = (action || "").toLowerCase();
  if (a.includes("publish") || a.includes("yayınla") || a.includes("yayinla")) return "publish";
  if (a.includes("delete") || a.includes("sil") || a.includes("remove")) return "delete";
  if (a.includes("create") || a.includes("oluştur") || a.includes("olustur") || a.includes("add")) return "create";
  if (a.includes("login") || a.includes("logout") || a.includes("oturum") || a.includes("session")) return "login";
  if (a.includes("system") || a.includes("backup") || a.includes("yedek") || a.includes("auto")) return "system";
  return "update";
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("tr-TR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

function actorLabel(entry: AuditLogEntry): string {
  if (entry.actor_id) return entry.actor_id.slice(0, 12);
  return entry.actor_type || "system";
}

function resourceLabel(entry: AuditLogEntry): string {
  if (entry.entity_type && entry.entity_id) {
    return `${entry.entity_type}:${entry.entity_id.slice(0, 10)}`;
  }
  return entry.entity_type || entry.entity_id || "—";
}

function detailLabel(entry: AuditLogEntry): string {
  if (!entry.details_json) return "";
  try {
    const obj = JSON.parse(entry.details_json);
    if (typeof obj === "string") return obj;
    const keys = Object.keys(obj);
    if (!keys.length) return "";
    const first = keys[0];
    const v = obj[first];
    return typeof v === "object" ? `${first}: …` : `${first}: ${String(v)}`;
  } catch {
    return entry.details_json.slice(0, 60);
  }
}

// --- page ------------------------------------------------------------------

export function AuroraAuditPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<AuditType | "all">("all");
  const toast = useToast();

  const { data, isLoading, isError } = useAuditLogs({ limit: 100 });
  const entries = data?.items ?? [];

  const enriched = useMemo(
    () => entries.map((e) => ({ ...e, type: classifyAction(e.action) })),
    [entries]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enriched.filter((e) => {
      if (filter !== "all" && e.type !== filter) return false;
      if (!q) return true;
      return (
        (e.action || "").toLowerCase().includes(q) ||
        (e.entity_id || "").toLowerCase().includes(q) ||
        (e.entity_type || "").toLowerCase().includes(q) ||
        (e.actor_id || "").toLowerCase().includes(q)
      );
    });
  }, [enriched, search, filter]);

  // --- inspector ---------------------------------------------------------

  const weekCounts = useMemo(() => {
    const acc: Record<AuditType, number> = {
      create: 0,
      update: 0,
      delete: 0,
      publish: 0,
      login: 0,
      system: 0,
    };
    for (const e of enriched) acc[e.type]++;
    return acc;
  }, [enriched]);

  const activeUsers = useMemo(() => {
    const set = new Set<string>();
    for (const e of enriched) {
      if (e.actor_id) set.add(e.actor_id);
    }
    return Array.from(set).slice(0, 6);
  }, [enriched]);

  const handleExportCsv = () => {
    if (filtered.length === 0) {
      toast.error("Dışa aktarılacak kayıt yok");
      return;
    }
    exportRowsAsCsv(`audit-${csvTimestamp()}.csv`, filtered, [
      { header: "ID", value: (e) => e.id },
      { header: "Tarih", value: (e) => e.created_at },
      { header: "Aktör tipi", value: (e) => e.actor_type ?? "" },
      { header: "Aktör", value: (e) => e.actor_id ?? "" },
      { header: "Aksiyon", value: (e) => e.action },
      { header: "Tip", value: (e) => e.type },
      { header: "Varlık tipi", value: (e) => e.entity_type ?? "" },
      { header: "Varlık ID", value: (e) => e.entity_id ?? "" },
      { header: "Detay (JSON)", value: (e) => e.details_json ?? "" },
    ]);
    toast.success(`${filtered.length} kayıt dışa aktarıldı`);
  };

  const inspector = (
    <AuroraInspector title="Özet">
      <AuroraInspectorSection title="Bu hafta">
        <AuroraInspectorRow label="Oluşturma" value={String(weekCounts.create)} />
        <AuroraInspectorRow label="Güncelleme" value={String(weekCounts.update)} />
        <AuroraInspectorRow label="Silme" value={String(weekCounts.delete)} />
        <AuroraInspectorRow label="Yayın" value={String(weekCounts.publish)} />
        <AuroraInspectorRow label="Oturum" value={String(weekCounts.login)} />
        <AuroraInspectorRow label="Sistem" value={String(weekCounts.system)} />
      </AuroraInspectorSection>
      {activeUsers.length > 0 && (
        <AuroraInspectorSection title="Aktif kullanıcılar">
          {activeUsers.map((u) => (
            <div key={u} className="audit-user-row">
              <div className="audit-avatar">{u.charAt(0).toUpperCase()}</div>
              <span className="name">{u.slice(0, 16)}</span>
            </div>
          ))}
        </AuroraInspectorSection>
      )}
    </AuroraInspector>
  );

  // --- render ------------------------------------------------------------

  return (
    <div className="aurora-audit">
      <div className="page">
        <div className="page-head">
          <div>
            <h1>Denetim kaydı</h1>
            <div className="sub">
              {isLoading
                ? "yükleniyor…"
                : `${entries.length} kayıt · tüm aktiviteler`}
            </div>
          </div>
          <AuroraButton
            size="sm"
            iconLeft={<Icon name="arrow-up-right" size={12} />}
            onClick={handleExportCsv}
            data-testid="aurora-audit-export"
          >
            CSV
          </AuroraButton>
        </div>

        {/* Filters */}
        <div className="audit-toolbar">
          <div className="audit-search">
            <span className="ico">
              <Icon name="search" size={13} />
            </span>
            <input
              type="text"
              placeholder="Kullanıcı, kaynak ara…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={"audit-chip" + (filter === opt.value ? " active" : "")}
              onClick={() => setFilter(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="card" style={{ overflow: "auto" }}>
          <div className="audit-head">
            <span></span>
            <span>Zaman</span>
            <span>Kullanıcı</span>
            <span>İşlem</span>
            <span>Kaynak</span>
            <span>IP</span>
          </div>
          {isError && (
            <div className="audit-empty">Denetim kayıtları yüklenemedi.</div>
          )}
          {!isError && filtered.map((e) => (
            <div key={e.id} className="audit-row">
              <div className={"audit-icon " + e.type}>
                <Icon name={ICON_MAP[e.type]} size={13} />
              </div>
              <span className="audit-time">{formatTime(e.created_at)}</span>
              <span className="audit-actor">{actorLabel(e)}</span>
              <span className="audit-action">
                {e.action} · <span className="res">{resourceLabel(e)}</span>
              </span>
              <span className="audit-detail">{detailLabel(e)}</span>
              <span className="audit-ip">—</span>
            </div>
          ))}
          {!isError && !isLoading && filtered.length === 0 && (
            <div className="audit-empty">
              {entries.length === 0
                ? "Henüz denetim kaydı yok."
                : "Filtreye uyan kayıt bulunamadı."}
            </div>
          )}
        </div>
      </div>
      <aside className="aurora-inspector-slot">{inspector}</aside>
    </div>
  );
}
