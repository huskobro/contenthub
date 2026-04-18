# ContentHub — Deferred Backlog (Ertelenen İşler)

> **Son güncelleme:** 2026-04-18
> **Kaynak:** Tüm `docs/` dokümanları + `backend/app/` + `frontend/src/` kod taraması
> **Amaç:** Projedeki tüm "defer edilmiş / ileride yapılacak / kapsam dışı" kalemlerin tek takip noktası.
> **Kural:** Bir kalem tamamlandığında `✅` işareti ile kapanır + tarih eklenir. Yeni erteleme geldiğinde buraya eklenir.

---

## Nasıl Kullanılır

- **Öncelik:** `🔴 Kritik` | `🟠 Yüksek` | `🟡 Orta` | `⚪ Düşük` | `⛔ Kalıcı Red`
- **Durum:** `⏳ Açık` | `✅ Kapalı (tarih)` | `🚫 Bilerek Ertelendi`
- Her kalem: **Konu** + **Neden ertelendi** + **Önkoşul** + **Kaynak** (dosya:satır veya doc)

---

## 1. Kritik Altyapı — Render & Publish Boru Hattı

| # | Öncelik | Durum | Konu | Neden Ertelendi | Önkoşul | Kaynak |
|---|---|---|---|---|---|---|
| C-1 | 🔴 | ⏳ | **Remotion render pipeline bağlantısı** — gerçek video üretimi yok | MVP altyapı tamamlanmadan kapsam dışı bırakıldı | Composition contract + executor wiring | `docs/testing/test-report-phase-322-324.md:284` |
| C-2 | 🔴 | ⏳ | **AI/TTS provider gerçek bağlantısı** — LLM + TTS API çağrısı yok | Provider wiring ayrı faz olarak planlandı | OpenAI/Kie.ai key + TTS adapter | `backend/app/main.py:256`, `docs/full-auto-v1-closure.md` |
| C-3 | 🔴 | ⏳ | **YouTube publish adapter** — `full_auto/service.py` her zaman `draft` bırakıyor | Faz 1 spec: "v1 ALWAYS draft; no auto-publish" | YouTube OAuth + publish executor | `backend/app/full_auto/service.py:13,424` |
| C-4 | 🔴 | ⏳ | **Analytics API gerçek veri** — tüm analytics sayfaları backend'e bağlı ama YouTube retention/watch-time yok | YouTube API entegrasyonu ertelendi | YouTube Analytics API key | `docs/release-notes-v1.md:74`, `backend/app/analytics/youtube_analytics_service.py` |

---

## 2. Publish & Otomasyon

| # | Öncelik | Durum | Konu | Neden Ertelendi | Önkoşul | Kaynak |
|---|---|---|---|---|---|---|
| P-1 | 🟠 | ⏳ | **`automation.approver_assignment.enabled` publish-gate enforcement** — `approver_user_id` kolonu var ama review-gate approver'ı zorlamıyor | P3.2'de "declarative only" olarak eklendi; enforcement sonraki faz | Settings flag aktif + state machine guard | `docs/redesign/AUDIT_MERGE_READY.md:245`, `backend/app/db/models.py:1863` |
| P-2 | 🟠 | ⏳ | **`module.id.enabled` runtime enforcement** — 5 module toggle Settings Registry'de var ama UI hiçbirini gizlemiyor | Declarative observability fazında kasıtlı bırakıldı | Settings resolver read-through + UI gate | `docs/redesign/AUDIT_MERGE_READY.md:142` |
| P-3 | 🟠 | ⏳ | **Token pre-flight "Manuel Yayınla" butonunda** — scheduler'da var ama manuel butonda yok | Gate 4 kapanışında ertelendi | `token_preflight.py` UI entegrasyonu | `docs/gate4-publish-closure.md:151` |
| P-4 | 🟡 | ⏳ | **Bulk operasyon → SSE bağlantısı** — bulk aksiyon endpoint'leri var, SSE event'leri yok | Gate 4'te düşük öncelik | SSE event namespace + frontend handler | `docs/gate4-publish-closure.md:151` |
| P-5 | 🟡 | ⏳ | **Otomasyon executor** — politikalar tanımlanabilir ama otomatik çalıştırma yok | Release notes v1'de "Deferred" | Full-auto scheduler + event hook | `docs/release-notes-v1.md:70` |
| P-6 | 🟡 | ⏳ | **Playlist engagement sync** — CRUD mevcut, YouTube API senkronizasyon tam değil | Release notes v1'de "Deferred" | YouTube API + engagement advanced router | `docs/release-notes-v1.md:71` |
| P-7 | 🟡 | ⏳ | **YouTube OAuth admin guard** — publish hardening'de ele alınacak | Backlog | Auth guard + admin role check | `docs/release-notes-v1.md:76` |

---

## 3. Frontend / UI

| # | Öncelik | Durum | Konu | Neden Ertelendi | Önkoşul | Kaynak |
|---|---|---|---|---|---|---|
| U-1 | 🟠 | ⏳ | **P3.3 kalan 3 wizard göçü** — `NewsBulletinWizardPage` admin (1409 LoC) + `CreateVideoWizardPage` + `CreateProductReviewWizardPage` | REV-2 dalgası kapanırken Phase AM'e ertelendi | `AdminWizardShell` adapter + test coverage | `docs/redesign/AUDIT_MERGE_READY.md:243` |
| U-2 | 🟠 | ⏳ | **Surface canon kararı** — Atrium / Bridge / Canvas / Horizon hangisi canon belirsiz | F3/F4 zincirinde ertelendi, redesign R3'te karar verilmeli | IA kararı + migration plan | `docs/redesign/R1_repo_reality_delta_audit.md:237` |
| U-3 | 🟡 | ⏳ | **Visual automation flow builder** (`@xyflow/react`) — `UserAutomationPage`'de 5-dropdown mevcut, sürükle-bırak akış yok | `@xyflow/react` bağımlılık + 5 yeni tablo gerektirir | `@xyflow/react` + `automation_flow_nodes` tablo | `docs/redesign/R4_preview_prototype_plan.md:605`, `docs/phase_ak_effective_settings_and_gemini_plan_audit.md:180` |
| U-4 | 🟡 | ⏳ | **Theme persistence** — localStorage'da kalıyor, backend DB'ye (user settings tablosu) taşınmadı | Post-R6'ya ertelendi | `user_settings` tablosu + migration | `docs/project_memory_and_decision_ledger.md:116` |
| U-5 | 🟡 | ⏳ | **Vite bundle code-split** — main chunk 1.59 MB tek parça | localhost-first MVP için bloke edici değil | Code-split stratejisi + lazy import | `docs/redesign/AUDIT_MERGE_READY.md:180` |
| U-6 | 🟡 | ⏳ | **Otomasyon digest dashboard sinyalleri** — `automation_runs_today`, `queued` sayısı dashboard'lara bağlanmamış | Phase AK'ta tespit, ertelendi | Yeni `/analytics/automation-summary` endpoint | `docs/phase_ak_effective_settings_and_gemini_plan_audit.md:20` |
| U-7 | 🟡 | ⏳ | **Publish board drag-drop** — şu an read-only görünüm | R4'te düşük öncelik | `@dnd-kit` veya benzeri | `docs/redesign/R4_preview_prototype_plan.md:604` |
| U-8 | ⚪ | ⏳ | **Admin Settings düzenleme UI'i** — visibility registry kural ekleme/silme, settings registry ayar düzenleme formu yok | Governance fazı kapsamına alındı | Backend CRUD endpoint'leri | `docs/testing/test-report-phase-305-309.md:62` |
| U-9 | ⚪ | ⏳ | **Preview-first UX** — stil kartları, subtitle overlay sample, lower-third sample, template/style varyant seçim önizlemesi | M10 kapsamına alındı | Preview artifact contract + composition | `docs/phase-y-closure.md:178` |
| U-10 | ⚪ | ⏳ | **Asset Library** — `BrandKitPage` + brand colors/logo/tags (`brand_kits` + `brand_assets` yeni tablolar) | Post-R6 ayrı dalga | Yeni Alembic migration + router | `docs/phase_al_product_simplification_and_effective_settings_audit.md:349` |
| U-11 | ⚪ | ⏳ | **Visual calendar** — resimli thumb + aylık grid (şu an 3-view: liste/hafta/ay var ama preview thumbs fake) | "Later" sütununda | Gerçek thumbnail artifact bağlantısı | `docs/phase_al_product_simplification_and_effective_settings_audit.md:350` |
| U-12 | ⚪ | ⏳ | **Mobile / PWA** | CLAUDE.md "local-first" + scope dışı | — | `docs/redesign/MEMORY.md:291` |

---

## 4. Backend / API

| # | Öncelik | Durum | Konu | Neden Ertelendi | Önkoşul | Kaynak |
|---|---|---|---|---|---|---|
| B-1 | 🟠 | ⏳ | **Kanal re-import endpoint** — `POST /channel-profiles/{id}/re-import` yok | Phase X kapanışında ertelendi | Channel metadata fetch refactor | `docs/phase-x-closure.md:155`, `backend/app/channels/` |
| B-2 | 🟠 | ⏳ | **Job retry policy** — `pipeline.py:20`'de "Retry steps (retry policy is a later phase)" notu var | Ayrı faz olarak tasarlandı | Retry backoff policy + settings key | `backend/app/jobs/pipeline.py:20` |
| B-3 | 🟠 | ⏳ | **`workspace_root` Settings Registry'e bağlanması** — şu an hardcoded `backend/data/workspace/` | `jobs/workspace.py:28`'de "Configurable at runtime (set from Settings Registry in a later phase)" | `KNOWN_SETTINGS` key + resolver wiring | `backend/app/jobs/workspace.py:28` |
| B-4 | 🟡 | ⏳ | **Template linkage** — `jobs.template_id`, `standard_videos.template_id`, `news_bulletins.template_id` nullable; template sistemi bağlantısı tam değil | Model doc: "will reference a template in a later phase" | Template engine + version locking | `backend/app/db/models.py:213,361,747` |
| B-5 | 🟡 | ⏳ | **StyleBlueprint → `preview_strategy_json`** — kolon var ama preview-first sistemi tarafından okunmuyor | Model doc: "future preview-first system hook" | Preview artifact contract implementation | `backend/app/db/models.py:513,529` |
| B-6 | 🟡 | ⏳ | **StyleBlueprint → composition aktif kullanımı** — blueprint kuralları composition adımında enforce edilmiyor | `project_milestone_status.md:22` | Composition executor blueprint okuma | `docs/project_milestone_status.md:22` |
| B-7 | 🟡 | ⏳ | **Semantic dedupe (haber)** — hard+soft dedupe var; embedding tabanlı semantic dedupe yok | CLAUDE.md "can come later" | Embedding provider + vector store | `backend/app/source_scans/dedupe_service.py`, `docs/CLAUDE.md:298` |
| B-8 | 🟡 | ⏳ | **Multi-output publish** — her output için ayrı `PublishRecord` yok | `project_milestone_status.md:23` | PublishRecord schema genişletme | `docs/project_milestone_status.md:23` |
| B-9 | 🟡 | ⏳ | **News items: delete / bulk reorder / used-news enforcement** — backend endpoint'ler yok | Phase 37-38 kapanışında ertelendi | CRUD endpoint + used-news service guard | `docs/testing/test-report-phase-37-38.md` |
| B-10 | 🟡 | ⏳ | **Template: DELETE endpoint + version locking for jobs** — template silme yok | Phase 18 kapanışında ertelendi | Soft-delete + job snapshot FK | `docs/testing/test-report-phase-18.md:107` |
| B-11 | 🟡 | ⏳ | **Subtitle/composition preview üretimi** — `composition_props` / subtitle preview artifact yok | Phase AB'de "honest deferred" | Composition executor + preview artifact | `docs/phase-ab-closure.md:214`, `docs/tracking/STATUS.md:278` |
| B-12 | 🟡 | ⏳ | **Non-YouTube platform adapter** — Instagram, TikTok vb. adapter yok | CLAUDE.md "Design adapters for later" | Adapter registry + platform schema | `docs/CLAUDE.md:312` |
| B-13 | ⚪ | ⏳ | **Orphan job otomatik onarım scripti** | Phase X kapanışında ertelendi | Job state reconciler | `docs/phase-x-closure.md:158` |
| B-14 | ⚪ | ⏳ | **Auth / rol zorlama** — kasıtlı olarak henüz yok (tek kullanıcı lokal) | CLAUDE.md "local-first MVP" | JWT + multi-user model | `docs/testing/test-report-phase-50.md:42` |
| B-15 | ⚪ | ⏳ | **Audit trail tam kapsam** — temel izlenebilirlik var, tam audit trail henüz değil | M9/M10 kapsamına alındı | Audit service genişletme | `docs/tracking/CHANGELOG.md:1505` |

---

## 5. Alembic / Veritabanı

| # | Öncelik | Durum | Konu | Neden Ertelendi | Önkoşul | Kaynak |
|---|---|---|---|---|---|---|
| D-1 | 🟡 | ⏳ | **`settings.status` enum migration** — tüm `status` kolonları plain `String(50)`; `{active, deleted, orphan}` enum'a çevrilmedi | AM-4'te non-breaking rollout kabul edildi | Alembic batch alter (SQLite uyumlu) | `docs/phase_am_security_and_settings_closure.md:187,312`, `backend/app/db/models.py:90` |
| D-2 | 🟡 | ⏳ | **`publish_schedule_slots` tablosu** — queue-first scheduling (Buffer/Later tarzı zaman dilimi takvimi) | Post-R6'ya ertelendi | Yeni migration + scheduler refactor | `docs/project_memory_and_decision_ledger.md:108` |
| D-3 | ⚪ | ⏳ | **`brand_kits` + `brand_assets` tablolar** — Asset Library / BrandKitPage için gerekli | "Later" sütununda | Yeni migration + router + UI | `docs/phase_al_product_simplification_and_effective_settings_audit.md:349` |

---

## 6. Settings / Registry

| # | Öncelik | Durum | Konu | Neden Ertelendi | Önkoşul | Kaynak |
|---|---|---|---|---|---|---|
| S-1 | 🟠 | ⏳ | **`user.calendar.default_view` backend read-through** — şu an declarative only, frontend localStorage override | REV-2'de declarative olarak eklendi | `settings_resolver.py` user-level read-through | `docs/redesign/MEMORY.md:259` |
| S-2 | 🟠 | ⏳ | **`user.automation.flow_visual.enabled` runtime bayrağı** — builtin True, UI her zaman SVG gösteriyor | REV-2'de declarative olarak eklendi | Settings resolver gate + UI conditional | `docs/redesign/MEMORY.md:264` |
| S-3 | 🟡 | ⏳ | **`workspace.base_dir` Settings Registry key** — `jobs/workspace.py`'de hardcoded, "future Settings Registry keys" notu var | `contracts/workspace.py:39`'da açıkça belirtilmiş | `KNOWN_SETTINGS` entry + resolver wiring | `backend/app/contracts/workspace.py:39`, `backend/app/jobs/workspace.py:28` |
| S-4 | 🟡 | ⏳ | **`contracts/provider_trace.py` future Settings keys** — cost tracking vs | Future placeholder olarak işaretlenmiş | Provider Registry + analytics pipeline | `backend/app/contracts/provider_trace.py:94` |

---

## 7. Prompt Assembly Engine (v2 Kapsam)

| # | Öncelik | Durum | Konu | Neden Ertelendi | Önkoşul | Kaynak |
|---|---|---|---|---|---|---|
| E-1 | 🟡 | ⏳ | **Çoklu condition expression** — AND/OR zinciri PAE v1'de yok | v2 scope | Block dependency graph tasarımı | `docs/superpowers/specs/2026-04-07-prompt-assembly-engine-design.md:1034` |
| E-2 | ⚪ | ⏳ | **A/B prompt testi** | v2 scope | Experiment tracking + metrics | Aynı dosya:1035 |
| E-3 | ⚪ | ⏳ | **Cost prediction** — token/maliyet tahmini yok | v2 scope | Provider cost table | Aynı dosya:1038 |
| E-4 | ⚪ | ⏳ | **Auto block suggestion (AI-assisted)** | v2 scope | LLM + block schema | Aynı dosya:1039 |

---

## 8. Test / QA Borçları

| # | Öncelik | Durum | Konu | Neden Ertelendi | Önkoşul | Kaynak |
|---|---|---|---|---|---|---|
| T-1 | 🟠 | ⏳ | **22 smoke test güncellenmeli** — pre-existing failure listesi (MEMORY) | Dalga yan etkisi | Smoke test sabitlerini yeni endpoint/bileşenlere uyarla | `memory/project_preexisting_test_failures.md` |
| T-2 | 🟡 | ⏳ | **W-01 AsyncMock pattern** — `test_m2_c6_dispatcher_integration` mock uyarısı | M8 Hardening'e bırakıldı | pytest-asyncio güncelleme | `docs/tracking/CHANGELOG.md:449` |
| T-3 | 🟡 | ⏳ | **W-02/W-03 aiosqlite bağlantı uyarıları** | M8 Hardening'e bırakıldı | aiosqlite connection teardown fix | `docs/tracking/CHANGELOG.md:463` |
| T-4 | 🟡 | ⏳ | **E2E Playwright testleri** — publish flow, wizard akışı | Gate 4 kapanışında ertelendi | Playwright kurulumu + CI entegrasyonu | `docs/gate4-publish-closure.md:157` |
| T-5 | ⚪ | ⏳ | **Backend geniş pytest tam green gate** — şu an 2547/2547 yeşil ama bazı uyarılar var | MVP hardening fazına ertelendi | Uyarıların temizlenmesi | `docs/redesign/AUDIT_MERGE_READY.md:75` |

---

## 9. Kalıcı Red (Kapsam Dışı — Yapılmayacak)

| # | Konu | Sebep |
|---|---|---|
| X-1 | Multi-tenant mimari / workspace switcher | CLAUDE.md: "Do not optimize for SaaS/multi-tenant" |
| X-2 | Billing / licensing / organization management | CLAUDE.md: "Do not add early" |
| X-3 | External broker / heavy cloud dependencies | CLAUDE.md: "Do not add early" |
| X-4 | Mobil native app | CLAUDE.md: "local-first" — uzun vadeli vizyon |
| X-5 | "Refactor later" shortcuts | CLAUDE.md: "Do not use 'we will refactor later' shortcuts" |
| X-6 | OpusClip-tarzı URL-in clip modülü (P7) | Post-R6 ayrı modül dalgasına alındı |

---

## Değişiklik Kaydı

| Tarih | Kim | Ne Eklendi / Değiştirildi |
|---|---|---|
| 2026-04-18 | Claude | Dosya oluşturuldu — tüm `docs/` + `backend/app/` + `frontend/src/` taramasından derlendi |
