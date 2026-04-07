/**
 * UserSettingsDetailPage — admin view of a user's effective settings (M40).
 *
 * Shows all visible_to_user settings with:
 * - Admin default value
 * - User override value (if any)
 * - Effective value (computed)
 * - Governance badges (override allowed, read-only, etc.)
 * - Admin can clear overrides
 */

import { useParams, useNavigate } from "react-router-dom";
import { useUser, useUserOverrides, useDeleteUserOverride } from "../../hooks/useUsers";
import { useEffectiveSettings } from "../../hooks/useEffectiveSettings";
import { cn } from "../../lib/cn";

export function UserSettingsDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { data: user, isLoading: userLoading } = useUser(userId ?? "");
  const { data: overrides, isLoading: overridesLoading } = useUserOverrides(userId ?? "");
  const { data: settings, isLoading: settingsLoading } = useEffectiveSettings();
  const deleteOverride = useDeleteUserOverride();

  if (!userId) return null;

  const isLoading = userLoading || overridesLoading || settingsLoading;

  // Build override map for quick lookup
  const overrideMap = new Map(
    (overrides ?? []).map((o) => [o.setting_key, o.value_json]),
  );

  // Filter to visible_to_user settings
  const visibleSettings = (settings ?? []).filter(
    (s) => s.visible_to_user === true,
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => navigate("/admin/users")}
          className="text-sm text-neutral-500 hover:text-neutral-700 cursor-pointer"
        >
          ← Kullanicilar
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-neutral-900">
            {user?.display_name ?? "..."} — Ayarlar
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Kullanici ayarlarini goruntuleyin, override durumlarini yonetin
          </p>
        </div>
      </div>

      {/* User info strip */}
      {user && (
        <div className="mb-6 p-3 bg-neutral-50 rounded-lg border border-neutral-200 flex items-center gap-3 text-sm">
          <div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold",
              user.role === "admin" ? "bg-brand-600" : "bg-emerald-600",
            )}
          >
            {(user.display_name || "?")[0].toUpperCase()}
          </div>
          <div>
            <span className="font-medium text-neutral-800">{user.display_name}</span>
            <span className="text-neutral-400 mx-1.5">|</span>
            <span className="text-neutral-500">{user.email}</span>
            <span className="text-neutral-400 mx-1.5">|</span>
            <span className="font-mono text-xs text-neutral-400">{user.slug}</span>
          </div>
          <div className="ml-auto text-xs text-neutral-400">
            {user.override_count} override
          </div>
        </div>
      )}

      {/* Settings table */}
      {isLoading ? (
        <div className="text-center py-12 text-neutral-400">Yukleniyor...</div>
      ) : visibleSettings.length === 0 ? (
        <div className="text-center py-12 text-neutral-400">
          Kullaniciya gorunur ayar bulunmuyor
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold text-neutral-600">Ayar</th>
                <th className="text-left px-4 py-2.5 font-semibold text-neutral-600">Effective</th>
                <th className="text-left px-4 py-2.5 font-semibold text-neutral-600">Kaynak</th>
                <th className="text-left px-4 py-2.5 font-semibold text-neutral-600">Override</th>
                <th className="text-center px-4 py-2.5 font-semibold text-neutral-600">Yetki</th>
                <th className="text-right px-4 py-2.5 font-semibold text-neutral-600">Islem</th>
              </tr>
            </thead>
            <tbody>
              {visibleSettings.map((s) => {
                const key = s.key;
                const hasOverride = overrideMap.has(key);
                const overrideAllowed = s.user_override_allowed === true;
                const readOnly = s.read_only_for_user === true;

                return (
                  <tr key={key} className="border-b border-neutral-100 hover:bg-neutral-50">
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-neutral-800">{s.label}</div>
                      <div className="text-[10px] text-neutral-400 font-mono">{key}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      <code className="text-xs bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-700">
                        {String(s.effective_value ?? "\u2014")}
                      </code>
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={cn(
                          "px-1.5 py-0.5 rounded text-xs font-medium",
                          s.source === "user_override"
                            ? "bg-amber-100 text-amber-700"
                            : s.source === "admin"
                              ? "bg-brand-100 text-brand-700"
                              : "bg-neutral-100 text-neutral-500",
                        )}
                      >
                        {s.source}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {hasOverride ? (
                        <code className="text-xs bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">
                          {overrideMap.get(key)}
                        </code>
                      ) : (
                        <span className="text-xs text-neutral-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {overrideAllowed && (
                          <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] rounded">
                            override
                          </span>
                        )}
                        {readOnly && (
                          <span className="px-1.5 py-0.5 bg-neutral-200 text-neutral-500 text-[10px] rounded">
                            readonly
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {hasOverride && (
                        <button
                          type="button"
                          onClick={() =>
                            deleteOverride.mutate({
                              userId: userId,
                              settingKey: key,
                            })
                          }
                          className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded cursor-pointer transition-colors"
                        >
                          Sifirla
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
