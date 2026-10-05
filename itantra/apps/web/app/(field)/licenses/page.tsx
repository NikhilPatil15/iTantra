"use client";

import { useEffect, useState } from "react";

import { Card, ScreenHeader } from "@/components/ui";

interface LicenseRow {
  language: string;
  component: string;
  engine: string;
  license: string;
  licenseClass: string;
  source: string;
}

export default function LicensesPage() {
  const [rows, setRows] = useState<LicenseRow[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/generated/licenses.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("missing"))))
      .then((data: { packs?: LicenseRow[] }) => setRows(data.packs ?? []))
      .catch(() => setError(true));
  }, []);

  return (
    <div>
      <ScreenHeader title="Licences" subtitle="Generated from pack manifests. Non-commercial assets are named in words." />
      {error ? (
        <Card className="p-4 text-[15px] text-[var(--slate)]">The licence table has not been generated yet.</Card>
      ) : rows && rows.length === 0 ? (
        <Card className="p-4 text-[15px] text-[var(--slate)]">No language packs are installed, so no third-party licences apply yet.</Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {(rows ?? []).map((row, i) => (
            <li key={i}>
              <Card className="p-3 text-[14px]">
                <p className="font-semibold">
                  {row.language} · {row.component} · {row.engine}
                </p>
                <p className="text-[var(--slate)]">
                  {row.license} ({row.licenseClass})
                </p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
