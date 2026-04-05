# M18-A: Icerik Analytics Backend Raporu

## Ozet
Icerik duzeyi analytics metrikleri icin backend endpoint ve servis katmani eklendi.

## Degisiklikler

### `backend/app/analytics/service.py`
- `get_content_metrics()` fonksiyonu eklendi.
- Job.module_type bazli modul dagilimi (GROUP BY aggregation).
- StandardVideo + NewsBulletin sayimlari uzerinden content_output_count.
- PublishRecord tablosundan yayinlanan icerik sayisi.
- Job.created_at → PublishRecord.published_at julianday farki ile ortalama yayina kadar gecen sure.
- Template ve StyleBlueprint tablolarindan aktif sablon/blueprint sayilari.
- date_from/date_to ve window filtreleri destekleniyor.

### `backend/app/analytics/schemas.py`
- `ModuleDistribution`, `ContentTypeBreakdown`, `ContentMetrics` Pydantic modelleri eklendi.

### `backend/app/analytics/router.py`
- `GET /analytics/content` endpoint'i eklendi.
- window, date_from, date_to parametreleri destekleniyor.
- Gecersiz window 400, gecersiz tarih formati 400 donuyor.

## Test Sonuclari
- 7 backend testi: **TAMAMI GECTI**
  - `test_content_endpoint_returns_200`
  - `test_content_endpoint_with_window`
  - `test_content_endpoint_invalid_window`
  - `test_content_endpoint_date_range`
  - `test_content_endpoint_invalid_date`
  - `test_content_schema_fields`
  - `test_content_type_breakdown_has_two_types`

## Bilinen Sinirlamalar
- module_distribution yalnizca Job.module_type alanini kullaniyor; module_type NULL olan job'lar dagilima dahil edilmiyor.
- Icerik tipi kirilimi sabit iki tip iceriyor: standard_video, news_bulletin.
