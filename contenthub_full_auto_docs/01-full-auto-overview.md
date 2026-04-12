# Full-Auto Mode -- Genel Bakis

## Ne?

Full-Auto Mode, ContentHub'da proje bazli tam otomatik icerik uretimi saglar. Standard video pipeline'ini (script -> metadata -> TTS -> visual -> subtitle -> render -> thumbnail) insan mudahalesi olmadan baslatir ve tamamlar.

Tetikleme iki sekilde olabilir:

- **Cron zamanlamasi**: Belirlenen cron ifadesine gore scheduler otomatik tetikler.
- **Manuel tetik**: Kullanici veya admin proje uzerinden "Simdi Calistir" ile tek seferlik baslangic yapar.

Her iki durumda da pipeline uclararasi (end-to-end) otomatik calisir. Uretilen icerik varsayilan olarak **draft** durumunda kalir; otomatik yayin v1'de aktif degildir.

---

## Neden Eklendi?

Tekrarli icerik uretim surecleri icin her seferinde kullanicinin wizard'dan gecmesi gereksiz is yuku olusturur. Sabah 09:00'da her gun bir video uretilmesi gereken projelerde bu surecin:

- zamanlanmis olarak baslamasi,
- guard kontrollerinden gecmesi,
- audit log'a yazilmasi,
- hata durumunda tanimli bir fallback izlemesi

gerekir. Full-Auto Mode bu ihtiyaci karsilar.

---

## 3 Calisma Modu

ContentHub'da her proje `automation_run_mode` alanina sahiptir. Uc deger alabilir:

### manual (varsayilan)

- Kullanici her adimi kendisi baslatir.
- Otomasyon pasif. Cron calistirmaz, otomatik step gecisi yoktur.
- Klasik wizard-driven uretim sureci gecerlidir.

### assisted

- Kullanici baslangici yapar (ilk tetigi verir).
- Sistem step'ler arasi gecisleri otomatik yapar (`auto_advanced=True`).
- Guard'lar aktif: template kontrolu, daily limit, concurrent limit hepsi gecerli.
- Kullanicinin her step'i tek tek onaylamasi gerekmez ama baslangic insan tarafindan yapilir.

### full_auto

- Sistem hem baslatici hem yonetici taraftir.
- Cron ile zamanlanmis veya manuel tetik ile baslatilabilir.
- Guard'lar aktif: daily limit, concurrent limit, template/channel gereksinimleri.
- Review gate varsayilan olarak acik (`automation_require_review_gate=true`). Uretim bittikten sonra yayin icin onay beklenir.
- Audit zorunlu: Her tetikleme, her guard kontrolu, her hata audit log'a yazilir.

---

## Neden Sadece standard_video?

Ilk fazda Full-Auto Mode yalnizca `standard_video` modulunu destekler.

Nedeni basit: `news_bulletin` modulu farkli input gereksinimine sahiptir. Kaynak tarama, haber secimi, dedupe kontrolu gibi adimlar otomasyon oncesi ek karar katmanlari gerektirir. Bu katmanlar henuz full-auto uyumlu degildir.

En stabil ve en iyi test edilmis pipeline ile baslamak operasyonel guvenlik acisindan dogru karardi.

Desteklenen moduller ayarlanabilir: `automation.full_auto.allowed_modules` Settings Registry key'i bir JSON array tutar. Varsayilan deger `["standard_video"]`. Admin bu listeye gelecekte baska moduller ekleyebilir.

---

## Ne Yapmaz (v1 Sinirlari)

| Ozellik | Durum |
|---|---|
| Otomatik yayin (auto-publish) | Yok. v1'de icerik her zaman draft olarak kalir. `publish_now` policy'si bile fiilen draft olusturur. |
| Kaynak otomatik secme | Yok. News bulletin'e kaynak secimi full-auto kapsaminda degildir. |
| Multi-platform dagitim | Yok. Publish adaptorleri mevcut ama full-auto ile entegre degildir. |
| Dagitik scheduler | Yok. Scheduler in-process async task olarak calisir. Tek makine MVP'si icin yeterli. |
| Assisted mode icin cron | Yok. Cron yalnizca full_auto modda gecerlidir. Assisted mod baslangici insan gerektirir. |

---

## Terminoloji

| Terim | Anlam |
|---|---|
| **run_mode** | Projenin otomasyon seviyesi: manual, assisted, full_auto |
| **trigger_source** | Bir job'un nasil baslatildigini belirtir: user_manual, user_wizard, cron_scheduled, api_trigger |
| **guard** | Tetikleme oncesi yapilan kontrol: daily limit, concurrent limit, template varlik kontrolu vb. |
| **review gate** | Uretim tamamlandiktan sonra yayina gecmeden once insan onay adimi |
| **scheduled_run_id** | Duplicate fire korunmasi icin kullanilan benzersiz anahtar: `{project_id}:{fire_time_iso}` |
| **effective setting** | Global ve proje ayarlarinin birlestirilmis sonucu. Ornegin daily limit icin `min(global, project)` |
