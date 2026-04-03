# Test Report — Phase 205: Repeated Small List/Marker/Bullet Text Constant Pack

**Tarih:** 2026-04-03
**Faz:** 205
**Başlık:** Repeated Small List/Marker/Bullet Text Constant Pack

---

## Amaç

Tüm frontend bileşen dosyalarında aynı dosya içinde 3+ kez tekrar eden marker/separator/bullet text literal'larını (`"•"`, `"—"`, `"·"`, `"|"`, `"N/A"`, `"None"` vb.) dosya-seviyesi const'lara çıkarmak.

---

## Audit Özeti

### `"—"` (em dash)
- 100+ dosyada birer veya ikişer kez kullanılıyor
- Maksimum: 2× (`TemplateStyleLinksTable.tsx`, `NewsItemDetailPanel.tsx`, `NewsItemsTable.tsx`, `StandardVideoArtifactsPanel.tsx`, diğerleri)
- Hiçbirinde 3+ kez yok
- Badge dosyaları kapsam dışı

### `"•"`, `"·"`, `"|"`, `"/"`, `"✓"`, `"N/A"`, `"None"`, `"Unknown"` vb.
- Codebase'de JSX text literal olarak kullanılmıyor

**Sonuç:** Hiçbir dosyada aynı marker/bullet literal 3+ kez tekrarlanmıyor.

---

## Yapılan Değişiklikler

**Hiçbir dosyada değişiklik yapılmadı.**

---

## Çalıştırılan Komutlar

- `tsc --noEmit` (değişiklik yok, temiz)
- `vitest run` (127/127, 1587/1587)
- `vite build` (temiz)

## Test Sonuçları

| Kategori | Sonuç |
|---|---|
| tsc --noEmit | ✅ Temiz |
| vitest run | ✅ 127/127, 1587/1587 |
| vite build | ✅ Temiz |

---

## Bilerek Yapılmayanlar

- Threshold altı kullanım — hiçbir dosyaya dokunulmadı
- Global marker/separator sözlüğü kurulmadı
- Badge dosyaları kapsam dışı bırakıldı

## Riskler

Yok.
