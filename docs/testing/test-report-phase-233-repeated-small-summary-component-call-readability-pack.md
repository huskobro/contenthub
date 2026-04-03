# Test Report — Phase 233: Repeated Small Summary Component Call Readability Pack

**Tarih:** 2026-04-03
**Faz:** 233
**Başlık:** Repeated Small Summary Component Call Readability Pack

---

## Amaç

Table/Panel/Detail bileşenlerinde aynı dosya içinde tekrar eden summary component çağrılarını tespit etmek; aynı props pattern'inin 3+ kez tekrar ettiği yerlerde okunabilirliği artıran küçük extraction düzeltmeleri yapmak.

---

## Audit Özeti

### Gözden Geçirilen Dosyalar

**Table dosyaları (13):** `StandardVideosTable`, `UsedNewsTable`, `NewsBulletinsTable`, `SourceScansTable`, `NewsItemsTable`, `TemplateStyleLinksTable`, `JobsTable`, `SourcesTable`, `TemplatesTable`, `StyleBlueprintsTable`, `SettingsTable`, `VisibilityRulesTable`, `NewsItemPickerTable`

**Panel dosyaları (21):** `VisibilityRuleDetailPanel`, `SettingDetailPanel`, `JobOverviewPanel`, `JobDetailPanel`, `NewsBulletinSelectedItemsPanel`, `StandardVideoScriptPanel`, `StandardVideoMetadataPanel`, `StandardVideoOverviewPanel`, `StandardVideoArtifactsPanel`, `NewsBulletinDetailPanel`, `NewsBulletinScriptPanel`, `NewsBulletinMetadataPanel`, `SourceDetailPanel`, `SourceScanDetailPanel`, `JobTimelinePanel`, `JobSystemPanels`, `TemplateDetailPanel`, `StyleBlueprintDetailPanel`, `TemplateStyleLinkDetailPanel`, `UsedNewsDetailPanel`, `NewsItemDetailPanel`

**Detail dosyaları:** Yukarıdaki Panel dosyalarıyla örtüşüyor.

---

### Bulgular

#### Table Dosyaları — Summary Component Çağrıları

| Dosya | Pattern | Değerlendirme |
|---|---|---|
| `StandardVideosTable.tsx` | 7 farklı `StandardVideo*Summary` component | Her biri farklı component — aynı component tekrar etmiyor |
| `UsedNewsTable.tsx` | 8 farklı `UsedNews*Summary` component | Her biri farklı component — aynı component tekrar etmiyor |
| `NewsBulletinsTable.tsx` | 11 farklı `NewsBulletin*Summary` component | Her biri farklı component — aynı component tekrar etmiyor |
| `SourceScansTable.tsx` | 9 farklı `SourceScan*Summary` component | Her biri farklı component — aynı component tekrar etmiyor |
| `NewsItemsTable.tsx` | 12 farklı `NewsItem*Summary` component | Her biri farklı component — aynı component tekrar etmiyor |
| `TemplateStyleLinksTable.tsx` | 1× `TemplateStyleLinkReadinessSummary` | Sadece 1× — threshold altı |
| `JobsTable.tsx` | `JobContextSummary` import var | Tabloda çağrı sayısı max 1-2× |
| Diğer tablolar | Summary import yok | — |

#### Panel Dosyaları — Local Badge/Helper Çağrıları

| Dosya | Pattern | Tekrar | Değerlendirme |
|---|---|---|---|
| `VisibilityRuleDetailPanel.tsx` | `<BoolBadge value={data.X} />` | 3× (visible, read_only, wizard_visible) | Local helper, farklı field — standart kullanım |
| `SettingDetailPanel.tsx` | `<BoolBadge value={data.X} />` | 4× (user_override_allowed, visible_to_user, visible_in_wizard, read_only_for_user) | Local helper, farklı field — standart kullanım |
| `JobOverviewPanel.tsx` | `<DurationBadge seconds={job.X} />` | 2× (elapsed, estimated_remaining) | Threshold altı |
| `JobDetailPanel.tsx` | `<DurationBadge seconds={data.X} />` | 2× | Threshold altı |
| `NewsBulletinSelectedItemsPanel.tsx` | `<UsedNewsWarningBadge warning={...} />` | 1× | Threshold altı |
| Diğer Panel dosyaları | Summary/Badge import yok | — | — |

---

### BoolBadge Detay — VisibilityRuleDetailPanel ve SettingDetailPanel

`BoolBadge` her iki dosyada da **local helper function** olarak tanımlı (aynı dosyada `function BoolBadge(...)`).

- `VisibilityRuleDetailPanel`: 3× çağrı — her biri farklı field (`data.visible`, `data.read_only`, `data.wizard_visible`)
- `SettingDetailPanel`: 4× çağrı — her biri farklı field (`data.user_override_allowed`, `data.visible_to_user`, `data.visible_in_wizard`, `data.read_only_for_user`)

Teknik threshold karşılanıyor (3+/4×), ancak:
- Her çağrı farklı field adı alıyor — içerik aynı değil
- BoolBadge zaten bir helper component — bu tam olarak "3× aynı pattern" değil, her çağrı farklı `data.field` ile semantik olarak bağımsız
- `<BoolBadge value={data.X} />` şeklinde bir helper çağrısı, React'te standart helper/presenter component kullanımı
- Extraction ile `[data.visible, data.read_only, data.wizard_visible].map(v => <BoolBadge value={v} />)` şeklinde bir yapı oluşturmak `<Row label>` paketini kaybettirir — bilgi kaybı yaratır

**Sonuç:** Extraction semantically inappropriate. Her `<Row label="X"><BoolBadge value={data.X} /></Row>` tuple benzersiz (farklı label + farklı field).

### Table Summary Component Çağrıları — Detay

Tüm Table dosyalarında her `<td>` içinde farklı bir Summary component kullanılıyor:
- `<StandardVideoReadinessSummary topic={v.topic} status={v.status} />`
- `<StandardVideoArtifactSummary hasScript={v.has_script} hasMetadata={v.has_metadata} />`
- `<StandardVideoInputQualitySummary topic={v.topic} brief={v.brief} ... />`
- vs.

Aynı component 3+ kez tekrar etmiyor. Her hücre farklı Summary component. Extraction için kriter: **aynı component adı** + **aynı props pattern** — bu karşılanmıyor.

---

### Karar: Audit-Only

**Sebep:**
- Table dosyalarında her Summary component çağrısı farklı component adı taşıyor — aynı component 3+ tekrar etmiyor
- Panel dosyalarında `BoolBadge` 3-4× çağrılıyor fakat her çağrı farklı field + farklı label — extraction bilgi kaybı yaratır
- `DurationBadge` max 2× — threshold altı
- Summary/Badge call-site'larını loop'a almak `<Row label>` bilgisini kaybettirir

**Sonuç:** Hiçbir dosyada değişiklik yapılmadı.

---

## Yapılan Değişiklikler

**Hiçbir dosyada değişiklik yapılmadı.**

---

## Çalıştırılan Komutlar

- `tsc --noEmit` ✅ Temiz
- `vitest run` ✅ 127/127, 1587/1587
- `vite build` ✅ Temiz

## Test Sonuçları

| Kategori | Sonuç |
|---|---|
| tsc --noEmit | ✅ Temiz |
| vitest run | ✅ 127/127, 1587/1587 |
| vite build | ✅ Temiz |

---

## Bilerek Yapılmayanlar

- `BoolBadge` çağrıları loop'a dönüştürülmedi — her çağrı farklı label + farklı field, extraction bilgi kaybı yaratır
- Table Summary component çağrıları soyutlanmadı — her biri farklı component adı
- Cross-file BoolBadge shared component kurulmadı — her dosyada local tanımlı, farklı kontekst

## Riskler

Yok.
