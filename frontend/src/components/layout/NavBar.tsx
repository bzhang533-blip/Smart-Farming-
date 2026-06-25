"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";

const LINKS = [
  { href: "/",          label: "Overview"  },
  { href: "/farm",      label: "Farm"      },
  { href: "/breakeven", label: "Breakeven" },
];

export default function NavBar() {
  const pathname = usePathname();

  // Login page has its own full-page layout — no NavBar needed.
  if (pathname === "/login") return null;

  return (
    <nav className="border-b border-stone-200 bg-white px-6 py-3 flex items-center gap-6">
      <Link
        href="/"
        className="text-sm font-bold text-stone-900 mr-2 hover:text-amber-600 transition-colors"
      >
        Smart Farm
      </Link>
      {LINKS.map(({ href, label }) => {
        const isActive =
          href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`text-sm transition-colors ${
              isActive
                ? "text-amber-600 font-semibold"
                : "text-stone-500 hover:text-stone-900"
            }`}
          >
            {label}
          </Link>
        );
      })}
      <div className="ml-auto">
        <UserButton />
      </div>
    </nav>
  );
}
