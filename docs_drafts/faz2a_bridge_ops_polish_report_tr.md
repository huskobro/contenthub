# Faz 2A — Bridge Ops Polish Raporu

## Ozet

Faz 2A kucuk olcekli, odakli bir polish fazi. Yeni shell/route/state-machine eklenmedi. Bridge admin yuzeyinin Faz 2'de verilen 3 page override'i (`admin.jobs.registry`, `admin.jobs.detail`, `admin.publish.center`) ve 3-panel kabuk (rail + context panel + content) yerinde korunarak operasyonel his yuksetildi. Legacy fallback bozulmadi; bridge kapali kalirsa eski sayfalar aynen calisir.

Temel iyilestirmeler: rail icin klavye navigasyonu + ARIA + roving tabindex, jobs registry icin sticky header/tablo hizalamasi/secili satir isareti + capability-gated inline aksiyonlar, job detail icin cift satirli vitals (job + mevcut adim) ve provider trace ozeti, publish board icin kolon etiket chip'leri + toplam rozeti + dikkat sayaci.

## Degisen Dosyalar (file-by-file)

### 1. `frontend/src/surfaces/bridge/BridgeAdminLayout.tsx`
- Rail (64 px) icin klavye navigasyonu:
  - `ArrowUp/ArrowDown/ArrowLeft/ArrowRight` — slotlar arasinda odak tasir
  - `Home` / `End` — ilk/son slota atlar
  - `Enter` / `Space` — odakli slotu aktive eder (navigate)
  - `1..6` rakam tuslari — belge seviyesinde kisayol (input/textarea/contenteditable icindeyken calismaz)
- Roving tabindex: ayni anda sadece bir rail butonu `tabIndex=0`, digerleri `-1`.
- `role="navigation"`, `aria-label="Bridge operasyon rayi"`, `aria-current="page"` eklendi.
- Yeni `navigateToSlot(slot)` yardimcisi; klik ve klavye yollari ayni koddan gecer.
- `onFocus` senkronlanir, `setFocusedRailIndex(index)` uygulanir.
- Header breadcrumb `"bridge / {activeSlot.label}"` haline geldi (eski sabit `"bridge / ops"` kaldirildi). Yeni `data-testid="bridge-breadcrumb"`.

**Neden:** Klavye-first operator rail'i fareye dokunmadan hedefleyebilsin; screen reader yardim landmark'i gorebilsin; secili alanin baslikta gorunmesi "su anda bridge neresindeyim?" sorusunu bitirir.

### 2. `frontend/src/surfaces/bridge/BridgeJobsRegistryPage.tsx`
- Sticky liste basligi: `.sticky top-0 z-10`, yukselme sirasinda kolon basligi gorunur kalir.
- Tabular satir hizalamasi: yeni `bridge-jobs-column-headers` serisi (`durum | modul | yas | adim/hata | id`) ile satirlar ayni genislikte hizalanir.
- Secili satir `border-l-2 border-l-brand-500` + `bg-brand-50` + `aria-selected="true"` + `data-selected="true"` ile belirginlesti.
- Liste klavye navigasyonu:
  - `ArrowDown/j`, `ArrowUp/k` — secimi tasir
  - `Home/End` — ilk/son job
  - `Enter` — secili job'un kokpit sayfasini acar
  - `useEffect` ile secilen satir gorunur alana kaydirilir (`scrollIntoView`, jsdom icin guard'li)
- `role="listbox"` + `aria-label` ile yerli erisilebilirlik.
- Kapasiteye baglanmis inline aksiyonlar:
  - `fetchAllowedActions(selectedId)` React Query ile cekilir (`queryKey=["job-actions", selectedId, includeArchived]`, `staleTime=5000ms`).
  - Yeni butonlar: **Iptal** (`cancelJob`), **Retry** (`retryJob`). Var olanlar: **Klonla**, **Arsivle**, **Kokpit**.
  - Her buton `allowedActions.can_*` bayragina gore `disabled`. Disabled iken `title` ile neden gosterilir.
  - `onSuccess` icinde `["jobs"]`, `["job-detail", jobId]`, `["job-actions", jobId]` invalidate edilir — zaten var olan cache kontratlari kullanilir, yeni endpoint uretilmedi.
- Satir icerigi sadelesti: hata satiri sadece `last_error` varsa gorunur, adim bilgisi ana satirda mono goster.

**Neden:** Backend state machine'inin sahibi olmak. Bu sayfa hicbir illegal gecisi denemez; hangi butonun ne zaman aktif olacagina backend karar verir. Klavye listbox'u ve selected-row marker'i operatorun gozunu kaybetmemesini saglar.

### 3. `frontend/src/surfaces/bridge/BridgeJobDetailPage.tsx`
- **Vitals strip** ikili satira bolundu:
  - **Primary row** (6 sutun): Job ID, Modul, Adim, **Job Gecti**, **Job ETA**, Retry.
  - **Step row** (6 sutun, sadece aktif adim varsa): Adim Durum, **Adim Gecti**, **Adim ETA**, Prov. Call, Prov. Hata, Prov. $.
  - Yeni `data-testid="bridge-job-vitals-primary"` ve `"bridge-job-vitals-step"`.
- Mevcut adim `useMemo` ile `job.steps`'ten cekildi; `elapsed_seconds_live` oncelikli.
- **Provider trace ozeti**: `JSON.parse(step.provider_trace_json)` uzerinden hesaplanan `{ calls, errors, costUsd, latencyMs }` — ek istek yok, step payload'indan tureniliyor. `errors > 0` iken `warn` renk ile goze carpiyor.
- **Publish Baglantisi** hiyerarsisi temizlendi:
  - Basliktaki sag koseye `"review gate korundu"` etiketi (kayit varsa) — hicbir review gate bypass'i olmadigi tescilli.
  - Kayit icinde publish id kisa formu (`publish.id.slice(0, 12)`) `title`'da tam hali ile.
  - Platform etiketi `capitalize font-medium` ile gorunurlestirildi.
  - "Yayin Detayi →" butonu daha belirgin.

**Neden:** Operator "su anda hangi adimda, ne kadar sure oldu?" sorusuna tek bakista cevap alsin. Provider trace ozeti JobSystemPanels'e inmeden once uyarici olarak vitals seviyesinde surfer; cost/error is pulled from existing payload, kontratlar ayni kaldi.

### 4. `frontend/src/surfaces/bridge/BridgePublishCenterPage.tsx`
- **Toplam / filtreli sayac**: baslikta `Toplam: N` kalin, aktif odak varsa `· filtreli: M` ek gosterim.
- **Dikkat rozeti** `bridge-publish-attention`: `pending_review + failed + review_rejected` sayisini sari-warning etiketinde gosterir. Sadece sifir degilken gorunur.
- **Status focus chip serisi** `bridge-publish-status-chips`:
  - Her backend state'ine bir chip (`draft`, `pending_review`, `approved`, `scheduled`, `publishing`, `published`, `failed`, `cancelled`, `review_rejected`). Her chip kendi sayisini gosterir, sayisi 0 olan chip `disabled`.
  - Tiklayinca o state'e odaklanilir (sub-filter), tekrar tiklayinca temizlenir. Kolonlar bos kalirsa `"odak disinda"` mesaji.
  - Yeni backend state'i uydurulmadi — sadece zaten var olan statulerden filtre uretildi.
- **Kolon basligi sticky** (`sticky top-0 z-10`), sayac `rounded bg-surface-page border` ile rozet haline geldi.
- **Bos kolon mesaji** tek satir `—` yerine ortalanmis 2 satir clarity: `—` + `"bu kolonda kayit yok"` veya `"odak disinda"`.

**Neden:** Review gate'e dokunmadan ama operatorun "bugun ne review'da, ne hatali?" sorusunu 1 saniyede cevaplamak. Status chip satiri icerideki state machine'i degistirmeden drill-down saglar.

### 5. `frontend/src/tests/bridge-rail-keyboard.smoke.test.tsx` (yeni)
- Kucuk bir harness ile BridgeAdminLayout'un rail klavye mantigi izole test edildi (TAM layout'u mount etmek infra hooks gerektirirdi — Faz 2'deki `surfaces-page-override-hook.smoke.test.tsx` ile ayni yaklasim).
- 9 test:
  1. Roving tabindex — sadece odakli slot tabbable
  2. ArrowDown odagi ilerletir
  3. ArrowUp ilkten sona wrap eder
  4. End → son, Home → ilk
  5. Enter odakli slotu aktive eder
  6. Space odakli slotu aktive eder
  7. Digit `3` hotkey dogrudan uctur
  8. Input icindeyken digit hotkey gormezden gelinir
  9. Landmark `role="navigation" name="Bridge operasyon rayi"` bulunur

### 6. `frontend/src/tests/bridge-inline-action-capability.smoke.test.tsx` (yeni)
- BridgeJobsRegistryPage'i `fetchAllowedActions`, `fetchJobs`, `cancelJob`, `retryJob`, `cloneJob` mock'lari ile mount eder.
- 4 test:
  1. **Running job** + `can_cancel=true, can_retry=false` → Cancel enabled, Retry disabled.
  2. **Failed job** + `can_retry=true, can_cancel=false` → Retry enabled, Cancel disabled.
  3. Disabled Retry butonuna click → `retryJob` cagrilmaz (illegal gecis denenemez).
  4. Enabled Cancel butonuna click → `cancelJob("job-running-1")` bir kez cagrilir.
- Dogrudan illegal state gecisi uretmeye calismaz; capability-gate'in client tarafi kontratini dondurur.

### 7. (mevcut) `bridge-legacy-fallback.smoke.test.tsx`, `surfaces-page-override-hook.smoke.test.tsx`, `surfaces-page-overrides.unit.test.ts`, `surfaces-builtin-registration.unit.test.ts`
- Hicbiri degistirilmedi, hepsi yesil.
- **Trampolin zinciri bozulmadi**: bridge legacy fallback testleri ayni sekilde gecmeye devam ediyor (override null → legacy body).

## Test Sonuclari

### Targeted bridge + surfaces suite
```
npx vitest run \
  src/tests/bridge-rail-keyboard.smoke.test.tsx \
  src/tests/bridge-inline-action-capability.smoke.test.tsx \
  src/tests/bridge-legacy-fallback.smoke.test.tsx \
  src/tests/surfaces-page-override-hook.smoke.test.tsx \
  src/tests/surfaces-page-overrides.unit.test.ts \
  src/tests/surfaces-builtin-registration.unit.test.ts \
  src/tests/surfaces-layout-switch.smoke.test.tsx \
  src/tests/surfaces-registry.unit.test.ts \
  src/tests/surfaces-resolver.unit.test.ts \
  src/tests/surfaces-theme-store-migration.unit.test.ts

Test Files  10 passed (10)
      Tests  79 passed (79)
```

### Yeni Faz 2A testleri
- `bridge-rail-keyboard.smoke.test.tsx`: **9/9 passed**
- `bridge-inline-action-capability.smoke.test.tsx`: **4/4 passed**
- Toplam yeni: **13 test, 13 passed**

### Tip kontrolu
```
npx tsc --noEmit
→ exit 0, hata yok
```

### Production build
```
npx vite build
✓ built in 2.54s
```

### Full suite (regression check)
```
npx vitest run
Test Files  48 failed | 144 passed (192)
      Tests  243 failed | 2181 passed (2424)
```

**Karsilastirma**: Faz 2 sonrasi baseline ile hata listesi `diff` ile karsilastirildi — **IDENTICAL**. Zero yeni hata, zero regresyon. Butun failing test'ler on-ceden bilinen listede (MEMORY: "M7 fresh DB ve 22 smoke test guncellenmeli").

## Deliverable (7 maddeli teslim ozeti)

1. **Ops deneyimi iyilesti mi?**
   Evet. Rail klavye ile kullanilir, secili baglam baslikta belirir, jobs registry tablo hizalamasi + sticky header + secili satir marker'i ile operasyonel; vitals iki satir (job + step) netlik getiriyor; publish board'da dikkat sayaci + chip filtre, "su an neye bakmaliyim?" sorusunu 1 saniyede cevaplar. Fare bagimsiz kullanim mumkun.

2. **Rail klavye navigasyonu eklendi mi?**
   Evet. Arrow (Up/Down/Left/Right), Home/End, Enter, Space + `1..6` digit hotkeys. Roving tabindex + ARIA landmark + `aria-current`. Editable element icindeyken digit hotkey gormezden gelinir.

3. **Publish board daha okunabilir mi?**
   Evet. Toplam + filtreli toplam, dikkat rozeti (pending_review + failed + review_rejected sayisi), 9 state icin chip satiri (sayi gosterir, 0 iken disabled, aktif iken brand tint), sticky kolon basligi, daha net bos-kolon mesaji. Review gate'e dokunulmadi; board hala read-only, kart tiklayinca /admin/publish/:id'e gider.

4. **Legacy fallback bozuldu mu?**
   Hayir. `bridge-legacy-fallback.smoke.test.tsx` 3/3 yesil (kill-switch off + surface provider yok durumunda JobsRegistryPage/JobDetailPage/PublishCenterPage hala legacy govdelerini render eder). Override kontrati (`useSurfacePageOverride`) ve trampolin deseni Faz 2'deki sekilde.

5. **Test sonuclari**
   - Yeni Faz 2A testleri: **13/13 passed**
   - Hedefli bridge + surfaces suite: **79/79 passed**
   - `tsc --noEmit`: hata yok
   - `vite build`: basarili (2.54s)
   - Full suite: 2181 passed / 243 failed — **baseline ile IDENTICAL** (diff ile dogrulandi), zero regresyon.

6. **Commit hash**
   `50d0f64` — `feat(surfaces): Faz 2A — Bridge ops polish (keyboard nav + capability-gated actions)`
   7 dosya, +1235 / -83 satir.

7. **Push durumu**
   Basarili. `git push` `e79e2a8..50d0f64  main -> main` (Faz 2A commit), ardindan report-fill `50d0f64..e0efddc  main -> main`. Remote: `github.com:huskobro/contenthub.git`.

## Risk ve Limitler (acik sekilde)

- **Rail testleri harness ile izole**: BridgeAdminLayout'un tam mount'u SSE / notifications / command palette / visibility fetch zincirini tetikler; bu Faz 2A kapsami disindaydi. Harness, uretim rail'inin olay handler'ini birebir kopyalar — kod formu degistiginde testler gorunecek sekilde breaker olacak.
- **Provider trace ozeti** sadece `step.provider_trace_json`'u parse eder; mahaldeki veri bozuksa sessizce atlanir (UI bozulmaz). Ek istek yok, backend kontrati aynen.
- **Inline Retry/Iptal capability bayragina tamamen bagimli**: backend `can_cancel=false` donerse client asla cancel denemez. Edge case olarak query henuz loading iken buton disabled gorunur (`allowedActions` undefined iken default `false`), bu konservatif ve guvenli.
- **Chip filtre** sadece UI seviyesinde sub-filter. Publish state machine'ine dokunmaz; sunucu toplamlari degistirmez.
- **Publish attention rozeti** kapsami `pending_review + failed + review_rejected` ile sinirli. `cancelled` dahil degildir — cancelled operator tarafindan zaten bilincli kapatilmistir, "dikkat" olarak saymak gurultu yapar.
- **Kullanici paneline dokunulmadi**, canvas/atrium dokunulmadi, yeni route / yeni shell yok.
- **Pre-existing failures** (243 adet) Faz 2A ile ilgisiz; baseline diff IDENTICAL. M7 fresh DB + smoke test refresh ayri bir is.

## Capability Gate Ornegi (referans)

```tsx
const { data: allowedActions } = useQuery<AllowedActions>({
  queryKey: ["job-actions", selectedId, includeArchived],
  queryFn: () => fetchAllowedActions(selectedId as string),
  enabled: !!selectedId,
  staleTime: 5_000,
});

<button
  onClick={() => cancelMutation.mutate(selectedId)}
  disabled={!allowedActions?.can_cancel || cancelMutation.isPending}
  title={!allowedActions?.can_cancel ? "Bu durumda iptal edilemez" : "Isi iptal et"}
  data-testid="bridge-jobs-drawer-cancel"
>
  Iptal
</button>
```

Bu desen `components/jobs/JobActionsPanel.tsx` ile ayni prensipte — legacy cockpit'teki sinifi tekrarlamadan ayni kontrati izler, test edilebilir yapili.

## Sonraki (yapilmadi, bilinerek biraktim)

- BridgeContextPanel sub-grup collapse/expand (Faz 2A kapsam disi).
- Rail'da rozet (ornegin "ops" icerisinde `queued + running` sayisi) — surface-level analytics icin yeni bir kanal gerektirir, bu faz disi.
- Cockpit log paneli realtime yenileme (SSE zaten baglanti durumu gosteriyor; log panel legacy JobSystemPanels tarafindan yonetiliyor — ona bu fazda dokunulmadi).
- Keyboard shortcut cheat-sheet — mevcut `KeyboardShortcutsHelp` komponentine Faz 2A eklemeleri sonraki fazda girecek.
