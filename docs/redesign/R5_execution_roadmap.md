# FAZ R5 — Uygulama Yol Haritası

> **Amaç:** R3 IA + R4 preview planlarını somut iş kalemlerine dönüştürmek. Her kalem için: dosya etkisi, efor, risk, önkoşul, test sınıfı, bağımsız-mı-yoksa-zincir-mi bilgisi. R6 onay kapısında kullanıcı **tek kalem** seçip "bunu uygula" diyebilir.
>
> **Tekrar:** Bu R5 kod YAZMAZ. R6 onay olmadan hiçbir backend/frontend/renderer dosyası değişmez.
> **Koruma:** Main branch asla bu dalgada merge almaz. R6 sonrası ayrı merge dalgası.
> **Hatırlatma:** CLAUDE.md non-negotiable — no hidden behavior, no hardcoded, Settings Registry üstünden.

---

## 0. Yönetici Özeti (12 Madde)

1. **Toplam 14 iş kalemi** tanımlandı, **4 katmana** ayrıldı: `P0 Altyapı`, `P1 Yüzey`, `P2 Sadeleştirme`, `P3 Birleştirme+İleri`.
2. **P0 Altyapı (temel zorunluluk):** `useCurrentUser/useActiveScope` + `adminScopeStore` + query key discipline. Diğer tüm kalemlerin önkoşulu.
3. **P1 Yüzey (görünür yenilik):** AdminScopeSwitcher, UserIdentityStrip, AdminDigest, UserDigest. P0 üstüne oturur.
4. **P2 Sadeleştirme (IA taşıma):** Nav yeniden gruplandırma, Analytics tabs, Settings landing, Calendar unified, PublishBoard toggle, Automation SVG.
5. **P3 Birleştirme+İleri:** 6 duplicate çift birleştirme, wizard canon önceliklendirmesi.
6. **Tek backend migration gerektiren kalem:** "Approver assignment" (R6 dışı, R7+'a bırakıldı).
7. **Bağımsız-kalem sayısı:** 7. (Diğer 7, P0 zincirine bağlı.)
8. **En düşük risk + en yüksek görünür değer:** "Analytics tabs" (3 sayfa → 1 sayfa). Tek kullanıcı seçerse bile anlamlı UX yükseliş.
9. **En yüksek risk:** "AdminScopeSwitcher discipline" (49 admin sayfada fetch refactor). Ama P0 olduğu için önce yapılır.
10. **Wizard canon (tek motor + iki shell)** R6 kapsamı dışı, **Faz R7 Wizard Unification** ayrı dalga.
11. **Mobile / PWA** hâlâ kapsam dışı.
12. **R6 onay kapısı davranışı:** Kullanıcı 1-N kalem seçer, onay verir, o kalem(ler) bir branch/commit dizisinde uygulanır. Reddedilen kalem MEMORY.md'ye yazılır.

---

## 1. İş Kalemleri Tablosu (master)

| # | Kalem | Katman | Tür | Backend? | Dep? | Efor | Risk | Bağımlılık | Bağımsız? |
|---|---|---|---|---|---|---|---|---|---|
| **P0.1** | `useCurrentUser()` hook | Altyapı | Yeni | ❌ | ❌ | S | Düşük | — | ✅ |
| **P0.2** | `useActiveScope()` + `adminScopeStore` | Altyapı | Yeni | ❌ | ❌ | S | Düşük | P0.1 | — |
| **P0.3** | Admin sayfa fetch refactor (49 dosya) | Altyapı | Refactor | ❌ | ❌ | **XL** | **Yüksek** | P0.2 | — |
| **P0.4** | Query key pattern discipline (eslint rule opsiyonel) | Altyapı | Refactor | ❌ | Opsiyonel | M | Orta | P0.3 | — |
| **P1.1** | `AdminScopeSwitcher` component | Yüzey | Yeni | ❌ | ❌ | M | Orta | P0.3 | — |
| **P1.2** | `UserIdentityStrip` component | Yüzey | Yeni | ❌ | ❌ | S | Düşük | P0.1 | — |
| **P1.3** | AdminDigest Dashboard `/admin` | Yüzey | Yeni | 🟡 (ops) | ❌ | M | Orta | P0.3 | — |
| **P1.4** | UserDigest Dashboard `/user` | Yüzey | Yeni | 🟡 (ops) | ❌ | M | Düşük | P0.1 | — |
| **P2.1** | Nav yeniden gruplandırma (Horizon + Classic) | Sadeleştirme | Refactor | ❌ | ❌ | S | Düşük | — | ✅ |
| **P2.2** | Analytics tabs (3 → 1) | Sadeleştirme | Refactor | ❌ | ❌ | M | Düşük | — | ✅ |
| **P2.3** | Settings module landing | Sadeleştirme | Yeni + refactor | ❌ | ❌ | M | Orta | — | ✅ |
| **P2.4** | Calendar unified (list/week/month toggle) | Sadeleştirme | Refactor | ❌ | ❌ | M | Düşük | — | ✅ |
| **P2.5** | PublishBoard toggle | Sadeleştirme | Yeni | ❌ | ❌ | M | Düşük | — | ✅ |
| **P2.6** | Automation SVG görselleştirme | Sadeleştirme | Yeni | ❌ | ❌ | S | Düşük | — | ✅ |
| **P3.1** | 6 duplicate çift birleştirme | Birleştirme | Refactor | ❌ | ❌ | L | Orta | P0.2 | — |
| **P3.2** | Approver assignment | İleri (R7?) | Yeni + migration | ✅ | ❌ | L | Orta | P0.3 + Alembic | — |

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

**Bölünme önerisi (R6'da):**
- P0.3a: Jobs, Publish, Channels, Automation (top-4 — çekirdek)
- P0.3b: Analytics, Calendar, Audit (ikinci)
- P0.3c: Geri kalan 35 sayfa (stabilizasyon)

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

**Öneri:** R6 dahilinde YAPILMAZ. R7 sonrası iyileştirme.

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

### 2.16 P3.2 — Approver assignment (R7?)

**Tür:** Yeni alan + migration + UI.
**Dosyalar:**
- Backend: `backend/app/automation/models.py` (AutomationPolicy yeni `approver_user_id`)
- Backend: yeni Alembic migration
- Backend: `backend/app/automation/service.py` publish yolu approver kontrolü
- Frontend: `UserAutomationPage.tsx` approver dropdown
- Frontend: `PublishReviewQueuePage.tsx` "sadece bana atanan" filtresi

**Önkoşul:** P0.3 + Alembic çalıştırma izni.
**Test:**
- Backend: migration rollback test, approver-only visibility
- Frontend: approver seçim + filtre

**Settings Registry key:** `automation.approver_assignment.enabled` (default false).
**Efor:** L.
**Risk:** Orta.

**Kullanıcı kararına muhtemel ileri:** Bu kalem **R6 kapsamı DIŞI** öneriliyor — Faz R7 veya sonrası.

---

## 3. Bağımsız Yapılabilir Kalemler (R6 onay kapısı için)

Kullanıcı "şunu yapalım" diyebilir. Aşağıdaki 7 kalem **bağımsız** uygulanabilir:

| # | Kalem | Efor | Neden bağımsız? |
|---|---|---|---|
| P0.1 | useCurrentUser hook | S | Yeni hook, tüketici yok |
| P2.1 | Nav yeniden gruplandırma | S | useLayoutNavigation güncelleme, 4 array |
| P2.2 | Analytics tabs | M | Mevcut sayfaları tab content'e refactor |
| P2.3 | Settings module landing | M | URL parametresi + landing |
| P2.4 | Calendar toggle | M | Mevcut calendar'a list view + hafta/ay |
| P2.5 | PublishBoard toggle | M | Mevcut sayfaya alternatif görünüm |
| P2.6 | Automation SVG | S | SVG + mevcut dropdown |

**Not:** `AdminScopeSwitcher` + `UserIdentityStrip` gibi "kimlik" component'leri bağımsız değil — P0 altyapı gerekli.

---

## 4. Zincir Kalemler (önkoşul + takip)

| Kalem | Önkoşul | Neden |
|---|---|---|
| P0.2 | P0.1 | user info gerekli |
| P0.3 | P0.2 | scope hook gerekli |
| P0.4 | P0.3 | refactor tamamlanmalı |
| P1.1 | P0.3 | scope hook + admin fetch refactored |
| P1.2 | P0.1 | user info yeterli |
| P1.3 | P0.3 | admin scope-aware widgets |
| P1.4 | P0.1 | user info yeterli |
| P3.1 | P0.2 | scope hook gerekli |
| P3.2 | P0.3 + migration | scope + backend field |

**Zincir uzunluk:** P0.1 → P0.2 → P0.3 → P1.1 → P1.3. En uzun 5 adım.

---

## 5. Test Katmanı Haritası

Her kalem hangi test sınıflarına girer?

| Kalem | Unit | Integration | Permission | Visibility | Smoke | Migration |
|---|---|---|---|---|---|---|
| P0.1 | ✅ | — | — | — | — | — |
| P0.2 | ✅ | — | — | — | — | — |
| P0.3 | ✅ | ✅ | ✅ | — | ✅ | — |
| P0.4 | ✅ | — | — | — | — | — |
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
| Migration rollback ciddi test ister | P3.2 | R7'ye ertele |
| Performance (digest dashboard çoklu fetch) | P1.3, P1.4 | Parallel fetch + opsiyonel custom endpoint |

---

## 7. R6 Onay Kapısı Protokolü

**Kullanıcıya sorulacak:**

> "Aşağıdaki 14 kalem var. Hangi birini (veya birkaçını) ilk olarak uygulayalım?
> - Bağımsız yapılabilir (önkoşul yok): P0.1, P2.1, P2.2, P2.3, P2.4, P2.5, P2.6
> - En düşük risk + yüksek değer: **P2.2 (Analytics tabs)** veya **P2.1 (Nav yeniden gruplandırma)**
> - Temel altyapı (uzun zincir açar): **P0.1 → P0.2 → P0.3 (çok ağır)**
> - R6 dışında öneri: P3.2 (Approver assignment, migration ister)
> - Faz R7 önerisi: Wizard engine unification"

**Kullanıcı seçim yaptıktan sonra yapılacaklar:**
1. Seçilen kalem için sub-branch oluşturulur (main'e dokunmaz, worktree-product-redesign-benchmark üstüne)
2. R4'teki preview dosyaları oluşturulur (eğer yoksa)
3. Seçilen kalemin gerçek component/sayfa/hook dosyaları yazılır
4. İlgili test kategorileri çalıştırılır
5. Pass olursa commit + push
6. MEMORY.md güncellenir (seçim + sonuç)
7. Merge main'e SADECE kullanıcı ayrı talep ederse (bu dalganın kuralı)

**Reddedilen kalem olursa:** MEMORY.md'ye yazılır (tarih + sebep).

---

## 8. Wizard Unification (Faz R7 notu)

R3'te karar: "tek motor + iki shell". Ama:
- `StandardVideoWizardPage.tsx` 1409 LoC'luk tam implementasyon
- Engine-driven mimariye geçiş zorlu bir refactor
- Snapshot-lock + settings-driven + visibility-driven tüm kurallar korunmalı

**R5 önerisi:** Bu iş **R6 dalgasında yapılmaz**, ayrı bir **Faz R7 Wizard Unification** dalgası öneriliyor. R6'da kullanıcı bunu isterse bile "R5 raporu R7'ye bırakıyor" denir.

**Faz R7 ön-plan (özet):**
1. Engine specification: step registry + state machine + snapshot hooks
2. Schema DSL: TypeScript types (`WizardStepSchema<T>`)
3. Mevcut wizardları schema'ya çevir (step-by-step)
4. Shell component'ler: AdminShell + UserShell (Visibility Engine bağlantılı)
5. Test parity: eski wizard'lar gibi davranmalı

Bu R6 onay kapısına dahil edilmez; kullanıcı R6 bitiminde karar verir.

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

## 10. R5 Teslim Raporu (7 Başlık)

### 10.1 Ne yaptın
14 iş kalemini 4 katmana ayırdım (P0/P1/P2/P3). Her kalem için dosya listesi, efor, risk, önkoşul, test kategorisi, Settings Registry key'leri, bağımsız-mı bilgisi. 7 bağımsız + 7 zincir. 1 kalem R7'ye ertelendi (Approver), 1 iş R7 ayrı dalgasına önerildi (Wizard unification).

### 10.2 Hangi dosyaları okudun / değiştirdin
- **Okundu:** R3 + R4 raporları (yazım girdisi), `useLayoutNavigation.ts` (P2.1 scope), design-tokens-guide, design-system envanter
- **Yazıldı:** Yalnız `docs/redesign/R5_execution_roadmap.md` (bu dosya)

### 10.3 Hangi testleri çalıştırdın
R5 plan fazı — kod değişikliği yok. `git diff --stat backend/ frontend/ renderer/` boş.

### 10.4 Sonuç ne oldu
R6 onay kapısına girdi için **tek liste** hazır. Kullanıcı 1 kalem seçip "uygula" diyebilir, bağımlılık zinciri açıkça belirli. En düşük risk + yüksek değer = P2.2 (Analytics tabs) veya P2.1 (Nav yeniden gruplandırma). En ağır = P0.3 (49 dosya fetch refactor).

### 10.5 Bulduğun ek riskler
- **R1:** P0.3 tek bir PR'da yapılırsa çok büyük — alt-kalem 3'e bölünmeli (R6'da kullanıcı kabul ederse).
- **R2:** P3.1 duplicate merge'lerin her biri aslında küçük bir P0.3 tetikçisi; visibility testi yazılmazsa regression riski yüksek.
- **R3:** P1.3/P1.4 client-side parallel fetch performans sorunu çıkarırsa custom endpoint gerekecek.
- **R4:** P2.3 URL değişimi bookmark kırabilir; 301 redirect planı net tutulmalı.
- **R5:** Wizard R7'si gerçekten büyük — kullanıcı "hemen yapalım" derse R5 "R7 dalgasına aittir" diyerek uyaracak.

### 10.6 Commit hash
Bu commit sonrası güncellenecek.

### 10.7 Push durumu
Worktree remote'a aktif. Main'e dokunulmuyor.

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

## 12. FAZ R6 — Onay Kapısı (KULLANICI SEÇECEK)

Bu dalga R5 ile teslim edilir. R6 **kullanıcı seçmeden** başlatılmaz.

Kullanıcı mesajı beklenir. Örnek talepler:
- "P2.2 Analytics tabs uygulayalım"
- "P0.1 + P1.2 ile başla (kullanıcı tanımlama altyapısı)"
- "P0.3'ü alt-kalem olarak P0.3a ile başlat"
- "Önce R4 preview dosyalarını yaz"
- "R7 wizard unification'ı planla"

R6 başladığında:
- Ayrı commit dizisi
- Her kalem ayrı commit
- Her commit sonrası test sonuçları raporlanır
- MEMORY.md güncellenir
- Ana dalga içinde kalınır (worktree-product-redesign-benchmark), main'e dokunulmaz

---

**Doküman sonu. R6 kullanıcı onayını bekler.**
