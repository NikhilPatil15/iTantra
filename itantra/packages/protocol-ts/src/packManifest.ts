/** Pack manifest shape and structural validation, plan Section 9.5. */

export type LicenseClass = "permissive" | "share-alike" | "non-commercial";
export type PackStatus = "verified" | "experimental" | "disabled";

export interface PackFileRef {
  name: string;
  sha256: string;
  bytes: number;
}

export interface PackComponent {
  engine: string;
  files: PackFileRef[];
  sampleRate: number;
  license: string;
  licenseClass: LicenseClass;
  source: string;
}

export interface PackManifest {
  id: string;
  langIndex: number;
  displayName: string;
  script: string;
  scriptWindowBase: string;
  version: number;
  status: PackStatus;
  asr: PackComponent & { confidence: { tau: number | null; calibratedOn: string | null; precision: number | null } };
  tts: PackComponent & { digitsNeedExpansion: boolean | null };
  codebook: string;
  critical: string;
  selfTest: { text: string; maxWer: number | null };
}

export function validatePackManifest(value: unknown): { ok: boolean; errors: string[]; totalBytes: number } {
  const errors: string[] = [];
  if (typeof value !== "object" || value === null) return { ok: false, errors: ["not an object"], totalBytes: 0 };
  const m = value as Partial<PackManifest>;
  if (typeof m.id !== "string" || m.id.length === 0) errors.push("id must be a non-empty string");
  if (typeof m.langIndex !== "number" || m.langIndex < 0 || m.langIndex > 255) errors.push("langIndex must be 0..255");
  if (m.status !== "verified" && m.status !== "experimental" && m.status !== "disabled") errors.push("status invalid");
  let totalBytes = 0;
  for (const key of ["asr", "tts"] as const) {
    const component = m[key];
    if (!component || !Array.isArray(component.files) || component.files.length === 0) {
      errors.push(`${key}.files must be a non-empty array`);
      continue;
    }
    for (const file of component.files) {
      if (!/^[0-9a-f]{64}$/.test(file.sha256 ?? "")) errors.push(`${key}.${file.name} has an invalid sha256`);
      if (typeof file.bytes !== "number" || file.bytes < 0) errors.push(`${key}.${file.name} has an invalid byte count`);
      totalBytes += file.bytes ?? 0;
    }
    if (component.licenseClass === "non-commercial") {
      // Valid, but the UI must show a banner; callers branch on this.
    }
  }
  return { ok: errors.length === 0, errors, totalBytes };
}
