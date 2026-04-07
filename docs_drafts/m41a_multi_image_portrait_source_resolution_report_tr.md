# M41a — Multi-Image, Portrait Layout, Source Name Resolution, Format Picker

**Tarih:** 2026-04-08  
**Kapsam:** M41 polish gap closure — 4 ana alan  
**Durum:** Tamamlandı

---

## 1. Yapılan Değişiklikler

### 1.1 Multi-Image Haber Desteği (max 5 görsel)

| Dosya | Değişiklik |
|-------|-----------|
| `backend/app/source_scans/scan_engine.py` | `_extract_image_urls()` eklendi — media_content, media_thumbnail, enclosures, atom image kaynaklarından toplar; dedupe + max_count=5 |
| `backend/app/db/models.py` | `NewsItem.image_urls_json` (Text, nullable) eklendi |
| `backend/app/news_items/schemas.py` | Create/Update/Response'a `image_urls_json` eklendi |
| `backend/alembic/versions/a1a352449e66_...py` | Migration: `image_urls_json` kolonu |
| `backend/app/modules/news_bulletin/service.py` | items_snapshot'a `image_urls` listesi eklendi (JSON parse + tek image fallback) |
| `backend/app/modules/news_bulletin/executors/script.py` | Script post-processing'e `image_urls` aktarımı |
| `backend/app/modules/news_bulletin/executors/composition.py` | imageTimeline hesaplama: eşit süre bölme, max 5, son segment rounding absorb |
| `renderer/src/templates/news-bulletin/components/HeadlineCard.tsx` | Multi-image crossfade: `getSegmentOpacity()`, CROSSFADE_FRAMES=6 (~0.2s), sin-based geçiş |

**Davranış:** Haber başına max 5 görsel → her biri `item_duration / count` sn → crossfade ile geçiş.

### 1.2 9:16 Portrait Layout Optimizasyonu

| Bileşen | Portrait Değişiklik |
|---------|---------------------|
| `NewsBulletinComposition.tsx` | `isPortrait` algılama, NETWORK_BAR_HEIGHT 64→96, font 28→44 |
| `HeadlineCard.tsx` | headline 54→96px, narration 24→40px, subtitle 22→32px, maxWidth 900→1400, padding 40→80 |
| `NewsTicker.tsx` | height 48→64, font 20→28, badge 16→22, speed 3→4 |
| `CategoryFlash.tsx` | height 80→120, font 36→56, top 35%→38% |
| `BreakingNewsOverlay.tsx` | height 60→88, badge font 28→40, name font 22→34 |
| `BulletinLowerThird.tsx` | height 60→80, tüm 3 style (broadcast/minimal/modern) portrait-responsive |

**Davranış:** `renderFormat="portrait"` veya `height > width` durumunda tüm bileşenler portrait-optimized boyutlara geçer.

### 1.3 Source Name Resolution

| Dosya | Değişiklik |
|-------|-----------|
| `composition.py` | `resolve_source_domain_name()` + `_TLD_SUFFIXES` seti |
| `composition.py` | `_resolve_source_name_fallback()` — source_id'den DB lookup |
| `service.py` | items_snapshot'a `source_name` eklendi (DB name → domain fallback) |

**Algoritma:**
1. URL'den protocol, path, port strip
2. `www.` strip
3. En uzun eşleşen TLD suffix bul (`com.tr`, `co.uk`, `org.tr` vb.)
4. TLD'yi kaldır, kalan domain parçasını döndür
5. DB'de `NewsSource.name` varsa onu tercih et

**Örnekler:** `www.ntv.com.tr` → `ntv`, `www.bbc.com` → `bbc`, `www.reuters.com` → `reuters`

### 1.4 Format Picker & Karaoke Toggle

| Dosya | Değişiklik |
|-------|-----------|
| `backend/app/db/models.py` | `NewsBulletin.render_format`, `NewsBulletin.karaoke_enabled` |
| `backend/app/modules/news_bulletin/schemas.py` | Create/Update/Response'a her iki alan eklendi |
| `backend/alembic/versions/221401c433cc_...py` | Migration: render_format + karaoke_enabled |
| `backend/app/modules/news_bulletin/service.py` | Wizard seçimleri → settings snapshot override |
| `frontend/.../NewsBulletinWizardPage.tsx` | Format picker (16:9/9:16 kart seçici) + karaoke toggle |
| `frontend/.../ContentCreationWizard.tsx` | WizardValues: render_format + karaoke_enabled, review step |
| `frontend/.../StandardVideoWizardPage.tsx` | API payload: render_format + karaoke_enabled |
| `frontend/src/api/newsBulletinApi.ts` | UpdatePayload'a render_format + karaoke_enabled |

### 1.5 Lower-Third Düzeltmesi

`BulletinLowerThird.tsx`: `bottom: 0` → `bottom: tickerH` (landscape=64px, portrait=48px). Lower-third artık ticker'ın üstünde, arkasında değil.

### 1.6 Whisper / Provider Fix

| Dosya | Değişiklik |
|-------|-----------|
| `backend/app/analytics/service.py` | `PROVIDER_STEP_KEYS`'e `"subtitle"` eklendi |
| `backend/app/providers/router.py` | Test endpoint'e faster-whisper import kontrolü |
| pip | `faster-whisper==1.2.1` kuruldu |

---

## 2. Geriye Uyumluluk

| Kural | Durum |
|-------|-------|
| karaoke default-on | ✅ `builtin_default: True` (both modules) |
| show_date default-on | ✅ `builtin_default: True` |
| show_source default-off | ✅ `builtin_default: False` |
| 16:9 mevcut davranış | ✅ render_format nullable, fallback landscape |
| Tek görselli haberler | ✅ imageTimeline 1 segment = eski davranış |

---

## 3. Test Sonuçları

### M41a Dedike Testler (18/18 geçti)

| # | Test | Sonuç |
|---|------|-------|
| 1 | `_extract_image_urls` tek görsel | ✅ |
| 2 | `_extract_image_urls` çoklu media_content | ✅ |
| 3 | `_extract_image_urls` max 5 sınırı | ✅ |
| 4 | `_extract_image_urls` dedupe | ✅ |
| 5 | `resolve_source_domain_name` ntv | ✅ |
| 6 | `resolve_source_domain_name` bbc | ✅ |
| 7 | `resolve_source_domain_name` reuters | ✅ |
| 8 | `resolve_source_domain_name` some-site | ✅ |
| 9 | `resolve_source_domain_name` full URL | ✅ |
| 10 | `resolve_source_domain_name` boş/None | ✅ |
| 11 | imageTimeline 1 görsel 20sn | ✅ |
| 12 | imageTimeline 4 görsel 20sn | ✅ |
| 13 | imageTimeline 5 görsel 20sn | ✅ |
| 14 | imageTimeline 7 görsel → max 5 | ✅ |
| 15 | karaoke default-on regression | ✅ |
| 16 | show_date default-on regression | ✅ |
| 17 | show_source default-off regression | ✅ |
| 18 | normalize_entry image_urls_json | ✅ |

### Genel Backend (1504 passed)

- **Başarılı:** 1504
- **Başarısız:** 14 (tamamı pre-existing — RSS network, M7 fresh DB, dedupe)
- **M41a kaynaklı regresyon:** 0

### TypeScript

- **renderer:** ✅ sıfır hata
- **frontend:** ✅ sıfır hata

---

## 4. Alembic Migrations

| Revision | Açıklama |
|----------|----------|
| `a1a352449e66` | `news_items.image_urls_json` (Text, nullable) |
| `221401c433cc` | `news_bulletins.render_format` (String(20)), `news_bulletins.karaoke_enabled` (Boolean) |

Her ikisi de uygulandı, clean up/down.

---

## 5. Kapsam Dışı Bırakılanlar

- Branding studio, analytics, publish, multi-user → kapsam dışı (M41a sadece polish)
- Semantic dedupe → gelecek milestone
- Preview artifact render → gelecek milestone
- Multi-image için thumbnail otomasyonu → gelecek milestone

---

## 6. Bilinen Teknik Borç

- RSS scan testleri network-dependent (example.com 404) — mock'a geçirilmeli
- M7 fresh DB migration testleri güncellenmeli
- Portrait layout sadece kod-bazlı test edildi; görsel QA yapılmalı
- Crossfade CROSSFADE_FRAMES=6 sabit — Settings Registry'ye taşınabilir
