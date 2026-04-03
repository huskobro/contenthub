# Test Report — Phase 145: List/Detail/Form Date Formatting Safety Unification Pack

## Summary

Created a shared date formatting helper library (`frontend/src/lib/formatDate.ts`) with four guarded helpers, then unified all inline date patterns across detail panels, registry tables, form surfaces, and job panels.

## Changes

### New Files
| File | Purpose |
|------|---------|
| `frontend/src/lib/formatDate.ts` | Shared date formatting helpers with null/undefined/Invalid Date guards |
| `frontend/src/tests/date-formatting-safety.smoke.test.tsx` | 19 guard tests for all 4 helpers |

### Modified Files — Detail Panels (9 files, formatDateTime import)
| File | Change |
|------|--------|
| `TemplateDetailPanel.tsx` | 2 date fields → `formatDateTime()` |
| `SourceDetailPanel.tsx` | 2 date fields → `formatDateTime()` |
| `StyleBlueprintDetailPanel.tsx` | 2 date fields → `formatDateTime()` |
| `TemplateStyleLinkDetailPanel.tsx` | 2 date fields → `formatDateTime()` |
| `NewsBulletinDetailPanel.tsx` | 2 date fields → `formatDateTime()` |
| `SourceScanDetailPanel.tsx` | 4 date fields → `formatDateTime()` |
| `UsedNewsDetailPanel.tsx` | 2 date fields → `formatDateTime()` |
| `NewsItemDetailPanel.tsx` | 3 date fields → `formatDateTime()` |
| `StandardVideoOverviewPanel.tsx` | 2 date fields → `formatDateTime(field, "—")` |

### Modified Files — Job Panels (2 files, formatDateISO import)
| File | Change |
|------|--------|
| `JobDetailPanel.tsx` | 3 date fields → `formatDateISO(data.field, em)` |
| `JobOverviewPanel.tsx` | 3 date fields → `formatDateISO(job.field, em)` |

### Modified Files — Registry Tables (8 files, formatDateShort import)
| File | Change |
|------|--------|
| `JobsTable.tsx` | `j.created_at.slice(0,19).replace("T"," ")` → `formatDateISO(j.created_at)` |
| `StandardVideosTable.tsx` | `new Date().toLocaleString("tr-TR")` → `formatDateTime(v.created_at, "—")` |
| `SourceScansTable.tsx` | `new Date().toLocaleDateString()` → `formatDateShort(scan.created_at)` |
| `NewsItemsTable.tsx` | `new Date().toLocaleDateString()` → `formatDateShort(item.created_at)` |
| `UsedNewsTable.tsx` | `new Date().toLocaleDateString()` → `formatDateShort(record.created_at)` |
| `StyleBlueprintsTable.tsx` | `new Date().toLocaleDateString()` → `formatDateShort(bp.created_at)` |
| `NewsBulletinsTable.tsx` | `new Date().toLocaleDateString()` → `formatDateShort(b.created_at)` |
| `TemplateStyleLinksTable.tsx` | `new Date().toLocaleDateString()` → `formatDateShort(link.created_at)` |

### Modified Files — Sub-panels and Pickers (3 files)
| File | Change |
|------|--------|
| `NewsBulletinSelectedItemsPanel.tsx` | `new Date().toLocaleDateString()` → `formatDateShort()` |
| `NewsItemPickerTable.tsx` | `new Date().toLocaleDateString()` → `formatDateShort()` |
| `SourceScanSummary.tsx` | `new Date().toLocaleDateString()` → `formatDateShort()` (adds missing Invalid Date guard) |

### Modified Files — Form (1 file)
| File | Change |
|------|--------|
| `NewsItemForm.tsx` | `String(initial.published_at).slice(0,16)` → `normalizeDateForInput()` |

## Safety Patterns Applied
- `formatDateTime`: null + undefined + empty + Invalid Date → fallback
- `formatDateShort`: null + undefined + empty + Invalid Date → "—"
- `formatDateISO`: null + undefined + empty → fallback; short string → as-is
- `normalizeDateForInput`: null + undefined + empty → ""

## Key Fix: SourceScanSummary.tsx
Previously had NO null/Invalid Date guard — `new Date(lastScanFinishedAt).toLocaleDateString()` would crash on invalid input. Now uses `formatDateShort()` with full guard chain.

## Test Results
- **19 new guard tests** in `date-formatting-safety.smoke.test.tsx`
- **1118 total tests**, all passing
- **tsc**: clean (0 errors)
- **vite build**: clean

## What Was NOT Changed
- No visual changes — same rendering output for valid dates
- No behavioral changes — same fallback values
- Detail panel formatDateTime already applied in earlier step of this phase
- No new dependencies added
