import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deletePlatformConnection } from "../api/platformConnectionsApi";
import { useApiError } from "./useApiError";

/**
 * DELETE /api/v1/platform-connections/{connection_id}
 *
 * Removes a platform OAuth connection (admin operation). Backend revokes the
 * OAuth token where possible. Invalidates both the admin connection-center
 * list and the per-user "my connections" list so that any open surface
 * refreshes immediately.
 *
 * Used by Aurora admin connections page (Connection Center) for the
 * "Bağlantıyı kes" action behind a confirm dialog.
 */
export function useDeletePlatformConnection() {
  const queryClient = useQueryClient();
  const onError = useApiError();
  return useMutation({
    mutationFn: (connectionId: string) =>
      deletePlatformConnection(connectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-connections"] });
      queryClient.invalidateQueries({ queryKey: ["platform-connections"] });
      queryClient.invalidateQueries({ queryKey: ["my-connections"] });
    },
    onError,
  });
}
