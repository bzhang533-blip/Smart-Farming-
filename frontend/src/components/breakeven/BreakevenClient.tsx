"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
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
  netMarginPerAcre,
  revenuePerAcre,
  sensitivityGrid,
  totalCapitalExpense,
  totalDirectExpense,
  wholeFarm,
} from "@/lib/calc/calc";
import type { CropEntry, Scenario } from "@/lib/calc/scenario";
import { CROP_CONFIG } from "@/config/crops";
import type { FarmProfile, Field } from "@/types";
import FieldInputPanel, { type FieldInputs } from "./FieldInputPanel";
import SensitivityGrid from "./SensitivityGrid";
import { useFarmStore } from "@/lib/store/farmStore";

const round2 = (n: number) => Math.round(n * 100) / 100;

function toCropEntry(field: Field, inputs: FieldInputs): CropEntry {
  return {
    crop: field.crop,
    acres: field.acres,
    yieldBasis: inputs.yieldBasis,
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

export default function BreakevenClient() {
  const { isLoaded: clerkLoaded } = useAuth();

  // --- Store-based state ---
  const farm = useFarmStore((s) => s.farm);
  const defaults = useFarmStore((s) => s.defaults);
  const fieldInputs = useFarmStore((s) => s.fieldInputs);
  const defaultFieldInputs = useFarmStore((s) => s.defaultFieldInputs);
  const initFromFetch = useFarmStore((s) => s.initFromFetch);
  const storeUpdateFieldInputs = useFarmStore((s) => s.updateFieldInputs);

  // selectedFieldId tracks explicit user picks; null means "show first field".
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  // Derive the active fieldId: use explicit selection if valid, else first field.
  const fieldId =
    selectedFieldId && farm?.fields.some((f) => f.fieldId === selectedFieldId)
      ? selectedFieldId
      : (farm?.fields[0]?.fieldId ?? null);

  // Initialize to false if store already has data (avoids skeleton flash).
  const [loading, setLoading] = useState(
    () => useFarmStore.getState().farm === null,
  );
  const [error, setError] = useState<string | null>(null);

  // Fallback: if store is empty (user navigated directly to /breakeven),
  // fetch from the API and seed the store.
  // Must wait for Clerk to be ready — otherwise the request has no auth token
  // and the backend falls back to "dev-user", loading the wrong farm.
  useEffect(() => {
    if (!clerkLoaded || useFarmStore.getState().farm !== null) return;
    let cancelled = false;
    Promise.all([getFarmProfile(), getDefaults()])
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
  }, [clerkLoaded, initFromFetch]);

  const [priceExtent, setPriceExtent] = useState(4);
  const [yieldExtent, setYieldExtent] = useState(4);

  const [scenarioList, setScenarioList] = useState<ScenarioSummary[]>([]);
  const [loadedScenario, setLoadedScenario] = useState<
    (Scenario & { id: string }) | null
  >(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

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
    ? (defaultFieldInputs.get(fieldId) ?? null)
    : null;

  const entry = useMemo(
    () => (field && inputs ? toCropEntry(field, inputs) : null),
    [field, inputs],
  );

  const derived = useMemo(() => {
    if (!entry) return null;
    return {
      be: breakevenPrice(entry),
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
    if (loadedScenario) {
      const anyPriceEntered = loadedScenario.crops.some(
        (c) => c.cashPricePerBu > 0,
      );
      if (!anyPriceEntered) return null;
      return wholeFarm(loadedScenario);
    }
    if (!farm || fieldInputs.size === 0) return null;
    const scenario = buildScenario(farm, fieldInputs);
    if (scenario.crops.length === 0) return null;
    const anyPriceEntered = scenario.crops.some((c) => c.cashPricePerBu > 0);
    if (!anyPriceEntered) return null;
    return wholeFarm(scenario);
  }, [farm, fieldInputs, loadedScenario]);

  function updateFieldInputs(fid: string, updated: FieldInputs) {
    storeUpdateFieldInputs(fid, updated);
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
        <div className="h-7 w-56 animate-pulse rounded bg-stone-200" />
        <div className="mt-6 h-64 animate-pulse rounded-2xl bg-stone-200" />
      </div>
    );
  }

  if (error && !farm) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!farm) return null;

  return (
    <div className="p-6 max-w-4xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="border-b border-stone-100 pb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-400 mb-1">
            {farm.name} · Breakeven &amp; Sensitivity
          </p>
          <h1 className="text-3xl font-bold text-stone-900">
            What do I need to sell at?
          </h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="shrink-0 rounded-lg border border-amber-400 bg-white px-3 py-1.5 text-sm font-semibold text-amber-600 hover:bg-amber-50 disabled:opacity-40 transition-colors"
        >
          {saving ? "Saving…" : (saveMsg ?? "Save Scenario")}
        </button>
      </div>

      {/* Saved scenarios picker */}
      {scenarioList.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-400">
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
                    className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors ${
                      active
                        ? "border-amber-400 bg-amber-50 text-amber-700"
                        : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"
                    }`}
                  >
                    {s.name}
                    <span className="ml-1.5 text-xs font-normal text-stone-400">
                      {s.season}
                    </span>
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    title="Delete"
                    className="rounded px-1 py-1 text-stone-300 hover:text-red-400 transition-colors text-xs"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
          {loadedScenario && (
            <p className="text-xs text-amber-600">
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
              onClick={() => setSelectedFieldId(f.fieldId)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors ${
                active
                  ? "border-amber-400 bg-amber-50 text-amber-700"
                  : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"
              }`}
            >
              {f.name}
              <span className="ml-1.5 text-xs font-normal text-stone-400">
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
      {derived && entry && entry.yieldBuPerAcre > 0 ? (
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
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-400">
                  Sensitivity
                </p>
                <p className="text-base font-semibold text-stone-900 mt-0.5">
                  Price × Yield
                </p>
              </div>
              <span className="text-xs text-stone-400">Net margin / acre</span>
            </div>

            <div className="flex flex-wrap gap-6 text-xs text-stone-500">
              <label className="flex items-center gap-2">
                Price range
                <input
                  type="range"
                  min={1}
                  max={8}
                  value={priceExtent}
                  onChange={(e) => setPriceExtent(Number(e.target.value))}
                  className="w-24 accent-amber-500"
                />
                <span className="tabular-nums text-stone-400">
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
                  className="w-24 accent-amber-500"
                />
                <span className="tabular-nums text-stone-400">
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
                centerYield={Math.round(yieldBu)}
              />
            ) : (
              <div className="rounded-2xl border border-stone-100 bg-stone-50 p-8 text-center text-sm text-stone-400">
                Enter your local cash price above to see the sensitivity grid.
              </div>
            )}
          </section>

          <p className="text-xs text-stone-400">
            Breakeven = total cost ÷ yield. Compared against your{" "}
            <strong className="text-stone-600">local cash price</strong>, not futures. Cost defaults from{" "}
            {defaults ? "backend (GET /defaults)" : "local config"}.
          </p>
        </>
      ) : derived && entry ? (
        <div className="rounded-2xl border border-stone-100 bg-stone-50 p-6 text-center text-sm text-stone-400">
          Enter a yield above 0 to see breakeven results.
        </div>
      ) : null}
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
      className={`rounded-2xl border bg-white p-5 shadow-sm ${
        fromScenario ? "border-amber-200" : "border-stone-200"
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-400">
            Whole-Farm
          </p>
          <p className="text-base font-semibold text-stone-900 mt-0.5">Summary</p>
        </div>
        <span className="text-xs text-stone-400">
          {totalAcres.toLocaleString()} ac · {cropCount} crop
          {cropCount !== 1 ? "s" : ""}
          {fromScenario && (
            <span className="ml-1.5 text-amber-500">· scenario</span>
          )}
        </span>
      </div>
      <div className="flex items-start gap-6">
        <div className="flex flex-col gap-1">
          <span className="text-2xl font-bold tabular-nums leading-none text-stone-900">{fmt(totals.revenue)}</span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">Revenue</span>
        </div>
        <div className="w-px self-stretch bg-stone-100" />
        <div className="flex flex-col gap-1">
          <span className="text-2xl font-bold tabular-nums leading-none text-stone-900">{fmt(totals.expense)}</span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">Expense</span>
        </div>
        <div className="w-px self-stretch bg-stone-100" />
        <div className="flex flex-col gap-1">
          <span className={`text-2xl font-bold tabular-nums leading-none ${positive ? "text-emerald-700" : "text-red-600"}`}>
            {positive ? "" : "−"}{fmt(totals.netMargin)}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">Net Margin</span>
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
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-400">Decision</p>
          <p className="text-base font-semibold text-stone-900 mt-0.5">Breakeven check</p>
        </div>
        {cashPrice > 0 ? (
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold tracking-wide ${
              clears
                ? "bg-emerald-100 text-emerald-800"
                : "bg-red-100 text-red-700"
            }`}
          >
            {clears ? "CLEARS BREAKEVEN" : "BELOW BREAKEVEN"}
          </span>
        ) : (
          <span className="rounded-full px-3 py-1 text-xs font-semibold tracking-wide bg-stone-100 text-stone-500">
            ENTER CASH PRICE
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Bar
          label="Local cash price"
          value={cashPrice}
          width={pct(cashPrice)}
          color="bg-amber-500"
        />
        <Bar
          label="Breakeven"
          value={be}
          width={pct(be)}
          color="bg-stone-400"
        />
      </div>

      <div className="flex flex-wrap gap-x-8 gap-y-1 text-sm">
        {cashPrice > 0 && (
          <span className="text-stone-500">
            vs breakeven{" "}
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
        <span className="text-stone-500">
          Net margin{" "}
          <span
            className={`font-semibold ${
              margin >= 0 ? "text-emerald-700" : "text-red-600"
            }`}
          >
            {margin >= 0 ? "+" : "−"}${Math.abs(margin).toFixed(0)}/acre
          </span>
        </span>
        <span className="text-stone-500">
          Revenue{" "}
          <span className="font-semibold text-stone-800">
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
      <span className="w-28 shrink-0 text-xs text-stone-500">{label}</span>
      <div className="h-2 w-full rounded-full bg-stone-100">
        <div className={`h-2 rounded-full ${color}`} style={{ width }} />
      </div>
      <span className="w-16 text-right text-sm font-bold tabular-nums text-stone-900">
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
      className={`rounded-2xl border bg-white p-4 shadow-sm ${
        strong ? "border-stone-300" : "border-stone-200"
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 mb-1">{label}</p>
      <p className="tabular-nums">
        <span className={`${strong ? "text-2xl font-bold text-stone-900" : "text-xl font-bold text-stone-800"}`}>
          {value}
        </span>
        {hint && (
          <span className="ml-1 text-xs font-normal text-stone-400">
            {hint}
          </span>
        )}
      </p>
    </div>
  );
}
