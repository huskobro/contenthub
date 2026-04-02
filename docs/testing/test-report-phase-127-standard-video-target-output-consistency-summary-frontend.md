# Test Report: Phase 127 — Standard Video Target-Output Consistency Summary Frontend Foundation

**Date:** 2026-04-03
**Phase:** 127
**Scope:** Standard Video registry module — target-output consistency özeti — pure frontend türetimi

---

## Amaç

Admin Standard Videos listesinde her video kaydının girdi tarafı ile artifact/çıktı tarafının tutarlılığını (Artifacts yok / Tek taraflı / Tutarsız / Dengeli) tek bakışta göstermek.

---

## Çalıştırılan Komutlar

```
npx vitest run src/tests/standard-video-target-output-consistency-summary.smoke.test.tsx
npx vitest run
npx vite build
```

---

## Seçilen Consistency Yaklaşımı

Pure frontend türetimi. Backend değişikliği yapılmadı.

**Girdi tarafı:** aşağıdakilerden herhangi biri yeterli:
- `topic` dolu
- `brief` dolu
- `target_duration_seconds > 0`
- `language` dolu

**Artifact/çıktı tarafı:**
- `has_script = true` veya `has_metadata = true`

**Öncelik sırası:**
1. Girdi yok + artifact yok → `Artifacts yok`
2. Girdi var + artifact yok → `Tek taraflı`
3. Girdi yok + artifact var → `Tutarsız`
4. Girdi var + artifact var → `Dengeli`

---

## Test Sonuçları

| # | Test | Sonuç |
|---|------|-------|
| 1 | tüm null → Artifacts yok | ✅ |
| 2 | topic boş, artifact yok → Artifacts yok | ✅ |
| 3 | topic var, artifact yok → Tek taraflı | ✅ |
| 4 | brief var, artifact yok → Tek taraflı | ✅ |
| 5 | target_duration > 0, artifact yok → Tek taraflı | ✅ |
| 6 | language var, artifact yok → Tek taraflı | ✅ |
| 7 | girdi yok, has_script true → Tutarsız | ✅ |
| 8 | girdi boş, has_metadata true → Tutarsız | ✅ |
| 9 | topic var + has_script true → Dengeli | ✅ |
| 10 | tüm girdi + her iki artifact → Dengeli | ✅ |

**Smoke:** 10/10 pass. **Full suite:** 1033/1033 pass. **Build:** temiz.

---

## Bilerek Yapılmayanlar

- Backend değişikliği
- Artifact detay/tooltip gösterimi
- Filter/search entegrasyonu
