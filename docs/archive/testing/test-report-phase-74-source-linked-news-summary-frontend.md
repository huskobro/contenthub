# Test Report: Phase 74 — Source Linked News Summary Frontend Foundation

**Date:** 2026-04-02
**Phase:** 74
**Scope:** Sources linked news visibility — minimal backend enrichment + frontend badge + summary + table column

---

## Amaç

Admin Sources registry listesinde her kaynağın kaç news item ürettiğini tek bakışta göstermek. Import analytics, trend veya quality score yazmamak.

---

## Çalıştırılan Komutlar

```
npx vitest run src/tests/source-linked-news-summary.smoke.test.tsx
npx vitest run
npx vite build
```

---

## Seçilen Veri Yaklaşımı

Minimal backend genişletme: `linked_news_count` alanı `SourceResponse`'a eklendi. Mevcut `list_sources_with_scan_summary()` fonksiyonuna `NewsItem` COUNT sorgusu eklendi. `NewsItem` modeli import edildi. Per-row frontend fetch yapılmadı.

Status logic (frontend, deterministik):
- `linkedNewsCount` undefined → `Bilinmiyor`
- `linkedNewsCount <= 0` → `İçerik yok`
- `linkedNewsCount > 0` → `İçerik var`

---

## Test Sonuçları

| # | Test | Sonuç |
|---|------|-------|
| 1 | undefined → Bilinmiyor | ✅ |
| 2 | 0 → İçerik yok | ✅ |
| 3 | 1 → İçerik var | ✅ |
| 4 | 5 → İçerik var | ✅ |
| 5 | 100 → İçerik var | ✅ |
| 6 | 0 (tekrar) → İçerik yok | ✅ |
| 7 | 999 → İçerik var | ✅ |
| 8 | undefined (tekrar) → Bilinmiyor | ✅ |
| 9 | 2 → İçerik var | ✅ |
| 10 | 0 (tekrar) → İçerik yok | ✅ |

**Smoke:** 10/10 pass. **Full suite:** 503/503 pass. **Build:** temiz.

---

## Bilerek Yapılmayanlar

- Source→news detay drawer
- İçerik dönüşüm oranı
- Trend / istatistik
- Quality score
- Scheduler etkisi analizi

---

## Riskler

- N+1 sorgu pattern devam ediyor; her source için bir NewsItem COUNT sorgusu eklendi. MVP için kabul edilebilir.
