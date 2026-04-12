# Global ve Proje Bazli Kontrol Katmanlari

## Neden Iki Katman?

Full-Auto Mode iki bagimsiz kontrol katmaniyla yonetilir. Bu tasarimin nedeni basit: admin tum sistemi tek noktadan durdurabilmeli, ama her proje kendi calisma ritmine sahip olabilmeli.

---

## Global Katman (Settings Registry)

Settings Registry uzerinde tanimlanan 13 adet `automation.*` key'i tum sistemi etkiler.

Admin bu katmandan:

- Full-Auto'yu tamamen kapatabilir (kill switch)
- Hangi modullerin full-auto kullanabilecegini sinirlandirabilir
- Gunluk calistirma tavanini belirleyebilir
- Template/channel/blueprint zorunluluklarini ayarlayabilir
- Scheduler'i acip kapatabilir
- Concurrent job limitlerini kontrol edebilir

Bu ayarlar `/admin/settings` sayfasinda `automation` grubunda gorunur.

---

## Proje Katmani (ContentProject Tablosu)

Her ContentProject kaydinda 15 otomasyon kolonu bulunur. Bunlar projeye ozel davranisi tanimlar:

- Cron ifadesi ve timezone
- Calisma modu (manual/assisted/full_auto)
- Review gate tercihi
- Publish policy
- Hata durumunda davranis (fallback)
- Gunluk limit (proje bazli)
- Default template ve blueprint atamalari
- Read-only durum alanlari (last_run_at, next_run_at, runs_today)

Bu ayarlar kullanici tarafinda proje detay sayfasinda yonetilir.

---

## Precedence (Oncelik) Mantigi

**Global her zaman usttedir.**

Kural basit:

1. `automation.full_auto.enabled = false` ise **hicbir proje** full-auto calistirmaz. Proje seviyesindeki `automation_enabled = true` bu durumda etkisizdir.

2. Sayisal limitlerde **effective deger = min(global, project)** formuluyle hesaplanir.
   - Global `max_daily_runs_per_project = 5`, proje `automation_max_runs_per_day = 3` ise effective limit **3**.
   - Global `max_daily_runs_per_project = 5`, proje `automation_max_runs_per_day = 10` ise effective limit **5**. Proje global tavani asamaz.

3. Boolean gereksinimler (require_template, require_channel, require_blueprint) global seviyede zorunlu kilinirsa proje bunu gevsetemez. Global `require_template = true` ise proje template olmadan tetiklenemez.

4. Default degerler proje olusturulurken global ayarlardan cekilir ama sonradan proje bazinda degistirilebilir (izin verilen alanlarda).

---

## Kontrol Dagilim Tablosu

### Sadece Global (Proje Seviyesinde Override Yok)

| Ayar | Aciklama |
|---|---|
| `automation.full_auto.enabled` | Kill switch. Kapali ise tum sistem durur. |
| `automation.full_auto.allowed_modules` | Hangi moduller full-auto kullanabilir. |
| `automation.full_auto.require_template` | Template zorunlulugu. |
| `automation.full_auto.require_channel` | Channel zorunlulugu. |
| `automation.full_auto.require_blueprint` | Blueprint zorunlulugu. |
| `automation.full_auto.max_concurrent_per_user` | Bir kullanicinin ayni anda kac full-auto job'u olabilir. |
| `automation.full_auto.max_concurrent_per_project` | Bir projenin ayni anda kac full-auto job'u olabilir. |
| `automation.scheduler.enabled` | Scheduler acik/kapali. |
| `automation.scheduler.poll_interval_seconds` | Scheduler tick araligi. |
| `automation.scheduler.default_timezone` | Fallback timezone. |

### Sadece Proje (Global Karsiligi Yok)

| Ayar | Aciklama |
|---|---|
| `automation_enabled` | Bu projenin otomasyonu acik mi. |
| `automation_run_mode` | manual / assisted / full_auto |
| `automation_schedule_enabled` | Cron zamanlamasi aktif mi. |
| `automation_cron_expression` | 5 alanli cron ifadesi. |
| `automation_timezone` | Cron degerlendirme timezone'u. |
| `automation_default_template_id` | Otomatik calistirmada kullanilacak template. |
| `automation_default_blueprint_id` | Otomatik calistirmada kullanilacak blueprint. |

### Her Iki Katmanda (Effective = min veya stricter)

| Ayar | Global Key | Proje Kolonu | Birlesim |
|---|---|---|---|
| Gunluk limit | `automation.full_auto.max_daily_runs_per_project` | `automation_max_runs_per_day` | `min(global, project)`. Project null ise global gecerli. |

### Global Default -> Proje Override

| Ayar | Global Key (Default Saglar) | Proje Kolonu (Override Edebilir) |
|---|---|---|
| Review gate | `automation.full_auto.require_review_gate` | `automation_require_review_gate` |
| Publish policy | `automation.full_auto.default_publish_policy` | `automation_publish_policy` |
| Fallback on error | (hardcoded default: pause) | `automation_fallback_on_error` |

Bu kategoride global deger yeni proje olusturulurken default olarak atanir. Proje sonradan kendi degerini set edebilir. Ancak bazi guard'lar (ornegin require_review_gate global'de true ise) proje tarafindan gevsetilemez -- bu davranis guard implementasyonuna baglidir.

---

## Ornek Senaryolar

### Senaryo 1: Admin Full-Auto'yu Kapatir

Admin `automation.full_auto.enabled = false` yapar. Tum projelerin full-auto tetiklemeleri durur. Scheduler tick'leri projeleri atlar. Manuel tetik denemeleri guard'dan donus alir.

### Senaryo 2: Proje Limiti Global'in Altinda

Global `max_daily_runs_per_project = 5`. Proje `automation_max_runs_per_day = 2`. Proje gunde en fazla 2 kez calisir.

### Senaryo 3: Proje Limiti Global'in Ustunde

Global `max_daily_runs_per_project = 5`. Proje `automation_max_runs_per_day = 20`. Effective limit 5. Proje global tavani asamaz.

### Senaryo 4: Template Zorunlu Ama Proje Template Atamamis

Global `require_template = true`. Proje `automation_default_template_id = null`. Guard reddeder, tetikleme olmaz, audit log'a yazilir.
