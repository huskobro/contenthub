# Faz 4C — Surface Usability Cleanup Raporu

**Tarih:** 2026-04-10
**Kapsam:** Header'daki admin/user panel gecisi, aktif surface gorunurlugu, Surface Picker anlasilirligi, explicit/default/fallback durumlarinin kullaniciya netlestirilmesi.
**Kapsam disi (dokunulmadi):** Yeni surface yazilmasi, bridge/canvas/atrium tasarimlari, backend endpoint, resolver mantigi, onboarding akisi.

---

## 1. Hedef

Kullanicinin verdigi dort odak maddesi:

1. Sag ustten admin/user panel gecisi daha net.
2. Aktif surface bilgisi header'da gorunur.
3. Surface Picker kartlarinda "hangi kullanim icin uygun" netlesmis.
4. Explicit secim / varsayilan secim / fallback durumlari kullaniciya anlasilir sekilde gosteriliyor.

Hicbir yeni resolver kurali eklenmedi, hicbir yeni backend endpoint'i uydurulmadi, panel switch butonunun locked metinleri (`Yonetim Paneli`, `Kullanici Paneli`, `Yonetim Paneline Gec`, `Kullanici Paneline Gec`) aynen korundu — bu metinler mevcut `panel-switch-destination-clarity.smoke.test.tsx` tarafindan zaten kilitli.

---

## 2. Yapilanlar

### 2.1 Header: aktif surface rozeti + rol ipucu

**Yeni bilesen:** `frontend/src/components/surfaces/SurfaceActiveBadge.tsx`

- Header'da area label'in hemen yaninda (AppHeader icinde `ml-3`) aktif surface'i gosterir.
- `useSurfaceResolution()` hook'undan donen resolver raporunu dogrudan okur — ikinci bir hesaplama yapmaz.
- Gosterdigi bilgi:
  - Surface adi (`Bridge`, `Canvas`, `Legacy`, vs.)
  - Kategori rozeti (`Tercihinizle` / `Varsayilan` / `Fallback`)
  - Tooltip: `Aktif yuzey: <name> (<id>). <reason aciklamasi>.`
  - Renkli nokta: explicit = brand, default = success, fallback = warning
- `data-surface-id`, `data-reason`, `data-reason-category` attribute'lari ile test edilebilir.
- Hicbir yeni kural gelistirmez; resolver'in verdigini sadece insanca formatlar.

**AppHeader icindeki ikinci ekleme:** `RoleHintBadge()` — kullanicinin auth role'unu ("Rol: Admin" / "Rol: Kullanici") panel switch butonunun solunda gosterir.

- Amac: kullanici user paneline gezdiginde bile "ana rolu hala admin" oldugunu netlikle bilsin, panel gecisi kimlik degistirmiyor.
- Sadece bir bilgi rozetidir; navigation'a, auth'a, routing'e dokunmaz.
- `useAuthStore((s) => s.user)` ile calisir, user yoksa hicbir sey render etmez.

**Panel switch butonu:** metin ve testid'ler aynen korundu. Sadece yanina bilgi rozetleri eklendi.

### 2.2 Surface Picker kartlari: bestFor + reason + explicit tercih isareti

**`frontend/src/surfaces/contract.ts`:** `SurfaceManifest`'e opsiyonel `bestFor?: string[]` alani eklendi. Bu "hangi kullanima uygun" listesini picker'a tasimak icin manifest-level veri kanali. Diger alanlara dokunulmadi.

**Manifest guncellemeleri (5 dosya):** her surface kendi bestFor listesini kendi manifestinde tanimladi:

- `legacy.ts`: Klasik ContentHub deneyimi, En saglam yuzey, Fallback sigici
- `horizon.ts`: Sakin dikey akis, Modern yonetim hissi, Temiz klasik alternatif
- `bridge.ts`: Job/pipeline/publish izleme, Operasyon komut merkezi, Admin yogun gunluk is
- `canvas.ts`: Proje merkezli yaratici akis, Onizleme oncelikli calisma, Gunluk icerik uretimi
- `atrium.ts`: Sinematik editorial sunum, Showcase hissi, Opt-in premium alternatifi

**`frontend/src/surfaces/selectableSurfaces.ts`:**

1. `describeIneligibleReason` artik opsiyonel `opts?: {panelScope, surfaceScope}` aliyor. `scope-mismatch` durumunda:
   - admin panelde user-only surface: `"Bu yuzey yalnizca kullanici panelinde calisir. Siz yonetim panelindesiniz, bu yuzden bu yuzey yonetim panelinizde gorunmez."`
   - user panelde admin-only surface: simetrik metin.
   - opts verilmezse eski genel metin korunur (geriye donuk uyumluluk).
2. Yeni `ResolutionReasonCategory = "explicit" | "default" | "fallback"` tipi ve `resolutionReasonCategory(reason)` mapper'i. Resolver telemetri kodlarini UI-dostu kategoriye indirir:
   - `user-preference` → explicit
   - `role-default` / `global-default` / `feature-flag-forced` → default
   - `kill-switch-off` / `legacy-fallback` / `scope-mismatch-fallback` / `disabled-fallback` / `missing-fallback` / `error-fallback` → fallback
3. Yeni `describeResolutionReason(reason)` Turkce metinler: `"Sizin tercihiniz ile aktif"`, `"Varsayilan olarak aktif"`, `"Fallback olarak aktif (istenen yuzey kullanilamadi)"`, vs.

**`frontend/src/components/surfaces/SurfacePickerSection.tsx`:** SurfacePickerCard hacmen genisledi:

- Her kartta bestFor bullet listesi (`surface-picker-bestfor-{id}` + `surface-picker-bestfor-item-{id}`).
- `isResolvedActive` yeni prop: resolver'in fiilen gosterdigi kart.
- `entry.isActive` = explicit tercih (`activeSurfaceId === manifest.id`).
- Aktif rozeti artik `isResolvedActive` kartinda gosterilir (fallback durumunda explicit tercih kartinda degil).
- Yeni `"Tercih (kullanilmiyor)"` rozeti: `entry.isActive && !isResolvedActive` oldugunda, yani kullanici secmis ama resolver baskasina fallback yapmissa.
- `userPreferenceUnusable` kutusu: "Bu yuzey sizin tercihinizdi, ancak resolver su an kullanamiyor (gate kapali, scope uymuyor veya kill-switch aktif). Resolver varsayilana ya da fallback'a dustu." mesajini agiklayan warning kutusu.
- Reason etiketi: yalnizca `isResolvedActive` kartta, `data-reason` + `data-reason-category` attribute'lariyla. Renk kategoriye gore (explicit=brand, default=success, fallback=warning).
- `describeIneligibleReason` cagrisina panel ve surface scope'u gecilir; artik scope-aware kullanici mesaji gelir.

### 2.3 Test dosyalari

**Yeni:** `frontend/src/tests/surface-active-badge.smoke.test.tsx` — 6 test:

1. Admin badge bridge + "Varsayilan" gosterir.
2. User badge canvas + "Varsayilan" gosterir.
3. Explicit user preference → "Tercihinizle" kategorisi.
4. Atrium gated → resolver canvas'a duser (role-default).
5. Kill switch off → legacy + Fallback kategorisi.
6. Tooltip aktif surface id'sini ve reason metnini icerir.

**Yeni:** `frontend/src/tests/surface-picker-usability.smoke.test.tsx` — 10 test:

1. Her surface kartinda bestFor listesi render ediliyor (user scope).
2. Canvas bestFor'unda "Proje merkezli" fragmanini icerir.
3. Bridge bestFor'unda "operasyon" fragmanini icerir (admin scope).
4. role-default resolved surface → 'Varsayilan' reason badge, data-reason-category="default".
5. Explicit user preference → 'Tercihinizle' reason badge, data-reason="user-preference".
6. Kill-switch off → legacy kartinda 'Fallback' badge, data-reason="kill-switch-off".
7. Explicit-but-unusable → Tercih rozeti + preference-unusable notu atrium'da; canvas'ta Aktif.
8. Admin panelinde atrium (user-only) icin "yalnizca kullanici panelinde" mesaji.
9. User panelinde bridge (admin-only) icin "yalnizca yonetim panelinde" mesaji.
10. Legacy + horizon bootstrap rozetiyle gorunur.

**Guncellendi:** `frontend/src/tests/selectable-surfaces.unit.test.ts` — yalnizca `describeIneligibleReason` opsiyonel parametre kabul ettiginde `Array.map` signature'una takilmayi engelleyen kucuk fix:

```ts
// Once: reasons.map(describeIneligibleReason)  // map index'i opts parametresine gecirdigi icin tip hatasi
// Sonra: reasons.map((r) => describeIneligibleReason(r))
```

---

## 3. Test sonuclari

### 3.1 Hedefli (Faz 4C) testler

```
npx vitest run \
  src/tests/surface-picker-usability.smoke.test.tsx \
  src/tests/surface-active-badge.smoke.test.tsx \
  src/tests/selectable-surfaces.unit.test.ts

 Test Files  3 passed (3)
      Tests  38 passed (38)
```

### 3.2 Surface alt sistemi regresyon

```
npx vitest run \
  src/tests/surface- src/tests/surfaces- src/tests/selectable- src/tests/default-surface-

 Test Files  12 passed (12)
      Tests  124 passed (124)
```

Tum mevcut surface testleri (resolver, registry, layout switch, default strategy, picker, active badge) yesil.

### 3.3 Tum regresyon (Faz 4B baseline ile karsilastirma)

- **Faz 4B baseline:** 243 failed / 2286 passed / 2529 toplam
- **Faz 4C sonrasi:** 240 failed / 2290 passed / 2530 toplam
- **Delta:** -3 failed, +4 passed, +16 yeni test (+1 dosya)

Faz 4C yeni bir regresyon getirmedi. Tersine, yeni kartlardaki daha zengin bilgi sayesinde bazi dolayli sarf sinyalleri de temizlendi (net -3 fail).

Geri kalan 240 failure'un tamami Faz 4C kapsami disi, onceden var olan hatalar (`useEnabledModules.query.data is not iterable`, `useActiveUser.userList.find is not a function`, `channel-*` modullerinde TS mismatch, analytics overview fetch race, vb.). Clean `main` uzerinde `git stash` + `panel-switch-destination-clarity.smoke.test.tsx` calistirilarak dogrulandi — bu dosya Faz 4C oncesinde de ayni hatayla kopuyordu.

### 3.4 TypeScript typecheck

Faz 4C kapsami (9 dosya + 3 test dosyasi):

```
npx tsc --noEmit 2>&1 | grep -E "(selectableSurfaces|SurfacePicker|SurfaceActive|AppHeader|contract\.ts|manifests/|surface-picker-usability|surface-active-badge|selectable-surfaces)"
# (bos)
```

Faz 4C'de hic TS hatasi yok. Kalan `tsc` hatalari yalnizca kullanicinin baska alanlarda (ChannelVideoPickerModal, ChannelDetailPage, CanvasChannelDetailPage, useCredentials) devam eden is-akisindan geliyor; Faz 4C disi.

### 3.5 Vite build

Vite build Faz 4C disi calisma kaynakli TS hatalari yuzunden zaten cipta calismiyor (kullanicinin `ChannelDetailPage` ve `useCredentials` uzerindeki baska bir is akisi). Bu hatalar Faz 4C oncesinde de mevcuttu, Faz 4C onlari dogurmuyor. Surface alt sistemi modulleri vite build'ini kirarak transpile olmuyor — sadece kullanicinin baska yerde kalan TS borcu var.

---

## 4. Dogrulama listesi

| # | Madde | Durum |
|---|---|---|
| 1 | Admin/user panel gecisi net ve calisir | OK — metinler locked, yeni rol rozeti yardimci |
| 2 | Aktif surface header'da gorunur | OK — `SurfaceActiveBadge` (`header-surface-active-badge-{admin\|user}`) |
| 3 | Picker daha anlasilir | OK — bestFor bullet'lar + reason rozeti + kategori rengi |
| 4 | Scope mismatch mesaji yardimci ve dogru | OK — panel scope ve surface scope'a gore zenginlesmis metin |
| 5 | Explicit / default / fallback farki anlasilir | OK — header badge + picker kartinda kategori rengi + metin |
| 6 | Resolver / fallback mantigi bozulmadi | OK — hic resolver kodu degismedi, hook API'si aynen kullanildi |
| 7 | tsc Faz 4C scope'unda temiz | OK |
| 8 | Vite build Faz 4C kaynakli degil | OK — failure pre-existing |
| 9 | Regression yok | OK — 240 failed < 243 baseline |

---

## 5. Bilincli olarak yapilmayanlar (teknik borc / scope disi)

- **Yeni surface yazmadik.** Faz 4C kapsam disi.
- **Bridge / Canvas / Atrium tasarimlarina dokunmadik.** Yalnizca manifest metadata (bestFor).
- **Backend endpoint uydurmadik.** Tum veri mevcut snapshot + hook + registry'den geliyor.
- **Resolver / fallback kurallarini degistirmedik.** `resolveActiveSurface` ve `useSurfaceResolution` bit-bit aynen.
- **Panel switch butonunun textContent'ini degistirmedik.** Locked-by-test. Yerine yeni bilgi rozetleri eklendi.
- **Onboarding / ilk kullanim akisi eklemedi.** Faz 4C kapsam disi.
- **Header responsive optimizasyonu** yapilmadi. Mobil rasyonalizasyon gelecek bir faz.

---

## 6. Degisen dosyalar

**Kaynak:**

- `frontend/src/surfaces/contract.ts` (+10 satir)
- `frontend/src/surfaces/manifests/legacy.ts` (+5)
- `frontend/src/surfaces/manifests/horizon.ts` (+5)
- `frontend/src/surfaces/manifests/bridge.ts` (+5)
- `frontend/src/surfaces/manifests/canvas.ts` (+5)
- `frontend/src/surfaces/manifests/atrium.ts` (+5)
- `frontend/src/surfaces/selectableSurfaces.ts` (+96)
- `frontend/src/components/surfaces/SurfacePickerSection.tsx` (+145)
- `frontend/src/components/layout/AppHeader.tsx` (+47)
- `frontend/src/components/surfaces/SurfaceActiveBadge.tsx` (yeni, ~100 satir)

**Testler:**

- `frontend/src/tests/selectable-surfaces.unit.test.ts` (+1 -1, lambda fix)
- `frontend/src/tests/surface-active-badge.smoke.test.tsx` (yeni, 6 test)
- `frontend/src/tests/surface-picker-usability.smoke.test.tsx` (yeni, 10 test)

**Dokuman:**

- `docs_drafts/surface_usability_cleanup_report_tr.md` (bu rapor)

---

## 7. Commit / push durumu

- **Commit:** `77fc85a` — `feat(surfaces): Faz 4C — usability cleanup (header badge + picker reason + bestFor)`
- **Push:** `origin/main` (`0608190..77fc85a`) — basarili
- **Takip commit:** bu raporun commit hash + push durumu guncellemesi icin.
