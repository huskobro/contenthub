# Test Report — Phase 52: News Bulletin Artifact Summary Frontend

## Amaç
Registry listesinde her News Bulletin için script ve metadata varlık bilgisini sade badge olarak göstermek.

## Çalıştırılan Komutlar
```
.venv/bin/pytest tests/ -x -q  (backend)
npx vitest run src/tests/news-bulletin-artifact-summary.smoke.test.tsx
npx vitest run
npm run build
```

## Seçilen Veri Yaklaşımı
Backend list endpoint'i `has_script` ve `has_metadata` boolean alanlarıyla genişletildi.
- `NewsBulletinResponse` şemasına iki alan eklendi (default: False)
- `list_news_bulletins_with_artifacts()` servisi eklendi; her bulletin için script/metadata varlığını sorgular
- List router endpoint bu yeni servisi kullanıyor
- Frontend `NewsBulletinResponse` tipine opsiyonel olarak eklendi

## Test Sonuçları
- 195 backend test — tümü geçti
- 10 yeni frontend test — tümü geçti
- 283 toplam frontend test — tümü geçti
- `npm run build` — başarılı

## Kapsanan Senaryolar
- Script var → badge "Script: Var"
- Script yok → badge "Script: Eksik"
- Metadata var → badge "Metadata: Var"
- Metadata yok → badge "Metadata: Eksik"
- Her ikisi de var/yok
- Undefined alanlar → güvenli fallback
- Tablo artifact sütununu render ediyor
- Null/eksik alanlar UI'ı kırıyor mu → hayır

## Değişiklikler
Backend:
- `schemas.py`: `NewsBulletinResponse`'a `has_script`, `has_metadata` eklendi
- `service.py`: `list_news_bulletins_with_artifacts()` eklendi
- `router.py`: list endpoint yeni servisi kullanıyor

Frontend:
- `newsBulletinApi.ts`: `has_script?`, `has_metadata?` eklendi
- `NewsBulletinArtifactStatusBadge.tsx` (yeni)
- `NewsBulletinArtifactSummary.tsx` (yeni)
- `NewsBulletinsTable.tsx`: Artifacts sütunu eklendi
- `news-bulletin-artifact-summary.smoke.test.tsx` (yeni, 10 test)

## Bilerek Yapılmayanlar
- Generate action
- Publish readiness motoru
- Bulk action
- Wizard
- Analytics/reporting

## Riskler
- Auth/rol zorlama henüz yok (kasıtlı)
- `list_news_bulletins_with_artifacts` N+2 sorgu/bulletin; kabul edilebilir hacimde
