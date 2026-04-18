# Faz R4 — Final Arayüz İskeleti / Preview-First Component Plan / Scaffold Planı

**Tarih:** 2026-04-17
**Worktree:** `.claude/worktrees/product-redesign-benchmark`
**Taban:** R3 IA (`docs/phase_r3_information_architecture.md`)
**Amaç:** R3'teki 18 admin shell + 14 user shell'in **component ağacı**, **scaffold yerleşimi**, **mock kontratı**, **preview-first** davranışlarının somut iskeletini çıkarmak. R6 kod aşamasında her shell için tek bir implementasyon kapısı.

---

## 0. İskelet İlkeleri

1. **Shell/Tab/Card üçleme** — Her shell `PageShell` + `TabBar` + `Tab panel` + `Card` bileşenlerinden oluşur.
2. **Preview-first** — Görsel karar gereken her yerde (template, style, thumbnail, subtitle) mock/preview component'i kullanıcıya önce gösterilir.
3. **Mock kontratı** — Her shell veri yoksa `MockDataSource` kullanır; gerçek veri endpoint hazır olduğunda `swap()` ile değişir.
4. **Scaffold yerleşimi** — Yeni shell'ler `frontend/src/scaffolds/redesign/<shell-name>/` altında iskelet olarak yaşar; R6'da gerçek implementasyona taşınır.
5. **Tek sorumluluk** — Her component ≤300 LoC; büyükler alt bileşenlere bölünür.
6. **Design tokens disiplini** — Renk direkt değer yerine token (`text-neutral-800`, `bg-brand-50` vs.); `text-neutral-100/200` iç metinde yasak (MEMORY kuralı).

---

## 1. Scaffold Yerleşimi

```
frontend/src/scaffolds/redesign/
├── _shared/
│   ├── PageShell.tsx                # Header + breadcrumb + body slot
│   ├── TabBar.tsx                   # ?tab= URL-bound tabs
│   ├── ShellCard.tsx                # Standard content card
│   ├── EmptyState.tsx               # P12 shared
│   ├── KpiTile.tsx                  # P10/P14 analytics tile
│   ├── FilterBar.tsx                # list filter shared
│   └── MockDataSource.ts            # mock contract
├── admin/
│   ├── OperationsOverview/
│   │   ├── OperationsOverview.tsx
│   │   ├── TodayBlock.tsx
│   │   ├── AutomationsBlock.tsx
│   │   └── RisksBlock.tsx
│   ├── AdminAutomation/
│   │   ├── AdminAutomationPage.tsx
│   │   ├── MatrixView.tsx           # mevcut 5-checkpoint
│   │   ├── FlowCanvasView.tsx       # P1 yeni (xyflow veya SVG fallback)
│   │   └── ViewToggle.tsx
│   ├── AdminInbox/
│   │   └── (delegate to _shared/InboxShell with scope=all_users)
│   ├── AdminCalendar/
│   │   └── (delegate to _shared/CalendarShell with scope=all_users)
│   ├── UsersShell/
│   │   ├── UsersShell.tsx
│   │   ├── UsersListTab.tsx
│   │   └── UserDetailTab.tsx
│   ├── LibraryShell/
│   │   ├── LibraryShell.tsx
│   │   ├── ContentTab.tsx
│   │   └── AssetsTab.tsx
│   ├── TemplatesShell/
│   ├── JobsShell/
│   ├── PublishShell/
│   ├── EngagementShell/
│   ├── AnalyticsShell/
│   ├── NewsSourceShell/
│   ├── NewsBulletinShell/
│   └── StandardVideoShell/
├── user/
│   ├── UserDashboardPage/           # P14 Three-View
│   │   ├── UserDashboardPage.tsx
│   │   ├── TodayBlock.tsx
│   │   ├── WeekBlock.tsx
│   │   └── StatsBlock.tsx
│   ├── LibraryShell/                # shared with admin? (scope-aware)
│   ├── MyChannelsShell/
│   ├── BrandProfilePage/            # P8 YENİ
│   ├── CreateHub/
│   ├── PublishShell/                # shared with admin
│   ├── UserAutomationPage/
│   │   ├── UserAutomationPage.tsx
│   │   ├── GuidedView.tsx           # P2 2-step
│   │   ├── AdvancedMatrixView.tsx
│   │   └── AdvancedFlowView.tsx     # P1
│   ├── EngagementHub/
│   ├── AnalyticsShell/              # shared
│   ├── ConnectionsPage/             # P9
│   ├── InboxPage/                   # shared
│   └── UserSettingsPage/
├── shared/
│   ├── CalendarShell/
│   │   ├── CalendarShell.tsx
│   │   ├── CalendarGrid.tsx
│   │   ├── EventBubble.tsx
│   │   └── PlanSlotEditor.tsx       # P11 (deferred veri modeli)
│   ├── InboxShell/
│   ├── AnalyticsShell/              # admin+user scope param
│   ├── PublishShell/
│   ├── ContentCreationWizard/
│   │   ├── ContentCreationWizard.tsx
│   │   ├── WizardHost.tsx
│   │   ├── config/
│   │   │   ├── news_bulletin.wizard.json
│   │   │   ├── standard_video.wizard.json
│   │   │   ├── product_review.wizard.json
│   │   │   ├── educational_video.wizard.json
│   │   │   └── howto_video.wizard.json
│   │   └── steps/
│   │       ├── InputStep.tsx
│   │       ├── TemplateSelectStep.tsx     # preview-first
│   │       ├── StyleSelectStep.tsx        # preview-first
│   │       ├── SubtitleStyleStep.tsx      # preview-first
│   │       ├── ThumbnailStep.tsx          # preview-first
│   │       └── ReviewStep.tsx
│   └── preview/
│       ├── StyleCard.tsx
│       ├── MockFrame.tsx
│       ├── SubtitleOverlaySample.tsx
│       └── ThumbnailSample.tsx
└── navigation/
    ├── NAV_REGISTRY.ts
    ├── buildAdminNav.ts
    ├── buildUserNav.ts
    ├── buildHorizonGroups.ts
    └── buildCmdPaletteActions.ts
```

---

## 2. Paylaşılan Çekirdek Bileşenler

### 2.1 `PageShell`

```typescript
interface PageShellProps {
  title: string;
  breadcrumbs?: string[];
  actions?: ReactNode;           // header-right action buttons
  children: ReactNode;
  emptyStateConfig?: EmptyStateProps;
}
```

- `usePageContext()` → TopBar'ı günceller.
- `emptyStateConfig` varsa children yerine EmptyState render eder.

### 2.2 `TabBar`

```typescript
interface TabBarProps {
  tabs: Array<{ id: string; label: string; badge?: number }>;
  activeTabId: string;
  onChange: (id: string) => void;
}
```

- Tab state **URL query param'a bağlı** (`?tab=review`) → reload korunur, paylaşılabilir link.
- Tab başına React Query scope ayrışıktır; tab değişiminde yalnızca o tab'in query'leri fetch edilir.

### 2.3 `ShellCard`

```typescript
interface ShellCardProps {
  title: string;
  subtitle?: string;
  footer?: ReactNode;
  children: ReactNode;
  loading?: boolean;
  error?: Error | null;
  emptyState?: EmptyStateProps;
}
```

- Hata + loading + empty-state tek component içinde.
- Tüm shell'ler aynı kart görünümünü kullanır → ürün dili tutarlı.

### 2.4 `KpiTile`

```typescript
interface KpiTileProps {
  label: string;
  value: string | number;
  trend?: { value: number; direction: "up" | "down" };
  subtext?: string;
  icon?: string;
}
```

- User dashboard P14 "Stats" bloğunda + admin overview'da kullanılır.

### 2.5 `MockDataSource`

```typescript
type MockConfig<T> = {
  key: string;                    // mock key
  delay?: number;                 // simulate latency
  error?: boolean;                // simulate error
  empty?: boolean;                // simulate no data
  data: () => T;
};

export function mockFetch<T>(config: MockConfig<T>): Promise<T>;
```

- R6'da `useQuery`'lerin `queryFn`'ine mock döner; endpoint gerçekleşince mock kaldırılır.

---

## 3. Shell Bazlı Component Ağaçları

### 3.1 `UserDashboardPage` (P14)

```
PageShell (title="Anasayfa")
├── TodayBlock
│   ├── PendingJobsList
│   ├── ReviewQueueMini
│   └── InboxUnreadMini
├── WeekBlock
│   └── CalendarGrid (slice=7-day)
└── StatsBlock
    └── KpiTile × 4 (jobs success / publish count / inbox unread / next-schedule)
```

- 3 blok dikey; kart gibi.
- Empty state: ilk ziyarette "İlk kanalını bağla / Proje oluştur / Otomasyon kur" 3 kart.

### 3.2 `UserAutomationPage` (P1 + P2)

```
PageShell (title="Otomasyonlarım")
├── ChannelSelector                           (mevcut UserAutomationPage'den alınır)
├── ViewToggle (guided / advanced-matrix / advanced-flow)
├── GuidedView                 <-- if view=guided
│   ├── SourceScanToggle
│   ├── DailyMaxPostsInput
│   └── HelperTextBanner
├── AdvancedMatrixView         <-- if view=advanced-matrix
│   └── CHECKPOINT_META × 5 (mevcut davranış korunur)
└── AdvancedFlowView           <-- if view=advanced-flow
    ├── FlowCanvas (node/edge)
    └── NodeInspector
```

- Settings Registry: `automation.view.default`.
- P1 flow canvas için gerekli npm lib kararı R5'te.

### 3.3 `PublishShell` (P4 + P5 birleşik)

```
PageShell (title="Yayın & Planlama")
├── TabBar [queue, review, schedule, calendar]
├── QueueTab
│   ├── FilterBar
│   └── PublishCard × N
├── ReviewTab                 (P5 - Approval)
│   ├── FilterBar
│   └── ReviewCard × N
├── ScheduleTab
│   ├── FilterBar
│   └── ScheduledCard × N
└── CalendarTab               (P4 - Calendar)
    └── CalendarShell (shared)
```

- Admin/user aynı shell; scope `apply_user_scope` ile.

### 3.4 `AnalyticsShell` (P10)

```
PageShell (title="Analitik")
├── TabBar [content, channel, youtube, operations*, publish*]      (*admin-only)
├── ContentTab
│   ├── KpiTile × 4
│   ├── ChartBlock (views/likes trend)
│   └── TopContentList
├── ChannelTab
│   ├── KpiTile × 3 (subs / video count / avg views)
│   └── ChannelPerformanceTable
├── YouTubeTab
│   ├── KpiTile × 4
│   └── VideoPerformanceTable
├── OperationsTab             <- admin
│   └── (şu anki AnalyticsOperationsPage içeriği)
└── PublishTab                <- admin
    └── (şu anki PublishAnalyticsPage içeriği)
```

- 9 eski sayfa → 1 shell × 3–5 tab (scope-aware).

### 3.5 `LibraryShell` (P6)

```
PageShell (title="Kitaplığım" | "İçerik Kütüphanesi")
├── TabBar [projects, content, assets]
├── ProjectsTab
│   ├── FilterBar (module / status / date)
│   ├── ProjectGrid
│   └── ProjectCard × N
├── ContentTab
│   ├── FilterBar
│   └── ContentTable
└── AssetsTab
    ├── AssetUploadZone (drag-drop)
    ├── AssetGrid
    └── AssetCard × N (preview-first)
```

### 3.6 `ContentCreationWizard` Host

```
ContentCreationWizard (moduleId, mode)
├── WizardHost
│   ├── StepIndicator (breadcrumb)
│   ├── ActiveStepRenderer
│   │   └── <DynamicStepComponent config={moduleConfig.steps[activeStepIndex]} />
│   └── NavigationButtons (prev / next / submit)
└── config loader (moduleId → config JSON)
```

- Step bileşenleri genel olup config tarafından parametrize edilir:
  - `InputStep` (title/description/topic fields)
  - `TemplateSelectStep` (preview-first: StyleCard × N)
  - `StyleSelectStep` (preview-first: MockFrame)
  - `SubtitleStyleStep` (preview-first: SubtitleOverlaySample)
  - `ThumbnailStep` (preview-first: ThumbnailSample)
  - `ReviewStep` (final summary)

- Config JSON örneği (`news_bulletin.wizard.json`):
```json
{
  "moduleId": "news_bulletin",
  "steps": [
    { "type": "input", "fields": ["title", "topic", "sources"] },
    { "type": "template_select", "familyFilter": "news" },
    { "type": "style_select" },
    { "type": "subtitle_style" },
    { "type": "thumbnail" },
    { "type": "review" }
  ],
  "guided_visible_steps": ["input", "template_select", "review"],
  "advanced_visible_steps": ["input", "template_select", "style_select", "subtitle_style", "thumbnail", "review"]
}
```

---

## 4. Preview-First Component Tasarımı

### 4.1 `StyleCard`

```typescript
interface StyleCardProps {
  templateId: string;
  blueprintId: string;
  previewArtifactUrl: string;       // workspace/preview/...
  version: string;                  // blueprint version for traceability
  selected: boolean;
  onSelect: () => void;
}
```

- Her style card blueprint version'ı footer'da gösterir (CLAUDE.md preview traceability).
- Card'a tıklama style'ı seçer; detay modalı full-screen preview açar.

### 4.2 `SubtitleOverlaySample`

- Mevcut `subtitle-canonicalization.md` contract'ıyla uyumlu.
- Video frame + altyazı overlay → blueprint version'ına kilitli.

### 4.3 `MockFrame`

- Remotion'dan çıkan lightweight draft frame (workspace/preview artifact).
- Style blueprint'in `preview strategy` alanına göre üretilir.

### 4.4 Preview Davranış Kuralı

- Her preview artifact **workspace/preview/** altında saklanır (tmp değil — CLAUDE.md).
- Preview final output değildir; UI'da açık badge: "Ön izleme v1.3".
- Version drift: blueprint güncellenince preview ya yeniden hesaplanır ya da "stale" flag gösterilir.

---

## 5. Admin Stub'ların Doldurulması

### 5.1 `AdminInboxPage`

Eski 11 LoC stub → `InboxShell scope="all_users"`:

```
AdminInboxPage
└── InboxShell (scope="all_users")
    ├── TabBar [unread, all, archived]
    ├── FilterBar (user / type / date)
    └── InboxItem × N (aggregated all users)
```

### 5.2 `AdminCalendarPage`

Eski 11 LoC stub → `CalendarShell scope="all_users"`:

```
AdminCalendarPage
└── CalendarShell (scope="all_users")
    ├── CalendarGrid (all users aggregated; user color-coded)
    └── EventBubble (owner_user_id label)
```

### 5.3 Backend Contract (R6'da hazırlanacak)

- `/api/v1/inbox?scope=all` endpoint → `require_admin`.
- `/api/v1/calendar/events?scope=all` endpoint → `require_admin`.
- Mevcut user-scope endpoint'ler değişmez.

---

## 6. Responsive + Mobil

CLAUDE.md multi-tenant gibi mobil de deferred olmakla birlikte, bileşenler **mobil-aware** tasarlanır:

- `PageShell` içinde `@container` kullanılır; mobile breakpoint'te TabBar drawer'a düşer.
- `CalendarShell` mobile'da haftalık + günlük görünüm fallback'i ile.
- `FlowCanvasView` (P1) mobile'da `matris` view'a zorlanır (küçük ekranda canvas kullanılamaz).

Settings Registry: `ui.mobile.fallback_behavior` (enum).

---

## 7. Erişilebilirlik (A11y) Kontrol Noktaları

- Her `Tab` `role="tab"` + `aria-selected`.
- `ShellCard` header + body `role="region"` + `aria-labelledby`.
- `FlowCanvasView` için keyboard navigation (node'lar arasında Tab + arrow).
- `PreviewCard` thumbnail `alt` text = template/blueprint name + version.
- Renk kontrastı tokens guide'a uyar (`design-tokens-guide.md` referans).

---

## 8. Test Stratejisi (R6 öncesi hazırlık)

Her shell için smoke test iskeleti:

| Shell | Smoke test dosyası | Test vakası |
|---|---|---|
| UserDashboardPage | `user-dashboard-three-view.smoke.test.tsx` | 3 blok render + empty state |
| UserAutomationPage | `user-automation-view-toggle.smoke.test.tsx` | guided/matrix/flow toggle |
| PublishShell | `publish-shell-tabs.smoke.test.tsx` | 4 tab + URL sync |
| AnalyticsShell | `analytics-shell-scope.smoke.test.tsx` | admin vs user tab count farkı |
| LibraryShell | `library-shell-tabs.smoke.test.tsx` | 3 tab + mock data swap |
| ContentCreationWizard | `wizard-guided-advanced.smoke.test.tsx` | mode başına step count farkı |
| CalendarShell | `calendar-shell-scope.smoke.test.tsx` | admin all_users vs user scope |
| InboxShell | `inbox-shell-scope.smoke.test.tsx` | scope filter |
| EngagementHub | `engagement-hub-tabs.smoke.test.tsx` | 3 tab |

Her shell için minimum 3 smoke test: render / empty-state / error-state. Paralel, `_scaffolds/` içinde canlı kalırlar; R6 tamamlanınca `frontend/src/tests/` altına taşınır.

---

## 9. Scaffold → Production Taşınma Planı

1. R6 her shell için **önce scaffold** içinde çalışılır (izolasyon + smoke test).
2. Shell stabilize olduğunda `frontend/src/pages/<admin|user>/` altına taşınır.
3. Eski shell'in smoke test dosyaları güncellenir (component path'i değişir).
4. `router.tsx`'teki route guncellenir (lazy import path).
5. Eski shell dosyası silinir veya `.deprecated.tsx` postfix'iyle bir sonraki dalgaya kadar korunur.

Bu akış "parallel pattern" oluşturmaz çünkü **aynı anda** iki shell aktif değildir; route değişimi atomik.

---

## 10. Settings Registry Entegrasyon Listesi

R6'da eklenecek Settings Registry anahtarları (R3'teki 9'a ek):

| Anahtar | Tür | Default | Shell |
|---|---|---|---|
| `ui.preview.enabled` | bool | true | ContentCreationWizard |
| `ui.preview.size` | enum(sm/md/lg) | md | StyleCard |
| `ui.shell.tabs.persist` | bool | true | TabBar (URL ?tab=) |
| `ui.wizard.mode.default` | enum(guided/advanced) | guided | ContentCreationWizard |
| `ui.dashboard.today.block.jobs_count` | int | 5 | UserDashboardPage |
| `ui.dashboard.today.block.inbox_count` | int | 5 | UserDashboardPage |
| `ui.empty_state.show_suggestions` | bool | true | EmptyState |
| `ui.mobile.fallback_behavior` | enum | responsive | PageShell |

Hepsi admin-only (`visible_to_user=false`), `user_override_allowed=true` nerelerde mantıklı.

---

## 11. Kontrat Satırları

```
code change:         no
migrations run:      no
packages installed:  no
db schema mutation:  no
db data mutation:    no
main branch touched: no
```

---

## 12. Sonraki Adım

R5 — Uygulama Sırası / Mapping / Eski-Yeni Yüzey Eşleme / Kesin Yol Haritası.
Girdi: R1 (risk) + R2 (pattern) + R3 (IA) + R4 (component plan).
Çıktı: `docs/phase_r5_implementation_roadmap.md`.

---
