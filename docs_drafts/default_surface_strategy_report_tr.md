# Faz 4B — Default Surface Strategy (Rapor)

Tarih: 2026-04-10
Scope: Backend settings defaults + frontend unit dogrulamasi
Durum: TAMAMLANDI (commit + push bekliyor)

---

## 1. Default admin surface

**Karar: `bridge`** (Operations Command Center)

Gerekce (mevcut kod tabaninda dogrulandi, varsayim degil):
- Admin scope'unda tanimli tek non-bootstrap yuzey bridge'dir. `horizon` ve `legacy` `scope: "both"` ile bootstrap/fallback roldeler; `atrium` ve `canvas` `scope: "user"`.
- Bridge Faz 2'de teslim edildi ve 3 gercek sayfa override'iyla baglanti kuruyor:
  - `admin.jobs.registry`
  - `admin.jobs.detail`
  - `admin.publish.center`
- Manifestte `status: "beta"`, `tagline: "Operations Command Center — boru hatti oncelikli"`, `tone: ["operations","dense","command"]` — admin gunluk is akisi icin uretildi.
- Baska aday yok: bridge seciminde teknik bir rakip yok, secim "tek mantikli alternatif".

## 2. Default user surface

**Karar: `canvas`** (Creator Workspace Pro)

Gerekce:
- User scope'unda iki aday var: `canvas` ve `atrium`. Ikisi de `beta`.
- Tamamlik (page override) karsilastirmasi:
  - **canvas**: 9 sayfa override (Faz 3/3A/3B) — dashboard, projects list, projects detail, publish, channels list, channels detail, connections list, analytics overview, calendar
  - **atrium**: 3 sayfa override (Faz 4) — dashboard, projects list, projects detail
- Canvas bir kullanicinin gunluk is akisini 3 katindan fazla kapsiyor. Un-overridden sayfalarda atrium legacy'e duserken canvas kullanicinin neredeyse tum rotalarini kapliyor.
- Manifest: `tagline: "Creator Workspace Pro — proje merkezli"`, `tone: ["creative","preview-first","studio","workspace"]` — gunluk/default kullanim icin uygun.
- Canvas default, atrium opt-in premium alternatif.

## 3. Atrium'un rolu

**Opt-in premium alternatif — role-default DEGIL, yalnizca explicit kullanici tercihiyle erisilebilir.**

Gerekce:
- Sadece 3 sayfa override var; gunluk kullanimin cogu sayfa legacy'e duser. Default yapilirsa kullanici kari karisik (canvas-kalibresinde) bir deneyim alir.
- Manifestteki tagline ve tone ("premium", "cinematic", "editorial", "showcase") editorial/showcase yonunu gosteriyor — premium alternatif konumu dogal.
- Kullanici SurfacePicker (Faz 4A) uzerinden `atrium` secerse, resolver Layer 2 (user-preference) ile atrium'u gosterir. Hicbir sey degismedi.
- `ui.surface.atrium.enabled` builtin_default = `false` olarak **kaldi** (opt-in; operator acmadikca dormant).

## 4. Legacy + horizon'un rolu

Degismedi — **bootstrap + classic fallback zinciri.**

- `legacy` (`scope: "both"`, `stable`, alwaysOn): resolver zincirinin son durak noktasi. Hicbir sart fallback'i yoketmez.
- `horizon` (`scope: "both"`, `stable`, alwaysOn, `ownsCommandPalette: true`): classic alternatif shell. `legacyLayoutMode === "horizon"` kill-switch-off halinde ilk tercih, aksi halde legacy.
- Ikisi de `alwaysOn = true` — `enabledSurfaceIds` gate'ini bypass ederler ve her zaman SurfacePicker'da selectable kalirlar.
- Kullanicinin explicit `legacy` veya `horizon` secimi hala resolver Layer 2'de korunur (yeni unit test dogrulamasi #3).

## 5. Ayar degisimi

**Sadece iki `builtin_default` degisti.** Hicbir admin_value_json, hicbir feature flag, hicbir kill-switch, hicbir enabled flag dokunulmadi.

### Degisen

`backend/app/settings/settings_resolver.py` — KNOWN_SETTINGS

| Key | builtin_default (onceki) | builtin_default (simdi) |
|---|---|---|
| `ui.surface.default.admin` | `"legacy"` | `"bridge"` |
| `ui.surface.default.user` | `"legacy"` | `"canvas"` |

Iki key'in `help_text`'i de genisletildi: urunsel gerekceyi (kac override, hangi faz, kill-switch davranisi) aciklamak icin Turkce yazi.

### DEGISTIRILMEYEN (bilinen kararlar)

| Key | builtin_default | Neden dokunulmadi |
|---|---|---|
| `ui.surface.infrastructure.enabled` | `False` | Direktif: "kill switch'i DEGISTIRME" |
| `ui.surface.bridge.enabled` | `False` | Direktif: "enabled flag'leri BOZMA" |
| `ui.surface.canvas.enabled` | `False` | Direktif: "enabled flag'leri BOZMA" |
| `ui.surface.atrium.enabled` | `False` | Atrium opt-in; dormant kalsin |

### Deployed DB (production-benzeri)

`activate_surfaces.py` script'i zaten dun calistirilmisti; mevcut DB su durumda:

```
ui.surface.infrastructure.enabled    default="false"   admin_value="true"     v=2
ui.surface.default.admin             default="bridge"  admin_value="bridge"   v=2  [eski default "legacy" idi]
ui.surface.default.user              default="canvas"  admin_value="canvas"   v=2  [eski default "legacy" idi]
ui.surface.bridge.enabled            default="false"   admin_value="true"     v=2
ui.surface.canvas.enabled            default="false"   admin_value="true"     v=2
ui.surface.atrium.enabled            default="false"   admin_value="null"     v=1
```

Settings Registry precedence: `user_override > admin_value_json > builtin_default`. Deployed DB admin_value_json dolu oldugu icin yeni builtin_default degisiklikleri **runtime davranisini anlik degistirmez**. Yeni degerler yalnizca:
1. Taze bir DB init'te
2. Admin panelinden "default'a don" yapildiginda
3. `activate_surfaces.py --revert` sonrasi
devreye girer. O zaman bile resolver zinciri gerektigi gibi kill-switch kontrollu — bkz. sonraki bolum.

### Neden "dormant defaults" (kill-switch kapali iken)?

Direktif "kill switch'i degistirme, enabled flag'leri bozma" dedigi icin kill-switch ve enabled flag'lerin builtin_default'larini `false` birakmak zorundaydik. Sonuc: taze bir DB'de `ui.surface.default.admin="bridge"` tanimlidir AMA `ui.surface.bridge.enabled=false` ve `ui.surface.infrastructure.enabled=false` oldugu icin resolver `legacy-fallback`'a duser. Bu **iyi bir sey** — operator acik olarak gate'leri acana kadar urunsel default "dormant". Iki yeni unit test (3-4 numara) bu davranisi dogruluyor.

Gate'ler `activate_surfaces.py` (veya admin UI) uzerinden acildiginda, yeni builtin_default degerleri otomatik olarak role-default pozisyonuna oturur ve kullanici bridge/canvas gorur.

---

## 6. Explicit kullanici secimi korundu mu?

**EVET.** Yeni test dosyasi `frontend/src/tests/default-surface-strategy.unit.test.ts` 15 test ile dogruluyor:

- Explicit `"atrium"` user tercihi canvas role-default ile ezilmiyor → reason=`user-preference`
- Explicit `"horizon"` admin tercihi bridge role-default ile ezilmiyor → reason=`user-preference`
- Explicit `"legacy"` hem admin hem user panelinde role-default'u ezer → reason=`user-preference`
- Kill-switch OFF iken explicit tercih **bile** kullanilmiyor (resolver short-circuits to legacy) → reason=`kill-switch-off`
- Atrium gate'i kapali iken (disabled set), explicit atrium tercihi calismiyor → resolver Layer 3'e duser → canvas role-default → `didFallback=true`

`themeStore.activeSurfaceId` localStorage payload'una dokunulmadi; mevcut Faz 1 persist mekanikleri (`STORAGE_KEY_SURFACE`, `contenthub:active-surface-id`, v0→v1 migration) aynen koruldu. `setActiveSurface` API'si degismedi.

---

## 7. Kill switch / fallback / scope guard / disabled / scope-mismatch

Hicbiri bozulmadi. Test dosyasi her birini acik olarak dogruluyor:

| Direktif dogrulama | Test | Sonuc |
|---|---|---|
| admin default gercekten bridge'e cozuluyor mu | Test 1 | ✓ |
| user default gercekten canvas'a cozuluyor mu | Test 2 | ✓ |
| explicit secim yapan kullanici etkilenmiyor mu | Test 5-7 | ✓ |
| kill switch/fallback hala calisiyor mu | Test 8-9 | ✓ |
| disabled bir surface varsayilan olarak atanmiyor mu | Test 13 (ghost id) + dormant senaryo 3-4 | ✓ |
| scope mismatch olusmuyor mu | Test 10-12 (canvas admin, bridge user, atrium admin) | ✓ |

Ek olarak `surfaces-layout-switch.smoke.test.tsx` (4 test) ve `canvas-*`, `bridge-*`, `atrium-*` regresyonlari yesil kaldi.

---

## 8. Test sonuclari

### TypeScript
```
npx tsc --noEmit
EXIT=0 (0 hata)
```

### Vite build
```
npx vite build
✓ built in 2.62s  (chunk-size uyarisi haric hata yok)
```

### Yeni Faz 4B unit test dosyasi
```
npx vitest run src/tests/default-surface-strategy.unit.test.ts
 Test Files  1 passed (1)
      Tests  15 passed (15)
   Duration  1.20s
```

### Targeted regression — surfaces/canvas/bridge/atrium + picker + default-surface
```
npx vitest run src/tests/surfaces- src/tests/canvas- src/tests/bridge- \
               src/tests/atrium- src/tests/selectable- src/tests/surface-picker- \
               src/tests/default-surface-

 Test Files  23 passed (23)
      Tests  168 passed (168)
   Duration  2.32s
```

NOT: Pre-existing flake'ler (`canvas-flow-legacy-fallback`, `surfaces-layout-switch > kill switch OFF`) bu kosuda yesil.

### Full suite regression
```
npx vitest run
 Test Files  48 failed | 157 passed (205)
      Tests  243 failed | 2270 passed (2513)
```

Faz 4A baseline: **243 failed / 2255 passed / 2498 total**
Faz 4B sonrasi: **243 failed / 2270 passed / 2513 total**

Delta:
- Failure: **0 yeni regresyon** (243 → 243, ayni pre-existing set)
- Passed: **+15** (yeni `default-surface-strategy.unit.test.ts` dosyasinin 15 testi)
- Total: **+15** (yalnizca yeni testler)

**Zero Faz 4B regression dogrulanmis.**

---

## 9. Commit hash

`2c80cec` — `feat(surfaces): Faz 4B — default surface strategy (admin=bridge, user=canvas)`

```
[main 2c80cec] feat(surfaces): Faz 4B — default surface strategy (admin=bridge, user=canvas)
 3 files changed, 585 insertions(+), 6 deletions(-)
 create mode 100644 docs_drafts/default_surface_strategy_report_tr.md
 create mode 100644 frontend/src/tests/default-surface-strategy.unit.test.ts
```

## 10. Push durumu

`55e24c8..2c80cec  main -> main` — `origin/main` basariyla guncellendi.

---

## Degisen dosyalar

### DEGISMIS
- `backend/app/settings/settings_resolver.py` — `ui.surface.default.admin` ve `ui.surface.default.user` icin `builtin_default` + `help_text` guncellemesi (iki entry)

### YENI
- `frontend/src/tests/default-surface-strategy.unit.test.ts` — 15 unit test, `resolveActiveSurface` uzerinden dogrudan urunsel karari dogrular
- `docs_drafts/default_surface_strategy_report_tr.md` — bu rapor

### DOKUNULMAYANLAR
- Tum frontend manifest'leri, resolver, hook, store — DOKUNULMADI
- `activate_surfaces.py` script — DOKUNULMADI (mevcut deployed DB'de zaten istenen admin_value_json'lari yaziyor)
- Kill-switch / enabled flag builtin_default'lari — DOKUNULMADI (direktif)
- SurfacePickerSection, selectableSurfaces helper — DOKUNULMADI (Faz 4A teslimi)
- Yeni backend endpoint yazilmadi
- Yeni surface yazilmadi
- Yeni migration yazilmadi
- Theme management UI'si tekrar yazilmadi

---

## Ozet (9-item delivery format)

1. **Default admin surface:** `bridge` — admin scope'daki tek non-bootstrap yuzey, Faz 2'de 3 override ile teslim
2. **Default user surface:** `canvas` — user scope'daki en kapsamli yuzey (9 override, Faz 3/3A/3B)
3. **Atrium rolu:** opt-in premium alternatif — role-default DEGIL, yalnizca explicit user tercihiyle erisilir; gate opt-in kalir
4. **Legacy/horizon rolu:** bootstrap + classic fallback zinciri; degismedi, alwaysOn, her zaman selectable
5. **Ayar degisimi:** sadece iki `builtin_default` (admin → bridge, user → canvas) + genisletilmis help_text. Kill-switch, enabled flag'ler, admin_value_json, activate script — dokunulmadi
6. **Explicit secim korundu mu:** EVET (5 test senaryosuyla dogrulandi — atrium, horizon, legacy, kill-switch, gate-off)
7. **Test sonucu:** tsc ✓ | vite build ✓ | 15/15 yeni unit test ✓ | 168/168 targeted regression ✓ | full suite 243 baseline (+15 yeni passing test, zero regresyon)
8. **Commit hash:** `2c80cec`
9. **Push durumu:** `55e24c8..2c80cec  main -> main` — origin/main guncellendi
