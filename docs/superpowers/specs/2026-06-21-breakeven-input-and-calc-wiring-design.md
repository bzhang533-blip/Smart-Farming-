# Design: Breakeven Input Layer + Calc Engine Wiring

**Date:** 2026-06-21
**Branch:** feat/v1-calc-engine
**Scope:** Wire `lib/calc/calc.ts` to per-field results; add user-editable inputs (cash price, yield, costs); make sensitivity grid interactive.
**Status:** Approved — pending implementation plan.

---

## Problem

The `/breakeven` page currently calls `POST /api/breakeven/calculate` (a mock-only route that does not exist on the backend) to get per-field breakeven prices, margins, and sensitivity data. The authoritative `lib/calc/calc.ts` engine is bypassed for all per-field output — only the whole-farm rollup (`wholeFarm()`) uses it. Additionally, there is no user-editable input form: cash price comes from hardcoded mock data, and the farmer cannot change yield, costs, land, or machinery values.

---

## Goal

A self-contained `/breakeven` page where the farmer fills in all inputs and sees results update live — no API call for calculation, no hardcoded values.

---

## Architecture

### Option chosen: B — `FieldInputPanel` sub-component, calc stays in `BreakevenClient`

`BreakevenClient.tsx` owns all state and drives `useMemo` calc. A new `FieldInputPanel.tsx` is a pure presentational component for input rendering. `SensitivityGrid.tsx` gets a minor prop update. No custom hook, no global store.

---

## Section 1 — State Model

Replace `Map<fieldId, BreakevenResult>` (populated by `calculateBreakeven()`) with `Map<fieldId, FieldInputs>`:

```ts
interface FieldInputs {
  cashPricePerBu: number;       // user-entered local cash price
  yieldBuPerAcre: number;       // default: field.aph
  landCostPerAcre: number;      // default: defaults.crops[crop].landCostPerAcre
  machineryCostPerAcre: number; // default: defaults.crops[crop].machineryCostPerAcre
  directCosts: CostLine[];      // 17 lines, default values from GET /defaults
}
```

**`FieldInputs` location:** Defined once at the top of `BreakevenClient.tsx` and imported by `FieldInputPanel.tsx` via a named export from that file. It is a UI-layer type, not a calc-layer type — it does not belong in `lib/calc/scenario.ts`.

**Initialization:** When both farm profile and defaults have loaded, seed each field's `FieldInputs` from `defaults.crops[field.crop]` for cost lines/land/machinery, and `field.aph` for yield. `cashPricePerBu` starts at `0` — the farmer must enter it; no fake value is pre-populated.

`BreakevenClient` stores two separate maps:
- `fieldInputs: Map<fieldId, FieldInputs>` — mutable; updated as the farmer edits
- `defaultFieldInputs: Map<fieldId, FieldInputs>` — a `useRef` snapshot of the initial seeded values; never mutated after initialization; passed as `defaultInputs` to `FieldInputPanel` for the Reset button

**Derived values** — computed via `useMemo` for the currently selected field, by building a `CropEntry` and calling `lib/calc/calc.ts` directly:

| Derived value | Calc function |
|---|---|
| Breakeven price | `breakevenPrice(entry)` |
| Breakeven yield | `breakevenYield(entry)` |
| Net margin/acre | `netMarginPerAcre(entry)` |
| Revenue/acre | `revenuePerAcre(entry)` |
| Direct expense subtotal | `totalDirectExpense(entry)` |
| Capital expense subtotal | `totalCapitalExpense(entry)` |
| Sensitivity grid cells | `sensitivityGrid(entry, priceAxis, yieldAxis)` |

**`buildScenario()`** is updated to read from `fieldInputs` instead of the old results map, so scenario save/load continues to work correctly.

**`calculateBreakeven()` is removed** — the import and both `useEffect` calls that invoke it are deleted.

---

## Section 2 — `FieldInputPanel.tsx` (new file)

Pure presentational component — no internal state, all edits flow up via `onChange`.

```ts
interface Props {
  inputs: FieldInputs;
  cropLabel: string;                    // "Corn" | "Soybeans"
  defaultInputs: FieldInputs;           // for "Reset to defaults"
  onChange: (updated: FieldInputs) => void;
}
```

**Layout:**

1. **Key inputs** — 4 number inputs in a 2×2 or 4-column grid:
   - Cash Price $/bu (prominent label — "Your local cash price")
   - Yield bu/ac
   - Land Cost $/ac
   - Machinery Cost $/ac

   Each input fires `onChange` on every keystroke. Inputs accept decimals; values below 0 are clamped to 0.

2. **Collapsible "Edit direct costs ▸"** — a `<details>` / toggle. When open:
   - 17 labeled `CostLine` number inputs (label from `CostLine.label`, value from `CostLine.value`)
   - Running direct-cost subtotal shown below the list
   - "Reset to defaults" button restores the original defaults values for all 17 lines

No validation beyond `min="0"` — farmers know their numbers.

---

## Section 3 — Sensitivity Grid Interactivity

### `SensitivityGrid.tsx` prop change

Remove `matrix: SensitivityMatrix` wrapper. Accept the parts directly (matching `sensitivityGrid()` output):

```ts
interface Props {
  cells: number[][];
  priceAxis: number[];
  yieldAxis: number[];
  centerPrice: number;
  centerYield: number;
}
```

Internal rendering logic is unchanged.

### Range controls (in `BreakevenClient`)

Two additional pieces of state:

```ts
const [priceExtent, setPriceExtent] = useState(4); // ±4 price steps from center
const [yieldExtent, setYieldExtent] = useState(4); // ±4 yield steps from center
```

Step sizes come from `CROP_CONFIG[crop].sensitivity.priceStep` and `.yieldStep` (already configured for corn and soybeans).

Two `<input type="range" min={1} max={8}>` sliders sit above the grid — one for price range width, one for yield range width.

`priceAxis` and `yieldAxis` are computed via `useMemo`:

```ts
const priceAxis = useMemo(() =>
  Array.from({ length: priceExtent * 2 + 1 }, (_, i) =>
    round2(cashPricePerBu + (i - priceExtent) * priceStep)
  ), [cashPricePerBu, priceExtent, priceStep]);
```

These arrays feed `sensitivityGrid(entry, priceAxis, yieldAxis)` and are also passed as `priceAxis`/`yieldAxis` to `SensitivityGrid`. When the farmer types a new cash price or drags a slider, the grid rerenders immediately with no API call.

---

## Dead Code Removed

| File | Action |
|---|---|
| `frontend/src/lib/api/breakeven.ts` | Delete |
| `frontend/src/lib/breakeven/preview.ts` | Delete |
| `frontend/src/lib/mocks/data/breakeven.ts` | Delete |
| `frontend/src/lib/mocks/handlers.ts` | Remove `POST /api/breakeven/calculate` handler |
| `frontend/src/types/breakeven.ts` | Remove `BreakevenResult`, `BreakevenRequest`, `CostSubtotals`, `SensitivityMatrix`; delete file if empty |
| `frontend/src/types/index.ts` | Update exports to match |

`lib/calc/scenario.ts` and `lib/calc/calc.ts` are untouched — they are already correct.

---

## Files Changed

| File | Change |
|---|---|
| `frontend/src/components/breakeven/BreakevenClient.tsx` | Major rework: new state model, useMemo calc, remove API call, add sliders |
| `frontend/src/components/breakeven/FieldInputPanel.tsx` | **New** |
| `frontend/src/components/breakeven/SensitivityGrid.tsx` | Minor: update props interface |
| `frontend/src/lib/api/breakeven.ts` | Delete |
| `frontend/src/lib/breakeven/preview.ts` | Delete |
| `frontend/src/lib/mocks/data/breakeven.ts` | Delete |
| `frontend/src/lib/mocks/handlers.ts` | Remove legacy handler |
| `frontend/src/types/breakeven.ts` | Trim / delete |
| `frontend/src/types/index.ts` | Update exports |

---

## Risks Fixed by This Design

| Risk ID | Description | Resolution |
|---|---|---|
| R1 | Per-field results bypass canonical engine | All per-field calc goes through `lib/calc/calc.ts` directly |
| R2 | Two parallel type systems | `FieldInputs` uses `CostLine[]` (canonical); `CostItem[]` / `BreakevenResult` retired |
| R3 | No user-editable input form | `FieldInputPanel` provides all key inputs |
| R4 | Sensitivity heatmap is static | Range sliders + reactive `useMemo` |
| R5 | Cash price cannot be entered | `cashPricePerBu` input (starts at 0, must be filled) |
| R8 | `preview.ts` claims to be authoritative | File deleted |

---

## Out of Scope (not in this design)

- Cross-page state sharing between `/farm` and `/breakeven`
- Editing the farm profile from the breakeven page
- `PUT /scenarios/:id` (R9)
- `api-contracts.md` doc update (R6) — separate docs-only task
- `.env.example` (R7) — separate config task
