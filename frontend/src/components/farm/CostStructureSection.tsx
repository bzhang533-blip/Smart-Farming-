"use client";

import { useState } from "react";
import Link from "next/link";
import type { CostItem, CostStructure, Crop, Field } from "@/types";
import { CROP_CONFIG } from "@/config/crops";
import {
  COST_ITEM_CATALOG,
  COST_CATEGORY_ORDER,
  COST_CATEGORY_LABELS,
  COST_CATEGORY_HINTS,
  mergeCostItems,
  costItemSign,
} from "@/config/costModel";
import { costSubtotals, totalCostPerAcre } from "@/lib/breakeven/preview";
import { updateFarmProfile } from "@/lib/api/farm";

interface Props {
  farmId: string;
  costStructure: CostStructure;
  fields: Field[];
  onSave: (updated: CostStructure) => void;
}

const fmt = (n: number) => `$${n.toFixed(0)}`;

export default function CostStructureSection({ farmId, costStructure, fields, onSave }: Props) {
  // 农场级成本以首块地的作物为兜底基准（缺项填默认值）。
  const primaryCrop: Crop = fields[0]?.crop ?? "corn";

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<CostItem[]>(() => mergeCostItems(costStructure, primaryCrop));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const displayed = editing ? draft : mergeCostItems(costStructure, primaryCrop);
  const valueByKey = new Map(displayed.map((i) => [i.key, i.valuePerAcre]));

  const subtotals = costSubtotals(displayed);
  const total = totalCostPerAcre(subtotals);

  function startEdit() {
    setDraft(mergeCostItems(costStructure, primaryCrop));
    setSaveError(null);
    setEditing(true);
  }

  function cancel() {
    setEditing(false);
    setSaveError(null);
  }

  function resetDefaults() {
    setDraft(
      COST_ITEM_CATALOG.map((d) => ({
        key: d.key,
        category: d.category,
        valuePerAcre: d.defaults[primaryCrop],
      }))
    );
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

  function setItem(key: string, raw: string) {
    const value = parseFloat(raw);
    setDraft((d) =>
      d.map((i) => (i.key === key ? { ...i, valuePerAcre: isNaN(value) ? 0 : value } : i))
    );
  }

  const subtotalFor = (cat: (typeof COST_CATEGORY_ORDER)[number]) =>
    cat === "direct"
      ? subtotals.directTotal
      : cat === "capital"
        ? subtotals.capitalTotal
        : subtotals.netFamilyLiving;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">
          Cost Structure
          <span className="ml-2 text-sm font-normal text-gray-400">
            per acre · {CROP_CONFIG[primaryCrop].label} defaults
          </span>
        </h2>
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
              onClick={resetDefaults}
              disabled={saving}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
            >
              Reset to defaults
            </button>
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
        {COST_CATEGORY_ORDER.map((cat) => {
          const defs = COST_ITEM_CATALOG.filter((d) => d.category === cat);
          return (
            <div key={cat} className="border-b border-gray-100 last:border-b-0">
              <div className="flex items-baseline justify-between bg-gray-50/70 px-5 py-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {COST_CATEGORY_LABELS[cat]}
                </h3>
                <span className="text-xs text-gray-400">{COST_CATEGORY_HINTS[cat]}</span>
              </div>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-100">
                  {defs.map((d) => {
                    const value = valueByKey.get(d.key) ?? 0;
                    const deduction = costItemSign(d.key) < 0;
                    return (
                      <tr key={d.key} className="hover:bg-gray-50">
                        <td className="px-5 py-2.5 text-gray-600">
                          {d.label}
                          {deduction && (
                            <span className="ml-1.5 text-xs text-gray-400">(deduction)</span>
                          )}
                        </td>
                        <td className="px-5 py-2.5 text-right tabular-nums">
                          {editing ? (
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={value}
                              onChange={(e) => setItem(d.key, e.target.value)}
                              className="w-24 rounded border border-gray-300 px-2 py-0.5 text-right tabular-nums text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          ) : (
                            <span className="font-medium text-gray-900">
                              {deduction && value > 0 ? "−" : ""}
                              {fmt(value)}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-2.5 text-xs text-gray-400 w-16">/acre</td>
                      </tr>
                    );
                  })}
                  <tr className="bg-gray-50/60 text-sm font-medium text-gray-700">
                    <td className="px-5 py-2">Subtotal · {COST_CATEGORY_LABELS[cat]}</td>
                    <td className="px-5 py-2 text-right tabular-nums">{fmt(subtotalFor(cat))}</td>
                    <td className="px-5 py-2 text-xs text-gray-400">/acre</td>
                  </tr>
                </tbody>
              </table>
            </div>
          );
        })}

        {/* Grand total */}
        <table className="w-full text-sm">
          <tbody>
            <tr className="bg-gray-100 font-semibold">
              <td className="px-5 py-3 text-gray-900">Total Expense</td>
              <td className="px-5 py-3 text-right tabular-nums text-gray-900">{fmt(total)}</td>
              <td className="px-5 py-3 text-xs text-gray-400">/acre</td>
            </tr>
          </tbody>
        </table>

        {/* Per-field breakeven preview */}
        {fields.length > 0 && (
          <div className="border-t border-gray-100 px-5 py-4 flex flex-col gap-1.5">
            <p className="text-xs font-medium text-gray-500 mb-1">
              Est. breakeven{" "}
              <span className="font-normal text-gray-400">(preview — final from backend)</span>
            </p>
            {fields.map((f) => {
              const be = f.aph > 0 ? total / f.aph : null;
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
            <Link
              href="/breakeven"
              className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              Open breakeven &amp; sensitivity →
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
