# Test Report — Phase 49: News Bulletin Selected News Picker Frontend

## Amaç
Admin'in News Bulletin detail ekranında news_item_id el ile yazmak zorunda kalmadan picker aracılığıyla haber seçebilmesini doğrulamak.

## Çalıştırılan Komutlar
```
npx vitest run --reporter=verbose
npm run build
```

## Test Sonuçları
- 10 yeni test eklendi (news-bulletin-selected-news-picker.smoke.test.tsx)
- Mevcut selected items panel testleri güncellendi (+ Manuel Ekle rename)
- 263 toplam frontend test — tümü geçti (31 test dosyası)
- Build: başarılı (tsc --noEmit + vite build)

## Kapsanan Senaryolar
- Picker toggle butonu kapalı halde render oluyor
- Picker açılıyor
- Loading state görünüyor
- Error state görünüyor
- Empty state görünüyor
- Haber listesi yüklenince görünüyor
- Her haber için Seç butonu var
- Seç tıklanınca onSelect çağrılıyor
- Seçim sonrası picker kapanıyor
- addError prop'u hata mesajı gösteriyor

## Bilerek Yapılmayanlar
- Gelişmiş arama / filtre
- Pagination
- Used news çakışma uyarısı
- Dedupe göstergesi
- Sürükle-bırak sıralama
- Bulk seçim
- Otomatik öneri sistemi

## Riskler
- 409 duplicate hatası picker'da gösteriliyor ancak SelectedItemsPanel'daki pickerError state aracılığıyla; modal yoktur
- Auth/rol zorlama henüz yok (kasıtlı)
