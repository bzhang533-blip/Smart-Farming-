import type { FuturesPrice } from "@/types";

interface Props {
  futures: FuturesPrice;
  cropLabel: string;
}

export default function FuturesCard({ futures, cropLabel }: Props) {
  const updatedAt = new Date(futures.updatedAt).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-500">
            {cropLabel} Futures · {futures.contract}
          </p>
          <p className="mt-1 text-3xl font-semibold tabular-nums text-gray-900">
            ${futures.price.toFixed(2)}
            <span className="ml-1.5 text-base font-normal text-gray-400">/ bu</span>
          </p>
          <p className="mt-1 text-xs text-gray-400">Updated {updatedAt}</p>
        </div>
        <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
          CME
        </span>
      </div>

      <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2.5 text-xs text-amber-800">
        <span className="shrink-0 mt-0.5">⚠</span>
        <span>
          Reference only — use your local cash price for breakeven calculations, not futures.
        </span>
      </div>
    </div>
  );
}
