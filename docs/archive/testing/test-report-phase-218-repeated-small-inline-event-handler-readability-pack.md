# Test Report — Phase 218: Repeated Small Inline Event Handler Readability Pack

**Tarih:** 2026-04-03
**Faz:** 218
**Başlık:** Repeated Small Inline Event Handler Readability Pack

---

## Amaç

Form/panel/detail bileşenlerinde aynı dosya içinde 3+ kez tekrar eden `onClick={() => ...}` ve `onChange={(e) => ...}` inline handler pattern'larını dosya-seviyesi handler'lara çıkarmak.

---

## Audit Özeti

### Gözden Geçirilen Yüzeyler

- Form dosyaları: `SourceForm.tsx` (11×), `NewsItemForm.tsx` (9×), `NewsBulletinForm.tsx` (10×), `StandardVideoMetadataForm.tsx` (8×), `TemplateForm.tsx` (10×), diğerleri
- Panel dosyaları: `StandardVideoScriptPanel.tsx` (3×), `NewsBulletinScriptPanel.tsx` (3×), diğerleri

### Bulgular

| Pattern | Max tekrar | Aynı handler? | Sonuç |
|---|---|---|---|
| `onChange={e => setName(e.target.value)}` (SourceForm) | 11× | Her biri farklı setter | Threshold teknik olarak karşılanıyor ama extraction uygunsuz |
| `onChange={(e) => set("field", e.target.value)}` (NewsBulletinForm) | 10× | Her biri farklı field key | Extraction değer katmıyor |
| `onClick={() => setMode("edit"/"create")}` (ScriptPanel) | 3× | Farklı argümanlar | Extraction uygunsuz |
| `onClick={() => setShowFull(v => !v)}` | 1-2× | Eşsiz handler | Threshold altı |

### Karar: Audit-Only

**Sebep:**
1. **`onChange` handler'ları**: Her handler farklı bir state setter'ı veya farklı field key'i çağırıyor (`setName`, `setSourceType`, `setFeedUrl`, ... veya `set("topic", ...)`, `set("title", ...)`). Aynı inline body'e sahip değiller — ortak extraction mümkün değil.
2. **`onClick` handler'ları**: 3× görünse de her biri farklı argümanla çağrılıyor (`"edit"` vs `"create"` vs `v => !v`). Tekrar eden aynı fonksiyon yok.
3. **Standart React idiom**: `onChange={e => setState(e.target.value)}` controlled input'un beklenen yazım biçimi. Extraction gereksiz complexity getirir.

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

- Per-field onChange handler'ları çıkarılmadı — her biri farklı setter/key, extraction değer katmaz
- onClick handler'ları çıkarılmadı — farklı argümanlar, aynı pattern değil
- Global event handler helper kurulmadı

## Riskler

Yok.
