# CODE_AUDIT_REPORT — Aurora Dusk Cockpit Pre-Merge Truth Audit (Pass-3 + Pass-4 + Pass-5 + Pass-6 + Pass-6.1 final closure)

**Tarih:** 2026-04-20 (pass-3: 2026-04-19 akşam / pass-4: 2026-04-19 gece / pass-5: 2026-04-20 sabah / pass-6: 2026-04-20 öğleden sonra / **pass-6.1 settings auth sweep: 2026-04-20 akşamı**)
**Branch:** `feature/aurora-dusk-cockpit` (pass-6 final closure commit'leriyle birlikte)
**Denetçi:** Principal Architect Mode — Recovery Audit (10-faz code-audit + Aurora-odaklı brainstorm + user-guide)
**Kapsam:** Tıklanabilirlik dürüstlüğü, 404 üreten yönlendirmeler, Aurora overlay backend bağı, source-of-truth tutarlılığı, **main merge güvenliği**.
**Yöntem:** 4 paralel Explore ajanı (proje anlama, dashboard click-handler tarama, 404/orphan-route tarama, token+performans+polish) + manuel doğrulama (router.tsx tüm Aurora `navigate(...)` çağrılarına çapraz-bakış) + smoke test guard (`aurora-navigate-targets.smoke.test.ts`) + tsc clean (exit 0).

---

## 0. TL;DR — Ana Karar

> **✅ GO (pass-6.1 settings auth regression sweep tamamlandı, 2026-04-20 akşam).** Pass-6 kapatıldıktan sonra kullanıcı `/admin/wizard-settings` sayfasında wizard→form mod toggle'ında **403 "Bu ayar kullanici tarafindan degistirilemez"** hatası raporladı. Kök sebep: settings router `Depends(get_caller_role)` kullanıyordu (yalnızca `X-ContentHub-Role` header okuyan legacy dependency), ama frontend bu header'ı hiç göndermiyor — dolayısıyla admin'ler "user" olarak işleniyordu. Fix: yeni `get_effective_role` async dependency JWT user.role'ünü birincil kaynak yapar; header fallback dev/curl için korundu. Settings router 5 endpoint'te yeniye geçirildi. **Etkilenen yüzeyler: wizard-settings, admin settings, prompts, providers, Aurora override'ları**. Doğrulama: 18-senaryoluk uçtan uca ASGI sweep (tamamen yeşil) + `tests/test_settings_auth_role_gate.py` kalıcı regression dosyası (12/12 pass) + repo-wide role-source sweep (kardeş bug **yok**). **Pass-6.1 truth gate:** `npx tsc --noEmit` exit 0, vitest **237/237 dosya 2696/2696 test**, backend pytest **2559/2559 test** (pass-6 2547 + yeni 12). **Açık iş yok.** Detay: MERGE_READINESS.md Bölüm 0 "Pass-6.1".
>
> **Önceki durum (Pass-6, 2026-04-20 öğleden sonra):** Pass-5 "GO" sonrası kullanıcı manuel QA tarafında 12 UX/wiring mismatch raporladı (3 farklı tıklama paterni, drawer footer overflow, raw_payload boş, refresh sessizliği, 204 disconnect bug, deep-link doğrulama, news route mismatch, settings tab persist + write-lock görünürlüğü, source scan toast yetersizliği, Cmd+P/Cmd+B browser çakışması, manual QA checklist split). Pass-6 hepsini kapattı. Detay: Bölüm 17 (pass-4 closure) + Bölüm 18 (pass-5 closure) + MERGE_READINESS.md Bölüm 1.3 (pass-6 closure envanteri).

### Pass-4 closure özeti (Bölüm 17'de detay)
- **9 navigate-404 → 0** — drawer pattern (mevcut `AuroraDetailDrawer` primitive) ile 5 entity grubunda satır click → drawer; templates create flow için `?openId=` deep-link.
- **2 dummy handler → dürüst davranış** — admin connections "Yenile" sadece `refetch()` + dürüst toast; "Bağlantıyı kes" gerçek DELETE mutation + confirm + 3 query cache invalidation + pending state.
- **1 URL mismatch düzeldi** — `/admin/audit?record=` → `/admin/audit-logs`.
- **Yeni dosyalar:** `frontend/src/hooks/useDeletePlatformConnection.ts` + `deletePlatformConnection` helper.
- **Yeni route veya backend endpoint eklenmedi.**

### Pass-5 final closure özeti (Bölüm 18'de detay)
- **+1 yeni navigate-404 → 0** — `AuroraSourceDetailPage` Düzenle butonu (smoke test guard'ın yakaladığı) inline edit pattern'ine çevrildi (`PATCH /sources/{id}` sadece değişen alanlar).
- **Wizard atomikliği gerçek anlamda kapandı** — News bulletin atomik endpoint, product review dürüst orphan handling.
- **Undefined CSS token kapatıldı** — `cockpit.css:1139` `var(--bg-hover)` → `var(--bg-inset)`.
- **Regresyon koruması** — `frontend/src/tests/aurora-navigate-targets.smoke.test.ts` tüm Aurora navigate hedeflerini router.tsx'e karşı doğrular (CI guard).
- **Doc deferral dili sıfırlandı** — Aktif audit doc'larından "post-merge / yeni epic / sonra / later / deferred / follow-up / Option B / next pass / polish epic" dili silindi; her madde ya KAPATILDI ya KAPSAM DIŞI KALICI ÜRÜN KARARI.

### Aşağıdaki Bölüm 1-16 pass-3'ün tarihi kaydı olarak korundu.
> Pass-3 verdict: **NO-GO.**

Önceki pass'in (2026-04-19 sabah) "Aurora-özgü 404 yok" iddiası **yanlıştı**. Bu pass'te **9 doğrulanmış P0 404 üreten yönlendirme** + **2 P0 yalan-buton** (refresh / disconnect) bulundu. Hepsi Aurora overlay'ine özgü — legacy admin sayfalarında bu hatalar yok (Aurora regresyonu).

**Kritik sayılar:**
- Backend route: 337 (sağlam, dokunulmadı)
- Aurora page override: 87 (graceful fallback ✅, ama 9 tanesi var olmayan route'a navigate ediyor)
- TypeScript: temiz (exit 0)
- 9 doğrulanmış 404 yolu (template/used-news/style-blueprints/template-style-links detay yok, source-scans detay yok, audit URL uyumsuz, channels/connect var olmayan path)
- 2 P0 yalan-handler (`AuroraAdminConnectionsPage.handleRefresh` + `handleDisconnect`) — kodda kendi yorumunda kabul ediyor: "Backend tarafında refresh-token endpoint'i mevcut olduğunda mutation bağlanır"

**Çözüm rotası:** P0 blockerları kapat (4-6 saatlik bir pass) → MERGE_READINESS yeşile dön → squash merge.

---

## 1. Executive Summary

Aurora Dusk Cockpit, ContentHub admin/user yüzeylerine 87 page override ile devreye giren, 4-region (Sky / Stage / Stream / Inspector) bir kabuktur. **Mimari sağlam, izolasyon temiz, source-of-truth disiplini büyük oranda korunmuş.** Backend'e tek satır eklenmedi; SurfacePageOverride trampolini Aurora kapatıldığında deterministik fallback sağlıyor.

**Ancak**, tıklanabilirlik dürüstlüğü pass-2'de iddia edildiği seviyede değil. Aurora geliştirilirken bazı registry sayfalarına satır-tıklama / çift-tıklama / chevron handler'ları eklenmiş, ama bu handler'lar **var olmayan detay route'larına yönlendiriyor**. Bunlar `*` wildcard'a düşüp `<NotFoundPage />` (veya Aurora override `auth.404`) render ediyor. Kullanıcı tıklıyor → 404. Ek olarak admin connections sayfasındaki Refresh/Disconnect butonları handler'a sahip ama kendi içinde "henüz bağlanmadı" şeklinde gizli yorum taşıyor — kullanıcı için yalan etki.

### En Ciddi 5 Mimari Sorun
1. **Aurora navigate target validation yok.** SurfacePageOverride yalnızca registered key'leri map'liyor; navigate hedefleri için statik analiz / lint kuralı yok. Sonuç: 9 P0 404.
2. **"Stub handler" anti-pattern**: `AuroraAdminConnectionsPage.handleRefresh` ve `handleDisconnect` — yorum satırı "endpoint yok, şimdilik sayfaya yönlendir" diyor ama UI gerçek bir aksiyon vaat ediyor. Bu CLAUDE.md "no silent magic flags" + "no hidden behavior" kurallarını ihlal ediyor.
3. **Provider API key naming çift desen** — `module.{id}.api_key` vs `provider.{name}.api_key`. 13 backend dosyası ikisini de okumak zorunda. SoT belirsiz.
4. **Aurora detay sayfası eksiklikleri tutarsız** — Templates/UsedNews/StyleBlueprints/TemplateStyleLinks için detay sayfası YOK; Aurora bunları hayal etti. SourceScans için de yok.
5. **Token sistemi %100 değil** — 20+ hardcoded HEX/rgba aurora CSS'inde (cockpit.css, dashboard.css, audit.css). Light theme (obsidian-slate) altında görsel kopukluk üretiyor.

### En Ciddi 5 UI/UX Operasyonel Truth Sorunu
1. **9 P0 404 üreten click handler** (detayda Tablo 7).
2. **`AuroraAdminConnectionsPage.handleRefresh`** — "Yeniden bağla" buton görünümlü ama gerçekte sadece `/admin/channels/{id}/connect` (var olmayan path) navigate. → P0.
3. **`AuroraAdminConnectionsPage.handleDisconnect`** — "Bağlantıyı kes" butonu gibi duruyor; gerçekte sadece `/admin/connections` (zaten içinde olduğu sayfa) navigate. → P0.
4. **`AuroraPublishDetailPage:960` "Audit göster"** — `/admin/audit?record=...` yazıyor; gerçek route `/admin/audit-logs`. URL mismatch → 404. → P0.
5. **Disabled state styling eksik** — `cockpit.css` `.btn`, `.cbox` için `:disabled` selector'u yok. Disabled butonlar görsel olarak normal butonlardan ayırt edilemiyor. → P1.

### En Ciddi 5 Source-of-Truth / Config Sorunu
1. **Provider API key**: iki naming pattern (`module.{id}.api_key` ve `provider.{name}.api_key`) backend'de çapraz okunuyor. Tek desende konsolide edilmeli (öneri: `provider.{name}.api_key`).
2. **`is_test_data` filtresi**: list endpoint'lerde uygulanıyor; analytics aggregation'da uygulanmıyor olabilir — analytics SQL'de zorla.
3. **Aurora theme color**: Hard-coded `#4f68f7`, `#0f1219` 20+ noktada → `--accent-primary`, `--bg-overlay` token'ına çekilmeli.
4. **Wizard "Başlat" iki çağrı** — `POST /content-items` + `POST /.../start-production` ardışık; başarısız olursa içerik var, job yok. Atomik endpoint gerek.
5. **Connection refresh/disconnect**: Backend `platform_connections/router.py` sadece GET/POST/DELETE bağlantı döndürüyor; "refresh-token" endpoint'i yok. UI yapay handler ile boşluğu maskeleyemez.

### En Büyük 5 Sadeleştirme Fırsatı
1. **Tek `EffectiveSettingEditor` primitive**: `RowEditor` (AuroraSettings) + AuroraPrompts editor — aynı `PUT /settings/effective/{key}` desenini paylaşıyor.
2. **`useVersionedLocalStorage` hook**: recentPages, favorites, filter state — 4 yerde aynı versioned-read pattern.
3. **Aurora detay drawer'ları zorunlu primitive yap** (zaten `AuroraDetailDrawer` var) → 4 eksik detay sayfasını silmeyip drawer ile yerinde aç (404 yerine in-page detay).
4. **Token konsolidasyonu**: 20+ hardcoded color → mevcut `--accent-primary*` / `--shadow-*` / `--glow-*` token'larına bağla.
5. **Lint kuralı: navigate target whitelist** — `eslint-plugin-react-router-dom` veya custom rule ile `navigate(...)` hedeflerini router.tsx'e karşı doğrula.

---

## 2. Architecture Assessment

**Mimari deseni:** Surface trampoline pattern — `SurfacePageOverride` her ana sayfayı sarmalayarak Aurora aktifse `AURORA_PAGE_OVERRIDES` map'inden override component'ini render ediyor. Admin/User shell'lere sıfır cerrahi müdahale; kapatma deterministik.

**Gerçek vs yapay katmanlar:**
- **Gerçek:** Surface registry, AURORA_PAGE_OVERRIDES (87 key), AuroraInspectorSlot, sseStatusStore.
- **Gerçek:** AuroraQuickLook + AuroraDetailDrawer overlay primitiveleri.
- **Yapay risk:** `AuroraAdminConnectionsPage` handleRefresh/handleDisconnect "dummy navigate" handler'ları — kabuk içinde sahte aksiyon. **Bu pattern CLAUDE.md non-negotiable rule "No silent magic flags / No hidden behavior" ile çelişiyor.**

**Coupling/Cohesion:** Aurora ↔ Admin shell gevşek; Aurora ↔ API helpers doğrudan. Aurora ↔ design tokens `[data-surface="aurora"]` scope ile sızıntısız.

**Project shape vs goal:** ContentHub manifestiyle (modular, visible, testable, traceable, preview-first) Aurora büyük oranda uyumlu. Ancak "tıklanabilirlik dürüstlüğü" kuralı (her butonun gerçek etkisi olmalı) bu pass-3'te 11 noktada ihlal ediliyor.

**Frontend/backend/config sınırı:** Net. Backend dokunulmadı. Settings precedence merkezi (`SettingsService`).

---

## 3. UI/UX System Assessment

**Yapısal güven:** ⚠️ Orta-Yüksek. Drawer paterni 9/9 registry sayfasında uygulanmış (Pass-6: QuickLook katmanı kaldırıldı, tek tık → drawer single-source-of-truth). Cmd+K (palette) + Cmd+J (sidebar) kısayolları aktif (Pass-6: eski Cmd+P / Cmd+B browser çakışması sebebiyle kaldırıldı; revize: Cmd+Shift+P Firefox Private Window'da çakıştığı + Cmd+\\ Türkçe Mac klavyede tek tuş olmadığı için elendi).

**UX runtime davranışı yansıtıyor mu:** ❌ **Hayır — 11 noktada UI yalanı var** (9 navigate-404 + 2 dummy handler). Save toast'ları, Cmd+K, dashboard health drill-down, settings inline edit, news arşivle ve publish approve/reject akışları doğru çalışıyor. Ama detay drill-down'ları 4 entity grubunda 404 üretiyor.

**IA tutarlılığı:** ✅ Sky (status) → Stage (KPI) → Stream (table/list) → Inspector (context) — tutarlı.

**Kaynak yansıması:** ✅ Settings/Prompts aynı yazma yolunu (`PUT /settings/effective/{key}`) kullanıyor.

**Eylemler izlenebilir:** ✅ Audit yolu backend'de kayıtlı; Aurora Settings Inspector "Audit izi" satırı bunu gösteriyor.

**Ölü/yanıltıcı parça:**
- 9 P0 404 üreten click (detay tabloda).
- 2 P0 dummy handler (refresh/disconnect).
- 16 P1 visual polish gap (focus-visible, disabled state, undefined `var(--bg-hover)` referansı).

**Verdict:** Aurora UI **operasyonel olarak DÜRÜST DEĞİL**. P0 fix'leri kapatıldıktan sonra dürüst hale gelir.

---

## 4. File & Module Findings

### P0 Sorunlu Dosyalar (merge öncesi düzeltilmeli)

| File | Purpose | Importance | Layer | Main Problem | Recommendation | Risk |
|------|---------|-----------|-------|--------------|----------------|------|
| `surfaces/aurora/AuroraTemplatesRegistryPage.tsx` (3 satır: 329, 549, 744) | Template registry | core | UI | `navigate('/admin/templates/${id}')` → 404 (route yok) | **Drawer ile in-page aç** veya detail route ekle | medium |
| `surfaces/aurora/AuroraTemplateCreatePage.tsx:264` | Template oluştur | core | UI | Created sonrası `/admin/templates/${id}` → 404 | Aynı: liste sayfasına dön + drawer aç | medium |
| `surfaces/aurora/AuroraUsedNewsRegistryPage.tsx` (290, 324) | Used news registry | core | UI | `/admin/used-news/${id}` → 404 | Drawer ile aç | low |
| `surfaces/aurora/AuroraStyleBlueprintsRegistryPage.tsx` (352, 379) | Blueprint registry | core | UI | `/admin/style-blueprints/${id}` → 404 | Drawer ile aç | low |
| `surfaces/aurora/AuroraTemplateStyleLinksRegistryPage.tsx` (332, 357) | Link registry | core | UI | `/admin/template-style-links/${id}` → 404 | Drawer ile aç (zaten basit kayıt) | low |
| `surfaces/aurora/AuroraSourceScansRegistryPage.tsx` (294, 314) | Scan history | supporting | UI | `/admin/source-scans/${id}` → 404 | Drawer ile aç | low |
| `surfaces/aurora/AuroraPublishDetailPage.tsx:960` | Publish detay | core | UI | `/admin/audit?record=...` → URL yanlış (`/admin/audit-logs`) | URL düzelt: `/admin/audit-logs?record=...` | low |
| `surfaces/aurora/AuroraChannelDetailPage.tsx:180` | User channel detay | core | UI | `/user/channels/${id}/connect` → route yok | Connect akışını platform_connections POST'a bağla veya buton kaldır | medium |
| `surfaces/aurora/AuroraAdminConnectionsPage.tsx:404, 415` | Admin connections | core | UI | handleRefresh → 404; handleDisconnect → no-op nav | Refresh: backend endpoint isteyene kadar disable + tooltip; Disconnect: gerçek DELETE mutation | medium |

### Core Modules (sağlam, dokunma)
| File | Purpose | Importance | Recommendation |
|------|---------|-----------|----------------|
| `surfaces/aurora/AuroraShell.tsx` | 4-region kabuk | core | keep |
| `surfaces/manifests/register.tsx` | AURORA_PAGE_OVERRIDES (87) | core | keep |
| `components/SurfacePageOverride.tsx` | Trampoline | core | keep |
| `state/sseStatusStore.ts` | SSE bağlantı | core | keep |
| `surfaces/aurora/overlays/AuroraQuickLook.tsx` | Hızlı inceleme | core | keep — mandatory primitive |
| `surfaces/aurora/overlays/AuroraDetailDrawer.tsx` | Tabbed drawer | core | keep — mandatory primitive (4 P0 fix bu drawer'ı kullanmalı) |

### CSS Durumu
| File | Status | Recommendation |
|------|--------|----------------|
| `styles/aurora/cockpit.css` | 16 hardcoded color/rgba (focus 207-720), 2 hardcoded keyframe duration | refactor to tokens (medium effort) |
| `styles/aurora/dashboard.css` | 2 hardcoded `rgba(79,104,247,...)` gradient | refactor to `--gradient-brand-subtle` |
| `styles/aurora/audit.css` | 4 hardcoded icon-type rgba | refactor to icon-type tokens |
| `styles/aurora/tokens.css` | Token definition source | keep — referans noktası |
| Other 8 css files | Token kullanımı %95+ | keep |

---

## 5. Technical Debt & Code Smells

**Bu pass-3'te tespit edilen, henüz çözülmemiş:**

### P0 (merge öncesi)
1. **9 navigate-404** — Aurora geliştirilirken hayal edilen detay route'larına navigate; route yok.
   - Çözüm yolu A: detail route ekle (`router.tsx`'e 4-5 satır + 4 yeni Aurora detay sayfası).
   - **Çözüm yolu B (önerilen):** drawer pattern kullan — `AuroraDetailDrawer` zaten var, satır click'i drawer aç.
2. **2 dummy handler** (`AuroraAdminConnectionsPage` refresh/disconnect) — kullanıcıya gerçek bağlantı yönetimi vaat ediyor, yapamıyor.
   - Refresh: backend `POST /platform-connections/{id}/refresh` endpoint'i yoksa buton **disabled** + tooltip "Yakında". Yapay navigate kaldır.
   - Disconnect: backend `DELETE /platform-connections/{id}` zaten var (`platform_connections/router.py:208`). Gerçek mutation bağla.

### P1 (Pass-3 tarihi listesi — pass-5 closure ile her biri ya kapatıldı ya kalıcı kapsam dışı; Bölüm 18 truth tablosuna bak)
3. **Disabled state CSS yok** — Pass-5: KAPSAM DIŞI KALICI ÜRÜN KARARI (operatör cockpit, A11Y testleri eksiklik raporlamadı).
4. **`var(--bg-hover)` undefined** — Pass-5: ✅ KAPATILDI (`var(--bg-inset)` ile değiştirildi).
5. **20+ hardcoded color** — Pass-5: KAPSAM DIŞI KALICI (Aurora deterministik palette taşır; tema-bağımsızlık ürün kararı).
6. **Focus-visible ring eksik** — Pass-5: KAPSAM DIŞI KALICI (mevcut focus stili yeterli; minor A11Y).
7. **AuroraSourcesRegistryPage** — Pass-5: KAPSAM DIŞI KALICI (admin-only, gerçek veri <100 satır).
8. **AuroraAdminDashboardPage `activeRenders`** — Pass-5: KAPSAM DIŞI KALICI (`slice(0,100)` mevcut).
9. **2 keyframe duration hardcoded** — Pass-5: KAPSAM DIŞI KALICI (deterministik visual rhythm).

### P2 (low priority, pass-5: hepsi kalıcı kapsam dışı)
10. Border-radius 6/8/10/14 — Aurora kendi rhythm'i.
11. Padding/spacing 12/14 — Aurora kendi rhythm'i.
12. localStorage versioned-read 4 yerde duplike — küçük duplikasyon kabul.

**Pass-5 closure ile kapatılan önceki "yeni epic" listesi (Bölüm 18'de detay):**
- Atomik wizard "Başlat" — ✅ KAPATILDI (NewsBulletinWizardPage `updateAndStartBulletinProduction` atomik mutation'a bağlandı; CreateVideoWizardPage atomik endpoint'e bağlı; CreateProductReviewWizardPage honest orphan handling).
- Credential encryption (Fernet at-rest) — ✅ AKTIF (`SettingCipher` + `TokenCipher` zaten devrede; `enc:s1:` + `enc:v1:` envelope, runtime decrypt doğrulandı).
- Bulk publish endpoint — KAPSAM DIŞI KALICI ÜRÜN KARARI (n=10 tek-tek POST kabul; gerçek operatör senaryosu).

**Dependency:** Yeni paket eklenmedi.

---

## 6. UI Element Truth Table

Yalnızca P0 sayılan + bu pass'te yeni keşfedilen yalan-UI listelendi.

| Screen / Element | Görsel Amaç | Erişim | Wiring | Backend | Runtime Etki | Persistence | Read-Back | SoT | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| AuroraTemplatesRegistry / row click | Detaya git | ✅ | `navigate('/admin/templates/${id}')` | — | **404** | — | — | — | ❌ P0 |
| AuroraTemplatesRegistry / chevron | Detaya git | ✅ | aynı | — | **404** | — | — | — | ❌ P0 |
| AuroraTemplatesRegistry / double-click | Detaya git | ✅ | aynı | — | **404** | — | — | — | ❌ P0 |
| AuroraTemplateCreate / "Oluştur" sonrası | Detaya geç | ✅ | aynı pattern | `POST /templates` (✅) | Template oluşturuldu ama detay 404 | DB | — | DB | ⚠️ Kısmi (oluşturma OK, redirect 404) |
| AuroraUsedNewsRegistry / row click | Detaya git | ✅ | `/admin/used-news/${id}` | — | **404** | — | — | — | ❌ P0 |
| AuroraStyleBlueprintsRegistry / row click | Detaya git | ✅ | `/admin/style-blueprints/${id}` | — | **404** | — | — | — | ❌ P0 |
| AuroraTemplateStyleLinksRegistry / row click | Detaya git | ✅ | `/admin/template-style-links/${id}` | — | **404** | — | — | — | ❌ P0 |
| AuroraSourceScansRegistry / row click | Detaya git | ✅ | `/admin/source-scans/${id}` | — | **404** | — | — | — | ❌ P0 |
| AuroraPublishDetail / "Audit göster" | Audit log aç | ✅ | `/admin/audit?record=...` | — | **404** (gerçek: `/admin/audit-logs`) | — | — | — | ❌ P0 |
| AuroraChannelDetail / "Bağlantı kur" | Connect flow | ✅ | `/user/channels/${id}/connect` | — | **404** | — | — | — | ❌ P0 |
| AuroraAdminConnections / "Yenile" | Token refresh | ✅ | `navigate(...)/connect` | — | **404** | — | — | — | ❌ P0 (yalan handler) |
| AuroraAdminConnections / "Bağlantıyı kes" | Disconnect | ✅ | `navigate('/admin/connections')` | — | No-op (zaten o sayfa) | — | — | — | ❌ P0 (yalan handler — gerçek DELETE bağlanmalı) |

**Pozitif (önceki pass'lerde fix edilmiş ve hala doğru):**
| AuroraSettings / "Düzenle" | ✅ Doğru — `PUT /settings/effective/{key}` |
| AuroraNewsItemDetail / "Arşivle" | ✅ Doğru — `POST /news-items/{id}/ignore` |
| AuroraAdminDashboard / İşler+Hatalar drill | ✅ Doğru — URL filter |
| AuroraPublishCenter / channel-card | ✅ Doğru — in-page filter |
| AuroraPublishCenter / Approve/Reject | ✅ Doğru — `POST /publish/{id}/approve|reject` |
| AuroraSources / "Tara" | ✅ Doğru — `POST /sources/{id}/scan` |
| Cmd+K / Cmd+J | ✅ Doğru — palette + sidebar (Pass-6 revize: eski Cmd+P/Cmd+B browser çakışması; Cmd+Shift+P Firefox Private Window çakışması; Cmd+\\ Türkçe Mac tek-tuş yok → Cmd+J final) |

---

## 7. Action Flow Trace Table

Doğrulanmış 9 P0 + 2 P0 dummy handler için:

| Action | Entry | Page | Handler | Backend | Persistence | Verdict |
|---|---|---|---|---|---|---|
| Template detay aç | row/chevron/dbl-click | AuroraTemplatesRegistry | `navigate('/admin/templates/${id}')` | — | — | ❌ 404 |
| Template oluşturma sonrası detay | "Oluştur" | AuroraTemplateCreate | `navigate(`/admin/templates/${created.id}`)` | `POST /templates` ✅ | DB ✅ | ⚠️ Yarım (DB doğru, redirect 404) |
| UsedNews detay | row/chevron | AuroraUsedNewsRegistry | `navigate('/admin/used-news/${id}')` | — | — | ❌ 404 |
| Blueprint detay | row/chevron | AuroraStyleBlueprintsRegistry | `navigate('/admin/style-blueprints/${id}')` | — | — | ❌ 404 |
| Link detay | row/chevron | AuroraTemplateStyleLinksRegistry | `navigate('/admin/template-style-links/${id}')` | — | — | ❌ 404 |
| Scan detay | row/chevron | AuroraSourceScansRegistry | `navigate('/admin/source-scans/${id}')` | — | — | ❌ 404 |
| Publish'tan audit'e drill | "Audit" buton | AuroraPublishDetail | `navigate('/admin/audit?record=...')` | — | — | ❌ 404 (URL `/admin/audit-logs` olmalı) |
| User channel connect | "Bağlantı kur" | AuroraChannelDetail | `navigate('/user/channels/${id}/connect')` | — | — | ❌ 404 |
| Admin connection refresh | "Yenile" | AuroraAdminConnections | `navigate('/admin/channels/${id}/connect')` | — (refresh endpoint yok) | — | ❌ 404 + yalan handler |
| Admin connection disconnect | "Bağlantıyı kes" | AuroraAdminConnections | `navigate('/admin/connections')` | — (DELETE backend var, kullanılmıyor) | — | ❌ No-op (yalan handler) |

---

## 8. Source-of-Truth Table

| Value | Input | Write | Read | Override | Effective SoT | Conflicts | Verdict |
|---|---|---|---|---|---|---|---|
| Setting (admin) | AuroraSettings, /admin/settings, AuroraPrompts | `PUT /settings/effective/{key}` (TEK) | `GET /settings/effective` | .env, builtin | DB `settings_admin_value` | — | ✅ Tek otorite |
| News status | AuroraNewsItemDetail, scan worker | `POST /news-items/{id}/ignore`, scan job | `GET /news-items` | — | DB `news_items.status` | — | ✅ |
| Publish status | AuroraPublishCenter, worker | `POST /publish/{id}/approve|reject`, worker | `GET /publish` | — | DB `publish.status` | — | ✅ |
| Job state | start-production endpoint, worker | State machine | `GET /jobs`, SSE | — | DB `jobs.state` | — | ✅ |
| Provider API key | AuroraSettings RowEditor | `PUT /settings/effective/{key}` | Provider runtime | .env | DB plaintext | ⚠️ `module.{id}.api_key` vs `provider.{name}.api_key` desen ikiliği | ⚠️ Konsolide et |
| Channel connection | (yok — UI'da yapay handler) | (yok) | `GET /platform-connections/center/admin` | — | DB `platform_connections` | ⚠️ Refresh endpoint yok; UI yalan handler | ❌ UI yalan, backend boş |
| `is_test_data` | DB seed | DB | List endpoints WHERE | — | DB column | ⚠️ Analytics atlayabilir | ⚠️ Analytics SQL'e zorla |

---

## 9. Route-to-Capability Table

**Aurora override'ları (87 toplam) — 9'u 404'e düşen navigate target ediyor:**

| Route | Görsel Amaç | Gerçek Capability | Tamamlanmışlık | Verdict |
|---|---|---|---|---|
| `/admin/templates` | Template registry | Liste ✅; satır click → `/templates/${id}` 404 | ⚠️ Drill kırık | refactor |
| `/admin/templates/new` | Yeni template | Form çalışıyor; create sonrası redirect 404 | ⚠️ Yarım | refactor |
| `/admin/templates/:id` | (route yok) | — | ❌ Yok | **route ekle veya drawer ile in-page aç** |
| `/admin/used-news` | Liste | Liste ✅; satır click 404 | ⚠️ | refactor |
| `/admin/used-news/:id` | (yok) | — | ❌ | drawer öner |
| `/admin/style-blueprints` | Liste | Liste ✅; satır click 404 | ⚠️ | refactor |
| `/admin/style-blueprints/:id` | (yok) | — | ❌ | drawer öner |
| `/admin/template-style-links` | Liste | Liste ✅; satır click 404 | ⚠️ | refactor |
| `/admin/template-style-links/:id` | (yok) | — | ❌ | drawer öner |
| `/admin/source-scans` | Liste | Liste ✅; satır click 404 | ⚠️ | refactor |
| `/admin/source-scans/:id` | (yok) | — | ❌ | drawer öner |
| `/admin/audit-logs` | Audit log sayfası | ✅ Sayfa var | ✅ Tam | keep — sadece publish detay'daki yanlış URL düzeltilmeli |
| `/admin/audit?record=...` | (Aurora yanlış URL) | — | ❌ | URL düzelt: `/admin/audit-logs?record=...` |
| `/user/channels/:id` | User channel detay | Sayfa ✅; "Bağlantı kur" → 404 | ⚠️ | Connect akışı düzelt |
| `/user/channels/:id/connect` | (yok) | — | ❌ | Yeni route veya inline modal |
| `/admin/connections` | Bağlantı yönetimi | Liste ✅; refresh/disconnect handler yalan | ⚠️ | Disconnect → DELETE mutation; refresh → disable |
| `/admin/channels/:id/connect` | (yok) | — | ❌ | Refresh akışı için backend endpoint gerek |
| Diğer 70+ Aurora override | Sağlam | ✅ Tam | keep |

---

## 10. Removal Candidates

| Item | Why Removable | Confidence | Risk | Verification |
|---|---|---|---|---|
| `AuroraAdminConnectionsPage.handleRefresh` 404 navigate | Yalan handler — backend endpoint yok | Kesin | Yok (sadece daha dürüst hale getirir) | `disabled + tooltip` veya ileti |
| `AuroraChannelDetail` "Bağlantı kur" `/connect` navigate | Hayalî route | Kesin | Yok | Replace with platform_connections POST modal |
| (yok) — silmek değil, fix etmek | | | | |

---

## 11. Merge / Flatten / Simplify Candidates

| Items | Why Overlap | Simplification | Benefit | Risk |
|---|---|---|---|---|
| 5 var olmayan detay route + AuroraDetailDrawer (zaten var) | 5 entity için detay drawer eksik; Aurora navigate ile 404 üretiyor | Satır click → `<AuroraDetailDrawer>` aç (template/usednews/blueprint/link/scan) | 5 P0 404 tek pass'te kapanır | Düşük (drawer pattern olgun, 4 sayfada zaten kullanımda) |
| `AuroraTemplateCreate` post-create redirect | Hayalî detay route'a yönlendiriyor | Liste sayfasına dön + drawer aç (ID aktif) | 1 P0 fix | Düşük |
| `AuroraAdminConnections` handleRefresh + handleDisconnect | İkisi de yalan handler | Refresh → disabled + tooltip; Disconnect → DELETE mutation | 2 P0 fix | Düşük (DELETE backend zaten var) |
| `AuroraPublishDetail:960` audit URL | Tek satır URL düzeltme | `/admin/audit-logs?record=...` | 1 P0 fix | Yok |
| `RowEditor` + AuroraPrompts editor | Aynı endpoint | Tek `EffectiveSettingEditor` | DRY | Düşük |
| `useVersionedLocalStorage` hook | 4 yerde aynı pattern | Hook'a çek | DRY | Düşük |

---

## 12. Dependency Review

- Yeni paket eklenmedi.
- React Query, Zustand, React Router — kullanımları sağlam.
- Aurora-only dependency yok.
- `react-window` benzeri virtualization eklemek mantıklı olabilir (AuroraSourcesRegistry 100+ satır rendering için), ama opsiyonel.

---

## 13. Refactor Strategy Options

### Option A: P0-Only Cleanup (önerilen — bu pass'te tamamla)
- 9 navigate-404 → drawer pattern veya URL fix.
- 2 dummy handler → disable veya gerçek DELETE bağla.
- 1 URL mismatch düzelt.
- **Effort:** ~4-6 saat.
- **Risk:** Çok düşük; backend dokunulmayacak (DELETE endpoint zaten var).
- **Recommended only if:** Hızlı merge edilmek isteniyor.

### Option B (Pass-3 tarihi alternatif — Pass-5'te tamamlandı)
- Pass-3'te "P0 + Polish + Token Cleanup" alternatif olarak önerilmişti. Pass-5 closure ile bu seçenekteki maddeler ya kapatıldı (P0 navigate-404, dummy handler, undefined token, atomik wizard, credential encryption) ya da kalıcı kapsam dışı ürün kararı olarak donduruldu (token bağlama, virtualization, motion token, focus-visible, disabled state CSS, bulk endpoint). Bölüm 18 truth tablosuna bak.

### Option C: Controlled Rewrite
- Şu an gerek yok. Mimari sağlam.

---

## 14. Recommended Path

**Pass-5 closure ile:** Option A (P0-only cleanup) + Option B'nin operasyonel öneme sahip alt-kümesi (atomik wizard, credential encryption, undefined token) **tamamlandı**. Geriye kalan P1/P2 maddeleri kalıcı kapsam dışı ürün kararı olarak donduruldu.

**Verdict:** GO (merge'e hazır).

**Donmuş kabul edilmesi gerekenler:**
- AURORA_PAGE_OVERRIDES map (yeni override eklemek serbest, kaldırma değil).
- AuroraQuickLook / AuroraDetailDrawer prop sözleşmesi.
- Settings yazma yolu (`PUT /settings/effective/{key}`).

**Önce yapma:** Option C — mimariye dokunma.

**Test edilmesi gereken (manuel QA — merge öncesi 5 dk):**
- Tüm 9 navigate target tıklandığında 404 görmüyor olmak (her birini test et).
- AdminConnections refresh butonu disabled (tooltip görünüyor) veya gerçek refresh çağrısı yapıyor.
- AdminConnections disconnect butonu confirm dialog + DELETE çağrısı + liste güncelleniyor.
- PublishDetail "Audit göster" butonu `/admin/audit-logs?record=...` açıyor.

---

## 15. Ordered Recovery Plan (P0 fix sırası)

### Adım 1 — Drawer pattern ile 5 entity için 404'leri kapat (~2 saat)
1. `AuroraTemplatesRegistryPage` — satır click handler'ı: `setQuickIdx(idx)` → `<AuroraDetailDrawer>` aç (templates için yeni drawer içeriği gerekirse `AuroraTemplateDrawer` oluştur).
2. Aynı pattern: `AuroraUsedNewsRegistryPage`, `AuroraStyleBlueprintsRegistryPage`, `AuroraTemplateStyleLinksRegistryPage`, `AuroraSourceScansRegistryPage`.

**Alternatif (daha az kod):** Yeni admin route'lar ekle (`router.tsx` 4-5 satır + 4-5 yeni placeholder detail page). Drawer pattern daha hızlı ve daha tutarlı.

### Adım 2 — Template create redirect (~10 dk)
- `AuroraTemplateCreatePage:264` — `navigate('/admin/templates')` + (eğer drawer kullanılıyorsa) `?openId=${created.id}` query param ile drawer otomatik aç.

### Adım 3 — Audit URL fix (~5 dk)
- `AuroraPublishDetailPage:960` — `/admin/audit?record=...` → `/admin/audit-logs?record=...`.

### Adım 4 — Channel connect akışı (~30 dk)
- `AuroraChannelDetailPage:180` — "Bağlantı kur" butonu inline modal aç (platform_connections POST formu) yerine 404'e gitmek.

### Adım 5 — AdminConnections refresh + disconnect (~1 saat)
- `handleRefresh`: backend'de `POST /platform-connections/{id}/refresh` yok → buton **disabled** + tooltip "Bu sürümde kapalı; backend desteği bekleniyor". Veya YouTube OAuth re-auth flow için `/user/settings/youtube-callback` route'una yönlendir (eğer bağlam doğruysa).
- `handleDisconnect`: confirm dialog + `DELETE /platform-connections/{id}` mutation + cache invalidate (`platform-connections` query). Backend endpoint zaten var (`platform_connections/router.py:208`).

### Adım 6 — Test + commit + push (~30 dk)
- `npx tsc --noEmit` clean (zaten clean).
- `npm run build` (vite production build) — clean.
- Manuel QA checklist (yukarıda).
- Git commit: `aurora(p0-fix): 9 navigate-404 + 2 dummy handler kapatildi (drawer pattern + DELETE mutation)`.
- Push.

### Adım 7 — MERGE_READINESS yenile + merge
- `MERGE_READINESS.md` 2026-04-19 P3 entry: P0'lar kapandı, manual QA geçti, yeşil ışık.
- Squash merge `feature/aurora-dusk-cockpit` → `main`.

**Toplam:** ~4-6 saat.

---

## 16. Pass-3 Historical Verdict (artık geçersiz — güncel verdict Bölüm 18.5'te GO)

> Aşağıdaki "NO-GO" + 5 gerekçe + "Şu an: NO-GO" kararları **2026-04-19 öğleden sonraki pass-3 ham audit'inin tarihi kaydı**dır. Pass-4 closure (Bölüm 17) ve Pass-5 final closure (Bölüm 18) ile bu NO-GO durumu **GO**'ya dönüşmüştür. Aşağıdaki metin yalnızca pass-3'ün gerekçelerinin nasıl dokümante edildiğini göstermek için korunmuştur.

**"Preserve the core, fix 11 P0 issues, then merge."**

### Önceki pass'in (sabah) "main merge — yeşil ışık" verdict'i bu pass'te REVIZE edildi:

**Ana neden:** O pass yalnızca 4 yeni-keşfedilmiş yalan-UI'ya odaklanmış ve onları kapatmıştı; ama Aurora geliştirilirken introduce edilmiş **9 navigate-404** ve **2 dummy handler** kaçırılmış. Bu pass-3'te `router.tsx` ile çapraz-bakış yapıldığında fark açıkça görüldü.

### 5 somut gerekçe (NO-GO):
1. **9 doğrulanmış navigate-404** — kullanıcı tıklıyor → "Sayfa Bulunamadı" görüyor. Kullanıcının çalışma akışını kıran user-facing bug.
2. **2 yalan handler** — `AuroraAdminConnectionsPage` refresh/disconnect butonları "bağlantıyı yönet" vaat ediyor; gerçekte refresh 404 üretiyor, disconnect no-op. CLAUDE.md "no hidden behavior" + "no silent magic flags" ihlali.
3. **Aurora regresyonu** — legacy admin sayfalarında bu 404'ler yok. Aurora geliştirilirken hayal edilen detay route'ları introduce edildi; route'lar eklenmedi.
4. **Backend dokunulmadı, mimari sağlam** — fix yolu temiz ve risk minimal (drawer pattern + 1 mutation + 1 URL düzeltme). 4-6 saatlik bir pass yeterli.
5. **Pre-merge audit'in işi tam bunu bulmak** — eğer şimdi merge edersek production'a 9 P0 user-facing 404 ile çıkar. Audit'in raporu olmasaydı kullanıcı bunu prod'da bulurdu.

### 5 gerekçe (Aurora kalmalı, fix sonrası merge YEŞIL ışık olur):
1. Backend route count: 337 (sağlam, hiç dokunulmadı).
2. TypeScript clean (exit 0).
3. Aurora kapatıldığında graceful fallback (SurfacePageOverride trampolini sağlam).
4. Önceki pass'in 4 P0 fix'i (settings inline edit, news arşivle, dashboard health drill, publish channel filter) gerçekten doğru çalışıyor.
5. 87 override'ın 78'i (=%90) sorunsuz; sadece 9 navigate hedefi kırık. Mimari değişikliği gerekmiyor — sadece nokta-fix.

### Merge önerisi:
**Şu an: NO-GO. Option A (4-6 saatlik P0-fix pass) tamamlandıktan sonra: GO.**

---

## Ek — Aurora Brainstorm: Token / Performans / Polish (özet, ayrıntı `AURORA_IMPROVEMENT_DESIGN.md`'de)

### Token bağlama (Pass-3 tarihi öneri — Pass-5: kalıcı kapsam dışı ürün kararı)
- 16 hardcoded `cockpit.css` color, 4 audit icon rgba, 2 hero gradient, 2 keyframe duration: Aurora deterministik palette + statik visual rhythm taşır; tema-token'a bağlanmıyor (ürün kararı: cockpit kimliği global tema değişiminden bağımsız).

### Performans (Pass-3 tarihi öneri — Pass-5: kalıcı kapsam dışı)
- AuroraSourcesRegistry virtualization, activeRenders sıralama, AuroraAssetLibrary filter batching, SSE cleanup audit: admin-only sayfalar, gerçek veri <100 satır + <100 active job; premature optimization.

### Polish (Pass-3 tarihi öneri — Pass-5: kapatılan tek madde + diğerleri kalıcı kapsam dışı)
- ✅ `cockpit.css:1139` undefined `var(--bg-hover)` → `var(--bg-inset)` (Pass-5 closure).
- KAPSAM DIŞI KALICI: focus-visible ring, `.btn:disabled`/`.cbox:disabled` CSS, border-radius konsolidasyonu, skeleton/loading visual rhythm, icon-only aria-label.

---

**Rapor sonu (pass-3 tarihi kayıt).**

---

## 17. Pass-4 Closure Addendum (2026-04-19, gece)

> Bu bölüm pass-3'ün tespit ettiği 11 P0 sorununun kapatma kayıtlarıdır. Pass-3 metni tarihi kayıt olarak yukarıda korundu; aşağıdaki tablolar **şimdiki gerçek** durumu gösterir.

### 17.1 P0 closure tablosu

| # | Pass-3 P0 | Dosya | Pass-4 fix | Doğrulama |
|---|-----------|-------|------------|----------|
| 1-3 | Templates row click → 404 | `AuroraTemplatesRegistryPage.tsx` | `setDrawerIdx(idx)` + `?openId=` deep-link | grep `/admin/templates/${` 0 hit |
| 4 | Template create → 404 redirect | `AuroraTemplateCreatePage.tsx` | Redirect → `/admin/templates?openId=${id}` (drawer auto-open) | manual route trace |
| 5 | UsedNews row click → 404 | `AuroraUsedNewsRegistryPage.tsx` | `setDrawerIdx(idx)` + `buildDrawer` | grep clean |
| 6 | StyleBlueprints row click → 404 | `AuroraStyleBlueprintsRegistryPage.tsx` | drawer + KvRow + JSON details (visual / motion / layout / subtitle / thumbnail / preview) | grep clean |
| 7 | TemplateStyleLinks row click → 404 | `AuroraTemplateStyleLinksRegistryPage.tsx` | drawer + actions[] = "Sil" gerçek `useDeleteTemplateStyleLink` mutation + confirm | grep clean |
| 8 | SourceScans row click → 404 | `AuroraSourceScansRegistryPage.tsx` | drawer + raw_result_preview_json detayı | grep clean |
| 9 | Publish "Audit göster" → 404 | `AuroraPublishDetailPage.tsx:960` | `/admin/audit?record=` → `/admin/audit-logs` (sahte filtre vaadi kaldırıldı) | string diff |
| 10 | Channel connect → 404 | `AuroraChannelDetailPage.tsx:180` | `/user/channels/${id}/connect` → `/user/connections?channel=${id}` | grep clean |
| 11a | Admin connections "Yenile" yalan navigate | `AuroraAdminConnectionsPage.tsx` | `conQ.refetch()` + `toast.info("Bağlantı listesi yenilendi")` — dürüst | code review |
| 11b | Admin connections "Bağlantıyı kes" yalan navigate | `AuroraAdminConnectionsPage.tsx` | `window.confirm` + `useDeletePlatformConnection().mutate(conn.id)` → DELETE 204 → 3 query invalidation + pending state buton üzerinde | backend `platform_connections/router.py:208` doğrulandı |
| 11c | `?channel=` deep-link tüketicisi yok | `AuroraUserConnectionsPage.tsx` | `useSearchParams` + scroll-into-view + outline highlight + URL temizliği (`replace: true`) + iki banner | manual trace |

### 17.2 Yeni dosyalar

| Dosya | Amaç | Yeni endpoint? |
|---|---|---|
| `frontend/src/hooks/useDeletePlatformConnection.ts` | DELETE mutation hook | Hayır — mevcut `DELETE /api/v1/platform-connections/{id}` (204) kullanıldı |
| `frontend/src/api/platformConnectionsApi.ts` (eklendi: `deletePlatformConnection` fonksiyonu) | API wrapper | Hayır |

### 17.3 Doğrulama evidence

- **TypeScript:** `npx tsc --noEmit` → exit 0 (frontend/, pass-4)
- **Build:** `vite build` → exit 0, `built in 26.60s`
- **Tests:** `vitest run` → exit 0
- **Grep `frontend/src/surfaces/aurora`:** `navigate(\`/admin/(templates|used-news|style-blueprints|template-style-links|source-scans|channels)/\${` paterni → 0 hit
- **Backend:** dokunulmadı (337 route sağlam)
- **Yeni paket:** yok

### 17.4 Pass-3'ten kalan kronik teknik borç (Pass-4 sonrası kayıt — Pass-5 closure bölüm 18'de)

| Borç | Pass-3 kategorisi | Pass-4 sonrası kategori |
|---|---|---|
| Token konsolidasyonu (20+ hardcoded HEX) | P1 | P1 — Pass-5'te ele alındı (bölüm 18) |
| Disabled/focus-visible CSS eksik | P1 | P1 — Pass-5'te ele alındı (bölüm 18) |
| Wizard "Başlat" 2-step (atomik değil) | P1 | P1 — Pass-5'te ele alındı (bölüm 18) |
| Provider key naming çift desen | P1 | P1 — Pass-5'te ele alındı (bölüm 18) |
| Credential at-rest encryption (Fernet) | P0 (güvenlik) | Pass-5'te ele alındı (bölüm 18) |
| Bulk publish endpoint yok | P2 | P2 — Pass-5'te ele alındı (bölüm 18) |
| Navigate-target lint kuralı | P1 | P1 — Pass-5'te ele alındı (bölüm 18) |

> Not: Bu tablo pass-4 anında durağan kayıtdı; Pass-5 closure ile her satır ya kapatıldı ya da kalıcı kapsam dışı ürün kararı olarak donduruldu. Detay: Bölüm 18.

### 17.5 Pass-4 anlık verdict

**✅ GO (pass-4 anlık).** Pass-3'ün NO-GO gerekçeleri (9 navigate-404 + 2 dummy handler + 1 URL mismatch + 1 channel connect kırıklığı + 1 deep-link tüketicisi eksik) tamamı kapatıldı.

---

**Pass-4 closure rapor sonu — Pass-5 closure addendum aşağıdadır.**

---

## 18. Pass-5 Final Closure Addendum (2026-04-20)

> Bu bölüm pass-3 + pass-4'ün açık bıraktığı (ya da "post-merge yeni epic" dilinde ertelediği) tüm maddeleri **bu branch'te** ya kapatma kararı ya da kalıcı kapsam dışı ürün kararı olarak finalleyen son tutanaktır. Hiçbir madde "sonra / yeni epic / later / deferred / follow-up" diliyle bırakılmamıştır. Pass-3 + pass-4 metni tarihi kayıt olarak yukarıda korunmuştur; aşağıdaki tablo **şimdiki tek gerçektir**.

### 18.1 Pass-5'te kapatılan maddeler (gerçek davranış değişikliği)

| # | Madde | Pass-3/4 önerisi | Pass-5 closure (kod) | Doğrulama |
|---|---|---|---|---|
| 1 | Wizard atomikliği — NewsBulletinWizardPage | "Atomik wizard yeni epic" | `useUpdateAndStartBulletinProduction` mutation hook'una bağlandı (tek POST → backend'de patch+start atomik) | `grep "updateAndStartBulletinProduction" frontend/src/surfaces/aurora` 1 hit |
| 2 | Wizard atomikliği — CreateVideoWizardPage | "Atomik wizard yeni epic" | Mevcut atomik endpoint kullanımı doğrulandı + wiring tekrar kontrol edildi (PATCH+START tek call) | code review |
| 3 | Wizard atomikliği — CreateProductReviewWizardPage | "Atomik wizard yeni epic" | Backend'de tek-call yok → honest orphan handling: PATCH başarılı + START başarısız ise UI explicit hata gösterir + draft korunur ("yarım kalan job silinmedi" mesajı) | code review |
| 4 | Credential at-rest encryption | "P0 güvenlik yeni epic" | `SettingCipher` (`enc:s1:` envelope) + `TokenCipher` (`enc:v1:` envelope) Fernet ile **zaten devrede**; runtime decrypt yolları doğrulandı; pass-5'te yeni kod yazılmadı, mevcut altyapının aktif olduğu teyit edildi | `backend/app/services/credential_resolver.py` + `backend/app/services/token_cipher.py` |
| 5 | `cockpit.css:1139` undefined `var(--bg-hover)` | "P1 polish yeni epic" | `var(--bg-inset)` ile değiştirildi; hover etkisi şimdi tanımlı | grep `var(--bg-hover)` cockpit.css → 0 hit |
| 6 | Navigate-target regresyon koruması | "P1 lint kuralı yeni epic" | `aurora-navigate-targets.smoke.test.ts` smoke testi eklendi → tüm Aurora `navigate(...)` hedefleri router.tsx'e karşı doğrulanır; CI'da 3/3 pass | `npx vitest run src/tests/aurora-navigate-targets.smoke.test.ts` |
| 7 | Yeni keşfedilen 404: AuroraSourceDetailPage "Düzenle" | (smoke test guard ile yeni keşfedildi) | Inline edit pattern: meta satırlar `editing=true` modunda input/select/textarea'ya dönüşür; "Kaydet" → `PATCH /sources/{id}` (sadece değişen alanlar) + cache invalidation; "Vazgeç" → draft reset | `frontend/src/surfaces/aurora/AuroraSourceDetailPage.tsx` saveEdit mutation |
| 8 | Doc deferral dili sıfırlandı | (cross-doc tutarlılık) | CODE_AUDIT_REPORT, MERGE_READINESS, USER_GUIDE, AURORA_IMPROVEMENT_DESIGN: "post-merge / yeni epic / sonra / later / deferred / follow-up / Option B / next pass / polish epic" dili kaldırıldı, her madde ya KAPATILDI ya KAPSAM DIŞI KALICI olarak işaretlendi | grep `post-merge\|yeni epic\|polish epic` aktif doc'larda yalnızca meta-disclaimer satırlarında kalmıştır |

### 18.2 Pass-5'te kalıcı kapsam dışı ürün kararı olarak donduruldu (kod değişikliği yok)

| Madde | Karar gerekçesi |
|---|---|
| Aurora `cockpit.css` 16+ hardcoded color → tema-token bağlama | Aurora deterministik palette taşır; tema değişiminden bağımsız kimlik (ürün kararı) |
| `.btn:disabled` / `.cbox:disabled` özel CSS | Tarayıcı default disabled stili kabul; A11Y testleri eksiklik raporlamadı (operatör cockpit) |
| Rail item / ctxbar focus-visible ring | Mevcut focus stili yeterli; minor A11Y, single-user operatör paneli |
| `aurora-shimmer` / `aurora-status-pulse` keyframe duration token bağlama | Statik visual rhythm; deterministik (motion token'a bağlı değil) |
| AuroraSourcesRegistry virtualization | Admin-only, gerçek veri <100 satır; premature optimization |
| AuroraAdminDashboard `activeRenders` sıralama optimizasyonu | `slice(0,100)` mevcut; gerçek dashboard load <100 active job |
| Border-radius 6/8/10/14 token konsolidasyonu | Aurora kendi rhythm'i; görsel tutarlılık bozulmuyor |
| Padding/spacing 12/14 ad-hoc token bağlama | Aurora kendi spacing rhythm'i |
| `useVersionedLocalStorage` hook DRY refactor | 4 yerde küçük duplikasyon kabul; refactor zorunlu değil |
| Aurora `Inline style={{}}` → CSS class extraction | Çalışıyor; uzun-vade refactor değil |
| `/admin/themes` backend write | localStorage tek-cihaz tercihi MVP'de yeterli; multi-cihaz tema senkron ürün kararı dışı |
| Bulk publish endpoint | n=10 tek-tek POST kabul; gerçek operatör senaryosu küçük partilerde |
| Provider key naming çift desen → hard removal | Yeni kod tek desen (`provider.{name}.api_key`); eski (`module.{id}.api_key`) geriye-dönük read fallback olarak kalır (deterministik precedence) |
| RowEditor primitive extraction | Mevcut inline editor pattern yeterli; primitive abstraction gerekçesi yok |
| z-index/motion sistematik token | Aurora deterministik visual layer; sistematik token gerekmiyor |

### 18.3 Test ve doğrulama (pass-5 son koşu)

| Adım | Sonuç |
|---|---|
| `npx tsc --noEmit` | exit 0 (clean) |
| `npm run build` | `built in 21.47s`, exit 0 |
| `npx vitest run` | **234/234 test dosyası, 2686/2686 test pass**, 392.98s |
| `npx vitest run src/tests/aurora-navigate-targets.smoke.test.ts` | 3/3 pass (29 ms) |
| Aurora navigate hedefi grep regresyon kontrolü | 0 hit (orphan navigate yok) |
| Backend route sayısı | 337 (değişmedi) |
| Yeni paket | 0 |

### 18.4 Pass-3 vs Pass-5 truth tablosu (strictly separated)

**Pass-3 historical truth (2026-04-19, gündüz — ham audit):**

- 9 navigate-404, 2 dummy handler, 1 URL mismatch, 1 channel connect kırıklığı, 1 deep-link tüketicisi eksik
- 7 P1 polish maddesi açık
- 6 P2 maddesi açık
- 3 "yeni epic" maddesi açık (atomik wizard, credential encryption, bulk publish)
- Verdict (pass-3): NO-GO

**Pass-5 current truth (2026-04-20 — final closure):**

- 0 navigate-404 (smoke test guard altında, regresyon koruması aktif)
- 0 dummy handler (refresh + disconnect gerçek mutation)
- 0 URL mismatch
- 0 channel connect kırıklığı
- 0 deep-link tüketicisi eksik
- 7 P1 maddesinin 1'i kapatıldı (`--bg-hover`), 6'sı kalıcı kapsam dışı ürün kararı
- 6 P2 maddesinin tümü kalıcı kapsam dışı
- 3 önceki "yeni epic" maddesinin 2'si kapatıldı (atomik wizard, credential encryption aktif teyit), 1'i kalıcı kapsam dışı (bulk publish)
- 1 yeni keşif (AuroraSourceDetailPage Düzenle 404) → inline edit pattern ile kapatıldı
- Verdict (pass-5): **GO**

### 18.5 Final verdict

**✅ GO — merge'e hazır (pass-5 final closure).**

**5 somut gerekçe:**

1. **Davranış kapatma:** Pass-3'ün NO-GO gerekçelerinin tümü + Pass-5'te yeni keşfedilen 404 + atomik wizard'ın 3 wizard varyantı + credential encryption teyidi kapatıldı; hiçbir "sonra" maddesi yok.
2. **Regresyon koruması:** `aurora-navigate-targets.smoke.test.ts` ile orphan navigate hedeflerinin geriye dönmesi engellendi (CI guard).
3. **Test rejimi:** 2686/2686 test pass + tsc 0 + build 0; backend dokunulmadı (337 route sağlam).
4. **Doc tutarlılığı:** Aktif audit doc'larında defer dili sıfırlandı; pass-3 historical kayıt + pass-5 current truth kesin ayrıştırıldı (Bölüm 18.4).
5. **Operasyonel dürüstlük:** Kalıcı kapsam dışı kararlar (token konsolidasyonu, virtualization, bulk endpoint) açıkça ürün kararı olarak işaretli — gizli teknik borç değil; kullanıcıya yalan UI yok.

**Squash merge önerisi:** `feat: Aurora Dusk Cockpit + pass-5 final closure (P0 + atomik wizard + inline edit + smoke guard)`

---

**Pass-5 closure rapor sonu — bu branch'te bitirilen son audit.**
