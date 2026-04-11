# 04 — User Panel Guide

Bu dosya user panelinin tam rehberidir. İçerik üreticinin günlük kullanacağı her sayfa.

User panel seçilen **surface**'a (Legacy / Horizon / Canvas / Atrium) göre farklı görsel kabuklarda sunulur. Yapı ve route'lar aynıdır; görsel ve etkileşim farklıdır. Default: **Atrium**.

---

## /user — Anasayfa (Dashboard)

**Ad:** Anasayfa (Atrium'da "Vitrin", Canvas'ta "Portfolio")
**Route:** `/user`
**Surface'lar:** Legacy, Horizon, Canvas, Atrium
**Amaç:** Kullanıcının stüdyo özetini + aktif üretimleri tek sayfada görmesi.

### Atrium (default)

**Ana bölümler:**
- **Hero block** — Öne çıkan yapım (büyük görsel, başlık, priority badge)
- **"BU HAFTA ÖN PLANDA"** kicker
- **"STÜDYO ÖZETİ"** sidebar — Toplam yapım, Devam eden, Yayınlanan, Canlı iş, Yayın Kimlikleri
- **"YAPIM PLANI"** section — planlanan projeler
- **"ÜRETİMDE"** section — aktif jobs
- **"DİKKAT"** section — hata / bekleyen review
- **Bottom stat pill grid** — YAPIM / DEVAM / YAYINLANAN / CANLI İŞ / KANAL

### Canvas

**Ana bölümler:**
- Portfolio hero
- Recent projects grid
- Active jobs list
- Channel switcher

### Legacy / Horizon

- KPI satırı + Recent jobs + Quick actions

**Durum:** **tam** (Atrium); **büyük ölçüde hazır** (Canvas); **tam** (Legacy/Horizon).

---

## /user/channels — Kanallarım

**Route:** `/user/channels`
**Amaç:** Kullanıcının sahip olduğu ChannelProfile'ları listelemek + yönetmek.

**Ana bölümler:**
- Channel cards (brand, slug, default language, platform bağlantıları, oluşturulma tarihi)
- `Kanal Oluştur` butonu

**Butonlar:**
- `Kanal Oluştur` — yeni ChannelProfile wizard'ı
- `Düzenle` — channel detay sayfası
- `YouTube Bağla` — PlatformConnection OAuth akışı

**Durum:** **büyük ölçüde hazır.**

---

## /user/channels/:channelId — Kanal Detay

**Route:** `/user/channels/:channelId`
**Surface:** Canvas'ta zengin detay, diğerlerinde stub
**Amaç:** Tek bir kanalın tüm detayı — branding, platform bağlantıları, son yayınlar, performans.

**Ana bölümler (Canvas):**
- Branding (logo, banner, brand color)
- Platform bağlantıları (YouTube OAuth durumu)
- Son yayınlar (publish history)
- Kanal performansı (view/sub/etkileşim)

**Durum:** **büyük ölçüde hazır** (Canvas); **shell / stub** (diğer surface'lar).

---

## /user/projects — Projelerim

**Route:** `/user/projects`
**Surface:** Atrium = editorial portfolio, Canvas = grid, Legacy/Horizon = tablo
**Amaç:** ContentProject listesi — kullanıcının başlattığı içerik projeleri.

### Atrium

**Ana bölümler:**
- Portfolio hero (+ uppercase "PORTFOLIO" başlığı — final acceptance'ta flag edildi)
- **"+Video"** ve **"+Bülten"** CTA butonları
- 3-filtre bar: modül / durum / kanal
- Editorial proje kartları:
  - Module kicker (ör. HABER BÜLTENİ)
  - Cover image
  - Title
  - StatusBadge
  - Channel adı
  - Tarih
  - Priority badge (NORMAL / YÜKSEK / DÜŞÜK)
  - `STÜDYOYA GİT →` CTA

**Butonlar:** `+Video`, `+Bülten`, kart tıklama → `/user/projects/:projectId`

**Durum:** **tam.**

---

## /user/projects/:projectId — Proje Detay

**Route:** `/user/projects/:projectId`
**Amaç:** Tek bir içerik projesinin tüm detayı + bağlı job'lar + publish durumu.

**Ana bölümler:**
- Project header (başlık, modül, durum, priority)
- **Job timeline** — başlatılan job'ların listesi + link to job detail
- **Canlı iş** indicator (varsa) — şu an çalışan step
- **Publish linkage** — bağlı PublishRecord'lar + state
- **Actions** — `Rerun`, `Clone`, `Delete`

**Butonlar:**
- `Yeni job başlat` (tekrar render için)
- `Yayına gönder`
- `Kopyala`
- `Sil`

**Durum:** **büyük ölçüde hazır.**

---

## /user/create/video — Video Oluştur

**Route:** `/user/create/video`
**Amaç:** Standard Video wizard'ı ile yeni video projesi başlatmak.

**Ana bölümler (wizard step'leri):**
1. **Kanal seçimi** — ChannelProfile dropdown
2. **Template seçimi** — Template Engine'den uygun şablonlar
3. **Style Blueprint** — visual style seçimi (preview-first)
4. **Topic + script girdisi** — konu + brief
5. **Advanced options** (Advanced Mode'da) — prompt override, provider seçimi
6. **Onay + başlat** — job queue'ya düşer

**Modlar:** Guided Mode (sadeleştirilmiş) / Advanced Mode (tüm override'lar)

**Butonlar:** `İleri`, `Geri`, `Başlat`, `Taslak olarak kaydet`, `İptal`

**Durum:** **büyük ölçüde hazır.**

---

## /user/create/bulletin — Bülten Oluştur

**Route:** `/user/create/bulletin`
**Amaç:** News Bulletin modülü için wizard — haber kaynaklarından bülten oluştur.

**Ana bölümler:**
1. **Kanal + dil + süre seçimi**
2. **Haber kaynakları seçimi** — Source Registry'den hangi kaynaklar taranacak
3. **Haber seçimi** — taramadan çıkan haber item'lar (used news otomatik dışlanır)
4. **Style Blueprint** — bülten stil seçimi
5. **Onay + başlat**

**Butonlar:** Aynı wizard kontrolleri + `Haberleri tara` (on-demand scan).

**Durum:** **büyük ölçüde hazır.**

---

## /user/content — İçerik

**Route:** `/user/content`
**Amaç:** Kullanıcının tüm içerik öğelerinin (proje + job + yayın) birleşik görünümü.

**Durum:** **partial.**

---

## /user/publish — Yayın

**Route:** `/user/publish`
**Amaç:** User tarafında publish wizard — hangi içerik, hangi kanal, hangi metadata, hangi zaman.

**Ana bölümler:**
- Publish-ready content listesi
- Publish wizard (metadata override, thumbnail seçimi, schedule)
- Kendi publish history'si

**Üst akış:** User yayını başlatır → PublishRecord `review_pending` state'ine girer → admin onaylar → `scheduled` veya `publishing`.

**Durum:** **büyük ölçüde hazır.**

---

## /user/comments — Yorumlar

**Route:** `/user/comments`
**Amaç:** Kullanıcının kanallarındaki yorumları izlemek.

**Durum:** **partial / shell.**

---

## /user/playlists — Playlist'lerim

**Route:** `/user/playlists`
**Durum:** **partial / shell.**

---

## /user/posts — Gönderilerim

**Route:** `/user/posts`
**Durum:** **partial / shell.**

---

## /user/analytics/channels — Kanal Performansım

**Route:** `/user/analytics/channels`
**Amaç:** Kullanıcının kanallarının publish + view + engagement metrikleri.

**Durum:** **partial.**

---

## /user/analytics — Analitiğim

**Route:** `/user/analytics`
**Surface:** Atrium, Canvas (diğerlerinde yoktur veya farklı route)
**Amaç:** Kullanıcı-ölçekli analytics özeti.

**Ana bölümler:**
- **4 KPI** — Projelerim, İşlerim, Yayın Başarı, Ort. Üretim
- **Üretim Trendi** paneli
- **Modül Dağılımı** paneli
- Empty state: `Seçilen dönemde veri yok`

**Durum:** **tam** (shell + empty state için). M34 analytics backend sonrası zenginleşecek.

---

## /user/calendar — Takvim

**Route:** `/user/calendar`
**Surface:** Atrium, Canvas
**Amaç:** Yayın takvimi — hangi içerik ne zaman yayınlanacak.

**Ana bölümler:**
- Hafta / Ay toggle
- Navigasyon (önceki / sonraki)
- Kanal + tip filtreleri
- Legend (draft / scheduled / published / failed)
- 7-gün haftalık görünüm / 5-hafta aylık görünüm

**Butonlar:** Zaman aralığı değiştir, event tıklanınca proje detayına git.

**Durum:** **tam.**

---

## /user/settings — Ayarlarım

**Route:** `/user/settings`
**Amaç:** User-level override ayarları + **Surface picker** (yüzey değiştirme).

**Ana bölümler:**

### Arayüz Yüzeyleri (Surface Picker)
- 5 surface kartı: Legacy / Horizon / Bridge / Canvas / Atrium
- Kart içeriği:
  - Surface adı + durum badge (Stable / Beta / Hazırlıkta)
  - Altyapı bilgisi
  - "NE İÇİN UYGUN?" açıklaması
  - `Aktif Et` butonu
  - Seçili surface için "Şu an seçili yüzey" chip'i
- `Varsayılana dön` — admin default'una geri dön
- Hazırlık aşamasındaki veya admin tarafından kapatılmış surface'lar seçilemez gösterilir

### Kullanıcı Override Ayarları
- Settings Registry'de `user_override_allowed=true` olan setting'ler
- Her setting için: açıklama, default, kullanıcı değeri, reset butonu

**Butonlar:**
- `Aktif Et` (her surface kartında)
- `Varsayılana Dön`
- `Kaydet` (override'lar için)

**Üst akış:** Surface değişikliği `resolveActiveSurface` tarafından anında uygulanır — sayfa reload etmeden layout değişir.

**Durum:** **büyük ölçüde hazır.** ASCII-only Türkçe pürüzü final acceptance'ta flag edildi (polish seviyesi).

---

## /user/content — İçerik Hub'ı

**Route:** `/user/content`
**Amaç:** Kullanıcının tüm içerik türlerini (video / bülten / taslak) tek bir giriş sayfasından keşfetmesi.

**Ana bölümler:**
- Module kartları (Standart Video / Haber Bülteni / diğer aktif modüller)
- Hızlı "yeni içerik" shortcut'ları
- Son düzenlenen içerikler önizlemesi

**Durum:** **tam**

---

## /user/automation — Otomasyonlarım

**Route:** `/user/automation`
**Amaç:** Kullanıcının kendi kanalları için aktif otomasyon politikalarını görmesi ve yönetmesi.

**Ana bölümler:**
- Aktif otomasyon listesi (trigger + action + kapsam)
- Yeni otomasyon oluştur butonu
- Durum rozetleri (aktif / duraklatıldı / hata)
- Politikanın son çalıştırma zamanı + sonuç özeti

**Durum:** **tam** (293 LoC)

---

## /user/inbox — Gelen Kutusu

**Route:** `/user/inbox`
**Amaç:** Kullanıcıya ait bildirim ve aksiyon gerektiren öğeleri (review davetleri, sistem mesajları, otomasyon uyarıları) tek yerde göstermek.

**Ana bölümler:**
- Okunmamış / tümü filtresi
- Kategori bazlı gruplar (review, sistem, otomasyon)
- Aksiyon linkleri (yaklaşık detay sayfasına götürür)

**Durum:** **tam** (202 LoC)

---

## /user/connections — Bağlantılarım

**Route:** `/user/connections`
**Amaç:** Kullanıcının dış platform entegrasyonlarını (YouTube OAuth, ileride Instagram / TikTok / X) tek panelden yönetmesi.

**Ana bölümler:**
- Platform kartları (bağlı / bağlı değil)
- Bağla / Yeniden Yetkilendir / Bağlantıyı Kes butonları
- Token expire uyarısı
- Scope / yetki bilgisi

**Durum:** **tam** (267 LoC). Şu an yalnızca YouTube aktif; diğer platformlar planlı.

---

## Guided Mode vs Advanced Mode

User panel iki kullanım modunu destekler:

- **Guided Mode** — wizard'lar basitleştirilmiş, teknik terimler gizli, default'lar otomatik uygulanır. İlk kez kullananlar için.
- **Advanced Mode** — tüm override'lar açık, prompt değişiklikleri görünür, provider seçimi, template detayları. Güçlü kullanıcılar için.

Mod seçimi `/user/settings` veya ilk onboarding wizard'ında yapılır. Admin bir kullanıcıyı Advanced Mode'a kısıtlayabilir veya Guided Mode'a zorlayabilir (Settings Registry + Visibility Engine ile).

---

## Sonraki adım

- Surface farklarını anlamak için → `05-surfaces-themes-and-panel-switching.md`
- Video / bülten oluşturma akış detayı → `07-key-workflows.md`
- Tüm user sayfalarının tek satır özeti → `08-page-by-page-reference.md`
- Terim sözlüğü → `14-glossary.md`
