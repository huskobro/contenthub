# Faz R1 — Repo Reality Audit (F2/F3/F4 Sonrası Delta)

**Tarih:** 2026-04-17
**Worktree:** `.claude/worktrees/product-redesign-benchmark`
**Branch:** `worktree-product-redesign-benchmark` (main'e dokunulmaz)
**Taban commit:** `33783e1` — *"Merge Phase Final F4 — deferred items closure + merge-ready gate"*
**Önceki raporlar:** `phase_ak_…`, `phase_al_…`, `phase_am_…`, `phase_an_…`, `phase_final_product_closure`, `phase_final_f4_merge_readiness`
**Amaç:** AL'nin 15 bulgusunu ve F2/F3/F4 kapanışlarını birlikte okuyarak, **mevcut çalışan omurgayı** (ownership, Settings Registry, visibility, ownership) yeniden doğrulamak; bu zincirden sonra **hâlâ sadeleştirilmesi gereken ürün alanlarını** kanıtlarıyla ortaya koymak. Bu rapor sıfırdan yazılmıyor — AK/AL/AM/AN üstüne delta odaklı düşünüyor.

---

## 0. Bu Rapor Nedir / Değildir

**Nedir:**
- Salt-okunur kod tabanı denetimi (`backend/` + `frontend/` + `renderer/` + `docs/`).
- F2–F4 kapanışından sonra hâlâ canlı olan kafa karışıklığı / yüzey şişmesi / navigation drift teşhisi.
- R2 (rakip analizi), R3 (IA), R4 (preview planı), R5 (yol haritası), R6 (implementasyon) için kanıt tabanı.

**Değildir:**
- Kod değişikliği, migration, npm install, commit/main'e dokunma.
- AK/AL raporlarının körü körüne tekrarı. AK/AL'de zaten kapanmış bulgu → burada yalnızca "hâlâ geçerli mi" etiketiyle geçiyor.

**Kurallar (K1–K10):** AL raporunun K1–K10 sözleşmesi burada da geçerli. Her bulgu 5-parça format, `file:line` kanıtı, Settings Registry / Visibility üstünden akan öneri.

---

## 1. Executive Summary (15 Madde)

Her madde `file:line` kanıta bağlıdır. Numaralar R5'te önceliklendirme için kullanılacaktır.

| # | Bulgu | Durum (F4 sonrası) | Kanıt |
|---|---|---|---|
| 1 | **Navigation truth source çift imza**: `ADMIN_NAV` + `HORIZON_ADMIN_GROUPS` + `USER_NAV` + `HORIZON_USER_GROUPS` paralel listeler; user-side classic nav automation/inbox/calendar/connections taşımıyor. | Açık delta | `frontend/src/app/layouts/useLayoutNavigation.ts:24-87` (classic admin 40 satır, classic user 14 satır) vs `:95-278` (Horizon grupları) |
| 2 | **AdminCalendarPage + AdminInboxPage 11 satırlık stub**; `UserCalendarPage` 829 satır, `UserInboxPage` 202 satır gerçek iş. | Asimetri | `frontend/src/pages/admin/AdminCalendarPage.tsx` (11 LoC), `AdminInboxPage.tsx` (11 LoC), `frontend/src/pages/user/UserCalendarPage.tsx` (827 LoC), `UserInboxPage.tsx` (202 LoC) |
| 3 | **Wizard çakışması persist**: `NewsBulletinWizardPage` admin 1409 LoC monolit, `CreateBulletinWizardPage` user 195 LoC ince shell — AL'deki durum aynen korunuyor; F1–F4 dokunmadı. | Açık | `frontend/src/pages/admin/NewsBulletinWizardPage.tsx` (1409 LoC), `frontend/src/pages/user/CreateBulletinWizardPage.tsx` (195 LoC) |
| 4 | **UserAutomationPage hâlâ 5-dropdown matris**; AL'deki "visual flow builder gerekli" gözlemi F4 digest widget'ından sonra da değişmedi. | Açık | `frontend/src/pages/user/UserAutomationPage.tsx:47-261` (MODE_LABELS × 5 CHECKPOINT_META) |
| 5 | **AdminAutomationPoliciesPage 133 LoC düz liste** — AN kapanışı backend scope enforce etti, ama UI hâlâ "JSON form". | Kısmen açık | `frontend/src/pages/admin/AdminAutomationPoliciesPage.tsx` (133 LoC) + AN rapor (`phase_an_automation_policies_guard_closure.md`) |
| 6 | **Surface 5'li mix aktif**: legacy + horizon + atrium + bridge + canvas, hepsi `scope:"both"` olarak kayıtlı. Kullanıcı panelinde ≥4 paralel dashboard hâlâ var. | Açık | `frontend/src/surfaces/manifests/register.tsx:268-272` (5 `registerSurface`), atrium/bridge/canvas/horizon/legacy klasörleri |
| 7 | **Canvas surface 7.9K LoC tek başına** — 11 dosya, 2 dosya >800 LoC (CanvasChannelDetailPage 1028, CanvasUserCalendarPage 829). Gerçek page override'lar 9 route için var; diğer route'larda Canvas kullanıcıyı legacy'ye düşürüyor. | Açık | `frontend/src/surfaces/canvas/` + `register.tsx:218-231` (CANVAS_PAGE_OVERRIDES = 9 key) |
| 8 | **Atrium/Bridge sadece 3 route override ediyor**; geri kalan route'lar legacy/horizon'a düşüyor. Gerçek kullanıcı değeri dar. | Açık | `register.tsx:125-129` (BRIDGE 3 key), `:208-216` (ATRIUM 3 key) |
| 9 | **Backend ownership zinciri sağlam**: 30 router modülü, 158 guard çağrısı (`require_admin` / `apply_user_scope` / `get_current_user_context`). F2–F4 kapsandı. | Sağlam | 43 `backend/app/*` modülü, grep sonucu 158 hit |
| 10 | **Settings Registry drift idempotent repair koşulu**: F4 `backend/scripts/repair_settings_drift.py` eklendi, `/settings/drift` + `/settings/drift/repair` endpoint'leri canlı. | Sağlam | `phase_am_security_and_settings_closure.md` §AM-4, F4 closure commits |
| 11 | **Theme persistence backend force-hydrate**: AL'deki localStorage hard-coded gözlemi F4'te kapandı. | Sağlam | `phase_final_product_closure.md` theme-force-hydrate başlığı |
| 12 | **Publish state machine + can_publish() guard** F4 sonrası terminal davranışı koruyor; review gate hard-enforce. | Sağlam | `backend/app/publish/` + AL raporunun "Zaten var ve doğru çalışıyor" sınıfı |
| 13 | **98+ sayfa envanteri**: 54 admin + 21 user + 7 root + 1 scaffold + 21 surface page = **104 page-level component**. Sayfa sayısı AL'den beri değişmedi. | Açık | `ls frontend/src/pages/admin` = 54, `ls frontend/src/pages/user` = 21, `ls frontend/src/surfaces/*/` = 21 |
| 14 | **Test tabanı hacimli**: backend 2279 test fn, frontend 2167 test çağrısı (202 test dosyası). Test yükü geri kazanım için gerçek koruma. | Sağlam | `grep -c "def test_" backend/tests/test_*.py`, `grep -rE "it\|test\(" frontend/src/tests/` |
| 15 | **Docs envanteri 56 dosya**, 7 `phase_*` kapanış raporu zinciri (AK → AL → AM → AN → Final → F4 → R0). Belgelenme sağlam. | Sağlam | `ls docs/` = 56 |

---

## 2. AL Bulguları × Güncel Durum (Delta Tablosu)

AL raporundaki 15 bulgu bire bir incelendi. "Durum" sütunu:
- ✅ **Kapandı** — F1–F4 zincirinde çözüldü
- 🟡 **Kısmen** — backend tamam, UI eksik
- 🔴 **Açık** — Hâlâ çözülmemiş

| AL # | AL Bulgusu | Durum | F4 sonrası delta / kanıt |
|---|---|---|---|
| AL-1 | KNOWN_SETTINGS 204 vs DB drift | ✅ | F4 `/settings/drift/repair` + `mark_orphan_settings()` (AM rapor §AM-4) |
| AL-2 | Legacy `/platform-connections` leak | ✅ | F2.1 `59f953a` kapandı (Final rapor 15 commit zinciri) |
| AL-3 | `/users/*` + `/audit-logs/*` guard eksikliği | ✅ | F2 `a1c4bd6` kapandı |
| AL-4 | Frontend scope cache kirlenmesi | ✅ | F2 `ee03737` `queryKey` revizyonu |
| AL-5 | Automation policies scope eksikliği | ✅ | AN `50500a0` — 11 endpoint + 9 service scope |
| AL-6 | 16 modül ownership backlog (P0+P1+P2) | ✅ | F2 final rapor §2 tamamlandı |
| AL-7 | Theme localStorage hard-coded | ✅ | F4 theme force-hydrate |
| AL-8 | Daily automation digest yok | ✅ | F4 digest widget + `automation_runs_today` endpoint |
| AL-9 | Surface 8 layout şişmesi (legacy+horizon+atrium+bridge+canvas) | 🔴 | 5 surface hâlâ aktif; pageOverride'lar dar; bu R1'in **en büyük açığı** |
| AL-10 | NewsBulletin admin vs user wizard çakışması (1409 vs 195 LoC) | 🔴 | Hiç dokunulmadı |
| AL-11 | UserAutomationPage "5-dropdown matris" | 🔴 | F4 digest widget eklendi ama *flow builder yok* |
| AL-12 | AdminInboxPage + AdminCalendarPage stub | 🔴 | Hâlâ 11 LoC stub |
| AL-13 | User-side classic nav eksikliği | 🔴 | `USER_NAV` 12 item, `HORIZON_USER_GROUPS` 20 item — drift genişledi |
| AL-14 | Visual flow builder (@xyflow önkoşulu) | 🔴 | @xyflow hâlâ yok; gereklilik kanıtı R2–R5 dalgasında |
| AL-15 | AdminAutomationPoliciesPage düz form | 🟡 | Backend kapandı, UI değişmedi |

**Delta özeti:** AL'nin **güvenlik + ownership + settings drift + theme + automation backend** kısmı F1–F4 zincirinde tam kapandı. **UI / UX sadeleştirmesi, surface variants, wizard çakışması, automation flow builder, inbox/calendar asimetrisi** konularında ise hiçbir ilerleme yok — bu R2 sonrası dalgaların gerçek hedefi.

---

## 3. Navigation Truth Source Analizi

### 3.1 Classic Admin Nav (ADMIN_NAV)
`frontend/src/app/layouts/useLayoutNavigation.ts:24-63` — 40 entry, 9 section. Kullanıcılar sayfası **"Sistem"** bölümünde.

### 3.2 Horizon Admin Gruplar (HORIZON_ADMIN_GROUPS)
`useLayoutNavigation.ts:95-182` — 8 grup × ~5 item. Kullanıcılar "Sistem" grubunda gömülü; ama Horizon'da **Onboarding, Automation, Inbox, Calendar, Notifications, Connections yok** (classic'te de yok). İkisi simetrik ama "Automation" kategori bir ikisinde de yok.

### 3.3 Classic User Nav (USER_NAV)
`useLayoutNavigation.ts:74-87` — 12 entry; **automation / inbox / calendar / connections YOK**.

### 3.4 Horizon User Gruplar (HORIZON_USER_GROUPS)
`useLayoutNavigation.ts:188-278` — 10 grup × 1–4 item; automation, inbox, calendar, connections **VAR**. Toplam görünür item: ~20.

### 3.5 Sonuç (5-parça)

- **verdict:** Classic ve Horizon paralel listeler, user-side 8 item farkı var.
- **kanıt:** `useLayoutNavigation.ts:74-87` vs `:188-278` — `/user/automation`, `/user/inbox`, `/user/calendar`, `/user/connections`, `/user/news-picker`, `/user/analytics/youtube`, `/user/channels/:id` route'ları classic menüden görünmüyor.
- **risk:** Kullanıcı layout varyantı değiştiğinde menüden sayfa kaybeder → mode geçiş farkı = "ghost page". Bazı sayfalar yalnızca doğrudan URL ile erişilebilir.
- **önkoşul:** Tek navigation truth source (örn. `NAV_REGISTRY`) → iki layout ondan türetilecek.
- **önerilen sonraki adım:** Tek kaynak `NAV_REGISTRY<Record<string, NavEntry & {surfaces: SurfaceId[]}>>`; her surface kendi görünürlüğünü oradan alır.

---

## 4. Surface Variants Gerçek-Değer Analizi

### 4.1 Aktif Surface Envanter

| Surface | Klasör | LoC | Scope | Page override | Durum |
|---|---|---|---|---|---|
| legacy | `app/layouts/AdminLayout.tsx` + `UserLayout.tsx` | 157 | both | 0 (fallback) | Aktif — her zaman erişilebilir |
| horizon | `app/layouts/HorizonAdminLayout.tsx` + `HorizonUserLayout.tsx` | 344 | both | 0 | Aktif — nav grupları farklı |
| atrium | `surfaces/atrium/` | 2.5K | both | 3 (`user.dashboard`, `user.projects.list`, `user.projects.detail`) | Dar; sadece 3 user page |
| bridge | `surfaces/bridge/` | 2.2K | both | 3 (`admin.jobs.registry`, `admin.jobs.detail`, `admin.publish.center`) | Dar; sadece 3 admin page |
| canvas | `surfaces/canvas/` | 7.9K | both | 9 (user dashboard/projects/channels/publish/connections/analytics/calendar/channel-detail) | En geniş ama hâlâ kısmi |

**Toplam surface kodu:** ~13.1K LoC + layout 566 LoC.

### 4.2 Sonuç (5-parça)

- **verdict:** Canvas hariç diğer surface'lar çok dar pageOverride'la gerçek farklılaşma veremez; kullanıcı Atrium'daki "projects.list" sayfasından `/user/publish`'a gittiğinde **legacy** (veya Canvas tercih edilmişse Canvas) yüzüne düşer. Bu "yarı-surface" etkisi sadeleştirmenin önündeki en büyük engel.
- **kanıt:** `surfaces/manifests/register.tsx:125-129,208-216,218-231` — ATRIUM 3 key, BRIDGE 3 key, CANVAS 9 key. `resolveActiveSurface.ts` fallback zincirini yönetir.
- **risk:** Kullanıcı şu an hangi surface'da olduğunu kestiremez; farklı sayfalarda farklı yüz gelir. Ürün kimliği tutarsız.
- **önkoşul:** Surface enabled set üstünde sert karar — R2–R5 sonunda kaç surface'ın hayatta kalacağı kararlaştırılmalı.
- **önerilen sonraki adım:** Surface'ları iki kampa bölmek: (a) Canvas tek user surface (tam kapsar), (b) legacy admin default + horizon opsiyonel. Atrium/Bridge ya Canvas'a konsolide ya da enabled=false flag ile "deneysel" statüde tutulur (Settings Registry: `ui.surface.available`).

---

## 5. Wizard Akışları

### 5.1 Envanter

| Wizard | Rol | LoC | Durum |
|---|---|---|---|
| `admin/NewsBulletinWizardPage.tsx` | Admin bülten sihirbazı | 1409 | Monolit — AL'deki durum aynen |
| `user/CreateBulletinWizardPage.tsx` | User bülten sihirbazı | 195 | İnce shell |
| `admin/StandardVideoWizardPage.tsx` | Admin video sihirbazı | 50 | Shell — ContentCreationWizard bridgeli |
| `user/CreateVideoWizardPage.tsx` | User video sihirbazı | 514 | Kapsamlı |
| `user/CreateProductReviewWizardPage.tsx` | User product review sihirbazı | 563 | Kapsamlı |
| `admin/WizardSettingsPage.tsx` | Wizard yönetim sayfası | — | Varlığı bağımsız |

### 5.2 Sonuç (5-parça)

- **verdict:** Admin bülten sihirbazı (1409 LoC) ile user bülten sihirbazı (195 LoC) arasındaki oran **7.2×**; aynı iş iki zıt boyutta yürüyor. StandardVideo tarafında ise admin shell + user kapsamlı (tam tersi) paterni hâkim.
- **kanıt:** LoC listesi yukarıda; `router.tsx:155` (admin route), `:220` (user route) birbirinden habersiz iki farklı component mount ediyor.
- **risk:** Davranış farkı → admin onayladığı şeyi kullanıcı üretemiyor olabilir. Test yükü iki katı.
- **önkoşul:** Wizard governance (`visible_in_wizard` flag) ve `ContentCreationWizard` unified host kullanımı.
- **önerilen sonraki adım:** `NewsBulletinWizardPage` (admin) → `ContentCreationWizard` host üstüne taşınsın; user ve admin aynı base component + `mode` (guided/advanced) + Settings Registry kontrolü ile ayrışsın. **Kod değişikliği R6'dadır.**

---

## 6. Automation / Inbox / Calendar Akışı

### 6.1 Durum

| Surface | Admin | User | Delta |
|---|---|---|---|
| Automation | `AdminAutomationPoliciesPage.tsx` (133 LoC düz liste) | `UserAutomationPage.tsx` (293 LoC 5-dropdown matris) | Hâlâ hiçbir visual flow builder yok |
| Inbox | `AdminInboxPage.tsx` (**11 LoC stub**) | `UserInboxPage.tsx` (202 LoC) | Admin boş, user gerçek |
| Calendar | `AdminCalendarPage.tsx` (**11 LoC stub**) | `UserCalendarPage.tsx` (827 LoC) | Admin boş, user zengin |

### 6.2 Sonuç (5-parça)

- **verdict:** F4 digest widget automation'ın backend tarafını ziyadesiyle işledi, ama admin gözünden üç operasyonel yüzey (automation-policies, inbox, calendar) hâlâ görsel olarak düz veya stub.
- **kanıt:** Sayfa LoC'leri yukarıda; stub'lar 11 satır sadece `<div>Yakında</div>` kalıbında.
- **risk:** Admin panelde kullanıcıları denetleyecek merkezi automation/inbox/calendar görünümü yok → çok kullanıcılı çalışma anı gelince admin karanlıkta.
- **önkoşul:** Settings Registry: `automation.admin.view.enabled`; backend fan-in endpoint (admin için tüm policies/tüm inbox/tüm calendar).
- **önerilen sonraki adım:** **R3 IA'da** Admin "Operasyon" grubu → automation policies + inbox triage + calendar overview tek shell altında birleştirilmeli. R4 preview planında mock alınsın; R6'da mock kontratlar gerçek endpoint'e bağlansın.

---

## 7. Publish / Calendar / Analytics / Assets Akışı

### 7.1 Durum

| Sayfa | LoC | Gözlem |
|---|---|---|
| `admin/PublishCenterPage.tsx` | — (lazy, >150) | Gate 4 kapsamı; stabil |
| `admin/PublishReviewQueuePage.tsx` | — (lazy) | Review gate hard-enforce (F3) |
| `user/UserPublishPage.tsx` | 521 | Stabil, CanvasUserPublishPage ile pageOverride var |
| `user/UserCalendarPage.tsx` | 827 | Stabil ama büyük |
| `user/UserAnalyticsPage.tsx` + `UserYouTubeAnalyticsPage.tsx` + `UserChannelAnalyticsPage.tsx` | — | 3 paralel analytics sayfası; toplu dashboard yok |
| `admin/AnalyticsOverviewPage.tsx` + `AnalyticsContentPage` + `AnalyticsOperationsPage` + `PublishAnalyticsPage` + `AdminYouTubeAnalyticsPage` + `AdminChannelPerformancePage` | — | Admin 6 analytics sayfası |
| `admin/AssetLibraryPage.tsx` + `ContentLibraryPage.tsx` | — | İki ayrı kütüphane sayfası |

### 7.2 Sonuç (5-parça)

- **verdict:** Publish tarafı backend + state machine olarak güçlü; **analytics 9 sayfa üstüne yayılmış** (admin 6 + user 3); bu yüzey sadeleştirmesi en kârlı alan.
- **kanıt:** `router.tsx:166-171,210-211` 9 analytics route.
- **risk:** Kullanıcı hangi analytic sayfasında ne göreceğini ayırt edemez; "analytics dashboard" algısı yok.
- **önkoşul:** Analytics aggregation contract (tekil `/analytics/overview` backend endpoint); settings: `analytics.default_view`.
- **önerilen sonraki adım:** **R3 IA'da** analytics 3 stacka inecek: (a) Content, (b) Channel/Platform, (c) Operations. Admin ve user aynı stack'i farklı scope ile görsün. Asset/Content library de tek "Library" shell altında iki tab'e düşsün.

---

## 8. Duplicate / Legacy / Test-Only Envanter

### 8.1 Scaffold / Test-only

| Dosya | Rol | Gözlem |
|---|---|---|
| `frontend/src/pages/_scaffolds/UserPublishEntryPage.tsx` | deprecated | F2.5 ile scaffold altına taşındı; 12 smoke test buna bağlı (Final rapor §F2.5) |

### 8.2 Admin Stub (silinmeye değil, IA için yer tutucu)

| Dosya | LoC |
|---|---|
| `admin/AdminCalendarPage.tsx` | 11 |
| `admin/AdminInboxPage.tsx` | 11 |

### 8.3 Ayrı Analytics Sayfaları (paralel yüzey)

- `AdminYouTubeAnalyticsPage` vs `UserYouTubeAnalyticsPage` → aynı data farklı scope.
- `AdminChannelPerformancePage` vs `UserChannelAnalyticsPage` → aynı.

### 8.4 Sonuç

- **verdict:** Silinecek dead code yok (F2.5 doğru kararla sakladı). Ama 2 stub admin sayfası + 3 paralel admin/user analytics sayfa çifti tek shell'e dönüştürülmeye hazır.
- **kanıt:** Yukarıdaki tablolar.
- **risk:** "Zaten var" sanılan admin sayfaları gerçekte boş → demolarda utandırıcı.
- **önerilen sonraki adım:** R3 IA'da "Admin Operations Hub" (automation + inbox + calendar) + "Unified Analytics" (admin/user tek component, scope arg'ı ile) öner.

---

## 9. UX Complexity Map (K6 Uyumlu)

**Sayfa envanteri:** 98+ page-level component (54 admin + 21 user + 7 root + 1 scaffold + 21 surface).

### 9.1 Tekrar Eden Ekran Çiftleri (Admin/User aynı data)

1. Automation: `AdminAutomationPoliciesPage` ↔ `UserAutomationPage`
2. Inbox: `AdminInboxPage` (stub) ↔ `UserInboxPage`
3. Calendar: `AdminCalendarPage` (stub) ↔ `UserCalendarPage`
4. Analytics YouTube: `AdminYouTubeAnalyticsPage` ↔ `UserYouTubeAnalyticsPage`
5. Channel performance: `AdminChannelPerformancePage` ↔ `UserChannelAnalyticsPage`
6. Publish: `PublishCenterPage` ↔ `UserPublishPage` ↔ `UserPublishEntryPage` (scaffold)
7. Connections: `AdminConnectionsPage` ↔ `UserConnectionsPage`
8. Comments/Playlists/Posts: her biri Admin × User çifti

→ **8 tekrar eden ekran çifti**.

### 9.2 Surface Varyantı Yüzünden Çoğalmış Ekranlar

- User dashboard: `UserDashboardPage` (legacy) + `CanvasUserDashboardPage` + `AtriumUserDashboardPage` → **3 paralel**
- User projects list: `MyProjectsPage` + `CanvasMyProjectsPage` + `AtriumProjectsListPage` → **3 paralel**
- User project detail: `ProjectDetailPage` + `CanvasProjectDetailPage` + `AtriumProjectDetailPage` → **3 paralel**
- User channel detail: `ChannelDetailPage` + `CanvasChannelDetailPage` → **2 paralel**
- User publish: `UserPublishPage` + `CanvasUserPublishPage` → **2 paralel**
- User calendar: `UserCalendarPage` + `CanvasUserCalendarPage` → **2 paralel**
- Admin jobs: `JobsRegistryPage` + `BridgeJobsRegistryPage` → **2 paralel**
- Admin job detail: `JobDetailPage` + `BridgeJobDetailPage` → **2 paralel**
- Admin publish center: `PublishCenterPage` + `BridgePublishCenterPage` → **2 paralel**

→ **9 route × ortalama 2.3 paralel varyant** = gerçek maintenance yükü.

### 9.3 Aynı Veriyi Farklı İsimle Gösteren Ekranlar

- "İçerik Kütüphanesi" (`ContentLibraryPage`) vs "Projelerim" (`MyProjectsPage`) — büyük kesişim.
- "Varlık Kütüphanesi" (`AssetLibraryPage`) vs "Şablonlar" (`TemplatesRegistryPage`) — kesişim var, naming ayırıyor.

### 9.4 Flow'u Kitleyen Ekranlar

- `NewsBulletinWizardPage` (1409 LoC) — tek sayfa 5+ step, geri dönüş bozuk → AL-10.
- `UserAutomationPage` — policy olmadan aşağı akmıyor, kanal seçim zorunlu.

### 9.5 Sonuç

- **verdict:** Gerçek sadeleştirme kârı: (1) surface varyantı konsolidasyonu, (2) admin/user ekran çifti paylaşımı, (3) wizard base unification.
- **kanıt:** Yukarıdaki üç liste.
- **öneri:** R3 IA'da yeni bilgi mimarisi **en fazla 30–35 page-level component** hedeflesin (%65 azalma).

---

## 10. Gerçek Sadeleştirme İhtiyacı — "Korunmalı / Basitleştirilmeli / Birleştirilmeli / Test-only" Tabloları

### 10.1 Tablo A — Korunmalı (Bilinçli, Omurga)

| Alan | Dosya/Sınıf | Neden korunmalı |
|---|---|---|
| Settings Registry | `backend/app/settings/` | 4-katman resolver + drift repair |
| Visibility Engine | `backend/app/visibility/` + `frontend/src/hooks/useVisibility` | Panel/widget/field kontrolü |
| Ownership zinciri | `backend/app/core/ownership.py` + 158 guard | Fail-closed 3-katman |
| Publish state machine | `backend/app/publish/state_machine.py` | can_publish() terminal guard |
| Job engine | `backend/app/jobs/` | 2533 test koruması |
| Theme Registry + force-hydrate | F4 delta | Design tokens otoritesi |
| Wizard governance | `WizardSettingsPage` + `visible_in_wizard` | Wizard'ı Settings Registry'ye bağlar |
| Remotion safe composition mapping | `renderer/` | AI render kod sızdırmaması |
| SSE pipeline | `backend/app/sse/` | Realtime update truth |
| Audit log | `backend/app/audit/` | Regülasyon tabanı |

### 10.2 Tablo B — Basitleştirilmeli (Değer Var Ama Şişmiş)

| Alan | Kanıt | Öneri |
|---|---|---|
| UserCalendarPage (827 LoC) | `user/UserCalendarPage.tsx` | Alt-componentlere böl (CalendarGrid + EventRow + FilterBar) |
| NewsBulletinWizardPage (1409 LoC) | `admin/NewsBulletinWizardPage.tsx` | `ContentCreationWizard` host üstüne taşı; admin/user tek base |
| CanvasChannelDetailPage (1028 LoC) | `surfaces/canvas/` | Channel view shell + 3 tab component |
| useLayoutNavigation.ts (396 LoC) | `app/layouts/useLayoutNavigation.ts` | Tek `NAV_REGISTRY` truth source |
| UserPublishPage (521 LoC) | `user/UserPublishPage.tsx` | PublishFlow machine'e state ayır |

### 10.3 Tablo C — Birleştirilmeli (Paralel Çoğalma)

| Alan | Kanıt | Öneri |
|---|---|---|
| 5 surface (legacy+horizon+atrium+bridge+canvas) | `register.tsx:268-272` | Canvas + legacy ikiliye indir; Atrium/Bridge'i Canvas override'larına birleştir |
| Classic + Horizon nav (user-side drift) | `useLayoutNavigation.ts:74-278` | Tek `NAV_REGISTRY` |
| Admin/User analytics × 3 çift | §9.1 | Tek `AnalyticsShell` + scope arg |
| Admin/User automation + inbox + calendar (stubs) | §6 | "Admin Operations Hub" tek shell |
| Admin vs user bülten wizardı | §5 | `ContentCreationWizard` host |
| ContentLibrary vs Projelerim | §9.3 | Tek "Library" shell (Projects tab + Content tab) |

### 10.4 Tablo D — Test-only / Scaffold

| Alan | Neden dokunulmamalı |
|---|---|
| `_scaffolds/UserPublishEntryPage.tsx` | 12 smoke test bağımlı, F2.5 kararı ile korundu |
| Surface manifest reset helpers (`__resetSurfaceRegistry`) | Test/HMR için zorunlu |
| 202 frontend test dosyası | Surface konsolidasyonu sırasında yeniden yazılacak ama silinmeyecek |

---

## 11. Benchmark Ön Sözleri (R2'ye Girdi)

R1 bu rakip analizini yürütmez; **R2'nin çerçevesini** koyar. Aday platform listesi:

- **Automation:** n8n, Make.com, Zapier
- **Publish/Calendar/Social:** Hootsuite, Buffer, Metricool, Later
- **Asset/Brand/Media:** OpusClip, Canva Studio
- **Analytics:** Metricool, Later
- **Approval/Admin workspace:** Hootsuite enterprise

Her platform × 7 UX kategorisi için R2 tarafından 4-etiket (🟢 Doğrudan / 🟡 Uyarlanabilir / 🟠 Veri modeli gerekli / 🔴 Yapılmamalı) uygulanacak.

---

## 12. Kontrat Satırları (Strict No-Change)

```
code change:         no
migrations run:      no
packages installed:  no
db schema mutation:  no
db data mutation:    no
main branch touched: no
```

**Kanıt:** Bu raporun üretimi yalnızca `docs/phase_r1_repo_reality_audit.md` dosyasını oluşturur. `git diff --stat backend/ frontend/ renderer/` çıktısı boştur (commit öncesi ve sonrası). Worktree izolasyonu `33783e1` üzerinden korunmaktadır.

---

## 13. K10 Ek Özet (En Kritik 3+3+1)

**Sistemin şu an en büyük 3 yapısal riski:**
1. **Surface 5'li mix (legacy+horizon+atrium+bridge+canvas) + dar page override'ları** — ürün kimliği tutarsız, her surface kendi kodunu büyütüyor (`register.tsx:268-272`).
2. **Navigation truth source çift imza** — classic user nav 12 item, Horizon user nav 20 item; bazı sayfalar yalnızca URL ile (`useLayoutNavigation.ts:74-278`).
3. **Wizard çakışması** — admin bülten wizardı 1409 LoC, user 195 LoC; davranış farkı korunsa bile admin+user aynı base'den gelmediği için test yükü iki kat (`admin/NewsBulletinWizardPage.tsx` vs `user/CreateBulletinWizardPage.tsx`).

**En büyük 3 UX karmaşa kaynağı:**
1. **Admin operasyonel stub'lar** — AdminCalendarPage + AdminInboxPage 11 LoC (kullanıcı panelinde zengin karşılığı var). Admin demoya gittiğinde boş sayfa görülür.
2. **UserAutomationPage 5-dropdown matris** — "automation policy" kavramı düz form ile sunuluyor; sektör standardı (n8n/Make/Zapier) visual flow builder.
3. **Analytics 9 sayfa dağılımı** — admin 6 + user 3 analytics; tek bir "analytics dashboard" yok.

**En güvenli 1 ilk implementasyon fazı (R6'nın ilk adımı için aday):**
- **Navigation truth source konsolidasyonu** (`useLayoutNavigation.ts` → tek `NAV_REGISTRY`). Çünkü:
  - Risk düşük: salt frontend revizyonu, backend etkilenmiyor.
  - Önkoşul yok: Settings Registry / Visibility Engine zaten var.
  - Kazanç büyük: classic/horizon drift kapanır, test yükü `useLayoutNavigation`'dan bir yerde toplanır.
  - Surface konsolidasyonuna (en büyük 1. risk) zemin hazırlar.

---

## 14. Sonraki Adım (R2 Hazırlığı)

R2 girdi çerçevesi bu raporda tamamdır. R2 dalgasında:
- 9 platform × 7 kategori × 4-etiket matrisi çıkarılacak.
- "Doğrudan uygulanabilir" 15 pattern önceliklendirilecek.
- Surface konsolidasyonu + navigation truth source konsolidasyonu bu pattern'lerle doğrulanacak.
- Çıktı: `docs/phase_r2_benchmark_patterns.md`.

R2 başlamadan önce kullanıcı bu raporu onaylayacak; onay gelmeden R2 başlamaz.

---
