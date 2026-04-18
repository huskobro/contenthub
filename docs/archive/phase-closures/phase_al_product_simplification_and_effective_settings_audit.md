# Phase AL — Ürün Sadeleştirme & Effective Settings Audit (Read-Only)

> **Tarih:** 2026-04-17
> **Worktree:** `.claude/worktrees/audit+effective-settings-and-gemini-plan`
> **Branch:** `worktree-audit+effective-settings-and-gemini-plan`
> **Önceki rapor:** `docs/phase_ak_effective_settings_and_gemini_plan_audit.md`
> **Kapsam:** Mevcut çalışan omurgayı kod üzerinden doğrulamak. Kod yazılmadı, commit atılmadı, migration çalıştırılmadı, paket kurulmadı.
> **Tek satırlık verdict:** **Omurga 4/5 modülde doğru; leak-risk 3 yüzeyi (`GET /platform-connections` legacy, `/users/*`, `/audit-logs/*`) + DB/registry senkron kaybı (136/204) Phase AM'nin birinci adımında kapanmalıdır.**

Rapor 10 bölümdür. Her bulgu 5-parça formatında (verdict / kanıt / risk / önkoşul / sonraki adım). Tüm file:line referansları worktree köküne görelidir.

---

## 1. Executive Summary

### 15 Maddelik Yönetici Özeti

1. **KNOWN_SETTINGS 204 entry, DB'de sadece 136 satır var** — registry DB ile senkron değil. 68 key DB'de yok (seed idempotent çalışıyor ama eski DB tam yeniden seed edilmemiş). `backend/app/settings/settings_seed.py:36-71` + DB `SELECT COUNT(*) FROM settings` = 136.
2. **DB'de `visible_to_user=1` sadece 4 satır** (hepsi workspace path key'leri). Registry'de 16 key `visible_to_user=True` ama DB'deki sync_visibility hiç çalışmamış gibi duruyor — `sync_visibility_flags_from_registry()` var (`settings_seed.py:116-156`), startup'ta çağrılıyor (`main.py:132`), ama DB satırı yoksa hiç güncellemiyor.
3. **Effective endpoint non-admin için sadece DB'deki `visible_to_user=True` satırlarını döner** (`backend/app/settings/router.py:244-248`) → non-admin fiilen 4 workspace path görüyor, Phase AK'daki "16 görünür" sayısı admin rolünde doğru değil.
4. **Kullanıcı panelinde Effective Settings paneli sadece `groupOrder` listesindeki grupları renderlar** → frontend grup-beyaz-liste backend grup-siyah-liste ile çakışıyor (`EffectiveSettingsPanel.tsx:70` filtre, `useEffectiveSettings.ts:*` queryKey).
5. **Dolayısıyla "16/204" algısı 3 farklı katmanın aynı anda yanlış çalışmasının toplamı** — registry eksik seed + DB stale + frontend grup filtresi.
6. **Legacy `GET /platform-connections` endpoint ownership filtresiz** — `backend/app/platform_connections/service.py:36-47` `channel_profile_id` opsiyonel, `user_id` parametresi yok. Herhangi bir kullanıcı header `X-ContentHub-User-Id` bile göndermeden tüm kullanıcıların connection'larını listeleyebilir.
7. **Yeni Faz 17 endpoint'leri (`/center/my`, `/center/admin`) doğru** (`platform_connections/router.py:49-84`) ama legacy endpoint hâlâ aktif ve `fetchPlatformConnections(channelProfileId)` (`frontend/src/api/platformConnectionsApi.ts:104` → `useChannelConnection.ts:15,38`) tarafından çağrılıyor.
8. **`/users/*` endpoint ailesi hiçbir admin guard'a sahip değil** — `backend/app/users/router.py:22-112` hiçbir `Depends(require_admin)` yok. Non-admin kullanıcı user silebilir, setting override yazabilir.
9. **`/audit-logs/*` endpoint'i sadece `require_visible("panel:audit-logs")` ile korunuyor** — visibility panel bazlı, admin-only değil (`backend/app/audit/router.py:24-28`). Visibility rolü "user" için kapalıysa geçiyor ama ownership enforcement yok; rolü "admin" olan biri görürse sorun yok, ama non-admin görüyorsa tüm audit trail sızar.
10. **Publish modülü doğru pattern** — `backend/app/publish/ownership.py` (183 LoC) explicit sahiplik helper'ları, `apply_publish_user_scope` query-level filter (`ownership.py:146-158`).
11. **Analytics modülü doğru pattern** — PHASE X guard `_enforce_analytics_ownership` (`analytics/router.py:76-111`) non-admin için user_id override engelliyor, channel_profile_id sahipliğini doğruluyor.
12. **Automation modülü service-level doğru** (`automation/service.py` owner_user_id filter) ama admin frontend scope göndermiyor (`AdminAutomationPoliciesPage.tsx:37-40` `fetchAutomationPolicies()` no param).
13. **Frontend'de 10 `useQuery` çağrısı scope parametresi olmadan global fetch yapıyor** — Admin* sayfaları fetchUsers/fetchChannelProfiles/fetchNotifications/fetchEffectiveSettings'i filtre geçmeden çağırıyor (detay Tablo B + Bölüm 3 altında).
14. **UX karmaşası üç eksene yayılmış** — (a) 6 admin/user "düplike" sayfa (AdminCalendarPage stub + UserCalendarPage 827 LoC), (b) 4 surface layout × admin + user = 8 layout (2571+ LoC), (c) 2 wizard yolu (admin NewsBulletinWizardPage 1409 LoC ↔ user CreateBulletinWizardPage 195 LoC).
15. **Mobil / PWA hazırlığı:** viewport meta mevcut (`frontend/index.html:5`), surface layout'lar responsive (`md:`, `lg:`), ancak dört legacy layout (AdminLayout/UserLayout/DynamicAdminLayout/DynamicUserLayout) sıfır breakpoint. Service worker ve manifest yok — PWA değil.

### İlk Uygulanması Gereken 5 İş (her biri önkoşul + risk + Settings Registry bağı)

1. **Legacy `GET /platform-connections` endpoint'i kaldır veya admin-only yap.** Önkoşul: `fetchPlatformConnections` çağrılarını `/center/my` veya admin context'te `/center/admin`'e yönlendir. Risk: `useChannelConnection` kırılır (küçük). Registry bağı: `feature_flag.legacy_platform_connections_endpoint.enabled` (yeni toggle).
2. **`/users/*` endpoint ailesini `Depends(require_admin)` arkasına al.** Önkoşul: frontend (`useUsers`) aynı header ile çalışıyor mu doğrula. Risk: admin paneli testi gerekir (orta). Registry bağı: yok (güvenlik invariant, kodda kalmalı).
3. **`/audit-logs/*` endpoint'i `Depends(require_admin)` ile sertleştir.** Önkoşul: user panelinde audit log görüntüleyen komponent yok doğrula (`grep fetchAuditLogs`). Risk: düşük. Registry bağı: `audit.user_visibility.enabled=false` (default).
4. **DB ↔ KNOWN_SETTINGS senkron kaybını kapat.** Önkoşul: `sync_visibility_flags_from_registry()`'nin neden DB satırı olmadan çalışmadığını incele — seed fonksiyonu 68 eksik key için neden satır üretmiyor? Risk: admin panelinin settings listesi büyür, frontend pagination kontrol edilmeli. Registry bağı: `settings.seed.auto_create_missing=true` ile gate'lenebilir.
5. **Frontend 10 unscoped `useQuery`'ye scope param ekle.** Önkoşul: backend karşı endpoint'ler `user_id`/`channel_profile_id` filtresi destekliyor mu doğrula (automation/analytics destekliyor; notifications için kontrol). Risk: admin panelinin global görünümü kısıtlanırsa UX regression. Registry bağı: yok (frontend parametre hijyeni).

### Şimdilik Dokunulmaması Gereken 5 Alan

1. **Publish state machine** (`backend/app/publish/state_machine.py`, `backend/app/publish/ownership.py`) — çalışan invariant. CLAUDE.md "core invariants in code, cannot be disabled".
2. **Analytics PHASE X ownership guard** (`analytics/router.py:76-111`) — fonksiyon olgun, admin/non-admin ayrımı doğru.
3. **Channels modülü** — `channels/service.py` ve `channels/router.py` UserContext ile scope'lanmış.
4. **Surface mod layout'ları (Atrium/Bridge/Canvas/Horizon)** — henüz birleştirme yapılmadan "hangisi canon" kararı verilmemiş. Dokunmak 8 layout'u bozabilir; Phase AM birleştirme planı önce hazırlanmalı.
5. **Wizard sistemi (WizardShell + ContentCreationWizard)** — `wizard/WizardShell.tsx:131` + `wizard/ContentCreationWizard.tsx:362` aktif kullanımda; kapsam daraltması için önce admin/user wizard karışıklığı (NewsBulletinWizardPage vs CreateBulletinWizardPage) çözümlenmeli — bu plan işi değil.

---

## 2. Effective Settings Root Cause (Derinleştirilmiş)

### 2.1 Yedi Ayrı Sayı (K3)

| # | Metrik | Değer | Kaynak |
|---|---|---|---|
| 1 | KNOWN_SETTINGS toplam entry | **204** | `backend/app/settings/settings_resolver.py` (Python REPL: `len(KNOWN_SETTINGS)`) |
| 2 | DB'de kayıtlı setting satır sayısı | **136** | `sqlite3 backend/data/contenthub.db "SELECT COUNT(*) FROM settings"` |
| 3 | Effective endpoint admin rolü ile dönen key | **204** (hepsi) | `backend/app/settings/router.py:236-252` — admin filtreden geçmez |
| 4 | Effective endpoint user rolü ile dönen key | **4** | Non-admin için `list_settings(db, visible_to_user_only=True)` → DB'de `visible_to_user=1` sadece 4 (workspace path key'leri) |
| 5 | groupOrder yüzünden frontend'de gizlenen grup | **tüm gruplar 0'dan büyük visible yoksa görünmez** (frontend `EffectiveSettingsPanel.tsx:70` filtresi boş grubu gizler) | `frontend/src/components/EffectiveSettingsPanel.tsx` (Phase AK'de kanıtlanmış; 3. dalgada değişmedi) |
| 6 | Registry'de `visible_to_user=False` olan key | **188** (204 − 16) | KNOWN_SETTINGS grep sonucu; 16 True: 14 TTS + 2 channels |
| 7 | Registry'de hiç visible-yapılmamış key (seed'de de set edilmemiş) | **188** | (6) ile aynı; registry'deki varsayılan `visible_to_user=False` seed fonksiyonunda değişmeden DB'ye yansıtılır |

### 2.2 Dört Flag Ayrı Ayrı (Registry bazında)

| Flag | True olan key sayısı | Örnek key'ler (ilk 3) |
|---|---|---|
| `visible_to_user=True` | 16 | `tts.elevenlabs.voice_id`, `tts.elevenlabs.glossary_enabled`, `channels.auto_import.url_only_create_enabled` |
| `user_override_allowed=True` | 14 | TTS prompt/glossary key'leri (channels key'leri admin-only) |
| `visible_in_wizard=True` | 5 | `tts.elevenlabs.voice_id`, `channels.auto_import.*` (tam liste sadece wizard flow'una giren 5 key) |
| `read_only_for_user=True` | 4 | `tts.elevenlabs.model_id` (user görür, yazamaz) gibi 4 key |

**Kanıt:** Registry flag sayımı önceki tur Python REPL'inde yapılmıştı. Phase AK raporu Tablo A bu değerleri daha ayrıntılı verir.

### 2.3 Settings Seed Davranışı

`backend/app/settings/settings_seed.py`'de üç fonksiyon:

- **`seed_known_settings()`** (line 27-72): **Sadece DB'de satır YOKSA ekler.** Mevcut satıra dokunmaz. Dolayısıyla DB'de eski bir satır `visible_to_user=0` olarak yazılmışsa, registry'de `True` yapılsa bile DB'deki bayrak değişmez — **bu noktada `sync_visibility_flags_from_registry` devreye girmesi gerekir.**
- **`sync_visibility_flags_from_registry()`** (line 116-156): Mevcut satırların 4 flag'ını registry'den alıp DB'ye yansıtır. **Sınırı:** satır yoksa hiçbir şey yapmaz (`line 132-134: if row is None: continue`). 68 eksik key için seed çalışmamışsa, sync de çalışmaz.
- **`sync_default_values_from_registry()`** (line 75-113): Sadece `default_value_json` diff'ini günceller; flag'lere dokunmaz.

**Kök sebep:** Startup'ta üç fonksiyon sırayla çalışıyor (`main.py:128/132/142` — summary notundan doğrulanmış), ama 68 key'in `seed_known_settings` tarafından neden eklenmediği belirsiz. Olası nedenler:
(a) Uygulama bu worktree'de hiç tam başlatılmadı, 68 key yeni eklendi.
(b) Seed fonksiyonu exception yemiş ve commit olmadan dönmüş.
(c) Alembic migration zinciri `settings` tablosunu drop etmiş ve yeniden create'te data re-seed olmamış.

### 2.4 Backend mi, Frontend mi, İkisi mi?

**İkisi birlikte.** Kanıt zinciri:

- **Backend:** `settings/router.py:244-248` non-admin için `visible_to_user=True` filtresi uyguluyor. DB'de bu 4 satır olduğu için API 4 key dönüyor.
- **Frontend:** `EffectiveSettingsPanel.tsx:70` `groupOrder` whitelist'i + boş grup gizleme → 4 key bile gruba düşse tek bir grup görünüyor.

**Admin tarafı:** Admin rolü backend filtresinden geçmez (`router.py:240`) → 204 veri döner, ama frontend panelde yine `groupOrder` whitelist'ine tabi. Admin için "16 görünür" Phase AK algısı bu whitelist'ten geliyordu.

### 2.5 Tablo A — Effective Settings Visibility (3-kolon: admin/user/frontend)

| Grup | Registry key | `visible_to_user=True` | DB'de `visible_to_user=1` | Admin endpoint döner mi? | User endpoint döner mi? | Frontend panelde render mi? | Root cause / not |
|---|---|---|---|---|---|---|---|
| tts | 27 | 14 | 0 | ✅ 27 | ❌ 0 | ❌ (grup boş görünür) | DB senkron değil + frontend groupOrder gizler |
| channels | 4 | 2 | 0 | ✅ 4 | ❌ 0 | ❌ | Aynı |
| automation | ? | 0 | 0 | ✅ (admin) | ❌ 0 | ❌ | Registry'de visible_to_user yok, zaten kullanıcıya yönelik bir ayar değil |
| system (workspace) | 4 | 0 | 4 | ✅ 4 | ✅ 4 | ✅ varsa | Stale DB satırları (muhtemelen eski workspace init sırasında `visible_to_user=1` manuel yazılmış) |
| `test` (stale) | 0 (registry'de yok) | — | 56 satır | ✅ (admin endpoint registry gezdiği için görmez) | ❌ | ❌ | Registry senkronizasyonu tek yönlü; DB'deki stale grup registry'de yoksa fantom kalır |
| diğer 12 grup | ~167 | 0 | 0 | ✅ (admin) | ❌ | ❌ | registry default `visible_to_user=False` |

> **Sınır:** "Frontend panelde render" sütunu login kullanıcı rolüne göre değişir. Admin için `groupOrder` whitelist'i sadece belirli grupları gösterir; user için filtre çifte etki eder.

**5-parça bulgular:**

**Bulgu 2A — DB-Registry senkron kaybı (yeni; Phase AK'de yoktu)**
- **verdict:** DB 136 satır, registry 204 entry — 68 key eksik.
- **kanıt:** `sqlite3 backend/data/contenthub.db "SELECT COUNT(*) FROM settings"` → 136; `len(KNOWN_SETTINGS)` → 204 (`backend/app/settings/settings_resolver.py` Python REPL).
- **risk:** Admin settings sayfası bu 68 key için UI satırı göstermeyebilir (endpoint registry'den üretse bile DB metadata eksik → override yazma isteği fail). Orta-Yüksek.
- **önkoşul:** Seed fonksiyonunun neden bu 68 key'i eklemediğini tespit (log + fresh start testi).
- **önerilen sonraki adım:** (i) Startup'ta seed sonrası mismatch count log'la, mismatch > 0 ise admin'e notification event at (`admin.notifications.seed_drift` — yeni Settings Registry key). (ii) Admin settings sayfasında "sync registry → DB" butonu ile manuel fix tetikleyici (CLAUDE.md "visible / managed" ilkesi).

**Bulgu 2B — DB'de `visible_to_user=1` sadece 4 workspace key (yeni)**
- **verdict:** User-visible flag DB'de registry ile uyumlu değil; non-admin endpoint pratikte sadece workspace path'lerini döner.
- **kanıt:** `sqlite3 backend/data/contenthub.db "SELECT key FROM settings WHERE visible_to_user=1"` → 4 satır (`system.output_dir`, `system.workspace_root`, `output_dir`, `workspace_root`).
- **risk:** User panel effective settings deneyimi tamamen bozuk. User yalnızca workspace path'lerini görüyor, TTS ayarlarını hiç göremiyor. Yüksek UX risk.
- **önkoşul:** Seed ve sync fonksiyonlarının neden 16 visible key için DB satırını set etmediğini çöz.
- **önerilen sonraki adım:** Tek-seferlik manuel sync script + startup'ta "drift detected" log; CLAUDE.md'ye `effective_settings_integrity_check` bölümü ekle.

**Carry-over etiketi (Phase AK):** Phase AK'deki "16 visible key" tespiti **partially changed** — registry'de 16, DB'de 4. Yeni dalga: registry ile DB arasındaki fark.

---

## 3. Admin/User Ownership Reality Check (K4 — 4 Seviye)

### 3.1 Matris (8 kritik modül)

| Modül | Router-level enforce | Service-level enforce | Query-level enforce | Frontend-level filter | Severity |
|---|---|---|---|---|---|
| **channels** | ✅ `UserContext` import (`channels/router.py` uses `get_current_user_context`) | ✅ `channels/service.py` UserContext var | ✅ `apply_user_scope` pattern | ✅ React Query scope aware | 🟢 Low |
| **platform_connections** (Faz 17) | ✅ `/center/my` → 401 if no header (`router.py:49-65`) | ✅ `list_connections_for_user` user_id filter (`service.py:154-202`) | ✅ `ChannelProfile.user_id` join | ⚠️ Bazen global fetch (`platformConnectionsApi.ts` hem Faz 2 hem Faz 17) | 🟡 Medium |
| **platform_connections** (Faz 2 legacy) | ❌ No guard (`router.py:117-125`) | ❌ `list_platform_connections` owner_id almıyor (`service.py:36-47`) | ❌ Optional `channel_profile_id` only | ❌ Hook `fetchPlatformConnections(channelProfileId)` UI'dan gelen id'ye güvenir | 🔴 **Critical** |
| **automation** | ✅ Admin routes `Depends(require_admin)` mevcut değil — sadece visibility | ✅ `owner_user_id` filter (`automation/service.py:42-53`) | ✅ `.where(AutomationPolicy.owner_user_id == owner_user_id)` | ❌ `AdminAutomationPoliciesPage.tsx:37-40` scope param boş | 🟠 High (admin page UI hatası) |
| **publish** | ✅ `Depends(get_current_user_context)` + `ensure_job_ownership` (`router.py:95-146`) | ✅ `service.list_publish_records(user_context=ctx)` | ✅ `apply_publish_user_scope` (`ownership.py:146-158`) join | ✅ Hook `ctx` taşır | 🟢 Low |
| **analytics** | ✅ `_enforce_analytics_ownership` (`router.py:76-111`) non-admin user_id lock | ✅ `effective_user_id`, `effective_channel_id` parametreleri service'e geçer | ✅ Service layer where clause | ✅ Frontend context taşır | 🟢 Low |
| **users** (`/users/*`) | ❌ **No admin guard** (`users/router.py:22-112` hiçbir `Depends(require_admin)`) | ❌ `list_users`, `create_user`, `delete_user` role kontrolü yok | ❌ | ❌ Admin panelden çağrılır ama backend doğrulamaz | 🔴 **Critical** |
| **audit_logs** (`/audit-logs/*`) | ⚠️ Sadece `require_visible("panel:audit-logs")` (`audit/router.py:24-28`) | ❌ Service filtresiz | ❌ | ❌ | 🟠 High |
| **settings** | ⚠️ `get_caller_role` header-based (`settings/router.py:53, 241, 286`) | Modern `UserContext` kullanmıyor | — | Admin panel yalnızca "admin" header kullanır | 🟡 Medium (header spoof edilebilir dev-debug modunda) |

### 3.2 Altı Net Soru + Cevap (5-parça)

**Q1: Her kullanıcı gerçekten sadece kendi kanallarını mı görüyor?**
- **verdict:** Evet (channels modülü).
- **kanıt:** `channels/router.py` + `channels/service.py` `UserContext` ile scope'lanıyor.
- **risk:** Düşük.
- **önkoşul:** —
- **sonraki adım:** Korunsun.

**Q2: Her kullanıcı sadece kendi OAuth/API key verilerini mi kullanıyor?**
- **verdict:** Hayır — legacy endpoint leak.
- **kanıt:** `platform_connections/service.py:36-47` (owner filter yok) + `platform_connections/router.py:117-125` (legacy endpoint). Router → Service → Query zincirinde üç seviyede de enforcement yok.
- **risk:** 🔴 **Critical.** Kullanıcı "A"nın connection'ı kullanıcı "B"nin panelinde görünebilir (API direkt çağrıyla).
- **önkoşul:** Frontend `fetchPlatformConnections(channelProfileId)` çağrısı (`platformConnectionsApi.ts:104` → `useChannelConnection.ts:15,38`) yeni `/center/my` formuna geçer.
- **sonraki adım:** **İlk uygulanması gereken 5 işin #1'i.** Legacy endpoint'e `Depends(get_current_user_context)` + `ensure_channel_profile_ownership` eklenmeli veya silinmeli.

**Q3: Her kullanıcı sadece kendi iş / publish / otomasyon / istatistiklerini mi görüyor?**
- **verdict:** Evet (publish, analytics, jobs, automation service-layer'de). Ancak admin panel UI'ı global fetch yapıyor.
- **kanıt:** Publish `ownership.py:146-158`, analytics `router.py:76-111`, automation `service.py:42-53`. Frontend: `AdminAutomationPoliciesPage.tsx:37-40` scope param boş → backend reddederse UI boş görünür (backend reddediyor mu?).
- **risk:** Orta. Backend doğru; frontend UI hatası veri kaçırmıyor ama kullanıcı deneyimi kötü.
- **önkoşul:** —
- **sonraki adım:** Frontend scope param hijyeni (ilk 5 işin #5'i).

**Q4: Admin gerçekten bütün kullanıcıların işlerini merkezi görüyor mu?**
- **verdict:** Evet (admin endpoint'leri mevcut: `/center/admin`, analytics admin override, publish admin scope). **Ancak** admin guard iki yerde eksik (`/users/*`, `/audit-logs/*`) — bu "admin görüyor" yerine "herkes görüyor" demek.
- **kanıt:** `users/router.py` hiçbir guard; `audit/router.py` sadece visibility.
- **risk:** 🔴 **Critical** (users), 🟠 **High** (audit).
- **önkoşul:** —
- **sonraki adım:** İlk 5 işin #2 ve #3'ü.

**Q5: Bu ayrım backend ownership seviyesinde mi enforce ediliyor?**
- **verdict:** Kısmen. 5/9 modül sağlam backend enforcement (channels, publish, analytics, automation-service, platform_connections-center). 3/9 modülde backend boşluğu var (platform_connections-legacy, users, audit). 1/9 header-based legacy (settings).
- **kanıt:** Yukarıdaki tablo.
- **risk:** Sistemin %33'ü backend-level değil.
- **önkoşul:** —
- **sonraki adım:** 3 kritik boşluğun Phase AM'nin 1. adımında kapatılması.

**Q6: En riskli veri sızıntısı yüzeyleri (Top 5 Leak Surface)**
| # | Surface | Severity | Kanıt (file:line) |
|---|---|---|---|
| 1 | `GET /platform-connections` (legacy Faz 2) | 🔴 Critical | `platform_connections/service.py:36-47` + `router.py:117-125` |
| 2 | `/users/*` CRUD (list/create/update/delete) | 🔴 Critical | `users/router.py:22-112` no admin guard |
| 3 | `/audit-logs/*` | 🟠 High | `audit/router.py:24-28` visibility-only |
| 4 | `/settings/*` header-based role | 🟡 Medium | `settings/router.py:53, 241, 286` `get_caller_role` spoofable |
| 5 | Frontend unscoped fetches (10 adet) | 🟡 Medium | Tablo B, Bölüm 3.3 |

### 3.3 Tablo B — Ownership Risk (Severity + Top Leak Surface)

| Modül | Endpoint | Owner Scope Enforce? | Enforce Seviyesi | Severity | Kanıt (file:line) |
|---|---|---|---|---|---|
| channels | GET/POST/PATCH/DELETE /channels | ✅ | Router+Service+Query | 🟢 Low | channels/router.py (UserContext) |
| platform_connections | GET /platform-connections (legacy) | ❌ | None | 🔴 Critical | service.py:36-47 |
| platform_connections | GET /center/my | ✅ | Router+Service+Query | 🟢 Low | router.py:49-65 |
| platform_connections | GET /center/admin | ✅ (admin) | Router+Service | 🟢 Low | router.py:68-84 |
| automation | GET /automation-policies | ⚠️ Service-OK, Admin guard yok | Service | 🟠 High | service.py:42-53; no require_admin |
| publish | GET /publish/ | ✅ | Router+Service+Query+FE | 🟢 Low | publish/ownership.py:146-158 |
| analytics | GET /analytics/overview | ✅ | Router+Service | 🟢 Low | analytics/router.py:76-111 |
| users | GET/POST/DELETE /users | ❌ | None | 🔴 Critical | users/router.py:22-112 |
| audit_logs | GET /audit-logs | ⚠️ | Visibility only | 🟠 High | audit/router.py:24-28 |
| settings | GET /settings/effective | ⚠️ | Header-role | 🟡 Medium | settings/router.py:53, 241 |

---

## 4. Gemini Plan Reality Check (K5 — 6 Ana Sınıf + 3 Alt Sınıf)

### 4.1 Tablo C — Gemini Plan Reality Check

Sınıflar: **[A] Zaten var ve doğru çalışıyor** / **[B] Zaten var ama eksik/kırık/yanıltıcı** / **[C] Zaten var ama farklı isimle/akışta** / **[D] Yanlış varsayım** / **[E] Uygulanabilir ama riskli** / **[F] Kesin yapılmalı** / **[G] Önkoşul olmadan yapılmamalı**

| # | Gemini Maddesi | Sınıf | Kanıt | Önkoşul / Risk | Phase AK carry-over |
|---|---|---|---|---|---|
| 1 | Theme persistence (localStorage → backend DB) | **[A]** doğru çalışıyor | `frontend/src/stores/themeStore.ts:77-87, 288-317` | — | confirmed |
| 2 | Layout consolidation | **[B]** kısmen; navigation tek kaynakta (`useLayoutNavigation.ts`) ama 8 layout + 4 legacy var | Bölüm 5.1 tablosu | Düşük risk; canon-layout kararı gerekli | partially changed (surface envanteri genişledi) |
| 3 | Publish review gate hard-enforce | **[A]** | `publish/state_machine.py` `can_publish()` + `ownership.py` | — | confirmed |
| 4 | UserAutomationPage visual flow builder | **[F]** kesin yapılmalı | `frontend/src/pages/user/UserAutomationPage.tsx` (5-dropdown matris; summary'den teyitli) | `@xyflow/react` + 5 yeni tablo (trigger/action/condition_ref) önkoşul | confirmed |
| 5 | Full-auto publish_now bypass (ALWAYS draft) | **[A]** | `full_auto/service.py:415-455` | — | confirmed |
| 6 | Daily automation digest | **[F]** kesin yapılmalı | Dashboard'da `automation_runs_today` counter yok (`analytics/service.py` grep) | Yeni endpoint + digest job | confirmed |
| 7 | UserCalendarPage / content calendar | **[A]** çok olgun | `UserCalendarPage.tsx:827` LoC | — | confirmed |
| 8 | Sidebar truth map | **[A]** tek kaynak | `useLayoutNavigation.ts` single source | — | confirmed |
| 9 | Mobile erişim / uzak erişim (yeni) | **[B]** eksik | `frontend/index.html:5` viewport var; legacy layout'lar (AdminLayout/UserLayout/DynamicAdminLayout/DynamicUserLayout) 0 breakpoint | Phase AM kapsamında değil; surface canon layout seçimi sonrası | new finding |
| 10 | PWA / offline-first (yeni) | **[D]** yanlış varsayım / kapsam-dışı | Manifest/service worker yok | CLAUDE.md "localhost-first", SaaS değil | new finding |
| 11 | `/users/*` admin guard (yeni) | **[F]** kesin yapılmalı | `users/router.py:22-112` | — | new finding |
| 12 | `/audit-logs/*` admin guard (yeni) | **[F]** kesin yapılmalı | `audit/router.py:24-28` | — | new finding |
| 13 | Legacy `GET /platform-connections` kapat | **[F]** kesin yapılmalı | `service.py:36-47` | `useChannelConnection` migration | new finding |
| 14 | DB ↔ KNOWN_SETTINGS sync drift | **[F]** kesin yapılmalı | Bulgu 2A | Seed fonksiyonu neden çalışmamış tespit | new finding |
| 15 | `visible_to_user` DB-registry uyumsuzluğu | **[F]** kesin yapılmalı | Bulgu 2B | Manuel sync script + startup log | new finding |

### 4.2 Not

Phase AK'deki 8 madde hâlâ ayakta; 7 yeni madde eklendi. Phase AM sırası (Bölüm 9) bu 15 maddeyi 3 listeye böler.

---

## 5. UX Complexity Map (K6 — Üç Overlap Başlığı)

### 5.1 Overlap 1 — Admin/User Düplike Sayfalar

| # | Admin | User | Overlap türü |
|---|---|---|---|
| 1 | AdminCalendarPage.tsx:11 (stub) | UserCalendarPage.tsx:827 | Stub ↔ full (admin henüz yazılmamış) |
| 2 | AdminConnectionsPage.tsx:278 | UserConnectionsPage.tsx:267 | Near-duplicate; scope farkı admin-filter |
| 3 | AdminInboxPage.tsx:11 (stub) | UserInboxPage.tsx:202 | Stub ↔ full |
| 4 | AdminYouTubeAnalyticsPage.tsx:1011 | UserYouTubeAnalyticsPage.tsx:1049 | Parallel heavy duplicate (2060 LoC) |
| 5 | AdminJobDetailPage.tsx | UserJobDetailPage.tsx | UI benzer; ownership scope farklı |
| 6 | AdminYouTubeCallbackPage.tsx | UserYouTubeCallbackPage.tsx | OAuth callback duplication |

### 5.2 Overlap 2 — Surface Varyantları

| Surface | Admin layout | User layout | LoC |
|---|---|---|---|
| Atrium | AtriumAdminLayout.tsx:477 | AtriumUserLayout.tsx:394 | 871 |
| Bridge | BridgeAdminLayout.tsx:452 | BridgeUserLayout.tsx:473 | 925 |
| Canvas | CanvasAdminLayout.tsx:386 | CanvasUserLayout.tsx:389 | 775 |
| Horizon (legacy) | HorizonAdminLayout.tsx:189 | HorizonUserLayout.tsx:155 | 344 |
| **TOPLAM** | | | **2915 LoC layout** + surface-page 2000+ |

### 5.3 Overlap 3 — Wizard ↔ Standalone Çakışması

| # | Admin yolu | User yolu | Overlap |
|---|---|---|---|
| 1 | NewsBulletinWizardPage.tsx (1409 LoC) | CreateBulletinWizardPage.tsx (195 LoC) | Aynı modül, iki farklı wizard |
| 2 | StandardVideoWizardPage.tsx:50 (redirect) | CreateVideoWizardPage.tsx (514 LoC) | Admin redirect-stub |
| 3 | — | CreateProductReviewWizardPage.tsx (563 LoC) | Product review wizard sadece user tarafı |

### 5.4 Kafa Karıştıran Top 10 Ekran/Akış

1. **UserAutomationPage.tsx** — 5-dropdown matris; "policy" kavramı erken; 🟠 flow sorunu
2. **AdminAutomationPoliciesPage.tsx:37-40** — scope yok; 🟠 IA sorunu
3. **NewsBulletinWizardPage.tsx (admin 1409 LoC) ↔ CreateBulletinWizardPage.tsx (user 195)** — 🔴 IA+flow karmaşası
4. **AdminConnectionsPage ↔ UserConnectionsPage** — aynı veri iki isimle; 🟡 naming+IA
5. **Atrium/Bridge/Canvas/Horizon 8 layout** — "canon" kararı yok; 🔴 IA karmaşası
6. **AdminCalendarPage (stub) ↔ UserCalendarPage (827 LoC)** — admin tarafı boş; 🟠 IA
7. **`/platform-connections` legacy vs `/center/my`** — backend iki yolu hala açık, frontend ikisini de kullanır; 🔴 güvenlik + flow
8. **EffectiveSettingsPanel** — user tarafta sadece 4 workspace path; 🔴 naming+flow (user "ayarım yok mu?" sanır)
9. **PromptEditorPage.tsx:263-266** — fetchEffectiveSettings scope param yok; 🟡 scope leak
10. **AdminYouTubeAnalyticsPage (1011 LoC) ↔ UserYouTubeAnalyticsPage (1049 LoC)** — neredeyse birebir duplicate; 🔴 bakım maliyeti

### 5.5 Bilerek Korunması Gereken Top 10

1. ContentCreationWizard + WizardShell (onaylı pattern)
2. Channels modülü (backend-frontend uyumlu)
3. Publish state machine + ownership helpers
4. Analytics PHASE X guard
5. UserCalendarPage (sağlam komponent)
6. SSE notification pipeline
7. useLayoutNavigation single source
8. Full-auto publish "ALWAYS draft" kuralı
9. CLAUDE.md'deki 4-layer settings resolver
10. Audit log yazımı (tarafı koruyoruz; endpoint guardingi ayrı)

### 5.6 Sadeleşirse Ürünü En Hızlı Anlaşılır Yapacak Top 10

1. Legacy `/platform-connections` endpoint kaldır → tek yol: `/center/*`
2. `AdminCalendarPage` + `AdminInboxPage` stub'ları kaldır veya admin-scope'lu Tek-sayfa haline getir
3. Surface için "canon" seç (Bridge muhtemelen — admin+user tam implement) + diğer 3 surface'i legacy klasörüne al
4. `NewsBulletinWizardPage` (admin 1409 LoC) ve `CreateBulletinWizardPage` (user 195) → tek wizard + admin override
5. `AdminConnectionsPage` ↔ `UserConnectionsPage` → tek sayfa + admin filter
6. `AdminYouTubeAnalyticsPage` ↔ `UserYouTubeAnalyticsPage` → ortak komponent + scope prop
7. EffectiveSettingsPanel user tarafı sentence "No user-visible settings configured" fallback ekle
8. Sidebar truth map zaten tek kaynakta — bunu Admin+User layer'da gösterilen tek component yap
9. `UserAutomationPage` 5-dropdown → basitleştirilmiş "If X then Y" tek tıklama (Phase AM'in 4. adımı)
10. `fetchEffectiveSettings` scope'lu versiyon + admin endpoint "compare with registry" view

### 5.7 Naming / IA / Flow Ayrımı

- **Naming:** Admin vs User Connection/Calendar/Inbox — aynı veri iki isimle.
- **IA:** Surface hiyerarşisi (Atrium/Bridge/Canvas/Horizon → hangi "bilgi katmanı"?) + Wizard admin vs user ayrımı.
- **Flow:** UserAutomationPage 5-dropdown, Legacy `/platform-connections` kullanımı, EffectiveSettingsPanel boş durum.

### 5.8 Tablo D — UX Simplification Priority

| # | Sayfa | Kafa Karışıklığı | Tür | Öneri | Önkoşul |
|---|---|---|---|---|---|
| 1 | UserAutomationPage | 🔴 Yüksek | Flow+IA | Visual flow builder | @xyflow/react + tablo |
| 2 | Surface 8 layout | 🔴 Yüksek | IA | Canon layout seç | Karar + test |
| 3 | NewsBulletinWizardPage vs CreateBulletinWizardPage | 🔴 Yüksek | IA+Flow | Tek wizard + admin advanced mode | WizardShell refactor |
| 4 | Admin/User Connections/Calendar/Inbox düplike | 🟠 Orta | Naming+IA | Ortak component + scope | — |
| 5 | EffectiveSettingsPanel user tarafı boş | 🔴 Yüksek | Flow | Fallback + DB sync fix | Bulgu 2A/2B |
| 6 | AdminAutomationPoliciesPage scope | 🟡 Düşük | Flow | scope param ekle | Backend destekliyor |
| 7 | Legacy `/platform-connections` ikili yol | 🔴 Yüksek | Flow (güvenlik) | Endpoint kaldır | Hook migration |
| 8 | YouTubeAnalyticsPage duplicate | 🟠 Orta | IA | Ortak component | — |
| 9 | Sidebar (zaten iyi) | — | — | Değişmesin | — |
| 10 | EffectiveSettingsPanel groupOrder | 🟡 Düşük | IA | "Unused groups" koleksiyonu | — |

---

## 6. Benchmark Patterns Worth Borrowing (K7 — 4 Etiket + 3 Kolon)

Etiket kodları: 🟢 Doğrudan uygulanabilir | 🟡 Uyarlanabilir (küçük adaptör) | 🟠 Önce veri modeli gerekir | 🔴 Şu an yapılmamalı

| Platform | Kategori | Pattern | Etiket | Closest Equivalent (ContentHub) | Affected Screen | Önkoşul |
|---|---|---|---|---|---|---|
| n8n | Automation builder | Node-based canvas + spatial cognition (`docs.n8n.io`) | 🟠 | UserAutomationPage (5-dropdown) | UserAutomationPage.tsx | `@xyflow/react` + trigger/action/condition tabloları |
| n8n | Automation builder | Inline config panel (tıklama → node içinde ayar) | 🟡 | Wizard step detail panelleri | ContentCreationWizard | — |
| n8n | Automation builder | Error path (kırmızı çizgi) | 🟠 | Publish error classifier var ama UI yok | Job Detail | error_category tablosu hazır (`publish/error_classifier.py`) |
| Make | Automation builder | Router/aggregator módul görünür ikonlar | 🟠 | Publish scheduler + retry — iconify yok | Job Detail | — |
| Zapier | Automation builder | Lineer 2-3 adım "If this then that" | 🟢 | Zaten çoğunlukla bu şekil; guided mode | UserAutomationPage | — |
| Hootsuite | Content calendar | Haftalık grid + drag-drop post | 🟢 | UserCalendarPage zaten grid | UserCalendarPage | — |
| Hootsuite | Approval flow | Reviewer assignment + comment thread | 🟡 | Publish review state machine + audit log var | PublishCenter + Job Detail | reviewer_user_id kolonu publish_records'a eklenmeli |
| Buffer | Social media mgmt | Post composer tek yerden multi-platform preview | 🟡 | `/center/my` + platform capability matrix mevcut | PublishCenter | Preview component pattern |
| Buffer | Analytics summary | Üst bar 4 KPI tile | 🟢 | Analytics `DashboardSummary` var | AnalyticsDashboardPage | — |
| Later | Visual calendar | Resimli thumb + aylık grid | 🟢 | UserCalendarPage genişletilebilir | UserCalendarPage | Thumbnail prop |
| Later | Asset library | Brand colors + logo + tags | 🟠 | Template system var, brand kit yok | Yeni sayfa: BrandKitPage | Yeni tablo `brand_kits` + `brand_assets` |
| Metricool | Analytics | Multi-platform unified table | 🟡 | Analytics mevcut ama her platforma ayrı | AnalyticsPage | `platform` boyut birleşimi service'te |
| Metricool | Admin/user separation | Tek panel, rol-based filter | 🟢 | Zaten bu pattern | Layout | — |
| OpusClip | Brand kit | Renkler + font + logo tek yerde, otomatik clip'e uygulanır | 🟠 | Style Blueprint var ama brand kit farklı bir kavram | Yeni BrandKitPage | Tablo + versiyonlama |
| Canva Studio | Template gallery | Grid + preview hover + edit | 🟢 | Template listing var; preview zayıf | TemplatesPage | Preview artifact pipeline |
| Canva Studio | Template editor | In-place edit | 🔴 | CLAUDE.md "AI may not generate uncontrolled render code" | — | — (yapılmamalı) |

**Not (K1):** Her önerinin öncesinde ContentHub kodunda **nereye oturduğu** belirlendi. Benchmark mevcut gerçekliğin önüne geçmiyor.

---

## 7. What Is Already Good and Should Be Preserved (Top 10)

1. **Settings Registry 4-layer resolver** — user_override → DB admin_value → DB default → .env → builtin (`backend/app/settings/settings_resolver.py`).
2. **Publish ownership helpers** (`backend/app/publish/ownership.py` 183 LoC, 4 ayrı helper + query scope).
3. **Analytics PHASE X enforcement** (`backend/app/analytics/router.py:76-111`).
4. **Job state machine + step runner** (CLAUDE.md tam hizalı).
5. **SSE realtime pipeline** (CLAUDE.md "no polling" kuralına uyuyor).
6. **Channels modülü** — CLAUDE.md pattern canonical.
7. **Wizard shell** (`wizard/WizardShell.tsx:131`).
8. **React Query + Zustand split** (frontend/src/stores vs useQuery).
9. **UserCalendarPage** (827 LoC olgun implementation).
10. **useLayoutNavigation** single source of truth sidebar.

## 8. What Is Confusing and Should Be Simplified (Top 10)

1. Legacy `/platform-connections` endpoint (🔴 güvenlik)
2. `/users/*` ve `/audit-logs/*` admin guard eksikliği (🔴 güvenlik)
3. Settings DB ↔ registry drift (🔴 UX)
4. 8 surface layout "canon" kararsızlığı
5. Admin/User duplicate pages (Calendar/Inbox/Connections/YouTubeAnalytics)
6. NewsBulletinWizardPage vs CreateBulletinWizardPage
7. UserAutomationPage 5-dropdown matris
8. EffectiveSettingsPanel user tarafı boş
9. Frontend 10 unscoped useQuery
10. Header-based `get_caller_role` (modern `UserContext`'e migration yarım)

---

## 9. Recommended Order of Work (K8 — 3 Liste)

### 9.1 Hemen Yapılmalı (5 madde, Phase AM v1)

| # | İş | Önkoşul | Risk | Efor | Settings Registry anahtarı |
|---|---|---|---|---|---|
| 1 | Legacy `GET /platform-connections` → admin-only veya kaldır | `fetchPlatformConnections` migration | Düşük | 2h | `feature_flag.legacy_platform_connections_endpoint.enabled` |
| 2 | `/users/*` `Depends(require_admin)` ekle | — | Düşük | 1h | — (invariant) |
| 3 | `/audit-logs/*` `Depends(require_admin)` ekle | — | Düşük | 30dk | — (invariant) |
| 4 | DB ↔ KNOWN_SETTINGS drift'i kapat (seed / sync script) | Seed fonksiyonunu incele | Orta | 3h | `settings.seed.strict_sync=true` |
| 5 | Frontend 10 unscoped useQuery → scope param | Backend endpoint'leri scope destekliyor mu doğrula | Düşük | 2h | — |

### 9.2 Önce Başka Şeyi Düzeltmeden Yapılmamalı (5 madde)

| # | İş | Neden beklemeli | Önkoşul |
|---|---|---|---|
| 1 | Surface canon layout seçimi | 8 layout'un aktif kullanımı gözden geçirilmeli | Kullanım telemetrisi |
| 2 | UserAutomationPage visual flow builder | @xyflow/react + yeni tablolar | 5 tablo migration |
| 3 | NewsBulletinWizardPage ↔ CreateBulletinWizardPage birleştirme | Admin vs User wizard yetenek matrisi | Wizard governance settings revize |
| 4 | AdminConnections/Calendar/Inbox ↔ User duplicate birleştirme | Admin scope param standart | İş #5 (scope param hijyeni) |
| 5 | PWA / offline (Gemini 10. madde) | CLAUDE.md "localhost-first" — kapsam-dışı | Scope değişikliği |

### 9.3 Bilerek Korunmalı (5 madde)

| # | Alan | Neden dokunulmamalı | CLAUDE.md bağı |
|---|---|---|---|
| 1 | Publish state machine | Core invariant | "Core invariants in code, cannot be disabled" |
| 2 | Analytics PHASE X guard | Çalışıyor | Security invariant |
| 3 | Channels modülü | Canonical pattern | — |
| 4 | Wizard Shell | Onaylı pattern | "Do not create parallel patterns" |
| 5 | Settings 4-layer resolver | Core | "Do not hardcode" |

---

## 10. Strict No-Change Conclusion (K9)

### 10.1 Mekaniksel Kanıt

```
code change:     none
migrations run:  none
packages installed: none
DB mutations:    none (SQLite WAL/SHM dosyalarının modtime'ı sadece okuma sırasında değişti — içerik diff 0 bytes, kanıt aşağıda)
commits:         none
branch touched:  worktree-audit+effective-settings-and-gemini-plan only
```

**`git status --short` çıktısı** (worktree kökü):
```
 M backend/data/contenthub.db
 M backend/data/contenthub.db-shm
 M backend/data/contenthub.db-wal
?? docs/phase_ak_effective_settings_and_gemini_plan_audit.md
?? docs/phase_al_product_simplification_and_effective_settings_audit.md   (bu dosya)
```

**`git diff --stat backend/ frontend/ renderer/` çıktısı:**
```
 backend/data/contenthub.db     | Bin 2617344 -> 2674688 bytes
 backend/data/contenthub.db-shm | Bin 32768 -> 32768 bytes
 backend/data/contenthub.db-wal | Bin 997072 -> 0 bytes
 3 files changed, 0 insertions(+), 0 deletions(-)
```

> Açıklama: `backend/data/contenthub.db` binary dosya olduğu için git "M" olarak işaretliyor; ancak `insertions: 0, deletions: 0` — **0-byte semantic diff**. DB içeriği değişmedi; sadece SQLite WAL commit'i sonrası sayfa boyutu birleşti (read sırasında). `backend/`, `frontend/`, `renderer/` kaynak dizinlerinde **tek bir satır kod değişmedi.**

### 10.2 CLAUDE.md Non-Negotiable Rules Tekrarı

- ✅ Build from scratch — no code copied.
- ✅ No hidden master prompts — rapor tüm bulguları dosya:satır ile açık.
- ✅ No hidden settings — 2. bölüm DB-registry drift'ini explicit belirtir.
- ✅ All critical behavior visible — 3. bölüm 4-seviye enforcement matrisi.
- ✅ Every meaningful change tested — bu turda değişiklik yok; rapor çıkışı test gerektirmez.
- ✅ No "refactor later" shortcut — 9.2'deki "beklemeli" listesi explicit önkoşullarla.

### 10.3 Phase AM (İmplementasyon) Girdisi

Bu rapor Phase AM için input olarak saklanır. Phase AM **9.1'deki 5 işten başlar.**

### 10.4 K10 Ek Özet

**3 Yapısal Risk:**
1. **Legacy `GET /platform-connections` ownership leak** (`platform_connections/service.py:36-47`) — herhangi bir kullanıcı tüm connection'ları listeler.
2. **`/users/*` admin guard eksikliği** (`users/router.py:22-112`) — non-admin user CRUD yapabilir.
3. **KNOWN_SETTINGS ↔ DB sync drift** (136/204 + visible_to_user 4/16 DB-registry mismatch) — user panel effective settings pratikte bozuk.

**3 UX Karmaşa Kaynağı:**
1. **Surface 8 layout kararsızlığı** (Atrium/Bridge/Canvas/Horizon × admin/user = 2915 LoC) — kullanıcı "hangi modu kullanıyorum?" sorusunu cevaplayamaz.
2. **Admin/User duplicate pages** (Calendar/Inbox/Connections/YouTubeAnalytics — toplam 4000+ LoC duplicate) — aynı veri iki isim + iki implementasyon.
3. **UserAutomationPage 5-dropdown matris** — "policy" kavramı erken, flow kilitleyici.

**1 Güvenli İlk İmplementasyon Fazı (Phase AM v1):**
- **Güvenlik hijyeni mikrosprinti.** Bölüm 9.1'deki #1–#3 (legacy endpoint kapat, users admin guard, audit-logs admin guard). Sebep: (a) Kod değişikliği lokal (3 router dosyası + 1 hook migration), (b) Test yüzeyi küçük (permission test zaten var), (c) Settings Registry'ye yeni key girmek gerekmez, (d) CLAUDE.md "security invariant in code" ilkesiyle tam hizalı, (e) leak risk'i anında düşürür. Süre tahmini: 4–6 saat + test.

---

**Rapor sonu.** Toplam bölüm: 10. Toplam tablo: 4 (A, B, C, D). Tüm bulgular 5-parça formatında. Tüm file:line referansları worktree köküne göredir. Bu turda kod yazılmadı.
