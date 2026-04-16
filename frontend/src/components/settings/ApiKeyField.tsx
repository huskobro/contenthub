/**
 * ApiKeyField — Extracted from CredentialsPanel.
 *
 * Renders a single credential row with:
 * - Status and source badges
 * - Masked current value
 * - Inline edit (password input) with save/cancel
 * - Validate button for configured credentials
 * - Feedback messages
 */

import { useState } from "react";
import {
  useSaveCredential,
  useValidateCredential,
} from "../../hooks/useCredentials";
import { useReadOnly } from "../visibility/ReadOnlyGuard";
import type { CredentialStatus } from "../../api/credentialsApi";
import { cn } from "../../lib/cn";
import { formatDateShort } from "../../lib/formatDate";

// ---------------------------------------------------------------------------
// Status Badge (local to credentials context)
// ---------------------------------------------------------------------------

function CredStatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    configured: { bg: "bg-success-light", fg: "text-success-text", label: "Yapilandirildi" },
    env_only: { bg: "bg-warning-light", fg: "text-warning-text", label: ".env" },
    missing: { bg: "bg-error-light", fg: "text-error-text", label: "Eksik" },
    invalid: { bg: "bg-error-light", fg: "text-error-text", label: "Gecersiz" },
    connected: { bg: "bg-info-light", fg: "text-brand-700", label: "Bagli" },
  };
  const s = map[status] ?? { bg: "bg-neutral-100", fg: "text-neutral-700", label: status };

  return (
    <span
      className={cn(
        "inline-block px-2 py-1 rounded-full text-xs font-semibold tracking-tight",
        s.bg,
        s.fg,
      )}
    >
      {s.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Source Badge
// ---------------------------------------------------------------------------

function CredSourceBadge({ source }: { source: string }) {
  if (source === "none") return null;
  const label = source === "db" ? "DB" : source === "env" ? "ENV" : source;
  return (
    <span className="inline-block px-2 py-1 rounded-sm text-xs font-medium bg-neutral-100 text-neutral-600">
      kaynak: {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// ApiKeyField
// ---------------------------------------------------------------------------

export function ApiKeyField({ cred }: { cred: CredentialStatus }) {
  const readOnly = useReadOnly();
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");
  // Phase AI — "info" variant: kayit dogrulandi ama canli provider testi yapilmadi.
  // Kullaniciya "saved-only / not live-tested" durumunu net gosterir (yesil yerine notr).
  const [feedback, setFeedback] = useState<
    { type: "success" | "error" | "info"; msg: string } | null
  >(null);

  const saveMutation = useSaveCredential();
  const validateMutation = useValidateCredential();

  function handleSave() {
    if (!inputValue.trim()) return;
    setFeedback(null);
    saveMutation.mutate(
      { key: cred.key, value: inputValue.trim() },
      {
        onSuccess: (data) => {
          setEditing(false);
          setInputValue("");
          const action = data.wiring?.action;
          if (action === "replaced" || action === "registered") {
            setFeedback({ type: "success", msg: "Kaydedildi ve provider guncellendi." });
          } else {
            setFeedback({ type: "success", msg: "Kaydedildi." });
          }
        },
        onError: (err) => {
          setFeedback({ type: "error", msg: err instanceof Error ? err.message : "Kayit hatasi." });
        },
      },
    );
  }

  function handleValidate() {
    setFeedback(null);
    validateMutation.mutate(cred.key, {
      onSuccess: (data) => {
        // Phase AI — honesty gate:
        //   valid=true, live_tested=false  → info (saved-only; green-success degil)
        //   valid=true, live_tested=true   → success (future: gercek canli ping yapildi)
        //   valid=false                    → error
        let type: "success" | "error" | "info";
        if (!data.valid) {
          type = "error";
        } else if (data.live_tested) {
          type = "success";
        } else {
          type = "info";
        }
        setFeedback({ type, msg: data.message });
      },
      onError: (err) => {
        setFeedback({ type: "error", msg: err instanceof Error ? err.message : "Dogrulama hatasi." });
      },
    });
  }

  function handleCancel() {
    setEditing(false);
    setInputValue("");
    setFeedback(null);
  }

  return (
    <div className="border border-border-subtle rounded-lg p-4 mb-3 bg-surface-card shadow-xs transition-shadow duration-normal hover:shadow-md hover:border-border">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-base font-semibold text-neutral-900 min-w-[160px]">{cred.label}</span>
        <CredStatusBadge status={cred.status} />
        <CredSourceBadge source={cred.source} />
        {cred.updated_at && (
          <span className="text-xs text-neutral-500">
            {formatDateShort(cred.updated_at)}
          </span>
        )}
      </div>

      {cred.help_text && <div className="text-xs text-neutral-500 mt-1 leading-normal">{cred.help_text}</div>}

      {/* Current masked value */}
      {cred.masked_value && !editing && (
        <div className="mt-2">
          <span className="text-base text-neutral-600 font-mono tracking-wide">{cred.masked_value}</span>
        </div>
      )}

      {/* Action bar */}
      <div className="flex gap-2 mt-2 items-center">
        {editing ? (
          <>
            <input
              className="flex-1 min-w-[200px] px-2 py-1 border border-border rounded-sm text-base font-body outline-none transition-colors duration-fast focus:border-focus"
              type="password"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Yeni deger girin..."
              autoComplete="off"
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
            />
            <button
              className={cn(
                "px-3 py-1 bg-brand-600 text-neutral-0 border-none rounded-md cursor-pointer text-sm font-medium transition-opacity duration-fast",
                saveMutation.isPending && "opacity-60",
              )}
              onClick={handleSave}
              disabled={saveMutation.isPending || !inputValue.trim()}
            >
              {saveMutation.isPending ? "..." : "Kaydet"}
            </button>
            <button
              className="px-3 py-1 bg-transparent text-neutral-600 border border-border rounded-md cursor-pointer text-sm font-medium transition-colors duration-fast hover:bg-neutral-50"
              onClick={handleCancel}
            >
              Iptal
            </button>
          </>
        ) : (
          <>
            <button
              className={cn(
                "px-3 py-1 bg-transparent text-neutral-600 border border-border rounded-md text-sm font-medium transition-colors duration-fast hover:bg-neutral-50",
                readOnly ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
              )}
              disabled={readOnly}
              onClick={() => setEditing(true)}
            >
              {cred.status === "missing" ? "Ekle" : "Degistir"}
            </button>
            {cred.status !== "missing" && (
              <button
                className={cn(
                  "px-3 py-1 bg-transparent text-neutral-600 border border-border rounded-md text-sm font-medium transition-colors duration-fast hover:bg-neutral-50",
                  validateMutation.isPending && "opacity-60",
                )}
                onClick={handleValidate}
                disabled={validateMutation.isPending}
              >
                {validateMutation.isPending ? "..." : "Dogrula"}
              </button>
            )}
          </>
        )}
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          className={cn(
            "mt-1 text-sm",
            feedback.type === "success" && "text-success-text",
            feedback.type === "error" && "text-error",
            // Phase AI — saved-only / not live-tested: notr renk + italic for honesty.
            feedback.type === "info" && "text-muted italic",
          )}
        >
          {feedback.msg}
        </div>
      )}
    </div>
  );
}
