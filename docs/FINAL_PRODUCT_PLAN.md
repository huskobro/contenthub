# ContentHub — Final Product Plan v3 (Birleştirilmiş)

Tarih: 2026-04-08
Durum: Çalışan omurga var, domain modeli ve ürün mimarisi son ürün hedefiyle yeniden organize edildi.
Bu doküman Sonnet ile uygulanmak üzere hazırlanmıştır.

---

## 0. Değişmez Kararlar

Bu bölüm planın temelidir. Fazlar değişebilir, öncelikler kayabilir ama bu kararlar sabit kalır.

1. **User ≠ Gmail** — ContentHub iç kullanıcı hesabı ayrı, platform bağlantıları ayrı
2. **ChannelProfile ≠ PlatformConnection** — kavramsal yayın profili ile gerçek platform hesabı birbirine karışmaz
3. **User panel proje odaklı** — kullanıcı "Job" değil "ContentProject" görür
4. **Admin panel kümülatif + filtreli** — her veri hem toplam hem user/channel/platform bazlı filtrelenebilir
5. **User'a taşınan metrikler admin'den kaldırılmaz** — admin her şeyi görmeye devam eder
6. **AI yardımcı, zorunlu değil** — her AI özelliğinin manuel alternatifi olur
7. **PublishRecord genişletilir** — yeni paralel publish entity açılmaz
8. **AutomationPolicy channel bazlıdır** — her ChannelProfile kendi otomasyon seviyesini belirler
9. **ChannelProfile olmadan üretim başlamaz** — her içerik bir kanal bağlamında üretilir
10. **Branding sonra, ama domain model şimdiden uyumlu** — BrandProfile şimdiden tanımlı, studio daha sonra
11. **Otonom pipeline ilk günden tasarlanır** — executor sonra açılsa da model, state machine, audit şimdiden kurulur
12. **Manuel kontrol hiçbir zaman tamamen kaybolmaz** — Level 3 otonomda bile audit, trace, fail-safe zorunlu
13. **Visibility, auth ve settings governance birbirinin yerine kullanılmaz** — role bazlı auth, feature bazlı visibility, setting governance ayrı katmanlar
14. **Login auth ≠ Platform auth** — kullanıcı girişi JWT/email-password, platform bağlantısı OAuth. Karışmaz
15. **Platform auth wizard'ı yönlendirmeli ama kullanıcı onayı olmadan tam bağlama yapmaz**
16. **Hardcoded davranış yasak** — her önemli davranış, threshold, default, metin admin panelden kontrol edilebilir ve Settings Registry'de tanımlı olmalı

---

## 1. Ürün Amacı

ContentHub, birden fazla kullanıcı için farklı içerik iş modelleri kurabilen, her kullanıcının birden fazla kanal/platform profili yönetebildiği, içerik üretimi → inceleme → yayın → takip → etkileşim zincirini tek uygulama içinde yöneten bir operasyon platformudur.

Son hedef:
- Kullanıcıların kendi içerik üretim akışlarını yönetebilmesi
- Admin'in tüm sistemi hem kümülatif hem kullanıcı bazlı izleyebilmesi
- İçeriklerin farklı platformlara dağıtılabilmesi
- İleride tam otonom içerik üretim ve yayın pipeline'ına geçilebilmesi
- Manuel kontrolün hiçbir zaman tamamen kaybolmaması

---

## 2. Ürün İlkeleri

- Tek ürün, iki yüzey: admin ve user
- Aynı veri omurgası, farklı görünüm ve yetki
- Her önemli davranış görünür olacak
- Gizli pipeline davranışı olmayacak
- Admin default + user override modeli korunacak
- Kullanıcı birden fazla kanal ekleyebilecek
- Manuel akış her zaman korunacak
- AI yardımı opsiyonel, zorunlu değil
- Otonom pipeline sonradan eklenecekmiş gibi değil, baştan tasarlanacak

Vazgeçilenler:
- Gmail hesabını kullanıcı modeli yapmak
- İlk etapta tam enterprise RBAC/organization yapısına kaçmak
- Her şeyi "AI yazsın ve göndersin" mantığına bırakmak

---

## 3. Domain Modeli

### 3.1 User
ContentHub iç kullanıcı hesabı.

| Field | Tip | Not |
|-------|-----|-----|
| id | UUID | PK |
| email | string (unique) | Login kimliği |
| password_hash | string | bcrypt |
| display_name | string | |
| slug | string (unique) | Filesystem-safe, workspace path'lerde kullanılır |
| role | enum | admin / user |
| status | enum | active / inactive |
| preferences | JSON? | UI tercihleri |
| created_at, updated_at | datetime | UTC |

Auth: JWT (email/password login + refresh token). Google OAuth SADECE platform bağlantısı için.

### 3.2 ChannelProfile
Kullanıcının sahip olduğu kavramsal içerik yayın profili. Bir kullanıcı birden fazla profile sahip olabilir.

Örnekler: "Ana YouTube Kanalı", "Shorts Kanalı", "İngilizce Haber Kanalı", "TikTok Spor Profili"

| Field | Tip | Not |
|-------|-----|-----|
| id | UUID | PK |
| user_id | UUID | FK → User |
| profile_name | string | Kullanıcının verdiği isim |
| profile_type | string? | video_channel / news_channel / shorts_channel vb. |
| default_language | string | tr, en, vb. |
| default_content_mode | string? | standard_video / news_bulletin |
| brand_profile_id | UUID? | FK → BrandProfile (nullable — ilk kurulumda brandsiz kanal açılabilir, sonra bağlanır) |
| automation_policy_id | UUID? | FK → AutomationPolicy |
| channel_slug | string (unique per user) | Filesystem-safe (workspace path'lerde ve filtrelerde kullanılır) |
| status | enum | active / paused / archived |
| notes | text? | |
| created_at, updated_at | datetime | UTC |

### 3.3 PlatformConnection
Bir ChannelProfile'ın bağlandığı gerçek platform hesabı.

| Field | Tip | Not |
|-------|-----|-----|
| id | UUID | PK |
| channel_profile_id | UUID | FK → ChannelProfile |
| platform | enum | youtube / tiktok / instagram / x / facebook |
| external_account_id | string | Platform'daki hesap/kanal ID |
| external_account_name | string | Platform'daki görünen isim |
| external_avatar_url | string? | |
| auth_state | enum | connected / expired / revoked / pending |
| token_state | enum | valid / expiring_soon / expired / invalid |
| scopes_granted | string | Verilen OAuth scope'ları |
| scopes_required | string | Gerekli scope'lar (karşılaştırma için) |
| scope_status | enum | full / partial / insufficient — scopes_granted vs scopes_required karşılaştırma |
| features_available | JSON | {comments: true, playlists: true, community_posts: false, ...} |
| connection_status | enum | healthy / degraded / disconnected — genel bağlantı sağlığı |
| requires_reauth | bool | True ise kullanıcıya yeniden bağlanma wizard'ı gösterilir (token_state + scope_status'tan türetilir) |
| sync_status | enum | synced / stale / failed / never |
| last_sync_at | datetime? | Son veri senkronizasyonu |
| last_success_at | datetime? | Son başarılı API iletişimi |
| last_error | text? | Son hata mesajı |
| is_primary | bool | Bu profildeki birincil platform mı |
| subscriber_count | int? | Son bilinen abone/takipçi sayısı |
| created_at, updated_at | datetime | UTC |

### 3.4 PlatformCredential (ayrı tablo, güvenlik)

| Field | Tip | Not |
|-------|-----|-----|
| id | UUID | PK |
| platform_connection_id | UUID | FK → PlatformConnection (1:1) |
| access_token | string | Fernet encrypted |
| refresh_token | string | Fernet encrypted |
| token_expiry | datetime | |
| client_id | string | OAuth client |
| client_secret | string | Fernet encrypted |
| scopes | string | |
| raw_token_response | JSON? | Debug/audit için |

### 3.5 ContentProject
Üretilecek içerik için iş düzeyi üst varlık. Kullanıcının gördüğü birincil entity.

| Field | Tip | Not |
|-------|-----|-----|
| id | UUID | PK |
| user_id | UUID | FK → User |
| channel_profile_id | UUID | FK → ChannelProfile (NOT NULL) |
| module_type | string | standard_video / news_bulletin / shorts / ... |
| title | string | İçerik başlığı |
| description | text? | |
| current_stage | string | script / metadata / tts / render / review / publish / engagement |
| content_status | enum | draft / producing / ready / archived |
| review_status | enum | pending / approved / rejected / not_required |
| publish_status | enum | unpublished / scheduled / published / failed |
| primary_platform | string? | youtube / tiktok / instagram / x (ana hedef platform) |
| origin_type | enum | original / repurpose / shorts_adaptation / community_derivative |
| priority | enum | low / normal / high / urgent (Operations Inbox sıralaması) |
| deadline_at | datetime? | Hedef tamamlanma tarihi (takvim entegrasyonu) |
| active_job_id | UUID? | Şu an çalışan/son job |
| latest_output_ref | string? | Son çıktı artifact path |
| created_at, updated_at | datetime | UTC |

### 3.6 Job (Mevcut — Genişletilmiş)
Teknik execution kaydı. Mevcut job sistemi korunur.

Eklenen alanlar:
| Field | Tip | Not |
|-------|-----|-----|
| channel_profile_id | UUID? | FK → ChannelProfile (nullable geçiş dönemi, sonra NOT NULL) |
| content_project_id | UUID? | FK → ContentProject (nullable geçiş dönemi) |
| autopilot_rule_id | UUID? | Otonom pipeline tarafından oluşturulmuşsa |
| trigger_source | enum | manual / automation / batch / clone |

### 3.7 PublishRecord (Mevcut — Genişletilmiş)
Mevcut model korunur ve genişletilir.

Eklenen alanlar:
| Field | Tip | Not |
|-------|-----|-----|
| content_project_id | UUID? | FK → ContentProject |
| platform_connection_id | UUID? | FK → PlatformConnection |
| publish_intent | JSON | Kullanıcının istediği: {platform, privacy, title, description, tags, playlist_id, schedule_at, ...} |
| publish_result | JSON | Sistemin yaptığı: {platform_video_id, platform_url, actual_privacy, error_code, ...} |

Bu ayrımla tek model içinde hem planlanan hem gerçekleşen yayın izlenebilir.

### 3.8 EngagementTask
Platform sonrası aksiyonlar için generic görev modeli.

| Field | Tip | Not |
|-------|-----|-----|
| id | UUID | PK |
| user_id | UUID | FK → User |
| channel_profile_id | UUID | FK → ChannelProfile |
| content_project_id | UUID? | FK → ContentProject (varsa) |
| platform_connection_id | UUID | FK → PlatformConnection |
| type | enum | comment_reply / playlist_add / community_post / share_post / metadata_update / pin_comment / repost |
| target_object_type | string | video / comment / playlist / post |
| target_object_id | string | Platform'daki hedef nesne ID |
| payload | JSON | Tip'e göre değişen veri |
| ai_suggestion | text? | AI'ın önerdiği metin |
| final_user_input | text? | Kullanıcının onayladığı/düzenlediği metin |
| status | enum | pending / in_progress / completed / failed / cancelled |
| scheduled_for | datetime? | Zamanlanmış aksiyonlar (community post, share post vb.) |
| error_message | string? | |
| executed_at | datetime? | |
| created_at, updated_at | datetime | UTC |

State machine: pending → in_progress → completed/failed. Manuel retry: failed → pending.

### 3.9 BrandProfile
İçeriklerin marka kimliği. İlk fazda basit, ileride Branding Studio'nun temeli.

| Field | Tip | Not |
|-------|-----|-----|
| id | UUID | PK |
| owner_user_id | UUID | FK → User |
| brand_name | string | |
| palette | JSON | {primary, secondary, accent, background, text} |
| typography | JSON | {heading_font, body_font, caption_font} |
| motion_style | string? | minimal / dynamic / cinematic |
| logo_path | string? | |
| watermark_path | string? | |
| watermark_position | string? | |
| intro_template_id | UUID? | |
| outro_template_id | UUID? | |
| lower_third_defaults | JSON? | |
| created_at, updated_at | datetime | UTC |

### 3.10 AutomationPolicy
Otonom pipeline politikaları. Channel bazlı.

| Field | Tip | Not |
|-------|-----|-----|
| id | UUID | PK |
| channel_profile_id | UUID | FK → ChannelProfile |
| automation_level | enum | manual (L0) / ai_suggest (L1) / semi_auto (L2) / full_auto (L3) |

Checkpoint bazlı kontrol (her biri: `auto` / `review_required` / `disabled`):
| Checkpoint | Varsayılan |
|------------|-----------|
| source_scan | auto |
| draft_generation | review_required |
| render | auto |
| publish | review_required |
| post_publish_engagement | disabled |

Ek alanlar:
| Field | Tip | Not |
|-------|-----|-----|
| publish_windows | JSON? | [{day: "mon-fri", start: "09:00", end: "18:00"}] |
| max_daily_posts | int | Günlük max yayın limiti |
| platform_specific_rules | JSON? | Platform bazlı özel kurallar |
| status | enum | active / paused / disabled |
| created_at, updated_at | datetime | UTC |

---

## 4. Panel Sorumlulukları

### 4.1 User Panel — Üretim Merkezi

| Alan | İşlev |
|------|--------|
| **Dashboard** | Kanal kartları, son projeler, aktif işler, mini grafikler |
| **Kanallarım** | ChannelProfile CRUD, platform bağlama, bağlantı sağlığı |
| **Oluştur** | Video wizard, bülten wizard (ChannelProfile seçimli) |
| **Projelerim** | ContentProject listesi (ana yüzey), filtre: kanal/modül/durum |
| **Proje Detay** | Job'lar, publish kayıtları, engagement task'lar, analytics özeti, video player |
| **Yayınla** | Publish flow (kanal → platform → metadata → playlist → zamanlama) |
| **Platform** | Yorumlar, playlist, gönderi (EngagementTask yönetimi) |
| **Analytics** | Kendi kanal performansı, grafikler |
| **Kaynaklar** | Salt okunur kaynak listesi |
| **Şablonlar** | Seçim galerisi (preview-first) |
| **Bağlantı Merkezi** | Tüm platform bağlantıları, scope, health, sync, eksik yetkiler |
| **Operasyon Kutusu** | Review bekleyenler, publish fail, yorum bekleyenler, automation uyarıları — tek merkez |
| **Ayarlarım** | Kişisel override'lar |

### 4.2 Admin Panel — Operasyon Merkezi

| Alan | İşlev | Filtre |
|------|--------|--------|
| **Dashboard** | KPI kartları + grafikler | Kümülatif / User / Channel / Platform |
| **Kullanıcılar** | User CRUD, kanal bağlantıları | — |
| **Projeler** | Tüm ContentProject'ler | User / Channel / Modül / Durum |
| **İşler** | Tüm Job'lar | User / Channel / Modül / Durum |
| **Yayın Logları** | Tüm PublishRecord'lar | User / Channel / Platform |
| **Engagement** | Tüm EngagementTask'lar | User / Channel / Platform / Tip |
| **Kaynaklar** | Source CRUD, sağlık, tarama | — |
| **Şablonlar** | Template/Blueprint CRUD | — |
| **Stiller** | Style Blueprint yönetimi | — |
| **Analytics** | Detaylı metrikler + grafikler | Kümülatif / User / Channel / Platform |
| **Ayarlar** | Global + override yönetimi | — |
| **Görünürlük** | Visibility rules | — |
| **Audit Log** | Tüm sistem aksiyonları | User / Channel |
| **Otomasyon** | AutomationPolicy yönetimi | User / Channel |
| **Bağlantı Merkezi** | Tüm platform bağlantıları, health, sync durumu | User / Channel / Platform |
| **Operasyon Kutusu** | Review bekleyenler, publish fail, yorum bekleyenler, uyarılar | User / Channel |

Admin'de global filtre bar her sayfanın üstünde:
- User dropdown
- Channel Profile dropdown (user seçilince populate)
- Platform dropdown
- Tarih aralığı seçici

---

## 5. Analytics Katmanları

### 5.1 User Analytics (User Panel)
- Son 7/30 günde üretilen içerik sayısı
- Platform bazlı yayın dağılımı
- Kişisel başarı oranı
- Kanal bazlı performans
- Review/publish backlog

### 5.2 Channel/Profile Analytics (Her İki Panel)
- Kanal bazlı içerik sayısı
- Platform bazlı dağılım
- Yayın başarı oranı
- Etkileşim oranları (yorum cevabı, playlist ekleme)
- Platform metrikleri (views, likes, comments, subscribers)

### 5.3 Admin/Global Analytics (Admin Panel)

İki sabit görünüm:

**Operasyon Görünümü:**
- Queue health, aktif iş sayısı, hata oranı
- Provider error rate, retry rate
- Scan sağlığı, kaynak health
- Render süreleri, step bottleneck analizi

**İş Sonuçları Görünümü:**
- İçerik üretim sayısı, publish başarı oranı
- Engagement metrikleri (yorum cevabı, playlist, gönderi)
- Platform bazlı dağılım
- Modül bazlı throughput

Her iki görünümde: kümülatif + user / channel / platform / date filtreli

### 5.4 Grafikler

Standart 5 chart component:
1. **TrendChart** — zaman serisi (Area/Line): günlük üretim, view trendi, abone büyüme
2. **DistributionDonut** — dağılım: platform, modül, durum
3. **ComparisonBar** — karşılaştırma: video bazlı etkileşim, user bazlı throughput
4. **StatusGrid** — durum haritası: kaynak sağlığı, platform bağlantı durumu
5. **PublishHeatmap** — yayın zamanı × performans matrisi (gün×saat)

Kütüphane: **recharts** (React-native, lightweight, responsive)

Grafik kullanılacak yerler:
| Sayfa | Chart | Veri |
|-------|-------|------|
| Admin Dashboard | TrendChart | Günlük üretim (30 gün) |
| Admin Dashboard | DistributionDonut × 2 | Platform dağılımı, modül dağılımı |
| Admin Dashboard | StatusGrid | Kaynak sağlığı |
| Admin Analytics | ComparisonBar | User bazlı throughput |
| Admin Analytics | TrendChart | Haftalık başarı oranı |
| Admin Analytics | TrendChart | Publish success/failure trendi |
| Admin Analytics | TrendChart | Engagement task completion trendi |
| Channel Performance | TrendChart | View/like/comment trendi |
| Channel Performance | ComparisonBar | Video bazlı etkileşim oranları |
| Channel Performance | HeatmapChart* | Yayın zamanı × performans |
| User Dashboard | Sparkline (mini TrendChart) | Kanal kartlarında son 7 gün |
| Proje Detay | ComparisonBar | Platform bazlı reach |

*HeatmapChart: 5. chart component olarak ihtiyaç halinde eklenir.

---

## 6. Platform Sonrası Aksiyonlar (Engagement Center)

### 6.1 Desteklenen Aksiyonlar

| Platform | Pull (Çekme) | Push (Gönderme) |
|----------|-------------|-----------------|
| **YouTube** | Yorumlar, video stats, abone bildirimleri | Yorum cevabı, playlist ekleme, community post, açıklama güncelleme, pin comment |
| **Instagram** | Yorumlar, story views | Yorum cevabı (gelecek: story paylaşma) |
| **TikTok** | Yorumlar, video stats | Yorum cevabı |
| **X/Twitter** | Mention'lar, yanıtlar | Tweet, yanıt, alıntı tweet |

### 6.2 Çalışma Modları

Her aksiyon iki modda çalışır:
- **Manuel**: Kullanıcı kendi metnini yazar
- **AI yardımlı**: "AI ile Öner" → metin üretilir → kullanıcı onaylar/düzenler

### 6.3 AssistedComposer — Shared Component

Tüm metin girişi gerektiren yerlerde kullanılacak tek paylaşılan editör:

```
AssistedComposer
├── Boş başla (textarea)
├── "AI ile Öner" butonu → AI metin üretir
├── "Yeniden Üret" butonu → farklı varyant
├── Manuel düzenleme (her zaman mümkün)
├── "Onayla & Gönder" butonu
└── Geçmiş öneriler (opsiyonel)
```

Kullanım yerleri:
- Yorum yanıtı
- Video açıklaması
- Community post metni
- Playlist açıklaması
- Publish caption
- Video başlığı önerisi

Props:
```typescript
interface AssistedComposerProps {
  context: string;           // "comment_reply" | "description" | "community_post" | ...
  contextData?: object;      // Orijinal yorum metni, video bilgisi vb.
  placeholder?: string;
  aiEnabled?: boolean;       // AI önerisi aktif mi (settings'den)
  onSubmit: (text: string) => void;
  onCancel?: () => void;
}
```

AI çağrısı Faz 7-9'da UI placeholder olarak eklenir. Gerçek AI entegrasyonu ayrı faz.

---

## 7. PlatformConnection Health Paneli

Her platform bağlantısı için görünür sağlık durumu:

| Kontrol | Gösterim |
|---------|----------|
| Token geçerli mi? | ✅ Geçerli / ⚠️ Yakında dolacak / ❌ Expired |
| Scope yeterli mi? | ✅ Tam / ⚠️ Eksik scope'lar listelenir |
| Son sync ne zaman? | 2 saat önce / ⚠️ 24 saat önce / ❌ Hiç sync olmadı |
| Hangi özellikler kullanılabilir? | ✅ Upload, ✅ Comments, ✅ Playlists, ❌ Community Posts |
| API rate limit durumu? | ✅ Normal / ⚠️ %80 kullanıldı / ❌ Limit aşıldı |

Bu panel:
- User: "Kanallarım" sayfasında her platform bağlantısında
- Admin: Sistem sağlığı görünümünde kümülatif

Token expire yaklaşınca → bildirim gönder.
Token expired olduğunda → platform aksiyonları blokla, yeniden bağlama wizard'ı göster.

---

## 8. Otonom Pipeline Tasarımı

### 8.1 Seviyeler

| Seviye | Ad | Davranış |
|--------|----|----------|
| L0 | Manuel | Her adım kullanıcı tarafından tetiklenir |
| L1 | AI Önerir | AI öneri üretir, kullanıcı onaylar |
| L2 | Yarı Otomatik | Sistem çalışır, belirlenen checkpoint'lerde durur |
| L3 | Tam Otonom | Tüm akış otomatik, audit + fail-safe zorunlu |

### 8.2 Checkpoint Modeli

5 checkpoint, her biri 3 durumdan birinde:

| Checkpoint | auto | review_required | disabled |
|------------|------|-----------------|----------|
| **source_scan** | Yeni haber otomatik taranır | Tarama sonucu onay bekler | Tarama kapalı |
| **draft_generation** | Script/metin otomatik üretilir | Taslak onay bekler | Manuel girdi |
| **render** | Render otomatik başlar | Render öncesi önizleme onayı | Manuel tetikleme |
| **publish** | Otomatik yayınlanır | Yayın öncesi onay | Manuel yayın |
| **post_publish** | Yorum cevabı/post otomatik | Engagement öncesi onay | Manuel engagement |

L0'da hepsi disabled veya review_required.
L3'te hepsi auto (ama audit trail zorunlu).

### 8.3 Şimdi Yapılacaklar (Model + UI, Executor Yok)

- AutomationPolicy CRUD
- UI: seviye seçimi, checkpoint kontrolleri
- Job modeline trigger_source eklenmesi (manual/automation/batch/clone)
- Audit trail'de otonom vs. manual ayrımı
- Settings Registry'de otomasyon ayarları

---

## 9. Auth Sistemi

### 9.1 Karar: Email/Password + JWT

- Login: email + password → JWT access token + refresh token
- Register: email + password + display_name
- Refresh: refresh token → yeni access token
- Password: bcrypt hash
- İlk admin: seed veya CLI ile oluşturulur

### 9.2 Google OAuth — Sadece Platform Bağlantısı

Google OAuth akışı SADECE PlatformConnection (YouTube) bağlamak için kullanılır.
Kullanıcı kimliği ile ilgisi yoktur.

### 9.3 Middleware

```python
# Her endpoint'te
current_user = Depends(get_current_user)  # JWT'den

# Admin-only endpoint'lerde
Depends(require_admin)

# User endpoint'lerde
Depends(require_user)
```

### 9.4 Mevcut Header-Based Auth Geçişi

Geçiş dönemi: JWT yoksa eski header-based auth fallback olarak çalışır.
Tüm endpoint'ler JWT'ye geçince header-based kaldırılır.

---

## 10. Mevcut Sistem İyileştirmeleri

### 10.1 Job Engine
- `channel_profile_id` + `content_project_id` FK eklenmesi
- `trigger_source` field (manual/automation/batch/clone)
- Channel bazlı workspace: `workspace/users/{slug}/channels/{channel_slug}/jobs/`

### 10.2 Publish Flow
- `publish_intent` + `publish_result` JSON ayrımı (PublishRecord'da)
- `platform_connection_id` FK (hangi bağlantıdan yayınlandı)
- Playlist atama adımı
- Post-publish otomatik aksiyonlar (opsiyonel)

### 10.3 Settings Registry
- Channel scope eklenmesi: system → admin → channel → user cascade
- Platform-specific settings: `youtube.upload.default_privacy`, vb.
- Engagement settings: `engagement.comments.ai_reply_enabled`, vb.

### 10.4 Source Engine
- User bazlı kaynak abonelikleri (admin global kaynak ekler, user favori seçer)
- Kaynak performans skoru (bu kaynaktan üretilen içeriklerin performansı)

### 10.5 Token Store Refactor
- Mevcut `data/youtube_tokens.json` → PlatformCredential DB tablosuna migrasyon
- Fernet encryption at rest
- Token refresh cron job
- OAuth revocation handling

---

## 11. Dosya Yapısı

### Backend Yeni Modüller

```
backend/app/
├── auth/                          ← YENİ
│   ├── router.py                  # /api/auth/login, /register, /refresh
│   ├── service.py                 # JWT oluşturma, doğrulama
│   ├── dependencies.py            # get_current_user, require_admin, require_user
│   ├── jwt.py                     # Token encode/decode
│   └── schemas.py
├── channels/                      ← YENİ
│   ├── models.py                  # ChannelProfile, PlatformConnection, PlatformCredential
│   ├── router.py                  # /api/channels/*
│   ├── service.py
│   ├── schemas.py
│   ├── health.py                  # Platform connection health check
│   └── oauth/                     # Platform OAuth adapters
│       ├── base.py
│       ├── youtube.py
│       ├── tiktok.py
│       └── instagram.py
├── content_projects/              ← YENİ
│   ├── models.py                  # ContentProject
│   ├── router.py                  # /api/projects/*
│   ├── service.py
│   └── schemas.py
├── engagement/                    ← YENİ
│   ├── models.py                  # EngagementTask
│   ├── router.py                  # /api/engagement/*
│   ├── service.py
│   ├── schemas.py
│   └── adapters/                  # Platform API adapters
│       ├── youtube_comments.py
│       ├── youtube_playlists.py
│       ├── youtube_community.py
│       └── ... (diğer platformlar)
├── brand_profiles/                ← YENİ
│   ├── models.py                  # BrandProfile
│   ├── router.py
│   ├── service.py
│   └── schemas.py
├── automation/                    ← YENİ
│   ├── models.py                  # AutomationPolicy
│   ├── router.py
│   ├── service.py
│   ├── schemas.py
│   └── executor.py               # DEVRE DIŞI — gelecek faz
```

### Frontend Yeni Component'ler

```
frontend/src/
├── components/shared/
│   ├── VideoPlayer.tsx            ← YENİ
│   ├── MediaPreview.tsx           ← YENİ
│   ├── QuickLookModal.tsx         ← YENİ
│   ├── AssistedComposer.tsx       ← YENİ (AI/manual hibrit editör)
│   ├── ChannelCard.tsx            ← YENİ
│   ├── ChannelPicker.tsx          ← YENİ
│   ├── PlatformHealthBadge.tsx    ← YENİ
│   ├── AdminFilterBar.tsx         ← YENİ (user/channel/platform/date)
│   └── charts/                    ← YENİ
│       ├── TrendChart.tsx
│       ├── DistributionDonut.tsx
│       ├── ComparisonBar.tsx
│       ├── StatusGrid.tsx
│       └── PublishHeatmap.tsx
├── pages/user/
│   ├── UserDashboard.tsx          ← YENİDEN YAZILIR
│   ├── MyChannelsPage.tsx         ← YENİ
│   ├── ChannelDetailPage.tsx      ← YENİ
│   ├── CreateVideoPage.tsx        ← YENİ (shared wizard kullanır)
│   ├── CreateBulletinPage.tsx     ← YENİ (shared wizard kullanır)
│   ├── MyProjectsPage.tsx         ← YENİ (ana yüzey)
│   ├── ProjectDetailPage.tsx      ← YENİ (jobs + publish + engagement + analytics)
│   ├── PublishPage.tsx            ← YENİ
│   ├── CommentsPage.tsx           ← YENİ
│   ├── PlaylistsPage.tsx          ← YENİ
│   ├── CommunityPostsPage.tsx     ← YENİ
│   ├── MyAnalyticsPage.tsx        ← YENİ
│   ├── ConnectionCenterPage.tsx   ← YENİ (tüm platform bağlantıları, health, sync)
│   ├── OperationsInboxPage.tsx    ← YENİ (review, fail, yorum, uyarı — tek merkez)
│   └── MySettingsPage.tsx         ← GÜNCELLENİR
├── pages/admin/
│   ├── AdminDashboard.tsx         ← YENİDEN YAZILIR (KPI + grafikler)
│   ├── ChannelManagementPage.tsx  ← YENİ
│   ├── ProjectsOverviewPage.tsx   ← YENİ
│   ├── EngagementOverviewPage.tsx ← YENİ
│   ├── AutomationPoliciesPage.tsx ← YENİ
│   └── (mevcut sayfalar korunur, AdminFilterBar eklenir)
└── stores/
    ├── quickLookStore.ts          ← YENİ
    └── authStore.ts               ← YENİ
```

---

## 12. Uygulama Fazları

> **Not (2026-04-18):** Bu §12 faz listesi tarihsel referans olarak korunmuştur.
> Aktif uygulama sırası `docs/redesign/` (REV-2 dalga planları) ve
> `docs/tracking/STATUS.md` tarafından yönetilmektedir.
> REV-2 IMPL dalgası (19 madde) 2026-04-18'de main'e merge edildi.

### Faz 1: Altyapı + Hemen Görünür İyileştirmeler (4-5 saat)
```
1.1  VideoPlayer component
1.2  MediaPreview wrapper (artifact tipine göre viewer seçimi)
1.3  QuickLookModal + quickLookStore (Zustand)
1.4  Artifact modeline media_type field + Alembic migration
1.5  Job Detail "Çıktılar" tab'ına VideoPlayer entegrasyonu
1.6  Job list side panel'e media preview
1.7  QuickLook bağlantısı (göz ikonu veya keyboard shortcut)
1.8  recharts kurulumu
1.9  5 standart chart component (TrendChart, DistributionDonut, ComparisonBar, StatusGrid, PublishHeatmap)
```

### Faz 2: Domain Model (5-6 saat)
```
2.1   ChannelProfile modeli + Alembic migration
2.2   PlatformConnection modeli + migration
2.3   PlatformCredential modeli (Fernet encrypted) + migration
2.4   ContentProject modeli + migration
2.5   EngagementTask modeli (generic: type/target_object_type/target_object_id/payload) + migration
2.6   BrandProfile modeli (basit v1) + migration
2.7   AutomationPolicy modeli (checkpoint bazlı) + migration
2.8   Job'a channel_profile_id + content_project_id + trigger_source + migration
2.9   PublishRecord'a platform_connection_id + content_project_id + publish_intent + publish_result + migration
2.10  Mevcut youtube token_store → PlatformCredential data migration script
2.11  Tüm yeni modeller için CRUD router/service/schemas
2.12  Fresh DB test: tüm migration'lar sıfırdan çalışmalı
```

### Faz 3: Auth + Role Enforcement (4-5 saat)
```
3.1   JWT auth (login, register, token refresh)
3.2   Password hashing (bcrypt)
3.3   Auth middleware: get_current_user, require_admin, require_user
3.4   Mevcut header-based auth'u JWT'ye geçiş (fallback period)
3.5   Frontend: login sayfası, authStore (Zustand), protected routes
3.6   Google OAuth SADECE platform bağlantı için (YouTube)
3.7   OAuth callback → PlatformCredential kaydet
3.8   İlk admin seed (CLI veya startup script)
```

### Faz 4: User Panel Yeniden İnşa (5-6 saat)
```
4.1   User sidebar:
      ├── Dashboard
      ├── Kanallarım
      ├── Oluştur → Video / Bülten
      ├── Projelerim (ANA YÜZEY)
      ├── Yayınla
      ├── Platform → Yorumlar / Playlist / Gönderi
      ├── Analytics
      ├── Kaynaklar
      ├── Şablonlar
      └── Ayarlarım
4.2   UserDashboard: kanal kartları + son projeler + aktif işler + sparkline
4.3   MyProjectsPage: ContentProject listesi, filtre (kanal/modül/durum)
4.4   ProjectDetailPage: tab'lı (genel, job'lar, yayın, engagement, analytics, çıktı+video player)
4.5   MyChannelsPage: ChannelProfile kartları + platform bağlantı durumu
4.6   ChannelDetailPage: istatistik + son projeler + platform health
4.7   Route tanımları + lazy loading
```

### Faz 5: Wizard Taşıma & Channel Entegrasyonu (4-5 saat)
```
5.1   Wizard'ları shared component'lere çıkar
5.2   Wizard akışına ekle: ChannelProfile seçimi (ilk adım) + ContentProject oluşturma
5.3   User panel route'ları: /user/create/video, /user/create/bulletin
5.4   Job oluşturmada channel_profile_id + content_project_id gönderimi
5.5   Admin'den wizard route'larını kaldır, user panele redirect
5.6   ChannelProfile olmadan wizard başlatılamaz kuralı
```

### Faz 6: Admin Dashboard & Filtreli Analytics + Grafikler (5-6 saat)
```
6.1   AdminFilterBar component (user/channel/platform/date — tüm sayfalarda paylaşılan)
6.2   Admin Dashboard dönüşümü:
      - KPI kartları (toplam üretim, başarı oranı, ort. süre, aktif kanal sayısı)
      - Trend göstergeleri (↑↓)
      - Günlük üretim TrendChart (30 gün)
      - Platform DistributionDonut
      - Modül DistributionDonut
      - Kaynak sağlık StatusGrid
6.3   Backend analytics endpoint'lerine filtre: ?user_id, ?channel_profile_id, ?platform, ?date_from, ?date_to
6.4   Admin Job listesine filtre ekleme
6.5   Admin Publish loglarına filtre ekleme
6.6   User panel MyAnalyticsPage: aynı chart component'leri, sadece kendi verisi, kanal bazlı filtre
```

### Faz 7: Platform Etkileşim — Yorum Yönetimi (4-5 saat)
```
7.1   YouTube Comments API entegrasyonu (list, reply)
7.2   Comment sync job (periyodik çekme → SSE notification)
7.3   AssistedComposer component (AI/manual hibrit editör — AI butonu placeholder)
7.4   User CommentsPage:
      - Platform + kanal filtre
      - Video bazlı yorum listesi
      - Durum: cevaplanmamış / cevaplandı / yoksayıldı / spam
      - AssistedComposer ile yanıt yazma
7.5   EngagementTask oluşturma: comment_reply type
7.6   Admin: tüm yorumlar (AdminFilterBar ile filtreli)
7.7   Bildirim: yeni yorum → notification center
```

### Faz 8: Platform Etkileşim — Playlist + Gönderi (4-5 saat)
```
8.1   YouTube Playlists API entegrasyonu (CRUD, item add/remove)
8.2   Playlist sync
8.3   User PlaylistsPage: playlist listesi, video ekleme/çıkarma, sıralama
8.4   Publish flow'a playlist seçim adımı
8.5   EngagementTask: playlist_add type
8.6   YouTube Community Posts API (varsa)
8.7   User CommunityPostsPage: AssistedComposer ile gönderi oluşturma/zamanlama
8.8   EngagementTask: community_post type
8.9   Admin: playlist + gönderi overview (filtreli)
```

### Faz 9: Channel Performance Analytics (4-5 saat)
```
9.1   YouTube Analytics API entegrasyonu (views, watch time)
9.2   VideoStatsSnapshot sync güçlendirme + platform_connection_id FK
9.3   Channel Performance sayfası (user + admin):
      - View/like/comment TrendChart
      - Video bazlı etkileşim ComparisonBar
      - Yayın zamanı HeatmapChart (gün×saat)
      - Abone büyüme TrendChart
9.4   ProjectDetailPage'e analytics tab'ı
9.5   Engagement analytics: cevaplama oranı, playlist ekleme oranı
```

### Faz 10: Publish Flow v2 (4-5 saat)
```
10.1  User PublishPage (tam işlevsel)
10.2  ChannelProfile → PlatformConnection seçimi
10.3  publish_intent oluşturma (platform metadata form)
10.4  Playlist atama
10.5  Zamanlama (schedule)
10.6  Post-publish opsiyonları (community post, pin comment)
10.7  Çoklu platforma aynı ContentProject'ten publish
10.8  Admin publish monitoring (AdminFilterBar ile filtreli)
```

### Faz 11: Template Galeri & Preview-First UX (3-4 saat)
```
11.1  Template kart görünümü (görsel preview)
11.2  Style Blueprint galeri
11.3  BrandProfile → template'e renk/font enjeksiyonu (basit v1)
11.4  Wizard'da preview-first template seçimi
```

### Faz 12: Otomasyon Altyapısı (4-5 saat)
```
12.1  AutomationPolicy CRUD UI (user: kendi kanalları, admin: tüm politikalar)
12.2  Seviye seçimi (L0-L3) + checkpoint kontrolleri UI
12.3  Batch job desteği (batch_id)
12.4  Pipeline policy → Settings Registry entegrasyonu
12.5  Audit trail: otonom vs. manual ayrımı
12.6  Executor DEVRE DIŞI — sadece model + UI + ayarlar
```

### Faz 13: İçerik Takvimi (3-4 saat)
```
13.1  Takvim görünümü (haftalık/aylık grid)
13.2  ContentProject + PublishRecord takvimde
13.3  Drag & drop zamanlama
13.4  Mini takvim widget (user dashboard)
```

### Faz 14: Bildirim & UX İyileştirmeleri (2-3 saat)
```
14.1  Bildirim kategorileri (iş, yayın, yorum, hata, otomasyon, token_expire)
14.2  Okundu/okunmadı, filtre
14.3  Command palette: context-aware (admin vs user)
14.4  Keyboard shortcuts
```

### Faz 15: Çoklu Platform Genişleme (4-5 saat)
```
15.1  TikTok adapter + OAuth
15.2  Instagram adapter + OAuth
15.3  X/Twitter adapter + OAuth
15.4  Platform-agnostic publish flow
15.5  Video format dönüşüm (16:9 → 9:16)
```

### İleri Fazlar (MVP sonrası)
```
Faz 16: Branding Studio (BrandProfile tam UI)
Faz 17: AI entegrasyonu (AssistedComposer gerçek AI çağrısı)
Faz 18: Performance alerts
Faz 19: Competitor tracking
Faz 20: A/B test (thumbnail/title)
Faz 21: Video-to-Shorts repurposing
Faz 22: Tam otonom pipeline executor
Faz 23: Content calendar best-time-to-publish AI
```

---

## 13. Sonnet İçin Kritik Uygulama Notları

1. **Faz 2 (Domain Model) tüm sonraki fazların temelidir** — migration'lar sağlam, fresh DB test zorunlu
2. **Nullable FK'lar ile başla** — mevcut data kırılmasın. channel_profile_id nullable başlar, wizard'da zorunlu yapılır
3. **ContentProject = kullanıcının ana yüzeyi** — URL: `/user/projects/:id`, altında job'lar
4. **EngagementTask generic** — type + target_object_type + target_object_id + payload. Her engagement tipi aynı tabloda
5. **AssistedComposer bir kez yaz, her yerde kullan** — props: context, contextData, aiEnabled, onSubmit
6. **AdminFilterBar bir kez yaz, tüm admin sayfalarında kullan** — props: showUserFilter, showChannelFilter, showPlatformFilter, showDateRange
7. **Chart component'leri generic** — `<TrendChart data={[]} xKey="date" yKey="count" />`, her sayfada tekrar yazılmaz
8. **PlatformCredential Fernet encryption** — `cryptography.fernet`, plaintext token DB'de olmaz
9. **CLAUDE.md kuralları geçerli** — Settings registry, visibility engine, snapshot pattern, audit trail yeni modellere de uygulanır
10. **publish_intent / publish_result** — PublishRecord'da planlanan vs gerçekleşen ayrımı. İki ayrı JSON field
11. **AI butonu placeholder** — Faz 7-9'da AssistedComposer'a "AI ile Öner" butonu eklenir ama gerçek AI çağrısı Faz 17'de
12. **Mevcut testleri kırma** — her faz sonunda pytest + tsc. Kırılan varsa hemen düzelt
13. **PlatformConnection health** — token_state, scopes check, features_available — bağlantı sayfasında her zaman görünür
14. **ChannelProfile olmadan wizard başlatılamaz** — wizard Step 0: kanal seçimi. Kanal yoksa "önce kanal oluştur" yönlendirmesi

---

## 14. Mevcut Modelle Uyum Tablosu

| Mevcut Model | Değişiklik | Migration Notu |
|-------------|------------|----------------|
| User | + password_hash | ALTER ADD COLUMN |
| Job | + channel_profile_id (nullable), + content_project_id (nullable), + trigger_source | ALTER ADD COLUMN × 3 |
| PublishRecord | + platform_connection_id (nullable), + content_project_id (nullable), + publish_intent (JSON), + publish_result (JSON) | ALTER ADD COLUMN × 4 |
| VideoStatsSnapshot | + platform_connection_id (nullable) | ALTER ADD COLUMN |
| Setting | channel scope desteği (mevcut module_scope genişletilir) | Muhtemelen yeni alan |
| — | ChannelProfile | CREATE TABLE |
| — | PlatformConnection | CREATE TABLE |
| — | PlatformCredential | CREATE TABLE |
| — | ContentProject | CREATE TABLE |
| — | EngagementTask | CREATE TABLE |
| — | BrandProfile | CREATE TABLE |
| — | AutomationPolicy | CREATE TABLE |
