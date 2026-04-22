# Aurora Final-Product Audit & Hardening Report

**Branch:** `qa/aurora-final-product-polish`
**Scope:** Aurora surface (admin + user shells) — UX/IA audit + targeted hardening
**Date:** 2026-04-22
**Wave count:** 2 (this commit completes wave 2)
**Base for diff:** `main`

> Supersedes the 2026-04-19 Dusk-cockpit audit. That file was the overall post-conversion audit; this file tracks the wave-level hardening that followed it.

---

## 1. System problem classes (what was systemic, not one-off)

Five patterns recurred across pages and forced wave-level fixes instead of file-level ones:

1. **Manual-typing for closed-dictionary fields.** Tone, scan mode, language, link role/status, publish policy, wizard entry mode, surface selector, bulletin style, TTS provider, scene energy — all were exposed as free text or ambiguous `<select>`. In every case the backend accepts only a fixed set of values. The keyboard was offered where a segmented picker was correct.

2. **Duplicated primitives.** Local `ChipGroup` in `AuroraTemplateStyleLinkCreatePage` did exactly what `AuroraSegmented` does. Parallel-component drift — the kind CLAUDE.md explicitly forbids — was starting to take root. Killed at the source.

3. **Native `window.confirm` / `window.prompt` on destructive paths.** Browser-chrome dialogs on delete/disconnect/cancel/reset flows were:
   - visually discontinuous with Aurora chrome,
   - un-themeable,
   - not busy-aware (user could double-click during the mutation),
   - unable to carry tone (danger vs warning vs neutral) and so all looked identical.

4. **Closed dictionaries not declared as closed.** Backend validation rules for 8 settings keys did not advertise their enum set, so `AuroraSettingsPage`'s wave-1 metadata-driven enum auto-upgrade path was blind. The UI had no choice but to render a textarea.

5. **JSX nesting rot inside the Visibility registry drawer.** The "Kural ekle" form visual bug reported by the user was not a primitive CSS issue. Its root cause was an orphaned outer `<div>` wrapper around the target-selector header (opened at line 274, never closed) combined with form-level `gap` stacking on top of drawer-body `gap`. Both fixed.

---

## 2. Page-level changes (what shipped this wave)

Wave 2 touched 15 files:

| File | Change |
|---|---|
| `frontend/src/surfaces/aurora/primitives.tsx` | **New:** `AuroraConfirmDialog` primitive (≈155 LOC). Fixed-position centered modal with veil backdrop, tone-aware border/bg (`danger` / `warning` / `neutral`), `busy` prop to block ESC during async mutation, `onCancel` / `onConfirm` callbacks. Uses existing token family (`state-danger-*`, `state-warning-*`, `bg-overlay`). |
| `AuroraStandardVideoWizardPage.tsx` | `tone` input → `AuroraSegmented` (5 fixed tones). |
| `AuroraCreateVideoWizardPage.tsx` | `tone` input → `AuroraSegmented` (mirror). |
| `AuroraTemplateStyleLinkCreatePage.tsx` | Local `ChipGroup` removed. `linkRole` and `status` now render through `AuroraSegmented`. |
| `AuroraSourceScanCreatePage.tsx` | `scan_mode` `<select>` → `AuroraSegmented` with per-option hint (`Anlık tek tarama`, `Zamanlanabilir`, `Editör eli`). |
| `AuroraNewsItemCreatePage.tsx` | `language` `<select>` → `AuroraSegmented` (tr / en / —). |
| `AuroraCreateProductReviewWizardPage.tsx` | `language` `<select>` → `AuroraSegmented`. `template_type`, `orientation`, `run_mode` intentionally kept as `ChoiceGrid` (see §4). |
| `AuroraUserPostsPage.tsx` | Blog delete: `window.confirm` → `AuroraConfirmDialog` (tone=danger). |
| `AuroraPublishDetailPage.tsx` | Cancel (tone=danger) + Reset (tone=warning) modals. Two independent dialog states, both honor `busy`. |
| `AuroraAssetLibraryPage.tsx` | Asset delete confirm. |
| `AuroraAdminConnectionsPage.tsx` | Disconnect confirm, `busy` bound to mutation pending state. |
| `AuroraTemplateStyleLinksRegistryPage.tsx` | Link delete confirm (async mutation in `onConfirm` with `try/catch/finally`). |
| `AuroraSourceDetailPage.tsx` | Source delete confirm. |
| `AuroraVisibilityRegistryPage.tsx` | Orphaned outer `<div>` closed after the manual/catalog conditional. Silent JSX17008 that was about to become a compile blocker. |
| `backend/app/settings/settings_resolver.py` | 8 new entries in `KNOWN_VALIDATION_RULES`. See §6. |

Wave 1 (prior commits in this branch) already shipped: SSE honesty model, L/E parity review, Aurora-native replacements for `AuroraPublishReviewQueuePage` / `AuroraPublishCenterPage` / `AuroraUsersRegistryPage`, validation-aware `AuroraSettingsPage`, drawer-based review flows, and the Visibility drawer form-gap correction.

---

## 3. Input → widget conversion matrix

`[CONVERT]` = converted this wave. `[FALLBACK]` = structured primary + free-text fallback. `[MANUAL-OK]` = genuine free text, kept as textarea.

| Setting / field | Location | Class | Widget delivered |
|---|---|---|---|
| Tone (standard video wizard) | `AuroraStandardVideoWizardPage` | [CONVERT] | `AuroraSegmented` (5 opts) |
| Tone (create-video wizard) | `AuroraCreateVideoWizardPage` | [CONVERT] | `AuroraSegmented` (5 opts) |
| Link role | `AuroraTemplateStyleLinkCreatePage` | [CONVERT] | `AuroraSegmented` |
| Link status | `AuroraTemplateStyleLinkCreatePage` | [CONVERT] | `AuroraSegmented` |
| Scan mode | `AuroraSourceScanCreatePage` | [CONVERT] | `AuroraSegmented` w/ hints |
| News item language | `AuroraNewsItemCreatePage` | [CONVERT] | `AuroraSegmented` (tr/en/—) |
| Product review language | `AuroraCreateProductReviewWizardPage` | [CONVERT] | `AuroraSegmented` |
| `ui.surface.default.admin` | `AuroraSettingsPage` (auto) | [CONVERT] | `AuroraSegmented` (via enum metadata) |
| `ui.surface.default.user` | `AuroraSettingsPage` (auto) | [CONVERT] | `AuroraSegmented` (via enum metadata) |
| `tts.primary_provider` | `AuroraSettingsPage` (auto) | [CONVERT] | `AuroraSegmented` (via enum metadata) |
| `tts.controls.default_scene_energy` | `AuroraSettingsPage` (auto) | [CONVERT] | `AuroraSegmented` (via enum metadata) |
| `wizard.standard_video.entry_mode` | `AuroraSettingsPage` (auto) | [CONVERT] | `AuroraSegmented` (via enum metadata) |
| `wizard.news_bulletin.entry_mode` | `AuroraSettingsPage` (auto) | [CONVERT] | `AuroraSegmented` (via enum metadata) |
| `news_bulletin.config.default_bulletin_style` | `AuroraSettingsPage` (auto) | [CONVERT] | `AuroraSegmented` (9 opts) |
| `automation.full_auto.default_publish_policy` | `AuroraSettingsPage` (auto) | [CONVERT] | `AuroraSegmented` (3 opts) |
| Destructive confirm (6 HIGH paths) | 6 Aurora pages | [CONVERT] | `AuroraConfirmDialog` |
| Product-review template/orientation/run_mode | `AuroraCreateProductReviewWizardPage` | [MANUAL-OK → preview-first] | `ChoiceGrid` (kept — label+desc → visual intent) |
| Style Blueprint "advanced JSON overrides" | Style Blueprint editor | [MANUAL-OK] | Free text inside `<details>`, explicitly "advanced" |
| Prompt bodies (Master Prompt Editor) | `AuroraPromptsPage` | [MANUAL-OK] | Multi-line textarea (content is genuinely free text) |
| Archive-job / reset-wizard / override-limit confirm (7 MEDIUM paths) | Various | [FALLBACK — deferred] | Still `window.confirm` — see §11 |

---

## 4. [MANUAL-OK] fields — explicit rationale per field

The rule: free text is only acceptable when the value is genuinely free text **and** the user can see or preview the impact of what they typed. The fields below pass that bar.

| Field | Why free text is correct |
|---|---|
| `template_type`, `orientation`, `run_mode` in product-review wizard | Each option carries a label + description ("Konsept · konu önce, ürün vurgusu ikincil", "Yatay 16:9 · standart") — a `ChoiceGrid` with label+desc is a richer preview-first widget than `AuroraSegmented`. Flattening to segments would delete the description column and break the Preview-First UX rule. Kept. |
| Style Blueprint "advanced JSON overrides" | The field is literally a partial blueprint JSON patch. Its correct primary UX is the structured Style Blueprint editor; the textarea is the advanced fallback for operators who want to paste a patch. Sits inside a `<details>` block so it is opt-in, not the default surface. Kept. |
| Master Prompt Editor bodies | A system prompt body *is* free text. The value of structuring it would be negative — operators need to paste multi-paragraph prompts. Kept as textarea with prompt-type badge. |
| Free-form titles, descriptions, custom tags, search queries | No closed dictionary exists. Kept as text inputs. |

---

## 5. Visibility drawer "Kural ekle" — root cause

The user reported that the "Kural ekle" form had a visual bug in the first section (the target-key picker looked like it was "gömülü" — swallowed by the drawer head).

Two defects compounded:

1. **Orphaned outer wrapper (`<div>` opened line 274, never closed).** Broke JSX tree structure silently; fixed this wave.
2. **Double-gap cascade.** Drawer body already applies `padding: 18px 20px; gap: 18px` as a flex column. The form was then applying its own `gap: 12` via a nested wrapper, so the first field's header row visually collapsed against the drawer-head padding. Fixed by setting the form to a clean `display: flex; flexDirection: column; gap: 18` (one source of truth for spacing) and by explicitly containerizing the target-selector header as an `AuroraField`-style `label + secondary action` row (prior wave).

This was not an `AuroraSegmented` / `AuroraField` CSS bug. Primitives are correct. The bug lived in the page-level form wrapper.

---

## 6. Enum metadata vs derived closed-set settings

The wave-1 `AuroraSettingsPage` detector upgrades any setting whose `validation_rules_json` contains `{"type":"string","enum":[...]}` from textarea to `AuroraSegmented` automatically. That meant the only correct place to declare "this key is closed-dictionary" is the Settings Registry itself — not per-page literals on the frontend.

Wave 2 added enum metadata for the 8 keys that were closed in practice but not in declaration:

```python
# backend/app/settings/settings_resolver.py — KNOWN_VALIDATION_RULES
"ui.surface.default.admin":                        '{"type":"string","enum":["legacy","canvas","atrium","bridge","horizon"]}'
"ui.surface.default.user":                         '{"type":"string","enum":["legacy","canvas","atrium","bridge","horizon"]}'
"tts.primary_provider":                            '{"type":"string","enum":["dubvoice","edge_tts","system_tts"]}'
"tts.controls.default_scene_energy":               '{"type":"string","enum":["","calm","neutral","energetic"]}'
"wizard.standard_video.entry_mode":                '{"type":"string","enum":["wizard","form"]}'
"wizard.news_bulletin.entry_mode":                 '{"type":"string","enum":["wizard","form"]}'
"news_bulletin.config.default_bulletin_style":     '{"type":"string","enum":["breaking","tech","corporate","sport","finance","weather","science","entertainment","dark"]}'
"automation.full_auto.default_publish_policy":     '{"type":"string","enum":["draft","schedule","publish_now"]}'
```

These are metadata only — server-side validation already enforced these sets elsewhere in code. The change surfaces the closed-set contract to the frontend so the widget upgrade happens automatically, without the frontend growing a parallel source of truth.

---

## 7. Right rail sticky behavior — findings

**Verdict: COMPLIANT. No change required this wave.**

Inspected pages:
- `AuroraSourceDetailPage`, `AuroraJobsRegistryPage`, `AuroraPublishDetailPage`, `AuroraNewsBulletinDetailPage`, `AuroraBrandingCenterPage`.

The `.ctx-panel` class in `cockpit.css` applies `position: sticky; top: 0; max-height: calc(100vh - var(--topbar-height)); overflow-y: auto`. Scroll decoupling between the main column and the rail is correct on all inspected pages. The rail does not collapse underneath the main when the main is long; the rail does not float above the ctxbar; the rail contents scroll locally when overflow is needed.

No sticky-related regressions observed in the Wave 2 page diffs.

---

## 8. SSE / realtime — findings

**Verdict: COMPLIANT. Wave 1 already shipped the honest-state model.**

State machine (from `frontend/src/hooks/useSSE.ts` + `sseStatusStore.ts`):
- `idle` — no subscription yet.
- `connecting` → `open` on first `onopen`.
- `open` → `error` on any transport failure. User-visible label: "Reconnecting…" for the first 8s, "Offline" afterward.
- 15s polling fallback fires via `useSSEFallbackRefetch` after the grace window; query data continues to update even while the badge reads "Offline".

UX honesty properties verified:
- The badge never lies about connection state ("live" requires an open EventSource).
- The fallback refetch only fires when SSE is confirmed down, not when it is briefly reconnecting.
- Tests in `aurora-sse-fallback-refetch.smoke.test.tsx` cover the connecting/open/error/fallback transitions.

No SSE changes this wave; behavior remains correct.

---

## 9. Destructive-confirm matrix (before vs after wave 2)

| Path | Severity | Before | After |
|---|---|---|---|
| UserPosts blog delete | HIGH (hard delete) | `window.confirm` | `AuroraConfirmDialog` tone=danger |
| PublishDetail cancel | HIGH (cancels active publish) | `window.confirm` | `AuroraConfirmDialog` tone=danger, busy-aware |
| PublishDetail reset | HIGH (irreversible rerun trigger) | `window.confirm` | `AuroraConfirmDialog` tone=warning, busy-aware |
| AssetLibrary asset delete | HIGH (hard delete) | `window.confirm` | `AuroraConfirmDialog` tone=danger |
| AdminConnections disconnect | HIGH (revokes OAuth) | `window.confirm` | `AuroraConfirmDialog` tone=danger, busy bound to mutation |
| TemplateStyleLinks delete | HIGH (hard delete link) | `window.confirm` | `AuroraConfirmDialog` tone=danger |
| SourceDetail source delete | HIGH (cascades) | `window.confirm` | `AuroraConfirmDialog` tone=danger |
| AuroraJobsRegistry job archive | MEDIUM (reversible) | `window.confirm` | *Still `window.confirm` — deferred* |
| AuroraJobsRegistry bulk archive | MEDIUM | `window.confirm` | *Still `window.confirm` — deferred* |
| AuroraWizardPage reset wizard | MEDIUM (redoable) | `window.confirm` | *Still `window.confirm` — deferred* |
| AuroraAutomationCenter override-limit | MEDIUM | `window.confirm` | *Still `window.confirm` — deferred* |
| AuroraNewsItemDetail archive-as-ignored | MEDIUM | `window.confirm` | *Still `window.confirm` — deferred* |
| AuroraPrompts revert-to-default | MEDIUM (redoable) | `window.confirm` | *Still `window.confirm` — deferred* |

6 HIGH paths converted. 7 MEDIUM paths explicitly deferred (all reversible; upgrading them is a polish wave, not a final-product blocker).

---

## 10. Tests executed

- `npx tsc --noEmit` → **exit 0**. No TS errors. (Wave-2 AuroraVisibilityRegistryPage orphaned `<div>` was caught here and fixed.)
- `npx vitest run` → **244 test files, 2733 tests, 0 failures, 203.7s**.

Tests that exercise the wave-2 changes directly:
- `aurora-primitives.smoke.test.tsx` (covers `AuroraSegmented`, `AuroraChipSelect`, `AuroraConfirmDialog`).
- `aurora-shell-cross-regression.smoke.test.ts` (shell-branching rule: admin ↔ user URL-prefix derivation).
- Component-level tests for ConfirmAction, Toast, QuickLook — all pass.

No new failing tests introduced; no pre-existing failures re-surfaced.

---

## 11. Remaining blockers / deferred

**None that block merging to `main`.** What is intentionally left out of this branch:

1. **7 MEDIUM `window.confirm` calls.** All reversible. Converting them would be another AuroraConfirmDialog pass plus 7 page edits. Not a final-product honesty issue — the action is reversible and the user cannot silently destroy state by confirming.
2. **Legacy surfaces (canvas, atrium, bridge, horizon, legacy `pages/*`).** Not in scope for this audit. Aurora-only.
3. **Obsidian-slate theme class-context coverage.** Slate tokens exist in `tokens.css`; several Aurora components still reference Dusk-only overlay tokens. Tracked separately. Wave-2 did not regress this — the new `AuroraConfirmDialog` uses only tokens that are defined in both themes (`state-danger-*`, `state-warning-*`, `bg-overlay`, `text-primary`, `text-muted`, `border-default`).
4. **Real-browser QA.** Wave-1 already recorded real-browser Aurora QA outcomes (Dusk + Slate, admin + user, state matrix). Wave-2 changes are visually additive (segmented widgets, modal) and follow existing Aurora tokens; they should be revalidated in-browser before the final merge but no layout-breaking changes were introduced. Recommend a quick real-browser pass on the 6 pages with new modals before promoting.

---

## 12. Merge-readiness review (branch → main)

**Commits on branch vs main:** 3
```
3453c64 feat(aurora): wave-2 final-product polish — segmented enums, destructive ConfirmDialog, backend enum metadata
fddecac feat(aurora): UX/IA hardening wave — validation-aware settings, drawer-based review, segmented enums
5d88eb5 feat(aurora): single-wave UX/IA hardening — SSE honesty, manual-typing reduction, L/E parity
```

**File count:** 50 files, +4781 / −857. Backend: 1 file (additive metadata in `KNOWN_VALIDATION_RULES`, no schema change, no migration needed). Frontend: 49 files.

**Risk-of-regression checklist (`qa/aurora-final-product-polish` → `main`):**

| Risk vector | Status | Evidence |
|---|---|---|
| State machine / job pipeline | No change | No edits in `backend/app/jobs/`, `backend/app/workflows/`, `backend/app/pipelines/`, `backend/app/steps/`. |
| Settings Registry contracts | Metadata-only | `settings_resolver.py` diff is 13 lines of `KNOWN_VALIDATION_RULES` additions — no change to resolver behavior, no change to defaults, no migration. |
| Visibility enforcement | Unchanged server-side | No changes in `backend/app/visibility/`. Frontend drawer layout fixed, no permissions change. |
| SSE protocol | Unchanged | Server SSE publishers untouched; frontend hooks were modified in wave 1 in a compatible way (preserves existing event shapes). |
| Canonical routes / shell rule | Preserved | No changes in `router.tsx` this wave. Shell rule compliance verified by `aurora-shell-cross-regression.smoke.test.ts`. |
| Theme tokens | Additive | `AuroraConfirmDialog` uses existing token family only. No new tokens added. |
| Destructive-action safety | Strictly improved | 6 HIGH paths now show busy-aware Aurora modal, unable to double-trigger mutation during pending. No new destructive action was introduced. |
| Database | No migration | No Alembic changes. No schema edits. DB state on `main` remains compatible. |
| Tests | All green | 2733 / 2733 pass. |

**Merge verdict:** **Safe to merge to `main`** with the following one pre-merge action recommended:
- Real-browser smoke on the 6 pages with new `AuroraConfirmDialog` modals (UserPosts, PublishDetail, AssetLibrary, AdminConnections, TemplateStyleLinksRegistry, SourceDetail) in both Dusk and Slate. This is belt-and-suspenders — the primitive uses only dual-theme tokens, and all unit tests pass, but the Aurora QA tier in CLAUDE.md requires real-browser validation for any layout or chrome change.

If that smoke passes, this is a straightforward merge. No core-invariant change, no DB migration, no route rename, no permissions change.

---

## 13. Final product-fitness verdict

**Verdict:** Aurora surface on this branch meets the final-product bar for local MVP promotion on the paths covered:
- Settings registry is the single source of truth for closed dictionaries. No parallel frontend literals.
- Destructive actions are visually consistent with Aurora chrome and honor async mutation state.
- Manual typing on closed-dictionary fields is eliminated on the pages in scope.
- Visibility drawer "Kural ekle" visual bug is resolved at its true root cause (form-gap cascade + orphaned div).
- SSE state is honest (`live` / `reconnecting` / `offline`) with polling fallback.
- No duplicate primitives; no hidden settings; no silent magic flags.

**Not claimed:** that every Aurora page has been audited. The audit covered the 26 pages explicitly listed in the original directive plus the primitive layer. Pages outside that list (e.g. `AuroraAnalytics*`, `AuroraNotifications*`) were not re-inspected this wave.

**Recommendation:** promote `qa/aurora-final-product-polish` to `main` after the 6-page real-browser smoke, then open a follow-up narrow branch to convert the 7 MEDIUM `window.confirm` calls and complete the obsidian-slate class-context coverage in one focused wave.
