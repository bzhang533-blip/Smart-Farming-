import Link from "next/link";

const FEATURES = [
  {
    href: "/farm",
    icon: "🌾",
    title: "Enter Your Farm",
    description:
      "Yield, the cash price you can get locally, and your costs — pre-filled with regional defaults, so you edit only what's different. Reuse it each season.",
    cta: "Set Up Farm",
  },
  {
    href: "/breakeven",
    icon: "📐",
    title: "See Your Breakeven",
    description:
      "Per-acre P&L, the price you must sell at to break even, and a price × yield heatmap you can drag to watch your margin move.",
    cta: "Run the Numbers",
  },
];

export default function OverviewPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16 flex flex-col gap-16">

      {/* Hero */}
      <section className="flex flex-col gap-6">
        <p className="text-sm font-medium text-blue-600 tracking-wide uppercase">
          Corn Belt · Corn &amp; Soybeans
        </p>
        <h1 className="text-4xl font-bold text-gray-900 leading-tight max-w-xl">
          What do I need to sell at to make money?
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl leading-relaxed">
          Smart Farm is a simple profit &amp; breakeven calculator. Enter a few numbers
          and instantly see your per-acre margin and the price you need to clear — no
          clunky spreadsheet required.
        </p>
        <div className="flex items-center gap-4">
          <Link
            href="/farm"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            Start with your farm →
          </Link>
          <Link
            href="/breakeven"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Jump to breakeven
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="flex flex-col gap-6">
        <h2 className="text-xl font-semibold text-gray-900">How it works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            The breakeven price is the whole game: <strong>total cost per acre ÷ your
            yield.</strong> Compare it against the cash price your local elevator is
            actually paying — not a futures quote — and you know in one number whether
            this crop is in the black.
          </p>
        </blockquote>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          {[
            { label: "Breakeven formula", value: "Total cost ÷ yield" },
            { label: "Compared against", value: "Your local cash price" },
            { label: "Coverage",         value: "Corn & soybeans" },
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
