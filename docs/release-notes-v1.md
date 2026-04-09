# ContentHub v1.0 — Release Notes

**Tarih:** 2026-04-09
**Tip:** MVP Launch Release

---

## Ozet

ContentHub, localhost-first modular icerik uretim ve yayinlama platformudur. Bu surum, tek makine uzerinde calisan tam islevli bir MVP'dir.

---

## Icerik Modulleri

### Standard Video
- Konu bazli otomatik video uretimi
- Pipeline: Script → Metadata → TTS → Altyazi → Gorsel → Kompozisyon → Render
- Wizard ve ileri mod destegi

### Haber Bulteni (News Bulletin)
- RSS/URL/API kaynaklardan haber toplama
- Dedupe korumasi (kullanilmis haber kaydi)
- Otomatik bulten scripti ve TTS

---

## Admin Paneli

- **Ayarlar Kaydi:** 100+ yapilandirilabilir ayar, 15 grup
- **Gorunurluk Motoru:** Sayfa, widget, alan bazli gorunurluk kontrolu
- **Wizard Yonetimi:** Modul bazli wizard yapilandirma
- **Is Motoru:** Kuyruk, adim takibi, ETA, retry, recovery
- **Yayin Merkezi:** draft → review → approved → publishing → published
- **Bildirim Merkezi:** Gercek zamanli SSE + backend notification
- **Baglanti Merkezi:** YouTube OAuth, yetenek matrisi
- **Analytics:** Platform, icerik, operasyon, yayin metrikleri
- **Denetim Logu:** Tum degisikliklerin kaydi

---

## Kullanici Paneli

- Dashboard, projeler, kanallar
- Video ve bulten olusturma wizard'lari
- Yorum, playlist, gonderi yonetimi
- Kisisel analitik ve kanal performansi
- Operations inbox ve takvim
- Platform baglantilari

---

## Teknik Ozellikler

- **Backend:** FastAPI + SQLite WAL + Alembic (44 migration)
- **Frontend:** React + Vite + TypeScript + Zustand + React Query
- **Auth:** JWT (access + refresh token), role-based (admin/user)
- **Gercek zaman:** SSE
- **Render:** Remotion
- **TTS:** Microsoft Edge TTS (ucretsiz)
- **LLM:** Kie.ai (Gemini) + OpenAI uyumlu fallback
- **Gorseller:** Pexels + Pixabay fallback

---

## Bilinen Sinirlamalar

| Alan | Durum | Not |
|------|-------|-----|
| Otomasyon executor | Deferred | Politikalar tanimlanabilir, otomatik calistirma yok |
| Playlist engagement sync | Partial | CRUD mevcut, tam entegrasyon deferred |
| Community Posts API | Kisitli | YouTube API kisitlamasi |
| Kanal detay sayfasi | Stub | Kanal listesinden bilgi gorulebilir |
| Analytics retention/watch-time | Deferred | YouTube API entegrasyonu henuz yok |
| SSE auth | Yok | Localhost-only MVP karari |
| YouTube OAuth admin guard | Backlog | Publish hardening'de |
| Render timeout | Sabit (600s) | Ayarlardan override yok |
| Multi-tenant | Yok | Tek makine MVP |

---

## Test Durumu

| Kontrol | Sonuc |
|---------|-------|
| Backend testleri | 1727 passed |
| TypeScript | 0 hata |
| Vite build | Clean |
| Sprint 4 polish testleri | 56/56 passed |
| Sprint 3 release validation | 34/34 passed |

---

## Upgrade Notlari

Ilk surum oldugu icin upgrade yolu yoktur. Gelecek surumler icin:

```bash
git pull
cd backend && source .venv/bin/activate
pip install -e .
.venv/bin/python -m alembic upgrade head
cd ../frontend && npm install && npm run build
```
