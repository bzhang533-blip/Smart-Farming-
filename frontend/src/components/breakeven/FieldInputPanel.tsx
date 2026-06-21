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
