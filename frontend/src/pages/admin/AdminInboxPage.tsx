/**
 * AdminInboxPage — Faz 13: Admin wrapper for Operations Inbox.
 *
 * Reuses UserInboxPage with isAdmin=true to show all items.
 * Aurora surface override (`admin.inbox`) geçerliyse onu kullanır;
 * aksi halde legacy yüzeye düşer.
 */

import { UserInboxPage } from "../user/UserInboxPage";
import { useSurfacePageOverride } from "../../surfaces/SurfaceContext";

export function AdminInboxPage() {
  const Override = useSurfacePageOverride("admin.inbox");
  if (Override) return <Override />;
  return <UserInboxPage isAdmin />;
}
