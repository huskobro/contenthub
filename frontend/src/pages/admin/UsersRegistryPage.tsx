/**
 * UsersRegistryPage — admin user management (M40).
 *
 * Lists all users with override counts, role badges.
 * Provides create user form and navigation to user settings detail.
 *
 * Horizon design system: PageShell, SectionShell, DataTable, ActionButton, StatusBadge.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUsers, useCreateUser, useDeleteUser } from "../../hooks/useUsers";
import {
  PageShell,
  SectionShell,
  DataTable,
  ActionButton,
  StatusBadge,
  FeedbackBanner,
  FilterInput,
  FilterSelect,
} from "../../components/design-system/primitives";
import { cn } from "../../lib/cn";

interface User {
  id: string;
  display_name: string;
  email: string;
  slug: string;
  role: string;
  status: string;
  override_count: number;
}

function UserAvatar({ name, role }: { name: string; role: string }) {
  const letter = (name || "?")[0].toUpperCase();
  return (
    <div
      className={cn(
        "w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0",
        role === "admin" ? "bg-brand-600" : "bg-emerald-600",
      )}
    >
      {letter}
    </div>
  );
}

export function UsersRegistryPage() {
  const { data: users, isLoading, isError } = useUsers();
  const createMutation = useCreateUser();
  const deleteMutation = useDeleteUser();
  const navigate = useNavigate();

  const [showForm, setShowForm] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "user">("user");
  const [formError, setFormError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!displayName.trim() || !email.trim()) {
      setFormError("Ad ve e-posta zorunludur.");
      return;
    }

    try {
      await createMutation.mutateAsync({
        display_name: displayName.trim(),
        email: email.trim(),
        role,
      });
      setDisplayName("");
      setEmail("");
      setRole("user");
      setShowForm(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Kullanici olusturulamadi.");
    }
  }

  const columns = [
    {
      key: "user",
      header: "Kullanici",
      render: (u: User) => (
        <div className="flex items-center gap-2">
          <UserAvatar name={u.display_name} role={u.role} />
          <div>
            <div className="font-medium text-neutral-800">{u.display_name}</div>
            <div className="text-xs text-neutral-500">{u.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: "slug",
      header: "Slug",
      render: (u: User) => (
        <span className="font-mono text-xs text-neutral-500">{u.slug}</span>
      ),
    },
    {
      key: "role",
      header: "Rol",
      render: (u: User) => (
        <StatusBadge
          status={u.role === "admin" ? "info" : "success"}
          label={u.role === "admin" ? "Yonetici" : "Kullanici"}
        />
      ),
    },
    {
      key: "status",
      header: "Durum",
      render: (u: User) => (
        <StatusBadge
          status={u.status === "active" ? "active" : "inactive"}
          label={u.status === "active" ? "Aktif" : "Pasif"}
        />
      ),
    },
    {
      key: "overrides",
      header: "Override",
      align: "center" as const,
      render: (u: User) => (
        <span className="text-sm text-neutral-500 tabular-nums">{u.override_count}</span>
      ),
    },
    {
      key: "actions",
      header: "Islemler",
      align: "right" as const,
      render: (u: User) => (
        <div className="flex items-center justify-end gap-1.5">
          <ActionButton
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/admin/users/${u.id}/settings`)}
          >
            Ayarlar
          </ActionButton>
          {u.status === "active" && (
            <ActionButton
              variant="ghost"
              size="sm"
              onClick={() => {
                if (confirm(`${u.display_name} pasif yapilsin mi?`)) {
                  deleteMutation.mutate(u.id);
                }
              }}
            >
              Deaktif
            </ActionButton>
          )}
        </div>
      ),
    },
  ];

  return (
    <PageShell
      title="Kullanicilar"
      subtitle="Sistem kullanicilarini yonetin, ayar override durumlarini gorun"
      testId="users-registry"
      actions={
        <ActionButton
          variant={showForm ? "secondary" : "primary"}
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "Kapat" : "Yeni Kullanici"}
        </ActionButton>
      }
    >
      {/* Create form */}
      {showForm && (
        <SectionShell title="Yeni Kullanici Olustur" testId="user-create-form">
          <form onSubmit={handleCreate} className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[180px]">
              <label className="block text-sm font-medium text-neutral-600 mb-1">Ad</label>
              <FilterInput
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Huseyin Coskun"
                className="w-full"
              />
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="block text-sm font-medium text-neutral-600 mb-1">E-posta</label>
              <FilterInput
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="huseyin@contenthub.local"
                className="w-full"
              />
            </div>
            <div className="w-32">
              <label className="block text-sm font-medium text-neutral-600 mb-1">Rol</label>
              <FilterSelect
                value={role}
                onChange={(e) => setRole(e.target.value as "admin" | "user")}
                className="w-full"
              >
                <option value="admin">Yonetici</option>
                <option value="user">Kullanici</option>
              </FilterSelect>
            </div>
            <ActionButton
              variant="primary"
              type="submit"
              loading={createMutation.isPending}
            >
              Olustur
            </ActionButton>
          </form>
          {formError && <FeedbackBanner type="error" message={formError} />}
        </SectionShell>
      )}

      {/* Users table */}
      <SectionShell flush testId="users-table-section">
        <DataTable<User>
          columns={columns}
          data={users ?? []}
          keyFn={(u) => u.id}
          loading={isLoading}
          error={isError}
          emptyMessage="Henuz kullanici olusturulmamis"
          testId="users-table"
        />
      </SectionShell>
    </PageShell>
  );
}
