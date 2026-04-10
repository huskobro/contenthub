# Faz 4D — Surface Activation + Panel Switch + UX Clarity Fix

Tarih: 2026-04-10
Kapsam: Canvas/Atrium/Bridge panel gecisi, surface picker aktivasyon netligi,
scope mismatch mesaji, picker rozetleri, inline aktivasyon feedback.
Daha onceki baz: Faz 4C (`c519b5a`) — header badge + picker reason + bestFor.

## 1. Sorun tanimi

Kullanici Faz 4C sonrasi iki onemli gecise deyindi:

1. **Panel gecisi kopmustu.** Canvas ve Atrium user shell'lerinde admin'e donus
   butonu hic yoktu. AppHeader (legacy'de `Kullanici/Yonetim Paneli` butonunu
   tasiyan bilesen) yalniz `AdminLayout`/`UserLayout` tarafindan mount ediliyor;
   yeni surface shell'leri kendi topbar'larini yaziyor ve bu yuzden switch'i
   miras almiyor. Sonuc: Canvas'ta veya Atrium'da oturan kullanici admin panele
   donemiyor, URL elle yazmak zorunda kaliyordu. Bridge admin shell'inde ise
   `bridge-scope-switch` butonu vardi ama ne title'i ne aria-label'i neye
   yaradigini soylemiyordu.
2. **Surface aktivasyonu anlasilmaz.** Picker `Aktif Et` butonunu sunuyordu,
   resolver'in o karari kabul edip etmedigi (fallback mi, explicit mi, rol
   varsayilani mi) hicbir yerde gorunmuyordu. Scope mismatch uyarilari soyut
   teknik metin idi (*"Bu yuzey bu panel icin uygun degil"*) ve kullaniciya
   ne yapabilecegini soylemiyordu. `onerilen` hic isaretlenmiyordu. Aktif Et
   basilinca geri bildirim yoktu.

Bu iki problem Faz 4C'nin test/metin ilerlemesini kullaniciya ulastirmayi
engelliyordu — o yuzden Faz 4D bu bosluklara odaklandi.

## 2. Yapilan degisiklikler (dosya dosya)

### Panel switch (Task A)

#### `frontend/src/surfaces/canvas/CanvasUserLayout.tsx`
- Workspace header'inda `NotificationBell`'den hemen sonra yeni bir ayirici +
  "Yonetim Paneline Gec" butonu eklendi.
- `title` ve `aria-label` ayni metin: *"Yonetim paneline gecis yapin"*.
- `data-testid="canvas-panel-switch"`.
- Stil: mevcut Canvas buton paletini taklit eder (`border border-border`,
  `text-neutral-600`, hover: `border-brand-400`). Yeni renk tokeni eklenmedi.

#### `frontend/src/surfaces/atrium/AtriumUserLayout.tsx`
- Editorial marquee'de `NotificationBell`'den once, `+Video`/`+Bulten`
  butonlarindan sonra pill tarzi yeni switch butonu. Karanlik Atrium temasiyla
  uyumlu: `border border-neutral-600`, `text-neutral-100`, hover: `bg-neutral-800`.
- `title`/`aria-label`: *"Yonetim paneline gecis yapin"*.
- `data-testid="atrium-panel-switch"`.
- Metin: *"Yonetim Paneli"* (pill buton kisaltmasi).

#### `frontend/src/surfaces/bridge/BridgeAdminLayout.tsx`
- Mevcut `bridge-scope-switch` testid'i **korundu** (kullanicinin "testid'leri
  gereksiz bozma" direktifi). Yerine:
  - `title="Kullanici paneline gecis yapin"`
  - `aria-label="Kullanici paneline gecis yapin"`
  - Yeni ek attribute: `data-panel-switch="bridge"` — ileride tutarli bir
    selector'a ihtiyac duyulursa kullanilabilir.
- Buton icindeki `USR` pill'i aynen korundu.

### Scope mismatch mesaji (Task C)

#### `frontend/src/surfaces/selectableSurfaces.ts`
- `describeIneligibleReason` opsiyonel `opts?: { panelScope, surfaceScope }`
  parametresi ile genisletildi.
- `scope-mismatch` kolunda:
  - admin + user-only: *"Bu yuzey yalnizca yonetim panelinde calisir (ornek:
    Bridge). Kullanici panelinde Canvas, Atrium, Legacy veya Horizon
    kullanabilirsiniz."*
  - user + admin-only: *"Bu yuzey yalnizca kullanici panelinde calisir (ornek:
    Canvas, Atrium). Yonetim panelinde Bridge, Legacy veya Horizon
    kullanabilirsiniz."*
  - `opts` verilmezse eski generic metin *"... uygun degil (scope mismatch)"*
    korundu — geriye donuk uyumluluk.

### Status panel + recommended + inline feedback (Tasks B + D + E)

#### `frontend/src/components/surfaces/SurfacePickerSection.tsx`
Bes dokunus:

1. **Imports genisletildi**: `useMemo, useCallback, useState, useEffect`.
   Helper import'larina `describeResolutionReason` eklendi.

2. **Status panel (Task B)** — `SectionShell` icinde picker kart listesinin
   hemen ustune konuldu. Dort satir `<dl>`:
   - `Altyapi`: `Acik` / `Kapali` — `infrastructureEnabled` okur;
     `text-success-text` / `text-warning-text` ile renklendirilir.
   - `Bu panelde aktif`: `${activeResolvedName} (${activeResolvedId})`.
   - `Neden`: `describeResolutionReason(reason)` ile Turkce metne cevrilir.
   - `Tercihiniz`: explicit yoksa *"yok — varsayilana giyoruz"*, varsa
     `atrium`, ve eger resolver farkli yuzeyi kullaniyorsa *"(resolver
     tarafindan kullanilmiyor)"* eki.
   - Test id'leri: `surface-picker-status-panel-{scope}`,
     `surface-picker-status-infra`, `surface-picker-status-active`,
     `surface-picker-status-reason`, `surface-picker-status-preference`.

3. **Onerilen rozeti (Task D)** — `SurfacePickerCard`'a `isRecommended: boolean`
   prop'u eklendi. Kart basliginda bootstrap rozetinden hemen sonra, yalniz
   `isRecommended && entry.selectable` oldugunda `onerilen` pill'i render
   edilir (`border-success bg-success-light text-success-text`).
   - Section seviyesinde: `roleDefaultId = scope === "admin" ?
     settings.defaultAdmin : settings.defaultUser`. Kartlar render edilirken
     `isRecommended = roleDefaultId !== null && entry.id === roleDefaultId`.
   - Test id: `surface-picker-recommended-${id}`.

4. **Inline activation feedback (Task E)** — yeni `lastAction` state:
   ```ts
   type ActivationAction =
     | { kind: "activated"; id: SurfaceId }
     | { kind: "reset" }
     | null;
   ```
   - `handleActivate(id)` hem `setActiveSurface(id)` hem `setLastAction`.
   - `handleReset()` hem `setActiveSurface(null)` hem `setLastAction`.
   - `useEffect([scope])` ile scope degisirse feedback temizlenir.
   - `feedback` useMemo: resolver gercek sonucunu esas alarak *success* mi
     *warning* mi karar verir.
     - reset → *"Tercihiniz temizlendi. Bu panel artik varsayilanla '...'
       yuzeyini gosteriyor."*
     - `activated` + `lastAction.id === activeResolvedId` → *"Bu panel artik
       '...' ile goruntuleniyor."* (success)
     - `activated` + farkli id → *"Tercihiniz '...' alindi ancak bu panelde su
       an kullanilamiyor. Resolver varsayilan/fallback olarak '...' gosteriyor."*
       (warning)
   - Render: picker kartlarinin ustunde, status panelinden hemen sonra. Testid:
     `surface-picker-activation-feedback-{scope}` + `data-tone="success|warning"`.
   - Hicbir global toast, hicbir stats API, hicbir sahte onay. Sadece gercek
     resolver state'inden turev olarak yazilmis bir cumle.

5. **Ineligible kart metni scope-aware** — `SurfacePickerCard`'in ineligible
   bloku artik `describeIneligibleReason(reason, { panelScope: scope,
   surfaceScope: manifest.scope })` cagiriyor. Scope-mismatch kartlari
   otomatik olarak pozitif yonlendirme metni gosteriyor.

## 3. Testler

### Yeni smoke test 1 — `surface-panel-switch-everywhere.smoke.test.tsx`
Uc surface layout'unda panel switch butonunun varligini ve tiklaninca dogru
yere yonlendigini dogrular. jsdom icinde layout'lar agir hook'lar (React Query,
visibility, SSE) yuklediginden tum hook'lar modul seviyesi mock'lar ile
sifirlandi ve layout `QueryClientProvider` ile sarildi.

```
✓ Faz 4D — panel switch presence across surfaces (6 tests)
  ✓ CanvasUserLayout > renders a visible, labelled admin panel switch button
  ✓ CanvasUserLayout > clicking canvas panel switch navigates to /admin
  ✓ AtriumUserLayout > renders a visible, labelled admin panel switch button
  ✓ AtriumUserLayout > clicking atrium panel switch navigates to /admin
  ✓ BridgeAdminLayout > enriched bridge scope switch keeps legacy testid + adds clear labels
  ✓ BridgeAdminLayout > clicking bridge scope switch navigates to /user
```

### Yeni smoke test 2 — `surface-activation-clarity.smoke.test.tsx`
Status panel, onerilen rozeti, inline feedback, scope-mismatch metni — hepsi
`__setSurfaceSettingsSnapshot` ile deterministik bir snapshot uzerinde test
edilir.

```
✓ Faz 4D — SurfacePickerSection status panel (Task B) — 3 tests
  ✓ user scope: renders 4 status rows with default values
  ✓ admin scope: status panel reports infra=Kapali when kill-switch off
  ✓ status panel reflects explicit preference in 'Tercihiniz' row
✓ Faz 4D — recommended badge (Task D) — 2 tests
  ✓ user scope: 'onerilen' badge appears only on canvas (role default)
  ✓ admin scope: 'onerilen' badge appears on bridge
✓ Faz 4D — inline activation feedback (Task E) — 3 tests
  ✓ clicking Aktif Et on a usable surface shows success feedback
  ✓ clicking Varsayilana don shows reset success feedback
  ✓ no feedback shown before any user action
✓ Faz 4D — scope mismatch positive guidance (Task C) — 4 tests
  ✓ admin + user-only message mentions bridge/legacy/horizon
  ✓ user + admin-only message mentions canvas/atrium/legacy/horizon
  ✓ scope mismatch with no opts keeps legacy generic text
  ✓ rendered ineligible card (admin scope, canvas) shows positive guidance text
```

Toplam: **12 test, 12 pass**.

### Mevcut `selectable-surfaces.unit.test.ts`
Faz 4C'den kalan 22 testi `describeIneligibleReason`'i opts'siz cagirdigi icin
hicbir degisiklik gerektirmedi — opts opsiyonel, default metin korundu.

```
Test Files  1 passed (1)
Tests  22 passed (22)
```

### Hedefli regresyon — tum surface testleri
```bash
npx vitest run 'src/tests/surface' 'src/tests/panel-switch' 'src/tests/selectable'
```
Sonuc: **13 dosya pass, 1 dosya fail** (137 test, 136 pass, 1 fail).

Kalan basarisiz test: `panel-switch-destination-clarity.smoke.test.tsx` —
`LegacyUserDashboardPage` icinde `(projects ?? []).slice is not a function`
hatasi. Bu test Faz 4D tarafindan **degistirilmedi**. Hata `UserDashboardPage`
pre-existing bir regresyon — `useContentProjects` mock'u dizi yerine object
donduruyor. `git log -- frontend/src/pages/UserDashboardPage.tsx` cikti Faz 3
(72e6614). Faz 4D hicbir pages/UserDashboardPage.tsx veya bu testi
ellemedi — `git status` ciktisi da bunu dogruluyor.

### TypeScript
```bash
npx tsc --noEmit
```
Faz 4D dosyalarinda (`Canvas/Atrium/Bridge` layouts, `selectableSurfaces`,
`SurfacePickerSection`, iki yeni test dosyasi) **sifir** hata. Mevcut tsc
ciktisindaki hatalar yalnizca `useCredentials` hook'unun yeniden
adlandirilmasi kapsaminda olusmus pre-existing hatalar
(`ChannelDetailPage`, `ChannelVideoPickerModal`, `CanvasChannelDetailPage`) —
Faz 4D disindaki bir is.

## 4. Fallback davranisi

Resolver ve fallback chain hic ellemedi. Faz 4D sadece **gorunum + metin**
katmanina dokundu. Ozet:

- `resolveActiveSurface.ts`: degismedi.
- `useSurfaceResolution.ts`: degismedi.
- Registry / enabledSurfaceIds hesaplama: degismedi.
- Explicit tercih vs fallback farkini zaten Faz 4C'de resolve'da
  `isResolvedActive` degiskeniyle kurmustuk; Faz 4D onu gorsel UI'ya tasiyor.

Kill-switch kapaliyken status panel `Altyapi: Kapali` + `Bu panelde aktif:
Legacy Layout` diyor, cunku resolver hala `legacy-fallback` donuyor (degismedi).
Scope-mismatch kartlari ineligible kalir, sadece metni zenginlesti.

## 5. Yapilmadigi gibi yerinde birakilan isler (YAPMA listesi)

- Yeni bir surface eklemedim.
- Bridge / Canvas / Atrium sayfa override'lari yeniden tasarlamadim.
- Hicbir yeni backend endpoint'i yok.
- Hicbir yeni settings key'i yok.
- Registry / resolver / fallback chain'ine dokunmadim.
- Ikinci gizli tercih mekanizmasi yok — `useThemeStore.setActiveSurface`
  tek yol.
- Toast kullanmadim; feedback kucuk + yerel + gercek state tabanli.
- Panel switch eski testid'lerini korudu (Bridge: `bridge-scope-switch`).
- Yeni nav yazmadim; mevcut Canvas/Atrium header'larinin icine buton ekledim.

## 6. Commit / push

- Commit hash: **TBD — commit asamasinda guncellenecek**
- Push: **TBD**

## 7. Teslim ozeti (7 madde)

- **admin/user panel gecisi duzeldi mi**: evet. Canvas `canvas-panel-switch`
  butonu → `/admin`, Atrium `atrium-panel-switch` butonu → `/admin`, Bridge
  `bridge-scope-switch` butonu (eski testid korunarak) artik net title /
  aria-label ile `/user`'a yonlendiriyor.
- **surface aktivasyonu daha anlasilir oldu mu**: evet. `SurfacePickerSection`
  artik ustunde 4-satirli bir status panel (Altyapi / Aktif / Neden / Tercihiniz)
  ve Aktif Et sonrasi tone'lu inline feedback satiri gosteriyor. Explicit
  tercih resolver tarafindan kullanilamiyorsa uyari tonunda "tercih alindi ama
  fallback'a dusuldu" metni cikiyor.
- **scope mismatch mesaji daha iyi hale geldi mi**: evet.
  `describeIneligibleReason` artik `panelScope`/`surfaceScope` opts aliyor ve
  kullaniciya "bu panelde sunu kullanabilirsiniz (Canvas/Atrium/Legacy/Horizon
  veya Bridge/Legacy/Horizon)" seklinde pozitif yonlendirme donuyor. Picker
  ineligible kartlari bu metni otomatik goruyor.
- **picker daha net oldu mu**: evet. Role-default ve selectable olan kartta
  yeni `onerilen` rozeti belirdi; active kart zaten reason badge'i
  tasiyor (Faz 4C); explicit-ama-kullanilmayan tercih kartinda Faz 4C'den
  kalma `Tercih (kullanilmiyor)` uyarisi korundu. Selectable/ineligible arasi
  gorsel ayrim border + opacity ile korunuyor.
- **fallback bozuldu mu**: hayir. Resolver, registry, enabledSurfaceIds, kill
  switch, legacy-fallback — hepsi degistirilmedi. Kill-switch kapaliyken
  `legacy-fallback` hala isliyor ve status panel bunu `Altyapi: Kapali` +
  `Neden: Kill switch kapali ...` olarak gosteriyor.
- **test sonucu**:
  - yeni `surface-panel-switch-everywhere.smoke.test.tsx` — **6/6 pass**
  - yeni `surface-activation-clarity.smoke.test.tsx` — **12/12 pass**
  - mevcut `selectable-surfaces.unit.test.ts` — **22/22 pass**
  - hedefli surface regresyonu — **136/137 pass** (1 pre-existing fail:
    `LegacyUserDashboardPage` `useContentProjects` mock sekli — Faz 4D
    ellemedi).
  - `npx tsc --noEmit` Faz 4D dosyalarinda sifir hata.
- **commit hash**: commit asamasinda eklenecek.
- **push durumu**: push asamasinda eklenecek.
