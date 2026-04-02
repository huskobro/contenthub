# Test Report — Phase 68: Standard Video Artifact Summary Frontend

## Amaç
Standard Video registry listesinde her kayıt için gerçek script/metadata artifact varlığını göstermek.

## Çalıştırılan Komutlar
```
node ./node_modules/.bin/vitest run src/tests/standard-video-artifact-summary.smoke.test.tsx
node ./node_modules/.bin/vitest run
node ./node_modules/.bin/vite build
```

## Seçilen Yaklaşım
Minimal backend genişletme yapıldı. `StandardVideoResponse`'a `has_script` ve `has_metadata` alanları eklendi. `list_standard_videos_with_artifact_summary()` service fonksiyonu oluşturuldu.

Backend değişiklikleri:
- `schemas.py`: `has_script: bool = False`, `has_metadata: bool = False` eklendi
- `service.py`: `list_standard_videos_with_artifact_summary()` eklendi
- `router.py`: list endpoint güncellendi

Frontend: `StandardVideoArtifactStatusBadge` (Var/Eksik/Bilinmiyor) ve `StandardVideoArtifactSummary` bileşenleri oluşturuldu.

## Test Sonuçları
- 10 yeni frontend test — tümü geçti
- 443 toplam frontend test — tümü geçti
- vite build — başarılı

## Değişiklikler
- `backend/app/modules/standard_video/schemas.py` — has_script, has_metadata eklendi
- `backend/app/modules/standard_video/service.py` — list_standard_videos_with_artifact_summary eklendi
- `backend/app/modules/standard_video/router.py` — list endpoint güncellendi
- `frontend/src/api/standardVideoApi.ts` — has_script, has_metadata alanları eklendi
- `StandardVideoArtifactStatusBadge.tsx` (yeni)
- `StandardVideoArtifactSummary.tsx` (yeni)
- `StandardVideosTable.tsx` — Artifact sütunu eklendi
- `standard-video-artifact-summary.smoke.test.tsx` (yeni, 10 test)

## Bilerek Yapılmayanlar
- Generate action, publish readiness, bulk action, preview-first UI, wizard

## Riskler
- Auth/rol zorlama henüz yok (kasıtlı)
