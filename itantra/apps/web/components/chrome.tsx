"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAppStore } from "@/lib/store";
import { useT, type MessageKey } from "@/lib/i18n";

const NAV: { href: string; key: MessageKey }[] = [
  { href: "/talk/", key: "nav.talk" },
  { href: "/thread/", key: "nav.thread" },
  { href: "/alerts/", key: "nav.alerts" },
  { href: "/link/", key: "nav.link" },
  { href: "/packs/", key: "nav.packs" },
];

export function BottomNav() {
  const t = useT();
  const pathname = usePathname();
  return (
    <nav className="sticky bottom-0 z-30 border-t-[1.5px] border-[var(--rule)] bg-[var(--vellum)] pb-[env(safe-area-inset-bottom)]">
      <ul className="flex">
        {NAV.map((item) => {
          const active = pathname?.startsWith(item.href) ?? false;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`flex min-h-[56px] flex-col items-center justify-center text-[12px] font-semibold ${active ? "text-[var(--ultramarine)]" : "text-[var(--slate)]"}`}
                aria-current={active ? "page" : undefined}
              >
                <span aria-hidden className="text-[18px]">
                  {active ? "●" : "○"}
                </span>
                {t(item.key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function Toasts() {
  const toasts = useAppStore((s) => s.toasts);
  const dismiss = useAppStore((s) => s.dismissToast);
  if (toasts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-2 z-50 flex flex-col items-center gap-2 px-4">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          onClick={() => dismiss(toast.id)}
          className={`pointer-events-auto w-full max-w-md rounded-xl border-[1.5px] px-4 py-2 text-left text-[14px] font-semibold ${toast.tone === "alert" ? "border-[var(--beacon)] bg-[var(--beacon-tint)] text-[var(--beacon)]" : "border-[var(--rule)] bg-[var(--vellum)] text-[var(--ink)]"}`}
        >
          {toast.text}
        </button>
      ))}
    </div>
  );
}

export function ThemeControl() {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Theme">
      {(["day", "night", "auto"] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => setTheme(mode)}
          aria-pressed={theme === mode}
          className={`rounded-lg border-[1.5px] px-2 py-1 text-[12px] font-semibold ${theme === mode ? "border-[var(--ultramarine)] text-[var(--ultramarine)]" : "border-[var(--rule)] text-[var(--slate)]"}`}
        >
          {mode}
        </button>
      ))}
    </div>
  );
}

export function DemoRibbon() {
  const native = useAppStore((s) => s.native);
  if (native) return null;
  return (
    <div className="bg-[var(--ultramarine-tint)] px-4 py-1.5 text-center text-[12px] font-semibold text-[var(--ultramarine)]">
      Running in the browser with mock data · sample data
    </div>
  );
}
