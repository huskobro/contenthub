# Project Multi-Module Workflow (PHASE AG)

Durum: **Aktif**. ContentProject artık tek-modül kilitli değil.

## Özet

PHASE AE/AF sonrası ContentProject "yeniden kullanılabilir konteyner" hâline
gelmişti, ama `module_type` hâlâ zorunluydu. PHASE AG bu kalıntıyı temizler:

- **Bir proje = birden fazla modülden iş**. Aynı proje altında
  `news_bulletin`, `standard_video`, `product_review` iş kayıtları birlikte
  yaşar.
- Yeni proje oluştururken modül sorulmaz. Backend varsayılan olarak
  `module_type = "mixed"` atar (sentinel sabit:
  `MIXED_PROJECT_MODULE_TYPE`).
- Eski projeler bozulmaz: `standard_video`, `news_bulletin` gibi somut
  `module_type` değerleri ile yaşayan kayıtlar UI'da `X (legacy)` etiketi
  ile gösterilir; akışları kısıtlanmaz.
- `Job.module_type` hâlâ zorunlu — her iş hangi modülden üretildiğini bilir.
  Projeye "modül-üstü konteyner" rolü verildi, işlere "modül kimliği" değil.

## Backend

### Alembic
- `phase_ag_001_content_project_multi_module.py`:
  `content_projects.module_type` → `nullable=True`.
  `batch_alter_table` kullanılır (SQLite uyumlu).
- `downgrade()` reversible: `NULL` kayıtları `"legacy"` olarak gömer, sonra
  `NOT NULL` geri gelir.

### Schema & Service
- `ContentProjectCreate.module_type`: `Optional[str] = Field(None, ...)`.
- `ContentProjectService.create()`:
  `effective_module_type = (payload.module_type or MIXED_PROJECT_MODULE_TYPE).strip()`.
- `ContentProjectResponse.module_type`: `Optional[str]`.

### Guards
- **Full-auto**: Proje `module_type` `None` veya `"mixed"` ise
  full-auto akışı red eder; violation mesajı:
  `"Bu proje modül-üstü (karma). Full-auto başlatılamadı — sadece tek modüle
   ait projelerde otomasyon çalışır."`.
- **Orphan job guard**: Non-admin kullanıcı `POST /api/v1/jobs` çağrısında
  `content_project_id` vermezse **HTTP 422**. Admin hâlâ orphan job
  oluşturabilir (işletim/debug amaçlı).

### Publish & Analytics
- Publish/summary/analytics her biri `content_project_id` üzerinden çalışır.
  Proje `module_type` null/mixed olsa bile bağlı jobs/publish kayıtları
  aggregate olur. Ayrı pipeline değişikliği yok.

## Frontend

### API Tipleri
```ts
interface ContentProjectResponse {
  // PHASE AG: null veya "mixed" = karma proje konteyneri
  module_type: string | null;
  ...
}
interface CreateContentProject {
  // PHASE AG: opsiyonel. Backend varsayılan olarak "mixed" yazar
  module_type?: string | null;
  ...
}
```

### UX Kuralları

- **MyProjects / Canvas MyProjects**: "+ Yeni Proje" modalı sadece iki
  alan sorar: **başlık** (zorunlu) + **kanal** (zorunlu). Modül alanı yok.
  Bilgilendirme: _"Modül seçimini ilgili wizard başlatırken yaparsınız."_
- **Modül filtresi**: Listelerde `Karma (modül-üstü)` seçeneği eklendi;
  eski modül değerleri `X (legacy)` olarak listelenir.
- **Modül kolonu**:
  - `null` veya `"mixed"` → "Karma"
  - `"standard_video"` → "Standart Video (legacy)"
  - `"news_bulletin"` → "Haber Bülteni (legacy)"
  - `"product_review"` → "Ürün İncelemesi (legacy)"
- **ProjectDetail** (legacy + Canvas + Atrium): "Ana modül" satırı
  `formatProjectModuleLabel()` ile dönüştürülür; karma projelerde
  `Karma (modül-üstü)`, legacy projelerde `Standart Video (legacy)`.
- **3 Launcher Kart**: Standard Video / News Bulletin / Product Review
  kartları `contentProjectId=<id>&channelProfileId=<channel>` query
  paramları ile wizard'ları açar. Launcher listesi projenin mevcut
  `module_type` değerine göre daralmaz — tüm modüller her zaman açık.

### Publish Metric
`UserPublishPage` ve `CanvasUserPublishPage`'deki "Ana modül" tile'ı
aynı helper'ı kullanır; `content_ref_type` gönderiminde fallback
`selectedProject.module_type ?? "mixed"` uygulanır.

## Test Matrisi

### Backend (11 test, tamamı yeşil)
`test_phase_ag_multi_module_project.py`:
1. `test_create_project_without_module_type_defaults_to_mixed`
2. `test_create_project_with_legacy_module_type_preserved`
3. `test_single_project_hosts_three_module_jobs`
4. `test_project_summary_aggregates_across_modules`
5. `test_cross_user_cannot_list_other_projects`
6. `test_publish_scope_still_project_bound`
7. `test_full_auto_rejects_mixed_or_null_module`
8. `test_full_auto_allows_legacy_concrete_module`
9. `test_jobs_without_project_id_rejected_for_non_admin`
10. `test_admin_may_create_orphan_job`
11. `test_update_project_metadata_roundtrip`

Full suite: **2403/2403** green.

### Frontend (6 test, tamamı yeşil)
`phase-ag-multi-module-project.smoke.test.tsx`:
1. Tablo karma proje → "Karma"
2. Tablo legacy proje → "Standart Video (legacy)"
3. Create modal'da sadece 1 `<select>` var (kanal), modül option yok
4. ProjectDetail karma → "Karma (modül-üstü)"
5. ProjectDetail legacy → "Standart Video (legacy)"
6. 3 launcher kart doğru query param'larla route ediyor

Pre-existing failing tests (PHASE AG ile alakasız):
- `user-publish-entry.smoke.test.tsx` (6 test)
- `user-panel-empty-state-clarity.smoke.test.tsx` (6 test)

Baseline (stash'li) kosuda da aynı 12 test kırmızı — PHASE AG regression
üretmez.

## Invariants

- `Job.module_type` **hâlâ zorunlu**. Karma proje != karma job.
- Full-auto `module_type` somut olduğunda çalışır. Karma projede manuel
  iş başlatma tek yol (wizard).
- Core invariant: state machine, pipeline step order, workspace structure
  **değişmedi**.
- Settings registry: yeni key eklenmedi. Mixed sentinel kod tarafında;
  yorum satırıyla `MIXED_PROJECT_MODULE_TYPE` olarak expose edildi.
