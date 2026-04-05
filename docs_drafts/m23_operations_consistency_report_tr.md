# M23-D/E: Operations Consistency — Rapor

## Ozet

Visibility/settings operasyonel tamamlanma (restore, history) ve
publish/scheduler operations consistency (duplicate koruma) saglanmistir.

## M23-D: Visibility/Settings Operasyonel Tamamlama

### Yeni Endpoint'ler

| Endpoint | Aciklama |
|----------|----------|
| POST `/visibility-rules/{id}/restore` | Soft-delete geri alma (inactive → active) |
| GET `/visibility-rules/{id}/history` | Audit gecmisi listesi |
| POST `/settings/{id}/restore` | Soft-delete geri alma (deleted → active) |
| GET `/settings/{id}/history` | Audit gecmisi listesi |

### Restore Davranisi

- Zaten active kural/ayar restore → 409 Conflict
- Restore sonrasi audit log yazilir
- Version numarasi restore'da da artar (settings)

### History Davranisi

- `audit_logs` tablosundan `entity_type` + `entity_id` ile filtreleme
- Kronolojik ters sira (en yeni ilk)
- Her entry: id, action, details_json, created_at

## M23-E: Publish Operations Consistency

### Duplicate Publish Korumasi

1. **`trigger_publish()`** — Publishing durumundaki kayit tekrar tetiklenemez
   - `record.status == "publishing"` → `PublishGateViolationError`
   - Hata mesaji: "zaten 'publishing' durumunda. Duplicate trigger engellendi."

2. **`cancel_publish()`** — Zaten iptal edilmis kayit tekrar iptal edilemez
   - `record.status == "cancelled"` → `PublishAlreadyTerminalError`
   - Hata mesaji: "zaten iptal edilmis. Duplicate cancel engellendi."

### State Machine Tutarliligi

State machine zaten su korumalari sagliyor:
- `publishing → publishing` YASAK (duplicate)
- `published → *` YASAK (terminal)
- `cancelled → *` YASAK (terminal)
- `draft → publishing` YASAK (review gate)

M23-E ek olarak explicit hata mesajlari ekledi — state machine
hatasi yerine daha anlasilir "duplicate" hatasi.

### Scheduler Tutarliligi

Scheduler halihazirda saglam:
- `_check_and_trigger()` yalnizca `status == "scheduled"` ve `scheduled_at <= now` olan kayitlari isler
- `trigger_publish()` uzerinden state machine korumalari gecerli
- Audit log scheduler tetiklemeleri icin yaziliyor
- Sessiz hata: scheduler loop hatada olmuyor, warning logluyor

## Test Sonuclari

### M23-D
- `test_visibility_restore` — PASSED
- `test_visibility_restore_already_active` — PASSED
- `test_visibility_history` — PASSED
- `test_settings_restore` — PASSED
- `test_settings_restore_already_active` — PASSED
- `test_settings_history` — PASSED

### M23-E
- `test_publish_duplicate_trigger_protection` — PASSED
- `test_publish_cancel_already_cancelled` — PASSED
- `test_publish_state_machine_transition_matrix` — PASSED

## Bilinen Sinirlamalar

- SSE tabanlı settings/visibility invalidation henuz yok (frontend caching React Query staleTime'a bagli)
- Visibility change history icin ayrı tablo yerine audit_logs tablosu kullaniliyor
- Scheduled publish icin timezone gorsellemesi frontend'te henuz yok
- Cancel sirasinda platform-side iptal (YouTube video silme vb.) otomatik degil
