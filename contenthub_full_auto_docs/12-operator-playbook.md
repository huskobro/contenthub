# Full-Auto Mode: Operator Playbook

Gunluk operasyon rehberi. Soru-cevap formati.

---

## Full-auto'yu nasil acarim?

1. **Admin Settings** > `automation.full_auto.enabled` → `true` (global kill switch)
2. **Admin Settings** > `automation.scheduler.enabled` → `true` (cron zamanlamasi isteniyorsa)
3. **Proje detay** > **Otomasyon** sekmesi > toggle'i ac
4. **Run mode** olarak "Tam Otomasyon" sec
5. **Template** tanimli olsun (varsayilan template atanmis olmali)
6. **Kanal** bagli olsun (en az bir publish kanali tanimli olmali)
7. **"Denetle"** butonuyla guard kontrolu yap — violations varsa kirmizi uyari gorunur
8. **"Simdi Tetikle"** ile ilk denemeyi yap — guard'lar gecerse job olusturulur

> Not: Adim 1-2 global ayarlardir, bir kez yapilir. Adim 3-8 her proje icin tekrarlanir.

---

## Cron calismiyorsa nereye bakarim?

Asagidaki kontrol sirasini takip et:

### 1. SchedulerStatusCard'i kontrol et
Admin > Otomasyon sayfasinda SchedulerStatusCard'a bak. Uc olasi durum:

| Durum | Anlami | Aksiyon |
|-------|--------|---------|
| **Devre Disi** | Scheduler kapali | Settings > `automation.scheduler.enabled` kontrol et |
| **Hata** | Son tick basarisiz | `last_tick_error` mesajini oku, backend log'larina bak |
| **Aktif** | Scheduler calisiyor | Asagidaki kontrollere gec |

### 2. Scheduler aktif ama proje tetiklenmiyor
- Projenin `automation_schedule_enabled` = `true` mi?
- Cron ifadesi gecerli mi? (bos veya hatali olabilir)
- `next_run_at` zamani gelmis mi? (gelecekte olabilir)

### 3. Bekleyen proje sayisi 0
SchedulerStatusCard'da `pending_project_count = 0` ise: hicbir proje due degil. Bu normal olabilir — bir sonraki cron zamanini bekle.

### 4. Backend log'lari
Scheduler tick log'larinda hata varsa: `scheduler_service.py` log ciktisini kontrol et. Her tick basinda ve sonunda log basilir.

---

## blocked_by_policy olursa hangi sirayla kontrol edilmeli?

Guard'lar sirayla evaluate edilir. Asagidaki kontrol listesini yukari'dan asagi takip et:

| # | Guard | Kontrol | Hata Mesaji Ornegi |
|---|-------|---------|--------------------|
| 1 | Global kill switch | `automation.full_auto.enabled = true` mi? | "Tam otomatik mod global olarak devre disi" |
| 2 | Module check | Proje modulu `allowed_modules` listesinde mi? | "Bu modul tam otomatik modu desteklemiyor" |
| 3 | Proje toggle | `automation_enabled = true` mi? | "Proje otomasyonu devre disi" |
| 4 | Template | Template tanimli mi? (`require_template = true` ise) | "Varsayilan template tanimli degil" |
| 5 | Kanal | Kanal bagli mi? (`require_channel = true` ise) | "Kanal baglantisi eksik" |
| 6 | Gunluk limit | `runs_today < max_daily` mi? | "Gunluk tam otomatik calisma limiti asildi (3/3)" |
| 7 | Concurrent guard | Baska full-auto job calisiyor mu? | "Proje icin calisan full-auto is sayisi limiti asildi (1/1)" |
| 8 | Duplicate fire | Scheduler icin: ayni `scheduled_run_id` daha once kullanildi mi? | "Bu zamanlama zaten tetiklendi" |

Her guard'in hata mesaji Turkce ve aciklayici. Audit log'daki `violations` listesinden okunabilir.

> Ipucu: "Denetle" butonu ayni guard listesini calistirir ve sonucu UI'da gosterir. Audit log'a bakmadan once "Denetle" ile hizli kontrol yapilabilir.

---

## Review gate'de takildiysa ne yapilmali?

1. Icerik `pending_review` durumunda bekliyor
2. Admin veya operator icerigi inceler
3. Onaylanirsa: yayin akisina (publish flow) alinir
4. Reddedilirse: icerik archive/discard edilir

v1'de otomatik yayin (auto-publish) yoktur. Review gate fiilen her zaman aktiftir. `publish_policy` ne secilirse secilsin, icerik draft olarak kalir ve operator onayini bekler.

> Bu kasitli bir tasarim kararidir. Otomatik uretilen icerik dogrudan yayinlanmaz.

---

## Bir auto-run neden baslamamis olabilir?

Olasi sebepler, en yaygindan en aze:

| Sebep | Kontrol Yeri |
|-------|--------------|
| Scheduler devre disi | Admin Settings > `automation.scheduler.enabled` |
| Proje toggle kapali | Proje detay > Otomasyon > toggle |
| Cron ifadesi gecersiz veya bos | Proje detay > Otomasyon > cron alani |
| `next_run_at` henuz gelmemis | Proje detay > Otomasyon > sonraki calistirma |
| Gunluk limit dolmus | Proje detay > Otomasyon > durum (X / Y) |
| Baska full-auto job zaten calisiyor | Jobs sayfasi > aktif job'lar |
| Global kill switch kapali | Admin Settings > `automation.full_auto.enabled` |
| Template eksik | Proje detay > Otomasyon > "Denetle" |
| Kanal eksik | Proje detay > Otomasyon > "Denetle" |

Tum bu durumlar "Denetle" butonu ve audit log uzerinden dogrulanabilir.

---

## Hizli referans: Gunluk kontrol listesi

Operator icin gunluk kontrol rutini:

1. SchedulerStatusCard'da durumu kontrol et (Aktif / Hata / Devre Disi)
2. Son tick zamanini kontrol et (cok eski mi?)
3. Bekleyen proje sayisini kontrol et
4. Audit log'da son `full_auto.trigger.rejected` kayitlarini tara
5. `pending_review` durumunda bekleyen icerikleri incele
6. Gunluk limit'e yaklasan projeleri kontrol et
