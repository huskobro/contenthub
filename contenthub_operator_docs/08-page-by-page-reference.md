# 08 — Page-by-Page Reference

Her route için tek satır özet: amacı, panel, ana özellik, durum. Hızlı arama için alfabetik değil, panel ve menü hiyerarşisine göre.

Durum: **tam** / **büyük ölçüde hazır** / **partial** / **shell** / **planlı**

---

## Admin panel routes

| Route | Ad | Amaç | Durum |
|---|---|---|---|
| `/admin` | Yönetim Paneli | KPI + operasyonel durum + son işler + hızlı erişim | **tam** |
| `/admin/settings` | Ayarlar | Settings Registry UI — tab'lı: Genel, Kimlik Bilgileri, Prompts, Wizard | **büyük ölçüde hazır** |
| `/admin/visibility` | Görünürlük | Visibility Engine rule editor | **tam** |
| `/admin/wizard-settings` | Wizard Ayarları | Wizard step governance per module | **tam** (445 LoC) |
| `/admin/jobs` | İşler | Jobs Registry — buckets + tablo | **tam** |
| `/admin/jobs/:jobId` | İş Kokpiti | Job Detail — timeline, logs, artifacts, provider trace | **tam** |
| `/admin/audit-logs` | Audit Log | Kritik operasyon denetim kayıtları | **büyük ölçüde hazır** |
| `/admin/modules` | Modüller | Module enable/disable | **tam** |
| `/admin/providers` | Sağlayıcılar | LLM/TTS/Image/Speech provider + credential + metrik | **tam** |
| `/admin/prompts` | Prompt Yönetimi | Master Prompt Editor (type:prompt setting'ler) | **büyük ölçüde hazır** |
| `/admin/library` | İçerik Kütüphanesi | Tüm user içerik projelerinin admin görünümü | **büyük ölçüde hazır** (445 LoC) |
| `/admin/assets` | Varlık Kütüphanesi | Media asset registry | **büyük ölçüde hazır** (164+193 LoC) |
| `/admin/standard-videos` | Standart Video | Standard Video modül liste (admin) | **tam** |
| `/admin/standard-videos/wizard` | Video Wizard (admin) | Admin-side creation flow | **tam** (Content Creation Wizard 5170 LoC) |
| `/admin/templates` | Şablonlar | Template Engine CRUD | **büyük ölçüde hazır** |
| `/admin/templates/:templateId` | Template Detail | Tek template editör + versiyon | **büyük ölçüde hazır** |
| `/admin/style-blueprints` | Stil Şablonları | Style Blueprint CRUD | **büyük ölçüde hazır** |
| `/admin/style-blueprints/:blueprintId` | Blueprint Detail | Blueprint rules + preview strategy | **büyük ölçüde hazır** |
| `/admin/template-style-links` | Şablon-Stil Bağlantıları | Template ↔ Blueprint binding (create form + list) | **partial** (detail/edit view eksik) |
| `/admin/publish` | Yayın Merkezi | Publish Review Board — state machine buckets | **büyük ölçüde hazır** |
| `/admin/publish/:publishId` | Publish Detail | Tek PublishRecord detayı + review actions | **büyük ölçüde hazır** |
| `/admin/comments` | Yorum İzleme | Comment moderation | **tam** (300 LoC) |
| `/admin/playlists` | Playlist İzleme | YouTube playlist monitoring | **tam** (260 LoC) |
| `/admin/posts` | Gönderi İzleme | Community post monitoring | **tam** (275 LoC) |
| `/admin/automation` | Otomasyon Politikaları | Admin automation policies | **tam** |
| `/admin/inbox` | Admin Inbox | Admin review inbox | **tam** |
| `/admin/connections` | Bağlantılar | Platform OAuth bağlantıları (admin görünüm) | **tam** |
| `/admin/calendar` | Admin Takvim | Admin yayın takvimi | **tam** |
| `/admin/notifications` | Bildirimler | Admin notification center | **tam** |
| `/admin/analytics` | Analytics | Platform Overview | **büyük ölçüde tam** (443 LoC + 72 KB backend) |
| `/admin/analytics/youtube` | YouTube Analytics | Platform-specific analytics | **partial** (retention/watch time eksik) |
| `/admin/analytics/channel-performance` | Kanal Performansı | Channel-level performance | **büyük ölçüde tam** |
| `/admin/sources` | Kaynaklar | Source Registry CRUD | **büyük ölçüde hazır** |
| `/admin/sources/:sourceId` | Source Detail | Tek source detay + scan history | **büyük ölçüde hazır** |
| `/admin/source-scans` | Kaynak Taramaları | SourceScan log | **büyük ölçüde hazır** |
| `/admin/news-bulletins` | Haber Bültenleri | News Bulletin modül liste (admin) | **büyük ölçüde hazır** |
| `/admin/news-items` | Haber Öğeleri | NewsItem registry | **büyük ölçüde hazır** |
| `/admin/used-news` | Kullanılan Haberler | Used News dedupe ledger | **büyük ölçüde hazır** |
| `/admin/users` | Kullanıcı Yönetimi | User CRUD + override | **büyük ölçüde hazır** |
| `/admin/users/:userId` | User Detail | User override ayarları | **büyük ölçüde hazır** |
| `/admin/themes` | Tema Yönetimi | Surface + Theme picker (iki kısım) | **tam** |

---

## User panel routes

| Route | Ad | Amaç | Durum |
|---|---|---|---|
| `/user` | Anasayfa (Vitrin / Portfolio) | Dashboard — stüdyo özeti, aktif üretimler | **tam** (Atrium) |
| `/user/channels` | Kanallarım | ChannelProfile liste | **büyük ölçüde hazır** |
| `/user/channels/:channelId` | Kanal Detay | Tek kanal detayı (YouTube OAuth + credentials) | **tam** (326 LoC) |
| `/user/projects` | Projelerim | ContentProject liste (editorial / portfolio) | **tam** |
| `/user/projects/:projectId` | Proje Detay | Proje + job + publish bağlantısı | **büyük ölçüde hazır** |
| `/user/create/video` | Video Oluştur | Standard Video wizard | **büyük ölçüde hazır** |
| `/user/create/bulletin` | Bülten Oluştur | News Bulletin wizard | **büyük ölçüde hazır** |
| `/user/content` | İçerik | İçerik hub giriş sayfası | **tam** |
| `/user/publish` | Yayın | Publish wizard + user publish history | **büyük ölçüde hazır** |
| `/user/comments` | Yorumlar | User-level comment view | **tam** (420 LoC) |
| `/user/playlists` | Playlist'lerim | User playlist view | **tam** (526 LoC) |
| `/user/posts` | Gönderilerim | User post view | **tam** (507 LoC) |
| `/user/automation` | Otomasyonlarım | Kullanıcı otomasyon politikaları | **tam** (293 LoC) |
| `/user/inbox` | Gelen Kutusu | Bildirimler + review davetleri | **tam** (202 LoC) |
| `/user/connections` | Bağlantılarım | Platform OAuth bağlantıları | **tam** (267 LoC) |
| `/user/analytics/channels` | Kanal Performansım | User-scope channel analytics | **tam** (218 LoC) |
| `/user/analytics` | Analitiğim | User-scope analytics overview | **tam** (shell seviyesinde) |
| `/user/calendar` | Takvim | Yayın takvimi (week/month) | **tam** |
| `/user/settings` | Ayarlarım | Surface picker + user override ayarları | **büyük ölçüde hazır** |

---

## Route detayı — özel notlar

### Surface bazlı override'lar

Aynı route farklı surface'larda farklı layout'ta render edilir:

| Route | Bridge | Canvas | Atrium | Legacy/Horizon |
|---|---|---|---|---|
| `/admin/jobs` | ✅ custom | — | — | default |
| `/admin/jobs/:jobId` | ✅ custom | — | — | default |
| `/admin/publish` | ✅ custom | — | — | default |
| `/user` | — | ✅ custom | ✅ custom | default |
| `/user/projects` | — | ✅ custom | ✅ custom | default |
| `/user/projects/:projectId` | — | ✅ custom | ✅ custom | default |
| `/user/channels` | — | ✅ custom | — | default |
| `/user/channels/:channelId` | — | ✅ custom | — | default |
| `/user/publish` | — | ✅ custom | — | default |
| `/user/analytics` | — | ✅ custom | — | default |
| `/user/calendar` | — | ✅ custom | — | default |

Override edilmeyen sayfalar surface'ın kendi layout'unda ama Horizon/Legacy'nin default page component'iyle render edilir.

### Orphan / placeholder'lar

Final acceptance turunda tespit edilen:

- `/user/channels/:channelId` — Atrium + Legacy + Horizon surface'larında inline stub (Canvas'ta tam)
- `ChannelDetailPage.tsx` — bazı surface'larda orphan component
- `UserYouTubeCallbackPage.tsx` — OAuth callback için untracked orphan
- `UserPublishEntryPage.tsx` — bazı surface'larda orphan

Bu sayfalar route'a bağlı ama gerçek içerik eksik — shell/stub seviyesinde.

---

## Route koruma özeti

| Route pattern | Guard | Rol |
|---|---|---|
| `/admin/*` | AuthGuard + role check | admin |
| `/user/*` | AuthGuard | user veya admin |
| `/login` | public | — |
| `/oauth/callback/youtube` | AuthGuard | user veya admin |

Admin olmayan biri `/admin/*` rotasına inerse AppEntryGate `/user`'a yönlendirir.

---

## Sonraki adım

- Her butonun ne yaptığı → `09-buttons-actions-and-states.md`
- Hangi alan tam hangi partial → `11-current-capabilities-vs-partial-areas.md`
- Tam sitemap görselleştirme → `sitemap.md`
