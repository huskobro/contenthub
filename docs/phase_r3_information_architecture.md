# Faz R3 — Yeni Bilgi Mimarisi / Sayfa Birleştirme / Navigation Truth Source

**Tarih:** 2026-04-17
**Worktree:** `.claude/worktrees/product-redesign-benchmark`
**Taban:** R1 (gerçek kod) + R2 (8 aday pattern)
**Amaç:** 98+ mevcut page-level component'i **≤35** konsolide page-level hedefine indirecek final IA; tek **NAV_REGISTRY** truth source; admin ↔ user simetrisi; Settings Registry ve Ownership üstünden akan.

---

## 0. Hedef Cümlesi

> **"Kullanıcı panelinde Make.com + Buffer + OpusClip akışkanlığı; admin panelinde Hootsuite enterprise + n8n operasyon denetimi; hepsi tek tutarlı surface üstünde, tek navigation truth source ile."**

---

## 1. Eski → Yeni Eşleme Stratejisi

### 1.1 Konsolidasyon Prensipleri
1. **Tek shell + tab pattern** — Admin/user aynı data için `scope` arg'ıyla aynı component'i kullansın.
2. **Stub sayfalar kapatılsın veya dolsun** — AdminCalendar 11 LoC + AdminInbox 11 LoC artık tek shell altından.
3. **Tek surface mantığı** — Canvas user default; legacy admin default; atrium+bridge opsiyonel "deneysel" (Settings: `ui.surface.experimental.enabled`).
4. **Wizard unified host** — `ContentCreationWizard` tek base; admin/user guided/advanced mode farkı.
5. **NAV_REGISTRY tek kaynak** — classic + Horizon + Cmd+K + breadcrumb hepsi ondan türer.

---

## 2. Yeni Admin IA (Hedef 18 page-level component)

### 2.1 Grup Yapısı (yeni)

```
1. Operasyon Merkezi (Operations Hub)
   - Genel Bakış (Admin Overview)
   - Otomasyon Politikaları (Admin Automation)    ← flow canvas + matris
   - Admin Inbox (tüm kullanıcı inbox)            ← stub kapanır
   - Admin Calendar (tüm kullanıcı takvim)        ← stub kapanır

2. Sistem
   - Ayarlar (Settings)
   - Görünürlük (Visibility)
   - Wizard Ayarları
   - Modüller
   - Sağlayıcılar
   - Prompt Yönetimi
   - Kullanıcılar
   - Audit Log

3. Üretim
   - Library (Content + Assets unified)           ← 2 sayfa → 1 shell × 2 tab
   - Şablonlar + Stil Şablonları (Templates)     ← 3 sayfa → 1 shell × 3 tab
   - İşler (Jobs Registry + Detail)

4. Yayın
   - Publish Center (review + detail tab'lar)

5. Etkileşim
   - Engagement Hub (Comments + Playlists + Posts) ← 3 sayfa → 1 shell × 3 tab

6. Analitik
   - AnalyticsShell (Content + Channel + Operations + YouTube tabs) ← 6 sayfa → 1 shell

7. Haber (Modul: news_bulletin)
   - Sources + Scans + Used News + Items           ← 4 sayfa → 1 shell × 4 tab
   - News Bulletin Wizard

8. Görünüm
   - Tema Yönetimi
```

### 2.2 Admin Sayfa Envanter (Eski → Yeni)

| Eski (54 sayfa) | Yeni | Yöntem |
|---|---|---|
| AdminOverviewPage | → OperationsOverview | Shell aynı, içerik zenginleştirilir |
| AdminAutomationPoliciesPage | → AdminAutomationPage (P1+P2) | Flow canvas + matris toggle |
| AdminInboxPage (stub 11 LoC) | → AdminInboxPage (UserInbox shell'i `scope=all_users`) | Stub doldurulur |
| AdminCalendarPage (stub 11 LoC) | → AdminCalendarPage (UserCalendar shell'i `scope=all_users`) | Stub doldurulur |
| SettingsRegistryPage | → aynı | Korunur |
| VisibilityRegistryPage | → aynı | Korunur |
| WizardSettingsPage | → aynı | Korunur |
| ModuleManagementPage | → aynı | Korunur |
| ProviderManagementPage | → aynı | Korunur |
| PromptEditorPage | → aynı | Korunur |
| UsersRegistryPage + UserSettingsDetailPage | → UsersShell × 2 tab | 2 → 1 shell |
| AuditLogPage | → aynı | Korunur |
| ContentLibraryPage + AssetLibraryPage | → LibraryShell × 2 tab | 2 → 1 |
| TemplatesRegistryPage + StyleBlueprintsRegistryPage + TemplateStyleLinksRegistryPage | → TemplatesShell × 3 tab | 3 → 1 |
| StandardVideoRegistryPage + CreatePage + DetailPage + WizardPage | → StandardVideoShell (tabs: list/wizard/detail) | 4 → 1 shell |
| JobsRegistryPage + JobDetailPage | → JobsShell | 2 → 1 |
| PublishCenterPage + PublishReviewQueuePage + PublishDetailPage | → PublishShell × 3 tab | 3 → 1 |
| AdminCommentMonitoringPage + AdminPlaylistMonitoringPage + AdminPostMonitoringPage | → EngagementShell × 3 tab | 3 → 1 |
| AnalyticsOverviewPage + AnalyticsContentPage + AnalyticsOperationsPage + AdminYouTubeAnalyticsPage + PublishAnalyticsPage + AdminChannelPerformancePage | → AnalyticsShell × 6 tab | 6 → 1 |
| SourcesRegistryPage + SourceCreatePage + SourceScansRegistryPage + SourceScanCreatePage + NewsItemsRegistryPage + NewsItemCreatePage + UsedNewsRegistryPage + UsedNewsCreatePage | → NewsSourceShell × 4 tab (each with inline create) | 8 → 1 shell |
| NewsBulletinRegistryPage + CreatePage + DetailPage + WizardPage | → NewsBulletinShell | 4 → 1 shell |
| ThemeRegistryPage | → aynı | Korunur |
| AdminConnectionsPage | → aynı | Korunur |
| AdminNotificationsPage | → aynı | Korunur |

**Özet:** 54 admin sayfa → **~18 shell-level component**. İçerik tab bileşenleri shell'lerin altında kalır (kod hâlâ ayrışıklığını korur ama route sayısı düşer).

---

## 3. Yeni User IA (Hedef 12 page-level component)

### 3.1 Grup Yapısı (yeni)

```
1. Anasayfa — Three-View Dashboard (P14)
   - Bugün (Today): pending jobs + review queue + inbox unread
   - Hafta (Week): CalendarGrid slice (7 gün)
   - Analiz (Stats): KPI quick glance

2. İçerik
   - Library (Projects + Assets unified)           ← MyProjects + ContentLibrary parçası
   - Kanallarım (MyChannels)
   - Marka Profilim (BrandProfile — P8)            ← YENİ

3. Üretim
   - Oluştur (CreateHub — video/bülten/product-review wizard entry)

4. Yayın & Planlama
   - PublishShell (queue + review + schedule + calendar) ← P5+P4 birleşik
   - Otomasyonlarım (UserAutomation) — P1+P2 toggle

5. Etkileşim
   - EngagementHub (Comments + Playlists + Posts)   ← 3 → 1 shell × 3 tab

6. Analitik
   - AnalyticsShell (Content + Channel + YouTube tabs) ← 3 → 1 shell

7. Sistem
   - Bağlantılarım (Connections) — P9
   - Gelen Kutusu (Inbox)
   - Ayarlarım (Settings)
```

### 3.2 User Sayfa Envanter (Eski → Yeni)

| Eski (21 + 7 root = 28) | Yeni | Yöntem |
|---|---|---|
| UserDashboardPage | → UserDashboardPage (P14 Three-View) | Aynı component, 3 blok yeniden yapı |
| UserContentEntryPage | → CreateHub (entry point) | Rename + simplify |
| UserSettingsPage | → aynı | Korunur |
| MyProjectsPage + MyChannelsPage + ChannelDetailPage + ProjectDetailPage | → LibraryShell tab "Projects" + MyChannelsShell × 2 tab | 4 → 2 |
| CreateVideoWizardPage + CreateBulletinWizardPage + CreateProductReviewWizardPage | → ContentCreationWizard (shared) × 3 modül config | 3 → 1 host + 3 config |
| UserJobDetailPage | → JobDetailPage (shared with admin, scope'lu) | 1 → 0 (admin shell'e bağlan) |
| UserPublishPage + UserPublishEntryPage (scaffold) | → PublishShell × 4 tab | 2 → 1 (scaffold arkada, smoke test zinciri için) |
| UserCalendarPage | → PublishShell'in calendar tab'i | 1 → 0 (ayrı sayfa değil tab) |
| UserAutomationPage | → UserAutomationPage (P1+P2 toggle) | İç yapı değişir, dış shell aynı |
| UserInboxPage | → InboxPage (shared admin/user scope) | Aynı component scope'lu |
| UserConnectionsPage | → ConnectionsPage | Aynı |
| UserCommentsPage + UserPlaylistsPage + UserPostsPage | → EngagementHub × 3 tab | 3 → 1 |
| UserAnalyticsPage + UserChannelAnalyticsPage + UserYouTubeAnalyticsPage | → AnalyticsShell × 3 tab | 3 → 1 |
| UserNewsPickerPage | → NewsPickerModal (shell değil modal) | 1 → 0 |
| UserYouTubeCallbackPage | → aynı | Korunur (OAuth callback) |

**Özet:** 28 user sayfa → **~12 shell-level component**.

---

## 4. Surface Konsolidasyon Kararı

### 4.1 Yeni Durum

| Surface | Rol | Karar |
|---|---|---|
| **legacy** | Admin ve user için fallback tabanı | **Kalır** — her surface failsafe. Sadece "admin default" rolünde yaşar. |
| **canvas** | User için default workspace shell | **Kalır** — user-default. Overrides R5'te 9 → 14'e genişletilecek. |
| **horizon** | Admin için alternatif layout (icon rail) | **Admin default'a alınır** — classic AdminLayout yerine. Classic legacy konumuna düşer. |
| **atrium** | User "premium editorial" deney | **`status:"experimental"`** → Settings Registry `ui.surface.atrium.enabled=false` default. Silinmez, rafa kalkar. |
| **bridge** | Admin "deneysel ops shell" | **`status:"experimental"`** → `ui.surface.bridge.enabled=false` default. |

### 4.2 Sonuç
- Admin-side default: **horizon** (icon rail → sectiond groups).
- User-side default: **canvas** (full workspace).
- Legacy, atrium, bridge: **opsiyonel** (sıfırdan demo ekipleri için varyant).

### 4.3 Kanıt
- `surfaces/manifests/register.tsx` mevcut 5 surface aktif. `ui.surface.default.admin` + `ui.surface.default.user` Settings Registry anahtarları zaten var (AM §AM-4). Sadece default değerler değişecek.

---

## 5. NAV_REGISTRY — Tek Navigation Truth Source

### 5.1 Contract

```typescript
// frontend/src/app/navigation/NAV_REGISTRY.ts  (R6'da üretilecek; R3 tasarımı)

export interface NavEntry {
  id: string;                                    // "admin.operations.automation"
  label: string;                                 // "Otomasyon Politikaları"
  path: string;                                  // "/admin/automation"
  group: NavGroup;                               // "operations" | "system" | ...
  scope: "admin" | "user" | "both";
  icon?: string;
  visibilityKey?: string;                        // Visibility Engine gate
  moduleId?: string;                             // module toggle gate
  settingsKey?: string;                          // feature-flag gate
  cmdPaletteAction?: CommandAction;              // P15 entegrasyon
  order: number;
}

export const NAV_REGISTRY: readonly NavEntry[] = [
  // Admin
  { id: "admin.operations.overview", label: "Genel Bakış", path: "/admin", group: "operations", scope: "admin", order: 10 },
  { id: "admin.operations.automation", label: "Otomasyon Politikaları", path: "/admin/automation", group: "operations", scope: "admin", visibilityKey: "panel:automation", order: 11 },
  { id: "admin.operations.inbox", label: "Gelen Kutusu", path: "/admin/inbox", group: "operations", scope: "admin", order: 12 },
  { id: "admin.operations.calendar", label: "Takvim", path: "/admin/calendar", group: "operations", scope: "admin", order: 13 },
  { id: "admin.system.settings", label: "Ayarlar", path: "/admin/settings", group: "system", scope: "admin", visibilityKey: "panel:settings", order: 20 },
  // ... (R6'da tam tamamlanacak)

  // User
  { id: "user.home", label: "Anasayfa", path: "/user", group: "home", scope: "user", order: 10 },
  { id: "user.library", label: "Kitaplığım", path: "/user/library", group: "content", scope: "user", order: 20 },
  { id: "user.channels", label: "Kanallarım", path: "/user/channels", group: "content", scope: "user", order: 21 },
  { id: "user.brand", label: "Marka Profilim", path: "/user/brand", group: "content", scope: "user", settingsKey: "brand_profile.enabled", order: 22 },
  { id: "user.create", label: "Oluştur", path: "/user/create", group: "create", scope: "user", order: 30 },
  { id: "user.publish", label: "Yayın & Planlama", path: "/user/publish", group: "publish", scope: "user", visibilityKey: "panel:publish", order: 40 },
  { id: "user.automation", label: "Otomasyonlarım", path: "/user/automation", group: "publish", scope: "user", order: 41 },
  { id: "user.engagement", label: "Etkileşim", path: "/user/engagement", group: "engagement", scope: "user", order: 50 },
  { id: "user.analytics", label: "Analitiğim", path: "/user/analytics", group: "analytics", scope: "user", order: 60 },
  { id: "user.connections", label: "Bağlantılarım", path: "/user/connections", group: "system", scope: "user", order: 70 },
  { id: "user.inbox", label: "Gelen Kutusu", path: "/user/inbox", group: "system", scope: "user", order: 71 },
  { id: "user.settings", label: "Ayarlarım", path: "/user/settings", group: "system", scope: "user", order: 72 },
  // ...
];
```

### 5.2 Consumer'lar

- `classic AdminNav` → `NAV_REGISTRY.filter(e => e.scope !== "user")`.
- `classic UserNav` → `NAV_REGISTRY.filter(e => e.scope !== "admin")`.
- `Horizon groups` → `groupBy(NAV_REGISTRY, 'group')`.
- `Cmd+K palette` → `NAV_REGISTRY.map(e => ({ id: e.id, label: e.label, run: () => navigate(e.path) }))`.
- Breadcrumb → path segment → `NAV_REGISTRY.find()`.
- Test helper'ları → tek import point.

### 5.3 Settings Entegrasyonu

- Her entry `visibilityKey` + `settingsKey` + `moduleId` gate'leri üzerinden filtrelenir.
- `ui.surface.*` ayarları entry level gating değil; **surface page override** mantığı R4'te kapsanacak.

---

## 6. Breadcrumb + Page Title Contract

### 6.1 Yeni Contract
Her shell sayfası şu hook'u çağırır:

```typescript
usePageContext({
  title: "Otomasyon Politikaları",
  breadcrumbs: ["Operasyon", "Otomasyon"],
  navEntryId: "admin.operations.automation",
});
```

`TopBar` bileşeni title'ı + breadcrumb'u buradan çeker. `NAV_REGISTRY` ile çapraz kontrol edilir (gerçeksiz title = warning).

---

## 7. Yeni Route Tablosu (Eski → Yeni)

### 7.1 Admin Routes (Eski 56 → Yeni 20)

```
/admin                              → OperationsOverview         (P14 uyarlama)
/admin/automation                   → AdminAutomationPage        (P1+P2)
/admin/inbox                        → AdminInboxPage             (InboxPage scope=all)
/admin/calendar                     → AdminCalendarPage          (CalendarPage scope=all)
/admin/settings                     → SettingsRegistryPage
/admin/visibility                   → VisibilityRegistryPage
/admin/wizard-settings              → WizardSettingsPage
/admin/modules                      → ModuleManagementPage
/admin/providers                    → ProviderManagementPage
/admin/prompts                      → PromptEditorPage
/admin/users                        → UsersShell (tabs: list/detail)
/admin/audit-logs                   → AuditLogPage
/admin/library                      → LibraryShell (tabs: content/assets)
/admin/templates                    → TemplatesShell (tabs: templates/styles/links)
/admin/jobs                         → JobsShell (tabs: list/detail)
/admin/publish                      → PublishShell (tabs: center/review/detail)
/admin/engagement                   → EngagementShell (tabs: comments/playlists/posts)
/admin/analytics                    → AnalyticsShell (6 tab)
/admin/news                         → NewsSourceShell (tabs: sources/scans/items/used)
/admin/news-bulletins               → NewsBulletinShell (tabs: list/wizard/detail)
/admin/standard-videos              → StandardVideoShell (tabs: list/wizard/detail)
/admin/connections                  → AdminConnectionsPage
/admin/notifications                → AdminNotificationsPage
/admin/themes                       → ThemeRegistryPage
```

20 route; bazıları tab state için `?tab=` query param kullanır.

### 7.2 User Routes (Eski 26 → Yeni 14)

```
/user                               → UserDashboardPage (P14)
/user/library                       → LibraryShell (tabs: projects/assets)
/user/channels                      → MyChannelsShell (tabs: list/detail via :channelId)
/user/brand                         → BrandProfilePage (P8)
/user/create                        → CreateHub (module picker)
/user/create/:moduleId              → ContentCreationWizard (:moduleId = video|bulletin|product-review|…)
/user/publish                       → PublishShell (tabs: queue/review/schedule/calendar)
/user/automation                    → UserAutomationPage (P1+P2 toggle)
/user/engagement                    → EngagementHub (tabs: comments/playlists/posts)
/user/analytics                     → AnalyticsShell (tabs: content/channel/youtube)
/user/connections                   → ConnectionsPage (P9)
/user/inbox                         → InboxPage
/user/settings                      → UserSettingsPage
/user/jobs/:jobId                   → JobDetailPage (shared with admin)
```

14 route; birkaçı dinamik path parametresi.

---

## 8. Empty-State Sistemi (P12 uyarlama)

### 8.1 Shared Component

```typescript
<EmptyState
  icon="channels"
  title="Henüz kanalın yok"
  description="Yayın yapmak için önce bir sosyal medya kanalı bağla."
  primaryAction={{ label: "Kanal bağla", to: "/user/connections" }}
  secondaryAction={{ label: "Örnek şablonu incele", onClick: ... }}
  suggestions={[
    { label: "YouTube bağla", icon: "youtube", to: "/user/connections?platform=youtube" },
    { label: "Instagram bağla", icon: "instagram", to: "..." },
  ]}
/>
```

### 8.2 Uygulama Alanları
- `UserDashboardPage` — ilk ziyaret (kanal yok + proje yok + otomasyon yok).
- `LibraryShell` — her tab boşken.
- `PublishShell` — yayın kuyruğu boş.
- `MyChannelsShell` — kanal yok.
- `AdminOperationsOverview` — kullanıcı yok / otomasyon yok / kaynak yok.

---

## 9. Admin ↔ User Simetrisi (F gate)

### 9.1 Yeni Kural
Her shell iki scope'a da hizmet eder — `scope="admin"` ise backend `apply_user_scope` bypass, `scope="user"` ise fail-closed filter. Aynı component iki URL'de mount olabilir:

| Shell | Admin URL | User URL | Backend scope |
|---|---|---|---|
| PublishShell | `/admin/publish` | `/user/publish` | `get_current_user_context` |
| AnalyticsShell | `/admin/analytics` | `/user/analytics` | aynı |
| CalendarPage | `/admin/calendar` | (tab içinde) | aynı |
| InboxPage | `/admin/inbox` | `/user/inbox` | aynı |
| EngagementHub | `/admin/engagement` | `/user/engagement` | aynı |
| JobDetailPage | `/admin/jobs/:id` | `/user/jobs/:id` | aynı |

Böylece admin stub'ları kapanır, user zenginliği admin'de de var olur.

---

## 10. Settings Registry Yeni Anahtarlar

R6'da Settings Registry'ye eklenecek anahtarlar (R4+R5'te kesinleşecek):

| Anahtar | Tür | Default | Rol |
|---|---|---|---|
| `ui.surface.default.admin` | enum | `horizon` | Admin default surface |
| `ui.surface.default.user` | enum | `canvas` | User default surface |
| `ui.surface.atrium.enabled` | bool | false | Atrium opsiyonel |
| `ui.surface.bridge.enabled` | bool | false | Bridge opsiyonel |
| `automation.view.default` | enum | `matrix` | P1/P2 toggle |
| `brand_profile.enabled` | bool | true | BrandProfilePage göster |
| `command_palette.actions_source` | enum | `NAV_REGISTRY` | Cmd+K beslemesi |
| `analytics.default_view` | enum | `content` | AnalyticsShell default tab |
| `publish.calendar.integrated` | bool | true | PublishShell'de calendar tab |

Hepsi `visible_to_user=false` (admin-only); `admin_value` Settings Registry üzerinden yönetilir. `.env` override ile admin panel kapatılırsa değişiklik alınır. **Hiçbiri hardcoded değildir.**

---

## 11. Wizard Mimarisi (Unified Host)

### 11.1 ContentCreationWizard contract

```typescript
<ContentCreationWizard
  moduleId="news_bulletin"
  mode="guided"                           // guided | advanced
  initialState={...}
  onComplete={(payload) => createJob(payload)}
/>
```

### 11.2 Kaldırılan
- `admin/NewsBulletinWizardPage` (1409 LoC monoliti) → **config** haline dönüşür (`news_bulletin.wizard.config.json`).
- `user/CreateBulletinWizardPage` (195 LoC shell'i) → `ContentCreationWizard moduleId="news_bulletin"` → aynı path.

### 11.3 Settings Registry
- `visible_in_wizard` flag her alan için sorumlu.
- Guided vs advanced mode Settings'in `user_override_allowed` ile belirlenir.

---

## 12. Hedef Sayı Özeti

| Ölçü | Eski | Yeni | Fark |
|---|---|---|---|
| Admin page-level | 54 | ~18 shell | -67% |
| User page-level | 28 (21 + 7 root) | ~14 shell | -50% |
| Toplam frontend route | 82 | ~34 | -59% |
| Surface default | 2 × 5 varyant | 2 × 1 default + 3 opsiyonel | -80% varyant exposure |
| Navigation truth source | 4 paralel liste | 1 NAV_REGISTRY | -75% drift |
| Wizard base | 4 bağımsız | 1 + config | -75% test yükü |

---

## 13. Kontrat Satırları

```
code change:         no
migrations run:      no
packages installed:  no
db schema mutation:  no
db data mutation:    no
main branch touched: no
```

---

## 14. Sonraki Adım

R4 — Yeni final arayüz iskeleti / preview-first component-plan / scaffold-plan.
Girdi: R3 IA + NAV_REGISTRY şema + surface konsolidasyon kararı.
Çıktı: `docs/phase_r4_scaffold_and_component_plan.md`.

---
