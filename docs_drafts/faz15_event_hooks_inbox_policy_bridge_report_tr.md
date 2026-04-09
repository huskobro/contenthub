# Faz 15 — Event Hooks + Automatic Inbox Population + Policy Trigger Bridge

**Tarih:** 2026-04-09
**Durum:** ✅ Tamamlandı — 11/11 test geçti

---

## Özet

Faz 15, Operations Inbox'ı manuel POST'lardan kurtarıp domain olaylarından (publish failure, render failure, scan error, review required) otomatik dolduran event hook altyapısını kurdu. Ayrıca Faz 13'te tanımlanan AutomationPolicy checkpoint kararlarını gerçek ürün akışlarına bağlayan policy trigger bridge'i devreye aldı.

## Değişen Dosyalar

### Yeni Dosyalar
| Dosya | Açıklama |
|-------|----------|
| `app/automation/event_hooks.py` | `emit_operation_event()` + `evaluate_and_emit()` — duplikasyon korumalı inbox oluşturma + policy bridge |
| `tests/test_faz15_event_hooks.py` | 11 test — tüm hook'lar, duplicate guard, policy bridge, calendar/inbox ilişkisi |

### Değiştirilen Dosyalar
| Dosya | Değişiklik |
|-------|-----------|
| `app/publish/service.py` | `submit_for_review()` → publish_review inbox item, `mark_failed()` → publish_failure inbox item (priority: urgent) |
| `app/jobs/service.py` | `transition_job_status()` failed → render_failure inbox item (priority: high) |
| `app/source_scans/scan_engine.py` | `_mark_failed()` → source_scan_error inbox item |

## Hook Noktaları

| Olay | item_type | priority | Tetikleyen Fonksiyon |
|------|-----------|----------|---------------------|
| Publish review'a gönderildi | `publish_review` | high | `publish/service.py::submit_for_review()` |
| Publish başarısız | `publish_failure` | urgent | `publish/service.py::mark_failed()` |
| Job (render) başarısız | `render_failure` | high | `jobs/service.py::transition_job_status()` |
| Kaynak tarama başarısız | `source_scan_error` | normal | `source_scans/scan_engine.py::_mark_failed()` |

## Duplicate Guard

- `_find_open_duplicate()`: Aynı `(entity_type, entity_id, item_type)` için `open` veya `acknowledged` durumunda mevcut inbox item varsa yeni oluşturmaz
- Resolved olduktan sonra aynı entity için tekrar oluşturulabilir (test 10 ile doğrulandı)

## Policy Trigger Bridge

- `evaluate_and_emit()`: Kanal policy checkpoint'ini değerlendirir
- `manual_review` → inbox item oluşturur
- `automatic` → inbox item oluşturmaz (otomatik akış devam eder)
- `disabled` → inbox item oluşturmaz (manuel tetikleme beklenir)
- Politika yoksa veya devre dışıysa → inbox item oluşturmaz

## Tasarım Kararları

1. **emit_operation_event commit yapmaz** — caller'ın transaction'ına biner, atomik tutarlılık sağlar
2. **policy_decision ≠ execution_result** — policy sadece karar verir, gerçek otomasyon executor ayrıdır (gelecek faz)
3. **Inbox item oluşturma lightweight** — sadece DB insert, side-effect yok
4. **Calendar/inbox ilişkisi Faz 14a'dan miras** — `_enrich_inbox_relations()` cross-ref zaten çalışıyor

## Test Sonuçları

```
11 passed in 0.20s
```

| # | Test | Sonuç |
|---|------|-------|
| 1 | emit_operation_event creates inbox item | ✅ |
| 2 | Duplicate inbox guard prevents second item | ✅ |
| 3 | Publish submit_for_review creates publish_review inbox item | ✅ |
| 4 | Publish mark_failed creates publish_failure inbox item | ✅ |
| 5 | Job failure creates render_failure inbox item | ✅ |
| 6 | Source scan failure creates source_scan_error inbox item | ✅ |
| 7 | evaluate_and_emit with manual_review creates inbox item | ✅ |
| 8 | evaluate_and_emit with automatic mode does NOT create inbox item | ✅ |
| 9 | Calendar shows newly created inbox items | ✅ |
| 10 | Duplicate guard allows after resolution | ✅ |
| 11 | Inbox items have correct entity refs | ✅ |

## TypeScript + Build

- `tsc --noEmit`: ✅ temiz
- `vite build`: ✅ başarılı

## Bilinen Sınırlamalar

- Henüz `comments`, `playlists`, `posts` modüllerinde hook yok — bunlar Faz 15 scope'unda değildi
- `evaluate_and_emit()` henüz gerçek ürün akışlarında (submit_for_review vb.) çağrılmıyor — kanal bağlamı olan akışlarda ileride devreye alınacak
- Notification Center entegrasyonu yok — inbox item oluşturulduğunda push notification gönderilmiyor (gelecek faz)
