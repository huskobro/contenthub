import { useQuery } from "@tanstack/react-query";
import {
  fetchStandardVideoById,
  fetchStandardVideoScript,
  fetchStandardVideoMetadata,
} from "../api/standardVideoApi";

export function useStandardVideoDetail(id: string | null) {
  return useQuery({
    queryKey: ["standard-videos", id],
    queryFn: () => fetchStandardVideoById(id!),
    enabled: !!id,
  });
}

export function useStandardVideoScript(id: string | null) {
  return useQuery({
    queryKey: ["standard-videos", id, "script"],
    queryFn: () => fetchStandardVideoScript(id!),
    enabled: !!id,
  });
}

export function useStandardVideoMetadata(id: string | null) {
  return useQuery({
    queryKey: ["standard-videos", id, "metadata"],
    queryFn: () => fetchStandardVideoMetadata(id!),
    enabled: !!id,
  });
}
