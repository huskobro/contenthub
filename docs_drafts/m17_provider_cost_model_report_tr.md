# M17-D — Provider Cost Model Raporu

## Ozet

Provider bazli maliyet gorunurlugu guncellendi. Artik her provider icin maliyetin actual (gercek), estimated (tahmin) veya unsupported (desteklenmiyor) oldugu acikca belirtilmektedir.

## Maliyet Kategorileri

| Kategori | Kosul | Renk | Aciklama |
|----------|-------|------|----------|
| actual | cost > 0 VE token verisi var | Yesil (#16a34a) | Trace'den gelen gercek maliyet. Provider'in input_tokens veya output_tokens verisi mevcut. |
| estimated | cost > 0 AMA token verisi yok | Sari (#d97706) | Executor bazinda statik tahmin. Gercek token sayisi bilinmiyor. |
| unsupported | cost = null veya 0 | Gri (#94a3b8) | Bu provider icin maliyet verisi uretilemiyor. |

## Uygulama Detayi

### Frontend: fmtCost() Fonksiyonu
```typescript
function fmtCost(p: ProviderStat): { text: string; badge: string; color: string }
```
- `total_estimated_cost_usd > 0` ve `(total_input_tokens > 0 veya total_output_tokens > 0)` → **actual**
- `total_estimated_cost_usd > 0` ama token yok → **estimated**
- Diger → **unsupported**

### Provider Tablosu Guncelleme
- "Tahmini Maliyet" kolonu → "Maliyet" olarak guncellendi
- Her maliyet hucresine renkli badge eklendi
- Tablo altina cost model legend eklendi

## Mevcut Provider'larin Durumu

| Provider | Kind | Maliyet Durumu | Aciklama |
|----------|------|---------------|----------|
| openai | llm | actual/estimated | Script/metadata executor'da cost_usd_estimate ve token verisi uretir |
| edge_tts | tts | unsupported | TTS provider, maliyet verisi yok |
| dall-e | visual | estimated | Gorsel provider, statik maliyet tahmini |

## Bilinen Sinirlamalar

1. Backend'de maliyet hesaplama hala statik — executor bazinda sabit deger. Otomatik provider-bazli fiyatlandirma modeli yok.
2. actual/estimated ayrimi yalnizca frontend'de token varligi ile yapilir. Backend ayri bir "cost_type" alani gondermez.
3. Gelecekte provider-bazli fiyatlandirma tablolari eklenebilir.

## Test Sonuclari

| Test | Durum |
|------|-------|
| Frontend: cost model legend shown with provider stats | PASSED |
| Frontend: provider cost badge shows "actual" when tokens exist | PASSED |
