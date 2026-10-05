"use client";

import { useT } from "@/lib/i18n";
import { bytes } from "@/lib/format";
import type { AlertEvent, EmulatorConfig, PackInfo } from "@itantra/bridge";
import { Button, Card, Chip, Toggle } from "./ui";

export function AlertTakeover({ alert, onAcknowledge, fallbackName }: { alert: AlertEvent; onAcknowledge: () => void; fallbackName?: string }) {
  const t = useT();
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--beacon)] p-6 text-center text-white" role="alertdialog" aria-modal="true">
      <p className="text-[20px] font-semibold">
        {t("alert.from")} {alert.peerName || fallbackName || alert.peerId}
      </p>
      <p lang={alert.lang} className="my-6 text-[34px] font-bold leading-[1.5]">
        {alert.text}
      </p>
      <p className="mb-6 text-[15px] opacity-90">This alert repeats until you acknowledge it.</p>
      <button
        type="button"
        onClick={onAcknowledge}
        className="min-h-[72px] min-w-[240px] rounded-2xl bg-white px-6 text-[22px] font-bold text-[var(--beacon)]"
      >
        {t("alert.iveSeenThis")}
      </button>
    </div>
  );
}

export function PackCard({
  pack,
  progress,
  onInstall,
  onRemove,
  onSelfTest,
}: {
  pack: PackInfo;
  progress?: number;
  onInstall: () => void;
  onRemove: () => void;
  onSelfTest: () => void;
}) {
  const t = useT();
  const tone = pack.status === "verified" ? "lichen" : pack.status === "experimental" ? "amber" : "neutral";
  const label = pack.installed ? (pack.status === "verified" ? t("pack.verified") : t("pack.experimental")) : t("pack.notInstalled");
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[20px] font-bold" lang={pack.lang}>
            {pack.displayName}
          </h3>
          <p className="text-[13px] text-[var(--slate)]">
            {pack.lang} · {bytes(pack.sizeBytes)} · v{pack.version}
          </p>
        </div>
        <Chip tone={tone}>{label}</Chip>
      </div>
      {pack.licenseClass === "non-commercial" ? (
        <p className="mt-3 rounded-lg bg-[var(--beacon-tint)] p-2 text-[14px] text-[var(--beacon)]">{t("pack.nonCommercial")}</p>
      ) : null}
      {progress !== undefined && progress < 1 ? (
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[var(--chalk)]">
          <div className="h-full bg-[var(--ultramarine)]" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {!pack.installed ? (
          <Button variant="primary" onClick={onInstall}>
            {t("pack.installFromFile")}
          </Button>
        ) : (
          <>
            <Button onClick={onSelfTest}>{t("pack.selfTest")}</Button>
            <Button variant="danger" onClick={onRemove}>
              {t("pack.remove")}
            </Button>
          </>
        )}
      </div>
      {pack.selfTest?.measuredWer != null ? (
        <p className="mt-2 text-[13px] text-[var(--slate)]">
          Self-test WER <span className="tnum">{pack.selfTest.measuredWer.toFixed(2)}</span> (limit {pack.selfTest.maxWer.toFixed(2)}) · <span className="italic">sample data</span>
        </p>
      ) : null}
    </Card>
  );
}

const PRESETS: { name: string; config: EmulatorConfig }[] = [
  { name: "Unthrottled", config: { preset: "Unthrottled", rateBps: null, lossPercent: 0, jitterMs: 0, disconnectAfterMs: null, disconnectDurationMs: null } },
  { name: "1 kbps", config: { preset: "1 kbps", rateBps: 1000, lossPercent: 0, jitterMs: 20, disconnectAfterMs: null, disconnectDurationMs: null } },
  { name: "3 kbps", config: { preset: "3 kbps", rateBps: 3000, lossPercent: 0, jitterMs: 20, disconnectAfterMs: null, disconnectDurationMs: null } },
  { name: "10 kbps", config: { preset: "10 kbps", rateBps: 10000, lossPercent: 0, jitterMs: 15, disconnectAfterMs: null, disconnectDurationMs: null } },
  { name: "300 bps satellite-message-like", config: { preset: "300 bps satellite-message-like", rateBps: 300, lossPercent: 0, jitterMs: 0, disconnectAfterMs: null, disconnectDurationMs: null } },
  { name: "LoRa LongFast model", config: { preset: "LoRa LongFast model", rateBps: 1071, lossPercent: 5, jitterMs: 30, disconnectAfterMs: null, disconnectDurationMs: null } },
];

export function EmulatorPanel({
  current,
  onChange,
  onDrop,
}: {
  current: EmulatorConfig | null;
  onChange: (config: EmulatorConfig | null) => void;
  onDrop: () => void;
}) {
  const t = useT();
  const active = (name: string) => current?.preset === name;
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[17px] font-bold">Emulator</h3>
        {current ? <Chip tone="amber">active</Chip> : null}
      </div>
      <p className="mb-3 text-[13px] text-[var(--slate)]">A test tool. Every metric row records the emulator config in effect.</p>
      <div className="flex flex-col gap-2">
        {PRESETS.map((preset) => (
          <Button key={preset.name} variant={active(preset.name) ? "primary" : "ghost"} onClick={() => onChange(preset.config)}>
            {preset.name}
          </Button>
        ))}
        <Button variant="ghost" onClick={() => onChange(null)}>
          Off
        </Button>
        <Button variant="danger" onClick={onDrop}>
          {t("link.drop")}
        </Button>
      </div>
      {current ? (
        <div className="mt-3 text-[13px] text-[var(--slate)]">
          rate <span className="tnum">{current.rateBps ?? "unlimited"}</span> bps · loss{" "}
          <span className="tnum">{current.lossPercent}%</span> · jitter <span className="tnum">{current.jitterMs}</span> ms
        </div>
      ) : null}
    </Card>
  );
}
