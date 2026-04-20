# ContentHub

ContentHub, yerel ortamda çalışan modüler bir içerik üretim ve yayınlama platformudur.

Klasik bir CMS değildir. İçerik oluşturma, yayın iş akışları, operasyon görünürlüğü, analitik, şablon/stil yönetimi ile haber kaynağı entegrasyonunu tek bir yerel sistem altında birleştirir.

---

## Proje Durumu

**Aurora Dusk Cockpit (feature/aurora-dusk-cockpit) main'e squash-merge edildi (2026-04-20, commit `0d838ad`). Aktif frontend Aurora'dır.**

| Alan | Durum |
|---|---|
| Admin paneli (55+ sayfa) | ✅ Tam çalışıyor |
| Kullanıcı paneli (22+ sayfa) | ✅ Tam çalışıyor |
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

**Durum:** Aurora Dusk Cockpit main'de aktif (squash-merge `0d838ad`). Alembic head: `phase_al_001`. Değişiklik geçmişi `docs/tracking/CHANGELOG.md`, runtime/storage kuralları `docs/RUNTIME_AND_STORAGE_POLICY.md` içinde.

---

## Teknoloji Yığını

### Backend
- **Framework:** FastAPI (Python 3.9+)
- **Veritabanı:** SQLite (WAL modu, aiosqlite + SQLAlchemy async) + Alembic (head: `phase_al_001`)
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
- **UI:** Aurora Dusk Cockpit (~80 sayfa override, main'de aktif)
- **Test:** Vitest + @testing-library/react (2696+ test, 237+ dosya)

---

## Proje Yapısı

```
contenthub/
├── backend/
│   ├── app/                      # 46 modül, 326+ endpoint
│   │   ├── auth/                 # JWT guard, ownership, seed
│   │   ├── analytics/            # Analytics servisleri (4 görünüm)
│   │   ├── audit/                # Audit log servisi
│   │   ├── channels/             # Kanal profilleri + auto-import
│   │   ├── full_auto/            # Full-auto mod (cron + scheduler)
│   │   ├── jobs/                 # Job engine + step runner + ETA
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
│   ├── alembic/                  # Veritabanı migrasyonları (head: phase_al_001)
│   ├── data/                     # SQLite DB — runtime-only, git-ignored (.gitkeep tracked)
│   ├── workspace/                # Job artifact'ları — runtime-only, git-ignored (.gitkeep tracked)
│   └── tests/                    # Backend testleri (2559+)
│
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── design-system/    # Primitive bileşenler + 12 tema
│       │   └── wizard/           # WizardShell, AdminWizardShell, UserWizardShell
│       ├── hooks/                # React Query hook'ları
│       ├── pages/                # Legacy admin/user sayfaları (Aurora trampolin hedefi)
│       ├── surfaces/aurora/      # Aurora Dusk Cockpit (~80 sayfa override)
│       ├── stores/               # Zustand store'ları
│       └── tests/                # 237+ test dosyası (2696+ test)
│
├── docs/
│   ├── RUNTIME_AND_STORAGE_POLICY.md  # Otorite: DB + workspace runtime kuralları
│   ├── tracking/
│   │   ├── STATUS.md             # Güncel faz durumu
│   │   └── CHANGELOG.md          # Tüm değişiklik kaydı
│   ├── archive/                  # Tarihsel raporlar ve kapanış belgeleri
│   └── ...                       # TTS, template, publish, analytics kontrat belgeleri
│
├── renderer/                     # Remotion composition'ları
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

## Test Durumu (2026-04-20, post-merge)

| Kapsam | Sonuç |
|---|---|
| Backend pytest (geniş) | ✅ 2559/2559 PASS |
| Frontend vitest (full) | ✅ 2696/2696 PASS (237 dosya) |
| Frontend `tsc --noEmit` | ✅ exit 0 |
| Frontend `vite build` | ✅ exit 0 |
| Alembic fresh-DB | ✅ head: `phase_al_001` |

---

## Kurulum

### Gereksinimler
- Python 3.9+
- Node.js 18+
- SQLite (sistem paketiyle gelir)

### İlk kurulum (fresh clone)

```bash
git clone <repo-url> ContentHub
cd ContentHub/backend

# Sanal ortam + bağımlılıklar
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"

# Veritabanı başlat
alembic upgrade head        # DB'yi oluşturur (head: phase_al_001)
python -m app.db.seed       # admin kullanıcı + KNOWN_SETTINGS tohumlar

# Frontend
cd ../frontend
npm install
npm run dev
# http://localhost:5173

# Ayrı terminalde backend
cd ../backend
uvicorn app.main:app --reload --port 8000
# http://localhost:8000
```

Veya repo kökünden: `./start.sh` ya da `ContentHub.command` çift tıkla.

`/api/v1/health` ile `venv_active: true` ve `db_wal_mode: wal` doğrulanır.

> **Not:** `backend/data/contenthub.db` ve `backend/workspace/` runtime'da oluşturulur — git'e eklenmez. Sadece `.gitkeep` dosyaları izlenir. Detay: `docs/RUNTIME_AND_STORAGE_POLICY.md`.

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
| [`docs/RUNTIME_AND_STORAGE_POLICY.md`](./docs/RUNTIME_AND_STORAGE_POLICY.md) | DB + workspace runtime politikası (otorite) |
| [`docs/tracking/STATUS.md`](./docs/tracking/STATUS.md) | Güncel faz durumu ve milestone listesi |
| [`docs/tracking/CHANGELOG.md`](./docs/tracking/CHANGELOG.md) | Tüm değişiklik kaydı |
| [`docs/project_memory_and_decision_ledger.md`](./docs/project_memory_and_decision_ledger.md) | Mimari kararlar ve norm kuralları |
| [`USER_GUIDE.md`](./USER_GUIDE.md) | Aurora Dusk Cockpit kullanım rehberi |

---

## GitHub

`git@github.com:huskobro/contenthub.git` — `main` branch, aktif geliştirme.
