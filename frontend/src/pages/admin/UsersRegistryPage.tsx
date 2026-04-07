/**
 * UsersRegistryPage — admin user management (M40).
 *
 * Lists all users with override counts, role badges.
 * Provides create user form and navigation to user settings detail.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUsers, useCreateUser, useDeleteUser } from "../../hooks/useUsers";
import { cn } from "../../lib/cn";

export function UsersRegistryPage() {
  const { data: users, isLoading } = useUsers();
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

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Kullanicilar</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Sistem kullanicilarini yonetin, ayar override durumlarini gorun
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-brand-600 text-white rounded-md text-sm font-medium hover:bg-brand-700 transition-colors cursor-pointer"
        >
          {showForm ? "Kapat" : "Yeni Kullanici"}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="mb-6 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
          <h3 className="text-sm font-semibold text-neutral-800 mb-3">Yeni Kullanici Olustur</h3>
          <form onSubmit={handleCreate} className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs font-medium text-neutral-600 mb-1">Ad</label>
              <input
                className="w-full px-2 py-1.5 border border-neutral-300 rounded text-sm"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Huseyin Coskun"
              />
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs font-medium text-neutral-600 mb-1">E-posta</label>
              <input
                className="w-full px-2 py-1.5 border border-neutral-300 rounded text-sm"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="huseyin@contenthub.local"
              />
            </div>
            <div className="w-28">
              <label className="block text-xs font-medium text-neutral-600 mb-1">Rol</label>
              <select
                className="w-full px-2 py-1.5 border border-neutral-300 rounded text-sm"
                value={role}
                onChange={(e) => setRole(e.target.value as "admin" | "user")}
              >
                <option value="admin">Yonetici</option>
                <option value="user">Kullanici</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-1.5 bg-brand-600 text-white rounded text-sm font-medium hover:bg-brand-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              {createMutation.isPending ? "Olusturuluyor..." : "Olustur"}
            </button>
          </form>
          {formError && <p className="text-red-600 text-xs mt-2">{formError}</p>}
        </div>
      )}

      {/* Users table */}
      {isLoading ? (
        <div className="text-center py-12 text-neutral-400">Yukleniyor...</div>
      ) : !users?.length ? (
        <div className="text-center py-12 text-neutral-400">
          Henuz kullanici olusturulmamis
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold text-neutral-600">Kullanici</th>
                <th className="text-left px-4 py-2.5 font-semibold text-neutral-600">Slug</th>
                <th className="text-left px-4 py-2.5 font-semibold text-neutral-600">Rol</th>
                <th className="text-left px-4 py-2.5 font-semibold text-neutral-600">Durum</th>
                <th className="text-center px-4 py-2.5 font-semibold text-neutral-600">Override</th>
                <th className="text-right px-4 py-2.5 font-semibold text-neutral-600">Islemler</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold",
                          user.role === "admin" ? "bg-brand-600" : "bg-emerald-600",
                        )}
                      >
                        {(user.display_name || "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-neutral-800">{user.display_name}</div>
                        <div className="text-xs text-neutral-400">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-neutral-500 font-mono text-xs">{user.slug}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-xs font-medium",
                        user.role === "admin"
                          ? "bg-brand-100 text-brand-700"
                          : "bg-emerald-100 text-emerald-700",
                      )}
                    >
                      {user.role === "admin" ? "Yonetici" : "Kullanici"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-xs font-medium",
                        user.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-neutral-200 text-neutral-500",
                      )}
                    >
                      {user.status === "active" ? "Aktif" : "Pasif"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className="text-xs text-neutral-500">{user.override_count}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/users/${user.id}/settings`)}
                        className="px-2 py-1 text-xs text-brand-600 hover:bg-brand-50 rounded cursor-pointer transition-colors"
                      >
                        Ayarlar
                      </button>
                      {user.status === "active" && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`${user.display_name} pasif yapilsin mi?`)) {
                              deleteMutation.mutate(user.id);
                            }
                          }}
                          className="px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-100 rounded cursor-pointer transition-colors"
                        >
                          Deaktif
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
