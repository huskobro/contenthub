# Test Raporu: Full-Auto E2E Dogrulama

Tarih: 2026-04-13
Tur sayisi: 2
Arac: `backend/scripts/e2e_full_auto_seed.py` (seed/rollback/status)

---

## Test Altyapisi

- Izole seed script: sabit ID'li channel, project, settings override
- Manifest tabanli rollback: tum degisiklikler geri alinir
- Mevcut verilere dokunulmaz

## Tur 1 Sonuclari

| # | Senaryo | Sonuc | Not |
|---|---------|-------|-----|
| 1 | Proje detay automation paneli | PASS | Canvas collapsible render |
| 2 | Cron preset / manual cron | PASS | Zamanlama toggle + aciklama |
| 3 | Evaluate (Hazirlik Kontrolu) | PASS | allowed:true, 0 violation |
| 4 | Simdi Tetikle | PASS | accepted:true, job pipeline basladi |
| 5 | blocked_by_policy | PASS | Concurrency guard aktif |
| 6 | Review gate / auto_advanced | PASS | auto_advanced=true, publish skipped |
| 7 | Job detail badges | PASS | run_mode, trigger_source, auto_advanced |
| 8 | Scheduler status | PARTIAL | enabled:false (ilk tick oncesi — beklenen) |
| 9 | Audit / decision trail | PASS | 2 kayit: accepted + rejected |
| 10 | Duplicate / daily limit | PASS | Concurrent guard evaluate'de de aktif |

### Tur 1 Bulgulari

- BUG-1: job.content_project_id = NULL (fix gerekti)
- BUG-2: standard_videos 3 eksik kolon (ALTER TABLE ile giderildi)
- BUG-3: Scheduler ilk tick davranisi (bug degil)

## Tur 2 Sonuclari (BUG-1 fix sonrasi)

| # | Senaryo | Sonuc | Not |
|---|---------|-------|-----|
| 1 | job.content_project_id dolu mu | PASS | e2e-fa-project-001 |
| 2 | Canvas "Bagli Isler" gorunuyor mu | PASS | 1 kayit, job ID + status |
| 3 | Rollback orphan birakmadan temizliyor mu | PASS | Job + steps + audit temiz |

## Rollback Durumu

Her iki turda da rollback basariyla tamamlandi:
- Tur 1: Script rollback + manuel orphan temizligi (BUG-1 nedeniyle)
- Tur 2: Script rollback tek basina yeterli (BUG-1 fix sonrasi)
