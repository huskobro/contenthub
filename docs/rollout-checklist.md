# ContentHub v1.0 — Rollout Checklist

Bu checklist, sistemi production benzeri ortamda calistirmadan once tamamlanmasi gereken adimlari kapsar.

---

## A. Ortam Hazirligi

- [ ] Python 3.9+ kurulu
- [ ] Node.js 18+ kurulu
- [ ] `backend/.venv` olusturuldu ve bagimliliklar yuklendi
- [ ] `frontend/node_modules` yuklendi (`npm install`)
- [ ] `backend/.env` dosyasi olusturuldu (`.env.example`'dan kopyalanarak)
- [ ] `CONTENTHUB_JWT_SECRET` set edildi (benzersiz, uzun secret)
- [ ] `CONTENTHUB_KIE_AI_API_KEY` set edildi
- [ ] `CONTENTHUB_PEXELS_API_KEY` set edildi
- [ ] `CONTENTHUB_DEBUG=false` (production)

## B. Veritabani

- [ ] Migration calisti: `.venv/bin/python -m alembic upgrade head`
- [ ] Tek HEAD var: `.venv/bin/python -m alembic current`
- [ ] `backend/data/contenthub.db` dosyasi olusturuldu
- [ ] Startup sonrasi seed'ler calisti (log'da dogrulanir)

## C. Baslangic Dogrulamasi

- [ ] `./start.sh` ile sistem baslatildi
- [ ] Backend `http://localhost:8000` adresinde erisilebilir
- [ ] Frontend `http://localhost:5173` adresinde erisilebilir
- [ ] Health check: `curl http://localhost:8000/api/v1/health` → 200

## D. Admin Girisi

- [ ] `admin@contenthub.local` ile giris yapildi
- [ ] Admin dashboard yuklendi (`/admin`)
- [ ] Ayarlar sayfasinda API anahtarlari gorulebilir

## E. Icerik Olusturma Smoke Test

- [ ] Standard Video wizard'i baslatildi (`/user/create/video`)
- [ ] Konu, dil, sure parametreleri girildi
- [ ] Is olusturuldu ve kuyruge alindi
- [ ] Is adim adim ilerledi (veya hata mesaji dondu)
- [ ] Haber Bulteni wizard'i baslatildi (`/user/create/bulletin`)

## F. Yayin Akisi Smoke Test

- [ ] Yayin Merkezi'nde draft kayit gorunuyor
- [ ] Draft → pending_review gecisi calisiyor
- [ ] Review → approved gecisi calisiyor
- [ ] (YouTube baglantisi varsa) Yayin tetikleme calisiyor

## G. Etkilesim Smoke Test

- [ ] Yorumlar sayfasi yukleniyor (`/user/comments`)
- [ ] Playlist sayfasi yukleniyor (`/user/playlists`)
- [ ] Gonderiler sayfasi yukleniyor (`/user/posts`)
- [ ] Sinirlilik banner'lari gorunuyor (Posts API, Playlist sync)

## H. Baglanti Merkezi Smoke Test

- [ ] Baglanti Merkezi sayfasi yukleniyor (`/admin/connections`)
- [ ] Yetenek matrisi gorunuyor
- [ ] (YouTube OAuth yapilandirildiysa) Baglanti durumu kontrol edildi

## I. Inbox / Takvim / Bildirim Smoke Test

- [ ] Operations Inbox yukleniyor (`/user/inbox`)
- [ ] Takvim yukleniyor (`/user/calendar`)
- [ ] Bildirim merkezi (cil simgesi) aciliyor ve kapaniyor
- [ ] SSE baglantisi kuruldu (tarayici konsolunda dogrulanir)

## J. Auth / Rol Smoke Test

- [ ] Normal kullanici olusturuldu
- [ ] Normal kullanici admin sayfasina erisamiyor (403)
- [ ] Auth olmadan API cagirilari 401 donuyor
- [ ] Token refresh calisiyor (60 dk sonrasi)

## K. Yedekleme

- [ ] `backend/data/contenthub.db` yedegi alindi
- [ ] `backend/workspace/` yedegi alindi
- [ ] Yedek dosyalar ayri konumda saklanıyor

## L. Rollback Plani

- [ ] Onceki veritabani yedegi mevcut
- [ ] Git tag veya commit hash kaydedildi
- [ ] Geri donme proseduru biliniyor:
  1. Sistemi durdur
  2. DB yedegini geri yukle
  3. `git checkout <onceki-commit>`
  4. Sistemi yeniden baslat

---

## Sonuc

Tum maddeler isaretlendiyse, sistem production kullanima hazirdir.

**Not:** Ilk gunde izlenmesi onerilen metrikler:
- Job success rate (hedef: >90%)
- Publish success rate (hedef: >95%)
- API response time (hedef: <500ms p95)
- Error rate (hedef: <5%)
- SSE connection stability
