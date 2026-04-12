# 07 — Review Gate Onceligi

> Full-Auto v1'de uretim tamamlandiktan sonra icerik neden her zaman draft kalir. Publish policy'nin neden uygulanmadigi. Precedence sirasi.

---

## v1 Tasarim Karari: Icerik Her Zaman Draft Kalir

Full-auto modda uretim tamamlandiktan sonra icerik **HER ZAMAN** draft olarak birakilir. Bu bir bug degil, bilerek yapilmis bir guvenlik kararidir.

`on_job_completed()` fonksiyonu:

1. `job.run_mode == "full_auto"` kontrolu yapar.
2. Projenin `automation_publish_policy` degerini **okur**.
3. Policy'yi **uygulamaz**.
4. Audit log'a yazar: `"publish gate bypass kapali; sonuc her zaman draft olarak birakilir"`.

Kaynak: `backend/app/full_auto/service.py`, `on_job_completed()`.

---

## Neden Boyle

### Tam otomatik icerik dogasi geregi riskli

Insan kontrolu olmadan uretilen icerik yayin oncesi mutlaka gozden gecirilmeli. Wizard bypass edilmis, input olarak proje default'lari kullanilmis bir uretimin ciktisi dogrudan yayina alinmamalı.

### Review gate prensip olarak state machine seviyesinde koruma

Review gate kodu icinde zorunlu olarak uygulanir. Admin panelden kapatilmaz. Bu, CLAUDE.md'deki su kurala dayanir:

> "Core invariants (state machine rules, security guards, pipeline step order, validation enforcement) remain in code and cannot be disabled from admin panel."

### publish_policy "publish_now" secilse bile

v1'de bu deger yoksayilir, icerik draft kalir. Guard evaluation sirasinda sadece bir **uyari** uretilir:

```
"Faz 1: 'publish_now' politikasi draft olarak uygulanir (review gate oncelikli)."
```

Bu uyari trigger'i engellemez (non-fatal warning), sadece operatoru bilgilendirir.

### Ileri faz plani

Ileride `publish_now` destegi eklendiginde bile, `require_review_gate=true` ise review gate her zaman oncelikli olacak. Auto-publish ancak review gate acikca devre disi birakildiginda mumkun olacak.

---

## Precedence Sirasi

```
State Machine  >  Review Gate  >  Publish Policy
```

1. **State machine**: Job completed'a gectiginde pipeline kapanir. State machine kurallari her durumda isler, hicbir flag ile atlanamaz.

2. **Review gate**: `require_review_gate=true` ise uretim tamamlaninca icerik `pending_review` durumuna duser. Operator onayi beklenir. Bu kontrol admin panelden kapatilmaz.

3. **Publish policy**: `draft` | `schedule` | `publish_now`. v1'de bu deger okunur ama uygulanmaz. Ileri fazlarda, review gate gecildikten sonra devreye girecek.

---

## require_review_gate Degerine Gore Davranis

| `require_review_gate` | v1 Davranisi | Ileri Faz Davranisi |
|------------------------|-------------|---------------------|
| `true` (varsayilan)    | Draft kalir. Audit log yazilir. | Icerik pending_review'a duser. Operator onayi beklenir. |
| `false`                | Yine draft kalir (on_job_completed publish yapmaz). | publish_policy devreye girer: draft/schedule/publish_now. |

---

## Audit Log Ornegi

`on_job_completed()` her full-auto job tamamlandiginda su action ile audit log yazar:

- **action**: `full_auto.job.completed`
- **entity_type**: `job`
- **actor_type**: `system`
- **details**:
  - `project_id`
  - `publish_policy`: projenin secili policy degeri
  - `requires_review`: boolean
  - `phase1_note`: "publish gate bypass kapali; sonuc her zaman draft olarak birakilir"

---

## Kaynak Dosyalar

| Dosya | Icerik |
|-------|--------|
| `backend/app/full_auto/service.py` | `on_job_completed()`: review gate + publish policy cozumlemesi |
| `backend/app/full_auto/service.py` | `evaluate_guards()`: publish_now uyarisi (warnings listesi) |
| `backend/app/full_auto/schemas.py` | `PUBLISH_POLICY_VALUES`: "draft", "schedule", "publish_now" |
