import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createSetting } from "../api/settingsApi";
import type { SettingCreatePayload } from "../api/settingsApi";
import { useApiError } from "./useApiError";

export function useCreateSetting() {
  const queryClient = useQueryClient();
  const onError = useApiError();
  return useMutation({
    mutationFn: (payload: SettingCreatePayload) => createSetting(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError,
  });
}
