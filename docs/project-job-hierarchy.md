# Project ↔ Job Hierarchy — PHASE X

> İşler artık **içerik projesine** bağlanır. Proje kullanıcıya aittir; iş
> proje üzerinden owner'ı alır. Bu sayede list / detail endpoint'lerinde
> ownership tek yerde karar verilir ve orphan işler izlenebilir.

---

## 1. Model İlişkisi

```
User (1) ──── (N) ContentProject (1) ──── (N) Job (1) ──── (N) PublishRecord
                                                  │
                                                  └── (N) JobStep
```

- `ContentProject.user_id` → `User.id` (owner).
- `Job.content_project_id` → `ContentProject.id` (opsiyonel ama **önerilen**).
- `Job.owner_id` → `User.id` (zaten vardı; PHASE X'te backfill'li).
- `PublishRecord.job_id` → `Job.id`. **PublishRecord'un kendi owner_id'si
  yoktur**; job üzerinden türetilir.

---

## 2. Ownership Propagation

### 2.1 Job Create

`create_job(db, *, owner_id, content_project_id=..., ...)`:

1. `content_project_id` verilmişse → ilgili `ContentProject` yüklenir.
2. `ensure_owner_or_admin(ctx, project.user_id)` — kullanıcı kendisine ait
   olmayan projeye iş ekleyemez (admin geçer).
3. `Job.owner_id`:
   - Non-admin: `ctx.user_id` (override edilemez).
   - Admin: explicit `owner_id` parametresi kabul edilir; yoksa proje
     sahibinin id'si kullanılır.

### 2.2 Job List / Detail

`GET /api/v1/jobs`:
- `apply_user_scope(stmt, Job, user_context=ctx, owner_field="owner_id")`.
- Non-admin: sadece kendi job'ları.
- Admin: hepsi.

`GET /api/v1/jobs/{id}`:
- `ensure_owner_or_admin(ctx, job.owner_id)`.

Aynı pattern `job-steps`, `publish-records` (job üzerinden), `artifacts` ve
`logs` endpoint'lerinde uygulanır.

### 2.3 Project Detail Yüzeyi

`GET /api/v1/content-projects/{id}`:
- Ownership check.
- Response'a eklenen alanlar:
  - `job_count`
  - `last_job_status`
  - `recent_jobs` (özet liste)

Frontend `ProjectDetailPage` bu alanlarla server'dan gelir — client-side
ikinci bir sorgu tekrarlanmaz.

---

## 3. Orphan Job Politikası

### Backfill

Migration `phase_x_001`:

```sql
UPDATE jobs
SET owner_id = (
    SELECT user_id
    FROM content_projects
    WHERE content_projects.id = jobs.content_project_id
)
WHERE owner_id IS NULL
  AND content_project_id IS NOT NULL;
```

### Kalan Orphan'lar

Backfill sonrası `owner_id IS NULL` kalan job'lar:
- **Non-admin:** list'te görünmez; detail → 403.
- **Admin:** görür; ayrı operator task ile sahipliği manuel düzeltir.

Kod katmanı `apply_user_scope` üzerinden bu semantiği zaten verir (non-admin
filtresi `owner_id = user_id` eşitliği; `NULL` doğal olarak elenir).

---

## 4. Modüller Arası Tutarlılık

| Endpoint | Ownership kaynağı | Helper |
|---|---|---|
| `/content-projects` | `ContentProject.user_id` | `apply_user_scope` |
| `/jobs` | `Job.owner_id` | `apply_user_scope` |
| `/jobs/{id}/steps` | Job üzerinden | `ensure_job_ownership` |
| `/publish-records` | `Job.owner_id` (JOIN) | `apply_publish_user_scope` |
| `/channel-profiles` | `ChannelProfile.user_id` | `apply_user_scope` |
| `/platform-connections` | `ChannelProfile → user_id` | `ensure_platform_connection_ownership` |
| `/analytics/*` | Hedef modelin owner'ı | `apply_user_scope_multi` |

Tek pattern, tek otorite. Paralel "is_owner" yardımcısı yok.

---

## 5. Bildirim ve Event Semantiği

`job_completed`, `render_failure`, `publish_failure` gibi event'ler
`scope="user"` ile emit edilir — hedef user, job'un `owner_id`'si.

Admin dashboard'u tümünü görür; user paneli yalnız kendine geleni görür.

---

## 6. Migration Detayı

- Additive; eski veriler korunur.
- `Job.content_project_id` kolonu zaten vardı; PHASE X yalnız ownership
  propagation mantığını kod katmanına taşıdı.
- `Job.owner_id` kolonu da vardı; PHASE X NULL satırları backfill etti.
- Rollback senaryosunda (migration downgrade) yeni kolon/index/constraint
  geri alınır; mevcut `owner_id` / `content_project_id` veri kaybı olmaz.

---

## 7. Test Kapsamı

- `backend/tests/test_phase_x_ownership.py`:
  - Project list scope
  - Cross-user project detail → 403
  - Job create without project (user_id = ctx)
  - Job create with project (project ownership enforce)
  - Admin create on behalf of another user
  - Orphan job list (non-admin filter)
- `backend/tests/test_faz5a_project_channel_wiring.py` — project ↔ channel
  linkage hâlâ geçerli.

---

## 8. Gelecek Faz Notları

- **Proje → job "template" senaryosu:** Proje şablon olarak saklanıp çoklu
  job üretmek için klonlanabilir; bu akış şu an kapsamda değil.
- **Ownership transfer:** Bir projenin başka kullanıcıya taşınması UI'da yok.
  Admin için backend servis seviyesinde `update_owner_id` mümkün.
- **Paylaşım (shared projects):** Multi-user erişim modeli eklenecekse ACL
  tablosu gerekir (`project_acl`, `role ∈ {viewer, editor, owner}`). Şu anki
  tek-owner modeli MVP için yeterli.
