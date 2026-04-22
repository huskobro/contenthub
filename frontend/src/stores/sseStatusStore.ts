/**
 * sseStatusStore — Aurora Cockpit Statusbar için SSE bağlantı durumu paylaşır.
 *
 * `useGlobalSSE` (layout seviyesinde çağrılan) `useSSE`'nin döndürdüğü
 * `connected` / `reconnecting` değerlerini buraya yazar. CockpitShell
 * Statusbar bu store'u okuyup canlı tonu gösterir.
 *
 * Tek kaynak; component prop drilling yok.
 *
 * State machine (Aurora Final Polish):
 *   - "live"          — EventSource açık ve handshake tamamlandı.
 *   - "reconnecting"  — kopma var ama henüz "offline" denecek kadar uzun
 *                       sürmedi (transient, sessiz uyarı).
 *   - "offline"       — gerçekten bağlantı yok, polling fallback aktif.
 *
 * Ayrım nedeni: `onerror` her tetiklendiğinde anında "offline" göstermek
 * tarayıcı çevrimiçi olduğu halde yanıltıcı "çevrimdışı" hissi veriyordu.
 * Artık `useSSE` 8 sn grace window içinde reconnect başarılı olursa
 * kullanıcı hiçbir şey görmez. Sadece grace bittikten sonra `offline`
 * olur ve polling banner devreye girer.
 */
import { create } from "zustand";

export type SSEStatus = "live" | "reconnecting" | "offline";

interface SSEStatusState {
  status: SSEStatus;
  lastChangeAt: number;
  setStatus: (status: SSEStatus) => void;
}

export const useSSEStatusStore = create<SSEStatusState>((set, get) => ({
  status: "offline",
  lastChangeAt: 0,
  setStatus: (status) => {
    if (get().status === status) return;
    set({ status, lastChangeAt: Date.now() });
  },
}));
