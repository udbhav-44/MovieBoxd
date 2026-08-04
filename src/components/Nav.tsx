"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "For You" },
  { href: "/archive", label: "Archive" },
  { href: "/add", label: "Add" },
  { href: "/taste", label: "Taste" },
  { href: "/settings", label: "Settings" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="relative z-10 border-b border-[var(--line)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-8">
        <Link href="/" className="group inline-flex flex-col">
          <span className="display text-3xl text-[var(--ink)] transition-colors group-hover:text-[var(--accent)] sm:text-4xl">
            MovieBoxd
          </span>
          <span className="mt-1.5 text-[0.7rem] uppercase tracking-[0.18em] text-[var(--ink-soft)]">
            Personal recommender
          </span>
        </Link>

        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[0.95rem] tracking-[0.02em] text-[var(--ink-soft)]">
          {LINKS.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                data-active={active}
                className="nav-link pb-0.5 transition-colors hover:text-[var(--ink)]"
                style={active ? { color: "var(--ink)" } : undefined}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
