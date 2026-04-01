import { useQuery } from "@tanstack/react-query";
import { fetchSettings } from "../api/settingsApi";

export function useSettingsList() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
  });
}
