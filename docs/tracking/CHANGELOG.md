# DEĞİŞİKLİK GEÇMİŞİ

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
