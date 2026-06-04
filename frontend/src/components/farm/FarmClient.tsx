"use client";

import { useEffect, useState } from "react";
import type { FarmProfile, Machinery } from "@/types";
import { getFarmProfile } from "@/lib/api/farm";
import { getMachinery } from "@/lib/api/farm";
import { STATE_CONFIG } from "@/config/states";
import FieldCard from "./FieldCard";
import CostStructureSection from "./CostStructureSection";
import MachineryRow from "./MachineryRow";

interface Props {
  farmId: string;
}

interface PageState {
  farm: FarmProfile | null;
  machinery: Machinery[];
  loading: boolean;
  error: string | null;
}

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-200 ${className ?? ""}`} />;
}

export default function FarmClient({ farmId }: Props) {
  const [state, setState] = useState<PageState>({
    farm: null,
    machinery: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    Promise.all([getFarmProfile(farmId), getMachinery(farmId)])
      .then(([farm, machineryRes]) =>
        setState({ farm, machinery: machineryRes.machinery, loading: false, error: null })
      )
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "Failed to load farm profile";
        setState((s) => ({ ...s, loading: false, error: message }));
      });
  }, [farmId]);

  if (state.loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-8">
        <SkeletonBlock className="h-7 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SkeletonBlock className="h-28" />
          <SkeletonBlock className="h-28" />
        </div>
        <SkeletonBlock className="h-64" />
        <SkeletonBlock className="h-28" />
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      </div>
    );
  }

  const { farm, machinery } = state;
  if (!farm) return null;

  const stateLabel = STATE_CONFIG[farm.state]?.label ?? farm.state;

  function handleCostSave(updated: FarmProfile["costStructure"]) {
    setState((s) => s.farm ? { ...s, farm: { ...s.farm, costStructure: updated } } : s);
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{farm.name}</h1>
        <p className="text-sm text-gray-500">{stateLabel} · Farm Profile</p>
      </div>

      {/* Fields */}
      <section>
        <h2 className="mb-3 text-base font-semibold text-gray-900">
          Fields
          <span className="ml-2 text-sm font-normal text-gray-400">
            {farm.fields.length} field{farm.fields.length !== 1 ? "s" : ""} ·{" "}
            {farm.fields.reduce((s, f) => s + f.acres, 0).toLocaleString()} total acres
          </span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {farm.fields.map((f) => (
            <FieldCard key={f.fieldId} field={f} />
          ))}
        </div>
      </section>

      {/* Cost Structure */}
      <CostStructureSection
        farmId={farmId}
        costStructure={farm.costStructure}
        fields={farm.fields}
        onSave={handleCostSave}
      />

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
