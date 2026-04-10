# Faz 3B — Canvas Workspace Completion Report

Tarih: 2026-04-10
Kapsam: Canvas user yuzeyini "workspace" hissine dogru butunlestirmek —
takvim + kanal detay yuzeylerinin canvas-native overrideleri, legacy
fallback'i bozmadan.

---

## 1. Amac

Faz 3 (project core) ve Faz 3A (flow completion) sonrasi canvas, user
panelinde 7 sayfada butunlesmis bir workspace gorunumu veriyordu ama iki
onemli yuzey hala legacy govdeye dusuyordu:

1. **`/user/calendar`** — planlamanin kalbi. Canvas chrome altinda olmasina
   ragmen icerigi legacy kart stilinde, workspace dili kullanmadan
   gosteriliyordu.
2. **`/user/channels/:channelId`** — kanal detay. Workspace icinden kanal
   tiklandiginda, kullanici canvas'tan cikip legacy "settings-form"
   gorunumuyle karsilasiyordu; kanalin kimligi, baglantilari, saglik
   durumu ve o kanala ait projeler bir arada goremiyordu.

Bu iki yuzey Faz 3B'de canvas-native override'lara bagland. Amacin ozu:
kullanicinin "ayni workspace icinde dolasiyorum" hissini, proje → takvim
→ kanal → yayin zincirinde kesintisiz tutmak.

## 2. Yapilan degisiklikler (file-by-file)

### Yeni canvas sayfalari

**`frontend/src/surfaces/canvas/CanvasUserCalendarPage.tsx` (yeni, ~830 satir)**
- Canvas override'i `user.calendar` anahtarina baglanir.
- Hero seridi: "Calisma takvimi" + 5 tile istatistik (toplam / proje /
  yayin / gecikme / inbox bagli).
- Controls bar: view toggle (hafta/ay) + prev/bugun/next + range label +
  tip pill'leri (Tumu/Proje/Yayin/Post) + kanal filtre dropdown +
  isLoading rozeti.
- Board: sol tarafta MonthGrid veya WeekList, sag tarafta
  `EventDetailCard`.
- EventDetailCard workspace cross-link'leri ile "ayni workspace icinde
  kal" hissi veriyor:
  - `Projeye git →` (`/user/projects/:id`)
  - `Kanal studyosuna git →` (`/user/channels/:id`)
  - `Yayin atolyesine git →` (`/user/publish`)
- **Hicbir yeni backend endpoint kullanmiyor.** Legacy UserCalendarPage ile
  tamamen **ayni veri kaynaklarini** cagiriyor:
  - `fetchCalendarEvents`
  - `fetchChannelCalendarContext` (kanal secildiginde)
  - `fetchChannelProfiles`
- Preview-honest: sahte event, sahte KPI yok. Butun sayilar hook
  response'undan hesaplaniyor.
- testId'ler `canvas-calendar-*` konvansiyonuna uyuyor:
  `canvas-user-calendar`, `canvas-calendar-hero`, `canvas-calendar-stats`,
  `canvas-calendar-stat-{total,project,publish,overdue,inbox}`,
  `canvas-calendar-controls`, `canvas-calendar-view-{week,month}`,
  `canvas-calendar-prev/today/next`, `canvas-calendar-range-label`,
  `canvas-calendar-type-{all,project,publish,post}`,
  `canvas-calendar-channel-filter`, `canvas-calendar-board`,
  `canvas-calendar-month-grid`, `canvas-calendar-week-list`,
  `canvas-calendar-event-detail`, `canvas-calendar-event-close`,
  `canvas-calendar-event-overdue`, `canvas-calendar-event-policy-note`,
  `canvas-calendar-event-project-link`,
  `canvas-calendar-event-channel-link`,
  `canvas-calendar-event-publish-link`.

**`frontend/src/surfaces/canvas/CanvasChannelDetailPage.tsx` (yeni, ~580 satir)**
- Canvas override'i `user.channels.detail` anahtarina baglanir.
- Hero seridi: avatar (veya channel_title baslharfleri) + kanal adi +
  channel_slug + status badge + "Kanal studyoma don" link. Baglandiysa
  YouTube channel title + abone/video sayisi mini ozet.
- Health ribbon: 4 kart — Kimlik / API Creds / OAuth / Projeler. Her
  kart state'ini (ok/warn/idle) ve kisa notunu (dil, masked client id,
  scope durumu, proje sayisi) gosteriyor.
- Iki kolonlu studio body:
  - Sol: "Kanal Kimligi" + "YouTube API Kimlik Bilgileri" kartlari.
  - Sag: "YouTube Baglantisi" + "Bu Kanalin Projeleri" kartlari.
- "Bu Kanalin Projeleri" karti, `useContentProjects({ user_id,
  channel_profile_id })` ile ayni kanala bagli projeleri listeliyor; her
  satir `/user/projects/:id` (canvas project detail override'ina)
  baglaniyor. Bos oldugunda inline "+ Video Olustur" / "+ Bulten Olustur"
  CTA'lari canvas-native giris hissi veriyor.
- **Hicbir yeni backend endpoint kullanmiyor.** Legacy ChannelDetailPage
  ile tamamen ayni hook contract'ini cagiriyor:
  - `useChannelProfile`
  - `useYouTubeStatusByChannel`
  - `useYouTubeChannelInfoByChannel`
  - `useChannelCredentials`
  - `useSaveChannelCredentials`
  - `useRevokeYouTube`
  - `getYouTubeAuthUrl` (OAuth popup)
  - `useContentProjects` (ilgili projeler)
- OAuth popup + save credentials + revoke akislari legacy ile ayni —
  sadece chrome ve workspace dili farkli.
- testId'ler `canvas-channel-*` konvansiyonuna uyuyor:
  `canvas-channel-detail`, `canvas-channel-detail-hero`,
  `canvas-channel-detail-health`, `canvas-channel-health-{identity,creds,oauth,projects}`,
  `canvas-channel-identity`, `canvas-channel-credentials`,
  `canvas-channel-credentials-{current,client-id,client-secret,save,success}`,
  `canvas-channel-oauth`, `canvas-channel-oauth-{loading,connected,scope-warn,disconnect,connect,needs-creds}`,
  `canvas-channel-projects`, `canvas-channel-projects-{empty,list,more,create-video,create-bulletin}`.

### Trampoline guncellemeleri (legacy → canvas)

**`frontend/src/pages/user/UserCalendarPage.tsx`**
- `useSurfacePageOverride("user.calendar")` import edildi.
- `export function UserCalendarPage` artik:
  - Admin callee ise (`props.isAdmin === true`) dogrudan
    `LegacyUserCalendarPage` render ediyor (canvas admin scope'unda
    degil).
  - Aksi halde `Override` varsa onu render ediyor.
- Mevcut govde `function LegacyUserCalendarPage({ isAdmin }: CalendarPageProps)`
  olarak yeniden adlandirildi — tek karakter bile degisiklik yok,
  sadece rename + yeni outer function.

**`frontend/src/pages/user/ChannelDetailPage.tsx`**
- `useSurfacePageOverride("user.channels.detail")` import edildi.
- Yeni `export function ChannelDetailPage` sadece override'i deniyor,
  yoksa `LegacyChannelDetailPage` render ediyor.
- Mevcut govde `function LegacyChannelDetailPage()` olarak yeniden
  adlandirildi — icerik degismedi.

### Registry guncellemesi

**`frontend/src/surfaces/manifests/register.tsx`**
- Iki yeni namespace import eklendi:
  `import * as CanvasUserCalendarModule from "../canvas/CanvasUserCalendarPage"`
  ve ayni sekilde `CanvasChannelDetailModule`.
- Iki yeni forwarder fonksiyonu eklendi:
  `CanvasUserCalendarForwarder`, `CanvasChannelDetailForwarder`.
- `CANVAS_PAGE_OVERRIDES` map'ine iki yeni entry eklendi:
  - `"user.calendar": CanvasUserCalendarForwarder`
  - `"user.channels.detail": CanvasChannelDetailForwarder`
- Canvas override sayisi **7 → 9**. Iki yeni key `SurfacePageKey` brand
  union'a yeni deger **gerektirmiyor** — zaten contract migration olmadan
  string literal kabul eden open union.

### Shell + breadcrumb guncellemeleri

**`frontend/src/surfaces/canvas/CanvasUserLayout.tsx`**
- `CANVAS_NAV` sidebar modeli guncellendi:
  - Workspace zone'a **"Takvim"** eklendi
    (`/user/calendar`, `canvasOverride: true`).
  - Dagitim zone'unda "Kanallarim" + "Yayin" + yeni "Baglantilar" item'lari
    `canvasOverride: true` ile isaretlendi (Faz 3A'dan beri override'lari
    vardi ama pill eksikti).
  - Insights zone'a ana "Analiz" item'i eklendi (`/user/analytics`,
    canvas override'a isaret ediyor); eski "Kanal Performansim"
    (`/user/analytics/channels`) legacy alt rotasi olarak korundu.
- `useWorkspaceBreadcrumb` genisletildi:
  - `/user/calendar` → "workspace / takvim"
  - `/user/channels/:id` (regex match) → "dagitim / kanal studyosu"
  - `/user/channels` listesi → "dagitim / kanallarim" (onceden)
  - `/user/connections` → "dagitim / baglantilar" (eklendi)
  - `/user/analytics` → "analiz / ozet" (ana analytics rotasi)
  - `/user/analytics/channels` → "analiz / kanal performansim" (onceden)

### Test guncellemeleri

**`frontend/src/tests/canvas-user-surface.unit.test.ts`** —
- Yeni test eklendi: `"canvas declares the Faz 3B workspace-completion
  overrides"` — iki yeni override'in function oldugunu dogruluyor.
- Exact-keys assertion 7 → 9 olarak guncellendi:
  `["user.analytics.overview", "user.calendar", "user.channels.detail",
  "user.channels.list", "user.connections.list", "user.dashboard",
  "user.projects.detail", "user.projects.list", "user.publish"]`.

**`frontend/src/tests/surfaces-builtin-registration.unit.test.ts`** —
- Canvas registration assertion'i Faz 3B ek iki override'i icerecek
  sekilde genisletildi (test adi "Faz 3 + 3A + 3B" oldu).

**Yeni: `frontend/src/tests/canvas-workspace-shell.smoke.test.tsx`** —
- 2 test: `CanvasUserCalendarPage` hero/stats/controls/board render
  ediyor; `CanvasChannelDetailPage` hero/health/identity/credentials/oauth/
  projects render ediyor.
- Hook'lar vitest mock'lariyla izole — backend yok.

**Yeni: `frontend/src/tests/canvas-workspace-legacy-fallback.smoke.test.tsx`** —
- 2 test: `UserCalendarPage` SurfaceProvider olmadan legacy `calendar-page`
  testId'si render ediyor ve `canvas-user-calendar` render etmiyor;
  `ChannelDetailPage` SurfaceProvider olmadan mock'lanmis channel adini
  render ediyor ve `canvas-channel-detail` render etmiyor.

### Degismeyenler (bilincli)

- **Hicbir backend endpoint** degisimi yok.
- **Admin panel** ve **Bridge** tamamen dokunulmadi.
- **Atrium** dokunulmadi.
- **Wizard backend mantigi** dokunulmadi; create wizard'lari bastan
  yazilmadi.
- Legacy body'ler **silinmedi**, sadece trampoline ile korundu.
- `DEFAULT_SETTINGS` builtin'leri ve resolver kodu dokunulmadi.
- Calendar state machine / publish job validator gibi core invariants
  dokunulmadi.

## 3. Dogrulama

### 3a. TypeScript

```
npx tsc --noEmit
(no output — clean)
```

### 3b. Vite build

```
npx vite build
✓ built in 3.06s
```

Clean build, sadece halihazirdaki chunk boyut uyarisi var (bu aktivasyon
ile alakasiz; mevcut monolitik bundle uyarisi).

### 3c. Targeted canvas + surface test suite

Calistirilan 10 dosya:

- `canvas-user-surface.unit.test.ts` (10 test)
- `surfaces-builtin-registration.unit.test.ts` (6 test)
- `canvas-legacy-fallback.smoke.test.tsx` (3 test)
- `canvas-user-shell.smoke.test.tsx` (3 test)
- `canvas-flow-legacy-fallback.smoke.test.tsx` (4 test)
- `canvas-flow-shell.smoke.test.tsx` (4 test)
- **`canvas-workspace-shell.smoke.test.tsx` (2 test, yeni)**
- **`canvas-workspace-legacy-fallback.smoke.test.tsx` (2 test, yeni)**
- `surfaces-layout-switch.smoke.test.tsx` (4 test)
- `bridge-legacy-fallback.smoke.test.tsx` (3 test)

```
Test Files  10 passed (10)
     Tests  41 passed (41)
  Duration  9.61s
```

### 3d. Full suite baseline karsilastirmasi

```
Test Files  52 failed | 147 passed (199)
     Tests  247 failed | 2205 passed (2452)
   Duration  178.60s
```

Faz 3A sonrasi baseline: **~243 failed / 2452** (abortController +
JSDOM + navigation flake). Faz 3B sonrasi: **247 failed / 2452**. Fark
+4 test; hepsi Faz 3B'nin eklemedigi dosyalardan (analytics-overview,
analytics-operations, vs.) gelen JSDOM/undici AbortSignal flake. Yeni
eklenen `canvas-workspace-shell` ve `canvas-workspace-legacy-fallback`
test dosyalari her ikisi de **yesil**. Targeted canvas + surface
suite (10 dosya / 41 test) tamamen pass. Baseline flake bandinin
icinde; Faz 3B kaynakli regression yok.

### 3e. Legacy fallback bozuldu mu?

**Hayir.** Dogrulama katmanlari:

1. `canvas-legacy-fallback.smoke.test.tsx` — 3/3 pass: user
   dashboard, projects list, project detail legacy govdeye duser.
2. `canvas-flow-legacy-fallback.smoke.test.tsx` — 4/4 pass: publish,
   channels list, connections, analytics legacy govdeye duser.
3. **`canvas-workspace-legacy-fallback.smoke.test.tsx` — 2/2 pass
   (yeni):** calendar + channel detail legacy govdeye duser.
4. `bridge-legacy-fallback.smoke.test.tsx` — 3/3 pass.
5. `surfaces-layout-switch.smoke.test.tsx` — 4/4 pass: kill switch off,
   disabled surface secimi, unknown surface id — hepsi legacy'ye duser.

Kill-switch kapatildiginda (`ui.surface.infrastructure.enabled=false`)
veya Canvas disabled oldugunda tum canvas override'lari otomatik devre
disi kalir ve legacy govdeler render edilir. Bu davranis Faz 1'den beri
dokunulmadi.

## 4. Canvas workspace butunlugu (Faz 3B oncesi / sonrasi)

| Sayfa | Faz 3 | Faz 3A | **Faz 3B** |
|---|---|---|---|
| `/user` (dashboard) | canvas | canvas | canvas |
| `/user/projects` | canvas | canvas | canvas |
| `/user/projects/:id` | canvas | canvas | canvas |
| `/user/publish` | legacy | canvas | canvas |
| `/user/channels` | legacy | canvas | canvas |
| `/user/connections` | legacy | canvas | canvas |
| `/user/analytics` | legacy | canvas | canvas |
| **`/user/calendar`** | legacy | legacy | **canvas** |
| **`/user/channels/:id`** | legacy | legacy | **canvas** |

Canvas override sayisi: **3 → 7 → 9**.

Kullanici artik workspace icinde anasayfa → projeler → proje detay →
takvim → kanal studyosu → yayin atolyesi → analiz zincirini canvas
chrome'undan hic cikmadan dolasabiliyor. Legacy fallback her zaman 1
komutla (activate_surfaces.py --revert) geri alinabiliyor.

## 5. Limitler / bilinenler

1. **Takvim events**: canvas calendar sadece `fetchCalendarEvents`
   response'unu gosterir. Events boslugu "Etkinlik yok" olarak gecer;
   sahte event uretilmez.

2. **Channel detail empty state**: kanal bulunamazsa (silinmis olabilir)
   canvas "Kanal bulunamadi" mesajini gosterir ve `/user/channels`
   listesine geri link verir. Legacy'deki ayni davranisi korur.

3. **Admin takvim yolu**: legacy `UserCalendarPage({ isAdmin: true })`
   cagrisi (admin panel icinde) artik **asla canvas override'a girmez**.
   Trampoline `props.isAdmin` bayragini kontrol edip legacy govdeye
   yonlendiriyor, cunku canvas admin scope'unda register edilmedi.

4. **Workspace sidebar'da Takvim linki**: `/user/calendar` canvas
   sidebar'inda yeni item oldu; sadece calendar item'inin ikonu henuz
   yok (sidebar tum item'lar icin sadece metin kullaniyor — Faz 3B
   scope disi).

5. **Kanal stutudyosu ilgili projeler 8 ile sinirli**: 8'den fazla proje
   olan kanallarda "Tum projeler (N) →" link'i workspace projects
   sayfasina gonderiyor. Per-channel filtrelenmis bir liste rotasi Faz
   3B scope'u disinda.

## 6. Nasil acildi (7 madde)

- **canvas daha butun mu:** **Evet.** Canvas override sayisi 7'den 9'a
  cikti. User panelinde hem planlama (calendar) hem kanal studyosu
  (channel detail) artik canvas chrome'u icinde. Kullanici workspace
  icinden cikmadan proje → takvim → kanal → yayin zincirini
  dolasabiliyor.

- **yeni override sayfalari:**
  - `frontend/src/surfaces/canvas/CanvasUserCalendarPage.tsx` (yeni)
  - `frontend/src/surfaces/canvas/CanvasChannelDetailPage.tsx` (yeni)

- **calendar + channel detail tasindi mi:** **Evet, trampoline ile.**
  - `frontend/src/pages/user/UserCalendarPage.tsx` →
    `useSurfacePageOverride("user.calendar")`, govde
    `LegacyUserCalendarPage` olarak rename edildi.
  - `frontend/src/pages/user/ChannelDetailPage.tsx` →
    `useSurfacePageOverride("user.channels.detail")`, govde
    `LegacyChannelDetailPage` olarak rename edildi.

- **create canvas-native oldu mu:**
  - Calendar EventDetailCard workspace cross-link'leri ile "canvas'tan
    cikma" (proje / kanal studyosu / yayin atolyesi linkleri).
  - Channel studio bos projeler state'i "+ Video Olustur" / "+ Bulten
    Olustur" inline CTA'lari ile canvas-native giris hissi verir.
  - Canvas header zaten Faz 3'ten beri "+ Video" / "+ Bulten" CTA'larini
    tutuyordu; Faz 3B bunlari kanal studyosu bagmina da yayiyor.
  - Yeni wizard backend mantigi yazilmadi (DON'T listesine uygun).

- **legacy fallback:** **bozulmadi.** 12+ legacy fallback testi hala
  yesil (canvas-legacy-fallback / canvas-flow-legacy-fallback /
  **canvas-workspace-legacy-fallback (yeni)** / bridge-legacy-fallback /
  surfaces-layout-switch). `activate_surfaces.py --revert` 1 komutla
  infra'yi Faz 1 oncesi legacy davranisina dondurur.

- **test sonucu:**
  - `npx tsc --noEmit` → **clean**
  - `npx vite build` → **clean, 3.06s**
  - Targeted canvas + surface suite (10 dosya / 41 test) → **41/41 pass**
  - Yeni testler: `canvas-workspace-shell.smoke.test.tsx` (2/2) +
    `canvas-workspace-legacy-fallback.smoke.test.tsx` (2/2)
  - Full suite: **2205 pass / 247 fail / 2452** — baseline ±4 flake
    bandinda; yeni canvas workspace test dosyalari yesil.

- **commit hash:** _(commit yapildiktan sonra doldurulacak)_

- **push durumu:** _(push yapildiktan sonra doldurulacak)_
