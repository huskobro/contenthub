# Faz 1 — Surface Registry Altyapisi: Uygulama Raporu

Tarih: 2026-04-10
Durum: Tamamlandi (altyapi)
Kapsam: Yalnizca altyapi. Yeni varyant UI (atrium/bridge/canvas) YOK.

## 1. Hedef

Mevcut `legacy` (classic) ve `horizon` layout ikiliginin yerine, ContentHub frontend'inde coklu "surface" (varyant shell) calistirabilen bir kayit/altyapi kurulumu. Faz 1 yalnizca altyapiyi indirmeyi hedefler; hicbir yeni varyant UI yazilmaz, mevcut davranis degismez. Ileride yapilacak uygulama (Faz 2+) icin tasarim yuzeyi hazirlanir.

Ana kullanici sartlari:

- Router (router.tsx) degisemez.
- atrium/bridge/canvas icin yeni shell yazilmaz; yalnizca disabled manifestler.
- Surface Registry ile N-surface resolve edilebilir.
- `ui.surface.infrastructure.enabled` **kill switch**, default **false** (kapali).
- Kill switch kapali iken davranis = Faz 1 oncesiyle ayni (classic/horizon).
- Kill switch acik iken: user pref -> rol default -> global default -> legacy zinciri.
- Scope uyumsuzlugu, bilinmeyen surface id, disabled surface hatalari -> **legacy fallback**.
- `activeSurfaceId` themeStore icinde, versiyonlu migration ile persist edilir.
- Surface ozel CSS override'lari themeEngine uzerinden akar.
- Backend KNOWN_SETTINGS'e 6 yeni anahtar eklenir.
- Telemetry hafif ama future-proof.

## 2. Eklenen / Degisen Dosyalar

### 2.1 Yeni modul: `frontend/src/surfaces/`

Toplam 13 yeni dosya:

| Dosya | Rol |
|---|---|
| `contract.ts` | Tum Surface Registry turleri (SurfaceManifest, Surface, ResolvedSurface, SurfaceResolutionInput, SurfaceResolutionReason, vb.) |
| `registry.ts` | Singleton Map tabanli kayit. `registerSurface`, `getSurface`, `listSurfaces`, `listAvailableSurfaces`, `getLegacySurface`, test helper'lari |
| `telemetry.ts` | Ring buffer (50 event) + pluggable sink. `emitResolution`, `setSurfaceTelemetrySink` |
| `resolveActiveSurface.ts` | Saf fonksiyon: kill-switch-off -> forced -> user-pref -> role-default -> global-default -> legacy |
| `SurfaceContext.tsx` | React context. `SurfaceProvider`, `useSurfaceContext`, `useActiveSurface`, `useSurfaceEnabled` |
| `useSurfaceResolution.ts` | Ortak hook. Modul-seviyesi settings snapshot (Promise.all ile 6 effective setting) + listener set |
| `index.ts` | Genel barrel. Side-effect import ile built-in kayit |
| `manifests/legacy.ts` | `LEGACY_MANIFEST` (stable, scope both) |
| `manifests/horizon.ts` | `HORIZON_MANIFEST` (stable, scope both) |
| `manifests/atrium.ts` | `ATRIUM_MANIFEST` (disabled, placeholder) |
| `manifests/bridge.ts` | `BRIDGE_MANIFEST` (disabled, placeholder) |
| `manifests/canvas.ts` | `CANVAS_MANIFEST` (disabled, placeholder) |
| `manifests/register.tsx` | Bootstrap: lazy forwarder bileşenleri ile built-in surface'lari kaydeder. `import * as AdminLayoutModule` ile ES module live binding kullanir, boylece dairesel bagimlilik patlamadan AdminLayout/HorizonAdminLayout/UserLayout/HorizonUserLayout bilesenlerine referans verir |

Kritik mimari karar (dairesel bagimlilik defansi): `register.tsx` icinde:

```tsx
import * as AdminLayoutModule from "../../app/layouts/AdminLayout";
function LegacyAdminForwarder(_props: SurfaceLayoutProps) {
  const Impl = AdminLayoutModule.AdminLayout; // runtime'da dereference
  return <Impl />;
}
```

Bu yaklasim `AdminLayout -> ThemeProvider -> surfaces/index -> register -> AdminLayout` ciklamasini kirar, cunku `AdminLayoutModule` namespace import'u **ES module live binding**'dir ve gercek bilesene ancak forwarder cagrildiginda erisilir.

### 2.2 Degisen mevcut dosyalar

- `frontend/src/stores/themeStore.ts`
  - Sabitler: `STORAGE_KEY_SURFACE = "contenthub:active-surface-id"`, `SURFACE_STORAGE_VERSION = 1`.
  - `loadActiveSurfaceId()`: cesitli bozuk/eski payload case'lerini migrate eder.
  - `saveActiveSurfaceId(id)`: `{v:1, id}` zarfi yazar.
  - `ThemeState`'e `activeSurfaceId: string | null` ve `setActiveSurface` eklendi.
  - Ilk durum `loadActiveSurfaceId()` uzerinden okunur.

- `frontend/src/components/design-system/themeEngine.ts`
  - `applyThemeToDOM(theme, options?)` imzasi genisledi. `options.surfaceId`, `options.surfaceOverrides`.
  - Onceki surface override anahtarlari (sadece `--ch-*` ile baslayanlar) geri alinir.
  - `data-surface` attribute root element'e yazilir/silinir.
  - `getCurrentSurfaceId()` export'u eklendi.

- `frontend/src/components/design-system/ThemeProvider.tsx`
  - `SurfaceProvider` bu bileseni sariyor.
  - `ThemeSurfaceBinder` ic bileseni surface context'ini okuyup `applyThemeToDOM`'a iletiyor.
  - **Dikkat**: `SurfaceProvider`/`useSurfaceContext`, barrel yerine dogrudan `../../surfaces/SurfaceContext` modulunden import ediliyor. Bu, `ThemeProvider -> surfaces/index -> manifests/register -> AdminLayout -> ThemeProvider` ciklamasini kirmak icin gerekli.

- `frontend/src/app/layouts/DynamicAdminLayout.tsx` ve `DynamicUserLayout.tsx`
  - Artik `useSurfaceResolution()` hook'unu dogrudan cagiriyor (context araciligi yok), cunku bu bilesenler router seviyesinde, ThemeProvider'in **ustunde** calisir.
  - Cozulen surface'in `adminLayout`/`userLayout` bileseni render edilir (key=surfaceId ile). Eger layout yoksa `<AdminLayout key="legacy-safety" />` / `<UserLayout ...>` saftnet fallback.
  - Her iki dosya da `import "../../surfaces"` side-effect'i ile built-in'leri garanti ediyor.

- `backend/app/settings/settings_resolver.py`
  - UI bolumune 6 yeni KNOWN_SETTINGS kaydi eklendi:

    | Key | type | builtin_default |
    |---|---|---|
    | `ui.surface.infrastructure.enabled` | boolean | `False` |
    | `ui.surface.default.admin` | string | `"legacy"` |
    | `ui.surface.default.user` | string | `"legacy"` |
    | `ui.surface.atrium.enabled` | boolean | `False` |
    | `ui.surface.bridge.enabled` | boolean | `False` |
    | `ui.surface.canvas.enabled` | boolean | `False` |

  - Tumu `wired_to="frontend.surfaces.resolver"` etiketi ile kaydedildi.
  - Hicbir kayit mevcut davranisi etkilemiyor; varsayilanlar Faz 1 oncesiyle ayni (kill switch kapali).

### 2.3 Yeni test dosyalari

- `frontend/src/tests/surfaces-registry.unit.test.ts` — 11 test: register/get/listeler, validation throw'lari (bos id, eksik layout), idempotency, disabled layout'suz kayit, getLegacySurface hata yolu.
- `frontend/src/tests/surfaces-resolver.unit.test.ts` — 15 test: kill-switch off, forced, user pref (in-scope/scope-mismatch/disabled/not-in-enabled), role default, global default, ultimate fallback.
- `frontend/src/tests/surfaces-theme-store-migration.unit.test.ts` — 10 test: no payload, v1 valid, v1 null, corrupt JSON, bare string (eski schema), future version, `setActiveSurface` yazim davranisi, `setActiveSurface` activeThemeId'ye dokunmuyor.
- `frontend/src/tests/surfaces-builtin-registration.unit.test.ts` — 6 test: 5 built-in surface'in dogru status/scope/layout ile kayitli oldugunu dogruluyor.
- `frontend/src/tests/surfaces-layout-switch.smoke.test.tsx` — 4 test: default classic admin/user renderi, disabled atrium fallback, bilinmeyen id fallback.

Toplam: **46 yeni test**.

## 3. Cozulme Zinciri (Resolver)

Sirayla denenir:

1. **Kill-switch off** (`infrastructureEnabled === false`) -> `legacy` (reason: `kill-switch-off`, didFallback: false).
2. **Forced** (`VITE_FORCE_SURFACE_ID` env): kullanilabilirse dondurulur, degilse legacy fallback.
3. **User pref** (`activeSurfaceId`): registered + enabled + scope uyumlu + enabledSet icinde ise dondurulur. Hicbir kriter tutmazsa bir sonraki katmana.
4. **Role default** (`defaultAdmin`/`defaultUser`): ayni kullanilabilirlik kontrolu.
5. **Global default**: ayni kullanilabilirlik kontrolu.
6. **Ultimate fallback**: `legacy`.

Her adim fallback yaparsa `reason` ilgili katmani, `didFallback` ise `requestedId !== null && requestedId !== "legacy"` olarak isaretlenir. Telemetry her cozulmede `emitResolution` cagirir; fallback durumunda event type `surface.fallback`, aksi halde `surface.resolved`.

## 4. Kill Switch Davranisi

- **Kapali (default)**: Resolver kisa devre yapar. `input.legacyLayoutMode === "horizon"` ise `horizon` surface'ini `reason: "kill-switch-off"` ile dondurur; aksi halde `legacy` dondurur (kod: `resolveActiveSurface.ts` 104-121). Dolayisi ile horizon kullanan mevcut kullanicilar hicbir fark hissetmez ve classic kullanicilar da.
- **Acik**: 4 katmanli zincir aktif olur.

## 5. ThemeStore Migration Kurallari

Eski payload yapilari -> v1 envelope (`{v:1, id}`):

| Girdi | Sonuc |
|---|---|
| localStorage bos | `null` |
| `{v:1, id:"horizon"}` | `"horizon"` |
| `{v:1, id:null}` | `null` |
| Bozuk JSON | `null` + anahtar silinir |
| `"horizon"` (v field yok, eski bare string) | `null` + anahtar silinir |
| `{v:2, id:"x"}` (gelecek versiyon) | `null` |
| `{v:1}` (id field yok) | `null` |

Yukaridaki 7 senaryo `surfaces-theme-store-migration.unit.test.ts`'de test edilmistir.

## 6. Test Sonuclari

### 6.1 TypeScript type-check
```
npx tsc --noEmit
TSC_EXIT=0
```
Temiz. Hic hata yok.

### 6.2 Vite build
```
npx vite build
BUILD_EXIT=0
✓ built in 2.80s
```
Temiz. Chunk size uyarisi mevcut ama Faz 1 oncesinden miras, yeni regresyon degil.

### 6.3 Yeni surface testleri
```
npx vitest run src/tests/surfaces-*.test.*
Test Files  5 passed (5)
     Tests  46 passed (46)
```
Tum 46 yeni test gecti.

### 6.4 Onceden bilinen test sorunlari (regresyon degil)
`src/tests/app.smoke.test.tsx` -> 3 failed / 5 passed. **Pre-existing**. Stash ile benim degisikliklerimi geri aldiktan sonra bile ayni 3 test ayni hata (`getMultipleElementsFoundError` on "Yonetim Paneli") ile basarisiz olmaktadir. Bu, `MEMORY.md` icindeki "22 smoke test guncellenmeli" notuyla ortusuyor. **Benim degisikliklerim tarafindan tetiklenmedi**.

### 6.5 Backend KNOWN_SETTINGS dogrulama
```
ui.surface.infrastructure.enabled type=boolean builtin_default=False
ui.surface.default.admin         type=string  builtin_default=legacy
ui.surface.default.user          type=string  builtin_default=legacy
ui.surface.atrium.enabled        type=boolean builtin_default=False
ui.surface.bridge.enabled        type=boolean builtin_default=False
ui.surface.canvas.enabled        type=boolean builtin_default=False
```
6 anahtar da KNOWN_SETTINGS'de kayitli.

## 7. Bilerek YAPILMAYANLAR (kapsam disi)

- `router.tsx` degismedi.
- atrium/bridge/canvas icin hicbir gercek shell/page yazilmadi. Sadece metadata manifest.
- Hicbir switcher UI (komut paletine surface degistirici, settings'de varyant secici, vs.) eklenmedi.
- Legacy ve Horizon runtime davranisi degismedi — kill switch kapali oldugundan resolver her zaman legacy/horizon dondurur ve Faz 1 oncesiyle ayni kod akisi devrede kalir.
- Remotion/composition tarafina dokunulmadi.
- Backend API uretimi yapilmadi; yeni endpoint yok, sadece KNOWN_SETTINGS genisleme.
- `ui.surface.global.default` gibi ek anahtar uretilmedi; Faz 1 icin admin/user default ikilisi yeterli.

## 8. Bilinen Sinirlar / Teknik Borc

1. **Dairesel import** riski hala forwarder mimarisine baglidir. `manifests/register.tsx` icindeki forwarder'lar calismak icin `AdminLayout` vb. ES module export'larin `.AdminLayout` olarak dereference edilmesine guvenir; dosya isimleri degisirse tip hatasi verir (bu iyi — runtime surprise degil compile-time hata). Default export kullanilmamasi kritik.
2. `SurfaceProvider` hem `DynamicAdminLayout`/`DynamicUserLayout` seviyesinde hem de `ThemeProvider` icinde **iki ayri ornek** olarak calisir (cunku context kimliksel olarak kaybolur). Her iki nokta da `useSurfaceResolution` hook'unu cagirdigi icin **ayni snapshot**'tan beslenirler, dolayisi ile mantiksal bir bozulma yok. Ancak telemetry tarafinda bir cozulmede hem admin hem user scope icin iki event baslayacagindan **bir cozulme icin toplam 4 event** uretilebilir. Buffer kucuk (50), bu sinirin uzerinde degil.
3. Telemetry ring buffer modul-seviyesi oldugundan test izolasyonu icin `__clearSurfaceTelemetryBuffer` yardimci fonksiyonu gerekiyor. Testler bunu `beforeEach`'te cagiriyor.
4. Backend'de `ui.surface.*` anahtarlari admin Settings sayfasinda goruntulenebilir ama henuz ozel bir "Surfaces" grup/tab eklenmedi. Faz 2'de bir switcher UI gelirken ayni anda gruplanabilir.
5. Kill switch "acik" durumda `legacyLayoutMode === "horizon"` ve kullanici bir surface secmemisse -> resolver `horizon`'u user-pref/role-default yoluyla degil, genellikle ultimate fallback oncesi kendisi secemez (cunku `legacyLayoutMode` sadece kill-switch-off kisa devresinde kullanilir). Faz 2'de "legacy" ve "horizon" arasinda kullanici default'u Settings'den okunacaksa bu bir koprudur.
6. `ui.surface.infrastructure.enabled` true yapilirsa ama hicbir role default/user pref set edilmemisse, resolver hala "legacy"ye duser. Bu **bilinerek** boyledir — Faz 1 infrastructure aktif olsa bile kullanicilar hic bir fark hissetmemelidir.

## 9. Dogrulama Checklist'i

| Gereklilik | Durum |
|---|---|
| classic/legacy ayni aciliyor | OK (resolver kill-switch-off ile legacy dondurur) |
| horizon ayni aciliyor | OK (resolver kill-switch-off + `legacyLayoutMode==="horizon"` ile horizon dondurur) |
| Migration dogru calisiyor | OK (10 test) |
| Gecersiz surface id -> legacy fallback | OK (test: `surfaces-layout-switch.smoke`) |
| Disabled surface aktif olmuyor | OK (resolver testi + smoke) |
| Kill switch false iken eski davranis | OK (smoke test iki default durum) |
| Settings keys admin settings'de gorunuyor | OK (KNOWN_SETTINGS dogrulandi) |
| tsc clean | OK (EXIT=0) |
| vite build clean | OK (EXIT=0) |
| Regression yok | OK (app.smoke.tsx 3 fail pre-existing; kanitlandi) |

## 10. Final Status Report (7 madde)

1. **Tamamlandi mi?** EVET — Faz 1 infrastructure tamamlandi. Yeni varyant UI yazilmadi, ki bu hedeflenen durum.
2. **Legacy/Horizon bozuldu mu?** HAYIR. Kill switch kapali oldugundan resolver classic/horizon davranisini birebir korur. 46 yeni test ve olmayan regresyon bunu dogruluyor.
3. **Kill switch calisiyor mu?** EVET. `ui.surface.infrastructure.enabled` default `False`. Resolver bunu ilk kademe olarak kontrol eder ve kapali iken baska hicbir katmani calistirmaz.
4. **Bridge icin zemin hazir mi?** EVET. Bridge manifest dosyasi (`manifests/bridge.ts`) disabled olarak kayitli, KNOWN_SETTINGS'de `ui.surface.bridge.enabled` var, resolver `enabledSurfaceIds` setini Settings'den okuyor. Faz 2'de sadece `BRIDGE_MANIFEST.status` stable/beta yapilip `register.tsx`'de gercek layout forwarder eklenecek.
5. **Test sonuclari:**
   - Yeni surface testleri: 5 dosya / 46 test PASS
   - TypeScript type-check: PASS (EXIT 0)
   - Vite build: PASS (EXIT 0)
   - Backend KNOWN_SETTINGS dogrulamasi: 6/6 anahtar kayitli
   - Regression: Yok. `app.smoke.test.tsx` 3 failure **pre-existing** (stash ile dogrulandi).
6. **Commit hash:** `2f994bf` — `feat(surfaces): Faz 1 — Surface Registry infrastructure (kill-switch off)` — 25 files changed, 2576 insertions(+), 27 deletions(-).
7. **Push durumu:** BASARILI. `9c2fa95..2f994bf  main -> main` (github.com:huskobro/contenthub.git).
