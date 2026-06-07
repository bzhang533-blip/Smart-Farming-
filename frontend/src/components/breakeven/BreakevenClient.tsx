"use client";

import { useEffect, useState } from "react";
import type { BreakevenResult, FarmProfile } from "@/types";
import { getFarmProfile } from "@/lib/api/farm";
import { calculateBreakeven } from "@/lib/api/breakeven";
import { CROP_CONFIG } from "@/config/crops";
import { mergeCostItems } from "@/config/costModel";
import SensitivityGrid from "./SensitivityGrid";

interface Props {
  farmId: string;
}

export default function BreakevenClient({ farmId }: Props) {
  const [farm, setFarm] = useState<FarmProfile | null>(null);
  const [fieldId, setFieldId] = useState<string | null>(null);
  const [result, setResult] = useState<BreakevenResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1) 加载农场档案
  useEffect(() => {
    getFarmProfile(farmId)
      .then((f) => {
        setFarm(f);
        setFieldId(f.fields[0]?.fieldId ?? null);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load farm profile");
        setLoading(false);
      });
  }, [farmId]);

  // 2) 选中字段变化 → 请求权威保本计算（mock）
  useEffect(() => {
    if (!farm || !fieldId) return;
    const field = farm.fields.find((f) => f.fieldId === fieldId);
    if (!field) return;
    const cfg = CROP_CONFIG[field.crop];
    calculateBreakeven({
      farmId,
      fieldId: field.fieldId,
      crop: field.crop,
      season: "2026",
      costItems: mergeCostItems(farm.costStructure, field.crop),
      aph: field.aph,
      zip: field.zip,
      govtPaymentPerAcre: cfg.revenueDefaults.govtPaymentPerAcre,
    })
      .then((r) => {
        setResult(r);
        setError(null);
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Breakeven calculation failed")
      );
  }, [farm, fieldId, farmId]);

  // 结果是否对应当前选中字段（用于「更新中」提示，避免在 effect 内同步 setState）。
  const calcStale = !!result && result.fieldId !== fieldId;

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
      <div className="flex flex-col gap-0.5">
        <h1 className="text-xl font-semibold text-gray-900">Breakeven &amp; Sensitivity</h1>
        <p className="text-sm text-gray-500">
          {farm.name} · Local cash price vs. true breakeven — never futures.
        </p>
      </div>

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
              <span className="text-xs text-gray-400">
                Net margin / acre {calcStale && "· updating…"}
              </span>
            </div>
            <SensitivityGrid
              matrix={result.sensitivityMatrix}
              centerPrice={result.currentCashPrice}
              centerYield={result.aph}
            />
          </section>

          <p className="text-xs text-gray-400">
            Breakeven = total cost ÷ APH yield. Figures are authoritative from the backend
            contract (mock here). Compared against your <strong>local cash price</strong>, not futures.
          </p>
        </>
      )}
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
