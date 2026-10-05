"use client";

import { useEffect, useState } from "react";

import { parseCsv } from "@/lib/csv";
import { Card } from "./ui";

export { parseCsv } from "@/lib/csv";

export function useCsv(url: string): { rows: Record<string, string>[] | null; error: string | null } {
  const [rows, setRows] = useState<Record<string, string>[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.text();
      })
      .then((text) => {
        if (alive) setRows(parseCsv(text));
      })
      .catch((e) => {
        if (alive) setError(String(e));
      });
    return () => {
      alive = false;
    };
  }, [url]);
  return { rows, error };
}

export function LabFrame({ title, source, n, children, sample }: { title: string; source: string; n?: number; children: React.ReactNode; sample?: boolean }) {
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-bold">{title}</h2>
          <p className="text-[13px] text-[var(--slate)]">
            source: {source}
            {n !== undefined ? ` · n = ${n}` : ""}
          </p>
        </div>
        {sample ? <span className="rounded-md bg-[var(--amber)] px-2 py-0.5 text-[12px] font-semibold text-[#3a2600]">sample data</span> : null}
      </div>
      {children}
    </Card>
  );
}

export interface Group {
  label: string;
  values: { name: string; value: number; color: string }[];
}

export function GroupedBars({ groups, unit = "B" }: { groups: Group[]; unit?: string }) {
  const max = Math.max(1, ...groups.flatMap((g) => g.values.map((v) => v.value)));
  return (
    <div className="flex flex-col gap-3">
      {groups.map((group) => (
        <div key={group.label}>
          <div className="mb-1 flex items-center justify-between text-[13px]">
            <span className="font-semibold">{group.label}</span>
          </div>
          <div className="flex flex-col gap-1">
            {group.values.map((v) => (
              <div key={v.name} className="flex items-center gap-2">
                <span className="w-36 shrink-0 text-right text-[12px] text-[var(--slate)]">{v.name}</span>
                <span className="h-5 flex-1 rounded-sm bg-[var(--chalk)]">
                  <span className="block h-5 rounded-sm" style={{ width: `${(v.value / max) * 100}%`, background: v.color }} />
                </span>
                <span className="tnum w-16 text-right text-[12px]">
                  {v.value.toLocaleString()} {unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function LineChart({ points, xLabel, yLabel }: { points: { x: number; y: number }[]; xLabel: string; yLabel: string }) {
  const width = 520;
  const height = 200;
  const pad = 32;
  if (points.length === 0) return <p className="text-[13px] text-[var(--slate)]">No data.</p>;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMax = Math.max(...ys, 0.0001);
  const sx = (x: number) => pad + ((x - xMin) / Math.max(1e-9, xMax - xMin)) * (width - pad * 2);
  const sy = (y: number) => height - pad - (y / yMax) * (height - pad * 2);
  const path = points
    .slice()
    .sort((a, b) => a.x - b.x)
    .map((p, i) => `${i === 0 ? "M" : "L"} ${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`)
    .join(" ");
  return (
    <figure>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label={`${yLabel} versus ${xLabel}`}>
        <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="var(--rule)" strokeWidth={1.5} />
        <line x1={pad} y1={pad} x2={pad} y2={height - pad} stroke="var(--rule)" strokeWidth={1.5} />
        <path d={path} fill="none" stroke="var(--ultramarine)" strokeWidth={3} />
        {points.map((p, i) => (
          <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={3.5} fill="var(--ultramarine)" />
        ))}
        <text x={width / 2} y={height - 6} textAnchor="middle" fontSize={11} fill="var(--slate)">
          {xLabel}
        </text>
        <text x={12} y={height / 2} textAnchor="middle" fontSize={11} fill="var(--slate)" transform={`rotate(-90 12 ${height / 2})`}>
          {yLabel}
        </text>
      </svg>
    </figure>
  );
}

export function Waterfall({ stages }: { stages: { label: string; ms: number; color: string }[] }) {
  const total = stages.reduce((n, s) => n + s.ms, 0) || 1;
  return (
    <div>
      <div className="flex h-8 w-full overflow-hidden rounded-md border-[1.5px] border-[var(--rule)]">
        {stages.map((s) => (
          <div key={s.label} title={`${s.label}: ${s.ms} ms`} style={{ width: `${(s.ms / total) * 100}%`, background: s.color }} />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
        {stages.map((s) => (
          <li key={s.label} className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ background: s.color }} />
            {s.label} <span className="tnum text-[var(--slate)]">{Math.round(s.ms)} ms</span>
          </li>
        ))}
        <li className="font-semibold">
          total <span className="tnum">{Math.round(total)} ms</span>
        </li>
      </ul>
    </div>
  );
}
