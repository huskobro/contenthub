# Test Raporu — Phase 1.2: State Machine Enforcement

**Tarih:** 2026-04-04
**Faz:** Integration Plan — Ana Faz 1 (Execution Foundation + SSE Pack), Alt Faz 1.2
**Durum:** TAMAMLANDI (Codex 5.4 review bekleniyor — push bekleniyor)

---

## Bu Adımda Ne Enforce Edildi

### Yeni Dosyalar

| Dosya | İçerik |
|---|---|
| `backend/app/jobs/exceptions.py` | JobEngineError (base), JobNotFoundError, StepNotFoundError, InvalidTransitionError — HTTP mapping notlarıyla |
| `backend/tests/test_job_transitions.py` | 68 test — valid/invalid transitions, side effects, terminal state, log append, artifact replace |

### Değiştirilen Dosyalar

| Dosya | Değişiklik |
|---|---|
| `backend/app/jobs/service.py` | Phase 1.2 transition enforcement eklendi: validate_job_transition, validate_step_transition, transition_job_status, transition_step_status, is_job_terminal, is_step_terminal, allowed_next_job_statuses, allowed_next_step_statuses, get_job_step |

---

## Hangi Transition Kuralları Gerçek Service Akışına Bağlandı

### Job geçişleri
- queued → running: `started_at` set (ilk kez), `last_error` cleared
- queued → cancelled: `finished_at` set, `last_error` cleared
- running → waiting: sadece `updated_at` değişir
- running → retrying: `retry_count` +1, `last_error` cleared
- running → completed: `finished_at` set, `current_step_key` cleared, `last_error` cleared
- running → failed: `finished_at` set, `last_error` set (caller'dan)
- running → cancelled: `finished_at` set, `last_error` cleared
- waiting → running: `started_at` korunur (override yok)
- retrying → running: `started_at` korunur
- retrying → failed: `finished_at` set, `last_error` set

### Step geçişleri
- pending → running: `started_at` set (ilk kez)
- pending → skipped: `finished_at` set, `elapsed_seconds` set edilmez (step hiç çalışmadı)
- running → completed: `finished_at` set, `elapsed_seconds` hesaplanır
- running → failed: `finished_at` set, `elapsed_seconds` hesaplanır, `last_error` set
- running → retrying: `last_error` cleared
- retrying → running: `started_at` korunur

---

## Side Effect Kuralları (Deterministic)

| Kural | Davranış |
|---|---|
| `started_at` | Sadece ilk `running` geçişinde set edilir; sonraki `running` geçişlerinde overwrite edilmez |
| `finished_at` | `completed`, `failed`, `cancelled`, `skipped` geçişlerinde set edilir |
| `last_error` | `failed` geçişinde set edilir; `running`, `retrying`, `completed`, `cancelled` geçişlerinde cleared |
| `log_text` | APPEND-ONLY; hiçbir zaman overwrite edilmez; `log_append` argümanı ile eklenir |
| `artifact_refs_json` | Sağlanırsa REPLACE edilir; sağlanmazsa korunur |
| `retry_count` | Sadece `retrying` geçişinde +1 artar; başka hiçbir yerde değiştirilmez |
| `current_step_key` | `completed` geçişinde otomatik cleared; diğer geçişlerde `current_step_key` kwarg ile güncellenir |
| `elapsed_seconds` (step) | `completed` ve `failed` geçişlerinde `started_at` - `now` hesaplanır; `skipped` için hesaplanmaz |

---

## Exception Modeli

| Exception | Durum | HTTP |
|---|---|---|
| `JobNotFoundError` | job_id DB'de yok | 404 |
| `StepNotFoundError` | (job_id, step_key) DB'de yok | 404 |
| `InvalidTransitionError` | state machine reddetti | 409 |
| `JobEngineError` | base — catch-all | 500 |

`InvalidTransitionError` entity, entity_id, from_status, to_status taşır — debug ve audit için yeterli.

---

## Test Sonuçları

```
tests/test_job_transitions.py: 68 passed in 0.19s

Full suite: 357 passed in 3.03s (sıfır regresyon)
TypeScript tsc --noEmit: temiz
```

### Test Kategorileri (68 test)
- validate_job_transition valid: 10
- validate_job_transition invalid: 6
- validate_step_transition valid: 7
- validate_step_transition invalid: 4
- transition_job_status (DB): 13
- transition_step_status (DB): 11
- terminal helpers: 9
- allowed_next helpers: 4
- jobs API smoke (regresyon): 3
- toplam: 68

---

## Bu Adımda Özellikle Yapılmayanlar

| Yapılmayan | Neden |
|---|---|
| Executor / worker loop | Phase 1.3 kapsamı |
| Gerçek queue polling | Phase 1.3 kapsamı |
| Gerçek step handler | Phase 1.4 kapsamı |
| Gerçek SSE event yayınlama | Phase 1.6 kapsamı |
| Retry endpoint (HTTP) | Phase 1.3+ kapsamı; servis zemini hazır |
| Cancel endpoint (HTTP) | Phase 1.3+ kapsamı; servis zemini hazır |
| RetryHistory DB persist | Phase 1.7 kapsamı; schema Phase 1.1'de tanımlandı |
| Full audit log | Settings Registry bağlantısı sonra; transition hook noktası service'te hazır |
| AuditLog entegrasyonu | Mevcut AuditLog model var; execution transition ile bağlama Phase 1.3+ |

---

## Phase 1.3+ İçin Hazırlanan Zemin

- `transition_job_status` ve `transition_step_status` executor'ın doğrudan çağıracağı fonksiyonlar
- `is_job_terminal` / `is_step_terminal` — worker loop'un kullanacağı kontroller
- `allowed_next_job_statuses` / `allowed_next_step_statuses` — admin panel aksiyonları için
- `InvalidTransitionError` — router'larda 409 HTTP olarak yüzeylendirilebilir
- `log_append` parametresi — pipeline runner step loglarını append-only yazacak
- `artifact_refs_json` kwarg — pipeline runner artifact'ları step'e bağlayacak

---

## Codex 5.4 Review Notları

Bu implementation review'dan geçmesi için şu kurallara bilinçli uyuldu:

1. **Tek resmi pattern**: İki farklı geçiş yolu yok. Tüm status değişimi `transition_job_status` / `transition_step_status` üzerinden.
2. **String literal yok**: `job.status = "running"` doğrudan atama service dışında yok.
3. **Paralel pattern yok**: `contracts/state_machine.py` kullanılıyor, kopya mantık yok.
4. **Side effect determinism**: Her geçiş için hangi alanın ne olacağı tek yerde ve dokümante.
5. **Log append-only**: `log_text` hiçbir zaman overwrite edilmiyor.
6. **Terminal state korunuyor**: Terminal'den ileriye geçiş imkansız, test ile doğrulandı.
7. **Exception ayrımı netti**: NotFound vs InvalidTransition vs ValidationError karışmıyor.
