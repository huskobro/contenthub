# Faz 14 — Icerik Takvimi + Scheduling Surface Raporu

## Executive Summary

Faz 14, ContentProject (deadline_at), PublishRecord (scheduled_at/published_at) ve PlatformPost (scheduled_for/posted_at) verilerini birlestiren unified takvim gorunumunu kurdu. Backend'de aggregation service + REST endpoint, frontend'de hafta/ay gorunumlu takvim sayfasi, kanal/tip filtresi, detay paneli ve admin global gorunumu olusturuldu.

## Scheduling Audit Sonucu

| Model | Tarih Alanlari | Takvim Uygunlugu |
|-------|---------------|------------------|
| ContentProject | deadline_at | Proje deadline olaylar |
| PublishRecord | scheduled_at, published_at | Planli/gerceklesen yayin olaylari |
| PlatformPost | scheduled_for, posted_at | Planli/gerceklesen post olaylari |

## Calendar Domain Modeli

### CalendarEvent (Unified Shape)
```
id, event_type, title, channel_profile_id, owner_user_id
related_project_id, related_publish_record_id, related_post_id
start_at, end_at, status, platform, module_type
action_url, meta_summary, is_overdue
```

3 event_type:
- `content_project`: ContentProject.deadline_at kaynak
- `publish_record`: PublishRecord.scheduled_at veya published_at kaynak
- `platform_post`: PlatformPost.scheduled_for veya posted_at kaynak

### Aggregation Service
- `get_calendar_events()`: Ana aggregation fonksiyonu
- `_collect_project_events()`: ContentProject deadline olaylari
- `_collect_publish_events()`: PublishRecord scheduled/published olaylari
- `_collect_post_events()`: PlatformPost scheduled/posted olaylari
- Her kaynak icin limit 200
- Sonuclar start_at'e gore sirali
- `_safe_lt()`: SQLite naive datetime + UTC aware datetime guvenli karsilastirma

### Overdue Mantigi
- ContentProject: deadline_at < now VE status completed/archived degil
- PublishRecord: scheduled_at < now VE status scheduled/approved
- PlatformPost: scheduled_for < now VE status draft/queued

## User Calendar — `/user/calendar`

- Hafta / Ay gorunum toggle
- Ileri/geri navigasyon + Bugun butonu
- Kanal filtresi (dropdown)
- Tip filtresi (Proje / Yayin / Post)
- Renk kodlu legenda
- Ay gorunumu: 7-kolonlu grid, gun bazli etkinlikler, max 3 gorunen + "+N daha"
- Hafta gorunumu: gun bazli liste, saat + tip badge
- Secili olay detay paneli: baslangic/bitis, durum, platform, modul, ozet, navigasyon linkleri
- Gecikme (overdue) vurgusu

## Admin Calendar — `/admin/calendar`

- `UserCalendarPage isAdmin` wrapper
- Admin gorunumde tum kullanicilarin olaylari
- owner_user_id filtresi kaldirilir

## REST Endpoint

```
GET /api/v1/calendar/events
  ?start_date=ISO&end_date=ISO
  &owner_user_id=...
  &channel_profile_id=...
  &platform=...
  &event_type=content_project|publish_record|platform_post
```

## Degisen Dosyalar

### Backend — Yeni
| Dosya | Aciklama |
|-------|----------|
| `app/calendar/__init__.py` | Bos modul init |
| `app/calendar/schemas.py` | CalendarEvent Pydantic model |
| `app/calendar/service.py` | Aggregation service (3 kaynak + overdue + safe datetime) |
| `app/calendar/router.py` | GET /calendar/events endpoint |
| `tests/test_faz14_calendar.py` | 11 test |

### Backend — Degisen
| Dosya | Degisiklik |
|-------|-----------|
| `app/api/router.py` | +calendar_router import ve include |

### Frontend — Yeni
| Dosya | Aciklama |
|-------|----------|
| `src/api/calendarApi.ts` | CalendarEvent tipi + fetchCalendarEvents API |
| `src/pages/user/UserCalendarPage.tsx` | User takvim sayfasi (ay/hafta grid + detay paneli) |
| `src/pages/admin/AdminCalendarPage.tsx` | Admin takvim wrapper |

### Frontend — Degisen
| Dosya | Degisiklik |
|-------|-----------|
| `src/app/router.tsx` | +2 lazy import (UserCalendarPage, AdminCalendarPage), +2 route (/user/calendar, /admin/calendar) |

## Test Sonuclari

| Dosya | Test Sayisi | Sonuc |
|-------|-------------|-------|
| `tests/test_faz14_calendar.py` | 11 | 11/11 PASSED |

Test listesi:
1. Calendar events endpoint returns empty list for no data
2. ContentProject deadline events appear in calendar
3. PublishRecord scheduled events appear in calendar
4. PlatformPost scheduled events appear in calendar
5. Date range filtering works (out-of-range excluded)
6. Channel filter works
7. Event type filter works
8. Overdue flag set for past-deadline projects
9. Events sorted by start_at
10. Owner user filter works
11. Mixed event sources aggregated correctly

## TypeScript / Build

- `npx tsc --noEmit`: Hatasiz
- `npx vite build`: Basarili

## Kalan Limitasyonlar

1. **Drag-and-drop zamanlama yok**: Takvim read-only; etkinlik surukleyerek zamanlama bu fazda yok.
2. **Gunluk gorunum yok**: Sadece hafta ve ay gorunumleri mevcut.
3. **AutomationPolicy publish_windows gorunumu yok**: publish_windows_json alani var ama takvimde gorunmuyor. Future-safe alan olarak bekliyor.
4. **max_daily_posts gosterimi yok**: Takvimde gunluk yayin limiti gorsel olarak yansitilmiyor.
5. **Inbox-calendar entegrasyonu**: Overdue etkinliklerden inbox item olusturma hook'u bu fazda yok.
6. **SSE ile canli guncelleme yok**: Takvim React Query polling/invalidation ile calisir, SSE push yok.
7. **Platform filtresi sadece PublishRecord ve PlatformPost icin etkili**: ContentProject platform bilgisi (primary_platform) takvim filtresine baglanmadi.

## Onceki Bilinen Test Sorunlari

- `test_m7_c1_migration_fresh_db`: Alembic modul yolu (Python 3.9)
- `test_create_rss_source`: 422 sema uyumsuzlugu
