/**
 * CredentialsPanel — Credential management panel.
 *
 * Groups credentials by category and renders ApiKeyField for each.
 * Appends YouTubeOAuthSection after the YouTube credential group.
 *
 * Sub-components extracted to:
 * - ApiKeyField.tsx — single credential row with save/validate
 * - YouTubeOAuthSection.tsx — YouTube OAuth2 connection flow
 */

import { useCredentialsList } from "../../hooks/useCredentials";
import type { CredentialStatus } from "../../api/credentialsApi";
import { ApiKeyField } from "./ApiKeyField";
import { YouTubeOAuthSection } from "./YouTubeOAuthSection";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GROUP_LABELS: Record<string, string> = {
  ai_providers: "AI Servisleri (LLM)",
  visual_providers: "Gorsel Servisler",
  youtube: "YouTube",
};

const GROUP_ORDER = ["ai_providers", "visual_providers", "youtube"];

// ---------------------------------------------------------------------------
// Main CredentialsPanel
// ---------------------------------------------------------------------------

export function CredentialsPanel() {
  const { data: credentials, isLoading, isError, error } = useCredentialsList();

  if (isLoading) {
    return <p className="text-neutral-600 text-base">Yukleniyor...</p>;
  }
  if (isError) {
    return (
      <p className="text-error text-base">
        Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
      </p>
    );
  }
  if (!credentials || credentials.length === 0) {
    return <p className="text-neutral-600 text-base">Tanimli credential bulunamadi.</p>;
  }

  // Group credentials by their group field
  const grouped: Record<string, CredentialStatus[]> = {};
  for (const cred of credentials) {
    const g = cred.group || "other";
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push(cred);
  }

  return (
    <div>
      {GROUP_ORDER.map((groupKey) => {
        const items = grouped[groupKey];
        if (!items || items.length === 0) return null;
        return (
          <div key={groupKey} className="mb-6">
            <div className="text-base font-semibold text-neutral-800 mb-3 pb-2 border-b border-border-subtle">
              {GROUP_LABELS[groupKey] ?? groupKey}
            </div>
            {items.map((cred) => (
              <ApiKeyField key={cred.key} cred={cred} />
            ))}
            {/* YouTube connection section after YouTube credentials */}
            {groupKey === "youtube" && <YouTubeOAuthSection />}
          </div>
        );
      })}
    </div>
  );
}
