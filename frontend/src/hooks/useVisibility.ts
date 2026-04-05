import { useQuery } from "@tanstack/react-query";
import { resolveVisibility, type VisibilityResolution } from "../api/visibilityApi";

/**
 * M22-A: Kontrollü hata fallback'i.
 *
 * Visibility API'ye erişilemezse:
 *   - visible: true → UI kilitlenmez, kullanıcı sayfa görebilir
 *   - read_only: true → ama hiçbir şeyi değiştiremez (güvenli taraf)
 *   - wizard_visible: false → wizard step'leri gösterilmez
 *
 * Bu "fail-open for viewing, fail-closed for mutation" stratejisidir.
 * Gerekçe: API hatası durumunda UI tamamen kilitlenmesi kötü UX,
 * ama her şeyi hem görünür hem düzenlenebilir yapmak güvenlik açığı.
 * Okuma izin ver, yazma engelle.
 */
const ERROR_FALLBACK: VisibilityResolution = {
  visible: true,
  read_only: true,
  wizard_visible: false,
};

/**
 * Başarılı API yanıtı yokken (loading) kullanılan varsayılan.
 * Loading sırasında visible=true ama readOnly=true → flash yok, mutation yok.
 */
const LOADING_DEFAULT: VisibilityResolution = {
  visible: true,
  read_only: true,
  wizard_visible: false,
};

export function useVisibility(
  targetKey: string,
  params?: { role?: string; mode?: string; module_scope?: string },
) {
  const query = useQuery({
    queryKey: ["visibility", targetKey, params?.role, params?.mode, params?.module_scope],
    queryFn: () => resolveVisibility(targetKey, params),
    staleTime: 30_000,
    retry: 1,
  });

  // Hata durumunda güvenli fallback: görünür ama read-only
  const isError = query.isError;
  const fallback = isError ? ERROR_FALLBACK : LOADING_DEFAULT;
  const resolution = query.data ?? fallback;

  return {
    visible: resolution.visible,
    readOnly: resolution.read_only,
    wizardVisible: resolution.wizard_visible,
    isLoading: query.isLoading,
    isError,
    resolution,
  };
}
