# M11 Mock and Placeholder Cleanup Report

## Overview

M11 addressed several mock/placeholder issues that were producing incorrect behavior or dishonest status claims.

## Fixes Applied

### Python 3.9 Test Collection Fix

- Problem: Four test files used Python 3.10+ type union syntax (`X | Y`), causing collection failures on Python 3.9.
- Fix: Added `from __future__ import annotations` to the affected test files.
- Files fixed: 4 test modules.

### MagicMock Template Context Fix

- Problem: The composition executor used a truthy check on `template_ctx`, which evaluated `MagicMock` objects as truthy during tests, causing unexpected code paths to execute.
- Fix: Changed the check to `isinstance(template_ctx, dict)` so that only real dict template contexts are processed.

### Analytics provider_error_rate

- Problem: The `provider_error_rate` metric was returning `None` as a placeholder value.
- Fix: Now computes the actual error rate from `JobStep` failure data in the database.
- The metric reflects the ratio of provider-attributed failures to total provider-involved steps.

### Settings Wired Flags

- Problem: Some KNOWN_SETTINGS entries had `wired: True` flags that did not match reality.
- Fix: All 19 settings now have correct `wired` flags. 16 are marked `True` (verified runtime consumer exists), 3 are marked `False` (consumer not yet implemented).

## Remaining Known Issues

These items were identified during M11 but are pre-existing and not introduced by this milestone:

- **Analytics timing precision drift**: Some elapsed-time calculations in analytics may accumulate minor floating-point drift over long job durations. Tracked as known technical debt.
- **YouTube token sharing in tests**: Test fixtures share a single mock OAuth token across test cases. This does not affect production but limits test isolation for YouTube-related flows.
