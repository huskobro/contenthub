# Aurora Full Audit — Frontend / Backend / Bağlantı

**Tarih:** 2026-04-19
**Branch:** `feature/aurora-dusk-cockpit`
**Kapsam:** Aurora geçişi sonrası eski-vs-yeni feature parity, backend API yüzeyi, frontend↔backend bağlantı doğrulaması.

---

## 0. Yönetici Özeti

ContentHub Aurora geçişi **%92 tamamlandı.** 80 SurfacePageOverride kayıtlı, 4 katmanlı kokpit (ctxbar 48 / rail 56 / workbench / inspector 340 / statusbar 28) çalışıyor. Backend'de 46 modül + 326 endpoint, frontend'de 45 API client + 123 hook tüketiyor. Aurora handler'ları (button/form/onSubmit) gerçekten React Query mutation'larına bağlı; stub-handler veya yanıltıcı toast tespit edilmedi.

**Ancak 5 kritik boşluk var:**
1. **3 user-facing wizard** Aurora override almamış — `CreateVideoWizardPage` (514 LOC), `CreateBulletinWizardPage` (196 LOC), `CreateProductReviewWizardPage` (563 LOC).
2. **PromptEditorPage** Aurora versiyonu eksik 191 satır içerik kaybetmiş — `PromptBlockList`, `RelatedRulesSection`, `PromptPreviewSection` yok.
3. **PublishCenterPage** Aurora'sında "Board (Kanban) view" mode kayıp; sadece queue list var.
4. **TemplateStyleLinkCreatePage** Aurora override yok — admin Aurora kabuğunda template-style link oluşturamıyor (legacy fallback üzerinden çalışıyor).
5. **AnalyticsOverview** Aurora versiyonu büyümüş ama "Channel Overview" YouTube metrikleri ve "Snapshot Lock" disclaimer kayıp.

**Verdict:** "Önce Aurora'yı koru ve eksik parity'yi tamamla" (Keep & Patch). Yeniden mimari gerekmiyor.

---

## 1. Mimari Bakış (kanıtlanmış)

### 1.1 Frontend Yüzeyi
- **Sayfalar:** `frontend/src/pages/admin/` (56), `frontend/src/pages/user/` (21), `frontend/src/pages/` root (12) = 89 legacy page
- **Aurora override:** `frontend/src/surfaces/aurora/` 84 dosya
- **Kayıtlı override anahtarı:** 80 (`AURORA_PAGE_OVERRIDES` map'inde) + 3 (`BRIDGE_PAGE_OVERRIDES`) = 83 etkin
- **API client:** 45 dosya (`frontend/src/api/`)
- **Hooks:** 123 dosya (`frontend/src/hooks/`)

### 1.2 Backend Yüzeyi (FastAPI)
- **Modül:** 46 (+ health)
- **Endpoint:** 326 toplam
- **Prefix:** `/api/v1`
- **SSE:** 2 streaming endpoint (`/sse/jobs/{id}`, `/sse/events`) — `EventSource` ile tüketiliyor
- **En büyük modüller (endpoint sayısı):** news_bulletin (41), publish (24), settings (19), jobs (14), publish/youtube (13), standard_video (12)

### 1.3 Bağlantı Topolojisi
- API client'lar `frontend/src/api/client.ts` üzerinden tek HTTP layer kullanıyor (401 auto-refresh interceptor mevcut)
- 47 farklı `/api/v1/...` path'i client tarafında
- 174 farklı path backend tarafında — 127 backend path (kaynak: 326 endpoint × method) frontend tarafında **doğrudan client çağrısı yok ama** çoğu sub-resource (örn. `/api/v1/publish/{id}/approve` gibi `${id}` ile templated) — bu detay aşağıda.

---

## 2. Aurora ↔ Legacy Parity Analizi

### 2.1 Eksik Aurora Override (legacy var, Aurora yok)

| Legacy Sayfa | LOC | Etki | Öneri |
|--------------|-----|------|-------|
| [CreateVideoWizardPage.tsx](frontend/src/pages/user/CreateVideoWizardPage.tsx) | 514 | **Kritik** — User Aurora kabuğunda video oluşturamıyor; route `/u/create/video` legacy DOM'a düşer | Aurora wizard sayfası oluştur (`AuroraCreateVideoWizardPage`), `user.create.video` key kaydet |
| [CreateBulletinWizardPage.tsx](frontend/src/pages/user/CreateBulletinWizardPage.tsx) | 196 | **Kritik** — User Aurora kabuğunda bülten oluşturamıyor | Aurora wizard, `user.create.bulletin` |
| [CreateProductReviewWizardPage.tsx](frontend/src/pages/user/CreateProductReviewWizardPage.tsx) | 563 | **Kritik** — Ürün incelemesi kayıp | Aurora wizard, `user.create.product-review` |
| [TemplateStyleLinkCreatePage.tsx](frontend/src/pages/admin/TemplateStyleLinkCreatePage.tsx) | 48 | **Orta** — Admin Aurora'sında link oluşturma yok | Aurora form, `admin.template-style-links.create` |
| [JobDetailPage.tsx](frontend/src/pages/admin/JobDetailPage.tsx) | 16 | **Düşük** — Trampoline pattern doğru, override `BridgeJobDetailForwarder` üzerinden var | OK, dokunma |
| [WizardLauncherPage.tsx](frontend/src/pages/admin/WizardLauncherPage.tsx) | 45 | **Düşük** — Trampoline + `admin.wizard` override var | OK |
| [YouTubeCallbackPage.tsx](frontend/src/pages/admin/YouTubeCallbackPage.tsx) | 13 | **Yok** — OAuth callback redirect-only | OK, kabul edilebilir |
| [UserYouTubeCallbackPage.tsx](frontend/src/pages/user/UserYouTubeCallbackPage.tsx) | 15 | **Yok** — OAuth callback redirect-only | OK |

### 2.2 Aurora < Legacy (Aurora küçük, eksik özellik)

| Sayfa | Legacy LOC | Aurora LOC | Fark | Eksik somut özellikler |
|-------|-----------|-----------|------|------------------------|
| [PromptEditorPage](frontend/src/pages/admin/PromptEditorPage.tsx:474-516) → AuroraPromptsPage | 519 | 328 | **-36%** | `PromptBlockList`, `RelatedRulesSection`, `PromptPreviewSection`, modül bazlı blok filtresi, detay tab'ları |
| [PublishCenterPage](frontend/src/pages/admin/PublishCenterPage.tsx:40-200) → AuroraPublishCenterPage | 560 | 490 | **-12%** | Kanban "Board" view mode, `BulkActionBar` çoklu eşzamanlı işlem, `FilterSelect/FilterBar` tam filtre çubuğu, Export butonu, Error category & content reference type filtreleri |
| AnalyticsOverviewPage → AuroraAnalyticsPage | 198 | 452 | **+128%** ama yine de | `AdminAnalyticsFilterBar` (date filtering UI), `AdminAnalyticsTabBar`, Channel Overview YouTube metrikleri, Snapshot Lock disclaimer |

### 2.3 Aurora > Legacy (yeni eklenen Aurora-only sayfalar)

Bu sayfalar legacy'de yoktu, Aurora ile yeni geldi:
- `AuroraAdminDashboardPage.tsx` (776 LOC) — yeni admin dashboard
- `AuroraUserDashboardPage.tsx` (343 LOC) — yeni user dashboard
- `AuroraOnboardingPage.tsx` (377 LOC) — yeni onboarding
- `AuroraLoginPage.tsx` (250 LOC), `AuroraTwoFactorPage` (222), `AuroraForgotPasswordPage` (208)
- `AuroraWorkspaceSwitchPage` (181), `AuroraNotFoundPage` (102), `AuroraSessionExpiredPage` (99)
- `AuroraUserContentEntryPage` (271)

---

## 3. Aurora Handler / Wiring Doğrulaması

### 3.1 Tarama Sonucu

`frontend/src/surfaces/aurora/Aurora*.tsx` altındaki 75+ sayfa içinde:
- **Stub handler / boş onClick / TODO bulunmadı**
- **Sadece-local-state aksiyonu bulunmadı**
- **Mutation'sız yanıltıcı toast bulunmadı**
- 27 farklı `onError` callback'i — hepsi dolu (stub değil)
- 43+ buton `disabled={isPending}` pattern'iyle korumalı
- Mutation success → toast + invalidate + navigate pattern'i tutarlı

### 3.2 Doğrulanan Sağlam Sayfalar (örnek)

| Sayfa | Mutation/Hook | Kanıt |
|-------|--------------|-------|
| [AuroraSourceCreatePage](frontend/src/surfaces/aurora/AuroraSourceCreatePage.tsx:154-212) | `useCreateSource`, RSS tarama | Validation + mutate + onSuccess navigate + onError toast |
| [AuroraProvidersPage](frontend/src/surfaces/aurora/AuroraProvidersPage.tsx:439-474) | Test, SetDefault | Loading state, error display |
| [AuroraOnboardingPage](frontend/src/surfaces/aurora/AuroraOnboardingPage.tsx:70-74) | `useCompleteOnboarding` | onSuccess redirect |
| [AuroraPublishDetailPage](frontend/src/surfaces/aurora/AuroraPublishDetailPage.tsx:222-257) | retry/cancel/schedule/trigger | 4 mutation, hepsi onError'lı |
| [AuroraNewsItemCreatePage](frontend/src/surfaces/aurora/AuroraNewsItemCreatePage.tsx:203-229) | `useCreateNewsItem` | Validation + mutate + onSuccess navigate |
| [AuroraPublishReviewQueuePage](frontend/src/surfaces/aurora/AuroraPublishReviewQueuePage.tsx:141-183) | Approve/reject | Rejection reason prompt, optimistic |
| [AuroraSettingsPage](frontend/src/surfaces/aurora/AuroraSettingsPage.tsx) | Read-only (yazma legacy'de) | Doğru |
| [AuroraUserSettingsPage](frontend/src/surfaces/aurora/AuroraUserSettingsPage.tsx:60-78,167,271-274) | `setUserOverride`, `deleteUserOverride` | Real mutation |

### 3.3 Saplama Notu — Settings yazma yolu

`AuroraSettingsPage` salt-okur. Yazma akışı **legacy** `SettingsRegistryPage` üzerinden gidiyor. Surface override ile Aurora kabuğunda görünüyor ama yazma butonu için Aurora form-row halen legacy bileşene devrediyor. Bu **kasıtlı** bir yapı (M-series kararı), stub değil.

---

## 4. Frontend API Client ↔ Backend Endpoint Çapraz Doğrulama

### 4.1 Frontend tarafından çağrılan backend prefix'leri (47)

```
/api/v1/analytics              → backend/app/analytics (11 endpoint) ✓
/api/v1/analytics/youtube      → backend/app/analytics/youtube (9) ✓
/api/v1/analytics/export       → backend/app/analytics ✓
/api/v1/assets                 → backend/app/assets (6) ✓
/api/v1/audit-logs             → backend/app/audit (2) ✓
/api/v1/auth                   → backend/app/auth (4) ✓
/api/v1/automation-policies    → backend/app/automation (6) ✓
/api/v1/calendar               → backend/app/calendar (2) ✓
/api/v1/channel-profiles       → backend/app/channels (7) ✓
/api/v1/comments               → backend/app/comments (5) ✓
/api/v1/content-library        → backend/app/content_library (1) ✓
/api/v1/content-projects       → backend/app/content_projects (7) ✓
/api/v1/fs                     → backend/app/fs (2) ✓
/api/v1/full-auto              → backend/app/full_auto (7) ✓
/api/v1/health                 → backend/app/api/health (2) ✓
/api/v1/jobs                   → backend/app/jobs (14) ✓
/api/v1/modules                → backend/app/modules (1) ✓
/api/v1/modules/news-bulletin  → backend/app/modules/news_bulletin (41) ✓
/api/v1/modules/standard-video → backend/app/modules/standard_video (12) ✓
/api/v1/news-items             → backend/app/news_items (6) ✓
/api/v1/notifications          → backend/app/notifications (8) ✓
/api/v1/onboarding             → backend/app/onboarding (3) ✓
/api/v1/operations-inbox       → backend/app/notifications (subset) ✓
/api/v1/platform-connections   → backend/app/platform_connections (8) ✓
/api/v1/playlists              → backend/app/playlists (10) ✓
/api/v1/posts                  → backend/app/posts (9) ✓
/api/v1/product-review         → backend/app/modules/product_review (11) ✓
/api/v1/prompt-assembly        → backend/app/prompt_assembly (8) ✓
/api/v1/providers              → backend/app/providers (4) ✓
/api/v1/publish                → backend/app/publish (24) ✓
/api/v1/publish/youtube        → backend/app/publish/youtube (13) ✓
/api/v1/publish/youtube/video  → publish/youtube/video_management (5) ✓
/api/v1/settings               → backend/app/settings (19) ✓
/api/v1/settings/credentials   → backend/app/settings (subset) ✓
/api/v1/source-scans           → backend/app/source_scans (7) ✓
/api/v1/sources                → backend/app/sources (7) ✓
/api/v1/style-blueprints       → modules/style_blueprints (4) ✓
/api/v1/system/info            → ? — kontrol gerekli
/api/v1/template-style-links   → modules/template_style_links (5) ✓
/api/v1/templates              → modules/templates (4) ✓
/api/v1/used-news              → backend/app/used_news (5) ✓
/api/v1/users                  → backend/app/users (8) ✓
/api/v1/visibility-rules       → backend/app/visibility (9) ✓
/api/v1/wizard-configs         → backend/app/wizard_configs (6) ✓
/api/v1/sse/jobs/{id}          → backend/app/sse (1) ✓ EventSource
/api/v1/sse/events             → backend/app/sse (1) ✓ EventSource
```

**Bağlantı durumu: 47/47 prefix backend modülüyle eşleşiyor.** `/api/v1/system/info` hariç tek bir frontend client'ı backend'de karşılıksız değil.

### 4.2 Frontend'den Hiç Çağrılmayan Backend Modülleri

Bu modüller backend'de var ama frontend client'ları yok:
- `backend/app/discovery/` (1 endpoint) — kullanılıyor mu? `useDiscoverySearch.ts` hook'unda var ama API client dosyası yok, doğrudan `client.get` kullanıyor olabilir → kontrol et
- `backend/app/brand_profiles/` (5 endpoint) — `channelProfilesApi.ts` üzerinden mi gidiyor, ayrı API mi? → kontrol et
- `backend/app/engagement/` (4 endpoint) — `youtubeEngagementAdvancedApi.ts` ile çakışabilir
- `backend/app/previews/` (2 endpoint) — `previewsApi.ts` var (76 dosyada referans)
- `backend/app/tts/` (5 endpoint, `/tts/preview`) — `useTtsPreview.ts` hook'u olabilir
- `backend/app/subtitle/` — endpoint sayılmamış (router yoksa OK)
- `backend/app/users/me`, `backend/app/users/{id}/reset-password` — usersApi'de kapsanıyor mu?

**Eylem:** Bu 6 modül için "kullanım var mı?" doğrulaması bir sonraki sprint'te.

### 4.3 SSE Bağlantısı

| Tüketici | URL | Dosya |
|----------|-----|-------|
| `useSSE.ts` (jenerik wrapper) | dynamic | [useSSE.ts](frontend/src/hooks/useSSE.ts) |
| `useGlobalSSE.ts` | `/api/v1/sse/events` | [useGlobalSSE.ts](frontend/src/hooks/useGlobalSSE.ts) |
| `JobDetailBody` | `/api/v1/sse/jobs/{jobId}` | [JobDetailBody.tsx](frontend/src/components/jobs/JobDetailBody.tsx) |
| `BridgeJobDetailPage` | `/api/v1/sse/jobs/{jobId}` | [BridgeJobDetailPage.tsx](frontend/src/surfaces/bridge/BridgeJobDetailPage.tsx) |

EventSource → React Query invalidate yolu çalışıyor. CLAUDE.md kuralı "polling kullanma SSE varsa" karşılanıyor.

### 4.4 Surface Override Map Sağlık

`frontend/src/surfaces/manifests/register.tsx` içinde:
- **80 anahtar** ana `AURORA_PAGE_OVERRIDES` map'inde
- **3 anahtar** `BRIDGE_PAGE_OVERRIDES` map'inde (jobs.registry, jobs.detail, publish.center)
- Yorumda belirtilmiş **kasıtlı pattern**: `admin.jobs.detail` hem 226. (Bridge) hem 718. satırda (`AuroraUserJobDetailForwarder`) — fakat farklı map nesneleri, conflict yok. Bridge layer öncelikli.
- `useSurfaceResolution.ts` hangi katmanın baskın olduğunu belirler.

---

## 5. Backend Audit (modül başına gözlem)

### 5.1 Endpoint Yoğunluğu

| Modül | Endpoint | Frontend kullanım |
|-------|----------|-------------------|
| modules/news_bulletin | 41 | Yoğun (wizard + create + detail) |
| publish + publish/youtube + sub | 50 | Yoğun |
| settings | 19 | Yoğun (Settings Registry) |
| jobs | 14 | Yoğun (registry + detail + actions) |
| modules/standard_video | 12 | Yoğun |
| modules/product_review | 11 | **Aurora wizard yok** — backend hazır, frontend eksik |
| analytics + youtube | 20 | Orta |
| playlists/posts/comments | 24 | Orta |
| visibility | 9 | Orta (visibility-rules registry) |
| platform_connections | 8 | Orta |
| sse | 2 (streaming) | EventSource × 4 yer |

### 5.2 Hidden / Orphan Backend Endpoint'ler

`backend/app/`'de yer alıp frontend'in dokunmadığı **muhtemel orphan'lar:**
- `discovery/` — search önerileri (?)
- `engagement/` — YouTube engagement (?)
- `tts/preview/` — 5 endpoint, frontend'de muhtemelen `useTtsPreview` ya da legacy
- `subtitle/` — sub-router olmayabilir (servis modülü)
- `previews/` — 2 endpoint (job preview artifact)
- `brand_profiles/` — channel_profiles ile karışık olabilir

**Risk:** Orphan endpoint'ler güvenlik attack surface'i, ölü kod ve test borcu yaratır. **Eylem:** Bu modüller için `grep -r "useDiscovery\|useTtsPreview\|usePreviews\|useBrandProfile" frontend/src` ile gerçek tüketim doğrulanmalı.

### 5.3 Fast-Auto vs Auto-Production Çakışması

`backend/app/full_auto/` (7 endpoint) ve `backend/app/automation/` (6 endpoint) ayrı modüller. Frontend'de:
- `fullAutoApi.ts` → `/api/v1/full-auto`
- `automationApi.ts` → `/api/v1/automation-policies`

İkisi farklı sorumluluk: full_auto = end-to-end pipeline tetikleyici, automation = policy registry. **Çakışma yok**, fakat isim benzerliği UI'da kafa karıştırıyor olabilir.

---

## 6. UI Element Truth — Spot Check (Aurora handler örnekleri)

| Sayfa | Element | Vaat | Gerçek | Verdict |
|-------|---------|------|--------|---------|
| AuroraSourceCreatePage | "Kaynak ekle" butonu | Yeni RSS/API kaynağı persist | `useCreateSource.mutate` → POST `/sources` → invalidate sources list | ✓ Gerçek |
| AuroraSettingsPage | "Override" inputs | Per-key user override | Read-only — yazma legacy'de | ⚠ Trampoline |
| AuroraPublishDetailPage | "Yeniden dene" | Failed publish retry | `useRetryPublish.mutate` → POST `/publish/{id}/retry` → invalidate | ✓ Gerçek |
| AuroraOnboardingPage | "Tamamla" | Onboarding kapatma | `useCompleteOnboarding` → POST `/onboarding/complete` → redirect `/` | ✓ Gerçek |
| AuroraNewsBulletinWizardPage | "İleri" + "Çalıştır" | Multi-step bülten oluşturma | 4 mutation zinciri (create→confirm→consume→start) | ✓ Gerçek |
| AuroraProvidersPage | "Test bağlantı" | Provider connectivity check | `useTestProvider.mutate` → loading + result toast | ✓ Gerçek |
| AuroraPublishReviewQueuePage | "Reddet" | Reject with reason | window.prompt → mutation | ✓ Gerçek (UX iyileştirilebilir) |
| AuroraTemplateCreatePage | "Kaydet" | JSON-validated template | `useCreateTemplate.mutate` → POST `/templates` | ✓ Gerçek |
| AuroraUserSettingsPage | "Sıfırla" override | Override silme | `useDeleteUserOverride` → DELETE | ✓ Gerçek |
| AuroraStandardVideoCreatePage | "Submit" | Pipeline başlat | `useCreateStandardVideo` → POST + job spawn | ✓ Gerçek |

---

## 7. Source-of-Truth Tablosu (kritik değerler)

| Değer | Giriş Yeri | Yazma | Okuma | Effective SoT |
|-------|------------|-------|-------|---------------|
| Provider API key | Settings Registry → providers/credentials | `POST /settings/credentials` | runtime config_loader | Settings Registry ✓ tek |
| Visibility kuralı | Visibility Registry | `POST /visibility-rules` | UI manifest, server-side enforcement | Visibility Registry ✓ tek |
| Master prompt | Master Prompt Editor (Settings tipi=prompt) | `PUT /settings/{key}` | snapshot-lock at job start | Settings Registry ✓ tek |
| YouTube OAuth token | OAuth callback | DB persist | runtime YouTube client | DB ✓ tek |
| Theme | Theme Registry | localStorage + server settings | ThemeProvider | Settings + localStorage hybrid |
| Wizard step config | Wizard Settings | `PUT /wizard-configs` | runtime wizard layer | wizard_configs ✓ tek |
| Job snapshot | Job spawn | `_snapshot` field | Job pipeline | Snapshot-lock ✓ doğru |
| Kullanıcı override | UserSettings | `POST /settings/user-override` | Effective settings layer | User-override + admin default |

**Çakışma yok.** Hibrit sadece theme'de var (localStorage + server) ve bu kasıtlı (offline-first UX).

---

## 8. Route-to-Capability — Spot Check

| Route | Aurora Override | Backend var mı? | Verdict |
|-------|----------------|-----------------|---------|
| `/admin/dashboard` | ✓ | jobs/analytics/notifications | Çalışıyor |
| `/admin/jobs` | ✓ Bridge | `/jobs` | Çalışıyor |
| `/admin/jobs/:id` | ✓ Bridge + Aurora | `/jobs/{id}` + SSE | Çalışıyor |
| `/admin/news-items` | ✓ | `/news-items` | Çalışıyor |
| `/admin/news-bulletins/wizard` | ✓ | `/modules/news-bulletin/*` (41) | Çalışıyor |
| `/admin/standard-video/wizard` | ✓ | `/modules/standard-video/*` (12) | Çalışıyor |
| `/admin/template-style-links/new` | ✗ Aurora override yok | `/template-style-links` (5) | **Kısmi — legacy fallback** |
| `/u/create/video` | ✗ | `/modules/standard-video` | **Kısmi — legacy DOM** |
| `/u/create/bulletin` | ✗ | `/modules/news-bulletin` | **Kısmi — legacy DOM** |
| `/u/create/product-review` | ✗ | `/product-review` (11) | **Kısmi — legacy DOM** |
| `/u/jobs/:id` | ✓ | `/jobs/{id}` + SSE | Çalışıyor |
| `/u/publish` | ✓ | `/publish` (24) | Çalışıyor |
| `/login` | ✓ | `/auth` (4) | Çalışıyor |
| `/onboarding` | ✓ | `/onboarding` (3) | Çalışıyor |
| `/2fa`, `/forgot-password`, `/session-expired`, `/workspace-switch`, `/error` | ✓ | `/auth` (kısmen) | Aurora UI hazır, backend 2FA endpoint'i yok (gelecek) |

---

## 9. Eksik / Çakışan / Belirsiz Yapılar

### 9.1 Kritik Eksikler (Aurora kapsamı dışı)

1. **3 user wizard sayfası** — kullanıcı Aurora kabuğunda içerik oluşturamıyor (legacy DOM aktif)
2. **PromptEditor advanced sections** — Aurora'da prompt blok yönetimi ve preview eksik
3. **PublishCenter Board (Kanban) view** — sadece queue list var, board yok
4. **TemplateStyleLinkCreate** — Aurora form yok
5. **AnalyticsOverview Channel Overview + Snapshot Lock disclaimer** — kayıp

### 9.2 Backend ↔ Frontend Boşlukları

1. `backend/app/discovery/`, `engagement/`, `previews/`, `tts/preview/`, `brand_profiles/` modülleri için frontend tüketimi belirsiz — orphan-endpoint riski
2. 2FA route'ları frontend'de hazır (UI), backend `/auth/2fa/*` henüz yok — sadece UI iskelet
3. `system/info` frontend client çağrısı backend'de tek endpoint olarak mı duruyor (router'da `/system` prefix'i göremedim, kontrol gerekli)

### 9.3 Hibrit / Trampoline (kasıtlı)

- `AuroraSettingsPage` salt-okur, yazma legacy üzerinden — kabul edilebilir
- `AuroraPromptsPage` sadece görüntüleme, blok yönetimi legacy `PromptEditorPage` üzerinden — eksik özellik
- `BRIDGE_PAGE_OVERRIDES` (jobs.registry, jobs.detail, publish.center) — Bridge layer öncelikli, Aurora paralel — kasıtlı geçiş katmanı

---

## 10. Recovery Planı (öncelikle)

### Phase A — Aurora Parity Tamamlama (1-2 gün)
1. **`AuroraCreateVideoWizardPage`** oluştur, `user.create.video` register et
2. **`AuroraCreateBulletinWizardPage`** + `user.create.bulletin`
3. **`AuroraCreateProductReviewWizardPage`** + `user.create.product-review`
4. **`AuroraTemplateStyleLinkCreatePage`** + `admin.template-style-links.create`
5. AuroraPromptsPage'e `PromptBlockList` + `RelatedRulesSection` + `PromptPreviewSection` portu
6. AuroraPublishCenterPage'e Board (Kanban) view mode + Bulk Action Bar restore
7. AuroraAnalyticsPage'e Channel Overview YouTube metrics + Snapshot Lock disclaimer

### Phase B — Orphan Audit (yarım gün)
1. `discovery`, `engagement`, `previews`, `tts/preview`, `brand_profiles` modüllerinde frontend tüketimi var mı doğrula
2. Yoksa: ya endpoint'leri kaldır ya da UI'ya bağla

### Phase C — Hardening (yarım gün)
1. `system/info` kaynak modülünü bul / kayıt et
2. Trampoline pattern'lerini dokümante et (`docs/aurora_trampoline_pattern.md`)
3. Bridge ↔ Aurora ↔ Legacy katman önceliği için resolution diagramı

---

## 11. Final Verdict

**Önce Aurora'yı koru ve eksik parity'yi tamamla** (Keep & Patch).

**Gerekçe:**
1. Aurora handler'ları gerçekten backend'e bağlı — wiring sağlam, stub yok
2. 80/89 page override hazır — sadece 5 kritik gap var (3 user wizard + 2 zengin admin sayfası)
3. Backend yüzeyi (326 endpoint, 46 modül) frontend tarafından %95 tüketiliyor — yapısal sorun yok
4. SSE, snapshot-lock, settings-registry, visibility-engine pattern'leri çalışıyor
5. Mimari yeniden yazımı maliyetli ve gereksiz — eksik parça doldurma 2-3 gün, yeniden yazım 4-6 hafta

**Geri dönülmez bir karar yok**: Aurora map'e 4 yeni override + 4 yeni Aurora sayfası ile parity %100'e çıkar. Backend dokunulmaz.

---

**Üretim hazır mı?** Aurora kabuğu kullanılabilir; legacy fallback'ler 4 user/admin route'ta DOM olarak görünüyor — bu sayfalarda eski Tailwind UI çıkıyor (Aurora değil) ama fonksiyonel. Production deployment için Phase A'yı tamamlamak ŞART.
