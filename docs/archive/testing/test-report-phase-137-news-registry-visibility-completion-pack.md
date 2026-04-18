# Test Report — Phase 137: News Registry Visibility Completion Pack

## Tarih
2026-04-03

## Amaç
News Items ve Used News registry tablolarının görünürlük katmanlarını tek fazda toparlamak: sütun başlıklarını Türkçeleştirmek, sütun sırasını mantıksal gruplara ayırmak, import düzeltmesi yapmak. Konservatif yaklaşım.

## Kapsanan Visibility Katmanları

### News Items
- Source summary, Scan lineage, Used-news linkage, Publication lineage
- Publication signal, Content completeness, Readiness, Usage
- Input quality, Input specificity, Artifact consistency, Target/output consistency

### Used News
- State summary, Source-context summary, Publication linkage, Target resolution
- Input quality, Input specificity, Artifact consistency, Target/output consistency

## Yapılan Düzenlemeler

### 1. UsedNewsArtifactConsistencySummary.tsx — Import sırası düzeltmesi
- Import dosyanın altından (satır 56) üste taşındı

### 2. NewsItemsTable.tsx — Sütun başlıkları Türkçeleştirildi
- Status → Durum
- Created → Oluşturulma

### 3. NewsItemsTable.tsx — Sütun sırası mantıksal gruplara ayrıldı
- Kimlik & Durum: Başlık, Durum, Kaynak Özeti, Dil, Kategori
- Hazırlık & İçerik: Hazırlık, İçerik
- Girdi Grubu: Girdi Kalitesi, Girdi Özgüllüğü (birlikte)
- Lineage & Kullanım: Scan Kaynağı, Kullanım, Used News Bağı
- Yayın Grubu: Yayın Sinyali, Yayın Zinciri
- Tutarlılık Grubu: Artifact Tutarlılığı, Target/Output Tutarlılığı
- Zaman: Oluşturulma

### 4. UsedNewsTable.tsx — Sütun başlıkları Türkçeleştirildi
- News Item ID → Haber ID
- Usage Type → Kullanım Tipi
- Target Module → Hedef Modül
- Target Entity ID → Hedef Varlık
- Created → Oluşturulma

### 5. UsedNewsTable.tsx — Sütun sırası mantıksal gruplara ayrıldı
- Kimlik & Durum: Haber ID, Kullanım Tipi, Durum, Kaynak Bağlamı
- Girdi Grubu: Girdi Kalitesi, Girdi Özgüllüğü (birlikte)
- Hedef Grubu: Hedef Modül, Hedef Varlık, Hedef Çözümü (birlikte)
- Yayın & Tutarlılık: Yayın Bağı, Artifact Tutarlılığı, Target/Output Tutarlılığı
- Zaman: Oluşturulma

### Badge Stiline Dokunuldu mu?
Hayır. Mevcut badge stil grupları aynen korundu.

## Çalıştırılan Komutlar
- `npx vitest run`
- `npx tsc --noEmit`

## Test Sonuçları
- **Toplam:** 1093/1093 test geçti
- **Başarısız:** 0
- **Test dosyası:** 114/114 geçti
- **TypeScript:** tsc --noEmit temiz (0 hata)

## Bilerek Yapılmayanlar
- Badge stili değişikliği
- Secondary text kaldırma/kısaltma
- Sütun silme (NewsItems: 17 sütun, UsedNews: 13 sütun korundu)
- Backend değişikliği
- Relation drawer, repair action, analytics, moderation, bulk cleanup

## Riskler
- Birden fazla badge stil grubu her iki entity içinde mevcut — bilerek dokunulmadı
- 17 sütun (NewsItems) geniş ekran gerektirir
