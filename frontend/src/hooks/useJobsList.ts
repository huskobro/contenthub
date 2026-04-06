import { useQuery } from "@tanstack/react-query";
import { fetchJobs } from "../api/jobsApi";

export function useJobsList(includeArchived = false) {
  return useQuery({
    queryKey: ["jobs", { includeArchived }],
    queryFn: () => fetchJobs(includeArchived ? { include_test_data: true } : undefined),
  });
}
