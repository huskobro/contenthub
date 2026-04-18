# Test Raporu — Phase 139: Standard Video + News Bulletin Registry Visibility Completion Pack

## Tarih
2026-04-03

## Amaç
Standard Video ve News Bulletin tablolarının görünürlük iyileştirmesi: sütun başlıkları Türkçeleştirildi, sütun sırası mantıksal gruplara ayrıldı, import düzeltmeleri, badge stilleri ve secondary textler korundu.

## Kapsanan Visibility Katmanları

### Standard Video (13 sütun)
- Input Quality, Input Specificity, Readiness, Artifact, Publication Signal, Artifact Consistency, Target/Output Consistency
- Raw kolonlar: Başlık, Konu, Durum, Dil, Hedef Süre, Oluşturulma

### News Bulletin (18 sütun)
- Readiness, Artifact, Selected News (Haberler), Enforcement, Source Coverage, Input Quality, Input Specificity, Selected News Quality (İçerik Kalitesi), Publication Signal, Artifact Consistency, Target/Output Consistency
- Raw kolonlar: Başlık, Konu, Kaynak Modu, Stil, Durum, Dil, Oluşturulma

## Değiştirilen Dosyalar
- `frontend/src/components/news-bulletin/NewsBulletinInputQualitySummary.tsx` — import sırası düzeltmesi (satır 57 → satır 1)
- `frontend/src/components/standard-video/StandardVideosTable.tsx` — sütun sırası mantıksal gruplara ayrıldı (13 sütun)
- `frontend/src/components/news-bulletin/NewsBulletinsTable.tsx` — 8 başlık Türkçeleştirildi, header stili tutarlı hale getirildi, sütun sırası mantıksal gruplara ayrıldı (18 sütun)
- `frontend/src/tests/news-bulletin-artifact-summary.smoke.test.tsx` — "Artifacts" → "Artifact" header testi güncellendi

## Sütun Grupları

### StandardVideosTable
1. Kimlik & Durum: Başlık, Konu, Durum, Dil, Hedef Süre
2. Hazırlık & İçerik: Hazırlık, Artifact
3. Girdi: Girdi Kalitesi, Girdi Özgüllüğü
4. Yayın: Yayın Sinyali
5. Tutarlılık: Artifact Tutarlılığı, Target/Output Tutarlılığı
6. Zaman: Oluşturulma

### NewsBulletinsTable
1. Kimlik & Durum: Başlık, Konu, Kaynak Modu, Stil, Durum, Dil
2. Hazırlık & İçerik: Hazırlık, Artifact, Haberler, Enforcement, Kaynak Kapsamı
3. Girdi: Girdi Kalitesi, Girdi Özgüllüğü, İçerik Kalitesi
4. Yayın: Yayın Sinyali
5. Tutarlılık: Artifact Tutarlılığı, Target/Output Tutarlılığı
6. Zaman: Oluşturulma

## Badge Stiline Dokunuldu mu?
Hayır. Hiçbir badge stiline dokunulmadı.

## Çalıştırılan Komutlar
- `npx vitest run`
- `npx tsc --noEmit`

## Test Sonuçları
- **Toplam:** 1093 test
- **Geçen:** 1093
- **Başarısız:** 0
- **tsc --noEmit:** 0 hata

## Bilerek Yapılmayanlar
- Badge stili değişikliği yapılmadı
- Backend değişikliği yapılmadı
- Yeni endpoint açılmadı
- Generate action, recommendation, analytics, bulk action eklenmedi
- Form/detail panel çevirileri bu fazın kapsamı dışı

## Riskler
- Yok. Tüm değişiklikler pure frontend column reorder ve header translation.
