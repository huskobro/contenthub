# M23-B: Analytics Trace Hardening — Rapor

## Ozet

Analytics provider trace parsing'teki sessiz exception yutma gozlemlenebilir hale getirildi.
Parse error, bos trace, invalid structure ve unknown provider sayilari artik
API yanitinda `trace_data_quality` olarak donuyor.

## Yapilan Degisiklikler

### Analytics Service

1. **`app/analytics/service.py`** — Provider trace aggregation yeniden yazildi:
   - Sessiz `except Exception: continue` → WARNING log + counter
   - Yeni sayaclar: `_trace_total`, `_trace_empty`, `_trace_parse_errors`,
     `_trace_invalid_structure`, `_trace_unknown_provider`
   - Parse hatasi olan her trace icin step_id ve hata detayi loglanir
   - Tum sayaclar `trace_data_quality` dict olarak return'a eklenir
   - Parse/structure sorunlari topluca WARNING loglanir

### Analytics Schema

2. **`app/analytics/schemas.py`** — `TraceDataQuality` modeli eklendi:
   - `total_traces`, `empty_traces`, `parse_errors`, `invalid_structure`,
     `unknown_provider_count`, `valid_traces`
   - `OperationsMetrics`'e `trace_data_quality` alani eklendi

## API Yanit Ornegi

```json
{
  "window": "30d",
  "trace_data_quality": {
    "total_traces": 150,
    "empty_traces": 12,
    "parse_errors": 3,
    "invalid_structure": 1,
    "unknown_provider_count": 8,
    "valid_traces": 134
  },
  ...
}
```

## Onceki vs Sonraki

| Senaryo | Onceki | Sonrasi |
|---------|--------|---------|
| Bozuk trace JSON | Sessiz `continue` | WARNING log + parse_errors++ |
| Bos trace | Sessiz skip | empty_traces++ |
| Invalid structure | Sessiz skip | invalid_structure++ |
| Eksik provider_kind | "unknown" (sessiz) | "unknown" + unknown_provider_count++ |
| Veri kalitesi gorulmesi | Yok | trace_data_quality API'de gorunur |

## Test Sonuclari

- `test_analytics_trace_quality_fields` — PASSED
- `test_analytics_trace_quality_math` — PASSED

## Bilinen Sinirlamalar

- Frontend analytics sayfasinda trace_data_quality henuz gorsellestirilmiyor
- Provider trace yazmada upstream zenginlestirme (provider_kind zorunlulugu) henuz yok
- Tarihsel trace verileri geriye donuk iyilestirilemez
