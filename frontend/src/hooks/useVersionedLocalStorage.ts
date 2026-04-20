/**
 * useVersionedLocalStorage — versiyonlu localStorage kaydi icin paylasimli hook.
 *
 * useRecentPages, useFavorites ve benzeri feature hook'lari ayni cekirdek
 * davranisi tekrarliyordu:
 *
 *   - JSON encode/decode + try/catch
 *   - sema dogrulama (kotu/kismi veriyi sessizce reddet)
 *   - quota/disabled icin sessiz yutma
 *   - in-process listener seti + cross-tab `storage` event subscription
 *
 * Bu modul cekirdegi tek noktada toplar. Hook (`useVersionedLocalStorage`)
 * React component'lerinden tuketilir; imperative API (`readVersionedStorage`,
 * `writeVersionedStorage`, `clearVersionedStorage`) hook context'i disindaki
 * kullanim icin (orn: route mount uzerinde recordRecentPage) ayni kanali
 * kullanir, hook consumer'lari da bu yazimi anlik gorur.
 *
 * Versiyonlama: storage key suffix'i `vN` olmali (orn: `aurora.recentPages.v1`).
 * Sema kirilirsa yeni versiyona gec.
 */
import { useCallback, useEffect, useState } from "react";

export interface VersionedStorageDescriptor<T> {
  /** Storage key — versiyonlu olmali. */
  key: string;
  /** Bos/missing/parse-error/validation-fail durumunda donen seed deger. */
  defaultValue: T;
  /** JSON.parse ciktisini guvenli bicimde T'ye daraltir; gecersizse `null` doner. */
  validate: (raw: unknown) => T | null;
}

interface ChannelEntry {
  listeners: Set<() => void>;
}

const channels = new Map<string, ChannelEntry>();

function getChannel(key: string): ChannelEntry {
  let entry = channels.get(key);
  if (!entry) {
    entry = { listeners: new Set() };
    channels.set(key, entry);
  }
  return entry;
}

function notify(key: string): void {
  const entry = channels.get(key);
  if (!entry) return;
  for (const fn of entry.listeners) fn();
}

export function readVersionedStorage<T>(
  desc: VersionedStorageDescriptor<T>,
): T {
  try {
    const raw = localStorage.getItem(desc.key);
    if (!raw) return desc.defaultValue;
    const parsed = JSON.parse(raw) as unknown;
    const validated = desc.validate(parsed);
    return validated ?? desc.defaultValue;
  } catch {
    return desc.defaultValue;
  }
}

export function writeVersionedStorage<T>(
  desc: VersionedStorageDescriptor<T>,
  next: T,
): void {
  try {
    localStorage.setItem(desc.key, JSON.stringify(next));
  } catch {
    /* localStorage quota / disabled — sessizce gec */
  }
  notify(desc.key);
}

export function clearVersionedStorage<T>(
  desc: VersionedStorageDescriptor<T>,
): void {
  try {
    localStorage.removeItem(desc.key);
  } catch {
    /* sessizce yut */
  }
  notify(desc.key);
}

interface VersionedStorageHookResult<T> {
  /** Mevcut deger. Storage degisince re-render. */
  value: T;
  /** Yeni deger yazar; tum consumer'lara duyurur. */
  set: (next: T) => void;
  /** Onceki degeri okuyup transformation uygular. */
  update: (mutator: (prev: T) => T) => void;
  /** Storage'i siler ve `defaultValue`'a doner. */
  clear: () => void;
}

export function useVersionedLocalStorage<T>(
  desc: VersionedStorageDescriptor<T>,
): VersionedStorageHookResult<T> {
  const [value, setValue] = useState<T>(() => readVersionedStorage(desc));

  useEffect(() => {
    const refresh = () => setValue(readVersionedStorage(desc));
    const entry = getChannel(desc.key);
    entry.listeners.add(refresh);

    const onStorage = (e: StorageEvent) => {
      if (e.key === desc.key) refresh();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      entry.listeners.delete(refresh);
      window.removeEventListener("storage", onStorage);
    };
    // desc.key tek tetikleyici; defaultValue/validate referansi degisirse
    // consumer acik bir hook cagrisi yapmali.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desc.key]);

  const set = useCallback(
    (next: T) => writeVersionedStorage(desc, next),
    // desc bir referans degil sema; key/validate degisimini consumer kontrol etsin
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [desc.key],
  );

  const update = useCallback(
    (mutator: (prev: T) => T) => {
      const current = readVersionedStorage(desc);
      writeVersionedStorage(desc, mutator(current));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [desc.key],
  );

  const clear = useCallback(
    () => clearVersionedStorage(desc),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [desc.key],
  );

  return { value, set, update, clear };
}
