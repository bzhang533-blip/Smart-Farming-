# v1 Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining 15% of Smart Farm v1 — shared farm state via Zustand, editable /farm page, /breakeven reads store (with fallback), and two small housekeeping items.

**Architecture:** A new Zustand store (`farmStore.ts`) lifts `FarmProfile` + `FieldInputs` out of `BreakevenClient` into shared state. `FarmClient` initializes the store on load and exposes per-field editing (name, crop, acres, APH). `BreakevenClient` reads from the store and falls back to fetching if navigated to directly. Save/Load scenarios continue to work because `buildScenario` reads from the store.

**Tech Stack:** Next.js 16 App Router · React 19 · TypeScript strict · Zustand (to be installed) · MSW (already in place) · Tailwind CSS 4

## Global Constraints

- All commands run inside `frontend/` directory
- `npx tsc --noEmit` must exit 0 after every task
- `npm test` (19 calc tests) must stay green throughout
- `npm run lint` must exit 0 after every task
- No `any` without explanatory comment
- No backend/Dart code changes
- `govtPaymentPerAcre` stays as config default — no input field (v1 decision)
- Add/delete farm fields deferred — mock fields are fixed in v1
- `PUT /scenarios/:id` deferred — delete + recreate is sufficient

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `frontend/src/lib/store/farmStore.ts` | **Create** | Zustand store: FarmProfile + fieldInputs + defaults + actions |
| `frontend/src/components/farm/FarmClient.tsx` | **Modify** | Load → write store; render editable field form |
| `frontend/src/components/breakeven/BreakevenClient.tsx` | **Modify** | Read from store; fallback fetch if store empty |
| `frontend/.env.example` | **Create** | Document `NEXT_PUBLIC_API_BASE` |
| `tasks/api-contracts.md` | **Modify** | Fix stale §1 GET /defaults response shape |

---

## Task 1: Install Zustand + Create farmStore.ts

**Files:**
- Create: `frontend/src/lib/store/farmStore.ts`

**Interfaces:**
- Produces: `useFarmStore` — a Zustand hook. Consumed by Tasks 2 and 3.

```ts
// What Task 2 and Task 3 consume from the store:
useFarmStore((s) => s.farm)                    // FarmProfile | null
useFarmStore((s) => s.defaults)                // DefaultsResponse | null
useFarmStore((s) => s.fieldInputs)             // Map<string, FieldInputs>
useFarmStore((s) => s.defaultFieldInputs)      // Map<string, FieldInputs>
useFarmStore((s) => s.initFromFetch)           // (farm, defaults) => void
useFarmStore((s) => s.updateFarmName)          // (name: string) => void
useFarmStore((s) => s.updateField)             // (fieldId, patch: Partial<Field>) => void
useFarmStore((s) => s.updateFieldInputs)       // (fieldId, inputs: FieldInputs) => void
useFarmStore.getState().farm                   // sync read, used in effects to skip re-fetch
```

- [ ] **Step 1: Install Zustand**

```bash
cd frontend && npm install zustand
```

Expected: resolves with no peer-dep errors. `package.json` gains `"zustand": "^..."` in `dependencies`.

- [ ] **Step 2: Create `frontend/src/lib/store/farmStore.ts`**

```ts
import { create } from "zustand";
import type { FarmProfile, Field } from "@/types/farm";
import type { DefaultsResponse } from "@/types/defaults";
import type { FieldInputs } from "@/components/breakeven/FieldInputPanel";
import type { CropKey } from "@/lib/calc/scenario";

// Build FieldInputs maps from a FarmProfile + DefaultsResponse.
// Used on initial load; also called when a field's crop changes.
function buildInputMaps(
  farm: FarmProfile,
  defaults: DefaultsResponse,
): {
  inputs: Map<string, FieldInputs>;
  defaultsMap: Map<string, FieldInputs>;
} {
  const inputs = new Map<string, FieldInputs>();
  const defaultsMap = new Map<string, FieldInputs>();
  for (const field of farm.fields) {
    const cropKey = field.crop as CropKey;
    const cropDefs = defaults.crops[cropKey];
    const fi: FieldInputs = {
      cashPricePerBu: 0,
      yieldBuPerAcre: field.aph,
      landCostPerAcre: cropDefs?.landCostPerAcre ?? 0,
      machineryCostPerAcre: cropDefs?.machineryCostPerAcre ?? 0,
      directCosts: cropDefs?.directCosts.map((c) => ({ ...c })) ?? [],
    };
    inputs.set(field.fieldId, fi);
    defaultsMap.set(field.fieldId, {
      ...fi,
      directCosts: fi.directCosts.map((c) => ({ ...c })),
    });
  }
  return { inputs, defaultsMap };
}

interface FarmState {
  farm: FarmProfile | null;
  defaults: DefaultsResponse | null;
  fieldInputs: Map<string, FieldInputs>;
  defaultFieldInputs: Map<string, FieldInputs>;
}

interface FarmActions {
  /** Called by FarmClient and BreakevenClient fallback after fetching from the API. */
  initFromFetch: (farm: FarmProfile, defaults: DefaultsResponse) => void;
  updateFarmName: (name: string) => void;
  /**
   * Patch any Field property. Side effects:
   * - patch.crop: re-seeds this field's FieldInputs from the new crop defaults.
   * - patch.aph (without crop): syncs fieldInputs[fieldId].yieldBuPerAcre.
   */
  updateField: (fieldId: string, patch: Partial<Field>) => void;
  /** Called by BreakevenClient's FieldInputPanel onChange. */
  updateFieldInputs: (fieldId: string, inputs: FieldInputs) => void;
}

export const useFarmStore = create<FarmState & FarmActions>((set, get) => ({
  farm: null,
  defaults: null,
  fieldInputs: new Map(),
  defaultFieldInputs: new Map(),

  initFromFetch(farm, defaults) {
    const { inputs, defaultsMap } = buildInputMaps(farm, defaults);
    set({
      farm,
      defaults,
      fieldInputs: inputs,
      defaultFieldInputs: defaultsMap,
    });
  },

  updateFarmName(name) {
    const { farm } = get();
    if (!farm) return;
    set({ farm: { ...farm, name } });
  },

  updateField(fieldId, patch) {
    const { farm, defaults, fieldInputs, defaultFieldInputs } = get();
    if (!farm) return;

    const updatedFields = farm.fields.map((f) =>
      f.fieldId === fieldId ? { ...f, ...patch } : f,
    );
    const updates: Partial<FarmState> = {
      farm: { ...farm, fields: updatedFields },
    };

    // Crop changed: re-seed FieldInputs from new crop defaults.
    if (patch.crop !== undefined && defaults) {
      const cropKey = patch.crop as CropKey;
      const cropDefs = defaults.crops[cropKey];
      const currentAph =
        farm.fields.find((f) => f.fieldId === fieldId)?.aph ?? 0;
      const fi: FieldInputs = {
        cashPricePerBu: 0,
        yieldBuPerAcre: currentAph,
        landCostPerAcre: cropDefs?.landCostPerAcre ?? 0,
        machineryCostPerAcre: cropDefs?.machineryCostPerAcre ?? 0,
        directCosts: cropDefs?.directCosts.map((c) => ({ ...c })) ?? [],
      };
      updates.fieldInputs = new Map(fieldInputs).set(fieldId, fi);
      updates.defaultFieldInputs = new Map(defaultFieldInputs).set(fieldId, {
        ...fi,
        directCosts: fi.directCosts.map((c) => ({ ...c })),
      });
    }

    // APH changed (without crop change): sync yieldBuPerAcre.
    if (patch.aph !== undefined && patch.crop === undefined) {
      const fi = fieldInputs.get(fieldId);
      if (fi) {
        updates.fieldInputs = new Map(fieldInputs).set(fieldId, {
          ...fi,
          yieldBuPerAcre: patch.aph,
        });
      }
    }

    set(updates);
  },

  updateFieldInputs(fieldId, inputs) {
    set((s) => ({
      fieldInputs: new Map(s.fieldInputs).set(fieldId, inputs),
    }));
  },
}));
```

- [ ] **Step 3: Verify types**

```bash
cd frontend && npx tsc --noEmit
```

Expected: exit 0, no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/lib/store/farmStore.ts
git commit -m "feat(store): add farmStore — shared FarmProfile + FieldInputs state"
```

---

## Task 2: FarmClient.tsx — Editable Form + Store Integration

**Files:**
- Modify: `frontend/src/components/farm/FarmClient.tsx`

**Interfaces:**
- Consumes: `useFarmStore` from Task 1
- Produces: Writes `farm` and `fieldInputs` into store on load; allows editing field name/crop/acres/APH

- [ ] **Step 1: Replace `frontend/src/components/farm/FarmClient.tsx` with the following**

```tsx
"use client";

import { useEffect, useState } from "react";
import type { Machinery } from "@/types";
import type { Crop } from "@/types/common";
import { getFarmProfile, getMachinery } from "@/lib/api/farm";
import { getDefaults } from "@/lib/api/defaults";
import { STATE_CONFIG } from "@/config/states";
import { CROP_CONFIG, CROPS } from "@/config/crops";
import { useFarmStore } from "@/lib/store/farmStore";
import MachineryRow from "./MachineryRow";

interface Props {
  farmId: string;
}

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded bg-gray-200 ${className ?? ""}`} />
  );
}

export default function FarmClient({ farmId }: Props) {
  // Start without skeleton if store is already loaded (e.g. user visited /breakeven first).
  const [loading, setLoading] = useState(
    () => useFarmStore.getState().farm === null,
  );
  const [error, setError] = useState<string | null>(null);
  const [machinery, setMachinery] = useState<Machinery[]>([]);

  const farm = useFarmStore((s) => s.farm);
  const initFromFetch = useFarmStore((s) => s.initFromFetch);
  const updateFarmName = useFarmStore((s) => s.updateFarmName);
  const updateField = useFarmStore((s) => s.updateField);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // Only fetch farm + defaults if the store is not yet initialised.
        if (useFarmStore.getState().farm === null) {
          const [f, defs] = await Promise.all([
            getFarmProfile(farmId),
            getDefaults(),
          ]);
          initFromFetch(f, defs);
        }
        const macRes = await getMachinery(farmId);
        if (!cancelled) {
          setMachinery(macRes.machinery);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load farm profile",
          );
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [farmId, initFromFetch]);

  if (loading || !farm) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-8">
        <SkeletonBlock className="h-7 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SkeletonBlock className="h-28" />
          <SkeletonBlock className="h-28" />
        </div>
        <SkeletonBlock className="h-64" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  const stateLabel = STATE_CONFIG[farm.state]?.label ?? farm.state;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Header — editable farm name */}
      <div>
        <input
          type="text"
          value={farm.name}
          onChange={(e) => updateFarmName(e.target.value)}
          className="w-full max-w-xs rounded-lg border border-gray-200 px-3 py-1.5 text-xl font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="mt-1 text-sm text-gray-500">{stateLabel} · Farm Profile</p>
      </div>

      {/* Fields — inline editable */}
      <section>
        <h2 className="mb-3 text-base font-semibold text-gray-900">
          Fields
          <span className="ml-2 text-sm font-normal text-gray-400">
            {farm.fields.length} field
            {farm.fields.length !== 1 ? "s" : ""} ·{" "}
            {farm.fields
              .reduce((s, f) => s + f.acres, 0)
              .toLocaleString()}{" "}
            total acres
          </span>
        </h2>
        <p className="mb-3 text-xs text-gray-400">
          Edits here are reflected immediately on the Breakeven page.
        </p>
        <div className="flex flex-col gap-3">
          {farm.fields.map((f) => (
            <div
              key={f.fieldId}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Field name — spans 2 cols on sm+ */}
                <div className="col-span-2 sm:col-span-2">
                  <label className="text-xs font-medium text-gray-600">
                    Field Name
                  </label>
                  <input
                    type="text"
                    value={f.name}
                    onChange={(e) =>
                      updateField(f.fieldId, { name: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {/* Crop */}
                <div>
                  <label className="text-xs font-medium text-gray-600">
                    Crop
                  </label>
                  <select
                    value={f.crop}
                    onChange={(e) =>
                      updateField(f.fieldId, {
                        crop: e.target.value as Crop,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {CROPS.map((c) => (
                      <option key={c} value={c}>
                        {CROP_CONFIG[c].label}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Acres + APH */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-gray-600">
                      Acres
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={f.acres}
                      onChange={(e) =>
                        updateField(f.fieldId, {
                          acres: Math.max(
                            0,
                            parseFloat(e.target.value) || 0,
                          ),
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">
                      APH bu/ac
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={f.aph}
                      onChange={(e) =>
                        updateField(f.fieldId, {
                          aph: Math.max(
                            0,
                            parseFloat(e.target.value) || 0,
                          ),
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Machinery */}
      {machinery.length > 0 && (
        <section>
          <h2 className="mb-3 text-base font-semibold text-gray-900">
            Machinery
            <span className="ml-2 text-sm font-normal text-gray-400">
              {machinery.length} item{machinery.length !== 1 ? "s" : ""}
            </span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {machinery.map((m) => (
              <MachineryRow key={m.machineryId} item={m} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify types**

```bash
cd frontend && npx tsc --noEmit
```

Expected: exit 0. If FieldCard, CostStructureSection imports were left and are now unused, remove them first — TypeScript strict will error on unused imports only if ESLint is configured for it; `tsc --noEmit` will not error on unused imports by itself, but `npm run lint` will.

- [ ] **Step 3: Run lint**

```bash
cd frontend && npm run lint
```

Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/farm/FarmClient.tsx
git commit -m "feat(farm): make /farm page editable, write to farmStore on load"
```

---

## Task 3: BreakevenClient.tsx — Read from Store + Fallback

**Files:**
- Modify: `frontend/src/components/breakeven/BreakevenClient.tsx`

**Interfaces:**
- Consumes: `useFarmStore` from Task 1 — `farm`, `defaults`, `fieldInputs`, `defaultFieldInputs`, `initFromFetch`, `updateFieldInputs`

The diffs below show only what changes. `toCropEntry`, `buildScenario`, `WholeFarmCard`, `DecisionPanel`, `Bar`, `Stat` are unchanged.

- [ ] **Step 1: Add the store import to BreakevenClient**

Add one import after the existing imports (do NOT remove `getFarmProfile` — it is still used for the fallback fetch):

```ts
import { useFarmStore } from "@/lib/store/farmStore";
```

- [ ] **Step 2: Replace state declarations and the farm/defaults useEffect**

Find and remove this block (lines ~87–129 in the current file):

```ts
// DELETE — farm, fieldInputs, defaultFieldInputs, defaults state + their useEffect:
const [farm, setFarm] = useState<FarmProfile | null>(null);
const [defaults, setDefaults] = useState<DefaultsResponse | null>(null);
const [fieldId, setFieldId] = useState<string | null>(null);
const [fieldInputs, setFieldInputs] = useState<Map<string, FieldInputs>>(
  new Map(),
);
const [defaultFieldInputs, setDefaultFieldInputs] = useState<Map<string, FieldInputs>>(new Map());
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
```

And remove the `useEffect` that calls `getFarmProfile` + `getDefaults` (the first `useEffect` in the component, lines ~107–129).

Replace with:

```ts
// --- Store-based state ---
const farm = useFarmStore((s) => s.farm);
const defaults = useFarmStore((s) => s.defaults);
const fieldInputs = useFarmStore((s) => s.fieldInputs);
const defaultFieldInputs = useFarmStore((s) => s.defaultFieldInputs);
const initFromFetch = useFarmStore((s) => s.initFromFetch);
const storeUpdateFieldInputs = useFarmStore((s) => s.updateFieldInputs);

const [fieldId, setFieldId] = useState<string | null>(null);

// Initialize to false if store already has data (avoids skeleton flash).
const [loading, setLoading] = useState(
  () => useFarmStore.getState().farm === null,
);
const [error, setError] = useState<string | null>(null);

// Fallback: if store is empty (user navigated directly to /breakeven),
// fetch from the API and seed the store.
useEffect(() => {
  if (useFarmStore.getState().farm !== null) return;
  let cancelled = false;
  Promise.all([getFarmProfile(farmId), getDefaults()])
    .then(([f, defs]) => {
      if (!cancelled) {
        initFromFetch(f, defs);
        setLoading(false);
      }
    })
    .catch((err: unknown) => {
      if (!cancelled) {
        setError(err instanceof Error ? err.message : "Failed to load");
        setLoading(false);
      }
    });
  return () => {
    cancelled = true;
  };
}, [farmId, initFromFetch]);

// Set initial fieldId when farm first populates.
useEffect(() => {
  if (farm && !fieldId) {
    setFieldId(farm.fields[0]?.fieldId ?? null);
  }
}, [farm, fieldId]);
```

Note: The second `useEffect` (for `listScenarios`) and all scenario-related state are **unchanged** — leave them as-is.

- [ ] **Step 3: Update the `updateFieldInputs` callback**

Find:
```ts
function updateFieldInputs(fid: string, updated: FieldInputs) {
  setFieldInputs((prev) => new Map(prev).set(fid, updated));
  setLoadedScenario(null);
}
```

Replace with:
```ts
function updateFieldInputs(fid: string, updated: FieldInputs) {
  storeUpdateFieldInputs(fid, updated);
  setLoadedScenario(null);
}
```

- [ ] **Step 4: Remove `initFieldInputs` function**

Find and delete this function (it is now handled by `farmStore.buildInputMaps` internally):

```ts
function initFieldInputs(
  farm: FarmProfile,
  defaults: DefaultsResponse,
): Map<string, FieldInputs> {
  const map = new Map<string, FieldInputs>();
  for (const field of farm.fields) {
    const cropKey = field.crop as CropKey;
    const cropDefs = defaults.crops[cropKey];
    map.set(field.fieldId, {
      cashPricePerBu: 0,
      yieldBuPerAcre: field.aph,
      landCostPerAcre: cropDefs?.landCostPerAcre ?? 0,
      machineryCostPerAcre: cropDefs?.machineryCostPerAcre ?? 0,
      directCosts: cropDefs?.directCosts ?? [],
    });
  }
  return map;
}
```

- [ ] **Step 5: Verify types and tests**

```bash
cd frontend && npx tsc --noEmit && npm run lint && npm test
```

Expected: `tsc` exit 0, lint exit 0, `19 passed` in vitest.

- [ ] **Step 6: Smoke-test in dev**

```bash
cd frontend && npm run dev
```

Run through these scenarios in the browser:

1. Open `http://localhost:3000/farm` — fields show editable. Change "North Field" name to "NW Field". Navigate to `/breakeven` — field selector shows "NW Field". ✓
2. Back on `/breakeven` — change cash price, observe sensitivity grid updates. ✓
3. On `/farm` — change "North Field" crop from Corn to Soybeans. Navigate to `/breakeven` — that field now uses Soybeans defaults. ✓
4. Close tab, open `http://localhost:3000/breakeven` directly (no /farm visit) — page loads without error (fallback fetch fires). ✓

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/breakeven/BreakevenClient.tsx
git commit -m "feat(breakeven): read farm state from store; add fallback fetch"
```

---

## Task 4: .env.example + api-contracts.md Fix

**Files:**
- Create: `frontend/.env.example`
- Modify: `tasks/api-contracts.md`

No interfaces; no tests needed. These are documentation/config.

- [ ] **Step 1: Create `frontend/.env.example`**

```bash
# ──────────────────────────────────────────────────────────────────────────────
# Smart Farm — frontend environment variables
#
# Copy this file to .env.local (gitignored) and fill in values for your env.
# ──────────────────────────────────────────────────────────────────────────────

# Base URL of the Dart backend API.
# • Local dev with real backend:  http://localhost:8080
# • Leave blank (or omit) to use MSW mock data (default for dev without backend).
NEXT_PUBLIC_API_BASE=
```

- [ ] **Step 2: Fix `tasks/api-contracts.md` §1 GET /defaults response shape**

Find the stale response block under `### GET /defaults` that contains:

```json
"costItems": [
  { "key": "seed-plants-treated", "category": "direct", "valuePerAcre": 135 },
```

Replace the entire response example for the corn crop entry (within `## 1. 默认值 → GET /defaults → Response 200`) with:

```json
{
  "year": 2026,
  "region": "midwest",
  "interestRatePct": 8.0,
  "crops": {
    "corn": {
      "directCosts": [
        { "key": "seed", "label": "Seed/Plants (Treated)", "value": 135, "source": "default" },
        { "key": "fertilizer_lime", "label": "Fertilizer and Lime", "value": 200, "source": "default" }
      ],
      "landCostPerAcre": 265,
      "machineryCostPerAcre": 65
    },
    "soybeans": {
      "directCosts": [
        { "key": "seed", "label": "Seed/Plants (Treated)", "value": 65, "source": "default" }
      ],
      "landCostPerAcre": 265,
      "machineryCostPerAcre": 65
    }
  },
  "sources": [{ "label": "ISU crop budgets 2026", "url": "..." }]
}
```

Also update line 29 of `api-contracts.md` where it says `"corn" | "soybean"` — change `"soybean"` to `"soybeans"`.

Add a changelog entry at the bottom of the file:
```
## 变更日志

- **2026-06-23** `GET /defaults` response shape updated: `costItems[]` (old Compeer schema) → `directCosts: CostLine[]` + `landCostPerAcre` + `machineryCostPerAcre` per crop. Canonical crop name corrected from `"soybean"` → `"soybeans"`.
```

- [ ] **Step 3: Final verification**

```bash
cd frontend && npx tsc --noEmit && npm run lint && npm test
```

Expected: all three exit 0, 19 tests pass.

- [ ] **Step 4: Commit**

```bash
git add frontend/.env.example tasks/api-contracts.md
git commit -m "docs: add .env.example; fix api-contracts GET /defaults shape"
```

---

## Done Criteria

All of the following must be true before this plan is considered complete:

- [ ] `/farm` page shows editable inputs for farm name, field name, crop, acres, APH
- [ ] Editing on `/farm` is immediately visible on `/breakeven` (same Zustand store)
- [ ] Changing a field's crop on `/farm` resets that field's cost defaults on `/breakeven`
- [ ] Navigating directly to `/breakeven` works without visiting `/farm` first
- [ ] Save Scenario captures live edits from both pages (farm structure + financial inputs)
- [ ] `npx tsc --noEmit` exits 0
- [ ] `npm run lint` exits 0
- [ ] `npm test` reports 19 passed
