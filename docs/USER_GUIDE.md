# ContentHub — Kullanıcı Rehberi

**Sürüm:** v1.0 (2026-04-18)  
**Hedef kitle:** İçerik üreticileri, yöneticiler, yeni başlayanlar

Bu rehber ContentHub'ın tüm menülerini, ekranlarını ve özelliklerini adım adım açıklar.

---

## İçindekiler

1. [Genel Bakış — İki Panel](#1-genel-bakış--iki-panel)
2. [Giriş ve Kimlik Doğrulama](#2-giriş-ve-kimlik-doğrulama)
3. [Kullanıcı Paneli — Tüm Menüler](#3-kullanıcı-paneli--tüm-menüler)
4. [Admin Paneli — Tüm Menüler](#4-admin-paneli--tüm-menüler)
5. [İçerik Oluşturma — Wizard'lar](#5-içerik-oluşturma--wizardlar)
6. [Full-Auto Mod — Adım Adım Kullanım](#6-full-auto-mod--adım-adım-kullanım)
7. [Yayın Akışı](#7-yayın-akışı)
8. [Bildirimler ve Gerçek Zamanlı Güncellemeler](#8-bildirimler-ve-gerçek-zamanlı-güncellemeler)
9. [Cmd+K Komut Paleti](#9-cmdk-komut-paleti)
10. [Sık Sorulan Sorular](#10-sık-sorulan-sorular)

---

## 1. Genel Bakış — İki Panel

ContentHub iki ayrı yüzeye sahiptir:

| Panel | URL | Kim Kullanır | Ne İçin |
|---|---|---|---|
| **Kullanıcı Paneli** | `/` veya `/dashboard` | İçerik üreticileri | İçerik oluşturma, kendi istatistikleri, kanallar |
| **Admin Paneli** | `/admin` | Sistem yöneticileri | Tüm kullanıcıların işleri, ayarlar, sistem sağlığı |

Her kullanıcı sadece kendi içeriklerini görür. Admin tüm sistemi merkezi olarak izler.

---

## 2. Giriş ve Kimlik Doğrulama

### Giriş

URL: `http://localhost:5173/login`

- **Email:** `admin@contenthub.local` (varsayılan admin)
- **Şifre:** `.env` dosyasındaki `CONTENTHUB_ADMIN_PASSWORD` değeri

### Token Yenileme

Giriş sonrası JWT token otomatik olarak yönetilir. Token süresi dolduğunda sistem arka planda token'ı yeniler — kullanıcının tekrar giriş yapması gerekmez.

### Çıkış

Sağ üst köşedeki kullanıcı avatarına tıklayın → **Çıkış Yap**.

---

## 3. Kullanıcı Paneli — Tüm Menüler

Kullanıcı paneli sol kenar çubuğundan (sidebar) gezilir.

### 3.1 Dashboard (`/dashboard`)

Ana özet sayfası. Bir bakışta görürsünüz:

- **Son İşler:** Son 5 içerik üretim işinin durumu (bekliyor / çalışıyor / tamamlandı / başarısız)
- **Otomasyonlar Özeti (AutomationDigestWidget):** Bugün çalışan otomasyon sayısı, aktif otomasyon sayısı, planlanan sonraki çalışma zamanı
- **Kanal Performansı:** Bağlı kanallarınızın özet metrikleri

**İpucu:** Dashboard'daki her kart tıklanabilir ve ilgili detay sayfasına götürür.

### 3.2 İçerik Oluştur

Yeni içerik oluşturmak için üç wizard türü mevcuttur:

| Seçenek | Açıklama |
|---|---|
| **Video Oluştur** | Konu bazlı otomatik video üretimi (Standard Video) |
| **Bülten Oluştur** | RSS/URL kaynaklardan haber bülteni |
| **Ürün İnceleme** | URL girerek ürün inceleme videosu |

Her wizard adım adım sizi yönlendirir — ayrıntılar için [§5 İçerik Oluşturma](#5-içerik-oluşturma--wizardlar) bölümüne bakın.

### 3.3 İşlerim (`/jobs`)

Sizin başlattığınız tüm üretim işlerinin listesi. Her iş satırında:

- İş durumu (ikon rengiyle): `queued` / `running` / `completed` / `failed`
- Modül tipi (video / bülten / ürün)
- Başlangıç zamanı ve geçen süre
- Mevcut adım (çalışıyorsa)

Bir işe tıklayarak **İş Detay** sayfasına gidin.

#### İş Detay Sayfası

İşin tüm yaşam döngüsünü tek sayfada görürsünüz:

- **Özet:** Durum, modül, konu, başlangıç/bitiş zamanı
- **Zaman Çizelgesi:** Her adımın (Script → TTS → Render...) süresi ve durumu
- **Loglar:** Her adımın metin logları
- **Artifactlar:** Üretilen dosyalar (ses, video, script metni)
- **Tekrar Çalıştır:** Başarısız bir işi yeniden başlatmak için

### 3.4 Projelerim (`/projects`)

İçerik projelerinin listesi. Proje, ilgili içerikleri gruplamak için kullanılır.

- **Proje oluştur:** Sağ üst `+ Yeni Proje` butonu
- Her proje bir `module_type` (standard_video, news_bulletin...) ve kanal profiliyle ilişkilidir
- Proje detay sayfasında projeye ait işler ve otomasyon ayarları görünür

### 3.5 Kanallarım (`/channels`)

YouTube kanallarınızı ekleyip yönetirsiniz.

#### Kanal Ekleme

1. **+ Kanal Ekle** butonuna tıklayın
2. **Kanal URL'si** alanına YouTube kanalınızın URL'sini girin
   - Örnek: `https://www.youtube.com/@KanalAdiniz`
3. Sistem kanal başlığını, avatarını ve kanal ID'sini otomatik çeker
4. `import_status: success` → kanal başarıyla eklendi
5. `import_status: partial` → metadata çekilemedi, başlığı kendiniz girebilirsiniz

**Not:** Aynı kanalı iki kez ekleyemezsiniz (409 hatası döner).

### 3.6 İçerik Takvimi (`/calendar`)

Planlanan yayınlarınızı takvimde görürsünüz.

- **3 görünüm:** Liste / Haftalık / Aylık (sağ üstteki butonlarla geçiş)
- Takvim üzerindeki bir yayına tıklayarak detayına gidebilirsiniz
- Zamanlanmış ama henüz yayınlanmamış içerikler buradan takip edilir

### 3.7 Yayınlarım (`/publish`)

Üretim tamamlanan içeriklerin yayın durumunu görürsünüz.

- **draft:** Henüz inceleme için gönderilmedi
- **pending_review:** İnceleme bekleniyor
- **approved:** Onaylandı, yayınlanabilir
- **published:** YouTube'a yayınlandı

Ayrıntılar için [§7 Yayın Akışı](#7-yayın-akışı) bölümüne bakın.

### 3.8 Analitiğim (`/analytics`)

Kişisel içerik performansınız:

- Toplam yayın sayısı, başarı oranı
- Modül bazlı üretim süresi
- Kanal bazlı performans (YouTube Analytics bağlıysa gerçek veri)

### 3.9 Otomasyonlarım (`/automations`)

Kanal bazlı otomasyon politikalarınızı yönetirsiniz.

- Her kanalın kendi otomasyon politikası vardır
- `max_daily_jobs`, `allowed_hours` (saatlik aralık), `allowed_days` gibi ayarlar
- Approver ataması: belirli bir kullanıcının onayı gerekiyorsa buradan atanır

**Not:** Otomasyon politikaları Full-Auto modunun guard zincirinin bir parçasıdır. Ayrıntılar [§6](#6-full-auto-mod--adım-adım-kullanım).

### 3.10 Platform Bağlantılarım (`/connections`)

YouTube OAuth bağlantısı burada yönetilir.

- **Bağlan:** YouTube hesabınızı bağlamak için OAuth akışını başlatır
- Bağlantı kurulduğunda yayın butonu aktif hale gelir
- Bağlantı durumu: `connected` / `expired` / `not_connected`

---

## 4. Admin Paneli — Tüm Menüler

Admin paneline `http://localhost:5173/admin` adresinden erişilir. Sadece `admin` rolüyle giriş yapan kullanıcılar erişebilir.

### 4.1 Admin Dashboard (`/admin`)

Sistem geneli özet:

- Toplam iş sayısı ve başarı oranı
- Aktif kullanıcı sayısı
- Son yayınlar
- SSE bağlantısı durumu

### 4.2 Ayarlar (`/admin/settings`)

**Settings Registry** — 204 ayar, 16 grup.

Bu sayfa sistemin tüm yapılandırılabilir davranışlarını yönetir. Ayarlar gruplanmıştır:

| Grup | İçerik |
|---|---|
| `general` | Site adı, dil, timezone |
| `jobs` | Job retry, timeout, concurrency sınırları |
| `tts` | TTS sağlayıcı seçimi, ses hızı, ses tonu |
| `llm` | LLM sağlayıcı, model, temperature, max_tokens |
| `visuals` | Görsel sağlayıcı (Pexels/Pixabay), arama stratejisi |
| `render` | Render çözünürlüğü, FPS, kalite |
| `publish` | Yayın retry sayısı, timeout |
| `automation` | Full-auto etkinleştirme, scheduler, kota |
| `channels` | Kanal metadata ayarları |
| `news` | RSS tarama aralığı, dedupe eşikleri |
| `notifications` | Bildirim yaşam süresi, tip filtreleri |
| `analytics` | Metrik hesaplama aralıkları |
| `templates` | Varsayılan şablon seçimleri |
| `visibility` | Sayfa/widget görünürlük kuralları |
| `wizard` | Wizard adım görünürlüğü, guided/advanced mod |
| `modules` | Modül etkinleştirme toggle'ları |

**Ayar değiştirme:**
1. İlgili grubu tıklayın
2. Ayar satırını tıklayın
3. Yeni değeri girin ve kaydedin

**Not:** Bazı ayarlar (JWT_SECRET, workspace_root) değiştirildikten sonra sistemi yeniden başlatmanız gerekir.

### 4.3 Kullanıcı Yönetimi (`/admin/users`)

Tüm kullanıcıları listeler. Yeni kullanıcı oluşturabilir, rol değiştirebilir, hesap durum bilgilerini görebilirsiniz.

### 4.4 Tüm İşler (`/admin/jobs`)

Sistemdeki tüm kullanıcıların tüm işlerini görürsünüz. Filtreler:

- Kullanıcıya göre
- Duruma göre (running / failed / completed)
- Modül tipine göre
- Tarih aralığına göre

### 4.5 Yayın Merkezi (`/admin/publish`)

Tüm kullanıcıların yayın kayıtlarını yönetirsiniz. Onay akışı buradan yönetilir:

- draft → pending_review → approved geçişleri
- scheduled yayınları manuel tetikleme
- Başarısız yayınları yeniden deneme

### 4.6 Kaynaklar (`/admin/sources`)

RSS ve haber kaynaklarını ekleyip yönetirsiniz.

- **Kaynak Ekle:** URL, tip (RSS/API/manuel), güven seviyesi
- **Manuel Tarama:** "Şimdi Tara" butonu
- Otomatik tarama 5 dakikada bir arka planda çalışır

### 4.7 Kaynak Taramaları (`/admin/source-scans`)

Son tarama sonuçlarını görürsünüz: taranan haber sayısı, tekrar bulunanlar (dedupe), hatalar.

### 4.8 Şablonlar (`/admin/templates`)

İçerik şablonlarını (Content Template) yönetirsiniz. Her şablon bir modüle özgü parametreler kümesidir.

### 4.9 Stil Blueprint'leri (`/admin/style-blueprints`)

Video görsel kimliğini tanımlayan blueprint'ler:

- Altyazı stili
- Thumbnail yönlendirmesi
- Renk paleti
- Hareket efekti seviyesi

### 4.10 Prompt Editörü (`/admin/prompt-editor`)

Tüm LLM prompt metinlerini tek yerden düzenlersiniz. Her prompt:
- `{module}.prompt.{purpose}` formatında anahtarlanmıştır
- Settings Registry'de saklanır (kodda gömülü değil)

### 4.11 Analizler (`/admin/analytics`)

Dört görünüm:

| Görünüm | İçerik |
|---|---|
| **Platform Genel Bakış** | Tüm platformların özet metrikleri |
| **Platform Detay** | Kanal/platform bazlı derinlemesine analiz |
| **İçerik Analizi** | İçerik tipine göre performans |
| **Operasyon Analizi** | Job başarı oranı, render süresi, provider hataları |

YouTube Analytics bağlı ise gerçek izlenme, tutma ve tıklama verileri görünür.

### 4.12 Denetim Logu (`/admin/audit`)

Sistemdeki tüm önemli değişikliklerin kayıtları:
- Kim, ne zaman, hangi kaydı değiştirdi
- Durum geçişleri (draft → approved gibi)
- Ayar değişiklikleri

### 4.13 Bağlantı Merkezi (`/admin/connections`)

Tüm kullanıcıların platform bağlantılarını ve bağlantı kapasitelerini görürsünüz (Yetenek Matrisi).

### 4.14 Wizard Yönetimi (`/admin/wizards`)

Wizard adımlarını, görünürlüğünü ve sırasını yapılandırırsınız:
- Hangi adımlar guided modda görünür?
- Hangi parametreler advanced modda ek olarak görünür?
- Adım başlıkları ve yardım metinleri

### 4.15 Otomasyon Politikaları (`/admin/automation-policies`)

Tüm kullanıcıların kanal bazlı otomasyon politikalarını merkezi görürsünüz ve düzenleyebilirsiniz.

### 4.16 Full-Auto Projeler (`/admin/full-auto`)

Sistemdeki tüm Full-Auto yapılandırılmış projeleri, son çalışma zamanlarını ve günlük kotaları görürsünüz.

---

## 5. İçerik Oluşturma — Wizard'lar

### 5.1 Standard Video Wizard

**Başlatmak için:** Kullanıcı Paneli → **Video Oluştur**

**Adımlar:**

1. **Proje Seçimi** — Yeni proje oluştur veya mevcut projeyi seç
2. **Konu** — Video konusunu girin (örn: "Yapay zekanın geleceği")
3. **Dil** — İçerik dili (Türkçe, İngilizce...)
4. **Süre** — 60 saniye / 3 dakika / 5 dakika
5. **Şablon** — İçerik ve stil şablonu seçimi
6. **İleri Ayarlar** (Advanced Mode'da görünür):
   - TTS sesi seçimi
   - Görsel arama anahtar kelimeleri
   - Altyazı stili
7. **Özet & Onayla** — Parametreleri gözden geçirin ve işi kuyruğa gönderin

**Pipeline sonrası:** Script → Metadata → TTS → Altyazı → Görsel → Kompozisyon → Render → Draft Publish Kaydı

### 5.2 Haber Bülteni Wizard

**Başlatmak için:** Kullanıcı Paneli → **Bülten Oluştur**

**Ön koşul:** Admin panelinde en az bir haber kaynağı eklenmiş ve taranmış olmalı.

**Adımlar:**

1. **Kaynak Seçimi** — Hangi kaynaklardan haber alınacak
2. **Haber Seçimi** — Sistem son taramadan haberleri gösterir, kullanıcı seçer/elemeleyebilir
3. **Editorial Gate** — Benzer haber filtresi (dedupe kontrolü)
4. **Dil ve Süre**
5. **Şablon**
6. **Onayla**

**Pipeline sonrası:** Seçilen haberler → Script → TTS → Altyazı → Kompozisyon → Render → Draft

### 5.3 Ürün İnceleme Wizard

**Başlatmak için:** Kullanıcı Paneli → **Ürün İnceleme**

**Adımlar:**

1. **Ürün URL'si** — İncelenecek ürünün sayfası (Amazon, trendyol, herhangi bir ürün sayfası)
   - Sistem URL'yi scrape eder, başlık/açıklama/fiyat çeker
   - SSRF koruması aktif, robots.txt uyumu var
2. **İnceleme Açısı** — Nesnel inceleme / Karşılaştırma / Kullanıcı değerlendirme özeti
3. **Dil ve Süre**
4. **Şablon**
5. **Onayla**

**Pipeline sonrası:** Scrape → Script → TTS → Altyazı → Görsel → Render → Draft

---

## 6. Full-Auto Mod — Adım Adım Kullanım

Full-Auto mod, bir projeye tanımlı otomasyon ayarlarıyla periyodik olarak otomatik içerik üretir.

### 6.1 Full-Auto Nedir?

Örnek senaryo: "Her sabah 09:00'da 'teknoloji haberleri' konusunda 3 dakikalık Türkçe video otomatik üret."

Full-Auto bunu şöyle yapar:
1. Zamanlayıcı tetiklenir (veya siz manuel tetiklersiniz)
2. Guard zinciri kontrol edilir (kota, template, kanal bağlantısı vs.)
3. Guard'lar geçerse yeni bir iş kuyruğa alınır
4. İş tamamlandığında **TASLAK** olarak yayın kaydı oluşur (v1'de otomatik yayın yok — insan onayı gerekli)

### 6.2 Kurulum (Adım Adım)

#### Adım 1: Global Ayarları Etkinleştir

`/admin/settings` → **Automation** grubu:

| Ayar | Değer |
|---|---|
| `automation.full_auto.enabled` | `true` |
| `automation.scheduler.enabled` | `true` (zamanlanmış çalışma için) |
| `automation.global_daily_limit` | Sistemdeki toplam günlük job limiti (örn: 50) |

#### Adım 2: Proje Hazırla

1. Kullanıcı Paneli → **Projelerim** → **+ Yeni Proje**
2. Proje oluştur ve aşağıdakileri bağla:
   - **Modül:** `standard_video` (v1'de desteklenen tek modül)
   - **Kanal Profili:** Daha önce eklediğiniz YouTube kanalı
   - **Varsayılan Şablon:** Kullanılacak içerik şablonu

#### Adım 3: Proje Otomasyonunu Yapılandır

Proje detay sayfasına gidin → **Otomasyon** sekmesi:

1. **Otomasyon Toggle'ı** → Aktif yapın
2. **Konu Şablonu** — Otomatik üretilecek içeriğin konusu veya konuyu belirleyen anahtar kelimeler
3. **Dil**
4. **Süre**

#### Adım 4: Otomasyon Politikasını Ayarla (Opsiyonel)

`/automations` sayfasına gidin → İlgili kanal için politikayı düzenleyin:

| Ayar | Açıklama | Örnek |
|---|---|---|
| `max_daily_jobs` | Günde en fazla kaç iş başlatılabilir | `3` |
| `allowed_hours` | Hangi saat aralığında çalışsın | `"08:00-20:00"` |
| `allowed_days` | Hangi günler çalışsın | `"1,2,3,4,5"` (Pzt-Cum) |
| `require_approval` | İş başlamadan önce onay gereksin mi | `false` |

#### Adım 5: Zamanlama Kur (Zamanlanmış Çalışma İçin)

Proje detay sayfası → Otomasyon → **Zamanlama Toggle'ı** → Aktif:

**Preset Seçenekleri:**
- Günlük (Her gün 09:00)
- Haftalık (Her Pazartesi 09:00)
- İki günde bir
- Özel cron

**Özel Cron Sözdizimi:**

```
┌─── dakika (0-59)
│  ┌── saat (0-23)
│  │  ┌─ gün (1-31)
│  │  │  ┌ ay (1-12)
│  │  │  │  ┌ haftanın günü (0=Pazar, 1=Pzt...7=Paz)
│  │  │  │  │
*  *  *  *  *
```

**Örnekler:**

| Cron | Anlamı |
|---|---|
| `0 9 * * *` | Her gün 09:00 |
| `0 9 * * 1-5` | Hafta içi her gün 09:00 |
| `0 9 * * 1` | Her Pazartesi 09:00 |
| `0 9,18 * * *` | Her gün 09:00 ve 18:00 |
| `0 */6 * * *` | Her 6 saatte bir |

#### Adım 6: Manuel Tetikleme (Test İçin)

Zamanlayıcıyı beklemeden hemen test etmek için:

1. Proje detay sayfası → Otomasyon
2. **"Hazırlık Kontrolü"** butonuna tıklayın → Guard sonuçları görünür
3. Tüm guard'lar yeşilse → **"Şimdi Tetikle"** butonu aktif olur
4. Tıklayın → Yeni iş anında kuyruğa alınır

API ile manuel tetikleme:
```bash
POST /api/v1/full-auto/content-projects/{project_id}/trigger
Authorization: Bearer <token>
```

### 6.3 Guard Zinciri — Neden Tetikleme Reddediliyor?

Full-Auto tetiklendiğinde 7 guard sırayla kontrol edilir. Herhangi biri fail ederse tetikleme durur ve audit log'a yazılır:

| Guard | Kontrol | Çözüm |
|---|---|---|
| **1. Global Enabled** | `automation.full_auto.enabled = true` var mı? | Admin > Ayarlar > automation grubunu kontrol et |
| **2. Modül Desteği** | Projenin modülü full-auto destekliyor mu? | v1'de sadece `standard_video` desteklenir |
| **3. Proje Aktif** | Projenin otomasyon toggle'ı açık mı? | Proje > Otomasyon > Toggle aktif et |
| **4. Template Atanmış** | Projeye bir şablon bağlı mı? | Proje > Şablon seç |
| **5. Kanal Bağlantısı** | Projeye kanal profili bağlı mı? | Proje > Kanal Profili seç |
| **6. Proje Concurrency** | Bu proje için çalışan iş var mı? | Mevcut iş tamamlanana bekle |
| **7. Günlük Kota** | Günlük maksimum iş sayısına ulaşıldı mı? | `max_daily_jobs` ayarını artır veya yarın dene |

**Guard sonuçlarını görmek için:**
- Proje detay sayfası → **"Hazırlık Kontrolü"** butonu
- Veya: `GET /api/v1/full-auto/content-projects/{project_id}/evaluate`

### 6.4 Oluşturulan İşi Takip Etme

1. **İşlerim** sayfasından iş durumunu takip edin
2. İş detay sayfasında adım adım ilerlemeyi izleyin
3. SSE üzerinden gerçek zamanlı bildirim alırsınız

### 6.5 Üretim Tamamlandıktan Sonra

v1'de Full-Auto üretilen içerikler **her zaman taslak** olarak oluşur:

1. **Yayınlarım** (`/publish`) sayfasına gidin
2. Taslağı inceleyin
3. İnceleme için gönderin (→ pending_review)
4. Onaylayın (→ approved)
5. Yayınlayın (→ published)

**Neden otomatik yayın yok?** İnsan onayı bu versiyonun bilinçli bir tasarım kararıdır. Publish adımındaki otomatik yayın (auto-publish) gelecek fazda eklenecek.

### 6.6 Scheduler Durumunu Kontrol Etme

```bash
GET /api/v1/full-auto/scheduler/status
Authorization: Bearer <token>
```

**Not:** Scheduler ilk tick'e kadar (~60 saniye) `enabled: false` gösterir. Bu normaldir.

### 6.7 Bugünkü Otomasyon Özeti

```bash
GET /api/v1/full-auto/digest/today
Authorization: Bearer <token>
```

Dönen veri:
- `runs_today`: Bugün çalışan iş sayısı
- `active_projects`: Aktif otomasyon projesi sayısı
- `at_limit_projects`: Günlük kotasına ulaşmış projeler
- `next_upcoming`: Sonraki planlanmış çalışma zamanı ve projesi

---

## 7. Yayın Akışı

### Durum Makinesi

```
draft
  │
  ├─▶ pending_review
  │       │
  │       ├─▶ approved
  │       │       │
  │       │       ├─▶ scheduled ──▶ publishing ──▶ published
  │       │       │                                   │
  │       │       └─▶ publishing ──▶ failed           │
  │       │                                           │
  │       └─▶ review_rejected ──────────────────────┘
  │
  └─▶ cancelled
```

### Her Adımda Ne Yapılır?

**1. draft → pending_review**
- Yayınlarım sayfasında kaydın yanındaki **"İncelemeye Gönder"** butonu
- Veya admin: Yayın Merkezi → kayıt → Durum değiştir

**2. pending_review → approved**
- Admin: Yayın Merkezi → kayıt → **"Onayla"**
- (Kullanıcı kendi yayınını onaylayamaz — admin onayı gerekir)

**3. approved → scheduled**
- Onaylanan kaydı belirli bir zamana planlamak için tarih/saat seçin
- Zamanlayıcı (60 sn aralıklı) planlanmış zamanı gelince otomatik yayınlar

**4. approved → publishing → published**
- "Yayınla" butonuyla anında yayın başlatılır
- YouTube OAuth bağlıysa gerçek upload başlar
- `publishing` → `published` (başarı) veya `failed` (hata)

**5. failed → retry**
- Yayın Merkezi → kayıt → **"Yeniden Dene"**

### YouTube Yayını İçin Ön Koşullar

1. Admin panelde YouTube OAuth bağlantısı kurulmuş olmalı (`/admin/connections`)
2. Kanal profiline platform bağlantısı atanmış olmalı
3. OAuth token'ı geçerli olmalı (süresi dolmuşsa yeniden bağlanın)

---

## 8. Bildirimler ve Gerçek Zamanlı Güncellemeler

### Bildirim Merkezi

Sağ üst köşedeki zil ikonu → Bildirim paneli açılır.

Bildirim tipleri:
- **İş tamamlandı:** "Standard Video işiniz tamamlandı"
- **İş başarısız:** "Haber bülteni işi başarısız - Detaylar için tıklayın"
- **Yayın güncellendi:** "İçeriğiniz onaylandı"
- **Otomasyon çalıştı:** "Proje X için yeni iş kuyruğa alındı"

### SSE (Server-Sent Events)

ContentHub gerçek zamanlı güncellemeler için SSE kullanır. Bağlantıyı tarayıcı konsolundan doğrulayabilirsiniz:

1. F12 → Network sekmesi → `events` veya `sse` filtresi
2. Aktif SSE bağlantısı: sürekli açık kalır, yeni event'ler gelir

**Sorun:** Bildirim gelmiyor?
- Tarayıcı konsolunu kontrol edin (SSE bağlantısı kapanmış olabilir)
- Sayfayı yenileyin — SSE otomatik yeniden bağlanır
- Arka plan sekmesi kısıtlamaları (browser policies) SSE'yi etkileyebilir

---

## 9. Cmd+K Komut Paleti

Herhangi bir sayfada `Cmd+K` (macOS) veya `Ctrl+K` (Windows/Linux) tuş kombinasyonuyla komut paletini açın.

### Neler Yapabilirsiniz?

- **Navigasyon:** "otomasyon" yazın → ilgili sayfaya git
- **Hızlı Arama:** "son işler" → İşlerim sayfası
- **Eylemler:** "video oluştur" → Wizard'ı başlat

### İpuçları

- İlk birkaç harf yazmak yeterli — akıllı fuzzy search yapar
- `Esc` ile kapatın
- Ok tuşlarıyla sonuçlar arasında gezin, Enter ile seçin

---

## 10. Sık Sorulan Sorular

### "Full-Auto modunu açtım ama çalışmıyor?"

1. `/admin/settings` → Automation grubunda `automation.full_auto.enabled = true` olduğunu kontrol edin
2. Projenin otomasyon toggle'ının açık olduğunu kontrol edin
3. Projeye şablon ve kanal profili bağlı mı?
4. **Hazırlık Kontrolü** butonuyla guard sonuçlarını görün
5. Scheduler ilk tick'e (~60 sn) kadar `enabled: false` gösterir — normal

### "İş takılı kaldı (running durumunda)"

- Sistemi yeniden başlatın — startup recovery 5 dakikadan eski `running` işleri otomatik `failed` yapar
- Admin → İşler → ilgili iş → Detay → son adım loguna bakın

### "YouTube yayını başarısız oluyor"

1. Admin → Bağlantı Merkezi → YouTube bağlantısı aktif mi?
2. OAuth token süresi dolmuş olabilir → Yeniden bağlanın
3. Yayın Merkezi → ilgili kayıt → Detay → hata mesajını okuyun

### "Settings 204 ayar gösteriyor ama kullanıcı olarak göremiyorum"

Normal davranış. Ayarların büyük çoğunluğu `visible_to_user=false` — bunlar sadece admin tarafından görülür. Kullanıcılar sadece kendi profilleri için geçerli olan sınırlı ayarları görebilir (TTS sesi gibi).

### "Haber bülteni için kaynak bulamıyorum"

1. Admin panelinde kaynak eklenmiş mi? (`/admin/sources`)
2. Kaynak taraması çalışmış mı? (`/admin/source-scans`)
3. RSS URL erişilebilir mi? Kaynak durumunu kontrol edin.

### "Kanalım 'partial' durumda"

Kanal URL'sinden metadata çekilemedi. Muhtemelen YouTube consent-wall veya timeout. Kanal başlığını elle girebilirsiniz. Kaydı silip tekrar eklemek de yeniden metadata çekmeyi dener.

### "Tema kayboldu, her giriş yaptığımda sıfırlanıyor"

Tema ayarı backend'e kaydedilir ve giriş sonrası otomatik olarak yüklenir. Eğer sıfırlanıyorsa: Kullanıcı ayarlarından temayı tekrar seçin — bir sonraki girişte kalıcı olacak.

---

## Ek: Hızlı Başlangıç Özeti

### İlk Kullanım (5 Adım)

1. `http://localhost:5173` → `admin@contenthub.local` ile giriş
2. `/admin/settings` → LLM, TTS ve Pexels API key'lerini girin
3. Kullanıcı Paneli → **Video Oluştur** → Konu girin → İşi başlatın
4. `/jobs` → İş tamamlanınca detaya bakın
5. `/publish` → Taslağı onaylayın ve yayınlayın

### Full-Auto İlk Kurulum (7 Adım)

1. `/admin/settings` → `automation.full_auto.enabled = true`
2. `/admin/settings` → `automation.scheduler.enabled = true`
3. Kullanıcı paneli → Yeni Proje oluştur (standard_video, kanal profili bağla)
4. Projeye şablon ata
5. Proje → Otomasyon → Toggle aktif et, konu/dil/süre gir
6. Otomasyon → Zamanlama → Cron gir (örn: `0 9 * * *`)
7. "Hazırlık Kontrolü" ile doğrula → Yeşil ise "Şimdi Tetikle" ile test et

---

*Bu doküman ContentHub v1.0 (2026-04-18) için hazırlanmıştır.*  
*Güncel teknik detaylar için: `docs/release-notes-v1.md` ve `docs/operator-guide.md`*
