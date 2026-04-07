# M39a — Jobs, Üretim Akışı ve Visibility Fix Raporu

**Milestone:** M39a
**Tarih:** 2026-04-07
**Durum:** Tamamlandı
**Kapsam:** Job Engine operator yüzeyi, News Bulletin pipeline düzeltmesi, Content linkage, Visibility kural oluşturma formu

---

## Genel Bakış

M39 Full Product Manual QA sonrası tespit edilen kritik üretim akışı sorunları ve operatör görünürlük eksiklikleri giderildi. Altı ana problem alanı ele alındı.

---

## Tespit Edilen Sorunlar ve Düzeltmeler

### 1. KRITIK BUG: Haber Bülteni job'ları "queued" takılıyordu

**Sorun:** `news_bulletin/service.py::start_production()` fonksiyonu job oluşturuyordu ancak `initialize_job_steps()` çağrısını yapmıyordu. Sonuç: job DB'de var, adımlar (JobStep kayıtları) yok. `PipelineRunner` adım bulamadığı için pipeline hiç başlamıyor, job sonsuza kadar `queued` kalıyordu.

**Köken:** Jobs Router'daki (`/api/v1/jobs` POST) akış doğru yapılandırılmıştı — `initialize_job_steps` çağrısı orada mevcuttu. Ancak News Bulletin'in kendi `start_production` servisi bu adımı atlıyordu.

**Düzeltme:** `backend/app/modules/news_bulletin/service.py`
```python
# dispatch öncesine eklendi:
await initialize_job_steps(db, job.id, "news_bulletin", module_registry)
```

**Etki:** Bundan sonra oluşturulan tüm NB job'ları adım kayıtlarıyla birlikte başlayacak ve pipeline gerçekten çalışacak.

**Not:** Mevcut "queued" takılı job'lar için: backend yeniden başlatıldığında recovery scanner devreye girer. Alternatif olarak bu job'lar clone + yeniden üretim ile düzeltilebilir.

---

### 2. Jobs sayfası ham DB alan adlarını gösteriyordu (FAZ A — Operator Dili)

**Sorun:** `JobDetailPanel` ve `JobsTable` bileşenleri operatöre `module_type`, `owner_id`, `template_id`, `current_step_key`, `elapsed_total_seconds`, `workspace_path` gibi iç teknik alan adlarını gösteriyordu.

**Düzeltme:**

`frontend/src/components/jobs/JobDetailPanel.tsx`:
- `module_type` → "Modül" (ör. "Haber Bülteni", "Standart Video")
- `status` → "Durum" (ör. "Tamamlandı", "Kuyrukta")
- `owner_id` / `template_id` / `workspace_path` satırları kaldırıldı
- `current_step_key` → "Aktif Adım" (sadece aktifken gösterilir)
- `retry_count` → "Tekrar Sayısı" (0 ise gizlenir)
- `last_error` → "Son Hata" (sadece varsa gösterilir)
- `id` → "İş Kimliği" (küçültülmüş mono font)
- Zamanlama etiketleri: "Geçen Süre", "Tahmini Kalan", "Oluşturulma", "Başlangıç", "Bitiş"
- "Tam Sayfa →" linki eklendi (JobDetailPage'e)

`frontend/src/components/jobs/JobsTable.tsx`:
- Modül kolonunda artık "Haber Bülteni" / "Standart Video" gibi okunabilir isimler
- Durum rozeti: "Tamamlandı", "Başarısız", "Kuyrukta" vb.
- Filtre chip'leri de Türkçe modül adları kullanıyor

---

### 3. Job → İçerik kaydı bağlantısı yoktu (FAZ B+C+F — Content Linkage)

**Sorun:** Jobs sayfasında bir job'u seçince hangi haber bülteni veya standart video için çalıştığı belli değildi. Backend'de de bu sorgu mevcut değildi.

**Düzeltme:**

**Backend:** `backend/app/jobs/router.py`
```
GET /api/v1/jobs/{job_id}/content-ref
```
Döner: `content_id`, `content_title`, `content_status`, `content_url` (modüle göre NB veya SV)

**Frontend API:** `frontend/src/api/jobsApi.ts`
- `JobContentRef` interface ve `fetchJobContentRef()` eklendi

**Hook:** `frontend/src/hooks/useJobContentRef.ts`
- `useJobContentRef(jobId)` — React Query ile cache'li sorgulama

**UI:** `JobDetailPanel.tsx`
- İçerik kaydı varsa mavi bilgi bandı: modül adı, içerik başlığı, içerik durumu, "İçeriğe Git →" linki

---

### 4. Visibility sayfası salt-okunurdu, kural eklenemiyordu (FAZ E)

**Sorun:** Backend'de tam CRUD API mevcut (`POST /visibility-rules`, `PATCH /visibility-rules/{id}`) ancak frontend read-only'di. Admin görünürlük kuralı oluşturmak için backend API'yi doğrudan çağırması gerekiyordu.

**Düzeltme:**

**API:** `frontend/src/api/visibilityApi.ts`
- `createVisibilityRule()` ve `patchVisibilityRule()` eklendi
- `VisibilityRuleCreate` ve `VisibilityRulePatch` interface'leri

**Yeni bileşen:** `frontend/src/components/visibility/VisibilityRuleCreateForm.tsx`
- Kural tipi dropdown (sayfa, widget, alan, wizard adımı, panel)
- Hedef anahtar text input (format açıklaması ile)
- Modül kapsamı ve rol kapsamı dropdown
- Görünür / Salt Okunur / Wizard'da Görünür checkbox'ları
- Öncelik input
- Notlar textarea
- Hata gösterimi, submit/iptal

**Sayfa güncellemesi:** `frontend/src/pages/admin/VisibilityRegistryPage.tsx`
- "+ Yeni Kural" butonu eklendi
- Form bir `Sheet` içinde açılıyor
- Başarı sonrası yeni oluşturulan kural seçili geliyor
- Operator-friendly açıklama metinleri

---

## Değişmeyen / Etkilenmeyen Şeyler

- `JobDetailPage.tsx` (tam sayfa) — yayın bağlantısı ve SSE zaten mevcut, dokunulmadı
- Pipeline Runner, Step Executor, Provider Registry — dokunulmadı
- State machine geçişleri — dokunulmadı
- Visibility backend router — dokunulmadı (zaten tam çalışıyordu)
- Tüm mevcut testler geçiyor (405 ilgili test, 0 yeni başarısızlık)

---

## Test Sonuçları

| Alan | Sonuç |
|---|---|
| TypeScript `tsc --noEmit` | ✅ Temiz (0 hata) |
| Backend — news_bulletin testleri | ✅ Geçti |
| Backend — visibility testleri | ✅ Geçti |
| Backend — job testleri | ✅ Geçti |
| Backend — tüm suite (hariç pre-existing M7) | ✅ 1102 geçti, 1 pre-existing başarısız |

**Pre-existing başarısız:** `test_m7_c1_migration_fresh_db` — M39a değişikliklerinden bağımsız, sistem Python/venv path uyumsuzluğu.

---

## Değişen Dosyalar

### Backend
| Dosya | Değişiklik |
|---|---|
| `backend/app/modules/news_bulletin/service.py` | `initialize_job_steps` çağrısı eklendi — kritik pipeline fix |
| `backend/app/jobs/router.py` | `GET /{job_id}/content-ref` endpoint eklendi |

### Frontend
| Dosya | Değişiklik |
|---|---|
| `frontend/src/api/jobsApi.ts` | `JobContentRef`, `fetchJobContentRef` eklendi |
| `frontend/src/api/visibilityApi.ts` | `createVisibilityRule`, `patchVisibilityRule` eklendi |
| `frontend/src/hooks/useJobContentRef.ts` | Yeni hook |
| `frontend/src/components/jobs/JobDetailPanel.tsx` | Operator-friendly yeniden yazım + content linkage banner |
| `frontend/src/components/jobs/JobsTable.tsx` | Modül ve statü etiketleri Türkçeleştirildi |
| `frontend/src/components/visibility/VisibilityRuleCreateForm.tsx` | Yeni bileşen |
| `frontend/src/pages/admin/VisibilityRegistryPage.tsx` | "+ Yeni Kural" butonu ve Sheet entegrasyonu |

---

## Teknik Borç / Bilinen Sınırlar

1. **Mevcut "queued" takılı NB job'ları:** DB'de 4 adet job var, adımları yok. Otomatik düzeltilmez; clone + retry veya manuel temizleme gerekli.
2. **Standard Video → job_id bağlantısı:** SV wizard'ı job oluşturmuyor; `job_id` alanı var ama hiç set edilmiyor. Content-ref endpoint SV için çalışır ama hiçbir SV'nin job_id'si yok. Bu ayrı bir story.
3. **Visibility patch UI:** `patchVisibilityRule` API eklendi ancak frontend'de detay panelinde henüz inline-edit yok. Sonraki milestone'da tamamlanabilir.
4. **elapsed_total_seconds:** Bazı tamamlanmış job'larda null. Pipeline'ın `transition_job_status(completed)` çağrısında elapsed hesaplanmıyor. Ayrı bir fix gerekli.

---

## M40 Hazırlık Durumu

Bu değişikliklerle birlikte:
- ✅ News Bulletin pipeline artık gerçekten çalışır (provider yapılandırılmışsa)
- ✅ Jobs sayfası operatör için anlaşılır
- ✅ Job → içerik bağlantısı görünür
- ✅ Visibility sistemi admin tarafından yönetilebilir

M40 MVP Final Acceptance Gate için geriye kalan ana alan: tam uçtan uca render + yayın akışının provider yapılandırmasıyla doğrulanması.
