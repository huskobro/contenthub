# Faz 17a — Cross-Module Capability Mount + Guarded UX Closure Report

## Ozet

Faz 17'de kurulan Connection Center ve Capability Matrix altyapisini gercek modul sayfalarina mount ettik. Kullanici artik yetki/baglanti sorunlarini dogrudan ilgili sayfada gorebiliyor ve engellenen aksiyonlar guard'laniyor.

## Yapilan Isler

### 1. useChannelConnection Hook (Yeni)
- `frontend/src/hooks/useChannelConnection.ts`
- channel_profile_id → primary PlatformConnection lookup
- Donus: connectionId, connection, isConnected, hasValidToken, requiresReauth, isLoading

### 2. ConnectionCapabilityWarning Gelistirildi
- `frontend/src/components/connections/ConnectionCapabilityWarning.tsx`
- Uc mod: banner (varsayilan), inline (kompakt), guard (aksiyon engelleme)
- Exported: CAPABILITY_LABELS, STATUS_MESSAGES, STATUS_CTA, useCapabilityStatus
- Severity-based styling (error/warning/neutral)

### 3. User-Side Module Mount'lar

| Sayfa | Capability | Guard |
|-------|-----------|-------|
| UserPublishPage | can_publish | Banner uyarisi |
| UserCommentsPage | can_read_comments, can_reply_comments | Banner + reply composer guard |
| UserPlaylistsPage | can_read_playlists, can_write_playlists | Banner + buton disabled |
| UserPostsPage | can_create_posts | Banner uyarisi |

### 4. Admin-Side Connection Context Links
- AdminCommentMonitoringPage → "Baglanti Durumu" link
- AdminPlaylistMonitoringPage → "Baglanti Durumu" link
- AdminPostMonitoringPage → "Baglanti Durumu" link
- Her biri /admin/connections sayfasina yonlendirir

## Test Sonuclari

### Backend (9/9 passed)
1. test_publish_guard_blocked_by_token — PASSED
2. test_comments_read_guard_blocked_by_scope — PASSED
3. test_comments_reply_guard_blocked_by_scope — PASSED
4. test_playlists_read_guard_blocked_by_connection — PASSED
5. test_playlists_write_guard_blocked_by_scope — PASSED
6. test_posts_create_guard_unsupported — PASSED
7. test_healthy_connection_all_supported — PASSED
8. test_capability_endpoint_returns_matrix — PASSED
9. test_health_endpoint_reflects_issues — PASSED

### Frontend
- tsc --noEmit: PASSED (sifir hata)
- vite build: PASSED (2.81s)

## Degisen Dosyalar

### Yeni
- `frontend/src/hooks/useChannelConnection.ts`
- `backend/tests/test_faz17a_capability_guard.py`
- `docs_drafts/faz17a_capability_guard_closure_report_tr.md`

### Degistirilen
- `frontend/src/components/connections/ConnectionCapabilityWarning.tsx` (3 mod eklendi)
- `frontend/src/pages/user/UserPublishPage.tsx` (capability banner)
- `frontend/src/pages/user/UserCommentsPage.tsx` (banner + reply guard)
- `frontend/src/pages/user/UserPlaylistsPage.tsx` (banner + buton guard)
- `frontend/src/pages/user/UserPostsPage.tsx` (capability banner)
- `frontend/src/pages/admin/AdminCommentMonitoringPage.tsx` (connection link)
- `frontend/src/pages/admin/AdminPlaylistMonitoringPage.tsx` (connection link)
- `frontend/src/pages/admin/AdminPostMonitoringPage.tsx` (connection link)

## Bilinen Limitasyonlar
- Capability durumu sadece PlatformConnection'in mevcut scope/token/status'una gore hesaplaniyor; platform API rate limit veya gecici hatalar yansitilmiyor.
- Admin monitoring sayfalari icerik bazli capability uyarisi gostermiyor (sadece context link). Ileride connection-level inline warning eklenebilir.

## Ertelenenler
- Admin monitoring sayfalarinda per-row capability status gosterimi (gelecek iterasyon)
- Capability warning dismiss/snooze mekanizmasi
