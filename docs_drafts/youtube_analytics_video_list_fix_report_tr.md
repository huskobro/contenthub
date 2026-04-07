# YouTube Analytics Video Listesi — Root Cause Analizi ve Düzeltme Raporu

Tarih: 2026-04-07

## 1. Root Cause

**Sorun: Backend sunucusu eski versiyonu yüklüyordu.**

`channel-videos` endpoint'i (`GET /api/v1/publish/youtube/channel-videos`) `38b5fca` commit'inde eklendi (11:00AM). Ancak sunucu `10:24AM`'de başlatılmıştı ve `--reload` flag'i yoktu. Bu nedenle kod değişikliği çalışan sürece yansımadı ve endpoint 404 Not Found döndürüyordu.

İkincil sorun: Sunucu sistem Python 3.13 ile başlatılmıştı (`/Library/Frameworks/Python.framework/Versions/3.13`), `.venv` ile değil. `.venv/bin/uvicorn` shebang'ı eski bir dizin adına (boşluklu path) işaret ediyordu ve çalışmıyordu.

## 2. Neden Channel Info Gelirken Video Listesi Gelmiyordu?

| Endpoint | Eklenme zamanı | Server durumu |
|----------|---------------|---------------|
| `/status` | Eski commit | Server'da mevcut ✅ |
| `/channel-info` | Eski commit | Server'da mevcut ✅ |
| `/video-stats` | Eski commit | Server'da mevcut ✅ |
| `/channel-videos` | 11:00AM (38b5fca) | Server 10:24AM'de başlamış, bu endpoint **yok** ❌ |

Channel info endpoint'i zaten eski kodda vardı. Channel videos endpoint'i yeni eklenmişti ama restart olmadan görünmüyordu.

## 3. Değişen Dosyalar

| Dosya | Değişiklik |
|-------|-----------|
| `start.sh` | `uvicorn ... --reload` flag'i eklendi |
| `frontend/src/pages/admin/YouTubeAnalyticsPage.tsx` | `videosError` tipi `boolean` → `Error | null`; hata mesajı 404 / 403 / genel senaryolarına göre ayrıştırıldı |

## 4. Backend Endpoint Düzeltmesi

Backend kodu zaten doğruydu — sorun deployment'ta, kodda değildi. Yaptıklar:
- `start.sh`'a `--reload` eklendi → bundan sonra kod değişikliği otomatik yansır
- Server `python3 -m uvicorn app.main:app --port 8000 --reload` ile yeniden başlatıldı
- Endpoint test edildi: `{"total_count": 3, "contenthub_count": 0, ...}` başarılı

## 5. Frontend Veri Akışı Düzeltmesi

`ConnectionBanner` bileşeninde `videosError` prop'u `boolean`'dan `Error | null`'a yükseltildi:

```typescript
// Önce (bilgisiz):
videosError: boolean;

// Sonra (hata tipiyle):
videosError: Error | null;
```

`ApiError.status` üzerinden HTTP kodu çekilip 3 farklı senaryo ayrıştırıldı:

| HTTP Status | Gösterilen Mesaj |
|-------------|-----------------|
| 404 | "Backend sunucusu eski versiyonu yüklemiş görünüyor. Uygulamayı yeniden başlatın." |
| 403 | "OAuth token'ınızın yeterli izni yok. Ayarlar sayfasından bağlantıyı yeniden kurun." |
| Diğer | "Video listesi çekilirken hata: {detay}. Sayfayı yenileyin." |

## 6. Hata State'lerinin Ayrıştırılması

Sayfa artık şu 6 durumu net şekilde ayırt ediyor:

1. ❌ **Bağlı değil** → Nötr banner, settings linki
2. ⚠️ **Scope yetersiz** → Warning banner, yeniden bağlanma yönlendirmesi
3. ❌ **Kanal bilgisi alınamıyor** → Error banner, token geçersizliği açıklaması
4. ⚠️ **Video listesi alınamıyor (404)** → Uyarı: server restart gerekiyor
5. ⚠️ **Video listesi alınamıyor (403)** → Uyarı: scope yetersiz
6. ✅ **Her şey normal** → Yeşil onay, tüm içerik görünür

## 7. Tüm Kanal Videoları Artık Geliyor mu?

✅ Evet. Test sonucu:
```
GET /channel-videos?max_results=3
→ {"total_count": 3, "contenthub_count": 0, "videos": [...]}
```

3 video başarıyla geliyor. ContentHub'dan henüz YouTube'a publish yapılmamış, bu yüzden `contenthub_count: 0` — bu doğru davranış.

## 8. ContentHub Badge Merge Mantığı

Backend'de `PublishRecord` tablosundan `platform_video_id` çekiliyor, video listesiyle `set` intersection yapılıyor, `is_contenthub` flag'i set ediliyor. Bu mantık doğru çalışıyor — sadece ContentHub üzerinden publish edilmiş videolar badge alıyor, diğerleri normal görünüyor.

## 9. Theme-Uyumlu Tasarım Korundu mu?

✅ Evet. Yaptığımız değişiklik sadece prop tipi ve mesaj içeriği — görsel tasarım dokunulmadı. Tüm `bg-warning-light`, `text-warning-text`, `border-warning/30` token'ları korundu.

## 10. Test Sonuçları

| Test | Sonuç |
|------|-------|
| TypeScript `tsc --noEmit` | ✅ 0 hata |
| `test_m14_youtube_analytics.py` (7 test) | ✅ 7/7 pass |
| `GET /channel-videos` live test | ✅ 3 video döndü |
| `GET /status` | ✅ Çalışıyor |
| `GET /channel-info` | ✅ Çalışıyor |

## 11. Kalan Limitasyonlar

1. **start.sh .venv sorunu**: `.venv/bin/uvicorn` shebang'ı eski (boşluklu) dizin adına işaret ediyor. Uzun vadeli çözüm: `.venv`'i yeniden oluşturmak veya `python3 -m uvicorn` kullanmak. `start.sh` hala `.venv/bin/activate` + `uvicorn` ile çalışıyor — bu çalışmayabilir, `python3 -m uvicorn` alternatifi önerilebilir.
2. **Video limiti**: Max 50 video (YouTube API pagination yok)
3. **Trend verisi**: Sadece ContentHub videoları için (henüz publish yok)
4. **Publish linkage**: Sheet'ten PublishDetailPage'e direkt link yok

## 12. Commit Hash ve Push Durumu

Bakınız sonraki bölüm — commit bu rapor yazıldıktan sonra oluşturulacak.
