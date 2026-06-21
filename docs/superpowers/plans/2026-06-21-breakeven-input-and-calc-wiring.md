# Breakeven Input Layer + Calc Engine Wiring — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mock `POST /api/breakeven/calculate` data-flow with direct calls to `lib/calc/calc.ts`, and add a user-editable input panel (cash price, yield, costs) plus interactive sensitivity sliders to the `/breakeven` page.

**Architecture:** `BreakevenClient` holds `Map<fieldId, FieldInputs>` state seeded from `GET /defaults` + field APH; all per-field math is driven by `useMemo` calling `lib/calc/calc.ts` directly. A new `FieldInputPanel` component handles input rendering (pure presentational, state lifted to parent). `SensitivityGrid` receives explicit axis arrays instead of a typed wrapper object.

**Tech stack:** Next.js (App Router) · React (`useState`, `useEffect`, `useMemo`, `useRef`) · TypeScript strict · Tailwind CSS · MSW (mocks) · Vitest (existing calc tests)

## Global Constraints

- All commands run inside `frontend/` — `cd /Users/kennykang/Desktop/smart\ farm/frontend` first.
- TypeScript strict mode (`strict: true`) — no `any` without an explanatory comment.
- No `next/*` or React imports inside `lib/calc/` files.
- `Crop = "corn" | "soybeans"` (types/common.ts); `CropKey = "corn" | "soybeans" | "other"` (lib/calc/scenario.ts). `Crop ⊆ CropKey`, so casting `field.crop as CropKey` is always safe.
- `CROP_CONFIG: Record<Crop, CropConfig>` — keyed by `Crop`, always accessible via `CROP_CONFIG[field.crop]`.
- Cash price starts at `0`; the `cashPricePerBu === 0` case must not crash — guard it in the UI, not in the calc engine.
- After every task: `npx tsc --noEmit` exits 0 and `npm run lint` exits 0.
- Do not modify any file under `backend/` or `lib/calc/`.

---

## File Map

| File | Action |
|---|---|
| `src/components/breakeven/FieldInputPanel.tsx` | **Create** — editable input panel; exports `FieldInputs` interface |
| `src/components/breakeven/SensitivityGrid.tsx` | **Modify** — change props from `matrix: SensitivityMatrix` to explicit arrays |
| `src/components/breakeven/BreakevenClient.tsx` | **Rewrite** — new state model, `useMemo` calc, FieldInputPanel integration, range sliders |
| `src/lib/mocks/handlers.ts` | **Modify** — remove `POST /api/breakeven/calculate` handler and its imports |
| `src/lib/api/breakeven.ts` | **Delete** |
| `src/lib/breakeven/preview.ts` | **Delete** |
| `src/lib/mocks/data/breakeven.ts` | **Delete** |
| `src/types/breakeven.ts` | **Delete** — all four types become unused |
| `src/types/index.ts` | **Modify** — remove breakeven re-exports |

---

## Task 1: Create `FieldInputPanel.tsx`

**Files:**
- Create: `src/components/breakeven/FieldInputPanel.tsx`

**Interfaces:**
- Produces: `export interface FieldInputs { cashPricePerBu, yieldBuPerAcre, landCostPerAcre, machineryCostPerAcre, directCosts: CostLine[] }` — consumed by Tasks 2 and 3.
- Produces: `export default function FieldInputPanel(props: Props): JSX.Element` — consumed by Task 3.

- [ ] **Step 1: Create the file**

```tsx
// src/components/breakeven/FieldInputPanel.tsx
"use client";

import { useState } from "react";
import type { CostLine } from "@/lib/calc/scenario";

export interface FieldInputs {
  cashPricePerBu: number;
  yieldBuPerAcre: number;
  landCostPerAcre: number;
  machineryCostPerAcre: number;
  directCosts: CostLine[];
}

interface Props {
  inputs: FieldInputs;
  defaultInputs: FieldInputs;
  cropLabel: string;
  onChange: (updated: FieldInputs) => void;
}

export default function FieldInputPanel({
  inputs,
  defaultInputs,
  cropLabel,
  onChange,
}: Props) {
  const [costsOpen, setCostsOpen] = useState(false);

  function setNum(
    key: keyof Omit<FieldInputs, "directCosts">,
    raw: string,
  ) {
    const val = Math.max(0, parseFloat(raw) || 0);
    onChange({ ...inputs, [key]: val });
  }

  function setCostLine(index: number, raw: string) {
    const val = Math.max(0, parseFloat(raw) || 0);
    const updated = inputs.directCosts.map((c, i) =>
      i === index ? { ...c, value: val, source: "user" as const } : c,
    );
    onChange({ ...inputs, directCosts: updated });
  }

  function resetToDefaults() {
    onChange({
      ...inputs,
      directCosts: defaultInputs.directCosts.map((c) => ({ ...c })),
      landCostPerAcre: defaultInputs.landCostPerAcre,
      machineryCostPerAcre: defaultInputs.machineryCostPerAcre,
    });
  }

  const directTotal = inputs.directCosts.reduce((sum, c) => sum + c.value, 0);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm flex flex-col gap-4">
      <h2 className="text-base font-semibold text-gray-900">
        {cropLabel} — Enter Your Numbers
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <NumInput
          label="Cash Price"
          hint="$/bu — your local elevator"
          value={inputs.cashPricePerBu}
          onChange={(v) => setNum("cashPricePerBu", v)}
          step="0.01"
          placeholder="0.00"
          highlight={inputs.cashPricePerBu === 0}
        />
        <NumInput
          label="Yield"
          hint="bu/ac"
          value={inputs.yieldBuPerAcre}
          onChange={(v) => setNum("yieldBuPerAcre", v)}
          step="1"
        />
        <NumInput
          label="Land Cost"
          hint="$/ac"
          value={inputs.landCostPerAcre}
          onChange={(v) => setNum("landCostPerAcre", v)}
          step="1"
        />
        <NumInput
          label="Machinery Cost"
          hint="$/ac"
          value={inputs.machineryCostPerAcre}
          onChange={(v) => setNum("machineryCostPerAcre", v)}
          step="1"
        />
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setCostsOpen((o) => !o)}
          className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
        >
          <span
            className={`inline-block transition-transform text-xs ${
              costsOpen ? "rotate-90" : ""
            }`}
          >
            ▶
          </span>
          Edit direct costs
          <span className="ml-auto text-xs font-normal text-gray-400 tabular-nums">
            Total: ${directTotal.toFixed(0)}/ac
          </span>
        </button>

        {costsOpen && (
          <div className="flex flex-col gap-1.5 pl-4 border-l-2 border-gray-100">
            {inputs.directCosts.map((c, i) => (
              <div key={c.key} className="flex items-center gap-3">
                <span className="flex-1 text-xs text-gray-600 min-w-0 truncate">
                  {c.label}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-xs text-gray-400">$</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={c.value}
                    onChange={(e) => setCostLine(i, e.target.value)}
                    className="w-20 rounded border border-gray-200 px-2 py-1 text-right text-xs tabular-nums focus:border-blue-400 focus:outline-none"
                  />
                  <span className="text-xs text-gray-400 w-6">/ac</span>
                  {c.source === "user" && (
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0"
                      title="Edited"
                    />
                  )}
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2 mt-1 border-t border-gray-100">
              <span className="text-xs font-medium text-gray-600">
                Direct subtotal
              </span>
              <span className="text-xs font-semibold tabular-nums text-gray-900">
                ${directTotal.toFixed(0)}/ac
              </span>
            </div>
            <button
              type="button"
              onClick={resetToDefaults}
              className="self-start text-xs text-gray-400 hover:text-gray-600 transition-colors mt-1"
            >
              ↩ Reset to defaults
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function NumInput({
  label,
  hint,
  value,
  onChange,
  step = "1",
  placeholder,
  highlight,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (v: string) => void;
  step?: string;
  placeholder?: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      <input
        type="number"
        min="0"
        step={step}
        value={value === 0 && placeholder !== undefined ? "" : value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`rounded-lg border px-3 py-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          highlight
            ? "border-amber-400 bg-amber-50 placeholder-amber-400"
            : "border-gray-200 bg-white"
        }`}
      />
      <span className="text-xs text-gray-400">{hint}</span>
    </div>
  );
}
```

- [ ] **Step 2: Verify it type-checks**

```bash
npx tsc --noEmit
```

Expected: exit 0, no output.

- [ ] **Step 3: Commit**

```bash
git add src/components/breakeven/FieldInputPanel.tsx
git commit -m "feat(breakeven): add FieldInputPanel component with FieldInputs interface"
```

---

## Task 2: Update `SensitivityGrid.tsx` props

**Files:**
- Modify: `src/components/breakeven/SensitivityGrid.tsx`
- Modify: `src/components/breakeven/BreakevenClient.tsx` (one call-site only — interim fix to keep typecheck green)

**Interfaces:**
- Consumes: nothing new
- Produces: `SensitivityGrid` now accepts `{ cells: number[][], priceAxis: number[], yieldAxis: number[], centerPrice: number, centerYield: number }` — consumed by Task 3.

- [ ] **Step 1: Replace `SensitivityGrid.tsx` entirely**

```tsx
// src/components/breakeven/SensitivityGrid.tsx
interface Props {
  cells: number[][];
  priceAxis: number[];
  yieldAxis: number[];
  centerPrice: number;
  centerYield: number;
}

function cellStyle(value: number, maxAbs: number): React.CSSProperties {
  if (maxAbs === 0) return {};
  const intensity = Math.min(Math.abs(value) / maxAbs, 1);
  const alpha = 0.08 + intensity * 0.5;
  const rgb = value >= 0 ? "16, 122, 87" : "200, 50, 50";
  return { backgroundColor: `rgba(${rgb}, ${alpha.toFixed(3)})` };
}

const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;

export default function SensitivityGrid({
  cells,
  priceAxis,
  yieldAxis,
  centerPrice,
  centerYield,
}: Props) {
  const maxAbs = Math.max(1, ...cells.flat().map((v) => Math.abs(v)));
  const rowOrder = priceAxis.map((_, i) => i).reverse();

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-gray-50 px-3 py-2 text-left text-xs font-semibold text-gray-500">
                Cash $/bu ＼ Yield
              </th>
              {yieldAxis.map((y, j) => (
                <th
                  key={j}
                  className={`px-3 py-2 text-right text-xs font-semibold tabular-nums ${
                    near(y, centerYield) ? "text-blue-700" : "text-gray-500"
                  }`}
                >
                  {y.toFixed(0)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowOrder.map((i) => {
              const price = priceAxis[i];
              const isPriceCenter = near(price, centerPrice);
              return (
                <tr key={i}>
                  <th
                    className={`sticky left-0 z-10 bg-gray-50 px-3 py-2 text-left text-xs font-semibold tabular-nums ${
                      isPriceCenter ? "text-blue-700" : "text-gray-600"
                    }`}
                  >
                    ${price.toFixed(2)}
                  </th>
                  {yieldAxis.map((y, j) => {
                    const value = cells[i][j];
                    const isCenter = isPriceCenter && near(y, centerYield);
                    return (
                      <td
                        key={j}
                        style={cellStyle(value, maxAbs)}
                        className={`px-3 py-2 text-right tabular-nums ${
                          isCenter
                            ? "font-bold text-gray-900 outline outline-2 outline-blue-600"
                            : value >= 0
                              ? "text-emerald-900"
                              : "text-red-900"
                        }`}
                      >
                        {value >= 0 ? "" : "−"}${Math.abs(value).toFixed(0)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-3 rounded"
            style={{ backgroundColor: "rgba(16,122,87,0.45)" }}
          />
          Profit / acre
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-3 rounded"
            style={{ backgroundColor: "rgba(200,50,50,0.45)" }}
          />
          Loss / acre
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded outline outline-2 outline-blue-600" />
          Your current scenario
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update the `SensitivityGrid` call in `BreakevenClient.tsx` (interim only)**

Find the existing `<SensitivityGrid ... />` call in `BreakevenClient.tsx` (around line 324) and replace it with the destructured form so typecheck stays green:

```tsx
// BEFORE (remove this):
<SensitivityGrid
  matrix={result.sensitivityMatrix}
  centerPrice={result.currentCashPrice}
  centerYield={result.aph}
/>

// AFTER (replace with this):
<SensitivityGrid
  cells={result.sensitivityMatrix.cells}
  priceAxis={result.sensitivityMatrix.priceAxis}
  yieldAxis={result.sensitivityMatrix.yieldAxis}
  centerPrice={result.currentCashPrice}
  centerYield={result.aph}
/>
```

- [ ] **Step 3: Verify typecheck and tests still pass**

```bash
npx tsc --noEmit && npm test
```

Expected: tsc exits 0. 19/19 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/breakeven/SensitivityGrid.tsx src/components/breakeven/BreakevenClient.tsx
git commit -m "refactor(breakeven): update SensitivityGrid props to explicit cells/priceAxis/yieldAxis"
```

---

## Task 3: Rewrite `BreakevenClient.tsx`

**Files:**
- Modify: `src/components/breakeven/BreakevenClient.tsx` (full replacement)
- Modify: `src/lib/mocks/handlers.ts` (remove legacy handler + imports)

**Interfaces:**
- Consumes: `FieldInputs` from `./FieldInputPanel` (Task 1)
- Consumes: `SensitivityGrid` new props (Task 2)
- Consumes: `breakevenPrice`, `breakevenYield`, `netMarginPerAcre`, `revenuePerAcre`, `sensitivityGrid`, `totalCapitalExpense`, `totalDirectExpense`, `wholeFarm` from `@/lib/calc/calc`
- Consumes: `CropEntry`, `CropKey`, `Scenario` from `@/lib/calc/scenario`
- Consumes: `CROP_CONFIG` from `@/config/crops` — `sensitivity.priceStep`, `sensitivity.yieldStep` used for axis generation

- [ ] **Step 1: Replace `BreakevenClient.tsx` entirely**

```tsx
// src/components/breakeven/BreakevenClient.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getDefaults } from "@/lib/api/defaults";
import {
  createScenario,
  deleteScenario,
  getScenario,
  listScenarios,
  type ScenarioSummary,
} from "@/lib/api/scenarios";
import { getFarmProfile } from "@/lib/api/farm";
import {
  breakevenPrice,
  breakevenYield,
  netMarginPerAcre,
  revenuePerAcre,
  sensitivityGrid,
  totalCapitalExpense,
  totalDirectExpense,
  wholeFarm,
} from "@/lib/calc/calc";
import type { CropEntry, CropKey, Scenario } from "@/lib/calc/scenario";
import { CROP_CONFIG } from "@/config/crops";
import type { DefaultsResponse, FarmProfile, Field } from "@/types";
import FieldInputPanel, { type FieldInputs } from "./FieldInputPanel";
import SensitivityGrid from "./SensitivityGrid";

interface Props {
  farmId: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

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

function toCropEntry(field: Field, inputs: FieldInputs): CropEntry {
  return {
    crop: field.crop as CropKey,
    acres: field.acres,
    yieldBasis: "aph",
    yieldBuPerAcre: inputs.yieldBuPerAcre,
    cashPricePerBu: inputs.cashPricePerBu,
    govtPaymentPerAcre:
      CROP_CONFIG[field.crop].revenueDefaults.govtPaymentPerAcre,
    directCosts: inputs.directCosts,
    landCostPerAcre: inputs.landCostPerAcre,
    machineryCostPerAcre: inputs.machineryCostPerAcre,
  };
}

function buildScenario(
  farm: FarmProfile,
  inputs: Map<string, FieldInputs>,
): Scenario {
  return {
    year: 2026,
    region: "midwest",
    farm: { name: farm.name },
    crops: farm.fields
      .map((f) => {
        const fi = inputs.get(f.fieldId);
        return fi ? toCropEntry(f, fi) : null;
      })
      .filter((c): c is CropEntry => c !== null),
  };
}

export default function BreakevenClient({ farmId }: Props) {
  const [farm, setFarm] = useState<FarmProfile | null>(null);
  const [defaults, setDefaults] = useState<DefaultsResponse | null>(null);
  const [fieldId, setFieldId] = useState<string | null>(null);
  const [fieldInputs, setFieldInputs] = useState<Map<string, FieldInputs>>(
    new Map(),
  );
  const defaultFieldInputsRef = useRef<Map<string, FieldInputs>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [priceExtent, setPriceExtent] = useState(4);
  const [yieldExtent, setYieldExtent] = useState(4);

  const [scenarioList, setScenarioList] = useState<ScenarioSummary[]>([]);
  const [loadedScenario, setLoadedScenario] = useState<
    (Scenario & { id: string }) | null
  >(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getFarmProfile(farmId), getDefaults()])
      .then(([f, defs]) => {
        setFarm(f);
        setDefaults(defs);
        setFieldId(f.fields[0]?.fieldId ?? null);
        const seeded = initFieldInputs(f, defs);
        setFieldInputs(seeded);
        defaultFieldInputsRef.current = new Map(
          [...seeded.entries()].map(([k, v]) => [
            k,
            { ...v, directCosts: v.directCosts.map((c) => ({ ...c })) },
          ]),
        );
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load");
        setLoading(false);
      });
  }, [farmId]);

  useEffect(() => {
    listScenarios()
      .then((res) => setScenarioList(res.scenarios))
      .catch(() => {
        /* non-fatal */
      });
  }, []);

  const field = farm?.fields.find((f) => f.fieldId === fieldId) ?? null;
  const inputs = fieldId ? (fieldInputs.get(fieldId) ?? null) : null;
  const defaultInputs = fieldId
    ? (defaultFieldInputsRef.current.get(fieldId) ?? null)
    : null;

  const entry = useMemo(
    () => (field && inputs ? toCropEntry(field, inputs) : null),
    [field, inputs],
  );

  const derived = useMemo(() => {
    if (!entry) return null;
    return {
      be: breakevenPrice(entry),
      beYield: breakevenYield(entry),
      margin: netMarginPerAcre(entry),
      revenue: revenuePerAcre(entry),
      direct: totalDirectExpense(entry),
      capital: totalCapitalExpense(entry),
    };
  }, [entry]);

  const crop = field?.crop ?? "corn";
  const sensitivityCfg = CROP_CONFIG[crop].sensitivity;
  const priceStep = sensitivityCfg.priceStep;
  const yieldStep = sensitivityCfg.yieldStep;
  const cashPrice = inputs?.cashPricePerBu ?? 0;
  const yieldBu = inputs?.yieldBuPerAcre ?? 0;

  const priceAxis = useMemo(
    () =>
      Array.from({ length: priceExtent * 2 + 1 }, (_, i) =>
        round2(cashPrice + (i - priceExtent) * priceStep),
      ).filter((p) => p > 0),
    [cashPrice, priceExtent, priceStep],
  );

  const yieldAxis = useMemo(
    () =>
      Array.from({ length: yieldExtent * 2 + 1 }, (_, i) =>
        Math.max(0, Math.round(yieldBu + (i - yieldExtent) * yieldStep)),
      ),
    [yieldBu, yieldExtent, yieldStep],
  );

  const gridCells = useMemo(
    () => (entry && cashPrice > 0 ? sensitivityGrid(entry, priceAxis, yieldAxis) : []),
    [entry, cashPrice, priceAxis, yieldAxis],
  );

  const wholeFarmTotals = useMemo(() => {
    if (loadedScenario) return wholeFarm(loadedScenario);
    if (!farm || fieldInputs.size === 0) return null;
    const scenario = buildScenario(farm, fieldInputs);
    return scenario.crops.length > 0 ? wholeFarm(scenario) : null;
  }, [farm, fieldInputs, loadedScenario]);

  function updateFieldInputs(fid: string, updated: FieldInputs) {
    setFieldInputs((prev) => new Map(prev).set(fid, updated));
    setLoadedScenario(null);
  }

  async function handleSave() {
    if (!farm) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const scenario = buildScenario(farm, fieldInputs);
      const { id } = await createScenario(scenario);
      const refreshed = await listScenarios();
      setScenarioList(refreshed.scenarios);
      setSaveMsg(`Saved (${id.slice(-6)})`);
      setTimeout(() => setSaveMsg(null), 3000);
    } catch {
      setSaveMsg("Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleLoad(id: string) {
    try {
      const scenario = await getScenario(id);
      setLoadedScenario(scenario);
    } catch {
      setError("Failed to load scenario");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteScenario(id);
      setScenarioList((l) => l.filter((s) => s.id !== id));
      if (loadedScenario?.id === id) setLoadedScenario(null);
    } catch {
      /* ignore */
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="h-7 w-56 animate-pulse rounded bg-gray-200" />
        <div className="mt-6 h-64 animate-pulse rounded-xl bg-gray-200" />
      </div>
    );
  }

  if (error && !farm) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!farm) return null;

  return (
    <div className="p-6 max-w-4xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-xl font-semibold text-gray-900">
            Breakeven &amp; Sensitivity
          </h1>
          <p className="text-sm text-gray-500">
            {farm.name} · Local cash price vs. true breakeven — never futures.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="shrink-0 rounded-lg border border-blue-600 bg-white px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-40 transition-colors"
        >
          {saving ? "Saving…" : (saveMsg ?? "Save Scenario")}
        </button>
      </div>

      {/* Saved scenarios picker */}
      {scenarioList.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Saved Scenarios
          </p>
          <div className="flex flex-wrap gap-2">
            {scenarioList.map((s) => {
              const active = loadedScenario?.id === s.id;
              return (
                <div key={s.id} className="flex items-center gap-1">
                  <button
                    onClick={() =>
                      active ? setLoadedScenario(null) : handleLoad(s.id)
                    }
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                      active
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {s.name}
                    <span className="ml-1.5 text-xs font-normal text-gray-400">
                      {s.season}
                    </span>
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    title="Delete"
                    className="rounded px-1 py-1 text-gray-300 hover:text-red-400 transition-colors text-xs"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
          {loadedScenario && (
            <p className="text-xs text-indigo-600">
              Viewing saved scenario — click again to return to live data.
            </p>
          )}
        </div>
      )}

      {/* Field selector */}
      <div className="flex flex-wrap gap-2">
        {farm.fields.map((f) => {
          const active = f.fieldId === fieldId;
          return (
            <button
              key={f.fieldId}
              onClick={() => setFieldId(f.fieldId)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
              }`}
            >
              {f.name}
              <span className="ml-1.5 text-xs font-normal text-gray-400">
                {CROP_CONFIG[f.crop].label} · {f.acres} ac
              </span>
            </button>
          );
        })}
      </div>

      {/* Whole-farm rollup */}
      {wholeFarmTotals && (
        <WholeFarmCard
          totals={wholeFarmTotals}
          totalAcres={
            loadedScenario
              ? loadedScenario.crops.reduce((s, c) => s + c.acres, 0)
              : farm.fields.reduce((s, f) => s + f.acres, 0)
          }
          cropCount={
            loadedScenario
              ? loadedScenario.crops.length
              : farm.fields.length
          }
          fromScenario={!!loadedScenario}
        />
      )}

      {/* Per-field inputs */}
      {field && inputs && defaultInputs && (
        <FieldInputPanel
          inputs={inputs}
          defaultInputs={defaultInputs}
          cropLabel={CROP_CONFIG[field.crop].label}
          onChange={(updated) => updateFieldInputs(field.fieldId, updated)}
        />
      )}

      {/* Per-field results */}
      {derived && entry && (
        <>
          <DecisionPanel
            cashPrice={cashPrice}
            be={derived.be}
            margin={derived.margin}
            revenue={derived.revenue}
          />

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Stat
              label="Direct Expense"
              value={`$${derived.direct.toFixed(0)}`}
              hint="/acre"
            />
            <Stat
              label="Capital Expense"
              value={`$${derived.capital.toFixed(0)}`}
              hint="/acre"
            />
            <Stat
              label="Total Expense"
              value={`$${(derived.direct + derived.capital).toFixed(0)}`}
              hint="/acre"
              strong
            />
          </div>

          <section className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between">
              <h2 className="text-base font-semibold text-gray-900">
                Price × Yield sensitivity
              </h2>
              <span className="text-xs text-gray-400">Net margin / acre</span>
            </div>

            <div className="flex flex-wrap gap-6 text-xs text-gray-500">
              <label className="flex items-center gap-2">
                Price range
                <input
                  type="range"
                  min={1}
                  max={8}
                  value={priceExtent}
                  onChange={(e) => setPriceExtent(Number(e.target.value))}
                  className="w-24 accent-blue-600"
                />
                <span className="tabular-nums text-gray-400">
                  ±{priceExtent} (${(priceExtent * priceStep).toFixed(2)})
                </span>
              </label>
              <label className="flex items-center gap-2">
                Yield range
                <input
                  type="range"
                  min={1}
                  max={8}
                  value={yieldExtent}
                  onChange={(e) => setYieldExtent(Number(e.target.value))}
                  className="w-24 accent-blue-600"
                />
                <span className="tabular-nums text-gray-400">
                  ±{yieldExtent} ({yieldExtent * yieldStep} bu)
                </span>
              </label>
            </div>

            {cashPrice > 0 ? (
              <SensitivityGrid
                cells={gridCells}
                priceAxis={priceAxis}
                yieldAxis={yieldAxis}
                centerPrice={cashPrice}
                centerYield={yieldBu}
              />
            ) : (
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-8 text-center text-sm text-gray-400">
                Enter your local cash price above to see the sensitivity grid.
              </div>
            )}
          </section>

          <p className="text-xs text-gray-400">
            Breakeven = total cost ÷ yield. Compared against your{" "}
            <strong>local cash price</strong>, not futures. Cost defaults from{" "}
            {defaults ? "backend (GET /defaults)" : "local config"}.
          </p>
        </>
      )}
    </div>
  );
}

function WholeFarmCard({
  totals,
  totalAcres,
  cropCount,
  fromScenario,
}: {
  totals: { revenue: number; expense: number; netMargin: number };
  totalAcres: number;
  cropCount: number;
  fromScenario: boolean;
}) {
  const positive = totals.netMargin >= 0;
  const fmt = (n: number) =>
    `$${Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  return (
    <div
      className={`rounded-xl border bg-white p-5 shadow-sm flex flex-col gap-4 ${
        fromScenario ? "border-indigo-200" : "border-gray-200"
      }`}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">
          Whole-Farm Summary
        </h2>
        <span className="text-xs text-gray-400">
          {totalAcres.toLocaleString()} total acres · {cropCount} crop
          {cropCount !== 1 ? "s" : ""}
          {fromScenario && (
            <span className="ml-1.5 text-indigo-500">· saved scenario</span>
          )}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-gray-500">Total Revenue</p>
          <p className="text-lg font-bold tabular-nums text-gray-900">
            {fmt(totals.revenue)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Total Expense</p>
          <p className="text-lg font-bold tabular-nums text-gray-900">
            {fmt(totals.expense)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Net Margin</p>
          <p
            className={`text-lg font-bold tabular-nums ${
              positive ? "text-emerald-700" : "text-red-600"
            }`}
          >
            {positive ? "" : "−"}
            {fmt(totals.netMargin)}
          </p>
        </div>
      </div>
    </div>
  );
}

function DecisionPanel({
  cashPrice,
  be,
  margin,
  revenue,
}: {
  cashPrice: number;
  be: number;
  margin: number;
  revenue: number;
}) {
  const clears = cashPrice > 0 && cashPrice >= be;
  const barMax = Math.max(cashPrice, be, 0.01) * 1.2;
  const pct = (v: number) =>
    `${Math.min((v / barMax) * 100, 100).toFixed(1)}%`;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Decision</h2>
        {cashPrice > 0 ? (
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              clears
                ? "bg-emerald-100 text-emerald-800"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            {clears ? "CLEARS BREAKEVEN" : "BELOW BREAKEVEN"}
          </span>
        ) : (
          <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-gray-100 text-gray-500">
            ENTER CASH PRICE
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Bar
          label="Local cash price"
          value={cashPrice}
          width={pct(cashPrice)}
          color="bg-blue-500"
        />
        <Bar
          label="Breakeven"
          value={be}
          width={pct(be)}
          color="bg-gray-400"
        />
      </div>

      <div className="flex flex-wrap gap-x-8 gap-y-1 text-sm">
        {cashPrice > 0 && (
          <span className="text-gray-500">
            Margin vs BE{" "}
            <span
              className={`font-semibold ${
                cashPrice - be >= 0 ? "text-emerald-700" : "text-red-600"
              }`}
            >
              {cashPrice - be >= 0 ? "+" : "−"}$
              {Math.abs(cashPrice - be).toFixed(2)}/bu
            </span>
          </span>
        )}
        <span className="text-gray-500">
          Net margin{" "}
          <span
            className={`font-semibold ${
              margin >= 0 ? "text-emerald-700" : "text-red-600"
            }`}
          >
            {margin >= 0 ? "+" : "−"}${Math.abs(margin).toFixed(0)}/acre
          </span>
        </span>
        <span className="text-gray-500">
          Revenue{" "}
          <span className="font-semibold text-gray-800">
            ${revenue.toFixed(0)}/acre
          </span>
        </span>
      </div>
    </div>
  );
}

function Bar({
  label,
  value,
  width,
  color,
}: {
  label: string;
  value: number;
  width: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-xs text-gray-500">{label}</span>
      <div className="h-2 w-full rounded-full bg-gray-100">
        <div className={`h-2 rounded-full ${color}`} style={{ width }} />
      </div>
      <span className="w-16 text-right text-sm font-semibold tabular-nums text-gray-900">
        ${value.toFixed(2)}
      </span>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  strong,
}: {
  label: string;
  value: string;
  hint?: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border bg-white p-3 shadow-sm ${
        strong ? "border-gray-300" : "border-gray-200"
      }`}
    >
      <p className="text-xs text-gray-500">{label}</p>
      <p
        className={`tabular-nums ${
          strong
            ? "text-lg font-bold text-gray-900"
            : "text-base font-semibold text-gray-800"
        }`}
      >
        {value}
        {hint && (
          <span className="ml-1 text-xs font-normal text-gray-400">
            {hint}
          </span>
        )}
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Remove the legacy handler from `handlers.ts`**

Open `src/lib/mocks/handlers.ts` and make these three changes:

**Remove lines 1-2 (the two legacy imports at the top):**
```ts
// DELETE these lines:
import type { BreakevenRequest } from "@/types";
import { breakevenFromRequest } from "./data/breakeven";
```

**Remove the legacy breakeven handler block (the entire `http.post("/api/breakeven/calculate", ...)` entry):**
```ts
// DELETE this entire block from the handlers array:
// Breakeven calculation (legacy mock — stays until data flow is refactored)
http.post("/api/breakeven/calculate", async ({ request }) => {
  const body = (await request.json().catch(() => ({}))) as Partial<BreakevenRequest>;
  return HttpResponse.json(breakevenFromRequest(body));
}),
```

The resulting `handlers.ts` import section should start with:
```ts
import { http, HttpResponse } from "msw";
import type { Scenario } from "@/lib/calc/scenario";
import { mockFarmProfile, mockMachinery } from "./data/farm";
import { mockDefaults } from "./data/defaults";
```

- [ ] **Step 3: Verify typecheck, lint, and tests**

```bash
npx tsc --noEmit && npm run lint && npm test
```

Expected: tsc exits 0. Lint exits 0. 19/19 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/breakeven/BreakevenClient.tsx src/lib/mocks/handlers.ts
git commit -m "feat(breakeven): wire calc engine to per-field results; add FieldInputPanel + sensitivity sliders"
```

---

## Task 4: Delete dead code and trim types

**Files:**
- Delete: `src/lib/api/breakeven.ts`
- Delete: `src/lib/breakeven/preview.ts`
- Delete: `src/lib/mocks/data/breakeven.ts`
- Delete: `src/types/breakeven.ts`
- Modify: `src/types/index.ts`

**Interfaces:**
- Consumes: nothing (pure cleanup — all callers already removed in Task 3)

- [ ] **Step 1: Delete the four dead files**

```bash
rm src/lib/api/breakeven.ts
rm src/lib/breakeven/preview.ts
rm src/lib/mocks/data/breakeven.ts
rm src/types/breakeven.ts
```

- [ ] **Step 2: Remove breakeven re-exports from `types/index.ts`**

Open `src/types/index.ts`. Remove this block entirely:

```ts
// DELETE these four lines:
export type {
  BreakevenRequest,
  CostSubtotals,
  SensitivityMatrix,
  BreakevenResult,
} from "./breakeven";
```

The resulting file should be:

```ts
export type { Crop, State, Season, ApiResponse, ApiError } from "./common";
export type {
  CostCategory,
  CostItem,
  CostStructure,
  RevenueInputs,
  Field,
  ValueRange,
  Machinery,
  FarmProfile,
  MachineryListResponse,
} from "./farm";
export type { DefaultsCropEntry, DefaultsResponse } from "./defaults";
```

- [ ] **Step 3: Verify typecheck, lint, and tests all pass**

```bash
npx tsc --noEmit && npm run lint && npm test
```

Expected: tsc exits 0. Lint exits 0. 19/19 tests pass.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(breakeven): delete legacy breakeven API, preview engine, and stale types"
```

---

## Self-Review

**Spec coverage:**
- [x] R1 — per-field results now use `lib/calc/calc.ts` directly (Task 3)
- [x] R2 — `CostItem` / `BreakevenResult` retired; UI speaks `CostLine[]` via `FieldInputs` (Tasks 1, 4)
- [x] R3 — `FieldInputPanel` provides cash price, yield, land, machinery, 17 direct cost lines (Task 1)
- [x] R4 — `priceExtent` / `yieldExtent` sliders + reactive `useMemo` (Task 3)
- [x] R5 — `cashPricePerBu` input starts at 0, highlighted amber until filled (Task 1)
- [x] R8 — `preview.ts` deleted (Task 4)
- [x] Dead code removed — `lib/api/breakeven.ts`, `lib/breakeven/preview.ts`, `lib/mocks/data/breakeven.ts`, `types/breakeven.ts` (Task 4)
- [x] Handler cleanup — `POST /api/breakeven/calculate` and its imports removed from `handlers.ts` (Task 3)

**Type consistency check:**
- `FieldInputs` defined in `FieldInputPanel.tsx` (Task 1) — imported by `BreakevenClient.tsx` (Task 3) as `import FieldInputPanel, { type FieldInputs }` ✓
- `SensitivityGrid` new props (`cells`, `priceAxis`, `yieldAxis`) defined in Task 2, consumed in Task 3 ✓
- `toCropEntry(field, inputs)` defined in `BreakevenClient.tsx`, returns `CropEntry` from `lib/calc/scenario.ts` ✓
- `initFieldInputs` returns `Map<string, FieldInputs>` matching the `fieldInputs` state type ✓
- `defaultFieldInputsRef.current` is `Map<string, FieldInputs>` — same type as `fieldInputs` ✓
