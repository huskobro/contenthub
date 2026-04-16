# PHASE AB — News Bulletin Real Preview Pack (KAPANIŞ)

**Tarih:** 2026-04-16
**Revizyon:** `phase_ab_001` (news_bulletin executor'larına gerçek preview
yazımı; classifier/service/router/frontend değişikliği YOK)
**Kapsam:** 10 alt faz (A–J) — discovery, strategy, executor wiring,
classifier check, service/router compat, frontend compat, honest state,
test, docs, git.

**Ana hedef:** PHASE AA'da belgelenen `news_bulletin` honest gap'ini
**fake preview üretmeden** kapatmak.

---

## 1. Sonuç Özeti

- ✅ `news_bulletin` artık üç **gerçek** preview artifact'i üretir:
  `preview_news_selected.json`, `preview_script.json`, `preview_metadata.json`.
- ✅ Hiç fake/placeholder preview dosyası yok — üretim yalnızca gerçek
  upstream veri varsa yapılır.
- ✅ Classifier değişikliği YOK — `_PREVIEW_STEP_MAP` zaten AA'da bu
  stem'leri içeriyordu.
- ✅ Yeni endpoint YOK — mevcut `/api/v1/jobs/{id}/previews` news_bulletin
  preview'larını otomatik yakalar (classifier filename tabanlı).
- ✅ Yeni frontend component YOK — `JobPreviewCard`/`JobPreviewList`
  MediaPreview delegasyonu JSON preview'larını doğal olarak gösterir.
- ✅ Ownership/auth/security davranışı değişmedi — PHASE X kuralı aynen.
- ✅ Preview yazımı best-effort: yazım hatası step'i durdurmaz, fake
  placeholder da oluşturmaz.
- ✅ Hiç `skip`, `xfail`, silent bypass, parallel pattern eklenmedi.
- ✅ Full suite: **2358 passed, 0 failed** (PHASE AA baseline 2343 → +15
  PHASE AB test'i).
- ✅ Preview-artifact-contract §6.3 güncellendi: gap kapandı.

---

## 2. Alt Fazlar — Teslim Durumu

| Alt Faz | Başlık                                   | Durum | Delivery                                                                          |
| ------- | ---------------------------------------- | ----- | --------------------------------------------------------------------------------- |
| A       | Discovery + contract fit check           | ✅    | `script.py`/`metadata.py`/`composition.py` tarandı; honest üretim noktaları belirlendi. |
| B       | Preview strategy (real only, no fake)    | ✅    | 3 preview: `news_selected` (entry), `script` (post-final-write), `metadata` (post-final-write). Frame preview bilinçli olarak deferred. |
| C       | Backend preview production in executors  | ✅    | `_write_preview_artifact` helper + `BulletinScriptExecutor` 2 yazım + `BulletinMetadataExecutor` 1 yazım. |
| D       | Classifier/contract extension            | ✅    | Gerek yok — `_PREVIEW_STEP_MAP` zaten `preview_news_selected`/`preview_script`/`preview_metadata` içeriyor. |
| E       | Service/router compat check              | ✅    | Mevcut `/api/v1/jobs/{id}/previews` news_bulletin preview'larını otomatik listeler. Yeni endpoint yok. |
| F       | Frontend surface compat check            | ✅    | `JobPreviewCard`/`JobPreviewList` JSON preview'larını MediaPreview ile gösterir. Yeni component yok. |
| G       | Honest state handling                    | ✅    | Selected items boş → hiç preview. LLM fail → final yok → preview yok. Yazım fail → warn + None; fake placeholder yok. |
| H       | Tests (+phase_ab preview smoke pack)     | ✅    | 15 yeni test — 4 classifier, 4 helper, 4 script executor, 2 metadata executor, 1 router smoke. |
| I       | Docs                                     | ✅    | `preview-artifact-contract.md` §6.3 güncellendi + `phase-ab-closure.md` + STATUS/CHANGELOG head. |
| J       | Git discipline                           | ✅    | 3 commit (backend+tests / (boş FE — Ø commit) / docs) + push. |

---

## 3. Backend Değişiklikleri

### 3.1 `backend/app/modules/news_bulletin/executors/_helpers.py`

Yeni helper eklendi:

- `_write_preview_artifact(workspace_root, job_id, filename, data) -> Optional[str]`
  - Prefix guard: `filename` `preview_` ile başlamalı; aksi halde hata
    log'u + `None`.
  - `generated_at` alanını otomatik inject eder (ISO 8601 UTC). Caller
    set etmişse korur.
  - `_write_artifact` ile aynı yol kullanır (flat `artifacts/` dizini,
    parallel dizin yok).
  - İstisnayı bastırır + warn log + `None` döner → preview yazımı
    asla step'i başarısız yapmaz.

### 3.2 `backend/app/modules/news_bulletin/executors/script.py`

`BulletinScriptExecutor.execute()` içinde:

1. **Selected items guard'ından HEMEN SONRA** (LLM öncesi):
   `preview_news_selected.json` yazımı.
   Payload: `{step, bulletin_id, language, item_count, items[], generated_at}`.
   `items` her öğe için: `item_number, headline, summary (trunc 280),
   category, source_name, source_id, published_at, url,
   has_edited_narration`.

2. **`bulletin_script.json` FINAL yazımından HEMEN SONRA** (LLM başarılı
   tamamlandıktan sonra):
   `preview_script.json` yazımı.
   Payload: `{step, bulletin_id, language, title, item_count,
   headlines[], warnings, used_assembly_engine, generated_at}`.
   `headlines` her öğe için: `item_number, headline (trunc 180),
   narration_preview (trunc 240), duration_seconds, category`.

Her iki yazım try/except ile sarılı — `StepExecutionError` fırlatma hiç
bir preview nedeniyle oluşmaz.

### 3.3 `backend/app/modules/news_bulletin/executors/metadata.py`

`BulletinMetadataExecutor.execute()` içinde:

- **`metadata.json` FINAL yazımından HEMEN SONRA**:
  `preview_metadata.json` yazımı.
  Payload: `{step, bulletin_id, language, title, description_preview
  (trunc 500), description_truncated, tags (ilk 20), category, tone,
  publish_description_meta, generated_at}`.

try/except ile sarılı — best-effort.

### 3.4 Schema / Migration

Hiç yeni tablo / kolon / migration yok.

### 3.5 Classifier / Service / Router / Frontend

**Dokunulmadı.** AA'da kurulan altyapı news_bulletin preview'larını
filename tabanlı otomatik yakalar.

---

## 4. Frontend Değişiklikleri

**Yok.** PHASE AA'daki `previewsApi.ts`, `useJobPreviews`, `JobPreviewCard`,
`JobPreviewList` bileşenleri news_bulletin preview JSON dosyalarını doğal
olarak:
- Admin `JobDetailPage` içinde "Onizlemeler" grubunda listeler,
- User `ProjectDetailPage` içinde son iş için compact gösterir,
- MediaPreview JSON routing'i ile raw JSON'u admin/user için okunabilir
  sunar,
- Scope badge "Onizleme" olarak işaretler,
- "Bu dosya yalnizca bir onizlemedir — nihai cikti degildir." uyarısını
  gösterir.

TypeScript / build doğrulaması: AA'da `EXIT 0`, AB'de FE dokunulmadığı
için re-check gereksiz. (Doğrulanmak istenirse `npx tsc --noEmit`.)

---

## 5. Code Fix vs New Feature Ayrımı

| Kategori         | Değişiklik                                                                             |
| ---------------- | -------------------------------------------------------------------------------------- |
| **Yeni feature** | `_write_preview_artifact` helper + 3 gerçek preview üreticisi (script×2, metadata×1). |
| **Code fix**     | Yok — yalnızca executor'lara yeni yan etki eklendi; mevcut mantık değişmedi. |
| **Doc**          | `preview-artifact-contract.md` §6.3 güncellendi + `phase-ab-closure.md` + STATUS/CHANGELOG head. |
| **Düzeltilmedi** | Frame preview (`preview_bulletin_frame.jpg`) — gerçek render gerektirir; honest deferred. |

---

## 6. Testler

### 6.1 Yeni test dosyası

| Dosya                                                  | Test | Kapsam                                                                                                    |
| ------------------------------------------------------ | ---- | --------------------------------------------------------------------------------------------------------- |
| `tests/test_phase_ab_news_bulletin_preview.py`         | 15   | Classifier (4) + `_write_preview_artifact` helper (4) + script executor (4) + metadata executor (2) + router smoke (1). |
| **Toplam**                                             | **15** |                                                                                                           |

### 6.2 Kritik invariants (bu fazda kilitlenen)

- `test_classify_preview_news_selected_json` — `preview_news_selected.json`
  → PREVIEW / METADATA / `source_step=news_selected` / label=
  `Selected items preview`.
- `test_classify_preview_script_json` — `preview_script.json`
  → PREVIEW / METADATA / `source_step=script`.
- `test_classify_preview_metadata_json` — `preview_metadata.json`
  → PREVIEW / METADATA / `source_step=metadata`.
- `test_preview_news_keys_never_final_scope` — üç news_bulletin preview
  key'i hiç bir zaman FINAL scope'a düşmez.
- `test_write_preview_artifact_rejects_non_preview_prefix` —
  `_write_preview_artifact("foo.json")` dosya yazmaz, `None` döner.
- `test_write_preview_artifact_injects_generated_at` — çağıran `generated_at`
  vermediğinde otomatik eklenir (ISO 8601).
- `test_write_preview_artifact_preserves_existing_generated_at` — caller
  sağlarsa clobbered edilmez.
- `test_script_executor_writes_preview_news_selected` — happy path
  sonrası dosya var, shape doğru, classifier PREVIEW diyor.
- `test_script_executor_writes_preview_script_json` — happy path
  sonrası `preview_script.json` var, `step="script"`, headlines count
  doğru.
- `test_script_executor_preview_script_not_written_on_llm_failure` —
  LLM fırlatırsa `preview_script.json` yok; ama `preview_news_selected.json`
  var (dürüst: seçim gerçekten olmuştu, LLM sonrası oluşturulmadı).
- `test_script_executor_no_preview_when_selected_items_empty` — boş
  seçim → StepExecutionError; HİÇBİR preview dosyası yazılmaz.
- `test_metadata_executor_writes_preview_metadata` — happy path sonrası
  dosya var, `description_truncated` flag'i doğru.
- `test_metadata_executor_preview_metadata_not_written_on_llm_failure`
  — LLM fırlatırsa preview yok.
- `test_news_bulletin_previews_listed_via_existing_endpoint` — mevcut
  `/api/v1/jobs/{id}/previews?scope=preview` endpoint'i
  `preview_news_selected.json`, `preview_script.json`,
  `preview_metadata.json` dosyalarını aynı job için doğru shape'te
  listeler. Parallel endpoint yok.

### 6.3 Test sonucu

```
backend/tests — pytest -q
2358 passed, (warnings ~ pre-existing aiosqlite teardown) in 86.56s
```

PHASE AA baseline 2343 → +15 = 2358. Zero failure, zero skip, zero
xfail.

---

## 7. Kalan Sınırlamalar (Honest)

1. **Frame preview (`preview_bulletin_frame.jpg`) YOK.** Composition
   step Remotion render yapmaz; gerçek kare için tam render şart.
   Honest olmayan bir placeholder üretmek yerine gelecek bir faza
   bırakıldı.
2. **Preview üretim telemetrisi yok** (süre, başarısızlık oranı).
   Analytics pack işi.
3. **SSE invalidate yok** — preview listesi React Query
   staleTime=10s ile yenilenir.
4. **Style blueprint version pinning preview'lara yansımaz** — PHASE AA
   limit'i; AB skope'u değil.
5. **Subtitle / composition preview'ları henüz yok** — composition
   preview için composition_props zaten FINAL olarak var; parallel
   dilim üretmeme kararı bilinçli. Subtitle preview de gelecek faz
   işi.

---

## 8. Kural İhlali Kontrolü

| Kural                                                   | Durum |
| ------------------------------------------------------- | ----- |
| Ownership/auth/security zayıflatma yok                  | ✅    |
| PHASE X/Y/Z/AA davranışı bozma yok                      | ✅    |
| Skip/xfail/sessiz ignore yok                            | ✅    |
| Gizli bypass yok                                        | ✅    |
| Parallel pattern yok                                    | ✅    |
| Mevcut job/artifact/workspace mimarisi reuse edildi     | ✅    |
| Preview/final sınırı çok net                            | ✅    |
| Preview dosyaları final artifact gibi davranmıyor       | ✅    |
| Fake/placeholder preview yok                            | ✅    |
| Upstream veri yoksa preview de yok (honest missing)     | ✅    |
| Docs/test/report disiplini korundu                      | ✅    |

---

## 9. Git

3 commit:

1. **Backend + tests** — `_helpers.py` (helper) + `script.py` (2
   preview yazımı) + `metadata.py` (1 preview yazımı) + 15 test
   (`test_phase_ab_news_bulletin_preview.py`).
2. **Frontend** — Ø değişiklik (skip — AA surface'ı yeterli).
3. **Docs** — `preview-artifact-contract.md` §6.3 güncellemesi +
   `phase-ab-closure.md` + STATUS/CHANGELOG head.

Push: `origin/main`.

(Commit hash'leri git geçmişinden okunabilir; `git log --oneline -5`
komutuyla doğrulanabilir.)

---

## 10. Sonraki Adım Önerileri

- Frame preview için gerçek `render_still` veya `preview_mini` adımı
  eklemek (honestly produced; classifier zaten hazır).
- Subtitle preview (`preview_subtitle.srt` veya `.json`) — subtitle
  step sonrası kısa bir dilim.
- Preview üretim süresi metriği (operations analytics).
- SSE üzerinden preview artifact eklendiğinde React Query cache
  invalidation.
- news_bulletin decision_trail bağlantısı — preview artifact ile
  hangi selected_items, hangi script warnings, hangi dominant_category
  karar izlenebilir hale.
