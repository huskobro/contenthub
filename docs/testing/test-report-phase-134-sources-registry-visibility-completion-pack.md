# Test Report — Phase 134: Sources Registry Visibility Completion Pack

## Tarih
2026-04-03

## Kapsam
Sources Registry tablosunun görünürlük ve okunabilirlik iyileştirmesi. Konservatif yaklaşım: mevcut badge stilleri korundu, sütun silmek yerine sıralama ve Türkçeleştirme yapıldı, bilgi kaybı sıfır.

## Yapılan Değişiklikler

### 1. SourceInputQualitySummary.tsx — Import sırası düzeltmesi
- `import { SourceInputQualityBadge }` dosyanın altından üstüne taşındı (standart import sırası)

### 2. SourcesTable.tsx — Sütun başlıkları Türkçeleştirildi
- Name → Ad
- Type → Tür
- Trust → Güven
- Scan Mode → Tarama Modu
- Status → Durum
- Language → Dil
- Scans → Taramalar

### 3. SourcesTable.tsx — Sütun sırası mantıksal gruplara ayrıldı
- Kimlik grubu: Ad, Tür, Durum, Güven, Tarama Modu, Dil
- Tarama & Hazırlık grubu: Taramalar, Hazırlık
- Girdi grubu: Konfigürasyon, Girdi Kalitesi, Girdi Özgüllüğü
- Haber & Yayın grubu: Haberler, Yayın Kaynağı
- Tutarlılık & Çıktı grubu: Artifact Tutarlılığı, Target/Output Tutarlılığı, Yayın Çıktısı

### 4. Test mock eksiklikleri giderildi (pre-existing TS errors)
- used-news-registry.smoke.test.tsx: has_news_item_source, has_news_item_scan_reference, has_target_resolved eklendi
- used-news-form.smoke.test.tsx: aynı 3 alan eklendi
- used-news-state-summary.smoke.test.tsx: aynı 3 alan eklendi
- news-bulletin-readiness-summary.smoke.test.tsx: brief, target_duration_seconds, tone, selected_news_ids_json, job_id eklendi
- news-item-readiness-summary.smoke.test.tsx: source_scan_id, dedupe_key, raw_payload_json eklendi
- job-actionability-summary.smoke.test.tsx: steps eklendi

### 5. Test header güncelleme
- source-scan-summary.smoke.test.tsx: "Scans" → "Taramalar" header testi güncellendi

## Korunan Öğeler (Bilinçli Dokunulmadı)
- Badge stilleri: 3 farklı stil grubu (eski 3px/border, ara 0.375rem/fontWeight, yeni 9999px pill) aynen korundu
- Secondary text içerikleri: tüm özet metinleri (haber sayıları, tarihler, config bilgileri) aynen korundu
- Raw sütunlar: hiçbir sütun silinmedi, 16 sütun korundu
- Border/radius/padding/fontWeight değişikliği yapılmadı

## Test Sonuçları
- **Toplam:** 1093/1093 test geçti
- **Başarısız:** 0
- **Test dosyası:** 114/114 geçti
- **TypeScript:** tsc --noEmit temiz (0 hata)
- **Süre:** ~9.5s

## Bilinen Sınırlamalar
- Badge stil tutarsızlığı Sources entity içinde hala mevcut (3 farklı grup) — kullanıcı talebiyle bilerek dokunulmadı
- Sütun sayısı (16) geniş; gelecekte responsive düzenleme gerekebilir
