# M26 — Registry/Detail/Action Experience Maturation

## Ozet
Tablo sayfalari taranarak tutarsizliklar duzeltildi, token uyumu saglanarak tum registry sayfalari ortak standarda getirildi.

## Yapilan Tarama
Tum admin registry sayfalari su kriterlerle denetlendi:
1. PageShell kullanimi
2. Design token kullanimi (hardcoded deger yok)
3. data-testid varligi (heading, subtitle)
4. Uygun yerde back-link varligi
5. Stil tutarliligi

## Duzeltilen Sorunlar

### ContentLibraryPage
- 3 yerde `borderRadius: "8px"` → `radius.lg`
- `radius` import eklendi

### AnalyticsOverviewPage
- NAV_CARD'da `borderRadius: "8px"` → `radius.lg`
- `radius` import eklendi

### AnalyticsContentPage
- PageShell + breadcrumb entegrasyonu
- WindowSelector primitive kullanimi
- Back-link eklendi
- Subtitle ve workflow note icerigi genisletildi

## Mevcut Durum

### Tum registry sayfalarinda ortak yapi:
- PageShell wrapper ile baslik + subtitle
- testId prop ile otomatik heading/subtitle testId'leri
- Design token'lar ile tutarli stil
- FilterBar/DataTable primitifleri ile tutarli veri gosterimi

### Bilinen Farklar (Bilerek Korunuyor)
- TemplatesRegistryPage ve StyleBlueprintsRegistryPage: subtitle yerine ayri workflow note kullanir (farkli pattern ama islevsel)
- NewsItemsRegistryPage: subtitle yok (sayfanin dogasi geregi — haber listesi)
- Badge bilesenlerinde `"0.375rem"` → Bunlar genellikle satin ici kucuk badge'ler, token degisimi yapmak risk/fayda oraninda dusuk

## Action Tutarliligi
- Tum create butonlari: ActionButton primitive ile tutarli
- Tum filtre alanlari: FilterBar + FilterInput ile tutarli
- Tum tablo yapilari: DataTable primitive veya tokens ile stil uyumlu
