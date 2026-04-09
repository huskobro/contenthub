# Faz 14a — Calendar ↔ Policy/Inbox Closure Raporu

## Executive Summary

Faz 14a, Faz 13 (AutomationPolicy + Operations Inbox) ile Faz 14 (Content Calendar) arasindaki kritik baglari kapatti. Takvim artik policy-aware bir scheduling yuzeyi: secili kanal icin publish modu, max_daily_posts, publish_windows_json gorunur. Calendar event'ler ile inbox item'lar arasinda cross-reference kuruldu. ContentProject'ler platform filtresine primary_platform uzerinden baglandi. Detay paneli policy context, inbox relation, kanal adi ve daha anlamli overdue aciklamalari iceriyor.

## Gap Audit Sonucu

| Konu | Onceki Durum | Sonrasi |
|------|-------------|---------|
| `publish_windows_json` | Dead column — hic parse/display yok | Parse edilir, okunur ozet halinde gosterilir |
| `max_daily_posts` | UserAutomationPage'de var, takvimde yok | Policy summary bar + detay panelinde gorunur |
| ContentProject platform filtresi | Platform param sadece Publish/Post'a uygulanir | `primary_platform` uzerinden filtrelenir |
| Inbox ↔ Calendar link | Yok | Event'ler inbox item'larla cross-referenced |
| Detay paneli | Minimal (status/platform/modul) | Policy, inbox, kanal adi, overdue aciklamasi |
| Overdue → inbox | Yok | Mevcut inbox item varsa gosterilir (oto-olusturma yok) |

## Policy Visibility Nasil Eklendi (Faz B)

### Backend: `GET /calendar/channel-context/{channel_profile_id}`
- Yeni `ChannelCalendarContext` schema: channel_name, policy_id, policy_enabled, publish_mode, max_daily_posts, publish_windows_json, publish_windows_display, checkpoint_summary, open_inbox_count
- `_parse_publish_windows()`: JSON'u okunur Turkce ozete donusturur (orn: "Pzt-Cum 09:00-18:00")
- Checkpoint summary: "2 otomatik · 1 onay · 2 devre disi" formati

### Frontend: PolicySummaryBar
- Kanal secildiginde takvim ustunde gorunur
- Gosterilen bilgiler: kanal adi, politika durumu, yayin modu (renk kodlu), gunluk maks, yayin penceresi, checkpoint ozeti, acik inbox sayisi
- "Politika karar verir, otomatik calistirma aktif degil" notu — executor yoklugunun durustce aciklanmasi
- Admin ve user ayni bar'i gorur

## Calendar ↔ Inbox Baglantisi Nasil Kuruldu (Faz C)

### Backend: `_enrich_inbox_relations()`
- Calendar event'ler toplandiktan sonra, entity_type/entity_id uzerinden OperationsInboxItem tablosu sorgulanir
- Sadece open/acknowledged durumundaki inbox item'lar eslenir (resolved olanlar yok sayilir)
- Eslesen event'lere `inbox_item_id` ve `inbox_item_status` atanir

### Frontend: Inbox gosterimi
- Month grid: inbox bagli event'lerde turuncu dot indicator
- Week list: "inbox" badge
- Detay paneli: Inbox relation kutusu (durum + "Git" linki)
- Header: inbox-bagli event sayaci
- Legenda: "Inbox Bagli" maddesi eklendi

## ContentProject Platform Filtresi Nasil Kapandi (Faz D)

- `ContentProject.primary_platform` alani zaten model'de mevcuttu (String(50), nullable)
- `_collect_project_events()` guncellendi: `platform` filtresi artik `ContentProject.primary_platform == platform` kosulunu uyguluyor
- Event response'a `primary_platform` alani eklendi
- Platform filtresi artik 3 kaynakta da tutarli: PublishRecord.platform, PlatformPost.platform, ContentProject.primary_platform
- `primary_platform` null olan projeler, platform filtresi uygulandiginda donmez — bu beklenen davranis

## Detail Panel Nasil Gelisti (Faz E)

Onceki durum: status, platform, modul, meta_summary, baglanti linkleri

Eklenenler:
1. **Kanal adi** — channelNameMap'ten resolve edilir
2. **Inbox relation kutusu** — inbox_item_id varsa, durum + Git linki
3. **Overdue aciklamasi** — "planlanan tarih gecti ve islem tamamlanmadi"
4. **Policy context bolumu** — politika durumu, yayin modu, gunluk maks, yayin penceresi, checkpoint ozeti
5. **Enforcement notu** — "Politika karar verir, otomatik calistirma aktif degil"
6. **Kanal profili linki** — channel_profile_id varsa "Kanal Profili" linki
7. **Inbox ogesi linki** — inbox_item_id varsa "Inbox Ogesi" linki
8. Panel genisligi 72 → 80 (w-80), scrollable (max-h overflow-y-auto)

## Admin / User UX Tutarliligi (Faz F)

- Admin: `isAdmin` prop ile policy summary bar ve detay panelinde admin inbox linkleri
- User: kendi kanallarinin policy context'i, kendi inbox linkleri
- Renk semantigi tutarli: success-dark (aktif/otomatik), warning-dark (onay/inbox), error-dark (gecikme), neutral-400 (devre disi)
- Hardcoded renk yok — tum renkler semantic token'lar

## Degisen Dosyalar

### Backend — Degisen
| Dosya | Degisiklik |
|-------|-----------|
| `app/calendar/schemas.py` | +CalendarEvent.primary_platform, inbox_item_id, inbox_item_status alanlari. +ChannelCalendarContext yeni schema. |
| `app/calendar/service.py` | +_parse_publish_windows(), +_enrich_inbox_relations(), +get_channel_calendar_context(). _collect_project_events platform filtresi + primary_platform. |
| `app/calendar/router.py` | +GET /calendar/channel-context/{id} endpoint |

### Frontend — Degisen
| Dosya | Degisiklik |
|-------|-----------|
| `src/api/calendarApi.ts` | +ChannelCalendarContext tipi, +primary_platform/inbox alanlari, +fetchChannelCalendarContext |
| `src/pages/user/UserCalendarPage.tsx` | +PolicySummaryBar, +channelContext query, +inbox indicators (month/week/header), +upgraded EventDetailPanel (policy/inbox/channel/overdue context) |

### Test — Degisen
| Dosya | Degisiklik |
|-------|-----------|
| `tests/test_faz14_calendar.py` | +10 yeni test (12-21), _create_project'e primary_platform param |

## Test Sonuclari

| Dosya | Test Sayisi | Sonuc |
|-------|-------------|-------|
| `tests/test_faz14_calendar.py` | 21 | 21/21 PASSED |

Faz 14a testleri:
12. Channel context policy summary — policy bilgileri doner
13. publish_windows_json parse + display — okunur ozet
14. max_daily_posts display — context'te gorunur
15. Calendar ↔ inbox relation — inbox_item_id enrichment
16. Overdue event detail fields — tum alanlar mevcut
17. ContentProject platform filter — primary_platform filtreleme
18. Detail upgraded fields — primary_platform, inbox_item_id, inbox_item_status
19. Admin/user scope — kanal bazli context izolasyonu
20. Channel context no policy — varsayilan degerler
21. Inbox crossref only open — resolved item'lar eslenmez

## TypeScript / Build

- `npx tsc --noEmit`: Hatasiz
- `npx vite build`: Basarili

## Kalan Limitasyonlar

1. **Otomatik inbox olusturma yok**: Overdue event'ler icin otomatik inbox item olusturma hook'u bu fazda eklenmedi. Mevcut inbox item varsa gosterilir, yoksa gosterilmez.
2. **Policy enforcement yok**: Policy karar verir ama otomatik calistirma (executor) yok. Bu durustce UI'da belirtilir.
3. **publish_windows_json enforcer yok**: Yayin penceresi parse edilir ve gosterilir ama takvimde "bu saatte yayin yapma" gibi bir enforcement/uyari yok.
4. **max_daily_posts sayaci yok**: Gunluk limit gosterilir ama belirli bir gunde kac yayin planlandiginin karsilastirmasi yapilmiyor.
5. **Drag-and-drop zamanlama yok**: Takvim read-only; surukle-birak ile zamanlama yok.
6. **SSE ile canli guncelleme yok**: React Query invalidation ile calisir.
7. **platform_rules_json**: Bu alan hala dead column — YouTube-specifik kural seti tanimlanmadi.

## Onceki Bilinen Test Sorunlari

- `test_m7_c1_migration_fresh_db`: Alembic modul yolu (Python 3.9)
- `test_create_rss_source`: 422 sema uyumsuzlugu
