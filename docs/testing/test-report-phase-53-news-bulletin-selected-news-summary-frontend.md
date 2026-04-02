# Test Report — Phase 53: News Bulletin Selected News Summary Frontend

## Amaç
Registry listesinde her News Bulletin için kaç haber seçildiğini sade badge/sayı olarak göstermek.

## Çalıştırılan Komutlar
```
.venv/bin/pytest tests/ -x -q  (backend)
npx vitest run src/tests/news-bulletin-selected-news-summary.smoke.test.tsx
npx vitest run
npm run build
```

## Seçilen Veri Yaklaşımı
`list_news_bulletins_with_artifacts()` servisine `selected_news_count` (COUNT sorgusu) eklendi.
Frontend `NewsBulletinResponse` tipine `selected_news_count?` eklendi. Artifact summary ile aynı pattern.

## Test Sonuçları
- 195 backend test — tümü geçti
- 10 yeni frontend test — tümü geçti
- 293 toplam frontend test — tümü geçti
- `npm run build` — başarılı

## Kapsanan Senaryolar
- count=0 → badge "0", metin "Haber yok"
- count>0 → badge sayı, metin "haber"
- undefined → güvenli fallback (0)
- Tablo "Haberler" sütunu render ediliyor
- UI kırılmıyor

## Değişiklikler
Backend:
- `schemas.py`: `selected_news_count: int = 0` eklendi
- `service.py`: `list_news_bulletins_with_artifacts()`'a COUNT sorgusu eklendi

Frontend:
- `newsBulletinApi.ts`: `selected_news_count?` eklendi
- `NewsBulletinSelectedNewsCountBadge.tsx` (yeni)
- `NewsBulletinSelectedNewsSummary.tsx` (yeni)
- `NewsBulletinsTable.tsx`: Haberler sütunu eklendi
- `news-bulletin-selected-news-summary.smoke.test.tsx` (yeni, 10 test)

## Bilerek Yapılmayanlar
- Selected news detay popover
- Used-news aggregate warning
- Readiness score, bulk action, wizard

## Riskler
- Auth/rol zorlama henüz yok (kasıtlı)
- N+3 sorgu/bulletin artık (script+meta+count); kabul edilebilir
