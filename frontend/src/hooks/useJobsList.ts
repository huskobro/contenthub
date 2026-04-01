import { useQuery } from "@tanstack/react-query";
import { fetchJobs } from "../api/jobsApi";

export function useJobsList() {
  return useQuery({ queryKey: ["jobs"], queryFn: fetchJobs });
}
