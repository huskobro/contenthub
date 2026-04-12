# Settings Registry -- Otomasyon Ayar Anahtarlari

Tum `automation.*` ayarlari Settings Registry'de tanimlidir. Admin `/admin/settings` sayfasinda `automation` grubunda gorunur ve yonetilir. Kullanici tarafinda bu ayarlar gorunmez; proje bazli konfigurasyonlar proje detay sayfasindan yapilir.

---

## Full-Auto Ayarlari (10 Key)

### 1. `automation.full_auto.enabled`

| Ozellik | Deger |
|---|---|
| Type | boolean |
| Default | `false` |
| Kontrol | Admin only |

Global kill switch. `false` oldugunda hicbir proje full-auto modda calistirilamaz. Scheduler projeleri atlar, manuel tetik guard'dan reddedilir. Bu ayar acilmadan full-auto ozelligi tamamen pasiftir.

---

### 2. `automation.full_auto.allowed_modules`

| Ozellik | Deger |
|---|---|
| Type | json |
| Default | `["standard_video"]` |
| Kontrol | Admin only |

Full-auto modda tetiklenebilecek modul tiplerinin whitelist'i. Projnin `module_type` degeri bu listede yoksa guard reddeder. v1'de yalnizca `standard_video` desteklenir. Admin gelecekte baska modul tipleri ekleyebilir.

---

### 3. `automation.full_auto.require_review_gate`

| Ozellik | Deger |
|---|---|
| Type | boolean |
| Default | `true` |
| Kontrol | Admin only |

Yeni projelere atanacak default review gate degeri. `true` ise uretim tamamlandiktan sonra yayin icin insan onayi gerekir. Proje bazinda override edilebilir (proje kolonu: `automation_require_review_gate`). Ancak global'de true ise admin niyetine bagli olarak proje seviyesinde kapatilabilirlik guard implementasyonuyla kontrol edilir.

---

### 4. `automation.full_auto.default_publish_policy`

| Ozellik | Deger |
|---|---|
| Type | string |
| Default | `"draft"` |
| Kontrol | Admin only |

Yeni projelere atanacak default publish policy. Gecerli degerler: `draft`, `schedule`, `publish_now`. v1'de `publish_now` fiilen `draft` gibi calisir; otomatik yayin aktif degildir. Proje bazinda override edilebilir (proje kolonu: `automation_publish_policy`).

---

### 5. `automation.full_auto.max_concurrent_per_user`

| Ozellik | Deger |
|---|---|
| Type | integer |
| Default | `1` |
| Kontrol | Admin only |

Bir kullanicinin ayni anda kac full-auto job'u calistirabilecegininin ust siniri. Bu deger global ve proje bazinda override edilemez. Limit asildiginda yeni tetikleme reddedilir.

---

### 6. `automation.full_auto.max_concurrent_per_project`

| Ozellik | Deger |
|---|---|
| Type | integer |
| Default | `1` |
| Kontrol | Admin only |

Bir projenin ayni anda kac full-auto job'u calistirabilecegininin ust siniri. Genelde 1 yeterlidir; ayni proje icin paralel uretim istenmez. Proje bazinda override edilemez.

---

### 7. `automation.full_auto.max_daily_runs_per_project`

| Ozellik | Deger |
|---|---|
| Type | integer |
| Default | `5` |
| Kontrol | Admin only |

Bir projenin gunde kac kez full-auto tetiklenebileceginin global tavani. Proje bazinda `automation_max_runs_per_day` ile daha dusuk bir deger konulabilir ama bu tavan asilamaz. Effective limit: `min(global, project)`. `runs_today` sayaci her gun sifirlanir.

---

### 8. `automation.full_auto.require_template`

| Ozellik | Deger |
|---|---|
| Type | boolean |
| Default | `true` |
| Kontrol | Admin only |

Full-auto tetikleme icin projenin bir default template atamis olmasi zorunlu mu? `true` ise `automation_default_template_id = null` olan projeler tetiklenemez. Guard kontrolu sirasinda denetlenir.

---

### 9. `automation.full_auto.require_channel`

| Ozellik | Deger |
|---|---|
| Type | boolean |
| Default | `true` |
| Kontrol | Admin only |

Full-auto tetikleme icin projenin bir publish channel'a sahip olmasi zorunlu mu? `true` ise channel atanmamis projeler tetiklenemez.

---

### 10. `automation.full_auto.require_blueprint`

| Ozellik | Deger |
|---|---|
| Type | boolean |
| Default | `false` |
| Kontrol | Admin only |

Full-auto tetikleme icin projenin bir style blueprint atamis olmasi zorunlu mu? Varsayilan `false` cunku blueprint henuz her proje icin zorunlu degildir. Admin ihtiyac halinde acabilir.

---

## Scheduler Ayarlari (3 Key)

### 11. `automation.scheduler.enabled`

| Ozellik | Deger |
|---|---|
| Type | boolean |
| Default | `false` |
| Kontrol | Admin only |

Scheduler background task'ini acar/kapatir. `false` ise tick'ler calismaz, cron-based tetikleme olmaz. Manuel tetik bu ayardan etkilenmez. `automation.full_auto.enabled` ile birlikte her ikisinin de `true` olmasi gerekir cron tetiklemesi icin.

---

### 12. `automation.scheduler.poll_interval_seconds`

| Ozellik | Deger |
|---|---|
| Type | integer |
| Default | `60` |
| Kontrol | Admin only |

Scheduler'in kac saniyede bir tick atacaginini belirler. Daha kisa aralik daha hassas zamanlama demektir ama gereksiz yere dusuk tutulmasina gerek yoktur. 60 saniye cogu senaryo icin yeterlidir.

---

### 13. `automation.scheduler.default_timezone`

| Ozellik | Deger |
|---|---|
| Type | string |
| Default | `"UTC"` |
| Kontrol | Admin only |

Proje bazinda timezone belirtilmemisse cron ifadesinin hangi timezone'da degerlendirilecegini belirler. Gecerli IANA timezone string'i olmalidir (ornegin `Europe/Istanbul`, `America/New_York`).

---

## Ozet Tablo

| # | Key | Type | Default | Aciklama |
|---|---|---|---|---|
| 1 | `automation.full_auto.enabled` | boolean | `false` | Global kill switch |
| 2 | `automation.full_auto.allowed_modules` | json | `["standard_video"]` | Modul whitelist |
| 3 | `automation.full_auto.require_review_gate` | boolean | `true` | Default review gate |
| 4 | `automation.full_auto.default_publish_policy` | string | `"draft"` | Default publish policy |
| 5 | `automation.full_auto.max_concurrent_per_user` | integer | `1` | Kullanici basina concurrent limit |
| 6 | `automation.full_auto.max_concurrent_per_project` | integer | `1` | Proje basina concurrent limit |
| 7 | `automation.full_auto.max_daily_runs_per_project` | integer | `5` | Gunluk global tavan |
| 8 | `automation.full_auto.require_template` | boolean | `true` | Template zorunlulugu |
| 9 | `automation.full_auto.require_channel` | boolean | `true` | Channel zorunlulugu |
| 10 | `automation.full_auto.require_blueprint` | boolean | `false` | Blueprint zorunlulugu |
| 11 | `automation.scheduler.enabled` | boolean | `false` | Scheduler acik/kapali |
| 12 | `automation.scheduler.poll_interval_seconds` | integer | `60` | Tick araligi (saniye) |
| 13 | `automation.scheduler.default_timezone` | string | `"UTC"` | Fallback timezone |
