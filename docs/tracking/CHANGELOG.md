# DEĞİŞİKLİK GEÇMİŞİ

---

## [2026-04-03] Phase 209 — Repeated Small Local Error Message Readability Pack

**Ne:** Form/panel bileşenlerinde tekrar eden error message/validation literal'larının kapsamlı audit'i.
**Sonuç:** Gerçek error message literal tekrarı yok. StyleBlueprintForm field name'leri TS tip güvenliği nedeniyle dokunulmadı. Dosya değişikliği yapılmadı.
**Eklenen/değiştirilen dosyalar:**
- `docs/testing/test-report-phase-209-repeated-small-local-error-message-readability-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 208 — Repeated Small Date/Timestamp Formatting Constant Pack

**Ne:** Bileşenlerde tekrar eden date/timestamp formatting pattern'larının kapsamlı audit'i.
**Sonuç:** formatDateTime/formatDateISO farklı argümanlarla — extraction okunabilirliği artırmıyor. Dosya değişikliği yapılmadı.
**Eklenen/değiştirilen dosyalar:**
- `docs/testing/test-report-phase-208-repeated-small-date-timestamp-formatting-constant-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 207 — Repeated Small Inline Number Formatting Constant Pack

**Ne:** Bileşenlerde tekrar eden inline number formatting pattern'larının kapsamlı audit'i.
**Sonuç:** ?? 0 ve Number() pattern'ları farklı argümanlarla kullanılıyor — const extraction okunabilirliği artırmıyor. Dosya değişikliği yapılmadı.
**Eklenen/değiştirilen dosyalar:**
- `docs/testing/test-report-phase-207-repeated-small-inline-number-formatting-constant-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 206 — Repeated Small Boolean/Ternary Label Text Constant Pack

**Ne:** Bileşenlerde tekrar eden boolean/ternary label text literal değerlerinin kapsamlı audit'i.
**Sonuç:** Hiçbir dosyada aynı boolean label 3+ kez tekrarlanmıyor. Dosya değişikliği yapılmadı.
**Eklenen/değiştirilen dosyalar:**
- `docs/testing/test-report-phase-206-repeated-small-boolean-ternary-label-text-constant-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 205 — Repeated Small List/Marker/Bullet Text Constant Pack

**Ne:** Bileşenlerde tekrar eden marker/bullet/separator text literal değerlerinin kapsamlı audit'i.
**Sonuç:** "—" max 2× per dosya, diğer marker'lar kullanılmıyor. Threshold karşılanmadı. Dosya değişikliği yapılmadı.
**Eklenen/değiştirilen dosyalar:**
- `docs/testing/test-report-phase-205-repeated-small-list-marker-bullet-text-constant-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 204 — Repeated Small position/zIndex Literal Constant Pack

**Ne:** Bileşenlerde tekrar eden position/zIndex literal değerlerinin kapsamlı audit'i.
**Sonuç:** Bu property'ler codebase'de kullanılmıyor. Dosya değişikliği yapılmadı.
**Eklenen/değiştirilen dosyalar:**
- `docs/testing/test-report-phase-204-repeated-small-position-zindex-literal-constant-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 203 — Repeated Small text-decoration Literal Constant Pack

**Ne:** Bileşenlerde tekrar eden textDecoration literal değerlerinin kapsamlı audit'i.
**Sonuç:** Sadece AppSidebar.tsx'de 1 kullanım var, threshold karşılanmadı. Dosya değişikliği yapılmadı.
**Eklenen/değiştirilen dosyalar:**
- `docs/testing/test-report-phase-203-repeated-small-text-decoration-literal-constant-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 202 — Repeated Small outline/boxShadow Literal Constant Pack

**Ne:** Bileşenlerde tekrar eden outline/boxShadow literal değerlerinin kapsamlı audit'i.
**Sonuç:** Bu property'ler codebase'de kullanılmıyor. Dosya değişikliği yapılmadı.
**Eklenen/değiştirilen dosyalar:**
- `docs/testing/test-report-phase-202-repeated-small-outline-boxshadow-literal-constant-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 201 — Repeated Small Transition/Animation Literal Constant Pack

**Ne:** Bileşenlerde tekrar eden transition/animation/transform literal değerlerinin kapsamlı audit'i.
**Sonuç:** Bu property'ler codebase'de kullanılmıyor. Dosya değişikliği yapılmadı.
**Eklenen/değiştirilen dosyalar:**
- `docs/testing/test-report-phase-201-repeated-small-transition-animation-literal-constant-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 200 — Repeated Small whiteSpace Literal Constant Pack

**Ne:** Bileşenlerde tekrar eden whiteSpace literal değerlerinin kapsamlı audit'i.
**Sonuç:** 80+ dosyada kullanım var ama hiçbirinde aynı değer 3+ kez tekrarlanmıyor. Badge dosyaları kapsam dışı. Dosya değişikliği yapılmadı.
**Eklenen/değiştirilen dosyalar:**
- `docs/testing/test-report-phase-200-repeated-small-whitespace-literal-constant-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 199 — Repeated verticalAlign Literal Constant Pack

**Ne:** Bileşenlerde tekrar eden verticalAlign literal değerlerinin kapsamlı audit'i.
**Sonuç:** Sadece 2 dosyada birer kez kullanım var. Threshold karşılanmadı. Dosya değişikliği yapılmadı.
**Eklenen/değiştirilen dosyalar:**
- `docs/testing/test-report-phase-199-repeated-vertical-align-literal-constant-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 198 — Repeated Small Gap Literal Constant Pack

**Ne:** Bileşenlerde tekrar eden gap literal değerlerinin kapsamlı audit'i.
**Sonuç:** Hiçbir dosyada aynı gap değeri 3+ kez kullanılmıyor. Dosya değişikliği yapılmadı.
**Eklenen/değiştirilen dosyalar:**
- `docs/testing/test-report-phase-198-repeated-small-gap-literal-constant-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 197 — Repeated Opacity Literal Constant Pack

**Ne:** Bileşenlerde tekrar eden opacity literal değerlerinin kapsamlı audit'i.
**Sonuç:** Hiçbir dosyada 3+ opacity kullanımı yok. Dosya değişikliği yapılmadı.
**Eklenen/değiştirilen dosyalar:**
- `docs/testing/test-report-phase-197-repeated-opacity-literal-constant-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 196 — Repeated textTransform/letterSpacing Literal Constant Pack

**Ne:** Bileşenlerde tekrar eden textTransform/letterSpacing literal değerlerinin kapsamlı audit'i.
**Sonuç:** Bu property'ler codebase'de kullanılmıyor. Dosya değişikliği yapılmadı.
**Eklenen/değiştirilen dosyalar:**
- `docs/testing/test-report-phase-196-repeated-text-transform-letter-spacing-literal-constant-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 195 — Repeated Small Border Literal Constant Pack

**Ne:** Bileşenlerde tekrar eden border literal değerlerini dosya-seviyesi const'lara taşıma.
**Eklenen/değiştirilen dosyalar:**
- `TemplateStyleLinkDetailPanel.tsx`: `BORDER = "1px solid #e2e8f0"` eklendi, 3× inline → const
- `TemplateDetailPanel.tsx`: `BORDER = "1px solid #e2e8f0"` eklendi, 3× (PANEL_BOX + 2 inline) → const
- `StandardVideoArtifactsPanel.tsx`: `BORDER = "1px solid #e2e8f0"` eklendi, 3× inline → const
- `docs/testing/test-report-phase-195-repeated-small-border-literal-constant-pack.md` (yeni)
**Atlanılan:** Diğer dosyalar threshold altı
**Test:** 1587 toplam test, tsc temiz, vite build temiz
**Dokunulmayan:** Görünüm, davranış, badge stilleri, backend

---

## [2026-04-03] Phase 194 — Repeated Small Helper Function Name/Const Readability Pack

**Ne:** Son fazlarda çok const eklenen bileşenlerde const/helper sıralama ve yerleşim iyileştirmesi.
**Eklenen/değiştirilen dosyalar:**
- `StandardVideoScriptPanel.tsx`: Primitive const'lar (`RADIUS_XS`, `CURSOR_PTR`, `COLOR_BLUE`) style object const'larından önceye taşındı
- `TemplateForm.tsx`: `REQ_MARK` const'ı `errorStyle`'ın hemen ardına taşındı (her ikisi de `COLOR_ERR` bağımlısı)
- `docs/testing/test-report-phase-194-repeated-small-helper-function-name-const-readability-pack.md` (yeni)
**Test:** 1587 toplam test, tsc temiz, vite build temiz
**Dokunulmayan:** Görünüm, davranış, const isimleri, backend

---

## [2026-04-03] Phase 193 — Repeated Placeholder/Empty-State String Literal Constant Pack

**Ne:** Bileşenlerde tekrar eden placeholder/empty-state string literal değerlerinin kapsamlı audit'i.
**Sonuç:** Her dosyada max 1× — threshold altı. Dosya değişikliği yapılmadı.
**Eklenen/değiştirilen dosyalar:**
- `docs/testing/test-report-phase-193-repeated-placeholder-empty-state-string-literal-constant-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 192 — Repeated Line-Height Literal Constant Pack

**Ne:** Bileşenlerde tekrar eden lineHeight literal değerlerinin kapsamlı audit'i.
**Sonuç:** Hiçbir component dosyasında `lineHeight` style property'si kullanılmıyor. Dosya değişikliği yapılmadı.
**Eklenen/değiştirilen dosyalar:**
- `docs/testing/test-report-phase-192-repeated-line-height-literal-constant-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 191 — Repeated Width/MinWidth Literal Constant Pack

**Ne:** Bileşenlerde tekrar eden width/minWidth/maxWidth literal değerlerinin kapsamlı audit'i.
**Sonuç:** Her dosyada max 2× — threshold altı. Dosya değişikliği yapılmadı.
**Eklenen/değiştirilen dosyalar:**
- `docs/testing/test-report-phase-191-repeated-width-minwidth-literal-constant-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 190 — Repeated Display/Layout Literal Constant Pack

**Ne:** Bileşenlerde tekrar eden display/layout literal'larının kapsamlı audit'i.
**Sonuç:** Anlamlı extraction fırsatı bulunamadı. `"flex"` string'i farklı composite nesnelerde, composite tekrarlar threshold altında. Dosya değişikliği yapılmadı.
**Eklenen/değiştirilen dosyalar:**
- `docs/testing/test-report-phase-190-repeated-display-layout-literal-constant-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 189 — Repeated Small Background Literal Constant Pack

**Ne:** Bileşenlerde tekrar eden background literal değerlerinin kapsamlı audit'i.
**Sonuç:** Her dosyada max 2× — threshold altı. Dosya değişikliği yapılmadı.
**Eklenen/değiştirilen dosyalar:**
- `docs/testing/test-report-phase-189-repeated-small-background-literal-constant-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 188 — Repeated Small Color Literal Constant Pack

**Ne:** Badge surface'leri hariç, bileşenlerde tekrar eden renk hex literal değerlerini dosya-seviyesi const'lara taşıma.
**Eklenen/değiştirilen dosyalar:**
- `COLOR_DARK = "#1e293b"`: TemplateStyleLinkDetailPanel, StyleBlueprintDetailPanel, TemplateDetailPanel, SourceScanDetailPanel, SourceDetailPanel (5 dosya)
- `COLOR_ERR = "#dc2626"`: StyleBlueprintForm, TemplateForm, UsedNewsForm, NewsItemForm, TemplateStyleLinkForm, StandardVideoForm, StandardVideoMetadataForm, StandardVideoScriptForm, SourceScanForm, SourceScanDetailPanel (10 dosya)
- `COLOR_FAINT = "#94a3b8"`: SourceDetailPanel (1 dosya)
- `COLOR_BLUE = "#3b82f6"`: StandardVideoScriptPanel (1 dosya)
- `docs/testing/test-report-phase-188-repeated-small-color-literal-constant-pack.md` (yeni)
**Atlanılan:** Badge surface'leri, threshold altındaki dosyalar, global color token sistemi
**Test:** 1587 toplam test, tsc temiz, vite build temiz
**Dokunulmayan:** Görünüm, davranış, badge stilleri, backend

---

## [2026-04-03] Phase 187 — Repeated Small Margin/Padding Literal Constant Pack

**Ne:** Bileşenlerde tekrar eden margin/padding literal değerlerini dosya-seviyesi const'lara taşıma.
**Eklenen/değiştirilen dosyalar:**
- `StandardVideoMetadataPanel.tsx`: `PAD_B_SM = "0.375rem"` eklendi, 10× inline → const (LABEL_TD + 9 td)
- `StandardVideoScriptPanel.tsx`: `PAD_B_XS = "0.25rem"` eklendi, 5× inline → const (LABEL_TD + 4 td)
- `TemplateStyleLinksTable.tsx`: `TD_PAD = "0.5rem 0.75rem"` eklendi, 7× inline → const (TH_CELL + 6 td)
- `docs/testing/test-report-phase-187-repeated-small-margin-padding-literal-constant-pack.md` (yeni)
**Atlanılan:** TD_STYLE zaten olan tablo dosyaları; diğerleri threshold altı
**Test:** 1587 toplam test, tsc temiz, vite build temiz
**Dokunulmayan:** Görünüm, davranış, badge stilleri, backend

---

## [2026-04-03] Phase 186 — Repeated Small Overflow/Wrap Style Constant Pack

**Ne:** Bileşenlerde tekrar eden `{ wordBreak: "break-word", overflowWrap: "anywhere" }` inline style object'lerini dosya-seviyesi const'lara taşıma.
**Eklenen/değiştirilen dosyalar:**
- `NewsBulletinMetadataPanel.tsx`: `WRAP_WORD` const eklendi, 3× inline td style → const
- `text-overflow-safety.smoke.test.tsx`: `NewsBulletinMetadataPanel title td` testi güncellendi (`WRAP_WORD` const referansını da kabul eder)
- `docs/testing/test-report-phase-186-repeated-small-overflow-wrap-style-constant-pack.md` (yeni)
**Atlanılan:** Diğer dosyalar — threshold altı
**Test:** 1587 toplam test, tsc temiz, vite build temiz
**Dokunulmayan:** Görünüm, davranış, badge stilleri, backend

---

## [2026-04-03] Phase 185 — Repeated Small Cursor/Pointer Style Constant Pack

**Ne:** Bileşenlerde tekrar eden `cursor: "pointer"` literal'larını dosya-seviyesi const'lara taşıma.
**Eklenen/değiştirilen dosyalar:**
- `StandardVideoScriptPanel.tsx`: `CURSOR_PTR = "pointer"` eklendi, 3× inline → const
- `docs/testing/test-report-phase-185-repeated-small-cursor-pointer-style-constant-pack.md` (yeni)
**Atlanılan:** Form dosyaları (2× ternary içinde, threshold altı), MetadataPanel (2× threshold altı)
**Test:** 1587 toplam test, tsc temiz, vite build temiz
**Dokunulmayan:** Görünüm, davranış, badge stilleri, backend

---

## [2026-04-03] Phase 184 — Repeated Small Text Align Literal Constant Pack

**Ne:** Tüm bileşenlerde tekrar eden `textAlign` literal'larının kapsamlı audit'i.
**Sonuç:** Her dosyada max 1× — threshold altı. Dosya değişikliği yapılmadı.
**Eklenen/değiştirilen dosyalar:**
- `docs/testing/test-report-phase-184-repeated-small-text-align-literal-constant-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 183 — Repeated Small Font Weight Constant Pack

**Ne:** Bileşenlerde tekrar eden `fontWeight` literal içeren th style object'lerini dosya-seviyesi const'lara taşıma.
**Eklenen/değiştirilen dosyalar:**
- `TemplateStyleLinksTable.tsx`: `TH_CELL` eklendi, 6× th inline → const
- `NewsBulletinSelectedItemsPanel.tsx`: `TH_CELL` eklendi, 5× th inline → const
- `docs/testing/test-report-phase-183-repeated-small-font-weight-constant-pack.md` (yeni)
**Atlanılan:** ArtifactsPanel/MetadataPanel (farklı nesnelerde, threshold altı), diğerleri max 2×
**Test:** 1587 toplam test, tsc temiz, vite build temiz
**Dokunulmayan:** Görünüm, davranış, badge stilleri, backend

---

## [2026-04-03] Phase 182 — Repeated Small Font Size Literal Constant Pack

**Ne:** Bileşenlerde tekrar eden `fontSize` literal'larını dosya-seviyesi const'lara taşıma.
**Eklenen/değiştirilen dosyalar:**
- `StandardVideoArtifactsPanel.tsx`: `FONT_SM = "0.875rem"` eklendi, 8× inline → const
- `SourceScanDetailPanel.tsx`: `FONT_SM = "0.875rem"` eklendi, 3× inline → const
- `SourceDetailPanel.tsx`: `FONT_SM = "0.875rem"` eklendi, 3× inline → const
- `docs/testing/test-report-phase-182-repeated-small-font-size-literal-constant-pack.md` (yeni)
**Atlanılan:** Form dosyaları (const tanımlarda — inline değil), diğerleri max 2× threshold altı
**Test:** 1587 toplam test, tsc temiz, vite build temiz
**Dokunulmayan:** Görünüm, davranış, badge stilleri, backend

---

## [2026-04-03] Phase 181 — Repeated Small Border Radius Constant Pack

**Ne:** Bileşenlerde tekrar eden `borderRadius` literal'larını dosya-seviyesi const'lara taşıma.
**Eklenen/değiştirilen dosyalar:**
- `StandardVideoScriptPanel.tsx`: `RADIUS_XS = "4px"` eklendi, 3× inline → const
- `TemplateStyleLinkDetailPanel.tsx`: `RADIUS_SM = "6px"` eklendi, 3× inline → const
- `docs/testing/test-report-phase-181-repeated-small-border-radius-constant-pack.md` (yeni)
**Atlanılan:** TemplateDetailPanel (2× inline), MetadataPanel (2× inline), form dosyaları (const tanımlarda — inline değil)
**Test:** 1587 toplam test, tsc temiz, vite build temiz
**Dokunulmayan:** Görünüm, davranış, badge stilleri, backend

---

## [2026-04-03] Phase 180 — Repeated Small Loading/Busy Text Constant Pack

**Ne:** Tüm bileşenlerde tekrar eden loading/busy text literal ("Yükleniyor...", "Kaydediliyor...") kapsamlı audit'i.
**Sonuç:** Aynı dosya içinde threshold 3+ sağlayan yeni dosya bulunamadı. StandardVideoArtifactsPanel 2× "Yükleniyor..." (threshold altı). Form dosyalarında 1× "Kaydediliyor..." per dosya. Dosya değişikliği yapılmadı.
**Eklenen/değiştirilen dosyalar:**
- `docs/testing/test-report-phase-180-repeated-small-loading-busy-text-constant-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 179 — Repeated Small Status Text Constant Pack

**Ne:** Tüm bileşenlerde tekrar eden status/info text literal ve style bloklarının kapsamlı audit'i.
**Sonuç:** Aynı dosya içinde threshold 3+ sağlayan yeni dosya bulunamadı. StandardVideoArtifactsPanel 2× "Yükleniyor..." (threshold altı). Form dosyalarında 1× "Kaydediliyor..." per dosya. Dosya değişikliği yapılmadı.
**Eklenen/değiştirilen dosyalar:**
- `docs/testing/test-report-phase-179-repeated-small-status-text-constant-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 178 — Repeated Small Monospace/Code Style Constant Pack

**Ne:** Tüm panel/detail/preview bileşenlerinde tekrar eden monospace/code-like inline style bloklarının kapsamlı audit'i.
**Sonuç:** Aynı dosya içinde threshold 3+ sağlayan yeni dosya bulunamadı. TemplateForm ve StyleBlueprintForm zaten JSON_TEXTAREA const'a sahip. TemplateStyleLinksTable 2× aynı stil (threshold altı). Dosya değişikliği yapılmadı.
**Eklenen/değiştirilen dosyalar:**
- `docs/testing/test-report-phase-178-repeated-small-monospace-code-style-constant-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 177 — Repeated Small Panel Meta Text Constant Pack

**Ne:** Tüm detail/overview/panel bileşenlerinde tekrar eden muted/meta text inline style bloklarının kapsamlı audit'i.
**Sonuç:** Aynı dosya içinde threshold 3+ sağlayan yeni dosya bulunamadı. SettingDetailPanel ve VisibilityRuleDetailPanel zaten MUTED const'a sahip. Kalan dosyalarda max 2× inline. Dosya değişikliği yapılmadı.
**Eklenen/değiştirilen dosyalar:**
- `docs/testing/test-report-phase-177-repeated-small-panel-meta-text-constant-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 176 — Repeated Small Form Help Text Style Constant Pack

**Ne:** Tüm form ve panel bileşenlerinde tekrar eden help text / muted text inline style bloklarının kapsamlı audit'i.
**Sonuç:** Aynı dosya içinde threshold 3+ sağlayan yeni dosya bulunamadı. Max 2× per dosya (validation hint, submitError, label helper, muted span). Dosya değişikliği yapılmadı.
**Eklenen/değiştirilen dosyalar:**
- `docs/testing/test-report-phase-176-repeated-small-form-help-text-style-constant-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 175 — Repeated Small Panel Divider Constant Pack

**Ne:** Tüm panel ve form bileşenlerinde tekrar eden divider/separator inline style bloklarının kapsamlı audit'i.
**Sonuç:** Aynı dosya içinde threshold 3+ sağlayan yeni dosya bulunamadı. borderTop ve borderBottom pattern'leri her dosyada en fazla 1× inline olarak görülüyor. Dosya değişikliği yapılmadı.
**Eklenen/değiştirilen dosyalar:**
- `docs/testing/test-report-phase-175-repeated-small-panel-divider-constant-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 174 — Repeated Required Mark Constant Pack

**Ne:** Tüm form bileşenlerinde tekrar eden required-mark span style bloklarının kapsamlı audit'i.
**Sonuç:** Threshold 3+ sağlayan yeni dosya bulunamadı. TemplateForm ve UsedNewsForm Phase 173'te zaten extraction yapılmıştı. Kalan dosyalarda max 2× inline span (threshold altı). Dosya değişikliği yapılmadı.
**Eklenen/değiştirilen dosyalar:**
- `docs/testing/test-report-phase-174-repeated-required-mark-constant-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 173 — Repeated Form Label Style Constant Pack

**Ne:** Form bileşenlerindeki tekrar eden required-field span style bloklarını dosya-seviyesi const'lara taşıma.
**Eklenen/değiştirilen dosyalar:**
- `TemplateForm.tsx`: `REQ_MARK` eklendi, 3× `style={{ color: "#dc2626" }}` → `style={REQ_MARK}`
- `UsedNewsForm.tsx`: `REQ_MARK` eklendi, 3× → `style={REQ_MARK}`
- `docs/testing/test-report-phase-173-repeated-form-label-style-constant-pack.md` (yeni)
**Atlanılan:** `StandardVideoForm.tsx` — 1× span + 2× farklı style nesnesi, threshold altı
**Test:** 1587 toplam test, tsc temiz, vite build temiz
**Dokunulmayan:** Görünüm, davranış, badge stilleri, backend

---

## [2026-04-03] Phase 172 — Repeated Input/Textarea Style Constant Pack

**Ne:** Form bileşenlerindeki tekrar eden textarea/input style bloklarını dosya-seviyesi const'lara taşıma.
**Eklenen/değiştirilen dosyalar:**
- `TemplateForm.tsx`: `JSON_TEXTAREA` eklendi, 3× multiline → 1-line spread
- `StyleBlueprintForm.tsx`: `JSON_TEXTAREA` eklendi, map textarea → spread
- `SourceScanForm.tsx`: `TEXTAREA` eklendi, 2× inline → const
- `docs/testing/test-report-phase-172-repeated-input-textarea-style-constant-pack.md` (yeni)
**Test:** 1587 toplam test, tsc temiz, vite build temiz
**Dokunulmayan:** Görünüm, davranış, badge stilleri, backend

---

## [2026-04-03] Phase 171 — Repeated Simple Layout Constant Pack

**Ne:** NewsBulletin form bileşenlerindeki tekrar eden field layout style bloklarını dosya-seviyesi const'lara taşıma.
**Eklenen/değiştirilen dosyalar:**
- `NewsBulletinForm.tsx`: `const FIELD` eklendi, 10× inline → const
- `NewsBulletinMetadataForm.tsx`: `const FIELD` eklendi, 8× inline → const
- `NewsBulletinScriptForm.tsx`: `const FIELD` eklendi, 3× + 1 spread
- `NewsBulletinSelectedItemForm.tsx`: `const FIELD` eklendi, 2× + 1 spread
- `docs/testing/test-report-phase-171-repeated-simple-layout-constant-pack.md` (yeni)
**Test:** 1587 toplam test, tsc temiz, vite build temiz
**Dokunulmayan:** Görünüm, davranış, badge stilleri, backend

---

## [2026-04-03] Phase 170 — Repeated Action Row Style Constant Pack

**Ne:** Form bileşenlerindeki tekrar eden flex container / action row style bloklarını dosya-seviyesi const'lara taşıma.
**Eklenen/değiştirilen dosyalar:**
- `StandardVideoMetadataForm.tsx`: `PAIR_ROW` (2×) + `FLEX_1` (4×) extraction
- `StandardVideoScriptForm.tsx`: `PAIR_ROW` (1×) + `FLEX_1` (2×) extraction (MetadataForm ile tutarlılık)
- `docs/testing/test-report-phase-170-repeated-action-row-style-constant-pack.md` (yeni)
**Test:** 1587 toplam test, tsc temiz, vite build temiz
**Dokunulmayan:** Görünüm, davranış, badge stilleri, backend

---

## [2026-04-03] Phase 169 — Repeated Form Section Heading Constant Pack

**Ne:** Form ve panel bileşenlerindeki tekrar eden section heading metin ve style bloklarının audit'i.
**Sonuç:** Threshold 3+ sağlanamadı. NewsBulletin panel h4'leri 2×, detail panel h3'leri 1× per dosya. Dosya değişikliği yapılmadı.
**Eklenen/değiştirilen dosyalar:**
- `docs/testing/test-report-phase-169-repeated-form-section-heading-constant-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz, vite build temiz
**Dokunulmayan:** Tüm bileşen dosyaları

---

## [2026-04-03] Phase 168 — Repeated Action Button Text Constant Pack

**Ne:** Form ve panel bileşenlerindeki tekrar eden action button text literal'ları kapsamlı audit ile tarandı.
**Sonuç:** Threshold 3+ sağlanamadı. Tüm dosyalarda max 2 tekrar. Dosya değişikliği yapılmadı.
**Eklenen/değiştirilen dosyalar:**
- `docs/testing/test-report-phase-168-repeated-action-button-text-constant-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz, vite build temiz
**Dokunulmayan:** Tüm bileşen dosyaları — hiçbiri değiştirilmedi

---

## [2026-04-03] Phase 167 — Repeated Form Button Style Constant Pack

**Ne:** Form bileşenlerindeki save/cancel button inline style bloklarını dosya-seviyesi BTN_PRIMARY + BTN_CANCEL const'larına taşıma. İki pattern grubu: küçük (0.375rem) ve büyük (0.5rem) butonlar.
**Eklenen/değiştirilen dosyalar:**
- `NewsItemForm.tsx`, `UsedNewsForm.tsx`, `TemplateStyleLinkForm.tsx`: BTN_PRIMARY + BTN_CANCEL (Pattern A)
- `TemplateForm.tsx`, `SourceScanForm.tsx`, `StyleBlueprintForm.tsx`: BTN_PRIMARY + BTN_CANCEL (Pattern A, BORDER_COLOR entegreli)
- `StandardVideoForm.tsx`, `StandardVideoMetadataForm.tsx`, `StandardVideoScriptForm.tsx`: BTN_PRIMARY + BTN_CANCEL (Pattern B)
- `docs/testing/test-report-phase-167-repeated-form-button-style-constant-pack.md` (yeni)
**Test:** 1587 toplam test, tsc temiz, vite build temiz
**Dokunulmayan:** Görünüm, davranış, SourceForm (farklı palette), NewsBulletin form'ları (style yok)

---

## [2026-04-03] Phase 166 — Repeated Neutral Color Literal Constant Pack

**Ne:** Form ve panel bileşenlerinde 4+ tekrarlı bare color literal'lerini dosya-seviyesi const'lara taşıma. `BORDER_COLOR` (#e2e8f0) ve `MUTED_TEXT` (#64748b) eklendi.
**Eklenen/değiştirilen dosyalar:**
- `TemplateForm.tsx`: `const BORDER_COLOR` eklendi, 7 → const referansı
- `SourceScanForm.tsx`: `const BORDER_COLOR` eklendi, 5 → const referansı
- `StyleBlueprintForm.tsx`: `const BORDER_COLOR` eklendi, 5 → const referansı
- `NewsBulletinSelectedItemsPanel.tsx`: `const MUTED_TEXT` eklendi, 6 → const referansı
- `docs/testing/test-report-phase-166-repeated-neutral-color-literal-constant-pack.md` (yeni)
**Test:** 1587 toplam test, tsc temiz, vite build temiz
**Dokunulmayan:** Görünüm, davranış, badge stilleri, backend

---

## [2026-04-03] Phase 165 — Repeated Empty/Fallback String Constant Pack

**Ne:** Bileşenlerde 3+ kez tekrar eden fallback string literal'lerini const ile extraction. Kapsamlı audit yapıldı; tek gerçek extraction fırsatı NewsBulletinForm.tsx'de bulundu.
**Eklenen/değiştirilen dosyalar:**
- `NewsBulletinForm.tsx`: `const DASH = "—"` eklendi, 4 JSX `—` text → `{DASH}`
- `docs/testing/test-report-phase-165-repeated-empty-fallback-string-constant-pack.md` (yeni)
**Test:** 1587 toplam test, tsc temiz, vite build temiz
**Dokunulmayan:** Badge type string'leri, STYLES key'leri, 2-tekrarlı dosyalar (threshold altı)

---

## [2026-04-03] Phase 164 — Repeated Heading/Text Style Constant Pack

**Ne:** Panel bileşenlerindeki tekrar eden heading ve muted text style nesnelerini dosya-seviyesi const'lara taşıma. FORM_HEADING (h4 create/edit başlıkları) ve MUTED (em dash fallback'leri).
**Eklenen/değiştirilen dosyalar:**
- `StandardVideoMetadataPanel.tsx`: FORM_HEADING, 2 h4
- `StandardVideoScriptPanel.tsx`: FORM_HEADING, 2 h4
- `VisibilityRuleDetailPanel.tsx`: MUTED, 4 em
- `SettingDetailPanel.tsx`: MUTED, 2 em
- `docs/testing/test-report-phase-164-repeated-heading-text-style-constant-pack.md` (yeni)
**Test:** 1587 toplam test, tsc temiz, vite build temiz
**Dokunulmayan:** Görünüm, davranış, badge stilleri, backend

---

## [2026-04-03] Phase 163 — Repeated Section/Container Style Constant Pack

**Ne:** Panel/metadata/script bileşenlerindeki tekrar eden section wrapper ve container style nesnelerini dosya-seviyesi const'lara taşıma. Component içi `sectionStyle`'lar dosya-seviyesine çıkarıldı.
**Eklenen/değiştirilen dosyalar:**
- NewsBulletinMetadataPanel.tsx, NewsBulletinScriptPanel.tsx: SECTION_STYLE (marginTop variant)
- StandardVideoMetadataPanel.tsx, StandardVideoScriptPanel.tsx: SECTION_STYLE (marginBottom variant)
- SourceDetailPanel.tsx, SourceScanDetailPanel.tsx, TemplateDetailPanel.tsx, StyleBlueprintDetailPanel.tsx: PANEL_BOX + SECTION_DIVIDER
- `docs/testing/test-report-phase-163-repeated-section-container-style-constant-pack.md` (yeni)
**Test:** 1587 toplam test, tsc temiz, vite build temiz
**Dokunulmayan:** Görünüm, davranış, badge stilleri, backend

---

## [2026-04-03] Phase 162 — Repeated Table Cell Style Constant Pack

**Ne:** Registry tablo bileşenlerindeki tekrar eden `th`/`td` inline style nesnelerini dosya başı `TH_STYLE`/`TD_STYLE` const ile extraction.
**Eklenen/değiştirilen dosyalar:**
- 12 tablo bileşeni: TH_STYLE/TD_STYLE const eklendi, inline style nesneleri kaldırıldı
  - SourcesTable, SourceScansTable, NewsItemsTable, NewsBulletinsTable, UsedNewsTable, JobsTable, TemplatesTable, StyleBlueprintsTable, StandardVideosTable, SettingsTable, VisibilityRulesTable, NewsItemPickerTable
- `docs/testing/test-report-phase-162-repeated-table-cell-style-constant-pack.md` (yeni)
**Test:** 1587 toplam test, tsc temiz, vite build temiz
**Dokunulmayan:** Görünüm, davranış, badge stilleri, ek style property'li TD'ler, backend

---

## [2026-04-03] Phase 161 — Repeated Panel Label Style Constant Pack

**Ne:** Aynı dosya içinde tekrar eden inline label style nesnelerini dosya başı `const` ile extraction. 6 dosyada LABEL_TD, LABEL_TD_TOP, LABEL_SPAN pattern'leri.
**Eklenen/değiştirilen dosyalar:**
- `NewsBulletinMetadataPanel.tsx`: `LABEL_TD` const, 9 td satırı sadeleşti
- `StandardVideoMetadataPanel.tsx`: `LABEL_TD` + `LABEL_TD_TOP` const, 8 td satırı sadeleşti
- `NewsBulletinScriptPanel.tsx`: `LABEL_TD` const, 4 td satırı sadeleşti
- `StandardVideoScriptPanel.tsx`: `LABEL_TD` const, 4 td satırı sadeleşti
- `SourceDetailPanel.tsx`: `LABEL_SPAN` const, 2 span sadeleşti
- `SourceScanDetailPanel.tsx`: `LABEL_SPAN` const, 1 span sadeleşti
- `docs/testing/test-report-phase-161-repeated-panel-label-style-constant-pack.md` (yeni)
**Test:** 1587 toplam test, tsc temiz, vite build temiz
**Dokunulmayan:** Görünüm, davranış, badge stilleri, backend, business logic, yeni feature

---

## [2026-04-03] Phase 160 — Field/Row Label-Value Rendering Consistency Pack

**Ne:** Detail panel bileşenlerinde Row ve Field label-value görsel dilinin hizalanması. 3 Row value span'e `overflowWrap: "anywhere"` eklendi (JobDetailPanel, JobOverviewPanel, VisibilityRuleDetailPanel). 2 Field label span'e `color: "#64748b"` + `fontSize: "0.8125rem"` eklendi (NewsBulletinDetailPanel, UsedNewsDetailPanel).
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/jobs/JobDetailPanel.tsx`: Row value overflowWrap
- `frontend/src/components/jobs/JobOverviewPanel.tsx`: Row value overflowWrap
- `frontend/src/components/visibility/VisibilityRuleDetailPanel.tsx`: Row value overflowWrap
- `frontend/src/components/news-bulletin/NewsBulletinDetailPanel.tsx`: Field label color+fontSize
- `frontend/src/components/used-news/UsedNewsDetailPanel.tsx`: Field label color+fontSize
- `docs/testing/test-report-phase-160-field-row-label-value-rendering-consistency-pack.md` (yeni)
**Test:** 1587 toplam test, tsc temiz, vite build temiz
**Dokunulmayan:** Badge stilleri, form bileşenleri, business logic, backend, mevcut ham sütunlar

---

## [2026-04-03] Phase 159 — Helper Return-Type Consistency & Call-Site Safety Pack

**Ne:** Helper dönüş tipleri ile call-site beklentileri arasındaki tutarsızlıkları giderme. `formatDateTime` default fallback `null` → `"—"`, dönüş tipi `string | null` → `string`.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/lib/formatDate.ts`: formatDateTime imza değişikliği
- `frontend/src/tests/date-formatting-safety.smoke.test.tsx`: 1 assertion güncelleme
- `docs/testing/test-report-phase-159-helper-return-type-consistency-call-site-safety-pack.md` (yeni)
**Test:** 1587 toplam test, tsc temiz, vite build temiz
**Dokunulmayan:** formatDateISO ReactNode dönüş tipi korundu, formatDuration parametrize edilmedi, helper mimarisi yeniden yazılmadı, badge stilleri, backend

---

## [2026-04-03] Phase 158 — Repeated Date Fallback Constant & Readability Pack

**Ne:** Date render yüzeylerinde kalan inline `"—"` fallback'lerini DASH const'a dönüştürme. Phase 157'de kaçan content ternary `"—"` kalıntılarını temizleme.
**Eklenen/değiştirilen dosyalar:**
- `StandardVideoOverviewPanel.tsx`: `const DASH` eklendi, 3 inline `"—"` → `DASH`
- `StandardVideosTable.tsx`: formatDateTime fallback `"—"` → `DASH`
- `NewsBulletinScriptPanel.tsx`: content ternary `"—"` → `DASH`
- `StandardVideoScriptPanel.tsx`: content ternary `"—"` → `DASH`
- `docs/testing/test-report-phase-158-repeated-date-fallback-constant-readability-pack.md` (yeni)
**Test:** 1587 toplam test, tsc temiz, vite build temiz
**Dokunulmayan:** Date helper mimarisi, locale, relative time, 2 tekrarlı dosyalar, badge stilleri, backend

---

## [2026-04-03] Phase 157 — Duplicate Inline Fallback Pattern Reduction Pack

**Ne:** Bileşen içinde 3+ kez tekrar eden `?? "—"` inline fallback pattern'lerini `const DASH = "—"` local const extraction ile sadeleştirme. 13 dosyada toplam 62 inline string → const referansına dönüşüm.
**Eklenen/değiştirilen dosyalar:**
- 13 bileşen: `const DASH = "—"` extraction + inline `"—"` → `DASH` (8 tablo, 3 panel, 2 script panel)
- `frontend/src/tests/clipboard-text-hygiene.smoke.test.tsx`: 11 assertion güncelleme (DASH pattern kabul)
- `docs/testing/test-report-phase-157-duplicate-inline-fallback-pattern-reduction-pack.md` (yeni)
**Test:** 1587 toplam test, tsc temiz, vite build temiz
**Dokunulmayan:** Form `?? ""` pattern'leri (standard React), 1-2 tekrarlı dosyalar, badge stilleri, backend, business logic

---

## [2026-04-03] Phase 156 — Shared Fallback Helper Consolidation Pack

**Ne:** Inline güvenlik pattern'lerinin shared helper'lara konsolidasyonu. 5 summary bileşende inline `typeof raw === "number" && !isNaN(raw) && isFinite(raw)` pattern'i `safeNumber()` ile değiştirildi. 2 tablo bileşende version interpolation `safeNumber()` ile konsolide edildi. 1 summary bileşende lokal `safeCount()` fonksiyonu kaldırılıp `safeNumber()` ile değiştirildi. 1 timeline panelde inline date slice `formatDateISO()` ile değiştirildi.
**Eklenen/değiştirilen dosyalar:**
- 5 summary bileşen: `safeNumber()` konsolidasyonu (TemplateReadiness, SourceReadiness, NewsBulletinReadiness, NewsBulletinSourceCoverage, NewsItemReadiness)
- 1 summary bileşen: lokal `safeCount` → `safeNumber()` (NewsBulletinSelectedNewsQuality)
- 2 tablo bileşen: version `safeNumber()` konsolidasyonu (TemplatesTable, StyleBlueprintsTable)
- 1 panel: `formatDateISO()` konsolidasyonu (JobTimelinePanel)
- 2 test dosyası güncelleme: safeNumber pattern kabul (numeric-display-safety, required-field-safety)
**Test:** 1587 toplam test, tsc temiz, vite build temiz
**Dokunulmayan:** Conditional validity check pattern'leri (SourceScanExecutionSummary inline korundu), yeni test eklenmedi, badge stilleri korundu

---

## [2026-04-03] Phase 155 — String Normalization & Whitespace Safety Pack

**Ne:** String/whitespace render yüzeylerinde blank-aware fallback koruması. Shared `isBlank()` helper oluşturuldu. 4 detail panel Field, 1 overview Row, 1 UrlField, 7 conditional notes render, 3 script content display whitespace-safe hale getirildi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/lib/isBlank.ts` (yeni — shared whitespace-aware blank check helper)
- `frontend/src/tests/string-normalization-whitespace-safety.smoke.test.tsx` (yeni — 27 structural guard test)
- 10 bileşen: isBlank guard eklendi
- 2 mevcut test: isBlank pattern kabul güncellendi
**Test:** 1587 toplam test (+27 yeni), tsc temiz, vite build temiz
**Dokunulmayan:** Typography/padding redesign yok, agresif trim yok, backend yok, business logic yok

---

## [2026-04-03] Phase 154 — Boolean / Toggle / Flag Render Safety Pack

**Ne:** Boolean/toggle/flag render yüzeylerinde null/undefined tristate koruması. BoolBadge bileşenine `value == null` guard eklendi, 10+ mevcut boolean yüzey doğrulandı (zaten güvenli), 25 structural guard test yazıldı.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/tests/boolean-toggle-flag-render-safety.smoke.test.tsx` (yeni — 25 structural guard test)
- `SettingDetailPanel.tsx`: BoolBadge null/undefined tristate guard
- `VisibilityRuleDetailPanel.tsx`: BoolBadge null/undefined tristate guard
**Test:** 1560 toplam test (+25 yeni), tsc temiz, vite build temiz
**Dokunulmayan:** Toggle UX redesign yok, badge stil değişikliği yok, label yeniden yazımı yok, backend yok, business logic yok

---

## [2026-04-03] Phase 153 — Array / List Render Safety Pack

**Ne:** Array/list render yüzeylerinde `.map()`, `.length`, `.join()` crash risklerine karşı `Array.isArray` guard eklendi. 2 step-list bileşeni düzeltildi, 5 mevcut JSON.parse null guard doğrulandı, 15 structural guard test yazıldı.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/tests/array-list-render-safety.smoke.test.tsx` (yeni — 15 structural guard test)
- `JobTimelinePanel.tsx`: `Array.isArray` guard + `safeSteps` pattern
- `JobStepsList.tsx`: `Array.isArray` guard + `safeSteps` pattern
**Test:** 1535 toplam test (+15 yeni), tsc temiz, vite build temiz
**Dokunulmayan:** List UX redesign yok, chips/tags yok, sorting/reordering yok, backend yok, business logic yok

---

## [2026-04-03] Phase 152 — Numeric / Count / Ratio Display Safety Pack

**Ne:** Sayısal alanlarda NaN/Infinity/undefined sızıntı koruması. Summary count display'lerde, table version interpolation'larda, detail panel Number() dönüşümlerinde ve form validation'larda isFinite/isNaN guard eklendi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/lib/safeNumber.ts` (yeni — shared numeric safety helper)
- `frontend/src/tests/numeric-display-safety.smoke.test.tsx` (yeni — 33 structural guard test)
- 7 summary bileşeni: count/ratio display guard
- 2 tablo: version interpolation guard
- 5 detail panel: Number() NaN/Infinity guard
- 6 form: isFinite validation eklendi
- `required-field-safety.smoke.test.tsx` (version test pattern güncellendi)
**Test:** 1520 toplam test (+33 yeni), tsc temiz, vite build temiz
**Dokunulmayan:** Score/analytics mantığı yok, badge stili yok, backend yok, business logic yok

---

## [2026-04-03] Phase 151 — Badge Enum / Status Unknown-Value Safety Pack

**Ne:** Badge bileşenlerinde bilinmeyen enum/status değerleri için iki katmanlı koruma: (1) style map lookup'larda neutral fallback (`?? { bg: "#f8fafc", ... }`), (2) label text render'larda null fallback (`{level ?? "—"}`, `{status ?? "—"}`).
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/tests/badge-unknown-value-safety.smoke.test.tsx` (yeni — 236 structural guard test)
- 76 badge bileşeni: label text null fallback (70 level + 6 status)
- 62 badge bileşeni: style lookup neutral fallback (14'ü zaten named-key fallback kullanıyordu)
**Test:** 1487 toplam test (+236 yeni), tsc temiz, vite build temiz
**Dokunulmayan:** Badge renk/stil değerleri değiştirilmedi, enum type tanımları değiştirilmedi, backend yok, business logic yok

---

## [2026-04-03] Phase 150 — Required Field Assumption Safety Pack

**Ne:** Required kabul edilen text/enum/id alanlarında null fallback koruması. 9 registry tablo ve 2 detail panelde toplam 30 property render'a `?? "—"` veya `?? 0` fallback eklendi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/tests/required-field-safety.smoke.test.tsx` (yeni — 42 structural guard test)
- `SettingsTable.tsx` (5 fallback), `VisibilityRulesTable.tsx` (4), `SourcesTable.tsx` (3), `StandardVideosTable.tsx` (2), `TemplatesTable.tsx` (5), `StyleBlueprintsTable.tsx` (3), `NewsBulletinsTable.tsx` (2), `NewsItemPickerTable.tsx` (2), `TemplateStyleLinksTable.tsx` (1)
- `SettingDetailPanel.tsx` (5 fallback), `VisibilityRuleDetailPanel.tsx` (4)
**Test:** 1251 toplam test (+42 yeni), tsc temiz, vite build temiz
**Dokunulmayan:** Backend schema yok, validation yok, badge stilleri korundu, business logic değişiklik yok

---

## [2026-04-03] Phase 149 — Clipboard / Copy Surface Safety & Text Export Hygiene Pack

**Ne:** Kopyalanabilir text yüzeylerinde null/undefined sızıntı koruması. Script, metadata, artifacts panellerinde 13 property'ye `?? "—"` fallback eklendi. Content block'larda null-safe length check. overflowWrap eklendi. safeJsonPretty whitespace-only string guard eklendi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/tests/clipboard-text-hygiene.smoke.test.tsx` (yeni — 25 structural guard test)
- `StandardVideoScriptPanel.tsx` (3 null fallback, content null-safe, overflowWrap)
- `NewsBulletinScriptPanel.tsx` (2 null fallback, content null-safe, overflowWrap)
- `StandardVideoMetadataPanel.tsx` (4 null fallback)
- `NewsBulletinMetadataPanel.tsx` (2 null fallback)
- `StandardVideoArtifactsPanel.tsx` (content null-safe, wordBreak + overflowWrap)
- `JsonPreviewField.tsx` (overflowWrap eklendi)
- `safeJson.ts` (whitespace-only string guard)
- `text-overflow-safety.smoke.test.tsx` (metadata.title pattern fix)
**Test:** 1209 toplam test (+25 yeni), tsc temiz, vite build temiz
**Dokunulmayan:** Copy button yok, export format yok, badge stilleri korundu, backend değişiklik yok

---

## [2026-04-03] Phase 148 — URL / Link Surface Safety & External Target Hygiene Pack

**Ne:** URL/link yüzeylerinde güvenlik denetimi ve düzeltme. Anchor null guard, rel attribute fix, UrlField overflowWrap eklendi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/tests/url-link-safety.smoke.test.tsx` (yeni — 13 structural guard test)
- `NewsItemDetailPanel.tsx` (anchor null guard + rel="noopener noreferrer" fix)
- `SourceDetailPanel.tsx` (UrlField overflowWrap eklendi)
**Test:** 1184 toplam test (+13 yeni), tsc temiz, vite build temiz
**Dokunulmayan:** Link preview yok, favicon yok, URL normalization yok, badge stilleri korundu, backend değişiklik yok

---

## [2026-04-03] Phase 147 — Text Field Overflow & Long Content Safety Pack

**Ne:** Tüm korumasız metin render yüzeylerine wordBreak/overflowWrap overflow koruması eklendi. 9 detail panel Field/Row, 5 inline metin, 7 registry table (10 td), 14 form error display düzeltildi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/tests/text-overflow-safety.smoke.test.tsx` (yeni — 34 structural guard test)
- 9 detail panel: SourceDetailPanel, NewsItemDetailPanel, UsedNewsDetailPanel, TemplateDetailPanel, StyleBlueprintDetailPanel, NewsBulletinDetailPanel, TemplateStyleLinkDetailPanel, SourceScanDetailPanel, StandardVideoOverviewPanel (Field/Row overflow fix)
- 5 inline panel: JobTimelinePanel, StandardVideoMetadataPanel, NewsBulletinMetadataPanel, NewsBulletinSelectedItemsPanel (inline text overflow fix)
- 7 registry table: SettingsTable, VisibilityRulesTable, SourcesTable, TemplatesTable, StandardVideosTable, StyleBlueprintsTable, NewsBulletinsTable (td overflow fix)
- 14 form: TemplateForm, StyleBlueprintForm, TemplateStyleLinkForm, SourceScanForm, NewsItemForm, UsedNewsForm, StandardVideoForm, StandardVideoScriptForm, StandardVideoMetadataForm, SourceForm, NewsBulletinMetadataForm, NewsBulletinScriptForm, NewsBulletinSelectedItemForm, NewsBulletinForm (error display overflow fix)
**Test:** 1171 toplam test (+34 yeni), tsc temiz, vite build temiz
**Dokunulmayan:** Font boyutları, layout yapısı, max-width/truncation yok, badge stilleri korundu, backend değişiklik yok

---

## [2026-04-03] Phase 146 — JSON Field Preview Safety & Readability Pack

**Ne:** JSON alanlarını gösteren yüzeylerde güvenlik ve okunurluk iyileştirmeleri. Paylaşılan helper ve bileşen çıkarıldı, duplicate tanımlar kaldırıldı, overflow koruması eklendi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/lib/safeJson.ts` (yeni — safeJsonPretty + validateJson)
- `frontend/src/components/shared/JsonPreviewField.tsx` (yeni — shared JSON preview bileşeni)
- `frontend/src/tests/json-safety.smoke.test.tsx` (yeni — 19 guard test)
- `TemplateDetailPanel.tsx` (local JsonField → shared import)
- `StyleBlueprintDetailPanel.tsx` (local JsonField → shared import)
- `SourceScanDetailPanel.tsx` (local JsonPreviewField → shared import)
- `TemplateForm.tsx` (local validateJson → shared import)
- `StyleBlueprintForm.tsx` (local validateJson → shared import)
- `NewsBulletinDetailPanel.tsx` (overflow safety eklendi)
- `StandardVideoArtifactsPanel.tsx` (overflow safety eklendi)
- `NewsBulletinMetadataPanel.tsx` (overflow safety eklendi)
- `SettingDetailPanel.tsx` (overflow safety + null fallback eklendi)
- `docs/testing/test-report-phase-146-json-field-preview-safety-readability-pack.md` (yeni)
**Korunan:** Badge stilleri, business logic, mevcut JSON rendering davranışı. Bilgi kaybı sıfır.
**Test:** 1137 toplam (+19 yeni), tsc temiz, build temiz.

---

## [2026-04-03] Phase 145 — List/Detail/Form Date Formatting Safety Unification Pack

**Ne:** Paylaşılan tarih helper kütüphanesi oluşturuldu ve tüm inline tarih pattern'leri (5 farklı pattern) bu helper'larla değiştirildi. 23 dosya güncellendi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/lib/formatDate.ts` (yeni — 4 helper: formatDateTime, formatDateShort, formatDateISO, normalizeDateForInput)
- `frontend/src/tests/date-formatting-safety.smoke.test.tsx` (yeni — 19 guard test)
- 9 detail panel (formatDateTime import + usage)
- 2 job panel (formatDateISO import + usage)
- 8 registry table (formatDateShort/formatDateISO/formatDateTime import + usage)
- 3 sub-panel/picker (formatDateShort import + usage)
- 1 form (normalizeDateForInput import + usage)
- `docs/testing/test-report-phase-145-list-detail-form-date-formatting-safety-unification-pack.md` (yeni)
**Önemli fix:** SourceScanSummary.tsx'de eksik Invalid Date guard eklendi — önceden geçersiz tarihte crash riski vardı.
**Korunan:** Badge stilleri, görsel çıktı, fallback değerleri. Bilgi kaybı sıfır.
**Test:** 1118 toplam (+19 yeni), tsc temiz, build temiz.

---

## [2026-04-03] Phase 144 — Form Surface Empty/Null State Safety Pack

**Ne:** 14 form bileşeninde null/undefined/empty state render ve input güvenliği denetimi ve güçlendirmesi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/templates/TemplateForm.tsx` (version null guard: String(initial.version ?? 1))
- `frontend/src/components/style-blueprints/StyleBlueprintForm.tsx` (version null guard: String(initial.version ?? 1))
- `frontend/src/components/news-items/NewsItemForm.tsx` (published_at String() coercion)
- `frontend/src/tests/form-null-safety.smoke.test.tsx` (yeni — 4 guard test)
- `docs/testing/test-report-phase-144-form-surface-empty-null-state-safety-pack.md` (yeni)
**Korunan:** Badge stilleri, form UX, validation kuralları, business logic. Bilgi kaybı sıfır.
**Test:** 1099 toplam (+4 yeni), tsc temiz, build temiz.

---

## [2026-04-03] Phase 143 — Detail Panel Empty/Null State Safety Pack

**Ne:** 11 detail panel bileşeninde null/undefined/empty state render ve form handler güvenliği.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/templates/TemplateDetailPanel.tsx` (created_at/updated_at ternary guard)
- `frontend/src/components/sources/SourceDetailPanel.tsx` (created_at/updated_at ternary guard)
- `frontend/src/components/news-bulletin/NewsBulletinDetailPanel.tsx` (date guard + 6 field .trim() null safety)
- `frontend/src/components/style-blueprints/StyleBlueprintDetailPanel.tsx` (created_at/updated_at ternary guard)
- `frontend/src/components/template-style-links/TemplateStyleLinkDetailPanel.tsx` (created_at/updated_at ternary guard)
- `frontend/src/components/source-scans/SourceScanDetailPanel.tsx` (date guard + 4 field .trim() null safety)
- `frontend/src/components/used-news/UsedNewsDetailPanel.tsx` (date guard + 5 field .trim() null safety)
- `frontend/src/components/news-items/NewsItemDetailPanel.tsx` (date guard + 7 field .trim() null safety)
- `frontend/src/components/standard-video/StandardVideoOverviewPanel.tsx` (created_at/updated_at ternary guard)
- `frontend/src/components/jobs/JobDetailPanel.tsx` (.slice() crash guard)
- `frontend/src/components/jobs/JobOverviewPanel.tsx` (.slice() crash guard)
- `frontend/src/tests/detail-panel-null-safety.smoke.test.tsx` (yeni — 2 guard test)
- `docs/testing/test-report-phase-143-detail-panel-empty-null-state-safety-pack.md` (yeni)
**Korunan:** Badge stilleri, summary mantığı, tüm sütunlar, business logic. Bilgi kaybı sıfır.
**Test:** 1095 toplam (+2 yeni), tsc temiz.

---

## [2026-04-03] Phase 142 — Registry Empty/Null State Safety Pack

**Ne:** 9 registry tablosu ve summary bileşenlerinde null/undefined/empty state render güvenliği.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/jobs/JobsTable.tsx` (created_at null crash guard)
- `frontend/src/components/source-scans/SourceScansTable.tsx` (created_at Invalid Date guard)
- `frontend/src/components/news-items/NewsItemsTable.tsx` (created_at Invalid Date guard)
- `frontend/src/components/used-news/UsedNewsTable.tsx` (created_at Invalid Date guard)
- `frontend/src/components/style-blueprints/StyleBlueprintsTable.tsx` (created_at Invalid Date guard)
- `frontend/src/components/standard-video/StandardVideosTable.tsx` (created_at Invalid Date guard)
- `frontend/src/components/news-bulletin/NewsBulletinsTable.tsx` (created_at Invalid Date guard)
- `frontend/src/components/template-style-links/TemplateStyleLinksTable.tsx` (created_at Invalid Date guard)
- `frontend/src/components/news-bulletin/NewsBulletinSelectedItemsPanel.tsx` (created_at Invalid Date guard)
- `frontend/src/components/news-bulletin/NewsBulletinSelectedNewsQualitySummary.tsx` (NaN/Infinity count guard)
- `frontend/src/components/news-bulletin/NewsBulletinSourceCoverageSummary.tsx` (NaN count guard)
- `frontend/src/components/source-scans/SourceScanResultRichnessSummary.tsx` (NaN/Infinity count guard)
- `frontend/src/components/style-blueprints/StyleBlueprintReadinessSummary.tsx` (typeof string guard)
- `docs/testing/test-report-phase-142-registry-empty-null-state-safety-pack.md` (yeni)
**Korunan:** Badge stilleri, summary mantığı, tüm sütunlar, business logic. Bilgi kaybı sıfır.
**Test:** 1093 toplam, tsc temiz.

---

## [2026-04-03] Phase 141 — Registry Density & Overflow Safety Pack

**Ne:** 9 registry tablosunda yoğunluk ve taşma güvenliği standardizasyonu.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/jobs/JobsTable.tsx` (header background #f1f5f9, border 2px→1px, padding 0.5rem→0.5rem 0.75rem)
- `frontend/src/components/standard-video/StandardVideosTable.tsx` (header background #f8fafc→#f1f5f9)
- `frontend/src/components/news-bulletin/NewsBulletinsTable.tsx` (fontSize: "0.875rem" eklendi)
- 9 tablo: `<div style={{ overflowX: "auto" }}>` wrapper eklendi (Sources, SourceScans, Jobs, NewsItems, UsedNews, Templates, StyleBlueprints, StandardVideos, NewsBulletins)
- `docs/testing/test-report-phase-141-registry-density-overflow-safety-pack.md` (yeni)
**Korunan:** Badge stilleri, secondary textler, tüm sütunlar, tüm summary bileşenleri. Bilgi kaybı sıfır.
**Test:** 1093 toplam, tsc temiz.

---

## [2026-04-03] Phase 140 — Cross-Registry Header/Grouping Consistency Pack

**Ne:** 9 registry tablosu arasında başlık dili ve kavram tutarlılığı hizalaması.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/source-scans/SourceScansTable.tsx` ("Yayın Sonucu" → "Yayın Çıktısı")
- `frontend/src/components/jobs/JobsTable.tsx` ("Yayın Sonucu" → "Yayın Çıktısı")
- `frontend/src/components/news-bulletin/NewsBulletinsTable.tsx` ("Enforcement" → "Uygunluk")
- `frontend/src/tests/news-bulletin-enforcement-summary.smoke.test.tsx` (header testi güncellendi)
- `docs/testing/test-report-phase-140-cross-registry-header-grouping-consistency-pack.md` (yeni)
**Korunan:** Badge stilleri, secondary textler, tüm sütunlar, entity-specific grup isimleri. Bilgi kaybı sıfır.
**Test:** 1093 toplam, tsc temiz.

---

## [2026-04-03] Phase 139 — Standard Video + News Bulletin Registry Visibility Completion Pack

**Ne:** Standard Video ve News Bulletin tablolarının görünürlük ve okunabilirlik iyileştirmesi. Konservatif yaklaşım.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/news-bulletin/NewsBulletinInputQualitySummary.tsx` (import sırası düzeltmesi)
- `frontend/src/components/standard-video/StandardVideosTable.tsx` (sütun sırası mantıksal gruplara ayrıldı)
- `frontend/src/components/news-bulletin/NewsBulletinsTable.tsx` (8 başlık Türkçeleştirildi, header stili tutarlı hale getirildi, sütun sırası mantıksal gruplara ayrıldı)
- `frontend/src/tests/news-bulletin-artifact-summary.smoke.test.tsx` (header testi güncellendi)
- `docs/testing/test-report-phase-139-standardvideo-newsbulletin-registry-visibility-completion-pack.md` (yeni)
**Korunan:** Badge stilleri, secondary textler, tüm sütunlar (StandardVideo: 13, NewsBulletin: 18). Bilgi kaybı sıfır.
**Test:** 1093 toplam, tsc temiz.

---

## [2026-04-03] Phase 138 — Templates + Style Blueprints Registry Visibility Completion Pack

**Ne:** Templates ve Style Blueprints tablolarının görünürlük ve okunabilirlik iyileştirmesi. Konservatif yaklaşım.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/templates/TemplateInputQualitySummary.tsx` (import sırası düzeltmesi)
- `frontend/src/components/style-blueprints/StyleBlueprintInputQualitySummary.tsx` (import sırası düzeltmesi)
- `frontend/src/components/templates/TemplatesTable.tsx` (7 başlık Türkçeleştirildi, 14 sütun mantıksal gruplara ayrıldı)
- `frontend/src/components/style-blueprints/StyleBlueprintsTable.tsx` (5 başlık Türkçeleştirildi, 12 sütun mantıksal gruplara ayrıldı)
- `frontend/src/tests/template-style-link-summary.smoke.test.tsx` (header testi güncellendi)
- `docs/testing/test-report-phase-138-template-styleblueprint-registry-visibility-completion-pack.md` (yeni)
**Korunan:** Badge stilleri, secondary textler, tüm sütunlar (Templates: 14, StyleBlueprints: 12). Bilgi kaybı sıfır.
**Test:** 1093 toplam, tsc temiz.

---

## [2026-04-03] Phase 137 — News Registry Visibility Completion Pack

**Ne:** News Items + Used News tablolarının görünürlük ve okunabilirlik iyileştirmesi. Konservatif yaklaşım.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/used-news/UsedNewsArtifactConsistencySummary.tsx` (import sırası düzeltmesi)
- `frontend/src/components/news-items/NewsItemsTable.tsx` (sütun başlıkları Türkçeleştirildi, sütun sırası mantıksal gruplara ayrıldı)
- `frontend/src/components/used-news/UsedNewsTable.tsx` (sütun başlıkları Türkçeleştirildi, sütun sırası mantıksal gruplara ayrıldı)
- `docs/testing/test-report-phase-137-news-registry-visibility-completion-pack.md` (yeni)
**Korunan:** Badge stilleri, secondary textler, tüm sütunlar (NewsItems: 17, UsedNews: 13). Bilgi kaybı sıfır.
**Test:** 1093 toplam, tsc temiz.

---

## [2026-04-03] Phase 136 — Jobs Registry Visibility Completion Pack

**Ne:** Jobs tablosunun görünürlük ve okunabilirlik iyileştirmesi. Konservatif yaklaşım.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/jobs/JobInputQualitySummary.tsx` (import sırası düzeltmesi)
- `frontend/src/components/jobs/JobArtifactConsistencySummary.tsx` (import sırası düzeltmesi)
- `frontend/src/components/jobs/JobsTable.tsx` (sütun başlıkları Türkçeleştirildi, sütun sırası mantıksal gruplara ayrıldı)
- `frontend/src/tests/job-context-summary.smoke.test.tsx` (header testi güncellendi)
- `docs/testing/test-report-phase-136-jobs-registry-visibility-completion-pack.md` (yeni)
**Korunan:** Badge stilleri (4 grup), secondary textler, tüm 15 sütun. Bilgi kaybı sıfır.
**Test:** 1093 toplam, tsc temiz.

---

## [2026-04-03] Phase 135 — Source Scans Registry Visibility Completion Pack

**Ne:** Source Scans tablosunun görünürlük ve okunabilirlik iyileştirmesi. Konservatif yaklaşım.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/source-scans/SourceScanInputQualitySummary.tsx` (import sırası düzeltmesi)
- `frontend/src/components/source-scans/SourceScansTable.tsx` (sütun başlıkları Türkçeleştirildi, sütun sırası mantıksal gruplara ayrıldı)
- `docs/testing/test-report-phase-135-source-scans-registry-visibility-completion-pack.md` (yeni)
**Korunan:** Badge stilleri (4 grup), secondary textler, tüm 13 sütun. Bilgi kaybı sıfır.
**Test:** 1093 toplam, tsc temiz.

---

## [2026-04-03] Phase 134 — Sources Registry Visibility Completion Pack

**Ne:** Sources Registry tablosunun görünürlük ve okunabilirlik iyileştirmesi. Konservatif yaklaşım.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/sources/SourceInputQualitySummary.tsx` (import sırası düzeltmesi)
- `frontend/src/components/sources/SourcesTable.tsx` (sütun başlıkları Türkçeleştirildi, sütun sırası mantıksal gruplara ayrıldı)
- `frontend/src/tests/source-scan-summary.smoke.test.tsx` (header testi güncellendi)
- `frontend/src/tests/used-news-registry.smoke.test.tsx` (mock eksiklikleri giderildi)
- `frontend/src/tests/used-news-form.smoke.test.tsx` (mock eksiklikleri giderildi)
- `frontend/src/tests/used-news-state-summary.smoke.test.tsx` (mock eksiklikleri giderildi)
- `frontend/src/tests/news-bulletin-readiness-summary.smoke.test.tsx` (mock eksiklikleri giderildi)
- `frontend/src/tests/news-item-readiness-summary.smoke.test.tsx` (mock eksiklikleri giderildi)
- `frontend/src/tests/job-actionability-summary.smoke.test.tsx` (mock eksiklikleri giderildi)
- `docs/testing/test-report-phase-134-sources-registry-visibility-completion-pack.md` (yeni)
**Korunan:** Badge stilleri, secondary textler, tüm 16 sütun. Bilgi kaybı sıfır.
**Test:** 1093 toplam, tsc temiz, build temiz.

---

## [2026-04-02] Phase 124 — Template Target-Output Consistency Summary Frontend Foundation

**Ne:** Templates listesine target-output consistency özeti eklendi. Pure frontend türetimi, 4 seviye.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/templates/TemplateTargetOutputConsistencyBadge.tsx` (yeni)
- `frontend/src/components/templates/TemplateTargetOutputConsistencySummary.tsx` (yeni, computeTemplateTargetOutputConsistency)
- `frontend/src/components/templates/TemplatesTable.tsx` (Target/Output Tutarlılığı sütunu eklendi)
- `frontend/src/tests/template-target-output-consistency-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-124-template-target-output-consistency-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 1003 toplam, build temiz.

---

## [2026-04-02] Phase 123 — Style Blueprint Input Specificity Summary Frontend Foundation

**Ne:** Style Blueprints listesine input specificity özeti eklendi. Pure frontend türetimi, 3 seviye.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/style-blueprints/StyleBlueprintInputSpecificityBadge.tsx` (yeni)
- `frontend/src/components/style-blueprints/StyleBlueprintInputSpecificitySummary.tsx` (yeni, computeStyleBlueprintInputSpecificity)
- `frontend/src/components/style-blueprints/StyleBlueprintsTable.tsx` (Girdi Özgüllüğü sütunu eklendi)
- `frontend/src/tests/style-blueprint-input-specificity-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-123-style-blueprint-input-specificity-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 993 toplam, build temiz.

---

## [2026-04-02] Phase 122 — Template Input Specificity Summary Frontend Foundation

**Ne:** Templates listesine input specificity özeti eklendi. Pure frontend türetimi, 3 seviye.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/templates/TemplateInputSpecificityBadge.tsx` (yeni)
- `frontend/src/components/templates/TemplateInputSpecificitySummary.tsx` (yeni, computeTemplateInputSpecificity)
- `frontend/src/components/templates/TemplatesTable.tsx` (Girdi Özgüllüğü sütunu eklendi)
- `frontend/src/tests/template-input-specificity-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-122-template-input-specificity-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 983 toplam, build temiz.

---

## [2026-04-02] Phase 121 — Standard Video Input Specificity Summary Frontend Foundation

**Ne:** Standard Video listesine input specificity özeti eklendi. Pure frontend türetimi, 3 seviye.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/standard-video/StandardVideoInputSpecificityBadge.tsx` (yeni)
- `frontend/src/components/standard-video/StandardVideoInputSpecificitySummary.tsx` (yeni, computeStandardVideoInputSpecificity)
- `frontend/src/components/standard-video/StandardVideosTable.tsx` (Girdi Özgüllüğü sütunu eklendi)
- `frontend/src/tests/standard-video-input-specificity-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-121-standard-video-input-specificity-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 973 toplam, build temiz.

---

## [2026-04-02] Phase 120 — Source Input Specificity Summary Frontend Foundation

**Ne:** Sources listesine input specificity özeti eklendi. Pure frontend türetimi, 3 seviye.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/sources/SourceInputSpecificityBadge.tsx` (yeni)
- `frontend/src/components/sources/SourceInputSpecificitySummary.tsx` (yeni, computeSourceInputSpecificity)
- `frontend/src/components/sources/SourcesTable.tsx` (Girdi Özgüllüğü sütunu eklendi)
- `frontend/src/tests/source-input-specificity-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-120-source-input-specificity-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 963 toplam, build temiz.

---

## [2026-04-02] Phase 119 — Source Scan Input Specificity Summary Frontend Foundation

**Ne:** Source Scans listesine input specificity özeti eklendi. Pure frontend türetimi, 3 seviye.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/source-scans/SourceScanInputSpecificityBadge.tsx` (yeni)
- `frontend/src/components/source-scans/SourceScanInputSpecificitySummary.tsx` (yeni, computeSourceScanInputSpecificity)
- `frontend/src/components/source-scans/SourceScansTable.tsx` (Girdi Özgüllüğü sütunu eklendi)
- `frontend/src/tests/source-scan-input-specificity-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-119-source-scan-input-specificity-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 953 toplam, build temiz.

---

## [2026-04-02] Phase 118 — Used News Input Specificity Summary Frontend Foundation

**Ne:** Used News listesine input specificity özeti eklendi. Pure frontend türetimi, 3 seviye.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/used-news/UsedNewsInputSpecificityBadge.tsx` (yeni)
- `frontend/src/components/used-news/UsedNewsInputSpecificitySummary.tsx` (yeni, computeUsedNewsInputSpecificity)
- `frontend/src/components/used-news/UsedNewsTable.tsx` (Girdi Özgüllüğü sütunu eklendi)
- `frontend/src/tests/used-news-input-specificity-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-118-used-news-input-specificity-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 943 toplam, build temiz.

---

## [2026-04-02] Phase 117 — News Bulletin Input Specificity Summary Frontend Foundation

**Ne:** News Bulletin listesine input specificity özeti eklendi. Pure frontend türetimi, 3 seviye.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/news-bulletin/NewsBulletinInputSpecificityBadge.tsx` (yeni)
- `frontend/src/components/news-bulletin/NewsBulletinInputSpecificitySummary.tsx` (yeni, computeNewsBulletinInputSpecificity)
- `frontend/src/components/news-bulletin/NewsBulletinsTable.tsx` (Girdi Özgüllüğü sütunu eklendi)
- `frontend/src/tests/news-bulletin-input-specificity-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-117-news-bulletin-input-specificity-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 933 toplam, build temiz.

---

## [2026-04-02] Phase 116 — News Item Input Specificity Summary Frontend Foundation

**Ne:** News Items listesine input specificity özeti eklendi. Pure frontend türetimi, 3 seviye.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/news-items/NewsItemInputSpecificityBadge.tsx` (yeni)
- `frontend/src/components/news-items/NewsItemInputSpecificitySummary.tsx` (yeni, computeNewsItemInputSpecificity)
- `frontend/src/components/news-items/NewsItemsTable.tsx` (Girdi Özgüllüğü sütunu eklendi)
- `frontend/src/tests/news-item-input-specificity-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-116-news-item-input-specificity-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 923 toplam, build temiz.

---

## [2026-04-02] Phase 115 — Job Input Specificity Summary Frontend Foundation

**Ne:** Jobs listesine module-input specificity özeti eklendi. Pure frontend türetimi, 3 seviye.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/jobs/JobInputSpecificityBadge.tsx` (yeni)
- `frontend/src/components/jobs/JobInputSpecificitySummary.tsx` (yeni, computeJobInputSpecificity)
- `frontend/src/components/jobs/JobsTable.tsx` (Girdi Özgüllüğü sütunu eklendi)
- `frontend/src/tests/job-input-specificity-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-115-job-input-specificity-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 913 toplam, build temiz.

---

## [2026-04-02] Phase 114 — Job Publication Yield Summary Frontend Foundation

**Ne:** Jobs listesine publication yield özeti eklendi. Pure frontend türetimi, 6 seviye.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/jobs/JobPublicationYieldBadge.tsx` (yeni)
- `frontend/src/components/jobs/JobPublicationYieldSummary.tsx` (yeni, computeJobPublicationYield)
- `frontend/src/components/jobs/JobsTable.tsx` (Yayın Verimi sütunu eklendi)
- `frontend/src/tests/job-publication-yield-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-114-job-publication-yield-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 903 toplam, build temiz.

---

## [2026-04-02] Phase 113 — Source Scan Publication Outcome Summary Frontend Foundation

**Ne:** Source Scans listesine publication outcome özeti eklendi. Pure frontend türetimi, 6 seviye.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/source-scans/SourceScanPublicationOutcomeBadge.tsx` (yeni)
- `frontend/src/components/source-scans/SourceScanPublicationOutcomeSummary.tsx` (yeni, computeSourceScanPublicationOutcome)
- `frontend/src/components/source-scans/SourceScansTable.tsx` (Yayın Sonucu sütunu eklendi)
- `frontend/src/tests/source-scan-publication-outcome-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-113-source-scan-publication-outcome-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 893 toplam, build temiz.

---

## [2026-04-02] Phase 112 — Job Target-Output Consistency Summary Frontend Foundation

**Ne:** Jobs listesine target-output consistency özeti eklendi. Pure frontend türetimi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/jobs/JobTargetOutputConsistencyBadge.tsx` (yeni)
- `frontend/src/components/jobs/JobTargetOutputConsistencySummary.tsx` (yeni, computeJobTargetOutputConsistency)
- `frontend/src/components/jobs/JobsTable.tsx` (Target/Output Tutarlılığı sütunu eklendi)
- `frontend/src/tests/job-target-output-consistency-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-112-job-target-output-consistency-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 883 toplam, build temiz.

---

## [2026-04-02] Phase 111 — Source Scan Target-Output Consistency Summary Frontend Foundation

**Ne:** Source Scans listesine target-output consistency özeti eklendi. Pure frontend türetimi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/source-scans/SourceScanTargetOutputConsistencyBadge.tsx` (yeni)
- `frontend/src/components/source-scans/SourceScanTargetOutputConsistencySummary.tsx` (yeni, computeSourceScanTargetOutputConsistency)
- `frontend/src/components/source-scans/SourceScansTable.tsx` (Target/Output Tutarlılığı sütunu eklendi)
- `frontend/src/tests/source-scan-target-output-consistency-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-111-source-scan-target-output-consistency-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 873 toplam, build temiz.

---

## [2026-04-02] Phase 110 — Used News Input Quality Summary Frontend Foundation

**Ne:** Used News listesine source-input quality özeti eklendi. Pure frontend türetimi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/used-news/UsedNewsInputQualityBadge.tsx` (yeni)
- `frontend/src/components/used-news/UsedNewsInputQualitySummary.tsx` (yeni, computeUsedNewsInputQuality)
- `frontend/src/components/used-news/UsedNewsTable.tsx` (Girdi Kalitesi sütunu eklendi)
- `frontend/src/tests/used-news-input-quality-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-110-used-news-input-quality-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 863 toplam, build temiz.

---

## [2026-04-02] Phase 109 — News Bulletin Input Quality Summary Frontend Foundation

**Ne:** News Bulletin listesine source-input quality özeti eklendi. Pure frontend türetimi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/news-bulletin/NewsBulletinInputQualityBadge.tsx` (yeni)
- `frontend/src/components/news-bulletin/NewsBulletinInputQualitySummary.tsx` (yeni, computeNewsBulletinInputQuality)
- `frontend/src/components/news-bulletin/NewsBulletinsTable.tsx` (Girdi Kalitesi sütunu eklendi)
- `frontend/src/tests/news-bulletin-input-quality-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-109-news-bulletin-input-quality-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 853 toplam, build temiz.

---

## [2026-04-02] Phase 108 — News Item Input Quality Summary Frontend Foundation

**Ne:** News Items listesine source-input quality özeti eklendi. Pure frontend türetimi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/news-items/NewsItemInputQualityBadge.tsx` (yeni)
- `frontend/src/components/news-items/NewsItemInputQualitySummary.tsx` (yeni, computeNewsItemInputQuality)
- `frontend/src/components/news-items/NewsItemsTable.tsx` (Girdi Kalitesi sütunu eklendi)
- `frontend/src/tests/news-item-input-quality-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-108-news-item-input-quality-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 843 toplam, build temiz.

---

## [2026-04-02] Phase 107 — Job Input Quality Summary Frontend Foundation

**Ne:** Jobs listesine source-input quality özeti eklendi. Pure frontend türetimi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/jobs/JobInputQualityBadge.tsx` (yeni)
- `frontend/src/components/jobs/JobInputQualitySummary.tsx` (yeni, computeJobInputQuality)
- `frontend/src/components/jobs/JobsTable.tsx` (Girdi Kalitesi sütunu eklendi)
- `frontend/src/tests/job-input-quality-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-107-job-input-quality-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 833 toplam, build temiz.

---

## [2026-04-02] Phase 106 — Source Scan Input Quality Summary Frontend Foundation

**Ne:** Source Scans listesine source-input quality özeti eklendi. Pure frontend türetimi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/source-scans/SourceScanInputQualityBadge.tsx` (yeni)
- `frontend/src/components/source-scans/SourceScanInputQualitySummary.tsx` (yeni, computeSourceScanInputQuality)
- `frontend/src/components/source-scans/SourceScansTable.tsx` (Girdi Kalitesi sütunu eklendi)
- `frontend/src/tests/source-scan-input-quality-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-106-source-scan-input-quality-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 823 toplam, build temiz.

---

## [2026-04-02] Phase 105 — Source Input Quality Summary Frontend Foundation

**Ne:** Sources listesine source-input quality özeti eklendi. Pure frontend türetimi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/sources/SourceInputQualityBadge.tsx` (yeni)
- `frontend/src/components/sources/SourceInputQualitySummary.tsx` (yeni, computeSourceInputQuality)
- `frontend/src/components/sources/SourcesTable.tsx` (Girdi Kalitesi sütunu eklendi)
- `frontend/src/tests/source-input-quality-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-105-source-input-quality-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 813 toplam, build temiz.

---

## [2026-04-02] Phase 104 — Style Blueprint Input Quality Summary Frontend Foundation

**Ne:** Style Blueprints listesine source-input quality özeti eklendi. Pure frontend türetimi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/style-blueprints/StyleBlueprintInputQualityBadge.tsx` (yeni)
- `frontend/src/components/style-blueprints/StyleBlueprintInputQualitySummary.tsx` (yeni, computeStyleBlueprintInputQuality)
- `frontend/src/components/style-blueprints/StyleBlueprintsTable.tsx` (Girdi Kalitesi sütunu eklendi)
- `frontend/src/tests/style-blueprint-input-quality-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-104-style-blueprint-input-quality-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 803 toplam, build temiz.

---

## [2026-04-02] Phase 103 — Template Input Quality Summary Frontend Foundation

**Ne:** Templates listesine source-input quality özeti eklendi. Pure frontend türetimi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/templates/TemplateInputQualityBadge.tsx` (yeni)
- `frontend/src/components/templates/TemplateInputQualitySummary.tsx` (yeni, computeTemplateInputQuality)
- `frontend/src/components/templates/TemplatesTable.tsx` (Girdi Kalitesi sütunu eklendi)
- `frontend/src/tests/template-input-quality-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-103-template-input-quality-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 793 toplam, build temiz.

---

## [2026-04-02] Phase 102 — Used News Artifact Consistency Summary Frontend Foundation

**Ne:** Used News listesine artifact tutarlılık özeti eklendi. Pure frontend türetimi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/used-news/UsedNewsArtifactConsistencyBadge.tsx` (yeni)
- `frontend/src/components/used-news/UsedNewsArtifactConsistencySummary.tsx` (yeni, computeUsedNewsArtifactConsistency)
- `frontend/src/components/used-news/UsedNewsTable.tsx` (Artifact Tutarlılığı sütunu eklendi)
- `frontend/src/tests/used-news-artifact-consistency-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-102-used-news-artifact-consistency-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 783 toplam, build temiz.

---

## [2026-04-02] Phase 101 — News Item Artifact Consistency Summary Frontend Foundation

**Ne:** News Items listesine artifact tutarlılık özeti eklendi. Pure frontend türetimi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/news-items/NewsItemArtifactConsistencyBadge.tsx` (yeni)
- `frontend/src/components/news-items/NewsItemArtifactConsistencySummary.tsx` (yeni, computeNewsItemArtifactConsistency)
- `frontend/src/components/news-items/NewsItemsTable.tsx` (Artifact Tutarlılığı sütunu eklendi)
- `frontend/src/tests/news-item-artifact-consistency-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-101-news-item-artifact-consistency-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 773 toplam, build temiz.

---

## [2026-04-02] Phase 99 — Source Scan Artifact Consistency Summary Frontend Foundation

**Ne:** Source Scans listesine artifact tutarlılık özeti eklendi. Pure frontend türetimi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/source-scans/SourceScanArtifactConsistencyBadge.tsx` (yeni)
- `frontend/src/components/source-scans/SourceScanArtifactConsistencySummary.tsx` (yeni, computeSourceScanArtifactConsistency)
- `frontend/src/components/source-scans/SourceScansTable.tsx` (Artifact Tutarlılığı sütunu eklendi)
- `frontend/src/tests/source-scan-artifact-consistency-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-99-source-scan-artifact-consistency-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 753 toplam, build temiz.

---

## [2026-04-02] Phase 98 — Source Artifact Consistency Summary Frontend Foundation

**Ne:** Sources listesine artifact tutarlılık özeti eklendi. Pure frontend türetimi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/sources/SourceArtifactConsistencyBadge.tsx` (yeni)
- `frontend/src/components/sources/SourceArtifactConsistencySummary.tsx` (yeni, computeSourceArtifactConsistency)
- `frontend/src/components/sources/SourcesTable.tsx` (Artifact Tutarlılığı sütunu eklendi)
- `frontend/src/tests/source-artifact-consistency-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-98-source-artifact-consistency-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 743 toplam, build temiz.

---

## [2026-04-02] Phase 97 — Style Blueprint Artifact Consistency Summary Frontend Foundation

**Ne:** Style Blueprints listesine artifact tutarlılık özeti eklendi. Pure frontend türetimi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/style-blueprints/StyleBlueprintArtifactConsistencyBadge.tsx` (yeni)
- `frontend/src/components/style-blueprints/StyleBlueprintArtifactConsistencySummary.tsx` (yeni, computeStyleBlueprintArtifactConsistency)
- `frontend/src/components/style-blueprints/StyleBlueprintsTable.tsx` (Artifact Tutarlılığı sütunu eklendi)
- `frontend/src/tests/style-blueprint-artifact-consistency-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-97-style-blueprint-artifact-consistency-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 733 toplam, build temiz.

---

## [2026-04-02] Phase 96 — Template Artifact Consistency Summary Frontend Foundation

**Ne:** Templates listesine artifact tutarlılık özeti eklendi. Pure frontend türetimi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/templates/TemplateArtifactConsistencyBadge.tsx` (yeni)
- `frontend/src/components/templates/TemplateArtifactConsistencySummary.tsx` (yeni, computeTemplateArtifactConsistency)
- `frontend/src/components/templates/TemplatesTable.tsx` (Artifact Tutarlılığı sütunu eklendi)
- `frontend/src/tests/template-artifact-consistency-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-96-template-artifact-consistency-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 723 toplam, build temiz.

---

## [2026-04-02] Phase 95 — Standard Video Artifact Consistency Summary Frontend Foundation

**Ne:** Standard Video listesine artifact tutarlılık özeti eklendi. Pure frontend türetimi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/standard-video/StandardVideoArtifactConsistencyBadge.tsx` (yeni)
- `frontend/src/components/standard-video/StandardVideoArtifactConsistencySummary.tsx` (yeni, computeStandardVideoArtifactConsistency)
- `frontend/src/components/standard-video/StandardVideosTable.tsx` (Artifact Tutarlılığı sütunu eklendi)
- `frontend/src/tests/standard-video-artifact-consistency-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-95-standard-video-artifact-consistency-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 713 toplam, build temiz.

---

## [2026-04-02] Phase 94 — News Bulletin Artifact Consistency Summary Frontend Foundation

**Ne:** News Bulletins listesine artifact tutarlılık özeti eklendi. Pure frontend türetimi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/news-bulletin/NewsBulletinArtifactConsistencyBadge.tsx` (yeni)
- `frontend/src/components/news-bulletin/NewsBulletinArtifactConsistencySummary.tsx` (yeni, computeNewsBulletinArtifactConsistency)
- `frontend/src/components/news-bulletin/NewsBulletinsTable.tsx` (Artifact Tutarlılığı sütunu eklendi)
- `frontend/src/tests/news-bulletin-artifact-consistency-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-94-news-bulletin-artifact-consistency-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 703 toplam, build temiz.

---

## [2026-04-02] Phase 93 — Standard Video Input Quality Summary Frontend Foundation

**Ne:** Standard Video listesine girdi kalite özeti eklendi. Pure frontend türetimi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/standard-video/StandardVideoInputQualityBadge.tsx` (yeni)
- `frontend/src/components/standard-video/StandardVideoInputQualitySummary.tsx` (yeni, computeStandardVideoInputQuality)
- `frontend/src/components/standard-video/StandardVideosTable.tsx` (Girdi Kalitesi sütunu eklendi)
- `frontend/src/tests/standard-video-input-quality-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-93-standard-video-input-quality-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 693 toplam, build temiz.

---

## [2026-04-02] Phase 92 — News Bulletin Selected-News Quality Summary Frontend Foundation

**Ne:** News Bulletins listesine seçilmiş haber kalite özeti eklendi. Backend 3 yeni aggregate alan + frontend türetimi.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/modules/news_bulletin/schemas.py` (selected_news_quality_complete/partial/weak_count eklendi)
- `backend/app/modules/news_bulletin/service.py` (batch title/url/summary fetch + quality classification)
- `frontend/src/api/newsBulletinApi.ts` (3 quality count alanları eklendi)
- `frontend/src/components/news-bulletin/NewsBulletinSelectedNewsQualityBadge.tsx` (yeni)
- `frontend/src/components/news-bulletin/NewsBulletinSelectedNewsQualitySummary.tsx` (yeni)
- `frontend/src/components/news-bulletin/NewsBulletinsTable.tsx` (İçerik Kalitesi sütunu eklendi)
- `frontend/src/tests/news-bulletin-selected-news-quality-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-92-news-bulletin-selected-news-quality-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 683 frontend toplam, 11 backend pass, build temiz.

---

## [2026-04-02] Phase 91 — News Item Publication Lineage Summary Frontend Foundation

**Ne:** News Items listesine yayın zinciri özeti eklendi. Pure frontend türetimi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/news-items/NewsItemPublicationLineageBadge.tsx` (yeni)
- `frontend/src/components/news-items/NewsItemPublicationLineageSummary.tsx` (yeni)
- `frontend/src/components/news-items/NewsItemsTable.tsx` (Yayın Zinciri sütunu eklendi)
- `frontend/src/tests/news-item-publication-lineage-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-91-news-item-publication-lineage-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 673 toplam, build temiz.

---

## [2026-04-02] Phase 90 — News Item Used News Linkage Summary Frontend Foundation

**Ne:** News Items listesine used-news bağı özeti eklendi. Küçük backend genişletme (batch DISTINCT sorgusu) + frontend türetimi.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/news_items/schemas.py` (has_published_used_news_link eklendi)
- `backend/app/news_items/service.py` (batch published link sorgusu)
- `frontend/src/api/newsItemsApi.ts` (has_published_used_news_link eklendi)
- `frontend/src/components/news-items/NewsItemUsedNewsLinkageBadge.tsx` (yeni)
- `frontend/src/components/news-items/NewsItemUsedNewsLinkageSummary.tsx` (yeni)
- `frontend/src/components/news-items/NewsItemsTable.tsx` (Used News Bağı sütunu eklendi)
- `frontend/src/tests/news-item-used-news-linkage-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-90-news-item-used-news-linkage-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 663 toplam, build temiz.

---

## [2026-04-02] Phase 89 — Used News Target Resolution Summary Frontend Foundation

**Ne:** Used News registry listesine hedef çözümü özeti eklendi. Küçük backend genişletme (batch ID lookup) + frontend türetimi.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/used_news/schemas.py` (has_target_resolved eklendi)
- `backend/app/used_news/service.py` (_batch_resolve_targets helper, news_bulletin/standard_video/job tabloları)
- `frontend/src/api/usedNewsApi.ts` (has_target_resolved eklendi)
- `frontend/src/components/used-news/UsedNewsTargetResolutionBadge.tsx` (yeni)
- `frontend/src/components/used-news/UsedNewsTargetResolutionSummary.tsx` (yeni)
- `frontend/src/components/used-news/UsedNewsTable.tsx` (Hedef Çözümü sütunu eklendi)
- `frontend/src/tests/used-news-target-resolution-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-89-used-news-target-resolution-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 653 toplam, build temiz.

---

## [2026-04-02] Phase 88 — Job Publication Outcome Summary Frontend Foundation

**Ne:** Jobs listesine yayın sonucu özeti eklendi. Saf frontend türetimi — backend değişikliği yok.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/jobs/JobPublicationOutcomeBadge.tsx` (yeni)
- `frontend/src/components/jobs/JobPublicationOutcomeSummary.tsx` (yeni)
- `frontend/src/components/jobs/JobsTable.tsx` (Yayın Sonucu sütunu eklendi)
- `frontend/src/tests/job-publication-outcome-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-88-job-publication-outcome-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 643 toplam, build temiz.

---

## [2026-04-02] Phase 87 — Source Scan Publication Yield Summary Frontend Foundation

**Ne:** Source Scans listesine yayın verimi özeti eklendi. Küçük backend genişletme (batch COUNT sorguları) + frontend türetimi.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/source_scans/schemas.py` (linked/reviewed/used count alanları eklendi)
- `backend/app/source_scans/service.py` (batch GROUP BY COUNT sorguları)
- `frontend/src/api/sourceScansApi.ts` (yeni alanlar eklendi)
- `frontend/src/components/source-scans/SourceScanPublicationYieldBadge.tsx` (yeni)
- `frontend/src/components/source-scans/SourceScanPublicationYieldSummary.tsx` (yeni)
- `frontend/src/components/source-scans/SourceScansTable.tsx` (Yayın Verimi sütunu eklendi)
- `frontend/src/tests/source-scan-publication-yield-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-87-source-scan-publication-yield-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 633 toplam, build temiz.

---

## [2026-04-02] Phase 86 — Used News Publication Linkage Summary Frontend Foundation

**Ne:** Used News registry listesine yayın bağı özeti eklendi. Saf frontend türetimi — backend değişikliği yok.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/used-news/UsedNewsPublicationLinkageBadge.tsx` (yeni)
- `frontend/src/components/used-news/UsedNewsPublicationLinkageSummary.tsx` (yeni)
- `frontend/src/components/used-news/UsedNewsTable.tsx` (Yayın Bağı sütunu eklendi)
- `frontend/src/tests/used-news-publication-linkage-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-86-used-news-publication-linkage-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 623 toplam, build temiz.

---

## [2026-04-02] Phase 85 — Used News Source Context Summary Frontend Foundation

**Ne:** Used News registry listesine kaynak bağlamı özeti eklendi. Küçük backend genişletme (batch JOIN) + frontend türetimi.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/used_news/schemas.py` (has_news_item_source, has_news_item_scan_reference eklendi)
- `backend/app/used_news/service.py` (batch NewsItem JOIN, _enrich helper)
- `frontend/src/api/usedNewsApi.ts` (yeni alanlar eklendi)
- `frontend/src/components/used-news/UsedNewsSourceContextBadge.tsx` (yeni)
- `frontend/src/components/used-news/UsedNewsSourceContextSummary.tsx` (yeni)
- `frontend/src/components/used-news/UsedNewsTable.tsx` (Kaynak Bağlamı sütunu eklendi)
- `frontend/src/tests/used-news-source-context-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-85-used-news-source-context-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 613 toplam, build temiz.

---

## [2026-04-02] Phase 84 — Job Output Richness Summary Frontend Foundation

**Ne:** Jobs listesine çıktı zenginlik özeti eklendi. Saf frontend türetimi — backend değişikliği yok.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/jobs/JobOutputRichnessBadge.tsx` (yeni)
- `frontend/src/components/jobs/JobOutputRichnessSummary.tsx` (yeni)
- `frontend/src/components/jobs/JobsTable.tsx` (Çıktı Zenginliği sütunu eklendi)
- `frontend/src/tests/job-output-richness-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-84-job-output-richness-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 603 toplam, build temiz.

---

## [2026-04-02] Phase 83 — Style Blueprint Publication Signal Summary Frontend Foundation

**Ne:** Style Blueprints listesine yayın sinyal özeti eklendi. Saf frontend türetimi — backend değişikliği yok.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/style-blueprints/StyleBlueprintPublicationSignalBadge.tsx` (yeni)
- `frontend/src/components/style-blueprints/StyleBlueprintPublicationSignalSummary.tsx` (yeni)
- `frontend/src/components/style-blueprints/StyleBlueprintsTable.tsx` (Yayın Sinyali sütunu eklendi)
- `frontend/src/tests/style-blueprint-publication-signal-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-83-style-blueprint-publication-signal-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 593 toplam, build temiz.

---

## [2026-04-02] Phase 82 — Template Publication Signal Summary Frontend Foundation

**Ne:** Templates listesine yayın sinyal özeti eklendi. Saf frontend türetimi — backend değişikliği yok.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/templates/TemplatePublicationSignalBadge.tsx` (yeni)
- `frontend/src/components/templates/TemplatePublicationSignalSummary.tsx` (yeni)
- `frontend/src/components/templates/TemplatesTable.tsx` (Yayın Sinyali sütunu eklendi)
- `frontend/src/tests/template-publication-signal-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-82-template-publication-signal-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 583 toplam, build temiz.

---

## [2026-04-02] Phase 81 — Standard Video Publication Signal Summary Frontend Foundation

**Ne:** Standard Video listesine yayın sinyal özeti eklendi. Saf frontend türetimi — backend değişikliği yok.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/standard-video/StandardVideoPublicationSignalBadge.tsx` (yeni)
- `frontend/src/components/standard-video/StandardVideoPublicationSignalSummary.tsx` (yeni)
- `frontend/src/components/standard-video/StandardVideosTable.tsx` (Yayın Sinyali sütunu eklendi)
- `frontend/src/tests/standard-video-publication-signal-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-81-standard-video-publication-signal-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 573 toplam, build temiz.

---

## [2026-04-02] Phase 80 — News Bulletin Publication Signal Summary Frontend Foundation

**Ne:** News Bulletin listesine yayın sinyal özeti eklendi. Saf frontend türetimi — backend değişikliği yok.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/news-bulletin/NewsBulletinPublicationSignalBadge.tsx` (yeni)
- `frontend/src/components/news-bulletin/NewsBulletinPublicationSignalSummary.tsx` (yeni)
- `frontend/src/components/news-bulletin/NewsBulletinsTable.tsx` (Yayın Sinyali sütunu eklendi)
- `frontend/src/tests/news-bulletin-publication-signal-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-80-news-bulletin-publication-signal-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 563 toplam, build temiz.

---

## [2026-04-02] Phase 79 — Source Publication Supply Summary Frontend Foundation

**Ne:** Sources listesine yayın kaynağı özeti eklendi. Backend enrichment + frontend türetimi.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/sources/schemas.py` (reviewed_news_count, used_news_count_from_source eklendi)
- `backend/app/sources/service.py` (list_sources_with_scan_summary enriched)
- `frontend/src/api/sourcesApi.ts` (yeni alanlar eklendi)
- `frontend/src/components/sources/SourcePublicationSupplyBadge.tsx` (yeni)
- `frontend/src/components/sources/SourcePublicationSupplySummary.tsx` (yeni)
- `frontend/src/components/sources/SourcesTable.tsx` (Yayın Kaynağı sütunu eklendi)
- `frontend/src/tests/source-publication-supply-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-79-source-publication-supply-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 553 toplam, backend 15/15, build temiz.

---

## [2026-04-02] Phase 78 — News Item Publication Signal Summary Frontend Foundation

**Ne:** News Items listesine yayın sinyal özeti eklendi. Saf frontend türetimi — backend değişikliği yok.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/news-items/NewsItemPublicationSignalBadge.tsx` (yeni)
- `frontend/src/components/news-items/NewsItemPublicationSignalSummary.tsx` (yeni)
- `frontend/src/components/news-items/NewsItemsTable.tsx` (Yayın Sinyali sütunu eklendi)
- `frontend/src/tests/news-item-publication-signal-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-78-news-item-publication-signal-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 543 toplam, build temiz.

---

## [2026-04-02] Phase 77 — Source Scan Result Richness Summary Frontend Foundation

**Ne:** Source Scans listesine çıktı zenginlik özeti eklendi. Saf frontend türetimi — backend değişikliği yok.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/source-scans/SourceScanResultRichnessBadge.tsx` (yeni)
- `frontend/src/components/source-scans/SourceScanResultRichnessSummary.tsx` (yeni)
- `frontend/src/components/source-scans/SourceScansTable.tsx` (Çıktı Zenginliği sütunu eklendi)
- `frontend/src/tests/source-scan-result-richness-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-77-source-scan-result-richness-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 533 toplam, build temiz.

---

## [2026-04-02] Phase 76 — News Item Content Completeness Summary Frontend Foundation

**Ne:** News Items listesine içerik doluluk özeti eklendi. Saf frontend türetimi — backend değişikliği yok.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/news-items/NewsItemContentCompletenessBadge.tsx` (yeni)
- `frontend/src/components/news-items/NewsItemContentCompletenessSummary.tsx` (yeni)
- `frontend/src/components/news-items/NewsItemsTable.tsx` — İçerik sütunu eklendi
- `frontend/src/tests/news-item-content-completeness-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-76-news-item-content-completeness-summary-frontend.md` (yeni)
**Sonuç:** 523 frontend test — tümü geçti. Build başarılı.

---

## [2026-04-02] Phase 75 — Source Config Coverage Summary Frontend Foundation

**Ne:** Sources listesine source_type bazlı konfigürasyon özeti eklendi. Saf frontend türetimi — backend değişikliği yok.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/sources/SourceConfigCoverageBadge.tsx` (yeni)
- `frontend/src/components/sources/SourceConfigCoverageSummary.tsx` (yeni)
- `frontend/src/components/sources/SourcesTable.tsx` — Konfigürasyon sütunu eklendi
- `frontend/src/tests/source-config-coverage-summary.smoke.test.tsx` (yeni, 10 test)
- `frontend/src/tests/sources-registry.smoke.test.tsx` — getAllByText ile güncellendi
- `docs/testing/test-report-phase-75-source-config-coverage-summary-frontend.md` (yeni)
**Sonuç:** 513 frontend test — tümü geçti. Build başarılı.

---

## [2026-04-02] Phase 74 — Source Linked News Summary Frontend Foundation

**Ne:** Sources listesine bağlı haber sayısı görünürlüğü eklendi. Backend linked_news_count hesaplıyor, frontend badge + summary ile gösteriyor.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/sources/schemas.py` — linked_news_count
- `backend/app/sources/service.py` — NewsItem COUNT sorgusu
- `frontend/src/api/sourcesApi.ts` — linked_news_count
- `frontend/src/components/sources/SourceLinkedNewsStatusBadge.tsx` (yeni)
- `frontend/src/components/sources/SourceLinkedNewsSummary.tsx` (yeni)
- `frontend/src/components/sources/SourcesTable.tsx` — Haberler sütunu eklendi
- `frontend/src/tests/source-linked-news-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-74-source-linked-news-summary-frontend.md` (yeni)
**Sonuç:** 503 frontend test — tümü geçti. Build başarılı.

---

## [2026-04-02] Phase 73 — Source Scan Source Context Summary Frontend Foundation

**Ne:** Source Scans listesine kaynak bağlantı görünürlüğü eklendi. Backend source_name/source_status ile NewsSource çözümlemesi yapıyor, frontend badge + summary ile gösteriyor.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/source_scans/schemas.py` — source_name, source_status
- `backend/app/source_scans/service.py` — list_scans_with_source_summary()
- `backend/app/source_scans/router.py` — list endpoint güncellendi
- `frontend/src/api/sourceScansApi.ts` — source_name, source_status
- `frontend/src/components/source-scans/SourceScanSourceStatusBadge.tsx` (yeni)
- `frontend/src/components/source-scans/SourceScanSourceSummary.tsx` (yeni)
- `frontend/src/components/source-scans/SourceScansTable.tsx` — Kaynak sütunu güncellendi
- `frontend/src/tests/source-scan-source-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-73-source-scan-source-summary-frontend.md` (yeni)
**Sonuç:** 493 frontend test — tümü geçti. Build başarılı.

---

## [2026-04-02] Phase 72 — News Bulletin Source Coverage Summary Frontend Foundation

**Ne:** News Bulletin listesine kaynak kapsam görünürlüğü eklendi. Backend selected_news_source_count/has_selected_news_missing_source hesaplıyor, frontend badge + summary ile gösteriyor.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/modules/news_bulletin/schemas.py` — selected_news_source_count, has_selected_news_missing_source
- `backend/app/modules/news_bulletin/service.py` — NewsItem.source_id aggregate
- `frontend/src/api/newsBulletinApi.ts` — yeni alanlar
- `frontend/src/components/news-bulletin/NewsBulletinSourceCoverageBadge.tsx` (yeni)
- `frontend/src/components/news-bulletin/NewsBulletinSourceCoverageSummary.tsx` (yeni)
- `frontend/src/components/news-bulletin/NewsBulletinsTable.tsx` — Kaynak Kapsamı sütunu
- `frontend/src/tests/news-bulletin-source-coverage-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-72-news-bulletin-source-coverage-summary-frontend.md` (yeni)
**Sonuç:** 483 frontend test — tümü geçti. Build başarılı.

---

## [2026-04-02] Phase 71 — News Item Scan Lineage Summary Frontend Foundation

**Ne:** News Items listesine scan lineage görünürlüğü eklendi. Backend source_scan_status alanıyla SourceScan kaydı çözümleniyor, frontend badge + summary ile gösteriliyor.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/news_items/schemas.py` — source_scan_status alanı
- `backend/app/news_items/service.py` — SourceScan lookup in list_news_items_with_usage_summary
- `frontend/src/api/newsItemsApi.ts` — source_scan_status alanı
- `frontend/src/components/news-items/NewsItemScanLineageBadge.tsx` (yeni)
- `frontend/src/components/news-items/NewsItemScanLineageSummary.tsx` (yeni)
- `frontend/src/components/news-items/NewsItemsTable.tsx` — Scan Kaynağı sütunu eklendi
- `frontend/src/tests/news-item-scan-lineage-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-71-news-item-scan-lineage-summary-frontend.md` (yeni)
**Sonuç:** 473 frontend test — tümü geçti. Build başarılı.

---

## [2026-04-02] Phase 70 — News Item Source Summary Frontend Foundation

**Ne:** News Items listesine source bağlantı görünürlüğü eklendi. Backend enrichment ile source_name/source_status alanları dolduruluyor, frontend badge + summary ile gösteriliyor.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/news_items/schemas.py` — source_name, source_status alanları
- `backend/app/news_items/service.py` — NewsSource lookup in list_news_items_with_usage_summary
- `frontend/src/api/newsItemsApi.ts` — source_name, source_status alanları
- `frontend/src/components/news-items/NewsItemSourceStatusBadge.tsx` (yeni)
- `frontend/src/components/news-items/NewsItemSourceSummary.tsx` (yeni)
- `frontend/src/components/news-items/NewsItemsTable.tsx` — Kaynak Özeti sütunu güncellendi
- `frontend/src/tests/news-item-source-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-70-news-item-source-summary-frontend.md` (yeni)
**Sonuç:** 463 frontend test — tümü geçti. Build başarılı.

---

## [2026-04-02] Phase 69 — News Bulletin Enforcement Summary Frontend Foundation

**Ne:** News Bulletin listesine selected news warning aggregate özeti eklendi.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/modules/news_bulletin/schemas.py` — has_selected_news_warning, selected_news_warning_count
- `backend/app/modules/news_bulletin/service.py` — warning aggregate hesabı
- `frontend/src/api/newsBulletinApi.ts` — warning alanları
- `frontend/src/components/news-bulletin/NewsBulletinEnforcementStatusBadge.tsx` (yeni)
- `frontend/src/components/news-bulletin/NewsBulletinEnforcementSummary.tsx` (yeni)
- `frontend/src/components/news-bulletin/NewsBulletinsTable.tsx` — Enforcement sütunu
- `frontend/src/tests/news-bulletin-enforcement-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-69-news-bulletin-enforcement-summary-frontend.md` (yeni)
**Sonuç:** 453 frontend test — tümü geçti. Build başarılı.

---

## [2026-04-02] Phase 68 — Standard Video Artifact Summary Frontend Foundation

**Ne:** Standard Video registry listesine gerçek artifact varlığı (script/metadata) özeti eklendi.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/modules/standard_video/schemas.py` — has_script, has_metadata alanları
- `backend/app/modules/standard_video/service.py` — list_standard_videos_with_artifact_summary
- `backend/app/modules/standard_video/router.py` — list endpoint güncellendi
- `frontend/src/api/standardVideoApi.ts` — has_script, has_metadata eklendi
- `frontend/src/components/standard-video/StandardVideoArtifactStatusBadge.tsx` (yeni)
- `frontend/src/components/standard-video/StandardVideoArtifactSummary.tsx` (yeni)
- `frontend/src/components/standard-video/StandardVideosTable.tsx` — Artifact sütunu eklendi
- `frontend/src/tests/standard-video-artifact-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-68-standard-video-artifact-summary-frontend.md` (yeni)
**Sonuç:** 443 frontend test — tümü geçti. Build başarılı.

---

## [2026-04-02] Phase 67 — Job Actionability Summary Frontend Foundation

**Ne:** Jobs registry listesinde her job için sade actionability özeti eklendi.
**Yaklaşım:** Backend değişikliği yok; mevcut status/last_error/retry_count/current_step_key alanlarından frontend türetildi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/jobs/JobActionabilityBadge.tsx` (yeni)
- `frontend/src/components/jobs/JobActionabilitySummary.tsx` (yeni)
- `frontend/src/components/jobs/JobsTable.tsx` — Aksiyon Özeti sütunu eklendi
- `frontend/src/tests/job-actionability-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-67-job-actionability-summary-frontend.md` (yeni)
**Sonuç:** 433 frontend test — tümü geçti. Build başarılı.

---

## [2026-04-02] Phase 66 — Template Style Link Readiness Summary Frontend Foundation

**Ne:** Template Style Links registry listesinde her link kaydı için sade role/readiness özeti eklendi.
**Yaklaşım:** Backend değişikliği yok; mevcut status/link_role/template_id/style_blueprint_id alanlarından frontend türetildi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/template-style-links/TemplateStyleLinkReadinessBadge.tsx` (yeni)
- `frontend/src/components/template-style-links/TemplateStyleLinkReadinessSummary.tsx` (yeni)
- `frontend/src/components/template-style-links/TemplateStyleLinksTable.tsx` — Bağ Durumu sütunu eklendi
- `frontend/src/tests/template-style-link-readiness-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-66-template-style-link-readiness-summary-frontend.md` (yeni)
**Sonuç:** 423 frontend test — tümü geçti. Build başarılı.

---

## [2026-04-02] Phase 65 — Style Blueprint Readiness Summary Frontend Foundation

**Ne:** Style Blueprints registry listesinde her kayıt için sade readiness özeti eklendi.
**Yaklaşım:** Backend değişikliği yok; 6 JSON kural alanı + status'tan frontend türetildi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/style-blueprints/StyleBlueprintReadinessBadge.tsx` (yeni)
- `frontend/src/components/style-blueprints/StyleBlueprintReadinessSummary.tsx` (yeni)
- `frontend/src/components/style-blueprints/StyleBlueprintsTable.tsx` — Hazırlık sütunu eklendi
- `frontend/src/tests/style-blueprint-readiness-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-65-style-blueprint-readiness-summary-frontend.md` (yeni)
**Sonuç:** 413 frontend test — tümü geçti. Build başarılı.

---

## [2026-04-02] Phase 64 — Source Scan Execution Summary Frontend Foundation

**Ne:** Source Scans registry listesinde her kayıt için sade execution özeti eklendi.
**Yaklaşım:** Backend değişikliği yok; mevcut status/result_count alanlarından frontend türetildi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/source-scans/SourceScanExecutionBadge.tsx` (yeni)
- `frontend/src/components/source-scans/SourceScanExecutionSummary.tsx` (yeni)
- `frontend/src/components/source-scans/SourceScansTable.tsx` — Çalışma Özeti sütunu eklendi
- `frontend/src/tests/source-scan-execution-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-64-source-scan-execution-summary-frontend.md` (yeni)
**Sonuç:** 403 frontend test — tümü geçti. Build başarılı.

---

## [2026-04-02] Phase 63 — Standard Video Readiness Summary Frontend Foundation

**Ne:** Standard Video registry listesinde her kayıt için sade readiness özeti eklendi.
**Yaklaşım:** Backend değişikliği yok; mevcut topic/status alanlarından frontend türetildi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/standard-video/StandardVideoReadinessBadge.tsx` (yeni)
- `frontend/src/components/standard-video/StandardVideoReadinessSummary.tsx` (yeni)
- `frontend/src/components/standard-video/StandardVideosTable.tsx` — Hazırlık sütunu eklendi
- `frontend/src/tests/standard-video-readiness-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-63-standard-video-readiness-summary-frontend.md` (yeni)
**Sonuç:** 393 frontend test — tümü geçti. Build başarılı.

---

## [2026-04-02] Phase 62 — Used News State Summary Frontend Foundation

**Ne:** Used News registry listesinde her kayıt için sade state özeti eklendi.
**Yaklaşım:** Backend değişikliği yok; mevcut usage_type/target_module alanlarından frontend türetildi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/used-news/UsedNewsStateBadge.tsx` (yeni)
- `frontend/src/components/used-news/UsedNewsStateSummary.tsx` (yeni, computeUsedNewsState helper dahil)
- `frontend/src/components/used-news/UsedNewsTable.tsx` — Durum sütunu eklendi
- `frontend/src/tests/used-news-state-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-62-used-news-state-summary-frontend.md` (yeni)
**Sonuç:** 383 frontend test — tümü geçti. Build başarılı.

---

## [2026-04-02] Phase 61 — News Item Readiness Summary Frontend Foundation

**Ne:** News Items registry listesinde her haber için sade hazırlık özeti eklendi.
**Yaklaşım:** Backend değişikliği yok; mevcut title/url/status alanlarından frontend türetildi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/news-items/NewsItemReadinessBadge.tsx` (yeni)
- `frontend/src/components/news-items/NewsItemReadinessSummary.tsx` (yeni)
- `frontend/src/components/news-items/NewsItemsTable.tsx` — Hazırlık sütunu eklendi
- `frontend/src/tests/news-item-readiness-summary.smoke.test.tsx` (yeni, 10 test)
**Sonuç:** 373 frontend test — tümü geçti. Build başarılı.

---

## [2026-04-02] Phase 60 — Source Readiness Summary Frontend Foundation

**Ne:** Sources registry listesinde her kaynak için sade operasyonel hazırlık özeti eklendi.
**Yaklaşım:** Backend değişikliği yok; mevcut alanlardan frontend türetildi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/sources/SourceReadinessBadge.tsx` (yeni)
- `frontend/src/components/sources/SourceReadinessSummary.tsx` (yeni)
- `frontend/src/components/sources/SourcesTable.tsx` — Hazırlık sütunu eklendi
- `frontend/src/tests/source-readiness-summary.smoke.test.tsx` (yeni, 10 test)
**Sonuç:** 363 frontend test — tümü geçti. Build başarılı.

---

## [2026-04-02] Phase 59 — Template Readiness Summary Frontend Foundation

**Ne:** Templates registry listesinde her template için sade hazırlık özeti eklendi.
**Yaklaşım:** Backend değişikliği yok; mevcut alanlardan frontend türetildi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/templates/TemplateReadinessBadge.tsx` (yeni)
- `frontend/src/components/templates/TemplateReadinessSummary.tsx` (yeni)
- `frontend/src/components/templates/TemplatesTable.tsx` — Hazırlık sütunu eklendi
- `frontend/src/tests/template-readiness-summary.smoke.test.tsx` (yeni, 10 test)
**Sonuç:** 353 frontend test — tümü geçti. Build başarılı.

---

## [2026-04-02] Phase 58 — Template Style Link Summary Frontend Foundation

**Ne:** Templates registry listesinde her template için style blueprint link özeti eklendi.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/modules/templates/schemas.py` — `style_link_count`, `primary_link_role` eklendi
- `backend/app/modules/templates/service.py` — `list_templates_with_style_link_summary()` eklendi
- `backend/app/modules/templates/router.py` — list endpoint güncellendi
- `frontend/src/api/templatesApi.ts` — 2 opsiyonel alan eklendi
- `frontend/src/components/templates/TemplateStyleLinkStatusBadge.tsx` (yeni)
- `frontend/src/components/templates/TemplateStyleLinkSummary.tsx` (yeni)
- `frontend/src/components/templates/TemplatesTable.tsx` — Style Links sütunu eklendi
- `frontend/src/tests/template-style-link-summary.smoke.test.tsx` (yeni, 10 test)
**Sonuç:** 195 backend test, 343 frontend test — tümü geçti. Build başarılı.

---

## [2026-04-02] Phase 57 — Job Context Summary Frontend Foundation

**Ne:** Jobs registry listesinde her job için module-aware context summary eklendi.
**Yaklaşım:** Frontend-only; mevcut module_type ve source_context_json alanlarından türetildi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/jobs/JobContextBadge.tsx` (yeni)
- `frontend/src/components/jobs/JobContextSummary.tsx` (yeni, extractContextTitle helper dahil)
- `frontend/src/components/jobs/JobsTable.tsx` — Context sütunu eklendi
- `frontend/src/tests/job-context-summary.smoke.test.tsx` (yeni, 10 test)
**Sonuç:** 333 frontend test — tümü geçti. Build başarılı.

---

## [2026-04-02] Phase 56 — News Bulletin Readiness Summary Frontend Foundation

**Ne:** News Bulletin registry listesinde her bülten için sade üretim hazırlık özeti eklendi.
**Yaklaşım:** Mevcut backend alanlarından frontend'de türetildi, yeni backend değişikliği yapılmadı.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/news-bulletin/NewsBulletinReadinessBadge.tsx` (yeni)
- `frontend/src/components/news-bulletin/NewsBulletinReadinessSummary.tsx` (yeni)
- `frontend/src/components/news-bulletin/NewsBulletinsTable.tsx` — Hazırlık sütunu eklendi
- `frontend/src/tests/news-bulletin-readiness-summary.smoke.test.tsx` (yeni, 10 test)
**Sonuç:** 323 frontend test — tümü geçti. Build başarılı.

---

## [2026-04-02] Phase 55 — News Item Usage Summary Frontend Foundation

**Ne:** News Items registry listesinde her haber için kullanım sayısı ve son kullanım bağlamı eklendi.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/news_items/schemas.py` — `usage_count`, `last_usage_type`, `last_target_module` eklendi
- `backend/app/news_items/service.py` — `list_news_items_with_usage_summary()` eklendi
- `backend/app/news_items/router.py` — list endpoint güncellendi
- `frontend/src/api/newsItemsApi.ts` — 3 opsiyonel alan eklendi
- `frontend/src/components/news-items/NewsItemUsageBadge.tsx` (yeni)
- `frontend/src/components/news-items/NewsItemUsageSummary.tsx` (yeni)
- `frontend/src/components/news-items/NewsItemsTable.tsx` — Kullanım sütunu eklendi
- `frontend/src/tests/news-item-usage-summary.smoke.test.tsx` (yeni, 10 test)
**Sonuç:** 195 backend test, 313 frontend test — tümü geçti. Build başarılı.

---

## [2026-04-02] Phase 54 — Source Scan Summary Frontend Foundation

**Ne:** Sources registry listesinde her kaynak için scan sayısı ve son scan durumu eklendi.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/sources/schemas.py` — `scan_count`, `last_scan_status`, `last_scan_finished_at` eklendi
- `backend/app/sources/service.py` — `list_sources_with_scan_summary()` eklendi
- `backend/app/sources/router.py` — list endpoint güncellendi
- `frontend/src/api/sourcesApi.ts` — 3 opsiyonel alan eklendi
- `frontend/src/components/sources/SourceScanStatusBadge.tsx` (yeni)
- `frontend/src/components/sources/SourceScanSummary.tsx` (yeni)
- `frontend/src/components/sources/SourcesTable.tsx` — Scans sütunu eklendi
- `frontend/src/tests/source-scan-summary.smoke.test.tsx` (yeni, 10 test)
**Sonuç:** 195 backend test, 303 frontend test — tümü geçti. Build başarılı.

---

## [2026-04-02] Phase 53 — News Bulletin Selected News Summary Frontend Foundation

**Ne:** Registry listesinde her bulletin için seçili haber sayısı sade badge olarak gösterildi.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/modules/news_bulletin/schemas.py` — `selected_news_count` eklendi
- `backend/app/modules/news_bulletin/service.py` — COUNT sorgusu eklendi
- `frontend/src/api/newsBulletinApi.ts` — `selected_news_count?` eklendi
- `frontend/src/components/news-bulletin/NewsBulletinSelectedNewsCountBadge.tsx` (yeni)
- `frontend/src/components/news-bulletin/NewsBulletinSelectedNewsSummary.tsx` (yeni)
- `frontend/src/components/news-bulletin/NewsBulletinsTable.tsx` — Haberler sütunu eklendi
- `frontend/src/tests/news-bulletin-selected-news-summary.smoke.test.tsx` (yeni, 10 test)
**Sonuç:** 195 backend test, 293 frontend test — tümü geçti. Build başarılı.

---

## [2026-04-02] Phase 52 — News Bulletin Artifact Summary Frontend Foundation

**Ne:** Registry listesinde her bulletin için script/metadata varlık bilgisi badge olarak gösterildi.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/modules/news_bulletin/schemas.py` — `has_script`, `has_metadata` eklendi
- `backend/app/modules/news_bulletin/service.py` — `list_news_bulletins_with_artifacts()` eklendi
- `backend/app/modules/news_bulletin/router.py` — list endpoint güncellendi
- `frontend/src/api/newsBulletinApi.ts` — `has_script?`, `has_metadata?` eklendi
- `frontend/src/components/news-bulletin/NewsBulletinArtifactStatusBadge.tsx` (yeni)
- `frontend/src/components/news-bulletin/NewsBulletinArtifactSummary.tsx` (yeni)
- `frontend/src/components/news-bulletin/NewsBulletinsTable.tsx` — Artifacts sütunu eklendi
- `frontend/src/tests/news-bulletin-artifact-summary.smoke.test.tsx` (yeni, 10 test)
**Sonuç:** 195 backend test, 283 frontend test — tümü geçti. Build başarılı.

---

## [2026-04-02] Phase 51 — News Bulletin Used News Warning UI Frontend Foundation

**Ne:** Backend enforcement alanları frontend'e taşındı; selected news listesinde her item için sade warning badge ve detay gösterimi eklendi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/api/newsBulletinApi.ts` — `NewsBulletinSelectedItemResponse`'a 4 opsiyonel enforcement alanı eklendi
- `frontend/src/components/news-bulletin/UsedNewsWarningBadge.tsx` (yeni)
- `frontend/src/components/news-bulletin/UsedNewsWarningDetails.tsx` (yeni)
- `frontend/src/components/news-bulletin/NewsBulletinSelectedItemsPanel.tsx` — warning entegrasyonu
- `frontend/src/tests/news-bulletin-used-news-warning.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-51-news-bulletin-used-news-warning-frontend.md` (yeni)
**Sonuç:** 10 yeni test, 273 toplam frontend test — tümü geçti. Build başarılı.

---

## [2026-04-02] Phase 40 — Admin News Items Registry Frontend Foundation

**Ne:** News items için read-only admin frontend oluşturuldu. Liste (başlık, status badge, kaynak, dil, kategori) + detay akışı.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/api/newsItemsApi.ts` (yeni)
- `frontend/src/hooks/useNewsItemsList.ts` (yeni)
- `frontend/src/hooks/useNewsItemDetail.ts` (yeni)
- `frontend/src/components/news-items/NewsItemsTable.tsx` (yeni)
- `frontend/src/components/news-items/NewsItemDetailPanel.tsx` (yeni)
- `frontend/src/pages/admin/NewsItemsRegistryPage.tsx` (yeni)
- `frontend/src/app/router.tsx` (news-items route eklendi)
- `frontend/src/app/layouts/AdminLayout.tsx` (News Items nav eklendi)
- `frontend/src/tests/news-items-registry.smoke.test.tsx` (8 yeni test)
**Testler:** 8/8 yeni test PASSED | 195/195 toplam PASSED
**Build:** 383.18 kB (tsc + vite build ✅)
**Commit:** `feat: add phase 40 admin news items registry frontend foundation`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-02] Phase 39 — Admin Used News Registry Frontend Foundation

**Ne:** Used news registry için read-only admin frontend oluşturuldu. Liste + detay akışı.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/api/usedNewsApi.ts` (yeni)
- `frontend/src/hooks/useUsedNewsList.ts` (yeni)
- `frontend/src/hooks/useUsedNewsDetail.ts` (yeni)
- `frontend/src/components/used-news/UsedNewsTable.tsx` (yeni)
- `frontend/src/components/used-news/UsedNewsDetailPanel.tsx` (yeni)
- `frontend/src/pages/admin/UsedNewsRegistryPage.tsx` (yeni)
- `frontend/src/app/router.tsx` (used-news route eklendi)
- `frontend/src/app/layouts/AdminLayout.tsx` (Used News nav eklendi)
- `frontend/src/tests/used-news-registry.smoke.test.tsx` (8 yeni test)
**Testler:** 8/8 yeni test PASSED | 187/187 toplam PASSED
**Build:** 378.33 kB (tsc + vite build ✅)
**Commit:** `feat: add phase 39 admin used news registry frontend foundation`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-02] Phase 38 — Admin News Bulletin Selected Items Frontend Foundation

**Ne:** Selected items yönetimi için frontend katmanı oluşturuldu. Panel view/create/edit mod state machine'i, form bileşeni, DetailPanel entegrasyonu.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/api/newsBulletinApi.ts` (selected items API fonksiyonları + tipler eklendi)
- `frontend/src/hooks/useNewsBulletinSelectedItems.ts` (yeni)
- `frontend/src/hooks/useCreateNewsBulletinSelectedItem.ts` (yeni)
- `frontend/src/hooks/useUpdateNewsBulletinSelectedItem.ts` (yeni)
- `frontend/src/components/news-bulletin/NewsBulletinSelectedItemForm.tsx` (yeni)
- `frontend/src/components/news-bulletin/NewsBulletinSelectedItemsPanel.tsx` (yeni)
- `frontend/src/components/news-bulletin/NewsBulletinDetailPanel.tsx` (SelectedItemsPanel eklendi)
- `frontend/src/tests/news-bulletin-selected-items-panel.smoke.test.tsx` (11 yeni test)
- `frontend/src/tests/news-bulletin-form.smoke.test.tsx` (selected-news mock ayrımı eklendi)
**Testler:** 11/11 yeni test PASSED | 179/179 toplam PASSED
**Build:** 374.43 kB (tsc + vite build ✅)
**Commit:** `feat: add phase 38 admin news bulletin selected items frontend foundation`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-02] Phase 37 — News Bulletin Selected Items Backend Foundation

**Ne:** news_bulletin_selected_items tablosu eklendi. Bir news bulletin ile seçilen news item'ları arasında explicit linkage, sıralama ve seçim gerekçesi desteği.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/db/models.py` (NewsBulletinSelectedItem modeli, UniqueConstraint, UniqueConstraint import)
- `backend/alembic/versions/721a304e877f_add_news_bulletin_selected_items_table.py` (yeni)
- `backend/app/modules/news_bulletin/schemas.py` (SelectedItem schemas eklendi)
- `backend/app/modules/news_bulletin/service.py` (SelectedItem service fonksiyonları, IntegrityError handling)
- `backend/app/modules/news_bulletin/router.py` (GET/POST/PATCH selected-news endpoint'leri, 409 handling)
- `backend/tests/test_news_bulletin_selected_items_api.py` (8 yeni test)
**Testler:** 8/8 yeni test PASSED | 174/174 toplam PASSED
**Commit:** `feat: add phase 37 news bulletin selected items backend foundation`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-02] Phase 36 — Admin News Bulletin Metadata Frontend Foundation

**Ne:** News bulletin metadata yönetimi için frontend katmanı oluşturuldu. MetadataPanel view/create/edit mod state machine'i, form bileşeni ve DetailPanel entegrasyonu eklendi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/api/newsBulletinApi.ts` (metadata API fonksiyonları + tipler eklendi)
- `frontend/src/hooks/useNewsBulletinMetadata.ts` (yeni)
- `frontend/src/hooks/useCreateNewsBulletinMetadata.ts` (yeni)
- `frontend/src/hooks/useUpdateNewsBulletinMetadata.ts` (yeni)
- `frontend/src/components/news-bulletin/NewsBulletinMetadataForm.tsx` (yeni)
- `frontend/src/components/news-bulletin/NewsBulletinMetadataPanel.tsx` (yeni)
- `frontend/src/components/news-bulletin/NewsBulletinDetailPanel.tsx` (MetadataPanel entegrasyonu)
- `frontend/src/tests/news-bulletin-metadata-panel.smoke.test.tsx` (11 yeni test)
- `frontend/src/tests/news-bulletin-form.smoke.test.tsx` (metadata URL mock ayrımı eklendi)
**Testler:** 11/11 yeni test PASSED | 167/167 toplam PASSED
**Build:** 368.37 kB (tsc + vite build ✅)
**Commit:** `feat: add phase 36 admin news bulletin metadata frontend foundation`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-02] Phase 35 — Admin News Bulletin Script Frontend Foundation

**Ne:** News bulletin script yönetimi için frontend katmanı oluşturuldu. ScriptPanel view/create/edit mod state machine'i, form bileşeni ve DetailPanel entegrasyonu eklendi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/api/newsBulletinApi.ts` (script API fonksiyonları + tipler eklendi)
- `frontend/src/hooks/useNewsBulletinScript.ts` (yeni)
- `frontend/src/hooks/useCreateNewsBulletinScript.ts` (yeni)
- `frontend/src/hooks/useUpdateNewsBulletinScript.ts` (yeni)
- `frontend/src/components/news-bulletin/NewsBulletinScriptForm.tsx` (yeni)
- `frontend/src/components/news-bulletin/NewsBulletinScriptPanel.tsx` (yeni)
- `frontend/src/components/news-bulletin/NewsBulletinDetailPanel.tsx` (ScriptPanel entegrasyonu)
- `frontend/src/tests/news-bulletin-script-panel.smoke.test.tsx` (9 yeni test)
- `frontend/src/tests/news-bulletin-form.smoke.test.tsx` (fetch mock URL ayrımı düzeltildi)
**Testler:** 9/9 yeni test PASSED | 156/156 toplam PASSED
**Build:** 360.60 kB (tsc + vite build ✅)
**Commit:** `feat: add phase 35 admin news bulletin script frontend foundation`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-02] Phase 34 — News Bulletin Metadata Backend Foundation

**Ne:** NewsBulletinMetadata modeli eklendi, metadata CRUD endpoint'leri news bulletin router'a entegre edildi.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/db/models.py` (NewsBulletinMetadata modeli eklendi)
- `backend/alembic/versions/3d2bdaf23628_add_news_bulletin_metadata_table.py` (yeni)
- `backend/app/modules/news_bulletin/schemas.py` (Metadata schemas eklendi)
- `backend/app/modules/news_bulletin/service.py` (Metadata service fonksiyonları eklendi)
- `backend/app/modules/news_bulletin/router.py` (GET/POST/PATCH /{id}/metadata eklendi)
- `backend/tests/test_news_bulletin_metadata_api.py` (7 yeni test)
- `docs/testing/test-report-phase-34-news-bulletin-metadata-backend.md` (yeni)
**Testler:** 7/7 phase tests PASSED | 166/166 toplam PASSED
**Commit:** `feat: add phase 34 news bulletin metadata backend foundation`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-02] Phase 33 — News Bulletin Script Backend Foundation

**Ne:** NewsBulletinScript modeli eklendi, script CRUD endpoint'leri news bulletin router'a entegre edildi.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/db/models.py` (NewsBulletinScript modeli eklendi)
- `backend/alembic/versions/485edfc2f2b5_add_news_bulletin_scripts_table.py` (yeni)
- `backend/app/modules/news_bulletin/schemas.py` (Script schemas eklendi)
- `backend/app/modules/news_bulletin/service.py` (Script service fonksiyonları eklendi)
- `backend/app/modules/news_bulletin/router.py` (GET/POST/PATCH /{id}/script eklendi)
- `backend/tests/test_news_bulletin_script_api.py` (9 yeni test)
- `docs/testing/test-report-phase-33-news-bulletin-script-backend.md` (yeni)
**Testler:** 9/9 phase tests PASSED | 159/159 toplam PASSED
**Commit:** `feat: add phase 33 news bulletin script backend foundation`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-02] Phase 32 — Admin News Bulletin Create/Edit Frontend

**Ne:** News Bulletin create/edit form eklendi. API genişletildi, mutation hook'ları yazıldı, form component'i oluşturuldu, registry/detail edit mode'a taşındı.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/api/newsBulletinApi.ts` (createNewsBulletin, updateNewsBulletin eklendi)
- `frontend/src/hooks/useCreateNewsBulletin.ts` (yeni)
- `frontend/src/hooks/useUpdateNewsBulletin.ts` (yeni)
- `frontend/src/components/news-bulletin/NewsBulletinForm.tsx` (yeni)
- `frontend/src/components/news-bulletin/NewsBulletinDetailPanel.tsx` (edit mode eklendi)
- `frontend/src/pages/admin/NewsBulletinCreatePage.tsx` (yeni)
- `frontend/src/pages/admin/NewsBulletinRegistryPage.tsx` (+ Yeni butonu, selectedId state)
- `frontend/src/app/router.tsx` (/admin/news-bulletins/new route eklendi)
- `frontend/src/tests/news-bulletin-form.smoke.test.tsx` (8 yeni test)
- `docs/testing/test-report-phase-32-news-bulletin-form-frontend.md` (yeni)
**Testler:** 147/147 passed | build ✅ 354.42 kB
**Commit:** `feat: add phase 32 admin news bulletin create/edit frontend`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-02] Phase 31 — Admin News Bulletin Registry Frontend Foundation

**Ne:** News Bulletin admin sayfası oluşturuldu. API katmanı, hooks, tablo, detail panel, registry sayfası ve sidebar entegrasyonu eklendi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/api/newsBulletinApi.ts` (yeni)
- `frontend/src/hooks/useNewsBulletinsList.ts` (yeni)
- `frontend/src/hooks/useNewsBulletinDetail.ts` (yeni)
- `frontend/src/components/news-bulletin/NewsBulletinsTable.tsx` (yeni)
- `frontend/src/components/news-bulletin/NewsBulletinDetailPanel.tsx` (yeni)
- `frontend/src/pages/admin/NewsBulletinRegistryPage.tsx` (yeni)
- `frontend/src/app/router.tsx` (/admin/news-bulletins route eklendi)
- `frontend/src/app/layouts/AdminLayout.tsx` (News Bulletin nav item eklendi)
- `frontend/src/tests/news-bulletin-registry.smoke.test.tsx` (9 yeni test)
- `docs/testing/test-report-phase-31-news-bulletin-frontend.md` (yeni)
**Testler:** 139/139 passed | build ✅ 347.57 kB
**Commit:** `feat: add phase 31 admin news bulletin registry frontend foundation`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-02] Phase 30 — News Bulletin Backend Foundation

**Ne:** NewsBulletin modeli, migration, schemas, service, router ve 11 test eklendi.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/db/models.py` (NewsBulletin ORM modeli eklendi)
- `backend/alembic/versions/8c913edf5154_add_news_bulletins_table.py` (yeni migration)
- `backend/app/modules/news_bulletin/__init__.py` (yeni)
- `backend/app/modules/news_bulletin/schemas.py` (NewsBulletinCreate, NewsBulletinUpdate, NewsBulletinResponse)
- `backend/app/modules/news_bulletin/service.py` (list/get/create/update)
- `backend/app/modules/news_bulletin/router.py` (/api/v1/modules/news-bulletin CRUD)
- `backend/app/api/router.py` (news_bulletin_router dahil edildi)
- `backend/tests/test_news_bulletin_api.py` (11 yeni test)
- `docs/testing/test-report-phase-30-news-bulletin-backend.md` (yeni)
**Testler:** 11/11 phase tests PASSED | 150/150 toplam PASSED
**Commit:** `feat: add phase 30 news bulletin backend foundation`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-02] Phase 29 — Used News Registry Backend Foundation

**Ne:** UsedNewsRegistry modeli, migration, schemas, service, router ve 14 test eklendi.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/db/models.py` (UsedNewsRegistry ORM modeli eklendi)
- `backend/alembic/versions/3771f6696ce2_add_used_news_registry_table.py` (yeni migration)
- `backend/app/used_news/__init__.py` (yeni)
- `backend/app/used_news/schemas.py` (UsedNewsCreate, UsedNewsUpdate, UsedNewsResponse)
- `backend/app/used_news/service.py` (list/get/create/update; news_item varlık kontrolü)
- `backend/app/used_news/router.py` (/api/v1/used-news CRUD)
- `backend/app/api/router.py` (used_news_router dahil edildi)
- `backend/tests/test_used_news_api.py` (14 yeni test)
- `docs/testing/test-report-phase-29-used-news-backend.md` (yeni)
**Testler:** 14/14 phase tests PASSED | 139/139 toplam PASSED
**Commit:** `feat: add phase 29 used news backend foundation`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-02] Phase 28 — News Items Backend Foundation

**Ne:** NewsItem modeli, migration, schemas, service, router ve 14 test eklendi.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/db/models.py` (NewsItem ORM modeli eklendi)
- `backend/alembic/versions/0ee09dfddce7_add_news_items_table.py` (yeni migration)
- `backend/app/news_items/__init__.py` (yeni)
- `backend/app/news_items/schemas.py` (NewsItemCreate, NewsItemUpdate, NewsItemResponse)
- `backend/app/news_items/service.py` (list/get/create/update)
- `backend/app/news_items/router.py` (/api/v1/news-items CRUD)
- `backend/app/api/router.py` (news_items_router eklendi)
- `backend/tests/test_news_items_api.py` (14 yeni test)
- `docs/testing/test-report-phase-28-news-items-backend.md` (yeni)
**Testler:** 14/14 phase tests PASSED | 125/125 toplam PASSED
**Commit:** `feat: add phase 28 news items backend foundation`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-02] Phase 27 — Admin Source Scans Registry Frontend Foundation

**Ne:** Source scans admin sayfası oluşturuldu. API katmanı, hooks, tablo, detail panel, registry sayfası ve sidebar entegrasyonu eklendi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/api/sourceScansApi.ts` (yeni)
- `frontend/src/hooks/useSourceScansList.ts` (yeni)
- `frontend/src/hooks/useSourceScanDetail.ts` (yeni)
- `frontend/src/components/source-scans/SourceScansTable.tsx` (yeni)
- `frontend/src/components/source-scans/SourceScanDetailPanel.tsx` (yeni)
- `frontend/src/pages/admin/SourceScansRegistryPage.tsx` (yeni)
- `frontend/src/app/router.tsx` (/admin/source-scans route eklendi)
- `frontend/src/app/layouts/AdminLayout.tsx` (Source Scans nav item eklendi)
- `frontend/src/tests/source-scans-registry.smoke.test.tsx` (9 yeni test)
**Testler:** 130/130 passed | build ✅ 343.68 kB
**Commit:** — `feat: add phase 27 admin source scans registry frontend foundation`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-02] Phase 26 — Source Scans Backend Foundation

**Ne:** SourceScan modeli, migration, schemas, service, router ve 14 test eklendi.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/db/models.py` (SourceScan ORM modeli eklendi)
- `backend/alembic/versions/5769e14d7322_add_source_scans_table.py` (yeni migration)
- `backend/app/source_scans/__init__.py` (yeni)
- `backend/app/source_scans/schemas.py` (ScanCreate, ScanUpdate, ScanResponse)
- `backend/app/source_scans/service.py` (list, get, create, update; source existence check)
- `backend/app/source_scans/router.py` (/api/v1/source-scans CRUD)
- `backend/app/api/router.py` (source_scans_router eklendi)
- `backend/tests/test_source_scans_api.py` (14 yeni test)
- `docs/testing/test-report-phase-26-source-scans-backend.md` (yeni)
**Testler:** `pytest` — 14/14 passed | 111/111 toplam passed
**Commit:** — `feat: add phase 26 source scans backend foundation`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-02] Phase 25 — Admin Sources Create and Edit Frontend

**Ne:** Sources create/edit formu eklendi. SourceForm, SourceCreatePage, detail panel edit modu ve mutation hook'ları oluşturuldu.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/api/sourcesApi.ts` (genişletildi: createSource, updateSource)
- `frontend/src/hooks/useCreateSource.ts` (yeni)
- `frontend/src/hooks/useUpdateSource.ts` (yeni)
- `frontend/src/components/sources/SourceForm.tsx` (yeni)
- `frontend/src/pages/admin/SourceCreatePage.tsx` (yeni)
- `frontend/src/components/sources/SourceDetailPanel.tsx` (edit mode eklendi)
- `frontend/src/pages/admin/SourcesRegistryPage.tsx` (+ Yeni Source butonu, selectedId state)
- `frontend/src/app/router.tsx` (/admin/sources/new route eklendi)
- `frontend/src/tests/source-form.smoke.test.tsx` (9 yeni test)
- `docs/testing/test-report-phase-25-source-form-frontend.md` (yeni)
**Testler:** `npm test` — 121 passed (112 mevcut + 9 yeni) | build ✅ 337.20 kB
**Commit:** — `feat: add phase 25 admin sources create and edit frontend`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-02] Phase 24 — Admin Sources Registry Frontend Foundation

**Ne:** Sources admin sayfası oluşturuldu. API katmanı, hooks, tablo, detail panel, registry sayfası ve sidebar entegrasyonu eklendi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/api/sourcesApi.ts` (yeni)
- `frontend/src/hooks/useSourcesList.ts` (yeni)
- `frontend/src/hooks/useSourceDetail.ts` (yeni)
- `frontend/src/components/sources/SourcesTable.tsx` (yeni)
- `frontend/src/components/sources/SourceDetailPanel.tsx` (yeni)
- `frontend/src/pages/admin/SourcesRegistryPage.tsx` (yeni)
- `frontend/src/app/router.tsx` (/admin/sources route eklendi)
- `frontend/src/app/layouts/AdminLayout.tsx` (Sources nav item eklendi)
- `frontend/src/tests/sources-registry.smoke.test.tsx` (9 yeni test)
- `docs/testing/test-report-phase-24-sources-frontend.md` (yeni)
**Testler:** `npm test` — 112 passed (103 mevcut + 9 yeni) | build ✅ 329.75 kB
**Commit:** — `feat: add phase 24 admin sources registry frontend foundation`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-02] Phase 23 — News Source Registry Backend Foundation

**Ne:** NewsSource modeli, migration, schemas, service, router ve API testleri eklendi.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/db/models.py` (NewsSource ORM modeli eklendi)
- `backend/alembic/versions/a1078575e258_add_news_sources_table.py` (yeni migration)
- `backend/app/sources/__init__.py` (yeni)
- `backend/app/sources/schemas.py` (SourceCreate, SourceUpdate, SourceResponse)
- `backend/app/sources/service.py` (list, get, create, update)
- `backend/app/sources/router.py` (/api/v1/sources CRUD)
- `backend/app/api/router.py` (sources_router eklendi)
- `backend/tests/test_sources_api.py` (15 yeni test)
- `docs/testing/test-report-phase-23-sources-backend.md` (yeni)
**Testler:** `pytest` — 15/15 phase test passed | 97/97 toplam passed
**Commit:** — `feat: add phase 23 sources backend foundation`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-02] Phase 22 — Admin Style Blueprints Registry Frontend

**Ne:** Style Blueprints admin sayfası oluşturuldu. API katmanı, hooks, tablo, detail panel, registry sayfası ve sidebar entegrasyonu eklendi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/api/styleBlueprintsApi.ts` (yeni)
- `frontend/src/hooks/useStyleBlueprintsList.ts` (yeni)
- `frontend/src/hooks/useStyleBlueprintDetail.ts` (yeni)
- `frontend/src/components/style-blueprints/StyleBlueprintsTable.tsx` (yeni)
- `frontend/src/components/style-blueprints/StyleBlueprintDetailPanel.tsx` (yeni)
- `frontend/src/pages/admin/StyleBlueprintsRegistryPage.tsx` (yeni)
- `frontend/src/app/router.tsx` (/admin/style-blueprints route eklendi)
- `frontend/src/app/layouts/AdminLayout.tsx` (Style Blueprints nav item eklendi)
- `frontend/src/tests/style-blueprints-registry.smoke.test.tsx` (9 yeni test)
- `docs/testing/test-report-phase-22-style-blueprints-frontend.md` (yeni)
**Testler:** `npm test` — 103 passed (94 mevcut + 9 yeni) | build ✅ 324.25 kB
**Commit:** `4e8f00e` — `feat: add phase 22 admin style blueprints registry frontend`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-02] Phase 21 — Style Blueprint Backend Foundation

**Ne:** StyleBlueprint modeli, migration, schemas, service, router ve API testleri eklendi.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/db/models.py` (StyleBlueprint ORM modeli eklendi)
- `backend/alembic/versions/705dbe9d9ef1_add_style_blueprints_table.py` (yeni migration)
- `backend/app/modules/style_blueprints/__init__.py` (yeni)
- `backend/app/modules/style_blueprints/schemas.py` (Create, Update, Response)
- `backend/app/modules/style_blueprints/service.py` (list, get, create, update)
- `backend/app/modules/style_blueprints/router.py` (GET/POST /style-blueprints, GET/PATCH /{id})
- `backend/app/api/router.py` (style_blueprints_router eklendi)
- `backend/tests/test_style_blueprints_api.py` (11 test)
- `docs/testing/test-report-phase-21-style-blueprints-backend.md` (yeni)
**Testler:** 11/11 style blueprint testi | 82/82 toplam backend test ✅
**Commit:** `e4770cf` — `feat: add phase 21 style blueprint backend foundation`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-02] Phase 20 — Template Create/Edit Form Frontend

**Ne:** Template create sayfası, ortak TemplateForm bileşeni ve detail panel içinde edit mode eklendi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/api/templatesApi.ts` (createTemplate, updateTemplate, payload tipleri eklendi)
- `frontend/src/hooks/useCreateTemplate.ts` (yeni)
- `frontend/src/hooks/useUpdateTemplate.ts` (yeni)
- `frontend/src/components/templates/TemplateForm.tsx` (yeni — ortak form)
- `frontend/src/pages/admin/TemplateCreatePage.tsx` (yeni — /admin/templates/new)
- `frontend/src/components/templates/TemplateDetailPanel.tsx` (edit mode eklendi)
- `frontend/src/pages/admin/TemplatesRegistryPage.tsx` ("+ Yeni Template" butonu eklendi)
- `frontend/src/app/router.tsx` (templates/new route eklendi)
- `frontend/src/tests/template-form.smoke.test.tsx` (10 yeni test)
- `docs/testing/test-report-phase-20-template-form-frontend.md` (yeni)
**Testler:** `npm test` — 94 passed (84 mevcut + 10 yeni) | build ✅ 318.37 kB
**Commit:** `0f87a67` — `feat: add phase 20 admin templates create/edit form frontend`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-02] Phase 19 — Admin Templates Registry Frontend

**Ne:** Templates admin sayfası oluşturuldu. API katmanı, React Query hook'ları, TemplatesTable, TemplateDetailPanel, TemplatesRegistryPage ve sidebar entegrasyonu eklendi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/api/templatesApi.ts` (yeni — fetchTemplates, fetchTemplateById)
- `frontend/src/hooks/useTemplatesList.ts` (yeni)
- `frontend/src/hooks/useTemplateDetail.ts` (yeni)
- `frontend/src/components/templates/TemplatesTable.tsx` (yeni)
- `frontend/src/components/templates/TemplateDetailPanel.tsx` (yeni)
- `frontend/src/pages/admin/TemplatesRegistryPage.tsx` (yeni)
- `frontend/src/app/router.tsx` (/admin/templates route eklendi)
- `frontend/src/app/layouts/AdminLayout.tsx` (Templates nav item eklendi)
- `frontend/src/tests/templates-registry.smoke.test.tsx` (9 yeni test)
- `docs/testing/test-report-phase-19-templates-frontend.md` (yeni)
**Testler:** `npm test` — 84 passed (75 mevcut + 9 yeni) | build ✅ 308.82 kB
**Commit:** `347d104` — `feat: add phase 19 admin templates registry frontend`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-02] Phase 18 — Template Engine Backend Foundation

**Ne:** Template modeli, Alembic migrasyonu, schemas, service, router ve tam API test seti eklendi.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/db/models.py` (Template ORM modeli eklendi)
- `backend/alembic/versions/2e7eb44ff9c8_add_templates_table.py` (yeni migration)
- `backend/app/modules/templates/__init__.py` (yeni)
- `backend/app/modules/templates/schemas.py` (TemplateCreate, TemplateUpdate, TemplateResponse)
- `backend/app/modules/templates/service.py` (list, get, create, update)
- `backend/app/modules/templates/router.py` (GET/POST /templates, GET/PATCH /templates/{id})
- `backend/app/api/router.py` (templates_router eklendi)
- `backend/tests/test_templates_api.py` (11 yeni test)
- `docs/testing/test-report-phase-18-templates-backend.md` (yeni)
**Testler:** 11/11 template testi geçti | 71 toplam backend test ✅
**Commit:** `3be3e13` — `feat: add phase 18 templates backend foundation`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-01] Phase 17 — Admin Standard Video Metadata Frontend

**Ne:** Standard Video detail sayfasında metadata artifact için tam create/edit UI eklendi. ArtifactsPanel kaldırılıp yerine bağımsız ScriptPanel + MetadataPanel konuldu.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/api/standardVideoApi.ts` (metadata create/update payloads ve fonksiyonlar eklendi)
- `frontend/src/hooks/useCreateStandardVideoMetadata.ts` (yeni)
- `frontend/src/hooks/useUpdateStandardVideoMetadata.ts` (yeni)
- `frontend/src/components/standard-video/StandardVideoMetadataPanel.tsx` (yeni)
- `frontend/src/pages/admin/StandardVideoDetailPage.tsx` (metadata panel entegre edildi, ArtifactsPanel kaldırıldı)
- `frontend/src/tests/standard-video-metadata-panel.smoke.test.tsx` (12 yeni test)
- `frontend/src/tests/standard-video-detail-page.smoke.test.tsx` (2 test güncellendi)
- `docs/testing/test-report-phase-17-standard-video-metadata-frontend.md` (yeni)
**Testler:** `npm test` — 75 passed (63 mevcut + 12 yeni) | build ✅ 301.46 kB
**Commit:** `320da4b` — `feat: add phase 17 admin standard video metadata frontend`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-01] Phase 16 — Admin Standard Video Script Frontend Foundation

**Ne:** Standard Video detail sayfasında script artifact için tam create/edit UI eklendi. Loading, error, empty, read, create, edit durumları destekleniyor.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/api/standardVideoApi.ts` (`StandardVideoScriptCreatePayload`, `StandardVideoScriptUpdatePayload`, `createStandardVideoScript`, `updateStandardVideoScript` eklendi)
- `frontend/src/hooks/useCreateStandardVideoScript.ts` (yeni)
- `frontend/src/hooks/useUpdateStandardVideoScript.ts` (yeni)
- `frontend/src/components/standard-video/StandardVideoScriptPanel.tsx` (yeni)
- `frontend/src/pages/admin/StandardVideoDetailPage.tsx` (script panel entegre edildi)
- `frontend/src/tests/standard-video-script-panel.smoke.test.tsx` (13 yeni test)
- `frontend/src/tests/standard-video-detail-page.smoke.test.tsx` (getByText → getAllByText düzeltmesi)
- `docs/testing/test-report-phase-16-standard-video-script-frontend.md` (yeni)
**Testler:** `npm test` — 63 passed (50 mevcut + 13 yeni) | build ✅ 294.76 kB
**Commit:** `267cc92` — `feat: add phase 16 admin standard video script frontend foundation`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-01] Phase 15 — Standard Video Create/Edit Frontend

**Ne:** Standard Video create ve edit UI eklendi. Yeniden kullanılabilir form bileşeni, create sayfası, detail sayfasına edit modu, `/admin/standard-videos/new` route ve liste sayfasına "Yeni Standard Video" butonu eklendi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/api/standardVideoApi.ts` (`StandardVideoCreatePayload`, `StandardVideoUpdatePayload`, `createStandardVideo`, `updateStandardVideo` eklendi)
- `frontend/src/hooks/useCreateStandardVideo.ts` (yeni)
- `frontend/src/hooks/useUpdateStandardVideo.ts` (yeni)
- `frontend/src/components/standard-video/StandardVideoForm.tsx` (yeni)
- `frontend/src/pages/admin/StandardVideoCreatePage.tsx` (yeni)
- `frontend/src/pages/admin/StandardVideoDetailPage.tsx` (edit modu eklendi)
- `frontend/src/app/router.tsx` (`/admin/standard-videos/new` rotası eklendi)
- `frontend/src/pages/admin/StandardVideoRegistryPage.tsx` (Yeni butonu eklendi)
- `frontend/src/tests/standard-video-form.smoke.test.tsx` (6 yeni test)
- `docs/testing/test-report-phase-15-standard-video-form-frontend.md` (yeni)
**Testler:** `npm test` — 50 passed (44 mevcut + 6 yeni) | build ✅ 287.99 kB
**Commit:** `1fb66eb` — `feat: add phase 15 standard video create/edit frontend`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-01] Phase 14 — Standard Video Admin Frontend

**Ne:** Standard Video admin registry ve detail sayfaları eklendi. API katmanı, hooks, tablo, overview/artifacts panelleri ve rotalar kuruldu.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/api/standardVideoApi.ts` (yeni)
- `frontend/src/hooks/useStandardVideosList.ts` (yeni)
- `frontend/src/hooks/useStandardVideoDetail.ts` (yeni)
- `frontend/src/components/standard-video/StandardVideosTable.tsx` (yeni)
- `frontend/src/components/standard-video/StandardVideoOverviewPanel.tsx` (yeni)
- `frontend/src/components/standard-video/StandardVideoArtifactsPanel.tsx` (yeni)
- `frontend/src/pages/admin/StandardVideoRegistryPage.tsx` (yeni)
- `frontend/src/pages/admin/StandardVideoDetailPage.tsx` (yeni)
- `frontend/src/app/router.tsx` (standard-videos rotaları eklendi)
- `frontend/src/app/layouts/AdminLayout.tsx` (Standard Video nav linki eklendi)
- `frontend/src/tests/standard-video-registry.smoke.test.tsx` (5 yeni test)
- `frontend/src/tests/standard-video-detail-page.smoke.test.tsx` (6 yeni test)
- `docs/testing/test-report-phase-14-standard-video-admin-frontend.md` (yeni)
**Testler:** `npm test` — 44 passed (33 mevcut + 11 yeni) | build ✅ 278.36 kB
**Commit:** `b03fb8d` — `feat: add phase 14 standard video admin frontend`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-01] Phase 13 — Standard Video Metadata Backend Foundation

**Ne:** Standard Video için metadata artifact backend'i kuruldu. `standard_video_metadata` tablosu, metadata CRUD API ve 8 yeni test eklendi.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/db/models.py` (`StandardVideoMetadata` modeli eklendi)
- `backend/app/modules/standard_video/schemas.py` (metadata şemaları eklendi)
- `backend/app/modules/standard_video/service.py` (metadata servis fonksiyonları eklendi)
- `backend/app/modules/standard_video/router.py` (metadata endpoint'leri eklendi)
- `backend/alembic/versions/f96474c7ec08_add_standard_video_metadata_table.py` (yeni)
- `backend/tests/test_standard_video_metadata_api.py` (8 yeni test)
- `docs/testing/test-report-phase-13-standard-video-metadata-backend.md` (yeni)
**Testler:** `pytest` — 60 passed (52 mevcut + 8 yeni) in ~0.33s
**Commit:** `6cc17c5` — `feat: add phase 13 standard video metadata backend foundation`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-01] Phase 12 — Standard Video Script Backend Foundation

**Ne:** Standard Video için script artifact backend'i kuruldu. `standard_video_scripts` tablosu, script CRUD API ve 8 yeni test eklendi.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/db/models.py` (`StandardVideoScript` modeli eklendi)
- `backend/app/modules/standard_video/schemas.py` (script şemaları eklendi)
- `backend/app/modules/standard_video/service.py` (script servis fonksiyonları eklendi)
- `backend/app/modules/standard_video/router.py` (script endpoint'leri eklendi)
- `backend/alembic/versions/2472507548c3_add_standard_video_scripts_table.py` (yeni)
- `backend/tests/test_standard_video_script_api.py` (8 yeni test)
- `docs/testing/test-report-phase-12-standard-video-script-backend.md` (yeni)
**Testler:** `pytest` — 52 passed (44 mevcut + 8 yeni) in ~0.36s
**Commit:** `849ec84` — `feat: add phase 12 standard video script backend foundation`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-01] Phase 11 — Standard Video Backend Input Foundation

**Ne:** Standard Video modülü için backend input foundation kuruldu. `standard_videos` tablosu, CRUD API ve 8 yeni test eklendi.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/db/models.py` (`StandardVideo` modeli eklendi)
- `backend/app/modules/__init__.py` (yeni)
- `backend/app/modules/standard_video/__init__.py` (yeni)
- `backend/app/modules/standard_video/schemas.py` (yeni — Create/Update/Response)
- `backend/app/modules/standard_video/service.py` (yeni — list/get/create/update)
- `backend/app/modules/standard_video/router.py` (yeni — GET/POST/PATCH)
- `backend/app/api/router.py` (standard_video_router eklendi)
- `backend/alembic/versions/bf791934579f_add_standard_videos_table.py` (yeni)
- `backend/tests/test_standard_video_api.py` (8 yeni test)
- `docs/testing/test-report-phase-11-standard-video-backend.md` (yeni)
**Testler:** `pytest` — 44 passed (36 mevcut + 8 yeni) in ~0.22s
**Commit:** `f4a0aa4` — `feat: add phase 11 standard video backend input foundation`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-01] Phase 10 — Job Detail Page

**Ne:** Job detayı side panel'den çıkarılıp ayrı `/admin/jobs/:jobId` sayfasına taşındı. JobOverviewPanel, JobTimelinePanel, JobSystemPanels eklendi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/pages/admin/JobDetailPage.tsx` (yeni)
- `frontend/src/components/jobs/JobOverviewPanel.tsx` (yeni)
- `frontend/src/components/jobs/JobTimelinePanel.tsx` (yeni)
- `frontend/src/components/jobs/JobSystemPanels.tsx` (yeni)
- `frontend/src/app/router.tsx` (`/admin/jobs/:jobId` eklendi)
- `frontend/src/pages/admin/JobsRegistryPage.tsx` (navigate eklendi)
- `frontend/src/tests/job-detail-page.smoke.test.tsx` (5 yeni test)
- `frontend/src/tests/jobs-registry.smoke.test.tsx` (güncellendi)
**Testler:** `npm test` — 33 passed (4+5+5+7+7+5) in ~4.5s
**Commit:** `956e862` — `feat: add phase 10 job detail page with overview timeline and system panels`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-01] Phase 9 — Elapsed Time & ETA Frontend Display

**Ne:** formatDuration helper (Türkçe, saf fonksiyon), DurationBadge component, elapsed/ETA alanları jobs UI'da okunabilir formatla gösteriliyor.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/lib/formatDuration.ts` (yeni)
- `frontend/src/components/jobs/DurationBadge.tsx` (yeni)
- `frontend/src/components/jobs/JobDetailPanel.tsx` (DurationBadge ile elapsed/ETA)
- `frontend/src/components/jobs/JobStepsList.tsx` (formatDuration ile step elapsed)
- `frontend/src/components/jobs/JobsTable.tsx` (elapsed sütunu eklendi)
- `frontend/src/tests/format-duration.test.ts` (7 unit test)
- `frontend/src/tests/jobs-registry.smoke.test.tsx` (2 yeni test)
- `docs/testing/test-report-phase-9-eta-frontend.md`
**Testler:** `npm test` — 28 passed (4+5+5+7+7) in ~3s
**Commit:** `8aa3ab4` — `feat: add phase 9 elapsed time and eta frontend display`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-01] Phase 8 — Admin Jobs Registry Frontend Foundation

**Ne:** Admin panelde job kayıtlarını backend'den listeleme ve tekil job + step detayı görüntüleme.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/api/jobsApi.ts`, `hooks/useJobsList.ts`, `hooks/useJobDetail.ts`
- `frontend/src/components/jobs/JobsTable.tsx`, `JobDetailPanel.tsx`, `JobStepsList.tsx`
- `frontend/src/pages/admin/JobsRegistryPage.tsx`
- `frontend/src/app/router.tsx` (`/admin/jobs` eklendi)
- `frontend/src/app/layouts/AdminLayout.tsx` (Jobs linki aktif)
- `frontend/src/tests/jobs-registry.smoke.test.tsx` (5 yeni test)
- `docs/testing/test-report-phase-8-jobs-frontend.md`
**Testler:** `npm test` — 19 passed (4+5+5+5) in ~3s
**Commit:** `2d29037` — `feat: add phase 8 admin jobs registry frontend foundation`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-01] Phase 7 — Job Engine Backend Foundation

**Ne:** Job ve JobStep first-class backend objeler olarak eklendi. Alembic migration, service katmanı, CRUD API (GET list, GET detail, POST create).
**Eklenen/değiştirilen dosyalar:**
- `backend/app/db/models.py` (`Job`, `JobStep` modelleri eklendi)
- `backend/app/jobs/__init__.py`, `schemas.py`, `service.py`, `router.py`
- `backend/app/api/router.py` (jobs_router bağlandı)
- `backend/alembic/versions/f67997a06ef5_add_jobs_and_job_steps_tables.py`
- `backend/tests/test_jobs_api.py` (8 yeni test)
- `docs/testing/test-report-phase-7-jobs-backend.md`
**Testler:** `pytest tests/` — 36 passed in 0.16s
**Commit:** `a6a1848` — `feat: add phase 7 job engine backend foundation`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-01] Phase 6 Integration Check — Frontend-Backend Alignment

**Ne:** Frontend API path'leri backend endpoint'leriyle tam uyumlu doğrulandı. Vite dev proxy eklendi (`/api` → `http://127.0.0.1:8000`). Manuel curl doğrulaması yapıldı.
**Eklenen/değiştirilen dosyalar:**
- `frontend/vite.config.ts` — `server.proxy` eklendi
- `docs/testing/test-report-phase-6-integration-check.md`
**Testler:** 28 backend + 14 frontend = 42 passed
**Commit:** `04c7cf9` — `fix: align frontend admin registries with real backend endpoints`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-01] Phase 6 — Admin Visibility Registry Frontend

**Ne:** Admin panelde visibility kurallarını backend'den listeleme ve tekil detay görüntüleme. API katmanı, React Query hooks, VisibilityRegistryPage, VisibilityRulesTable, VisibilityRuleDetailPanel.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/api/visibilityApi.ts`
- `frontend/src/hooks/useVisibilityRulesList.ts`, `useVisibilityRuleDetail.ts`
- `frontend/src/pages/admin/VisibilityRegistryPage.tsx`
- `frontend/src/components/visibility/VisibilityRulesTable.tsx`, `VisibilityRuleDetailPanel.tsx`
- `frontend/src/app/router.tsx` (`/admin/visibility` route eklendi)
- `frontend/src/app/layouts/AdminLayout.tsx` (Visibility linki aktif)
- `frontend/src/tests/visibility-registry.smoke.test.tsx` (5 yeni test)
- `frontend/src/tests/settings-registry.smoke.test.tsx` (`global.fetch` → `window.fetch` düzeltmesi)
- `docs/testing/test-report-phase-6-visibility-frontend.md`
**Testler:** `npm test` — 14 passed (4 + 5 + 5) in 777ms
**Commit:** `f291944` — `feat: add phase 6 admin visibility registry frontend foundation`
**Push:** ✓ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-01] Phase 5 — Admin Settings Registry Frontend

**Ne:** Admin panelde ayarları backend'den listeleme ve tekil detay görüntüleme. React Query entegrasyonu, API katmanı, hooks, SettingsRegistryPage, SettingsTable, SettingDetailPanel.
**Eklenen/değiştirilen dosyalar:**
- `frontend/package.json` (`@tanstack/react-query` eklendi)
- `frontend/src/api/settingsApi.ts`
- `frontend/src/hooks/useSettingsList.ts`, `useSettingDetail.ts`
- `frontend/src/pages/admin/SettingsRegistryPage.tsx`
- `frontend/src/components/settings/SettingsTable.tsx`, `SettingDetailPanel.tsx`
- `frontend/src/app/router.tsx` (`/admin/settings` route eklendi)
- `frontend/src/app/layouts/AdminLayout.tsx` (Settings linki aktif)
- `frontend/src/app/App.tsx` (`QueryClientProvider` eklendi)
- `frontend/src/tests/settings-registry.smoke.test.tsx` (5 yeni test)
- `docs/testing/test-report-phase-5-settings-frontend.md`
**Testler:** `npm test` — 9 passed (4 eski + 5 yeni) in 827ms
**Commit:** `318f262` — `feat: add phase 5 admin settings registry frontend foundation`
**Push:** ✓ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-01] Phase 4 — Visibility Engine Backend Temeli

**Ne:** Görünürlük kuralları (`visibility_rules`) first-class backend objesi olarak kuruldu. VisibilityRule modeli, Pydantic schema'ları, service katmanı, FastAPI CRUD router, Alembic migration. `test_settings_api.py` testlerinde paylaşılan DB üzerinde oluşan unique key çakışması `_uid()` suffix ile düzeltildi.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/db/models.py` (`VisibilityRule` modeli eklendi)
- `backend/app/visibility/__init__.py`
- `backend/app/visibility/schemas.py` (VisibilityRuleCreate, VisibilityRuleUpdate, VisibilityRuleResponse)
- `backend/app/visibility/service.py` (list, get, create, update)
- `backend/app/visibility/router.py` (GET /visibility-rules, GET /visibility-rules/{id}, POST /visibility-rules, PATCH /visibility-rules/{id})
- `backend/app/api/router.py` (visibility router bağlandı)
- `backend/alembic/versions/de267292b2ab_add_visibility_rules_table.py`
- `backend/tests/test_visibility_api.py` (11 yeni test)
- `backend/tests/test_settings_api.py` (key çakışması düzeltmesi)
- `docs/testing/test-report-phase-4-visibility-backend.md`
**Testler:** `pytest tests/test_visibility_api.py tests/test_settings_api.py tests/test_health.py tests/test_db_bootstrap.py` — 28 passed in 0.09s
**Commit:** `3966990` — `feat: add phase 4 backend visibility registry foundation`
**Push:** ✓ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-01] Doküman Türkçeleştirme

**Ne:** Repository genelindeki İngilizce dokümantasyon Türkçeye çevrildi. `CLAUDE.md` istisna olarak İngilizce bırakıldı.
**Değiştirilen dosyalar:**
- `README.md`
- `renderer/README.md`
- `docs/architecture/README.md`
- `docs/testing/README.md`
- `docs/testing/test-report-phase-1-backend.md`
- `docs/testing/test-report-phase-1-frontend.md`
- `docs/testing/test-report-phase-1-renderer.md`
- `docs/testing/test-report-phase-2-panel-shell.md`
- `docs/testing/test-report-phase-2-db-foundation.md`
- `docs/testing/test-report-phase-3-settings-backend.md`
- `docs/tracking/STATUS.md`
- `docs/tracking/CHANGELOG.md`
**Testler:** Yok (doküman değişikliği)
**Commit:** `84c4661` — `docs: turkcelestir repository dokumantasyonu`
**Push:** ✓ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-01] Phase 3 — Settings Registry Backend

**Ne:** Settings veritabanı yönetimli ürün objeleri haline getirildi. Tam metadata alanlarına sahip Setting modeli, Pydantic schema'ları (oluştur/güncelle/yanıt), service katmanı, api_router'a bağlı FastAPI router, Alembic migration.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/db/models.py` (`Setting` modeli eklendi)
- `backend/app/settings/__init__.py`
- `backend/app/settings/schemas.py` (SettingCreate, SettingUpdate, SettingResponse)
- `backend/app/settings/service.py` (list, get, create, update)
- `backend/app/settings/router.py` (GET /settings, GET /settings/{id}, POST /settings, PATCH /settings/{id})
- `backend/app/api/router.py` (settings router bağlandı)
- `backend/alembic/versions/f0dea9dfd155_add_settings_table.py`
- `backend/tests/test_settings_api.py` (9 yeni test)
- `docs/testing/test-report-phase-3-settings-backend.md`
**Testler:** `pytest tests/test_settings_api.py tests/test_health.py tests/test_db_bootstrap.py` — 17 passed in 0.06s
**Commit:** `b370e24` — `feat: add phase 3 backend settings registry foundation`
**Push:** ✓ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-01] Phase 2 — Backend Veritabanı Temeli

**Ne:** WAL modu, SQLAlchemy 2.0 async engine, Alembic migration pipeline ve üç bootstrap tablosunu içeren SQLite veritabanı temeli (app_state, audit_logs, users).
**Eklenen/değiştirilen dosyalar:**
- `backend/pyproject.toml` (sqlalchemy, aiosqlite, alembic, greenlet eklendi)
- `backend/app/core/config.py` (database_url ve database_url_sync özellikleri eklendi)
- `backend/app/db/base.py` (DeclarativeBase)
- `backend/app/db/models.py` (AppState, AuditLog, User modelleri)
- `backend/app/db/session.py` (WAL + FK pragma event listener ile async engine)
- `backend/alembic.ini` (başlatıldı)
- `backend/alembic/env.py` (uygulama ayarları ve metadata kullanacak şekilde yeniden yazıldı)
- `backend/alembic/versions/e7dc18c0bcfb_initial_foundation_tables.py` (otomatik migration)
- `backend/data/.gitkeep` (fresh checkout'ta backend/data/ dizinini garantiler)
- `backend/tests/test_db_bootstrap.py` (6 yeni async test)
- `docs/testing/test-report-phase-2-db-foundation.md`
**Testler:** `pytest tests/test_db_bootstrap.py tests/test_health.py` — 8 passed in 0.14s
**Commit:** `0fb487d` — `feat: add phase 2 backend database foundation with sqlite and alembic`
**Push:** ✓ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-01] Phase 2 — Frontend Panel Shell

**Ne:** Toggle tabanlı uygulama shell'i gerçek react-router-dom routing ile değiştirildi. Header ve sidebar içeren Admin ve User layout'ları. Route yapısı: `/admin`, `/user`, `/` → `/user`'a yönlendirme.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/app/router.tsx`
- `frontend/src/app/layouts/AdminLayout.tsx`, `UserLayout.tsx`
- `frontend/src/components/layout/AppHeader.tsx`, `AppSidebar.tsx`
- `frontend/src/app/App.tsx` (güncellendi)
- `frontend/src/pages/AdminOverviewPage.tsx`, `UserDashboardPage.tsx` (küçük güncellemeler)
- `frontend/src/tests/app.smoke.test.tsx` (routing için yeniden yazıldı)
- `frontend/package.json` (react-router-dom eklendi)
- `docs/testing/test-report-phase-2-panel-shell.md`
**Testler:** `npm test` — 4 passed in 433ms
**Commit:** `943ac13` — `feat: add phase 2 frontend panel shell and basic routing`
**Push:** ✓ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-01] Phase 1 — Renderer & Workspace İskeleti

**Ne:** Gelecekteki Remotion entegrasyonu için renderer dizin iskeleti. Workspace klasör yapısı .gitkeep ile git'te izleniyor. .gitignore workspace yapısına izin verirken çalışma zamanı içeriğini görmezden gelecek şekilde güncellendi.
**Eklenen/değiştirilen dosyalar:**
- `renderer/README.md`
- `renderer/src/compositions/.gitkeep`, `renderer/src/shared/.gitkeep`, `renderer/tests/.gitkeep`
- `workspace/jobs/.gitkeep`, `workspace/exports/.gitkeep`, `workspace/temp/.gitkeep`
- `.gitignore` (workspace negation kuralları)
- `docs/testing/test-report-phase-1-renderer.md`
**Testler:** Kod testi yok — yalnızca yapısal doğrulama
**Commit:** `48a1d50` — `chore: add phase 1 renderer and workspace skeleton`
**Push:** ✓ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-01] Phase 1 — Frontend İskeleti

**Ne:** Uygulama shell'i (Admin/User geçişi), iki sayfa taslağı, 3 smoke test geçiyor, build temiz olan React + Vite + TypeScript iskeleti.
**Eklenen dosyalar:**
- `frontend/package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `index.html`
- `frontend/src/main.tsx`
- `frontend/src/app/App.tsx`
- `frontend/src/pages/AdminOverviewPage.tsx`, `UserDashboardPage.tsx`
- `frontend/src/tests/app.smoke.test.tsx`
- `docs/testing/test-report-phase-1-frontend.md`
**Testler:** `npm test` (vitest run) — 3 passed in 589ms
**Commit:** `340006e` — `chore: add phase 1 frontend skeleton with basic app shell`
**Push:** ✓ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-01] Phase 1 — Backend İskeleti

**Ne:** Health endpoint, config, logging, db placeholder, testler ve hafif tracking dokümantasyonunu içeren FastAPI backend iskeleti.
**Eklenen/değiştirilen dosyalar:**
- `backend/pyproject.toml`
- `backend/app/main.py`, `__init__.py`
- `backend/app/api/health.py`, `router.py`, `__init__.py`
- `backend/app/core/config.py`, `logging.py`, `__init__.py`
- `backend/app/db/session.py`, `__init__.py`
- `backend/tests/conftest.py`, `test_health.py`
- `data/.gitkeep`
- `docs/tracking/STATUS.md`, `CHANGELOG.md`
- `docs/testing/test-report-phase-1-backend.md`
**Testler:** `pytest backend/tests/test_health.py` — 2 passed in 0.01s
**Commit:** `d7edb9a` — `chore: add phase 1 backend skeleton and lightweight tracking docs`
**Push:** ✓ Remote SSH'a geçildi. `git@github.com:huskobro/contenthub.git`

---

## [2026-04-01] Phase 0 — Repo Başlatma & Doküman İskeleti

**Ne:** Git repository başlatıldı, proje temel dokümanları eklendi.
**Dosyalar:** `.gitignore`, `README.md`, `CLAUDE.md`, `docs/architecture/README.md`, `docs/testing/README.md`, `docs/decisions/.gitkeep`, `docs/phases/.gitkeep`
**Testler:** Yok (kod yok)
**Commit:** `2e0c3ba` — `chore: initialize repository with docs skeleton and project baseline`
**Push:** Remote henüz tanımlanmamıştı
