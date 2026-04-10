/**
 * AdminAnalyticsFilterBar — Faz 6.
 *
 * Shared reusable filter bar for admin analytics pages.
 * Supports: user, channel profile, platform, date range, time window.
 * Channel profiles cascade based on selected user.
 */

import { useMemo } from "react";
import { useUsers } from "../../hooks/useUsers";
import { useQuery } from "@tanstack/react-query";
import { fetchChannelProfiles } from "../../api/channelProfilesApi";
import type { AnalyticsWindow } from "../../api/analyticsApi";
import type { UseAnalyticsFiltersReturn } from "../../hooks/useAnalyticsFilters";
import {
  WindowSelector,
  FilterBar,
  FilterInput,
  ActionButton,
} from "../design-system/primitives";

const WINDOW_OPTIONS: { value: AnalyticsWindow; label: string }[] = [
  { value: "last_7d", label: "Son 7 Gün" },
  { value: "last_30d", label: "Son 30 Gün" },
  { value: "last_90d", label: "Son 90 Gün" },
  { value: "all_time", label: "Tüm Zamanlar" },
];

const PLATFORM_OPTIONS = [
  { value: "", label: "Tüm Platformlar" },
  { value: "youtube", label: "YouTube" },
];

interface AdminAnalyticsFilterBarProps {
  analyticsFilters: UseAnalyticsFiltersReturn;
  /** Hide certain filter groups */
  hidePlatform?: boolean;
  hideUser?: boolean;
  hideChannel?: boolean;
  hideDateRange?: boolean;
  testId?: string;
}

export function AdminAnalyticsFilterBar({
  analyticsFilters,
  hidePlatform = false,
  hideUser = false,
  hideChannel = false,
  hideDateRange = false,
  testId = "admin-analytics-filter-bar",
}: AdminAnalyticsFilterBarProps) {
  const {
    filters,
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
  } = analyticsFilters;

  // Fetch users for filter dropdown
  const { data: usersData } = useUsers();
  const users = usersData ?? [];

  // Fetch channel profiles — cascade by selected user
  const { data: channelProfilesData } = useQuery({
    queryKey: ["channel-profiles", filters.userId || "all"],
    queryFn: () => fetchChannelProfiles(filters.userId || undefined),
    staleTime: 30_000,
  });
  const channelProfiles = channelProfilesData ?? [];

  // When user changes, channel profiles list narrows automatically
  const filteredChannels = useMemo(() => {
    if (!filters.userId) return channelProfiles;
    return channelProfiles.filter((cp) => cp.user_id === filters.userId);
  }, [channelProfiles, filters.userId]);

  return (
    <div data-testid={testId} className="flex flex-col gap-3 mb-4">
      {/* Row 1: Time window */}
      <WindowSelector
        options={WINDOW_OPTIONS}
        value={filters.window}
        onChange={setWindow}
        testId="analytics-window-selector"
        buttonTestIdPrefix="window-btn-"
      />

      {/* Row 2: Entity + Date filters */}
      <FilterBar>
        {/* User filter */}
        {!hideUser && (
          <select
            value={filters.userId}
            onChange={(e) => setUserId(e.target.value)}
            className="h-8 px-2 text-sm border border-border-subtle rounded-md bg-surface-card text-neutral-800 focus:outline-none focus:ring-1 focus:ring-brand-400"
            data-testid="filter-user"
          >
            <option value="">Tüm Kullanıcılar</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.display_name || u.email}
              </option>
            ))}
          </select>
        )}

        {/* Channel Profile filter */}
        {!hideChannel && (
          <select
            value={filters.channelProfileId}
            onChange={(e) => setChannelProfileId(e.target.value)}
            className="h-8 px-2 text-sm border border-border-subtle rounded-md bg-surface-card text-neutral-800 focus:outline-none focus:ring-1 focus:ring-brand-400"
            data-testid="filter-channel-profile"
          >
            <option value="">Tüm Kanallar</option>
            {filteredChannels.map((cp) => (
              <option key={cp.id} value={cp.id}>
                {cp.profile_name} ({cp.channel_slug})
              </option>
            ))}
          </select>
        )}

        {/* Platform filter */}
        {!hidePlatform && (
          <select
            value={filters.platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="h-8 px-2 text-sm border border-border-subtle rounded-md bg-surface-card text-neutral-800 focus:outline-none focus:ring-1 focus:ring-brand-400"
            data-testid="filter-platform"
          >
            {PLATFORM_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}

        {/* Date range */}
        {!hideDateRange && (
          <>
            <FilterInput
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              data-testid="filter-date-start"
              placeholder="Başlangıç"
            />
            <FilterInput
              type="date"
              value={filters.dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              data-testid="filter-date-end"
              placeholder="Bitiş"
            />
            {hasDateFilter && (
              <ActionButton
                variant="secondary"
                size="sm"
                onClick={clearDateRange}
                data-testid="filter-date-clear"
              >
                Tarihi Temizle
              </ActionButton>
            )}
          </>
        )}

        {/* Clear all entity filters */}
        {hasAnyFilter && (
          <ActionButton
            variant="secondary"
            size="sm"
            onClick={clearFilters}
            data-testid="filter-clear-all"
          >
            Tüm Filtreleri Temizle
          </ActionButton>
        )}

        {/* Active filter indicator */}
        {hasEntityFilter && (
          <span className="text-xs text-brand-600 self-center" data-testid="filter-active-note">
            Filtre aktif
          </span>
        )}
      </FilterBar>
    </div>
  );
}
