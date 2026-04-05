# M21-G: Test Sonuclari

**Tarih:** 2026-04-05

---

## Backend Test Sonuclari

```
pytest tests/ -v --ignore=tests/test_alembic_fresh_db.py --ignore=tests/test_m7_c1_migration_fresh_db.py
1167 passed, 0 failed, 1 warning
Süre: ~38 saniye
```

### M21 Yeni Testler (17 test)

| Test | Durum |
|------|-------|
| test_upload_valid_file | PASSED |
| test_upload_blocked_extension | PASSED |
| test_upload_hidden_file | PASSED |
| test_upload_empty_filename | PASSED |
| test_upload_no_file | PASSED |
| test_upload_with_asset_type | PASSED |
| test_clone_standard_video | PASSED |
| test_clone_standard_video_not_found | PASSED |
| test_clone_news_bulletin | PASSED |
| test_clone_news_bulletin_not_found | PASSED |
| test_content_library_list | PASSED |
| test_content_library_filter_type | PASSED |
| test_content_library_filter_invalid_type | PASSED |
| test_content_library_search | PASSED |
| test_content_library_pagination | PASSED |
| test_content_library_contains_created_records | PASSED |
| test_content_library_item_fields | PASSED |

---

## Frontend Test Sonuclari

```
npx vitest run
164 test files, 2174 tests passed, 0 failed
Süre: ~10 saniye
```

### M21 Yeni Testler (16 test)

| Test | Durum |
|------|-------|
| M21-B: renders upload area | PASSED |
| M21-B: renders file input | PASSED |
| M21-B: renders upload button | PASSED |
| M21-B: upload button is not disabled | PASSED |
| M21-D: renders heading | PASSED |
| M21-D: renders filter area | PASSED |
| M21-D: renders content list section | PASSED |
| M21-D: renders table with items | PASSED |
| M21-D: displays total count | PASSED |
| M21-D: renders actions area with clone description | PASSED |
| M21-C: renders clone button for each item | PASSED |
| M21-C: clone buttons show 'Klonla' text | PASSED |
| M21-C: renders detail buttons for each item | PASSED |
| M21-A: uploadAsset function exists | PASSED |
| M21-D: fetchContentLibrary function exists | PASSED |
| M21-D: clone functions exist | PASSED |

### Guncellenen Testler (4 dosya)

| Dosya | Neden |
|-------|-------|
| m20-content-library-operations.smoke.test.tsx | Unified endpoint mock |
| library-gallery-content-management-pack.smoke.test.tsx | Unified endpoint mock + "Detay" text |
| asset-library-media-resource-management-pack.smoke.test.tsx | M20→M21 aktif |
| final-ux-release-readiness-pack.smoke.test.tsx | M20→M21 aktif |

---

## TypeScript

```
npx tsc --noEmit
Hata yok
```
