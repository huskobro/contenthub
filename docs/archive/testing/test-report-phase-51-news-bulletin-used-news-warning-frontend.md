# Test Report — Phase 51: News Bulletin Used News Warning UI Frontend

## Amaç
Backend'den dönen enforcement alanlarını (used_news_count, used_news_warning, last_usage_type, last_target_module) frontend'de göstermek; selected news listesinde her item için sade warning badge ve detay.

## Çalıştırılan Komutlar
```
npx vitest run src/tests/news-bulletin-used-news-warning.smoke.test.tsx
npx vitest run
npm run build
```

## Warning Yaklaşımı
- `UsedNewsWarningBadge`: warning=true ise "Kullanım kaydı var" sarı badge, false ise hiçbir şey render edilmez.
- `UsedNewsWarningDetails`: used_news_count, last_usage_type (varsa), last_target_module (varsa) gösterir. Sade secondary metin.
- `NewsBulletinSelectedItemsPanel`: her satıra "Uyarı" sütunu eklendi; badge + details satır içi gösterilir.
- Enforcement alanları opsiyonel (`?`) tanımlandığından eski verilerle backward-compatible.

## Test Sonuçları
- 10 yeni frontend test — tümü geçti
- 273 toplam frontend test — tümü geçti
- `npm run build` — başarılı

## Kapsanan Senaryolar
- warning=false → badge görünmüyor
- warning=true → badge görünüyor
- used_news_count gösteriliyor
- last_usage_type gösteriliyor (varsa)
- last_target_module gösteriliyor (varsa)
- null alanlar → ilgili kısım render edilmiyor
- Panel: warning=true item → badge görünüyor
- Panel: warning=false item → badge yok
- Panel: enforcement alanları eksik → UI kırılmıyor

## Değişiklikler
- `newsBulletinApi.ts`: `NewsBulletinSelectedItemResponse`'a 4 opsiyonel enforcement alanı eklendi
- `UsedNewsWarningBadge.tsx`: oluşturuldu
- `UsedNewsWarningDetails.tsx`: oluşturuldu
- `NewsBulletinSelectedItemsPanel.tsx`: warning badge + details entegre edildi, "Uyarı" sütunu eklendi

## Bilerek Yapılmayanlar
- Sert bloklama UI
- Override button
- Picker'da seçim öncesi warning önizleme
- Bulk enforcement görünümü
- Analytics/reporting

## Riskler
- Auth/rol zorlama henüz yok (kasıtlı)
- Enforcement N+1 sorgusu backend'de var (kabul edilebilir)
