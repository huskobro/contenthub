# Test Report: Phase 122 — Template Input Specificity Summary Frontend Foundation

**Date:** 2026-04-02
**Phase:** 122
**Scope:** Templates registry module — input specificity özeti — pure frontend türetimi

---

## Amaç

Admin Templates listesinde her template kaydının girişinin ne kadar özgü olduğunu (Genel giriş / Kısmi özgüllük / Belirgin giriş) tek bakışta göstermek.

---

## Çalıştırılan Komutlar

```
npx vitest run src/tests/template-input-specificity-summary.smoke.test.tsx
npx vitest run
npx vite build
```

---

## Seçilen Specificity Yaklaşımı

Pure frontend türetimi. Backend değişikliği yapılmadı.

**template_type'a göre ana JSON:**
- `style` → `style_profile_json`
- `content` → `content_rules_json`
- `publish` → `publish_profile_json`
- Bilinmeyen → ilk dolu JSON alanı

**Öncelik sırası:**
1. Ana JSON yoksa → `Genel giriş`
2. Ana JSON parse edilemeyen string veya 1 key → `Kısmi özgüllük`
3. 2+ key + (style_link_count > 0 veya primary_link_role var) → `Belirgin giriş`
4. 2+ key ama style link yok → `Kısmi özgüllük`

---

## Test Sonuçları

| # | Test | Sonuç |
|---|------|-------|
| 1 | tüm null → Genel giriş | ✅ |
| 2 | style type, JSON null → Genel giriş | ✅ |
| 3 | content type, JSON boş → Genel giriş | ✅ |
| 4 | unparseable JSON → Kısmi özgüllük | ✅ |
| 5 | 1-key JSON, no style link → Kısmi özgüllük | ✅ |
| 6 | 2-key JSON, no style link → Kısmi özgüllük | ✅ |
| 7 | 2-key JSON + style_link_count → Belirgin giriş | ✅ |
| 8 | 2-key JSON + primary_link_role → Belirgin giriş | ✅ |
| 9 | 3-key JSON + style link → Belirgin giriş | ✅ |
| 10 | 1-key JSON + style link → Kısmi özgüllük | ✅ |

**Smoke:** 10/10 pass. **Full suite:** 983/983 pass. **Build:** temiz.

---

## Bilerek Yapılmayanlar

- Backend değişikliği
- Resolve preview / precedence analizi
- Filter/search entegrasyonu
- Bulk actions

---

## Riskler

- Bilinmeyen template_type için ilk dolu JSON alanı kullanıldı — yanlış alan seçilebilir ama kabul edilebilir.
