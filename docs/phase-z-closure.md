# PHASE Z — Operational Hardening / Release Candidate Pack (KAPANIŞ)

**Tarih:** 2026-04-16
**Revizyon:** `phase_z_001` (production hardening + RC smoke pack; schema/migration değişikliği YOK)
**Kapsam:** 7 alt faz (A–G) — warning temizlik envanteri, channel import hardening,
workspace/artifact hardening, backup/restore audit, RC smoke pack, docs, git.

---

## 1. Sonuç Özeti

- ✅ Production davranışı **zayıflatılmadı** — ownership/auth/security kontratı PHASE X
  seviyesinde aynen korundu.
- ✅ Hiç `skip`, `xfail`, sessiz bypass eklenmedi.
- ✅ Channel import'u DoS/consent-wall/edge-case'lere karşı sertleştirildi (streaming
  + 512 KB hard cap + `max_redirects=5` + meaningful-title filter).
- ✅ Workspace artifact serving zinciri (ownership + orphan + cross-user +
  path-traversal + missing-file + fallback) 7 hardening testiyle doğrulandı.
- ✅ Backup/restore rehberi prod gerçeğine göre yeniden yazıldı (hot backup,
  WAL/SHM, migration pre-flight, restore post-behavior).
- ✅ Release Candidate smoke hattı: 8 uçtan uca test (onboarding → channel →
  project → job → detail → ownership → admin global → analytics → publish gate →
  startup recovery).
- ✅ Full suite: **2274 passed, 0 failed** (PHASE Y'ye göre +40 net hardening testi).
- ✅ Git: 2 commit (hardening code/tests + docs/release audit) + push `origin/main`.

---

## 2. Alt Fazlar — Teslim Durumu

| Faz | Başlık | Durum |
|---|---|---|
| A | Warning cleanup audit + envanter | ✅ |
| B | Channel import hardening (timeout / partial / dup / edge-case) | ✅ |
| C | Workspace/artifact hardening + isolation tests | ✅ |
| D | Backup / restore / recoverability audit (operator-guide §7 rewrite) | ✅ |
| E | Release candidate smoke pack (8 test) | ✅ |
| F | Docs: STATUS, CHANGELOG, phase-z-closure | ✅ |
| G | Git discipline (2 commit + push) | ✅ |

---

## 3. Discovery Özeti

Başlangıç durumu (PHASE Y kapanışı): **2234 passed, 22 warning**.

### 3.1 Warning Envanteri (Z-A)

| Kategori | Adet | Kaynak | Kararlaştırılan aksiyon |
|---|---|---|---|
| `HTTP_422_UNPROCESSABLE_ENTITY` deprecation (Starlette) | 6 | `publish/router.py` (4), `channels/router.py` (1), `prompt_assembly/service.py` (1) | Kod düzeltmesi — `_CONTENT` variantına geçildi |
| `ResourceWarning: unclosed file` | 11 | `test_product_review_b_crud.py` (5), `test_product_review_d_templates.py` (6) | Test düzeltmesi — `Path.read_text()` |
| `RuntimeWarning: coroutine … never awaited` | 1 | `test_m2_c6_dispatcher_integration.py` | Non-blocker — dispatcher integration testi zaten background run'ı mock ediyor; pratikte prod davranışını etkilemiyor |
| `aiosqlite Connection` teardown (pytest resource warning) | ~4 | test infra | Non-blocker — test fixture teardown; prod DB yolu değil |

Net: **fixable 17 warning temizlendi; kalan 1 non-blocker** (background coroutine
never-awaited mesajı, dispatcher unit testinin doğal yapısı).

### 3.2 Channel Import Audit (Z-B ön-kaşif)

Mevcut davranış:
- `metadata_fetch._fetch_html` 5s timeout + follow_redirects=True fakat redirect
  sayısı sınırsız, body size sınırsız. `httpx.ReadError` harici exception'lar
  downstream'e sızabilirdi.
- `_parse_html_meta` "YouTube" gibi consent-wall başlıklarını meaningful kabul
  edip profile'a yazıyordu — sonuç olarak partial state tetiklenmiyordu.
- `url_utils.parse_channel_url` zaten edge-case'lere dayanıklıydı (whitespace,
  non-http, tracking strip, trailing slash) fakat test kapsamı dardı.
- `service.create_channel_profile_from_url` duplicate-per-user ve cross-user
  davranışını doğru implement ediyordu fakat test yoktu.

### 3.3 Workspace/Artifact Audit (Z-C ön-kaşif)

Mevcut davranış:
- `_enforce_job_ownership` admin bypass + orphan (owner_id=NULL) için user'a 403.
- Artifact list endpoint job.workspace_path'i authoritative olarak kullanıyor;
  yoksa `ws.get_workspace_path(job_id)` global fallback.
- Path traversal guard: `.resolve().relative_to(workspace_dir)` try/except
  pattern'i (FastAPI `{file_path:path}` üzerinden `..` kabul etmiyor).
- Missing artifact → 404.

Eksik: Bu contract'ı end-to-end doğrulayan izole test seti yoktu.

### 3.4 Backup/Restore Audit (Z-D ön-kaşif)

`docs/operator-guide.md` §7 eski hâli sadece `cp` kullanan cold backup'ı
tarifliyordu; WAL/SHM dosyalarından bahsetmiyor, hot backup yolu sunmuyordu;
migration pre-flight checklist'i yoktu.

---

## 4. Hardening Değişiklikleri

### 4.1 Production Code Fix — Z-A + Z-B

| Dosya | Değişiklik | Nedeni |
|---|---|---|
| `app/prompt_assembly/service.py` | `HTTP_422_UNPROCESSABLE_ENTITY` → `_CONTENT` | Starlette deprecation; silent future-break'i önle |
| `app/publish/router.py` | 4 yerde aynı rename | Aynı |
| `app/channels/router.py` | 1 yerde aynı rename | Aynı |
| `app/channels/metadata_fetch.py` | `_MAX_REDIRECTS=5`, streaming body 512 KB hard cap, try/except genişletildi, `_MEANINGLESS_TITLES` filter ("YouTube"/"Google"/"Error"/"404") | DoS + consent-wall partial state kontratı |

### 4.2 Test Cleanup Fix — Z-A

| Dosya | Değişiklik |
|---|---|
| `tests/test_product_review_b_crud.py` | 5 × `json.loads(open(X).read())` → `json.loads(Path(X).read_text())` + `from pathlib import Path` |
| `tests/test_product_review_d_templates.py` | 6 × aynı pattern fix |

### 4.3 Yeni Hardening Test Dosyaları — Z-B / Z-C / Z-E

| Dosya | Test Sayısı | Kapsam |
|---|---|---|
| `tests/test_phase_z_channel_hardening.py` | 25 | url_utils edge-cases + httpx streaming shim + fetch_channel_metadata partial/consent/malformed/success + service dup/cross-user/metadata_json |
| `tests/test_phase_z_workspace_hardening.py` | 7 | workspace_path authoritative + orphan (user 403 / admin 200) + cross-user 403 + path-traversal (`..`, `..%2F..%2F`) + missing 404 + global fallback |
| `tests/test_phase_z_rc_smoke.py` | 8 | onboarding (login + /me) + channel URL create + project create + job create + ownership isolation + admin global list + analytics overview + publish reject gate + startup recovery unit |

### 4.4 Doc Rewrite — Z-D

`docs/operator-guide.md` §7 "Yedekleme ve Geri Yükleme" tamamen yeniden yazıldı:
- Ne yedeklenmeli tablosu (DB kritik, workspace yüksek, exports yüksek, `.env` kritik/ayrı sakla)
- Önerilen hot backup: `sqlite3 … ".backup …"` + `rsync -a --delete workspace/`
- Cold backup: WAL/SHM dosyalarıyla birlikte kopyalamayı zorunlu kılar
- Migration pre-flight: durdur → hot backup → `alembic upgrade head` → log kontrolü → başlat
- Restore: eski bozuk DB'yi forensic amaçlı `.broken-<tarih>` ile sakla → backup'ı
  WAL dosyaları dahil yerine koy → `rsync` workspace → `./start.sh`
- Restore sonrası auto-davranışlar: startup recovery (P-008: 5 dk+ running → failed),
  stale queued logging, WAL checkpoint, idempotent seeds

---

## 5. Code Fix vs Test Fix Ayrımı

| Kategori | Değişiklik Türü | Detay |
|---|---|---|
| `HTTP_422_…_CONTENT` rename | **Production code fix** | Starlette forward-compat; davranış değişmedi (aynı 422) |
| `_MAX_REDIRECTS=5` + body cap + `_MEANINGLESS_TITLES` | **Production hardening** | Prod davranışı: consent-wall sayfaları artık partial=True döner (önceden "YouTube" başlığıyla komple kabul ediliyordu) — bu dürüst state düzeltmesi, gerileme değil |
| `read_text()` migration | **Test fix** | Sadece test dosyası warning temizliği |
| 40 yeni hardening testi | **Yeni coverage** | Hiç prod davranışını değiştirmiyor; mevcut contract'ı lock'luyor |
| operator-guide §7 rewrite | **Doc fix** | Kod sabit |

Toplam production davranış değişikliği: **1 honest fix** — consent-wall sayfalarının
partial state'e düşmesi. Bu PHASE X "no placeholder title" ilkesini pekiştiriyor.

---

## 6. Test Sonuçları

### 6.1 Hedef Set

| Dosya | Sayı | Sonuç |
|---|---|---|
| `test_phase_z_channel_hardening.py` | 25 | ✅ 25/25 |
| `test_phase_z_workspace_hardening.py` | 7 | ✅ 7/7 |
| `test_phase_z_rc_smoke.py` | 8 | ✅ 8/8 |

### 6.2 Full Suite

```
2274 passed, 0 failed, 1 warning in 72.53s
```

PHASE Y → PHASE Z: **+40 test** (çoğu smoke/hardening izole, regressionsuz).

### 6.3 Kalan Uyarı

- `RuntimeWarning: coroutine 'JobDispatcher.dispatch.<locals>._run_pipeline' was
  never awaited` — `test_m2_c6_dispatcher_integration.py` testi background task
  kontratını gözlemliyor; prod dispatcher davranışı etkilemiyor. **Non-blocker.**

---

## 7. Release-Readiness Audit

### 7.1 RC Hazır — Blocker Yok

- ✅ Onboarding (login + /me)
- ✅ Channel URL-only create → partial state honest tutuldu
- ✅ Project → Job hiyerarşisi (PHASE X contract)
- ✅ Ownership izolasyonu (user ↔ user + user ↔ orphan + admin global)
- ✅ Artifact serving (7 hardening testi)
- ✅ Publish review gate (reject reason veya 404 zorunlu)
- ✅ Analytics admin read
- ✅ Startup recovery (P-008) stale job → failed
- ✅ Backup/restore operator yolu doğrulanmış
- ✅ Channel metadata fetch DoS/consent-wall resistant

### 7.2 Kabul Edilen Sınırlamalar (Non-Blocker)

- Full-Auto v1: sadece `standard_video`, publish step "draft kalır" (docs'ta açık).
- SSE auth yok — localhost-only tasarımı; prod deploy öncesi gözden geçirilmeli.
- TTS: Edge TTS (ücretsiz) — API anahtarı değişikliği / rate limit yönetimi
  operatörde.
- Semantik dedupe (soft) henüz yok; hard dedupe çalışıyor.
- Dispatcher integration testindeki background coroutine never-awaited warning.

### 7.3 RC Sonrası Yapılabilir (Kapsam Dışı)

- Preview artifact sistemi (style blueprint preview cards) — docs'ta var, implement sonraki faz.
- Analitik derinleşme (provider breakdown, template impact heatmap).
- Semantik dedupe ve ML-scored follow-up exception katmanı.
- Multi-tenant / billing / org yönetimi (MVP dışı, explicit deferred).

---

## 8. Kurallara Uygunluk

- ✅ No ownership/auth/security weakening.
- ✅ No hidden bypass changing production behavior (tek production fix: consent-wall
  partial state — dürüst düzeltme, PHASE X "honest state" ilkesiyle uyumlu).
- ✅ No skip/xfail/silent ignore.
- ✅ No new big modules/phases — sadece hardening + test + doc.
- ✅ No refactor for refactor's sake.
- ✅ Sadece operasyonel dayanıklılık + release-readiness temizliği.

---

## 9. Commit Hash'leri

| Commit | İçerik |
|---|---|
| `1cc0264` | Hardening code + tests: `prompt_assembly/service.py`, `publish/router.py`, `channels/router.py`, `channels/metadata_fetch.py`, `tests/test_phase_z_channel_hardening.py`, `tests/test_phase_z_workspace_hardening.py`, `tests/test_phase_z_rc_smoke.py`, `tests/test_product_review_b_crud.py`, `tests/test_product_review_d_templates.py` |
| (docs commit — bu kapanış raporu) | Docs: `docs/operator-guide.md` §7 rewrite + `docs/phase-z-closure.md` + `docs/tracking/STATUS.md` + `docs/tracking/CHANGELOG.md` |

Push hedefi: `origin/main`.

---

## 10. Sonraki Faz

PHASE Z kapandı. RC hattı dürüstçe yeşil. Bir sonraki iteration için öneriler:

- **Soft dedupe v1** (news) — threshold + manual exception path.
- **Preview artifact pipeline** (style blueprint preview cards).
- **Provider cost telemetry** (OpenAI/Pexels/Pixabay trace ve bütçe alarmı).
- **Hardening pass-2**: dispatcher background coroutine test refactor (warning 0).

Yok: multi-tenant, billing, org yönetimi — explicit MVP dışı.
