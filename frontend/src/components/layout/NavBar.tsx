"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/",          label: "Overview"  },
  { href: "/farm",      label: "Farm"      },
  { href: "/breakeven", label: "Breakeven" },
];

export default function NavBar() {
  const pathname = usePathname();
  return (
    <nav className="border-b border-gray-200 bg-gray-50 px-6 py-3 flex items-center gap-6">
      <Link href="/" className="text-sm font-semibold text-gray-900 mr-2 hover:text-gray-700 transition-colors">
        Smart Farm
      </Link>
      {LINKS.map(({ href, label }) => {
        const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`text-sm transition-colors ${
              isActive
                ? "text-blue-600 font-medium"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
