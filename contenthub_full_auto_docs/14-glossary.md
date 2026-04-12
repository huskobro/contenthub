# Full-Auto Mode: Sozluk (Glossary)

---

### run_mode

Job'un hangi modda olusturuldugunu belirten alan. Uc degeri vardir: `"manual"` (varsayilan — kullanici her adimi kontrol eder), `"assisted"` (yari-otomatik — bazi adimlar otomatik), `"full_auto"` (tam otomatik — tum adimlar otomatik). Job tablosunda String olarak saklanir.

---

### trigger_source

Job'u kimin veya neyin tetikledigini belirten alan. Uc degeri vardir: `"manual"` (kullanici UI'dan tikladi), `"scheduled"` (cron scheduler tetikledi), `"api"` (harici bir API cagrisi tetikledi). Job tablosunda String olarak saklanir.

---

### auto_advanced

`true` ise step'ler arasi gecis otomatik yapilir; operator mudahalesi gerekmez. `full_auto` ve `assisted` modda `true` olarak set edilir. `manual` modda `false`'tur. Job tablosunda Boolean olarak saklanir.

---

### scheduled_run_id

Scheduler'in her tetikleme icin olusturdugu benzersiz key. Formati: `"{project_id}:{fire_time_iso}"`. Ornek: `"abc123:2026-04-14T09:00:00+00:00"`. Ayni cron eslesmesinin ikinci kez tetiklenmesini (duplicate fire) onler. Job tablosunda nullable String olarak saklanir; manuel tetiklemelerde `null`'dir.

---

### blocked_by_policy

Guard evaluation sonucu tetiklemenin reddedilmesi durumu. Tetikleme gerceklestirilmez ve job olusturulmaz. Audit log'daki `violations` listesinde spesifik red sebebi belirtilir. Ornek violation: "Varsayilan template tanimli degil".

---

### cron expression

5 alanli zamanlama ifadesi: `dakika saat gun ay haftanin-gunu`. Standard POSIX cron formatini kullanir. Ornek: `"0 9 * * 1-5"` = hafta ici her gun saat 09:00. Projenin `automation_cron_expression` alaninda saklanir. Gecersiz ifade guard evaluation'da violation olusturur.

---

### review gate

Uretim tamamlandiktan sonra, yayin oncesi operator onayini gerektiren kontrol noktasi. v1'de fiilen her zaman aktiftir — `publish_policy` degeri ne olursa olsun icerik `pending_review` durumuna duser ve operator onayini bekler. Otomatik yayin bypass'i v1'de mevcut degildir.

---

### effective settings snapshot

Bir is (job) basladiginda, o ise iliskin tum ayarlarin o anki degerlerinin kaydedilmesi. Job calismaya basladiktan sonra Settings Registry'deki degisiklikler o job'u etkilemez. Bu, calistirma sirasinda tutarlilik saglar ve "config drift" sorununu onler.

---

### automation policy

Kanal bazli checkpoint politikalari. `app.automation` modulu altinda tanimlanir. Full-auto mode'dan ayri bir sistemdir. Kanal seviyesinde tarama/taslak/render/yayin adimlarini kontrol eder. Full-auto guard'lari ile karistirilmamalidir — automation policy publish pipeline'ina, full-auto guard'lari tetikleme asamasina uygulanir.

---

### catch-up

Kacirilan cron calistirmasinin telafi mekanizmasi. Scheduler, gecmiste kalmis `next_run_at` degeri olan projeyi tespit ettiginde BIR KEZ tetikler, sonra `next_run_at`'i simdi'den ileriye resync eder. Kacirilan aralik icindeki birden fazla fire TOPLANMAZ — sadece bir telafi calismasi yapilir.

---

### scheduler tick

Scheduler'in periyodik kontrol dongusunun tek bir calismasi. Her tick'te: due olan projeler (next_run_at <= now) kontrol edilir, guard evaluation yapilir ve uygun projeler tetiklenir. Iki tick arasi gecen sure `poll_interval` ile belirlenir.

---

### guardrail

Otomatik calistirmayi engelleyen koruma kontrolu. Global (kill switch, allowed_modules) veya proje bazli (toggle, template, kanal, gunluk limit, concurrent) olabilir. Guard gecmezse trigger reddedilir ve `blocked_by_policy` durumu olusur.

---

### guard evaluation

Tum guard'larin sirayla kontrol edildigi denetim sureci. Sonuc uc alan icerir: `allowed` (boolean — tetikleme yapilabilir mi), `violations` (liste — engel olan sebepler), `warnings` (liste — engel olmayan ama dikkat gerektiren durumlar). Violations bos ise `allowed = true`.

---

### duplicate fire

Ayni cron eslesmesinin ikinci kez tetiklenmesi. `scheduled_run_id` mekanizmasiyla engellenir. Scheduler bir projeyi tetiklediginde, `"{project_id}:{fire_time_iso}"` formatinda benzersiz bir key olusturur. Ayni key ile ikinci bir tetikleme girisimi reddedilir.

---

### poll interval

Scheduler'in iki tick arasi bekleme suresi. Varsayilan deger 60 saniyedir. Admin Settings'ten `automation.scheduler.poll_interval_seconds` ayariyla degistirilebilir. Daha kisa interval: daha hassas zamanlama ama daha fazla CPU kullanimi. Daha uzun interval: daha az kaynak tuketimi ama daha az hassas zamanlama.

---

### decision trail

Bir job'un nasil olusturuldugunu, hangi guard'lardan gectigini, hangi ayarlarla calistigini ve sonucunda ne kararin alindigi gosteren audit kayitlari zinciri. `full_auto.trigger.*`, `full_auto.job.completed` ve `full_auto.config.updated` audit log kayitlarindan olusur. Admin audit log sayfasindan kronolojik olarak goruntelenebilir.
