# ContentHub — Production Audit Report
**Date:** 2026-04-20
**Branch:** main
**Scope:** Full production-readiness audit — first-run, security/auth, job engine, storage, UX, performance, recovery, docs

---

## A) Executive Summary

ContentHub is a localhost-first modular content production and publishing platform combining content creation, publishing workflows, operations visibility, analytics, template/style management, and news source ingestion. The platform is built on a FastAPI backend, React/Vite/TypeScript frontend, SQLite with WAL mode, Remotion for video rendering, Zustand for client state, and React Query for server state. As of this audit, the platform has reached MVP-grade breadth: the Aurora UI shell is broadly functional, core subsystems (settings registry, job engine, source registry, publish center, analytics views) are present and navigable. However, specific critical gaps in security, storage safety, and job engine reliability prevent it from being considered production-ready even for a single-operator localhost deployment.

The strongest areas of the codebase are its architectural foundations. The Aurora UI demonstrates impressive breadth — navigation, sidebar, Cmd+K palette, notification center, cockpit, analytics, users registry, publish center, news items, and settings pages are all present and coherent. The Zustand/React Query split is correctly implemented: client-only UI state (modals, sidebar, wizard progress, SSE connection) lives in Zustand, while server-synchronized data (jobs, settings, sources, publish records, analytics) flows through React Query. The job engine state machine is explicitly structured with defined state transitions. The Alembic migration chain is intact with idempotent guards added in recent milestones. The settings registry concept is correctly modeled as first-class product objects with metadata, not ad-hoc config. SSE realtime is wired up for job progress and notifications. The layered backend architecture (Router → Service → Repository) is respected throughout.

The riskiest areas fall into four clusters. Security: the password reset endpoint returns the token in plaintext JSON (trivial account takeover), the `/platform-connections/center/admin` endpoint has no `require_admin` guard (open to any authenticated user), and the `X-ContentHub-Role` header trust has no `settings.debug` gate (privilege escalation vector). First-run reliability: `start.sh` does not call `alembic upgrade head`, and `create_tables()` in `main.py` runs raw DDL at every startup, bypassing Alembic — a fresh clone will not boot correctly and an existing deployment will silently drift schema. Storage: the YouTube upload reads the entire video file into RAM with a single `f.read()` call, meaning any moderately sized video will trigger OOM and take down the entire job engine process; the `cleanup_tmp()` function is defined but never called anywhere in production paths, so temp files accumulate indefinitely. Job engine: the heartbeat mechanism stops updating during the Remotion subprocess window (which can last 600+ seconds), creating ghost jobs after restarts; the cancel endpoint updates the DB record but does not cancel the underlying asyncio task or kill the subprocess, leaving zombie renders consuming resources.

The general verdict is that ContentHub is not production-ready today, but it is not far. Eight to twelve focused implementation-level fixes — none requiring architectural redesign — would bring it to a trustworthy localhost MVP. The codebase architecture is sound; every identified gap is an implementation-level omission, not a structural flaw. The phased roadmap in Section F estimates 8-13 days of focused work to reach a genuinely reliable single-operator deployment.

---

## B) Production Readiness Scorecard

| Kategori | Durum | Ana Sorunlar | Güçlü Yanlar |
|---|---|---|---|
| İlk Kurulum (First-Run) | 🔴 Yüksek Risk | start.sh alembic atlar; create_tables() Alembic'i bypass eder; 15 migration non-idempotent | Alembic yapısı temiz, migration chain eksiksiz |
| Auth & Security | 🔴 Yüksek Risk | X-ContentHub-Role header debug gate yok; reset token API response'da; /platform-connections/center/admin guard yok; seed'de plaintext password log | JWT altyapısı doğru; role hierarchy mantıklı |
| Provider Yönetimi | 🟡 Orta Risk | settings.debug gate eksik; provider resolution chain verbose | Provider chain mantıksal, fallback sistemi var |
| Job Engine | 🟡 Orta Risk | Heartbeat Remotion subprocess'te durur (600s gap); cancel DB günceller ama asyncio task iptal etmez; stuck-job detector yok | State machine temiz; step runner modüler; SSE entegrasyonu çalışıyor |
| Publish Pipeline | 🟡 Orta Risk | YouTube upload tüm videoyu RAM'e yükler; partial failure rollback belirsiz | Publish state machine var; audit trail mevcut |
| Storage & Runtime | 🔴 Yüksek Risk | workspace cleanup() hiç çağrılmıyor; tmp dosyalar birikir; disk dolu senaryosunda sessiz hata | .gitignore policy temiz; workspace yapısı mantıklı |
| Recovery & Restart | 🟡 Orta Risk | Stale queued jobs sadece loglanır, failed'a geçirilmez; heartbeat gap ghost job yaratabilir | Startup recovery var; heartbeat mekanizması mevcut |
| UX Kalitesi | 🔴 Yüksek Risk | window.prompt() user creation ve rejection reason'da; AuroraAnalytics sıfır hata state'i; news items no pagination | Aurora breadth etkileyici; navigation coherent; sidebar solid |
| Performans | 🟡 Orta Risk | refetchInterval 15s tüm sayfalarda; news items full-fetch no limit; _scrape_og_image sync urllib blokluyor event loop | React Query kullanımı genel olarak doğru; Zustand scope'ları uygun |
| Dokümantasyon | 🟢 Güçlü | — | CLAUDE.md kapsamlı; RUNTIME_AND_STORAGE_POLICY.md eksiksiz; docs/audits/ mevcut |

---

## C) Risk Register

### P0 — Kritik (Acil)

| # | Başlık | Ciddiyet | Kullanıcı Etkisi | Teknik Kök Neden | İlgili Dosyalar | Önerilen Düzeltme | Çözülmezse |
|---|---|---|---|---|---|---|---|
| 1 | Reset Token API Response'da Açık | P0 | Hesap ele geçirme | `POST /auth/forgot-password` token'ı plaintext JSON'da döndürüyor | backend/app/auth/router.py:293 | Token sadece DB'de sakla, email ile gönder | Şifre sıfırlama tüm hesapları tehlikeye atar |
| 2 | /platform-connections/center/admin Guard Yok | P0 | Yetkisiz admin erişimi | router.py:75'te `Depends(require_admin)` eksik | backend/app/platform_connections/router.py:75 | `require_admin` dependency ekle | Herhangi biri tüm platform bağlantılarını okuyabilir |
| 3 | YouTube Upload Tüm Videoyu RAM'e Yükler | P0 | OOM crash / servis çökmesi | `video_data = f.read()` satırı tüm dosyayı belleğe alıyor | backend/app/modules/standard_video/executors/render.py:289 | Streaming upload (chunked/multipart) kullan | Büyük video → OOM → tüm job engine çöker |
| 4 | start.sh Alembic Atlar | P0 | Taze kurulumda uygulama boot etmez | start.sh:104'te `alembic upgrade head` çağrısı yok | start.sh:104 | start.sh'a `alembic upgrade head` ekle | Fresh clone sonrası uygulama crash'e girer |
| 5 | Workspace Cleanup Hiç Çağrılmıyor | P0 | Disk dolunca sessiz hata | `cleanup_tmp()` tanımlı ama production'da hiç çağrılmıyor | backend/app/workspace/workspace.py | Startup veya job completion'da cleanup çağır | Zamanla disk dolar, iş dururken bile hata mesajı yok |
| 6 | User Creation window.prompt() ile | P0 | Kritik operasyonda veri kaybı riski | 3 ayrı window.prompt() zinciri, iptal = sessiz başarısızlık | frontend/src/surfaces/aurora/AuroraUsersRegistryPage.tsx:110-140 | Modal dialog component ile değiştir | Kullanıcı yaratma güvensiz ve profesyonellikten uzak |

### P1 — Yüksek

| # | Başlık | Ciddiyet | Kullanıcı Etkisi | Teknik Kök Neden | İlgili Dosyalar | Önerilen Düzeltme | Çözülmezse |
|---|---|---|---|---|---|---|---|
| 7 | X-ContentHub-Role Header Debug Gate Yok | P1 | Yetkisiz admin yetki yükseltme | Header fallback `settings.debug` kontrolü yapmıyor | backend/app/visibility/dependencies.py | Debug modda header trust, production'da kaldır | Saldırgan header ile admin yetkisi alabilir |
| 8 | Admin Seed Şifresi Plaintext Log'da | P1 | Credential sızıntısı | `logger.info(... password=%s ...)` | backend/app/auth/seed.py:86 | Log'dan şifreyi kaldır, sadece email logla | Log aggregation'da admin şifresi görünür |
| 9 | JWT Dev Secret Fail-Fast Yok | P1 | Production'da zayıf token imzalama | `_DEV_FALLBACK_SEED` sabit string, ENV yoksa kullanılıyor | backend/app/auth/jwt.py:23 | ENV yoksa production'da hard crash | Tüm JWT token'lar aynı bilinen secret ile imzalanır |
| 10 | Heartbeat Remotion Render Sırasında Durur | P1 | Ghost job / false failure | npx subprocess 600s sürebilir, heartbeat sadece step sınırlarında güncellenir | backend/app/jobs/pipeline.py:313-319 | Subprocess içinde ayrı heartbeat task çalıştır | Restart sonrası çalışan render "takılı" görünür, tekrar başlatılır |
| 11 | Cancel DB Günceller Ama Task İptal Etmez | P1 | Zombie subprocess'ler, çift kaynak tüketimi | dispatcher.py:289-300 asyncio task'ı iptal etmiyor | backend/app/jobs/dispatcher.py:289-300 | Task handle sakla ve cancel() çağır | Cancel sonrası render subprocess çalışmaya devam eder |
| 12 | _scrape_og_image Sync Blokluyor Event Loop | P1 | Kaynak tarama 400s+ bloke | `urllib.request.urlopen` async fonksiyon içinde sync çağrı | backend/app/sources/scan_engine.py:370 | `asyncio.to_thread()` veya `httpx.AsyncClient` kullan | 50 makalelık scan event loop'u 400s boyunca bloke eder |
| 13 | Auto-Retry Race Condition | P1 | Duplicate retry job | Polling loop aynı failed job'a iki kez retry açabilir | backend/app/jobs/retry_scheduler.py:72-170 | Atomik DB kilidi veya `SELECT ... FOR UPDATE` eşdeğeri | Aynı iş için iki paralel retry job oluşur |
| 14 | create_tables() Alembic'i Bypass Eder | P1 | Migration drift, schema inconsistency | `main.py:76` her startup'ta raw DDL çalıştırıyor | backend/app/main.py:76 | `create_tables()` çağrısını kaldır, sadece Alembic kullan | Tablo zaten varsa silent no-op, yoksa Alembic'le çakışır |
| 15 | /settings/effective/{key} Role Filter Yok | P1 | Gizli ayar sızıntısı | Liste endpoint'inde rol filtresi var ama tekil endpoint'te yok | backend/app/settings/router.py:352 | Aynı rol kontrolünü ekle | User role, admin-only ayarları okuyabilir |
| 16 | Render Asset Server Thread Leak | P1 | Thread pool tükenmesi | Multi-output path'te try/finally yoksa asset server thread leak | backend/app/modules/standard_video/executors/render.py:706-813 | try/finally ile asset server'ı kapat | Uzun süreli çalışmada thread pool tükenir |
| 17 | Stale Queued Jobs Recovery'de Geçirilmiyor | P1 | Kalıcı stuck job | Startup recovery sadece running job'ları failed'a geçiriyor, queued'ları bırakıyor | backend/app/jobs/recovery.py | Stale queued job'ları da failed'a geçir | Restart sonrası bazı job'lar sonsuza dek queue'da bekler |

### P2 — Orta

| # | Başlık | Ciddiyet | Kullanıcı Etkisi | Teknik Kök Neden | İlgili Dosyalar | Önerilen Düzeltme | Çözülmezse |
|---|---|---|---|---|---|---|---|
| 18 | Auto-Retry Stale Settings Snapshot Kullanıyor | P2 | Retry eski config ile çalışır | retry_scheduler.py:116-123 eski snapshot'ı yeni job'a geçiriyor | backend/app/jobs/retry_scheduler.py:116-123 | Retry sırasında güncel settings snapshot al | Config güncellendi ama retry eski ayarlarla devam eder |
| 19 | npx Subprocess CancelledError'da Öldürülmüyor | P2 | Orphan render process | render.py:924-938 process.kill() yok | backend/app/modules/standard_video/executors/render.py:924-938 | CancelledError handler'da process.kill() ekle | Orphan npx process RAM/CPU tüketir |
| 20 | renderer/ Path `parents[5]` ile Çözümleniyor | P2 | Yeniden yapılandırmada kırılır | render.py:187-188 fragile index-based path | backend/app/modules/standard_video/executors/render.py:187-188 | Config veya env var ile path yönet | Dizin yapısı değişirse render kırılır |
| 21 | refetchInterval 15s Tüm Sayfalarda | P2 | Gereksiz API yükü | CockpitShell.tsx fetchJobs her 15s statik sayfalarda da çalışıyor | frontend/src/surfaces/aurora/CockpitShell.tsx | Sadece job-related sayfalarda refetch aktif et | Her sayfa ziyaretinde gereksiz network trafiği |
| 22 | AuroraAnalyticsPage Sıfır Hata State | P2 | Sessiz boş ekran | isLoading/isError handling yok | frontend/src/surfaces/aurora/AuroraAnalyticsPage.tsx | Loading spinner ve error message ekle | Backend hatasında kullanıcı boş sayfa görür, neden bilemez |
| 23 | News Items No Pagination | P2 | Büyük veri setinde UI donması | useNewsItemsList() limit yok, client-side filter | frontend/src/surfaces/aurora/AuroraNewsItemsRegistryPage.tsx | Backend'e limit/offset, frontend'e sanal liste | Binlerce haber öğesiyle sayfa yavaşlar/donar |

---

## D) Failure Scenario Matrix

| Senaryo | Tetikleyici | Sistemin Şu Anki Davranışı | Kullanıcı Ne Görür | Kurtarma Yolu | Risk Seviyesi |
|---|---|---|---|---|---|
| Provider Yapılandırılmamış | Job başlar, API key eksik | StepExecutionError loglanır, job failed | Job detail'de hata log'u (varsa) | Ayarı ekle, retry | Orta |
| YouTube API Rate Limit | 429 yanıtı | Exception, job failed veya retry | Log'da 429 mesajı | Bekleme sonrası retry | Orta |
| Render Timeout (600s) | npx 600s aşar | Timeout exception, process kill (şu an eksik) | Job failed, orphan process | Manuel process kill + retry | Yüksek |
| Duplicate Job Trigger | Aynı içerik iki kez submit | İki ayrı job oluşur, race condition yok (submit-level guard var mı belirsiz) | İki paralel job gösterilir | Birini manuel cancel (cancel tam çalışmıyor) | Yüksek |
| Uygulama Restart (Job Çalışırken) | Render 300s'de, restart | Heartbeat gap → startup recovery job'ı failed yapar; ghost job riski | Job failed görünür, render tamamlanmış olabilir | Manuel workspace kontrol + retry | Yüksek |
| Killed Subprocess (Render Devam Ediyor) | OS process kill | DB job hâlâ "running", subprocess yok | Job asıla kalır, manual recovery gerekli | Stuck-job detector yok, manuel fail | Kritik |
| Eski DB + Yeni Migration | Upgrade path | Alembic upgrade head çalışır (şimdi idempotent), clean geçiş | Boot ediyor | Alembic standart | Düşük (fix edildi) |
| Disk Dolması | workspace tmp birikimi | Dosya yazma hatası, job likely fails | Job error log (disk error) | Manuel cleanup, cleanup() hiç çağrılmıyor | Kritik |
| Publish Partial Failure | YouTube API isteği başarısız | Publish record failed duruma geçer | Publish hub'da failed gösterilir | Retry publish (mevcut) | Orta |
| Render Cancel İsteği | User "cancel" tıklar | DB failed güncellenir, asyncio task iptal edilmez, subprocess devam eder | Job cancelled görünür, arka planda çalışmaya devam | Manuel process kill | Yüksek |

---

## E) UX Improvement Pack

### E1 — window.prompt() Kaldırılmalı (P0)

User creation (`AuroraUsersRegistryPage`), publish rejection reason (`AuroraPublishCenterPage`), ve diğer `window.prompt()` kullanımları native browser dialog üzerine kurulu. Bu yaklaşım birden fazla kritik soruna yol açar: modal iptalinde sessiz başarısızlık (kullanıcı iptal ettiğinde işlem yarıda kalıyor, hiçbir geri bildirim yok), tarayıcı tab dışına geçince dialog kayboluyor, hiçbir stil uygulanamıyor, ve erişilebilirlik sıfır (screen reader, keyboard navigation, ARIA desteği yok). Çözüm: her akış için dedicated modal component — shadcn/radix Dialog tabanlı. Kullanıcı yaratma için inline form modal (email, rol, şifre alanlarıyla). Rejection reason için textarea'lı, karakter sayacı olan bir onay modalı. Bu değişiklik tek bir PR'de tüm `window.prompt()` çağrıları için tamamlanabilir.

### E2 — Analytics Sayfası Hata State Şeffaflığı (P0)

`AuroraAnalyticsPage` şu anda `isLoading` ve `isError` durumlarını tamamen görmezden geliyor. Backend çökse, ağ kesilse, veya veri gelmese bile sayfa boş render ediyor — kullanıcı bunun normal bir "veri yok" durumu mu yoksa gerçek bir hata mı olduğunu anlayamıyor. Çözüm üç state için ayrı UI: yükleniyor (skeleton loader, sayfanın genel yapısını koruyan placeholder'larla), hata (ErrorBoundary veya inline error card, yeniden deneme butonu, mümkünse hata açıklaması), veri yok (EmptyState component, ilk veri nasıl oluşturulur açıklamasıyla). Bu pattern tüm analytics hook'larına tutarlı şekilde uygulanmalı.

### E3 — News Items Pagination (P2)

`useNewsItemsList()` şu anda tüm kayıtları tek istekte çekiyor, client-side filter uyguluyor. 1000+ haber öğesiyle sayfa DOM'u donduracak büyüklükte liste render ediyor. Çözüm iki katmanlı: backend'de cursor-based veya offset-based pagination (`limit`, `offset`, `total` parametreleri), frontend'de sonsuz scroll (Intersection Observer ile) veya geleneksel sayfalama (prev/next). Araç çubuğuna toplam kayıt sayısı ve aktif filtre özeti eklenmeli. Bu değişiklik aynı zamanda source ve publish record listelerine de model oluşturacak.

### E4 — Global Activity Indicator

Uzun süren işlemler (job başlatma, publish, kaynak tarama, settings kaydetme) için global bir ilerleme göstergesi yok. Kullanıcı butona tıklıyor, buton devre dışı kalıyor, ne kadar süreceği veya ne olduğu belirsiz. Çözüm: `CockpitShell` seviyesinde global toast/progress system, React Query mutation `isPending` state'leriyle entegre. Uzun operasyonlar için toast notification (başladı → tamamlandı / hata), kısa operasyonlar için inline buton spinner yeterli. Zustand'da global loading state saklamaktan kaçın — React Query mutation state'i yeterli.

### E5 — Graceful Degraded State

Backend down veya SSE bağlantısı koptuğunda UI hiçbir şey göstermiyor. Kullanıcı sayfaların neden güncellemediğini anlayamıyor. Çözüm: SSE bağlantı state'ini Zustand'da tut (`connected`, `disconnected`, `reconnecting`). Disconnected durumda `CockpitShell` üst kısmında sarı/kırmızı banner göster: "Bağlantı kesildi — veriler güncellenmeyebilir. Yeniden bağlanılıyor..." SSE reconnect başarılı olunca banner otomatik gizlenmeli. Bu, kullanıcının sistemi kapatıp açmasını önler.

### E6 — refetchInterval Optimizasyonu

15 saniyede bir tüm sayfalarda job fetch çalışıyor. Analytics, Settings, Docs, Users Registry gibi statik sayfalar job durumundan bağımsız — bu sayfalarda 15s polling gereksiz ağ trafiği ve server yükü demek. Çözüm: `useJobsPolling` hook'unu route-aware hale getir. Sadece `/jobs`, `/cockpit`, `/job/:id` gibi job-relevant route'larda polling aktif olsun. React Router'ın `useLocation()` hook'u veya route-based layout ayırımı ile uygulanabilir. SSE zaten job güncellemelerini push ediyor — polling sadece SSE koptuğunda fallback olarak anlamlı.

### E7 — Admin/User Rol Netliği

Aurora admin sayfaları ve user sayfaları aynı sidebar navigation içinde. Hangi sayfaların admin-only olduğu görsel olarak belirsiz — yeni bir kullanıcı veya geliştirici hangi bölümün kısıtlı olduğunu anlayamıyor. Çözüm: admin-only navigation item'larına küçük `Admin` badge ekle (sidebar item yanında, renk-coded). Role-gated navigation item'ları zaten gizleniyor olmalı — bu tutarlılığı audit et ve garantile. Breadcrumb'lara da "Admin / Settings" gibi role bağlamı eklenebilir. Bu değişiklik saf görsel ve navigation.tsx seviyesinde tamamlanabilir.

---

## F) Final Roadmap

### Faz 1 — Kritik Güvenlik ve Güvenilirlik (Süre: 1-2 gün)

1. Reset token'ı API response'dan kaldır — token sadece DB'de, email flow simüle et veya gerçek email ekle
2. `/platform-connections/center/admin`'e `require_admin` dependency ekle
3. `X-ContentHub-Role` header trust'ı production'da kaldır (`settings.debug` gate)
4. Admin seed log'dan şifreyi kaldır
5. JWT secret için ENV yoksa fail-fast ekle (production ortamında)
6. `/settings/effective/{key}`'e rol kontrolü ekle
7. `start.sh`'a `alembic upgrade head && alembic current` ekle
8. `create_tables()` çağrısını `main.py`'den kaldır

### Faz 2 — Job Engine ve Storage Güvenilirliği (Süre: 2-3 gün)

1. YouTube upload'u streaming'e çevir (chunked upload)
2. `workspace cleanup()` job completion ve startup'ta çağır
3. Heartbeat'i Remotion subprocess süresi boyunca aktif tut (asyncio task)
4. Cancel endpoint'inde asyncio task iptal + process kill ekle
5. Stale queued job'ları startup recovery'de failed'a geçir
6. `_scrape_og_image`'ı `asyncio.to_thread()` içine al
7. Auto-retry race condition'ı atomik lock ile çöz
8. npx subprocess `CancelledError` handler'a `process.kill()` ekle

### Faz 3 — UX Kalitesi (Süre: 2-3 gün)

1. `window.prompt()` → Modal dialog (user creation, rejection reason, tüm kullanımlar)
2. `AuroraAnalyticsPage`'e loading/error/empty state ekle
3. News items backend pagination + frontend infinite scroll
4. SSE disconnection banner
5. `refetchInterval` route-aware hale getir
6. Admin badge'leri navigation'a ekle
7. Global mutation progress indicator

### Faz 4 — Hardening ve Test Kapsamı (Süre: 3-5 gün)

1. First-run integration test (fresh DB → alembic → seed → boot → smoke)
2. Security endpoint tests (role escalation denemeleri)
3. Job state machine edge case testleri (cancel, timeout, restart)
4. render.py path resolution'ı config-driven yap
5. Auto-retry settings snapshot fix
6. refetchInterval audit tamamla
7. Tüm P2 risk'leri adresle
8. Production readiness checklist final geçişi

---

## G) Final Verdict

**Sonuç: Localhost MVP Olarak Yakın, Production'a Hazır Değil**

1. **Mimari sağlam.** FastAPI layered backend, Alembic migration chain, Zustand/React Query split, SSE realtime, settings registry konsepti — bunların hepsi doğru. Architectural debt yok, sadece implementation-level gap'ler var.

2. **Kritik güvenlik açıkları var ama hepsi nokta düzeltmeler.** Reset token response, unguarded admin endpoint, header trust escalation — bunlar kapsamlı refactor gerektirmiyor. Her biri 1-5 satır değişiklik.

3. **Storage ve job engine gap'leri gerçek prod blocker'lar.** YouTube RAM upload ve workspace GC eksikliği ilk büyük video prod'da sistemi çökertir. Cancel ve heartbeat gap'leri ghost job'a yol açar. Bunlar Faz 2'de çözülmeli.

4. **UX window.prompt() ile ciddiye alınamaz.** User creation ve publish rejection gibi kritik operasyonlar native browser dialog üzerinde. Bu, product'ın profesyonellik algısını doğrudan öldürür. Faz 3'ün başı.

5. **Faz 1-2 tamamlanırsa (3-5 gün iş), sistem güvenilir bir localhost MVP'ye dönüşür.** Faz 3-4 eklenince developer/operator için ciddi bir araç olur. Start-from-scratch gerektirmiyor. Mevcut temel korunmalı.

**Öneri: Mevcut temeli koru, Faz 1'i hemen başlat.**
