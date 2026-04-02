# Test Report: Phase 114 — Job Publication Yield Summary Frontend Foundation

**Date:** 2026-04-02
**Phase:** 114
**Scope:** Jobs registry publication yield özeti — pure frontend türetimi

---

## Amaç

Admin Jobs listesinde her job kaydının yayın zincirine katkısını (Sorunlu/Hazırlanıyor/Ham çıktı/Aday çıktı/Yayına yakın çıktı/Belirsiz) tek bakışta göstermek.

---

## Çalıştırılan Komutlar

```
npx vitest run src/tests/job-publication-yield-summary.smoke.test.tsx
npx vitest run
npx vite build
```

---

## Seçilen Publication Yield Yaklaşımı

Pure frontend türetimi. Backend değişikliği yapılmadı.

**Öncelik sırası:**
1. `last_error` dolu veya `status = failed` → `Sorunlu`
2. `status` ∈ {completed/done/finished} + anlamlı context + template_id veya workspace_path → `Yayına yakın çıktı`
3. `status` ∈ {completed/done/finished} + anlamlı context → `Aday çıktı`
4. Anlamlı context veya current_step_key var (henüz done değil) → `Ham çıktı`
5. `status` ∈ {queued/running/processing/in_progress}, context yok → `Hazırlanıyor`
6. Diğer → `Belirsiz`

"Anlamlı context": parse edilebilir non-empty JSON object, veya parse edilemeyen ama non-empty string.

---

## Test Sonuçları

| # | Test | Sonuç |
|---|------|-------|
| 1 | status failed → Sorunlu | ✅ |
| 2 | last_error dolu → Sorunlu | ✅ |
| 3 | queued, context yok → Hazırlanıyor | ✅ |
| 4 | running, context/step yok → Hazırlanıyor | ✅ |
| 5 | in_progress + context → Ham çıktı | ✅ |
| 6 | running + step → Ham çıktı | ✅ |
| 7 | completed + context, template/workspace yok → Aday çıktı | ✅ |
| 8 | completed + context + template_id → Yayına yakın çıktı | ✅ |
| 9 | done + context + workspace_path → Yayına yakın çıktı | ✅ |
| 10 | tüm null → Belirsiz | ✅ |

**Smoke:** 10/10 pass. **Full suite:** 903/903 pass. **Build:** temiz.

---

## Bilerek Yapılmayanlar

- Backend değişikliği
- Gerçek artifact preview
- Modül bazlı detay içgörü motoru
- Filter/search entegrasyonu
- Bulk actions
- Live progress intelligence

---

## Riskler

- "Anlamlı context" parse-based — parse edilemeyen non-empty string → Ham çıktı sınırında kalır.
- status=completed ama context yok → Belirsiz — beklenen davranış, korundu.
