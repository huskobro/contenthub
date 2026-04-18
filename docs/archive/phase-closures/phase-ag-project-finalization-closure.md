# PHASE AG — Project Finalization Closure

Durum: **Kapandı**. ContentProject artık modül-üstü konteyner.

## Hedef (User Directive)

Proje yaratımında modül sormayı bırak; bir proje altında farklı modüllerden
işlerin yaşamasına izin ver; eski (legacy) kayıtları bozma; karma projede
full-auto'yu kibarca durdur.

Net kararlar (kullanıcı verdi):
1. Karma proje otomasyon = pause + warning
2. Legacy proje etiket = "Ana modül: X (legacy)"
3. `module_type` nullable; yeni yol `"mixed"` yazar
4. Eski kayıtlar korunur; `Job.module_type` aynen kalır
5. Analytics ve publish project-scoping korunur
6. Wizard'lar `contentProjectId` + `channelProfileId` query param'ıyla açılır
7. MyProjects / project create / project edit modül sorusu kaldırılır;
   ProjectDetailPage mixed-module merkez yüzey olur, 3 launcher kartı

## Scope

| Alan | Başlık | Sonuç |
|------|--------|-------|
| A | Alembic migration | ✅ `phase_ag_001`: `module_type` nullable (reversible) |
| B | Backend schema/service | ✅ `Optional[str]` + `MIXED_PROJECT_MODULE_TYPE` sentinel |
| C | Full-auto guard | ✅ Karma projede pause + açıklayıcı violation |
| D | Orphan job guard | ✅ Non-admin için 422 (admin bypass korunur) |
| E | Frontend create UX | ✅ Modül picker kaldırıldı (MyProjects + Canvas) |
| F | Frontend detail UX | ✅ "Ana modül" + legacy etiket (3 surface) |
| G | Dashboard + publish null-safe | ✅ Null/mixed/legacy üçlüsü helper'la |
| H | Tests | ✅ 11 backend + 6 frontend; full backend 2403/2403 green |
| I | Docs | ✅ 4 dosya (bu closure dahil) |

## Commits

1. `f7bda99` — `phase_ag migration: content_projects.module_type nullable (modul-ustu project)`
2. `acc8259` — `phase_ag backend: ContentProject modul-ustu konteyner + orphan job guard`
3. `41198bd` — `phase_ag frontend: modul-ustu proje UX + legacy etiket + smoke test`
4. (bu commit) — `phase_ag docs: project finalization closure + multi-module workflow`

## Test Durumu

### Backend

`test_phase_ag_multi_module_project.py` — 11/11 green:
- `test_create_project_without_module_type_defaults_to_mixed`
- `test_create_project_with_legacy_module_type_preserved`
- `test_single_project_hosts_three_module_jobs`
- `test_project_summary_aggregates_across_modules`
- `test_cross_user_cannot_list_other_projects`
- `test_publish_scope_still_project_bound`
- `test_full_auto_rejects_mixed_or_null_module`
- `test_full_auto_allows_legacy_concrete_module`
- `test_jobs_without_project_id_rejected_for_non_admin`
- `test_admin_may_create_orphan_job`
- `test_update_project_metadata_roundtrip`

`test_m7_c1_migration_fresh_db.py`:
- `ALEMBIC_TARGET = "phase_ag_001"` olarak güncellendi
- downgrade iki adımda test edilir: `phase_ag → phase_ac` (reversible) ve
  `phase_ac → phase_x` (forward-only sınır)

Full backend suite: **2403/2403** green.

### Frontend

`phase-ag-multi-module-project.smoke.test.tsx` — 6/6 green:
1. Tablo karma → "Karma"
2. Tablo legacy → "Standart Video (legacy)"
3. Create modal tek `<select>`, modül option yok
4. ProjectDetail karma → "Karma (modül-üstü)"
5. ProjectDetail legacy → "Standart Video (legacy)"
6. 3 launcher kart navigate'i contentProjectId + channelProfileId taşır

Touched smoke suite (PHASE AF + Canvas/Atrium legacy + PHASE AG):
- `phase-af-project-centered.smoke.test.tsx`: 5/5
- `atrium-legacy-fallback.smoke.test.tsx`: 3/3
- `canvas-legacy-fallback.smoke.test.tsx`: 3/3
- `phase-ag-multi-module-project.smoke.test.tsx`: 6/6
- **Toplam**: 17/17

`tsc --noEmit`: EXIT=0.
`npm run build`: success (3.10s).

### Pre-existing Failures (Kapsam Dışı)

Baseline (PHASE AG öncesi) çalıştırmada da aynı 12 test fail ediyor:
- `user-publish-entry.smoke.test.tsx` (6 test)
- `user-panel-empty-state-clarity.smoke.test.tsx` (6 test)

PHASE AG regression üretmez; bu testler ayrı bir iş kaleminde ele
alınmalı.

## Invariants & Kural Kontrolleri

| Kural | Durum |
|-------|-------|
| No hidden behavior | ✅ Fallback (`"mixed"`) schema/service/docs'ta açık |
| No hardcoded prompts or rules | ✅ Sentinel kod tarafında, settings key eklenmedi |
| Core invariants (state machine, pipeline order) | ✅ Değişmedi |
| Settings Registry | ✅ Yeni key yok; mevcut key'ler etkilenmedi |
| Visibility Engine | ✅ Dokunulmadı |
| Snapshot lock (templates/settings at job start) | ✅ Değişmedi |
| Workspace/artifact structure | ✅ Değişmedi |
| Backward compatibility (legacy data) | ✅ Somut `module_type` değerleri korunur |
| Test coverage | ✅ 11 backend + 6 frontend smoke |
| Docs | ✅ 4 dosya |
| Git checkpoint | ✅ 4 ayrı commit |

## Intentionally Deferred

- Mevcut eski projelerin `module_type` değerini otomatik `"mixed"`'e
  çekmek. Çünkü legacy projelerin otomasyonu hâlâ çalışmalı. Admin
  bilinçli olarak bir kaydı `"mixed"` yapmak isterse manuel
  `PATCH /api/v1/content-projects/:id` üzerinden yapabilir.
- Karma projede full-auto yerine "her modül için ayrı plan" önerisi.
  PHASE AG scope'una dahil değil.
- Project seviyesi "asıl modül" ipucu. Karma projede "ağırlık"
  kavramı yok.

## Sonraki Adım

PHASE AG bu haliyle hem backend hem UX tarafında kapanmıştır.
PHASE AH için açık konu başlıkları kullanıcı tarafından henüz
belirtilmemiştir; mevcut pre-existing test failures temizliği ve
Canvas surface tamamlama işleri (`/user/channels/:channelId` router
fix, Canvas panel switcher, video playback gibi) başka oturumlarda
ele alınabilir.
