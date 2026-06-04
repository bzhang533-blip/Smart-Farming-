import type { SignalType } from "@/types";

const CONFIG: Record<SignalType, { label: string; className: string }> = {
  sell:  { label: "SELL",  className: "bg-green-100 text-green-800 ring-green-200" },
  hold:  { label: "HOLD",  className: "bg-slate-100 text-slate-700 ring-slate-200" },
  watch: { label: "WATCH", className: "bg-amber-100 text-amber-800 ring-amber-200" },
};

export default function SignalBadge({ type }: { type: SignalType }) {
  const { label, className } = CONFIG[type];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${className}`}
    >
      {label}
    </span>
  );
}
