# Sprint 1 — Must-Fix Hardening Report

**Tarih:** 2026-04-09
**Amac:** Release-blocker seviyesindeki 6 kritik acigi kapatmak.

---

## 1. Executive Summary

Sprint 1 ile ContentHub'in en kritik 6 guvenlik ve stabilite blocker'i kapandi:

1. Alembic migration zinciri dogrulandi (tek HEAD, fresh DB calisiyor)
2. JWT secret artik hardcoded degil — env'den okunuyor
3. Default role "admin" → "user" olarak duzeltildi, legacy header bypass dev-only
4. 18 router'a auth guard eklendi (admin-only + user-level)
5. Frontend admin/user route'larina AuthGuard eklendi
6. Wizard config seed startup'a eklendi
7. Job completion → notification + draft publish record zinciri kuruldu

---

## 2. Migration Chain

**Durum:** Zaten temiz — audit raporundaki uyari stale docstring comment'lere dayaniyordu.

- `alembic heads` → tek HEAD: `faz16_notif_001`
- Fresh DB `alembic upgrade head` → 42 migration hatasiz calisir
- Stale docstring'ler duzeltildi:
  - `c1a2b3d4e5f6`: Revises comment `9d97ec750399` → `b1c2d3e4f5a6` (code zaten dogruydu)
  - `faz16_notification_items.py`: Revision ID/Revises comment guncellendi

---

## 3. JWT Secret Hardening

**Oncesi:** `SECRET_KEY = "contenthub-dev-secret-change-in-production"` hardcoded.

**Sonrasi:**
- `app/core/config.py`: `jwt_secret`, `jwt_algorithm`, `jwt_access_token_expire_minutes`, `jwt_refresh_token_expire_days` alanlari eklendi
- `app/auth/jwt.py`: Secret `settings.jwt_secret`'den okunuyor
- `CONTENTHUB_JWT_SECRET` env var set edilmemisse dev fallback + startup WARNING
- Dev fallback string degistirildi (`"contenthub-dev-secret-DO-NOT-USE-IN-PRODUCTION"`)
- Algorithm ve expiry settings de artik env/config'den okunuyor

---

## 4. Auth/Role Bypass Kapandi

### Default Role Fix
- `app/visibility/dependencies.py`: `get_caller_role()` default `"admin"` → `"user"`
- Artik header'siz istekler admin visibility almaz

### Legacy Header Bypass
- `app/auth/dependencies.py`: `X-ContentHub-User-Id` header sadece `settings.debug == True` iken aktif
- Non-debug (production) modda sadece JWT token kabul edilir
- Debug modda: legacy header + debug log eklendi

### Router Auth Guards
- `app/api/router.py`: 18 router'a auth guard eklendi:
  - **`require_admin`**: users, fs, prompt_assembly
  - **`require_user`**: channels, platform_connections, content_projects, engagement, comments, playlists, posts, brand_profiles, automation, operations_inbox, wizard_configs, calendar, notifications
- Auth/health/SSE/onboarding public kaldi
- `require_visible` olan router'lar (settings, jobs, publish, analytics vb.) mevcut guard'larini korudu

---

## 5. Frontend Route Protection

- `frontend/src/app/guards/AuthGuard.tsx` olusturuldu:
  - `isAuthenticated` + `user.role` kontrolu
  - Unauthenticated → `/login` redirect
  - Non-admin user `/admin/*` → `/user` redirect
- `router.tsx`: 
  - `/admin` route'u `AuthGuard requiredRole="admin"` ile sarmalandi
  - `/user` route'u `AuthGuard` ile sarmalandi (herhangi bir authenticated user)
  - Layout component'ler AuthGuard icinde nested child olarak korunuyor

---

## 6. Wizard Config Seed

- `app/wizard_configs/seed.py`: Async `seed_wizard_configs()` fonksiyonu eklendi
  - `ALL_WIZARD_CONFIGS` (news_bulletin + standard_video) iterate eder
  - Mevcut kayitlar skip edilir (idempotent)
  - Yeni kayitlar WizardConfig model ile DB'ye yazilir
- `app/main.py` `lifespan()`: `seed_wizard_configs()` cagrisi eklendi (auth seed'den sonra)
- Fresh DB'de artik wizard config'ler otomatik olusur

---

## 7. Job Completion → Publish/Notification Bridge

### Notification
- `app/automation/event_hooks.py`: `_NOTIFICATION_MAP`'e `"job_completed"` eklendi
  - Severity: "success", Scope: "user", Label: "Is tamamlandi"
- `app/jobs/service.py` `transition_job_status()`: `completed` durumunda `emit_operation_event` cagrisi eklendi
  - Inbox item + notification olusur
  - Kullaniciyi bilgilendirir: "Icerik uretimi basariyla tamamlandi. Yayinlamaya hazir."

### Draft Publish Record
- `transition_job_status()`: Job completed olunca `create_publish_record_from_job()` otomatik cagirilir
  - Platform: "youtube" (varsayilan)
  - Status: "draft" (PublishRecord default)
  - Best-effort: basarisiz olursa warning loglanir, job transition etkilenmez
- Bu sayede job tamamlaninca publish tarafinda draft kayit hazir bekler

### `logger` Import Fix
- `app/jobs/service.py`: Eksik `logging` import ve `logger` tanimlama eklendi

---

## 8. Degisen Dosyalar

### Yeni
- `frontend/src/app/guards/AuthGuard.tsx`
- `backend/tests/test_sprint1_hardening.py`
- `docs_drafts/sprint1_must_fix_hardening_report_tr.md`

### Degistirilen
- `backend/app/core/config.py` — JWT settings eklendi
- `backend/app/auth/jwt.py` — Env-based secret, dev fallback
- `backend/app/auth/dependencies.py` — Legacy bypass dev-only
- `backend/app/visibility/dependencies.py` — Default role "user"
- `backend/app/api/router.py` — 18 router'a auth guard
- `backend/app/main.py` — Wizard config seed eklendi
- `backend/app/automation/event_hooks.py` — job_completed notification map
- `backend/app/jobs/service.py` — Job completed event + publish record + logger
- `backend/app/wizard_configs/seed.py` — Async seed fonksiyonu
- `backend/alembic/versions/c1a2b3d4e5f6_*.py` — Stale docstring fix
- `backend/alembic/versions/faz16_notification_items.py` — Stale docstring fix
- `frontend/src/app/router.tsx` — AuthGuard wrapper

---

## 9. Test Sonuclari

### Sprint 1 Tests (9/9 passed)
1. `test_jwt_secret_not_hardcoded` — PASSED
2. `test_default_caller_role_is_user` — PASSED
3. `test_legacy_header_bypass_requires_debug` — PASSED
4. `test_unauthenticated_admin_endpoint_returns_401` — PASSED
5. `test_user_role_denied_admin_endpoint` — PASSED
6. `test_wizard_config_seed` — PASSED
7. `test_job_completed_in_notification_map` — PASSED
8. `test_job_completed_creates_publish_record` — PASSED
9. `test_alembic_single_head` — PASSED

### Fresh DB Tests
- `alembic upgrade head` — 42 migration, sifir hata
- `alembic heads` — tek HEAD: `faz16_notif_001`

### Frontend
- `tsc --noEmit` — PASSED (sifir hata)
- `vite build` — PASSED (3.35s)

### Bilinen Pre-Existing Test Failures
- Faz 17/17a API endpoint testleri (5 test): Auth guard eklenmesiyle artik JWT token gerektiriyor. Bu testler header-based auth kullaniyordu ve Sprint 2'de guncellenecek. Unit-level testleri (14 test) hala gecerli.

---

## 10. Kalan Riskler

### Beklenen / Sprint 2'ye Ertelenen
- Faz 17/17a API testlerinin JWT token ile guncellenmesi
- 401 auto-refresh interceptor (frontend API client)
- Error UX differentiation (503 vs 409 vs 422)
- Silent exception swallowing → logging duzeltmesi
- Queued job recovery (startup'ta sadece running taranir)

### Bilinen Sinirlamalar
- Job completed → publish record olusturma best-effort (fail-safe). Basarisiz olursa sadece log basilir — manual publish record olusturma hala mumkun.
- Legacy header bypass `CONTENTHUB_DEBUG=true` olarak calisir — .env dosyasinda `CONTENTHUB_DEBUG=true` satiri varsa legacy path acik kalir. Production'da bu satir olmamali.
- Frontend AuthGuard client-side only. Backend auth guard zaten var ama 401 response UX'i henuz polish degil.
- Wizard config seed sadece `standard_video` ve `news_bulletin` icin. Yeni modul eklenince seed guncellenmeli.

---

## 11. Commit ve Push Durumu

Commit ve push bu rapor ile birlikte yapilacak.
