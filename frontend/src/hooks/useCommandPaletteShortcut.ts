/**
 * useCommandPaletteShortcut — Wave 2 / M25 + Pass-6 (revize 3, kullanici-test edildi)
 *
 * Global keyboard shortcuts (browser-safe + Turkce Mac klavyede kolay erisim,
 * kullanici tarafindan dogrudan dogrulandi):
 *   - Cmd+K / Ctrl+K — komut paletini ac/kapat (endustri standardi: Linear/GitHub/Slack)
 *   - Cmd+J / Ctrl+J — sidebar toggle (kullanici Chrome'da test etti: "bir sey yapmiyor"
 *     — yani browser intercept etmiyor, web sayfasi override edebilir)
 *
 * Pass-6 elenen kombinasyonlar (neden):
 *   - Cmd+P  = print (Chrome/Safari/Firefox — preventDefault calismiyor)
 *   - Cmd+B  = bookmarks/favorites bar (Safari + Firefox)
 *   - Cmd+Shift+B = bookmarks bar (Chrome/Safari/Firefox)
 *   - Cmd+Shift+P = Private Window (Firefox — OS-level, preventDefault calismiyor)
 *   - Cmd+\\ = browser-safe ama Turkce Mac klavyede dogrudan tus yok
 *     (Alt+Shift+7 kombinasyonu — pratik degil)
 *   - Cmd+E  = aday — kullanici test etmedi (potansiyel olarak Chrome
 *     omnibox/search kombinasyonu); Cmd+J zaten dogrulandi, daha guvenli
 *
 * Pass-6 revize 3: Cmd+E → Cmd+J (kullanici-dogrulanmis temiz tus).
 */

import { useEffect } from "react";
import { useCommandPaletteStore } from "../stores/commandPaletteStore";
import { useUIStore } from "../stores/uiStore";

export function useCommandPaletteShortcut() {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;

      // Cmd+K → palette (3 ana browser'da temiz, endustri standardi)
      if (!e.shiftKey && e.key === "k") {
        e.preventDefault();
        e.stopPropagation();
        useCommandPaletteStore.getState().toggle();
        return;
      }
      // Cmd+J → sidebar toggle (kullanici-dogrulanmis: "bir sey yapmiyor" = web override edebilir)
      if (!e.shiftKey && (e.key === "j" || e.key === "J")) {
        e.preventDefault();
        e.stopPropagation();
        useUIStore.getState().toggleSidebar();
        return;
      }
    }

    document.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => document.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, []);
}
