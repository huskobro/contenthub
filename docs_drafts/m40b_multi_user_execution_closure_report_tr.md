# M40b: Multi-User Execution Closure Raporu

**Tarih:** 2026-04-08
**Kapsam:** system.output_dir aktif kullanim, owner zinciri tutarliligi, user-scoped output path modeli

---

## 1. Executive Summary

M40 ve M40a ile multi-user foundation kuruldu. M40b bu temelin execution tarafini kapatir:

- `system.output_dir` artik sadece bir ayar degil, render tamamlandiginda final artifact gercekten bu dizine kopyalanir
- `workspace.py` startup'ta settings'ten workspace_root yukler — global state tutarli
- Job → Publish zincirinde `actor_id` artik `X-ContentHub-User-Id` header'ından otomatik gelir
- User-scoped output path modeli `resolve_output_dir()` ile tek noktada cozulur
- Job detail UI'da sahip (owner_id) ve calisma dizini (workspace_path) gosterilir

---

## 2. Gap Audit Sonucu

| Gap | Durumu | Oncelik |
|-----|--------|---------|
| `system.output_dir` hic kullanilmiyor | KAPATILDI | Kritik |
| `workspace_root` global state startup'ta güncellenmiyordu | KAPATILDI | Yüksek |
| Job create sırasında system.* keys snapshot'a dahil edilmiyordu | KAPATILDI | Yüksek |
| Publish trigger `actor_id` header'dan almiyordu | KAPATILDI | Orta |
| User-scoped output resolver yok | KAPATILDI | Orta |
| Job detail'de owner_id ve workspace_path gösterilmiyordu | KAPATILDI | Düşük |
| PublishRecord.initiator_id yok | KAPSAM DIŞI | Düşük (job_id FK yeterli) |

---

## 3. system.output_dir Execution Aktif Kullanim

### Yaklaşım
Job yaratılırken `system.workspace_root` ve `system.output_dir` settings snapshot'a ekleniyor. Bu sayede snapshot-locked değerler executor'lara ulaşıyor.

### Startup Sync
`main.py` lifespan'inde seed tamamlandıktan sonra `system.workspace_root` settings'ten okunarak `workspace.py`'daki global `_workspace_root` güncelleniyor.

### Render Sonrası Export
`standard_video/executors/_helpers.py`'ye `_export_to_output_dir()` fonksiyonu eklendi. `render.py` render tamamlandıktan sonra bu fonksiyonu çağırır. News bulletin da aynı `RenderStepExecutor`'u kullandığından otomatik etkilenir.

**Export davranışı:**
- `system.output_dir` boşsa → no-op (sessiz, uyarı loglanır)
- Kaynak dosya yoksa → no-op (uyarı loglanır)
- Başarılıysa → `{output_dir}/{job_id}/{filename}` kopyalanır
- Hata olursa → sadece loglanır, render durdurmaz

---

## 4. Owner/Content/Publish/Output Zinciri

### Job Create Snapshot
`jobs/router.py` ve `news_bulletin/service.py` artık job yaratılırken `system.workspace_root` ve `system.output_dir` snapshot'a ekliyor. User-specific override varsa onun değeri kullanılır (`resolve(key, db, user_id=user_id)`).

### Publish Trigger Actor
`publish/router.py` trigger endpoint'ine `get_active_user_id` dependency eklendi. `actor_id` önce body'den, yoksa header'dan alınır. Publish log'larında kimin yayını başlattığı artık izlenebilir.

---

## 5. User-Scoped Output Path Modeli

`workspace.py`'ye `resolve_output_dir()` eklendi:

```
resolve_output_dir(output_dir_setting, user_slug)

Öncelik:
1. settings değeri varsa → onu kullan
2. user_slug varsa → workspace/users/{slug}/exports
3. fallback → workspace/exports
```

Dizin yapısı:
```
workspace/
  users/
    {slug}/
      jobs/
        {job_id}/
          artifacts/   ← render output
          preview/
          tmp/
      exports/         ← system.output_dir default (user-scoped)
  exports/             ← global fallback
```

---

## 6. Değişen Dosyalar

| Dosya | Değişiklik |
|---|---|
| `backend/app/main.py` | Startup'ta system.workspace_root settings'ten yüklenerek workspace global state güncelleniyor |
| `backend/app/jobs/workspace.py` | `Optional` import, `get_user_export_dir`, `resolve_output_dir` eklendi |
| `backend/app/jobs/router.py` | Job create snapshot'a system.workspace_root + system.output_dir eklendi |
| `backend/app/modules/news_bulletin/service.py` | Job create snapshot'a system.workspace_root + system.output_dir eklendi |
| `backend/app/modules/standard_video/executors/_helpers.py` | `_export_to_output_dir()` helper eklendi |
| `backend/app/modules/standard_video/executors/render.py` | `_export_to_output_dir` import + tek output render sonrası export çağrısı |
| `backend/app/publish/router.py` | `get_active_user_id` import, trigger endpoint'e actor_id from header |
| `frontend/src/components/jobs/JobDetailPanel.tsx` | owner_id ve workspace_path satırları eklendi |

---

## 7. Test Sonuçları

| Test | Sonuç |
|---|---|
| TypeScript (tsc --noEmit) | 0 hata |
| Backend pytest (pre-existing skip'siz) | 1471 passed, 7 pre-existing failures |
| `resolve_output_dir` unit test | 3/3 pass |
| `_export_to_output_dir` unit test | 3/3 pass (empty, missing, real copy) |
| Import check (tum degistirilen moduller) | OK |

**Pre-existing failures (bu PR'dan bagımsız):** test_m5_c1_rss, test_m5_c2_dedupe (4), test_m6_c3_composition_map_sync, test_m7_c1_migration_fresh_db (2)

---

## 8. Kalan Limitasyonlar

- `PublishRecord.initiator_id` hâlâ yok — kapsam dışı bırakıldı, job_id FK üzerinden owner erişilebilir
- `system.output_dir` pipeline içinde consumed oldu ama publish executor'ı final artifact yolunu output_dir'den almıyor (publish adapter kendi job artifact path'ini kullanır — ayrı bir konu)
- Multi-output render'da (`_execute_multi_output`) her output için export copy henüz yok — tek combined output kapsamındaydı, kapsam dışı bırakıldı
- Mevcut job'lar snapshot'larında `system.output_dir` yoksa export çalışmaz (backward compat: no-op)

---

## 9. Commit Hash ve Push Durumu

_(commit + push yapıldıktan sonra doldurulacak)_
