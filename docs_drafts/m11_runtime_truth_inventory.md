# M11 Runtime Truth Inventory

## Overview

After M11, 16 of 19 known settings are wired to actual runtime consumers. This document inventories each runtime connection path.

## Settings Resolver

- 16 out of 19 KNOWN_SETTINGS entries now have verified runtime consumers.
- The remaining 3 are defined in the registry but their target consumers do not yet exist or still use internal constants.

## Provider Settings Flow

- `main.py` calls the settings resolver at startup to obtain credential and provider configuration values.
- Resolved values are passed directly to provider constructors (`KieAiProvider`, `OpenAICompatProvider`, `PexelsProvider`, `PixabayProvider`, `EdgeTTSProvider`).
- Providers receive their configuration as constructor arguments, not by reading settings themselves.

## Template Context

- Template context flows through the chain: dispatcher -> pipeline -> composition executor.
- The composition executor receives template context as a dict and applies it during render preparation.
- A MagicMock guard was added: `isinstance(template_ctx, dict)` prevents test mocks from being treated as valid template data.

## Audit Log

- Audit log service created and instrumented across core subsystems.
- Instrumented actions:
  - Settings changes (create, update)
  - Credential changes (create, update, delete)
  - Visibility rule changes (create, update)
  - Publish actions
- Each audit entry records the action, target entity, actor, and timestamp.

## Visibility Runtime

- `visibility/resolver.py` provides `resolve_visibility()` which queries `VisibilityRule` rows, applies scope filters, and resolves by highest priority.
- `visibility/dependencies.py` provides `require_visible()` as a FastAPI dependency factory that raises HTTP 403 when visibility is denied.
- A `GET /visibility-rules/resolve` endpoint is available for client-side visibility queries.

## Publish Scheduler

- A background asyncio task runs within the FastAPI application lifecycle.
- The scheduler polls for publish records where `scheduled_at` has passed and status is pending.
- When a scheduled publish is found, the scheduler triggers the publish flow.

## Dedupe Threshold

- `source_scans.soft_dedupe_threshold` is read from the settings resolver by `scan_engine`.
- The value is passed to `dedupe_service` for soft duplicate detection during news source scans.

## Analytics: provider_error_rate

- Previously returned `None` (placeholder).
- Now computed from real `JobStep` failure data in the database.
- Calculates the ratio of failed steps attributed to provider errors against total provider-involved steps.
