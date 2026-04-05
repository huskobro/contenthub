# M13-A: Frontend Visibility Enforcement Raporu

## Ozet

Frontend tarafinda gorunurluk sistemi ilk kez aktif hale getirildi. Backend'deki `/visibility-rules/resolve` endpointi artik frontend'den cagriliyor ve sonuclara gore sidebar navigasyonu ile AdminOverviewPage quick link'leri filtreleniyor.

## Yapilan Degisiklikler

### 1. `frontend/src/api/visibilityApi.ts`
- `VisibilityResolution` interface eklendi (`visible`, `read_only`, `wizard_visible`)
- `resolveVisibility(targetKey, params?)` fonksiyonu eklendi — backend `/resolve` endpointini cagiriyor
- Hata durumunda guvenli default donuyor: `{ visible: true, read_only: false, wizard_visible: false }`

### 2. `frontend/src/hooks/useVisibility.ts` (YENI)
- React Query hook: `useVisibility(targetKey, params?)`
- 30 saniye staleTime ile backend'e sorgu yapar
- Donen deger: `{ visible, readOnly, wizardVisible, isLoading, resolution }`
- Backend erisim hatasi durumunda default olarak `visible: true` donuyor (graceful degradation)

### 3. `frontend/src/app/layouts/AdminLayout.tsx`
- `AdminNavItem` interface'ine `visibilityKey` optional alani eklendi
- `ADMIN_NAV` dizisine 5 nav item icin visibilityKey atandi:
  - `panel:settings`, `panel:visibility`, `panel:templates`, `panel:analytics`, `panel:sources`
- `useAdminNavFiltered()` hook eklendi — her visibility key icin `useVisibility` cagirip `guardMap` olusturuyor
- React hooks kurali ihlal edilmiyor: tum `useVisibility` cagrilari AdminLayout renderinda kosulsuz yapiliyor

### 4. `frontend/src/pages/AdminOverviewPage.tsx`
- `QuickLink` interface'ine `visibilityKey` optional alani eklendi
- 4 quick link'e visibilityKey atandi: `panel:sources`, `panel:templates`, `panel:settings`, `panel:analytics`
- `useFilteredQuickLinks()` hook eklendi — ayni pattern, guardMap ile filtreleme

### 5. `frontend/src/tests/visibility-enforcement.smoke.test.tsx` (YENI)
- 6 smoke test:
  1. useVisibility hook varsayilan deger testi
  2. Sidebar nav filtreleme — hidden rule varken item gizleniyor
  3. Sidebar nav — rule yokken tum itemlar gorunuyor
  4. Quick link filtreleme — hidden rule varken link gizleniyor
  5. Quick link — rule yokken tum linkler gorunuyor
  6. resolveVisibility API fonksiyonu cagri formati dogrulamasi

## Mimari Kararlar

1. **Graceful degradation**: Backend erisim hatasi durumunda `visible: true` donuyor — frontend hicbir zaman "kilit" durumuna dusmuyor
2. **Hook-per-key pattern**: Her visibility key icin ayri `useVisibility` cagrisi — React hooks kuralina uygun
3. **guardMap pattern**: AdminLayout ve AdminOverviewPage'de ayni desen — tutarli, test edilebilir
4. **staleTime: 30s**: Visibility resolution 30 saniye cache'leniyor — gereksiz backend cagrilarini onluyor

## Kapsam Disi Birakilanlar

- `read_only` ve `wizard_visible` frontend'de okunuyor ama henuz UI'da kullanilmiyor — bu M14+ kapsami
- Kullanici panelinde visibility guard yok — admin-only ozellik
- Page-level redirect guard (gorunmeyen sayfaya gidince 404/redirect) henuz yok — sidebar gizleme yeterli MVP icin

## Test Sonuclari

- 6/6 visibility smoke test PASSED
- Mevcut AdminLayout ve AdminOverviewPage testleri PASSED (regresyon yok)
