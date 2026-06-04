import type { Field } from "@/types";
import { CROP_CONFIG } from "@/config/crops";

export default function FieldCard({ field }: { field: Field }) {
  const crop = CROP_CONFIG[field.crop];
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold text-gray-900">{field.name}</span>
        <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-200">
          {crop.label}
        </span>
      </div>
      <dl className="grid grid-cols-3 gap-2 text-sm">
        <div>
          <dt className="text-xs text-gray-400">Acres</dt>
          <dd className="font-semibold tabular-nums text-gray-900">{field.acres.toLocaleString()}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-400">APH</dt>
          <dd className="font-semibold tabular-nums text-gray-900">
            {field.aph} <span className="text-xs font-normal text-gray-400">{crop.unit}</span>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-gray-400">ZIP</dt>
          <dd className="font-semibold tabular-nums text-gray-900">{field.zip}</dd>
        </div>
      </dl>
    </div>
  );
}
