# M22-F: Truth Audit — Rapor

## Ozet

Codebase genelinde kalan fake/placeholder/fallback artifactlar taranarak
runtime dogruluk riskleri tespit edildi. M22'de duzeltilen sorunlar ve
kalan bilinen sinirlama/risk listesi asagidadir.

## M22'de Duzeltilen Sorunlar

| Sorun | Dosya | Onceki | Sonrasi |
|-------|-------|--------|---------|
| Permissive visibility fallback | visibilityApi.ts | API hata → tam erisim | API hata → throw Error |
| Hardcoded "ContentHub Video" title | executor.py | Bos payload → fake baslik | Bos payload → ValueError |
| YouTube adapter title fallback | adapter.py | title yok → "ContentHub Video" | title yok → PublishAdapterError |
| Python-side merge/sort | content_library/service.py | Tum verileri cek, Python'da sirala | SQL UNION ALL, DB'de sirala |
| Upload 200 status code | assets/router.py | 200 (yanlis) | 201 (dogru HTTP semantik) |

## Kalan Riskler — Kritik

### 1. YouTube Category ID Hardcoded Default
- **Dosya**: `app/publish/youtube/adapter.py` satir 191
- **Pattern**: `category_id = str(payload.get("category_id", "22"))`
- **Risk**: Payload'da category_id yoksa sessizce "22" (People & Blogs) kullanilir
- **Oneri**: Settings'ten default category_id okunmali veya publish akisinda zorunlu alan yapilmali
- **Durum**: Gelecek faz icin birakildi (publish metadata zenginlestirme)

### 2. Analytics Trace JSON Parse Hatasi Yutma
- **Dosya**: `app/analytics/service.py` satir 295-303
- **Pattern**: `except Exception: continue`
- **Risk**: Bozuk trace verisi sessizce atlanir, istatistikler eksik olabilir
- **Oneri**: Parse hatasi sayisi loglanmali veya metric olarak raporlanmali

## Kalan Riskler — Orta

### 3. Analytics Provider Name "unknown" Fallback
- **Dosya**: `app/analytics/service.py` satir 309
- **Pattern**: `"provider_kind": trace.get("provider_kind", "unknown")`
- **Risk**: Eksik provider bilgisi "unknown" olarak gosterilir, analiz yanitlici olabilir

### 4. Word Timing Dosya Yoksa Sessiz Degradasyon
- **Dosya**: `app/modules/standard_video/executors/render.py` satir 100-128
- **Pattern**: Dosya yoksa `return []`, render devam eder
- **Risk**: Altyazi cursor modu degrade olur, loglaniyor ama is basarisiz sayilmiyor
- **Durum**: Loglama var, kasitli tasarim karari — render durdurulmamali

### 5. Pixabay Gorsel URL Fallback Zinciri
- **Dosya**: `app/providers/visuals/pixabay_provider.py` satir 142-146
- **Pattern**: largeImageURL → webformatURL → skip
- **Risk**: Kalite dususu sessizce gerceklesir

### 6. Render Duration Fallback (60 saniye)
- **Dosya**: `app/modules/standard_video/executors/render.py` satir 270-286
- **Pattern**: Gecersiz sure → 60 saniye default
- **Risk**: Yanlis sureli video render edilir, WARNING logu var ama is basarili sayilir

## Kalan Riskler — Dusuk

### 7. Subtitle Preset Fallback
- **Pattern**: Gecersiz preset → "clean_white" default
- **Durum**: Kasitli tasarim, reasonable default

### 8. Preview Sample Text
- **Pattern**: Bos metin → "Onizleme" (Turkce)
- **Durum**: Kasitli, salt onizleme icin

## Sonuc

M22'de en kritik runtime dogruluk sorunlari giderildi:
- Visibility artik guvenli fallback kullaniyor (salt okunur)
- Publish artik bos/bozuk payload ile ilerleyemiyor
- Content library artik SQL tarafinda calistiriliyor

Kalan riskler bilincidir ve gelecek fazlarda ele alinacaktir.
Hicbiri sessiz veri kaybi veya yanlis yayin riski tasimaz (YouTube category_id haric,
bu da farkli bir faz icin planlanmistir).
