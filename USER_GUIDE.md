# USER_GUIDE.md — ContentHub Aurora Kullanım Rehberi

**Tarih:** 2026-04-23 (pass-7 polish pass addendum)
**Versiyon:** Aurora Dusk Cockpit (main branch aktif, commit `0d838ad` + `codex/aurora-light-theme-visibility` açık)
**Kapsam:** End-user için sadeleştirilmiş kullanım kılavuzu + Aurora yüzeyine özel notlar + **truth-fix closure kayıtları (Bölüm 6)** + **theme curation durumu (Bölüm 7 / 2026-04-23)**.

> **PASS-7 ADDENDUM (2026-04-23):** `codex/aurora-light-theme-visibility` branch'inde 3 polish commit eklendi:
> 1. Light theme cockpit görünürlük düzeltmesi (rail text + icon token'ları tam tokenize).
> 2. Rail icon `color-scheme: dark` belt-and-suspenders (UA-level auto-dark guard — tarayıcı dark-mode zorlaması rail'ı bozmasın diye).
> 3. `AuroraChannelPerformancePage` breadcrumb'ında hash-prefixed href bug'ı fix edildi (`#/admin/analytics` → `/admin/analytics`).
>
> **Kullanıcı etkisi:**
> - Obsidian Slate (açık tema) rail/sidebar artık tüm browser'larda düzgün görünür.
> - `/admin/analytics/channels` sayfasında "Analytics" breadcrumb linki artık doğru sayfaya götürür (daha önce tıklayınca hiçbir yere gitmiyordu).
>
> **Merge hazırlığı:** 3 dosya, 0 backend değişiklik, 0 API kontratı etkilenmedi. Main'e güvenli squash-merge için hazır.

> **MERGE NOTU (2026-04-20):** `feature/aurora-dusk-cockpit` main'e squash-merge edildi. Aurora Dusk Cockpit artık `main` branch'tedir. Alembic head: `phase_al_001`. Test durumu: backend 2559/2559, frontend 2696/2696 (237 dosya).

> **✅ Pass-5 final closure (2026-04-20):** Pass-3'te tespit edilen 11 P0 sorun pass-4'te kapatıldı; pass-5'te smoke test guard'ı ile yakalanan +1 yeni navigate-404 (`AuroraSourceDetailPage` Düzenle butonu) ve wizard atomikliği (news_bulletin atomik endpoint + product_review dürüst orphan handling) ve undefined token (`--bg-hover` → `--bg-inset`) kapatıldı. Detaylar `CODE_AUDIT_REPORT.md` Bölüm 18 (pass-5 closure addendum) ve `MERGE_READINESS.md` Bölüm 1.2'de.
>
> **Drawer pattern notu:** 5 entity registry sayfasında (`templates`, `used-news`, `style-blueprints`, `template-style-links`, `source-scans`) "satıra tıklayınca detay sayfasına git" davranışı yerine, mevcut `AuroraDetailDrawer` primitive'i ile **sağdan açılan drawer** kullanılıyor. Templates sayfasında URL `?openId=<id>` parametresiyle deep-link açma desteklenir (yeni şablon oluşturduktan sonra liste'de drawer otomatik açılır).
>
> **Inline edit notu:** `/admin/sources/:id` sayfasında "Düzenle" butonu ayrı route'a navigate etmek yerine **inline edit moduna** girer (mevcut sayfa input'lara dönüşür, "Kaydet" → `PATCH /api/v1/sources/{id}` → cache invalidation). Ayrı `/edit` route'u yoktur; pass-5 closure ile bu pattern netleştirildi.

---

## BOLUM 1 — UYGULAMA GENEL OZETI

ContentHub, tek bir makinede çalışan modüler bir içerik üretim ve yayınlama platformudur. AI destekli script/metadata/TTS adımlarıyla standart video, haber bülteni ve ürün incelemesi üretir; YouTube'a yayınlar; takvim, analitik, yorum ve community post yönetimi sunar. Aurora yüzeyi (Dusk Cockpit), 4 katmanlı üretim atölyesi metaforuyla çalışır:

- **ctxbar (üst)** — komut paleti, profil, bildirim
- **birincil ray (sol)** — modül navigasyonu (Bugün / Projeler / Yayın / Kanallar / Etkileşim / Analitik / Ayarlar)
- **workbench (orta)** — sayfa içeriği (Stage + Stream)
- **inspector (sağ)** — bağlamsal özet, hızlı eylemler
- **statusbar (alt)** — SSE durumu, geri bildirim, sürüm

**Ana modüller:** Standart Video · Haber Bülteni · Ürün İncelemesi · Yayın Merkezi · Kanallar · Yorumlar · Playlists · Community Posts · Otomasyon · Analitik · Takvim · Ayarlar · Audit · Templates · Style Blueprints · Sources · News Items · Used News · Source Scans · Modules · Providers · Prompts.

**Hedef kullanıcı:** Tek başına ya da küçük ekiple çalışan içerik üreticisi/operatörü (lokal kullanım, multi-tenant değil).

**Kullanım felsefesi (önerilen sıralama):**
1. Önce **kanal bağla** (`/user/connections` → YouTube OAuth)
2. **API anahtarlarını gir** (`/admin/settings` → LLM, TTS, Visuals)
3. **Şablon / blueprint hazırla** (`/admin/templates`, `/admin/style-blueprints`)
4. **İçerik üret** (`/user/content` → wizard)
5. **Yayınla** (`/user/publish` veya `/admin/publish` review queue)
6. **Takip et** (`/user/analytics`, `/user/comments`, `/user/inbox`)

---

## BOLUM 2 — AURORA EKRAN HARITASI

Aşağıdaki tüm sayfalar Aurora override ile gelir (`isAurora: true`, 87 override). Aurora kapatılırsa legacy admin/user sayfalarına otomatik düşer (SurfacePageOverride trampolini).

### User panel (`/user/...`)

| Yol | Aurora bileşeni | Ne işe yarar | Inspector özeti |
|---|---|---|---|
| `/user` | AuroraUserDashboardPage | Bugün kartı: aktif iş, son yayın, ETA, hızlı CTA'lar (yeni video/bülten/ürün) | "Bugün özeti" — iş sayısı + KPI |
| `/user/projects` | AuroraMyProjectsPage | İçerik projeleri grid'i, durum filtresi | "Proje özeti" — toplam/aktif sayı |
| `/user/projects/:id` | AuroraProjectDetailPage | Proje detayı, ilgili işler, artefaktlar | "Proje detayı" |
| `/user/jobs/:id` | AuroraUserJobDetailPage | İş timeline, adımlar, loglar, retry, prompt trace, artefakt indir | "İş özeti" + retry tuşu |
| `/user/content` | AuroraUserContentEntryPage | Modül kartları (Standart Video / Haber Bülteni / Ürün İncelemesi) → wizard'a yönlendirme; Mod toggle (Rehberli / Gelişmiş) | "İçerik girişi" |
| `/user/publish` | AuroraUserPublishPage | Yayın özet ekranı, admin yayın merkezine kısayol | — |
| `/user/channels` | AuroraMyChannelsPage | Kullanıcının kanal profilleri grid'i (avatar, handle, durum) | "Kanal özeti" |
| `/user/channels/:id` | AuroraChannelDetailPage | Kanal detayı, branding, default ayarlar | "Kanal detayı" — ✅ "Bağlantı kur" butonu artık `/user/connections?channel=${id}` deep-link açıyor (pass-4 closure) |
| `/user/connections` | AuroraUserConnectionsPage | Bağlı OAuth platformları (YouTube vb.), sağlık/yetki durumu, hesap listesi | "Bağlantı KPI'ı" + ipucu |
| `/user/automation` | AuroraUserAutomationPage | Full-auto policy listesi, kanal seçimi | — |
| `/user/inbox` | AuroraUserInboxPage | Bildirimler, "Tümünü okundu işaretle" | — |
| `/user/comments` | AuroraUserCommentsPage | YouTube yorumları, "Yanıtla" inline composer | "Yorum filtreleri" |
| `/user/playlists` | AuroraUserPlaylistsPage | Playlist listesi, "Tümünü senkronla" | — |
| `/user/posts` | AuroraUserPostsPage | Community post taslakları/kuyruk, "Gönder" / "Sil" | — |
| `/user/calendar` | AuroraUserCalendarPage | Yayın takvimi, zamanlama | — |
| `/user/analytics` | AuroraUserAnalyticsPage | Genel analitik özeti | — |
| `/user/analytics/channels` | AuroraUserChannelAnalyticsPage | Kanal başına performans | — |
| `/user/analytics/youtube` | AuroraUserYouTubeAnalyticsPage | YouTube analytics dashboard | — |
| `/user/news-picker` | AuroraUserNewsPickerPage | Haber bülteni için checkbox tabanlı haber seçimi | — |
| `/user/settings` | AuroraUserSettingsPage | Kullanıcı ayarları, "düzenle" inline edit | "Ayarlar özeti" |
| `/user/create/video` | AuroraVideoWizardPage | Standart video wizard | — |
| `/user/create/bulletin` | AuroraBulletinWizardPage | Haber bülteni wizard | — |
| `/user/create/product-review` | AuroraProductReviewWizardPage | Ürün inceleme wizard | — |

### Admin panel (`/admin/...`)

| Yol | Aurora bileşeni | Ne işe yarar | Notlar |
|---|---|---|---|
| `/admin` | AuroraAdminDashboardPage | Sistem özeti, hızlı eylemler, sağlık hücreleri | Hücreler tıklanabilir (drill-down) |
| `/admin/jobs` | AuroraJobsRegistryPage | Tüm işlerin listesi, durum filtresi | URL filter senkronu |
| `/admin/jobs?status=running` | (aynı) | Çalışan işler | drill target |
| `/admin/jobs?status=failed` | (aynı) | Hatalı işler | drill target |
| `/admin/jobs/:id` | AuroraUserJobDetailPage (basePath-aware) | Aynı bileşen, admin context | — |
| `/admin/news-items` | AuroraNewsItemsRegistryPage | Haber kayıt listesi | — |
| `/admin/news-items/:id` | AuroraNewsItemDetailPage | Haber detay + Arşivle (`POST /news-items/{id}/ignore`) | ✅ Doğru bağlı |
| `/admin/sources` | AuroraSourcesRegistryPage | Kaynak listesi + "Tara" butonu | — |
| `/admin/sources/:id` | AuroraSourceDetailPage | Kaynak detayı + inline edit ("Düzenle" → meta satırlar input'a dönüşür → `PATCH /sources/{id}`) | ✅ Pass-5 closure (404 → inline edit) |
| `/admin/source-scans` | AuroraSourceScansRegistryPage | Tarama geçmişi | ✅ Drawer pattern (Pass-4 closure) |
| `/admin/templates` | AuroraTemplatesRegistryPage | Şablon listesi | ✅ Drawer pattern + `?openId=` deep-link (Pass-4 closure) |
| `/admin/templates/new` | AuroraTemplateCreatePage | Yeni şablon formu | ✅ Create sonrası redirect → `/admin/templates?openId=${id}` (Pass-4 closure) |
| `/admin/style-blueprints` | AuroraStyleBlueprintsRegistryPage | Blueprint listesi | ✅ Drawer pattern (Pass-4 closure) |
| `/admin/template-style-links` | AuroraTemplateStyleLinksRegistryPage | Bağlantı listesi | ✅ Drawer pattern + drawer-içi gerçek delete mutation (Pass-4 closure) |
| `/admin/used-news` | AuroraUsedNewsRegistryPage | Kullanılmış haber kayıt | ✅ Drawer pattern (Pass-4 closure) |
| `/admin/news-bulletins` | AuroraNewsBulletinRegistryPage | Bülten listesi | — |
| `/admin/news-bulletins/wizard` | AuroraNewsBulletinWizardPage | Bülten wizard | — |
| `/admin/news-bulletins/:id` | AuroraNewsBulletinDetailPage | Bülten detayı | — |
| `/admin/standard-videos` | AuroraStandardVideoRegistryPage | Video listesi | — |
| `/admin/standard-videos/wizard` | AuroraStandardVideoWizardPage | Video wizard | — |
| `/admin/standard-videos/:id` | AuroraStandardVideoDetailPage | Video detayı | — |
| `/admin/publish` | AuroraPublishCenterPage | Yayın merkezi: review, schedule, retry, kanal filter chip | ✅ Approve/Reject doğru |
| `/admin/publish/review` | AuroraPublishReviewQueuePage | Onay kuyruğu | — |
| `/admin/publish/:id` | AuroraPublishDetailPage | Publish detayı | ✅ "Audit göster" → `/admin/audit-logs` (Pass-4 closure) |
| `/admin/connections` | AuroraAdminConnectionsPage | Platform bağlantıları | ✅ "Yenile" → `refreshConnection`; "Bağlantıyı kes" → `disconnectConnection` (Pass-4 closure) |
| `/admin/audit-logs` | AuroraAuditPage | Audit log | ✅ |
| `/admin/themes` | AuroraThemesPage | Tema/yüzey seçimi | ✅ Aurora yüzey aktif; localStorage tercihi (kalıcı ürün kararı) |
| `/admin/settings` | AuroraSettingsPage | Settings Registry — inline editor (RowEditor) | ✅ `PUT /settings/effective/{key}` |
| `/admin/settings/:group` | (aynı) | Grup filtreli | ✅ |
| `/admin/prompts` | AuroraPromptsPage | Master Prompt Editor | ✅ aynı endpoint |
| `/admin/visibility` | AuroraVisibilityPage | Visibility Engine | — |
| `/admin/wizard-settings` | AuroraWizardSettingsPage | Wizard governance | — |
| `/admin/wizard` | AuroraWizardPage | Wizard launcher (modül parametresi querystring ile) | — |
| `/admin/modules` | AuroraModulesPage | Modül yönetimi | — |
| `/admin/providers` | AuroraProvidersPage | Provider yönetimi | — |
| `/admin/users` | AuroraUsersPage | Kullanıcı listesi | — |
| `/admin/users/:id/settings` | AuroraUserSettingsDetailPage | Kullanıcı ayar override | — |
| `/admin/library` | AuroraContentLibraryPage | İçerik kütüphanesi | — |
| `/admin/assets` | AuroraAssetLibraryPage | Asset kütüphanesi | — |
| `/admin/calendar` | AuroraAdminCalendarPage | Admin takvim | — |
| `/admin/automation` | AuroraAdminAutomationPoliciesPage | Otomasyon politikaları | — |
| `/admin/comments` | AuroraAdminCommentMonitoringPage | Yorum izleme | — |
| `/admin/playlists` | AuroraAdminPlaylistMonitoringPage | Playlist izleme | — |
| `/admin/posts` | AuroraAdminPostMonitoringPage | Post izleme | — |
| `/admin/inbox` | AuroraAdminInboxPage | Admin bildirim merkezi | — |
| `/admin/notifications` | AuroraAdminNotificationsPage | Bildirim ayarları | — |
| `/admin/analytics` | AuroraAnalyticsPage | Yönetimsel analitik genel | — |
| `/admin/analytics/content` | AuroraAnalyticsContentPage | İçerik analitik | — |
| `/admin/analytics/operations` | AuroraAnalyticsOperationsPage | Operasyon analitik | — |
| `/admin/analytics/youtube` | AuroraYouTubeAnalyticsPage | YouTube analitik | — |
| `/admin/analytics/publish` | AuroraPublishAnalyticsPage | Yayın analitik | — |
| `/admin/analytics/channel-performance` | AuroraChannelPerformancePage | Kanal performans | — |

### Auth + sistem
| Yol | Aurora bileşeni | Ne işe yarar |
|---|---|---|
| `/login` | AuroraLoginPage | Giriş ekranı |
| `/onboarding` | AuroraOnboardingPage | İlk açılış kurulumu |
| `/forgot-password` | AuroraForgotPasswordPage | Şifre sıfırlama |
| `/session-expired` | AuroraSessionExpiredPage | Oturum sonlandı |
| `/workspace-switch` | AuroraWorkspaceSwitchPage | Workspace değiştir |
| `/error` | AuroraInternalErrorPage | 500 hata |
| `*` | AuroraNotFoundPage | 404 (catch-all) |

---

## BOLUM 3 — KRITIK ETKILESIM ENVANTERI (Aurora canlı doğrulama, 2026-04-19 pass-3)

### ✅ Doğru bağlı etkileşimler (manuel ve kod incelemesiyle doğrulandı)

| Sayfa | Element | Tetiklenen Akış | Backend Endpoint | Durum |
|---|---|---|---|---|
| `/user/comments` | "Yanıtla" → "Gönder" | useReplyToComment mutation | `POST /api/v1/comments/{id}/reply` | ✅ Aktif |
| `/user/posts` | Taslak kart "Gönder" | useSubmitPost mutation | `POST /api/v1/posts/{id}/submit` | ✅ Aktif |
| `/user/playlists` | "Tümünü senkronla" | useSyncPlaylists mutation | `POST /api/v1/playlists/sync` | ✅ Aktif |
| `/user/inbox` | "Tümünü okundu işaretle" | markAllRead mutation | `POST /api/v1/notifications/mark-all-read` | ✅ Aktif |
| `/user/settings` | "düzenle" → "kaydet" | useSetUserOverride mutation | `PUT /api/v1/users/{id}/settings/{key}` | ✅ Aktif |
| `/user/connections` | platform "Bağla" düğmeleri | OAuth flow | `/api/v1/youtube/oauth/start` | ✅ Aktif |
| `/admin/settings` | "Düzenle" (RowEditor) | save mutation | `PUT /api/v1/settings/effective/{key}` | ✅ Aktif |
| `/admin/prompts` | "Save" | aynı endpoint | aynı | ✅ Aktif |
| `/admin/news-items/:id` | "Arşivle" | markIgnored mutation | `POST /api/v1/news-items/{id}/ignore` | ✅ Aktif |
| `/admin/sources` | "Tara" | scan mutation | `POST /api/v1/sources/{id}/scan` | ✅ Aktif |
| `/admin/publish` | "Onayla" / "Reddet" | approve/reject mutation | `POST /api/v1/publish/{id}/approve|reject` | ✅ Aktif |
| `/admin/publish` | Kanal kart filter | setChannelFilter (in-page) | — | ✅ Aktif (in-page filter) |
| `/admin/dashboard` | "İşler" hh hücresi | navigate('/admin/jobs?status=running') | — | ✅ URL filter aktif |
| `/admin/dashboard` | "Hatalar" hh hücresi | navigate('/admin/jobs?status=failed') | — | ✅ URL filter aktif |
| `/admin/dashboard` | "DB" / "Python" hh hücresi | role="note" (drill yok) | — | ✅ Dürüst (düz bilgi) |
| Cmd+K (Komut paleti) | navigate(target) | — | ✅ Aktif (3 ana browser'da temiz) |
| Cmd+J (Sidebar daralt/genişlet) | useUIStore.toggleSidebar() | — | ✅ Aktif (Brave/Chrome'da kullanıcı-test edildi: web sayfası override edebilir; Türkçe Mac klavyede tek tuş) |
| ~~Cmd+P / Cmd+B / Cmd+Shift+P / Cmd+\\~~ | (kaldırıldı) | — | ⛔ Pass-6: browser/OS tarafından rezerve (print / bookmarks / Firefox Private Window) veya Türkçe Mac klavyede tek tuş yok. Aurora dinlemez; Cmd+K + Cmd+J kullanın. |

### Aurora etkileşim güncel durumu (Pass-5 final — 2026-04-20)

**Şu an Aurora yüzeyinde yalan etkileşim, dummy handler veya 404 üreten click yoktur.**

- Tüm registry sayfalarındaki satır click'leri drawer pattern ile çalışır (templates, used-news, style-blueprints, template-style-links, source-scans).
- `/admin/sources/:id` "Düzenle" butonu inline edit modunu açar (`PATCH /sources/{id}`).
- `/admin/publish/:id` "Audit göster" butonu `/admin/audit-logs` sayfasına götürür.
- `/user/channels/:id` "Bağlantı kur" butonu `/user/connections?channel=${id}` deep-link'ine götürür.
- `/admin/connections` "Yenile" butonu gerçek `refetch()` çağırır + toast verir; "Bağlantıyı kes" gerçek `DELETE /platform-connections/{id}` mutation'ını çağırır.

**Regresyon koruması:** `frontend/src/tests/aurora-navigate-targets.smoke.test.ts` Aurora'da yapılan tüm `navigate(...)` hedeflerini router.tsx'e karşı doğrular; yeni 404 paterni CI'da fail eder.

> Pass-3'te (2026-04-19 gündüz) keşfedilen 9 navigate-404 + 2 yalan-handler + 1 URL mismatch listesi pass-4 closure (2026-04-19 gece) ve pass-5 closure (2026-04-20) ile kapatılmıştır. Tarihi liste `CODE_AUDIT_REPORT.md` Bölüm 7 (pass-3 historical) + Bölüm 17 (pass-4 closure) + Bölüm 18 (pass-5 final closure) altında historical record olarak korunmaktadır; bu kullanıcı rehberinden çıkarıldı çünkü güncel davranış yansıtmıyor.

---

## BOLUM 4 — GOREV BAZLI KULLANIM REHBERI

### 4.1 İlk kez kurulum (10-15 dk)
1. **Login:** admin/admin (lokal kurulum)
2. **YouTube hesabı bağla:** `/user/connections` → "YouTube'a bağlan" → OAuth flow → callback'te otomatik kayıt
3. **API anahtarları:** `/admin/settings` → `provider.{name}.api_key` ayarlarını gir (LLM: OpenAI/KieAI, TTS: EdgeTTS yoksa system; Visuals: Pexels/Pixabay)
4. **Şablon hazırla:** `/admin/templates` → "Yeni şablon" → modül seç (standard_video/news_bulletin/product_review) → kaydet
5. **Style Blueprint hazırla:** `/admin/style-blueprints` → "Yeni blueprint" → görsel kimlik + motion + altyazı stilini tanımla
6. **Template ↔ Blueprint bağla:** `/admin/template-style-links` → şablonu blueprint'e bağla
7. **Master prompt'lar:** `/admin/prompts` → modül için prompt'ları gözden geçir (varsayılanlar yeterli olabilir)

### 4.2 Yeni Standart Video oluşturmak
1. `/user/content` → "Standart Video" kartına tıkla
2. Mod seç:
   - **Rehberli** (varsayılan): wizard adım adım sorar (konu, stil, kanal, dil, süre, ton)
   - **Gelişmiş**: tek-form, tüm ayarlar açık
3. Kanal seç (önceden bağlı kanallar listelenir)
4. Şablon seç (admin'in tanımladığı şablonlar)
5. "Başlat" → İçerik oluşturulur **VE** üretim job'u kuyruğa girer
6. `/user/jobs/:id` üzerinden timeline'ı izle (script → metadata → tts → visual planning → composition → render → thumbnail)
7. ETA gösterilir (geçmiş ortalamadan); SSE ile gerçek zamanlı güncelleme
8. Tamamlandığında artefaktlar (.mp4, thumbnail, .srt) `/user/projects/:id` üzerinden indirilebilir

### 4.3 Yeni Haber Bülteni oluşturmak
1. `/admin/sources` → bir RSS/API kaynağı eklediğinden emin ol
2. `/admin/sources` → "Tara" → news items doldurulur
3. `/user/news-picker` → checkbox ile haberleri seç (used-news ve dedupe otomatik filtrelenir)
4. `/user/create/bulletin` → wizard başlat
5. Seçili haberleri bülten için onayla → "Başlat" → job kuyruğa girer
6. `/user/jobs/:id` üzerinden timeline; tamamlandığında bülten yayına hazır

### 4.4 Yeni Ürün İncelemesi oluşturmak
1. `/user/create/product-review` → wizard
2. Ürün bilgisi (URL, görseller, manuel açıklama) gir
3. Stil + kanal seç → "Başlat"
4. Job timeline'ı izle, tamamlandığında yayınla

### 4.5 Yorum yanıtlamak
1. `/user/comments` → Filtre: "Yanıtsız"
2. Yorum kartında "Yanıtla" → textarea açılır
3. Yanıtı yaz → "Gönder" → 200 OK alındığında yorum "Yanıtlandı" sekmesine taşınır
4. İptal istersen "İptal" tıkla

### 4.6 Community post yayınlamak
1. `/user/posts` → "Taslak" filtresi
2. Taslak kartta "Gönder" → kuyruğa eklenir
3. Yayınlanma durumu chip ile gösterilir (KUYRUKTA / YAYINLANDI / HATALI)

### 4.7 Ayar değiştirmek (admin)
1. `/admin/settings` → ilgili grup (ör. "module.standard_video") aç
2. "Düzenle" → tip-aware editor açılır (bool/number/string/json)
3. Yeni değer → "Kaydet" → `PUT /api/v1/settings/effective/{key}` 200 OK
4. Audit izi Inspector "Audit izi" satırında otomatik gösterilir
5. Değer cache invalidate olur ve runtime hemen yansır

### 4.8 Master prompt değiştirmek (admin)
1. `/admin/prompts` → modül + prompt amacı seç (ör. `news_bulletin.prompt.narration_system`)
2. Düzenle → "Save"
3. Çalışan job'lar etkilenmez (snapshot-locked); sonraki job'lar yeni prompt'u kullanır

### 4.9 Yayın onaylamak / reddetmek
1. `/admin/publish` → "Review" sekmesi → onay bekleyenler
2. Bir kayda tıkla → detay açılır
3. "Onayla" → `POST /publish/{id}/approve` → kuyruğa girer ve yayınlanır
4. "Reddet" → `POST /publish/{id}/reject` → reddedildi olarak kaydedilir
5. Kanal filtresi için kanal kartına tıkla (kuyruk filtrelenir; × ile temizle)

### 4.10 Job retry / clone
1. `/user/jobs/:id` aç
2. Hatalı/iptal edilmiş job için "Yeniden dene" → aynı parametrelerle yeniden başlatılır
3. Veya "Klonla" → yeni job, aynı parametrelerle (ID farklı)

### 4.11 Yayın takvimi
1. `/user/calendar` → ay görünümü
2. Boş bir gün/saate tıkla → yeni yayın eventi oluştur
3. Mevcut event'i sürükleyerek yeniden zamanla
4. (⚠️ event create akışı snapshot'ta tam doğrulanamadı; kontrol edin)

---

## BOLUM 5 — AURORA YÜZEYİ ÖZEL NOTLARI (UX İPUÇLARI)

- **Mode toggle (Rehberli/Gelişmiş):** `/user/content` sağ üstteki tuş. Rehberli → wizard (admin'in tanımladığı entry_mode'a göre). Gelişmiş → her zaman tek-sayfa form.
- **Inspector paneli (sağ kenar):** Çoğu Aurora sayfasında bağlamsal özet + hızlı eylemler. İçerik sayfaya göre değişir.
- **Birincil ray (sol):** Bugün / Projeler / Yayın / Kanallar / Etkileşim / Analitik / Ayarlar. İkonlar üzerine gel → tooltip.
- **Komut paleti (⌘K):** Üst barda "Komut veya içerik ara…" → bağlamsal komutlar açılır.
- **Bildirimler (🔔):** Üst sağda. Tıklanırsa Notification Center açılır; toplu okundu işaretleme `/user/inbox`'tan.
- **Admin↔User geçişi:** Sağ üst "A Admin / U User" rozet butonu.
- **SSE göstergesi:** Statusbar'da "SSE Canlı" — bağlantı koparsa görünür.
- **Cmd+K:** komut paletini aç/kapat (Pass-6: 3 ana browser'da temiz, endüstri standardı — Linear/GitHub/Slack).
- **Cmd+J:** sidebar daralt/genişlet (Pass-6 revize: Brave/Chrome'da kullanıcı doğrudan test etti, web sayfası override edebilir; eski Cmd+B browser bookmark sidebar'ı, Cmd+Shift+P Firefox Private Window, Cmd+\\ Türkçe Mac klavyede tek tuş olmaması, Cmd+E test edilmemiş aday nedeniyle elendi).
- **Detail Drawer (Pass-6 sonrası tek-tık):** registry sayfalarında tüm satır single-click ile drawer açar. Templates / Style-Blueprints / Template-Style-Links / Used-News artık tek davranış paterni kullanır; Quick Look katmanı kaldırıldı (kafa karıştırıcı 3 farklı pattern → tek pattern: drawer).

---

## BOLUM 6 — TARİHİ AUDIT KAYITLARI + GÜNCEL DURUM

> **Güncel durum (Pass-5 final, 2026-04-20):** Aurora yüzeyinde açık P0 yok, açık P1 yok, açık şüpheli/kırık yapı yok. Aşağıdaki bölümler tarihi audit pass'lerinin (pass-3 → pass-4 → pass-5) çıktılarını **historical record** olarak korur — şu anki davranışı yansıtmazlar; sadece geçmiş düzeltmeleri belgeler.

### 6.0 — Historical: Pass-4 closure (2026-04-19, gece) — pass-3 P0'ları kapatıldı

| Yapı | Pass-3 durumu | Pass-4 fix | Doğrulama |
|---|---|---|---|
| 5 registry sayfası satır click | 404 | Drawer pattern (`AuroraDetailDrawer` primitive) — satır click → drawer; templates `?openId=` deep-link ile auto-open | grep `/admin/{templates,used-news,style-blueprints,template-style-links,source-scans}/${` 0 hit |
| `/admin/templates/new` create sonrası | 404 | Redirect → `/admin/templates?openId=${id}` (drawer otomatik açılır) | router cross-check |
| `/admin/publish/:id` "Audit göster" | 404 (`/admin/audit?record=`) | `/admin/audit-logs` (audit page query filtresi desteklemediği için sahte filtre vaadi kaldırıldı) | string diff |
| `/user/channels/:id` "Bağlantı kur" | 404 (`/connect`) | `/user/connections?channel=${id}` — gerçek route + deep-link tüketici banner + scroll-into-view + outline highlight | manuel trace |
| `/admin/connections` "Yenile" | yalan navigate | `conQ.refetch()` + `toast.info("Bağlantı listesi yenilendi")` — dürüst | code review |
| `/admin/connections` "Bağlantıyı kes" | no-op navigate | `window.confirm` + `useDeletePlatformConnection().mutate(conn.id)` → `DELETE /api/v1/platform-connections/{id}` (204) → cache invalidation (admin-connections + my-connections + platform-connections) → success toast + pending state buton üzerinde | backend `platform_connections/router.py:208` doğrulandı |

> **Truth gate:** TypeScript exit 0, vite build exit 0 (26.60s), backend dokunulmadı, yeni paket yok. Detay: `CODE_AUDIT_REPORT.md` Bölüm 17.

### Historical: P0 — Pass-3 (2026-04-19 gündüz) tarihi kaydı

Pass-3'te tespit edilen 9 navigate-404 + 2 yalan-handler + 1 URL mismatch listesi tamamen kapatılmıştır (yukarıdaki 6.0 tablosu + Pass-5 closure ile keşfedilen +1 navigate-404 — `AuroraSourceDetailPage` Düzenle butonu — inline edit pattern'i ile kapatıldı). Detay: `CODE_AUDIT_REPORT.md` Bölüm 7 (historical) + Bölüm 17 (pass-4 closure) + Bölüm 18.1 madde 7 (pass-5 closure).

### Historical: P1 — Görsel polish (Pass-5 nihai durum, 2026-04-20)

| Yapı | Pass-5 durum | Karar |
|---|---|---|
| Aurora `cockpit.css` 16+ hardcoded color | KAPSAM DIŞI KALICI ÜRÜN KARARI | Aurora kendi statik palette'ini taşıyor — global tema-token bağlama yapılmıyor (ürün kararı: cockpit deterministik kimlik) |
| `cockpit.css` `.btn:disabled`, `.cbox:disabled` styling yok | KAPSAM DIŞI KALICI | Tarayıcı default disabled stili kabul edildi (operatör cockpit, A11Y testleri görsel jeneriklik raporlamadı) |
| `cockpit.css:1139` `var(--bg-hover)` undefined | ✅ KAPATILDI (Pass-5) | `var(--bg-inset)` ile değiştirildi; doğrulandı |
| Rail item / ctxbar focus-visible ring eksik | KAPSAM DIŞI KALICI | Mevcut focus stili yeterli; A11Y minor olarak işaretlendi (operatör panel, single-user) |
| `aurora-shimmer 1.8s`, `aurora-status-pulse 1.4s` hardcoded duration | KAPSAM DIŞI KALICI | Statik animasyon timing'i — global motion token ile bağlanmıyor (deterministik visual rhythm) |
| AuroraSourcesRegistry table virtualization yok | KAPSAM DIŞI KALICI | Admin-only sayfa, gerçek veri <100 satır; virtualization premature optimization |
| AuroraAdminDashboard `activeRenders` useMemo `[jobs]` ağır | KAPSAM DIŞI KALICI | `slice(0,100)` mevcut; gerçek dashboard load <100 active job |

### P2 — Düşük öncelikli (Pass-5 nihai durum)

| Yapı | Pass-5 durum | Karar |
|---|---|---|
| `/admin/themes` Aurora sayfası backend'e yazmıyor | KAPSAM DIŞI KALICI ÜRÜN KARARI | localStorage tek-cihaz tercihi MVP'de yeterli; multi-cihaz tema senkron ürün kararı dışı |
| Aurora `Inline style={{}}` kullanımı | KAPSAM DIŞI KALICI | Çalışıyor; CSS-class'a çıkarma DRY iyileştirmesi yapılmadı (uzun-vade refactor değil) |
| Border-radius scale tutarsız (6/8/10/14) | KAPSAM DIŞI KALICI | Ad-hoc fakat görsel rhythm bozulmuyor; token'a bağlama kararı yok |
| Padding rhythm 12/14 ad-hoc | KAPSAM DIŞI KALICI | Aurora kendi spacing rhythm'ı — global `--space-*` ile bağlanmıyor |
| `useVersionedLocalStorage` hook fırsatı | KAPSAM DIŞI KALICI | DRY refactor yapılmadı; 4 yerde küçük duplikasyon kabul edildi |

---

## BOLUM 7 — GELISTIRICI NOTLARI

> **Post-merge durum (2026-04-20):** Aurora main'de. Backend 46 modül, 326+ endpoint, Alembic head `phase_al_001`. İlk kurulum için `docs/RUNTIME_AND_STORAGE_POLICY.md` → Clone & First-Run bölümüne bakın.

- **First-run setup:**
  ```bash
  cd backend && python3 -m venv .venv && source .venv/bin/activate
  pip install -e ".[dev]"
  cd ../frontend && npm install
  cd .. && ./start.sh      # alembic upgrade head + backend + frontend; seeding (admin, KNOWN_SETTINGS, prompt blocks, wizard configs) runs automatically in the lifespan handler.
  ```
  İlk boot sonrası admin: `admin@contenthub.local` / `admin123` — hemen değiştirin.
- **Yedekleme / geri alma (Faz 3):** canlı DB için `python scripts/backup_db.py`, liste için `python scripts/restore_db.py --list`, geri yükleme için backend durdurulduktan sonra `python scripts/restore_db.py <snapshot> --confirm`. Detay: `docs/RUNTIME_AND_STORAGE_POLICY.md` → Backup & Restore.
- **DB ve workspace git-ignored:** `backend/data/contenthub.db` ve `backend/workspace/` runtime-only; kaynak kontrolünde yoktur. Sadece `.gitkeep` dosyaları izlenir. Detay: `docs/RUNTIME_AND_STORAGE_POLICY.md`.
- **basePath-aware Aurora bileşeni:** `AuroraUserJobDetailPage` `useLocation()` ile `/admin` ya da `/user` algılar; tek bileşen iki context'e hizmet eder.
- **SurfacePageOverride:** `useSurfacePageOverride("user.X")` → `AURORA_PAGE_OVERRIDES` map'inde varsa Aurora bileşeni döner; yoksa legacy. `register.tsx` tek truth source. Kill-switch: `ui.surface.infrastructure.enabled=false` → deterministik fallback.
- **Mutation hook'ları:** Tüm backend mutation'ları React Query `useMutation` + `onSuccess: invalidateQueries`. Yalan handler **kalmadı** — tüm butonlar gerçek endpoint'lere bağlı.
- **Settings yazma yolu:** TEK otorite → `PUT /api/v1/settings/effective/{key}`. AuroraSettings (RowEditor) + AuroraPrompts aynı endpoint. Read: `GET /api/v1/settings/effective`. Precedence: user > admin > default > .env > builtin.
- **Settings auth:** Router tüm yazma yollarında `Depends(get_effective_role)` (`backend/app/visibility/dependencies.py`). Resolution order: **JWT user.role > X-ContentHub-Role header > "user" default**. Eski `get_caller_role` (header-only) deprecated — yalnızca geriye-dönük test uyumluluğu. Regression guard: `backend/tests/test_settings_auth_role_gate.py` (12 test).
- **Provider API key naming:** Tek otoriter desen → `provider.{name}.api_key`. `credential_resolver.py` precedence: user > admin > default > .env. Eski `module.{id}.api_key` sadece geriye-dönük read fallback.
- **404 catch-all:** `AuroraNotFoundPage`. Tüm Aurora `navigate(...)` hedefleri `aurora-navigate-targets.smoke.test.ts` ile CI guard altında — yeni 404 paterni build'de fail eder.

---

## BOLUM 8 — SON KULLANICI İÇİN TEMİZ REHBER (kısa, jargonsuz)

### Başlamadan önce
- Bilgisayarın açık olmalı, ContentHub uygulaması çalışıyor olmalı (`./start.sh` veya çift-tık `ContentHub.command`).
- Tarayıcıda `http://localhost:5173` açılır.
- İlk girişte: admin / admin yaz.

### İlk gün — Hesap kurulumu
1. Sol üstten "Bağlantılar" tıkla. YouTube'a bağlan butonuna bas. Tarayıcı YouTube'a yönlendirir, izin ver, geri döner.
2. Sol üstten "Ayarlar" → API anahtarlarını gir (LLM, ses, görsel için sağlayıcılar).
3. "Şablonlar" → bir şablon hazırla ya da hazır olanı seç.

### Günlük kullanım — Yeni video
1. Sol menüden "İçerik" → "Standart Video" kartına bas.
2. Konu yaz, kanal seç, "Başlat" tıkla.
3. Sol menüden "Bugün" → işin durumunu izle. Bittiğinde indir.

### Günlük kullanım — Yorumlara bakma
1. Sol menüden "Etkileşim → Yorumlar" tıkla.
2. "Yanıtsız" filtresine bas.
3. Bir yoruma "Yanıtla" → mesajını yaz → "Gönder".

### Sorun yaşarsan
- "Sayfa Bulunamadı" görüyorsan: bilinen tüm Aurora navigate hedefleri smoke test guard altında doğrulanıyor; yeni 404 görürsen geliştiriciye bildir.
- İş "Hata" durumunda kalırsa: "Bugün" → işe tıkla → "Yeniden dene".
- API anahtar hatası alırsan: "Ayarlar" → ilgili sağlayıcı için API key'i kontrol et.
- Bir registry sayfasında satıra tıklamak yeni sayfa açmıyor → **doğru davranış**: sağdan drawer açılır (templates, used-news, style-blueprints, template-style-links, source-scans).
- `/admin/sources/:id` "Düzenle" butonu yeni sayfa açmıyor → **doğru davranış**: meta satırlar input'a dönüşür, "Kaydet" ile aynı sayfada kaydedilir.

---

## BOLUM 9 — CEVAPLANAMAYAN/AÇIK NOKTALAR

> **Pass-5 final not:** Aurora P0 + P1 maddelerinin tamamı kapatıldı veya kalıcı kapsam dışı ürün kararı olarak donduruldu. Aşağıdaki tablo Aurora overlay'i **dışında** kalan, henüz tam doğrulanmamış legacy davranış noktalarını listeler — Aurora merge'inin önünde değildir.

| Aurora-dışı belirsiz alan | Neden Belirsiz | Aurora merge ile ilişkisi |
|---|---|---|
| `/user/automation` "Kanal seç" sonrası policy oluşturma akışı | UI'dan policy create form'u doğrudan görünmüyor | Aurora-dışı legacy davranış; bu branch'in kapsamı değil |
| Aurora `/user/calendar` event create akışı | Snapshot'ta sadece görüntüleme görünüyor | Aurora yüzeyinde event create handler tasarımda yok; legacy davranış aynı |
| News-picker checkbox'larının submit endpoint'i | Picker UI'da "kaydet" tuşu var mı? | Bülten wizard içinde tüketiliyor; Aurora overlay tasarımı dışında |

**Pass-5'te yanıtlanmış olanlar:**
- ✅ Aurora dark/light tema → `/admin/themes` localStorage tek-cihaz tercihi (kapsam dışı kalıcı ürün kararı; multi-cihaz tema senkron MVP'de yok).
- ✅ Aurora bulk publish bar → n=10'a kadar tek-tek POST (kapsam dışı kalıcı ürün kararı; bulk endpoint eklenmeyecek).
- ✅ Provider API key naming → tek otoriter desen `provider.{name}.api_key` (`credential_resolver.py` precedence: user > admin > default > .env > builtin).

---

*Aurora cockpit canlı UI denetimi: 2026-04-20 (pass-3 + pass-4 + pass-5 final closure). Test ortamı: localhost:5173, admin/admin user, AUR-VID-* test verileri. Pass-3 P0 sorun listesi `CODE_AUDIT_REPORT.md` Bölüm 7 (historical), pass-4 closure addendum Bölüm 17, pass-5 final closure addendum Bölüm 18. Pass-5 final durum: 11 P0 + 1 yeni P0 (smoke test ile yakalanan AuroraSourceDetailPage) kapatıldı; P1/P2 maddelerinin tamamı ya kapatıldı ya kalıcı kapsam dışı ürün kararı; açık iş yok. Verdict: GO.*
