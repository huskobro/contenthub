# 02 — Information Architecture

Bu dosya ContentHub'ın tam menü hiyerarşisini verir. Admin panel + user panel, her menü → alt menü → sayfa, hangi sayfa nereden açılır, panel/theme/surface geçişleri nerede yapılır.

Kaynak: `frontend/src/app/layouts/useLayoutNavigation.ts` + `frontend/src/app/router.tsx` + canlı browser doğrulaması.

---

## Üst seviyede iki panel

ContentHub iki üst seviye panele bölünür:

- **Admin panel** — route kökü `/admin/*`, rolü `admin`, amacı operasyonel gözlem + yönetim
- **User panel** — route kökü `/user/*`, rolü `user` (admin da girebilir), amacı içerik üreticinin workspace'i

Her panelin kendi navigasyonu, kendi layout'u, kendi surface ağacı vardır. Panel geçişi kullanıcı menüsünden açık şekilde yapılır.

---

## Admin panel — tam hiyerarşi

Admin nav `useLayoutNavigation.ts` içinde tanımlı. Section başlıkları (bölüm ayıracı) ve menü öğeleri:

### Genel Bakış
- `/admin` — **Yönetim Paneli** — KPI'lar, operasyonel durum, son işler, hızlı erişim

### Sistem (bölüm)
- `/admin/settings` — **Ayarlar** (Settings Registry UI, tab'lı: Genel / Kimlik Bilgileri / Prompts / Wizard)
- `/admin/visibility` — **Görünürlük** (Visibility Engine kuralları)
- `/admin/wizard-settings` — **Wizard Ayarları** (wizard step governance)
- `/admin/jobs` — **İşler** (Jobs Registry, buckets + tablo)
  - `/admin/jobs/:jobId` — **İş kokpiti** (Job Detail — overview, timeline, logs, artifacts, provider trace)
- `/admin/audit-logs` — **Audit Log**
- `/admin/modules` — **Modüller** (module enable/disable, `module.{id}.enabled`)
- `/admin/providers` — **Sağlayıcılar** (LLM / TTS / Görsel / Konuşma provider'ları, credential + test)
- `/admin/prompts` — **Prompt Yönetimi** (Master Prompt Editor — type:prompt setting'ler)

### İçerik Üretimi (bölüm)
- `/admin/library` — **İçerik Kütüphanesi** (tüm kullanıcıların içerik projelerinin admin görünümü)
- `/admin/assets` — **Varlık Kütüphanesi** (media asset registry)
- `/admin/standard-videos` — **Standart Video** (modül listesi; `module:standard_video`)
- `/admin/standard-videos/wizard` — **Video Wizard** (admin-side creation flow)
- `/admin/templates` — **Şablonlar** (Template Engine — system/admin şablonları)
  - `/admin/templates/:templateId` — **Template detail**
- `/admin/style-blueprints` — **Stil Şablonları** (Style Blueprint system)
  - `/admin/style-blueprints/:blueprintId` — **Blueprint detail**
- `/admin/template-style-links` — **Şablon-Stil Bağlantıları** (template ↔ blueprint binding)

### Yayın (bölüm)
- `/admin/publish` — **Yayın Merkezi** (Publish Review Board — draft / review / scheduled / publishing / published / failed / rejected buckets)
  - `/admin/publish/:publishId` — **Publish detail**

### Etkileşim (bölüm)
- `/admin/comments` — **Yorum İzleme**
- `/admin/playlists` — **Playlist İzleme**
- `/admin/posts` — **Gönderi İzleme**

### Analytics (bölüm)
- `/admin/analytics` — **Analytics** (Platform Overview)
- `/admin/analytics/youtube` — **YouTube Analytics**
- `/admin/analytics/channel-performance` — **Kanal Performansı**

### Haber (bölüm)
- `/admin/sources` — **Kaynaklar** (Source Registry — RSS / manual URL / API)
  - `/admin/sources/:sourceId` — **Source detail**
- `/admin/source-scans` — **Kaynak Taramaları** (SourceScan log)
- `/admin/news-bulletins` — **Haber Bültenleri** (modül listesi; `module:news_bulletin`)
- `/admin/news-items` — **Haber Öğeleri** (NewsItem registry)
- `/admin/used-news` — **Kullanılan Haberler** (Used News dedupe ledger)

### Kullanıcılar (bölüm)
- `/admin/users` — **Kullanıcı Yönetimi** (user CRUD, rol, override ayarları)
  - `/admin/users/:userId` — **User detail**

### Görünüm (bölüm)
- `/admin/themes` — **Tema Yönetimi** (Surface picker + Theme picker — shell + renk paleti)

---

## User panel — tam hiyerarşi

User nav `USER_NAV`'dan gelir. Seçilen surface'a göre aynı route'lar farklı layout'larda render edilir; yapı aynıdır:

### Anasayfa
- `/user` — **Anasayfa / Dashboard** (Atrium = Vitrin, Canvas = Portfolio, Legacy/Horizon = Classic dashboard)

### Kanallarım
- `/user/channels` — **Kanallarım** (ChannelProfile listesi)
  - `/user/channels/:channelId` — **Kanal detay** (Canvas'ta zengin; diğer surface'larda stub olabilir)

### Projelerim
- `/user/projects` — **Projelerim** (ContentProject listesi — Atrium: editorial cards; Canvas: portfolio)
  - `/user/projects/:projectId` — **Proje detay** (project overview + job bağlantıları + publish linkage)

### Oluştur (bölüm)
- `/user/create/video` — **Video Oluştur** (Standard Video wizard entry)
- `/user/create/bulletin` — **Bülten Oluştur** (News Bulletin wizard entry)

### İçerik
- `/user/content` — **İçerik** (kullanıcının tüm içerik öğeleri)

### Yayın
- `/user/publish` — **Yayın** (Publish wizard / publish center user view)

### Etkileşim (bölüm)
- `/user/comments` — **Yorumlar**
- `/user/playlists` — **Playlist'lerim**
- `/user/posts` — **Gönderilerim**
- `/user/analytics/channels` — **Kanal Performansım**

### Ek user sayfaları (surface'a göre görünür)
- `/user/analytics` — **Analitiğim** (Atrium/Canvas surface'larında)
- `/user/calendar` — **Takvim** (Atrium/Canvas — yayın takvimi)

### Ayarlarım
- `/user/settings` — **Ayarlarım** (Surface picker + user override ayarları)

---

## Admin vs User — ne farkı var?

| Konu | Admin panel | User panel |
|---|---|---|
| Amaç | Operasyonel gözlem + yönetim | İçerik üretimi + yayın |
| Görünürlük | Tüm kullanıcıların işleri | Yalnızca kendi projeleri |
| Job detail | Tüm operasyonel detaylar (retry, rollback, provider trace) | Sadeleştirilmiş özet |
| Settings erişimi | Tam Settings Registry | Sadece user override alanları |
| Visibility | Rule editor | Rule etkisine uyar |
| Publish | Tüm publish record'ları, review gate yönetimi | Yalnızca kendi publish'leri |
| Template | CRUD yetkisi | Seçim yetkisi |
| Analytics | Platform geneli | Kendi kanalı + işleri |
| Source | CRUD yetkisi | Görüntüleme (varsa) |

---

## Panel geçişi nerede yapılır?

İki panel arasındaki geçiş UI'da açık olarak sunulur:

- **Admin panelinden user paneline:** üst sağdaki user menüsünde **"Kullanıcı Paneli"** butonu (ya da admin layout'unun secondary nav'ında)
- **User panelinden admin paneline:** admin rolündeki kullanıcılar için user menüsünde **"Yönetim Paneli"** butonu görünür; user rolündeki kullanıcıda bu buton yoktur

Auth koruması: admin olmayan biri `/admin/*` rotasına inerse `AuthGuard` + `AppEntryGate` onu `/user`'a yönlendirir. Tersi serbesttir (admin her iki panele de girer).

---

## Surface seçimi nerede yapılır?

Surface = panelin görsel kabuğu (shell). Aynı panel için farklı surface'lar mevcuttur:

- **Admin surface'ları:** Legacy (stable), Horizon (stable), Bridge (beta — operasyon odaklı)
- **User surface'ları:** Legacy (stable), Horizon (stable), Canvas (beta — portfolio), Atrium (beta — editoryal)

Surface iki yerden seçilir:

1. **Admin → `/admin/themes`** — "BÖLÜM 1 · ARAYÜZ YÜZEYİ" kartı. Admin default'u veya system default'u değiştirir. 12 hazır tema ve tüm surface'lar listeli.
2. **User → `/user/settings`** — "Arayüz Yüzeyleri" surface picker. Kullanıcı kendi override'ını belirler. Hazırlık aşamasındaki ya da admin tarafından kapatılmış surface'lar seçilemez olarak görünür.

Aktif surface `resolveActiveSurface(user, panel)` ile belirlenir: user override → admin default → system default → en eski stable surface.

---

## Theme seçimi nerede yapılır?

Theme = renk paleti + tipografi. Surface'tan bağımsızdır — Bridge yüzeyinde Horizon Midnight teması çalışabilir.

- **Admin → `/admin/themes`** — "BÖLÜM 2 · RENK TEMASI" kartı. Theme registry 12 hazır temayı gösterir (Obsidian Slate, Horizon Midnight, Canvas Ivory, Atrium Paper, vb.). ThemeManifest JSON import et → yeni tema ekle.
- Şu anki aktif tema: **Horizon Midnight v1.0.0** (Inter tipografi).

Detay: `05-surfaces-themes-and-panel-switching.md`.

---

## Modül bazlı menü filtresi

Bazı nav öğeleri bir modüle bağlıdır ve yalnızca o modül aktifse görünür:

| Menü öğesi | Modül | Setting |
|---|---|---|
| Standart Video | `standard_video` | `module.standard_video.enabled` |
| Video Wizard | `standard_video` | `module.standard_video.enabled` |
| Haber Bültenleri | `news_bulletin` | `module.news_bulletin.enabled` |
| Haber Öğeleri | `news_bulletin` | `module.news_bulletin.enabled` |
| Kullanılan Haberler | `news_bulletin` | `module.news_bulletin.enabled` |

Modül kapatıldığında ilgili nav öğesi hem Classic hem Horizon hem Bridge surface'larında gizlenir. `filterAdminNav` / `filterHorizonAdminGroups` bu filtreyi uygular.

---

## Visibility bazlı menü filtresi

Aşağıdaki admin nav öğeleri Visibility Engine kurallarıyla gizlenebilir:

| Menü öğesi | Visibility key |
|---|---|
| Ayarlar | `panel:settings` |
| Görünürlük | `panel:visibility` |
| Şablonlar | `panel:templates` |
| Analytics | `panel:analytics` |
| Yayın Merkezi | `panel:publish` |
| Kaynaklar | `panel:sources` |

Bir kullanıcı için `panel:publish` kuralı `visible=false` ise **Yayın Merkezi** menüsü hem client'ta gizlenir hem server-side guard engellenir.

---

## Horizon sidebar grupları

Horizon surface'ı nav'ı grup formunda gösterir (`HORIZON_ADMIN_GROUPS`, `HORIZON_USER_GROUPS`). Grup yapısı ADMIN_NAV'daki section mantığını tekrar eder, ancak icon rail + collapsible group olarak render edilir. Grup icon'ları Unicode karakterler: ◉ (Genel), ⚙ (Sistem), ✎ (İçerik), ▶ (Yayın), ✉ (Etkileşim), ≡ (Analytics), ℹ (Haber), ◐ (Görünüm).

---

## Bridge + Atrium + Canvas surface'larının kendi nav'ı

Legacy ve Horizon `ADMIN_NAV` / `USER_NAV` + `HORIZON_*_GROUPS` sabitlerini kullanırken, Bridge / Atrium / Canvas kendi layout'unda nav'ı inline tanımlar:

- **Bridge (admin)** — `BridgeAdminLayout.tsx` — Operasyon rayı: `Operasyonlar / Yayın / İçerik / Haber / İçgörü / Sistem` (case-preserving). Slot içinde tekrar menü açılır.
- **Atrium (user)** — `AtriumUserLayout.tsx` — Top-nav: `VİTRİN / PROJELER / TAKVİM / DAĞITIM / KANALLAR / ANALİZ / AYARLAR` (uppercase, Türkçe locale fix uygulandı).
- **Canvas (user)** — `CanvasUserLayout.tsx` — Portfolio nav.

Bu üç surface yalnızca kendi override'larını (`SurfacePageOverrideMap`) sağlar; diğer sayfalar için Legacy/Horizon layout'una düşer.

---

## Sonraki adım

- Her admin sayfasının ne yaptığını okumak istiyorsan → `03-admin-panel-guide.md`
- Her user sayfasının ne yaptığını okumak istiyorsan → `04-user-panel-guide.md`
- Surface ve theme arasındaki fark için → `05-surfaces-themes-and-panel-switching.md`
- Her route'un tek satır referansı için → `08-page-by-page-reference.md`
- Tam ağaç görünümü için → `sitemap.md`
