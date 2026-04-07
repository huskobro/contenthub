import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { browseDirectory, validatePath, type DirEntry } from "../../api/fsApi";
import { useEffectiveSetting, useUpdateSettingValue } from "../../hooks/useEffectiveSettings";
import { cn } from "../../lib/cn";

const SETTING_KEY = "system.workspace_root";

export function WorkspaceRootPicker() {
  const { data: setting, isLoading } = useEffectiveSetting(SETTING_KEY);
  const update = useUpdateSettingValue();

  const currentValue = (setting?.effective_value ?? "") as string;

  const [browseOpen, setBrowseOpen] = useState(false);
  const [browsePath, setBrowsePath] = useState<string | undefined>(undefined);
  const [saved, setSaved] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationMsg, setValidationMsg] = useState<string | null>(null);

  // When dialog opens, start from current value or home
  function handleOpenBrowser() {
    setBrowsePath(currentValue || undefined);
    setBrowseOpen(true);
  }

  function handleSelectPath(path: string) {
    setBrowseOpen(false);
    // Validate then save
    setValidating(true);
    setValidationMsg(null);
    validatePath(path).then((res) => {
      setValidating(false);
      if (!res.valid) {
        setValidationMsg(`Geçersiz: ${res.reason}`);
        return;
      }
      update.mutate(
        { key: SETTING_KEY, value: path },
        {
          onSuccess: () => {
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
          },
          onError: () => {
            setValidationMsg("Kaydedilemedi.");
          },
        }
      );
    });
  }

  function handleClear() {
    update.mutate(
      { key: SETTING_KEY, value: "" },
      {
        onSuccess: () => {
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        },
      }
    );
  }

  return (
    <div className="mb-5 bg-surface-card border border-border-subtle rounded-xl p-4">
      <div className="mb-3">
        <h3 className="m-0 text-sm font-semibold text-neutral-800">Çıktı Klasörü (Workspace)</h3>
        <p className="m-0 mt-1 text-xs text-neutral-500">
          Job artifact'larının (ses, video, görseller) yazılacağı ana klasör.
          Boş bırakılırsa varsayılan <code className="text-xs bg-neutral-100 px-1 rounded">backend/workspace/</code> kullanılır.
        </p>
      </div>

      {isLoading ? (
        <p className="text-xs text-neutral-400">Yükleniyor...</p>
      ) : (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-0 bg-neutral-50 border border-border-subtle rounded-md px-3 py-2 text-sm text-neutral-700 font-mono truncate">
            {currentValue || <span className="text-neutral-400 italic font-sans">Varsayılan (backend/workspace/)</span>}
          </div>

          <button
            type="button"
            onClick={handleOpenBrowser}
            className="shrink-0 px-3 py-1.5 text-sm font-medium rounded-md bg-brand-600 text-white hover:bg-brand-700 transition-colors cursor-pointer border-0"
            disabled={update.isPending || validating}
          >
            📁 Klasör Seç
          </button>

          {currentValue && (
            <button
              type="button"
              onClick={handleClear}
              className="shrink-0 px-3 py-1.5 text-sm font-medium rounded-md bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-colors cursor-pointer border-0"
              disabled={update.isPending}
            >
              Varsayılana Dön
            </button>
          )}

          {saved && <span className="text-xs text-success font-medium">✓ Kaydedildi</span>}
          {validationMsg && <span className="text-xs text-error-dark">{validationMsg}</span>}
          {validating && <span className="text-xs text-neutral-400">Doğrulanıyor...</span>}
        </div>
      )}

      {browseOpen && (
        <DirectoryBrowserDialog
          initialPath={browsePath}
          onSelect={handleSelectPath}
          onClose={() => setBrowseOpen(false)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DirectoryBrowserDialog
// ---------------------------------------------------------------------------

interface DirectoryBrowserDialogProps {
  initialPath?: string;
  onSelect: (path: string) => void;
  onClose: () => void;
}

function DirectoryBrowserDialog({ initialPath, onSelect, onClose }: DirectoryBrowserDialogProps) {
  const [currentPath, setCurrentPath] = useState<string | undefined>(initialPath);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["fs-browse", currentPath ?? "__home__"],
    queryFn: () => browseDirectory(currentPath),
    staleTime: 5_000,
  });

  function navigate(path: string) {
    setCurrentPath(path);
  }

  function goUp() {
    if (data?.parent_path) {
      setCurrentPath(data.parent_path);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
          <h3 className="text-sm font-semibold text-neutral-900">Klasör Seç</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 bg-transparent border-0 cursor-pointer text-lg leading-none"
          >
            ×
          </button>
        </div>

        {/* Current path breadcrumb */}
        <div className="px-4 py-2 bg-neutral-50 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            {data?.parent_path && (
              <button
                type="button"
                onClick={goUp}
                className="text-xs text-brand-600 hover:text-brand-700 bg-transparent border-0 cursor-pointer p-0 shrink-0"
              >
                ← Yukarı
              </button>
            )}
            <span className="text-xs text-neutral-500 font-mono truncate">
              {data?.current_path ?? "..."}
            </span>
          </div>
        </div>

        {/* Directory listing */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {isLoading && (
            <p className="text-sm text-neutral-400 py-4 text-center">Yükleniyor...</p>
          )}
          {isError && (
            <p className="text-sm text-error-dark py-4 text-center">Dizin okunamadı.</p>
          )}
          {data && data.entries.length === 0 && (
            <p className="text-sm text-neutral-400 py-4 text-center">Boş dizin.</p>
          )}
          {data && data.entries.map((entry: DirEntry) => (
            <button
              key={entry.path}
              type="button"
              onClick={() => entry.readable && navigate(entry.path)}
              disabled={!entry.readable}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-sm transition-colors bg-transparent border-0",
                entry.readable
                  ? "hover:bg-brand-50 text-neutral-800 cursor-pointer"
                  : "text-neutral-300 cursor-not-allowed"
              )}
            >
              <span className="text-base">📁</span>
              <span className="truncate">{entry.name}</span>
            </button>
          ))}
        </div>

        {/* Footer actions */}
        <div className="px-4 py-3 border-t border-border-subtle flex items-center justify-between gap-3">
          <p className="text-xs text-neutral-500 truncate flex-1">
            Seçilecek: <span className="font-mono">{data?.current_path ?? "..."}</span>
          </p>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-sm font-medium rounded-md bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border-0 cursor-pointer transition-colors"
            >
              İptal
            </button>
            <button
              type="button"
              onClick={() => data?.current_path && onSelect(data.current_path)}
              disabled={!data?.current_path}
              className="px-3 py-1.5 text-sm font-medium rounded-md bg-brand-600 text-white hover:bg-brand-700 border-0 cursor-pointer transition-colors disabled:opacity-50"
            >
              Bu Klasörü Seç
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
