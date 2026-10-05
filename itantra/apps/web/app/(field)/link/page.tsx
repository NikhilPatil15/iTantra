"use client";

import { useEffect, useState } from "react";

import { EmulatorPanel } from "@/components/tools";
import { Button, Card, Chip, ScreenHeader, StatTile } from "@/components/ui";
import { useAppStore } from "@/lib/store";
import { bytes } from "@/lib/format";
import type { EmulatorConfig } from "@itantra/bridge";

const TRANSPORTS = [
  { id: "bluetooth", label: "Bluetooth Classic" },
  { id: "wifiDirect", label: "Wi-Fi Direct" },
  { id: "loopback", label: "Loopback (test)" },
] as const;

export default function LinkPage() {
  const link = useAppStore((s) => s.link);
  const emulator = useAppStore((s) => s.emulator);
  const setEmulator = useAppStore((s) => s.setEmulator);
  const exportMetrics = useAppStore((s) => s.exportMetrics);
  const pushToast = useAppStore((s) => s.pushToast);
  const peers = useAppStore((s) => s.peers);
  const [metricsUri, setMetricsUri] = useState<string | null>(null);

  useEffect(() => {
    void useAppStore.getState().bootstrap();
  }, []);

  const connected = peers.filter((p) => p.state === "connected");

  return (
    <div>
      <ScreenHeader title="Link" subtitle="Transport, round-trip time and test tools" />

      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Round trip" value={link?.rttMs != null ? String(Math.round(link.rttMs)) : "—"} unit="ms" source="link events" />
        <StatTile label="Bytes sent" value={bytes(link?.bytesTx)} source="link events" />
        <StatTile label="Bytes received" value={bytes(link?.bytesRx)} source="link events" />
        <StatTile label="Connected peers" value={String(connected.length)} source="peer list" />
      </div>

      <h2 className="mt-5 mb-2 text-[17px] font-bold">Transports</h2>
      <ul className="flex flex-col gap-2">
        {TRANSPORTS.map((transport) => {
          const peer = peers.find((p) => p.transport === transport.id);
          return (
            <li key={transport.id}>
              <Card className="flex items-center justify-between p-3">
                <span className="text-[16px]">{transport.label}</span>
                <Chip tone={peer ? "lichen" : "neutral"}>{peer ? "in use" : "idle"}</Chip>
              </Card>
            </li>
          );
        })}
      </ul>

      <h2 className="mt-5 mb-2 text-[17px] font-bold">Demo and test tools</h2>
      <EmulatorPanel
        current={emulator}
        onChange={(config) => void setEmulator(config)}
        onDrop={() => {
          const config: EmulatorConfig = {
            preset: "Forced disconnect",
            rateBps: 300,
            lossPercent: 0,
            jitterMs: 0,
            disconnectAfterMs: 0,
            disconnectDurationMs: 10_000,
          };
          void setEmulator(config);
          pushToast("Link dropped for 10 seconds", "alert");
        }}
      />

      <h2 className="mt-5 mb-2 text-[17px] font-bold">Metrics</h2>
      <Button
        variant="primary"
        className="w-full"
        onClick={async () => {
          const uri = await exportMetrics();
          setMetricsUri(uri);
          if (uri?.startsWith("data:")) {
            const a = document.createElement("a");
            a.href = uri;
            a.download = "itantra-metrics.csv";
            a.click();
          }
        }}
      >
        Export metrics CSV
      </Button>
      {metricsUri ? <p className="mt-2 break-all text-[12px] text-[var(--slate)]">{metricsUri.slice(0, 120)}</p> : null}
    </div>
  );
}
