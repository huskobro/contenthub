# 01 — System Overview

## ContentHub nedir?

ContentHub, **tek bir lokal makinede çalışan, modüler bir içerik üretim ve yayın platformudur.** Basit bir CMS değildir — aynı anda şunları yapmak için tasarlanmıştır:

- İçerik üretimi (script → TTS → subtitle → composition → render → thumbnail → publish boru hattı)
- Yayın akışları (draft → review → schedule → publish → retry)
- Operasyonel gözlem (jobs + step timeline + elapsed time + ETA)
- Analytics (platform overview, operations, content, publish)
- Template / style blueprint yönetimi
- Haber kaynağı tarama + haber normalizasyonu + used-news deduplikasyonu

Hedef: tek bir makinede çalışan, temiz bir MVP. SaaS, billing, multi-tenant karmaşıklığı yok.

---

## Neyi çözer?

**Sorun:** içerik üretim + yayın akışının parçaları farklı araçlarda dağılmış durumda. Script üret, TTS al, subtitle üret, compose et, render et, thumbnail oluştur, YouTube'a yükle, gidişatı takip et, hata olursa geri al — bunlar normalde 6–8 farklı araç demektir.

**Çözüm:** ContentHub bunları tek bir iş (job) kavramı etrafında birleştirir. Bir içerik projesi (ContentProject) başlatırsınız; bu projeden bir iş (Job) başlar; job içinde deterministik adımlar (script / metadata / tts / subtitle / composition / render / publish) sırayla çalışır; her adımın state'i, süresi, ETA'sı, artifact'ı, log'u tek bir Job Detail sayfasında görünür; hata olursa retry ya da rollback yapılır; sonuç publish merkezine akar.

Her şey görünür, denetlenebilir, yeniden üretilebilir ve local storage üzerinde tutulur.

---

## Kimin için?

Üç rol:

- **Admin / operatör:** sistemin sağlığını izler, template'leri/blueprint'leri yönetir, provider'ları + credential'ları kurar, visibility kurallarını yazar, haber kaynaklarını yönetir, kullanıcıları yönetir, yayın sürecini denetler.
- **User:** kendi projelerini oluşturur, video / bulletin wizard'ları ile içerik üretir, yayına gönderir, analytics'ini görür. Guided mode veya Advanced mode seçebilir.
- **Geliştirici / devralan:** sistem omurgasını anlayan, yeni modül eklemek isteyen, akışı değiştirmek isteyen teknik rol.

Bu doc seti her üç roleye hizmet eder.

---

## Ana paneller

ContentHub iki panel üzerinden çalışır:

### Bridge Panel (admin)
- Route kökü: `/admin/*`
- Kim kullanır: admin rolü
- Amacı: sistemin tüm operasyonel gözlemini + yönetimini merkezi bir yerde sunmak

### User Panel
- Route kökü: `/user/*`
- Kim kullanır: user rolü + admin (admin her iki panele de girebilir)
- Amacı: içerik üreticinin günlük workspace'i — projeleri, jobs'ı, yayını, kanal performansını

Panel geçişi UI'da görünür (admin panelinden "Kullanıcı Paneli" butonu, user panelinden tersi). Ancak bu iki panelin görünümü seçilen **surface**'a bağlıdır — aynı içerik farklı görsel kabuklarda (shell) sunulabilir. Detay: `05-surfaces-themes-and-panel-switching.md`.

---

## Ana kavramlar — bir sayfa özet

| Kavram | Kısa açıklama |
|---|---|
| **Panel** | `admin` veya `user` — yetki alanı (scope) |
| **Surface** | Panelin görsel kabuğu (Legacy / Horizon / Bridge / Atrium / Canvas) |
| **Theme** | Renk paleti + tipografi (Obsidian Slate, Horizon Midnight vb.) — 12 adet kayıtlı |
| **Module** | Content modülü: `standard_video`, `news_bulletin`, (planlı: `product_review`, `educational_video`, `howto_video`) |
| **ContentProject** | Kullanıcının başlattığı içerik projesi (bir modüle bağlı) |
| **Job** | Bir projenin pipeline'ını çalıştıran iş — adımları + state'i + artifact'ları var |
| **Job Step** | Job'ın içindeki tek deterministik adım (script / metadata / tts / subtitle / composition / render / publish) |
| **Template** | İçerik şablonu — başlık, açıklama, etiket formülasyonu |
| **Style Blueprint** | Görsel stil kuralları — renk, motion, layout, subtitle stil, disallowed elements |
| **ChannelProfile** | Bir kullanıcının sahip olduğu yayın kanalı profili (brand, default language, slug) |
| **PlatformConnection** | ChannelProfile'ı bir dış platforma (şu an YouTube) bağlayan OAuth connection |
| **PublishRecord** | Bir içeriğin bir platforma yayınlanma kaydı (state machine: draft → review_pending → approved → scheduled → publishing → published) |
| **Review Gate** | PublishRecord'un `published` durumuna geçmeden önce geçmesi gereken manuel onay noktası |
| **Source** | Haber kaynağı (RSS / manual URL / API) |
| **SourceScan** | Bir Source'un bir taramada getirdiği haber item'ların kaydı |
| **NewsItem** | Kaynaklardan normalize edilmiş tekil haber |
| **Used News** | Kullanılan haberleri işaretleyen dedupe ledger |
| **Setting** | Settings Registry'de tutulan bir key (type: text / number / bool / select / prompt / json) |
| **Effective Setting** | Admin değeri + user override + default merge edilmiş nihai değer |
| **Visibility Rule** | Bir kullanıcıya hangi panelin / alanın / wizard adımının görüneceğini belirleyen kural |
| **Provider** | AI/TTS/image/speech servisi (kie_ai_gemini_flash, local_whisper, Pexels, Pixabay vb.) |
| **Wizard** | Onboarding / content creation / publish için rehberli adımlı akış |

Tam sözlük: `14-glossary.md`.

---

## Ürünün ana omurgası

Yedi temel altyapı:

1. **Auth store + AuthGuard** (`frontend/src/app/guards/AuthGuard.tsx`)
   Role-aware giriş; admin olmayan biri `/admin` rotasına inerse user paneline yönlendirilir.

2. **Settings Registry** (`backend/app/settings/*`, `/admin/settings`)
   Admin tarafından yönetilen tüm yapılandırılabilir davranış. Prompt'lar, thresholds, default'lar. `KNOWN_SETTINGS` listesinden tüm keyler tanımlı.

3. **Visibility Engine** (`backend/app/visibility/*`, `/admin/visibility`)
   Panel / widget / field / wizard step görünürlüğünü ve okuma-yazma yetkisini kural bazlı kontrol eder. Server-side enforce edilir, client-side yansıtılır.

4. **Job Engine** (`backend/app/jobs/*`, `/admin/jobs`)
   Async in-process job queue + explicit state machine (queued / running / completed / failed / cancelled). Her job'ın step timeline'ı, elapsed time, ETA'sı.

5. **Template + Style Blueprint System** (`/admin/templates`, `/admin/style-blueprints`)
   Versiyonlanan şablonlar. Job başladığında snapshot-lock.

6. **Provider Registry** (`/admin/providers`)
   LLM / TTS / Image / Speech provider'ları. Her birinde credential durumu, test butonu, fallback sırası.

7. **Surface System** (`frontend/src/surfaces/*`)
   Aynı route ağacı üzerine farklı UI shell'lerin binmesini sağlayan override mekanizması. `resolveActiveSurface` kullanıcıya göre aktif surface'i karar verir.

Bu yedi altyapının üstünde modüller (standard_video, news_bulletin) ve operasyonel sayfalar oturur.

---

## Bugünkü genel durum (2026-04-11)

Son final acceptance tour'ına göre:

- **Büyük ölçüde hazır.** State makineleri, settings registry, visibility engine, job engine ve iki panel de çalışıyor, sıfır runtime hatası üretiyor.
- Atrium editoryal yüzeyi ve Bridge operasyon yüzeyinin ana iskeleleri profesyonel, net ve tutarlı.
- Kalan pürüzler polish seviyesinde: 4 sayfada ASCII-only Türkçe metinler + 2 uppercase chip leftover + chart legend'larda İngilizce status key'ler.
- Büyük UI / mimari turları tamamlandı. Ana ürün geliştirmesine (M32 review gate, M34 analytics backend, M37 modül genişlemesi) dönülebilir.

Gerçeklik tablosu: `11-current-capabilities-vs-partial-areas.md`.

---

## Stack kısaca

- **Backend:** FastAPI (Python) + SQLite (WAL) + in-process async job queue
- **Frontend:** React + Vite + TypeScript + Zustand (client) + React Query (server) + Remotion (render)
- **Realtime:** SSE
- **Storage:** local workspace (`backend/workspace/users/<username>/jobs/<job-id>/...`)
- **Rendering:** Remotion compositions — safe composition mapping ile

Detay: `06-core-domain-model.md` + `CLAUDE.md`.

---

## Bu sistemin olmadığı şeyler

Kafa karışıklığını önlemek için:

- **SaaS değil.** Billing, multi-tenant, licensing, organization management yok.
- **Generic CMS değil.** Blog post editorü, media library manager, web page builder yok.
- **Otomatik yayın pazarlama aracı değil.** Scheduled social media management yok.
- **AI content farm değil.** Prompt-driven chaos değil — tüm kritik behavior deterministik servislerde, AI sadece kısıtlı asistan.
- **Multi-platform publish sistemi değil (henüz).** Publish adapter mimarisi var, ama şu an sadece YouTube v1.

---

## Sonraki adım

- Hiyerarşiyi görmek istiyorsan → `02-information-architecture.md`
- Direkt admin panele girmek istiyorsan → `03-admin-panel-guide.md`
- User panele girmek istiyorsan → `04-user-panel-guide.md`
- Bir akışı öğrenmek istiyorsan → `07-key-workflows.md`
