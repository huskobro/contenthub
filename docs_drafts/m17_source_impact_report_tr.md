# M17-A — Source Impact Metrics Raporu

## Ozet

Operasyon metrikleri sayfasindaki "Kaynak Etkisi" bolumu artik gercek verilerle dolu. Haber kaynaklari, taramalar, haberler ve kullanim metrikleri backend aggregation ile uretilmektedir.

## Mimari

### Veri Akisi
1. NewsSource tablosu: kaynak tanimlari (RSS, manual_url, api)
2. SourceScan tablosu: her kaynak icin tarama gecmisi
3. NewsItem tablosu: taramalardan elde edilen haber ogeleri
4. UsedNewsRegistry tablosu: uretime alinan haberlerin kaydı
5. NewsBulletin tablosu: olusturulan haber bultenleri
6. Analytics service: tum tablolardan SELECT aggregation

### Yeni Endpoint
`GET /api/v1/analytics/source-impact?window={window}`

### Yeni Schema: SourceImpactMetrics

| Alan | Tip | Aciklama |
|------|-----|----------|
| window | str | Zaman penceresi |
| total_sources | int | Toplam kaynak sayisi |
| active_sources | int | Aktif kaynak sayisi |
| total_scans | int | Toplam tarama sayisi |
| successful_scans | int | Basarili tarama sayisi |
| total_news_items | int | Toplam haber sayisi |
| used_news_count | int | Kullanilan haber sayisi |
| bulletin_count | int | Bulletin sayisi |
| source_stats | list[SourceStat] | Kaynak bazli detaylar |

### SourceStat Schema

| Alan | Tip | Aciklama |
|------|-----|----------|
| source_id | str | Kaynak ID |
| source_name | str | Kaynak adi |
| source_type | str | Tur (rss, manual_url, api) |
| status | str | Durum (active, paused, archived) |
| scan_count | int | Tarama sayisi |
| news_count | int | Haber sayisi |
| used_news_count | int | Kullanilan haber sayisi |

## Frontend Degisiklikleri

### AnalyticsOperationsPage — Kaynak Etkisi Bolumu
- 6 ozet kart: Toplam Kaynak, Aktif Kaynak, Toplam Tarama, Toplam Haber, Kullanilan Haber, Bulletin
- Kaynak bazli detayli tablo: Kaynak, Tur, Durum, Tarama, Haber, Kullanilan
- Bos durum mesaji: "Henuz tanimli haber kaynagi bulunmuyor."
- Eski deferred metin tamamen kaldirildi

## Test Sonuclari

| Test | Durum |
|------|-------|
| `test_source_impact_empty_db` | PASSED |
| `test_source_impact_with_data` | PASSED |
| `test_source_impact_schema_fields` | PASSED |
| `test_source_impact_endpoint_returns_200` | PASSED |

## Bilinen Sinirlamalar

1. Kaynak bazli detay sorgusu N+1 pattern kullanir (her kaynak icin ayri used_news sorgusu). Buyuk kaynak sayilarinda optimize edilebilir.
2. Zaman penceresi kaynak tanimlarina degil tarama/haber kayitlarina uygulanir — kaynak sayisi her zaman toplam gosterir.
