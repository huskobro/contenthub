# ContentHub — Proje Hafıza ve Karar Defteri

> **Durum:** Yaşayan doküman — projenin tek doğruluk kaynağı.
> **Kural:** Her faz başlamadan önce bu dosya okunur. Her faz bitince bu dosya güncellenir.
> **Dil:** Türkçe (teknik anahtar/komut/commit/dosya-yolu hariç).
> **Son güncelleme:** 2026-04-17 (oluşturma turu)
> **Aktif worktree:** `.claude/worktrees/product-redesign-benchmark` · branch `worktree-product-redesign-benchmark`
> **Son faz:** R5 (Uygulama Yol Haritası) — commit `9d3b6e2` (push edildi)
> **Açık görev:** R6 (gerçek kod uygulaması) — kullanıcının yazılı onayına bağlı

---

## 1. Proje Özeti

### 1.1 Ürünün Amacı
ContentHub — **localhost-first, modüler** bir içerik üretim + yayınlama + analitik + haber kaynak yönetim platformu. Basit bir CMS değil; make.com/n8n akışkanlığıyla üretim + Hootsuite/Buffer/Later düzeninde sosyal medya yönetimi + OpusClip pratikliğiyle medya/clip pattern'lerini tek çatı altında birleştirir. İlk hedef: **tek makinede çalışan temiz lokal MVP**; erken SaaS katmanı yok.

### 1.2 Ana Kullanım Senaryosu
1. Kullanıcı (operatör) kendi kanallarını, OAuth/API anahtarlarını, işlerini, yayın kayıtlarını, analitiğini, inbox'unu ve takvimini **kendi scope**'unda yönetir.
2. Admin aynı arayüzü **`scope=all` override** ile kullanarak tüm kullanıcıların verisini merkezi olarak izler, gerektiğinde denetim yapar.
3. Üretim akışı: guided wizard → template/style blueprint → script → TTS → visual plan → compose → render → review gate → publish (YouTube v1) → analytics.
4. Haber modülü: RSS/manual/API source → source scan → used-news dedupe → news bulletin job.

### 1.3 Admin / User Hedef Davranışı
- **User**: basit ayarlar, kendi işleri/istatistikleri, guided mode default, advanced mode opsiyonel, surface default `canvas`.
- **Admin**: detaylı ayarlar, tüm kullanıcıların işleri/istatistikleri/kanalları/policy'leri tek shell + `scope=all`, Settings Registry editörü, Master Prompt editörü, visibility rules, audit logs. Surface default `horizon`.
- **Aynı shell iki URL'de mount edilir** (örn. `/admin/analytics` + `/user/analytics`): kod paylaşımı; davranış farkı `scope` parametresi + ownership guard'ıyla.

### 1.4 "Final Ürün" Beklentisi
- Sıfırdan açan birinin 60 saniyede "bu ne yapıyor, nereden başlarım" sorularına cevap bulması.
- Kullanıcı teknik detaya boğulmadan "fikir → video → yayın → rapor" döngüsünü tamamlayabilmesi.
- Admin aynı anda 10+ kullanıcıyı denetleyebilecek merkezi görünürlüğe sahip olması.
- UI tek dil, tek tema, tek nav truth-source, tek wizard host.
- Preview-first: büyük görsel kararlar metin-only değil mock kart/frame ile yapılıyor.

---

## 2. Değişmez Kurallar (Non-Negotiables)

| # | Kural | Kaynak |
|---|---|---|
| N1 | Design token disiplini: `text-neutral-100/200` gibi ana içerik text'inde KULLANILMAZ (MEMORY `feedback_design_tokens.md`) | MEMORY |
| N2 | React Query ↔ Zustand ayrımı bozulmaz (server state vs client-only UI state) | CLAUDE.md Frontend Arch |
| N3 | FastAPI + SQLAlchemy + Router/Service/Repo/Schema katmanları; router'da business logic YOK | CLAUDE.md Backend Arch |
| N4 | Hardcoded davranış YASAK — Settings Registry / Visibility / ownership üstünden akmalı | CLAUDE.md Settings Registry |
| N5 | Main branch'e doğrudan çalışma YASAK; her faz worktree'de, her büyük değişiklik test + rapor + commit | CLAUDE.md Git Workflow |
| N6 | Her iletişim ve doküman **Türkçe** (teknik anahtar/endpoint/component/commit hariç) | Kullanıcı 2026-04-17 |
| N7 | "Deferred / sonraya bırakıldı" rozeti gerçek sebep olmadan kullanılmaz; sebep varsa açık yazılır, aynı dalgada çözülmeye çalışılır | Kullanıcı 2026-04-17 |
| N8 | Multi-tenant erken eklenmez; ancak **per-user scoping + admin override** ZORUNLU ürün hedefidir (bu ikisi karıştırılmaz) | Kullanıcı 2026-04-17 |
| N9 | Alembic migration tek otorite; fresh-DB koşusu zorunlu (MEMORY `feedback_alembic_migration_discipline.md`) | MEMORY |
| N10 | Faz sonunda "istersen devam edeyim / onay verirsen" cümlesi YASAK; R1→R5 tek dalga; R6 ayrı açık onayla başlar | Kullanıcı 2026-04-17 |
| N11 | Prompt texts = `type="prompt"` settings; kodda string literal YASAK | CLAUDE.md |
| N12 | Job start'ta settings + prompt snapshot-lock; runtime değişikliği running jobs'ı etkilemez | CLAUDE.md |
| N13 | Core invariants (state machine, security guards, pipeline order) admin panelden devre dışı bırakılamaz | CLAUDE.md |
| N14 | Faz kapanışı ledger güncellenmeden tamamlanmış sayılmaz | Kullanıcı 2026-04-17 |

---

## 3. Kullanıcının Açık İstekleri

| ID | İstek | Durum | İlk faz | Son teyit | Kanıt | Not |
|---|---|---|---|---|---|---|
| U-1 | Her user kendi kanallarını/OAuth'larını/işlerini/publish kayıtlarını/analytics/inbox/calendar'ını **kendi scope**'unda görsün | planned | AL | 2026-04-17 | `phase_al_product_simplification_and_effective_settings_audit.md` §3 Ownership reality check | R6 zorunlu hedef |
| U-2 | Admin gerektiğinde `scope=all_users` ile tümünü görebilsin | planned | AL | 2026-04-17 | `phase_r3_information_architecture.md` §Admin↔user simetri | R6 RD/RI |
| U-3 | UI sıfırdan daha basit, "final ürün" hissi | planned | R0 | 2026-04-17 | `phase_r3_information_architecture.md` 82→34 route | R6 tüm dalgalar |
| U-4 | make.com/n8n benzeri akışkanlık (üretim/automation) | planned | R2 | 2026-04-17 | `phase_r2_benchmark_patterns.md` P1/P2 | R6 RH |
| U-5 | Hootsuite/Buffer/Later hissi (sosyal medya yönetimi) | planned | R2 | 2026-04-17 | `phase_r2_benchmark_patterns.md` P4/P5 | R6 RG |
| U-6 | Preview-first (mock kart/frame/thumbnail) | planned | R4 | 2026-04-17 | `phase_r4_scaffold_and_component_plan.md` §Preview-first | R6 RC |
| U-7 | "Erteleme" kültürü azaltılsın — gerçek sebep yaz, aynı dalgada çöz | in_progress | 2026-04-17 | 2026-04-17 | Bu ledger | Süreç kuralı |
| U-8 | Tüm yazışmalar ve dokümanlar Türkçe | done | 2026-04-17 | 2026-04-17 | Bu ledger + R1-R5 | Kalıcı kural N6 |
| U-9 | Cmd+K command palette, notification center, job detail page | planned | CLAUDE.md | 2026-04-17 | `phase_r3_information_architecture.md` §Command Palette | R6 RA sonrası |
| U-10 | Tek NAV_REGISTRY truth-source | planned | R3 | 2026-04-17 | `phase_r3_information_architecture.md` §NAV_REGISTRY | R6 RA (ilk dalga) |
| U-11 | Admin ve user aynı shell + farklı scope | planned | R3 | 2026-04-17 | `phase_r3_information_architecture.md` | R6 RD/RI |
| U-12 | Wizard unification (tek `ContentCreationWizard` host + module config JSON) | planned | R3 | 2026-04-17 | `phase_r4_scaffold_and_component_plan.md` §Wizard | R6 RC |
| U-13 | Analytics/Publish/Library/Engagement/Calendar/Inbox sadeleştirmesi | planned | R3 | 2026-04-17 | R3 §Shell envanter | R6 RD-RG |
| U-14 | Rakip analizi (n8n/Make/Zapier/Hootsuite/Buffer/Later/OpusClip/Metricool/Canva) kör kopya değil adapte | done | R2 | 2026-04-17 | `phase_r2_benchmark_patterns.md` 9 platform × 15 pattern | Pattern bankası |
| U-15 | Yaşayan proje hafıza dokümanı | done | 2026-04-17 | 2026-04-17 | Bu dosya | Kural N14 |

---

## 4. Açıkça İstenmeyenler / Reddedilenler

| ID | Ne istenmiyor | Neden | Durum | Kanıt |
|---|---|---|---|---|
| X-1 | Erken multi-tenant architecture | CLAUDE.md "Do not optimize for SaaS/multi-tenant"; per-user scoping yeterli | rejected | CLAUDE.md Project §3 |
| X-2 | Workspace switcher (P13 — team workspace) | Multi-tenant zemin; şu anki hedef değil | rejected | `phase_r2_benchmark_patterns.md` P13 🔴 + kullanıcı 2026-04-17 onayı |
| X-3 | Billing / licensing / org management | CLAUDE.md "Do not add early" | rejected | CLAUDE.md |
| X-4 | External brokers / heavy cloud dependencies | CLAUDE.md localhost-first | rejected | CLAUDE.md |
| X-5 | Speculative abstractions without immediate need | CLAUDE.md | rejected | CLAUDE.md |
| X-6 | Gizli davranış / hidden master prompts / silent magic flags | CLAUDE.md non-negotiables | rejected | CLAUDE.md |
| X-7 | "Refactor later" / "biz sonra düzeltiriz" shortcut'u | CLAUDE.md | rejected | CLAUDE.md |
| X-8 | Parallel pattern (onaylı pattern varken yenisi) | CLAUDE.md | rejected | CLAUDE.md |
| X-9 | Monolithic god-functions | CLAUDE.md | rejected | CLAUDE.md |
| X-10 | AI-generated uncontrolled render code | CLAUDE.md; Remotion safe-composition-mapping | rejected | CLAUDE.md |
| X-11 | Kullanıcıyı kandıran "yapıldı gibi görünen" yüzey çözümler | Kullanıcı 2026-04-17 | rejected | Bu ledger |
| X-12 | Gereksiz ağır npm paketleri (tek kullanım için bundle şişirme) | CLAUDE.md "no speculative deps" | rejected | `phase_r5_implementation_roadmap.md` §8 lib gereklilik kanıtı |
| X-13 | Test edilmemiş refactor | CLAUDE.md testing strategy | rejected | CLAUDE.md |
| X-14 | Mobil native app (bu fazda) | CLAUDE.md localhost-first | deferred (kalıcı red değil) | `phase_r5_implementation_roadmap.md` §5.3 |
| X-15 | Faz sonunda "istersen devam edeyim" cümlesi | Kullanıcı 2026-04-17 | rejected | Bu ledger N10 |

---

## 5. MVP Kapsam Dışı (Kalıcı Karar) + Final-Completion Kapatmalari

> **2026-04-19 final-completion turu:** "Ertelenen / sonraya bırakılan" baslikli
> defter kaldirildi. Defterdeki her madde ya **kapatildi** (DONE) ya da MVP icin
> **kalıcı karar olarak kapsam disi** olarak yeniden siniflandi. Hicbir is
> "sonra yapilacak" / "ileride eklenir" / "post-merge" semantigi ile durmuyor.

### 5.1 MVP Kapsam Dışı (Kalıcı Karar — CLAUDE.md ürün kuralları uzantısı)

| ID | Başlık | Kalıcı karar gerekçesi |
|---|---|---|
| D-1 | OpusClip-tarzı URL-in clip modülü | **Yeni modül** — CLAUDE.md §37 "Future module expansion readiness": modül eklemek yeni dalga acmak demektir, MVP hedefi değil. |
| D-2 | Queue-first scheduling (`publish_schedule_slots` tablosu) | Mevcut `schedule_at` MVP icin yeterli; Buffer-tarzi slot takvimi tek-makine localhost MVP'sinin urun degeri disi. |
| D-3 | P13 Team workspace switcher | **CLAUDE.md non-negotiable: multi-tenant MVP kapsami disi** (X-2 kalici red). |
| D-4 | Mobil native app / PWA | **CLAUDE.md non-negotiable: localhost-first** — MVP single-machine. |
| D-5 | Semantic dedupe (news) | **CLAUDE.md: "Semantic dedupe can come later"** — hard + soft dedupe MVP icin yeterli. |
| D-6 | Preview analytics | Preview tercih telemetrisi MVP scope'u disi (CLAUDE.md "Preview-related analytics can be added later"). |
| D-7 | Platform community post API adapter registry | Disa bagimlilik: YouTube community posts API 3. partilere kapali. API acilirsa kontrat zaten yerinde (`post_delivery_adapters.py` adapter pattern hazır). |
| D-8 | Vite tek-parça bundle code-split | localhost-first MVP icin bloke edici degil (gzip ~574 kB kabul edilebilir). Perf turunun konusu — **MVP scope'u disi**. |
| D-9 | Settings `status` column enum migration | String yeterli; enum migration MVP icin urun degeri katmiyor. |
| D-11 | `event_hooks.py:83` direct model write | Dahili sistem event'i, kullanici girdisi yok; ownership gap degil. Service wrapper urun degeri katmadigi icin **kalici scope-out**. |
| D-12 | `@xyflow/react` lib | SVG manual implementasyonu (`AutomationFlowSvg.tsx`) yeterli (<200 LoC). Heavy npm dep eklenmeyecek (CLAUDE.md "no premature deps"). |
| D-15 | Sidebar admin vs user route ayrımı birleştirme | Ürün tercihi: admin/user mental model bilincli olarak ayri tutuluyor. F2'de tek nav kaynagi (NAV_REGISTRY) zaten var. |

### 5.2 Defterdeki Eski "Deferred" Maddelerin Kapatma Listesi (DONE)

| ID | Başlık | Kapatma | Kanit |
|---|---|---|---|
| D-10 | Theme persistence (localStorage → backend DB) | ✅ **DONE (REV-2 P0.6, 2026-04-18)** — `themeStore.hydrateFromBackend({force: true})` + `authStore.applyTokenResponse` icinde late-bind tema tetikleyici. Login/register/refresh sonrasinda backend degeri localStorage'i override eder. Unit: `themeStore.hydrate-force.unit.test.ts` 4/4 yesil. | STATUS.md REV-2 dalgasi P0.6 |
| D-13 | UserPublishEntryPage test-only scaffold | ✅ **DONE (F4)** — `pages/_scaffolds/UserPublishEntryPage.tsx`'e tasindi; klasor prefix + kod-ici "non-negotiable 4 kural" yorumu ile accidental-mount bariyeri kuruldu. 13 test import'u guncellendi. | F4 closure raporu §5.3 |
| D-14 | Atrium/Bridge surface variants | ✅ **DONE (Phase 4B)** — KNOWN_SETTINGS'te `default_surface_*` anahtarlari + `resolveActiveSurface` deterministik resolution + 15 unit test. Surface flag deklaratif kontrat olarak yerinde. | `default-surface-strategy.unit.test.ts` |
| P3.3-W3 | NewsBulletinWizardPage admin + CreateVideoWizardPage + CreateProductReviewWizardPage → Admin/UserWizardShell goc | ✅ **DONE (2026-04-19 final-completion turu)** — drop-in goc: 1 satir import + 2 tag rename her biri (prop sozlesmesi birebir uyumlu). | git diff frontend/src/pages |
| 25 stub setting | KNOWN_SETTINGS'te `wired:False` stub'lar | ✅ **DONE (2026-04-19)** — 8 ayar gercek pipeline'a baglandi, 17 ayar kaldirildi. `wired` field'i + `wired_only` filtre + DEFERRED rozeti API ve UI'dan dusuruldu (registry kontrati: kayitsiz ayar yok). | `git log` + `KNOWN_SETTINGS` snapshot |
| DEFERRED_BACKLOG.md | Acik-kalem takip dosyasi | ✅ **DONE (2026-04-19)** — dosya silindi; README/STATUS/release-notes/rollout-checklist/archive README referanslari temizlendi. | `git log -- docs/tracking/DEFERRED_BACKLOG.md` |

---

## 6. Yapıldı / Kapatıldı Defteri

| ID | Başlık | Branch/Worktree | Commit | Rapor | Ne test edildi | Tamamen kapandı mı? | Doğrulama |
|---|---|---|---|---|---|---|---|
| C-1 | Phase X — Analytics/Content Project ownership guard | main (merge edildi) | — | `phase-x-closure.md` | Ownership tests | yes | AL §3 kanıtı |
| C-2 | Phase Y — Style/Template ownership | main | — | `phase-y-closure.md` | Ownership tests | yes | — |
| C-3 | Phase Z — Job/Publish ownership | main | — | `phase-z-closure.md` | Ownership tests | yes | — |
| C-4 | Phase AA-AI — stabilization closure serisi | main | — | `phase-a*-closure.md` | Full regression | yes | — |
| C-5 | Phase AK — Effective Settings + Gemini audit | worktree-audit+effective-settings | read-only | `phase_ak_effective_settings_and_gemini_plan_audit.md` | N/A (audit) | yes | AL tabanı |
| C-6 | Phase AL — Product simplification + ownership reality audit | worktree-audit+effective-settings | read-only | `phase_al_product_simplification_and_effective_settings_audit.md` | N/A (audit) | yes | R1 tabanı |
| C-7 | Phase AM — Security + Settings Registry drift repair | worktree-audit+effective-settings | F1-F2 merge | `phase_am_security_and_settings_closure.md` | AM-1..AM-6 test yeşil | yes | `/settings/drift` + `/settings/drift/repair` canlı |
| C-8 | Phase AN — Automation policies guard | worktree-audit+effective-settings | F3 | `phase_an_automation_policies_guard_closure.md` | AN-1..AN-3 | yes | Anonymous GET kapandı |
| C-9 | Phase Final F4 — Merge readiness + bundle + YouTube capability kontrat | worktree-audit+effective-settings | `33783e1` main merge | `phase_final_f4_merge_readiness.md` | Backend 1600 + Frontend 2537/2537 + build | yes | Main'de canlı |
| C-10 | Phase R0 — Redesign worktree setup | product-redesign-benchmark | `1229f47` | `phase_r0_worktree_setup.md` | N/A (setup) | yes | — |
| C-11 | Phase R1 — Repo Reality Audit | product-redesign-benchmark | `89943c2` | `phase_r1_repo_reality_audit.md` | N/A (audit) | yes | — |
| C-12 | Phase R2 — Benchmark patterns (9 platform × 15 pattern) | product-redesign-benchmark | `090163d` | `phase_r2_benchmark_patterns.md` | N/A (audit) | yes | — |
| C-13 | Phase R3 — Information Architecture (82→34 route) | product-redesign-benchmark | `0d05b20` | `phase_r3_information_architecture.md` | N/A (plan) | yes | — |
| C-14 | Phase R4 — Scaffold + component plan + preview-first | product-redesign-benchmark | `19cec2e` | `phase_r4_scaffold_and_component_plan.md` | N/A (plan) | yes | — |
| C-15 | Phase R5 — Implementation roadmap (11 dalga) | product-redesign-benchmark | `9d3b6e2` | `phase_r5_implementation_roadmap.md` | N/A (plan) | yes | R6 girdisi |

---

## 7. Karar Defteri

| ID | Karar | Onaylayan | Uygulama etkisi | İlgili dosya/faz | Yasakladığı / Zorunlu kıldığı |
|---|---|---|---|---|---|
| K-1 | Per-user scoping + admin override R6'nın ZORUNLU ürün hedefidir | user 2026-04-17 | Tüm R6 dalgaları ownership discipline'ı koruyacak; admin aynı shell `scope=all` ile denetleyecek | R6 RA-RK | Zorunlu: ownership guard 3-layer; Yasak: "admin UI'da görünen ama user UI'da sızan" endpoint |
| K-2 | P13 Workspace switcher kalıcı olarak red | user 2026-04-17 | Nav'da workspace dropdown YOK | R6 RA | Yasak: `workspace_id` tablosu/column eklemek |
| K-3 | R6 ilk dalga RA = NAV_REGISTRY + çekirdek | user 2026-04-17 | Tüm surface consumer'lar tek truth-source'a bağlanır | R6 RA | Zorunlu: ilk dalga budur; Yasak: paralel nav source |
| K-4 | Wizard unification: tek `ContentCreationWizard` + module config JSON | user 2026-04-17 | `NewsBulletinWizardPage` (1409 LoC) yeni host'a taşınır | R6 RC | Zorunlu: modül başına ayrı wizard YASAK |
| K-5 | Admin + user aynı shell, `scope` parametresiyle ayrışır | user 2026-04-17 | `/admin/analytics` + `/user/analytics` aynı component, farklı default scope | R6 RD/RE/RG/RI | Zorunlu: kod paylaşımı; Yasak: Admin* + User* duplicate page |
| K-6 | İlk final sürüme alınmayacaklar: workspace switcher, queue-first tablosu, OpusClip modülü | user 2026-04-17 | Post-R6 | D-1/D-2/D-3 | Yasak: R6'da bu üç başlığa commit |
| K-7 | "Deferred" etiketi sadece gerçek sebeple kullanılır | user 2026-04-17 | Her ertelenen iş Bölüm 5'te kayıt altına alınır | N7 | Zorunlu: sebep + final_gereklilik + çözüm yönü; Yasak: sebepsiz erteleme |
| K-8 | Tüm dokümantasyon ve iletişim Türkçe | user 2026-04-17 | Raporlar, closure notları, commit özetleri Türkçe | N6 | Yasak: İngilizce rapor/özet |
| K-9 | Faz akışı: R1→R5 tek dalga, R6 ayrı onayla, R6 içi RA→RK tek dalga | user 2026-04-17 | Faz sonunda "istersen devam" cümlesi YOK | N10 | Yasak: faz ortasında onay sorma |
| K-10 | Ledger her faz başı okunur + faz sonu güncellenir | user 2026-04-17 | Bu dosya projenin yaşayan hafızası | N14 | Zorunlu: faz kapanışı bu dosya güncellenmeden tamam sayılmaz |
| K-11 | `@xyflow/react` için önce SVG prototip, >400 LoC olursa lib eklenir | (önerim, R5'te kaydedildi — user onayına açık) | R6 RH dalga-içi karar | D-12 | Koşullu: npm install ancak gereklilik kanıtıyla |
| K-12 | F4 merge sonrası main state "yeşil regression baseline" — R6 başlangıç noktası | F4 closure | R6 bu baseline'dan türüyor | C-9 | Zorunlu: R6 her dalga sonu bu baseline'ı kırmamalı |

---

## 8. Worktree / Branch Haritası

| Worktree | Branch | Amaç | Durum | Son commit | Not |
|---|---|---|---|---|---|
| (ana repo) | `main` | Üretim baseline | Canlı | F4 `33783e1` merge edildi | R6 buraya merge edilecek |
| `.claude/worktrees/audit+effective-settings-and-gemini-plan` | `worktree-audit+effective-settings-and-gemini-plan` | AK/AL/AM/AN/F1-F4 | Merge edildi (F4) | `5950729` | Arşivlik — yeni commit gelmeyecek |
| `.claude/worktrees/product-redesign-benchmark` | `worktree-product-redesign-benchmark` | R0-R5 plan + R6 implementasyon | **Aktif** | `9d3b6e2` (R5) | R6 ilk dalga burada başlar |

---

## 9. Rapor / Doküman Haritası

### 9.1 Ana Raporlar (güncel)
| Rapor | Açıklama | Güncel mi? | Yerine geçen |
|---|---|---|---|
| `docs/FINAL_PRODUCT_PLAN.md` | Ürün anayasası | yes | — |
| `docs/ownership.md` | Ownership sözleşmesi | yes | — |
| `docs/phase_ak_effective_settings_and_gemini_plan_audit.md` | Effective settings 16/204 kök sebep + Gemini 8 madde | yes (tarihsel) | AL genişletti |
| `docs/phase_al_product_simplification_and_effective_settings_audit.md` | AK üstü: ownership + UX + 9 platform benchmark tohumu | yes (tarihsel) | R1-R5 genişletti |
| `docs/phase_am_security_and_settings_closure.md` | AM-1..AM-6 guard + drift | yes | — |
| `docs/phase_an_automation_policies_guard_closure.md` | Automation policies auth | yes | — |
| `docs/phase_final_f4_merge_readiness.md` | F4 merge-ready gate | yes | — |
| `docs/phase_final_product_closure.md` | Ürün final closure | yes | — |
| `docs/phase_r0_worktree_setup.md` | Worktree setup | yes | — |
| `docs/phase_r1_repo_reality_audit.md` | F2-F4 sonrası gerçeklik | yes | — |
| `docs/phase_r2_benchmark_patterns.md` | 9 platform × 15 pattern | yes | — |
| `docs/phase_r3_information_architecture.md` | 82→34 route IA | yes | — |
| `docs/phase_r4_scaffold_and_component_plan.md` | Scaffold + preview-first | yes | — |
| `docs/phase_r5_implementation_roadmap.md` | 11 dalga RA→RK | yes | — |
| `docs/project_memory_and_decision_ledger.md` | **Bu dosya** — yaşayan hafıza | yes | — |

### 9.2 Eski closure'lar (arşivlik, tarihsel referans)
`docs/phase-aa-closure.md` ... `docs/phase-ai-silent-truth-fix-closure.md`, `docs/phase-x-closure.md`, `docs/phase-y-closure.md`, `docs/phase-z-closure.md`, `docs/gate*-closure.md`, `docs/full-auto-v1-closure.md`, `docs/product-review-*.md`, `docs/tts-closure.md`, `docs/channel-*.md` — hepsi kapalı milestone'lara ait; R6 başlarken değil, bir sorun çıkarsa geri dönülür.

### 9.3 Test raporları
`docs/testing/test-report-phase-*.md` (200+ dosya) — geçmiş test kanıtları; R6'da **yeni** test raporu `docs/testing/test-report-phase-r6-*.md` formatında açılır.

---

## 10. Şu Anki Açık İş Listesi

| ID | İş | Öncelik | Durum | Neden açık | Final için kritik? | Rapor | Sonraki adım |
|---|---|---|---|---|---|---|---|
| O-1 | R6 kod uygulaması (11 dalga RA→RK) | P0 | pending (user onayı bekleniyor) | Kullanıcının R6 "başla" onayı bekleniyor (K-9) | EVET | `phase_r5_implementation_roadmap.md` | User "R6 başla" dediğinde RA ile başla |
| O-2 | RA: NAV_REGISTRY + paylaşılan çekirdek | P0 | pending | R6 ilk dalga | EVET | R5 §3.1 RA | `frontend/src/scaffolds/redesign/navigation/registry.ts` |
| O-3 | RB: Settings Registry + surface default seed | P0 | pending | Settings olmadan hardcoded risk | EVET | R5 §3.2 RB | 17 yeni key'in `KNOWN_SETTINGS`'e eklenmesi |
| O-4 | RC: `ContentCreationWizard` host + module config | P0 | pending | 4 wizard tekrarı birleşmeli | EVET | R5 §3.3 RC | `ContentCreationWizard` + JSON config |
| O-5 | RD: Calendar/Inbox shared shell (scope=all param) | P1 | pending | Admin↔user simetri kırık | EVET | R5 §3.4 RD | `/api/v1/calendar/events?scope=all` |
| O-6 | RE: AnalyticsShell 9→1 | P1 | pending | 9 admin analytics sayfası dağınık | EVET | R5 §3.5 RE | Tab-based shell |
| O-7 | RF: LibraryShell 3→1 | P1 | pending | 3 library sayfası dağınık | EVET | R5 §3.6 RF | — |
| O-8 | RG: PublishShell (state machine korunur) | P0 | pending | 12 smoke test payload güncellenecek | EVET | R5 §3.7 RG | Publish state machine kontrat testi |
| O-9 | RH: UserAutomation flow canvas (P1+P2) | P1 | pending | @xyflow/react kararı dalga-içi | EVET | R5 §3.8 RH, §8.1 | SVG prototip → karar |
| O-10 | RI: 7 admin shell consolidation | P1 | pending | Admin dağınık | EVET | R5 §3.9 RI | — |
| O-11 | RJ: UserDashboard + BrandProfile + CreateHub | P1 | pending | User dashboard placeholder | EVET | R5 §3.10 RJ | — |
| O-12 | RK: Deprecation + temizlik | P2 | pending | Eski dosyaların silinmesi | EVET | R5 §3.11 RK | — |
| O-13 | D-10 Theme persistence (localStorage → DB) | P2 | deferred → should_finish_before_final | AM'de deferred olmuştu | ISTENIYOR | AM §deferred | User settings tablosu genişlemesi |
| O-14 | D-8 Vite bundle code-split | P2 | deferred | 1.57 MB tek parça; localhost-first için bloke değil | should_finish_before_final | F4 §3.1 | — |
| O-15 | Final sürüm kapanış dokümanı | P2 | pending | R6 bitince | EVET | — | `phase_r6_final_closure.md` |

---

## 11. Final Ürün İçin Zorunlu Kapanış Listesi

### must_finish_before_final (ZORUNLU — bu liste bitmeden "final" denmez)
1. **R6 RA→RK** 11 dalga tamamlanmış, main'e merge edilmiş, F4 baseline yeşil kalmış olmalı.
2. **Per-user scoping + admin override** 3-layer guard ile tüm modüllerde doğrulanmalı (U-1, U-2, K-1).
3. **NAV_REGISTRY** tek truth-source, tüm consumer senkron (O-2, K-3).
4. **Wizard unification** (`ContentCreationWizard` host) çalışıyor (O-4, K-4).
5. **Admin ↔ user aynı shell + scope** — duplicate page'ler silinmiş (O-5..O-11, K-5).
6. **PublishShell** approval flow + state machine hard-enforce (O-8).
7. **Analytics/Library/Calendar/Inbox/Engagement** sadeleştirmesi bitmiş (O-5..O-7).
8. **`phase_r6_final_closure.md`** yayınlanmış, test sonuçları kayıtlı, ledger güncellenmiş (O-15, N14).
9. **Türkçe dokümantasyon** tam (N6).

### should_finish_before_final (güçlü öneri — final'e yakın tamamlanmalı)
10. **D-10 Theme persistence** (localStorage → backend).
11. **D-8 Vite bundle code-split** (1.57 MB → route-level chunks).
12. **D-14 Atrium/Bridge surface kararı** — telemetriyle ya tutulur ya silinir.

### can_ship_after_final (final sonrası eklenebilir)
13. **D-1 OpusClip clip modülü** (P7) — ayrı modül dalgası.
14. **D-2 Queue-first scheduling** (`publish_schedule_slots`).
15. **D-4 Mobil native / PWA**.
16. **D-5 Semantic dedupe**.
17. **D-6 Preview analytics**.
18. **D-7 Platform community post API adapter** (API açılırsa).
19. **D-9 Settings status enum migration**.
20. **D-11 event_hooks direct write wrapping**.
21. **D-13 UserPublishEntryPage scaffold silme** (13 testin hedefi taşındıktan sonra).
22. **D-15 Admin/user panel mental model birleştirmesi** (R6 K-5 bunu zaten çözüyor; gerekirse ek dalga).

---

## 12. Hafıza Disiplini Kuralı

> **Bu dosya projenin yaşayan hafızasıdır.** Her yeni iş başlamadan ÖNCE okunur; her iş bittikten SONRA güncellenir.

### 12.1 Operasyon kuralları
- Yeni bir istek geldiyse → **§3 Kullanıcının Açık İstekleri**'ne satır eklenir (ID, durum, kanıt).
- Yeni bir red / yasak geldiyse → **§4 Açıkça İstenmeyenler**'e satır eklenir.
- Bir iş ertelendiyse → **§5 Ertelenenler**'e satır eklenir (sebep + final_gereklilik + çözüm yönü + bağımlılık).
- Bir iş tamamlandıysa → **§6 Yapıldı Defteri**'ne satır eklenir (commit + rapor + test + doğrulama).
- Yeni bir karar alındıysa → **§7 Karar Defteri**'ne satır eklenir (ID + karar + etki + yasak/zorunlu).
- Eski bir karar geçersizleştiyse → eski satır `superseded` olarak işaretlenir, yeni karar yeni satıra yazılır (eski silinmez).
- Açık iş listesi (§10) güncellenir, tamamlananlar §6'ya taşınır.
- Final kapanış listesi (§11) her faz sonu gözden geçirilir (öğe kalkabilir mi, eklenebilir mi).

### 12.2 Faz kapanış zinciri (her faz için)
```
1. Fazı başlat  → bu dosyayı oku (özellikle §3, §5, §7, §10)
2. Fazı yap     → kod/plan/test
3. Fazı test et → rapor yaz (docs/phase_<id>_closure.md veya audit)
4. Commit at    → worktree branch'e
5. Push et      → origin'e
6. Bu dosyayı güncelle → §3/§4/§5/§6/§7/§10/§11 ilgili satırlar
7. 7 başlıklı teslim raporu ver (Ne yaptım / Dosyalar / Testler / Sonuç / Riskler / Commit / Push)
8. Bir sonraki faza geç (kullanıcının onay beklediği bir karar noktası değilse)
```

### 12.3 "superseded" işaretleme örneği
```
| K-X | Eski karar cümlesi | user | ... | ... | SUPERSEDED by K-Y (2026-MM-DD) |
| K-Y | Yeni karar cümlesi | user | ... | ... | Supersedes K-X |
```

### 12.4 Fail-safe
Eğer bir şey bu dosyaya yazılmadıysa **"yapılmamış gibi"** muamele görür. Bu disiplini zayıflatmak tüm projenin belleğini kaybetmesi demektir.

---

## 13. Değişiklik Geçmişi

| Tarih | Değişiklik | Kim |
|---|---|---|
| 2026-04-17 | Doküman oluşturuldu (R1-R5 + AL + AM + AN + F4 + R0 kaynaklı 15 açık istek, 15 red, 15 ertelenen, 15 kapanış, 12 karar, 15 açık iş derlendi). Kural seti N1-N14 kilitlendi. | Claude (user talimatı) |

---

*Son satır: bu dosya her faz sonu güncellenmeden o faz "kapandı" sayılmaz (N14).*
