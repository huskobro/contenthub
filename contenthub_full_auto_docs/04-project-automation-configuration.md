# Proje Bazli Otomasyon Konfigurasyonu

## Nerede Gorunur?

Proje bazli otomasyon ayarlari kullanici tarafinda proje detay sayfasinda yer alir:

- **Legacy layout**: "Otomasyon" tab'i altinda
- **Canvas layout**: Alt section olarak
- **Atrium layout**: Alt section olarak

Admin panelinde bu ayarlar dogrudan proje yonetim sayfasindan da erisilebilir.

---

## Konfigurasyonda Immediate-Save Davranisi

Proje otomasyon panelinde "Kaydet" butonu yoktur. Her alan degisikligi aninda backend'e PATCH istegi gonderir. Basarili guncelleme sonrasi kullaniciya kisa bir toast bildirimi gosterilir.

Bu tasarimin nedeni: otomasyon ayarlari birbirine bagli karmasik bir form degil, bagimsiz toggle ve deger alanlaridir. Kullanicinin cron ifadesini degistirip "Kaydet"e basmayi unutmasi operasyonel risk olusturur.

---

## Alan Detaylari

### `automation_enabled`

**Ana toggle.** `false` ise bu projenin tum otomasyon davranislari pasiftir. Scheduler bu projeyi atlar, manuel tetik reddedilir.

| Ozellik | Deger |
|---|---|
| Tip | boolean |
| Default | `false` |
| UI | Toggle switch |

---

### `automation_run_mode`

Projenin calisma modunu belirler.

| Deger | Davranis |
|---|---|
| `manual` | Otomasyon pasif. Kullanici her adimi kendisi baslatir. |
| `assisted` | Kullanici baslangici yapar, step gecisleri otomatik. |
| `full_auto` | Sistem her seyi baslatir ve yonetir. Cron veya manuel tetik. |

Sadece `full_auto` modda tam otomatik davranis (cron tetikleme dahil) aktiftir.

| Ozellik | Deger |
|---|---|
| Tip | enum (manual, assisted, full_auto) |
| Default | `manual` |
| UI | 3 secenekli radio/select |

---

### `automation_schedule_enabled`

Cron zamanlamasini acar/kapatir. `false` ise proje full_auto modda olsa bile sadece manuel tetik mumkundur. Cron-based otomatik calistirma yapilmaz.

| Ozellik | Deger |
|---|---|
| Tip | boolean |
| Default | `false` |
| UI | Toggle switch |
| Bagimlilik | Sadece `run_mode = full_auto` oldugunda anlamli |

---

### `automation_cron_expression`

5 alanli standart cron ifadesi: `dakika saat gun ay haftanin-gunu`

**Ornekler:**

| Ifade | Anlam |
|---|---|
| `0 9 * * 1-5` | Hafta ici her gun saat 09:00 |
| `*/30 * * * *` | Her 30 dakikada bir |
| `0 8,12,18 * * *` | Her gun saat 08:00, 12:00 ve 18:00 |
| `0 10 * * 1` | Her pazartesi saat 10:00 |
| `0 0 1 * *` | Her ayin 1'i gece yarisi |

**Desteklenen syntax:** `*`, `N`, `N,M`, `A-B`, `*/N`, `A-B/N`

**Desteklenmeyen:** `L`, `#`, `@weekly`, ay isimleri, gun isimleri

| Ozellik | Deger |
|---|---|
| Tip | string (nullable) |
| Default | `null` |
| UI | Text input + cron preview |

**Cron Preview:** Cron ifadesi girildiginde UI aninda sonraki 5 calistirma zamanini gosterir. Bu hesaplama client-side yapilir ve kullaniciya ifadesinin dogru oldugunu teyit ettirir.

---

### `automation_timezone`

Cron ifadesinin hangi saat diliminde degerlendirilecegini belirler.

| Ozellik | Deger |
|---|---|
| Tip | string |
| Default | `"UTC"` (veya global `automation.scheduler.default_timezone` degeri) |
| UI | Timezone selector |

IANA timezone formati kullanilir: `Europe/Istanbul`, `America/New_York`, `Asia/Tokyo` vb.

---

### `automation_require_review_gate`

Uretim tamamlandiktan sonra yayin icin insan onayi gerekip gerekmedigini belirler. `true` ise icerik review bekler, otomatik olarak yayina gecmez.

| Ozellik | Deger |
|---|---|
| Tip | boolean |
| Default | Global `automation.full_auto.require_review_gate` degerinden cekilir |
| UI | Toggle switch |

---

### `automation_publish_policy`

Uretim tamamlandiktan sonra icerik ne durumda olusturulacagini belirler.

| Deger | Davranis |
|---|---|
| `draft` | Icerik taslak olarak kalir. Kullanici/admin inceleyip yayinlar. |
| `schedule` | Icerik zamanlama kuyrugunna eklenir (gelecek implementasyon). |
| `publish_now` | v1'de fiilen `draft` olarak calisir. Otomatik yayin henuz aktif degildir. |

| Ozellik | Deger |
|---|---|
| Tip | enum (draft, schedule, publish_now) |
| Default | Global `automation.full_auto.default_publish_policy` degerinden cekilir |
| UI | Select dropdown |

---

### `automation_fallback_on_error`

Pipeline calisirken hata olusursa ne yapilacagini belirler.

| Deger | Davranis |
|---|---|
| `pause` | Proje otomasyonu duraklatilir. Bir sonraki cron tetiklemesi yapilmaz. Admin/kullanici mudahale edene kadar bekler. |
| `retry_once` | Hatali job bir kez yeniden denenir. Ikinci hatada `pause` davranisina duser. |
| `stop` | Proje otomasyonu tamamen kapatilir (`automation_enabled = false` yapilir). |

| Ozellik | Deger |
|---|---|
| Tip | enum (pause, retry_once, stop) |
| Default | `"pause"` |
| UI | Select dropdown |

---

### `automation_max_runs_per_day`

Projenin gunde kac kez full-auto tetiklenebilecegi. `null` ise global limit (`automation.full_auto.max_daily_runs_per_project`) gecerlidir. Deger verilmisse effective limit `min(global, proje)` olur.

| Ozellik | Deger |
|---|---|
| Tip | integer (nullable) |
| Default | `null` |
| UI | Number input (bos birakilabilir) |

---

### `automation_default_template_id`

Full-auto calistirmalarda kullanilacak content template. Global `require_template = true` ise bu alan dolu olmalidir, aksi halde tetikleme reddedilir.

| Ozellik | Deger |
|---|---|
| Tip | UUID (nullable, foreign key -> content_templates.id) |
| Default | `null` |
| UI | Template selector dropdown |

---

### `automation_default_blueprint_id`

Full-auto calistirmalarda kullanilacak style blueprint. Global `require_blueprint = true` ise bu alan dolu olmalidir.

| Ozellik | Deger |
|---|---|
| Tip | UUID (nullable, foreign key -> style_blueprints.id) |
| Default | `null` |
| UI | Blueprint selector dropdown |

---

## Read-Only Durum Alanlari

Bu alanlar backend tarafindan guncellenir, kullanici tarafindan degistirilemez. UI'da bilgi amacli gosterilir.

| Alan | Tip | Aciklama |
|---|---|---|
| `last_run_at` | datetime (nullable) | Son full-auto calistirmanin baslangic zamani |
| `next_run_at` | datetime (nullable) | Scheduler'in hesapladigi bir sonraki calistirma zamani |
| `runs_today` | integer | Bugun yapilan full-auto calistirma sayisi |
| `runs_today_date` | date | `runs_today` sayacinin hangi gune ait oldugu. Gun degistiginde sayac sifirlanir. |

---

## Cron Preview Detayi

Kullanici cron ifadesini girdiginde veya degistirdiginde, UI asagidaki bilgileri aninda gosterir:

```
Sonraki 5 calistirma:
  1. 2026-04-13 09:00 (Europe/Istanbul)
  2. 2026-04-14 09:00 (Europe/Istanbul)
  3. 2026-04-15 09:00 (Europe/Istanbul)
  4. 2026-04-16 09:00 (Europe/Istanbul)
  5. 2026-04-17 09:00 (Europe/Istanbul)
```

Bu hesaplama seciilen timezone'a gore yapilir. Gecersiz cron ifadesi girilirse hata mesaji gosterilir, PATCH yapilmaz.
