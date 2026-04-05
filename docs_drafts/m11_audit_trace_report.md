# M11: Audit Log and Provider Trace Activation Report

## Overview

M11 introduced a centralized audit logging service and expanded provider trace data to include template/style information. Four subsystems were instrumented with audit log calls.

## Audit Service

- Created `backend/app/audit/__init__.py` and `backend/app/audit/service.py`
- Core function: `write_audit_log()`

### Design Principles

- Never raises exceptions (all errors caught and logged internally)
- Never commits the transaction (caller owns session commit lifecycle)
- Uses `db.flush()` to persist the audit row within the caller's transaction

### Parameters

- `action` (str): the action being logged (e.g., `credential.save`)
- `entity_type` (str): type of entity involved
- `entity_id` (str): identifier of the entity
- `actor_type` (str, default `"system"`): who performed the action
- `actor_id` (str, optional): specific actor identifier
- `details` (dict, optional): additional structured metadata

## Instrumented Subsystems

### 1. Settings Router

- Action: `credential.save` -- logged when credentials are saved
- Action: `settings.effective.update` -- logged when effective settings are updated

### 2. Visibility Service

- Action: `visibility.rule.create` -- logged when a new visibility rule is created
- Action: `visibility.rule.update` -- logged when an existing visibility rule is modified

### 3. Publish Service

- Action: `publish.status_transition` -- logged in `_transition_status()` on every publish state change
- Details include previous and new status values

### 4. Publish Scheduler

- Action: `publish.scheduler.trigger` -- logged each time a scheduled publish is triggered by the background loop

## Provider Trace Enrichment

- Provider trace already existed in the pipeline infrastructure
- M11 enriched the composition step's provider trace with template and style blueprint data
- This means audit/debugging of composition output can now trace back to the exact template version and style rules used

## Analytics: provider_error_rate

- Previously returned `None` (placeholder)
- Now computed from real `JobStep` data
- Examines steps: script, metadata, tts, visuals
- Calculates the ratio of failed steps to total steps across those provider-backed step types
