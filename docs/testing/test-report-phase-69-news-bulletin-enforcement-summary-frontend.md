# Test Report — Phase 69: News Bulletin Enforcement Summary Frontend

## Amaç
News Bulletin listesinde her bülten için selected news warning aggregate özeti göstermek.

## Çalıştırılan Komutlar
```
node ./node_modules/.bin/vitest run src/tests/news-bulletin-enforcement-summary.smoke.test.tsx
node ./node_modules/.bin/vitest run
node ./node_modules/.bin/vite build
```

## Seçilen Yaklaşım
Minimal backend genişletme yapıldı. `NewsBulletinResponse`'a `has_selected_news_warning` ve `selected_news_warning_count` alanları eklendi. `list_news_bulletins_with_artifacts` servisinde UsedNewsRegistry üzerinden warning aggregate hesaplandı.

Backend değişiklikleri:
- `schemas.py`: `has_selected_news_warning: bool = False`, `selected_news_warning_count: int = 0` eklendi
- `service.py`: `list_news_bulletins_with_artifacts` güncellendi, UsedNewsRegistry'den warning count hesaplandı

Enforcement mantığı:
- selected_news_count = null → Bilinmiyor
- selected_news_count <= 0 → Temiz
- warning_count > 0 → Uyarı var
- diğer → Temiz

## Test Sonuçları
- 10 yeni frontend test — tümü geçti
- 453 toplam frontend test — tümü geçti
- vite build — başarılı

## Değişiklikler
- `backend/app/modules/news_bulletin/schemas.py` — warning alanları eklendi
- `backend/app/modules/news_bulletin/service.py` — warning aggregate hesaplandı
- `frontend/src/api/newsBulletinApi.ts` — warning alanları eklendi
- `NewsBulletinEnforcementStatusBadge.tsx` (yeni)
- `NewsBulletinEnforcementSummary.tsx` (yeni)
- `NewsBulletinsTable.tsx` — Enforcement sütunu eklendi
- `news-bulletin-enforcement-summary.smoke.test.tsx` (yeni, 10 test)

## Bilerek Yapılmayanlar
- Hard block, override akışı, dedupe motoru, recommendation, bulk cleanup, wizard

## Riskler
- Auth/rol zorlama henüz yok (kasıtlı)
