# PHASE AA — Preview Artifact Pipeline / Visual Review Pack (KAPANIŞ)

**Tarih:** 2026-04-16
**Revizyon:** `phase_aa_001` (yeni modül: `app/previews/`; schema/migration değişikliği YOK)
**Kapsam:** 10 alt faz (A–J) — discovery, classifier contract, service/router,
modül alignment, frontend surfaces, test, docs, git.

---

## 1. Sonuç Özeti

- ✅ Yeni büyük altyapı KURULMADI. Mevcut `ArtifactScope.{PREVIEW,FINAL}` +
  `workspace/{job_id}/artifacts/` kontratı üzerine ince bir classifier + service
  + router + frontend katmanı oturdu.
- ✅ Ownership / auth / security PHASE X seviyesinde aynen korundu — preview
  endpoint'leri `jobs/router._enforce_job_ownership` ile bire bir aynı kural seti.
- ✅ Hiç `skip`, `xfail`, sessiz bypass, parallel pattern eklenmedi.
- ✅ Download yolu için paralel endpoint KURULMADI — preview dosyaları mevcut
  `/api/v1/jobs/{id}/artifacts/{path}` endpoint'inden iner.
- ✅ Preview ↔ final sınırı çok net: deterministik filename classifier + scope
  badge + "Bu dosya yalnizca bir onizlemedir — nihai cikti degildir" uyarısı.
- ✅ news_bulletin için preview aşaması YOK — honest gap olarak belgelendi;
  fake preview üretilmedi.
- ✅ Full suite: **2343 passed, 0 failed** (PHASE Z baseline 2274 → +69 PHASE AA).
- ✅ Yeni kontrat belgesi: `docs/preview-artifact-contract.md`.

---

## 2. Alt Fazlar — Teslim Durumu

| Alt Faz | Başlık                                    | Durum | Delivery                                         |
| ------- | ----------------------------------------- | ----- | ------------------------------------------------ |
| A       | Discovery + contract audit                | ✅    | `ArtifactScope`/`Kind`/`Layout` kontratları mevcut; flat `artifacts/` aktif; classifier YOKTU. |
| B       | Preview contract hardening                | ✅    | `app/previews/classifier.py` + `service.py`      |
| C       | Backend preview service hardening         | ✅    | Workspace resolution jobs/router ile eşitlendi; hidden filter; scope filter; latest mtime. |
| D       | standard_video alignment                  | ✅    | `render_still` → `preview_frame.jpg` classifier ile doğrulandı. |
| E       | news_bulletin honest gap                  | ✅    | Preview aşaması yok — `preview-artifact-contract.md` §6.3 belgeledi. |
| F       | product_review alignment                  | ✅    | `preview_mini.mp4` + `preview_mini.json` classifier ile doğrulandı. |
| G       | Frontend preview surfaces                 | ✅    | `previewsApi.ts`, `useJobPreviews`, `JobPreviewCard`, `JobPreviewList`, `JobDetailPage` + `ProjectDetailPage` entegrasyonu. |
| H       | Tests (+preview smoke pack)               | ✅    | 69 yeni test (28 classifier + 17 service + 14 router + parallel-serve regression). |
| I       | Docs                                      | ✅    | `phase-aa-closure.md` + `preview-artifact-contract.md` + STATUS/CHANGELOG head. |
| J       | Git discipline                            | ✅    | 3 commit (backend+tests / frontend / docs) + push. |

---

## 3. Backend Değişiklikleri

### 3.1 Yeni modül: `backend/app/previews/`

- `classifier.py` — 8 PREVIEW + 7 FINAL kuralı, hidden filter, longest-prefix
  stem-step/label map.
- `service.py` — workspace resolver (`workspace_path > default root`),
  `list_job_artifacts_classified(job, scope_filter=None)`, `latest_preview(job)`.
- `router.py` — `APIRouter(prefix="/jobs", tags=["previews"])`:
  - `GET /{job_id}/previews`
  - `GET /{job_id}/previews?scope=preview|final`
  - `GET /{job_id}/previews/latest`
- `__init__.py` — modül docstring'i ve intent.

### 3.2 Registration

- `backend/app/api/router.py` → `api_router.include_router(previews_router)`
  (jobs_router'dan hemen sonra — ownership kontratı aynı).

### 3.3 Schema / Migration

- Hiç yeni tablo / kolon yok. Mevcut `Job.workspace_path` + `artifacts/` klasörü
  aynen kullanıldı.

---

## 4. Frontend Değişiklikleri

- `frontend/src/api/previewsApi.ts` — typed fetch client.
- `frontend/src/hooks/useJobPreviews.ts` — `useJobPreviews(jobId, scope?)`,
  `useLatestJobPreview(jobId)`.
- `frontend/src/components/preview/JobPreviewCard.tsx` — scope badge, MediaPreview
  delegasyonu (video/image/audio/json/text), size/mtime/label/source_step/kind
  metadata, download linki.
- `frontend/src/components/preview/JobPreviewList.tsx` — grouped liste
  ("Onizlemeler" + "Nihai Ciktilar"), empty/error/loading states, toplam sayaç.
- `frontend/src/pages/admin/JobDetailPage.tsx` — `<JobPreviewList jobId={...}>`
  "Ciktilar" bölümünden sonra.
- `frontend/src/pages/user/ProjectDetailPage.tsx` — projenin en son iş'i için
  compact preview listesi (Genel tab).

TypeScript: `npx tsc --noEmit` → **EXIT 0**.

---

## 5. Code Fix vs New Feature Ayrımı

| Kategori      | Değişiklik                                                                                               |
| ------------- | -------------------------------------------------------------------------------------------------------- |
| **Yeni feature** | `app/previews/*`, `/api/v1/jobs/{id}/previews[*]` endpoint'leri, frontend preview surface components. |
| **Code fix**  | `backend/app/api/router.py` previews_router registration (tek satir feature-hookup, davranış değişikliği yok). |
| **Doc**       | STATUS/CHANGELOG head + `phase-aa-closure.md` + `preview-artifact-contract.md`.                          |
| **Düzeltilmedi (amaç dışı)** | Executor'lar hala flat `artifacts/` yazar. Parallel bir `preview/` alt dizini KURULMADI — classifier bu kontratı zaten çözüyor. |

---

## 6. Testler

### 6.1 Yeni test dosyaları

| Dosya                                            | Test sayısı | Kapsam                                                          |
| ------------------------------------------------ | ----------- | --------------------------------------------------------------- |
| `tests/test_phase_aa_preview_classifier.py`      | 28          | Filename rules, hidden, preview/final kural setleri, scope invariant. |
| `tests/test_phase_aa_preview_service.py`         | 17          | Workspace resolution, hidden filter, scope filter, latest mtime, missing/empty. |
| `tests/test_phase_aa_preview_router.py`          | 14          | Ownership (cross-user 403, orphan 403/200, admin bypass), 404/422, scope filter, parallel-serve-yok regression. |
| **Toplam**                                       | **69**      |                                                                 |

### 6.2 Kritik invariants

- `test_preview_files_never_get_final_scope` — `preview_*` dosyası asla FINAL
  olmaz.
- `test_final_files_never_get_preview_scope` — FINAL dosyası asla PREVIEW olmaz.
- `test_hidden_files_not_listed` — `tmp_*`, `.dotfile`, `_partial`, `*.tmp`,
  `*.part` gizli kalır.
- `test_user_cannot_see_other_users_job_previews` — ownership enforcement.
- `test_orphan_job_403_for_non_admin` — orphan job kuralı.
- `test_admin_can_see_orphan_job_previews` — admin bypass.
- `test_preview_download_uses_existing_artifacts_endpoint` — parallel serve yok.

### 6.3 Test sonucu

```
backend/tests — pytest -q
2343 passed, 1 warning in 85.64s
```

Warning: 1 non-blocker (`test_m2_c6_dispatcher_integration.py` background coroutine
— PHASE Z'de zaten envanterde, PHASE AA kapsam dışı).

---

## 7. Kalan Sınırlamalar (Honest)

1. **news_bulletin preview aşaması yok.** Script / metadata FINAL olarak kalır.
   Fake preview inject etmedik. Gelecek bir faz gerçek preview üretici ekleyince
   classifier zaten yakalar.
2. **Preview thumbnail sürüm eşlemesi yok.** Style blueprint version pinning PHASE
   AA kapsamında değil.
3. **Preview üretim telemetrisi yok** (süre, başarısızlık oranı). Analytics pack
   işi.
4. **SSE invalidate yok.** Preview listesi React Query staleTime=10s ile yenilenir;
   real-time push entegrasyonu gelecek işlerden.
5. **Frontend'de preview için dedike klavye kontrolleri yok** (VideoPlayer zaten
   mevcut; keyboard controls onunla geliyor).

---

## 8. Kural İhlali Kontrolü

| Kural                                                   | Durum |
| ------------------------------------------------------- | ----- |
| Ownership/auth/security zayıflatma yok                  | ✅    |
| PHASE X/Y/Z davranışı bozma yok                         | ✅    |
| Skip/xfail/sessiz ignore yok                            | ✅    |
| Gizli bypass yok                                        | ✅    |
| Parallel pattern yok                                    | ✅    |
| Mevcut job/artifact/workspace mimarisi reuse edildi     | ✅    |
| Preview/final sınırı çok net                            | ✅    |
| Preview dosyaları final artifact gibi davranmıyor       | ✅    |
| Docs/test/report disiplini korundu                      | ✅    |

---

## 9. Git

3 commit:

1. **Backend + tests** — `app/previews/*`, `app/api/router.py` registration, 3 test dosyası.
2. **Frontend** — `api/previewsApi.ts`, `hooks/useJobPreviews.ts`,
   `components/preview/{JobPreviewCard,JobPreviewList}.tsx`, JobDetailPage +
   ProjectDetailPage entegrasyonu.
3. **Docs** — `docs/phase-aa-closure.md`, `docs/preview-artifact-contract.md`,
   STATUS/CHANGELOG head.

Push: `origin/main`.

(Commit hash'leri git geçmişinden okunabilir.)

---

## 10. Sonraki Adım Önerileri

- news_bulletin için gerçek bir `preview_news_selected.json` üretici
  (classifier hazır, sadece executor eklenecek).
- Style Blueprint sürümü ile preview artifact arasında `decision_trail` bağlantısı.
- Preview üretim süresi metriği (operations analytics).
- SSE üzerinden preview artifact eklendiğinde React Query cache invalidation.
