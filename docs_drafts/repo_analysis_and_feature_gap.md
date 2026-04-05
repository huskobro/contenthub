# 4 Repo Karsilastirmali Analiz ve ContentHub Entegrasyon Raporu

**Tarih:** 2026-04-05
**Analiz Edilen Repolar:**
1. **ContentManager** — React + Tailwind + Radix UI, FastAPI, calisan MVP
2. **YouTubeStoryGenerator** — Electron + vanilla JS, FFmpeg, tam otonom bot
3. **youtube_video_bot** — CustomTkinter GUI, MoviePy, kategori bazli pipeline
4. **YTRobot-v3** — FastAPI + React, MoviePy + Remotion, multi-channel hub

**Hedef Proje:** ContentHub (React + Vite + TypeScript, FastAPI, SQLite, Remotion)

---

## BOLUM 1: CONTENTHUB'IN MEVCUT DURUMU

ContentHub su katmanlara sahip:
- Job Engine (state machine, step runner, recovery, ETA)
- Settings Registry (metadata-zengin, visibility entegreli)
- Visibility Engine (server-side zorunlu)
- Source Registry + Source Scan Engine + Used News + Dedupe
- Template + Style Blueprint + Template-Style Link sistemi
- Publishing Hub (adapter pattern, state machine, YouTube OAuth)
- Analytics (Overview, Operations, Content, Channel)
- Audit Log
- Content Library + Asset Library
- Onboarding sistemi
- SSE altyapisi
- Design System (M24 ile tokens + primitives)
- Admin/User panel ayrik layout

**ContentHub'da OLMAYAN ozellikler (diger repolarda var):**
- Klavye navigasyonu (keyboard store, scoped navigation, roving tabindex)
- Sagdan kayan detay paneli (Sheet/Drawer)
- QuickLook (Space ile hizli onizleme)
- Command Palette (Cmd+K)
- Toast/Notification sistemi
- Zustand store'lar (CLAUDE.md'de planlanmis ama henuz implemente yok)
- Dark mode toggle
- Auto-save sistemi
- Dismiss stack (ESC oncelik yonetimi)
- Focus restore (overlay kapanis sonrasi)
- Remotion composition bilesenler (calisan)
- Pipeline step executor'lari (calisan)
- Cost tracking
- Batch job creation
- Rakip istihbarati / Viral skor
- SEO Optimizer
- A/B Testing
- Content Calendar
- Coklu bildirim kanali (Slack/Discord/Telegram/Email)
- Thumbnail designer
- Provider Manager UI (API key yonetimi, fallback siralama)
- Module Manager UI
- Prompt Manager

---

## BOLUM 2: CONTENTMANAGER DETAYLI ANALIZ (UI/UX Odakli)

ContentManager, UI/UX acisindan en olgun repo. Asagida ContentHub'a entegre edilmesi istenen temel kaliplar:

### 2.1 Klavye Navigasyonu Sistemi

ContentManager'da 5 ozel hook'tan olusan kapsamli bir klavye sistemi var:

**a) keyboardStore (Zustand)**
- LIFO scope stack: her klavye navigasyon hook'u benzersiz scope ID alir
- Sadece en ustteki scope olaylari isler
- Overlay acildiginda alt scope'lar otomatik pasif
- Overlay kapandiginda onceki scope otomatik aktif
- Bu sayede is listesi + detay paneli + modal ic ice acildiginda tus catismasi olmaz

**b) useScopedKeyboardNavigation**
- ArrowDown / j: Sonraki oge
- ArrowUp / k: Onceki oge
- Home: Ilk oge
- End: Son oge
- Enter: Detay paneli ac (Sheet)
- Space: Hizli onizleme (QuickLook) ac
- ArrowRight: Akordeon ac
- ArrowLeft: Akordeon kapat
- Escape: Acik paneli kapat
- Guvenlik: input/textarea/select/contenteditable icerisindeyken devre disi
- Guvenlik: IME kompozisyonu, modifier tuslari (Ctrl/Alt/Meta) basili ise devre disi
- Yapilandirma: loop (son ogeden ilk ogeye sarmala), vimKeys (j/k), homeEnd, clampOnMutation

**c) useRovingTabindex**
- WAI ARIA uyumlu: aktif eleman tabIndex=0, diger elemanlar tabIndex=-1
- Klavye ve mouse etkilesimi ayirt edilir
- Klavye: DOM focus() tetiklenir
- Mouse hover: gorsel durum guncellenir ama focus() cagirilmaz
- Bu sayede Tab ile listeye girip ok tuslariyla gezinme mumkun

**d) useDismissStack**
- ESC tusu icin LIFO oncelik yigini
- Oncelik sistemi: yuksek oncelikli callback once calisir
- Cift ESC korunmasi: callback calisirken ikinci ESC engellenir
- Radix Dialog entegrasyonu: defaultPrevented kontrol edilir
- Mikro gorev zamanlama ile React state guncellemelerine uyum

**e) useFocusRestore**
- captureForRestore(): modal/panel acilmadan once aktif elemani kaydet
- restoreFocus(): kapanis sonrasi fokus geri yukle
- restoreFocusDeferred(ms): animasyonlu kapanis icin gecikmeli (100ms)
- DOM dogrulama: hedef eleman hala DOM'da mi kontrol
- Yaris durumu korunmasi: tek zamanlayici garantisi

### 2.2 Sagdan Kayan Detay Paneli (Sheet)

ContentManager'da "JobDetailSheet" olarak adlandirilan bilesen:
- Radix UI Dialog primitive'i uzerine kurulu
- Sagdan iceri kayan, ekranin ~60-70%'ini kaplayan panel
- Slide + fade animasyonlari
- Bolumler: Baslik, Video Player, Ilerleme, Pipeline Adimlari, Canli Loglar, Aksiyon Footer
- Durum bazli aksiyon butonlari (Iptal/Tekrar Dene/Indir/Sil)
- SSE aboneligi ile canli guncelleme (sadece aktif isler icin)
- Enter tusu ile acilir, ESC ile kapanir

**ContentHub'daki mevcut durum:** DetailPanel bilesenleri var (JobDetailPanel, TemplateDetailPanel, SourceDetailPanel vb.) ama bunlar sayfanin sag tarafinda sabit bir div olarak gosteriliyor — kayan panel/sheet/drawer degil. Animasyon yok, overlay yok.

### 2.3 QuickLook (Space ile Hizli Onizleme)

ContentManager'da "JobQuickLook" olarak adlandirilan bilesen:
- Space tusu ile tetiklenen minimalist onizleme modali
- Merkeze konumlanmis, overlay arka planli
- Video player veya durum gostergesi
- Is meta verileri ve durum badge'i
- Hizli aksiyonlar: Senaryo kopyala, Meta kopyala, Indir
- **Space tusu izolasyonu**: Modal acikken Space ic butonlari tetiklemez
  - Capture-phase dinleyici ile Space engelleme
  - Bu sayede Space'e basarak kapatilabilir (tekrar Space = kapat)
- ESC ile kapanis (oncelik=10)
- Backdrop blur ve fade/zoom animasyonlari
- Sheet'e gecis: QuickLook'tan "Detay Gor" ile DetailSheet acilabilir

### 2.4 Toast Bildirim Sistemi

- Zustand tabanli kuyruk
- 4 tip: success (yesil), error (kirmizi), warning (sari), info (mavi)
- 4s otomatik kapanma
- Manuel kapatma
- FIFO davranisi
- Spam onleme: auto-save yuzeylerinde bastirma, islem basina maks 1 toast
- Ekranin sag ust kosesinde yigilma (stack)

### 2.5 Tablo/Liste Yaklasimi

- HTML table yerine ARIA listbox patterni (role="listbox" + role="option")
- aria-selected, aria-setsize, aria-posinset, aria-activedescendant
- Hibrit klavye/mouse: mouse hover fokus senkronize ama DOM focus() cagirmaz
- Responsive grid layout (mobilde gizlenen sutunlar)
- Satir secimi (Enter ile detay ac, Space ile QuickLook ac)

### 2.6 Auto-Save Sistemi

- Alan tipine gore strateji:
  - Toggle/select: anlik kaydet
  - Text/number: blur'da kaydet
  - Textarea: 800ms debounce + blur fallback
- Inline durum gostergeleri: spinner (kaydediyor), onay (kaydedildi), uyari (hata)
- Kullanici tercihi ile acik/kapali
- Kapali oldugunda "Kaydet" butonu gorunur

### 2.7 Iki Asamali Silme Onayi

- Ilk tik: "Emin misiniz?" durumuna gecer (buton kirmizilasir)
- Ikinci tik: gercek silme islemi baslatilir
- Timeout ile ilk asama sifirlanir (kullanici beklerse)

### 2.8 Tema Sistemi

- CSS custom property tabanli dark/light cifte tema
- Gunes/Ay ikonu ile tek tikla gecis
- localStorage'da kalicilik

---

## BOLUM 3: DIGER 3 REPODAN ALINABILECEK OZELLIKLER

### 3.1 YouTubeStoryGenerator'dan

| Ozellik | Aciklama | Oncelik |
|---------|----------|---------|
| **AntiGravity Engine** | Rakip kanal tarama + viral skor hesaplama | Orta |
| **Infinity Mode** | Surekli uretim dongusu | Dusuk |
| **Excel Batch Workflow** | Toplu baslik/hikaye import | Orta |
| **Kanal DNA Profilleri** | Dark Psych, Documentary, Luxury vb. icerik tonu | Orta |
| **Canli TTS Saglayici Secimi** | Runtime'da provider degistirme | Yuksek |
| **AI Thumbnail Uretimi** | KIE.AI + akilli yazi yerlestirme | Orta |
| **Coklu YouTube Hesap** | Birden fazla kanal baglama | Yuksek |
| **Community Post** | YouTube topluluk sekmesine paylasim | Dusuk |

### 3.2 youtube_video_bot'tan

| Ozellik | Aciklama | Oncelik |
|---------|----------|---------|
| **16+ Kategori Bazli Prompt** | Derinlemesine optimize prompt sablonlari | Yuksek |
| **8 Acilis Hook Tipi** | Tekrar onlemeli dinamik acilis cesitliligi | Yuksek |
| **Zeka Modu** | Script'ten otomatik gorsel sayisi tahmini | Orta |
| **Narratif-Uyumlu Gorsel Siralama** | Sahne sirasina gore gorsel prompt uretimi | Yuksek |
| **AI Gorsel Dogrulama** | Gemini Vision ile uretilen gorselin uyumluluk kontrolu | Orta |
| **6 TTS Saglayici + Fallback** | Edge, ElevenLabs, VoysLity, OtomasyonLabs, DubVoice, SpeshAudio | Yuksek |
| **Ses Klonlama** | Kullanicinin kendi sesini klonlama | Orta |
| **Hormozi-Tarz Dinamik Altyazi** | Kelime kelime vurgulanan modern altyazi | Yuksek |
| **4 Altyazi Stili** | Standart, Neon, Altin, Modern, Dinamik | Yuksek |
| **Akilli Thumbnail Pozisyonlama** | Karanlik bolge analizi + gradient overlay | Orta |
| **GPU Hizlandirma (NVENC)** | RTX destek ile hizli render | Dusuk |
| **SSML Duygusal Seslendirme** | Prozodik isaretciler, nefes araliklari | Orta |
| **Batch Uretim** | .txt'den toplu video | Orta |

### 3.3 YTRobot-v3'ten

| Ozellik | Aciklama | Oncelik |
|---------|----------|---------|
| **Rakip Istihbarati** | Kanal tarama, baslik puanlama, yukleme saati heatmap, tag frekans | Orta |
| **A/B Testing** | Video varyantlari, impression/click takibi, CTR | Orta |
| **SEO Optimizer** | Baslik/aciklama/tag analizi, viral skor | Yuksek |
| **5 Thumbnail Sablonu** | Classic, Side Panel, Bold Number, Split, Minimal | Orta |
| **Content Calendar** | idea→planned→in_progress→produced→published | Yuksek |
| **Video Scheduler** | Zamanlanmis YouTube yukleme | Yuksek |
| **Multi-Channel Hub** | Kanal bazli izole config/analytics | Yuksek |
| **Karoke Altyazi** | Whisper + piecewise-linear interpolasyon + per-word karaoke | Yuksek |
| **Wizard Config Mapper** | Quality/platform/subtitle presets, 3 katmanli merge | Orta |
| **Coklu Bildirim Kanali** | Slack/Discord/Telegram/Email/WhatsApp webhook | Orta |
| **Product Review Modulu** | Urun narration + asset cache + format destegi | Orta |
| **Narrative Arc Template** | Hook→Buildup→Climax→Resolution→CTA 5 fazli | Yuksek |
| **Post Processor Zinciri** | Render sonrasi otomatik metadata+publish+analytics+notification | Orta |
| **Retry with Exponential Backoff** | 3 deneme, 2s/6s/18s geri cekilme | Yuksek |

---

## BOLUM 4: ENTEGRASYON ONCELIK MATRISI (BIRLESTIRILMIS)

### KATMAN 1: UI/UX Temelleri (ContentManager'dan — en yuksek oncelik)

Bu katman diger tum ozellikler icin altyapi saglar.

| # | Ozellik | Kaynak | Aciklama |
|---|---------|--------|----------|
| 1 | **Klavye Navigasyon Sistemi** | CM | keyboardStore + useScopedKeyboardNavigation + useRovingTabindex + useDismissStack + useFocusRestore |
| 2 | **Sheet/Drawer (Sagdan Kayan Panel)** | CM | Animated sheet, tum detay panelleri icin |
| 3 | **QuickLook (Space Onizleme)** | CM | Space ile hizli onizleme modali, Space izolasyonu |
| 4 | **Toast/Notification Sistemi** | CM | Zustand kuyruk, 4 tip, spam onleme, stack |
| 5 | **Zustand Store Altyapisi** | CM | Sidebar, modal, wizard, command palette, keyboard state |
| 6 | **Command Palette (Cmd+K)** | CM/CH | CLAUDE.md'de planlanan, henuz yok |
| 7 | **Dark Mode Toggle** | CM | CSS custom property bazli cifte tema |
| 8 | **Iki Asamali Silme Onayi** | CM | Tik→Onayla→Sil |
| 9 | **ARIA Listbox Patterni** | CM | DataTable'i listbox'a donusturme, aria-* nitelikleri |

### KATMAN 2: Pipeline ve Uretim Altyapisi

| # | Ozellik | Kaynak | Aciklama |
|---|---------|--------|----------|
| 10 | **Pipeline Step Executor'lar** | CM+VB | Script, metadata, TTS, visuals, subtitles, composition calisan kodlari |
| 11 | **CacheManager (Adim Cache)** | CM | Tekrar calistirildiginda onceki adimin ciktisini kullanma |
| 12 | **Remotion Composition Templates** | CM | StandardVideo, NewsBulletin, ProductReview Remotion bilesenler |
| 13 | **Lokal Media Server** | CM | Render sirasinda Remotion icin HTTP dosya sunucusu |
| 14 | **Render Ilerleme Takibi** | CM | Frame/encoding SSE ile canli ilerleme |
| 15 | **5 Altyazi Stili** | CM+VB | Standard, Neon, Gold, Minimal, Hormozi/Dinamik |
| 16 | **3 Katmanli Zamanlama** | CM | TTS WordBoundary → Whisper → Esit dagilim fallback |
| 17 | **Cost Tracking** | CM | Provider adim maliyeti tahmini + toplam is maliyeti |
| 18 | **Batch Job Creation** | CM+SG+VB | Toplu konu girisi, sirayla pipeline calistirma |
| 19 | **Ken Burns Efekti** | CM+VB | Statik gorsellerde sinematik zoom/pan |

### KATMAN 3: Provider ve Icerik Zenginlestirme

| # | Ozellik | Kaynak | Aciklama |
|---|---------|--------|----------|
| 20 | **Provider Manager UI** | CM | API key yonetimi, fallback siralama, saglayici secimi |
| 21 | **TTS Coklu Saglayici + Fallback** | VB+YR | Edge, ElevenLabs, OpenAI, SpeshAudio, DubVoice, Qwen3 |
| 22 | **Prompt Manager (Admin)** | CM | Modul bazli script/metadata/narration prompt sablonlari |
| 23 | **Kategori Sistemi (16+ Kategori)** | VB+YR | Icerik tonu profilleri, kategori bazli prompt zenginlestirme |
| 24 | **Acilis Hook Sistemi (8+ Tip)** | CM+VB | Tekrar onlemeli dinamik acilis cesitliligi |
| 25 | **Narration Humanization** | CM | AI metni dogal konusmaya donusturme, prozodik isaretciler |
| 26 | **Narratif-Uyumlu Gorsel Siralama** | VB | Script kronolojisine gore sahne bazli gorsel prompt |
| 27 | **AI Gorsel Dogrulama** | VB | Uretilen gorselin prompt'a uyumluluk kontrolu |
| 28 | **Category-Style Mapping** | CM | Haber kategorisi → bulten gorsel stili esleme |
| 29 | **Module Manager UI** | CM | Modul aktif/pasif, modul bazli konfigrasyon |

### KATMAN 4: Yayinlama ve Analitik

| # | Ozellik | Kaynak | Aciklama |
|---|---------|--------|----------|
| 30 | **Multi-Channel Hub** | YR+SG | Coklu YouTube kanal yonetimi, kanal bazli izolasyon |
| 31 | **Video Scheduler** | YR | Zamanlanmis YouTube yukleme |
| 32 | **SEO Optimizer** | YR | Baslik/aciklama/tag analizi, viral skor |
| 33 | **Content Calendar** | YR | idea→planned→in_progress→produced→published |
| 34 | **A/B Testing** | YR | Video varyantlari, CTR karsilastirma |
| 35 | **Rakip Istihbarati** | SG+YR | Kanal tarama, baslik puanlama, heatmap |
| 36 | **Coklu Bildirim Kanali** | YR | Slack/Discord/Telegram/Email webhook |
| 37 | **Post Processor Zinciri** | YR | Render→metadata→publish→analytics→notification |

### KATMAN 5: Gorsel Uretim ve Thumbnail

| # | Ozellik | Kaynak | Aciklama |
|---|---------|--------|----------|
| 38 | **Thumbnail Designer** | YR+VB+SG | 5+ sablon, akilli pozisyonlama, 3 katmanli metin |
| 39 | **AI Gorsel Uretim Entegrasyonu** | VB+SG | Leonardo.ai + Pollinations + stok kaynak hibritleme |
| 40 | **Leonardo Motion (Gorsel→Video)** | VB | Statik gorsellerden hareketli kisa videolar |
| 41 | **Long-Form / Shorts Dual Format** | CM+VB | 16:9 ve 9:16 format degistirme |
| 42 | **Gorsel Efekt Katmanlari** | VB | Karartma, sis, kivilcim overlay'lari |

### KATMAN 6: Operasyonel Iyilestirmeler

| # | Ozellik | Kaynak | Aciklama |
|---|---------|--------|----------|
| 43 | **Auto-Save Sistemi** | CM | Alan tipine gore kaydetme stratejisi |
| 44 | **Retry with Exponential Backoff** | YR | 3 deneme, exponential geri cekilme |
| 45 | **Canli Log Yayin** | CM | Pipeline log'larini SSE ile terminal tarzi gosterim |
| 46 | **Narrative Arc Template** | YR | 5 fazli anlatim yapisi |
| 47 | **Output Folder Yonetimi** | CM | Cikti klasoru secme + native dosya gezgini acma |
| 48 | **Ses Klonlama** | VB | Kullanicinin kendi sesini klonlama |
| 49 | **SSML Duygusal Seslendirme** | VB | Edge TTS icin prozodik SSML |
| 50 | **Wizard Config Mapper** | YR | Quality/platform/subtitle presets |

---

## BOLUM 5: ONERILEN UYGULAMA PLANI

### Faz 1: UI/UX Temelleri (Oncelik: ACIL)
> ContentManager'in gorsel stili ve etkilesim kaliplari

1. Zustand store altyapisi (keyboard, sidebar, modal, toast, command palette)
2. Klavye navigasyon hook'lari (5 hook)
3. Sheet/Drawer bilesen (tum detay panelleri icin)
4. QuickLook bilesen
5. Toast notification sistemi
6. Command Palette (Cmd+K)
7. Dark mode toggle
8. Iki asamali silme onayi
9. ARIA listbox entegrasyonu (DataTable → listbox)

### Faz 2: Pipeline Calistirma (Oncelik: YUKSEK)
> Calisan bir end-to-end video uretim pipeline'i

10. Step executor'lar (script, metadata, TTS, visuals, subtitles, composition)
11. CacheManager
12. Remotion composition bilesenler
13. Altyazi stilleri + zamanlama
14. Render ilerleme SSE
15. Lokal media server
16. Ken Burns efekti

### Faz 3: Provider ve Icerik (Oncelik: ORTA)
17. Provider Manager UI
18. Coklu TTS provider + fallback
19. Prompt Manager
20. Kategori sistemi
21. Acilis hook sistemi
22. Narration humanization
23. Cost tracking

### Faz 4: Yayinlama ve Ileri Ozellikler (Oncelik: SONRA)
24. Multi-channel hub
25. Video scheduler
26. SEO optimizer
27. Content calendar
28. Thumbnail designer
29. Batch job creation
30. Bildirim kanallari

---

## BOLUM 6: REPO BAZLI KATKI KARSILASTIRMA OZETI

| Repo | En Degerli Katki | ContentHub'a Gore Durum |
|------|------------------|------------------------|
| **ContentManager** | UI/UX kaliplari (klavye, sheet, quicklook, toast, auto-save, ARIA), gorsel stil | ContentHub'in en buyuk eksigi olan etkilesim katmanini tamamliyor |
| **YouTubeStoryGenerator** | AntiGravity rakip analizi, Infinity mode, coklu hesap, AI thumbnail | Otomasyon ve rekabet katmani — ContentHub'da yok |
| **youtube_video_bot** | Kategori bazli prompt, 6 TTS fallback, AI gorsel dogrulama, Hormozi altyazi | Pipeline zenginlestirme — ContentHub'un step executor'lari icin referans |
| **YTRobot-v3** | Multi-channel, A/B test, SEO, content calendar, scheduler, karoke altyazi | Yayinlama ve analitik katmani — ContentHub'un publishing hub'ini tamamliyor |

---

## BOLUM 7: CONTENTHUB'A OZGU USTUNLUKLER (Diger Repolarda Yok)

Bu ozellikler ContentHub'a ozgu olup diger 4 repoda bulunmuyor:

| Ozellik | Aciklama |
|---------|----------|
| **Visibility Engine** | Sayfa/widget/alan bazli server-side gorunurluk kontrolu |
| **Alembic Migration** | Disiplinli schema yonetimi |
| **Source Scan Engine** | Otomatik kaynak tarama motoru |
| **Used News Registry + Deduplikasyon** | Haber tekrar kullanim onleme |
| **Editorial Gate** | News bulletin icin editoryal onay kapisi |
| **Local Whisper Provider** | Harici API gerektirmeyen altyazi |
| **Onboarding Sistemi** | Adim adim baslangic akisi |
| **Audit Log** | Kapsamli degisiklik iz kaydi |
| **Content Library + Asset Library** | Birlestirrilmis icerik ve varlik kutuphanesi |
| **Template-Style Link** | Template ve style blueprint arasi baglanti |
| **Design System (M24)** | Merkezi token + primitif kutuphanesi |
| **ReadOnlyGuard** | Ayar bazli yazma korumasi |

---

## BOLUM 8: SONUC

**En yuksek degerli entegrasyon**: ContentManager'in UI/UX kaliplari (Katman 1). Bu, kullanicinin gunluk deneyimini dogrudan iyilestirir ve diger tum ozelliklerin uzerine insa edilecegi altyapiyi saglar.

**En yuksek uretim degeri**: Pipeline step executor'lari (Katman 2). ContentHub'un job engine altyapisi mevcut ama calisan executor'lar olmadan video uretilemiyor.

**Uzun vadeli rekabet avantaji**: Rakip istihbarati + SEO + A/B testing + Content Calendar (Katman 4). Bunlar ContentHub'u basit bir uretim araci olmaktan cikarip stratejik bir icerik platformuna donusturur.

Onerilen baslangic noktasi: **Faz 1 (UI/UX)** ile **Faz 2 (Pipeline)** paralel yurutulebilir — biri frontend, digeri backend agirlikli.
