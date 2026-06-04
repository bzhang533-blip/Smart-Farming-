"use client";

import { useState } from "react";
import type { CostStructure, Field } from "@/types";
import { CROP_CONFIG } from "@/config/crops";
import { updateFarmProfile } from "@/lib/api/farm";

const LABELS: Record<keyof CostStructure, string> = {
  seedCostPerAcre: "Seed",
  fertilizerCostPerAcre: "Fertilizer",
  chemicalCostPerAcre: "Chemical",
  landRentPerAcre: "Land Rent",
  machineryDepreciationPerAcre: "Machinery Depreciation",
  laborCostPerAcre: "Labor",
  otherCostPerAcre: "Other",
};

const COST_KEYS = Object.keys(LABELS) as (keyof CostStructure)[];

function total(cs: CostStructure): number {
  return COST_KEYS.reduce((sum, k) => sum + cs[k], 0);
}

interface Props {
  farmId: string;
  costStructure: CostStructure;
  fields: Field[];
  onSave: (updated: CostStructure) => void;
}

export default function CostStructureSection({ farmId, costStructure, fields, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<CostStructure>(costStructure);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const displayed = editing ? draft : costStructure;
  const totalCost = total(displayed);

  function startEdit() {
    setDraft(costStructure);
    setSaveError(null);
    setEditing(true);
  }

  function cancel() {
    setEditing(false);
    setSaveError(null);
  }

  async function save() {
    setSaving(true);
    setSaveError(null);
    try {
      await updateFarmProfile(farmId, { costStructure: draft });
      onSave(draft);
      setEditing(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function setField(key: keyof CostStructure, raw: string) {
    const value = parseFloat(raw);
    setDraft((d) => ({ ...d, [key]: isNaN(value) ? 0 : value }));
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Cost Structure</h2>
        {!editing ? (
          <button
            onClick={startEdit}
            className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
          >
            Edit costs
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={cancel}
              disabled={saving}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        )}
      </div>

      {saveError && (
        <div className="mb-3 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {saveError}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-gray-100">
            {COST_KEYS.map((key) => (
              <tr key={key} className="hover:bg-gray-50">
                <td className="px-5 py-3 text-gray-600">{LABELS[key]}</td>
                <td className="px-5 py-3 text-right tabular-nums">
                  {editing ? (
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={draft[key]}
                      onChange={(e) => setField(key, e.target.value)}
                      className="w-24 rounded border border-gray-300 px-2 py-0.5 text-right tabular-nums text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  ) : (
                    <span className="font-medium text-gray-900">${displayed[key].toFixed(0)}</span>
                  )}
                </td>
                <td className="px-5 py-3 text-xs text-gray-400 w-16">/acre</td>
              </tr>
            ))}
            <tr className="bg-gray-50 font-semibold">
              <td className="px-5 py-3 text-gray-900">Total</td>
              <td className="px-5 py-3 text-right tabular-nums text-gray-900">
                ${totalCost.toFixed(0)}
              </td>
              <td className="px-5 py-3 text-xs text-gray-400">/acre</td>
            </tr>
          </tbody>
        </table>

        {/* Breakeven estimates per field */}
        {fields.length > 0 && (
          <div className="border-t border-gray-100 px-5 py-4 flex flex-col gap-1.5">
            <p className="text-xs font-medium text-gray-500 mb-1">
              Est. breakeven{" "}
              <span className="font-normal text-gray-400">(preview — final from backend)</span>
            </p>
            {fields.map((f) => {
              const be = f.aph > 0 ? totalCost / f.aph : null;
              return (
                <div key={f.fieldId} className="flex items-baseline justify-between text-sm">
                  <span className="text-gray-600">{f.name}</span>
                  <span className="tabular-nums font-semibold text-gray-800">
                    {be != null ? `~$${be.toFixed(2)} / bu` : "—"}
                    <span className="ml-1.5 text-xs font-normal text-gray-400">
                      ({f.aph} {CROP_CONFIG[f.crop].unit})
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
