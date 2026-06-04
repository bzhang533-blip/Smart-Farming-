import type { BasisHistoryResponse } from "@/types";

export default function BasisTable({ response }: { response: BasisHistoryResponse }) {
  const { series } = response;

  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
              <th className="px-5 py-3 text-left font-medium">Month</th>
              <th className="px-5 py-3 text-right font-medium">Basis</th>
              <th className="px-5 py-3 text-left font-medium pl-6">Trend</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {series.map((point, i) => {
              const prev = series[i - 1];
              const isLatest = i === series.length - 1;
              const strengthening = prev != null && point.basis > prev.basis;
              const weakening = prev != null && point.basis < prev.basis;

              const monthLabel = new Date(point.date).toLocaleString("en-US", {
                month: "short",
                year: "numeric",
                timeZone: "UTC",
              });

              return (
                <tr
                  key={point.date}
                  className={isLatest ? "bg-gray-50 font-semibold" : "hover:bg-gray-50"}
                >
                  <td className="px-5 py-3 text-gray-700">
                    {monthLabel}
                    {isLatest && (
                      <span className="ml-2 text-xs font-normal text-gray-400">latest</span>
                    )}
                  </td>
                  <td className={`px-5 py-3 text-right tabular-nums ${
                    point.basis >= 0 ? "text-green-700" : "text-amber-700"
                  }`}>
                    {point.basis >= 0 ? "+" : ""}${point.basis.toFixed(2)}
                  </td>
                  <td className="px-5 py-3 pl-6">
                    {prev == null ? (
                      <span className="text-gray-300">—</span>
                    ) : strengthening ? (
                      <span className="text-green-700 text-xs font-medium">↑ Strengthening</span>
                    ) : weakening ? (
                      <span className="text-amber-700 text-xs font-medium">↓ Weakening</span>
                    ) : (
                      <span className="text-gray-400 text-xs">→ Unchanged</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 px-1">
        Basis = cash − futures · Negative basis is normal in the corn belt · ZIP {response.zip}
      </p>
    </div>
  );
}
