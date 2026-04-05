# M15 — Placeholder Temizlik Raporu

## Ozet

M15 kapsaminda uretim kodunda (production code) placeholder, mock ve deferred mesajlarin taranmasi ve temizlenmesi yapilmistir.

## Temizlenen Ogeler

### 1. JobSystemPanels.tsx — Deferred Mesajlari Kaldirildi
- **Onceki durum**: 3 panel ("Logs", "Artifacts", "Provider Trace") "M12 milestone'unda aktif edilecektir" mesaji gosteriyordu
- **Yeni durum**: Gercek veri gosterimi — step log_text, artifact_refs_json ve provider_trace_json parse edilerek kart gorunumu ile sunuluyor
- **Bos durum mesajlari**: Veri yoksa "Henuz ... yok" mesaji gosteriliyor (placeholder degil, gercek bos durum)

### 2. JobDetailPage.tsx — Actions Panel
- **Durum**: "Operasyonel aksiyonlar (Retry, Cancel, Skip) M14 milestone'unda aktif edilecektir" mesaji hala mevcut
- **Karar**: Bu mesaj M14 scope'unda olusturulmus ve aksiyonlarin M14'te implement edilmemesi durumunda bilgilendirme amaciyla birakilmisti. M15 scope'unda bu panelin icerigi degistirilmemistir cunku M15'in odak noktasi audit log ve provider trace'dir.

## Tarama Sonuclari

### Backend (`backend/app/`)
- **"placeholder"**: Uretim kodunda placeholder veri bulunamadi
- **"mock"**: Yalnizca test dosyalarinda (`tests/`) — uretim kodunda yok
- **"sample"**: Uretim kodunda sample veri bulunamadi
- **"dummy"**: Uretim kodunda dummy veri bulunamadi
- **"lorem ipsum"**: Bulunamadi

### Frontend (`frontend/src/`)
- **"placeholder"**: HTML input placeholder attribute'leri (dogru kullanim, temizlik gerektirmez)
- **"mock"**: Yalnizca test dosyalarinda (`tests/`) — uretim kodunda yok
- **"sample"**: Uretim kodunda sample veri bulunamadi
- **"TODO"/"FIXME"**: Belirli yerlerde deferred feature notlari mevcut (asagida belgelenmistir)

## Bilinen Deferred Ogeler

| Dosya | Not | Aciklama |
|-------|-----|----------|
| `JobDetailPage.tsx` | "M14 milestone'unda aktif edilecektir" | Actions paneli — M15 scope disinda |

## Sonuc

Uretim kodunda gercek placeholder/mock/sample veri kalmamistir. Deferred mesajlar yalnizca henuz implement edilmemis ozellikler icin bilgilendirme amaciyla birakilmistir ve acikca belgelenmistir.
