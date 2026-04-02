# Test Report — Phase 55: News Item Usage Summary Frontend

## Amaç
News Items registry listesinde her haber için kullanım sayısı ve son kullanım bağlamını sade badge olarak göstermek.

## Çalıştırılan Komutlar
```
.venv/bin/pytest tests/ -x -q  (backend)
npx vitest run src/tests/news-item-usage-summary.smoke.test.tsx
npx vitest run
npm run build
```

## Seçilen Veri Yaklaşımı
`usage_count`, `last_usage_type`, `last_target_module` alanları backend list response'a eklendi.
`list_news_items_with_usage_summary()` servisi UsedNewsRegistry'i COUNT + last record ile sorgular.

## Test Sonuçları
- 195 backend test — tümü geçti
- 10 yeni frontend test — tümü geçti
- 313 toplam frontend test — tümü geçti
- `npm run build` — başarılı

## Kapsanan Senaryolar
- usage_count=0 → "Kullanılmamış"
- usage_count>0 → "Nx kullanıldı" badge
- last_usage_type / last_target_module gösterimi
- Tablo "Kullanım" sütunu
- UI kırılmıyor

## Değişiklikler
Backend:
- `news_items/schemas.py`: `usage_count`, `last_usage_type`, `last_target_module` eklendi
- `news_items/service.py`: `list_news_items_with_usage_summary()` eklendi
- `news_items/router.py`: list endpoint güncellendi

Frontend:
- `newsItemsApi.ts`: 3 opsiyonel alan eklendi
- `NewsItemUsageBadge.tsx` (yeni)
- `NewsItemUsageSummary.tsx` (yeni)
- `NewsItemsTable.tsx`: Kullanım sütunu eklendi
- `news-item-usage-summary.smoke.test.tsx` (yeni, 10 test)

## Bilerek Yapılmayanlar
- Usage history drawer
- Dedupe uyarısı
- Reservation expiry
- Analytics trendi
- Filter/search entegrasyonu

## Riskler
- Auth/rol zorlama henüz yok (kasıtlı)
- N+2 sorgu/item (count + last); kabul edilebilir
