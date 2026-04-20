/**
 * React Query hooks for Effective Settings — M10-E.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchEffectiveSettings,
  fetchEffectiveSetting,
  fetchGroups,
  updateSettingAdminValue,
} from "../api/effectiveSettingsApi";
import { useApiError } from "./useApiError";

export function useEffectiveSettings(params?: {
  group?: string;
}) {
  return useQuery({
    queryKey: ["effective-settings", params?.group ?? "all"],
    queryFn: () => fetchEffectiveSettings(params),
  });
}

export function useEffectiveSetting(key: string) {
  return useQuery({
    queryKey: ["effective-settings", key],
    queryFn: () => fetchEffectiveSetting(key),
    enabled: !!key,
  });
}

export function useSettingsGroups() {
  return useQuery({
    queryKey: ["settings-groups"],
    queryFn: fetchGroups,
  });
}

export function useUpdateSettingValue() {
  const queryClient = useQueryClient();
  const onError = useApiError();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: unknown }) =>
      updateSettingAdminValue(key, value),
    onError,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["effective-settings"] });
      queryClient.invalidateQueries({ queryKey: ["settings-groups"] });
      queryClient.invalidateQueries({ queryKey: ["credentials"] });
    },
  });
}
