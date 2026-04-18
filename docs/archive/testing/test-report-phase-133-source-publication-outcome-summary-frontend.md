# Test Report: Phase 133 — Source Publication Outcome Summary Frontend Foundation

**Date:** 2026-04-03
**Phase:** 133
**Scope:** Sources registry module — publication outcome özeti — pure frontend türetimi

---

## Amaç

Admin Sources listesinde her kaynak kaydının yayın sürecindeki konumunu (Hazırlanıyor / Ham çıktı / Aday çıktı / Yayına yakın çıktı) tek bakışta göstermek.

---

## Çalıştırılan Komutlar

```
npx vitest run src/tests/source-publication-outcome-summary.smoke.test.tsx
npx vitest run
npx vite build
```

---

## Seçilen Outcome Yaklaşımı

Pure frontend türetimi. Backend değişikliği yapılmadı.

**Sıra:**
1. used_news_count_from_source > 0 → `Yayına yakın çıktı`
2. reviewed_news_count > 0 && used <= 0 → `Aday çıktı`
3. linked_news_count > 0 && reviewed/used == 0 → `Ham çıktı`
4. aksi takdirde → `Hazırlanıyor`

---

## Test Sonuçları

| # | Test | Sonuç |
|---|------|-------|
| 1 | tüm null → Hazırlanıyor | ✅ |
| 2 | tüm sıfır → Hazırlanıyor | ✅ |
| 3 | tüm undefined → Hazırlanıyor | ✅ |
| 4 | linked > 0, reviewed/used sıfır → Ham çıktı | ✅ |
| 5 | linked > 0, reviewed/used null → Ham çıktı | ✅ |
| 6 | reviewed > 0, used sıfır → Aday çıktı | ✅ |
| 7 | reviewed > 0, used null → Aday çıktı | ✅ |
| 8 | used > 0 → Yayına yakın çıktı | ✅ |
| 9 | used > 0, linked/reviewed sıfır → Yayına yakın çıktı | ✅ |
| 10 | tüm sayılar yüksek → Yayına yakın çıktı | ✅ |

**Smoke:** 10/10 pass. **Full suite:** 1093/1093 pass. **Build:** temiz.

---

## Bileşenler

- `SourcePublicationOutcomeBadge.tsx` — badge renderer
- `SourcePublicationOutcomeSummary.tsx` — compute + wrapper
- `SourcesTable.tsx` — Yayın Çıktısı kolonu eklendi

---

## Bilerek Yapılmayanlar

- Backend değişikliği
- Filter/search entegrasyonu
- AI-assisted outcome integration
