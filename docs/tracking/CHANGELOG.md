# DEĞİŞİKLİK GEÇMİŞİ

---

## [2026-04-01] Phase 11 — Standard Video Backend Input Foundation

**Ne:** Standard Video modülü için backend input foundation kuruldu. `standard_videos` tablosu, CRUD API ve 8 yeni test eklendi.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/db/models.py` (`StandardVideo` modeli eklendi)
- `backend/app/modules/__init__.py` (yeni)
- `backend/app/modules/standard_video/__init__.py` (yeni)
- `backend/app/modules/standard_video/schemas.py` (yeni — Create/Update/Response)
- `backend/app/modules/standard_video/service.py` (yeni — list/get/create/update)
- `backend/app/modules/standard_video/router.py` (yeni — GET/POST/PATCH)
- `backend/app/api/router.py` (standard_video_router eklendi)
- `backend/alembic/versions/bf791934579f_add_standard_videos_table.py` (yeni)
- `backend/tests/test_standard_video_api.py` (8 yeni test)
- `docs/testing/test-report-phase-11-standard-video-backend.md` (yeni)
**Testler:** `pytest` — 44 passed (36 mevcut + 8 yeni) in ~0.22s
**Commit:** `f4a0aa4` — `feat: add phase 11 standard video backend input foundation`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-01] Phase 10 — Job Detail Page

**Ne:** Job detayı side panel'den çıkarılıp ayrı `/admin/jobs/:jobId` sayfasına taşındı. JobOverviewPanel, JobTimelinePanel, JobSystemPanels eklendi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/pages/admin/JobDetailPage.tsx` (yeni)
- `frontend/src/components/jobs/JobOverviewPanel.tsx` (yeni)
- `frontend/src/components/jobs/JobTimelinePanel.tsx` (yeni)
- `frontend/src/components/jobs/JobSystemPanels.tsx` (yeni)
- `frontend/src/app/router.tsx` (`/admin/jobs/:jobId` eklendi)
- `frontend/src/pages/admin/JobsRegistryPage.tsx` (navigate eklendi)
- `frontend/src/tests/job-detail-page.smoke.test.tsx` (5 yeni test)
- `frontend/src/tests/jobs-registry.smoke.test.tsx` (güncellendi)
**Testler:** `npm test` — 33 passed (4+5+5+7+7+5) in ~4.5s
**Commit:** `956e862` — `feat: add phase 10 job detail page with overview timeline and system panels`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-01] Phase 9 — Elapsed Time & ETA Frontend Display

**Ne:** formatDuration helper (Türkçe, saf fonksiyon), DurationBadge component, elapsed/ETA alanları jobs UI'da okunabilir formatla gösteriliyor.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/lib/formatDuration.ts` (yeni)
- `frontend/src/components/jobs/DurationBadge.tsx` (yeni)
- `frontend/src/components/jobs/JobDetailPanel.tsx` (DurationBadge ile elapsed/ETA)
- `frontend/src/components/jobs/JobStepsList.tsx` (formatDuration ile step elapsed)
- `frontend/src/components/jobs/JobsTable.tsx` (elapsed sütunu eklendi)
- `frontend/src/tests/format-duration.test.ts` (7 unit test)
- `frontend/src/tests/jobs-registry.smoke.test.tsx` (2 yeni test)
- `docs/testing/test-report-phase-9-eta-frontend.md`
**Testler:** `npm test` — 28 passed (4+5+5+7+7) in ~3s
**Commit:** `8aa3ab4` — `feat: add phase 9 elapsed time and eta frontend display`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-01] Phase 8 — Admin Jobs Registry Frontend Foundation

**Ne:** Admin panelde job kayıtlarını backend'den listeleme ve tekil job + step detayı görüntüleme.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/api/jobsApi.ts`, `hooks/useJobsList.ts`, `hooks/useJobDetail.ts`
- `frontend/src/components/jobs/JobsTable.tsx`, `JobDetailPanel.tsx`, `JobStepsList.tsx`
- `frontend/src/pages/admin/JobsRegistryPage.tsx`
- `frontend/src/app/router.tsx` (`/admin/jobs` eklendi)
- `frontend/src/app/layouts/AdminLayout.tsx` (Jobs linki aktif)
- `frontend/src/tests/jobs-registry.smoke.test.tsx` (5 yeni test)
- `docs/testing/test-report-phase-8-jobs-frontend.md`
**Testler:** `npm test` — 19 passed (4+5+5+5) in ~3s
**Commit:** `2d29037` — `feat: add phase 8 admin jobs registry frontend foundation`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-01] Phase 7 — Job Engine Backend Foundation

**Ne:** Job ve JobStep first-class backend objeler olarak eklendi. Alembic migration, service katmanı, CRUD API (GET list, GET detail, POST create).
**Eklenen/değiştirilen dosyalar:**
- `backend/app/db/models.py` (`Job`, `JobStep` modelleri eklendi)
- `backend/app/jobs/__init__.py`, `schemas.py`, `service.py`, `router.py`
- `backend/app/api/router.py` (jobs_router bağlandı)
- `backend/alembic/versions/f67997a06ef5_add_jobs_and_job_steps_tables.py`
- `backend/tests/test_jobs_api.py` (8 yeni test)
- `docs/testing/test-report-phase-7-jobs-backend.md`
**Testler:** `pytest tests/` — 36 passed in 0.16s
**Commit:** `a6a1848` — `feat: add phase 7 job engine backend foundation`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-01] Phase 6 Integration Check — Frontend-Backend Alignment

**Ne:** Frontend API path'leri backend endpoint'leriyle tam uyumlu doğrulandı. Vite dev proxy eklendi (`/api` → `http://127.0.0.1:8000`). Manuel curl doğrulaması yapıldı.
**Eklenen/değiştirilen dosyalar:**
- `frontend/vite.config.ts` — `server.proxy` eklendi
- `docs/testing/test-report-phase-6-integration-check.md`
**Testler:** 28 backend + 14 frontend = 42 passed
**Commit:** `04c7cf9` — `fix: align frontend admin registries with real backend endpoints`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-01] Phase 6 — Admin Visibility Registry Frontend

**Ne:** Admin panelde visibility kurallarını backend'den listeleme ve tekil detay görüntüleme. API katmanı, React Query hooks, VisibilityRegistryPage, VisibilityRulesTable, VisibilityRuleDetailPanel.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/api/visibilityApi.ts`
- `frontend/src/hooks/useVisibilityRulesList.ts`, `useVisibilityRuleDetail.ts`
- `frontend/src/pages/admin/VisibilityRegistryPage.tsx`
- `frontend/src/components/visibility/VisibilityRulesTable.tsx`, `VisibilityRuleDetailPanel.tsx`
- `frontend/src/app/router.tsx` (`/admin/visibility` route eklendi)
- `frontend/src/app/layouts/AdminLayout.tsx` (Visibility linki aktif)
- `frontend/src/tests/visibility-registry.smoke.test.tsx` (5 yeni test)
- `frontend/src/tests/settings-registry.smoke.test.tsx` (`global.fetch` → `window.fetch` düzeltmesi)
- `docs/testing/test-report-phase-6-visibility-frontend.md`
**Testler:** `npm test` — 14 passed (4 + 5 + 5) in 777ms
**Commit:** `f291944` — `feat: add phase 6 admin visibility registry frontend foundation`
**Push:** ✓ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-01] Phase 5 — Admin Settings Registry Frontend

**Ne:** Admin panelde ayarları backend'den listeleme ve tekil detay görüntüleme. React Query entegrasyonu, API katmanı, hooks, SettingsRegistryPage, SettingsTable, SettingDetailPanel.
**Eklenen/değiştirilen dosyalar:**
- `frontend/package.json` (`@tanstack/react-query` eklendi)
- `frontend/src/api/settingsApi.ts`
- `frontend/src/hooks/useSettingsList.ts`, `useSettingDetail.ts`
- `frontend/src/pages/admin/SettingsRegistryPage.tsx`
- `frontend/src/components/settings/SettingsTable.tsx`, `SettingDetailPanel.tsx`
- `frontend/src/app/router.tsx` (`/admin/settings` route eklendi)
- `frontend/src/app/layouts/AdminLayout.tsx` (Settings linki aktif)
- `frontend/src/app/App.tsx` (`QueryClientProvider` eklendi)
- `frontend/src/tests/settings-registry.smoke.test.tsx` (5 yeni test)
- `docs/testing/test-report-phase-5-settings-frontend.md`
**Testler:** `npm test` — 9 passed (4 eski + 5 yeni) in 827ms
**Commit:** `318f262` — `feat: add phase 5 admin settings registry frontend foundation`
**Push:** ✓ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-01] Phase 4 — Visibility Engine Backend Temeli

**Ne:** Görünürlük kuralları (`visibility_rules`) first-class backend objesi olarak kuruldu. VisibilityRule modeli, Pydantic schema'ları, service katmanı, FastAPI CRUD router, Alembic migration. `test_settings_api.py` testlerinde paylaşılan DB üzerinde oluşan unique key çakışması `_uid()` suffix ile düzeltildi.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/db/models.py` (`VisibilityRule` modeli eklendi)
- `backend/app/visibility/__init__.py`
- `backend/app/visibility/schemas.py` (VisibilityRuleCreate, VisibilityRuleUpdate, VisibilityRuleResponse)
- `backend/app/visibility/service.py` (list, get, create, update)
- `backend/app/visibility/router.py` (GET /visibility-rules, GET /visibility-rules/{id}, POST /visibility-rules, PATCH /visibility-rules/{id})
- `backend/app/api/router.py` (visibility router bağlandı)
- `backend/alembic/versions/de267292b2ab_add_visibility_rules_table.py`
- `backend/tests/test_visibility_api.py` (11 yeni test)
- `backend/tests/test_settings_api.py` (key çakışması düzeltmesi)
- `docs/testing/test-report-phase-4-visibility-backend.md`
**Testler:** `pytest tests/test_visibility_api.py tests/test_settings_api.py tests/test_health.py tests/test_db_bootstrap.py` — 28 passed in 0.09s
**Commit:** `3966990` — `feat: add phase 4 backend visibility registry foundation`
**Push:** ✓ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-01] Doküman Türkçeleştirme

**Ne:** Repository genelindeki İngilizce dokümantasyon Türkçeye çevrildi. `CLAUDE.md` istisna olarak İngilizce bırakıldı.
**Değiştirilen dosyalar:**
- `README.md`
- `renderer/README.md`
- `docs/architecture/README.md`
- `docs/testing/README.md`
- `docs/testing/test-report-phase-1-backend.md`
- `docs/testing/test-report-phase-1-frontend.md`
- `docs/testing/test-report-phase-1-renderer.md`
- `docs/testing/test-report-phase-2-panel-shell.md`
- `docs/testing/test-report-phase-2-db-foundation.md`
- `docs/testing/test-report-phase-3-settings-backend.md`
- `docs/tracking/STATUS.md`
- `docs/tracking/CHANGELOG.md`
**Testler:** Yok (doküman değişikliği)
**Commit:** `84c4661` — `docs: turkcelestir repository dokumantasyonu`
**Push:** ✓ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-01] Phase 3 — Settings Registry Backend

**Ne:** Settings veritabanı yönetimli ürün objeleri haline getirildi. Tam metadata alanlarına sahip Setting modeli, Pydantic schema'ları (oluştur/güncelle/yanıt), service katmanı, api_router'a bağlı FastAPI router, Alembic migration.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/db/models.py` (`Setting` modeli eklendi)
- `backend/app/settings/__init__.py`
- `backend/app/settings/schemas.py` (SettingCreate, SettingUpdate, SettingResponse)
- `backend/app/settings/service.py` (list, get, create, update)
- `backend/app/settings/router.py` (GET /settings, GET /settings/{id}, POST /settings, PATCH /settings/{id})
- `backend/app/api/router.py` (settings router bağlandı)
- `backend/alembic/versions/f0dea9dfd155_add_settings_table.py`
- `backend/tests/test_settings_api.py` (9 yeni test)
- `docs/testing/test-report-phase-3-settings-backend.md`
**Testler:** `pytest tests/test_settings_api.py tests/test_health.py tests/test_db_bootstrap.py` — 17 passed in 0.06s
**Commit:** `b370e24` — `feat: add phase 3 backend settings registry foundation`
**Push:** ✓ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-01] Phase 2 — Backend Veritabanı Temeli

**Ne:** WAL modu, SQLAlchemy 2.0 async engine, Alembic migration pipeline ve üç bootstrap tablosunu içeren SQLite veritabanı temeli (app_state, audit_logs, users).
**Eklenen/değiştirilen dosyalar:**
- `backend/pyproject.toml` (sqlalchemy, aiosqlite, alembic, greenlet eklendi)
- `backend/app/core/config.py` (database_url ve database_url_sync özellikleri eklendi)
- `backend/app/db/base.py` (DeclarativeBase)
- `backend/app/db/models.py` (AppState, AuditLog, User modelleri)
- `backend/app/db/session.py` (WAL + FK pragma event listener ile async engine)
- `backend/alembic.ini` (başlatıldı)
- `backend/alembic/env.py` (uygulama ayarları ve metadata kullanacak şekilde yeniden yazıldı)
- `backend/alembic/versions/e7dc18c0bcfb_initial_foundation_tables.py` (otomatik migration)
- `backend/data/.gitkeep` (fresh checkout'ta backend/data/ dizinini garantiler)
- `backend/tests/test_db_bootstrap.py` (6 yeni async test)
- `docs/testing/test-report-phase-2-db-foundation.md`
**Testler:** `pytest tests/test_db_bootstrap.py tests/test_health.py` — 8 passed in 0.14s
**Commit:** `0fb487d` — `feat: add phase 2 backend database foundation with sqlite and alembic`
**Push:** ✓ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-01] Phase 2 — Frontend Panel Shell

**Ne:** Toggle tabanlı uygulama shell'i gerçek react-router-dom routing ile değiştirildi. Header ve sidebar içeren Admin ve User layout'ları. Route yapısı: `/admin`, `/user`, `/` → `/user`'a yönlendirme.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/app/router.tsx`
- `frontend/src/app/layouts/AdminLayout.tsx`, `UserLayout.tsx`
- `frontend/src/components/layout/AppHeader.tsx`, `AppSidebar.tsx`
- `frontend/src/app/App.tsx` (güncellendi)
- `frontend/src/pages/AdminOverviewPage.tsx`, `UserDashboardPage.tsx` (küçük güncellemeler)
- `frontend/src/tests/app.smoke.test.tsx` (routing için yeniden yazıldı)
- `frontend/package.json` (react-router-dom eklendi)
- `docs/testing/test-report-phase-2-panel-shell.md`
**Testler:** `npm test` — 4 passed in 433ms
**Commit:** `943ac13` — `feat: add phase 2 frontend panel shell and basic routing`
**Push:** ✓ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-01] Phase 1 — Renderer & Workspace İskeleti

**Ne:** Gelecekteki Remotion entegrasyonu için renderer dizin iskeleti. Workspace klasör yapısı .gitkeep ile git'te izleniyor. .gitignore workspace yapısına izin verirken çalışma zamanı içeriğini görmezden gelecek şekilde güncellendi.
**Eklenen/değiştirilen dosyalar:**
- `renderer/README.md`
- `renderer/src/compositions/.gitkeep`, `renderer/src/shared/.gitkeep`, `renderer/tests/.gitkeep`
- `workspace/jobs/.gitkeep`, `workspace/exports/.gitkeep`, `workspace/temp/.gitkeep`
- `.gitignore` (workspace negation kuralları)
- `docs/testing/test-report-phase-1-renderer.md`
**Testler:** Kod testi yok — yalnızca yapısal doğrulama
**Commit:** `48a1d50` — `chore: add phase 1 renderer and workspace skeleton`
**Push:** ✓ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-01] Phase 1 — Frontend İskeleti

**Ne:** Uygulama shell'i (Admin/User geçişi), iki sayfa taslağı, 3 smoke test geçiyor, build temiz olan React + Vite + TypeScript iskeleti.
**Eklenen dosyalar:**
- `frontend/package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `index.html`
- `frontend/src/main.tsx`
- `frontend/src/app/App.tsx`
- `frontend/src/pages/AdminOverviewPage.tsx`, `UserDashboardPage.tsx`
- `frontend/src/tests/app.smoke.test.tsx`
- `docs/testing/test-report-phase-1-frontend.md`
**Testler:** `npm test` (vitest run) — 3 passed in 589ms
**Commit:** `340006e` — `chore: add phase 1 frontend skeleton with basic app shell`
**Push:** ✓ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-01] Phase 1 — Backend İskeleti

**Ne:** Health endpoint, config, logging, db placeholder, testler ve hafif tracking dokümantasyonunu içeren FastAPI backend iskeleti.
**Eklenen/değiştirilen dosyalar:**
- `backend/pyproject.toml`
- `backend/app/main.py`, `__init__.py`
- `backend/app/api/health.py`, `router.py`, `__init__.py`
- `backend/app/core/config.py`, `logging.py`, `__init__.py`
- `backend/app/db/session.py`, `__init__.py`
- `backend/tests/conftest.py`, `test_health.py`
- `data/.gitkeep`
- `docs/tracking/STATUS.md`, `CHANGELOG.md`
- `docs/testing/test-report-phase-1-backend.md`
**Testler:** `pytest backend/tests/test_health.py` — 2 passed in 0.01s
**Commit:** `d7edb9a` — `chore: add phase 1 backend skeleton and lightweight tracking docs`
**Push:** ✓ Remote SSH'a geçildi. `git@github.com:huskobro/contenthub.git`

---

## [2026-04-01] Phase 0 — Repo Başlatma & Doküman İskeleti

**Ne:** Git repository başlatıldı, proje temel dokümanları eklendi.
**Dosyalar:** `.gitignore`, `README.md`, `CLAUDE.md`, `docs/architecture/README.md`, `docs/testing/README.md`, `docs/decisions/.gitkeep`, `docs/phases/.gitkeep`
**Testler:** Yok (kod yok)
**Commit:** `2e0c3ba` — `chore: initialize repository with docs skeleton and project baseline`
**Push:** Remote henüz tanımlanmamıştı
