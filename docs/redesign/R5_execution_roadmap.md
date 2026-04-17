# FAZ R5 — Uygulama Yol Haritası (REV-2: Tek Dalga / 16 Kalem)

> **Revizyon 2 (2026-04-17, post-R5 kullanıcı kararı):**
> R6 onay kapısı **kaldırıldı**. R7 ayrı faz **kaldırıldı**. Aşağıda listelenen **16 kalemin tamamı bu dalgada (worktree-product-redesign-benchmark) tek seferde** kapatılır. Wizard unification ve approver assignment da dahil. Küçük-büyük ayrımı yok.
>
> **Sıra:** Önce altyapı (P0.x), sonra yüzey (P1.x), sonra sadeleştirme (P2.x), sonra birleştirme + ileri (P3.x). Ama hiçbir kalem "sonraya bırakıldı" diye kapatılmaz.
>
> **Koruma:**
> - Main branch asla bu dalgada merge almaz.
> - Her anlamlı kalem = ayrı commit.
> - Her kalem bitiminde MEMORY.md güncellenir.
> - Her kod değişikliğinde test + typecheck + build + ilgili smoke/integration testleri çalıştırılır, sonuç commit mesajına ve MEMORY.md'ye yazılır.
> - Her checkpoint'te 7 başlıklı kısa Türkçe rapor.
>
> **CLAUDE.md non-negotiable:** No hidden behavior, no hardcoded, Settings Registry üstünden. Dil: Türkçe.

---

## 0. Yönetici Özeti (REV-2)

1. **Toplam 16 iş kalemi** tanımlandı, **4 katmana** ayrıldı: `P0 Altyapı`, `P1 Yüzey`, `P2 Sadeleştirme`, `P3 Birleştirme+İleri`.
2. **Hepsi tek dalgada kapatılır.** R6 onay kapısı yok, R7 ayrı faz yok.
3. **P0 Altyapı:** `useCurrentUser` + `useActiveScope` + `adminScopeStore` + 49 admin sayfa fetch refactor. Her şeyin önkoşulu.
4. **P1 Yüzey:** AdminScopeSwitcher, UserIdentityStrip, AdminDigest, UserDigest.
5. **P2 Sadeleştirme:** Nav yeniden gruplandırma, Analytics tabs, Settings module landing, Calendar unified, PublishBoard toggle, Automation SVG.
6. **P3 Birleştirme+İleri:** 6 duplicate çift birleştirme, approver assignment (Alembic migration dahil), wizard unification (tek motor + iki shell).
7. **Tek backend migration gerektiren kalem:** P3.2 approver assignment. Bu dalgada yapılacak — ayrı faza bırakılmadı.
8. **P0.4 (ESLint scope-key rule)** — opsiyonel tooling, bu dalga kapsamı dışı bırakıldı (bilinçli atlanan). İnsan disiplini + test coverage yeterli.
9. **En yüksek risk:** P0.3 (49 admin sayfa fetch refactor). İçeride P0.3a/b/c alt-kalemlerine bölünür ama aynı dalgada tamamlanır.
10. **En düşük risk + hızlı görünür değer:** P2.2 analytics tabs (3 sayfa → 1 tabbed).
11. **Mobile / PWA** bu dalga kapsamı dışı (MEMORY.md "ileride istenebilecekler" bölümünde).
12. **Uygulama sırası:** Altyapı (P0) → Yüzey (P1) → Sadeleştirme (P2) → Birleştirme (P3). Ama hiçbir kalem "sonra" etiketiyle kapatılmaz.
13. **Checkpoint raporlama:** Her kalem biter bitmez 7 başlıklı Türkçe rapor + MEMORY.md güncellemesi + ayrı commit + push.
14. **Test disiplini:** Her kalem sonunda pytest (backend ilgili modül) + vitest/jest (frontend ilgili) + TypeScript tsc --noEmit + Vite build. Sonuç commit mesajına ve MEMORY.md'ye işlenir.

---

## 1. İş Kalemleri Tablosu (master)

| # | Kalem | Katman | Tür | Backend? | Dep? | Efor | Risk | Bağımlılık | Bağımsız? |
|---|---|---|---|---|---|---|---|---|---|
| **P0.1** | `useCurrentUser()` hook | Altyapı | Yeni | ❌ | ❌ | S | Düşük | — | ✅ |
| **P0.2** | `useActiveScope()` + `adminScopeStore` | Altyapı | Yeni | ❌ | ❌ | S | Düşük | P0.1 | — |
| **P0.3** | Admin sayfa fetch refactor (49 dosya → a/b/c alt-kalem) | Altyapı | Refactor | ❌ | ❌ | **XL** | **Yüksek** | P0.2 | — |
| ~~P0.4~~ | ~~Query key ESLint rule~~ (**bu dalga dışı — bilinçli atlanan**, insan + test yeterli) | Altyapı | Tooling | ❌ | — | — | — | — | — |
| **P1.1** | `AdminScopeSwitcher` component | Yüzey | Yeni | ❌ | ❌ | M | Orta | P0.3 | — |
| **P1.2** | `UserIdentityStrip` component | Yüzey | Yeni | ❌ | ❌ | S | Düşük | P0.1 | — |
| **P1.3** | AdminDigest Dashboard `/admin` | Yüzey | Yeni | 🟡 (ops) | ❌ | M | Orta | P0.3 | — |
| **P1.4** | UserDigest Dashboard `/user` | Yüzey | Yeni | 🟡 (ops) | ❌ | M | Düşük | P0.1 | — |
| **P2.1** | Nav yeniden gruplandırma (Horizon + Classic) | Sadeleştirme | Refactor | ❌ | ❌ | S | Düşük | — | ✅ |
| **P2.2** | Analytics tabs (3 → 1) | Sadeleştirme | Refactor | ❌ | ❌ | M | Düşük | — | ✅ |
| **P2.3** | Settings module landing | Sadeleştirme | Yeni + refactor | ❌ | ❌ | M | Orta | — | ✅ |
| **P2.4** | Calendar unified (list/week/month toggle) | Sadeleştirme | Refactor | ❌ | ❌ | M | Düşük | P3.1 (duplicate) | — |
| **P2.5** | PublishBoard toggle | Sadeleştirme | Yeni | ❌ | ❌ | M | Düşük | — | ✅ |
| **P2.6** | Automation SVG görselleştirme | Sadeleştirme | Yeni | ❌ | ❌ | S | Düşük | — | ✅ |
| **P3.1** | 6 duplicate çift birleştirme | Birleştirme | Refactor | ❌ | ❌ | L | Orta | P0.3 | — |
| **P3.2** | Approver assignment | İleri | Yeni + Alembic migration | ✅ | ❌ | L | Orta | P0.3 | — |
| **P3.3** | Wizard unification (tek motor + iki shell) | İleri | Refactor + yeni | ❌ | ❌ | L | Orta | P0.3 | — |

**Efor skalası:** XS ~1 gün / S ~2-3 gün / M ~1 hafta / L ~2 hafta / XL ~3-4 hafta.
**Risk:** Düşük / Orta / Yüksek (test gerekliliği + etki alanı).

---

## 2. Detay Kalem Kartları

Her kart: **dosya listesi + tür + önkoşul + test + muhtemel yan etkiler + Settings Registry key'leri**.

### 2.1 P0.1 — `useCurrentUser()` hook

**Tür:** Yeni dosya.
**Dosyalar:**
- Yeni: `frontend/src/hooks/useCurrentUser.ts`
- Etkilenen (import ekleme): yok (henüz tüketici yok, P0.2 ve sonrası tüketir)

**Açıklama:** React Query ile `/api/v1/auth/me` endpoint'inden `{id, email, name, role, avatar_url}` döner. Mevcut `useAuthStore`'a alternatif değil; tamamlayıcı (authStore auth state'i, useCurrentUser profile verisi).

**Önkoşul:** Yok.
**Test:** Unit test (React Query mock), 1 test dosyası.
**Yan etki:** Yok. Yeni hook yalnız kullanıldığı yerde çağrılır.
**Settings Registry key:** Yok.
**Efor:** S (~2 gün).
**Risk:** Düşük.

---

### 2.2 P0.2 — `useActiveScope()` + `adminScopeStore`

**Tür:** Yeni dosyalar.
**Dosyalar:**
- Yeni: `frontend/src/stores/adminScopeStore.ts` (Zustand)
- Yeni: `frontend/src/hooks/useActiveScope.ts`

**Açıklama (R3 §4.2'den):** Admin scope'u Zustand'da (`mode: "all" | "user"`, `userId: string | null`). User için useActiveScope her zaman `{ ownerUserId: user.id, isAllUsers: false }` döner. Admin için store state'i okur.

**Önkoşul:** P0.1 (user info için).
**Test:** Unit (Zustand + hook render), 2 test dosyası.
**Yan etki:** Yok (henüz tüketilmiyor).
**Settings Registry key:** Yok.
**Efor:** S.
**Risk:** Düşük.

---

### 2.3 P0.3 — Admin sayfa fetch refactor (49 dosya)

**Tür:** Refactor (mass update).
**Dosyalar:**
- `frontend/src/pages/admin/*.tsx` → 49 sayfa
- Her biri `useActiveScope()` import eder ve fetch'e `owner_user_id` / `scope` geçirir
- Query key pattern: `["jobs", { scope: activeScope }]`

**Örnek before/after:**
```ts
// before
const { data } = useQuery({
  queryKey: ["jobs"],
  queryFn: () => fetchJobs(),
});

// after
const { ownerUserId, isAllUsers } = useActiveScope();
const { data } = useQuery({
  queryKey: ["jobs", { owner_user_id: ownerUserId }],
  queryFn: () => fetchJobs(isAllUsers ? {} : { owner_user_id: ownerUserId }),
});
```

**Önkoşul:** P0.2.
**Test:**
- Unit: fetch fonksiyonlarında param geçişi test (49 sayfa için spot-check)
- Integration: Scope switcher değişiminde cache ayrıştığını doğrula
- Permission test: user A'nın cache'inin B'ye sızmadığını doğrula (rastgele 3 sayfada)

**Yan etki:**
- TypeScript tip değişikliği olabilir (fetch functions)
- Tüm admin sayfaları aynı anda değişir — **büyük PR/commit riski**; R6'da alt-kalemlere bölünebilir

**Settings Registry key:** `admin.scope_switcher.enabled` (default true).
**Efor:** **XL** (~3-4 hafta).
**Risk:** **Yüksek** (test coverage + regression).

**Bölünme (bu dalgada zorunlu, ayrı ayrı commit):**
- **P0.3a — Çekirdek (4 alan):** Jobs, Publish, Channels, Automation — kritik data leak yüzeyleri
- **P0.3b — İkincil (3 alan):** Analytics, Calendar, Audit — orta yoğunluk
- **P0.3c — Kalan (35+ sayfa):** Stabilizasyon — geri kalan admin sayfaları

Her alt-kalem: ayrı commit + test + typecheck + build + permission test + smoke. Hepsi bu dalgada bitecek.

---

### 2.4 P0.4 — Query key discipline (eslint rule opsiyonel)

**Tür:** Tooling.
**Dosyalar:**
- Yeni: `frontend/eslint-plugin-scope-key/` (isteğe bağlı)
- `frontend/.eslintrc.cjs` güncellemesi

**Açıklama:** Query key'lerde `scope`/`owner_user_id` içermeyen çağrıları warn/error seviyesine çıkar. Opsiyonel — disiplin insani da sağlanabilir.

**Önkoşul:** P0.3.
**Test:** ESLint snapshot test.
**Settings Registry key:** Yok.
**Efor:** M.
**Risk:** Orta (false-positive riski).

**Karar (REV-2):** Bu dalga dışı — bilinçli atlanan. İnsan disiplini + test coverage yeterli.

---

### 2.5 P1.1 — AdminScopeSwitcher component

**Tür:** Yeni component.
**Dosyalar:**
- Yeni: `frontend/src/components/layout/AdminScopeSwitcher.tsx`
- Güncellenen: `frontend/src/app/layouts/HorizonAdminLayout.tsx` (header slot)
- Güncellenen: `frontend/src/app/layouts/AdminLayout.tsx` (header slot, opsiyonel)

**Açıklama:** R4 §2.1'den. Dropdown + icon + state.

**Önkoşul:** P0.3.
**Test:**
- Unit: render + mode toggle + user list render
- Integration: scope değiştiğinde invalidateQueries tetiklendiğini doğrula
- Permission: admin olmayan kullanıcıda görünmediğini doğrula

**Yan etki:** Header'a 1 yeni element; layout test dosyaları güncellenebilir.
**Settings Registry key:** `admin.scope_switcher.enabled`, `admin.scope_switcher.default` (`all` / `last_used`).
**Efor:** M.
**Risk:** Orta (cache contamination test kritik).

---

### 2.6 P1.2 — UserIdentityStrip component

**Tür:** Yeni component.
**Dosyalar:**
- Yeni: `frontend/src/components/layout/UserIdentityStrip.tsx`
- Güncellenen: `frontend/src/app/layouts/HorizonUserLayout.tsx`
- Güncellenen: `frontend/src/app/layouts/UserLayout.tsx`

**Açıklama:** R4 §2.2'den. Sticky 40px bar.

**Önkoşul:** P0.1.
**Test:** Unit render + avatar placeholder + notification counter bağlanımı.
**Settings Registry key:** `user.identity_strip.enabled` (default true).
**Efor:** S.
**Risk:** Düşük.

---

### 2.7 P1.3 — AdminDigest Dashboard

**Tür:** Yeni sayfa.
**Dosyalar:**
- Yeni: `frontend/src/pages/admin/AdminDashboardPage.tsx` (mevcut "Genel Bakış" placeholder replace)
- Yeni: `frontend/src/components/dashboard/StatTileGrid.tsx`
- Yeni: `frontend/src/components/dashboard/RecentJobsWidget.tsx`
- Yeni: `frontend/src/components/dashboard/ChannelHealthWidget.tsx`
- Yeni: `frontend/src/components/dashboard/AutomationRunsWidget.tsx`

**Açıklama:** R4 §2.3'ten. 4 stat tile + son 10 iş + kanal sağlığı + otomasyon koşuları.

**Backend:** Başlangıçta client-side parallel React Query fetch ile mevcut endpoint'ler. Performans sorunu olursa R6 sonrası `/api/v1/dashboard/admin/digest` opsiyonel (optimization).

**Önkoşul:** P0.3.
**Test:**
- Unit: her widget render
- Integration: scope değiştiğinde sayıların güncellendiği doğrulanır

**Settings Registry key:**
- `dashboard.admin.widget.failed_jobs.enabled`
- `dashboard.admin.widget.pending_review.enabled`
- `dashboard.admin.widget.retry_candidates.enabled`
- `dashboard.admin.widget.publish_queue.enabled`
- `dashboard.admin.widget.recent_jobs.enabled`
- `dashboard.admin.widget.channel_health.enabled`
- `dashboard.admin.widget.automation_runs.enabled`

**Efor:** M.
**Risk:** Orta (widget çoğaldıkça perf).

---

### 2.8 P1.4 — UserDigest Dashboard

**Tür:** Yeni sayfa.
**Dosyalar:**
- Yeni: `frontend/src/pages/user/UserDashboardPage.tsx`
- Yeni: kullanıcı-scope'lu widget'lar (`MyChannelsWidget`, `AutomationSummaryWidget`, vb.)

**Açıklama:** R4 §2.4'ten. User scope'ta 4 stat + kanal listesi + otomasyon özeti.

**Önkoşul:** P0.1 (P0.3 değil, kullanıcı zaten hep kendi scope'unda).
**Test:** Unit + integration (kullanıcı değiştiğinde veri değişir).
**Settings Registry key:** `dashboard.user.widget.*.enabled` (7 entry).
**Efor:** M.
**Risk:** Düşük.

---

### 2.9 P2.1 — Nav yeniden gruplandırma

**Tür:** Refactor.
**Dosyalar:**
- `frontend/src/app/layouts/useLayoutNavigation.ts` (4 export güncellemesi)

**Açıklama:** R3 §2 + §3. `ADMIN_NAV`, `HORIZON_ADMIN_GROUPS`, `USER_NAV`, `HORIZON_USER_GROUPS` dört array.

**Önkoşul:** Yok (bağımsız).
**Test:** Nav render test (layout component), visibility filtre test.
**Yan etki:** Kullanıcılar sidebar'da farklı sıralama görür — UX değişim; release notes ile duyurulmalı.
**Settings Registry key:** `panel:calendar`, `panel:dashboard` (yeni visibility keyleri).
**Efor:** S.
**Risk:** Düşük.

---

### 2.10 P2.2 — Analytics tabs

**Tür:** Refactor + birleşim.
**Dosyalar:**
- Yeni: `frontend/src/pages/admin/AnalyticsHubPage.tsx` (TabBar + tab içerik)
- Refactor: `AnalyticsOverviewPage.tsx`, `AnalyticsContentPage.tsx`, `AnalyticsOperationsPage.tsx` → `components/analytics/AnalyticsOverviewContent.tsx`, vb.
- Refactor: `AdminYouTubeAnalyticsPage.tsx` → `components/analytics/YouTubeAnalyticsContent.tsx`
- `frontend/src/app/routes.tsx` (nested route)

**Eski URL redirect:**
- `/admin/analytics/youtube` → `/admin/analytics/youtube` (tab ID aynı, URL yapısı değişebilir)
- Nav giriş "YouTube Analytics" kaldırıldı, Analytics ana sayfasının tab'ına gidiyor

**Önkoşul:** Yok (bağımsız).
**Test:**
- Tab navigation render
- Her tab content'i ayrı unit test
- URL deep-link → doğru tab açılıyor

**Settings Registry key:** Yok (mevcut `panel:analytics` yeter).
**Efor:** M.
**Risk:** Düşük.

---

### 2.11 P2.3 — Settings module landing

**Tür:** Yeni + refactor.
**Dosyalar:**
- Yeni: `frontend/src/pages/admin/SettingsLandingPage.tsx`
- Refactor: `frontend/src/pages/admin/SettingsRegistryPage.tsx` (group filtresi URL parametresinden okur)
- `frontend/src/app/routes.tsx` (nested route `/admin/settings/:group?`)

**Önkoşul:** Yok.
**Test:**
- Landing render (grup kart sayısı)
- Grup sayfası filtre doğruluğu
- Eski URL redirect

**Settings Registry key:** Yok.
**Efor:** M.
**Risk:** Orta (bookmark kırılımı).

---

### 2.12 P2.4 — Calendar unified (toggle)

**Tür:** Refactor.
**Dosyalar:**
- Yeni: `frontend/src/pages/shared/CalendarView.tsx` (ortak component)
- Güncellenen: `pages/admin/AdminCalendarPage.tsx` → shell
- Güncellenen: `pages/user/UserCalendarPage.tsx` → shell
- Yeni: `components/calendar/CalendarListView.tsx`

**Önkoşul:** Yok (bağımsız).
**Test:**
- Liste/Hafta/Ay toggle render
- Scope prop'u doğru geçiyor

**Settings Registry key:** `user.calendar.default_view` (`list` / `week` / `month`).
**Efor:** M.
**Risk:** Düşük.

---

### 2.13 P2.5 — PublishBoard toggle

**Tür:** Yeni + mevcut sayfa genişleme.
**Dosyalar:**
- Güncellenen: `pages/admin/PublishCenterPage.tsx` (ViewToggle ekle)
- Yeni: `components/publish/PublishBoard.tsx`
- Yeni: `components/publish/PublishBoardColumn.tsx`
- Yeni: `components/publish/PublishCard.tsx`

**Önkoşul:** Yok.
**Test:**
- Board render (status bazlı kolon)
- Toggle state persist (localStorage veya URL)

**Settings Registry key:** `publish.center.board_view.enabled` (default true), `publish.center.default_view` (`list` / `board`).
**Efor:** M.
**Risk:** Düşük (drag-drop yok; yalnız görüntüleme).

---

### 2.14 P2.6 — Automation SVG

**Tür:** Yeni component.
**Dosyalar:**
- Yeni: `components/automation/AutomationFlowSvg.tsx` (raw SVG)
- Güncellenen: `pages/user/UserAutomationPage.tsx` (SVG entegre et)

**Önkoşul:** Yok.
**Test:**
- Unit: her checkpoint mode'a göre renk doğru
- Accessibility: `<title>` + `<desc>` + keyboard dropdown ana yol

**Settings Registry key:** `user.automation.flow_visual.enabled` (default true).
**Efor:** S.
**Risk:** Düşük.

---

### 2.15 P3.1 — 6 duplicate çift birleştirme

**Tür:** Refactor (dosya silme + yeni ortak component).
**Dosyalar (6 çift):**
1. Calendar — ortak `CalendarView` zaten P2.4'te yapılıyor ✓
2. Connections — admin = read-only shell, user = CRUD; component ayrı kalır
3. Inbox — ortak `InboxView` component + 2 route
4. JobDetail — ortak `JobDetailView` component + 2 route
5. YouTubeAnalytics — P2.2'de Analytics tab altına alınır
6. YouTubeCallback — tek route `/oauth/youtube/callback`

**Önkoşul:** P0.2 (scope hook bekliyor).
**Test:**
- Her çift için admin + user render
- Permission/visibility test (user admin-only field'ları görmemeli)

**Settings Registry key:** Yok (Visibility Engine field-level kontrol).
**Efor:** L (~2 hafta).
**Risk:** Orta (field visibility test matrisi büyük).

---

### 2.16 P3.2 — Approver assignment

**Tür:** Yeni alan + migration + UI.
**Dosyalar:**
- Backend: `backend/app/automation/models.py` (AutomationPolicy yeni `approver_user_id`)
- Backend: yeni Alembic migration (`approver_assignment_to_automation_policies`)
- Backend: `backend/app/automation/service.py` publish yolu approver kontrolü
- Frontend: `UserAutomationPage.tsx` approver dropdown
- Frontend: `PublishReviewQueuePage.tsx` "sadece bana atanan" filtresi

**Önkoşul:** P0.3 (scope-aware fetch).
**Test:**
- Backend: migration rollback test + fresh-DB upgrade test + approver-only visibility test
- Frontend: approver seçim + filtre + permission test

**Settings Registry key:** `automation.approver_assignment.enabled` (default false).
**Efor:** L.
**Risk:** Orta.

**Karar (REV-2):** Bu kalem **bu dalgada yapılacak**. Ayrı faza ertelenmedi. Alembic migration bu dalgada çalıştırılır (fresh-DB + rollback testi şart).

---

### 2.17 P3.3 — Wizard Unification (tek motor + iki shell)

**Tür:** Yeni engine + shell + mevcut wizard schema'ya konversiyon.
**Dosyalar:**
- Yeni: `frontend/src/wizard/engine/WizardEngine.ts` (step registry + state machine)
- Yeni: `frontend/src/wizard/engine/WizardStepSchema.ts` (TypeScript DSL)
- Yeni: `frontend/src/wizard/engine/useWizardSnapshot.ts` (snapshot-lock hook)
- Yeni: `frontend/src/wizard/shells/AdminWizardShell.tsx`
- Yeni: `frontend/src/wizard/shells/UserWizardShell.tsx`
- Yeni: `frontend/src/wizard/schemas/standardVideo.schema.ts`
- Yeni: `frontend/src/wizard/schemas/newsBulletin.schema.ts`
- Yeni: `frontend/src/wizard/schemas/productReview.schema.ts`
- Yeni: `frontend/src/wizard/schemas/educational.schema.ts`
- Yeni: `frontend/src/wizard/schemas/howto.schema.ts`
- Güncellenen / sadeleştirilen: `frontend/src/pages/admin/StandardVideoWizardPage.tsx`, `NewsBulletinWizardPage.tsx`, `ProductReviewWizardPage.tsx`, `EducationalWizardPage.tsx`, `HowtoWizardPage.tsx`
- User muadilleri: `frontend/src/pages/user/CreateBulletinPage.tsx` vb. — User shell üstünden schema'yı tüketir

**Açıklama:** R3'teki karar doğrultusunda, wizard'lar tek engine üstünde çalışır. Admin shell tam form + validation + versiyonlama; user shell guided mod + Visibility Engine üstünden Advanced toggle.

**Parity test (zorunlu):** Her wizard için eski davranış = yeni davranış testi. Snapshot, field sırası, validation mesajları, step geçişleri aynı kalmalı.

**Önkoşul:** P0.3 (scope-aware) + mevcut snapshot-lock davranışı korunmalı.
**Test:**
- Unit: Engine state machine + schema parsing + step transitions
- Integration: Her wizard için end-to-end flow (admin + user shell)
- Permission: User advanced toggle Visibility Engine'e bağlı (frontend filter tek başına yetmez)
- Visibility: Field-level visibility matrisi
- Smoke: Her wizard için 1 tam job oluşturma
- Parity: Eski wizard behavior snapshot = yeni wizard behavior snapshot

**Settings Registry key:**
- `wizard.engine.v2.enabled` (default true — yeni engine)
- `wizard.{module}.advanced_mode.default` (per-module advanced mod başlangıç)
- `wizard.{module}.guided_mode.steps` (visible step list)

**Efor:** L.
**Risk:** Orta (parity testi olmadan legacy wizard kaldırılırsa yüksek).

---

## 3. Bağımsız Yapılabilir Kalemler (paralel potansiyeli)

REV-2'de 16 kalemin tamamı yapılacak, ama sıralama için bu ayrım hâlâ yararlı. Aşağıdaki 7 kalem **bağımsız** uygulanabilir ve P0 tamamlanmasını beklemez:

| # | Kalem | Efor | Neden bağımsız? |
|---|---|---|---|
| P0.1 | useCurrentUser hook | S | Yeni hook, tüketici yok |
| P2.1 | Nav yeniden gruplandırma | S | useLayoutNavigation güncelleme, 4 array |
| P2.2 | Analytics tabs | M | Mevcut sayfaları tab content'e refactor |
| P2.3 | Settings module landing | M | URL parametresi + landing |
| P2.5 | PublishBoard toggle | M | Mevcut sayfaya alternatif görünüm |
| P2.6 | Automation SVG | S | SVG + mevcut dropdown |

**Not:** `AdminScopeSwitcher` + `UserIdentityStrip` gibi "kimlik" component'leri bağımsız değil — P0 altyapı gerekli. `P2.4 Calendar unified` da P3.1 duplicate cleanup öncesinde yarım iş olur, onun için zincire bağlandı.

---

## 4. Zincir Kalemler (önkoşul + takip)

| Kalem | Önkoşul | Neden |
|---|---|---|
| P0.2 | P0.1 | user info gerekli |
| P0.3 | P0.2 | scope hook gerekli |
| P1.1 | P0.3 | scope hook + admin fetch refactored |
| P1.2 | P0.1 | user info yeterli |
| P1.3 | P0.3 | admin scope-aware widgets |
| P1.4 | P0.1 | user info yeterli |
| P2.4 | P3.1 | duplicate cleanup öncesinde yarım kalır |
| P3.1 | P0.3 | scope hook + admin fetch refactored |
| P3.2 | P0.3 | scope + Alembic migration (bu dalgada) |
| P3.3 | P0.3 | wizard shell'leri scope-aware olmalı |

**Zincir uzunluk:** P0.1 → P0.2 → P0.3 → P1.1 → P1.3. En uzun 5 adım.

---

## 5. Test Katmanı Haritası

Her kalem hangi test sınıflarına girer?

| Kalem | Unit | Integration | Permission | Visibility | Smoke | Migration |
|---|---|---|---|---|---|---|
| P0.1 | ✅ | — | — | — | — | — |
| P0.2 | ✅ | — | — | — | — | — |
| P0.3 | ✅ | ✅ | ✅ | — | ✅ | — |
| P1.1 | ✅ | ✅ | ✅ | — | ✅ | — |
| P1.2 | ✅ | — | — | — | ✅ | — |
| P1.3 | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| P1.4 | ✅ | ✅ | — | ✅ | ✅ | — |
| P2.1 | ✅ | — | — | ✅ | ✅ | — |
| P2.2 | ✅ | ✅ | — | — | ✅ | — |
| P2.3 | ✅ | ✅ | — | — | ✅ | — |
| P2.4 | ✅ | ✅ | — | — | ✅ | — |
| P2.5 | ✅ | ✅ | — | — | ✅ | — |
| P2.6 | ✅ | — | — | — | ✅ | — |
| P3.1 | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| P3.2 | ✅ | ✅ | ✅ | — | ✅ | ✅ |
| P3.3 | ✅ | ✅ | ✅ | ✅ | ✅ | — |

**Test tür sayısı:** Minimum unit + smoke; maksimum tüm kategoriler.

---

## 6. Risk Tablosu Özeti

| Risk | Hangi kalem | Mitigation |
|---|---|---|
| Cache contamination (user A verisi user B'ye sızar) | P0.3, P1.1 | Query key pattern + test |
| Regression (49 dosya toplu refactor) | P0.3 | Alt-kalem bölme + her alt-kalem ayrı PR |
| UX değişim şoku (sidebar yeniden gruplandı) | P2.1 | Release notes + visibility flag ile rollback |
| Bookmark kırılımı (settings URL değişti) | P2.3 | 301 redirect + release notes |
| Field visibility matrisi büyük | P3.1 | Her çift için yazılı visibility test matrisi |
| Migration rollback ciddi test ister | P3.2 | Alembic `downgrade` testi + fresh-DB upgrade testi (bu dalgada zorunlu) |
| Wizard engine refactor geniş yüzeylendirme | P3.3 | Parity test (eski davranış = yeni davranış) + step-by-step schema konverter |
| Performance (digest dashboard çoklu fetch) | P1.3, P1.4 | Parallel fetch + opsiyonel custom endpoint |

---

## 7. Uygulama Sırası (REV-2: Onay kapısı yok)

**Tek dalga / 16 kalem / doğru sıra.** Kullanıcı her kalem için tekrar onay vermez; sadece anlamlı checkpoint'lerde 7 başlıklı Türkçe rapor alır.

**Sıra:**
1. P0.1 — useCurrentUser hook
2. P0.2 — useActiveScope + adminScopeStore
3. P0.3a — Admin fetch refactor (Jobs / Publish / Channels / Automation)
4. P0.3b — Admin fetch refactor (Analytics / Calendar / Audit)
5. P0.3c — Admin fetch refactor (kalan 35+ sayfa stabilizasyon)
6. P1.1 — AdminScopeSwitcher component
7. P1.2 — UserIdentityStrip component
8. P1.3 — AdminDigest Dashboard
9. P1.4 — UserDigest Dashboard
10. P2.1 — Nav yeniden gruplandırma
11. P2.2 — Analytics tabs (3 → 1 sayfa)
12. P2.3 — Settings module landing
13. P3.1 — 6 duplicate çift birleştirme (P2.4'ten önce)
14. P2.4 — Calendar unified
15. P2.5 — PublishBoard toggle
16. P2.6 — Automation SVG görselleştirme
17. P3.2 — Approver assignment (Alembic migration + UI)
18. P3.3 — Wizard unification (tek motor + iki shell)
19. **Final regresyon:** test + typecheck + build + smoke + permission + visibility. Sonuçlar MEMORY.md'ye.

**Her kalem için:**
1. Kod yazımı + R4 preview dosyası (varsa referans)
2. İlgili test kategorileri çalıştırılır (pytest / vitest / tsc / vite build)
3. Sonuç commit mesajına ve MEMORY.md'ye yazılır
4. Commit + push
5. Anlamlı checkpoint'te 7 başlıklı Türkçe rapor kullanıcıya

**Main branch'e dokunulmaz**, worktree-product-redesign-benchmark dalında kalınır.

---

## 8. Wizard Unification (P3.3 — bu dalgada)

REV-2: wizard unification ayrı faza ertelenmedi, bu dalga kapsamında.

**Kapsam:**
- `StandardVideoWizardPage.tsx` (1409 LoC) + `NewsBulletinWizardPage.tsx` + diğer wizard'lar tek bir engine'e oturur
- Engine: step registry + state machine + snapshot-lock hook'lu
- Schema DSL: `WizardStepSchema<T>` (TypeScript)
- Shell: `AdminWizardShell` + `UserWizardShell` (Visibility Engine bağlantılı)
- User shell: guided mode varsayılan; Advanced toggle'ı Visibility Engine üstünden
- Admin shell: full form + validation + versiyonlama (snapshot-lock)

**Parity test zorunlu:** Mevcut wizard'ın tüm çıktıları aynı kalmalı (snapshot, validation, adım sırası, field isimleri).

**Uygulama sırası (P3.3 iç):**
1. Engine skeleton (`frontend/src/wizard/engine/*`)
2. Shell skeleton (Admin + User)
3. StandardVideoWizard → schema'ya çevir + parity test
4. NewsBulletinWizard → schema'ya çevir + parity test
5. ProductReview / Educational / Howto wizard'larını dahil et
6. Legacy wizard dosyaları sadeleşir veya kaldırılır (ayrı commit)

**Snapshot lock:** Job başladığında `effective_settings_snapshot_id` alanı yazılır (mevcut davranış korunur). Wizard engine değişimi bu kuralı bozmaz.

---

## 9. Göz Ardı Edilemeyecek Mimari Kurallar (tekrar)

R6 gerçek implementasyon başlarken her kalem için:
- CLAUDE.md non-negotiable rules → hidden behavior yok
- Settings Registry'ye bağlı (her özellik gate'lenebilir)
- Visibility Engine server-side enforce (frontend filter tek başına yetmez)
- React Query/Zustand ayrımı bozulmayacak
- Remotion composition mapping dokunulmayacak
- Alembic tek migration otoritesi
- Test + docs + commit checkpoint zorunlu
- Main branch dokunulmuyor (bu dalga boyu)

---

## 10. R5 REV-2 Teslim Raporu (7 Başlık)

### 10.1 Ne yaptın
R5 planını REV-2'ye revize ettim. R6 onay kapısı + R7 ayrı faz mantığı kaldırıldı. 16 kalem tek dalgada tamamlanacak şekilde tabloya P3.3 wizard unification eklendi, P0.4 ESLint rule bilinçli atlanan olarak işaretlendi. Uygulama sırası netleştirildi (§7), wizard unification kapsamı yazıldı (§8), risk tablosu güncellendi (§6).

### 10.2 Hangi dosyaları okudun / değiştirdin
- **Okundu:** Mevcut R5 dosyası (full scan)
- **Yazıldı:** `docs/redesign/R5_execution_roadmap.md` (REV-2), `docs/redesign/MEMORY.md` (yeni karar bölümü sonraki commit'te)

### 10.3 Hangi testleri çalıştırdın
R5 REV-2 revizyon fazı — kod değişikliği yok (sadece doküman). `git diff --stat backend/ frontend/ renderer/` boş kalmaya devam ediyor.

### 10.4 Sonuç ne oldu
REV-2 aktif. Artık uygulamaya başlıyorum: P0.1 → P0.2 → P0.3a/b/c → P1.x → P2.x → P3.x → final regresyon. Her kalem bitiminde ayrı commit + test sonucu + 7 başlıklı rapor + MEMORY.md güncelleme.

### 10.5 Bulduğun ek riskler (REV-2)
- P0.3 (49 dosya) hâlâ en ağır; a/b/c bölünmesi zorunlu ama aynı dalga içinde.
- P3.2 Alembic migration'ı fresh-DB + rollback testi ister.
- P3.3 wizard parity testi yazılmadan legacy wizard kaldırılmamalı.
- Mobile/PWA yine scope dışı (ileride istenebilecekler).

### 10.6 Commit hash
R5 REV-2 revizyon commit'i bu Edit dalgası sonrası.

### 10.7 Push durumu
Her commit sonrası `origin/worktree-product-redesign-benchmark` dalına push. Main'e dokunulmuyor.

---

## 11. code change: none

```
git diff --stat backend/ frontend/ renderer/
# (boş)
```

CLAUDE.md:
- Main branch'e dokunma yok
- Hiçbir backend/frontend kaynak kodu değişmedi
- Settings Registry key önerileri yapıldı; hiçbir hardcoded davranış planlanmadı
- Test kategorileri her kalem için belirtildi

---

## 12. Uygulama Başlangıcı (REV-2)

R6 onay kapısı yok. R7 ayrı faz yok.

Bu revizyon commit'inden hemen sonra P0.1 ile implementasyon başlar:
- P0.1 → P0.2 → P0.3a → P0.3b → P0.3c → P1.1 → P1.2 → P1.3 → P1.4 → P2.1 → P2.2 → P2.3 → P3.1 → P2.4 → P2.5 → P2.6 → P3.2 → P3.3 → final regresyon
- Her kalem ayrı commit + push
- Test + typecheck + build sonuçları her commit mesajına ve MEMORY.md'ye
- Her kalem bitiminde 7 başlıklı Türkçe rapor
- Main branch'e dokunulmaz

---

**Doküman sonu. Uygulamaya geçiliyor.**
