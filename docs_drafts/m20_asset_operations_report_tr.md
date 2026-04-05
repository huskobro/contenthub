# M20-A: Asset Operations Backend Raporu

## Ozet
Asset Library salt-okunur olmaktan cikti. Gercek backend operasyonlari (silme, yenileme, konum gosterme, izin sorgulama) eklendi. Tum operasyonlar guvenlik kontrollerinden gecer ve audit log'a yazilir.

## Yeni Endpoint'ler

### `POST /api/v1/assets/refresh`
- Workspace disk taramasini yeniden tetikler
- Toplam taranan asset sayisini dondurur
- Audit log'a yazilir

### `DELETE /api/v1/assets/{asset_id}`
- Workspace altindaki gercek dosyayi siler
- Path traversal koruması aktif:
  - subdir sadece "artifacts" veya "preview" olabilir
  - filename icinde "/" veya ".." olamaz
  - job_id icinde ".." veya "/" olamaz
  - resolved path workspace root altinda olmak zorunda
  - hidden dosyalar (. ile baslayan) reddedilir
- Silinen dosya listeden kaybolur
- 400: gecersiz path / guvenlik reddi
- 404: dosya bulunamadi
- Audit log'a yazilir

### `POST /api/v1/assets/{asset_id}/reveal`
- Dosyanin bulundugu path bilgisini guvenli metadata olarak dondurur
- Platform bagimsiz: OS "finder ac" islemi yapmaz
- absolute_path, directory, exists alanlari
- 404: gecersiz path
- Audit log'a yazilir

### `GET /api/v1/assets/{asset_id}/allowed-actions`
- Bu asset icin izin verilen aksiyonlari listeler
- Dosya mevcutsa: ["delete", "reveal", "refresh"]
- Dosya yoksa: ["refresh"]
- 404: gecersiz path

## Guvenlik Kontrolleri
- `_validate_asset_path()`: merkezi path dogrulama fonksiyonu
- Izinli subdir'ler: sadece "artifacts" ve "preview"
- Path traversal: ".." kontrolu job_id ve filename'de
- Hidden file koruması: "." ile baslayan dosyalar reddedilir
- Resolved path kontrolu: son olarak file_path.resolve() workspace root altinda mi diye kontrol edilir

## Audit Log Entegrasyonu
- asset.refresh: toplam taranan sayi
- asset.delete: silinen dosya ID'si
- asset.reveal: exists durumu

## Test Sonuclari
- 16 backend testi: **TAMAMI GECTI**

## Degisen Dosyalar
- `backend/app/assets/service.py` — yeni operasyon fonksiyonlari
- `backend/app/assets/router.py` — 4 yeni endpoint
- `backend/app/assets/schemas.py` — operasyon response modelleri
- `backend/tests/test_m20_asset_operations.py` — 16 test
