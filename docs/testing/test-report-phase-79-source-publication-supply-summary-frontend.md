# Test Report: Phase 79 — Source Publication Supply Summary Frontend Foundation

**Date:** 2026-04-02
**Phase:** 79
**Scope:** Sources publication supply visibility — small backend enrichment + frontend derivation

---

## Amaç

Admin Sources registry listesinde her kaynağın gerçekten yayına aday içerik üretip üretmediğini tek bakışta göstermek. Analytics, conversion funnel veya scheduler etkisi yazmadan.

---

## Çalıştırılan Komutlar

```
npx vitest run src/tests/source-publication-supply-summary.smoke.test.tsx
npx vitest run
npx vite build
python -m pytest tests/test_sources_api.py -q
```

---

## Seçilen Supply Yaklaşımı

Backend: `reviewed_news_count` + `used_news_count_from_source` COUNT sorguları eklendi.
Frontend: mevcut `linked_news_count`, yeni `reviewed_news_count`, `used_news_count_from_source` alanları kullanıldı.

Supply logic (deterministik):
- `linked_news_count` null → `Bilinmiyor`
- `linked_news_count <= 0` → `İçerik yok`
- linked var ama reviewed=0 ve used=0 → `Ham içerik`
- `reviewed_news_count > 0` ve used=0 → `Aday içerik var`
- `used_news_count_from_source > 0` → `Kullanılmış içerik var`

---

## Test Sonuçları

| # | Test | Sonuç |
|---|------|-------|
| 1 | linkedNewsCount null → Bilinmiyor | ✅ |
| 2 | linkedNewsCount 0 → İçerik yok | ✅ |
| 3 | linked + no reviewed/used → Ham içerik | ✅ |
| 4 | linked + reviewed/used null → Ham içerik | ✅ |
| 5 | reviewed > 0 + used=0 → Aday içerik var | ✅ |
| 6 | reviewed > 0 + used null → Aday içerik var | ✅ |
| 7 | used > 0 → Kullanılmış içerik var | ✅ |
| 8 | reviewed+used > 0 → Kullanılmış içerik var | ✅ |
| 9 | linked=0 + reviewed/used>0 → İçerik yok | ✅ |
| 10 | linkedNewsCount undefined → Bilinmiyor | ✅ |

**Smoke:** 10/10 pass. **Full suite:** 553/553 pass. **Backend:** 15/15 pass. **Build:** temiz.

---

## Bilerek Yapılmayanlar

- Analytics / conversion funnel
- Trend / istatistik
- Scheduler etkisi
- Bulk relink
- User panel

---

## Riskler

- N+1 sorgu: her source için 2 ek COUNT sorgusu çalışıyor. MVP için kabul edildi.
