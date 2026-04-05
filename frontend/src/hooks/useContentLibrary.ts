import { useQuery } from "@tanstack/react-query";
import { fetchContentLibrary, ContentLibraryParams } from "../api/contentLibraryApi";

export function useContentLibrary(params?: ContentLibraryParams) {
  return useQuery({
    queryKey: [
      "content-library",
      params?.content_type ?? "",
      params?.status ?? "",
      params?.search ?? "",
      params?.limit ?? 50,
      params?.offset ?? 0,
    ],
    queryFn: () => fetchContentLibrary(params),
    staleTime: 15_000,
  });
}
