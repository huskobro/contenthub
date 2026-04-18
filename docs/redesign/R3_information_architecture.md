# FAZ R3 — Yeni Bilgi Mimarisi (IA) Önerisi

> **Amaç:** R1 envanterini (97 sayfa, 12 layout, 6 duplicate çift, 54/54 admin scope-agnostic) ve R2 pattern listesini (top-15) alıp, **mevcut omurgayı bozmadan** yeni bir admin+user IA önerisi çıkarmak. Kod YAZILMAZ — sadece şema, tablo, rasyonel.
>
> **Kilitli ilke:** Tenant-scoped user isolation + Admin all-users view.
> **Dokunulmaz:** `useLayoutNavigation.ts` single source (struktür kalır; grup isimleri/sıralaması güncellenebilir), Settings Registry, Visibility Engine, React Query/Zustand ayrımı, Remotion composition mapping, publish state machine, F4 ownership guards.
> **Dil:** Türkçe.
> **Çıktı:** Bu dokümanın kendisi. R6 öncesi kod yok.

---

## 0. Yönetici Özeti (12 Madde)

1. **Admin sidebar 54 maddeden ~33'e indirilir** (— yaklaşık %39 azalma). Uygulama `useLayoutNavigation.ts` içindeki `ADMIN_NAV` + `HORIZON_ADMIN_GROUPS` güncellemesi — yeni dosya şart değil.
2. **User sidebar 21 maddeden ~15'e indirilir.** Duplicate'lar (Analytics 2×, Kanal Performansı 2× vb.) tek girişte toplanır.
3. **6 duplicate admin/user çifti:** Calendar, Connections, Inbox, JobDetail, YouTubeAnalytics, YouTubeCallback → **kod birleştirme değil**, yalnız IA seviyesinde "tek canonical yer" kararı. Admin zaten kullanıcıya `scope=X` ile girip kullanıcının sayfasını görebilmeli (R3 hook'larıyla).
4. **Yeni 4 yüzey önerisi (kod yok, yalnız mimari):**
   - `AdminScopeSwitcher` (persistent header chip, Zustand store, query-key contamination)
   - `UserIdentityStrip` (sticky, user panel top)
   - `AdminDashboardPage` (digest landing, mevcut `/admin` evrim)
   - `UserDashboardPage` (digest landing, mevcut `/user` evrim)
5. **Surface canon kararı:** Classic + Horizon = canonical. Atrium, Bridge, Canvas → **preview/prototype rolünde kalır**, kill-switch altında. Üretim yolunda **Horizon default** önerilir (admin + user). Legacy classic layout kapatılmaz (fallback).
6. **Wizard canon:** Tek motor + iki shell kararı. `StandardVideoWizardPage` (admin) ve `CreateVideoWizardPage` (user) ortak engine'e (`lib/wizard/engine.ts` yeni) bağlanır; biri 1409 LoC tam + 195 LoC shell ikilisi yerine "config-driven" model — ama **bu iş R4'te planlanır, R3'te sadece ilke**.
7. **Navigation gruplandırması yeniden düzenlenir:** "Üretim", "Yayın & Takvim", "Kanallar & Varlıklar", "Analitik", "Otomasyon", "Haber", "Sistem" (admin için). Kullanıcı: "Bugün", "Üretim", "Yayın", "Kanallar", "Analitik", "Ayarlar".
8. **Kritik yeni sayfa:** `/admin/dashboard` = mevcut `/admin` "Genel Bakış"ın evrimi. Digest widgets: failed jobs / pending reviews / retry candidates / channel health / today's publish queue.
9. **Settings Registry → modül-başı landing:** Bugün `SettingsRegistryPage` tek uzun sayfa (204 entry). Öneri: modül-başına landing alt-sayfa (`/admin/settings/tts`, `/admin/settings/publish`, ...) — mevcut grup yapısı zaten `SettingsGroup` kavramına sahip.
10. **Asset ↔ Style opsiyonel merge ertelenir.** "Brand Hub" R5 sonrası isteğe bağlı, zorunlu değil. Yanlış merge riski yüksek.
11. **Inbox ↔ Comments birleştirilmez.** Farklı veri modelleri (generic notifications vs platform_post_comments). R3 kararı: **ayrı kalsın**.
12. **Mobile / PWA hâlâ R6 sonrası.** R3 IA responsive-friendly önerilir (Horizon rail + collapsible groups), ama PWA ayrı bir dalgada.

---

## 1. Bugünkü IA — Özet Kanıt

### 1.1 Admin Navigation (`useLayoutNavigation.ts:24-63`)

9 bölüm, 32 giriş (Classic `ADMIN_NAV`):
- Genel (1): Genel Bakış
- Sistem (8): Ayarlar, Görünürlük, Wizard Ayarları, İşler, Audit Log, Modüller, Sağlayıcılar, Prompt
- İçerik Üretimi (7): Kütüphane, Varlık, Standart Video, Wizard, Şablon, Stil, Şablon-Stil Link
- Yayın (1): Yayın Merkezi
- Etkileşim (3): Yorum, Playlist, Gönderi
- Analytics (3): Analytics, YouTube, Kanal
- Haber (5): Kaynak, Tarama, Bülten, Öğe, Kullanılan
- Kullanıcılar (1): User Mgmt
- Görünüm (1): Tema

**Plus sayfa envanteri** (Glob): 54 gerçek admin sayfa dosyası — nav'a girmeyen detail/create/edit sayfaları dahil.

### 1.2 User Navigation (`useLayoutNavigation.ts:74-87`)

Classic: 12 giriş, düz liste.
Horizon: 10 grup, 16 giriş (grup + subgroup dahil).

**Gap:** Horizon user'da Automation/Inbox/Connections ayrı grupta, Classic user'da YOK. Tutarsızlık.

### 1.3 Duplicate Çiftler (R1'den)

| # | Admin | User | Durum |
|---|---|---|---|
| 1 | `AdminCalendarPage.tsx` | `UserCalendarPage.tsx` | İki farklı fetcher, aynı component | 
| 2 | `AdminConnectionsPage.tsx` | `UserConnectionsPage.tsx` | Admin zaten list-only; user CRUD |
| 3 | `AdminInboxPage.tsx` | `UserInboxPage.tsx` | Aynı veri modeli, admin all-users + filter |
| 4 | `JobDetailPage.tsx` (admin) | `UserJobDetailPage.tsx` | 2. sayı admin'in %60'ı |
| 5 | `AdminYouTubeAnalyticsPage.tsx` | `UserYouTubeAnalyticsPage.tsx` | Aynı endpoint, sadece scope farkı |
| 6 | `YouTubeCallbackPage.tsx` (admin) | `UserYouTubeCallbackPage.tsx` | OAuth callback, aynı handler |

### 1.4 Surface Envanteri

`frontend/src/surfaces/` altında:
- `atrium/` (6 dosya: AdminLayout, UserLayout, ProjectsList, ProjectDetail, UserDashboard)
- `bridge/` (5 dosya: AdminLayout, UserLayout, JobsRegistry, JobDetail, PublishCenter)
- `canvas/` (10 dosya: Admin/UserLayout, MyProjects, MyChannels, Channel, ProjectDetail, UserCalendar, UserConnections, UserPublish, UserAnalytics, UserDashboard)
- `manifests/horizon.ts`, `manifests/legacy.ts` (canonical)

Yani **4 paralel yüzey** var: Classic (legacy fallback), Horizon (default hedef), Atrium (dashboard-odaklı preview), Bridge (admin ops odaklı preview), Canvas (user-odaklı preview).

### 1.5 Stores Envanteri (`stores/*.ts`)

8 Zustand store: auth, commandPalette, keyboard, notification, theme, ui, user, wizard.

**Gap:** `userStore` var ama `useCurrentUser()` hook'u export etmiyor (grep 0). `useAuthStore` 30+ dosyada doğrudan kullanılıyor — R2'de tespit edilen dağınıklık.

---

## 2. Önerilen Yeni Admin IA

### 2.1 Hedef: 7 grup × ~33 giriş (admin)

```
◉ Bugün            /admin                               [digest landing]
  ├─ Genel Bakış
  ├─ İnceleme Bekleyenler (queue chip, pending_review)
  └─ Son İşler (last 10 jobs)

⊙ Scope            [AdminScopeSwitcher — header'da persistent]
  │ (sol üstte global chip: "Tüm Kullanıcılar" ↔ "Kullanıcı: Hüseyin")
  └─ Kullanıcı Yönetimi  /admin/users          ← mevcut UsersRegistryPage

⚙ Sistem           (8 → 8, isim değişmez)
  ├─ Ayarlar              /admin/settings                  ← module landing (bkz. 2.4)
  ├─ Görünürlük            /admin/visibility
  ├─ Wizard Ayarları       /admin/wizard-settings
  ├─ İşler                /admin/jobs
  ├─ Audit Log             /admin/audit-logs
  ├─ Modüller              /admin/modules
  ├─ Sağlayıcılar          /admin/providers
  └─ Prompt Yönetimi       /admin/prompts

✎ Üretim           (7 → 6: Template-Stil Link kaldırılır, template detail'e taşınır)
  ├─ İçerik Kütüphanesi    /admin/library
  ├─ Varlık Kütüphanesi    /admin/assets
  ├─ Standart Video         /admin/standard-videos    (Registry + Wizard tek başlık, Wizard alt-sayfa)
  ├─ Haber Bültenleri       /admin/news-bulletins
  ├─ Şablonlar              /admin/templates
  └─ Stil Şablonları        /admin/style-blueprints
    └─ (nested: "Şablon-Stil Bağlantıları" detail tab'ında)

▶ Yayın & Takvim    (2, new group)
  ├─ Yayın Merkezi          /admin/publish            ← lane/board + list toggle
  └─ Takvim                 /admin/calendar           ← unified calendar, all users

✉ Etkileşim        (3 → 3)
  ├─ Yorum İzleme           /admin/comments
  ├─ Playlist İzleme        /admin/playlists
  └─ Gönderi İzleme         /admin/posts

≡ Analytics        (3 → 2: YouTube birleşir, Kanal Performansı ayrı kalır)
  ├─ Analytics Merkezi      /admin/analytics          (overview/content/operations sekmeleri)
  └─ Kanal Performansı      /admin/analytics/channel-performance

ℹ Haber            (5 → 4: News Items + Used News birleşir, tek sayfa tab)
  ├─ Kaynaklar              /admin/sources
  ├─ Kaynak Taramaları      /admin/source-scans
  ├─ Haber Öğeleri          /admin/news-items         (tab: Tüm / Kullanılan)
  └─ (bülten Üretim altında zaten var)

◐ Görünüm          (1 → 1)
  └─ Tema Yönetimi          /admin/themes
```

**Özet:** 9 grup → 9 grup (Scope yeni grup, Bugün yeni grup; eski "Kullanıcılar" Scope'a bağlandı; "Yayın" → "Yayın & Takvim" olarak genişledi).

**Sayım:** 32 → 27-28 görünür giriş + 5-6 alt-sayfa = daha temiz.

### 2.2 Yeni vs kaldırılan admin maddeleri

**Kaldırılan / birleşen:**
- "Video Wizard" ayrı giriş → Standart Video sayfasının içine taşınır (action button)
- "Şablon-Stil Bağlantıları" → Template detail tab
- "Kullanılan Haberler" ayrı giriş → Haber Öğeleri tab
- "YouTube Analytics" → Analytics Merkezi tab

**Yeni:**
- "Takvim" (admin-all-users)
- "İnceleme Bekleyenler" widget (pending_review lane, board view, PublishReviewQueuePage'in evrimi)

### 2.3 `useLayoutNavigation.ts` değişikliği önerisi (R6 için)

Yapılacak değişiklik yalnız 2 export'u günceller:
- `ADMIN_NAV` array (Classic)
- `HORIZON_ADMIN_GROUPS` array (Horizon)

**Yeni module_enabled entegrasyonu gerekmiyor** (hepsi mevcut keyler).

**Yeni visibility key'leri:**
- `panel:calendar` (admin unified calendar gösterim)
- `panel:dashboard` (digest landing — opsiyonel disable)

### 2.4 Settings Registry Module Landing (yeni)

Bugün `/admin/settings` tek uzun sayfa (`SettingsRegistryPage.tsx`, 204 entry). Öneri:

```
/admin/settings                        (landing — modül kartları grid)
/admin/settings/:group                 (tek grup, mevcut sayfa filtered view)
```

**Group listesi** (mevcut KNOWN_SETTINGS'ten): tts, channels, publish, automation, news, render, composition, thumbnail, subtitle, ... (~16 grup).

**Faydası:** Kullanıcı "TTS ayarlarını değiştireceğim" dediğinde 204 entry'yi kaydırmıyor, `/admin/settings/tts` tek tuşla açılıyor. Yeni backend gerekmiyor — URL segmentine göre filtre.

---

## 3. Önerilen Yeni User IA

### 3.1 Hedef: 6 grup × ~15 giriş

```
◉ Bugün              /user                            [digest landing]
  └─ Anasayfa
     (digest widgets: kanallarım sağlığı, onay bekleyen, publish bu hafta,
      otomasyon bu hafta, inbox son 3)

✎ Üretim              (3 → 3, grup ismi netleşti)
  ├─ Projelerim        /user/projects
  ├─ Video Oluştur     /user/create/video               (moduleId: standard_video)
  └─ Bülten Oluştur    /user/create/bulletin            (moduleId: news_bulletin)

▶ Yayın               (3 → 3)
  ├─ Yayın             /user/publish
  ├─ Takvim            /user/calendar
  └─ İçerik            /user/content                    (yalnız kendi projeler listesi)

⊛ Kanallar            (3 → 3, otomasyon alt-tab)
  ├─ Kanallarım        /user/channels
  ├─ Bağlantılarım     /user/connections
  └─ Otomasyonlarım    /user/automation

✉ Etkileşim            (3 → 3)
  ├─ Gelen Kutusu      /user/inbox
  ├─ Yorumlar          /user/comments
  └─ Gönderilerim      /user/posts

≡ Analitik            (3 → 2: YouTube birleşir, Kanal tek sayfa tab)
  └─ Analizim          /user/analytics                  (tabs: Genel / YouTube / Kanal)

⚙ Ayarlarım           (1)
  └─ Ayarlarım         /user/settings
```

**Özet:** 12 düz giriş → 6 grup × 15 giriş. Daha az scroll, daha az zihinsel yük.

### 3.2 Yeni vs kaldırılan user maddeleri

**Kaldırılan:**
- "Playlist'lerim" ayrı giriş → Kanal Detay içinde tab
- "Kanal Performansım" → Analizim altında birleşti
- "YouTube Analytics" → Analizim tab

**Yeni:**
- "Otomasyonlarım" (Classic user nav'da yoktu, Horizon'da vardı — standardize)
- "Bağlantılarım" (Classic user nav'da yoktu — standardize)

**Tutarlılık:** Classic + Horizon artık aynı giriş sayısı + aynı grup felsefesi.

### 3.3 UserIdentityStrip mimarisi

Kullanıcı panelinin üstünde **sticky 40px** bant:

```
┌────────────────────────────────────────────────────────┐
│ 👤 Hüseyin   •   scope: kendi alanım   •   🔔 3  📅 2 │
└────────────────────────────────────────────────────────┘
```

- **Avatar + isim**: `useAuthStore` zaten user.email/name sağlıyor
- **Scope chip**: user her zaman kendi scope'unda; visual reinforcement
- **Bildirim/takvim chip**: mevcut notificationStore + calendar fetch (opsiyonel)

**Component dosyası:** `components/layout/UserIdentityStrip.tsx` (R6 yazılacak).
**Kullanım yeri:** `UserLayout.tsx` + `HorizonUserLayout.tsx` + surface variant'lar.

---

## 4. AdminScopeSwitcher Mimari Şeması (en kritik yeni yüzey)

### 4.1 Gereksinimler

- Admin any-page'den scope geçişi tek tuşla.
- Scope değişince **tüm React Query cache contamination** — yani her mevcut query key'e `{scope: X}` enjekte edilmeli, aksi halde user A'nın cache'i user B'ye karışır.
- Backend enforcement zaten var (F4, `UserContext` + `apply_user_scope`).
- Frontend'de her API çağrısına `owner_user_id` / `scope` parametresi geçmeli.

### 4.2 Önerilen yapı (kod YOK, şema VAR)

```
stores/adminScopeStore.ts              (Zustand)
  state: { mode: "all" | "user", userId: string | null }
  actions: setScope(mode, userId?)

hooks/useCurrentUser.ts                (React Query ile)
  data: { id, email, name, role, avatar_url }

hooks/useActiveScope.ts                (Zustand + useCurrentUser kompozisyonu)
  returns: { ownerUserId: string | null, isAllUsers: boolean, displayName: string }
  - Admin: adminScopeStore'dan okur
  - User: her zaman { ownerUserId: user.id, isAllUsers: false }

components/layout/AdminScopeSwitcher.tsx
  - Visible only if user.role === "admin"
  - Header'da dropdown: "Tüm Kullanıcılar" | user list
  - Selection setScope() çağırır
  - "Kullanıcı: X" seçimde header'da persistent chip

api/client.ts (mevcut)
  - Her fetch'te useActiveScope'tan `ownerUserId` opsiyonel geçir
  - Query key pattern: ["jobs", { owner_user_id: X }]
```

### 4.3 Migration yolu (R6 plan, R3'te sadece şema)

**Bugünkü duruma göre (R1'den):**
- 54/54 admin sayfası scope param geçirmiyor.
- 5/54 zaten geçiriyor (örnek pattern: `AdminAutomationPoliciesPage.tsx:39`).
- 12/21 user sayfa zaten geçiriyor.

**R6 iş kalemleri:**
1. `useActiveScope()` + `useCurrentUser()` hook'larını yaz.
2. Tüm admin page'lerde `fetch*()` çağrılarına scope param ekle (49 dosya).
3. Query key'lere `{ owner_user_id }` meta-tag ekle (cache contamination).
4. `AdminScopeSwitcher` component'i yaz + HorizonAdminLayout header'ına yerleştir.
5. Visibility Engine'de scope chip `admin-only` kuralı.

### 4.4 Risk listesi (AdminScopeSwitcher için)

- **R1:** Cache contamination unutulursa user A'nın verisi user B'ye sızar. Mitigation: query key pattern zorunlu + eslint rule (R6 sonrası opsiyonel).
- **R2:** Backend zaten enforce ediyor, yani veri sızıntısı güvenlik sınıfı değil — ama UX sınıfı. Yine de scope = "all" iken endpoint admin'e her şeyi verir; scope = "user:X" iken backend `UserContext.acting_user_id = X` okuyacak şekilde ayarlanmalı.
- **R3:** `UserContext` bugün `caller_user_id` (gerçek admin kimliği) + `scope` (all|user) ikilisini ayırt etmeli. Bu backend değişikliği — **R6 içinde plan**.

---

## 5. Duplicate Çift Kararları (6 tane)

| # | Çift | Karar | Rasyonel |
|---|---|---|---|
| 1 | Calendar | **Admin = Unified (all users + filter)**, user = kendi scope'u | Admin all-users view kuralı + yeni `AdminScopeSwitcher` varsa aynı component, iki route |
| 2 | Connections | Admin = read-only liste + drill-down; user = full CRUD | F4 Faz 17/AM-2 guard zaten var, component ayrı kalsın (farklı action'lar) |
| 3 | Inbox | **Birleşik component, farklı route**, scope hook belirler | Aynı veri modeli |
| 4 | JobDetail | **Tek component**, admin zaten full erişim | Duplicate bilerek kaldırılır, Visibility Engine alan bazlı kontrol yapar |
| 5 | YouTube Analytics | **Tek component**, scope hook belirler | Aynı endpoint, yalnız scope farkı |
| 6 | YouTubeCallback | **Tek route** (`/oauth/youtube/callback`) yeterli | OAuth handler scope'suz |

**Not:** Bu kararlar R3 IA niyetidir; kod birleştirme R5 yol haritasında önceliklendirilecek.

---

## 6. Wizard Canon Kararı

### 6.1 Bugünkü durum (R1'den)

- `StandardVideoWizardPage.tsx` (admin, 1409 LoC) — full wizard implementasyonu
- `CreateVideoWizardPage.tsx` (user, 195 LoC) — shell
- `NewsBulletinWizardPage.tsx` (admin) + `CreateBulletinWizardPage.tsx` (user) — aynı pattern
- `CreateProductReviewWizardPage.tsx` (user) — bağımsız wizard

### 6.2 R3 kararı: "Tek Motor + İki Shell"

```
lib/wizard/engine.ts                   (yeni, R6'da yazılır)
  - step registry
  - state machine
  - snapshot-lock (CLAUDE.md kuralı)
  - validation pipeline

lib/wizard/schemas/
  standard_video.wizard.ts             (step schema, admin + user shared)
  news_bulletin.wizard.ts
  product_review.wizard.ts

pages/admin/StandardVideoWizardPage.tsx
  - shell: <WizardEngine schema={standardVideoSchema} mode="admin" />

pages/user/CreateVideoWizardPage.tsx
  - shell: <WizardEngine schema={standardVideoSchema} mode="user" />
```

**İki shell farkı:**
- Admin mode: tüm field'lar görünür, override butonu var
- User mode: Visibility Engine + Settings Registry `visible_in_wizard` + `user_override_allowed` flag'lerine göre filtre

**Admin sayfası 1409 LoC → ~300 LoC shell**.
**User sayfası 195 → ~150 LoC shell** (benzer).

### 6.3 R3 değil R4'te planlanacak detay

Wizard engine implementasyonu R4 preview planı + R5 yol haritası kapsamında. R3 sadece **kararı** söylüyor: iki ayrı god-component değil, tek engine + iki shell.

---

## 7. Surface Canon Kararı

### 7.1 Bugünkü 4 paralel yüzey

| Yüzey | Rolü | Kullanıcı Deneyimi |
|---|---|---|
| Classic (legacy) | Default fallback, ilk üretim | Düz sidebar + full list |
| Horizon | Modern default hedef | Icon rail + grouped sidebar |
| Atrium | Dashboard-odaklı preview | Dashboard-first, ajan widgets |
| Bridge | Admin ops preview | Admin-heavy, 3-kolonlu |
| Canvas | User-odaklı preview | User project-first |

### 7.2 R3 Canon Kararı

**Production canonical:** Classic + Horizon.
- **Admin varsayılan: Horizon** (grouped rail).
- **User varsayılan: Horizon** (grouped rail).
- **Classic** fallback olarak kalır (Visibility Engine üzerinden override opsiyonu).

**Preview/prototype rolünde:** Atrium + Bridge + Canvas = **kill-switch altında** tutulur, `selectableSurfaces.ts` aracılığıyla opsiyonel (admin ayarından aktifleştirilir).

**Kaldırılmıyor**, çünkü:
- Mevcut test coverage'ına dokunmuyoruz (R1'de `UserPublishEntryPage` scaffold korunacaklar listesinde).
- Kullanıcı "bilinçli korunacaklar" listesine "surface mod varyantları legacy fallback" koymuş.

### 7.3 Yeni yüzey eklenmiyor

R3'te yeni surface yok. "Yeni Admin IA" = Horizon içinde grup yeniden düzenleme. "Yeni User IA" = Horizon içinde grup yeniden düzenleme. Yeni sayfa (`/admin/dashboard` digest + `/user` digest evrimi) sadece mevcut yüzeylerin içeriğinin değişmesi.

---

## 8. Eski → Yeni Sayfa Eşleşme Tablosu (Admin)

| Eski yol | Eski sayfa | Yeni yol | Yeni davranış |
|---|---|---|---|
| `/admin` | AdminDashboard (boş/placeholder) | `/admin` | **Digest landing** — failed jobs / pending reviews / retry candidates / today's queue |
| `/admin/users` | UsersRegistryPage | `/admin/users` | **AdminScopeSwitcher kaynağı** — "Scope" grubu altında |
| `/admin/calendar` (yeni) | — | `/admin/calendar` | **Yeni unified calendar**, all-users default |
| `/admin/publish` | PublishCenterPage | `/admin/publish` | **Lane/board + list toggle** (R2 pattern #5) |
| `/admin/analytics` + `/admin/analytics/youtube` + `/admin/analytics/channel-performance` | 3 sayfa | `/admin/analytics` (tabs) + `/admin/analytics/channel-performance` | Analytics Merkezi: Overview / Content / Operations / YouTube sekmeleri |
| `/admin/settings` (uzun liste) | SettingsRegistryPage | `/admin/settings` (landing) + `/admin/settings/:group` (filtered) | Modül-başı landing (R3 §2.4) |
| `/admin/template-style-links` | TemplateStyleLinksRegistryPage | **Kaldırıldı** (nav'dan), `/admin/templates/:id/links` tab | Nav sadeleşir |
| `/admin/news-items` + `/admin/used-news` | 2 sayfa | `/admin/news-items` (tab: Tüm / Kullanılan) | Birleşik |
| `/admin/standard-videos/wizard` | StandardVideoWizardPage | `/admin/standard-videos/wizard` | Kalır, sadece action button'dan açılır (nav'dan kaldırıldı) |

## 9. Eski → Yeni Sayfa Eşleşme Tablosu (User)

| Eski yol | Eski sayfa | Yeni yol | Yeni davranış |
|---|---|---|---|
| `/user` | Anasayfa (basit placeholder) | `/user` | **Digest landing** + UserIdentityStrip |
| `/user/automation` | UserAutomationPage | `/user/automation` | **Lineer SVG visualization** (R2 pattern #7) |
| `/user/analytics` + `/user/analytics/channels` + `/user/analytics/youtube` | 3 sayfa | `/user/analytics` (tabs) | Tek Analizim sayfası |
| `/user/playlists` | UserPlaylistsPage | `/user/channels/:id` tab | Kanal Detay içine taşındı |
| `/user/calendar` | UserCalendarPage | `/user/calendar` | Calendar/List toggle (R2 pattern #4) |
| `/user/publish` | UserPublishPage | `/user/publish` | "Queue slot" overlay (R2 pattern #10) |
| `/user/inbox` | UserInboxPage | `/user/inbox` | Scope hook + sticky strip bağlantı |
| `/user/connections` | UserConnectionsPage | `/user/connections` | Kanallar grubuna taşındı |

---

## 10. Kritik Bağımlılık Zinciri

Yeni IA için gereksinim zinciri:

```
AdminScopeSwitcher
 ├── useCurrentUser (hook — 0 → 1 dosya)
 ├── useActiveScope (hook — 0 → 1 dosya)
 ├── adminScopeStore (Zustand store — 0 → 1 dosya)
 └── React Query key injection discipline (49 admin page'de fetch refactor)

UserIdentityStrip
 ├── useCurrentUser (ortak)
 └── UserLayout + HorizonUserLayout header slot

Admin Digest Dashboard
 ├── Mevcut API'ler (jobs, publish, channels, automation_runs)
 └── Widget component'ler (FailedJobsWidget, PendingReviewsWidget, ...)

User Digest Dashboard
 ├── Mevcut API'ler (owner_user_id scope'lu)
 └── Widget component'ler (MyChannelsHealth, MyPublishQueue, ...)

Settings Module Landing
 ├── SettingsRegistryPage shell güncellemesi
 └── /admin/settings/:group URL parametresine göre filter

Calendar Unified
 ├── /admin/calendar yeni route
 ├── Backend: calendar endpoint scope param zaten var (`fetchCalendarEvents`)
 └── Frontend: scope-aware fetch

Sidebar Değişikliği
 └── useLayoutNavigation.ts güncelleme (ADMIN_NAV + HORIZON_ADMIN_GROUPS + USER_NAV + HORIZON_USER_GROUPS — 4 export)
```

**Kritik gözlem:** En ağır iş **AdminScopeSwitcher discipline** (49 dosyada fetch refactor). Diğer tüm değişiklikler yüzeysel.

---

## 11. R3 → R4/R5 Geçiş Notları

R4 preview planına girdiler:
1. **4 yeni component mockup** (AdminScopeSwitcher, UserIdentityStrip, AdminDashboard digest, UserDashboard digest)
2. **5 sayfa evrim mockup** (Publish lane/board, Analytics tabs, Settings module landing, Calendar unified, Automation lineer)
3. **Wizard engine single-motor mimarisi** (diagram)
4. **Sidebar eski→yeni karşılaştırma ekranı** (before/after)

R5 yol haritasına girdiler:
1. Değişiklik tablosu: dosya / tür (refactor, yeni, sil) / efor / risk / önkoşul / test kategorisi
2. AdminScopeSwitcher refactor chain: hangi 49 dosya, hangi sırayla
3. Settings module landing URL parametresi değişimi migration
4. Duplicate çift birleştirme chain (6 çift, sırayla)
5. Wizard engine ayrı bir "Faz R7" gerektirebilir (büyük iş, R6 dışında)

---

## 12. R3 Teslim Raporu (7 Başlık)

### 12.1 Ne yaptın
Yeni admin + user bilgi mimarisi şeması çıkarıldı. 6 duplicate çift kararı, surface canon (Classic + Horizon), wizard canon (tek motor + iki shell), AdminScopeSwitcher mimari şeması, 2 adet eski→yeni sayfa eşleşme tablosu, kritik bağımlılık zinciri.

### 12.2 Hangi dosyaları okudun / değiştirdin
- **Okundu:** `frontend/src/app/layouts/useLayoutNavigation.ts` (395 LoC, tam), surface envanter (30 dosya), `stores/*` envanter
- **Glob:** `frontend/src/surfaces/**/*.ts*` (34 dosya), `frontend/src/stores/*.ts` (8 dosya)
- **Yazıldı:** Yalnız `docs/redesign/R3_information_architecture.md` (bu dosya)

### 12.3 Hangi testleri çalıştırdın
R3 tasarım fazı — kod değişikliği yok, test yok. `git diff --stat backend/ frontend/ renderer/` boş.

### 12.4 Sonuç ne oldu
- Admin nav 32 giriş → 27-28 görünür giriş (~%15 azalma; alt-tab'larla görsel yük daha da düşer).
- User nav 12 düz giriş → 15 grup+giriş ama 6 grup altında organize (zihinsel yük düşer).
- 6 duplicate çiftten 4'ü "tek component + iki route + scope hook" modeline gider.
- Surface canon: Horizon default, Classic fallback, diğer 3 preview kalır.
- Wizard canon: tek motor + iki shell (R4/R5/R7 plan).

### 12.5 Bulduğun ek riskler
- **R1:** AdminScopeSwitcher cache contamination disiplini manuel — eslint kuralı opsiyonel ama etkili olur (R6 sonrası önerilecek).
- **R2:** Backend `UserContext` bugün `caller_user_id` + `scope` ikilisini ayırt etmez (sadece role ayırır). R6'da bir migration veya request-level param eklemek gerekir.
- **R3:** Wizard engine geçişi 1409 LoC'u bozmadan yapmak büyük iş; R6 kapsamı dışına düşebilir — "Faz R7 Wizard Unification" olarak önerilecek.
- **R4:** Settings module landing URL değişimi (`/admin/settings` → `/admin/settings/:group`) bookmark kırabilir; eski URL 301 redirect planlanmalı.
- **R5:** Duplicate çift birleştirmelerinde Visibility Engine field-level yetenekleri test coverage gerektirir.

### 12.6 Commit hash
Bu rapor commit'i bu teslimle birlikte alınacak — MEMORY.md tablosu commit sonrası güncellenecek.

### 12.7 Push durumu
Worktree remote'a aktif push'lanıyor. Main'e dokunulmaz.

---

## 13. code change: none

Bu rapor üretilirken hiçbir backend/frontend/renderer kaynak kodu değişmedi.

```
git diff --stat backend/ frontend/ renderer/
# (boş)
```

CLAUDE.md kuralları korundu:
- Hidden behavior yok; AdminScopeSwitcher **görünür** olacak.
- Hardcoded çözüm yok; her yeni davranış Settings Registry key'iyle gate'lenir (örn. `dashboard.digest.enabled`, `admin.scope_switcher.enabled`).
- Monolitik god-function önerilmedi; wizard engine tam tersine mevcut god-component'i parçalamak için.
- Core invariants (publish state machine, ownership guards, Settings resolver) dokunulmuyor.

---

## 14. Sonraki Adım: FAZ R4 (otomatik devam)

R4 preview/prototype planı üretecek:
1. Hangi ekranların mockup'ı yapılacak (öncelik listesi)
2. Mockup biçimi: lightweight komponent sketch (Tailwind + mevcut design tokens)
3. Component tree proposal
4. "Türkçe içerik + mock data + mevcut API contract uyumu" kuralları
5. Preview dosya konumu: `docs/redesign/previews/` altında `.tsx` stub'lar (R6'ya kadar koda bağlanmaz)

Çıktı: `docs/redesign/R4_preview_prototype_plan.md`

R6 onay kapısına kadar kod yok.

---

**Doküman sonu. R4 otomatik başlatılacak.**
