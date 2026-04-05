# M17-B — Analytics Overview Date Range Filter Raporu

## Ozet

Analytics Overview endpoint'i artik `date_from` ve `date_to` parametrelerini desteklemektedir. Frontend'de tarih input'lari aktif hale getirilmis ve deferred mesaji kaldirilmistir.

## Backend Degisiklikleri

### get_overview_metrics() Guncelleme
- `date_from: Optional[datetime]` ve `date_to: Optional[datetime]` parametreleri eklendi
- date_from/date_to verildiginde window cutoff yerine bunlar kullanilir
- Job sorgusu: `Job.created_at >= date_from` ve `Job.created_at <= date_to`
- Publish sorgusu: `PublishRecord.created_at >= date_from/date_to`

### Router Guncelleme
- `GET /analytics/overview` endpoint'ine `date_from` ve `date_to` query parametreleri eklendi
- ISO 8601 format parse: `datetime.fromisoformat(value)`
- Gecersiz format 400 Bad Request doner
- Hata mesaji param adini icerir: "Gecersiz date_from formati: ..."

### Oncelik Kurali
- date_from veya date_to verilmisse → window cutoff ignore edilir
- Her ikisi de None ise → window cutoff kullanilir
- Karisik kullanim desteklenir (sadece date_from veya sadece date_to)

## Frontend Degisiklikleri

### AnalyticsOverviewPage
- `dateFrom` ve `dateTo` state'leri eklendi
- Tarih input'lari artik `disabled` degil — aktif ve kullanilabilir
- Tarih secildiginde `date_from=...T00:00:00` ve `date_to=...T23:59:59` formatinda API'ye gonderilir
- "Temizle" butonu: tarih filtrelerini sifirlar
- Aktif/inaktif durum notu: "Tarih araligi filtresi aktif" / "zaman penceresi secicisi kullanilir"
- Eski disabled input'lar ve "backend entegrasyonu tamamlaninca aktif olacaktir" mesaji kaldirildi

### useAnalyticsOverview Hook Guncelleme
- Artik `AnalyticsWindow | OverviewFetchOptions` kabul eder
- OverviewFetchOptions: `{ window, date_from?, date_to? }`
- Query key date parametrelerini icerir (cache dogru calisir)

## Test Sonuclari

| Test | Durum |
|------|-------|
| `test_overview_date_from_accepted` | PASSED |
| `test_overview_date_to_accepted` | PASSED |
| `test_overview_date_range_combined` | PASSED |
| `test_overview_invalid_date_format` | PASSED |

## Bilinen Sinirlamalar

1. date_from/date_to yalnizca Overview endpoint'inde desteklenir. Operations ve Source Impact endpoint'leri hala window kullanir.
2. Modul filtresi henuz desteklenmiyor — select input kaldirildi, gelecek milestone'da eklenebilir.
