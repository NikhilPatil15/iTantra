"use client";

import { useEffect, useRef } from "react";

import { PackCard } from "@/components/tools";
import { ScreenHeader } from "@/components/ui";
import { useAppStore } from "@/lib/store";

export default function PacksPage() {
  const packs = useAppStore((s) => s.packs);
  const packProgress = useAppStore((s) => s.packProgress);
  const installPack = useAppStore((s) => s.installPack);
  const removePack = useAppStore((s) => s.removePack);
  const runSelfTest = useAppStore((s) => s.runSelfTest);
  const lastSelfTest = useAppStore((s) => s.lastSelfTest);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const pendingLang = useRef<string | null>(null);

  useEffect(() => {
    void useAppStore.getState().bootstrap();
    void useAppStore.getState().refreshPacks();
  }, []);

  return (
    <div>
      <ScreenHeader
        title="Packs"
        subtitle="One pack per language. Adding a language never needs an app update."
        right={<span className="text-[13px] text-[var(--slate)]">{packs.length} languages</span>}
      />
      <input
        ref={fileInput}
        type="file"
        accept=".pack,.zip,application/octet-stream"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void installPack(file.name);
          e.target.value = "";
        }}
      />
      <div className="flex flex-col gap-3">
        {packs.map((pack) => (
          <PackCard
            key={pack.packId}
            pack={pack}
            progress={packProgress[pack.packId]}
            onInstall={() => {
              pendingLang.current = pack.lang;
              fileInput.current?.click();
            }}
            onRemove={() => void removePack(pack.packId)}
            onSelfTest={() => void runSelfTest(pack.lang)}
          />
        ))}
      </div>
      {lastSelfTest ? (
        <p className="mt-4 text-[13px] text-[var(--slate)]">
          Last self-test: {lastSelfTest.lang} · WER <span className="tnum">{lastSelfTest.wer.toFixed(2)}</span> · RTF{" "}
          <span className="tnum">{lastSelfTest.rtf.toFixed(2)}</span> · <span className="italic">sample data</span>
        </p>
      ) : null}
    </div>
  );
}
