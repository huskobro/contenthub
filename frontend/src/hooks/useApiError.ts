/**
 * useApiError — Sprint 2.
 *
 * Convenience hook for handling API errors with classified toast messages.
 * Meant to be used in React Query onError callbacks and mutation error handlers.
 */

import { useCallback } from "react";
import { useToast } from "./useToast";
import { classifyError, errorToToastType } from "../lib/errorUtils";

/**
 * Returns a function that classifies an error and shows an appropriate toast.
 * Usage:
 *   const handleError = useApiError();
 *   useMutation({ onError: handleError });
 */
export function useApiError() {
  const toast = useToast();

  return useCallback(
    (error: unknown) => {
      const classified = classifyError(error);
      const toastType = errorToToastType(classified);
      const msg = `${classified.title}: ${classified.message}`;
      toast[toastType](msg);
    },
    [toast],
  );
}
