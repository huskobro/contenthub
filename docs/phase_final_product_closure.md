# Phase Final — Ürün Kapanış Turu (F1 Discovery + Impact Map)

**Amaç:** ContentHub'ı "faz kapatma" modundan çıkarıp **final ürün hazırlığı** moduna almak. Bu doküman F1 Discovery çıktısıdır; F2-F6'nın rotasını çizer ve her faz tamamlandıkça güncellenir.

**Tarih:** 2026-04-17 · **Branch:** `worktree-audit+effective-settings-and-gemini-plan` · **Main dokunulmadı.**

---

## 0. Bu Turun Sınırı

- 8 eksene göre ilerlenecek (kanonik akış, effective settings, ownership, automation UX, calendar/publish/analytics, layout/surface, teknik temizlik, merge readiness).
- **Yapılmayacak:** Tüm sistemi baştan yazmak, ağır kütüphane eklemek, tema/design-token'ları bozmak, erken SaaS/billing/multi-tenant.
- **Kesin kural:** Güvenlik enforcement backend'de gerçek; UI sadece yardımcı. Hiçbir gizli bypass/flag/fallback.

---

## 1. F1 Discovery — Temel Bulgular

### 1.1 Önceki fazlardan kapanan işler (tekrar açmıyoruz)

| Alan | Kapanan iş | Commit |
|---|---|---|
| Ownership | AM-2 platform_connections (11 endpoint) | `06108df` |
| Ownership | AM-3 users + audit-logs admin guard | `a1c4bd6` |
| Ownership | AN-1 automation_policies + operations_inbox (11 endpoint + 9 servis) | `50500a0` |
| Settings drift | AM-4 mark_orphan_settings + drift/drift-repair endpoints | `6ecfd1c` |
| Frontend cache | AM-5 scoped query keys | `ee03737` |
| Docs | AM/AN closure notları | `7a71375` / `13d1c0f` |

Bu alanları **yeniden icat etmiyoruz**. Sadece kalan açıkları kapatıyoruz.

### 1.2 F1 çıktısı — F2 için zorunlu backlog

#### A. Ownership ekstra gap'leri — kritik, bu turda kapanacak

Repo-gerçek taraması 16 backend modülünde `get_current_user_context`/`require_admin` dependency **yok**. Bu durum `automation/router.py` + `platform_connections/router.py` gibi AN-1/AM-2 örüntüsüne göre Gümüş standart gerektirir.

| Öncelik | Modül | Gap özeti | Hedef pattern |
|---|---|---|---|
| **P0** | `notifications/router.py` | Hiçbir endpoint'te UserContext yok; `owner_user_id` query paramı unauth spoof yüzeyi | AM-2 |
| **P0** | `comments/router.py` | `user_id` query paramı → reply_to_comment impersonation | AM-2 |
| **P0** | `posts/router.py` | `user_id` query paramı → submit_post impersonation | AM-2 |
| **P0** | `playlists/router.py` | `user_id` query paramı → add_video_to_playlist impersonation | AM-2 |
| **P0** | `engagement/router.py` | `user_id` query paramı → cross-user task enumeration | AM-2 |
| **P0** | `settings/router.py` | `/credentials` PUT admin-only değil; `list_effective` ctx yok | require_admin + AM-2 |
| **P1** | `brand_profiles/router.py` | `owner_user_id` query filter; get/patch/delete hiç korumasız | AM-2 |
| **P1** | `calendar/router.py` | `owner_user_id` query paramı spoof | AM-2 |
| **P1** | `content_library/router.py` | Hiç filter yok, bütün kullanıcıların içeriği geri döner | AM-2 |
| **P1** | `full_auto/router.py` | `update_project_automation_config` ctx yok | AM-2 |
| **P1** | `discovery/router.py` | unified search cross-user leak | AM-2 |
| **P1** | `assets/router.py` | job_id filter sahiplik doğrulanmıyor | AM-2 |
| **P2** | `sources/router.py` | Global katalog → admin-only'e çekmek gerek | require_admin |
| **P2** | `source_scans/router.py` | sources'a piggyback | require_admin |
| **P2** | `news_items/router.py` | Global moderation → admin-only | require_admin |
| **P2** | `used_news/router.py` | Sahiplik modeli yok; tasarım kararı gerekli | tasarım kararı |
| **P2** | `onboarding/router.py` | Global state; require_visible yeterli mi değerlendir | preventive |
| Kapandı | `audit/router.py` | `require_admin` mevcut (line 34) | ✅ |

> **Çatal nokta (kullanıcı onayına sunulmayacak, zaten CLAUDE.md gereği):** sources/news_items/used_news'in "user-owned" mi "admin-only global" mı olması. Proje hedef kitlesi single-admin + multi-user; **admin-only global** tercih edilecek — çünkü veri modeli tekil (her kullanıcının ayrı news_items havuzu olması MVP'nin dışında). Bu AL doc'unda da işaret edilmiş.

**F2'de yapılacak iş:** P0 + P1 tamamı bu turda kapanacak. P2 için en temiz karar: `require_admin` dependency. Gerekirse P2 sonraki tur'a bırakılmayacak — hepsi bu turda kapatılacak, çünkü kullanıcı "ertelenmiş işleri de artık masada" dedi.

#### B. Effective Settings — drift repair'in kapamadığı son açıklar

Repo-gerçek ölçümü (`KNOWN_SETTINGS` ve `backend/data/contenthub.db`):

| Metrik | Registry | DB (active) | Durum |
|---|---|---|---|
| Toplam anahtar | 204 | 120 active + 14 deleted + 2 inactive = 136 | Drift var |
| visible_to_user=True | 16 | 4 (eski `output_dir`/`workspace_root`) | 🔴 Kritik mismatch |
| visible_in_wizard=True | 5 | 0 | 🔴 |
| type=prompt | 10 | 6 | 🔴 |
| status=orphan | — | 0 | 🔴 `mark_orphan_settings` çalışmış ama son uygulamada test.* hâlâ active (DB dosyası eski çalıştırma) |
| test.* orphan adayı | 0 | 60 (42 active, 14 deleted, 2 inactive) | 🔴 |

**Teşhis:**
- `seed_known_settings` (yeni satır yaratır), `sync_visibility_flags_from_registry`, `sync_default_values_from_registry`, `mark_orphan_settings` **hepsi yazılı ve main.py'de çağrılıyor** (line 128-155).
- Ama geçerli DB snapshot'ı eski; bu fonksiyonlar son çalıştırmada çağrılmamış (test DB'si olası). Yani **kod doğru, veri eski**.
- Gerçek gap: `visible_to_user=True` 16 registry key'in 14'ü `tts.*`, 2'si `channels.*` — DB'de bu anahtarlar için `visible_to_user=1` flag'ı yok. Yani `seed_known_settings` bu anahtarları DB'ye ilk eklerken `visible_to_user=True` yazmış mı? Evet (settings_seed.py:57 `visible_to_user=bool(meta.get("visible_to_user", False))`). Demek ki DB'de `tts.*`/`channels.*` satırları zaten var ama `visible_to_user=0` ile yaratılmış. `sync_visibility_flags_from_registry` bunu düzeltmeli — ama çalıştırılmamış.

**F2'de yapılacak iş:**
1. Smoke script ile fresh-DB'de bu 4 fonksiyon'u bir kez çalıştır, test.* kayıtlarını orphan'a çek, 16 visible key'i doğrula.
2. Frontend `groupOrder` mapping'ine `tts`, `channels`, `automation`, `product_review` gruplarını ekle (halen eksikti).
3. Startup log doğrulaması: son deploy'da mark_orphan_settings ve sync_visibility_flags_from_registry gerçekten çalışıyor mu — test ekle.
4. (Opsiyonel, düşük risk) Legacy `output_dir`/`workspace_root` → `system.output_dir`/`system.workspace_root`'a hard-migrate; eski satırları deleted işaretle.

#### C. Frontend sadeleştirme — gerçek borçlar (ajan doğrulamalı)

Repo tarama (95 route):

| Borç | Kanıt | Aksiyon |
|---|---|---|
| `UserPublishEntryPage.tsx` dead-code (routed değil, sadece smoke test için duruyor) | Router.tsx line 201: `/user/publish` doğrudan `UserPublishPage` mount ediliyor | **Sil** veya archive klasörüne taşı |
| 5 surface (legacy/horizon/bridge/canvas/atrium) coexist — architectural intent | Registry pattern kasıtlı, feature-flag'li, default kapalı | **Koru** — consolidation gerekmez |
| Admin/User için aynı JobDetail + PublishDetail | Router'da ikiz route, backend scope eder | **Koru** — rol-bazlı doğru ayrım |
| Wizard vs Create page ikizleri (NewsBulletinCreate + NewsBulletinWizard) | Admin flow vs user flow farklı | **Koru** — kasıtlı |
| UserContentEntryPage + UserPublishEntryPage + UserSettingsPage üst düzey sayfa split'i | UserDashboard + user/* ayrı role-gate'ler | **Koru** — UserPublishEntryPage hariç |

> **Sonuç:** Frontend'de büyük refactor yok. Sadece 1 dead page sil, groupOrder'a 4 grup ekle. Gemini'nin "layout consolidation" önerisi — `useLayoutNavigation.ts` zaten single-source; gerçek DRY zaten yapılmış. **Zaten var.**

#### D. Automation UX — gerçek durum

- `UserAutomationPage` 5-dropdown form; `@xyflow/react` gibi ağır bir bileşen yok ve **eklemeyeceğiz** (kullanıcı "ağır yeni kütüphane ekleme" dedi).
- Backend `ContentProject.automation_runs_today` alanı var; frontend dashboard bağlı değil → **bu turda bağla**.
- Review gate hard-enforce (`PublishStateMachine.can_publish()`) — **zaten var.**
- Full-auto `publish_now=False` (ALWAYS draft, audit log) — **zaten var.** `backend/app/full_auto/service.py:415-455`.

**F4'te yapılacak iş:** Sadece dashboard digest bağlantısı + Zapier/n8n hissi için UserAutomationPage'de net görsel ilerleme/status rozeti (küçük bir hook + Tailwind, yeni kütüphane yok).

### 1.3 Gemini Reality-Check

| Gemini önerisi | Durum | Aksiyon |
|---|---|---|
| Theme cross-device persistence | Kısmen var (POST + localStorage; SSE sync yok) | **Yapılacak** — F4 veya F5'te minimal patch |
| Layout consolidation (DRY shell) | Zaten var (`useLayoutNavigation.ts`) | Yapma |
| Publish review hard-enforce | Zaten var (`PublishStateMachine`) | Yapma |
| Full-auto publish_now ALWAYS draft | Zaten var (`full_auto/service.py:415-455`) | Yapma |
| UserAutomationPage visual flow (xyflow) | Yapılmalı ama **ağır lib ekleme** yasak | **Hafif görsel ilerleme rozeti** yap, xyflow ekleme |
| Dashboard autopilot digest | Backend var, frontend yok | **Yapılacak** F4 |
| Content calendar | `UserCalendarPage` 827 LoC zaten var | Yapma; sadece dashboard linki ekle |
| Sidebar truth map | Zaten single-source | Yapma |
| Mobile/responsive PWA | CLAUDE.md "localhost-first" → PWA kapsam dışı | Yapma; sadece breakpoint'i olmayan 4 legacy layout'ta Tailwind responsive class minimum eklenebilir |

---

## 2. Faz Yol Haritası (F2-F6)

| Faz | İş | Kriter |
|---|---|---|
| **F2** | Ownership P0/P1/P2 kapama + Effective Settings sync doğrulama + groupOrder mapping + UserPublishEntryPage dead-code temizliği | Tüm /notifications, /comments, /posts, /playlists, /engagement, /settings/credentials, /brand_profiles, /calendar, /content_library, /full_auto, /discovery, /assets, /sources, /source_scans, /news_items, /used_news, /onboarding → `get_current_user_context` veya `require_admin` guard. 50+ regression test. |
| **F3** | Kanonik akış netleştirme: top-level UserContentEntryPage + UserPublishEntryPage + UserSettingsPage split'ini belgele, dead page sil | Tek bir akış haritası `docs/final_product_flow_map.md` |
| **F4** | Automation/Calendar/Publish/Dashboard birleştirme: autopilot digest, automation status rozeti, calendar link | Hafif, ek kütüphane yok |
| **F5** | Layout/surface: sürekli var olan sistemi bozmadan teyit + theme SSE patch (küçük) + mobil responsive audit (sadece rapor) | Surface sistemi kasıtlı, dokunma |
| **F6** | Final verification: backend + frontend test, tsc, build, merge readiness | `docs/final_merge_readiness_report.md` |

---

## 3. Risk ve Kurallar

- **Main branch asla etkilenmez.**
- **Hiçbir test skip edilmez** — skip ancak "retired feature" içinse belgelenir.
- **Güvenlik enforcement backend-first**; UI sadece yardımcı.
- **Settings Registry tek otorite**; hardcoded default yok.
- **Ağır kütüphane eklenmez**; mevcut Tailwind/Lucide/Zustand/React Query omurgası korunur.
- **Worktree commit disiplini**: her anlamlı adım ayrı commit, db/uploads hariç.

---

## 4. F1 Teslimat Özeti

1. **Ne yapıldı:** 4 paralel discovery ajanı + repo-gerçek SQLite + Python registry ölçümü. Backlog 1:1 repo kanıtıyla hizalandı.
2. **Hangi dosyalar değişti:** Sadece bu doc oluşturuldu (`docs/phase_final_product_closure.md`). Kod dokunulmadı.
3. **Hangi testler çalıştı:** F1 discovery read-only; test koşulmadı.
4. **Sonuç:** Net F2-F6 yol haritası + 16 modül ownership backlog + 4 settings-sync eksiği.
5. **Ek risk:** P2 (sources/news_items/used_news) tasarım kararı "admin-only" olarak not edildi; F2'de ilk commit'te uygulanır, çatal değildir.
6. **Commit hash:** (bu commit'le atılacak)
7. **Push durumu:** (commit sonrası)

---

**Sonraki faz:** F2 — ownership + effective settings + dead code temizliği.
