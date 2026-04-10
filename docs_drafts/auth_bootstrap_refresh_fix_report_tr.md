# Auth Bootstrap Refresh Fix — Rapor

Tarih: 2026-04-10
Scope: F5 / sayfa yenileme sonrası sistemin kullanıcıyı login'e atması bug'ının kök çözümü + bu iş sırasında yakalanan `presets.map is not a function` çökmesinin düzeltilmesi.

---

## 1. Bug — Root Cause

Auth store initialization race condition.

- `frontend/src/stores/authStore.ts` içinde `loadFromStorage` eylemi vardı ama:
- Hiçbir yerde synchronous çağrılmıyordu; onun yerine `App.tsx` ve `AppEntryGate.tsx` içinde `useEffect` içinde tetikleniyordu.
- React render sırası şu şekilde çalışıyordu:
  1. Bileşenler ilk render'da store'u okur → `isAuthenticated = false` (çünkü effect henüz çalışmadı).
  2. `AuthGuard` / `AppEntryGate` `isAuthenticated` yanlış diye hemen `<Navigate to="/login" replace />` döner.
  3. `useEffect` çalışma sırası geldiğinde hydration olur ama route zaten `/login`'e atılmış.
- Sonuç: Her F5'te kullanıcı login'e atılıyordu. Tema değiştirince de — çünkü tema aksiyonu remount tetiklediğinde aynı race tekrar oluşuyordu.

Kısaca: hydration bir effect idi; route guard ise synchronous ilk render'da karar veriyordu. Guard her zaman hydration yarışını kazanıyordu.

---

## 2. Auth Bootstrap Nasıl Düzeltildi

Hydration effect-based model'den synchronous lazy-init model'e taşındı.

### `frontend/src/stores/authStore.ts`
- Yeni `readAuthSnapshot()` helper'ı eklendi: localStorage'dan `accessToken`, `refreshToken`, `user` okur; üçü de varsa `{isAuthenticated:true, ...}` döner, aksi halde sıfır state.
- `create<AuthState>((set, get) => { ... })` signature'ı içine snapshot **ilk satırda** okunuyor ve initial state olarak döndürülüyor.
  - Store oluşturulduğu an (modül import'u) hydration tamamlanmış oluyor — ilk render'da artık doğru değerler geliyor.
- `AuthState` interface'ine `hasHydrated: boolean` flag'i eklendi. Lazy init patikasında hep `true`. Future-proof: ileride async hydration gerekirse tek kaynaklı gate zaten var.
- `logout()` `hasHydrated`'i sıfırlamıyor — yorum olarak eklendi.
- `loadFromStorage` artık idempotent re-read (aynı helper'ı çağırıyor). `@deprecated` olarak işaretlendi; testler ve legacy yollar için korundu.

### `frontend/src/app/guards/AuthGuard.tsx`
- `hasHydrated` kontrolü eklendi. `!hasHydrated` ise skeleton (aria-busy, data-testid="auth-guard-bootstrapping") döner, redirect yapmaz.
- Yapılmayan: koruma sırasını bozmadık, role check aynı kaldı.

### `frontend/src/app/AppEntryGate.tsx`
- İki bileşene ayrıldı:
  1. `AppEntryGate` — hydration + auth check. Anonim kullanıcı `/login`'e gider.
  2. `AuthenticatedEntryRedirect` — sadece authenticated durumda mount olur, `useOnboardingStatus` burada tetiklenir.
- Kritik düzeltme: `useOnboardingStatus` artık **auth confirm edildikten sonra** mount oluyor. Önceden anonim kullanıcı da onboarding endpoint'ini tetikliyordu.
- `useEffect` tamamen kaldırıldı.

### `frontend/src/app/App.tsx`
- `useEffect`-based `loadFromStorage()` kaldırıldı. App.tsx artık sadece `QueryClientProvider` + `RouterProvider`.

---

## 3. F5 Sonrası Atma — Gitti mi?

Evet. Store oluşturulduğu anda hydration sync yapıldığı için, herhangi bir route guard ilk okumada doğru `isAuthenticated` değerini görüyor. Token geçerli ise kullanıcı bulunduğu panelde kalıyor; token yoksa normal davranışla `/login`'e gidiyor.

Test coverage:
- `frontend/src/tests/stores/authStore.hydration.test.ts` — 6 unit test
  - hydrates authenticated from localStorage
  - starts unauthenticated when empty (hasHydrated=true)
  - partial storage rejected
  - corrupt JSON handled
  - logout clears but hasHydrated stays
  - legacy loadFromStorage idempotent
- `frontend/src/tests/auth-bootstrap.smoke.test.tsx` — 8 smoke test
  - /admin refresh (admin session)
  - /user refresh (user session)
  - unauth /admin → /login
  - unauth /user → /login
  - corrupt user row → /login
  - non-admin → /admin bounced to /user
  - authenticated root → /user no login flash
  - unauth root → /login without useOnboardingStatus firing

Toplam: 14/14 passing.

---

## 4. Onboarding / Auth Sırası Düzeldi mi?

Evet. Eskiden `AppEntryGate` sahası anonim kullanıcılar dâhil herkeste `useOnboardingStatus` tetikliyordu. Şimdi:

1. Hydration sync'te tamamlanır.
2. `AppEntryGate` önce `hasHydrated` gate'ini kontrol eder.
3. Sonra `isAuthenticated` kontrolü — yoksa direkt `/login`.
4. Authenticated olduğu kesinleşince `AuthenticatedEntryRedirect` alt component mount olur; sadece orada `useOnboardingStatus` çağrılır.

Net kazanç: anonim kullanıcı `/onboarding/status` endpoint'ine istek atmıyor, log kirliliği gitti, 401 interceptor yanlış redirect tetikleme ihtimali kapandı.

---

## 5. Presets.map is not a function — Yan Fix

Bu bug F5 bug'ıyla aynı oturumda yakalandı, root cause ayrı.

### Kök Sebep
React Query cache collision.
- `frontend/src/hooks/useSubtitlePresets.ts` hook'u `queryKey: ["subtitle-presets"]` altında backend'in tam response objesini (`{presets, default_preset_id, preview_scope}`) cache'liyordu.
- `frontend/src/pages/admin/NewsBulletinWizardPage.tsx` de **aynı** queryKey kullanıyordu ama custom queryFn'inde `return data.presets ?? []` ile array döndürmeye çalışıyordu.
- Hangi caller cache'i önce doldurursa, diğeri yanlış shape okuyordu. Kullanıcı önce standard video akışını açarsa, sonra haber bulletin akışını, NewsBulletinWizard cache'den array yerine objet alıyor ve `SubtitleStylePicker` içindeki `presets.map` patlıyordu.

### Fix
1. `NewsBulletinWizardPage.tsx` — queryKey `["news-bulletin-subtitle-presets"]` olarak izole edildi. `Array.isArray` guard'ı + explanatory comment eklendi.
2. `SubtitleStylePicker.tsx` — defensive coerce: `const presetList = Array.isArray(presets) ? presets : []`. İleride başka bir caller yine collision yaparsa component fail-soft olur, uygulamayı düşürmez.

---

## 6. Test Sonucu

```
✓ src/tests/stores/authStore.hydration.test.ts (6 tests) 16ms
✓ src/tests/auth-bootstrap.smoke.test.tsx (8 tests) 31ms

Test Files  2 passed (2)
Tests       14 passed (14)
```

- `npx tsc --noEmit` — EXIT=0 (temiz)
- Regression yok: yalnızca auth/presets patikalarına dokunuldu, surface registry / template engine / publish / analytics dosyalarına dokunulmadı.

---

## 7. Yapılmayan / Bilinçli Ertelenen

- Surface picker scope filtering (option a) — ayrı bir değişiklik olarak ele alınacak; bu rapor kapsamında değil.
- loadFromStorage eski helper'ı silinmedi (`@deprecated` bırakıldı) — dışarıdan çağıran legacy yol kalma ihtimaline karşı soft deprecation.
- `hasHydrated` şu an her zaman `true` set ediliyor; ileride async hydration gerekirse false ile başlatıp post-async `true` yapılabilir.

---

## 8. Risk ve Limitler

- Lazy init pattern SSR safe değil — ContentHub zaten SSR yok, localhost-first uygulama.
- `readAuthSnapshot` try/catch ile sarılı; localStorage unavailable (private mode, test env) durumunda zarar vermiyor.
- Test env'de `createMemoryRouter` kullanılmadı (AbortSignal/undici bug), legacy `MemoryRouter` API tercih edildi. Production kodu etkilenmiyor.

---

## 9. Teslim Özeti

| Madde | Durum |
|---|---|
| Bug root cause | Auth hydration effect-based idi, route guard synchronous ilk render'da yarışı kazanıyordu |
| Auth bootstrap fix | Zustand lazy initializer → synchronous hydration + `hasHydrated` guard |
| F5 sonrası atma | GİTTİ — manual + automated doğrulandı |
| Onboarding / auth sırası | DÜZELDİ — useOnboardingStatus sadece authenticated tree içinde mount olur |
| Test sonucu | 14/14 new tests passing, tsc clean |
| Commit hash | `16a223b` |
| Push durumu | `origin/main` — `f8bda7d..16a223b` başarılı |
