# 08 — Guard'lar ve Engelleme Nedenleri

> Full-auto trigger oncesinde calistirilan tum guard kontrolleri. Her guard'in ne kontrol ettigi, hangi hata mesajini verdigi ve nerede kontrol edildigi.

---

## Guard Evaluation Akisi

Tum guard'lar `evaluate_guards()` fonksiyonunda (service seviyesi) sirayla degerlendirilir. Hem HTTP endpoint (evaluate + trigger) hem scheduler ayni fonksiyonu kullanir.

Guard'lar violations listesine eklenir. Tumu gecerse `allowed=True` doner. Bir veya daha fazla violation varsa `allowed=False` doner ve trigger reddedilir.

**Evaluation sirasi:**

```
Global kill switch
    -> Module allowlist
        -> Phase 1 module support
            -> Project toggle
                -> Required template
                    -> Required channel
                        -> Required blueprint
                            -> Concurrency per project
                                -> Concurrency per user
                                    -> Daily quota
                                        -> Duplicate fire (sadece scheduled)
```

---

## Guard Detaylari

### 1. Global Kill Switch

- **Kontrol**: `automation.full_auto.enabled` settings degeri
- **Kosul**: Deger `false` ise
- **Hata mesaji**: `"Global tam otomatik mod kapali (automation.full_auto.enabled=false)."`
- **Konum**: `evaluate_guards()`, ilk kontrol
- **Yonetim**: Admin > Settings > automation grubu

### 2. Module Allowlist

- **Kontrol**: Projenin `module_type` degeri, `automation.full_auto.allowed_modules` listesinde mi
- **Kosul**: Proje modulu izinli listede degilse
- **Hata mesaji**: `"Proje modulu '{module}' tam otomatik icin izinli degil. Izinli moduller: {list}."`
- **Konum**: `evaluate_guards()`
- **Yonetim**: Admin > Settings > `automation.full_auto.allowed_modules` (JSON array)

### 3. Phase 1 Module Support

- **Kontrol**: `SUPPORTED_MODULES_V1` constant'i (hardcoded: `("standard_video",)`)
- **Kosul**: Proje modulu v1 destekli modullerde degilse
- **Hata mesaji**: `"Faz 1 destegi yalnizca ('standard_video',). '{module}' henuz tam otomatik calistirilamaz."`
- **Konum**: `evaluate_guards()`
- **Not**: Bu kontrol admin panelden degistirilemez. Kod icinde sabit.

### 4. Project Toggle

- **Kontrol**: `ContentProject.automation_enabled` alani
- **Kosul**: `false` ise
- **Hata mesaji**: `"Proje otomasyonu kapali (automation_enabled=false)."`
- **Konum**: `evaluate_guards()`
- **Yonetim**: User > Proje Detay > Otomasyon > Enable toggle

### 5. Required Template

- **Kontrol**: `ContentProject.automation_default_template_id` dolulugu
- **Kosul**: `automation.full_auto.require_template=true` ve template ID bossa
- **Hata mesaji**: `"Varsayilan template tanimli degil (automation_default_template_id)."`
- **Konum**: `evaluate_guards()`
- **Yonetim**: Global ayar `require_template` + proje seviyesi template secimi

### 6. Required Channel

- **Kontrol**: `ContentProject.channel_profile_id` dolulugu
- **Kosul**: `automation.full_auto.require_channel=true` ve kanal ID bossa
- **Hata mesaji**: `"Proje icin kanal bagli degil (channel_profile_id)."`
- **Konum**: `evaluate_guards()`
- **Yonetim**: Global ayar `require_channel` + proje seviyesi kanal baglantisi

### 7. Required Blueprint

- **Kontrol**: `ContentProject.automation_default_blueprint_id` dolulugu
- **Kosul**: `automation.full_auto.require_blueprint=true` ve blueprint ID bossa
- **Hata mesaji**: `"Varsayilan style blueprint tanimli degil."`
- **Konum**: `evaluate_guards()`
- **Yonetim**: Global ayar `require_blueprint` (varsayilan: false) + proje seviyesi blueprint secimi

### 8. Concurrency Per Project

- **Kontrol**: Ayni projede queued veya running durumunda `run_mode="full_auto"` job sayisi
- **Kosul**: Calisan sayi >= `automation.full_auto.max_concurrent_per_project` (varsayilan: 1)
- **Hata mesaji**: `"Proje icin calisan full-auto is sayisi limiti asildi ({running}/{limit})."`
- **Konum**: `evaluate_guards()`, DB sorgusu
- **Yonetim**: Admin > Settings > `max_concurrent_per_project`

### 9. Concurrency Per User

- **Kontrol**: Ayni kullanicinin (owner_id) queued veya running durumunda `run_mode="full_auto"` job sayisi
- **Kosul**: Calisan sayi >= `automation.full_auto.max_concurrent_per_user` (varsayilan: 1)
- **Hata mesaji**: `"Kullanici basi full-auto limiti asildi ({running}/{limit})."`
- **Konum**: `evaluate_guards()`, DB sorgusu
- **Yonetim**: Admin > Settings > `max_concurrent_per_user`

### 10. Daily Quota

- **Kontrol**: Projenin bugunki calistirma sayisi (`automation_runs_today`) ve limit (`automation_max_runs_per_day`)
- **Kosul**: `runs_today >= min(global_daily, project_daily)` — gun donmusse quota sifirlanir
- **Hata mesaji**: `"Gunluk tam otomatik calisma limiti asildi ({runs}/{limit})."`
- **Konum**: `evaluate_guards()`
- **Yonetim**: Global ayar `max_daily_runs_per_project` (varsayilan: 5) + proje seviyesi `automation_max_runs_per_day`

### 11. Duplicate Fire (Sadece Scheduled)

- **Kontrol**: Ayni `scheduled_run_id` ile zaten olusturulmus job var mi
- **Kosul**: DB'de ayni ID ile job bulunursa
- **Hata mesaji**: `"Bu zaman dilimi icin bu proje zaten calistirilmis (duplicate fire)."`
- **Konum**: `trigger_full_auto()`, sadece `scheduled_run_id != None` durumunda aktif
- **Not**: Bu guard evaluate_guards()'ta degil, trigger fonksiyonunda ayri kontrol edilir. Manuel trigger'da devre disi.

---

## Warnings (Non-Fatal)

Guard evaluation sirasinda bazi durumlar violation degil, uyari olarak raporlanir. Uyarilar trigger'i engellemez.

### Phase 1 Publish Note

- **Kosul**: `automation_publish_policy == "publish_now"`
- **Uyari mesaji**: `"Faz 1: 'publish_now' politikasi draft olarak uygulanir (review gate oncelikli)."`
- **Davranis**: Trigger engellenmez. Sadece operatoru bilgilendirir.

---

## Guard Sonuc Formati

```json
{
  "allowed": false,
  "violations": [
    "Global tam otomatik mod kapali (automation.full_auto.enabled=false).",
    "Proje otomasyonu kapali (automation_enabled=false)."
  ],
  "warnings": []
}
```

Birden fazla violation ayni anda donebilir. Tum guard'lar her zaman degerlendirilir (ilk hatada durmaz), boylece operator tek seferde tum sorunlari gorebilir.

---

## Kaynak Dosyalar

| Dosya | Icerik |
|-------|--------|
| `backend/app/full_auto/service.py` | `evaluate_guards()`: Tum guard logic'i |
| `backend/app/full_auto/service.py` | `trigger_full_auto()`: Duplicate fire kontrolu |
| `backend/app/full_auto/service.py` | `SUPPORTED_MODULES_V1`: Phase 1 hardcoded constant |
| `backend/app/full_auto/schemas.py` | `GuardCheckResult`: violations + warnings response modeli |
