# 10 — API ve Endpoint'ler

> Full-Auto Mode v1 HTTP endpoint'leri. Tum endpoint'ler `/api/v1/full-auto` prefix'i altinda mount edilir. Bunlar public API degil, urun ici endpoint'lerdir.

---

## Kimlik Dogrulama

Tum endpoint'ler `get_active_user_id` dependency ile korunur (trigger ve PATCH endpoint'leri). GET endpoint'leri de authentication gerektiren context'te calisir.

---

## Endpoint Listesi

### 1. GET `/api/v1/full-auto/content-projects/{project_id}`

**Ne yapar**: Proje otomasyon config'ini okur.

**Kim kullanir**: Frontend ProjectAutomationPanel, sayfa yuklendiginde.

**Response model**: `ProjectAutomationConfig`

```
{
  "automation_enabled": false,
  "automation_run_mode": "manual",
  "automation_schedule_enabled": false,
  "automation_cron_expression": null,
  "automation_timezone": "UTC",
  "automation_default_template_id": null,
  "automation_default_blueprint_id": null,
  "automation_require_review_gate": true,
  "automation_publish_policy": "draft",
  "automation_fallback_on_error": "pause",
  "automation_max_runs_per_day": null,
  "automation_last_run_at": null,
  "automation_next_run_at": null,
  "automation_runs_today": 0,
  "automation_runs_today_date": null
}
```

**Hata durumu**:
- 404: `"Icerik projesi bulunamadi."` — proje ID gecersiz veya proje yok.

---

### 2. PATCH `/api/v1/full-auto/content-projects/{project_id}`

**Ne yapar**: Proje otomasyon config'ini gunceller. Sadece gondderilen alanlar degisir (partial update).

**Kim kullanir**: Frontend ProjectAutomationPanel, her alan degisikliginde aninda cagirilir.

**Request model**: `ProjectAutomationConfigUpdate` — tum alanlar optional.

```
{
  "automation_enabled": true,
  "automation_run_mode": "full_auto",
  "automation_cron_expression": "0 9 * * 1-5"
}
```

**Davranis**:
- Cron ifadesi gonderilirse validate edilir. Gecersizse **400** donulur.
- Gecerli cron'da `next_run_at` otomatik hesaplanir (scheduler sonraki tick'te gorur).
- `schedule_enabled=false` yapilirsa `next_run_at` temizlenir (NULL).
- Her degisiklik icin audit log yazilir: field bazinda eski/yeni deger detayi.

**Izin verilen alanlar**: `automation_enabled`, `automation_run_mode`, `automation_schedule_enabled`, `automation_cron_expression`, `automation_timezone`, `automation_default_template_id`, `automation_default_blueprint_id`, `automation_require_review_gate`, `automation_publish_policy`, `automation_fallback_on_error`, `automation_max_runs_per_day`.

**Response model**: `ProjectAutomationConfig` (guncellenmis hali).

**Hata durumlari**:
- 400: `"Gecersiz cron ifadesi: {expression}"` — cron parse edilemiyor.
- 404: `"Icerik projesi bulunamadi."` — proje yok.

---

### 3. POST `/api/v1/full-auto/content-projects/{project_id}/evaluate`

**Ne yapar**: Dry-run guard kontrolu. Hicbir sey degistirmez, sadece guard sonucunu dondurur.

**Kim kullanir**: Frontend "Denetle" butonu.

**Request body**: Yok.

**Response model**: `GuardCheckResult`

```
{
  "allowed": false,
  "violations": [
    "Proje otomasyonu kapali (automation_enabled=false)."
  ],
  "warnings": [
    "Faz 1: 'publish_now' politikasi draft olarak uygulanir (review gate oncelikli)."
  ]
}
```

**Davranis**: Tum guard'lari sirayla degerlendirir, sonucu dondurur. DB'de hicbir degisiklik yapmaz. Job olusturmaz.

**Hata durumlari**:
- 404: `"Icerik projesi bulunamadi."`

---

### 4. POST `/api/v1/full-auto/content-projects/{project_id}/trigger`

**Ne yapar**: Manuel tetikleme. Guard'lari calistirir, gecerse job olusturur.

**Kim kullanir**: Frontend "Simdi Tetikle" butonu.

**Request model**: `FullAutoTriggerRequest` (opsiyonel body)

```
{
  "topic": "Yapay zeka gelismeleri",
  "title": "AI Haberleri - Nisan 2026",
  "brief": "Son hafta AI sektorundeki onemli gelismeler",
  "note": "Acil icerik talebi"
}
```

Tum alanlar opsiyonel. Gonderilmezse projenin title/description degerleri kullanilir.

**Response model**: `FullAutoTriggerResponse`

Basarili:
```
{
  "accepted": true,
  "reason": null,
  "project_id": "abc-123",
  "job_id": "job-456",
  "run_mode": "full_auto",
  "trigger_source": "manual",
  "scheduled_run_id": null
}
```

Reddedildi:
```
{
  "accepted": false,
  "reason": "Proje otomasyonu kapali (automation_enabled=false).",
  "project_id": "abc-123",
  "job_id": null,
  "run_mode": null,
  "trigger_source": null,
  "scheduled_run_id": null
}
```

**Davranis**:
- Guard'lar gecerse: StandardVideo olusturur, start_production cagirir, job'a run_mode/trigger_source stamp eder.
- Guard'lar gecmezse: `accepted=false` + tum violations reason alaninda (`;` ile ayrilmis).
- Reddedilen trigger'lar icin audit log yazilir (`full_auto.trigger.rejected`).
- Kabul edilen trigger'lar icin audit log yazilir (`full_auto.trigger.accepted`).

**Hata durumlari**:
- 503: `"JobDispatcher hazir degil."` — dispatcher yuklenmediyse (uygulama baslangicindan hemen sonra olabilir).
- 404: Proje bulunamazsa response body'de `accepted=false` ve reason doner (HTTP 200).

---

### 5. GET `/api/v1/full-auto/scheduler/status`

**Ne yapar**: In-memory scheduler durumunu okur.

**Kim kullanir**: Admin SchedulerStatusCard componenti.

**Response model**: `SchedulerStatus`

```
{
  "enabled": true,
  "poll_interval_seconds": 60,
  "last_tick_at": "2026-04-12T09:01:00Z",
  "last_tick_ok": true,
  "last_tick_error": null,
  "pending_project_count": 2,
  "next_candidate_project_id": "proj-789",
  "next_candidate_run_at": "2026-04-12T10:00:00Z"
}
```

**Not**: Bu veri in-memory `SCHEDULER_STATE` dict'inden okunur, DB'den degil. Uygulama restart'inda sifirlanir. Tek-process MVP icin yeterli.

---

### 6. GET `/api/v1/full-auto/cron/preview?expression=...&count=N`

**Ne yapar**: Cron ifadesinin sonraki N calistirma zamanini hesaplar.

**Kim kullanir**: Frontend CronPreviewDisplay componenti (ProjectAutomationPanel icinde).

**Query parametreleri**:
- `expression` (zorunlu): 5-field cron ifadesi. Ornek: `"0 9 * * 1-5"`
- `count` (opsiyonel, varsayilan: 5, max: 20): Hesaplanacak sonraki calistirma sayisi.

**Response**:

```
{
  "expression": "0 9 * * 1-5",
  "next_runs": [
    "2026-04-14T09:00:00+00:00",
    "2026-04-15T09:00:00+00:00",
    "2026-04-16T09:00:00+00:00",
    "2026-04-17T09:00:00+00:00",
    "2026-04-18T09:00:00+00:00"
  ]
}
```

**Hata durumlari**:
- 400: `"Gecersiz cron ifadesi."` — parse edilemiyor.

---

## Endpoint Ozet Tablosu

| Method | Path | Islem | Kullanici |
|--------|------|-------|-----------|
| GET | `/content-projects/{id}` | Config oku | Frontend panel |
| PATCH | `/content-projects/{id}` | Config guncelle | Frontend panel |
| POST | `/content-projects/{id}/evaluate` | Dry-run guard | Denetle butonu |
| POST | `/content-projects/{id}/trigger` | Manuel trigger | Simdi Tetikle butonu |
| GET | `/scheduler/status` | Scheduler durumu | Admin kart |
| GET | `/cron/preview` | Cron preview | Cron input preview |

---

## Kaynak Dosyalar

| Dosya | Icerik |
|-------|--------|
| `backend/app/full_auto/router.py` | Tum 6 endpoint tanimi |
| `backend/app/full_auto/service.py` | evaluate_guards(), trigger_full_auto(), apply_config_update() |
| `backend/app/full_auto/schemas.py` | Request/response Pydantic modelleri |
| `backend/app/full_auto/cron.py` | compute_next_run(), is_valid_cron() yardimci fonksiyonlari |
| `backend/app/full_auto/scheduler.py` | SCHEDULER_STATE in-memory dict |
