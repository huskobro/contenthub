import { useQuery } from "@tanstack/react-query";
import { fetchJobContentRef } from "../api/jobsApi";

export function useJobContentRef(jobId: string | null) {
  return useQuery({
    queryKey: ["jobs", jobId, "content-ref"],
    queryFn: () => fetchJobContentRef(jobId!),
    enabled: !!jobId,
    staleTime: 30_000,
  });
}
