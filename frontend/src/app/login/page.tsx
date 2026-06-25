"use client";

import { SignInButton, SignUpButton } from "@clerk/nextjs";

const FEATURES = [
  {
    stat: "5 inputs",
    label: "Per-acre P&L",
    desc: "Yield, cash price, and costs — pre-filled with regional defaults.",
  },
  {
    stat: "1 number",
    label: "Breakeven price",
    desc: "What you must sell at to cover every dollar of cost.",
  },
  {
    stat: "Live grid",
    label: "Price × Yield",
    desc: "Drag price and yield to watch your margin move in real time.",
  },
];

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-400 mb-4">
          Smart Farm · Corn &amp; Soybeans · Corn Belt
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold text-stone-900 leading-tight max-w-lg">
          What do I need to sell at to make money?
        </h1>
        <p className="mt-5 text-base text-stone-500 leading-relaxed max-w-md">
          A simple breakeven calculator for US Midwest grain farmers. Enter a
          few numbers — instantly see your per-acre margin and the price you
          need to clear, no spreadsheet required.
        </p>

        {/* Feature cards */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
          {FEATURES.map(({ stat, label, desc }) => (
            <div
              key={label}
              className="rounded-2xl border border-stone-200 bg-white p-5 text-left shadow-sm"
            >
              <p className="text-2xl font-bold tabular-nums text-amber-500 leading-none">
                {stat}
              </p>
              <p className="mt-1.5 text-sm font-semibold text-stone-900">
                {label}
              </p>
              <p className="mt-1 text-xs text-stone-400 leading-relaxed">
                {desc}
              </p>
            </div>
          ))}
        </div>

        {/* Auth buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center gap-3">
          <SignInButton mode="modal">
            <button className="w-full sm:w-auto rounded-lg bg-amber-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 transition-colors shadow-sm">
              Sign in
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="w-full sm:w-auto rounded-lg border border-stone-200 bg-white px-6 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50 transition-colors shadow-sm">
              Create free account
            </button>
          </SignUpButton>
        </div>

        <p className="mt-4 text-xs text-stone-400">
          Free · No credit card · Breakeven = total cost ÷ yield, vs. your local cash price
        </p>
      </div>

      {/* Footer */}
      <footer className="border-t border-stone-100 py-4 text-center text-xs text-stone-300">
        Smart Farm · Corn Belt · v1
      </footer>
    </div>
  );
}
