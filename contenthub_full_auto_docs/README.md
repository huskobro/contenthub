# ContentHub Full-Auto Mode — Dokumantasyon Seti

Bu klasor, ContentHub'a eklenen **Full-Auto Mode + Project-Level Cron** ozelliginin kullanim, yonetim ve isleyis dokumantasyonunu icerir.

## Bu klasor ne?

Proje bazli tam otomatik icerik uretiminin nasil calistigini, hangi ayarlara bagli oldugunu, guard mekanizmalarini, scheduler isleyisini, admin/user ekranlarini ve operasyonel kontrol noktalarini anlatan referans dokuman setidir.

## Nasil okunmali?

Ilk kez okuyan birinin onerilen sirasi:

1. **01-full-auto-overview.md** — Ne oldugunu anla
2. **02-global-vs-project-level-control.md** — Iki katmanli kontrol mantigi
3. **04-project-automation-configuration.md** — Proje bazli ayarlar
4. **05-scheduler-and-cron.md** — Zamanlama ve cron
5. **07-review-gate-precedence.md** — Neden review gate publish policy'den ustte
6. **08-guards-and-block-reasons.md** — Neden bazen calismaz
7. **09-ui-and-user-flows.md** — Ekranlarda ne nerede
8. **12-operator-playbook.md** — Gunluk operasyon rehberi
9. **15-example-scenarios.md** — Somut senaryolar

Geri kalan dosyalar referans icin:

- **03** — Settings Registry key'leri (tablo)
- **06** — Job engine detaylari
- **10** — API endpoint'leri
- **11** — Audit ve izlenebilirlik
- **13** — Bilinen sinirlar ve ertelenen maddeler
- **14** — Kavram sozlugu

## Dosya listesi

| Dosya | Icerik |
|-------|--------|
| `01-full-auto-overview.md` | Genel bakis, mod farklari, neden eklendi |
| `02-global-vs-project-level-control.md` | Iki katmanli kontrol ve precedence |
| `03-settings-registry-keys.md` | Tum automation.* ayar key'leri |
| `04-project-automation-configuration.md` | Proje bazli otomasyon paneli |
| `05-scheduler-and-cron.md` | Scheduler, cron, catch-up, dedupe |
| `06-job-engine-and-run-modes.md` | Job.run_mode, trigger_source, auto_advanced |
| `07-review-gate-precedence.md` | Review gate > publish policy |
| `08-guards-and-block-reasons.md` | Guard listesi ve blok sebepleri |
| `09-ui-and-user-flows.md` | UI ekranlari, butonlar, rozetler |
| `10-api-and-endpoints.md` | Backend endpoint'leri |
| `11-audit-observability-and-decision-trail.md` | Audit log ve izlenebilirlik |
| `12-operator-playbook.md` | Gunluk operasyon rehberi |
| `13-known-limits-and-deferred-items.md` | Sinirlar ve ertelenenler |
| `14-glossary.md` | Kavram sozlugu |
| `15-example-scenarios.md` | 7 somut senaryo |

## Hizli baslangic

1. Admin panelinde **Settings > Otomasyon** grubunda `automation.full_auto.enabled` ayarini `true` yap
2. Ayni grupta `automation.scheduler.enabled` ayarini `true` yap
3. Bir standard_video projesinin detay sayfasina git
4. "Otomasyon" sekmesine/bolumune gec
5. Toggle'i ac, calistirma modunu "Tam Otomasyon" sec
6. Cron ifadesi gir (ornek: `0 9 * * 1-5` = hafta ici her gun 09:00)
7. "Denetle" butonuna bas — guard'larin gectigini gor
8. "Simdi Tetikle" ile manuel bir deneme yap
9. Job Detail'de "Tam Otomatik" ve "Manuel Tetik" rozetlerini gor
