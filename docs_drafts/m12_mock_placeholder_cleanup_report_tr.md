# M12 Mock/Placeholder Temizlik Raporu

## Yapilan Temizlikler

### 1. AdminOverviewPage Durum Etiketleri Duzeltmesi
- "gorunurluk runtime resolver + guard aktif" -> "visibility guard 9 admin router'da aktif"
- Settings resolver "16/19 wired" -> "19/19 wired"
- Sablon sistemi detayi template context genislemesini yansitacak sekilde guncellendi

### 2. Settings Resolver Wired Flag Duzeltmesi
- 3 setting artik gercekten wired -- flag'ler guncellendi
- wired_to aciklamalari gercek consumer'lari yansitiyor

### 3. Frontend Test Guncelleme
- final-ux-release-readiness-pack test'i M12 etiketlerini dogruluyor
- M11 aktif ve M12 aktif ayrimi yapiliyor

## Kalan Bilinen Sorunlar
- test_g_avg_production_duration_exact: pre-existing timing precision drift -- M12 regresyonu degil
- m7_c1 migration testleri: pre-existing Alembic test hatalari -- M12 regresyonu degil
- content_rules ve publish_profile resolver'da yukleniyor ama template'de bu alanlar istege bagli JSON -- bos olabilir. Bu beklenen davranis.

## Test-Only Mock'lar
- MagicMock template context guard'i (isinstance check) korunuyor -- test guvenligi icin gerekli
- Pre-existing test fixture'lar korunuyor -- gercek test degerine sahipler
