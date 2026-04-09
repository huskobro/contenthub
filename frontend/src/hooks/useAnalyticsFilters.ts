/**
 * useAnalyticsFilters — Faz 6.
 *
 * Shared analytics filter state hook.
 * Stores filter values in URL search params for shareability and back-button support.
 * Used by AdminAnalyticsFilterBar and all analytics pages.
 */

import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { AnalyticsWindow, AnalyticsFilterParams } from "../api/analyticsApi";

const VALID_WINDOWS: AnalyticsWindow[] = ["last_7d", "last_30d", "last_90d", "all_time"];

export interface AnalyticsFilters {
  window: AnalyticsWindow;
  dateFrom: string;
  dateTo: string;
  userId: string;
  channelProfileId: string;
  platform: string;
}

export interface UseAnalyticsFiltersReturn {
  filters: AnalyticsFilters;
  /** Convert to backend API params format */
  apiParams: AnalyticsFilterParams;
  setWindow: (w: AnalyticsWindow) => void;
  setDateFrom: (v: string) => void;
  setDateTo: (v: string) => void;
  setUserId: (v: string) => void;
  setChannelProfileId: (v: string) => void;
  setPlatform: (v: string) => void;
  clearFilters: () => void;
  clearDateRange: () => void;
  hasEntityFilter: boolean;
  hasDateFilter: boolean;
  hasAnyFilter: boolean;
}

export function useAnalyticsFilters(
  defaultWindow: AnalyticsWindow = "last_30d",
): UseAnalyticsFiltersReturn {
  const [searchParams, setSearchParams] = useSearchParams();

  const rawWindow = searchParams.get("window") || defaultWindow;
  const window: AnalyticsWindow = VALID_WINDOWS.includes(rawWindow as AnalyticsWindow)
    ? (rawWindow as AnalyticsWindow)
    : defaultWindow;
  const dateFrom = searchParams.get("date_from") || "";
  const dateTo = searchParams.get("date_to") || "";
  const userId = searchParams.get("user_id") || "";
  const channelProfileId = searchParams.get("channel_profile_id") || "";
  const platform = searchParams.get("platform") || "";

  const filters: AnalyticsFilters = useMemo(
    () => ({ window, dateFrom, dateTo, userId, channelProfileId, platform }),
    [window, dateFrom, dateTo, userId, channelProfileId, platform],
  );

  const apiParams: AnalyticsFilterParams = useMemo(() => {
    const p: AnalyticsFilterParams = { window };
    if (dateFrom) p.date_from = `${dateFrom}T00:00:00`;
    if (dateTo) p.date_to = `${dateTo}T23:59:59`;
    if (userId) p.user_id = userId;
    if (channelProfileId) p.channel_profile_id = channelProfileId;
    if (platform) p.platform = platform;
    return p;
  }, [window, dateFrom, dateTo, userId, channelProfileId, platform]);

  const updateParam = useCallback(
    (key: string, value: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (value) {
          next.set(key, value);
        } else {
          next.delete(key);
        }
        return next;
      });
    },
    [setSearchParams],
  );

  const setWindow = useCallback((w: AnalyticsWindow) => updateParam("window", w), [updateParam]);
  const setDateFrom = useCallback((v: string) => updateParam("date_from", v), [updateParam]);
  const setDateTo = useCallback((v: string) => updateParam("date_to", v), [updateParam]);
  const setUserId = useCallback(
    (v: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (v) {
          next.set("user_id", v);
        } else {
          next.delete("user_id");
        }
        // Clear channel_profile_id when user changes (cascading filter)
        next.delete("channel_profile_id");
        return next;
      });
    },
    [setSearchParams],
  );
  const setChannelProfileId = useCallback(
    (v: string) => updateParam("channel_profile_id", v),
    [updateParam],
  );
  const setPlatform = useCallback((v: string) => updateParam("platform", v), [updateParam]);

  const clearFilters = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("user_id");
      next.delete("channel_profile_id");
      next.delete("platform");
      next.delete("date_from");
      next.delete("date_to");
      return next;
    });
  }, [setSearchParams]);

  const clearDateRange = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("date_from");
      next.delete("date_to");
      return next;
    });
  }, [setSearchParams]);

  const hasEntityFilter = !!(userId || channelProfileId || platform);
  const hasDateFilter = !!(dateFrom || dateTo);
  const hasAnyFilter = hasEntityFilter || hasDateFilter;

  return {
    filters,
    apiParams,
    setWindow,
    setDateFrom,
    setDateTo,
    setUserId,
    setChannelProfileId,
    setPlatform,
    clearFilters,
    clearDateRange,
    hasEntityFilter,
    hasDateFilter,
    hasAnyFilter,
  };
}
