# Scheduler ve Cron Mekanizmasi

## Scheduler Nedir?

Scheduler, ContentHub backend'inde calisan in-process async background task'tir. Harici bir broker, queue sistemi veya ayri bir servis degildir. `main.py` icerisinde FastAPI lifespan event'leri ile yonetilir:

- **Startup**: Scheduler task olusturulur ve baslatilir.
- **Shutdown**: Scheduler task iptal edilir ve temiz bir sekilde durdurulur.

Bu yaklasim localhost-first prensibine uygundur. Tek makine MVP'si icin harici bagimlilik gereksizdir. Dagitik scheduler gelecek fazlara birakilmistir.

---

## Poll Mantigi

Scheduler belirli araliklarla "tick" atar. Her tick'te due olan projeleri kontrol eder ve tetikler.

**Tick araligi:** `automation.scheduler.poll_interval_seconds` ayariyla belirlenir. Varsayilan 60 saniye. Admin bu degeri Settings Registry'den degistirebilir.

**Tick dongusu:**

```
while running:
    await sleep(poll_interval_seconds)
    execute_tick()
```

---

## Tick Icinde Ne Olur?

Her tick su adimlari sirasi ile uygular:

### Adim 1: Global Config Resolve

Settings Registry'den su ayarlar okunur:
- `automation.full_auto.enabled`
- `automation.scheduler.enabled`
- `automation.full_auto.allowed_modules`
- `automation.full_auto.max_daily_runs_per_project`
- `automation.full_auto.max_concurrent_per_user`
- `automation.full_auto.max_concurrent_per_project`
- Diger guard ayarlari

### Adim 2: Guard Kontrolu

Eger asagidakilerden herhangi biri gecerliyse tick erken sonlanir:
- `automation.scheduler.enabled = false`
- `automation.full_auto.enabled = false`

Hicbir proje degerlendirilmez, hicbir tetikleme yapilmaz.

### Adim 3: Uygun Projelerin Sorgulanmasi

Veritabanindan su kriterlere uyan projeler cekilir:
- `automation_enabled = true`
- `automation_schedule_enabled = true`
- `automation_run_mode = "full_auto"`
- `module_type` degeri `allowed_modules` listesinde mevcut

### Adim 4: Cron Expression Kontrolu

Her uygun proje icin:
- Projenin `automation_cron_expression` degeri varsa degerlendirilir
- Projenin `automation_timezone` (veya fallback olarak global default timezone) kullanilir

### Adim 5: next_run_at Hesaplama (Yeni Konfigurasyon)

`next_run_at` degeri `NULL` ise (ornegin proje yeni yapilandirilmissa):
- Cron ifadesinden "simdiden sonraki ilk eslesme" hesaplanir
- `next_run_at` guncellenir
- Bu tick'te tetikleme yapilmaz; bir sonraki tick'te kontrol edilir

### Adim 6: Due Kontrolu

`next_run_at <= now` olan projeler "due" listesine eklenir.

### Adim 7: Tetikleme

Her due proje icin `trigger_full_auto()` cagirilir. Her tetikleme izole bir database session icinde gerceklesir:

- Guard kontrolleri yapilir (daily limit, concurrent limit, template/channel varlik kontrolu)
- Guard gecilirse job olusturulur ve pipeline baslatilir
- Guard gecilmezse neden audit log'a yazilir
- Tetikleme sebebi `trigger_source = "cron_scheduled"` olarak isaretlenir

### Adim 8: next_run_at Yeniden Hesaplama

Tetikleme sonrasi (basarili veya basarisiz) projenin `next_run_at` degeri cron ifadesine gore "simdiden sonraki ilk eslesme" olarak guncellenir.

---

## Cron Syntax

5 alanli standart cron formati kullanilir:

```
dakika saat gun ay haftanin_gunu
  |     |    |   |      |
  |     |    |   |      +--- 0-7 (0 ve 7 = Pazar) veya 1-5 (Pazartesi-Cuma)
  |     |    |   +---------- 1-12
  |     |    +-------------- 1-31
  |     +------------------- 0-23
  +------------------------- 0-59
```

### Desteklenen Operatorler

| Operator | Ornek | Anlam |
|---|---|---|
| `*` | `* * * * *` | Her dakika |
| `N` | `30 9 * * *` | Saat 09:30 |
| `N,M` | `0 8,12,18 * * *` | Saat 08, 12 ve 18 |
| `A-B` | `0 9 * * 1-5` | Pazartesi-Cuma |
| `*/N` | `*/15 * * * *` | Her 15 dakika |
| `A-B/N` | `0 9-17/2 * * *` | 09-17 arasi her 2 saatte bir |

### Desteklenmeyen

| Syntax | Aciklama |
|---|---|
| `L` | Ayin son gunu (non-standard) |
| `#` | Ayin N'inci X gunu (non-standard) |
| `@weekly`, `@daily` | Makro ifadeler |
| Ay isimleri (`JAN`, `FEB`) | Sayisal deger kullanin |
| Gun isimleri (`MON`, `TUE`) | Sayisal deger kullanin |

---

## Missed Run / Catch-Up Davranisi

Sunucu kapali kaldiysa veya scheduler gecici olarak durdurulmussa, bazi projelerin `next_run_at` degeri gecmiste kalabilir.

**Davranis:**

1. Scheduler tekrar calistiginda, `next_run_at <= now` olan projeleri tespit eder.
2. Bu projeleri **BIR KEZ** tetikler. Kac tick kacirilmis olursa olsun, biriken fire'lar toplanmaz.
3. Tetikleme sonrasi `next_run_at`, **simdiki zamandan** ileriye dogru yeniden hesaplanir (gecmisten degil).

**Ornek:**
- Proje cron'u: `0 9 * * *` (her gun 09:00)
- Sunucu 3 gun kapali kaldi
- Sunucu 4. gun saat 14:00'te acildi
- Scheduler 1 tetikleme yapar (3 degil)
- `next_run_at` = bir sonraki 09:00 (5. gun) olarak hesaplanir

Bu yaklasim bilincidir. Kacirilan fire'larin biriktirilmesi kontrolsuz toplu uretim riski olusturur. Admin kacirilan calistirmalari fark ederse manuel tetik ile telafi edebilir.

---

## Duplicate Fire Korunmasi

Ayni projenin ayni fire zamani icin iki kez tetiklenmesi engellenir.

**Mekanizma:** Her tetikleme icin benzersiz bir `scheduled_run_id` olusturulur:

```
scheduled_run_id = "{project_id}:{fire_time_iso}"
```

**Ornek:** `550e8400-e29b-41d4-a716-446655440000:2026-04-12T09:00:00+00:00`

Ayni `scheduled_run_id` ile ikinci bir tetikleme girisimi reddedilir. Bu durum audit log'a yazilir ama hata olarak degerlendirilmez.

Bu koruma su senaryolari kapsar:
- Scheduler tick'inin `next_run_at` guncellemesinden once tekrar calisma ihtimali
- Race condition durumlarinda paralel tetikleme girisimi
- Manuel restart sonrasi ayni fire zamaninin tekrar islenmesi

---

## Neden Local / In-Process?

| Alternatif | Neden Secilmedi |
|---|---|
| Celery + Redis/RabbitMQ | Harici broker bagimliligi. Localhost-first prensibine aykiri. |
| APScheduler persistent store | Ek bagimlilik. SQLite WAL mode zaten yeterli. |
| Cron daemon (OS-level) | Platform bagimli. ContentHub'in kendi lifecycle'i icinde yonetilemiyor. |
| Ayri scheduler servisi | Tek makine MVP'si icin overengineering. |

Mevcut yaklasim: Python `asyncio.Task` olarak FastAPI lifespan icinde calisir. Avantajlari:

- Sifir harici bagimlilik
- Ayni process icinde database erisimi
- Temiz startup/shutdown lifecycle
- Yeterli hassasiyet (saniye bazinda poll)
- Debug ve log kolayligi

**Bilinen sinir:** Tek process'e bagli. Sunucu durursa scheduler da durur. Dagitik veya yuksek-erisilebilirlik gerektiren senaryolar icin gelecekte harici scheduler eklenebilir.

---

## Hata Dayanikliligi

### Tek Proje Hatasi Scheduler'i Durdurmaz

Her proje tetiklemesi izole bir database session icinde calistirilir. Bir projenin `trigger_full_auto()` cagrisi exception firlatirsa:

1. Exception yakalanir ve loglanir
2. Projenin `SCHEDULER_STATE`'ine hata yazilir
3. Projenin `automation_fallback_on_error` policy'si uygulanir (pause/retry_once/stop)
4. Scheduler diger projelere devam eder

### Scheduler Tick Hatasi

Tick seviyesinde beklenmeyen bir hata olursa (ornegin database connection hatasi):

1. Exception yakalanir ve loglanir
2. Scheduler durmaz, bir sonraki tick'te tekrar dener

### Admin Gorunurlugu

- Scheduler durumu admin panelinden gorulebilir
- Her proje icin son tetikleme zamani, sonucu ve varsa hata mesaji gorunur
- Audit log tum tetikleme, guard reddi ve hata olaylarini icerir

---

## Operasyonel Notlar

### Scheduler'i Baslatma/Durdurma

Scheduler `automation.scheduler.enabled` ayari ile kontrol edilir. Bu ayar degistiginde:
- `true -> false`: Bir sonraki tick'te scheduler projeleri degerlendirmeyi birakir
- `false -> true`: Bir sonraki tick'te scheduler calismaya baslar

Sunucu restart gerektirmez. Ayar degisikligi sonraki tick'te etkili olur.

### Poll Araligi Degistirme

`automation.scheduler.poll_interval_seconds` degistirildiginde yeni deger sonraki sleep cycle'dan itibaren gecerli olur.

### Proje Cron Degistirme

Proje cron ifadesi degistirildiginde `next_run_at` otomatik olarak yeniden hesaplanir. Eski zamanlama gecersiz olur, yeni ifadeye gore sonraki calistirma zamani belirlenir.

### Timezone Degistirme

Proje timezone'u degistirildiginde `next_run_at` yeni timezone'a gore yeniden hesaplanir.
