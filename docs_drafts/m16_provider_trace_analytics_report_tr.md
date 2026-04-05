# M16-C — Provider Trace → Analytics Entegrasyon Raporu

## Ozet

M15'te ertelenen analytics baglantisi yapilmistir. `provider_error_rate` artik gercek trace verisinden turetilmektedir. Ek olarak provider bazli ozet metrikler uretilmektedir.

## Mimari

### Veri Akisi
1. Executor, step calistiginda `build_provider_trace()` ile yapisal trace dict olusturur
2. PipelineRunner, trace'i `provider_trace_json` kolonuna JSON olarak yazar
3. Analytics service, `get_operations_metrics()` icinde `provider_trace_json` alanlarini parse eder
4. Provider bazli aggregation olusturulur
5. Frontend, `provider_stats` listesini tablo olarak gosterir

### Analytics Service Degisiklikleri
`get_operations_metrics()` fonksiyonuna eklenen blok:
- `provider_trace_json` NULL olmayan provider-dependent step'leri (script, metadata, tts, visuals) sorgular
- Her trace icin JSON parse yapilir
- `provider_trace` nested key'i veya top-level alanlar desteklenir
- Provider bazli aggregation hesaplanir

### Yeni Schema: ProviderStat

| Alan | Tip | Aciklama |
|------|-----|----------|
| `provider_name` | str | Provider adi (ornek: "openai", "edge_tts") |
| `provider_kind` | str | Tur ("llm", "tts", "visual") |
| `total_calls` | int | Toplam cagri sayisi |
| `failed_calls` | int | Basarisiz cagri sayisi |
| `error_rate` | float/null | Hata orani (failed/total) |
| `avg_latency_ms` | float/null | Ortalama gecikme suresi (ms) |
| `total_estimated_cost_usd` | float/null | Toplam tahmini maliyet |
| `total_input_tokens` | int/null | Toplam girdi token |
| `total_output_tokens` | int/null | Toplam cikti token |

### OperationsMetrics Guncelleme
- `provider_stats: list[ProviderStat] = []` alani eklendi
- `provider_error_rate` comment guncellendi — artik destekleniyor

## Gercek Trace vs Desteklenmeyen Alanlar

### Trace Verisi Uretebilen Executor'lar
| Executor | Provider Kind | Trace Alanlari |
|----------|-------------|----------------|
| script | llm | provider_name, model, success, latency_ms, input_tokens, output_tokens |
| tts | tts | provider_name, model (voice), success, latency_ms |
| visuals | visual | provider_name, success, latency_ms |

### Trace Verisi Uretemeyen Executor'lar
| Executor | Sebep |
|----------|-------|
| metadata | LLM executor ile ayni altyapi kullanir, trace uretir |
| subtitles | Henuz external provider yok |
| composition | Remotion-local, external API yok |
| thumbnail | Henuz external provider yok |

### Onemli Not
Provider trace verisi yalnizca pipeline gercekten calistiginda uretilir. API key'ler olmadan executor'lar hata verir ve trace bos kalir. Bu durumda Analytics/Operations sayfasinda "Secilen donemde provider trace verisi yok" mesaji gosterilir.

## Frontend Degisiklikleri

### AnalyticsOperationsPage
- "Provider Cagrisi" karti artik toplam cagri sayisini gosterir (trace verisinden)
- Provider bazli tablo eklendi:
  - Provider, Tur, Cagri, Basarisiz, Hata Orani, Ort. Gecikme, Tahmini Maliyet
- Bos durum mesaji: "Secilen donemde provider trace verisi yok"

### analyticsApi.ts
- `ProviderStat` interface eklendi
- `OperationsMetrics` interface'e `provider_stats: ProviderStat[]` eklendi

## Test Sonuclari

| Test | Durum |
|------|-------|
| `test_operations_includes_provider_stats` | PASSED |
| `test_provider_stats_from_trace_data` | PASSED |
| `test_provider_stats_schema_fields` | PASSED |

## Bilinen Sinirlamalar

1. **Gercek veri bagimli**: Provider stats yalnizca pipeline calistiginda dolar
2. **JSON parse performansi**: Buyuk veri setlerinde her trace row'u Python'da parse edilir — cok buyuk veri setlerinde DB tarafinda pre-aggregation dusulebilir
3. **Cost tahmini**: Maliyet hesaplama executor bazinda statik — otomatik provider-bazli fiyatlandirma modeli yok
