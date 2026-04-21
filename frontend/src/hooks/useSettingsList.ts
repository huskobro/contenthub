import { useQuery } from "@tanstack/react-query";
import { fetchSettings } from "../api/settingsApi";

// Faz 4 perf: settings registry rarely changes between page loads — every
// admin save invalidates the key explicitly. A 60s staleTime + no
// refetch-on-focus eliminates the per-tab-switch refetch storm on the
// settings list and the dependent SettingsTable.
const SETTINGS_STALE_MS = 60_000;

export function useSettingsList() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
    staleTime: SETTINGS_STALE_MS,
    refetchOnWindowFocus: false,
  });
}
