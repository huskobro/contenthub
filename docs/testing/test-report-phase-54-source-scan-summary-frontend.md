# Test Report — Phase 54: Source Scan Summary Frontend

## Amaç
Sources registry listesinde her kaynak için toplam scan sayısı ve son scan durumunu sade badge olarak göstermek.

## Çalıştırılan Komutlar
```
.venv/bin/pytest tests/ -x -q  (backend)
npx vitest run src/tests/source-scan-summary.smoke.test.tsx
npx vitest run
npm run build
```

## Seçilen Veri Yaklaşımı
Backend list endpoint'i `scan_count`, `last_scan_status`, `last_scan_finished_at` alanlarıyla genişletildi.
- `SourceResponse` şemasına üç alan eklendi (default: 0/None/None)
- `list_sources_with_scan_summary()` servisi eklendi
- List router endpoint bu yeni servisi kullanıyor
- Frontend `SourceResponse` tipine opsiyonel olarak eklendi

## Test Sonuçları
- 195 backend test — tümü geçti
- 10 yeni frontend test — tümü geçti
- 303 toplam frontend test — tümü geçti
- `npm run build` — başarılı

## Kapsanan Senaryolar
- Scan yok → "Scan yok" gösterimi
- completed/failed/running/queued → badge rengi
- Scan count gösterimi
- Son scan tarihi gösterimi
- Tablo "Scans" sütunu
- UI kırılmıyor (undefined/null fields)

## Değişiklikler
Backend:
- `sources/schemas.py`: `scan_count`, `last_scan_status`, `last_scan_finished_at` eklendi
- `sources/service.py`: `list_sources_with_scan_summary()` eklendi
- `sources/router.py`: list endpoint güncellendi

Frontend:
- `sourcesApi.ts`: 3 opsiyonel alan eklendi
- `SourceScanStatusBadge.tsx` (yeni)
- `SourceScanSummary.tsx` (yeni)
- `SourcesTable.tsx`: Scans sütunu eklendi
- `source-scan-summary.smoke.test.tsx` (yeni, 10 test)

## Bilerek Yapılmayanlar
- Son scan detay drawer
- Source health score
- Trend/istatistik
- Auto scan toggle/scheduler
- Filter/search entegrasyonu

## Riskler
- Auth/rol zorlama henüz yok (kasıtlı)
- N+2 sorgu/source (count + last scan); kabul edilebilir
