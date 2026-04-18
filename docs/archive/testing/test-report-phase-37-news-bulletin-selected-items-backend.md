# Test Report — Phase 37: News Bulletin Selected Items Backend Foundation

**Date:** 2026-04-02
**Phase:** 37
**Scope:** news_bulletin_selected_items model, migration, schemas, service, router

## Test Results

### Backend Tests

| Suite | Tests | Result |
|---|---|---|
| test_news_bulletin_selected_items_api.py | 8 | PASSED |
| All other suites | 166 | PASSED |

**Total: 174/174 PASSED**

## Tests Added

1. news_bulletin_selected_items table exists after migration
2. POST /{id}/selected-news — create selection with sort_order and selection_reason
3. GET /{id}/selected-news — list selections ordered by sort_order asc
4. PATCH /{id}/selected-news/{sel_id} — update sort_order and selection_reason
5. GET with unknown bulletin_id → 404
6. POST with unknown news_item_id → 404
7. PATCH with unknown selection_id → 404
8. Duplicate news item in same bulletin → 409

## Design Notes

- `UniqueConstraint("news_bulletin_id", "news_item_id")` — same item cannot be selected twice in same bulletin
- `IntegrityError` caught in service (rollback) and re-raised; router catches it and returns HTTP 409
- `sort_order` validated non-negative in schema
- `selected_news_ids_json` field on NewsBulletin left untouched — these two systems coexist

## Known Limitations

- No delete endpoint (intentionally deferred)
- No bulk reorder (deferred)
- No automatic sync with selected_news_ids_json (deferred)
- No used-news enforcement (deferred)
