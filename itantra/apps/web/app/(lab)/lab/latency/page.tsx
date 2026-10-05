"use client";

import { LabFrame, Waterfall, useCsv } from "@/components/charts";
import { Card } from "@/components/ui";

export default function LabLatencyPage() {
  const { rows, error } = useCsv("/results/latency.csv");
  const hasData = rows && rows.length > 0 && rows[0]?.stage;
  const stages = hasData
    ? rows.map((r) => ({ label: r.stage ?? "?", ms: Number(r.p50_ms || 0), color: "var(--ultramarine)" }))
    : [];
  return (
    <div className="flex flex-col gap-4">
      <LabFrame title="End-to-end latency" source="tools/bench/results/latency.csv" n={rows?.length}>
        {error || !hasData ? (
          <p className="text-[14px] text-[var(--slate)]">
            No latency results yet. These come from the on-device metrics export (T55), not a simulation. The pipeline is
            speech-end → ASR → accept → link write → link receive → TTS first audio → ACK.
          </p>
        ) : (
          <Waterfall stages={stages} />
        )}
      </LabFrame>
      <Card className="p-4">
        <h2 className="text-[18px] font-bold">Round trip vs end to end</h2>
        <p className="mt-1 text-[14px] text-[var(--slate)]">
          A one-device figure is labelled "round trip". A two-device figure uses the PING/PONG clock-offset estimate and is labelled
          "estimated end to end", with the symmetric-delay assumption stated.
        </p>
      </Card>
    </div>
  );
}
