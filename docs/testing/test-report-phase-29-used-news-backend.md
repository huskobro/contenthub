# Test Report — Phase 29: Used News Registry Backend Foundation

## Date
2026-04-02

## Amaç
used_news_registry tablosu ve CRUD API kuruldu. Hangi news item'ın hangi bağlamda kullanıldığını kayıt altına almak için ilk veri yüzeyi açıldı.

## Çalıştırılan Komutlar
```
alembic revision --autogenerate -m "add_used_news_registry_table"
alembic upgrade head
pytest tests/test_used_news_api.py -v
pytest --tb=short -q
```

## Migration Sonucu
`3771f6696ce2_add_used_news_registry_table.py` — applied OK.
Tablolar: `used_news_registry`, indeksler: `news_item_id`, `usage_type`, `target_module`.

## Test Sonuçları

### Phase 29 Tests — 14/14 PASSED

| Test | Result |
|------|--------|
| A) test_used_news_registry_table_exists | PASSED |
| B) test_create_used_news | PASSED |
| C) test_list_used_news | PASSED |
| D) test_get_used_news_by_id | PASSED |
| E) test_update_used_news | PASSED |
| F) test_create_missing_news_item_id | PASSED |
| G) test_create_missing_usage_type | PASSED |
| H) test_create_missing_target_module | PASSED |
| I) test_create_blank_usage_type | PASSED |
| J) test_update_blank_target_module | PASSED |
| K) test_create_news_item_not_found | PASSED |
| L) test_get_used_news_not_found | PASSED |
| M) test_update_used_news_not_found | PASSED |
| N) test_filter_by_news_item_id | PASSED |

### Full Backend Suite
**139/139 PASSED** (0.64s)

## Bilerek Yapılmayanlar
- Duplicate prevention / "tek haber tek kullanım" kısıtı yok (follow-up istisnalar ileride)
- Semantic dedupe yok
- Reservation expiry yok
- Frontend used news sayfası yok
- News item create/update sırasında otomatik kayıt yok
- DELETE endpoint yok

## Riskler / Ertelenenler
- news_item_id veritabanı seviyesinde FK kısıtı yok (uygulama seviyesinde kontrol ediliyor)
- Aynı haber farklı bağlamlarda birden fazla kez kayıt edilebilir (tasarım gereği)
