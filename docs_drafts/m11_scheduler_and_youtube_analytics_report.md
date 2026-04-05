# M11: Publish Scheduling and YouTube Operational Completion Report

## Overview

M11 added a background publish scheduler that polls for due scheduled publishes and triggers them automatically. YouTube adapter and OAuth were completed in M10; M11 ensured analytics integration produces real data.

## Publish Scheduler

### Implementation

- Created `backend/app/publish/scheduler.py`
- Core function: `poll_scheduled_publishes()` -- async background loop

### Behavior

- Queries `PublishRecord` rows where `status = 'scheduled'` AND `scheduled_at <= now(UTC)`
- For each due record, calls `trigger_publish()` from the publish service
- Writes an audit log entry for each trigger (`publish.scheduler.trigger`)
- Poll interval: 60 seconds (configurable via function parameter)

### Error Handling

- Never dies on error
- Catches all exceptions per-record and per-cycle
- Logs errors and continues to the next record / next poll cycle
- A single failing publish does not block other scheduled publishes

### Lifecycle Registration

- Registered in `backend/app/main.py` lifespan context manager
- Started via `asyncio.create_task()` during application startup
- Task reference stored in `app.state.scheduler_task`
- Clean shutdown: `scheduler_task.cancel()` called during lifespan teardown

## YouTube Analytics

- YouTube adapter (upload, status check) and OAuth flow were completed in M10
- M11 contribution: ensured `provider_error_rate` in analytics is computed from real `JobStep` data rather than returning a placeholder `None`
- This means YouTube publish failures now contribute to the operations analytics error rate metric
