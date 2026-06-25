import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gray-50">
      <div className="mb-8 text-center max-w-sm">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-400 mb-3">
          Smart Farm
        </p>
        <h1 className="text-3xl font-bold text-stone-900 leading-tight">
          Know your breakeven.
        </h1>
        <p className="mt-3 text-sm text-stone-500 leading-relaxed">
          Enter a few numbers. Instantly see what you need to sell at — no spreadsheet required.
        </p>
      </div>
      <SignIn routing="hash" />
    </div>
  );
}
