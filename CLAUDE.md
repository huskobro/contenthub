# CLAUDE.md

## Project
ContentHub is a localhost-first modular content production and publishing platform.
It is not a simple CMS. It combines:
- content creation
- publishing workflows
- operations visibility
- analytics
- template/style management
- news source ingestion

The first goal is a clean local MVP running on a single machine.
Do not optimize for SaaS, billing, or multi-tenant complexity yet.
Keep the architecture future-ready, but do not add premature enterprise layers.

## Core Stack
- Backend: FastAPI (Python)
- Frontend: React + Vite + TypeScript
- Client state: Zustand
- Server state: React Query
- Database: SQLite with WAL mode
- Rendering: Remotion
- Realtime updates: SSE
- Queue: in-process async job queue
- Storage: local workspace / artifact storage

## Non-Negotiable Rules
- Build from scratch. Do not copy code from any external repository.
- No hidden master prompts.
- No hidden settings.
- No invisible behavior outside admin visibility.
- No silent magic flags.
- All critical behavior must be visible and manageable in the admin panel.
- All important templates, policies, blueprints, and rules must be versioned or traceable.
- AI may not generate uncontrolled render code.
- Use safe composition mapping for Remotion-related output decisions.
- Prefer deterministic services/scripts over burying logic in prompts.
- Do not create monolithic god-functions.
- Do not create parallel patterns if an approved pattern already exists.
- Do not add out-of-scope features.
- Do not use "we will refactor later" shortcuts.
- Fail fast where correctness matters.
- Every meaningful change must be tested, documented, and checkpointed in git.
- All operator-facing behavior (prompts, thresholds, defaults, editorial patterns, scoring rules) must be manageable through the Settings Registry — not hardcoded in service/pipeline code.
- Prompt texts used by AI steps must be stored as settings with type "prompt" and appropriate module_scope — never embedded as string literals in code. Use structured naming: `{module}.prompt.{purpose}` (e.g., `news_bulletin.prompt.narration_system`).
- When a job starts, all effective settings and prompt values relevant to that job must be snapshot-locked alongside template snapshots — runtime config changes must not affect running jobs.
- Core invariants (state machine rules, security guards, pipeline step order, validation enforcement) remain in code and cannot be disabled from admin panel.
- Every new feature, module, behavior, or prompt must ship with its own settings management surface. Checklist: (1) Settings key defined in KNOWN_SETTINGS? (2) Visible in admin Settings page? (3) If prompt type, visible in Master Prompt Editor? (4) If wizard parameter, visible in wizard governance? (5) If module toggle, managed via `module.{id}.enabled` in Settings Registry?

## Product Priorities
First-version priorities:
- Admin panel
- User panel
- Settings Registry
- Visibility Engine
- Wizard flows
- Cmd+K style command palette
- Notification Center
- Job engine
- Step timeline
- elapsed time + ETA tracking
- Job Detail page
- Standard Video module
- News Bulletin module
- Source registry
- manual and auto source scan
- used-news prevention / dedupe
- Template system
- Style Blueprint system
- YouTube publish v1
- Analytics v1

Do not add early:
- multi-tenant architecture
- billing
- licensing system
- organization management
- external brokers
- heavy cloud dependencies
- speculative abstractions without immediate need

## Panels
### Admin Panel
Admin must be able to manage:
- settings
- visibility rules
- templates
- style blueprints
- sources
- jobs
- publish records
- analytics
- audit logs

Admin also controls:
- which fields users can see
- which fields are editable
- which wizard steps are visible
- whether users are in guided mode or advanced mode

### User Panel
User panel must stay simple.
Do not expose unnecessary technical detail by default.
Support:
- Guided Mode
- Advanced Mode

### Shell Implementation
The admin and user panels are implemented as independent Aurora shells:
- `AuroraAdminLayout` — admin runtime shell (sidebar, ctxbar, inspector slots for admin)
- `AuroraUserLayout` — user runtime shell (simpler chrome, guided/advanced mode aware)
- `DynamicAdminLayout` / `DynamicUserLayout` — surface resolver dispatcher; chooses Aurora shell vs legacy layout based on active surface

Routes under `/admin/*` mount through `DynamicAdminLayout`; routes under `/user/*` mount through `DynamicUserLayout`. When the active surface is `aurora`, both dispatchers resolve to their Aurora shell; otherwise they fall back to the legacy layout.

Admin and user panels are separate information architectures. A single page component may be mounted in both shells (see `Canonical Route Vocabulary`), but the shell chrome, navigation, and visibility rules stay independent. A user in the admin shell and the same user in the user shell are not interchangeable contexts.

## Settings Registry
Settings are product objects, not ad-hoc config.
Each setting should support metadata such as:
- key
- group/category
- type
- default value
- admin value
- user override allowed
- visible to user
- visible in wizard
- read-only for user
- module scope
- help text
- validation rules
- version/status

Do not hardcode important behavior if it belongs in settings.

## Visibility Engine
Visibility is a core subsystem.
Use it to control:
- page visibility
- widget visibility
- field visibility
- wizard step visibility
- read-only vs editable behavior

Enforce visibility server-side.
Reflect visibility client-side for UX.
Do not leak hidden settings or hidden fields to the client.

## Wizards
Wizards are required for:
- onboarding
- content creation
- news source setup
- publish flows
- template/style selection

Guided Mode and Advanced Mode must coexist.
Wizards must simplify decisions, not hide critical product logic.
Users should not be forced into blind configuration for highly visual choices.

## Preview-First UX
Users must be able to understand the likely impact of major visual choices before final output generation.
For highly visual decisions, do not rely on text-only configuration.

Support preview-assisted selection for:
- subtitle styles
- video visual styles
- layout/composition directions
- motion/effect levels
- lower-third styles
- thumbnail directions
- template/style variants

Preferred preview forms:
- style cards
- mock frames
- subtitle overlay samples
- lower-third samples
- thumbnail samples
- lightweight draft compositions

Rules:
- previews must be clearly distinguished from final outputs
- previews must stay traceable to template/style blueprint versions
- previews should be cheaper and faster than full final render where possible
- do not force users to choose major visual settings blindly
- do not misrepresent previews as guaranteed final output

## Content Modules
Current target modules:
- standard_video
- news_bulletin
- product_review
- educational_video
- howto_video

Modules must be pluggable.
Do not fork the core architecture per module.
Avoid module-level copy-paste pipelines.

## Job Engine
Jobs are first-class objects.
Each job must have:
- state
- owner
- current step
- timestamps
- elapsed total time
- ETA
- retry count
- workspace/artifact references

Each step must have:
- state
- timestamps
- elapsed step time
- ETA if active
- logs
- artifact references
- provider trace where relevant

Use explicit state machines for jobs and steps.
Do not allow uncontrolled state transitions.

## Job Detail Requirements
Job Detail is a core operational page, not a shallow status page.
It must support:
- Overview
- Timeline
- Logs
- Artifacts
- Provider Trace
- Decision Trail
- Retry History
- Review State
- Publish Linkage
- Actions

A user/admin should be able to understand what happened to a job from one page.

## Elapsed Time and ETA
Every job must show:
- elapsed total time
- current step elapsed time
- ETA at job level
- ETA at step level where relevant

ETA v1 may use historical averages.
Recalculate ETA after retries or meaningful step changes.
Present ETA as approximate, not guaranteed.
Avoid fake precision.

## Templates and Styles
Separate these concepts clearly:
- Style Template
- Content Template
- Publish Template
- Style Blueprint

Requirements:
- support system/admin/user ownership
- support template families
- support version locking for jobs
- do not break old jobs when templates evolve
- keep preview artifacts aligned with template/blueprint versions
- avoid template sprawl and near-duplicate clutter

## Style Blueprint Rules
Style Blueprints are visible, admin-managed, and versioned.
They define rules for:
- visual identity
- motion style
- layout direction
- subtitle style
- thumbnail direction
- disallowed elements
- preview strategy

AI may assist with style variants, but:
- it must not write uncontrolled render code
- it must remain within blueprint constraints
- it should generate controlled preview artifacts where relevant

## News Module and Source Management
Support source types:
- RSS
- manual URL
- API source

Track:
- source health
- trust level
- scan history

Support scan modes:
- manual
- auto
- curated

Support:
- news normalization
- used news registry
- hard dedupe
- soft dedupe

Semantic dedupe can come later.
Allow controlled follow-up exceptions.
Do not generate news content without dedupe protections.

## Publishing
Publishing Hub must support:
- draft
- review
- schedule
- publish
- retry
- publish log

Start with YouTube publish v1.
Design adapters so more platforms can be added later without rewriting the core workflow.
Publishing must be auditable.
Do not bypass review/audit trail for critical publish actions.

## Analytics
Support four analytics views:
- Platform Overview
- Platform Detail
- Content Analytics
- Operations Analytics

Track at least:
- publish count
- failed publish count
- job success rate
- average production duration
- average render duration
- retry rate
- provider error rate
- template impact
- source impact
- module performance

Preview-related analytics can be added later.
Do not block future measurement of preview behavior.

## Backend Architecture
Use a layered structure:
- Router: HTTP only
- Service: business logic
- Repository/Model: persistence
- Shared contracts/schemas: stable interfaces

Dependencies flow inward.
Routers must not contain business logic.
Services may call other services, never routers.

## Frontend Architecture
Use a clear split:
- React Query for server-synchronized data
- Zustand for client-only UI state

Examples of Zustand:
- sidebar state
- modals
- wizard progress
- command palette state
- notification panel state
- local UI filters
- SSE connection state

Examples of React Query:
- jobs
- content items
- settings
- templates
- sources
- publish records
- analytics data

Do not duplicate server truth in multiple stores without reason.

### Surface System
The frontend is organized as surfaces. A surface is a self-contained UI layer with its own pages, layouts, tokens, and primitives. The canonical surface today is **Aurora**. Legacy top-level `frontend/src/pages/` files remain as fallback for non-Aurora surfaces and for auth/error edges.

- **Aurora** (`frontend/src/surfaces/aurora/`) is the canonical production surface. All new pages live here.
- **Legacy pages** (`frontend/src/pages/`) are fallback only. Do not add new pages there; fix-in-place is allowed for regression.
- **Surface registration** (`frontend/src/surfaces/manifests/register.tsx`) is the single source of truth mapping canonical page slots to their Aurora implementations. Every new Aurora page must have an entry here.
- **Surface resolver** (`frontend/src/surfaces/useSurfaceResolution.ts`) reads the active surface setting at runtime and dispatches to the correct layout + page binding.
- **Layout dispatchers** (`DynamicAdminLayout`, `DynamicUserLayout` in `frontend/src/app/layouts/`) pick between Aurora shells (`AuroraAdminLayout`, `AuroraUserLayout`) and legacy layouts based on surface resolution.

Rules:
- New pages: only inside `frontend/src/surfaces/aurora/`, with a matching `register.tsx` override entry and a mount in `frontend/src/app/router.tsx`.
- Never create a duplicate page under `pages/` when an Aurora page exists for the same slot. Duplicate routes make render outcomes ambiguous.
- Do not touch `register.tsx` or `useSurfaceResolution.ts` for anything other than new-page bindings unless the surface mechanism itself is being evolved.

### Theme System
Aurora ships with two production themes. Themes are CSS-variable overrides scoped to `[data-surface="aurora"][data-theme="<id>"]`.

- `aurora-dusk` — default dark theme (plum + teal palette). Fully tokenized.
- `obsidian-slate` — light theme (blue + purple palette). Token file coverage is complete in `tokens.css`, but some Aurora components still read overlay-family tokens that are defined only for Dusk. Slate therefore has partial class-context breakage until those references are migrated.

Token files of record:
- `frontend/src/styles/aurora/tokens.css` — semantic and overlay tokens for both themes.
- `frontend/src/styles/aurora/cockpit.css` — layout primitives and class-level styles.

Theme management store: `frontend/src/stores/themeStore.ts`. The active theme id is persisted under the localStorage key `contenthub:active-theme-id`; the active surface id under `contenthub:active-surface-id`.

Rules:
- Do not add a third theme until Dusk and Slate are both class-context complete. Partial themes are product breakage, not UX polish.
- Every new component or class must use theme-aware tokens (`var(--token-name)`). No hard-coded colors. No Dusk-only overlay tokens used without a Slate override.
- Visual QA for any new surface class is required in both themes before merge.

### Theme Availability and Gating
Theme availability is a user-facing product behavior, not an internal flag. Any gate that hides or blocks a theme from users must follow this policy:

- **Short-lived code gate** (hotfix scope only): a small, clearly commented constant or conditional in `themeStore.ts` or the theme switcher is acceptable when we need to hide a broken theme quickly. Such a gate must reference the tracking issue or branch that will remove it.
- **Persistent / operator-managed gate**: any gate intended to live beyond a hotfix window must move to the Settings Registry as a setting (e.g. `theme.{id}.enabled`) with admin visibility, audit trail, and versioning. Hidden or ad-hoc flags outside the Settings Registry are prohibited for durable product decisions (see Non-Negotiable Rules: "No hidden settings", "No silent magic flags").
- **localStorage fallback**: when a theme is gated off, the surface must refuse to render it even if a prior session persisted its id under `contenthub:active-theme-id`. Fall back to `aurora-dusk` (or the current default) deterministically.

### Canonical Route Vocabulary
Canonical paths are stable product contracts. Use them literally; do not shorten, rename, or fork.

| Canonical path | Component | Shells mounted |
|---|---|---|
| `/{shell}/channels/:channelId/branding-center` | `AuroraBrandingCenterPage` | admin, user |
| `/{shell}/projects/:projectId/automation-center` | `AuroraAutomationCenterPage` | admin, user |
| `/{shell}/channels/new` | `AuroraChannelOnboardingPage` | admin, user |

`{shell}` ∈ {`admin`, `user`}. Each canonical path is dual-mounted by design; the underlying component resolves the correct shell context at render time.

Forbidden literals (these paths are not mounted and will 404):
- `/admin/channels/:id/branding` — use `/branding-center`
- `/admin/projects/:id/automation` — use `/automation-center`

Rules:
- When adding a new CTA or link, run `rg "/branding\b"` and `rg "/automation\b"` first to catch short-literal mistakes.
- When renaming a canonical path, add a redirect route for the old path in `router.tsx`, sweep literal sources with `rg`, and update this table and `docs/architecture/canonical-routes-and-surfaces.md` in the same change.
- The full canonical inventory (all mounted paths, shell mappings, legacy fallbacks, and duplicate-risk notes) lives in `docs/architecture/canonical-routes-and-surfaces.md`. This CLAUDE.md table is the contract; the doc is the ledger.

### Shell Branching Rule
`/admin/*` and `/user/*` are independent information architectures. A page component may be mounted in both shells, but the URL prefix is the source of truth for "which shell am I in."

- Derive the active shell from the current URL, not from the caller's role.
- Forbidden pattern: `const baseRoute = isAdmin ? "/admin" : "/user"`. This silently teleports a user across shells and corrupts back-navigation, audit trails, and the user's mental model.
- Required pattern: derive shell from `useLocation().pathname` (or a route-scoped context that encodes the current shell). Example: `const baseRoute = useLocation().pathname.startsWith("/admin") ? "/admin" : "/user"`.
- An admin-role user visiting `/user/*` must stay in the user shell. Cross-shell navigation is an explicit user action (e.g., a "Switch to admin panel" control), never an implicit side effect of a card click.
- This rule applies to every Aurora page. Violations are regressions even if the render output looks correct.

## Realtime
Use SSE for real-time updates.
SSE events should be used to:
- update progress
- invalidate or patch query data
- create notifications
- update visibility/settings manifests if required

Do not use polling if SSE already covers the use case.

## File and Workspace Rules
Use local workspace/artifact storage.
Keep a clear distinction:
- final artifacts
- preview artifacts
- temporary processing files

Suggested roles:
- workspace/: job artifacts and durable local outputs
- .tmp/: disposable intermediate files
- execution/: deterministic helper scripts if needed
- docs/: architecture, product, test, and operator docs

Everything temporary should be safe to regenerate.
Do not treat temp files as source of truth.

## Testing Strategy
Every meaningful change must include relevant tests and a written record of results.

Test categories:
- Unit tests
- Integration tests
- Route/API smoke tests
- UI smoke tests
- Permission tests
- Visibility tests
- State machine tests
- Restart recovery tests
- Workspace integrity tests
- Render smoke tests
- Publish simulation tests
- Analytics aggregation tests
- Manual QA checklists
- Real-browser Aurora QA (see below)

Prefer targeted tests over blindly running everything when appropriate, but do not skip required coverage.

### Real-Browser Aurora QA Tier
Any Aurora UI change that affects layout, theme tokens, navigation, or shell chrome must be validated in a real browser before merge. Static token analysis and unit tests are not sufficient for this tier.

Minimum coverage for an Aurora change:
- **Dusk + Slate theme coverage** — both themes rendered and visually inspected on the affected page. Token regressions in one theme block merge.
- **Admin + User shell coverage** — pages mounted in both shells are opened under both `/admin/*` and `/user/*` to confirm chrome, navigation, and shell-aware rendering stay correct.
- **Shell-cross regression check** — confirm that role-only navigation never silently redirects a user from `/user/*` to `/admin/*` (or vice versa). See Shell Branching Rule.
- **Canonical path check** — confirm that no CTA or link produces a forbidden literal (`/branding`, `/automation`) instead of its canonical path. See Canonical Route Vocabulary.
- **State matrix** — for affected components, exercise hover, focus-visible, selected, loading, empty, and error states. Empty vs loading vs error must be visually distinguishable.
- **Contrast check** — small secondary text must meet WCAG 2.1 AA (4.5:1 normal, 3:1 large) in both themes.

Record the real-browser QA outcome (pages tested, issues found, acceptance decision) alongside the change; do not substitute a static code review for this tier.

## Release Quality Gates
Before considering a change done, pass these gates:

### Code Quality Gate
- lint passes
- type checks pass
- tests pass
- no obvious dead code or broken imports

### Behavior Gate
- the intended workflow works
- permissions/visibility behave correctly
- state transitions are valid
- no hidden behavior was introduced

### Product Gate
- UX remains understandable
- user-facing complexity did not grow unnecessarily
- previews, wizard flows, and job visibility remain coherent

### Stability Gate
- restart/recovery path is acceptable
- workspace/artifacts remain consistent
- failure states are surfaced clearly
- no silent corruption paths

### Document Gate
- update relevant docs
- record what changed
- record what was intentionally not added
- record tests executed and results
- record technical debt or known limitations honestly

## Git Workflow
After every meaningful change:
1. make the change
2. run relevant tests
3. record the test results in documentation or change notes
4. create a local git commit checkpoint with a clear message
5. push to the current remote branch if a remote is configured and authentication is already working

Do not invent branch or remote workflows silently.
Do not force-push unless explicitly instructed.
If push is not possible, report it clearly and still create the local checkpoint.

## Documentation Discipline
Maintain living documentation.
When major architecture or workflow rules change:
- update CLAUDE.md
- update relevant subsystem docs
- record what changed and why
- record what is still intentionally deferred

If something is incomplete, say so clearly.
Do not hide technical debt.

## Phased Delivery Order
Build in this order unless explicitly told otherwise:
1. Product Constitution and frozen rules
2. Monorepo and technical skeleton
3. Admin/User shell and roles
4. Settings Registry
5. Visibility Engine
6. Command Palette and navigation
7. Notification Center
8. Job Engine
9. Step Runner and Timeline
10. ETA system
11. Job Detail
12. Standard Video input layer
13. Script step
14. Metadata step
15. TTS step
16. Visual planning / asset step
17. Subtitle step
18. Composition / render
19. Thumbnail
20. Standard Video stabilization
21. Template Engine
22. Template separation model
23. News input layer
24. Source Registry
25. Source Scan Engine
26. Used News + Dedupe
27. News Pipeline
28. Style Blueprint
29. AI-assisted style variants
30. Publish Center
31. YouTube publish v1
32. Review gate / manual override
33. Rerun / clone / recovery
34. Analytics backend
35. Platform Overview + Operations Analytics
36. Platform Detail + Content Analytics
37. Future module expansion readiness
38. Hardening
39. Documentation and operator guide
40. MVP final acceptance gate

Do not skip ahead just because a later feature is exciting.

## Working Style for Claude Code
Always:
- stay within scope
- preserve contracts
- explain file-by-file what changed
- explain why the change was needed
- run relevant tests
- report test results
- state risks and limitations honestly

Never:
- add hidden behavior
- add speculative architecture without immediate need
- change core product rules silently
- leave critical behavior untested
- bury business logic in prompts when deterministic code should own it

## Manifest
ContentHub should become:
- modular
- visible
- testable
- traceable
- preview-first where visual decisions matter
- local-first
- future-ready

ContentHub should not become:
- prompt-driven chaos
- hidden-behavior software
- a monolithic codebase
- a premature SaaS platform
- a project that depends on refactoring later to become usable
