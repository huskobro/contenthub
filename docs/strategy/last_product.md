# ContentHub — Güncellenmiş Son Ürün Planı v2

---

## BÖLÜM 1: Yeni Vizyon — Çoklu Kanal İş Modeli

Temel konsept değişikliği: ContentHub artık **tek kullanıcılı bir araç değil**, her biri farklı Gmail/Google hesabıyla bağlanan **birden fazla "kanal" (channel) üzerinden içerik üreten, dağıtan ve yöneten bir platform**.

### 1.1 Kanal (Channel) Kavramı

```
Channel = Bir iş modeli birimi
├── Google/Gmail hesabı (OAuth)
├── Bağlı platformlar (YouTube, Instagram, TikTok, X, ...)
├── Brand Kit (logo, renkler, fontlar, intro/outro)
├── İçerik stratejisi & şablonları
├── Kendi analytics metrikleri
├── Kendi publish geçmişi
└── Kendi kaynak havuzu & tercihleri
```

Bir user birden fazla channel yönetebilir. Admin tüm channel'ları görür — hem kümülatif hem channel bazlı.

### 1.2 Mimari Etki

| Mevcut | Yeni |
|--------|------|
| Job → doğrudan user'a bağlı | Job → Channel'a bağlı, Channel → User'a bağlı |
| Tek publish hedefi | Channel başına N platform hesabı |
| Tek brand/stil | Channel başına Brand Kit |
| Flat analytics | Kümülatif + Channel bazlı + Platform bazlı |

---

## BÖLÜM 2: Admin vs User Panel — Revize Edilmiş Sorumluluk

### 2.1 Temel Prensip

**Admin**: Her şeyi görür, her veriyi filtreler, sistem sağlığını izler, politika belirler.
**User**: Kendi channel'larını yönetir, içerik üretir, yayınlar, etkileşim yönetir, kendi metriklerini görür.

**Operasyonel metrikler her iki panelde de yaşar** — user kendi channel'ını, admin herkesi ve toplamı görür.

### 2.2 Güncellenmiş Panel Haritası

| Alan | Admin Panel | User Panel |
|------|------------|------------|
| **Channel Yönetimi** | Tüm channel listesi, onay, kota | Kendi channel CRUD |
| **İçerik Üretimi** | ❌ (sadece izleme) | ✅ Wizard'lar, iş başlatma |
| **İş İzleme** | Tüm işler, filtre: user/channel/modül | Kendi işleri, filtre: channel |
| **Publish** | Tüm yayın logları, politika | Kendi yayın akışı |
| **Platform Etkileşim** | Kümülatif yorum/bildirim istatistikleri | Yorum cevaplama, playlist, gönderi |
| **Analytics** | Kümülatif + user bazlı + channel bazlı | Kendi channel analytics |
| **Kaynak Yönetimi** | Tam kontrol | Kendi channel kaynakları |
| **Ayarlar** | Sistem + tüm channel politikaları | Channel ayarları + kişisel |
| **Brand Kit** | Tüm brand kit'leri izleme | Kendi channel brand kit'i |
| **Şablonlar** | Sistem şablonları yönetimi | Seçim + channel özel şablonlar |
| **Audit Log** | Tüm sistem | Kendi aksiyonları |
| **Grafikler** | Tüm grafikler, her seviyede filtre | Channel bazlı grafikler |

---

## BÖLÜM 3: Yeni Modüller & Sistemler

### 3.1 Channel Management System (Kanal Yönetim Sistemi)

**Backend**:
```
channels/
├── models.py          # Channel, ChannelPlatform, ChannelBrandKit
├── service.py         # CRUD, OAuth bağlama, platform ekleme
├── repository.py      # DB işlemleri
└── router.py          # /api/channels/*
```

**Channel Model**:
```python
Channel:
  id, name, slug, owner_user_id
  description, avatar_url
  default_language, default_category
  brand_kit_id (FK → BrandKit)
  status: active/paused/archived
  created_at, updated_at

ChannelPlatform:
  id, channel_id, platform_type (youtube/instagram/tiktok/x/...)
  credentials_ref (encrypted OAuth token reference)
  platform_account_id, platform_account_name
  status: connected/expired/revoked
  last_sync_at

BrandKit:
  id, channel_id
  logo_path, colors_json, fonts_json
  intro_template_id, outro_template_id
  watermark_path, watermark_position
  version, created_at
```

**Frontend**:
- User: Channel oluşturma wizard, platform bağlama OAuth flow, brand kit editörü
- Admin: Channel listesi tablosu (user, platform sayısı, iş sayısı, durum filtreleri)

### 3.2 Platform Interaction System (Platform Etkileşim Sistemi)

Bu tamamen yeni bir modül. Sadece yayınlamak değil, **platformla çift yönlü etkileşim**.

```
platform_interactions/
├── models.py          # Comment, Reply, Playlist, Post
├── sync_service.py    # Platform API'den çekme (pull)
├── action_service.py  # Platforma gönderme (push)
├── router.py          # /api/channels/{id}/interactions/*
└── adapters/
    ├── youtube_adapter.py    # Comments, Playlists, Community
    ├── instagram_adapter.py  # Comments, Stories, Reels
    ├── tiktok_adapter.py     # Comments
    └── x_adapter.py          # Replies, Quote tweets
```

**Özellikler**:

| Platform | Çekme (Pull) | Gönderme (Push) |
|----------|-------------|-----------------|
| **YouTube** | Yorumlar, video istatistikleri, abone bildirimleri | Yorum cevaplama, playlist ekleme, community post, video güncelleme |
| **Instagram** | Yorumlar, story görüntülenme | Yorum cevaplama, story paylaşma (gelecek) |
| **TikTok** | Yorumlar, video istatistikleri | Yorum cevaplama |
| **X/Twitter** | Mention'lar, yanıtlar | Tweet, yanıt, alıntı tweet |

**Yorum Yönetim Arayüzü** (User Panel):
```
┌──────────────────────────────────────────────────┐
│ Yorumlar — [Kanal: TechNews TR ▾] [Platform: Tümü ▾] │
│ [Cevaplanmamış: 23] [Bugün: 8] [Spam: 2]        │
├──────────────────────────────────────────────────┤
│ ▶ "Harika video, devamını bekliyorum!" — @user1  │
│   📺 YouTube · "AI Haberleri #45" · 2 saat önce  │
│   [Cevapla] [Beğen] [Spam] [Gizle]              │
│   ┌─ Hızlı cevap: [Teşekkürler! 🙏] [Özel yanıt yazın...] │
│                                                  │
│ ▶ "Kaynak belirtir misiniz?" — @user2            │
│   📺 YouTube · "AI Haberleri #45" · 5 saat önce  │
│   [Cevapla] [Beğen] [Spam] [Gizle]              │
└──────────────────────────────────────────────────┘
```

**Playlist Yönetimi** (User Panel):
```
┌──────────────────────────────────────────┐
│ Playlist'ler — [Kanal: TechNews TR ▾]    │
├──────────────────────────────────────────┤
│ 📁 AI Haberleri (45 video)               │
│    Son eklenen: AI Haberleri #45 · Bugün │
│    [Video Ekle] [Sıralama] [Düzenle]     │
│                                          │
│ 📁 Haftalık Özet (12 video)              │
│    Son eklenen: Hafta #12 · 3 gün önce   │
│    [Video Ekle] [Sıralama] [Düzenle]     │
│                                          │
│ [+ Yeni Playlist]                        │
└──────────────────────────────────────────┘
```

### 3.3 Gelişmiş Analytics Sistemi

Mevcut analytics'i genişletiyoruz — **her seviyede filtre + grafikler**.

**Filtre Hiyerarşisi**:
```
Kümülatif (Admin)
└── User bazlı
    └── Channel bazlı
        └── Platform bazlı
            └── İçerik bazlı
```

**Yeni Dashboard Sayfaları**:

**A) Admin — Operasyonel Genel Bakış**:
```
┌─ Üretim Metrikleri ──────────────────────────────┐
│ [Filtre: Tüm Kullanıcılar ▾] [Son 30 gün ▾]    │
│                                                   │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐     │
│ │Toplam  │ │Başarı  │ │Ort.    │ │Aktif   │     │
│ │İş: 342 │ │%96.2   │ │Süre:4m │ │Kanal:8 │     │
│ └────────┘ └────────┘ └────────┘ └────────┘     │
│                                                   │
│ 📊 Günlük Üretim (bar chart — son 30 gün)        │
│ ▁▃▅▇█▇▅▃▁▃▅▇█▇▅▃▁▃▅▇█▇▅▃▁▃▅▇█▇                │
│                                                   │
│ 📊 Modül Dağılımı (pie chart)                     │
│ ● Video %58  ● Bülten %35  ● Diğer %7           │
│                                                   │
│ 📊 Hata Trendi (line chart — son 30 gün)          │
│ ╭─╮  ╭──╮                                        │
│ ╯  ╰──╯  ╰───────────── (azalma trendi ✅)       │
└───────────────────────────────────────────────────┘

┌─ Kaynak & Sistem Sağlığı ────────────────────────┐
│ 📊 Kaynak Sağlık Haritası (heatmap)              │
│ NTV  [██████████] %100                            │
│ BBC  [███████░░░] %70                             │
│ CNN  [██░░░░░░░░] %20 ⚠️                         │
│                                                   │
│ 📊 Platform API Durumu                            │
│ YouTube [✅ 12ms] Instagram [✅ 45ms] X [⚠️ 2s]  │
└───────────────────────────────────────────────────┘
```

**B) Admin — Platform Performansı**:
```
┌─ Platform Karşılaştırma ─────────────────────────┐
│ [Filtre: Tüm Kanallar ▾] [Son 30 gün ▾]        │
│                                                   │
│ 📊 Platform Bazlı Yayın (stacked bar)            │
│ YouTube  ████████████  156                        │
│ Instagram ██████  78                              │
│ TikTok    ████  52                                │
│ X         ██  31                                  │
│                                                   │
│ 📊 Etkileşim Oranları (grouped bar)              │
│         Görüntülenme  Beğeni  Yorum              │
│ YT      ████████      ████    ██                  │
│ IG      ██████        █████   ███                 │
│ TT      ████████████  ███████ █████               │
│                                                   │
│ 📊 Büyüme Trendi — Abone/Takipçi (multi-line)   │
│ ── YouTube  ── Instagram  ── TikTok              │
│ ╭──────────────────────────╮                      │
│ │    ╱──────── YT          │                      │
│ │  ╱╱──── IG               │                      │
│ │╱╱── TT                   │                      │
│ ╰──────────────────────────╯                      │
└───────────────────────────────────────────────────┘
```

**C) User — Channel Analytics**:
```
┌─ TechNews TR — Performans ───────────────────────┐
│ [Platform: Tümü ▾] [Son 30 gün ▾]               │
│                                                   │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐     │
│ │Yayın   │ │Toplam  │ │Ort.    │ │Abone   │     │
│ │32      │ │Gör:45K │ │Beg:%4.2│ │+1.2K   │     │
│ └────────┘ └────────┘ └────────┘ └────────┘     │
│                                                   │
│ 📊 İçerik Performans Tablosu (son 10 video)      │
│ Video          Gör.   Beg.  Yor.  CTR   Ret.     │
│ AI Hab.#45     3.2K   142   23    8.4%  52%      │
│ AI Hab.#44     2.8K   98    15    7.1%  48%      │
│                                                   │
│ 📊 En İyi Performans Saatleri (heatmap)           │
│     Pzt Sal Çar Per Cum Cmt Paz                   │
│ 08  ░░  ░░  ░░  ░░  ░░  ██  ██                   │
│ 12  ██  ██  ██  ██  ██  ░░  ░░                   │
│ 18  ██  ██  ██  ██  ██  ██  ██                   │
│ 22  ░░  ██  ░░  ██  ░░  ██  ██                   │
│                                                   │
│ 📊 Thumbnail CTR Karşılaştırma (bar)             │
│ Stil A [████████] %8.4                            │
│ Stil B [██████] %6.1                              │
│ Stil C [█████████] %9.2                           │
└───────────────────────────────────────────────────┘
```

**Grafik Kütüphanesi Önerisi**: **Recharts** — React-native, lightweight, responsive, Remotion projesindeki TypeScript ile uyumlu.

### 3.4 İçerik Takvimi (Content Calendar)

```
content_calendar/
├── models.py       # ScheduledContent (channel, date, time, platform, status)
├── service.py      # Takvim CRUD, auto-schedule önerileri
├── router.py       # /api/channels/{id}/calendar/*
```

**User Panel Görünümü**:
```
┌─ İçerik Takvimi — Nisan 2026 ────────────────────┐
│ [Kanal: TechNews TR ▾] [◀ Mart] [Nisan] [Mayıs ▶]│
│                                                    │
│  Pzt    Sal    Çar    Per    Cum    Cmt    Paz     │
│ ┌──────┬──────┬──────┬──────┬──────┬──────┬──────┐│
│ │  6   │  7   │  8   │  9   │ 10   │ 11   │ 12   ││
│ │      │🔵14: │🟢✅  │      │🟡🕐  │      │      ││
│ │      │AI#46 │AI#45 │      │Özet  │      │      ││
│ │      │draft │yayın │      │planl.│      │      ││
│ └──────┴──────┴──────┴──────┴──────┴──────┴──────┘│
│                                                    │
│ 🔵 Taslak  🟡 Planlanmış  🟢 Yayınlandı  🔴 Hata │
│                                                    │
│ [+ İçerik Planla]  [Otomatik Öner]                 │
└────────────────────────────────────────────────────┘
```

### 3.5 Autonomous Pipeline System (Otonom İçerik Hattı — Gelecek)

Şimdi detaylı planlamıyoruz ama **mimariyi hazırlıyoruz**:

```
autonomous_pipeline/
├── trigger.py       # Zamanlama veya olay tabanlı tetikleme
├── strategy.py      # Channel'ın içerik stratejisine göre karar
├── orchestrator.py  # Wizard adımlarını otomatik çalıştır
└── review_gate.py   # Otonom çıktıyı onay kuyruğuna koy
```

**Otonom pipeline ASLA doğrudan yayınlamaz** — her zaman review gate'ten geçer. Admin panelden "otonom mod" açılıp kapatılabilir (Settings Registry).

### 3.6 Video Output Display System

**VideoPlayer Component**:
```
frontend/src/components/shared/VideoPlayer.tsx
- HTML5 <video> with custom controls
- Poster frame from thumbnail artifact
- Responsive sizing
- Error fallback
- Download button
```

**Entegrasyon**:
- Job Detail → "Çıktı" tab'ında büyük player
- Job List → side panel'de mini player
- QuickLook modal → artifact tipine göre media preview
- User Dashboard → son üretimler kartlarında thumbnail + play overlay
- Channel sayfası → en son video hero player

---

## BÖLÜM 4: Mevcut Sistem İyileştirmeleri

### 4.1 Job Engine İyileştirmeleri

| İyileştirme | Detay |
|-------------|-------|
| **Channel bağlantısı** | Her job bir channel_id taşır. Filtreleme: user → channel → job |
| **Multi-platform publish step** | Tek job'dan birden fazla platforma yayın. Publish step array olur |
| **Batch job** | Toplu başlatma: N kaynak → N job, batch_id ile gruplanır |
| **Job clone** | Mevcut job'u farklı channel/ayarlarla klonla |
| **Priority queue** | Channel bazlı öncelik: premium channel'lar önce işlenir (gelecek) |

### 4.2 Settings Registry İyileştirmeleri

| İyileştirme | Detay |
|-------------|-------|
| **Channel scope** | Settings'e `channel_id` scope ekle. Cascade: system → admin → channel → user |
| **Platform-specific settings** | `youtube.upload.default_privacy`, `instagram.post.default_caption_template` |
| **Interaction settings** | `platform.comments.auto_reply_enabled`, `platform.comments.spam_filter_level` |

### 4.3 Template System İyileştirmeleri

| İyileştirme | Detay |
|-------------|-------|
| **Channel-bound templates** | Channel'a özel şablonlar. System → Channel hierarchy |
| **Platform-optimized variants** | Aynı template'in YouTube (16:9) ve TikTok (9:16) varyantları |
| **Brand Kit integration** | Template render'da channel brand kit'ten logo/renk/font otomatik enjekte |

### 4.4 Source Management İyileştirmeleri

| İyileştirme | Detay |
|-------------|-------|
| **Channel-source binding** | Her channel kendi kaynak havuzunu seçer |
| **Source quality scoring** | Kaynağın tarihsel doğruluk, hız, çeşitlilik skoru |
| **Auto-categorize** | Yeni haberi otomatik kategorize et (keyword-based v1, AI-assisted v2) |

### 4.5 Publish System İyileştirmeleri

| İyileştirme | Detay |
|-------------|-------|
| **Multi-platform dispatch** | Tek içerikten YouTube + Instagram + X'e aynı anda gönder |
| **Platform-specific metadata** | Her platform için ayrı başlık, açıklama, tag, thumbnail |
| **Scheduled publish** | Takvimden gelen zamanlı yayın |
| **Publish retry with backoff** | Platform API hatasında exponential backoff ile retry |
| **Cross-post tracking** | Aynı içeriğin farklı platformlardaki yayın ID'lerini bağla |

---

## BÖLÜM 5: Önerilerim

### 5.1 Hemen Eklenebilecek Yüksek Değerli Özellikler

1. **Smart Reply Önerileri**: Yorumlara AI-destekli 2-3 hazır cevap öner. Kullanıcı seçer veya düzenler. Backend'de basit bir prompt + settings registry'den yönetilen ton/dil ayarı.

2. **Best Time to Publish**: Platform API'den tarihsel veri çek → hangi saat/gün en iyi performans → takvime otomatik öner. Başlangıçta YouTube Analytics API yeterli.

3. **Thumbnail A/B Test**: Aynı video için 2 thumbnail yükle, YouTube'un kendi A/B test özelliğini tetikle (API desteği varsa), yoksa 48 saat sonra swap et ve karşılaştır.

4. **Content Repurposing Wizard**: "Bu videoyu kısa kliplere dönüştür" — kullanıcı zaman aralıkları seçer, her klip ayrı job olarak 9:16'da render edilir. TikTok/Reels/Shorts için.

5. **Performance Alert System**: "Bu videonun CTR'ı ortalamanın %50 altında" gibi otomatik bildirimler. Threshold'lar Settings Registry'den yönetilir.

### 5.2 Orta Vadede Eklenmesi Gereken Sistemler

6. **Competitor Tracking**: Belirli YouTube kanallarını kaynak olarak ekle, ne tür içerik üretiyor izle, trend tespiti yap. Mevcut source scan altyapısı genişletilebilir.

7. **SEO Optimization Module**: Video başlığı/açıklaması için keyword önerileri. YouTube Search API + Google Trends API. Settings'den yönetilen sektör/niche parametreleri.

8. **Collaboration & Approval Flow**: Birden fazla kullanıcı aynı channel üzerinde çalışabilir. Editor → Reviewer → Publisher role chain. İlk aşamada basit "onay bekliyor" state yeterli.

9. **Template Marketplace (Local)**: Kullanıcılar arası template paylaşımı. Admin onaylı. System templates + shared templates + private templates hierarchy.

10. **Webhook & External Trigger**: Dış sistemden HTTP webhook ile pipeline tetikleme. Otonom üretim altyapısı için gerekli. `POST /api/webhooks/trigger` → job başlat.

### 5.3 Mimari Öneriler

- **Grafik kütüphanesi**: Recharts (React-native, TypeScript, lightweight, SSR-ready)
- **OAuth yönetimi**: Platform token'ları encrypted olarak DB'de, refresh otomatik. Token expire bildirimi.
- **API Rate Limiting**: Her platform adapter'ında rate limit tracking. YouTube quota (10K/gün), Instagram rate limit, vs.
- **Event bus genişletme**: SSE'nin yanına internal event bus ekle. `job.completed` → auto-publish trigger, `comment.received` → notification, `threshold.exceeded` → alert

---

## BÖLÜM 6: Revize Edilmiş Uygulama Sırası

### Faz 1: Temel Altyapı (Öncelik: Kritik)
```
1.1  Channel modeli & DB migration
1.2  Channel CRUD backend (service, repository, router)
1.3  Job model'e channel_id ekleme & migration
1.4  Settings Registry'ye channel scope ekleme
1.5  VideoPlayer & MediaPreview component
1.6  QuickLook modal & Zustand store
```

### Faz 2: User Panel Kabuğu (Öncelik: Kritik)
```
2.1  User sidebar yeniden yapılandırma
2.2  User dashboard sayfası (channel kartları, son işler, hızlı aksiyon)
2.3  Channel yönetim sayfası (oluştur, düzenle, platform bağla)
2.4  Brand Kit editör sayfası (basit v1)
```

### Faz 3: İçerik Üretimini User'a Taşıma (Öncelik: Kritik)
```
3.1  Wizard component'lerini shared'a çıkar
3.2  User panel wizard route'ları (/user/create/video, /user/create/bulletin)
3.3  Wizard'larda channel seçimi adımı ekle
3.4  Admin panelden wizard kaldır, redirect ekle
```

### Faz 4: Job & Video Display (Öncelik: Yüksek)
```
4.1  Job detail "Çıktı" tab'ına VideoPlayer
4.2  Job list side panel media preview
4.3  QuickLook entegrasyonu
4.4  User dashboard son üretimler video kartları
4.5  Artifact model media_type field & migration
```

### Faz 5: Admin Dashboard Dönüşümü (Öncelik: Yüksek)
```
5.1  Recharts kurulumu
5.2  Operasyonel özet kartları (kümülatif + user/channel filtre)
5.3  Günlük üretim bar chart
5.4  Modül dağılımı pie chart
5.5  Hata trendi line chart
5.6  Kaynak sağlık heatmap
5.7  Filtre sistemi: user dropdown, channel dropdown, tarih aralığı
```

### Faz 6: Multi-Platform Publish (Öncelik: Yüksek)
```
6.1  Platform adapter pattern genişletme (YouTube dışı)
6.2  ChannelPlatform OAuth flow (Google başlangıç, sonra diğerleri)
6.3  Multi-platform publish step (tek job → N platform)
6.4  Platform-specific metadata form
6.5  Scheduled publish altyapısı
6.6  User publish sayfası
6.7  Admin publish log (kümülatif, filtreli)
```

### Faz 7: Platform Etkileşim v1 — YouTube (Öncelik: Yüksek)
```
7.1  YouTube Comments API entegrasyonu (pull)
7.2  Yorum listesi sayfası (user panel)
7.3  Yorum cevaplama (push)
7.4  YouTube Playlist API entegrasyonu
7.5  Playlist yönetim sayfası
7.6  Community Post API (varsa)
7.7  Etkileşim bildirimleri (NotificationCenter genişletme)
```

### Faz 8: Gelişmiş Analytics (Öncelik: Orta-Yüksek)
```
8.1  Analytics backend genişletme (channel, platform dimension)
8.2  Platform API'den metrik çekme (views, likes, comments, subscribers)
8.3  User channel analytics sayfası
8.4  Admin platform karşılaştırma sayfası
8.5  En iyi performans saatleri heatmap
8.6  İçerik performans tablosu
8.7  Büyüme trendi multi-line chart
8.8  Thumbnail CTR karşılaştırma
```

### Faz 9: İçerik Takvimi (Öncelik: Orta)
```
9.1  ScheduledContent modeli & migration
9.2  Takvim backend (CRUD, tarih sorgulama)
9.3  Takvim frontend (aylık grid görünüm)
9.4  Takvim → Job tetikleme bağlantısı
9.5  Best time to publish önerisi (v1, basit)
```

### Faz 10: Platform Etkileşim v2 — Diğer Platformlar (Öncelik: Orta)

Tamam, çok önemli bir perspektif değişikliği var burada. Tek kullanıcılı bir üretim aracından **çok kanallı (multi-channel), çok kullanıcılı bir içerik operasyonu platformuna** geçiş planlıyorsun. Bunu doğru anlamak için mevcut sistemi bir kez daha hızlıca tarayıp, sonra kapsamlı yeni planı yazayım.