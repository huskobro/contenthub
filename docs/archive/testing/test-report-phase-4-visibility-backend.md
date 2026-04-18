# Test Raporu — Phase 4: Visibility Engine Backend Temeli

**Tarih:** 2026-04-01
**Faz:** 4 — Visibility Engine Backend Temeli

---

## Amaç

Görünürlük kurallarını sistemde first-class backend objesi olarak kurmak.
Hangi sayfanın/widget'ın/alanın/sihirbaz adımının kime görüneceğini taşıyan
`visibility_rules` tablosunu, CRUD servisini ve API'sini oluşturmak.

---

## Çalıştırılan Komutlar

```bash
cd backend

# Migration üret
.venv/bin/alembic revision --autogenerate -m "add_visibility_rules_table"

# Migration uygula
.venv/bin/alembic upgrade head

# Testleri çalıştır
.venv/bin/pytest tests/test_visibility_api.py tests/test_settings_api.py \
  tests/test_health.py tests/test_db_bootstrap.py -v
```

---

## Migration Sonucu

```
INFO  Detected added table 'visibility_rules'
INFO  Detected added index 'ix_visibility_rules_rule_type' on '('rule_type',)'
INFO  Detected added index 'ix_visibility_rules_target_key' on '('target_key',)'
Running upgrade f0dea9dfd155 -> de267292b2ab, add_visibility_rules_table
```

Revision: `de267292b2ab_add_visibility_rules_table.py`

---

## Test Sonuçları

```
28 passed in 0.09s
```

| Test | Sonuç |
|------|-------|
| `test_visibility_rules_table_exists` | PASSED |
| `test_create_visibility_rule` | PASSED |
| `test_list_visibility_rules` | PASSED |
| `test_list_visibility_rules_filter_rule_type` | PASSED |
| `test_list_visibility_rules_filter_role_scope` | PASSED |
| `test_get_visibility_rule_by_id` | PASSED |
| `test_update_visibility_rule` | PASSED |
| `test_get_visibility_rule_not_found` | PASSED |
| `test_update_visibility_rule_not_found` | PASSED |
| `test_create_rule_negative_priority_rejected` | PASSED |
| `test_create_rule_missing_required_fields_rejected` | PASSED |
| Önceki 17 settings + health + DB bootstrap testi | PASSED (tümü) |

**Yan düzeltme:** `test_settings_api.py` testleri hardcoded key'ler kullandığı için
paylaşılan DB'de önceki koşulardan kalan kayıtlarla unique key çakışması yaşıyordu.
Her test çalışmasında `uuid` suffix üretecek şekilde düzeltildi.

---

## Bilerek Yapılmayanlar

- Çalışma zamanı görünürlük çözümleme (resolver)
- Settings + visibility birleştirme mantığı
- Öncelik / kalıtım motoru
- DELETE endpoint
- Toplu işlemler
- Önbellekleme
- SSE invalidation
- Admin/user özel endpoint yüzeyleri
- Frontend görünürlük uygulaması
- Wizard motoru

---

## Riskler / Ertelenenler

- Testler paylaşılan bir SQLite dosyası üzerinde çalışıyor (prod DB ile aynı). İzolasyon için in-memory test DB ilerleyen fazlarda değerlendirilebilir. Bu turda `_uid()` suffix ile çözüme kavuşturuldu.
- `rule_type` ve `role_scope` string olarak bırakıldı — izin verilen değerler için enum doğrulaması resolver inşa edilirken eklenebilir.
- `priority` çözümlemesi henüz uygulanmadı — aynı `target_key` için birden fazla kural varsa hangisinin geçerli olacağı resolver fazında belirlenecek.
