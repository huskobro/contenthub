# Test Report — Phase 169: Repeated Form Section Heading Constant Pack

**Tarih:** 2026-04-03
**Faz:** 169
**Başlık:** Repeated Form Section Heading Constant Pack

---

## Amaç

Form ve panel bileşenlerindeki tekrar eden section heading metin ve style bloklarını const ile extraction. Threshold: aynı dosyada 3+ tekrar.

---

## Gözden Geçirilen Form Heading Yüzeyleri

### `{ margin: "0 0 1rem" }` — h4 form headings

| Dosya | Tekrar | Durum |
|---|---|---|
| `NewsBulletinMetadataPanel.tsx` | 2 kez (Oluştur + Düzenle h4) | ⏭ Threshold altı |
| `NewsBulletinScriptPanel.tsx` | 2 kez | ⏭ Threshold altı |
| `NewsBulletinSelectedItemsPanel.tsx` | 2 kez | ⏭ Threshold altı |

### `{ margin: "0 0 1rem", fontSize: "1rem", color: "#1e293b" }` — h3 detail panel headings

| Dosya | Tekrar | Durum |
|---|---|---|
| `SourceDetailPanel.tsx` | 1 kez (view: `margin: 0` farklı) | ⏭ Threshold altı |
| `SourceScanDetailPanel.tsx` | 1 kez | ⏭ Threshold altı |
| `TemplateDetailPanel.tsx` | 1 kez | ⏭ Threshold altı |
| `StyleBlueprintDetailPanel.tsx` | 1 kez | ⏭ Threshold altı |
| `TemplateStyleLinkDetailPanel.tsx` | 1 kez | ⏭ Threshold altı |

### Zaten extraction yapılmış

| Dosya | Const | Durum |
|---|---|---|
| `StandardVideoMetadataPanel.tsx` | `FORM_HEADING` (Phase 164) | ✅ Zaten OK |
| `StandardVideoScriptPanel.tsx` | `FORM_HEADING` (Phase 164) | ✅ Zaten OK |

---

## Yapılan Küçük Readability/Heading-Constant İyileştirmeleri

**Hiçbir dosya değiştirilmedi.** Threshold 3+ sağlanamadı.

NewsBulletin panel dosyalarında:
- Create mode h4: `{ margin: "0 0 1rem" }`
- Edit mode h4: `{ margin: "0 0 1rem" }`
- View mode h4: `{ margin: 0 }` (farklı)

Her dosyada yalnızca 2 tekrar — threshold altı. View-mode heading farklı style kullandığı için 3. tekrar oluşmuyor.

---

## Eklenen/Güncellenen Testler

Dosya değişikliği yapılmadı — yeni test eklenmedi.

---

## Çalıştırılan Komutlar

```
npx tsc --noEmit
npx vitest run
npx vite build
```

---

## Test Sonuçları

| Kategori | Sonuç |
|---|---|
| tsc --noEmit | ✅ Temiz (0 hata) |
| vitest run | ✅ 127/127 test dosyası, 1587/1587 test geçti |
| vite build | ✅ Temiz |

---

## Bilerek Yapılmayanlar

- 2-tekrarlı heading style'ları: threshold altı, extraction overkill olurdu
- Detail panel h3 style'ları: her dosyada 1-2 tekrar, edit/view mode'da margin farklı — extraction semantic anlam kaybettirir

---

## Riskler

Yok. Dosya değişikliği yapılmadı.
