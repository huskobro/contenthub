# M29 — News Bulletin Wizard & Product Surface Report

## 1. Executive Summary

M29, M28'de backend'de calisan News Bulletin combined pipeline'ini gercek urun yuzeyine tasir. Bu milestone sonunda:
- 3 adimli bulletin wizard UI (kaynak secimi → draft review → stil & uretim)
- Inline narration edit (edited_narration backend'e wired)
- Formal editorial gate lifecycle UI (draft → selection_confirmed → in_progress)
- composition_direction ve thumbnail_direction gercek backend wiring
- Bulletin detail page (job linkage, style secimleri, script, metadata)
- Mevcut publish pattern'ine basariyla baglandi (ozel bulletin publish yuzeyi henuz yok)
- M28 pipeline'i BOZULMADAN tum entegrasyon (33/33 M28 regression test pass)

## 2. M29 Scope

| Alan | Dahil |
|---|---|
| Bulletin Wizard UI (3 adim) | ✅ |
| Inline narration edit | ✅ |
| Editorial gate UI | ✅ |
| composition_direction backend wiring | ✅ |
| thumbnail_direction backend wiring | ✅ |
| template_id / style_blueprint_id wiring | ✅ |
| Bulletin Detail Page | ✅ |
| Alembic migration (4 yeni alan) | ✅ |
| Delete selected item endpoint | ✅ |
| Frontend API genisletmeleri | ✅ |
| Mevcut ContentCreationWizard'da direction kartlari | ✅ |
| Backend testler (28 yeni) | ✅ |
| Frontend smoke test uyumlulugu | ✅ |

## 3. Scope Disi Alanlar

| Alan | Neden | Hedef |
|---|---|---|
| Per-item render mode | Combined once stabil olmali | M30 |
| Trust level enforcement | Style mapping sonrasi | M30 |
| Metadata/SEO ileri polish | Temel metadata mevcut | M30 |
| Category → style auto mapping | Style blueprint resolver icin ek is | M30 |
| Prompt preset sistemi | M29'da gereksiz, CLAUDE.md kurali | M30+ |
| YTRobot v3 Remotion taslaklari | Pipeline stabil olmadan entegre edilemez | M30 |
| Publish center UI genisletmesi | Mevcut pattern yeterli | M30 |

## 4. Mimari Kararlar

### 4.1 Ayri Bulletin Wizard
Mevcut ContentCreationWizard generic bir 4-adim wizard. Bulletin akisi farkli (kaynak secimi → editorial review → stil), bu yuzden `NewsBulletinWizardPage` tamamen ayri bir 3-adim wizard olarak yazildi. Generic wizard'a bulletin'e ozgu logic eklemek complexity artirirdi.

### 4.2 Direction Alanlari DB'ye Eklendi
composition_direction ve thumbnail_direction artik `news_bulletins` tablosunda gercek kolonlar. Wizard'dan secilen deger backend'e yaziliyor, start_production snapshot'ina ekleniyor. Kozmetik olmaktan cikti.

### 4.3 Editorial Gate UI Pattern
Gate lifecycle UI'si wizard Step 1'de embedded. Kullanici secim yapar → narration duzenler → "Secimi Onayla" (confirm_selection) → "Haberleri Tuket & Uretim Hazirla" (consume_news) → Step 2'ye gecis. Gate gecilmeden production baslatilamaz.

### 4.4 Resume Destegi
Wizard `?bulletinId=xxx` query param ile mevcut bir bulletin'e devam edebilir. Bulletin'in status'una gore dogru adima otomatik yonlendirir.

### 4.5 Delete Guard
Secili haber silme sadece "draft" durumundaki bulletinlerde mumkun. Router'da guard var.

## 5. Backend Degisiklikleri

### 5.1 DB Model (models.py)
NewsBulletin modeline 4 yeni alan:
- `composition_direction: String(50), nullable`
- `thumbnail_direction: String(50), nullable`
- `template_id: String(36), nullable`
- `style_blueprint_id: String(36), nullable`

### 5.2 Alembic Migration
`a1b2c3d4e5f6_m29_add_direction_fields_to_bulletin.py`
down_revision: 5c6754cd1d40 (M28)

### 5.3 Schemas (schemas.py)
NewsBulletinCreate, Update, Response'a 4 yeni alan eklendi.

### 5.4 Service (service.py)
- `create_news_bulletin()` — yeni alanlari DB'ye yaziyor
- `start_production()` — snapshot'a direction/template/blueprint ekleniyor
- `delete_bulletin_selected_item()` — yeni fonksiyon

### 5.5 Router (router.py)
- `DELETE /{id}/selected-news/{selection_id}` — yeni endpoint, draft guard

## 6. Frontend Degisiklikleri

### 6.1 Yeni Sayfalar
- `NewsBulletinWizardPage.tsx` — 3 adimli wizard
- `NewsBulletinDetailPage.tsx` — bulletin detay sayfasi

### 6.2 Degistirilen Dosyalar
- `router.tsx` — wizard ve detail route'lari
- `newsBulletinApi.ts` — direction alanlari, editorial gate API'lari, delete, clone, start-production
- `NewsBulletinRegistryPage.tsx` — wizard butonu
- `ContentCreationWizard.tsx` — direction kartlari her iki modul icin gorunur
- 7 smoke test dosyasi — yeni alan uyumlulugu

## 7. Wizard Akis Tasarimi

```
Step 0: Kaynak & Haber Secimi
├── Bulletin olustur (topic, dil, ton, sure)
├── Selectable news listele (status='new')
├── Haber sec / kaldir
└── "Devam" → Step 1

Step 1: Draft Review & Narration Edit
├── Secili haberleri goruntule
├── Her haber icin inline narration duzenleme
├── "Secimi Onayla" → confirm_selection (draft → selection_confirmed)
├── "Haberleri Tuket" → consume_news (selection_confirmed → in_progress)
└── Gate gecilince "Devam" → Step 2

Step 2: Stil & Uretim
├── StyleBlueprintSelector
├── CompositionDirectionPreview (classic/side_by_side/fullscreen/dynamic)
├── ThumbnailDirectionPreview (text_heavy/image_heavy/split/minimal)
├── TemplateSelector
├── Uretim ozeti
└── "Uretimi Baslat" → updateBulletin + startProduction → redirect to job detail
```

## 8. Editorial Gate Modeli

```
draft ──[confirm_selection]──→ selection_confirmed ──[consume_news]──→ in_progress ──[start_production]──→ rendering ──[job done]──→ done
                                                                                                          └──[job fail]──→ failed
```

Kurallar:
- confirm_selection: en az 1 secili haber, bulletin.status = 'draft'
- consume_news: bulletin.status = 'selection_confirmed', UsedNewsRegistry yazilir, NewsItem.status = 'used'
- start_production: bulletin.status = 'in_progress', snapshot alinir, job olusturulur
- Gate olmadan production baslatilamaz
- Narration duzenleme sadece 'draft' durumunda mumkun

## 9. Style Mapping ve Preview Entegrasyonu

### 9.1 Direction Wiring
- composition_direction: wizard → backend → DB → start_production snapshot
- thumbnail_direction: wizard → backend → DB → start_production snapshot
- template_id: wizard → backend → DB → start_production snapshot
- style_blueprint_id: wizard → backend → DB → start_production snapshot

### 9.2 Preview Bilesenleri
CompositionDirectionPreview ve ThumbnailDirectionPreview bulletin wizard'da gercek alanlarla wire edildi:
- Secim yapildiginda state guncellenir
- Step 2 submit'te backend'e kaydedilir
- start_production snapshot'ina dahil edilir

### 9.3 Category → Style Auto Mapping
M29 scope disinda. Mevcut StyleBlueprintSelector ve TemplateSelector ile manuel secim destekleniyor.

## 10. Publish Handoff Modeli

Mevcut publish pattern'ine basariyla baglandi — ozel bulletin publish yuzeyi henuz yok:
- PublishStepExecutor (M28'den) pipeline'in 7. adimi olarak calisiyor
- PublishRecord olusturma ve platform upload mantigi degismedi
- Bulletin job tamamlandiginda PublishStepExecutor tetiklenir
- BulletinDetailPage'de job linkage gorunur
- NOT: Bulletin'e ozel publish center UI genisletmesi M30 adayi

## 11. Test Stratejisi

| Kategori | Test Sayisi | Sonuc |
|---|---|---|
| M28 bulletin testleri (regression) | 33 | ✅ Pass |
| M29 direction wiring | 9 | ✅ Pass |
| M29 editorial gate lifecycle | 12 | ✅ Pass |
| M29 migration | 7 | ✅ Pass |
| Toplam bulletin testleri | 61 | ✅ Pass |
| Tam backend suite | 1267 | ✅ Pass |
| Frontend TypeScript | 0 hata | ✅ Clean |
| Renderer TypeScript | 0 hata | ✅ Clean |

## 12. Test Sonuclari

```
Backend:  1267 passed, 0 failed (test_m7_c1_migration_fresh_db.py pre-existing, excluded)
Bulletin: 61 passed, 0 failed
Frontend: tsc --noEmit → 0 errors
Renderer: tsc --noEmit → 0 errors
```

## 13. Truth Audit

| Kontrol | Sonuc |
|---|---|
| M28 pipeline bozulmadi | ✅ 33/33 M28 test pass, 1267/1267 full suite |
| Standard video bozulmadi | ✅ Regression clean (full suite pass) |
| Settings registry korundu | ✅ Prompt keys intact |
| Snapshot modeli korundu | ✅ Direction alanlari snapshot'a eklendi |
| Safe composition mapping korundu | ✅ Drift test pass |
| Used news / dedupe korundu | ✅ consume_news semantigi ayni |
| Publish center korundu | ✅ Pattern degismedi |
| Audit log korundu | ✅ start_production audit intact |
| Visibility guard korundu | ✅ Router dependencies intact |

## 14. Bilinen Limitasyonlar ve Devir Notlari

### 14.1 Category → Style Auto Mapping Yok
Kategori bazinda otomatik style blueprint eslemesi henuz yok. Manuel secim destekleniyor. M30 adayi.

### 14.2 Subtitle/Lower-third Preview Yok
Bulletin wizard'da subtitle ve lower-third preview bilesenleri henuz entegre degil. M30 adayi.

### 14.3 Publish Center UI Genisletmesi Yok
Mevcut PublishCenterPage ve PublishDetailPage bulletin icin yeterli. Ozel bulletin publish yuzeyi M30 adayi.

### 14.4 Wizard'da Haber Basligi Gosterimi
Secili haberler news_item_id ile gosteriliyor, title endpoint'ten cekilebilir ancak wizard'da ek query gerektirir. Iyilestirme adayi.

### 14.5 _watch_bulletin_job Polling
M28'den devir: polling mekanizmasi, callback/event tabanlı cozum M30+ adayi.

### 14.6 test_m7_c1_migration_fresh_db.py Pre-Existing
System python3 kullanma sorunu devam ediyor. M28'den bilinen, M29 scope disinda.

### 14.7 YTRobot v3 Entegrasyonu Bekliyor
Haber bulteni Remotion taslaklari ve stil kurallari entegrasyonu M30'da planli.

## 15. Dosya Listesi

### 15.1 Yeni Dosyalar

| # | Dosya | Amac |
|---|---|---|
| 1 | `frontend/src/pages/admin/NewsBulletinWizardPage.tsx` | 3 adimli bulletin wizard |
| 2 | `frontend/src/pages/admin/NewsBulletinDetailPage.tsx` | Bulletin detay sayfasi |
| 3 | `backend/alembic/versions/a1b2c3d4e5f6_m29_add_direction_fields_to_bulletin.py` | Alembic migration |
| 4 | `backend/tests/modules/news_bulletin/test_m29_direction_wiring.py` | Direction wiring testleri |
| 5 | `backend/tests/modules/news_bulletin/test_m29_editorial_gate.py` | Editorial gate lifecycle testleri |
| 6 | `backend/tests/modules/news_bulletin/test_m29_migration.py` | Migration testleri |

### 15.2 Degistirilen Dosyalar

| # | Dosya | Degisiklik |
|---|---|---|
| 1 | `backend/app/db/models.py` | NewsBulletin'e 4 yeni alan |
| 2 | `backend/app/modules/news_bulletin/schemas.py` | Create/Update/Response'a 4 alan |
| 3 | `backend/app/modules/news_bulletin/service.py` | create + start_production + delete |
| 4 | `backend/app/modules/news_bulletin/router.py` | DELETE endpoint |
| 5 | `frontend/src/api/newsBulletinApi.ts` | Direction alanlari, gate API'lari, delete, clone |
| 6 | `frontend/src/app/router.tsx` | Wizard + detail route'lari |
| 7 | `frontend/src/pages/admin/NewsBulletinRegistryPage.tsx` | Wizard butonu |
| 8 | `frontend/src/components/wizard/ContentCreationWizard.tsx` | Direction kartlari her iki modul icin |
| 9 | `docs_drafts/m28_master_plan_tr.md` | M29 limitasyonlar + devir notlari (onceki oturumda) |
| 10-16 | Frontend smoke test dosyalari (7 adet) | Yeni alan uyumlulugu |
