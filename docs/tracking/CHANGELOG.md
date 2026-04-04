# DEĞİŞİKLİK GEÇMİŞİ

---

## [2026-04-04] M8-C1 — Analytics Backend + Platform Overview

### Özet
Analytics subsystem foundation. Mevcut tablolardan (jobs, job_steps, publish_records)
salt okunur aggregation. Şema değişikliği yok, migration yok, yazma yok.

### Yeni dosyalar
- `backend/app/analytics/__init__.py`
- `backend/app/analytics/service.py` — aggregation sorguları
- `backend/app/analytics/schemas.py` — OverviewMetrics + OperationsMetrics + StepStat
- `backend/app/analytics/router.py` — GET /overview + GET /operations
- `backend/tests/test_m8_c1_analytics_backend.py` — 24 test (A–X)

### Değiştirilen dosyalar
- `backend/app/api/router.py` — analytics_router kaydedildi

### Endpoint'ler
- `GET /api/v1/analytics/overview` — platform genel metrikleri; window filtresi
- `GET /api/v1/analytics/operations` — step süresi, render ortalaması; window filtresi

### Desteklenen metrikler
- total_job_count, completed_job_count, failed_job_count, job_success_rate
- total_publish_count, published_count, failed_publish_count, publish_success_rate
- avg_production_duration_seconds (job started_at → finished_at)
- retry_rate (retry_count > 0 olan job oranı)
- avg_render_duration_seconds (render step elapsed_seconds ortalaması)
- step_stats: her step_key için count, avg_elapsed_seconds, failed_count

### Desteklenmeyen metrikler (M8-C1)
- provider_error_rate: provider_trace_json yapısı sabitlenmedi; güvenilir kaynak yok.
  Her iki endpoint'te None döner. M8-C2 veya Hardening fazında ele alınacak.

### Korunan sınırlar
- Yalnızca SELECT; publish_service / job_service çağrılmadı
- Şema / migration değişikliği yok
- Tüm metrik kaynakları deterministic ve belgelenmiş

### Test kapsamı (A–X)
- A: dönüş yapısı şeması doğrulama
- B–C: completed/failed job sayımı
- D: job_success_rate aralık kontrolü
- E: retry_rate hesaplama
- F: avg_production_duration hesaplama
- G: publish_records sayımı
- H: publish_success_rate
- I: window=last_7d eski kayıtları dışlar
- J: window=all_time tüm zamanlar
- K: operations boş durum yapısı
- L: render step ortalama süresi
- M: step_stats step_key'leri
- N: step_stats failed_count
- O: provider_error_rate=None (unsupported)
- P: operations window filtresi
- Q–U: route smoke testleri (overview/operations, window param, 400 bad window)
- V: _cutoff geçersiz window ValueError
- W–X: sıfır bölme koruması (retry_rate, job_success_rate)

### Test sonuçları
24/24 M8-C1 + 979/979 full suite, 0 regression.
Warnings: 3 kategori, 1–7 non-deterministic (bkz. Known Warnings backlog).

---

## [2026-04-04] M7-C4 — Publish Hub Routes + Retry + Review Reset

### Özet
Publish Center REST katmanı tamamlandı. Retry (failed → publishing) ve artifact değişikliği
sonrası review gate sıfırlama mekanizmaları implement edildi. 12 endpoint için kapsamlı
route smoke testleri yazıldı.

### Yeni dosyalar
- `backend/tests/test_m7_c4_publish_hub_routes.py` — 24 test (A–X)

### Değiştirilen dosyalar
- `backend/app/publish/service.py` — `retry_publish()` + `reset_review_for_artifact_change()` eklendi
- `backend/app/publish/schemas.py` — `RetryPublishRequest` + `ArtifactChangedRequest` eklendi
- `backend/app/publish/router.py` — `POST /retry` + `POST /reset-review` endpoint'leri eklendi; deprecation uyarısı giderildi
- `backend/app/publish/state_machine.py` — approved + scheduled → pending_review geçişi eklendi (artifact reset path)

### Yeni endpoint'ler
- `POST /api/v1/publish/{id}/retry` — failed → publishing; publish gate korunur; platform_video_id korunur
- `POST /api/v1/publish/{id}/reset-review` — artifact değişikliği; approved/scheduled → pending_review; diğer durumlar noop

### Korunan boundary'ler
- publish log yazımı: `append_platform_event()` tek resmi yol — retry/reset-review endpoint'leri bu sınırı bozmadı
- publish step 7. adım: yeni testler 6-step varsayımı getirmedi
- review gate (Tier A): bypass yolu açılmadı; reset-review yalnızca approved/scheduled durumunu geri alır

### Test kapsamı (A–X)
- A: POST /publish/ → 201 draft
- B: bilinmeyen job_id → 4xx/5xx
- C–D: GET listeleme + filtre
- E–F: GET detay + 404
- G–H: GET logs + 404
- I–J: submit → pending_review + 404
- K–L: review approve + gate 422
- M: schedule
- N–O: trigger approved + gate 422 (draft)
- P–Q: cancel + terminal 409
- R: reset-to-draft
- S: retry failed → publishing (attempt_count artar)
- T: retry non-failed → 422
- U: reset-review approved → pending_review
- V: reset-review draft → noop 200
- W: retry korunan platform_video_id (partial failure semantiği)
- X: reset-review reviewer alanları sıfırlama

### Test sonuçları
24/24 M7-C4 + 955/955 full suite, 0 regression.
**Warnings: 3 kategori, 1–7 toplam (non-deterministic; sayı her run'da değişir).**
- **W-01** `RuntimeWarning: coroutine '_run_pipeline' was never awaited` — mock/async; her run'da 1 kez; `test_m2_c6_dispatcher_integration.py`
- **W-02** `PytestUnhandledThreadExceptionWarning: Exception in thread _connection_worker_thread` — pytest thread teardown; 0–4 arası; non-deterministic
- **W-03** `ResourceWarning: Connection deleted before being closed` — aiosqlite teardown; 0–6 arası; `test_m5_c1_rss_scan_engine.py`
Tüm kategoriler test altyapısı seviyesi; 0 blocking. Backlog: M8 Hardening.

---

## [2026-04-04] M7-C3 Hardening Pass — Audit trail sınırı, platform_url kaynağı, video_path DB çözümü

### Özet
M7-C3 hardening/finalization pass. Yeni feature yok; 3 zorunlu düzeltme.

### Değiştirilen dosyalar
- `backend/app/publish/executor.py` — 3 düzeltme (bkz. aşağıda)
- `backend/app/publish/service.py` — `append_platform_event()` yeni public fonksiyon eklendi
- `backend/tests/test_m7_c3_publish_executor.py` — 3 yeni test eklendi (U, V, W)

### Düzeltme 1 — Audit trail sınırı servis katmanında
**Sorun:** `_log_platform_event()` doğrudan `PublishLog()` ORM nesnesi oluşturuyordu — servis katmanı bypass ediliyordu.
**Düzeltme:** `publish_service.append_platform_event(session, publish_record_id, event, detail)` çağrısına dönüştürüldü. `service.py`'ye `append_platform_event()` public fonksiyon eklendi (`_append_log` wrapper).
**Test:** U — `append_platform_event` service mock çağrısı doğrulandı.

### Düzeltme 2 — platform_url adapter sonucundan gelir
**Sorun:** `mark_published()` çağrısında `platform_url=f"https://www.youtube.com/watch?v={platform_video_id}"` sabit string üretiliyordu. Bu platform-spesifik format bilgisini executor'a sızdırıyor.
**Düzeltme:** `_do_activate()` return type `PublishAdapterResult` yapıldı; `execute()` içinde `activate_result.platform_url` kullanılıyor.
**Test:** V — `mark_published` çağrısındaki `platform_url` adapter result URL'sine eşit olduğu doğrulandı.

### Düzeltme 3 — video_path DB render step çözümü
**Sorun:** `_resolve_video_path()` docstring'i "render step provider_trace_json → output_path" DB sorgusunu tanımlıyordu; implementasyon yalnızca JSON alanlarına bakıyordu.
**Düzeltme:** Method `async` yapıldı. Step 4 eklendi: `select(JobStep).where(job_id==job.id, step_key=="render")` sorgusu yapılır; `provider_trace_json["output_path"]` okunur.
**Test:** W — render step provider_trace_json içinde output_path varsa döndürüldüğü doğrulandı.

### Test sonuçları
23/23 M7-C3 + 931/931 full suite, 0 regression.

---

## [2026-04-04] M7-C3 — PublishStepExecutor + Dispatcher entegrasyonu + Standard Video publish step

### Özet
YouTube Publish zincirini (upload + activate) servis katmanına bağlayan executor implement edildi.
Audit trail tamamlandı. OPERATOR_CONFIRM idempotency, partial failure ve retryable semantiği eklendi.

### Yeni dosyalar
- `backend/app/publish/executor.py` — PublishStepExecutor

### Değiştirilen dosyalar
- `backend/app/jobs/exceptions.py` — StepExecutionError'a retryable eklendi
- `backend/app/jobs/dispatcher.py` — PublishStepExecutor için pipeline_db inject desteği
- `backend/app/modules/standard_video/definition.py` — publish step (step_order=7, operator_confirm)
- `backend/tests/test_m2_c1_module_system.py` — step sayısı 6→7, anahtarlara publish eklendi
- `backend/tests/test_m2_c6_dispatcher_integration.py` — step sayısı ve key set güncellendi
- `backend/tests/test_m7_c3_publish_executor.py` — 20 test (A–T)

### Tasarım garantileri
- Adaptör servis state'ine dokunmaz (mark_published/mark_failed servis katmanı üzerinden)
- Audit trail executor/service tarafında: her platform event → PublishLog PLATFORM_EVENT kaydı
- Partial failure: upload başarılı → platform_video_id ara kaydedilir → activate başarısız = upload tekrarlanmaz
- OPERATOR_CONFIRM idempotency: status=='published' ise step atlanır
- retryable semantiği: YouTubeAuthError/QuotaExceeded/NotFound → retryable=False; diğerleri → True

### M7 zorunlu alanları (final)
- publish-state ambiguity risk: YOK
- review-to-publish boundary risk: YOK
- partial-failure recovery clarity: TAMAMLANDI
- audit-trail completeness: TAMAMLANDI

### Test sonuçları
20/20 M7-C3 + 928/928 full suite geçti. 0 regression.

---

## [2026-04-04] M7-C2 — YouTube Adapter v1 + TokenStore + Registry + OAuth Router

### Özet
YouTube Publish adaptörü, OAuth2 token yönetimi, adaptör kayıt defteri ve
admin OAuth akışı için HTTP endpoint'leri implement edildi.

### Yeni dosyalar
- `backend/app/publish/youtube/__init__.py` — paket
- `backend/app/publish/youtube/errors.py` — 6 hata sınıfı (retryable bayrakları)
- `backend/app/publish/youtube/token_store.py` — OAuth2 credential saklama + refresh
- `backend/app/publish/youtube/adapter.py` — YouTubeAdapter (upload + activate)
- `backend/app/publish/registry.py` — PublishAdapterRegistry singleton
- `backend/app/publish/youtube/router.py` — GET /auth-url, POST /auth-callback, GET /status, DELETE /revoke
- `backend/tests/test_m7_c2_youtube_adapter.py` — 32 test (A–AF)

### Değiştirilen dosyalar
- `backend/app/api/router.py` — youtube_oauth_router kayıt edildi

### Upload/activate zinciri
```
upload()   → video private olarak yüklenir → platform_video_id döner
activate() → video public/scheduled yapılır → platform_url döner

Partial failure:
  upload başarılı + activate başarısız → platform_video_id korunur
  Retry: yalnızca activate çalıştırılır (upload tekrarlanmaz)
```

### Hata sınıflandırması (retryable)
| Hata | retryable |
|------|-----------|
| YouTubeAuthError | False |
| YouTubeQuotaExceededError | False |
| YouTubeVideoNotFoundError | False |
| YouTubeRateLimitError | True |
| YouTubeUploadError (default) | True |
| YouTubeActivateError (default) | True |

### M7 zorunlu alanları
- publish-state ambiguity risk: YOK
- review-to-publish boundary risk: YOK (M7-C1'den)
- partial-failure recovery clarity: AÇIK (platform_video_id korunur)
- audit-trail completeness risk: DÜŞÜK — M7-C3'te servis katmanı bağlanacak

### Test sonuçları
32/32 geçti (A–AF). Gerçek HTTP çağrısı yok; httpx.AsyncClient mock inject.

### Bilinen kısıtlamalar
- OAuth endpoint'leri MVP'de admin-only değil — MVP scope içinde kabul edildi
- Token dosyası credential içeriyor; data/ dizini .gitignore'da olmalı (belgelendi)
- M7-C3'te PublishStepExecutor adaptörü bağlayacak ve servis katmanı audit log yazacak

---

## [2026-04-04] M7-C1 (rev: review-gate fix) — Publish Center State Machine + DB Models + Core Service

### Özet
Publish Center altyapısı M7-C1 ile kuruldu. YouTube Publish v1 zincirinin
durum makinesi, denetim izi, review gate ve publish gate katmanları implement edildi.

### Yeni dosyalar
- `backend/app/publish/__init__.py` — paket
- `backend/app/publish/enums.py` — PublishStatus, PublishPlatform, PublishLogEvent
- `backend/app/publish/state_machine.py` — PublishStateMachine (9 durum, tam matris)
- `backend/app/publish/exceptions.py` — PublishRecordNotFoundError, InvalidPublishTransitionError, PublishGateViolationError, PublishAlreadyTerminalError, ReviewGateViolationError
- `backend/app/publish/schemas.py` — PublishRecordCreate/Read/Summary, PublishLogRead, ReviewActionRequest, ScheduleRequest, PublishTriggerRequest, CancelRequest, TransitionRequest
- `backend/app/publish/adapter.py` — PublishAdapter soyut taban, PublishAdapterResult, PublishAdapterError
- `backend/app/publish/service.py` — CRUD + tüm durum geçiş aksiyonları
- `backend/app/publish/router.py` — /publish/* 10 endpoint
- `backend/tests/test_m7_c1_publish_state_machine.py` — 26 test

### Değiştirilen dosyalar
- `backend/app/db/models.py` — PublishRecord + PublishLog modelleri eklendi
- `backend/app/api/router.py` — publish_router kayıt edildi

### Durum makinesi
```
draft
  ↓ submit_for_review()
pending_review
  ↓ review_action(approve)    ↓ review_action(reject)
approved                   review_rejected
  ↓ trigger_publish()           ↓ reset_to_draft()
  ↓ schedule_publish()        draft (döngü)
scheduled
  ↓ trigger_publish()
publishing
  ↓ mark_published()    ↓ mark_failed()
published [terminal]   failed
                         ↓ trigger_publish() [retry]
                       publishing → published
```

### Publish gate kuralı (M7 taahhüdü)
`PublishStateMachine.can_publish()`:
- **İzin verilen**: approved, scheduled, failed (retry)
- **Yasak**: draft, pending_review, review_rejected, publishing, published, cancelled
- `trigger_publish()` gate kontrolü yapar → `PublishGateViolationError`

### Review gate izolasyonu
`review_action()` kaydı `approved` durumuna geçirir.
**Yayınlamayı başlatmaz.** Publish için `trigger_publish()` ayrıca çağrılır.

### Editorial izolasyon
PublishRecord → StandardVideo veya NewsBulletin tabloları değişmez.
Publish sonucu yalnızca `publish_records` + `publish_logs`'a yazılır.

### Kısmi başarısızlık semantiği
`publishing → failed → trigger_publish() → publishing` zinciri desteklenir.
Her deneme `publish_attempt_count` artırır + `PublishLog`'a olay yazar.

### Denetim izi kuralı
Her durum geçişi, her review kararı, her publish girişimi → ayrı `PublishLog` satırı.
Sessiz güncelleme yasak: `_append_log()` her kritik aksiyonda çağrılır.

### Test sonuçları
```
26/26 PASSED
A) Legal transitions accepted
B) Illegal transitions raise ValueError
C) Terminal states identified
D) can_publish() gate rule
E) allowed_next()
F-G) create_publish_record + log
H) submit_for_review
I-K) review_action (approve/reject/invalid)
L) trigger_publish approved→publishing
M-N) PublishGateViolationError from draft/pending_review
O) mark_published
P) mark_failed
Q) Retry failed→publishing
R) cancel_publish
S) Terminal state blocks transitions
T) reset_to_draft
U-V) schedule_publish + scheduled→publishing
W) Audit trail completeness
X) list filter by job_id
Y) Editorial isolation
Z) Review gate isolation
```

### Düzeltmeler (review-gate fix)
1. **Tier A review gate zorlandı**: `draft → approved` ve `draft → scheduled` geçişleri state machine'den kaldırıldı. Artık draft'tan yalnızca `pending_review` veya `cancelled` geçişi yasal.
2. **ReviewGateViolationError aktifleştirildi**: `review_action()` servis fonksiyonu, `pending_review` dışı durumdan çağrılırsa `ReviewGateViolationError` fırlatır. Router HTTP 422 döndürür.
3. **Alembic migration eklendi**: `c1a2b3d4e5f6_m7_c1_add_publish_records_and_logs.py` — `publish_records` + `publish_logs` tabloları, FK kısıtları, index'ler. `alembic upgrade head` başarıyla çalışıyor.
4. **scheduled_at UTC normalize edildi**: `schedule_publish()` servis fonksiyonu naive datetime'ı UTC aware'e dönüştürür. Test workaround kaldırıldı.

### Zorunlu akış (Tier A — bypass edilemez)
```
draft → pending_review → approved → [scheduled →] publishing → published
                      ↘ review_rejected → draft (düzeltme döngüsü)
```

### Fresh-DB Migration Doğrulaması
```
Yöntem  : CONTENTHUB_DATA_DIR geçici dizine yönlendirildi
Komut   : alembic upgrade head (boş DB — create_all veya stamp YOK)
Sonuç   : 21 migration çalıştı, c1a2b3d4e5f6'ya kadar başarılı
Tablolar: publish_records (20 sütun, FK → jobs) + publish_logs (10 sütun, FK → publish_records)
Version : alembic_version = c1a2b3d4e5f6 ✓
Downgrade: alembic downgrade -1 → publish_records + publish_logs kaldırıldı, b1c2d3e4f5a6'ya döndü ✓
Test dosyası: tests/test_m7_c1_migration_fresh_db.py (9 test)
```

**"alembic upgrade head çalışıyor" ifadesi fresh-DB koşudan sonra onaylandı.**

### M7-C1 Mandatory Delivery Fields (final)
| Alan | Değer |
|---|---|
| review-gate bypass risk | **none** — draft → approved/scheduled geçişleri state machine'de YASAK; test B + E kilitler; review_action() pending_review guard eklendi (test K2) |
| migration completeness | **none** — fresh (boş) DB üzerinde `alembic upgrade head` + `downgrade -1` doğrulandı; 9 migration testi; create_all veya stamp KULLANILMADI |
| timezone consistency | **none** — scheduled_at service.py'de UTC normalize edilir; naive input test edildi (test U); workaround kaldırıldı |
| audit-trail completeness risk | **none** — _append_log() garantisi; oluşturma + her geçiş + review + publish girişimi + platform olayı; test W doğruladı |

---

## [2026-04-04] M6 KAPANIŞI — Remotion Render Pipeline + Preview Infrastructure

### Render spine tutarlılık denetimi

**M6-C1/C2/C3 birlikte tutarlı bir render spine kurdu mu:**

Evet. Üç chunk birbirini tamamlıyor; aralarında sözleşme kırılması yok.

```
composition_props.json  (KANONİK — CompositionStepExecutor üretir)
  render_status: "props_ready"
  composition_id: composition_map.py'den → "StandardVideo"
  props:
    word_timing_path: "/path/word_timing.json"   ← ham referans burada kalır
    timing_mode: "whisper_word" | "cursor"
    total_duration_seconds: 30.0                 ← authoritative duration kaynağı
    subtitle_style: {...}
    scenes: [...]

         │
         ▼ RenderStepExecutor.execute()
         
render_props.json  (RUNTIME SNAPSHOT — her render öncesi üretilir)
  word_timing_path: KALDIRILDI
  wordTimings: [{scene,word,start,end,...}]      ← inline, backend okuyup dönüştürdü
  total_duration_seconds: 30.0                   ← geçersizse fallback=60s + WARNING
  ...diğer props değişmeden

         │
         ▼ npx remotion render ... --props render_props.json
         
StandardVideoComposition (renderer — saf React, fs okuma yok)
  wordTimings props'tan gelir
  timing_mode → KaraokeSubtitle.timingMode
  total_duration_seconds → calculateMetadata → durationInFrames

         │
         ▼ output.mp4

AYRI YOL:

render_still.py → RenderStillExecutor
  composition_id: composition_map.get_preview_composition_id("standard_video_preview")
  preview_props.json → Remotion --props
  PreviewFrameComposition → renderStill → preview_frame.jpg
  (composition_props.json güncellenmez — bağımsız preview akışı)
```

### composition_map.py tek otorite — nerelerde kullanılıyor

| Kullanım noktası | Fonksiyon | Döner |
|---|---|---|
| `executors/composition.py` | `get_composition_id("standard_video")` | `"StandardVideo"` |
| `executors/render.py` | composition_props.json'dan alır (composition.py üretmişti) | — |
| `executors/render_still.py` | `get_preview_composition_id("standard_video_preview")` | `"PreviewFrame"` |
| `renderer/src/Root.tsx` | `id="StandardVideo"`, `id="PreviewFrame"` (senkron, test 4 kilitler) | — |

Stray hardcoded `"StandardVideo"` veya `"PreviewFrame"` string'i: **sıfır** (yalnızca yorum satırları).

### composition_props.json vs render_props.json resmi sınır

| Özellik | composition_props.json | render_props.json |
|---|---|---|
| Üretici | CompositionStepExecutor | RenderStepExecutor |
| Kalıcı mı? | Evet — pipeline audit trail | Hayır — her render öncesi üzerine yazılır |
| word_timing_path | Var (ham referans) | Yok (wordTimings inline) |
| job_id | Var | Yok |
| render_status | Var | Yok |
| Remotion `--props` | Hayır | Evet |
| Kanonik mı? | Evet | Hayır |

### Duration fallback final davranışı

**Kaç yerde fallback olabilir:** 2 nokta.
1. Backend `render.py` — `total_duration_seconds` eksik/sıfır/negatif → `60.0s`, `WARNING` log, `duration_fallback_used=True` sonuç+provider+composition_props.
2. Renderer `Root.tsx` `calculateMetadata` — aynı koşul → `console.warn`, fallback=60s.

**Trace/log/artifact görünürlüğü:**
- `composition_props.json` → `duration_fallback_used: true` (denetlenebilir)
- `RenderStepExecutor` WARNING log satırı (job log'da görünür)
- Renderer `console.warn` (Remotion render output'unda görünür)

**Preview ve final aynı fallback kuralını kullanıyor mu:**
Hayır — `RenderStillExecutor` duration hesabı yapmaz. `PreviewFrame` sabit `durationInFrames=1`. Preview için duration fallback mevcut değil; bu doğru davranış.

### Preview ve final render yollarının net ayrımı

```
Final render (RenderStepExecutor):
  composition_id: "StandardVideo"   ← composition_map.COMPOSITION_MAP
  çıktı: output.mp4
  composition_props.json güncellenir (render_status: rendered)
  timeout: 600s
  word_timing yükleme: evet
  duration fallback: evet

Preview render (RenderStillExecutor):
  composition_id: "PreviewFrame"    ← composition_map.PREVIEW_COMPOSITION_MAP
  çıktı: preview_frame.jpg
  composition_props.json güncellenmez
  timeout: 120s
  word_timing yükleme: hayır
  duration fallback: N/A (sabit 1 kare)
```

### Zorunlu kapatış alanları

**render-contract drift risk: düşük**
composition_map.py tek otorite; 4 kullanım noktası test ile kilitli.
render_props.json her render öncesi taze üretilir — drift birikemez.
StandardVideoProps tipi renderer'da tek tip tanımı; M6-C2 word_timing_path→wordTimings dönüşümü izole.

**preview-scope confusion risk: yok**
M4-C3 CSS preview, M6-C2 renderStill, M6-C1 final render üç ayrı yüzey.
RenderStillExecutor composition_props.json okumaz — test 16 kilitler.
Farklı composition ID, farklı executor, farklı çıktı formatı, farklı timeout.

**render-runtime coupling risk: düşük**
shell=False, asyncio subprocess, timeout disiplini üç executor'da tutarlı.
_RENDERER_DIR sabit hesaplanıyor, node_modules kontrolü var.
npx bulunamazsa graceful hata; renderer/ yoksa graceful hata.

**warnings budget: known-nonblocking**
840 test, 1 warning (mock framework internal). M6 boyunca hiç artmadı.

**composition-id authority risk: yok**
Stray string yok. composition_map.py her kullanım noktasının tek kaynağı.
Test 7 render_still.py'de hardcoded string olmadığını kilitler.
Test 18 final/preview ID çakışmasının olmadığını kilitler.

**duration-fallback ambiguity: düşük**
Fallback oluştuğu her yerde WARNING log + `duration_fallback_used=True` artifact.
"Normal durum" gibi görünmez. Test 8-10 ve 22 kilitler.
Preview ayrı: sabit 1 kare, duration sorusu yok.

**runtime-snapshot misuse risk: düşük**
render_props.json sözleşmesi docstring ve test 14 ile kilitli:
  - `job_id` içermiyor → kanonisi değil olduğu açık
  - her render öncesi üzerine yazılıyor → geçici
  - Remotion'a özgü dönüşümler burada izole
Hiçbir yeni logic yalnızca render_props.json üzerine inşa edilmedi.

### Teknik Borç (M7+ scope)
- `as unknown` cast: Root.tsx'te 5 gerçek cast — Remotion v4 Zod-less sınırlama; localized, yayılmamış
- `word_timing_path` hâlâ `composition_props.json → props`'ta string olarak tutuluyor — bu bilinçli: kanonik kaynak ham referansı korur; render.py dönüşüm yapar
- `PREVIEW_COMPOSITION_MAP` tek entry — ilerleyen modüller için convention belgelenmiş (key: `{module}_preview`)
- openBrowser singleton (M6 başında planlanan) implement edilmedi — Remotion Studio erişimi için ayrı chunk gerekiyor; şu an bloklayıcı değil

### M6 Test Sayıları
- M6-C1: 20 test
- M6-C2: 25 test
- M6-C3: 25 test
- **M6 toplam ek: 70 test**
- **Genel toplam: 840/840 geçiyor**

---

## [2026-04-04] M6-C3 — Composition Map Senkronu + Artifact Rolleri + Duration Fallback

### Kapsam
PreviewFrame composition_map.py'e kayıt; composition_props.json vs render_props.json resmi rol ayrımı; duration fallback açık log; as unknown cast audit.

### Değişen Dosyalar

**backend/app/modules/standard_video/composition_map.py** (GÜNCELLENDİ)
- `PREVIEW_COMPOSITION_MAP` eklendi: `{"standard_video_preview": "PreviewFrame"}`.
- `get_preview_composition_id(preview_context)` eklendi — RenderStillExecutor için.
- `get_all_composition_ids()` eklendi — Root.tsx doğrulama ve test için.
- Senkron kuralı belgelendi: Root.tsx içindeki her id bu dosyada olmalı.

**backend/app/modules/standard_video/executors/render_still.py** (GÜNCELLENDİ)
- `PREVIEW_COMPOSITION_ID` artık string sabit değil; `get_preview_composition_id()` çağrısından türetilir.
- Import: `from app.modules.standard_video.composition_map import get_preview_composition_id`.
- Docstring: composition ID kaynağı belgesi eklendi.

**backend/app/modules/standard_video/executors/render.py** (GÜNCELLENDİ)
- Docstring: `composition_props.json` (kanonik) vs `render_props.json` (runtime snapshot) ayrımı belgelendi.
- Duration fallback: `total_duration_seconds` eksik/sıfır/negatif → fallback=60s + WARNING log.
- `duration_fallback_used: bool` sonuç dict, provider trace ve `composition_props.json` güncellemesine eklendi.

**renderer/src/Root.tsx** (GÜNCELLENDİ)
- Docstring: composition_map.py senkronu ve as unknown cast audit sayısı belgelendi.
- `calculateMetadata` duration fallback: geçersiz duration → `console.warn` + fallback=60s.
- Sessiz fallback yok: hem backend hem renderer fallback durumu loglar.

**backend/tests/test_m6_c3_composition_map_sync.py** (YENİ)
- 25 test — tümü geçiyor.

### Mandatorî M6-C3 Teslimat Alanları

**composition_props.json ile render_props.json arasındaki resmi rol farkı:**
- `composition_props.json` = KANONİK SÖZLEŞME. CompositionStepExecutor üretir. Pipeline durumu, denetim izi, word_timing_path ham referansı burada yaşar. Render executor bu dosyayı render_status geçişi için günceller; içeriğini değiştirmez.
- `render_props.json` = RUNTIME SNAPSHOT. RenderStepExecutor her render öncesi üretir. `word_timing_path` → `wordTimings[]` dönüşümü burada yapılır. Remotion `--props` bu dosyayı gösterir. Geçici, üzerine yazılabilir — canonical değil.
- Test 14 `render_props.json`'un `job_id` içermediğini kilitler (composition_props'un alanları).

**preview composition mapping nasıl senkronize edildi:**
- `composition_map.PREVIEW_COMPOSITION_MAP["standard_video_preview"] = "PreviewFrame"` — tek otorite.
- `render_still.py` `PREVIEW_COMPOSITION_ID` bu map'ten modül yüklemesinde türetilir.
- Test 5 ve 7 bu bağı kilitler: test 5 değer eşitliğini, test 7 string sabit olmadığını doğrular.
- Root.tsx dokümanı bu map ile senkronize olduğunu belirtir.

**dynamic duration authoritative kaynakları:**
- Tek kaynak: `composition_props.json → props.total_duration_seconds` (CompositionStepExecutor üretir).
- Backend: geçersiz → `duration_fallback_used=True` + WARNING log.
- Renderer: geçersiz → `console.warn` + fallback=60s.
- Preview duration: composition_props.json'a bağlı değil — `PreviewFrame` sabit 1 kare.

**preview ve final executor davranış farkları:**
| Özellik                   | RenderStepExecutor | RenderStillExecutor |
|---------------------------|-------------------|---------------------|
| Composition ID            | StandardVideo      | PreviewFrame        |
| Çıktı                     | output.mp4         | preview_frame.jpg   |
| composition_props güncelleme | Evet (render_status) | Hayır           |
| Timeout                   | 600s               | 120s                |
| render_props.json üretir  | Evet               | Hayır (preview_props.json) |
| word_timing yükleme       | Evet               | Hayır               |
| duration fallback         | Evet, WARNING log  | N/A (sabit 1 kare)  |

**inline word timings payload büyüme riski — şu an:**
Şu an düşük: tipik video 50-200 kelime × ~50 byte = 2.5-10KB JSON payload.
Watchlist kriterleri: sahne sayısı > 50, kelime sayısı > 500, preview vs final payload farkı. Bu eşikler aşılırsa ayrı word_timing endpoint veya lazy loading düşünülmeli.

**render-contract drift risk: düşük**
composition_map.py tek otorite. Test 4, 5, 17, 18 senkronu kilitler. render_props.json üretim fonksiyonu izole.

**preview-scope confusion risk: yok**
Test 16 RenderStillExecutor'ın composition_props.json okumadığını kilitler. Test 18 ID çakışması yok.

**render-runtime coupling risk: düşük**
Değişmedi. shell=False, graceful fallback, timeout disiplini korundu.

**warnings status: known-nonblocking**
1 warning: mock framework internal. Değişmedi.

### Teknik Borç
- `calculateMetadata` hâlâ `as unknown as StandardVideoProps` cast gerektiriyor — Remotion v4 Zod-less sınırlama. Localized, yayılmıyor.
- `PREVIEW_COMPOSITION_MAP` henüz tek entry — gelecekte modül başına preview eklenirse key convention belgelenecek.

### Test Sonuçları
- M6-C3 testleri: 25/25 geçiyor
- Toplam: 840/840 geçiyor
- TypeScript: temiz
- Warnings: 1 (framework seviyesi — değişmedi)

---

## [2026-04-04] M6-C2 — word_timing Inline Yükleme + Dynamic Duration + renderStill Preview

### Kapsam
word_timing.json backend tarafında okunup wordTimings olarak inline geçirilmesi; calculateMetadata ile dinamik duration hesaplama; RenderStillExecutor + PreviewFrame composition ile preview/final ayrımı.

### Değişen Dosyalar

**renderer/src/compositions/StandardVideoComposition.tsx** (GÜNCELLENDİ)
- `word_timing_path: string | null` prop'u kaldırıldı.
- `wordTimings: WordTiming[]` inline prop eklendi.
- Docstring: word_timing yükleme mimarisi belgelendi (backend okur, renderer fs'e dokunmaz).
- Renderer saf React bileşeni kalır — fs okuma yok.

**renderer/src/Root.tsx** (GÜNCELLENDİ)
- `calculateMetadata` eklendi: `total_duration_seconds × FPS → durationInFrames`.
- M6-C1'deki sabit `durationInFrames=1800` kaldırıldı.
- `PreviewFrame` composition kayıtlandı (`durationInFrames=1`, `id="PreviewFrame"`).
- `defaultProps.wordTimings = []` — `word_timing_path` kaldırıldı.

**renderer/src/compositions/PreviewFrameComposition.tsx** (YENİ)
- `PreviewFrameProps`: `scene_number, image_path, subtitle_style, sample_text`.
- `PreviewFrameComposition`: tek kare, KaraokeSubtitle örnek metinle render.
- Final render'dan ayrı composition — `id="PreviewFrame"`, `durationInFrames=1`.
- M4-C3 CSS preview'dan ayrı: Remotion pixel output, tarayıcı CSS değil.

**backend/app/modules/standard_video/executors/render.py** (GÜNCELLENDİ)
- `_load_word_timings(word_timing_path)` eklendi: dosya okur, hatalarda graceful boş liste.
- `_build_render_props(composition_props)` eklendi:
  - `word_timing_path` kaldırılır, `wordTimings` inline eklenir.
  - Diğer props alanları korunur.
- `execute()`: `render_props.json` ayrı dosyaya yazılır (composition_props.json değil).
- Sonuç: `timing_mode` + `word_timings_count` eklendi.
- `composition_props.json` güncellemesi: `timing_mode_used` + `word_timings_count` eklendi.

**backend/app/modules/standard_video/executors/render_still.py** (YENİ)
- `RenderStillExecutor`, `step_key = "render_still"`.
- `PREVIEW_COMPOSITION_ID = "PreviewFrame"`.
- `execute()`: `preview_props.json` yazar, `preview_frame.jpg` üretir.
- `composition_props.json` güncellemez — bağımsız preview akışı.
- `_run_remotion_still()`: `npx remotion still` + `--frame 0`, `shell=False`, timeout=120s.

**backend/app/modules/standard_video/executors/__init__.py** (GÜNCELLENDİ)
- `RenderStillExecutor` eklendi.

**backend/tests/test_m6_c2_render_word_timing.py** (YENİ)
- 25 test — tümü geçiyor.

### Mandatorî M6 Teslimat Alanları

**word_timing_path nasıl yüklendi:**
Backend `_load_word_timings(path)` → `word_timing.json` → `words` alanı çıkarılır → `WordTiming[]` array'i.
Renderer'a `wordTimings` prop olarak inline geçirilir. Renderer fs okuma yapmaz.
`word_timing_path` None veya dosya yoksa → boş liste, cursor (degrade) mod devrede.

**dynamic duration hangi kaynaktan hesaplandı:**
`composition_props.json → props.total_duration_seconds` (backend `CompositionStepExecutor` üretir).
`Root.tsx calculateMetadata`: `Math.max(1, Math.round(totalSecs * FPS))`.
M6-C1'deki sabit `durationInFrames=1800` tamamen kaldırıldı.

**timing_mode renderer davranışına nasıl bağlandı:**
`render_props.json → timing_mode` → `StandardVideoComposition → props.timing_mode` → `KaraokeSubtitle.timingMode`.
`resolveKaraokeRenderBehavior(timingMode)` → `word_level_highlight / segment_level_highlight / degraded_mode`.
cursor: wordTimings=[] + degrade mode. whisper_word: wordTimings populated + kelime highlight.

**render contract'ta hangi alanlar eklendi/değişti:**
  - `word_timing_path` → kaldırıldı (renderer props'tan)
  - `wordTimings: WordTiming[]` → eklendi (inline)
  - `composition_props.json → timing_mode_used` → eklendi (render sonrası audit)
  - `composition_props.json → word_timings_count` → eklendi (render sonrası audit)
  - `render_props.json` → YENİ artifact (renderer'a geçirilen temiz props)

**preview yolu ile final render yolu nerede ayrılıyor:**
  - `RenderStepExecutor` → `StandardVideo` composition → `output.mp4` → `composition_props.json` güncellenir
  - `RenderStillExecutor` → `PreviewFrame` composition → `preview_frame.jpg` → `composition_props.json` güncellemez
  - Preview: `RENDER_STILL_TIMEOUT_SECONDS=120` / Final: `RENDER_TIMEOUT_SECONDS=600`
  - M4-C3 CSS preview: browser stil kartları, Remotion'a bağlı değil — ayrı yüzey, korundu

**render-contract drift risk: düşük**
`StandardVideoProps` tipi renderer'da tek otorite. `_build_render_props` backend → renderer dönüşümünü izole eder.
Test 24 `render_props.json`'un `word_timing_path` içermediğini kilitler. Test 5 ve 7 dönüşüm doğruluğunu kilitler.

**preview-scope confusion risk: yok**
`PreviewFrame` ve `StandardVideo` ayrı composition ID, ayrı executor, ayrı çıktı dosyası.
`composition_props.json` preview tarafından güncellenmez — test 18 kilitler.
M4-C3 CSS preview ayrı yüzey, belgelenmiş.

**render-runtime coupling risk: düşük**
Tüm subprocess çağrıları `shell=False`, `asyncio.create_subprocess_exec`.
`_build_render_props` pure fonksiyon — fs bağımlılığı yalnızca `_load_word_timings`.
`_load_word_timings` graceful fallback: dosya yoksa/bozuksa boş liste, log, devam.

**warnings status: known-nonblocking**
1 warning: `unittest.mock.py:2245 RuntimeWarning` (mock framework internal). Değişmedi.

### Teknik Borç
- `PreviewFrame` composition şu an `image_path=null` → siyah arka plan. Gerçek sahne görseli M6-C3+ kapsamında.
- `calculateMetadata` async fn imzası var ama props `as unknown as StandardVideoProps` cast gerektiriyor — Remotion v4 Zod-less kayıt için bilinen sınırlama.
- `PREVIEW_COMPOSITION_ID` composition_map.py'e eklenmedi — M6-C3'te senkronize edilecek.

### Test Sonuçları
- M6-C2 testleri: 25/25 geçiyor
- M6-C1 testleri: 20/20 geçiyor
- Toplam: 815/815 geçiyor
- TypeScript: `npx tsc --noEmit` temiz
- Warnings: 1 (framework seviyesi — değişmedi)

---

## [2026-04-04] M6-C1 — Remotion Render Pipeline Foundation

### Kapsam
Remotion'ın renderer/ dizinine kurulumu; StandardVideo composition kaydı; KaraokeSubtitle.tsx aktivasyonu; RenderStepExecutor (backend subprocess aracı).

### Değişen Dosyalar

**renderer/package.json** (YENİ)
- Remotion v4 + React 18 bağımlılıkları tanımlandı.
- `npm install` ile 191 paket kuruldu.

**renderer/tsconfig.json** (YENİ)
- TypeScript 5.3 yapılandırması — Remotion/React JSX için.

**renderer/remotion.config.ts** (YENİ)
- Giriş noktası: `src/Root.tsx`.
- Video çıktı formatı: JPEG. Mevcut output üzerine yaz.

**renderer/src/Root.tsx** (YENİ)
- `RemotionRoot()` — tüm composition'ların kayıt noktası.
- `StandardVideo` composition: `id="StandardVideo"`, fps=30, 1920×1080.
- Güvenli tip: `as unknown as ComponentType<Record<string, unknown>>` — Zod kullanılmaz.
- `defaultProps` tam tipli `StandardVideoProps`.

**renderer/src/compositions/StandardVideoComposition.tsx** (YENİ)
- `StandardVideoProps` tipi — `composition_props.json → props` ile 1:1 uyumlu.
- Sahne döngüsü: her sahne `Sequence` + `Audio` + `Img` + `KaraokeSubtitle`.
- `word_timing_path` M6-C2+ kapsamında yüklenecek — şu an boş dizi (cursor degrade modu).
- M4-C3 CSS preview ayrımı korundu: bu composition final render içindir.

**renderer/src/compositions/KaraokeSubtitle.tsx** (GÜNCELLENDİ)
- Remotion import'ları uncomment edildi: `useCurrentFrame`, `useVideoConfig`.
- `currentTime = 0` stub kaldırıldı; `frame / fps` aktif.
- Docstring notları güncellendi (M6-C1 kurulumu tamamlandı).

**backend/app/modules/standard_video/executors/render.py** (YENİ)
- `RenderStepExecutor` — `step_key = "render"`.
- `composition_props.json` (render_status=props_ready) gerektirir.
- Subprocess: `asyncio.create_subprocess_exec` + `shell=False` (injection koruması).
- Zaman aşımı: `RENDER_TIMEOUT_SECONDS = 600`.
- `_run_remotion_render()`: node_modules kontrolü, npx bulunamadı → graceful hata.
- Render durumu geçişleri: `props_ready → rendering → rendered | failed`.
- `composition_props.json` render sonrası güncellenir: `output_path + updated_at`.
- `_RENDERER_DIR`: backend'e göre `../renderer` olarak hesaplanır.

**backend/app/modules/standard_video/executors/__init__.py** (GÜNCELLENDİ)
- `RenderStepExecutor` eklendi.

**backend/tests/test_m6_c1_render_executor.py** (YENİ)
- 20 test — tümü geçiyor.
- İdempotency, props_ready guard, subprocess mock, timeout, node_modules kontrolü,
  sorumluluk ayrımı (UsedNewsRegistry import yok) dahil.

### Mandatorî Teslimat Alanları (M6)

**render-contract drift risk: düşük**
Render sözleşmesi `composition_props.json` → `props` alanıdır. `StandardVideoProps` tipi
hem `Root.tsx` hem de `StandardVideoComposition.tsx`'de referans alınır.
`backend/composition.py` bu dosyayı üretir. Senkron kalması için test 12 (`composition_props`
güncelleme) ve test 11 (sonuç yapısı) koruma sağlar. Yeni prop eklendiğinde
hem backend hem renderer güncellenmeli — bu bilinçli iki taraflı değişiklik.

**preview-scope confusion risk: yok**
M4-C3 CSS preview ayrımı bozulmadı. `StandardVideoComposition.tsx` final render içindir.
Stil kartları ve subtitle önizleme yüzeyi ayrı kalır. Docstring'de "M4-C3 preview ayrımı
KORUNUR" notu açıkça belgelenmiştir.

**render-runtime coupling risk: düşük**
Backend subprocess `asyncio.create_subprocess_exec` ile `shell=False` — injection riski yok.
Renderer dizini `_RENDERER_DIR` sabiti ile backend dosya ağacına göre hesaplanır.
Node.js kurulu olmalı — bu `npm install` belgelendi, runtime bağımlılık kaydedildi.
`npx komutu bulunamadı` hatası graceful yakalanır ve `StepExecutionError` fırlatır.

### Teknik Borç
- `word_timing_path` M6-C1'de işlenmedi — `StandardVideoComposition` boş `wordTimings=[]`
  ile cursor (degrade) modda çalışır. M6-C2'de `word_timing.json` dosyası yüklenecek.
- `durationInFrames=1800` Root.tsx'te sabit — `calculateMetadata` M6-C2+ kapsamında
  composition_props'tan dinamik süre okuyacak.

### Test Sonuçları
- M6-C1 testleri: 20/20 geçiyor
- Toplam test sayısı: 790/790 geçiyor
- Warnings: 1 (framework seviyesi — değişmedi)
- TypeScript: `npx tsc --noEmit` temiz geçiyor

---

## [2026-04-04] M5 KAPANIŞI — News Ingestion + Bulletin Pipeline Pack

### Zincir tutarlılık denetimi

**source → scan → dedupe → selectable → selection_confirmed → used zinciri tam ve tutarlı mı:**

Evet. Her halka ayrı servis katmanında, açık sözleşmelerle bağlı:

```
NewsSource (kayıt)
  └─ SourceScan (tarama kaydı, status: queued→running→completed|failed)
       └─ scan_engine.execute_rss_scan()
            ├─ hard dedupe: URL tam eşleşmesi → skipped_hard
            ├─ soft dedupe: Jaccard başlık benzerliği → skipped_soft | followup_accepted
            └─ NewsItem (status='new') ← tek atama noktası [M5-C1]
                  │
                  ├─ get_selectable_news_items() → status='new' olan kayıtlar
                  │    (deduped = DB'de yok = bu listede yok)
                  │
                  ├─ NewsBulletinSelectedItem (seçim ilişkisi, NewsItem.status DEĞİŞMEZ)
                  │
                  ├─ confirm_selection() → bulletin.status='selection_confirmed'
                  │    (NewsItem.status DEĞİŞMEZ)
                  │
                  └─ consume_news() → UsedNewsRegistry + NewsItem.status='used'
                                       ← tek 'used' atama noktası [M5-C3]
```

### Semantik sınırlar

| State | Kimin tarafından atanıyor | NewsItem.status değişiyor mu |
|---|---|---|
| `new` | `scan_engine` — ve sadece o | — (bu atama) |
| `selected` | `NewsBulletinSelectedItem` ilişkisi | Hayır |
| `selection_confirmed` | `confirm_selection()` → `NewsBulletin.status` | Hayır |
| `used` | `consume_news()` — ve sadece o | Evet: new → used |

`deduped` DB'de YOK — yalnızca `ScanExecuteResponse.dedupe_details`'te yaşar.
Bu, "scan sonucu artifact" ile "kalıcı DB state" arasındaki sınırın net korunduğunu gösterir.

### Dedupe görünmeyen item ile selectable item ayrımı

**Dedupe kararı bastırılan item:**
- scan sırasında DB'ye yazılmaz
- `get_selectable_news_items()` bu item'ı göremez (DB'de yoktur)
- `dedupe_details` listesinde reason + matched_item_id + similarity_score ile izlenebilir

**follow-up accepted item (soft dedupe atlandı):**
- DB'ye `status='new'` olarak yazılır
- `get_selectable_news_items()` bu item'ı görür
- `ScanDedupeDetail.followup_override=True` ile scan yanıtında kayıt altında

**Selectable item (genel):**
- `NewsItem.status == 'new'` — bu ve yalnızca bu koşul
- Dedupe bypass'ı, follow-up acceptance veya başka mantık karıştırılmaz

### Final risk değerlendirmesi

**source-state semantics final risk: LOW**
- SourceScan durumları izole ve temiz (queued→running→completed|failed)
- NewsItem.status geçişleri tek noktaya bağlı (new sadece scan_engine, used sadece consume_news)
- state karışmasını test 11, 22, 26, 27 kilit altında tutuyor

**news-to-bulletin lineage clarity: MEDIUM**
- scan → news_item → bulletin_selected_item → used_news_registry zinciri var
- `NewsBulletinSelectedItem.selection_reason` editör notu taşıyor ama zorunlu değil
- follow-up accepted item'ların otomatik etiketlenmesi yok (kasıtlı — editör sorumluluğu)
- lineage tam otomatik izlenemez; admin panel görünürlüğü M6+ kapsamı
- Bu "medium" kabul edilebilir: temel izlenebilirlik var, tam audit trail henüz değil

**selection-to-consumption ambiguity: NONE**
- `selected` = NewsBulletinSelectedItem kaydı (NewsItem.status değişmez)
- `selection_confirmed` = bulletin kapısı geçildi (NewsItem.status yine değişmez)
- `used/consumed` = consume_news() (tek geçiş, test 27)
- Bu üç kavram kod ve testlerde açıkça ayrılmış

**dedupe false-positive risk: LOW** (M5-C2'den miras)
- SOFT_DEDUPE_THRESHOLD=0.65 kasıtlı yüksek, test 24 ile kilitli

**used-news ambiguity risk: NONE**
- UsedNewsRegistry sadece consume_news'ta yazılıyor
- scan_engine ve confirm_selection dokunmuyor (test 26, 27, M5-C2 test 25)

**preview-to-final confusion risk: NONE**
- M5'te UI değişikliği yok

### Warnings budget final durumu

Toplam: 2 known-nonblocking warning, tümü framework/test altyapısı kaynaklı.

| Warning | Kaynak | Uygulama kodu mu? |
|---|---|---|
| `RuntimeWarning: coroutine ... never awaited` | `unittest.mock.py:2245` | Hayır — mock framework |
| `RuntimeError: Event loop is closed` | TestClient teardown | Hayır — async test infrastructure |

`-W error::UserWarning` testi 770/770 geçiyor → uygulama kodu sıfır warning üretmiyor.

### M6'ya devredilen omurga

**Hazır:**
- `ProviderRegistry` + `ProviderCapability` (LLM, TTS, VISUALS, WHISPER)
- Standard Video pipeline: script→tts→subtitle(karaoke)→composition→visuals→metadata
- `composition_props.json` sözleşmesi: subtitle_style + word_timing_path + timing_mode
- `KaraokeSubtitle.tsx` + `subtitle-contracts.ts` Remotion placeholder (aktif edilmeyi bekliyor)
- `SubtitleStylePicker` CSS preview UI
- News pipeline: scan→dedupe→selectable→selected→confirmed→used zinciri
- `UsedNewsRegistry` + `NewsBulletinSelectedItem` ilişki modeli

**M6 için açık bırakılan:**
- Remotion kurulumu ve KaraokeSubtitle aktif edilmesi
- `renderStill` / `renderMedia` altyapısı (M6 genel preview infrastructure)
- `openBrowser()` singleton
- Bulletin `in_progress` → `done` geçişi
- News lineage tam audit trail (admin panel)
- Soft dedupe'de stopword ve semantik benzerlik (M6+ kapsamı)

### Test sayısı özeti

| Chunk | Yeni Test | Toplam |
|---|---|---|
| M5-C1 | 22 | 717 |
| M5-C2 | 25 | 742 |
| M5-C3 | 28 | 770 |

---

## [2026-04-04] M5-C3 — Bulletin Pipeline + Editorial Gate

**Ne:**
- `backend/app/modules/news_bulletin/editorial_gate.py` — YENİ: Editorial seçim kapısı ve tüketim servisi.
  `confirm_selection()` — editorial insan onay kapısı.
  `consume_news()` — "used state ne zaman kazanılıyor" sorusunun tek ve net yanıtı.
  `get_selectable_news_items()` — status='new' item listesi, dedupe-aware.
  `ConfirmSelectionResult`, `ConsumeNewsResult` dataclass'ları.
  Durum sabitleri: `BULLETIN_STATUS_DRAFT/SELECTION_CONFIRMED/IN_PROGRESS/DONE`.
- `backend/app/modules/news_bulletin/router.py` — 3 yeni endpoint:
  `POST /{id}/confirm-selection` — editorial gate geçişi.
  `POST /{id}/consume-news` — haber tüketimi.
  `GET /{id}/selectable-news` — seçime uygun haberler.

**selected state ne zaman oluşuyor:**
  `POST /selected-news` ile `NewsBulletinSelectedItem` kaydı yazıldığında.
  NewsItem.status DEĞİŞMEZ. "selected" DB state'e çevrilmez.

**used/consumed state ne zaman oluşuyor:**
  `consume_news()` çağrıldığında — tek ve net geçiş noktası.
  `UsedNewsRegistry` kaydı yazılır + `NewsItem.status = "used"` atanır.
  Başka hiçbir yol (scan_engine, confirm_selection) bu geçişi yapmaz.
  Test 11, 26, 27 ile üç katmanda kilitlenmiş.

**bulletin create flow hangi item seti üzerinden çalışıyor:**
  1. `get_selectable_news_items()` → status='new' item'lar listelenir.
  2. Editör `POST /selected-news` ile seçim yapar.
  3. `confirm_selection()` → bulletin 'selection_confirmed' olur, NewsItem dokunulmaz.
  4. `consume_news()` → 'used' atanır, UsedNewsRegistry yazılır.

**deduped item ile selectable item sınırı nasıl korunuyor:**
  Dedupe kararları scan-time artifact — DB'ye yazılmayan item bu listede olmaz.
  `get_selectable_news_items()` yalnızca mevcut DB kayıtlarına bakar.
  follow-up accepted item (DB'ye 'new' olarak yazılmış) listede görünür — bu kasıtlı.
  Test 20 bu davranışı belgeler.

**follow-up accepted item'lar sonradan nasıl işaretleniyor:**
  `NewsBulletinSelectedItem.selection_reason` alanında editörün notu olarak saklanır.
  Otomatik işaretleme yapılmaz — editorial sorumluluğundadır.
  Bu bilinçli bir karardır: otomatik işaretleme false-positive riski ile karışır.

**editorial gate nerede başlıyor, nerede bitiyor:**
  Başlangıç: Editörün `POST /selected-news` ile item eklemesi.
  Kapı geçişi: `confirm_selection()` — bulletin 'selection_confirmed' olur.
               Koşul: en az 1 item + bulletin 'draft' durumunda.
  Bitiş: `consume_news()` — 'used' state kazanılır, bulletin 'in_progress' olur.

**Kısıtlar / Borç:**
  - Bulletin 'in_progress' → 'done' geçişi bu chunk'ta yok (M5+ kapsamı).
  - selection_reason otomatik doldurulmuyor — editörün manuel notu bekleniyor.
  - UI entegrasyonu bu chunk'ta yok — backend sözleşme hazır.

**Risk değerlendirmesi:**
- source-state semantics risk: **LOW** — state zinciri net, geçişler izole.
- dedupe false-positive risk: **LOW** (M5-C2'den miras, değişmedi).
- used-news ambiguity risk: **NONE** — "used" tek noktada yazılıyor, test 27 ile kilitli.
- preview-to-final confusion risk: **NONE** — UI değişikliği yok.
- warnings status: **known-nonblocking** — 2 framework seviyesi warning (mock + event loop), uygulama kodu değil.

**Test:** 28 yeni test, 770 toplam.

---

## [2026-04-04] M5-C2 — Scan Engine + Dedupe

**Ne:**
- `backend/app/source_scans/dedupe_service.py` — YENİ: İki katmanlı dedupe servisi.
  `normalize_title()` — küçük harf, noktalama temizleme, boşluk sıkıştırma.
  `title_similarity()` — Jaccard token örtüşmesi (0.0–1.0).
  `evaluate_entry()` — tek entry için dedupe kararı: hard → soft → accepted sırası.
  `build_dedupe_context()` — existing_items listesinden url_map + title_map.
  `DedupeDecision` dataclass — reason, is_suppressed, followup_override, matched_item_id, similarity_score.
  `SOFT_DEDUPE_THRESHOLD = 0.65` — test 24 ile kilitli.
- `backend/app/source_scans/scan_engine.py` — dedupe_service entegrasyonu.
  `execute_rss_scan()` artık `allow_followup` parametresi alıyor.
  `_load_existing_items()` — hard + soft için id/url/title yüklüyor.
  Sayaçlar ayrıştırıldı: `skipped_hard`, `skipped_soft`, `followup_accepted`.
  `dedupe_details` listesi yanıta eklendi — bastırılan/override kararlar.
- `backend/app/source_scans/router.py` — `ScanExecuteRequest` yeni istek gövdesi.
  `allow_followup: bool = False` — varsayılan: soft dedupe aktif.
- `backend/app/source_scans/schemas.py` — `ScanDedupeDetail` ve `ScanExecuteResponse` genişletmesi.

**Hard dedupe tam olarak hangi alanlara dayanıyor:**
  `NewsItem.url` — strip().lower() normalleştirmesi.
  `existing_url_map[norm_url]` → `NewsItem.id` eşleşmesi.
  allow_followup=True ile ATLANAMAZ. Her zaman çalışır.

**Soft dedupe hangi sinyalleri kullanıyor:**
  `NewsItem.title` — `normalize_title()` ile küçük harf + noktalama temizlendi.
  Jaccard benzerliği: len(tokens_a ∩ tokens_b) / len(tokens_a ∪ tokens_b).
  Eşik: 0.65 (yüksek tutulmuş — false positive maliyeti yüksek).
  allow_followup=True ile ATLANIR.

**Follow-up exception ne zaman devreye giriyor:**
  `allow_followup=True` → soft dedupe değerlendirmesi atlanır.
  Hard dedupe korunur — aynı URL kesinlikle yazılmaz.
  Yanıtta `followup_override=True` kararlar `dedupe_details`'te görünür.
  Kullanım senaryosu: önceki taramada görülmüş konunun takip haberi.

**Dedupe kararı açıklanabilir mi:**
  Evet. Her `ScanDedupeDetail` şunu içerir:
  - reason: "hard_url_match" | "soft_title_match" | kabul "accepted"
  - is_suppressed, followup_override
  - matched_item_id: hangi mevcut item'a çarptı
  - similarity_score: 0.0–1.0
  "accepted" kararlar yanıtta yer almaz (gürültüyü azaltmak için).

**Dedupe yüzünden görünmeyen item'lar nasıl izleniyor:**
  `ScanExecuteResponse.dedupe_details` listesi — her bastırılan entry için açık kayıt.
  `skipped_hard`, `skipped_soft` sayaçları — toplam görünürlük kaybı izlenebilir.
  `raw_result_preview_json` (SourceScan) — kalıcı özet.
  NewsItem.status değişmez — mevcut "new" item'lar dokunulmaz.

**`new` / `deduped` / `used` semantik sınırları:**
  - `new`: scan engine tarafından atanır — "henüz işlenmemiş, seçilmemiş"
  - `deduped`: DB'de YOKTUR. Yalnızca scan yanıtında yaşayan geçici etiket.
  - `used`: UsedNewsRegistry ve üst editorial akışının konusu — scan engine dokunmaz.
  Bu sınır test 20, 21, 25 ile kilitlenmiştir.

**Kısıtlar / Borç:**
  - Soft dedupe Jaccard tabanlı — semantik benzerlik (embedding) M6+ kapsamı.
  - Başlık normalizasyonu Türkçe stopword'leri ayırt etmiyor.
  - Soft dedupe yalnızca aynı source_id içindeki item'larla karşılaştırıyor.
    Çapraz kaynak dedupe M5-C2 dışındadır.
  - allow_followup granülerlik: tüm soft'u atlar, tek entry için değil.

**Risk değerlendirmesi:**
- source-state semantics risk: **LOW** — SourceScan/NewsItem sınırı korunuyor.
- dedupe false-positive risk: **LOW** — SOFT_DEDUPE_THRESHOLD=0.65 kasıtlı yüksek.
  Test 24 ile sabitleniyor; değiştirmek için bilinçli karar gerekiyor.
- used-news ambiguity risk: **NONE** — dedupe_service UsedNewsRegistry'ye hiç dokunmuyor.
  Test 25 import-level koruması.
- preview-to-final confusion risk: **NONE** — UI değişikliği yok.
- warnings status: **none** — Bütçe sabit (1 known-nonblocking).

**Test:** 25 yeni test, 742 toplam.

---

## [2026-04-04] M5-C1 — Source Registry + RSS Fetch + Normalization

**Ne:**
- `backend/app/source_scans/scan_engine.py` — YENİ: Gerçek RSS tarama motoru.
  `execute_rss_scan(db, scan_id)` → feedparser ile RSS çekimi, entry normalizasyonu,
  hard dedupe (URL lowercase), NewsItem batch yazımı, SourceScan durum geçişleri.
  `normalize_entry()` — url/title zorunlu; eksikse None (atlanır).
  `_parse_published_at()` — published_parsed veya updated_parsed.
  `_build_dedupe_key()` — url.strip().lower().
  `_load_existing_urls()` — DB'deki mevcut URL'leri yükler.
  Hata yönetimi: feedparser hata → failed; DB yazma hata → rollback + failed.
- `backend/app/source_scans/router.py` — `POST /source-scans/{scan_id}/execute` YENİ endpoint.
  Yalnızca `status="queued"` taramalar çalıştırılabilir; diğerleri 409 döner.
  Senkron çalışır — sonuç doğrudan döner.
- `backend/app/source_scans/schemas.py` — `ScanExecuteResponse` YENİ şema.
  scan_id, status, fetched_count, new_count, skipped_dedupe, skipped_invalid, error_summary.
- `backend/pyproject.toml` — `feedparser>=6.0.0` bağımlılığa eklendi.

**Durum semantiği (önemli):**
- `SourceScan.status`: `queued` → `running` → `completed` | `failed`
  Bu geçişler yalnızca scan_engine içinde yapılır.
- `NewsItem.status`: Tarama motoru SADECE `"new"` atar. `"used"`, `"reviewed"`, `"ignored"`
  geçişleri ayrı iş akışlarına aittir — tarama motoru hiçbir zaman bunları atamaz.
  Bu bir sözleşme, test 22 ile belgelenmiştir.

**Hard dedupe:**
  URL tam eşleşmesi (strip+lowercase). Aynı URL farklı case ile gelirse de yakalanır.
  `dedupe_key = url.strip().lower()` — NewsItem.dedupe_key olarak saklanır.
  Soft dedupe (başlık benzerliği) M5-C2 kapsamındadır; bu chunk'ta yok.

**Kısıtlar / Borç:**
- Yalnızca `source_type="rss"` desteklenir; `manual_url` ve `api` açık hata döner.
- Tarama senkron — büyük feed'lerde yanıt gecikmesi oluşabilir. Async kuyruğa alma M5-C2+ kapsamı.
- `feedparser` boş entry listesi veya ağ hatası durumunda `result` döner ama `status="failed"`.
- Soft dedupe (başlık benzerliği) yok — bu durum bilinçli olarak belgelenmiştir.

**Risk değerlendirmesi (M5 zorunlu alanlar):**
- source-state semantics risk: **LOW** — SourceScan durumları temiz (queued→running→completed/failed).
  NewsItem.status="new" garantisi test 22 ile kilitlenmiş.
- dedupe false-positive risk: **LOW** — Hard dedupe sadece tam URL eşleşmesi yapar; yanlış pozitif
  yoktur (yanlış negatif olabilir: farklı URL ama aynı haber — bu M5-C2 soft dedupe kapsamı).
- used-news ambiguity risk: **NONE** — Tarama motoru "used" kavramıyla hiçbir şekilde temas etmez.
  UsedNewsRegistry ayrı bir iş akışı; scan_engine.py bunu import bile etmez.
- preview-to-final confusion risk: **NONE** — Bu chunk'ta UI değişikliği yok.
- warnings status: **none** — Yeni warning eklenmedi, mevcut budget sabit (1 known-nonblocking).

**Test:** 22 yeni test, 717 toplam.

---

## [2026-04-04] M4-C3 — Preview-First Subtitle Style Selection

**Ne:**
- `subtitle_presets.py` — strict helper vs boundary fallback ayrımı docstring'e eklendi.
  `get_preset()` STRICT (bilinmeyen → ValueError); `get_preset_for_composition()` BOUNDARY FALLBACK
  (bilinmeyen/None → varsayılan). İki davranış bilinçli ve kasıtlı olarak ayrılmış.
- `router.py (standard-video)` — YENİ: `GET /modules/standard-video/subtitle-presets`
  Tüm preset'leri is_default, timing_note, stil alanlarıyla döner.
  `preview_scope: "subtitle_style_only"` — M4-C3 kapsam sınırı API yanıtında görünür.
- `subtitle.py` — `registry=None` geçiş yolu açık teknik borç olarak docstring'e eklendi.
  Production path temizlendi: tüm testler `registry=ProviderRegistry()` kullanıyor.
  `registry=None` davranışsal olarak korunuyor ama yeni kodda kopyalanmayacak.
- `SubtitleStylePicker.tsx` — YENİ: CSS tabanlı stil kartı UI. Remotion/PIL gerektirmez.
  Karaoke örnek satırı (aktif kelime active_color ile); preset seçimi görsel.
  `timingMode="cursor"`: form + kart seviyesinde degrade uyarısı.
  Preview vs final ayrımı: "Önizleme — final video farklı görünebilir" etiketi.
- `useSubtitlePresets.ts` — YENİ: React Query hook, staleTime: Infinity.
- `StandardVideoForm.tsx` — Serbest text input → SubtitleStylePicker.
- `test_m2_c5_subtitle_composition.py` — `SubtitleStepExecutor()` → `SubtitleStepExecutor(registry=ProviderRegistry())`.

**Sistem davranışı:** Kullanıcı artık altyazı stilini kör konfigürasyon yerine görsel stil kartından seçer.
Her kartın renklerini/fontlarını inline görür. Degrade mod (Whisper yok → cursor) form ve kart
seviyesinde uyarıyla görünür kılınmıştır.

**Kısıtlar / Borç:**
- CSS preview → final Remotion çıktısı farklı görünebilir (UI'da açıkça belirtilmiş).
- `registry=None` geçiş davranışı korunuyor — açık teknik borç, yeni kodda kopyalanmayacak.
- PIL thumbnail endpoint tanımlanmadı — CSS preview bu milestone için yeterli.
  Gerçek thumbnail M6 preview altyapısıyla birlikte gelebilir.
- M6 genel preview altyapısına (renderStill, openBrowser singleton) sıfır sızma.

**Test:** 13 yeni test, 695 toplam. 1 known-nonblocking warning (bütçe sabit).

---

## [2026-04-04] M4-C2 — Karaoke Rendering + Style Presets

**Ne:**
- `subtitle_presets.py` — YENİ: `SubtitlePreset` frozen dataclass + 5 preset:
  clean_white, bold_yellow, minimal_dark, gradient_glow, outline_only.
  `get_preset()` ValueError; `get_preset_for_composition()` boundary fallback → varsayılan.
  Preset explosion koruması: yeni preset bu dosyadan geçmek zorunda.
- `executors/composition.py` — `composition_props.json` props bölümüne eklendi:
  `subtitle_style` (preset tam alanları), `word_timing_path`, `timing_mode`.
  `subtitle_style_preset` job input'tan alınır; yoksa/geçersizse clean_white.
  Return değeri ve provider trace'e subtitle_style_preset + timing_mode eklendi.
- `renderer/src/shared/subtitle-contracts.ts` — YENİ: tip sözleşmeleri.
  `WordTiming`, `SubtitleStylePreset`, `TimingMode`, `KaraokeRenderBehavior`.
  `resolveKaraokeRenderBehavior()`: timing_mode → render davranışı.
- `renderer/src/compositions/KaraokeSubtitle.tsx` — YENİ: karaoke component tanımı.
  whisper_word → kelime highlight; whisper_segment → satır highlight;
  cursor (degrade) → düz metin + console.warn.
  Remotion M6'da kurulana kadar aktif edilemez.

**Sistem davranışı:** `composition_props.json` artık subtitle rendering için tam bilgi taşıyor.
timing_mode hattı: subtitle executor → subtitle_metadata.json → composition_props.json →
renderer contract (subtitle-contracts.ts). Degrade mod composition trace'de görünür.

**Kısıtlar / Borç:**
- KaraokeSubtitle.tsx Remotion M6'da aktifleşecek; şu an contract-only.
- Preset seçimi job input'tan geliyor (M4-C3'te UI eklendi).

**Test:** 18 yeni test, 682 toplam. 1 known-nonblocking warning (bütçe sabit).

---

## [2026-04-04] M4-C1 — Whisper Entegrasyonu + Word Timing Data Modeli

**Ne:**
- `capability.py` — `ProviderCapability.WHISPER = "whisper"` eklendi.
- `providers/whisper/local_whisper_provider.py` — YENİ: `LocalWhisperProvider`.
  faster-whisper tabanlı, yerel çalışır, dış API yok.
  `word_timestamps=True` ile kelime-düzeyi zaman damgaları.
  Model önbellekleme: `_model_cache` dict, process ömrü boyunca.
  Hata: ses yoksa `ProviderInvokeError`; faster-whisper kurulu değilse `ConfigurationError`.
  Trace: provider_id, model_size, device, language, word_count, latency_ms.
- `executors/subtitle.py` — YENİ: registry-aware (M4-C1 Whisper entegrasyonu).
  `SubtitleStepExecutor(registry=None)` — registry opsiyonel, cursor fallback.
  Whisper varsa: `whisper_word` (kelime highlight) veya `whisper_segment`.
  `word_timing.json`: {version, timing_mode, language, words, word_count}.
  Ses dosyası eksik / Whisper başarısız → sahne bazında cursor fallback, adım başarısız olmaz.
  `_build_srt` alias → M2-C5 geriye uyum.
- `jobs/dispatcher.py` — `SubtitleStepExecutor(registry=registry)` — artık no-args değil.

**Sistem davranışı:** TTS ses dosyaları Whisper ile transkripte edilir. Her kelime için
{word, start, end, probability, scene} veri üretilir. `word_timing.json` artifact kalıcıdır.
Whisper yoksa step çökmez: cursor modda devam eder, `timing_mode: "cursor"` metadata'da görünür.

**Kısıtlar / Borç:**
- Whisper `faster-whisper` kurulumu gerektirir; yoksa `ConfigurationError` + cursor fallback.
- `registry=None` geçiş yolu — M4-C3'te teknik borç olarak belgelendi.

**Test:** 20 yeni test, 664 toplam. 1 known-nonblocking warning (bütçe sabit).

---

## [2026-04-04] M3-C3 — Provider Health, Admin Surface, Cost Seam

**Ne:**
- `registry.py` — `ProviderEntry`'ye 5 runtime health alanı (invoke_count, error_count,
  last_error, last_used_at UTC datetime, last_latency_ms). `record_outcome(capability, provider_id,
  success, latency_ms, error_message)` metodu; `get_health_snapshot()` → capability bazlı JSON.
- `resolution.py` — Her invoke sonrası `registry.record_outcome()` çağrılır. Başarı: last_used_at
  ve latency güncellenir. Hata: error_count + last_error. time.monotonic ile gecikme ölçümü.
- `kie_ai_provider.py` — trace'e `cost_estimate_usd` alanı eklendi. Token bazlı yaklaşım:
  input $0.075/1M + output $0.30/1M. Gerçek fatura kie.ai dashboard'dan; bu tahmin izleme seam'i.
- `providers/router.py` — YENİ admin endpoint'ler:
    - GET  /providers → capabilities snapshot + defaults
    - POST /providers/default → admin varsayılan provider seçimi
    - POST /providers/{id}/enable → provider'ı etkinleştir
    - POST /providers/{id}/disable → provider'ı devre dışı bırak
- `api/router.py` — providers_router dahil edildi.
- `test_m2_c6_dispatcher_integration.py` — background task warning düzeltmesi:
  asyncio.create_task spy pattern + gather. 1 residual warning mock framework internal'dan geliyor
  (unittest.mock.py:2245) — bloklayıcı değil.

**Sistem davranışı:** Her provider invoke'u sonrası health state otomatik güncellenir.
Admin, GET /providers ile tüm provider'ların durumunu görebilir; POST /providers/default ile
runtime'da varsayılan seçebilir; enable/disable ile zincirden çıkarabilir.

**Kısıtlar / Borç:**
- Health state bellekte: sunucu yeniden başlatıldığında sıfırlanır (kalıcılık M4+).
- cost_estimate_usd tahmin: gerçek fatura değil, izleme seam'i.
- Default seam hâlâ bellekte (settings DB bağlantısı M4+).

**Test:** 18 yeni test, 644 toplam.
**Warnings:** 1 known-nonblocking (mock framework internal, uygulama kodu değil).

---

## [2026-04-04] M3-C2 — İkinci Provider + Fallback Trigger + Runtime Bağlantısı

**Ne (ilk commit):**
- `_openai_compat_base.py` — OpenAI uyumlu HTTP çağrısı paylaşılan helper
- `openai_compat_provider.py` — `OpenAICompatProvider` (base_url/api_key/model parametrik)
- `system_tts_provider.py` — `SystemTTSProvider` noop stub (test seam, üretim değil)
- `KieAiProvider` — `_openai_compat_base` kullanıyor (kod tekrarı kaldırıldı)
- `exceptions.py` — `NonRetryableProviderError`, `InputValidationError`, `ConfigurationError`
- `resolution.py` — NonRetryableProviderError direkt; `fallback_from` trace alanı
- `config.py` / `main.py` / `.env.example` — openai_api_key, ikinci provider kayıtları

**Ne (düzeltme commit — aynı tur):**

Teslim raporunda tespit edildi: LLM ve TTS executor'ları `resolve_and_invoke` kullanmıyordu —
fallback teorik olarak vardı ama pratikte çalışmıyordu. Aynı turda düzeltildi:

- `ScriptStepExecutor` — `llm_provider` → `registry: ProviderRegistry`; invoke `resolve_and_invoke` üzerinden
- `MetadataStepExecutor` — aynı
- `TTSStepExecutor` — `tts_provider` → `registry: ProviderRegistry`; her sahne için `resolve_and_invoke`
- `dispatcher.py` — `get_primary()` yerine `registry` inject; docstring güncellendi
- 7 test dosyası güncellendi (test_m2_c1, test_m2_c3, test_m2_c4, test_m2_c6, test_m3_c1, test_m3_c2) — `resolve_and_invoke` patch stratejisi

**Fallback aktiflik durumu (M3-C2 sonrası):**
- LLM: AKTİF — `resolve_and_invoke(registry, LLM, input)` → KieAI primary, OpenAICompat fallback
- TTS: AKTİF — `resolve_and_invoke(registry, TTS, input)` → EdgeTTS primary, SystemTTS fallback
- VISUALS: AKTİF — VisualsStepExecutor kendi döngüsünde (Pexels→Pixabay, sahne bazında)

NOTE: LLM/TTS `resolve_and_invoke` kullanır; VISUALS executor kendi döngüsünü çalıştırır.
Bu farklı mekanizma bilinçlidir: visuals sahne bazında çalışır (sahne başına farklı provider olabilir),
LLM/TTS job bazında çalışır.

**Mimari kısıtlar korundu:**
- `resolution.py` capability-specific mantık almadı
- Registry tek otorite — dispatcher kaynak kodu değişmedi
- KieAI ve OpenAICompat arasında kod tekrarı yok

**Kısıtlar / Borç:**
- `SystemTTSProvider` üretim için tasarlanmamış; gerçek ses üretmez
- `openai_api_key` boşsa LLM fallback kaydedilmez (kasıtlı)
- `_build_executor_from_registry` if-zinciri 4 dal — 3. modülde refactor noktası olacak

**Test:** 626/626 geçiyor. 20 yeni M3-C2 testi + 7 dosyada imza uyarlaması.

---

## [2026-04-04] M3-C1 — Provider Registry

**Ne:** `ProviderCapability` enum (LLM/TTS/VISUALS), `ProviderRegistry` (kayıt/get_primary/get_chain/admin default seam), `resolve_and_invoke` helper (fallback zinciri + trace zenginleştirme), `_build_executor` geçici köprüsü kaldırıldı, `VisualsStepExecutor` provider-agnostic (`providers: list[BaseProvider]`), `main.py` `_providers` dict kaldırıldı — `provider_registry` singleton kullanıma alındı.

**Sistem davranışı:** Provider çözümleme tek resmi yol: `ProviderRegistry.get_primary()` ve `get_chain()`. Dispatcher artık provider detaylarından bağımsız — registry üzerinden capability bazlı çözümlüyor. Fallback zinciri `resolve_and_invoke` ile orchestrate ediliyor; trace'e `resolution_role` ve `resolved_by` ekleniyor.

**Mimari:**
- `capability.py` — sadece enum (20 satır)
- `registry.py` — kayıt, çözümleme, admin seam (~120 satır)
- `resolution.py` — invoke + fallback + trace (~70 satır)
- `dispatcher.py` — net kod azaldı (_build_executor kaldırıldı, registry'ye delege edildi)

**Kısıtlar:** Admin default seam bellekte tutuluyor (settings registry yok). M3-C3'te settings registry ile bağlanacak.

**Test:** 15 yeni test, 606 toplam. Geriye dönük uyumluluk: M2 testleri yeni imzaya uyarlandı, tüm suite yeşil.

---

## [2026-04-04] M2-C6 — Full Stack Integration (M2 Tamamlandı)

**Ne:** JobDispatcher (orchestration), step_initializer.py, POST /api/v1/jobs endpoint güncellendi (InputNormalizer→create_job→init_steps→dispatch akışı), GET /jobs/{id}/artifacts endpoint'i eklendi. asyncio.create_task GC koruması eklendi (_background_tasks set + done_callback). dispatcher.py, step_initializer.py, router.py sorumluluk ayrımı korundu.
**Sistem davranışı:** `POST /api/v1/jobs` çağrısı artık gerçek pipeline'ı tetikliyor. Job yaratılınca modül tanımından adımlar otomatik oluşturuluyor, workspace dizini başlatılıyor, pipeline arka planda çalışıyor.
**Mimari:** dispatcher.py = orchestration only; step_initializer.py = step setup only; service.py büyümedi.
**Test:** 11 yeni test, 591 toplam. GC fix push öncesi temizlendi (review'da tespit edildi).

---

## [2026-04-04] M2-C5 — Subtitle + Composition (+ executors paketi)

**Ne:** SubtitleStepExecutor (script+audio→SRT, kümülatif zamanlama), CompositionStepExecutor (tüm artifact'lar→composition_props.json, render_status=props_ready), composition_map.py (güvenli static mapping, C-07 uyumu). executors.py → executors/ paketine bölündü (script/metadata/tts/visuals/subtitle/composition/_helpers).
**Sistem davranışı:** Pipeline tüm 6 adımı çalıştırıyor. Composition adımı video render etmiyor (props_ready); gerçek Remotion render M3+ kapsamı.
**Mimari:** AI render kodu üretemiyor — composition_id statik map'ten geliyor. executor dosyaları artık her biri ~150-280 satır, tek sorumluluk.
**Test:** 22 yeni test, 580 toplam.

---

## [2026-04-04] M2-C4 — TTS + Visuals Adımları

**Ne:** TTSStepExecutor (edge-tts, language-aware: TR→AhmetNeural/EN→ChristopherNeural, audio_manifest.json), VisualsStepExecutor (Pexels önce, Pexels boşsa Pixabay fallback, visuals_manifest.json), voice_map.py (merkezi ses eşleştirmesi), artifact_check idempotency her iki executor'da.
**Sistem davranışı:** TTS ve görsel adımları gerçek provider'larla çalışıyor. Kısmi başarı kabul ediliyor (bazı sahneler null), tamamen başarısız → StepExecutionError.
**Mimari:** VOICE_MAP SupportedLanguage enum'u key olarak kullanıyor — magic string yok.
**Test:** 16 yeni test, 558 toplam. Push öncesi dead import (httpx) temizlendi.

---

## [2026-04-04] M2-C3 — Language-Aware Script + Metadata Adımları

**Ne:** language.py (SupportedLanguage enum, resolve_language, UnsupportedLanguageError), step_context.py (StepExecutionContext frozen dataclass), prompt_builder.py (TR/EN için ayrı talimat blokları, LANGUAGE_INSTRUCTIONS merkezi dict), ScriptStepExecutor + MetadataStepExecutor gerçek LLM implementasyonu (kie.ai / Gemini 2.5 Flash). Job.input_data_json alanı + Alembic migration.
**Sistem davranışı:** Script ve metadata adımları language input'una göre doğal dil üretiyor. Geçersiz dil → UnsupportedLanguageError, sessiz fallback yok.
**Mimari:** Dil davranışı hiçbir katmanda hardcode değil — input→context→prompt_builder zinciri üzerinden akıyor.
**Test:** 20 yeni test, 542 toplam. Python 3.9 uyumluluk fix'leri eklendi.

---

## [2026-04-04] M2-C2 — Gerçek Provider Implementasyonları

**Ne:** KieAiProvider (kie.ai OpenAI-uyumlu API, Gemini 2.5 Flash), EdgeTTSProvider (edge-tts, API key gerektirmez), PexelsProvider, PixabayProvider. .env + pydantic-settings ile güvenli config. API key'ler kaynak koda gömülmedi.
**Sistem davranışı:** Gerçek LLM, TTS ve görsel provider'ları mevcut. Provider abstract interface (BaseProvider) üzerinden çağrılıyor.
**Güvenlik:** .env .gitignore'da korumalı. CONTENTHUB_ prefix ile env değişkenleri.
**Test:** 30 yeni test (mock-tabanlı, gerçek API çağrısı yok), 522 toplam.

---

## [2026-04-04] M2-C1 — Modül Sistemi ve Provider Interface

**Ne:** BaseProvider ABC + ProviderOutput dataclass, provider exceptions (ProviderError/InvokeError/NotFoundError), ModuleDefinition/StepDefinition dataclass'ları, ModuleRegistry singleton, standard_video modülü (6 stub executor), InputNormalizer (required alan kontrolü + default doldurma).
**Sistem davranışı:** Modül sistemi kuruldu. standard_video modülü lifespan'da kayıtlı. Pipeline adımları modül tanımından türetilebilir hale geldi.
**Mimari:** BaseProvider interface M3+ fallback/registry altyapısının seam noktası.
**Test:** 33 yeni test, 492 toplam.

---

## [2026-04-04] M1-C4 — Timing ve Startup Recovery

**Ne:** timing.py (elapsed_seconds, format_elapsed, estimate_remaining_seconds, step_progress_fraction — pure functions), recovery.py (run_startup_recovery: stale running job'ları failed olarak işaretler), main.py lifespan handler (recovery startup'ta blocks), update_job_heartbeat, schema computed fields (elapsed_seconds, eta_seconds).
**Sistem davranışı:** Sunucu yeniden başladığında yarım kalan job'lar tespit edilip failed yapılıyor. Job/step response'unda anlık elapsed_seconds mevcut.
**Test:** 40 yeni test, 459 toplam.

---

## [2026-04-04] M1-C3 — SSE Infrastructure

**Ne:** EventBus (per-subscriber asyncio.Queue, sentinel disconnect pattern), GET /api/sse/jobs/{job_id} SSE endpoint (StreamingResponse), PipelineRunner SSE entegrasyonu (optional event_bus inject).
**Sistem davranışı:** Pipeline çalışırken job/step state değişimleri SSE üzerinden yayınlanıyor. Frontend React Query bunları dinleyerek cache invalidation yapabilir.
**Test:** 12 yeni test, bu milestone içinde 43 geçiyor.

---

## [2026-04-04] M1-C2 — Executor + Pipeline Runner + Workspace

**Ne:** workspace.py (per-job dizin yapısı: artifacts/preview/tmp), StepExecutor ABC (step_key() metodu), PipelineRunner (sequential step execution, P-001 gateway uyumu, heartbeat), gateway functions (start/complete/fail job+step), timezone fix (SQLite naive datetime).
**Sistem davranışı:** Job'lar pipeline üzerinden adım adım çalıştırılabiliyor. Tüm state geçişleri gateway üzerinden geçiyor.
**Test:** 31 yeni test. step_type→step_key rename fix (review'da tespit edildi).

---

## [2026-04-04] M1-C1 — Contracts Extension

**Ne:** StepIdempotencyType enum (RE_EXECUTABLE/ARTIFACT_CHECK/OPERATOR_CONFIRM), Job.heartbeat_at, JobStep.idempotency_type + provider_trace_json, Alembic migration a3f1c2d4e5b6.
**Sistem davranışı:** Step'ler artık idempotency sınıfına sahip. Heartbeat crash recovery için izlenebilir.
**Test:** 19 yeni test, 94/94 Phase 1.1+1.2 regresyon testi geçiyor.

---

## [2026-04-04] Phase 1.2 — State Machine Enforcement

**Ne:** Integration Plan Ana Faz 1 Alt Faz 1.2 tamamlandı. Phase 1.1'de tanımlanan state machine contracts service katmanına bağlandı. `backend/app/jobs/exceptions.py` eklendi (JobEngineError, JobNotFoundError, StepNotFoundError, InvalidTransitionError). `backend/app/jobs/service.py` genişletildi: `validate_job_transition`, `validate_step_transition` (saf validasyon, DB yok); `transition_job_status`, `transition_step_status` (validate + canonical side effects + persist); `is_job_terminal`, `is_step_terminal`, `allowed_next_job_statuses`, `allowed_next_step_statuses`, `get_job_step` eklendi. Side effect kuralları deterministic: started_at sadece ilk running'de set edilir; finished_at terminal geçişlerde set edilir; last_error failed'da set, running/retrying/completed/cancelled'da cleared; log_text append-only; artifact_refs_json replace (sağlanırsa); retry_count sadece retrying'de artar. 68 yeni test, 357 toplam backend test PASSED, tsc temiz.
**Sonuç:** Job ve JobStep status değişikliği artık tek resmi path üzerinden geçiyor. Executor, pipeline runner, retry/recovery bu enforcement üstüne oturabilir. Gerçek executor/pipeline/SSE kasıtlı olarak dahil edilmedi.
**Eklenen dosyalar:**
- `backend/app/jobs/exceptions.py`
- `backend/tests/test_job_transitions.py` (68 yeni test)
- `docs/testing/test-report-phase-1.2-state-machine-enforcement.md`
**Değiştirilen dosyalar:**
- `backend/app/jobs/service.py` (Phase 1.2 transition enforcement eklendi)
**Test:** 68 yeni test PASSED, 357 toplam backend test PASSED, tsc temiz

---

## [2026-04-04] Phase 1.1 — Execution Contract Katmanı

**Ne:** Integration Plan Ana Faz 1 (Execution Foundation + SSE Pack) — Alt Faz 1.1 tamamlandı. `backend/app/contracts/` paketi oluşturuldu. Execution motoruna geçmeden önce tüm sözleşmeler tek, çelişkisiz ve testli şekilde tanımlandı: JobStatus/JobStepStatus enum'ları, ArtifactKind/Scope/Durability, ProviderKind/TraceStatus, RetryDisposition, ReviewStateStatus, SSEEventType. JobStateMachine ve StepStateMachine geçiş matrisleri yazıldı ve her geçersiz transition ValueError fırlatıyor. ArtifactRecord, ProviderTrace, RetryHistory, ReviewState Pydantic schema'ları oluşturuldu. SSEEnvelope + 10 payload schema + SSE_PAYLOAD_MAP hazır. WorkspaceLayout (final/preview/tmp/logs/execution) path derivation ve ensure_dirs() yazıldı. Frontend TypeScript mirror (frontend/src/types/execution.ts) eklendi — backend enum'ları ile 1:1 eşleşme. 94 yeni test, tümü geçiyor.
**Sonuç:** Execution contract katmanı oturdu. Executor, pipeline runner, SSE hub, workspace manager, analytics, publish ve review gate bu contract üstüne refactor gerektirmeden inşa edilebilir. Gerçek implementasyon (executor, SSE transport, step runner) kasıtlı olarak bu adıma dahil edilmedi.
**Eklenen dosyalar:**
- `backend/app/contracts/__init__.py`
- `backend/app/contracts/enums.py`
- `backend/app/contracts/state_machine.py`
- `backend/app/contracts/artifacts.py`
- `backend/app/contracts/provider_trace.py`
- `backend/app/contracts/retry_history.py`
- `backend/app/contracts/review_state.py`
- `backend/app/contracts/sse_events.py`
- `backend/app/contracts/workspace.py`
- `frontend/src/types/execution.ts`
- `backend/tests/test_execution_contracts.py` (94 yeni test)
- `docs/testing/test-report-phase-1.1-execution-contract.md`
**Test:** 94 yeni test PASSED, 289 toplam backend test PASSED, tsc temiz

---

## [2026-04-03] Asset Library / Media Resource Management Pack

**Ne:** Asset Library / media resource management omurgasi oturdu. Giris yüzeyi: AdminOverviewPage'e "Varlik Kutuphanesi" quick link eklendi, AdminLayout sidebar'a nav item eklendi, release readiness checklist'e "Varlik Kutuphanesi Omurga hazir" eklendi, deferred note'dan "asset library" ifadesi kaldirildi. Yeni sayfa: AssetLibraryPage (`/admin/assets`) — heading/subtitle/workflow note, 8 asset turu (muzik/font/gorsel/video_klip/overlay/alt_yazi_stili/thumbnail_referans/marka_varligi), 5 tur grubu, aktif arama + tur filtresi, disabled sort (deferred), 6 placeholder asset kaydı, satir tiklamasiyla detail panel (ad/tur/durum/kaynak/notlar/reuse-context/preview-safety), global preview/reference safety notu.
**Sonuc:** Asset Library yüzeyleri urun icinde baslatilabilir, anlasilir ve dogrulanabilir. Omurga oturdu. Gercek media ingestion, binary preview, dosya upload ve drag-drop atama akisi backend entegrasyonu ileride.
**Degistirilen dosyalar:**
- `frontend/src/pages/AdminOverviewPage.tsx` (quick-link-assets, readiness-assets, deferred note guncelleme)
- `frontend/src/app/router.tsx` (assets route + import)
- `frontend/src/app/layouts/AdminLayout.tsx` (Varlik Kutuphanesi nav item)
**Eklenen dosyalar:**
- `frontend/src/pages/admin/AssetLibraryPage.tsx`
- `frontend/src/tests/asset-library-media-resource-management-pack.smoke.test.tsx` (50 yeni test)
- `docs/testing/test-report-asset-library-media-resource-management-pack.md`
**Test:** 2100 toplam test (+50 yeni), tsc temiz, build temiz

---

## [2026-04-03] Phase 318–321 — Final UX / Release Readiness Pack

**Ne:** Final UX / release readiness omurgasi oturdu. Phase 318: Tum deferred/disabled notlar "backend entegrasyonu" kalibina standardize edildi — "ilerideki fazlarda" ve "backend aktif olunca" ifadeleri kaldirildi (ContentLibraryPage, JobDetailPage, AnalyticsOverviewPage, AnalyticsContentPage, AnalyticsOperationsPage, StandardVideoDetailPage). Phase 319: Cross-module UX koheransi — AdminOverviewPage heading testid + workflow note ("Yonetim zinciri") eklendi, UserDashboardPage/UserContentEntryPage/UserPublishEntryPage heading testid'leri eklendi. Phase 320: Release readiness checklist — AdminOverviewPage'e "Urun Hazirlik Durumu" section eklendi (8 alan: Icerik Uretimi, Yayin Akisi, Is Motoru, Sablon Sistemi, Haber Modulu, Ayarlar ve Gorunurluk, Analytics ve Raporlama, Icerik Kutuphanesi — hepsi "Omurga hazir"). Phase 321: Uctan uca dogrulama.
**Sonuc:** Deferred notlar urun genelinde tutarli. Cross-module heading/subtitle/workflow/testid kaliplari hizali. Release readiness yuzeyi admin overview'da gorulur. Omurga oturdu; gercek backend entegrasyonu, asset library, gorsel modernizasyon ileride.
**Degistirilen dosyalar:**
- `frontend/src/pages/AdminOverviewPage.tsx` (heading testid, workflow note, release readiness section)
- `frontend/src/pages/UserDashboardPage.tsx` (heading testid)
- `frontend/src/pages/UserContentEntryPage.tsx` (heading testid)
- `frontend/src/pages/UserPublishEntryPage.tsx` (heading testid)
- `frontend/src/pages/admin/ContentLibraryPage.tsx` (disabled note standardizasyonu)
- `frontend/src/pages/admin/JobDetailPage.tsx` (disabled note standardizasyonu)
- `frontend/src/pages/admin/AnalyticsOverviewPage.tsx` (disabled note standardizasyonu)
- `frontend/src/pages/admin/AnalyticsContentPage.tsx` (deferred note standardizasyonu + testid)
- `frontend/src/pages/admin/AnalyticsOperationsPage.tsx` (deferred note standardizasyonu + testid)
- `frontend/src/pages/admin/StandardVideoDetailPage.tsx` (deferred note standardizasyonu)
- `frontend/src/tests/app.smoke.test.tsx` (multiple element fix)
- `frontend/src/tests/youtube-analytics-pack.smoke.test.tsx` (referans guncelleme)
- `frontend/src/tests/library-gallery-content-management-pack.smoke.test.tsx` (referans guncelleme)
**Eklenen dosyalar:**
- `frontend/src/tests/final-ux-release-readiness-pack.smoke.test.tsx` (32 yeni test)
- `docs/testing/test-report-phase-318-321-final-ux-release-readiness-pack.md`
**Test:** 2050 toplam test (+32 yeni), tsc temiz, build temiz

---

## [2026-04-03] Phase 314–317 — Reporting / Business Intelligence Pack

**Ne:** Reporting / business intelligence omurgasi oturdu. Phase 314: AdminOverviewPage analytics quick link desc guncellendi (raporlama + karar destek), AnalyticsOverviewPage subtitle ve workflow note genisledi (Raporlama zinciri), analytics-reporting-distinction notu eklendi (canli metrikler vs ozetleyici gorunum), sub-nav kartlari genisledi. Phase 315: AnalyticsOperationsPage subtitle genisledi (operasyonel saglik raporu), workflow note yeniden yazildi (Operasyonel rapor zinciri: Is Basari Orani → Retry/Hata → Provider Sagligi → Kaynak Etkisi → Karar Noktasi). Phase 316: AnalyticsContentPage subtitle genisledi (kullanim/performans ozeti), workflow note yeniden yazildi (Kullanim/performans rapor zinciri: Modul Dagilimi → Icerik Uretim → Yayin Basarisi → Sablon/Kaynak Etkisi → Verimlilik Ozeti), modul dagilimi notu verimlilik karari konteksti, kanal ozeti karar destek gorunumu. Phase 317: Uctan uca dogrulama.
**Sonuc:** Reporting / BI yuzeyler urun icinde baslatilabilir, anlasilir ve izlenebilir. Analytics vs raporlama ayrimi net. Operasyonel ve icerik rapor zincirleri kuruldu. Omurga oturdu; gercek backend analytics API, charting, advanced reporting ileride.
**Degistirilen dosyalar:**
- `frontend/src/pages/AdminOverviewPage.tsx` (analytics quick link desc)
- `frontend/src/pages/admin/AnalyticsOverviewPage.tsx` (subtitle, workflow, distinction, channel note, sub-nav)
- `frontend/src/pages/admin/AnalyticsOperationsPage.tsx` (subtitle, workflow note)
- `frontend/src/pages/admin/AnalyticsContentPage.tsx` (subtitle, workflow note, module note)
- `frontend/src/tests/youtube-analytics-pack.smoke.test.tsx` (referans guncelleme)
**Eklenen dosyalar:**
- `frontend/src/tests/reporting-business-intelligence-pack.smoke.test.tsx` (25 yeni test)
- `docs/testing/test-report-phase-314-317-reporting-business-intelligence-pack.md`
**Test:** 2018 toplam test (+25 yeni), tsc temiz, build temiz

---

## [2026-04-03] Phase 310–313 — Automation / Batch Operations Pack

**Ne:** Automation / batch operations omurgasi oturdu. Phase 310: AdminOverviewPage jobs quick link desc guncellendi (kuyruk + toplu operasyon konteksti), JobsRegistryPage subtitle eklendi (kuyruk durumu ve toplu operasyon gorunumu). Phase 311: JobsRegistryPage workflow note yeniden yazildi (Is akis zinciri: Olusturma → Kuyruga Alma → Adim Isleme → Tamamlama/Hata → Yayin Hazirligi), JobOverviewPanel satirlari Turkish label'lara gecti (Is Kimlik, Modul Turu, Durum, Aktif Adim, Yeniden Deneme Sayisi, Sahip, Sablon, Calisma Alani, Toplam Gecen Sure, Tahmini Kalan, Son Hata, Olusturulma, Baslanma, Tamamlanma), publish note genisledi. Phase 312: JobDetailPage workflow note genisledi (retry/cancel/skip referansi), Operasyonel Aksiyonlar paneli eklendi — Retry/Cancel/Skip aksiyon kartlari ve backend entegrasyonu notu. Phase 313: Uctan uca dogrulama.
**Sonuc:** Automation / batch operations yuzeyler urun icinde baslatilabilir, anlasilir ve izlenebilir. Admin overview'dan giris, jobs registry'de kuyruk/batch konteksti, job detail'de operasyonel aksiyonlar gorunur. Omurga oturdu; gercek backend entegrasyonu, bulk aksiyon API, queue scheduler ileride.
**Degistirilen dosyalar:**
- `frontend/src/pages/AdminOverviewPage.tsx` (jobs quick link desc)
- `frontend/src/pages/admin/JobsRegistryPage.tsx` (subtitle + workflow note)
- `frontend/src/pages/admin/JobDetailPage.tsx` (workflow note + actions panel)
- `frontend/src/components/jobs/JobOverviewPanel.tsx` (Turkish labels + publish note)
- `frontend/src/tests/youtube-publish-workflow-pack.smoke.test.tsx` (referans guncellemeleri)
**Eklenen dosyalar:**
- `frontend/src/tests/automation-batch-operations-pack.smoke.test.tsx` (23 yeni test)
- `docs/testing/test-report-phase-310-313-automation-batch-operations-pack.md`
**Test:** 1993 toplam test (+23 yeni), tsc temiz, build temiz

---

## [2026-04-03] Phase 305–309 — Admin / Advanced Settings Governance Pack

**Ne:** Admin / advanced settings governance omurgasi oturdu. Phase 305: SettingsRegistryPage heading "Ayar Kayitlari" + subtitle + workflow note (Tanimlama → Gruplama → Governance Kontrolu → Kullanici/Wizard Gorunurlugu). Phase 306: SettingDetailPanel governance section gruplama — Kimlik ve Deger (Anahtar, Grup, Tur, Varsayilan Deger, Admin Degeri), Governance (Kullanici Gorunur, Override Izni, Wizard Gorunur, Salt Okunur), Kapsam ve Durum (Modul Kapsami, Aciklama, Durum, Versiyon). Phase 307: VisibilityRegistryPage heading "Gorunurluk Kurallari" + subtitle + workflow note (Kural Tanimlama → Hedef Belirleme → Rol/Mod Kapsami → Wizard Durumu). Phase 308: VisibilityRuleDetailPanel governance section gruplama — Kimlik ve Hedef, Kapsam, Governance, Durum ve Notlar. Phase 309: AdminOverviewPage settings quick link governance desc + end-to-end dogrulama.
**Sonuc:** Settings ve visibility registry'ler governance-odakli aciklamalara ve section gruplama'ya kavustu. Detail panel'ler bolumlu gorunum sunuyor: kimlik, governance, kapsam/durum. Admin overview'da settings quick link governance kontekstini yansitivor. Omurga oturdu; admin duzenleme aksiyonlari, kural ekleme/silme UI'i ileride.
**Degistirilen dosyalar:**
- `frontend/src/pages/admin/SettingsRegistryPage.tsx` (heading + subtitle + workflow note)
- `frontend/src/components/settings/SettingDetailPanel.tsx` (section gruplama + Turkish labels + testids)
- `frontend/src/pages/admin/VisibilityRegistryPage.tsx` (heading + subtitle + workflow note)
- `frontend/src/components/visibility/VisibilityRuleDetailPanel.tsx` (section gruplama + Turkish labels + testids)
- `frontend/src/pages/AdminOverviewPage.tsx` (settings quick link desc)
- `frontend/src/tests/settings-registry.smoke.test.tsx` (heading + detail heading referansi guncelleme)
- `frontend/src/tests/visibility-registry.smoke.test.tsx` (heading + detail heading referansi guncelleme)
**Eklenen dosyalar:**
- `frontend/src/tests/admin-advanced-settings-governance-pack.smoke.test.tsx` (23 yeni test)
- `docs/testing/test-report-phase-305-309-admin-advanced-settings-governance-pack.md`
**Test:** 1970 toplam test (+23 yeni), tsc temiz, build temiz

---

## [2026-04-03] Phase 299–304 — Library / Gallery / Content Management Pack

**Ne:** Library / gallery / content management omurgasi oturdu. Phase 299: ContentLibraryPage olusturuldu, AdminOverviewPage'e library quick link, sidebar'a Icerik Kutuphanesi linki, UserContentEntryPage'e library crosslink eklendi. Phase 300: Birlesik icerik listesi — standard video + news bulletin ayni tabloda, status badge, tarih siralamasi, bos durum mesaji. Phase 301: Filtre ve Arama section'i — search input, icerik turu select, durum select, siralama select (disabled, backend bekleniyor). Phase 302: StandardVideoRegistryPage heading "Standart Video Kayitlari" + testid + workflow note, StandardVideoDetailPage'e library back-link ve manage note eklendi. Phase 303: Icerik Yonetim Aksiyonlari section'i — duzenleme, yeniden kullanma, klonlama aksiyonlari gorunur. Phase 304: End-to-end dogrulama.
**Sonuc:** Library / content management yuzeyler urun icinde baslatilabilir, anlasilir ve izlenebilir. Admin overview'dan giris, sidebar'dan navigasyon, birlesik icerik listesi, detay baglantisi ve yonetim aksiyonlari gorunur. Omurga oturdu; filtre etkinlestirme, klonlama API, gallery mod, bulk operations ileride.
**Degistirilen dosyalar:**
- `frontend/src/app/router.tsx` (library route)
- `frontend/src/app/layouts/AdminLayout.tsx` (sidebar library link)
- `frontend/src/pages/AdminOverviewPage.tsx` (library quick link)
- `frontend/src/pages/admin/StandardVideoRegistryPage.tsx` (heading testid + workflow note)
- `frontend/src/pages/admin/StandardVideoDetailPage.tsx` (library back-link + manage note)
- `frontend/src/pages/UserContentEntryPage.tsx` (library crosslink)
- `frontend/src/components/layout/AppSidebar.tsx` (duplicate key fix)
- `frontend/src/tests/standard-video-registry.smoke.test.tsx` (heading referansi guncelleme)
**Eklenen dosyalar:**
- `frontend/src/pages/admin/ContentLibraryPage.tsx`
- `frontend/src/tests/library-gallery-content-management-pack.smoke.test.tsx` (31 yeni test)
- `docs/testing/test-report-phase-299-304-library-gallery-content-management-pack.md`
**Test:** 1947 toplam test (+31 yeni), tsc temiz, build temiz

---

## [2026-04-03] Phase 293–298 — YouTube Analytics Pack

**Ne:** YouTube analytics omurgasi oturdu. Phase 293: AdminOverviewPage'e analytics quick link, AdminLayout sidebar'a Analytics section ve link, AnalyticsOverviewPage olusturuldu (heading, subtitle, workflow zinciri). Phase 294: Temel Metrikler section'i — 6 metrik karti (yayin sayisi, basarisiz yayin, is basari orani, ort. uretim suresi, retry orani, provider hata orani). Phase 295: AnalyticsContentPage — video performans tablosu, modul dagilimi, standard video referansi. Phase 296: Kanal Ozeti — 3 metrik karti (toplam icerik, aktif moduller, sablon etkisi), video-level/kanal-level ayrimi. Phase 297: Filtre ve Tarih Araligi — date inputlari, modul select, devre disi notu. Phase 298: AnalyticsOperationsPage — is performansi, provider sagligi, kaynak etkisi; end-to-end dogrulama.
**Sonuc:** Analytics yuzeyler urun icinde baslatilabilir, anlasilir ve izlenebilir. Admin overview'dan giris, sidebar'dan navigasyon, overview'da temel metrikler + kanal ozeti + filtreler, alt sayfalarda icerik performansi ve operasyon metrikleri gorunur. Omurga oturdu; gercek veri entegrasyonu (backend API), charting ve advanced dashboard ileride.
**Degistirilen dosyalar:**
- `frontend/src/app/router.tsx` (3 analytics route)
- `frontend/src/app/layouts/AdminLayout.tsx` (sidebar analytics section + link)
- `frontend/src/pages/AdminOverviewPage.tsx` (analytics quick link)
**Eklenen dosyalar:**
- `frontend/src/pages/admin/AnalyticsOverviewPage.tsx`
- `frontend/src/pages/admin/AnalyticsContentPage.tsx`
- `frontend/src/pages/admin/AnalyticsOperationsPage.tsx`
- `frontend/src/tests/youtube-analytics-pack.smoke.test.tsx` (38 yeni test)
- `docs/testing/test-report-phase-293-298-youtube-analytics-pack.md`
**Test:** 1916 toplam test (+38 yeni), tsc temiz, build temiz

---

## [2026-04-03] Phase 287–292 — YouTube Publish Workflow Pack

**Ne:** YouTube publish workflow omurgasi oturdu. Phase 287: UserPublishEntryPage'de 3 kart aciklamasi yayin readiness kontekstiyle guncellendi, yayin zinciri (Icerik Uretimi → Readiness Kontrolu → Metadata Finalizasyonu → YouTube Yayini → Sonuc Takibi) eklendi. Phase 288: JobsRegistryPage heading "Uretim Isleri" + workflow note, AdminOverviewPage jobs quick link desc guncellendi. Phase 289: JobDetailPage workflow note'a yayin hazirlik durumu referansi, JobOverviewPanel'e heading testid ve publish readiness notu eklendi. Phase 290: StandardVideoDetailPage workflow chain'e yayin sureci referansi eklendi. Phase 291-292: Cross-surface tutarlilik dogrulamasi ve end-to-end verification.
**Sonuc:** Yayin zinciri tum yuzeylerden gorunur ve tutarli. Kullanici publish entry'den baslayip jobs→job detail→overview→standard video detail zincirinde yayin kontekstini her adimda gorebilir. Omurga oturdu; gercek YouTube API entegrasyonu, yayin butonu, sonuc feedback mekanizmasi ileride.
**Degistirilen dosyalar:**
- `frontend/src/pages/UserPublishEntryPage.tsx` (kart desc'leri + workflow chain)
- `frontend/src/pages/admin/JobsRegistryPage.tsx` (heading testid + workflow note)
- `frontend/src/pages/admin/JobDetailPage.tsx` (workflow note yayin referansi)
- `frontend/src/pages/admin/StandardVideoDetailPage.tsx` (workflow chain yayin referansi)
- `frontend/src/pages/AdminOverviewPage.tsx` (jobs quick link desc)
- `frontend/src/components/jobs/JobOverviewPanel.tsx` (heading testid + publish note)
- `frontend/src/tests/jobs-registry.smoke.test.tsx` (heading referansi guncelleme)
**Eklenen dosyalar:**
- `frontend/src/tests/youtube-publish-workflow-pack.smoke.test.tsx` (20 yeni test)
- `docs/testing/test-report-phase-287-292-youtube-publish-workflow-pack.md`
**Test:** 1878 toplam test (+20 yeni, +3 guncellenen), tsc temiz, build temiz

---

## [2026-04-03] Phase 282–286 — Template / Style / Blueprint Pack

**Ne:** Template / Style / Blueprint sistemi omurgasi oturdu. Phase 282: Admin overview quick link, templates/style blueprints/links registry heading'leri, workflow note'lari ve button copy'leri guncellendi. Phase 283: Template create page'e workflow subtitle eklendi, detail panele workflow note eklendi. Phase 284: Style blueprint create'e farkli rolunu anlatan subtitle eklendi, detail panele gorsel/yapisal kural notu eklendi. Phase 285: Template-style link create'e baglanti amacini anlatan subtitle eklendi, detail panele workflow note eklendi. Phase 286: End-to-end dogrulama — tum giris noktalari, registry, create, detail panelleri calisiyor.
**Sonuc:** Template/Style/Blueprint sistemi urun icinde baslatilabilir, anlasilir ve izlenebilir. Admin overview'dan giris, sidebar'dan navigasyon, create ekranlarinda workflow rolu, detail panellerinde uretim hattindaki yeri gorunur. Omurga oturdu; preview-first UX, AI-assisted style variants, version locking ve analytics ileride.
**Degistirilen dosyalar:**
- `frontend/src/pages/admin/TemplateCreatePage.tsx` (heading testid + workflow subtitle)
- `frontend/src/pages/admin/TemplatesRegistryPage.tsx` (heading testid + workflow note + button)
- `frontend/src/pages/admin/StyleBlueprintCreatePage.tsx` (heading testid + workflow subtitle)
- `frontend/src/pages/admin/StyleBlueprintsRegistryPage.tsx` (heading testid + workflow note + button)
- `frontend/src/pages/admin/TemplateStyleLinkCreatePage.tsx` (heading testid + workflow subtitle)
- `frontend/src/pages/admin/TemplateStyleLinksRegistryPage.tsx` (heading testid + workflow note + button)
- `frontend/src/pages/AdminOverviewPage.tsx` (templates quick link desc)
- `frontend/src/components/templates/TemplateDetailPanel.tsx` (heading testid + workflow note)
- `frontend/src/components/style-blueprints/StyleBlueprintDetailPanel.tsx` (heading testid + workflow note)
- `frontend/src/components/template-style-links/TemplateStyleLinkDetailPanel.tsx` (heading testid + workflow note)
- 6 mevcut test dosyasi (testid + button guncelleme)
**Eklenen dosyalar:**
- `frontend/src/tests/template-style-blueprint-pack.smoke.test.tsx` (23 yeni test)
- `docs/testing/test-report-phase-282-286-template-style-blueprint-pack.md`
**Test:** 1861 toplam test (+23 yeni), tsc temiz, build temiz

---

## [2026-04-03] Phase 276–281 — News Workflow Pack

**Ne:** News workflow omurgasi oturdu. Phase 276: Giris noktalarinda (user content entry, admin quick access, post-onboarding handoff) haber bulteni "ikinci uretim akisi" olarak konumlandirildi. Create page'e workflow intro subtitle ve zincir aciklamasi eklendi. Registry page heading ve workflow notu guncellendi. Phase 277: Workflow zinciri (Kaynak Tarama → Haber Secimi → Bulten Kaydi → Script → Metadata → Uretim) create ve detail yuzeylerinde gorunur kilindi. Phase 278: Selected items paneline kurasyon notu eklendi. Phase 279: Script paneline generation notu eklendi. Phase 280: Metadata paneline context notu eklendi, detail panel workflow zinciri guncellendi. Phase 281: End-to-end dogrulama — tum giris noktalari, create, registry, detail, curation, script, metadata zinciri calisiyor.
**Sonuc:** Kullanici news workflow'u baslatabilir, her adimi anlayabilir ve takip edebilir. Workflow entry → create → registry → detail (secili haberler + script + metadata) zinciri gorunur ve tutarli. Omurga oturdu; derin modul isleri (AI enrichment, semantic dedupe, job entegrasyonu, publish akisi) ileride.
**Degistirilen dosyalar:**
- `frontend/src/pages/admin/NewsBulletinCreatePage.tsx` (heading h2+testid, workflow subtitle, workflow chain)
- `frontend/src/pages/admin/NewsBulletinRegistryPage.tsx` (heading h2+testid, workflow note, button copy)
- `frontend/src/pages/UserContentEntryPage.tsx` (news bulletin card desc)
- `frontend/src/pages/AdminOverviewPage.tsx` (news bulletins quick link desc)
- `frontend/src/components/dashboard/PostOnboardingHandoff.tsx` (haber bulteni vurgusu)
- `frontend/src/components/news-bulletin/NewsBulletinDetailPanel.tsx` (heading testid, workflow chain note)
- `frontend/src/components/news-bulletin/NewsBulletinSelectedItemsPanel.tsx` (heading testid, curation note)
- `frontend/src/components/news-bulletin/NewsBulletinScriptPanel.tsx` (heading testid, generation note)
- `frontend/src/components/news-bulletin/NewsBulletinMetadataPanel.tsx` (heading testid, context note)
- `frontend/src/tests/news-bulletin-registry.smoke.test.tsx` (testid guncelleme)
- `frontend/src/tests/news-bulletin-form.smoke.test.tsx` (testid guncelleme)
**Eklenen dosyalar:**
- `frontend/src/tests/news-workflow-pack.smoke.test.tsx` (18 yeni test)
- `docs/testing/test-report-phase-276-281-news-workflow-pack.md`
**Test:** 1838 toplam test (+18 yeni), tsc temiz, build temiz

---

## [2026-04-03] Phase 269–275 — Video Workflow Pack

**Ne:** Standard Video workflow omurgasi oturdu. Phase 269: Create ekranina workflow baslangic aciklamasi ve testid eklendi. Phase 270-271: Detail ekranina uretim zinciri aciklamasi (Kayit → Script → Metadata → TTS → Altyazi → Kompozisyon) ve testid eklendi. Phase 272: TTS/Altyazi/Kompozisyon adimlari zincir referansinda gorunur kilindi. Phase 273: Job detail'e workflow takip notu ve testid eklendi. Phase 274: Detail/review/artifacts yuzeylerinin workflow ile baglantisi korundu. Phase 275: End-to-end dogrulama — tum giris noktalari, create, detail, job detail ve timeline zinciri calisiyor.
**Sonuc:** Kullanici video uretim akisini baslatabilir, her adimi anlayabilir ve takip edebilir. Workflow create → detail (script + metadata) → job progress → timeline zinciri gorunur ve tutarli. Omurga oturdu; derin modul isleri (TTS/subtitle/composition pipeline, backend job entegrasyonu, review gate) ileride.
**Degistirilen dosyalar:**
- `frontend/src/pages/admin/StandardVideoCreatePage.tsx` (heading testid + workflow subtitle)
- `frontend/src/pages/admin/StandardVideoDetailPage.tsx` (heading testid + workflow chain note)
- `frontend/src/pages/admin/JobDetailPage.tsx` (heading testid + workflow tracking note)
**Eklenen dosyalar:**
- `frontend/src/tests/video-workflow-pack.smoke.test.tsx` (14 yeni test)
- `docs/testing/test-report-phase-269-275-video-workflow-pack.md`
**Test:** 1820 toplam test (+14 yeni), tsc temiz, build temiz

---

## [2026-04-03] Phase 268 — Video Workflow Entry Map

**Ne:** Video uretim akisina giden mevcut giris noktalarindaki copy/aciklama netligi arttirildi. Content entry Standart Video karti, admin overview "Yeni Video Olustur" quick link ve PostOnboardingHandoff aciklamasina "Ana uretim akisi" / "Video uretimi ana icerik akisinizdir" vurgusu eklendi. Admin overview quick link kartlarina `data-testid` eklendi.
**Sonuc:** Kullanici "video uretimine nereden baslarim?" sorusunu daha az soruyor. Dort ana giris noktasi (handoff, hub, content entry, admin quick access) video uretimini ana akis olarak konumlandiriyor.
**Degistirilen dosyalar:**
- `frontend/src/pages/UserContentEntryPage.tsx` (video kart desc)
- `frontend/src/pages/AdminOverviewPage.tsx` (video quick link desc + tum quick link testid'ler)
- `frontend/src/components/dashboard/PostOnboardingHandoff.tsx` (video uretimi vurgusu)
**Eklenen dosyalar:**
- `frontend/src/tests/video-workflow-entry-map.smoke.test.tsx` (11 yeni test)
**Test:** 1806 toplam test (+11 yeni), tsc temiz, build temiz

---

## [2026-04-03] Phase 264–267 — Navigation Closure Pack (ANA FAZ 2 KAPANIŞI)

**Ne:** Ana Faz 2'nin kalan navigation bosluklari tek pakette kapatildi. Phase 264: content/publish subtitle'lara gorev zinciri pozisyonu eklendi ("ikinci adim" / "ucuncu adim"). Phase 265: admin overview subtitle fiil-odakli hale getirildi, SUBTITLE style maxWidth/margin ve CARD borderRadius/transition user ile hizalandi, quick access heading testid eklendi. Phase 266: tum navigation yuzeylerinde tutarlilik kontrol edildi, bariz bosluk bulunmadi. Phase 267: Ana Faz 2 resmi olarak kapatildi.
**Sonuc:** User panelde gorev zinciri (baslangic → icerik → yayin → yonetim) her yuzeyden gorunur. Admin panelde "burada ne yapabilirim?" sorusuna hemen cevap veriliyor. User ve admin yuzeyleri ayni urun ailesine ait, farkli amacli iki yuzeyi gibi davraniyorlar. Ana Faz 2 tamamlandi.
**Degistirilen dosyalar:**
- `frontend/src/pages/UserContentEntryPage.tsx` (task-chain pozisyonu)
- `frontend/src/pages/UserPublishEntryPage.tsx` (task-chain pozisyonu)
- `frontend/src/pages/AdminOverviewPage.tsx` (subtitle, style, testid)
**Eklenen dosyalar:**
- `frontend/src/tests/navigation-closure-pack.smoke.test.tsx` (17 yeni test)
**Test:** 1795 toplam test (+17 yeni), tsc temiz, build temiz
**ANA FAZ 2 KAPATILDI. Siradaki: Ana Faz 3 — Video uretim zinciri**

---

## [2026-04-03] Phase 263 — User/Admin Route Intent Clarity Pass

**Ne:** User ve admin panellerinin rolleri urun diliyle belirginlestirildi. User dashboard "Baslangic ve takip merkezi" olarak tanimlandi, admin overview "Uretim ve yonetim merkezi" olarak tanimlandi. Her iki panel kendi subtitle'inda karsi panelin rolune referans veriyor. Continuity strip mesaji intent odakli hale getirildi. DashboardActionHub admin kart desc'ine "uretim ve yonetim merkezi" kimlik vurgusu eklendi. Admin overview'a data-testid eklendi.
**Sonuc:** Kullanici panel gecislerinin nedenini daha net anliyor. "Baslangic/takip" vs "uretim/yonetim" ayrimi her yuzeyden gorunur. Panel rolleri birbirini tamamlayan ama farkli amaclara hizmet eden iki yuzeyi ifade ediyor.
**Degistirilen dosyalar:**
- `frontend/src/pages/UserDashboardPage.tsx` (subtitle intent)
- `frontend/src/pages/AdminOverviewPage.tsx` (subtitle intent + testid)
- `frontend/src/components/layout/AdminContinuityStrip.tsx` (strip copy intent)
- `frontend/src/components/dashboard/DashboardActionHub.tsx` (admin kart desc)
- `frontend/src/tests/admin-continuity-strip.smoke.test.tsx` (metin)
- `frontend/src/tests/admin-to-user-return-clarity.smoke.test.tsx` (metin)
- `frontend/src/tests/user-nav-state-clarity.smoke.test.tsx` (metin)
- `frontend/src/tests/user-route-landing-consistency.smoke.test.tsx` (metin)
**Eklenen dosyalar:**
- `frontend/src/tests/user-admin-route-intent-clarity.smoke.test.tsx` (11 yeni test)
**Test:** 1778 toplam test (+11 yeni), tsc temiz, build temiz

---

## [2026-04-03] Phase 262 — Panel Switch Destination Clarity Pass

**Ne:** Header panel switch butonunun copy'si salt panel isminden fiil iceren yonlu metne donusturuldu. "Yonetim Paneli" → "Yonetim Paneline Gec", "Kullanici Paneli" → "Kullanici Paneline Gec". Ayrica title ve aria-label ile erisilebilirlik ve hover ipucu eklendi. CTA kalip sistemiyle uyumlu yeni "X Gec" gecis kalibi olusturuldu.
**Sonuc:** Kullanici panel switch'e bastiginda nereye gidecegini hemen anliyor. Buton sadece hedef ismi degil, bir eylem ifade ediyor. Panel gecisi daha bilinçli bir hareket gibi hissediliyor.
**Degistirilen dosyalar:**
- `frontend/src/components/layout/AppHeader.tsx` (switchLabel fiil, switchTitle, title + aria-label)
- `frontend/src/tests/app.smoke.test.tsx` (switch text + title dogrulamalari)
**Eklenen dosyalar:**
- `frontend/src/tests/panel-switch-destination-clarity.smoke.test.tsx` (10 yeni test)
**Test:** 1767 toplam test (+10 yeni), tsc temiz, build temiz

---

## [2026-04-03] Phase 261 — User Panel Cross-Link Recovery Pass

**Ne:** Content ve publish yuzeylerinde sidebar'a bagimli kalmadan section'lar arasi toparlayici cross-link recovery baglantilari eklendi. Content sayfasinda "Yayin ekranina gecebilirsiniz" linki, publish sayfasinda "Icerik ekraninden baslayabilirsiniz" linki eklendi. Dashboard'a degisiklik yapilmadi (hub kartlari yeterli).
**Sonuc:** Kullanici yanlis bolumde olsa bile sayfa icinden dogru sonraki adima kolayca gecebiliyor. Section'lar arasi akis sidebar'dan bagimsiz olarak da calisiyor. User panel daha "akisi olan" bir urun yuzeyine donustu.
**Degistirilen dosyalar:**
- `frontend/src/pages/UserContentEntryPage.tsx` (CROSSLINK const + publish cross-link)
- `frontend/src/pages/UserPublishEntryPage.tsx` (CROSSLINK const + content cross-link)
**Eklenen dosyalar:**
- `frontend/src/tests/user-cross-link-recovery.smoke.test.tsx` (8 yeni test)
**Test:** 1757 toplam test (+8 yeni), tsc temiz, build temiz

---

## [2026-04-03] Phase 260 — User Panel Route Landing Consistency Pass

**Ne:** Uc user route (/user, /user/content, /user/publish) arasindaki yapisal tutarlilik hizalandi. Dashboard SUBTITLE margin "0 0 1.25rem"→"0 0 1.5rem" (content/publish ile esit). Publish CARD style'a `transition: "border-color 0.15s"` eklendi (content ile esit). Content SUBTITLE'a `maxWidth: "720px"` eklendi (zaten baslangicta yapilmisti). Her route'un landing yapisini dogrulayan 12 yeni test eklendi.
**Sonuc:** Uc user yuzeyi style tutarliligini koruyor. Heading → subtitle → cards → note sirasi her route'da esit. CARD hover animasyonu content/publish arasindan farki kalkmis.
**Degistirilen dosyalar:**
- `frontend/src/pages/UserDashboardPage.tsx` (SUBTITLE margin)
- `frontend/src/pages/UserPublishEntryPage.tsx` (CARD transition)
- `frontend/src/pages/UserContentEntryPage.tsx` (SUBTITLE maxWidth)
**Eklenen dosyalar:**
- `frontend/src/tests/user-route-landing-consistency.smoke.test.tsx` (12 yeni test)
**Test:** 1749 toplam test (+12 yeni), tsc temiz, build temiz

---

## [2026-04-03] Phase 259 — User Panel Section Transition Clarity Pass

**Ne:** User panel section'lari arasindaki gecis duygusunu guclendiren copy iyilestirmeleri yapildi. Dashboard action hub aciklamasi akis sirasi veriyor: "Once icerik olusturun, ardindan yayin surecini takip edin." Hub kartlarinda "Ilk adim" (Icerik) ve "Sonraki adim" (Yayin) vurgusu eklendi. Content subtitle'a "Tamamlanan icerikler Yayin ekraninda takip edilebilir" referansi, publish subtitle'a "Icerik ekraninda olusturulan" kaynak referansi eklendi.
**Sonuc:** Kullanici section degistirdiginde baglam kaybetmiyor. Icerik→yayin akisi her yuzeyden gorunur. Uc section daha butunluklu hissediliyor.
**Degistirilen dosyalar:**
- `frontend/src/components/dashboard/DashboardActionHub.tsx` (hub desc + kart desc)
- `frontend/src/pages/UserContentEntryPage.tsx` (subtitle yayin referansi)
- `frontend/src/pages/UserPublishEntryPage.tsx` (subtitle icerik referansi)
- `frontend/src/tests/user-content-entry.smoke.test.tsx` (metin guncelleme)
**Eklenen dosyalar:**
- `frontend/src/tests/user-section-transition-clarity.smoke.test.tsx` (8 yeni test)
**Test:** 1737 toplam test (+8 yeni), tsc temiz, build temiz

---

## [2026-04-03] Phase 258 — User Panel Navigation State Clarity Pass

**Ne:** User panel icindeki uc ana yuzeyde section kimligi netlestirildi. Dashboard context note "Baslangic merkezi", content subtitle "Icerik uretim merkezi", publish subtitle "Yayin ve dagitim merkezi" olarak guncellendi. Dashboard subtitle stili content/publish ile tutarli hale getirildi. Publish entry'deki "adiminahazirlanan" typo'su duzeltildi. Sidebar aktif state, heading ve subtitle uyumu test edildi.
**Sonuc:** Kullanici user panelde bolum degistirdiginde yon kaybetmiyor. Her sayfa kendi rolunu acikca anlatiyor. Navigation state ile page content daha tutarli hissediliyor.
**Degistirilen dosyalar:**
- `frontend/src/pages/UserDashboardPage.tsx` (subtitle stili + section kimlik)
- `frontend/src/pages/UserContentEntryPage.tsx` (section kimlik + testid)
- `frontend/src/pages/UserPublishEntryPage.tsx` (section kimlik + testid + typo fix)
- `frontend/src/tests/admin-to-user-return-clarity.smoke.test.tsx` (metin guncelleme)
**Eklenen dosyalar:**
- `frontend/src/tests/user-nav-state-clarity.smoke.test.tsx` (9 yeni test)
**Test:** 1729 toplam test (+9 yeni), tsc temiz, build temiz

---

## [2026-04-03] Phase 257 — Cross-Surface CTA Consistency Pass

**Ne:** User dashboard, handoff, content/publish entry ve admin continuity yuzeylerindeki CTA dili urun genelinde tutarli hale getirildi. PostOnboardingHandoff: "Yeni Icerik Olustur"→"Yeni Video Olustur" (hedef spesifikligine uyumlu), "Yonetim Paneli"→"Yonetim Paneline Git" (navigasyon kalibina uyumlu). DashboardActionHub: "Panele Git"→"Yonetim Paneline Git". Handoff aciklama metni CTA'larla daha uyumlu hale getirildi.
**Sonuc:** Kullanici farkli ekranlarda ayni isi yapan ama farkli konusan butonlar gormuyor. Navigasyon "X Git", olusturma "Yeni X Olustur", goruntuleme "X Goruntule", donus "X Don" kaliplari tutarli.
**Degistirilen dosyalar:**
- `frontend/src/components/dashboard/PostOnboardingHandoff.tsx` (CTA + aciklama)
- `frontend/src/components/dashboard/DashboardActionHub.tsx` (admin CTA)
- `frontend/src/tests/post-onboarding-handoff.smoke.test.tsx` (metin guncelleme)
- `frontend/src/tests/dashboard-action-hub.smoke.test.tsx` (metin guncelleme)
**Test:** 1720 toplam test, tsc temiz, build temiz

---

## [2026-04-03] Phase 256 — User Panel Empty/No-Action State Clarity Pass

**Ne:** User panel yuzeylerine first-use/empty-state yonlendirme metinleri eklendi. Dashboard onboarding-pending mesaji aksiyonel hale getirildi ("kurulum adimlarini tamamlayin"). Content entry note'a "ilk iceriginizi baslatabilirsiniz" yonlendirmesi eklendi. Publish entry note'a "once Icerik ekranindan bir icerik olusturun" icerik→yayin akisi aciklamasi eklendi.
**Sonuc:** Kullanici user panelde ilk gelisinde veya henuz veri/is yokken ne yapacagini anlayabiliyor. Bos ekran hissi azaldi, her yuzey kullaniciyi eyleme yonlendiriyor.
**Degistirilen dosyalar:**
- `frontend/src/pages/UserDashboardPage.tsx` (pending note guncellendi, testid eklendi)
- `frontend/src/pages/UserContentEntryPage.tsx` (first-use note guncellendi, testid eklendi)
- `frontend/src/pages/UserPublishEntryPage.tsx` (first-use note guncellendi, testid eklendi)
**Eklenen dosyalar:**
- `frontend/src/tests/user-panel-empty-state-clarity.smoke.test.tsx` (8 yeni test)
**Test:** 1720 toplam test (+8 yeni), tsc temiz, build temiz

---

## [2026-04-03] Phase 255 — Admin to User Return Landing Clarity

**Ne:** Admin yuzeyinden user paneline donen kullanici icin landing netligi artirildi. UserDashboardPage'e onboarding tamamlanmis kullanicilar icin context note eklendi: "Kullanici panelindesiniz. Icerik olusturma, yayin takibi ve yonetim paneline gecis islemlerinizi buradan yonetebilirsiniz." Mevcut handoff ve action hub ile uyumlu calisir.
**Sonuc:** Admin → user donusu artik sadece route degisimi degil, anlamli bir urun gecisi. Kullanici nerede oldugunu ve ne yapabilecegini net goruyor. Iki yonlu continuity tamamlandi.
**Degistirilen dosyalar:**
- `frontend/src/pages/UserDashboardPage.tsx` (context note eklendi)
**Eklenen dosyalar:**
- `frontend/src/tests/admin-to-user-return-clarity.smoke.test.tsx` (8 yeni test)
**Test:** 1712 toplam test (+8 yeni), tsc temiz, build temiz

---

## [2026-04-03] Phase 254 — User Flow / Navigation — User to Admin Task Continuity Strip

**Ne:** User panelden admin yüzeylerine gecen kullanici icin kopukluk hissini azaltan continuity strip eklendi. AdminContinuityStrip component'i admin layout'a entegre edildi. Tum admin sayfalarinda header altinda hafif mavi bilgi bandi gorunur: "Yonetim panelinde islem yapiyorsunuz" mesaji ve "Kullanici Paneline Don" link butonu.
**Sonuc:** User → admin gecislerinde kullanici yon kaybetmiyor. Admin tarafinda oldugunu biliyor ve tek tikla user panele donebiliyor. Iki panel arasinda baglantili yuezey hissi olusturuluyor.
**Eklenen dosyalar:**
- `frontend/src/components/layout/AdminContinuityStrip.tsx`
- `frontend/src/tests/admin-continuity-strip.smoke.test.tsx` (7 yeni test)
**Degistirilen dosyalar:**
- `frontend/src/app/layouts/AdminLayout.tsx` (AdminContinuityStrip entegrasyonu)
**Test:** 1704 toplam test (+7 yeni), tsc temiz, build temiz

---

## [2026-04-03] Phase 253 — User Flow / Navigation — User Dashboard as Primary Action Hub

**Ne:** `/user` anasayfasi pasif karsilama ekrani olmaktan cikarildi. DashboardActionHub component'i eklendi: 3 hizli erisim karti (Icerik → `/user/content`, Yayin → `/user/publish`, Yonetim Paneli → `/admin`). Onboarding tamamlanmis kullanici icin PostOnboardingHandoff ile birlikte gorunur. Onboarding tamamlanmamis kullanici icin mevcut guvenli fallback korunur.
**Sonuc:** Kullanici `/user` anasayfasindan ana calisma alanlarina hizlica ulasabiliyor. Handoff ile hub birlikte tutarli calisiyor. Dashboard artik bir baslangic merkezi.
**Eklenen dosyalar:**
- `frontend/src/components/dashboard/DashboardActionHub.tsx`
- `frontend/src/tests/dashboard-action-hub.smoke.test.tsx` (8 yeni test)
**Degistirilen dosyalar:**
- `frontend/src/pages/UserDashboardPage.tsx` (DashboardActionHub entegrasyonu)
**Test:** 1697 toplam test (+8 yeni), tsc temiz, build temiz

---

## [2026-04-03] Phase 252 — User Flow / Navigation — Publish Entry Surface

**Ne:** User panelindeki "Yayin" alani pasif placeholder olmaktan cikarildi. `/user/publish` route'u ve `UserPublishEntryPage` eklendi. Sayfa 3 yayin-iliskili kart gosteriyor: Isler (→ `/admin/jobs`), Standart Videolar (→ `/admin/standard-videos`), Haber Bultenleri (→ `/admin/news-bulletins`). User sidebar'da "Yayin" artik aktif link. Alt not ile admin gecisi hakkinda bilgi verildi.
**Sonuc:** Kullanici user panelden "Yayin" → alan secimi → admin yuzey zinciriyle yayin durumunu takip edebiliyor. Sidebar'da tum 3 entry artik aktif (Anasayfa, Icerik, Yayin).
**Eklenen dosyalar:**
- `frontend/src/pages/UserPublishEntryPage.tsx`
- `frontend/src/tests/user-publish-entry.smoke.test.tsx` (10 yeni test)
**Degistirilen dosyalar:**
- `frontend/src/app/router.tsx` (+ /user/publish route)
- `frontend/src/app/layouts/UserLayout.tsx` (Yayin link aktif)
**Test:** 1689 toplam test (+10 yeni), tsc temiz, build temiz

---

## [2026-04-03] Phase 251 — User Flow / Navigation — Content Entry Surface

**Ne:** User panelindeki "Icerik" alani gri placeholder olmaktan cikarildi. `/user/content` route'u ve `UserContentEntryPage` eklendi. Sayfa 2 icerik turu karti gosteriyor: Standart Video (→ `/admin/standard-videos/new`) ve Haber Bulteni (→ `/admin/news-bulletins/new`). User sidebar'da "Icerik" artik aktif link. Alt not ile admin gecisi hakkinda bilgi verildi.
**Sonuc:** Kullanici user panelden "Icerik" → tur secimi → admin olusturma ekrani zinciriyle icerik uretimine baslayabiliyor. Sidebar'da gri alan kalkmis, gercek yuzey aktif.
**Eklenen dosyalar:**
- `frontend/src/pages/UserContentEntryPage.tsx`
- `frontend/src/tests/user-content-entry.smoke.test.tsx` (8 yeni test)
**Degistirilen dosyalar:**
- `frontend/src/app/router.tsx` (+ /user/content route)
- `frontend/src/app/layouts/UserLayout.tsx` (Icerik link aktif)
**Test:** 1679 toplam test (+8 yeni), tsc temiz, build temiz

---

## [2026-04-03] Phase 250 — Entry Information Architecture & Primary Route Clarity

**Ne:** Ana giris noktalari ve route yuzeyleri kullanici acisindan netlestirildi. Header'da "User"/"Admin" → "Kullanici Paneli"/"Yonetim Paneli" ve paneller arasi gecis butonu eklendi. Admin sidebar'da Turkce label'lar ve 3 section grubu (Sistem/Icerik Uretimi/Haber). Admin overview Turkce aciklama ve 6 hizli erisim karti. User sidebar Turkce (Anasayfa/Icerik/Yayin). User dashboard Turkce baslik ve fallback mesaji.
**Sonuc:** Kullanici hangi panelde oldugunu, nereye gidebilecegini ve her yuzey ne ise yaradigini daha net anliyor. Panel gecis butonu ile URL bilmeden user/admin arasi gecilebilir.
**Degistirilen dosyalar:**
- `frontend/src/components/layout/AppHeader.tsx` (Turkce label, panel switch)
- `frontend/src/components/layout/AppSidebar.tsx` (section prop)
- `frontend/src/app/layouts/AdminLayout.tsx` (Turkce sidebar, section gruplar)
- `frontend/src/app/layouts/UserLayout.tsx` (Turkce sidebar)
- `frontend/src/pages/AdminOverviewPage.tsx` (Turkce icerik, hizli erisim)
- `frontend/src/pages/UserDashboardPage.tsx` (Turkce baslik/fallback)
- `frontend/src/tests/app.smoke.test.tsx` (+4 yeni test, toplam 8)
- `frontend/src/tests/post-onboarding-handoff.smoke.test.tsx` (metin guncelleme)
**Test:** 1671 toplam test (+4 yeni), tsc temiz, build temiz

---

## [2026-04-03] Phase 249 — Onboarding Flow Polish & Step Coherence Pass

**Ne:** Onboarding zincirinin urun seviyesinde tutarliligini saglayan polish gecisi yapildi. Feature card'lari Turkce'ye cevirildi. "Simdilik Atla" → "Sonra Tamamla" (onboarding'i tamamlamamis olarak birakir). "Devam Et" → "Sonra Tamamla" (gri). Tum alt setup ekranlarinda "Iptal" → "Geri Don". Provider/workspace CTA "Kaydet" → "Ayarlari Kaydet". Completion checklist 3'ten 5 ogeye genisletildi. Review "Geri Don" artik workspace-setup yerine requirements'a donuyor.
**Sonuc:** Onboarding akisi tutarli, Turkce, net CTA'larla urun seviyesinde bitirmis hissi veriyor. Kullanici her adimda neden orada oldugunu ve ne yaptigini anliyor.
**Degistirilen dosyalar:**
- `frontend/src/components/onboarding/OnboardingWelcomeScreen.tsx` (Turkce cards, skip davranisi)
- `frontend/src/components/onboarding/OnboardingRequirementsScreen.tsx` (Sonra Tamamla)
- `frontend/src/components/onboarding/OnboardingProviderSetupScreen.tsx` (Ayarlari Kaydet, Geri Don)
- `frontend/src/components/onboarding/OnboardingWorkspaceSetupScreen.tsx` (Ayarlari Kaydet, Geri Don)
- `frontend/src/components/onboarding/OnboardingSettingsSetupScreen.tsx` (Geri Don)
- `frontend/src/components/onboarding/OnboardingSourceSetupScreen.tsx` (cancelLabel)
- `frontend/src/components/onboarding/OnboardingTemplateSetupScreen.tsx` (cancelLabel)
- `frontend/src/components/onboarding/OnboardingCompletionScreen.tsx` (+2 checklist)
- `frontend/src/pages/OnboardingPage.tsx` (review back → requirements)
- `frontend/src/components/sources/SourceForm.tsx` (cancelLabel prop)
- `frontend/src/components/templates/TemplateForm.tsx` (cancelLabel prop)
- `frontend/src/tests/onboarding.smoke.test.tsx` (tum metin referanslari guncellendi)
**Test:** 1667 toplam test, tsc temiz, build temiz

---

## [2026-04-03] Phase 248 — Post-Onboarding First Landing & User Handoff Flow

**Ne:** Onboarding tamamlandiktan sonra kullanicinin /user yuzeyinde bos ekranla karsilasmasini engelleyen handoff deneyimi eklendi. PostOnboardingHandoff component'i "Sistem Hazir" gostergesi, "Ilk Iceriginizi Olusturun" basligi, ana CTA (Yeni Icerik Olustur → /admin/standard-videos/new) ve ikincil CTA (Yonetim Paneli → /admin) icerir. UserDashboardPage artik useOnboardingStatus ile durumu kontrol eder.
**Sonuc:** Onboarding sonrasi kullanici net bir yonlendirme goruyor. Onboarding devam ederken veya status fetch basarisiz oldugunda eski karsilama mesaji korunuyor. Mevcut kullanici akisi bozulmuyor.
**Eklenen dosyalar:**
- `frontend/src/components/dashboard/PostOnboardingHandoff.tsx`
- `frontend/src/tests/post-onboarding-handoff.smoke.test.tsx` (7 yeni test)
**Degistirilen dosyalar:**
- `frontend/src/pages/UserDashboardPage.tsx` (onboarding status entegrasyonu)
- `frontend/src/tests/app.smoke.test.tsx` (QueryClientProvider eklendi)
**Test:** 1667 toplam test (+7 yeni), tsc temiz, build temiz

---

## [2026-04-03] Phase 247 — Onboarding Completion Gate & Ready-to-Enter Flow

**Ne:** Onboarding tamamlama akisinin uctan uca calistigini dogrulayan 5 yeni end-to-end zincir testi eklendi. Yeni islevsellik eklenmedi — mevcut Phase 241/244/245 implementasyonlari hedeflenen davranisi zaten karsiliyordu. Phase 246 duplicate oldugu icin atlanmisti.
**Sonuc:** Completion ekrani render/navigasyon, auto-mutation tetikleme, requirements bloklama/acma, review→completion gecisi test edildi.
**Degistirilen dosyalar:**
- `frontend/src/tests/onboarding.smoke.test.tsx` (+5 yeni test, toplam 73)
**Test:** 1660 toplam test (+5 yeni), tsc temiz, build temiz

---

## [2026-04-03] Phase 245 — App Entry Re-Entry Rules & Post-Setup Bypass

**Ne:** Onboarding tamamlandiktan sonra kullanicinin `/onboarding` route'una gelmesi durumunda otomatik bypass eklendi. OnboardingPage artik `useOnboardingStatus()` ile durumu kontrol eder ve `onboarding_required === false` ise `/user`'a yonlendirir. Loading/error durumunda guvenli varsayilan olarak wizard gosterilmeye devam eder.
**Sonuc:** Tamamlanmis kullanicilar icin re-entry loop riski ortadan kaldirildi. AppEntryGate'in error fallback'i test edildi. Entry gate matrisi: eksik→onboarding, tamam→user, error→user (guvenli fallback).
**Degistirilen dosyalar:**
- `frontend/src/pages/OnboardingPage.tsx` (bypass guard eklendi)
- `frontend/src/tests/onboarding.smoke.test.tsx` (+5 yeni test, toplam 68)
**Test:** 1655 toplam test (+5 yeni), tsc temiz, build temiz

---

## [2026-04-03] Phase 244 — Wizard / Onboarding — Setup Summary Review Step

**Ne:** Onboarding wizard'ina completion ekranindan once kurulum ozeti/review adimi eklendi. Kullanicinin onboarding boyunca yaptigi yapilandirmalari (sources, templates, settings, providers, workspace) tek ekranda gormesini saglar. Veriler `useSetupRequirements()` ve `useSettingsList()` hook'larindan okunur.
**Sonuc:** Onboarding zinciri 9 adima genisletildi (welcome/requirements/source-setup/template-setup/settings-setup/provider-setup/workspace-setup/review/completion). Workspace setup'in onComplete'i artik review ekranina yonlendiriyor. Review'dan "Kurulumu Tamamla" ile completion'a gecis yapilir.
**Eklenen dosyalar:**
- `frontend/src/components/onboarding/OnboardingReviewSummaryScreen.tsx` (yeni)
- `docs/testing/test-report-phase-244-onboarding-setup-summary-review-step.md` (yeni)
**Degistirilen dosyalar:**
- `frontend/src/pages/OnboardingPage.tsx` (review step, 9 adimli akis)
- `frontend/src/tests/onboarding.smoke.test.tsx` (+7 yeni test, mockFetchMulti helper, toplam 63)
**Test:** 1650 toplam test (+7 yeni), tsc temiz, build temiz

---

## [2026-04-03] Phase 243 — Wizard / Onboarding — Output / Workspace Path Setup Step

**Ne:** Onboarding wizard'ina calisma alani ve cikti dizini yapilandirma adimi eklendi. Provider setup sonrasi kullanici is artefaktlarinin (`workspace_root`) ve ciktilarin (`output_dir`) nereye yazilacagini belirleyebiliyor. Her iki ayar Settings tablosuna `group_name="workspace"` ile kaydedilir. Varsayilan degerler pre-filled (`workspace/jobs`, `workspace/exports`).
**Sonuc:** Onboarding zinciri 8 adima genisletildi (welcome/requirements/source-setup/template-setup/settings-setup/provider-setup/workspace-setup/completion). Provider setup'in onComplete'i artik workspace-setup'a yonlendiriyor.
**Eklenen dosyalar:**
- `frontend/src/components/onboarding/OnboardingWorkspaceSetupScreen.tsx` (yeni)
- `docs/testing/test-report-phase-243-onboarding-output-workspace-path-setup-step.md` (yeni)
**Degistirilen dosyalar:**
- `frontend/src/pages/OnboardingPage.tsx` (workspace-setup step, 8 adimli akis)
- `frontend/src/tests/onboarding.smoke.test.tsx` (+7 yeni test, toplam 56)
**Test:** 1643 toplam test (+7 yeni), tsc temiz, build temiz

---

## [2026-04-03] Phase 242 — Wizard / Onboarding — Provider / API Setup Step

**Ne:** Onboarding wizard'ina provider/API yapilandirma adimi eklendi. Requirements tamamlandiktan sonra kullanici TTS, LLM ve YouTube API anahtarlarini girebiliyor. En az bir anahtar zorunlu. Anahtarlar Settings tablosuna `group_name="providers"` ile kaydediliyor. Akis: Requirements → Provider Setup → Completion.
**Sonuc:** Onboarding zinciri 7 adima genisletildi (welcome/requirements/source-setup/template-setup/settings-setup/provider-setup/completion). Mevcut completion flow testleri requirements→provider-setup gecisine guncellendi.
**Eklenen dosyalar:**
- `frontend/src/components/onboarding/OnboardingProviderSetupScreen.tsx` (yeni)
- `docs/testing/test-report-phase-242-onboarding-provider-api-setup-step.md` (yeni)
**Degistirilen dosyalar:**
- `frontend/src/pages/OnboardingPage.tsx` (provider-setup step, 7 adimli akis)
- `frontend/src/tests/onboarding.smoke.test.tsx` (+7 yeni test, 2 guncellenen test, toplam 49)
**Test:** 1636 toplam test (+7 yeni), tsc temiz, build temiz

---

## [2026-04-03] Phase 241 — Onboarding Completion Gate & Continue to App Flow

**Ne:** Onboarding wizard'inin tamamlanma ekrani eklendi. Tum requirements tamamlandiginda kullaniciya "Kurulum Tamamlandi" ekrani gosteriliyor. Completion screen otomatik olarak `POST /onboarding/complete` cagiriyor ve "Uygulamaya Basla" CTA ile normal uygulama akisina yonlendiriyor.
**Sonuc:** Onboarding wizard'inin ilk calisir versiyonu tamamlandi: Welcome → Requirements (source/template/settings aksiyonlari) → Completion → Uygulamaya Gecis. Requirements screen'den `useCompleteOnboarding` dependency kaldirildi, completion screen'e tasindi.
**Eklenen dosyalar:**
- `frontend/src/components/onboarding/OnboardingCompletionScreen.tsx` (yeni)
- `docs/testing/test-report-phase-241-onboarding-completion-gate-and-continue-flow.md` (yeni)
**Degistirilen dosyalar:**
- `frontend/src/components/onboarding/OnboardingRequirementsScreen.tsx` (onComplete prop, useCompleteOnboarding kaldirildi)
- `frontend/src/pages/OnboardingPage.tsx` (completion step, 6 adimli akis)
- `frontend/src/tests/onboarding.smoke.test.tsx` (+7 yeni test, toplam 42)
**Test:** 1629 toplam test (+7 yeni), tsc temiz, build temiz

---

## [2026-04-03] Phase 240 — Onboarding Settings Setup Required Action

**Ne:** Onboarding requirements ekranindaki son eksik "Sistem Ayarlari" maddesine "Ayar Ekle" aksiyon butonu eklendi. Onboarding icinde minimal sistem ayari ekleme formu olusturuldu. `createSetting` API fonksiyonu ve `useCreateSetting` hook'u eklendi (mevcut admin panelinde settings create formu yoktu).
**Sonuc:** Requirements → "Ayar Ekle" → ayar formu → POST /api/v1/settings → basarili → requirements'a donus. Artik onboarding zincirindeki uc zorunlu requirement'in ucunde de (source + template + settings) aksiyon butonu calisiyor. OnboardingPage step state 5 adima genisletildi.
**Eklenen dosyalar:**
- `frontend/src/components/onboarding/OnboardingSettingsSetupScreen.tsx` (yeni)
- `frontend/src/hooks/useCreateSetting.ts` (yeni)
- `docs/testing/test-report-phase-240-onboarding-settings-setup-action.md` (yeni)
**Degistirilen dosyalar:**
- `frontend/src/api/settingsApi.ts` (SettingCreatePayload + createSetting)
- `frontend/src/components/onboarding/OnboardingRequirementsScreen.tsx` (settings aksiyon butonu, onSettingsSetup prop)
- `frontend/src/pages/OnboardingPage.tsx` (settings-setup step)
- `frontend/src/tests/onboarding.smoke.test.tsx` (+7 yeni test, toplam 35)
**Test:** 1622 toplam test (+7 yeni), tsc temiz, build temiz

---

## [2026-04-03] Phase 239 — Onboarding Template Setup Required Action

**Ne:** Onboarding requirements ekranindaki "Sablon Olustur" maddesine "Sablon Ekle" aksiyon butonu eklendi. Butona tiklandiginda onboarding icinde sablon olusturma formu aciliyor. Mevcut TemplateForm komponenti ve useCreateTemplate hook'u tekrar kullaniliyor.
**Sonuc:** Requirements → "Sablon Ekle" → TemplateForm → POST /api/v1/templates → basarili → requirements'a donus. Cancel ile de requirements'a donus. OnboardingPage step state 4 adima genisletildi (welcome/requirements/source-setup/template-setup).
**Eklenen dosyalar:**
- `frontend/src/components/onboarding/OnboardingTemplateSetupScreen.tsx` (yeni)
- `docs/testing/test-report-phase-239-onboarding-template-setup-action.md` (yeni)
**Degistirilen dosyalar:**
- `frontend/src/components/onboarding/OnboardingRequirementsScreen.tsx` (template aksiyon butonu, onTemplateSetup prop, requirement row action mapping)
- `frontend/src/pages/OnboardingPage.tsx` (template-setup step)
- `frontend/src/tests/onboarding.smoke.test.tsx` (+7 yeni test, toplam 28)
**Test:** 1615 toplam test (+7 yeni), tsc temiz, build temiz

---

## [2026-04-03] Phase 238 — Onboarding Source Setup First Required Action

**Ne:** Onboarding requirements ekranindaki "Haber Kaynagi Ekle" maddesine "Kaynak Ekle" aksiyon butonu eklendi. Butona tiklandiginda onboarding icinde kaynak ekleme formu aciliyor. Mevcut SourceForm komponenti ve useCreateSource hook'u tekrar kullaniliyor.
**Sonuc:** Requirements → "Kaynak Ekle" → SourceForm → POST /api/v1/sources → basarili → requirements'a donus. Cancel ile de requirements'a donus. OnboardingPage step state 3 adima genisletildi (welcome/requirements/source-setup).
**Eklenen dosyalar:**
- `frontend/src/components/onboarding/OnboardingSourceSetupScreen.tsx` (yeni)
- `docs/testing/test-report-phase-238-onboarding-source-setup-action.md` (yeni)
**Degistirilen dosyalar:**
- `frontend/src/components/onboarding/OnboardingRequirementsScreen.tsx` (aksiyon butonu, onSourceSetup prop)
- `frontend/src/pages/OnboardingPage.tsx` (source-setup step)
- `frontend/src/tests/onboarding.smoke.test.tsx` (+7 yeni test, toplam 21)
**Test:** 1608 toplam test (+7 yeni), tsc temiz, build temiz

---

## [2026-04-03] Phase 237 — Onboarding Setup Requirements Screen

**Ne:** Onboarding akisinda welcome screen'den sonra gelen setup requirements ekrani. Backend `GET /onboarding/requirements` endpoint'i gercek domain verisine dayanarak 3 zorunlu kurulum maddesini kontrol ediyor (sources, templates, settings). Frontend requirements ekrani checklist seklinde gosteriyor.
**Sonuc:** Welcome → Requirements step akisi kuruldu. Tamamlanmis maddeler yesil, eksik maddeler sari gorunuyor. Tum maddeler tamam ise "Kurulumu Tamamla", degilse "Devam Et" CTA gosteriliyor.
**Eklenen dosyalar:**
- `frontend/src/components/onboarding/OnboardingRequirementsScreen.tsx` (yeni)
- `frontend/src/hooks/useSetupRequirements.ts` (yeni)
- `docs/testing/test-report-phase-237-onboarding-setup-requirements-screen.md` (yeni)
**Degistirilen dosyalar:**
- `backend/app/onboarding/schemas.py`, `service.py`, `router.py` (requirements endpoint)
- `frontend/src/api/onboardingApi.ts` (requirements API)
- `frontend/src/components/onboarding/OnboardingWelcomeScreen.tsx` (onNext prop)
- `frontend/src/pages/OnboardingPage.tsx` (step state yonetimi)
- `frontend/src/tests/onboarding.smoke.test.tsx` (+7 yeni test, toplam 14)
**Test:** 1601 toplam test (+7 yeni), tsc temiz, build temiz

---

## [2026-04-03] Phase 236 — Onboarding App Entry Gate & Welcome Screen

**Ne:** Ürün ana fazı: onboarding entry gate ve welcome screen. Backend onboarding API (app_state tablosu kullanarak), frontend entry gate component, profesyonel welcome screen, route wiring.
**Sonuç:** Uygulama açıldığında setup gerekip gerekmediğini kontrol eden entry gate kuruldu. Setup gerekli ise `/onboarding` welcome screen gösterilir, setup tamam ise `/user`'a geçilir. Backend `GET /onboarding/status` ve `POST /onboarding/complete` endpoint'leri eklendi.
**Eklenen dosyalar:**
- `backend/app/onboarding/__init__.py`, `schemas.py`, `service.py`, `router.py` (yeni — backend onboarding modülü)
- `frontend/src/api/onboardingApi.ts` (yeni — API client)
- `frontend/src/hooks/useOnboardingStatus.ts`, `useCompleteOnboarding.ts` (yeni — React Query hook'ları)
- `frontend/src/components/onboarding/OnboardingWelcomeScreen.tsx` (yeni — welcome screen)
- `frontend/src/pages/OnboardingPage.tsx` (yeni — page wrapper)
- `frontend/src/app/AppEntryGate.tsx` (yeni — entry gate)
- `frontend/src/tests/onboarding.smoke.test.tsx` (yeni — 7 test)
**Değiştirilen dosyalar:**
- `backend/app/api/router.py` (onboarding router eklendi)
- `frontend/src/app/router.tsx` (entry gate + onboarding route eklendi)
- `docs/testing/test-report-phase-236-onboarding-app-entry-gate-welcome-screen.md` (yeni — test raporu)
**Test:** 1594 toplam test (+7 yeni), tsc temiz, build temiz

---

## [2026-04-03] Phase 235 — Hygiene Closure & Product Pivot Gate

**Ne:** Frontend hygiene / readability / render-safety / fallback-safety hattının resmi kapanışı ve ürün fazlarına geçiş kapısı.
**Sonuç:** Mikro readability faz zinciri resmen kapatıldı. 234 faz test raporu üretildi. Completed: null/empty/fallback safety, date formatting, json preview, text overflow, required-field, badge enum safety, numeric safety, boolean render safety, string normalization, helper/constant extraction. Audit-only closed: array/list render safety, form/detail/table readability sweep'leri, 45+ mikro readability audit fazı. Deferred: threshold altı extraction fırsatları, cross-file shared helper, badge iç readability. Baseline stabil: tsc temiz, 1587/1587 test, build temiz. Sıradaki ana faz: Wizard / Onboarding.
**Eklenen dosyalar:**
- `docs/testing/test-report-phase-235-hygiene-closure-product-pivot-gate.md` (yeni — kapanış raporu)
**Test:** 1587 toplam test, tsc temiz, build temiz

---

## [2026-04-03] Phase 234 — Repeated Small Detail Field/Row Call-Site Readability Pack

**Ne:** Detail/Overview panel bileşenlerinde tekrar eden Field/Row çağrı pattern'larının kapsamlı audit'i.
**Sonuç:** 13 Detail + 2 Overview paneli incelendi. Her Row/Field çağrısı farklı label + farklı data field — aynı (label, field) ikilisi 3+ tekrar etmiyor. formatDateTime 2× per dosya, threshold altı. Dosya değişikliği yapılmadı.
**Eklenen dosyalar:**
- `docs/testing/test-report-phase-234-repeated-small-detail-field-row-call-site-readability-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 233 — Repeated Small Summary Component Call Readability Pack

**Ne:** Table/Panel/Detail bileşenlerinde tekrar eden summary component çağrısı pattern'larının kapsamlı audit'i.
**Sonuç:** Table dosyalarında her Summary component çağrısı farklı component adı taşıyor — aynı component 3+ tekrar etmiyor. Panel dosyalarında BoolBadge 3-4× farklı field+label ile çağrılıyor — extraction Row label bilgisini kaybettirir. Dosya değişikliği yapılmadı.
**Eklenen dosyalar:**
- `docs/testing/test-report-phase-233-repeated-small-summary-component-call-readability-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 232 — Repeated Small Table Cell Content Readability Pack

**Ne:** Table bileşenlerinde tekrar eden küçük hücre içerik pattern'larının kapsamlı audit'i.
**Sonuç:** TH_STYLE/TD_STYLE/DASH tüm tablolarda zaten extracted. wordBreak inline style max 2× per dosya. Aynı hücre bloğu 3+ tekrar eden dosya yok. Dosya değişikliği yapılmadı.
**Eklenen dosyalar:**
- `docs/testing/test-report-phase-232-repeated-small-table-cell-content-readability-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 231 — Repeated Small Form Validation Readability Pack

**Ne:** Form bileşenlerinde tekrar eden küçük validation pattern'larının kapsamlı audit'i.
**Sonuç:** Per-field if(!x.trim()) max 2×. validateJson() 3× farklı JSON field argümanları. Extraction değer katmıyor. Dosya değişikliği yapılmadı.
**Eklenen dosyalar:**
- `docs/testing/test-report-phase-231-repeated-small-form-validation-readability-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 230 — Repeated Small Label/Heading Text Readability Pack

**Ne:** Panel/form/detail bileşenlerinde tekrar eden label/heading text string'lerinin kapsamlı audit'i.
**Sonuç:** Aynı tam string 3+ kez tekrar eden dosya yok. "zorunludur" 5 farklı mesajda ortak kelime (tüm mesajlar benzersiz). DASH zaten extracted const. Dosya değişikliği yapılmadı.
**Eklenen dosyalar:**
- `docs/testing/test-report-phase-230-repeated-small-label-heading-text-readability-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 229 — Repeated Small Setter/Update Call Readability Pack

**Ne:** Form/panel bileşenlerinde tekrar eden setter/update call pattern'larının kapsamlı audit'i.
**Sonuç:** Per-field setter standart React controlled form. setMode farklı argümanlarla. queryClient/mutation.mutate bileşenlerde yok. Dosya değişikliği yapılmadı.
**Eklenen dosyalar:**
- `docs/testing/test-report-phase-229-repeated-small-setter-update-call-readability-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 228 — Repeated Small Hook Call Readability Pack

**Ne:** Form/panel/detail bileşenlerinde tekrar eden hook call pattern'larının kapsamlı audit'i.
**Sonuç:** useState çoklu kullanım controlled form standard pattern. Detail panel custom hook'ları farklı. Aynı hook 3+ kez tekrar eden dosya yok. Dosya değişikliği yapılmadı.
**Eklenen dosyalar:**
- `docs/testing/test-report-phase-228-repeated-small-hook-call-readability-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 227 — Repeated Small Return Object / Payload Shape Readability Pack

**Ne:** Form/panel bileşenlerinde tekrar eden return object / payload shape pattern'larının kapsamlı audit'i.
**Sonuç:** Her form dosyasında tek handleSubmit, tek payload build. Aynı payload shape 3+ kez tekrar eden dosya yok. Dosya değişikliği yapılmadı.
**Eklenen dosyalar:**
- `docs/testing/test-report-phase-227-repeated-small-return-object-payload-shape-readability-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 226 — Repeated Small Local Derived Value Readability Pack

**Ne:** Panel/form/detail bileşenlerinde tekrar eden küçük derived-value computation pattern'larının kapsamlı audit'i.
**Sonuç:** Aynı derived computation 3+ kez tekrar eden dosya yok. .map().filter(Boolean) farklı input/bağlam. Dosya değişikliği yapılmadı.
**Eklenen dosyalar:**
- `docs/testing/test-report-phase-226-repeated-small-local-derived-value-readability-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 225 — Repeated Small JSX Fragment/Wrapper Readability Pack

**Ne:** Panel/form/detail bileşenlerinde tekrar eden JSX fragment ve wrapper pattern'larının kapsamlı audit'i.
**Sonuç:** React.Fragment kullanımı yok. Çoklu return() kullanımlar farklı conditional path (loading/error/create/edit/view). Dosya değişikliği yapılmadı.
**Eklenen dosyalar:**
- `docs/testing/test-report-phase-225-repeated-small-jsx-fragment-wrapper-readability-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 224 — Repeated Small Early Return / Guard Clause Readability Pack

**Ne:** Detail/Panel/Overview/Preview bileşenlerinde early return / guard clause pattern'larının kapsamlı audit'i.
**Sonuç:** 3+ kullanan dosyalar Summary kategorisi (kapsam dışı). Detail/Panel dosyalarında max 2×, farklı koşullar. Dosya değişikliği yapılmadı.
**Eklenen dosyalar:**
- `docs/testing/test-report-phase-224-repeated-small-early-return-guard-clause-readability-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 223 — Repeated Small Function Parameter Naming / Destructuring Readability Pack

**Ne:** Bileşenlerde fonksiyon parametre isimleri ve destructuring pattern'larının kapsamlı audit'i.
**Sonuç:** Tüm fonksiyon imzaları açık ve tutarlı, standart React convention uyumlu. Dosya değişikliği yapılmadı.
**Eklenen dosyalar:**
- `docs/testing/test-report-phase-223-repeated-small-function-parameter-naming-destructuring-readability-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 222 — Repeated Small Local Variable Naming Readability Pack

**Ne:** Form/panel bileşenlerinde local variable naming kalitesinin kapsamlı audit'i.
**Sonuç:** v=> functional update ve set() helper standart React idiom. const n 1× kullanım. 3+ threshold karşılanmıyor. Dosya değişikliği yapılmadı.
**Eklenen dosyalar:**
- `docs/testing/test-report-phase-222-repeated-small-local-variable-naming-readability-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 221 — Repeated Small Conditional JSX Block Readability Pack

**Ne:** Panel/form/detail bileşenlerinde tekrar eden küçük conditional JSX block pattern'larının kapsamlı audit'i.
**Sonuç:** Tüm conditional render block'ları farklı guard variable ve JSX içeriğine sahip. Aynı block 3+ kez tekrar etmiyor. Dosya değişikliği yapılmadı.
**Eklenen dosyalar:**
- `docs/testing/test-report-phase-221-repeated-small-conditional-jsx-block-readability-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 220 — Repeated Small Local Type Alias/Union Readability Pack

**Ne:** Bileşenlerde tekrar eden küçük string union type'lar ve dağınık type alias yerleşiminin kapsamlı audit'i.
**Sonuç:** Form/panel/table/detail dosyalarında hiç type declaration yok. Badge/Summary dosyaları standing rule gereği kapsam dışı. Dosya değişikliği yapılmadı.
**Eklenen dosyalar:**
- `docs/testing/test-report-phase-220-repeated-small-local-type-alias-union-readability-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 219 — Repeated Small Import Grouping/Ordering Readability Pack

**Ne:** Bileşenlerde import bloklarının kapsamlı audit'i.
**Sonuç:** Tüm bileşenler tutarlı convention'ı izliyor (react → local api types → local lib → local components). Üçüncü taraf kütüphane karışıklığı yok. Dosya değişikliği yapılmadı.
**Eklenen dosyalar:**
- `docs/testing/test-report-phase-219-repeated-small-import-grouping-ordering-readability-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 218 — Repeated Small Inline Event Handler Readability Pack

**Ne:** Form/panel bileşenlerinde tekrar eden onClick ve onChange inline handler pattern'larının kapsamlı audit'i.
**Sonuç:** onChange handler'ları her biri farklı setter/key çağırıyor; onClick handler'ları farklı argümanlar içeriyor. Tekrar eden aynı inline handler yok. Dosya değişikliği yapılmadı.
**Eklenen dosyalar:**
- `docs/testing/test-report-phase-218-repeated-small-inline-event-handler-readability-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 217 — Repeated Small CSSProperties Type Annotation Readability Pack

**Ne:** Bileşenlerde kısmen typed/kısmen untyped style const karışıklığının kapsamlı audit'i.
**Sonuç:** 39 dosya React.CSSProperties kullanıyor, tamamı tutarlı şekilde typed. Karışık annotation dosyası yok. Dosya değişikliği yapılmadı.
**Eklenen dosyalar:**
- `docs/testing/test-report-phase-217-repeated-small-cssproperties-type-annotation-readability-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 216 — Repeated Small title/subject/name Text Readability Pack

**Ne:** Bileşenlerde tekrar eden item.title, item.label, item.name gibi text accessor pattern'larının kapsamlı audit'i.
**Sonuç:** item.title (NewsItemsTable 7×, NewsItemPickerTable 3×) ve item.label (AppSidebar 3×) loop variable property access. Dosya-seviyesi const semantik olarak uygunsuz. Extraction değer katmıyor. Dosya değişikliği yapılmadı.
**Eklenen dosyalar:**
- `docs/testing/test-report-phase-216-repeated-small-title-subject-name-readability-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 215 — Repeated Small disabled/busy Button Readability Pack

**Ne:** Form/panel bileşenlerinde tekrar eden disabled/busy button pattern'larının kapsamlı audit'i.
**Sonuç:** disabled={isSubmitting} max 2× per dosya. Threshold altı. Dosya değişikliği yapılmadı.
**Eklenen dosyalar:**
- `docs/testing/test-report-phase-215-repeated-small-disabled-busy-button-readability-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 214 — Repeated Small edit/view Mode Readability Pack

**Ne:** Panel/form bileşenlerinde mode==="edit" ve mode==="view" pattern'larının kapsamlı audit'i.
**Sonuç:** Panel dosyalarında her mode değeri birer kez kullanılıyor. Threshold altı. Phase 213'te mode==="create" zaten ele alındı. Dosya değişikliği yapılmadı.
**Eklenen dosyalar:**
- `docs/testing/test-report-phase-214-repeated-small-edit-view-mode-readability-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 213 — Repeated Small Boolean Prop Readability Pack

**Ne:** Form bileşenlerinde tekrar eden `mode === "create"` pattern'larını `const isCreate` const'larına çıkarma.
**Değiştirilen dosyalar:**
- `source-scans/SourceScanForm.tsx`: `const isCreate` eklendi, 3× inline değiştirildi
- `news-bulletin/NewsBulletinSelectedItemForm.tsx`: `const isCreate` eklendi, 3× inline değiştirildi
- `template-style-links/TemplateStyleLinkForm.tsx`: `const isCreate` eklendi, 3× inline değiştirildi
- `used-news/UsedNewsForm.tsx`: `const isCreate` eklendi, 3× inline değiştirildi
- `docs/testing/test-report-phase-213-repeated-small-boolean-prop-readability-pack.md` (yeni)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 212 — Repeated Small .join() / Separator-Based Array Render Pattern Pack

**Ne:** Detail/panel/overview/summary bileşenlerinde tekrar eden .join() separator pattern'larının kapsamlı audit'i.
**Sonuç:** Hiçbir dosyada aynı separator 3+ kez kullanılmıyor. Dosya değişikliği yapılmadı.
**Eklenen/değiştirilen dosyalar:**
- `docs/testing/test-report-phase-212-repeated-small-join-separator-array-render-pattern-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 211 — Repeated Small Nullish-Coalescing Readability Pack

**Ne:** Form/panel bileşenlerinde tekrar eden nullish-coalescing fallback pattern'larının kapsamlı audit'i.
**Sonuç:** ?? "" 17 dosyada 4-9× kullanılıyor ama const extraction okunabilirliği artırmıyor. Dosya değişikliği yapılmadı.
**Eklenen/değiştirilen dosyalar:**
- `docs/testing/test-report-phase-211-repeated-small-nullish-coalescing-readability-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 210 — Repeated Small Loading/Error/Fallback Render Pattern Pack

**Ne:** Panel/form bileşenlerinde tekrar eden loading/error/fallback render pattern'larının kapsamlı audit'i.
**Sonuç:** || null ve isLoading/isError farklı bağlamlarda — extraction değer katmıyor. Dosya değişikliği yapılmadı.
**Eklenen/değiştirilen dosyalar:**
- `docs/testing/test-report-phase-210-repeated-small-loading-error-fallback-render-pattern-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 209 — Repeated Small Local Error Message Readability Pack

**Ne:** Form/panel bileşenlerinde tekrar eden error message/validation literal'larının kapsamlı audit'i.
**Sonuç:** Gerçek error message literal tekrarı yok. StyleBlueprintForm field name'leri TS tip güvenliği nedeniyle dokunulmadı. Dosya değişikliği yapılmadı.
**Eklenen/değiştirilen dosyalar:**
- `docs/testing/test-report-phase-209-repeated-small-local-error-message-readability-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 208 — Repeated Small Date/Timestamp Formatting Constant Pack

**Ne:** Bileşenlerde tekrar eden date/timestamp formatting pattern'larının kapsamlı audit'i.
**Sonuç:** formatDateTime/formatDateISO farklı argümanlarla — extraction okunabilirliği artırmıyor. Dosya değişikliği yapılmadı.
**Eklenen/değiştirilen dosyalar:**
- `docs/testing/test-report-phase-208-repeated-small-date-timestamp-formatting-constant-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 207 — Repeated Small Inline Number Formatting Constant Pack

**Ne:** Bileşenlerde tekrar eden inline number formatting pattern'larının kapsamlı audit'i.
**Sonuç:** ?? 0 ve Number() pattern'ları farklı argümanlarla kullanılıyor — const extraction okunabilirliği artırmıyor. Dosya değişikliği yapılmadı.
**Eklenen/değiştirilen dosyalar:**
- `docs/testing/test-report-phase-207-repeated-small-inline-number-formatting-constant-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 206 — Repeated Small Boolean/Ternary Label Text Constant Pack

**Ne:** Bileşenlerde tekrar eden boolean/ternary label text literal değerlerinin kapsamlı audit'i.
**Sonuç:** Hiçbir dosyada aynı boolean label 3+ kez tekrarlanmıyor. Dosya değişikliği yapılmadı.
**Eklenen/değiştirilen dosyalar:**
- `docs/testing/test-report-phase-206-repeated-small-boolean-ternary-label-text-constant-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 205 — Repeated Small List/Marker/Bullet Text Constant Pack

**Ne:** Bileşenlerde tekrar eden marker/bullet/separator text literal değerlerinin kapsamlı audit'i.
**Sonuç:** "—" max 2× per dosya, diğer marker'lar kullanılmıyor. Threshold karşılanmadı. Dosya değişikliği yapılmadı.
**Eklenen/değiştirilen dosyalar:**
- `docs/testing/test-report-phase-205-repeated-small-list-marker-bullet-text-constant-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 204 — Repeated Small position/zIndex Literal Constant Pack

**Ne:** Bileşenlerde tekrar eden position/zIndex literal değerlerinin kapsamlı audit'i.
**Sonuç:** Bu property'ler codebase'de kullanılmıyor. Dosya değişikliği yapılmadı.
**Eklenen/değiştirilen dosyalar:**
- `docs/testing/test-report-phase-204-repeated-small-position-zindex-literal-constant-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 203 — Repeated Small text-decoration Literal Constant Pack

**Ne:** Bileşenlerde tekrar eden textDecoration literal değerlerinin kapsamlı audit'i.
**Sonuç:** Sadece AppSidebar.tsx'de 1 kullanım var, threshold karşılanmadı. Dosya değişikliği yapılmadı.
**Eklenen/değiştirilen dosyalar:**
- `docs/testing/test-report-phase-203-repeated-small-text-decoration-literal-constant-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 202 — Repeated Small outline/boxShadow Literal Constant Pack

**Ne:** Bileşenlerde tekrar eden outline/boxShadow literal değerlerinin kapsamlı audit'i.
**Sonuç:** Bu property'ler codebase'de kullanılmıyor. Dosya değişikliği yapılmadı.
**Eklenen/değiştirilen dosyalar:**
- `docs/testing/test-report-phase-202-repeated-small-outline-boxshadow-literal-constant-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 201 — Repeated Small Transition/Animation Literal Constant Pack

**Ne:** Bileşenlerde tekrar eden transition/animation/transform literal değerlerinin kapsamlı audit'i.
**Sonuç:** Bu property'ler codebase'de kullanılmıyor. Dosya değişikliği yapılmadı.
**Eklenen/değiştirilen dosyalar:**
- `docs/testing/test-report-phase-201-repeated-small-transition-animation-literal-constant-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 200 — Repeated Small whiteSpace Literal Constant Pack

**Ne:** Bileşenlerde tekrar eden whiteSpace literal değerlerinin kapsamlı audit'i.
**Sonuç:** 80+ dosyada kullanım var ama hiçbirinde aynı değer 3+ kez tekrarlanmıyor. Badge dosyaları kapsam dışı. Dosya değişikliği yapılmadı.
**Eklenen/değiştirilen dosyalar:**
- `docs/testing/test-report-phase-200-repeated-small-whitespace-literal-constant-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 199 — Repeated verticalAlign Literal Constant Pack

**Ne:** Bileşenlerde tekrar eden verticalAlign literal değerlerinin kapsamlı audit'i.
**Sonuç:** Sadece 2 dosyada birer kez kullanım var. Threshold karşılanmadı. Dosya değişikliği yapılmadı.
**Eklenen/değiştirilen dosyalar:**
- `docs/testing/test-report-phase-199-repeated-vertical-align-literal-constant-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 198 — Repeated Small Gap Literal Constant Pack

**Ne:** Bileşenlerde tekrar eden gap literal değerlerinin kapsamlı audit'i.
**Sonuç:** Hiçbir dosyada aynı gap değeri 3+ kez kullanılmıyor. Dosya değişikliği yapılmadı.
**Eklenen/değiştirilen dosyalar:**
- `docs/testing/test-report-phase-198-repeated-small-gap-literal-constant-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 197 — Repeated Opacity Literal Constant Pack

**Ne:** Bileşenlerde tekrar eden opacity literal değerlerinin kapsamlı audit'i.
**Sonuç:** Hiçbir dosyada 3+ opacity kullanımı yok. Dosya değişikliği yapılmadı.
**Eklenen/değiştirilen dosyalar:**
- `docs/testing/test-report-phase-197-repeated-opacity-literal-constant-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 196 — Repeated textTransform/letterSpacing Literal Constant Pack

**Ne:** Bileşenlerde tekrar eden textTransform/letterSpacing literal değerlerinin kapsamlı audit'i.
**Sonuç:** Bu property'ler codebase'de kullanılmıyor. Dosya değişikliği yapılmadı.
**Eklenen/değiştirilen dosyalar:**
- `docs/testing/test-report-phase-196-repeated-text-transform-letter-spacing-literal-constant-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 195 — Repeated Small Border Literal Constant Pack

**Ne:** Bileşenlerde tekrar eden border literal değerlerini dosya-seviyesi const'lara taşıma.
**Eklenen/değiştirilen dosyalar:**
- `TemplateStyleLinkDetailPanel.tsx`: `BORDER = "1px solid #e2e8f0"` eklendi, 3× inline → const
- `TemplateDetailPanel.tsx`: `BORDER = "1px solid #e2e8f0"` eklendi, 3× (PANEL_BOX + 2 inline) → const
- `StandardVideoArtifactsPanel.tsx`: `BORDER = "1px solid #e2e8f0"` eklendi, 3× inline → const
- `docs/testing/test-report-phase-195-repeated-small-border-literal-constant-pack.md` (yeni)
**Atlanılan:** Diğer dosyalar threshold altı
**Test:** 1587 toplam test, tsc temiz, vite build temiz
**Dokunulmayan:** Görünüm, davranış, badge stilleri, backend

---

## [2026-04-03] Phase 194 — Repeated Small Helper Function Name/Const Readability Pack

**Ne:** Son fazlarda çok const eklenen bileşenlerde const/helper sıralama ve yerleşim iyileştirmesi.
**Eklenen/değiştirilen dosyalar:**
- `StandardVideoScriptPanel.tsx`: Primitive const'lar (`RADIUS_XS`, `CURSOR_PTR`, `COLOR_BLUE`) style object const'larından önceye taşındı
- `TemplateForm.tsx`: `REQ_MARK` const'ı `errorStyle`'ın hemen ardına taşındı (her ikisi de `COLOR_ERR` bağımlısı)
- `docs/testing/test-report-phase-194-repeated-small-helper-function-name-const-readability-pack.md` (yeni)
**Test:** 1587 toplam test, tsc temiz, vite build temiz
**Dokunulmayan:** Görünüm, davranış, const isimleri, backend

---

## [2026-04-03] Phase 193 — Repeated Placeholder/Empty-State String Literal Constant Pack

**Ne:** Bileşenlerde tekrar eden placeholder/empty-state string literal değerlerinin kapsamlı audit'i.
**Sonuç:** Her dosyada max 1× — threshold altı. Dosya değişikliği yapılmadı.
**Eklenen/değiştirilen dosyalar:**
- `docs/testing/test-report-phase-193-repeated-placeholder-empty-state-string-literal-constant-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 192 — Repeated Line-Height Literal Constant Pack

**Ne:** Bileşenlerde tekrar eden lineHeight literal değerlerinin kapsamlı audit'i.
**Sonuç:** Hiçbir component dosyasında `lineHeight` style property'si kullanılmıyor. Dosya değişikliği yapılmadı.
**Eklenen/değiştirilen dosyalar:**
- `docs/testing/test-report-phase-192-repeated-line-height-literal-constant-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 191 — Repeated Width/MinWidth Literal Constant Pack

**Ne:** Bileşenlerde tekrar eden width/minWidth/maxWidth literal değerlerinin kapsamlı audit'i.
**Sonuç:** Her dosyada max 2× — threshold altı. Dosya değişikliği yapılmadı.
**Eklenen/değiştirilen dosyalar:**
- `docs/testing/test-report-phase-191-repeated-width-minwidth-literal-constant-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 190 — Repeated Display/Layout Literal Constant Pack

**Ne:** Bileşenlerde tekrar eden display/layout literal'larının kapsamlı audit'i.
**Sonuç:** Anlamlı extraction fırsatı bulunamadı. `"flex"` string'i farklı composite nesnelerde, composite tekrarlar threshold altında. Dosya değişikliği yapılmadı.
**Eklenen/değiştirilen dosyalar:**
- `docs/testing/test-report-phase-190-repeated-display-layout-literal-constant-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 189 — Repeated Small Background Literal Constant Pack

**Ne:** Bileşenlerde tekrar eden background literal değerlerinin kapsamlı audit'i.
**Sonuç:** Her dosyada max 2× — threshold altı. Dosya değişikliği yapılmadı.
**Eklenen/değiştirilen dosyalar:**
- `docs/testing/test-report-phase-189-repeated-small-background-literal-constant-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 188 — Repeated Small Color Literal Constant Pack

**Ne:** Badge surface'leri hariç, bileşenlerde tekrar eden renk hex literal değerlerini dosya-seviyesi const'lara taşıma.
**Eklenen/değiştirilen dosyalar:**
- `COLOR_DARK = "#1e293b"`: TemplateStyleLinkDetailPanel, StyleBlueprintDetailPanel, TemplateDetailPanel, SourceScanDetailPanel, SourceDetailPanel (5 dosya)
- `COLOR_ERR = "#dc2626"`: StyleBlueprintForm, TemplateForm, UsedNewsForm, NewsItemForm, TemplateStyleLinkForm, StandardVideoForm, StandardVideoMetadataForm, StandardVideoScriptForm, SourceScanForm, SourceScanDetailPanel (10 dosya)
- `COLOR_FAINT = "#94a3b8"`: SourceDetailPanel (1 dosya)
- `COLOR_BLUE = "#3b82f6"`: StandardVideoScriptPanel (1 dosya)
- `docs/testing/test-report-phase-188-repeated-small-color-literal-constant-pack.md` (yeni)
**Atlanılan:** Badge surface'leri, threshold altındaki dosyalar, global color token sistemi
**Test:** 1587 toplam test, tsc temiz, vite build temiz
**Dokunulmayan:** Görünüm, davranış, badge stilleri, backend

---

## [2026-04-03] Phase 187 — Repeated Small Margin/Padding Literal Constant Pack

**Ne:** Bileşenlerde tekrar eden margin/padding literal değerlerini dosya-seviyesi const'lara taşıma.
**Eklenen/değiştirilen dosyalar:**
- `StandardVideoMetadataPanel.tsx`: `PAD_B_SM = "0.375rem"` eklendi, 10× inline → const (LABEL_TD + 9 td)
- `StandardVideoScriptPanel.tsx`: `PAD_B_XS = "0.25rem"` eklendi, 5× inline → const (LABEL_TD + 4 td)
- `TemplateStyleLinksTable.tsx`: `TD_PAD = "0.5rem 0.75rem"` eklendi, 7× inline → const (TH_CELL + 6 td)
- `docs/testing/test-report-phase-187-repeated-small-margin-padding-literal-constant-pack.md` (yeni)
**Atlanılan:** TD_STYLE zaten olan tablo dosyaları; diğerleri threshold altı
**Test:** 1587 toplam test, tsc temiz, vite build temiz
**Dokunulmayan:** Görünüm, davranış, badge stilleri, backend

---

## [2026-04-03] Phase 186 — Repeated Small Overflow/Wrap Style Constant Pack

**Ne:** Bileşenlerde tekrar eden `{ wordBreak: "break-word", overflowWrap: "anywhere" }` inline style object'lerini dosya-seviyesi const'lara taşıma.
**Eklenen/değiştirilen dosyalar:**
- `NewsBulletinMetadataPanel.tsx`: `WRAP_WORD` const eklendi, 3× inline td style → const
- `text-overflow-safety.smoke.test.tsx`: `NewsBulletinMetadataPanel title td` testi güncellendi (`WRAP_WORD` const referansını da kabul eder)
- `docs/testing/test-report-phase-186-repeated-small-overflow-wrap-style-constant-pack.md` (yeni)
**Atlanılan:** Diğer dosyalar — threshold altı
**Test:** 1587 toplam test, tsc temiz, vite build temiz
**Dokunulmayan:** Görünüm, davranış, badge stilleri, backend

---

## [2026-04-03] Phase 185 — Repeated Small Cursor/Pointer Style Constant Pack

**Ne:** Bileşenlerde tekrar eden `cursor: "pointer"` literal'larını dosya-seviyesi const'lara taşıma.
**Eklenen/değiştirilen dosyalar:**
- `StandardVideoScriptPanel.tsx`: `CURSOR_PTR = "pointer"` eklendi, 3× inline → const
- `docs/testing/test-report-phase-185-repeated-small-cursor-pointer-style-constant-pack.md` (yeni)
**Atlanılan:** Form dosyaları (2× ternary içinde, threshold altı), MetadataPanel (2× threshold altı)
**Test:** 1587 toplam test, tsc temiz, vite build temiz
**Dokunulmayan:** Görünüm, davranış, badge stilleri, backend

---

## [2026-04-03] Phase 184 — Repeated Small Text Align Literal Constant Pack

**Ne:** Tüm bileşenlerde tekrar eden `textAlign` literal'larının kapsamlı audit'i.
**Sonuç:** Her dosyada max 1× — threshold altı. Dosya değişikliği yapılmadı.
**Eklenen/değiştirilen dosyalar:**
- `docs/testing/test-report-phase-184-repeated-small-text-align-literal-constant-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 183 — Repeated Small Font Weight Constant Pack

**Ne:** Bileşenlerde tekrar eden `fontWeight` literal içeren th style object'lerini dosya-seviyesi const'lara taşıma.
**Eklenen/değiştirilen dosyalar:**
- `TemplateStyleLinksTable.tsx`: `TH_CELL` eklendi, 6× th inline → const
- `NewsBulletinSelectedItemsPanel.tsx`: `TH_CELL` eklendi, 5× th inline → const
- `docs/testing/test-report-phase-183-repeated-small-font-weight-constant-pack.md` (yeni)
**Atlanılan:** ArtifactsPanel/MetadataPanel (farklı nesnelerde, threshold altı), diğerleri max 2×
**Test:** 1587 toplam test, tsc temiz, vite build temiz
**Dokunulmayan:** Görünüm, davranış, badge stilleri, backend

---

## [2026-04-03] Phase 182 — Repeated Small Font Size Literal Constant Pack

**Ne:** Bileşenlerde tekrar eden `fontSize` literal'larını dosya-seviyesi const'lara taşıma.
**Eklenen/değiştirilen dosyalar:**
- `StandardVideoArtifactsPanel.tsx`: `FONT_SM = "0.875rem"` eklendi, 8× inline → const
- `SourceScanDetailPanel.tsx`: `FONT_SM = "0.875rem"` eklendi, 3× inline → const
- `SourceDetailPanel.tsx`: `FONT_SM = "0.875rem"` eklendi, 3× inline → const
- `docs/testing/test-report-phase-182-repeated-small-font-size-literal-constant-pack.md` (yeni)
**Atlanılan:** Form dosyaları (const tanımlarda — inline değil), diğerleri max 2× threshold altı
**Test:** 1587 toplam test, tsc temiz, vite build temiz
**Dokunulmayan:** Görünüm, davranış, badge stilleri, backend

---

## [2026-04-03] Phase 181 — Repeated Small Border Radius Constant Pack

**Ne:** Bileşenlerde tekrar eden `borderRadius` literal'larını dosya-seviyesi const'lara taşıma.
**Eklenen/değiştirilen dosyalar:**
- `StandardVideoScriptPanel.tsx`: `RADIUS_XS = "4px"` eklendi, 3× inline → const
- `TemplateStyleLinkDetailPanel.tsx`: `RADIUS_SM = "6px"` eklendi, 3× inline → const
- `docs/testing/test-report-phase-181-repeated-small-border-radius-constant-pack.md` (yeni)
**Atlanılan:** TemplateDetailPanel (2× inline), MetadataPanel (2× inline), form dosyaları (const tanımlarda — inline değil)
**Test:** 1587 toplam test, tsc temiz, vite build temiz
**Dokunulmayan:** Görünüm, davranış, badge stilleri, backend

---

## [2026-04-03] Phase 180 — Repeated Small Loading/Busy Text Constant Pack

**Ne:** Tüm bileşenlerde tekrar eden loading/busy text literal ("Yükleniyor...", "Kaydediliyor...") kapsamlı audit'i.
**Sonuç:** Aynı dosya içinde threshold 3+ sağlayan yeni dosya bulunamadı. StandardVideoArtifactsPanel 2× "Yükleniyor..." (threshold altı). Form dosyalarında 1× "Kaydediliyor..." per dosya. Dosya değişikliği yapılmadı.
**Eklenen/değiştirilen dosyalar:**
- `docs/testing/test-report-phase-180-repeated-small-loading-busy-text-constant-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 179 — Repeated Small Status Text Constant Pack

**Ne:** Tüm bileşenlerde tekrar eden status/info text literal ve style bloklarının kapsamlı audit'i.
**Sonuç:** Aynı dosya içinde threshold 3+ sağlayan yeni dosya bulunamadı. StandardVideoArtifactsPanel 2× "Yükleniyor..." (threshold altı). Form dosyalarında 1× "Kaydediliyor..." per dosya. Dosya değişikliği yapılmadı.
**Eklenen/değiştirilen dosyalar:**
- `docs/testing/test-report-phase-179-repeated-small-status-text-constant-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 178 — Repeated Small Monospace/Code Style Constant Pack

**Ne:** Tüm panel/detail/preview bileşenlerinde tekrar eden monospace/code-like inline style bloklarının kapsamlı audit'i.
**Sonuç:** Aynı dosya içinde threshold 3+ sağlayan yeni dosya bulunamadı. TemplateForm ve StyleBlueprintForm zaten JSON_TEXTAREA const'a sahip. TemplateStyleLinksTable 2× aynı stil (threshold altı). Dosya değişikliği yapılmadı.
**Eklenen/değiştirilen dosyalar:**
- `docs/testing/test-report-phase-178-repeated-small-monospace-code-style-constant-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 177 — Repeated Small Panel Meta Text Constant Pack

**Ne:** Tüm detail/overview/panel bileşenlerinde tekrar eden muted/meta text inline style bloklarının kapsamlı audit'i.
**Sonuç:** Aynı dosya içinde threshold 3+ sağlayan yeni dosya bulunamadı. SettingDetailPanel ve VisibilityRuleDetailPanel zaten MUTED const'a sahip. Kalan dosyalarda max 2× inline. Dosya değişikliği yapılmadı.
**Eklenen/değiştirilen dosyalar:**
- `docs/testing/test-report-phase-177-repeated-small-panel-meta-text-constant-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 176 — Repeated Small Form Help Text Style Constant Pack

**Ne:** Tüm form ve panel bileşenlerinde tekrar eden help text / muted text inline style bloklarının kapsamlı audit'i.
**Sonuç:** Aynı dosya içinde threshold 3+ sağlayan yeni dosya bulunamadı. Max 2× per dosya (validation hint, submitError, label helper, muted span). Dosya değişikliği yapılmadı.
**Eklenen/değiştirilen dosyalar:**
- `docs/testing/test-report-phase-176-repeated-small-form-help-text-style-constant-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 175 — Repeated Small Panel Divider Constant Pack

**Ne:** Tüm panel ve form bileşenlerinde tekrar eden divider/separator inline style bloklarının kapsamlı audit'i.
**Sonuç:** Aynı dosya içinde threshold 3+ sağlayan yeni dosya bulunamadı. borderTop ve borderBottom pattern'leri her dosyada en fazla 1× inline olarak görülüyor. Dosya değişikliği yapılmadı.
**Eklenen/değiştirilen dosyalar:**
- `docs/testing/test-report-phase-175-repeated-small-panel-divider-constant-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 174 — Repeated Required Mark Constant Pack

**Ne:** Tüm form bileşenlerinde tekrar eden required-mark span style bloklarının kapsamlı audit'i.
**Sonuç:** Threshold 3+ sağlayan yeni dosya bulunamadı. TemplateForm ve UsedNewsForm Phase 173'te zaten extraction yapılmıştı. Kalan dosyalarda max 2× inline span (threshold altı). Dosya değişikliği yapılmadı.
**Eklenen/değiştirilen dosyalar:**
- `docs/testing/test-report-phase-174-repeated-required-mark-constant-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz

---

## [2026-04-03] Phase 173 — Repeated Form Label Style Constant Pack

**Ne:** Form bileşenlerindeki tekrar eden required-field span style bloklarını dosya-seviyesi const'lara taşıma.
**Eklenen/değiştirilen dosyalar:**
- `TemplateForm.tsx`: `REQ_MARK` eklendi, 3× `style={{ color: "#dc2626" }}` → `style={REQ_MARK}`
- `UsedNewsForm.tsx`: `REQ_MARK` eklendi, 3× → `style={REQ_MARK}`
- `docs/testing/test-report-phase-173-repeated-form-label-style-constant-pack.md` (yeni)
**Atlanılan:** `StandardVideoForm.tsx` — 1× span + 2× farklı style nesnesi, threshold altı
**Test:** 1587 toplam test, tsc temiz, vite build temiz
**Dokunulmayan:** Görünüm, davranış, badge stilleri, backend

---

## [2026-04-03] Phase 172 — Repeated Input/Textarea Style Constant Pack

**Ne:** Form bileşenlerindeki tekrar eden textarea/input style bloklarını dosya-seviyesi const'lara taşıma.
**Eklenen/değiştirilen dosyalar:**
- `TemplateForm.tsx`: `JSON_TEXTAREA` eklendi, 3× multiline → 1-line spread
- `StyleBlueprintForm.tsx`: `JSON_TEXTAREA` eklendi, map textarea → spread
- `SourceScanForm.tsx`: `TEXTAREA` eklendi, 2× inline → const
- `docs/testing/test-report-phase-172-repeated-input-textarea-style-constant-pack.md` (yeni)
**Test:** 1587 toplam test, tsc temiz, vite build temiz
**Dokunulmayan:** Görünüm, davranış, badge stilleri, backend

---

## [2026-04-03] Phase 171 — Repeated Simple Layout Constant Pack

**Ne:** NewsBulletin form bileşenlerindeki tekrar eden field layout style bloklarını dosya-seviyesi const'lara taşıma.
**Eklenen/değiştirilen dosyalar:**
- `NewsBulletinForm.tsx`: `const FIELD` eklendi, 10× inline → const
- `NewsBulletinMetadataForm.tsx`: `const FIELD` eklendi, 8× inline → const
- `NewsBulletinScriptForm.tsx`: `const FIELD` eklendi, 3× + 1 spread
- `NewsBulletinSelectedItemForm.tsx`: `const FIELD` eklendi, 2× + 1 spread
- `docs/testing/test-report-phase-171-repeated-simple-layout-constant-pack.md` (yeni)
**Test:** 1587 toplam test, tsc temiz, vite build temiz
**Dokunulmayan:** Görünüm, davranış, badge stilleri, backend

---

## [2026-04-03] Phase 170 — Repeated Action Row Style Constant Pack

**Ne:** Form bileşenlerindeki tekrar eden flex container / action row style bloklarını dosya-seviyesi const'lara taşıma.
**Eklenen/değiştirilen dosyalar:**
- `StandardVideoMetadataForm.tsx`: `PAIR_ROW` (2×) + `FLEX_1` (4×) extraction
- `StandardVideoScriptForm.tsx`: `PAIR_ROW` (1×) + `FLEX_1` (2×) extraction (MetadataForm ile tutarlılık)
- `docs/testing/test-report-phase-170-repeated-action-row-style-constant-pack.md` (yeni)
**Test:** 1587 toplam test, tsc temiz, vite build temiz
**Dokunulmayan:** Görünüm, davranış, badge stilleri, backend

---

## [2026-04-03] Phase 169 — Repeated Form Section Heading Constant Pack

**Ne:** Form ve panel bileşenlerindeki tekrar eden section heading metin ve style bloklarının audit'i.
**Sonuç:** Threshold 3+ sağlanamadı. NewsBulletin panel h4'leri 2×, detail panel h3'leri 1× per dosya. Dosya değişikliği yapılmadı.
**Eklenen/değiştirilen dosyalar:**
- `docs/testing/test-report-phase-169-repeated-form-section-heading-constant-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz, vite build temiz
**Dokunulmayan:** Tüm bileşen dosyaları

---

## [2026-04-03] Phase 168 — Repeated Action Button Text Constant Pack

**Ne:** Form ve panel bileşenlerindeki tekrar eden action button text literal'ları kapsamlı audit ile tarandı.
**Sonuç:** Threshold 3+ sağlanamadı. Tüm dosyalarda max 2 tekrar. Dosya değişikliği yapılmadı.
**Eklenen/değiştirilen dosyalar:**
- `docs/testing/test-report-phase-168-repeated-action-button-text-constant-pack.md` (yeni — audit belgesi)
**Test:** 1587 toplam test, tsc temiz, vite build temiz
**Dokunulmayan:** Tüm bileşen dosyaları — hiçbiri değiştirilmedi

---

## [2026-04-03] Phase 167 — Repeated Form Button Style Constant Pack

**Ne:** Form bileşenlerindeki save/cancel button inline style bloklarını dosya-seviyesi BTN_PRIMARY + BTN_CANCEL const'larına taşıma. İki pattern grubu: küçük (0.375rem) ve büyük (0.5rem) butonlar.
**Eklenen/değiştirilen dosyalar:**
- `NewsItemForm.tsx`, `UsedNewsForm.tsx`, `TemplateStyleLinkForm.tsx`: BTN_PRIMARY + BTN_CANCEL (Pattern A)
- `TemplateForm.tsx`, `SourceScanForm.tsx`, `StyleBlueprintForm.tsx`: BTN_PRIMARY + BTN_CANCEL (Pattern A, BORDER_COLOR entegreli)
- `StandardVideoForm.tsx`, `StandardVideoMetadataForm.tsx`, `StandardVideoScriptForm.tsx`: BTN_PRIMARY + BTN_CANCEL (Pattern B)
- `docs/testing/test-report-phase-167-repeated-form-button-style-constant-pack.md` (yeni)
**Test:** 1587 toplam test, tsc temiz, vite build temiz
**Dokunulmayan:** Görünüm, davranış, SourceForm (farklı palette), NewsBulletin form'ları (style yok)

---

## [2026-04-03] Phase 166 — Repeated Neutral Color Literal Constant Pack

**Ne:** Form ve panel bileşenlerinde 4+ tekrarlı bare color literal'lerini dosya-seviyesi const'lara taşıma. `BORDER_COLOR` (#e2e8f0) ve `MUTED_TEXT` (#64748b) eklendi.
**Eklenen/değiştirilen dosyalar:**
- `TemplateForm.tsx`: `const BORDER_COLOR` eklendi, 7 → const referansı
- `SourceScanForm.tsx`: `const BORDER_COLOR` eklendi, 5 → const referansı
- `StyleBlueprintForm.tsx`: `const BORDER_COLOR` eklendi, 5 → const referansı
- `NewsBulletinSelectedItemsPanel.tsx`: `const MUTED_TEXT` eklendi, 6 → const referansı
- `docs/testing/test-report-phase-166-repeated-neutral-color-literal-constant-pack.md` (yeni)
**Test:** 1587 toplam test, tsc temiz, vite build temiz
**Dokunulmayan:** Görünüm, davranış, badge stilleri, backend

---

## [2026-04-03] Phase 165 — Repeated Empty/Fallback String Constant Pack

**Ne:** Bileşenlerde 3+ kez tekrar eden fallback string literal'lerini const ile extraction. Kapsamlı audit yapıldı; tek gerçek extraction fırsatı NewsBulletinForm.tsx'de bulundu.
**Eklenen/değiştirilen dosyalar:**
- `NewsBulletinForm.tsx`: `const DASH = "—"` eklendi, 4 JSX `—` text → `{DASH}`
- `docs/testing/test-report-phase-165-repeated-empty-fallback-string-constant-pack.md` (yeni)
**Test:** 1587 toplam test, tsc temiz, vite build temiz
**Dokunulmayan:** Badge type string'leri, STYLES key'leri, 2-tekrarlı dosyalar (threshold altı)

---

## [2026-04-03] Phase 164 — Repeated Heading/Text Style Constant Pack

**Ne:** Panel bileşenlerindeki tekrar eden heading ve muted text style nesnelerini dosya-seviyesi const'lara taşıma. FORM_HEADING (h4 create/edit başlıkları) ve MUTED (em dash fallback'leri).
**Eklenen/değiştirilen dosyalar:**
- `StandardVideoMetadataPanel.tsx`: FORM_HEADING, 2 h4
- `StandardVideoScriptPanel.tsx`: FORM_HEADING, 2 h4
- `VisibilityRuleDetailPanel.tsx`: MUTED, 4 em
- `SettingDetailPanel.tsx`: MUTED, 2 em
- `docs/testing/test-report-phase-164-repeated-heading-text-style-constant-pack.md` (yeni)
**Test:** 1587 toplam test, tsc temiz, vite build temiz
**Dokunulmayan:** Görünüm, davranış, badge stilleri, backend

---

## [2026-04-03] Phase 163 — Repeated Section/Container Style Constant Pack

**Ne:** Panel/metadata/script bileşenlerindeki tekrar eden section wrapper ve container style nesnelerini dosya-seviyesi const'lara taşıma. Component içi `sectionStyle`'lar dosya-seviyesine çıkarıldı.
**Eklenen/değiştirilen dosyalar:**
- NewsBulletinMetadataPanel.tsx, NewsBulletinScriptPanel.tsx: SECTION_STYLE (marginTop variant)
- StandardVideoMetadataPanel.tsx, StandardVideoScriptPanel.tsx: SECTION_STYLE (marginBottom variant)
- SourceDetailPanel.tsx, SourceScanDetailPanel.tsx, TemplateDetailPanel.tsx, StyleBlueprintDetailPanel.tsx: PANEL_BOX + SECTION_DIVIDER
- `docs/testing/test-report-phase-163-repeated-section-container-style-constant-pack.md` (yeni)
**Test:** 1587 toplam test, tsc temiz, vite build temiz
**Dokunulmayan:** Görünüm, davranış, badge stilleri, backend

---

## [2026-04-03] Phase 162 — Repeated Table Cell Style Constant Pack

**Ne:** Registry tablo bileşenlerindeki tekrar eden `th`/`td` inline style nesnelerini dosya başı `TH_STYLE`/`TD_STYLE` const ile extraction.
**Eklenen/değiştirilen dosyalar:**
- 12 tablo bileşeni: TH_STYLE/TD_STYLE const eklendi, inline style nesneleri kaldırıldı
  - SourcesTable, SourceScansTable, NewsItemsTable, NewsBulletinsTable, UsedNewsTable, JobsTable, TemplatesTable, StyleBlueprintsTable, StandardVideosTable, SettingsTable, VisibilityRulesTable, NewsItemPickerTable
- `docs/testing/test-report-phase-162-repeated-table-cell-style-constant-pack.md` (yeni)
**Test:** 1587 toplam test, tsc temiz, vite build temiz
**Dokunulmayan:** Görünüm, davranış, badge stilleri, ek style property'li TD'ler, backend

---

## [2026-04-03] Phase 161 — Repeated Panel Label Style Constant Pack

**Ne:** Aynı dosya içinde tekrar eden inline label style nesnelerini dosya başı `const` ile extraction. 6 dosyada LABEL_TD, LABEL_TD_TOP, LABEL_SPAN pattern'leri.
**Eklenen/değiştirilen dosyalar:**
- `NewsBulletinMetadataPanel.tsx`: `LABEL_TD` const, 9 td satırı sadeleşti
- `StandardVideoMetadataPanel.tsx`: `LABEL_TD` + `LABEL_TD_TOP` const, 8 td satırı sadeleşti
- `NewsBulletinScriptPanel.tsx`: `LABEL_TD` const, 4 td satırı sadeleşti
- `StandardVideoScriptPanel.tsx`: `LABEL_TD` const, 4 td satırı sadeleşti
- `SourceDetailPanel.tsx`: `LABEL_SPAN` const, 2 span sadeleşti
- `SourceScanDetailPanel.tsx`: `LABEL_SPAN` const, 1 span sadeleşti
- `docs/testing/test-report-phase-161-repeated-panel-label-style-constant-pack.md` (yeni)
**Test:** 1587 toplam test, tsc temiz, vite build temiz
**Dokunulmayan:** Görünüm, davranış, badge stilleri, backend, business logic, yeni feature

---

## [2026-04-03] Phase 160 — Field/Row Label-Value Rendering Consistency Pack

**Ne:** Detail panel bileşenlerinde Row ve Field label-value görsel dilinin hizalanması. 3 Row value span'e `overflowWrap: "anywhere"` eklendi (JobDetailPanel, JobOverviewPanel, VisibilityRuleDetailPanel). 2 Field label span'e `color: "#64748b"` + `fontSize: "0.8125rem"` eklendi (NewsBulletinDetailPanel, UsedNewsDetailPanel).
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/jobs/JobDetailPanel.tsx`: Row value overflowWrap
- `frontend/src/components/jobs/JobOverviewPanel.tsx`: Row value overflowWrap
- `frontend/src/components/visibility/VisibilityRuleDetailPanel.tsx`: Row value overflowWrap
- `frontend/src/components/news-bulletin/NewsBulletinDetailPanel.tsx`: Field label color+fontSize
- `frontend/src/components/used-news/UsedNewsDetailPanel.tsx`: Field label color+fontSize
- `docs/testing/test-report-phase-160-field-row-label-value-rendering-consistency-pack.md` (yeni)
**Test:** 1587 toplam test, tsc temiz, vite build temiz
**Dokunulmayan:** Badge stilleri, form bileşenleri, business logic, backend, mevcut ham sütunlar

---

## [2026-04-03] Phase 159 — Helper Return-Type Consistency & Call-Site Safety Pack

**Ne:** Helper dönüş tipleri ile call-site beklentileri arasındaki tutarsızlıkları giderme. `formatDateTime` default fallback `null` → `"—"`, dönüş tipi `string | null` → `string`.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/lib/formatDate.ts`: formatDateTime imza değişikliği
- `frontend/src/tests/date-formatting-safety.smoke.test.tsx`: 1 assertion güncelleme
- `docs/testing/test-report-phase-159-helper-return-type-consistency-call-site-safety-pack.md` (yeni)
**Test:** 1587 toplam test, tsc temiz, vite build temiz
**Dokunulmayan:** formatDateISO ReactNode dönüş tipi korundu, formatDuration parametrize edilmedi, helper mimarisi yeniden yazılmadı, badge stilleri, backend

---

## [2026-04-03] Phase 158 — Repeated Date Fallback Constant & Readability Pack

**Ne:** Date render yüzeylerinde kalan inline `"—"` fallback'lerini DASH const'a dönüştürme. Phase 157'de kaçan content ternary `"—"` kalıntılarını temizleme.
**Eklenen/değiştirilen dosyalar:**
- `StandardVideoOverviewPanel.tsx`: `const DASH` eklendi, 3 inline `"—"` → `DASH`
- `StandardVideosTable.tsx`: formatDateTime fallback `"—"` → `DASH`
- `NewsBulletinScriptPanel.tsx`: content ternary `"—"` → `DASH`
- `StandardVideoScriptPanel.tsx`: content ternary `"—"` → `DASH`
- `docs/testing/test-report-phase-158-repeated-date-fallback-constant-readability-pack.md` (yeni)
**Test:** 1587 toplam test, tsc temiz, vite build temiz
**Dokunulmayan:** Date helper mimarisi, locale, relative time, 2 tekrarlı dosyalar, badge stilleri, backend

---

## [2026-04-03] Phase 157 — Duplicate Inline Fallback Pattern Reduction Pack

**Ne:** Bileşen içinde 3+ kez tekrar eden `?? "—"` inline fallback pattern'lerini `const DASH = "—"` local const extraction ile sadeleştirme. 13 dosyada toplam 62 inline string → const referansına dönüşüm.
**Eklenen/değiştirilen dosyalar:**
- 13 bileşen: `const DASH = "—"` extraction + inline `"—"` → `DASH` (8 tablo, 3 panel, 2 script panel)
- `frontend/src/tests/clipboard-text-hygiene.smoke.test.tsx`: 11 assertion güncelleme (DASH pattern kabul)
- `docs/testing/test-report-phase-157-duplicate-inline-fallback-pattern-reduction-pack.md` (yeni)
**Test:** 1587 toplam test, tsc temiz, vite build temiz
**Dokunulmayan:** Form `?? ""` pattern'leri (standard React), 1-2 tekrarlı dosyalar, badge stilleri, backend, business logic

---

## [2026-04-03] Phase 156 — Shared Fallback Helper Consolidation Pack

**Ne:** Inline güvenlik pattern'lerinin shared helper'lara konsolidasyonu. 5 summary bileşende inline `typeof raw === "number" && !isNaN(raw) && isFinite(raw)` pattern'i `safeNumber()` ile değiştirildi. 2 tablo bileşende version interpolation `safeNumber()` ile konsolide edildi. 1 summary bileşende lokal `safeCount()` fonksiyonu kaldırılıp `safeNumber()` ile değiştirildi. 1 timeline panelde inline date slice `formatDateISO()` ile değiştirildi.
**Eklenen/değiştirilen dosyalar:**
- 5 summary bileşen: `safeNumber()` konsolidasyonu (TemplateReadiness, SourceReadiness, NewsBulletinReadiness, NewsBulletinSourceCoverage, NewsItemReadiness)
- 1 summary bileşen: lokal `safeCount` → `safeNumber()` (NewsBulletinSelectedNewsQuality)
- 2 tablo bileşen: version `safeNumber()` konsolidasyonu (TemplatesTable, StyleBlueprintsTable)
- 1 panel: `formatDateISO()` konsolidasyonu (JobTimelinePanel)
- 2 test dosyası güncelleme: safeNumber pattern kabul (numeric-display-safety, required-field-safety)
**Test:** 1587 toplam test, tsc temiz, vite build temiz
**Dokunulmayan:** Conditional validity check pattern'leri (SourceScanExecutionSummary inline korundu), yeni test eklenmedi, badge stilleri korundu

---

## [2026-04-03] Phase 155 — String Normalization & Whitespace Safety Pack

**Ne:** String/whitespace render yüzeylerinde blank-aware fallback koruması. Shared `isBlank()` helper oluşturuldu. 4 detail panel Field, 1 overview Row, 1 UrlField, 7 conditional notes render, 3 script content display whitespace-safe hale getirildi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/lib/isBlank.ts` (yeni — shared whitespace-aware blank check helper)
- `frontend/src/tests/string-normalization-whitespace-safety.smoke.test.tsx` (yeni — 27 structural guard test)
- 10 bileşen: isBlank guard eklendi
- 2 mevcut test: isBlank pattern kabul güncellendi
**Test:** 1587 toplam test (+27 yeni), tsc temiz, vite build temiz
**Dokunulmayan:** Typography/padding redesign yok, agresif trim yok, backend yok, business logic yok

---

## [2026-04-03] Phase 154 — Boolean / Toggle / Flag Render Safety Pack

**Ne:** Boolean/toggle/flag render yüzeylerinde null/undefined tristate koruması. BoolBadge bileşenine `value == null` guard eklendi, 10+ mevcut boolean yüzey doğrulandı (zaten güvenli), 25 structural guard test yazıldı.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/tests/boolean-toggle-flag-render-safety.smoke.test.tsx` (yeni — 25 structural guard test)
- `SettingDetailPanel.tsx`: BoolBadge null/undefined tristate guard
- `VisibilityRuleDetailPanel.tsx`: BoolBadge null/undefined tristate guard
**Test:** 1560 toplam test (+25 yeni), tsc temiz, vite build temiz
**Dokunulmayan:** Toggle UX redesign yok, badge stil değişikliği yok, label yeniden yazımı yok, backend yok, business logic yok

---

## [2026-04-03] Phase 153 — Array / List Render Safety Pack

**Ne:** Array/list render yüzeylerinde `.map()`, `.length`, `.join()` crash risklerine karşı `Array.isArray` guard eklendi. 2 step-list bileşeni düzeltildi, 5 mevcut JSON.parse null guard doğrulandı, 15 structural guard test yazıldı.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/tests/array-list-render-safety.smoke.test.tsx` (yeni — 15 structural guard test)
- `JobTimelinePanel.tsx`: `Array.isArray` guard + `safeSteps` pattern
- `JobStepsList.tsx`: `Array.isArray` guard + `safeSteps` pattern
**Test:** 1535 toplam test (+15 yeni), tsc temiz, vite build temiz
**Dokunulmayan:** List UX redesign yok, chips/tags yok, sorting/reordering yok, backend yok, business logic yok

---

## [2026-04-03] Phase 152 — Numeric / Count / Ratio Display Safety Pack

**Ne:** Sayısal alanlarda NaN/Infinity/undefined sızıntı koruması. Summary count display'lerde, table version interpolation'larda, detail panel Number() dönüşümlerinde ve form validation'larda isFinite/isNaN guard eklendi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/lib/safeNumber.ts` (yeni — shared numeric safety helper)
- `frontend/src/tests/numeric-display-safety.smoke.test.tsx` (yeni — 33 structural guard test)
- 7 summary bileşeni: count/ratio display guard
- 2 tablo: version interpolation guard
- 5 detail panel: Number() NaN/Infinity guard
- 6 form: isFinite validation eklendi
- `required-field-safety.smoke.test.tsx` (version test pattern güncellendi)
**Test:** 1520 toplam test (+33 yeni), tsc temiz, vite build temiz
**Dokunulmayan:** Score/analytics mantığı yok, badge stili yok, backend yok, business logic yok

---

## [2026-04-03] Phase 151 — Badge Enum / Status Unknown-Value Safety Pack

**Ne:** Badge bileşenlerinde bilinmeyen enum/status değerleri için iki katmanlı koruma: (1) style map lookup'larda neutral fallback (`?? { bg: "#f8fafc", ... }`), (2) label text render'larda null fallback (`{level ?? "—"}`, `{status ?? "—"}`).
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/tests/badge-unknown-value-safety.smoke.test.tsx` (yeni — 236 structural guard test)
- 76 badge bileşeni: label text null fallback (70 level + 6 status)
- 62 badge bileşeni: style lookup neutral fallback (14'ü zaten named-key fallback kullanıyordu)
**Test:** 1487 toplam test (+236 yeni), tsc temiz, vite build temiz
**Dokunulmayan:** Badge renk/stil değerleri değiştirilmedi, enum type tanımları değiştirilmedi, backend yok, business logic yok

---

## [2026-04-03] Phase 150 — Required Field Assumption Safety Pack

**Ne:** Required kabul edilen text/enum/id alanlarında null fallback koruması. 9 registry tablo ve 2 detail panelde toplam 30 property render'a `?? "—"` veya `?? 0` fallback eklendi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/tests/required-field-safety.smoke.test.tsx` (yeni — 42 structural guard test)
- `SettingsTable.tsx` (5 fallback), `VisibilityRulesTable.tsx` (4), `SourcesTable.tsx` (3), `StandardVideosTable.tsx` (2), `TemplatesTable.tsx` (5), `StyleBlueprintsTable.tsx` (3), `NewsBulletinsTable.tsx` (2), `NewsItemPickerTable.tsx` (2), `TemplateStyleLinksTable.tsx` (1)
- `SettingDetailPanel.tsx` (5 fallback), `VisibilityRuleDetailPanel.tsx` (4)
**Test:** 1251 toplam test (+42 yeni), tsc temiz, vite build temiz
**Dokunulmayan:** Backend schema yok, validation yok, badge stilleri korundu, business logic değişiklik yok

---

## [2026-04-03] Phase 149 — Clipboard / Copy Surface Safety & Text Export Hygiene Pack

**Ne:** Kopyalanabilir text yüzeylerinde null/undefined sızıntı koruması. Script, metadata, artifacts panellerinde 13 property'ye `?? "—"` fallback eklendi. Content block'larda null-safe length check. overflowWrap eklendi. safeJsonPretty whitespace-only string guard eklendi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/tests/clipboard-text-hygiene.smoke.test.tsx` (yeni — 25 structural guard test)
- `StandardVideoScriptPanel.tsx` (3 null fallback, content null-safe, overflowWrap)
- `NewsBulletinScriptPanel.tsx` (2 null fallback, content null-safe, overflowWrap)
- `StandardVideoMetadataPanel.tsx` (4 null fallback)
- `NewsBulletinMetadataPanel.tsx` (2 null fallback)
- `StandardVideoArtifactsPanel.tsx` (content null-safe, wordBreak + overflowWrap)
- `JsonPreviewField.tsx` (overflowWrap eklendi)
- `safeJson.ts` (whitespace-only string guard)
- `text-overflow-safety.smoke.test.tsx` (metadata.title pattern fix)
**Test:** 1209 toplam test (+25 yeni), tsc temiz, vite build temiz
**Dokunulmayan:** Copy button yok, export format yok, badge stilleri korundu, backend değişiklik yok

---

## [2026-04-03] Phase 148 — URL / Link Surface Safety & External Target Hygiene Pack

**Ne:** URL/link yüzeylerinde güvenlik denetimi ve düzeltme. Anchor null guard, rel attribute fix, UrlField overflowWrap eklendi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/tests/url-link-safety.smoke.test.tsx` (yeni — 13 structural guard test)
- `NewsItemDetailPanel.tsx` (anchor null guard + rel="noopener noreferrer" fix)
- `SourceDetailPanel.tsx` (UrlField overflowWrap eklendi)
**Test:** 1184 toplam test (+13 yeni), tsc temiz, vite build temiz
**Dokunulmayan:** Link preview yok, favicon yok, URL normalization yok, badge stilleri korundu, backend değişiklik yok

---

## [2026-04-03] Phase 147 — Text Field Overflow & Long Content Safety Pack

**Ne:** Tüm korumasız metin render yüzeylerine wordBreak/overflowWrap overflow koruması eklendi. 9 detail panel Field/Row, 5 inline metin, 7 registry table (10 td), 14 form error display düzeltildi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/tests/text-overflow-safety.smoke.test.tsx` (yeni — 34 structural guard test)
- 9 detail panel: SourceDetailPanel, NewsItemDetailPanel, UsedNewsDetailPanel, TemplateDetailPanel, StyleBlueprintDetailPanel, NewsBulletinDetailPanel, TemplateStyleLinkDetailPanel, SourceScanDetailPanel, StandardVideoOverviewPanel (Field/Row overflow fix)
- 5 inline panel: JobTimelinePanel, StandardVideoMetadataPanel, NewsBulletinMetadataPanel, NewsBulletinSelectedItemsPanel (inline text overflow fix)
- 7 registry table: SettingsTable, VisibilityRulesTable, SourcesTable, TemplatesTable, StandardVideosTable, StyleBlueprintsTable, NewsBulletinsTable (td overflow fix)
- 14 form: TemplateForm, StyleBlueprintForm, TemplateStyleLinkForm, SourceScanForm, NewsItemForm, UsedNewsForm, StandardVideoForm, StandardVideoScriptForm, StandardVideoMetadataForm, SourceForm, NewsBulletinMetadataForm, NewsBulletinScriptForm, NewsBulletinSelectedItemForm, NewsBulletinForm (error display overflow fix)
**Test:** 1171 toplam test (+34 yeni), tsc temiz, vite build temiz
**Dokunulmayan:** Font boyutları, layout yapısı, max-width/truncation yok, badge stilleri korundu, backend değişiklik yok

---

## [2026-04-03] Phase 146 — JSON Field Preview Safety & Readability Pack

**Ne:** JSON alanlarını gösteren yüzeylerde güvenlik ve okunurluk iyileştirmeleri. Paylaşılan helper ve bileşen çıkarıldı, duplicate tanımlar kaldırıldı, overflow koruması eklendi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/lib/safeJson.ts` (yeni — safeJsonPretty + validateJson)
- `frontend/src/components/shared/JsonPreviewField.tsx` (yeni — shared JSON preview bileşeni)
- `frontend/src/tests/json-safety.smoke.test.tsx` (yeni — 19 guard test)
- `TemplateDetailPanel.tsx` (local JsonField → shared import)
- `StyleBlueprintDetailPanel.tsx` (local JsonField → shared import)
- `SourceScanDetailPanel.tsx` (local JsonPreviewField → shared import)
- `TemplateForm.tsx` (local validateJson → shared import)
- `StyleBlueprintForm.tsx` (local validateJson → shared import)
- `NewsBulletinDetailPanel.tsx` (overflow safety eklendi)
- `StandardVideoArtifactsPanel.tsx` (overflow safety eklendi)
- `NewsBulletinMetadataPanel.tsx` (overflow safety eklendi)
- `SettingDetailPanel.tsx` (overflow safety + null fallback eklendi)
- `docs/testing/test-report-phase-146-json-field-preview-safety-readability-pack.md` (yeni)
**Korunan:** Badge stilleri, business logic, mevcut JSON rendering davranışı. Bilgi kaybı sıfır.
**Test:** 1137 toplam (+19 yeni), tsc temiz, build temiz.

---

## [2026-04-03] Phase 145 — List/Detail/Form Date Formatting Safety Unification Pack

**Ne:** Paylaşılan tarih helper kütüphanesi oluşturuldu ve tüm inline tarih pattern'leri (5 farklı pattern) bu helper'larla değiştirildi. 23 dosya güncellendi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/lib/formatDate.ts` (yeni — 4 helper: formatDateTime, formatDateShort, formatDateISO, normalizeDateForInput)
- `frontend/src/tests/date-formatting-safety.smoke.test.tsx` (yeni — 19 guard test)
- 9 detail panel (formatDateTime import + usage)
- 2 job panel (formatDateISO import + usage)
- 8 registry table (formatDateShort/formatDateISO/formatDateTime import + usage)
- 3 sub-panel/picker (formatDateShort import + usage)
- 1 form (normalizeDateForInput import + usage)
- `docs/testing/test-report-phase-145-list-detail-form-date-formatting-safety-unification-pack.md` (yeni)
**Önemli fix:** SourceScanSummary.tsx'de eksik Invalid Date guard eklendi — önceden geçersiz tarihte crash riski vardı.
**Korunan:** Badge stilleri, görsel çıktı, fallback değerleri. Bilgi kaybı sıfır.
**Test:** 1118 toplam (+19 yeni), tsc temiz, build temiz.

---

## [2026-04-03] Phase 144 — Form Surface Empty/Null State Safety Pack

**Ne:** 14 form bileşeninde null/undefined/empty state render ve input güvenliği denetimi ve güçlendirmesi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/templates/TemplateForm.tsx` (version null guard: String(initial.version ?? 1))
- `frontend/src/components/style-blueprints/StyleBlueprintForm.tsx` (version null guard: String(initial.version ?? 1))
- `frontend/src/components/news-items/NewsItemForm.tsx` (published_at String() coercion)
- `frontend/src/tests/form-null-safety.smoke.test.tsx` (yeni — 4 guard test)
- `docs/testing/test-report-phase-144-form-surface-empty-null-state-safety-pack.md` (yeni)
**Korunan:** Badge stilleri, form UX, validation kuralları, business logic. Bilgi kaybı sıfır.
**Test:** 1099 toplam (+4 yeni), tsc temiz, build temiz.

---

## [2026-04-03] Phase 143 — Detail Panel Empty/Null State Safety Pack

**Ne:** 11 detail panel bileşeninde null/undefined/empty state render ve form handler güvenliği.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/templates/TemplateDetailPanel.tsx` (created_at/updated_at ternary guard)
- `frontend/src/components/sources/SourceDetailPanel.tsx` (created_at/updated_at ternary guard)
- `frontend/src/components/news-bulletin/NewsBulletinDetailPanel.tsx` (date guard + 6 field .trim() null safety)
- `frontend/src/components/style-blueprints/StyleBlueprintDetailPanel.tsx` (created_at/updated_at ternary guard)
- `frontend/src/components/template-style-links/TemplateStyleLinkDetailPanel.tsx` (created_at/updated_at ternary guard)
- `frontend/src/components/source-scans/SourceScanDetailPanel.tsx` (date guard + 4 field .trim() null safety)
- `frontend/src/components/used-news/UsedNewsDetailPanel.tsx` (date guard + 5 field .trim() null safety)
- `frontend/src/components/news-items/NewsItemDetailPanel.tsx` (date guard + 7 field .trim() null safety)
- `frontend/src/components/standard-video/StandardVideoOverviewPanel.tsx` (created_at/updated_at ternary guard)
- `frontend/src/components/jobs/JobDetailPanel.tsx` (.slice() crash guard)
- `frontend/src/components/jobs/JobOverviewPanel.tsx` (.slice() crash guard)
- `frontend/src/tests/detail-panel-null-safety.smoke.test.tsx` (yeni — 2 guard test)
- `docs/testing/test-report-phase-143-detail-panel-empty-null-state-safety-pack.md` (yeni)
**Korunan:** Badge stilleri, summary mantığı, tüm sütunlar, business logic. Bilgi kaybı sıfır.
**Test:** 1095 toplam (+2 yeni), tsc temiz.

---

## [2026-04-03] Phase 142 — Registry Empty/Null State Safety Pack

**Ne:** 9 registry tablosu ve summary bileşenlerinde null/undefined/empty state render güvenliği.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/jobs/JobsTable.tsx` (created_at null crash guard)
- `frontend/src/components/source-scans/SourceScansTable.tsx` (created_at Invalid Date guard)
- `frontend/src/components/news-items/NewsItemsTable.tsx` (created_at Invalid Date guard)
- `frontend/src/components/used-news/UsedNewsTable.tsx` (created_at Invalid Date guard)
- `frontend/src/components/style-blueprints/StyleBlueprintsTable.tsx` (created_at Invalid Date guard)
- `frontend/src/components/standard-video/StandardVideosTable.tsx` (created_at Invalid Date guard)
- `frontend/src/components/news-bulletin/NewsBulletinsTable.tsx` (created_at Invalid Date guard)
- `frontend/src/components/template-style-links/TemplateStyleLinksTable.tsx` (created_at Invalid Date guard)
- `frontend/src/components/news-bulletin/NewsBulletinSelectedItemsPanel.tsx` (created_at Invalid Date guard)
- `frontend/src/components/news-bulletin/NewsBulletinSelectedNewsQualitySummary.tsx` (NaN/Infinity count guard)
- `frontend/src/components/news-bulletin/NewsBulletinSourceCoverageSummary.tsx` (NaN count guard)
- `frontend/src/components/source-scans/SourceScanResultRichnessSummary.tsx` (NaN/Infinity count guard)
- `frontend/src/components/style-blueprints/StyleBlueprintReadinessSummary.tsx` (typeof string guard)
- `docs/testing/test-report-phase-142-registry-empty-null-state-safety-pack.md` (yeni)
**Korunan:** Badge stilleri, summary mantığı, tüm sütunlar, business logic. Bilgi kaybı sıfır.
**Test:** 1093 toplam, tsc temiz.

---

## [2026-04-03] Phase 141 — Registry Density & Overflow Safety Pack

**Ne:** 9 registry tablosunda yoğunluk ve taşma güvenliği standardizasyonu.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/jobs/JobsTable.tsx` (header background #f1f5f9, border 2px→1px, padding 0.5rem→0.5rem 0.75rem)
- `frontend/src/components/standard-video/StandardVideosTable.tsx` (header background #f8fafc→#f1f5f9)
- `frontend/src/components/news-bulletin/NewsBulletinsTable.tsx` (fontSize: "0.875rem" eklendi)
- 9 tablo: `<div style={{ overflowX: "auto" }}>` wrapper eklendi (Sources, SourceScans, Jobs, NewsItems, UsedNews, Templates, StyleBlueprints, StandardVideos, NewsBulletins)
- `docs/testing/test-report-phase-141-registry-density-overflow-safety-pack.md` (yeni)
**Korunan:** Badge stilleri, secondary textler, tüm sütunlar, tüm summary bileşenleri. Bilgi kaybı sıfır.
**Test:** 1093 toplam, tsc temiz.

---

## [2026-04-03] Phase 140 — Cross-Registry Header/Grouping Consistency Pack

**Ne:** 9 registry tablosu arasında başlık dili ve kavram tutarlılığı hizalaması.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/source-scans/SourceScansTable.tsx` ("Yayın Sonucu" → "Yayın Çıktısı")
- `frontend/src/components/jobs/JobsTable.tsx` ("Yayın Sonucu" → "Yayın Çıktısı")
- `frontend/src/components/news-bulletin/NewsBulletinsTable.tsx` ("Enforcement" → "Uygunluk")
- `frontend/src/tests/news-bulletin-enforcement-summary.smoke.test.tsx` (header testi güncellendi)
- `docs/testing/test-report-phase-140-cross-registry-header-grouping-consistency-pack.md` (yeni)
**Korunan:** Badge stilleri, secondary textler, tüm sütunlar, entity-specific grup isimleri. Bilgi kaybı sıfır.
**Test:** 1093 toplam, tsc temiz.

---

## [2026-04-03] Phase 139 — Standard Video + News Bulletin Registry Visibility Completion Pack

**Ne:** Standard Video ve News Bulletin tablolarının görünürlük ve okunabilirlik iyileştirmesi. Konservatif yaklaşım.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/news-bulletin/NewsBulletinInputQualitySummary.tsx` (import sırası düzeltmesi)
- `frontend/src/components/standard-video/StandardVideosTable.tsx` (sütun sırası mantıksal gruplara ayrıldı)
- `frontend/src/components/news-bulletin/NewsBulletinsTable.tsx` (8 başlık Türkçeleştirildi, header stili tutarlı hale getirildi, sütun sırası mantıksal gruplara ayrıldı)
- `frontend/src/tests/news-bulletin-artifact-summary.smoke.test.tsx` (header testi güncellendi)
- `docs/testing/test-report-phase-139-standardvideo-newsbulletin-registry-visibility-completion-pack.md` (yeni)
**Korunan:** Badge stilleri, secondary textler, tüm sütunlar (StandardVideo: 13, NewsBulletin: 18). Bilgi kaybı sıfır.
**Test:** 1093 toplam, tsc temiz.

---

## [2026-04-03] Phase 138 — Templates + Style Blueprints Registry Visibility Completion Pack

**Ne:** Templates ve Style Blueprints tablolarının görünürlük ve okunabilirlik iyileştirmesi. Konservatif yaklaşım.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/templates/TemplateInputQualitySummary.tsx` (import sırası düzeltmesi)
- `frontend/src/components/style-blueprints/StyleBlueprintInputQualitySummary.tsx` (import sırası düzeltmesi)
- `frontend/src/components/templates/TemplatesTable.tsx` (7 başlık Türkçeleştirildi, 14 sütun mantıksal gruplara ayrıldı)
- `frontend/src/components/style-blueprints/StyleBlueprintsTable.tsx` (5 başlık Türkçeleştirildi, 12 sütun mantıksal gruplara ayrıldı)
- `frontend/src/tests/template-style-link-summary.smoke.test.tsx` (header testi güncellendi)
- `docs/testing/test-report-phase-138-template-styleblueprint-registry-visibility-completion-pack.md` (yeni)
**Korunan:** Badge stilleri, secondary textler, tüm sütunlar (Templates: 14, StyleBlueprints: 12). Bilgi kaybı sıfır.
**Test:** 1093 toplam, tsc temiz.

---

## [2026-04-03] Phase 137 — News Registry Visibility Completion Pack

**Ne:** News Items + Used News tablolarının görünürlük ve okunabilirlik iyileştirmesi. Konservatif yaklaşım.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/used-news/UsedNewsArtifactConsistencySummary.tsx` (import sırası düzeltmesi)
- `frontend/src/components/news-items/NewsItemsTable.tsx` (sütun başlıkları Türkçeleştirildi, sütun sırası mantıksal gruplara ayrıldı)
- `frontend/src/components/used-news/UsedNewsTable.tsx` (sütun başlıkları Türkçeleştirildi, sütun sırası mantıksal gruplara ayrıldı)
- `docs/testing/test-report-phase-137-news-registry-visibility-completion-pack.md` (yeni)
**Korunan:** Badge stilleri, secondary textler, tüm sütunlar (NewsItems: 17, UsedNews: 13). Bilgi kaybı sıfır.
**Test:** 1093 toplam, tsc temiz.

---

## [2026-04-03] Phase 136 — Jobs Registry Visibility Completion Pack

**Ne:** Jobs tablosunun görünürlük ve okunabilirlik iyileştirmesi. Konservatif yaklaşım.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/jobs/JobInputQualitySummary.tsx` (import sırası düzeltmesi)
- `frontend/src/components/jobs/JobArtifactConsistencySummary.tsx` (import sırası düzeltmesi)
- `frontend/src/components/jobs/JobsTable.tsx` (sütun başlıkları Türkçeleştirildi, sütun sırası mantıksal gruplara ayrıldı)
- `frontend/src/tests/job-context-summary.smoke.test.tsx` (header testi güncellendi)
- `docs/testing/test-report-phase-136-jobs-registry-visibility-completion-pack.md` (yeni)
**Korunan:** Badge stilleri (4 grup), secondary textler, tüm 15 sütun. Bilgi kaybı sıfır.
**Test:** 1093 toplam, tsc temiz.

---

## [2026-04-03] Phase 135 — Source Scans Registry Visibility Completion Pack

**Ne:** Source Scans tablosunun görünürlük ve okunabilirlik iyileştirmesi. Konservatif yaklaşım.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/source-scans/SourceScanInputQualitySummary.tsx` (import sırası düzeltmesi)
- `frontend/src/components/source-scans/SourceScansTable.tsx` (sütun başlıkları Türkçeleştirildi, sütun sırası mantıksal gruplara ayrıldı)
- `docs/testing/test-report-phase-135-source-scans-registry-visibility-completion-pack.md` (yeni)
**Korunan:** Badge stilleri (4 grup), secondary textler, tüm 13 sütun. Bilgi kaybı sıfır.
**Test:** 1093 toplam, tsc temiz.

---

## [2026-04-03] Phase 134 — Sources Registry Visibility Completion Pack

**Ne:** Sources Registry tablosunun görünürlük ve okunabilirlik iyileştirmesi. Konservatif yaklaşım.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/sources/SourceInputQualitySummary.tsx` (import sırası düzeltmesi)
- `frontend/src/components/sources/SourcesTable.tsx` (sütun başlıkları Türkçeleştirildi, sütun sırası mantıksal gruplara ayrıldı)
- `frontend/src/tests/source-scan-summary.smoke.test.tsx` (header testi güncellendi)
- `frontend/src/tests/used-news-registry.smoke.test.tsx` (mock eksiklikleri giderildi)
- `frontend/src/tests/used-news-form.smoke.test.tsx` (mock eksiklikleri giderildi)
- `frontend/src/tests/used-news-state-summary.smoke.test.tsx` (mock eksiklikleri giderildi)
- `frontend/src/tests/news-bulletin-readiness-summary.smoke.test.tsx` (mock eksiklikleri giderildi)
- `frontend/src/tests/news-item-readiness-summary.smoke.test.tsx` (mock eksiklikleri giderildi)
- `frontend/src/tests/job-actionability-summary.smoke.test.tsx` (mock eksiklikleri giderildi)
- `docs/testing/test-report-phase-134-sources-registry-visibility-completion-pack.md` (yeni)
**Korunan:** Badge stilleri, secondary textler, tüm 16 sütun. Bilgi kaybı sıfır.
**Test:** 1093 toplam, tsc temiz, build temiz.

---

## [2026-04-02] Phase 124 — Template Target-Output Consistency Summary Frontend Foundation

**Ne:** Templates listesine target-output consistency özeti eklendi. Pure frontend türetimi, 4 seviye.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/templates/TemplateTargetOutputConsistencyBadge.tsx` (yeni)
- `frontend/src/components/templates/TemplateTargetOutputConsistencySummary.tsx` (yeni, computeTemplateTargetOutputConsistency)
- `frontend/src/components/templates/TemplatesTable.tsx` (Target/Output Tutarlılığı sütunu eklendi)
- `frontend/src/tests/template-target-output-consistency-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-124-template-target-output-consistency-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 1003 toplam, build temiz.

---

## [2026-04-02] Phase 123 — Style Blueprint Input Specificity Summary Frontend Foundation

**Ne:** Style Blueprints listesine input specificity özeti eklendi. Pure frontend türetimi, 3 seviye.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/style-blueprints/StyleBlueprintInputSpecificityBadge.tsx` (yeni)
- `frontend/src/components/style-blueprints/StyleBlueprintInputSpecificitySummary.tsx` (yeni, computeStyleBlueprintInputSpecificity)
- `frontend/src/components/style-blueprints/StyleBlueprintsTable.tsx` (Girdi Özgüllüğü sütunu eklendi)
- `frontend/src/tests/style-blueprint-input-specificity-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-123-style-blueprint-input-specificity-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 993 toplam, build temiz.

---

## [2026-04-02] Phase 122 — Template Input Specificity Summary Frontend Foundation

**Ne:** Templates listesine input specificity özeti eklendi. Pure frontend türetimi, 3 seviye.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/templates/TemplateInputSpecificityBadge.tsx` (yeni)
- `frontend/src/components/templates/TemplateInputSpecificitySummary.tsx` (yeni, computeTemplateInputSpecificity)
- `frontend/src/components/templates/TemplatesTable.tsx` (Girdi Özgüllüğü sütunu eklendi)
- `frontend/src/tests/template-input-specificity-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-122-template-input-specificity-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 983 toplam, build temiz.

---

## [2026-04-02] Phase 121 — Standard Video Input Specificity Summary Frontend Foundation

**Ne:** Standard Video listesine input specificity özeti eklendi. Pure frontend türetimi, 3 seviye.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/standard-video/StandardVideoInputSpecificityBadge.tsx` (yeni)
- `frontend/src/components/standard-video/StandardVideoInputSpecificitySummary.tsx` (yeni, computeStandardVideoInputSpecificity)
- `frontend/src/components/standard-video/StandardVideosTable.tsx` (Girdi Özgüllüğü sütunu eklendi)
- `frontend/src/tests/standard-video-input-specificity-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-121-standard-video-input-specificity-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 973 toplam, build temiz.

---

## [2026-04-02] Phase 120 — Source Input Specificity Summary Frontend Foundation

**Ne:** Sources listesine input specificity özeti eklendi. Pure frontend türetimi, 3 seviye.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/sources/SourceInputSpecificityBadge.tsx` (yeni)
- `frontend/src/components/sources/SourceInputSpecificitySummary.tsx` (yeni, computeSourceInputSpecificity)
- `frontend/src/components/sources/SourcesTable.tsx` (Girdi Özgüllüğü sütunu eklendi)
- `frontend/src/tests/source-input-specificity-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-120-source-input-specificity-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 963 toplam, build temiz.

---

## [2026-04-02] Phase 119 — Source Scan Input Specificity Summary Frontend Foundation

**Ne:** Source Scans listesine input specificity özeti eklendi. Pure frontend türetimi, 3 seviye.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/source-scans/SourceScanInputSpecificityBadge.tsx` (yeni)
- `frontend/src/components/source-scans/SourceScanInputSpecificitySummary.tsx` (yeni, computeSourceScanInputSpecificity)
- `frontend/src/components/source-scans/SourceScansTable.tsx` (Girdi Özgüllüğü sütunu eklendi)
- `frontend/src/tests/source-scan-input-specificity-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-119-source-scan-input-specificity-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 953 toplam, build temiz.

---

## [2026-04-02] Phase 118 — Used News Input Specificity Summary Frontend Foundation

**Ne:** Used News listesine input specificity özeti eklendi. Pure frontend türetimi, 3 seviye.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/used-news/UsedNewsInputSpecificityBadge.tsx` (yeni)
- `frontend/src/components/used-news/UsedNewsInputSpecificitySummary.tsx` (yeni, computeUsedNewsInputSpecificity)
- `frontend/src/components/used-news/UsedNewsTable.tsx` (Girdi Özgüllüğü sütunu eklendi)
- `frontend/src/tests/used-news-input-specificity-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-118-used-news-input-specificity-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 943 toplam, build temiz.

---

## [2026-04-02] Phase 117 — News Bulletin Input Specificity Summary Frontend Foundation

**Ne:** News Bulletin listesine input specificity özeti eklendi. Pure frontend türetimi, 3 seviye.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/news-bulletin/NewsBulletinInputSpecificityBadge.tsx` (yeni)
- `frontend/src/components/news-bulletin/NewsBulletinInputSpecificitySummary.tsx` (yeni, computeNewsBulletinInputSpecificity)
- `frontend/src/components/news-bulletin/NewsBulletinsTable.tsx` (Girdi Özgüllüğü sütunu eklendi)
- `frontend/src/tests/news-bulletin-input-specificity-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-117-news-bulletin-input-specificity-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 933 toplam, build temiz.

---

## [2026-04-02] Phase 116 — News Item Input Specificity Summary Frontend Foundation

**Ne:** News Items listesine input specificity özeti eklendi. Pure frontend türetimi, 3 seviye.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/news-items/NewsItemInputSpecificityBadge.tsx` (yeni)
- `frontend/src/components/news-items/NewsItemInputSpecificitySummary.tsx` (yeni, computeNewsItemInputSpecificity)
- `frontend/src/components/news-items/NewsItemsTable.tsx` (Girdi Özgüllüğü sütunu eklendi)
- `frontend/src/tests/news-item-input-specificity-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-116-news-item-input-specificity-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 923 toplam, build temiz.

---

## [2026-04-02] Phase 115 — Job Input Specificity Summary Frontend Foundation

**Ne:** Jobs listesine module-input specificity özeti eklendi. Pure frontend türetimi, 3 seviye.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/jobs/JobInputSpecificityBadge.tsx` (yeni)
- `frontend/src/components/jobs/JobInputSpecificitySummary.tsx` (yeni, computeJobInputSpecificity)
- `frontend/src/components/jobs/JobsTable.tsx` (Girdi Özgüllüğü sütunu eklendi)
- `frontend/src/tests/job-input-specificity-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-115-job-input-specificity-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 913 toplam, build temiz.

---

## [2026-04-02] Phase 114 — Job Publication Yield Summary Frontend Foundation

**Ne:** Jobs listesine publication yield özeti eklendi. Pure frontend türetimi, 6 seviye.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/jobs/JobPublicationYieldBadge.tsx` (yeni)
- `frontend/src/components/jobs/JobPublicationYieldSummary.tsx` (yeni, computeJobPublicationYield)
- `frontend/src/components/jobs/JobsTable.tsx` (Yayın Verimi sütunu eklendi)
- `frontend/src/tests/job-publication-yield-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-114-job-publication-yield-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 903 toplam, build temiz.

---

## [2026-04-02] Phase 113 — Source Scan Publication Outcome Summary Frontend Foundation

**Ne:** Source Scans listesine publication outcome özeti eklendi. Pure frontend türetimi, 6 seviye.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/source-scans/SourceScanPublicationOutcomeBadge.tsx` (yeni)
- `frontend/src/components/source-scans/SourceScanPublicationOutcomeSummary.tsx` (yeni, computeSourceScanPublicationOutcome)
- `frontend/src/components/source-scans/SourceScansTable.tsx` (Yayın Sonucu sütunu eklendi)
- `frontend/src/tests/source-scan-publication-outcome-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-113-source-scan-publication-outcome-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 893 toplam, build temiz.

---

## [2026-04-02] Phase 112 — Job Target-Output Consistency Summary Frontend Foundation

**Ne:** Jobs listesine target-output consistency özeti eklendi. Pure frontend türetimi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/jobs/JobTargetOutputConsistencyBadge.tsx` (yeni)
- `frontend/src/components/jobs/JobTargetOutputConsistencySummary.tsx` (yeni, computeJobTargetOutputConsistency)
- `frontend/src/components/jobs/JobsTable.tsx` (Target/Output Tutarlılığı sütunu eklendi)
- `frontend/src/tests/job-target-output-consistency-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-112-job-target-output-consistency-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 883 toplam, build temiz.

---

## [2026-04-02] Phase 111 — Source Scan Target-Output Consistency Summary Frontend Foundation

**Ne:** Source Scans listesine target-output consistency özeti eklendi. Pure frontend türetimi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/source-scans/SourceScanTargetOutputConsistencyBadge.tsx` (yeni)
- `frontend/src/components/source-scans/SourceScanTargetOutputConsistencySummary.tsx` (yeni, computeSourceScanTargetOutputConsistency)
- `frontend/src/components/source-scans/SourceScansTable.tsx` (Target/Output Tutarlılığı sütunu eklendi)
- `frontend/src/tests/source-scan-target-output-consistency-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-111-source-scan-target-output-consistency-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 873 toplam, build temiz.

---

## [2026-04-02] Phase 110 — Used News Input Quality Summary Frontend Foundation

**Ne:** Used News listesine source-input quality özeti eklendi. Pure frontend türetimi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/used-news/UsedNewsInputQualityBadge.tsx` (yeni)
- `frontend/src/components/used-news/UsedNewsInputQualitySummary.tsx` (yeni, computeUsedNewsInputQuality)
- `frontend/src/components/used-news/UsedNewsTable.tsx` (Girdi Kalitesi sütunu eklendi)
- `frontend/src/tests/used-news-input-quality-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-110-used-news-input-quality-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 863 toplam, build temiz.

---

## [2026-04-02] Phase 109 — News Bulletin Input Quality Summary Frontend Foundation

**Ne:** News Bulletin listesine source-input quality özeti eklendi. Pure frontend türetimi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/news-bulletin/NewsBulletinInputQualityBadge.tsx` (yeni)
- `frontend/src/components/news-bulletin/NewsBulletinInputQualitySummary.tsx` (yeni, computeNewsBulletinInputQuality)
- `frontend/src/components/news-bulletin/NewsBulletinsTable.tsx` (Girdi Kalitesi sütunu eklendi)
- `frontend/src/tests/news-bulletin-input-quality-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-109-news-bulletin-input-quality-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 853 toplam, build temiz.

---

## [2026-04-02] Phase 108 — News Item Input Quality Summary Frontend Foundation

**Ne:** News Items listesine source-input quality özeti eklendi. Pure frontend türetimi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/news-items/NewsItemInputQualityBadge.tsx` (yeni)
- `frontend/src/components/news-items/NewsItemInputQualitySummary.tsx` (yeni, computeNewsItemInputQuality)
- `frontend/src/components/news-items/NewsItemsTable.tsx` (Girdi Kalitesi sütunu eklendi)
- `frontend/src/tests/news-item-input-quality-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-108-news-item-input-quality-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 843 toplam, build temiz.

---

## [2026-04-02] Phase 107 — Job Input Quality Summary Frontend Foundation

**Ne:** Jobs listesine source-input quality özeti eklendi. Pure frontend türetimi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/jobs/JobInputQualityBadge.tsx` (yeni)
- `frontend/src/components/jobs/JobInputQualitySummary.tsx` (yeni, computeJobInputQuality)
- `frontend/src/components/jobs/JobsTable.tsx` (Girdi Kalitesi sütunu eklendi)
- `frontend/src/tests/job-input-quality-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-107-job-input-quality-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 833 toplam, build temiz.

---

## [2026-04-02] Phase 106 — Source Scan Input Quality Summary Frontend Foundation

**Ne:** Source Scans listesine source-input quality özeti eklendi. Pure frontend türetimi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/source-scans/SourceScanInputQualityBadge.tsx` (yeni)
- `frontend/src/components/source-scans/SourceScanInputQualitySummary.tsx` (yeni, computeSourceScanInputQuality)
- `frontend/src/components/source-scans/SourceScansTable.tsx` (Girdi Kalitesi sütunu eklendi)
- `frontend/src/tests/source-scan-input-quality-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-106-source-scan-input-quality-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 823 toplam, build temiz.

---

## [2026-04-02] Phase 105 — Source Input Quality Summary Frontend Foundation

**Ne:** Sources listesine source-input quality özeti eklendi. Pure frontend türetimi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/sources/SourceInputQualityBadge.tsx` (yeni)
- `frontend/src/components/sources/SourceInputQualitySummary.tsx` (yeni, computeSourceInputQuality)
- `frontend/src/components/sources/SourcesTable.tsx` (Girdi Kalitesi sütunu eklendi)
- `frontend/src/tests/source-input-quality-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-105-source-input-quality-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 813 toplam, build temiz.

---

## [2026-04-02] Phase 104 — Style Blueprint Input Quality Summary Frontend Foundation

**Ne:** Style Blueprints listesine source-input quality özeti eklendi. Pure frontend türetimi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/style-blueprints/StyleBlueprintInputQualityBadge.tsx` (yeni)
- `frontend/src/components/style-blueprints/StyleBlueprintInputQualitySummary.tsx` (yeni, computeStyleBlueprintInputQuality)
- `frontend/src/components/style-blueprints/StyleBlueprintsTable.tsx` (Girdi Kalitesi sütunu eklendi)
- `frontend/src/tests/style-blueprint-input-quality-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-104-style-blueprint-input-quality-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 803 toplam, build temiz.

---

## [2026-04-02] Phase 103 — Template Input Quality Summary Frontend Foundation

**Ne:** Templates listesine source-input quality özeti eklendi. Pure frontend türetimi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/templates/TemplateInputQualityBadge.tsx` (yeni)
- `frontend/src/components/templates/TemplateInputQualitySummary.tsx` (yeni, computeTemplateInputQuality)
- `frontend/src/components/templates/TemplatesTable.tsx` (Girdi Kalitesi sütunu eklendi)
- `frontend/src/tests/template-input-quality-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-103-template-input-quality-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 793 toplam, build temiz.

---

## [2026-04-02] Phase 102 — Used News Artifact Consistency Summary Frontend Foundation

**Ne:** Used News listesine artifact tutarlılık özeti eklendi. Pure frontend türetimi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/used-news/UsedNewsArtifactConsistencyBadge.tsx` (yeni)
- `frontend/src/components/used-news/UsedNewsArtifactConsistencySummary.tsx` (yeni, computeUsedNewsArtifactConsistency)
- `frontend/src/components/used-news/UsedNewsTable.tsx` (Artifact Tutarlılığı sütunu eklendi)
- `frontend/src/tests/used-news-artifact-consistency-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-102-used-news-artifact-consistency-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 783 toplam, build temiz.

---

## [2026-04-02] Phase 101 — News Item Artifact Consistency Summary Frontend Foundation

**Ne:** News Items listesine artifact tutarlılık özeti eklendi. Pure frontend türetimi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/news-items/NewsItemArtifactConsistencyBadge.tsx` (yeni)
- `frontend/src/components/news-items/NewsItemArtifactConsistencySummary.tsx` (yeni, computeNewsItemArtifactConsistency)
- `frontend/src/components/news-items/NewsItemsTable.tsx` (Artifact Tutarlılığı sütunu eklendi)
- `frontend/src/tests/news-item-artifact-consistency-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-101-news-item-artifact-consistency-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 773 toplam, build temiz.

---

## [2026-04-02] Phase 99 — Source Scan Artifact Consistency Summary Frontend Foundation

**Ne:** Source Scans listesine artifact tutarlılık özeti eklendi. Pure frontend türetimi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/source-scans/SourceScanArtifactConsistencyBadge.tsx` (yeni)
- `frontend/src/components/source-scans/SourceScanArtifactConsistencySummary.tsx` (yeni, computeSourceScanArtifactConsistency)
- `frontend/src/components/source-scans/SourceScansTable.tsx` (Artifact Tutarlılığı sütunu eklendi)
- `frontend/src/tests/source-scan-artifact-consistency-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-99-source-scan-artifact-consistency-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 753 toplam, build temiz.

---

## [2026-04-02] Phase 98 — Source Artifact Consistency Summary Frontend Foundation

**Ne:** Sources listesine artifact tutarlılık özeti eklendi. Pure frontend türetimi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/sources/SourceArtifactConsistencyBadge.tsx` (yeni)
- `frontend/src/components/sources/SourceArtifactConsistencySummary.tsx` (yeni, computeSourceArtifactConsistency)
- `frontend/src/components/sources/SourcesTable.tsx` (Artifact Tutarlılığı sütunu eklendi)
- `frontend/src/tests/source-artifact-consistency-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-98-source-artifact-consistency-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 743 toplam, build temiz.

---

## [2026-04-02] Phase 97 — Style Blueprint Artifact Consistency Summary Frontend Foundation

**Ne:** Style Blueprints listesine artifact tutarlılık özeti eklendi. Pure frontend türetimi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/style-blueprints/StyleBlueprintArtifactConsistencyBadge.tsx` (yeni)
- `frontend/src/components/style-blueprints/StyleBlueprintArtifactConsistencySummary.tsx` (yeni, computeStyleBlueprintArtifactConsistency)
- `frontend/src/components/style-blueprints/StyleBlueprintsTable.tsx` (Artifact Tutarlılığı sütunu eklendi)
- `frontend/src/tests/style-blueprint-artifact-consistency-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-97-style-blueprint-artifact-consistency-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 733 toplam, build temiz.

---

## [2026-04-02] Phase 96 — Template Artifact Consistency Summary Frontend Foundation

**Ne:** Templates listesine artifact tutarlılık özeti eklendi. Pure frontend türetimi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/templates/TemplateArtifactConsistencyBadge.tsx` (yeni)
- `frontend/src/components/templates/TemplateArtifactConsistencySummary.tsx` (yeni, computeTemplateArtifactConsistency)
- `frontend/src/components/templates/TemplatesTable.tsx` (Artifact Tutarlılığı sütunu eklendi)
- `frontend/src/tests/template-artifact-consistency-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-96-template-artifact-consistency-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 723 toplam, build temiz.

---

## [2026-04-02] Phase 95 — Standard Video Artifact Consistency Summary Frontend Foundation

**Ne:** Standard Video listesine artifact tutarlılık özeti eklendi. Pure frontend türetimi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/standard-video/StandardVideoArtifactConsistencyBadge.tsx` (yeni)
- `frontend/src/components/standard-video/StandardVideoArtifactConsistencySummary.tsx` (yeni, computeStandardVideoArtifactConsistency)
- `frontend/src/components/standard-video/StandardVideosTable.tsx` (Artifact Tutarlılığı sütunu eklendi)
- `frontend/src/tests/standard-video-artifact-consistency-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-95-standard-video-artifact-consistency-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 713 toplam, build temiz.

---

## [2026-04-02] Phase 94 — News Bulletin Artifact Consistency Summary Frontend Foundation

**Ne:** News Bulletins listesine artifact tutarlılık özeti eklendi. Pure frontend türetimi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/news-bulletin/NewsBulletinArtifactConsistencyBadge.tsx` (yeni)
- `frontend/src/components/news-bulletin/NewsBulletinArtifactConsistencySummary.tsx` (yeni, computeNewsBulletinArtifactConsistency)
- `frontend/src/components/news-bulletin/NewsBulletinsTable.tsx` (Artifact Tutarlılığı sütunu eklendi)
- `frontend/src/tests/news-bulletin-artifact-consistency-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-94-news-bulletin-artifact-consistency-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 703 toplam, build temiz.

---

## [2026-04-02] Phase 93 — Standard Video Input Quality Summary Frontend Foundation

**Ne:** Standard Video listesine girdi kalite özeti eklendi. Pure frontend türetimi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/standard-video/StandardVideoInputQualityBadge.tsx` (yeni)
- `frontend/src/components/standard-video/StandardVideoInputQualitySummary.tsx` (yeni, computeStandardVideoInputQuality)
- `frontend/src/components/standard-video/StandardVideosTable.tsx` (Girdi Kalitesi sütunu eklendi)
- `frontend/src/tests/standard-video-input-quality-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-93-standard-video-input-quality-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 693 toplam, build temiz.

---

## [2026-04-02] Phase 92 — News Bulletin Selected-News Quality Summary Frontend Foundation

**Ne:** News Bulletins listesine seçilmiş haber kalite özeti eklendi. Backend 3 yeni aggregate alan + frontend türetimi.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/modules/news_bulletin/schemas.py` (selected_news_quality_complete/partial/weak_count eklendi)
- `backend/app/modules/news_bulletin/service.py` (batch title/url/summary fetch + quality classification)
- `frontend/src/api/newsBulletinApi.ts` (3 quality count alanları eklendi)
- `frontend/src/components/news-bulletin/NewsBulletinSelectedNewsQualityBadge.tsx` (yeni)
- `frontend/src/components/news-bulletin/NewsBulletinSelectedNewsQualitySummary.tsx` (yeni)
- `frontend/src/components/news-bulletin/NewsBulletinsTable.tsx` (İçerik Kalitesi sütunu eklendi)
- `frontend/src/tests/news-bulletin-selected-news-quality-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-92-news-bulletin-selected-news-quality-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 683 frontend toplam, 11 backend pass, build temiz.

---

## [2026-04-02] Phase 91 — News Item Publication Lineage Summary Frontend Foundation

**Ne:** News Items listesine yayın zinciri özeti eklendi. Pure frontend türetimi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/news-items/NewsItemPublicationLineageBadge.tsx` (yeni)
- `frontend/src/components/news-items/NewsItemPublicationLineageSummary.tsx` (yeni)
- `frontend/src/components/news-items/NewsItemsTable.tsx` (Yayın Zinciri sütunu eklendi)
- `frontend/src/tests/news-item-publication-lineage-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-91-news-item-publication-lineage-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 673 toplam, build temiz.

---

## [2026-04-02] Phase 90 — News Item Used News Linkage Summary Frontend Foundation

**Ne:** News Items listesine used-news bağı özeti eklendi. Küçük backend genişletme (batch DISTINCT sorgusu) + frontend türetimi.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/news_items/schemas.py` (has_published_used_news_link eklendi)
- `backend/app/news_items/service.py` (batch published link sorgusu)
- `frontend/src/api/newsItemsApi.ts` (has_published_used_news_link eklendi)
- `frontend/src/components/news-items/NewsItemUsedNewsLinkageBadge.tsx` (yeni)
- `frontend/src/components/news-items/NewsItemUsedNewsLinkageSummary.tsx` (yeni)
- `frontend/src/components/news-items/NewsItemsTable.tsx` (Used News Bağı sütunu eklendi)
- `frontend/src/tests/news-item-used-news-linkage-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-90-news-item-used-news-linkage-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 663 toplam, build temiz.

---

## [2026-04-02] Phase 89 — Used News Target Resolution Summary Frontend Foundation

**Ne:** Used News registry listesine hedef çözümü özeti eklendi. Küçük backend genişletme (batch ID lookup) + frontend türetimi.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/used_news/schemas.py` (has_target_resolved eklendi)
- `backend/app/used_news/service.py` (_batch_resolve_targets helper, news_bulletin/standard_video/job tabloları)
- `frontend/src/api/usedNewsApi.ts` (has_target_resolved eklendi)
- `frontend/src/components/used-news/UsedNewsTargetResolutionBadge.tsx` (yeni)
- `frontend/src/components/used-news/UsedNewsTargetResolutionSummary.tsx` (yeni)
- `frontend/src/components/used-news/UsedNewsTable.tsx` (Hedef Çözümü sütunu eklendi)
- `frontend/src/tests/used-news-target-resolution-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-89-used-news-target-resolution-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 653 toplam, build temiz.

---

## [2026-04-02] Phase 88 — Job Publication Outcome Summary Frontend Foundation

**Ne:** Jobs listesine yayın sonucu özeti eklendi. Saf frontend türetimi — backend değişikliği yok.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/jobs/JobPublicationOutcomeBadge.tsx` (yeni)
- `frontend/src/components/jobs/JobPublicationOutcomeSummary.tsx` (yeni)
- `frontend/src/components/jobs/JobsTable.tsx` (Yayın Sonucu sütunu eklendi)
- `frontend/src/tests/job-publication-outcome-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-88-job-publication-outcome-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 643 toplam, build temiz.

---

## [2026-04-02] Phase 87 — Source Scan Publication Yield Summary Frontend Foundation

**Ne:** Source Scans listesine yayın verimi özeti eklendi. Küçük backend genişletme (batch COUNT sorguları) + frontend türetimi.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/source_scans/schemas.py` (linked/reviewed/used count alanları eklendi)
- `backend/app/source_scans/service.py` (batch GROUP BY COUNT sorguları)
- `frontend/src/api/sourceScansApi.ts` (yeni alanlar eklendi)
- `frontend/src/components/source-scans/SourceScanPublicationYieldBadge.tsx` (yeni)
- `frontend/src/components/source-scans/SourceScanPublicationYieldSummary.tsx` (yeni)
- `frontend/src/components/source-scans/SourceScansTable.tsx` (Yayın Verimi sütunu eklendi)
- `frontend/src/tests/source-scan-publication-yield-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-87-source-scan-publication-yield-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 633 toplam, build temiz.

---

## [2026-04-02] Phase 86 — Used News Publication Linkage Summary Frontend Foundation

**Ne:** Used News registry listesine yayın bağı özeti eklendi. Saf frontend türetimi — backend değişikliği yok.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/used-news/UsedNewsPublicationLinkageBadge.tsx` (yeni)
- `frontend/src/components/used-news/UsedNewsPublicationLinkageSummary.tsx` (yeni)
- `frontend/src/components/used-news/UsedNewsTable.tsx` (Yayın Bağı sütunu eklendi)
- `frontend/src/tests/used-news-publication-linkage-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-86-used-news-publication-linkage-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 623 toplam, build temiz.

---

## [2026-04-02] Phase 85 — Used News Source Context Summary Frontend Foundation

**Ne:** Used News registry listesine kaynak bağlamı özeti eklendi. Küçük backend genişletme (batch JOIN) + frontend türetimi.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/used_news/schemas.py` (has_news_item_source, has_news_item_scan_reference eklendi)
- `backend/app/used_news/service.py` (batch NewsItem JOIN, _enrich helper)
- `frontend/src/api/usedNewsApi.ts` (yeni alanlar eklendi)
- `frontend/src/components/used-news/UsedNewsSourceContextBadge.tsx` (yeni)
- `frontend/src/components/used-news/UsedNewsSourceContextSummary.tsx` (yeni)
- `frontend/src/components/used-news/UsedNewsTable.tsx` (Kaynak Bağlamı sütunu eklendi)
- `frontend/src/tests/used-news-source-context-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-85-used-news-source-context-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 613 toplam, build temiz.

---

## [2026-04-02] Phase 84 — Job Output Richness Summary Frontend Foundation

**Ne:** Jobs listesine çıktı zenginlik özeti eklendi. Saf frontend türetimi — backend değişikliği yok.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/jobs/JobOutputRichnessBadge.tsx` (yeni)
- `frontend/src/components/jobs/JobOutputRichnessSummary.tsx` (yeni)
- `frontend/src/components/jobs/JobsTable.tsx` (Çıktı Zenginliği sütunu eklendi)
- `frontend/src/tests/job-output-richness-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-84-job-output-richness-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 603 toplam, build temiz.

---

## [2026-04-02] Phase 83 — Style Blueprint Publication Signal Summary Frontend Foundation

**Ne:** Style Blueprints listesine yayın sinyal özeti eklendi. Saf frontend türetimi — backend değişikliği yok.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/style-blueprints/StyleBlueprintPublicationSignalBadge.tsx` (yeni)
- `frontend/src/components/style-blueprints/StyleBlueprintPublicationSignalSummary.tsx` (yeni)
- `frontend/src/components/style-blueprints/StyleBlueprintsTable.tsx` (Yayın Sinyali sütunu eklendi)
- `frontend/src/tests/style-blueprint-publication-signal-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-83-style-blueprint-publication-signal-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 593 toplam, build temiz.

---

## [2026-04-02] Phase 82 — Template Publication Signal Summary Frontend Foundation

**Ne:** Templates listesine yayın sinyal özeti eklendi. Saf frontend türetimi — backend değişikliği yok.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/templates/TemplatePublicationSignalBadge.tsx` (yeni)
- `frontend/src/components/templates/TemplatePublicationSignalSummary.tsx` (yeni)
- `frontend/src/components/templates/TemplatesTable.tsx` (Yayın Sinyali sütunu eklendi)
- `frontend/src/tests/template-publication-signal-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-82-template-publication-signal-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 583 toplam, build temiz.

---

## [2026-04-02] Phase 81 — Standard Video Publication Signal Summary Frontend Foundation

**Ne:** Standard Video listesine yayın sinyal özeti eklendi. Saf frontend türetimi — backend değişikliği yok.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/standard-video/StandardVideoPublicationSignalBadge.tsx` (yeni)
- `frontend/src/components/standard-video/StandardVideoPublicationSignalSummary.tsx` (yeni)
- `frontend/src/components/standard-video/StandardVideosTable.tsx` (Yayın Sinyali sütunu eklendi)
- `frontend/src/tests/standard-video-publication-signal-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-81-standard-video-publication-signal-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 573 toplam, build temiz.

---

## [2026-04-02] Phase 80 — News Bulletin Publication Signal Summary Frontend Foundation

**Ne:** News Bulletin listesine yayın sinyal özeti eklendi. Saf frontend türetimi — backend değişikliği yok.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/news-bulletin/NewsBulletinPublicationSignalBadge.tsx` (yeni)
- `frontend/src/components/news-bulletin/NewsBulletinPublicationSignalSummary.tsx` (yeni)
- `frontend/src/components/news-bulletin/NewsBulletinsTable.tsx` (Yayın Sinyali sütunu eklendi)
- `frontend/src/tests/news-bulletin-publication-signal-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-80-news-bulletin-publication-signal-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 563 toplam, build temiz.

---

## [2026-04-02] Phase 79 — Source Publication Supply Summary Frontend Foundation

**Ne:** Sources listesine yayın kaynağı özeti eklendi. Backend enrichment + frontend türetimi.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/sources/schemas.py` (reviewed_news_count, used_news_count_from_source eklendi)
- `backend/app/sources/service.py` (list_sources_with_scan_summary enriched)
- `frontend/src/api/sourcesApi.ts` (yeni alanlar eklendi)
- `frontend/src/components/sources/SourcePublicationSupplyBadge.tsx` (yeni)
- `frontend/src/components/sources/SourcePublicationSupplySummary.tsx` (yeni)
- `frontend/src/components/sources/SourcesTable.tsx` (Yayın Kaynağı sütunu eklendi)
- `frontend/src/tests/source-publication-supply-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-79-source-publication-supply-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 553 toplam, backend 15/15, build temiz.

---

## [2026-04-02] Phase 78 — News Item Publication Signal Summary Frontend Foundation

**Ne:** News Items listesine yayın sinyal özeti eklendi. Saf frontend türetimi — backend değişikliği yok.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/news-items/NewsItemPublicationSignalBadge.tsx` (yeni)
- `frontend/src/components/news-items/NewsItemPublicationSignalSummary.tsx` (yeni)
- `frontend/src/components/news-items/NewsItemsTable.tsx` (Yayın Sinyali sütunu eklendi)
- `frontend/src/tests/news-item-publication-signal-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-78-news-item-publication-signal-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 543 toplam, build temiz.

---

## [2026-04-02] Phase 77 — Source Scan Result Richness Summary Frontend Foundation

**Ne:** Source Scans listesine çıktı zenginlik özeti eklendi. Saf frontend türetimi — backend değişikliği yok.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/source-scans/SourceScanResultRichnessBadge.tsx` (yeni)
- `frontend/src/components/source-scans/SourceScanResultRichnessSummary.tsx` (yeni)
- `frontend/src/components/source-scans/SourceScansTable.tsx` (Çıktı Zenginliği sütunu eklendi)
- `frontend/src/tests/source-scan-result-richness-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-77-source-scan-result-richness-summary-frontend.md` (yeni)
**Test:** 10 yeni smoke test, 533 toplam, build temiz.

---

## [2026-04-02] Phase 76 — News Item Content Completeness Summary Frontend Foundation

**Ne:** News Items listesine içerik doluluk özeti eklendi. Saf frontend türetimi — backend değişikliği yok.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/news-items/NewsItemContentCompletenessBadge.tsx` (yeni)
- `frontend/src/components/news-items/NewsItemContentCompletenessSummary.tsx` (yeni)
- `frontend/src/components/news-items/NewsItemsTable.tsx` — İçerik sütunu eklendi
- `frontend/src/tests/news-item-content-completeness-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-76-news-item-content-completeness-summary-frontend.md` (yeni)
**Sonuç:** 523 frontend test — tümü geçti. Build başarılı.

---

## [2026-04-02] Phase 75 — Source Config Coverage Summary Frontend Foundation

**Ne:** Sources listesine source_type bazlı konfigürasyon özeti eklendi. Saf frontend türetimi — backend değişikliği yok.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/sources/SourceConfigCoverageBadge.tsx` (yeni)
- `frontend/src/components/sources/SourceConfigCoverageSummary.tsx` (yeni)
- `frontend/src/components/sources/SourcesTable.tsx` — Konfigürasyon sütunu eklendi
- `frontend/src/tests/source-config-coverage-summary.smoke.test.tsx` (yeni, 10 test)
- `frontend/src/tests/sources-registry.smoke.test.tsx` — getAllByText ile güncellendi
- `docs/testing/test-report-phase-75-source-config-coverage-summary-frontend.md` (yeni)
**Sonuç:** 513 frontend test — tümü geçti. Build başarılı.

---

## [2026-04-02] Phase 74 — Source Linked News Summary Frontend Foundation

**Ne:** Sources listesine bağlı haber sayısı görünürlüğü eklendi. Backend linked_news_count hesaplıyor, frontend badge + summary ile gösteriyor.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/sources/schemas.py` — linked_news_count
- `backend/app/sources/service.py` — NewsItem COUNT sorgusu
- `frontend/src/api/sourcesApi.ts` — linked_news_count
- `frontend/src/components/sources/SourceLinkedNewsStatusBadge.tsx` (yeni)
- `frontend/src/components/sources/SourceLinkedNewsSummary.tsx` (yeni)
- `frontend/src/components/sources/SourcesTable.tsx` — Haberler sütunu eklendi
- `frontend/src/tests/source-linked-news-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-74-source-linked-news-summary-frontend.md` (yeni)
**Sonuç:** 503 frontend test — tümü geçti. Build başarılı.

---

## [2026-04-02] Phase 73 — Source Scan Source Context Summary Frontend Foundation

**Ne:** Source Scans listesine kaynak bağlantı görünürlüğü eklendi. Backend source_name/source_status ile NewsSource çözümlemesi yapıyor, frontend badge + summary ile gösteriyor.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/source_scans/schemas.py` — source_name, source_status
- `backend/app/source_scans/service.py` — list_scans_with_source_summary()
- `backend/app/source_scans/router.py` — list endpoint güncellendi
- `frontend/src/api/sourceScansApi.ts` — source_name, source_status
- `frontend/src/components/source-scans/SourceScanSourceStatusBadge.tsx` (yeni)
- `frontend/src/components/source-scans/SourceScanSourceSummary.tsx` (yeni)
- `frontend/src/components/source-scans/SourceScansTable.tsx` — Kaynak sütunu güncellendi
- `frontend/src/tests/source-scan-source-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-73-source-scan-source-summary-frontend.md` (yeni)
**Sonuç:** 493 frontend test — tümü geçti. Build başarılı.

---

## [2026-04-02] Phase 72 — News Bulletin Source Coverage Summary Frontend Foundation

**Ne:** News Bulletin listesine kaynak kapsam görünürlüğü eklendi. Backend selected_news_source_count/has_selected_news_missing_source hesaplıyor, frontend badge + summary ile gösteriyor.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/modules/news_bulletin/schemas.py` — selected_news_source_count, has_selected_news_missing_source
- `backend/app/modules/news_bulletin/service.py` — NewsItem.source_id aggregate
- `frontend/src/api/newsBulletinApi.ts` — yeni alanlar
- `frontend/src/components/news-bulletin/NewsBulletinSourceCoverageBadge.tsx` (yeni)
- `frontend/src/components/news-bulletin/NewsBulletinSourceCoverageSummary.tsx` (yeni)
- `frontend/src/components/news-bulletin/NewsBulletinsTable.tsx` — Kaynak Kapsamı sütunu
- `frontend/src/tests/news-bulletin-source-coverage-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-72-news-bulletin-source-coverage-summary-frontend.md` (yeni)
**Sonuç:** 483 frontend test — tümü geçti. Build başarılı.

---

## [2026-04-02] Phase 71 — News Item Scan Lineage Summary Frontend Foundation

**Ne:** News Items listesine scan lineage görünürlüğü eklendi. Backend source_scan_status alanıyla SourceScan kaydı çözümleniyor, frontend badge + summary ile gösteriliyor.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/news_items/schemas.py` — source_scan_status alanı
- `backend/app/news_items/service.py` — SourceScan lookup in list_news_items_with_usage_summary
- `frontend/src/api/newsItemsApi.ts` — source_scan_status alanı
- `frontend/src/components/news-items/NewsItemScanLineageBadge.tsx` (yeni)
- `frontend/src/components/news-items/NewsItemScanLineageSummary.tsx` (yeni)
- `frontend/src/components/news-items/NewsItemsTable.tsx` — Scan Kaynağı sütunu eklendi
- `frontend/src/tests/news-item-scan-lineage-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-71-news-item-scan-lineage-summary-frontend.md` (yeni)
**Sonuç:** 473 frontend test — tümü geçti. Build başarılı.

---

## [2026-04-02] Phase 70 — News Item Source Summary Frontend Foundation

**Ne:** News Items listesine source bağlantı görünürlüğü eklendi. Backend enrichment ile source_name/source_status alanları dolduruluyor, frontend badge + summary ile gösteriliyor.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/news_items/schemas.py` — source_name, source_status alanları
- `backend/app/news_items/service.py` — NewsSource lookup in list_news_items_with_usage_summary
- `frontend/src/api/newsItemsApi.ts` — source_name, source_status alanları
- `frontend/src/components/news-items/NewsItemSourceStatusBadge.tsx` (yeni)
- `frontend/src/components/news-items/NewsItemSourceSummary.tsx` (yeni)
- `frontend/src/components/news-items/NewsItemsTable.tsx` — Kaynak Özeti sütunu güncellendi
- `frontend/src/tests/news-item-source-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-70-news-item-source-summary-frontend.md` (yeni)
**Sonuç:** 463 frontend test — tümü geçti. Build başarılı.

---

## [2026-04-02] Phase 69 — News Bulletin Enforcement Summary Frontend Foundation

**Ne:** News Bulletin listesine selected news warning aggregate özeti eklendi.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/modules/news_bulletin/schemas.py` — has_selected_news_warning, selected_news_warning_count
- `backend/app/modules/news_bulletin/service.py` — warning aggregate hesabı
- `frontend/src/api/newsBulletinApi.ts` — warning alanları
- `frontend/src/components/news-bulletin/NewsBulletinEnforcementStatusBadge.tsx` (yeni)
- `frontend/src/components/news-bulletin/NewsBulletinEnforcementSummary.tsx` (yeni)
- `frontend/src/components/news-bulletin/NewsBulletinsTable.tsx` — Enforcement sütunu
- `frontend/src/tests/news-bulletin-enforcement-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-69-news-bulletin-enforcement-summary-frontend.md` (yeni)
**Sonuç:** 453 frontend test — tümü geçti. Build başarılı.

---

## [2026-04-02] Phase 68 — Standard Video Artifact Summary Frontend Foundation

**Ne:** Standard Video registry listesine gerçek artifact varlığı (script/metadata) özeti eklendi.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/modules/standard_video/schemas.py` — has_script, has_metadata alanları
- `backend/app/modules/standard_video/service.py` — list_standard_videos_with_artifact_summary
- `backend/app/modules/standard_video/router.py` — list endpoint güncellendi
- `frontend/src/api/standardVideoApi.ts` — has_script, has_metadata eklendi
- `frontend/src/components/standard-video/StandardVideoArtifactStatusBadge.tsx` (yeni)
- `frontend/src/components/standard-video/StandardVideoArtifactSummary.tsx` (yeni)
- `frontend/src/components/standard-video/StandardVideosTable.tsx` — Artifact sütunu eklendi
- `frontend/src/tests/standard-video-artifact-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-68-standard-video-artifact-summary-frontend.md` (yeni)
**Sonuç:** 443 frontend test — tümü geçti. Build başarılı.

---

## [2026-04-02] Phase 67 — Job Actionability Summary Frontend Foundation

**Ne:** Jobs registry listesinde her job için sade actionability özeti eklendi.
**Yaklaşım:** Backend değişikliği yok; mevcut status/last_error/retry_count/current_step_key alanlarından frontend türetildi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/jobs/JobActionabilityBadge.tsx` (yeni)
- `frontend/src/components/jobs/JobActionabilitySummary.tsx` (yeni)
- `frontend/src/components/jobs/JobsTable.tsx` — Aksiyon Özeti sütunu eklendi
- `frontend/src/tests/job-actionability-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-67-job-actionability-summary-frontend.md` (yeni)
**Sonuç:** 433 frontend test — tümü geçti. Build başarılı.

---

## [2026-04-02] Phase 66 — Template Style Link Readiness Summary Frontend Foundation

**Ne:** Template Style Links registry listesinde her link kaydı için sade role/readiness özeti eklendi.
**Yaklaşım:** Backend değişikliği yok; mevcut status/link_role/template_id/style_blueprint_id alanlarından frontend türetildi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/template-style-links/TemplateStyleLinkReadinessBadge.tsx` (yeni)
- `frontend/src/components/template-style-links/TemplateStyleLinkReadinessSummary.tsx` (yeni)
- `frontend/src/components/template-style-links/TemplateStyleLinksTable.tsx` — Bağ Durumu sütunu eklendi
- `frontend/src/tests/template-style-link-readiness-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-66-template-style-link-readiness-summary-frontend.md` (yeni)
**Sonuç:** 423 frontend test — tümü geçti. Build başarılı.

---

## [2026-04-02] Phase 65 — Style Blueprint Readiness Summary Frontend Foundation

**Ne:** Style Blueprints registry listesinde her kayıt için sade readiness özeti eklendi.
**Yaklaşım:** Backend değişikliği yok; 6 JSON kural alanı + status'tan frontend türetildi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/style-blueprints/StyleBlueprintReadinessBadge.tsx` (yeni)
- `frontend/src/components/style-blueprints/StyleBlueprintReadinessSummary.tsx` (yeni)
- `frontend/src/components/style-blueprints/StyleBlueprintsTable.tsx` — Hazırlık sütunu eklendi
- `frontend/src/tests/style-blueprint-readiness-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-65-style-blueprint-readiness-summary-frontend.md` (yeni)
**Sonuç:** 413 frontend test — tümü geçti. Build başarılı.

---

## [2026-04-02] Phase 64 — Source Scan Execution Summary Frontend Foundation

**Ne:** Source Scans registry listesinde her kayıt için sade execution özeti eklendi.
**Yaklaşım:** Backend değişikliği yok; mevcut status/result_count alanlarından frontend türetildi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/source-scans/SourceScanExecutionBadge.tsx` (yeni)
- `frontend/src/components/source-scans/SourceScanExecutionSummary.tsx` (yeni)
- `frontend/src/components/source-scans/SourceScansTable.tsx` — Çalışma Özeti sütunu eklendi
- `frontend/src/tests/source-scan-execution-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-64-source-scan-execution-summary-frontend.md` (yeni)
**Sonuç:** 403 frontend test — tümü geçti. Build başarılı.

---

## [2026-04-02] Phase 63 — Standard Video Readiness Summary Frontend Foundation

**Ne:** Standard Video registry listesinde her kayıt için sade readiness özeti eklendi.
**Yaklaşım:** Backend değişikliği yok; mevcut topic/status alanlarından frontend türetildi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/standard-video/StandardVideoReadinessBadge.tsx` (yeni)
- `frontend/src/components/standard-video/StandardVideoReadinessSummary.tsx` (yeni)
- `frontend/src/components/standard-video/StandardVideosTable.tsx` — Hazırlık sütunu eklendi
- `frontend/src/tests/standard-video-readiness-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-63-standard-video-readiness-summary-frontend.md` (yeni)
**Sonuç:** 393 frontend test — tümü geçti. Build başarılı.

---

## [2026-04-02] Phase 62 — Used News State Summary Frontend Foundation

**Ne:** Used News registry listesinde her kayıt için sade state özeti eklendi.
**Yaklaşım:** Backend değişikliği yok; mevcut usage_type/target_module alanlarından frontend türetildi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/used-news/UsedNewsStateBadge.tsx` (yeni)
- `frontend/src/components/used-news/UsedNewsStateSummary.tsx` (yeni, computeUsedNewsState helper dahil)
- `frontend/src/components/used-news/UsedNewsTable.tsx` — Durum sütunu eklendi
- `frontend/src/tests/used-news-state-summary.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-62-used-news-state-summary-frontend.md` (yeni)
**Sonuç:** 383 frontend test — tümü geçti. Build başarılı.

---

## [2026-04-02] Phase 61 — News Item Readiness Summary Frontend Foundation

**Ne:** News Items registry listesinde her haber için sade hazırlık özeti eklendi.
**Yaklaşım:** Backend değişikliği yok; mevcut title/url/status alanlarından frontend türetildi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/news-items/NewsItemReadinessBadge.tsx` (yeni)
- `frontend/src/components/news-items/NewsItemReadinessSummary.tsx` (yeni)
- `frontend/src/components/news-items/NewsItemsTable.tsx` — Hazırlık sütunu eklendi
- `frontend/src/tests/news-item-readiness-summary.smoke.test.tsx` (yeni, 10 test)
**Sonuç:** 373 frontend test — tümü geçti. Build başarılı.

---

## [2026-04-02] Phase 60 — Source Readiness Summary Frontend Foundation

**Ne:** Sources registry listesinde her kaynak için sade operasyonel hazırlık özeti eklendi.
**Yaklaşım:** Backend değişikliği yok; mevcut alanlardan frontend türetildi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/sources/SourceReadinessBadge.tsx` (yeni)
- `frontend/src/components/sources/SourceReadinessSummary.tsx` (yeni)
- `frontend/src/components/sources/SourcesTable.tsx` — Hazırlık sütunu eklendi
- `frontend/src/tests/source-readiness-summary.smoke.test.tsx` (yeni, 10 test)
**Sonuç:** 363 frontend test — tümü geçti. Build başarılı.

---

## [2026-04-02] Phase 59 — Template Readiness Summary Frontend Foundation

**Ne:** Templates registry listesinde her template için sade hazırlık özeti eklendi.
**Yaklaşım:** Backend değişikliği yok; mevcut alanlardan frontend türetildi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/templates/TemplateReadinessBadge.tsx` (yeni)
- `frontend/src/components/templates/TemplateReadinessSummary.tsx` (yeni)
- `frontend/src/components/templates/TemplatesTable.tsx` — Hazırlık sütunu eklendi
- `frontend/src/tests/template-readiness-summary.smoke.test.tsx` (yeni, 10 test)
**Sonuç:** 353 frontend test — tümü geçti. Build başarılı.

---

## [2026-04-02] Phase 58 — Template Style Link Summary Frontend Foundation

**Ne:** Templates registry listesinde her template için style blueprint link özeti eklendi.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/modules/templates/schemas.py` — `style_link_count`, `primary_link_role` eklendi
- `backend/app/modules/templates/service.py` — `list_templates_with_style_link_summary()` eklendi
- `backend/app/modules/templates/router.py` — list endpoint güncellendi
- `frontend/src/api/templatesApi.ts` — 2 opsiyonel alan eklendi
- `frontend/src/components/templates/TemplateStyleLinkStatusBadge.tsx` (yeni)
- `frontend/src/components/templates/TemplateStyleLinkSummary.tsx` (yeni)
- `frontend/src/components/templates/TemplatesTable.tsx` — Style Links sütunu eklendi
- `frontend/src/tests/template-style-link-summary.smoke.test.tsx` (yeni, 10 test)
**Sonuç:** 195 backend test, 343 frontend test — tümü geçti. Build başarılı.

---

## [2026-04-02] Phase 57 — Job Context Summary Frontend Foundation

**Ne:** Jobs registry listesinde her job için module-aware context summary eklendi.
**Yaklaşım:** Frontend-only; mevcut module_type ve source_context_json alanlarından türetildi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/jobs/JobContextBadge.tsx` (yeni)
- `frontend/src/components/jobs/JobContextSummary.tsx` (yeni, extractContextTitle helper dahil)
- `frontend/src/components/jobs/JobsTable.tsx` — Context sütunu eklendi
- `frontend/src/tests/job-context-summary.smoke.test.tsx` (yeni, 10 test)
**Sonuç:** 333 frontend test — tümü geçti. Build başarılı.

---

## [2026-04-02] Phase 56 — News Bulletin Readiness Summary Frontend Foundation

**Ne:** News Bulletin registry listesinde her bülten için sade üretim hazırlık özeti eklendi.
**Yaklaşım:** Mevcut backend alanlarından frontend'de türetildi, yeni backend değişikliği yapılmadı.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/components/news-bulletin/NewsBulletinReadinessBadge.tsx` (yeni)
- `frontend/src/components/news-bulletin/NewsBulletinReadinessSummary.tsx` (yeni)
- `frontend/src/components/news-bulletin/NewsBulletinsTable.tsx` — Hazırlık sütunu eklendi
- `frontend/src/tests/news-bulletin-readiness-summary.smoke.test.tsx` (yeni, 10 test)
**Sonuç:** 323 frontend test — tümü geçti. Build başarılı.

---

## [2026-04-02] Phase 55 — News Item Usage Summary Frontend Foundation

**Ne:** News Items registry listesinde her haber için kullanım sayısı ve son kullanım bağlamı eklendi.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/news_items/schemas.py` — `usage_count`, `last_usage_type`, `last_target_module` eklendi
- `backend/app/news_items/service.py` — `list_news_items_with_usage_summary()` eklendi
- `backend/app/news_items/router.py` — list endpoint güncellendi
- `frontend/src/api/newsItemsApi.ts` — 3 opsiyonel alan eklendi
- `frontend/src/components/news-items/NewsItemUsageBadge.tsx` (yeni)
- `frontend/src/components/news-items/NewsItemUsageSummary.tsx` (yeni)
- `frontend/src/components/news-items/NewsItemsTable.tsx` — Kullanım sütunu eklendi
- `frontend/src/tests/news-item-usage-summary.smoke.test.tsx` (yeni, 10 test)
**Sonuç:** 195 backend test, 313 frontend test — tümü geçti. Build başarılı.

---

## [2026-04-02] Phase 54 — Source Scan Summary Frontend Foundation

**Ne:** Sources registry listesinde her kaynak için scan sayısı ve son scan durumu eklendi.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/sources/schemas.py` — `scan_count`, `last_scan_status`, `last_scan_finished_at` eklendi
- `backend/app/sources/service.py` — `list_sources_with_scan_summary()` eklendi
- `backend/app/sources/router.py` — list endpoint güncellendi
- `frontend/src/api/sourcesApi.ts` — 3 opsiyonel alan eklendi
- `frontend/src/components/sources/SourceScanStatusBadge.tsx` (yeni)
- `frontend/src/components/sources/SourceScanSummary.tsx` (yeni)
- `frontend/src/components/sources/SourcesTable.tsx` — Scans sütunu eklendi
- `frontend/src/tests/source-scan-summary.smoke.test.tsx` (yeni, 10 test)
**Sonuç:** 195 backend test, 303 frontend test — tümü geçti. Build başarılı.

---

## [2026-04-02] Phase 53 — News Bulletin Selected News Summary Frontend Foundation

**Ne:** Registry listesinde her bulletin için seçili haber sayısı sade badge olarak gösterildi.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/modules/news_bulletin/schemas.py` — `selected_news_count` eklendi
- `backend/app/modules/news_bulletin/service.py` — COUNT sorgusu eklendi
- `frontend/src/api/newsBulletinApi.ts` — `selected_news_count?` eklendi
- `frontend/src/components/news-bulletin/NewsBulletinSelectedNewsCountBadge.tsx` (yeni)
- `frontend/src/components/news-bulletin/NewsBulletinSelectedNewsSummary.tsx` (yeni)
- `frontend/src/components/news-bulletin/NewsBulletinsTable.tsx` — Haberler sütunu eklendi
- `frontend/src/tests/news-bulletin-selected-news-summary.smoke.test.tsx` (yeni, 10 test)
**Sonuç:** 195 backend test, 293 frontend test — tümü geçti. Build başarılı.

---

## [2026-04-02] Phase 52 — News Bulletin Artifact Summary Frontend Foundation

**Ne:** Registry listesinde her bulletin için script/metadata varlık bilgisi badge olarak gösterildi.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/modules/news_bulletin/schemas.py` — `has_script`, `has_metadata` eklendi
- `backend/app/modules/news_bulletin/service.py` — `list_news_bulletins_with_artifacts()` eklendi
- `backend/app/modules/news_bulletin/router.py` — list endpoint güncellendi
- `frontend/src/api/newsBulletinApi.ts` — `has_script?`, `has_metadata?` eklendi
- `frontend/src/components/news-bulletin/NewsBulletinArtifactStatusBadge.tsx` (yeni)
- `frontend/src/components/news-bulletin/NewsBulletinArtifactSummary.tsx` (yeni)
- `frontend/src/components/news-bulletin/NewsBulletinsTable.tsx` — Artifacts sütunu eklendi
- `frontend/src/tests/news-bulletin-artifact-summary.smoke.test.tsx` (yeni, 10 test)
**Sonuç:** 195 backend test, 283 frontend test — tümü geçti. Build başarılı.

---

## [2026-04-02] Phase 51 — News Bulletin Used News Warning UI Frontend Foundation

**Ne:** Backend enforcement alanları frontend'e taşındı; selected news listesinde her item için sade warning badge ve detay gösterimi eklendi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/api/newsBulletinApi.ts` — `NewsBulletinSelectedItemResponse`'a 4 opsiyonel enforcement alanı eklendi
- `frontend/src/components/news-bulletin/UsedNewsWarningBadge.tsx` (yeni)
- `frontend/src/components/news-bulletin/UsedNewsWarningDetails.tsx` (yeni)
- `frontend/src/components/news-bulletin/NewsBulletinSelectedItemsPanel.tsx` — warning entegrasyonu
- `frontend/src/tests/news-bulletin-used-news-warning.smoke.test.tsx` (yeni, 10 test)
- `docs/testing/test-report-phase-51-news-bulletin-used-news-warning-frontend.md` (yeni)
**Sonuç:** 10 yeni test, 273 toplam frontend test — tümü geçti. Build başarılı.

---

## [2026-04-02] Phase 40 — Admin News Items Registry Frontend Foundation

**Ne:** News items için read-only admin frontend oluşturuldu. Liste (başlık, status badge, kaynak, dil, kategori) + detay akışı.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/api/newsItemsApi.ts` (yeni)
- `frontend/src/hooks/useNewsItemsList.ts` (yeni)
- `frontend/src/hooks/useNewsItemDetail.ts` (yeni)
- `frontend/src/components/news-items/NewsItemsTable.tsx` (yeni)
- `frontend/src/components/news-items/NewsItemDetailPanel.tsx` (yeni)
- `frontend/src/pages/admin/NewsItemsRegistryPage.tsx` (yeni)
- `frontend/src/app/router.tsx` (news-items route eklendi)
- `frontend/src/app/layouts/AdminLayout.tsx` (News Items nav eklendi)
- `frontend/src/tests/news-items-registry.smoke.test.tsx` (8 yeni test)
**Testler:** 8/8 yeni test PASSED | 195/195 toplam PASSED
**Build:** 383.18 kB (tsc + vite build ✅)
**Commit:** `feat: add phase 40 admin news items registry frontend foundation`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-02] Phase 39 — Admin Used News Registry Frontend Foundation

**Ne:** Used news registry için read-only admin frontend oluşturuldu. Liste + detay akışı.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/api/usedNewsApi.ts` (yeni)
- `frontend/src/hooks/useUsedNewsList.ts` (yeni)
- `frontend/src/hooks/useUsedNewsDetail.ts` (yeni)
- `frontend/src/components/used-news/UsedNewsTable.tsx` (yeni)
- `frontend/src/components/used-news/UsedNewsDetailPanel.tsx` (yeni)
- `frontend/src/pages/admin/UsedNewsRegistryPage.tsx` (yeni)
- `frontend/src/app/router.tsx` (used-news route eklendi)
- `frontend/src/app/layouts/AdminLayout.tsx` (Used News nav eklendi)
- `frontend/src/tests/used-news-registry.smoke.test.tsx` (8 yeni test)
**Testler:** 8/8 yeni test PASSED | 187/187 toplam PASSED
**Build:** 378.33 kB (tsc + vite build ✅)
**Commit:** `feat: add phase 39 admin used news registry frontend foundation`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-02] Phase 38 — Admin News Bulletin Selected Items Frontend Foundation

**Ne:** Selected items yönetimi için frontend katmanı oluşturuldu. Panel view/create/edit mod state machine'i, form bileşeni, DetailPanel entegrasyonu.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/api/newsBulletinApi.ts` (selected items API fonksiyonları + tipler eklendi)
- `frontend/src/hooks/useNewsBulletinSelectedItems.ts` (yeni)
- `frontend/src/hooks/useCreateNewsBulletinSelectedItem.ts` (yeni)
- `frontend/src/hooks/useUpdateNewsBulletinSelectedItem.ts` (yeni)
- `frontend/src/components/news-bulletin/NewsBulletinSelectedItemForm.tsx` (yeni)
- `frontend/src/components/news-bulletin/NewsBulletinSelectedItemsPanel.tsx` (yeni)
- `frontend/src/components/news-bulletin/NewsBulletinDetailPanel.tsx` (SelectedItemsPanel eklendi)
- `frontend/src/tests/news-bulletin-selected-items-panel.smoke.test.tsx` (11 yeni test)
- `frontend/src/tests/news-bulletin-form.smoke.test.tsx` (selected-news mock ayrımı eklendi)
**Testler:** 11/11 yeni test PASSED | 179/179 toplam PASSED
**Build:** 374.43 kB (tsc + vite build ✅)
**Commit:** `feat: add phase 38 admin news bulletin selected items frontend foundation`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-02] Phase 37 — News Bulletin Selected Items Backend Foundation

**Ne:** news_bulletin_selected_items tablosu eklendi. Bir news bulletin ile seçilen news item'ları arasında explicit linkage, sıralama ve seçim gerekçesi desteği.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/db/models.py` (NewsBulletinSelectedItem modeli, UniqueConstraint, UniqueConstraint import)
- `backend/alembic/versions/721a304e877f_add_news_bulletin_selected_items_table.py` (yeni)
- `backend/app/modules/news_bulletin/schemas.py` (SelectedItem schemas eklendi)
- `backend/app/modules/news_bulletin/service.py` (SelectedItem service fonksiyonları, IntegrityError handling)
- `backend/app/modules/news_bulletin/router.py` (GET/POST/PATCH selected-news endpoint'leri, 409 handling)
- `backend/tests/test_news_bulletin_selected_items_api.py` (8 yeni test)
**Testler:** 8/8 yeni test PASSED | 174/174 toplam PASSED
**Commit:** `feat: add phase 37 news bulletin selected items backend foundation`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-02] Phase 36 — Admin News Bulletin Metadata Frontend Foundation

**Ne:** News bulletin metadata yönetimi için frontend katmanı oluşturuldu. MetadataPanel view/create/edit mod state machine'i, form bileşeni ve DetailPanel entegrasyonu eklendi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/api/newsBulletinApi.ts` (metadata API fonksiyonları + tipler eklendi)
- `frontend/src/hooks/useNewsBulletinMetadata.ts` (yeni)
- `frontend/src/hooks/useCreateNewsBulletinMetadata.ts` (yeni)
- `frontend/src/hooks/useUpdateNewsBulletinMetadata.ts` (yeni)
- `frontend/src/components/news-bulletin/NewsBulletinMetadataForm.tsx` (yeni)
- `frontend/src/components/news-bulletin/NewsBulletinMetadataPanel.tsx` (yeni)
- `frontend/src/components/news-bulletin/NewsBulletinDetailPanel.tsx` (MetadataPanel entegrasyonu)
- `frontend/src/tests/news-bulletin-metadata-panel.smoke.test.tsx` (11 yeni test)
- `frontend/src/tests/news-bulletin-form.smoke.test.tsx` (metadata URL mock ayrımı eklendi)
**Testler:** 11/11 yeni test PASSED | 167/167 toplam PASSED
**Build:** 368.37 kB (tsc + vite build ✅)
**Commit:** `feat: add phase 36 admin news bulletin metadata frontend foundation`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-02] Phase 35 — Admin News Bulletin Script Frontend Foundation

**Ne:** News bulletin script yönetimi için frontend katmanı oluşturuldu. ScriptPanel view/create/edit mod state machine'i, form bileşeni ve DetailPanel entegrasyonu eklendi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/api/newsBulletinApi.ts` (script API fonksiyonları + tipler eklendi)
- `frontend/src/hooks/useNewsBulletinScript.ts` (yeni)
- `frontend/src/hooks/useCreateNewsBulletinScript.ts` (yeni)
- `frontend/src/hooks/useUpdateNewsBulletinScript.ts` (yeni)
- `frontend/src/components/news-bulletin/NewsBulletinScriptForm.tsx` (yeni)
- `frontend/src/components/news-bulletin/NewsBulletinScriptPanel.tsx` (yeni)
- `frontend/src/components/news-bulletin/NewsBulletinDetailPanel.tsx` (ScriptPanel entegrasyonu)
- `frontend/src/tests/news-bulletin-script-panel.smoke.test.tsx` (9 yeni test)
- `frontend/src/tests/news-bulletin-form.smoke.test.tsx` (fetch mock URL ayrımı düzeltildi)
**Testler:** 9/9 yeni test PASSED | 156/156 toplam PASSED
**Build:** 360.60 kB (tsc + vite build ✅)
**Commit:** `feat: add phase 35 admin news bulletin script frontend foundation`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-02] Phase 34 — News Bulletin Metadata Backend Foundation

**Ne:** NewsBulletinMetadata modeli eklendi, metadata CRUD endpoint'leri news bulletin router'a entegre edildi.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/db/models.py` (NewsBulletinMetadata modeli eklendi)
- `backend/alembic/versions/3d2bdaf23628_add_news_bulletin_metadata_table.py` (yeni)
- `backend/app/modules/news_bulletin/schemas.py` (Metadata schemas eklendi)
- `backend/app/modules/news_bulletin/service.py` (Metadata service fonksiyonları eklendi)
- `backend/app/modules/news_bulletin/router.py` (GET/POST/PATCH /{id}/metadata eklendi)
- `backend/tests/test_news_bulletin_metadata_api.py` (7 yeni test)
- `docs/testing/test-report-phase-34-news-bulletin-metadata-backend.md` (yeni)
**Testler:** 7/7 phase tests PASSED | 166/166 toplam PASSED
**Commit:** `feat: add phase 34 news bulletin metadata backend foundation`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-02] Phase 33 — News Bulletin Script Backend Foundation

**Ne:** NewsBulletinScript modeli eklendi, script CRUD endpoint'leri news bulletin router'a entegre edildi.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/db/models.py` (NewsBulletinScript modeli eklendi)
- `backend/alembic/versions/485edfc2f2b5_add_news_bulletin_scripts_table.py` (yeni)
- `backend/app/modules/news_bulletin/schemas.py` (Script schemas eklendi)
- `backend/app/modules/news_bulletin/service.py` (Script service fonksiyonları eklendi)
- `backend/app/modules/news_bulletin/router.py` (GET/POST/PATCH /{id}/script eklendi)
- `backend/tests/test_news_bulletin_script_api.py` (9 yeni test)
- `docs/testing/test-report-phase-33-news-bulletin-script-backend.md` (yeni)
**Testler:** 9/9 phase tests PASSED | 159/159 toplam PASSED
**Commit:** `feat: add phase 33 news bulletin script backend foundation`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-02] Phase 32 — Admin News Bulletin Create/Edit Frontend

**Ne:** News Bulletin create/edit form eklendi. API genişletildi, mutation hook'ları yazıldı, form component'i oluşturuldu, registry/detail edit mode'a taşındı.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/api/newsBulletinApi.ts` (createNewsBulletin, updateNewsBulletin eklendi)
- `frontend/src/hooks/useCreateNewsBulletin.ts` (yeni)
- `frontend/src/hooks/useUpdateNewsBulletin.ts` (yeni)
- `frontend/src/components/news-bulletin/NewsBulletinForm.tsx` (yeni)
- `frontend/src/components/news-bulletin/NewsBulletinDetailPanel.tsx` (edit mode eklendi)
- `frontend/src/pages/admin/NewsBulletinCreatePage.tsx` (yeni)
- `frontend/src/pages/admin/NewsBulletinRegistryPage.tsx` (+ Yeni butonu, selectedId state)
- `frontend/src/app/router.tsx` (/admin/news-bulletins/new route eklendi)
- `frontend/src/tests/news-bulletin-form.smoke.test.tsx` (8 yeni test)
- `docs/testing/test-report-phase-32-news-bulletin-form-frontend.md` (yeni)
**Testler:** 147/147 passed | build ✅ 354.42 kB
**Commit:** `feat: add phase 32 admin news bulletin create/edit frontend`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-02] Phase 31 — Admin News Bulletin Registry Frontend Foundation

**Ne:** News Bulletin admin sayfası oluşturuldu. API katmanı, hooks, tablo, detail panel, registry sayfası ve sidebar entegrasyonu eklendi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/api/newsBulletinApi.ts` (yeni)
- `frontend/src/hooks/useNewsBulletinsList.ts` (yeni)
- `frontend/src/hooks/useNewsBulletinDetail.ts` (yeni)
- `frontend/src/components/news-bulletin/NewsBulletinsTable.tsx` (yeni)
- `frontend/src/components/news-bulletin/NewsBulletinDetailPanel.tsx` (yeni)
- `frontend/src/pages/admin/NewsBulletinRegistryPage.tsx` (yeni)
- `frontend/src/app/router.tsx` (/admin/news-bulletins route eklendi)
- `frontend/src/app/layouts/AdminLayout.tsx` (News Bulletin nav item eklendi)
- `frontend/src/tests/news-bulletin-registry.smoke.test.tsx` (9 yeni test)
- `docs/testing/test-report-phase-31-news-bulletin-frontend.md` (yeni)
**Testler:** 139/139 passed | build ✅ 347.57 kB
**Commit:** `feat: add phase 31 admin news bulletin registry frontend foundation`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-02] Phase 30 — News Bulletin Backend Foundation

**Ne:** NewsBulletin modeli, migration, schemas, service, router ve 11 test eklendi.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/db/models.py` (NewsBulletin ORM modeli eklendi)
- `backend/alembic/versions/8c913edf5154_add_news_bulletins_table.py` (yeni migration)
- `backend/app/modules/news_bulletin/__init__.py` (yeni)
- `backend/app/modules/news_bulletin/schemas.py` (NewsBulletinCreate, NewsBulletinUpdate, NewsBulletinResponse)
- `backend/app/modules/news_bulletin/service.py` (list/get/create/update)
- `backend/app/modules/news_bulletin/router.py` (/api/v1/modules/news-bulletin CRUD)
- `backend/app/api/router.py` (news_bulletin_router dahil edildi)
- `backend/tests/test_news_bulletin_api.py` (11 yeni test)
- `docs/testing/test-report-phase-30-news-bulletin-backend.md` (yeni)
**Testler:** 11/11 phase tests PASSED | 150/150 toplam PASSED
**Commit:** `feat: add phase 30 news bulletin backend foundation`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-02] Phase 29 — Used News Registry Backend Foundation

**Ne:** UsedNewsRegistry modeli, migration, schemas, service, router ve 14 test eklendi.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/db/models.py` (UsedNewsRegistry ORM modeli eklendi)
- `backend/alembic/versions/3771f6696ce2_add_used_news_registry_table.py` (yeni migration)
- `backend/app/used_news/__init__.py` (yeni)
- `backend/app/used_news/schemas.py` (UsedNewsCreate, UsedNewsUpdate, UsedNewsResponse)
- `backend/app/used_news/service.py` (list/get/create/update; news_item varlık kontrolü)
- `backend/app/used_news/router.py` (/api/v1/used-news CRUD)
- `backend/app/api/router.py` (used_news_router dahil edildi)
- `backend/tests/test_used_news_api.py` (14 yeni test)
- `docs/testing/test-report-phase-29-used-news-backend.md` (yeni)
**Testler:** 14/14 phase tests PASSED | 139/139 toplam PASSED
**Commit:** `feat: add phase 29 used news backend foundation`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-02] Phase 28 — News Items Backend Foundation

**Ne:** NewsItem modeli, migration, schemas, service, router ve 14 test eklendi.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/db/models.py` (NewsItem ORM modeli eklendi)
- `backend/alembic/versions/0ee09dfddce7_add_news_items_table.py` (yeni migration)
- `backend/app/news_items/__init__.py` (yeni)
- `backend/app/news_items/schemas.py` (NewsItemCreate, NewsItemUpdate, NewsItemResponse)
- `backend/app/news_items/service.py` (list/get/create/update)
- `backend/app/news_items/router.py` (/api/v1/news-items CRUD)
- `backend/app/api/router.py` (news_items_router eklendi)
- `backend/tests/test_news_items_api.py` (14 yeni test)
- `docs/testing/test-report-phase-28-news-items-backend.md` (yeni)
**Testler:** 14/14 phase tests PASSED | 125/125 toplam PASSED
**Commit:** `feat: add phase 28 news items backend foundation`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-02] Phase 27 — Admin Source Scans Registry Frontend Foundation

**Ne:** Source scans admin sayfası oluşturuldu. API katmanı, hooks, tablo, detail panel, registry sayfası ve sidebar entegrasyonu eklendi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/api/sourceScansApi.ts` (yeni)
- `frontend/src/hooks/useSourceScansList.ts` (yeni)
- `frontend/src/hooks/useSourceScanDetail.ts` (yeni)
- `frontend/src/components/source-scans/SourceScansTable.tsx` (yeni)
- `frontend/src/components/source-scans/SourceScanDetailPanel.tsx` (yeni)
- `frontend/src/pages/admin/SourceScansRegistryPage.tsx` (yeni)
- `frontend/src/app/router.tsx` (/admin/source-scans route eklendi)
- `frontend/src/app/layouts/AdminLayout.tsx` (Source Scans nav item eklendi)
- `frontend/src/tests/source-scans-registry.smoke.test.tsx` (9 yeni test)
**Testler:** 130/130 passed | build ✅ 343.68 kB
**Commit:** — `feat: add phase 27 admin source scans registry frontend foundation`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-02] Phase 26 — Source Scans Backend Foundation

**Ne:** SourceScan modeli, migration, schemas, service, router ve 14 test eklendi.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/db/models.py` (SourceScan ORM modeli eklendi)
- `backend/alembic/versions/5769e14d7322_add_source_scans_table.py` (yeni migration)
- `backend/app/source_scans/__init__.py` (yeni)
- `backend/app/source_scans/schemas.py` (ScanCreate, ScanUpdate, ScanResponse)
- `backend/app/source_scans/service.py` (list, get, create, update; source existence check)
- `backend/app/source_scans/router.py` (/api/v1/source-scans CRUD)
- `backend/app/api/router.py` (source_scans_router eklendi)
- `backend/tests/test_source_scans_api.py` (14 yeni test)
- `docs/testing/test-report-phase-26-source-scans-backend.md` (yeni)
**Testler:** `pytest` — 14/14 passed | 111/111 toplam passed
**Commit:** — `feat: add phase 26 source scans backend foundation`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-02] Phase 25 — Admin Sources Create and Edit Frontend

**Ne:** Sources create/edit formu eklendi. SourceForm, SourceCreatePage, detail panel edit modu ve mutation hook'ları oluşturuldu.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/api/sourcesApi.ts` (genişletildi: createSource, updateSource)
- `frontend/src/hooks/useCreateSource.ts` (yeni)
- `frontend/src/hooks/useUpdateSource.ts` (yeni)
- `frontend/src/components/sources/SourceForm.tsx` (yeni)
- `frontend/src/pages/admin/SourceCreatePage.tsx` (yeni)
- `frontend/src/components/sources/SourceDetailPanel.tsx` (edit mode eklendi)
- `frontend/src/pages/admin/SourcesRegistryPage.tsx` (+ Yeni Source butonu, selectedId state)
- `frontend/src/app/router.tsx` (/admin/sources/new route eklendi)
- `frontend/src/tests/source-form.smoke.test.tsx` (9 yeni test)
- `docs/testing/test-report-phase-25-source-form-frontend.md` (yeni)
**Testler:** `npm test` — 121 passed (112 mevcut + 9 yeni) | build ✅ 337.20 kB
**Commit:** — `feat: add phase 25 admin sources create and edit frontend`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-02] Phase 24 — Admin Sources Registry Frontend Foundation

**Ne:** Sources admin sayfası oluşturuldu. API katmanı, hooks, tablo, detail panel, registry sayfası ve sidebar entegrasyonu eklendi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/api/sourcesApi.ts` (yeni)
- `frontend/src/hooks/useSourcesList.ts` (yeni)
- `frontend/src/hooks/useSourceDetail.ts` (yeni)
- `frontend/src/components/sources/SourcesTable.tsx` (yeni)
- `frontend/src/components/sources/SourceDetailPanel.tsx` (yeni)
- `frontend/src/pages/admin/SourcesRegistryPage.tsx` (yeni)
- `frontend/src/app/router.tsx` (/admin/sources route eklendi)
- `frontend/src/app/layouts/AdminLayout.tsx` (Sources nav item eklendi)
- `frontend/src/tests/sources-registry.smoke.test.tsx` (9 yeni test)
- `docs/testing/test-report-phase-24-sources-frontend.md` (yeni)
**Testler:** `npm test` — 112 passed (103 mevcut + 9 yeni) | build ✅ 329.75 kB
**Commit:** — `feat: add phase 24 admin sources registry frontend foundation`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-02] Phase 23 — News Source Registry Backend Foundation

**Ne:** NewsSource modeli, migration, schemas, service, router ve API testleri eklendi.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/db/models.py` (NewsSource ORM modeli eklendi)
- `backend/alembic/versions/a1078575e258_add_news_sources_table.py` (yeni migration)
- `backend/app/sources/__init__.py` (yeni)
- `backend/app/sources/schemas.py` (SourceCreate, SourceUpdate, SourceResponse)
- `backend/app/sources/service.py` (list, get, create, update)
- `backend/app/sources/router.py` (/api/v1/sources CRUD)
- `backend/app/api/router.py` (sources_router eklendi)
- `backend/tests/test_sources_api.py` (15 yeni test)
- `docs/testing/test-report-phase-23-sources-backend.md` (yeni)
**Testler:** `pytest` — 15/15 phase test passed | 97/97 toplam passed
**Commit:** — `feat: add phase 23 sources backend foundation`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-02] Phase 22 — Admin Style Blueprints Registry Frontend

**Ne:** Style Blueprints admin sayfası oluşturuldu. API katmanı, hooks, tablo, detail panel, registry sayfası ve sidebar entegrasyonu eklendi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/api/styleBlueprintsApi.ts` (yeni)
- `frontend/src/hooks/useStyleBlueprintsList.ts` (yeni)
- `frontend/src/hooks/useStyleBlueprintDetail.ts` (yeni)
- `frontend/src/components/style-blueprints/StyleBlueprintsTable.tsx` (yeni)
- `frontend/src/components/style-blueprints/StyleBlueprintDetailPanel.tsx` (yeni)
- `frontend/src/pages/admin/StyleBlueprintsRegistryPage.tsx` (yeni)
- `frontend/src/app/router.tsx` (/admin/style-blueprints route eklendi)
- `frontend/src/app/layouts/AdminLayout.tsx` (Style Blueprints nav item eklendi)
- `frontend/src/tests/style-blueprints-registry.smoke.test.tsx` (9 yeni test)
- `docs/testing/test-report-phase-22-style-blueprints-frontend.md` (yeni)
**Testler:** `npm test` — 103 passed (94 mevcut + 9 yeni) | build ✅ 324.25 kB
**Commit:** `4e8f00e` — `feat: add phase 22 admin style blueprints registry frontend`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-02] Phase 21 — Style Blueprint Backend Foundation

**Ne:** StyleBlueprint modeli, migration, schemas, service, router ve API testleri eklendi.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/db/models.py` (StyleBlueprint ORM modeli eklendi)
- `backend/alembic/versions/705dbe9d9ef1_add_style_blueprints_table.py` (yeni migration)
- `backend/app/modules/style_blueprints/__init__.py` (yeni)
- `backend/app/modules/style_blueprints/schemas.py` (Create, Update, Response)
- `backend/app/modules/style_blueprints/service.py` (list, get, create, update)
- `backend/app/modules/style_blueprints/router.py` (GET/POST /style-blueprints, GET/PATCH /{id})
- `backend/app/api/router.py` (style_blueprints_router eklendi)
- `backend/tests/test_style_blueprints_api.py` (11 test)
- `docs/testing/test-report-phase-21-style-blueprints-backend.md` (yeni)
**Testler:** 11/11 style blueprint testi | 82/82 toplam backend test ✅
**Commit:** `e4770cf` — `feat: add phase 21 style blueprint backend foundation`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-02] Phase 20 — Template Create/Edit Form Frontend

**Ne:** Template create sayfası, ortak TemplateForm bileşeni ve detail panel içinde edit mode eklendi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/api/templatesApi.ts` (createTemplate, updateTemplate, payload tipleri eklendi)
- `frontend/src/hooks/useCreateTemplate.ts` (yeni)
- `frontend/src/hooks/useUpdateTemplate.ts` (yeni)
- `frontend/src/components/templates/TemplateForm.tsx` (yeni — ortak form)
- `frontend/src/pages/admin/TemplateCreatePage.tsx` (yeni — /admin/templates/new)
- `frontend/src/components/templates/TemplateDetailPanel.tsx` (edit mode eklendi)
- `frontend/src/pages/admin/TemplatesRegistryPage.tsx` ("+ Yeni Template" butonu eklendi)
- `frontend/src/app/router.tsx` (templates/new route eklendi)
- `frontend/src/tests/template-form.smoke.test.tsx` (10 yeni test)
- `docs/testing/test-report-phase-20-template-form-frontend.md` (yeni)
**Testler:** `npm test` — 94 passed (84 mevcut + 10 yeni) | build ✅ 318.37 kB
**Commit:** `0f87a67` — `feat: add phase 20 admin templates create/edit form frontend`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-02] Phase 19 — Admin Templates Registry Frontend

**Ne:** Templates admin sayfası oluşturuldu. API katmanı, React Query hook'ları, TemplatesTable, TemplateDetailPanel, TemplatesRegistryPage ve sidebar entegrasyonu eklendi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/api/templatesApi.ts` (yeni — fetchTemplates, fetchTemplateById)
- `frontend/src/hooks/useTemplatesList.ts` (yeni)
- `frontend/src/hooks/useTemplateDetail.ts` (yeni)
- `frontend/src/components/templates/TemplatesTable.tsx` (yeni)
- `frontend/src/components/templates/TemplateDetailPanel.tsx` (yeni)
- `frontend/src/pages/admin/TemplatesRegistryPage.tsx` (yeni)
- `frontend/src/app/router.tsx` (/admin/templates route eklendi)
- `frontend/src/app/layouts/AdminLayout.tsx` (Templates nav item eklendi)
- `frontend/src/tests/templates-registry.smoke.test.tsx` (9 yeni test)
- `docs/testing/test-report-phase-19-templates-frontend.md` (yeni)
**Testler:** `npm test` — 84 passed (75 mevcut + 9 yeni) | build ✅ 308.82 kB
**Commit:** `347d104` — `feat: add phase 19 admin templates registry frontend`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-02] Phase 18 — Template Engine Backend Foundation

**Ne:** Template modeli, Alembic migrasyonu, schemas, service, router ve tam API test seti eklendi.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/db/models.py` (Template ORM modeli eklendi)
- `backend/alembic/versions/2e7eb44ff9c8_add_templates_table.py` (yeni migration)
- `backend/app/modules/templates/__init__.py` (yeni)
- `backend/app/modules/templates/schemas.py` (TemplateCreate, TemplateUpdate, TemplateResponse)
- `backend/app/modules/templates/service.py` (list, get, create, update)
- `backend/app/modules/templates/router.py` (GET/POST /templates, GET/PATCH /templates/{id})
- `backend/app/api/router.py` (templates_router eklendi)
- `backend/tests/test_templates_api.py` (11 yeni test)
- `docs/testing/test-report-phase-18-templates-backend.md` (yeni)
**Testler:** 11/11 template testi geçti | 71 toplam backend test ✅
**Commit:** `3be3e13` — `feat: add phase 18 templates backend foundation`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-01] Phase 17 — Admin Standard Video Metadata Frontend

**Ne:** Standard Video detail sayfasında metadata artifact için tam create/edit UI eklendi. ArtifactsPanel kaldırılıp yerine bağımsız ScriptPanel + MetadataPanel konuldu.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/api/standardVideoApi.ts` (metadata create/update payloads ve fonksiyonlar eklendi)
- `frontend/src/hooks/useCreateStandardVideoMetadata.ts` (yeni)
- `frontend/src/hooks/useUpdateStandardVideoMetadata.ts` (yeni)
- `frontend/src/components/standard-video/StandardVideoMetadataPanel.tsx` (yeni)
- `frontend/src/pages/admin/StandardVideoDetailPage.tsx` (metadata panel entegre edildi, ArtifactsPanel kaldırıldı)
- `frontend/src/tests/standard-video-metadata-panel.smoke.test.tsx` (12 yeni test)
- `frontend/src/tests/standard-video-detail-page.smoke.test.tsx` (2 test güncellendi)
- `docs/testing/test-report-phase-17-standard-video-metadata-frontend.md` (yeni)
**Testler:** `npm test` — 75 passed (63 mevcut + 12 yeni) | build ✅ 301.46 kB
**Commit:** `320da4b` — `feat: add phase 17 admin standard video metadata frontend`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-01] Phase 16 — Admin Standard Video Script Frontend Foundation

**Ne:** Standard Video detail sayfasında script artifact için tam create/edit UI eklendi. Loading, error, empty, read, create, edit durumları destekleniyor.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/api/standardVideoApi.ts` (`StandardVideoScriptCreatePayload`, `StandardVideoScriptUpdatePayload`, `createStandardVideoScript`, `updateStandardVideoScript` eklendi)
- `frontend/src/hooks/useCreateStandardVideoScript.ts` (yeni)
- `frontend/src/hooks/useUpdateStandardVideoScript.ts` (yeni)
- `frontend/src/components/standard-video/StandardVideoScriptPanel.tsx` (yeni)
- `frontend/src/pages/admin/StandardVideoDetailPage.tsx` (script panel entegre edildi)
- `frontend/src/tests/standard-video-script-panel.smoke.test.tsx` (13 yeni test)
- `frontend/src/tests/standard-video-detail-page.smoke.test.tsx` (getByText → getAllByText düzeltmesi)
- `docs/testing/test-report-phase-16-standard-video-script-frontend.md` (yeni)
**Testler:** `npm test` — 63 passed (50 mevcut + 13 yeni) | build ✅ 294.76 kB
**Commit:** `267cc92` — `feat: add phase 16 admin standard video script frontend foundation`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-01] Phase 15 — Standard Video Create/Edit Frontend

**Ne:** Standard Video create ve edit UI eklendi. Yeniden kullanılabilir form bileşeni, create sayfası, detail sayfasına edit modu, `/admin/standard-videos/new` route ve liste sayfasına "Yeni Standard Video" butonu eklendi.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/api/standardVideoApi.ts` (`StandardVideoCreatePayload`, `StandardVideoUpdatePayload`, `createStandardVideo`, `updateStandardVideo` eklendi)
- `frontend/src/hooks/useCreateStandardVideo.ts` (yeni)
- `frontend/src/hooks/useUpdateStandardVideo.ts` (yeni)
- `frontend/src/components/standard-video/StandardVideoForm.tsx` (yeni)
- `frontend/src/pages/admin/StandardVideoCreatePage.tsx` (yeni)
- `frontend/src/pages/admin/StandardVideoDetailPage.tsx` (edit modu eklendi)
- `frontend/src/app/router.tsx` (`/admin/standard-videos/new` rotası eklendi)
- `frontend/src/pages/admin/StandardVideoRegistryPage.tsx` (Yeni butonu eklendi)
- `frontend/src/tests/standard-video-form.smoke.test.tsx` (6 yeni test)
- `docs/testing/test-report-phase-15-standard-video-form-frontend.md` (yeni)
**Testler:** `npm test` — 50 passed (44 mevcut + 6 yeni) | build ✅ 287.99 kB
**Commit:** `1fb66eb` — `feat: add phase 15 standard video create/edit frontend`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-01] Phase 14 — Standard Video Admin Frontend

**Ne:** Standard Video admin registry ve detail sayfaları eklendi. API katmanı, hooks, tablo, overview/artifacts panelleri ve rotalar kuruldu.
**Eklenen/değiştirilen dosyalar:**
- `frontend/src/api/standardVideoApi.ts` (yeni)
- `frontend/src/hooks/useStandardVideosList.ts` (yeni)
- `frontend/src/hooks/useStandardVideoDetail.ts` (yeni)
- `frontend/src/components/standard-video/StandardVideosTable.tsx` (yeni)
- `frontend/src/components/standard-video/StandardVideoOverviewPanel.tsx` (yeni)
- `frontend/src/components/standard-video/StandardVideoArtifactsPanel.tsx` (yeni)
- `frontend/src/pages/admin/StandardVideoRegistryPage.tsx` (yeni)
- `frontend/src/pages/admin/StandardVideoDetailPage.tsx` (yeni)
- `frontend/src/app/router.tsx` (standard-videos rotaları eklendi)
- `frontend/src/app/layouts/AdminLayout.tsx` (Standard Video nav linki eklendi)
- `frontend/src/tests/standard-video-registry.smoke.test.tsx` (5 yeni test)
- `frontend/src/tests/standard-video-detail-page.smoke.test.tsx` (6 yeni test)
- `docs/testing/test-report-phase-14-standard-video-admin-frontend.md` (yeni)
**Testler:** `npm test` — 44 passed (33 mevcut + 11 yeni) | build ✅ 278.36 kB
**Commit:** `b03fb8d` — `feat: add phase 14 standard video admin frontend`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-01] Phase 13 — Standard Video Metadata Backend Foundation

**Ne:** Standard Video için metadata artifact backend'i kuruldu. `standard_video_metadata` tablosu, metadata CRUD API ve 8 yeni test eklendi.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/db/models.py` (`StandardVideoMetadata` modeli eklendi)
- `backend/app/modules/standard_video/schemas.py` (metadata şemaları eklendi)
- `backend/app/modules/standard_video/service.py` (metadata servis fonksiyonları eklendi)
- `backend/app/modules/standard_video/router.py` (metadata endpoint'leri eklendi)
- `backend/alembic/versions/f96474c7ec08_add_standard_video_metadata_table.py` (yeni)
- `backend/tests/test_standard_video_metadata_api.py` (8 yeni test)
- `docs/testing/test-report-phase-13-standard-video-metadata-backend.md` (yeni)
**Testler:** `pytest` — 60 passed (52 mevcut + 8 yeni) in ~0.33s
**Commit:** `6cc17c5` — `feat: add phase 13 standard video metadata backend foundation`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

---

## [2026-04-01] Phase 12 — Standard Video Script Backend Foundation

**Ne:** Standard Video için script artifact backend'i kuruldu. `standard_video_scripts` tablosu, script CRUD API ve 8 yeni test eklendi.
**Eklenen/değiştirilen dosyalar:**
- `backend/app/db/models.py` (`StandardVideoScript` modeli eklendi)
- `backend/app/modules/standard_video/schemas.py` (script şemaları eklendi)
- `backend/app/modules/standard_video/service.py` (script servis fonksiyonları eklendi)
- `backend/app/modules/standard_video/router.py` (script endpoint'leri eklendi)
- `backend/alembic/versions/2472507548c3_add_standard_video_scripts_table.py` (yeni)
- `backend/tests/test_standard_video_script_api.py` (8 yeni test)
- `docs/testing/test-report-phase-12-standard-video-script-backend.md` (yeni)
**Testler:** `pytest` — 52 passed (44 mevcut + 8 yeni) in ~0.36s
**Commit:** `849ec84` — `feat: add phase 12 standard video script backend foundation`
**Push:** ✅ `git@github.com:huskobro/contenthub.git`

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
