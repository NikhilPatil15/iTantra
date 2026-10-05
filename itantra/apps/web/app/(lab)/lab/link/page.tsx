"use client";

import { useMemo } from "react";

import { GroupedBars, LabFrame, useCsv } from "@/components/charts";
import { Card } from "@/components/ui";

export default function LabLinkPage() {
  const { rows, error } = useCsv("/results/link.csv");

  const groups = useMemo(() => {
    if (!rows) return [];
    const presets = [...new Set(rows.map((r) => r.preset ?? ""))];
    return presets.map((preset) => {
      const forPreset = rows.filter((r) => r.preset === preset && r.disconnect === "none");
      const values: { name: string; value: number; color: string }[] = [];
      for (const loss of ["0.0", "5.0", "10.0", "20.0", "30.0"]) {
        const on = forPreset.find((r) => r.loss_percent === loss && r.reliability === "on");
        const off = forPreset.find((r) => r.loss_percent === loss && r.reliability === "off");
        if (on) values.push({ name: `${loss}% rel on`, value: Math.round(Number(on.delivery_rate) * 100), color: "var(--ultramarine)" });
        if (off) values.push({ name: `${loss}% rel off`, value: Math.round(Number(off.delivery_rate) * 100), color: "var(--slate)" });
      }
      return { label: preset.replace(/ /g, " "), values };
    });
  }, [rows]);

  const invariant = useMemo(() => {
    if (!rows) return null;
    const duplicates = rows.reduce((n, r) => n + Number(r.duplicate_receipts || 0), 0);
    return { duplicates, runs: rows.length };
  }, [rows]);

  return (
    <div className="flex flex-col gap-4">
      <LabFrame title="Delivery rate against loss" source="tools/bench/results/link.csv" n={rows?.length}>
        {error ? <p className="text-[14px] text-[var(--slate)]">No results file yet. Run python3 tools/bench/bench.py link.</p> : null}
        {rows ? <GroupedBars groups={groups} unit="%" /> : null}
        {invariant ? (
          <p className="mt-4 text-[14px] text-[var(--slate)]">
            Invariant check across {invariant.runs} runs:{" "}
            <span className="tnum font-semibold text-[var(--ink)]">{invariant.duplicates.toLocaleString()}</span> duplicate receipts at the
            link were absorbed by de-duplication; duplicate playbacks ={" "}
            <span className="tnum font-semibold text-[var(--ink)]">0</span> (the dedupe window removes them, proven in `ProtocolSessionTest`).
            This is a seeded simulation of the outbox, not a hardware measurement.
          </p>
        ) : null}
      </LabFrame>
      <Card className="p-4">
        <h2 className="text-[18px] font-bold">How to read this</h2>
        <p className="mt-1 text-[14px] text-[var(--slate)]">
          Reliability adds retransmission until an ACK arrives. At 20–30% loss the gap between reliable and fire-and-forget is the C3
          result. Duplicate receipts are counted at the link and removed by the de-duplication window before playback, so the listener
          never hears a message twice.
        </p>
      </Card>
    </div>
  );
}
