# ContentManager Tasarim Sistemi ve UI Analizi

Bu belge, `huskobro/ContentManager` GitHub deposunun frontend mimarisi, tasarim dili, UI/UX kaliplari ve teknik yaklasimlarinin kapsamli bir analizini icermektedir. Hicbir kod kopyalanmamistir; yalnizca mimari ve tasarim kaliplari belgelenmistir.

---

## 1. Genel Tasarim Dili ve Gorsel Stil

### 1.1 Renk Sistemi

ContentManager, HSL tabanli CSS custom property'leri kullanan cifte tema (dark/light) sistemine sahiptir. Tema degiskenleri Shadcn UI uyumluluk standartlarina uygundur.

**Dark Tema (varsayilan):**
- Arka plan: Derin lacivert tonlari (HSL 224 71% 4%)
- On plan: Acik gri/beyaz tonlari
- Kart/popover yuzeyler: Arka plandan biraz daha acik tonlar
- Vurgu renkleri: Muted tonlar

**Light Tema:**
- Arka plan: Beyaza yakin tonlar (HSL 0 0% 98%)
- On plan: Koyu tonlar
- Yuksek kontrast okunabilirlik

**Durum Renkleri (sabit, her iki temada):**
- Kuyrukta (queued): slate-400
- Calisiyor (running): blue-400
- Tamamlandi (completed): emerald-400
- Basarisiz (failed): red-400
- Iptal (cancelled): slate-500

**Modul Renkleri:**
- Standart Video: blue-400
- Haber Bulteni: amber-400
- Urun Inceleme: emerald-400

**Provider Kategori Renkleri:**
- LLM: mor (purple)
- TTS: mavi (blue)
- Gorsel: yesil (emerald)

### 1.2 Tipografi

- Sans-serif: Inter font ailesi
- Monospace: JetBrains Mono / Fira Code (log goruntuleyici ve teknik alanlar icin)
- Font feature settings: Body uzerinde iyilestirilmis render icin aktif

### 1.3 Bosluk ve Layout

- Sayfa ici padding: `p-4` (mobil), `p-6` (masaustu)
- Responsive grid: 2x2 (mobil) ile 4 sutunlu grid (masaustu) arasinda gecis
- Sidebar genisligi: 60px (daraltilmis) / 220px (acik)
- Gecis animasyonu: `transition-all duration-200` (tum layout gecisleri icin)

### 1.4 Border Radius

CSS custom property tabanli olceklenebilir yaricap sistemi:
- `lg`, `md`, `sm` varyantlari mevcut
- Varsayilan border-radius: 0.5rem

### 1.5 Scrollbar Stili

Ozel scrollbar gorunumu:
- Genislik: 6px
- Thumb rengi: border rengine eslestirilmis
- Hover efekti ile interaktif

---

## 2. Klavye Navigasyonu ve Kisayollar

ContentManager'in en guclu ve detayli tasarim kaliplarinden biri klavye navigasyon sistemidir.

### 2.1 Scope Stack Mimarisi (keyboardStore)

Zustand tabanli merkezi bir LIFO (son giren ilk cikar) yigin sistemi uygulanmistir:
- Her klavye navigasyon hook'u benzersiz bir scope ID alir (`kbnav-{sayac}`)
- Yalnizca yiginin en ustundeki scope olaylari isler
- Bir overlay acildiginda alt scope'lar otomatik olarak pasif olur
- Overlay kapandiginda onceki scope otomatik olarak yeniden aktif olur

Bu yaklasim, ic ice modal/panel/liste senaryolarinda olay catismalarini onler.

### 2.2 useScopedKeyboardNavigation

Ana klavye navigasyon hook'u su tuslari destekler:

| Tus | Aksiyon |
|-----|---------|
| ArrowDown / j | Sonraki oge |
| ArrowUp / k | Onceki oge |
| Home | Ilk oge |
| End | Son oge |
| Enter | Detay paneli ac |
| Space | Hizli onizleme (QuickLook) ac |
| ArrowRight | Akordeon ac |
| ArrowLeft | Akordeon kapat |
| Escape | Acik paneli kapat |

**Guvenlik Kosullari (tus basimi yok sayilir):**
- Scope aktif degilse
- `event.defaultPrevented` true ise
- IME kompozisyonu aktifse (`isComposing`)
- Modifier tuslari basili ise (Meta, Ctrl, Alt)
- Hedef input, textarea, select veya contenteditable ise
- Hedef ARIA rolleri: textbox, combobox, listbox, spinbutton, searchbox

**Yapilandirma Secenekleri:**
- `loop`: Son ogeden ilk ogeye sarmala
- `vimKeys`: j/k Vim tarzinda navigasyon
- `homeEnd`: Home/End tuslari (varsayilan: true)
- `clampOnMutation`: Veri degisikliklerinde fokus koruma vs. sifirlama
- `scrollRef`: Scroll-into-view icin konteyner referansi

### 2.3 useRovingTabindex

WAI ARIA Authoring Practices Guide'a uygun roving tabindex patterni:
- Aktif eleman `tabIndex={0}` alir (Tab ile odaklanilabilir)
- Diger elemanlar `tabIndex={-1}` alir (Tab ile atlanir)
- Klavye navigasyonu ve mouse hover ayirt edilir
- Klavye navigasyonu: DOM `focus()` tetiklenir
- Mouse hover: Gorsel durum guncellenir ama `focus()` cagirilmaz

### 2.4 useDismissStack

ESC tusu yonetimi icin LIFO yigin patterni:
- Oncelik sistemi: Yuksek oncelikli callback'ler once calisir
- Radix Dialog entegrasyonu: `defaultPrevented` saygiyla karsilanir
- Cift ESC korunmasi: Callback calisirken ikinci ESC engellenir
- Mikro gorev zamanlama ile React state guncellemelerine uyum

### 2.5 useFocusRestore

Overlay kapanis sonrasi fokus geri yukleme:
- `captureForRestore()`: Modal acilmadan once aktif elemani kaydet
- `restoreFocus()`: Kapanis sonrasi fokus geri yukle
- `restoreFocusDeferred(ms)`: Animasyonlu kapanislar icin gecikmeli geri yukleme (varsayilan 100ms)
- DOM dogrulama: Hedef eleman hala DOM'da mi kontrol edilir
- Yaris durumu korunmasi: Tek zamanlayici garantisi

---

## 3. Panel ve Detay Goruntuleme Kaliplari

### 3.1 JobDetailSheet (Sag Kayar Panel)

Radix UI Dialog primitive'i uzerine kurulu sagdan kayan detay paneli:
- `@radix-ui/react-dialog` tabanli "sheet" efekti
- Slide ve fade animasyonlari (Tailwind)
- Bolumler: Baslik, Video Player, Ilerleme, Pipeline Adimlari, Canli Loglar, Aksiyon Footer
- Durum bazli aksiyon butonlari (Iptal/Tekrar Dene/Indir/Sil)
- SSE aboneligi ile canli guncelleme (sadece aktif isler icin)

### 3.2 JobQuickLook (Hizli Onizleme Modal)

Space tusu ile tetiklenen minimalist onizleme modali:
- Video player veya durum gostergesi
- Is meta verileri ve durum badge'i
- Hizli aksiyonlar: Senaryo kopyala, Meta kopyala, Indir
- Space tusu izolasyonu: Modal acikken Space ic butonlari tetiklemez
- Capture-phase dinleyici ile Space engelleme
- ESC ile kapanis (oncelik=10)
- Backdrop blur ve fade/zoom animasyonlari

### 3.3 Tam Sayfa JobDetail

Kapsamli is izleme sayfasi su bolumleri icerir:
- Baslik ve durum header'i
- Genel ilerleme cubugu
- Hata gosterimi
- Cikti yolu (Finder/Explorer'da ac)
- Maliyet ozeti
- Publishing Hub karti (coklu platform durumu)
- Pipeline adimlari listesi (canli sureler ile)
- Render ilerleme widget'i (faz etiketleri, frame sayaclari, ETA)
- Canli log goruntuleyici (terminal tarzi)

---

## 4. Diger Onemli UI/UX Ozellikleri

### 4.1 Toast Bildirim Sistemi

Zustand tabanli kuyruk sistemi:
- 4 tip: success (yesil), error (kirmizi), warning (sari), info (mavi)
- Varsayilan sure: 4 saniye otomatik kapanma
- Manuel kapatma olanagi
- FIFO davranisi
- Spam onleme kurallari:
  - Auto-save yuzeylerinde toast bastirma
  - Her islem maksimum 1 toast uretir
  - Baglanti hatalari tekrarsiz

### 4.2 Animasyonlar ve Gecisler

- `slide-in-from-bottom`: Asagidan yukari kayma + fade (0.2s)
- `step-glow`: Ilerleme gostergelerinde nabiz atan golge efekti (1.5s dongu)
- Sidebar genisletme/daraltma: `transition-all duration-200`
- Modal/sheet acilis/kapanis: Fade ve slide animasyonlari
- Loading spinner: `animate-spin` (Loader2 ikonu)
- Ilerleme cubugu: Dinamik genislik animasyonu

### 4.3 Auto-Save Sistemi

`useAutoSave` hook'u ile alan tipine gore kaydetme stratejisi:
- **Anlik**: Toggle, select, radio degisikliklerinde hemen kaydet
- **Blur**: Text, textarea, password, number alanlari odak kaybinda kaydet
- **Debounce**: 800ms gecikme ile text/textarea (blur fallback ile)
- Kullanici tercihi ile acik/kapali gecilebilir
- Kapali oldugunda manuel "Kaydet" butonu gorunur
- Inline durum gostergeleri: Spinner (kaydediyor), onay isareti (kaydedildi), uyari (hata)

### 4.4 Tema Degistirme

- Header'da Gunes/Ay ikonu ile tek tikla gecis
- `class` stratejisi: `<html class="dark">` ile tema uygulama
- localStorage'da kalicilik
- CSS custom property'leri ile anlik gecis

### 4.5 Admin PIN Modali

- Basit 4-8 haneli PIN dogrulamasi
- Sifre maskeleme
- Basarisiz giris gostergesi (destructive border/ring)
- localStorage'dan PIN okuma (varsayilan "0000")
- Basarili giriste admin paneline yonlendirme

### 4.6 SSE (Server-Sent Events) Entegrasyonu

- Polling yerine push-tabanli canli guncellemeler
- Olay tipleri: job_status, step_update, log, render_progress, upload_progress, publish_progress, heartbeat, complete, error
- Otomatik yeniden baglanti (EventSource)
- Global stream (Dashboard/JobList icin) ve bireysel is stream'leri

---

## 5. Bilesen Mimarisi ve Yeniden Kullanilabilir Kaliplar

### 5.1 Layout Bilesenler

**AppShell:** Tum sayfa duzeninin ana kapsayicisi
- Mod tabanli (user/admin) sidebar ve header
- Responsive margin ayarlamasi (sidebar durumuna gore)
- React Router Outlet ile ic icerik gosterimi
- Turkce sayfa basliklari haritalamasi

**Sidebar:** Cift modlu navigasyon
- User modu: 4 navigasyon ogesi
- Admin modu: 8 navigasyon ogesi
- Masaustu: Sabit genislik, daraltilabilir
- Mobil: Slide-in drawer + overlay backdrop
- Aktif durum stili: `bg-primary/10 text-primary font-medium`
- Hover durumu: `hover:bg-sidebar-accent`

**Header:** Yapisan ust cubuk
- Hamburger menu (sadece mobil)
- Dinamik sayfa basligi
- Admin modu badge'i
- Tema degistirme butonu
- Admin erisim/kilitleme butonu

### 5.2 Is (Job) Bilesenler

- **JobDetailSheet**: Sagdan kayan tam detay paneli
- **JobQuickLook**: Space ile acilan hizli onizleme modali
- **SheetStepRow**: Pipeline adim satiri (durum ikonu, sure, maliyet)
- **SheetRenderProgress**: Canli render ilerleme gostergesi
- **SheetLogViewer**: Terminal tarzi log goruntuleyici

### 5.3 Form Kaliplari

- **AdminSettingRow**: Tip bazli ayar satiri (toggle/select/text/number/password/path/array/multiselect)
- **PromptEditor**: Prompt duzenleme alani (dirty state, kaydetme durumu)
- **CategoryEditor**: Genisletilebilir satir ile kategori duzenleme
- **HookEditor**: Daraltilabilir iki dilli kanca duzenleyici
- **SourceForm**: Yeniden kullanilabilir haber kaynagi formu (yeni/duzenleme modlari)
- **MappingForm**: Kategori-stil eslestirme formu

### 5.4 Durum Gosterge Kaliplari

- Renkli badge'ler (durum, modul, platform)
- Ilerleme cubuklari (renk kodlu)
- Ikon tabanli durum gostergeleri (saat, spinner, onay, capraz, ok)
- "Stale" uyarisi (5 dakikayi asan adimlar icin)
- Cache badge'leri (onbelleklenenmis adimlar icin)

---

## 6. Tablo, Filtre ve Form Kaliplari

### 6.1 Tablo / Liste Yaklasimi

ContentManager klasik `<table>` HTML elemani yerine **ARIA listbox patterni** ile ozel liste satiri yaklasimi kullanir:

- `role="listbox"` ile ana konteyner
- `role="option"` ile her satir
- `aria-selected`, `aria-setsize`, `aria-posinset` nitelikleri
- `aria-activedescendant` ile fokus takibi
- Responsive grid layout (mobilde gizlenen sutunlar)

**Satir icerigi:**
- Baslik, modul ikonu, ilerleme cubugu, durum badge'i, tarih/saat
- Masaustunde: Cok sutunlu layout
- Mobilde: Tek sutun, kisaltilmis bilgi

### 6.2 Filtreleme Sistemi

- Durum filtresi: Tumunu, kuyrukta, calisiyor, tamamlandi, basarisiz
- Modul filtresi: Standart Video, Haber Bulteni, Urun Inceleme, Tum Moduller
- Platform filtresi (PlatformAccountManager'da)
- Filtre degisikligi sayfalama ve fokusu sifirlar

### 6.3 Sayfalama

- Sayfa basi oge sayisi: 15 (kullanici) / 20 (admin)
- Onceki/Sonraki buton navigasyonu
- Sayfa numarasi gostergesi

### 6.4 Form Desenleri

**Video Olusturma Formu (CreateVideo):**
- Cok adimli is akisi: Modul Secimi > Toplu Konu Girisi > Format/Dil > Module Ozel Alanlar > Yayin Ayarlari > Gonderim
- Modul secim kartlari: 3 sutunlu grid, kosula bagli renklendirme
- Toggle gruplari: Animasyonlu gosterge ile ozellik etkinlestirme
- Gruplu ayar bolumleri: Yuvarlatilmis kenarlk konteynerler, ikon etiketleri
- Textarea ayristirma: Satir bazli coklu konu girisi
- Toplu gonderim: Sirasal is olusturma (150ms gecikme, SQLite kilitleme onleme)

**Ayarlar Formu (GlobalSettings):**
- Sema tabanli UI: 5 ayar kategorisi
- 8 farkli input tipi (toggle, select, number, password, text, path, array, multiselect)
- Kilit mekanizmasi: Kilitli ayarlar icin kilit ikonu ve devre disi durum
- Bos deger islemesi: Bos/bosluk > ayari sil (varsayilana don)
- Klasor secici: Breadcrumb navigasyonu, ust dizin gezinme, Finder/Explorer entegrasyonu

**CRUD Kaliplari (NewsSourceManager, CategoryStyleMapping):**
- Inline duzenleme (modal degil, satir ici form)
- Iki asamali silme onaylama
- Form dogrulamasi (bos alan, URL formati)
- Yukleme durumu spinner'lari (butonlar uzerinde)
- Bos durum bilesenler (ilk kayit ekleme tesvik)

---

## 7. Tema Sistemi

### 7.1 Uygulama Yontemi

- Tailwind CSS `class` stratejisi ile dark mode
- `<html class="dark">` ile tema uygulama
- CSS custom property'leri (HSL tabanli) ile renk tanimlamalari
- `:root` (light) ve `.dark` (dark) kapsami

### 7.2 Tema Degiskenleri

Her iki tema icin tanimli degiskenler:
- `--background`, `--foreground`
- `--card`, `--card-foreground`
- `--popover`, `--popover-foreground`
- `--primary`, `--primary-foreground`
- `--secondary`, `--secondary-foreground`
- `--muted`, `--muted-foreground`
- `--accent`, `--accent-foreground`
- `--destructive`, `--destructive-foreground`
- `--border`, `--input`, `--ring`
- `--sidebar-*` (sidebar'a ozel renkler)

### 7.3 Tema State Yonetimi

- Zustand uiStore'da `theme` state'i
- `toggleTheme()` ile gecis
- `setTheme()` ile DOM uygulama ve localStorage kalicilik
- Header'da Gunes/Ay ikonu ile gorsel gecis

---

## 8. Navigasyon Kaliplari

### 8.1 Sidebar Navigasyonu

- Mod tabanli navigasyon ogesi degisimi (user: 4, admin: 8 oge)
- Lucide-react ikonlari (18px standart boyut)
- Aktif rota vurgulama
- Daraltma/genisletme (sadece masaustu)
- Mobil drawer modu (overlay backdrop ile)
- "CM" logo butonu ile ana sayfaya donme
- Mod gosterge etiketi (Admin Paneli / Icerik Uretimi)
- User modundan admin paneline erisim linki

### 8.2 React Router Yapisi

**User Rotalar:**
- `/dashboard` - Ana pano
- `/create` - Video olusturma
- `/jobs` - Is listesi
- `/jobs/:jobId` - Is detayi
- `/settings` - Kullanici ayarlari

**Admin Rotalar:**
- `/admin/dashboard` - Admin panosu
- `/admin/global-settings` - Sistem yapilandirmasi
- `/admin/modules` - Modul yonetimi
- `/admin/providers` - Provider yapilandirmasi
- `/admin/jobs` - Is yonetimi
- `/admin/cost-tracker` - Maliyet izleme
- `/admin/prompts` - Prompt yonetimi
- `/admin/channels` - Kanal yonetimi
- `/admin/platform-accounts` - Platform hesaplari
- Legacy yonlendirmeleri (news-sources, category-style-mappings > modules)

**Ozel Rotalar:**
- `/oauth/callback` - OAuth donus noktasi (AppShell disinda)

### 8.3 Breadcrumb / Tab Navigasyonu

- Acik breadcrumb navigasyonu yok; sayfa basliklari AppShell'de rota haritalamasi ile saglanir
- Tab navigasyonu: PromptManager'da 3 sekme (Modul Promptlari, Kategoriler, Acilis Kanclari)

---

## 9. Bagimlilk Ozeti

### 9.1 UI Kutuphaneler

| Kutuphane | Amac |
|-----------|------|
| Radix UI (11 bilesen) | Headless UI primitive'leri (dialog, dropdown, select, toast, tooltip, vb.) |
| Lucide React | Ikon kutuphanesi |
| class-variance-authority | Bilesen varyant yonetimi |
| clsx + tailwind-merge | Kosula bagli CSS sinif birlestirme |
| Tailwind CSS 3.4 | Utility-first CSS framework |

### 9.2 State Yonetimi

| Kutuphane | Amac |
|-----------|------|
| Zustand 5.0 | Client-side state yonetimi |
| Zustand persist | localStorage senkronizasyonu |

### 9.3 Routing

| Kutuphane | Amac |
|-----------|------|
| React Router DOM 6.27 | Sayfa yonlendirme |

### 9.4 Veri Getirme

- Native `fetch` API sarmalayicisi (harici HTTP kutuphanesi yok)
- SSE icin native `EventSource` API
- React Query kullanilmiyor (ContentHub'dan farkli olarak)

---

## 10. ContentHub ile Karsilastirma ve Uygulanabilir Kaliplar

### 10.1 ContentHub'da Zaten Mevcut Olanlar
- Zustand state yonetimi
- React Router yapisi
- Tailwind CSS tabanli stil
- Dark/light tema destegi
- Sidebar navigasyonu
- SSE entegrasyonu

### 10.2 ContentManager'dan Alinabilecek Ilham Noktalari

**Klavye Navigasyonu (Yuksek Oncelik):**
- Scope stack mimarisi (keyboardStore) -- catismasiz klavye yonetimi
- useScopedKeyboardNavigation -- kapsamli liste navigasyonu
- useRovingTabindex -- erisebilir tabindex yonetimi
- useDismissStack -- ESC tusu oncelik yonetimi
- useFocusRestore -- overlay kapanis fokus geri yukleme

**Panel Kaliplari (Yuksek Oncelik):**
- Sagdan kayan detay paneli (JobDetailSheet)
- Space ile hizli onizleme modali (JobQuickLook)
- Space tusu izolasyonu (acik modalde ic butonlari tetiklememe)

**Form ve Ayar Kaliplari (Orta Oncelik):**
- Tip bazli auto-save sistemi (useAutoSave)
- Inline duzenleme patterni (modal yerine satir ici form)
- Iki asamali silme onaylama
- Kilit mekanizmasi (admin tarafindan kilitlenebilir ayarlar)
- Klasor secici dialog

**Liste/Tablo Kaliplari (Orta Oncelik):**
- ARIA listbox patterni (role="listbox" + role="option")
- Hibrit klavye/mouse etkilesim (hover = fokus senkronizasyonu)
- Durum bazli aksiyon butonlari

**Toast Sistemi (Dusuk Oncelik -- ContentHub'da zaten mevcut):**
- Spam onleme kurallari
- Auto-save yuzeylerinde inline gostergeler (toast yerine)

---

## 11. Mimari Kararlar Ozeti

ContentManager'in mimari kararlarinda onemli noktalar:

1. **Shadcn "copy-own" patterni**: Radix UI headless bilesenlerini sarilarak tam ozellestirme kontrolu saglanir
2. **Native fetch (kutuphane yok)**: Axios veya ky gibi HTTP kutuphaneleri yerine native fetch wrapper
3. **React Query yok**: Zustand store'lar + manuel fetch + SSE ile state yonetimi (ContentHub'dan farkli)
4. **Mod tabanli AppShell**: Tek layout bileseninde user/admin mod gecisi
5. **Turkce UI**: Tum etiketler ve mesajlar Turkce (i18n altyapisi yok, sabit stringler)
6. **PIN tabanli admin erisim**: Basit localStorage PIN dogrulamasi
7. **5 katmanli ayar cozumleme**: Global > Admin > Modul > Provider > Kullanici oncelik sirasi
8. **Provider fallback zinciri**: Basarisiz provider'da siradaki otomatik deneme

---

## 12. Sonuc

ContentManager, localhost-first bir video uretim platformu olarak olgun bir frontend mimarisine sahiptir. En guclu yonleri sunlardir:

1. **Klavye navigasyonu**: Scope stack + roving tabindex + dismiss stack ile profesyonel duzeyde erisebilirlik
2. **Panel sistemi**: Sagdan kayan sheet + Space ile hizli onizleme kaliplari
3. **Auto-save**: Alan tipine ozel kaydetme stratejileri
4. **SSE entegrasyonu**: Polling olmadan canli guncellemeler
5. **Tema sistemi**: CSS custom property tabanli cifte tema

ContentHub projesi icin bu kaliplarin adaptasyonu, ozellikle klavye navigasyonu, panel sistemi ve auto-save mekanizmalari acisindan yuksek deger katacaktir.
