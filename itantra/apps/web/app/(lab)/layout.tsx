import Link from "next/link";

const LAB_NAV = [
  { href: "/lab/size/", label: "Size" },
  { href: "/lab/accuracy/", label: "Accuracy" },
  { href: "/lab/latency/", label: "Latency" },
  { href: "/lab/link/", label: "Link" },
];

export default function LabLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[var(--chalk)]">
      <header className="border-b-[1.5px] border-[var(--rule)] bg-[var(--vellum)]">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-4 px-4 py-3">
          <Link href="/" className="text-[18px] font-bold">
            iTantra Lab
          </Link>
          <nav aria-label="Lab sections">
            <ul className="flex gap-2">
              {LAB_NAV.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="rounded-lg border-[1.5px] border-[var(--rule)] px-3 py-1.5 text-[14px] font-semibold text-[var(--ink)]">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <span className="ml-auto text-[13px] text-[var(--slate)]">Reads files from tools/bench/results</span>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-4">{children}</main>
    </div>
  );
}
