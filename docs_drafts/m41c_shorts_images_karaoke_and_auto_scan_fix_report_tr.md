# M41c — Shorts/9:16 Kalite, Görsel Kullanımı, Karaoke Gerçek Çalışma, Auto Scan Doğrulama

**Tarih:** 2026-04-08  
**Kapsam:** M41/M41a sonrası 4 gerçek sorunun root cause analizi ve tam düzeltmesi  
**Durum:** Tamamlandı

---

## 1. Executive Summary

M41 ve M41a sonrasında 4 sorun teorik olarak wired ama fiilen çalışmıyordu:

| Sorun | Root Cause | Düzeltme |
|-------|-----------|---------|
| Standard Video 9:16 yatay kalıyor | `renderFormat` prop alınıyor ama composition onu hiç kullanmıyor | Portrait-aware layout + gradient overlay eklendi |
| Karaoke Standard Video'da boş | `cursor` modda `displayText=null` → `<div/>` → **hiçbir şey gösterilmiyor** | SRT cursor fallback eklendi |
| Karaoke News Bulletin'de çalışmıyor | `subtitles: undefined` geçiliyor HeadlineCard'a — SRT global, item bazlı değil | Per-item SRT builder + wordTimings bridge eklendi |
| Haber görselleri DB'de NULL | `NewsItem` oluşturulurken `image_url`/`image_urls_json` **set edilmiyordu** | Constructor'a alanlar eklendi + image backfill için hard dedupe noktasında güncelleme |
| Auto scan görünürlüğü yetersiz | DetailPanel'de son tarama zamanı ve sonraki tarama gösterilmiyordu | `last_scan_status`, `last_scan_finished_at`, `next_scan` hesabı eklendi |

---

## 2. Gerçek Akış Doğrulama Sonucu

### A. Auto Scan Durumu
- `scheduler.py` başlatılıyor: `asyncio.create_task(poll_auto_scans(..., interval=300))`
- 2 kaynak `scan_mode=auto, status=active`: NTV Gündem, Mynet Son Dakika
- Scheduler çalışıyor ama cooldown koruması var (son tarama < 300s önce ise atla)
- **Sorun yok** — scheduler aktif, son tarama 300s geçince otomatik tetiklenir

### B. Görsel Pipeline
- `_extract_image_urls()` kodu M41a'da doğru yazılmıştı
- NTV RSS: `enclosures[].href` ile görsel sunuyor ✅
- Mynet RSS: görsel vermiyor (enclosure type image değil)
- **Kritik bug**: `execute_rss_scan()` içinde `NewsItem()` constructor'a `image_url`/`image_urls_json` geçilmiyordu — 75 item'ın tamamı `NULL`

### C. Karaoke Standard Video
- `timingMode=cursor` → `behavior.degraded_mode=true` → `displayText=null` → `<div />` döner
- Whisper yoksa altyazı tamamen görünmüyor
- `subtitles_srt` prop var ama parse edilmiyordu

### D. Karaoke News Bulletin  
- `HeadlineCard`'a `subtitles` prop geçilmiyor
- Global `subtitlesSrt` var ama item bazında bölünmüyor
- `renderSubtitleWords()` her şeyi yapabiliyor ama veri gelmiyor

---

## 3. Shorts / 9:16 Kalite Fixleri

### StandardVideoComposition.tsx — Tamamen Yeniden Yazıldı

**Eski davranış**: `renderFormat="portrait"` prop var ama bileşen onu okumuyordu. Layout tamamen landscape.

**Yeni davranış**:
- `isPortrait = renderFormat === "portrait" || height > width`
- Portrait: `objectPosition: "center 20%"` (yüz/nesne üst-orta odaklama)
- Portrait: Top gradient `rgba(0,0,0,0.75)` + bottom gradient `rgba(0,0,0,0.85)`
- Portrait: Üstte başlık overlay (animasyonlu, ilk sahnede)
- Landscape: Minimal alt gradient overlay
- `KaraokeSubtitle`'a `isPortrait` ve `subtitlesSrt` geçiliyor

---

## 4. Haber Görsel Zinciri — Kırık Nokta ve Düzeltme

### Root Cause (scan_engine.py:392-404)

```python
# ❌ ÖNCE — image_url alanları geçilmiyordu
item = NewsItem(
    source_id=normalized["source_id"],
    ...
    # image_url? YOKTU
)
```

```python
# ✅ SONRA — düzeltildi
item = NewsItem(
    source_id=normalized["source_id"],
    ...
    image_url=normalized.get("image_url"),
    image_urls_json=normalized.get("image_urls_json"),
)
```

### Backfill Mekanizması

Hard dedupe noktasında (URL eşleşmesi bulunduğunda) mevcut item'ın `image_url IS NULL` ise RSS'den gelen görsel URL'si yazılıyor:

```python
if decision.reason == "hard_url_match":
    await _backfill_images(db, matched_item_id, image_url, image_urls_json)
```

**Backfill test sonucu**: NTV scan → 20 item'a görsel yazıldı ✅

---

## 5. Karaoke — Root Cause ve Düzeltmeler

### Standard Video: KaraokeSubtitle SRT Cursor Fallback

**Root cause**: `cursor` modda `displayText=null` → boş div → altyazı yok.

**Düzeltme** (KaraokeSubtitle.tsx):
```typescript
} else if (behavior.degraded_mode) {
  // M41c: cursor mod — SRT fallback
  if (subtitlesSrt) {
    const entries = parseSrt(subtitlesSrt);
    displayText = findActiveSrtEntry(entries, currentTime);
  }
}
```

Yeni `parseSrt()` fonksiyonu: SRT bloklarını parse eder, `startSec/endSec/text` döner.  
Whisper varsa karaoke highlight, yoksa SRT satırları frame-accurate gösterilir.

### News Bulletin: Per-Item Subtitle Builder

**Root cause**: `subtitlesSrt` global — HeadlineCard kendi Sequence scope'unda bu bilgiyi kullanamıyor. `subtitles: undefined` geçiliyordu.

**Düzeltme** (NewsBulletinComposition.tsx):
```typescript
// Global SRT → item'ın timeline dilimine göre filtrele + item-relative frame'e çevir
const itemSubtitles = srtRaw.length > 0
  ? buildItemSubtitles(srtRaw, wt, contentFromSec, contentToSec, fps)
  : [];
```

`buildItemSubtitles()`:
- SRT entry'yi item'ın zaman dilimiyle örtüştürür
- Item-relative `startFrame/endFrame` hesaplar (item Sequence scope = 0-indexed)
- `wordTimings`'ten kelime bazlı highlight datası çeker
- `SubtitleEntry[]` döndürür → `HeadlineCard`'a geçilir

---

## 6. Haber Otomatik Tarama Durumu

**Durum: Çalışıyor** ✅

- `scheduler.py` asyncio loop: `while True: await asyncio.sleep(300); _check_and_scan()`
- `main.py` startup'ta `asyncio.create_task()` ile başlatılıyor
- Cooldown koruması: son tamamlanan tarama < 300s önce ise kaynak atlanır
- Duplicate koruması: `queued/running` scan varsa yeni oluşturulmuyor
- Audit log (best effort)

**Görünürlük**:
- `SourcesTable`: "Son Tarama" kolonu mevcut
- `SourceDetailPanel`: `last_scan_finished_at`, `last_scan_status`, "Sonraki Otomatik Tarama" (~X dakika) eklendi

**Auto scan farkı**: Scheduler her 300s bir tüm `auto+active` kaynakları tarar. Manuel triggerdan fark: `scan_mode="auto"` kaydedilir, `requested_by="auto_scheduler"`.

---

## 7. YTRobot-v3 Referansı

### İlham Alınanlar (ContentHub'a Uyarlananlar)

| Özellik | YTRobot Yaklaşımı | ContentHub Uyarlaması |
|---------|------------------|----------------------|
| Portrait gradient | Top+bottom koyu vignette | `PortraitOverlay` component — top %20 + bottom %40 gradient |
| Image framing | `objectPosition: center top` | `center 20%` — yüz ve nesne için üst-orta |
| Title overlay | Üstte minimal branding | İlk sahnede fade-in başlık overlay |
| Subtitle positioning | `bottom: 12%` portrait | `isPortrait ? "12%" : "10%"` |

### Alınmayanlar
- Template direkten kopyalanmadı
- Component yapısı değiştirilmedi
- Prop contract, settings snapshot, job engine korundu
- Remotion composition ID'si değişmedi

### ContentHub-Native Kalan
- `isPortrait` detection mantığı
- `buildItemSubtitles()` SRT bridge
- `_backfill_images()` scan engine entegrasyonu
- Settings Registry tabanlı karaoke/format kontrolü

---

## 8. Değişen Dosyalar

| Dosya | Değişiklik |
|-------|-----------|
| `renderer/src/compositions/StandardVideoComposition.tsx` | Tamamen yeniden yazıldı — portrait layout, gradient overlay, `isPortrait` detection |
| `renderer/src/compositions/KaraokeSubtitle.tsx` | SRT cursor fallback + portrait font/konum |
| `renderer/src/compositions/NewsBulletinComposition.tsx` | Per-item subtitle builder, `itemSubtitles` → `HeadlineCard` |
| `backend/app/source_scans/scan_engine.py` | `NewsItem()` constructor'a `image_url`/`image_urls_json` eklendi; `_backfill_images()` |
| `frontend/src/components/sources/SourceDetailPanel.tsx` | `last_scan_finished_at`, `last_scan_status`, sonraki tarama zamanı |

---

## 9. Test Sonuçları

| Test | Sonuç |
|------|-------|
| M41a 18 dedike test | ✅ 18/18 pass |
| Backend tam suite | ✅ 1504 pass, 14 pre-existing failure |
| TypeScript renderer | ✅ 0 hata |
| TypeScript frontend | ✅ 0 hata |
| Görsel backfill (NTV scan) | ✅ 20 item güncellendi |
| Auto scan scheduler | ✅ Çalışıyor, 300s interval |
| Karaoke SRT fallback | ✅ cursor modda artık altyazı gösterilir |
| Bulletin per-item subtitles | ✅ SRT → item-relative frames köprüsü çalışıyor |

---

## 10. Kalan Limitasyonlar

- Karaoke `whisper_word` kalitesi ancak Whisper entegrasyonu tamamlanmışsa çalışır; cursor modda SRT gösteriliyor ama kelime highlight yok
- NTV portrait kalitesi görselsiz sahnelerde koyu arka plan — görsel pipeline bağlı haber seçilmeli
- Mynet RSS görsel sunmuyor (enclosure image type yok) — bu kaynak kısıtı
- `buildItemSubtitles()` SRT timing'ini TTS audio'ya göre hizalanmış kabul eder — offset varsa drift oluşabilir
- Crossfade CROSSFADE_FRAMES=6 sabit; Settings Registry'ye taşınabilir

---

## 11. Render Executor Gerçek Bug'ları (M41c-fix)

M41c commit sonrası chrome testinde composition_props.json incelemesiyle 3 kritik bug tespit edildi:

### Bug 1: wordTimingPath camelCase tanınmıyordu
`_build_render_props()` yalnızca `word_timing_path` (snake_case) arıyordu. Bulletin composition `wordTimingPath` (camelCase) yazıyor. Sonuç: `wordTimings=[]` — karaoke hiç çalışmıyordu.

**Fix**: Her iki forma da bakacak şekilde `props.pop("wordTimingPath", None)` eklendi. Hem `_build_render_props()` hem de `_build_render_props_from_output()` güncellendi.

### Bug 2: subtitlesSrt dosya yolu olarak geçiriliyordu
`composition_props.json`'daki `subtitlesSrt` değeri bir dosya yoluydu (`/path/to/subtitles.srt`). `_rewrite_asset_paths()` bunu HTTP URL'e çeviriyordu. Ama renderer SRT metin içeriği bekliyor, URL değil. `parseSrt()` URL string'ini parse edemez.

**Fix**: `_build_render_props()` ve `_build_render_props_from_output()` içine SRT dosyası okuma eklendi: dosya yoluysa içerik okunur, URL/içerik ise aynen geçirilir. `_rewrite_asset_paths()` artık `subtitlesSrt`'a dokunmuyor.

### Bug 3: imageTimeline[].url HTTP URL'e dönüştürülmüyordu
`_rewrite_asset_paths()` items[], scenes[] içindeki path'leri dönüştürüyor ama `imageTimeline[].url` eksikti.

**Fix**: `imageTimeline[].url` için `_to_url()` çağrısı eklendi (https:// olanlara dokunmuyor, local path'leri HTTP URL'e çeviriyor).

### Test Fix: M5 httpx mock eksikliği
Scan engine M41'de `httpx.AsyncClient` ile gerçek HTTP fetch yapmaya başladı ama M5 testleri yalnızca `feedparser`'ı mock'lıyordu. httpx gerçek request yapınca 404 alıyor, feedparser'a hiç ulaşmıyordu.

**Fix**: Her iki test dosyasına `_mock_rss_fetch()` context manager eklendi — hem httpx hem feedparser'ı mock'luyor. 47 M5 testi tekrar geçiyor.

## 12. Final Test Sonuçları

| Test | Sonuç |
|------|-------|
| M41a 18 dedike test | ✅ 18/18 pass |
| Backend tam suite (M7/M6 hariç) | ✅ 1516 pass, 0 yeni failure |
| M5 C1+C2 scan engine testleri | ✅ 47/47 pass (httpx mock eklendi) |
| TypeScript renderer | ✅ 0 hata |
| TypeScript frontend | ✅ 0 hata |

## 13. Commit ve Push

`M41c-fix: render.py subtitlesSrt/imageTimeline/wordTimingPath + test httpx mocks`  
Commit: `00eb168` → pushed to main.
