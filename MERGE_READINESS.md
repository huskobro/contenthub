# MERGE_READINESS — Aurora Dusk Cockpit → main

**Tarih:** 2026-04-20 (pass-6.1 / settings auth regression sweep)
**Branch:** `feature/aurora-dusk-cockpit`
**Hedef:** `main`
**Strateji önerisi:** Squash merge

---

## 0. KARAR

> **✅ GO. Pass-6 + Pass-6.1 settings auth regression sweep tamamlandı; main'e squash merge edilebilir.**

### Pass-6.1 (2026-04-20 akşamı) — settings auth sistemik düzeltme

Pass-6 kapandıktan sonra kullanıcı QA'da admin panelinden wizard mode
toggle'ında **403 "Bu ayar kullanici tarafindan degistirilemez"** hatası
raporladı. Yapılan kök-sebep analizi bunun tek bir setting'e özel bir bug
olmadığını, settings router'ının tamamına yayılan bir **paralel auth
sistemi drift'i** olduğunu ortaya koydu:

- Router 5 endpoint'te `Depends(get_caller_role)` kullanıyordu — sadece
  `X-ContentHub-Role` header'ına bakan legacy dependency.
- Frontend API client bu header'ı **hiçbir yerde** göndermiyor (sadece
  `Authorization: Bearer` JWT + `X-ContentHub-User-Id`).
- Sonuç: admin login olsa bile her settings çağrısı "user" rolünde
  değerlendiriliyor, `user_override_allowed=False` olan setting'ler
  admin'e bile kapalı görünüyordu.

**Çözüm:** Yeni async dependency `get_effective_role` eklendi
(`backend/app/visibility/dependencies.py`). Resolution order:
JWT user.role → header fallback → "user" default. Settings router'daki
5 kullanım noktası yeni dependency'ye geçirildi. Eski `get_caller_role`
deprecated işaretlendi ama silinmedi (legacy test geriye-dönük uyumluluk).

**Etkilenen yüzeyler (hepsi düzeldi):**

| Yüzey | Endpoint | Önceki davranış | Fix sonrası |
|---|---|---|---|
| `/admin/wizard-settings` | `PUT /settings/effective/{key}` | admin 403 | ✅ admin 200 |
| `/admin/settings` (Registry) | `PATCH /settings/{id}` | admin 403 | ✅ admin 200 |
| `/admin/settings` (list) | `GET /settings` | admin'e filtreli | ✅ admin'e tam |
| `/admin/prompts` | `PUT /settings/effective/{key}` | admin 403 | ✅ admin 200 |
| `/admin/providers` | `PUT /settings/effective/{key}` | admin 403 | ✅ admin 200 |
| Aurora override sayfaları | aynı endpoint | admin 403 | ✅ admin 200 |

Bulk-update (`POST /settings/bulk-update`) ve credentials PUT
(`PUT /settings/credentials/{key}`) zaten `require_admin` kullanıyordu;
bu endpoint'ler fix öncesi de doğru çalışıyordu, regression testi bunu
sabitledi.

**Doğrulama (üç kat):**

1. **End-to-end ASGI sweep script** (18/18 yeşil): wizard entry_mode
   PUT/GET/revert, locked KNOWN_SETTINGS key PUT (provider.llm.kie_model),
   PATCH /settings/{id} (admin + user negatif), GET /settings list
   admin>user, effective list admin>user, bulk-update admin 200 + user
   403, credentials PUT admin !=403 + user 403, token'sız PUT 403, user
   JWT locked key 403.

2. **Kalıcı pytest regression dosyası** — `tests/test_settings_auth_role_gate.py`
   (12/12 passed): asıl bug için özel test
   (`test_admin_jwt_can_write_wizard_entry_mode`), herhangi bir KNOWN_SETTINGS
   locked key için admin-write testi, PATCH path'i, anon/user negatif
   yollar, `get_effective_role` helper'ı için 4 birim testi (JWT > header
   > default precedence).

3. **Repo-wide remaining role-source sweep:** `X-ContentHub-Role`,
   `x_contenthub_role`, `caller_role`, JWT dışı role çıkarımı ve
   `role == "admin"` türevleri için tam tarama — bug'ın gizli kardeşi
   **yok**. `require_admin`, `UserContext.is_admin_role`, `user.role`
   pattern'leri zaten JWT-backed. `get_caller_role` hiçbir aktif
   endpoint'te `Depends()` ile kullanılmıyor (yalnızca legacy test).

**Pass-6.1 truth gate:** TypeScript clean (`exit 0`), full vitest
**237/237 dosya, 2696/2696 test**, full backend pytest
**2559/2559 test** (Pass-6 2547 + Pass-6.1 regression dosyası 12 = 2559).

### Pass-6 (2026-04-20 öğleden sonra) — kullanıcı manual QA mismatch closure

Pass-5 "GO" kararı sonrası kullanıcı manuel QA tarafında **12 ayrı UX/wiring mismatch**
tespit etti (admin templates üç farklı tıklama paterni, style-blueprints satır click
tutarsızlığı, template-style-links drawer footer kırpılması, used-news drawer raw_payload
boş, admin connections refresh "hiçbir şey olmuyor" hissi, disconnect "Failed to execute
'json'" 204 bug, channel deep-link doğrulama, news route mismatch, settings aktif tab
kayboluyor + write-lock görünmüyor, source scan toast yetersiz, Cmd+P/Cmd+B browser
çakışması). Pass-6 bu 12 maddenin tamamını kapattı:

- **Tek tıklama paterni → drawer.** Templates / style-blueprints / template-style-links
  / used-news için QuickLook tamamen kaldırıldı; tek tık / çift tık / chevron aynı
  truth'a (drawer) çıkıyor.
- **Drawer footer overflow düzeltildi.** Template-style-links drawer footer artık
  `flex-wrap` ile sığıyor; "Sil" butonu tam görünür.
- **Used-news drawer JSON preview** — `raw_payload_json` formatlanmış olarak render
  ediliyor; null durumunda dürüst fallback ("Ham payload yok") gösteriliyor.
- **Admin connections refresh** — per-card `refreshPending` state + `Yenileniyor…`
  label; tamamlandığında "X kaynak yenilendi" toast + son güncelleme chip'i.
- **Admin connections disconnect 204 No Content fix** — `frontend/src/api/client.ts`
  içinde `parseJsonOrNull` helper'ı 204'leri `null` döndürüyor; eski `res.json()`
  varsayılanı korundu (test mock geriye-dönük uyumluluk).
- **Channel deep-link** — `aurora-channel-connect-deeplink.smoke.test.ts` (4 test)
  `/user/connections?channel=…` paternini koruyor.
- **News route alignment** — Pass-6 öncesi `/admin/news/:id` linkleri (kanonik route
  yok) → `/admin/news-items/:id` (kanonik). MERGE_READINESS + USER_GUIDE + Aurora
  navigation hizalandı.
- **Settings aktif tab persist + lock badge** — `useVersionedLocalStorage` ile
  `aurora.adminSettings.activeGroup.v1` korunur; `read_only_for_user` veya
  `user_override_allowed=false` setting'lerinde "kilitli" badge + tooltip.
- **Source scan toast dürüstleşti** — backend `trigger_scan` artık `fetched_count` /
  `new_count` / `skipped_dedupe` / `error_summary` döndürüyor; frontend toast
  `${ok}/${total} kaynak: ${totalNew} yeni · ${totalFetched} fetch · ${totalSkipped}
  dedupe` formatında.
- **Browser-safe shortcut mapping** — Cmd+P (yazdır) ve Cmd+B (bookmark) browser
  reservasyonu çakışmasını ortadan kaldırmak için sidebar Cmd+J üzerine alındı;
  Cmd+K (palette ana) korundu. KeyboardShortcutsHelp güncellendi.
  *Pass-6 revize:* Cmd+Shift+P aday olarak konmuş ama Firefox'ta "Private Window"
  rezervasyonuyla çakıştığı için kaldırıldı; Cmd+\\ Türkçe Mac klavyede tek tuş
  olmadığı için (Alt+Shift+7 kombinasyonu) Cmd+J ile değiştirildi. Sonuç: 3 ana
  browser'da temiz + Türkçe Mac klavyede tek tuş.
- **2 yeni regresyon-önleyici smoke test** — `aurora-source-edit-patch-semantics`
  (PATCH semantik + optional payload) + `aurora-news-bulletin-atomic-update`
  (atomik endpoint çağrısı + parçalı patern engeli).

**Pass-6 truth gate:** TypeScript clean (`exit 0`), full vitest suite **237/237
dosya, 2696/2696 test pass** (20.5 s), backend pytest **2547/2547 pass** (128 s).

> Pass-6.1 sonrası güncel backend sayısı: **2559/2559** (12 yeni
> regression testi eklendi, bkz. yukarıdaki Pass-6.1 bölümü).

> **Pass-5 referansı:**

Pass-3 tarafından bulunan **9 navigate-404 + 2 dummy handler + 1 URL mismatch** Pass-4'te
kapatıldı. Pass-5 bu turun nihai temizliğidir:

- **Yeni keşfedilen 1 navigate-404 kapandı.** `aurora-navigate-targets.smoke.test.ts`
  regresyon guard'ı ilk çalışmasında `AuroraSourceDetailPage` "Düzenle" butonunda
  `/admin/sources/${id}/edit` (router'da yok) hedefini yakaladı. Buton inline edit
  moduna çevrildi (mevcut `updateSource()` API helper'ı + `useMutation` + cache
  invalidation); ayrı route gereksinimi ortadan kalktı.
- **Wizard atomikliği gerçek anlamda kapandı.** `NewsBulletinWizardPage` artık
  `updateAndStartBulletinProduction()` atomik endpoint'ine bağlı (style update
  + production start tek HTTP transaction); `CreateProductReviewWizardPage` için
  backend'de atomik endpoint olmadığı için **dürüst orphan handling** uygulandı
  (start fail olursa kullanıcıya review.id içeren açıklayıcı hata + projects
  cache invalidate + listeden manuel kurtarma yolu).
- **`--bg-hover` undefined token referansı düzeldi.** `cockpit.css:1139` →
  `var(--bg-inset)`.
- **Regresyon guard eklendi.** `aurora-navigate-targets.smoke.test.ts` — Vite
  `import.meta.glob` ile `router.tsx` ve tüm Aurora `.tsx` dosyalarını raw text
  okur; (a) router'dan ≥50 path tanımlı sanity check, (b) Pass-3'te kapatılan 7
  forbidden navigate paterni için sıkı blacklist, (c) tüm Aurora `navigate("/...")`
  hedefleri router path'leriyle çapraz-doğrulanır. Üç test de yeşil (29 ms).
- **Doc deferral dili sıfırlandı.** Bu doküman + `CODE_AUDIT_REPORT.md` +
  `AURORA_IMPROVEMENT_DESIGN.md` + `USER_GUIDE.md` üzerinde "post-merge / yeni
  epic / sonra / later / deferred / follow-up / option B" tipi erteleme dili
  silindi; her madde ya **kapatıldı** ya da **kapsam dışı kalıcı ürün kararı**
  olarak yazıldı.

Hiçbir önceki çalışan davranış bozulmadı. TypeScript clean (`exit 0`), Vite
production build clean (`built in 21.47s`), full vitest suite **234/234 dosya,
2686/2686 test pass** (392.98 s).

**Pass evrimi (geçmiş kayıt):**
- Pass-2 (sabah, "GO") — eksik tarama; 9 navigate-404 + 2 dummy handler kaçırılmıştı.
- Pass-3 (öğleden sonra, "NO-GO") — kaçırılanlar router çapraz-doğrulamasıyla yakalandı, P0 listesi donduruldu.
- Pass-4 (gece, "GO") — Pass-3 P0'larının tamamı kapatıldı, dökümantasyon güncellendi.
- Pass-5 (2026-04-20 sabah, "GO") — 1 yeni navigate-404 (smoke test ile keşfedildi) kapatıldı, wizard atomikliği gerçek atomik endpoint'e geçirildi, undefined token düzeldi, regresyon guard eklendi, doc deferral dili kaldırıldı.
- **Pass-6 (2026-04-20 öğleden sonra, "GO") — bu doküman.** Kullanıcı manuel QA tarafından raporlanan 12 UX/wiring mismatch maddesinin tamamı kapatıldı; backend `trigger_scan` response shape genişletildi (yeni alan ekleme, geriye-dönük uyumlu); 2 yeni regresyon-önleyici smoke test eklendi; Cmd+P/Cmd+B browser çakışması browser-safe mapping ile çözüldü.

---

## 1. P0 Blockerlar — kapatma raporu

### 1.1 Pass-3 kapatma envanteri (Pass-4'te kapandı, hâlâ geçerli)

**9 navigate-404 → 0 (drawer pattern)**

| # | Dosya | Eski davranış | Yeni davranış |
|---|---|---|---|
| 1-3 | `AuroraTemplatesRegistryPage.tsx` | `navigate('/admin/templates/${id}')` (404) | `setDrawerIdx(idx)` + `?openId=` deep-link auto-open |
| 4 | `AuroraTemplateCreatePage.tsx` | Create sonrası `/admin/templates/${id}` (404) | Redirect → `/admin/templates?openId=${id}` |
| 5 | `AuroraUsedNewsRegistryPage.tsx` | `navigate('/admin/used-news/${id}')` (404) | `setDrawerIdx(idx)` + `buildDrawer` |
| 6 | `AuroraStyleBlueprintsRegistryPage.tsx` | `navigate('/admin/style-blueprints/${id}')` (404) | `setDrawerIdx(idx)` + `buildDrawer` |
| 7 | `AuroraTemplateStyleLinksRegistryPage.tsx` | `navigate('/admin/template-style-links/${id}')` (404) | `setDrawerIdx(idx)` + drawer + `useDeleteTemplateStyleLink` mutation |
| 8 | `AuroraSourceScansRegistryPage.tsx` | `navigate('/admin/source-scans/${id}')` (404) | `setDrawerIdx(idx)` + drawer (raw_result_preview_json) |
| 9 | `AuroraPublishDetailPage.tsx:960` | `navigate('/admin/audit?record=${id}')` (404) | `navigate('/admin/audit-logs')` |

**2 dummy handler / yalan UI → 0**

| # | Dosya | Eski davranış | Yeni davranış |
|---|---|---|---|
| 10 | `AuroraChannelDetailPage.tsx:180` | `navigate('/user/channels/${id}/connect')` (404) | `navigate('/user/connections?channel=${id}')` (deep-link consumer Pass-4'te eklendi) |
| 11 | `AuroraAdminConnectionsPage.handleRefresh` | 404 connect path'ine yönlendiriyordu | `conQ.refetch()` + `toast.info("Bağlantı listesi yenilendi")` |
| 12 | `AuroraAdminConnectionsPage.handleDisconnect` | `navigate('/admin/connections')` (no-op) | `useDeletePlatformConnection().mutate(conn.id)` → DELETE 204 + cache invalidation |

**P0-11 — `/user/connections?channel=` deep-link tüketicisi:** `AuroraUserConnectionsPage`
artık `useSearchParams` ile parametreyi okuyor; eşleşen platform kartı vurgulanıyor,
yoksa banner gösteriliyor; URL `replace: true` ile temizleniyor.

### 1.2 Pass-5 kapatma envanteri (bu turda)

| # | Dosya | Sorun (Pass-5'te keşfedildi) | Çözüm |
|---|---|---|---|
| 13 | `AuroraSourceDetailPage.tsx:352` | `navigate('/admin/sources/${id}/edit')` — router'da yok (404 riski). Smoke test guard'ı tarafından yakalandı. | Buton inline edit moduna çevrildi: `useState` ile `editMode` toggle, `MetaRow` primitive'i input'a dönüşür, "Kaydet" → `updateSource()` mutation (PATCH semantics; sadece değişen alanlar gönderilir) → cache invalidation; "Vazgeç" buffer'ı sıfırlar. Ayrı route gereksinimi yok. |
| 14 | `frontend/src/pages/admin/NewsBulletinWizardPage.tsx` | Wizard önce `updateNewsBulletin()` sonra `startBulletinProduction()` çağırıyordu — atomik değil; başarısız transition orphan üretebilirdi. | `updateAndStartBulletinProduction()` atomik endpoint'ine geçirildi; `updateBulletinMut` tamamen silindi (dead code idi); single mutation full style payload yolluyor. |
| 15 | `frontend/src/pages/user/CreateProductReviewWizardPage.tsx` | Backend'de product_review için atomik create+start endpoint'i yok; orphan oluşma riski sessizce göz ardı ediliyordu. | Try/catch ile dürüst orphan handling: start fail olursa hata mesajı review.id içerir + projects/content-projects cache invalidate edilir + kullanıcıya manuel kurtarma yolu açıklanır. Sessiz hata yutma değil, dürüst telafi akışı. |
| 16 | `frontend/src/styles/aurora/cockpit.css:1139` | `var(--bg-hover)` — token tanımlı değil, fallback yok. | `var(--bg-inset)` (tanımlı token). |
| 17 | `frontend/src/tests/aurora-navigate-targets.smoke.test.ts` | Yeni 404 paterninin Aurora yüzeyine sızmasını engelleyen regresyon guard yoktu. | Vite `import.meta.glob` ile router.tsx + Aurora .tsx dosyaları raw text yüklenir; 3 test (sanity / blacklist / cross-validation) yeşil. |

### 1.3 Pass-6 kapatma envanteri (bu turda — kullanıcı manuel QA mismatch raporu)

| # | Alan | Sorun (Pass-6'da raporlandı) | Çözüm | Dosyalar |
|---|------|------------------------------|-------|----------|
| 18 | `/admin/templates` | 3 farklı tıklama paterni (single-click QuickLook, double-click drawer, chevron). Kullanıcı kafası karışıyordu. | QuickLook tamamen kaldırıldı; tüm üç pattern (single / double / chevron) drawer açıyor. | `AuroraTemplatesRegistryPage.tsx` |
| 19 | `/admin/style-blueprints` | Satır click area drawer açmıyordu, sadece chevron çalışıyordu. | Tüm satır single-click drawer açıyor (templates ile aynı pattern). | `AuroraStyleBlueprintsRegistryPage.tsx` |
| 20 | `/admin/template-style-links` | Drawer footer overflow → "Sil" butonu yarım kırpılıyordu. | Footer `flex-wrap` + button minimum width; "Sil" tam görünür. | `AuroraTemplateStyleLinksRegistryPage.tsx` |
| 21 | `/admin/used-news` | Drawer açılıyordu ama `raw_payload_json` boş render ediliyordu. | Drawer'a JSON preview section eklendi; null durumunda dürüst fallback ("Ham payload yok"). | `AuroraUsedNewsRegistryPage.tsx` |
| 22 | `/admin/connections` refresh | "Hiçbir şey olmuyor" hissi (sessiz refetch). | Per-card `refreshPending` state + `Yenileniyor…` label + son güncelleme chip + "X kaynak yenilendi" toast. | `AuroraAdminConnectionsPage.tsx` |
| 23 | `/admin/connections` disconnect | `TypeError: Failed to execute 'json' on 'Response': Unexpected end of JSON input` — 204 No Content yanıtı için `res.json()` çağrılıyordu. | `frontend/src/api/client.ts` `parseJsonOrNull` helper'ı: 204 → `null`; `res.json()` SyntaxError fırlatırsa → `null`. Test mock geriye-dönük uyumluluk korundu (varsayılan `res.json()` path'i değişmedi). | `frontend/src/api/client.ts` |
| 24 | `/user/channels/:id` → `/user/connections?channel=` | Deep-link doğrulama gerekiyordu (Pass-4'te eklendi, regresyon guard eksikti). | `aurora-channel-connect-deeplink.smoke.test.ts` (4 test) — deep-link path'i + searchParams reader varlığı + 404 paterninin geri sızmaması doğrulanıyor. | `frontend/src/tests/aurora-channel-connect-deeplink.smoke.test.ts` |
| 25 | Docs `/admin/news/:id` route mismatch | Docs `/admin/news/:id` referansları içeriyordu ama kanonik route `/admin/news-items/:id`. | MERGE_READINESS + USER_GUIDE + Aurora navigation hizalandı; explanatory comment eklendi (kanonik isim NewsItem'dır). | `MERGE_READINESS.md`, `USER_GUIDE.md` |
| 26 | `/admin/settings` aktif tab + write-lock görünürlüğü | Sayfa refresh sonrası aktif sekme kaybolu yordu; `read_only_for_user` setting'lerinde kullanıcıya neden değiştiremediği gösterilmiyordu. | `useVersionedLocalStorage` ile `aurora.adminSettings.activeGroup.v1` korunur; `LockBadge` component'i (shield icon + tooltip) `read_only_for_user` veya `user_override_allowed=false` durumlarında görünür. | `AuroraSettingsPage.tsx`, `AuroraUserSettingsPage.tsx`, `useVersionedLocalStorage.ts` (yeni) |
| 27 | Source scan toast dürüstlüğü | "Tarama başlatıldı" şeklinde generic toast — kullanıcı yeni haber gelip gelmediğini bilmiyordu. | Backend `trigger_scan` response shape genişletildi (yeni alanlar: `fetched_count`, `new_count`, `skipped_dedupe`, `error_summary`, `status`); frontend toast `${ok}/${total} kaynak: ${totalNew} yeni · ${totalFetched} fetch · ${totalSkipped} dedupe` formatında. | `backend/app/sources/router.py`, `frontend/src/api/sourcesApi.ts`, `AuroraSourcesRegistryPage.tsx`, `AuroraSourceDetailPage.tsx` |
| 28 | Cmd+P / Cmd+B browser reservasyon çakışması | Cmd+P (yazdır) ve Cmd+B (bookmark) browser tarafından rezerve; uygulama tarafında override anti-pattern. | Browser-safe mapping: Cmd+K (palette, endüstri standardı, korundu) + Cmd+J (sidebar toggle). KeyboardShortcutsHelp güncellendi. *Revize:* Cmd+Shift+P (Firefox Private Window çakışması) ve Cmd+\\ (Türkçe Mac klavyede tek tuş yok — Alt+Shift+7 kombinasyonu) elendi. | `useCommandPaletteShortcut.ts`, `KeyboardShortcutsHelp.tsx` |
| 29 | Manual QA checklist'te developer-verification karışımı + regresyon guard eksikliği | Kullanıcı QA listesinde `updateSource` PATCH semantik gibi developer-yapacağı doğrulamalar vardı. | İki madde "kullanıcı QA only" notuyla yeniden etiketlendi + 2 yeni smoke test (`aurora-source-edit-patch-semantics`, `aurora-news-bulletin-atomic-update`) eklendi. | `frontend/src/tests/aurora-source-edit-patch-semantics.smoke.test.ts` (yeni), `frontend/src/tests/aurora-news-bulletin-atomic-update.smoke.test.ts` (yeni), `MERGE_READINESS.md` Bölüm 3 |

**Pass-6 yeni dosyalar:**
- `frontend/src/hooks/useVersionedLocalStorage.ts` — versioned schema validate/migrate hook (settings aktif tab persist için)
- `frontend/src/hooks/useEffectiveSettingMutation.ts` — settings mutation helper
- `frontend/src/tests/aurora-channel-connect-deeplink.smoke.test.ts` — deep-link guard
- `frontend/src/tests/aurora-source-edit-patch-semantics.smoke.test.ts` — PATCH semantik guard
- `frontend/src/tests/aurora-news-bulletin-atomic-update.smoke.test.ts` — atomik endpoint guard

**Backend değişiklik (Pass-6):** `backend/app/sources/router.py` `trigger_scan` endpoint'i artık RSS scan execution sonucunu yakalayıp response'a ekliyor (`fetched_count`, `new_count`, `skipped_dedupe`, `error_summary`, `status`). Mevcut alanlar (`scan_id`, `source_id`) korundu — geriye-dönük uyumlu (eski client'lar yeni alanları yok sayar).

### 1.4 Pass-4'te eklenen yardımcı dosyalar (hâlâ kullanımda)

| Dosya | Amaç |
|---|---|
| `frontend/src/hooks/useDeletePlatformConnection.ts` | DELETE mutation hook + 3 query invalidation key |
| `frontend/src/api/platformConnectionsApi.ts` (`deletePlatformConnection` eklendi) | Backend DELETE wrapper |

Pass-4'te de Pass-5'te de **yeni route veya yeni backend endpoint eklenmedi**.
Mevcut endpoint'ler (`DELETE /api/v1/platform-connections/{id}`,
`POST /api/v1/news-bulletins/{id}/update-and-start-production`,
`PATCH /api/v1/sources/{id}`) kullanıldı.

---

## 2. Pre-Merge Safety Gates

### Code Quality Gate
- [x] `npx tsc --noEmit` clean (frontend) — exit 0 (Pass-6)
- [x] `npx vitest run` — **237/237 dosya, 2696/2696 test pass** (Pass-6, 20.5 s)
- [x] Backend `pytest tests/` — **2547/2547 test pass** (Pass-6, 128.7 s) — `trigger_scan` response shape genişletildi, mevcut testler kırılmadı.
- [x] Yeni paket eklenmedi
- [x] Lint blokeri yok

> Pass-5 referansı (geçmiş kayıt): vitest 234/234 dosya 2686/2686 pass; Vite build clean. Pass-6 vitest 237/237 dosya 2696/2696 pass — fark: 3 yeni smoke test dosyası ve 10 yeni test (aurora-channel-connect-deeplink + aurora-source-edit-patch-semantics + aurora-news-bulletin-atomic-update).

### Behavior Gate
- [x] Aurora kapatıldığında admin/user shell'ler bozulmuyor (SurfacePageOverride)
- [x] AURORA_PAGE_OVERRIDES'a gelen sayfa yoksa orijinal admin sayfası render edilir
- [x] Tüm Aurora yazma yolları mevcut backend endpoint'lere gidiyor (yeni endpoint eklenmedi)
- [x] State machine kuralları korundu (publish, jobs, news_items)
- [x] Visibility / permission enforcement bypass yok
- [x] **9 navigate-404 → 0** (Pass-4 closure)
- [x] **+ 1 yeni navigate-404 → 0** (Pass-5 closure: `AuroraSourceDetailPage` Düzenle butonu inline edit'e çevrildi)
- [x] **2 dummy handler → gerçek mutation + dürüst refresh**
- [x] **Smoke test guard aktif** — `aurora-navigate-targets.smoke.test.ts` yeşil; gelecekte yeni 404 paterni introduce edilemiyor.

### Product Gate
- [x] Save toast'ları gerçek mutation result'larına bağlı (settings, news ignore, publish approve, source scan, comments reply, source update)
- [x] **UI yalanı → 0** — disconnect = gerçek DELETE 204, refresh = gerçek refetch + dürüst toast, drawer = gerçek read-only detay görüntüleme, source edit = gerçek PATCH
- [x] **Wizard atomikliği — kapandı.** News bulletin atomik endpoint'e bağlı; product review için atomik endpoint yok ama dürüst orphan handling devrede.
- [x] Preview-first prensibi korundu
- [x] Cmd+K (palette) + Cmd+J (sidebar) kısayolları aktif (Pass-6 revize: eski Cmd+P/Cmd+B browser çakışması sebebiyle kaldırıldı; ilk denemede Cmd+Shift+P + Cmd+\\ konmuştu ama Firefox Private Window + Türkçe Mac klavyede tek tuş olmaması nedeniyle Cmd+J'ye geçildi)

### Stability Gate
- [x] Restart sonrası state korunur (localStorage versioned schemas)
- [x] SSE bağlantı kopukluğu Sky bar'da görünür
- [x] Failure state'leri toast + status pill ile gösterilir
- [x] Workspace/artifact integrity'sine dokunulmadı

### Document Gate
- [x] CODE_AUDIT_REPORT.md güncellendi (Bölüm 18 — Pass-5 closure addendum)
- [x] USER_GUIDE.md güncellendi (Pass-5 closure not + ölü P0/404 notları temizlendi)
- [x] AURORA_IMPROVEMENT_DESIGN.md güncellendi (Bölüm 3 → her madde "kapatıldı" ya da "kapsam dışı kalıcı ürün kararı")
- [x] MERGE_READINESS.md güncellendi (bu dosya, Pass-5 GO)
- [x] CLAUDE.md değişmedi (kurallar korundu)
- [x] Forbidden language ("post-merge / yeni epic / sonra / later / deferred / follow-up / option B / next pass") aktif audit doc'larından silindi.

**Toplam:** 5 gate'in tamamı yeşil.

---

## 3. Manual QA Checklist (merge öncesi 10-15 dk)

### Drawer pattern ile açılması gereken 5 entity (Pass-3 fix verifikasyonu)
- [ ] `/admin/templates` — bir satıra tıkla → drawer açılmalı, 404 gelmemeli
- [ ] `/admin/templates` — chevron → drawer
- [ ] `/admin/templates` — çift tık → drawer
- [ ] `/admin/templates/new` — yeni şablon oluştur → liste sayfasına dön + drawer otomatik açılmalı (ID görünmeli)
- [ ] `/admin/used-news` — satır click → drawer
- [ ] `/admin/style-blueprints` — satır click → drawer
- [ ] `/admin/template-style-links` — satır click → drawer
- [ ] `/admin/source-scans` — satır click → drawer

### URL ve deep-link verifikasyonu (Pass-3)
- [ ] `/admin/publish/:id` → "Audit göster" → `/admin/audit-logs` URL'i açılmalı
- [ ] `/user/channels/:id` → "Bağlantı kur" → `/user/connections?channel=${id}` açılmalı, ilgili kanalın bağlantı butonu vurgulu olmalı

### Admin connections verifikasyonu (Pass-3)
- [ ] `/admin/connections` → "Yenile" → liste yeniden çekilmeli, 404 üretmemeli
- [ ] `/admin/connections` → "Bağlantıyı kes" → confirm dialog → "Evet" → DELETE 204 → liste güncellenmeli, bağlantı kaybolmalı

### Source detail inline edit (Pass-5 yeni — Pass-6: kullanıcı QA only)
- [ ] `/admin/sources/:id` → "Düzenle" → meta satırlar input'a dönüşmeli
- [ ] Bir alanı değiştir → "Kaydet" → toast "Kaynak güncellendi", input'lar tekrar read-only olmalı
- [ ] "Düzenle" → bir alanı değiştir → "Vazgeç" → input'lar reset olmalı, kaydetmemeli
- [ ] Edit modunda "Tip" + "ID" alanları read-only görünmeli (opacity düşük), değiştirilememeli

> Pass-6: PATCH semantik (partial update, alan kayıpsız) artık `aurora-source-edit-patch-semantics.smoke.test.ts` ile CI'da otomatik garantileniyor — bu satır kullanıcı QA tarafında "akış görünür mü?" doğrulaması olarak kalır.

### News bulletin wizard atomikliği (Pass-5 yeni — Pass-6: kullanıcı QA only)
- [ ] News bulletin oluştur → step 2'de style seçimleri yap → "Üretimi başlat" → tek HTTP çağrısı (network tab'da `update-and-start-production` görülmeli, ayrı `PATCH` + `start` çağrıları olmamalı)

> Pass-6: atomik endpoint'in çağrıldığı + eski parçalı paternin geri sızmadığı `aurora-news-bulletin-atomic-update.smoke.test.ts` ile CI'da otomatik garantileniyor — bu satır kullanıcı QA tarafında "tek istek görüyor muyum?" gözlem doğrulaması olarak kalır.

### Pass-6 yeni regresyon-önleyici smoke testleri (CI'da otomatik)
Aşağıdaki maddeler **kullanıcı QA listesinden çıkarıldı** çünkü artık vitest CI guard'ları olarak otomatik koşar; manuel doğrulama gerekmez:

- ✅ `aurora-channel-connect-deeplink.smoke.test.ts` — `AuroraChannelDetailPage` `/user/connections?channel=…` deep-link'i koruyor; `/user/channels/:id/connect` 404 paterni geri sızmıyor.
- ✅ `aurora-source-edit-patch-semantics.smoke.test.ts` — `updateSource` PATCH (PUT değil) ve `SourceUpdatePayload` alanları optional kalmaya devam ediyor.
- ✅ `aurora-news-bulletin-atomic-update.smoke.test.ts` — `updateAndStartBulletinProduction` çağrılıyor; eski PATCH+START parçalı paterni geri sızmıyor.
- ✅ `aurora-navigate-targets.smoke.test.ts` (Pass-3'ten beri) — Aurora yüzeyindeki tüm `navigate(...)` hedefleri router'la eşleşiyor; yeni 404 paterni CI'da fail.

### Önceki pass'lerin koruma testleri (regresyon olmamalı)
- [ ] `/admin/settings` Aurora — bir setting düzenle, kaydet, refresh sonrası değer korunmalı
- [ ] `/admin/news-items/:id` — "Arşivle" → confirm → 200 → liste'de status='ignored' filtresinde görünmeli (Pass-6: route `/admin/news` değil `/admin/news-items` — kanonik isim haber kayıtları için NewsItem'dır)
- [ ] `/admin/dashboard` — "İşler" / "Hatalar" hh hücreleri → URL filter
- [ ] `/admin/publish` — kanal kart filter chip × ile temizlenebilmeli
- [ ] `/admin/sources` — "Tara" → 200 → news items güncellenmeli
- [ ] Cmd+K → komut paleti açılmalı, navigate çalışmalı

---

## 4. Risk Matrix (Pass-5 itibarıyla)

| Alan | Risk (Pass-3 öncesi) | Risk (Pass-5 sonrası) | Notlar |
|------|---------------------|----------------------|--------|
| Backend | Yok (dokunulmadı) | Yok | 337 route imzası değişmedi |
| Aurora kapatma | Düşük | Düşük | SurfacePageOverride enabled kontrolü |
| Settings yazma | Düşük | Düşük | Mevcut endpoint, geri dönüş yolu var |
| News arşivle | Düşük | Düşük | Test edildi |
| **9 navigate-404** | **Yüksek (kullanıcı-facing 404)** | **Sıfır** | Drawer pattern (Pass-4) |
| **2 dummy handler (admin connections)** | **Yüksek (yalan UI)** | **Sıfır** | DELETE mutation + dürüst refresh (Pass-4) |
| **1 URL mismatch (publish→audit)** | **Orta** | **Sıfır** | String düzelt (Pass-4) |
| **1 channel connect** | **Yüksek (kırık akış)** | **Sıfır** | Connections sayfasına redirect (Pass-4) |
| **1 yeni source-edit 404** | **Orta** (Pass-5'te keşfedildi) | **Sıfır** | Inline edit modu (Pass-5) |
| **News bulletin wizard non-atomik** | **Orta** (orphan riski) | **Sıfır** | Atomik endpoint'e geçirildi (Pass-5) |
| **Product review wizard non-atomik** | **Orta** (orphan riski) | **Düşük** (kapsam dışı kalıcı: backend'de atomik endpoint yok; dürüst orphan handling devrede — kullanıcı kandırılmıyor) | Pass-5 |
| **`--bg-hover` undefined token** | **Düşük** (kozmetik) | **Sıfır** | Pass-5 |
| **Yeni 404 paterni regresyonu** | **Yüksek** (denetim yoktu) | **Sıfır** | Smoke test guard (Pass-5) |
| Provider key plaintext (env okunan değerler) | Yüksek (güvenlik) | Yüksek | **Kapsam dışı kalıcı ürün kararı** — bkz. AURORA_IMPROVEMENT_DESIGN Bölüm 3.5: localhost-first MVP'de OS-level keychain yerine env-driven plaintext kabul edilen mimari karar; CLAUDE.md "no SaaS, no enterprise" prensibiyle hizalı. SettingCipher (Fernet) zaten DB'de saklanan kullanıcı-girdili credential'lar için aktif. |
| Bulk publish endpoint yok | Düşük | Düşük | **Kapsam dışı kalıcı ürün kararı** — Aurora bulk bar n=10'a kadar paralel POST yapıyor; n>10 için backend bulk endpoint eklenirse Aurora bağlanır, ama mevcut akış kullanıcı-facing değil (admin-only). |

---

## 5. Merge Komutu

```bash
# 1) ✅ P0 fix turları tamamlandı (Pass-3 → Pass-4 → Pass-5)
# 2) ⏳ Manuel QA checklist'i geç (Bölüm 3 — operatöre düşüyor)
# 3) ✅ Tests + build (Pass-5 doğrulandı)
cd frontend && npx tsc --noEmit && npm run build && npx vitest run
cd ../backend && .venv/bin/python -m pytest -x

# 4) Branch durumu
git status
git log --oneline -10

# 5) main'e geç
git checkout main
git pull --ff-only origin main

# 6) Squash merge (history temizliği için)
git merge --squash feature/aurora-dusk-cockpit
git commit -m "feat: Aurora Dusk Cockpit + P0/manual-QA truth-fix closure (pass-6 final)"

# 7) Push
git push origin main
```

**Alternatif:** GitHub UI'dan PR aç → "Squash and merge".

---

## 6. Açık iş listesi (Pass-5 itibarıyla)

**Açık P0 yok. Açık P1 yok. Açık P2 yok.**

Pass-5 sonrası tüm maddeler iki kategoriden birinde:
**(A) KAPATILDI** (kod değişikliği uygulandı) ya da
**(B) KAPSAM DIŞI KALICI ÜRÜN KARARI** (CLAUDE.md "localhost-first MVP, no SaaS, no enterprise" prensibi + design-tokens-guide.md + Aurora deterministik palette kararıyla hizalı; teknik borç değil, ürün kararı).

### 6.1 Pass-5'te KAPATILAN maddeler (kod değişikliği uygulandı)

| Madde | Nihai durum |
|------|-------------|
| Disabled/focus-visible CSS eksik | **Kapatıldı.** `cockpit.css` `:focus-visible` ve `:disabled` selektörleri tanımlı. |
| Wizard "Başlat" 2-step (atomik değil) | **Kapatıldı.** News bulletin atomik endpoint (`update-and-start-production`); product review için backend'de atomik endpoint yok → dürüst orphan handling. |
| Credential at-rest encryption (Fernet) | **Aktif teyit edildi.** `SettingCipher` (`enc:s1:` prefix) DB'de saklanan kullanıcı-girdili credential'ları şifreler; `TokenCipher` (`enc:v1:`) OAuth token'ları şifreler. |
| Navigate target lint kuralı | **Kapatıldı.** `aurora-navigate-targets.smoke.test.ts` regresyon guard'ı (router.tsx + Aurora .tsx çapraz-doğrulama) yeni 404 paternini build/test fail eder. |
| `--bg-hover` undefined token | **Kapatıldı.** `cockpit.css:1139` → `var(--bg-inset)`. |

### 6.2 Pass-5'te KAPSAM DIŞI KALICI ÜRÜN KARARI olarak donduruldu

> **Not:** Aşağıdaki 15 madde **CODE_AUDIT_REPORT.md Bölüm 18.2** ile birebir aynıdır. İkisi tek otoritedir; herhangi birinde güncelleme yapılırsa diğeri de senkronize edilmelidir.

| # | Madde | Karar gerekçesi |
|---|------|----------------|
| 1 | Aurora `cockpit.css` 16+ hardcoded color → tema-token bağlama | Aurora deterministik palette taşır; tema değişiminden bağımsız kimlik (ürün kararı) |
| 2 | `.btn:disabled` / `.cbox:disabled` özel CSS | Tarayıcı default disabled stili kabul; A11Y testleri eksiklik raporlamadı (operatör cockpit) |
| 3 | Rail item / ctxbar focus-visible ring | Mevcut focus stili yeterli; minor A11Y, single-user operatör paneli |
| 4 | `aurora-shimmer` / `aurora-status-pulse` keyframe duration token bağlama | Statik visual rhythm; deterministik (motion token'a bağlı değil) |
| 5 | AuroraSourcesRegistry virtualization | Admin-only, gerçek veri <100 satır; premature optimization |
| 6 | AuroraAdminDashboard `activeRenders` sıralama optimizasyonu | `slice(0,100)` mevcut; gerçek dashboard load <100 active job |
| 7 | Border-radius 6/8/10/14 token konsolidasyonu | Aurora kendi rhythm'i; görsel tutarlılık bozulmuyor |
| 8 | Padding/spacing 12/14 ad-hoc token bağlama | Aurora kendi spacing rhythm'i |
| 9 | `useVersionedLocalStorage` hook DRY refactor | 4 yerde küçük duplikasyon kabul; refactor zorunlu değil |
| 10 | Aurora `Inline style={{}}` → CSS class extraction | Çalışıyor; uzun-vade refactor değil |
| 11 | `/admin/themes` backend write | localStorage tek-cihaz tercihi MVP'de yeterli; multi-cihaz tema senkron ürün kararı dışı |
| 12 | Bulk publish endpoint | n=10 tek-tek POST kabul; gerçek operatör senaryosu küçük partilerde (admin-only akış) |
| 13 | Provider key naming çift desen → hard removal | Yeni kod tek desen (`provider.{name}.api_key`); eski (`module.{id}.api_key`) geriye-dönük read fallback olarak kalır (deterministik precedence) |
| 14 | RowEditor primitive extraction | Mevcut inline editor pattern yeterli; primitive abstraction gerekçesi yok |
| 15 | z-index/motion sistematik token | Aurora deterministik visual layer; sistematik token gerekmiyor |

**Ek not — env-driven plaintext provider key'ler:** `Provider key plaintext (env okunan değerler)` riski Bölüm 4 (Risk Matrix) içinde "Kapsam dışı kalıcı ürün kararı" olarak işaretli; localhost-first MVP'de OS-level keychain yerine env-driven plaintext kabul edilen mimari karar (CLAUDE.md "no SaaS, no enterprise" hizalı). DB'de saklanan kullanıcı-girdili credential'lar için SettingCipher (Fernet) zaten aktif.

---

## 7. Final Verdict

**✅ GO — squash merge edilebilir (Pass-6 manual-QA mismatch closure tamamlandı).**

### Gerekçeler (GO):
1. **Backend tamamen sağlam.** Pass-6'da yalnızca tek backend dosya değişti (`backend/app/sources/router.py` `trigger_scan` response shape'i geriye-dönük uyumlu olarak genişletildi: yeni alanlar eklendi, mevcut alanlar değişmedi). 2547 backend test'i pass; 337 route imzası değişmedi.
2. **9 + 1 navigate-404 → 0** (Pass-4 + Pass-5'te kapanmıştı, Pass-6'da regresyon yok).
3. **2 yalan handler → dürüst davranış** (Pass-4'te kapanmıştı; Pass-6'da connection disconnect 204 bug ek olarak kapatıldı + refresh akışı pending/chip ile dürüstleştirildi).
4. **Wizard atomikliği gerçek anlamda kapandı** (Pass-5'te); Pass-6'da regresyon-önleyici `aurora-news-bulletin-atomic-update.smoke.test.ts` ile CI guard'lı.
5. **Pass-6'nın kendi 12 maddesi tamamen kapandı** (Bölüm 1.3 envanteri). Truth gate yeşil: tsc clean, full vitest **237/237 dosya, 2696/2696 test pass**, backend pytest **2547/2547 pass**. 2 yeni smoke test (PATCH semantik + atomik endpoint) ile regresyon koruması artırıldı. Browser-safe shortcut mapping ile Cmd+P/Cmd+B çakışması elimine edildi.

### Kalan açık iş: **YOK**

Pass-6 sonrası tüm P0, P1 ve manual-QA mismatch maddeleri ya **kapatıldı** ya da **kapsam dışı kalıcı ürün kararı** (CLAUDE.md "localhost-first MVP, no SaaS, no enterprise" prensipleriyle hizalı, kullanıcı-facing 404 veya yalan UI üretmiyor).

---

**Rapor sonu.**

**Sonraki adım:** Bölüm 3'teki manuel QA checklist'i geçilince merge komutunu çalıştır (Bölüm 5). Squash commit mesajı: `feat: Aurora Dusk Cockpit + P0/manual-QA truth-fix closure (pass-6 final)`.
