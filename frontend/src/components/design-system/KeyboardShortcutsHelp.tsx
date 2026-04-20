/**
 * KeyboardShortcutsHelp — ? key triggered keyboard shortcut guide
 *
 * Shows all available keyboard shortcuts in a modal overlay.
 * Theme-aware — uses CSS variables for all colors.
 */

import { useState, useEffect } from "react";
import { cn } from "../../lib/cn";

// ---------------------------------------------------------------------------
// Shortcut data
// ---------------------------------------------------------------------------

interface ShortcutGroup {
  title: string;
  shortcuts: { keys: string[]; description: string }[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "Genel",
    shortcuts: [
      { keys: ["⌘", "K"], description: "Komut Paleti" },
      { keys: ["⌘", "J"], description: "Sidebar daralt/genişlet" },
      { keys: ["?"], description: "Klavye kisayollari" },
      { keys: ["/"], description: "Arama alanina odaklan" },
      { keys: ["Esc"], description: "Paneli / modali kapat" },
    ],
  },
  {
    title: "Navigasyon",
    shortcuts: [
      { keys: ["↑", "↓"], description: "Listede yukari/asagi" },
      { keys: ["Enter"], description: "Secili ogey ac" },
      { keys: ["Space"], description: "Onizleme (QuickLook)" },
    ],
  },
  {
    title: "Islemler",
    shortcuts: [
      { keys: ["⌘", "S"], description: "Kaydet" },
      { keys: ["⌘", "Enter"], description: "Formu gonder" },
      { keys: ["⌘", "N"], description: "Yeni kayit olustur" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function KeyboardShortcutsHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      // Don't trigger when typing in inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === "?" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[990] bg-neutral-900/30 backdrop-blur-[4px]"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="fixed z-[991] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] max-w-[90vw] max-h-[80vh] bg-surface-card border border-border-subtle rounded-xl shadow-xl overflow-hidden keyboard-help-enter"
        role="dialog"
        aria-label="Klavye Kisayollari"
        data-testid="keyboard-shortcuts-help"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
          <h2 className="m-0 text-lg font-bold text-neutral-900 font-heading">
            Klavye Kisayollari
          </h2>
          <button
            onClick={() => setOpen(false)}
            className="w-7 h-7 flex items-center justify-center text-neutral-500 hover:text-neutral-800 bg-transparent border-none cursor-pointer rounded-md hover:bg-neutral-100 transition-colors duration-fast text-lg"
            aria-label="Kapat"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto max-h-[calc(80vh-60px)]">
          {SHORTCUT_GROUPS.map((group, gi) => (
            <div key={gi} className={cn(gi > 0 && "mt-5")}>
              <h3 className="m-0 text-xs font-bold text-neutral-500 uppercase tracking-[0.08em] mb-3">
                {group.title}
              </h3>
              <div className="flex flex-col gap-1.5">
                {group.shortcuts.map((shortcut, si) => (
                  <div
                    key={si}
                    className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-surface-inset transition-colors duration-fast"
                  >
                    <span className="text-sm text-neutral-700">
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, ki) => (
                        <kbd
                          key={ki}
                          className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 text-xs font-mono font-medium text-neutral-600 bg-surface-inset border border-border-subtle rounded-md shadow-xs"
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <p className="mt-5 mb-0 text-xs text-neutral-400 text-center">
            <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 text-[10px] font-mono text-neutral-500 bg-surface-inset border border-border-subtle rounded-sm">?</kbd>
            {" "}tusuna basarak bu pencereyi acabilirsiniz
          </p>
        </div>
      </div>
    </>
  );
}
