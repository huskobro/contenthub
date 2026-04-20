# DURUM

## Mevcut Faz
**REV-2 IMPL DALGASI MAIN'E MERGE EDİLDİ (2026-04-18) — 19 madde, Product Redesign Benchmark dalga 2**
**PHASE FINAL F4 KAPANDI (2026-04-17) — Deferred Items Closure + Final Merge Gate**
**PHASE FINAL F3 KAPANDI (2026-04-17) — Final Release Readiness Gate**
**PHASE FINAL F2 KAPANDI (2026-04-17) — Ownership/Visibility Hardening + Effective Settings Sync**
**PHASE AN KAPANDI (2026-04-17) — Automation Policies + Inbox Ownership Guard**
**PHASE AM KAPANDI (2026-04-17) — Security + Settings Hardening Closure**
**PHASE AL KAPANDI (2026-04-17) — Product Simplification + Effective Settings Audit (read-only)**
**PHASE AK KAPANDI (2026-04-17) — Effective Settings + Gemini Plan Audit (read-only)**
**PHASE AB KAPANDI (2026-04-16) — News Bulletin Real Preview Pack**
**PHASE AA KAPANDI (2026-04-16) — Preview Artifact Pipeline / Visual Review Pack**
**PHASE Z KAPANDI (2026-04-16) — Operational Hardening / Release Candidate Pack**
**PHASE Y KAPANDI (2026-04-16) — Baseline Drift / Release Readiness Stabilization Pack**
**PHASE X KAPANDI (2026-04-16) — Ownership / Channel Auto-Import / Project-Job Hierarchy Pack**
**TÜM MİLESTONE'LAR KAPANDI — Master plan (M1–M8) tamamlandı**

### REV-2 IMPL Dalgası (Product Redesign Benchmark) — Main Merge

- **Tarih:** 2026-04-18
- **Commit'ler:** `d60b2a1` (audit + merge-ready report) ← `b7f1bc0` (M7 fresh-DB fix)
- **Dalga boyutu:** 19 P-item (P0.1 → P3.3 + REG)
- **Kaynak branch:** `worktree-product-redesign-benchmark` → `main` (merge --no-ff)
- **Merge öncesi Level B audit:** `docs/redesign/AUDIT_MERGE_READY.md`

**Kapatılan P-item'lar:**

| # | Başlık | Kategori |
|---|---|---|
| P0.1 | Product Review module (tam pipeline) | Module |
| P0.2 | DubVoice TTS provider | TTS |
| P0.3 | Channel reimport endpoint (`POST /channel-profiles/{id}/reimport`) | Channels |
| P0.4 | YouTubeAnalytics gerçek bağlantı (`youtubeanalytics.googleapis.com`) | Analytics |
| P0.5 | Full-auto daily digest endpoint + widget | Automation |
| P0.6 | Cross-device theme persistence (backend bind) | Frontend |
| P1.1 | AdminWizardShell / UserWizardShell migrasyonu (3 wizard) | Frontend |
| P1.2 | Auth seed / require_admin / require_user guard tüm router'lar | Auth |
| P1.3 | JWT access + refresh token, token refresh otomatik | Auth |
| P2.1 | Ownership hardening F2.1–F2.3 (comments, posts, platform_connections...) | Ownership |
| P2.2 | Effective Settings groupOrder sync (16 grup) | Settings |
| P2.3 | Açık-kalem takip dosyası kapatıldı (tüm iş tamamlandı, dosya kaldırıldı) | Docs |
| P2.4 | Docs reorganizasyonu (archive, 280 test raporu taşındı, 5 kopya silindi) | Docs |
| P3.1 | README.md tam güncellemesi (REV-2 + test sayıları + tüm özellikler) | Docs |
| P3.2 | release-notes-v1.md + rollout-checklist.md güncellemesi | Docs |
| P3.3 | USER_GUIDE.md oluşturulması (tüm menüler + full-auto adım adım) | Docs |
| REG.1 | M7 fresh-DB test fix (`ALEMBIC_TARGET = "phase_al_001"`) | Tests |
| REG.2 | Downgrade chain testi 3-adım genişletildi | Tests |
| REG.3 | Drift repair script (`backend/scripts/drift_repair.py`) | Backend |

**Test durumu (merge öncesi):**
- Backend pytest: **2547/2547 PASS**
- Frontend vitest: **2670/2670 PASS**
- TypeScript `tsc --noEmit`: exit 0
- Vite build: exit 0
- Alembic fresh-DB: 10/10 PASS

---

### PHASE FINAL F4 (Deferred Items Closure + Final Merge Gate) Özet
- Amaç: F3 kapanış raporunda bilinerek açık bırakılmış tüm maddeleri tek final
  dalgada kapatmak ve üretim adayını **merge-ready** duruma getirmek.
- Tamamlanan kapanışlar (her biri commit + push):
  - **Daily Automation Digest (backend + frontend):** yeni endpoint
    `GET /api/v1/full-auto/digest/today` (owner-scope, admin-all, runs_today
    agregasyonu, at_limit, next_upcoming). Dashboard'a `AutomationDigestWidget`
    (React Query 60 s refetch, 4 metrik kartı + top-3 upcoming liste).
  - **Project status badges:** `ProjectAutomationPanel` başlığında 3 rozet
    (`-badge-active / -badge-scheduled / -badge-at-limit`). Logic değişikliği yok.
  - **Cross-device theme persistence:** `themeStore.hydrateFromBackend({force: true})`
    seçeneği + `authStore.applyTokenResponse` içinde late-bind tema tetikleyici
    (login / register / refresh sonrasında backend değeri localStorage'ı override
    eder). Unit: `frontend/src/tests/stores/themeStore.hydrate-force.unit.test.ts` 4/4 yeşil.
  - **Scaffold relocation:** `pages/UserPublishEntryPage.tsx` →
    `pages/_scaffolds/UserPublishEntryPage.tsx`. 13 test import'u güncellendi.
    Klasör prefix + kod-içi "non-negotiable 4 kural" yorumu ile accidental-mount
    bariyeri kuruldu.
  - **posts/service.py TODO kapanışı:** `submit_post()` içindeki
    "Gerçek platform API çağrısı burada olacak" TODO'su kaldırıldı; yerine
    "senkron HTTP yok, adapter registry'de yapılır" kontrat yorumu + her iki
    kolda `logger.info` trace event. Kontrat testi
    `test_phase_final_f4_posts_todo_closure.py` 3/3 yeşil.
  - **Dev DB drift repair:** `backend/scripts/drift_repair.py` (idempotent,
    default dry-run). 6 kategori: test.* settings (60), NULL owner jobs (8),
    job_steps orphan (56), prompt_assembly_runs orphan (8),
    block_traces cascade (72), news_bulletin job_id → NULL (8).
    Dev DB'de 212 kirli kayıt temizlendi. Fresh DB'de script 0 sonuç döner.
    Schema değişikliği yok, kullanıcı içeriği (news_bulletins) silinmedi.
- Final regression gate (worktree, main'e dokunulmadı):
  - Backend pytest: **2541 / 2541 yeşil** (128 s, 1 uyarı — kritik değil).
  - Frontend tsc `--noEmit`: **0 hata**.
  - Frontend vitest: **2537 / 2537 yeşil** (35 skipped kasıtlı, 21.9 s).
  - Frontend vite build: **başarılı** (3.51 s, index 1.57 MB / gzip 404 kB).
  - Backend startup smoke: **334 route yüklü**, kritik uçlar mevcut
    (`digest/today`, `auth/login`, `settings`, `jobs`).
- Bilinçli açık bırakılan (F4'te de kapatılmadı — üretim MVP'si kapsamı dışı):
  - Vite bundle tek-parça (404 kB gzip); code-split optimize edilmedi.
  - `PLATFORM_POST_CAPABILITY` tüm platformlarda hâlâ False — gerçek
    community post API gelince adapter registry fazı.
- Kontrol satırları (F4 kapanışı):
  - code change: yes (backend `posts/service.py` + yeni script + frontend widget/store + tests)
  - migrations run: no
  - packages installed: no
  - db schema mutation: no
  - db data mutation: yes (sadece dev DB — 212 orphan/test-pollution temizlik, bir kereye mahsus)
  - main branch touched: no
- Commit zinciri (F4): `5950729 drift-repair` ← `ee6e392 posts-todo` ←
  `143866a scaffold-relocation` ← öncesi F2/F3/digest/theme dalgaları.

### PHASE FINAL F3 (Final Release Readiness Gate) Özet
- Amaç: AM + AN + F2 dalgalarından sonra üretim adayını **tek geçiş** final
  kalite kapısından geçirmek. Kod değişikliği yok — yalnızca doğrulama +
  tracking docs senkronizasyonu + kapanış raporu.
- Doğrulanan kanıtlar (hepsi worktree'de koşuldu, main'e dokunulmadı):
  - Backend pytest: **2533 passed, 0 failed, 1 warning (129 s)**.
  - Frontend vitest: **2530 passed, 35 skipped, 213 files (166 s)**.
  - TypeScript `tsc --noEmit`: **exit 0, hata yok**.
  - Vite production build: **exit 0, 3.64 s**. "index" chunk 1.56 MB
    (gzip 403 KB) — mevcut uyarı, regresyon değil.
  - Fresh-DB startup zinciri (temiz /tmp + bos DB): seed=204, visibility=0,
    orphan drift {marked_orphan: 0, reactivated: 0}, total=204, active=204,
    **distinct_groups=16** — KNOWN_SETTINGS ile bire bir uyum.
- Gemini plan reality-check (8 madde, dosya:satır kanıtlı):
  - (1) Theme persistence: `frontend/src/stores/themeStore.ts:48-134` —
    localStorage + best-effort backend save — **zaten var, doğru çalışıyor**.
  - (2) Layout consolidation: `frontend/src/app/layouts/useLayoutNavigation.ts`
    ADMIN_NAV/USER_NAV single-source — **zaten var, doğru çalışıyor**.
  - (3) Publish review gate hard-enforce: `backend/app/publish/service.py:506`
    `can_publish()` terminal guard — **zaten var, doğru çalışıyor**.
  - (4) Full-auto publish_now bypass: `backend/app/full_auto/service.py:12-13`
    "v1 ALWAYS draft; no auto-publish" — **zaten var, doğru çalışıyor**.
  - (5) Daily automation digest: `full_auto/service.py:199,233-236` +
    `schemas.py:41-42` — runs_today sayaçları var — **kısmen var**; dashboard
    widget'ı yok (scope dışı, Phase AM/AN'de kapsam dışı bırakıldı).
  - (6) UserCalendarPage: `frontend/src/pages/user/UserCalendarPage.tsx` —
    **zaten var, doğru çalışıyor** (Faz 14 + 14a, LegacyUserCalendarPage delege).
  - (7) Sidebar truth map: `useLayoutNavigation.ts` ADMIN_NAV + USER_NAV tek
    tanım — **zaten var, doğru çalışıyor**.
  - (8) UserPublishEntryPage mount-leak: Faz AD + F2.5'te router'dan
    çıkarıldı; dosya test-only scaffold, deprecation notu güçlendirildi —
    **zaten var, doğru çalışıyor**.
- Kalan gap'ler (bilinerek bu faza dahil edilmedi — honest state):
  - Daily automation digest widget'ı yok (data var, UI yüzeyi yok).
  - Dev DB'de 20 grup / 252 active / 14 deleted / 2 inactive satır vardı —
    bunlar Nisan 7 testlerinden kalan artifact; fresh-DB'de 16/204/0
    garanti edilir, production'a sızmaz.
- Docs: `docs/final_release_readiness_report.md` — F3 kapanış raporu
  (7 bölüm TR + kod/test/migration/push/main kontrol satırları).
- Commit zinciri (15 + F3 doc): F3 docs worktree üstünde commit'lenir,
  main'e push ATILMAZ.

### PHASE FINAL F2 (Ownership/Visibility Hardening + Effective Settings Sync) Özet
- Amaç: AM + AN dalgalarından sonra kalan ownership/admin-only yüzeylerini
  kapatmak + effective settings panelindeki 4 grup "Unlisted" düşüşünü
  temizlemek + hayalet test-sayfasında kalıcı deprecation.
- F2.1 — P0 ownership wave (`comments`, `engagement`, `platform_connections`,
  `posts`, `playlists`, `notifications`, `settings`) — UserContext + spoof
  defense. Test: `test_phase_final_f2_ownership.py` (~20 test).
- F2.2 — P1 ownership wave (`brand_profiles`, `calendar`, `content_library`,
  `full_auto`, `discovery`, `assets`) — channel-derived ownership +
  discovery admin-only kategori sızıntısı düzeltildi. Test:
  `test_phase_final_f2_2_ownership.py` (10 test).
- F2.3 — P2 admin-only (`sources`, `news_items`, `used_news`, `onboarding`)
  — router-level `Depends(require_admin)`. Test: `test_phase_final_f2_3_admin_only.py`
  (8 test). `test_used_news_api.py`: user_headers → admin_headers.
  `test_faz14_calendar.py` + `test_faz15_event_hooks.py`: sürükleyici
  session-state temizliği.
- F2.4 — Effective Settings groupOrder senkron: frontend `EffectiveSettingsPanel`
  groupOrder 12 → 16 gruba genişletildi; `SettingGroupSection` GROUP_LABELS_MAP
  4 yeni Türkçe etiket; Fresh-DB verifikasyonu 204/16/0.
- F2.5 — `UserPublishEntryPage` deprecation — silinmedi (12 smoke test
  bağımlılığı), header'a kalıcı "router'a mount ETMEYİN" kuralı.
- Kapanış raporu: `docs/final_merge_readiness_report.md`.

### PHASE AN (Automation Policies + Inbox Ownership Guard) Özet
- Amaç: automation policies/inbox router/service'lerinde owner-spoof +
  cross-user okuma yüzeylerini kapatmak.
- Router + service seviyesinde `UserContext` + `apply_user_scope` + PATCH/evaluate/
  trigger guard'ları.
- Test: `test_phase_an_automation_policies_guard.py` (~495 satır).
- Kapanış: `docs/phase_an_automation_policies_guard_closure.md`.

### PHASE AM (Security + Settings Hardening Closure) Özet
- AM-2: platform_connections legacy ownership leak kapatıldı.
- AM-3: users + audit admin-only guard.
- AM-4: settings orphan registry drift repair.
- AM-5: frontend scoped query cache hijyeni (user/admin publish + projects).
- Kapanış: `docs/phase_am_security_and_settings_closure.md` +
  `docs/phase_am_security_and_settings_closure.md` re-verify block.

### PHASE AL (Product Simplification Audit — read-only) Özet
- 485 satırlık audit raporu: `docs/phase_al_product_simplification_and_effective_settings_audit.md`.
- 10 bölüm + 4 tablo + K1–K10 kurallarına uygun.
- `code change: none` + `git diff --stat backend/ frontend/ renderer/` kanıtlı.

### PHASE AK (Effective Settings + Gemini Plan Audit — read-only) Özet
- 259 satırlık audit: `docs/phase_ak_effective_settings_and_gemini_plan_audit.md`.
- 7-sayı effective settings root cause + 8-madde Gemini reality check.
- `code change: none`.

### PHASE AB (News Bulletin Real Preview Pack) Özet
- Amaç: PHASE AA'daki `news_bulletin` honest gap'ini **fake preview üretmeden**
  kapatmak. "Sahte placeholder üretme, gerçekten üretilebilen preview'ları üret"
  kuralı merkezde.
- Yeni backend altyapısı KURULMADI — yalnızca news_bulletin executor'larına
  yan etki olarak preview yazımı eklendi.
- `BulletinScriptExecutor` artık iki gerçek preview yazar:
  - `preview_news_selected.json` — seçilmiş haber öğeleri snapshot'ı (LLM
    öncesi, karar izlenebilirliği için).
  - `preview_script.json` — `bulletin_script.json` (FINAL) başarıyla
    yazıldıktan sonra headlines + narration önizleme.
- `BulletinMetadataExecutor` artık bir gerçek preview yazar:
  - `preview_metadata.json` — `metadata.json` (FINAL) başarıyla yazıldıktan
    sonra title/description/tags/category önizlemesi.
- Yeni yardımcı: `_write_preview_artifact(workspace_root, job_id, filename, data)`
  — `preview_` prefix guard + otomatik `generated_at` + best-effort
  (istisnayı bastırır, step'i durdurmaz, fake placeholder oluşturmaz).
- Classifier / service / router / frontend DOKUNULMADI. AA'da kurulan
  altyapı filename tabanlı yeni preview'ları otomatik yakalar; `JobPreviewList`
  news_bulletin JSON preview'larını MediaPreview delegasyonu ile gösterir.
- Honest state: selected_items boş → hata + hiç preview. LLM fail → FINAL yok
  → preview de yok. Yazım fail → log warn + None, fake placeholder yok.
- Alınmayan: `preview_bulletin_frame.jpg` — gerçek render gerektirir,
  placeholder üretmemek için gelecek faza bırakıldı.
- Yeni test dosyası: `test_phase_ab_news_bulletin_preview.py` — **15 test**
  (4 classifier, 4 helper, 4 script executor, 2 metadata executor, 1 router
  smoke).
- Tam suite: **2358 passed, 0 failed** (PHASE AA baseline 2343 → +15).
- Docs: `docs/preview-artifact-contract.md` §6.3 (news_bulletin) — "honest
  gap" durumundan "PHASE AB — honest gap kapandı" durumuna güncellendi.
- Kapanış raporu: `docs/phase-ab-closure.md`.

### PHASE AA (Preview Artifact Pipeline / Visual Review Pack) Özet
- Amaç: preview-first yaklaşımını gerçek, tutarlı, yönetilebilir bir yüzeye çıkarmak.
  Hiç yeni büyük altyapı KURULMADI; mevcut `ArtifactScope.{PREVIEW,FINAL}` +
  `workspace/{job_id}/artifacts/` kontratı üzerine deterministik filename
  classifier + ince bir servis/router katmanı eklendi.
- Yeni backend modülü: `app/previews/` (classifier, service, router).
  - `classify_filename(name) → ClassifiedArtifact(scope, kind, source_step, label)`.
  - Hidden filter: `tmp_*`, `.dotfile`, `_partial`, `*.tmp`, `*.part`, `*.swp`.
  - `preview_frame.jpg` → PREVIEW/THUMBNAIL, `preview_mini.mp4` → PREVIEW/VIDEO_RENDER,
    `preview_*.json` → PREVIEW/METADATA; `final.mp4`, `thumbnail.jpg`, `script.json`,
    `composition_props.json`, `publish_*.json` → FINAL (kind'lar ayrı).
- Yeni endpoint'ler (jobs/router._enforce_job_ownership ile bire bir ayni ownership):
  - `GET /api/v1/jobs/{id}/previews` — siniflandirilmis liste + preview/final sayaclari.
  - `GET /api/v1/jobs/{id}/previews?scope=preview|final` — tek scope filter.
  - `GET /api/v1/jobs/{id}/previews/latest` — en son PREVIEW (mtime), yoksa 404.
- Parallel bir serve yolu KURMADIK; preview dosyaları mevcut
  `/api/v1/jobs/{id}/artifacts/{path}` endpoint'inden servis edilir (aynı
  ownership + path-traversal guard).
- Frontend surface:
  - `frontend/src/api/previewsApi.ts` — typed fetch client.
  - `frontend/src/hooks/useJobPreviews.ts` — React Query hook.
  - `frontend/src/components/preview/JobPreviewCard.tsx` — scope badge (ONİZLEME /
    NIHAİ), tip-spesifik preview (video/image/audio/json/text), size/mtime/label/
    source_step metadata'sı.
  - `frontend/src/components/preview/JobPreviewList.tsx` — grouped liste
    ("Onizlemeler" vs "Nihai Ciktilar" başlıkları, toplam sayaç).
  - `admin/JobDetailPage` ve `user/ProjectDetailPage` bu listeyi gösterir.
- Modül durumu (honest):
  - `standard_video` — `render_still` adımı `preview_frame.jpg` üretiyor; classifier
    doğru yakaladı.
  - `product_review` — `preview_mini` adımı `preview_mini.mp4` + `preview_mini.json`
    üretiyor; classifier doğru yakaladı.
  - `news_bulletin` — preview aşaması YOK. Fake preview injecting ETMEDİK;
    script/metadata FINAL olarak kalıyor. `docs/preview-artifact-contract.md` bu
    boşluğu dürüstçe belgeliyor.
- Testler (backend): `test_phase_aa_preview_classifier.py` (28 test),
  `test_phase_aa_preview_service.py` (17 test), `test_phase_aa_preview_router.py`
  (14 test). Toplam **69 yeni test**.
- Tam suite: **2343 passed, 0 failed** (+69 PHASE AA testi, PHASE Z'deki 2274'e
  eklendi).
- Kapanış raporu: `docs/phase-aa-closure.md`.
- Kontrat belgesi: `docs/preview-artifact-contract.md` (yeni — classifier
  kurallari, scope/kind matrisi, modül bazlı durum).

### PHASE Z (Operational Hardening / Release Candidate) Özet
- Ownership/auth/security PHASE X seviyesinde **aynen korundu**; hiç skip/xfail yok.
- Channel import DoS/consent-wall/edge-case hardening:
  - `_fetch_html` streaming body 512 KB hard cap + `max_redirects=5`.
  - `_MEANINGLESS_TITLES` filter ("YouTube" / "Google" / "Error" / "404") — consent
    wall sayfaları artık dürüstçe `partial=True` kabul ediliyor.
- Workspace artifact serving 7 hardening testi ile kilitlendi (ownership + orphan +
  cross-user + path-traversal + missing + global fallback).
- Backup/restore operator rehberi yeniden yazıldı (hot backup via sqlite `.backup`,
  WAL/SHM, migration pre-flight, restore post-behavior).
- Release Candidate smoke hattı: 8 uçtan uca test (onboarding → channel → project
  → job → ownership isolation → admin global → analytics → publish gate → startup
  recovery).
- Starlette `HTTP_422_UNPROCESSABLE_ENTITY` → `_CONTENT` rename (6 yer) — forward-compat.
- Test warning'leri: 17 fixable temizlendi; 1 non-blocker (dispatcher integration
  background coroutine).
- Full suite: **2274 passed, 0 failed** (+40 hardening/smoke testi).
- Kapanış raporu: `docs/phase-z-closure.md`.

### PHASE Y (Baseline Stabilization) Özet
- PHASE X sonrası raporlanan 23 pre-existing baseline drift'i temizlendi.
- Hiçbir production/ownership/auth davranışı zayıflatılmadı; düzeltmeler sadece
  test baseline ve test izolasyon seviyesinde kaldı.
- Kategori dağılımı:
  - Pipeline step count 7→8 drift (8 test) — render + publish ayrı adım.
  - Root.tsx cast count (1 test) — 7 composition × ~2-3 cast.
  - OAuth/YouTube router 422/400 (6 test) — PHASE X `channel_profile_id` zorunlu.
  - Migration downgrade-1 semantiği (1 test) — `phase_x_001 → product_review_001`.
  - Full-auto violations mesaj drift (3 test) — gerçek mesajlarla eşitlendi.
  - Analytics audit log (1 test) — admin JWT header'a geçirildi.
  - Artifact list user-scoped workspace (1 test) — DB'den workspace_path okuyor.
  - `test_ae` session leakage (1 test) — test-local in-memory DB override.
- Tam suite: **2234 passed, 0 failed** (PHASE Y kapanışı).
- Kapanış raporu: `docs/phase-y-closure.md`.

### PHASE X (Ownership) Özet
- Server-side ownership: her kullanıcı kendi kanal/proje/iş/yayın/analitik verisini görür; admin global.
- URL-only kanal create + honest partial metadata state (uydurma placeholder YOK).
- Job ↔ ContentProject hiyerarşisi kod katmanında enforce.
- Migration: `phase_x_001` (additive + Job owner backfill).
- Test: PHASE X hedef seti **112/112 passed**.
- L (git disiplini) tamamlandı — 4 commit (8852133 migration, 5cb1bb8 backend,
  c5b89d2 frontend, 682663a docs); `main` remote ile sync.
- Kapanış raporu: `docs/phase-x-closure.md`
- Subsystem dokümanları: `docs/ownership.md`, `docs/channel-auto-import.md`, `docs/project-job-hierarchy.md`

### Pre-existing Test Envanteri
- PHASE Y sonrası: **0 failing**. Tüm 23 drift Y-B / Y-C fazında çözüldü.
  Detay: `docs/phase-y-closure.md`.

---

**M8 KAPANDI — C1–C2 tamamlandı. Analytics + Operations Pack complete.**
**M7 KAPANDI — C1–C4 tamamlandı, backend-complete**

**M8-C2 TAMAMLANDI — 32/32 yeni frontend smoke testi + 2132/2132 full suite (Frontend Analytics Surface + Window Selector + Step Stats Table)**
**M8-C1 TAMAMLANDI — 24/24 test geçiyor (Analytics Backend + Platform Overview + hardening pass)**

**M7-C4 TAMAMLANDI — 24/24 test geçiyor (Publish Hub Routes + Retry + Review Reset)**
**M7-C3 TAMAMLANDI — 23/23 test geçiyor (PublishStepExecutor + Dispatcher + Standard Video pipeline + hardening pass)**
**M7-C2 TAMAMLANDI — 32/32 test geçiyor (YouTube Adapter + TokenStore + Registry + OAuth Router)**
**M7-C1 TAMAMLANDI — 36/36 test geçiyor (27 servis + 9 migration)**
**M6 KAPANDI**

## M8 Kapanış Özeti (2026-04-04)

**M8 hedefi**: Dört analytics görünümüyle gerçek üretim verisi. Operasyonel karar desteği.

**M8-C1 kazanımları (Analytics Backend + Platform Overview):**
- Salt okunur aggregation servisi — jobs + job_steps + publish_records tabloları
- `GET /api/v1/analytics/overview` + `GET /api/v1/analytics/operations` endpoint'leri
- Zaman penceresi filtresi: last_7d / last_30d / last_90d / all_time
- Metrikler: total_job_count, completed_job_count, failed_job_count, job_success_rate, total_publish_count, published_count, failed_publish_count, publish_success_rate, avg_production_duration_seconds, retry_rate
- Operasyon metrikleri: avg_render_duration_seconds (canonical: step_key='composition'), step bazlı count/avg_elapsed/failed_count
- provider_error_rate: M8 kapsamı dışı — None (provider_trace_json yapısı sabitlenmedi)
- Şema değişikliği yok, migration yok, yazma yok
- 24/24 test (backend) + tam suite 979/979 backend

**M8-C2 kazanımları (Frontend Analytics Surface + Window Selector + Step Stats Table):**
- analyticsApi.ts — typed fetch fonksiyonları ve arayüzler
- useAnalyticsOverview + useAnalyticsOperations — React Query hooks
- AnalyticsOverviewPage: real API bağlantısı, 4-butonlu window selector, Temel Metrikler + İş/Yayın Detayı kartları, loading/error/null durumları
- AnalyticsOperationsPage: real API bağlantısı, window selector, avg_render kartı, step_stats tablosu (count DESC, failed>0 kırmızı, boş durum)
- 32/32 yeni frontend smoke testi; 2132/2132 full frontend suite; TypeScript 0 hata
- Backend: 979/979 (1 warning: coroutine mock, test altyapısı — non-blocking)

**Kabul edilen sınırlamalar (M8 kapsamı dışı bırakıldı, dürüstçe kayıt):**
- provider_error_rate: provider_trace_json yapısı sabitlenmediği için M8'de None; ileri fazda eklenebilir
- Platform Detail view (job/step breakdown, error clustering): master plan M8-C2 kapsamında tanımlı ama implementation teslim edilmedi — Content Analytics ile birlikte ileri faza bırakıldı
- Content Analytics (template impact, source contribution, module comparison): placeholder sayfası var, gerçek veri bağlantısı yok
- Channel Overview kartları (total_content, active_modules, template_impact): placeholder; kaynak DB sorgusu tanımlanmadı
- Filter area date picker + module select: disabled; window selector bu rolü üstlendi

**Test durumu (final):**
- Frontend: 2132/2132 passed, 0 failed (156 test file)
- Backend: 979/979 passed, 1 warning (coroutine mock — non-blocking)

---

## Mevcut Durum (2026-04-04)
M8-C2 tamamlandı:
- `frontend/src/api/analyticsApi.ts` — fetchOverviewMetrics + fetchOperationsMetrics, AnalyticsWindow tipi, OverviewMetrics + OperationsMetrics + StepStat arayüzleri
- `frontend/src/hooks/useAnalyticsOverview.ts` — React Query hook; queryKey: ["analytics","overview",window]
- `frontend/src/hooks/useAnalyticsOperations.ts` — React Query hook; queryKey: ["analytics","operations",window]
- `AnalyticsOverviewPage.tsx` — real API bağlantısı; 4-butonlu window selector (last_7d/last_30d/last_90d/all_time); Temel Metrikler kartları (published_count, failed_publish_count, job_success_rate, avg_production_duration_seconds, retry_rate, provider_error_rate=—); İş ve Yayın Detayı kartları (total_job_count, completed, failed, total_publish, publish_success_rate); Channel Overview + Filter area (backward-compat testleri için); sub-nav navigation
- `AnalyticsOperationsPage.tsx` — real API bağlantısı; 4-butonlu window selector; Is Performansi section; avg_render_duration_seconds kartı; Provider Sagligi section; step_stats tablosu (step_key / count / avg_elapsed_seconds / failed_count, count DESC sıralı, kırmızı failed>0); boş durum; Kaynak Etkisi section (placeholder); provider_error_rate=— (M8-C2 unsupported)
- Loading state: "…" placeholder; error state: kırmızı mesaj; null değerler: "—"
- Format kuralları: rate → %X.X; seconds < 60 → Xs; seconds ≥ 60 → Xdk; count → string
- 32/32 yeni frontend smoke testi (analytics-overview-page: 18 test, analytics-operations-page: 14 test)
- Mevcut testlere 0 regression: 2132/2132 full suite, 0 hata
- TypeScript check: 0 hata

M8-C1 tamamlandı (hardening pass dahil):
- `backend/app/analytics/service.py` — salt okunur aggregation; jobs + job_steps + publish_records
- `backend/app/analytics/router.py` — GET /api/v1/analytics/overview + GET /api/v1/analytics/operations
- `backend/app/analytics/schemas.py` — OverviewMetrics + OperationsMetrics Pydantic şemaları
- Desteklenen metrikler: total_job_count, completed_job_count, failed_job_count, job_success_rate, total_publish_count, published_count, failed_publish_count, publish_success_rate, avg_production_duration_seconds, retry_rate
- Operasyon metrikleri: avg_render_duration_seconds (canonical: step_key='composition'), step_key bazlı count/avg_elapsed/failed_count
- Zaman filtresi: last_7d / last_30d / last_90d / all_time
- provider_error_rate: M8-C1'de UNSUPPORTED — Optional[float]=None; provider_trace_json yapısı sabitlenmedi
- Şema değişikliği yok, migration yok, yazma yok
- publish_service / job_service katmanlarına dokunulmadı
- 24/24 M8-C1 + 979/979 full suite, 0 regression, 3 kategori non-blocking warning (non-deterministic; bkz. Known Warnings)

**M8-C1 Hardening Pass:**
- Test izolasyon: created_at UPDATE override + last_7d penceresi ile shared DB'den exact delta alma
- Tüm 11 metrik exact numeric assertion'a geçirildi (==); julianday precision için yalnızca ±1.0s tolerans
- window=last_7d exact exclusion + window=all_time exact inclusion testleri
- avg_render_duration_seconds canonical kaynağı: step_key='composition' (RenderStepExecutor.step_key='render' pipeline'a bağlı değil, service.py yorumu güncellendi)
- provider_error_rate schema tipi düzeltildi: `Optional[float] = None`

M7-C4 tamamlandı:
- `retry_publish()` servis fonksiyonu: failed → publishing, RETRY log event, platform_video_id korunur
- `reset_review_for_artifact_change()` servis fonksiyonu: approved/scheduled → pending_review; reviewer_id + reviewed_at sıfırlanır; diğer durumlar sessizce atlanır
- `POST /publish/{id}/retry` endpoint: publish gate uygulanır, yalnızca failed → 422 diğer durumlar
- `POST /publish/{id}/reset-review` endpoint: artifact değişikliği bildirimi, 200 (noop-safe)
- State machine: approved + scheduled durumlarına `pending_review` çıkışı eklendi (artifact reset için)
- `RetryPublishRequest` + `ArtifactChangedRequest` şemaları eklendi
- `HTTP_422_UNPROCESSABLE_ENTITY` deprecation uyarısı giderildi
- publish log boundary: `append_platform_event()` tek yol korundu — yeni endpointler bu boundary'yi bozmadı
- publish step 7. adım olma durumu korundu — yeni testler 6-step varsayımı getirmedi
- 24/24 M7-C4 + 955/955 full suite, 0 regression, 3 kategori / 1–7 non-blocking test altyapısı uyarısı (sayı non-deterministic; bkz. Known Warnings)

M7-C3 tamamlandı (hardening pass dahil):
- `PublishStepExecutor` — upload + activate zincirini servis katmanına bağlar
- Her platform event (upload_completed, activate_completed, upload_failed, activate_failed) `PublishLog`'a executor üzerinden yazılır; adaptör log yazmaz
- OPERATOR_CONFIRM idempotency: kayıt zaten 'published' ise upload/activate çağrılmaz
- Partial failure: upload başarılı → `platform_video_id` ara kaydedilir; activate başarısız → upload tekrarlanmaz
- `platform_video_id` dolu kayıtta upload atlanır, yalnızca activate çalışır
- `StepExecutionError.retryable` eklendi — retryable=True/False semantiği pipeline'a taşındı
- `_build_executor_from_registry`: `PublishStepExecutor` için `pipeline_db` inject
- Standard Video pipeline: `publish` step (step_order=7, operator_confirm) eklendi
- publish-state ambiguity risk: YOK
- review-to-publish boundary risk: YOK — executor boundary korunuyor
- partial-failure recovery: TAMAMLANDI — ara kayıt + upload skip garantisi
- audit-trail completeness: TAMAMLANDI — her platform event denetim izine yazılıyor
- 23/23 test + 931/931 full suite, 0 regression

**M7-C3 Hardening Pass (3 düzeltme):**
1. `_log_platform_event()` artık doğrudan `PublishLog()` ORM nesnesi oluşturmuyor; `publish_service.append_platform_event()` çağrıyor — audit trail sınırı servis katmanında
2. `mark_published()` çağrısında `platform_url` artık sabit string değil; `adapter.activate()` sonucundaki `PublishAdapterResult.platform_url` kullanılıyor
3. `_resolve_video_path()` async yapıldı; step 4 gerçekten DB'den `JobStep(step_key="render").provider_trace_json["output_path"]` okuyor — docstring ile implementasyon eşleşti
- `publish_service.append_platform_event()` yeni public fonksiyon eklendi (`_append_log` wrapper)

M7-C2 tamamlandı:
- `YouTubeAdapter` — upload() + activate() zinciri, resumable upload, partial failure semantiği
- `YouTubeTokenStore` — OAuth2 credential saklama, auto-refresh, exchange_code_for_tokens
- `PublishAdapterRegistry` — platform name → adapter lookup, singleton
- `app/publish/youtube/router.py` — GET /auth-url, POST /auth-callback, GET /status, DELETE /revoke
- 6 platform-spesifik hata sınıfı, retryable bayrakları doğru
- 32/32 test (A–AF): registry, token store, adapter upload/activate, OAuth router
- publish-state ambiguity risk: YOK — upload/activate ayrı adım, platform_video_id upload sonrası kaydedilir
- review-to-publish boundary risk: YOK — M7-C1'den devreden; adaptör service katmanını çağırmaz
- partial-failure recovery: AÇIK — upload başarılıysa platform_video_id korunur, yalnızca activate retry edilir
- audit-trail completeness risk: DÜŞÜK — adaptör log yazmaz (servis katmanı yazar, M7-C3'te bağlanacak)

M7-C1 tamamlandı (review-gate fix + migration verified):
- M7-C1: Publish Center — State Machine + DB Models + Alembic Migration + Core Service + REST Router
  - `publish_records` + `publish_logs` tabloları (models.py + alembic migration c1a2b3d4e5f6)
  - Alembic migration fresh-DB doğrulaması: boş DB üzerinde `alembic upgrade head` çalıştırıldı
    (create_all veya stamp YOK); `downgrade -1` da test edildi; 9 migration testi geçiyor
  - `PublishStateMachine` — 9 durum, Tier A review gate zorunlu, bypass edilemez
    - draft → approved YASAK; draft → scheduled YASAK
    - Zorunlu akış: draft → pending_review → approved → [scheduled →] publishing → published
  - `review_action()` — yalnızca pending_review durumunda çağrılabilir; başka durumdan ReviewGateViolationError
  - `can_publish()` publish gate — approved/scheduled/failed dışından yasak
  - `schedule_publish()` — scheduled_at UTC normalize edilir (servis katmanında, test workaround yok)
  - `PublishAdapter` soyut taban — upload() + activate() zinciri (M7-C2 implement eder)
  - Servis: 10 fonksiyon, her aksiyon PublishLog'a yazar — sessiz güncelleme yasak
  - Router: /publish/* 10 endpoint, ReviewGateViolationError → HTTP 422
  - Editorial izolasyon: StandardVideo/NewsBulletin tabloları değişmez
  - 36/36 test geçiyor (27 servis + 9 migration)

M6-C1 + M6-C2 + M6-C3 tamamlandı:
- M6-C1: Remotion kurulumu + renderer paketi + RenderStepExecutor foundation
- M6-C2: word_timing inline yükleme, dynamic duration, RenderStillExecutor + PreviewFrame
- M6-C3: composition_map senkronu (PreviewFrame), artifact rolleri (canonical vs snapshot), duration fallback açıklık, as unknown cast audit

M5-C1, M5-C2 ve M5-C3 tamamlandı:
- M5-C1: Source Registry + RSS Fetch + Normalization (feedparser, scan_engine.py, ScanExecuteResponse, hard dedupe, durum semantiği izolasyonu)
- M5-C2: Scan Engine + Dedupe (dedupe_service.py, soft dedupe Jaccard, follow-up exception, dedupe_details açıklanabilirlik, sınır koruması)
- M5-C3: Bulletin Pipeline + Editorial Gate (editorial_gate.py, confirm_selection, consume_news, state zinciri new→selection_confirmed→used, 3 yeni endpoint)

M4 üç chunk ile tamamlandı:
- M4-C1: Whisper entegrasyonu + word timing data modeli (LocalWhisperProvider, word_timing.json, timing_mode hattı)
- M4-C2: Karaoke rendering + style presets (SubtitlePreset dataclass, 5 preset, composition_props'a timing_mode/subtitle_style/word_timing_path)
- M4-C3: Preview-first subtitle style selection (CSS stil kartı UI, /subtitle-presets endpoint, strict/boundary fallback ayrımı, registry=None teknik borç belgesi)

**M4 sonrası fallback aktiflik durumu:**
- LLM: AKTİF — resolve_and_invoke (M3-C2)
- TTS: AKTİF — resolve_and_invoke (M3-C2)
- VISUALS: AKTİF — VisualsStepExecutor kendi döngüsünde (bilinçli fark)
- WHISPER: DEGRADED MODE — Whisper yoksa cursor-tabanlı timing; zincir değil, degrade

**Known Warnings (non-blocking backlog) — 3 kategori, 1–7 toplam (non-deterministic):**

Uyarı sayısı her run'da farklı çıkar — thread teardown ve GC zamanlaması nedeniyle. Kategori sayısı sabittir: 3.

- **W-01** `RuntimeWarning: coroutine '_run_pipeline' was never awaited`
  Kaynak: `unittest.mock.py` veya `asyncio/base_events.py` — `test_m2_c6_dispatcher_integration.py::test_dispatch_creates_background_task`. Mock framework `asyncio.create_task` ile oluşturulan coroutine'i await etmiyor. Test mock kurulumu seviyesi; uygulama kodu değil. Her run'da tam olarak 1 kez görülür.

- **W-02** `PytestUnhandledThreadExceptionWarning: Exception in thread _connection_worker_thread`
  Kaynak: `_pytest/threadexception.py` — aiosqlite arka plan worker thread'i test teardown sırasında exception üretiyor. Run'a göre 0–4 arası görülür (non-deterministic). Test teardown zamanlaması; production thread yönetimini etkilemiyor.

- **W-03** `ResourceWarning: Connection deleted before being closed`
  Kaynak: `aiosqlite/core.py:102` — `test_m5_c1_rss_scan_engine.py`. aiosqlite bağlantısı `async with` / `.close()` olmadan GC'ye düşüyor. Run'a göre 0–6 arası görülür (non-deterministic). Test teardown pattern sorunu; production bağlantı yönetimini etkilemiyor.

Tüm kategoriler test altyapısı / framework seviyesi. 0 blocking. Uygulama davranışı etkilenmiyor.
**Backlog (Önerilen faz: M8 Hardening):** W-01 → test_m2_c6 mock pattern'ini `AsyncMock` + proper await ile düzelt. W-02+W-03 → test_m5_c1 aiosqlite bağlantılarını `async with` bloğuna al.

**M3-C3 değişiklikleri:**
- `registry.py` — `ProviderEntry`'ye runtime health alanları (invoke_count, error_count,
  last_error, last_used_at, last_latency_ms); `record_outcome()` metodu; `get_health_snapshot()`
- `resolution.py` — Her invoke sonrası `record_outcome()` çağrısı (başarı/hata); `time.monotonic` gecikme ölçümü
- `kie_ai_provider.py` — trace'e `cost_estimate_usd` seam eklendi (token bazlı yaklaşım)
- `providers/router.py` — YENİ: GET /providers, POST /providers/default,
  POST /providers/{id}/enable, POST /providers/{id}/disable
- `api/router.py` — providers_router dahil edildi
- `test_m2_c6_dispatcher_integration.py` — background task warning düzeltmesi
  (asyncio.create_task spy + gather → mock framework'te 1 residual warning kaldı)
- 18 yeni test (test_m3_c3_provider_health.py), 644 toplam

**Warnings durumu:**
- 1 known-nonblocking warning: `unittest.mock.py:2245` `RuntimeWarning` —
  mock framework internal, uygulamanın kendi kodu değil. Bloklayıcı değil.

**Fallback aktiflik durumu (M3-C3 sonrası — değişmedi):**
- LLM: AKTİF — resolve_and_invoke, KieAI→OpenAICompat
- TTS: AKTİF — resolve_and_invoke, EdgeTTS→SystemTTS
- VISUALS: AKTİF — VisualsStepExecutor kendi döngüsünde

**Sonraki**: M6 — Remotion Render Pipeline + Preview Infrastructure.

## Sonraki Milestone
**M3 devam: Provider Registry + Fallback Pack**
- M3-C3: Admin panel — provider sağlık durumu, maliyet takibi, settings registry bağlantısı

## Devam Eden
M3-C3 bekliyor.

## Hygiene Hattı Kapanış Durumu
- **KAPATILDI:** Mikro readability faz zinciri Phase 235 ile resmen kapatıldı.
- **YENİ MİKRO FAZ AÇILMAYACAK.** Son ~45 fazın büyük çoğunluğu audit-only kapandı; marjinal getiri düştü.
- **ANA FAZ BAŞLADI:** Wizard / Onboarding (ürün geliştirme hattı)

## Son Tamamlananlar
- **M5-C3 Bulletin Pipeline + Editorial Gate** — editorial_gate.py (confirm_selection, consume_news, get_selectable_news_items), 3 yeni endpoint, new→selection_confirmed→used state zinciri, UsedNewsRegistry yazım noktası sabitleme (test 27), scan_engine/consume_news izolasyonu (test 26), 28 yeni test, 770 toplam (2026-04-04)
- **M5-C2 Scan Engine + Dedupe** — dedupe_service.py (Jaccard başlık benzerliği, SOFT_DEDUPE_THRESHOLD=0.65), follow-up exception (allow_followup=True), dedupe_details açıklanabilirlik listesi, skipped_hard/skipped_soft/followup_accepted ayrımı, UsedNewsRegistry sınır koruması (test 25), 25 yeni test, 742 toplam (2026-04-04)
- **M5-C1 Source Registry + RSS Fetch + Normalization** — scan_engine.py (execute_rss_scan), feedparser entegrasyonu, hard dedupe (URL lowercase), ScanExecuteResponse, POST /source-scans/{id}/execute endpoint, NewsItem.status="new" garantisi (tarama motoru asla 'used' atamaz), 22 yeni test, 717 toplam (2026-04-04)
- **M4-C3 Preview-First Subtitle Style Selection** — /subtitle-presets endpoint, SubtitleStylePicker CSS stil kartı UI, strict helper vs boundary fallback ayrımı, degrade mod etiketi (form+kart seviyesi), registry=None açık teknik borç belgesi, 13 yeni test, 695 toplam (2026-04-04)
- **M4-C2 Karaoke Rendering + Style Presets** — SubtitlePreset frozen dataclass, 5 preset (clean_white→outline_only), composition_props'a subtitle_style+word_timing_path+timing_mode, KaraokeSubtitle.tsx (Remotion placeholder, M6'da aktif), subtitle-contracts.ts tip sözleşmeleri, 18 yeni test, 682 toplam (2026-04-04)
- **M4-C1 Whisper Entegrasyonu + Word Timing Data Modeli** — ProviderCapability.WHISPER, LocalWhisperProvider (faster-whisper, model cache), SubtitleStepExecutor registry-aware (whisper_word/whisper_segment/cursor), word_timing.json artifact, _build_srt alias (geriye uyum), dispatcher SubtitleStepExecutor(registry=), 20 yeni test, 664 toplam (2026-04-04)
- **M3-C3 Provider Health + Admin Surface + Cost Seam** — ProviderEntry runtime health fields, record_outcome (resolution.py), get_health_snapshot(), admin provider router (GET/POST), cost_estimate_usd seam (KieAI), background task warning düzeltmesi, 18 yeni test, 644 toplam (2026-04-04)
- **M3-C2 İkinci Provider + Runtime Fallback** — OpenAICompatProvider, SystemTTSProvider, NonRetryableProviderError hiyerarşisi, resolve_and_invoke executor bağlantısı, 626 toplam (2026-04-04)
- **M3-C1 Provider Registry** — ProviderCapability enum, ProviderRegistry (kayıt/çözümleme/admin seam), resolve_and_invoke (fallback+trace), _build_executor kaldırıldı, VisualsStepExecutor provider-agnostic, 15 yeni test, 606 toplam (2026-04-04)
- **M2-C6 Full Stack Integration** — JobDispatcher (orchestration), step_initializer.py, POST /api/v1/jobs, GET /jobs/{id}/artifacts, asyncio.create_task GC koruması, 11 yeni test, 591 toplam (2026-04-04)
- **M2-C5 Subtitle + Composition** — SubtitleStepExecutor (SRT), CompositionStepExecutor (props_ready), composition_map.py güvenli mapping, executors/ pakete bölündü, 22 yeni test, 580 toplam (2026-04-04)
- **M2-C4 TTS + Visuals** — TTSStepExecutor, VisualsStepExecutor (Pexels→Pixabay fallback), voice_map.py, artifact_check idempotency, 16 yeni test, 558 toplam (2026-04-04)
- **M2-C3 Language-Aware Script + Metadata** — language.py (SupportedLanguage enum, resolve_language), step_context.py, prompt_builder.py (TR/EN talimat blokları), ScriptStepExecutor + MetadataStepExecutor gerçek LLM impl, 20 yeni test, 542 toplam (2026-04-04)
- **M2-C2 Provider Implementations** — KieAiProvider (Gemini 2.5 Flash), EdgeTTSProvider, PexelsProvider, PixabayProvider, .env güvenlik, 30 yeni test, 522 toplam (2026-04-04)
- **M2-C1 Modül Sistemi** — BaseProvider ABC, ModuleRegistry, ModuleDefinition/StepDefinition, standard_video stub executor'ları, InputNormalizer, 33 yeni test, 492 toplam (2026-04-04)
- **M1 (4 chunk)** — Job engine foundation: StepIdempotencyType, PipelineRunner, EventBus/SSE, timing/recovery, lifespan handler, 459 toplam (2026-04-04)
- Phase 1.2 State Machine Enforcement — transition_job_status + transition_step_status service entegrasyonu, InvalidTransitionError/JobNotFoundError/StepNotFoundError exception modeli, side-effect kuralları (timestamp/error/retry_count/log/artifact), 68 yeni test, 357 toplam backend test, tsc temiz (2026-04-04) [Codex review bekleniyor]
- Phase 1.1 Execution Contract Katmanı — contracts/ paketi (enums, state_machine, artifacts, provider_trace, retry_history, review_state, sse_events, workspace), frontend/src/types/execution.ts mirror, 94 yeni test, 289 toplam backend test, tsc temiz (2026-04-04)
- Asset Library / Media Resource Management Pack — asset library giris yüzeyi (quick link + sidebar + readiness checklist), AssetLibraryPage (varlik kayit/tur gruplama/filtre/arama/detay/reuse/preview safety), 50 yeni test, 2100 toplam (2026-04-03)
- Phase 318–321: final UX / release readiness pack — deferred/disabled note standardizasyonu (backend entegrasyonu kalibi), cross-module heading/subtitle/workflow testid koheransi, release readiness checklist yuzeyi (8 alan, Omurga hazir), end-to-end verification, 32 yeni test, 2050 toplam (2026-04-03)
- Phase 314–317: reporting/business intelligence pack — reporting giris noktasi, analytics/raporlama ayrimi, operasyonel rapor zinciri, kullanim/performans rapor zinciri, karar destek konteksti, end-to-end verification, 25 yeni test, 2018 toplam (2026-04-03)
- Phase 310–313: automation/batch operations pack — batch giris noktasi, queue/job batch control flow, retry/cancel/skip davranis netligi, operasyonel aksiyonlar paneli, Turkish label'lar, end-to-end verification, 23 yeni test, 1993 toplam (2026-04-03)
- Phase 305–309: admin/advanced settings governance pack — settings/visibility registry headingleri, workflow notlari, detail panel governance section gruplama (Kimlik/Governance/Kapsam), Turkish label'lar, admin overview quick link governance desc, end-to-end verification, 23 yeni test, 1970 toplam (2026-04-03)
- Phase 299–304: library/gallery/content management pack — birlesik icerik kutuphanesi, filtre/sort/search yuzeyi, detail baglantisi, reuse/clone/manage aksiyonlari, end-to-end verification, 31 yeni test, 1947 toplam (2026-04-03)
- Phase 293–298: youtube analytics pack — analytics giris yuzeyi, temel metrik panosu, video-level performans, kanal ozeti, tarih/filtre etkilesimi, operasyon metrikleri, end-to-end verification, 38 yeni test, 1916 toplam (2026-04-03)
- Phase 287–292: youtube publish workflow pack — yayin zinciri gorunurlugu, readiness konteksti, job/overview publish notu, standard video yayin referansi, end-to-end verification, 20 yeni test, 1878 toplam (2026-04-03)
- Phase 282–286: template/style/blueprint pack — entry clarity, template create/edit workflow, style blueprint flow, template-style link visibility, end-to-end verification, 23 yeni test, 1861 toplam (2026-04-03)
- Phase 276–281: news workflow pack — entry surface, source/intake clarity, selection/curation, draft generation continuity, detail/review/output clarity, end-to-end verification, 18 yeni test, 1838 toplam (2026-04-03)
- Phase 269–275: video workflow pack — create flow clarity, script/metadata visibility, TTS/subtitle/composition chain, job progress/timeline/ETA, detail/artifacts surface, end-to-end verification, 14 yeni test, 1820 toplam (2026-04-03)
- Phase 268: video workflow entry map — "Ana uretim akisi" vurgusu content/admin/handoff'ta, admin quick link testid'leri, 11 yeni test, 1806 toplam (2026-04-03)
- Phase 264–267: navigation closure pack — task-chain visibility (ikinci/ucuncu adim), admin entry clarity (fiil-odakli subtitle, style hizalama), navigation consistency final pass, ANA FAZ 2 KAPATILDI, 17 yeni test, 1795 toplam (2026-04-03)
- Phase 263: user/admin route intent clarity — panel rolleri netlesti (baslangic+takip vs uretim+yonetim), karsit referanslar, 11 yeni test, 1778 toplam (2026-04-03)
- Phase 262: panel switch destination clarity — switch copy "X Gec" fiili, title+aria-label, 10 yeni test, 1767 toplam (2026-04-03)
- Phase 261: user panel cross-link recovery — content→publish ve publish→content cross-link, sidebar'siz section gecisi, 8 yeni test, 1757 toplam (2026-04-03)
- Phase 260: user panel route landing consistency — SUBTITLE margin/maxWidth hizalama, CARD transition ekleme, 12 yeni test, 1749 toplam (2026-04-03)
- Phase 259: user panel section transition clarity — hub akis aciklamasi, "Ilk adim/Sonraki adim" kart desc, content→yayin ve yayin←icerik referanslari, 8 yeni test, 1737 toplam (2026-04-03)
- Phase 258: user panel navigation state clarity — section kimlikleri (Baslangic/Icerik uretim/Yayin dagitim merkezi), subtitle stili tutarliligi, typo fix, 9 yeni test, 1729 toplam (2026-04-03)
- Phase 257: cross-surface CTA consistency pass — handoff/hub CTA dili hizalandi, "Yeni Icerik Olustur"→"Yeni Video Olustur", "Panele Git"→"Yonetim Paneline Git", 1720 toplam (2026-04-03)
- Phase 256: user panel empty/no-action state clarity — dashboard pending note, content first-use note, publish first-use note, 8 yeni test, 1720 toplam (2026-04-03)
- Phase 255: admin to user return landing clarity — dashboard context note, kullanici paneli yon bilgisi, handoff/hub ile uyumlu, 8 yeni test, 1712 toplam (2026-04-03)
- Phase 254: user to admin task continuity strip — AdminContinuityStrip, yonetim paneli bilgi bandi, kullanici paneline donus linki, 7 yeni test, 1704 toplam (2026-04-03)
- Phase 253: user dashboard primary action hub — DashboardActionHub, Icerik/Yayin/Yonetim Paneli hizli erisim kartlari, handoff ile uyumlu, 8 yeni test, 1697 toplam (2026-04-03)
- Phase 252: user flow / navigation publish entry surface — UserPublishEntryPage, /user/publish route, Isler + Standart Videolar + Haber Bultenleri kartlari, sidebar link aktif, 10 yeni test, 1689 toplam (2026-04-03)
- Phase 251: user flow / navigation content entry surface — UserContentEntryPage, /user/content route, Standart Video + Haber Bulteni kartlari, sidebar link aktif, 8 yeni test, 1679 toplam (2026-04-03)
- Phase 250: entry information architecture & primary route clarity — Turkce header/sidebar/dashboard, panel gecis butonu, admin section gruplari, hizli erisim kartlari, 4 yeni test, 1671 toplam (2026-04-03)
- Phase 249: onboarding flow polish & step coherence pass — Turkce dil tutarliligi, CTA netligi, geri donus mantigi, completion checklist genisletildi, 1667 toplam (2026-04-03)
- Phase 248: post-onboarding first landing & user handoff flow — PostOnboardingHandoff component, UserDashboardPage entegrasyonu, ana/ikincil CTA, 7 yeni test, 1667 toplam (2026-04-03)
- Phase 247: onboarding completion gate & ready-to-enter flow — end-to-end zincir testleri (completion/mutation/requirements bloklama/review gecisi), 5 yeni test, 1660 toplam (2026-04-03)
- Phase 246: duplicate — Phase 240 ile ayni, degisiklik yok (2026-04-03)
- Phase 245: app entry re-entry rules & post-setup bypass — OnboardingPage bypass guard, tamamlanan kullanicilar /onboarding'den /user'a yonlendirilir, 5 yeni test, 1655 toplam (2026-04-03)
- Phase 244: onboarding setup summary review step — kurulum ozeti ekrani (5 satir: sources/templates/settings/providers/workspace), workspace→review→completion zinciri, 7 yeni test, 1650 toplam (2026-04-03)
- Phase 243: onboarding output/workspace path setup step — workspace yapilandirma ekrani (workspace_root + output_dir), provider→workspace→completion zinciri, 7 yeni test, 1643 toplam (2026-04-03)
- Phase 242: onboarding provider/API setup step — provider yapilandirma ekrani (TTS/LLM/YouTube API keys), requirements→provider-setup→completion zinciri, 7 yeni test, 1636 toplam (2026-04-03)
- Phase 241: onboarding completion gate & continue flow — completion ekrani, requirements→completion→uygulamaya gecis zinciri, 7 yeni test, 1629 toplam (2026-04-03)
- Phase 240: onboarding settings setup required action — requirements ekraninda ayar aksiyonu, OnboardingSettingsSetupScreen, createSetting API+hook, 7 yeni test, 1622 toplam (2026-04-03)
- Phase 239: onboarding template setup required action — requirements ekraninda sablon aksiyonu, OnboardingTemplateSetupScreen, mevcut TemplateForm tekrar kullanimi, 7 yeni test, 1615 toplam (2026-04-03)
- Phase 238: onboarding source setup first required action — requirements ekraninda kaynak aksiyonu, OnboardingSourceSetupScreen, mevcut SourceForm tekrar kullanimi, 7 yeni test, 1608 toplam (2026-04-03)
- Phase 237: onboarding setup requirements screen — backend requirements endpoint, frontend requirements ekrani, welcome→requirements akisi, 7 yeni test, 1601 toplam (2026-04-03)
- Phase 236: onboarding app entry gate & welcome screen — backend API, frontend gate, welcome screen, 7 test, 1594 toplam (2026-04-03)
- Phase 235: hygiene closure & product pivot gate — kapanış doğrulaması, baseline stabil, 1587 toplam (2026-04-03)
- Phase 234: repeated small detail field/row call-site readability pack: audit-only, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 233: repeated small summary component call readability pack: audit-only, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 232: repeated small table cell content readability pack: audit-only, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 231: repeated small form validation readability pack: kapsamlı audit, per-field validation farklı, threshold karşılanmadı, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 230: repeated small label/heading text readability pack: kapsamlı audit, tam string tekrar yok, DASH const mevcut, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 229: repeated small setter/update call readability pack: kapsamlı audit, per-field standart, farklı argümanlar, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 228: repeated small hook call readability pack: kapsamlı audit, useState per-field standart, custom hook'lar farklı, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 227: repeated small return object/payload shape readability pack: kapsamlı audit, tek payload build per dosya, threshold karşılanmadı, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 226: repeated small local derived value readability pack: kapsamlı audit, aynı computation tekrar etmiyor, farklı bağlam, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 225: repeated small JSX fragment/wrapper readability pack: kapsamlı audit, fragment yok, çoklu return farklı conditional path, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 224: repeated small early return/guard clause readability pack: kapsamlı audit, 3+ olan dosyalar summary kapsam dışı, detail/panel max 2×, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 223: repeated small function parameter naming/destructuring readability pack: kapsamlı audit, tüm imzalar tutarlı, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 222: repeated small local variable naming readability pack: kapsamlı audit, standart React idiom, threshold karşılanmadı, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 221: repeated small conditional JSX block readability pack: kapsamlı audit, farklı guard variable, threshold karşılanmadı, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 220: repeated small local type alias/union readability pack: kapsamlı audit, form/panel/table'da type yok, badge kapsam dışı, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 219: repeated small import grouping/ordering readability pack: kapsamlı audit, tüm dosyalar tutarlı, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 218: repeated small inline event handler readability pack: kapsamlı audit, onChange per-field setter farklı, onClick farklı argümanlar, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 217: repeated small CSSProperties type annotation readability pack: kapsamlı audit, 39 dosya zaten tutarlı, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 216: repeated small title/subject/name text readability pack: kapsamlı audit, loop variable property access, dosya-seviyesi const uygunsuz, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 215: repeated small disabled/busy button readability pack: kapsamlı audit, threshold altı (max 2×), hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 214: repeated small edit/view mode readability pack: kapsamlı audit, threshold altı, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 213: repeated small boolean prop readability pack: 4 dosyada const isCreate eklendi, 12 satır değiştirildi, 1587 toplam (2026-04-03)
- Phase 212: repeated small .join()/separator array render pattern pack: kapsamlı audit, threshold karşılanmadı, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 211: repeated small nullish-coalescing readability pack: kapsamlı audit, ?? "" standart kullanım, extraction değer katmıyor, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 210: repeated small loading/error/fallback render pattern pack: kapsamlı audit, extraction değer katmıyor, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 209: repeated small local error message readability pack: kapsamlı audit, gerçek error literal yok, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 208: repeated small date/timestamp formatting constant pack: kapsamlı audit, extraction değer katmıyor, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 207: repeated small inline number formatting constant pack: kapsamlı audit, extraction değer katmıyor, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 206: repeated small boolean/ternary label text constant pack: kapsamlı audit, threshold karşılanmadı, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 205: repeated small list/marker/bullet text constant pack: kapsamlı audit, threshold karşılanmadı, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 204: repeated small position/zIndex literal constant pack: kapsamlı audit, kullanım yok, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 203: repeated small text-decoration literal constant pack: kapsamlı audit, threshold karşılanmadı, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 202: repeated small outline/boxShadow literal constant pack: kapsamlı audit, kullanım yok, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 201: repeated small transition/animation literal constant pack: kapsamlı audit, kullanım yok, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 200: repeated small whiteSpace literal constant pack: kapsamlı audit, threshold karşılanmadı, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 199: repeated verticalAlign literal constant pack: kapsamlı audit, threshold karşılanmadı, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 198: repeated small gap literal constant pack: kapsamlı audit, threshold karşılanmadı, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 197: repeated opacity literal constant pack: kapsamlı audit, kullanım yok/threshold altı, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 196 — Repeated textTransform/letterSpacing Literal Constant Pack ✓ TAMAMLANDI (audit-only)

## Mevcut Hedef
textTransform/letterSpacing literal audit. Bu property'ler codebase'de kullanılmıyor. Hiçbir dosya değiştirilmedi. 1587 toplam test.

## Devam Eden
— (devam eden çalışma yok)

## Son Tamamlananlar
- Phase 196: repeated textTransform/letterSpacing literal constant pack: kapsamlı audit, kullanım yok, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 195 — Repeated Small Border Literal Constant Pack ✓ TAMAMLANDI

## Mevcut Hedef
Border literal audit. BORDER = "1px solid #e2e8f0" (3 dosya: TemplateStyleLinkDetailPanel×3, TemplateDetailPanel×3, StandardVideoArtifactsPanel×3). 1587 toplam test.

## Devam Eden
— (devam eden çalışma yok)

## Son Tamamlananlar
- Phase 195: repeated small border literal constant pack: BORDER extraction (3 dosya, toplam 9 değişim), 1587 toplam (2026-04-03)
- Phase 194 — Repeated Small Helper Function Name/Const Readability Pack ✓ TAMAMLANDI

## Mevcut Hedef
Const/helper sıralama ve yerleşim audit. StandardVideoScriptPanel primitive→style sırası düzeltildi, TemplateForm REQ_MARK errorStyle yanına taşındı. 1587 toplam test.

## Devam Eden
— (devam eden çalışma yok)

## Son Tamamlananlar
- Phase 194: repeated small helper function name/const readability pack: StandardVideoScriptPanel const reorder, TemplateForm REQ_MARK reorder, 1587 toplam (2026-04-03)
- Phase 193 — Repeated Placeholder/Empty-State String Literal Constant Pack ✓ TAMAMLANDI (audit-only)

## Mevcut Hedef
Placeholder/empty-state string literal audit. Tüm değerler max 1× per dosya — threshold altı. Hiçbir dosya değiştirilmedi. 1587 toplam test.

## Devam Eden
— (devam eden çalışma yok)

## Son Tamamlananlar
- Phase 193: repeated placeholder/empty-state string literal constant pack: kapsamlı audit, threshold altı (max 1× per dosya), hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 192 — Repeated Line-Height Literal Constant Pack ✓ TAMAMLANDI (audit-only)

## Mevcut Hedef
lineHeight literal audit. Hiçbir component dosyasında lineHeight kullanımı bulunamadı. Hiçbir dosya değiştirilmedi. 1587 toplam test.

## Devam Eden
— (devam eden çalışma yok)

## Son Tamamlananlar
- Phase 192: repeated line-height literal constant pack: kapsamlı audit, lineHeight kullanılmıyor, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 191 — Repeated Width/MinWidth Literal Constant Pack ✓ TAMAMLANDI (audit-only)

## Mevcut Hedef
Width/minWidth/maxWidth literal audit. Tüm değerler max 2× per dosya — threshold altı. Hiçbir dosya değiştirilmedi. 1587 toplam test.

## Devam Eden
— (devam eden çalışma yok)

## Son Tamamlananlar
- Phase 191: repeated width/minwidth literal constant pack: kapsamlı audit, threshold altı (max 2× per dosya), hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 190 — Repeated Display/Layout Literal Constant Pack ✓ TAMAMLANDI (audit-only)

## Mevcut Hedef
Display/layout literal audit. Anlamlı extraction fırsatı bulunamadı. JobTimelinePanel 3× "flex" farklı nesnelerde, StandardVideoArtifactSummary 2× composite (threshold altı). Hiçbir dosya değiştirilmedi. 1587 toplam test.

## Devam Eden
— (devam eden çalışma yok)

## Son Tamamlananlar
- Phase 190: repeated display/layout literal constant pack: kapsamlı audit, anlamlı extraction fırsatı yok, hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 189 — Repeated Small Background Literal Constant Pack ✓ TAMAMLANDI (audit-only)

## Mevcut Hedef
Background literal audit. Tüm değerler max 2× per dosya — threshold altı. Hiçbir dosya değiştirilmedi. 1587 toplam test.

## Devam Eden
— (devam eden çalışma yok)

## Son Tamamlananlar
- Phase 189: repeated small background literal constant pack: kapsamlı audit, threshold altı (max 2× per dosya), hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 188 — Repeated Small Color Literal Constant Pack ✓ TAMAMLANDI

## Mevcut Hedef
Bileşenlerde tekrar eden color hex literal audit. COLOR_DARK (5 dosya), COLOR_ERR (10 dosya), COLOR_FAINT (1 dosya), COLOR_BLUE (1 dosya). 1587 toplam test.

## Devam Eden
— (devam eden çalışma yok)

## Son Tamamlananlar
- Phase 188: repeated small color literal constant pack: COLOR_DARK + COLOR_ERR + COLOR_FAINT + COLOR_BLUE extraction (17 dosya, badge hariç), 1587 toplam (2026-04-03)
- Phase 187: repeated small margin/padding literal constant pack: PAD_B_SM + PAD_B_XS + TD_PAD extraction (3 dosya, toplam 22 değişim), 1587 toplam (2026-04-03)
- Phase 186: repeated small overflow/wrap style constant pack: WRAP_WORD extraction (NewsBulletinMetadataPanel×3), test guard güncellendi, 1587 toplam (2026-04-03)
- Phase 185: repeated small cursor/pointer style constant pack: CURSOR_PTR extraction (StandardVideoScriptPanel×3), 1587 toplam (2026-04-03)
- Phase 184: repeated small text align literal constant pack: kapsamlı audit, threshold altı (max 1× per dosya), hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 183: repeated small font weight constant pack: TH_CELL extraction (TemplateStyleLinksTable×6, NewsBulletinSelectedItemsPanel×5), 1587 toplam (2026-04-03)
- Phase 182: repeated small font size literal constant pack: FONT_SM extraction (3 dosya: ArtifactsPanel×8, SourceScanDetailPanel×3, SourceDetailPanel×3), 1587 toplam (2026-04-03)
- Phase 181: repeated small border radius constant pack: RADIUS_XS + RADIUS_SM extraction (2 dosya), 1587 toplam (2026-04-03)
- Phase 180: repeated small loading/busy text constant pack: kapsamlı audit, threshold altı (max 2× per dosya), hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 179: repeated small status text constant pack: kapsamlı audit, threshold altı (max 2× per dosya), hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 178: repeated small monospace/code style constant pack: kapsamlı audit, threshold altı (max 2× per dosya), hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 177: repeated small panel meta text constant pack: kapsamlı audit, threshold altı (max 2× per dosya), hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 176: repeated small form help text style constant pack: kapsamlı audit, threshold altı (max 2× per dosya), hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 175: repeated small panel divider constant pack: kapsamlı audit, threshold altı (max 1× per dosya), hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 174: repeated required mark constant pack: kapsamlı audit, threshold altı (max 2 tekrar kalan dosyalarda), hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 173: repeated form label style constant pack: REQ_MARK extraction (TemplateForm×3, UsedNewsForm×3), 1587 toplam (2026-04-03)
- Phase 172: repeated input/textarea style constant pack: JSON_TEXTAREA + TEXTAREA extraction (3 dosya), 1587 toplam (2026-04-03)
- Phase 171 — Repeated Simple Layout Constant Pack ✓ TAMAMLANDI

## Mevcut Hedef
Küçük form bileşenlerinde tekrar eden basit layout style bloklarını const ile extraction. 4 NewsBulletin form dosyasında FIELD const eklendi (toplam 23 inline → const). 1587 toplam test.

## Devam Eden
— (devam eden çalışma yok)

## Son Tamamlananlar
- Phase 171: repeated simple layout constant pack: FIELD extraction (Form×10, MetadataForm×8, ScriptForm×3+spread, SelectedItemForm×2+spread), 1587 toplam (2026-04-03)
- Phase 170: repeated action row style constant pack: PAIR_ROW + FLEX_1 extraction (MetadataForm 4+2, ScriptForm 2+1), 1587 toplam (2026-04-03)
- Phase 169: repeated form section heading constant pack: kapsamlı audit, threshold altı (max 2 tekrar per dosya), hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 168: repeated action button text constant pack: kapsamlı audit, threshold altı (max 2 tekrar), hiçbir dosya değiştirilmedi, 1587 toplam (2026-04-03)
- Phase 167: repeated form button style constant pack: 9 form dosyasında BTN_PRIMARY/BTN_CANCEL extraction, 1587 toplam (2026-04-03)
- Phase 166: repeated neutral color literal constant pack: 4 dosyada BORDER_COLOR/MUTED_TEXT extraction, 1587 toplam (2026-04-03)
- Phase 165: repeated empty/fallback string constant pack: NewsBulletinForm.tsx'e const DASH eklendi, 4 JSX em-dash sadeleşti, 1587 toplam (2026-04-03)
- Phase 164: repeated heading/text style constant pack: 4 dosyada FORM_HEADING/MUTED extraction, 1587 toplam (2026-04-03)
- Phase 163: repeated section/container style constant pack: 8 dosyada SECTION_STYLE/PANEL_BOX/SECTION_DIVIDER extraction, 1587 toplam (2026-04-03)
- Phase 162: repeated table cell style constant pack: 12 tablo dosyasında TH_STYLE/TD_STYLE extraction, 1587 toplam (2026-04-03)
- Phase 161: repeated panel label style constant pack: 6 dosyada LABEL_TD/LABEL_TD_TOP/LABEL_SPAN extraction, 27 inline style → const referansı, 1587 toplam (2026-04-03)
- Phase 160: field/row label-value rendering consistency pack: 3 Row value overflowWrap fix, 2 Field label color+fontSize fix, 1587 toplam (2026-04-03)
- Phase 159: helper return-type consistency call-site safety pack: formatDateTime default fallback null→"—", dönüş tipi string|null→string, 1 test güncelleme, 1587 toplam (2026-04-03)
- Phase 158: repeated date fallback constant readability pack: 4 dosyada kalan inline "—" → DASH, 1587 toplam (2026-04-03)
- Phase 157: duplicate inline fallback pattern reduction pack: 13 dosyada const DASH extraction, 62 inline "—" → DASH, 11 test assertion güncelleme, 1587 toplam (2026-04-03)
- Phase 156: shared fallback helper consolidation pack: 8 safeNumber konsolidasyonu, 1 formatDateISO konsolidasyonu, 4 test dosyası güncelleme, 1587 toplam (2026-04-03)
- Phase 155: string normalization whitespace safety pack: isBlank helper, 10 bileşen fix, 27 yeni guard test, 1587 toplam (2026-04-03)
- Phase 153: array list render safety pack: 2 steps array guard (JobTimelinePanel, JobStepsList), Array.isArray + safeSteps pattern, 15 yeni guard test, 1535 toplam (2026-04-03)
- Phase 152: numeric count ratio display safety pack: 7 summary count guard, 2 table version guard, 5 detail panel Number() guard, 6 form isFinite guard, safeNumber helper, 33 yeni guard test, 1520 toplam (2026-04-03)
- Phase 151: badge enum status unknown-value safety pack: 62 badge style lookup neutral fallback, 76 badge label text null fallback (70 level + 6 status), 236 yeni guard test, 1487 toplam (2026-04-03)
- Phase 150: required field assumption safety pack: 30 property null fallback (9 tablo + 2 detail panel), version numeric fallback, 42 yeni guard test, badge stilleri korundu, 1251 toplam (2026-04-03)
- Phase 149: clipboard copy surface safety text export hygiene pack: 13 property null fallback, 3 content block null-safe length, 4 overflowWrap fix, safeJsonPretty whitespace guard, 25 yeni guard test, badge stilleri korundu, 1209 toplam (2026-04-03)
- Phase 148: url link surface safety external target hygiene pack: anchor null guard fix, rel="noopener noreferrer" fix, UrlField overflowWrap, 13 yeni guard test, badge stilleri korundu, 1184 toplam (2026-04-03)
- Phase 147: text field overflow long content safety pack: 9 panel Field/Row overflow fix, 5 inline text overflow fix, 7 registry table td overflow fix, 14 form error overflow fix, 34 yeni guard test, badge stilleri korundu, 1171 toplam (2026-04-03)
- Phase 146: json field preview safety readability pack: shared safeJson.ts + JsonPreviewField, 3 duplicate kaldırıldı, 4 overflow fix, 2 validateJson dedup, 19 yeni guard test, badge stilleri korundu, 1137 toplam (2026-04-03)
- Phase 145: list detail form date formatting safety unification pack: 4 helper (formatDateTime, formatDateShort, formatDateISO, normalizeDateForInput), 23 dosya güncellendi, SourceScanSummary Invalid Date guard eklendi, 19 yeni guard test, badge stilleri korundu, 1118 toplam (2026-04-03)
- Phase 144: form surface empty null state safety pack: 2 version String(null) guard, 1 published_at String() coercion, 11 form zaten güvenli, 4 yeni guard test, badge stilleri korundu, 1099 toplam (2026-04-03)
- Phase 143: detail panel empty null state safety pack: 9 panel tarih ternary guard, 2 Job panel .slice() crash fix, 4 form handler .trim() null coalescing (22 alan), 2 yeni guard test, badge stilleri korundu, 1095 toplam (2026-04-03)
- Phase 142: registry empty null state safety pack: 9 tarih alanı Invalid Date koruması, Jobs created_at crash fix, 3 summary NaN guard, 2 string typeof guard, badge stilleri korundu, 1093 toplam (2026-04-03)
- Phase 141: registry density overflow safety pack: overflow-x wrapper (9 tablo), Jobs header background/border/padding fix, StandardVideo header background fix, NewsBulletin fontSize fix, badge stilleri korundu, 1093 toplam (2026-04-03)
- Phase 140: cross registry header grouping consistency pack: Yayın Sonucu→Yayın Çıktısı (SourceScans, Jobs), Enforcement→Uygunluk (NewsBulletin), 1 test fix, badge stilleri korundu, 1093 toplam (2026-04-03)
- Phase 139: standardvideo newsbulletin registry visibility completion pack: StandardVideo sütun sıralama, NewsBulletin 8 başlık Türkçeleştirme + sıralama, 1 import fix, 1 test fix, badge stilleri korundu, 1093 toplam (2026-04-03)
- Phase 138: template styleblueprint registry visibility completion pack: Templates + StyleBlueprints Türkçeleştirme, mantıksal sıralama, 2 import fix, 1 test fix, badge stilleri korundu, 1093 toplam (2026-04-03)
- Phase 137: news registry visibility completion pack: NewsItems + UsedNews Türkçeleştirme, mantıksal sıralama, import fix, badge stilleri korundu, 1093 toplam (2026-04-03)
- Phase 136: jobs registry visibility completion pack: sütun Türkçeleştirme, mantıksal sıralama, 2 import fix, badge stilleri korundu, 1093 toplam (2026-04-03)
- Phase 135: source scans registry visibility completion pack: sütun Türkçeleştirme, mantıksal sıralama, import fix, badge stilleri korundu, 1093 toplam (2026-04-03)
- Phase 134: sources registry visibility completion pack: sütun Türkçeleştirme, mantıksal sıralama, import fix, test mock düzeltmeleri, badge stilleri korundu, 1093 toplam (2026-04-03)
- Phase 133: source publication outcome summary: pure frontend, SourcePublicationOutcomeBadge, SourcePublicationOutcomeSummary, Yayın Çıktısı sütunu, 10 yeni test, 1093 toplam (2026-04-02)
- Phase 124: template target-output consistency summary: pure frontend, TemplateTargetOutputConsistencyBadge, TemplateTargetOutputConsistencySummary, Target/Output Tutarlılığı sütunu, 10 yeni test, 1003 toplam (2026-04-02)
- Phase 123: style blueprint input specificity summary: pure frontend, StyleBlueprintInputSpecificityBadge, StyleBlueprintInputSpecificitySummary, Girdi Özgüllüğü sütunu, 10 yeni test, 993 toplam (2026-04-02)
- Phase 122: template input specificity summary: pure frontend, TemplateInputSpecificityBadge, TemplateInputSpecificitySummary, Girdi Özgüllüğü sütunu, 10 yeni test, 983 toplam (2026-04-02)
- Phase 121: standard video input specificity summary: pure frontend, StandardVideoInputSpecificityBadge, StandardVideoInputSpecificitySummary, Girdi Özgüllüğü sütunu, 10 yeni test, 973 toplam (2026-04-02)
- Phase 120: source input specificity summary: pure frontend, SourceInputSpecificityBadge, SourceInputSpecificitySummary, Girdi Özgüllüğü sütunu, 10 yeni test, 963 toplam (2026-04-02)
- Phase 119: source scan input specificity summary: pure frontend, SourceScanInputSpecificityBadge, SourceScanInputSpecificitySummary, Girdi Özgüllüğü sütunu, 10 yeni test, 953 toplam (2026-04-02)
- Phase 118: used news input specificity summary: pure frontend, UsedNewsInputSpecificityBadge, UsedNewsInputSpecificitySummary, Girdi Özgüllüğü sütunu, 10 yeni test, 943 toplam (2026-04-02)
- Phase 117: news bulletin input specificity summary: pure frontend, NewsBulletinInputSpecificityBadge, NewsBulletinInputSpecificitySummary, Girdi Özgüllüğü sütunu, 10 yeni test, 933 toplam (2026-04-02)
- Phase 116: news item input specificity summary: pure frontend, NewsItemInputSpecificityBadge, NewsItemInputSpecificitySummary, Girdi Özgüllüğü sütunu, 10 yeni test, 923 toplam (2026-04-02)
- Phase 115: job input specificity summary: pure frontend, JobInputSpecificityBadge, JobInputSpecificitySummary, Girdi Özgüllüğü sütunu, 10 yeni test, 913 toplam (2026-04-02)
- Phase 114: job publication yield summary: pure frontend, JobPublicationYieldBadge, JobPublicationYieldSummary, Yayın Verimi sütunu, 10 yeni test, 903 toplam (2026-04-02)
- Phase 113: source scan publication outcome summary: pure frontend, SourceScanPublicationOutcomeBadge, SourceScanPublicationOutcomeSummary, Yayın Sonucu sütunu, 10 yeni test, 893 toplam (2026-04-02)
- Phase 112: job target-output consistency summary: pure frontend, JobTargetOutputConsistencyBadge, JobTargetOutputConsistencySummary, Target/Output Tutarlılığı sütunu, 10 yeni test, 883 toplam (2026-04-02)
- Phase 111: source scan target-output consistency summary: pure frontend, SourceScanTargetOutputConsistencyBadge, SourceScanTargetOutputConsistencySummary, Target/Output Tutarlılığı sütunu, 10 yeni test, 873 toplam (2026-04-02)
- Phase 110: used news input quality summary: pure frontend, UsedNewsInputQualityBadge, UsedNewsInputQualitySummary, Girdi Kalitesi sütunu, 10 yeni test, 863 toplam (2026-04-02)
- Phase 109: news bulletin input quality summary: pure frontend, NewsBulletinInputQualityBadge, NewsBulletinInputQualitySummary, Girdi Kalitesi sütunu, 10 yeni test, 853 toplam (2026-04-02)
- Phase 108: news item input quality summary: pure frontend, NewsItemInputQualityBadge, NewsItemInputQualitySummary, Girdi Kalitesi sütunu, 10 yeni test, 843 toplam (2026-04-02)
- Phase 107: job input quality summary: pure frontend, JobInputQualityBadge, JobInputQualitySummary, Girdi Kalitesi sütunu, 10 yeni test, 833 toplam (2026-04-02)
- Phase 106: source scan input quality summary: pure frontend, SourceScanInputQualityBadge, SourceScanInputQualitySummary, Girdi Kalitesi sütunu, 10 yeni test, 823 toplam (2026-04-02)
- Phase 105: source input quality summary: pure frontend, SourceInputQualityBadge, SourceInputQualitySummary, Girdi Kalitesi sütunu, 10 yeni test, 813 toplam (2026-04-02)
- Phase 104: style blueprint input quality summary: pure frontend, StyleBlueprintInputQualityBadge, StyleBlueprintInputQualitySummary, Girdi Kalitesi sütunu, 10 yeni test, 803 toplam (2026-04-02)
- Phase 103: template input quality summary: pure frontend, TemplateInputQualityBadge, TemplateInputQualitySummary, Girdi Kalitesi sütunu, 10 yeni test, 793 toplam (2026-04-02)
- Phase 102: used news artifact consistency summary: pure frontend, UsedNewsArtifactConsistencyBadge, UsedNewsArtifactConsistencySummary, Artifact Tutarlılığı sütunu, 10 yeni test, 783 toplam (2026-04-02)
- Phase 101: news item artifact consistency summary: pure frontend, NewsItemArtifactConsistencyBadge, NewsItemArtifactConsistencySummary, Artifact Tutarlılığı sütunu, 10 yeni test, 773 toplam (2026-04-02)
- Phase 100: job artifact consistency summary: pure frontend, JobArtifactConsistencyBadge, JobArtifactConsistencySummary, Artifact Tutarlılığı sütunu, 10 yeni test, 763 toplam (2026-04-02)
- Phase 99: source scan artifact consistency summary: pure frontend, SourceScanArtifactConsistencyBadge, SourceScanArtifactConsistencySummary, Artifact Tutarlılığı sütunu, 10 yeni test, 753 toplam (2026-04-02)
- Phase 98: source artifact consistency summary: pure frontend, SourceArtifactConsistencyBadge, SourceArtifactConsistencySummary, Artifact Tutarlılığı sütunu, 10 yeni test, 743 toplam (2026-04-02)
- Phase 97: style blueprint artifact consistency summary: pure frontend, StyleBlueprintArtifactConsistencyBadge, StyleBlueprintArtifactConsistencySummary, Artifact Tutarlılığı sütunu, 10 yeni test, 733 toplam (2026-04-02)
- Phase 96: template artifact consistency summary: pure frontend, TemplateArtifactConsistencyBadge, TemplateArtifactConsistencySummary, Artifact Tutarlılığı sütunu, 10 yeni test, 723 toplam (2026-04-02)
- Phase 95: standard video artifact consistency summary: pure frontend, StandardVideoArtifactConsistencyBadge, StandardVideoArtifactConsistencySummary, Artifact Tutarlılığı sütunu, 10 yeni test, 713 toplam (2026-04-02)
- Phase 94: news bulletin artifact consistency summary: pure frontend, NewsBulletinArtifactConsistencyBadge, NewsBulletinArtifactConsistencySummary, Artifact Tutarlılığı sütunu, 10 yeni test, 703 toplam (2026-04-02)
- Phase 93: standard video input quality summary: pure frontend, StandardVideoInputQualityBadge, StandardVideoInputQualitySummary, Girdi Kalitesi sütunu, 10 yeni test, 693 toplam (2026-04-02)
- Phase 92: news bulletin selected-news quality summary: backend 3 quality count fields (complete/partial/weak), NewsBulletinSelectedNewsQualityBadge, NewsBulletinSelectedNewsQualitySummary, İçerik Kalitesi sütunu, 10 yeni test, 683 toplam (2026-04-02)
- Phase 91: news item publication lineage summary: pure frontend, NewsItemPublicationLineageBadge, NewsItemPublicationLineageSummary, Yayın Zinciri sütunu, 10 yeni test, 673 toplam (2026-04-02)
- Phase 90: news item used-news linkage summary: backend has_published_used_news_link batch query, NewsItemUsedNewsLinkageBadge, NewsItemUsedNewsLinkageSummary, Used News Bağı sütunu, 10 yeni test, 663 toplam (2026-04-02)
- Phase 89: used news target resolution summary: backend has_target_resolved batch lookup, UsedNewsTargetResolutionBadge, UsedNewsTargetResolutionSummary, Hedef Çözümü sütunu, 10 yeni test, 653 toplam (2026-04-02)
- Phase 88: job publication outcome summary: pure frontend, JobPublicationOutcomeBadge, JobPublicationOutcomeSummary, Yayın Sonucu sütunu, 10 yeni test, 643 toplam (2026-04-02)
- Phase 87: source scan publication yield summary: backend linked/reviewed/used COUNT batch queries, SourceScanPublicationYieldBadge, SourceScanPublicationYieldSummary, Yayın Verimi sütunu, 10 yeni test, 633 toplam (2026-04-02)
- Phase 86: used news publication linkage summary: pure frontend, UsedNewsPublicationLinkageBadge, UsedNewsPublicationLinkageSummary, Yayın Bağı sütunu, 10 yeni test, 623 toplam (2026-04-02)
- Phase 85: used news source context summary: backend has_news_item_source/has_news_item_scan_reference batch JOIN, UsedNewsSourceContextBadge, UsedNewsSourceContextSummary, Kaynak Bağlamı sütunu, 10 yeni test, 613 toplam (2026-04-02)
- Phase 84: job output richness summary: pure frontend, JobOutputRichnessBadge, JobOutputRichnessSummary, Çıktı Zenginliği sütunu, 10 yeni test, 603 toplam (2026-04-02)
- Phase 83: style blueprint publication signal summary: pure frontend, StyleBlueprintPublicationSignalBadge, StyleBlueprintPublicationSignalSummary, Yayın Sinyali sütunu, 10 yeni test, 593 toplam (2026-04-02)
- Phase 82: template publication signal summary: pure frontend, TemplatePublicationSignalBadge, TemplatePublicationSignalSummary, Yayın Sinyali sütunu, 10 yeni test, 583 toplam (2026-04-02)
- Phase 81: standard video publication signal summary: pure frontend, StandardVideoPublicationSignalBadge, StandardVideoPublicationSignalSummary, Yayın Sinyali sütunu, 10 yeni test, 573 toplam (2026-04-02)
- Phase 80: news bulletin publication signal summary: pure frontend, NewsBulletinPublicationSignalBadge, NewsBulletinPublicationSignalSummary, Yayın Sinyali sütunu, 10 yeni test, 563 toplam (2026-04-02)
- Phase 79: source publication supply summary: backend reviewed/used counts, SourcePublicationSupplyBadge, SourcePublicationSupplySummary, Yayın Kaynağı sütunu, 10 yeni test, 553 toplam (2026-04-02)
- Phase 78: news item publication signal summary: pure frontend, NewsItemPublicationSignalBadge, NewsItemPublicationSignalSummary, Yayın Sinyali sütunu, 10 yeni test, 543 toplam (2026-04-02)
- Phase 77: source scan result richness summary: pure frontend, SourceScanResultRichnessBadge, SourceScanResultRichnessSummary, Çıktı Zenginliği sütunu, 10 yeni test, 533 toplam (2026-04-02)
- Phase 76: news item content completeness summary: pure frontend, NewsItemContentCompletenessBadge, NewsItemContentCompletenessSummary, İçerik sütunu, 10 yeni test, 523 toplam (2026-04-02)
- Phase 75: source config coverage summary: pure frontend, SourceConfigCoverageBadge, SourceConfigCoverageSummary, Konfigürasyon sütunu, 10 yeni test, 513 toplam (2026-04-02)
- Phase 74: source linked news summary: linked_news_count backend, SourceLinkedNewsStatusBadge, SourceLinkedNewsSummary, Haberler sütunu, 10 yeni test, 503 toplam (2026-04-02)
- Phase 73: source scan source context summary: source_name/source_status backend lookup, SourceScanSourceStatusBadge, SourceScanSourceSummary, Kaynak sütunu güncellendi, 10 yeni test, 493 toplam (2026-04-02)
- Phase 72: news bulletin source coverage summary: source_count/missing_source backend, NewsBulletinSourceCoverageBadge, NewsBulletinSourceCoverageSummary, Kaynak Kapsamı sütunu, 10 yeni test, 483 toplam (2026-04-02)
- Phase 71: news item scan lineage summary: source_scan_status backend lookup, NewsItemScanLineageBadge, NewsItemScanLineageSummary, Scan Kaynağı sütunu, 10 yeni test, 473 toplam (2026-04-02)
- Phase 70: news item source summary: source_name/source_status backend lookup, NewsItemSourceStatusBadge, NewsItemSourceSummary, Kaynak Özeti sütunu, 10 yeni test, 463 toplam (2026-04-02)
- Phase 69: news bulletin enforcement summary: warning aggregate backend, NewsBulletinEnforcementStatusBadge, NewsBulletinEnforcementSummary, Enforcement sütunu, 10 yeni test, 453 toplam (2026-04-02)
- Phase 68: standard video artifact summary: has_script/has_metadata backend, StandardVideoArtifactStatusBadge, StandardVideoArtifactSummary, Artifact sütunu, 10 yeni test, 443 toplam (2026-04-02)
- Phase 67: job actionability summary frontend: JobActionabilityBadge, JobActionabilitySummary, Aksiyon Özeti sütunu, 10 yeni test, 433 toplam (2026-04-02)
- Phase 66: template style link readiness summary frontend: TemplateStyleLinkReadinessBadge, TemplateStyleLinkReadinessSummary, Bağ Durumu sütunu, 10 yeni test, 423 toplam (2026-04-02)
- Phase 65: style blueprint readiness summary frontend: StyleBlueprintReadinessBadge, StyleBlueprintReadinessSummary, Hazırlık sütunu, 10 yeni test, 413 toplam (2026-04-02)
- Phase 64: source scan execution summary frontend: SourceScanExecutionBadge, SourceScanExecutionSummary, Çalışma Özeti sütunu, 10 yeni test, 403 toplam (2026-04-02)
- Phase 63: standard video readiness summary frontend: StandardVideoReadinessBadge, StandardVideoReadinessSummary, Hazırlık sütunu, 10 yeni test, 393 toplam (2026-04-02)
- Phase 62: used news state summary frontend: UsedNewsStateBadge, UsedNewsStateSummary, Durum sütunu, 10 yeni test, 383 toplam (2026-04-02)
- Phase 61: news item readiness summary frontend: NewsItemReadinessBadge, NewsItemReadinessSummary, Hazırlık sütunu, 10 yeni test, 373 toplam (2026-04-02)
- Phase 60: source readiness summary frontend: SourceReadinessBadge, SourceReadinessSummary, Hazırlık sütunu, 10 yeni test, 363 toplam (2026-04-02)
- Phase 59: template readiness summary frontend: TemplateReadinessBadge, TemplateReadinessSummary, Hazırlık sütunu, 10 yeni test, 353 toplam (2026-04-02)
- Phase 58: template style link summary frontend: style_link_count/primary_link_role, TemplateStyleLinkStatusBadge, TemplateStyleLinkSummary, Style Links sütunu, 10 yeni test, 343 toplam (2026-04-02)
- Phase 57: job context summary frontend: JobContextBadge, JobContextSummary, JobsTable Context sütunu, 10 yeni test, 333 toplam (2026-04-02)
- Phase 56: news bulletin readiness summary frontend: computeReadinessLevel, NewsBulletinReadinessBadge, NewsBulletinReadinessSummary, Hazırlık sütunu, 10 yeni test, 323 toplam (2026-04-02)
- Phase 55: news item usage summary frontend: usage_count/last_usage_type/last_target_module, NewsItemUsageBadge, NewsItemUsageSummary, NewsItemsTable Kullanım sütunu, 10 yeni test, 313 toplam (2026-04-02)
- Phase 54: source scan summary frontend: scan_count/last_scan_status/last_scan_finished_at, SourceScanStatusBadge, SourceScanSummary, SourcesTable Scans sütunu, 10 yeni test, 303 toplam (2026-04-02)
- Phase 1: backend + frontend + renderer iskeleti tamamlandı (2026-04-01)
- Phase 2 panel shell + DB temeli tamamlandı (2026-04-01)
- Phase 3 settings backend: Setting modeli, CRUD API, 17 test (2026-04-01)
- Phase 4 visibility backend: VisibilityRule modeli, CRUD API, 28 backend test (2026-04-01)
- Doküman Türkçeleştirme (2026-04-01)
- Phase 5 settings frontend: API katmanı, React Query hooks, SettingsRegistryPage, 9 frontend test (2026-04-01)
- Phase 6 visibility frontend: API katmanı, React Query hooks, VisibilityRegistryPage, 14 frontend test toplam (2026-04-01)
- Phase 6 integration check: Vite proxy eklendi, endpoint uyumu doğrulandı, curl ile manuel test geçti (2026-04-01)
- Phase 7 jobs backend: Job + JobStep modeli, migration, CRUD API, 8 yeni test, 36 toplam backend test (2026-04-01)
- Phase 8 jobs frontend: API katmanı, hooks, JobsTable, JobDetailPanel, JobStepsList, JobsRegistryPage, 19 toplam frontend test (2026-04-01)
- Phase 9 elapsed/ETA frontend: formatDuration, DurationBadge, jobs UI güncellendi, 28 toplam frontend test (2026-04-01)
- Phase 10 job detail page: JobDetailPage, JobOverviewPanel, JobTimelinePanel, JobSystemPanels, /admin/jobs/:jobId, 33 toplam frontend test (2026-04-01)
- Phase 11 standard video backend: StandardVideo modeli, migration, CRUD API, 8 yeni test, 44 toplam backend test (2026-04-01)
- Phase 12 standard video script backend: StandardVideoScript modeli, script CRUD API, 8 yeni test, 52 toplam backend test (2026-04-01)
- Phase 13 standard video metadata backend: StandardVideoMetadata modeli, metadata CRUD API, 8 yeni test, 60 toplam backend test (2026-04-01)
- Phase 14 standard video admin frontend: API katmanı, hooks, tablo, overview/artifacts panelleri, 11 yeni frontend test, 44 toplam frontend test (2026-04-01)
- Phase 15 standard video create/edit frontend: StandardVideoForm, CreatePage, edit modu, /new route, Yeni butonu, 6 yeni test, 50 toplam frontend test (2026-04-01)
- Phase 16 admin standard video script frontend: StandardVideoScriptPanel, create/update mutation hook'ları, API fonksiyonları, 13 yeni test, 63 toplam frontend test (2026-04-01)
- Phase 17 admin standard video metadata frontend: StandardVideoMetadataPanel, create/update mutation hook'ları, API fonksiyonları, 12 yeni test, 75 toplam frontend test (2026-04-01)
- Phase 18 template engine backend: Template modeli, migration, schemas, service, router, 11 yeni test, 71 toplam backend test (2026-04-02)
- Phase 19 admin templates registry frontend: API katmanı, hooks, TemplatesTable, TemplateDetailPanel, TemplatesRegistryPage, sidebar, 9 yeni test, 84 toplam frontend test (2026-04-02)
- Phase 20 template create/edit form frontend: TemplateForm, TemplateCreatePage, edit mode, useCreateTemplate, useUpdateTemplate, 10 yeni test, 94 toplam frontend test (2026-04-02)
- Phase 21 style blueprint backend: StyleBlueprint modeli, migration, schemas, service, router, 11 yeni test, 82 toplam backend test (2026-04-02)
- Phase 22 admin style blueprints registry frontend: API, hooks, table, detail panel, registry page, sidebar, 9 yeni test, 103 toplam frontend test (2026-04-02)
- Phase 23 news source registry backend: NewsSource modeli, migration, schemas, service, router, 15 yeni test, 97 toplam backend test (2026-04-02)
- Phase 24 admin sources registry frontend: API, hooks, table, detail panel, registry page, sidebar, 9 yeni test, 112 toplam frontend test (2026-04-02)
- Phase 25 admin sources create/edit frontend: SourceForm, SourceCreatePage, edit mode, useCreateSource, useUpdateSource, 9 yeni test, 121 toplam frontend test (2026-04-02)
- Phase 26 source scans backend: SourceScan modeli, migration, schemas, service, router, 14 yeni test, 111 toplam backend test (2026-04-02)
- Phase 27 admin source scans registry frontend: API, hooks, table, detail panel, registry page, sidebar, 9 yeni test, 130 toplam frontend test (2026-04-02)
- Phase 28 news items backend: NewsItem modeli, migration, schemas, service, router, 14 yeni test, 125 toplam backend test (2026-04-02)
- Phase 29 used news registry backend: UsedNewsRegistry modeli, migration, schemas, service, router, 14 yeni test, 139 toplam backend test (2026-04-02)
- Phase 30 news bulletin backend: NewsBulletin modeli, migration, schemas, service, router, 11 yeni test, 150 toplam backend test (2026-04-02)
- Phase 31 admin news bulletin registry frontend: API, hooks, table, detail panel, registry page, sidebar, 9 yeni test, 139 toplam frontend test (2026-04-02)
- Phase 32 admin news bulletin create/edit frontend: useCreateNewsBulletin, useUpdateNewsBulletin, NewsBulletinForm, CreatePage, edit mode, /new route, 8 yeni test, 147 toplam frontend test (2026-04-02)
- Phase 33 news bulletin script backend: NewsBulletinScript modeli, migration, schemas+service+router genişletildi, 9 yeni test, 159 toplam backend test (2026-04-02)
- Phase 34 news bulletin metadata backend: NewsBulletinMetadata modeli, migration, schemas+service+router genişletildi, 7 yeni test, 166 toplam backend test (2026-04-02)
- Phase 35 admin news bulletin script frontend: API genişletildi, useNewsBulletinScript + create/update hooks, NewsBulletinScriptForm, NewsBulletinScriptPanel, DetailPanel güncellendi, 9 yeni test, 156 toplam frontend test (2026-04-02)
- Phase 36 admin news bulletin metadata frontend: API genişletildi, useNewsBulletinMetadata + create/update hooks, NewsBulletinMetadataForm, NewsBulletinMetadataPanel, DetailPanel güncellendi, 11 yeni test, 167 toplam frontend test (2026-04-02)
- Phase 37 news bulletin selected items backend: NewsBulletinSelectedItem modeli, UniqueConstraint, migration, schemas+service+router genişletildi, IntegrityError → 409, 8 yeni test, 174 toplam backend test (2026-04-02)
- Phase 38 admin news bulletin selected items frontend: API genişletildi, useNewsBulletinSelectedItems + create/update hooks, NewsBulletinSelectedItemForm, NewsBulletinSelectedItemsPanel, DetailPanel güncellendi, 11 yeni test, 179 toplam frontend test (2026-04-02)
- Phase 39 admin used news registry frontend: usedNewsApi, useUsedNewsList, useUsedNewsDetail, UsedNewsTable, UsedNewsDetailPanel, UsedNewsRegistryPage, sidebar + route, 8 yeni test, 187 toplam frontend test (2026-04-02)
- Phase 40 admin news items registry frontend: newsItemsApi, useNewsItemsList, useNewsItemDetail, NewsItemsTable, NewsItemDetailPanel, NewsItemsRegistryPage, sidebar + route, 8 yeni test, 195 toplam frontend test (2026-04-02)
- Phase 42 admin style blueprint create/edit frontend: API genişletildi (Create+UpdatePayload, create+update fonksiyonları), useCreateStyleBlueprint, useUpdateStyleBlueprint, StyleBlueprintForm, StyleBlueprintCreatePage, DetailPanel edit modu, /new route, 10 yeni test, 205 toplam frontend test (2026-04-02)
- Phase 43 template↔style blueprint link backend: TemplateStyleLink modeli, UniqueConstraint, migration, schemas+service+router, GET/POST/PATCH /template-style-links, FK 404, duplicate 409, 11 yeni test, 185 toplam backend test (2026-04-02)
- Phase 44 admin template style links registry frontend: templateStyleLinksApi, useTemplateStyleLinksList, useTemplateStyleLinkDetail, TemplateStyleLinksTable, TemplateStyleLinkDetailPanel, TemplateStyleLinksRegistryPage, sidebar + route, 8 yeni test, 213 toplam frontend test (2026-04-02)
- Phase 45 admin template style links create/edit frontend: API genişletildi (Create+UpdatePayload, create+update fonksiyonları), useCreateTemplateStyleLink, useUpdateTemplateStyleLink, TemplateStyleLinkForm, TemplateStyleLinkCreatePage, DetailPanel edit modu, /new route, 10 yeni test, 223 toplam frontend test (2026-04-02)
- Phase 46 admin news items create/edit frontend: newsItemsApi genişletildi, useCreateNewsItem, useUpdateNewsItem, NewsItemForm, NewsItemCreatePage, DetailPanel edit modu, /new route, 10 yeni test, 233 toplam frontend test (2026-04-02)
- Phase 47 admin source scans create/edit frontend: sourceScansApi genişletildi, useCreateSourceScan, useUpdateSourceScan, SourceScanForm, SourceScanCreatePage, DetailPanel edit modu, /new route, 10 yeni test, 243 toplam frontend test (2026-04-02)
- Phase 48 admin used news create/edit frontend: usedNewsApi genişletildi, useCreateUsedNews, useUpdateUsedNews, UsedNewsForm, UsedNewsCreatePage, DetailPanel edit modu, /new route, 10 yeni test, 253 toplam frontend test (2026-04-02)
- Phase 49 news bulletin selected news picker frontend: useNewsItemsPickerList, NewsItemPickerTable, NewsBulletinSelectedNewsPicker, SelectedItemsPanel güncellendi (+picker entegrasyonu), 10 yeni test, 263 toplam frontend test (2026-04-02)
- Phase 50 news bulletin used news enforcement backend: get_used_news_enforcement() helper, NewsBulletinSelectedItemWithEnforcementResponse schema, list/create endpoints enforcement alanları döndürüyor, 10 yeni backend test, 195 toplam backend test (2026-04-02)
- Phase 51 news bulletin used news warning frontend: UsedNewsWarningBadge, UsedNewsWarningDetails, NewsBulletinSelectedItemsPanel uyarı entegrasyonu, frontend tipler güncellendi, 10 yeni frontend test, 273 toplam frontend test (2026-04-02)
- Phase 52 news bulletin artifact summary frontend: has_script/has_metadata backend, NewsBulletinArtifactStatusBadge, NewsBulletinArtifactSummary, registry Artifacts sütunu, 10 yeni frontend test, 283 toplam frontend test, 195 backend test (2026-04-02)
- Phase 53 news bulletin selected news summary frontend: selected_news_count backend, NewsBulletinSelectedNewsCountBadge, NewsBulletinSelectedNewsSummary, registry Haberler sütunu, 10 yeni frontend test, 293 toplam frontend test, 195 backend test (2026-04-02)
- Phase 54 source scan summary frontend: scan_count/last_scan_status/last_scan_finished_at backend, SourceScanStatusBadge, SourceScanSummary, SourcesTable Scans sütunu, 10 yeni frontend test, 303 toplam frontend test, 195 backend test (2026-04-02)

## Mevcut Riskler
- Henüz auth / rol zorlama yok (kasıtlı)
- Node varsayılan shell PATH'inde değil
- Port 8000 başka bir uygulama tarafından kullanılıyorsa dev proxy çalışmaz
- Testlerde React Router v7 future flag uyarısı — kozmetik

## GitHub Yedek Durumu
✓ Aktif. `git@github.com:huskobro/contenthub.git` — main branch upstream ayarlandı ve güncel.
