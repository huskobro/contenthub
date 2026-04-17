# PHASE AN-1 — Automation Policies + Operations Inbox Ownership Guard — Closure

**Status:** Complete
**Worktree:** `.claude/worktrees/audit+effective-settings-and-gemini-plan`
**Branch:** `worktree-audit+effective-settings-and-gemini-plan`
**Önceki faz:** Phase AM kapalı — `docs/phase_am_security_and_settings_closure.md`
**Kapsam:** Sadece `/api/v1/automation-policies` + `/api/v1/operations-inbox` modülü. Küçük yüzey, hedefli test, başka hiçbir modüle dokunulmadı.
**Sonuç:** Gerçek güvenlik açığı kapatıldı. 24 yeni AN-1 testi + 106 regresyon testi yeşil. Frontend dosyasına dokunulmadı (zaten doğru scope parametresini geçiriyordu; backend enforce eksikti).

---

## 1. Problem Tanımı

Phase AL audit raporu (`docs/phase_al_product_simplification_and_effective_settings_audit.md`), platform_connections ile aynı pattern'in `automation_policies` modülünde de kırık olduğunu işaret etmişti. Phase AM-2 platform_connections'u kapattı ama otomasyon modülü **mevcut değildi listede** — çünkü o faz sırasında hâlâ "audit" aşamasındaydı.

Discovery sonucunda doğrulanan gerçek durum (AN-1.1):

| Bulgu | Kanıt |
|---|---|
| Router mount-level `Depends(require_user)` veriyor → unauth 401 doğru | `backend/app/api/router.py:72-73` |
| Endpoint-level ownership guard **hiç yok** — 11 endpoint'in hiçbirinde `UserContext` parametresi yoktu | `backend/app/automation/router.py` (eski hâli) |
| Service katmanında `owner_user_id` filtresi yok — list'ler bütün kullanıcıların politikalarını/inbox item'larını döndürüyordu | `backend/app/automation/service.py` (eski hâli) |
| Create endpoint `owner_user_id`'yi payload'dan olduğu gibi alıyordu → spoof kolay | `service.create_automation_policy`, `service.create_inbox_item` |
| Frontend (AdminAutomationPoliciesPage.tsx:39) scope param göndermiyor — ama bu sorun değil, zaten admin sayfası. Asıl sorun backend'in non-admin talepleri ayırt edememesi | - |

**Net karar (AN-1.2):** Gerçek açık var. Küçük cerrahi patch — sadece router ownership guard + service scope filtresi + create owner spoof defense.

---

## 2. Uygulanan Patch Özeti (AN-1.3)

**Tek fazda kapatıldı** (AM gibi beş alt-fazla değil, küçük yüzey olduğu için).

### 2.1 `backend/app/automation/router.py`

11 endpoint'in her biri artık:

```python
ctx: UserContext = Depends(get_current_user_context)
```

parametresi alıyor ve service çağrısına `caller_ctx=ctx` olarak iletiyor. Endpoint path'leri, response model'leri, HTTP status code'ları değişmedi — sadece auth context yolu eklendi. Dosyanın başındaki docstring patter'ı açıklıyor.

**Not:** `HTTPException` / `422` davranışı değişmedi — "bulunamadı" durumları hâlâ 404 döner (existence leak önlemek için bilinçli seçim, platform_connections AM-2 pattern'i ile tutarlı).

### 2.2 `backend/app/automation/service.py`

Yeni import:

```python
from app.auth.ownership import (
    UserContext,
    apply_user_scope,
    ensure_owner_or_admin,
)
```

9 service fonksiyonu `caller_ctx: Optional[UserContext] = None` aldı:

| Fonksiyon | Davranış |
|---|---|
| `list_automation_policies` | Non-admin: `apply_user_scope` → `owner_user_id == caller.user_id`. Admin: serbest filtre. |
| `get_automation_policy` | `ensure_owner_or_admin` — foreign 403. |
| `get_policy_for_channel` | Aynı guard. |
| `create_automation_policy` | Non-admin: `owner_user_id = caller.user_id` (spoof ignore). Admin: payload serbest. Channel'in sahipliği de doğrulanır (non-admin foreign channel'a policy yazamaz). |
| `update_automation_policy` | `ensure_owner_or_admin` önce, sonra mutation. |
| `list_inbox_items` | `apply_user_scope` (non-admin kendi satırlarına pinlendi). |
| `get_inbox_item` | `ensure_owner_or_admin`. |
| `create_inbox_item` | Owner spoof defense. |
| `update_inbox_item` | `ensure_owner_or_admin` önce. |
| `count_open_inbox_items` | Non-admin: kendi satırları. Admin: serbest. |

**Back-compat güvencesi:** `caller_ctx=None` default → dahili callers (örn. `backend/app/automation/event_hooks.py:83` doğrudan model yazıyor; scheduler ve Faz 13 test yardımcıları service'i positional çağırabilir) davranış değişikliği görmez. Sadece router'dan gelen HTTP akışı enforce olur.

### 2.3 `backend/tests/test_phase_an_automation_policies_guard.py` (yeni, 24 test)

Test grupları:

| Grup | Test sayısı | Ne doğrular |
|---|---|---|
| Policies unauth | 4 | GET list / GET {id} / PATCH / GET evaluate / GET by-channel → 401 |
| Policies non-admin cross-user defense | 5 | Başkasının policy'sini list/get/patch/evaluate/by-channel görmeyi 403 veya boş-scope ile engelle |
| Policies create owner spoof | 1 | Non-admin `owner_user_id=<other>` pass'lese bile → caller'a pinlenir |
| Policies admin happy | 2 | Admin tüm rows; admin cross-user erişim OK |
| Policies non-admin own | 1 | Kullanıcı kendi policy'sine erişir + update eder |
| Inbox unauth | 4 | GET list / GET {id} / POST / PATCH / GET count → 401 |
| Inbox non-admin cross-user defense | 4 | Başkasının item'larını list spoof / get / patch / count — blok |
| Inbox create owner spoof | 1 | Non-admin owner_user_id=<other> pass'lese bile coerce |
| Inbox admin happy + non-admin own | 2 | Admin serbest; kullanıcı kendi item'ına erişir |

Helpers: `_token_for`, `_headers`, `_make_user`, `_make_channel`, `_make_policy`, `_make_inbox`.

**Kritik implementasyon notu:** `headers = _headers(attacker)` mutlaka endpoint çağrılmadan önce snapshot'lanmalı — aksi takdirde SQLAlchemy identity-map staleness sonraki token rebuild'da MissingGreenlet hatası yaratıyor. Bu patter testlerde sabit.

### 2.4 `backend/tests/test_faz13_automation_policy_inbox.py` (1 test düzeltildi)

`test_inbox_filter_by_owner` eski hâli tam olarak Phase AN-1'in kapattığı attack pattern'ini kullanıyordu: non-admin POST ederken `owner_user_id=<other>` gönderiyor ve sonra `<other>`'ı filtre olarak okuyordu. Yeni davranışla owner spoof coerce olduğu ve list scope caller'a pinlendiği için semantik değişti.

**Fix:** `user_headers` → `admin_headers` (admin cross-filter yetkisi var — meşru use-case). Docstring Phase AN-1 referansı içeriyor ve non-admin senaryosunun artık AN-1 test dosyasında ele alındığını yazıyor.

---

## 3. Değişen Dosyalar (kod yüzeyi)

```
backend/app/automation/router.py                   |  44 ++++-
backend/app/automation/service.py                  | 191 ++++++++++++++++++---
backend/tests/test_faz13_automation_policy_inbox.py|  16 +-
backend/tests/test_phase_an_automation_policies_guard.py (yeni)
```

Toplam ~215+ eklenen satır, ~36 değişen satır + 1 yeni test dosyası.

Frontend dosyası **değişmedi** — admin sayfası zaten admin token kullanıyordu; user sayfası (UserAutomationPage) zaten kullanıcının kendi kanalı üzerinden by-channel endpoint'ini çağırıyor — backend scope şimdi cevabı sahipleştiriyor.

---

## 4. Testler ve Sonuçlar (AN-1.4)

### 4.1 AN-1 dosyası — ilk koşu

```
backend/tests/test_phase_an_automation_policies_guard.py — 24 passed in 6.56s
```

### 4.2 Hedefli regresyon paketi (fix sonrası)

```bash
python3 -m pytest \
  tests/test_phase_an_automation_policies_guard.py \
  tests/test_faz13_automation_policy_inbox.py \
  tests/test_faz16_notifications.py \
  tests/test_full_auto_service.py \
  tests/test_phase_am_platform_connections_guard.py \
  tests/test_phase_am_users_audit_admin_guard.py \
  tests/test_phase_am_settings_drift.py \
  tests/test_health.py -q
```

Sonuç: **106 passed in 16.86s** — sıfır failure, sıfır error, sıfır warning-to-failure.

Dağılım:
- Phase AN-1 guard: 24
- Faz 13 (eski suite, AN-1 sonrası): 10
- Faz 16 notifications: ?
- Full_auto_service: ?
- AM-2 platform_connections guard: 18
- AM-3 users+audit admin guard: 18
- AM-4 settings drift: 14
- Health: ?

(Geri kalan detay `-v` koşusunda üretilir; toplam 106.)

---

## 5. Ek Risk / Açık Uçlar

| Madde | Durum |
|---|---|
| `event_hooks.py:83` doğrudan model yazıyor (bypass service) | **Bilinçli**. Dahili sistem event'ı — kullanıcı girdisi yok. Kapsam dışı. |
| Count endpoint admin filtre yetkisi | Korundu — admin dashboard widget'ları için meşru. |
| Frontend scope param hygiene (AM-5 patter'ı) | Automation sayfaları için şu an gereksiz — scope backend'de enforce ediliyor. Cache key hygiene gelecek bir AN alt-fazında incelenebilir; bu turda skip. |
| 9 service fonksiyonunda `caller_ctx=None` default | Back-compat için bilinçli. Dahili callers davranış görmez. |
| MissingGreenlet SQLAlchemy trap | Test kodunda `_headers` snapshot pattern'i ile izole edildi. Üretim kodunda oluşmaz (session scope request başına). |

---

## 6. Kapatılan Audit Bulguları

Phase AL §3 (Ownership Reality Check) — `automation_policies` satırı:

| Seviye | Önceki durum | Şimdiki durum | Kanıt |
|---|---|---|---|
| Router level enforce | ❌ yok | ✅ `Depends(get_current_user_context)` | `backend/app/automation/router.py` |
| Service level enforce | ❌ yok | ✅ `caller_ctx` + `apply_user_scope` / `ensure_owner_or_admin` | `backend/app/automation/service.py` |
| Query level enforce | ❌ yok | ✅ `apply_user_scope(query, Model, caller_ctx)` | `service.list_automation_policies` + `list_inbox_items` |
| Frontend level filter | ⚠️ scope param eksik | ➖ değişmedi, gerek yok (backend pinliyor) | — |
| Create owner spoof defense | ❌ açık | ✅ non-admin'da coerce, admin'de serbest | `service.create_automation_policy` + `service.create_inbox_item` |

---

## 7. 7-Parçalı Teslim Raporu

1. **Ne yaptım:** `/api/v1/automation-policies` + `/api/v1/operations-inbox` modüllerinde Phase AM-2 pattern'ini uyguladım. 11 router endpoint'i `UserContext` dependency'sine bağlandı, 9 service fonksiyonu `caller_ctx` alır hâle geldi, ownership guard + scope filter + create spoof defense eklendi. Hiçbir yeni endpoint, hiçbir yeni davranış; sadece var olanı enforce ediyor.

2. **Hangi dosyaları:**
   - `backend/app/automation/router.py` (modified)
   - `backend/app/automation/service.py` (modified)
   - `backend/tests/test_phase_an_automation_policies_guard.py` (new, 24 test)
   - `backend/tests/test_faz13_automation_policy_inbox.py` (1 test fix: `test_inbox_filter_by_owner` → admin caller)
   - `docs/phase_an_automation_policies_guard_closure.md` (bu dosya)

3. **Hangi testler:** AN-1 guard (24) + Faz 13 (10) + Faz 16 + full_auto_service + AM-2 (18) + AM-3 (18) + AM-4 (14) + health — toplam **106 test**.

4. **Sonuç:** 106 passed, 0 failed, 0 error. 16.86 saniyede bitti.

5. **Ek risk:** §5 tablosu. Özet: event_hooks bypass bilinçli (dahili), `caller_ctx=None` default back-compat için, frontend cache hygiene bu faz'da skip.

6. **Commit hash:** (bu dosya commit'lendikten sonra doldurulur)

7. **Push durumu:** (push sonrası doldurulur)

---

## 8. Gelecek Faz İçin Notlar

- Phase AM-5 gibi frontend scoped query key hygiene, automation sayfalarında henüz uygulanmadı. Low-risk iş, ayrı bir alt-faz olabilir (AN-2 gibi).
- Automation modülünde admin-specific endpoint (ör. `GET /automation-policies/all`) yok — admin yine de `GET /automation-policies` çağırıp full listeyi alıyor. Daha eksplisit bir split istenirse gelecek faz.
- `event_hooks.py`'nin `OperationsInboxItem` yazıları caller_ctx almıyor; bu bilinçli tercih. Eğer ileride `caller_ctx=system` semantic gerekirse ayrı tasarım.

---

## 9. CLAUDE.md Uyumu

- ✅ Hiçbir hardcoded bypass yok
- ✅ Hiçbir hidden behavior yok — guard tek bir yerde (`ownership.py`) tanımlı, router/service açıkça çağırıyor
- ✅ Main branch'e dokunulmadı — sadece worktree branch'i
- ✅ Küçük yüzey — 3 backend dosyası + 1 yeni test + 1 doc + 1 test fix
- ✅ Her meaningful change test edildi
- ✅ Regression pass
- ✅ Settings Registry üzerinden akmayan yeni davranış eklenmedi (guard semantik, setting değil — ownership core invariant)

`code change: scoped to backend/app/automation/ + backend/tests/ — 0 frontend, 0 main branch, 0 migrations`
