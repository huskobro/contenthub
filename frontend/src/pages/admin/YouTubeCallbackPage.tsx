/**
 * YouTube OAuth Callback Page — Admin panel (M9-B).
 *
 * Redesign REV-2 / P3.1: body `components/oauth/YouTubeCallbackBody`'ye
 * taşındı. Bu dosya yalnızca admin mode delegasyonunu yönetir. User panel
 * eşleniği için bkz. `pages/user/UserYouTubeCallbackPage.tsx`.
 */

import { YouTubeCallbackBody } from "../../components/oauth/YouTubeCallbackBody";

export function YouTubeCallbackPage() {
  return <YouTubeCallbackBody mode="admin" />;
}
