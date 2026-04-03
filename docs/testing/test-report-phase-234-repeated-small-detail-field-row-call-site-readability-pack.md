# Test Report — Phase 234: Repeated Small Detail Field/Row Call-Site Readability Pack

**Tarih:** 2026-04-03
**Faz:** 234
**Başlık:** Repeated Small Detail Field/Row Call-Site Readability Pack

---

## Amaç

Detail/Overview panel bileşenlerinde aynı dosya içinde tekrar eden `<Field>` veya `<Row>` çağrı pattern'larını tespit etmek; okunabilirliği artıran küçük local const/helper extraction fırsatlarını değerlendirmek.

---

## Audit Özeti

### Gözden Geçirilen Dosyalar

**Detail Panel dosyaları (11):**
- `VisibilityRuleDetailPanel.tsx` — 11× `<Row>`
- `SettingDetailPanel.tsx` — 13× `<Row>`
- `TemplateStyleLinkDetailPanel.tsx` — 8× `<Row>`/`<Field>`
- `UsedNewsDetailPanel.tsx` — 9× `<Field>`
- `SourceScanDetailPanel.tsx` — 11× `<Field>`
- `NewsBulletinDetailPanel.tsx` — 13× `<Field>`
- `StyleBlueprintDetailPanel.tsx` — 6× `<Row>`
- `JobDetailPanel.tsx` — 14× `<Row>`
- `TemplateDetailPanel.tsx` — 8× `<Field>`
- `SourceDetailPanel.tsx` — 9× `<Field>`
- `NewsItemDetailPanel.tsx` — 13× `<Field>`

**Overview Panel dosyaları (2):**
- `StandardVideoOverviewPanel.tsx` — 13× `<Row>`
- `JobOverviewPanel.tsx` — 14× `<Row>`

---

### Bulgular

#### `<Row>` / `<Field>` Çağrı Pattern'leri

Her detail/overview panelinde `<Row>` veya `<Field>` helper component tanımlı (local function). Her çağrı:
- Farklı `label` string içeriyor (`"ID"`, `"status"`, `"module_type"`, `"created_at"`, vs.)
- Farklı `data.field` / `video.field` referansı içeriyor
- Her call semantically bağımsız

Örnek — `JobDetailPanel.tsx`:
```
<Row label="id">...</Row>
<Row label="module_type">...</Row>
<Row label="status">...</Row>
<Row label="owner_id">...</Row>
<Row label="template_id">...</Row>
...
```
Her Row farklı label + farklı data field — aynı call pattern yok.

#### `formatDateTime` Çağrıları

`<Field label="Created" value={formatDateTime(data.created_at)} />`
`<Field label="Updated" value={formatDateTime(data.updated_at)} />`

Tekrar: **2× per dosya** (Created/Updated) — threshold altı.

#### `?? em` / `?? DASH` Pattern

Bazı dosyalarda birden fazla `{data.X ?? em}` pattern'i mevcut, ancak her biri farklı `data.X` field ile — aynı call değil.

#### `<BoolBadge>` Çağrıları (SettingDetailPanel, VisibilityRuleDetailPanel)

Phase 233'te zaten değerlendirildi. Sonuç: her çağrı farklı field + farklı label, extraction Row label bilgisini kaybettirir.

---

### Karar: Audit-Only

**Sebep:**
- Tüm `<Row>` / `<Field>` çağrıları farklı label + farklı data field ile benzersiz
- `Row`/`Field` helper component'leri zaten per-call farklı argüman alıyor — bu tam olarak helper component'in tasarım amacı
- `formatDateTime` call 2× per dosya — threshold altı
- Aynı (label, field) ikilisi 3+ kez tekrar eden dosya yok
- Extraction için kriter: **aynı label + aynı value pattern** 3+ kez — karşılanmıyor

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

- `<Row>`/`<Field>` çağrıları array/map'e dönüştürülmedi — her label benzersiz, farklı value tip ve formatlaması var
- `formatDateTime` çağrıları const'a çıkarılmadı — 2× per dosya, threshold altı
- Cross-file shared `Row`/`Field` helper kurulmadı — her dosyada farklı stil/genişlik konfigürasyonu var
- Global detail schema/config soyutlaması yapılmadı — prematüre abstraction

## Riskler

Yok.
