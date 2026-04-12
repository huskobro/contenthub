# Full-Auto Mode: Audit, Observability ve Decision Trail

## Genel Bakis

Full-auto mode, CLAUDE.md'nin temel kuralini uygular: "No hidden behavior. All critical behavior must be visible and manageable in the admin panel." Otomatik uretim sureci tamamen izlenebilir olmalidir. Bu dokuman, audit log'a ne yazildigini, nasil goruntulendigi ve decision trail'in nasil olusturuldugunu tanimlar.

---

## Audit Log Action'lari

Full-auto mode dort audit log action'i uretir. Her kayitta ortak alanlar:

| Alan | Deger |
|------|-------|
| `entity_type` | `"content_project"` |
| `entity_id` | `project_id` |
| `actor_id` | Tetikleyen kullanici ID'si veya `"system"` (scheduler icin) |
| `timestamp` | ISO 8601 format |

---

### 1. `full_auto.trigger.rejected`

Guard'lar gecmedi, tetikleme reddedildi.

**details_json icerigi:**

```json
{
  "violations": ["Varsayilan template tanimli degil", "Kanal baglantisi eksik"],
  "warnings": ["Gunluk limit %80 dolulukta (4/5)"],
  "project_id": "uuid-...",
  "trigger_source": "manual"
}
```

**Kullanim amaci:** Admin audit log'dan "bu proje neden calistirilamadi" sorusunun cevabini okuyabilir. Her violation, guard evaluation sirasinda tespit edilen spesifik bir engeli belirtir.

---

### 2. `full_auto.trigger.accepted`

Guard'lar gecti, job olusturuldu.

**details_json icerigi:**

```json
{
  "job_id": "uuid-...",
  "video_id": "uuid-...",
  "runs_today": 2,
  "warnings": ["Gunluk limit %80 dolulukta (2/3)"],
  "trigger_source": "scheduled",
  "run_mode": "full_auto"
}
```

**Kullanim amaci:** Basarili tetiklemelerin izi. Hangi job'un hangi trigger ile olusturuldugu, o andaki gunluk calistirma sayisi ve varsa uyarilar kayit altinda.

---

### 3. `full_auto.job.completed`

Uretim tamamlandi, post-completion karar kaydedildi.

**details_json icerigi:**

```json
{
  "job_id": "uuid-...",
  "publish_policy": "draft",
  "requires_review": true,
  "note": "publish gate bypass kapali; sonuc her zaman draft olarak birakilir"
}
```

**Kullanim amaci:** Job tamamlandiktan sonra ne kararin alindigi. v1'de review gate fiilen her zaman aktif oldugu icin `requires_review` daima `true` olur ve icerik draft olarak kalir.

---

### 4. `full_auto.config.updated`

Proje otomasyon konfigurasyonu degisti.

**details_json icerigi:**

```json
{
  "changed": {
    "automation_enabled": {"from": false, "to": true},
    "automation_run_mode": {"from": "manual", "to": "full_auto"},
    "automation_max_runs_per_day": {"from": 5, "to": 3}
  },
  "actor_id": "user-uuid-..."
}
```

**Kullanim amaci:** Kim, neyi, ne zaman degistirdi. Konfigrasyon degisikliklerinin tam izi. `changed` dict'i sadece degisen alanlari icerir; degismeyen alanlar listelenmez.

---

## Job Detail'de Gorunurluk

Job Detail sayfasinda full-auto job'lar icin ek bilgiler gorunur:

| Rozet / Alan | Aciklama |
|--------------|----------|
| **run_mode rozeti** | "Tam Otomatik" / "Yari Otomatik" / "Manuel" — job'un uretim modunu gosterir |
| **trigger_source rozeti** | "Manuel Tetik" / "Zamanlanmis" / "API" — job'u neyin tetikledigini gosterir |
| **auto_advanced** | `true` ise step'ler arasi gecis otomatik yapilmistir |
| **scheduled_run_id** | Scheduler tetiklemesinde: `"{project_id}:{fire_time_iso}"` formati. Duplicate fire'i onleyen benzersiz key |

Bu rozetler sayesinde tek bakista "bu job nasil olusturuldu" sorusunun cevabi alinabilir.

---

## Decision Trail

Decision trail, bir full-auto job'un yasam dongusunu kronolojik olarak izlemeyi saglar. Bilgi kaynaklari:

### Guard Evaluation Sonucu
- `full_auto.trigger.rejected` veya `full_auto.trigger.accepted` audit kayitlari
- `violations` listesi: tetiklemeyi engelleyen sebepler
- `warnings` listesi: engellemeyen ama dikkat gerektiren durumlar

### Konfigrasyon Degisiklikleri
- `full_auto.config.updated` audit kayitlari
- Hangi alanin eski ve yeni degeri

### Trigger Kabul/Red
- Her tetikleme girisimi bir audit kaydi olusturur
- Kabul edilenler `trigger.accepted`, reddedilenler `trigger.rejected` olarak kaydedilir

### Kronolojik Goruntuleme
Admin audit log sayfasindan bu olaylarin tumunu kronolojik sirada gorebilir. Filtre secenekleri:
- `entity_type = "content_project"` ile proje bazli filtreleme
- `action` prefix'i ile (`full_auto.*`) full-auto olaylarini filtreleme

---

## Neden Bu Kadar Gorunurluk?

CLAUDE.md'den:

> "No hidden behavior. All critical behavior must be visible and manageable in the admin panel."
> "No invisible behavior outside admin visibility."

Otomatik uretim, operatorun haberi olmadan gerceklesmemeli. Her tetikleme, her red, her tamamlanma ve her konfigrasyon degisikligi kayit altinda olmalidir. Bu, full-auto mode'un "sihirli kara kutu" degil, izlenebilir bir otomasyon sistemi olmasini saglar.
