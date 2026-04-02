# Test Report — Phase 50: News Bulletin Used News Enforcement Backend

## Amaç
Selected news create/list endpoint'lerinde used news enforcement özeti döndürmek; tam bloklama olmadan warning-only yaklaşım.

## Çalıştırılan Komutlar
```
pytest tests/test_news_bulletin_used_news_enforcement_api.py -v
pytest --tb=short
```

## Test Sonuçları
- 10 yeni backend test — tümü geçti
- 195 toplam backend test — tümü geçti

## Kapsanan Senaryolar
- Kullanılmamış haber → used_news_count=0, used_news_warning=False (list)
- Kullanılmamış haber → used_news_count=0, used_news_warning=False (create)
- Kullanılmış haber → used_news_count>=1, used_news_warning=True (list)
- Kullanılmış haber → used_news_count>=1, used_news_warning=True (create)
- last_usage_type ve last_target_module doğru doldu
- Birden fazla used news kaydı → used_news_count doğru
- Enforcement alanları list response'ta mevcut
- Enforcement alanları create response'ta mevcut
- Mevcut selected news liste davranışı bozulmadı
- PATCH hâlâ çalışıyor

## Değişiklikler
- `schemas.py`: `NewsBulletinSelectedItemWithEnforcementResponse` eklendi
- `service.py`: `get_used_news_enforcement()`, `list_bulletin_selected_items_with_enforcement()`, `create_bulletin_selected_item_with_enforcement()` eklendi
- `router.py`: list/create endpoint'leri enforcement response schema'ya geçirildi

## Bilerek Yapılmayanlar
- Sert bloklama (hard block / 409 enforcement)
- Otomatik used news kaydı oluşturma
- Reservation sistemi
- Override permission
- Frontend warning UI
- Analytics

## Riskler
- Auth/rol zorlama henüz yok (kasıtlı)
- Enforcement N+1 sorgusu var (her selected item için ayrı lookup); kabul edilebilir hacimde
