import type { CashPricesResponse } from "@/types";

export default function ElevatorTable({ response }: { response: CashPricesResponse }) {
  const updatedAt = new Date(response.updatedAt).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const sorted = [...response.prices].sort((a, b) => b.cashPrice - a.cashPrice);

  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
              <th className="px-5 py-3 text-left font-medium">Elevator</th>
              <th className="px-5 py-3 text-left font-medium">ZIP</th>
              <th className="px-5 py-3 text-right font-medium">Cash Price</th>
              <th className="px-5 py-3 text-right font-medium">Basis</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map((e, i) => (
              <tr key={e.elevatorId} className={i === 0 ? "bg-blue-50" : "hover:bg-gray-50"}>
                <td className="px-5 py-3 font-medium text-gray-900">{e.elevatorName}</td>
                <td className="px-5 py-3 text-gray-500">{e.zip}</td>
                <td className="px-5 py-3 text-right tabular-nums font-semibold text-gray-900">
                  ${e.cashPrice.toFixed(2)}
                </td>
                <td className={`px-5 py-3 text-right tabular-nums font-medium ${
                  e.basis >= 0 ? "text-green-700" : "text-amber-700"
                }`}>
                  {e.basis >= 0 ? "+" : ""}${e.basis.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 px-1">
        Today&apos;s prices · Updated {updatedAt} · Best price highlighted
      </p>
    </div>
  );
}
