# Redesign Dalgası — Kalıcı Memory Dokümanı

> **Amaç:** Bu dalganın tüm isteklerini, yapılan/yapılmayan/reddedilen/ertelenen/ileride-yapılabilir her şeyi tek bir izlenebilir yerde tutmak. Her faz sonunda güncellenir. Unutulmasın diye.
>
> **Worktree:** `.claude/worktrees/product-redesign-benchmark`
> **Branch:** `worktree-product-redesign-benchmark`
> **Baz SHA:** `33783e1` (main)
> **Dil:** Türkçe (konuşma + raporlar), teknik terimler/isimler İngilizce kalabilir

---

## 1. Kilit Ürün İlkeleri (asla unutulmayacak)

### 1.1 Mimari Karar: "Tenant-Scoped User Isolation + Admin All-Users"
- **Her kullanıcı YALNIZ kendi scope'unu görür:** kendi kanalları, işleri, OAuth/API key'leri, ayarları, analytics'i, inbox'ı, calendar'ı.
- **Admin ise all-users view + X kullanıcısına odak** ikilisine sahip. Varsayılan "tüm kullanıcılar", tek tuşla "kullanıcı: X" scope'una geçiş.
- **Enforcement backend'de** — sadece frontend filtresi değil (CLAUDE.md ile tam uyumlu).
- **Frontend'de "kim olduğum" hissi** görsel olarak var olmalı (avatar, subtle "Sen:" vurgusu, scope chip'i).

### 1.2 Şimdilik İSTENMEYENLER (kalıcı "hayır" listesi)
- ❌ Workspace switcher (org/project picker)
- ❌ Team switcher
- ❌ Organization management
- ❌ Multi-tenant enterprise karmaşası (billing, licensing)
- ❌ Hardcoded çözümler — her davranış Settings Registry üzerinden
- ❌ Kod kopyalama (rakipten de içeriden de)
- ❌ Ağır yeni npm dependency (özellikle canvas/flow/graphics kütüphaneleri: önce ispat)

### 1.3 Korunması ZORUNLU Mimari Omurga
- FastAPI + SQLAlchemy async mimarisi
- SQLite WAL + Alembic tek migration otoritesi
- Remotion rendering (renderer/)
- Settings Registry 4-layer resolver (KNOWN_SETTINGS 204 entry)
- Visibility Engine
- React Query (server state) + Zustand (client-only UI state) ayrımı
- Mevcut tema/design tokens sistemi (`docs/design-tokens-guide.md`)
- Navigation single source: `useLayoutNavigation.ts`
- Publish state machine + Analytics ownership guard + Channels UserContext + Platform Connections Faz 17/AM-2 + Automation phase AN-1

### 1.4 İstenen Rakip-Esinleri (sadece uyarlama, kopya değil)
- **make.com / n8n:** Otomasyon akışı sezgiselliği
- **Hootsuite / Buffer / Metricool / Later:** Sosyal medya yönetim paneli UX'i
- **OpusClip / Canva Studio:** Medya/clip/brand/asset deneyimi

### 1.5 Çalışma Biçimi Kuralları (REV-2 — 2026-04-17)
- Artık gereksiz onay bekleme — **R6 onay kapısı KALDIRILDI**.
- R2 → R5 kesintisiz otomatik devam ve sonrasında **R5'teki 16 kalemin tamamı tek dalgada** uygulanır.
- **R7 ayrı faz KALDIRILDI** — wizard unification P3.3 olarak bu dalgaya dahil edildi.
- Yalnızca anlamlı checkpoint'lerde 7 başlıklı kısa Türkçe rapor.
- Her anlamlı iş = ayrı commit.
- Her kod değişikliği dalgasında test + typecheck + build + ilgili smoke/integration/permission/visibility çalıştırılır; sonuç commit mesajına ve MEMORY.md'ye.
- Her kalem sonunda MEMORY.md güncellenir.
- Küçük-büyük ayrımı yok; iş tek seferde ürün seviyesinde kapatılır.
- Konuşma dili + dokümanlar = Türkçe.
- Main branch'e dokunulmaz; worktree-product-redesign-benchmark dalında kalınır.

### 1.6 REV-2 Uygulama Plan Tablosu (16 kalem, sırayla)

Her kalem: ayrı commit, push, test sonucu MEMORY.md'ye, 7 başlıklı Türkçe rapor anlamlı checkpoint'lerde.

| # | Kod | Kalem | Durum | Commit |
|---|---|---|---|---|
| 1 | P0.1 | `useCurrentUser()` hook | ✅ Tamam | `2225aa0` |
| 2 | P0.2 | `useActiveScope()` + `adminScopeStore` | ✅ Tamam | `32bb576` |
| 3 | P0.3a | Admin fetch refactor — Jobs/Publish/Channels/Automation | ✅ Tamam | `0d5f184` |
| 4 | P0.3b | Admin fetch refactor — Analytics/Calendar/Audit | ✅ Tamam | `1eeb8b9` |
| 5 | P0.3c | Admin fetch refactor — Comment/Playlist/Post/Notifications/Inbox | ✅ Tamam | `a6c719c` |
| 6 | P1.1 | `AdminScopeSwitcher` component | ✅ Tamam | `883f6c3` |
| 7 | P1.2 | `UserIdentityStrip` component | ✅ Tamam | `0237c97` |
| 8 | P1.3 | `AdminDigestDashboard` | ✅ Tamam | `e96c22d` |
| 9 | P1.4 | `UserDigestDashboard` | ✅ Tamam | `11ffecf` |
| 10 | P2.1 | Nav yeniden gruplandırma | ✅ Tamam | `9ec4b31` |
| 11 | P2.2 | Analytics tabs (3 → 1) | ✅ Tamam | `237454d` |
| 12 | P2.3 | Settings module landing | ✅ Tamam | `f5d1e72` |
| 13 | P3.1 | 6 duplicate çift birleştirme | ✅ Tamam | `3ba6af5` |
| 14 | P2.4 | Calendar unified (P3.1 sonrası) | ✅ Tamam | `24d1c44` |
| 15 | P2.5 | PublishBoard toggle | ✅ Tamam | `8247186` |
| 16 | P2.6 | Automation SVG görselleştirme | ✅ Tamam | `30dec6f` |
| 17 | P3.2 | Approver assignment (Alembic migration + UI) | ✅ Tamam | `4d8a5e2` |
| 18 | P3.3 | Wizard unification (tek motor + iki shell) | ⏳ | — |
| 19 | REG | Final regresyon: test + typecheck + build + smoke | ⏳ | — |

**Legend:** ⏳ sırada · 🟡 aktif · ✅ tamam · ❌ iptal/reddedildi

---

## 2. Faz Durum Takibi

| Faz | Adı | Durum | Commit | Teslim |
|---|---|---|---|---|
| R0 | Worktree/branch setup | ✅ Tamam | `33783e1` (branch base) | — |
| R1 | Delta-audit (post-F4 + multi-tenant) | ✅ Tamam | `689ffdb` | `docs/redesign/R1_repo_reality_delta_audit.md` |
| R2 | Rakip analizi (hibrit: 4 derin + 5 tamamlayıcı) | ✅ Tamam | `16c93bc` | `docs/redesign/R2_competitor_benchmark.md` |
| R3 | Yeni IA önerisi | ✅ Tamam | `b7c77a3` | `docs/redesign/R3_information_architecture.md` |
| R4 | Preview/prototype planı | ✅ Tamam | `8746047` | `docs/redesign/R4_preview_prototype_plan.md` |
| R5 | Uygulama yol haritası | ✅ Tamam | `e9c2cda` | `docs/redesign/R5_execution_roadmap.md` |
| R5-REV2 | R5 REV-2 revizyonu (R6 kapısı kaldırıldı, 16 kalem tek dalgada) | 🟡 Sürüyor | (commit sonrası) | `docs/redesign/R5_execution_roadmap.md` |
| IMPL | R5'teki 16 kalemin tek dalgada uygulanması | 🟡 Başlıyor | (her kalem ayrı commit) | `frontend/**/*`, `backend/**/*`, `docs/redesign/MEMORY.md` |
| ~~R6~~ | ~~Onaylı implementasyon~~ | ❌ KALDIRILDI (REV-2) | — | — |
| ~~R7~~ | ~~Wizard birleştirme ayrı faz~~ | ❌ KALDIRILDI (REV-2) — P3.3 olarak IMPL içine alındı | — | — |

---

## 3. R1 Bulguları Özeti (unutulmasın diye)

**Backend zemini:**
- Phase AL'in 3 kritik leak'i (platform_connections legacy, /users/*, /audit-logs/*) F4 öncesi kapatıldı → `06108df` + `a1c4bd6` + `50500a0`.
- Backend enforcement bugün sağlam: UserContext + apply_user_scope + require_admin.

**Frontend zayıflığı (redesign ana hedefi):**
- **54/54 (%100) admin sayfası** `useAuthStore`/`useCurrentUser` referansı taşımıyor.
- **5/54 (%9) admin sayfası** fetch'te explicit `owner_user_id`/`scope` geçiriyor.
- **12/21 (%57) user sayfası** doğru scope geçiriyor.
- Kullanıcı değişse UI görsel hâli aynı → "multi-tenant his" yok.

**Envanter:**
- 97 sayfa toplam (7 flat + 54 admin + 21 user + 15 surface).
- 6 admin/user duplicate çifti: Calendar, Connections, Inbox, JobDetail, YouTubeAnalytics, YouTubeCallback.
- 12 layout (6 flat + 6 surface), canon kararı verilmemiş.
- Wizard çatalı: admin NewsBulletin 1409 LoC (tam) vs user CreateBulletin 195 LoC (shell).
- Navigation tek kaynaktan (useLayoutNavigation.ts — KORU).

**5 ek risk (R1 çıkışı):**
1. Surface canon kararsızlığı (Atrium/Bridge/Canvas/Horizon)
2. Backend header + query-param çifte kanal
3. `useAuthStore` 30+ dosyada dağınık
4. Production ile test-scaffold iç içe (`_scaffolds/` dışında)
5. Mobil/PWA hâlâ yok

---

## 4. Yapılanlar (Cumulative)

### 4.1 Commits
- `689ffdb` — R1 delta-audit raporu (R1 teslimi)
- `7aaadbb` — MEMORY.md ilk sürüm
- `16c93bc` — R2 competitor benchmark raporu
- `b7c77a3` — R3 information architecture önerisi
- `8746047` — R4 preview/prototype planı
- `e9c2cda` — R5 uygulama yol haritası + MEMORY güncellemesi
- `848ea23` — REV-2 kararı: R6 kaldırıldı, 16 kalem tek dalga, wizard dahil
- `2225aa0` — P0.1 useCurrentUser hook + unit testler + .gitignore symlink düzeltmesi
- `32bb576` — P0.2 useActiveScope hook + adminScopeStore + 19 unit test (14 store + 5 hook)
- `c02831f` — P0.2 commit SHA'yı MEMORY.md'ye işleme (docs-only)
- `0d5f184` — P0.3a Admin fetch refactor Jobs/Publish/Channels/Automation (scope-aware query keys + backend publish admin override)
- `415c2d7` — P0.3a commit SHA'sı MEMORY.md'ye işleme (docs-only)
- `1eeb8b9` — P0.3b Admin fetch refactor Analytics/Calendar/Audit (scope-aware keys + analytics filter scope fallback + calendar admin focused-user + isReady gate rollback fix)
- `c306b08` — P0.3b commit SHA'sı MEMORY.md'ye işleme (docs-only)
- `a6c719c` — P0.3c Admin fetch refactor Monitoring/Notifications/Inbox (5 sayfa scope-aware)
- `53ff559` — P0.3c commit SHA'sı MEMORY.md'ye işleme (docs-only)
- `883f6c3` — P1.1 AdminScopeSwitcher bileşeni + AppHeader entegrasyonu + 8 smoke test
- `4068785` — P1.1 commit SHA'sı MEMORY.md'ye işleme (docs-only)
- `0237c97` — P1.2 UserIdentityStrip bileşeni + UserLayout entegrasyonu + 7 smoke test
- `41fd8e9` — P1.2 commit SHA'sı MEMORY.md'ye işleme (docs-only)
- `e96c22d` — P1.3 AdminDigestDashboard bileşeni + AdminOverviewPage entegrasyonu + 7 smoke test
- `38aa211` — P1.3 commit SHA'sı MEMORY.md'ye işleme (docs-only)
- `11ffecf` — P1.4 UserDigestDashboard bileşeni + UserDashboardPage entegrasyonu + 7 smoke test
- `5bc1173` — P1.4 commit SHA'sı MEMORY.md'ye işleme (docs-only)
- `9ec4b31` — P2.1 Nav yeniden gruplandırma (useLayoutNavigation.ts 4 export R3 IA'ya uyarlandı)
- `237454d` — P2.2 Analytics tabs (3 → 1): AnalyticsTabBar.tsx router-aware tab stripe + 5 admin + 3 user analytics sayfası entegrasyonu + 10 smoke test
- `35ef5c3` — P2.2 commit SHA'sı MEMORY.md'ye işleme (docs-only)
- `f5d1e72` — P2.3 Settings module landing: SettingsModuleLanding bileşeni + `/admin/settings/:group` deep-link rotası + EffectiveSettingsPanel initialGroup prop + 5 smoke test
- `3ba6af5` — P3.1 6 duplicate çift birleştirme: YouTubeCallback çifti `YouTubeCallbackBody` ortak motorunda toplandı (mode prop ile admin/user davranışı ayrıştırıldı) + 8 smoke test; diğer 5 çiftin mevcut durumu dürüstçe dokümante edildi
- `24d1c44` — P2.4 Calendar unified: `CalendarListView.tsx` yeni bileşen (kronolojik düz liste) + `UserCalendarPage.tsx` 3-button view toggle (Liste/Hafta/Ay) + localStorage persistence (`calendar.default_view` v=1) + `user.calendar.default_view` KNOWN_SETTINGS entry (group=ui, module_scope=calendar, builtin_default="month", visible_to_user=True, user_override_allowed=True) + 12 smoke test (7 view + 5 persistence)
- `8247186` — P2.5 PublishBoard toggle: `PublishBoard.tsx` + `PublishBoardColumn.tsx` + `PublishCard.tsx` yeni bileşenler (kanban görünümü, 6 sütun: Taslak/Review Bekliyor/Onaylandı/Zamanlandı/Yayında/Başarısız) + `PublishCenterPage.tsx` Tablo/Board toggle + localStorage persistence (`publish.center.default_view` v=1) + 2 yeni KNOWN_SETTINGS (`publish.center.board_view.enabled` admin-only bool, `publish.center.default_view` user-facing string) + 12 smoke test (7 board + 5 persistence)
- `30dec6f` — P2.6 Automation SVG görselleştirme: `AutomationFlowSvg.tsx` saf SVG bileşeni (5 node: Kaynak Tarama → Taslak → Render → Yayın → Yayın Sonrası, 4 ok, mode→renk: automatic=success yeşil / manual_review=warning sarı / disabled=neutral gri, AUTO/ONAY/KAPALI rozetleri, legend) + `UserAutomationPage.tsx` checkpoint matrisinin üstüne entegrasyon (matris form korunur, SVG sadece pasif önizleme) + `user.automation.flow_visual.enabled` KNOWN_SETTINGS entry (group=automation, builtin_default=True, admin-only kill switch: visible_to_user=False + user_override_allowed=False + read_only_for_user=True) + 7 smoke test (container/svg/5 node, 4 ok, mode→rozet mapping, fill rengi mode mapping, label metni, legend keys, all-disabled kill-switch sim). **No heavy dep** — `@xyflow/react`/`react-flow`/`d3` banned per MEMORY §5.1, pure SVG with hand-computed coordinates (NODE_W=120, NODE_H=56, GAP=24).
- `4d8a5e2` — P3.2 Approver assignment (Alembic + UI): `backend/alembic/versions/phase_al_001_approver_to_automation_policies.py` (down_revision=phase_ag_001) `automation_policies.approver_user_id` kolonu (String(36), FK→users.id ondelete SET NULL, nullable, named constraint `fk_automation_policies_approver_user_id` — SQLite batch_alter_table için zorunlu) + `ix_automation_policies_approver_user_id` index + upgrade/downgrade idempotent. `AutomationPolicy` model approver_user_id kolonu named FK ile. Schemas (Create/Update/Response) ve `automationApi.ts` tipleri approver_user_id alanını içeriyor. `automation/service.py` non-admin spoof koruma: create ve update yollarında eğer caller non-admin ise `approver_user_id != caller.user_id` sessizce caller.user_id'e yeniden yazılır (403 yerine rewrite — owner_user_id ile aynı pattern). `UserAutomationPage.tsx` operasyonel limitler bloğuna "Onaylayici (Approver)" dropdown (NULL → "Owner (varsayilan)", self → "Kendim"; empty→null serializasyonu). `automation.approver_assignment.enabled` KNOWN_SETTINGS (admin-only bool, builtin_default=False, declarative; publish-gate enforcement bu dalgada yok). 15 yeni test: 6 backend migration (A: upgrade head phase_al_001, B: kolon nullable VARCHAR(36), C: index var, D: downgrade kolon+index temizler + phase_ag_001 donuş, E: re-upgrade idempotent, F: PRAGMA default NULL + raw insert chain) + 9 frontend smoke (section/select testid, initial value binding, owner/self option visibility, onChange empty→null ve self→userId serializasyonu, help text, disabled pending state).

### 4.2 Yeni Dosyalar
- `docs/redesign/MEMORY.md` (bu dosya)
- `docs/redesign/R1_repo_reality_delta_audit.md`
- `docs/redesign/R2_competitor_benchmark.md`
- `docs/redesign/R3_information_architecture.md`
- `docs/redesign/R4_preview_prototype_plan.md`
- `docs/redesign/R5_execution_roadmap.md`
- `frontend/src/hooks/useCurrentUser.ts` (P0.1)
- `frontend/src/tests/hooks/useCurrentUser.test.tsx` (P0.1)
- `frontend/src/stores/adminScopeStore.ts` (P0.2)
- `frontend/src/hooks/useActiveScope.ts` (P0.2)
- `frontend/src/tests/stores/adminScopeStore.test.ts` (P0.2)
- `frontend/src/tests/hooks/useActiveScope.test.tsx` (P0.2)
- `frontend/src/components/layout/AdminScopeSwitcher.tsx` (P1.1) — admin kapsam seçici bileşen (AppHeader'da `area="Admin"` ile render olur; non-admin rollerde `return null`)
- `frontend/src/tests/admin-scope-switcher.smoke.test.tsx` (P1.1) — 8 smoke test: non-admin render=null, mode=all label, dropdown open, user focus, return to all, Escape close, outside-click close, focused user label
- `frontend/src/components/layout/UserIdentityStrip.tsx` (P1.2) — user paneli sticky kimlik şeridi; avatar + isim + "Kendi alanım" chip'i + bildirim/bugün sayaçları; admin rolünde `return null` (panel user bakışı için)
- `frontend/src/tests/user-identity-strip.smoke.test.tsx` (P1.2) — 7 smoke test: admin null, unauthenticated null, user name+scope+avatar, notif chip visible/hidden (unread>0/==0), today chip visible/hidden (events>0/==0)
- `frontend/src/components/admin/AdminDigestDashboard.tsx` (P1.3) — admin paneli "Bugün" özet şeridi; 4 KPI tile (başarısız bugün / review bekliyor / retry adayı / yayın kuyruğu bugün) + scope-aware query keys + client-side filtreleme. Non-admin rollerde `return null`, scope hazır değilse render olmaz.
- `frontend/src/tests/admin-digest-dashboard.smoke.test.tsx` (P1.3) — 7 smoke test: user null, unauth null, 4 tile doğru sayılar (admin all-users), zero state, "Tüm Kullanıcılar" label, "Odaklı Kullanıcı" label, tile tıklandığında /admin/jobs'a navigate.
- `frontend/src/components/user/UserDigestDashboard.tsx` (P1.4) — user paneli "Bugün" özet şeridi; 4 KPI tile (Onayımı Bekleyen pending_review / Bu Hafta Yayın scheduled+completed+queued / Başarısız İş son 7 gün / Gelen Kutusu pending) + tıklanabilir CTA. Client-side parallel fetch (jobs + publish + inbox). Admin rolünde `return null` (panel user bakışı için).
- `frontend/src/tests/user-digest-dashboard.smoke.test.tsx` (P1.4) — 7 smoke test: admin null, unauth null, 4-tile doğru sayılar, zero state, Onayımı Bekleyen → /user/publish, Başarısız İş → /user/jobs, Gelen Kutusu → /user/inbox.
- `frontend/src/components/analytics/AnalyticsTabBar.tsx` (P2.2) — Router-aware tab stripi. İki export: `AdminAnalyticsTabBar` (5 sekme: Genel Bakış / İçerik / Operasyon / YouTube / Yayın → `/admin/analytics{,/content,/operations,/youtube,/publish}`) ve `UserAnalyticsTabBar` (3 sekme: Genel / YouTube / Kanal → `/user/analytics{,/youtube,/channels}`). Aktif sekme `useLocation().pathname` üzerinden prefix match ile türer (Zustand/query-string yok, URL tek gerçek kaynak). Mevcut `TabBar<T>` primitive üstünde çok ince adapter — yeni primitive tanımlanmadı (parallel pattern yok). `VisibilityGuard` + `panel:analytics` kontrolü çağıran sayfalarda zaten var, bu bileşen gate uygulamaz.
- `frontend/src/tests/analytics-tab-bar.smoke.test.tsx` (P2.2) — 10 smoke test: admin 5 sekme render, her admin path için doğru aktif sekme (overview/content/operations/youtube/publish), content prefix match (overview'ı aktif göstermez — en spesifik önce), user 3 sekme render, her user path için doğru aktif sekme (overview/youtube/channels), youtube prefix match. Click-to-navigate testleri eklenmedi (react-router'ın kendi davranışı; environment'ta `undici` AbortSignal sorunu). Aktif durum `font-semibold` class'ıyla doğrulanır.
- `frontend/src/components/settings/SettingsModuleLanding.tsx` (P2.3) — `/admin/settings` effective sekmesinin üstüne konulan modül manzarası. `useSettingsGroups()` ile tek kaynaklı; her grup için kart (GROUP_LABELS_MAP Türkçe etiket, total/wired/missing/secret sayıları). Kart tıklanınca `navigate("/admin/settings/:group")`. Sıralama `EffectiveSettingsPanel.groupOrder` ile aynı (tts/channels/publish... önde), listelenmemiş gruplar alfabetik sonda. `settings-module-landing` + `settings-module-card-{group}` testid'leri sözleşmeli.
- `frontend/src/tests/settings-module-landing.smoke.test.tsx` (P2.3) — 5 smoke test: effective sekmesinde 4 kart render, `/admin/settings/:group` breadcrumb + landing gizlenir + effective tab aktif (`font-semibold`), back-button varlığı, kart sayı metinleri ("14 ayar", "12 wired"), breadcrumb içinde filtre grubu adı. `createMemoryRouter` yerine `MemoryRouter + Routes` (P2.2'deki aynı undici AbortSignal incompat — navigate-click testleri atlandı, deep-link render + breadcrumb sözleşmeyi doğruluyor).
- `frontend/src/components/oauth/YouTubeCallbackBody.tsx` (P3.1) — Admin ve user YouTube OAuth callback sayfalarını tek motorda birleştiren ortak body. Tek prop: `mode: "admin" | "user"`. Admin mode: `state` yoksayılır, başarı redirect `/admin/settings`, error back butonu "Ayarlara Don", fallback metni uzun ("Google'dan gecerli bir yonlendirme yapilmamis olabilir"). User mode: `state` param `{channel_profile_id}:{nonce}` formatında parse, profile id backend'e geçer, başarı redirect `/user/channels/:id` (yoksa `/user/channels`), error back butonu "Kanallara Don", fallback metni kısa. Backend sözleşmesi değişmedi — her iki mode da `/api/v1/publish/youtube/auth-callback` endpoint'ini çağırıyor, yalnız redirect_uri path ayrışıyor. testids: `youtube-callback-admin` / `youtube-callback-user` / `youtube-callback-icon`.
- `frontend/src/tests/youtube-callback-body.smoke.test.tsx` (P3.1) — 8 smoke test: admin/user processing initial state (⏳ + heading), admin `?error=access_denied` → "Ayarlara Don" + "Baglanti Hatasi" + Google yetkilendirme hatası metni, user aynı hatada "Kanallara Don", admin code+error yoksa uzun fallback ("gecerli bir yonlendirme"), user kısa fallback (uzun kuyruk yok), admin error state'te user testid yok, user error state'te admin testid yok. `vi.mock("../api/client")` ile `api.post` never-resolving Promise döner — testler processing/error branch'lerini kapsar, success branch gerçek network gerektirdiği için kapsam dışı (backend sözleşmesi ayrıca backend-testleri ile doğrulanıyor).
- `frontend/src/components/calendar/CalendarListView.tsx` (P2.4) — Takvim "Liste" görünümü (hafta/ay grid'lerine alternatif kronolojik düz liste). Props: `{ eventsByDate, onSelectEvent, selectedEventId? }`. Tarih anahtarları (YYYY-MM-DD) kronolojik `.sort()` ile sıralanır; her gün içinde etkinlikler `start_at.localeCompare` ile saate göre sıralanır. Event type için mevcut renk tokenları yeniden kullanılır (content_project=brand, publish_record=info, platform_post=emerald; overdue → `!bg-error` dot override, inbox_item_id → `!bg-warning` dot + "inbox" badge). `selectedEventId` eşleşince row `bg-brand-50/50`. Boş durumda `data-testid="calendar-list-empty"` fallback ("Bu aralıkta etkinlik yok."). testid'ler: `calendar-list-view` / `calendar-list-day-{YYYY-MM-DD}` / `calendar-list-event-{id}`. Yalnızca render — veri yüklemesi/owner scope/filtreleme `UserCalendarPage`'de kalır (admin `isAdmin` flag'i ile aynı sayfayı sarmalıyor, bu nedenle list view hem panelde otomatik).
- `frontend/src/tests/calendar-list-view.smoke.test.tsx` (P2.4) — 7 smoke test: boş event map'te `calendar-list-empty` fallback + "etkinlik yok" metni, iki gün için gruplar kronolojik sıralanır (2026-04-18 önce 2026-04-20 sonra), bir gün içinde etkinlikler `start_at` sırasına göre (08:00 < 18:00), onSelectEvent click callback + geçen event parametresi, `selectedEventId="sel"` için `bg-brand-50/50` class, `inbox_item_id` dolu etkinlikte "inbox" badge, `event_type="publish_record"` için "Yayın" label. `makeEvent` helper tüm `CalendarEvent` required field'larını sağlar (partial override).
- `frontend/src/tests/calendar-default-view-persistence.smoke.test.tsx` (P2.4) — 5 smoke test: boş localStorage → builtin "month", valid stored `{v:1, view:"week"}` ve `{v:1, view:"list"}` geri yüklenir, versiyon uyumsuzluğu (`v:99`) → "month", bozuk JSON → "month", bilinmeyen view ("year") → "month". Helper (`loadDefaultView`) `UserCalendarPage.tsx`'teki module-local helper ile aynı sözleşme — intentional duplicate (contract doc). Backend KNOWN_SETTINGS key'i `user.calendar.default_view` aynı "month" default'unu paylaşır.
- `frontend/src/components/publish/PublishCard.tsx` (P2.5) — Board gorunumundeki tek bir yayin kaydini temsil eden kart. Ust bilesene verilen `onOpen(record)` tiklaninca tetiklenir (tablo "Detay" butonuyla ayni hedef). Prop: `{ record, onOpen, isSelected? }`. Icerik tipi Tr label (standard_video→Video, news_bulletin→Bulten), kisa content_ref_id, platform (capitalize), mevcut `StatusBadge` + statusVariant + statusLabel mapping'i, timestamp (status'a gore scheduled_at/published_at/created_at), deneme sayisi (>0 ise), `PublishErrorChip` (failed + last_error_category). `isSelected` true ise border-brand-400 + bg-brand-50/50. testids: `publish-card-{id}`, `publish-card-attempts-{id}`.
- `frontend/src/components/publish/PublishBoardColumn.tsx` (P2.5) — Tek sutun: baslik + sayac + kart listesi. Bos durumda "Bu sutunda kayit yok." fallback. Kartlar PublishCard instance'lari, scroll `max-h-[70vh]`. Drag & drop YOK — statu degisikligi icin detay sayfasina gidiliyor. testids: `publish-board-column-{status}`, `publish-board-count-{status}`, `publish-board-empty-{status}`.
- `frontend/src/components/publish/PublishBoard.tsx` (P2.5) — 6 sutun sabit siralama (draft / pending_review / approved / scheduled / published / failed — review-gate akisini soldan saga takip eder). `useMemo` ile kayitlari status'a gore grupluyor; sutunda yer almayan statuler (publishing / cancelled / review_rejected) kart olarak render edilmiyor (tablo gorunumunde kalir — kullanici bulk/triage icin tabloya gecer). testid: `publish-board`.
- `frontend/src/tests/publish-board.smoke.test.tsx` (P2.5) — 7 smoke test: 6 sutun render (bos dahi), status'a gore dogru sutun + count, bilinmeyen status'lar kart olarak render etmez, onOpen click callback record parametresi, kart statusLabel + platform + attempts render, attempts=0'da attempts chip yok, `selectedIds` set ile `border-brand-400` class.
- `frontend/src/tests/publish-default-view-persistence.smoke.test.tsx` (P2.5) — 5 smoke test: bos localStorage → "table", valid stored `{v:1, view:"board"}` + `{v:1, view:"table"}` geri yuklenir, versiyon uyumsuzlugu (`v:99`) → "table", bozuk JSON → "table", bilinmeyen view ("kanban") → "table". Helper `PublishCenterPage.tsx`'deki module-local helper ile ayni sozlesme (intentional duplicate: contract doc).
- `frontend/src/components/automation/AutomationFlowSvg.tsx` (P2.6) — User otomasyon politikasinin checkpoint matrisinden saf SVG akis gorseli: 5 kutu (Kaynak Tarama → Taslak → Render → Yayin → Yayin Sonrasi) + 4 ok. Mode→renk: `automatic` success yesil (fill var(--color-success-light)), `manual_review` warning sari, `disabled` neutral gri. Her kutuda mode rozetti (AUTO/ONAY/KAPALI). Altta legend. Props: `{ policy: AutomationPolicyResponse }`. Node boyutlari NODE_W=120 NODE_H=56 GAP=24 sabit; viewBox TOTAL_W × TOTAL_H responsive (parent `max-w-full`). **Dependency YOK** — `@xyflow/react` / `react-flow` / `d3` MEMORY §5.1 ile yasak, saf SVG + primitives. Matris form her zaman korunur; bu bilesen yaln kanbani/pasif onizleme. testids: `automation-flow-svg-container`, `automation-flow-svg`, `automation-flow-node-{key}`, `automation-flow-arrow-{i}`, `automation-flow-badge-{key}`.
- `frontend/src/tests/automation-flow-svg.smoke.test.tsx` (P2.6) — 7 smoke test: container+svg+5 node render, 4 ok ve 5. ok yok (sayi kontrat), mode→rozet eslemesi (automatic→AUTO, manual_review→ONAY, disabled→KAPALI), mode→fill rengi eslemesi (success-light/warning-light/neutral-100 string match, CSS var fallback hex uyumlu), node label metni SVG icinde (Kaynak Tarama/Taslak/Render/Yayin/Yayin Sonrasi), legend keys (AUTO/ONAY/KAPALI), all-disabled policy kill-switch simulasyon (5 rozet KAPALI + crash yok).
- `backend/alembic/versions/phase_al_001_approver_to_automation_policies.py` (P3.2) — Alembic migration (revision=phase_al_001, down_revision=phase_ag_001). Upgrade: `op.batch_alter_table("automation_policies")` içinde `approver_user_id` kolonu (String(36), nullable, FK→users.id ondelete SET NULL, **named constraint `fk_automation_policies_approver_user_id`** — SQLite batch mode adsız FK'yi reddediyor) + `ix_automation_policies_approver_user_id` index. Downgrade: index drop + `batch_op.drop_constraint(FK_NAME, type_="foreignkey")` + kolon drop. Dosya module-level `FK_NAME` ve `IX_NAME` sabitleri ile upgrade/downgrade arasında isim tutarlılığı.
- `backend/tests/test_phase_al_001_approver_migration.py` (P3.2) — 6 fresh-DB migration testi (`test_m7_c1_migration_fresh_db.py` patternini takip eder, `CONTENTHUB_DATA_DIR` env override + tempfile + subprocess alembic CLI). A: upgrade head → phase_al_001 revision; B: PRAGMA table_info'da approver_user_id var + VARCHAR(36) + nullable=1; C: ix_automation_policies_approver_user_id index var; D: downgrade -1 sonrası kolon+index yok, revision phase_ag_001; E: re-upgrade sonrasi kolon tekrar var (idempotent); F: PRAGMA default NULL + minimal insert chain (users + channel_profiles + automation_policies) → approver_user_id otomatik NULL.
- `frontend/src/tests/automation-approver-dropdown.smoke.test.tsx` (P3.2) — 9 smoke test UI kontrati: section + select testid'leri (`automation-approver-section`, `automation-approver-select`), initial value binding (`policy.approver_user_id ?? ""`), "Owner (varsayilan)" her zaman, "Kendim" yalniz userId varsa, onChange empty→null serializasyonu, onChange self→userId serializasyonu, help text "owner approver kabul edilir" + "Publish-gate enforcement bu dalgada yok", isPending=true iken select disabled. Focused fragment test (tam sayfa booting yerine JSX parcasi minimal wrapper'da yeniden render, vi.fn() spy). Backend spoof koruma service.py katmaninda (ayri suite).

### 4.3 Değiştirilen Dosyalar
- `.gitignore` — `**/node_modules` pattern (P0.1, symlink uyumu)
- `backend/app/publish/router.py` — (P0.3a) `owner_id` query param eklendi; admin-only override. Non-admin sessizce yoksayar; admin `Job.owner_id == override` filtresi uygular.
- `backend/app/publish/service.py` — (P0.3a) `list_publish_records` imzasına `admin_owner_id_override` parametresi; admin + override mevcut ise `Job` join + filter; non-admin yol değişmedi, backend authority korundu.
- `frontend/src/api/jobsApi.ts` — (P0.3a) `fetchJobs` params'a `owner_id?: string` alanı eklendi.
- `frontend/src/api/publishApi.ts` — (P0.3a) `PublishListParams` tipine `owner_id?: string` eklendi.
- `frontend/src/hooks/useJobsList.ts` — (P0.3a) `useActiveScope()` tüketildi; query key `["jobs", { ownerUserId, isAllUsers, includeArchived }]`; admin focused-user'da `owner_id` param geçirilir; `enabled: scope.isReady`.
- `frontend/src/hooks/usePublish.ts` — (P0.3a) `usePublishRecords` scope-aware; `scopedOwnerId = params.owner_id ?? (admin ? scope.ownerUserId : undefined)`; query key `[KEY, effectiveParams, { ownerUserId, isAllUsers }]`; by-job/by-project kullanımları dokunulmadı.
- `frontend/src/hooks/useChannelProfiles.ts` — (P0.3a) `useChannelProfiles(userId?)` explicit `userId` geçirildiği tüm call-site'larda geriye uyumlu; `userId` yoksa `useActiveScope()` üzerinden effective scope'a düşer; query key scope-aware.
- `frontend/src/pages/admin/AdminAutomationPoliciesPage.tsx` — (P0.3a) Statik `["automation-policies", "admin-scope"]` key yerine scope-aware key + `owner_user_id` filter; `enabled: scope.isReady`.
- `frontend/src/pages/admin/AdminConnectionsPage.tsx` — (P0.3a) `useActiveScope()` bağlandı; `effectiveUserFilter = userFilter || (admin ? scope.ownerUserId ?? "" : "")`; users ve channel-profiles query'leri scope-keyed; `params` memo `effectiveUserFilter` ile yeniden üretildi.
- `frontend/src/hooks/useAnalyticsOverview.ts` — (P0.3b) `useActiveScope()` tüketildi; cache key'e `{ ownerUserId, isAllUsers }` bloğu eklendi; admin scope değişince cache ayrışır.
- `frontend/src/hooks/useAnalyticsOperations.ts` — (P0.3b) aynı şekilde scope-aware key.
- `frontend/src/hooks/useAuditLogs.ts` — (P0.3b) `useActiveScope()` tüketildi; cache key'e scope bloğu; admin-only yüzey.
- `frontend/src/hooks/useAnalyticsFilters.ts` — (P0.3b) URL'de `user_id` yoksa ve scope admin focused-user ise `scope.ownerUserId` effective user_id olarak atanır. `apiParams` otomatik bu filtreyi backend'e yollar.
- `frontend/src/pages/user/UserCalendarPage.tsx` — (P0.3b) `useActiveScope()` bağlandı; `isAdmin` modunda admin "all" iken `owner_user_id=undefined`, admin focused-user iken `owner_user_id=scope.ownerUserId` geçirilir; hem channels hem calendar-events query'leri scope-keyed.
- `frontend/src/hooks/useJobsList.ts` + `usePublish.ts` + `useChannelProfiles.ts` + `AdminAutomationPoliciesPage.tsx` — (P0.3b düzeltmesi) `enabled: scope.isReady` gate'i KALDIRILDI: mevcut smoke testleri auth hidrat etmiyor, gate olursa tüm dashboard boş kalıyordu. Cache key scope parmak izi ile izolasyon sağlar; ownership backend'de zorlanır.
- `frontend/src/pages/admin/AdminCommentMonitoringPage.tsx` — (P0.3c) `useActiveScope()` bağlandı; `scopedDefaultUser = admin focused-user ? scope.ownerUserId : ""`; `userFilter` state default olarak o atanır. `useEffect` ile scope değişince manuel seçim yoksa snap eder; manuel seçim korunur. Channels query key `["channel-profiles", userFilter || "all", { ownerUserId, isAllUsers }]` şekline alındı.
- `frontend/src/pages/admin/AdminPlaylistMonitoringPage.tsx` — (P0.3c) Aynı patern: `useActiveScope()` + `scopedDefaultUser` + snap `useEffect` + scope-aware channels query key.
- `frontend/src/pages/admin/AdminPostMonitoringPage.tsx` — (P0.3c) Aynı patern: `useActiveScope()` + `scopedDefaultUser` + snap `useEffect` + scope-aware channels query key.
- `frontend/src/pages/admin/AdminNotificationsPage.tsx` — (P0.3c) `useActiveScope()` bağlandı; admin focused-user ise `fetchNotifications`, `fetchNotificationCount`, `markAllNotificationsRead` çağrıları `owner_user_id` parametresini geçirir. Query key'lere `{ ownerUserId, isAllUsers }` bloğu eklendi — cache çapraz kirlenme olmaz.
- `frontend/src/pages/user/UserInboxPage.tsx` — (P0.3c) Admin wrapper (`isAdmin=true`) için `useActiveScope()` fallback: admin focused-user'da inbox o user'a daraltılır, admin "all" seçerse tüm kapsam görünür (mevcut davranış). User rolünde davranış değişmedi. Query key'e scope bloğu eklendi.
- `frontend/src/components/layout/AppHeader.tsx` — (P1.1) `AdminScopeSwitcher` import edildi; `area === "Admin"` branşında `SurfaceActiveBadge`'den sonra `flex-1` spacer'dan önce `<AdminScopeSwitcher className="ml-3" />` render ediliyor. Admin dışı area'larda render olmaz; bileşen içindeki rol guard da non-admin'de null döner (çifte savunma, sızdırma ihtimali sıfır).
- `frontend/src/pages/UserDashboardPage.tsx` — (P1.4) `UserDigestDashboard` import edildi ve `onboardingCompleted` branşının en üstüne `<UserDigestDashboard />` olarak eklendi. Mevcut "Hızlı Oluştur", "Son Projelerim", "Kanallarım", "Otomasyon Özeti", "İş Takibi" bölümleri dokunulmadı — digest ÜSTÜNE konuldu. Surface override yolu (`useSurfacePageOverride("user.dashboard")`) ilk satırda korundu; override aktif sürümlerde digest yerine override dönüyor (mevcut sözleşme).
- `frontend/src/pages/AdminOverviewPage.tsx` — (P1.3) `AdminDigestDashboard` import edildi ve `PageShell` altında `AdminAnalyticsFilterBar`'dan ÖNCE render ediliyor. Mevcut KPI/grafik bölümleri dokunulmadan korundu; digest ÜSTÜNE konuyor (yerine geçmiyor). Kapsam: client-side parallel fetch (MEMORY §5.2'deki bilinçli karar), yeni backend endpoint açılmadı.
- `frontend/src/app/layouts/UserLayout.tsx` — (P1.2) `UserIdentityStrip` import edildi; `<main>` içinde `<Outlet />` öncesine eklendi. `-mx-[var(--ch-page-padding)] -mt-[var(--ch-page-padding)] mb-4` ile main'in padding'ini nötralize edip edge-to-edge sticky şerit olarak yerleşti. Strip bileşen içi guard ile user olmayan rolde null döner; legacy user shell'i için yeterli — surface varyantlarına entegrasyon kapsam dışı (farklı nav mimarileri, P3.1 duplicate cleanup sonrasına ertelenebilir).
- `frontend/src/app/layouts/useLayoutNavigation.ts` — (P2.1) 4 export (`ADMIN_NAV`, `HORIZON_ADMIN_GROUPS`, `USER_NAV`, `HORIZON_USER_GROUPS`) R3 §2.1 / §3.1 hedef IA'ya uyarlandı. Admin: 9 bölüm → 7 + "Bugün" + "Scope" (eski "Kullanıcılar" bölümü Scope'a taşındı — AdminScopeSwitcher kaynak sayfası); "Yayın" → "Yayın & Takvim" birleşti; "İçerik Üretimi" → "Üretim" (kısa). Nav'dan kaldırılanlar (sayfalar canlı): Video Wizard ayrı giriş, Şablon-Stil Bağlantıları, Kullanılan Haberler, YouTube Analytics. User: 12 düz giriş → 6 grup (Bugün / Üretim / Yayın / Kanallar / Etkileşim / Analitik / Ayarlar) — Horizon ve Classic artık aynı grup iskeleti. Yeni visibility key `panel:calendar` + `useAdminVisibilityMap`'e entegre + `ROUTE_VISIBILITY`'a `/admin/calendar` eklendi; sayfa rotaları (`/admin/calendar`, `/user/automation`, `/user/inbox`, `/user/connections`) router'da zaten mevcut — yalnız sidebar sözleşmesi güncellendi. `UserNavItem` interface `section?` + `moduleId?` genişletildi (Classic user sidebar artık section header destekliyor — AppSidebar zaten `section` boolean'ı işliyordu, sadece tip genişledi).
- `frontend/src/tests/app.smoke.test.tsx` — (P2.1) "admin sidebar shows section headers" testi "İçerik Üretimi" → "Üretim" için güncellendi (yeni kısa grup adı). Test sayısı değişmedi.
- `frontend/src/pages/admin/AnalyticsOverviewPage.tsx` — (P2.2) `AdminAnalyticsTabBar` import ve `PageShell` içinde ilk child olarak render. Mevcut sub-nav "Analytics Alanları" Link grid'i korundu (3 sayfa smoke testi ona bağlı). Sayfa içeriği değişmedi.
- `frontend/src/pages/admin/AnalyticsContentPage.tsx` — (P2.2) `AdminAnalyticsTabBar` `PageShell` içinde "Analytics'e dön" Link'inden önce render.
- `frontend/src/pages/admin/AnalyticsOperationsPage.tsx` — (P2.2) `AdminAnalyticsTabBar` `PageShell` içinde sr-only "Analytics'e dön" Link'inden önce render.
- `frontend/src/pages/admin/AdminYouTubeAnalyticsPage.tsx` — (P2.2) `AdminAnalyticsTabBar` `PageShell` içinde "Analytics'e dön" Link'inden ve `SnapshotLockDisclaimer`'dan önce render.
- `frontend/src/pages/admin/PublishAnalyticsPage.tsx` — (P2.2) `AdminAnalyticsTabBar` `PageShell` içinde "Analytics'e dön" Link'inden önce render.
- `frontend/src/pages/user/UserAnalyticsPage.tsx` — (P2.2) `UserAnalyticsTabBar` `LegacyUserAnalyticsPage`'nin `PageShell` içinde `WindowSelector` div'inden önce render.
- `frontend/src/pages/user/UserChannelAnalyticsPage.tsx` — (P2.2) `UserAnalyticsTabBar` `PageShell` içinde "Controls" flex div'inden önce render.
- `frontend/src/pages/user/UserYouTubeAnalyticsPage.tsx` — (P2.2) `UserAnalyticsTabBar` `PageShell` içinde empty/error state'lerinden önce render.
- `frontend/src/components/settings/EffectiveSettingsPanel.tsx` — (P2.3) Opsiyonel `initialGroup?: string` prop eklendi; `filterGroup` state bu prop'tan seed ediliyor + `useEffect` URL değişince re-sync yapıyor. Parametresiz çağrı (eski tüm call-site'lar) davranış değiştirmedi — prop verilmediğinde `undefined` → tüm gruplar, önceki sözleşme korundu. Parallel pattern yok: aynı bileşen, sadece giriş noktası genişledi.
- `frontend/src/pages/admin/SettingsRegistryPage.tsx` — (P2.3) `useParams()` ile `:group` param okunuyor; param varsa `activeTab` otomatik "effective" açılır + `EffectiveSettingsPanel` `initialGroup={groupParam}` alır. Effective sekmesinde param YOKSA `<SettingsModuleLanding />` (kart grid'i) gösterilir; param VARSA `<div settings-module-breadcrumb>` ("← Tüm modüller" butonu + "Filtre: <group>" metni) gösterilir. Sekme değişirken group param'ı otomatik temizlenir (`navigate("/admin/settings")`). Mevcut 3-sekme (credentials / effective / registry) yapısı, `settings-tab-*` testid'leri, subtitle kutusu, `ReadOnlyGuard targetKey="panel:settings"`, `PageShell title="Ayarlar"` bozulmadan korundu.
- `frontend/src/app/router.tsx` — (P2.3) `/admin/settings/:group` rotası eklendi (mevcut `/admin/settings`'ın yanında), her ikisi de `VisibilityGuard targetKey="panel:settings"` altında `<SettingsRegistryPage />` render ediyor.
- `frontend/src/pages/admin/YouTubeCallbackPage.tsx` — (P3.1) 100 LoC'den 12 LoC thin-wrapper'a indirildi: sadece `<YouTubeCallbackBody mode="admin" />` döner. Tüm OAuth callback business logic (state parse, backend call, redirect, error handling) `components/oauth/YouTubeCallbackBody.tsx` içine taşındı. Mevcut route `/admin/settings/youtube-callback` sözleşmesi değişmedi.
- `frontend/src/pages/user/UserYouTubeCallbackPage.tsx` — (P3.1) 105 LoC'den 12 LoC thin-wrapper'a indirildi: sadece `<YouTubeCallbackBody mode="user" />` döner. `state` param parsing + user-specific redirect logic body içine taşındı. Route `/user/settings/youtube-callback` sözleşmesi değişmedi. Calendar/Inbox/JobDetail pair'leri gibi body-extraction paterni (MEMORY §5.4'teki yerleşik pattern).
- `frontend/src/tests/sprint4-prelaunch-polish.smoke.test.tsx` — (P3.1) `FILES_SHOULD_USE_API_CLIENT` listesinde `pages/admin/YouTubeCallbackPage.tsx` → `components/oauth/YouTubeCallbackBody.tsx` olarak güncellendi; thin-wrapper page artık api client kullanmıyor (business logic body'de), test doğru dosyayı kontrol ediyor. Test sayısı (56) değişmedi.
- `backend/app/settings/settings_resolver.py` — (P2.4) KNOWN_SETTINGS'e `user.calendar.default_view` entry eklendi: `group="ui"`, `type="string"`, `module_scope="calendar"`, `builtin_default="month"`, `visible_to_user=True`, `user_override_allowed=True`, `read_only_for_user=False`, `wired=True`, `wired_to="frontend.UserCalendarPage localStorage bridge"`. Help text localStorage anahtarının (`calendar.default_view`, versiyon=1) ve üç değerin (list/week/month) sözleşmesini dokümante ediyor. Bu MVP kararı: frontend localStorage üzerinden persist ediyor, Settings Registry key'i visibility/documentation/override-allowed deklarasyonu için var (backend read-through ileride eklenebilir). CLAUDE.md "hardcoded behavior" kuralını karşılıyor — varsayılan görünüm artık görünür/yönetilebilir/traceable.
- `frontend/src/pages/user/UserCalendarPage.tsx` — (P2.4) `ViewMode` tipi `"week" | "month"` → `"list" | "week" | "month"` genişletildi. Module-scope helper'ler eklendi: `loadDefaultView()` (try-catch + version/shape validation, fallback "month") ve `persistDefaultView()` (silent write, `{ v: 1, view }` shape). `useState<ViewMode>("month")` → `useState<ViewMode>(() => loadDefaultView())` + setView wrapper her değişimde persist eder. Toggle 2 butondan 3 butona (Liste / Hafta / Ay) genişledi; `data-testid="calendar-view-toggle"`, `calendar-view-list|week|month`. Render branch şimdi `view === "list" ? <CalendarListView …/> : view === "month" ? <MonthGrid/> : <WeekList/>`. `CalendarListView` import eklendi. Admin `AdminCalendarPage` dokunulmadı — mevcut 11-LoC thin-wrapper UserCalendarPage'i `isAdmin=true` ile sarmalıyor, list view her iki panelde sıfır ekstra değişiklikle çalışıyor.
- `frontend/src/pages/admin/PublishCenterPage.tsx` — (P2.5) `PublishViewMode = "table" | "board"` type + module-scope helper'ler (`loadDefaultPublishView` / `persistDefaultPublishView`, localStorage `publish.center.default_view` v=1 shape validation + silent fallback "table"). `LegacyPublishCenterPage` içinde `view` state (`useState<PublishViewMode>(() => loadDefaultPublishView())`) + `setView` wrapper her değişimde persist. Toolbar altında `role="tablist"` toggle (Tablo / Board) eklendi (`data-testid="publish-view-toggle"`, `publish-view-table|board`). BulkActionBar sadece tablo modunda render (board MVP'de secim yok, bulk action akisini tabloya dusuriyor). `SectionShell` icindeki render branch: `view === "table"` → mevcut DataTable + Pagination; `view === "board"` → empty/loading/error guard'li `<PublishBoard ...>` (kart tiklaninca `navigate(/admin/publish/:id)`). Mevcut filtreler (status/platform/module/error) her iki gorunumde paylasilir — board'da status filtresi secili ise yalniz o sutun dolu olur.
- `backend/app/settings/settings_resolver.py` — (P2.5) KNOWN_SETTINGS'e iki yeni entry eklendi: (1) `publish.center.board_view.enabled` (group=publish, type=boolean, module_scope=publish, builtin_default=True, visible_to_user=False, user_override_allowed=False, read_only_for_user=True, wired_to="frontend.PublishCenterPage toggle visibility") — kanban gorunumunun etkin olup olmadigini gelecekteki kill-switch olarak dokumante eder; (2) `publish.center.default_view` (group=publish, type=string, module_scope=publish, builtin_default="table", visible_to_user=True, user_override_allowed=True, read_only_for_user=False, wired_to="frontend.PublishCenterPage localStorage bridge") — varsayilan gorunum tercihi dokumantasyonu. MVP'de frontend localStorage persist ediyor; Settings Registry key'i visibility/override sozlesmesini kayit ediyor.
- `frontend/src/pages/user/UserAutomationPage.tsx` — (P2.6) `AutomationFlowSvg` bileşeni import edildi + `{selectedPolicy && ...}` branch'inde policy header'dan sonra, "Checkpoint Matrisi" h3'ünden önce `<AutomationFlowSvg policy={selectedPolicy} />` render ediliyor. Matris form (5 CHECKPOINT_META dropdown) tamamen korundu; SVG yaln pasif/önizleme. Mevcut davranış (Kanal seçici, policy toggle, mode buttons, operasyonel limitler, executor notice) değişmedi.
- `backend/app/settings/settings_resolver.py` — (P2.6) KNOWN_SETTINGS'e `user.automation.flow_visual.enabled` entry eklendi: `group="automation"`, `type="boolean"`, `module_scope="automation"`, `builtin_default=True`, `visible_to_user=False`, `user_override_allowed=False`, `read_only_for_user=True`, `wired=True`, `wired_to="frontend.UserAutomationPage flow visual guard"`. Admin-only kill switch semantiği (P2.5 `publish.center.board_view.enabled` ile aynı pattern). MVP'de declarative: builtin True, runtime read-through yok — ileride bayrağa göre `UserAutomationPage`'in SVG render'ını gizleme kapısı açılabilir. CLAUDE.md "hardcoded behavior" kuralı karşılandı.
- `backend/app/db/models.py` — (P3.2) `AutomationPolicy` sınıfına `approver_user_id: Mapped[Optional[str]]` kolonu eklendi: `String(36)`, `ForeignKey("users.id", name="fk_automation_policies_approver_user_id", ondelete="SET NULL")`, `nullable=True`, `index=True`. NULL semantiği: "owner is approver" (backward compat, mevcut kayıtlar değişmedi). Named FK constraint migration ile senkronize — Alembic autogenerate-drift testi için gerekli.
- `backend/app/automation/schemas.py` — (P3.2) `AutomationPolicyCreate` ve `AutomationPolicyUpdate` Pydantic modellerine `approver_user_id: Optional[str] = Field(None, max_length=36)` eklendi; `AutomationPolicyResponse`'a `approver_user_id: Optional[str] = None` eklendi. NULL → "owner is approver" sözleşmesi dokümante (docstring). Mevcut alanlar değişmedi.
- `backend/app/automation/service.py` — (P3.2) `create_automation_policy` içinde owner_user_id spoof handling bloğundan sonra approver_user_id spoof koruması: non-admin caller `approver_user_id != caller.user_id` ise sessizce caller.user_id'e yeniden yazılır (403 değil; owner_user_id ile aynı pattern). `AutomationPolicy(...)` constructor'ına `approver_user_id=approver_user_id` geçirildi. `update_automation_policy` içinde `updates` dict'i setattr loop'undan ÖNCE aynı rewrite uygulanır (`if "approver_user_id" in updates and not caller_ctx.is_admin_role ...`). Admin caller için kısıtlama yok (admin başka user'ları atayabilir — ileride dropdown UI bu izni tüketecek).
- `backend/app/settings/settings_resolver.py` — (P3.2) KNOWN_SETTINGS'e `automation.approver_assignment.enabled` entry eklendi: `group="automation"`, `type="boolean"`, `module_scope="automation"`, `builtin_default=False`, `visible_to_user=False`, `user_override_allowed=False`, `read_only_for_user=True`, `wired=True`, `wired_to="backend.AutomationPolicy.approver_user_id + frontend.UserAutomationPage approver dropdown"`. Admin-only declarative kill switch: MVP'de runtime read-through yok (dropdown her zaman görünür, bu dalgada publish-gate enforcement eklenmedi); ileride bayrak aktifleşirse approver-only visibility + publish-gate kapıları bu key üzerinden açılır. CLAUDE.md "Every new feature ships with its settings surface" kuralı karşılandı (KNOWN_SETTINGS checklist ✅).
- `frontend/src/api/automationApi.ts` — (P3.2) `AutomationPolicyResponse` tipine `approver_user_id: string | null` alanı; `AutomationPolicyCreate` ve `AutomationPolicyUpdate` tiplerine `approver_user_id?: string | null` eklendi. Backend schema ile birebir uyum. JSDoc: "Phase AL / P3.2: approver (NULL => owner is approver)".
- `frontend/src/pages/user/UserAutomationPage.tsx` — (P3.2) Operasyonel limitler bloğunun içine "Onaylayici (Approver)" dropdown fragment'ı eklendi (max_daily_posts input'unun hemen altında, aynı flex/gap container'ı paylaşıyor). `data-testid="automation-operational-limits"` container'a, `automation-approver-section` ve `automation-approver-select` iç öğelere eklendi. Seçenekler: `<option value="">Owner (varsayilan)</option>` (her zaman) + `{userId && <option value={userId}>Kendim</option>}`. onChange empty→null serializasyonu (`e.target.value === "" ? null : e.target.value`). Help text "Bos birakilirsa politikanin sahibi (owner) approver kabul edilir. Publish-gate enforcement bu dalgada yok — alan declarative." Mevcut checkpoint matrisi, flow SVG, policy header, toggle, executor notice davranışları değişmedi — dropdown aditif.

---

## 5. Bu Dalgada Bilinçli Olarak Yapılmayanlar / Reddedilenler / Teknik Olarak İmkansız Olanlar

### 5.1 Reddedilenler (kullanıcı net talimatı, REV-2'de tekrar onaylandı)
- ❌ Workspace switcher / org picker / project picker
- ❌ Team switcher / team management
- ❌ Organization management
- ❌ Multi-tenant enterprise tier (billing, licensing, SSO federation)
- ❌ Ağır yeni npm dependency (özellikle `@xyflow/react` ~140 KB gzip, react-flow, d3-graph kategorileri)
- ❌ Kod kopyalama (rakipten de içeriden de)
- ❌ Hardcoded çözüm (her davranış Settings Registry üstünden)
- ❌ "Sıfırdan rastgele UI" — mevcut ürünün evrimi

### 5.2 Bu Dalgada Bilinçli Atlananlar (aktif karar)
- ⏸ **P0.4 Query key ESLint rule** — insan disiplini + test coverage yeterli; tooling gerekmiyor
- ⏸ **Mobile / PWA** — scope dışı; `ileride istenebilecekler`e
- ⏸ **Semantic dedupe** — News hard dedupe yeterli
- ⏸ **Preview analytics** — preview sayısı/tercih telemetrisi henüz gerekmiyor
- ⏸ **Vite bundle code-split** — localhost-first için bloke değil (gzip ~404 kB kabul edilebilir)
- ⏸ **Platform adapter registry** — tek platform (YouTube) yeterli, community post API 3rd party'e kapalı
- ⏸ **Real-time collaboration** (birden fazla kullanıcı aynı anda aynı sayfa)
- ⏸ **Template marketplace**
- ⏸ **AI-assisted automation suggestion**
- ⏸ **External broker integration**
- ⏸ **Custom `/api/v1/dashboard/admin/digest` endpoint** — P1.3'te client-side parallel fetch ile başla, perf sorunu olursa ekle

### 5.3 Teknik Olarak İmkansız / Kısıtlı Olanlar
- 🚫 YouTube community post API — 3rd party'e kapalı (sadece resmi app)
- 🚫 Remotion composition mapping'i değiştirmek — bu dalga dışı (CLAUDE.md: "safe composition mapping")
- 🚫 Snapshot-lock davranışını bozmak — P3.3 wizard unification'da bile kural korunacak
- 🚫 Main branch'e merge — bu dalgada asla

### 5.4 Bilinçli Korunacaklar (dokunulmayacak)
- ✅ `UserPublishEntryPage` scaffold (13 test bağlı)
- ✅ Surface mod varyantları legacy fallback (kullanıcı sürpriz görmez)
- ✅ `useLayoutNavigation.ts` single-source pattern (yalnız array içeriği güncellenir, yapı değişmez)
- ✅ Snapshot-lock davranışı (`effective_settings_snapshot_id` yazımı)
- ✅ Tüm CLAUDE.md non-negotiable kuralları
- ✅ Design tokens guide (`text-neutral-900/200` vb. kuralları)
- ✅ React Query + Zustand ayrımı
- ✅ Alembic tek migration otoritesi (Alembic dışı manuel SQL yok)

---

## 6. İleride İstenebilecekler (not olarak tutulur, bu dalgada yok)

- Mobil uygulama / PWA
- Multi-tenant enterprise tier (workspace/org switcher) — kullanıcı net "hayır" dedi
- Billing ve licensing
- External broker integration
- Real-time collaboration (birden fazla kullanıcı aynı anda aynı sayfa)
- Template marketplace
- AI-assisted automation suggestion
- Query key ESLint rule (opsiyonel tooling)
- Preview analytics + semantic dedupe

---

## 7. Risk/Bağımlılık Zinciri (R2 için girdi)

**R3 IA önerisi gerektiriyor:**
- R2 benchmark sonuçları (pattern seçimi)
- R1 envanter (mevcut ekranlar)
- Senin onayladığın "tenant-scoped isolation + admin all-users" ilkesi

**R4 preview gerektiriyor:**
- R3 IA onayı (önce mimari, sonra görsel)
- Mevcut tema/tokens rehberi (değiştirilmeyecek)
- Hangi ekranların preview'e gireceği kısa listesi

**R5 yol haritası gerektiriyor:**
- R3 + R4 onayı
- Mevcut main commit history (F4'e kadar neyin üstüne inşa ediyoruz)
- Veri modeli değişiklikleri gerektiren iş kalemleri ayrımı

---

## 8. Değişiklik Kaydı (bu memory'nin kendi history'si)

| Tarih | Faz | Değişiklik |
|---|---|---|
| 2026-04-17 | R1 kapanış | İlk sürüm — ilkeler + R1 özet + yapılan/yapılmayan listeleri |
| 2026-04-17 | R2 kapanış | 9 platform × 7 kategori benchmark eklendi, 4-etiket tablosu, commit `16c93bc` |
| 2026-04-17 | R3 kapanış | Admin nav 32→27, user 12→15, 6 duplicate karar, surface/wizard canon, commit `b7c77a3` |
| 2026-04-17 | R4 kapanış | 4 yeni component + 5 sayfa evrim planı, preview dosya konumu, commit `8746047` |
| 2026-04-17 | R5 kapanış | 14 kalem / 4 kademe (P0/P1/P2/P3) yol haritası, effort/risk matrisi, R7 wizard ertelendi, R6 onay kapısı açık |
| 2026-04-17 | REV-2 kararı | Kullanıcı: "R6 kapısı kaldırılsın, 16 kalem tek dalgada bitsin, R7 ayrı faz olmasın, wizard dahil"; §1.5 çalışma kuralları + §1.6 plan tablosu + §5 yapılmayanlar bölümü + §2 faz tablosu güncellendi; R5 dosyası REV-2'ye alındı (commit `848ea23`) |
| 2026-04-17 | P0.1 tamam | `useCurrentUser()` hook + 4 unit test (disabled/enabled/error/key). Vitest PASS (4/4), tsc --noEmit temiz, vite build başarılı. .gitignore `**/node_modules` eklendi (symlink için) |
| 2026-04-17 | P0.2 tamam | `adminScopeStore` (Zustand + localStorage versioned shape v=1) + `useActiveScope()` hook (role/mode matrix + defensive fallback). 14 store test + 5 hook test, vitest PASS (19/19), tsc --noEmit temiz, vite build başarılı |
| 2026-04-18 | P0.3a tamam | Jobs/Publish/Channels/Automation admin fetch refactor. Backend: `publish/router.py` + `publish/service.py` — admin-only `owner_id` override (non-admin yol değişmedi, backend authority korundu). Frontend: `jobsApi.ts` + `publishApi.ts` — `owner_id` alanı; `useJobsList` + `usePublishRecords` + `useChannelProfiles` scope-aware query key ve `scope.isReady` gate; `AdminAutomationPoliciesPage` + `AdminConnectionsPage` `useActiveScope()` bağlandı. Test sonucu: P0.1+P0.2 mevcut 23/23 vitest PASS, tsc --noEmit exit 0, vite build başarılı (3.48s). `useChannelProfiles(userId)` call-site'ları grep ile doğrulandı — hepsi explicit userId geçiriyor, geriye uyum kırılmadı. |
| 2026-04-18 | P0.3b tamam | Analytics/Calendar/Audit admin fetch refactor. `useAnalyticsOverview` + `useAnalyticsOperations` + `useAuditLogs` scope-aware cache key. `useAnalyticsFilters` admin focused-user fallback (URL user_id yoksa scope.ownerUserId). `UserCalendarPage` admin modunda scope'a göre owner_user_id geçirir. P0.3b düzeltmesi: `enabled: scope.isReady` gate'i P0.3a hook'larından (useJobsList/usePublish/useChannelProfiles) + AdminAutomationPoliciesPage'den KALDIRILDI — smoke test'ler auth hidrat etmiyordu, gate dashboard'ı boşaltıyordu. Test sonucu: **full vitest 2560/2560 PASS** (35 skipped, 218 test dosyası), tsc --noEmit exit 0, vite build başarılı (3.90s). |
| 2026-04-18 | P0.3c tamam | Monitoring (Comment/Playlist/Post) + Notifications + Inbox admin fetch refactor. 5 sayfa scope-aware: AdminComment/Playlist/PostMonitoringPage `userFilter` default `scopedDefaultUser`'a atanır, scope değişince manuel seçim yoksa snap eder; channels query key `{ ownerUserId, isAllUsers }` bloğu taşır. AdminNotificationsPage `owner_user_id` parametresini list/count/mark-all-read çağrılarına geçirir. UserInboxPage admin wrapper'ı admin focused-user'da inbox'ı o user'a daraltır. Test sonucu: **full vitest 2560/2560 PASS** (35 skipped, 218 dosya, 25.46s), tsc --noEmit exit 0, vite build başarılı (3.38s). |
| 2026-04-18 | P1.2 tamam | `UserIdentityStrip` bileşeni UserLayout main'inin en üstüne (sticky) eklendi. Kullanıcıya "Sen: <İsim> • Kendi alanım • 🔔 N yeni 📅 M bugün" hissini veren kimlik şeridi. Veri: `useCurrentUser()` + `useNotifications({ mode: "user" })` + `fetchCalendarEvents({ owner_user_id })`. Admin rolünde render olmaz — user panel user bakışı için. Unauthenticated ve non-user rollerde de null. 7 smoke test yazıldı (admin null, unauth null, user+name+scope+avatar, notif chip show/hide, today chip show/hide). Surface varyantlarına entegrasyon (Canvas/Atrium/Bridge) bu dalgada kapsam dışı; legacy `UserLayout` yeterli. Test sonucu: **full vitest 2575/2575 PASS** (+7), 35 skipped, 219 dosya + 1 skip, 253 s. `tsc --noEmit` exit 0, `vite build` başarılı (4.09s). |
| 2026-04-18 | P2.1 tamam | Nav yeniden gruplandırma — `useLayoutNavigation.ts` 4 export (`ADMIN_NAV`, `HORIZON_ADMIN_GROUPS`, `USER_NAV`, `HORIZON_USER_GROUPS`) R3 §2.1 ve §3.1 hedef IA'ya uyarlandı. Admin sidebar 9 bölümden 7 grup + "Bugün" + "Scope"a (kullanıcılar Scope altına taşındı — AdminScopeSwitcher kaynak sayfası) düzenlendi; "Yayın" → "Yayın & Takvim" birleşti; "İçerik Üretimi" → "Üretim" (kısa isim). Nav'dan kaldırılanlar (sayfalar canlı kalır): Video Wizard ayrı giriş (Standart Video action button), Şablon-Stil Bağlantıları (template detail tab'a ertelendi), Kullanılan Haberler (news-items tab), YouTube Analytics (Analytics Merkezi tab — P2.2'de birleştirilecek). User sidebar 12 düz girişten 6 grup (Bugün / Üretim / Yayın / Kanallar / Etkileşim / Analitik / Ayarlar) — Classic ve Horizon artık aynı grup iskeleti (R3 §3 tutarlılık hedefi): Otomasyonlarım, Bağlantılarım, Gelen Kutusu, Takvim Classic user sidebar'da ilk kez göründü. Yeni visibility key `panel:calendar` (registry'de tanımlı değilse default true — mevcut sözleşme) `useAdminVisibilityMap`'e ve `ROUTE_VISIBILITY`'e eklendi. `UserNavItem` interface `section?` + `moduleId?` ile genişletildi (AppSidebar zaten `section` boolean'ı ele alıyordu). Test: `app.smoke.test.tsx` "admin sidebar section headers" testi "İçerik Üretimi" → "Üretim" olarak güncellendi. Test sonucu: **full vitest 2589/2589 PASS**, 35 skipped, 221 dosya + 1 skip, 256s. `tsc --noEmit` exit 0, `vite build` başarılı (4.24s). |
| 2026-04-18 | P1.4 tamam | `UserDigestDashboard` bileşeni UserDashboardPage `onboardingCompleted` branşının üstüne eklendi. 4 KPI tile: Onayımı Bekleyen (publish.review_state=pending_review) / Bu Hafta Yayın (scheduled+completed+queued, pazartesi-pazar local) / Başarısız İş (jobs.status=failed, son 7 gün) / Gelen Kutusu (inbox.status=pending). Client-side parallel fetch (jobs+publish+inbox) + lokal filtre — backend endpoint açılmadı (MEMORY §5.2). `useActiveScope()` user rolünde ownerUserId=self; backend zaten scope'u zorluyor, client sadece görsel. ClickableTile wrapper ile Enter/Space keyboard CTA. Admin rolünde `return null` (panel user bakışı için), unauth null. Mevcut "Hızlı Oluştur / Son Projelerim / Kanallarım / Otomasyon Özeti / İş Takibi" bölümleri dokunulmadan korundu. 7 smoke test yazıldı: admin null, unauth null, 4-tile doğru sayı, zero state, Onayımı Bekleyen → /user/publish, Başarısız İş → /user/jobs, Gelen Kutusu → /user/inbox. Test sonucu: **full vitest 2589/2589 PASS** (+7), 35 skipped, 221 dosya + 1 skip, 161s. `tsc --noEmit` exit 0, `vite build` başarılı (3.46s). |
| 2026-04-18 | P1.3 tamam | `AdminDigestDashboard` bileşeni AdminOverviewPage üstüne eklendi. 4 KPI tile: Başarısız İşler (bugün) / Review Bekleyen (inbox pending) / Retry Adayı (failed & retry_count<3) / Yayın Kuyruğu (bugün queued+scheduled). Client-side parallel fetch (MEMORY §5.2 bilinçli karar, yeni backend endpoint yok): `useQuery` × 3 (jobs, publish, inbox) + lokal filtre. Scope-aware: `useActiveScope()` ile admin "Tüm Kullanıcılar" modunda owner filter undefined, "Odaklı Kullanıcı" modunda `owner_id`/`owner_user_id` geçer. Her tile tıklanabilir CTA (navigate `/admin/jobs`, `/admin/inbox`, `/admin/publish`); `ClickableTile` wrapper ile keyboard-accessible (Enter/Space). Mevcut "Yönetim Paneli" KPI/grafik alt katmanı dokunulmadan korundu — digest ÜSTÜNE konuluyor. 7 smoke test yazıldı: non-admin null, unauth null, 4-tile doğru sayı, zero state, "Tüm Kullanıcılar" label, "Odaklı Kullanıcı" label, tile click navigasyon. Test sonucu: **full vitest 2582/2582 PASS** (+7), 35 skipped, 220 dosya + 1 skip, 248s. `tsc --noEmit` exit 0, `vite build` başarılı (4.00s). |
| 2026-04-18 | P2.2 tamam | Analytics tabs (3 → 1) — `AnalyticsTabBar.tsx` yeni dosya; router-aware tek bileşen (`TabBar<T>` primitive üstünde ince adapter, parallel pattern yok). `AdminAnalyticsTabBar` 5 sekme (Genel Bakış / İçerik / Operasyon / YouTube / Yayın), `UserAnalyticsTabBar` 3 sekme (Genel / YouTube / Kanal). Aktif sekme `useLocation().pathname` prefix match ile türer — URL tek gerçek kaynak (Zustand/query-string yok). 5 admin analytics sayfası (AnalyticsOverviewPage, AnalyticsContentPage, AnalyticsOperationsPage, AdminYouTubeAnalyticsPage, PublishAnalyticsPage) + 3 user analytics sayfası (UserAnalyticsPage/Legacy, UserChannelAnalyticsPage, UserYouTubeAnalyticsPage) `PageShell` içine bar ilk child olarak eklendi — rota yapısı ve PageShell başlıkları korundu, deep-link bookmark'ları aynen çalışır. `/admin/analytics/channel-performance` rotası tab bar'ında YOK (admin YouTube sekmesi channel-performance'u kapsar); kaldırılmadı (sayfa canlı). 10 smoke test: admin 5 sekme render + overview/content/operations/youtube/publish aktif türetme (prefix match), user 3 sekme render + overview/youtube/channels aktif türetme. Click-navigate testleri eklenmedi (react-router v6 + vitest `undici` AbortSignal incompat; aktif türetme testleri zaten sözleşmeyi doğruluyor). Test sonucu: **full vitest 2599/2599 PASS** (+10), 35 skipped, 222 dosya + 1 skip, 302s. `tsc --noEmit` exit 0, `vite build` başarılı (4.34s). |
| 2026-04-18 | P1.1 tamam | `AdminScopeSwitcher` bileşeni AppHeader sağ bloğuna eklendi — admin için kapsam seçimini görünür ve tek tıkla yönetilebilir kıldı. Özellikler: (1) rol guard (non-admin → null), (2) kompakt buton (avatar + "Kapsam" etiketi + aktif scope label + chevron), (3) dropdown: "Tüm Kullanıcılar" + aktif kullanıcı listesi + ≥5 kullanıcıda arama input'u + focused'a geri dönüş footer'ı, (4) outside-click + Escape ile kapanma, (5) `useQuery({ enabled: isAdmin && open })` ile tembel kullanıcı listesi. Bileşen `useAdminScopeStore`'u doğrudan güncelliyor; `useActiveScope()` üzerinden tüm scope-aware React Query anahtarlarına anında yansıyor. AppHeader tarafında `area === "Admin"` branşıyla da ayrıca sınırlandırıldı (çifte savunma). 8 smoke test yazıldı (non-admin null, mode=all label, dropdown open, focusUser, setAll, Escape close, outside-click close, focused user label). Test sonucu: **full vitest 2568/2568 PASS** (+8), 35 skipped, 218 dosya + 1 skip, 265s. `tsc --noEmit` exit 0, `vite build` başarılı (4.15s). |
| 2026-04-18 | P2.3 tamam | Settings module landing — `/admin/settings` effective sekmesine 13+ grubun kart manzarası eklendi. Yeni rota `/admin/settings/:group` + `SettingsRegistryPage` `useParams()` ile param okuyup `activeTab`'ı effective'e otomatik açıyor ve `EffectiveSettingsPanel` `initialGroup={groupParam}` prop'uyla filtrelenmiş başlıyor. Breadcrumb ("← Tüm modüller" + "Filtre: <group>") ile geri dönüş görünür. Sekme değişirken group param otomatik temizleniyor (URL kalıntısı yok). `EffectiveSettingsPanel` opsiyonel `initialGroup` prop'u ile genişledi; parametresiz davranış aynen korundu (parallel pattern yok, mevcut sözleşme). 3-sekme iskeleti (credentials/effective/registry), `settings-tab-*` testid'leri, subtitle kutusu, `ReadOnlyGuard` — hiçbiri değişmedi. Yeni bileşen `SettingsModuleLanding` `useSettingsGroups()` üstüne ince adapter (yeni endpoint yok). `GROUP_LABELS_MAP` Türkçe etiketler mevcut kaynaktan geliyor (SettingGroupSection.tsx). 5 smoke test: effective sekmesinde 4 kart render, `/admin/settings/tts` deep-link breadcrumb + landing gizli + tab aktif, back-button varlığı, kart sayı metinleri ("14 ayar", "12 wired"), breadcrumb filtre grubu adı. Click-to-navigate testleri eklenmedi (P2.2 ile aynı `undici` AbortSignal incompat; render kontratı + active state yeterli). Test sonucu: **full vitest 2604/2604 PASS** (+5), 35 skipped, 223 dosya + 1 skip, 238s. `tsc --noEmit` exit 0, `vite build` başarılı (4.03s). |
| 2026-04-18 | P3.1 tamam | 6 duplicate çift birleştirme — **dürüst bilanço**: R1'deki 6 çiftin gerçek durumu: (a) **Calendar / Inbox / JobDetail** zaten thin-wrapper + shared body paterninde (pre-redesign), müdahale gerekmedi; (b) **Connections (Admin monitoring table vs User card grid)** + **YouTubeAnalytics (1000+ LoC her biri, farklı filtre matrisi)** sözleşme olarak ayrı sayfalar — R3 IA'sı farklı görünümler hedefliyor, zorla birleştirmek kaliteyi düşürürdü (kararlı-ayrı); (c) **YouTubeCallback çifti** genuine ~90% duplication — bu turda `components/oauth/YouTubeCallbackBody.tsx` ortak motorunda birleşti. Mod farkları: admin `state` yoksayar + `/admin/settings`'a redirect + "Ayarlara Don" + uzun fallback; user `state` param'dan `channel_profile_id` parse + `/user/channels/:id`'e redirect + "Kanallara Don" + kısa fallback. Backend sözleşmesi değişmedi — aynı `/api/v1/publish/youtube/auth-callback` endpoint'i. `pages/admin/YouTubeCallbackPage.tsx` 100 LoC → 12 LoC, `pages/user/UserYouTubeCallbackPage.tsx` 105 LoC → 12 LoC. `sprint4-prelaunch-polish.smoke.test.tsx` `FILES_SHOULD_USE_API_CLIENT` listesinde admin page → YouTubeCallbackBody yolu ile güncellendi (thin-wrapper artık api client kullanmıyor, business logic body'de). 8 smoke test yazıldı (admin/user processing/error branch'ları + testid izolasyonu + fallback metin farkları). Test sonucu: **full vitest 2612/2612 PASS** (+8), 35 skipped, 224 dosya + 1 skip, 251s. `tsc --noEmit` exit 0, `vite build` başarılı (3.86s). |
| 2026-04-18 | P2.4 tamam | Calendar unified — yeni **Liste** görünümü (`CalendarListView.tsx`) hafta/ay grid'lerine kronolojik alternatif olarak eklendi. `UserCalendarPage` `ViewMode` tipi `"list" | "week" | "month"` genişledi; toggle 2 butondan 3 butona (Liste / Hafta / Ay). Varsayılan görünüm artık **localStorage versioned** (`calendar.default_view` anahtarı, `{ v: 1, view }` shape) — `loadDefaultView()` try-catch + version/shape validation, bozuk/eski state'te "month" fallback. `user.calendar.default_view` KNOWN_SETTINGS entry eklendi (group=ui, module_scope=calendar, builtin_default="month", visible_to_user=True, user_override_allowed=True): MVP'de frontend localStorage persist ediyor, Settings Registry key'i visibility/doc/override sözleşmesini dokümante ediyor (backend read-through ileride ekleyip hardcoded davranışı kaldırabiliriz — CLAUDE.md "hardcoded behavior" disiplini için şimdiden görünür). Admin `AdminCalendarPage` 11-LoC thin-wrapper dokunulmadı — list view her iki panelde sıfır ekstra değişiklikle çalışıyor (shared body pattern). Event type renk tokenları (content_project=brand, publish_record=info, platform_post=emerald) + overdue `!bg-error` dot + inbox `!bg-warning` dot + "inbox" badge reuse. `selectedEventId` row `bg-brand-50/50`. 12 smoke test (7 view contract + 5 persistence contract): empty state fallback, day chronology, intra-day sort, onSelectEvent callback, selected bg, inbox badge, type label; empty→month, valid stored (week/list), version mismatch→month, corrupt JSON→month, unknown view→month. Persistence contract test `UserCalendarPage.tsx`'teki module-local helper'ı intentional duplicate ile dokümante ediyor. Test sonucu: **full vitest 2624/2624 PASS** (+12), 35 skipped, 226 dosya + 1 skip, 40.71s (2. koşu; 1. koşu default-surface-strategy.unit.test.ts'te bilinen Phase AJ paralel collect+transform jitter — izolasyonda 1336ms < 20s hook timeout; dokümante edilmiş). `tsc --noEmit` exit 0 (makeEvent fixture full CalendarEvent shape ile düzeltildi), `vite build` başarılı (4.15s). |
| 2026-04-18 | P2.5 tamam | PublishBoard toggle — `PublishCenterPage`'e Kanban-tarzi **Board** görünümü legacy tablo'nun yanına eklendi. Yeni bileşenler: `PublishCard.tsx` (tek kayit kompakt kart: content type label + kisa ref_id + platform + StatusBadge + timestamp + attempts + PublishErrorChip), `PublishBoardColumn.tsx` (baslik + sayac + kart listesi, bos fallback), `PublishBoard.tsx` (6 sabit sutun: Taslak / Review Bekliyor / Onaylandi / Zamanlandi / Yayinda / Basarisiz — review-gate akisi; `useMemo` ile status-gruplama; publishing/cancelled/review_rejected sutun listesinde yok → tablo gorunumunde kalir, bulk/triage icin tabloya gecilir). PublishCenterPage `PublishViewMode = "table" | "board"` state + localStorage persistence (`publish.center.default_view` anahtari, `{ v: 1, view }` shape, bozuk/eski → "table" fallback). Toolbar altinda `role="tablist"` toggle (Tablo / Board), `data-testid="publish-view-toggle"`. `BulkActionBar` sadece tablo modunda render — board MVP'de secim yok (kart tiklaninca `/admin/publish/:id` detay sayfasina gider, mevcut review-gate akisini bozmaz). `SectionShell` icinde render branch: tablo → mevcut DataTable + Pagination; board → empty/loading/error guard + `<PublishBoard>`. Mevcut filtreler (status/platform/module/error) iki gorunumde paylasilir. KNOWN_SETTINGS'e iki yeni entry: `publish.center.board_view.enabled` (admin-only bool, kill-switch dokumantasyonu) + `publish.center.default_view` (user-facing string, "table" default). Drag & drop YOK (MVP): backend state machine ek validasyon gerektirir — sonraki fazda ele alinabilir. 12 smoke test (7 board + 5 persistence): 6 sutun render + count, status gruplama, bilinmeyen status ignore, onOpen callback, kart render (statusLabel/platform/attempts), attempts=0 chip yok, selected border; empty→table, valid stored (board/table), version mismatch→table, corrupt JSON→table, unknown view→table. Test sonucu: **full vitest 2636/2636 PASS** (+12), 35 skipped, 228 dosya + 1 skip, 26.52s. `tsc --noEmit` exit 0, `vite build` başarılı (3.81s). |
| 2026-04-18 | P2.6 tamam | Automation SVG görselleştirme — `AutomationFlowSvg.tsx` saf SVG bileşeni (5 node: Kaynak Tarama → Taslak → Render → Yayın → Yayın Sonrası; 4 ok; mode→renk: automatic=success yeşil / manual_review=warning sarı / disabled=neutral gri; AUTO/ONAY/KAPALI rozetleri; legend satırı) `UserAutomationPage`'de policy header'dan sonra ve "Checkpoint Matrisi" h3'ünden önce render ediliyor. Matris form (5 CHECKPOINT_META dropdown) **tamamen korundu** — SVG yaln pasif önizleme; gerçek mode değişimleri yine mevcut matris butonlarından yapılır. **Dependency YOK** — MEMORY §5.1 `@xyflow/react` / `react-flow` / `d3` heavy-dep ban korundu; hand-computed coordinates (NODE_W=120, NODE_H=56, GAP=24). CSS variable colors (`var(--color-success-light, #dcfce7)` vb.) fallback hex ile tema token'larına bağlı. `user.automation.flow_visual.enabled` KNOWN_SETTINGS entry: group=automation, builtin_default=True, admin-only kill switch (visible_to_user=False + user_override_allowed=False + read_only_for_user=True, P2.5 `publish.center.board_view.enabled` ile aynı pattern). MVP'de declarative: runtime read-through yok — bayrağa göre SVG render'ını gizleme kapısı gelecekte eklenebilir. 7 smoke test: container+svg+5 node render, 4 ok ve 5. ok yok, mode→rozet mapping (automatic=AUTO / manual_review=ONAY / disabled=KAPALI), mode→fill string match (success-light/warning-light/neutral-100), node label metni SVG içinde, legend keys, all-disabled policy kill-switch simülasyonu. Test sonucu: **full vitest 2643/2643 PASS** (+7), 35 skipped, 230 dosya + 1 skip, 612.56s (8 dosya Phase AJ paralel jitter — izolasyon run: 56/56 PASS 31.84s, MEMORY §1.6'da dokümante). `tsc --noEmit` exit 0, `vite build` başarılı (4.08s). |
| 2026-04-18 | P3.2 tamam | Approver assignment (Alembic + UI) — `automation_policies` tablosuna `approver_user_id` kolonu (String(36), FK→users.id ondelete SET NULL, nullable, named constraint `fk_automation_policies_approver_user_id` — SQLite batch_alter_table adsız constraint kabul etmiyor) + index eklendi. NULL → "owner is approver" (backward compat, mevcut kayıtlar değişmedi; publish-gate enforcement bu dalgada **yok**, sonraki fazda). Alembic revision `phase_al_001` (down_revision=phase_ag_001), upgrade/downgrade idempotent (downgrade named FK constraint'i drop_constraint ile açıkça kaldırır). Pydantic schemas (Create/Update/Response) + TypeScript tipler güncellendi. `automation/service.py` non-admin spoof koruma: create ve update yollarında `approver_user_id != caller.user_id` ise sessizce caller.user_id'ye yeniden yazılır (403 değil; owner_user_id ile aynı pattern — admin başkasını atayabilir, non-admin kendi id'sinden başkasını set edemez). `UserAutomationPage` operasyonel limitler bloğunda "Onaylayici (Approver)" dropdown (seçenekler: "Owner (varsayilan)" empty value = NULL + "Kendim" userId; onChange empty→null serializasyonu). `automation.approver_assignment.enabled` KNOWN_SETTINGS (admin-only bool, builtin_default=False, declarative — CLAUDE.md "settings surface" checklist karşılandı). 15 yeni test: 6 backend migration fresh-DB (A=upgrade head, B=kolon meta, C=index, D=downgrade, E=re-upgrade idempotent, F=PRAGMA default NULL + insert chain) + 9 frontend smoke (section/select testid, initial value binding, owner/self option visibility, onChange empty→null / self→userId serializasyonu, help text, disabled pending state). Test sonucu: **backend 6/6 PASS** (7.42s, test_phase_al_001_approver_migration.py) + **frontend full vitest 2652/2652 PASS** (+9), 35 skipped, 230 dosya + 1 skip, 36.29s (Phase AJ jitter bu koşuda çıkmadı — "non-deterministic timing" MEMORY §1.6'da dokümante). `tsc --noEmit` exit 0, `vite build` başarılı (3.72s). **İlk deneme FK named olmadığı için SQLite batch mode'da `ValueError: Constraint must have a name` ile düştü; named FK + drop_constraint downgrade'e eklenerek düzeltildi ve fresh-DB testleri %100 PASS.** |
