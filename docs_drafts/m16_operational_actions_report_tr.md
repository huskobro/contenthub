# M16-A — Operasyonel Aksiyonlar Raporu

## Ozet

Job Detail sayfasindaki ertelenmis aksiyon paneli gercek fonksiyonlara donusturulmustur. 3 aksiyon implement edilmistir: Cancel, Retry, Skip Step.

## Yeni Route'lar

| Method | Path | Aciklama |
|--------|------|----------|
| POST | `/api/v1/jobs/{job_id}/cancel` | Isi iptal et |
| POST | `/api/v1/jobs/{job_id}/retry` | Basarisiz isi yeniden dene (yeni job olusturur) |
| POST | `/api/v1/jobs/{job_id}/steps/{step_key}/skip` | Belirtilen step'i atla |
| GET | `/api/v1/jobs/{job_id}/allowed-actions` | Mevcut duruma gore izin verilen aksiyonlar |

## Cancel Aksiyonu

### Hangi Durumlarda Aktif
- `queued` → `cancelled` ✓
- `running` → `cancelled` ✓
- `waiting` → `cancelled` ✓
- `retrying` → `cancelled` ✓

### Hangi Durumlarda Pasif
- `completed` — terminal
- `failed` — terminal
- `cancelled` — zaten iptal edilmis

### Davranis
- State machine uzerinden transition yapilir
- Calisan step'ler (running) otomatik olarak failed yapilir ("Job cancelled by user")
- Audit log kaydi olusturulur (`job.cancel`)

## Retry Aksiyonu

### Hangi Durumlarda Aktif
- `failed` — yalnizca basarisiz isler yeniden denenebilir

### Rerun Pattern
State machine'de `failed` terminal durumdur — geri donus yoktur. CLAUDE.md kurali: "Rerun/clone of a completed/failed job creates a NEW Job record rather than recycling the terminal state."

Bu nedenle retry islemi:
1. Orijinal job'un input bilgilerini alir (module_type, owner_id, template_id, source_context_json, input_data_json)
2. Yeni bir job olusturur
3. Step'leri ve workspace'i baslatir
4. Pipeline'i dispatcher uzerinden tetikler
5. Yeni job'u doner

### Audit Log
- `job.retry` aksiyonu kaydedilir
- `original_job_id` ve `new_job_id` details'de saklanir

## Skip Step Aksiyonu

### Skip Matrisi

| Step Key | Atlanabilir mi | Sebep |
|----------|---------------|-------|
| `script` | HAYIR | Pipeline'in temel girdisi |
| `metadata` | EVET | Metadata opsiyonel — script varsa video uretilebilir |
| `tts` | HAYIR | Ses olmadan video uretilemez |
| `visuals` | HAYIR | Gorsel olmadan composition yapilamaz |
| `subtitles` | EVET | Altyazi opsiyonel |
| `composition` | HAYIR | Render zorunlu |
| `thumbnail` | EVET | Thumbnail olmadan da video yayinlanabilir |

### Kurallar
- Sadece `pending` durumundaki step'ler atlanabilir
- `_SKIPPABLE_STEPS` frozenset'i kodda tanimli: `{"metadata", "thumbnail", "subtitles"}`
- State machine uzerinden `PENDING → SKIPPED` transition yapilir
- Audit log kaydi olusturulur (`job.step_skip`)

### Downstream Guvenlik
- Skip edilen step'in downstream akisi bozulmaz cunku:
  - Pipeline zaten sirali calisir
  - Skip edilen step'in ciktisi gerektiren downstream step'ler, ciktinin olmamasi durumunda kendi hata mekanizmalarini tetikler
  - Sadece gercekten opsiyonel step'lere izin verilir

## Allowed Actions Endpoint

| Job Status | can_cancel | can_retry | skippable_steps |
|-----------|-----------|----------|----------------|
| queued | true | false | pending & skippable |
| running | true | false | pending & skippable |
| waiting | true | false | pending & skippable |
| retrying | true | false | [] |
| completed | false | false | [] |
| failed | false | true | [] |
| cancelled | false | false | [] |

## Frontend

### JobActionsPanel Bileseni
- `frontend/src/components/jobs/JobActionsPanel.tsx`
- Cancel, Retry butonlari
- Skippable step'ler icin dinamik butonlar
- Loading/Error/Success durum yonetimi
- Butonlar `allowed-actions` endpoint'ine gore enabled/disabled
- Aksiyon sonrasi otomatik query invalidation

### Deferred Metin Kaldirildi
- "Operasyonel aksiyonlar (Retry, Cancel, Skip) M14 milestone'unda aktif edilecektir" mesaji tamamen kaldirildi
- Yerini gercek butonlar ve durum bilgisi aldi

## Test Sonuclari

| Test | Durum |
|------|-------|
| `test_cancel_job_success` | PASSED |
| `test_cancel_running_job_success` | PASSED |
| `test_cancel_terminal_job_rejected` | PASSED |
| `test_cancel_not_found` | PASSED |
| `test_retry_failed_job_creates_new` | PASSED |
| `test_retry_non_failed_rejected` | PASSED |
| `test_skip_non_skippable_step_rejected` | PASSED |
| `test_allowed_actions_queued` | PASSED |
| `test_allowed_actions_failed` | PASSED |
| `test_allowed_actions_completed` | PASSED |
| Frontend: `job-actions-panel.smoke.test.tsx` (4 test) | ALL PASSED |
