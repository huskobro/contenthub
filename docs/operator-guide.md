# ContentHub — Operator Rehberi

Bu rehber ContentHub'i kurmak, calistirmak ve yonetmek icin gereken adimlari kapsar.

---

## 1. Sistem Gereksinimleri

| Gereksinim | Minimum |
|------------|---------|
| Python | 3.9+ |
| Node.js | 18+ |
| Disk alani | 2 GB (DB + workspace artifacts) |
| RAM | 2 GB |
| OS | macOS / Linux |

---

## 2. Ilk Kurulum

### 2.1 Depoyu Klonla

```bash
git clone <repo-url> ContentHub
cd ContentHub
```

### 2.2 Backend Kurulumu

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

### 2.3 Ortam Degiskenleri

```bash
cp .env.example .env
```

`.env` dosyasini acin ve su degerleri doldurun:

| Degisken | Zorunluluk | Aciklama |
|----------|-----------|----------|
| `CONTENTHUB_JWT_SECRET` | **Zorunlu** | JWT imzalama anahtari. `openssl rand -hex 32` ile olusturun |
| `CONTENTHUB_KIE_AI_API_KEY` | **Zorunlu** | Kie.ai / Gemini API anahtari (icerik uretimi) |
| `CONTENTHUB_PEXELS_API_KEY` | **Zorunlu** | Pexels API anahtari (gorsel saglayici) |
| `CONTENTHUB_PIXABAY_API_KEY` | Opsiyonel | Pixabay API anahtari (yedek gorsel saglayici) |
| `CONTENTHUB_OPENAI_API_KEY` | Opsiyonel | OpenAI uyumlu API anahtari (yedek LLM) |
| `CONTENTHUB_DEBUG` | Opsiyonel | `true` = detayli log. Production'da `false` birakin |

### 2.4 Veritabani Migration

```bash
cd backend
source .venv/bin/activate
.venv/bin/python -m alembic upgrade head
```

Bu komut SQLite veritabanini `backend/data/contenthub.db` yolunda olusturur ve tum migration'lari uygular (head: `phase_al_001`).

Seeding (admin kullanici, KNOWN_SETTINGS, prompt bloklari, wizard configs,
product_review blueprint'leri) ilk `uvicorn app.main:app` boot'unda
**otomatik** olarak lifespan handler icinde calisir — ayri bir seed
komutu yoktur. Ilk admin bilgisi: `admin@contenthub.local` / `admin123`
(hemen degistirin). NULL password_hash drift durumunda `seed_admin_user`
otomatik backfill yapar.

> **Not:** `backend/data/contenthub.db` ve `backend/workspace/` git-ignored'dir (runtime-only). Kaynak kontrolune eklemeyin. Detay: `docs/RUNTIME_AND_STORAGE_POLICY.md`.

**Yedekleme / geri alma (Faz 3):**
```bash
cd backend
python scripts/backup_db.py                          # canli DB snapshot al (backend acik olabilir)
python scripts/restore_db.py --list                  # snapshot listesi
# Geri yukleme DESTRUKTIF — once backend'i durdurun (start.sh Ctrl+C):
python scripts/restore_db.py <snapshot.db> --confirm # eski DB .replaced_<ts> olarak yanda tutulur
```


### 2.5 Frontend Kurulumu

```bash
cd frontend
npm install
```

---

## 3. Sistemi Baslatma

### Hizli Baslatma (Tek Komut)

```bash
./start.sh
```

Bu script:
- Backend'i `http://localhost:8000` adresinde baslatir
- Frontend'i `http://localhost:5173` adresinde baslatir
- Ctrl+C ile her ikisini de kapatir

### Manuel Baslatma

**Terminal 1 — Backend:**
```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --port 8000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

### Startup Sirasinda Olan Islemler

Uygulama basladiginda otomatik olarak:
1. Veritabani tablolari kontrol edilir
2. WAL checkpoint yapilir
3. Takilmis job'lar kurtarilir (running > 5dk → failed, queued > 30dk → loglanir)
4. Icerik modulleri kaydedilir (standard_video, news_bulletin)
5. Ayarlar seed edilir (KNOWN_SETTINGS)
6. Prompt bloklari seed edilir
7. Admin kullanici seed edilir
8. Wizard yapilandirmalari seed edilir
9. Provider'lar kaydedilir (LLM, TTS, Visuals, Whisper)
10. Arka plan zamanlayicilari baslatilir

---

## 4. Ilk Admin Girisi

Sistem ilk baslatildiginda bir admin kullanici otomatik olusturulur:

- **Email:** `admin@contenthub.local`
- **Sifre:** Seed fonksiyonunda tanimli varsayilan sifre

Giris yapildiktan sonra:
1. Admin paneline yonlendirilirsiniz (`/admin`)
2. Ilk is olarak **Ayarlar** sayfasindan API anahtarlarini dogrulayin
3. **Kullanici Yonetimi** sayfasindan ek kullanicilar olusturun

---

## 5. YouTube Baglantisi Kurulumu

YouTube publish ozelligi icin OAuth baglantisi gereklidir:

1. [Google Cloud Console](https://console.cloud.google.com)'da bir proje olusturun
2. YouTube Data API v3'u etkinlestirin
3. OAuth 2.0 istemci kimlik bilgileri olusturun
4. Redirect URI olarak `http://localhost:8000/api/v1/publish/youtube/auth-callback` ekleyin
5. Admin panelde **Baglanti Merkezi** (`/admin/connections`) sayfasina gidin
6. YouTube Client ID ve Client Secret'i girin
7. "Baglan" butonuyla OAuth akisini tamamlayin

---

## 6. Temel Akislar

### Icerik Olusturma (Standard Video)

1. Kullanici panelinde **Video Olustur** secenegiyle wizard'i baslatın
2. Konu, dil, sure gibi parametreleri girin
3. Wizard adimlari sirayla icerik uretir: Script → Metadata → TTS → Altyazi → Kompozisyon → Render
4. Is tamamlandiginda bildirim gelir ve draft publish kaydi olusur

### Icerik Olusturma (Haber Bulteni)

1. Haber kaynaklari ekleyin (**Kaynaklar** sayfasi)
2. Kaynak taramasi calistirin (manuel veya otomatik)
3. **Bulten Olustur** wizard'iyla haber secimi ve uretim adimlarina gecin
4. Uretim sonrasi draft publish kaydi olusur

### Yayinlama

1. **Yayin Merkezi** sayfasindan draft kaydi inceleyin
2. Onay icin gonderin (draft → pending_review → approved)
3. Onaylanan kaydi yayinlayin veya planlayin
4. Yayin durumu takip edilir (publishing → published veya failed)

---

## 7. Yedekleme ve Geri Yukleme

### Ne Yedeklenmeli

ContentHub tum kalici verisini iki yerde tutar:

| Konum | Icerik | Yedek Onceligi |
|-------|--------|----------------|
| `backend/data/contenthub.db` (+ `-wal`, `-shm`) | Veritabani (tum kayitlar, ayarlar, kullanicilar, jobs, publish records, audit log) | **Kritik** |
| `backend/workspace/users/<slug>/jobs/<job_id>/artifacts/` | Is artifact'lari (audio, video, script, metadata) — PHASE X sonrasi user-scoped | Yuksek |
| `backend/workspace/users/<slug>/exports/` | Kullanici export dosyalari | Yuksek |
| `.env` | Secrets (JWT, API keys) | **Kritik** (ayri, sifreli saklayin) |

### Guvenli Yedekleme (Onerilen Yontem — hot backup)

SQLite `.backup` komutu WAL'i dondurmaz, transaction-consistent bir kopya
olusturur — sistem calisirken guvenle yedek alinabilir:

```bash
mkdir -p backup
sqlite3 backend/data/contenthub.db ".backup backup/contenthub-$(date +%Y%m%d-%H%M%S).db"
```

Workspace icin rsync (atomic, inkremental):

```bash
rsync -a --delete backend/workspace/ backup/workspace-$(date +%Y%m%d)/
```

### Basit Yedekleme (sistem kapaliken — cold backup)

Eger sistem kapali ise dogrudan `cp` yeterlidir. **WAL dosyalarini mutlaka
beraber alin**, yoksa son yazilanlar kaybolur:

```bash
# Sistemi durdurun (Ctrl+C veya kill)
cp backend/data/contenthub.db{,-wal,-shm} backup/$(date +%Y%m%d)/
cp -r backend/workspace/ backup/$(date +%Y%m%d)/workspace/
```

### Migration Oncesi Akis

Yeni bir surum veya schema migration uygulamadan once:

```bash
# 1. Sistemi durdurun
# 2. Hot backup (yukaridaki .backup komutu)
# 3. Migration'i uygulayin
cd backend && .venv/bin/alembic upgrade head
# 4. Alembic loglarini kontrol edin (hata varsa dogrudan restore edin)
# 5. Sistemi baslatin — startup recovery stale job'lari temizler
```

Alembic `downgrade` komutu **yalnizca migration scripti dogru yazilmis ise**
guvenlidir. Super onemli / geri donusu olmayan migration'lardan once her
zaman hot backup alin.

### Geri Yukleme

```bash
# 1. Sistemi durdurun
# 2. Mevcut bozuk DB'yi yedekleyin (forensic icin)
mv backend/data/contenthub.db backend/data/contenthub.db.broken-$(date +%Y%m%d)
# 3. Backup'i yerine koyun (WAL dosyalari dahil)
cp backup/contenthub-TARIH.db backend/data/contenthub.db
# 4. Workspace'i restore edin
rsync -a backup/workspace-TARIH/ backend/workspace/
# 5. Sistemi baslatin
./start.sh
```

**Restore sonrasi otomatik davranislar:**
- Startup recovery scan'i devreye girer (5 dk'dan eski `running` job'lar
  `failed` olarak isaretlenir — `C-07 / P-008`).
- Stale queued job'lar loglanir (30 dk'dan eski) — operator manuel incelemeli.
- WAL checkpoint otomatik calisir.
- Seed'ler idempotent — mevcut veriyi degistirmez.

**Onemli:** WAL dosyalari (`-wal`, `-shm`) DB ile birlikte tasinmalidir. Yalniz
`.db` dosyasini kopyalamak son yazilmamis transaction'lari kaybedebilir.

---

## 8. Guveli Kapatma ve Yeniden Baslatma

### Kapatma

```bash
# start.sh ile baslatildiysa:
Ctrl+C

# Manuel baslatildiysa:
# Backend PID'ini bulun ve kill gonderin
kill <backend_pid>
```

Kapatma sirasinda:
- Arka plan zamanlayicilari iptal edilir
- Devam eden isler durur (yeniden baslatmada kurtarilir)

### Yeniden Baslatma

Yeniden baslatmada:
- Takilmis running job'lar otomatik olarak **failed** durumuna alinir
- Takilmis queued job'lar loglanir (operator incelemesi onerisi)
- Tum seed'ler idempotent olarak calisir (mevcut veriyi degistirmez)

---

## 9. Sorun Giderme

### Takilmis Isler

**Belirti:** Bir is "running" durumunda kaliyor.

**Cozum:**
- Sistemi yeniden baslatin — startup recovery 5 dakikadan eski running job'lari otomatik fail eder
- Admin panelde **Isler** sayfasindan is detayini inceleyin
- Hata mesajini ve son adimi kontrol edin

### Bildirim Gelmemesi

**Belirti:** Is tamamlandi ama bildirim yok.

**Kontrol:**
- Bildirim zamanlayicisi calisıyor mu (startup loglarinda gorulur)
- SSE baglantisi acik mi (tarayici konsolunu kontrol edin)
- Bildirim merkezi simgesine tiklayin

### Baglanti Sorunlari

**Belirti:** YouTube publish basarisiz.

**Kontrol:**
- Admin panelde **Baglanti Merkezi** sayfasinda baglanti durumunu kontrol edin
- OAuth token'in gecerliligini kontrol edin
- Publish log'larini inceleyin (**Yayin Merkezi** → kayit detayi)

### Provider Hatalari (Faz 4 — hata okunabilirligi)

Faz 4'ten itibaren her provider hatasi **type + mesaj + last-error** formatinda Job Detail > Provider Trace'e dusuyor. Eskiden "görsel bulunamadi" gibi generic mesajlar goruluyordu; artik "openverse: HTTPError 401 invalid api key" gibi direkt sebep goruluyor.

**Belirti:** Visuals adimi tum sahnelerde fail, mesaj "Tum sahneler icin gorsel bulunamadi".

**Kontrol sirasi:**
1. Job Detail > Provider Trace panelini acin. `provider_failures` ve `provider_last_error` alanlarini okuyun.
2. `401 / 403 / invalid api key` → **Ayarlar > Kimlik Bilgileri** sekmesinden ilgili provider anahtarini guncelleyin, **Dogrula** butonuna basin.
3. `TimeoutException / ConnectError` → ag / DNS / firewall kontrolu; provider endpoint'i localhost'tan erisilebilir mi?
4. `RateLimitError / 429` → saglayici kotasi; kisa sure bekleyip **Retry** edin veya fallback provider'i **Ayarlar > Modul Ayarlari > visuals.provider_chain** ile etkinlestirin.
5. `NonRetryableProviderError` → provider hesabi / plan problemi; uygulama auto-fallback yapmaz (tasarim: yanlis ses/tarz yerine fail).

**TTS icin ayni runbook:** `strict_resolution.py` Faz 4'te `type(exc).__name__ + str(exc)` formatini zorunlu yapti. Provider health registry'de ayni okunabilir format goruluyor.

**Genel pipeline:** bekleenmeyen exception'lar artik `Unexpected error in step 'X': ValueError: ... ← OriginalCause` seklinde Job Detail'e yaziliyor. `<<` oku tipindeki cause zinciri chained exception'lari bozmadan gosterir.

### Kaynak Tarama Basarisiz

**Belirti:** RSS kaynaklari taranmiyor.

**Kontrol:**
- Kaynak durumunu **Kaynaklar** sayfasindan kontrol edin
- Feed URL'inin erisilebilir oldugunu dogrulayin
- Tarama gecmisini **Kaynak Taramalari** sayfasindan inceleyin

### Veritabani Sorunlari

**Belirti:** Uygulama baslamiyor veya 500 hatasi veriyor.

**Kontrol:**
```bash
cd backend
source .venv/bin/activate
# Migration durumunu kontrol edin
.venv/bin/python -m alembic current
# Varsa bekleyen migration'lari uygulatin
.venv/bin/python -m alembic upgrade head
```

---

## 10. Arkaplan Zamanlayicilari

| Zamanlayici | Aralik | Varsayilan | Gorevi |
|-------------|--------|-----------|--------|
| Yayin zamanlayicisi | 60 sn | Aktif | Planlanmis yayinlari tetikler |
| Otomatik tarama | 5 dk | Aktif | RSS kaynak taramasi |
| Is yeniden deneme | 2 dk | **Kapali** | Basarisiz isleri yeniden dener |
| Gecikme bildirimi | 5 dk | Aktif | Geciken planlamalar icin bildirim |
| Full-Auto zamanlayicisi | 60 sn | **Kapali** | Zamanlanmis proje otomasyonunu tetikler |

Is yeniden deneme zamanlayicisi varsayilan olarak kapalidir. Etkinlestirmek icin Admin panelde **Ayarlar** > `jobs.auto_retry_enabled` degerini `true` yapin.

---

## 11. Full-Auto / Proje Otomasyonu

Full-Auto, bir projeye tanimli otomasyon ayarlariyla (zamanlama, guard'lar, yayin politikasi) tam otomatik icerik uretimi baslatir.

### Onkosullar

1. Admin > Ayarlar'dan `automation.full_auto.enabled` = `true` yapin
2. Zamanlanmis calistirma icin `automation.scheduler.enabled` = `true` yapin

### Proje Hazirligi

1. `standard_video` tipinde bir proje olusturun (v1 sadece bu modulu destekler)
2. Projeye bir channel_profile ve default template baglayin
3. Proje detay sayfasinda **Otomasyon** bolumunu acin, toggle'i etkinlestirin

### Kullanim

- **Manuel tetikleme:** "Hazirlik Kontrolu" ile guard'lari dogrulayin, ardindan "Simdi Tetikle"
- **Zamanli tetikleme:** Zamanlama toggle'ini acin, cron preset secin veya manuel cron girin

### Guard Sistemi

7 guard sirali degerlendirme yapilir: global enabled, modul destegi, proje enabled, template atanmis, kanal baglanmis, proje concurrency, gunluk kota. Herhangi biri fail ederse tetikleme reddedilir ve audit log'a yazilir.

### Sinirlamalar (v1)

- Sadece `standard_video` modulu desteklenir
- Publish step Faz 1: uretim sonucu her zaman taslak kalir
- Scheduler durumu ilk tick'e kadar (~60sn) `enabled: false` gosterir

Detayli kullanim: `docs/USER_GUIDE.md` §6 (Full-Auto Mod — Adim Adim Kullanim)  
Teknik kapanis raporu: `docs/archive/phase-closures/full-auto-v1-closure.md`

---

## 12. Onemli Notlar

- **Localhost-only:** Sistem su an sadece tek makine uzerinde calisacak sekilde tasarlanmistir
- **SSE auth yok:** Gercek zamanli bildirim kanali (SSE) localhost-only olarak auth gerektirmez
- **TTS:** Microsoft Edge TTS (ucretsiz, API anahtari gerektirmez)
- **Render:** Remotion ile video render — Node.js ve ffmpeg gerektirir
- **Ayar degisiklikleri:** Bazi ayarlar (workspace_root, JWT secret, OAuth credentials) yeniden baslatma gerektirir
- **Otomasyon:** Full-Auto scheduler aktif — `automation.full_auto.enabled` ve `automation.scheduler.enabled` ayarlarıyla admin panelinden yönetilir. v1'de üretim sonucu her zaman taslak kalır (otomatik yayın yok).
