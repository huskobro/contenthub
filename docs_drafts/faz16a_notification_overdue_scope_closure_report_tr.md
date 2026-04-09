# Faz 16a — Notification Overdue + Scope Closure Raporu

**Tarih:** 2026-04-09
**Durum:** Tamamlandi

## Ozet

Faz 16'dan kalan iki kritik acik kapatildi:
1. Overdue publish/post durumlari icin otomatik notification uretimi
2. User/admin notification scope ayrimi (UI + backend)

## Yapilan Degisiklikler

### A. Overdue Scheduler (`backend/app/notifications/overdue_scheduler.py`)
- `poll_overdue_notifications()`: asyncio infinite loop, 5dk aralikla kontrol
- `_check_overdue_publishes()`: PublishRecord (status=scheduled/approved, scheduled_at < now) tespit → emit
- `_check_overdue_posts()`: PlatformPost (status=draft/queued, scheduled_for < now) tespit → emit
- Batch limit: 20 kayit/tur
- Duplicate guard: `emit_operation_event` icindeki `_find_open_duplicate` + notification `_find_unread_duplicate`
- `main.py` startup'a kayitli

### B. Notification Map Guncellemesi (`event_hooks.py`)
- `overdue_post` eklendi: `("warning", "admin", "Geciken post")`
- Priority override: `priority="high"` → severity `"error"` (overdue publish icin)

### C. Scope Closure — Backend
- `GET /notifications/my`: User'a ozel, X-ContentHub-User-Id + scope_type=user filtreli
- `GET /notifications/count?mode=my`: User scope'lu unread sayaci
- `GET /notifications/by-entity/{type}/{id}`: Entity bazli notification sorgusu

### D. Scope Closure — Frontend
- `fetchMyNotifications()` eklendi (notificationApi.ts)
- `useNotifications({ mode })`: "user" → /my endpoint, "admin" → /notifications
- `AdminLayout`: `useNotifications({ mode: "admin" })`
- `UserLayout`: `useNotifications({ mode: "user" })`
- `NotificationCenter`: `location.pathname` ile scope tespiti

### E. Noise Control
- Inbox duplicate guard: `_find_open_duplicate` (open/in_progress durumda ayni entity)
- Notification duplicate guard: `_find_unread_duplicate` (unread durumda ayni entity+type)
- Sadece `_NOTIFICATION_MAP`'te tanimli tipler notification uretir

## Test Sonuclari

```
tests/test_faz16a_notification_closure.py — 8/8 PASSED

1. test_overdue_publish_notification        PASSED
2. test_overdue_post_notification           PASSED
3. test_overdue_duplicate_guard             PASSED
4. test_user_scope_my_endpoint              PASSED
5. test_admin_scope_list                    PASSED
6. test_unread_count_scope                  PASSED
7. test_overdue_creates_inbox_and_notification PASSED
8. test_noise_control_no_extra_notifications PASSED
```

- TypeScript: 0 hata
- Vite build: basarili

## Bilinen Limitasyonlar
- Overdue scheduler interval ayarlanabilir degil (settings registry'den cekilmiyor, sabit 300s)
- User identity X-ContentHub-User-Id header'a dayali (auth katmani sonraki fazda)
- Overdue tespit batch limiti hardcoded (20)
