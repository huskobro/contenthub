import { useQuery } from "@tanstack/react-query";
import { fetchJobById } from "../api/jobsApi";

export function useJobDetail(id: string | null) {
  return useQuery({
    queryKey: ["jobs", id],
    queryFn: () => fetchJobById(id!),
    enabled: !!id,
  });
}
