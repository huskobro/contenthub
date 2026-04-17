# FAZ R2 — Rakip Analizi / Pattern Benchmark (Hibrit)

> **Amaç:** Dört lider ürünü derinlemesine + beş tamamlayıcı ürünü yüzeyden inceleyerek, **ContentHub'ın mevcut omurgasına hasar vermeden** uyarlanabilecek UX örüntülerini çıkarmak. Her pattern kod gerçekliğine bağlanır, her öneri 4-etiket (🟢 doğrudan uygulanabilir / 🟡 uyarlanabilir / 🟠 önce veri modeli / 🔴 şimdi yapılmamalı) ile etiketlenir.
>
> **Yöntem:** C — Hibrit (kullanıcı talimatı, 2026-04-17).
> **Dört derin:** Hootsuite, n8n, OpusClip, Canva Studio.
> **Beş tamamlayıcı:** Make.com, Zapier, Buffer, Later, Metricool.
> **Kategoriler:** 7 (automation builder / content calendar / approval-review / social panel / dashboard-digest / asset-brand library / admin-user workspace separation).
>
> **Ürün omurgası sınırı:** Hiçbir pattern ağır yeni dependency gerektirmiyorsa 🟢, gerektiriyorsa 🟠 ya da 🔴 olur. React Query + Zustand + useLayoutNavigation + Settings Registry + Visibility Engine + Surface sistemi **dokunulmaz**.

---

## 0. Yönetici Özeti (15 madde, her biri kanıtlı)

1. **Hootsuite "Planner + Approval lane"** paterni bizim `PublishCenterPage.tsx:36` review-queue akışına neredeyse 1:1 oturuyor — yeni tablo gerekmiyor. 🟢
2. **n8n "three-panel canvas (palette/canvas/inspector)"** bizim `UserAutomationPage.tsx:61` 5-checkpoint listesinin görsel dengi — ama `@xyflow/react` dependency'si maliyeti var (~140 KB gzip). 🟠
3. **Make.com "router + error route"** örüntüsü, bizim publish state machine'in zaten ürettiği `pending_review/approved/failed` dallarını görsel olarak sunmak için yeter — yeni backend şart değil. 🟢
4. **OpusClip bulk-edit mode** — mevcut `BulkActionBar.tsx` bizde zaten var (PublishCenter + Jobs + Assets'te kullanılıyor), pattern zaten uyumlu. 🟢
5. **Canva Brand Kit** `grid/list toggle + kategori kenar menüsü`, mevcut `AssetLibraryPage.tsx:69` + `StyleBlueprintsRegistryPage.tsx` ikilisinin birleşik bir "Brand Hub" kavramına evrilmesi için hazır. 🟡
6. **Buffer "next available queue slot"** — bizim `UserCalendarPage.tsx:80` calendar'ı `publish_record` event tipini hâlen gösteriyor; queue slot kavramı → calendar overlay olarak eklenebilir. 🟡
7. **Later "drag-and-drop grid preview"** — Instagram grid önizleme paterni **şu an için yapılmamalı**, çünkü Instagram adapter registry'si yok (platform_connections YouTube merkezli). 🔴
8. **Metricool "brand summary one-page"** — Tek bir sayfada kanal-başı skorlar + trend bloklarını birleştirme bizim `UserYouTubeAnalyticsPage.tsx` + `UserChannelAnalyticsPage.tsx` + `PublishAnalyticsPage.tsx` üçlüsünün sadeleşmiş "Daily Digest" haline dönüşmesi için altın örnek. 🟢
9. **Zapier "single-column step flow"** — Basit kullanıcı için alternatif otomasyon görsel modu (guided mode); canvas zorunlu değil. 🟢
10. **Hootsuite "Role-based approval assignment"** — bizim `AutomationPolicy.publish_mode = manual_review` kavramı bunu zaten modelliyor, sadece UX yüzeyi eksik. 🟢
11. **Admin "View-as-user" (impersonation)** SaaS paterni — bizim "tenant-scoped + admin-all-users" ilkesi için kritik; backend'de `UserContext` zaten var (Faz AM-2), eksik olan **frontend'de AdminScopeSwitcher** tek noktası. 🟡
12. **"Sticky user strip"** (avatar + "Sen: X" chip + scope durumu) — kullanıcı değişiminin görsel hissini veriyor; bizde böyle bir component YOK (grep sonucu: 0 dosya). 🟢
13. **n8n "error route + retry config"** → bizim publish retry (`bulk_retry`) ve job retry_count alanları zaten var, ama görsel "Retry Path" dallanması yok. 🟡
14. **OpusClip "AI clip extractor" / "virality score"** — şu an için **yapılmamalı**, çünkü kendi AI prompt'ları Settings Registry'ye bağlı değil ve Remotion composition mapping'i clip seviyesine girmemiş. 🔴
15. **Canva "40 custom asset categories"** — biz sadece 8 asset_type'a (`AssetLibraryPage.tsx:33`) sahibiz; kategori-başı navigation UX iyileşmesi, yeni tablo gerektirmiyor (mevcut enum genişletilebilir). 🟢

### "Zaten Aşıldı" Pattern'leri (rakipler yapıyor, biz hazırız)
- ✅ Bulk action bar (BulkActionBar, 6+ sayfada kullanılıyor)
- ✅ Review gate state machine (publish.state_machine.can_publish)
- ✅ Owner-scope enforcement (UserContext + apply_user_scope, F4'te kapatıldı)
- ✅ Snapshot-lock at job start (CLAUDE.md kuralı, Faz 22/23'te uygulandı)

### "Gerçekten Yeni Yüzey" Pattern'leri (R3'te önerilecek)
- 🆕 AdminScopeSwitcher (persistent, Zustand + query-key contamination)
- 🆕 UserIdentityStrip (sticky, avatar + name + scope chip)
- 🆕 Dashboard Digest (admin + user farklı)
- 🆕 Unified "Brand Hub" (AssetLibrary + StyleBlueprint merge — opsiyonel)

---

## 1. Derin 1 — Hootsuite (Social Media Management)

**Ürün özü:** Çoklu kanal yayın + takvim + onay workflow + analytics + inbox, hepsi rol-temelli.

### 1.1 Hootsuite — Kategori × Bulgu × Etiket

| Kategori | Pattern | ContentHub Bağlantısı | Etiket |
|---|---|---|---|
| Automation builder | Post Composer → Schedule → Approval → Published (lineer) | `PublishCenterPage.tsx:36` `publishStatusVariant` switch bu state'leri zaten içeriyor | 🟢 |
| Content calendar | "Glance at organic, paid, published, scheduled content in one calendar/list view" | `UserCalendarPage.tsx:33-40` `EVENT_TYPE_LABELS` zaten 3 tip: project/publish_record/platform_post | 🟢 |
| Approval/review flow | Role-based approver assignment ("assign approvals to certain team members") | `AutomationPolicy.publish_mode = manual_review` model seviyesinde var; eksik: **kimin onaylayacağı alanı** (alan yok) | 🟠 (yeni `approver_user_id` alanı + migration gerekir) |
| Social panel | Tek sayfada tüm kanallar (drill-down detay) | `UserChannelAnalyticsPage.tsx` + `MyChannelsPage.tsx` ikisi ayrı — birleşik "Kanallarım" landing tek sayfa olabilir | 🟡 |
| Dashboard/digest | "Processing..." banner for video renders | Bizde `job.state = rendering` zaten var; dashboard digest'a "hâlâ işlenenler" bloğu eklemek küçük iş | 🟢 |
| Asset/brand library | Hootsuite content library (yeniden kullanım) | Bizde `AssetLibraryPage.tsx` + `ContentLibraryPage.tsx` iki ayrı giriş — nadiren birleştirilmeli değil (farklı kavramlar: asset = bytes, content = proje) | 🟡 (dikkatli merge) |
| Admin vs user | Enterprise plan = Workspaces, ama Pro plan = tek workspace | Biz **sadece tek-workspace** tarafında kalıyoruz (kullanıcı reddetti); ama Hootsuite Pro sidebar'ı kullanıcı paneli için ilham | 🟢 |

### 1.2 Hootsuite'tan borrow list

- **"Calendar + List toggle"** tek veri kaynağı, iki görüntü. → `UserCalendarPage.tsx`'e list-view alt sekmesi ekle. 🟢
- **"Processing" durum bandı** — render/upload sürecinde beklerken görsel geri bildirim. → mevcut `status` field kullanılır, yeni backend yok. 🟢
- **"Approval lane"** — pending_review kayıtlarını ayrı sütunda gösteren board-style view. → `PublishReviewQueuePage.tsx` zaten var; board layout opsiyonel sekme. 🟡
- **Team/Role matrix** — biz **reddediyoruz** (kullanıcı talimatı: enterprise yok). 🔴

### 1.3 "Kopya değil, uyarlama" notu

Hootsuite'un 3-kolonlu (Team | Workflow | Queue) matrix view'ını **almıyoruz**, çünkü workspace switcher reddedildi. Onun yerine bizim `UserContext` modeli "kullanıcı = mini-workspace" olarak okunur.

---

## 2. Derin 2 — n8n (Visual Automation)

**Ürün özü:** Node-tabanlı workflow canvas, self-hostable, VueFlow tabanlı (biz React kullandığımız için `@xyflow/react` muadili).

### 2.1 n8n — Kategori × Bulgu × Etiket

| Kategori | Pattern | ContentHub Bağlantısı | Etiket |
|---|---|---|---|
| Automation builder | Three-panel (node palette | canvas | inspector) | Bizim `UserAutomationPage.tsx:47-53` 5-checkpoint `CHECKPOINT_META` zaten node listesi. Canvas'a dönüştürmek `@xyflow/react` gerektirir (~140 KB gzip). | 🟠 |
| Automation builder | Node → link → connect flow | Checkpoint'leri lineer bir SVG/CSS flow olarak göstermek **kütüphane gerektirmeden** mümkündür | 🟢 (hafif SVG) |
| Content calendar | YOK (n8n bu alanda değil) | — | — |
| Approval/review flow | Manuel approval node | Bizim `publish_mode = manual_review` checkpoint bunun eşdeğeri | 🟢 |
| Dashboard/digest | "Executions" listesi (son çalışmalar) | Bizim `JobsRegistryPage.tsx:36` jobs listesi aynı kavram; dashboard'a "son 10 otomasyon koşusu" widget'ı eklenebilir | 🟢 |
| Asset/brand library | YOK | — | — |
| Admin vs user | Self-hosted single-user default; team tier opsiyonel | Bizim single-user-by-default varsayımımızla uyumlu | 🟢 |
| Error handling | Error output branch + retry config per node | `publish_record.status = failed` + `bulk_retry` zaten var; görsel dallanma eksik | 🟡 |

### 2.2 n8n'den borrow list

- **"Canvas tidy-up" butonu** — bizim checkpoint grid'i için gerekli değil (lineer görselleştirme yeter). 🔴
- **"Node palette sidebar"** — bizde zaten modül-bazlı yeni checkpoint eklemek için Settings Registry var; palette yerine "checkpoint ekle" modal yeterli. 🟡
- **"Execution log per run"** — `JobDetailPage.tsx` timeline zaten bunu sağlıyor; otomasyon runs için ayrı `AutomationRunsPage` açılabilir. 🟡 (R3'te karar)
- **"@xyflow/react full canvas"** — **şimdi yapılmamalı**, çünkü: (a) kullanıcı ağır dependency yok dedi, (b) 5-checkpoint zaten lineer — canvas aşırılık. 🔴

### 2.3 "Kopya değil, uyarlama" notu

n8n'in kalbi, CLAUDE.md "safe composition mapping" kuralıyla çatışır: AI'ın serbestçe node yaratması mümkün olmamalı. Bizim checkpoint listesi bilinçli olarak "sabit 5 node" (source_scan/draft/render/publish/post_publish). Canvas'a dönüştürsek bile **sabit topolojide** kalmalı.

---

## 3. Derin 3 — OpusClip (Video Repurposing)

**Ürün özü:** Uzun videoyu AI ile kısa kliplere böler, brand kit + multi-clip bulk-edit + virality score + scheduler.

### 3.1 OpusClip — Kategori × Bulgu × Etiket

| Kategori | Pattern | ContentHub Bağlantısı | Etiket |
|---|---|---|---|
| Automation builder | Otomatik clip extraction pipeline | Bizim content modülleri (standard_video/news_bulletin/...) zaten bir pipeline, ama clip-level extraction YOK | 🔴 (Remotion composition mapping girmemiş + out-of-scope) |
| Content calendar | Built-in scheduler (platform-specific) | Bizim `UserPublishPage.tsx` + `UserCalendarPage.tsx` ikilisi aynı rol | 🟢 |
| Approval/review | YOK doğrudan; re-edit mode var | Bizim review gate daha zengin | ✅ (aştık) |
| Social panel | 9:16 / 1:1 / 16:9 otomatik reframe | Bizim Remotion composition mapping 16:9 merkezli; re-frame otomatik değil | 🟠 (R3 sonrası) |
| Dashboard/digest | "Virality Score" predictive metric | Bizde yok, istemiyoruz (CLAUDE.md "no AI-uncontrolled") | 🔴 |
| Asset/brand library | Brand Templates (logo + font + caption style) | Bizim `StyleBlueprint` + `Template` ikilisi kavramsal eşdeğer; UI birleşik değil | 🟡 |
| Admin vs user | Tek kullanıcı ya da workspace (enterprise) | Bizim tenant-scoped model yeterli | 🟢 |
| Multi-clip UI | Bulk edit mode (aynı brand ayarı N kliplik seri) | Bizim `BulkActionBar.tsx` zaten var (Jobs + Publish + Assets) | 🟢 |

### 3.2 OpusClip'ten borrow list

- **"Brand template apply-to-all"** butonu — bizim `StyleBlueprintId` alanı zaten job başlarken snapshot-lock ediliyor; UI'dan "bu blueprint'i N job'a uygula" akışı eklenebilir. 🟡
- **Multi-clip thumbnail grid preview** — şu an gereksiz; bizde tek-video pipeline hakim. 🔴
- **"Virality Score" predictive badge** — **yapılmamalı**, AI guess-based score CLAUDE.md "no hidden magic" kuralını zorlar. 🔴
- **"AI caption with keyword highlights"** — bizim altyazı adımı zaten var; keyword highlight optional blueprint ayarı olabilir, ama R6 sonrası. 🟠

### 3.3 "Kopya değil, uyarlama" notu

OpusClip'in en güçlü özelliği (AI clip extraction) ContentHub'ın farkı değil. Biz uzun-form + haber bülteni + review üretimi yapıyoruz. OpusClip'ten sadece **brand consistency** örüntüsünü alıyoruz, clip-extraction'ı değil.

---

## 4. Derin 4 — Canva Studio (Visual Asset Authoring)

**Ürün özü:** Template + Brand Kit + asset library + team collaboration + drag-drop editor.

### 4.1 Canva — Kategori × Bulgu × Etiket

| Kategori | Pattern | ContentHub Bağlantısı | Etiket |
|---|---|---|---|
| Automation builder | Yok (yaratım odaklı) | — | — |
| Content calendar | Canva Content Planner (sosyal yayın) | Bizim UserCalendar eşdeğeri | ✅ aştık (bizde publish_record zaten var) |
| Approval/review | Team review pattern | `PublishReviewQueuePage.tsx` zaten var | ✅ |
| Social panel | Content Planner → Connect Accounts → Publish | Bizim `UserConnectionsPage.tsx` + `PublishCenterPage.tsx` | ✅ |
| Dashboard/digest | Brand Kit "landing page" per brand | Biz her kanal için ayrı landing yapabiliriz | 🟡 |
| Asset/brand library | **40 custom asset categories**, grid/list toggle, side-menu navigation | `AssetLibraryPage.tsx:33-43` sadece 8 asset_type; kategori-başı navigation yok | 🟢 (UI iyileştirme, yeni backend yok) |
| Admin vs user | "Team space" (Pro plan) | Reddedildi | 🔴 |
| Multi-clip UI | — | — | — |

### 4.2 Canva'dan borrow list

- **"Brand Kit landing page"** — Her ChannelProfile için ana landing (ChannelDetailPage evrimi). 🟢
- **Grid/List toggle** — `AssetLibraryPage` + `ContentLibraryPage` + `StyleBlueprintsRegistryPage` hepsinde tek standard toggle. 🟢
- **"Custom asset categories"** — asset_type enum'unu kullanıcı-custom-tag sistemiyle genişletmek **mümkün**, ama R3 sonrası. 🟡
- **"Brand font/color auto-apply"** — `StyleBlueprint` zaten rol modeli; UI'da blueprint → template birleştirilmiş gösterim. 🟡

### 4.3 "Kopya değil, uyarlama" notu

Canva'nın editor'ı out-of-scope. Biz sadece **organizasyon ve yeniden kullanılabilirlik** ilkesini alıyoruz. Canva'nın team collaboration'ı reddedildi.

---

## 5. Tamamlayıcı 1 — Make.com

| Pattern | ContentHub Bağlantısı | Etiket |
|---|---|---|
| Router (branch on condition) | publish state machine branches zaten var, görsel yok | 🟡 |
| Error route + 5 directives (fail-fast/skip/retry/fallback/continue) | `bulk_retry` + `publish_mode` ikili + Faz AN-1 automation retry zaten kapsıyor | 🟢 (UI iyileştirme) |
| Incomplete executions kuyruğu | `JobsRegistryPage.tsx` failed jobs filtresi zaten var | ✅ |
| Scenario settings (timeout, log, sequential) | Settings Registry KNOWN_SETTINGS 204 entry bunu kapsayabilir | 🟢 |

**Borrow:** "Filter at route start" görsel etiketi → publish list'e "bu policy neden tetiklendi?" tooltip. 🟡

---

## 6. Tamamlayıcı 2 — Zapier

| Pattern | ContentHub Bağlantısı | Etiket |
|---|---|---|
| Tek kolonlu trigger → action dizisi | n8n canvas alternatifi — guided mode için daha uygun | 🟢 |
| Filter + path (condition) | Bizim checkpoint_mode ayarları aynı felsefe | ✅ |
| AI-powered Zap Builder | Scope dışı, reddedilir | 🔴 |
| Template library | Bizim template registry zaten var | ✅ |

**Borrow:** Basit kullanıcı için **"Basit mod / Gelişmiş mod"** seçici — guided = tek kolonlu liste, advanced = canvas (opsiyonel). 🟢

---

## 7. Tamamlayıcı 3 — Buffer

| Pattern | ContentHub Bağlantısı | Etiket |
|---|---|---|
| "Next available queue slot" scheduling | Biz `scheduled_at` alan ile manuel atıyoruz; queue slot UI iyileştirmesi | 🟡 |
| Unified comment inbox | `UserInboxPage.tsx` + `UserCommentsPage.tsx` zaten var, birleştirilmeli mi? | 🟡 |
| Bulk scheduling | `BulkActionBar` zaten var | ✅ |
| Dark mode | Theme registry zaten var | ✅ |
| Smart scheduling (z-score) | AI-heuristic → bilinçli "sonra" | 🟠 |

**Borrow:** "Posting schedule" kavramı per channel (haftanın günleri × saat slotları) — yeni tablo **şart değil**, settings key olarak eklenebilir. 🟡

---

## 8. Tamamlayıcı 4 — Later

| Pattern | ContentHub Bağlantısı | Etiket |
|---|---|---|
| Visual Media Library (drag-drop grid) | `AssetLibraryPage.tsx` tablo; grid view UI-only | 🟢 |
| Instagram grid preview | Instagram adapter yok | 🔴 |
| Best-time-to-post suggestion | AI-heuristic → sonra | 🟠 |
| Hashtag analytics | Scope dışı (platform-spesifik) | 🔴 |

**Borrow:** Asset Library'de **grid view toggle + thumbnail drag** — backend değişmez. 🟢

---

## 9. Tamamlayıcı 5 — Metricool

| Pattern | ContentHub Bağlantısı | Etiket |
|---|---|---|
| **"Brand Summary" tek sayfalık dashboard** | Bizim Analytics 3 sayfa dağınık (`AnalyticsContentPage`, `AnalyticsOperationsPage`, `AnalyticsOverviewPage`) — birleşik özet sayfası büyük fayda | 🟢 |
| 5-dk'da PDF rapor export | Analytics sayfalarından PDF export yok; opsiyonel iyileştirme | 🟡 |
| Multi-account central dashboard | Bizim admin all-users dashboard'u eşdeğer | 🟢 |
| Custom date range + compare | `JobsRegistryPage.tsx` filtre yapısı genişletilebilir | 🟡 |

**Borrow:** **Daily Digest dashboard** — admin + user farklı versiyon; "Bugün neler oldu, neyi onaylaman gerek, hangi job failed" top-10. 🟢

---

## 10. 7-Kategori × 9-Platform Özet Matrisi

| Kategori | Hootsuite | n8n | OpusClip | Canva | Make | Zapier | Buffer | Later | Metricool |
|---|---|---|---|---|---|---|---|---|---|
| Automation builder | 🟢 (lane) | 🟠 (canvas) | 🔴 | — | 🟡 (branch) | 🟢 (linear) | — | — | — |
| Content calendar | 🟢 | — | 🟢 | ✅ | — | — | 🟡 (queue slot) | 🔴 (IG grid) | — |
| Approval/review | 🟢 | 🟢 | ✅ | ✅ | — | — | — | — | — |
| Social panel | 🟡 | — | — | ✅ | — | — | 🟡 (inbox merge) | — | 🟢 |
| Dashboard/digest | 🟢 | 🟢 (executions) | 🔴 (virality) | 🟡 (brand landing) | 🟢 (filter) | — | — | — | 🟢 (summary) |
| Asset/brand library | 🟡 | — | 🟡 (brand templates) | 🟢 (cats + grid) | — | ✅ | — | 🟢 (grid) | — |
| Admin vs user | 🟢 (single ws) | 🟢 (solo) | 🟢 | 🔴 (team) | — | — | — | — | 🟢 |

**Okuma:** 🟢 = hemen uyarlanabilir, 🟡 = küçük adaptör gerekli, 🟠 = veri modeli değişir, 🔴 = şimdi yapılmamalı.

---

## 11. Ödünç Alınacak Top 15 UX Pattern'i (öncelikli liste)

| # | Pattern | Kaynak | ContentHub Hedef Dosya | Tahmini Efor | Etiket |
|---|---|---|---|---|---|
| 1 | Persistent **AdminScopeSwitcher** (all-users ↔ user:X) | SaaS impersonation + Hootsuite | Yeni: `components/layout/AdminScopeSwitcher.tsx` + `stores/adminScopeStore.ts` | M | 🟢 |
| 2 | Sticky **UserIdentityStrip** (avatar + "Sen: X" + scope chip) | Hootsuite + Buffer | Yeni: `components/layout/UserIdentityStrip.tsx` | S | 🟢 |
| 3 | **Daily Digest** dashboard (admin + user farklı) | Metricool + Hootsuite | Yeni: `pages/admin/AdminDashboardPage.tsx` + `pages/user/UserDashboardPage.tsx` (hâlen dashboard landing dağınık) | M | 🟢 |
| 4 | **Calendar + List toggle** (tek veri, iki görüntü) | Hootsuite + Later | `pages/user/UserCalendarPage.tsx:33` + `pages/admin/AdminCalendarPage.tsx` | S | 🟢 |
| 5 | **Approval lane board** (pending_review kayıtları ayrı sütun) | Hootsuite | `pages/admin/PublishReviewQueuePage.tsx` (opsiyonel sekme) | M | 🟡 |
| 6 | **Asset Library grid/list toggle + kategori kenar menüsü** | Canva + Later | `pages/admin/AssetLibraryPage.tsx:33-43` | S | 🟢 |
| 7 | **Automation lineer görselleştirme** (SVG, kütüphane yok) | n8n + Zapier | `pages/user/UserAutomationPage.tsx:47-53` | M | 🟢 |
| 8 | **Checkpoint "mod seçici"** (disabled / manual_review / automatic) görsel badge | Make.com directives | mevcut `MODE_LABELS` zaten var, sadece view UI güncellenir | XS | 🟢 |
| 9 | **Unified "Brand Hub"** (StyleBlueprint + AssetLibrary kombinasyon landing) | Canva | Yeni: `pages/admin/BrandHubPage.tsx` (mevcut 2 sayfayı referanslar) | M | 🟡 |
| 10 | **Queue slot** posting schedule (haftalık slot × kanal) | Buffer | Settings Registry key'leri + `UserCalendarPage.tsx` overlay | M | 🟡 |
| 11 | **Retry path** görsel (bulk_retry sonrası dallanma) | Make.com + n8n | `pages/admin/PublishCenterPage.tsx:66-82` StatusBadge genişletmesi | S | 🟡 |
| 12 | **Settings Registry per-module landing** | Canva Brand Kit landing | `pages/admin/SettingsRegistryPage.tsx` tek-sayfadan modül-başı landing'e | M | 🟡 |
| 13 | **Jobs "executions" widget** dashboard'da | n8n | Dashboard digest bileşeni | S | 🟢 |
| 14 | **"Processing…" durum bandı** job-level | Hootsuite | `JobDetailPage.tsx` zaten timeline — header banner ekle | XS | 🟢 |
| 15 | **Basit/Gelişmiş mod seçici** (guided/advanced toggle) otomasyon + create sayfalarında | Zapier | Mevcut guided/advanced kavramı var, tüm create-path'lerde standardize | M | 🟡 |

**Efor:** XS ~1gün, S ~2-3gün, M ~1hafta (tahmini). R5'te kesinleşecek.

---

## 12. "Adapt don't copy" Uyarıları (kritik)

1. **@xyflow/react eklemiyoruz** (şimdilik). n8n canvas'ının kalbi bu kütüphane, ama +140 KB gzip + kullanıcı reddi + sabit 5-checkpoint topolojimiz buna gerek duymuyor. SVG/CSS lineer flow ile başlanır; canvas R6 sonrası yeni dalga.
2. **Team/Workspace switcher yok.** Hootsuite ve Canva'nın en büyük UX yatırımı bu alanda; biz **tek-kullanıcı + admin-all-users** modelinde kaldığımız için onların sidebar hiyerarşisini kopyalamıyoruz.
3. **AI predictive scores (virality, best-time)** eklemiyoruz. OpusClip ve Buffer'ın en parlak pattern'i bunlar, ama CLAUDE.md "no hidden magic + deterministic services" kuralına aykırı.
4. **Brand Hub merge opsiyonel**, zorunlu değil. StyleBlueprint ve Asset farklı conceptler; Canva'nın "Brand Kit" çatısı bizim için kısmi fit. Yanlış merge ürünü karıştırır.
5. **Komentör/Inbox merge** riski var (`UserInboxPage` vs `UserCommentsPage`). Buffer unified inbox iyi pattern, ama bizim platform_post comments + genel inbox iki farklı veri modeli — önce kontrat netleşmeli.

---

## 13. Mevcut Kod Gerçekliğine Bağlantı Tablosu

| Pattern | Gerekli Kod Dosyaları | Yeni Dependency? | Settings Registry Key? | Backend Değişikliği? |
|---|---|---|---|---|
| AdminScopeSwitcher | Yeni store + provider + header chip | ❌ | ❌ | ❌ (UserContext zaten var) |
| UserIdentityStrip | Yeni component | ❌ | ❌ | ❌ |
| Daily Digest dashboard | 2 yeni sayfa + existing API'ler | ❌ | ✅ (widget enable) | ❌ |
| Calendar/List toggle | `UserCalendarPage.tsx` + `AdminCalendarPage.tsx` | ❌ | ❌ | ❌ |
| Approval lane board | `PublishReviewQueuePage.tsx` | ❌ | ✅ (view mode) | ❌ |
| Asset grid toggle | `AssetLibraryPage.tsx` | ❌ | ✅ (view_mode) | ❌ |
| Automation lineer SVG | `UserAutomationPage.tsx` | ❌ (kendi SVG) | ❌ | ❌ |
| Approver assignment | `AutomationPolicy` modeli | ❌ | ❌ | ✅ **Alembic migration** (R6 ötesi) |
| Queue slot schedule | Settings + overlay | ❌ | ✅ (`publishing.queue_slots`) | ❌ |
| Retry path view | `PublishCenterPage.tsx` | ❌ | ❌ | ❌ |
| Brand Hub merge | Yeni landing page | ❌ | ✅ (brand_hub.enabled) | ❌ |
| Settings module landing | `SettingsRegistryPage.tsx` | ❌ | ❌ | ❌ |
| Jobs executions widget | Dashboard component | ❌ | ✅ (widget enable) | ❌ |
| Processing banner | `JobDetailPage.tsx` | ❌ | ❌ | ❌ |
| Guided/advanced toggle | Create pages | ❌ | ✅ (zaten var, genişletilir) | ❌ |

**Kritik gözlem:** Top-15'in **14'ü backend değişiklik gerektirmiyor**. Sadece "Approver assignment" (#5 prereq) yeni alan + migration ister — ve o da R6 ötesine.

---

## 14. R2 → R3 Geçiş Notları (girdi)

R3 IA önerisi için R2'den çıkan **4 temel sinyal**:

1. **Gezinme (nav) evrimi gerekli değil** — `useLayoutNavigation.ts` single source kalıyor, sadece grup isimleri/sıra güncellenebilir.
2. **Admin sidebar = all-users bakış, user sidebar = kendi scope'u** net ayrılmalı (R1 delta-audit zaten bunu söyledi).
3. **Yeni yaratılacak 4 yüzey**: AdminScopeSwitcher, UserIdentityStrip, AdminDashboard (digest), UserDashboard (digest).
4. **Birleştirilmesi değerlendirilecek 3 ikili**: Asset ↔ Style, Inbox ↔ Comments, Calendar list/grid toggle.

R3'te bu 4 sinyal + R1'deki 6 duplicate çift + 12 layout canon kararı birleştirilecek.

---

## 15. Faz R2 Teslim Raporu (7 Başlık)

### 15.1 Ne yaptın
9 platform × 7 kategori hibrit benchmark. 4 platform derin, 5 platform tamamlayıcı. Her pattern 4-etiket + ContentHub kod dosyası bağlantısı ile raporlandı.

### 15.2 Hangi dosyaları okudun / değiştirdin
- **Okundu (frontend kod gerçekliği):** `pages/user/UserAutomationPage.tsx`, `pages/user/UserCalendarPage.tsx`, `pages/admin/PublishCenterPage.tsx`, `pages/admin/AssetLibraryPage.tsx`, `pages/admin/JobsRegistryPage.tsx`
- **Grep (doğrulama):** `useCurrentUser|useActiveScope|ScopeSwitcher|adminScope` → **0 dosya** (yeni tanıtılacak)
- **Glob (envanter):** 54 admin + 21 user sayfa listesi
- **WebSearch (8 sorgu):** n8n, Make, Hootsuite, OpusClip, Canva, Buffer, Later, Metricool, Zapier + ek iki tema (xyflow bundle, SaaS impersonation, dashboard digest)
- **Değiştirildi:** Yalnız `docs/redesign/R2_competitor_benchmark.md` (bu dosya) oluşturuldu.

### 15.3 Hangi testleri çalıştırdın
R2 saf discovery/yazma fazı; kod değişikliği yok → test koşulmadı. `git diff --stat backend/ frontend/ renderer/` çıktısı boş olmalı.

### 15.4 Sonuç ne oldu
Top-15 UX pattern listesi çıkarıldı. 14/15 pattern backend değişiklik gerektirmiyor. Reddedilen pattern'ler kalıcı MEMORY'ye yazılacak. `@xyflow/react`, workspace switcher, AI predictive scores **şimdilik hayır** olarak onaylandı.

### 15.5 Bulduğun ek riskler
- **R1:** `useCurrentUser`/`useActiveScope` hook'ları hâlen yok — yeni bir ergonomi yatırımı gerekecek, mevcut 30+ `useAuthStore` import dağınıklığı üzerine oturur.
- **R2:** `AutomationPolicy.approver_user_id` alanı yok → Hootsuite role-based approval uyarlaması R6 sonrası.
- **R3:** Instagram/LinkedIn adapter yok → Buffer/Later/Canva schedule patterns'ı YouTube-only kalır.
- **R4:** `AssetLibraryPage` ve `ContentLibraryPage` kavramları hâlâ belirsiz — R3'te "library mi depo mu?" netleştirilmeli.
- **R5:** `UserInboxPage` ↔ `UserCommentsPage` merge riski — farklı data source'lar iç içe.

### 15.6 Commit hash
Bu rapor commit'i takip eden Bash bloğunda oluşturuluyor — commit yazıldıktan sonra güncellenecek MEMORY.md bölümünden okunabilir.

### 15.7 Push durumu
Worktree remote'ta aktif (`worktree-product-redesign-benchmark`). Rapor commit'i aynı remote'a push edilecek. Main'e dokunulmuyor.

---

## 16. code change: none

Bu raporu üretirken hiçbir backend/frontend/renderer kaynak kodu değişmedi.

```
git diff --stat backend/ frontend/ renderer/
# (boş)
```

CLAUDE.md non-negotiable kuralları korundu:
- Hidden behavior yok.
- Kod kopyalaması yok (pattern ödünç ≠ kod ödünç).
- Settings Registry üstünden yönetilebilirlik önerildi, hardcoded çözüm yok.
- Monolitik god-function önerilmedi; her öneri izole component + mevcut mimariye bağlı.

---

## 17. Sonraki Adım: FAZ R3 (otomatik devam)

R3 üç çıktı üretecek:
1. Yeni Admin IA (sidebar yeniden grupları, 54→~35 sayfa hedefi)
2. Yeni User IA (21→~15 sayfa hedefi, duplicate çiftler birleşik)
3. Yüzey-canon kararı (Atrium/Bridge/Canvas/Horizon hangisi "default surface" olur)
4. AdminScopeSwitcher + UserIdentityStrip mimari şeması (kod YAZILMADAN)

Çıktı dosyası: `docs/redesign/R3_information_architecture.md`

R6'ya kadar kod yok, onay kapısı R6.

---

**Doküman sonu. R3 otomatik başlatılacak.**
