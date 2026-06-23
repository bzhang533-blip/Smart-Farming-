# v1 Completion Design

**Date:** 2026-06-23  
**Branch:** feat/v1-calc-engine  
**Goal:** Close the remaining 15% to reach a shippable v1 — editable farm page, shared state between /farm and /breakeven, and minor housekeeping.

---

## 1. Scope

### In

| Item | Description |
|------|-------------|
| Zustand farm store | Lift `FarmProfile` + `fieldInputs` into a shared store |
| `/farm` editable form | Per-field editing: name, crop type, acres, APH |
| `/breakeven` reads store | Remove redundant fetch/state; fallback fetch if store is empty |
| Save/Load round-trip | Load scenario writes back into store; save reads from store |
| `.env.example` | Document `NEXT_PUBLIC_API_BASE` for real backend connection |
| `api-contracts.md §1` fix | Update stale `GET /defaults` response shape |

### Out (v1 deferral)

- `govtPaymentPerAcre` user input — keep config default
- Add/delete farm fields — mock has fixed fields for now
- `PUT /scenarios/:id` frontend implementation — delete + recreate is sufficient
- Farm profile persistence endpoint (`POST /farm`) — not in v1 backend contract

---

## 2. Architecture

### 2.1 Zustand Store

**New file:** `frontend/src/lib/store/farmStore.ts`

```ts
interface FarmStore {
  farm: FarmProfile | null;
  fieldInputs: Map<string, FieldInputs>;
  defaultFieldInputs: Map<string, FieldInputs>;

  setFarm: (f: FarmProfile) => void;
  updateField: (fieldId: string, patch: Partial<Field>) => void;
  setFieldInputs: (map: Map<string, FieldInputs>) => void;
  updateFieldInputs: (fieldId: string, inputs: FieldInputs) => void;
  resetFromScenario: (s: Scenario, defaults: DefaultsResponse) => void;
}
```

- State lives in memory only — no localStorage, no backend persistence
- Refresh resets to defaults (expected behavior; Save Scenario is the persistence path)
- `resetFromScenario` maps `Scenario.crops` back to `FarmProfile` fields + `FieldInputs`

### 2.2 `/farm` Page — `FarmClient.tsx`

Becomes a read/write form. Each `Field` row is editable inline:

| Field | Control | Side effect |
|-------|---------|-------------|
| Name | text input | `store.updateField(id, { name })` |
| Crop | select (corn / soybeans / other) | `store.updateField` + re-init that field's `FieldInputs` from new crop defaults |
| Acres | number input | `store.updateField(id, { acres })` |
| APH | number input | `store.updateField` + sync `fieldInputs.yieldBuPerAcre` |

On load: `getFarmProfile()` + `getDefaults()` → `store.setFarm()` + `store.setFieldInputs(initFieldInputs(farm, defaults))`.

Changing crop type re-initializes that field's `FieldInputs` to the new crop's defaults (resets cash price to 0, costs to new defaults).

Farm name is editable at the top.

Add/delete fields: **not in v1**.

### 2.3 `/breakeven` Page — `BreakevenClient.tsx`

Remove: `farm`, `fieldInputs`, `defaultFieldInputs` useState; the `useEffect` that calls `getFarmProfile()` + `getDefaults()`.

Replace with: `useFarmStore()`.

**Fallback:** If `store.farm === null` (user navigated directly to `/breakeven` without visiting `/farm` first), `BreakevenClient` calls `getFarmProfile()` + `getDefaults()` and writes into the store via `store.setFarm()` + `store.setFieldInputs()`. This keeps `/breakeven` independently accessible.

`updateFieldInputs` callback calls `store.updateFieldInputs()` instead of local setState.

### 2.4 Save / Load Round-Trip

**Save** (no change): `buildScenario(store.farm, store.fieldInputs)` → `POST /scenarios`.

**Load**: After `getScenario(id)` returns a `Scenario`, call `store.resetFromScenario(scenario, defaults)`.

`resetFromScenario` implementation:
```
for each CropEntry in scenario.crops:
  Field ← { fieldId: generated, name: crop label, crop, acres }
  FieldInputs ← { cashPricePerBu, yieldBuPerAcre, landCostPerAcre,
                   machineryCostPerAcre, directCosts }
farm.name = scenario.farm.name ?? "My Farm"
```

Note: loaded scenarios may not have the exact same fieldIds as the current mock farm. The loaded view should replace the current field list with the scenario's crops. After loading, the field selector in `/breakeven` reflects the loaded crops.

---

## 3. Data Flow (updated)

```
/farm page (FarmClient)
  → on load: fetch farm + defaults → store.setFarm + store.setFieldInputs
  → on edit: store.updateField / store.updateFieldInputs

/breakeven page (BreakevenClient)
  → reads: store.farm, store.fieldInputs, store.defaultFieldInputs
  → writes: store.updateFieldInputs (via FieldInputPanel onChange)
  → save: buildScenario(store) → POST /scenarios
  → load: getScenario → store.resetFromScenario
  → fallback: if store.farm null → fetch + write store (same as /farm load)
```

---

## 4. Minor Items

### `.env.example`

New file at repo root (or `frontend/`):

```
# Point at the local Dart backend (runs on port 8080 by default)
NEXT_PUBLIC_API_BASE=http://localhost:8080

# Leave empty to use MSW mock data (default for dev without backend)
# NEXT_PUBLIC_API_BASE=
```

### `api-contracts.md §1` — GET /defaults response shape

Current (stale):
```json
"costItems": [{ "key": "seed", "category": "direct", "valuePerAcre": 95 }]
```

Correct:
```json
"directCosts": [{ "key": "seed", "label": "Seed/Plants (Treated)", "value": 95, "source": "default" }],
"landCostPerAcre": 230,
"machineryCostPerAcre": 100
```

---

## 5. Files Changed

| File | Change |
|------|--------|
| `frontend/src/lib/store/farmStore.ts` | **New** — Zustand store |
| `frontend/src/components/farm/FarmClient.tsx` | Edit: add inline editing + write store on load |
| `frontend/src/components/breakeven/BreakevenClient.tsx` | Edit: read store, remove redundant state/fetch, add fallback |
| `.env.example` | **New** |
| `tasks/api-contracts.md` | Edit: fix §1 GET /defaults response shape |

---

## 6. Success Criteria

- [ ] Farmer edits field name / crop / acres / APH on `/farm` → visible immediately on `/breakeven`
- [ ] Changing crop on `/farm` resets that field's costs to new crop defaults
- [ ] Navigating directly to `/breakeven` without visiting `/farm` still works (fallback fetch)
- [ ] Save Scenario captures current farm structure + financial inputs
- [ ] Load Scenario restores farm fields + financial inputs into the store
- [ ] `npx tsc --noEmit` exits 0
- [ ] `npm run lint` exits 0
- [ ] `npm test` (19 tests) all pass — calc engine untouched
