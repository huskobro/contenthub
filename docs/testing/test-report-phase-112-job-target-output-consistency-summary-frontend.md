# Test Report: Phase 112 — Job Target-Output Consistency Summary Frontend Foundation

**Date:** 2026-04-02
**Phase:** 112
**Scope:** Jobs registry target-output consistency özeti — pure frontend türetimi

---

## Amaç

Admin Jobs listesinde her job kaydının hedef (context/template/workspace) ile çıktı/ilerleme (status/step/error) arasındaki tutarlılığı tek bakışta göstermek.

---

## Çalıştırılan Komutlar

```
npx vitest run src/tests/job-target-output-consistency-summary.smoke.test.tsx
npx vitest run
npx vite build
```

---

## Seçilen Consistency Yaklaşımı

Pure frontend türetimi. Backend değişikliği yapılmadı.

**Hedef tarafı var sayılması için** aşağıdakilerden biri yeterli:
- `source_context_json` parse edilebilir ve en az 1 key varsa, ya da parse edilemeyen ama non-empty string
- `template_id` dolu
- `workspace_path` dolu

**Çıktı/ilerleme tarafı var sayılması için** aşağıdakilerden biri yeterli:
- `status` ∈ {running, processing, in_progress, completed, done, finished}
- `current_step_key` dolu
- `last_error` dolu (single signal, secondary bilgide belirtilir)

**4 seviye:**
- hedef yok + çıktı yok → `Artifacts yok`
- hedef var + çıktı yok → `Tek taraflı`
- hedef yok + çıktı var → `Tutarsız`
- hedef var + çıktı var → `Dengeli`

---

## Test Sonuçları

| # | Test | Sonuç |
|---|------|-------|
| 1 | tüm null → Artifacts yok | ✅ |
| 2 | tüm boş string → Artifacts yok | ✅ |
| 3 | template_id var, çıktı yok → Tek taraflı | ✅ |
| 4 | workspace_path var, status queued → Tek taraflı | ✅ |
| 5 | hedef yok, status running → Tutarsız | ✅ |
| 6 | hedef yok, current_step_key var → Tutarsız | ✅ |
| 7 | context + status completed → Dengeli | ✅ |
| 8 | template_id + current_step_key → Dengeli | ✅ |
| 9 | target + last_error → Dengeli | ✅ |
| 10 | tüm alanlar dolu → Dengeli | ✅ |

**Smoke:** 10/10 pass. **Full suite:** 883/883 pass. **Build:** temiz.

---

## Bilerek Yapılmayanlar

- Backend değişikliği
- Artifact preview
- Live progress updates
- Retry/cancel actions
- Filter/search entegrasyonu
- Bulk actions

---

## Riskler

- `last_error` tek başına çıktı sinyali sayılır — bu kullanım senaryosu edge case, guard mevcut.
- `status = queued/pending/failed` aktif sayılmaz — bu intent yansıtır; queued/pending henüz çıktı üretmemiş.
