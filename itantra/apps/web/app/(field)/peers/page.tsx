"use client";

import { useEffect, useState } from "react";

import { Button, Card, Chip, ScreenHeader, Sheet } from "@/components/ui";
import { useAppStore } from "@/lib/store";
import { useT } from "@/lib/i18n";

export default function PeersPage() {
  const t = useT();
  const peers = useAppStore((s) => s.peers);
  const startDiscovery = useAppStore((s) => s.startDiscovery);
  const connect = useAppStore((s) => s.connect);
  const pair = useAppStore((s) => s.pair);
  const confirmPairing = useAppStore((s) => s.confirmPairing);
  const setActivePeer = useAppStore((s) => s.setActivePeer);
  const [sheet, setSheet] = useState<{ sessionId: string; sas?: string; peerRef: string } | null>(null);

  useEffect(() => {
    void useAppStore.getState().bootstrap();
    void startDiscovery();
  }, [startDiscovery]);

  return (
    <div>
      <ScreenHeader title="Peers" subtitle="Nearby and paired phones" right={<Button onClick={() => void startDiscovery()}>Scan</Button>} />
      <ul className="flex flex-col gap-3">
        {peers.map((peer) => (
          <li key={peer.peerId}>
            <Card className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="text-[19px] font-bold">{peer.displayName}</p>
                <p className="text-[13px] text-[var(--slate)]">
                  {peer.paired ? "Paired" : "Not paired"} · {peer.state}
                  {peer.rttMs !== null ? ` · ${Math.round(peer.rttMs)} ms` : ""}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Chip tone={peer.state === "connected" ? "lichen" : "neutral"}>{peer.state}</Chip>
                {!peer.paired ? (
                  <Button
                    variant="primary"
                    onClick={async () => {
                      const result = await pair(peer.peerId);
                      if (result) setSheet({ sessionId: result.sessionId, sas: result.sas, peerRef: peer.peerId });
                    }}
                  >
                    {t("peer.pair")}
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    onClick={() => {
                      setActivePeer(peer.peerId);
                      void connect(peer.peerId);
                    }}
                  >
                    {t("peer.connect")}
                  </Button>
                )}
              </div>
            </Card>
          </li>
        ))}
      </ul>

      <Sheet open={sheet !== null} onClose={() => setSheet(null)} title="Pair this phone">
        {sheet ? (
          <div className="text-center">
            <p className="text-[15px] text-[var(--slate)]">{t("peer.bothShow")}</p>
            <p className="tnum my-4 text-[48px] font-bold tracking-widest">{sheet.sas ?? "—"}</p>
            <div className="flex gap-2">
              <Button
                variant="primary"
                className="flex-1"
                onClick={async () => {
                  await confirmPairing(sheet.sessionId, true);
                  setSheet(null);
                }}
              >
                {t("peer.codesMatch")}
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={async () => {
                  await confirmPairing(sheet.sessionId, false);
                  setSheet(null);
                }}
              >
                {t("peer.codesDiffer")}
              </Button>
            </div>
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}
