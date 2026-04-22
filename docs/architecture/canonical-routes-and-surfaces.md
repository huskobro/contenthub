# Canonical Routes and Surfaces

Ledger of the Aurora frontend surface: canonical pages, route mounts, shell coverage, duplicate risk, and the anti-patterns that have been named and forbidden. This document is the ledger; `CLAUDE.md` holds the contract.

Last reconciled: 2026-04-22 against branch `qa/aurora-real-user-hardening` (HEAD `4cc2ad3`).

---

## 1. Surface layer of record

- **Aurora** (`frontend/src/surfaces/aurora/`) is the canonical production surface. All new pages ship here.
- **Legacy** (`frontend/src/pages/`) is fallback only. Not a target for new development.
- **Registration** (`frontend/src/surfaces/manifests/register.tsx`) is the single source of truth mapping canonical slots to Aurora implementations. Every Aurora page must have a `register.tsx` entry.
- **Resolver** (`frontend/src/surfaces/useSurfaceResolution.ts`) reads the active surface at runtime and dispatches to the correct layout + page binding.
- **Layout dispatchers** (`frontend/src/app/layouts/DynamicAdminLayout.tsx`, `DynamicUserLayout.tsx`) select between Aurora shells (`AuroraAdminLayout`, `AuroraUserLayout`) and legacy layouts.

Aurora surface today contains approximately 95 page files across auth, admin dashboard/registry/detail/wizard, and user dashboard/spaces/analytics/automation/content categories. The full file list is reproducible with:

```
ls frontend/src/surfaces/aurora/*Page.tsx
```

---

## 2. Canonical dual-mount paths

Paths mounted in both the admin and user shells. The component resolves shell context at render time; the URL prefix is the source of truth for which shell is active.

| Canonical path | Component | Admin mount | User mount |
|---|---|---|---|
| `/{shell}/channels/:channelId/branding-center` | `AuroraBrandingCenterPage` | ✓ | ✓ |
| `/{shell}/projects/:projectId/automation-center` | `AuroraAutomationCenterPage` | ✓ | ✓ |
| `/{shell}/channels/new` | `AuroraChannelOnboardingPage` | ✓ | ✓ |

`{shell}` ∈ {`admin`, `user`}. Router entries live in `frontend/src/app/router.tsx`.

### Forbidden short literals

These paths are **not mounted** and will 404. Their canonical equivalents are in the table above.

| Forbidden literal | Canonical replacement | Notes |
|---|---|---|
| `/admin/channels/:id/branding` | `/admin/channels/:id/branding-center` | Known 404 at time of writing; source of stray link still under investigation (B3 in execution plan). |
| `/admin/projects/:id/automation` | `/admin/projects/:id/automation-center` | Risk only (no observed 404 yet); add redirect if a stray literal appears. |

Before adding a new CTA or link in the branding/automation/onboarding area, run:

```
rg "/branding\b" frontend/src/
rg "/automation\b" frontend/src/
rg "channels/.*?/branding\b" frontend/src/
```

Treat every match that is not the canonical form as a bug source.

---

## 3. Shell-awareness in dual-mounted pages

Pages mounted in both shells must derive their navigation base from the **current URL**, not from the caller's role. The role-based `baseRoute = isAdmin ? "/admin" : "/user"` pattern is forbidden; it causes silent cross-shell teleportation (e.g. an admin at `/user/projects` clicking a card arrives at `/admin/projects/:id`).

### Files currently using the forbidden pattern (as of `4cc2ad3`)

| File | Reason it matters |
|---|---|
| `frontend/src/surfaces/aurora/AuroraBrandingCenterPage.tsx` | Breadcrumb back-nav |
| `frontend/src/surfaces/aurora/AuroraAutomationCenterPage.tsx` | Breadcrumb back-nav |
| `frontend/src/surfaces/aurora/AuroraChannelOnboardingPage.tsx` | Breadcrumb back-nav |
| `frontend/src/surfaces/aurora/AuroraMyProjectsPage.tsx` | Card click navigation (highest user-visible impact) |
| `frontend/src/surfaces/aurora/AuroraUserPublishPage.tsx` | Back-nav |
| `frontend/src/surfaces/aurora/AuroraChannelDetailPage.tsx` | Back-nav |

These six locations are the scope of fix B2 in the execution plan. The required pattern is:

```ts
const location = useLocation();
const baseRoute = location.pathname.startsWith("/admin") ? "/admin" : "/user";
```

Or, equivalently, via a shell-scoped route context if one is introduced.

---

## 4. Theme surface coverage

| Theme id | Role | Selector |
|---|---|---|
| `aurora-dusk` | Default, dark, plum + teal | `[data-surface="aurora"][data-theme="aurora-dusk"]` |
| `obsidian-slate` | Light, blue + purple | `[data-surface="aurora"][data-theme="obsidian-slate"]` |

Token files:
- `frontend/src/styles/aurora/tokens.css` — semantic and overlay tokens for both themes.
- `frontend/src/styles/aurora/cockpit.css` — class-level styles that consume those tokens.

### Current Slate gap (class-context, not token-absence)

`tokens.css` defines overlay-family tokens for both themes (`--ink-overlay-text-medium` is present at both L155 and L427). The Slate breakage is not missing tokens; it is **classes in `cockpit.css` that reference Dusk-flavored overlay tokens in contexts where Slate needs a different token chain**. Observed at:

- `.breadcrumbs` (cockpit.css:132) — overlay token applied to Slate breadcrumb wrapper.
- `.breadcrumbs .sep` (cockpit.css:137)
- `.breadcrumbs .crumb.last` (cockpit.css:139)
- `.caption` when used on chip and inset-surface contexts in Slate.

Merge-ready strategy (Yol A): gate `obsidian-slate` off in the theme switcher until the class-context migration lands in a follow-up branch.

---

## 5. Theme gating policy

Theme availability is user-facing product behavior.

- **Short-lived code gate** (hotfix scope): a small, clearly commented constant/conditional in `frontend/src/stores/themeStore.ts` or the theme switcher is acceptable to hide a broken theme quickly. The gate must cite the tracking branch that will remove it.
- **Persistent / operator-managed gate**: must move to the Settings Registry as a key such as `theme.{id}.enabled`, with admin visibility, audit trail, and versioning. This is required by the project's Non-Negotiable Rules.
- **localStorage fallback**: when a theme is gated off, a session that previously persisted its id under `contenthub:active-theme-id` must deterministically fall back to `aurora-dusk` (or the current default). No stale-state leakage.

---

## 6. Duplicate and parallel-pattern risks

| Risk area | Nature | Mitigation |
|---|---|---|
| Role-based `baseRoute` | 6 files repeat the same anti-pattern | Fix B2 and add lint/grep guard in review checklist |
| Short route literals | Developers reach for `/branding`, `/automation` | `rg` check before every CTA; CLAUDE.md Canonical Route Vocabulary |
| Theme class-context | Hard-coded colors or Dusk-only tokens in new components silently break Slate | Required dual-theme visual QA before merge |
| Legacy `pages/` reuse | New pages accidentally added to legacy tree | Surface System rule: new pages only in `surfaces/aurora/` |
| Wizard family split | Admin wizard vs user create-wizard paths are parallel by design; risk is adding a feature to the wrong side | Settings Registry check: admin wizards are governance, user create wizards are production |

---

## 7. Do-not-touch list

Unless the mechanism itself is being evolved, do not modify:

- `frontend/src/surfaces/manifests/register.tsx` — central override authority. Add lines for new pages only.
- `frontend/src/surfaces/useSurfaceResolution.ts` — surface resolver.
- `frontend/src/stores/themeStore.ts` — theme id registry. New themes require both-theme token coverage first.
- `frontend/src/styles/aurora/tokens.css` at existing keys — the tokens already exist for both themes. Add new tokens with both-theme values, do not delete or rename.

---

## 8. Reconciliation with `CLAUDE.md`

This document expands on these `CLAUDE.md` sections:

- **Panels → Shell Implementation** — names the runtime shells and dispatchers.
- **Frontend Architecture → Surface System** — surfaces, register.tsx, resolver.
- **Frontend Architecture → Theme System** — token-scoped themes and the Slate gap.
- **Frontend Architecture → Theme Availability and Gating** — short-lived vs Settings-Registry gates.
- **Frontend Architecture → Canonical Route Vocabulary** — canonical paths and forbidden literals.
- **Frontend Architecture → Shell Branching Rule** — role-based `baseRoute` forbidden.
- **Testing Strategy → Real-Browser Aurora QA Tier** — dual-theme, dual-shell, shell-cross, canonical-path, state-matrix, contrast coverage.

When any of the above is updated in `CLAUDE.md`, update this document in the same change.
