"use client";

import Link from "next/link";

import { BottomNav, DemoRibbon, ThemeControl, Toasts } from "@/components/chrome";
import { AlertTakeover } from "@/components/tools";
import { useAppStore } from "@/lib/store";

export default function FieldLayout({ children }: { children: React.ReactNode }) {
  const alert = useAppStore((s) => s.alert);
  const acknowledgeAlert = useAppStore((s) => s.acknowledgeAlert);
  const emulator = useAppStore((s) => s.emulator);

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-[var(--chalk)]">
      <DemoRibbon />
      {emulator ? (
        <div className="bg-[var(--amber)] px-4 py-1.5 text-center text-[13px] font-semibold text-[#3a2600]">
          Link emulator on: {emulator.preset}
        </div>
      ) : null}
      <header className="flex items-center justify-between border-b-[1.5px] border-[var(--rule)] px-4 py-2">
        <Link href="/" className="text-[15px] font-bold">
          iTantra
        </Link>
        <div className="flex items-center gap-2">
          <ThemeControl />
          <Link href="/settings/" className="rounded-lg border-[1.5px] border-[var(--rule)] px-2 py-1 text-[12px] font-semibold text-[var(--slate)]">
            Settings
          </Link>
        </div>
      </header>
      <main className="flex-1 p-4 pb-6">{children}</main>
      <BottomNav />
      <Toasts />
      {alert ? <AlertTakeover alert={alert} onAcknowledge={() => void acknowledgeAlert()} /> : null}
    </div>
  );
}
