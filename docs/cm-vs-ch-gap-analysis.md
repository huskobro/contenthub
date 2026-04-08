# ContentManager vs ContentHub — Gap Analizi

## ContentManager'da Olup ContentHub'da OLMAYAN Ozellikler

### A. BACKEND / IS MANTIGI

| # | Ozellik | CM Durumu | CH Durumu | Oncelik |
|---|---------|-----------|-----------|---------|
| A1 | **Maliyet Takibi** | Job.cost_estimate_usd + JobStep.cost_estimate_usd + /api/admin/costs | Yok | Yuksek |
| A2 | **Product Review modulu** | Tam pipeline (script, metadata, tts, visuals, composition) | Yok (modul tanimsiz) | Orta |
| A3 | **Kategori sistemi** | Category modeli (6 builtin: genel, bilim, tarih, motivasyon, din, suc). Tone/focus/style alanlari | Yok | Orta |
| A4 | **Hook (acilis kancasi) sistemi** | Hook modeli (8 builtin: soru, istatistik, kisa anekdot, vb). TR/EN dil destegi, tekrar onleme | Yok | Orta |
| A5 | **Kategori-Stil eslestirme** | CategoryStyleMapping modeli (spor->sport, ekonomi->economy vb). Bulten gorsel stilini belirler | Yok | Dusuk |
| A6 | **PlatformAccount modeli** | Genel coklu platform hesap yonetimi (YouTube, TikTok, Instagram, Facebook) | Yok — sadece YouTube token_store | Orta |
| A7 | **YouTubeChannel modeli** | Coklu YouTube kanal yonetimi (liste, varsayilan sec, aktif/pasif, baglanti kes) | Yok — tek kanal | Orta |
| A8 | **Pipeline cache sistemi** | Dosya bazli cache (CacheManager). Step oncesi cache kontrol, idempotent calistirma | Yok | Dusuk |
| A9 | **Job indirme endpoint'i** | GET /api/jobs/{id}/download — son ciktiyi indir | Yok | Orta |
| A10 | **Klasor acma endpoint'i** | POST /api/jobs/{id}/open-folder + POST /api/settings/open-folder | Yok | Dusuk |
| A11 | **Cikti klasoru yonetimi** | GET/POST/DELETE /api/settings/output-folder + Finder'da ac | Yok | Dusuk |
| A12 | **Kategori bazli prompt zenginlestirme** | build_enhanced_prompt() — kategori tone/focus/style + hook diversity enjeksiyonu | Yok — prompt_builder daha basit | Yuksek |
| A13 | **5-katmanli ayar hiyerarsisi** | global -> admin -> module -> provider -> user | admin_value -> default_value -> builtin (3 katman) | Orta |
| A14 | **Ayar kilitleme (locked)** | Per-setting locked flag — kullanici override'i engeller | user_override_allowed flag var ama UI'da lock gosterimi yok | Dusuk |
| A15 | **PublishAttempt modeli** | Her publish denemesinin request/response snapshot'i | PublishLog var ama snapshot degil | Dusuk |

### B. FRONTEND / UI

| # | Ozellik | CM Durumu | CH Durumu | Oncelik |
|---|---------|-----------|-----------|---------|
| B1 | **Modul Yonetimi sayfasi** | Merkezi on/off toggle + modul bazli konfigurasyon accordion'u | Yok — modul ayarlari Settings'e dagitilmis | Yuksek |
| B2 | **Provider Yonetimi sayfasi** | Kategorili accordion, API key giris (goster/gizle), gorsel fallback siralama editoru | Yok — Credentials tab'da genel liste | Yuksek |
| B3 | **Master Prompt editoru** | 3 tab: Modul Promptlari (textarea), Kategoriler (CRUD), Acilis Hook'lari (CRUD) | Yok — promptlar Settings Registry'de duzenlenebilir ama ozel UI yok | Yuksek |
| B4 | **Maliyet Takip sayfasi** | 3 ozet kart + provider dagilim cubugu + is bazli maliyet tablosu | Yok | Yuksek |
| B5 | **Video onizleme (job detail)** | Job detay panelinde gomulu video player (output varsa) | Yok | Orta |
| B6 | **Toplu video olusturma** | Cok satirli topic input — her satir = ayri job (batch production) | Tek tek olusturma | Orta |
| B7 | **Roving tabindex + Space/Enter modeli** | Liste ogelerinde ok tuslariyla gezinme, Space=QuickLook, Enter=Sheet | Tablolarda standart HTML, QuickLook Space ile acilir ama roving tabindex yok | Orta |
| B8 | **Platform Hesap Yonetimi sayfasi** | Coklu platform (YouTube + gelecek platformlar), aktif/pasif, varsayilan sec | Yok | Dusuk |
| B9 | **Kullanici Ayarlari sayfasi** | Kategorize kartlar: dil, TTS, gorsel tercih, cozunurluk, FPS, altyazi stili | Yok — kullanici paneli minimal | Orta |
| B10 | **Modul secim kartlari** | Video olusturmada renkli modul kartlari (mavi/amber/yesil) + modul bazli ozel alanlar | Ayri wizard sayfalari var ama tek sayfada modul secimi yok | Dusuk |
| B11 | **Admin Dashboard zenginligi** | Sistem saglik durumu (API, DB, ortam), is dagilim cubugu (kuyruk/calisan/tamamlanan/basarisiz) | Analytics API destekli ama overview sayfasi daha sade | Orta |
| B12 | **Accordion form deseni** | Modul/Provider/Settings sayfalarinda expand/collapse gruplar | Yok — duz liste veya tab | Dusuk |
| B13 | **Lock ikonu ile readonly gosterimi** | Kilitli ayarlarda Lock ikonu + readonly state | user_override_allowed flag var ama gorusel lock yok | Dusuk |
| B14 | **Admin PIN kilidi** | Header'da kilit/acma, PIN modali ile admin modu toggle | Yok — panel switch butonu var ama PIN korumasiz | Dusuk |

### C. HER IKI TARAFTA OLUP FARKLILIK GOSTEREN YAPILAR

| # | Konu | CM Yaklasimi | CH Yaklasimi | Hangisi Daha Iyi |
|---|------|-------------|-------------|-----------------|
| C1 | Tema sistemi | Tek dark tema, CSS degiskenleri | Coklu tema engine, import/export, ThemeRegistry sayfasi | CH >> |
| C2 | Ayar yonetimi | 5 katman, locked flag, sema odakli UI | Rich metadata, KNOWN_SETTINGS seed, validation, history/restore | CH >> |
| C3 | Haber modulu | Basit RSS fetch (pipeline icinde inline) | Tam scan engine, 2 katmanli dedupe, auto-scan scheduler, UsedNewsRegistry | CH >> |
| C4 | Yayin sistemi | 5 durum, PlatformAccount, PublishAttempt snapshot | 9 durumlu state machine, review gate, scheduled publish, PublishLog | CH >> |
| C5 | Analitik | /api/admin/stats + /api/admin/costs (basit) | 6 endpoint, zaman penceresi filtreleme, VideoStatsSnapshot | CH >> |
| C6 | Job pipeline | Fonksiyon bazli step'ler, cache manager | OOP executor pattern, dispatcher, recovery, auto-retry | CH >> |
| C7 | Provider sistemi | execute_with_fallback, 3 provider | Priority-based registry, 7 provider, REST API, trace recording | CH >> |
| C8 | Sablon sistemi | Yok (hardcoded stiller) | Template + StyleBlueprint + TemplateStyleLink | CH >> |
| C9 | SSE | Inline Queue per subscriber | EventBus class + React Query invalidation | CH >> |
| C10 | Visibility | Yok | Tam visibility engine (server + client) | CH >> |
| C11 | Audit | Yok | AuditLog modeli + UI | CH >> |
| C12 | Onboarding | Yok | 9 adimli wizard | CH >> |
| C13 | Command Palette | Yok | Cmd+K ile context-aware komutlar | CH >> |
| C14 | Bildirim merkezi | Yok | NotificationCenter + SSE entegrasyonu | CH >> |
| C15 | Kullanici yonetimi | Basit admin/user modu | User modeli + rol bazli erisim | CH >> |

## UI YENIDEN TASARIM PLANI

CM'nin gorusel dilini CH'nin mevcut altyapisina uyarlamak icin:

### Faz 1: Layout ve Genel Gorunum (CM Benzeri)
1. **Sidebar yeniden tasarimi** — CM'deki gibi koyu arka plan, ikon+etiket, section baslik, daraltilabilir
2. **Header yeniden tasarimi** — CM'deki gibi sticky, sayfa basligi solda, aksiyonlar sagda
3. **Dashboard zenginlestirme** — CM'deki gibi StatCard grid + sistem durumu + is dagilim cubugu + hizli erisim kartlari
4. **Kart/Panel tasarimi** — CM'deki gibi rounded-xl, border, bg-card, hover lift efekti

### Faz 2: Eksik Sayfalar
5. **Modul Yonetimi sayfasi** — accordion bazli modul listesi, on/off toggle, modul bazli ayar panelleri
6. **Provider Yonetimi sayfasi** — kategorili accordion, API key giris, fallback siralama editoru
7. **Master Prompt editoru** — 3 tab (Modul Promptlari, Kategoriler, Hook'lar)
8. **Maliyet Takip sayfasi** — ozet kartlar + provider dagilim + is bazli maliyet tablosu

### Faz 3: Mevcut Sayfalari Gelistirme
9. **Job Detail** — video onizleme ekleme, maliyet gosterimi
10. **Video olusturma** — toplu topic destegi, modul secim kartlari
11. **Kullanici Ayarlari** — kategorize kart duzen, lock ikonu
12. **Admin Dashboard** — sistem durumu, is dagilim cubugu

### Faz 4: Backend Destegi
13. **Maliyet takibi** — Job/JobStep'e cost_estimate_usd alanlari, /api/admin/costs endpoint
14. **Kategori + Hook sistemi** — DB modelleri, CRUD API, prompt zenginlestirme
15. **Product Review modulu** — pipeline tanimlamasi
16. **Coklu platform hesap yonetimi** — PlatformAccount modeli, CRUD API
