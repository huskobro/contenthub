# M19-A: Asset Backend Foundation Raporu

## Ozet
Varlik Kutuphanesi icin workspace dizinlerinden salt-okunur disk taramasi ile asset index backend'i kuruldu.

## Tasarim Karari
- **Neden DB modeli degil:** Asset'ler workspace dizinlerinde zaten mevcut. Ayri bir DB tablosu + migration eklemek gereksiz karmasiklik yaratir. Disk taramasi deterministic, tekrarlanabilir ve gercek dosya sistemini yansitir.
- **Kaynak:** `backend/workspace/{job_id}/artifacts/` ve `preview/` dizinleri taranir.
- **Migration:** Gerekmedi. Veri kaynagi disk, DB degil.

## Yeni Dosyalar
- `backend/app/assets/__init__.py`
- `backend/app/assets/schemas.py` — AssetItem, AssetListResponse
- `backend/app/assets/service.py` — list_assets(), get_asset_by_id()
- `backend/app/assets/router.py` — GET /assets, GET /assets/{id}

## Endpoint'ler
### `GET /api/v1/assets`
Parametreler:
- `asset_type`: audio, video, image, data, text, subtitle, document, other
- `search`: dosya adinda case-insensitive arama
- `job_id`: belirli job'a ait asset'ler
- `limit`: sayfalama (1-500, varsayilan 100)
- `offset`: sayfalama offset'i

Yanitlar:
```json
{
  "total": 142,
  "offset": 0,
  "limit": 100,
  "items": [
    {
      "id": "job-uuid/artifacts/script.json",
      "name": "script.json",
      "asset_type": "data",
      "source_kind": "job_artifact",
      "file_path": "job-uuid/artifacts/script.json",
      "size_bytes": 1024,
      "mime_ext": "json",
      "job_id": "job-uuid",
      "module_type": "standard_video",
      "discovered_at": "2026-04-01T10:00:00+00:00"
    }
  ]
}
```

### `GET /api/v1/assets/{asset_id}`
- asset_id formati: `{job_id}/{subdir}/{filename}`
- 404 donuyor: dosya yok veya gecersiz subdir

## Ozellikler
- Dosya uzantisina gore otomatik asset_type siniflandirma (audio, video, image, data, text, subtitle, document, other)
- Job.module_type DB'den bulk olarak cekilir, her asset'e zenginlestirilir
- Tarih siralamasi (en yeni once)
- Hidden dosyalar (`.` ile baslayan) atlanir

## Test Sonuclari
- 11 test: **TAMAMI GECTI**
