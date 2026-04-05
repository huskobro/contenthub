# M18-D: Varlik Kutuphanesi Durum Raporu

## Ozet
Varlik Kutuphanesi (AssetLibraryPage) backend asset altyapisi olmadan sahte veri veya yaniltici "bekliyor" ifadesi kullanmak yerine durust sekilde "desteklenmiyor" olarak isaretlendi.

## Degisiklikler

### `frontend/src/pages/admin/AssetLibraryPage.tsx`
- "Planlanan milestone: M16+" badge'i kaldirildi.
- Yerine "Desteklenmiyor — Backend asset altyapisi mevcut degil" badge'i (kirmizi arka plan, `asset-library-unsupported-badge` testId) eklendi.
- Empty state aciklama metni guncellendi: "desteklenmiyor (unsupported)" ifadesi eklendi.

### `frontend/src/pages/AdminOverviewPage.tsx`
- Hazirlik durumu listesinde:
  - "Varlik Kutuphanesi" statusu "Bekliyor" → "Desteklenmiyor" olarak guncellendi.
  - Detay metni "henuz mevcut degil" → "mevcut degil, bu alan henuz desteklenmiyor" olarak guncellendi.
  - "Analytics ve Raporlama" statusu "M11 aktif" → "M18 aktif" olarak guncellendi.
  - "Icerik Kutuphanesi" statusu "Omurga hazir" → "M18 aktif" olarak guncellendi.

## Neden
- Backend'de asset ingestion, dosya yukleme veya asset yonetim modulu yok.
- Sahte veri uretmek yerine durust olmak projenin temel kurallarina uygun.
- "Bekliyor" ifadesi yakin vadede yapilacak izlenimi veriyordu; "Desteklenmiyor" daha dogru.

## Test Guncellemeleri
- asset-library-media-resource-management-pack: "Bekliyor" → "Desteklenmiyor", milestone → unsupported testleri guncellendi.
