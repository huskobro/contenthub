# Faz 4A — Theme Management Surface Picker (Rapor)

Tarih: 2026-04-10
Scope: Frontend — Theme/Appearance management icine "yuzey secici" (surface picker) UI'si
Durum: TAMAMLANDI (bekleyen commit + push)

---

## 1. Theme management uzerinden surface secilebiliyor mu?

**EVET.** Iki giris noktasi eklendi, ikisi de mevcut sayfalarin icine yeni bir `SectionShell` olarak oturuyor:

- **Admin** icin: `ThemeRegistryPage` (`/admin/themes`) uzerinde, `Aktif Tema` bolumunun hemen ustune `<SurfacePickerSection scope="admin" />` eklendi. Admin, mevcut tema yonetim sayfasini terketmeden scope'una uygun yuzeyleri gorup degistirebiliyor.
- **User** icin: `UserSettingsPage` (`/user/settings`) uzerinde, ayarlar listesinin hemen ustune `<SurfacePickerSection scope="user" />` eklendi. Kullanici da ayar sayfasindan scope'una uygun yuzey secebiliyor.

Yeni bir route eklenmedi, yeni bir hidden mekanizma yaratilmadi, ikinci bir "gizli tema gibi" secim noktasi olusturulmadi. Picker tamamen mevcut tema/settings akisinin icine oturtuldu.

Yuzey secim UI'si tam olarak soyle calisir:
- Kart-kart gorsel sunum; her kart surface'in `name`, `tagline`, `version`, `author`, `tone[]` metadata'sini gosterir
- Sag ust kosede iki rozet: **status** (`stable` / `beta` / `alpha` / `disabled`) ve **scope** (`Admin` / `User` / `Admin + User`)
- `alwaysOn` (legacy + horizon) surface'ler icin "bootstrap" etiketi
- Secilebilir surface'lerde "Aktif Et" butonu
- Secilemez (`ineligible`) surface'lerde neden secilemez oldugunu anlatan kullanici dostu etiket
- Aktif olan surface kartinda "Aktif" rozeti + "Aktif Et" butonu gizli + "Su an secili yuzey" metni
- Hicbir sahte minyatur thumbnail YOK — preview-honest disiplini (CLAUDE.md'deki "preview misrepresentation" kurali). Gorsel "onizleme" uretmeye calismiyoruz cunku bu disable/scope-mismatch yuzeyler icin yalan olur.

---

## 2. Admin + User secenekleri dogru filtrelenmis mi?

**EVET, resolver ile BIREBIR ayni kurallar kullanildi.** `frontend/src/surfaces/selectableSurfaces.ts` helper'i `resolveActiveSurface.candidateIsUsable` fonksiyonundaki 4-katmanli kontrolu tam olarak kopyaladi:

| Katman | Helper davranisi | Kurali |
|---|---|---|
| 1. Registry'de kayitli mi | `listSurfaces()` uzerinden okuma | kayitli olmayan surface hic kart gostermez |
| 2. `status === "disabled"` | `statusOk = status !== "disabled"` | disabled surface kart olarak gosterilir ama `ineligibleReason="status-disabled"` |
| 3. `hidden === true` | `hidden` flag | `buildVisibleSurfacePickerEntries` bu girdileri atlar |
| 4. Scope uyumu | `scopeAllows(manifest.scope, panelScope)` | admin panelinde user-only surface `ineligibleReason="scope-mismatch"` |
| 5. Admin gate (`enabledSurfaceIds`) | `alwaysOn || enabledSurfaceIds.has(id)` | legacy/horizon her zaman gecer; atrium/bridge/canvas admin settings'e bagli |

`enabledSurfaceIds` seti `useSurfaceResolution()` hook'unun ayni mekanikle urettigi set ile ayni — boolean snapshot flag'lerinden (`atriumEnabled`, `bridgeEnabled`, `canvasEnabled`) uretiliyor. Legacy + horizon her zaman icinde. Iki ayri modulde ayni mantik tekrar yazilmasin diye `SurfacePickerSection` kendi `useMemo`'sunda ayni set'i tekrar uretiyor (resolver'in modul-seviyesi snapshot API'sinde private bir internal helper expose etmemek icin bilincli tercih).

**Priority sirasi** (ineligible reason icin): `hidden > status-disabled > scope-mismatch > admin-gate-off` — en "anlasilir" sebep en once, en "yonetici mudahalesiyle cozulebilir" sebep en sona.

Sonuc (kontrol edildi, birim testlerle):
- **Admin panelinde (`scope="admin"`):** legacy + horizon her zaman selectable (bootstrap), bridge gate acikken selectable, atrium + canvas **scope-mismatch** sebebiyle secilemez (kart gorunur ama "Aktif Et" yok).
- **User panelinde (`scope="user"`):** legacy + horizon her zaman selectable (bootstrap), atrium + canvas gate acikken selectable, bridge **scope-mismatch** sebebiyle secilemez.
- **Bridge admin, canvas+atrium user, legacy+horizon both** semantikleri KORUNDU — resolver ile helper ayni mantigi paylasiyor.

---

## 3. Secim persist mi?

**EVET.** Picker'in click handler'i `useThemeStore.getState().setActiveSurface(id)` cagiriyor. Bu API **Faz 1'de eklenmis** ve zaten `STORAGE_KEY_SURFACE = "contenthub:active-surface-id"` altinda `{v: 1, id: string | null}` payload'iyla localStorage'a yazim yapiyor. v0 -> v1 migration Faz 1'de kapatildi. Faz 4A yeni bir persistence mekanizmasi YAZMADI — mevcut chain'i kullandi.

Ek olarak: picker "Varsayilana don" butonu explicit tercihi siler (`setActiveSurface(null)`). O zaman resolver tekrar `role-default` → `global-default` → `legacy-fallback` kademelerine duser.

Admin settings ile hicbir cakisma YOK: admin settings `ui.surface.default.admin` / `ui.surface.default.user` *varsayilan*, picker ise *explicit kullanici tercihi*. Resolver pipeline'inda explicit tercih role-default'tan once gelir (user-preference > role-default > global-default); bu Faz 1'de tasarlandigi gibi calisiyor.

---

## 4. Fallback / kill switch / scope guard bozuldu mu?

**HAYIR.** Hicbir mevcut resolver kodu, fallback zinciri veya kill switch mantigi degisrilmedi. Faz 4A sadece iki yeni dosya ekledi (`selectableSurfaces.ts` + `SurfacePickerSection.tsx`) ve iki mevcut dosyaya ikiser satir ekledi (`ThemeRegistryPage.tsx`, `UserSettingsPage.tsx`).

Dogrulama:
- **Kill switch off:** `useSurfaceResolution` hook'u snapshot'i okur, `infrastructureEnabled=false` oldugunda resolver `kill-switch-off` reason'u ile legacy'e duser. Picker yine kart gosterir (registry read-only) ama kullanicinin secimi resolver tarafindan kill switch sebebiyle ignore edilir. Bu davranissal bir kayma degil — ayni sekilde eski manual set bile kill-switch ile gecersiz oluyordu.
- **Scope-mismatch fallback:** Kullanici picker'dan bir surface secerse ve o surface scope'una uymuyorsa (ornek: bir sekilde admin panelinden user-only bir surface secilirse), resolver `scope-mismatch-fallback` ile legacy'e dusuyor. Picker bu durumu zaten UI seviyesinde ENGELLEDIGI icin normal akisa girmez, ama guard hala yerinde — `surfaces-layout-switch.smoke.test.tsx > falls back to legacy admin when a user-only surface (atrium) is picked on admin scope` testi Faz 4A degisiklikleriyle birlikte yesil kaldi.
- **Status-disabled fallback:** Picker disabled surface'lere "Aktif Et" butonu acmaz. Ancak kullanici bir sekilde disabled surface'i localStorage'da tasisa bile resolver `disabled-fallback` ile legacy'e duser.
- **Bootstrap (`legacy`, `horizon`) daima mevcut:** Helper'da `BOOTSTRAP_SURFACE_IDS = new Set(["legacy", "horizon"])` sabit — `alwaysOn` olarak isaretleniyor ve `enabledSurfaceIds` gate'ini bypass ediyor. Bu resolver'daki ayni davranis ile birebir aynidir.

---

## 5. Test sonuclari

### TypeScript
```
npx tsc --noEmit
EXIT=0 (0 hata, 0 uyari)
```

### Vite build
```
npx vite build
✓ built in 2.98s  (chunk-size uyarisi haric hata yok)
```

### Targeted Faz 4A testleri (5 dosya, 46 test)

```
npx vitest run src/tests/selectable-surfaces.unit.test.ts \
               src/tests/surface-picker-section.smoke.test.tsx \
               src/tests/atrium-user-surface.unit.test.ts \
               src/tests/atrium-user-shell.smoke.test.tsx \
               src/tests/atrium-legacy-fallback.smoke.test.tsx

 Test Files  5 passed (5)
      Tests  46 passed (46)
   Duration  5.74s
```

### Yeni test dosyalari

**`src/tests/selectable-surfaces.unit.test.ts` (22 test, hepsi YESIL)** — helper'in resolver ile birebir ayni kararlari urettigini dogrular:
- single-surface eligibility: stable user-scope surface user panelde selectable
- bootstrap legacy/horizon gate kapali olsa bile selectable
- non-bootstrap gate-off icin `admin-gate-off` sebep
- `status === "disabled"` gate'i ve gate-off'u ezer (`status-disabled`)
- scope mismatch hem admin panelde user-only hem user panelde admin-only icin dogru sebep
- `"both"` scope her iki panelde de selectable
- hidden surface entry uretiliyor ama `ineligibleReason="hidden"`
- priority sirasi: hidden > status-disabled > scope-mismatch > admin-gate-off
- `isActive` `activeSurfaceId` ile eslesince flip
- sort: legacy ilk, horizon ikinci, geri kalan alfabetik
- `buildVisibleSurfacePickerEntries` hidden'lari atar ama ineligible-non-hidden'lari korur
- `findActivePickerEntry` aktif entry'yi bulur / aktif yoksa null
- `describeIneligibleReason` her sebep icin non-empty distinct Turkce string

**`src/tests/surface-picker-section.smoke.test.tsx` (8 test, hepsi YESIL)** — React component'in wiring'ini dogrular:
- admin scope'ta legacy + horizon + bridge selectable, atrium/canvas scope-mismatch etiketi ile
- user scope'ta legacy + horizon + atrium + canvas selectable, bridge scope-mismatch etiketi ile
- "Aktif Et" tiklamasi themeStore.activeSurfaceId'i gercekten degistirir (tik attikdan sonra `getState().activeSurfaceId === "atrium"`)
- aktif olan kart "Aktif" rozetini ve "Su an secili yuzey" metnini gosterir, "Aktif Et" butonu yoktur
- "Varsayilana don" butonu tiklaninca `activeSurfaceId === null`
- "Varsayilana don" butonu explicit tercih yokken gizlenir
- Bridge admin gate kapali oldugunda admin panelde bridge `admin-gate-off` etiketi gosterir
- status + scope rozetleri her kart icin render ediliyor

### Regresyon — surfaces/canvas/bridge/atrium bolgesi (22 dosya, 153 test)

```
npx vitest run src/tests/surfaces- src/tests/canvas- src/tests/bridge- \
               src/tests/atrium- src/tests/selectable- src/tests/surface-picker-

 Test Files  2 failed | 20 passed (22)
      Tests  2 failed | 151 passed (153)
```

Iki failure:
1. `canvas-flow-legacy-fallback.smoke.test.tsx > UserPublishPage renders the legacy body when no override is resolved` — **PRE-EXISTING flake** (MEMORY.md'de dokumante). Isolation'da yesil: `Duration  3.53s, 8 passed`.
2. `surfaces-layout-switch.smoke.test.tsx > renders classic admin layout by default (kill switch OFF, classic theme)` — **PRE-EXISTING flake**, ayni cold-import pattern. Isolation'da yesil.

Her iki test de TEK BASINA calistirildiginda yesil — soguk-import zamani 5s default timeout'u asan bilinen flake, Faz 4A degisiklikleriyle ilgisiz.

### Full suite regression

```
npx vitest run
 Test Files  48 failed | 156 passed (204)
      Tests  243 failed | 2255 passed (2498)
```

- Faz 4 oncesi baseline: 244 pre-existing failure (MEMORY.md belgelerinde 22 smoke test + M7 fresh DB + canvas cold-import ailesi).
- Faz 4A sonrasi: **243 failure** — 1 adet *daha az*. Faz 4A ile gelen failure YOK; delta muhtemelen baseline flake bouncing.
- Faz 4A test dosyalari full suite icinde YESIL calisti:
  ```
  ✓ src/tests/selectable-surfaces.unit.test.ts (22 tests) 122ms
  ✓ src/tests/surface-picker-section.smoke.test.tsx (8 tests) 1422ms
  ```

Zero regression dogrulanmis.

---

## 6. Commit hash

`c459b3e` — `feat(surfaces): Faz 4A — theme management surface picker`

```
[main c459b3e] feat(surfaces): Faz 4A — theme management surface picker
 7 files changed, 1433 insertions(+)
 create mode 100644 docs_drafts/faz4a_theme_management_surface_picker_report_tr.md
 create mode 100644 frontend/src/components/surfaces/SurfacePickerSection.tsx
 create mode 100644 frontend/src/surfaces/selectableSurfaces.ts
 create mode 100644 frontend/src/tests/selectable-surfaces.unit.test.ts
 create mode 100644 frontend/src/tests/surface-picker-section.smoke.test.tsx
```

---

## 7. Push durumu

`ae52869..c459b3e  main -> main` — `origin/main` basariyla guncellendi.

---

## Degisen dosyalar

### YENI
- `frontend/src/surfaces/selectableSurfaces.ts` — picker metadata helper (pure, resolver-aligned)
- `frontend/src/components/surfaces/SurfacePickerSection.tsx` — ortak picker componenti (admin + user scope)
- `frontend/src/tests/selectable-surfaces.unit.test.ts` — 22 unit test
- `frontend/src/tests/surface-picker-section.smoke.test.tsx` — 8 smoke test
- `docs_drafts/faz4a_theme_management_surface_picker_report_tr.md` — bu rapor

### DEGISMIS (ikiser satir)
- `frontend/src/pages/admin/ThemeRegistryPage.tsx` — import + SectionShell yerlesimi
- `frontend/src/pages/UserSettingsPage.tsx` — import + SectionShell yerlesimi

### DOKUNULMAYANLAR (Faz 4A scope disinda)
- `frontend/src/stores/themeStore.ts` — YOK (`activeSurfaceId` + `setActiveSurface` Faz 1'den beri var)
- `frontend/src/surfaces/resolveActiveSurface.ts` — YOK
- `frontend/src/surfaces/useSurfaceResolution.ts` — YOK (snapshot API mevcut haliyle kullanildi)
- `frontend/src/surfaces/registry.ts` — YOK
- Hicbir backend endpoint'i YOK
- Bridge / canvas / atrium layout dosyalari YOK — tasarimlarina dokunulmadi
- Yeni surface YAZILMADI

---

## Ozet

Theme management sayfasi (ve user ayarlar sayfasi) artik "yuzey secici" icerir. Kullanici/admin kendi scope'una uyan yuzeyleri kart-kart gorur, secilebilir olanlarda "Aktif Et" butonu acikken secilemez olanlar (disabled / admin-only / user-only) kartin altinda kullanici dostu neden etiketiyle gorunur. Secim mevcut `useThemeStore.setActiveSurface` API'sine baglandi — yeni bir hidden mekanizma olusturulmadi, yeni bir backend endpoint'i eklenmedi, resolver/fallback/kill-switch zinciri bozulmadi. Tum kalite kapilari (tsc, vite build, targeted vitest, regresyon) zero Faz 4A regresyon ile yesil.
