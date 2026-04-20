/**
 * useFavorites — Aurora Cockpit "yıldız" (pin) sistemi.
 *
 * Kullanıcı bir route'u yıldızladığında localStorage'da saklanır;
 * Ctxbar'da kısayol olarak görünür ve breadcrumb'da yıldız ikonuyla
 * mevcut sayfanın favorilerde olduğu görülür.
 *
 * Storage key: `aurora.favorites.v1`. Maks 12 kayıt — Cockpit dar şerit
 * için sınır anlamlı; üst sınıra ulaşılırsa en eski yıldız düşer.
 *
 * Çekirdek storage davranışı `useVersionedLocalStorage` hook'unda — JSON
 * encode/decode, şema doğrulama, in-tab kanal ve cross-tab `storage` event
 * tek noktada toplanır.
 */
import { useCallback, useMemo } from "react";

import {
  useVersionedLocalStorage,
  type VersionedStorageDescriptor,
} from "./useVersionedLocalStorage";

export interface Favorite {
  to: string;
  label: string;
  pinnedAt: string;
}

const MAX_ENTRIES = 12;

const FAVORITES_DESCRIPTOR: VersionedStorageDescriptor<Favorite[]> = {
  key: "aurora.favorites.v1",
  defaultValue: [],
  validate: (raw) => {
    if (!Array.isArray(raw)) return null;
    return raw.filter(
      (p): p is Favorite =>
        !!p &&
        typeof (p as Favorite).to === "string" &&
        typeof (p as Favorite).label === "string" &&
        typeof (p as Favorite).pinnedAt === "string",
    );
  },
};

export function useFavorites() {
  const { value: list, update } = useVersionedLocalStorage(FAVORITES_DESCRIPTOR);

  const isFavorite = useCallback(
    (to: string): boolean => list.some((f) => f.to === to),
    [list],
  );

  const add = useCallback(
    (entry: { to: string; label: string }) => {
      update((current) => {
        if (current.some((f) => f.to === entry.to)) return current;
        return [
          ...current,
          {
            to: entry.to,
            label: entry.label,
            pinnedAt: new Date().toISOString(),
          },
        ].slice(-MAX_ENTRIES);
      });
    },
    [update],
  );

  const remove = useCallback(
    (to: string) => {
      update((current) => {
        const next = current.filter((f) => f.to !== to);
        return next.length === current.length ? current : next;
      });
    },
    [update],
  );

  const toggle = useCallback(
    (entry: { to: string; label: string }) => {
      update((current) => {
        if (current.some((f) => f.to === entry.to)) {
          return current.filter((f) => f.to !== entry.to);
        }
        return [
          ...current,
          {
            to: entry.to,
            label: entry.label,
            pinnedAt: new Date().toISOString(),
          },
        ].slice(-MAX_ENTRIES);
      });
    },
    [update],
  );

  const sorted = useMemo(
    () => [...list].sort((a, b) => a.label.localeCompare(b.label, "tr")),
    [list],
  );

  return { list: sorted, isFavorite, add, remove, toggle };
}
