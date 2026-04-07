# Publish Center + Review Gate + YouTube Publish V1 — Rapor (M36)

Tarih: 2026-04-07

## 1. Executive Summary

Publish zinciri truth audit yapıldı. Mevcut altyapı (state machine, YouTube adapter, audit log, temel UI) gerçek ve sağlamdı. Bu fazda kritik eksikler giderildi: review gate'e rejection reason zorunluluğu eklendi, job tamamlandığında publish record oluşturma yolu açıldı, payload draft aşamasında düzenlenebilir hale getirildi, Publish Center'a modül filtresi eklendi, Job Detail'de publish durumu görünür oldu.

---

## 2. Mevcut Publish Zincirinde Ne Bulundu

### Sağlam Olan:
- **State machine**: 9 state, net geçiş kuralları, draft → pending_review → approved → publishing → published zinciri zorunlu
- **YouTube Adapter**: Gerçek YouTube Data API v3 çağrıları — resumable upload + activate
- **Audit log**: Append-only PublishLog tablosu, her state geçişi ve aksiyon kaydediliyor
- **Temel UI**: PublishCenterPage + PublishDetailPage gerçek backend'e bağlı, aksiyonlar çalışıyor
- **Review gate servisi**: `trigger_publish()` draft/pending_review'da 422 döndürüyor

### Eksik / Düzeltilen:
| Sorun | Çözüm |
|-------|-------|
| Rejection reason opsiyonel, audit'e düşmüyor | Zorunlu hale getirildi, detail_json'a kaydediliyor |
| Publish record job tamamlandığında elle oluşturuluyordu | `POST /from-job/{job_id}` endpoint'i eklendi |
| Payload DRAFT'ta bile düzenlenemiyor | `PATCH /publish/{id}` endpoint'i + frontend editörü |
| Publish Center'da modül filtresi yok | content_ref_type filtresi eklendi |
| Job Detail → Publish bağlantısı yok | "Yayin Durumu" kartı ve "Yayina Hazirla" butonu eklendi |

---

## 3. Review Gate Nasıl Kuruldu

**Mevcut (korundu):** State machine düzeyinde draft → approved geçişi yasak. `can_publish()` draft/pending_review'da False döndürüyor.

**Eklenenler:**

1. **Rejection reason zorunlu:**
   - Router: `action == "reject"` ve `rejection_reason` boşsa → 422
   - Service: `review_action()` rejection için reason validate ediyor
   - Audit: `detail_json = {"decision": "reject", "rejection_reason": "..."}` formatında kaydediliyor

2. **Review aşaması audit'e düşüyor:**
   - Onaylama: `REVIEW_ACTION` event → `{decision: "approve"}`
   - Reddetme: `REVIEW_ACTION` event → `{decision: "reject", rejection_reason: "..."}`
   - Kim/ne zaman/hangi karar: `actor_type`, `actor_id`, `created_at` ile tam izlenebilir

---

## 4. Manual Override Nasıl Çalışıyor

- Operator "reject" kararı verince rejection reason zorunlu — sessiz red yok
- Reddetme terminal değil: `review_rejected` → `draft` geçişi mümkün, tekrar review'a gönderilebilir
- Payload draft aşamasında düzenlenebilir: `PATCH /publish/{id}` → note: "Payload güncellendi (draft)" audit'e düşüyor
- `reset_review_for_artifact_change()` korundu — artifact değişince onaylı kayıt pending_review'a döner

---

## 5. Publish Center Nasıl Olgunlaştı

**Eklenen:**
- **Modül filtresi**: "Tümü / Standart Video / Haber Bülteni" dropdown — `content_ref_type` parametresiyle backend filtresi
- **Backend filtre**: `GET /api/v1/publish/?content_ref_type=standard_video` artık çalışıyor
- **Payload editörü** (PublishDetailPage, DRAFT only): inline textarea, Save/Cancel, backend PATCH ile kaydediyor

**Korunan:**
- Status filtresi (draft / pending_review / approved / published / failed / vs)
- Tüm aksiyonlar (review'a gönder, onayla, reddet, yayınla, zamanla, iptal, yeniden dene)
- Audit log görünümü
- YouTube video linki

---

## 6. YouTube Publish V1 Ne Yapıyor

### Çalışan:
- Gerçek YouTube Data API v3 resumable upload
- Upload sonrası activate (public veya scheduled)
- `platform_video_id` ve `platform_url` kaydı
- Partial failure handling: upload başarılıysa activate hata verince re-upload yapılmıyor
- Token refresh otomatik

### Alan Kullanımı:
| Alan | Durum |
|------|-------|
| `title` | Zorunlu — yoksa ValueError |
| `description` | Opsiyonel — settings default'a düşüyor |
| `tags` | Opsiyonel — settings default |
| `category_id` | Opsiyonel — default "22" (People & Blogs) |
| `scheduled_at` | Opsiyonel — zamanlanmış yayın |
| `thumbnail_url` | **Desteklenmiyor** — custom thumbnail yüklenmiyor |

### Kalan Limitasyonlar (dürüst not):
- Thumbnail upload yok (YouTube API'de ayrı endpoint gerekiyor)
- Playlist ekleme yok
- Caption/subtitle upload yok
- "Unlisted" visibility seçeneği yok
- Metadata publish sonrası güncellenemiyor

---

## 7. Değişen Dosyalar

| Dosya | Değişiklik |
|-------|-----------|
| `backend/app/publish/schemas.py` | `rejection_reason` field, `PublishRecordPatchPayload`, `PublishFromJobRequest` |
| `backend/app/publish/router.py` | Rejection reason validation, `POST /from-job/{job_id}`, `PATCH /{id}`, content_ref_type param |
| `backend/app/publish/service.py` | Rejection reason audit, content_ref_type filter, `create_publish_record_from_job()`, `patch_publish_payload()` |
| `frontend/src/api/publishApi.ts` | `patchPublishPayload`, `createPublishRecordFromJob`, content_ref_type, rejectionReason |
| `frontend/src/hooks/usePublish.ts` | `usePatchPublishPayload`, `useCreatePublishRecordFromJob`, `usePublishRecordForJob` |
| `frontend/src/pages/admin/JobDetailPage.tsx` | "Yayin Durumu" kartı, "Yayina Hazirla" butonu |
| `frontend/src/pages/admin/PublishDetailPage.tsx` | Payload editörü (draft only), rejection reason input |
| `frontend/src/pages/admin/PublishCenterPage.tsx` | Modül filtresi dropdown |
| `backend/tests/test_publish_center_v1.py` | 11 yeni test |

---

## 8. Test Sonuçları

| Test Dosyası | Test Sayısı | Sonuç |
|-------------|-------------|-------|
| `test_m7_c1_publish_state_machine.py` | 26 | ✅ 26/26 PASS |
| `test_publish_center_v1.py` | 11 | ✅ 11/11 PASS |
| **Toplam** | **37** | **✅ 37/37 PASS** |

Yeni testler:
1. `test_review_reject_requires_reason` — rejection reason zorunlu (service)
2. `test_review_reject_requires_reason_via_service` — service layer validate
3. `test_review_reject_requires_reason_http` — HTTP 422 dönüyor
4. `test_review_reject_requires_reason_full` — tam flow
5. `test_review_reject_with_reason_logs_detail` — reason audit'e düşüyor
6. `test_from_job_endpoint_creates_draft_record` — from-job endpoint çalışıyor
7. `test_from_job_endpoint_nonexistent_job` — 404 doğru
8. `test_patch_payload_only_in_draft` — draft'ta çalışıyor, pending_review'da 422
9. `test_publish_list_filter_by_content_ref_type` — content_ref_type filtresi
10. `test_review_gate_enforced_draft_cannot_publish` — draft → publish yasak

Frontend build: ✅ tsc clean, `vite build` başarılı.

---

## 9. Kalan Limitasyonlar

1. **Thumbnail upload**: YouTube'da ayrı `thumbnails.set` API endpoint gerekiyor. v2'ye ertelendi.
2. **Bulk publish operations**: Toplu işlem yok.
3. **Scheduled publish re-schedule**: Zamanlanmış kayıt için zaman değiştirme UI'ı yok.
4. **Metadata post-publish update**: Publish sonrası title/description güncelleme yok.
5. **from-job metadata okuma**: Artifact dosyası workspace path'ten okunuyor — workspace yoksa başlık boş gelir. Operatörün draft'ta düzenlemesi bekleniyor.
6. **News bulletin publish**: `from-job` endpoint news_bulletin için de çalışıyor ama bulletin_script.json'dan metadata okuma tam entegre değil.

---

## 10. Commit Hash ve Push Durumu

| Commit | Hash | Açıklama |
|--------|------|---------|
| Implementation | `9392ebc` | feat: Publish Center V1 polish |
| Merge | `71078d5` | feat: Merge to main (M36) |

**Push:** ✅ `github.com:huskobro/contenthub.git main` — başarılı
