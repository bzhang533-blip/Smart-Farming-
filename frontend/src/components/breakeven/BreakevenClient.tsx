"use client";

import { useEffect, useMemo, useState } from "react";
import type { BreakevenResult, DefaultsResponse, FarmProfile } from "@/types";
import { getFarmProfile } from "@/lib/api/farm";
import { calculateBreakeven } from "@/lib/api/breakeven";
import { getDefaults } from "@/lib/api/defaults";
import {
  createScenario,
  deleteScenario,
  getScenario,
  listScenarios,
  type ScenarioSummary,
} from "@/lib/api/scenarios";
import { CROP_CONFIG } from "@/config/crops";
import { mergeCostItems } from "@/config/costModel";
import { wholeFarm } from "@/lib/calc/calc";
import type { CostLine, CropKey, Scenario } from "@/lib/calc/scenario";
import SensitivityGrid from "./SensitivityGrid";

interface Props {
  farmId: string;
}

/**
 * Assembles a Scenario from current farm data + per-field breakeven results.
 * Uses backend defaults (per-crop CostLine[]) when available, so corn and
 * soybeans get their own correct cost lines rather than a shared farm-level guess.
 */
function buildScenario(
  farm: FarmProfile,
  results: Map<string, BreakevenResult>,
  defaults: DefaultsResponse | null,
): Scenario {
  return {
    year: 2026,
    region: "midwest",
    farm: { name: farm.name },
    crops: farm.fields
      .filter((f) => results.has(f.fieldId))
      .map((f) => {
        const res = results.get(f.fieldId)!;
        const cropKey = f.crop as CropKey; // safe: Crop ⊆ CropKey after "soybeans" migration
        const cropDefs = defaults?.crops[cropKey];

        const directCosts: CostLine[] = cropDefs?.directCosts ??
          farm.costStructure
            .filter((c) => c.category === "direct")
            .map((c) => ({ key: c.key, label: c.key, value: c.valuePerAcre, source: "user" as const }));

        const landCostPerAcre = cropDefs?.landCostPerAcre ??
          (farm.costStructure.find((c) => c.key === "land-cost")?.valuePerAcre ?? 0);
        const machineryCostPerAcre = cropDefs?.machineryCostPerAcre ??
          (farm.costStructure.find((c) => c.key === "machinery-cost")?.valuePerAcre ?? 0);

        return {
          crop: cropKey,
          acres: f.acres,
          yieldBasis: "aph" as const,
          yieldBuPerAcre: f.aph,
          cashPricePerBu: res.currentCashPrice,
          govtPaymentPerAcre: CROP_CONFIG[f.crop].revenueDefaults.govtPaymentPerAcre,
          directCosts,
          landCostPerAcre,
          machineryCostPerAcre,
        };
      }),
  };
}

export default function BreakevenClient({ farmId }: Props) {
  const [farm, setFarm] = useState<FarmProfile | null>(null);
  const [fieldId, setFieldId] = useState<string | null>(null);
  const [allResults, setAllResults] = useState<Map<string, BreakevenResult>>(new Map());
  const [defaults, setDefaults] = useState<DefaultsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Scenario state
  const [scenarioList, setScenarioList] = useState<ScenarioSummary[]>([]);
  const [loadedScenario, setLoadedScenario] = useState<(Scenario & { id: string }) | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // 1) Load farm profile + defaults in parallel
  useEffect(() => {
    Promise.all([getFarmProfile(farmId), getDefaults()])
      .then(([f, defs]) => {
        setFarm(f);
        setFieldId(f.fields[0]?.fieldId ?? null);
        setDefaults(defs);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load");
        setLoading(false);
      });
  }, [farmId]);

  // 2) When farm loads, compute breakeven for ALL fields in parallel
  useEffect(() => {
    if (!farm) return;
    Promise.all(
      farm.fields.map((f) =>
        calculateBreakeven({
          farmId,
          fieldId: f.fieldId,
          crop: f.crop,
          season: "2026",
          costItems: mergeCostItems(farm.costStructure, f.crop),
          aph: f.aph,
          zip: f.zip,
          govtPaymentPerAcre: CROP_CONFIG[f.crop].revenueDefaults.govtPaymentPerAcre,
        }),
      ),
    )
      .then((results) => {
        setAllResults(new Map(results.map((r, i) => [farm.fields[i].fieldId, r])));
        setError(null);
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Breakeven calculation failed"),
      );
  }, [farm, farmId]);

  // 3) Load scenario list
  useEffect(() => {
    listScenarios()
      .then((res) => setScenarioList(res.scenarios))
      .catch(() => { /* non-fatal */ });
  }, []);

  const result = allResults.get(fieldId ?? "");
  const resultsReady = !!farm && farm.fields.every((f) => allResults.has(f.fieldId));

  const wholeFarmTotals = useMemo(() => {
    if (loadedScenario) return wholeFarm(loadedScenario);
    if (!farm || !resultsReady) return null;
    return wholeFarm(buildScenario(farm, allResults, defaults));
  }, [farm, allResults, resultsReady, defaults, loadedScenario]);

  // ── Save current scenario ────────────────────────────────────────────────
  async function handleSave() {
    if (!farm || !resultsReady) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const scenario = buildScenario(farm, allResults, defaults);
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

  // ── Load a saved scenario ────────────────────────────────────────────────
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
    } catch { /* ignore */ }
  }

  // ── Render guards ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="h-7 w-56 animate-pulse rounded bg-gray-200" />
        <div className="mt-6 h-64 animate-pulse rounded-xl bg-gray-200" />
      </div>
    );
  }

  if (error && !result) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!farm) return null;
  const field = farm.fields.find((f) => f.fieldId === fieldId);

  return (
    <div className="p-6 max-w-4xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-xl font-semibold text-gray-900">Breakeven &amp; Sensitivity</h1>
          <p className="text-sm text-gray-500">
            {farm.name} · Local cash price vs. true breakeven — never futures.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !resultsReady}
          className="shrink-0 rounded-lg border border-blue-600 bg-white px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-40 transition-colors"
        >
          {saving ? "Saving…" : saveMsg ?? "Save Scenario"}
        </button>
      </div>

      {/* Saved scenarios picker */}
      {scenarioList.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Saved Scenarios</p>
          <div className="flex flex-wrap gap-2">
            {scenarioList.map((s) => {
              const active = loadedScenario?.id === s.id;
              return (
                <div key={s.id} className="flex items-center gap-1">
                  <button
                    onClick={() => (active ? setLoadedScenario(null) : handleLoad(s.id))}
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
              Viewing saved scenario — click again to return to current farm data.
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

      {/* Whole-farm dollar totals */}
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

      {result && field && (
        <>
          <DecisionPanel result={result} />

          {/* Cost subtotals */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Direct" value={`$${result.subtotals.directTotal.toFixed(0)}`} hint="/acre" />
            <Stat label="Capital" value={`$${result.subtotals.capitalTotal.toFixed(0)}`} hint="/acre" />
            <Stat label="Net Family Living" value={`$${result.subtotals.netFamilyLiving.toFixed(0)}`} hint="/acre" />
            <Stat label="Total Expense" value={`$${result.totalCostPerAcre.toFixed(0)}`} hint="/acre" strong />
          </div>

          {/* Sensitivity matrix */}
          <section className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <h2 className="text-base font-semibold text-gray-900">
                Price × Yield sensitivity
              </h2>
              <span className="text-xs text-gray-400">Net margin / acre</span>
            </div>
            <SensitivityGrid
              cells={result.sensitivityMatrix.cells}
              priceAxis={result.sensitivityMatrix.priceAxis}
              yieldAxis={result.sensitivityMatrix.yieldAxis}
              centerPrice={result.currentCashPrice}
              centerYield={result.aph}
            />
          </section>

          <p className="text-xs text-gray-400">
            Breakeven = total cost ÷ APH yield. Compared against your{" "}
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
    <div className={`rounded-xl border bg-white p-5 shadow-sm flex flex-col gap-4 ${fromScenario ? "border-indigo-200" : "border-gray-200"}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Whole-Farm Summary</h2>
        <span className="text-xs text-gray-400">
          {totalAcres.toLocaleString()} total acres · {cropCount} crop{cropCount !== 1 ? "s" : ""}
          {fromScenario && <span className="ml-1.5 text-indigo-500">· saved scenario</span>}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-gray-500">Total Revenue</p>
          <p className="text-lg font-bold tabular-nums text-gray-900">{fmt(totals.revenue)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Total Expense</p>
          <p className="text-lg font-bold tabular-nums text-gray-900">{fmt(totals.expense)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Net Margin</p>
          <p className={`text-lg font-bold tabular-nums ${positive ? "text-emerald-700" : "text-red-600"}`}>
            {positive ? "" : "−"}{fmt(totals.netMargin)}
          </p>
        </div>
      </div>
    </div>
  );
}

function DecisionPanel({ result }: { result: BreakevenResult }) {
  const clears = result.currentCashPrice >= result.breakevenPrice;
  const margin = result.currentCashPrice - result.breakevenPrice;
  const barMax = Math.max(result.currentCashPrice, result.breakevenPrice) * 1.2;
  const pct = (v: number) => `${Math.min((v / barMax) * 100, 100).toFixed(1)}%`;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Decision</h2>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            clears ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
          }`}
        >
          {clears ? "CLEARS BREAKEVEN" : "BELOW BREAKEVEN"}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <Bar label="Local cash price" value={result.currentCashPrice} width={pct(result.currentCashPrice)} color="bg-blue-500" />
        <Bar label="Breakeven" value={result.breakevenPrice} width={pct(result.breakevenPrice)} color="bg-gray-400" />
      </div>

      <div className="flex flex-wrap gap-x-8 gap-y-1 text-sm">
        <span className="text-gray-500">
          Margin{" "}
          <span className={`font-semibold ${margin >= 0 ? "text-emerald-700" : "text-red-600"}`}>
            {margin >= 0 ? "+" : "−"}${Math.abs(margin).toFixed(2)}/bu
          </span>
        </span>
        <span className="text-gray-500">
          Net margin{" "}
          <span className={`font-semibold ${result.netMarginPerAcre >= 0 ? "text-emerald-700" : "text-red-600"}`}>
            {result.netMarginPerAcre >= 0 ? "+" : "−"}${Math.abs(result.netMarginPerAcre).toFixed(0)}/acre
          </span>
        </span>
        <span className="text-gray-500">
          Total revenue{" "}
          <span className="font-semibold text-gray-800">${result.totalRevenuePerAcre.toFixed(0)}/acre</span>
        </span>
      </div>
    </div>
  );
}

function Bar({ label, value, width, color }: { label: string; value: number; width: string; color: string }) {
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

function Stat({ label, value, hint, strong }: { label: string; value: string; hint?: string; strong?: boolean }) {
  return (
    <div className={`rounded-xl border bg-white p-3 shadow-sm ${strong ? "border-gray-300" : "border-gray-200"}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`tabular-nums ${strong ? "text-lg font-bold text-gray-900" : "text-base font-semibold text-gray-800"}`}>
        {value}
        {hint && <span className="ml-1 text-xs font-normal text-gray-400">{hint}</span>}
      </p>
    </div>
  );
}
