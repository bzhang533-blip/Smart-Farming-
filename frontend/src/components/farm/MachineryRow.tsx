import type { Machinery } from "@/types";

export default function MachineryRow({ item }: { item: Machinery }) {
  const annualDepreciationPerAcre =
    item.purchasePrice / item.estimatedUsefulLifeYears / item.annualAcresCovered;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-900">{item.model}</p>
          <p className="text-xs text-gray-400 capitalize">{item.type} · {item.purchaseYear}</p>
        </div>
        <span className="text-sm font-semibold tabular-nums text-gray-700">
          ${(item.purchasePrice / 1000).toFixed(0)}k
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs text-gray-400">Useful life</dt>
          <dd className="font-medium text-gray-900">{item.estimatedUsefulLifeYears} yr</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-400">Acres/yr</dt>
          <dd className="font-medium tabular-nums text-gray-900">
            {item.annualAcresCovered.toLocaleString()}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-gray-400">Depr./acre</dt>
          <dd className="font-medium tabular-nums text-gray-900">
            ${annualDepreciationPerAcre.toFixed(2)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-gray-400">Ref. value</dt>
          <dd className="font-medium tabular-nums text-gray-900">
            ${(item.referenceValueRange.low / 1000).toFixed(0)}k–
            ${(item.referenceValueRange.high / 1000).toFixed(0)}k
          </dd>
        </div>
      </dl>
    </div>
  );
}
