# Full-Auto Mode: Ornek Senaryolar

7 somut senaryo. Her biri: ne tetikler, sistem ne kontrol eder, ne karar verir, kullanici/admin ne gorur.

---

## Senaryo 1: Manuel Tam Otomatik Tetikleme

**Tetikleyici:** Kullanici proje detay > Otomasyon > "Simdi Tetikle" butonuna tiklar.

**Sistem kontrolleri:**
1. `evaluate_guards()` calistirilir
2. Sirayla kontrol edilir: global kill switch, modul destegi, proje toggle, template varligi, kanal baglantisi, concurrent job limiti, gunluk kota

**Karar:** Tum guard'lar gecer.

**Sonuc:**
- StandardVideo content item olusturulur
- Job baslatilir: `run_mode="full_auto"`, `trigger_source="manual"`, `auto_advanced=true`
- Audit log'a `full_auto.trigger.accepted` yazilir
- Job pipeline otomatik ilerler (script → metadata → TTS → visual → subtitle → render → thumbnail)

**Kullanici ne gorur:**
- "Job olusturuldu: {job_id}" basari mesaji
- Job Detail sayfasinda iki rozet: **"Tam Otomatik"** (run_mode) + **"Manuel Tetik"** (trigger_source)
- Step'ler otomatik ilerler, her step baslangicinda timeline guncellenir

---

## Senaryo 2: Scheduler Cron Tetiklemesi

**Tetikleyici:** Saat 09:00, projenin cron ifadesi: `"0 9 * * 1-5"` (hafta ici her gun 09:00).

**Sistem kontrolleri:**
1. Scheduler tick calisir (her 60 saniyede bir)
2. Projenin `next_run_at <= now` oldugu tespit edilir
3. `scheduled_run_id` olusturulur: `"{project_id}:2026-04-14T09:00:00+00:00"`
4. `evaluate_guards()` calistirilir (global kill switch, modul, toggle, template, kanal, concurrent, gunluk kota, duplicate fire)

**Karar:** Guard'lar gecer, proje tetiklenir.

**Sonuc:**
- Job olusturulur: `trigger_source="scheduled"`, `scheduled_run_id` set edilir
- `next_run_at` bir sonraki is gunune (2026-04-15 09:00) hesaplanir
- Audit log'a `full_auto.trigger.accepted` yazilir (actor_id: "system")

**Admin ne gorur:**
- SchedulerStatusCard'da `pending_project_count` bir azalir
- Son tetikleme zamaninda projenin adi gorunur
- Job Detail'de **"Zamanlanmis"** rozeti

---

## Senaryo 3: Review Gate Beklemesi

**Tetikleyici:** Full-auto job'un tum step'leri tamamlanir (render ve thumbnail dahil).

**Sistem kontrolleri:**
1. `on_job_completed()` callback'i cagirilir
2. `require_review_gate` ayari kontrol edilir → `true`
3. `publish_policy` kontrol edilir — degeri ne olursa olsun v1'de etkisi yok

**Karar:** Icerik review'a alinir, otomatik yayin yapilmaz.

**Sonuc:**
- Icerik durumu `pending_review`'a guncellenir
- `publish_policy` ne secilmis olursa olsun, fiilen draft kalir
- Audit log'a `full_auto.job.completed` yazilir
- details_json'da not: `"publish gate bypass kapali; sonuc her zaman draft olarak birakilir"`

**Admin/operator ne gorur:**
- Job Detail'de "Tamamlandi" durumu
- Icerik listesinde `pending_review` badge'i
- Icerigi manuel olarak inceleyip yayin akisina alabilir veya reddedebilir

---

## Senaryo 4: Template Eksigi ile Bloklama

**Tetikleyici:** Kullanici "Simdi Tetikle" butonuna tiklar.

**Sistem kontrolleri:**
1. `evaluate_guards()` calistirilir
2. Template guard'i: `automation_default_template_id = NULL`
3. Violation olusur: "Varsayilan template tanimli degil"

**Karar:** Tetikleme reddedilir, job olusturulmaz.

**Sonuc:**
- Audit log'a `full_auto.trigger.rejected` yazilir
- details_json icinde violations: `["Varsayilan template tanimli degil"]`
- Hicbir job veya content item olusturulmaz

**Kullanici ne gorur:**
- Hata mesaji: "Tetikleme basarisiz: Varsayilan template tanimli degil"
- "Denetle" butonuyla ayni sonucu onizleyebilir — kirmizi violation mesaji gorunur
- Template tanimlandiktan sonra tekrar deneyebilir

---

## Senaryo 5: Gunluk Limit

**Tetikleyici:** Scheduler veya manuel trigger gelir. Projenin `automation_max_runs_per_day = 3`, `runs_today = 3`.

**Sistem kontrolleri:**
1. `evaluate_guards()` calistirilir
2. Gunluk limit guard'i: `runs_today (3) >= max_daily (3)`
3. Violation olusur: "Gunluk tam otomatik calisma limiti asildi (3/3)"

**Karar:** Tetikleme reddedilir.

**Sonuc:**
- Audit log'a `full_auto.trigger.rejected` yazilir
- details_json icinde violations: `["Gunluk tam otomatik calisma limiti asildi (3/3)"]`
- Job olusturulmaz

**Kullanici ne gorur:**
- Otomasyon sekmesinde durum bolumunde: **"3 / 3"** gunluk calistirma gostergesi
- "Denetle" sonucunda kirmizi violation mesaji
- Ertesi gun (UTC 00:00'da sayac sifirlaninca) tekrar tetiklenebilir

---

## Senaryo 6: Concurrent Guard

**Tetikleyici:** Proje icin zaten bir full-auto job calisiyor (`status=running`, `run_mode=full_auto`). Yeni bir trigger gelir (scheduler veya manuel).

**Sistem kontrolleri:**
1. `evaluate_guards()` calistirilir
2. Concurrent guard: calisan full-auto job sayisi kontrol edilir
3. Mevcut calisan job bulunur → violation: "Proje icin calisan full-auto is sayisi limiti asildi (1/1)"

**Karar:** Yeni tetikleme reddedilir.

**Sonuc:**
- Audit log'a `full_auto.trigger.rejected` yazilir
- Mevcut job etkilenmez, calismaya devam eder
- Yeni job olusturulmaz

**Admin ne gorur:**
- "Denetle" sonucunda: "Proje icin calisan full-auto is sayisi limiti asildi (1/1)"
- Mevcut job tamamlaninca (veya fail edince) bir sonraki trigger kabul edilir
- Scheduler icin: bir sonraki tick'te proje tekrar kontrol edilir

---

## Senaryo 7: Missed Cron Catch-Up

**Tetikleyici:** Sunucu 2 saat kapali kaldi. Projenin `next_run_at` 2 saat oncesine ait (ornegin 09:00, saat simdi 11:00).

**Sistem kontrolleri:**
1. Sunucu acilir, scheduler ilk tick'ini calistirir
2. Projenin `next_run_at` (09:00) <= `now` (11:00) — proje "due" olarak isaretlenir
3. `scheduled_run_id` = `"{project_id}:2026-04-14T09:00:00+00:00"` (eski fire time ile)
4. `evaluate_guards()` calistirilir

**Karar:** Proje BIR KEZ tetiklenir. Catch-up yapilir.

**Sonuc:**
- Job olusturulur, trigger_source="scheduled"
- `next_run_at` simdi'den (11:00) ileri hesaplanir: bir sonraki cron eslesmesi (ornegin yarin 09:00)
- 2 saatlik aralik icindeki diger kacirilan fire'lar TOPLANMAZ
- Sadece bir telafi calismasi yapilir

**Admin ne gorur:**
- SchedulerStatusCard'da scheduler "Aktif" durumuna gecer
- Proje bir kez tetiklenir
- Job Detail'de trigger zamani olarak 09:00 (kacirilan orijinal zaman) gorunur
- `next_run_at` ileriye guncellendigini Otomasyon sekmesinde gorebilir

> **Onemli:** Catch-up politikasi: her zaman "en fazla 1 telafi calismasi". Sunucu 24 saat kapali kalsa bile, ayni proje icin sadece 1 telafi job'u olusturulur. Bu, sunucu restart'i sonrasi job patlamasini onler.
