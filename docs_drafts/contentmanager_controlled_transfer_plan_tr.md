# ContentManager → ContentHub: Kontrollü Aktarım Planı

**Tarih:** 2026-04-05
**Yöntem:** Kod taşıma YOK — davranış, bilgi mimarisi ve UX deseni soyutlanarak ContentHub mimarisine uyumlu şekilde sıfırdan yazılacak
**Kaynak Repo:** /Users/huseyincoskun/Downloads/AntigravityProje/ContentManager
**Hedef Repo:** /Users/huseyincoskun/Downloads/AntigravityProje/ContentHub

---

## KONTROLLÜ AKTARIM İLKELERİ

1. Hiçbir dosya, component, hook, service, CSS doğrudan kopyalanmayacak
2. Her aktarım: referans davranış → soyut desen → ContentHub karşılığı → yeni implementasyon
3. ContentHub'ın mevcut yapısı korunacak: React Query, inline CSS (tokens), data-testid, visibility guard, read_only guard, route guard
4. ContentManager Tailwind + Radix kullanıyor — ContentHub bunları KULLANMIYOR. Tüm stiller tokens.ts + React.CSSProperties ile yazılacak
5. ContentManager Zustand store kullanıyor — ContentHub'da henüz Zustand yok. Store'lar ContentHub'ın kendi state yönetim ilkelerine göre tasarlanacak
6. ContentManager React Query KULLANMIYOR (native fetch) — ContentHub React Query kullanıyor. API katmanı DEĞİŞMEYECEK

---

## BÖLÜM 1: BACKEND AKTARIM ENVANTERİ

### 1.1 ContentManager'da Var, ContentHub'da EKSİK — Backend

| # | Özellik | CM Dosya(lar) | CH Mevcut Durum | Aktarım Tipi |
|---|---------|--------------|-----------------|-------------|
| B1 | **Pipeline CacheManager** | `pipeline/cache.py` — session/{job_id}/step_*.json dosya cache, has_output/save/load/clear | CH'de `jobs/workspace.py` var ama adım-bazlı idempotent cache yok | Davranış aktarımı: workspace.py'ye cache semantiği ekle |
| B2 | **Worker Loop (Concurrent Job Dispatch)** | `services/job_manager.py` — 1s poll, max_concurrent_jobs, asyncio.create_task(run_pipeline) | CH'de `jobs/executor.py` + `jobs/dispatcher.py` var, recovery var ama worker loop detayları farklı | Karşılaştır ve iyileştir |
| B3 | **Maliyet Takibi (Cost Tracking)** | `models/job.py` — cost_estimate_usd (Job + JobStep), ProviderResult.cost_estimate_usd | CH'de job_steps'te provider_trace_json var ama maliyet alanı yok | Yeni alan: job_steps.cost_estimate_usd + aggregation |
| B4 | **Provider Fallback Zinciri (execute_with_fallback)** | `providers/registry.py` — get_ordered_providers → sırayla dene, hepsi başarısız → son hata | CH'de `providers/resolution.py` + `providers/capability.py` var ama fallback execution zinciri detayı farklı | Karşılaştır, CM'nin zincir semantiğini uygula |
| B5 | **Kategori Sistemi (Content Categories)** | `models/category.py` — 6 kategori (general, true_crime, science, history, motivation, religious), tone/focus/style_instruction, TR/EN | CH'de yok. Settings veya ayrı tablo olabilir | Yeni: categories tablosu + seeder + service |
| B6 | **Açılış Hook Sistemi** | `models/hook.py` — 8 hook tipi (shocking_fact, question, anecdote...), TR/EN, tekrar önleme | CH'de yok | Yeni: hooks tablosu + seeder + tekrar önleme servisi |
| B7 | **Narration Humanization** | `pipeline/steps/script.py` — LLM çağrısıyla doğal konuşma kalıplarına dönüştürme, prozodik işaretçiler | CH'de yok, step executor'larda TTS enhancement planlanmış olabilir | Yeni: narration_enhance step veya script step'e entegre |
| B8 | **Batch Job Creation** | `api/jobs.py` — tek endpoint ama frontend birden fazla konu gönderebilir, 150ms arayla sıralı oluşturma | CH'de tek job oluşturma var, batch yok | Yeni: batch create endpoint veya frontend-driven sequential |
| B9 | **Output Folder Yönetimi** | `api/settings.py` — admin/output-folder endpoint, Finder/Explorer'da aç | CH'de workspace var ama kullanıcı-kontrollü çıktı klasörü yok | Yeni: output folder setting + açma API |
| B10 | **Module Registry (Plugin Mimarisi)** | `modules/base.py` — ContentModule ABC, Capability enum, get_pipeline_steps(), module_registry | CH'de `modules/base.py` + `modules/registry.py` var — benzer yapı | Karşılaştır, capability enum zenginleştir |
| B11 | **Category-Style Mapping** | `models/category_style_mapping.py` — haber kategorisi → bülten görsel stili | CH'de yok ama TemplateStyleLink benzer bir amaca hizmet edebilir | Yeni: haber kategorisi → stil mapping servisi |
| B12 | **Dual SSE Hub (Job + Global)** | `services/job_manager.py` — _SSEHub (per-job) + _GlobalSSEHub (all jobs) | CH'de `sse/bus.py` var ama dual hub semantiği farklı | Karşılaştır, global hub ekle |
| B13 | **Canli Log Streaming** | `services/job_manager.py` — emit_log(job_id, level, message) → SSE | CH'de SSE bus var ama log streaming endpoint yok | Yeni: SSE log event tipi + frontend tüketici |

### 1.2 ContentManager'da Var, ContentHub'da DAHA İYİ

| # | Özellik | CM Yaklaşımı | CH Yaklaşımı | Sonuç |
|---|---------|-------------|-------------|-------|
| X1 | Ayarlar | 5 katmanlı SQLite (scope/scope_id) | Metadata-zengin product object (visibility, wizard, validation) | CH üstün — koruyoruz |
| X2 | Migration | main.py'de legacy migration fonksiyonları | Alembic (23 version) | CH üstün — koruyoruz |
| X3 | Haber Sistemi | Basit NewsSource CRUD + RSS fetch | Source Registry + Scan Engine + Used News + Dedupe + Editorial Gate | CH çok üstün — koruyoruz |
| X4 | Yayınlama | Adapter pattern + YouTube | State machine (draft→submitted→approved→published) + review gate + scheduler | CH üstün — koruyoruz |
| X5 | Denetim | Yok | Append-only audit_logs | CH üstün — koruyoruz |
| X6 | Görünürlük | Yok | Visibility Engine (rule_type, priority, scope) | CH üstün — koruyoruz |
| X7 | Auth | PIN (localStorage) | User model (role, status) — henüz auth layer yok ama tasarım daha güçlü | CH üstün mimari |

---

## BÖLÜM 2: FRONTEND AKTARIM ENVANTERİ

### 2.1 ContentManager'da Var, ContentHub'da EKSİK — Frontend

| # | Özellik | CM Kaynak | CH Mevcut | Aktarım Detayı |
|---|---------|-----------|-----------|----------------|
| F1 | **Zustand Store Altyapısı** | 6 store (jobStore, uiStore, settingsStore, adminStore, keyboardStore, platformAccountStore) | ZUSTAND YOK. Tüm state React Query + useState | CH'ye Zustand ekle. Store'lar: uiStore (tema, sidebar, toast), keyboardStore (scope stack). React Query'ye DOKUNMA |
| F2 | **Klavye Navigasyon: keyboardStore** | `stores/keyboardStore.ts` — LIFO scope stack, push/pop/isActive | Yok | Yeni: Zustand store, LIFO stack, scope ID yönetimi |
| F3 | **Klavye Navigasyon: useScopedKeyboardNavigation** | `hooks/useScopedKeyboardNavigation.ts` — ↑↓/j-k/Home/End/Enter/Space/Esc, guard'lar (input/IME/modifier) | Yok | Yeni: hook, CH'nin tokens.ts'inden stil alır, data-testid korur |
| F4 | **Klavye Navigasyon: useRovingTabindex** | `hooks/useRovingTabindex.ts` — tabIndex yönetimi, keyboard vs mouse ayrımı | Yok | Yeni: hook, DataTable primitive'ine entegre |
| F5 | **ESC Yığını: useDismissStack** | `hooks/useDismissStack.ts` — LIFO priority, çift-ESC koruması | Yok | Yeni: hook, Sheet + QuickLook + Modal için |
| F6 | **Fokus Geri Yükleme: useFocusRestore** | `hooks/useFocusRestore.ts` — captureForRestore/restoreFocus/restoreFocusDeferred | Yok | Yeni: hook |
| F7 | **Sheet/Drawer (Sağdan Kayan Panel)** | `components/jobs/JobDetailSheet.tsx` — Radix Dialog + slide animation + SSE live + action footer | Yok. DetailPanel'ler sabit div | Yeni: Sheet primitive (tokens.ts stil, animasyon), tüm DetailPanel'leri sarmalama |
| F8 | **QuickLook (Space Önizleme)** | `components/jobs/JobQuickLook.tsx` — Space toggle, capture-phase, ESC priority=20 | Yok | Yeni: QuickLook primitive, Jobs/Content/Asset listelerinde kullanım |
| F9 | **Toast Bildirim Sistemi** | `stores/uiStore.ts` — toasts array, addToast/removeToast, 4 tip, 4s otomatik | Yok. Token'da z-index: 400 var ama component yok | Yeni: uiStore.toasts + Toast component + useToast hook |
| F10 | **Dark Mode Toggle** | `stores/uiStore.ts` — theme: dark/light, CSS custom properties, localStorage persist | Yok. Sadece light palette | Yeni: uiStore.theme + tokens.ts'e dark palette + toggle component |
| F11 | **Auto-Save Hook** | `hooks/useAutoSave.ts` — alan tipine göre strateji (toggle→anında, text→blur, textarea→800ms debounce) | Yok. Tüm formlar manual save | Yeni: useAutoSave hook, Settings ve form sayfalarında kullanım |
| F12 | **Command Palette (Cmd+K)** | CM'de yok ama CH CLAUDE.md'de planlanmış | Yok | Yeni: CommandPalette component + uiStore.commandPaletteOpen |
| F13 | **İki Aşamalı Silme Onayı** | CM'de inline pattern: tık→"Emin misiniz?"→tık→sil | Yok. Silme direkt | Yeni: ConfirmDelete component veya ActionButton variant |
| F14 | **SSE Frontend Client** | `api/client.ts` — openSSE(path, handlers), EventSource wrapper | Backend SSE var ama frontend client YOK | Yeni: useSSE hook, React Query invalidation ile entegre |
| F15 | **ARIA Listbox Pattern** | CM: role="listbox" + role="option" + aria-selected + aria-activedescendant | CH: DataTable primitive HTML table kullanıyor | İyileştir: DataTable'a ARIA attributes ekle |
| F16 | **Schema-Driven Settings Form** | `pages/admin/GlobalSettings.tsx` — SYSTEM_SETTINGS_SCHEMA → otomatik field render (8 tip) | CH: SettingsRegistryPage + EffectiveSettingsPanel var ama schema-driven değil | İyileştir: schema-driven render pattern |
| F17 | **Admin PIN Modal** | `components/layout/Header.tsx` — PIN doğrulama, localStorage | CH'de auth farklı tasarlanmış | Değerlendirme gerekli — CH'nin auth planına bağlı |
| F18 | **Sidebar Collapse/Expand** | `stores/uiStore.ts` — sidebarCollapsed toggle, 60px/220px, localStorage persist | CH: sidebar 240px sabit (M24) | İyileştir: collapse toggle ekle, uiStore'dan yönet |
| F19 | **Mobil Sidebar (Drawer)** | `stores/uiStore.ts` — mobileSidebarOpen, overlay backdrop | CH: responsive design yok | Yeni: mobile drawer + hamburger menu |

### 2.2 Sayfa Bazlı Entegrasyon Haritası

| CH Sayfası | CM Karşılığı | Aktarılacak Davranış |
|-----------|-------------|---------------------|
| JobsRegistryPage | JobList + JobQuickLook + JobDetailSheet | Klavye navigasyon, Space→QuickLook, Enter→Sheet, ESC→kapat |
| JobDetailPage | JobDetail (full page) | SSE canlı güncelleme, pipeline step tracker, canlı log viewer |
| ContentLibraryPage | — (CM'de yok) | Klavye navigasyon, QuickLook (içerik önizleme) |
| AssetLibraryPage | — (CM'de yok) | Klavye navigasyon, QuickLook (asset önizleme) |
| SettingsRegistryPage | GlobalSettings (schema-driven) | Auto-save, schema-driven form, kilit göstergesi |
| AuditLogPage | — (CM'de yok) | Klavye navigasyon, detay sheet |
| AnalyticsOverviewPage | AdminDashboard (istatistikler) | Gerçek zamanlı metrik kartları |
| SourcesRegistryPage | NewsSourceManager | Inline düzenleme, iki aşamalı silme |
| TemplatesRegistryPage | ModuleManager | Inline config, CRUD |
| AdminOverviewPage | AdminDashboard | KPI kartları, hızlı erişim, sistem sağlığı |

---

## BÖLÜM 3: REMOTION AKTARIM ENVANTERİ

### 3.1 ContentManager Remotion'da Var, ContentHub'da EKSİK

| # | Özellik | CM Dosya | Aktarım Detayı |
|---|---------|---------|----------------|
| R1 | **StandardVideo Composition** | `compositions/StandardVideo.tsx` — sahne+TTS+altyazı+Ken Burns | CH'de `composition_map.py` var ama Remotion bileşen yok. Sıfırdan yaz |
| R2 | **NewsBulletin Composition** | `compositions/NewsBulletin.tsx` — lower-third + ticker + breaking overlay | CH'de news_bulletin modülü var ama Remotion bileşen yok. Sıfırdan yaz |
| R3 | **ProductReview Composition** | `compositions/ProductReview.tsx` — puan halkası + fiyat + yıldız + yorum | CH'de product_review planlanmış. Sıfırdan yaz |
| R4 | **Subtitles Component** | `components/Subtitles.tsx` — 5 stil (standard/neon/gold/minimal/hormozi), karaoke timing, 5 animasyon | CH'de subtitle_style picker var ama renderer yok. Sıfırdan yaz |
| R5 | **VideoEffects Component** | `components/VideoEffects.tsx` — vignette/warm/cool/cinematic | Yok. Sıfırdan yaz |
| R6 | **NewsTicker Component** | `components/NewsTicker.tsx` — sonsuz scroll, 9 stil rengi | Yok. Sıfırdan yaz |
| R7 | **BreakingNewsOverlay** | `components/BreakingNewsOverlay.tsx` — spring badge + flash | Yok. Sıfırdan yaz |
| R8 | **PriceBadge/StarRating/FloatingComments** | 3 ayrı component — counter animation, SVG yıldız, yüzen kartlar | Yok. Sıfırdan yaz |
| R9 | **useLayout Hook** | `components/useLayout.ts` — 16:9 ve 9:16 responsive layout | Yok. Sıfırdan yaz |
| R10 | **Lokal Media Server** | Backend'de render sırasında HTTP server — Remotion'un headless browser'ı için | Yok. Backend'e ekle |

---

## BÖLÜM 4: UYGULAMA PLANI — FAZLAR

### FAZ 1: Zustand + Klavye + Toast Altyapısı
**Bağımlılık:** Yok (temel altyapı)
**Tahmini Dosya Sayısı:** ~12 yeni dosya

| Adım | Dosya | Açıklama |
|------|-------|----------|
| 1.1 | `frontend/src/stores/uiStore.ts` | Tema (dark/light), sidebar (collapsed), toast kuyruğu, commandPaletteOpen |
| 1.2 | `frontend/src/stores/keyboardStore.ts` | LIFO scope stack: push, pop, isActive |
| 1.3 | `frontend/src/hooks/useScopedKeyboardNavigation.ts` | Ana klavye hook: ↑↓/j-k/Home/End/Enter/Space/Esc + tüm guard'lar |
| 1.4 | `frontend/src/hooks/useRovingTabindex.ts` | tabIndex yönetimi, keyboard/mouse ayrımı |
| 1.5 | `frontend/src/hooks/useDismissStack.ts` | ESC priority stack |
| 1.6 | `frontend/src/hooks/useFocusRestore.ts` | Overlay kapatma odak geri yükleme |
| 1.7 | `frontend/src/components/design-system/Toast.tsx` | Toast component: 4 tip, stack render, auto-dismiss |
| 1.8 | `frontend/src/hooks/useToast.ts` | uiStore.addToast wrapper |
| 1.9 | `frontend/src/components/design-system/tokens.ts` | Dark palette ekleme (mevcut dosya güncelleme) |
| 1.10 | `frontend/src/components/layout/ThemeToggle.tsx` | Tema değiştirme butonu |
| 1.11 | `frontend/src/hooks/useSSE.ts` | SSE client hook: EventSource wrapper, React Query invalidation |
| 1.12 | Tests | Her hook ve component için birim test |

**Korunacaklar:** Mevcut React Query hooks, data-testid'ler, visibility guard, tokens.ts light palette

### FAZ 2: Sheet + QuickLook + Detay Paneli Dönüşümü
**Bağımlılık:** Faz 1 (keyboard store, dismiss stack, focus restore)
**Tahmini Dosya Sayısı:** ~8 yeni + ~15 güncelleme

| Adım | Dosya | Açıklama |
|------|-------|----------|
| 2.1 | `frontend/src/components/design-system/Sheet.tsx` | Sağdan kayan panel primitive: overlay + slide animation + ESC kapatma + focus trap |
| 2.2 | `frontend/src/components/design-system/QuickLook.tsx` | Merkezi önizleme modal: Space toggle + capture-phase + ESC priority |
| 2.3 | `frontend/src/components/design-system/ConfirmAction.tsx` | İki aşamalı silme/tehlikeli aksiyon onayı |
| 2.4 | JobsRegistryPage güncelleme | DataTable → keyboard nav + Enter→Sheet + Space→QuickLook |
| 2.5 | ContentLibraryPage güncelleme | Aynı pattern |
| 2.6 | AssetLibraryPage güncelleme | Aynı pattern |
| 2.7 | AuditLogPage güncelleme | Aynı pattern |
| 2.8 | SourcesRegistryPage güncelleme | Aynı pattern |
| 2.9 | TemplatesRegistryPage güncelleme | Aynı pattern |
| 2.10 | Tüm mevcut DetailPanel'ler | Sheet içine sarma (JobDetailPanel, SourceDetailPanel, vb.) |
| 2.11 | Tests | Keyboard nav testleri, sheet açma/kapama, QuickLook toggle |

**Korunacaklar:** Mevcut DetailPanel iç yapısı (sadece sarma değişir), tüm CRUD işlevleri, filteler, pagination

### FAZ 3: SSE Canlı Güncelleme + Command Palette
**Bağımlılık:** Faz 1 (useSSE hook, uiStore)
**Tahmini Dosya Sayısı:** ~6 yeni + ~5 güncelleme

| Adım | Dosya | Açıklama |
|------|-------|----------|
| 3.1 | `frontend/src/hooks/useJobSSE.ts` | Job-specific SSE: status, step, log events → React Query invalidation |
| 3.2 | `frontend/src/hooks/useGlobalSSE.ts` | Global SSE: tüm job değişiklikleri → dashboard/list refresh |
| 3.3 | JobDetailPage güncelleme | SSE aboneliği, canlı step tracker, log streaming |
| 3.4 | JobsRegistryPage güncelleme | Global SSE → liste otomatik güncelleme |
| 3.5 | `frontend/src/components/design-system/CommandPalette.tsx` | Cmd+K açılan arama/komut paleti |
| 3.6 | `frontend/src/hooks/useCommandPalette.ts` | Global Cmd+K listener, item registry |
| 3.7 | Tests | SSE integration testleri, command palette testleri |

### FAZ 4: Auto-Save + Gelişmiş Form UX
**Bağımlılık:** Faz 1 (toast sistemi)
**Tahmini Dosya Sayısı:** ~3 yeni + ~8 güncelleme

| Adım | Dosya | Açıklama |
|------|-------|----------|
| 4.1 | `frontend/src/hooks/useAutoSave.ts` | Alan tipine göre strateji: toggle→anında, text→blur, textarea→debounce |
| 4.2 | SettingsRegistryPage güncelleme | Auto-save entegrasyonu, inline kaydetme göstergesi |
| 4.3 | StandardVideoCreatePage güncelleme | Auto-save form alanları |
| 4.4 | NewsBulletinCreatePage güncelleme | Auto-save form alanları |
| 4.5 | ARIA improvements | DataTable → role="listbox", rows → role="option" |
| 4.6 | Sidebar collapse toggle | uiStore.sidebarCollapsed, 60px/240px animasyon |
| 4.7 | Tests | Auto-save debounce testleri, ARIA testleri |

### FAZ 5: Backend İyileştirmeler
**Bağımlılık:** Bağımsız (frontend'e paralel yapılabilir)
**Tahmini Dosya Sayısı:** ~10 yeni + ~5 güncelleme

| Adım | Dosya | Açıklama |
|------|-------|----------|
| 5.1 | CacheManager | workspace.py'ye adım-bazlı cache semantiği |
| 5.2 | Cost Tracking | job_steps'e cost_estimate_usd alanı + Alembic migration |
| 5.3 | Categories Tablosu | Yeni tablo + seeder + service + router |
| 5.4 | Hooks Tablosu | Yeni tablo + seeder + tekrar önleme servisi + router |
| 5.5 | Category-Style Mapping | Yeni tablo + service |
| 5.6 | Batch Job Create | Yeni endpoint: POST /api/v1/jobs/batch |
| 5.7 | Global SSE Hub | sse/bus.py'ye global hub ekleme |
| 5.8 | Log Streaming | SSE log event tipi |
| 5.9 | Provider Fallback | resolution.py'ye execute_with_fallback semantiği |
| 5.10 | Tests | Her yeni endpoint ve servis için test |

### FAZ 6: Remotion Composition'lar
**Bağımlılık:** Faz 5 (pipeline executor'lar, cache)
**Tahmini Dosya Sayısı:** ~15 yeni dosya

| Adım | Dosya | Açıklama |
|------|-------|----------|
| 6.1 | types.ts | Paylaşılan tipler: SceneData, SubtitleChunk, WordTiming, VideoSettings |
| 6.2 | useLayout.ts | 16:9 ve 9:16 responsive layout hook |
| 6.3 | Subtitles.tsx | 5 stil + 5 animasyon + karaoke timing |
| 6.4 | VideoEffects.tsx | vignette/warm/cool/cinematic overlay |
| 6.5 | StandardVideo.tsx | Ana composition: sahne + TTS + altyazı + Ken Burns |
| 6.6 | NewsTicker.tsx | Kayan haber şeridi (9 stil) |
| 6.7 | BreakingNewsOverlay.tsx | Son dakika flash badge |
| 6.8 | NewsBulletin.tsx | Haber bülteni composition |
| 6.9 | PriceBadge.tsx + StarRating.tsx + FloatingComments.tsx | Ürün inceleme bileşenleri |
| 6.10 | ProductReview.tsx | Ürün inceleme composition |
| 6.11 | Root.tsx | 3 composition kaydı + calculateMetadata |
| 6.12 | Lokal Media Server | Backend'de render-time HTTP dosya sunucusu |
| 6.13 | Tests | Render smoke testleri |

---

## BÖLÜM 5: ÖNCELİK VE BAĞIMLILIK GRAFİĞİ

```
FAZ 1 (Altyapı) ─────┬──→ FAZ 2 (Sheet/QuickLook) ──→ FAZ 4 (AutoSave/Form)
                      │
                      └──→ FAZ 3 (SSE/CmdK)

FAZ 5 (Backend) ──────────→ FAZ 6 (Remotion)

Paralel çalışabilir: FAZ 1+5, FAZ 2+5, FAZ 3+5
```

### Önerilen Sıra:
1. **FAZ 1 + FAZ 5** paralel başla (frontend altyapı + backend iyileştirmeler)
2. **FAZ 2** (sheet/quicklook — en yüksek UX etkisi)
3. **FAZ 3** (SSE + command palette)
4. **FAZ 4** (auto-save, ARIA, sidebar)
5. **FAZ 6** (Remotion — pipeline executor'lar hazır olunca)

---

## BÖLÜM 6: RİSK ANALİZİ

| Risk | Etki | Azaltma |
|------|------|---------|
| Zustand eklenmesi React Query ile çatışma | Orta | Zustand SADECE client-only state (UI, keyboard, toast). React Query server state'e DOKUNULMAZ |
| Keyboard navigation mevcut testleri bozma | Yüksek | data-testid korunacak, yeni ARIA attributes ekleme (kaldırma değil) |
| Sheet/QuickLook animasyonları inline CSS ile zor | Düşük | CSS keyframes index.css'e, trigger React state ile |
| Dark mode tüm sayfaları etkileme | Orta | Tema toggle opsiyonel, default light kalır, gradual adoption |
| SSE client memory leak | Orta | useEffect cleanup, EventSource.close() |
| Remotion bağımlılık boyutu | Düşük | remotion/ ayrı package, lazy import |

---

## BÖLÜM 7: HER FAZ İÇİN "YAPMA" LİSTESİ

Her fazda şunlar YAPILMAYACAK:
- ❌ ContentManager'dan dosya kopyalama
- ❌ Tailwind CSS ekleme (inline CSS + tokens kalıbı korunacak)
- ❌ Radix UI ekleme (kendi primitiflerimizi yazacağız)
- ❌ React Query'yi Zustand ile değiştirme
- ❌ Mevcut data-testid'leri kaldırma
- ❌ Visibility guard'ları bypass etme
- ❌ Mevcut route yapısını değiştirme
- ❌ Backend API contract'larını değiştirme (yeni endpoint eklenebilir, mevcut değişmez)
- ❌ Alembic dışında schema değişikliği yapma

Her fazda şunlar YAPILACAK:
- ✅ Yeni dosyalar ContentHub mimarisine uygun
- ✅ Inline CSS + tokens.ts stili
- ✅ data-testid koruması
- ✅ TypeScript strict mode uyumu
- ✅ Birim testler
- ✅ Mevcut 2188 testin tamamının geçmesi
- ✅ Her faz sonunda git commit
- ✅ Her faz sonunda test raporu

---

## BÖLÜM 8: DOSYA SAYISI ÖZETİ

| Faz | Yeni Dosya | Güncelleme | Toplam |
|-----|-----------|------------|--------|
| Faz 1 | ~12 | ~3 | ~15 |
| Faz 2 | ~8 | ~15 | ~23 |
| Faz 3 | ~6 | ~5 | ~11 |
| Faz 4 | ~3 | ~8 | ~11 |
| Faz 5 | ~10 | ~5 | ~15 |
| Faz 6 | ~15 | ~2 | ~17 |
| **TOPLAM** | **~54** | **~38** | **~92** |
