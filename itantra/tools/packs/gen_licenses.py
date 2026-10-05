#!/usr/bin/env python3
"""Generate the licence table from pack manifests (plan Section 0 rule 9, task T05).

Scans files/packs/*/pack.json, extracts each component's licence, and writes:
  - docs/LICENSES.md   (human-readable, checked in)
  - tools/packs/licenses.json (machine-readable, consumed by the app)

Runs cleanly on an empty pack list.
"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PACKS_DIR = ROOT / "files" / "packs"
DOCS = ROOT / "docs" / "LICENSES.md"
JSON_OUT = Path(__file__).resolve().parent / "licenses.json"

HEADER = """# Model and asset licences

> **Generated file.** Do not hand-edit. Regenerate with `python3 tools/packs/gen_licenses.py`.
"""


def collect() -> list[dict]:
    rows: list[dict] = []
    if not PACKS_DIR.exists():
        return rows
    for manifest_path in sorted(PACKS_DIR.glob("*/pack.json")):
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        for component in ("asr", "tts"):
            part = manifest.get(component)
            if not part:
                continue
            rows.append({
                "language": manifest.get("id", manifest_path.parent.name),
                "component": component.upper(),
                "engine": part.get("engine", ""),
                "license": part.get("license", ""),
                "licenseClass": part.get("licenseClass", ""),
                "source": part.get("source", ""),
            })
    return rows


def main() -> int:
    rows = collect()
    JSON_OUT.write_text(json.dumps({"version": 1, "packs": rows}, indent=2) + "\n", encoding="utf-8")

    lines = [HEADER]
    if not rows:
        lines.append("No language packs are installed, so no third-party model or voice licences apply yet.\n")
    else:
        lines.append("| Language | Component | Engine | Licence | Class | Source |")
        lines.append("| --- | --- | --- | --- | --- | --- |")
        for row in rows:
            banner = " **non-commercial**" if row["licenseClass"] == "non-commercial" else ""
            lines.append(
                f"| {row['language']} | {row['component']} | {row['engine']} | {row['license']}{banner} | "
                f"{row['licenseClass']} | {row['source']} |"
            )
        lines.append("")
    DOCS.write_text("\n".join(lines), encoding="utf-8")
    print(f"wrote {DOCS} ({len(rows)} components) and {JSON_OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
