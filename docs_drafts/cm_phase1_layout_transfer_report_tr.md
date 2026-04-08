# CM Phase 1: Layout Transfer Raporu

**Tarih:** 2026-04-06
**Kapsam:** Admin layout shell, sidebar, header, overlay duzeltmeleri, tema token auditi

## Ozet

ContentManager gorusel dilinin ContentHub'a kontrollü transferinin ilk fazı tamamlandı.
Mevcut tema sistemi, route yapisi, visibility engine, wizard, command palette, notification center ve analytics mimarisi korundu.

## Yapilan Degisiklikler

### 1. ColumnSelector Z-Index Duzeltmesi
**Dosya:** `frontend/src/components/design-system/ColumnSelector.tsx`

- Sorun: Dropdown `z-50` ile absolute positioning kullaniyordu, sidebar `z-sidebar` (100) oldugu icin dropdown sidebar arkasinda kaliyordu
- Cozum: React Portal kullanilarak dropdown `document.body`'ye renderlanir, `z-dropdown` (200) ile her zaman uste cikar
- Button ref'i ile pozisyon hesaplanir, outside click hem button hem dropdown ref kontrol eder

### 2. HorizonSidebar Yeniden Tasarimi
**Dosya:** `frontend/src/components/layout/HorizonSidebar.tsx`

- Emoji ikonlar (`◉`, `⚙`, `✎`, `▶`, `≡`, `ⓘ`, `◐`) lucide-react ikonlarina degistirildi (LayoutDashboard, Settings, Pencil, Send, BarChart3, Newspaper, Palette)
- Icon rail genisligi: `w-[48px]` → `w-sidebar-collapsed` (tema token)
- Context panel genisligi: `w-[256px]` → `calc(var(--ch-sidebar-width) - var(--ch-sidebar-collapsed-width))` (tema token)
- Brand mark: daha buyuk (w-9 h-9), rounded-xl, guclendirmis glow efekti
- Search trigger: lucide Search ikonu + keyboard shortcut badge
- Expand/collapse toggle: `‹`/`›` karakterleri → lucide ChevronLeft/ChevronRight
- NavLink'lere `end` prop eklendi ("/admin" exact match icin)
- Premium spacing: daha genis padding, daha net section ayrimlari

### 3. HorizonAdminLayout Header Bar
**Dosya:** `frontend/src/app/layouts/HorizonAdminLayout.tsx`

- Eklenen: Sticky header bar (frosted glass efektli, blur backdrop)
- Breadcrumb navigasyonu: route path'den otomatik olusturulur, Turkce etiketlerle
- Aksiyonlar: Command palette trigger (⌘K), notification bell, panel switch butonu
- Subtle brand accent line (gradient)
- Tum boyutlar tema token'larindan gelir: `h-header`, `px-page`, `ml-sidebar-collapsed`

### 4. HorizonUserLayout Header Bar
**Dosya:** `frontend/src/app/layouts/HorizonUserLayout.tsx`

- Admin layout ile ayni header patterni
- Simplified: breadcrumb yerine statik "Kullanici Paneli" etiketi
- Panel switch butonu admin'e yonlendirir

### 5. Tema Token Guncellemeleri
**Dosya:** `frontend/src/components/design-system/themes-horizon.ts`

4 Horizon temasinda (Chalk, Obsidian, Sand, Midnight):
- `sidebarCollapsedWidth`: `48px` → `56px`
- `headerHeight`: `0px` → `48px`
- `sidebarWidth`: ~280px → `312px` (collapsed + panel)

### 6. Tailwind Config Genisletmeleri
**Dosya:** `frontend/tailwind.config.ts`

- `margin.sidebar-collapsed`: sidebar offset icin (`var(--ch-sidebar-collapsed-width)`)
- `padding.page`: sayfa padding icin (`var(--ch-page-padding)`)

### 7. Layout Padding Tokenizasyonu
**Dosyalar:** Tum layout dosyalari (AdminLayout, UserLayout, HorizonAdminLayout, HorizonUserLayout)

- `p-4` / `p-5` → `p-page` (tema token)
- `px-5` → `px-page` (header padding)

### 8. Hardcoded Renk Temizligi (141 instance)

Tum frontend kaynak dosyalarindaki hardcoded Tailwind renk siniflarini semantic tema token'larina donusturuldü:

| Eski | Yeni | Kullanim |
|------|------|----------|
| `text-red-500/600` | `text-error-dark` | Hata mesajlari, zorunlu alan isareti |
| `bg-red-50/100` | `bg-error-light` | Hata arka plan |
| `border-red-*` | `border-error` | Hata border |
| `bg-red-500` | `bg-error` | Hata butonu |
| `text-emerald-600/700`, `text-green-600/700` | `text-success-dark` | Basari mesajlari |
| `bg-emerald-100/50`, `bg-green-100` | `bg-success-light` | Basari arka plan |
| `bg-emerald-500` | `bg-success` | Basari dot/bar |
| `border-emerald-*` | `border-success` | Basari border |
| `text-amber-500/600/700` | `text-warning-dark` | Uyari mesajlari |
| `bg-amber-50/100` | `bg-warning-light` | Uyari arka plan |
| `bg-amber-400/500` | `bg-warning` | Uyari dot/buton |
| `border-amber-*` | `border-warning` | Uyari border |
| `text-blue-600/700/800` | `text-info-dark` | Bilgi metni |
| `bg-blue-50/100/200` | `bg-info-light` | Bilgi arka plan |
| `bg-blue-400/600` | `bg-info` | Bilgi gostergesi |
| `border-blue-*` | `border-info` | Bilgi border |
| `bg-purple-100 text-purple-700` | `bg-info-light text-info-dark` | Status badge |
| `bg-teal-200 text-teal-800` | `bg-success-light text-success-dark` | Feature badge |
| `bg-rose-200 text-rose-800` | `bg-error-light text-error-dark` | Feature badge |
| `border-blue-500 ring-blue-200` (secim) | `border-brand-500 ring-brand-200` | Secili state |
| `text-blue-700` (secim) | `text-brand-700` | Secili text |

**Etkilenen dosyalar (~25 dosya):**
- `components/jobs/`: JobProgressBar, JobTimelinePanel, JobSystemPanels
- `components/news-bulletin/`: 4 form + table
- `components/news-items/`: NewsItemDetailPanel
- `components/preview/`: 7 preview biliseni
- `components/wizard/`: ContentCreationWizard, WizardShell
- `components/sources/`: SourceDetailPanel
- `components/design-system/`: BulkActionBar
- `pages/admin/`: JobDetailPage, NewsBulletinDetailPage, NewsBulletinWizardPage, PublishDetailPage, WizardSettingsPage

## Dogrulama

- TypeScript: `tsc --noEmit` — 0 hata
- Vite build: `vite build` — basarili (2.43s)
- Hardcoded renk taramasi: `grep` ile 0 sonuc (red-N, green-N, emerald-N, amber-N, blue-N, purple-N, teal-N, rose-N)

## Korunan Yapilar

- Route yapisi ve navigasyon
- Visibility engine
- Command palette (Cmd+K)
- Notification center + SSE
- Theme registry ve tema degistirme
- Wizard altyapisi
- Analytics hooks ve sayfalar
- Onboarding akisi
- React Query / Zustand state management
- Klasik (non-Horizon) layout'lar

## Bilinen Sinirlamalar

1. **Spacing token'lari sinirli:** Tailwind'in varsayilan spacing scale'i (0.5, 1, 1.5, 2, 3, 4, 5 vb.) tema token'i degil. Sayfa padding'i `p-page` ile tokenize edildi ama component-internal spacing (gap-2, px-3, py-1.5 vb.) Tailwind varsayilan degerlerini kullaniyor. Bunlar tema bazinda degismez ama ileride `density` token'i ile kontrol edilebilir.

2. **Lucide-react yeni dependency:** ~200KB eklendi. Tree-shaking ile sadece kullanilan ikonlar bundle'a dahil olur.

3. **Backdrop blur deger:** Header'daki `backdrop-blur-[16px]` ve `backdrop-blur-[12px]` hardcoded — tema token'i olarak eklenebilir ama gorsel etki acisinda tum temalarda ayni calisir.

## Sonraki Adimlar (Phase 2 icin)

- Admin dashboard zenginlestirme (CM benzeri stat card grid, sistem durumu, is dagilim cubugu)
- Ortak card/panel wrapper bileseni (premium rounded, border, hover lift)
- Accordion form deseni (modul/provider ayarlari icin)
- `density` tema token'i ile component-level spacing kontrolu
