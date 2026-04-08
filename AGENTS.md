# AGENTS.md

## Commands

```bash
# Backend
cd backend && python -m pytest tests/ -v                    # Run all backend tests (459 at M1 completion)
cd backend && python -m pytest tests/test_job_transitions.py -v  # State machine tests only
cd backend && python -m pytest tests/test_execution_contracts.py -v  # Contract tests only
cd backend && uvicorn app.main:app --reload --port 8000     # Run dev server (lifespan runs recovery + executor)
cd backend && alembic upgrade head                           # Apply migrations

# Frontend
cd frontend && npm install                                   # Install deps
cd frontend && npm run dev                                   # Vite dev server
cd frontend && npm run build                                 # Production build
cd frontend && npm run lint                                  # ESLint

# Database
# SQLite WAL mode at backend/data/contenthub.db -- auto-created on first run
```

## Architecture TL;DR

ContentHub is a localhost-first content production platform. Backend is FastAPI (Python) with layered architecture: routers (HTTP only) -> services (business logic) -> repositories/models (SQLAlchemy async + SQLite WAL). Frontend is React + Vite + TypeScript with React Query (server state) and Zustand (client-only UI state). Jobs use explicit state machines enforced at the service layer -- all status changes go through transition_job_status/transition_step_status. The executor (asyncio, semaphore-limited) dispatches queued jobs through PipelineRunner which runs steps sequentially. SSE via EventBus pushes progress events to connected clients. Startup recovery scanner reconciles incomplete jobs before accepting new work.

## Conventions

### File Organization
- Each domain has its own directory: router.py, service.py, schemas.py (and optionally exceptions.py)
- Contracts (shared enums, state machines, schemas) live in backend/app/contracts/
- Job execution infrastructure: executor.py, pipeline.py, workspace.py, timing.py, recovery.py in backend/app/jobs/
- SSE infrastructure: bus.py (EventBus), router.py (SSE endpoint) in backend/app/sse/
- Frontend API clients in frontend/src/api/, one per domain
- Frontend components organized by domain: frontend/src/components/jobs/, etc.

### Naming
- Python: snake_case for files, functions, variables. PascalCase for classes.
- TypeScript: camelCase for variables/functions, PascalCase for components/types.
- DB columns: snake_case. Enum values: lowercase strings stored directly.
- State machine states: lowercase string values (queued, running, completed, failed, etc.)
- Step executors: subclass StepExecutor ABC, override step_key() and execute()

### Import Patterns
- Contracts: `from app.contracts.enums import JobStatus, JobStepStatus`
- State machines: `from app.contracts.state_machine import JobStateMachine, StepStateMachine`
- DB models: `from app.db.models import Job, JobStep`
- Services: `from app.jobs.service import transition_job_status`
- SSE: `from app.sse.bus import event_bus`
- Pipeline: `from app.jobs.pipeline import PipelineRunner`

### Test Patterns
- Tests in backend/tests/test_*.py
- Async DB tests use `@pytest.mark.asyncio` with `AsyncSessionLocal` fixture
- Direct model creation helpers prefixed with `_create_*_direct`
- HTTP tests use `client: AsyncClient` fixture from conftest.py

### State Machine Rules
- ALL job/step status changes MUST go through service.transition_job_status / transition_step_status
- Direct ORM .status assignment is forbidden outside these functions
- Side effects (timestamps, retry_count, last_error) are applied automatically by transition functions
- Terminal states: completed, failed, cancelled (jobs); completed, failed, skipped (steps)

### M2 Patterns (to establish)
- Module registry: module_id -> step pipeline definition, input schema, gate defaults
- Provider interface: base class with invoke(input) -> output + trace
- Step executors for real steps (script, metadata, TTS, visuals, subtitle, composition) subclass StepExecutor

## Key Files

- `backend/app/contracts/state_machine.py` -- Job + step transition matrices (single source of truth)
- `backend/app/contracts/enums.py` -- All status enums, artifact types, provider kinds, SSE event types, StepIdempotencyType
- `backend/app/contracts/sse_events.py` -- SSE event payload schemas (10 event types)
- `backend/app/contracts/workspace.py` -- WorkspaceLayout: canonical path derivation for job artifacts
- `backend/app/jobs/service.py` -- Job CRUD + state machine enforcement + gateway functions for executor/pipeline
- `backend/app/jobs/executor.py` -- StepExecutor ABC (step_key() + execute()), asyncio executor dispatch
- `backend/app/jobs/pipeline.py` -- PipelineRunner: sequential step execution with SSE integration
- `backend/app/jobs/workspace.py` -- WorkspaceManager: job workspace init, artifact recording
- `backend/app/jobs/timing.py` -- Elapsed time tracking + ETA v1 (fixed per-step estimates)
- `backend/app/jobs/recovery.py` -- Startup recovery scanner (reconcile incomplete jobs)
- `backend/app/jobs/exceptions.py` -- JobEngineError hierarchy
- `backend/app/sse/bus.py` -- EventBus (global + job-specific SSE streams)
- `backend/app/sse/router.py` -- SSE streaming endpoint
- `backend/app/main.py` -- FastAPI app factory with lifespan (recovery + executor startup/shutdown)
- `backend/app/db/models.py` -- All ORM models (Job, JobStep, Setting, VisibilityRule, User, AuditLog, etc.)
- `backend/app/db/session.py` -- Async session factory with WAL mode
- `backend/app/api/router.py` -- Central API router aggregating all domain routers
- `backend/tests/conftest.py` -- Test fixtures (AsyncClient, DB session)
- `CLAUDE.md` -- Product constitution and non-negotiable rules
- `.kiln/master-plan.md` -- Synthesized milestone plan with chunks and acceptance tests
