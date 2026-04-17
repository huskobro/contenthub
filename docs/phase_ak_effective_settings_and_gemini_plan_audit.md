# Phase AK — Effective Settings & Gemini Plan Reality-Check Audit

**Tarih:** 2026-04-16
**Worktree:** `.claude/worktrees/audit+effective-settings-and-gemini-plan`
**Branch:** `worktree-audit+effective-settings-and-gemini-plan`
**Base commit:** `d0d97b2 fix(frontend-tests): raise vitest testTimeout/hookTimeout to 20s`
**Scope:** READ-ONLY inceleme. Kod değişikliği yok, migration yok, commit yok, package ekleme yok.

---

## 1. Yönetici Özeti (TL;DR)

1. **Effective Settings'te yalnızca TTS + channels görünmesinin kök nedeni çift katmanlıdır:** (A) frontend `X-ContentHub-Role` header'ını HİÇ göndermiyor → backend `get_caller_role()` varsayılanı "user" → router `visible_to_user_only` post-filter devreye giriyor. (B) `KNOWN_SETTINGS` (204 kayıt) içinde sadece 16 giriş `visible_to_user=True` bayraklı; bunların hepsi TTS (14) veya channels (2) grubunda. Yani kullanıcının gördüğü tablo tasarlandığı gibi davranıyor — ama bu davranış admin panelinde bir admin kullanıcı için YANLIŞ.
2. **Canlı curl kanıtı** (backend :8000'de çalışırken): header'sız istek 16 ayar, `X-ContentHub-Role: admin` header'lı istek 202 ayar döndürüyor.
3. **Gemini B1 (theme persistence)** iddiası abartılı: backend-side persistence zaten mevcut (`ui.active_theme` setting'i, fire-and-forget POST, `hydrateFromBackend`). Plan'in "ekle" dediği şeyin büyük kısmı kurulmuş.
4. **Gemini B2 (layout konsolidasyonu)** iddiası kısmen yerinde: `AdminLayout` vs `HorizonAdminLayout` hook bloğu yüksek oranda aynı, ama `useLayoutNavigation.ts` zaten ortak `ADMIN_NAV`/`USER_NAV`/`HORIZON_*_GROUPS` sunuyor. Ayrıca `frontend/src/surfaces/` altında daha yeni "canvas/atrium/bridge" yüzey (surface) mimarisi var; Gemini planı bundan habersiz yazılmış.
5. **Gemini B3 (review gate enforcement)** iddiası gereksiz: `PublishStateMachine.can_publish()` halihazırda backend'de sert bir şekilde enforce ediyor (status `approved`/`scheduled`/`failed` değilse publish bloklanıyor).
6. **Gemini B4 (full-auto publish_now bypass)** iddiası gereksiz: `backend/app/full_auto/service.py::on_job_completed` (satır 415-455) zaten "Faz 1 spec: ALWAYS draft, regardless of publish_policy" mantığını hard-code ediyor. Audit log bile yazılıyor.
7. **Gemini B5 (UserAutomationPage "visual flow builder")** iddiası abartılı: 293 LoC'luk sayfa var, kanal seçici + 5-checkpoint matrix (dropdown-based) arayüzü sunuyor, içerik yönetimi işlevsel. Ama görsel bir node/graph canvas'ı DEĞİL (react-flow/xyflow yok). Plan'in görsel flow talebi mevcut mimaride yapım gerektirir.
8. **Gemini B6 (dashboard autopilot digest + content calendar + sidebar truth map)** iddiaları kısmen karşılanmış: `UserCalendarPage.tsx` (827 LoC) içerik takvimi zaten var; `useLayoutNavigation.ts` sidebar truth'ı tek dosyada tutuyor. Dashboard tarafında "autopilot digest" sinyalleri (`automation_runs_today`, `queued`) dashboard'lara henüz bağlanmamış.
9. **Genel uyarı — "Gemini'nin planı"**: plan hazırlanırken mevcut `frontend/src/surfaces/` yüzey mimarisi, `backend/app/full_auto/` Faz 1 kilidi ve settings registry'nin `visible_to_user` kontrat modeli dikkate alınmamış. Planı olduğu gibi uygulamak "zaten var olanı tekrar yapma" + "kasıtlı kilidi gevşetme" riskini taşıyor.
10. **Tavsiye edilen asgari düzeltme (Phase AL için):** Effective Settings admin ekranında admin için 204 ayarın tamamını göstermek için tek nokta düzeltme gerekli: `frontend/src/api/client.ts::getActiveUserHeaders()` aktif kullanıcının `role` değerini `X-ContentHub-Role` olarak göndermeli (veya router'da role'ü JWT'den türetmeli). Registry'deki `visible_to_user` semantiği sağlam — değiştirilmesine gerek yok.

---

## 2. Soruşturma Yöntemi

- Worktree: `git worktree add` ile izole bir dal üzerinde çalıştım; kod kopyalanmadı, yalnızca okuma yapıldı.
- Doğrulama araçları: `Grep`, `Read`, Python REPL (`KNOWN_SETTINGS` sayımı için repo'nun kendi venv'i).
- Canlı backend (port 8000) üzerinde `curl` ile iki header kombinasyonuna karşı `/api/v1/settings/effective` isteği.
- Hiçbir dosya değiştirilmedi, hiçbir commit/push yapılmadı.

Tek çıktı: bu rapor dosyası (`docs/phase_ak_effective_settings_and_gemini_plan_audit.md`).

---

## 3. GÖREV A — Effective Settings: Yalnızca TTS + Channels Görünür

### 3.1 Veri Akışı (Chain-of-Truth)

```
KNOWN_SETTINGS (settings_resolver.py, 204 kayıt, group+visible_to_user flag)
  ↓ ilk kurulum
settings_seed.py::seed_known_settings
  → Setting tablosuna yazım; visible_to_user = meta.get("visible_to_user", False)
  ↓ API isteği
GET /api/v1/settings/effective  (router.py)
  ↓
service.list_effective(db, group, wired_only, user_id)
  → KNOWN_SETTINGS üzerinde dolaşır, key bazında explain() çağırır
  → 204 item döner (gruplu, kaynak + effective_value dahil)
  ↓
router: role = get_caller_role(request)  # X-ContentHub-Role header ya da "user"
  if role != "admin":
      visible_keys = {s.key for s in service.list_settings(db, visible_to_user_only=True)}
      items = [i for i in items if i["key"] in visible_keys]
  ↓
Frontend: EffectiveSettingsPanel.tsx render
  → groupOrder array'i sabit, listelenmeyen grupları da render ediyor (line 134-145)
```

### 3.2 Canlı Kanıt (curl)

Ana depo üzerinde backend :8000'de çalışırken:

```bash
# 1) Header'sız — frontend'in gerçekten gönderdiği şey
curl -s http://localhost:8000/api/v1/settings/effective | jq length
# → 16

# 2) Admin header eklenmiş
curl -s -H "X-ContentHub-Role: admin" http://localhost:8000/api/v1/settings/effective | jq length
# → 202   (204'ten 2 eksik: Phase AI'da eklenen iki yeni key için restart yapılmamış)
```

16 döndüren sonuçta görünür ayarların tamamı `group` ∈ `{tts, channels}`. Bu, kullanıcının panelde gördüğünün birebir aynısı.

### 3.3 Kök Neden Analizi

İki kusur birleşince semptom doğuyor:

**Kusur 1 — Frontend role header yok.**
- Dosya: `frontend/src/api/client.ts`, fonksiyon: `getActiveUserHeaders()`.
- Yalnızca `Authorization: Bearer <jwt>` + `X-ContentHub-User-Id` gönderiyor. `X-ContentHub-Role` ASLA eklenmiyor.
- Sonuç: her admin panel sayfası backend'e "user" gibi gidiyor.

**Kusur 2 — Router legacy header'a dayanıyor.**
- Dosya: `backend/app/visibility/dependencies.py` satır 39-49, fonksiyon: `get_caller_role(request)`.
- Sprint 1 hardening ile varsayılan değer "admin"den "user"a değiştirilmiş. Bu güvenlik açısından doğru.
- Ama router `role` kararını yalnızca bu header'dan alıyor → JWT içindeki gerçek `role` claim'ini OKUMUYOR.

**Kusur 3 — Tasarım gereği visible_to_user çoğunlukla False.**
- 204 kayıttan sadece 16'sı `visible_to_user=True` (tts 14, channels 2).
- Bu "user panel guided mode" için doğru kurgu; user paneli 188 sistem ayarını zaten görmemeli.
- Ama admin panelinde post-filter admin'e de uygulanıyor çünkü Kusur 1+2 yüzünden role "user" geliyor.

### 3.4 Effective Settings Missing-Scope Table

| Grup | KNOWN_SETTINGS | visible_to_user=True | Router Sonucu (header'sız) | Semptom Eşleşmesi |
|---|---:|---:|---:|---|
| automation       | 13 | 0  | 0  | ❌ görünmez (user seviyesinde) |
| channels         | 4  | 2  | 2  | ✅ **kullanıcının gördüğü** |
| credentials      | 7  | 0  | 0  | ❌ görünmez (secret, doğru) |
| execution        | 3  | 0  | 0  | ❌ görünmez |
| jobs             | 3  | 0  | 0  | ❌ görünmez |
| modules          | 3  | 0  | 0  | ❌ görünmez |
| news_bulletin    | 49 | 0  | 0  | ❌ görünmez |
| product_review   | 23 | 0  | 0  | ❌ görünmez |
| providers        | 10 | 0  | 0  | ❌ görünmez |
| publish          | 10 | 0  | 0  | ❌ görünmez |
| source_scans     | 10 | 0  | 0  | ❌ görünmez |
| standard_video   | 30 | 0  | 0  | ❌ görünmez |
| system           | 1  | 0  | 0  | ❌ görünmez |
| tts              | 27 | 14 | 14 | ✅ **kullanıcının gördüğü** |
| ui               | 9  | 0  | 0  | ❌ görünmez |
| wizard           | 2  | 0  | 0  | ❌ görünmez |
| **TOPLAM**       | **204** | **16** | **16** | — |

**Yorum:** 16 satır kullanıcının ekran görüntüsündeki içerikle birebir örtüşüyor. Bu bir veri bozukluğu değil, yetki çerçeveleme hatası.

### 3.5 Düzeltme Seçenekleri (bilgi amaçlı — bu faz'da yapılmıyor)

| Seçenek | Müdahale yeri | Risk | Önerim |
|---|---|---|---|
| (A) Frontend JWT role'ünü header'a yaz | `client.ts::getActiveUserHeaders()` | Düşük, minimum diff | **Bu** |
| (B) Router JWT'den role türetsin | `router.py::list_effective_settings` + dep. | Orta | Uzun vade daha temiz |
| (C) `visible_to_user` bayrağını KNOWN_SETTINGS'e topluca aç | `settings_resolver.py` + re-seed | Yüksek (user paneline sızıntı) | **Hayır** — yanlış çözüm |
| (D) Admin panelde filtre bypass endpoint'i | Yeni route | Orta | Gereksiz karmaşa |

A + B kombinasyonu uzun vadede en doğrusu; minimum MVP için sadece A yeterli.

### 3.6 Ek Gözlemler

- `EffectiveSettingsPanel.tsx` satır 70'teki `groupOrder` dizisinde `tts`, `channels`, `automation`, `product_review` eksik; ama satır 134-145'teki "Unlisted groups" fallback bloğu bu grupları yine de render ediyor → UI kırık değil, yalnızca sıralama kaybı yaşıyor. Listeyi admin-first sıraya almak istenirse küçük bir dizi genişletmesi yeter.
- Phase AI'da eklenen 2 yeni setting admin header ile bile 202/204 dönüyor; sebep: canlı backend restart edilmemiş (seed yeni keyleri eklemedi). Bu ayrı bir operasyonel konu.

---

## 4. GÖREV B — Gemini Master Plan Gerçeklik Denetimi

### 4.1 Gemini Plan Reality Check Table

| # | Gemini Maddesi | Plan İddiası (özet) | Gerçek Durum | Değerlendirme |
|---|---|---|---|---|
| B1 | Theme persistence | "Tema seçimi localStorage'da kalıyor, backend'e yazılmıyor, SSR/farklı cihazda kayboluyor" | `themeStore.ts::saveActiveThemeId` backend'e `ui.active_theme` olarak fire-and-forget POST ediyor; `hydrateFromBackend` localStorage boşsa çekiyor | **Kısmen Doğru / Çoğu Yapılmış.** Plan backend wiring'in YOKLUĞUNU varsayıyor; aslında var. Eksik olan cross-device senk ve SSE invalidation. |
| B2 | Layout konsolidasyonu | "Classic/Horizon Admin/User Layout 4 farklı dosya, DRY ihlali, tek shell'e çekilsin" | `AdminLayout.tsx` (80 LoC) + `HorizonAdminLayout.tsx` (189 LoC) + `UserLayout.tsx` (77 LoC) + `HorizonUserLayout.tsx` (155 LoC); hook bloğu büyük ölçüde aynı, render farklı. Nav data `useLayoutNavigation.ts` (395 LoC) içinde zaten tek yerde. Ayrıca `frontend/src/surfaces/{canvas,atrium,bridge}/` altında DAHA YENİ bir yüzey mimarisi mevcut | **Kısmen Doğru / Modası Geçmiş.** DRY ihlali hook seviyesinde var; ama nav truth zaten tek kaynaktan. Gemini planı `surfaces/` mimarisinden habersiz yazılmış; bu katmanda konsolidasyon zaten başlamış. |
| B3 | Review gate enforcement | "Publish akışında review gate her yerde uygulanmıyor, backend'de hard enforce edilmeli" | `backend/app/publish/service.py::trigger_publish` içinde `PublishStateMachine.can_publish()` çağrısı hâlihazırda hard-enforce ediyor; status `approved`/`scheduled`/`failed` değilse `INVALID_STATE` fırlıyor | **Zaten Yapılmış.** Gemini yokluğunu varsayıyor, varlık kanıtlı. Plan maddesi gereksiz. |
| B4 | Full-auto publish_now bypass | "`automation_publish_policy == 'publish_now'` durumunda draft bypass olabiliyor, kilitlensin" | `backend/app/full_auto/service.py::on_job_completed` (satır 415-455) "ALWAYS leaves the content in draft (first phase spec) … Never auto-publishes, regardless of automation_publish_policy" yorumlu ve guardrail'li. Audit log da yazılıyor. Plan guard zaten hard-coded | **Zaten Yapılmış.** Gemini'nin istediği kilit Faz 1 spec'inde mevcut; plan maddesi gereksiz. |
| B5 | UserAutomationPage visual flow builder | "Checkpoint matrisi sadece liste; görsel node-graph editörü eklensin" | `UserAutomationPage.tsx` 293 LoC; 5 checkpoint (source_scan, draft_generation, render, publish, post_publish) dropdown'la yönetiliyor; `is_enabled` toggle, yeni policy create, mevcut policy update mutations mevcut. **Görsel canvas YOK** (react-flow/xyflow/reactflow paketi bağımlılıklarda değil) | **Kısmen Doğru.** İşlev var ama "visual flow" kısmı gerçekten yok. Eklenecekse büyük bir iş; plan tahmini bir-iki sayfa ekleme değil ciddi bir UI epic'i. |
| B6a | Dashboard autopilot digest | "Kullanıcı dashboard'ında 'bugün N otomasyon çalıştı, M onay bekliyor' özeti gösterilsin" | `UserDashboardPage.tsx` (285), `CanvasUserDashboardPage.tsx` (477), `AtriumUserDashboardPage.tsx` (666) mevcut. `automation_runs_today` / `queued` / `digest` referansı YOK (grep: 0 eşleşme dashboard dosyalarında) | **Eksik.** Pipeline backend'de var (`ContentProject.automation_runs_today`) ama frontend dashboard'a bağlanmamış. Meşru plan maddesi. |
| B6b | Content calendar | "Haftalık/aylık içerik takvimi lazım" | `UserCalendarPage.tsx` 827 LoC, `AdminCalendarPage.tsx` de var. Week/Month view, channel filter, event type filter, detail side panel, policy summary bar mevcut | **Zaten Yapılmış.** Plan maddesi gereksiz. |
| B6c | Sidebar truth map | "Sidebar itemları 4 farklı dosyada kopyalanmış, tek kaynağa çekilsin" | `useLayoutNavigation.ts` içinde `ADMIN_NAV`, `USER_NAV`, `HORIZON_ADMIN_GROUPS`, `HORIZON_USER_GROUPS` zaten export ediliyor; Classic ve Horizon layout'lar aynı export'u import ediyor | **Zaten Yapılmış.** Plan maddesi modası geçmiş. |

### 4.2 Maddelere İlişkin Ayrıntılı Notlar

**B1 — Theme persistence.**
- `themeStore.ts` satır 77-87: `saveActiveThemeId` localStorage'a yazar + `updateSettingAdminValue("ui.active_theme", id)` çağırır.
- `hydrateFromBackend` (satır 288-317): localStorage boşsa `fetchEffectiveSetting("ui.active_theme")` ile backend değeri çeker ve localStorage'a yazar.
- Modül yüklenirken bir kez çalıştırılır (satır 323).
- Eksik olan: SSE invalidation (başka sekmeden tema değişti haberi yok). Bu bir "ek iyileştirme" maddesi, kök yokluk değil.

**B2 — Layout konsolidasyonu.**
- Hook duplikasyonu: `useCommandPaletteShortcut()`, `useGlobalSSE()`, `useNotifications({ mode: "admin" })`, command palette context effect, command register/unregister effect — her iki admin layout'ta da aynı (dosyalar satır 28-52 civarı).
- Nav data duplikasyonu: **yok.** `useLayoutNavigation.ts` satır 24-63 `ADMIN_NAV`; satır 74-87 `USER_NAV`; satır 95-182 `HORIZON_ADMIN_GROUPS`; satır 188-... `HORIZON_USER_GROUPS`. Her ikisi de aynı dosyadan türetiliyor.
- Daha önemli bulgu: `frontend/src/surfaces/manifests/register.tsx` üzerinden register edilen `canvas/atrium/bridge` yüzeyleri var. Bu sistem sidebar/layout varyantlarını "mode" seçicisi ile yönetiyor. Gemini planı bu mimariye değinmiyor.

**B3 — Review gate.**
- `backend/app/publish/service.py::trigger_publish` satır 483-532 civarı; `PublishStateMachine.can_publish(status)` döndürmezse `INVALID_STATE` hatası fırlıyor.
- `backend/app/publish/state_machine.py` dosyasında izinli hallar açıkça tanımlanmış.
- Frontend `/user/publish` + `/admin/publish` bu hatayı yakalayıp kullanıcıya "Bu kayıt onaylanmamış" uyarısı gösteriyor.

**B4 — Full-auto bypass.**
- `service.py::validate_guardrails` satır 210-214: `automation_publish_policy == "publish_now"` için uyarı üretiyor ama engellemiyor.
- `service.py::on_job_completed` satır 415-455: run_mode `full_auto` ise ne yapılırsa yapılsın içeriği draft bırakıyor; "phase1_note: publish gate bypass kapali; sonuç her zaman draft olarak birakilir" audit log'una yazılıyor.
- `automation_require_review_gate` ve `automation_publish_policy` alanları `ContentProject` modelinde mevcut; `full_auto` migration'larında (001, 003, 005, 008) kararlı biçimde yönetiliyor.
- İleride Faz 2'de publish-now gerçekten aktif edilmek istenirse bu hook'ta değişiklik gerekir. Şu an için kilit SERT.

**B5 — UserAutomationPage.**
- 293 LoC, checkpoint-per-row dropdown UI. Form odaklı, flow odaklı değil.
- "Görsel akış" için adayı yeni bir komponent olurdu (örn. `AutomationFlowCanvas.tsx`). Plan bunu öneriyor ama dependency olarak `react-flow` veya benzeri henüz eklenmiş değil.

**B6a — Dashboard autopilot digest.**
- Backend'de `ContentProject.automation_runs_today` / `automation_runs_today_date` alanları mevcut; `_bump_runs_today` her full_auto çalıştırmasında ilerletir.
- Frontend dashboard'ları bu alanları okumuyor. `AtriumUserDashboardPage.tsx` içinde "queued" geçiyor (satır 54) ama bu job queue için, autopilot digest için değil.
- Meşru eksik. Plan maddesi geçerli.

**B6b — Content calendar.**
- `UserCalendarPage.tsx` 827 LoC; `AdminCalendarPage.tsx` de mevcut. Event type filtresi (`content_project` / `publish_record` / `platform_post`), policy summary bar, channel cross-reference, detail side panel hazır.
- `frontend/src/api/calendarApi.ts` 70 LoC; `fetchCalendarEvents`, `fetchChannelCalendarContext` mevcut.
- Backend endpoint: `/api/v1/calendar/events` (var olduğu ilgili router'dan teyit edilebilir).

**B6c — Sidebar truth map.**
- Zaten `useLayoutNavigation.ts` içinde tek noktadan.

---

## 5. Kod Kanıt Dosyaları (Referans)

### Effective Settings
- `backend/app/settings/settings_resolver.py` (satır 98: `KNOWN_SETTINGS = {...}`)
- `backend/app/settings/settings_seed.py` (satır 50-65: `visible_to_user=bool(meta.get("visible_to_user", False))`)
- `backend/app/settings/service.py` (satır 39-50: `list_settings(..., visible_to_user_only=True)`)
- `backend/app/settings/router.py` (satır 236-253: role-based post-filter)
- `backend/app/visibility/dependencies.py` (satır 39-49: `get_caller_role`, varsayılan "user")
- `frontend/src/api/client.ts` (`getActiveUserHeaders`: role header YOK)
- `frontend/src/components/settings/EffectiveSettingsPanel.tsx` (satır 70 `groupOrder`, satır 134-145 fallback)

### Gemini Plan
- `frontend/src/stores/themeStore.ts` (satır 77-87 save, satır 288-317 hydrate, satır 323 module-load)
- `frontend/src/app/layouts/AdminLayout.tsx` (80 LoC)
- `frontend/src/app/layouts/HorizonAdminLayout.tsx` (189 LoC)
- `frontend/src/app/layouts/useLayoutNavigation.ts` (395 LoC, tek kaynak nav)
- `frontend/src/surfaces/manifests/register.tsx` (canvas/atrium/bridge kayıtları)
- `backend/app/publish/service.py::trigger_publish`
- `backend/app/full_auto/service.py` (satır 210-214 warning, satır 415-455 always-draft kilidi)
- `frontend/src/pages/user/UserAutomationPage.tsx` (293 LoC)
- `frontend/src/pages/user/UserCalendarPage.tsx` (827 LoC)
- `frontend/src/pages/UserDashboardPage.tsx` (285 LoC) + canvas (477) + atrium (666) varyantları
- `frontend/package.json` (react-flow / xyflow bağımlılığı YOK)

---

## 6. Kanıta Dayalı Karşılaştırma: Plan vs. Kod

| Boyut | Gemini Planı Sanıyor | Kodda Gerçek Durum |
|---|---|---|
| Theme backend persistence | Yok, ekleyin | Var (fire-and-forget save + hydrate) |
| Layout shell sayısı | 4 farklı | 4 layout + surface sistemi; nav data ortak |
| Publish review gate | Gevşek, sıkılaştırın | State machine ile sıkı enforce |
| Full-auto publish_now | Bypass riski var | Hard-coded always-draft kilidi |
| Automation policy UI | Görsel flow builder | Checkpoint matrix (form UI) |
| Autopilot dashboard digest | Var | Backend alanı var, frontend'e bağlı değil |
| Content calendar | Eksik / kısmi | Dolu implementasyon (827 LoC) |
| Sidebar truth map | Dağınık | Tek dosya (`useLayoutNavigation.ts`) |

---

## 7. Risk Notları ve İleri Adımlar (yalnızca tavsiye, bu fazda uygulanmıyor)

- **Phase AL (öneri):** Effective Settings admin görünürlüğünü düzeltmek için tek odaklı küçük PR.
  1. `frontend/src/api/client.ts::getActiveUserHeaders()` → aktif user.role'ünü `X-ContentHub-Role` olarak gönder.
  2. Dönüşte `EffectiveSettingsPanel.tsx` `groupOrder` listesine `tts`, `channels`, `automation`, `product_review` ekle (sıralama için).
  3. Test: admin loginle /admin/settings → 204'e yakın (canlı seed'e göre) satır; user loginle → yine 16 satır.
- **Phase AL+1 (öneri):** Gemini planındaki sadece meşru maddeler için ayrı PR'lar:
  - (a) Dashboard autopilot digest: `automation_runs_today` + publish queue count kartı ekle.
  - (b) Admin layout hook konsolidasyonu: ortak effect'leri `useAdminLayoutShell()` hook'una çek.
  - (c) Theme cross-device senk için SSE bridge (opsiyonel).
- **Kesinlikle YAPILMAMASI gerekenler:**
  - Full-auto always-draft kilidini Faz 1'de açmak.
  - `visible_to_user` bayrağını KNOWN_SETTINGS'te topluca True'ya çevirmek.
  - Surface mimarisinden habersiz "layout'ları tek dosyada birleştir" refactor'ü.

---

## 8. Sonuç

Effective Settings sorunu küçük, tek noktada çözülebilir bir yetki/header çerçeveleme hatası. Gemini master planı'nın 8 maddesinden **3'ü zaten yapılmış**, **3'ü kısmen yapılmış**, **2'si meşru eksik**. Planı olduğu gibi uygulamak tekrar iş + kasıtlı kilidi gevşetme + surface mimarisiyle çakışma riskleri taşır. Phase AL için önerilen asgari düzeltme 1 frontend dosyasında birkaç satır.

— End of report —
