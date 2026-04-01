import { useQuery } from "@tanstack/react-query";
import { fetchSettingById } from "../api/settingsApi";

export function useSettingDetail(id: string | null) {
  return useQuery({
    queryKey: ["settings", id],
    queryFn: () => fetchSettingById(id!),
    enabled: !!id,
  });
}
