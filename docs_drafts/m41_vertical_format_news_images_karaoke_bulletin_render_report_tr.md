# M41: Dikey Format, Haber Görselleri, Karaoke ve Bülten Render İyileştirmeleri

**Tarih:** 2026-04-08
**Kapsam:** 9:16 format, haber görselleri, karaoke toggle, breaking overlay fix, tarih/kaynak gösterimi

---

## 1. Executive Summary

M41 fazında production-ready altı temel iyileştirme yapıldı:
- **9:16 dikey format**: Hem standard_video hem news_bulletin için tam destek
- **Haber görselleri**: RSS'ten otomatik çekim, composition timeline'a ekleme, renderer'da gösterim
- **Karaoke toggle**: Resmi KNOWN_SETTINGS ayarı, varsayılan açık, kapatılabilir
- **Breaking overlay fix**: Frame 60-80 çift gösterim sorunu giderildi
- **Tarih/kaynak gösterimi**: Admin ayarlı, lower-third'e entegre
- **6 yeni KNOWN_SETTINGS**: Tümü wired, admin panelden yönetilebilir

---

## 2. Current State Audit Sonucu

| Özellik | Audit Öncesi | Audit Sonrası |
|---------|-------------|---------------|
| 9:16 format | Settings'te tanımlı ama wired=False, Root.tsx hardcoded 1920×1080 | Tam destek, calculateMetadata dinamik |
| Haber görselleri | imagePath prop tanımlı ama backend None gönderiyordu | Model, scan, composition, renderer tam zincir |
| Karaoke | Renderer'da tam implement ama toggle ayarı yoktu | KNOWN_SETTINGS toggle, default=true |
| Breaking overlay | Frame 20-80, HeadlineCard ile 60-80 overlap | Frame 20-60, başlık kartıyla senkron bitiş |
| Tarih/kaynak | Backend'de alanlar var, renderer'a taşınmıyordu | Tam zincir, admin ayarlı |

---

## 3. 9:16 Desteği

### Yaklaşım
Remotion `calculateMetadata`'da width/height dinamik döndürülebilir. Props'a `renderFormat` eklendi.

### Akış
```
KNOWN_SETTINGS (standard_video.config.render_format / news_bulletin.config.render_format)
  → Job create snapshot'a eklenir
  → CompositionExecutor props'a "renderFormat" yazar
  → Root.tsx calculateMetadata: portrait → 1080×1920, landscape → 1920×1080
```

### Değişen katmanlar
- `settings_resolver.py`: 2 yeni settings (wired=True)
- `standard_video/executors/composition.py`: renderFormat props'a eklendi
- `news_bulletin/executors/composition.py`: renderFormat props'a eklendi
- `Root.tsx`: calculateMetadata'da width/height dinamik
- `StandardVideoComposition.tsx`: renderFormat prop tipi
- `NewsBulletinComposition.tsx`: renderFormat prop tipi

---

## 4. Standard Video Tarafında Değişiklikler

- `StandardVideoProps`'a `renderFormat?: "landscape" | "portrait"` eklendi
- `CompositionStepExecutor`: settings snapshot'tan `standard_video.config.render_format` okunup composition_props'a ekleniyor
- `Root.tsx`: calculateMetadata'da isPortrait kontrolü → 1080×1920 / 1920×1080
- Karaoke toggle: `standard_video.config.karaoke_enabled` → kapalıysa timing_mode "cursor"a düşer

---

## 5. News Bulletin Tarafında Değişiklikler

- `BulletinItemProps`'a `imageTimeline`, `publishedAt`, `sourceId` eklendi
- `NewsBulletinProps`'a `renderFormat`, `showDate`, `showSource` eklendi
- Composition executor: image timeline hesaplama, show_date/show_source ayar okuma
- Script executor: selected_items'tan image_url/published_at/source_id script items'a ekleniyor
- HeadlineCard: arka plan görseli + gradient overlay
- BulletinLowerThird: tarih ve kaynak gösterimi
- Breaking overlay: timing fix (frame 20-60)

---

## 6. News Image Timeline Mantığı

### Veri akışı
```
NewsItem.image_url (DB) → selected_items snapshot → bulletin_script.json items
  → BulletinCompositionExecutor → imageTimeline prop → HeadlineCard renderer
```

### Timeline hesaplaması
```python
# Tek görsel: tüm süre boyunca
imageTimeline = [{
    "url": image_url,
    "startSeconds": 0,
    "durationSeconds": item_duration
}]
```

### Renderer davranışı
- `currentTimeSec = frame / fps`
- Timeline segmentleri üzerinde dönerek aktif görseli bulur
- Fallback: son segment
- Image yoksa: mevcut davranış korunur (StudioBackground)
- Image: `opacity: 0.35, blur(2px)` arka plan + gradient overlay

### Gelecek: Çoklu görsel
- `imageTimeline` array yapısı birden fazla görseli destekler
- Şu an tek image_url → tek segment
- Birden fazla görsel geldiğinde süre eşit bölünecek (max 5)

---

## 7. Karaoke Sistemi

### Mevcut durum (M6-C2'den beri)
- Whisper word-level timing tam implement
- KaraokeSubtitle component: whisper_word/whisper_segment/cursor modları
- subtitle-renderer.tsx: renderSubtitleWords() kelime bazlı highlight

### M41 eklentisi
- `standard_video.config.karaoke_enabled` (boolean, default=true)
- `news_bulletin.config.karaoke_enabled` (boolean, default=true)
- Kapalıysa: composition executor timing_mode'u "cursor"a düşürür
- Açıkken: mevcut whisper_word/whisper_segment timing korunur

---

## 8. YTRobot-v3 Taramasından Uyarlananlar

| İlham | Kaynak | ContentHub Uyarlama |
|-------|--------|---------------------|
| Kategori bazlı stil sistemi | YTRobot-v3 stil haritası | Zaten M33'te uyarlanmıştı, korundu |
| Haber görseli arka plan | Broadcast TV pattern | opacity+blur+gradient overlay yaklaşımı |
| Breaking overlay timing | TV broadcast intro pattern | 1.33s overlay → başlık kartı ile senkron bitiş |
| Tarih/kaynak lower-third | TV info bar | BulletinLowerThird'a category ile aynı satırda |

**Alınmayanlar:** Template port, prop contract taşıma, birebir component kopyalama, 9:16 layout tam kopyalama.

---

## 9. Breaking News Overlay Bug Çözümü

### Root Cause
- BreakingNewsOverlay: `from={20}, durationInFrames={60}` → aktif frame: 20-80
- Başlık kartı: `from={0}, durationInFrames=HEADLINES_START(60)` → aktif frame: 0-60
- Frame 60-80: Overlay hâlâ aktif, başlık kartı bitmiş, CategoryFlash başlıyor → çift gösterim

### Fix
```tsx
// Önce: durationInFrames={60} → frame 20-80
// Sonra: durationInFrames={HEADLINES_START - 20} → frame 20-60
<Sequence from={20} durationInFrames={Math.max(1, HEADLINES_START - 20)}>
```

Overlay artık başlık kartı ile birlikte sona erer. Frame 60'ta temiz geçiş.

---

## 10. Tarih/Kaynak Ayarları

### Settings
- `news_bulletin.config.show_date` — boolean, default=true
- `news_bulletin.config.show_source` — boolean, default=false

### Veri akışı
```
NewsItem.published_at → selected_items → bulletin_script → composition_props.items[].publishedAt
NewsItem.source_id → (kaynak adı çözümlemesi gelecekte) → composition_props.items[].sourceId
Settings show_date/show_source → composition_props.showDate/showSource
  → NewsBulletinComposition → BulletinLowerThird
```

### Lower-third gösterimi (broadcast stili)
```
GÜNDEM · 8 Nis 2026 · Kaynak Adı
       ↑ showDate    ↑ showSource
```

---

## 11. Değişen Dosyalar

| Dosya | Değişiklik |
|---|---|
| `backend/app/settings/settings_resolver.py` | 6 yeni KNOWN_SETTINGS + render_format wired aktif |
| `backend/app/db/models.py` | NewsItem.image_url eklendi |
| `backend/alembic/versions/6efaa317abdf_*` | image_url migration |
| `backend/app/news_items/schemas.py` | image_url tüm schema'lara eklendi |
| `backend/app/source_scans/scan_engine.py` | _extract_image_url helper, normalize_entry'ye image_url |
| `backend/app/modules/news_bulletin/service.py` | selected_items snapshot: image_url, published_at, source_id |
| `backend/app/modules/news_bulletin/executors/script.py` | Script items'a image_url/published_at/source_id ekleme |
| `backend/app/modules/news_bulletin/executors/composition.py` | Image timeline, renderFormat, show_date/show_source, karaoke toggle |
| `backend/app/modules/standard_video/executors/composition.py` | renderFormat, karaoke toggle |
| `renderer/src/Root.tsx` | calculateMetadata: dinamik width/height (portrait/landscape) |
| `renderer/src/compositions/StandardVideoComposition.tsx` | renderFormat prop |
| `renderer/src/compositions/NewsBulletinComposition.tsx` | BulletinItemProps genişletildi, showDate/showSource, breaking overlay fix, image pass |
| `renderer/src/templates/news-bulletin/components/HeadlineCard.tsx` | Image arka plan + timeline, ImageTimelineSegment |
| `renderer/src/components/BulletinLowerThird.tsx` | publishedAt, sourceName, showDate, showSource, formatDate |

---

## 12. Test Sonuçları

| Test | Sonuç |
|---|---|
| Frontend TypeScript (tsc --noEmit) | 0 hata |
| Renderer TypeScript (tsc --noEmit) | 0 hata |
| Backend pytest | 1426 passed, 0 yeni hata |
| _extract_image_url unit test | 4/4 pass |
| KNOWN_SETTINGS doğrulama | 6/6 yeni ayar verified |
| karaoke_enabled default=True | Verified |
| show_date default=True | Verified |
| show_source default=False | Verified |

---

## 13. Kalan Limitasyonlar

- Çoklu görsel (>1 image per item): imageTimeline yapısı hazır ama backend henüz tek image_url çekiyor
- 9:16 layout optimizasyonu: Canvas boyutu değişiyor ama component layout'ları (font size, padding) henüz portrait-optimized değil
- Kaynak adı çözümlemesi: source_id taşınıyor ama source name lookup henüz composition'da yok
- Image crossfade/transition: Çoklu görsel geçişi düz kesim, crossfade efekti gelecek
- Render format wizard UI: Settings'ten okunuyor ama create wizard'da explicit seçim alanı henüz yok

---

## 14. Commit Hash ve Push Durumu

_(commit + push sonrası doldurulacak)_
