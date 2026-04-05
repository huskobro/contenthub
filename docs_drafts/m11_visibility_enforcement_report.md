# M11 Visibility Enforcement Report

## Overview

M11 introduced the runtime visibility resolver and a FastAPI guard dependency, making programmatic visibility enforcement available for backend routes.

## Components Created

### visibility/resolver.py

- Provides `resolve_visibility()` function.
- Queries `VisibilityRule` rows from the database.
- Applies scope filters (page, widget, field, wizard step).
- When multiple rules match, highest priority wins.
- Returns a resolution dict with the following format:

```
{"visible": bool, "read_only": bool, "wizard_visible": bool}
```

### visibility/dependencies.py

- Provides `require_visible()` as a FastAPI dependency factory.
- Accepts scope parameters (e.g., page name, field name).
- Calls `resolve_visibility()` internally.
- Raises HTTP 403 if the resolved visibility is `False`.
- Designed to be injected into route definitions via `Depends(require_visible(...))`.

### GET /visibility-rules/resolve Endpoint

- Added for client-side visibility queries.
- Accepts scope parameters as query arguments.
- Returns the same resolution format: `{"visible": bool, "read_only": bool, "wizard_visible": bool}`.
- Allows the frontend to check visibility before rendering UI elements.

## Audit Logging

- Visibility rule create and update actions are logged to the audit log.
- Each entry records the action type, target rule, actor, and timestamp.

## Current Limitation

- `require_visible()` is implemented and available as a FastAPI dependency, but it is **not yet applied to specific routes**.
- Route-level enforcement (decorating individual endpoints with visibility guards) is a follow-up task.
- Currently, visibility is queryable and enforceable, but enforcement must be explicitly added per route as the application matures.

## Usage Pattern (for future route wiring)

```python
@router.get("/some-page")
async def get_page(
    _vis=Depends(require_visible(scope="page", target="some-page"))
):
    ...
```

This pattern will return 403 automatically if the visibility rule for the given scope and target resolves to not visible.
