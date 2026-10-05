"use client";

import Link from "next/link";

import { Button, Card, ScreenHeader, Toggle } from "@/components/ui";
import { useAppStore } from "@/lib/store";

export default function SettingsPage() {
  const activeLang = useAppStore((s) => s.activeLang);
  const staleLimitSeconds = useAppStore((s) => s.staleLimitSeconds);
  const confirmBeforeSend = useAppStore((s) => s.confirmBeforeSend);
  const setConfirmBeforeSend = useAppStore((s) => s.setConfirmBeforeSend);
  const engine = useAppStore((s) => s.engine);
  const stop = useAppStore((s) => s.bridge?.stop);

  return (
    <div>
      <ScreenHeader title="Settings and About" subtitle="Plain controls. Nothing here phones home." />

      <Card className="p-4">
        <div className="flex items-center justify-between gap-3 border-b-[1.5px] border-[var(--rule)] pb-3">
          <div>
            <p className="font-semibold">Confirm before send</p>
            <p className="text-[13px] text-[var(--slate)]">Show the read-back and wait for you to accept.</p>
          </div>
          <Toggle checked={confirmBeforeSend} onChange={setConfirmBeforeSend} label="Confirm before send" />
        </div>
        <div className="flex items-center justify-between gap-3 border-b-[1.5px] border-[var(--rule)] py-3">
          <div>
            <p className="font-semibold">Stale speech limit</p>
            <p className="text-[13px] text-[var(--slate)]">Routine messages older than {staleLimitSeconds} s are shown, not spoken.</p>
          </div>
          <span className="tnum text-[15px] font-semibold">{staleLimitSeconds}s</span>
        </div>
        <div className="flex items-center justify-between gap-3 pt-3">
          <div>
            <p className="font-semibold">Active language</p>
            <p className="text-[13px] text-[var(--slate)]">Recognition and speech use this pack.</p>
          </div>
          <span className="text-[15px] font-semibold">{activeLang}</span>
        </div>
      </Card>

      <h2 className="mt-5 mb-2 text-[17px] font-bold">Engine</h2>
      <Card className="p-4 text-[14px]">
        <p>
          Status: <span className="font-semibold">{engine?.running ? "running" : "stopped"}</span>
        </p>
        <p className="text-[var(--slate)]">Device name: {engine?.deviceName ?? "—"}</p>
        <Button className="mt-3" variant="danger" onClick={() => void stop?.()}>
          Stop engine
        </Button>
      </Card>

      <h2 className="mt-5 mb-2 text-[17px] font-bold">Legal</h2>
      <Card className="flex flex-col gap-2 p-4 text-[15px]">
        <Link href="/lab/size/" className="font-semibold text-[var(--ultramarine)]">
          Benchmark dashboard
        </Link>
        <Link href="/references/" className="font-semibold text-[var(--ultramarine)]">
          References and research
        </Link>
        <a href="/licenses/" className="font-semibold text-[var(--ultramarine)]">
          Generated licences
        </a>
        <Link href="/limitations/" className="font-semibold text-[var(--ultramarine)]">
          Known limitations
        </Link>
      </Card>
    </div>
  );
}
