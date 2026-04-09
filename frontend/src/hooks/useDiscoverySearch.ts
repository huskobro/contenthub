/**
 * useDiscoverySearch — server-backed discovery for command palette.
 *
 * Calls GET /api/v1/discovery/search?q=...&limit=5 with debounce (300ms).
 * Only fires when query is 2+ characters.
 * Returns results mapped to Command-compatible objects.
 */

import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import type { Command, CommandCategory } from "../stores/commandPaletteStore";
import { api } from "../api/client";

// ---------------------------------------------------------------------------
// API types
// ---------------------------------------------------------------------------

export interface DiscoveryResult {
  id: string;
  category: string;
  label: string;
  snippet?: string;
  route: string;
  status?: string;
}

interface DiscoveryResponse {
  results: DiscoveryResult[];
  total: number;
}

// ---------------------------------------------------------------------------
// Category icon mapping
// ---------------------------------------------------------------------------

const CATEGORY_ICONS: Record<string, string> = {
  job: "📋",
  content: "📚",
  source: "📡",
  template: "📄",
  style_blueprint: "🎨",
  setting: "⚙️",
  news_item: "📝",
  news_bulletin: "📰",
  standard_video: "🎬",
  asset: "🖼️",
  used_news: "✅",
};

function iconForCategory(category: string): string {
  return CATEGORY_ICONS[category] || "🔍";
}

// ---------------------------------------------------------------------------
// API fetcher
// ---------------------------------------------------------------------------

async function fetchDiscovery(query: string): Promise<DiscoveryResponse> {
  return api.get<DiscoveryResponse>("/api/v1/discovery/search", { q: query, limit: "5" });
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useDiscoverySearch(
  query: string,
  navigate: (path: string) => void
): {
  discoveryCommands: Command[];
  isLoading: boolean;
  isError: boolean;
  hasSearched: boolean;
} {
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce query by 300ms
  useEffect(() => {
    if (query.length < 2) {
      setDebouncedQuery("");
      return;
    }
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const enabled = debouncedQuery.length >= 2;

  const { data, isLoading, isError, isFetched } = useQuery({
    queryKey: ["discovery-search", debouncedQuery],
    queryFn: () => fetchDiscovery(debouncedQuery),
    enabled,
    staleTime: 30_000,
    retry: false,
  });

  const discoveryCommands: Command[] = (data?.results || []).map(
    (result): Command => ({
      id: `discovery:${result.category}:${result.id}`,
      label: result.label,
      category: "search" as CommandCategory,
      icon: iconForCategory(result.category),
      description: result.snippet || result.route,
      keywords: [result.category, result.status || ""].filter(Boolean),
      action: () => navigate(result.route),
    })
  );

  return {
    discoveryCommands,
    isLoading: enabled && isLoading,
    isError,
    hasSearched: enabled && isFetched,
  };
}
