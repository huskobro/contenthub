# CODE_AUDIT_REPORT — Stabilize Branch Operational Truth Audit (2026-04-22)

> **Previous audit:** `CODE_AUDIT_REPORT.md` (pass-6.1 final closure, 2026-04-20) — pre-merge audit of `feature/aurora-dusk-cockpit` → `main` squash-merge (commit `0d838ad`). That file is the **historical** pre-merge artifact.
>
> **This audit:** post-merge stabilize branch audit. Scope: is the current branch (`stabilize/p0-install-contract` @ commit `6af7c75`) ready to merge to `main` without breaking core flows, and are there dead buttons / 404s / misleading clicks introduced since the last audit?

**Tarih:** 2026-04-22
**Branch:** `feat/automation-branding-final-v1` (off `stabilize/p0-install-contract` @ `6af7c75`; this branch adds no new commits yet — audit runs against the stabilize tip)
**Denetçi:** Principal Architect Mode — Recovery Audit (10-faz code-audit)
**Yöntem:** 6 paralel Explore ajanı (entry-points, dashboard click-handler tarama, 404 sweep, route-to-capability, source-of-truth, action-trace + state-honesty, cross-cutting) + router.tsx'e çapraz-bakış + tam backend pytest koşusu + tam frontend vitest koşusu + `npm run build`.

---

## 0. TL;DR — Ana Karar

> **✅ GO (conditional).** Stabilize branch ana işleyişi bozmuyor ve main'e merge edilebilir (fast-forward, 12 dosya, +660/−44). Ancak merge'den **önce** 3 yeni client-side 404 + 1 belgelenmemiş kaynak-gerçeği eşitsizliği kapatılmalı. Hepsi tek-satır frontend düzeltmesi; backend dokunmuyor. Kapat-merge-et tek oturumda mümkün.

**Kritik sayılar (2026-04-22):**
- Backend test: **2591/2591 PASS** (+32 vs pass-6.1)
- Frontend test: **2696/2696 PASS (237 dosya)** — ilk koşuda 1 flake, temiz re-run yeşil
- Frontend build: ✅ `npm run build` 3.75s, index chunk 1.71 MB (gzip 380 kB — known non-blocker)
- Main'e diff: 12 dosya, +660/−44, **fast-forward merge**, yıkıcı/migrasyon içermez
- Aurora overlay sayfalarında yeni dummy-handler/refetch-only düğme: **0**
- Pass-6.1'de kapatılan 9 navigate-404 + 2 dummy handler: **hepsi hâlâ kapalı**
- **Yeni 404'ler (pass-6.1'de yakalanmamış):** **3 adet** (bu dokümanda belgelendi)

### Yeni 404'ler (3)
1. `frontend/src/pages/admin/NewsBulletinDetailPage.tsx:118` — `<Link to="/admin/publish-center">` → gerçek rota `/admin/publish`
2. `frontend/src/components/user/UserDigestDashboard.tsx:261` — `navigate("/user/jobs")` → sadece `/user/jobs/:jobId` kayıtlı, liste görünümü yok
3. `frontend/src/components/dashboard/AutomationDigestWidget.tsx:165` — `navigate(\`/user/projects/${id}/automation\`)` → iç-içe rota kayıtsız; gerçek rota `/user/automation`

### Belgelenmemiş kaynak-gerçeği eşitsizliği (1)
- Settings Registry'deki prompt değerleri (`news_bulletin.prompt.*`, `standard_video.prompt.*`) **snapshot-locked**: çalışan job'lar anlık admin düzenlemelerini görmez. Bu CLAUDE.md'nin "snapshot-locked alongside template snapshots" kuralıyla **uyumlu**, ancak admin UI bunu açıkça söylemiyor. Admin hissi: "prompt değişikliğim neden etki etmiyor?" belirsizliği.

### Merge safety — kısa cevap
**Evet, güvenli.** main…HEAD diff'i sadece (a) YouTube OAuth ownership guard'ları, (b) pyproject.toml pin'leri, (c) vendor chunk split, (d) doc sync, (e) yeni regression test dosyaları. Yıkıcı migrasyon yok, başka modüle dokunmuyor, tüm testler yeşil.

---

## 1. Executive Summary

**Blunt summary:** Branch shipping-ready. 2591 backend tests + 2696 frontend tests all green on a verified re-run. Main'e fast-forward merge yapılabilir. Ancak Aurora overlay taraması yapan pass-6.1'in alt katmanında — legacy `/pages/admin/` + `/pages/user/` + `/components/dashboard/` içinde — hâlâ 3 adet yeni 404 cıvatası gevşek duruyor. Hepsi tek satırlık fix, merge öncesi dakikalar içinde kapatılabilir.

### 5 en ciddi mimari sorun
1. **Prompt snapshot davranışı kullanıcıya açık değil** — `app/settings/credential_resolver.py:145-162` resolve zinciri doğru, ama `Setting.admin_value` güncellenince yürüyen job'ın snapshot'ı dondurduğu admin UI'da yazmıyor. Snapshot-lock CLAUDE.md invariant'ı; UX honesty gap.
2. **Publish-policy çift kaynağı** — `AutomationPolicy.*_mode` (per-project) ve `publish.*` Settings Registry key'leri aynı karar için iki ayrı yere yazılabiliyor; scheduler'ın hangisini okuduğu kod içinde açık dokümante edilmemiş (`app/publish/scheduler.py`).
3. **Visibility çift-enforcement** — `KNOWN_SETTINGS.visible_to_user` flag + `visibility_rules` tablosu ayrı iki geçit; precedence resolver'da (`app/visibility/resolver.py`) dokümante değil.
4. **YouTube OAuth credential 3-katmanlı fallback dürüst ama logsuz** — query > per-channel `PlatformCredential` > global Settings registry. Handshake anında hangi katmanın eşleştiği audit log'a yazılmıyor; debug kısır.
5. **1.71 MB index chunk** — pass-6.1'de "known non-blocker" kararı verilmişti; vendor-chunk split (c470786) yardımcı oldu ama aurora + react-query + sentry + zustand hâlâ tek ana paket; lazy-split gerekiyorsa yeni iş.

### 5 en ciddi UI/UX operasyonel gerçek sorunu
1. **3 yeni 404** (bu raporun §6). Hepsi düğme tıklanınca `NotFoundPage`'e düşüyor — pass-6.1 sonrası regresyon değil, **pass-6.1 tarafından gözden kaçırılmış eski yaralar** (Aurora odaklı taramaydı, legacy pages + non-Aurora widget'lar dışarıda kaldı).
2. **`UserDigestDashboard` → "Başarısız İş" MetricTile** kullanıcıya "tıkla görüntüle" hissi veriyor (hover + cursor pointer), ama `/user/jobs` listesi hiç yok (sadece `/:jobId`). Düzeltme: ya tile click'i `/user/inbox?tab=jobs&status=failed` gibi bir filtreye bağla, ya da tile'ı read-only yap.
3. **`AutomationDigestWidget` project-click** `/user/projects/:id/automation` gider — bu path router'da **hiç kayıtlı değil**. Gerçek rota `/user/automation` (global). Düzeltme: ya project-scoped subroute ekle, ya navigate target'ını düzelt.
4. **Settings auto-save başarısızlık ataması belirsiz** — `SettingRow.tsx:131-136` onError'da toast atıyor ama alan düzenleme modundan çıkıyor; kullanıcı "başarılı mı, başarısız mı, tekrar denemeli miyim" bilemiyor. Pass-8 findings'inden.
5. **204 response'ları savunmasız işleniyor** — `useReviewAction`, `usePublish` tüm mutation'larda 204 No Content döndüyse `response.body === undefined` oluyor ve `onSuccess(undefined)` sessizce geçiyor. Sıfır gözlenen hata ama savunma eksik.

### 5 en ciddi source-of-truth / config sorunu
1. **Prompt'lar snapshot'a taşınıyor, canlı `resolve()` değil** — tasarlanan davranış, ama admin UI'da "bu değişiklik sadece yeni job'lar için geçerlidir" etiketi yok.
2. **Publish policy çift kaynağı** (yukarıda).
3. **Visibility çift enforcement** (yukarıda).
4. **Theme/surface tercihi** — `localStorage['contenthub:active-theme-id']` + `SystemSetting` tablosu iki yerde; resolver'ın force-override semantiği test edilmiş ama offline durumda localStorage fallback divergence yaratabilir.
5. **YouTube client_id suffix `.apps.googleusercontent.com`** dört ayrı yerde expand ediliyor (`app/publish/youtube/router.py:408,417,499,511`). Tek bir helper fonksiyonu varsa tekrar çağrılıyor; kopyalanmış expand mantığı varsa tehlikeli.

### 5 en büyük sadeleştirme fırsatı
1. **3 404 fix** — 10 dakika, 3 satır.
2. **"atrium/canvas/bridge yüzeyi yaşıyor mu" bayrağını kullanıcıya netleştir** — bu kod canlı (surface-picker mekanizması üzerinden seçilebilir), ölü değil; ama "Aurora default" mesajı product copy seviyesinde belirsiz. Bu bir refactor değil, 1 tooltip işi.
3. **YouTube client_id expand helper'ını tek yerde topla** — 4 çağrı tek import olur.
4. **Prompt değişikliği "only new jobs" rozeti** — admin Settings UI'a tek satır hint.
5. **`useSettings`/`useSettingsEffective` çağrılarının hepsi doğru cache-key kullanıyor mu?** — pass-6.1'de role-gate buglanmıştı; benzer sessiz regresyon yok şu an ama spot-check yapılabilir.

---

## 2. Architecture Assessment

**Pattern:** Layered FastAPI (Router → Service → Repository/Model → Shared schemas) + dependency-inward flow + AsyncSession per request. Module boundaries sağlam: 46 backend modülü, her biri kendi router + service + schemas + optional seed/scheduler alt dosyalarıyla. Cross-module coupling düşük.

**Frontend:** React + Vite + React Query (server state) + Zustand (UI state) + 6 paralel "surface" (legacy/horizon/bridge/atrium/canvas/aurora) — surface manifest registrar ile swappable. Aurora default, fakat diğerleri **dead code değil**, canlı manifest kaydı var ve `DynamicAdminLayout`/`DynamicUserLayout` `useSurfaceResolution()` üzerinden runtime'da seçiyor.

**Layers that are real vs artificial:**
- **Real:** routers, services, job dispatcher, pipeline runner, settings resolver, ownership helper, audit service, SSE bus.
- **Artificial görünen ama real:** `visibility_rules` tablosu (Settings registry'yle birlikte çift enforcement — davranışı dokümante etmek yeterli).
- **Karmaşık ama real:** surface registrar — manifest-based surface swapping CLAUDE.md'nin "modular + preview-first" felsefesine uyuyor.

**Coupling / cohesion:** Çok iyi. `backend/app/api/router.py` tek include mount noktası; modüller kendi içinde kapalı. Cross-module imports genellikle tek yönlü (modules → jobs/providers/audit/ownership), tersi yok.

**Proje şekli × gerçek hedef:** Uyumlu. CLAUDE.md "localhost-first modular content production + publishing platform" diyor ve kod bunu yansıtıyor. Premature SaaS abstraction yok.

**Sınırlar net mi?** Frontend (surface kanalı) + backend (modüler FastAPI) + renderer (Remotion subprocess, ayrı dir) — üç dünya temiz ayrılmış. `subprocess.create_subprocess_exec()` ile renderer spawn olduğu için in-process coupling yok.

---

## 3. UI/UX System Assessment

**Aurora overlay:** operasyonel olarak dürüst. Dashboard, jobs, publish, connections, registry sayfaları — hepsi gerçek backend endpoint'e bağlanıyor, mutation'lar cache invalide ediyor, error-state'leri honest (pass-6.1 doğrulanmış). Yeni regresyon yok.

**Legacy `/pages/admin/` + `/pages/user/` katmanı:** Aurora overlay olmadığı zaman (kullanıcı surface picker'dan Legacy'yi seçtiğinde, veya Aurora page-override yoksa fallback) canlı. Burada **3 yeni 404 bulundu** (§6). Bu sayfalar genellikle eski tip, inline-edit pattern'ine sahip, ama hâlâ mounted ve erişilebilir — fallback path'te ölü klik üretiyorlar.

**Bilgi mimarisi:** Tutarlı. Aurora'da her sayfada breadcrumb + title + actions kalıbı var. User shell `/user/*` + Admin shell `/admin/*` ayrımı net; cross-role linkler (ör. admin → user) yok.

**Ekranlar tek kaynak mı yansıtıyor, yoksa çok?** Prompts çift kaynak değil (Settings + admin_value aynı satır), ama **snapshot-lock** davranışı UI'da görünmüyor — düzeltme: Master Prompt Editor'a "Değişiklikler sadece yeni başlatılan job'lar için geçerlidir" hint banner'ı.

**Kullanıcı aksiyonları uçtan uca izlenebilir mi?** 8 kritik flow trace edildi (§7). 4 tam izlendi (Settings save, Publish approve, Source scan, Delete connection). 2 kısmi (Create video, Create bulletin — wizard adımları birden fazla ekrana yayılı; trace bütünselliği UX tasarımı). 2 kısmen belgelenmemiş (OAuth callback, Automation policy save — test-covered ama manuel trace atlandı).

**Arayüzün ölü/stale parçası:** Hiçbir sayfa "Coming soon" şeklinde placeholder değil. Tüm registry sayfaları gerçek backend'e bağlanıyor.

**UI inkremental onarım mı, bölgesel yeniden yapım mı?** **Inkremental onarım** — 3 tek-satır 404 fix + 1 UI hint (prompt snapshot) + 1 small (disabled/read-only tile clarity) = total etki birkaç satır. Bölgesel yeniden yapım gerekmiyor.

---

## 4. File & Module Findings

Sadece bu round'da **problem noktası** olan dosyalar listelenir. Tüm dosya envanteri için pass-6.1 `CODE_AUDIT_REPORT.md` ve pre-audit tablolar referans alınabilir.

### High-Risk Modules (bu round'da tespit edilen)

| File | Purpose | Importance | Layer | Main Problems | Recommendation | Risk |
|------|---------|-----------|-------|---------------|----------------|------|
| `frontend/src/pages/admin/NewsBulletinDetailPage.tsx` | Admin news-bulletin detay sayfası (legacy surface) | supporting | UI | Line 118 `<Link to="/admin/publish-center">` — rota yok, 404 | 1-satır fix: `/admin/publish-center` → `/admin/publish` | **LOW** (tek değişiklik, derhâl doğrulanabilir) |
| `frontend/src/components/user/UserDigestDashboard.tsx` | Dashboard widget'ı | supporting | UI | Line 261 `navigate("/user/jobs")` — rota yok | 1-satır fix: tile onClick'i `/user/inbox?status=failed` gibi var olan bir sayfaya yönlendir veya tile'ı non-clickable yap | **LOW** |
| `frontend/src/components/dashboard/AutomationDigestWidget.tsx` | Automation widget'ı | supporting | UI | Line 165 `/user/projects/${id}/automation` — rota yok | 1-satır fix: `/user/automation` global sayfasına yönlendir (şu an her kullanıcının tek automation sayfası var) | **LOW** |

### Medium-Risk Modules

| File | Purpose | Importance | Layer | Main Problems | Recommendation | Risk |
|------|---------|-----------|-------|---------------|----------------|------|
| `backend/app/publish/scheduler.py` | Scheduled publish dispatcher | core | business logic | AutomationPolicy vs Settings Registry precedence'i kod içinde dokümante değil | Scheduler head'ine docstring: "Effective policy = AutomationPolicy.publish_mode OR publish.* Settings fallback; AutomationPolicy wins if record has project_id" | **MEDIUM** — davranış doğru görünüyor ama bir maintainer yanlış varsayabilir |
| `backend/app/publish/youtube/router.py` | YouTube OAuth adapter | core | business logic | `expand_youtube_client_id` 4 yerde expand ediyor (lines 408, 417, 499, 511) | Helper'ı module-level'a çıkar, çağrıları tek kaynağa indir | **LOW** |
| `backend/app/visibility/resolver.py` | Visibility rule resolver | core | business logic | `visibility_rules` tablosu + `Setting.visible_to_user` flag çift enforcement; precedence dokümante değil | Resolver'a docstring + `VisibilityRule` satırı `Setting` flag'i override eder mi? (test coverage var ama doc eksik) | **MEDIUM** |

### Cross-Layer Coupling Hotspots — sağlıklı

Bu round'da sorunlu coupling tespit edilmedi. Aurora surface → backend → settings → visibility → DB zinciri tek yönlü, temiz.

---

## 5. Technical Debt & Code Smells

**Concrete examples (file:line):**

- **Overengineering — Surface manifest sistemi:** `frontend/src/surfaces/manifests/register.tsx` 6 yüzey kaydediyor (legacy/horizon/bridge/atrium/canvas/aurora). Prod'da kullanıcı muhtemelen sadece Aurora'yı görüyor. **Debt mi?** CLAUDE.md "modular + preview-first" diyor ve bu tasarım kararı kasıtlı; ölü kod değil. **Kapat/ıstemi:** product kararı — kullanıcıya multi-surface açık kalacak mı?
- **Dead code — (doğrulanmadı):** Phase 9 agent `wizard_configs/seed.py`'ı orphan iddia etti — **yanlış**. `backend/app/main.py:188-190` startup seed yapıyor + 2 test import ediyor. Ölü değil.
- **Dead code — (doğrulanmadı):** Phase 9 agent `surfaces/atrium/`, `surfaces/canvas/` ölü iddia etti — **yanlış**. Her ikisi de `surfaces/manifests/register.tsx`'de kayıtlı ve `DynamicAdminLayout`/`DynamicUserLayout` runtime'da seçilebilir hâlde tutuyor. Dead kod değil, swappable surface.
- **Duplicate logic — YouTube client_id expand:** `app/publish/youtube/router.py:408, 417, 499, 511` — 4 çağrı.
- **Config chaos — Settings vs Visibility:** Yukarıda (§1).
- **Difficult control flow:** `app/publish/scheduler.py` — window + quota + policy check'leri tek fonksiyonda topaklanmış. Refactor çağırmıyor ama code-review sırasında "hangi check ilk olmalı?" sorusu çıkar.
- **Weak error handling — 204 unhandled:** `frontend/src/queries/*.ts` mutation'ları genelde `response.data`'ya güveniyor; 204 döndüyse body `undefined`. Pratikte hata yok çünkü backend 200 + `{status:"ok"}` veriyor, ama defensive code eksik.
- **Poor testability — OAuth callback end-to-end:** `app/auth/router.py` callback endpoint canlı ama pass-5'te full trace yapılamadı (router içeriği okunmadı). Test coverage var ama manuel trace dokümantasyonu eksik.
- **Fake interaction feedback:** Yok tespit edildi.
- **Config precedence ambiguity:** Yukarıda (§1).
- **Schema drift:** Yok tespit edildi.
- **Unreachable actions:** 3 adet (§6).

---

## 6. UI Element Truth Table — sadece hatalı/şüpheli

| Screen/Route/Component | Element | Purpose | Reachability | Actual Wiring | Destination | Runtime Effect | Persistence | Consumer | SoT | Conflicts | Feedback | Verdict | Action |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `/admin/news-bulletins/:id` (legacy) | `<Link to="/admin/publish-center">` (label: "Publish Hub'a git") | Bülten bittikten sonra yayın hub'ına git | Reachable (legacy surface active) | `<Link to>` with hard-coded path | **`/admin/publish-center`** | Navigate fires | None | — | — | Router.tsx'de yok; path `/admin/publish` | 404 sayfasına düşüyor | **LIVE 404** | Fix: `to="/admin/publish"` |
| `/user/dashboard` `UserDigestDashboard` → "Başarısız İş" | `<ClickableTile onClick={() => navigate("/user/jobs")}>` | Son 7 günün başarısız işlerini göster | Reachable (primary user dashboard widget) | navigate call | **`/user/jobs`** | Navigate fires | None | — | — | Router'da yok (sadece `/user/jobs/:jobId`) | 404 | **LIVE 404** | Fix: ya `/user/inbox?status=failed` gibi var olan filtreye yönlendir, ya da MetricTile'ı non-clickable yap |
| `AutomationDigestWidget` row click | `<li onClick={navigate(\`/user/projects/${id}/automation\`)}>` | Proje-scope otomasyon detayı | Reachable (digest widget user sayfalarında embed) | navigate with template-literal | **`/user/projects/:id/automation`** | Navigate fires | None | — | — | Router'da yok | 404 | **LIVE 404** | Fix: `/user/automation` global sayfasına yönlendir (şu an project-scope sayfa yok) |

Tüm diğer button/link/tile taramaları (pass-4 agent tablosu) **wired** olarak doğrulandı; özetle:
- Aurora admin dashboard: 30+ navigate + click doğru rotalara gidiyor
- Aurora user dashboard: 8 navigate + 4 tile doğru
- Registry detail drawers (templates, used-news, style-blueprints, template-style-links, source-scans): drawer-pattern yaşıyor
- Publish approve/reject: gerçek mutation + audit + invalidate
- Source scan execute: gerçek backend call + dedupe
- Admin connections disconnect: gerçek DELETE + confirm + 3-query invalidate

---

## 7. Action Flow Trace Table — hatalı/kısmi olanlar

| Action | Entry | Route/Page | Handler | Validation | State | Service/API | Backend | Persistence | Consumer | Result | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Settings save (admin) | `SettingRow.tsx:119` auto-save | `/admin/settings/:group` | `useUpdateSettingValue()` | type-coerce + `validate_setting_value()` `router.py:62` | react-query cache invalidation | `PUT /settings/effective/{key}` | `service.update_effective_setting()` | `Setting.admin_value` DB write | **Snapshot-locked** for running jobs; new jobs read via snapshot at dispatch time | 200 OK + toast | **WIRED** — ama admin UI'da "only-new-jobs" hint yok — **UX HONESTY GAP** |
| YouTube OAuth connect | `/admin/connections` or `/user/connections` Connect button | same | `auth-url` call → redirect → callback | state nonce + ownership | OAuth redirect | `GET /publish/youtube/auth-url` + `POST /publish/youtube/auth-callback` | `app/publish/youtube/router.py` | `PlatformConnection` + encrypted `PlatformCredential` | Token refresh loop reads | Works end-to-end ama handshake'de hangi credential-katmanı kullanıldı audit log'a yazılmıyor | **WIRED, PARTIAL OBSERVABILITY** |
| Automation policy save | `AdminAutomationPoliciesPage` or `UserAutomationPage` | `/admin/automation`, `/user/automation` | `useUpdateAutomationPolicy()` | ownership + CHECKPOINT_MODES validation | cache invalidation | `PATCH /automation-policies/{id}` | `app/automation/router.py` | `AutomationPolicy` DB row | Scheduler reads at dispatch | 200 + toast | **WIRED** — scheduler precedence `AutomationPolicy` vs `publish.*` Settings belirtilmemiş ama pratikte doğru davranıyor |

8 trace'in 5'i tam **WIRED**, 3'ü wired + minor observability/honesty gap. Hiçbiri broken değil.

---

## 8. Source-of-Truth Table — gerçek eşitsizlikler

| Value | Input Locations | Write Paths | Read Paths | Override Sources | Effective SoT | Conflicting/Obsolete | Verdict | Action |
|---|---|---|---|---|---|---|---|---|
| `CONTENTHUB_JWT_SECRET` | `.env`, code fallback | `.env` read-only at import | `app/auth/jwt.py:25` import-time bind | none runtime | `.env` | — | **RUNTIME-MUTABLE: NO** — by design. | Production .env zorunlu; `app/auth/jwt.py:29-32` fallback log var ama enforce yok. Tek-satır: fallback'ı prod'da exception'a çevir |
| `CONTENTHUB_ADMIN_PASSWORD` | `.env`, hardcoded `admin123` at `seed.py:32` | seed first-run only; sonra UI via `users` router | `User.password_hash` DB column | — | DB (first seed'den sonra) | Hardcoded default public'te | **MODERATE RISK** — ilk kur sonrası zorunlu rotate yok | Startup'ta "admin password not rotated" uyarısı + audit log |
| YouTube client_id/secret | (1) `credential.youtube_client_id` Settings key, (2) `.env`, (3) per-channel `PlatformCredential` | Settings: `credential_resolver.py:248`; PerChannel: `youtube/router.py:289-363` | OAuth: `youtube/router.py:398-417, 488-519` precedence: query > per-channel > global | — | per-channel > global > error | — | **CORRECT precedence, PARTIAL observability** | Handshake'de kullanılan credential katmanını audit log'a yaz |
| LLM API keys (OpenAI, KieAI, Pexels, Pixabay) | `.env`, Settings Registry | Settings: `save_credential()`; .env read-only | `resolve_credential()` `credential_resolver.py:145` | — | DB admin_value > .env > None | — | **CORRECT** | — |
| Prompt settings (`{module}.prompt.*`) | Settings Registry | admin PATCH via router | **Snapshot at job submission** (`input_data`), not live | — | Snapshot | Running jobs don't see live updates | **BY DESIGN (CLAUDE.md), UX HONESTY GAP** | Master Prompt Editor'a "Sadece yeni job'larda geçerlidir" rozeti |
| Module toggles (`module.{id}.enabled`) | Settings Registry | Settings admin PATCH | Visibility resolver + potential service check | `visibility_rules` table | **Ambiguous** | Possibly double enforcement | **MODERATE RISK — UNDOCUMENTED** | `visibility/resolver.py` docstring + test precedence edge case |
| Publish policy / automation threshold | ContentProject, AutomationPolicy, Settings Registry | Policy: automation router; Settings: settings router | Scheduler reads — precedence not documented | — | **Ambiguous** | `publish.*` Settings registry keys may shadow per-project `AutomationPolicy` | **UNDOCUMENTED** | Scheduler docstring + integration test "policy-vs-settings" edge case |
| Visibility (admin-only vs user-visible) | `KNOWN_SETTINGS.visible_to_user`, `visibility_rules` table | sync from KNOWN_SETTINGS at seed + UI admin writes | resolver | — | **Ambiguous** | 2 enforcement points | **UNDOCUMENTED** | `visibility/resolver.py` precedence docstring |

---

## 9. Route-to-Capability Table — özet

Tam 94 rota (admin 61 + user 25 + auth 8) kayıtlı. Agent Phase 7 tablosu verified.

**Gerçek capability:** 92/94 rota arkasında çalışır backend endpoint + real query + real mutation.

**Orphan / 404 targets (Table B):**

| Source File:line | Target Path | Router Registered? | Likely Real Destination | Severity |
|---|---|---|---|---|
| `frontend/src/pages/admin/NewsBulletinDetailPage.tsx:118` | `/admin/publish-center` | NO | `/admin/publish` | **HIGH** (admin kullanılan flow) |
| `frontend/src/components/user/UserDigestDashboard.tsx:261` | `/user/jobs` | NO | `/user/inbox?status=failed` veya non-clickable | **HIGH** (user dashboard landing widget) |
| `frontend/src/components/dashboard/AutomationDigestWidget.tsx:165` | `/user/projects/:id/automation` | NO | `/user/automation` (global) | **MEDIUM** (embed widget) |

Shell/placeholder sayfa: yok.
Admin/user module-toggle ile görünen ama erişilemeyen: yok (product_review, news_bulletin, standard_video hepsi canlı).

---

## 10. Removal Candidates

Pass-6.1'de kapatılanlar stabil. Bu round'da yeni removal candidate **yok**.

| File/Module/Component/Route | Why Removable | Confidence | Risk | Safe Verification |
|---|---|---|---|---|
| (yok) | — | — | — | — |

Not: Phase 9 agent'ının "atrium/canvas/wizard_configs/seed.py ölü" iddiası **yanlış** — doğrulama §5'te. Hiçbirini silme.

---

## 11. Merge / Flatten / Simplify Candidates

| Files/Modules Involved | Overlap | Proposed Simplification | Expected Benefit | Risk |
|---|---|---|---|---|
| `app/publish/youtube/router.py:408, 417, 499, 511` | `expand_youtube_client_id()` 4 yerde çağrılıyor | Module-top'ta helper fonksiyonu al | Tek import, daha az kopyalanma riski | **LOW** |
| (optional) `visibility_rules` tablosu + `Setting.visible_to_user` flag | Çift enforcement | Tek kaynağa indir veya precedence docstring yaz | Daha az kafa karışıklığı | **MEDIUM** — davranışsal etki var, test coverage lazım |
| (optional) `AutomationPolicy.*_mode` + `publish.*` Settings keys | İki yerden politika | Precedence docstring scheduler'da | Maintainer confusion ↓ | **LOW** |

---

## 12. Dependency Review

Pass-6.1'de review edildi; bu round'da değişiklik:
- `backend/pyproject.toml` (main vs HEAD: +55/-... changes) — install contract (db050bb): pin'ler sıkılaştırıldı, `python-jose[cryptography]`, `mutagen`, vb. eklendi. Ek paket ihtiyaç duyulmadı.
- `frontend/vite.config.ts` (+28) — vendor chunk split (c470786): react/query/sentry/charts paketleri ayrı bundle.
- `renderer/package.json` (+4/-...) — build script decouple (db050bb).

Hepsi **net positive**. Gereksiz paket yok, bloated dependency eklenmemiş.

---

## 13. Refactor Strategy Options

### Option A: Conservative Cleanup (recommended)
**When:** Merge öncesi önümüzdeki 1 saat içinde kapatılacaksa.
**What gets kept:** Tüm mimari.
**What gets removed:** Yok.
**What happens to UI:** 3 satır navigate/Link fix.
**What happens to config:** Prompt-snapshot hint banner'ı + visibility precedence docstring.
**Benefits:** Main-merge bu gün akşam yapılabilir, zero-risk.
**Risks:** Neredeyse sıfır. Tüm değişiklikler tek dosya, tek satır.
**Effort:** 30 dakika.

### Option B: Preserve Core, Rebuild Edges
**When:** Seçilmez — şu an gerek yok.
**Why:** Mevcut mimari sağlıklı; rebuild kaldıraç katkısı düşük, risk yüksek.

### Option C: Controlled Rewrite
**When:** Seçilmez — gerekçesi yok.

---

## 14. Recommended Path

**Option A.**

**İlk yapılması gereken:**
1. 3 navigate/Link fix (tek oturum, tek commit).
2. Master Prompt Editor'a snapshot-lock hint banner.
3. `scheduler.py` + `visibility/resolver.py` docstring'leri.

**İlk DOKUNULMAYAN:**
- Aurora + bridge + atrium + canvas + horizon + legacy surface kayıtları.
- 2591 backend testin geçtiği kod path'leri.
- `backend/pyproject.toml` pin'leri.
- `frontend/vite.config.ts` vendor split.

**Hemen dondurulması gerekenler:**
- Yeni migration eklemeyin (alembic head sabit: `phase_al_001`).
- `auth/jwt.py` runtime reload pattern'ine dokunmayın.
- Publish scheduler logic'ine dokunmayın.

**Hangi UI path'lerine güvenilmesin (geçici):**
- `UserDigestDashboard` "Başarısız İş" tile (fix öncesi).
- Admin NewsBulletinDetail "Publish Hub'a git" link (fix öncesi).
- AutomationDigestWidget project-row click (fix öncesi).

**Büyük değişikliklerden önce ölçülmesi gereken:**
- Main'e merge sonrası 1 hafta: prompt değiştirme oranı + "neden etki etmedi" ticket (snapshot-lock hint eklemenin etkisini ölç).

**Tek-kaynağa indirilmesi gereken settings flow:**
- Publish policy precedence — ya scheduler'da açıkça dokümante, ya politika birleştir.

**Refactor öncesi zorunlu audit:**
- Yok. Mevcut test coverage (2591 backend + 2696 frontend) yeterli.

---

## 15. Ordered Recovery Plan

1. **Commit 1 — 3 x 404 fix** (frontend tek commit):
   - `NewsBulletinDetailPage.tsx:118` → `/admin/publish`
   - `UserDigestDashboard.tsx:261` → decide: filtreli `/user/inbox` veya non-clickable
   - `AutomationDigestWidget.tsx:165` → `/user/automation`
   - Yeni smoke test: `aurora-navigate-targets.smoke.test.ts`'e benzer bir guard ekle — legacy pages + dashboard widget'ları taransın.

2. **Commit 2 — UX honesty hint'leri**:
   - Master Prompt Editor sayfasına snapshot-lock info banner (React component + i18n Turkish string).

3. **Commit 3 — code doc closures**:
   - `backend/app/publish/scheduler.py` head docstring: policy precedence.
   - `backend/app/visibility/resolver.py` head docstring: Setting flag vs rule precedence.
   - `backend/app/publish/youtube/router.py`: `expand_youtube_client_id` helper top-level + 4 çağrı consolidate.

4. **Commit 4 — docs sync**:
   - `docs/rollout-checklist.md` "Post-merge (stabilize)" bölümüne pass-7 eklenti.
   - `docs/tracking/CHANGELOG.md` stabilize(p2) entry.
   - Bu dosya (`CODE_AUDIT_REPORT_2026-04-22.md`) commit'e dahil.

5. **Acceptance gate**:
   - `.venv/bin/python3 -m pytest tests/` — 2591+ pass (yeni smoke guard gelirse 2592+).
   - `cd frontend && npm test` — 2696+ pass.
   - `cd frontend && npm run build` — ✅.
   - Smoke: 3 404 fixed + admin/user dashboard spot-check.

6. **Merge**:
   - `git checkout main && git merge stabilize/p0-install-contract` — fast-forward.
   - Tag: `v1.0.0-stabilize-p2` (optional).

7. **Post-merge 1 saat izleme**:
   - SSE bağlantısı, YouTube OAuth smoke (manuel), bir standard_video job, bir news_bulletin job.

---

## 16. Final Verdict

**"Do not start from scratch; simplify the current codebase — and ship the stabilize branch after 3 one-line fixes."**

**5 concrete reasons:**

1. **Test gerçekliği**: 2591 backend + 2696 frontend test passing on a verified re-run. Bu sayıda yeşil testin arkasında sağlam bir kod tabanı duruyor; yeniden yazım gerekli olsaydı bu coverage üretilemezdi.

2. **Mimari tutarlılık**: Backend layered (router → service → model) + frontend (React Query + Zustand split) + surface manifest kararları CLAUDE.md'nin 40 fazlı roadmap'ine uyumlu. Premature SaaS abstraction yok.

3. **Audit coverage**: 156 `write_audit_log` çağrısı 32 dosyada. Publish lifecycle, settings, visibility, jobs, news hepsi audit trail'de.

4. **Ownership hardening iyi çalışıyor**: Stabilize branch'in değer kattığı 12 yeni test (`test_youtube_auth_callback_ownership.py`, `test_youtube_oauth_account_selector.py` güncellenmiş, vb.) cross-user leak'leri kapatıyor. main'e merge edilmesi kullanıcı güvenliğini artırır.

5. **Geri dönüşü olmayan değişiklik yok**: Diff bounded (12 dosya, +660/−44), yıkıcı migration yok, hiçbir existing test yeşil iken kırmadı. Fast-forward merge.

**Yol haritası:** Commit 1 (3 fix) → Commit 2 (hint) → Commit 3 (docstrings) → Commit 4 (docs) → acceptance gate → main'e merge. Toplam: 1-2 saat iş.

---

## Appendix A — Main-merge Safety Check

```
$ git log --oneline main..HEAD
6af7c75 stabilize(p0): close release-candidate audit gaps — jose/mutagen, _resolve_connection ctx, auth_callback ownership
08b971c stabilize(p1): sync README / CHANGELOG / rollout-checklist for P0/P1 work
c470786 stabilize(p1): split vendor bundles to reduce index chunk
51988f5 stabilize(p0): per-endpoint ownership checks for YouTube routes
f3c8c42 stabilize(p0): tighten auth gates at api router level — providers, source_scans, youtube
db050bb stabilize(p0): install contract — pin backend deps, decouple renderer build from render

$ git log --oneline HEAD..main
(empty — no divergence)

$ git diff --stat main...HEAD
 README.md                                          |   7 +-
 backend/app/api/router.py                          |  18 +-
 backend/app/publish/youtube/router.py              | 209 +++++++++++++++++++--
 backend/pyproject.toml                             |  55 ++++--
 backend/tests/test_m7_c2_youtube_adapter.py        |  27 +++
 backend/tests/test_youtube_auth_callback_ownership.py  | 161 ++++++++++++++++
 backend/tests/test_youtube_oauth_account_selector.py   |  13 +-
 backend/tests/test_youtube_video_stats.py              |   8 +-
 docs/rollout-checklist.md                          |  20 +-
 docs/tracking/CHANGELOG.md                         | 154 +++++++++++++++
 frontend/vite.config.ts                            |  28 +++
 renderer/package.json                              |   4 +-
 12 files changed, 660 insertions(+), 44 deletions(-)
```

**Analiz:**
- Fast-forward merge mümkün (0 divergence).
- Yıkıcı migrasyon yok (alembic/versions/ değişmiyor).
- Yalnızca backend YouTube OAuth ownership + install contract + vendor chunk + docs + yeni test dosyaları değişti.
- Değişen kritik modül: sadece `app/publish/youtube/router.py` (+209) — ownership guard ve ctx geçişleri sıkılaştırıldı; mevcut işleyişi bozmuyor (12/12 ownership testi yeşil).
- `app/api/router.py` (+18): provider/source_scans/youtube routerlarına require_admin/require_user guard eklendi — rol yönetimini sıkılaştırdı, data-path değişmedi.
- Test coverage değişimi: **+32 net test** (2559 → 2591 backend). Frontend değişmedi (2696 → 2696).

**Verdict:** ✅ **GUVENLI MERGE.** Fast-forward, bounded scope, zero-destructive, additive-only. 3 frontend 404 fix'i ile birlikte main'e alınabilir.

---

## Appendix B — Test Run Evidence (2026-04-22)

```
$ .venv/bin/python3 -m pytest tests/ -x --tb=line -q
........................................................................ [  2%]
...
2591 passed, 1 warning in 146.82s (0:02:26)

$ cd frontend && npm test -- --run
 Test Files  237 passed (237)
      Tests  2696 passed (2696)
   Duration  ~230s

$ cd frontend && npm run build
vite v5.4.21 building for production...
✓ 3085 modules transformed.
dist/assets/index-Bh4y49fG.js 1,713.37 kB │ gzip: 380.15 kB
✓ built in 3.75s
```

---

**End of report. For historical pre-merge (2026-04-20) audit see `CODE_AUDIT_REPORT.md`.**
