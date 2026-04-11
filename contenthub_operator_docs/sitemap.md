# Sitemap — ContentHub

Admin ve user panelin tam route ağacı, hiyerarşik olarak.

Tarih: 2026-04-11.

---

## Admin Panel (`/admin/*`)

```
/admin
│
├── [Genel Bakış]
│   └── /admin                              — Yönetim Paneli (tam)
│
├── [Sistem]
│   ├── /admin/settings                     — Ayarlar (büyük ölçüde hazır)
│   ├── /admin/visibility                   — Görünürlük (tam)
│   ├── /admin/wizard-settings              — Wizard Ayarları (partial)
│   ├── /admin/jobs                         — İşler / Jobs Registry (tam)
│   │   └── /admin/jobs/:jobId              — İş Kokpiti (tam)
│   ├── /admin/audit-logs                   — Audit Log (büyük ölçüde hazır)
│   ├── /admin/modules                      — Modüller (tam)
│   ├── /admin/providers                    — Sağlayıcılar (tam)
│   └── /admin/prompts                      — Prompt Yönetimi (büyük ölçüde hazır)
│
├── [İçerik Üretimi]
│   ├── /admin/library                      — İçerik Kütüphanesi (partial)
│   ├── /admin/assets                       — Varlık Kütüphanesi (partial)
│   ├── /admin/standard-videos              — Standart Video (partial)
│   │   └── /admin/standard-videos/wizard   — Video Wizard (partial)
│   ├── /admin/templates                    — Şablonlar (büyük ölçüde hazır)
│   │   └── /admin/templates/:templateId    — Template Detail
│   ├── /admin/style-blueprints             — Stil Şablonları (büyük ölçüde hazır)
│   │   └── /admin/style-blueprints/:id     — Blueprint Detail
│   └── /admin/template-style-links         — Şablon-Stil Bağlantıları (partial)
│
├── [Yayın]
│   └── /admin/publish                      — Yayın Merkezi / Review Board (büyük ölçüde hazır)
│       └── /admin/publish/:publishId       — Publish Detail
│
├── [Etkileşim]
│   ├── /admin/comments                     — Yorum İzleme (tam)
│   ├── /admin/playlists                    — Playlist İzleme (tam)
│   ├── /admin/posts                        — Gönderi İzleme (tam)
│   ├── /admin/automation                   — Otomasyon Politikaları (tam)
│   ├── /admin/inbox                        — Admin Inbox (tam)
│   ├── /admin/connections                  — Bağlantılar (tam)
│   ├── /admin/calendar                     — Admin Takvim (tam)
│   └── /admin/notifications                — Bildirimler (tam)
│
├── [Analytics]
│   ├── /admin/analytics                    — Analytics (partial)
│   ├── /admin/analytics/youtube            — YouTube Analytics (partial)
│   └── /admin/analytics/channel-performance — Kanal Performansı (partial)
│
├── [Haber]
│   ├── /admin/sources                      — Kaynaklar (büyük ölçüde hazır)
│   │   └── /admin/sources/:sourceId        — Source Detail
│   ├── /admin/source-scans                 — Kaynak Taramaları (büyük ölçüde hazır)
│   ├── /admin/news-bulletins               — Haber Bültenleri (büyük ölçüde hazır)
│   ├── /admin/news-items                   — Haber Öğeleri (büyük ölçüde hazır)
│   └── /admin/used-news                    — Kullanılan Haberler (büyük ölçüde hazır)
│
├── [Kullanıcılar]
│   └── /admin/users                        — Kullanıcı Yönetimi (büyük ölçüde hazır)
│       └── /admin/users/:userId            — User Detail
│
└── [Görünüm]
    └── /admin/themes                       — Tema Yönetimi (tam)
        │
        ├── [BÖLÜM 1 · ARAYÜZ YÜZEYİ]
        │   ├── Legacy   (stable, both)
        │   ├── Horizon  (stable, both)
        │   ├── Bridge   (beta, admin)
        │   ├── Canvas   (beta, user)
        │   └── Atrium   (beta, user)
        │
        └── [BÖLÜM 2 · RENK TEMASI]
            ├── Horizon Midnight v1.0.0  ← aktif
            ├── Obsidian Slate
            ├── Canvas Ivory
            ├── Atrium Paper
            ├── Bridge Dusk
            └── ... (toplam 12 tema)
```

---

## User Panel (`/user/*`)

```
/user
│
├── /user                                   — Anasayfa / Dashboard (tam — Atrium default)
│
├── /user/channels                          — Kanallarım (büyük ölçüde hazır)
│   └── /user/channels/:channelId           — Kanal Detay (326 LoC tam; YouTube OAuth + credentials)
│
├── /user/projects                          — Projelerim (tam)
│   └── /user/projects/:projectId           — Proje Detay (büyük ölçüde hazır)
│
├── [Oluştur]
│   ├── /user/create/video                  — Video Oluştur (büyük ölçüde hazır)
│   └── /user/create/bulletin               — Bülten Oluştur (büyük ölçüde hazır)
│
├── /user/content                           — İçerik giriş sayfası (tam)
│
├── /user/publish                           — Yayın (büyük ölçüde hazır)
│
├── [Etkileşim]
│   ├── /user/comments                      — Yorumlar (tam — 420 LoC)
│   ├── /user/playlists                     — Playlist'lerim (tam — 526 LoC)
│   ├── /user/posts                         — Gönderilerim (tam — 507 LoC)
│   ├── /user/automation                    — Otomasyonlarım (tam — 293 LoC)
│   ├── /user/inbox                         — Gelen Kutusu (tam — 202 LoC)
│   ├── /user/connections                   — Bağlantılarım (tam — 267 LoC)
│   └── /user/analytics/channels            — Kanal Performansım (tam — 218 LoC)
│
├── /user/analytics                         — Analitiğim (tam — shell düzeyinde)
│
├── /user/calendar                          — Takvim (tam)
│
└── /user/settings                          — Ayarlarım (büyük ölçüde hazır)
    │
    └── [Arayüz Yüzeyleri — Surface Picker]
        ├── Legacy   (Aktif Et)
        ├── Horizon  (Aktif Et)
        ├── Canvas   (Aktif Et)
        └── Atrium   (Şu an seçili yüzey — default)
```

---

## Auth + OAuth routes

```
/login                                      — Login sayfası
/oauth/callback/youtube                     — YouTube OAuth callback
```

---

## Surface × Route override matrix

| Route | Legacy | Horizon | Bridge | Canvas | Atrium |
|---|---|---|---|---|---|
| `/admin` | default | default | default | — | — |
| `/admin/jobs` | default | default | **custom** | — | — |
| `/admin/jobs/:jobId` | default | default | **custom** | — | — |
| `/admin/publish` | default | default | **custom** | — | — |
| `/admin/settings` | default | default | default | — | — |
| `/admin/visibility` | default | default | default | — | — |
| `/admin/providers` | default | default | default | — | — |
| `/admin/themes` | default | default | default | — | — |
| `/user` | default | default | — | **custom** | **custom** |
| `/user/projects` | default | default | — | **custom** | **custom** |
| `/user/projects/:projectId` | default | default | — | **custom** | **custom** |
| `/user/publish` | default | default | — | **custom** | default |
| `/user/channels` | default | default | — | **custom** | default |
| `/user/channels/:channelId` | default | default | — | **custom** | default (stub) |
| `/user/analytics` | default | default | — | **custom** | default |
| `/user/calendar` | default | default | — | **custom** | default |
| `/user/settings` | default | default | — | default | default |

- **custom** = surface kendi override'ını sağlar
- **default** = surface Horizon/Legacy'nin page component'ini kullanır
- **—** = surface scope dışında

---

## Scope ve default stratejisi

```
Surface scope:
├── Legacy    — both   (stable)
├── Horizon   — both   (stable)
├── Bridge    — admin  (beta)
├── Canvas    — user   (beta)
└── Atrium    — user   (beta)

Default surface:
├── Admin panel  → Bridge
└── User panel   → Atrium

Active theme:
└── Horizon Midnight v1.0.0 (Inter)
```

---

## Kaynaklar

- `frontend/src/app/router.tsx` — Router tanımı
- `frontend/src/app/layouts/useLayoutNavigation.ts` — Admin/user nav sabitleri
- `frontend/src/surfaces/manifests/*.ts` — Surface registry
- `frontend/src/surfaces/*/` — Surface override implementation'ları

Son güncelleme: 2026-04-11
