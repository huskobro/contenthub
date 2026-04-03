# ContentHub

ContentHub, yerel ortamda çalışan, modüler bir içerik üretim ve yayınlama platformudur.

Klasik bir CMS değildir. İçerik oluşturma, yayın iş akışları, operasyon görünürlüğü, analitik, şablon ve stil yönetimi ile haber kaynağı entegrasyonunu tek bir yerel sistem altında birleştirir.

---

## Proje Durumu

**Ana Faz 14 tamamlandı — Final Audit / Go-No-Go kararı verildi.**

| Alan | Durum |
|---|---|
| Frontend omurgası | ✅ ~%90 hazır |
| Modül omurgası (StandardVideo + NewsBulletin) | ✅ ~%85 hazır |
| Backend API yüzeyi | ✅ Temel rotalar aktif |
| Onboarding akışı | ✅ Tam zincir tamamlandı |
| Admin paneli | ✅ Tüm registry + form + detail panel'lar |
| Kullanıcı paneli | ✅ Dashboard + içerik + yayın giriş yüzeyleri |
| Asset Library | ✅ Giriş yüzeyi + registry + filtre/arama + detail |
| YouTube Yayını (gerçek bağlantı) | ⏳ backend entegrasyonu bekliyor |
| Render pipeline (Remotion) | ⏳ backend entegrasyonu bekliyor |
| AI / TTS adımları | ⏳ backend entegrasyonu bekliyor |
| Analytics backend | ⏳ backend entegrasyonu bekliyor |
| Kimlik doğrulama / yetkilendirme | ⏳ kasıtlı olarak ertelendi |

**Go/No-Go Kararı:** `READY WITH CONDITIONS` — Demo ve geliştirme ortamı için hazır; gerçek içerik üretimi için backend entegrasyon turu gerekli.

---

## Teknoloji Yığını

### Backend
- **Framework:** FastAPI (Python)
- **Veritabanı:** SQLite (WAL modu)
- **API:** REST, düz JSON şemaları
- **Kuyruk:** Süreç içi asenkron iş kuyruğu
- **Gerçek Zamanlı:** SSE (Server-Sent Events)

### Frontend
- **Framework:** React + Vite + TypeScript
- **Sunucu durumu:** React Query v5
- **İstemci durumu:** Zustand
- **Yönlendirme:** React Router v6
- **Stil:** Inline CSS (`React.CSSProperties`)
- **Test:** Vitest + @testing-library/react

### Diğer
- **Render:** Remotion (planlı, henüz entegre değil)
- **Yayın:** YouTube Data API v3 (planlı)
- **Depolama:** Yerel workspace / artifact depolama

---

## Proje Yapısı

```
contenthub/
├── backend/                    # FastAPI uygulaması
│   ├── app/
│   │   ├── api/                # Yönlendirici ve health endpoint
│   │   ├── core/               # Temel yapılandırma
│   │   ├── db/                 # Veritabanı bağlantısı
│   │   ├── jobs/               # İş motoru (job engine)
│   │   ├── modules/            # İçerik modülleri
│   │   │   ├── standard_video/
│   │   │   ├── news_bulletin/
│   │   │   ├── templates/
│   │   │   ├── style_blueprints/
│   │   │   └── template_style_links/
│   │   ├── news_items/         # Haber öğesi servisi
│   │   ├── onboarding/         # Onboarding servisi
│   │   ├── settings/           # Ayarlar kayıt defteri
│   │   ├── source_scans/       # Kaynak tarama servisi
│   │   ├── sources/            # Kaynak yönetimi
│   │   ├── used_news/          # Kullanılmış haber kayıt defteri
│   │   ├── visibility/         # Görünürlük motoru
│   │   └── main.py
│   ├── alembic/                # Veritabanı migrasyonları
│   ├── data/                   # SQLite veritabanı dosyaları
│   └── tests/                  # Backend testleri (22 test)
│
├── frontend/                   # React + Vite uygulaması
│   ├── src/
│   │   ├── app/
│   │   │   ├── layouts/        # AdminLayout, UserLayout
│   │   │   ├── router.tsx      # Tüm uygulama rotaları
│   │   │   └── stores/         # Zustand store'ları
│   │   ├── components/         # Paylaşılan bileşenler
│   │   ├── hooks/              # React Query hook'ları (62+ hook)
│   │   ├── api/                # API istemci fonksiyonları (13 dosya)
│   │   ├── pages/
│   │   │   ├── AdminOverviewPage.tsx
│   │   │   ├── OnboardingPage.tsx
│   │   │   ├── UserDashboardPage.tsx
│   │   │   ├── UserContentEntryPage.tsx
│   │   │   ├── UserPublishEntryPage.tsx
│   │   │   └── admin/          # Tüm admin sayfaları (28 sayfa)
│   │   └── tests/              # Frontend smoke testleri (154 dosya, 2100+ test)
│   └── vite.config.ts
│
├── docs/                       # Canlı dokümantasyon
│   ├── architecture/           # Mimari kararlar
│   ├── decisions/              # ADR kayıtları
│   ├── phases/                 # Faz planları
│   ├── testing/                # Test raporları (faz bazlı, 300+ rapor)
│   └── tracking/
│       ├── STATUS.md           # Güncel durum
│       └── CHANGELOG.md        # Tüm değişiklik geçmişi
│
├── workspace/                  # İş artefaktları (yerel çıktılar)
├── renderer/                   # Remotion render desteği (planlı)
└── CLAUDE.md                   # Ürün kuralları ve çalışma kuralları
```

---

## Admin Panel Sayfaları

| Sayfa | Rota | Açıklama |
|---|---|---|
| Genel Bakış | `/admin` | Hızlı erişim + release readiness |
| Ayarlar | `/admin/settings` | Settings Registry |
| Görünürlük | `/admin/visibility` | Visibility Engine |
| Şablonlar | `/admin/templates` | Şablon kayıt defteri + form |
| Stil Blueprintleri | `/admin/style-blueprints` | Blueprint kayıt defteri + form |
| Şablon-Stil Linkleri | `/admin/template-style-links` | Bağlantı kayıt defteri |
| Kaynaklar | `/admin/sources` | Kaynak yönetimi + form |
| Kaynak Taramaları | `/admin/source-scans` | Tarama kayıt defteri + form |
| Haber Öğeleri | `/admin/news-items` | Haber kayıt defteri + form |
| Kullanılmış Haberler | `/admin/used-news` | Dedupe kayıt defteri |
| Standart Video | `/admin/standard-videos` | Video kayıt defteri + form + detay |
| Haber Bülteni | `/admin/news-bulletins` | Bülten kayıt defteri + form |
| İşler | `/admin/jobs` | İş motoru listesi + detay |
| İçerik Kütüphanesi | `/admin/content-library` | Tamamlanmış çıktı arşivi |
| Varlık Kütüphanesi | `/admin/assets` | Medya kaynak yönetimi |
| YouTube Analytics | `/admin/analytics` | Platform genel bakış |
| Analytics - İçerik | `/admin/analytics/content` | İçerik analitik görünümü |
| Analytics - Operasyon | `/admin/analytics/operations` | Operasyon analitik görünümü |
| Raporlama | `/admin/reporting` | Raporlama giriş yüzeyi |

---

## Kullanıcı Panel Sayfaları

| Sayfa | Rota | Açıklama |
|---|---|---|
| Dashboard | `/user` | Ana hub + eylem kartları + yönetim handoff |
| İçerik Üretimi | `/user/content` | Standart Video + Haber Bülteni başlatma |
| Yayın | `/user/publish` | İşler + yayın kuyruğu giriş noktası |

---

## İçerik Modülleri

### Standart Video (`standard_video`)
- Oluşturma formu (başlık, script, metadata, TTS, stil)
- Detay sayfası (overview, timeline, artifacts, actions)
- İş motoru entegrasyonu (adım takibi, ETA)
- Backend entegrasyonu bekleyen: render pipeline, TTS, AI adımları

### Haber Bülteni (`news_bulletin`)
- Oluşturma formu
- Haber seçici (picker) entegrasyonu
- Kullanılmış haber uyarı sistemi (deduplication)
- Artifact durumu özeti
- Backend entegrasyonu bekleyen: yayın, render

---

## Varlık Kütüphanesi

8 varlık tipi, 5 grup:

| Grup | Tipler |
|---|---|
| Ses ve Müzik | muzik |
| Görsel Varlıklar | gorsel, thumbnail_referans |
| Video ve Hareket | video_klip, overlay |
| Tipografi ve Altyazı | font, alt_yazi_stili |
| Marka Varlıkları | marka_varligi |

Çalışan özellikler: tip filtresi, metin araması, detay paneli, seçim/kaldırma, önizleme güvenlik notu.

---

## Onboarding Akışı

Tam zincir aktif:

1. Uygulama giriş gate — onboarding tamamlanmamışsa `/onboarding`'e yönlendirir
2. Karşılama ekranı
3. Gereksinimler ekranı (kaynak / şablon / ayar kurulum adımları)
4. Provider/API kurulumu (TTS, LLM, YouTube API anahtarları)
5. Workspace path kurulumu
6. Kurulum özeti inceleme
7. Tamamlanma gate + kullanıcı paneline geçiş

---

## Test Kapsamı

| Alan | Durum |
|---|---|
| Frontend smoke testleri | 2100+ test, 154 test dosyası |
| Backend testleri | 22 test |
| Test tipleri | Unit, integration, route/API smoke, visibility, state machine, onboarding zinciri |

Tüm önemli sayfalar `data-testid` nitelikleri içerir. Async React Query render'ı `waitFor()` ile test edilir. URL-aware mock pattern uygulanır.

---

## Geliştirme Ortamı

### Gereksinimler
- Node.js v24+ (nvm önerilir)
- Python 3.11+
- SQLite

### Backend Başlatma

```bash
cd backend
pip install -e .
uvicorn app.main:app --reload --port 8000
```

### Frontend Başlatma

```bash
cd frontend
npm install
npm run dev
# Varsayılan: http://localhost:5173
```

### Frontend Testleri

```bash
cd frontend
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh"
npx vitest run
```

### Frontend Lint + Tip Kontrolü

```bash
cd frontend
npx tsc --noEmit
```

---

## Önemli Belge ve Kaynaklar

| Kaynak | İçerik |
|---|---|
| [`CLAUDE.md`](./CLAUDE.md) | Ürün kuralları, mimari prensipler, teslim fazları, çalışma kuralları |
| [`docs/tracking/STATUS.md`](./docs/tracking/STATUS.md) | Mevcut geliştirme durumu |
| [`docs/tracking/CHANGELOG.md`](./docs/tracking/CHANGELOG.md) | Tüm faz değişiklik geçmişi |
| [`docs/testing/`](./docs/testing/) | Faz bazlı test raporları (300+ rapor) |
| [`docs/architecture/`](./docs/architecture/) | Mimari kararlar |
| [`docs/decisions/`](./docs/decisions/) | ADR kayıtları |
| [`docs/testing/test-report-phase-322-324-final-audit-and-go-no-go.md`](./docs/testing/test-report-phase-322-324-final-audit-and-go-no-go.md) | Final Go/No-Go raporu |

---

## Temel Prensipler

- **Görünürlük önce:** Her davranış admin panelinden izlenebilir ve yönetilebilir.
- **Gizli mantık yok:** Gizli master prompt, gizli ayar, görünmez davranış bulunmaz.
- **Deterministik önce:** İş mantığı prompt yerine deterministic servis/kod'da yaşar.
- **Önizleme önce:** Görsel kararlar (stil, şablon, altyazı) kör konfigürasyona zorlamaz.
- **Yerel önce:** Tek makinede çalışır, erken SaaS/bulut bağımlılığı yoktur.
- **Test edilebilir:** Her anlamlı değişiklik test ve commit checkpoint'i içerir.

---

## Dokümantasyon Dili

Bu repository'deki genel dokümantasyon varsayılan olarak **Türkçe** yazılır.

- Dosya yolları, endpoint path'leri, sınıf/fonksiyon adları, değişken isimleri, komutlar ve paket isimleri çevrilmez — teknik tanımlayıcı olarak aynen kalır.
- `CLAUDE.md` şu aşamada istisna olarak İngilizce bırakılmıştır.
- Yeni eklenen genel dokümanlar varsayılan olarak Türkçe yazılmalıdır.

---

## GitHub

`git@github.com:huskobro/contenthub.git` — main branch, aktif.
