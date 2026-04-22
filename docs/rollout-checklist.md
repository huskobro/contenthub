# ContentHub v1.0 — Rollout Checklist

**Güncellendi:** 2026-04-22 (Branding Center + Automation Center + Channel URL Onboarding wave)

Bu checklist, sistemi production benzeri ortamda çalıştırmadan önce tamamlanması gereken adımları kapsar.

---

## A. Ortam Hazırlığı

- [ ] Python 3.9+ kurulu
- [ ] Node.js 18+ kurulu
- [ ] `backend/.venv` oluşturuldu ve bağımlılıklar yüklendi (`pip install -e ".[dev]"`)
- [ ] `frontend/node_modules` yüklendi (`npm install`)
- [ ] `backend/.env` dosyası oluşturuldu (`.env.example`'dan kopyalanarak)
- [ ] `CONTENTHUB_JWT_SECRET` set edildi (benzersiz, uzun secret — **zorunlu**)
- [ ] `CONTENTHUB_DEBUG=false` (production)
- [ ] TTS için `CONTENTHUB_DUBVOICE_API_KEY` **veya** EdgeTTS kullanılacaksa key gereksiz
- [ ] LLM için `CONTENTHUB_KIE_AI_API_KEY` veya `CONTENTHUB_OPENAI_API_KEY`
- [ ] Görseller için `CONTENTHUB_PEXELS_API_KEY` (opsiyonel, Pixabay fallback var)
- [ ] YouTube için `CONTENTHUB_YOUTUBE_CLIENT_ID` + `CONTENTHUB_YOUTUBE_CLIENT_SECRET` (opsiyonel)

## B. Veritabanı

- [ ] Migration çalıştı: `backend/.venv/bin/python -m alembic upgrade head`
- [ ] Tek HEAD var: `backend/.venv/bin/python -m alembic current` → `branding_center_001` (head)
- [ ] `backend/data/contenthub.db` dosyası oluşturuldu
- [ ] Startup sonrası seed'ler çalıştı (log'da doğrulanır: `settings seed`, `auth seed`)
- [ ] `backend/data/contenthub.db` `.gitignore`'da — commit edilmez

## C. Başlangıç Doğrulaması

- [ ] Backend başlatıldı: `uvicorn app.main:app --reload --port 8000` (venv içinden)
- [ ] Frontend başlatıldı: `npm run dev`
- [ ] Backend `http://localhost:8000` adresinde erişilebilir
- [ ] Frontend `http://localhost:5173` adresinde erişilebilir
- [ ] Health check: `curl http://localhost:8000/api/v1/health` → `{"status": "ok", "venv_active": true, "db_wal_mode": "wal"}`

## D. Admin Girişi

- [ ] `admin@contenthub.local` ile giriş yapıldı (şifre: `.env`'deki `CONTENTHUB_ADMIN_PASSWORD`)
- [ ] Admin dashboard yüklendi (`/admin`)
- [ ] Ayarlar sayfasında API anahtarları görülebilir (`/admin/settings`)
- [ ] Settings Registry: 204 ayar / 16 grup görünüyor

## E. İçerik Oluşturma Smoke Test

- [ ] Standard Video wizard'ı başlatıldı
- [ ] Konu, dil, süre parametreleri girildi
- [ ] İş oluşturuldu ve kuyruğa alındı
- [ ] İş adım adım ilerledi (veya hata mesajı döndü)
- [ ] Haber Bülteni wizard'ı başlatıldı
- [ ] Ürün İnceleme wizard'ı başlatıldı (URL ile)

## F. Yayın Akışı Smoke Test

- [ ] Yayın Merkezi'nde draft kayıt görünüyor
- [ ] Draft → pending_review geçişi çalışıyor
- [ ] Review → approved geçişi çalışıyor
- [ ] (YouTube bağlantısı varsa) Yayın tetikleme çalışıyor

## G. Bağlantı Merkezi Smoke Test

- [ ] Bağlantı Merkezi sayfası yükleniyor (`/admin/connections`)
- [ ] Yetenek matrisi görünüyor
- [ ] (YouTube OAuth yapılandırıldıysa) Bağlantı durumu kontrol edildi

## H. Inbox / Takvim / Bildirim Smoke Test

- [ ] Operations Inbox yükleniyor
- [ ] Calendar yükleniyor (3 view: liste / hafta / ay)
- [ ] Bildirim merkezi açılıyor ve kapanıyor
- [ ] SSE bağlantısı kuruldu (tarayıcı konsolunda doğrulanır)

## I. Auth / Rol Smoke Test

- [ ] Normal kullanıcı oluşturuldu
- [ ] Normal kullanıcı admin sayfasına erişemiyor (403)
- [ ] Auth olmadan API çağrıları 401 dönüyor
- [ ] Token refresh çalışıyor

## I.2 Multi-user Ownership Smoke Test (stabilize P0/P1)

Tek makinede birden fazla kullanıcı senaryosu — cross-user leak kapalı
doğrulaması:

- [ ] İki normal kullanıcı (userA, userB) + bir admin mevcut
- [ ] userA bir ChannelProfile + PlatformConnection oluşturdu
- [ ] userB giriş yapıp `/api/v1/publish/youtube/token-status?channel_profile_id=<userA-channel>` çağırdı → 403 (`baska kullanicinin kaynagi`)
- [ ] userB `/api/v1/publish/youtube/auth-url?channel_profile_id=<userA-channel>&...` çağırdı → 403
- [ ] userB `/api/v1/publish/youtube/video-stats?channel_profile_id=<userA-channel>` çağırdı → 403
- [ ] userB `/api/v1/publish/youtube/video-stats/{userA-video-id}/trend` çağırdı → 404 (existence mask)
- [ ] userB `/api/v1/publish/youtube/revoke?channel_profile_id=<userA-channel>` → 403
- [ ] userB `/api/v1/publish/youtube/auth-callback` POST body'de `channel_profile_id=<userA-channel>` → 403 (token exchange *tetiklenmeden*)
- [ ] userB `/api/v1/publish/youtube/auth-callback?state=<userA-channel>:abc` → 403 (state-path hijack kapalı)
- [ ] Admin yukarıdaki çağrıların hepsine 2xx döndürüyor (admin bypass)
- [ ] `/api/v1/providers/...` → non-admin user 403 (admin-only gate)
- [ ] `/api/v1/source-scans/...` → non-admin user 403

## I.3 Branding Center + Automation Center + Channel URL Onboarding Smoke

Bu üç yüzey 2026-04-22 wave'inde son ürün kalitesinde tamamlandı. Production
benzeri ortamda doğrulama:

- [ ] Yeni kanal: `/user/channels/new` → URL gir → preview meta görünüyor →
      confirm → done step CTA "Branding Center'a geç" çalışıyor
- [ ] Branding Center: `/user/channels/:id/branding-center` 6 kart yükleniyor
      (`bc-identity-card`, `bc-audience-card`, `bc-visual-card`,
      `bc-messaging-card`, `bc-platform-card`, `bc-review-card`)
- [ ] BC identity kartı kayıt edilince `last_applied_at` server'da set ediliyor
      (Audit Log'da görünür)
- [ ] BC `Apply` (dry-run=true) ile çalıştırılınca derived config preview
      döndürüyor; final apply audit log düşüyor
- [ ] BC completeness=tüm true olduğunda `bc-go-automation` butonu enabled,
      diğer durumda disabled
- [ ] Automation Center: `/user/projects/:id/automation-center` canvas
      yükleniyor, her node `data-status` + `data-mode` taşıyor
- [ ] Aktif (running/queued) job varsa `ac-run-now` ve `ac-save-flow` disable +
      snapshot lock banner görünüyor
- [ ] Admin rolü `Zorla çalıştır` butonunu görüyor; user rolü görmüyor
- [ ] Run-Now success → otomatik olarak `/user/jobs/:job_id` (veya
      `/admin/jobs/:job_id`) sayfasına navigate ediyor
- [ ] Evaluate blockers → banner'da `Engeller: ...` listesi görünüyor

## J. Yedekleme

- [ ] `backend/data/contenthub.db` yedeği alındı
- [ ] `backend/workspace/` yedeği alındı
- [ ] Yedek dosyalar ayrı konumda saklanıyor

## K. Rollback Planı

- [ ] Önceki veritabanı yedeği mevcut
- [ ] Git tag veya commit hash kaydedildi (`git log --oneline -5`)
- [ ] Geri dönme prosedürü biliniyor:
  1. Sistemi durdur
  2. DB yedeğini geri yükle
  3. `git checkout <önceki-commit>`
  4. `backend/.venv/bin/python -m alembic upgrade head`
  5. Sistemi yeniden başlat

---

## Sonuç

Tüm maddeler işaretlendiyse, sistem kullanıma hazırdır.

**İzlenmesi önerilen metrikler:**
- Job success rate (hedef: >90%)
- Publish success rate (hedef: >95%)
- API response time (hedef: <500ms p95)
- Error rate (hedef: <5%)
- SSE connection stability

**Durum:** MVP kapsamındaki tüm iş kalemleri kapalı. Sürüm geçmişi
`docs/tracking/CHANGELOG.md`, güncel durum `docs/tracking/STATUS.md`.
