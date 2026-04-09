/**
 * AdminInboxPage — Faz 13: Admin wrapper for Operations Inbox.
 *
 * Reuses UserInboxPage with isAdmin=true to show all items.
 */

import { UserInboxPage } from "../user/UserInboxPage";

export function AdminInboxPage() {
  return <UserInboxPage isAdmin />;
}
