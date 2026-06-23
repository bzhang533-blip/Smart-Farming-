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
