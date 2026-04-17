# Faz R2 — Rakip Analizi / Pattern Benchmark

**Tarih:** 2026-04-17
**Worktree:** `.claude/worktrees/product-redesign-benchmark`
**Taban:** R1 bulguları (`docs/phase_r1_repo_reality_audit.md`)
**Amaç:** 9 platformun ürün paternlerini ContentHub'ın gerçek kod-gerçeği ile karşılaştırmak, körü körüne kopya yerine **adapte edilebilir** 15 pattern çıkarmak. R1'deki 3 büyük risk (surface mix / nav drift / wizard çakışması) ve 3 UX karmaşa kaynağı (admin stub'ları / automation flow / analytics dağınıklığı) bu benchmark'la doğrulanır.

---

## 0. Kurallar

- **K1 — Kod gerçeği önce, benchmark sonra.** Her pattern "ContentHub'ın X kodu şu, dolayısıyla Y platformdan şu alınabilir" zinciri ile yazılır.
- **K2 — 4 etiket zorunlu:**
  - 🟢 **Doğrudan uygulanabilir** (mevcut mimariye uyar, küçük adaptör)
  - 🟡 **Mevcut mimariyle uyarlanabilir** (orta seviye iş; mevcut backend + frontend bileşenlerini genişlet)
  - 🟠 **Önce veri modeli gerekir** (yeni tablo / migration / contract önkoşul)
  - 🔴 **Şu an yapılmamalı** (scope dışı, CLAUDE.md ile çelişir, veya önkoşul olmadan risk)
- **K3 — Kör kopya yok.** Visual lib + branding kopyalanmaz; sadece UX / IA / flow paterni adapte edilir.
- **K4 — CLAUDE.md non-negotiable kurallarına saygı.** Hiçbir pattern "hidden prompt", "hidden setting", "parallel pattern", "npm bloat without proof" içeremez.

---

## 1. Platform × Kategori Matrisi (9 × 7)

Kategoriler:
| Kod | Kategori |
|---|---|
| A | Automation / Flow Builder |
| B | Publish / Calendar / Scheduling |
| C | Approval / Review / Draft Queue |
| D | Asset / Media / Clip / Repurpose |
| E | Analytics Dashboard |
| F | Admin ↔ User workspace ayrımı |
| G | Onboarding / Empty-state / Guided mode |

Platformlar: **n8n, Make.com, Zapier, Hootsuite, Buffer, Later, OpusClip, Metricool, Canva Studio**.

### Matris — her hücre 1–2 kelimelik öz

| Platform | A (Flow) | B (Publish) | C (Review) | D (Asset) | E (Analytics) | F (Admin/User) | G (Onboarding) |
|---|---|---|---|---|---|---|---|
| **n8n** | Canvas + nodes | — | Execution log | — | Execution count | Workspace + role | Template gallery |
| **Make.com** | Visual + bubbles | — | Scenario log | — | Operations count | Team + permission | Blueprint gallery |
| **Zapier** | Linear 2-step | — | Task history | — | Task usage | Team workspace | Starter picks |
| **Hootsuite** | — | Calendar grid | Approval layers | Composer + library | Platform breakdown | Org + team gates | Guided composer |
| **Buffer** | — | Queue + schedule | Draft tab | Library | Post analytics | Workspace + roles | Channel-first wizard |
| **Later** | — | Visual planner | Draft grid | Media library (drag) | Insights by post | Team + approval | Plan-first tour |
| **OpusClip** | — | — | Clip review | Clip + reel ranking | Virality score | — | URL-in wizard |
| **Metricool** | Partial auto | Calendar + queue | — | — | Multi-platform | Team access | Connect-platform flow |
| **Canva Studio** | — | — | Brand kit review | Brand kit + assets | — | Pro team | Template-first entry |

Bu matris aşağıdaki 15 pattern'e indirgendi.

---

## 2. 15 Uyarlanabilir Pattern (Öncelikli)

Her pattern şu formatta:
- **Platform(lar):** referans kaynak.
- **Paten:** özet.
- **ContentHub kodu (kanıt):** mevcut durumun kanıtı (file:line).
- **Etiket:** 🟢 / 🟡 / 🟠 / 🔴.
- **Adaptasyon:** ContentHub'a nasıl uyarlanır.
- **Önkoşul / Risk.**

---

### P1 — Visual Automation Canvas (flow-builder)
- **Platform:** n8n, Make.com.
- **Paten:** Node graph + edges; her node bir step (trigger → action → condition → action). Checkpoint matrisi yerine **görsel akış**.
- **ContentHub kodu:** `frontend/src/pages/user/UserAutomationPage.tsx:47-261` — 5-dropdown matris (CHECKPOINT_META 5 key × 3 mod).
- **Etiket:** 🟠 **Önce veri modeli gerekir**.
- **Adaptasyon:** Checkpoint matrisi aynı kalsın, **iki görünüm modu** eklensin: (a) mevcut "matris" (guided), (b) yeni "flow canvas" (advanced). Flow node'ları checkpoint'leri temsil eder; edge'ler koşullara bağlanır. Settings Registry: `automation.view.default = matrix | canvas`.
- **Önkoşul:** Yeni tablo yok; mevcut `automation_policies` tablosu yeter. Ama node pozisyonu için `policy_layout_json` kolonu + migration gerekli. Library: `@xyflow/react` (kanıt: daha önce AL'de tanımlandı; gereklilik kanıtı = 5 checkpoint görsel akışı **daha anlaşılır**).
- **Risk:** npm bloat → gereklilik kanıtı zorunlu (R5'te).

### P2 — Linear Two-Step Zap (Zapier mode)
- **Platform:** Zapier.
- **Paten:** Yeni kullanıcıya "trigger + action" 2-step dar wizard; advanced'e girene kadar flow builder gizli.
- **ContentHub kodu:** `user/UserAutomationPage.tsx` → direkt 5-checkpoint matris; guided ↔ advanced yok.
- **Etiket:** 🟢 **Doğrudan uygulanabilir**.
- **Adaptasyon:** UserAutomationPage'de **Guided Mode**: kullanıcıya sadece 2 karar (kaynak tarama otomasyonu: aç/kapa + günlük maks yayın). Advanced'e geçiş linki `settings.advanced_mode` flag'iyle. Policy başlıkları aynı, sadece görünüm basitleştirilir.
- **Önkoşul:** Yok — Settings Registry'de `advanced_mode` zaten var. Frontend revizyonu.

### P3 — Scenario Execution Log / Timeline
- **Platform:** Make.com, n8n.
- **Paten:** Her çalışma (scenario run) timeline'da — bubble, step süreleri, başarı/başarısız işaret.
- **ContentHub kodu:** `backend/app/jobs/` + `BridgeJobDetailPage.tsx` (407 LoC) — timeline var ama admin-only.
- **Etiket:** 🟡 **Uyarlanabilir**.
- **Adaptasyon:** Job Detail'deki timeline component'i yeniden kullanılarak **UserJobDetailPage**'de aynı timeline görünsün; policy run history de benzer timeline ile.
- **Önkoşul:** `policy_execution_logs` tablosu ilerideki bir dalgada eklenecek ama şu anki job execution log'u kullanarak başlangıç: policy_id = null olan job'lar. Eğer bu yetmezse `automation_run` tablosu gerekir (veri modeli).

### P4 — Content Calendar (görsel planlayıcı)
- **Platform:** Hootsuite, Later, Buffer.
- **Paten:** Aylık + haftalık + günlük grid; sürükle-bırak ile planlama; platform ikonu rengiyle ayrım.
- **ContentHub kodu:** `user/UserCalendarPage.tsx` 827 LoC — veri var ama tek component; `admin/AdminCalendarPage.tsx` **11 LoC stub**.
- **Etiket:** 🟡 **Uyarlanabilir**.
- **Adaptasyon:** UserCalendarPage'i alt componentlere böl (`CalendarGrid + EventBubble + FilterBar`). AdminCalendarPage **aynı component'i `scope:"all_users"` parametresiyle** kullanır. Böylece admin stub kapanır, user'ın zengin sayfası admin'de de çalışır.
- **Önkoşul:** `calendar_events` endpoint `owner_user_id` opsiyonel + admin rolü için `owner_user_id=null` → tüm kullanıcılar.

### P5 — Three-Tier Approval Layer
- **Platform:** Hootsuite (enterprise).
- **Paten:** Submit → Reviewer → Publisher (3 rol); her rol kendi inbox'ını görür.
- **ContentHub kodu:** `backend/app/publish/state_machine.py` + `PublishReviewQueuePage.tsx` — draft → in_review → approved → published mevcut. F3'te hard-enforced.
- **Etiket:** 🟢 **Doğrudan uygulanabilir**.
- **Adaptasyon:** Zaten var. UI tarafında review tab'i UserPublishPage'de `submit-to-review` butonu görünsün. Approve butonu sadece `require_admin`.
- **Önkoşul:** Yok. Sadece UI tabs.

### P6 — Drag-Drop Media Library (Later/OpusClip)
- **Platform:** Later, OpusClip, Canva.
- **Paten:** Sol panel medya kütüphane; sağ panel timeline / compose; medyaya sürükle-bırak.
- **ContentHub kodu:** `admin/AssetLibraryPage.tsx` + `ContentLibraryPage.tsx` — iki ayrı sayfa, drag-drop yok.
- **Etiket:** 🟡 **Uyarlanabilir**.
- **Adaptasyon:** Tek **Library Shell** — iki tab: "Assets" + "Content". Proje detayında asset picker içinde drag zone. ContentHub'ın composition mapping'i Remotion-safe olduğu için sürükle sadece **reference** ekler (gerçek render backend'de).
- **Önkoşul:** Frontend refactor; backend değişmez. Medya contract'i zaten `ensure_owner_or_admin`'e bağlı.

### P7 — URL-in → Auto Clip (OpusClip pattern)
- **Platform:** OpusClip.
- **Paten:** Uzun video URL'i yapıştır, 60 sn clip'lere otomatik böl; her clip için virality score.
- **ContentHub kodu:** `backend/app/modules/news_bulletin/` zaten URL-in + dedupe + auto scan pipeline'a sahip. Ama UI'da "video URL + auto clip" yok.
- **Etiket:** 🟠 **Önce veri modeli + module gerekir**.
- **Adaptasyon:** ContentHub şu an news_bulletin + standard_video + product_review + educational + howto modüllerine sahip. "Clip / Short" modülü R3+R4'te tasarlansın ama **R5/R6 kapsamı dışı** — CLAUDE.md modül ekleme phased delivery order sınırları içinde.
- **Önkoşul:** Yeni modül + render pipeline Remotion uyumlu + dedupe kuralı. R6 öncesi yapılmaz.
- **Not:** Gerçek sebep ertelemesi: Remotion safe-composition-mapping contract'i her yeni modül için ayrı test yükü; R6 scope'unun dışına çıkarır. Bu ertelemeyi R3'te "future module" listesine koyuyoruz.

### P8 — Brand Kit (Canva)
- **Platform:** Canva Studio.
- **Paten:** Marka renk + font + logo tek yerde; her yeni asset brand kit'ten türer.
- **ContentHub kodu:** `backend/app/brand_profiles/` mevcut ama UI'da limited.
- **Etiket:** 🟡 **Uyarlanabilir**.
- **Adaptasyon:** User side'a "Marka Profilim" sayfası — renk + font + logo + slogan. Settings Registry: `brand_profile.default_id`. Template ve Style Blueprint'ler brand kit'ten türeyebilir (variant generation için `preview` pattern'iyle uyumlu).
- **Önkoşul:** Backend hazır; frontend `BrandProfilePage` + asset picker'da "brand kit" sekmesi.

### P9 — Platform Connect Flow (Metricool / Buffer)
- **Platform:** Metricool, Buffer.
- **Paten:** "Platform bağla" butonu → modal → OAuth popup → connected badge.
- **ContentHub kodu:** `user/UserConnectionsPage.tsx` + `admin/AdminConnectionsPage.tsx` + `backend/app/platform_connections/` (F2.1'de leak kapandı, AM rapor §AM-2).
- **Etiket:** 🟢 **Doğrudan uygulanabilir**.
- **Adaptasyon:** Zaten var; sadeleştirme: "Connect your platform" ilk ziyarette **onboarding kartı** olarak dashboard'da görünsün (empty-state).
- **Önkoşul:** Yok — frontend revizyon.

### P10 — Insights by Post (Later/Buffer analytics)
- **Platform:** Later, Buffer.
- **Paten:** Her post card'ında mini-analytics (views, likes, CTR); expand ile full detail.
- **ContentHub kodu:** `user/UserPostsPage.tsx` + analytics 9 sayfa. Her post için aggregate analytics yok.
- **Etiket:** 🟡 **Uyarlanabilir**.
- **Adaptasyon:** PostCard component'e `AnalyticsBadge` eklenir. Analytics 9 sayfasından **tekil** `AnalyticsShell` oluştur; 3 tab: Content / Channel / Operations. Scope param'ı admin/user'a göre veri filtreler.
- **Önkoşul:** Backend `analytics_aggregate` endpoint'inde `per_post` mode. Şu an aggregate var (§Final rapor §Gate 5), ama per-post drill-down yok → yeni endpoint gerekli.

### P11 — Queue-First Scheduling (Buffer)
- **Platform:** Buffer.
- **Paten:** Kullanıcı "time slots" tanımlar; yeni içerik otomatik sıradaki slota düşer. Mikro-karar azaltır.
- **ContentHub kodu:** Şu an publish zamanlama tek tek (schedule_at). Slot tanımlama yok.
- **Etiket:** 🟠 **Önce veri modeli gerekir**.
- **Adaptasyon:** `publish_schedule_slots` tablosu (channel_id, weekday, time) + publish service "next_slot" helper. Kullanıcı panelinde "Günlük zamanlama preset" ekranı.
- **Risk:** Aşırı karmaşıklık için acele etmeyelim; R6 içinde yapılacaksa **minimal MVP**: tek kanal için haftalık 7 slot, gerisi advanced.

### P12 — Empty-state Guided (Zapier "starter picks")
- **Platform:** Zapier, Canva.
- **Paten:** Boş ekranlarda "önerilen başlangıç kartları" — şablon, örnek, hızlı tur.
- **ContentHub kodu:** `UserDashboardPage` + `AdminOverviewPage` mevcut; empty-state pattern sistematik değil.
- **Etiket:** 🟢 **Doğrudan uygulanabilir**.
- **Adaptasyon:** `EmptyState<Icon, Title, Suggestions[]>` component (frontend shared). UserDashboard'da "ilk kanalını bağla / ilk projeni oluştur / ilk otomasyonu kur" kartları. AdminOverview'da "ilk kullanıcı / ilk şablon / ilk kaynak" kartları.
- **Önkoşul:** Yok.

### P13 — Workspace Switcher (n8n/Zapier/Make teams)
- **Platform:** n8n, Zapier, Make.
- **Paten:** Üst sol köşede workspace/team switcher; admin ↔ user bağlamı hızla değiştirilir.
- **ContentHub kodu:** Şu an admin ↔ user geçiş `/admin` vs `/user` URL'i; role değişimi yok (admin → user view şey yok).
- **Etiket:** 🔴 **Şu an yapılmamalı**.
- **Sebep (honest):** CLAUDE.md "multi-tenant architecture early eklemeyin" kuralı var; workspace switch multi-tenant'a zemin hazırlar. Şu an tek kullanıcı çoklu kanal yeter. **Erteleme sebebi: mimari risk — local-first ilkesine aykırı**.

### P14 — Three-View Dashboard (Hootsuite)
- **Platform:** Hootsuite.
- **Paten:** Dashboard 3 view: (a) Today (what to do today), (b) This Week (calendar), (c) Analytics (quick glance).
- **ContentHub kodu:** `UserDashboardPage` düz liste. `AdminOverviewPage` kpi grid.
- **Etiket:** 🟢 **Doğrudan uygulanabilir**.
- **Adaptasyon:** UserDashboardPage üç dikey blok: (a) **Bugün** — pending jobs + review queue + inbox unread, (b) **Hafta** — CalendarGrid slice (7 gün), (c) **Analiz** — AnalyticsBadge × 4 KPI.
- **Önkoşul:** Yok — veriler hep var.

### P15 — Command Palette + Quick Action (Zapier Cmd+K / Hootsuite quick compose)
- **Platform:** Zapier, Make, Notion.
- **Paten:** Cmd+K global arama: sayfa git, aksiyon yap, yeni içerik başlat.
- **ContentHub kodu:** Command Palette zaten CLAUDE.md'de ilk sürüm önceliği (§Product Priorities). Router'da `NotificationPopover` + Cmd+K stubs var ama derinliği sığ.
- **Etiket:** 🟡 **Uyarlanabilir**.
- **Adaptasyon:** Cmd+K'ye **eylem registry** bağla: "yeni bülten", "publish review", "automation editor", "calendar git". Settings Registry: `command_palette.actions` listesi.
- **Önkoşul:** `CommandAction` contract + visibility filter (admin/user aksiyonları ayrışmalı).

---

## 3. ContentHub Hedeflerine Göre Harita

R1'in 3 yapısal riski + 3 UX karmaşa kaynağı → 15 pattern'den hangileri ilaç?

| Risk / Karmaşa | Hangi pattern'ler çözer |
|---|---|
| **R1-R1** Surface 5'li mix | P14 (Three-View Dashboard) + P6 (Single Library Shell) — her ikisi de **tek canvas shell** mantığını zorlar → Canvas surface default kalır, diğerleri konsolide edilebilir |
| **R1-R2** Navigation truth drift | P15 (Cmd+K eylem registry) + Settings Registry'deki `NAV_REGISTRY` → tek kaynak |
| **R1-R3** Wizard çakışması | P2 (Linear 2-step Guided) + P12 (Empty-state) → Guided mode 2-step, advanced mode gelişmiş, **aynı base** |
| **UX-1** Admin stub'ları | P4 (Calendar tek shell) + P5 (Approval tek queue) — adminse `scope=all_users` |
| **UX-2** Automation 5-dropdown | P1 (Canvas flow) + P2 (Guided 2-step) — iki görünüm modu |
| **UX-3** Analytics 9 sayfa | P10 (AnalyticsShell) — 3 tab + scope |

---

## 4. Etiket Dağılımı (Özet Kararlar)

- 🟢 **Doğrudan uygulanabilir (5):** P2, P5, P9, P12, P14.
- 🟡 **Mevcut mimariyle uyarlanabilir (6):** P3, P4, P6, P8, P10, P15.
- 🟠 **Önce veri modeli gerekir (3):** P1, P7, P11.
- 🔴 **Şu an yapılmamalı (1):** P13.

**R6 (gerçek kod) için başlangıç aday havuzu = 🟢 + seçili 🟡 (toplam ≤8 pattern).**

---

## 5. Kör Kopya Değil — Adaptasyon Kuralları

Her pattern için şu korundu:
1. **Settings Registry otoritesi.** Hiçbir pattern hardcoded davranış eklemez.
2. **Ownership fail-closed.** Pattern UI değişikliği önerse bile backend guard'ı aynı kalır.
3. **Theme system + design-tokens.** Hiçbir pattern kendi CSS-in-JS color'ını getirmez; tokens üstünden akar.
4. **Remotion safe composition mapping.** Pattern render çıktısını etkilemez; preview artifacts ayrışık kalır.
5. **React Query vs Zustand ayrımı.** Pattern Zustand'ı server truth için kullanmaz.
6. **No parallel pattern.** Mevcut component varsa önce onu genişlet.

---

## 6. Aday Pattern'lerin R3 IA'ya Girdisi

R3'te kullanılacak 8 aday:
1. **P14 — Three-View Dashboard** (Home, Week, Stats) → `UserDashboardPage` yeniden iskelet.
2. **P4 — Calendar tek shell** → `UserCalendarPage` + `AdminCalendarPage` unified.
3. **P6 — Library tek shell** → `Assets + Content` tab'lı single page.
4. **P10 — AnalyticsShell** → 9 sayfa → 1 shell × 3 tab × scope.
5. **P2 — Guided/Advanced Automation** → UserAutomationPage iki mode (matris + flow canvas).
6. **P9 — Platform Connect** → Empty-state improvement.
7. **P5 — Approval Queue** → UserPublishPage'de review tab.
8. **P15 — Cmd+K registry** → navigation truth source'u bu komutla besle.

---

## 7. Kontrat Satırları

```
code change:         no
migrations run:      no
packages installed:  no
db schema mutation:  no
db data mutation:    no
main branch touched: no
```

---

## 8. Sonraki Adım

R3 — Bilgi Mimarisi / Sayfa Birleştirme / Navigation Truth Source Planı.
Girdi: R1 (gerçek kod) + R2 (8 aday pattern).
Çıktı: `docs/phase_r3_information_architecture.md`.

---
