# Preview Artifact Contract — PHASE AA

**Amaç:** preview-first yaklaşımını gerçek, tutarlı ve yönetilebilir bir yüzeye
dönüştürmek. Preview ile final artifact arasındaki sınırı hem backend'de hem
frontend'de kaybolmaz hale getirmek.

**Durum:** PHASE AA'da contract + surface kuruldu. news_bulletin modülü için
henüz gerçek bir preview aşaması yoktur (honest gap — aşağıda açıklandı).

---

## 1. Kavram

| Kavram              | Tanım                                                              |
| ------------------- | ------------------------------------------------------------------ |
| **FINAL artifact**  | Yayına çıkabilecek, nihai üretim çıktısı. Render, TTS, subtitle, composition props vb. |
| **PREVIEW artifact**| Karar/onay amaçlı, hızlı ve ucuz üretilen ara çıktı. Nihai değil.  |
| **TEMP artifact**   | Disposable ara dosyalar (`tmp_*`, `.tmp`, `.part`, `.swp`). Liste'de gösterilmez. |

Contract kaynağı: `backend/app/contracts/enums.py::ArtifactScope` ve
`ArtifactKind`. PHASE AA bu enum'ları YÜZEYE çıkarır, yeniden yazmaz.

---

## 2. Filename Classifier Kuralları

Classifier (tek otorite: `backend/app/previews/classifier.py::classify_filename`)
aşağıdaki sırayla değerlendirir. İlk eşleşen kazanır.

### 2.1 Hidden (liste'de gösterilmez)

- `tmp_*` prefix
- `.` prefix (dotfile)
- `_` prefix (ör. `_partial.mp4`)
- Suffix `.tmp`, `.part`, `.swp`

### 2.2 PREVIEW kuralları

| Dosya adı şeması              | Scope   | Kind            | source_step       | Label               |
| ------------------------------ | ------- | --------------- | ----------------- | ------------------- |
| `preview_frame.{jpg,png,gif}`  | PREVIEW | THUMBNAIL       | `render_still`    | `Frame preview`     |
| `preview_mini.{mp4,webm,mov}`  | PREVIEW | VIDEO_RENDER    | `preview_mini`    | `Mini preview`      |
| `preview_*.json`               | PREVIEW | METADATA        | (stem tabanlı)    | (stem tabanlı)      |
| `preview_*.{jpg,png,gif}`      | PREVIEW | THUMBNAIL       | (stem tabanlı)    | (stem tabanlı)      |
| `preview_*.{mp4,webm,mov}`     | PREVIEW | VIDEO_RENDER    | (stem tabanlı)    | (stem tabanlı)      |
| `preview_*.{mp3,wav,aac,m4a}`  | PREVIEW | AUDIO           | (stem tabanlı)    | (stem tabanlı)      |
| `preview_*.*` (diğer)          | PREVIEW | GENERIC         | (stem tabanlı)    | (stem tabanlı)      |

**stem-based prefix map** (longest-prefix-wins):

| Stem prefix              | source_step      | Label                      |
| ------------------------ | ---------------- | -------------------------- |
| `preview_mini`           | `preview_mini`   | Mini preview               |
| `preview_frame`          | `render_still`   | Frame preview              |
| `preview_script`         | `script`         | Script preview             |
| `preview_metadata`       | `metadata`       | Metadata preview           |
| `preview_subtitle`       | `subtitle`       | Subtitle preview           |
| `preview_composition`    | `composition`    | Composition preview        |
| `preview_thumbnail`      | `thumbnail`      | Thumbnail preview          |
| `preview_news_selected`  | `news_selected`  | Selected items preview     |
| `preview_props`          | `render_still`   | Preview render props       |

### 2.3 FINAL kuralları

| Dosya adı şeması                  | Scope | Kind               | source_step  |
| --------------------------------- | ----- | ------------------ | ------------ |
| `final.mp4` / `render.mp4` / `*.{mp4,webm,mov}` | FINAL | VIDEO_RENDER       | `render` (final/render stem'leri için) |
| `thumbnail*.{jpg,png,gif}`        | FINAL | THUMBNAIL          | `thumbnail`  |
| `*.{jpg,png,gif}` (diğer)         | FINAL | VISUAL_ASSET       | –            |
| `script*.json`                    | FINAL | SCRIPT             | `script`     |
| `metadata*.json`                  | FINAL | METADATA           | `metadata`   |
| `composition_props.json`          | FINAL | COMPOSITION_PROPS  | `composition`|
| `publish*.json`                   | FINAL | PUBLISH_PAYLOAD    | `publish`    |
| `*.json` (diğer)                  | FINAL | GENERIC            | –            |
| `*.{mp3,wav,aac,m4a}`             | FINAL | AUDIO              | `tts`        |
| `*.{srt,vtt}`                     | FINAL | SUBTITLE           | `subtitle`   |
| `*.log`                           | FINAL | LOG                | –            |
| kalan                             | FINAL | GENERIC            | –            |

---

## 3. Invariants (test ile kilitlendi)

1. **Preview → asla FINAL olmaz.** Classifier'ın bir `preview_*` dosyası için
   döndürdüğü scope her zaman `PREVIEW`. Test: `test_preview_files_never_get_final_scope`.
2. **FINAL → asla PREVIEW olmaz.** Test: `test_final_files_never_get_preview_scope`.
3. **Hidden filter tutarsa artifact listesine hiç düşmez.** Test:
   `test_hidden_files_not_listed`.
4. **Classifier input-only; I/O yapmaz.** Dosya var olmasa bile çalışır —
   pipeline planlama aşamasında da güvenle çağrılabilir.

---

## 4. API Surface

| Endpoint                                       | Davranış                                                  |
| ---------------------------------------------- | --------------------------------------------------------- |
| `GET /api/v1/jobs/{id}/previews`               | Scope ayrımı yapılmış tüm artifact listesi.               |
| `GET /api/v1/jobs/{id}/previews?scope=preview` | Sadece preview.                                           |
| `GET /api/v1/jobs/{id}/previews?scope=final`   | Sadece final.                                             |
| `GET /api/v1/jobs/{id}/previews/latest`        | En son PREVIEW (mtime). Yoksa 404 "henuz preview yok".    |
| `GET /api/v1/jobs/{id}/artifacts/{path}`       | **Parallel serve yolu yok — preview dosyası da bu endpoint'ten iner.** Aynı ownership + path-traversal guard. |

**Ownership kuralı:** `jobs/router._enforce_job_ownership` ile bire bir aynı.
- admin → her job'a erişir.
- user → kendi `owner_id` ile eşleşen job'a erişir.
- orphan job (`owner_id=None`) → sadece admin.
- cross-user → 403.

Validation: `scope` yalnızca `preview | final` olabilir; geçersiz scope 422.
Bilinmeyen job id → 404.

---

## 5. Frontend Surface

| Component / hook                                  | Sorumluluğu                                           |
| ------------------------------------------------- | ----------------------------------------------------- |
| `api/previewsApi.ts`                              | Typed fetch — `fetchJobPreviews`, `fetchLatestJobPreview`. |
| `hooks/useJobPreviews.ts`                         | React Query — `useJobPreviews(jobId, scope?)`, `useLatestJobPreview(jobId)`. |
| `components/preview/JobPreviewCard.tsx`           | Tek kayıt — scope badge (ONİZLEME / NIHAİ), MediaPreview delegasyonu (video/image/audio/json/text), download linki. |
| `components/preview/JobPreviewList.tsx`           | Grouped liste — "Onizlemeler" + "Nihai Ciktilar" başlıkları + toplam sayaç. |

Yerleştirmeler:
- `frontend/src/pages/admin/JobDetailPage.tsx` — "Ciktilar" bölümünden sonra.
- `frontend/src/pages/user/ProjectDetailPage.tsx` — projenin en son iş'i için
  compact kart gösterir.

**Kural:** Frontend sahte filtreleme yapmaz. Ownership kararı backend'den gelir;
frontend sadece surface'a yansıtır. Preview kartında "Bu dosya yalnizca bir
onizlemedir — nihai cikti degildir." uyarısı her zaman görünür.

---

## 6. Modül Bazlı Durum

### 6.1 standard_video ✅
- Preview üretimi: `render_still` adımı → `artifacts/preview_frame.jpg`
  (still frame).
- Classifier doğru yakalar: PREVIEW / THUMBNAIL / `render_still`.
- Parallel pattern yok — dosya `artifacts/` altında, classifier scope'u çıkarır.

### 6.2 product_review ✅
- Preview üretimi: `preview_mini` adımı → `artifacts/preview_mini.mp4` +
  `artifacts/preview_mini.json` (meta).
- Classifier doğru yakalar:
  - `preview_mini.mp4` → PREVIEW / VIDEO_RENDER / `preview_mini`.
  - `preview_mini.json` → PREVIEW / METADATA / `preview_mini`.

### 6.3 news_bulletin ✅ (PHASE AB — honest gap kapandı)

PHASE AA'da belgelenen honest gap, PHASE AB'de **fake preview üretmeden**
kapatıldı. news_bulletin artık üç gerçek preview artifact'i üretir:

| Artifact                      | Üretim noktası                                | Scope / Kind         | source_step      |
| ----------------------------- | --------------------------------------------- | -------------------- | ---------------- |
| `preview_news_selected.json`  | `BulletinScriptExecutor.execute()` başında (selected_items guard'ından hemen sonra) | PREVIEW / METADATA | `news_selected`  |
| `preview_script.json`         | `BulletinScriptExecutor` — `bulletin_script.json` (FINAL) yazıldıktan SONRA | PREVIEW / METADATA | `script`         |
| `preview_metadata.json`       | `BulletinMetadataExecutor` — `metadata.json` (FINAL) yazıldıktan SONRA | PREVIEW / METADATA | `metadata`       |

**Honest state garantileri:**
- `selected_items` boşsa executor hata fırlatır (PHASE X öncesinden beri
  mevcut kural) — `preview_news_selected.json` dahil hiçbir preview yazılmaz.
- LLM çağrısı başarısız olursa `bulletin_script.json`/`metadata.json`
  yazılmaz — dolayısıyla `preview_script.json`/`preview_metadata.json` da
  yazılmaz.
- Preview yazımı best-effort'dur: yazım hatası olursa step başarısız olmaz,
  ama fake placeholder da oluşturulmaz (`_write_preview_artifact` dönüş
  değeri None → log warning → sessiz devam).
- `preview_*` prefix ihlali `_write_preview_artifact` içinde bloklanır
  (error log + None dönüş).

**Alınmayan preview:**
- `preview_bulletin_frame.jpg` — honestly derive edilebilmesi için gerçek
  render gerekir (composition step yalnızca props üretir). Ayrı bir
  `render_still` adımı veya Remotion CLI preview-only invocation şu an
  pipeline'da yok → sahte çerçeve inject etmedik, gelecek bir faza
  bırakıldı.
- Composition preview (`preview_composition.json`) — composition_props.json
  zaten FINAL scope'ta ve full içeriği var; ayrı bir "preview" dilimine
  ihtiyaç yok, parallel pattern olurdu.

**Classifier değişikliği yok.** `_PREVIEW_STEP_MAP` ve `_PREVIEW_LABEL_MAP`
zaten PHASE AA'da bu stem'leri içeriyordu — AB yalnızca üreticiyi ekledi.

### 6.4 (eski) news_bulletin honest gap — kapandı

_(Bu bölüm AB öncesi durumun dokümantasyonuydu. AB sonrası artık geçerli
değil — §6.3'e bakınız.)_

---

## 7. Add / Extend Checklist

Yeni bir modül için preview çıkışı eklerken:

1. [ ] Dosya adını `preview_` prefix ile başlat ve anlamlı bir alt ad seç
      (ör. `preview_hero.png`, `preview_audio.mp3`).
2. [ ] Dosyayı `workspace/{job_id}/artifacts/` altına yaz (mevcut pattern).
3. [ ] Parallel bir `preview/` alt dizini OLUŞTURMA — classifier flat `artifacts/`
      bekler; tek otorite.
4. [ ] Eğer yeni bir source_step / label ayrımı gerekliyse
      `_PREVIEW_STEP_MAP` ve `_PREVIEW_LABEL_MAP` güncellenir.
5. [ ] Test: classifier beklenen scope/kind/source_step'i dönüyor mu? Service
      bu dosyayı `preview_count` sayacında mı görüyor?
6. [ ] Frontend'de yeni bir kart tipi GEREKMİYOR — MediaPreview otomatik tanır.

---

## 8. Non-Goals (bilinçli olarak kapsam dışı)

- Preview render maliyeti / süresi telemetrisi (gelecek analytics pack işi).
- Preview-to-final sürüm eşlemesi (style blueprint version pinning PHASE AA
  kapsamında değil).
- Soft dedupe, semantic comparison, otomatik preview tetikleyiciler.
- news_bulletin için preview executor yazmak (honest gap; gelecek modül işi).
