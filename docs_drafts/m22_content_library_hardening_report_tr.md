# M22-D/E: Content Library Hardening — Rapor

## Ozet

Content Library backend'i Python-side merge/sort/paginate'ten SQL UNION ALL
tabanli birlesik sorguya gecti. Frontend'te has_script/has_metadata gosterimi
ve upload 201 status code duzeltmesi yapildi.

## M22-D: SQL UNION ALL Backend

### Yapilan Degisiklikler

1. **`app/content_library/service.py`** — Tamamen yeniden yazildi
   - Python-side `merge + sort + paginate` kaldirildi
   - Raw SQL `text()` ile UNION ALL sorgusu
   - Correlated subquery'ler: `has_script` ve `has_metadata` icin EXISTS kontrolleri
   - SQL-level `ORDER BY created_at DESC`, `LIMIT/OFFSET`
   - SQLite uyumlu syntax (parantezsiz UNION ALL)
   - content_type filtresi varsa sadece ilgili tablo sorgulanir

### SQL Yapisi

```sql
-- Standard Video subquery
SELECT sv.id, 'standard_video' AS content_type, sv.title, sv.topic, sv.status,
       sv.created_at,
       CASE WHEN EXISTS (SELECT 1 FROM standard_video_scripts ...) THEN 1 ELSE 0 END AS has_script,
       CASE WHEN EXISTS (SELECT 1 FROM standard_video_metadata ...) THEN 1 ELSE 0 END AS has_metadata
FROM standard_videos sv WHERE ...

UNION ALL

-- News Bulletin subquery
SELECT nb.id, 'news_bulletin' AS content_type, ...
FROM news_bulletins nb WHERE ...

-- Dis sorgu
SELECT * FROM (union_sql) ORDER BY created_at DESC LIMIT :lim OFFSET :off
```

### Performans Iyilestirmesi

| Metrik | Eski (Python-side) | Yeni (SQL-side) |
|--------|-------------------|-----------------|
| Veri transferi | Tum satirlar cekilir | Sadece sayfa kadar |
| Siralama | Python sorted() | SQL ORDER BY |
| Sayfalama | Python slice | SQL LIMIT/OFFSET |
| Filtreleme | Python filter | SQL WHERE |
| has_script/has_metadata | Ayri sorgular | Correlated subquery |

## M22-E: Library UX Hardening

### Upload 201 Status Code

2. **`app/assets/router.py`** — Upload endpoint status_code 200 → 201
   - HTTP semantik dogruluk: kaynak olusturma 201 donmeli
   - Eski testler guncellendi (200 → 201)

### Frontend has_script/has_metadata

3. **`src/pages/admin/ContentLibraryPage.tsx`** — Guncellendi
   - "Icerik" sutun basligi eklendi
   - `has_script=true` → mavi "Script" badge (`data-testid="library-has-script-{id}"`)
   - `has_metadata=true` → yesil "Meta" badge (`data-testid="library-has-metadata-{id}"`)
   - false degerler icin badge gosterilmez

### Clone Navigasyonu

4. Klonlama sonrasi otomatik navigasyon eklendi
   - Clone basarili → 800ms sonra yeni kayda yonlendirme
   - standard_video → `/admin/standard-videos/{id}`
   - news_bulletin → `/admin/news-bulletins/{id}`

## Test Sonuclari

### Backend
- `test_content_library_sql_union` — PASSED
- `test_content_library_has_script_metadata_fields` — PASSED
- `test_content_library_sorting_consistency` — PASSED
- `test_content_library_pagination_sql` — PASSED
- `test_upload_returns_201` — PASSED

### Frontend
- `shows Script badge when has_script is true` — PASSED
- `shows Meta badge when has_metadata is true` — PASSED
- `does not show Script badge when has_script is false` — PASSED
- `does not show Meta badge when has_metadata is false` — PASSED
- `table has Icerik column header` — PASSED

## SQLite Uyumluluk Notlari

- `(subquery) UNION ALL (subquery)` SQLite'ta calismaz → parantezsiz kullanildi
- `AS alias` UNION ALL sonucunda SQLite'ta zorunlu degil → kaldirildi
- Raw SQL datetime string olarak donuyor → `str(row[5])` kullanildi

## Bilinen Sinirlamalar

- Full-text search henuz yok (LIKE %pattern% kullaniliyor)
- Content type filtresi sadece standard_video ve news_bulletin destekliyor
- Ek modul tipleri icin UNION ALL'a yeni subquery eklenmesi gerekecek
- has_script/has_metadata icin index onerisi: buyuk veri setlerinde performans icin gerekebilir
