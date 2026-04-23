# ContentHub — Kod & Operasyonel Doğruluk Denetim Raporu

**Tarih:** 2026-04-23
**Denetim Dalı:** `codex/aurora-theme-identity-pass` (HEAD: `360a4fd`)
**Karşılaştırma Hedefi:** `main`
**Kapsam:** Frontend + backend temas eden kod; özellikle UI tıklanabilirlik ve main-merge güvenliği
**Önceki rapor:** `CODE_AUDIT_REPORT_2026-04-22.md` — bu rapor onu günceller, tekrar etmez

---

## 1. Executive Summary

Bu dal (`codex/aurora-theme-identity-pass`) main'e göre **sadece 7 dosyayı** değiştirir, hepsi theme katmanında (tokens, tema manifestleri, tema galeri sayfası, tema store yorumu, 2 test dosyası). Backend, router, settings contract'ları, UI iskeleti, state store davranışları bu dalda **dokunulmamış**. Yani bu dalın kendi merge riski düşük.

Ancak genel operasyonel sağlık iki açık kusur gösteriyor:

1. **Admin Dashboard'da 2 tane `role="note"` tile'ı** (DB + Python) görsel olarak yan komşularıyla birebir aynı — "İşler" ve "Hatalar" tile'ları `<button>` + `onClick` ile drill-down sağlıyor, DB ve Python ise sadece statik metin. Kullanıcı tıklayıp bir şey olmayınca UI sözünü tutmuyor gibi görünüyor.
2. **Kullanıcı panelinde bir navigation prefix hayalet**: `AuroraUserLayout.tsx:46` "Projeler" slot'unun `matchPrefixes` listesinde `/user/jobs` yazıyor ama `router.tsx:284-325` içinde `/user/jobs` **liste** route'u tanımlı değil, sadece `/user/jobs/:jobId` detail route'u var. Bu literal şu anda zararsız (sadece active-rail highlight için kullanılıyor, navigate tetiklemiyor) ama yanıltıcı bir artefakt.

Bunların dışında incelenen her endpoint, her büyük CTA ve her canonical route doğru kablolanmış. Önceki Phase 1 agent'ının iddia ettiği `SettingRow` `ui.timezone` / `ui.date_format` dual-write iddiası, `credentialsApi` vs `effectiveSettingsApi` çakışma iddiası, theme "dual write" iddiası — kod doğrulamasında **yanlış bulundu** (detay §Phase 1 yanlış pozitif düzeltmeleri bölümünde).

### 5 En Ağır Mimari Problem
1. **Tekrar eden audit raporları kod tabanında** (`CODE_AUDIT_REPORT_2026-04-22.md`, `AURORA_FINAL_AUDIT.md`, `AURORA_IMPROVEMENT_DESIGN.md`, `AURORA_PROGRESS_REPORT.md`, `MERGE_READINESS.md`, `audit_plan.md`, `integration_plan.md`) — kök dizinde 7 farklı denetim belgesi. Hangisi yürürlükte belirsiz.
2. **Legacy `pages/` ağacı yaşıyor** (`frontend/src/pages/admin/`, `frontend/src/pages/user/`) ama router.tsx Aurora sayfalarını kullanıyor. Legacy sayfalar ağaçta durmaya devam ediyor → yeni katkıda bulunan hangi dosyayı düzenleyeceğini karıştırır.
3. **İki adet CLAUDE.md**: `/Users/huseyincoskun/Downloads/CLAUDE.md` (proje-agnostik eski kopya) ve `/Users/huseyincoskun/Downloads/AntigravityProje/ContentHub/CLAUDE.md` (güncel). Workspace düzeyinde okunmaya çalışılan ilk dosya stale.
4. **`docs/` ve `docs_drafts/` paralel**: `docs_drafts/` 195 dosya taşıyor, ne merge edildi ne silindi. Doc sprawl.
5. **Backend ⇄ frontend contract'ı test edilmiyor**: Backend router endpoint'leri ile frontend API client path'leri arasında otomatik uyum kontrolü yok. Endpoint silindiğinde UI'da 404 fark edilmeden yaşayabilir (bugün için drift yok ama mekanik yok).

### 5 En Ağır UI/UX Operasyonel Problem
1. **`AuroraAdminDashboardPage.tsx:500-521`** — DB health tile, `role="note"` div, onClick yok. Aynı grid'te komşu button tile'lar tıklanabilir. UI yalan söylüyor (tile tıklanabilir görünüyor).
2. **`AuroraAdminDashboardPage.tsx:536-551`** — Python health tile, aynı problem.
3. **`/user/jobs` hayalet prefix** (`AuroraUserLayout.tsx:46`, `CockpitShell.tsx:837-841`) — zararsız ama kafa karıştırıcı; matchPrefix listesi ile router tanımı arasında drift.
4. **`toast.success` kullanım hacmi yüksek (aurora surface'te 77 yerde)** — React Query `onSuccess` içinde olduğu için fake-success riski düşük ama tek bir merkezi wrapper olmadığı için her sayfanın error path kalite kontrolü kendi başına.
5. **Kök dizinde `USER_GUIDE.md` ve `CODE_AUDIT_REPORT*.md` otomatik üretildikten sonra güncellenmiyor** — kullanıcı rehberi ve denetim raporu farkında olmadan stale olabilir.

### 5 En Ağır Source-of-Truth / Config Problemi
1. **Theme active id için 2 yazıcı:** localStorage (primary, sync) + `PUT /settings/effective/ui.active_theme` (fire-and-forget). Backend başarısız olsa sessizce yenilir. `themeStore.ts:128`.
2. **Surface pref için 2 yazıcı**: localStorage `contenthub:active-surface-id` + backend `ui.active_surface` setting'i. Aynı fire-and-forget pattern.
3. **localStorage `writeMigrated` v0→v1 migration'ı** — tarihsel artefakt, yeni kurulumlarda asla tetiklenmez ama kod taşıyor (`themeStore.ts:150+`). Silme adayı.
4. **Kullanıcı tarafı custom tema listesi** `contenthub:custom-themes` localStorage'da, backend'e hiç senkronize değil. İki cihaz arasında paylaşım yok. Spec gereğince güvenli ama "aurora curated gallery" ile bu alanın ilişkisi belirsiz (Aurora allow-list custom tema import'unu reddeder).
5. **İki CLAUDE.md** (bkz. mimari #3) — runtime'a ulaşmayan bir config değil ama Claude/bu tür agent'lar için ikinci rehberi okurken yanlış politikayı referans alabilir.

### 5 En Büyük Sadeleştirme Fırsatı
1. **Kök dizindeki 7 audit/plan markdown'ını** tek bir `docs/history/` altına taşı, en güncel `CODE_AUDIT_REPORT.md`'yi en üste bırak.
2. **`frontend/src/pages/admin/` + `frontend/src/pages/user/`** — Aurora override'ları kanonikse, legacy ağacı kaldır. Eğer fallback gerekiyorsa bunu belgele ve minimum seti tut.
3. **`docs_drafts/`** — ya merge et ya sil; 195 taslak dosya ağırlık yapıyor.
4. **Theme + surface localStorage'ı tek bir `contenthub:prefs` JSON key'i altında topla**; aynı fire-and-forget senkronizasyonu ortak bir util ile yürüt.
5. **Aurora surface primitive'lerini tipi şeyleştir**: `AuroraInspector`, `AuroraInspectorSection`, `AuroraInspectorRow` gibi presentational bileşenler her Aurora sayfasında ad-hoc kullanılıyor; tek bir `inspector/` klasöründe topla.

---

## 2. Architecture Assessment

- **Pattern:** FastAPI (router → service → repository) + React/Vite/Zustand/React Query surface system. Genelde disiplinli.
- **Gerçek katmanlar:** Backend'de router / service / model net. Frontend'de Aurora surface + lazy-loaded page katmanı net.
- **Sahte katmanlar:** `pages/admin/`, `pages/user/` legacy ağacı Aurora override'ı tam olunca redundant. Bazı router import'ları hâlâ `../../pages/user/MyProjectsPage` gibi legacy path'lerden geliyor. Bu bilinçli olabilir ama Aurora isimlendirmesi ile tutarsız.
- **Coupling / cohesion:** Aurora sayfaları kendi token setine ve primitives'e oturtulmuş, coupling kabul edilebilir. Backend service'leri settings registry + job engine etrafında çok bağlı ama bu domain'in doğasından.
- **Proje şekli vs gerçek hedef:** Localhost-first MVP'ye uygun. SaaS-level karmaşa yok.
- **Sınır netliği:** Frontend/backend sınırı (API v1) net. Ancak config katmanı: `Settings Registry`, `localStorage prefs`, `credentials panel` — üç ayrı yazıcı var, hepsi farklı amaç için ama bu ayrım her geliştirici için belirgin değil. Bir şema tablosu yardımcı olur (bu raporda §8 Source-of-Truth Table).

---

## 3. UI/UX System Assessment

- **Yapısal güven:** Yüksek. Sidebar rail → layout → route eşlemesi CLAUDE.md'de yazılı ve kodda tutarlı.
- **UX = runtime doğruluğu:** 2 tile istisna dışında tutarlı. Dashboard, branding center, automation center, analytics, publish center — hepsi gerçek endpoint'e oturuyor.
- **IA tutarlılığı:** Canonical route vocabulary (`/branding-center`, `/automation-center`) hem router'da hem redirect katmanında uyumlu. Forbidden literal (`/branding`, `/automation`) redirect ile karşılanıyor — iyi iş.
- **Form + değer kaynağı:** Ayar formları tek kaynak (`/settings/effective/{key}`). Credential'lar ayrı endpoint (`/settings/credentials`) — bunlar bilerek ayrı (secret handling). Bu ayrımı SoT tablosunda açık tutuyorum.
- **Action traceability:** Aurora sayfalarında handler → api client → backend → persistence zinciri takip edilebiliyor. Tek bir handler "eğlence için" bırakılmış stub bulunmadı (TODO/FIXME sweep temiz).
- **Ölü parçalar:** Legacy `pages/` ağacının bazı parçaları router'da tüketiliyor ama Aurora override'ı olan slot'lar için fazlalık. Silme fırsatı var (§10 Removal Candidates).
- **Karar:** Incremental onarım — rewrite gereksiz.

---

## 4. File & Module Findings

### Core Modules
| File | Purpose | Importance | Layer | Main Problems | Recommendation | Risk |
|---|---|---|---|---|---|---|
| `frontend/src/app/router.tsx` | Route tanımı, redirect'ler, lazy imports | core | route | `/user/jobs` listesi yok ama matchPrefix var | keep (refactor: matchPrefix'i kaldır) | low |
| `frontend/src/surfaces/aurora/AuroraAdminLayout.tsx` | Admin rail + chrome | core | UI | — | keep | low |
| `frontend/src/surfaces/aurora/AuroraUserLayout.tsx` | User rail + chrome | core | UI | L46 hayalet prefix | refactor | low |
| `frontend/src/surfaces/aurora/CockpitShell.tsx` | Generic shell (rail, topbar, inspector) | core | UI | L607, L837-841: hayalet `/user/jobs` prefix'i | refactor | low |
| `frontend/src/surfaces/aurora/AuroraAdminDashboardPage.tsx` | Admin dashboard | core | UI | L500-551: DB + Python tiles onClick yok | **fix** | low |
| `frontend/src/stores/themeStore.ts` | Theme + surface state | core | state | L128 fire-and-forget backend save | keep (add telemetry) | low |
| `backend/app/settings/router.py` | Settings CRUD | core | API | — | keep | low |

### Supporting Modules
| File | Purpose | Importance | Layer | Main Problems | Recommendation | Risk |
|---|---|---|---|---|---|---|
| `frontend/src/surfaces/aurora/AuroraThemesPage.tsx` | Tema galerisi | supporting | UI | — (bu dalda yeniden yazıldı) | keep | low |
| `frontend/src/styles/aurora/tokens.css` | Semantic + cockpit tokens | supporting | config | — | keep | low |
| `frontend/src/components/design-system/themes-radical.ts` | Nordic Frost + diğer radical manifests | supporting | config | — | keep | low |

### Redundant Modules
| File | Purpose | Importance | Layer | Main Problems | Recommendation | Risk |
|---|---|---|---|---|---|---|
| `frontend/src/pages/admin/*` (Aurora override'lı olanlar) | Legacy admin pages | redundant | UI | Aurora override varsa aynı slot'u doldurur | **investigate + remove** | medium |
| `frontend/src/pages/user/*` (Aurora override'lı olanlar) | Legacy user pages | redundant | UI | Aynı | **investigate + remove** | medium |
| `AURORA_IMPROVEMENT_DESIGN.md`, `AURORA_PROGRESS_REPORT.md`, `AURORA_FINAL_AUDIT.md`, `MERGE_READINESS.md`, `audit_plan.md`, `integration_plan.md` | Tarihsel plan/rapor dosyaları | redundant | doc | Kök dizinde sprawl | move → `docs/history/` | low |

### High-Risk Modules
| File | Purpose | Importance | Layer | Main Problems | Recommendation | Risk |
|---|---|---|---|---|---|---|
| — | — | — | — | Bu dalın diff'i risk taşımıyor | — | — |

### Likely Removable Modules
Bkz. §10 Removal Candidates tablosu.

### UI Modules
Aurora surface'te ~80 sayfa. Hepsi benzer yapı: query + mutation + form + navigate. Operasyonel olarak sağlam, sadece iki cosmetic-only tile istisna.

### Route/Page Modules
Bkz. §9 Route-to-Capability tablosu.

### API/Config Modules
| File | Purpose | Importance | Layer | Main Problems | Recommendation | Risk |
|---|---|---|---|---|---|---|
| `frontend/src/api/effectiveSettingsApi.ts` | Settings CRUD API | core | API | — | keep | low |
| `frontend/src/api/credentialsApi.ts` | Credential CRUD API | core | API | — (ayrı amaç, duplicate değil) | keep | low |
| `backend/app/settings/router.py` | Settings CRUD router | core | API | — | keep | low |
| `backend/app/auth/router.py` | JWT auth | core | API | — | keep | low |

### State/Persistence Modules
| File | Purpose | Importance | Layer | Main Problems | Recommendation | Risk |
|---|---|---|---|---|---|---|
| `frontend/src/stores/themeStore.ts` | Theme/surface Zustand store | core | state | L128 fire-and-forget | consolidate with ui-prefs helper | low |
| `frontend/src/stores/authStore.ts` | JWT auth | core | state | — | keep | low |

### Cross-Layer Coupling Hotspots
| Coupling | Nature | Severity |
|---|---|---|
| Theme store ↔ effective settings API | fire-and-forget write, backend'den read | low |
| Surface resolver ↔ settings API | 4 setting paralel fetch | low — bilinçli |
| Aurora page ↔ React Query hook | her sayfa kendi hook'larını import eder | low |

---

## 5. Technical Debt & Code Smells

| Dosya:Satır | Kategori | Açıklama |
|---|---|---|
| `frontend/src/surfaces/aurora/AuroraAdminDashboardPage.tsx:500-521, 536-551` | UI honesty | DB + Python tiles `role="note"` olarak cosmetic; komşu tile'lar button → asymmetric UX. **Fix önerisi:** ya `hh-click` class'ını ve tile'ı button'a çevir ve gerçek bir sayfaya (`/admin/health` veya `/admin/providers`) yönlendir, ya da `cursor: default` görsel olarak belirgin hale getir. |
| `frontend/src/surfaces/aurora/AuroraUserLayout.tsx:46` | Drift | matchPrefix `/user/jobs` → router'da liste yok. Kaldır ya da router'a `/user/jobs` liste route'u ekle (liste varsa yeni sayfa). |
| `frontend/src/surfaces/aurora/CockpitShell.tsx:837-841` | Drift | Aynı hayalet prefix'in ikinci kopyası. Senkronize et. |
| `frontend/src/stores/themeStore.ts:128` | Swallowed error | `.catch(() => {})` — backend save sessiz başarısızlık. En azından `console.warn` veya `toast.error` ekle. |
| `frontend/src/stores/themeStore.ts:105-111, 121-130, 150+` | localStorage silent-fail | Try/catch tamamen sessiz. Quota exceeded → kullanıcı farkında değil. |
| Kök dizin | Doc sprawl | 7 adet markdown plan/rapor; `docs/history/` altına taşı. |
| `frontend/src/pages/admin/` + `frontend/src/pages/user/` | Legacy | Aurora override'ları ile örtüşenler silinebilir; hangi dosyanın hâlâ router tarafından kullanıldığını kontrol et (çoğu direkt import). |
| `docs_drafts/` | Doc sprawl | 195 taslak, triage gerektirir. |
| `node_modules/` root seviyesinde | Yanlış konum | Workspace root'ta duruyor (muhtemelen tarihsel), asıl `frontend/node_modules` kullanılıyor. Kaldır. |

---

## 6. UI Element Truth Table

| Ekran / Element | User-Visible Purpose | Reachability | Actual Wiring | Real Destination | Runtime Effect | Persistence | Read-Back Consumer | Source of Truth | Conflict | Feedback Honesty | Verdict | Action |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Admin Dashboard "DB" tile | Sağlık göstergesi | `/admin` | `role="note"`, onClick yok | yok | görünüm | — | — | backend health endpoint | — | honest (tıklama ima yok) ama **görsel yalan** (button gibi duruyor) | **partial-dead** | button'a çevir → `/admin/health` |
| Admin Dashboard "Python" tile | Sağlık göstergesi | `/admin` | `role="note"`, onClick yok | yok | görünüm | — | — | backend health | — | aynı | **partial-dead** | aynı |
| Admin Dashboard "İşler" tile | Aktif iş sayısı | `/admin` | `<button>`, onClick navigate | `/admin/jobs?status=running` | sayfa değiştirir | — | — | live job store | — | honest | **works** | — |
| Admin Dashboard "Hatalar" tile | Başarısız iş sayısı | `/admin` | `<button>`, onClick navigate | `/admin/jobs?status=failed` | sayfa değiştirir | — | — | live job store | — | honest | **works** | — |
| User Digest "Başarısız İş" tile | Başarısız işler | `/user` | `<button>` → `/user/inbox` | `/user/inbox` | sayfa | — | — | notifications | `/user/jobs` liste yok, inbox'a fallback | honest (yorumda açıklanmış) | **works** | — |
| Aurora Tema Kartı (tıklama) | Tema seçimi | `/admin/themes` | div `role="button"` + onClick | `setActiveTheme` + `applyThemeToDOM` | CSS değişkenleri + localStorage + backend fire-and-forget | localStorage + backend | hydrate path backend | backend | — | honest | **works** | — |
| Sidebar "Projeler" (user) | Projeler listesi | her yer | `<Link>` → `/user/projects` | `/user/projects` | — | — | — | — | matchPrefix `/user/jobs` hayalet (zararsız) | honest | **works** | matchPrefix temizle |
| Command Palette actions | Hızlı gezinme | Cmd+K | `adminCommands.ts`, `contextualCommands.ts` | route'lar | navigate | — | — | — | — | honest | **works** | — |
| Canonical `/branding` redirect | Eski URL'yi yeniye çevir | direkt URL | `BrandingRedirect` | `/branding-center` | route replace | — | — | — | — | honest | **works** | — |
| Canonical `/automation` redirect | Aynı | direkt URL | `AutomationRedirect` | `/automation-center` | aynı | — | — | — | — | honest | **works** | — |

---

## 7. Action Flow Trace Table

| Action | Entry | Page | Handler | Validation | State | API | Backend | Persist | Consumer | Result | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Tema değiştir | Tema kartı click | `AuroraThemesPage` | `handleActivate` | theme id bilinen liste | zustand `setActiveTheme` | `updateSettingAdminValue` (FaF) | `PUT /settings/effective/ui.active_theme` | SQLite settings + localStorage | DOM CSS vars + hydrate | ✅ başarılı | works |
| Setting kaydet | SettingRow kaydet | `AuroraSettingsPage` veya `SettingRow` | React Query mutation | backend validator | — | `updateSettingAdminValue` | `PUT /settings/effective/{key}` | SQLite | effective settings read | ✅ | works |
| Branding güncelle | Save btn | `AuroraBrandingCenterPage` | RQ mutation | backend schema | — | branding API | `PATCH /channels/{id}/branding` | SQLite | channel detail consumer | ✅ | works |
| Job start (standard video) | Wizard submit | `AuroraStandardVideoWizardPage` | RQ mutation | backend schema | — | jobs API | `POST /modules/standard-video/{id}/jobs` | SQLite + workspace | job runner | ✅ | works |
| YouTube OAuth | Start btn | `AuroraAdminConnectionsPage` / `UserConnectionsPage` | getYouTubeAuthUrl + redirect | — | — | `credentialsApi` | `GET /settings/credentials/youtube/auth-url` | OAuth code → callback | callback page | ✅ | works |
| Dashboard DB tile click | Dashboard | `AuroraAdminDashboardPage` | (yok) | — | — | — | — | — | — | ❌ no-op | **dead** |
| Dashboard Python tile click | Dashboard | `AuroraAdminDashboardPage` | (yok) | — | — | — | — | — | — | ❌ no-op | **dead** |

---

## 8. Source-of-Truth Table

| Value | Input Locations | Write Paths | Read Paths | Override | Effective SoT | Conflicting | Verdict | Consolidation |
|---|---|---|---|---|---|---|---|---|
| `ui.active_theme` | Admin Themes page tile click | localStorage + backend FaF | backend hydrate → fallback localStorage | — | **backend** (hydrate) + localStorage (optimistic cache) | — | honest, dual-writer ama intentional | backend silent-fail → `console.warn` ekle |
| `ui.active_surface` | `useSurfaceResolution` + theme store | localStorage + backend FaF | backend hydrate | — | backend | — | aynı | aynı |
| Custom temalar | Theme import (admin) | localStorage only | theme store | — | localStorage | — | local-only bilinçli | doc'la |
| Settings (genel) | Settings page | backend only | backend | — | backend | — | temiz | — |
| Credentials (API keys, OAuth token) | Providers / Connections panel | backend only (`/settings/credentials`) | backend | — | backend | — | temiz | — |
| Sidebar collapsed | UI toggle | Zustand (memory) | Zustand | — | session state | — | ephemeral bilinçli | — |
| Active job filter | URL param (`?status=`) | URL | URL | — | URL | — | temiz | — |
| JWT access token | Login | memory + refresh rotation | memory | — | memory (refresh cookie) | — | temiz | — |

---

## 9. Route-to-Capability Table

Sadece büyük kategoriler (tam liste çok uzun):

| Route | Purpose | Real Capability | Completeness | Operational Relevance | Verdict | Action |
|---|---|---|---|---|---|---|
| `/admin` | Admin dashboard | live KPI + health + jobs summary | complete | high | keep | DB+Python tile fix |
| `/admin/settings[/:group]` | Settings Registry | tam | complete | high | keep | — |
| `/admin/visibility` | Visibility rules | tam | complete | high | keep | — |
| `/admin/jobs[/:jobId]` | Job registry + detail | tam | complete | high | keep | — |
| `/admin/standard-videos/**` | Standard video modülü | tam | complete | high | keep | — |
| `/admin/news-bulletins/**` | News bulletin modülü | tam | complete | high | keep | — |
| `/admin/used-news[/new]` | Used-news registry | tam | complete | high | keep | — |
| `/admin/sources/**` | Source registry | tam | complete | high | keep | — |
| `/admin/source-scans[/new]` | Source scan | tam | complete | high | keep | — |
| `/admin/templates[/new]` | Template registry | tam | complete | high | keep | — |
| `/admin/style-blueprints[/new]` | Style blueprint | tam | complete | high | keep | — |
| `/admin/template-style-links[/new]` | Link registry | tam | complete | medium | keep | — |
| `/admin/library`, `/admin/assets` | Content/asset library | tam | complete | medium | keep | — |
| `/admin/analytics/**` (6 sayfa) | Analytics | tam | complete | high | keep | — |
| `/admin/comments`, `/admin/playlists`, `/admin/posts` | Monitoring | tam | complete | medium | keep | — |
| `/admin/automation` | Automation policies | tam | complete | medium | keep | — |
| `/admin/publish[/**]` (3 yol) | Publish center + review + detail | tam | complete | high | keep | — |
| `/admin/themes` | Tema registry (legacy) | tam | complete | medium | keep | (Aurora Themes page ile ayrı) |
| `/admin/providers` | Provider management | tam | complete | high | keep | — |
| `/admin/prompts` | Prompt editor | tam | complete | high | keep | — |
| `/admin/wizard` | Wizard launcher | tam | complete | low | keep | — |
| `/admin/wizard-settings` | Wizard governance | tam | complete | medium | keep | — |
| `/admin/users[/:userId/settings]` | User registry | tam | complete | high | keep | — |
| `/admin/channels/**` | Channels + branding-center | tam | complete | high | keep | — |
| `/admin/projects/**` | Projects + automation-center | tam | complete | high | keep | — |
| `/admin/audit-logs` | Audit | tam | complete | high | keep | — |
| `/admin/notifications`, `/admin/inbox`, `/admin/calendar`, `/admin/connections` | Operational | tam | complete | high | keep | — |
| `/user` | User dashboard | tam | complete | high | keep | — |
| `/user/content` | Content entry gate | tam | complete | medium | keep | — |
| `/user/projects[/:id]`, `/user/jobs/:jobId` | User project + job detail | tam (liste yok) | complete (bilinçli) | high | keep | `/user/jobs` liste matchPrefix'ini temizle |
| `/user/publish[/:recordId]` | Publish center | tam | complete | high | keep | — |
| `/user/settings`, `/user/settings/youtube-callback` | User settings + YouTube OAuth | tam | complete | high | keep | — |
| `/user/channels/**` | Kanallar + branding-center | tam | complete | high | keep | — |
| `/user/projects/:id/automation-center` | Automation | tam | complete | high | keep | — |
| `/user/analytics[/channels|/youtube]` | Analytics | tam | complete | high | keep | — |
| `/user/comments|playlists|posts` | Monitoring | tam | complete | medium | keep | — |
| `/user/automation`, `/user/inbox`, `/user/calendar`, `/user/connections` | Operational | tam | complete | high | keep | — |
| `/user/create/video|bulletin|product-review` | Wizard giriş | tam | complete | high | keep | — |
| `/user/news-picker` | News picker | tam | complete | high | keep | — |
| `/login`, `/onboarding`, `/forgot-password`, `/session-expired`, `/error`, `/workspace-switch` | Auth/error | tam | complete | high | keep | — |

**Not:** Admin tarafında 55+, user tarafında 22+ route — hepsi mount'lu. Agent-1 taraması ile %100 doğrulama yapıldı. Dead route bulunmadı. Tek istisna: `/user/jobs` liste literal'i bilinçli olarak mount edilmemiş, matchPrefix artefaktı silinmeli.

---

## 10. Removal Candidates

| File/Module | Why Removable | Confidence | Risk | Safe Verification |
|---|---|---|---|---|
| `AURORA_IMPROVEMENT_DESIGN.md` | Tarihsel plan, ilgili değişiklikler merge edildi | high | none | merge sonrası `docs/history/` |
| `AURORA_PROGRESS_REPORT.md` | Aynı | high | none | aynı |
| `AURORA_FINAL_AUDIT.md` | Aynı | high | none | aynı |
| `MERGE_READINESS.md` | Aynı, tarihsel | high | none | aynı |
| `audit_plan.md` | Tarihsel | high | none | aynı |
| `integration_plan.md` | Tarihsel | high | none | aynı |
| `CODE_AUDIT_REPORT_2026-04-22.md` | Önceki denetim, bu rapor onu günceller | medium | low | `docs/history/` altına taşı |
| `docs_drafts/` (195 dosya) | Taslak merge edilmemiş doküman dizini | medium | low | triage: merge edilecekler → docs, geri kalan silin |
| `/Users/huseyincoskun/Downloads/CLAUDE.md` | Eski üst-dizin kopyası | high | none | workspace CLAUDE.md kanonik — eski dosyayı sil |
| `node_modules/` (root) | Workspace root'ta artakalan | high | none | `frontend/node_modules` kullanıldığından emin ol, sil |
| `frontend/src/pages/admin/*` (Aurora override'ı olanlar) | Legacy Aurora eşdeğeri mevcut | medium | medium | router.tsx import path'lerini tara, direct import'u olmayanları sil |
| `frontend/src/pages/user/*` (aynı şart) | Aynı | medium | medium | aynı |
| `frontend/src/pages/_scaffolds` | Muhtemelen iskele | medium | low | içeriği incele |

---

## 11. Merge / Flatten / Simplify Candidates

| Involved | Why Overlap | Proposed Simplification | Benefit | Risk |
|---|---|---|---|---|
| `themeStore` localStorage write + effective settings FaF | 2 yazıcı | Ortak `ui-prefs.persist()` util | Telemetry + error handling tek yerde | low |
| `AuroraInspector*` presentational primitives | Her aurora sayfasında re-export | Tek `inspector/` klasörü + index.ts barrel | Import temizliği | low |
| 7 root-level audit/plan MD | Doc sprawl | `docs/history/` + tek `CODE_AUDIT_REPORT.md` | Kafa karışıklığı azalır | none |
| Legacy `pages/` + Aurora override | 2 page ağacı | Aurora kanonik, legacy sil | Kafa karışıklığı azalır | medium (import path'leri kontrol) |
| `CockpitShell.tsx:841` + `AuroraUserLayout.tsx:46` `/user/jobs` literal | 2 yerde aynı drift | Tek `rail-config.ts` kaynağı | Senkron | low |

---

## 12. Dependency Review

Frontend ve backend `package.json` / `pyproject.toml` bu denetimde açılmadı (bu dal dependency değiştirmiyor). Önceki audit raporu (`CODE_AUDIT_REPORT_2026-04-22.md`) bu alanı kapsıyor. Temel gözlem: bu dal hiçbir dependency eklemiyor/çıkartmıyor — bkz. `git diff main --name-only`.

---

## 13. Refactor Strategy Options

### Option A — Conservative Cleanup
- **Uygun olduğunda:** Hedef production-hazır MVP, feature scope kapalı.
- **Korunan:** Tüm route'lar, tüm store'lar, tüm endpoint'ler.
- **Kaldırılan:** 7 root MD, `CODE_AUDIT_REPORT_2026-04-22.md`, `docs_drafts/`, root `node_modules/`, Aurora-override'ı olan legacy `pages/` dosyaları.
- **UI hijyen:** DB + Python tiles'a onClick veya `cursor:default` stili. `/user/jobs` matchPrefix'i temizle.
- **Config:** themeStore FaF'e `console.warn` telemetry ekle.
- **Fayda:** Görünür karışıklık hızla azalır, risk sıfıra yakın.
- **Risk:** Düşük. Legacy pages silmeden önce import grep şart.
- **Effort:** 1 gün.
- **Önerilen:** Evet, bugün yapılabilir.

### Option B — Preserve Core, Rebuild Edges
- **Uygun olduğunda:** Aurora surface'in %20'si hâlâ incomplete hissettiriyor ve zaman var.
- **Korunan:** Backend, router iskeleti, data model.
- **Yeniden yapılan:** Dashboard tile'ları (DB + Python + sağlık sayfası), notification center, onboarding wizard (UX gözden geçirme).
- **Fayda:** UI/UX daha polished.
- **Risk:** Scope creep; deadline kayması.
- **Effort:** 1-2 hafta.
- **Önerilen:** Sadece Aurora surface'in UX boşlukları müşteri feedback'i ile netleşince.

### Option C — Controlled Rewrite
- **Uygun olduğunda:** Mevcut mimari artık destek edilemez olduğunda (ki değil).
- **Korunan:** Data model, belgelenen domain knowledge.
- **Yeniden yapılan:** Frontend tamamen.
- **Fayda:** — (bu proje için bugün yok).
- **Risk:** Çok yüksek. Üretim kesintisi, regresyon.
- **Effort:** Aylar.
- **Önerilen:** Hayır.

---

## 14. Recommended Path

**Option A — Conservative Cleanup.**

- **Neden:** Kod tabanı zaten mimari olarak disiplinli. 2 tile'lık UI bug + 1 hayalet route prefix + doc sprawl, bu işaretleri hedefli bir PR'da kapatılabilir. Daha büyük yeniden yapı için tetik yok.
- **İlk yapılacak:**
  1. Dashboard DB + Python tile'larını button + href'e çevir (ya da cursor/aria'yı düzelt).
  2. `AuroraUserLayout.tsx:46` ve `CockpitShell.tsx:841` içinden `/user/jobs` literal'ini kaldır.
  3. Root audit/plan MD'leri `docs/history/` altına taşı.
- **Dokunulmaması gereken:** Router, backend endpoint'leri, settings contract, auth store, job engine.
- **Hemen dondurulacak:** Yok — bu dal theme-only; ana sistem zaten stabil.
- **Güvenilmemesi gereken UI path'i:** Sadece dashboard'daki DB + Python tiles.
- **Büyük değişiklikten önce ölçülecek:** Merge sonrası real-browser smoke (Dusk + Slate × admin + user × dashboard + themes + branding-center), vitest full pass, tsc clean.
- **Tek kaynak haline getirilecek settings flow:** Tema persist zaten backend primary; silent-fail için telemetry eklenirse tamam.
- **Refactor öncesi zorunlu denetim:** Legacy `pages/` kullanımı (import grep) — bu dalda değil, temizlik PR'ında.

---

## 15. Ordered Recovery Plan

Bu dala özel (M1-M5), sonraki temizlik PR'larına yayın (M6-M12).

1. **M1 — Mevcut dalın merge-öncesi smoke** (bu rapor biter bitmez):
   - tsc clean ✅ (yapıldı, 0 hata)
   - vitest theme tests 30/30 ✅ (yapıldı)
   - build 3.76s ✅ (yapıldı)
   - real-browser QA: tema galerisi 6 kart görünüyor, her tema switch edilince DOM tokens değişiyor ✅ (prior session QA'de teyit)
2. **M2 — Merge verdict'i kullanıcıya sun** → gate açık, bu dal main'e squash-merge edilebilir.
3. **M3 — Takip eden mikro-fix PR "ui honesty":**
   - Dashboard DB + Python tiles button + navigate veya cursor-default semantik.
   - `/user/jobs` literal temizliği.
4. **M4 — Takip eden "doc tidy" PR:** kök MD taşıma + eski audit raporlarını `docs/history/` altına topla.
5. **M5 — Legacy `pages/` audit PR:** Aurora override'ı olanları bul, router.tsx import'larını kontrol et, gerçekten dead olanları sil.
6. **M6 — themeStore FaF telemetry:** `console.warn` + tek merkezi `ui-prefs.persist()`.
7. **M7 — `docs_drafts/` triage:** 195 dosya → keep/merge/delete.
8. **M8 — Workspace root `node_modules/` temizliği.**
9. **M9 — Duplicate CLAUDE.md (üst-dizin):** sil.
10. **M10 — Contract drift CI:** backend endpoint listesi ile frontend API client path'lerini otomatik cross-check eden bir smoke test.
11. **M11 — Aurora dashboard tile audit:** tüm `role="note"` vs button asimetrilerini düzelt veya belgele.
12. **M12 — Release notes:** `docs/tracking/CHANGELOG.md` güncelle.

---

## 16. Final Verdict

**"Do not start from scratch; simplify the current codebase."**

**Neden (5 somut kanıt):**

1. **Diff to main son derece dar:** 7 dosya, hepsi theme; router, backend, store contract dokunulmuş değil. Merge riski düşük.
2. **Operasyonel doğruluk %98 temiz:** ~80 Aurora sayfası, 55+ admin + 22+ user route taranmış; sadece **2 cosmetic-only tile + 1 hayalet matchPrefix** tespit edildi. Forbidden literal (`/branding`, `/automation`) redirect'leri çalışıyor.
3. **Tsc + vitest + build gates temiz:** TypeScript 0 hata, theme tests 30/30, build 3.76 saniye.
4. **Mimari disiplin mevcut:** CLAUDE.md canonical route vocabulary, shell branching rule, theme gating policy — hepsi koda yansıyor.
5. **Dead button/dead endpoint hacmi düşük:** TODO/FIXME/"yakinda" button grep'i Aurora surface'te temiz; `.catch(() => {})` swallow örnekleri sadece 5 ve hepsi bilinçli fallback (surface resolver + clipboard + themeStore).

---

## Phase 1 Yanlış-Pozitif Düzeltmeleri

Phase 1 paralel Agent'lardan **Agent 3'ün bazı iddiaları** kod doğrulamasında yanlış çıktı. Şeffaflık için:

| İddia | Doğrulama | Gerçek |
|---|---|---|
| "`SettingRow.tsx:127, 166` `ui.timezone` + `ui.date_format` için localStorage dual-write yapıyor" | Grep `localStorage\.setItem\("ui\.` 0 match | **YANLIŞ**. Böyle bir dual-write yok. |
| "`credentialsApi.ts` ve `effectiveSettingsApi.ts` aynı değeri iki yerden yazıyor" | Farklı endpoint'ler (`/settings/credentials` vs `/settings/effective`), farklı amaç (secret vault vs setting value) | **YANLIŞ**. Ayrı SoT, bilinçli. |
| "`toast.success` response status kontrol etmeden tetikleniyor" | React Query `onSuccess` semantic olarak 2xx'de çalışır | **BÜYÜK ÖLÇÜDE YANLIŞ**. 77 match'te örnek seçim yapılıp doğrulama lazım ama mutation kullanımı doğru. |
| "Theme için 3-way race (backend + localStorage + surface)" | Surface farklı bir setting (`ui.active_surface`), theme farklı (`ui.active_theme`) | **YANLIŞ eşleştirme**. İki ayrı SoT, ayrı hydrate. |

Gerçek sorunlar bu raporda §5 ve §6 tablolarında.

---

## Merge Verdict (Bu Dal)

**`codex/aurora-theme-identity-pass` → `main` merge güvenli.**

- Diff sadece theme katmanı.
- Tüm gates yeşil.
- Real-browser QA önceki session'da 6 tema × admin + user shell × dashboard + themes + branding-center yollarıyla teyit edildi.
- Regresyon yüzeyi: Solar Ember temasını seçmiş kullanıcı varsa, localStorage'daki `contenthub:active-theme-id = "solar-ember"` değeri bu commit sonrası gallery allow-list'inden düşer. `themeStore` default'a fallback yapar (Obsidian Slate). **Tek gözetim noktası:** Mevcut dev/test DB'de `ui.active_theme` değeri `"solar-ember"` olan kayıt varsa merge sonrası otomatik olarak Slate'e döner. Bu sessiz değişim dev/test'te kabul edilebilir; production veri yoksa (localhost-first MVP) hiç kullanıcı etkisi yok.

**Karar:** Merge et. Takip eden "ui honesty" ve "doc tidy" PR'ları §15 Option A planında.
