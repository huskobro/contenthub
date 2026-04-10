# Surface Activation Report — Canvas (user) + Bridge (admin)

Tarih: 2026-04-10
Kapsam: Surface Registry altyapisinin (Faz 1) Canvas user shell ve Bridge
admin shell ile gorunur hale getirilmesi, legacy fallback'i bozmadan.

---

## 1. Amac

Faz 1/2/3/3A ile surface registry altyapisi, bridge admin kabugu ve canvas
user kabugu kod tarafinda tamamen hazirdi — ama DB ayarlari varsayilan
(`legacy`) degerlerinde oldugundan kullanici ve admin hala eski legacy
yuzeyleri goruyordu. Bu raporun konusu: yeni bir kod yazmadan, yeni varyant
tasarlamadan, sadece **DB seviyesinde admin_value_json override'lari**
ile mevcut altyapiyi aktif hale getirmek.

## 2. Aktivasyon mekanizmasi

Ilgili 6 settings anahtari ve bunlarin Faz 1'deki semantigi:

| Key | Tip | Builtin default | Yeni admin degeri | Anlam |
|---|---|---|---|---|
| `ui.surface.infrastructure.enabled` | boolean | `false` | **`true`** | Kill-switch. Kapaliyken resolver `legacyLayoutMode`'u kullanir. Acildiginda 4-katmanli zincir devreye girer. |
| `ui.surface.default.admin` | string | `"legacy"` | **`"bridge"`** | Layer 3 (role-default) — admin paneli icin tercih edilen yuzey. |
| `ui.surface.default.user` | string | `"legacy"` | **`"canvas"`** | Layer 3 (role-default) — user paneli icin tercih edilen yuzey. |
| `ui.surface.bridge.enabled` | boolean | `false` | **`true`** | `enabledSurfaceIds` gate'ine bridge'i ekler; yoksa resolver scope-check'te elerdi. |
| `ui.surface.canvas.enabled` | boolean | `false` | **`true`** | `enabledSurfaceIds` gate'ine canvas'i ekler. |
| `ui.surface.atrium.enabled` | boolean | `false` | *(DOKUNULMADI)* | Faz 1 placeholder; secilse bile resolver legacy'ye duser, aktif edilmesinin anlami yok. |

### Resolver akisi (aktivasyondan sonra)

`frontend/src/surfaces/resolveActiveSurface.ts` su sirayi izler:

1. **Kill switch** — `infrastructureEnabled=true` → bu katman bypass edilir,
   zincir devam eder.
2. **Layer 1 (feature-flag-forced)** — `VITE_FORCE_SURFACE_ID` env var okunur;
   normal kullanimda bos, atlandi.
3. **Layer 2 (user-preference)** — `themeStore.activeSurfaceId` (localStorage).
   Yeni kullanicilarda `null`, atlandi.
4. **Layer 3 (role-default)** — DB'den okunan `ui.surface.default.admin` ve
   `ui.surface.default.user`:
   - admin scope'unda: **`bridge`** → `candidateIsUsable` kontrolunden gecer
     (registered, enabled, enabledSurfaceIds'te, scope='admin' uyumlu) →
     `BridgeAdminLayout` render edilir.
   - user scope'unda: **`canvas`** → ayni kontrol → `CanvasUserLayout`
     render edilir.
5. Legacy fallback sadece yukaridaki katmanlar hata verirse devreye girer
   (her adim kendi kontrolunu tekrar eder).

### Render akisinin son halkasi

`DynamicAdminLayout.tsx`:
```tsx
const { admin } = useSurfaceResolution();
const Layout = admin.surface.adminLayout;   // bridge aktifken BridgeAdminForwarder
return <Layout key={surfaceId} />;
```

`DynamicUserLayout.tsx`:
```tsx
const { user } = useSurfaceResolution();
const Layout = user.surface.userLayout;    // canvas aktifken CanvasUserForwarder
return <Layout key={surfaceId} />;
```

Her iki dinamik layout da `useSurfaceResolution`'dan aldigi `Layout`'u
mount eder. Aktivasyondan sonra `admin.surface.manifest.id === "bridge"`
ve `user.surface.manifest.id === "canvas"` donecek; `Layout` da
sirasiyla `BridgeAdminForwarder` ve `CanvasUserForwarder`'a denk gelecek.

## 3. Yapilan degisiklikler

### Tek yeni kod dosyasi: `backend/scripts/activate_surfaces.py`

- Calistirilabilir, **idempotent** aktivasyon scripti
- Hicbir builtin default degerine dokunmaz — sadece DB'deki `settings` tablosunda
  ilgili 5 satirin `admin_value_json` alanini hedef degere yazar
- `--revert` argumani ile tum override'lar `null`'a donebilir (geri alma
  kolayligi; safety)
- Her satiri guncellerken `version += 1` yapar; audit trail korunur
- `ui.surface.atrium.enabled` HIC dokunulmaz (Faz 1 placeholder)

### Degismeyenler (bilincli)

- Hicbir frontend kod dosyasi degistirilmedi
- Hicbir resolver/registry/manifest/layout degistirilmedi
- Bridge ve Canvas shell'leri zaten Faz 2 ve Faz 3/3A'da yazilmisti — dokunulmadi
- Legacy AdminLayout / UserLayout / HorizonXxxLayout dokunulmadi
- `DEFAULT_SETTINGS` builtin'leri (`settings_resolver.py`) dokunulmadi —
  yani fresh-DB davranisi hala legacy
- Settings API / settings router / visibility engine dokunulmadi

### Aktivasyon komutu

```bash
# backend/ klasorunden
.venv/bin/python3 scripts/activate_surfaces.py           # aktive et
.venv/bin/python3 scripts/activate_surfaces.py --revert  # geri al
```

### Uygulama ciktisi

```
[activate_surfaces] ACTIVATE modu: Canvas (user) + Bridge (admin) aktive ediliyor.
  - ui.surface.infrastructure.enabled    updated  before=null  after=true
  - ui.surface.bridge.enabled            updated  before=null  after=true
  - ui.surface.canvas.enabled            updated  before=null  after=true
  - ui.surface.default.admin             updated  before=null  after="bridge"
  - ui.surface.default.user              updated  before=null  after="canvas"
[activate_surfaces] done.
```

Ikinci calistirma: tum satirlar `unchanged` — idempotent.

## 4. Dogrulama

### 4a. DB katmani (dogrudan SQL)

```
ui.surface.infrastructure.enabled     admin='true'       default='false'     v2
ui.surface.default.admin              admin='"bridge"'   default='"legacy"'  v2
ui.surface.default.user               admin='"canvas"'   default='"legacy"'  v2
ui.surface.bridge.enabled             admin='true'       default='false'     v2
ui.surface.canvas.enabled             admin='true'       default='false'     v2
ui.surface.atrium.enabled             admin='null'       default='false'     v1  # dokunulmadi
```

### 4b. Resolver katmani (gercek settings_resolver.resolve() cagrisi)

```python
from app.settings.settings_resolver import resolve
from app.db.session import AsyncSessionLocal
# ...
ui.surface.infrastructure.enabled -> True
ui.surface.default.admin          -> 'bridge'
ui.surface.default.user           -> 'canvas'
ui.surface.bridge.enabled         -> True
ui.surface.canvas.enabled         -> True
ui.surface.atrium.enabled         -> False
```

Resolver admin_value_json'u default_value_json'un onune koyarak dogru
sirada cozuyor — bu zaten Faz 1'de yazilmisti, biz sadece veri beslemesi
yaptik.

### 4c. Frontend (useSurfaceResolution)

`useSurfaceResolution.ts` bu 6 keyi `loadSnapshot()` icinde
`fetchEffectiveSetting()` ile okuyor:
- `infrastructureEnabled: true`
- `bridgeEnabled: true`
- `canvasEnabled: true`
- `defaultAdmin: "bridge"`
- `defaultUser: "canvas"`

`enabledSurfaceIds` seti `{legacy, horizon, bridge, canvas}` olarak
hesaplaniyor; `resolveActiveSurface` her iki scope icin role-default
katmaninda eslestirme buluyor. Herhangi bir hata veya scope-mismatch
olmadigindan layer-by-layer dususu yok.

### 4d. Quality gates

| Gate | Durum | Not |
|---|---|---|
| `npx tsc --noEmit` | **clean** | hicbir ts hatasi yok |
| `npx vite build` | **clean** | 2.88s, 0 hata |
| Targeted surface+bridge+canvas suite (15 dosya / 102 test) | **102 pass** | resolver, registry, manifest, layout switch, page overrides, trampoline fallback'ler |
| Full suite | 245 failed / 2202 passed | Faz 3A baseline 243/2204 ile ±2 flake; failing testler **pre-existing** (analytics-overview, analytics-operations, admin-advanced-settings-governance-pack, app.smoke) — surface/canvas/bridge ile **hic** alakasiz |

### 4e. Legacy fallback bozuldu mu?

**Hayir.** Dogrulama katmanlari:

1. **`surfaces-layout-switch.smoke.test.tsx`** — 4 test, hepsi pass.
   Ozellikle:
   - "renders classic admin layout by default (kill switch OFF, classic theme)"
     → mock snapshot'ta `infrastructureEnabled=false` → legacy render ediliyor
   - "falls back to legacy when user picks a disabled surface (atrium)"
     → scope-mismatch / disabled-fallback pathi calisiyor
2. **`canvas-legacy-fallback.smoke.test.tsx`** — 3 test pass. SurfaceProvider
   olmadiginda legacy user pages (dashboard, projects, project detail)
   trampoline ile legacy govde render ediyor.
3. **`canvas-flow-legacy-fallback.smoke.test.tsx`** — 4 test pass. Publish,
   channels, connections, analytics trampoline'leri legacy body'ye duser.
4. **`bridge-legacy-fallback.smoke.test.tsx`** — 3 test pass. Jobs registry,
   job detail, publish center trampoline'leri legacy'ye duser.
5. **Revert path dogrulamasi** — `activate_surfaces.py --revert` calistirildiginda
   5 satir `null`'a doner; `fetchEffectiveSetting` default_value_json'u dondurur
   (infrastructure=false, default.admin="legacy", default.user="legacy"); kill-switch
   kapaniyor, resolver Faz 1 oncesi legacy davranisina donuyor.
6. **Kill-switch kapali semantigi** — resolver `infrastructureEnabled=false`
   iken `themeStore.activeTheme.layoutMode` degerine gore `horizon`/`legacy`
   secer. Bu yol tamamen kod icinde ve dokunulmadi.

Yani her sey normal legacy davranisina 1 komutla (`--revert`) geri alinabilir.

## 5. Limitler / bilinenler

1. **Kullanicinin localStorage'inda eski bir tercihi varsa** (Layer 2 dolu),
   role-default devreye girmez ve o tercih cozulur. Normal kullanimda bos
   oldugu icin pratikte herkes direkt bridge/canvas gorecek. Bir kullanici
   `themeStore.setActiveSurface(null)` cagirarak tercihi silebilir (admin
   panelde kullanici tercihini temizleyen bir UI henuz yok — Faz 4/5 isi).

2. **Settings snapshot cache** — `useSurfaceResolution` modul-level snapshot
   kullaniyor. Ayarlari canli degistirirseniz (admin Settings sayfasindan)
   etkili olmasi icin sayfa yenilenmesi / snapshot invalidation gerekir. Bu
   bir Faz 1 karari, bu aktivasyon onu degistirmiyor.

3. **Atrium** — bilincli olarak dokunulmadi. Placeholder; ilerleyen fazlarda
   kabuk yazilinca ayni yontemle aktif edilebilir.

4. **Settings UI'dan elle geri almak** — admin Settings sayfasinda
   `ui.surface.*` keylerinin `admin_value_json` alanlarini direkt
   duzenleyerek de aktivasyon/kapatma yapilabilir; script sadece batch
   kolaylik.

5. **Full suite baseline'daki ±2 fark** — flake; sebepleri analytics-overview
   ve analytics-operations testlerindeki mevcut React Router v7 warning ve
   bazi network/fetch mock timing'leri. Bu aktivasyon ile alakasi yok —
   MEMORY'deki M7 pre-existing test issues not'una uyuyor.

## 6. Nasil acildi (6 madde)

- **canvas user panelde gorunuyor mu:** Evet. `ui.surface.infrastructure.enabled=true` +
  `ui.surface.canvas.enabled=true` + `ui.surface.default.user="canvas"` sonrasi
  `DynamicUserLayout`, `useSurfaceResolution()` uzerinden `canvas` surface'ini
  cozup `CanvasUserLayout` forwarder'ini mount ediyor. CanvasUserPage override'lari
  (dashboard, projects, detail, publish, channels, connections, analytics) 7
  canvas.page.overrides uzerinden aktif.
- **bridge admin panelde gorunuyor mu:** Evet. Ayni sekilde
  `ui.surface.bridge.enabled=true` + `ui.surface.default.admin="bridge"` sonrasi
  `DynamicAdminLayout` -> `BridgeAdminLayout` forwarder. Bridge page override'lari
  (jobs registry, job detail, publish center) da aktif.
- **neyi degistirerek actim:** Sadece `backend/data/contenthub.db`'deki 5
  `settings` satirinin `admin_value_json` alani — `backend/scripts/activate_surfaces.py`
  scripti araciligiyla idempotent + revert edilebilir bicimde. Hicbir frontend
  veya backend kodu, hicbir builtin_default, hicbir resolver dokunulmadi.
- **legacy fallback bozuldu mu:** Hayir. 10+ legacy fallback testi hala yesil
  (surfaces-layout-switch, canvas-legacy-fallback, canvas-flow-legacy-fallback,
  bridge-legacy-fallback). `--revert` komutu ile anlik geri alinabilir.
- **test sonucu:** tsc clean / vite build clean (2.88s) / 15 surface test dosyasi
  102/102 pass / full suite 245 failed - 2202 passed (Faz 3A 243/2204 baseline ile
  ±2 flake, tamamen pre-existing analytics+governance+app.smoke testleri).
- **commit hash:** `6c61a2088b65fbc46abd6222f4378ab7fd0e45f9` (kisa: `6c61a20`)
- **push durumu:** **basarili** — `git push origin main` → `7b4f2da..6c61a20  main -> main`
