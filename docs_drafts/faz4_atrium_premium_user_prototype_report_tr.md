# Faz 4 — Atrium Premium User Prototype

## Ozet

Atrium, Faz 1'de Surface Registry'de yalnizca `disabled` placeholder olarak
yer alan bir manifest'ti. Faz 4 ile bu placeholder, **gercek, beta seviyesinde,
user-scope, premium/editorial bir kullanici yuzeyine** donusturuldu.

Canvas workspace hissini koruyan (sidebar + project rail + worker yogunlugu)
bir deneyim iken; Atrium ayni backend veriyi **premium medya OS** dilinde
yeniden sunan bir "showcase" yuzeyidir:

- Dark editorial marquee (brand rail + user chip + notification + CTA'lar)
- **Yatay top-nav** (sidebar yok) — editorial strip
- Genis hero bandlari, large typographic moments, cinematic gradient washes
- Portfolyo card grid (180px preview band + meta-blok)
- Project detail: "showcase + control" dengesi (genis preview slot + jobs +
  editorial metadata rail)

**Tum bu degisiklikler mevcut hook + API contract'larini aynen kullanir.**
Hicbir yeni backend endpoint'i, hicbir sahte thumbnail, hicbir uydurma metrik
eklenmemistir. Preview alanlari **acikca placeholder** olarak isaretlidir
(preview-honest disiplin).

Canvas + Atrium ayni anda user-scope'ta yasar. Ayni `user.*` page override
anahtarlarini paylasabilirler; **hangisi devreye girer sorusuna mevcut
resolver cevap verir** (`ui.surface.default.user` + enabled bayraklari).
Atrium, canvas'i **silmez**; surface seciciden gecis yapilarak etkinlestirilir.

Faz 4 bilincli olarak 3 sayfa ile sinirlidir: `user.dashboard`,
`user.projects.list`, `user.projects.detail`. Bu, ilk visible pass'in
reviewable kalmasini ve override edilmemis route'larin sessizce legacy'ye
dusmesini saglar.

## Degisen / Eklenen dosyalar

### Manifest ve kayit

- **`frontend/src/surfaces/manifests/atrium.ts`** — MODIFIED.
  - `status: "disabled"` → `status: "beta"`
  - `scope: "both"` → `scope: "user"` (atrium artik **kullanici-scope only**;
    admin panelinden asla mount edilmez)
  - `hidden: true` → `hidden: false`
  - Editorial navigation profile: `primary: "top-nav"`,
    `secondary: "editorial-strip"`, `ownsCommandPalette: false`
  - Tone tokens: `["premium", "cinematic", "editorial", "showcase"]`
  - Uzun Turkce description: nasil devreye girer, canvas ile neden farkli,
    preview-honest disiplin.

- **`frontend/src/surfaces/manifests/register.tsx`** — MODIFIED.
  - Namespace import'lari eklendi:
    `AtriumUserLayoutModule`, `AtriumUserDashboardModule`,
    `AtriumProjectsListModule`, `AtriumProjectDetailModule`.
  - 4 yeni forwarder (lazy component — circular import savunmasi):
    `AtriumUserForwarder`, `AtriumUserDashboardForwarder`,
    `AtriumProjectsListForwarder`, `AtriumProjectDetailForwarder`.
  - `ATRIUM_PAGE_OVERRIDES` map'i: tam olarak 3 kayit
    (`user.dashboard`, `user.projects.list`, `user.projects.detail`).
  - Eski placeholder `const ATRIUM_SURFACE = { manifest: ATRIUM_MANIFEST }`
    yerine gercek surface: `{ manifest, userLayout, pageOverrides }`.

### Surface sayfalari (yeni)

- **`frontend/src/surfaces/atrium/AtriumUserLayout.tsx`** — NEW (~330 satir).
  - `<ThemeProvider>` mount eder (CSS degisken tokenlar icin).
  - Editorial marquee (brand rail, user chip, notification bell, Cmd+K
    acikligi, CTA'lar).
  - Yatay editorial top-nav (`Showcase / Projeler / Takvim / Dagitim /
    Kanallar / Analiz / Ayarlar`).
  - Mevcut infra hook'larini aynen kullanir:
    `useCommandPaletteShortcut`, `useGlobalSSE`, `useNotifications`,
    `buildUserNavigationCommands`, `buildUserActionCommands`,
    `useContentProjects`.
  - `<Outlet />` — sayfalar override sistemiyle yerlestirilir, router
    contract'ina dokunulmaz.
  - `data-surface="atrium"`, `data-testid="atrium-user-layout"`.

- **`frontend/src/surfaces/atrium/AtriumUserDashboardPage.tsx`** — NEW
  (~500 satir).
  - Layout: buyuk cover hero (dark gradient) + headline project hero card
    + side stats sutunu + onboarding pending notice + 3-kolon editorial
    grid (Lineup / In Production / Attention) + vital stats strip.
  - Headline project secimi: gercek alanlarla
    (`PRIORITY_WEIGHT = {urgent:0, high:1, normal:2, low:3}`, tiebreaker
    `updated_at desc`). Uydurma skor yok.
  - Veri kaynaklari: `useAuthStore`, `useOnboardingStatus`,
    `useContentProjects({limit:25})`, `useChannelProfiles`,
    `useQuery(fetchJobs)`. Hicbiri yeni endpoint degil.
  - testId'ler: `atrium-user-dashboard`, `atrium-dashboard-hero`,
    `atrium-dashboard-headline[-open|-empty]`, `atrium-dashboard-hero-stats`,
    `atrium-dashboard-lineup`, `atrium-dashboard-in-production`,
    `atrium-dashboard-attention`, `atrium-dashboard-stats`, vs.

- **`frontend/src/surfaces/atrium/AtriumProjectsListPage.tsx`** — NEW
  (~290 satir).
  - Layout: dark portfolio hero (+ Video / + Bulten CTA'lari + filtre
    ozeti) + pill-sekilli filtre secicileri (module / status / channel +
    clear) + card grid (`sm:grid-cols-2 xl:grid-cols-3`).
  - `PortfolioCard`: 180px cinematic preview band (indigo → fuchsia →
    amber), modul label sol ust, live pill sag ust, drop-shadow baslik
    altta, editorial body (status badgeler, kanal adi + tarih, priority +
    "stuyoya git →" CTA).
  - Veri: `useContentProjects({user_id, module_type, content_status,
    channel_profile_id})` (legacy / canvas ile ayni), `useChannelProfiles`.
  - testId'ler: `atrium-projects-list`, `atrium-projects-hero`,
    `atrium-projects-filters`, `atrium-projects-filter-{module|status|
    channel}`, `atrium-projects-grid`, `atrium-portfolio-card-{id}`,
    `atrium-portfolio-preview-{id}`, vs.

- **`frontend/src/surfaces/atrium/AtriumProjectDetailPage.tsx`** — NEW
  (~440 satir).
  - Layout: showcase hero (genis 220-280px preview band + baslik +
    action set + breadcrumb strip) + two-column body (production timeline
    canli/gecmis + editorial metadata rail).
  - Veri: `useContentProject`, `useChannelProfile`, `useQuery(fetchJobs)`,
    `useQuery(fetchStandardVideos)` (sadece `module_type === "standard_video"`
    iken), `useMutation(startStandardVideoProduction)`, `useToast`.
  - Jobs canli/gecmis ayrimi: `LIVE_STATUSES = {queued/running/pending/
    scheduled/waiting/waiting_review}`.
  - testId'ler: `atrium-project-detail`, `atrium-project-hero`,
    `atrium-project-preview-slot`, `atrium-project-start-production`,
    `atrium-project-open-publish`, `atrium-project-back-link`,
    `atrium-project-jobs[-live|-history|-empty]`,
    `atrium-project-metadata`, vs.

### Test dosyalari

- **`frontend/src/tests/surfaces-builtin-registration.unit.test.ts`** — MODIFIED.
  - Eski "atrium is disabled and has no layouts" testi silindi.
  - Yerine "atrium is promoted to beta (Faz 4) with user-only layout +
    editorial overrides" testi eklendi. Assertions: `status === "beta"`,
    `scope === "user"`, `userLayout` fonksiyon, `adminLayout` undefined,
    `pageOverrides` tanimli, uc page key fonksiyon.

- **`frontend/src/tests/surfaces-layout-switch.smoke.test.tsx`** — MODIFIED.
  - Eski "falls back to legacy when user picks a disabled surface (atrium)"
    testi, ayni settings snapshotunu kullanarak **yeni bir dusme yolunu**
    dogrulayacak sekilde yeniden yazildi:
    "falls back to legacy admin when a user-only surface (atrium) is
    picked on admin scope". Atrium artik `beta` + `user-scope`. Admin
    panelinde atrium secilse dahi **scope-mismatch** yolu devreye girer
    ve legacy admin layout render edilir. Bu, user-only bir surface'in
    admin paneline sizmasini engelleyen guvenligi dogrular.

- **`frontend/src/tests/atrium-user-surface.unit.test.ts`** — NEW.
  - Canvas'in `canvas-user-surface.unit.test.ts` dosyasinin atrium
    aynasi. 10 test:
    1. beta + user-scope kayit
    2. userLayout var / adminLayout yok
    3. 3 Faz 4 page override fonksiyon
    4. Override map'i tam olarak `["user.dashboard", "user.projects.detail",
       "user.projects.list"]` (siralama garantisi + fazlalik reddi)
    5. `admin.*` anahtari sizmiyor
    6. `navigation = {primary: "top-nav", secondary: "editorial-strip",
       ownsCommandPalette: false}`
    7. Tone en az `premium` + `editorial` tasir (product-visible kontrat)
    8. Canvas (user) + Atrium (user) co-existence; atrium'un override
       seti canvas'in **strict subset**'i oldugu kontrol edilir
    9. Bridge (admin) Faz 4'ten etkilenmedi; sadece `admin.*` anahtari
       tasiyor
    10. Legacy + horizon pageOverrides tanimlamamaya devam ediyor

- **`frontend/src/tests/atrium-user-shell.smoke.test.tsx`** — NEW.
  - 3 sayfayi izole mount eder (QueryClient + MemoryRouter), hook'lari
    mock'lar, temel testId'leri dogrular. Canvas shell smoke testinin
    atrium aynasi.

- **`frontend/src/tests/atrium-legacy-fallback.smoke.test.tsx`** — NEW.
  - `SurfaceProvider` olmadan `UserDashboardPage`, `MyProjectsPage`,
    `ProjectDetailPage` legacy gövdelerinin render edildigini dogrular;
    ayrica atrium `testId`'lerinin olmadigini negative assertion ile
    kontrol eder. Boylece ileride bir atrium sizintisi cikarsa, ismi
    atrium olan bir test kirilir.
  - **Timeout notu:** Full-suite yukunde ilk test'in lazy import maliyeti
    ~5s varsayilani asabildigi icin **15s timeout** verdim (hedeflenmis
    kosu 2.3s'de biter). Ayni desen canvas-workspace-legacy-fallback'te
    de var — o dosya Faz 4 scope'u disinda oldugu icin dokunulmadi.

## Fallback / Aktivasyon kurallari

- Atrium **yalnizca** asagidaki kosullar saglandiginda devreye girer:
  1. `ui.surface.infrastructure.enabled === true` (Surface Registry kill
     switch acik)
  2. `ui.surface.atrium.enabled === true`
  3. `ui.surface.default.user === "atrium"` (veya user override yoluyla
     aktif surface atrium)

- Su durumlardan herhangi birinde legacy/canvas fallback kacinilmaz:
  - kill switch kapali
  - `atrium.enabled` false
  - default user "legacy" veya "canvas"
  - atrium admin scope'ta mount edilmeye calisilir (scope-mismatch guard
    devreye girer, legacy admin layout doner)
  - atrium override'i olmayan bir route (ornegin `user.calendar`,
    `user.publish`) — ilgili canvas/legacy gövdesi render edilir

- **Canvas bozulmadi:** Canvas'a dair hicbir kaynak dosya dokunulmadi.
  Canvas'in tum 9 page override'i yerinde. Surface seciciden canvas'i
  secmek canvas'i getirir; atrium'u secmek atrium'u getirir.

## Test sonuclari

### TypeScript derleyicisi

```
npx tsc --noEmit
```

- **Sonuc:** 0 hata, 0 uyari. Temiz cikis (exit 0).

### Vite production build

```
npx vite build
```

- **Sonuc:** Basarili. `✓ built in 2.91s`. `dist/` uretildi.
- (Bilinen `index-*.js > 500KB` warning'i Faz 4 oncesinde de mevcuttu.
  Kod splitting Faz 4 scope'u disinda.)

### Hedeflenmis test suite

5 dosya (yeni + mevcut atrium/surface dosyalari):

```
atrium-user-surface.unit.test.ts
atrium-user-shell.smoke.test.tsx
atrium-legacy-fallback.smoke.test.tsx
surfaces-builtin-registration.unit.test.ts
surfaces-layout-switch.smoke.test.tsx
```

- **Sonuc:** 26/26 test gecti, 5/5 dosya yesil. ~6.4s.

### Regression: canvas + bridge + tum surface testleri

15 dosya:

```
canvas-user-surface / canvas-user-shell / canvas-legacy-fallback
canvas-flow-shell / canvas-flow-legacy-fallback
canvas-workspace-shell / canvas-workspace-legacy-fallback
bridge-legacy-fallback / bridge-rail-keyboard /
bridge-inline-action-capability
surfaces-page-override-hook / surfaces-page-overrides
surfaces-registry / surfaces-resolver /
surfaces-theme-store-migration
```

- **Sonuc:** 97/97 test gecti, 15/15 dosya yesil. ~12.4s. Canvas veya
  bridge tarafinda **hicbir regression yok**.

### Full vitest kosusu

```
npx vitest run
```

- **Sonuc:** 2224/2468 test gecti, 244 test kirik (49 dosya).
- Kirik testlerin **tamami Faz 4'ten once mevcut** flake listesiyle
  ortusuyor (MEMORY: "M7 fresh DB ve 22 smoke test guncellenmeli", ve
  asset-library / news-workflow / user-content-entry / user-publish-entry /
  user-panel-empty-state / library-gallery / canvas-workspace-legacy-
  fallback cold-import timeout flake).
- **Atrium yuzeyinden gelen 0 kirik test** — ozellikle dogrulandi:
  `atrium-user-surface.unit`, `atrium-user-shell.smoke`,
  `atrium-legacy-fallback.smoke`, `surfaces-builtin-registration.unit`,
  `surfaces-layout-switch.smoke` hepsi yesil.
- canvas-workspace-legacy-fallback full-suite altinda cold-import
  timeout'u ile kirilmaya devam ediyor (Faz 3B'de de boyleydi); bu dosya
  Faz 4 scope'u disinda.

## Product / stability degerlendirmesi

**Code Quality Gate:** tsc + vite build temiz. Hedeflenmis + regression
suite 123/123 yesil.

**Behavior Gate:** Atrium yalnizca scope + kill switch + enabled + default
user dortlusu saglaninca mount olur; scope-mismatch guard admin
sizintisini engeller; unknown surface id legacy'ye duser; override edilmemis
route'lar sessizce legacy/canvas'a duser. Tum bu yollar test edildi.

**Product Gate:** Kullanici 3 premium sayfaya yeni bir editorial dilde
ulasir (dashboard showcase + portfolio grid + project showcase). Canvas
iste odakli workspace kimligini korur. Atrium preview alanlari acikca
placeholder — hic bir yerde sahte thumbnail, sahte render, uydurma metrik
yok. Premium hissi gorsel composition farkiyla (dark marquee, editorial
top-nav, buyuk hero, card grid) saglaniyor — yalnizca tema rengi
degistirmiyoruz.

**Stability Gate:** Hic bir backend endpoint eklenmedi. Hic bir router
route degistirilmedi. Hic bir mevcut component overwrite edilmedi. Tum
atrium sayfalari yeni dosyalar ve surface override sistemiyle devreye
girer — `surfaces.atrium.enabled` kapatilirsa proje Faz 3B seviyesine
donusu anlik olur.

**Document Gate:** Bu rapor. Ayrica her yeni dosya dogrudan JSDoc
header'i ile dokumante edildi.

## Bilincli olarak Faz 4 icine alinmayan seyler

- Atrium icin ek page override'lar: `user.publish`, `user.channels.*`,
  `user.analytics.overview`, `user.calendar`. **Bilincle** sinirli
  tutuldu; canvas flow-completion + workspace-completion zaten bu
  alanlari kapliyor ve ilk visible atrium pass'in reviewable kalmasi
  gerekiyor. Bu override'lar Faz 4B+ icin aciktir.
- Atrium admin scope — **kapatildi**. Atrium sadece kullanici-scope bir
  premium showcase. Admin paneli sadece legacy + horizon + bridge
  uzerinden calisir.
- Canvas kaldirilmadi. Canvas + atrium **yan yana** yasar; admin
  operator `ui.surface.default.user` uzerinden hangisi aktif secer.
- Gercek render preview'leri yok. Preview alanlari acik placeholder'dir
  ve "on izleme · pending render" ifadeleriyle isaretlidir (preview-honest
  disiplin).
- Yeni backend endpoint'i yok. Sahte metrik yok. Sahte thumbnail yok.
- Bilinen tam-suite flake'i (canvas-workspace-legacy-fallback +
  asset-library + news-workflow vs.) Faz 4 scope'u disinda birakildi —
  onlari tamir etmek ayri bir tam-suite stabilization pass'idir.

## Commit + push durumu

- **Commit mesaji:**
  `feat(surfaces): promote atrium to beta user-scope premium prototype (Faz 4)`
- **Commit hash:** _(commit asamasinda asagiya yazilacak)_
- **Push durumu:** _(push asamasinda asagiya yazilacak)_
