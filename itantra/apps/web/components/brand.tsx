"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { ThemeControl } from "@/components/chrome";

const NAV = [
  { href: "#how", label: "How it works" },
  { href: "#contrib", label: "Contributions" },
  { href: "#languages", label: "Languages" },
  { href: "/lab/size/", label: "Lab" },
];

export function BrandNav() {
  return (
    <header className="sticky top-0 z-40 border-b brand-border backdrop-blur" style={{ background: "hsl(var(--brand-bg) / 0.82)" }}>
      <nav className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-3">
        <Link href="/" className="brand-hand text-[24px] font-bold">
          iTantra
        </Link>
        <ul className="ml-4 hidden gap-5 text-[15px] sm:flex brand-muted">
          {NAV.map((item) => (
            <li key={item.href}>
              {item.href.startsWith("#") ? (
                <a href={item.href} className="hover:text-[hsl(var(--brand-primary))]">
                  {item.label}
                </a>
              ) : (
                <Link href={item.href} className="hover:text-[hsl(var(--brand-primary))]">
                  {item.label}
                </Link>
              )}
            </li>
          ))}
        </ul>
        <div className="ml-auto flex items-center gap-2">
          <ThemeControl />
          <Link
            href="/talk/"
            className="rounded-full px-4 py-2 text-[14px] font-semibold active:translate-y-0.5"
            style={{ background: "hsl(var(--brand-primary))", color: "hsl(var(--brand-primary-fg))" }}
          >
            Open demo
          </Link>
        </div>
      </nav>
    </header>
  );
}

export function Kicker({ children }: { children: ReactNode }) {
  return <p className="brand-hand text-[22px] text-[hsl(var(--brand-accent))]">{children}</p>;
}

export function SectionHeading({ id, kicker, title, sub }: { id?: string; kicker: string; title: ReactNode; sub?: string }) {
  return (
    <div id={id} className="mx-auto max-w-2xl text-center">
      <Kicker>{kicker}</Kicker>
      <h2 className="brand-display mt-1 text-[clamp(1.6rem,3.5vw,2.4rem)] font-bold leading-tight">{title}</h2>
      {sub ? <p className="mt-3 text-[17px] brand-muted">{sub}</p> : null}
    </div>
  );
}

export function FeatureCard({ icon, title, children }: { icon: string; title: string; children: ReactNode }) {
  return (
    <div className="brand-card p-5">
      <div className="mb-2 text-[26px]" aria-hidden>
        {icon}
      </div>
      <h3 className="brand-display text-[19px] font-bold">{title}</h3>
      <div className="mt-2 text-[15px] brand-muted">{children}</div>
    </div>
  );
}

export function Pill({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "primary" | "accent" }) {
  const map = {
    muted: { background: "hsl(var(--brand-muted))", color: "hsl(var(--brand-muted-fg))" },
    primary: { background: "hsl(var(--brand-primary) / 0.15)", color: "hsl(var(--brand-primary))" },
    accent: { background: "hsl(var(--brand-accent) / 0.15)", color: "hsl(var(--brand-accent))" },
  }[tone];
  return (
    <span className="rounded-full px-3 py-1 text-[13px] font-semibold" style={map}>
      {children}
    </span>
  );
}

export function BrandFooter() {
  return (
    <footer className="border-t brand-border py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 text-[14px] brand-muted sm:flex-row sm:items-center">
        <span className="brand-hand text-[20px] text-[hsl(var(--brand-fg))]">iTantra</span>
        <span>SIH26173 · offline device-to-device voice link for Indian languages</span>
        <span className="sm:ml-auto flex gap-4">
          <Link href="/references/" className="hover:text-[hsl(var(--brand-primary))]">
            References
          </Link>
          <Link href="/limitations/" className="hover:text-[hsl(var(--brand-primary))]">
            Limitations
          </Link>
          <Link href="/licenses/" className="hover:text-[hsl(var(--brand-primary))]">
            Licences
          </Link>
          <Link href="/lab/size/" className="hover:text-[hsl(var(--brand-primary))]">
            Lab
          </Link>
        </span>
      </div>
    </footer>
  );
}
