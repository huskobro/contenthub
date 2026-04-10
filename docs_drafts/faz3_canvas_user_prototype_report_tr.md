# Faz 3 — Canvas User Prototype Raporu

Tarih: 2026-04-10
Konu: ContentHub Surface Registry / Canvas user-scope prototipi
Kapsam: `frontend/src/surfaces/canvas/*`, `frontend/src/surfaces/manifests/{canvas,register}.{ts,tsx}`, user sayfalari trampoline, Faz 3 testleri.

## 1. Hedef

Kullanicinin gercekten gorecegi yeni arayuzu baslatmak. Bridge admin
panelini yeterince kurdugumuz icin Faz 3 odagi yalnizca user panelidir.
Bu fazda yeni bir admin yuzu ya da yeni bir shell kesifi yok; Canvas
"Creator Workspace Pro" varyantini user scope'una acarak dashboard,
projelerim ve proje detayi sayfalarinda gorunur bir workspace yorumu
sunuyoruz. Non-override user sayfalari legacy'e dusmeye devam ediyor.

## 2. Yaptiklarimiz (YAP listesi)

### 2.1. Canvas manifest promosyonu (disabled → beta)

Dosya: `frontend/src/surfaces/manifests/canvas.ts`

- `version`: `0.0.0` → `0.1.0`
- `scope`: `both` → `user` (admin panelini asla etkilemesin diye sadece user)
- `status`: `disabled` → `beta`
- `navigation`: yeni alan eklendi (`primary: "sidebar"`,
  `secondary: "workspace-header"`, `ownsCommandPalette: false`)
- `description`: faz 3 gerceklikini yansitacak sekilde guncellendi — user
  scope, `ui.surface.canvas.enabled` ayari + kill switch ile devreye
  girer, override olmayan sayfalar legacy'e duser, admin panelini
  etkilemez.

Boylece `useSurfaceResolution` icindeki mevcut `canvasEnabled` akisi
dokunulmadan (zaten `enabledSurfaceIds` setine ekleniyordu) Canvas user
scope'unda resolvable hale geldi.

### 2.2. Canvas user shell

Dosya: `frontend/src/surfaces/canvas/CanvasUserLayout.tsx` (YENI)

Workspace odakli kullanici shell'i:

- `ThemeProvider` + `ToastContainer` + `CommandPalette` +
  `NotificationCenter` + `KeyboardShortcutsHelp` mevcut contract ile
  birebir ayni sekilde mount ediliyor.
- Ayni infra hook'lari: `useCommandPaletteShortcut`, `useGlobalSSE`,
  `useNotifications({ mode: "user" })`. Cmd+K palette komutlari legacy
  UserLayout ile ozdes (`buildUserNavigationCommands` +
  `buildUserActionCommands`).
- Workspace header: breadcrumb + "Canvas Workspace" rozeti + hizli
  "+ Video" / "+ Bulten" CTAlari + bildirim zili + kullanici / proje
  sayaci. `data-testid="canvas-workspace-header"`.
- Workspace sidebar: `USER_NAV`'in yerine uc zon uzerinden organize
  edilmis (`workspace`, `dagitim`, `analiz`). Canvas override edilen
  rotalar (Anasayfa, Projelerim) kucuk `canvas` pill ile isaretleniyor.
  `role="navigation"`, `data-testid="canvas-sidebar"`.
- Shell root: `data-testid="canvas-user-layout"` +
  `data-surface="canvas"`.

Shell, `<Outlet />` render ediyor — route contract bozulmuyor. Gorunur
degisim, shell'in kendisi + Canvas'in kaydettigi page override'lar
uzerinden geliyor.

### 2.3. Canvas page override'lari

Her dosya React Query + mevcut user data hook'lari ustunde calisiyor;
hicbir yeni backend endpoint'i uydurulmadi.

**`CanvasUserDashboardPage`** (`frontend/src/surfaces/canvas/CanvasUserDashboardPage.tsx`)

- Hero: `Hosgeldin, {displayName}` + iki create CTA
- Onboarding guard: `useOnboardingStatus` false ise uyari kutusu
- Workspace health ribbon: `projects` + `channels` fixture'larindan
  turetilen 5 sayac tile'i (`canvas-dashboard-stats`)
- Iki kolonlu ana grid:
  - Aktif Projelerim — proje kartlari, her birinde LABELED on izleme
    slot'u ("on izleme" etiketli placeholder, sahte render yok)
  - Calisan Isler — kuyrukta / running olan job satirlari
    (`fetchJobs` + client-side status filtresi)

Data contract:
- `useAuthStore`, `useOnboardingStatus`, `useContentProjects`,
  `useChannelProfiles`, `fetchJobs` — hepsi mevcut hook'lar

**`CanvasMyProjectsPage`** (`frontend/src/surfaces/canvas/CanvasMyProjectsPage.tsx`)

- Workspace header + "+ Yeni Proje" CTA
- Filtreler: kanal / modul / status (mevcut `useChannelProfiles` +
  `useContentProjects` filtreleri birebir ayni davraniyor)
- Grid: `ProjectCard` — her kart LABELED on izleme placeholder +
  `StatusBadge` (content + publish) + aktif job rozeti
- Empty/loading/error durumlari sarili (`canvas-projects-empty`,
  `canvas-projects-loading`, `canvas-projects-error`)

**`CanvasProjectDetailPage`** (`frontend/src/surfaces/canvas/CanvasProjectDetailPage.tsx`)

- Hero: breadcrumb + baslik + modul + iki `StatusBadge` + oncelik +
  birincil aksiyon ("Uretime Basla" — yalnizca `standard_video` +
  `pendingVideo` varsa) + render devam notu + "Projelere Don"
- On izleme + metadata rail iki kolonlu layout:
  - On izleme: 240px yuksekliginde LABELED placeholder
  - Metadata rail: proje ID, modul, olusturulma, guncelleme, aktif job,
    aciklama
- Bagli isler timeline: `fetchJobs` → `content_project_id` ile filtre,
  her satir `/admin/jobs/{id}`'e navigate ediyor

Mutation: `startStandardVideoProduction` — legacy ile birebir ayni;
success'te `jobs` + `standard-videos` + `content-projects` query'leri
invalidate, ardindan `/admin/jobs/{job_id}`'e yonlendirme.

### 2.4. Legacy trampoline

Uc legacy user sayfasi, mevcut bridge pattern ile birebir ayni sekilde
trampoline haline getirildi:

- `frontend/src/pages/UserDashboardPage.tsx`: public `UserDashboardPage`
  fonksiyonu simdi `useSurfacePageOverride("user.dashboard")` cagiriyor.
  Override null ise `LegacyUserDashboardPage` (eski govdesi) render
  ediliyor.
- `frontend/src/pages/user/MyProjectsPage.tsx`: public export trampoline,
  `useSurfacePageOverride("user.projects.list")`, legacy govde
  `LegacyMyProjectsPage`.
- `frontend/src/pages/user/ProjectDetailPage.tsx`: public export
  trampoline, `useSurfacePageOverride("user.projects.detail")`, legacy
  govde `LegacyProjectDetailPage`. Kullanilmayan `useState` importu
  temizlendi.

`useSurfacePageOverride` scope'u key prefix'inden ("user.") turetiyor,
dolayisiyla mevcut hook herhangi bir contract degisikligi olmadan
user scope'una calisiyor. `SurfacePageKey` brandli-string union tipi
`user.*` anahtarlari zaten destekliyordu.

### 2.5. Surface register

Dosya: `frontend/src/surfaces/manifests/register.tsx`

- 4 yeni namespace import: `CanvasUserLayoutModule`,
  `CanvasUserDashboardModule`, `CanvasMyProjectsModule`,
  `CanvasProjectDetailModule`.
- 4 lazy forwarder: `CanvasUserForwarder`,
  `CanvasUserDashboardForwarder`, `CanvasMyProjectsForwarder`,
  `CanvasProjectDetailForwarder`. Bridge ile ayni pattern — namespace
  + render-time dereference, circular import savunmasi korunuyor.
- `CANVAS_PAGE_OVERRIDES` haritasi — tam olarak uc anahtar:
  `user.dashboard`, `user.projects.list`, `user.projects.detail`.
- `CANVAS_SURFACE` artik `userLayout: CanvasUserForwarder` + `pageOverrides: CANVAS_PAGE_OVERRIDES` tasiyor. Atrium hala metadata-only
  placeholder, Bridge admin-scope, Legacy/Horizon olduklari gibi
  korundu.

### 2.6. Built-in registration testinin guncellenmesi

Dosya: `frontend/src/tests/surfaces-builtin-registration.unit.test.ts`

Onceki "canvas is disabled" testi yerine "canvas is promoted to beta
(Faz 3)" olarak yeniden yazildi: status=beta, scope=user, userLayout
tanimli, adminLayout undefined, uc override tanimli.

## 3. Faz 3 testleri (YENI)

### 3.1. `frontend/src/tests/canvas-user-surface.unit.test.ts` (8 test)

Canvas surface'in promosyonunu sozlesme duzeyinde dogruluyor:

1. Canvas beta + user scope (admin veya both DEGIL)
2. userLayout fonksiyon, adminLayout undefined
3. Uc Faz 3 override anahtari tanimli
4. Override harita tam olarak uc anahtar iceriyor, daha fazla degil
5. Hicbir `admin.*` anahtari Canvas override haritasina sizmamis
6. Manifest navigation profile: `sidebar` / `workspace-header` /
   `ownsCommandPalette: false`
7. Bridge (admin) + Canvas (user) scope catismasi yok, override haritalari
   disjoint
8. Canvas promosyonu sonrasi legacy + horizon hala `pageOverrides`
   tasimiyor (Faz 1 contract'i korundu)

### 3.2. `frontend/src/tests/canvas-legacy-fallback.smoke.test.tsx` (3 test)

Bridge legacy fallback ile birebir ayni yaklasim: SurfaceProvider olmadan
uc legacy user sayfasini mount ettiginde, `useSurfacePageOverride` null
doner ve eski govdeler render edilir.

1. `UserDashboardPage` → `dashboard-heading` testid'i render ediliyor,
   `canvas-user-dashboard` testid'i YOK
2. `MyProjectsPage` → `my-projects-heading` testid'i, `canvas-my-projects`
   YOK
3. `ProjectDetailPage` → `project-detail-heading` testid'i,
   `canvas-project-detail` YOK

Agir bagimlilik hook'lari (`useContentProjects`, `useAuthStore`,
`fetchJobs`, `fetchStandardVideos`, `useToast`, dashboard bilesenleri)
`vi.mock` ile stub'landi.

### 3.3. `frontend/src/tests/canvas-user-shell.smoke.test.tsx` (3 test)

Canvas override sayfalarinin izole olarak mount edilebildigini ve mocked
hook fixture'lari ile zenginlestirilmis icerik render ettigini
dogruluyor:

1. `CanvasUserDashboardPage` → hero + stats + iki proje tile'i render
   ediyor (`canvas-project-tile-p-1`, `canvas-project-tile-p-2`)
2. `CanvasMyProjectsPage` → grid iki kart, uc filtre select tanimli
3. `CanvasProjectDetailPage` → hero + preview slot + metadata + jobs
   paneli tanimli

### 3.4. Toplam

Faz 3 testleri: **14 yeni test** (8 unit + 3 fallback + 3 shell smoke).
Bunlara Faz 2A'daki bridge testleri + Faz 1 surface testleri + legacy
fallback testleri eklendiginde targeted surface+bridge+canvas suite:
**13 test dosyasi, 93 test, 93 pass.**

## 4. Test sonuclari

### 4.1. Targeted test suite

```
$ npx vitest run \
    src/tests/surfaces-*.test.ts src/tests/surfaces-*.test.tsx \
    src/tests/bridge-*.test.tsx \
    src/tests/canvas-*.test.ts src/tests/canvas-*.test.tsx

Test Files  13 passed (13)
     Tests  93 passed (93)
  Duration  8.47s
```

Faz 3 yeni dosyalarinin hepsi ilk calistirmada yesil.

### 4.2. TypeScript

```
$ npx tsc --noEmit
(no output — temiz)
```

### 4.3. Vite build

```
$ npx vite build
...
✓ built in 2.83s
```

Bundle boyutlari Faz 2A sonrasindakiyle tutarli; (chunk size > 500KB
uyarisi pre-existing, Faz 3 kaynakli degil).

### 4.4. Full suite — regression kontrolu

```
$ npx vitest run
Test Files  48 failed | 147 passed (195)
     Tests  243 failed | 2195 passed (2438)
```

**243 failed = Faz 2A baseline ile birebir ayni sayi.** Yeni regresyon
yok. Canvas promosyonu, trampoline'lar ve yeni override'lar mevcut
failure listesine hicbir sey eklemedi. (Faz 2A raporunda oldugu gibi,
243 failure pre-existing: M7 fresh DB, 22 smoke test guncellemesi
bekleyenler, jsdom odakli timer sorunlari — hepsi bu faz kapsami
disinda.)

## 5. Kapsam disinda kalanlar (YAPMA listesi)

- **Admin panel**: dokunulmadi. Bridge hala admin-scope beta, bridge
  page override'lari degismedi.
- **Bridge shell ve override'lari**: dokunulmadi. `BridgeAdminLayout`,
  `BridgeJobsRegistryPage`, `BridgeJobDetailPage`,
  `BridgePublishCenterPage` degismedi, ilgili testler yesil kaldi.
- **Atrium**: metadata-only placeholder olarak kaldi. Faz 3 kapsami
  disi.
- **Router contract**: `router.tsx` degistirilmedi, hicbir yeni rota
  eklenmedi. Canvas gorunurlulugu sadece page override mekanizmasi
  uzerinden.
- **Yeni backend endpoint**: yok. Tum Canvas sayfalari mevcut
  `useContentProjects`, `useContentProject`, `useChannelProfiles`,
  `useAuthStore`, `useOnboardingStatus`, `fetchJobs`,
  `fetchStandardVideos`, `startStandardVideoProduction` hook'larini
  kullaniyor.
- **Sahte preview / metrics**: yok. On izleme slot'lari acik sekilde
  placeholder olarak etiketlendi ("on izleme", "pending render"). Hic
  bir sayi ya da kapak resmi uyduracak mantik yok; tum rakamlar gercek
  fixture (proje sayilari, job durumlari) uzerinden turetiliyor.
- **Tum user sayfalarini override etme**: yalnizca uc sayfa (dashboard,
  projelerim, proje detayi) Canvas override'i aliyor. Kanallar, ayarlar,
  analytics, publish, content, comments, playlists, posts, calendar,
  wizard'lar legacy'e dusuyor.
- **Create / publish flow Canvas yorumu**: workspace header + dashboard
  hero + projects header'da gorunur "+ Video" / "+ Bulten" CTA'lari
  eklendi ama asil wizard sayfalari legacy kaldi (opsiyonel madde,
  asgari yorum tercih edildi).

## 6. Teslim (6 madde)

1. **Canvas user shell calisiyor mu?**
   Evet. `CanvasUserLayout` mount olduktan sonra workspace header +
   sidebar + outlet render ediyor. `data-testid="canvas-user-layout"`
   + `data-surface="canvas"` etiketli. Ayni infra (ThemeProvider,
   ToastContainer, CommandPalette, NotificationCenter,
   KeyboardShortcutsHelp, SSE, notifications, palette commands) bridge
   admin shell'iyle aynen paralel olarak calisiyor.

2. **Hangi user sayfalari override edildi?**
   Uc sayfa:
   - `user.dashboard` → `CanvasUserDashboardPage`
   - `user.projects.list` → `CanvasMyProjectsPage`
   - `user.projects.detail` → `CanvasProjectDetailPage`
   Bu uc sayfa Canvas etkinlestiginde trampoline uzerinden Canvas
   yorumuna duser. Override olmayan tum user sayfalari legacy olarak
   kalir.

3. **Artik gorunur yeni arayuz geldi mi?**
   Evet. Canvas etkinlestiginde kullanici:
   - Farkli shell (workspace sidebar + workspace header, "Canvas
     Workspace" rozeti, breadcrumb, "+ Video" / "+ Bulten" hizli
     CTA'lari)
   - Farkli dashboard (proje merkezli hero + health ribbon + iki
     kolonlu aktif projeler + calisan isler)
   - Farkli projelerim (data table yerine preview kart grid'i, filtre
     chip bari, proje sayaci)
   - Farkli proje detayi (hero + on izleme slot + metadata rail + bagli
     isler timeline)

   Bu dort nokta legacy ile goz ile ayirt edilebilir sekilde farkli.
   Fazın temel ruhu ("gorunur tasarim degisimi uretmek") saglandi.

4. **Legacy fallback bozuldu mu?**
   Bozulmadi. Uc yeni smoke test (SurfaceProvider olmadan mount ederek)
   legacy govdelerin (`dashboard-heading`, `my-projects-heading`,
   `project-detail-heading` testid'leri) hala render edildigini
   kanitliyor. Canvas override testid'leri ayni anda yok. Bridge legacy
   fallback testleri hala yesil.

5. **Test sonucu**

   | Kontrol | Sonuc |
   |--------:|:------|
   | `npx tsc --noEmit` | temiz, 0 hata |
   | `npx vite build` | 2.83s, temiz |
   | Targeted surface+bridge+canvas suite | 13 files / 93 tests, 93 pass |
   | Full suite (`npx vitest run`) | 243 fail / 2195 pass = Faz 2A baseline ile birebir ayni. Sifir yeni regresyon. |

6. **Commit hash & push durumu**

   Commit hash: `72e6614` — `feat(surfaces): Faz 3 — Canvas user
   prototype (user dashboard/projects/detail overrides)`. 14 dosya
   degisti (+2384 / -14). `git push origin main` basarili:
   `143177a..72e6614  main -> main`.

## 7. Bilinen sinirlar / teknik borc

- Create flow icin Canvas'a ozgu wizard yorumu yok — workspace
  header'daki CTA'lar legacy `/user/create/video` ve
  `/user/create/bulletin` rotalarina yonlendiriyor.
- Publish Center icin Canvas user yorumu yok — Bridge zaten admin
  publish board'u ele aliyor, user publish legacy kalmaya devam ediyor.
- Proje kartlarindaki on izleme slot'u placeholder; Faz 4+'ta gercek
  render thumbnail'leri geldiginde kart icinde gosterilmesi icin
  `latest_output_ref` hook'u var, ama bu fazda gosterilmedi (preview-
  first olmaktan oncelikli olarak preview-honest olmayi tercih ettik).
- `CanvasUserLayout` hala legacy'deki `USER_NAV` sabitine bakmiyor —
  sidebar kendi zon modelini tasiyor. Eger user nav gelecekte buyurse
  (yeni rota eklendi), Canvas sidebar'i da guncellenmeli. Bu bilincli
  bir tercih (workspace tasarimi fabrik nav listesinden ayriliyor) ama
  kayit altinda tutulmali.
- Full suite'teki 243 pre-existing failure Faz 3 kapsami disi olarak
  taninmis durumda (M7 fresh DB, 22 smoke test guncellemesi, bazi
  timer/SSE flaky'leri — bunlar ContentHub MEMORY notlarinda zaten
  mevcut).

## 8. Ek notlar

- `useSurfacePageOverride` icindeki scope turetmesi
  (`key.startsWith("user.")`) herhangi bir contract migrasyonu
  gerektirmedi — Faz 2'de Bridge icin yazilmis olan hook user scope
  anahtarlarini dogal olarak destekliyordu.
- `SurfacePageKey` branded-string union tipi zaten `admin.*` + brandli
  fallback icerdigi icin `user.*` anahtarlari tipi tarafindan otomatik
  kabul edildi; contract.ts'ye eklememek yeterliydi.
- `useSurfaceResolution` icindeki `canvasEnabled` akisi Faz 1'de
  zaten hazirdi (`ui.surface.canvas.enabled` setting + `enabledSurfaceIds`
  set'ine eklenmesi). Faz 3 sadece manifest'i beta + user yaparak bu
  akisi gercek anlamda kullanilabilir hale getirdi.

Faz 3 tamamlandi.
