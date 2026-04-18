# Test Report — Phase 9: Elapsed Time & ETA Frontend Display

**Date:** 2026-04-01
**Phase:** 9
**Scope:** `formatDuration` helper, DurationBadge component, elapsed/ETA gösterimi jobs UI'da

---

## Çalıştırılan Komutlar

```bash
cd frontend && npm run build
cd frontend && npm test -- --run
```

---

## Test Sonuçları

| Test File | Tests | Status |
|-----------|-------|--------|
| app.smoke.test.tsx | 4 | ✓ passed |
| settings-registry.smoke.test.tsx | 5 | ✓ passed |
| visibility-registry.smoke.test.tsx | 5 | ✓ passed |
| jobs-registry.smoke.test.tsx | 7 | ✓ passed |
| format-duration.test.ts | 7 | ✓ passed |
| **Total** | **28** | **✓ all passed** |

### Build

```
tsc --noEmit + vite build: ✅ passed (264.80 kB)
```

---

## Yeni / Güncellenen Dosyalar

| Dosya | Değişiklik |
|-------|-----------|
| `frontend/src/lib/formatDuration.ts` | Yeni — null/NaN/negatif → "—", sn/dk/sa formatı |
| `frontend/src/components/jobs/DurationBadge.tsx` | Yeni — formatDuration wrapper component, approximate prop |
| `frontend/src/components/jobs/JobDetailPanel.tsx` | elapsed_total_seconds ve estimated_remaining_seconds DurationBadge ile gösteriliyor |
| `frontend/src/components/jobs/JobStepsList.tsx` | step elapsed_seconds formatDuration ile gösteriliyor |
| `frontend/src/components/jobs/JobsTable.tsx` | elapsed sütunu eklendi, formatDuration kullanılıyor |
| `frontend/src/tests/format-duration.test.ts` | 7 unit test |
| `frontend/src/tests/jobs-registry.smoke.test.tsx` | 2 yeni test: formatlı elapsed/ETA detay panelde, tablo satırında |

---

## Bilerek Yapılmayanlar

- Backend ETA hesaplama motoru — kapsam dışı
- Worker loop / SSE güncelleme — kapsam dışı
- Retry-aware ETA recalculation — kapsam dışı
- date-fns/dayjs/moment kütüphanesi eklenmedi — kasıtlı
- Timeline animasyonu — kapsam dışı

---

## Riskler

- `elapsed_total_seconds` şu an backend tarafından doldurulmuyor (null); worker gelince aktif olacak
- `estimated_remaining_seconds` null; ETA motoru ileriki fazda
