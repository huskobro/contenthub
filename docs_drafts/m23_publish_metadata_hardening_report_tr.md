# M23-A: Publish Metadata Hardening — Rapor

## Ozet

YouTube adapter'daki hardcoded `category_id = "22"` sessiz fallback'i kaldirildi.
Artik metadata default'lari runtime settings uzerinden okunuyor ve eksik metadata
durumunda operatoru bilgilendiren structured log uretiliyor.

## Yapilan Degisiklikler

### Settings Registry

1. **`app/settings/settings_resolver.py`** — Uc yeni ayar eklendi:
   - `publish.youtube.default_category_id` (builtin: "22")
   - `publish.youtube.default_description` (builtin: "")
   - `publish.youtube.default_tags` (builtin: "")
   - Her uc ayar `wired=True`, admin panelinden degistirilebilir

### YouTube Adapter

2. **`app/publish/youtube/adapter.py`** — Metadata cozumleme yeniden yazildi:
   - `__init__()`: `settings_defaults` parametresi eklendi
   - `upload()`: Payload'da eksik field → settings default → builtin fallback zinciri
   - Her default kullanimi `metadata_defaults_used` listesine kaydediliyor
   - Eksik metadata durumunda `logger.warning` ile structured log

### Startup Wiring

3. **`app/main.py`** — YouTube metadata settings resolve edilip adapter'a geciriliyor:
   - `yt_default_category`, `yt_default_desc`, `yt_default_tags` startup'ta cozuluyor
   - `YouTubeAdapter(settings_defaults={...})` ile geciriliyor

## Onceki vs Sonraki

| Alan | Onceki | Sonrasi |
|------|--------|---------|
| category_id | Hardcoded "22" (sessiz) | Settings → builtin "22" (loglu) |
| description | Hardcoded "" (sessiz) | Settings → builtin "" (loglu) |
| tags | Hardcoded [] (sessiz) | Settings → builtin "" (loglu) |
| Operator gorunurlugu | Yok | WARNING log + metadata_defaults_used listesi |

## Test Sonuclari

- `test_youtube_adapter_settings_defaults` — PASSED
- `test_youtube_adapter_uses_settings_category` — PASSED
- `test_publish_settings_registered` — PASSED
- `test_executor_payload_validation_still_works` — PASSED

## Bilinen Sinirlamalar

- YouTube category ID gecerliligi API'ye sormadan dogrulanmiyor
- Admin panelinde category_id secimi icin dropdown henuz yok
- Tags ayari virgul ayirmali string — struct/array format degil
