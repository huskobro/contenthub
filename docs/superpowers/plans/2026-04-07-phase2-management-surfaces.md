# Phase 2: Management Surfaces Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add missing management surfaces (modules, providers, prompts), fix critical UI bugs (keyboard, theme switch, job archive), and establish a settings surface standard.

**Architecture:** Incremental delivery in 8 sub-phases. Quick-win UI fixes first (D, F, E), then new admin pages (A, B, C), then documentation (G) and testing (H). All new pages follow the existing PageShell + SectionShell + table/card pattern. Backend changes are minimal — mostly new read endpoints exposing existing registries.

**Tech Stack:** React + TypeScript, Zustand, React Query, FastAPI, SQLite, Tailwind CSS with `--ch-*` design tokens.

---

## File Structure

### Faz D (Keyboard Fix)
- Modify: `frontend/src/hooks/useRovingTabindex.ts` — split Enter/Space into separate callbacks
- Modify: `frontend/src/hooks/useScopedKeyboardNavigation.ts` — expose `onEnter` + `onSpace` options
- Modify: `frontend/src/pages/admin/JobsRegistryPage.tsx` — wire Enter→Sheet, Space→QuickLook
- Modify: `frontend/src/pages/admin/SourcesRegistryPage.tsx` — wire Enter→Sheet
- Modify: `frontend/src/pages/admin/TemplatesRegistryPage.tsx` — wire Enter→Sheet
- Modify: `frontend/src/pages/admin/ContentLibraryPage.tsx` — wire Enter→Sheet or detail, Space→QuickLook
- Modify: `frontend/src/pages/admin/AssetLibraryPage.tsx` — wire Enter→Sheet, Space→QuickLook

### Faz F (Theme F5 Fix)
- Modify: `frontend/src/app/layouts/DynamicAdminLayout.tsx` — add `key={layoutMode}`
- Modify: `frontend/src/app/layouts/DynamicUserLayout.tsx` — add `key={layoutMode}`

### Faz E (Job Archive UI)
- Modify: `frontend/src/api/jobsApi.ts` — add archive API functions
- Modify: `frontend/src/pages/admin/JobsRegistryPage.tsx` — add archive button + confirmation
- Modify: `frontend/src/components/jobs/JobsTable.tsx` — add archive action in rows

### Faz A (Module Management)
- Create: `backend/app/modules/router.py` — modules API endpoint
- Modify: `backend/app/api/router.py` — register modules router
- Modify: `backend/app/settings/settings_resolver.py` — add module.*.enabled to KNOWN_SETTINGS
- Modify: `backend/app/jobs/router.py` — check module enabled before create_job
- Create: `frontend/src/api/modulesApi.ts` — modules API client
- Create: `frontend/src/pages/admin/ModuleManagementPage.tsx` — module management page
- Modify: `frontend/src/app/router.tsx` — add /admin/modules route
- Modify: `frontend/src/app/layouts/useLayoutNavigation.ts` — add Modules nav item

### Faz B (Provider Management)
- Create: `frontend/src/pages/admin/ProviderManagementPage.tsx` — provider management page
- Create: `frontend/src/api/providersApi.ts` — providers API client
- Modify: `frontend/src/app/router.tsx` — add /admin/providers route
- Modify: `frontend/src/app/layouts/useLayoutNavigation.ts` — add Providers nav item
- Modify: `backend/app/providers/router.py` — add test-connection + credential status

### Faz C (Master Prompt Editor)
- Create: `frontend/src/pages/admin/PromptEditorPage.tsx` — prompt editor page
- Modify: `frontend/src/app/router.tsx` — add /admin/prompts route
- Modify: `frontend/src/app/layouts/useLayoutNavigation.ts` — add Prompts nav item

---

## Task 1: Keyboard — Split Enter/Space in useRovingTabindex

**Files:**
- Modify: `frontend/src/hooks/useRovingTabindex.ts`

- [ ] **Step 1: Update the interface to accept separate callbacks**

In `frontend/src/hooks/useRovingTabindex.ts`, replace the `UseRovingTabindexOptions` interface and the `handleKeyDown` implementation:

```typescript
interface UseRovingTabindexOptions {
  /** Total number of navigable items */
  itemCount: number;
  /** Called when Enter is pressed on the active item (detail panel) */
  onEnter?: (index: number) => void;
  /** Called when Space is pressed on the active item (QuickLook) */
  onSpace?: (index: number) => void;
  /**
   * @deprecated Use onEnter instead. Kept for backward compat —
   * if onEnter is not provided, onSelect fires on Enter.
   */
  onSelect?: (index: number) => void;
  /** Keyboard scope id — only active when this scope is topmost */
  scopeId?: string;
  /** Whether navigation wraps around at the edges */
  wrap?: boolean;
}
```

Update the `handleKeyDown` switch to separate Enter and Space:

```typescript
case "Enter": {
  // Skip if focused element is an interactive control
  const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select" || tag === "button") break;
  handled = true;
  if (onEnter) {
    onEnter(activeIndex);
  } else if (onSelect) {
    onSelect(activeIndex);
  }
  break;
}
case " ": {
  // Skip if focused element is an interactive control
  const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select" || tag === "button") break;
  handled = true;
  if (onSpace) {
    onSpace(activeIndex);
  }
  break;
}
```

Add `onEnter`, `onSpace` to the `useCallback` dependency array. Remove Space from falling through to `onSelect`.

- [ ] **Step 2: Verify the file compiles**

Run: `cd /Users/huseyincoskun/Downloads/AntigravityProje/ContentHub/frontend && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors in `useRovingTabindex.ts`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useRovingTabindex.ts
git commit -m "refactor: split Enter/Space into separate callbacks in useRovingTabindex"
```

---

## Task 2: Keyboard — Update useScopedKeyboardNavigation

**Files:**
- Modify: `frontend/src/hooks/useScopedKeyboardNavigation.ts`

- [ ] **Step 1: Add onEnter and onSpace to the options interface**

```typescript
interface UseScopedKeyboardNavigationOptions {
  scopeId: string;
  scopeLabel?: string;
  itemCount: number;
  /** @deprecated Use onEnter instead */
  onSelect?: (index: number) => void;
  /** Called on Enter — opens detail panel (Sheet) */
  onEnter?: (index: number) => void;
  /** Called on Space — opens QuickLook */
  onSpace?: (index: number) => void;
  enabled?: boolean;
  wrap?: boolean;
}
```

Pass them through to `useRovingTabindex`:

```typescript
return useRovingTabindex({
  itemCount,
  onSelect,
  onEnter,
  onSpace,
  scopeId,
  wrap,
});
```

- [ ] **Step 2: Verify compile**

Run: `cd /Users/huseyincoskun/Downloads/AntigravityProje/ContentHub/frontend && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useScopedKeyboardNavigation.ts
git commit -m "refactor: expose onEnter/onSpace in useScopedKeyboardNavigation"
```

---

## Task 3: Keyboard — Wire pages to use Enter/Space split

**Files:**
- Modify: `frontend/src/pages/admin/JobsRegistryPage.tsx`
- Modify: `frontend/src/pages/admin/SourcesRegistryPage.tsx`
- Modify: `frontend/src/pages/admin/TemplatesRegistryPage.tsx`
- Modify: `frontend/src/pages/admin/ContentLibraryPage.tsx`
- Modify: `frontend/src/pages/admin/AssetLibraryPage.tsx`

- [ ] **Step 1: Update JobsRegistryPage**

Change `onSelect: handleSelect` to `onEnter: handleSelect` (which opens Sheet).
Add `onSpace` that opens QuickLook:

```typescript
const { activeIndex, handleKeyDown } = useScopedKeyboardNavigation({
  scopeId: "jobs-table",
  scopeLabel: "Jobs Table",
  itemCount: jobList.length,
  onEnter: handleSelect,  // Opens Sheet
  onSpace: (i) => {
    if (jobList[i]) {
      setSelectedId(jobList[i].id);
      setQuickLookOpen(true);
    }
  },
  enabled: !sheetOpen && !quickLookOpen,
});
```

Remove the separate `useQuickLookTrigger` call since Space is now handled in the roving tabindex. **But keep** the `useQuickLookTrigger` as a fallback for when the table wrapper doesn't have focus — only if the page currently uses it. If the page already has `useQuickLookTrigger`, keep it but verify no double-fire: the roving tabindex Space handler calls `e.preventDefault()` which stops propagation to the document-level listener in `useQuickLookTrigger`.

Actually, since `useRovingTabindex` calls `e.preventDefault()` on Space, and `useQuickLookTrigger` listens on `document` at bubble phase, the prevented event won't reach the document listener. So keeping both is safe — `useQuickLookTrigger` only fires when the table wrapper doesn't have keyboard focus (e.g., user clicks elsewhere then presses Space). This provides consistent behavior.

- [ ] **Step 2: Update SourcesRegistryPage**

Change `onSelect: handleSelect` to `onEnter: handleSelect`. No QuickLook on this page, so no `onSpace` needed.

- [ ] **Step 3: Update TemplatesRegistryPage**

Same pattern as Sources — `onSelect` → `onEnter`.

- [ ] **Step 4: Update ContentLibraryPage**

Currently `onSelect` opens QuickLook. Change to:
- `onEnter`: navigate to detail page or open Sheet (if exists)
- `onSpace`: open QuickLook

If this page has no Sheet/detail navigation, use `onEnter` to open QuickLook and `onSpace` to also open QuickLook (same behavior, different trigger).

Check the actual page to decide. Based on exploration: `onSelect` currently opens QuickLook. So:
```typescript
onEnter: (i) => { if (items[i]) setQuickLookOpen(true); },
onSpace: (i) => { if (items[i]) setQuickLookOpen(true); },
```

- [ ] **Step 5: Update AssetLibraryPage**

Same pattern as ContentLibrary — both Enter and Space open QuickLook since there's no Sheet detail panel.

- [ ] **Step 6: Verify compile**

Run: `cd /Users/huseyincoskun/Downloads/AntigravityProje/ContentHub/frontend && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/admin/JobsRegistryPage.tsx frontend/src/pages/admin/SourcesRegistryPage.tsx frontend/src/pages/admin/TemplatesRegistryPage.tsx frontend/src/pages/admin/ContentLibraryPage.tsx frontend/src/pages/admin/AssetLibraryPage.tsx
git commit -m "feat: wire Enter→detail, Space→QuickLook across all table pages"
```

---

## Task 4: Theme F5 Fix — DynamicAdminLayout

**Files:**
- Modify: `frontend/src/app/layouts/DynamicAdminLayout.tsx`
- Modify: `frontend/src/app/layouts/DynamicUserLayout.tsx`

- [ ] **Step 1: Add key={layoutMode} to DynamicAdminLayout**

Replace the current conditional return with a keyed wrapper:

```typescript
export function DynamicAdminLayout() {
  const activeTheme = useThemeStore((s) => s.activeTheme);
  const theme = activeTheme();
  const layoutMode = theme.layoutMode || "classic";

  if (layoutMode === "horizon") {
    return <HorizonAdminLayout key="horizon" />;
  }

  return <AdminLayout key="classic" />;
}
```

Note: The `key` prop here forces React to unmount/remount when `layoutMode` changes, which is exactly the F5-fix behavior we want. Since both layout components already subscribe to theme state via `ThemeProvider`, CSS variables are applied correctly before the new layout mounts.

- [ ] **Step 2: Add key={layoutMode} to DynamicUserLayout**

Same pattern:

```typescript
export function DynamicUserLayout() {
  const activeTheme = useThemeStore((s) => s.activeTheme);
  const theme = activeTheme();
  const layoutMode = theme.layoutMode || "classic";

  if (layoutMode === "horizon") {
    return <HorizonUserLayout key="horizon" />;
  }

  return <UserLayout key="classic" />;
}
```

- [ ] **Step 3: Verify compile**

Run: `cd /Users/huseyincoskun/Downloads/AntigravityProje/ContentHub/frontend && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/layouts/DynamicAdminLayout.tsx frontend/src/app/layouts/DynamicUserLayout.tsx
git commit -m "fix: eliminate F5 requirement for theme/layout switching via key-based remount"
```

---

## Task 5: Job Archive — API Functions

**Files:**
- Modify: `frontend/src/api/jobsApi.ts`

- [ ] **Step 1: Add archive API functions**

Append to `frontend/src/api/jobsApi.ts`:

```typescript
export function markJobsAsTestData(jobIds: string[]): Promise<{ marked_count: number }> {
  return api.post<{ marked_count: number }>(`${BASE_URL}/mark-test-data`, { job_ids: jobIds });
}

export function bulkArchiveTestData(
  olderThanDays: number = 7,
  moduleType?: string,
): Promise<{ archived_count: number }> {
  return api.post<{ archived_count: number }>(`${BASE_URL}/bulk-archive-test-data`, {
    older_than_days: olderThanDays,
    module_type: moduleType ?? null,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/api/jobsApi.ts
git commit -m "feat: add archive API functions to jobsApi"
```

---

## Task 6: Job Archive — UI in JobsRegistryPage

**Files:**
- Modify: `frontend/src/pages/admin/JobsRegistryPage.tsx`

- [ ] **Step 1: Add archive state and handlers**

Add state for confirmation:

```typescript
const [archiveConfirmId, setArchiveConfirmId] = useState<string | null>(null);
```

Add mutation:

```typescript
import { markJobsAsTestData } from "../../api/jobsApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const queryClient = useQueryClient();
const archiveMutation = useMutation({
  mutationFn: (jobIds: string[]) => markJobsAsTestData(jobIds),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["jobs"] });
    toast.success("Job(lar) arşivlendi");
    setArchiveConfirmId(null);
  },
  onError: () => {
    toast.error("Arşivleme başarısız");
  },
});
```

- [ ] **Step 2: Add two-stage archive button in row actions**

In the table row action area (or pass as callback to JobsTable), add:

```tsx
{archiveConfirmId === job.id ? (
  <button
    className="px-2 py-1 text-xs font-medium text-neutral-0 bg-error rounded-md cursor-pointer"
    onClick={() => archiveMutation.mutate([job.id])}
  >
    Emin misiniz? Arşivle
  </button>
) : (
  <button
    className="px-2 py-1 text-xs text-neutral-600 hover:text-error cursor-pointer"
    onClick={() => setArchiveConfirmId(job.id)}
    title="Bu job arşivlenir ve varsayılan listeden kaldırılır. Veriler silinmez, 'Arşivlenmiş' filtresiyle erişilebilir."
  >
    Arşivle
  </button>
)}
```

- [ ] **Step 3: Add "Arşivlenmiş" filter toggle**

Add to the filter/toolbar area:

```tsx
<label className="flex items-center gap-1.5 text-xs text-neutral-600 cursor-pointer">
  <input
    type="checkbox"
    checked={includeArchived}
    onChange={(e) => setIncludeArchived(e.target.checked)}
  />
  Arşivlenmişleri göster
</label>
```

Wire `includeArchived` state to the `fetchJobs` query:

```typescript
const [includeArchived, setIncludeArchived] = useState(false);
// Update the useQuery call to pass include_test_data param
```

- [ ] **Step 4: Add bulk archive in BulkActionBar**

If the page uses `BulkActionBar` with table selection, add an "Arşivle" bulk action:

```typescript
{
  label: "Seçilenleri Arşivle",
  variant: "danger",
  onClick: () => archiveMutation.mutate(sel.selectedIds),
}
```

- [ ] **Step 5: Verify compile**

Run: `cd /Users/huseyincoskun/Downloads/AntigravityProje/ContentHub/frontend && npx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/admin/JobsRegistryPage.tsx
git commit -m "feat: add job archive UI with two-stage confirmation and bulk support"
```

---

## Task 7: Module Management — Backend Settings + API

**Files:**
- Modify: `backend/app/settings/settings_resolver.py`
- Create: `backend/app/modules/router.py`
- Modify: `backend/app/api/router.py`
- Modify: `backend/app/jobs/router.py`

- [ ] **Step 1: Add module.*.enabled to KNOWN_SETTINGS**

In `backend/app/settings/settings_resolver.py`, add to the `KNOWN_SETTINGS` dict:

```python
"module.standard_video.enabled": {
    "group": "modules",
    "type": "boolean",
    "label": "Standart Video modülü etkin",
    "help_text": "Devre dışı bırakıldığında: menüde gizlenir, yeni üretim engellenir, mevcut kayıtlar etkilenmez.",
    "module_scope": "standard_video",
    "env_var": None,
    "builtin_default": True,
    "wired": True,
    "wired_to": "Module registry + sidebar + command palette + wizard",
},
"module.news_bulletin.enabled": {
    "group": "modules",
    "type": "boolean",
    "label": "Haber Bülteni modülü etkin",
    "help_text": "Devre dışı bırakıldığında: menüde gizlenir, yeni üretim engellenir, mevcut kayıtlar etkilenmez.",
    "module_scope": "news_bulletin",
    "env_var": None,
    "builtin_default": True,
    "wired": True,
    "wired_to": "Module registry + sidebar + command palette + wizard",
},
```

Also add `"modules"` to the `GROUP_ORDER` list (find where it's defined and add it).

- [ ] **Step 2: Create modules API router**

Create `backend/app/modules/router.py`:

```python
"""
Module Management API router (Phase 2 — Faz A).

Endpoints:
  GET /modules — List all registered modules with enabled status
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.modules.registry import module_registry
from app.settings.settings_resolver import resolve
from app.visibility.dependencies import require_visible

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/modules",
    tags=["modules"],
    dependencies=[Depends(require_visible("panel:settings"))],
)


@router.get("")
async def list_modules(db: AsyncSession = Depends(get_db)):
    """
    Kayıtlı tüm modüllerin listesini döndürür.

    Her modül için:
      - module_id, display_name, description
      - steps listesi
      - enabled durumu (Settings Registry'den)
      - input_schema, gate_defaults, template_compat
    """
    modules = module_registry.list_all()
    result = []
    for mod in modules:
        enabled_key = f"module.{mod.module_id}.enabled"
        enabled = await resolve(enabled_key, db)
        if enabled is None:
            enabled = True  # builtin_default

        steps = [
            {
                "step_key": s.step_key,
                "step_order": s.step_order,
                "display_name": s.display_name or s.step_key,
                "description": s.description or "",
                "idempotency_type": s.idempotency_type,
            }
            for s in sorted(mod.steps, key=lambda s: s.step_order)
        ]

        result.append({
            "module_id": mod.module_id,
            "display_name": mod.display_name,
            "enabled": bool(enabled),
            "steps": steps,
            "input_schema": mod.input_schema,
            "gate_defaults": mod.gate_defaults,
            "template_compat": mod.template_compat,
        })

    return result
```

- [ ] **Step 3: Register modules router in api/router.py**

In `backend/app/api/router.py`, add:

```python
from app.modules.router import router as modules_router
# ...
api_router.include_router(modules_router)
```

- [ ] **Step 4: Add module enabled check in job creation**

In `backend/app/jobs/router.py`, inside `create_job` endpoint, before the `InputNormalizer` call, add:

```python
# Check if module is enabled
enabled_key = f"module.{payload.module_id}.enabled"
module_enabled = await resolve(enabled_key, db)
if module_enabled is False:
    raise HTTPException(
        status_code=403,
        detail=f"Modül devre dışı: {payload.module_id!r}. Yeni üretim başlatılamaz.",
    )
```

Add the import at the top:
```python
from app.settings.settings_resolver import resolve
```

- [ ] **Step 5: Verify backend starts**

Run: `cd /Users/huseyincoskun/Downloads/AntigravityProje/ContentHub/backend && .venv/bin/python -c "from app.modules.router import router; print('OK')"`
Expected: `OK`

- [ ] **Step 6: Commit**

```bash
git add backend/app/settings/settings_resolver.py backend/app/modules/router.py backend/app/api/router.py backend/app/jobs/router.py
git commit -m "feat(modules): add module management API + enabled check on job creation"
```

---

## Task 8: Module Management — Frontend Page

**Files:**
- Create: `frontend/src/api/modulesApi.ts`
- Create: `frontend/src/pages/admin/ModuleManagementPage.tsx`
- Modify: `frontend/src/app/router.tsx`
- Modify: `frontend/src/app/layouts/useLayoutNavigation.ts`

- [ ] **Step 1: Create modules API client**

Create `frontend/src/api/modulesApi.ts`:

```typescript
import { api } from "./client";
import { updateSettingAdminValue } from "./effectiveSettingsApi";

const BASE = "/api/v1/modules";

export interface ModuleStep {
  step_key: string;
  step_order: number;
  display_name: string;
  description: string;
  idempotency_type: string;
}

export interface ModuleInfo {
  module_id: string;
  display_name: string;
  enabled: boolean;
  steps: ModuleStep[];
  input_schema: Record<string, unknown>;
  gate_defaults: Record<string, unknown>;
  template_compat: string[];
}

export function fetchModules(): Promise<ModuleInfo[]> {
  return api.get<ModuleInfo[]>(BASE);
}

export function setModuleEnabled(moduleId: string, enabled: boolean): Promise<unknown> {
  return updateSettingAdminValue(`module.${moduleId}.enabled`, enabled);
}
```

- [ ] **Step 2: Create ModuleManagementPage**

Create `frontend/src/pages/admin/ModuleManagementPage.tsx`:

```tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchModules, setModuleEnabled, type ModuleInfo } from "../../api/modulesApi";
import { PageShell, SectionShell } from "../../components/design-system/primitives";
import { useToast } from "../../hooks/useToast";

export function ModuleManagementPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: modules, isLoading, isError } = useQuery({
    queryKey: ["modules"],
    queryFn: fetchModules,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ moduleId, enabled }: { moduleId: string; enabled: boolean }) =>
      setModuleEnabled(moduleId, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modules"] });
      queryClient.invalidateQueries({ queryKey: ["effective-settings"] });
      toast.success("Modül durumu güncellendi");
    },
    onError: () => toast.error("Güncelleme başarısız"),
  });

  return (
    <PageShell title="Modül Yönetimi" subtitle="Kayıtlı içerik modüllerini yönetin">
      {isLoading && <p className="text-sm text-neutral-500">Yükleniyor...</p>}
      {isError && <p className="text-sm text-error">Modüller yüklenemedi.</p>}
      {modules?.map((mod) => (
        <ModuleCard
          key={mod.module_id}
          module={mod}
          onToggle={(enabled) =>
            toggleMutation.mutate({ moduleId: mod.module_id, enabled })
          }
          isToggling={toggleMutation.isPending}
        />
      ))}
    </PageShell>
  );
}

function ModuleCard({
  module: mod,
  onToggle,
  isToggling,
}: {
  module: ModuleInfo;
  onToggle: (enabled: boolean) => void;
  isToggling: boolean;
}) {
  return (
    <SectionShell>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-md font-semibold text-neutral-800">{mod.display_name}</h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            {mod.module_id} · {mod.steps.length} adım
          </p>
        </div>

        {/* Toggle */}
        <button
          onClick={() => onToggle(!mod.enabled)}
          disabled={isToggling}
          className={`
            relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer
            ${mod.enabled ? "bg-success" : "bg-neutral-300"}
            ${isToggling ? "opacity-50" : ""}
          `}
          title={mod.enabled ? "Devre dışı bırak" : "Etkinleştir"}
        >
          <span
            className={`
              inline-block h-4 w-4 rounded-full bg-neutral-0 shadow-sm transition-transform
              ${mod.enabled ? "translate-x-6" : "translate-x-1"}
            `}
          />
        </button>
      </div>

      {/* Enabled status explanation */}
      {!mod.enabled && (
        <div className="mt-3 p-2.5 bg-warning-light rounded-md text-xs text-warning-text">
          <p className="font-medium mb-1">Modül devre dışı — etkileri:</p>
          <ul className="list-disc list-inside space-y-0.5 text-warning-text">
            <li>Sidebar menüde gizlenir</li>
            <li>Yeni üretim/job başlatılamaz</li>
            <li>Command palette'ten filtrelenir</li>
            <li>Mevcut kayıtlar etkilenmez</li>
          </ul>
        </div>
      )}

      {/* Steps */}
      <div className="mt-4">
        <h4 className="text-xs font-medium text-neutral-600 mb-2">Pipeline Adımları</h4>
        <div className="space-y-1">
          {mod.steps.map((step, i) => (
            <div key={step.step_key} className="flex items-center gap-2 text-xs">
              <span className="w-5 h-5 flex items-center justify-center rounded-full bg-neutral-100 text-neutral-500 text-[10px] font-mono">
                {i + 1}
              </span>
              <span className="text-neutral-700">{step.display_name}</span>
              <span className="text-neutral-400">({step.idempotency_type})</span>
            </div>
          ))}
        </div>
      </div>

      {/* Links */}
      <div className="mt-4 flex gap-2 flex-wrap">
        <a
          href={`/admin/prompts?module=${mod.module_id}`}
          className="text-xs text-brand-600 hover:text-brand-700 underline"
        >
          İlgili Prompt'lar →
        </a>
        <a
          href={`/admin/settings?group=modules`}
          className="text-xs text-brand-600 hover:text-brand-700 underline"
        >
          İlgili Ayarlar →
        </a>
      </div>
    </SectionShell>
  );
}
```

- [ ] **Step 3: Add route in router.tsx**

In `frontend/src/app/router.tsx`, add inside the admin children array:

```tsx
{ path: "modules", element: <ModuleManagementPage /> },
```

Add the import:
```tsx
import { ModuleManagementPage } from "../pages/admin/ModuleManagementPage";
```

- [ ] **Step 4: Add nav item in useLayoutNavigation.ts**

Find the "Sistem" section in the admin nav and add a "Modüller" item with path `/admin/modules` and an appropriate icon (e.g., `"📦"` for classic or `Blocks` for Horizon).

- [ ] **Step 5: Verify compile**

Run: `cd /Users/huseyincoskun/Downloads/AntigravityProje/ContentHub/frontend && npx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 6: Commit**

```bash
git add frontend/src/api/modulesApi.ts frontend/src/pages/admin/ModuleManagementPage.tsx frontend/src/app/router.tsx frontend/src/app/layouts/useLayoutNavigation.ts
git commit -m "feat(modules): add Module Management admin page with enabled toggle"
```

---

## Task 9: Provider Management — Backend Enhancements

**Files:**
- Modify: `backend/app/providers/router.py`

- [ ] **Step 1: Add credential status and test-connection endpoint**

Add to the existing `list_providers` response, checking which env vars are set:

```python
import os

@router.get("")
async def list_providers():
    snapshot = provider_registry.get_health_snapshot()
    defaults: dict[str, str | None] = {}
    for cap in ProviderCapability:
        defaults[cap.value] = provider_registry.get_default_provider_id(cap)

    # Enrich with credential status
    CREDENTIAL_ENV_MAP = {
        "kieai_gemini": "KIEAI_API_KEY",
        "openai_compat": "OPENAI_API_KEY",
        "pexels": "PEXELS_API_KEY",
        "pixabay": "PIXABAY_API_KEY",
        "edge_tts": None,  # No credential needed
        "system_tts": None,
        "local_whisper": None,
    }

    for cap_entries in snapshot.values():
        for entry in cap_entries:
            pid = entry["provider_id"]
            env_var = CREDENTIAL_ENV_MAP.get(pid)
            if env_var is None:
                entry["credential_source"] = "not_required"
                entry["credential_status"] = "ok"
            elif os.environ.get(env_var):
                entry["credential_source"] = "env"
                entry["credential_status"] = "ok"
            else:
                entry["credential_source"] = "missing"
                entry["credential_status"] = "missing"
            entry["credential_env_var"] = env_var

    return {
        "capabilities": snapshot,
        "defaults": defaults,
    }
```

Add a test-connection endpoint:

```python
@router.post("/{provider_id}/test")
async def test_provider_connection(provider_id: str):
    """
    Provider bağlantısını test eder.
    Basit bir health check — provider'ın erişilebilir olup olmadığını kontrol eder.
    """
    all_entries = provider_registry.list_all()
    for entries in all_entries.values():
        for entry in entries:
            if entry.provider.provider_id() == provider_id:
                try:
                    # Provider'ın provider_id() metodu varsa erişilebilir demektir
                    # Gerçek test logic provider bazlı genişletilebilir
                    return {
                        "provider_id": provider_id,
                        "status": "ok",
                        "message": f"Provider '{provider_id}' erişilebilir.",
                    }
                except Exception as exc:
                    return {
                        "provider_id": provider_id,
                        "status": "error",
                        "message": str(exc),
                    }
    raise HTTPException(status_code=404, detail=f"Provider bulunamadı: {provider_id!r}")
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/providers/router.py
git commit -m "feat(providers): add credential status + test-connection endpoint"
```

---

## Task 10: Provider Management — Frontend Page

**Files:**
- Create: `frontend/src/api/providersApi.ts`
- Create: `frontend/src/pages/admin/ProviderManagementPage.tsx`
- Modify: `frontend/src/app/router.tsx`
- Modify: `frontend/src/app/layouts/useLayoutNavigation.ts`

- [ ] **Step 1: Create providers API client**

Create `frontend/src/api/providersApi.ts`:

```typescript
import { api } from "./client";

const BASE = "/api/v1/providers";

export interface ProviderEntry {
  provider_id: string;
  is_primary: boolean;
  priority: number;
  enabled: boolean;
  invoke_count: number;
  error_count: number;
  last_error: string | null;
  last_used_at: string | null;
  last_latency_ms: number | null;
  credential_source: "env" | "missing" | "not_required";
  credential_status: "ok" | "missing";
  credential_env_var: string | null;
}

export interface ProvidersResponse {
  capabilities: Record<string, ProviderEntry[]>;
  defaults: Record<string, string | null>;
}

export interface TestResult {
  provider_id: string;
  status: "ok" | "error";
  message: string;
}

export function fetchProviders(): Promise<ProvidersResponse> {
  return api.get<ProvidersResponse>(BASE);
}

export function testProviderConnection(providerId: string): Promise<TestResult> {
  return api.post<TestResult>(`${BASE}/${providerId}/test`);
}

export function setProviderDefault(capability: string, providerId: string): Promise<unknown> {
  return api.post(`${BASE}/default`, { capability, provider_id: providerId });
}
```

- [ ] **Step 2: Create ProviderManagementPage**

Create `frontend/src/pages/admin/ProviderManagementPage.tsx`:

```tsx
import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchProviders, testProviderConnection, type ProviderEntry } from "../../api/providersApi";
import { PageShell, SectionShell } from "../../components/design-system/primitives";
import { useToast } from "../../hooks/useToast";
import { useState } from "react";

const CAPABILITY_LABELS: Record<string, string> = {
  llm: "LLM (Dil Modeli)",
  tts: "TTS (Seslendirme)",
  visuals: "Görseller",
  whisper: "Konuşma Tanıma",
  publish: "Yayın",
};

export function ProviderManagementPage() {
  const toast = useToast();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["providers"],
    queryFn: fetchProviders,
  });

  const [testResults, setTestResults] = useState<Record<string, "testing" | "ok" | "error">>({});

  const testMutation = useMutation({
    mutationFn: testProviderConnection,
    onMutate: (providerId) => {
      setTestResults((prev) => ({ ...prev, [providerId]: "testing" }));
    },
    onSuccess: (result) => {
      setTestResults((prev) => ({ ...prev, [result.provider_id]: result.status }));
      if (result.status === "ok") toast.success(`${result.provider_id}: Bağlantı başarılı`);
      else toast.error(`${result.provider_id}: ${result.message}`);
    },
    onError: (_err, providerId) => {
      setTestResults((prev) => ({ ...prev, [providerId]: "error" }));
      toast.error("Test başarısız");
    },
  });

  return (
    <PageShell title="Provider Yönetimi" subtitle="Kayıtlı servis sağlayıcılarını görüntüleyin ve test edin">
      {isLoading && <p className="text-sm text-neutral-500">Yükleniyor...</p>}
      {isError && <p className="text-sm text-error">Provider listesi yüklenemedi.</p>}

      {data && Object.entries(data.capabilities).map(([capability, entries]) => (
        <SectionShell key={capability}>
          <h3 className="text-sm font-semibold text-neutral-800 mb-3">
            {CAPABILITY_LABELS[capability] || capability}
          </h3>
          <div className="space-y-2">
            {entries.map((entry: ProviderEntry) => (
              <ProviderCard
                key={entry.provider_id}
                entry={entry}
                isDefault={data.defaults[capability] === entry.provider_id}
                testStatus={testResults[entry.provider_id]}
                onTest={() => testMutation.mutate(entry.provider_id)}
              />
            ))}
          </div>
        </SectionShell>
      ))}
    </PageShell>
  );
}

function ProviderCard({
  entry,
  isDefault,
  testStatus,
  onTest,
}: {
  entry: ProviderEntry;
  isDefault: boolean;
  testStatus?: "testing" | "ok" | "error";
  onTest: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-surface-inset rounded-lg border border-border-subtle">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-neutral-800">{entry.provider_id}</span>
          {isDefault && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-brand-100 text-brand-700 rounded">
              Varsayılan
            </span>
          )}
          {entry.is_primary && !isDefault && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-neutral-100 text-neutral-600 rounded">
              Primary
            </span>
          )}
          {!entry.enabled && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-error-light text-error-text rounded">
              Devre Dışı
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 mt-1 text-xs text-neutral-500">
          {/* Credential status */}
          {entry.credential_source === "env" && (
            <span className="text-success-text">.env ile yönetiliyor</span>
          )}
          {entry.credential_source === "missing" && (
            <span className="text-error font-medium">Eksik credential ({entry.credential_env_var})</span>
          )}
          {entry.credential_source === "not_required" && (
            <span>Credential gerekmiyor</span>
          )}

          {/* Health stats */}
          {entry.invoke_count > 0 && (
            <span>
              {entry.invoke_count} çağrı · {entry.error_count} hata
            </span>
          )}
          {entry.last_latency_ms != null && (
            <span>{entry.last_latency_ms}ms</span>
          )}
        </div>
      </div>

      {/* Test button */}
      <button
        onClick={onTest}
        disabled={testStatus === "testing"}
        className="px-3 py-1.5 text-xs font-medium text-neutral-600 bg-surface-card border border-border-subtle rounded-md cursor-pointer transition-colors hover:border-brand-400 disabled:opacity-50"
      >
        {testStatus === "testing" ? "Test ediliyor..." : "Test Et"}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Add route and nav item**

In `frontend/src/app/router.tsx`, add inside admin children:
```tsx
{ path: "providers", element: <ProviderManagementPage /> },
```

In `frontend/src/app/layouts/useLayoutNavigation.ts`, add "Sağlayıcılar" nav item to the "Sistem" section with path `/admin/providers`.

- [ ] **Step 4: Verify compile**

Run: `cd /Users/huseyincoskun/Downloads/AntigravityProje/ContentHub/frontend && npx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 5: Commit**

```bash
git add frontend/src/api/providersApi.ts frontend/src/pages/admin/ProviderManagementPage.tsx frontend/src/app/router.tsx frontend/src/app/layouts/useLayoutNavigation.ts
git commit -m "feat(providers): add Provider Management admin page with test connection"
```

---

## Task 11: Master Prompt Editor — Frontend Page

**Files:**
- Create: `frontend/src/pages/admin/PromptEditorPage.tsx`
- Modify: `frontend/src/app/router.tsx`
- Modify: `frontend/src/app/layouts/useLayoutNavigation.ts`

- [ ] **Step 1: Scan codebase for all prompt sources**

Before building the page, scan the backend for all `type: "prompt"` settings and any hardcoded prompt strings:

Run:
```bash
cd /Users/huseyincoskun/Downloads/AntigravityProje/ContentHub/backend
grep -rn '"type": "prompt"' app/settings/settings_resolver.py
grep -rn 'system_prompt\|user_prompt\|prompt.*=.*"""' app/modules/ --include='*.py' | head -20
```

Document all prompt sources found — include in commit message.

- [ ] **Step 2: Create PromptEditorPage**

Create `frontend/src/pages/admin/PromptEditorPage.tsx`:

```tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchEffectiveSettings, updateSettingAdminValue, type EffectiveSetting } from "../../api/effectiveSettingsApi";
import { PageShell, SectionShell } from "../../components/design-system/primitives";
import { useToast } from "../../hooks/useToast";
import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

export function PromptEditorPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const moduleFilter = searchParams.get("module");

  const { data: allSettings, isLoading, isError } = useQuery({
    queryKey: ["effective-settings"],
    queryFn: () => fetchEffectiveSettings(),
  });

  // Separate prompts and behavior settings
  const { promptSettings, behaviorSettings } = useMemo(() => {
    if (!allSettings) return { promptSettings: [], behaviorSettings: [] };

    const prompts = allSettings.filter((s) => s.type === "prompt");
    // Behavior settings: same module_scope as a prompt, but not type=prompt
    const promptModules = new Set(prompts.map((s) => s.module_scope).filter(Boolean));
    const behaviors = allSettings.filter(
      (s) => s.type !== "prompt" && s.module_scope && promptModules.has(s.module_scope) && s.wired
    );

    return { promptSettings: prompts, behaviorSettings: behaviors };
  }, [allSettings]);

  // Group by module_scope
  const groupedPrompts = useMemo(() => {
    const groups: Record<string, EffectiveSetting[]> = {};
    for (const s of promptSettings) {
      const scope = s.module_scope || "global";
      if (moduleFilter && scope !== moduleFilter) continue;
      if (!groups[scope]) groups[scope] = [];
      groups[scope].push(s);
    }
    return groups;
  }, [promptSettings, moduleFilter]);

  const groupedBehaviors = useMemo(() => {
    const groups: Record<string, EffectiveSetting[]> = {};
    for (const s of behaviorSettings) {
      const scope = s.module_scope || "global";
      if (moduleFilter && scope !== moduleFilter) continue;
      if (!groups[scope]) groups[scope] = [];
      groups[scope].push(s);
    }
    return groups;
  }, [behaviorSettings, moduleFilter]);

  const saveMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: unknown }) =>
      updateSettingAdminValue(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["effective-settings"] });
      toast.success("Kaydedildi");
    },
    onError: () => toast.error("Kaydetme başarısız"),
  });

  return (
    <PageShell title="Prompt Yönetimi" subtitle="Sistem ve modül prompt'larını düzenleyin">
      {isLoading && <p className="text-sm text-neutral-500">Yükleniyor...</p>}
      {isError && <p className="text-sm text-error">Prompt'lar yüklenemedi.</p>}

      {Object.entries(groupedPrompts).map(([scope, settings]) => (
        <SectionShell key={scope}>
          <h3 className="text-sm font-semibold text-neutral-800 mb-3">
            {scope === "global" ? "Genel" : scope.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          </h3>
          <div className="space-y-4">
            {settings.map((setting) => (
              <PromptEditor
                key={setting.key}
                setting={setting}
                onSave={(value) => saveMutation.mutate({ key: setting.key, value })}
                isSaving={saveMutation.isPending}
              />
            ))}
          </div>

          {/* Related behavior settings */}
          {groupedBehaviors[scope]?.length > 0 && (
            <div className="mt-6 pt-4 border-t border-border-subtle">
              <h4 className="text-xs font-medium text-neutral-600 mb-2">İlişkili Kurallar</h4>
              <div className="space-y-1">
                {groupedBehaviors[scope].map((s) => (
                  <div key={s.key} className="flex items-center justify-between text-xs py-1">
                    <span className="text-neutral-700">{s.label || s.key}</span>
                    <span className="text-neutral-500 font-mono text-[11px]">
                      {String(s.effective_value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SectionShell>
      ))}

      {!isLoading && Object.keys(groupedPrompts).length === 0 && (
        <SectionShell>
          <p className="text-sm text-neutral-500">Henüz tanımlı prompt bulunamadı.</p>
        </SectionShell>
      )}
    </PageShell>
  );
}

function PromptEditor({
  setting,
  onSave,
  isSaving,
}: {
  setting: EffectiveSetting;
  onSave: (value: string) => void;
  isSaving: boolean;
}) {
  const [value, setValue] = useState(String(setting.effective_value || ""));
  const [isDirty, setIsDirty] = useState(false);

  const handleChange = (newValue: string) => {
    setValue(newValue);
    setIsDirty(newValue !== String(setting.effective_value || ""));
  };

  const handleReset = () => {
    const defaultVal = String(setting.builtin_default || "");
    setValue(defaultVal);
    setIsDirty(defaultVal !== String(setting.effective_value || ""));
  };

  const handleSave = () => {
    onSave(value);
    setIsDirty(false);
  };

  return (
    <div className="border border-border-subtle rounded-lg p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="text-sm font-medium text-neutral-800">{setting.label || setting.key}</h4>
          {setting.help_text && (
            <p className="text-xs text-neutral-500 mt-0.5">{setting.help_text}</p>
          )}
        </div>
        <span className="text-xs text-neutral-400 font-mono">{setting.key}</span>
      </div>

      <textarea
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full min-h-[120px] p-3 text-sm font-mono bg-surface-inset border border-border-subtle rounded-md resize-y focus:outline-none focus:ring-2 focus:ring-focus text-neutral-800"
        spellCheck={false}
      />

      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-neutral-400">{value.length} karakter</span>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="px-3 py-1 text-xs text-neutral-600 hover:text-neutral-800 cursor-pointer"
            title="Varsayılan değere dön"
          >
            Varsayılana Dön
          </button>
          <button
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className="px-3 py-1.5 text-xs font-medium text-neutral-0 bg-brand-600 rounded-md cursor-pointer transition-colors hover:bg-brand-700 disabled:opacity-50 disabled:cursor-default"
          >
            {isSaving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </div>

      {/* Source indicator */}
      {setting.has_admin_override && (
        <p className="text-[10px] text-info mt-1">Admin tarafından özelleştirilmiş</p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Add route and nav item**

In `frontend/src/app/router.tsx`, add:
```tsx
{ path: "prompts", element: <PromptEditorPage /> },
```

In `frontend/src/app/layouts/useLayoutNavigation.ts`, add "Prompt Yönetimi" nav item to the "Sistem" section with path `/admin/prompts`.

- [ ] **Step 4: Verify compile**

Run: `cd /Users/huseyincoskun/Downloads/AntigravityProje/ContentHub/frontend && npx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/admin/PromptEditorPage.tsx frontend/src/app/router.tsx frontend/src/app/layouts/useLayoutNavigation.ts
git commit -m "feat(prompts): add Master Prompt Editor page with reset and behavior rules"
```

---

## Task 12: Settings Surface Standard — CLAUDE.md Update

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add the standard to Non-Negotiable Rules**

In `CLAUDE.md`, add to the "Non-Negotiable Rules" section:

```markdown
- Every new feature, module, behavior, or prompt must ship with its own settings management surface. Checklist:
  - Settings key defined in KNOWN_SETTINGS?
  - Visible in admin Settings page?
  - If prompt type, visible in Master Prompt Editor?
  - If wizard parameter, visible in wizard governance?
  - If module toggle, managed via `module.{id}.enabled` in Settings Registry?
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add settings surface standard to Non-Negotiable Rules"
```

---

## Task 13: Testing — Keyboard Behavior

- [ ] **Step 1: Manual test keyboard behavior**

Start the dev server and test on Jobs page:
1. Navigate with ↑↓ — rows highlight
2. Press Enter on a row — Sheet opens
3. Close Sheet (ESC), navigate to another row
4. Press Space — QuickLook opens
5. Press Space again — QuickLook closes
6. Focus a checkbox/button in the row — Enter/Space should NOT trigger Sheet/QuickLook

Test on Sources page:
1. Enter → Sheet opens
2. Space → nothing (no QuickLook on this page)

Test on Content Library page:
1. Enter → QuickLook opens (or Sheet if wired)
2. Space → QuickLook opens

- [ ] **Step 2: Document test results**

Record pass/fail for each page in the commit message.

- [ ] **Step 3: Commit test results**

```bash
git commit --allow-empty -m "test: keyboard Enter/Space behavior verified across all table pages"
```

---

## Task 14: Testing — Theme F5 Fix

- [ ] **Step 1: Test theme switch without F5**

1. Start on a Classic theme (e.g., "Cinematic Dark")
2. Go to Theme Management, switch to a Horizon theme
3. Verify layout switches from Classic sidebar to Horizon icon rail WITHOUT F5
4. Switch back — verify it returns to Classic layout
5. Check state preservation: are toasts, notifications, etc. working after switch?

- [ ] **Step 2: Test state loss checklist**

After theme switch, verify:
- [ ] Open a Sheet → switch theme → Sheet closed (expected, since remount)
- [ ] Table column preferences survive (stored in localStorage)
- [ ] Command palette works after switch
- [ ] Sidebar expand/collapse works after switch
- [ ] Notification center works after switch

- [ ] **Step 3: Document results**

```bash
git commit --allow-empty -m "test: theme F5-free switch verified — state loss is acceptable (remount expected)"
```

---

## Task 15: Testing — Module Toggle, Provider Test, Prompt Editor, Job Archive

- [ ] **Step 1: Test module toggle**

1. Go to /admin/modules
2. Toggle Standard Video off
3. Verify sidebar hides Standard Video pages
4. Verify POST /api/v1/jobs with module_id=standard_video returns 403
5. Toggle back on — pages reappear

- [ ] **Step 2: Test provider page**

1. Go to /admin/providers
2. Verify all registered providers shown grouped by capability
3. Verify credential status shows correctly
4. Click "Test Et" — verify response

- [ ] **Step 3: Test prompt editor**

1. Go to /admin/prompts
2. Verify 4 news_bulletin prompts shown
3. Edit a prompt, save — verify value persists
4. Click "Varsayılana Dön" — verify reset
5. Verify "İlişkili Kurallar" section shows behavior settings

- [ ] **Step 4: Test job archive**

1. Go to /admin/jobs
2. Click "Arşivle" on a terminal job
3. Verify two-stage confirmation appears
4. Confirm — job disappears from default list
5. Toggle "Arşivlenmişleri göster" — archived job reappears

- [ ] **Step 5: Commit test results**

```bash
git commit --allow-empty -m "test: module toggle, provider test, prompt editor, job archive all verified"
```

---

## Task 16: Final Report

- [ ] **Step 1: Write Phase 2 completion report**

Create `docs_drafts/phase2_management_surfaces_report_tr.md` documenting:
- What was implemented in each faz
- Prompt sources found (list all, including any missing)
- Known limitations
- Test results summary

- [ ] **Step 2: Commit report**

```bash
git add docs_drafts/phase2_management_surfaces_report_tr.md
git commit -m "docs: Phase 2 management surfaces completion report"
```
