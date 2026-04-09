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
pip install -e .
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

Bu komut SQLite veritabanini `backend/data/contenthub.db` yolunda olusturur ve tum migration'lari uygular.

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
4. Redirect URI olarak `http://localhost:8000/api/v1/settings/youtube-callback` ekleyin
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

### Yedekleme

ContentHub tum verisini iki yerde tutar:

| Konum | Icerik |
|-------|--------|
| `backend/data/contenthub.db` | Veritabani (tum kayitlar, ayarlar, kullanicilar) |
| `backend/workspace/` | Is artifact'lari (audio, video, script, metadata) |

**Yedek alma:**
```bash
# Sistemi durdurun (veya WAL checkpoint yapin)
cp backend/data/contenthub.db backup/contenthub-$(date +%Y%m%d).db
cp -r backend/workspace/ backup/workspace-$(date +%Y%m%d)/
```

### Geri Yukleme

```bash
# Sistemi durdurun
cp backup/contenthub-TARIH.db backend/data/contenthub.db
cp -r backup/workspace-TARIH/ backend/workspace/
# Sistemi yeniden baslatin
```

**Onemli:** Geri yukleme sirasinda sistem kapalı olmalidir. WAL dosyalari (`-wal`, `-shm`) DB ile birlikte tasinmalidir.

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

Is yeniden deneme zamanlayicisi varsayilan olarak kapalidir. Etkinlestirmek icin Admin panelde **Ayarlar** > `jobs.auto_retry_enabled` degerini `true` yapin.

---

## 11. Onemli Notlar

- **Localhost-only:** Sistem su an sadece tek makine uzerinde calisacak sekilde tasarlanmistir
- **SSE auth yok:** Gercek zamanli bildirim kanali (SSE) localhost-only olarak auth gerektirmez
- **TTS:** Microsoft Edge TTS (ucretsiz, API anahtari gerektirmez)
- **Render:** Remotion ile video render — Node.js ve ffmpeg gerektirir
- **Ayar degisiklikleri:** Bazi ayarlar (workspace_root, JWT secret, OAuth credentials) yeniden baslatma gerektirir
- **Otomasyon:** Politikalar tanimlanabilir ama otomatik calistirma henuz aktif degildir
