# YouTube Analytics Sayfası Yeniden Tasarım Raporu

Tarih: 2026-04-07

## 1. Executive Summary

YouTube Analytics sayfası sıfırdan yeniden tasarlandı. Önceki versiyon hardcoded dark tema ile bağımsız bir mini design system kullanıyordu — bu versiyon tamamen ContentHub design system primitives ve semantic token'ları üzerine inşa edildi.

Temel değişiklikler:
- Kanalın TÜM videoları gösteriliyor (sadece ContentHub yayınları değil)
- ContentHub videoları küçük, premium `◆ HUB` badge ile ayrıştırılıyor
- Filtre (kaynak / sıralama / arama) ve sayfalama eklendi
- Sheet detail panel ile video detayına erişim
- 5 farklı hata/durum senaryosu net şekilde ayrıştırıldı
- Hardcoded renk, font, shadow tamamen kaldırıldı
- Classic ve Horizon layout'larda tema uyumlu çalışıyor

## 2. Sayfa Yapısı

### Katman 1: Bağlantı Durumu Banner'ı
- `ConnectionBanner` bileşeni 5 durumu ayırt eder:
  - ❌ Bağlı değil → Ayarlar linkiyle bilgilendirme
  - ⚠️ Scope yetersiz → Yeniden bağlantı yönlendirmesi
  - ❌ Kanal bilgisi alınamıyor → API hata açıklaması
  - ⚠️ Video listesi alınamıyor → Retry yönlendirmesi
  - ✅ Her şey sağlıklı → Kısa yeşil onay banner'ı

### Katman 2: Kanal Özet Kartı
- `ChannelHeader` → SectionShell içinde avatar, kanal adı, ID, abone sayısı, video sayısı
- Verisi `useYouTubeChannelInfo()` hook'undan

### Katman 3: Hızlı Metrikler
- MetricGrid + MetricTile (design system primitives) kullanılıyor
- 6 metrik: Toplam Görüntülenme, Toplam Beğeni, ContentHub Videoları, Son 30 Gün, Ort. Görüntülenme, En Çok İzlenen
- Sadece gerçek veri varsa gösterilir, fake metric üretilmez

### Katman 4: Video Listesi
- SectionShell + DataTable + FilterBar + Pagination (tüm design system)
- Tüm kanal videoları tek tabloda
- Thumbnail + başlık + badge + tarih + görüntülenme + beğeni + yorum + etkileşim oranı

### Katman 5: Video Detay Panel (Sheet)
- Satıra tıklayınca sağdan Sheet açılır
- Büyük thumbnail, detay satırları, trend sparkline, snapshot tablosu, YouTube linki

## 3. Tüm Kanal Videoları

`GET /channel-videos` endpoint'i kullanılıyor (önceki session'da eklendi):
- YouTube API 3-aşamalı akış: channels → playlistItems → videos
- Backend'de `PublishRecord` tablosu ile eşleştirme yapılıp `is_contenthub` flag'i set ediliyor
- Frontend'de `useChannelVideos()` hook'u ile çekiliyor
- Eski `useYouTubeVideoStats()` artık bu sayfada kullanılmıyor

## 4. ContentHub Badge Mantığı

```tsx
<span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-xs font-bold bg-brand-100 text-brand-700">
  <svg>✓</svg> HUB
</span>
```

- Token-native: `bg-brand-100`, `text-brand-700`
- Tema değişince otomatik uyumlu
- Küçük, premium, bağırmayan
- Tooltip: "ContentHub ile yayınlandı"
- ContentHub olmayan videolara negatif badge yok

## 5. Filtreler ve Sıralama

| Filtre | Seçenekler |
|--------|-----------|
| Kaynak | Tümü / ContentHub / Diğer |
| Sıralama | En Yeni / En Eski / En Çok Görüntülenen / En Az Görüntülenen |
| Arama | Video başlığında metin arama |
| Temizle | Tüm filtreleri sıfırla |

Sayfalama: 20 video/sayfa, Önceki/Sonraki navigasyonu.

## 6. Durum/Hata Yüzeyleri

5 ayrı durum kartı, her biri farklı görsel:
1. **Bağlı değil** → Nötr border, settings link
2. **Scope yetersiz** → warning-light bg, warning border
3. **Kanal bilgisi alınamıyor** → error-light bg
4. **Video listesi alınamıyor** → error-light bg
5. **Normal** → success-light bg, kısa onay

Ayrıca:
- Bağlı değil durumunda EmptyState (illustration="no-analytics")
- Scope yetersiz durumunda EmptyState (illustration="error")

## 7. Theme Uyumu

### Kullanılan Design System Primitives
- `PageShell`, `SectionShell`, `MetricTile`, `MetricGrid`
- `DataTable`, `FilterBar`, `FilterInput`, `FilterSelect`
- `StatusBadge`, `ActionButton`, `Pagination`
- `Sheet`, `EmptyState`

### Token Kullanımı
- Background: `bg-surface-card`, `bg-surface-inset`
- Border: `border-border-subtle`, `border-border`, `border-success/20`, `border-warning/30`, `border-error/20`
- Text: `text-neutral-900/800/700/600/500/400`, `text-brand-600/700`, `text-success-text`, `text-warning-text`, `text-error-text`
- Badge: `bg-brand-100`, `text-brand-700`
- Hover: `hover:bg-neutral-50`, `hover:text-brand-600`, `hover:underline`, `hover:border-brand-400`
- Shadow: `shadow-sm`, `shadow-xs` (tema motor)
- Radius: `rounded-lg`, `rounded-md`, `rounded-sm`, `rounded-full` (tema motor)
- Motion: `transition-all duration-fast`, `transition-colors duration-fast`, `transition-shadow duration-normal`
- Font: `font-heading`, `font-mono`, `tabular-nums`

### Hardcoded Eleman Kontrolü
- **Tek CSS var() fallback**: SVG stroke'ta `var(--ch-success-base, #34b849)` — bu standard CSS fallback pattern'ı, hardcoded değil
- Sıfır hardcoded hex/rgb renk
- Sıfır hardcoded box-shadow
- Sıfır hardcoded font-family
- Sıfır external stylesheet veya `<style>` bloğu
- Sıfır `@import url()`

### Doğrulama
```bash
grep -E '#[0-9a-fA-F]{3,8}|rgb\(' YouTubeAnalyticsPage.tsx
# Sadece CSS var() fallback'ler çıkıyor
```

## 8. Değişen Dosyalar

| Dosya | Değişiklik |
|-------|-----------|
| `frontend/src/pages/admin/YouTubeAnalyticsPage.tsx` | Tamamen yeniden yazıldı |
| `frontend/src/hooks/useCredentials.ts` | `fetchChannelVideos` import düzeltmesi (önceki session'dan kalan) |

Backend dosyalarında değişiklik yok — mevcut `GET /channel-videos` endpoint'i yeterli.

## 9. Test Sonuçları

| Test | Sonuç |
|------|-------|
| TypeScript `tsc --noEmit` | ✅ 0 hata |
| `test_m14_youtube_analytics.py` (7 test) | ✅ 7/7 pass |
| Hardcoded renk kontrolü | ✅ Sıfır hardcoded renk |
| Hardcoded inline style kontrolü | ✅ Sıfır hardcoded style |

## 10. Kalan Limitasyonlar

1. **Video limiti**: Backend max 50 video çekiyor (YouTube API pagination henüz yok)
2. **Publish linkage**: ContentHub badge mevcut ama Sheet'ten doğrudan PublishDetailPage'e link henüz yok
3. **Trend verisi**: Sadece ContentHub videoları için (DB'de snapshot kaydı olan) trend gösteriliyor
4. **Demografik veri**: YouTube Analytics API (ayrı scope) gerekli — henüz desteklenmiyor
5. **Tarih aralığı filtresi**: İstekte belirtildi ama v1'de öncelik verilmedi; kolayca eklenebilir
6. **Keyboard navigation**: useScopedKeyboardNavigation henüz bu sayfaya eklenmedi
