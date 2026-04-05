import { useQuery } from "@tanstack/react-query";
import { fetchAssets, AssetListParams } from "../api/assetApi";

export function useAssetList(params?: AssetListParams) {
  return useQuery({
    queryKey: [
      "assets",
      params?.asset_type ?? "",
      params?.search ?? "",
      params?.job_id ?? "",
      params?.limit ?? 100,
      params?.offset ?? 0,
    ],
    queryFn: () => fetchAssets(params),
    staleTime: 15_000,
  });
}
