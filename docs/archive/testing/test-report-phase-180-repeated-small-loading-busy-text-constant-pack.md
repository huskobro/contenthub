# Test Report — Phase 180: Repeated Small Loading/Busy Text Constant Pack

**Tarih:** 2026-04-03
**Faz:** 180
**Başlık:** Repeated Small Loading/Busy Text Constant Pack

---

## Audit Özeti

Tüm frontend bileşen dosyaları tekrar eden loading/busy text literal'ları ("Yükleniyor...", "Kaydediliyor...") açısından tarandı.

### "Yükleniyor..." text occurrences per file

| Dosya | Tekrar | Karar |
|---|---|---|
| `StandardVideoArtifactsPanel.tsx` | 2× | ❌ Threshold altı |
| `JobDetailPanel.tsx` | 1× | ❌ Threshold altı |
| `SettingDetailPanel.tsx` | 1× | ❌ Threshold altı |
| `VisibilityRuleDetailPanel.tsx` | 1× | ❌ Threshold altı |
| `SourceScanDetailPanel.tsx` | 1× | ❌ Threshold altı |
| `SourceDetailPanel.tsx` | 1× | ❌ Threshold altı |
| `StyleBlueprintDetailPanel.tsx` | 1× | ❌ Threshold altı |
| `TemplateStyleLinkDetailPanel.tsx` | 1× | ❌ Threshold altı |
| `TemplateDetailPanel.tsx` | 1× | ❌ Threshold altı |
| `NewsBulletinDetailPanel.tsx` | 1× | ❌ Threshold altı |
| `NewsItemDetailPanel.tsx` | 1× | ❌ Threshold altı |
| `UsedNewsDetailPanel.tsx` | 1× | ❌ Threshold altı |

### "Kaydediliyor..." text occurrences per file

Tüm form dosyalarında 1× per dosya (button içinde). Threshold altı.

---

## Sonuç

Aynı dosya içinde 3+ tekrar eden loading/busy text literal bulunamadı.
`StandardVideoArtifactsPanel.tsx` 2× en yüksek sayı — threshold 3+ altında.
Dosya değişikliği yapılmadı.

Phase 180 audit-only olarak kapatılıyor.

---

## Test Sonuçları

| Kategori | Sonuç |
|---|---|
| tsc --noEmit | ✅ Temiz (0 hata) |
| vitest run | ✅ 127/127 test dosyası, 1587/1587 test geçti |

---

## Dokunulmayanlar

- Hiçbir dosya değiştirilmedi
- Görünüm değiştirilmedi
- Davranış değiştirilmedi
- Backend değişikliği yapılmadı
