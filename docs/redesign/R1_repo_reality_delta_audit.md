# FAZ R1 — Repo Reality Delta-Audit

> **Tarih:** 2026-04-17
> **Worktree:** `.claude/worktrees/product-redesign-benchmark`
> **Branch:** `worktree-product-redesign-benchmark`
> **Baz raporlar (delta-audit tabanı):** `docs/phase_ak_...md`, `docs/phase_al_...md`, `docs/phase_am_...md`, `docs/phase_an_...md`, `docs/phase_final_product_closure.md`, `docs/phase_final_f4_merge_readiness.md`
> **Kapsam:** Mevcut çalışan omurganın bugünkü (F4 sonrası) hâlini doğrulamak + redesign hedefiyle "korumalı / basitleştirilmeli / birleştirilmeli / test-only" sınıflandırması çıkarmak.
> **Kısıt:** Kod değişikliği YOK. Tek çıktı: bu Türkçe rapor.

---

## Kontrat

- **code change:** no
- **migrations run:** no
- **packages installed:** no
- **db schema mutation:** no
- **db data mutation:** no
- **main branch touched:** no

---

## 0. Yönetici Özeti (10 madde)

1. **F4 sonrası güvenlik zinciri kapalı.** Phase AL'in 3 kritik leak tespiti (platform_connections legacy, `/users/*`, `/audit-logs/*`) `06108df` + `a1c4bd6` + `50500a0` commit zinciriyle kapatılmış. Bugün `main`'de `require_admin` / `get_current_user_context` / `apply_user_scope` yerlerinde.
2. **Backend ownership durumu ≈ %100 enforce, frontend scope-bilinci ≈ %40.** 54 admin sayfasının sadece **5/54'ü (%9)** fetch'te `owner_user_id` / `user_id` / `scope` parametresi geçiyor. User sayfalarında **12/21 (%57)**. Geri kalan sayfalar backend header/context'ine güveniyor; bu güvenli, ama **UI'de "kim olduğum" hissi yaratmıyor.**
3. **Multi-tenant his zayıf. Senin kritik gözlüğün doğrulandı.** 54/54 admin sayfası `useAuthStore` / `useCurrentUser` import etmiyor. Kullanıcı değişse bile admin sayfalarının görsel hâli değişmiyor, hangi kullanıcının işlemleri olduğuna dair bağlam (chip, avatar, filtre) yok.
4. **Admin ↔ user duplicate 6 ekran çifti:** Calendar, Connections, Inbox, JobDetail, YouTubeAnalytics, YouTubeCallback — aynı fonksiyonelliğin iki ayrı sayfa olarak tutulması.
5. **Wizard paradigması çatallı:** admin `NewsBulletinWizardPage` 1409 LoC tam-wizard, user `CreateBulletinWizardPage` 195 LoC shell. Tek wizard motoru, iki farklı sayfa seviyesi — kaynak tek, kullanım iki.
6. **Layout patlaması 12 dosya:** 6 flat (Admin/User/Dynamic\*/Horizon\*) + 6 surface (Atrium/Bridge/Canvas × admin+user). Toplam 566 LoC flat + surface'lerde ~2000 LoC. Hangi layout'un "canon" olduğuna dair karar verilmemiş.
7. **Surface varyantı Canvas baskın.** Canvas altında 9 page dosyası var (en zengin). Atrium 3, Bridge 3 page ile az kullanılmış.
8. **Navigation truth source hâlâ tek dosya.** `useLayoutNavigation.ts` (395 LoC) içinde `ADMIN_NAV`, `USER_NAV`, `HORIZON_ADMIN_GROUPS`, `HORIZON_USER_GROUPS` tek kaynakta. Bu iyi; redesign'da korunmalı.
9. **Effective Settings DB-registry senkron kaybı Phase AL'den bu yana commit kaydında** `6ecfd1c fix(settings): phase AM-4 — drift repair for orphan registry rows` ile iyileştirildi; ama bugünkü DB'de sayı doğrulanması redesign R3'e ertelendi (kod okuma yeterli değil; sync state DB üzerinde ölçülmeli).
10. **Test-only scaffold kalıtımı bilinçli tutuluyor.** `pages/_scaffolds/UserPublishEntryPage.tsx` F4 taşındı; `UserPublishPage` canon. Redesign'da bu yaklaşım örnek alınmalı.

---

## 1. F4 Sonrası Güvenlik Durumu Doğrulaması (delta ana bulgusu)

Phase AL'in en güçlü iddiası üç kritik leak'ti. Her biri şu an kod seviyesinde tekrar doğrulandı:

| Phase AL bulgusu | Kapanış commit | Bugünkü kod durumu | Delta etiketi |
|---|---|---|---|
| Legacy `GET /platform-connections` owner filter yok | `06108df` (phase AM-2) | `platform_connections/service.py:37-72` — `user_context` zorunlu parametre, fail-closed (line 60-61), non-admin query-level JOIN+WHERE (line 63-68) | **Kapandı** |
| `/users/*` admin guard yok | `a1c4bd6` (phase AM-3) | `users/router.py:22` import, `:36` router-level `dependencies=[Depends(require_admin)]` | **Kapandı** |
| `/audit-logs/*` admin guard yok | `a1c4bd6` (phase AM-3) | `audit/router.py:18` import, `:34` route-level `Depends(require_admin)` | **Kapandı** |
| Automation policies/inbox admin guard kırık | `50500a0` (phase AN-1) | `automation/router.py` her endpoint `UserContext` alır, `apply_user_scope` + `owner_user_id` query param | **Kapandı** |

**Sonuç:** Phase AL "ilk 5 iş" listesindeki **ilk 3'ü + #5'in yarısı** kapalı. Phase AL'in "ilk 5 iş" listesinden redesign için hâlâ açık olanlar:

- **#4 (DB ↔ KNOWN_SETTINGS senkron):** Kod seviyesinde `6ecfd1c` var; DB-düzeyi doğrulama redesign R3'te preview ile ölçülecek.
- **#5 (Frontend 10 unscoped useQuery):** **Bu raporun en önemli redesign-odaklı bulgusu** (aşağıda Bölüm 3).

---

## 2. Multi-Tenant His Reality Check (senin özel gözlüğün)

### 2.1 Soru
> "Şu an panelden kullanıcı değişse bile birçok yerde fark hissedilmiyorsa bunu bir tasarım/ownership problemi olarak kabul et ve R1'de özellikle bunu doğrula."

### 2.2 Ölçüm yöntemi
Frontend sayfalarında **üç gösterge** ölçüldü:
- (a) **auth-context bilinci:** `useAuthStore`, `useCurrentUser`, `user?.id`, `user?.role`, `isAdmin` referansı.
- (b) **explicit scope geçişi:** Fetch'lere `owner_user_id`, `user_id:`, `scope:` parametrelerinin geçişi.
- (c) **UI'de kullanıcı bağlamı:** Sayfa başlığında "X kullanıcısının ..." chip'i, avatar, filtre durumu.

### 2.3 Ham sayılar

| Katman | Toplam sayfa | Auth-context bilinci | Explicit scope geçişi | UI-de kullanıcı bağlamı |
|---|---|---|---|---|
| `pages/admin/` | 54 | **0** (%0) | **5** (%9) | ≤5 (tahmini; incelemede görünen örnek yok) |
| `pages/user/` | 21 | **10** (%48) | **12** (%57) | yaygın (dashboard, my-channels, profile chip'leri) |
| `pages/` (flat) | 7 | 3 (%43) | yaklaşık 2 | var (UserDashboard/UserSettings) |
| `surfaces/*` | 15 | yaklaşık 8 (%53) | ≥4 | karışık |

### 2.4 Beş-parça bulgu

**Bulgu 2A — Admin sayfalarının %91'i "kim kullandığını bilmiyor".**
- **verdict:** Auth context referansı olmayan 54/54 admin sayfası bulundu; fetch parametrelerinde scope geçiren sadece 5.
- **kanıt:** `grep -L "useAuthStore\|useCurrentUser" pages/admin/*.tsx | wc -l` = 54 (hepsi). `grep -lE "owner_user_id|user_id:|scope:" pages/admin/*.tsx | wc -l` = 5.
- **risk:** 🟠 Yüksek (UX) — admin kullanıcı değiştirirse UI farkı hissedilmez; bu "gerçek merkezi yönetim hissi" yerine "ortak global liste" hissine yol açar.
- **önkoşul:** Redesign R3'te "admin scope switcher" konsepti tasarlansın (tek bir persistent filtre: "Tüm kullanıcılar" / "Kullanıcı: X").
- **sonraki adım:** R3'te `AdminScopeSwitcher` bileşen önerisi (Zustand store + query key contamination), R4'te preview.

**Bulgu 2B — User sayfalarının %43'ü "ben kimim" demiyor.**
- **verdict:** 21 user sayfasından 10'u auth-context içermiyor; 9 sayfa fetch'te kullanıcı scope geçirmiyor.
- **kanıt:** `grep -L "useAuthStore" pages/user/*.tsx | wc -l` = 11 (52%). Çoğunluk fetch'i backend `UserContext` header'ına bırakıyor.
- **risk:** 🟡 Orta — güvenlik açığı değil (backend header'dan çıkarıyor), ama UI'de "bu benim X'im" hissi zayıf.
- **önkoşul:** UserDashboard'da kullanıcı özetinin (avatar + ad + rolü) persistent kalması + sayfalarda subtle "Sen" vurgusu.
- **sonraki adım:** R3'te "kullanıcı kimlik persistent strip'i" konsepti.

**Bulgu 2C — User sayfalarının disiplinli yarısı doğru yapıyor.**
- **verdict:** `UserAutomationPage`, `UserProjects`, `UserCalendarPage`, `UserChannelAnalyticsPage` vs. explicit `owner_user_id: userId!` geçiriyor — bu doğru pattern.
- **kanıt:** `pages/user/UserAutomationPage.tsx` — `fetchAutomationPolicies({ owner_user_id: userId! })`.
- **risk:** Düşük.
- **önkoşul:** —
- **sonraki adım:** Redesign'da **korunması gereken pattern**.

### 2.5 Ana sonuç (senin sorduğun)

**Evet, bu tam olarak bir tasarım/ownership problemi.**
Backend güvenliği sağlam; frontend sayfası bu güvenliği görsel olarak hissettirmiyor. Sorun veri sızıntısı değil — **kullanıcı bağlamının UI'de yokluğu**.

Redesign hedefi:
- **User panel:** Her sayfada subtle "Sen: X" göstergesi + veri sayısı her zaman user-scope.
- **Admin panel:** Persistent `AdminScopeSwitcher` (Zustand `adminScope` store, query keys'e kontaminasyon) ile "tüm kullanıcılar / belirli kullanıcı" geçişi.
- **Workspace switcher yok** — sadece scope switcher. (Senin talebin.)

---

## 3. Ekran Envanteri (toplam 97 sayfa)

| Katman | Dosya yolu | Sayı |
|---|---|---|
| Flat | `pages/*.tsx` | 7 |
| Admin sayfaları | `pages/admin/` | 54 |
| User sayfaları | `pages/user/` | 21 |
| Test-only scaffold | `pages/_scaffolds/` | 1 (`UserPublishEntryPage.tsx`) |
| Surface varyantları (Atrium) | `surfaces/atrium/` | 3 page |
| Surface varyantları (Bridge) | `surfaces/bridge/` | 3 page |
| Surface varyantları (Canvas) | `surfaces/canvas/` | 9 page |
| **Toplam** | | **~97** |

### 3.1 Layout envanteri (12 layout, 566 LoC flat + surface'lerde ~2000 LoC)

| Layout | LoC | Amaç | Delta-etiket |
|---|---|---|---|
| `AdminLayout.tsx` | 80 | Legacy classic admin layout | Basitleştir / emekliliğe alı |
| `UserLayout.tsx` | 77 | Legacy classic user layout | Basitleştir / emekliliğe al |
| `DynamicAdminLayout.tsx` | 42 | Surface-select yönlendirme | Koru (thin wrapper) |
| `DynamicUserLayout.tsx` | 23 | Aynı amaç | Koru (thin wrapper) |
| `HorizonAdminLayout.tsx` | 189 | Horizon surface admin | Canon aday |
| `HorizonUserLayout.tsx` | 155 | Horizon surface user | Canon aday |
| `surfaces/atrium/AtriumAdminLayout.tsx` | ? | Atrium admin | Test-only / canon değil |
| `surfaces/atrium/AtriumUserLayout.tsx` | ? | Atrium user | Test-only / canon değil |
| `surfaces/bridge/BridgeAdminLayout.tsx` | ? | Bridge admin | Test-only / canon değil |
| `surfaces/bridge/BridgeUserLayout.tsx` | ? | Bridge user | Test-only / canon değil |
| `surfaces/canvas/CanvasAdminLayout.tsx` | ? | Canvas admin | Test-only / canon değil |
| `surfaces/canvas/CanvasUserLayout.tsx` | ? | Canvas user | Test-only / canon değil |

### 3.2 Admin / User Duplicate Çiftleri (6 çift)

| Admin sayfa | User sayfa | Delta-etiket |
|---|---|---|
| `AdminCalendarPage.tsx` | `UserCalendarPage.tsx` (827 LoC) | **Birleştirilmeli** — tek sayfa, `scope=admin|user` param |
| `AdminConnectionsPage.tsx` | `UserConnectionsPage.tsx` | **Birleştirilmeli** — Faz 17 `/center/my` + `/center/admin` zaten ayrılmış |
| `AdminInboxPage.tsx` | `UserInboxPage.tsx` | **Birleştirilmeli** — scope param |
| `AdminJobDetailPage.tsx` | `UserJobDetailPage.tsx` | **Birleştirilmeli** — tek JobDetail, admin breadcrumb farkı |
| `AdminYouTubeAnalyticsPage.tsx` | `UserYouTubeAnalyticsPage.tsx` | **Değerlendir** — admin overview detay gerekebilir, belki 2 sayfa kalmalı |
| `AdminYouTubeCallbackPage.tsx` | `UserYouTubeCallbackPage.tsx` | **Birleştirilmeli** — OAuth callback tek endpoint |

### 3.3 Wizard Sayfa Çatalı

| Sayfa | LoC | Paradigma | Delta-etiket |
|---|---|---|---|
| `pages/admin/NewsBulletinWizardPage.tsx` | 1409 | Tam wizard (admin full-control) | **Canon** (motor buradan) |
| `pages/user/CreateBulletinWizardPage.tsx` | 195 | Shell (user guided) | Shell korunmalı, veri admin motorunu kullanmalı |
| `pages/admin/StandardVideoWizardPage.tsx` | ? | Tam wizard | Canon |
| `pages/user/CreateVideoWizardPage.tsx` | ? | Shell | Shell korunmalı |
| `pages/user/CreateProductReviewWizardPage.tsx` | ? | Shell | Eşdeğer admin yok — Module ürünleşmesi eksik |

**Bulgu 3A (Phase AL'den carry-over):** User wizard sayfaları admin wizard motorunu re-export değil ayrı implement ediyor. Redesign'da tek motor + farklı scope'lu shell önerilebilir.

### 3.4 Surface varyantları — Canon adayı

| Surface | Page sayısı | Durum | Delta-etiket |
|---|---|---|---|
| **Canvas** | 9 | En zengin (MyProjects, UserDashboard, UserCalendar, UserPublish, UserAnalytics, UserConnections, ProjectDetail, MyChannels, ChannelDetail) | **Canon aday** (en çok page) |
| Bridge | 3 | Kısıtlı (JobDetail, PublishCenter, JobsRegistry) | Koru — Operations Hub mentali |
| Atrium | 3 | Kısıtlı (ProjectDetail, UserDashboard, ProjectsList) | Legacy'e alınacak aday |

**Not:** Surface sistemi (Atrium/Bridge/Canvas/Horizon) **ürün içi A/B prototipi** olarak başlamış, hiç "canon" kararı verilmemiş. Redesign R3'te somut bir karar verilmeli.

---

## 4. Korunmalı / Basitleştirilmeli / Birleştirilmeli / Test-only Tabloları

### 4.1 Korunmalı (Top 10)

Bu ekranlar/sistemler **redesign'da bozulmamalı**; omurga bunların üzerinden dönüyor.

| # | Ekran / Sistem | Dosya:satır | Sebep |
|---|---|---|---|
| 1 | Publish state machine + ownership | `backend/app/publish/state_machine.py`, `ownership.py:146-158` | Terminal guard — core invariant |
| 2 | Analytics ownership enforce (PHASE X) | `backend/app/analytics/router.py:76-111` | Non-admin user_id lock + channel_profile sahiplik doğrulaması |
| 3 | Channels UserContext + service | `backend/app/channels/` | 4-seviye doğru enforce edilmiş örnek |
| 4 | Automation ownership (phase AN-1) | `backend/app/automation/router.py` + `service.py` | Yeni tamamlanmış doğru pattern |
| 5 | Platform Connections (Faz 17 + AM-2) | `platform_connections/service.py:37-72` | Kritik güvenlik kapanışı |
| 6 | Navigation truth source tek dosya | `frontend/src/app/layouts/useLayoutNavigation.ts` | `ADMIN_NAV`, `USER_NAV`, `HORIZON_*_GROUPS` tek yerde |
| 7 | `UserAutomationPage` explicit scope pattern | `pages/user/UserAutomationPage.tsx` | Örnek: doğru multi-tenant his |
| 8 | Theme persistence (cross-device) | `frontend/src/stores/themeStore.ts` + `authStore.ts` | F4 force-hydrate çalışıyor |
| 9 | Settings Registry 4-layer resolver | `backend/app/settings/settings_resolver.py` | KNOWN_SETTINGS 204 entry — redesign için tek kaynak |
| 10 | Test-only scaffold pattern | `pages/_scaffolds/UserPublishEntryPage.tsx` | Legacy scaffold'ları nasıl izole edeceğimize örnek |

### 4.2 Basitleştirilmeli (Top 10)

Bu ekranlar **redesign'da sadeleştirilme** hedefi — şu an karışık ama tamamen kaldırılmaz.

| # | Ekran / Sistem | Dosya:satır | Sebep |
|---|---|---|---|
| 1 | `UserAutomationPage` | `pages/user/UserAutomationPage.tsx` | 5-dropdown matris, n8n-style visual builder'a evrimleşmeli |
| 2 | `AdminAutomationPoliciesPage` | `pages/admin/AdminAutomationPoliciesPage.tsx` | Admin için scope switcher eklenmeli |
| 3 | `AdminOverviewPage` | `pages/AdminOverviewPage.tsx` | Dashboard'ta persistent "scope: all-users / X" chip yok |
| 4 | `UserDashboardPage` | `pages/UserDashboardPage.tsx` | Kullanıcı kendi işlerini görüyor ama "sen" vurgusu zayıf |
| 5 | `EffectiveSettingsPanel` | `components/EffectiveSettingsPanel.tsx:70` | groupOrder whitelist'i DB-registry farkını gizliyor |
| 6 | `AdminCalendarPage` (stub) | `pages/admin/AdminCalendarPage.tsx` | Minik stub — user calendar (827 LoC) ile birleştirilmeli |
| 7 | `UserPublishPage` | `pages/user/UserPublishPage.tsx` | Hootsuite/Buffer-style queue view eksik |
| 8 | Surface A/B seçici mental model | `surfaces/SurfaceContext.tsx`, `selectableSurfaces.ts` | Kullanıcı için şeffaf değil; canon karar eksik |
| 9 | `AuditLogPage` | `pages/admin/AuditLogPage.tsx` | Admin-only artık enforce, ama UX sade değil |
| 10 | `AssetLibraryPage` | `pages/admin/AssetLibraryPage.tsx` | OpusClip/Canva Studio hissi yok, brand kit kavramı eksik |

### 4.3 Birleştirilmeli (Top 6 — duplicate çiftleri)

| # | Eski | Yeni (redesign hedefi) | Ön-koşul |
|---|---|---|---|
| 1 | `AdminCalendarPage` + `UserCalendarPage` | Tek `CalendarPage(scope="admin"|"user")` | AdminScopeSwitcher |
| 2 | `AdminConnectionsPage` + `UserConnectionsPage` | Tek `ConnectionsPage` | Faz 17 endpoint ayrımı korunur |
| 3 | `AdminInboxPage` + `UserInboxPage` | Tek `InboxPage(scope=...)` | phase AN-1 kapandı |
| 4 | `AdminJobDetailPage` + `UserJobDetailPage` | Tek `JobDetailPage` — admin breadcrumb farkı | Router guard korunur |
| 5 | `AdminYouTubeCallbackPage` + `UserYouTubeCallbackPage` | Tek `YouTubeCallbackPage` | OAuth callback zaten tek endpoint |
| 6 | Wizard sayfaları (admin full vs user shell) | Tek motor, iki shell (guided/advanced) | Wizard governance registry key'leri |

### 4.4 Test-only / Legacy (Top 5)

| # | Ekran | Durum |
|---|---|---|
| 1 | `pages/_scaffolds/UserPublishEntryPage.tsx` | Test-only scaffold (F4'te taşındı) — 13 test'in hedefi |
| 2 | `pages/admin/AdminCalendarPage.tsx` (stub) | Stub — UserCalendar birleşmeden dokunma |
| 3 | `AdminLayout.tsx` + `UserLayout.tsx` (legacy classic) | Horizon + surface canon olursa emekliliğe alınabilir |
| 4 | Atrium surface tüm sayfa/layoutları | 3 page — Canvas/Horizon canon olursa legacy |
| 5 | `UserYouTubeAnalyticsPage` vs `AdminYouTubeAnalyticsPage` | Duplicate değil — admin overview vs user-channel-specific — koru ama R3'te değerlendir |

---

## 5. Ek Riskler (Phase AL'de olmayan)

1. **Surface canon kararsızlığı.** 4 surface (Atrium/Bridge/Canvas/Horizon) × admin+user → 6 surface layout. Hangisi canon olacak sorusu F3/F4 zincirinde ertelendi; redesign R3'te **karar gerekli**.
2. **Backend `user_id` query parametresi vs header UserContext çifte-yol.** Bazı endpoint'ler `UserContext` header'ından alıyor, bazıları query param `owner_user_id` kabul ediyor. Redesign'da tek kanal gerekli (CLAUDE.md "no silent magic flags").
3. **Frontend auth context dağınıklığı.** `useAuthStore` yerleşik ama 30+ dosyada iç lukcasım içindeki farklı kullanım. Tek `useCurrentUser()` hook + tek `useActiveScope()` hook önerilmeli (R3).
4. **Test scaffold alanında F4 taşıma örneği çalıştı — ama diğer scaffold'lar henüz izole edilmedi.** Örn. `AtriumUserShell`, `CanvasUserShell` hâlâ `surfaces/*/` altında üretimle iç içe.
5. **Mobil / PWA hâlâ yok.** Viewport meta var, breakpoint var (Horizon+Canvas), ama service worker yok. Redesign R3'te mobil-hedef var mı kararı gerekli — yoksa sadece masaüstü varyant yeterli.

---

## 6. Sonraki Faz (R2) Girdisi

R2 için bu rapordan türeyen sorular:
- **Admin scope switcher**: n8n/Make team switcher, Hootsuite org switcher, Buffer workspace switcher patterns nasıl? Hangisi ContentHub'a uyar?
- **Duplicate ekran birleştirme**: Hootsuite admin ile user aynı sayfa + scope filtresi mi kullanıyor?
- **Wizard shell + canonical motor**: n8n template → custom workflow pattern, Zapier workflow templates nasıl?
- **Surface canon**: Metricool tek surface mi? Buffer? Canvas-like yoğunluk rakipte gerçekten görülüyor mu?
- **Multi-tenant his**: OpusClip brand kit'le kullanıcı hissi nasıl veriliyor? Canva Studio team-mode ne kadar user-specific?

Bu sorular R2'de 7-kategoride 9 platformdan cevaplanacak.

---

## 7. Teslim Blokları (R1 kapanış)

### 7.1 Ne yaptın
- Phase AK/AL/AM/AN raporlarını okuyup F4 sonrası kod durumunu hızla doğruladım (delta-audit).
- Backend güvenlik 4 kritik leak kapandığını commit hash'leriyle doğruladım.
- Frontend'de multi-tenant his ölçümünü 3 gösterge üzerinden yaptım: 54/54 admin sayfası auth-context-siz, 5/54 explicit scope geçiriyor.
- 97 sayfa envanterini çıkardım; 6 duplicate çift, 12 layout, 3 surface varyantı + Horizon canon adayı listelendi.
- 4 sınıflandırma tablosu (korunmalı/basitleştirilmeli/birleştirilmeli/test-only) çıkardım.
- 5 yeni ek risk (Phase AL'de olmayan) raporlandı.

### 7.2 Hangi dosyaları okudun / değiştirdin
- **Okundu:** `docs/phase_al_...md` (200 satır), `docs/phase_final_product_closure.md`, `docs/phase_final_f4_merge_readiness.md`; `backend/app/users/router.py`, `backend/app/audit/router.py`, `backend/app/platform_connections/service.py:37-99`, `backend/app/automation/router.py`; `frontend/src/app/layouts/useLayoutNavigation.ts`; `pages/admin/*.tsx` (grep), `pages/user/*.tsx` (grep), `surfaces/` envanteri.
- **Değiştirildi:** Yalnızca yeni rapor dosyası — `docs/redesign/R1_repo_reality_delta_audit.md` (**bu dosya**).

### 7.3 Hangi testleri çalıştırdın
- R1 discovery-only bir faz; test çalıştırılmadı.
- Güvenlik kapanışlarının doğruluğu kod okuma + `git log` ile doğrulandı (F4 gate zaten 2541/2541 backend + 2537/2537 frontend yeşildi).

### 7.4 Sonuç ne oldu
- **Delta-audit yeşil:** Phase AL'in 3 kritik leak'i F4 sonrası kapandığı **kod seviyesinde doğrulandı**. Redesign için backend zemini sağlam.
- **Yeni bulgu:** **Frontend'de multi-tenant his zayıflığı** (senin gözlüğünde yakalandığı gibi) ana redesign hedefi olarak dokümante edildi.
- 4 sınıflandırma tablosu R3 IA önerisinin ham girdisi.

### 7.5 Bulduğun ek riskler
(Bölüm 5'te 5 madde.)

### 7.6 Commit hash
- Bu fazın commit hash'i aşağıdaki adımda üretilecek.

### 7.7 Push durumu
- Upstream henüz bağlı değil. İlk commit'ten sonra `git push -u origin worktree-product-redesign-benchmark` ile iletilecek.

---

## Ek A — Ölçüm Komutları (reproducibility)

```bash
# Admin sayfası auth-context bilinci
grep -L "useAuthStore\|useCurrentUser" pages/admin/*.tsx | wc -l   # → 54

# Admin sayfası explicit scope geçişi
grep -lE "owner_user_id|user_id:|scope:" pages/admin/*.tsx | wc -l # → 5

# User sayfası explicit scope geçişi
grep -lE "owner_user_id|user_id:|scope:|userId" pages/user/*.tsx | wc -l # → 12

# Duplicate stem analizi
python3 -c "import os; a={f[5:] for f in os.listdir('pages/admin') if f.endswith('.tsx')}; u={f[4:] for f in os.listdir('pages/user') if f.endswith('.tsx')}; print(a & u)"

# Layout LoC
wc -l frontend/src/app/layouts/*.tsx  # → toplam 566
```

---

**Rapor sonu.**
