# 06 — Job Engine ve Run Mode'lar

> Full-Auto Mode v1 icin Job tablosuna eklenen alanlar, state machine etkilesimi ve pipeline davranisi.

---

## Job Tablosuna Eklenen Alanlar

### `run_mode` (String(50), nullable)

Degerler: `"manual"` | `"assisted"` | `"full_auto"`

Job'un hangi modda olusturuldugunu belirtir.

- Manuel baslatilan (wizard uzerinden) job'larda bu alan **NULL** kalir. Mevcut tum legacy job'lar NULL'dir.
- Full-auto trigger ile olusturulan job'larda `"full_auto"` set edilir.
- Assisted modda `"assisted"` set edilir.
- Deger job olusturulduktan sonra degismez (immutable stamp).

DB tanimi: `mapped_column(String(50), nullable=True)`.

### `auto_advanced` (Boolean, default False)

True ise step'ler arasi gecis otomatik yapilir. Pipeline runner bir step tamamlandiginda sonraki step'i beklemeden baslatir.

- Full-auto modda **True** set edilir.
- Assisted modda **True** set edilir.
- Manuel modda **False** kalir (her step arasi operator mudahalesi beklenir).

DB tanimi: `mapped_column(Boolean, nullable=False, default=False)`.

### `scheduled_run_id` (String(36), nullable)

Scheduler tarafindan tetiklenen job'larda dedupe key'i olarak kullanilir.

Format: `"{project_id}:{fire_time_iso}"`

Ornek: `"a1b2c3d4-...:2026-04-12T09:00:00Z"`

- Manuel trigger'da **NULL** kalir.
- Scheduler her tick'te bu ID'yi uretir ve trigger_full_auto()'ya gonderir. Ayni `scheduled_run_id` ile zaten bir job varsa trigger reddedilir (duplicate fire koruması).

DB tanimi: `mapped_column(String(36), nullable=True)`.

### `trigger_source` (String(50), nullable)

Kim veya ne tarafindan tetiklendigini belirtir.

Degerler: `"manual"` | `"scheduled"` | `"api"` | `"manual_click"` | `"retry"` | `"admin_action"`

- `"manual"`: Router uzerinden manuel tetikleme (Simdi Tetikle butonu).
- `"scheduled"`: Scheduler tick'i tarafindan otomatik tetikleme.
- `"api"`: Harici API cagrisi (gelecek faz).
- `"manual_click"`, `"retry"`, `"admin_action"`: Frontend badge mapping'lerinde tanimli; backend'de v1'de sadece `"manual"` ve `"scheduled"` fiilen kullanilir.

DB tanimi: `mapped_column(String(50), nullable=True)`.

---

## State Machine Etkilesimi

**run_mode state machine'i degistirmez.**

Job state machine (queued -> running -> completed/failed) ve step state machine, run_mode ne olursa olsun ayni kurallarla calisir. Full-auto mod sadece su iki noktayi otomatiklestirir:

1. **Baslangic**: Wizard bypass edilir, proje default'larindan input olusturulur.
2. **Step gecisleri**: `auto_advanced=True` oldugunda pipeline runner step tamamlaninca sonraki step'i otomatik baslatir.

State gecis kurallari, retry mantigi, hata yonetimi — hepsi ayni kalir. Full-auto mod bunlarin uzerine bir otomasyon katmanidir, alternatif bir state machine degildir.

---

## auto_advanced Davranisi

| Deger   | Davranis                                                          |
|---------|-------------------------------------------------------------------|
| `True`  | Step tamamlaninca sonraki step otomatik baslar. Operator mudahalesi gerekmez. |
| `False` | Step tamamlaninca pipeline durur. Operator sonraki step'i baslatir.           |

auto_advanced degeri job olusturulurken set edilir ve degismez. Pipeline runner bu degere bakarak karar verir.

---

## Scheduler Trigger vs Manuel Trigger Farki

| Ozellik              | Manuel Trigger                  | Scheduler Trigger                          |
|----------------------|---------------------------------|--------------------------------------------|
| `trigger_source`     | `"manual"`                      | `"scheduled"`                              |
| `scheduled_run_id`   | NULL                            | `"{project_id}:{fire_time_iso}"`           |
| Guard evaluation     | Ayni guard'lar calisir          | Ayni guard'lar calisir                     |
| Dedupe kontrolu      | Yok                             | Var — ayni run_id ile 2. trigger reddedilir|
| Audit log actor_type | `"user"`                        | `"scheduler"`                              |
| Geri kalan akis      | Ayni                            | Ayni                                       |

Her iki path de `trigger_full_auto()` fonksiyonundan gecer. Fark sadece stamp edilen metadata'dadır.

---

## Kaynak Dosyalar

| Dosya | Icerik |
|-------|--------|
| `backend/app/db/models.py` | Job model: run_mode, auto_advanced, scheduled_run_id, trigger_source field tanimlari |
| `backend/app/full_auto/service.py` | trigger_full_auto(): stamp logic, guard evaluation |
| `backend/app/full_auto/scheduler.py` | Scheduler tick: scheduled_run_id uretimi, trigger_source="scheduled" |
| `backend/app/full_auto/schemas.py` | RUN_MODE_VALUES, TRIGGER_SOURCE_VALUES constant'lari |
| `backend/alembic/versions/full_auto_001_project_run_mode_cron.py` | Migration: yeni kolonlarin eklenmesi |
