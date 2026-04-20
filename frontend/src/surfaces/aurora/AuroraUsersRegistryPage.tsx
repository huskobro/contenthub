/**
 * AuroraUsersRegistryPage — Aurora Dusk Cockpit / Kullanıcı Kayıtları (admin).
 *
 * Direct port of `docs/aurora-design-source/project/contenthub/pages/admin/users-registry.html`.
 * Tasarım hedefi:
 *   - Page-head (başlık + alt başlık + "Kullanıcı ekle" aksiyonu)
 *   - reg-tbl: checkbox / ID / e-posta / kullanıcı adı / ad-soyad / rol /
 *     durum / son giriş / oluşturma kolonları
 *   - Rol chip (admin / operator / viewer / user) ve durum chip
 *     (active / disabled / locked)
 *   - Inspector: toplam, aktif/disabled, rol dağılımı, son 24s eklenen
 *
 * Veri kaynağı: useUsers() — gerçek UserResponse[] (M40 backend).
 * Mutations: useDeleteUser (toplu ya da tek seçim için).
 * Hiçbir legacy code değiştirilmez; surface override sistemi tarafından
 * `admin.users.registry` slot'una bağlanması beklenir (register.tsx
 * dokunulmaz; Faz P2 kayıt geçişi sırasında eklenir).
 *
 * Faz 1 güvenlik: window.prompt() kaldırıldı, CreateUserModal eklendi.
 */
import { useMemo, useState, useRef, useEffect, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useUsers, useDeleteUser, useCreateUser } from "../../hooks/useUsers";
import type { UserResponse } from "../../api/usersApi";
import { useToast } from "../../hooks/useToast";
import {
  AuroraButton,
  AuroraInspector,
  AuroraInspectorSection,
  AuroraInspectorRow,
} from "./primitives";
import { Icon } from "./icons";

// ---------------------------------------------------------------------------
// CreateUserModal — inline modal, no external deps
// ---------------------------------------------------------------------------

interface CreateUserModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { email: string; display_name: string; role: string }) => void;
  isPending: boolean;
}

const VALID_ROLES = ["user", "operator", "viewer", "admin"] as const;

function CreateUserModal({ open, onClose, onSubmit, isPending }: CreateUserModalProps) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("user");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const emailRef = useRef<HTMLInputElement>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setEmail("");
      setDisplayName("");
      setRole("user");
      setErrors({});
      setTimeout(() => emailRef.current?.focus(), 50);
    }
  }, [open]);

  // Derive display name from email when display name is empty
  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (!displayName) {
      const local = val.split("@")[0] ?? "";
      if (local) setDisplayName(local);
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!email.trim()) errs.email = "E-posta zorunludur.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      errs.email = "Geçersiz e-posta formatı.";
    if (!displayName.trim()) errs.displayName = "Görünür ad zorunludur.";
    return errs;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSubmit({ email: email.trim(), display_name: displayName.trim(), role });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };

  if (!open) return null;

  const overlayStyle: React.CSSProperties = {
    position: "fixed", inset: 0, zIndex: 1000,
    background: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)",
    display: "flex", alignItems: "center", justifyContent: "center",
  };
  const panelStyle: React.CSSProperties = {
    background: "var(--bg-surface, #1a1d23)",
    border: "1px solid var(--border-subtle, #2a2d35)",
    borderRadius: 10, padding: "24px 28px", minWidth: 360, maxWidth: 440,
    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
  };
  const fieldStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4, marginBottom: 14 };
  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, color: "var(--text-secondary, #9ca3af)",
    fontFamily: "var(--font-mono, monospace)", letterSpacing: "0.04em",
  };
  const inputStyle: React.CSSProperties = {
    background: "var(--bg-inset, #13151a)", border: "1px solid var(--border-subtle, #2a2d35)",
    borderRadius: 6, padding: "8px 10px", fontSize: 13, color: "var(--text-primary, #e5e7eb)",
    fontFamily: "inherit", outline: "none",
  };
  const errStyle: React.CSSProperties = { fontSize: 11, color: "var(--state-danger-fg, #f87171)", marginTop: 2 };
  const footerStyle: React.CSSProperties = { display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 };

  return (
    <div style={overlayStyle} onClick={onClose} onKeyDown={handleKeyDown} role="dialog" aria-modal="true" aria-label="Kullanıcı ekle">
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ margin: "0 0 18px", fontSize: 15, fontWeight: 600, color: "var(--text-primary, #e5e7eb)" }}>
          Yeni Kullanıcı Ekle
        </h2>

        <form onSubmit={handleSubmit} noValidate>
          <div style={fieldStyle}>
            <label style={labelStyle}>E-POSTA *</label>
            <input
              ref={emailRef}
              type="email"
              style={inputStyle}
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              placeholder="kullanici@ornek.com"
              autoComplete="off"
              disabled={isPending}
            />
            {errors.email && <span style={errStyle}>{errors.email}</span>}
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>GÖRÜNÜR AD *</label>
            <input
              type="text"
              style={inputStyle}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ad Soyad"
              disabled={isPending}
            />
            {errors.displayName && <span style={errStyle}>{errors.displayName}</span>}
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>ROL</label>
            <select
              style={{ ...inputStyle, cursor: "pointer" }}
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={isPending}
            >
              {VALID_ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div style={footerStyle}>
            <AuroraButton type="button" variant="ghost" size="sm" onClick={onClose} disabled={isPending}>
              İptal
            </AuroraButton>
            <AuroraButton type="submit" variant="primary" size="sm" disabled={isPending}>
              {isPending ? "Oluşturuluyor…" : "Kullanıcı Oluştur"}
            </AuroraButton>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tone maps — rol ve durum chip renkleri
// ---------------------------------------------------------------------------

type RoleKey = "admin" | "operator" | "viewer" | "user";

const ROLE_TONE: Record<RoleKey, { color: string; label: string }> = {
  admin: { color: "var(--role-admin-fg)", label: "admin" },
  operator: { color: "var(--role-operator-fg)", label: "operator" },
  viewer: { color: "var(--role-viewer-fg)", label: "viewer" },
  user: { color: "var(--role-user-fg)", label: "user" },
};

function roleToneOf(role: string): { color: string; label: string } {
  const key = (role || "").toLowerCase() as RoleKey;
  return ROLE_TONE[key] ?? { color: "var(--text-muted)", label: role || "—" };
}

type StatusKey = "active" | "disabled" | "locked";

const STATUS_TONE: Record<StatusKey, { color: string; label: string }> = {
  active: { color: "var(--state-success-fg)", label: "aktif" },
  disabled: { color: "var(--text-muted)", label: "pasif" },
  locked: { color: "var(--state-danger-fg)", label: "kilitli" },
};

function statusToneOf(status: string): { color: string; label: string } {
  const key = (status || "").toLowerCase() as StatusKey;
  return STATUS_TONE[key] ?? { color: "var(--text-muted)", label: status || "—" };
}

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

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

// Backend `UserResponse` doesn't expose `last_login_at` or `username`.
// We derive a username from `slug`/email and treat `updated_at` as a "last
// activity" proxy until the API surfaces last-login (tracked in backlog).
function usernameOf(u: UserResponse): string {
  if (u.slug) return u.slug;
  const local = (u.email ?? "").split("@")[0] ?? "";
  return local || "—";
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function AuroraUsersRegistryPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const { data: users, isLoading, isError, error } = useUsers();
  const list = users ?? [];

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const deleteMutation = useDeleteUser();
  const createMutation = useCreateUser();

  const handleCreateUser = () => setCreateModalOpen(true);

  const handleCreateSubmit = (data: { email: string; display_name: string; role: string }) => {
    createMutation.mutate(data, {
      onSuccess: (created) => {
        toast.success(`${created.display_name} oluşturuldu`);
        setCreateModalOpen(false);
        navigate(`/admin/users/${created.id}/settings`);
      },
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : "Kullanıcı oluşturulamadı"),
    });
  };

  // KPI counts
  const counts = useMemo(() => {
    const c = {
      total: list.length,
      active: 0,
      disabled: 0,
      locked: 0,
      admin: 0,
      operator: 0,
      viewer: 0,
      user: 0,
      last24h: 0,
    };
    const now = Date.now();
    for (const u of list) {
      const status = (u.status || "").toLowerCase();
      if (status === "active") c.active += 1;
      else if (status === "disabled") c.disabled += 1;
      else if (status === "locked") c.locked += 1;

      const role = (u.role || "").toLowerCase();
      if (role === "admin") c.admin += 1;
      else if (role === "operator") c.operator += 1;
      else if (role === "viewer") c.viewer += 1;
      else if (role === "user") c.user += 1;

      const t = new Date(u.created_at).getTime();
      if (Number.isFinite(t) && now - t < 24 * 3600 * 1000) c.last24h += 1;
    }
    return c;
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
      return new Set(list.map((u) => u.id));
    });
  }

  async function handleBulkDeactivate() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (!confirm(`${ids.length} kullanıcı pasif yapılsın mı?`)) return;
    let ok = 0;
    for (const id of ids) {
      try {
        await deleteMutation.mutateAsync(id);
        ok += 1;
      } catch {
        /* useApiError zaten toast atıyor */
      }
    }
    setSelected(new Set());
    if (ok > 0) toast.success(`${ok}/${ids.length} kullanıcı pasif yapıldı`);
  }

  const inspector = (
    <AuroraInspector title="Kullanıcılar">
      <AuroraInspectorSection title="Toplam">
        <AuroraInspectorRow label="kullanıcı" value={String(counts.total)} />
        <AuroraInspectorRow label="aktif" value={String(counts.active)} />
        <AuroraInspectorRow label="pasif" value={String(counts.disabled)} />
        {counts.locked > 0 && (
          <AuroraInspectorRow label="kilitli" value={String(counts.locked)} />
        )}
      </AuroraInspectorSection>
      <AuroraInspectorSection title="Rol dağılımı">
        <AuroraInspectorRow label="admin" value={String(counts.admin)} />
        <AuroraInspectorRow label="operator" value={String(counts.operator)} />
        <AuroraInspectorRow label="viewer" value={String(counts.viewer)} />
        <AuroraInspectorRow label="user" value={String(counts.user)} />
      </AuroraInspectorSection>
      <AuroraInspectorSection title="Son 24 saat">
        <AuroraInspectorRow label="eklenen" value={String(counts.last24h)} />
      </AuroraInspectorSection>
      {selected.size > 0 && (
        <AuroraInspectorSection title="Seçim">
          <AuroraInspectorRow label="seçili" value={String(selected.size)} />
          <div style={{ marginTop: 8 }}>
            <AuroraButton
              variant="danger"
              size="sm"
              disabled={deleteMutation.isPending}
              onClick={handleBulkDeactivate}
              iconLeft={<Icon name="trash" size={11} />}
            >
              Seçilenleri pasif yap
            </AuroraButton>
          </div>
        </AuroraInspectorSection>
      )}
    </AuroraInspector>
  );

  return (
    <>
    <CreateUserModal
      open={createModalOpen}
      onClose={() => setCreateModalOpen(false)}
      onSubmit={handleCreateSubmit}
      isPending={createMutation.isPending}
    />
    <div className="aurora-dashboard">
      <div className="page">
        <div className="page-head">
          <div>
            <h1>Kullanıcılar</h1>
            <div className="sub">
              {list.length} kullanıcı · role-based access
            </div>
          </div>
          <div className="hstack" style={{ gap: 8 }}>
            <AuroraButton
              variant="primary"
              size="sm"
              onClick={handleCreateUser}
              iconLeft={<Icon name="plus" size={11} />}
            >
              Kullanıcı ekle
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
            Henüz kullanıcı yok.{" "}
            <AuroraButton
              variant="ghost"
              size="sm"
              onClick={handleCreateUser}
            >
              İlk kullanıcıyı ekle →
            </AuroraButton>
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
                  <th>E-posta</th>
                  <th>Kullanıcı adı</th>
                  <th>Ad-soyad</th>
                  <th>Rol</th>
                  <th>Durum</th>
                  <th>Son giriş</th>
                  <th>Oluşturma</th>
                </tr>
              </thead>
              <tbody>
                {list.map((u) => {
                  const role = roleToneOf(u.role);
                  const status = statusToneOf(u.status);
                  const isSel = selected.has(u.id);
                  return (
                    <tr
                      key={u.id}
                      onDoubleClick={() => navigate(`/admin/users/${u.id}/settings`)}
                      style={isSel ? { background: "var(--bg-inset)" } : undefined}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSel}
                          onChange={() => toggleRow(u.id)}
                          aria-label={`${u.display_name} seç`}
                        />
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--accent-primary-hover)",
                        }}
                      >
                        {shortId(u.id)}
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--text-muted)",
                        }}
                      >
                        {u.email}
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--text-secondary)",
                        }}
                      >
                        {usernameOf(u)}
                      </td>
                      <td style={{ fontWeight: 500 }}>
                        <button
                          type="button"
                          onClick={() => navigate(`/admin/users/${u.id}/settings`)}
                          style={{
                            background: "none",
                            border: "none",
                            padding: 0,
                            color: "inherit",
                            font: "inherit",
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                        >
                          {u.display_name || "—"}
                        </button>
                      </td>
                      <td>
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 11,
                            fontWeight: 600,
                            color: role.color,
                          }}
                        >
                          {role.label}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            fontFamily: "var(--font-mono)",
                            fontSize: 11,
                            color: status.color,
                          }}
                        >
                          <span
                            style={{
                              width: 7,
                              height: 7,
                              borderRadius: "50%",
                              background: status.color,
                              boxShadow: `0 0 6px ${status.color}`,
                            }}
                          />
                          {status.label}
                        </span>
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--text-muted)",
                        }}
                      >
                        {/* Backend henüz last_login_at döndürmüyor; updated_at
                            son aktivite proxy'si olarak kullanılır. */}
                        {timeAgo(u.updated_at)} önce
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--text-muted)",
                        }}
                      >
                        {timeAgo(u.created_at)} önce
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
    </>
  );
}
