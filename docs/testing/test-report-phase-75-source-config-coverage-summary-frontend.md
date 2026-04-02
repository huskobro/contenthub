# Test Report: Phase 75 — Source Config Coverage Summary Frontend Foundation

**Date:** 2026-04-02
**Phase:** 75
**Scope:** Sources type-based configuration visibility — pure frontend derivation, no backend changes

---

## Amaç

Admin Sources registry listesinde her kaynağın source_type bazlı konfigürasyonunun tamam olup olmadığını tek bakışta göstermek. Live validation, diagnostics veya health score yazmamak.

---

## Çalıştırılan Komutlar

```
npx vitest run src/tests/source-config-coverage-summary.smoke.test.tsx
npx vitest run
npx vite build
```

---

## Seçilen Veri Yaklaşımı

Saf frontend türetimi — backend değişikliği yapılmadı. Mevcut `source_type`, `base_url`, `feed_url`, `api_endpoint` alanları kullanıldı.

Config logic (deterministik):
- `source_type` yok/boş → `Tür belirsiz`
- `rss` + `feed_url` dolu → `Feed tanımlı` / boş → `Feed eksik`
- `manual_url` + `base_url` dolu → `URL tanımlı` / boş → `URL eksik`
- `api` + `api_endpoint` dolu → `API tanımlı` / boş → `API eksik`
- Whitespace alan boş kabul edilir

---

## Test Sonuçları

| # | Test | Sonuç |
|---|------|-------|
| 1 | sourceType null → Tür belirsiz | ✅ |
| 2 | sourceType undefined → Tür belirsiz | ✅ |
| 3 | sourceType empty → Tür belirsiz | ✅ |
| 4 | rss + feedUrl set → Feed tanımlı | ✅ |
| 5 | rss + feedUrl null → Feed eksik | ✅ |
| 6 | rss + feedUrl whitespace → Feed eksik | ✅ |
| 7 | manual_url + baseUrl set → URL tanımlı | ✅ |
| 8 | manual_url + baseUrl null → URL eksik | ✅ |
| 9 | api + apiEndpoint set → API tanımlı | ✅ |
| 10 | api + apiEndpoint null → API eksik | ✅ |

**Smoke:** 10/10 pass.

**Full suite:** 513/513 pass (sources-registry test updated to use getAllByText for duplicate "rss" text). **Build:** temiz.

---

## Bilerek Yapılmayanlar

- Live ping/check
- Detay validation matrix
- Diagnostics drawer
- Scheduler policy entegrasyonu
- Source health score

---

## Riskler

- "rss" metni artık tabloda iki yerde görünüyor (Type td + Config detail span). Mevcut smoke test `getAllByText` ile güncellendi. Davranış beklenen.
