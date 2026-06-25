"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";

const LINKS = [
  { href: "/farm",      label: "Farm"      },
  { href: "/breakeven", label: "Breakeven" },
];

export default function NavBar() {
  const pathname = usePathname();
  const { user } = useUser();

  if (pathname === "/login") return null;

  return (
    <nav className="border-b border-stone-200 bg-white px-6 py-3 flex items-center gap-6">
      <Link
        href="/farm"
        className="text-sm font-bold text-stone-900 mr-2 hover:text-amber-600 transition-colors"
      >
        Smart Farm
      </Link>
      {LINKS.map(({ href, label }) => {
        const isActive = pathname.startsWith(href);
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
      <div className="ml-auto flex items-center gap-3">
        {user && (
          <p className="text-sm text-stone-500 hidden sm:block">
            Welcome,{" "}
            <span className="font-semibold text-stone-700">
              {user.primaryEmailAddress?.emailAddress ?? user.firstName}
            </span>
          </p>
        )}
        <UserButton />
      </div>
    </nav>
  );
}
