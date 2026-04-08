# M30 — Render Mode, Subtitle/Lower-Third, Trust Enforcement & Category Style Mapping Report

## 1. Executive Summary

M30, M28/M29 pipeline'inin uzerine stil, guvenilirlik ve kategori bazli akilli oneriler ekler. Bu milestone sonunda:
- 4 yeni DB kolonu (render_mode, subtitle_style, lower_third_style, trust_enforcement_level)
- Alembic migration (b2c3d4e5f6a7, down_revision=M29)
- Composition executor'da subtitle preset entegrasyonu (hardcoded → resolver)
- Kaynak guvenilirlik kontrolu (trust enforcement): none/warn/block
- Kategori → stil otomatik oneri sistemi (6 kategori, fallback: general)
- Baskin kategori tespiti (dominant category)
- 2 yeni REST endpoint (trust-check, category-style-suggestion)
- 4 yeni settings key (Settings Registry governance)
- start_production snapshot'ina M30 alanlari dahil
- clone_news_bulletin M30 alanlarini kopyalar
- Frontend API type'lari genisletildi (4 yeni alan, 2 yeni endpoint)
- M28/M29 pipeline BOZULMADAN tum entegrasyon (96/96 bulletin test, 1330/1330 full suite)

## 2. M30 Scope

| Alan | Dahil |
|---|---|
| render_mode DB kolonu + schema + service | ✅ |
| subtitle_style DB kolonu + preset resolver | ✅ |
| lower_third_style DB kolonu + schema | ✅ |
| trust_enforcement_level DB + service + endpoint | ✅ |
| Category → style auto mapping (6 kategori) | ✅ |
| Dominant category tespiti | ✅ |
| Composition executor subtitle preset integration | ✅ |
| start_production snapshot M30 alanlari | ✅ |
| clone bulletin M30 alanlari | ✅ |
| list_bulletins_with_artifacts M30 alanlari | ✅ |
| Settings Registry governance (4 yeni key) | ✅ |
| Alembic migration | ✅ |
| REST endpoints (trust-check, category-style-suggestion) | ✅ |
| Frontend API type genisletmeleri | ✅ |
| Backend testler (35 yeni M30) | ✅ |
| Frontend TypeScript clean | ✅ |
| Renderer TypeScript clean | ✅ |

## 3. Scope Disi Alanlar

| Alan | Neden | Hedef |
|---|---|---|
| Per-item render mode (multi-output) | Composition/render executor coklu cikti destegi gerektirir | M31 |
| Per-category render mode (multi-output) | Remotion coklu composition ciktisi kurulmali | M31 |
| Wizard UI render mode/subtitle/trust picker | Backend wiring tamamlandi, UI M31'de | M31 |
| YTRobot v3 Remotion sablonlari | Stil kurallari entegrasyonu icin ek Remotion calismasi gerekli | M31 |
| Metadata/SEO prompt improvements | Mevcut prompt yeterli, gelismis SEO M31+ | M31+ |
| Lower-third Remotion component | Component henuz yok, stil alani DB'de hazir | M31 |

## 4. Mimari Kararlar

### 4.1 Subtitle Preset Resolver Entegrasyonu
Composition executor'daki hardcoded subtitle style ({preset_id: "default", fontSize: 36, ...}) kaldirildi.
Yerine `get_preset_for_composition(snapshot_subtitle_style)` kullaniliyor.
Bu fonksiyon:
- Bilinen preset ID → o preset'in tam stil sozlugunu doner
- None veya bilinmeyen ID → clean_white varsayilani (boundary fallback, CLAUDE.md uyumlu)

### 4.2 Trust Enforcement Modeli
3 seviye: none (kontrol yok), warn (uyari, uretimi engellemez), block (dusuk guvenilirlik varsa engelle).
Trust kontrolu editorial gate'den sonra, start_production'dan once cagrilabilir.
Varsayilan seviye: "warn" — konservatif ama engelleyici degil.

### 4.3 Category → Style Mapping
Kontrollü mapping — CATEGORY_STYLE_HINTS sozlugunde 6 kategori tanimli.
Bilinmeyen kategori → "general" fallback.
Bu bir oneri sistemi, zorunlu esleme degil.
Wizard'da dominant category'ye gore stil onerilir, kullanici degistirebilir.

### 4.4 Dominant Category
Secili haberlerin en sik kategorisi Counter.most_common(1) ile hesaplanir.
None veya kategori bilgisi olmayan haberler filtrelenir.
Esit sayida birden fazla kategori varsa ilk karsilasilan doner.

### 4.5 Settings Governance
M30 ile 4 yeni settings key eklendi — tumu:
- group: news_bulletin
- module_scope: news_bulletin
- wired: True
- builtin_default mevcut
- validation rule tanimli

## 5. Backend Degisiklikleri

### 5.1 DB Model (models.py)
NewsBulletin modeline 4 yeni alan (M30):
- `render_mode: String(30), nullable, default="combined"`
- `subtitle_style: String(50), nullable`
- `lower_third_style: String(50), nullable`
- `trust_enforcement_level: String(20), nullable, default="warn"`

### 5.2 Alembic Migration
`b2c3d4e5f6a7_m30_add_render_mode_subtitle_trust.py`
down_revision: a1b2c3d4e5f6 (M29)

### 5.3 Schemas (schemas.py)
NewsBulletinCreate, Update, Response'a 4 yeni alan eklendi.
Create: render_mode default="combined", trust_enforcement_level default="warn"
Response: ayni default'lar

### 5.4 Service (service.py)
- `create_news_bulletin()` — M30 alanlarini DB'ye yaziyor
- `clone_news_bulletin()` — M30 alanlarini kopyaliyor
- `start_production()` — snapshot'a render_mode, subtitle_style, lower_third_style, trust_enforcement_level eklendi
- `list_news_bulletins_with_artifacts()` — response'a M30 alanlari eklendi
- `check_trust_enforcement()` — yeni fonksiyon: kaynak guvenilirlik kontrolu
- `get_category_style_suggestion()` — yeni fonksiyon: kategori bazli stil onerisi
- `get_dominant_category()` — yeni fonksiyon: baskin kategori tespiti
- `CATEGORY_STYLE_HINTS` — kontrollü mapping sozlugu

### 5.5 Router (router.py)
- `GET /{id}/trust-check` — kaynak guvenilirlik kontrolu
- `GET /{id}/category-style-suggestion` — kategori bazli stil onerisi

### 5.6 Composition Executor (executors/composition.py)
- Hardcoded subtitleStyle → `get_preset_for_composition()` ile resolve
- lowerThirdStyle ve renderMode snapshot'tan okunarak composition_props'a yaziliyor

### 5.7 Settings Resolver (settings_resolver.py)
4 yeni KNOWN_SETTINGS key:
- `news_bulletin.config.default_subtitle_style` (clean_white)
- `news_bulletin.config.default_lower_third_style` (broadcast)
- `news_bulletin.config.trust_enforcement_level` (warn)
- `news_bulletin.config.category_style_mapping_enabled` (True)

Validation rules eklendi.

## 6. Frontend Degisiklikleri

### 6.1 API Types (newsBulletinApi.ts)
- NewsBulletinResponse: +4 alan (render_mode, subtitle_style, lower_third_style, trust_enforcement_level)
- NewsBulletinCreatePayload: +4 alan
- NewsBulletinUpdatePayload: +4 alan
- TrustCheckResponse: yeni interface
- CategoryStyleSuggestionResponse: yeni interface
- fetchTrustCheck(): yeni fonksiyon
- fetchCategoryStyleSuggestion(): yeni fonksiyon

### 6.2 Smoke Tests
M30 alanlari (render_mode, subtitle_style, lower_third_style, trust_enforcement_level) mock objelere eklendi.

## 7. Trust Enforcement Akisi

```
Kullanici secim yapar → editorial gate → trust check (GET /trust-check)
                                            ├── enforcement=none → pass (kontrol yok)
                                            ├── enforcement=warn → pass + uyari listesi
                                            └── enforcement=block + low trust → BLOK (pass=false)
```

Low trust tespiti: NewsItem.source_id → NewsSource.trust_level == "low"

## 8. Category → Style Mapping Akisi

```
Secili haberler → GET /category-style-suggestion
                   ├── Dominant category hesapla (Counter.most_common)
                   ├── CATEGORY_STYLE_HINTS'ten oneri al
                   └── Bilinmeyen/yok → "general" fallback
```

Mapping sozlugu:
| Kategori | Subtitle | Lower-Third | Composition |
|---|---|---|---|
| general | clean_white | broadcast | classic |
| tech | gradient_glow | modern | dynamic |
| finance | minimal_dark | broadcast | side_by_side |
| crypto | gradient_glow | modern | dynamic |
| sports | bold_yellow | modern | fullscreen |
| entertainment | bold_yellow | minimal | dynamic |

## 9. Test Stratejisi

| Kategori | Test Sayisi | Sonuc |
|---|---|---|
| M28 bulletin testleri (regression) | 33 | ✅ Pass |
| M29 direction/gate/migration | 28 | ✅ Pass |
| M30 render/trust/category | 15 | ✅ Pass |
| M30 migration | 9 | ✅ Pass |
| M30 settings | 11 | ✅ Pass |
| Toplam bulletin testleri | 96 | ✅ Pass |
| Tam backend suite | 1330 | ✅ Pass |
| Frontend TypeScript | 0 hata | ✅ Clean |
| Renderer TypeScript | 0 hata | ✅ Clean |

## 10. Test Sonuclari

```
Backend:  1330 passed, 0 failed (test_m7_c1_migration_fresh_db.py pre-existing, excluded)
Bulletin: 96 passed, 0 failed
Frontend: tsc --noEmit → 0 errors
Renderer: tsc --noEmit → 0 errors
```

## 11. Truth Audit

| Kontrol | Sonuc |
|---|---|
| M28 pipeline bozulmadi | ✅ 33/33 M28 test pass, 1330/1330 full suite |
| M29 direction/gate bozulmadi | ✅ 28/28 M29 test pass |
| Standard video bozulmadi | ✅ Regression clean |
| Settings registry korundu | ✅ M28 keys intact (12/12) |
| Snapshot modeli korundu | ✅ M30 alanlari snapshot'a eklendi |
| Safe composition mapping korundu | ✅ Drift test pass |
| Subtitle preset resolver calisir | ✅ Hardcoded → get_preset_for_composition |
| Used news / dedupe korundu | ✅ Semantik degismedi |
| Publish center korundu | ✅ Pattern degismedi |
| Audit log korundu | ✅ start_production audit intact |

## 12. Bilinen Limitasyonlar ve Devir Notlari

### 12.1 Per-Category / Per-Item Multi-Output Henuz Yok
render_mode DB'de ve snapshot'ta tasinir ama composition/render executor'lar henuz sadece "combined" modunda calisir. Per-category ve per-item coklu cikti uretimi icin executor zincirine dallanma mantigi eklenmelidir. M31 adayi.

### 12.2 Lower-Third Remotion Component Yok
lower_third_style alani DB'den composition_props'a akmaktadir, ancak Remotion tarafinda lower-third component henuz yazilmamistir. M31 adayi.

### 12.3 Wizard UI Picker'lari Yok
render_mode, subtitle_style, lower_third_style, trust_enforcement_level icin wizard'da picker bilesenler henuz eklenmedi. Backend wiring tamamlandi. M31 adayi.

### 12.4 YTRobot v3 Remotion Entegrasyonu Bekliyor
Haber bulteni Remotion sablonlari ve stil kurallari entegrasyonu M31'de planli.

### 12.5 test_m7_c1_migration_fresh_db.py Pre-Existing
System python3 kullanma sorunu devam ediyor. M28'den bilinen, M30 scope disinda.

## 13. Dosya Listesi

### 13.1 Yeni Dosyalar

| # | Dosya | Amac |
|---|---|---|
| 1 | `backend/alembic/versions/b2c3d4e5f6a7_m30_add_render_mode_subtitle_trust.py` | Alembic migration |
| 2 | `backend/tests/modules/news_bulletin/test_m30_render_and_trust.py` | Render/trust/category testleri |
| 3 | `backend/tests/modules/news_bulletin/test_m30_migration.py` | Migration testleri |
| 4 | `backend/tests/modules/news_bulletin/test_m30_settings.py` | Settings governance testleri |
| 5 | `docs_drafts/m30_master_report_tr.md` | Bu rapor |

### 13.2 Degistirilen Dosyalar

| # | Dosya | Degisiklik |
|---|---|---|
| 1 | `backend/app/db/models.py` | NewsBulletin'e 4 yeni M30 alan |
| 2 | `backend/app/modules/news_bulletin/schemas.py` | Create/Update/Response'a 4 alan |
| 3 | `backend/app/modules/news_bulletin/service.py` | create/clone/start_production/list M30 alanlari + trust + category |
| 4 | `backend/app/modules/news_bulletin/router.py` | trust-check + category-style-suggestion endpoint'leri |
| 5 | `backend/app/modules/news_bulletin/executors/composition.py` | Subtitle preset resolver, lowerThirdStyle, renderMode |
| 6 | `backend/app/settings/settings_resolver.py` | 4 yeni M30 settings key + validation rules |
| 7 | `frontend/src/api/newsBulletinApi.ts` | M30 alanlari + trustCheck + categoryStyleSuggestion |
| 8+ | Frontend smoke test dosyalari | M30 alanlari mock objelere eklendi |
