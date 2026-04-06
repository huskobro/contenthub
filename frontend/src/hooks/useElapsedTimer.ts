import { useState, useEffect, useRef } from "react";

/**
 * Client-side elapsed timer that ticks every second while active.
 *
 * @param serverElapsed - The last server-reported elapsed seconds (or null)
 * @param isActive - Whether the timer should be running (e.g. step is "running")
 * @returns Current elapsed seconds (updates every ~1s while active)
 */
export function useElapsedTimer(
  serverElapsed: number | null,
  isActive: boolean,
): number | null {
  const [localElapsed, setLocalElapsed] = useState<number | null>(serverElapsed);
  const lastServerRef = useRef(serverElapsed);

  // Sync from server when server value changes
  useEffect(() => {
    if (serverElapsed !== lastServerRef.current) {
      lastServerRef.current = serverElapsed;
      setLocalElapsed(serverElapsed);
    }
  }, [serverElapsed]);

  // Tick every second while active
  useEffect(() => {
    if (!isActive || localElapsed === null) return;

    const interval = setInterval(() => {
      setLocalElapsed((prev) => (prev !== null ? prev + 1 : null));
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, localElapsed !== null]);

  return localElapsed;
}
