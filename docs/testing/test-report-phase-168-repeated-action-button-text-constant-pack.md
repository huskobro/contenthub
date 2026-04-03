# Test Report — Phase 168: Repeated Action Button Text Constant Pack

**Tarih:** 2026-04-03
**Faz:** 168
**Başlık:** Repeated Action Button Text Constant Pack

---

## Audit Özeti

Tüm frontend form, panel ve detail bileşen dosyaları tekrar eden action button text string literal'ları açısından tarandı.

Aranan string'ler: `"Kaydet"`, `"İptal"`, `"Oluştur"`, `"Düzenle"`, `"Sil"`, `"Kapat"`, `"Güncelle"`, `"Kaydediliyor..."`

Threshold: Aynı dosyada 3+ tekrar.

---

## Gerçek Extraction Fırsatları

**Yok.** Hiçbir dosyada aynı action button text string'i 3+ kez tekrar etmiyor.

### En Yüksek Tekrar (2 kez — threshold altı)

| Dosya | String | Tekrar |
|---|---|---|
| `NewsBulletinMetadataPanel.tsx` | `"Oluştur"`, `"Düzenle"` | 2 kez (create/edit h4 başlık + submitLabel) |
| `NewsBulletinScriptPanel.tsx` | `"Oluştur"`, `"Düzenle"` | 2 kez |
| `StandardVideoMetadataPanel.tsx` | `"Düzenle"` | 2 kez |
| `StandardVideoScriptPanel.tsx` | `"Düzenle"` | 2 kez |
| `*DetailPanel.tsx` dosyaları (13 adet) | `"Düzenle"` | 2 kez |
| Form dosyaları | `"Kaydediliyor..."` | 1 kez (tek form per dosya) |

---

## Yapılan Değişiklikler

**Hiçbir dosya değiştirilmedi.** Threshold 3+ sağlanamadı.

---

## Atlanan Dosyalar ve Gerekçeler

- Tüm form ve panel dosyaları: 2 tekrarlı string'ler threshold altında (< 3)
- "Düzenle" button'ı detail panellerde create/edit mode geçişinde kullanılıyor — bu pattern 2 kez görünmesi normal
- "Oluştur" + "Düzenle" panel başlıklarında (h4) ve submitLabel'da görünüyor — bunlar farklı bağlamlar, extraction anlamsız olurdu

---

## Test Sonuçları

| Kategori | Sonuç |
|---|---|
| tsc --noEmit | ✅ Temiz (0 hata) |
| vitest run | ✅ 127/127 test dosyası, 1587/1587 test geçti |
| vite build | ✅ Temiz |

---

## Dokunulmayanlar

- Hiçbir dosya değiştirilmedi
- Görünüm, davranış, badge stilleri, backend — aynı
