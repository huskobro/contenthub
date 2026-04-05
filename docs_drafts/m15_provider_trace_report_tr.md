# M15 — Provider Trace Altyapi Raporu

## Ozet

Provider trace altyapisi, LLM/TTS/gorsel provider cagrilarindan yapisal veri toplanmasini saglar. M15 kapsaminda `build_provider_trace()` helper fonksiyonu olusturulmus ve 3 executor'a entegre edilmistir.

## Mimari

### Katmanlar

1. **`app/providers/trace_helper.py`** — Yardimci fonksiyonlar
   - `build_provider_trace()`: Yapisal trace dict olusturur
   - `TraceTimer`: Context manager ile latency olcumu

2. **`app/contracts/provider_trace.py`** — Pydantic contract (onceden mevcut)
   - `ProviderTraceRecord` sema tanimi

3. **Executor entegrasyonlari** — Her executor result dict'ine `provider_trace` key'i ekler

4. **`PipelineRunner._store_provider_trace()`** — Result JSON'u `provider_trace_json` kolonuna yazar (onceden mevcut)

### Trace Alanlari

| Alan | Tip | Aciklama |
|------|-----|----------|
| `provider_name` | str | Provider adi (ornek: "openai", "edge_tts") |
| `provider_kind` | str | Tur (ornek: "llm", "tts", "visual") |
| `step_key` | str | Hangi step icin uretildigi |
| `model` | str / null | Kullanilan model (ornek: "gpt-4o") |
| `success` | bool | Basarili mi |
| `latency_ms` | float / null | Gecikme suresi (ms) |
| `input_tokens` | int / null | Girdi token sayisi |
| `output_tokens` | int / null | Cikti token sayisi |
| `cost_usd_estimate` | float / null | Tahmini USD maliyet |
| `error_type` | str / null | Hata tipi (basarisizsa) |
| `error_message` | str / null | Hata mesaji |
| `created_at` | str | ISO timestamp |
| `extra` | dict / null | Ek meta veriler |

## Entegre Edilen Executor'lar

### 1. Script Executor (`standard_video/executors/script.py`)
- Provider: LLM (ornek: openai)
- Model: output.trace'den alinir
- Token bilgisi: input_tokens, output_tokens

### 2. TTS Executor (`standard_video/executors/tts.py`)
- Provider: edge_tts
- Kind: tts
- Model: ses adi (voice name)

### 3. Visuals Executor (`standard_video/executors/visuals.py`)
- Provider: gorsel provider
- Kind: visual
- Latency: olculur

## Frontend Gorunumu

### JobSystemPanels — Provider Trace Paneli
- Her step icin `provider_trace_json` parse edilir
- Kart gorunumu ile:
  - Provider adi, tur, model
  - Basari/basarisizlik badge'i
  - Gecikme suresi (saniye)
  - Token kullanimi (input/output)
  - Tahmini maliyet
  - Hata detaylari (basarisiz durumda)

### JobStepResponse Guncellemesi
- Backend: `provider_trace_json` alani `JobStepResponse` semasina eklendi
- Frontend: `provider_trace_json` alani `JobStepResponse` interface'ine eklendi

## Test Sonuclari

| Test | Durum |
|------|-------|
| `test_build_provider_trace_basic` | PASSED |
| `test_build_provider_trace_with_error` | PASSED |
| `test_build_provider_trace_with_extra` | PASSED |
| `test_build_provider_trace_with_cost` | PASSED |
| `test_build_provider_trace_required_fields` | PASSED |
| `test_trace_timer` | PASSED |
| `test_trace_timer_default` | PASSED |

## Bilinen Sinirlamalar

1. **Gercek trace verisi**: Trace altyapisi hazir ancak gercek LLM/TTS provider'lari henuz calismadigi icin (API key gerekliligi) trace verileri yalnizca pipeline gercekten calistiginda uretilir.
2. **Analytics entegrasyonu**: `provider_error_rate` metrigi icin Analytics backend'e baglanti henuz yapilmadi — bu ayri bir aggregation gorevi olarak ertelenmistir.
3. **Cost tahmini**: Maliyet hesaplama modeli henuz basit — provider'a gore otomatik hesaplama eklenmedi.
