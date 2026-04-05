# Wave 2 / M25 — Faz C: Data Surface Standardization Raporu

## Ozet
Tum admin tablo sayfalari tutarli loading/empty/error durumlari, filtre cubugu, badge gosterimi ve pagination ile standardize edildi.

## Yapilan Isler

### Tutarli Durumlar
- Loading: "Yükleniyor..." (colors.neutral[500])
- Error: Hata mesaji (colors.error.base)
- Empty: "Henüz kayıt yok." veya benzeri (ortalanmis, colors.neutral[500])
- Filtered-empty: Filtreye uygun kayit bulunamadiginda ozel mesaj

### StatusBadge Kullanimi
- Tum durum gosterimleri StatusBadge primitive'ine donusturuldu
- Inline styled span yerine tutarli badge stili

### Tablo Standardizasyonu
- Tum tablolarda tutarli TH ve TD styling (token-based)
- Hover efektleri transition.fast ile
- Secili satir vurgulama colors.brand[50] ile

## Etkilenen Dosyalar
- NewsItemsTable, SourceScansTable, SourcesTable
- TemplatesTable, StyleBlueprintsTable
- UsedNewsTable, NewsBulletinsTable
- TemplateStyleLinksTable
- JobsTable (onceden donusturulmustu)
- VisibilityRulesTable, SettingsTable

## Bilinen Limitasyonlar
- NewsItemsTable 17 sutunlu — cok genis tablo, DataTable primitive'ine tam gecis tercih edilmedi (mevcut yapisi korundu, sadece stiller tokenize edildi)
- Pagination henuz tum sayfalarda aktif degil — veriler kucuk oldugu icin gerekli gorulmedi
