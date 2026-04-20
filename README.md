# ContentHub

ContentHub, yerel ortamda çalışan modüler bir içerik üretim ve yayınlama platformudur.

Klasik bir CMS değildir. İçerik oluşturma, yayın iş akışları, operasyon görünürlüğü, analitik, şablon/stil yönetimi ile haber kaynağı entegrasyonunu tek bir yerel sistem altında birleştirir.

---

## Proje Durumu

**REV-2 dalgası (19 kalem) tamamlandı — main'e merge edildi (2026-04-18). Phase AM hazırlığı başlıyor.**

| Alan | Durum |
|---|---|
| Admin paneli (54+ sayfa) | ✅ Tam çalışıyor |
| Kullanıcı paneli (21+ sayfa) | ✅ Tam çalışıyor |
| Settings Registry (204 ayar / 16 grup) | ✅ Tam çalışıyor |
| Visibility Engine | ✅ Tam çalışıyor |
| Job Engine + Step Runner + ETA | ✅ Tam çalışıyor |
| Auth (JWT + rol zorlama) | ✅ `require_admin` / `require_user` guards |
| Standard Video Modülü | ✅ End-to-end çalışıyor |
| News Bulletin Modülü | ✅ End-to-end çalışıyor |
| Product Review Modülü | ✅ Scraping + pipeline çalışıyor |
| Remotion Render Pipeline | ✅ `npx remotion render` gerçek subprocess |
| TTS (EdgeTTS + DubVoice) | ✅ Gerçek API bağlantısı |
| LLM (Kie.ai / OpenAI uyumlu) | ✅ Provider wiring aktif |
| Publish Center + Review Gate | ✅ State machine tam çalışıyor |
| YouTube Publish Adaptörü | ✅ Altyapı hazır (YouTube API key gerekli) |
| YouTube Analytics (retention dahil) | ✅ Gerçek `youtubeanalytics.googleapis.com` bağlantısı |
| Full-Auto Mod | ✅ Job dispatch çalışıyor (auto-publish kasıtlı draft'ta — v1 spec) |
| Kanal Otomatik Import + Re-import | ✅ `POST /channel-profiles/{id}/reimport` |
| Multi-modül Proje | ✅ `module_type=mixed` desteği |
| Tema Sistemi (12 tema) | ✅ Anlık geçiş |
| Command Palette (Cmd+K) | ✅ Arama + navigasyon + eylem |
| Haber Deduplication | ✅ Hard/soft dedupe çalışıyor |
| Analytics (4 görünüm) | ✅ Gerçek veriden besleniyor |
| Prompt Assembly Engine | ✅ Block-tabanlı, Settings Registry entegre |
| Wizard Shell (Admin + User) | ✅ `AdminWizardShell` / `UserWizardShell` |

**Durum:** MVP kapsamı kapalı — açık tutulan iş yok. Değişiklik geçmişi
`docs/tracking/CHANGELOG.md`, güncel durum `docs/tracking/STATUS.md` içinde.

---

## Teknoloji Yığını

### Backend
- **Framework:** FastAPI (Python 3.11+)
- **Veritabanı:** SQLite (WAL modu) + Alembic (44+ migration)
- **Auth:** JWT Bearer (access + refresh), role-based (`admin` / `user`)
- **Kuyruk:** Süreç içi asenkron iş kuyruğu
- **Gerçek Zamanlı:** SSE (Server-Sent Events)
- **TTS:** Microsoft Edge TTS (ücretsiz) + DubVoice (ElevenLabs sarmalı)
- **LLM:** Kie.ai (Gemini) + OpenAI uyumlu fallback
- **Render:** Remotion (`npx remotion render` subprocess)
- **Görseller:** Pexels + Pixabay fallback

### Frontend
- **Framework:** React 18 + Vite + TypeScript
- **Sunucu durumu:** React Query v5
- **İstemci durumu:** Zustand
- **Yönlendirme:** React Router v6
- **Stil:** Tailwind CSS + CSS design token sistemi (12 tema, 4 surface)
- **Test:** Vitest + @testing-library/react (2670+ test, 213+ dosya)

---

## Proje Yapısı

```
contenthub/
├── backend/
│   ├── app/
│   │   ├── auth/               # JWT guard, ownership, seed
│   │   ├── analytics/          # Analytics servisleri (4 görünüm)
│   │   ├── audit/              # Audit log servisi
│   │   ├── channels/           # Kanal profilleri + auto-import
│   │   ├── full_auto/          # Full-auto mod (cron + scheduler)
│   │   ├── jobs/               # Job engine + step runner + ETA
│   │   ├── modules/
│   │   │   ├── standard_video/   # Video pipeline (render dahil)
│   │   │   ├── news_bulletin/    # Bülten pipeline
│   │   │   ├── product_review/   # Ürün inceleme pipeline
│   │   │   ├── templates/        # Şablon yönetimi
│   │   │   └── style_blueprints/ # Stil blueprint yönetimi
│   │   ├── platform_connections/ # YouTube OAuth + bağlantı
│   │   ├── providers/            # TTS, LLM, görsel provider'ları
│   │   ├── publish/              # Yayın merkezi + review gate
│   │   ├── settings/             # Settings Registry (204 ayar)
│   │   ├── source_scans/         # Kaynak tarama + dedupe
│   │   ├── tts/                  # TTS ortak katman + preview
│   │   └── visibility/           # Visibility Engine
│   ├── alembic/                  # Veritabanı migrasyonları
│   ├── data/                     # SQLite veritabanı
│   └── tests/                    # Backend testleri (2547+)
│
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── design-system/    # Primitive bileşenler + 12 tema
│       │   └── wizard/           # WizardShell, AdminWizardShell, UserWizardShell
│       ├── hooks/                # React Query hook'ları
│       ├── pages/
│       │   ├── admin/            # 54+ admin sayfası
│       │   └── user/             # 21+ kullanıcı sayfası
│       ├── stores/               # Zustand store'ları
│       ├── surfaces/             # Canvas / Atrium / Bridge / Horizon
│       └── tests/                # 213+ test dosyası
│
├── docs/
│   ├── tracking/
│   │   ├── STATUS.md             # Güncel faz durumu
│   │   └── CHANGELOG.md          # Tüm değişiklik kaydı
│   ├── redesign/                 # REV-2+ aktif tasarım dokümanları
│   ├── archive/                  # Tarihsel raporlar ve kapanış belgeleri
│   └── ...                       # TTS, template, publish, analytics kontrat belgeleri
│
├── renderer/                     # Remotion composition'ları
├── workspace/                    # Job artifact'ları (yerel çıktılar)
└── CLAUDE.md                     # Ürün kuralları ve çalışma prensipleri
```

---

## İçerik Modülleri

### Standard Video (`standard_video`)
Pipeline: Kayıt → Script (LLM) → Metadata → TTS → Altyazı → Görsel → Kompozisyon → Render → Yayın

### Haber Bülteni (`news_bulletin`)
Pipeline: Haber Seçimi → Editorial Gate → Script → TTS → Altyazı → Kompozisyon → Render → Yayın
- RSS/URL/API kaynaklardan gerçek haber toplama
- Hard + soft dedupe koruması

### Ürün İnceleme (`product_review`)
Pipeline: URL Scraping → Script → TTS → Altyazı → Görsel → Kompozisyon → Render → Yayın
- SSRF guard + robots.txt uyum
- Parser chain: site-specific + generic fallback

---

## Yayın Akışı

```
draft → pending_review → approved → scheduled → published
                       ↘ rejected
```

Review gate zorunludur. Audit trail her durum geçişini kaydeder. YouTube adapter yapılandırıldığında aktif.

---

## Settings Registry

**204 ayar, 16 grup**, 3 yönetim yüzeyi (Admin Settings / Prompt Editor / Wizard Governance).

Tüm prompt metinleri `{module}.prompt.{purpose}` formatında settings'te saklanır.
Job başladığında tüm ayar ve prompt değerleri snapshot'lanır — çalışan job'lar runtime değişikliklerinden etkilenmez.

---

## Test Durumu (2026-04-18)

| Kapsam | Sonuç |
|---|---|
| Backend pytest (geniş) | ✅ 2547/2547 PASS |
| Frontend vitest (full) | ✅ 2670/2670 PASS |
| Frontend `tsc --noEmit` | ✅ exit 0 |
| Frontend `vite build` | ✅ exit 0 |
| Alembic fresh-DB | ✅ 10/10 PASS |

---

## Kurulum

### Gereksinimler
- Python 3.11+
- Node.js 18+
- SQLite

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -e .
.venv/bin/python -m alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

`/api/v1/health` ile `venv_active: true` ve `db_wal_mode: wal` doğrulanır.

### Frontend

```bash
cd frontend
npm install
npm run dev
# http://localhost:5173
```

### Testler

```bash
# Backend
cd backend && .venv/bin/python -m pytest tests/ -v

# Frontend
cd frontend && npx vitest run

# Tip kontrolü
cd frontend && npx tsc --noEmit
```

---

## Temel Prensipler

- **Görünürlük önce** — Her davranış admin panelinden izlenebilir
- **Gizli mantık yok** — Gizli prompt, ayar veya görünmez davranış yok
- **Deterministik önce** — İş mantığı prompt yerine kod'da
- **Önizleme önce** — Görsel kararlar kör konfigürasyona zorlamaz
- **Yerel önce** — Tek makinede tam çalışır
- **Snapshot-locked jobs** — Job başladığında ayarlar dondurulur
- **Test edilebilir** — Her değişiklik test + git checkpoint içerir

---

## Önemli Belgeler

| Kaynak | İçerik |
|---|---|
| [`CLAUDE.md`](./CLAUDE.md) | Ürün kuralları, mimari prensipler, teslim fazları |
| [`docs/tracking/STATUS.md`](./docs/tracking/STATUS.md) | Güncel faz durumu ve milestone listesi |
| [`docs/tracking/CHANGELOG.md`](./docs/tracking/CHANGELOG.md) | Tüm değişiklik kaydı |
| [`docs/project_memory_and_decision_ledger.md`](./docs/project_memory_and_decision_ledger.md) | Mimari kararlar ve norm kuralları |
| [`docs/redesign/`](./docs/redesign/) | REV-2+ aktif tasarım dokümanları |

---

## GitHub

`git@github.com:huskobro/contenthub.git` — `main` branch, aktif geliştirme.
