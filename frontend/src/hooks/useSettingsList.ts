import { useQuery } from "@tanstack/react-query";
import { fetchSettings, type SettingResponse } from "../api/settingsApi";

// Faz 4 perf: settings registry rarely changes between page loads — every
// admin save invalidates the key explicitly. A 60s staleTime + no
// refetch-on-focus eliminates the per-tab-switch refetch storm on the
// settings list and the dependent SettingsTable.
const SETTINGS_STALE_MS = 60_000;

// Faz 4.1 — Test data filtering.
// Backend test fixtures (test_settings_api.py) sometimes leak into the dev
// SQLite DB and pollute the admin settings UI with noise like:
//   - group_name "groupA" / "groupB"
//   - keys prefixed "test." / "qa." / "fixture."
// Production UI must hide these by default so operators see real settings.
// Bypass with `?include_test_data=1` in the URL when you really need to
// inspect leaked fixtures.
const TEST_GROUPS = new Set(["groupA", "groupB", "test", "qa", "fixture"]);
const TEST_KEY_PREFIXES = ["test.", "qa.", "fixture.", "demo."];

function isTestSetting(s: SettingResponse): boolean {
  if (s.group_name && TEST_GROUPS.has(s.group_name)) return true;
  const k = s.key ?? "";
  for (const p of TEST_KEY_PREFIXES) {
    if (k.startsWith(p)) return true;
  }
  return false;
}

function shouldIncludeTestData(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return new URL(window.location.href).searchParams.get("include_test_data") === "1";
  } catch {
    return false;
  }
}

export function useSettingsList() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
    staleTime: SETTINGS_STALE_MS,
    refetchOnWindowFocus: false,
    select: (data: SettingResponse[]) => {
      if (shouldIncludeTestData()) return data;
      return data.filter((s) => !isTestSetting(s));
    },
  });
}
