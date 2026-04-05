# M16-B — Audit Log Hardening Raporu

## Ozet

M15'te eksik kalan audit yuzeyleri tamamlanmistir:
1. Tarih araligi filtresi (date_from, date_to)
2. Detay panelinde old/new deger diff gorunumu
3. Job aksiyonlari audit log kaydi

## Tarih Araligi Filtresi

### Backend
- `GET /api/v1/audit-logs` endpoint'ine `date_from` ve `date_to` query parametreleri eklendi
- ISO format desteklenir (ornek: `2026-01-01T00:00:00`)
- Gecersiz tarih formati `400 Bad Request` doner
- Sayfalama bozulmaz — tarih filtreleri count sorgusuna da uygulanir

### Frontend
- AuditLogPage'e iki adet `<input type="date">` eklendi
- Baslangic ve bitis tarihleri secildiginde ISO formatina cevrilerek API'ye gonderilir
- Bitis tarihine `T23:59:59` eklenir (gun sonu dahil)
- Filtre degistiginde sayfa 0'a resetlenir

## Old/New Diff Gorunumu

### DetailsDiff Bileseni
- `details_json` icinde `old_value`/`new_value` veya `old`/`new` veya `previous_value`/`current_value` alanlari aranir
- Bulunursa:
  - **Onceki Deger** — kirmizi sol kenarlıkla (`#fecaca`)
  - **Yeni Deger** — yesil sol kenarlıkla (`#bbf7d0`)
  - **Ek Bilgi** — kalan alanlar gri JSON olarak
- Bulunamazsa: tek JSON gorunumu (eski davranis)

### Entity Type Etiketleri Genisletildi
- `job` → "Is"
- `job_step` → "Is Adimi"

## Job Aksiyon Audit Kayitlari

| Aksiyon | Entity Type | Detaylar |
|---------|-------------|----------|
| `job.cancel` | `job` | `previous_status`, `new_status` |
| `job.retry` | `job` | `original_job_id`, `new_job_id` |
| `job.step_skip` | `job_step` | `job_id`, `step_key` |

Her aksiyon sonrasi `db.commit()` cagrilir — audit log kaydi kaybolmaz.

## Test Sonuclari

| Test | Durum |
|------|-------|
| `test_date_from_filter` | PASSED |
| `test_date_to_filter` | PASSED |
| `test_date_range_combined` | PASSED |
| `test_invalid_date_format` | PASSED |
| `test_job_actions_create_audit_records` | PASSED |

## Bilinen Sinirlamalar

- Audit log model'inde ayri `old_value_json` / `new_value_json` kolonlari yok — veriler `details_json` icinde saklanir. Frontend diff gorunumu bu alanlari `details_json` icinde arar.
- Tum mutation endpoint'leri henuz old/new pattern'ini kullanmiyor — bazi audit kayitlari sadece genel details icerir. Bu ileriki milestone'larda endpoint bazinda zenginlestirilebilir.
