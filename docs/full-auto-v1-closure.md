# Full-Auto / Project Automation v1 — Final Closure

Tarih: 2026-04-13
Durum: **v1 MVP Tamamlandi**
Son commit: `5451f2f`

---

## 1. Full-Auto Nedir

Full-Auto, bir content_project uzerinde tam otomatik icerik uretim dongusu kurar.
Operator, projeye bir zamanlama (cron) veya manuel tetikleme tanimlayarak
icerik uretimini insan mudahalesi olmadan baslatabilir.

v1 sadece `standard_video` modulunu destekler.

---

## 2. Ne Yapar

| Yetenek | Durum |
|---------|-------|
| Proje bazli otomasyon ayarlari (on/off, mod, zamanlama) | Aktif |
| Manuel tetikleme (Simdi Tetikle butonu) | Aktif |
| Cron tabanli zamanlanmis tetikleme | Aktif |
| 8 guard'li hazirlik kontrolu (evaluate) | Aktif |
| Concurrency guard (kullanici + proje bazli) | Aktif |
| Gunluk kota guard'i | Aktif |
| Review gate (yayin oncesi onay) | Aktif |
| Fallback on failure (duraklat / tekrar dene / durdur) | Aktif |
| Yayin politikasi (taslak / zamanla / hemen yayinla) | Aktif |
| Job'a run_mode / trigger_source / auto_advanced / content_project_id stamp | Aktif |
| Audit trail (accepted / rejected kayitlari) | Aktif |
| Cron preset dropdown (10 onayar) | Aktif |
| Canvas / Atrium collapsible otomasyon paneli | Aktif |

---

## 3. Guard'lar

8 guard sirali olarak degerlendirillr. Herhangi biri fail ederse trigger reddedilir.

| # | Guard | Kontrol |
|---|-------|---------|
| 1 | global_enabled | `automation.full_auto.enabled` setting'i true mi |
| 2 | module_supported | Proje modulu v1 destekli mi (standard_video) |
| 3 | project_enabled | Proje automation_enabled=true mi |
| 4 | template_assigned | Projeye default template atanmis mi |
| 5 | channel_assigned | Projeye channel_profile baglanmis mi |
| 6 | concurrency_project | Proje icin max concurrent job asildı mi |
| 7 | concurrency_user | Kullanici icin max concurrent job asildı mi |
| 8 | daily_quota | Gunluk max calistirma limiti doldu mu |

Guard mesajlari Turkce, teknik alan adlari yerine kullanici dostu metinler kullanir.

---

## 4. API Endpoint'leri

| Method | Path | Amac |
|--------|------|------|
| POST | `/api/v1/full-auto/content-projects/{id}/evaluate` | Hazirlik kontrolu (guard evaluation) |
| POST | `/api/v1/full-auto/content-projects/{id}/trigger` | Manuel tetikleme |
| GET | `/api/v1/full-auto/scheduler/status` | Scheduler runtime durumu |
| PATCH | `/api/v1/content-projects/{id}` | Otomasyon ayarlari guncelleme |

---

## 5. UI Yuzeyleri

| Yuzey | Konum | Icerik |
|-------|-------|--------|
| ProjectAutomationPanel | Proje detay sayfasi (Canvas/Atrium/Legacy) | Proje otomasyonu toggle, calistirma modu, zamanlama, cron preset, koruma ayarlari, hazirlik kontrolu, simdi tetikle |
| SchedulerStatusCard | Admin full-auto sayfasi | Scheduler runtime durumu, poll araligi, son kontrol, siradaki proje |
| CollapsibleAutomationSection | Canvas/Atrium proje detay | Otomasyon panelini collapsible wrapper icinde gosterir |
| Job detail badges | Job detay sayfasi | run_mode, trigger_source, auto_advanced badge'leri |

---

## 6. Scheduler Davranisi

- Backend startup'ta `poll_full_auto_projects` background task olarak baslatilir
- Her tick'te (varsayilan 60sn) `automation.scheduler.enabled` ve `automation.full_auto.enabled` settings okunur
- Her iki setting de true ise, `automation_enabled=true` + `automation_schedule_enabled=true` olan projelerin cron ifadesi kontrol edilir
- Cron eslesirse `trigger_full_auto` cagirilir (guard'lar uygulanir)
- Dedupe: `scheduled_run_id` ile ayni tick'te ayni proje iki kez tetiklenemez
- `SCHEDULER_STATE` dict'i runtime durumunu yansitir, ilk tick'e kadar `enabled: false` gosterir (beklenen davranis)

---

## 7. E2E Dogrulama Sonuclari

Iki tur E2E dogrulama yapildi (seed script + API + UI):

| # | Senaryo | Tur 1 | Tur 2 |
|---|---------|-------|-------|
| 1 | Proje detay automation paneli | PASS | PASS |
| 2 | Cron preset / manual cron | PASS | — |
| 3 | Evaluate (Hazirlik Kontrolu) | PASS | PASS |
| 4 | Simdi Tetikle | PASS | PASS |
| 5 | blocked_by_policy (concurrency guard) | PASS | — |
| 6 | Review gate / auto_advanced | PASS | — |
| 7 | Job detail badges (run_mode, trigger_source) | PASS | PASS |
| 8 | Scheduler status | PARTIAL | — |
| 9 | Audit / decision trail | PASS | — |
| 10 | Duplicate / daily limit / guard | PASS | — |

Tur 2 ozellikle BUG-1 fix'ini dogruladi:
- job.content_project_id dolu
- "Bagli Isler" UI'da dogru gorunuyor
- Rollback script orphan birakmadan temizliyor

---

## 8. Kapatilan Bug'lar

| Bug | Aciklama | Fix | Commit |
|-----|----------|-----|--------|
| BUG-1 | trigger_full_auto, job'a content_project_id stamp etmiyordu | +1 satir: `job.content_project_id = project.id` | `e18a8a4` |
| BUG-2 | standard_videos'ta 3 eksik kolon + 10 eksik FK index | ALTER TABLE + idempotent catch-up migration | `5451f2f` |
| BUG-3 | Scheduler status ilk tick oncesi enabled:false | Bug degil — runtime-state tasarimi, beklenen davranis | — |

---

## 9. Bilincli Olarak Deferred

| Konu | Neden | Risk |
|------|-------|------|
| DB'deki eski kolonlar (model'den cikmis) | DROP riskli, SQLAlchemy ignore ediyor | Dusuk |
| Scheduler bootstrap read (ilk tick oncesi state) | Edge case, temel akisi etkilemiyor | Yok |
| Rollback script'inde standard_videos temizligi | Gelecek scope | Dusuk |
| Sonsuz uretim modu | Bilinçli kapsam disi | — |
| Multi-modul destek (news_bulletin vb.) | v2 scope | — |
| Cron ifadesi UI validasyonu | Nice-to-have | Dusuk |
| Publish step gercek entegrasyonu | Faz 1: her zaman taslak | — |

---

## 10. Operator Icin Kullanim Rehberi

### Onkoşullar

1. `automation.full_auto.enabled` ayarini Admin > Ayarlar'dan `true` yapin
2. `automation.scheduler.enabled` ayarini `true` yapin (zamanlanmis calistirma icin)

### Proje Hazırlığı

1. Bir `standard_video` projesi olusturun
2. Projeye bir channel_profile baglayin
3. Projeye bir default template atayin
4. Proje detay sayfasinda Otomasyon bolumunu acin
5. "Proje Otomasyonu" toggle'ini etkinlestirin

### Manuel Tetikleme

1. Otomasyon panelinde "Hazirlik Kontrolu" butonuna basin
2. Tum guard'lar gecerse "Simdi Tetikle" butonuna basin
3. Job otomatik olarak olusturulur ve pipeline baslar

### Zamanli Tetikleme

1. "Zamanlama" toggle'ini etkinlestirin
2. Cron preset'lerden birini secin veya manuel cron ifadesi girin
3. Scheduler poll tick'inde cron eslesmesi kontrol edilir ve otomatik tetiklenir

### Bugun Ne Yapilabilir

- Manuel tetikleme ile standard_video uretimi
- Cron zamanlamasi ile tekrarlayan uretim
- Guard'larla korunmus guvenli calistirma
- Audit trail ile izlenebilir operasyonlar
- Job detayinda full-auto badge'leri ile gorünurluk

### Bugun Ne Yapilamaz

- news_bulletin veya diger moduller icin full-auto
- Gercek YouTube publish (Faz 1: taslak kalir)
- Sonsuz / durmayan uretim dongusu
- Birden fazla projeyi tek komutla toplu tetikleme
