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

### User sayfalar (tam)
- ✅ `/user` — Anasayfa (Atrium editorial dashboard)
- ✅ `/user/projects` — Projelerim (Atrium editorial list)
- ✅ `/user/calendar` — Yayın takvimi (week/month)
- ✅ `/user/analytics` — Analitiğim (shell seviyesinde tam)

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
- **`/user/channels/:channelId`** — Canvas'ta zengin, diğer surface'larda stub
- **`/user/projects/:projectId`** — Proje detay + job bağlantısı + publish linkage
- **`/user/create/video`** — Standard Video wizard
- **`/user/create/bulletin`** — Bulletin wizard
- **`/user/publish`** — User publish wizard + history
- **`/user/settings`** — Surface picker çalışıyor, ASCII-only Türkçe pürüzü var (`Ayarlarim`, `Arayuz Yuzeyleri`, `Aktif Et`, `Varsayilana don`) — polish seviyesi

---

## Partial (iskelet var, tüm akışlar tam değil)

### Admin
- **`/admin/wizard-settings`** — Wizard step governance v1, tüm wizard'lara yayılmamış
- **`/admin/library`** — İçerik kütüphanesi liste ve filtre var, derin operasyonel aksiyonlar eksik
- **`/admin/assets`** — Asset registry iskelet
- **`/admin/standard-videos`** — Modül liste partial
- **`/admin/standard-videos/wizard`** — Admin-side wizard partial
- **`/admin/template-style-links`** — Template ↔ blueprint binding iskelet
- **`/admin/analytics`** — Platform Overview partial (M34 backend bekliyor)
- **`/admin/analytics/youtube`** — Partial
- **`/admin/analytics/channel-performance`** — Partial

### User
- **`/user/content`** — Tüm içerik birleşik görünümü partial
- **`/user/analytics/channels`** — User channel analytics partial

---

## Shell / placeholder (iskelet var, içerik yok)

### Admin
- **`/admin/comments`** — Yorum izleme shell
- **`/admin/playlists`** — Playlist izleme shell
- **`/admin/posts`** — Gönderi izleme shell

### User
- **`/user/comments`** — User yorumlar shell
- **`/user/playlists`** — User playlist'ler shell
- **`/user/posts`** — User post'lar shell

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
- Semantic dedupe (news) — planlı
- Preview analytics — planlı
- Multi-language narration optimization — planlı
- Advanced retry strategies — planlı
- Scheduled publish cron polling optimizasyonu — partial

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
| 34 | Analytics backend | ⏸ sırada |
| 35 | Platform Overview + Ops Analytics | ⏸ sırada |
| 36 | Platform Detail + Content Analytics | ⏸ sırada |
| 37 | Future module expansion | ⏸ sırada |
| 38 | Hardening | ⏸ sırada |
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
