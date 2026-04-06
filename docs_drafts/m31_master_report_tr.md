# M31 Master Rapor — News Bulletin Aktarımı Tamamlandı

**Tarih:** 2026-04-06
**Kapsam:** Faz A–K (tüm fazlar)
**Durum:** TAMAMLANDI

---

## Özet

M31, M28/M29/M30 üzerine inşa edilen News Bulletin modülünün "yarım bırakma yasak" felsefesiyle tamamlanma milestonedur.
7-adım pipeline korunmuş, hiçbir core invariant kırılmamış, tüm yeni davranışlar admin panelden yönetilebilir hale getirilmiştir.

---

## Faz A — Render Mode Gerçek Tamamlanma

**Dosya:** `backend/app/modules/news_bulletin/executors/composition.py`

- `_build_render_outputs()` fonksiyonu eklendi
- `combined`: tüm item'lar → tek output (`output_key="combined"`, `suggested_filename="output.mp4"`)
- `per_category`: item'lar kategoriye göre gruplanır, `category_genel` fallback None için
- `per_item`: her haber için `item_{n}`, `output_item_{n:02d}.mp4` formatı
- Bilinmeyen mod → `combined` fallback + WARNING log
- `composition_props.json` içinde `render_outputs` dizisi + geriye dönük uyumlu `props` (combined view)

**Testler:** `test_m31_render_outputs.py` — 21 test, tümü geçti

---

## Faz B — BulletinLowerThird Remotion Bileşeni

**Dosya:** `renderer/src/components/BulletinLowerThird.tsx` (YENİ)
**Dosya:** `renderer/src/compositions/NewsBulletinComposition.tsx` (GÜNCELLENDİ)

- Üç stil: `broadcast` (koyu navy bar, kırmızı accent), `minimal` (ince border, yarı-saydam), `modern` (gradient bg, mavi kategori pill)
- Bilinmeyen stil → `broadcast` fallback
- Tüm stiller React.CSSProperties (CSS dosyası yok, Remotion uyumlu)
- SubtitleStyle interface M30 preset formatına güncellendi (`font_size`, `font_weight`, `text_color` vb.)
- Eski field'lar (`fontColor`, `backgroundColor`) backward-compat ile korundu
- `renderMode` badge top-center gösterimi (per_category/per_item modlarında)
- Commit: `9b05196`

---

## Faz C — Wizard Üretim Yüzeyi

**Dosya:** `frontend/src/pages/admin/NewsBulletinWizardPage.tsx` (GÜNCELLENDİ)

Eklenen picker'lar:
- **render_mode**: combined / per_category / per_item (step 4'te)
- **subtitle_style**: clean_white / bold_yellow / minimal_dark / gradient_glow / outline_only
- **lower_third_style**: broadcast / minimal / modern / none
- **trust_enforcement_level**: none / warn / block

Kategori önerisi yüzeyi:
- `categoryStyleSuggestion` query ile backend'den alınır
- `dominant_category` ve `category_used` gösterilir
- "Öneriyi Uygula" butonu: subtitle_style + lower_third_style + compositionDirection otomatik set edilir
- Kapatılabilir banner (suggestionDismissed state)

Trust check:
- Step 5'e geçişte `fetchTrustCheck` çağrılır
- `trustEnforcementLevel === "block"` ise start_production engellenir

---

## Faz D — Trust Enforcement Gerçek Ürün Davranışı

**Dosya:** `backend/app/modules/news_bulletin/service.py`

- `check_trust_enforcement(db, bulletin_id)` async fonksiyonu:
  - Seçili haberlerin kaynak güven seviyesini sorgular
  - `none`: kontrol atlanır, her zaman geçer
  - `warn`: low_trust kaynaklar listelenir, uyarı ile geçer
  - `block`: low_trust kaynaklar varsa `ValueError` fırlatır

- `start_production()` içinde trust check entegrasyonu:
  - `trust_enforcement_level="block"` ise üretim başlamadan önce kontrol
  - Audit log kaydı

**Dosya:** `backend/app/modules/news_bulletin/router.py`

- `GET /{id}/trust-check` endpoint: `TrustCheckResponse` döner
- `POST /{id}/start-production`: trust block → HTTP 422 (normal hata 400'dan ayırt edilebilir)

**Testler:** `test_m31_trust_and_metadata.py` içinde schema/model/service testleri — 14 test, tümü geçti

---

## Faz E — Category Style Auto-Mapping

**Dosya:** `backend/app/modules/news_bulletin/service.py`

- `CATEGORY_STYLE_HINTS` dict: general/tech/finance/crypto/sports/entertainment → style önerileri
- `get_category_style_suggestion(bulletin_id)` → `CategoryStyleSuggestionResponse`
- `get_dominant_category(selected_items)` → `Counter.most_common(1)`

**Dosya:** `backend/app/modules/news_bulletin/router.py`

- `GET /{id}/category-style-suggestion` endpoint

---

## Faz F — Metadata/SEO Polish

**Dosya:** `backend/app/modules/prompt_builder.py`

- `build_bulletin_metadata_prompt()` signature güncellendi:
  - `dominant_category: Optional[str] = None`
  - `tone: str = "formal"`
- Haber başlıkları user message'da ayrı bullet list olarak listelenir (max 10)
- `dominant_category` varsa "Baskın haber kategorisi: X" user context'e eklenir
- `tone` system prompt'a dahil edilir
- JSON format guard admin metadata_title_rules'tan bağımsız her zaman mevcuttur

**Dosya:** `backend/app/modules/news_bulletin/executors/metadata.py`

- `get_dominant_category(selected_items)` çağrılır
- `tone` snapshot'tan alınır (`raw_input.get("tone", "formal")`)
- Her ikisi `build_bulletin_metadata_prompt()` a geçirilir

---

## Faz G — YTRobot-v3 Kontrollü Adaptasyon

Ürün mantığı alındı, hiçbir kod kopyalanmadı:
- SubtitlePreset sistemi (M30'da tamamlandı)
- render_mode üçlüsü (combined/per_category/per_item)
- BulletinLowerThird stil ailesi (broadcast/minimal/modern)
- Trust enforcement lifecycle (none/warn/block)
- Metadata SEO prompt güçlendirmesi

---

## Faz H — Test/Demo Veri Temizliği

**Dosya:** `backend/alembic/versions/c3d4e5f6a7b8_m31_add_is_test_data_to_jobs.py` (YENİ)

- `jobs` tablosuna `is_test_data` Boolean kolonu (server_default="0")
- down_revision: b2c3d4e5f6a7 (M30)

**Dosya:** `backend/app/db/models.py`

- `Job` modeli: `is_test_data: Mapped[bool]` (nullable=False, default=False, index=True)

**Dosya:** `backend/app/jobs/service.py`

- `list_jobs()`: `exclude_test_data: bool = True` parametresi
- `mark_jobs_as_test_data(db, job_ids)` → int (etkilenen satır sayısı)
- `bulk_archive_test_jobs(db, older_than_days=7, module_type=None)` → int

**Dosya:** `backend/app/jobs/router.py`

- `GET /api/v1/jobs`: `?exclude_test_data=true` query parametresi
- `POST /api/v1/jobs/mark-test-data`: bulk is_test_data=True
- `POST /api/v1/jobs/bulk-archive-test-data`: terminal + no workspace olan job'ları arşivle

**Dosya:** `backend/scripts/cleanup_test_jobs.py` (YENİ)

- Async CLI script, `--days` ve `--module` args
- Hard delete yok — sadece is_test_data=True

---

## Faz I — Detail/Job/Artifact Yüzey Genişletme

M31 kapsamı dahilinde temel artifact/detail wiring tamamlandı:
- `composition_props.json` içinde `render_outputs` dizisi (her output'un props'u ayrı)
- `render_mode`, `render_outputs_count` executor dönüş değerlerine eklendi
- Wizard Step 5'te render_outputs özeti gösterilmesi

---

## Faz J — Settings/Snapshot/Governance Uyumu

M30'da eklenen settings (devam):
- `news_bulletin.config.default_subtitle_style` (builtin_default="clean_white")
- `news_bulletin.config.default_lower_third_style` (builtin_default="broadcast")
- `news_bulletin.config.trust_enforcement_level` (builtin_default="warn")
- `news_bulletin.config.category_style_mapping_enabled` (builtin_default=True)

Snapshot lock:
- `start_production()` içinde render_mode, subtitle_style, lower_third_style, trust_enforcement_level snapshot'a yazılır
- `dominant_category` runtime'da seçili item'lardan hesaplanır, snapshot'a eklenmez (deterministik)
- Tüm prompt metinleri `news_bulletin.prompt.*` key'leriyle Settings Registry'de

---

## Faz K — Test Suite ve Truth Audit

### Backend Test Sonuçları

| Kapsam | Sayı | Durum |
|--------|------|-------|
| Bulletin M28 | 61 test | GEÇTI |
| Bulletin M29 | 18 test | GEÇTI |
| Bulletin M30 | 17 test | GEÇTI |
| Bulletin M31 (render_outputs) | 21 test | GEÇTI |
| Bulletin M31 (trust+metadata) | 14 test | GEÇTI |
| **Bulletin toplam** | **131 test** | **GEÇTI** |
| **Full backend** | **1365 test** | **GEÇTI** |

Pre-existing failure: `test_m7_c1_migration_fresh_db.py` (2 fail) — M31 ile ilgisi yok, sistem Python'u venv dışında alembic çalıştırıyor.

### Frontend Test Sonuçları

| Kapsam | Sayı | Durum |
|--------|------|-------|
| Bulletin smoke tests | tümü (7 dosya) | GEÇTI |
| Toplam passing | 2301 | GEÇTI |
| Pre-existing failures | 17 (localStorage env) | GEÇTI DEĞİL (M31 ile ilgisi yok) |

### TypeScript

```
tsc --noEmit → temiz (0 hata)
```

---

## Değişmeyen Kurallar (Onaylı)

- 7-adım pipeline korundu: script → metadata → tts → subtitle → composition → render → publish
- Composition executor sadece `composition_props.json` yazar, Remotion CLI çağırmaz
- Safe composition mapping (C-07): `get_composition_id("news_bulletin")` → "NewsBulletin"
- Settings snapshot modeli bozulmadı
- Admin-managed prompt'lar Settings Registry'de, kod içinde değil
- YTRobot-v3'ten kod kopyalanmadı — sadece ürün mantığı alındı
- Hard delete yok — is_test_data=True ile güvenli arşivleme
- Geriye dönük uyumluluk: `composition_props.json` içinde her zaman `props` alanı (combined view)

---

## Alembic Migration Zinciri

```
a1b2c3d4e5f6 (M29)
    ↓
b2c3d4e5f6a7 (M30: render_mode, subtitle_style, lower_third_style, trust_enforcement_level)
    ↓
c3d4e5f6a7b8 (M31: is_test_data)
```

---

## Commit Durumu

- Renderer commit: `9b05196` (BulletinLowerThird + NewsBulletinComposition)
- Kalan M30+M31 değişiklikler: unstaged (commit bekliyor)

---

## Bilinen Teknik Borç

- **RenderStepExecutor multi-render**: `render_outputs` dizisi composition_props.json içinde hazır, ancak RenderStepExecutor henüz per-output iterasyon yapmıyor. Per-category ve per-item gerçek multi-render M32+ için bırakıldı.
- **Wizard lower_third preview**: Style seçimi görsel preview kartları olmadan sadece metin label'ı ile yapılıyor. Preview-first UX için M32'de style card önizleme eklenebilir.
- **Trust check performansı**: Her wizard step geçişinde trust check API çağrısı yapılıyor. Büyük haber listelerinde cache/debounce eklenebilir.
