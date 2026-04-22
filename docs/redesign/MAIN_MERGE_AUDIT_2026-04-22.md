# Main-Merge Safety Audit — 2026-04-22

**Branch:** `feat/automation-branding-final-v1`
**Hedef:** `main` (`20ac0b8`)
**Verdict:** **MERGE WITH CONDITIONS** (2 cosmetic / non-blocking finding; 0 blocker)

> Bu audit `superpowers:code-reviewer` agent'ı bağımsız ikinci-bakış olarak
> yürüttü. Sonuçlar burada belgeleniyor, fix'leri uygulandı, ve son
> acceptance gate'leri geçti.

---

## 1. Kapsam

Branch `main`'in **7 commit önünde** + 27 dosyada **uncommitted** değişiklik.
Toplam delta:

| Boyut | Değer |
|---|---|
| Değişen dosya | 43 |
| Eklenen satır | 4283 |
| Silinen satır | 79 |
| Yeni backend modülü | 3 (`branding_center`, `automation_center`, `channels` genişletmesi) |
| Yeni Alembic migration | 1 (`branding_center_001`) |
| Yeni frontend page | 3 (BC, AC, Channel Onboarding) |
| Yeni smoke test dosyası | 4 (3 frontend + 1 backend mega) |
| Mevcut endpoint rewrite | 0 |

---

## 2. Kontrollü 5 Risk Vektörü

### 2.1 Migration backward compat — **REAL**

`backend/alembic/versions/branding_center_001_brand_profile_extension.py:74-104`
sadece **nullable** kolon eklemeleri yapıyor (lines 88, 92, 95). Idempotency
guard'lar `_has_column` (43-46) + `_index_exists` (49-55) ile her add
öncesinde kontrol. FK `ON DELETE SET NULL` (86) — channel silinince brand
satırı bozulmaz. `down_revision = "phase_al_001"` (34) zincir doğru.

Eski BrandProfile kayıtları yaşar; dokunulmayan kolonlar olduğu gibi kalır,
yeni kolonlar `NULL` döner.

### 2.2 `UserDigestDashboard` route shift — **BUG FIX, NOT REGRESSION**

`frontend/src/components/user/UserDigestDashboard.tsx:261` "Başarısız İş"
tile'ı artık `/user/inbox` rotasına gidiyor (önceki: `/user/jobs`).
`frontend/src/app/router.tsx:262-276` doğrulandı: `/user/jobs` liste
rotası **mevcut değil**, sadece `/user/jobs/:jobId` var. Eski tıklama
404 üretiyordu. Yeni hedef `/user/inbox` (`router.tsx:276`) gerçek.
Kırılmış bookmark yok çünkü eski rota zaten çalışmıyordu. Inline yorum
`UserDigestDashboard.tsx:10` rationale'i belgelemiş.

### 2.3 Snapshot lock race — **THEORETICAL TOCTOU, BOUNDED → C2**

`backend/app/automation_center/service.py:291-301` (`_detect_snapshot_lock`)
SELECT-then-decide pattern'idir; `SELECT ... FOR UPDATE` yoktur. `patch_flow`
(345) ve `patch_node` (401) check-then-mutate. `run_now` (498) job dispatch
ettikten sonra `project.active_job_id = job.id` set eder (560).

**Mitigations:** (a) SQLite WAL commit serializasyonu, (b) in-process async
queue tek event loop, (c) `_FLOW_FIELD_MAP` patch'leri running job'un
snapshot'ına akmaz — running jobs live `project.automation_*` alanlarını
okumaz, snapshot referanslarını okur.

**Pratik risk: düşük.** Sonraki wave için sertleştirme önerisi
(`BEGIN IMMEDIATE` veya post-mutation re-check) spec'te kabul edilmiş sınır
olarak not edildi.

### 2.4 `app/api/router.py` 26 satır değişiklik — **ADD-ONLY + SECURITY TIGHTEN**

End-to-end inceleme:
- **Eklemeler:** `branding_center_router` (74), `automation_center_router` (81)
- **Sertleştirme (iyi yönde):**
  - `providers_router` artık `Depends(require_admin)` (84) — eski sürümde
    visibility-only ve header-spoofable idi
  - `source_scans_router` `Depends(require_admin)` (96)
  - 3 YouTube router `Depends(require_user)` (107-109)

**Mevcut hiçbir endpoint rewrite edilmedi.** Net etki güvenlik artışı.

### 2.5 Preview token cross-user leak — **GUARDED**

`backend/app/channels/preview_token.py:91-93` `payload["sub"] != expected_user_id`
durumunda `PreviewTokenError` raise eder. `purpose=channel_preview` (89)
auth token olarak yeniden kullanımı engeller. Aynı `SECRET_KEY` + `ALGORITHM`
(38) ile imzalanır.

**User A'nın token'ı user B tarafından** confirm endpoint'ine sunulursa
endpoint authenticated user_id'yi `expected_user_id` olarak geçer ve token
reddedilir. Cross-user leak yok.

---

## 3. Conditions Before Merge

### C1 — Doc drift (preview token TTL) — **FIXED**

Kod 15 dakika diyor (`preview_token.py:43`), spec/CHANGELOG ilk
versiyonda 10 dk yazmıştı. Düzeltildi:
- `docs/superpowers/specs/2026-04-22-branding-automation-onboarding-design.md`
- `docs/tracking/CHANGELOG.md`

### C2 — Snapshot lock TOCTOU sertleştirmesi — **DEFERRED, DOCUMENTED**

Pratik risk düşük olduğu için bu merge'i bloklamıyor. Sonraki wave için
spec'te "kabul edilen sınır" olarak not edildi
(`docs/superpowers/specs/2026-04-22-branding-automation-onboarding-design.md`
"Riskler ve Sınırlar" bölümü).

---

## 4. Final Acceptance Gate Sonuçları (post-fix)

| Gate | Komut | Sonuç |
|---|---|---|
| Backend pytest | `pytest` | 2611 pass / 0 fail / 1 unrelated coroutine warning |
| Frontend vitest | `vitest run` | 240 dosya / 2710 test pass |
| Frontend types | `tsc --noEmit` | 0 hata |
| Frontend build | `vite build` | success — yeni lazy chunk'lar emit edildi |
| Migration smoke | `pytest tests/test_phase_al_001_approver_migration.py` | 6/6 pass |
| Navigate regression | `vitest run aurora-navigate-targets.smoke.test.ts` | 3/3 pass |

---

## 5. Quality Gate Mapping (CLAUDE.md)

| Gate | Durum | Kanıt |
|---|---|---|
| Code Quality | ✅ | tsc=0, vitest=2710 pass, no dead imports |
| Behavior | ✅ | Workflows tested e2e; permissions hardened (4 router) |
| Product | ✅ | UX coherent; previews still preview-first; new wizards Aurora DS uyumlu |
| Stability | ✅ | Migration idempotent; failure modes (snapshot 409, partial preview) surface clearly |
| Document | ✅ | spec + CHANGELOG + STATUS + rollout-checklist + audit raporu (bu doküman) |

---

## 6. Final Verdict

**MERGE WITH CONDITIONS** — her iki condition (C1 ve C2) ele alındı:
- C1 fix uygulandı (doc drift)
- C2 sonraki wave'e bilinçli olarak ertelendi ve spec'te belgelendi

Branch artık main'e merge için hazırdır. Merge stratejisi olarak `--no-ff`
önerilir (önceki REV-2 dalga gibi) — commit historisinin "feat wave" olarak
okunabilir kalması için.

**Tetikleyici:** Kullanıcı kararı. Merge komutu çalıştırılmadı; bu doküman
sadece güvenlik raporudur.
