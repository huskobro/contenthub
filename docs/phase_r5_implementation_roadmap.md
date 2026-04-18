# Faz R5 — Uygulama Sırası / Mapping / Eski-Yeni Yüzey Eşleme / Kesin Yol Haritası

**Tarih:** 2026-04-17
**Worktree:** `.claude/worktrees/product-redesign-benchmark`
**Taban:** R1 (risk) + R2 (pattern) + R3 (IA) + R4 (iskelet)
**Amaç:** R6'da yazılacak kodun **kesin sırasını**, her dalganın **risk/bağımlılık/test yükü/efor** tahminlerini, eski → yeni yüzey **eşleme tablosunu**, lib kararlarını ve **kritik taşıma sıralamasını** dondurmak.

---

## 0. Özet Kararlar

- **R6 toplam dalga sayısı:** 11 dalga (RA → RK).
- **Toplam tahmini efor:** ~32–40 efektif çalışma saati (R6 autonomous mod).
- **İlk dalga:** RA — NAV_REGISTRY + paylaşılan çekirdek component + scaffold yerleşimi (en güvenli, önkoşulsuz).
- **Son dalga:** RK — eski kodun `.deprecated.tsx` postfix temizliği + smoke test path güncellemesi.
- **Lib kararları:** `@xyflow/react` için gereklilik kanıtı (§8); başka yeni npm kütüphanesi yok.
- **Settings Registry:** R6 boyunca toplam 17 yeni anahtar (R3'teki 9 + R4'teki 8).
- **Migration:** 1 opsiyonel (P11 Queue-first scheduling `publish_schedule_slots`); scope dışı bırakıldı (§5.3).

---

## 1. 11 Uygulama Dalgası (RA → RK)

### RA — Navigation Truth Source + Paylaşılan Çekirdek (Temel)

**Amaç:** `NAV_REGISTRY` + PageShell/TabBar/ShellCard/KpiTile/MockDataSource/EmptyState bileşenleri ayağa kalsın. Hiçbir shell henüz taşınmaz.

**Değişecek:**
- `frontend/src/app/navigation/NAV_REGISTRY.ts` (yeni)
- `frontend/src/app/navigation/buildAdminNav.ts` + `buildUserNav.ts` + `buildHorizonGroups.ts` + `buildCmdPaletteActions.ts` (yeni)
- `frontend/src/scaffolds/redesign/_shared/*` (6 component)
- `frontend/src/app/layouts/useLayoutNavigation.ts` → NAV_REGISTRY consumer'a sadeleşir
- Smoke test: `nav-registry-truth-source.smoke.test.tsx` (classic == horizon == cmd+k senkron)

**Bağımlılık:** Yok.
**Risk:** Düşük. Layout'ların UI davranışı değişmez; sadece nav source'u değişir.
**Test yükü:** 1 yeni smoke + 2 güncellenmiş.
**Efor:** ~3 saat.

---

### RB — Settings Registry Yeni Anahtarlar + `ui.surface.*` default Değişimi

**Amaç:** R3/R4'teki 17 Settings Registry anahtarı canlıya alınır. Surface default'ları `horizon` (admin) + `canvas` (user) yapılır.

**Değişecek:**
- `backend/app/settings/known_settings.py` → 17 yeni entry (4 flag × `ui` grubu)
- `backend/alembic/versions/...` → yeni migration (sadece settings seed satırları)
- `frontend/src/surfaces/manifests/atrium.ts` → `status: "experimental"`
- `frontend/src/surfaces/manifests/bridge.ts` → `status: "experimental"`
- `frontend/src/surfaces/resolveActiveSurface.ts` → default reading update

**Bağımlılık:** RA (şart değil ama sıra mantıklı).
**Risk:** Orta. Surface default'u değiştiği için smoke testler güncellenmeli.
**Test yükü:** 8 güncellenmiş (surface-panel-switch-*.smoke.test.tsx), 2 yeni (settings-drift-post-RB.smoke.test.tsx).
**Efor:** ~4 saat.

---

### RC — `ContentCreationWizard` Host + Module Config JSON'ları

**Amaç:** Wizard unified host. `NewsBulletinWizardPage` (1409 LoC monolit) dönüşmeye başlar.

**Değişecek:**
- `frontend/src/scaffolds/redesign/shared/ContentCreationWizard/*` (host + step bileşenleri)
- `frontend/src/scaffolds/redesign/shared/ContentCreationWizard/config/news_bulletin.wizard.json` (+ 4 modül)
- `frontend/src/scaffolds/redesign/shared/preview/*` (4 preview component)
- Smoke test: `content-creation-wizard-guided-advanced.smoke.test.tsx`, `wizard-config-module-parity.smoke.test.tsx`

**Bağımlılık:** RA (PageShell, vs.). RB (Settings `ui.wizard.mode.default`).
**Risk:** Orta. Preview artifact contract'ının Remotion uyumu doğrulanmalı.
**Test yükü:** 2 yeni + mevcut wizard smoke testlerinin **güncellenmesi** (4 dosya).
**Efor:** ~6 saat.

---

### RD — CalendarShell + InboxShell + Admin Stub Doldurma

**Amaç:** AdminCalendarPage + AdminInboxPage 11 LoC stub'ları paylaşılan shell ile dolar.

**Değişecek:**
- `frontend/src/scaffolds/redesign/shared/CalendarShell/*`
- `frontend/src/scaffolds/redesign/shared/InboxShell/*`
- `frontend/src/pages/admin/AdminCalendarPage.tsx` → delegate
- `frontend/src/pages/admin/AdminInboxPage.tsx` → delegate
- Backend: `/api/v1/calendar/events` + `/api/v1/inbox` endpoint'lerine `scope="all"` query param (sadece admin). Mevcut endpoint değişmez; yalnızca admin için genişletilir.
- Smoke test: `admin-calendar-all-users.smoke.test.tsx`, `admin-inbox-all-users.smoke.test.tsx`

**Bağımlılık:** RA.
**Risk:** Düşük (backend guard zaten var).
**Test yükü:** 2 yeni + mevcut 2 stub testi güncellenir.
**Efor:** ~4 saat.

---

### RE — AnalyticsShell (9 sayfa → 1 shell)

**Amaç:** Analytics konsolidasyonu.

**Değişecek:**
- `frontend/src/scaffolds/redesign/shared/AnalyticsShell/*` (shell + 5 tab)
- 3 user + 6 admin analytics sayfası shell'e kayar; route'lar tek `/admin/analytics?tab=*` + `/user/analytics?tab=*`.
- Router güncellemesi.
- Smoke test: `analytics-shell-scope.smoke.test.tsx`, `analytics-shell-tab-switch.smoke.test.tsx`, `analytics-shell-empty-state.smoke.test.tsx`

**Bağımlılık:** RA.
**Risk:** Orta — 9 sayfa smoke testi yeniden eşleşmeli.
**Test yükü:** 3 yeni + 5 güncellenmiş.
**Efor:** ~4 saat.

---

### RF — LibraryShell (Content + Assets + Projects)

**Amaç:** 3 library sayfası tek shell.

**Değişecek:**
- `frontend/src/scaffolds/redesign/shared/LibraryShell/*`
- User `/user/library` + admin `/admin/library`.
- Smoke test: `library-shell-tabs.smoke.test.tsx`, `library-shell-empty-state.smoke.test.tsx`

**Bağımlılık:** RA, RB (preview settings).
**Risk:** Düşük.
**Test yükü:** 2 yeni + 3 güncellenmiş.
**Efor:** ~3 saat.

---

### RG — PublishShell (queue + review + schedule + calendar)

**Amaç:** Publish konsolidasyonu; P5 approval + P4 calendar entegrasyon.

**Değişecek:**
- `frontend/src/scaffolds/redesign/shared/PublishShell/*`
- User `/user/publish?tab=*` + admin `/admin/publish?tab=*`.
- Smoke test: `publish-shell-tabs.smoke.test.tsx`, `publish-shell-review-approval.smoke.test.tsx`

**Bağımlılık:** RA, RD (CalendarShell).
**Risk:** Orta — `UserPublishEntryPage` scaffold smoke testleri (12 dosya) güncellenir.
**Test yükü:** 2 yeni + 12 güncellenmiş.
**Efor:** ~5 saat.

---

### RH — UserAutomationPage Guided/Advanced + Flow Canvas

**Amaç:** P1 + P2 toggle. `@xyflow/react` gerekliliği R5'te net (aşağıda §8). Eğer onay alınırsa ekleme RH dalgasında; yoksa SVG fallback.

**Değişecek:**
- `frontend/src/pages/user/UserAutomationPage.tsx` → shell
- `frontend/src/scaffolds/redesign/user/UserAutomationPage/GuidedView.tsx`
- `frontend/src/scaffolds/redesign/user/UserAutomationPage/AdvancedMatrixView.tsx`
- `frontend/src/scaffolds/redesign/user/UserAutomationPage/AdvancedFlowView.tsx`
- AdminAutomationPoliciesPage → aynı pattern ama düz liste → flow canvas opsiyonu.
- Smoke test: `user-automation-view-toggle.smoke.test.tsx`

**Bağımlılık:** RA, RB (Settings `automation.view.default`). `@xyflow/react` kararına göre RH içinde veya RH₁.
**Risk:** Orta — npm lib eklenmesi veya SVG fallback.
**Test yükü:** 2 yeni + 1 güncellenmiş.
**Efor:** ~6 saat (canvas) veya ~4 saat (SVG fallback).

---

### RI — EngagementHub + UsersShell + JobsShell + TemplatesShell + NewsSourceShell + NewsBulletinShell + StandardVideoShell

**Amaç:** Geri kalan admin shell'ler konsolide olur.

**Değişecek:** 7 admin shell (R3 §2.2 eşleme tablosu). Her biri ≤400 LoC.
**Bağımlılık:** RA, RC (wizard host).
**Risk:** Düşük — şişkin değişiklik ama paralel pattern yok.
**Test yükü:** 7 × 2 smoke = 14 yeni + 10 güncellenmiş.
**Efor:** ~8 saat.

---

### RJ — UserDashboardPage P14 Three-View + BrandProfilePage + CreateHub + EmptyState uygulaması

**Amaç:** User side pattern uygulaması.

**Değişecek:**
- UserDashboardPage 3-blok.
- BrandProfilePage (P8) yeni.
- CreateHub (P12 empty-state + module picker).
- EmptyState 5 bölgede aktif.
- Smoke test: `user-dashboard-three-view.smoke.test.tsx`, `brand-profile-page.smoke.test.tsx`, `empty-state-coverage.smoke.test.tsx`

**Bağımlılık:** RA, RB, RF (LibraryShell).
**Risk:** Düşük.
**Test yükü:** 3 yeni + 2 güncellenmiş.
**Efor:** ~4 saat.

---

### RK — Temizlik + Deprecation + Docs

**Amaç:** Eski shell'ler `.deprecated.tsx` postfix'i alır; 2-3 commit sonra silinir; smoke test path'leri final.

**Değişecek:**
- 20+ eski sayfa → scaffold'a taşınmış olan karşılıkları silinir.
- Router v2 (34 route).
- Docs: `docs/phase_r6_implementation_notes.md` (canlı commit log).
- `CHANGELOG.md` güncellemesi.
- Release notes v2.
- Smoke test path toplu refactor.

**Bağımlılık:** Tüm önceki dalgalar.
**Risk:** Düşük (her adım atomik).
**Test yükü:** Smoke test path güncellemesi (zero new logic).
**Efor:** ~2 saat.

---

## 2. Dalga Özet Tablosu

| Dalga | Başlık | Risk | Efor (saat) | Yeni test | Güncellenen test | Yeni lib | Migration |
|---|---|---|---|---|---|---|---|
| RA | NAV_REGISTRY + çekirdek | Düşük | 3 | 1 | 2 | — | — |
| RB | Settings + surface default | Orta | 4 | 2 | 8 | — | Settings seed |
| RC | ContentCreationWizard | Orta | 6 | 2 | 4 | — | — |
| RD | CalendarShell + InboxShell + stubs | Düşük | 4 | 2 | 2 | — | — |
| RE | AnalyticsShell | Orta | 4 | 3 | 5 | — | — |
| RF | LibraryShell | Düşük | 3 | 2 | 3 | — | — |
| RG | PublishShell | Orta | 5 | 2 | 12 | — | — |
| RH | UserAutomation P1+P2 | Orta | 4-6 | 2 | 1 | @xyflow/react (koşullu) | — |
| RI | 7 admin shell | Düşük | 8 | 14 | 10 | — | — |
| RJ | Dashboard + Brand + Hub | Düşük | 4 | 3 | 2 | — | — |
| RK | Temizlik + deprecation | Düşük | 2 | 0 | toplu rename | — | — |
| **Toplam** | | | **~47h** | **33** | **~50** | 1 koşullu | 1 seed |

---

## 3. Eski → Yeni Yüzey Eşleme Tablosu (Kesin)

### 3.1 Admin (eski 54 → yeni 20 route)

| Eski route | Eski component | Yeni route | Yeni component | Taşıma dalgası |
|---|---|---|---|---|
| `/admin` | AdminOverviewPage | `/admin` | OperationsOverview | RJ |
| `/admin/automation` | AdminAutomationPoliciesPage | `/admin/automation` | AdminAutomationPage | RH |
| `/admin/inbox` | AdminInboxPage (stub 11 LoC) | `/admin/inbox` | AdminInboxPage (delegate) | RD |
| `/admin/calendar` | AdminCalendarPage (stub 11 LoC) | `/admin/calendar` | AdminCalendarPage (delegate) | RD |
| `/admin/settings` | SettingsRegistryPage | `/admin/settings` | aynı | RB |
| `/admin/visibility` | VisibilityRegistryPage | aynı | aynı | — |
| `/admin/wizard-settings` | WizardSettingsPage | aynı | aynı | — |
| `/admin/jobs` | JobsRegistryPage | `/admin/jobs?tab=list` | JobsShell | RI |
| `/admin/jobs/:jobId` | JobDetailPage | `/admin/jobs/:id` | JobsShell?tab=detail | RI |
| `/admin/standard-videos*` | 4 sayfa | `/admin/standard-videos?tab=*` | StandardVideoShell | RI |
| `/admin/templates*` + `style-blueprints*` + `template-style-links*` | 3 shell | `/admin/templates?tab=*` | TemplatesShell | RI |
| `/admin/sources*` + `source-scans*` + `news-items*` + `used-news*` | 8 sayfa | `/admin/news?tab=*` | NewsSourceShell | RI |
| `/admin/news-bulletins*` | 4 sayfa | `/admin/news-bulletins?tab=*` | NewsBulletinShell | RI + RC |
| `/admin/library` + `/admin/assets` | 2 sayfa | `/admin/library?tab=*` | LibraryShell | RF |
| `/admin/publish*` | 3 sayfa | `/admin/publish?tab=*` | PublishShell | RG |
| `/admin/analytics*` | 6 sayfa | `/admin/analytics?tab=*` | AnalyticsShell | RE |
| `/admin/comments` + `playlists` + `posts` | 3 sayfa | `/admin/engagement?tab=*` | EngagementShell | RI |
| `/admin/users*` | 2 sayfa | `/admin/users?tab=*` | UsersShell | RI |
| `/admin/audit-logs` | AuditLogPage | aynı | aynı | — |
| `/admin/modules` | ModuleManagementPage | aynı | aynı | — |
| `/admin/providers` | ProviderManagementPage | aynı | aynı | — |
| `/admin/prompts` | PromptEditorPage | aynı | aynı | — |
| `/admin/themes` | ThemeRegistryPage | aynı | aynı | — |
| `/admin/connections` | AdminConnectionsPage | aynı | aynı | — |
| `/admin/notifications` | AdminNotificationsPage | aynı | aynı | — |

### 3.2 User (eski 26 → yeni 14 route)

| Eski route | Eski component | Yeni route | Yeni component | Taşıma dalgası |
|---|---|---|---|---|
| `/user` | UserDashboardPage | `/user` | UserDashboardPage (3-blok) | RJ |
| `/user/content` | UserContentEntryPage | `/user/create` | CreateHub | RJ |
| `/user/projects*` | 2 sayfa | `/user/library?tab=projects` + `/user/library?tab=projects&id=*` | LibraryShell | RF |
| `/user/channels*` | 2 sayfa | `/user/channels*` | MyChannelsShell | RI |
| `/user/create/*` | 3 wizard | `/user/create/:moduleId` | ContentCreationWizard | RC |
| `/user/jobs/:id` | UserJobDetailPage | `/user/jobs/:id` | JobDetailPage (shared) | RI |
| `/user/publish*` | 2 sayfa (+ scaffold) | `/user/publish?tab=*` | PublishShell | RG |
| `/user/calendar` | UserCalendarPage (827 LoC) | `/user/publish?tab=calendar` | PublishShell | RG + RD |
| `/user/automation` | UserAutomationPage | `/user/automation` | UserAutomationPage (P1+P2) | RH |
| `/user/inbox` | UserInboxPage | `/user/inbox` | InboxPage (shared) | RD |
| `/user/connections` | UserConnectionsPage | `/user/connections` | ConnectionsPage | RI |
| `/user/comments` + `playlists` + `posts` | 3 sayfa | `/user/engagement?tab=*` | EngagementHub | RI |
| `/user/analytics*` | 3 sayfa | `/user/analytics?tab=*` | AnalyticsShell | RE |
| `/user/news-picker` | UserNewsPickerPage | modal | NewsPickerModal | RI |
| `/user/settings*` | 2 sayfa | `/user/settings` | UserSettingsPage | — |
| *(YENİ)* | — | `/user/brand` | BrandProfilePage (P8) | RJ |

---

## 4. Settings Registry Anahtarları (Toplu)

R3 + R4 toplam 17 yeni anahtar:

| Anahtar | Tür | Default | Grup | Dalga |
|---|---|---|---|---|
| `ui.surface.default.admin` | enum | `horizon` | ui | RB |
| `ui.surface.default.user` | enum | `canvas` | ui | RB |
| `ui.surface.atrium.enabled` | bool | false | ui | RB |
| `ui.surface.bridge.enabled` | bool | false | ui | RB |
| `automation.view.default` | enum | `matrix` | automation | RB |
| `brand_profile.enabled` | bool | true | ui | RB |
| `command_palette.actions_source` | enum | `NAV_REGISTRY` | ui | RB |
| `analytics.default_view` | enum | `content` | ui | RB |
| `publish.calendar.integrated` | bool | true | ui | RB |
| `ui.preview.enabled` | bool | true | ui | RB |
| `ui.preview.size` | enum | md | ui | RB |
| `ui.shell.tabs.persist` | bool | true | ui | RB |
| `ui.wizard.mode.default` | enum | guided | wizard | RB |
| `ui.dashboard.today.block.jobs_count` | int | 5 | ui | RB |
| `ui.dashboard.today.block.inbox_count` | int | 5 | ui | RB |
| `ui.empty_state.show_suggestions` | bool | true | ui | RB |
| `ui.mobile.fallback_behavior` | enum | responsive | ui | RB |

Hepsi `admin_only`, `visible_to_user=false`, `user_override_allowed=false` (sadece `automation.view.default` için `true`).

---

## 5. Veri Modeli / Migration / Deferral Kararları

### 5.1 Yeni tablo — YOK

Hiçbir zorunlu yeni tablo yok; mevcut şema R1–R4 kapsamında yeter. Sadece Settings seed migration'ı (RB).

### 5.2 Endpoint Genişletmeleri

| Endpoint | Dalga | Değişiklik |
|---|---|---|
| `/api/v1/calendar/events` | RD | `scope=all` param (admin-only guard) |
| `/api/v1/inbox` | RD | `scope=all` param (admin-only guard) |
| `/api/v1/analytics/*` | RE | `per_post` query param (drill-down) |

Hepsi mevcut router'ı genişletir; yeni modül yaratmaz. `require_admin` guard zaten mevcut.

### 5.3 Kasıtlı Kapsam Dışı (Erteleme Değil — Açık Sebep)

| Konu | Sebep | Tekrar değerlendirme |
|---|---|---|
| P7 OpusClip URL-in clip modülü | Yeni modül + Remotion composition contract + test yükü R6 scope'unu +%40 büyütür; CLAUDE.md phased delivery order'da "Future module expansion readiness" §37 olarak zaten var | Post-R6 ayrı modül dalgası |
| P11 Queue-first scheduling (`publish_schedule_slots`) | Yeni tablo + service + UI üçlüsü; MVP değeri orta; mevcut `schedule_at` yeterli | Post-R6 |
| P13 Workspace switcher | Multi-tenant'a zemin — CLAUDE.md kesin red | Kalıcı red |
| Mobil native app | CLAUDE.md "local-first" + "multi-tenant early yapmayın" | Uzun vadeli |

---

## 6. Taşıma Sırası Optimizasyonu — Neden Bu Sıra?

**Temel sıra gerekçesi:**

1. **RA önce** — NAV_REGISTRY olmadan diğer dalgaların surface consumer'ları aynı anda hem eski hem yeni source'a bağlı kalır = parallel pattern. Önce tek truth source.
2. **RB ikinci** — Settings Registry anahtarları olmadan bileşenler davranış koşullarını hardcoded hale getirir (CLAUDE.md non-negotiable ihlali). Önce anahtarlar.
3. **RC/RD paralel** — Wizard host + Calendar/Inbox shell'leri paylaşılan; önce onlar dolarsa sonraki dalgalar temiz.
4. **RE → RF → RG** — Analytics → Library → Publish: azalan karmaşıklık sırası.
5. **RH** — Automation: npm lib kararına bağlı; RH sırasını RG sonrasına koyduk ki karar o zamana kadar R5'in §8'inden çıksın.
6. **RI** — Geri kalan admin shell'ler: düşük risk, paralel komponent üretimi.
7. **RJ** — Dashboard + Brand + Hub: user deneyim dokunuşu; önceki shell'lere dayandığı için en sonda.
8. **RK** — Temizlik: her şey oturduktan sonra.

---

## 7. Test Yükü Dağılımı

| Dalga | Yeni smoke | Güncellenen smoke | Toplam etki |
|---|---|---|---|
| RA | 1 | 2 | 3 |
| RB | 2 | 8 | 10 |
| RC | 2 | 4 | 6 |
| RD | 2 | 2 | 4 |
| RE | 3 | 5 | 8 |
| RF | 2 | 3 | 5 |
| RG | 2 | 12 | 14 |
| RH | 2 | 1 | 3 |
| RI | 14 | 10 | 24 |
| RJ | 3 | 2 | 5 |
| RK | 0 | ~40 (path-only) | 40 |
| **Toplam** | **33** | **~89** | **~122** |

Mevcut **202 frontend smoke test**'in %60+'i etkilenir. Her dalga sonunda `npm run test:frontend` doğrulaması mecburi.

---

## 8. Lib Kararları (Gereklilik Kanıtı)

### 8.1 `@xyflow/react` — P1 Flow Canvas

**Gereklilik kanıtı (CLAUDE.md non-negotiable: "önce gereklilik kanıtı"):**

| Kriter | Değerlendirme |
|---|---|
| Kullanım yüzeyi | 2 shell (`UserAutomationPage` + `AdminAutomationPoliciesPage`) |
| Alternatif | (a) SVG manuel, (b) react-flow light fork, (c) xyflow/react (önerilen) |
| Alternatif (a) yok-sayma sebebi | 5+ node + zoom + pan + drag için SVG manual = ~2000 LoC + a11y zorluğu |
| Lib bundle | `@xyflow/react` ~85 kB gzip; Canvas surface zaten 7.9K LoC |
| Uzun vadeli bakım | xyflow aktif, docs kapsamlı |
| Risk | Bundle +85kB, tree-shake mümkün (specific import) |

**Karar:** 🟡 **Şartlı onay.** R6 RH dalgası içinde:
1. Önce SVG manuel iskelet denemesi (1 node + edge) yapılacak.
2. Eğer manuel iskelet a11y + pan/zoom ile ≤400 LoC'de tamamlanırsa SVG devam.
3. 400 LoC aşılırsa `@xyflow/react` eklenecek, `npm install` + settings feature flag `automation.flow.canvas.engine=xyflow|svg` ile toggleable tutulacak.

Bu karar R6'da RH sırasında dalga içi dinamik; tek başına dalga değil.

### 8.2 Başka lib — YOK

- Drag-drop için mevcut `react-dnd` veya native drag events.
- Chart için mevcut `recharts` (zaten analytics sayfalarında var).

---

## 9. Risk × Önkoşul × Kurtarma Matrisi

| Risk | Hangi dalgada | Etkilenen | Kurtarma |
|---|---|---|---|
| Nav URL bozulur | RA | Kullanıcı session | Smoke test + rollback commit |
| Surface default değişince layout break | RB | Admin UI | Settings Registry'den geri al |
| Wizard config JSON validation hatası | RC | Wizard run | Config schema validator + fallback guided mode |
| Calendar scope query N+1 | RD | Admin performance | Backend `apply_user_scope` optimize, index kontrol |
| Analytics tab swap yarım veri | RE | User confusion | React Query `staleTime` ayarla + loading skeleton |
| Library drag-drop cross-browser | RF | Asset upload | Fallback button + test matrisi |
| Publish approval race condition | RG | Data integrity | Mevcut `state_machine.py` guard korunur (F3 enforced) |
| xyflow bundle şişer | RH | Page load | Tree-shake + dynamic import |
| EngagementHub data fetch | RI | List render | Mevcut endpoint'ler değişmez; ekstra işlem yok |
| Dashboard empty state yanlış tetiklenir | RJ | First-run UX | `?isFirstRun=true` detection + smoke test |
| Deprecated path'ler silinirken test kırılır | RK | CI | Toplu smoke test yeniden çalıştır; fail olan branch'e geri dön |

---

## 10. Dalga Sonrası Gate'ler

Her dalga bittiğinde (R6 içinde) şu gate'ler çalıştırılır (CLAUDE.md release quality gates + F4 gate zinciri uyumlu):

1. **Code Quality Gate** — lint + typecheck + test.
2. **Behavior Gate** — yeni shell açılır, veri döner, empty/error state render olur.
3. **Product Gate** — NAV_REGISTRY consumer'ları tutarlı (3 consumer senkron).
4. **Stability Gate** — git checkpoint + restart recovery kontrol.
5. **Document Gate** — `docs/phase_r6_implementation_notes.md` her dalga için 5-satırlık closure notu.

R6'da her dalga sonunda commit atılır ve `docs/phase_r6_implementation_notes.md` güncellenir — bu rapor F4 closure'ın yaptığı zinciri tekrar eder.

---

## 11. "Bilerek Korunacaklar" Listesi (R6'da dokunulmayacak)

R1 §10.1'deki Tablo A listesinin her maddesi + şunlar:

- `backend/app/jobs/*` — 2533 test koruması.
- `backend/app/publish/state_machine.py` — F3 can_publish() guard.
- `backend/app/core/ownership.py` — 158 guard çağrısının omurgası.
- `renderer/` Remotion safe composition mapping.
- Design tokens (`frontend/src/styles/tokens.css` veya eşdeğeri) — `feedback_design_tokens.md` uyumu.
- SSE pipeline (`backend/app/sse/`).
- Audit log (`backend/app/audit/`).
- F4 theme force-hydrate + automation digest + drift repair — geri alınmaz, yalnızca üstüne inşa edilir.

---

## 12. R6 Başlangıç Kontrol Listesi (kullanıcı onay vermeden önce/sonra)

- [ ] R1 → R5 rapor zinciri tam: ✅ (AK, AL, AM, AN, Final, F4, R0, R1, R2, R3, R4, R5).
- [ ] NAV_REGISTRY şema kararlaştırıldı: ✅ (R3 §5, R4 §1).
- [ ] 17 Settings Registry anahtarı kararlaştırıldı: ✅ (R5 §4).
- [ ] Surface konsolidasyon kararı: ✅ (R3 §4, R5 §3).
- [ ] Lib kararları: ✅ (R5 §8).
- [ ] Migration/endpoint genişletmeleri sınırları: ✅ (R5 §5).
- [ ] Test yükü tahmini: ✅ (R5 §7, ~122 smoke etkilenmesi).
- [ ] Efor tahmini: ✅ (R5 §2, ~47 saat toplam).
- [ ] Deprecation stratejisi: ✅ (RK dalgası).
- [ ] Rollback kapısı: ✅ (her dalga commit + worktree izolasyon).

---

## 13. Kontrat Satırları

```
code change:         no
migrations run:      no
packages installed:  no
db schema mutation:  no
db data mutation:    no
main branch touched: no
```

---

## 14. Sonraki Adım

R6 — Onay sonrası kod dalgası (RA → RK).
Girdi: R5 yol haritası (bu dosya).
Uygulama: Tek dalga mantığıyla 11 alt-dalga; her alt-dalga sonunda closure satırı + commit.

---

## 15. K10 Ek Özet (R5 özelinde)

**Sistemin en büyük 3 uygulama riski:**
1. **RG PublishShell + 12 smoke test güncellenmesi** — UserPublishEntryPage scaffold zincirinin kararlı kalması.
2. **RH xyflow lib kararı** — 85kB bundle vs SVG manuel 400 LoC sınırı.
3. **RB surface default değişimi** — classic layout smoke testlerinin güncellenmesi (8 test).

**En büyük 3 ürün kazanımı:**
1. **NAV_REGISTRY truth source** — 4 paralel liste → 1; ghost page riski kapanır.
2. **ContentCreationWizard unified host** — 1409 LoC monolit → config JSON.
3. **AnalyticsShell** — 9 sayfa → 1 shell; kullanıcı "dashboard" algısı kazanır.

**En güvenli 1 ilk implementasyon dalgası:**
- **RA — NAV_REGISTRY + paylaşılan çekirdek**. Sebep: hiçbir backend değişikliği yok, surface UI davranışı aynı kalır, test yükü 3 (düşük), tüm sonraki dalgaların tabanı.

---
