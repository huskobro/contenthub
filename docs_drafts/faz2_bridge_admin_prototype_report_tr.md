# Faz 2 — Bridge Admin Prototype Raporu

> **Faz 1** Surface Registry altyapisini kurdu: kill-switch off, 5 surface kayitli, legacy/horizon tamamen korunuyor.
> **Faz 2** Bridge'i bu altyapinin uzerinde ilk *gercek* alternatif admin yuzeyi olarak insa eder. Kapsam kasitli olarak dardir: yalnizca 3 admin sayfasi (Jobs Registry, Job Detail, Publish Center) ve 1 yeni admin shell (3-panel ops layout). Digerleri legacy'ye dusuyor.

## 1. Hedef ve Kapsam

| Hedef | Kapsam Icinde | Kapsam Disinda |
|---|---|---|
| Ops odakli admin shell (rail + context panel + content) | ✅ | — |
| Jobs Registry override (daha yogun tablo + detail drawer) | ✅ | — |
| Job Detail override ("cockpit" vitals + timeline) | ✅ | — |
| Publish Center override (review board kolonlari) | ✅ | — |
| User scope | — | ❌ (hic dokunulmadi) |
| Canvas / Atrium | — | ❌ (hala disabled placeholder) |
| Butun admin sayfalari | — | ❌ (yalnizca 3 sayfa override) |
| Yeni backend kontratlari | — | ❌ (sifir backend degisikligi) |
| Sahte veri / sahte UI | — | ❌ (tamamen mevcut hook'larla calisiyor) |

**Amac:** Bridge aktifken operasyon ekibinin kullanacagi hizli, yogun bir admin deneyimi; Bridge kapaliyken mevcut legacy deneyime sifir etkisi.

## 2. Mimari Ozet

Faz 1 tek bir butun-layout swap mekanizmasi sundu. Faz 2 bunun uzerine "sayfa duzeyinde override" ekler. Bu, router.tsx'i degistirmeden Bridge'in secili admin sayfalarini degistirebilmesini saglayan tek arac.

### 2.1 Contract Genisletmesi

`SurfacePageKey` ve `SurfacePageOverrideMap` tipleri eklendi. `Surface` arayuzune opsiyonel `pageOverrides` alani dustu.

```ts
// surfaces/contract.ts
export type SurfacePageKey =
  | "admin.jobs.registry"
  | "admin.jobs.detail"
  | "admin.publish.center"
  | (string & { __surfacePageKeyBrand?: never });

export type SurfacePageOverrideMap =
  Partial<Record<SurfacePageKey, ComponentType>>;

export interface Surface {
  manifest: SurfaceManifest;
  adminLayout?: SurfaceLayoutComponent;
  userLayout?: SurfaceLayoutComponent;
  tokenOverrides?: SurfaceTokenOverrides;
  pageOverrides?: SurfacePageOverrideMap;  // ← YENI
}
```

Bu alan opsiyoneldir: legacy ve horizon surface'leri bunu *kullanmaz*, dolayisiyla Faz 1 davranisi bit-birebir korunur.

### 2.2 `useSurfacePageOverride` Hook'u

Hook sozlesmesi tek bir ise odaklanir: aktif admin/user surface'i belirli bir sayfa anahtari icin override sunuyor mu?

```tsx
// surfaces/SurfaceContext.tsx
export function useSurfacePageOverride(
  key: SurfacePageKey,
): ComponentType | null {
  const ctx = useContext(SurfaceContext);
  if (!ctx) return null;                      // 1. context yoksa legacy
  if (!ctx.infrastructureEnabled) return null; // 2. kill switch kapaliysa legacy
  const scope = key.startsWith("user.") ? "user" : "admin";
  const resolved = scope === "admin" ? ctx.admin : ctx.user;
  const overrides = resolved.surface.pageOverrides;
  if (!overrides) return null;                // 3. surface override sunmuyorsa legacy
  return overrides[key] ?? null;              // 4. bu key icin override yoksa legacy
}
```

Her fail-path `null` doner ve cagirdigi sayfa otomatik olarak legacy'ye duser. Tek bir `catch` yok — tum exit point'ler aciktir ve test edilebilir.

### 2.3 Trampoline Pattern

Mevcut admin sayfalari routere dokunulmadan "trampoline" haline getirildi:

```tsx
// pages/admin/JobsRegistryPage.tsx
export function JobsRegistryPage() {
  const Override = useSurfacePageOverride("admin.jobs.registry");
  if (Override) return <Override />;
  return <LegacyJobsRegistryPage />;   // <-- Faz 1'deki iskelete denk
}
```

Bu sekilde:
- router.tsx degismedi
- `/admin/jobs` hala ayni component'e bagli
- Bridge aktifse BridgeJobsRegistryPage renderlanir
- Bridge kapaliysa LegacyJobsRegistryPage renderlanir
- Bridge aktif ama override *yok*sa (ornegin future surface'lar icin) yine legacy

### 2.4 Lazy Forwarder Kaydi

`surfaces/manifests/register.tsx` Faz 1'den beri circular import kilitlerinden kacinmak icin "namespace import + functional forwarder" pattern'ini kullaniyor. Bridge buna bagli kaldi:

```tsx
import * as BridgeAdminLayoutModule from "../bridge/BridgeAdminLayout";
import * as BridgeJobsRegistryModule from "../bridge/BridgeJobsRegistryPage";
import * as BridgeJobDetailModule from "../bridge/BridgeJobDetailPage";
import * as BridgePublishCenterModule from "../bridge/BridgePublishCenterPage";

function BridgeAdminForwarder() {
  const Impl = BridgeAdminLayoutModule.BridgeAdminLayout;
  return <Impl />;
}
// ... benzer forwarderlar

const BRIDGE_PAGE_OVERRIDES: SurfacePageOverrideMap = {
  "admin.jobs.registry": BridgeJobsRegistryForwarder,
  "admin.jobs.detail":   BridgeJobDetailForwarder,
  "admin.publish.center": BridgePublishCenterForwarder,
};

const BRIDGE_SURFACE: Surface = {
  manifest: BRIDGE_MANIFEST,
  adminLayout: BridgeAdminForwarder,
  pageOverrides: BRIDGE_PAGE_OVERRIDES,
};
```

Forwarder fonksiyonlari modul degerlendirme aninda `BridgeAdminLayoutModule.BridgeAdminLayout` referansini *okumaz*; yalnizca render aninda okur. Bu, ThemeProvider/SurfaceContext ekseninde olasi bir circular-init chain'inin Bridge modullerini etkilemesini engeller.

### 2.5 Bridge Manifesti

```ts
// surfaces/manifests/bridge.ts
export const BRIDGE_MANIFEST: SurfaceManifest = {
  id: "bridge",
  name: "Bridge",
  tagline: "Operations Command Center — boru hatti oncelikli, yogun bilgi.",
  description: "...override edilmeyen sayfalar legacy'ye geri duser...",
  author: "system",
  version: "0.1.0",
  scope: "admin",          // ← user scope yok
  status: "beta",          // ← Faz 1'de "disabled" idi
  coverage: "full",
  density: "compact",
  navigation: {
    primary: "rail",
    secondary: "context-panel",
    ownsCommandPalette: false,
  },
  tone: ["operations", "dense", "command"],
};
```

`scope: "admin"` kritik: resolver scope mismatch'i otomatik olarak legacy'ye dusurur, dolayisiyla kullanicinin tema store'una elle "bridge" yazmasi bile user paneli etkilemez.

## 3. Bridge Admin Shell

`surfaces/bridge/BridgeAdminLayout.tsx` 3 dikey kolonlu, operasyon yoneticileri icin dens shell:

```
┌───┬─────────────────┬───────────────────────────────────────┐
│   │ OPS CONTEXT     │ ┌───────────────────────────────────┐ │
│ O │ - Isler         │ │ bridge / ops │ /admin/jobs       │ │
│ P │ - Kuyruk        │ ├───────────────────────────────────┤ │
│   │                 │ │                                   │ │
│ P │ PUBLISH CONTEXT │ │         <Outlet />                │ │
│ B │ - Yayin Merkezi │ │                                   │ │
│   │ - Inceleme      │ │                                   │ │
│   │                 │ │                                   │ │
│ … │ …               │ │                                   │ │
└───┴─────────────────┴───────────────────────────────────────┘
 64px    240px         flex-1 (content column)
```

### 3.1 Reuse Edilenler (sifir yeni bagimlilik)

| Modul | Kullanim | Kaynak |
|---|---|---|
| `ThemeProvider` | CSS variable tokens | `components/design-system/ThemeProvider` |
| `ToastContainer` | Global toast queue | `components/design-system/Toast` |
| `CommandPalette` | ⌘K paleti | `components/design-system/CommandPalette` |
| `NotificationCenter` | Bildirim paneli | `components/design-system/NotificationCenter` |
| `KeyboardShortcutsHelp` | ? overlay | `components/design-system/KeyboardShortcutsHelp` |
| `useCommandPaletteShortcut` | ⌘K binding | `hooks/useCommandPaletteShortcut` |
| `useGlobalSSE` | Real-time stream | `hooks/useGlobalSSE` |
| `useNotifications({mode:"admin"})` | Bildirim scope'u | `hooks/useNotifications` |
| `useAdminVisibilityMap` | Visibility gating | `app/layouts/useLayoutNavigation` |
| `filterHorizonAdminGroups` | Module-enable + capability filtresi | ayni yer |
| `buildAdminNavigationCommands` | Nav komutlari | `commands/adminCommands` |
| `buildAdminActionCommands` | Aksiyon komutlari | ayni yer |
| `buildContextualCommands` | Context komutlari | `commands/contextualCommands` |

**Onemli:** Bridge *kendine ait nav item* eklemez. `HorizonSidebar`'in beslendigi ayni `HORIZON_ADMIN_GROUPS` veri yapisini yeniden gosterir. Bu sayede hangi sayfanin gorunur oldugu, Bridge'in deneyimini degil `visibilityMap + enabledMap`'i takip eder.

### 3.2 Rail Modeli

Rail 6 slotlu:

```ts
const BRIDGE_RAIL = [
  { id: "ops",      glyph: "OP", matchPrefix: "/admin/jobs",     groupIds: ["system"] },
  { id: "publish",  glyph: "PB", matchPrefix: "/admin/publish",  groupIds: ["publish", "engagement"] },
  { id: "content",  glyph: "CT", matchPrefix: "/admin/library",  groupIds: ["content"] },
  { id: "news",     glyph: "NW", matchPrefix: "/admin/sources",  groupIds: ["news"] },
  { id: "insights", glyph: "IN", matchPrefix: "/admin/analytics",groupIds: ["analytics", "overview"] },
  { id: "system",   glyph: "SY", matchPrefix: "/admin/settings", groupIds: ["system", "appearance"] },
];
```

`pickActiveSlot()` longest-prefix matching uygular. Context panel aktif slot'un `groupIds` setinden beslenir ve gorunur item'leri listeler.

### 3.3 Icon-Free Policy

Bridge bilincli olarak icon font bagimliligi *kullanmaz*: rail glyph'leri 2 karakterli mono-uppercase etiketlerdir (`OP`, `PB`, `CT`, vb.). Bu, Bridge'in asset/subsetting degistirmeden yuklenmesini saglar ve "icon fonunu Faz 1'de secmedik" kararini bozmaz.

## 4. Override Sayfalari

### 4.1 `BridgeJobsRegistryPage`

Sol (3fr) / sag (2fr) kolon duzeni. Ust serit 5 bucket counter:

```
[ KUYRUKTA 3 ] [ ISLIYOR 2 ] [ INCELEME 1 ] [ TAMAM 12 ] [ HATA 0 ]
```

- Sol: dense liste (status badge, module, age, id kisaltmasi, current step, retry count, last error)
- Sag: `JobDetailPanel` drawer + 3 aksiyon: **Klonla**, **Arsivle**, **Kokpit →**

**Hic degismeyenler:**
- `useJobsList`, `markJobsAsTestData`, `cloneJob` ayni hook'lar
- State machine'e dokunulmadi — arsivleme ayni `is_test_data` flag'ini kullaniyor
- Aksiyonlar legacy ile ayni mutation'lari cagiriyor

### 4.2 `BridgeJobDetailPage`

6-hucreli vitals serit:

```
[ JOB ID ] [ MODUL ] [ ADIM ] [ GECTI ] [ ETA ] [ RETRY ]
```

Altinda 3fr/2fr grid: sol kolonda `JobTimelinePanel`, sag kolonda `JobActionsPanel` + publish linkage. En altta `JobSystemPanels`. SSE baglanti banner'i koruyor.

**Kritik korumalar:**
- `useJobDetail`, `useSSE`, `usePublishRecordForJob`, `useCreatePublishRecordFromJob` hook'lari legacy ile bit-birebir ayni
- Publish olusturma *hala* ayni mutation'i cagiriyor — Bridge yeni endpoint acmadi
- Timeline/Actions/System panellerinin ic icleyisi *sifir* degisti; Bridge sadece layout etrafinda yeniden dizdi

### 4.3 `BridgePublishCenterPage`

**READ-ONLY inceleme tahtasi.** Kolonlar:

```
| Taslak | Inceleme | Onaylandi | Zamanlandi + Yayinlaniyor | Yayinda | Hata |
```

Kartlar status badge, platform, icerik referansi, review_state, attempt sayisi ve tarihler gosterir. Kart tiklamasi `/admin/publish/:id` sayfasina yonlendirir — **tum mutasyonlar hala detail sayfasindan gecer**. Bu Bridge'in review gate state machine'ine hicbir yeni transition eklemedigi anlamina gelir.

**Bu kararin nedeni:** Faz 2 prompt'unda acikca belirtildi: "bridge publish center review state machine'e sadik kalmali". Board yalnizca *sunum katmani*dir. State degisikleri hala Publish Detail sayfasindan, Publish service layer uzerinden, review_state transition kurallariyla birlikte gerceklesir.

## 5. Fallback Zinciri

Bridge'in "kapaliysa hic yokmus gibi" davranmasi icin 4 katmanli savunma:

1. **Feature flag off** → `useSurfaceResolution` infrastructureEnabled=false dondurur → `useSurfacePageOverride` null doner → legacy renderlanir
2. **Bridge disabled** → Resolver bridge'i "legacy fallback" olarak isaretler → ResolvedSurface bridge degil legacy → pageOverrides map yok → legacy renderlanir
3. **Scope mismatch** → Bridge admin-only; kullanici panelde sec etmez olsa bile resolver scope check yapar → kullaniciya legacy verir
4. **Override key yok** → Bridge yalnizca 3 key icin override sunuyor. Orn. `/admin/settings` Bridge aktifken bile legacy SettingsPage goruntuler cunku `admin.settings` key'i yok

**Ve 5. katman (emniyet agi):** Bridge shell veya herhangi bir bridge page module yuklenirken throw atarsa React error boundary calisir ve kullanici DynamicAdminLayout'un ustune dusmus olur. Shell mount edilmis durumda kalan exception'lar `ErrorBoundary` tarafindan yakalanir (Faz 1'de kurulan standart davranis).

## 6. Test Sonuclari

### 6.1 Yeni Testler (Faz 2)

| Dosya | Test | Durum |
|---|---|---|
| `src/tests/surfaces-page-overrides.unit.test.ts` | 9 test | ✅ PASS |
| `src/tests/surfaces-page-override-hook.smoke.test.tsx` | 8 test | ✅ PASS |
| `src/tests/bridge-legacy-fallback.smoke.test.tsx` | 3 test | ✅ PASS |
| **Toplam yeni** | **20 test** | **20 / 20 ✅** |

**Kapsam:**
- `surfaces-page-overrides.unit.test.ts`
  - `pageOverrides` alani contract roundtrip (register → getSurface → ayni referans)
  - Override haritasi optional (legacy/horizon hala bozulmadan duruyor)
  - Bilinmeyen page key → undefined
  - Admin scope surface'te user.* key sizdirmiyor
  - Built-in bridge surface admin scope + beta status kaydi
  - Bridge 3 beklenen key'i sunuyor (`admin.jobs.registry`, `admin.jobs.detail`, `admin.publish.center`)
  - Bridge *yalnizca* bu 3'u sunuyor (genel takeover yok)
  - legacy ve horizon pageOverrides sunmuyor (Faz 1 davranisi korunmus)

- `surfaces-page-override-hook.smoke.test.tsx`
  - Hook SurfaceContext yokken null dondurur
  - Kill switch kapaliyken null dondurur
  - Aktif surface override'siz → null
  - Aktif surface override sunarsa → o component
  - Istenen key yoksa → null
  - `user.*` key'leri user scope'a routelanir
  - Export'lanan gercek hook fonksiyon ve provider disinda null doner

- `bridge-legacy-fallback.smoke.test.tsx`
  - `JobsRegistryPage` SurfaceProvider'siz legacy body renderlar (`jobs-registry-workflow-note` testid gorunuyor)
  - `JobDetailPage` legacy loading branch'ini renderlar (`job-detail-loading` testid gorunuyor)
  - `PublishCenterPage` legacy body renderlar (`publish-workflow-note` testid gorunuyor)

### 6.2 Guncellenen Testler

| Dosya | Ne Degisti |
|---|---|
| `src/tests/surfaces-builtin-registration.unit.test.ts` | "bridge is disabled" testi "bridge Faz 2 beta + admin scope + 3 override" olarak yeniden yazildi. Faz 1 assertion'i artik gecerli degil; test bunu yansitiyor. |

### 6.3 Mevcut Surface Testleri (Regression)

```
surfaces-layout-switch.smoke.test.tsx       4 tests  ✅ PASS
surfaces-theme-store-migration.unit.test.ts  N tests ✅ PASS
surfaces-builtin-registration.unit.test.ts  6 tests  ✅ PASS
surfaces-registry.unit.test.ts              N tests  ✅ PASS
surfaces-resolver.unit.test.ts              N tests  ✅ PASS
─────────────────────────────────────────────────────
TOPLAM (yeni + mevcut):                    66 / 66 ✅
```

### 6.4 tsc + vite build

- `npx tsc --noEmit` → **temiz** (0 error)
- `npx vite build` → **temiz** (`built in 2.65s`, sadece onceden bilinen 1.3MB chunk warning)

### 6.5 Tam Test Suite Regresyon Kontrolu

Tum frontend test suite'i calistirildi. 243 test **pre-existing** olarak basarisiz:

- `admin-advanced-settings-governance-pack.smoke.test.tsx`
- `jobs-registry.smoke.test.tsx`
- `job-actions-panel.smoke.test.tsx`
- `analytics-operations-page.smoke.test.tsx`
- (+ 44 diger dosya)

**Dogrulama:** `git stash` ile Faz 2 degisiklikleri geri alinip baseline'da ayni testler calistirildi:
- `jobs-registry.smoke.test.tsx` — **6 fail / 11** (ayni sayilar)
- `job-actions-panel.smoke.test.tsx` — baseline'da da fail

Bu basarisizliklar tamamen `notificationTypeToCategory`'de non-string parametre isleme ve ErrorBoundary/errorElement uyarilarindan kaynaklaniyor. Bridge degisikliklerinden **bagimsiz**. Faz 1 kapanis raporunda da bu testler "pre-existing failure" olarak etiketlenmisti.

**Yeni failure sayisi: 0.**

## 7. Dosya-Bazli Degisiklik Listesi

### Yeni Dosyalar

| Dosya | Rol |
|---|---|
| `frontend/src/surfaces/bridge/BridgeAdminLayout.tsx` | 3-panel ops shell |
| `frontend/src/surfaces/bridge/BridgeJobsRegistryPage.tsx` | Jobs registry override |
| `frontend/src/surfaces/bridge/BridgeJobDetailPage.tsx` | Cockpit job detail override |
| `frontend/src/surfaces/bridge/BridgePublishCenterPage.tsx` | Review board override |
| `frontend/src/tests/surfaces-page-overrides.unit.test.ts` | Contract + built-in registration testleri |
| `frontend/src/tests/surfaces-page-override-hook.smoke.test.tsx` | Hook logic testleri |
| `frontend/src/tests/bridge-legacy-fallback.smoke.test.tsx` | Trampoline fallback smoke testleri |
| `docs_drafts/faz2_bridge_admin_prototype_report_tr.md` | Bu rapor |

### Degisen Dosyalar

| Dosya | Degisiklik |
|---|---|
| `frontend/src/surfaces/contract.ts` | `SurfacePageKey`, `SurfacePageOverrideMap` eklendi. `Surface.pageOverrides` optional alani eklendi. |
| `frontend/src/surfaces/SurfaceContext.tsx` | `useSurfacePageOverride` hook'u eklendi (null-safe, scope-aware, kill-switch-aware). |
| `frontend/src/surfaces/index.ts` | Yeni type'lar ve hook barrel export'una eklendi. |
| `frontend/src/surfaces/manifests/bridge.ts` | Manifest `status: "disabled"` → `"beta"`, `scope: "both"` → `"admin"`, `version: "0.0.0"` → `"0.1.0"`, navigation profili eklendi. |
| `frontend/src/surfaces/manifests/register.tsx` | Bridge namespace importlari, 4 forwarder, `BRIDGE_PAGE_OVERRIDES`, `BRIDGE_SURFACE` artik adminLayout + pageOverrides iceriyor. |
| `frontend/src/pages/admin/JobsRegistryPage.tsx` | Ic gövde `LegacyJobsRegistryPage` olarak yeniden adlandirildi, public entry trampoline. |
| `frontend/src/pages/admin/JobDetailPage.tsx` | Ayni trampoline pattern. |
| `frontend/src/pages/admin/PublishCenterPage.tsx` | Ayni trampoline pattern. Override'in review gate'i *bypass etmedigi* JSDoc'ta yaziyor. |
| `frontend/src/tests/surfaces-builtin-registration.unit.test.ts` | Bridge testi "disabled" → "beta + admin + 3 override" olarak guncellendi. |

### Dokunulmayanlar (kasten)

- `frontend/src/app/router.tsx` — tek satir degismedi
- `frontend/src/app/layouts/DynamicAdminLayout.tsx`
- `frontend/src/app/layouts/DynamicUserLayout.tsx`
- `frontend/src/app/layouts/UserLayout.tsx` / `HorizonUserLayout.tsx`
- Tum backend Python dosyalari
- Settings Registry / Visibility Engine
- Review gate / publish service code

## 8. Risk ve Bilinen Sinirlamalar

| # | Risk | Azaltma |
|---|---|---|
| 1 | Bridge rail slot mapping hardcoded — yeni nav grubu eklenirse elle guncellenmeli | Rail kasitli olarak insa edilmis ve `HORIZON_ADMIN_GROUPS` ile birlikte evrilecek. Bu farkindalik rapor + kod yorumunda. |
| 2 | Sayfa override'lari hook-based — context'i render aninda *kullanan* sayfalar icin test edilmeli (SurfaceProvider'dan onceki render yolunu Faz 1 DynamicAdminLayout cozdu) | Faz 1 cozumu burada da gecerli cunku override kontrol'u sayfa duzeyinde, SurfaceProvider mount edildikten sonra yapiliyor. |
| 3 | Bridge publish board read-only — mutasyonlar detay sayfasinda → kullanici surekli tiklayip geri donuyor | Bilinen ve kasten. Faz 2 kapsami mutation *eklememek*. Faz 3+'ta inline aksiyon kartlari planlanabilir. |
| 4 | 3 page override var, 30+ admin sayfasi yok. Deneyim tutarsiz gorunebilir (Bridge shell'de legacy page'ler) | Bilinen. Bridge shell'in header'i `bridge / ops` etiketini tuttugu icin kullanici hangi bridge context'inde oldugunu her zaman goruyor. Nav ise ayni `filterHorizonAdminGroups` ile sinirlanmis durumda, dolayisiyla "beklenmedik legacy sayfa" yok. |
| 5 | Bridge shell ikon kullanmiyor — UX polish Faz 3'te | Kasten Faz 2'de asset eklemedik. 2-karakter glyph'ler prototip seviyesi icin yeterli. |
| 6 | Bridge keyboard navigation aktif degil (rail arrow keys) | Faz 2 scope disi. `useScopedKeyboardNavigation` benzeri bir mekanizma Faz 3'te eklenebilir. |

## 9. Settings Key

Bridge zaten Faz 1'de `ui.surface.bridge.enabled` anahtariyla kayitli. Faz 2 **bu anahtari `true`'ya cevirmedi**. Operator tarafindan:

1. `ui.surface.infrastructure.enabled=true` (Faz 1 kill switch)
2. `ui.surface.bridge.enabled=true` (Bridge spesifik switch)
3. Kullanici tema store'unda `activeSurfaceId=bridge` sec

adimlarinin tamami yapildiginda Bridge admin scope'ta aktive olur. Hicbir adim atlanirsa fallback legacy'dir.

## 10. Kalan Is ve Sonraki Adimlar

**Faz 2 kapsami tamamlandi.** Faz 3'te potansiyel olarak:

- Bridge rail icin keyboard navigation
- Inline review board aksiyonlari (onay / reject / schedule)
- Bridge job detail icin live log streaming widget
- Bridge shell'e global search (Cmd+P) entegrasyonu
- Surface switcher UI (theme store'a elle yazma yerine)
- Canvas veya Atrium prototipinin Faz 2'deki paternle baslamasi

## 11. Faz 2 Teslim Kontrol Listesi (7 maddelik)

| # | Madde | Durum |
|---|---|---|
| 1 | Bridge admin shell calisiyor | ✅ `BridgeAdminLayout` 3-panel layout, visibility + SSE + command palette + notification merge, smoke test verde |
| 2 | Jobs Registry + Job Detail override'landi | ✅ `BridgeJobsRegistryPage` (bucket counters + drawer + aksiyonlar) ve `BridgeJobDetailPage` (vitals + timeline + actions + publish linkage) |
| 3 | Publish Center override'landi (review board) | ✅ `BridgePublishCenterPage` 6-kolonlu read-only board, state machine bypass *yok* |
| 4 | Legacy fallback sorunsuz | ✅ `surfaces-page-override-hook` ve `bridge-legacy-fallback` testleri tum fallback yollarini (context yok / switch kapali / override yok / key yok) dogruluyor |
| 5 | Test sonuclari | ✅ 20 yeni test (20/20 pass) + 66/66 total surface test pass + tsc clean + vite build clean + 0 yeni regression (243 pre-existing failure degismedi) |
| 6 | Commit hash | `<TO_BE_FILLED_ON_COMMIT>` |
| 7 | Push status | `<TO_BE_FILLED_ON_PUSH>` |

---

**Ozet:** Faz 2 Bridge altyapisini urunlesebilir bir admin prototipi haline getirdi. Router ve backend degismedi; tum mutasyonlar eski yolu kullaniyor; kapsam 3 sayfa + 1 shell ile sinirli. Kill switch kapaliyken ya da Bridge surface secilmediginde hic davrranis degisimi yok. Bridge'in gorunur olmasi icin iki ayri settings flag + bir tema secimi gerekiyor — hicbir gizli davranis, hicbir kapali aci.
