# M15 — Audit Log Sistemi Raporu

## Ozet

M15 kapsaminda audit log sistemi tam runtime durumuna getirilmistir. M11'de olusturulan `write_audit_log()` altyapisi tum mutasyon endpoint'lerine entegre edilmistir.

## Kapsam

### Entegre Edilen Endpoint'ler

| Router | Aksiyon | Entity Type |
|--------|---------|-------------|
| `visibility/router.py` | `visibility_rule.create` | `visibility_rule` |
| `visibility/router.py` | `visibility_rule.update` | `visibility_rule` |
| `publish/router.py` | `publish_record.create` | `publish_record` |
| `publish/router.py` | `publish_record.submit` | `publish_record` |
| `publish/router.py` | `publish_record.review` | `publish_record` |
| `publish/router.py` | `publish_record.schedule` | `publish_record` |
| `publish/router.py` | `publish_record.trigger` | `publish_record` |
| `publish/router.py` | `publish_record.cancel` | `publish_record` |
| `publish/router.py` | `publish_record.reset_to_draft` | `publish_record` |
| `publish/router.py` | `publish_record.retry` | `publish_record` |
| `publish/router.py` | `publish_record.reset_review` | `publish_record` |
| `sources/router.py` | `source.create` | `source` |
| `sources/router.py` | `source.update` | `source` |
| `modules/templates/router.py` | `template.create` | `template` |
| `modules/templates/router.py` | `template.update` | `template` |
| `modules/style_blueprints/router.py` | `style_blueprint.create` | `style_blueprint` |
| `modules/style_blueprints/router.py` | `style_blueprint.update` | `style_blueprint` |
| `publish/youtube/router.py` | `youtube.auth_callback` | `youtube_oauth` |
| `publish/youtube/router.py` | `youtube.revoke` | `credential` |
| `settings/router.py` | `setting.update_effective` | `setting` |
| `settings/router.py` | `setting.update_admin` | `setting` |

### Onceden Mevcut (M11)
- `settings/router.py` — 2 aksiyon (effective, admin update)

### M15'te Eklenen
- Visibility: 2 aksiyon
- Publish: 9 aksiyon
- Sources: 2 aksiyon
- Templates: 2 aksiyon
- Style Blueprints: 2 aksiyon
- YouTube: 2 aksiyon

**Toplam: 21 farkli aksiyon audit altinda.**

## API Endpoint'leri

### GET /api/v1/audit-logs
- Filtreler: `action` (prefix match), `entity_type`, `entity_id`, `limit`, `offset`
- Donus: `{ items: AuditLogEntry[], total: int }`
- Yetki: `require_visible("panel:audit-logs")` ile korunur

### GET /api/v1/audit-logs/{log_id}
- Tekil kayit detayi
- 404 doner eger kayit yoksa

## Admin Yuzeyi

`AuditLogPage.tsx` — tam fonksiyonel admin sayfasi:
- Aksiyon filtresi (text input)
- Varlik tipi filtresi (dropdown)
- Sayfalamali tablo
- Secilen kayit icin detay paneli (JSON gosterimi)
- Sidebar'da "Audit Log" linki
- `VisibilityGuard` ile korunur

## Test Sonuclari

| Test | Durum |
|------|-------|
| `test_write_audit_log_creates_record` | PASSED |
| `test_write_audit_log_never_raises` | PASSED |
| `test_audit_log_list_endpoint` | PASSED |
| `test_audit_log_list_filter_by_action` | PASSED |
| `test_audit_log_list_filter_by_entity_type` | PASSED |
| `test_audit_log_detail_endpoint` | PASSED |
| `test_audit_log_detail_not_found` | PASSED |

Frontend:
| Test | Durum |
|------|-------|
| `audit-log-page.smoke.test.tsx` — 6 test | ALL PASSED |

## Tasarim Kararlari

1. **never-raise**: `write_audit_log()` hicbir zaman exception firlatmaz. Hata durumunda `None` doner ve warning loglar.
2. **flush, not commit**: Caller'in transaction'ina karismaz.
3. **prefix match**: Action filtresi `LIKE 'value%'` kullanir — esnek arama saglar.
4. **Visibility guard**: Audit log sayfasi `panel:audit-logs` visibility key ile korunur.

## Bilinen Sinirlamalar

- old_value/new_value JSON farki henuz detay panelinde gosterilmiyor — details_json icinde yalnizca tek bir JSON gorunur.
- Tarih filtresi (date range) henuz eklenmedi — M15 scope'unda belirtilmedi.
