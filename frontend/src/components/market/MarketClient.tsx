"use client";

import { useEffect, useState } from "react";
import type { Crop, State, CashPricesResponse, FuturesPrice, BasisHistoryResponse } from "@/types";
import { getCashPrices, getFutures, getBasisHistory } from "@/lib/api/market";
import { CROP_CONFIG, CROPS } from "@/config/crops";
import { STATE_CONFIG, STATES } from "@/config/states";
import FuturesCard from "./FuturesCard";
import ElevatorTable from "./ElevatorTable";
import BasisTable from "./BasisTable";

interface PageState {
  cashPrices: CashPricesResponse | null;
  futures: FuturesPrice | null;
  basisHistory: BasisHistoryResponse | null;
  loading: boolean;
  error: string | null;
}

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-200 ${className ?? ""}`} />;
}

function PillButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
        active
          ? "bg-blue-600 text-white"
          : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900"
      }`}
    >
      {children}
    </button>
  );
}

export default function MarketClient() {
  const [crop, setCrop] = useState<Crop>("corn");
  const [activeState, setActiveState] = useState<State>("IA");
  const [state, setState] = useState<PageState>({
    cashPrices: null,
    futures: null,
    basisHistory: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getCashPrices({ state: activeState, crop }),
      getFutures({ symbol: CROP_CONFIG[crop].futuresSymbol }),
      getBasisHistory({
        state: activeState,
        crop,
        from: "2026-01-01",
        to: "2026-06-04",
      }),
    ])
      .then(([cashPrices, futures, basisHistory]) => {
        if (!cancelled)
          setState({ cashPrices, futures, basisHistory, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Failed to load market data";
          setState({ cashPrices: null, futures: null, basisHistory: null, loading: false, error: message });
        }
      });
    return () => { cancelled = true; };
  }, [crop, activeState]);

  const cropLabel = CROP_CONFIG[crop].label;
  const stateLabel = STATE_CONFIG[activeState].label;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Header + selectors */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Market Data</h1>
          <p className="text-sm text-gray-500">
            {cropLabel} · {stateLabel} · Today&apos;s prices
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          {/* Crop selector */}
          <div className="flex gap-1.5">
            {CROPS.map((c) => (
              <PillButton
                key={c}
                active={crop === c}
                onClick={() => { setState((p) => ({ ...p, loading: true })); setCrop(c); }}
              >
                {CROP_CONFIG[c].label}
              </PillButton>
            ))}
          </div>
          {/* State selector */}
          <div className="flex gap-1.5">
            {STATES.map((s) => (
              <PillButton
                key={s}
                active={activeState === s}
                onClick={() => { setState((p) => ({ ...p, loading: true })); setActiveState(s); }}
              >
                {STATE_CONFIG[s].label}
              </PillButton>
            ))}
          </div>
        </div>
      </div>

      {/* Loading */}
      {state.loading && (
        <div className="space-y-8">
          <SkeletonBlock className="h-32" />
          <SkeletonBlock className="h-40" />
          <SkeletonBlock className="h-52" />
        </div>
      )}

      {/* Error */}
      {!state.loading && state.error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {/* Content */}
      {!state.loading && !state.error && state.futures && state.cashPrices && state.basisHistory && (
        <>
          {/* Futures */}
          <section>
            <h2 className="mb-3 text-base font-semibold text-gray-900">Futures Reference</h2>
            <FuturesCard futures={state.futures} cropLabel={cropLabel} />
          </section>

          {/* Cash prices */}
          <section>
            <h2 className="mb-3 text-base font-semibold text-gray-900">
              Local Cash Prices
              <span className="ml-2 text-sm font-normal text-gray-400">
                {state.cashPrices.prices.length} elevator
                {state.cashPrices.prices.length !== 1 ? "s" : ""}
              </span>
            </h2>
            <ElevatorTable response={state.cashPrices} />
          </section>

          {/* Basis history */}
          <section>
            <h2 className="mb-3 text-base font-semibold text-gray-900">
              Basis History
              <span className="ml-2 text-sm font-normal text-gray-400">
                {state.basisHistory.series.length} months
              </span>
            </h2>
            <BasisTable response={state.basisHistory} />
          </section>
        </>
      )}
    </div>
  );
}
