# 09 — UI ve Kullanici Akislari

> Full-Auto Mode v1 icin user/admin arayuz yapisi, ProjectAutomationPanel icerigi, Job Detail rozetleri.

---

## User Tarafi: Proje Detay Sayfasi

Full-auto otomasyon ayarlari proje detay sayfasinda gorunur. Uc farkli surface desteklenir:

| Surface | Konum | Dosya |
|---------|-------|-------|
| Legacy (TabBar) | "Genel" / "Otomasyon" sekmeleri. "Otomasyon" tab'inda ProjectAutomationPanel gorunur. | `frontend/src/pages/user/ProjectDetailPage.tsx` |
| Canvas | Sayfa alt kisimda "Otomasyon" section'i. Ayni panel. | `frontend/src/surfaces/canvas/CanvasProjectDetailPage.tsx` |
| Atrium | Sayfa alt kisimda "Otomasyon" section'i. Ayni panel. | `frontend/src/surfaces/atrium/AtriumProjectDetailPage.tsx` |

Tum surface'larda ayni `ProjectAutomationPanel` componenti kullanilir.

---

## ProjectAutomationPanel Icerigi

Kaynak: `frontend/src/components/full-auto/ProjectAutomationPanel.tsx`

### Enable Toggle

Projenin `automation_enabled` degerini acip kapatir. Kapali oldugunda diger tum kontroller devre disi gorunur.

### Calistirma Modu Butonu Grubu

Uc secenekli buton grubu:

| Mod | Renk | Deger |
|-----|------|-------|
| Manuel | Gri | `"manual"` |
| Asistanli | Sari | `"assisted"` |
| Tam Otomasyon | Yesil | `"full_auto"` |

Secimdeki degisiklik PATCH endpoint'ine aninda gonderilir.

### Zamanlama Section

- Schedule toggle: `automation_schedule_enabled`
- Cron input: 5-field cron ifadesi text input
- Canli preview: Sonraki 5 calistirma zamani (CronPreviewDisplay componenti, `/cron/preview` endpoint'inden beslenir)
- Timezone: `automation_timezone` (varsayilan: UTC)

### Koruma Ayarlari

- Review gate toggle: `automation_require_review_gate` (varsayilan: true)
- Yayin politikasi butonlari: `draft` | `schedule` | `publish_now`
- Hata davranisi butonlari: `pause` | `retry_once` | `stop`
- Gunluk limit input: `automation_max_runs_per_day`

### Durum Bilgisi (Read-Only)

- Son calistirma: `automation_last_run_at`
- Sonraki calistirma: `automation_next_run_at`
- Bugunki calistirmalar: `automation_runs_today`

### Eylemler

- Konu/baslik input alanlari (opsiyonel — trigger'a ek metadata olarak gonderilir)
- **Denetle butonu**: Dry-run guard evaluation. POST `/evaluate` endpoint'ini cagirir. Violations ve warnings listesini gosterir. Hicbir sey degistirmez.
- **Simdi Tetikle butonu**: Fiili trigger. POST `/trigger` endpoint'ini cagirir. Guard'lar gecerse job olusturulur, sonuc kullaniciya gosterilir.

---

## Admin Tarafi

### Admin Otomasyon Sayfasi

Kaynak: `frontend/src/pages/admin/AdminAutomationPoliciesPage.tsx`

Sayfa ustunde **SchedulerStatusCard** gorunur.

### SchedulerStatusCard

Kaynak: `frontend/src/components/full-auto/SchedulerStatusCard.tsx`

Kart icerigi:

| Alan | Aciklama |
|------|----------|
| Aktif/Devre Disi badge | `enabled` degerine gore yesil/gri rozet |
| Poll araligi | `poll_interval_seconds` saniye |
| Son tick zamani | `last_tick_at` |
| Tick durumu | `last_tick_ok` — OK (yesil) veya Hata (kirmizi) |
| Bekleyen proje sayisi | `pending_project_count` — due olan proje adedi |
| Hata detayi | `last_tick_error` — son hatanin metni (varsa) |
| Sonraki aday proje | `next_candidate_project_id` + `next_candidate_run_at` |

Verisi GET `/scheduler/status` endpoint'inden gelir.

### Admin Settings

Admin > Settings > automation grubunda 13 global ayar yonetilir:

- `automation.full_auto.enabled`
- `automation.full_auto.allowed_modules`
- `automation.full_auto.require_review_gate`
- `automation.full_auto.default_publish_policy`
- `automation.full_auto.max_concurrent_per_user`
- `automation.full_auto.max_concurrent_per_project`
- `automation.full_auto.max_daily_runs_per_project`
- `automation.full_auto.require_template`
- `automation.full_auto.require_channel`
- `automation.full_auto.require_blueprint`
- `automation.scheduler.enabled`
- `automation.scheduler.poll_interval_seconds`
- `automation.scheduler.default_timezone`

---

## Job Detail Rozetleri

Full-auto modda olusturulan job'lar Job Detail sayfasinda ek rozetler gosterir. Rozetler hem tam sayfa (JobOverviewPanel) hem sidebar (JobDetailPanel) gorunumlerinde yer alir.

### Calistirma Modu Rozeti

`run_mode` alanina gore:

| Deger | Etiket | Renk | Ek Bilgi |
|-------|--------|------|----------|
| `full_auto` | Tam Otomatik | Yesil (success) | `auto_advanced=true` ise "auto-advance aktif" notu |
| `assisted` | Asistanli | Sari (warning) | `auto_advanced=true` ise "auto-advance aktif" notu |
| `manual` | Manuel | Gri (neutral) | — |

### Tetikleme Kaynagi Rozeti

`trigger_source` alanina gore:

| Deger | Etiket | Renk | Ek Bilgi |
|-------|--------|------|----------|
| `scheduled` | Zamanlanmis | Brand (mavi) | `scheduled_run_id` varsa ilk 8 karakter hash gosterilir |
| `manual` / `manual_click` | Manuel Tetik | Gri (neutral) | — |
| `api` | API | Gri (neutral) | — |
| `admin_action` | Admin | Brand (mavi) | — |
| `retry` | Yeniden Deneme | Sari (warning) | — |

### Gorunurluk Kurali

- Sadece `run_mode` veya `trigger_source` set edilmis job'larda bu satirlar gorunur.
- Legacy job'larda (her iki alan NULL) satirlar **gizli** kalir.
- Conditional rendering: `{job.run_mode && (<Row .../>)}` pattern'i.

---

## Kaynak Dosyalar

| Dosya | Icerik |
|-------|--------|
| `frontend/src/components/full-auto/ProjectAutomationPanel.tsx` | Proje otomasyon paneli |
| `frontend/src/components/full-auto/SchedulerStatusCard.tsx` | Admin scheduler durum karti |
| `frontend/src/components/jobs/JobOverviewPanel.tsx` | RUN_MODE_BADGE, TRIGGER_BADGE mapping'leri + rozet render |
| `frontend/src/components/jobs/JobDetailPanel.tsx` | Sidebar'daki run_mode/trigger_source rozetleri |
| `frontend/src/pages/admin/AdminAutomationPoliciesPage.tsx` | Admin otomasyon sayfasi |
| `frontend/src/pages/user/ProjectDetailPage.tsx` | Legacy proje detay (TabBar) |
| `frontend/src/surfaces/canvas/CanvasProjectDetailPage.tsx` | Canvas proje detay |
| `frontend/src/surfaces/atrium/AtriumProjectDetailPage.tsx` | Atrium proje detay |
