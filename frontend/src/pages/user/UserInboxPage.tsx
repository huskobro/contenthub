/**
 * UserInboxPage — Faz 13: Operations Inbox for users.
 *
 * Shows items requiring user attention: publish reviews, comment replies,
 * failures, pending actions. Users see only their own items.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../stores/authStore";
import { useToast } from "../../hooks/useToast";
import {
  fetchInboxItems,
  updateInboxItem,
  type InboxItemResponse,
} from "../../api/automationApi";
import { cn } from "../../lib/cn";
import { useActiveScope } from "../../hooks/useActiveScope";
import { useSurfacePageOverride } from "../../surfaces";
import { toastMessageFromError } from "../../lib/errorUtils";

// ---------------------------------------------------------------------------
// Type labels and colors
// ---------------------------------------------------------------------------

const TYPE_LABELS: Record<string, string> = {
  publish_review: "Yayin Onay",
  comment_reply: "Yorum Cevabi",
  playlist_action: "Playlist Islemi",
  post_action: "Post Islemi",
  render_failure: "Render Hatasi",
  publish_failure: "Yayin Hatasi",
  source_scan_error: "Kaynak Tarama Hatasi",
};

const TYPE_COLORS: Record<string, string> = {
  publish_review: "bg-info-light text-info-dark",
  comment_reply: "bg-violet-100 text-violet-700",
  playlist_action: "bg-sky-100 text-sky-700",
  post_action: "bg-emerald-100 text-emerald-700",
  render_failure: "bg-error-light text-error-dark",
  publish_failure: "bg-error-light text-error-dark",
  source_scan_error: "bg-warning-light text-warning-dark",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "text-neutral-400",
  normal: "text-neutral-600",
  high: "text-warning-dark",
  urgent: "text-error-dark font-semibold",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Acik",
  acknowledged: "Goruldu",
  resolved: "Cozuldu",
  dismissed: "Reddedildi",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface InboxPageProps {
  isAdmin?: boolean;
}

export function UserInboxPage({ isAdmin }: InboxPageProps) {
  const Override = useSurfacePageOverride("user.inbox");
  if (Override && !isAdmin) return <Override />;
  return <LegacyUserInboxPage isAdmin={isAdmin} />;
}

function LegacyUserInboxPage({ isAdmin }: InboxPageProps) {
  const userId = useAuthStore((s) => s.user?.id);
  const qc = useQueryClient();
  const toast = useToast();

  // Redesign REV-2 / P0.3c:
  //   Admin wrapper (isAdmin=true) ve adminScopeStore focused-user ise
  //   inbox o user'a daraltılır. Admin "all" seçerse tüm kapsam görülür
  //   (mevcut davranış). User rolünde inbox her zaman kendi user.id'si ile.
  const scope = useActiveScope();
  const effectiveOwnerForAdmin =
    scope.role === "admin" && scope.ownerUserId ? scope.ownerUserId : undefined;

  const inboxOwnerUserId = isAdmin ? effectiveOwnerForAdmin : userId;

  const { data: items = [], isLoading } = useQuery({
    queryKey: [
      "operations-inbox",
      { owner_user_id: inboxOwnerUserId, isAllUsers: scope.isAllUsers, role: scope.role },
    ],
    queryFn: () =>
      fetchInboxItems(
        inboxOwnerUserId ? { owner_user_id: inboxOwnerUserId } : {},
      ),
    enabled: !!userId || isAdmin,
  });

  const updateMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateInboxItem(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["operations-inbox"] });
      toast.success("Inbox ogesi guncellendi");
    },
    onError: (err) => {
      // Faz 4: status changes used to fail silently — surface them.
      toast.error(toastMessageFromError(err));
    },
  });

  const openItems = items.filter((i: InboxItemResponse) => i.status === "open" || i.status === "acknowledged");
  const resolvedItems = items.filter((i: InboxItemResponse) => i.status === "resolved" || i.status === "dismissed");

  return (
    <div className="space-y-6" data-testid="operations-inbox-page">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="m-0 text-lg font-semibold text-neutral-800">
            {isAdmin ? "Operations Inbox (Admin)" : "Islem Kutusu"}
          </h2>
          <p className="m-0 text-sm text-neutral-500">
            Dikkat gerektiren ogeler ve bekleyen islemler
          </p>
        </div>
        <span className="px-3 py-1 bg-brand-50 text-brand-700 rounded-full text-sm font-medium">
          {openItems.length} acik
        </span>
      </div>

      {isLoading && <p className="text-sm text-neutral-400 m-0">Yukleniyor...</p>}

      {!isLoading && openItems.length === 0 && (
        <div className="bg-neutral-50 border border-neutral-200 rounded-md p-6 text-center">
          <p className="m-0 text-sm text-neutral-500">Bekleyen islem yok.</p>
        </div>
      )}

      {/* Open items */}
      {openItems.length > 0 && (
        <div className="space-y-2">
          {openItems.map((item: InboxItemResponse) => (
            <div
              key={item.id}
              className="bg-white border border-neutral-200 rounded-md p-3 flex items-start gap-3"
            >
              {/* Type badge */}
              <span className={cn("px-2 py-0.5 rounded text-xs font-medium shrink-0 mt-0.5", TYPE_COLORS[item.item_type] ?? "bg-neutral-100 text-neutral-600")}>
                {TYPE_LABELS[item.item_type] ?? item.item_type}
              </span>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h4 className="m-0 text-sm font-medium text-neutral-800 truncate">{item.title}</h4>
                {item.reason && (
                  <p className="m-0 text-xs text-neutral-500 mt-0.5 line-clamp-2">{item.reason}</p>
                )}
                <div className="flex items-center gap-3 mt-1 text-[10px] text-neutral-400">
                  <span className={PRIORITY_COLORS[item.priority]}>
                    {item.priority}
                  </span>
                  <span>{new Date(item.created_at).toLocaleDateString("tr-TR")}</span>
                  {item.related_entity_type && (
                    <span>{item.related_entity_type}</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-1 shrink-0">
                {item.action_url && (
                  <a
                    href={item.action_url}
                    className="px-2 py-1 bg-brand-50 text-brand-700 rounded text-xs hover:bg-brand-100"
                  >
                    Git
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => updateMut.mutate({ id: item.id, status: "resolved" })}
                  disabled={updateMut.isPending}
                  className="px-2 py-1 bg-success-light text-success-dark rounded text-xs hover:bg-success/20"
                >
                  Coz
                </button>
                <button
                  type="button"
                  onClick={() => updateMut.mutate({ id: item.id, status: "dismissed" })}
                  disabled={updateMut.isPending}
                  className="px-2 py-1 bg-neutral-100 text-neutral-500 rounded text-xs hover:bg-neutral-200"
                >
                  Kapat
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resolved items (collapsed) */}
      {resolvedItems.length > 0 && (
        <details className="mt-4">
          <summary className="text-sm text-neutral-500 cursor-pointer hover:text-neutral-700">
            Cozulmus / kapatilmis ({resolvedItems.length})
          </summary>
          <div className="space-y-2 mt-2">
            {resolvedItems.slice(0, 20).map((item: InboxItemResponse) => (
              <div
                key={item.id}
                className="bg-neutral-50 border border-neutral-100 rounded-md p-3 flex items-start gap-3 opacity-60"
              >
                <span className={cn("px-2 py-0.5 rounded text-xs font-medium shrink-0", TYPE_COLORS[item.item_type] ?? "bg-neutral-100 text-neutral-600")}>
                  {TYPE_LABELS[item.item_type] ?? item.item_type}
                </span>
                <div className="flex-1 min-w-0">
                  <h4 className="m-0 text-sm text-neutral-600 truncate">{item.title}</h4>
                  <span className="text-[10px] text-neutral-400">
                    {STATUS_LABELS[item.status]} &middot; {item.resolved_at ? new Date(item.resolved_at).toLocaleDateString("tr-TR") : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
