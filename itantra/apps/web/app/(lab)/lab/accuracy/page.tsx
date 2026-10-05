"use client";

import { LabFrame, useCsv } from "@/components/charts";
import { Card } from "@/components/ui";

export default function LabAccuracyPage() {
  const { rows, error } = useCsv("/results/wer.csv");
  return (
    <div className="flex flex-col gap-4">
      <LabFrame title="Word and character error rate" source="tools/bench/results/wer.csv" n={rows?.length}>
        {error || !rows || rows.length === 0 ? (
          <p className="text-[14px] text-[var(--slate)]">
            No accuracy results yet. This needs real ASR hypotheses (`bench wer --hypotheses file.jsonl`). Numbers are never invented.
          </p>
        ) : (
          <table className="w-full text-left text-[14px]">
            <thead>
              <tr className="border-b-[1.5px] border-[var(--rule)]">
                <th className="py-1">Language</th>
                <th className="py-1">WER</th>
                <th className="py-1">Sentences</th>
                <th className="py-1">Reference words</th>
              </tr>
            </thead>
            <tbody className="tnum">
              {rows.map((r) => (
                <tr key={r.lang} className="border-b border-[var(--rule)]">
                  <td className="py-1">{r.lang}</td>
                  <td className="py-1">{Number(r.wer).toFixed(3)}</td>
                  <td className="py-1">{r.sentences}</td>
                  <td className="py-1">{r.ref_words}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </LabFrame>
      <Card className="p-4">
        <h2 className="text-[18px] font-bold">Noise conditions</h2>
        <p className="mt-1 text-[14px] text-[var(--slate)]">
          SNR curves require a licensed noise corpus and clean audio (Q8). Synthetic noise will be labelled as synthetic when it exists.
        </p>
      </Card>
    </div>
  );
}
