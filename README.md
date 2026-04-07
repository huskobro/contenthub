# ContentHub

ContentHub, yerel ortamda çalışan modüler bir içerik üretim ve yayınlama platformudur.

Klasik bir CMS değildir. İçerik oluşturma, yayın iş akışları, operasyon görünürlüğü, analitik, şablon ve stil yönetimi ile haber kaynağı entegrasyonunu tek bir yerel sistem altında birleştirir.

---

## Proje Durumu

**M39 tamamlandı — Full Product Manual QA geçildi. M40 MVP Final Acceptance Gate'e hazır.**

| Alan | Durum |
|---|---|
| Admin paneli (25+ sayfa) | ✅ Tam çalışıyor |
| Kullanıcı paneli | ✅ Tam çalışıyor |
| Settings Registry (99+ ayar) | ✅ Tam çalışıyor |
| Visibility Engine | ✅ Tam çalışıyor |
| Job Engine + Step Runner | ✅ Tam çalışıyor |
| Standard Video Wizard (4 adım) | ✅ End-to-end çalışıyor |
| News Bulletin Wizard (3 adım) | ✅ End-to-end çalışıyor |
| Publish Center + Review Gate | ✅ State machine tam çalışıyor |
| Analytics (4 görünüm) | ✅ Gerçek veri ile çalışıyor |
| Provider Yönetimi + Test | ✅ Bağlantı testi çalışıyor |
| Tema Sistemi (12 tema) | ✅ Anlık geçiş çalışıyor |
| Command Palette (Cmd+K) | ✅ Arama + navigasyon + eylem |
| Kaynak Yönetimi + RSS Tarama | ✅ NTV Gündem aktif |
| Haber Deduplication | ✅ Hard/soft dedupe çalışıyor |
| YouTube Publish Adaptörü | ✅ Altyapı hazır (API key gerekli) |
| Remotion Render Pipeline | ⏳ Altyapı hazır (provider bağlantısı gerekli) |
| AI Üretim Adımları (LLM/TTS) | ⏳ Provider bağlantısı gerekli |
| Kimlik doğrulama / yetkilendirme | ⏳ Kasıtlı olarak ertelendi (localhost-first) |

---

## Teknoloji Yığını

### Backend
- **Framework:** FastAPI (Python)
- **Veritabanı:** SQLite (WAL modu, startup checkpoint)
- **API:** REST, JSON şemaları
- **Kuyruk:** Süreç içi asenkron iş kuyruğu
- **Gerçek Zamanlı:** SSE (Server-Sent Events)

### Frontend
- **Framework:** React + Vite + TypeScript
- **Sunucu durumu:** React Query v5
- **İstemci durumu:** Zustand
- **Yönlendirme:** React Router v6
- **Stil:** Tailwind CSS + CSS design token sistemi (12 tema)
- **Test:** Vitest + @testing-library/react

### Diğer
- **Render:** Remotion (altyapı entegre, pipeline aktif)
- **Yayın:** YouTube Data API v3 adaptörü (yapılandırma gerekli)
- **Depolama:** Yerel workspace / artifact depolama

---

## Proje Yapısı

```
contenthub/
├── backend/                    # FastAPI uygulaması
│   ├── app/
│   │   ├── api/                # Router'lar + health endpoint
│   │   ├── analytics/          # Analytics servisleri (4 görünüm)
│   │   ├── audit/              # Audit log servisi
│   │   ├── core/               # Yapılandırma
│   │   ├── db/                 # Veritabanı bağlantısı + WAL checkpoint
│   │   ├── jobs/               # Job engine + step runner + ETA
│   │   ├── modules/            # İçerik modülleri
│   │   │   ├── standard_video/     # Video wizard + pipeline
│   │   │   ├── news_bulletin/      # Bülten wizard + pipeline
│   │   │   ├── templates/          # Şablon yönetimi
│   │   │   ├── style_blueprints/   # Stil blueprint yönetimi
│   │   │   └── template_style_links/
│   │   ├── news_items/         # Haber normalizasyonu
│   │   ├── publish/            # Yayın merkezi + review gate
│   │   ├── providers/          # Provider yönetimi + sağlık testi
│   │   ├── settings/           # Settings Registry (99+ ayar, 15 grup)
│   │   ├── source_scans/       # Kaynak tarama motoru
│   │   ├── sources/            # Kaynak yönetimi (RSS/URL/API)
│   │   ├── used_news/          # Kullanılmış haber kayıt defteri
│   │   ├── visibility/         # Visibility Engine
│   │   └── main.py
│   ├── alembic/                # Veritabanı migrasyonları
│   ├── data/                   # SQLite veritabanı
│   └── tests/                  # Backend testleri
│
├── frontend/                   # React + Vite uygulaması
│   ├── src/
│   │   ├── app/
│   │   │   ├── layouts/        # AdminLayout, UserLayout
│   │   │   ├── router.tsx      # Uygulama rotaları
│   │   │   └── stores/         # Zustand store'ları
│   │   ├── components/
│   │   │   ├── design-system/  # Sheet, QuickLook, EmptyState, Badge...
│   │   │   └── ...
│   │   ├── hooks/              # React Query hook'ları
│   │   ├── api/                # API istemci fonksiyonları
│   │   └── pages/
│   │       ├── admin/          # 25+ admin sayfası
│   │       └── user/           # Kullanıcı paneli sayfaları
│   └── vite.config.ts
│
├── docs/                       # Canlı dokümantasyon
│   ├── architecture/
│   ├── decisions/
│   └── testing/
│
├── docs_drafts/                # Milestone teslim raporları (140+ rapor)
├── workspace/                  # İş artefaktları (yerel çıktılar)
└── CLAUDE.md                   # Ürün kuralları ve çalışma prensipleri
```

---

## Admin Panel Sayfaları

| Sayfa | Rota | Açıklama |
|---|---|---|
| Genel Bakış | `/admin` | Platform metrikleri + sistem durumu + son işler |
| Ayarlar | `/admin/settings` | Settings Registry (3 sekme, 99+ ayar) |
| Görünürlük | `/admin/visibility` | Visibility Engine kural yönetimi |
| Wizard Ayarları | `/admin/wizard-settings` | Wizard governance |
| İşler | `/admin/jobs` | Job engine — filtre, kolon seçici, detay sheet |
| Audit Log | `/admin/audit-log` | 600+ kayıt, filtreli denetim izi |
| Modüller | `/admin/modules` | Pipeline step şeffaflığı + toggle |
| Sağlayıcılar | `/admin/providers` | Provider yönetimi + bağlantı testi |
| Prompt Yönetimi | `/admin/prompts` | Prompt editörü (settings-tabanlı) |
| İçerik Kütüphanesi | `/admin/content-library` | Çıktı arşivi |
| Varlık Kütüphanesi | `/admin/assets` | Medya kaynak yönetimi |
| Standart Video | `/admin/standard-videos` | Video listesi + detay |
| Video Wizard | `/admin/standard-videos/wizard` | 4 adımlı video oluşturma |
| Haber Bültenleri | `/admin/news-bulletins` | Bülten listesi |
| Haber Wizard | `/admin/news-bulletins/wizard` | 3 adımlı bülten oluşturma |
| Şablonlar | `/admin/templates` | Şablon listesi + detay panel |
| Stil Şablonları | `/admin/style-blueprints` | Blueprint listesi |
| Şablon-Stil Bağlantıları | `/admin/template-style-links` | Bağlantı yönetimi |
| Yayın Merkezi | `/admin/publish` | Publish Center (state machine) |
| Yayın Detay | `/admin/publish/:id` | Aksiyonlar + payload + audit trail |
| Analytics | `/admin/analytics` | Platform Overview |
| Analytics - Operasyon | `/admin/analytics/operations` | Provider sağlığı + adım istatistikleri |
| Analytics - İçerik | `/admin/analytics/content` | Modül ve şablon dağılımı |
| YouTube Analytics | `/admin/analytics/youtube` | YouTube kanal metrikleri |
| Kaynaklar | `/admin/sources` | Kaynak Registry |
| Kaynak Taramaları | `/admin/source-scans` | Tarama geçmişi |
| Haber Öğeleri | `/admin/news-items` | Normalize edilmiş haber deposu |
| Kullanılmış Haberler | `/admin/used-news` | Dedupe kayıt defteri |
| Tema Yönetimi | `/admin/themes` | 12 tema, anlık geçiş |

---

## Kullanıcı Panel Sayfaları

| Sayfa | Rota | Açıklama |
|---|---|---|
| Anasayfa | `/user` | Onboarding kartı + iş takibi |
| İçerik | `/user/content` | Standart Video + Haber Bülteni başlatma |
| Yayın | `/user/publish` | İşler + yayın kuyruğu giriş noktası |

---

## İçerik Modülleri

### Standart Video (`standard_video`)
**Wizard akışı:** Temel Bilgiler → Stil Seçimi → Şablon → Önizleme → Oluştur

- Kompozisyon yönü seçimi (Klasik, Yan Yana, Tam Ekran, Dinamik)
- Altyazı stili görsel önizleme kartları (preview-first UX)
- Thumbnail yönü seçimi
- Pipeline: Kayıt → Script → Metadata → TTS → Altyazı → Kompozisyon → Yayın
- Detay sayfası: breadcrumb, düzenleme, tam metadata tablosu

### Haber Bülteni (`news_bulletin`)
**Wizard akışı:** Kaynak & Haber → Draft & Review → Stil & Üretim → Üret

- Gerçek haber seçimi (RSS kaynağından)
- Editorial review + selection confirmation
- Video Modu: Tek Video / Kategori Bazlı / Haber Bazlı
- Deduplication koruması (kullanılmış haber takibi)

---

## Yayın Akışı

```
draft → pending_review → approved → scheduled → published
                       ↘ rejected
```

- Review gate: "Review'a Gönder" → "Onayla" / "Reddet"
- Payload düzenleme
- Audit trail (her durum değişikliği kayıt altında)
- YouTube adapter (yapılandırıldığında aktif)

---

## Settings Registry

99+ ayar, 15 grup, 3 yönetim yüzeyi:

| Grup | Örnekler |
|---|---|
| credentials | Kie.ai, OpenAI, Pexels, Pixabay, YouTube API key'leri |
| providers | Edge TTS ses seçimi, LLM model parametreleri |
| standard_video | TTS uyumluluk, kompozisyon varsayılanları |
| news_bulletin | Narration prompt, stil kuralları, bulten varsayılanları |
| jobs | Timeout, retry limitleri |
| publish | Review gereklilikleri, platform ayarları |

Tüm prompt metinleri `{module}.prompt.{purpose}` formatında settings'te saklanır — kod içine gömülmez.

---

## Analytics

4 görünüm, gerçek veriden beslenir:

| Görünüm | İçerik |
|---|---|
| Platform Overview | Toplam iş, başarı oranı, yayın sayısı, retry oranı |
| Operations Analytics | Provider sağlığı, adım istatistikleri, kaynak etkisi, prompt assembly |
| Content Analytics | Modül dağılımı, şablon etkisi, içerik performansı |
| YouTube Analytics | Kanal metrikleri (YouTube bağlantısı gerekli) |

---

## Test Kapsamı

| Alan | Durum |
|---|---|
| Backend testleri | Unit + integration + route smoke + M38 hardening testleri |
| Frontend smoke testleri | 154 test dosyası, 2100+ test |
| Test tipleri | Unit, integration, route/API smoke, visibility, state machine, restart recovery |
| M39 Manuel QA | 50+ bireysel test, %94 başarı (2 tur) |

---

## Geliştirme Ortamı

### Gereksinimler
- Python 3.11+
- Node.js v18+
- SQLite

### Backend Başlatma

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -e .
uvicorn app.main:app --reload --port 8000
```

> **Önemli:** Sistem Python'u değil `venv` içindeki Python'u kullanın.
> Startup'ta `venv_active: true` ve `db_wal_mode: wal` doğrulanır — `/api/v1/health` endpoint'i ile kontrol edilebilir.

### Frontend Başlatma

```bash
cd frontend
npm install
npm run dev
# http://localhost:5173
```

### Backend Testleri

```bash
cd backend
python3 -m pytest tests/ -v
```

### Frontend Testleri

```bash
cd frontend
npx vitest run
```

### Lint + Tip Kontrolü

```bash
cd frontend
npx tsc --noEmit
```

---

## Temel Prensipler

- **Görünürlük önce:** Her davranış admin panelinden izlenebilir ve yönetilebilir.
- **Gizli mantık yok:** Gizli master prompt, gizli ayar, görünmez davranış bulunmaz.
- **Deterministik önce:** İş mantığı prompt yerine deterministic servis/kod'da yaşar.
- **Önizleme önce:** Görsel kararlar (stil, şablon, altyazı) kör konfigürasyona zorlamaz.
- **Yerel önce:** Tek makinede çalışır, erken SaaS/bulut bağımlılığı yoktur.
- **Snapshot-locked jobs:** Job başladığında tüm ayar ve prompt değerleri snapshot'lanır — çalışan job'lar runtime değişikliklerinden etkilenmez.
- **Test edilebilir:** Her anlamlı değişiklik test ve git checkpoint içerir.

---

## Önemli Belgeler

| Kaynak | İçerik |
|---|---|
| [`CLAUDE.md`](./CLAUDE.md) | Ürün kuralları, mimari prensipler, teslim fazları |
| [`docs_drafts/m39_pre_documentation_full_product_manual_qa_report_tr.md`](./docs_drafts/m39_pre_documentation_full_product_manual_qa_report_tr.md) | M39 Full Product QA Raporu (2 tur, 50+ test) |
| [`docs_drafts/m38_hardening_operational_reliability_report_tr.md`](./docs_drafts/m38_hardening_operational_reliability_report_tr.md) | M38 Hardening Raporu |
| [`docs_drafts/m37_analytics_backend_and_platform_reports_tr.md`](./docs_drafts/m37_analytics_backend_and_platform_reports_tr.md) | M37 Analytics Backend Raporu |
| [`docs/`](./docs/) | Mimari kararlar, ADR kayıtları, test raporları |

---

## GitHub

`git@github.com:huskobro/contenthub.git` — `main` branch, aktif geliştirme.
