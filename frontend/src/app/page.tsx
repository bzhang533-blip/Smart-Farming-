import Link from "next/link";

const FEATURES = [
  {
    href: "/dashboard",
    icon: "📊",
    title: "Decision Cockpit",
    description:
      "Per-field sell, hold, or watch signals based on your real local cash price vs. your actual breakeven — not futures.",
    cta: "View Dashboard",
  },
  {
    href: "/farm",
    icon: "🌾",
    title: "Your Farm Profile",
    description:
      "Enter your costs once and reuse them each season. Breakeven price updates automatically as you refine your inputs.",
    cta: "Set Up Farm",
  },
  {
    href: "/market",
    icon: "📈",
    title: "Market Data",
    description:
      "Today's local elevator cash prices, CME futures reference, and 6-month basis history so you know if the basis is strengthening.",
    cta: "Check Prices",
  },
];

export default function OverviewPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16 flex flex-col gap-16">

      {/* Hero */}
      <section className="flex flex-col gap-6">
        <p className="text-sm font-medium text-blue-600 tracking-wide uppercase">
          Corn Belt · Iowa · Illinois · Indiana
        </p>
        <h1 className="text-4xl font-bold text-gray-900 leading-tight max-w-xl">
          Know exactly when to sell.
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl leading-relaxed">
          Smart Farm turns your cost data and local cash prices into clear
          sell / hold / watch signals — so you stop guessing and start deciding.
        </p>
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            Open Dashboard →
          </Link>
          <Link
            href="/farm"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Set up your farm first
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="flex flex-col gap-6">
        <h2 className="text-xl font-semibold text-gray-900">How it works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {FEATURES.map(({ href, icon, title, description, cta }) => (
            <div
              key={href}
              className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col gap-4"
            >
              <span className="text-3xl">{icon}</span>
              <div className="flex flex-col gap-1.5">
                <h3 className="font-semibold text-gray-900">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
              </div>
              <Link
                href={href}
                className="mt-auto text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                {cta} →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Why it matters */}
      <section className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Why it matters</h2>
        <blockquote className="border-l-4 border-blue-600 pl-5">
          <p className="text-gray-700 leading-relaxed">
            The difference between a profitable season and a loss often comes down to one
            decision: <strong>when to sell.</strong> Most tools show you the futures price.
            Smart Farm shows you whether your local elevator&apos;s cash price clears your
            actual breakeven — field by field, today.
          </p>
        </blockquote>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          {[
            { label: "Breakeven formula", value: "Total cost ÷ APH yield" },
            { label: "Basis definition",  value: "Cash price − futures" },
            { label: "MVP coverage",      value: "Corn & soybean · IA / IL / IN" },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col gap-0.5">
              <span className="text-xs text-gray-400 uppercase tracking-wide">{label}</span>
              <span className="font-medium text-gray-700">{value}</span>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
