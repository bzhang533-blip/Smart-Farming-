import type { DashboardSignal } from "@/types";
import { CROP_CONFIG } from "@/config/crops";
import SignalBadge from "./SignalBadge";

interface Props {
  signal: DashboardSignal;
  fieldName: string;
  acres: number;
}

function PriceBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100).toFixed(1);
  return (
    <div className="h-2 w-full rounded-full bg-gray-100">
      <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function SignalCard({ signal, fieldName, acres }: Props) {
  const cropLabel = CROP_CONFIG[signal.crop].label;
  const profitPerBushel = (signal.currentCashPrice - signal.breakevenPrice).toFixed(2);
  const marginPct = (
    ((signal.currentCashPrice - signal.breakevenPrice) / signal.breakevenPrice) * 100
  ).toFixed(1);
  // Scale bars: max = cash price * 1.25 so both are visible
  const barMax = signal.currentCashPrice * 1.25;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-gray-900">
            {fieldName}
            <span className="ml-2 text-sm font-normal text-gray-500">
              {cropLabel} · {acres} ac
            </span>
          </p>
        </div>
        <SignalBadge type={signal.signalType} />
      </div>

      {/* Price comparison */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className="w-20 text-xs text-gray-500 shrink-0">Cash price</span>
          <PriceBar value={signal.currentCashPrice} max={barMax} color="bg-blue-500" />
          <span className="w-16 text-right text-sm font-semibold tabular-nums text-gray-900">
            ${signal.currentCashPrice.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-20 text-xs text-gray-500 shrink-0">Breakeven</span>
          <PriceBar value={signal.breakevenPrice} max={barMax} color="bg-gray-400" />
          <span className="w-16 text-right text-sm font-semibold tabular-nums text-gray-500">
            ${signal.breakevenPrice.toFixed(2)}
          </span>
        </div>
        <p className="text-xs text-gray-500 pt-0.5">
          Margin{" "}
          <span className={`font-semibold ${Number(profitPerBushel) >= 0 ? "text-green-700" : "text-red-600"}`}>
            {Number(profitPerBushel) >= 0 ? "+" : ""}
            {marginPct}%
          </span>{" "}
          ·{" "}
          <span className={Number(profitPerBushel) >= 0 ? "text-green-700" : "text-red-600"}>
            {Number(profitPerBushel) >= 0 ? "+" : ""}${profitPerBushel}/bu
          </span>
        </p>
      </div>

      {/* Basis alert */}
      {signal.basisAlert && (
        <div className="flex items-center gap-1.5 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <span>⚠</span>
          <span>
            Basis alert:{" "}
            <span className="font-semibold">
              {signal.basisVs5YearAvg >= 0 ? "+" : ""}
              ${signal.basisVs5YearAvg.toFixed(2)}
            </span>{" "}
            vs 5-yr avg
          </span>
        </div>
      )}

      {/* Reason */}
      <p className="text-xs text-gray-500 leading-relaxed">{signal.reason}</p>
    </div>
  );
}
