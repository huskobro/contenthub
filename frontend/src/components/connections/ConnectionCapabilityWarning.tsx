/**
 * ConnectionCapabilityWarning — Faz 17.
 *
 * Reusable cross-module component that shows a warning banner
 * when a platform connection is missing a required capability.
 *
 * Usage:
 *   <ConnectionCapabilityWarning connectionId={id} requiredCapability="can_publish" />
 *   <ConnectionCapabilityWarning connectionId={id} requiredCapability="can_read_comments" />
 *
 * Shows nothing if the capability is "supported" or if loading.
 * Links to the Connection Center for resolution.
 */

import { Link } from "react-router-dom";
import { useConnectionCapability } from "../../hooks/useConnections";

const CAPABILITY_LABELS: Record<string, string> = {
  can_publish: "Yayin yapma",
  can_read_comments: "Yorum okuma",
  can_reply_comments: "Yorum yanitlama",
  can_read_playlists: "Playlist okuma",
  can_write_playlists: "Playlist yazma",
  can_create_posts: "Post olusturma",
  can_read_analytics: "Analitik okuma",
  can_sync_channel_info: "Kanal senkronizasyonu",
};

const STATUS_MESSAGES: Record<string, string> = {
  unsupported: "Platform bu ozelligi desteklemiyor.",
  blocked_by_scope: "Yetki (scope) eksik — yeniden yetkilendirme gerekebilir.",
  blocked_by_token: "Token gecersiz veya suresi dolmus.",
  blocked_by_connection: "Baglanti kopuk veya yeniden yetkilendirme gerekli.",
  unknown: "Durum belirlenemedi.",
};

interface Props {
  connectionId: string | undefined;
  requiredCapability: string;
  /** Which panel context — determines link target */
  context?: "user" | "admin";
}

export function ConnectionCapabilityWarning({
  connectionId,
  requiredCapability,
  context = "user",
}: Props) {
  const { data: matrix, isLoading } = useConnectionCapability(connectionId);

  if (isLoading || !matrix) return null;

  const status = matrix[requiredCapability];
  if (!status || status === "supported") return null;

  const capLabel = CAPABILITY_LABELS[requiredCapability] || requiredCapability;
  const statusMsg = STATUS_MESSAGES[status] || STATUS_MESSAGES.unknown;
  const linkTarget = context === "admin" ? "/admin/connections" : "/user/connections";

  return (
    <div className="flex items-start gap-2 px-3 py-2 bg-warning-50 border border-warning-200 rounded-md text-xs text-warning-800">
      <span className="text-warning-600 font-bold mt-0.5">⚠</span>
      <div>
        <p className="font-medium">{capLabel} yetenegi kullanilamaz</p>
        <p className="text-warning-700 mt-0.5">{statusMsg}</p>
        <Link to={linkTarget} className="text-warning-800 underline mt-1 inline-block hover:text-warning-900">
          Baglanti Merkezine Git
        </Link>
      </div>
    </div>
  );
}
