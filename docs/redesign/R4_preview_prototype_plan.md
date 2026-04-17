# FAZ R4 — Preview / Prototype Planı

> **Amaç:** R3'te tanımlanan yeni bilgi mimarisinin **görsel/component seviyesinde** nasıl ifade edileceğini, mevcut design tokens + componet library'sini bozmadan planlamak. R6'ya kadar gerçek kod yazılmaz — bu R4 **preview dosya konumları, component ağacı, mock-data contract uyumu, visual regression riskleri** için referans.
>
> **Doğrulandı:** R3 IA şeması + mevcut `docs/design-tokens-guide.md` + mevcut `components/design-system/*` envanteri.
> **Dil:** Türkçe içerik + Türkçe rapor.
> **Yasak:** Yeni npm bağımlılığı; yeni component sistemi; yeni tema. Mevcut tokens (`neutral-*`, `brand-*`, `surface-*`, `border-*`) dışında token tanıtmak yasak.
> **Yeni değişken:** R4 çıktısı sadece bu doküman. Preview dosyaları ileriki fazda (R6) yazılacak — R4'te sadece **planı** var.

---

## 0. Yönetici Özeti (10 Madde)

1. **4 yeni component preview** planlanır (R6'da yazılacak): `AdminScopeSwitcher`, `UserIdentityStrip`, `AdminDigestDashboard`, `UserDigestDashboard`.
2. **5 sayfa evrim preview** planlanır: PublishCenter lane/board, Analytics tabs, Settings module landing, Calendar unified, Automation lineer-SVG görsel.
3. **Yeni design token YOK.** Mevcut `docs/design-tokens-guide.md` neutral/brand/surface/border skalası yeter. Yeni renk, yeni varyant **yasak**.
4. **Yeni primitive YOK.** `PageShell`, `SectionShell`, `DataTable`, `FilterBar`, `StatusBadge`, `BulkActionBar`, `Sheet`, `QuickLook`, `ConfirmAction` kullanılacak. Yeni primitive ihtiyacı varsa R5'te belgelenir.
5. **Mock data mevcut API contract'larıyla** uyumlu olur (`api/jobsApi`, `api/publishApi`, `api/automationApi`, `api/calendarApi`, `api/assetApi`). Kontrat değişikliği yasak.
6. **Türkçe içerik** tüm preview'de. Teknik isim (endpoint, prop, type) İngilizce kalabilir.
7. **Preview dosyaları konumu:** `docs/redesign/previews/*.preview.tsx` (yeni klasör, `frontend/` dışında). Build'e karışmaz, `docs/` salt-dokümantasyon. R6'da kod üretiminden **önceki** son referans.
8. **Visual regression riski YOK** (preview frontend'e dahil değil). Ama R6 gerçek implementasyon visual regression gerektirecek; R5'te test planı çıkar.
9. **Responsive kural:** Horizon layout mobile rail collapse davranışı mevcut; preview'ler en az `sm/md/lg` breakpoint'te akıcı olmalı. PWA hâlâ sonraki dalgada.
10. **Accessibility:** Mevcut `useScopedKeyboardNavigation` + `aria-*` attribute'ları sürdürülür. AdminScopeSwitcher keyboard navigable, aria-label'lı olmalı.

---

## 1. Mevcut Design-System Envanteri (doğrulama)

`frontend/src/components/design-system/` (14 dosya):

| Component | Dosya | Rolü |
|---|---|---|
| primitives | primitives.tsx | `PageShell`, `SectionShell`, `DataTable`, `FilterBar`, `FilterSelect`, `FilterInput`, `ActionButton`, `StatusBadge`, `Pagination`, `Mono` |
| BulkActionBar | BulkActionBar.tsx | 6+ sayfada kullanılıyor |
| ColumnSelector | ColumnSelector.tsx | Tablo kolon toggle |
| CommandPalette | CommandPalette.tsx | Cmd+K |
| ConfirmAction | ConfirmAction.tsx | Tehlikeli işlem onay |
| EmptyState | EmptyState.tsx | Boş liste durumu |
| KeyboardShortcutsHelp | KeyboardShortcutsHelp.tsx | ? help |
| NotificationCenter | NotificationCenter.tsx | Bildirimler paneli |
| QuickLook | QuickLook.tsx | Hover/focus detay |
| Sheet | Sheet.tsx | Sağdan detay paneli |
| Skeleton | Skeleton.tsx | Loading durumu |
| TableFilterBar | TableFilterBar.tsx | Chip filtre |
| ThemeProvider | ThemeProvider.tsx | Tema yönetimi |
| Toast | Toast.tsx | Bildirim toast |

**R4 iddiası:** R6 implementasyonu için **hiçbir yeni design-system primitive gerekmiyor** (listeler). Yeni component'ler bu primitive'lerin kompozisyonu olacak.

---

## 2. 4 Yeni Component — Preview Planı

### 2.1 AdminScopeSwitcher

**Konum:** Header (HorizonAdminLayout + AdminLayout content-top).

**Görsel taslak (ASCII):**
```
┌───────────────────────────────────────────────────────────────┐
│ ☰  ContentHub                     🎯 Tüm Kullanıcılar ▾  🌙 👤│
└───────────────────────────────────────────────────────────────┘
                                    └── AdminScopeSwitcher
                                        tıklayınca dropdown:
                                        ┌────────────────────┐
                                        │ 🎯 Tüm Kullanıcılar │ ← seçili
                                        │ ────────────────── │
                                        │ 👤 hüseyin@gmail   │
                                        │ 👤 user2@test      │
                                        │ 👤 user3@test      │
                                        └────────────────────┘
```

**Props (plan):**
```ts
// Dosya: components/layout/AdminScopeSwitcher.tsx (R6 yazılacak)
interface AdminScopeSwitcherProps {
  // Mevcut ADMIN_NAV/HORIZON_ADMIN_GROUPS'a dokunmaz.
  className?: string;
}
// Internal hooks:
// - useActiveScope(): { mode, userId, displayName }
// - useUsersList(): (admin only) fetched from /api/v1/users
// - setScope(mode, userId?)
```

**Class'lar (Tailwind / mevcut tokens):**
- Container: `flex items-center gap-2 px-2.5 py-1 rounded-md bg-surface-card border border-border-subtle hover:border-border-strong transition`
- Icon: `text-brand-500` (seçili tüm-users) / `text-info` (odaklı kullanıcı)
- Label: `text-sm text-neutral-900 dark:text-neutral-100` — **DİKKAT:** design-tokens-guide.md kuralı gereği sidebar bağlamı DEĞİL, header genelde light — yalnız `text-neutral-900` yeterli (header light bg).
- Dropdown: `absolute right-0 mt-2 w-64 bg-surface-card border border-border-DEFAULT rounded-md shadow-lg z-50`
- Seçili satır: `bg-brand-50 text-brand-700`

**Mock data:**
```ts
const mockUsers = [
  { id: "u1", email: "huseyin@gmail.com", name: "Hüseyin" },
  { id: "u2", email: "test@user.com", name: "Test Kullanıcı" },
];
```

**Risk notu:**
- Scope değişimi `queryClient.invalidateQueries()` tetiklemeli (cache contamination). R6'da discipline gerekir.
- Tüm users endpoint'i (`/api/v1/users`) zaten `require_admin` altında (backend doğrulandı R1'de).

---

### 2.2 UserIdentityStrip

**Konum:** UserLayout + HorizonUserLayout, content-top `sticky`.

**Görsel taslak:**
```
┌────────────────────────────────────────────────────────────┐
│ 👤 Hüseyin  •  Kendi alanım  •  🔔 3 yeni  📅 2 bugün      │
└────────────────────────────────────────────────────────────┘
        (sticky, 40px yüksek, bg-surface-card, border-b)
```

**Props:**
```ts
interface UserIdentityStripProps {
  className?: string;
}
// Internal:
// - useCurrentUser()
// - useNotificationCount()  (mevcut notificationStore)
// - useTodayEventCount()    (mevcut calendarApi)
```

**Class'lar:**
- Container: `sticky top-0 z-40 h-10 flex items-center gap-3 px-4 border-b border-border-subtle bg-surface-card/95 backdrop-blur`
- Avatar: `w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs flex items-center justify-center`
- Name: `text-sm text-neutral-900 font-medium`
- Scope chip: `text-xs text-neutral-500`
- Counter chip: `inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-info/10 text-info text-xs`

**Mock data:**
```ts
const mockStrip = {
  user: { name: "Hüseyin", avatar: null },
  scope: "Kendi alanım",
  notifications: 3,
  todayEvents: 2,
};
```

**Accessibility:** `role="banner"`, avatar `aria-label` doldurulmalı.

---

### 2.3 AdminDigestDashboard

**Konum:** `/admin` route (mevcut "Genel Bakış" placeholder yerine).

**Görsel taslak (grid):**
```
┌──────────────────────────────────────────────────────────────┐
│  Bugün                               Scope: Tüm Kullanıcılar │
├──────────────┬───────────────┬──────────────┬───────────────┤
│ Başarısız    │ Review        │ Retry        │ Yayın Kuyruğu │
│ İşler   12  │ Bekliyor  5   │ Adayı   3    │ Bugün    7    │
│ ↗ /admin/jobs│ ↗ /review     │ ↗ /jobs?rt   │ ↗ /publish    │
├──────────────┴───────────────┴──────────────┴───────────────┤
│  Son Aktif İşler (10)                                        │
│  ───────────────────────────────────────────────────────────│
│  [Job Card] [Job Card] [Job Card] ...                        │
├──────────────────────────────────────────────────────────────┤
│  Kanal Sağlığı          │  Otomasyon Koşuları Bugün          │
│  3 kanal, 1 uyarı       │  15 koşu, 2 failed                 │
└──────────────────────────────────────────────────────────────┘
```

**Component ağacı:**
```
AdminDigestDashboard
├── PageShell (title="Bugün", actions=[AdminScopeSwitcher])
├── SectionShell (title="Özet")
│   └── StatTileGrid (4 tile: failed / review / retry / publish)
├── SectionShell (title="Son Aktif İşler")
│   └── RecentJobsWidget (10 iş, kompakt DataTable)
└── SectionShell (title="Durum")
    ├── ChannelHealthWidget
    └── AutomationRunsWidget
```

**Yeni primitive?** HAYIR. `StatTileGrid` — kendi local component (PageShell + basit flex grid). Gereksinim küçük.

**Mock API endpoint'leri** (hepsi mevcut):
- `GET /api/v1/jobs?status=failed` → count
- `GET /api/v1/publish?status=pending_review` → count
- `GET /api/v1/automation/runs?date=today` → count + recent list
- `GET /api/v1/channels/health` (kontrol: `UserChannelAnalyticsPage.tsx` zaten kullanıyor)

**Scope bağlamı:** Dashboard admin-scope ise tüm user'lara ait sayılar; user:X scope'ta yalnız user:X.

---

### 2.4 UserDigestDashboard

**Konum:** `/user` route (mevcut user "Anasayfa" placeholder yerine).

**Görsel taslak:**
```
┌──────────────────────────────────────────────────────────────┐
│  👤 Hüseyin  •  Kendi alanım                   [UserIdStrip] │
├──────────────────────────────────────────────────────────────┤
│  Selam Hüseyin, bugün burada neler var:                      │
├──────────────┬───────────────┬──────────────┬───────────────┤
│ Onayımı      │ Bu Hafta      │ Başarısız     │ Gelen Kutusu │
│ Bekleyen 2  │ Yayın   7     │ İş      1    │ Yeni   3     │
├──────────────┴───────────────┴──────────────┴───────────────┤
│  Kanallarım (3)                                              │
│  ───────────────────────────────────────────────────────────│
│  [Kanal A — 12 yayın] [Kanal B — 5 yayın] [Kanal C — 0]     │
├──────────────────────────────────────────────────────────────┤
│  Otomasyonlarım                                              │
│  Kanal A: source_scan otomatik, publish manuel onay          │
│  Kanal B: hepsi otomatik                                     │
└──────────────────────────────────────────────────────────────┘
```

**Component ağacı:**
```
UserDigestDashboard
├── UserIdentityStrip (sticky)
├── PageShell (title="Bugün", subtitle="Selam Hüseyin, ...")
├── SectionShell
│   └── StatTileGrid (4 tile)
├── SectionShell (title="Kanallarım")
│   └── MyChannelsWidget (grid kartlar)
└── SectionShell (title="Otomasyonlarım")
    └── AutomationSummaryWidget
```

**Mock data:**
```ts
const mockUserDigest = {
  greeting: "Hüseyin",
  stats: { pendingMine: 2, publishThisWeek: 7, failedMine: 1, inboxNew: 3 },
  channels: [
    { name: "Kanal A", publishCount: 12 },
    { name: "Kanal B", publishCount: 5 },
    { name: "Kanal C", publishCount: 0 },
  ],
  automationSummary: [
    { channel: "Kanal A", summary: "source_scan otomatik, publish manuel onay" },
    { channel: "Kanal B", summary: "hepsi otomatik" },
  ],
};
```

---

## 3. 5 Sayfa Evrim — Preview Planı

### 3.1 PublishCenter lane/board view

**Mevcut:** `PublishCenterPage.tsx` sadece list view (DataTable).

**Yeni eklenmek istenen:** Kanban-style board (pending_review, approved, scheduled, published, failed).

**Görsel taslak:**
```
┌─────────────────────────────────────────────────────────────────┐
│ Yayın Merkezi           [▤ Liste] [◰ Board] ← toggle            │
├─────────────────────────────────────────────────────────────────┤
│ Review (5)   Approved (12)  Scheduled (8)  Published (245)      │
│ ┌────────┐   ┌────────┐     ┌────────┐    ┌────────┐            │
│ │ card 1 │   │ card 1 │     │ card 1 │    │ card 1 │            │
│ │ card 2 │   │ card 2 │     │ card 2 │    │ card 2 │            │
│ └────────┘   └────────┘     └────────┘    └────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

**Component ağacı:**
```
PublishCenterPage
├── PageShell
├── ViewToggle (Liste | Board)
├── (mode=list) LegacyPublishCenter (mevcut)
└── (mode=board) PublishBoard
    └── BoardColumn × N (status-bazlı)
        └── PublishCard
```

**Yeni primitive?** `BoardColumn` + `PublishCard` yeni ama basit. `DataTable`'ın kolon başlıklarını yeniden kullanabilir.

**Endpoint:** `usePublishRecords()` hook zaten mevcut, ek değişiklik gerekmiyor.

**Risk:** Drag-drop desteklenecek mi? **R4 kararı: HAYIR**. Drag-drop eklenir eklenirse yeni dependency (`@dnd-kit` gibi) gerekir. Kullanıcı izin vermedi. Board view yalnız görüntüleme.

---

### 3.2 Analytics tabs sayfası

**Mevcut:** 3 ayrı sayfa (`AnalyticsContentPage`, `AnalyticsOperationsPage`, `AnalyticsOverviewPage`).

**Yeni:** Tek sayfa, sekmeli (`/admin/analytics`).

**Görsel taslak:**
```
┌────────────────────────────────────────────────────────────┐
│ Analytics Merkezi       Scope: Tüm Kullanıcılar           │
├────────────────────────────────────────────────────────────┤
│ [Genel] [İçerik] [Operasyon] [YouTube]                     │
├────────────────────────────────────────────────────────────┤
│ (seçili sekmeye göre içerik)                               │
└────────────────────────────────────────────────────────────┘
```

**Component ağacı:**
```
AnalyticsHubPage
├── PageShell
├── TabBar (4 tab)
└── (tab=overview) AnalyticsOverviewContent   ← mevcut AnalyticsOverviewPage gövdesi
  (tab=content)  AnalyticsContentContent
  (tab=ops)      AnalyticsOperationsContent
  (tab=youtube)  YouTubeAnalyticsContent       ← mevcut AdminYouTubeAnalyticsPage gövdesi
```

**Dikkat:** Mevcut 4 sayfa body'leri refactor edilerek TabContent component'larına dönüşür. URL: `/admin/analytics?tab=content` (query param) veya `/admin/analytics/content` (nested route). R4 önerisi: **nested route** (bookmarkable + aria-friendly).

**Yeni primitive?** TabBar yok — custom local component. Design-system'e girmemeli (çok özel).

---

### 3.3 Settings Module Landing

**Mevcut:** `/admin/settings` tek uzun sayfa (`SettingsRegistryPage`, 204 entry scroll).

**Yeni:** `/admin/settings` = landing grid, `/admin/settings/:group` = filtered view.

**Görsel taslak (landing):**
```
┌─────────────────────────────────────────────────────────────┐
│ Ayarlar                                                     │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐         │
│ │ TTS     │  │ Publish │  │ Render  │  │ News    │         │
│ │ 16 ayar │  │ 22 ayar │  │ 14 ayar │  │ 11 ayar │         │
│ └─────────┘  └─────────┘  └─────────┘  └─────────┘         │
│ ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐         │
│ │ Thumb   │  │ Subtitle│  │Automation│  │ Channel │         │
│ └─────────┘  └─────────┘  └─────────┘  └─────────┘         │
│ ...                                                         │
└─────────────────────────────────────────────────────────────┘
```

**Component ağacı:**
```
SettingsLandingPage
├── PageShell
└── SettingsGroupGrid
    └── SettingsGroupCard × N
        - group name, count, icon, link to /admin/settings/:group

SettingsGroupPage (:group)
├── PageShell (title=group, breadcrumb=Ayarlar/Group)
└── SettingsRegistryBody (mevcut sayfanın filtered versiyonu)
```

**URL handling:** `/admin/settings/:group?` route param optional; missing → landing, present → filtered.

**Eski URL 301 redirect:** `/admin/settings?group=X` → `/admin/settings/X` (R6 router config).

---

### 3.4 Calendar Unified (admin + user)

**Mevcut:** `AdminCalendarPage` + `UserCalendarPage` iki dosya.

**Yeni:** Tek component (`CalendarView.tsx`) + iki route (`/admin/calendar` admin-scope, `/user/calendar` user-scope), scope hook belirliyor.

**Görsel taslak:**
```
┌──────────────────────────────────────────────────────────────┐
│ Takvim                    [Liste] [Hafta] [Ay]  [Filtre ▾]  │
├──────────────────────────────────────────────────────────────┤
│ Pzt       Sal       Çar       Per       Cum       Cmt  Paz │
│ ┌───┐    ┌───┐    ┌───┐    ┌───┐    ┌───┐    ┌───┐ ┌───┐  │
│ │ 1 │    │ 2 │    │ 3 │    │ 4 │    │ 5 │    │ 6 │ │ 7 │  │
│ │• 2│    │   │    │• 1│    │   │    │• 3│    │   │ │   │  │
│ └───┘    └───┘    └───┘    └───┘    └───┘    └───┘ └───┘  │
└──────────────────────────────────────────────────────────────┘
```

**Yeni eklenmek istenen:** **Liste görünümü toggle** (R2 pattern #4 — Hootsuite + Later).

**Component ağacı:**
```
CalendarView (ortak)
├── PageShell
├── ViewToggle (Liste | Hafta | Ay)
├── FilterBar (event type, channel)
└── (mode=list) CalendarList
  (mode=week) CalendarWeek  ← mevcut grid
  (mode=month) CalendarMonth
```

**Scope kullanımı:** `useActiveScope()` — `ownerUserId`'ye göre `fetchCalendarEvents({owner_user_id})`.

---

### 3.5 UserAutomationPage lineer-SVG

**Mevcut:** 5-checkpoint dropdown listesi (`UserAutomationPage.tsx:47-53`).

**Yeni:** Aynı 5 checkpoint, ama lineer SVG flow görsel + dropdown kontrol yan-yana.

**Görsel taslak:**
```
┌──────────────────────────────────────────────────────────────┐
│ Otomasyonlarım: Kanal A                                     │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   ①────→ ②────→ ③────→ ④────→ ⑤                              │
│  Scan   Draft   Render  Publish Post                        │
│  AUTO   MANUAL  AUTO    MANUAL  OFF                         │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ [mevcut dropdown kontroller]                                 │
└──────────────────────────────────────────────────────────────┘
```

**Önemli:** SVG **kütüphane olmadan** çiziliyor (raw `<svg>` + `<circle>` + `<line>`). `@xyflow/react` yasak.

**Component ağacı:**
```
UserAutomationPage
├── PageShell
├── ChannelSelector (mevcut)
├── AutomationFlowSvg  ← YENİ (raw SVG)
│   - 5 circle + 4 connecting line
│   - renk: mode'a göre (disabled=neutral, manual=warning, automatic=success)
└── CheckpointListDropdown (mevcut)
```

**Accessibility:** SVG'ye `<title>` + `<desc>`, her circle `role="img"`. Keyboard-only kullanıcılar için mevcut dropdown etkileşim ana yol olarak kalır.

---

## 4. Preview Dosya Konumu ve Yönetimi

### 4.1 Konum önerisi

```
docs/redesign/previews/                      (R6'da yazılacak)
├── admin_scope_switcher.preview.tsx
├── user_identity_strip.preview.tsx
├── admin_digest_dashboard.preview.tsx
├── user_digest_dashboard.preview.tsx
├── publish_board.preview.tsx
├── analytics_hub.preview.tsx
├── settings_landing.preview.tsx
├── calendar_unified.preview.tsx
├── automation_flow_svg.preview.tsx
└── README.md
```

**Neden `docs/redesign/previews/`?**
- `frontend/` altında olsa build'e girer, yan etki olur. Kullanıcı istemiyor.
- `docs/` salt-dokümantasyon konumu.
- `.preview.tsx` naming → ileride Storybook / Ladle'a aktarım kolaylığı.

### 4.2 Preview dosya içeriği şablonu

Her preview dosyası:
1. En üstte JSDoc başlık + kaynak bağlantı (hangi R3 sayfa eşleşme satırı)
2. Mock props
3. Component implementasyonu (Tailwind + mevcut tokens)
4. `export default function Preview()` — render fonksiyonu
5. Yorum satırları: "RISK:", "TODO R6:", "BAĞLI KONTRAT:"

**Örnek (AdminScopeSwitcher):**
```tsx
/**
 * Preview: AdminScopeSwitcher
 * R3 referansı: §4.2
 * Gerçek yeri (R6): components/layout/AdminScopeSwitcher.tsx
 * BAĞLI KONTRAT: hooks/useActiveScope (R6 yeni)
 */

import { useState } from "react";

const mockUsers = [
  { id: "u1", name: "Hüseyin" },
  { id: "u2", name: "Test Kullanıcı" },
];

export default function Preview() {
  const [mode, setMode] = useState<"all" | "user">("all");
  const [userId, setUserId] = useState<string | null>(null);
  // ...
  return (/* JSX */);
}
```

### 4.3 Preview'lerin kaderi

- R6 onay kapısında kullanıcı "AdminScopeSwitcher yap" dediğinde → preview dosyası referans alınır, `frontend/src/components/layout/AdminScopeSwitcher.tsx` yazılır
- Preview dosyaları `docs/` altında kalır (arşiv)
- R6 sonrası her yeni dalgada preview dosyası **ilk** yazılır, onaylanınca gerçek component yazılır

---

## 5. Tasarım İlkeleri (preview + implementation ikisi için)

### 5.1 Token ilkeleri (design-tokens-guide.md'den)

- **Başlık:** `text-neutral-900` (light), sidebar bağlamı `text-neutral-200` (dark-fixed)
- **Gövde:** `text-neutral-800`
- **İkincil:** `text-neutral-500` / `text-neutral-600`
- **Asla:** `text-neutral-100` / `text-neutral-200` ana içerikte (light temada görünmez)
- **Border:** `border-border-subtle` (hafif), `border-border` (std), `border-border-strong` (güçlü)
- **Kart/panel arka planı:** `bg-surface-card`
- **Inset/code:** `bg-neutral-100`

### 5.2 Layout ilkeleri

- Her sayfa `PageShell` ile sarmalanır.
- Her ana blok `SectionShell` kullanır.
- Tablo `DataTable` + `FilterBar` + `ColumnSelector` + `BulkActionBar` kombinasyonunu bozmaz (R1 tablo tasarım kuralları).

### 5.3 State görselleri

- Loading: `Skeleton`
- Empty: `EmptyState`
- Error: `PageShell` + inline `StatusBadge variant="failed"`
- Confirm: `ConfirmAction`
- Hızlı önizleme: `QuickLook`
- Sağ panel: `Sheet`

### 5.4 Yasaklar (R4 kararı)

- 🚫 Yeni color token (brand/neutral/status) tanıtma
- 🚫 Yeni font / font-size token
- 🚫 Yeni animation library (framer-motion zaten mevcut, kullan)
- 🚫 Yeni icon library (mevcut ikonografi: unicode + ikon font ne varsa)
- 🚫 Yeni font file
- 🚫 Yeni layout engine (grid / flex yeter)
- 🚫 Yeni chart library (analytics sekmeleri mevcut chart kütüphanesini kullanır — hangisi olduğunu R5'te verification edilecek)

---

## 6. Mock Data Contract Uyumu

Her preview mock data **mevcut API şemalarıyla** uyumlu olmalı. Aşağıda dosya-başı kontrat referansları:

| Preview | Mock Contract | Kaynak |
|---|---|---|
| AdminScopeSwitcher | `{ id, email, name, role }[]` | `api/usersApi.ts` (mevcut) |
| UserIdentityStrip | `{ name, avatar, scope }` | `api/authApi.ts` + `useAuthStore` |
| AdminDigest stats | `{ failed_count, pending_review, retry_candidates, publish_queue_today }` | `api/jobsApi.ts` + `api/publishApi.ts` + yeni `/api/v1/dashboard/admin/digest` (R6'da karar) |
| UserDigest stats | Aynı + scope user | ← |
| PublishBoard | `PublishRecordSummary[]` | `api/publishApi.ts:PublishRecordSummary` |
| AnalyticsHub tabs | Mevcut analytics endpoint'leri | `api/analyticsApi.ts` |
| SettingsLanding | `KNOWN_SETTINGS` groups + count | backend settings module |
| CalendarUnified | `CalendarEvent[]` | `api/calendarApi.ts:CalendarEvent` |
| AutomationFlowSvg | `AutomationPolicyResponse` | `api/automationApi.ts` |

**Kural:** Preview'de kullanılan field'lar gerçek kontrat field'ları olmalı. Uydurma field yasak.

---

## 7. R4 → R5 Geçiş Notları

R5 yol haritası girdileri:
1. **Öncelik tablosu** (hangi preview önce implement edilir) — riske göre
2. **Dosya tablosu** (hangi mevcut dosyalar nasıl etkilenir, kaç LoC refactor)
3. **Backend değişikliği tablosu** — R3'ten: sadece 1 alan (`approver_user_id`) yeni migration gerektiriyor; gerisi mevcut API
4. **Test planı** — her R6 iş kaleminin hangi test kategorilerine girdiği
5. **AdminScopeSwitcher chain** — en ağır refactor (49 admin sayfa fetch)
6. **R7 opsiyonel** — Wizard engine unification (büyük iş)

R5 çıktısı bir tablo: kalem / önkoşul / efor / risk / test.

---

## 8. R4 Teslim Raporu (7 Başlık)

### 8.1 Ne yaptın
4 yeni component + 5 sayfa evrim için preview planı. Design tokens uyumu, mock data contract uyumu, yasak yeni bağımlılık listesi, component ağacı, Tailwind class ilkeleri, accessibility notu.

### 8.2 Hangi dosyaları okudun / değiştirdin
- **Okundu:** `docs/design-tokens-guide.md` (ilk 80 satır, kural envanteri), `frontend/src/components/design-system/*.tsx` (14 dosya envanter)
- **Glob:** `frontend/src/surfaces/**/*.ts*` (34), `frontend/src/stores/*.ts` (8) — R3'te yapılmış, referans
- **Yazıldı:** Yalnız `docs/redesign/R4_preview_prototype_plan.md` (bu dosya)

### 8.3 Hangi testleri çalıştırdın
R4 plan fazı — kod değişikliği yok, test yok. `git diff --stat backend/ frontend/ renderer/` boş olmalı.

### 8.4 Sonuç ne oldu
- 4 yeni component mimari şemaları hazır
- 5 sayfa evrim görsel taslak + component ağacı hazır
- Mock data field-level mevcut kontrat referanslı
- Preview dosya konumu `docs/redesign/previews/` (R6'da yazılacak)
- Yeni dependency yok, yeni token yok, yeni primitive yok

### 8.5 Bulduğun ek riskler
- **R1:** `AdminDigest` için custom endpoint (`/api/v1/dashboard/admin/digest`) gerekebilir; R5'te alternatif olarak mevcut endpoint'leri client-side birleştirme (React Query parallel fetch) değerlendirilecek.
- **R2:** Analytics'teki chart library envanteri R5'te yapılacak (hangi kütüphane, hangi API, kaç kullanım).
- **R3:** PublishBoard drag-drop istenirse yeni dependency gelir; şimdilik görüntüleme-only.
- **R4:** Automation SVG'nin dinamik (kullanıcı tarafından node ekleyebildiği) hali için de ileride `@xyflow/react` düşünülebilir — ama **şimdilik yapılmamalı**.
- **R5:** Settings module landing URL değişimi eski bookmark'ları kırabilir; R6'da 301 redirect mutlaka planlanmalı.

### 8.6 Commit hash
Bu commit sonrası güncellenecek (MEMORY.md tablosu + teslim paketi).

### 8.7 Push durumu
Worktree remote'a aktif. Main'e dokunulmaz.

---

## 9. code change: none

```
git diff --stat backend/ frontend/ renderer/
# (boş)
```

CLAUDE.md kuralları korundu:
- Hidden behavior yok (AdminScopeSwitcher görünür, audit-traceable).
- Hardcoded çözüm yok (dashboard widget'ları Settings Registry key'leriyle disable edilebilir: `dashboard.admin.widget.failed_jobs.enabled` vb.)
- Yeni bağımlılık önerilmedi
- Design-tokens-guide.md kuralları referans alındı

---

## 10. Sonraki Adım: FAZ R5 (otomatik devam)

R5 yol haritası üretecek:
1. Tablo: kalem / etki alanı (dosya sayısı, LoC tahmini) / efor / risk / önkoşul / test
2. Sıralama: önce AdminScopeSwitcher + useCurrentUser/useActiveScope (temel altyapı)
3. Sonra diğerlerini bağlayan sıra (4 öncelikli iş: Scope infra → Digest → Pub Board → Analytics tabs → Calendar → Settings landing → Automation SVG → Duplicate merge → Wizard engine)
4. R6 onay kapısında kullanıcının "hangi tek kalem ilk uygulansın" seçmesi için **tek kalemi de bağımsız yapılabilir** olarak işaretle.
5. Backend değişiklik gerektiren tek kalem: "Approver assignment" (R6 dışı)
6. Potansiyel "Faz R7 Wizard Unification" ayrı dalga notu

Çıktı: `docs/redesign/R5_execution_roadmap.md`

R6 onay kapısına kadar kod yok.

---

**Doküman sonu. R5 otomatik başlatılacak.**
