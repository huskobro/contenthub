# Test Report — Phase 135: Source Scans Registry Visibility Completion Pack

## Tarih
2026-04-03

## Amaç
Source Scans registry tablosunun görünürlük katmanlarını tek fazda toparlamak: sütun başlıklarını Türkçeleştirmek, sütun sırasını mantıksal gruplara ayırmak, import düzeltmesi yapmak. Konservatif yaklaşım: badge stilleri korundu, secondary textler korundu, sütun silmek yok.

## Kapsanan Source Scans Visibility Katmanları
- Source summary
- Execution summary
- Result richness
- Publication yield
- Publication outcome
- Input quality
- Input specificity
- Artifact consistency
- Target/output consistency

## Yapılan Düzenlemeler

### 1. SourceScanInputQualitySummary.tsx — Import sırası düzeltmesi
- `import { SourceScanInputQualityBadge }` dosyanın altından (satır 28) üstüne taşındı

### 2. SourceScansTable.tsx — Sütun başlıkları Türkçeleştirildi
- Scan Mode → Tarama Modu
- Status → Durum
- Results → Sonuç
- Created → Oluşturulma

### 3. SourceScansTable.tsx — Sütun sırası mantıksal gruplara ayrıldı
- Kimlik & Durum: Kaynak, Tarama Modu, Durum, Sonuç
- Çalışma & Çıktı: Çalışma Özeti, Çıktı Zenginliği
- Girdi Grubu: Girdi Kalitesi, Girdi Özgüllüğü (birlikte)
- Yayın Grubu: Yayın Verimi, Yayın Sonucu (birlikte)
- Tutarlılık Grubu: Artifact Tutarlılığı, Target/Output Tutarlılığı (birlikte)
- Zaman: Oluşturulma

### Badge Stiline Dokunuldu mu?
Hayır. 4 farklı badge stil grubu (3px classic, 9999px pill, 0.375rem rounded, 4px square) aynen korundu. Kullanıcı talebiyle bilerek dokunulmadı.

## Çalıştırılan Komutlar
- `npx vitest run`
- `npx tsc --noEmit`

## Test Sonuçları
- **Toplam:** 1093/1093 test geçti
- **Başarısız:** 0
- **Test dosyası:** 114/114 geçti
- **TypeScript:** tsc --noEmit temiz (0 hata)
- **Süre:** ~10s

## Bilerek Yapılmayanlar
- Badge stili değişikliği (4 farklı grup korundu)
- Secondary text kaldırma veya kısaltma (mevcut uzunluklar kabul edilebilir)
- Sütun silme (13 sütunun tamamı korundu)
- Backend değişikliği
- Diagnostics, rescan action, analytics, filter/search/bulk action

## Riskler
- 4 farklı badge stil grubu Source Scans entity içinde tutarsız — bilerek dokunulmadı
- Secondary text fontSize farkı (0.68rem vs 0.7rem) mevcut — minimal, bilerek dokunulmadı
- 13 sütun geniş ekran gerektirir — gelecekte responsive düzenleme gerekebilir
