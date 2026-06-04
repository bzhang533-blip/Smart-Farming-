"use client";

import { useEffect, useState } from "react";
import type { DashboardResponse, FarmProfile } from "@/types";
import { getDashboardSignals } from "@/lib/api/dashboard";
import { getFarmProfile } from "@/lib/api/farm";
import { STATE_CONFIG } from "@/config/states";
import SignalCard from "./SignalCard";

interface Props {
  farmId: string;
}

interface State {
  signals: DashboardResponse | null;
  farm: FarmProfile | null;
  loading: boolean;
  error: string | null;
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm animate-pulse">
      <div className="flex justify-between mb-4">
        <div className="h-4 bg-gray-200 rounded w-40" />
        <div className="h-5 bg-gray-200 rounded-full w-14" />
      </div>
      <div className="space-y-3">
        <div className="h-2 bg-gray-200 rounded w-full" />
        <div className="h-2 bg-gray-200 rounded w-3/4" />
      </div>
      <div className="mt-4 h-3 bg-gray-200 rounded w-full" />
      <div className="mt-1 h-3 bg-gray-200 rounded w-4/5" />
    </div>
  );
}

export default function DashboardClient({ farmId }: Props) {
  const [state, setState] = useState<State>({
    signals: null,
    farm: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    Promise.all([getDashboardSignals(farmId), getFarmProfile(farmId)])
      .then(([signals, farm]) => setState({ signals, farm, loading: false, error: null }))
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "Failed to load dashboard";
        setState((s) => ({ ...s, loading: false, error: message }));
      });
  }, [farmId]);

  if (state.loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <div className="h-7 bg-gray-200 rounded w-48 animate-pulse mb-2" />
          <div className="h-4 bg-gray-200 rounded w-64 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
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

  const { signals, farm } = state;
  if (!signals || !farm) return null;

  const fieldMap = new Map(farm.fields.map((f) => [f.fieldId, f]));
  const stateLabel = STATE_CONFIG[farm.state]?.label ?? farm.state;
  const updatedAt = new Date(signals.updatedAt).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-0.5">
        <h1 className="text-xl font-semibold text-gray-900">{farm.name}</h1>
        <p className="text-sm text-gray-500">
          {stateLabel} · Decision Cockpit · Updated {updatedAt}
        </p>
      </div>

      {/* Signal summary strip */}
      <div className="mb-5 flex gap-3 text-sm">
        {(["sell", "watch", "hold"] as const).map((type) => {
          const count = signals.signals.filter((s) => s.signalType === type).length;
          if (count === 0) return null;
          const color =
            type === "sell" ? "text-green-700" : type === "watch" ? "text-amber-700" : "text-slate-600";
          return (
            <span key={type} className={`font-semibold ${color}`}>
              {count} {type.toUpperCase()}
            </span>
          );
        })}
        <span className="text-gray-400">·</span>
        <span className="text-gray-500">{signals.signals.length} field{signals.signals.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Signal cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {signals.signals.map((signal) => {
          const field = fieldMap.get(signal.fieldId);
          return (
            <SignalCard
              key={signal.fieldId}
              signal={signal}
              fieldName={field?.name ?? signal.fieldId}
              acres={field?.acres ?? 0}
            />
          );
        })}
      </div>
    </div>
  );
}
