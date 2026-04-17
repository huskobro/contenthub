/**
 * UserYouTubeCallbackPage — User panel YouTube OAuth callback.
 *
 * Redesign REV-2 / P3.1: body `components/oauth/YouTubeCallbackBody`'ye
 * taşındı. Bu dosya yalnızca user mode delegasyonunu yönetir. `state` query
 * param'ından `channel_profile_id` çıkarımı body içinde yapılır; başarı
 * durumunda kanal detayına yönlendirme kuralı da body'de. Admin eşleniği
 * için bkz. `pages/admin/YouTubeCallbackPage.tsx`.
 */

import { YouTubeCallbackBody } from "../../components/oauth/YouTubeCallbackBody";

export function UserYouTubeCallbackPage() {
  return <YouTubeCallbackBody mode="user" />;
}
