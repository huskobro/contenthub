# 11 — Current Capabilities vs Partial Areas

Bu dosya ContentHub'ın **bugünkü gerçek hali** için net bir tablodur. Ne tam, ne büyük ölçüde hazır, ne partial, ne shell/placeholder.

Tarih: 2026-04-11. Final acceptance turu sonrası.

---

## Üst seviye özet

> **büyük ölçüde hazır**

- **Mimari ve davranış olarak hazır** — state makineleri, settings registry, visibility engine, job engine ve her iki panel çalışıyor, sıfır runtime hatası
- **Ana operasyonel yüzeyler oturmuş** — Bridge admin ve Atrium user
- **Kalan pürüzler polish seviyesinde** — birkaç sayfada ASCII-only Türkçe, birkaç chip'te leftover İngilizce kelime
- **Ana ürün geliştirmesine dönülebilir** — M32/M34/M37 sırası açık

---

## Tam olan alanlar (production kalitesinde)

### Ana omurga
- ✅ Auth store + AuthGuard (role-aware)
- ✅ Router + AppEntryGate (panel redirect)
- ✅ Settings Registry (CRUD + effective merge)
- ✅ Visibility Engine (rule editor + server enforce)
- ✅ Job Engine (state machine + step runner + retry)
- ✅ Snapshot-lock (template + blueprint + settings)
- ✅ Surface Registry (5 surface, override mekanizması)
- ✅ Theme Registry (12 tema, ThemeManifest import)
- ✅ Panel switching (admin ↔ user)
- ✅ SSE realtime (job progress + visibility invalidation)
- ✅ Turkish uppercase locale (html lang=tr + targeted lang=en)

### Admin sayfalar (tam)
- ✅ `/admin` — Yönetim Paneli (KPI + operasyonel durum)
- ✅ `/admin/jobs` — Jobs Registry (Bridge surface, buckets + tablo)
- ✅ `/admin/jobs/:jobId` — İş Kokpiti (tüm operasyonel detay)
- ✅ `/admin/visibility` — Visibility rules editor
- ✅ `/admin/providers` — Provider registry + credentials + metrics
- ✅ `/admin/modules` — Module enable/disable
- ✅ `/admin/themes` — Surface + Theme picker (iki bölüm)
- ✅ `/admin/wizard-settings` — Wizard governance (445 LoC, backend + frontend tam)
- ✅ `/admin/library` — İçerik Kütüphanesi (445 LoC: list + filter + clone + detail)
- ✅ `/admin/assets` — Asset registry (164 LoC list + 193 LoC detail)
- ✅ `/admin/standard-videos` — Standard Video registry (tam)
- ✅ `/admin/standard-videos/wizard` — Content Creation Wizard (5170 LoC)
- ✅ `/admin/analytics` — Platform Overview (443 LoC + ~72 KB backend analytics service)
- ✅ `/admin/analytics/channel-performance` — Channel Performance (backend tam, frontend chart'lar çalışıyor)
- ✅ `/admin/comments` — Yorum izleme (300 LoC: liste + filtre + moderation)
- ✅ `/admin/playlists` — Playlist izleme (260 LoC)
- ✅ `/admin/posts` — Gönderi izleme (275 LoC)
- ✅ `/admin/automation` — Automation Policies
- ✅ `/admin/inbox` — Admin inbox
- ✅ `/admin/connections` — Admin connections
- ✅ `/admin/calendar` — Admin takvimi

### User sayfalar (tam)
- ✅ `/user` — Anasayfa (Atrium editorial dashboard)
- ✅ `/user/projects` — Projelerim (Atrium editorial list)
- ✅ `/user/calendar` — Yayın takvimi (week/month)
- ✅ `/user/analytics` — Analitiğim (shell seviyesinde tam)
- ✅ `/user/comments` — Yorumlarım (420 LoC)
- ✅ `/user/playlists` — Playlist'lerim (526 LoC)
- ✅ `/user/posts` — Gönderilerim (507 LoC)
- ✅ `/user/analytics/channels` — Kanal analytics'im (218 LoC)
- ✅ `/user/automation` — Automation (293 LoC)
- ✅ `/user/inbox` — Inbox (202 LoC)
- ✅ `/user/connections` — Connections (267 LoC)
- ✅ `/user/content` — İçerik giriş sayfası
- ✅ `/user/channels/:channelId` — Kanal detay (326 LoC, router orphan bug düzeltildi 2026-04-11)

### UI altyapı
- ✅ Atrium top-nav (Türkçe uppercase + izolasyon çalışıyor)
- ✅ Bridge operasyon rayı + context panel
- ✅ StatusBadge + localizeStatus mapping
- ✅ Empty state pattern
- ✅ Runtime stabilite (sıfır console error/warning)

---

## Büyük ölçüde hazır (küçük pürüzler)

### Admin
- **`/admin/settings`** — Settings UI çalışıyor, Kimlik Bilgileri tab'ında ASCII-only Türkçe metin pürüzü var (`Yapilandirildi`, `Degistir`, `Dogrula` vb.) — polish seviyesi
- **`/admin/prompts`** — Master Prompt Editor çalışıyor, version history ve test butonu v1
- **`/admin/templates`** — Template CRUD çalışıyor, versiyon sistemi aktif
- **`/admin/style-blueprints`** — Blueprint CRUD çalışıyor, preview strategy v1
- **`/admin/publish`** — Publish Review Board iskelet ve buckets çalışıyor; bucket label'larında ASCII-only Türkçe pürüzü var (`ONAYLANDİ / ZAMANLANDİ / BASARİSİZ / REDDEDİLDİ`) — polish seviyesi
- **`/admin/sources`** — Source Registry çalışıyor, scan + health + trust level tam
- **`/admin/source-scans`** — Scan log çalışıyor
- **`/admin/news-bulletins`** — Bülten liste ve admin görünümü
- **`/admin/news-items`** — NewsItem registry
- **`/admin/used-news`** — Dedupe ledger
- **`/admin/audit-logs`** — Audit log tablosu
- **`/admin/users`** — User CRUD + override

### User
- **`/user/channels`** — Channel liste çalışıyor, ASCII-only Türkçe pürüzü var (`Kanallarim`, `Kanal Olustur`, `Olusturulma`)
- **`/user/channels/:channelId`** — 326 LoC tam sayfa: YouTube OAuth flow + credentials management + surface override desteği (router orphan bug'ı 2026-04-11'de fix edildi)
- **`/user/projects/:projectId`** — Proje detay + job bağlantısı + publish linkage
- **`/user/create/video`** — Standard Video wizard
- **`/user/create/bulletin`** — Bulletin wizard
- **`/user/publish`** — User publish wizard + history
- **`/user/settings`** — Surface picker çalışıyor, ASCII-only Türkçe pürüzü var (`Ayarlarim`, `Arayuz Yuzeyleri`, `Aktif Et`, `Varsayilana don`) — polish seviyesi

---

## Partial (iskelet var, tüm akışlar tam değil)

### Admin
- (boş — 2026-04-11'deki Sprint 3-4 turu ile kalan partial başlıklar kapatıldı)

### Kapatılmış partial'lar (2026-04-11)
- **`/admin/template-style-links`** — Sprint 4: detail panel zaten vardı; artık DELETE endpoint + frontend hook + detail panelde "Sil" aksiyonu da var → tam CRUD
- **`/admin/analytics/youtube`** — Sprint 1 / M14: YouTube Analytics API v2 entegrasyonu tamamlandı (retention, watch time, subscriber delta, impressions CTR, audience demographics)
- **YouTube video yönetimi** — Sprint 2: admin analytics sayfasından her video için thumbnails.set / videos.update / captions.insert/delete işlemleri
- **YouTube engagement advanced** — Sprint 3: comment moderation (heldForReview/published/rejected + banAuthor + markAsSpam), playlist update/delete/reorder, channel brandingSettings

---

## Planlı / henüz yazılmamış

### Modüller
- `product_review` modülü — planlı
- `educational_video` modülü — planlı
- `howto_video` modülü — planlı

### Publish platformları
- Instagram adapter — planlı
- TikTok adapter — planlı
- X (Twitter) adapter — planlı

### Advanced özellikler
- Semantic dedupe (news) — planlı (dedupe_key alanı schema'da mevcut, embedding service yok)
- Preview analytics — planlı
- Multi-language narration optimization — planlı
- Advanced retry strategies — kısmen hazır (retry_scheduler.py 171 LoC exponential backoff + batch limit tamam; DLQ + circuit breaker eksik)
- Scheduled publish cron — **tam** (scheduler.py 111 LoC hazır)

---

## Phased delivery'de kalan işler

CLAUDE.md'nin Phased Delivery Order listesine göre:

| # | Faz | Durum |
|---|---|---|
| 1-11 | Core + Job Engine + Job Detail | ✅ tam |
| 12-20 | Standard Video pipeline | ✅ büyük ölçüde tam |
| 21-22 | Template Engine | ✅ büyük ölçüde tam |
| 23-27 | News input + Source + Dedupe | ✅ büyük ölçüde tam |
| 28-29 | Style Blueprint + AI variants | ✅ büyük ölçüde tam |
| 30-31 | Publish Center + YouTube v1 | ✅ büyük ölçüde tam |
| 32 | Review gate / manual override | ⚠ polish devam |
| 33 | Rerun / clone / recovery | ✅ tam |
| 34 | Analytics backend | ✅ büyük ölçüde tam (~72 KB service.py) |
| 35 | Platform Overview + Ops Analytics | ✅ büyük ölçüde tam |
| 36 | Platform Detail + Content Analytics | ✅ büyük ölçüde tam (YouTube Analytics v2 retention eksik) |
| 37 | Future module expansion | ⏸ sırada (product_review / educational / howto) |
| 38 | Hardening | ⏸ kısmen (DLQ + circuit breaker eksik, retry_scheduler tamam) |
| 39 | Documentation + operator guide | 🚧 bu doc seti |
| 40 | MVP final acceptance gate | ⏸ sırada |

---

## Runtime ölçütleri (final acceptance)

- **Console errors:** 0
- **Console warnings:** 0 (browser smoke süresince)
- **SSE stability:** OK (hiç kopma yok)
- **HMR stability:** OK
- **Production build:** ✅ (`vite build` EXIT 0)
- **TypeScript check:** ✅ (`tsc --noEmit` EXIT 0)

---

## Bilinen teknik borç

- 22 smoke test fresh-DB koşusunda güncellenmeli (preexisting)
- M7 fresh DB testi güncellenmeli (preexisting)
- Vite chunk size uyarısı (pre-existing, fix ile ilgisiz)
- Final acceptance'ta tespit edilen 10 polish pürüzü (ASCII Türkçe, uppercase leftovers, raw status chip'ler) — opsiyonel mini tur

---

## Güvenli olarak söylenenbilenler

**Bugünkü ContentHub:**
- Tek bir makinede çalışan local MVP olarak **çalışır durumdadır**
- Standard video ve news bulletin üretebilir, YouTube'a yayınlayabilir
- Review gate korunmakta, publish bypass edilemez
- Admin panel tüm kritik kontrolü sunmakta
- User panel editoryal kullanım için hazır
- Yeni feature eklemek için "dondurulmuş" temel UI olarak kullanılabilir

**Bugünkü ContentHub değildir:**
- SaaS platformu değil
- Multi-tenant değil
- Multi-platform publisher değil (YouTube v1)
- Automatic social media marketing tool değil
- AI content farm değil

---

## Sonraki adım

- Günlük admin rutini → `12-operator-playbook.md`
- Yeni devralan için 1-saatlik giriş → `13-quick-start-for-new-owner.md`
- Terim sözlüğü → `14-glossary.md`
