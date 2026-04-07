import { useQuery } from "@tanstack/react-query";
import {
  fetchAssemblyTracesForJob,
  fetchAssemblyRunDetail,
} from "../api/promptAssemblyApi";

export function usePromptTracesForJob(jobId: string | null) {
  return useQuery({
    queryKey: ["prompt-traces", "job", jobId],
    queryFn: () => fetchAssemblyTracesForJob(jobId!),
    enabled: !!jobId,
  });
}

export function usePromptTraceDetail(runId: string | null) {
  return useQuery({
    queryKey: ["prompt-traces", "detail", runId],
    queryFn: () => fetchAssemblyRunDetail(runId!),
    enabled: !!runId,
  });
}
