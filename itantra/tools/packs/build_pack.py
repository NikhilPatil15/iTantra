#!/usr/bin/env python3
"""Build a language pack manifest from converted model files (plan T80, docs/PACKS.md).

Given a directory laid out as asr/ and tts/ (plus codebook and critical JSON), this computes
sha256 and byte sizes for every file and writes pack.json. It does not download or convert
models; conversion and licence checks are separate, deliberate steps.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

LICENSE_CLASSES = {"permissive", "share-alike", "non-commercial"}


def file_refs(directory: Path) -> list[dict]:
    refs = []
    for path in sorted(p for p in directory.rglob("*") if p.is_file()):
        data = path.read_bytes()
        refs.append({
            "name": path.relative_to(directory).as_posix(),
            "sha256": hashlib.sha256(data).hexdigest(),
            "bytes": len(data),
        })
    return refs


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dir", required=True)
    parser.add_argument("--id", required=True)
    parser.add_argument("--lang-index", type=int, required=True)
    parser.add_argument("--display-name", required=True)
    parser.add_argument("--script", required=True)
    parser.add_argument("--window-base", default="")
    parser.add_argument("--asr-engine", required=True)
    parser.add_argument("--asr-license", required=True)
    parser.add_argument("--asr-class", choices=sorted(LICENSE_CLASSES), required=True)
    parser.add_argument("--asr-source", required=True)
    parser.add_argument("--tts-engine", required=True)
    parser.add_argument("--tts-license", required=True)
    parser.add_argument("--tts-class", choices=sorted(LICENSE_CLASSES), required=True)
    parser.add_argument("--tts-source", required=True)
    parser.add_argument("--version", type=int, default=1)
    parser.add_argument("--status", choices=["verified", "experimental", "disabled"], default="experimental")
    args = parser.parse_args()

    root = Path(args.dir)
    asr_dir = root / "asr"
    tts_dir = root / "tts"
    if not asr_dir.is_dir() or not tts_dir.is_dir():
        raise SystemExit(f"{root} must contain asr/ and tts/ subdirectories")

    manifest = {
        "id": args.id,
        "langIndex": args.lang_index,
        "displayName": args.display_name,
        "script": args.script,
        "scriptWindowBase": args.window_base,
        "version": args.version,
        "status": args.status,
        "asr": {
            "engine": args.asr_engine,
            "files": file_refs(asr_dir),
            "sampleRate": 16000,
            "confidence": {"tau": None, "calibratedOn": None, "precision": None},
            "license": args.asr_license,
            "licenseClass": args.asr_class,
            "source": args.asr_source,
        },
        "tts": {
            "engine": args.tts_engine,
            "files": file_refs(tts_dir),
            "sampleRate": 22050,
            "digitsNeedExpansion": None,
            "license": args.tts_license,
            "licenseClass": args.tts_class,
            "source": args.tts_source,
        },
        "codebook": f"codebook.{args.id}.json",
        "critical": f"critical.{args.id}.json",
        "selfTest": {"text": "", "maxWer": None},
    }
    out = root / "pack.json"
    out.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
