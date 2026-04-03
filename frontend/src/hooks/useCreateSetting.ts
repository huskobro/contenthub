import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createSetting } from "../api/settingsApi";
import type { SettingCreatePayload } from "../api/settingsApi";

export function useCreateSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SettingCreatePayload) => createSetting(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}
