# Faz 16 — Notification Center + Inbox/Calendar Operational Awareness

**Tarih:** 2026-04-09
**Durum:** ✅ Tamamlandı — 11/11 test geçti

---

## 1. Executive Summary

Faz 16, ContentHub'a backend-backed Notification Center ekleyerek domain olaylarını (publish failure, render failure, scan error, review required) kullanıcı ve admin'e gerçek zamanlı bildirim olarak sunuyor. Inbox'tan farklı olarak notification = dikkat çekme, inbox = action queue. SSE ile gerçek zamanlı iletim, duplicate guard ile gürültü kontrolü, ve inbox/calendar/notification arası çapraz referans sağlandı.

## 2. Notification Audit Sonucu (Faz A)

**Önceki durum:**
- NotificationBell + NotificationCenter: ✅ gerçek (localStorage-backed)
- SSE altyapısı: ✅ gerçek (EventBus singleton + global endpoint)
- useGlobalSSE: yalnızca `job:status_changed` ve `job:step_changed` dinliyor
- Backend'de ayrı Notification modeli: ❌ yok (sadece OperationsInboxItem)
- Admin/user notification ayrımı: ❌ yok
- Inbox olaylarından notification: ❌ yok

**Sonraki durum:**
- Tüm yukarıdakiler ✅

## 3. Notification Domain Modeli (Faz B)

**Yeni tablo: `notification_items`**

| Alan | Tip | Açıklama |
|------|-----|----------|
| id | String(36) PK | UUID |
| owner_user_id | FK → users | Nullable, indexed |
| scope_type | String(50) | user / admin / system |
| notification_type | String(100) | publish_review, render_failure vb. |
| title | String(500) | Bildirim başlığı |
| body | Text | Detay |
| severity | String(50) | info / warning / error / success |
| status | String(50) | unread / read / dismissed |
| related_entity_type | String(100) | Entity tipi (job, publish_record vb.) |
| related_entity_id | String(36) | Entity ID |
| related_inbox_item_id | FK → operations_inbox_items | Inbox cross-ref |
| related_channel_profile_id | FK → channel_profiles | Kanal bağlamı |
| action_url | String(500) | Detay sayfası URL |
| created_at | DateTime | Oluşturulma |
| read_at | DateTime | Okunma |
| dismissed_at | DateTime | Kapatılma |

Alembic migration: `faz16_notif_001`

## 4. Event → Notification Bridge (Faz C)

`_emit_notification_for_inbox()` fonksiyonu `emit_operation_event()` sonrasında otomatik çağrılır.

**Notification-worthy olaylar:**

| item_type | severity | scope | Açıklama |
|-----------|----------|-------|----------|
| publish_review | warning | admin | Yayın onay bekliyor |
| publish_failure | error | admin | Yayın başarısız |
| render_failure | error | user | İş başarısız |
| source_scan_error | warning | admin | Tarama hatası |
| overdue_publish | warning | admin | Geciken yayın |
| policy_review_required | info | admin | Policy inceleme gerekli |

**Noise control:**
- `_NOTIFICATION_MAP` dışındaki item_type'lar notification üretmez
- Duplicate guard: aynı entity+type için unread notification varsa skip
- Priority → severity override: urgent/high priority → error severity

**SSE push:** Her notification oluşturulduğunda `notification:created` event'i SSE bus'tan yayınlanır.

## 5. User Notification Center (Faz D)

**Değişiklikler:**
- `notificationStore.ts`: localStorage yerine backend-synced Zustand store
- `useNotifications.ts`: React Query ile backend fetch + mutation helpers
- `NotificationCenter.tsx`: Backend actions (markRead, dismiss via API), inbox badge, footer "Tüm bildirimleri gör" linki
- `useGlobalSSE.ts`: `notification:created` event tipi eklendi — SSE'den gelen notification'lar anında store'a eklenir
- Layout'larda `useNotifications()` hook'u çağrılır

**UX:**
- Bell icon gerçek unread count gösterir
- Panel'de inbox cross-ref badge'i (turuncu "Inbox" etiketi)
- Click → action_url'ye navigate
- Read/dismiss backend'e persist edilir

## 6. Admin Notification Görünümü (Faz E)

**Yeni sayfa:** `/admin/notifications` — `AdminNotificationsPage.tsx`

**Özellikler:**
- Filtreleme: durum (unread/read/dismissed), severity (error/warning/info), type
- Bulk "Tümünü Okundu İşaretle" butonu
- Her satırda: severity dot, type badge, zaman, inbox link, detay link
- Hover'da read/dismiss butonları
- Unread count header'da

## 7. Inbox/Calendar/Notification Bağlantıları (Faz F)

| Kaynak → Hedef | Bağlantı |
|----------------|----------|
| Notification → Inbox | `related_inbox_item_id` FK + "Inbox →" link |
| Notification → Entity | `action_url` → detay sayfası |
| Inbox → Calendar | Faz 14a `_enrich_inbox_relations()` (mevcut) |
| Calendar → Inbox | Faz 14a inbox badge + detail panel (mevcut) |
| Notification → Calendar | `related_entity_type/id` aracılığıyla |
| Entity → Notifications | `GET /notifications/by-entity/{type}/{id}` endpoint |

## 8. Değişen Dosyalar

### Yeni Dosyalar
| Dosya | Açıklama |
|-------|----------|
| `backend/app/notifications/__init__.py` | Module init |
| `backend/app/notifications/schemas.py` | Pydantic schemas |
| `backend/app/notifications/service.py` | CRUD + duplicate guard |
| `backend/app/notifications/router.py` | REST endpoints |
| `backend/alembic/versions/faz16_notification_items.py` | Migration |
| `backend/tests/test_faz16_notifications.py` | 11 test |
| `frontend/src/api/notificationApi.ts` | API client |
| `frontend/src/hooks/useNotifications.ts` | React Query hook |
| `frontend/src/pages/admin/AdminNotificationsPage.tsx` | Admin page |

### Değiştirilen Dosyalar
| Dosya | Değişiklik |
|-------|-----------|
| `backend/app/db/models.py` | +NotificationItem model |
| `backend/app/automation/event_hooks.py` | +notification bridge, +SSE push, +flush before notification |
| `backend/app/api/router.py` | +notifications_router |
| `frontend/src/stores/notificationStore.ts` | Backend-synced, +backendId, +relatedInboxItemId, dedupe |
| `frontend/src/hooks/useGlobalSSE.ts` | +notification:created event handler |
| `frontend/src/components/design-system/NotificationCenter.tsx` | Backend actions, inbox badge, footer link |
| `frontend/src/app/layouts/AdminLayout.tsx` | +useNotifications() |
| `frontend/src/app/layouts/UserLayout.tsx` | +useNotifications() |
| `frontend/src/app/router.tsx` | +AdminNotificationsPage route |

## 9. Test Sonuçları

```
Faz 16: 11 passed in 0.16s
Faz 15: 11 passed in 0.17s (regresyon yok)
tsc --noEmit: ✅ temiz
vite build: ✅ başarılı (2.81s)
```

| # | Test | Sonuç |
|---|------|-------|
| 1 | Notification model create via service | ✅ |
| 2 | Event → notification creation (publish_failure) | ✅ |
| 3 | Duplicate notification guard | ✅ |
| 4 | User notification center list endpoint | ✅ |
| 5 | Unread count endpoint | ✅ |
| 6 | Read/dismiss action | ✅ |
| 7 | Inbox link — related_inbox_item_id | ✅ |
| 8 | Entity refs — correct type/ID/action_url | ✅ |
| 9 | Admin scope filter | ✅ |
| 10 | Mark-all-read | ✅ |
| 11 | By-entity lookup | ✅ |

## 10. Kalan Limitasyonlar

- **Overdue detection**: Henüz otomatik overdue publish/post kontrolü yok — gelecekte cron/scheduler ile `overdue_publish` notification üretilebilir
- **SSE reconnection notification refetch**: SSE kesilip reconnect olduğunda kaçırılan notification'lar polling ile yakalanır (30s interval)
- **User/admin ayrımı UI tarafında**: Frontend'de scope_type filtrelemesi henüz tam yapılmıyor (admin sayfası tüm bildirimleri gösteriyor)
- **Notification preferences/mute**: Kullanıcı bazlı bildirim tercihleri (mute, kanal bazlı filtre) gelecek faz
- **Push notification (browser)**: Service worker bazlı push notification henüz yok — sadece in-app SSE
