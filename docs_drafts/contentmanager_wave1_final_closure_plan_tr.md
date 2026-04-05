# Wave 1 — Final Closure Plan

**Tarih:** 2026-04-05
**Amaç:** Wave 1'deki tüm açık maddeleri kapatmak, theme contract/manifest sistemi kurmak, theme registry UI oluşturmak, font sistemini entegre etmek.

---

## Faz A — Gap Closure

### A1. Hardcoded Renkler → Token Sistemi
**Değişecek dosyalar:**
- `pages/admin/VisibilityRegistryPage.tsx` — PageShell'e geçiş + tokens
- `pages/admin/YouTubeAnalyticsPage.tsx` — PageShell'e geçiş + tokens
- `pages/admin/NewsItemsRegistryPage.tsx` — PageShell'e geçiş + tokens
- `pages/admin/UsedNewsRegistryPage.tsx` — PageShell'e geçiş + tokens
- `pages/admin/NewsBulletinRegistryPage.tsx` — PageShell'e geçiş + tokens
- `pages/UserPublishEntryPage.tsx` — tokens
- `pages/admin/TemplateStyleLinkCreatePage.tsx` — tokens
- `components/settings/EffectiveSettingsPanel.tsx` — tokens
- `components/jobs/JobsTable.tsx` — tokens

### A2. Sheet Focus Trap
**Değişecek dosya:** `components/design-system/Sheet.tsx`
- Tab/Shift+Tab ile panel dışına çıkışı engelle
- İlk ve son focusable element arasında döngü

### A3. Sidebar Collapse Persist
**Değişecek dosya:** `stores/uiStore.ts`
- localStorage'dan oku, değiştiğinde yaz

### A4. SSE URL Düzeltme
**Değişecek dosya:** `pages/admin/JobDetailPage.tsx`
- URL: `/api/v1/sse/jobs/${jobId}` olacak (backend endpoint: `/sse/jobs/{job_id}`, prefix: `/api/v1`)
- SSE event type listener ekleme: `job:status_changed`, `job:step_changed`

### A5. Auto-Save Settings Entegrasyonu
**Değişecek dosya:** `components/settings/EffectiveSettingsPanel.tsx`
- useAutoSave hook'u SettingRow'a entegre et
- dirty/saving/saved/error indicator

### A6. "/" Search Focus
**Yeni dosya:** `hooks/useSearchFocus.ts`
**Değişecek dosyalar:** Keyboard navigation olan tüm sayfalarda search input'a `/` ile focus

---

## Faz B — Theme Contract / Manifest

### Yeni dosyalar:
- `components/design-system/themeContract.ts` — Canonical theme type + default theme + validation
- `components/design-system/themeEngine.ts` — Theme → CSS variables + token override engine
- `stores/themeStore.ts` — Active theme, theme registry, persistence

---

## Faz C — Theme Registry UI

### Yeni dosyalar:
- `pages/admin/ThemeRegistryPage.tsx` — Liste, aktif tema, geçiş, import

---

## Faz D — Font Sistemi

Theme contract'ta heading/body/mono font ayrımı. tokens.ts theme engine'den beslenir.

---

## Faz E-H — Interaction, Toast/SSE, Visual Polish, Tests

Detaylar implementasyon sırasında.

---

## Risk Analizi

1. **Hardcoded renk geçişi:** Bazı alt bileşenler (VisibilityRulesTable vb.) de hardcoded olabilir — taranacak
2. **Focus trap:** Portal/overlay etkileşimleri dikkatli test edilmeli
3. **Theme geçişi:** CSS variables ile yapılacak, mevcut inline style'lar uyumlu olmalı
4. **Test regresyonu:** 2225 mevcut test korunmalı

## Test Stratejisi
- Her faz sonunda `npx tsc --noEmit` ve `npx vitest run`
- Yeni testler: theme store, theme validation, focus trap, sidebar persist, search focus
- Regression: tüm mevcut testler geçmeli
