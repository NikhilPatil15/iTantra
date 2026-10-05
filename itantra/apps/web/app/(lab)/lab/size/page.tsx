"use client";

import { useMemo } from "react";

import { GroupedBars, LabFrame, useCsv } from "@/components/charts";
import { Card } from "@/components/ui";

export default function LabSizePage() {
  const { rows, error } = useCsv("/results/size.csv");

  const groups = useMemo(() => {
    if (!rows) return [];
    const byLang = new Map<string, { utf8: number; coded: number; deflate: number; dict: number; n: number }>();
    for (const row of rows) {
      const lang = row.lang ?? "?";
      const entry = byLang.get(lang) ?? { utf8: 0, coded: 0, deflate: 0, dict: 0, n: 0 };
      entry.utf8 += Number(row.utf8_bytes);
      entry.coded += Number(row.coded_bytes);
      entry.deflate += Number(row.deflate_bytes);
      entry.dict += Number(row.deflate_dict_bytes || 0);
      entry.n += 1;
      byLang.set(lang, entry);
    }
    return [...byLang.entries()].map(([lang, v]) => ({
      label: `${lang} (n=${v.n})`,
      values: [
        { name: "UTF-8", value: Math.round(v.utf8 / v.n), color: "var(--slate)" },
        { name: "script-aware", value: Math.round(v.coded / v.n), color: "var(--ultramarine)" },
        { name: "deflate", value: Math.round(v.deflate / v.n), color: "var(--amber)" },
        { name: "deflate + dict", value: Math.round(v.dict / v.n), color: "var(--lichen)" },
      ],
    }));
  }, [rows]);

  const totals = useMemo(() => {
    if (!rows) return null;
    const sum = (key: string) => rows.reduce((n, r) => n + Number(r[key] || 0), 0);
    return { utf8: sum("utf8_bytes"), coded: sum("coded_bytes"), frame: sum("frame_bytes") };
  }, [rows]);

  return (
    <div className="flex flex-col gap-4">
      <LabFrame title="Bytes per sentence" source="tools/bench/results/size.csv" n={rows?.length} sample>
        {error ? <p className="text-[14px] text-[var(--slate)]">No results file yet. Run python3 tools/bench/bench.py size.</p> : null}
        {rows && rows.length > 0 ? (
          <>
            <GroupedBars groups={groups} />
            {totals ? (
              <p className="mt-4 text-[14px] text-[var(--slate)]">
                Totals: script-aware coding <span className="tnum font-semibold text-[var(--ink)]">{totals.coded} B</span> vs UTF-8{" "}
                <span className="tnum">{totals.utf8} B</span>; frame adds 28 B per message. Encoding-only comparison, not including any audio
                codec. <span className="italic">sample data</span> until a licensed corpus is used.
              </p>
            ) : null}
          </>
        ) : null}
      </LabFrame>

      <Card className="p-4">
        <h2 className="text-[18px] font-bold">Audio baseline comparison</h2>
        <p className="mt-1 text-[14px] text-[var(--slate)]">
          A text frame is tens of bytes; the same speech as Codec2 700C or Opus is thousands. This chart is intentionally not shown with
          invented audio sizes. It will render once a measured audio baseline file exists in results/.
        </p>
      </Card>
    </div>
  );
}
