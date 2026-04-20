/**
 * sseStatusStore — Aurora Cockpit Statusbar için SSE bağlantı durumu paylaşır.
 *
 * `useGlobalSSE` (layout seviyesinde çağrılan) `useSSE`'nin döndürdüğü
 * `connected` / `reconnecting` değerlerini buraya yazar. CockpitShell
 * Statusbar bu store'u okuyup canlı tonu gösterir — böylece SSE durumu
 * artık sabit "live" yalanı değil gerçek durum.
 *
 * Tek bir kaynak; component prop drilling yok.
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
