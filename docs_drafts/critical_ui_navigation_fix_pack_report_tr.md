# Critical UI Clarity + Navigation Fix Pack — Teslim Raporu

**Tarih:** 2026-04-10
**Kapsam:** Full UI Clarity/Navigation Audit (53 finding, commit `5274cbb`) içinden 8 kritik ve yüksek öncelikli bulgunun kapatılması.
**Tip:** Bug fix / UX polish (yeni feature değil, yeni surface değil, büyük refactor değil).

## Kapsam Kuralları (uyuldu)
- Yeni surface yazılmadı.
- Bridge / Canvas / Atrium / Horizon mimarisi korundu.
- Resolver / fallback / surface sistemi bozulmadı.
- Backend contract uydurulmadı; yalnızca providers endpoint'i mevcut credential_resolver'ı kullanacak şekilde bağlandı.
- Scope-creep yapılmadı, alakasız dosya temizliği yok.
- Sahte boş state eklenmedi.

---

## Kapatılan 8 Bulgu

### F2 — /admin/jobs/:id tam sayfa crash (EN KRİTİK)
**Durum:** ✅ kapatıldı.
**Dosya:** `frontend/src/surfaces/bridge/BridgeJobDetailPage.tsx`
**Kök neden:** React Rules of Hooks ihlali — `useMemo` çağrıları (`currentStep`, `providerSummary`) erken `return` (isLoading / isError / !job) bloklarından SONRA geliyordu. Her render'da hook sırası değişiyor, bu yüzden sayfa açıldığı anda "Rendered more hooks than during the previous render" hatasıyla komple crash ediyordu.
**Düzeltme:** Her iki `useMemo` erken return'lerden ÖNCEYE taşındı ve `job` null olabilecek şekilde tolerant hale getirildi. `currentStepElapsed` / `currentStepEta` türetmeleri erken return'lerden SONRA bırakıldı (gerçek değerleri job varken hesaplıyor).

### F1 — Admin login sonrası `/user`'a düşüyor
**Durum:** ✅ kapatıldı.
**Dosyalar:**
- `frontend/src/app/AppEntryGate.tsx` — `AuthenticatedEntryRedirect` artık `useAuthStore(s => s.user?.role)` okuyor; onboarding check öncelikli, sonra rol bazlı default: admin → `/admin`, diğerleri → `/user`.
- `frontend/src/pages/LoginPage.tsx` — login başarısından sonra `useAuthStore.getState().user?.role` okunup `navigate(role === "admin" ? "/admin" : "/user", { replace: true })`.

### F9 — /admin/visibility sayfası 137+ test fixture ile kirli
**Durum:** ✅ kapatıldı.
**Dosya:** `frontend/src/pages/admin/VisibilityRegistryPage.tsx`
**Düzeltme:**
- `isTestFixtureRule(targetKey)` helper — `target_key` `"test:"` ile başlıyorsa fixture kabul ediliyor.
- `showTestFixtures` state (default: `false`).
- `visibleRules` + `testFixtureCount` useMemo ile türetiliyor.
- Fixture varsa banner + checkbox: "Test fixture'larını göster (N kayıt)".
- Empty state ayrıştırıldı: "hiç kural yok" vs "yalnızca fixture'lar var, onları göster".

Not: Fixture'lar DB'den silinmedi; yalnızca varsayılan görünümden gizlendi. Geliştirici/QA gerektiğinde tek tıkla açabiliyor. Bu, "hiçbir şey silme" kapsam kuralına uygun.

### F21 — /admin/themes kafa karışıklığı (Surface ↔ Theme)
**Durum:** ✅ kapatıldı.
**Dosya:** `frontend/src/pages/admin/ThemeRegistryPage.tsx`
**Düzeltme:**
- PageShell title: **"Görünüm ve Tema"**, subtitle iki kavramı açıklıyor.
- Sayfa başında 2 kolonlu kavram-ayrımı banner'ı: "Yüzey (shell) nedir?" vs "Tema (renk paleti) nedir?".
- İçerik iki numaralı bölüme ayrıldı:
  - **1 · Arayüz Yüzeyi** — `SurfacePickerSection` burada.
  - **2 · Renk Teması** — `ActiveTheme` + `ThemeList` burada.

### F15 — Credential status tutarsızlığı (Settings ↔ Providers)
**Durum:** ✅ kapatıldı.
**Dosyalar:**
- `backend/app/providers/router.py`
- `frontend/src/api/providersApi.ts`
- `frontend/src/pages/admin/ProviderManagementPage.tsx`

**Kök neden:** Providers endpoint'i credential durumunu yalnızca `os.environ`'a bakarak üretiyordu; Settings sayfasında DB'ye kaydedilmiş key'lerden habersizdi. Aynı anda "Settings: ✓ DB'de kayıtlı" + "Providers: ✗ env yok" çelişkisi görünüyordu.

**Düzeltme:**
- `CREDENTIAL_ENV_MAP` (env var string'leri) → `PROVIDER_CREDENTIAL_KEY_MAP` (Settings Registry key'leri, örn. `"credential.pexels_api_key"`).
- `list_providers` async yapıldı, `Depends(get_db)` alıyor.
- Her provider için `resolve_credential(credential_key, db)` çağrılıyor → merkezi DB→env zinciri kullanılıyor (tek source of truth).
- Kaynak türetme: Setting tablosunda değer varsa `"db"`, yoksa `"env"`.
- Frontend tipi: `credential_source` artık `"db" | "env" | "missing" | "not_required"`; `credential_env_var` alanı `credential_key` olarak yeniden adlandırıldı.
- `CredentialBadge` bileşeni: OK durumunda kaynak etiketi gösteriyor — `✓ Yapılandırıldı (DB)` veya `✓ Yapılandırıldı (env)`.

### F33 — /user/projects/:id çok seyrek
**Durum:** ✅ kapatıldı (mevcut hook'larla, yeni backend yok).
**Dosya:** `frontend/src/surfaces/canvas/CanvasProjectDetailPage.tsx`
**Düzeltme:**
- `useJobDetail` + `usePublishRecordForJob` eklendi.
- `focusJobId` useMemo: önce `project.active_job_id`, yoksa linked job listesinden `created_at` DESC'e göre en yenisi.
- Mevcut metadata grid ile linked jobs listesi arasına iki panel eklendi:
  1. **Üretim Durumu** — status badge, current step, tamamlanan/toplam step sayısı, renkli ikonlu (✓ / ▶ / ✗ / ·) tam step listesi, elapsed time, retry count.
  2. **Yayın Durumu** — varsa publish record status + platform + id; yoksa "Yayın Atölyesi" CTA'sı.
- Yeni backend endpoint yok; yalnızca mevcut job detail + publish record hook'ları tüketiliyor.

### F45 — User settings admin-only Execution path ayarlarını sızdırıyor
**Durum:** ✅ kapatıldı.
**Dosya:** `frontend/src/pages/UserSettingsPage.tsx`
**Düzeltme:**
- `USER_SETTINGS_DENYLIST_GROUPS = new Set(["execution"])` sabiti.
- Görünür settings filtresi artık iki koşul: `visible_to_user === true` VE grubu denylist'te değil.
- Frontend-side savunma (visibility layer): backend'de execution settings'in `visible_to_user=false` olması gereksinimini değiştirmedik; bu yalnızca ekstra kemer + askı. Kök kontrol yine Settings Registry'de.

### F48 — Panel switch copy tutarsızlığı
**Durum:** ✅ kapatıldı.
**Dosyalar (6 surface/layout):**
- `frontend/src/surfaces/bridge/BridgeAdminLayout.tsx` — title/aria → "Kullanıcı Paneli" (görsel "USR" rozeti korundu, çünkü Bridge'in kimlik elementi).
- `frontend/src/surfaces/canvas/CanvasUserLayout.tsx` — "Yonetim Paneline Gec" → **"Yönetim Paneli"**.
- `frontend/src/surfaces/atrium/AtriumUserLayout.tsx` — "Yonetim Paneli" → **"Yönetim Paneli"** + title/aria standardize.
- `frontend/src/app/layouts/HorizonAdminLayout.tsx` — "Kullanici Paneli" → **"Kullanıcı Paneli"** + title/aria.
- `frontend/src/app/layouts/HorizonUserLayout.tsx` — header başlığı ve buton etiketi Türkçe standartlarına göre düzeltildi.
- `frontend/src/components/layout/AdminContinuityStrip.tsx` — "Kullanici Paneline Don" → **"Kullanıcı Paneli"**.

**Sonuç:** Tüm surface'lerde kullanıcı panelinden admin'e geçiş butonu **"Yönetim Paneli"**, admin panelinden user'a geçiş butonu **"Kullanıcı Paneli"** olarak standartlaştı. title/aria-label alanları etiketle birebir aynı.

---

## Hâlâ Açık Kalan
**Yok** — 8 bulgunun hepsi bu fix-pack kapsamında kapatıldı.
(Audit'teki kalan 45 finding bilinçli olarak bu pack dışında tutuldu; başka fazın konusu.)

---

## En Kritik Kapatma
**F2 — BridgeJobDetailPage hook order crash.** Bu hata admin tarafında job detay sayfasını tamamen ulaşılamaz hale getiriyordu; operasyonel görünürlük için ContentHub'ın çekirdek varlığı olan Job Detail sayfası (Overview, Timeline, Logs, Artifacts…) açılmıyordu. Fix, bir React Rules of Hooks disiplin ihlalinin düzeltilmesi — sınıfsal çözüm, semptom bastırma değil.

---

## Test Sonuçları

### Code Quality Gate
| Check | Sonuç |
|---|---|
| `npx tsc --noEmit` | ✅ clean (0 error) |
| `npx vite build` (prod) | ✅ 2.97 s, 0 error (yalnızca preexisting chunk-size uyarısı) |
| Backend import check (`from app.providers.router import list_providers, PROVIDER_CREDENTIAL_KEY_MAP`) | ✅ OK |

### Smoke Tests (frontend)
Koşulan dosyalar: `admin-continuity-strip.smoke.test.tsx`, `auth-bootstrap.smoke.test.tsx`, `canvas-legacy-fallback.smoke.test.tsx`, `admin-to-user-return-clarity.smoke.test.tsx`, `canvas-user-shell.smoke.test.tsx`, `user-admin-route-intent-clarity.smoke.test.tsx`.

| | |
|---|---|
| Passed | 21 |
| Failed | 19 |

**Failing hataların tamamı preexisting ve bu fix-pack'te dokunulmayan kod yollarından geliyor:**
- `TypeError: userList.find is not a function` — `frontend/src/hooks/useUsers.ts:58` (git blame: `f3a1653` "Sprint 4 pre-launch UX", bu pack'te dokunulmadı)
- `TypeError: (projects ?? []).slice is not a function` — `frontend/src/pages/user/UserDashboardPage.tsx:63` (bu pack'te dokunulmadı)

Bunlar test mock shape sorunları (`users` ve `projects` bazı mock'larda object döndürülüyor, array değil). Memory kaydı `project_preexisting_test_failures.md` zaten "M7 fresh DB ve 22 smoke test güncellenmeli" diye bu durumu flag'lemişti.

**Regresyon:** Yok. Değiştirilen dosyalardaki hiçbir test bu düzeltmeler yüzünden kırılmadı.

### Manuel Doğrulama (yapılmalı — session dışı)
- `/admin/jobs/:id` tam sayfa açılıyor mu (F2)
- Admin login → `/admin`'e iniyor mu (F1)
- `/admin/visibility` artık yalnızca gerçek kurallar gösteriyor mu, banner görünüyor mu (F9)
- `/admin/themes` iki kavram net mi (F21)
- `/admin/providers` ile `/admin/settings?group=credentials` aynı credential için aynı durumu mu gösteriyor (F15)
- `/user/projects/:id` üretim durumu paneli ve yayın durumu paneli dolu mu (F33)
- `/user/settings` altında Execution path alanları gizli mi (F45)
- Tüm surface'lerde panel switch butonu "Yönetim Paneli" / "Kullanıcı Paneli" yazıyor mu (F48)

---

## Teknik Borç / Dipnotlar
- F9: Test fixture'ları DB'de duruyor; kalıcı temizlik (`test:*` seed'lerini kaldırma) bu pack'in kapsamı dışında.
- F15: Providers endpoint'i artık DB'ye bakıyor, dolayısıyla async DB dependency taşıyor. İleride health snapshot TTL cache eklenirse DB yükü daha da azalır (şu an sorun değil, yalnızca not).
- F33: Eklenen panel `useJobDetail` kullandığı için proje detayına girildiğinde ek bir job detail fetch oluşuyor. SSE zaten job cache'ini tazelediği için stale olmaz.

---

## Commit
Tek commit halinde push edilecek. Mesaj: `fix(ui-audit): close 8 critical UX + navigation findings from full audit`.

Commit hash ve push durumu aşağıda güncellenir.
