/**
 * OnboardingUserSetupScreen — create first user profile (M40).
 *
 * Creates the first admin user during onboarding.
 * Pre-fills display_name from OS username (via /system/info).
 * Sets the created user as active in userStore.
 */

import { useState, useEffect } from "react";
import { useCreateUser, useActiveUser } from "../../hooks/useUsers";
import { fetchSystemInfo } from "../../api/systemApi";
import { useUserStore } from "../../stores/userStore";
import { cn } from "../../lib/cn";

interface Props {
  onBack: () => void;
  onComplete: () => void;
}

export function OnboardingUserSetupScreen({ onBack, onComplete }: Props) {
  const createMutation = useCreateUser();
  const { users } = useActiveUser();
  const setActiveUser = useUserStore((s) => s.setActiveUser);

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If users already exist, skip this step
  useEffect(() => {
    if (users.length > 0) {
      // Set first admin user as active if none set
      const activeId = useUserStore.getState().activeUserId;
      if (!activeId) {
        const admin = users.find((u) => u.role === "admin") ?? users[0];
        setActiveUser(admin.id);
      }
      onComplete();
    }
  }, [users, setActiveUser, onComplete]);

  // Pre-fill from OS username
  useEffect(() => {
    fetchSystemInfo()
      .then((info) => {
        const name = info.os_username || "Admin";
        // Capitalize first letter
        const display = name.charAt(0).toUpperCase() + name.slice(1);
        setDisplayName(display);
        setEmail(`${name.toLowerCase()}@contenthub.local`);
      })
      .catch(() => {
        setDisplayName("Admin");
        setEmail("admin@contenthub.local");
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!displayName.trim()) {
      setError("Kullanici adi zorunludur.");
      return;
    }
    if (!email.trim()) {
      setError("E-posta zorunludur.");
      return;
    }

    setSaving(true);
    try {
      const user = await createMutation.mutateAsync({
        display_name: displayName.trim(),
        email: email.trim(),
        role: "admin",
      });
      setActiveUser(user.id);
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kullanici olusturulamadi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-neutral-50 to-border-subtle p-8">
      <div className="max-w-[560px] w-full bg-neutral-0 rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-10">
        <h2 className="mb-1.5 text-2xl font-bold text-neutral-900 text-center">Kullanici Profili</h2>
        <p className="mb-7 text-lg text-neutral-700 leading-relaxed text-center">
          Ilk yonetici hesabinizi olusturun. Bu bilgiler calisma alani ve
          ayar yonetimi icin kullanilacaktir.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="block text-sm font-semibold text-neutral-600 mb-1">Ad Soyad</label>
            <input
              className="w-full py-1.5 px-2 border border-border rounded-sm text-md box-border"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Huseyin Coskun"
            />
          </div>
          <div className="mb-3">
            <label className="block text-sm font-semibold text-neutral-600 mb-1">E-posta</label>
            <input
              className="w-full py-1.5 px-2 border border-border rounded-sm text-md box-border"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@contenthub.local"
            />
            <div className="text-xs text-neutral-500 mt-0.5">
              Localhost icin herhangi bir e-posta yeterlidir
            </div>
          </div>

          {error && <p className="text-error text-base mt-1">{error}</p>}

          <div className="flex gap-2 mt-4">
            <button
              type="submit"
              disabled={saving}
              className={cn(
                "py-1.5 px-4 text-neutral-0 border-none rounded-sm text-md",
                saving ? "bg-neutral-500 cursor-not-allowed" : "bg-brand-700 cursor-pointer"
              )}
            >
              {saving ? "Olusturuluyor..." : "Profili Olustur"}
            </button>
            <button
              type="button"
              onClick={onBack}
              className="py-1.5 px-4 bg-transparent text-neutral-600 border border-border rounded-sm cursor-pointer text-md"
            >
              Geri Don
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
