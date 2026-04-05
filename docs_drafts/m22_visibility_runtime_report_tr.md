# M22-A: Visibility Runtime Trust Completion — Rapor

## Ozet

Visibility runtime'da bulunan "permissive fallback" sorunu giderildi. API hatasi durumunda
sistem artik sessizce tam erisim vermek yerine guvenli bir fallback stratejisi uyguluyor.

## Yapilan Degisiklikler

### Backend

1. **`app/visibility/service.py`** — `delete_rule()` ve `bulk_update_status()` eklendi
   - Soft-delete: status → inactive (fiziksel silme yok)
   - Zaten inactive kurali tekrar silme 409 donuyor
   - Bulk status guncelleme: birden fazla kurali tek islemde aktif/inaktif yapabilme
   - Her iki islem audit log yaziyor

2. **`app/visibility/router.py`** — DELETE `/{rule_id}` ve POST `/bulk-status` endpoint'leri eklendi
   - Route siralama: `/bulk-status` path-parameter route'dan once tanimli

### Frontend

3. **`src/api/visibilityApi.ts`** — Tamamen yeniden yazildi
   - `resolveVisibility()` artik API hatasinda `throw Error` yapiyor (eski: sessiz permissive default)
   - `deleteVisibilityRule()` fonksiyonu eklendi

4. **`src/hooks/useVisibility.ts`** — Tamamen yeniden yazildi
   - Hata fallback stratejisi: `visible=true, read_only=true, wizard_visible=false`
   - Prensip: "Gorebilirsin ama degistiremezsin" — goruntuyu engelleme, mutasyonu engelle
   - Loading durumunda ayni strateji
   - `isError` flag'i return degerine eklendi
   - `retry: 1` (onceki: false) — bir kere yeniden dene

## Guvenlik Analizi

| Senaryo | Eski Davranis | Yeni Davranis |
|---------|--------------|---------------|
| API 500 hatasi | visible=true, read_only=false (TAM ERISIM) | visible=true, read_only=true (SALT OKUNUR) |
| API timeout | visible=true, read_only=false (TAM ERISIM) | visible=true, read_only=true (SALT OKUNUR) |
| Network kesintisi | visible=true, read_only=false (TAM ERISIM) | visible=true, read_only=true (SALT OKUNUR) |
| Normal calisma | Dogru sonuc | Dogru sonuc |

## Test Sonuclari

- `test_visibility_delete_rule` — PASSED
- `test_visibility_delete_already_inactive` — PASSED
- `test_visibility_delete_not_found` — PASSED
- `test_visibility_bulk_status` — PASSED
- `test_visibility_resolve_after_delete` — PASSED
- Frontend: `resolveVisibility throws on API error` — PASSED
- Frontend: `useVisibility hook provides isError flag` — PASSED
- Frontend: `deleteVisibilityRule function exists` — PASSED

## Bilinen Sinirlamalar

- Visibility rule history/versiyon takibi henuz yok (gelecek faz)
- Bulk delete endpoint yok, sadece bulk status update var
- Frontend tarafinda visibility cache invalidation SSE uzerinden henuz yapilmiyor
