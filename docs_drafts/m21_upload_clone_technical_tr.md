# M21 Teknik Detaylar: Upload ve Clone

**Tarih:** 2026-04-05

---

## Asset Upload (M21-A)

### Endpoint
```
POST /api/v1/assets/upload
Content-Type: multipart/form-data
```

### Request
- `file` (zorunlu): Yuklenecek dosya
- `asset_type` (opsiyonel): Tip ipucu (audio, video, image, data, text, subtitle, document, other)

### Response (200)
```json
{
  "status": "uploaded",
  "asset_id": "sha256-hex",
  "name": "dosya_adi.mp3",
  "asset_type": "audio",
  "size_bytes": 1234567,
  "message": "Basariyla yuklendi: dosya_adi.mp3"
}
```

### Hata Kodlari
| Kod | Durum |
|-----|-------|
| 400 | Gecersiz dosya adi, engellenen uzanti, bos dosya |
| 413 | Boyut siniri asildi (>100 MB) |
| 422 | Eksik form data |

### Guvenlik Katmanlari
1. Dosya adi sanitizasyonu (`_SAFE_FILENAME_RE`)
2. Gizli dosya engelleme (dot-prefix)
3. Engellenen uzanti listesi (13 uzanti)
4. Yol gecisi koruması (path separator kontrolu)
5. Benzersiz isim uretimi (sessiz uzerine yazma yok)

### Hedef Dizin Yapisi
```
workspace/
  _uploads/
    artifacts/
      dosya_adi.mp3
      dosya_adi_1.mp3  (cakisma durumunda)
```

---

## Content Clone (M21-C)

### Standard Video Clone
```
POST /api/v1/modules/standard-video/{item_id}/clone
```

**Kopyalanan alanlar:**
- topic, title (+ " (kopya)"), brief, target_duration_seconds
- tone, language, visual_direction, subtitle_style

**Sifirlanan alanlar:**
- id: yeni UUID
- status: "draft"
- job_id: None
- created_at/updated_at: yeni zaman damgalari

**Klonlanmayan:**
- Script, metadata — temiz draft baslar

### News Bulletin Clone
```
POST /api/v1/modules/news-bulletin/{item_id}/clone
```

**Kopyalanan alanlar:**
- topic, title (+ " (kopya)"), brief, target_duration_seconds
- language, tone, bulletin_style, source_mode

**Sifirlanan alanlar:**
- id: yeni UUID
- status: "draft"
- job_id: None
- selected_news_ids_json: None

**Klonlanmayan:**
- Secilmis haberler, script, metadata

---

## Unified Content Library (M21-D)

### Endpoint
```
GET /api/v1/content-library
```

### Query Parameters
| Parametre | Tip | Varsayilan |
|-----------|-----|-----------|
| content_type | string | None (hepsi) |
| status | string | None |
| search | string | None |
| limit | int | 50 |
| offset | int | 0 |

### Response
```json
{
  "total": 42,
  "offset": 0,
  "limit": 50,
  "items": [
    {
      "id": "uuid",
      "content_type": "standard_video",
      "title": "Video Basligi",
      "topic": "Konu",
      "status": "draft",
      "created_at": "2026-04-05T10:00:00",
      "has_script": false,
      "has_metadata": false
    }
  ]
}
```

### Mimari
- Iki modul (SV + NB) ayri SQL sorgulariyla cekilir
- Her kayit icin script/metadata varligi hesaplanir
- Sonuclar created_at DESC siralanir
- Python-side sayfalama (offset/limit)
- Frontend eskiden iki ayri hook (useStandardVideosList + useNewsBulletinsList) kullaniyordu
- Simdi tek `useContentLibrary` hook'u kullaniliyor
