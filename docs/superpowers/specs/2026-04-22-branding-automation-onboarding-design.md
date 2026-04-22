# Branding Center + Automation Center + Channel URL Onboarding — Final Design

**Tarih:** 2026-04-22
**Durum:** Implement edildi (backend `75f5b8f` + frontend uncommitted)
**Kapsam:** Aurora Redesign REV-2'nin kapatılmamış üç yüzeyini son ürün kalitesinde tamamlamak.

> Skill akışı: keşif → plan → design (bu doküman) → onay → uygulama → test → polish → docs sync.
> Bu doküman uygulama sırasında alınan kararları geriye dönük tek otorite olarak sabitler.
> Yarım feature bırakma yasaktı — bu nedenle her bölüm "ne yaptık + neden" çiftiyle birlikte yazıldı.

---

## 1. Sorun Tanımı

REV-2 yol haritasında üç yüzey "shell" seviyesinde duruyordu:

1. **Branding Center** — `/user/channels/:id/branding-center` rotasında 6 kart
   tasarımı vardı ama gerçek persistence + completeness skoru + apply hattı
   yoktu. Brand identity kartları lokal state'te kalıyor, kayıt sonrası
   runtime'a hiçbir etki yapmıyordu (UI Honesty ihlali).
2. **Automation Center** — `/user/projects/:id/automation-center` rotasında
   canvas vardı ama node'lar `data-status` / `data-mode` taşımıyor, snapshot
   lock UX'i eksik, run-now sonrası job navigasyonu yoktu, evaluate sonuçları
   banner'a düşmüyordu (Decision Trail / Operasyonel Doğruluk eksiği).
3. **Channel URL Onboarding** — `/user/channels/new` URL → preview → confirm
   akışı tasarlanmıştı ama preview_token doğrulaması ve done step CTA
   navigasyonu (Branding Center'a geçiş) bağlanmamıştı.

CLAUDE.md ihlalleri: "All operator-facing behavior must be visible and manageable"
+ "Every meaningful change must be tested" + "Preview-First UX". Bu üç yüzey
shell olarak kalsa MVP "yarım" sayılırdı.

---

## 2. Mimari Karar (Backend)

### 2.1 Branding Center

**API yüzeyi:** `GET /api/v1/branding-center/{channel_profile_id}` ve
`POST /api/v1/branding-center/{channel_profile_id}/apply`. Identity / audience /
visual / messaging / platform / review olmak üzere 6 kart için ayrı PATCH
endpoint'leri (`/identity`, `/audience`, vb.).

**Persistence:**
- `BrandProfile` modeli `brand_summary`, `target_audience`, `visual_palette_json`,
  `messaging_pillars_json`, `platform_voice_json`, `last_applied_at`,
  `completeness_json` ile genişletildi.
- Migration: `branding_center_001_brand_profile_extension.py` — sadece **yeni
  kolonlar**, default'lar `NULL`/JSON `{}`. Geriye dönük uyumluluk korunur.

**Completeness skoru:**
- 6 kart × bool flag = `{identity, audience, visual, messaging, platform,
  review}`. `review.complete` ancak diğer beşi true ise true olabilir
  (server-derived; client-side türetme yasak).

**Apply pipeline:**
- `POST /apply?dry_run=true` → derived runtime config döner ama persist etmez
  (preview-first contract).
- `POST /apply?dry_run=false` → `last_applied_at` set edilir + audit log düşer.
  Job snapshot-lock contract'ı bozulmaz; aktif job'lar uygulanan branding'i
  görmez (snapshot referansları sabit).

### 2.2 Automation Center

**API yüzeyi:** `GET /api/v1/automation-center/{project_id}` (canvas state) +
`PUT /flow` (flow header) + `PUT /node/{node_id}` (per-node config) +
`POST /run-now` + `POST /evaluate`.

**Node katalogu:** `node_catalog.py` — 11 standart node tanımı. Her node:
- `scope` (input | processing | review | output)
- `operation_mode` (manual | ai_assist | automatic)
- `status` (server-derived: `complete` | `ready` | `blocked` | `disabled`)
- `badges`, `config` schema, `last_run_at`, `last_run_outcome`

**Snapshot lock contract:**
- Aktif (running/queued) job varsa flow + node PATCH'leri 409 döner.
- `snapshot_locked: true` response'a eklenir → UI banner + buton disable.
- Run-Now ve Save-Flow disable; Evaluate çalışmaya devam eder (read-only).

**Dual badge contract:**
- Frontend her node'da hem `data-status` (server truth) hem `data-mode`
  (operasyon modu) DOM attribute'u taşır. Test bunu querySelector ile
  doğrular — durum ve mod görünür şekilde ayrıdır, karışmaz.

**Run-Now akışı:**
- `POST /run-now` blockers boşsa job dispatch eder, `job_id` döner.
- UI navigate(`{baseRoute}/jobs/${job_id}`) — gerçek effect zorunlu.
- Blockers doluysa banner'a "Engeller: ..." pattern'i ile düşer.

**Admin-only "Zorla çalıştır":**
- Snapshot lock varken admin force-run yapabilir; user yapamaz.
- Auth context (`role === "admin"`) ile gate.

### 2.3 Channel URL Onboarding

**Üç adım state machine:**
1. **URL submit:** `POST /api/v1/channels/preview` → `ChannelImportPreview`
   (preview_token + handle + title + avatar + is_partial flag).
2. **Confirm:** `POST /api/v1/channels/confirm` body
   `{preview_token, source_url, default_language, profile_name, notes?}`.
   Server `preview_token` TTL kontrolü yapar (15 dk;
   `PREVIEW_TOKEN_TTL_SECONDS = 15 * 60`).
3. **Done:** Yeni `ChannelProfileResponse` döner; UI `import_status` chip + iki
   CTA (Branding Center'a geç / Kanallara dön) gösterir.

**Preview token disipliRni:**
- Token client-side üretilmez. `preview_token.py` server-side HMAC + TTL
  ile verilir, confirm endpoint'inde validate edilir.
- `is_partial: true` (örn. metadata fetch yarıda kaldı) UX warning chip'ine
  yansır — sessiz değil.

---

## 3. Frontend Mimarisi

### 3.1 Dosya yapısı

```
frontend/src/
├── api/
│   ├── automationCenterApi.ts       (yeni)
│   ├── brandingCenterApi.ts         (yeni)
│   └── channelProfilesApi.ts        (preview/confirm eklendi)
├── surfaces/aurora/
│   ├── AuroraAutomationCenterPage.tsx   (yeni)
│   ├── AuroraBrandingCenterPage.tsx     (yeni)
│   ├── AuroraChannelOnboardingPage.tsx  (yeni)
│   ├── AutomationCanvas.tsx             (yeni — node renderer)
│   └── styles/aurora/automation-canvas.css (yeni)
├── tests/
│   ├── aurora-automation-center.smoke.test.tsx   (yeni)
│   ├── aurora-branding-center.smoke.test.tsx     (yeni)
│   └── aurora-channel-onboarding.smoke.test.tsx  (yeni)
└── app/router.tsx (3 yeni route)
```

### 3.2 Aurora DS uyumu

- Kullanılan primitive'ler: `AuroraButton`, `AuroraCard`, `AuroraStatusChip`,
  `AuroraInspector`. Page shell: `aurora-dashboard > page > page-head +
  breadcrumbs`.
- Token disiplini: `text-neutral-100/200` kart içinde **kullanılmadı** (MEMORY
  tercih kuralı). Hover/odak vurguları ana sayfa pattern'ı ile aynı.
- 3 yeni route lazy chunk: `AuroraAutomationCenterPage` 16.66 kB,
  `AuroraBrandingCenterPage` 18.55 kB.

### 3.3 Test ID disiplini

Stable `data-testid` her etkileşimli element'te:
- Branding Center: `bc-identity-card`, `bc-audience-card`, `bc-visual-card`,
  `bc-messaging-card`, `bc-platform-card`, `bc-review-card`,
  `bc-go-automation`.
- Automation Center: `aurora-automation-center`, `ac-canvas`, `ac-run-now`,
  `ac-save-flow`, `ac-evaluate`. Her node `data-node-id`, `data-status`,
  `data-mode`.
- Channel Onboarding: `aurora-channel-onboarding`, `onb-url-input`,
  `onb-url-submit`, `onb-profile-name`, `onb-confirm-submit`, `onb-go-branding`.

### 3.4 Navigasyon kontratı

`baseRoute` = `isAdmin ? "/admin" : "/user"`. Tüm `navigate(...)` çağrıları
embedded quote'suz template literal kullanır — `aurora-navigate-targets.smoke.test.ts`
regex parser uyumu için zorunlu.

---

## 4. Test Stratejisi

### 4.1 Backend (20 test, hepsi yeşil)

`backend/tests/test_branding_automation_centers.py` (742 satır) kapsar:
- BC: identity PATCH, completeness yeniden hesabı, apply dry-run vs final,
  yetkisiz user 403, inactive channel guard.
- AC: snapshot-locked 409, run-now success/blocker path, evaluate read-only,
  admin force-run gate, node config validation.
- Channel onboarding: preview/confirm happy path, expired token 410, partial
  preview flag, unauthorized cross-user 403.

### 4.2 Frontend (3 yeni smoke dosyası, 14 test, hepsi yeşil)

- `aurora-branding-center.smoke.test.tsx` — 5 test
- `aurora-automation-center.smoke.test.tsx` — 5 test
- `aurora-channel-onboarding.smoke.test.tsx` — 4 test

Mocking pattern: `vi.spyOn(api, "fn").mockResolvedValue(...)` + `useAuthStore.setState(...)`
ile auth prime + `vi.spyOn(authApi, "fetchMe").mockResolvedValue(profile)`
bridge.

### 4.3 Migration testleri (bu wave'de güncellendi)

`branding_center_001` migration head'i `phase_al_001`'in üstüne taşıdı.
Aşağıdaki testler explicit revision lock ile düzeltildi:
- `test_phase_al_001_approver_migration.py::test_a` — `upgrade phase_al_001`
- `test_phase_al_001_approver_migration.py::test_d` — `upgrade phase_al_001` →
  `downgrade -1` → `phase_ag_001`
- `test_phase_al_001_approver_migration.py::test_e` — aynı pattern, idempotent
  re-upgrade

Bu, MEMORY/feedback kuralına uygundur (Alembic tek otorite, fresh-DB koşusu
zorunlu).

### 4.4 Acceptance Gate sonucu

| Gate | Sonuç |
|---|---|
| `tsc --noEmit` | 0 hata |
| `vitest run` | 240 dosya / 2710 test pass |
| `vite build` | success — yeni lazy chunk'lar emit edildi |
| `pytest` | 2611 pass / 0 fail / 1 unrelated coroutine warning |

---

## 5. Audit Çıktıları (devralınan)

`CODE_AUDIT_REPORT_2026-04-22.md` (root) bu wave'in hemen öncesinde üretildi.
Bulunan üç P0 dashboard problemi bu wave kapsamında kapatıldı:

1. **404 — `/user/jobs/list`** → `UserDigestDashboard` artık `Başarısız İş`
   tile'ı için `/user/inbox` rotasına yönlendiriyor (tek liste source-of-truth).
   Test: `user-digest-dashboard.smoke.test.tsx` güncellendi.
2. **Dead button — `Branding Center'a geç`** → onboarding done step CTA
   gerçek route'a bağlandı (`/user/channels/:id/branding-center`).
3. **Misleading toast — Automation save** → snapshot lock contract'ı
   eklendi; aktif job'da save 409 döner ve toast "snapshot kilitli" mesajını
   gösterir, fake success kalkar.

Diğer audit bulguları (orta-düşük öncelik) sonraki wave'e bırakıldı; STATUS.md
ve CODE_AUDIT_REPORT_2026-04-22.md kayıt altında.

---

## 6. Bilinçli Olarak Eklenmeyenler

- **AI-assisted brand suggestions** (BC kartlarında "Senin için doldur" butonu).
  Kapsam dışı; backend AI endpoint'i yok ve audit bunu önermedi.
- **Automation Center A/B test branch'leri.** Tek flow yeterli — multi-branch
  REV-3 dalga adayı.
- **Channel preview için OEmbed cache.** Şimdilik server her preview için fresh
  fetch yapar; cache ileri optimization.
- **Branding Center version history UI.** Backend `last_applied_at` tutuyor;
  history listing UI sonraki wave'e bırakıldı.

---

## 7. Riskler ve Sınırlar

- **Migration head sıçraması** (`phase_al_001` → `branding_center_001`) downstream
  branch'lerde merge edenlerin migrasyon zincirini fresh-DB ile doğrulaması
  gerekir. README/rollout-checklist `current` beklenen değer güncellendi.
- **Snapshot lock TOCTOU (kabul edilen sınır):**
  `_detect_snapshot_lock` SELECT-then-decide pattern'idir; row-level lock yoktur.
  SQLite WAL serializasyonu + tek event loop nedeniyle pratikte düşük risk; ek
  olarak running job'lar `project.automation_*` live alanlarını değil
  snapshot referanslarını okuduğu için bir patch + run_now yarışı üretim
  davranışını bozmaz. Sertleştirme (`BEGIN IMMEDIATE` veya post-mutation re-check)
  sonraki wave'e bırakıldı.
- **Snapshot lock UX'i** ilk versiyon: aktif job sayısı UI'da gösterilmiyor,
  sadece banner mesajı var. Detay panel sonraki wave.
- **Preview token TTL** 15 dk sabit (`channels/preview_token.py`). Settings
  Registry'ye taşımak (per CLAUDE.md rule "every operator-facing threshold
  settings'e gider") sonraki wave için açıkça not edildi.
